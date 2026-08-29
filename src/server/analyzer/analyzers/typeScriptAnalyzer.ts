import { Project, ts, SyntaxKind, ClassDeclaration, InterfaceDeclaration, FunctionDeclaration, MethodDeclaration, Node, SourceFile } from 'ts-morph';
import { CodeAnalyzer, CodeSymbol, CodeRelationship, AnalysisResult, AnalysisError, RepositoryFile, ConfidenceLevel } from '../types';

export class TypeScriptAnalyzer implements CodeAnalyzer {
  public name = 'TypeScriptAnalyzer';

  public supports(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    if (normalized.endsWith('.d.ts')) return false;
    return (
      normalized.endsWith('.ts') ||
      normalized.endsWith('.tsx') ||
      normalized.endsWith('.js') ||
      normalized.endsWith('.jsx')
    );
  }

  public async analyze(repositoryId: string, files: RepositoryFile[]): Promise<AnalysisResult> {
    const supportedFiles = files.filter((f) => this.supports(f.filePath));
    const symbols: CodeSymbol[] = [];
    const relationships: CodeRelationship[] = [];
    const errors: AnalysisError[] = [];

    if (supportedFiles.length === 0) {
      return { symbols, relationships, errors };
    }

    // 1. Initialize in-memory ts-morph Project
    let project: Project;
    try {
      project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          allowJs: true,
          checkJs: false,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
    } catch (err: any) {
      errors.push({
        filePath: 'project-init',
        message: err?.message || 'Failed to initialize ts-morph project',
        stack: err?.stack,
      });
      return { symbols, relationships, errors };
    }

    // 2. Load files into project safely
    const fileSourceMap = new Map<string, string>(); // normalizedPath -> originalFilePath
    for (const file of supportedFiles) {
      const normalizedPath = this.normalizePath(file.filePath);
      fileSourceMap.set(normalizedPath, file.filePath);
      try {
        project.createSourceFile(normalizedPath, file.content, { overwrite: true });
      } catch (err: any) {
        errors.push({
          filePath: file.filePath,
          message: `Could not parse file into AST: ${err?.message || err}`,
        });
      }
    }

    // 3. Extract all Symbols
    const classDependencyMap = new Map<string, Map<string, { typeName: string; symbolId?: string }>>(); // classSymbolId -> propName -> targetType
    const symbolsByFile = new Map<string, CodeSymbol[]>();
    const fileExports = new Map<string, Map<string, CodeSymbol>>(); // normalizedFilePath -> exportName -> symbol
    const classesByName = new Map<string, { symbol: CodeSymbol; decl: ClassDeclaration; filePath: string }[]>();
    const interfacesByName = new Map<string, { symbol: CodeSymbol; decl: InterfaceDeclaration; filePath: string }[]>();
    const functionsByName = new Map<string, { symbol: CodeSymbol; decl: FunctionDeclaration; filePath: string }[]>();
    const symbolsById = new Map<string, CodeSymbol>();

    const addSymbol = (sym: CodeSymbol) => {
      symbols.push(sym);
      symbolsById.set(sym.id, sym);

      const norm = this.normalizePath(sym.filePath);
      if (!symbolsByFile.has(norm)) {
        symbolsByFile.set(norm, []);
      }
      symbolsByFile.get(norm)!.push(sym);

      if (sym.exported) {
        if (!fileExports.has(norm)) {
          fileExports.set(norm, new Map());
        }
        fileExports.get(norm)!.set(sym.name, sym);
      }
    };

    for (const sourceFile of project.getSourceFiles()) {
      const normalizedPath = this.normalizePath(sourceFile.getFilePath());
      const originalPath = fileSourceMap.get(normalizedPath) || normalizedPath;

      try {
        // A. Classes
        for (const classDecl of sourceFile.getClasses()) {
          const className = classDecl.getName();
          if (!className) continue;

          const startLine = classDecl.getStartLineNumber();
          const endLine = classDecl.getEndLineNumber();
          const exported = classDecl.isExported() || classDecl.isDefaultExport();

          const classSymbol: CodeSymbol = {
            id: `${repositoryId}:${originalPath}:${className}`,
            repositoryId,
            name: className,
            type: 'class',
            filePath: originalPath,
            startLine,
            endLine,
            exported,
          };
          addSymbol(classSymbol);

          if (!classesByName.has(className)) {
            classesByName.set(className, []);
          }
          classesByName.get(className)!.push({ symbol: classSymbol, decl: classDecl, filePath: originalPath });

          // Track class field & constructor dependencies
          const fieldMap = new Map<string, { typeName: string; symbolId?: string }>();
          classDependencyMap.set(classSymbol.id, fieldMap);

          // Class Constructors
          for (const ctor of classDecl.getConstructors()) {
            const ctorSymbol: CodeSymbol = {
              id: `${repositoryId}:${originalPath}:${className}.constructor`,
              repositoryId,
              name: 'constructor',
              type: 'constructor',
              filePath: originalPath,
              startLine: ctor.getStartLineNumber(),
              endLine: ctor.getEndLineNumber(),
              exported: false,
            };
            addSymbol(ctorSymbol);

            // Extract constructor injected parameters
            for (const param of ctor.getParameters()) {
              const paramName = param.getName();
              const typeNode = param.getTypeNode();
              let typeName = typeNode ? typeNode.getText().trim() : '';

              // Check @Inject decorator if present
              const injectDec = param.getDecorator('Inject');
              if (injectDec) {
                const args = injectDec.getArguments();
                if (args.length > 0) {
                  const argText = args[0].getText().replace(/['"]/g, '').trim();
                  if (argText) typeName = argText;
                }
              }

              if (typeName) {
                // Remove generic wrapper if any e.g. Repository<User> -> User or Repository
                const cleanType = this.cleanTypeName(typeName);
                fieldMap.set(paramName, { typeName: cleanType });
                fieldMap.set(`this.${paramName}`, { typeName: cleanType });
              }
            }
          }

          // Class Properties (Property injection / typed properties)
          for (const prop of classDecl.getProperties()) {
            const propName = prop.getName();
            const typeNode = prop.getTypeNode();
            let typeName = typeNode ? typeNode.getText().trim() : '';

            const injectDec = prop.getDecorator('Inject') || prop.getDecorator('Autowired');
            if (injectDec) {
              const args = injectDec.getArguments();
              if (args.length > 0) {
                const argText = args[0].getText().replace(/['"]/g, '').trim();
                if (argText) typeName = argText;
              }
            }

            if (typeName) {
              const cleanType = this.cleanTypeName(typeName);
              fieldMap.set(propName, { typeName: cleanType });
              fieldMap.set(`this.${propName}`, { typeName: cleanType });
            }
          }

          // Class Methods
          for (const method of classDecl.getMethods()) {
            const methodName = method.getName();
            const methodSymbol: CodeSymbol = {
              id: `${repositoryId}:${originalPath}:${className}.${methodName}`,
              repositoryId,
              name: methodName,
              type: 'method',
              filePath: originalPath,
              startLine: method.getStartLineNumber(),
              endLine: method.getEndLineNumber(),
              exported: false,
            };
            addSymbol(methodSymbol);
          }
        }

        // B. Interfaces
        for (const iface of sourceFile.getInterfaces()) {
          const ifaceName = iface.getName();
          if (!ifaceName) continue;

          const ifaceSymbol: CodeSymbol = {
            id: `${repositoryId}:${originalPath}:${ifaceName}`,
            repositoryId,
            name: ifaceName,
            type: 'interface',
            filePath: originalPath,
            startLine: iface.getStartLineNumber(),
            endLine: iface.getEndLineNumber(),
            exported: iface.isExported() || iface.isDefaultExport(),
          };
          addSymbol(ifaceSymbol);

          if (!interfacesByName.has(ifaceName)) {
            interfacesByName.set(ifaceName, []);
          }
          interfacesByName.get(ifaceName)!.push({ symbol: ifaceSymbol, decl: iface, filePath: originalPath });
        }

        // C. Functions
        for (const func of sourceFile.getFunctions()) {
          const funcName = func.getName();
          if (!funcName) continue;

          const funcSymbol: CodeSymbol = {
            id: `${repositoryId}:${originalPath}:${funcName}`,
            repositoryId,
            name: funcName,
            type: 'function',
            filePath: originalPath,
            startLine: func.getStartLineNumber(),
            endLine: func.getEndLineNumber(),
            exported: func.isExported() || func.isDefaultExport(),
          };
          addSymbol(funcSymbol);

          if (!functionsByName.has(funcName)) {
            functionsByName.set(funcName, []);
          }
          functionsByName.get(funcName)!.push({ symbol: funcSymbol, decl: func, filePath: originalPath });
        }

        // D. Enums
        for (const enumDecl of sourceFile.getEnums()) {
          const enumName = enumDecl.getName();
          if (!enumName) continue;

          const enumSymbol: CodeSymbol = {
            id: `${repositoryId}:${originalPath}:${enumName}`,
            repositoryId,
            name: enumName,
            type: 'enum',
            filePath: originalPath,
            startLine: enumDecl.getStartLineNumber(),
            endLine: enumDecl.getEndLineNumber(),
            exported: enumDecl.isExported() || enumDecl.isDefaultExport(),
          };
          addSymbol(enumSymbol);
        }

        // E. Top-level Variable Declarations (Exported arrow functions / important variables)
        for (const varStatement of sourceFile.getVariableStatements()) {
          const isExported = varStatement.isExported();
          for (const varDecl of varStatement.getDeclarations()) {
            const varName = varDecl.getName();
            const init = varDecl.getInitializer();
            const isFunction = init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init));

            if (isFunction) {
              const funcSymbol: CodeSymbol = {
                id: `${repositoryId}:${originalPath}:${varName}`,
                repositoryId,
                name: varName,
                type: 'function',
                filePath: originalPath,
                startLine: varDecl.getStartLineNumber(),
                endLine: varDecl.getEndLineNumber(),
                exported: isExported,
              };
              addSymbol(funcSymbol);
            } else if (isExported) {
              const varSymbol: CodeSymbol = {
                id: `${repositoryId}:${originalPath}:${varName}`,
                repositoryId,
                name: varName,
                type: 'variable',
                filePath: originalPath,
                startLine: varDecl.getStartLineNumber(),
                endLine: varDecl.getEndLineNumber(),
                exported: true,
              };
              addSymbol(varSymbol);
            }
          }
        }
      } catch (err: any) {
        errors.push({
          filePath: originalPath,
          message: `Error extracting symbols from file: ${err?.message || err}`,
        });
      }
    }

    // 4. Extract Relationships
    const seenRelationshipIds = new Set<string>();

    const addRelationship = (
      sourceSymbolId: string,
      targetSymbolId: string,
      relationshipType: CodeRelationship['relationshipType'],
      confidence: ConfidenceLevel
    ) => {
      // Validate IDs and repository isolation
      if (!sourceSymbolId || !targetSymbolId || sourceSymbolId === targetSymbolId) return;
      if (!sourceSymbolId.startsWith(`${repositoryId}:`) || !targetSymbolId.startsWith(`${repositoryId}:`)) return;

      const relId = `${repositoryId}:${sourceSymbolId}:${relationshipType}:${targetSymbolId}`;
      if (seenRelationshipIds.has(relId)) return;
      seenRelationshipIds.add(relId);

      relationships.push({
        id: relId,
        repositoryId,
        sourceSymbolId,
        targetSymbolId,
        relationshipType,
        confidence,
      });
    };

    // Helper: resolve symbol by name in file context (local symbols first, then imported symbols)
    const resolveSymbolInContext = (
      sourceNormPath: string,
      name: string,
      preferredType?: CodeSymbol['type']
    ): CodeSymbol | undefined => {
      // Check local file symbols
      const localSymbols = symbolsByFile.get(sourceNormPath) || [];
      const localMatch = localSymbols.find(
        (s) => s.name === name && (!preferredType || s.type === preferredType)
      );
      if (localMatch) return localMatch;

      // Check imports in source file
      const srcFile = project.getSourceFile(sourceNormPath);
      if (srcFile) {
        for (const imp of srcFile.getImportDeclarations()) {
          const specifier = imp.getModuleSpecifierValue();
          const targetNormPath = this.resolveModulePath(sourceNormPath, specifier, fileSourceMap);
          if (targetNormPath) {
            // Check named imports
            for (const named of imp.getNamedImports()) {
              if (named.getName() === name || named.getAliasNode()?.getText() === name) {
                const targetExports = fileExports.get(targetNormPath);
                if (targetExports && targetExports.has(named.getName())) {
                  return targetExports.get(named.getName());
                }
                const targetSymbols = symbolsByFile.get(targetNormPath) || [];
                const matchedTarget = targetSymbols.find((s) => s.name === named.getName());
                if (matchedTarget) return matchedTarget;
              }
            }

            // Check default import
            const defaultImport = imp.getDefaultImport();
            if (defaultImport && defaultImport.getText() === name) {
              const targetExports = fileExports.get(targetNormPath);
              if (targetExports && targetExports.has(name)) {
                return targetExports.get(name);
              }
              const targetSymbols = symbolsByFile.get(targetNormPath) || [];
              const defaultOrFirst = targetSymbols.find((s) => s.exported) || targetSymbols[0];
              if (defaultOrFirst) return defaultOrFirst;
            }
          }
        }
      }

      // Fallback to globally known symbols by name
      if (preferredType === 'class' && classesByName.has(name)) {
        return classesByName.get(name)![0].symbol;
      }
      if (preferredType === 'interface' && interfacesByName.has(name)) {
        return interfacesByName.get(name)![0].symbol;
      }
      if (preferredType === 'function' && functionsByName.has(name)) {
        return functionsByName.get(name)![0].symbol;
      }

      return undefined;
    };

    for (const sourceFile of project.getSourceFiles()) {
      const normalizedPath = this.normalizePath(sourceFile.getFilePath());
      const originalPath = fileSourceMap.get(normalizedPath) || normalizedPath;

      try {
        // A. Process Imports (Symbol-to-Symbol when clear)
        for (const imp of sourceFile.getImportDeclarations()) {
          const specifier = imp.getModuleSpecifierValue();
          const targetNormPath = this.resolveModulePath(normalizedPath, specifier, fileSourceMap);
          if (!targetNormPath) continue;

          for (const named of imp.getNamedImports()) {
            const importedName = named.getName();
            const targetSymbol = resolveSymbolInContext(sourceNormPath(normalizedPath), importedName);
            if (targetSymbol) {
              // Find source symbols in this file that use this imported name
              const fileSyms = symbolsByFile.get(normalizedPath) || [];
              for (const sym of fileSyms) {
                if (sym.type === 'class' || sym.type === 'function') {
                  addRelationship(sym.id, targetSymbol.id, 'IMPORTS', 'high');
                }
              }
            }
          }
        }

        // B. Process Classes: EXTENDS, IMPLEMENTS, INJECTS, USES, CALLS
        for (const classDecl of sourceFile.getClasses()) {
          const className = classDecl.getName();
          if (!className) continue;
          const classSymbolId = `${repositoryId}:${originalPath}:${className}`;
          const fieldMap = classDependencyMap.get(classSymbolId) || new Map();

          // 1. EXTENDS
          const extendsClause = classDecl.getExtends();
          if (extendsClause) {
            const baseName = extendsClause.getExpression().getText().trim();
            const baseSymbol = resolveSymbolInContext(normalizedPath, baseName, 'class');
            if (baseSymbol) {
              addRelationship(classSymbolId, baseSymbol.id, 'EXTENDS', 'high');
            }
          }

          // 2. IMPLEMENTS
          for (const impl of classDecl.getImplements()) {
            const ifaceName = impl.getExpression().getText().trim();
            const ifaceSymbol = resolveSymbolInContext(normalizedPath, ifaceName, 'interface');
            if (ifaceSymbol) {
              addRelationship(classSymbolId, ifaceSymbol.id, 'IMPLEMENTS', 'high');
            }
          }

          // 3. INJECTS & USES (Constructor & Property Injections)
          for (const [propKey, dep] of fieldMap.entries()) {
            if (propKey.startsWith('this.')) continue;
            const depSymbol = resolveSymbolInContext(normalizedPath, dep.typeName, 'class') ||
                              resolveSymbolInContext(normalizedPath, dep.typeName, 'interface');
            if (depSymbol) {
              dep.symbolId = depSymbol.id;
              // Also update 'this.prop'
              const thisKey = `this.${propKey}`;
              if (fieldMap.has(thisKey)) {
                fieldMap.get(thisKey)!.symbolId = depSymbol.id;
              }
              addRelationship(classSymbolId, depSymbol.id, 'INJECTS', 'high');
            }
          }

          // 4. CALLS (Methods & Constructor calls)
          const analyzeCallsInBody = (callerSymbolId: string, node: Node) => {
            const callExpressions = node.getDescendantsOfKind(SyntaxKind.CallExpression);
            for (const call of callExpressions) {
              const expr = call.getExpression();

              // Pattern 1: this.service.method() or this.method()
              if (Node.isPropertyAccessExpression(expr)) {
                const propAccessExpr = expr.getExpression();
                const calledMethodName = expr.getName();

                // Case 1a: this.service.method()
                if (Node.isPropertyAccessExpression(propAccessExpr) && propAccessExpr.getExpression().getKind() === SyntaxKind.ThisKeyword) {
                  const servicePropName = propAccessExpr.getName();
                  const depInfo = fieldMap.get(servicePropName) || fieldMap.get(`this.${servicePropName}`);
                  if (depInfo) {
                    const targetClassSymbol = depInfo.symbolId
                      ? symbolsById.get(depInfo.symbolId)
                      : resolveSymbolInContext(normalizedPath, depInfo.typeName, 'class');

                    if (targetClassSymbol) {
                      const targetMethodId = `${repositoryId}:${targetClassSymbol.filePath}:${targetClassSymbol.name}.${calledMethodName}`;
                      if (symbolsById.has(targetMethodId)) {
                        addRelationship(callerSymbolId, targetMethodId, 'CALLS', 'high');
                      } else {
                        // Class level fallback if method not individually registered
                        addRelationship(callerSymbolId, targetClassSymbol.id, 'USES', 'high');
                      }
                    }
                  }
                }
                // Case 1b: this.localMethod() or inherited this.method()
                else if (propAccessExpr.getKind() === SyntaxKind.ThisKeyword) {
                  const localMethodId = `${repositoryId}:${originalPath}:${className}.${calledMethodName}`;
                  if (symbolsById.has(localMethodId)) {
                    addRelationship(callerSymbolId, localMethodId, 'CALLS', 'high');
                  } else {
                    // Check if inherited from base class
                    const extendsClause = classDecl.getExtends();
                    if (extendsClause) {
                      const baseName = extendsClause.getExpression().getText().trim();
                      const baseSymbol = resolveSymbolInContext(normalizedPath, baseName, 'class');
                      if (baseSymbol) {
                        const inheritedMethodId = `${repositoryId}:${baseSymbol.filePath}:${baseSymbol.name}.${calledMethodName}`;
                        if (symbolsById.has(inheritedMethodId)) {
                          addRelationship(callerSymbolId, inheritedMethodId, 'CALLS', 'high');
                        }
                      }
                    }
                  }
                }
              }
              // Pattern 2: Direct local function call fn()
              else if (Node.isIdentifier(expr)) {
                const funcName = expr.getText();
                const targetFunc = resolveSymbolInContext(normalizedPath, funcName, 'function');
                if (targetFunc) {
                  addRelationship(callerSymbolId, targetFunc.id, 'CALLS', 'high');
                }
              }
            }
          };

          // Analyze constructor body for CALLS
          for (const ctor of classDecl.getConstructors()) {
            const ctorSymbolId = `${repositoryId}:${originalPath}:${className}.constructor`;
            analyzeCallsInBody(ctorSymbolId, ctor);
          }

          // Analyze each method body for CALLS
          for (const method of classDecl.getMethods()) {
            const methodName = method.getName();
            const methodSymbolId = `${repositoryId}:${originalPath}:${className}.${methodName}`;
            analyzeCallsInBody(methodSymbolId, method);
          }
        }

        // C. Process standalone Functions: CALLS
        for (const func of sourceFile.getFunctions()) {
          const funcName = func.getName();
          if (!funcName) continue;
          const funcSymbolId = `${repositoryId}:${originalPath}:${funcName}`;

          const callExpressions = func.getDescendantsOfKind(SyntaxKind.CallExpression);
          for (const call of callExpressions) {
            const expr = call.getExpression();
            if (Node.isIdentifier(expr)) {
              const targetName = expr.getText();
              const targetFunc = resolveSymbolInContext(normalizedPath, targetName, 'function');
              if (targetFunc) {
                addRelationship(funcSymbolId, targetFunc.id, 'CALLS', 'high');
              }
            }
          }
        }

        // D. Process Interfaces: EXTENDS
        for (const iface of sourceFile.getInterfaces()) {
          const ifaceName = iface.getName();
          if (!ifaceName) continue;
          const ifaceSymbolId = `${repositoryId}:${originalPath}:${ifaceName}`;

          for (const ext of iface.getExtends()) {
            const baseName = ext.getExpression().getText().trim();
            const baseIface = resolveSymbolInContext(normalizedPath, baseName, 'interface');
            if (baseIface) {
              addRelationship(ifaceSymbolId, baseIface.id, 'EXTENDS', 'high');
            }
          }
        }
      } catch (err: any) {
        errors.push({
          filePath: originalPath,
          message: `Error extracting relationships from file: ${err?.message || err}`,
        });
      }
    }

    return { symbols, relationships, errors };
  }

  private cleanTypeName(raw: string): string {
    let clean = raw.trim();
    // Remove Promise<T>, Observable<T>, Array<T>, Partial<T>, etc.
    const genericMatch = clean.match(/^([A-Za-z0-9_$]+)<([^>]+)>$/);
    if (genericMatch) {
      clean = genericMatch[2].trim();
    }
    // Remove array brackets
    clean = clean.replace(/\[\]$/, '').trim();
    return clean;
  }

  private normalizePath(p: string): string {
    let normalized = p.replace(/\\/g, '/');
    if (normalized.startsWith('./')) normalized = normalized.substring(2);
    if (normalized.startsWith('/')) normalized = normalized.substring(1);
    return normalized;
  }

  private resolveModulePath(
    sourcePath: string,
    specifier: string,
    fileSourceMap: Map<string, string>
  ): string | null {
    if (!specifier.startsWith('.')) {
      // Non-relative import (e.g. 'express', '@nestjs/common')
      return null;
    }

    // Resolve relative path
    const sourceParts = sourcePath.split('/');
    sourceParts.pop(); // Remove file name

    const relativeParts = specifier.split('/');
    for (const part of relativeParts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        sourceParts.pop();
      } else {
        sourceParts.push(part);
      }
    }

    const basePath = sourceParts.join('/');
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.jsx`,
      `${basePath}/index.ts`,
      `${basePath}/index.tsx`,
      `${basePath}/index.js`,
      `${basePath}/index.jsx`,
    ];

    for (const cand of candidates) {
      const norm = this.normalizePath(cand);
      if (fileSourceMap.has(norm)) {
        return norm;
      }
    }

    return null;
  }
}

function sourceNormPath(p: string): string {
  return p;
}
