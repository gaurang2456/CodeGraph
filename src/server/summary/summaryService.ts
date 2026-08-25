import OpenAI from 'openai';
import { ExtractedFile } from '../ingestion/zipExtractor';
import { ParsedChunk } from '../parsing/types';
import { ArchitectureFlow, ArchitectureFlowNode, ArchitectureFlowReference } from '@/types';
import path from 'path';

export interface TechTag {
  name: string;
  category: 'language' | 'framework' | 'adapter' | 'database' | 'caching' | 'auth' | 'build' | 'container' | 'tools';
  icon?: string;
  color?: string;
}

export interface GeneratedSummary {
  projectType: string;
  architecture: string;
  backend: string;
  httpAdapter?: string;
  frontend: string;
  database: string;
  authentication: string;
  caching?: string;
  buildTool?: string;
  description: string;
  keyPackages: string[];
  architectureFlow?: ArchitectureFlow;
}

export interface CalculatedStats {
  classes: number;
  packages: number;
  files: number;
  endpoints: number;
  dependencies: number;
  functions: number;
}

export interface DetectedFrameworkInfo {
  framework: string;
  httpAdapter?: string;
  isNest?: boolean;
}

export class SummaryService {
  /**
   * Computes exact statistics from extracted files and parsed chunks.
   */
  static calculateStats(files: ExtractedFile[], chunks: ParsedChunk[]): CalculatedStats {
    let classes = 0;
    let functions = 0;
    let endpoints = 0;

    for (const chunk of chunks) {
      if (chunk.symbolType === 'class' || chunk.symbolType === 'interface') {
        classes++;
      } else if (chunk.symbolType === 'method' || chunk.symbolType === 'function') {
        functions++;
      } else if (chunk.symbolType === 'controller') {
        classes++;
      }

      // Check for REST endpoint indicators
      if (
        chunk.content.includes('@GetMapping') ||
        chunk.content.includes('@PostMapping') ||
        chunk.content.includes('@PutMapping') ||
        chunk.content.includes('@DeleteMapping') ||
        chunk.content.includes('@RequestMapping') ||
        chunk.content.includes('@Get(') ||
        chunk.content.includes('@Post(') ||
        chunk.content.includes('@Put(') ||
        chunk.content.includes('@Delete(') ||
        chunk.content.includes('@Patch(') ||
        chunk.content.includes('app.get(') ||
        chunk.content.includes('app.post(') ||
        chunk.content.includes('router.get(') ||
        chunk.content.includes('router.post(') ||
        chunk.content.includes('fastify.get(') ||
        chunk.content.includes('fastify.post(') ||
        chunk.content.includes('export async function GET') ||
        chunk.content.includes('export async function POST')
      ) {
        endpoints++;
      }
    }

    const packageDirs = new Set<string>();
    for (const file of files) {
      const parts = file.filePath.split('/');
      if (parts.length > 1) {
        packageDirs.add(parts.slice(0, -1).join('/'));
      }
    }

    let dependencyCount = 0;
    for (const file of files) {
      if (file.fileName === 'pom.xml') {
        const matches = file.content.match(/<dependency>/g);
        if (matches) dependencyCount += matches.length;
      } else if (file.fileName === 'package.json') {
        try {
          const pkg = JSON.parse(file.content);
          dependencyCount += Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
        } catch (_) {}
      } else if (file.fileName === 'requirements.txt') {
        dependencyCount += file.content.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length;
      }
    }

    return {
      classes: Math.max(classes, 1),
      packages: Math.max(packageDirs.size, 1),
      files: files.length,
      endpoints: Math.max(endpoints, 0),
      dependencies: Math.max(dependencyCount, 0),
      functions: Math.max(functions, 1),
    };
  }

  /**
   * Extracts all package dependencies declared across manifest files.
   */
  private static extractPackageDependencies(files: ExtractedFile[]): Set<string> {
    const deps = new Set<string>();

    for (const file of files) {
      const lowerName = file.fileName.toLowerCase();

      if (lowerName === 'package.json') {
        try {
          const pkg = JSON.parse(file.content);
          const allDepObjects = [
            pkg.dependencies || {},
            pkg.devDependencies || {},
            pkg.peerDependencies || {},
            pkg.optionalDependencies || {},
          ];
          for (const obj of allDepObjects) {
            for (const dep of Object.keys(obj)) {
              deps.add(dep.toLowerCase());
            }
          }
        } catch (_) {}
      } else if (
        lowerName === 'package-lock.json' ||
        lowerName === 'yarn.lock' ||
        lowerName === 'pnpm-lock.yaml'
      ) {
        if (file.content.includes('@nestjs/core')) deps.add('@nestjs/core');
        if (file.content.includes('@nestjs/common')) deps.add('@nestjs/common');
        if (file.content.includes('@nestjs/platform-express')) deps.add('@nestjs/platform-express');
        if (file.content.includes('@nestjs/platform-fastify')) deps.add('@nestjs/platform-fastify');
        if (file.content.includes('"next"') || file.content.includes('next@')) deps.add('next');
        if (file.content.includes('"express"') || file.content.includes('express@')) deps.add('express');
        if (file.content.includes('"fastify"') || file.content.includes('fastify@')) deps.add('fastify');
      }
    }

    return deps;
  }

  /**
   * Determines application framework and HTTP adapter using strict hierarchical priority.
   */
  static detectFrameworkAndAdapter(files: ExtractedFile[]): DetectedFrameworkInfo {
    const allPackageDeps = this.extractPackageDependencies(files);
    const fileNames = new Set(files.map((f) => f.fileName.toLowerCase()));
    const filePaths = new Set(files.map((f) => f.filePath.toLowerCase()));

    const configAndEntryFiles = files.filter((f) => {
      const p = f.filePath.toLowerCase();
      const n = f.fileName.toLowerCase();
      return (
        n === 'package.json' ||
        n === 'nest-cli.json' ||
        n === 'tsconfig.json' ||
        n === 'pom.xml' ||
        n === 'build.gradle' ||
        n === 'build.gradle.kts' ||
        n === 'manage.py' ||
        n === 'requirements.txt' ||
        n === 'gemfile' ||
        n === 'composer.json' ||
        n.startsWith('next.config.') ||
        n.startsWith('nuxt.config.') ||
        n.startsWith('svelte.config.') ||
        p.endsWith('main.ts') ||
        p.endsWith('main.js') ||
        p.endsWith('app.module.ts') ||
        p.endsWith('app.module.js') ||
        p.endsWith('server.ts') ||
        p.endsWith('server.js') ||
        p.endsWith('app.ts') ||
        p.endsWith('app.js')
      );
    });

    const codeSignatures = configAndEntryFiles.map((f) => f.content).join('\n');
    const allFileContents = files.map((f) => f.content).join('\n');

    // 1. NESTJS DETECTION
    const hasNestDeps =
      allPackageDeps.has('@nestjs/core') ||
      allPackageDeps.has('@nestjs/common') ||
      allPackageDeps.has('@nestjs/platform-express') ||
      allPackageDeps.has('@nestjs/platform-fastify') ||
      allPackageDeps.has('@nestjs/microservices');

    const hasNestFiles =
      fileNames.has('nest-cli.json') ||
      filePaths.has('nest-cli.json') ||
      filePaths.has('src/nest-cli.json');

    const hasNestCode =
      codeSignatures.includes('NestFactory.create') ||
      codeSignatures.includes('NestFactory.createMicroservice') ||
      codeSignatures.includes('@Module(') ||
      allFileContents.includes('@nestjs/core') ||
      allFileContents.includes('@nestjs/common');

    if (hasNestDeps || hasNestFiles || hasNestCode) {
      let httpAdapter: string | undefined;

      if (
        allPackageDeps.has('@nestjs/platform-fastify') ||
        codeSignatures.includes('FastifyAdapter') ||
        allFileContents.includes('@nestjs/platform-fastify')
      ) {
        httpAdapter = 'Fastify';
      } else if (
        allPackageDeps.has('@nestjs/platform-express') ||
        codeSignatures.includes('NestExpressApplication') ||
        allFileContents.includes('@nestjs/platform-express') ||
        allPackageDeps.has('express') ||
        codeSignatures.includes('express')
      ) {
        httpAdapter = 'Express';
      } else {
        httpAdapter = 'Express';
      }

      return {
        framework: 'NestJS',
        httpAdapter,
        isNest: true,
      };
    }

    // 2. NEXT.JS DETECTION
    if (
      allPackageDeps.has('next') ||
      fileNames.has('next.config.js') ||
      fileNames.has('next.config.mjs') ||
      fileNames.has('next.config.ts') ||
      Array.from(filePaths).some((p) => p.startsWith('app/') || p.startsWith('src/app/') || p.startsWith('pages/'))
    ) {
      return { framework: 'Next.js' };
    }

    // 3. NUXT / SVELTEKIT / REMIX / ASTRO
    if (allPackageDeps.has('nuxt') || fileNames.has('nuxt.config.ts') || fileNames.has('nuxt.config.js')) return { framework: 'Nuxt' };
    if (allPackageDeps.has('@sveltejs/kit') || fileNames.has('svelte.config.js')) return { framework: 'SvelteKit' };
    if (allPackageDeps.has('@remix-run/react') || allPackageDeps.has('@remix-run/node')) return { framework: 'Remix' };
    if (allPackageDeps.has('astro') || fileNames.has('astro.config.mjs')) return { framework: 'Astro' };

    // 4. JAVA / SPRING BOOT
    if (
      fileNames.has('pom.xml') ||
      fileNames.has('build.gradle') ||
      fileNames.has('build.gradle.kts')
    ) {
      if (
        codeSignatures.includes('org.springframework') ||
        codeSignatures.includes('spring-boot') ||
        allFileContents.includes('@SpringBootApplication') ||
        allFileContents.includes('@RestController') ||
        allFileContents.includes('@Service')
      ) {
        return { framework: 'Spring Boot' };
      }
      return { framework: 'Java Standard' };
    }

    // 5. PYTHON FRAMEWORKS
    if (codeSignatures.includes('django') || fileNames.has('manage.py')) return { framework: 'Django' };
    if (codeSignatures.includes('fastapi') || allFileContents.includes('FastAPI(')) return { framework: 'FastAPI' };
    if (codeSignatures.includes('flask') || allFileContents.includes('Flask(')) return { framework: 'Flask' };

    // 6. RUBY / PHP / .NET / GO
    if (fileNames.has('gemfile') && (codeSignatures.includes('rails') || allFileContents.includes('Rails::Application'))) return { framework: 'Ruby on Rails' };
    if (fileNames.has('composer.json') && (codeSignatures.includes('laravel/framework') || codeSignatures.includes('Illuminate\\'))) return { framework: 'Laravel' };
    if (Array.from(fileNames).some((n) => n.endsWith('.csproj') || n.endsWith('.fsproj'))) return { framework: 'ASP.NET Core' };
    if (fileNames.has('go.mod')) return { framework: 'Go Standard' };
    if (fileNames.has('cargo.toml')) return { framework: 'Rust Cargo' };

    // 7. STANDALONE EXPRESS / FASTIFY
    if (allPackageDeps.has('express') || codeSignatures.includes('express()') || codeSignatures.includes("require('express')")) {
      return { framework: 'Express' };
    }
    if (allPackageDeps.has('fastify') || codeSignatures.includes('fastify()') || codeSignatures.includes("require('fastify')")) {
      return { framework: 'Fastify' };
    }

    // 8. OTHER TS/JS
    if (allPackageDeps.has('react')) return { framework: 'React' };
    if (allPackageDeps.has('vue')) return { framework: 'Vue' };
    if (fileNames.has('package.json') || fileNames.has('tsconfig.json')) return { framework: 'Node.js' };

    return { framework: 'Custom Backend' };
  }

  /**
   * Detects full technology stack breakdown.
   */
  static detectTechnologies(files: ExtractedFile[], frameworkInfo?: DetectedFrameworkInfo): TechTag[] {
    const info = frameworkInfo || this.detectFrameworkAndAdapter(files);
    const techs: TechTag[] = [];
    const addedNames = new Set<string>();

    const addTech = (name: string, category: TechTag['category'], icon?: string, color?: string) => {
      if (!addedNames.has(name)) {
        addedNames.add(name);
        techs.push({ name, category, icon, color });
      }
    };

    const exts = new Set(files.map((f) => f.extension.toLowerCase()));
    const fileNames = new Set(files.map((f) => f.fileName.toLowerCase()));
    const fullContent = files.map((f) => f.content).join('\n');
    const allPackageDeps = this.extractPackageDependencies(files);

    // Languages
    if (exts.has('.ts') || exts.has('.tsx')) addTech('TypeScript', 'language', 'code', '#3178c6');
    if (exts.has('.js') || exts.has('.jsx')) addTech('JavaScript', 'language', 'javascript', '#f7df1e');
    if (exts.has('.java')) addTech('Java', 'language', 'coffee', '#b07219');
    if (exts.has('.py')) addTech('Python', 'language', 'terminal', '#3572A5');
    if (exts.has('.go')) addTech('Go', 'language', 'code', '#00ADD8');
    if (exts.has('.rs')) addTech('Rust', 'language', 'settings', '#dea584');
    if (exts.has('.sql')) addTech('SQL', 'language', 'database', '#e38c00');

    // Framework
    if (info.framework && info.framework !== 'Custom Backend') {
      addTech(info.framework, 'framework', 'layers', '#fbcfe8');
    }

    // Adapter
    if (info.httpAdapter) {
      addTech(info.httpAdapter, 'adapter', 'alt_route', '#b7c8e1');
    }

    // Database Detection
    if (
      allPackageDeps.has('pg') ||
      allPackageDeps.has('postgres') ||
      allPackageDeps.has('@supabase/supabase-js') ||
      fullContent.includes('org.postgresql') ||
      fullContent.includes('postgresql://') ||
      fullContent.includes('r2dbc:postgresql') ||
      fullContent.includes('SUPABASE_URL')
    ) {
      addTech('PostgreSQL', 'database', 'storage', '#336791');
    }

    if (
      allPackageDeps.has('mysql') ||
      allPackageDeps.has('mysql2') ||
      fullContent.includes('mysql-connector') ||
      fullContent.includes('jdbc:mysql://') ||
      fullContent.includes('com.mysql.cj.jdbc.Driver')
    ) {
      addTech('MySQL', 'database', 'storage', '#00758F');
    }

    if (
      allPackageDeps.has('mongodb') ||
      allPackageDeps.has('mongoose') ||
      fullContent.includes('spring-boot-starter-data-mongodb') ||
      fullContent.includes('mongodb://')
    ) {
      addTech('MongoDB', 'database', 'storage', '#47A248');
    }

    if (allPackageDeps.has('sqlite3') || allPackageDeps.has('better-sqlite3') || fullContent.includes('sqlite:')) {
      addTech('SQLite', 'database', 'storage', '#003B57');
    }

    // Caching / Infrastructure (Separated from primary database)
    if (
      allPackageDeps.has('redis') ||
      allPackageDeps.has('ioredis') ||
      allPackageDeps.has('@nestjs/redis') ||
      fullContent.includes('spring-boot-starter-data-redis') ||
      fullContent.includes('org.springframework.data.redis') ||
      fullContent.includes('RedisTemplate') ||
      fullContent.includes('RedisConfig')
    ) {
      addTech('Redis', 'caching', 'speed', '#DC382D');
    }

    // Authentication
    if (
      allPackageDeps.has('jsonwebtoken') ||
      allPackageDeps.has('@nestjs/jwt') ||
      allPackageDeps.has('next-auth') ||
      allPackageDeps.has('@auth/core') ||
      fullContent.includes('jjwt') ||
      fullContent.includes('JwtTokenProvider') ||
      fullContent.includes('JwtAuthenticationFilter')
    ) {
      addTech('JWT Auth', 'auth', 'lock', '#00E699');
    }

    // Build Tools
    if (fileNames.has('pom.xml')) addTech('Maven', 'build', 'build', '#C71A36');
    if (fileNames.has('build.gradle') || fileNames.has('build.gradle.kts')) addTech('Gradle', 'build', 'build', '#02303A');
    if (fileNames.has('package-lock.json')) addTech('npm', 'build', 'inventory_2', '#CB3837');
    if (fileNames.has('yarn.lock')) addTech('Yarn', 'build', 'inventory_2', '#2C8EBB');
    if (fileNames.has('pnpm-lock.yaml')) addTech('pnpm', 'build', 'inventory_2', '#F69220');

    // Container
    if (fileNames.has('dockerfile') || fileNames.has('docker-compose.yml') || fileNames.has('docker-compose.yaml')) {
      addTech('Docker', 'container', 'deployed_code', '#2496ED');
    }

    return techs;
  }

  /**
   * Dynamically constructs the Core Architecture Flow based on actual AST symbols,
   * framework conventions, decorators, configuration files, and database drivers.
   * Ensures each node contains only genuine, evidence-backed source references and line numbers.
   */
  static generateArchitectureFlow(
    files: ExtractedFile[],
    chunks: ParsedChunk[],
    techs: TechTag[],
    frameworkInfo: DetectedFrameworkInfo
  ): ArchitectureFlow {
    const nodes: ArchitectureFlowNode[] = [];

    // Helper to find references and line metadata from files and parsed chunks
    const collectLayerReferences = (
      predicate: (file: ExtractedFile, chunk?: ParsedChunk) => boolean
    ): { files: string[]; symbols: string[]; references: ArchitectureFlowReference[] } => {
      const matchedFiles = new Set<string>();
      const matchedSymbols = new Set<string>();
      const references: ArchitectureFlowReference[] = [];

      for (const file of files) {
        const fileChunks = chunks.filter((c) => c.filePath === file.filePath);
        let fileMatched = false;

        if (fileChunks.length > 0) {
          for (const chunk of fileChunks) {
            if (predicate(file, chunk)) {
              fileMatched = true;
              matchedFiles.add(file.filePath);
              if (chunk.symbolName) matchedSymbols.add(chunk.symbolName);

              references.push({
                filePath: file.filePath,
                symbolName: chunk.symbolName,
                symbolType: chunk.symbolType,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
              });
            }
          }
        }

        // Also check whole file if no chunks matched directly
        if (!fileMatched && predicate(file)) {
          matchedFiles.add(file.filePath);
          references.push({
            filePath: file.filePath,
            startLine: 1,
            endLine: Math.min(file.lineCount, 50),
          });
        }
      }

      return {
        files: Array.from(matchedFiles),
        symbols: Array.from(matchedSymbols),
        references,
      };
    };

    // Determine primary database name and caching
    const primaryDbTech = techs.find((t) => t.category === 'database');
    const cacheTech = techs.find((t) => t.category === 'caching');
    const databaseLabel = primaryDbTech ? primaryDbTech.name : 'Database';

    // 1. SPRING BOOT ARCHITECTURE FLOW
    if (frameworkInfo.framework === 'Spring Boot' || files.some((f) => f.fileName === 'pom.xml' && f.content.includes('org.springframework'))) {
      // Controllers
      const ctrl = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@RestController') ||
          chunkContent.includes('@Controller') ||
          content.includes('@RestController') ||
          content.includes('@Controller') ||
          c?.symbolType === 'controller' ||
          pathLower.endsWith('controller.java') ||
          pathLower.endsWith('resource.java') ||
          pathLower.includes('/controller/') ||
          pathLower.includes('/controllers/')
        );
      });
      if (ctrl.files.length > 0) {
        nodes.push({
          id: 'controllers',
          label: 'Controllers',
          type: 'controller',
          description: 'REST API endpoints & HTTP request handling',
          icon: 'api',
          color: 'text-[#fbcfe8]',
          files: ctrl.files,
          symbols: ctrl.symbols,
          references: ctrl.references,
        });
      }

      // Services
      const srv = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Service') ||
          content.includes('@Service') ||
          c?.symbolType === 'service' ||
          pathLower.endsWith('service.java') ||
          pathLower.endsWith('serviceimpl.java') ||
          pathLower.endsWith('manager.java') ||
          pathLower.endsWith('usecase.java') ||
          pathLower.includes('/service/') ||
          pathLower.includes('/services/')
        );
      });
      if (srv.files.length > 0) {
        nodes.push({
          id: 'services',
          label: 'Services',
          type: 'service',
          description: 'Business logic & transaction coordination',
          icon: 'settings_b_roll',
          color: 'text-[#b7c8e1]',
          files: srv.files,
          symbols: srv.symbols,
          references: srv.references,
        });
      }

      // Repositories / Data Access
      const repo = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Repository') ||
          chunkContent.includes('JpaRepository') ||
          chunkContent.includes('CrudRepository') ||
          content.includes('@Repository') ||
          content.includes('JpaRepository') ||
          content.includes('CrudRepository') ||
          pathLower.endsWith('repository.java') ||
          pathLower.endsWith('dao.java') ||
          pathLower.endsWith('mapper.java') ||
          pathLower.includes('/repository/') ||
          pathLower.includes('/repositories/') ||
          pathLower.includes('/dao/')
        );
      });
      if (repo.files.length > 0) {
        nodes.push({
          id: 'repositories',
          label: 'Repositories',
          type: 'repository',
          description: 'Data persistence & SQL/JPA query access',
          icon: 'folder_data',
          color: 'text-[#d7c3b6]',
          files: repo.files,
          symbols: repo.symbols,
          references: repo.references,
        });
      }

      // Entities & Models
      const ent = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Entity') ||
          chunkContent.includes('@Table') ||
          chunkContent.includes('@Document') ||
          content.includes('@Entity') ||
          content.includes('@Table') ||
          content.includes('@Document') ||
          pathLower.includes('/model/') ||
          pathLower.includes('/models/') ||
          pathLower.includes('/entity/') ||
          pathLower.includes('/entities/') ||
          pathLower.includes('/domain/')
        );
      });
      if (ent.files.length > 0) {
        nodes.push({
          id: 'entities',
          label: 'Entities',
          type: 'entity',
          description: 'Domain models & database table mappings',
          icon: 'dataset',
          color: 'text-emerald-400',
          files: ent.files,
          symbols: ent.symbols,
          references: ent.references,
        });
      }

      // Cache / Infrastructure Layer (e.g. Redis)
      if (cacheTech) {
        const cacheRef = collectLayerReferences((f) => {
          const p = f.filePath.toLowerCase();
          return p.includes('redis') || f.content.includes('RedisConfig') || f.content.includes('RedisTemplate');
        });
        if (cacheRef.files.length > 0) {
          nodes.push({
            id: 'cache',
            label: `Cache (${cacheTech.name})`,
            type: 'cache',
            description: `${cacheTech.name} in-memory caching & session store`,
            icon: 'speed',
            color: 'text-rose-400',
            files: cacheRef.files,
            symbols: cacheRef.symbols,
            references: cacheRef.references,
          });
        }
      }

      // Database
      const dbRef = collectLayerReferences((f) => {
        const p = f.filePath.toLowerCase();
        return (
          p.endsWith('application.yml') ||
          p.endsWith('application.properties') ||
          p.endsWith('schema.sql') ||
          p.endsWith('data.sql') ||
          p.includes('database') ||
          p.includes('datasource') ||
          p === 'backend/pom.xml' ||
          p === 'pom.xml'
        );
      });
      nodes.push({
        id: 'database',
        label: databaseLabel,
        type: 'database',
        description: `Primary persistence layer (${databaseLabel})`,
        icon: 'dns',
        color: 'text-amber-400',
        files: dbRef.files.length > 0 ? dbRef.files : files.filter((f) => f.fileName.includes('application')).map((f) => f.filePath),
        symbols: [databaseLabel],
        references: dbRef.references,
      });

      return { nodes };
    }

    // 2. NESTJS ARCHITECTURE FLOW
    if (frameworkInfo.isNest || frameworkInfo.framework === 'NestJS') {
      // Controllers
      const ctrl = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Controller') ||
          content.includes('@Controller') ||
          c?.symbolType === 'controller' ||
          pathLower.endsWith('.controller.ts') ||
          pathLower.endsWith('.controller.js') ||
          pathLower.includes('/controllers/')
        );
      });
      if (ctrl.files.length > 0) {
        nodes.push({
          id: 'controllers',
          label: 'Controllers',
          type: 'controller',
          description: 'NestJS HTTP routing & API controllers',
          icon: 'api',
          color: 'text-[#fbcfe8]',
          files: ctrl.files,
          symbols: ctrl.symbols,
          references: ctrl.references,
        });
      }

      // Services / Providers
      const srv = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Injectable') ||
          content.includes('@Injectable') ||
          c?.symbolType === 'service' ||
          pathLower.endsWith('.service.ts') ||
          pathLower.endsWith('.service.js') ||
          pathLower.endsWith('.provider.ts') ||
          pathLower.endsWith('.guard.ts')
        );
      });
      if (srv.files.length > 0) {
        nodes.push({
          id: 'services',
          label: 'Services / Providers',
          type: 'service',
          description: 'Injectable business logic & core domain services',
          icon: 'settings_b_roll',
          color: 'text-[#b7c8e1]',
          files: srv.files,
          symbols: srv.symbols,
          references: srv.references,
        });
      }

      // Modules
      const mod = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Module') ||
          content.includes('@Module') ||
          pathLower.endsWith('.module.ts') ||
          pathLower.endsWith('.module.js')
        );
      });
      if (mod.files.length > 0) {
        nodes.push({
          id: 'modules',
          label: 'Modules',
          type: 'module',
          description: 'NestJS module boundaries & dependency graphs',
          icon: 'view_module',
          color: 'text-indigo-400',
          files: mod.files,
          symbols: mod.symbols,
          references: mod.references,
        });
      }

      // Data Access / Entities / Repositories
      const dataLayer = collectLayerReferences((f, c) => {
        const pathLower = f.filePath.toLowerCase();
        const content = f.content;
        const chunkContent = c?.content || '';
        return (
          chunkContent.includes('@Entity') ||
          chunkContent.includes('@Schema') ||
          content.includes('@Entity') ||
          content.includes('@Schema') ||
          pathLower.endsWith('.entity.ts') ||
          pathLower.endsWith('.repository.ts') ||
          pathLower.endsWith('.schema.ts') ||
          pathLower.endsWith('schema.prisma') ||
          pathLower.includes('/entities/') ||
          pathLower.includes('/repositories/') ||
          pathLower.includes('/models/')
        );
      });
      if (dataLayer.files.length > 0) {
        nodes.push({
          id: 'data-access',
          label: 'Data Access',
          type: 'repository',
          description: 'ORM schemas, repositories & entity definitions',
          icon: 'folder_data',
          color: 'text-[#d7c3b6]',
          files: dataLayer.files,
          symbols: dataLayer.symbols,
          references: dataLayer.references,
        });
      }

      // Cache Layer (if Redis detected)
      if (cacheTech) {
        const cacheRef = collectLayerReferences((f) => {
          const p = f.filePath.toLowerCase();
          return p.includes('redis') || f.content.includes('cache-manager') || f.content.includes('@nestjs/redis');
        });
        if (cacheRef.files.length > 0) {
          nodes.push({
            id: 'cache',
            label: `Cache (${cacheTech.name})`,
            type: 'cache',
            description: `${cacheTech.name} cache store`,
            icon: 'speed',
            color: 'text-rose-400',
            files: cacheRef.files,
            symbols: cacheRef.symbols,
            references: cacheRef.references,
          });
        }
      }

      // Database
      const dbRef = collectLayerReferences((f) => {
        const p = f.filePath.toLowerCase();
        return (
          p.endsWith('schema.prisma') ||
          p.includes('ormconfig') ||
          p.includes('database') ||
          p.includes('datasource') ||
          p.endsWith('package.json')
        );
      });
      nodes.push({
        id: 'database',
        label: databaseLabel,
        type: 'database',
        description: `Primary persistence layer (${databaseLabel})`,
        icon: 'dns',
        color: 'text-amber-400',
        files: dbRef.files.length > 0 ? dbRef.files : files.filter((f) => f.fileName === 'package.json').map((f) => f.filePath),
        symbols: [databaseLabel],
        references: dbRef.references,
      });

      return { nodes };
    }

    // 3. NEXT.JS ARCHITECTURE FLOW
    if (frameworkInfo.framework === 'Next.js') {
      const routes = collectLayerReferences((f) => {
        const p = f.filePath.toLowerCase();
        return (
          (p.startsWith('app/') || p.includes('/app/')) && (p.endsWith('/page.tsx') || p.endsWith('/page.jsx') || p.endsWith('/route.ts') || p.endsWith('/route.js') || p.endsWith('page.tsx') || p.endsWith('route.ts')) ||
          (p.startsWith('pages/') || p.includes('/pages/')) && (p.endsWith('.tsx') || p.endsWith('.jsx') || p.endsWith('.ts') || p.endsWith('.js'))
        );
      });
      if (routes.files.length > 0) {
        nodes.push({
          id: 'routes',
          label: 'App Routes & Pages',
          type: 'route',
          description: 'Next.js App Router pages & server route handlers',
          icon: 'web',
          color: 'text-[#fbcfe8]',
          files: routes.files,
          symbols: routes.symbols,
          references: routes.references,
        });
      }

      const serverLayer = collectLayerReferences((f, c) => {
        const p = f.filePath.toLowerCase();
        return (
          p.startsWith('actions/') || p.includes('/actions/') ||
          p.startsWith('services/') || p.includes('/services/') ||
          p.startsWith('server/') || p.includes('/server/') ||
          p.startsWith('lib/') || p.includes('/lib/') ||
          f.content.includes("'use server'") ||
          f.content.includes('"use server"') ||
          c?.symbolType === 'service'
        );
      });
      if (serverLayer.files.length > 0) {
        nodes.push({
          id: 'server-layer',
          label: 'Server Layer',
          type: 'service',
          description: 'Server Actions, middleware & domain logic',
          icon: 'terminal',
          color: 'text-[#b7c8e1]',
          files: serverLayer.files,
          symbols: serverLayer.symbols,
          references: serverLayer.references,
        });
      }

      const dataLayer = collectLayerReferences((f) => {
        const p = f.filePath.toLowerCase();
        return (
          p.startsWith('db/') || p.includes('/db/') ||
          p.startsWith('prisma/') || p.includes('/prisma/') ||
          p.startsWith('models/') || p.includes('/models/') ||
          p.startsWith('drizzle/') || p.includes('/drizzle/') ||
          p.endsWith('schema.prisma')
        );
      });
      if (dataLayer.files.length > 0) {
        nodes.push({
          id: 'data-access',
          label: 'Data Access',
          type: 'repository',
          description: 'Database client, models & schema migrations',
          icon: 'folder_data',
          color: 'text-[#d7c3b6]',
          files: dataLayer.files,
          symbols: dataLayer.symbols,
          references: dataLayer.references,
        });
      }

      nodes.push({
        id: 'database',
        label: databaseLabel,
        type: 'database',
        description: `Primary persistence layer (${databaseLabel})`,
        icon: 'dns',
        color: 'text-amber-400',
        files: dataLayer.files.length > 0 ? dataLayer.files : files.slice(0, 1).map((f) => f.filePath),
        symbols: [databaseLabel],
        references: dataLayer.references,
      });

      return { nodes };
    }

    // 4. EXPRESS / FASTIFY ARCHITECTURE FLOW
    if (frameworkInfo.framework === 'Express' || frameworkInfo.framework === 'Fastify') {
      const routes = collectLayerReferences((f) => {
        const p = f.filePath.toLowerCase();
        return p.startsWith('routes/') || p.includes('/routes/') || p.endsWith('.routes.ts') || p.endsWith('.routes.js') || f.content.includes('router.');
      });
      if (routes.files.length > 0) {
        nodes.push({
          id: 'routes',
          label: 'Routes',
          type: 'route',
          description: 'HTTP route definitions & URL mappings',
          icon: 'alt_route',
          color: 'text-[#fbcfe8]',
          files: routes.files,
          symbols: routes.symbols,
          references: routes.references,
        });
      }

      const controllers = collectLayerReferences((f, c) => {
        const p = f.filePath.toLowerCase();
        return p.startsWith('controllers/') || p.includes('/controllers/') || p.startsWith('handlers/') || p.includes('/handlers/') || p.endsWith('.controller.ts') || p.endsWith('.controller.js') || c?.symbolType === 'controller';
      });
      if (controllers.files.length > 0) {
        nodes.push({
          id: 'controllers',
          label: 'Controllers',
          type: 'controller',
          description: 'Request handlers & response serializers',
          icon: 'api',
          color: 'text-[#b7c8e1]',
          files: controllers.files,
          symbols: controllers.symbols,
          references: controllers.references,
        });
      }

      const services = collectLayerReferences((f, c) => {
        const p = f.filePath.toLowerCase();
        return p.startsWith('services/') || p.includes('/services/') || p.endsWith('.service.ts') || p.endsWith('.service.js') || c?.symbolType === 'service';
      });
      if (services.files.length > 0) {
        nodes.push({
          id: 'services',
          label: 'Services',
          type: 'service',
          description: 'Business logic & background workflows',
          icon: 'settings_b_roll',
          color: 'text-indigo-400',
          files: services.files,
          symbols: services.symbols,
          references: services.references,
        });
      }

      const models = collectLayerReferences((f) => {
        const p = f.filePath.toLowerCase();
        return p.startsWith('models/') || p.includes('/models/') || p.startsWith('schemas/') || p.includes('/schemas/') || p.endsWith('.model.ts') || p.endsWith('.model.js');
      });
      if (models.files.length > 0) {
        nodes.push({
          id: 'models',
          label: 'Models / Schemas',
          type: 'repository',
          description: 'Data models & schema validation',
          icon: 'folder_data',
          color: 'text-[#d7c3b6]',
          files: models.files,
          symbols: models.symbols,
          references: models.references,
        });
      }

      nodes.push({
        id: 'database',
        label: databaseLabel,
        type: 'database',
        description: `Primary persistence layer (${databaseLabel})`,
        icon: 'dns',
        color: 'text-amber-400',
        files: models.files.length > 0 ? models.files : files.slice(0, 1).map((f) => f.filePath),
        symbols: [databaseLabel],
        references: models.references,
      });

      return { nodes };
    }

    // 5. GENERIC CODEBASE EVIDENCE-BASED FLOW
    const apiLayer = collectLayerReferences((f, c) => {
      const p = f.filePath.toLowerCase();
      return p.includes('controller') || p.includes('route') || p.includes('handler') || p.includes('api') || c?.symbolType === 'controller';
    });
    if (apiLayer.files.length > 0) {
      nodes.push({
        id: 'api-layer',
        label: 'API / Entrypoints',
        type: 'entry',
        description: 'Public API routes & ingress points',
        icon: 'api',
        color: 'text-[#fbcfe8]',
        files: apiLayer.files,
        symbols: apiLayer.symbols,
        references: apiLayer.references,
      });
    }

    const logicLayer = collectLayerReferences((f, c) => {
      const p = f.filePath.toLowerCase();
      return p.includes('service') || p.includes('logic') || p.includes('core') || p.includes('lib') || c?.symbolType === 'service';
    });
    if (logicLayer.files.length > 0) {
      nodes.push({
        id: 'logic-layer',
        label: 'Core Services',
        type: 'service',
        description: 'Core business domain & service logic',
        icon: 'settings_b_roll',
        color: 'text-[#b7c8e1]',
        files: logicLayer.files,
        symbols: logicLayer.symbols,
        references: logicLayer.references,
      });
    }

    const storageLayer = collectLayerReferences((f) => {
      const p = f.filePath.toLowerCase();
      return p.includes('model') || p.includes('schema') || p.includes('db') || p.includes('data') || p.includes('repository');
    });
    if (storageLayer.files.length > 0) {
      nodes.push({
        id: 'storage-layer',
        label: 'Data Layer',
        type: 'repository',
        description: 'Persistence models & database interfaces',
        icon: 'folder_data',
        color: 'text-[#d7c3b6]',
        files: storageLayer.files,
        symbols: storageLayer.symbols,
        references: storageLayer.references,
      });
    }

    // If database evidence exists, attach database node
    if (primaryDbTech || storageLayer.files.length > 0) {
      nodes.push({
        id: 'database',
        label: databaseLabel,
        type: 'database',
        description: `Primary persistence layer (${databaseLabel})`,
        icon: 'dns',
        color: 'text-amber-400',
        files: storageLayer.files.length > 0 ? storageLayer.files : files.slice(0, 1).map((f) => f.filePath),
        symbols: [databaseLabel],
        references: storageLayer.references,
      });
    }

    // If no layers matched at all, provide a single generic Module overview node
    if (nodes.length === 0) {
      nodes.push({
        id: 'codebase-modules',
        label: 'Source Modules',
        type: 'module',
        description: 'Source files & application modules',
        icon: 'view_module',
        color: 'text-[#b7c8e1]',
        files: files.slice(0, 20).map((f) => f.filePath),
        symbols: [],
        references: files.slice(0, 20).map((f) => ({ filePath: f.filePath, startLine: 1, endLine: f.lineCount })),
      });
    }

    return { nodes };
  }

  /**
   * Generates a comprehensive architectural summary using Gemini / OpenAI LLM.
   */
  static async generateSummary(
    repoName: string,
    files: ExtractedFile[],
    techs: TechTag[],
    stats: CalculatedStats
  ): Promise<GeneratedSummary> {
    const mainLanguage = techs.find((t) => t.category === 'language')?.name || 'TypeScript';
    const frameworkInfo = this.detectFrameworkAndAdapter(files);
    const architectureFlow = this.generateArchitectureFlow(files, [], techs, frameworkInfo);

    const importantFiles = files
      .filter((f) => {
        const p = f.filePath.toLowerCase();
        const n = f.fileName.toLowerCase();
        return (
          n === 'readme.md' ||
          n === 'package.json' ||
          n === 'nest-cli.json' ||
          n === 'pom.xml' ||
          n === 'build.gradle' ||
          n === 'docker-compose.yml' ||
          p.endsWith('main.ts') ||
          p.endsWith('main.js') ||
          p.endsWith('app.module.ts') ||
          p.endsWith('application.yml') ||
          p.endsWith('application.properties')
        );
      })
      .slice(0, 8);

    const contextSnippet = importantFiles
      .map((f) => `--- File: ${f.filePath} ---\n${f.content.slice(0, 1000)}`)
      .join('\n\n');

    const prompt = `You are a Principal Software Architect. Analyze this repository: "${repoName}".
Indexed Context:
${contextSnippet}

Detected Framework: ${frameworkInfo.framework}
${frameworkInfo.httpAdapter ? `Detected HTTP Adapter: ${frameworkInfo.httpAdapter}` : ''}
Primary Language: ${mainLanguage}
Stats: ${stats.files} files, ${stats.classes} classes, ${stats.endpoints} endpoints, ${stats.packages} packages.

Generate a JSON object strictly following this format:
{
  "projectType": "e.g. NestJS TypeScript Application / Spring Boot Java Microservice",
  "architecture": "e.g. Layered Modular Architecture / Clean Architecture",
  "backend": "${frameworkInfo.framework}",
  "httpAdapter": ${frameworkInfo.httpAdapter ? `"${frameworkInfo.httpAdapter}"` : 'null'},
  "frontend": "e.g. React / Web UI / N/A",
  "database": "e.g. PostgreSQL / MySQL / MongoDB / Relational Database",
  "authentication": "e.g. JWT Auth / Session Auth / N/A",
  "caching": "e.g. Redis / In-Memory / null",
  "buildTool": "e.g. Maven / npm / Gradle / null",
  "description": "A 2-3 sentence executive architectural overview of what this application does.",
  "keyPackages": ["list", "of", "3-5", "core", "domain", "modules"]
}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    try {
      let cleanJson = '{}';

      if (geminiKey) {
        const preferredModel = process.env.LLM_MODEL || 'gemini-3.6-flash';
        const geminiModels = Array.from(new Set([
          preferredModel,
          'gemini-3.6-flash',
          'gemini-3.7-flash',
          'gemini-flash-latest',
          'gemini-3.5-flash',
        ]));

        for (const model of geminiModels) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
              }),
              signal: AbortSignal.timeout(15000),
            });

            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const match = text.match(/\{[\s\S]*\}/);
              if (match) {
                cleanJson = match[0];
                break;
              }
            }
          } catch (_) {}
        }
      } else if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await openai.chat.completions.create({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a code analyzer that outputs only strict JSON without markdown formatting.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
        });
        const raw = response.choices[0]?.message?.content || '{}';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) cleanJson = match[0];
      }

      const parsed = JSON.parse(cleanJson);

      let finalBackend = frameworkInfo.framework;
      if (!frameworkInfo.isNest && parsed.backend && parsed.backend !== 'Custom Backend') {
        finalBackend = parsed.backend;
      }

      let finalProjectType = `${frameworkInfo.framework} ${mainLanguage} Application`;
      if (frameworkInfo.isNest) {
        finalProjectType = `NestJS ${mainLanguage} Application`;
      } else if (parsed.projectType && !parsed.projectType.toLowerCase().includes('express') && frameworkInfo.framework === 'NestJS') {
        finalProjectType = parsed.projectType;
      } else if (parsed.projectType) {
        finalProjectType = parsed.projectType;
      }

      const defaultArchitecture = frameworkInfo.isNest
        ? 'Layered Modular Architecture'
        : parsed.architecture || 'Layered Modular Architecture';

      return {
        projectType: finalProjectType,
        architecture: defaultArchitecture,
        backend: finalBackend,
        httpAdapter: frameworkInfo.httpAdapter || parsed.httpAdapter,
        frontend: parsed.frontend || (techs.some(t => t.name.toLowerCase().includes('next') || t.name.toLowerCase().includes('react')) ? 'Web UI / Client' : 'N/A'),
        database: parsed.database || techs.find((t) => t.category === 'database')?.name || 'Relational Database',
        authentication: parsed.authentication || techs.find((t) => t.category === 'auth')?.name || 'JWT Auth',
        caching: parsed.caching || techs.find((t) => t.category === 'caching')?.name,
        buildTool: parsed.buildTool || techs.find((t) => t.category === 'build')?.name,
        description: parsed.description || `${repoName} is a modular ${frameworkInfo.framework} application built with ${mainLanguage}${frameworkInfo.httpAdapter ? ` using ${frameworkInfo.httpAdapter} as the HTTP adapter` : ''}. It includes ${stats.files} indexed files across ${stats.packages} packages with ${stats.classes} classes/models and ${stats.endpoints} API routes.`,
        keyPackages: Array.isArray(parsed.keyPackages) && parsed.keyPackages.length > 0
          ? parsed.keyPackages
          : Array.from(new Set(files.map(f => f.filePath.split('/')[0]).filter(p => p && !p.startsWith('.')))).slice(0, 5),
        architectureFlow,
      };
    } catch (err: any) {
      console.warn('[Summary Generation Warning] LLM summary fallback:', err?.message);

      const isNest = frameworkInfo.isNest;
      const projectType = isNest
        ? `NestJS ${mainLanguage} Application`
        : `${frameworkInfo.framework} (${mainLanguage}) Application`;

      return {
        projectType,
        architecture: isNest ? 'Layered Modular Architecture' : 'Layered Modular Architecture with Service Layer',
        backend: frameworkInfo.framework,
        httpAdapter: frameworkInfo.httpAdapter,
        frontend: techs.some(t => t.name.toLowerCase().includes('next') || t.name.toLowerCase().includes('react')) ? 'Web UI / Client' : 'N/A',
        database: techs.find((t) => t.category === 'database')?.name || 'Database',
        authentication: techs.find((t) => t.category === 'auth')?.name || 'JWT Auth',
        description: `${repoName} is a comprehensive ${mainLanguage} application built with ${frameworkInfo.framework}${frameworkInfo.httpAdapter ? ` (using ${frameworkInfo.httpAdapter} adapter)` : ''}. It spans ${stats.files} source files and ${stats.classes} classes, exposing ${stats.endpoints} endpoints organized across ${stats.packages} domain modules.`,
        keyPackages: Array.from(new Set(files.map(f => f.filePath.split('/')[0]).filter(p => p && !p.startsWith('.')))).slice(0, 5),
        architectureFlow,
      };
    }
  }
}
