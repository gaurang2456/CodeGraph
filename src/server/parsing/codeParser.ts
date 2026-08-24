import { ParsedChunk } from './types';

/**
 * Universal Code Parser abstraction providing language-aware semantic chunking.
 */
export class CodeParser {
  /**
   * Parse a source file into logical semantic chunks.
   */
  static parseFile(filePath: string, content: string, language: string): ParsedChunk[] {
    if (!content || !content.trim()) {
      return [];
    }

    const lines = content.split(/\r\n|\r|\n/);
    if (lines.length <= 40) {
      // Small file, treat as a single cohesive chunk
      return [
        {
          content: content.trim(),
          startLine: 1,
          endLine: lines.length,
          language,
          filePath,
          symbolName: filePath.split('/').pop() || filePath,
          symbolType: 'document',
        },
      ];
    }

    switch (language.toLowerCase()) {
      case 'java':
        return parseJava(filePath, lines, content);
      case 'typescript':
      case 'javascript':
        return parseTypeScript(filePath, lines, content, language);
      case 'python':
        return parsePython(filePath, lines, content);
      default:
        return parseGeneric(filePath, lines, language);
    }
  }
}

/**
 * Parses Java files recognizing classes, interfaces, Spring annotations, and methods.
 */
function parseJava(filePath: string, lines: string[], fullContent: string): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const totalLines = lines.length;

  let currentChunkLines: string[] = [];
  let currentStartLine = 1;
  let currentSymbolName: string | undefined;
  let currentSymbolType: ParsedChunk['symbolType'] = 'block';

  // Extract file header imports/package to prepend to major chunks
  const headerLines = lines.filter((l) => l.startsWith('package ') || l.startsWith('import ')).slice(0, 10);
  const headerContext = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';

  let i = 0;
  while (i < totalLines) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for class/interface/record/enum declarations
    const classMatch = trimmed.match(/(?:public|protected|private)?\s*(?:static|abstract|final)?\s*(class|interface|enum|record)\s+([A-Za-z0-9_]+)/);
    
    // Check for Spring Controller / Service / Repository annotations
    const isController = trimmed.includes('@RestController') || trimmed.includes('@Controller');
    const isService = trimmed.includes('@Service');
    const isRepo = trimmed.includes('@Repository');
    const isConfig = trimmed.includes('@Configuration');

    if (classMatch) {
      const type = classMatch[1];
      const name = classMatch[2];

      let detectedType: ParsedChunk['symbolType'] = type === 'interface' ? 'interface' : 'class';
      if (isController) detectedType = 'controller';
      else if (isService) detectedType = 'service';
      else if (isRepo) detectedType = 'repository';
      else if (isConfig) detectedType = 'config';

      currentSymbolName = name;
      currentSymbolType = detectedType;
    }

    // Check for method signatures
    const methodMatch = trimmed.match(/(?:public|protected|private)\s+(?:static\s+)?[A-Za-z0-9_<>[\],\s]+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\s*\{/);

    if (methodMatch && currentChunkLines.length >= 25) {
      // Flush previous chunk
      if (currentChunkLines.length > 0) {
        const chunkContent = currentChunkLines.join('\n').trim();
        if (chunkContent.length > 0) {
          chunks.push({
            content: chunkContent,
            startLine: currentStartLine,
            endLine: i,
            language: 'Java',
            filePath,
            symbolName: currentSymbolName,
            symbolType: currentSymbolType,
          });
        }
        currentChunkLines = [];
        currentStartLine = i + 1;
      }
      currentSymbolName = `${currentSymbolName ? currentSymbolName + '.' : ''}${methodMatch[1]}`;
      currentSymbolType = 'method';
    }

    currentChunkLines.push(line);

    // If chunk exceeds reasonable size, flush it
    if (currentChunkLines.length >= 60) {
      const chunkContent = currentChunkLines.join('\n').trim();
      chunks.push({
        content: chunkContent,
        startLine: currentStartLine,
        endLine: i + 1,
        language: 'Java',
        filePath,
        symbolName: currentSymbolName,
        symbolType: currentSymbolType,
      });
      // 10 line overlap for continuity
      const overlapLines = currentChunkLines.slice(-10);
      currentChunkLines = [...overlapLines];
      currentStartLine = Math.max(1, i + 1 - overlapLines.length + 1);
    }

    i++;
  }

  // Flush remaining lines
  if (currentChunkLines.length > 0) {
    const chunkContent = currentChunkLines.join('\n').trim();
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        startLine: currentStartLine,
        endLine: totalLines,
        language: 'Java',
        filePath,
        symbolName: currentSymbolName,
        symbolType: currentSymbolType,
      });
    }
  }

  return chunks.length > 0 ? chunks : parseGeneric(filePath, lines, 'Java');
}

/**
 * Parses TypeScript & JavaScript files identifying classes, functions, and interfaces.
 */
function parseTypeScript(filePath: string, lines: string[], fullContent: string, language: string): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const totalLines = lines.length;

  let currentChunkLines: string[] = [];
  let currentStartLine = 1;
  let currentSymbolName: string | undefined;
  let currentSymbolType: ParsedChunk['symbolType'] = 'block';

  let i = 0;
  while (i < totalLines) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for exports, functions, classes, interfaces
    const funcMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/)
      || trimmed.match(/(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/);
    const classMatch = trimmed.match(/(?:export\s+)?class\s+([A-Za-z0-9_]+)/);
    const interfaceMatch = trimmed.match(/(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]+)/);

    if (classMatch) {
      currentSymbolName = classMatch[1];
      currentSymbolType = 'class';
    } else if (interfaceMatch) {
      currentSymbolName = interfaceMatch[1];
      currentSymbolType = 'interface';
    } else if (funcMatch && currentChunkLines.length >= 25) {
      if (currentChunkLines.length > 0) {
        chunks.push({
          content: currentChunkLines.join('\n').trim(),
          startLine: currentStartLine,
          endLine: i,
          language,
          filePath,
          symbolName: currentSymbolName,
          symbolType: currentSymbolType,
        });
        currentChunkLines = [];
        currentStartLine = i + 1;
      }
      currentSymbolName = funcMatch[1];
      currentSymbolType = 'function';
    }

    currentChunkLines.push(line);

    if (currentChunkLines.length >= 60) {
      chunks.push({
        content: currentChunkLines.join('\n').trim(),
        startLine: currentStartLine,
        endLine: i + 1,
        language,
        filePath,
        symbolName: currentSymbolName,
        symbolType: currentSymbolType,
      });
      const overlapLines = currentChunkLines.slice(-10);
      currentChunkLines = [...overlapLines];
      currentStartLine = Math.max(1, i + 1 - overlapLines.length + 1);
    }

    i++;
  }

  if (currentChunkLines.length > 0) {
    chunks.push({
      content: currentChunkLines.join('\n').trim(),
      startLine: currentStartLine,
      endLine: totalLines,
      language,
      filePath,
      symbolName: currentSymbolName,
      symbolType: currentSymbolType,
    });
  }

  return chunks.length > 0 ? chunks : parseGeneric(filePath, lines, language);
}

/**
 * Parses Python files identifying classes, def functions, and web routes.
 */
function parsePython(filePath: string, lines: string[], fullContent: string): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const totalLines = lines.length;

  let currentChunkLines: string[] = [];
  let currentStartLine = 1;
  let currentSymbolName: string | undefined;
  let currentSymbolType: ParsedChunk['symbolType'] = 'block';

  let i = 0;
  while (i < totalLines) {
    const line = lines[i];
    const trimmed = line.trim();

    const classMatch = trimmed.match(/^class\s+([A-Za-z0-9_]+)/);
    const funcMatch = trimmed.match(/^def\s+([A-Za-z0-9_]+)/);

    if (classMatch) {
      currentSymbolName = classMatch[1];
      currentSymbolType = 'class';
    } else if (funcMatch && currentChunkLines.length >= 25) {
      if (currentChunkLines.length > 0) {
        chunks.push({
          content: currentChunkLines.join('\n').trim(),
          startLine: currentStartLine,
          endLine: i,
          language: 'Python',
          filePath,
          symbolName: currentSymbolName,
          symbolType: currentSymbolType,
        });
        currentChunkLines = [];
        currentStartLine = i + 1;
      }
      currentSymbolName = funcMatch[1];
      currentSymbolType = 'function';
    }

    currentChunkLines.push(line);

    if (currentChunkLines.length >= 60) {
      chunks.push({
        content: currentChunkLines.join('\n').trim(),
        startLine: currentStartLine,
        endLine: i + 1,
        language: 'Python',
        filePath,
        symbolName: currentSymbolName,
        symbolType: currentSymbolType,
      });
      const overlapLines = currentChunkLines.slice(-10);
      currentChunkLines = [...overlapLines];
      currentStartLine = Math.max(1, i + 1 - overlapLines.length + 1);
    }

    i++;
  }

  if (currentChunkLines.length > 0) {
    chunks.push({
      content: currentChunkLines.join('\n').trim(),
      startLine: currentStartLine,
      endLine: totalLines,
      language: 'Python',
      filePath,
      symbolName: currentSymbolName,
      symbolType: currentSymbolType,
    });
  }

  return chunks.length > 0 ? chunks : parseGeneric(filePath, lines, 'Python');
}

/**
 * Generic sliding window chunker with verified start/end line bounds for XML, YAML, JSON, SQL, etc.
 */
function parseGeneric(filePath: string, lines: string[], language: string): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const totalLines = lines.length;
  const chunkSize = 50;
  const overlap = 10;

  let start = 0;
  while (start < totalLines) {
    const end = Math.min(start + chunkSize, totalLines);
    const chunkLines = lines.slice(start, end);
    const content = chunkLines.join('\n').trim();

    if (content.length > 0) {
      chunks.push({
        content,
        startLine: start + 1,
        endLine: end,
        language,
        filePath,
        symbolName: pathBasename(filePath),
        symbolType: 'block',
      });
    }

    if (end === totalLines) break;
    start += (chunkSize - overlap);
  }

  return chunks;
}

function pathBasename(p: string): string {
  const normalized = p.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}
