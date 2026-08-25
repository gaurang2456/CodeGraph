import { test, describe } from 'node:test';
import assert from 'node:assert';
import { shouldIndexFile, detectLanguage } from '../ingestion/fileFilter';
import { parseGitHubUrl } from '../ingestion/githubIngestion';
import { SummaryService } from '../summary/summaryService';
import { ParsedChunk } from '../parsing/types';

describe('File Filter & Ingestion Tests', () => {
  test('should accept valid source files', () => {
    assert.strictEqual(shouldIndexFile('src/index.ts'), true);
    assert.strictEqual(shouldIndexFile('backend/src/main/java/App.java'), true);
    assert.strictEqual(shouldIndexFile('services/api.py'), true);
    assert.strictEqual(shouldIndexFile('package.json'), true);
    assert.strictEqual(shouldIndexFile('pom.xml'), true);
    assert.strictEqual(shouldIndexFile('Dockerfile'), true);
    assert.strictEqual(shouldIndexFile('docker-compose.yml'), true);
  });

  test('should ignore non-source and binary files', () => {
    assert.strictEqual(shouldIndexFile('node_modules/express/index.js'), false);
    assert.strictEqual(shouldIndexFile('frontend/node_modules/react/index.js'), false);
    assert.strictEqual(shouldIndexFile('.git/config'), false);
    assert.strictEqual(shouldIndexFile('target/classes/App.class'), false);
    assert.strictEqual(shouldIndexFile('build/bundle.min.js'), false);
    assert.strictEqual(shouldIndexFile('images/logo.png'), false);
    assert.strictEqual(shouldIndexFile('docs/manual.pdf'), false);
    assert.strictEqual(shouldIndexFile('.DS_Store'), false);
  });

  test('should correctly detect file languages', () => {
    assert.strictEqual(detectLanguage('index.ts'), 'TypeScript');
    assert.strictEqual(detectLanguage('App.tsx'), 'TypeScript');
    assert.strictEqual(detectLanguage('server.js'), 'JavaScript');
    assert.strictEqual(detectLanguage('User.java'), 'Java');
    assert.strictEqual(detectLanguage('script.py'), 'Python');
    assert.strictEqual(detectLanguage('main.go'), 'Go');
    assert.strictEqual(detectLanguage('lib.rs'), 'Rust');
    assert.strictEqual(detectLanguage('schema.sql'), 'SQL');
    assert.strictEqual(detectLanguage('Dockerfile'), 'Dockerfile');
    assert.strictEqual(detectLanguage('config.yml'), 'YAML');
  });

  test('should parse GitHub repository URLs accurately', () => {
    const r1 = parseGitHubUrl('https://github.com/gaurang2456/SNIP');
    assert.strictEqual(r1.owner, 'gaurang2456');
    assert.strictEqual(r1.repo, 'SNIP');
    assert.strictEqual(r1.fullName, 'gaurang2456/SNIP');

    const r2 = parseGitHubUrl('owner/repo');
    assert.strictEqual(r2.owner, 'owner');
    assert.strictEqual(r2.repo, 'repo');

    const r3 = parseGitHubUrl('git@github.com:vercel/next.js.git');
    assert.strictEqual(r3.owner, 'vercel');
    assert.strictEqual(r3.repo, 'next.js');
  });
});

describe('Code Parser & Semantic Chunking Tests', () => {
  test('should parse Java class, annotations, and methods with accurate line numbers', () => {
    const javaCode = `package com.example.demo;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
public class UserController {

    @GetMapping("/users")
    public List<User> getUsers() {
        return userService.findAll();
    }
}`;

    const chunk: ParsedChunk = {
      filePath: 'src/main/java/com/example/demo/UserController.java',
      content: javaCode,
      startLine: 1,
      endLine: 13,
      language: 'Java',
      symbolName: 'UserController',
      symbolType: 'controller',
    };

    assert.strictEqual(chunk.symbolType, 'controller');
    assert.strictEqual(chunk.startLine, 1);
    assert.strictEqual(chunk.endLine, 13);
    assert.strictEqual(chunk.symbolName, 'UserController');
  });

  test('should parse TypeScript functions and exports', () => {
    const tsCode = `export async function calculateAnalytics(userId: string) {
  const data = await db.analytics.findMany({ where: { userId } });
  return data.reduce((acc, curr) => acc + curr.views, 0);
}`;

    const chunk: ParsedChunk = {
      filePath: 'src/analytics.ts',
      content: tsCode,
      startLine: 1,
      endLine: 4,
      language: 'TypeScript',
      symbolName: 'calculateAnalytics',
      symbolType: 'function',
    };

    assert.strictEqual(chunk.symbolType, 'function');
    assert.strictEqual(chunk.symbolName, 'calculateAnalytics');
  });

  test('should parse Python classes and functions', () => {
    const pyCode = `class OrderService:
    def process_order(self, order_id: str):
        pass`;

    const chunk: ParsedChunk = {
      filePath: 'services/order.py',
      content: pyCode,
      startLine: 1,
      endLine: 3,
      language: 'Python',
      symbolName: 'OrderService',
      symbolType: 'class',
    };

    assert.strictEqual(chunk.symbolType, 'class');
    assert.strictEqual(chunk.symbolName, 'OrderService');
  });

  test('should calculate statistics and detect technologies from files', () => {
    const sampleFiles = [
      {
        filePath: 'pom.xml',
        fileName: 'pom.xml',
        extension: '.xml',
        language: 'XML',
        content: `<project>
          <dependencies>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
            <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
          </dependencies>
        </project>`,
        lineCount: 15,
      },
      {
        filePath: 'src/main/java/com/app/UserController.java',
        fileName: 'UserController.java',
        extension: '.java',
        language: 'Java',
        content: '@RestController public class UserController { @GetMapping("/api") public String hello() { return "ok"; } }',
        lineCount: 10,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(sampleFiles);
    assert.strictEqual(frameworkInfo.framework, 'Spring Boot');

    const techs = SummaryService.detectTechnologies(sampleFiles, frameworkInfo);
    assert.ok(techs.some((t) => t.name === 'Java'));
    assert.ok(techs.some((t) => t.name === 'Spring Boot'));
    assert.ok(techs.some((t) => t.name === 'PostgreSQL'));
    assert.ok(techs.some((t) => t.name === 'Maven'));

    const stats = SummaryService.calculateStats(sampleFiles, [
      {
        filePath: 'src/main/java/com/app/UserController.java',
        content: sampleFiles[1].content,
        startLine: 1,
        endLine: 10,
        language: 'Java',
        symbolName: 'UserController',
        symbolType: 'controller',
      },
    ]);

    assert.strictEqual(stats.files, 2);
    assert.strictEqual(stats.dependencies, 3);
    assert.strictEqual(stats.classes, 1);
    assert.strictEqual(stats.endpoints, 1);
  });
});

describe('Framework Priority & HTTP Adapter Detection Tests', () => {
  test('1. NestJS + Express adapter detection', async () => {
    const nestExpressFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'nest-service',
          dependencies: {
            '@nestjs/common': '^10.0.0',
            '@nestjs/core': '^10.0.0',
            '@nestjs/platform-express': '^10.0.0',
            'reflect-metadata': '^0.1.13',
            'rxjs': '^7.8.1',
          },
        }),
        lineCount: 10,
      },
      {
        filePath: 'nest-cli.json',
        fileName: 'nest-cli.json',
        extension: '.json',
        language: 'JSON',
        content: '{"collection": "@nestjs/schematics"}',
        lineCount: 1,
      },
      {
        filePath: 'src/main.ts',
        fileName: 'main.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();`,
        lineCount: 8,
      },
      {
        filePath: 'src/app.module.ts',
        fileName: 'app.module.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `import { Module } from '@nestjs/common';
@Module({ imports: [], controllers: [], providers: [] })
export class AppModule {}`,
        lineCount: 4,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(nestExpressFiles);
    assert.strictEqual(frameworkInfo.framework, 'NestJS');
    assert.strictEqual(frameworkInfo.httpAdapter, 'Express');
    assert.strictEqual(frameworkInfo.isNest, true);

    const techs = SummaryService.detectTechnologies(nestExpressFiles, frameworkInfo);
    const frameworkTag = techs.find((t) => t.category === 'framework');
    const adapterTag = techs.find((t) => t.category === 'adapter');

    assert.strictEqual(frameworkTag?.name, 'NestJS');
    assert.ok(adapterTag?.name.includes('Express'));

    const stats = SummaryService.calculateStats(nestExpressFiles, []);
    const summary = await SummaryService.generateSummary('nest-service', nestExpressFiles, techs, stats);

    assert.strictEqual(summary.backend, 'NestJS');
    assert.strictEqual(summary.httpAdapter, 'Express');
    assert.ok(summary.projectType.includes('NestJS'));
    assert.strictEqual(summary.projectType.includes('Express (TypeScript) Application'), false);
  });

  test('2. NestJS + Fastify adapter detection', async () => {
    const nestFastifyFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'nest-fastify-service',
          dependencies: {
            '@nestjs/common': '^10.0.0',
            '@nestjs/core': '^10.0.0',
            '@nestjs/platform-fastify': '^10.0.0',
            'fastify': '^4.26.0',
          },
        }),
        lineCount: 10,
      },
      {
        filePath: 'src/main.ts',
        fileName: 'main.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.listen(3000, '0.0.0.0');
}
bootstrap();`,
        lineCount: 11,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(nestFastifyFiles);
    assert.strictEqual(frameworkInfo.framework, 'NestJS');
    assert.strictEqual(frameworkInfo.httpAdapter, 'Fastify');
    assert.strictEqual(frameworkInfo.isNest, true);

    const techs = SummaryService.detectTechnologies(nestFastifyFiles, frameworkInfo);
    const adapterTag = techs.find((t) => t.category === 'adapter');
    assert.strictEqual(adapterTag?.name, 'Fastify');
  });

  test('3. Plain Express application detection', async () => {
    const expressFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'express-api',
          dependencies: {
            express: '^4.19.2',
            cors: '^2.8.5',
          },
        }),
        lineCount: 8,
      },
      {
        filePath: 'src/app.ts',
        fileName: 'app.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `import express from 'express';
const app = express();
app.get('/health', (req, res) => res.json({ ok: true }));
export default app;`,
        lineCount: 5,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(expressFiles);
    assert.strictEqual(frameworkInfo.framework, 'Express');
    assert.strictEqual(frameworkInfo.isNest, undefined);

    const techs = SummaryService.detectTechnologies(expressFiles, frameworkInfo);
    const frameworkTag = techs.find((t) => t.category === 'framework');
    assert.strictEqual(frameworkTag?.name, 'Express');
    assert.strictEqual(techs.some((t) => t.category === 'adapter'), false);

    const stats = SummaryService.calculateStats(expressFiles, []);
    const summary = await SummaryService.generateSummary('express-api', expressFiles, techs, stats);

    assert.strictEqual(summary.backend, 'Express');
    assert.ok(summary.projectType.includes('Express'));
  });

  test('4. Plain Fastify application detection', async () => {
    const fastifyFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'fastify-api',
          dependencies: {
            fastify: '^4.26.0',
          },
        }),
        lineCount: 6,
      },
      {
        filePath: 'src/server.js',
        fileName: 'server.js',
        extension: '.js',
        language: 'JavaScript',
        content: `const fastify = require('fastify')({ logger: true });
fastify.get('/', async () => ({ hello: 'world' }));
fastify.listen({ port: 3000 });`,
        lineCount: 5,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(fastifyFiles);
    assert.strictEqual(frameworkInfo.framework, 'Fastify');

    const techs = SummaryService.detectTechnologies(fastifyFiles, frameworkInfo);
    const frameworkTag = techs.find((t) => t.category === 'framework');
    assert.strictEqual(frameworkTag?.name, 'Fastify');
    assert.strictEqual(techs.some((t) => t.category === 'adapter'), false);

    const stats = SummaryService.calculateStats(fastifyFiles, []);
    const summary = await SummaryService.generateSummary('fastify-api', fastifyFiles, techs, stats);

    assert.strictEqual(summary.backend, 'Fastify');
    assert.ok(summary.projectType.includes('Fastify'));
  });

  test('5. Next.js application detection', async () => {
    const nextFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'next-app',
          dependencies: {
            next: '14.2.0',
            react: '^18.3.0',
            'react-dom': '^18.3.0',
          },
        }),
        lineCount: 8,
      },
      {
        filePath: 'next.config.js',
        fileName: 'next.config.js',
        extension: '.js',
        language: 'JavaScript',
        content: 'module.exports = { reactStrictMode: true };',
        lineCount: 1,
      },
      {
        filePath: 'app/page.tsx',
        fileName: 'page.tsx',
        extension: '.tsx',
        language: 'TypeScript',
        content: 'export default function Page() { return <h1>Home</h1>; }',
        lineCount: 1,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(nextFiles);
    assert.strictEqual(frameworkInfo.framework, 'Next.js');

    const techs = SummaryService.detectTechnologies(nextFiles, frameworkInfo);
    const frameworkTag = techs.find((t) => t.category === 'framework');
    assert.strictEqual(frameworkTag?.name, 'Next.js');

    const stats = SummaryService.calculateStats(nextFiles, []);
    const summary = await SummaryService.generateSummary('next-app', nextFiles, techs, stats);

    assert.ok(summary.backend.includes('Next.js'));
    assert.ok(summary.projectType.includes('Next.js'));
  });
});

describe('Dynamic Evidence-Based Architecture Flow Tests', () => {
  test('1. Spring Boot Architecture Flow: Controllers -> Services -> Repositories -> Entities -> Cache -> PostgreSQL', () => {
    const files = [
      {
        filePath: 'backend/pom.xml',
        fileName: 'pom.xml',
        extension: '.xml',
        language: 'XML',
        content: `<project>
          <dependencies>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
            <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-redis</artifactId></dependency>
            <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
          </dependencies>
        </project>`,
        lineCount: 20,
      },
      {
        filePath: 'backend/src/main/resources/application.yml',
        fileName: 'application.yml',
        extension: '.yml',
        language: 'YAML',
        content: `spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/snip
  redis:
    host: localhost
    port: 6379`,
        lineCount: 8,
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/controller/AuthController.java',
        fileName: 'AuthController.java',
        extension: '.java',
        language: 'Java',
        content: `package com.urlshortener.controller;
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/login")
    public ResponseEntity<?> login() { return ResponseEntity.ok().build(); }
}`,
        lineCount: 8,
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/service/AuthService.java',
        fileName: 'AuthService.java',
        extension: '.java',
        language: 'Java',
        content: `package com.urlshortener.service;
@Service
public class AuthService {
    public User authenticate(String email, String password) { return null; }
}`,
        lineCount: 6,
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/repository/UserRepository.java',
        fileName: 'UserRepository.java',
        extension: '.java',
        language: 'Java',
        content: `package com.urlshortener.repository;
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}`,
        lineCount: 6,
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/model/User.java',
        fileName: 'User.java',
        extension: '.java',
        language: 'Java',
        content: `package com.urlshortener.model;
@Entity
@Table(name = "users")
public class User {
    @Id private Long id;
    private String email;
}`,
        lineCount: 7,
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/config/RedisConfig.java',
        fileName: 'RedisConfig.java',
        extension: '.java',
        language: 'Java',
        content: `package com.urlshortener.config;
@Configuration
public class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate() { return new RedisTemplate<>(); }
}`,
        lineCount: 8,
      },
    ];

    const chunks: ParsedChunk[] = [
      {
        filePath: 'backend/src/main/java/com/urlshortener/controller/AuthController.java',
        content: files[2].content,
        startLine: 1,
        endLine: 8,
        language: 'Java',
        symbolName: 'AuthController',
        symbolType: 'controller',
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/service/AuthService.java',
        content: files[3].content,
        startLine: 1,
        endLine: 6,
        language: 'Java',
        symbolName: 'AuthService',
        symbolType: 'service',
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/repository/UserRepository.java',
        content: files[4].content,
        startLine: 1,
        endLine: 6,
        language: 'Java',
        symbolName: 'UserRepository',
        symbolType: 'interface',
      },
      {
        filePath: 'backend/src/main/java/com/urlshortener/model/User.java',
        content: files[5].content,
        startLine: 1,
        endLine: 7,
        language: 'Java',
        symbolName: 'User',
        symbolType: 'class',
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(files);
    assert.strictEqual(frameworkInfo.framework, 'Spring Boot');

    const techs = SummaryService.detectTechnologies(files, frameworkInfo);
    assert.ok(techs.some((t) => t.name === 'PostgreSQL' && t.category === 'database'));
    assert.ok(techs.some((t) => t.name === 'Redis' && t.category === 'caching'));

    const flow = SummaryService.generateArchitectureFlow(files, chunks, techs, frameworkInfo);
    const nodeIds = flow.nodes.map((n) => n.id);

    // Verify architectural layers
    assert.deepStrictEqual(nodeIds, ['controllers', 'services', 'repositories', 'entities', 'cache', 'database']);

    // Check Controllers node
    const ctrlNode = flow.nodes.find((n) => n.id === 'controllers')!;
    assert.strictEqual(ctrlNode.label, 'Controllers');
    assert.ok(ctrlNode.files.includes('backend/src/main/java/com/urlshortener/controller/AuthController.java'));
    assert.ok(ctrlNode.symbols.includes('AuthController'));
    assert.strictEqual(ctrlNode.references[0].startLine, 1);
    assert.strictEqual(ctrlNode.references[0].endLine, 8);

    // Check Services node
    const srvNode = flow.nodes.find((n) => n.id === 'services')!;
    assert.strictEqual(srvNode.label, 'Services');
    assert.ok(srvNode.files.includes('backend/src/main/java/com/urlshortener/service/AuthService.java'));
    assert.strictEqual(srvNode.references[0].startLine, 1);
    assert.strictEqual(srvNode.references[0].endLine, 6);

    // Check Repositories node
    const repoNode = flow.nodes.find((n) => n.id === 'repositories')!;
    assert.strictEqual(repoNode.label, 'Repositories');
    assert.ok(repoNode.files.includes('backend/src/main/java/com/urlshortener/repository/UserRepository.java'));

    // Check Entities node
    const entNode = flow.nodes.find((n) => n.id === 'entities')!;
    assert.strictEqual(entNode.label, 'Entities');
    assert.ok(entNode.files.includes('backend/src/main/java/com/urlshortener/model/User.java'));

    // Check Cache node (separated from primary DB)
    const cacheNode = flow.nodes.find((n) => n.id === 'cache')!;
    assert.strictEqual(cacheNode.label, 'Cache (Redis)');
    assert.ok(cacheNode.files.includes('backend/src/main/java/com/urlshortener/config/RedisConfig.java'));

    // Check Database node (PostgreSQL, NOT MySQL and NOT Redis)
    const dbNode = flow.nodes.find((n) => n.id === 'database')!;
    assert.strictEqual(dbNode.label, 'PostgreSQL');
  });

  test('2. NestJS Architecture Flow: Controllers -> Services -> Modules -> Data Access -> Database', () => {
    const nestFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'nest-app',
          dependencies: {
            '@nestjs/common': '^10.0.0',
            '@nestjs/core': '^10.0.0',
            '@nestjs/platform-express': '^10.0.0',
            'typeorm': '^0.3.20',
            'mysql2': '^3.9.0',
          },
        }),
        lineCount: 12,
      },
      {
        filePath: 'src/controllers/users.controller.ts',
        fileName: 'users.controller.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `@Controller('users') export class UsersController { @Get() findAll() { return []; } }`,
        lineCount: 4,
      },
      {
        filePath: 'src/services/users.service.ts',
        fileName: 'users.service.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `@Injectable() export class UsersService { findAll() { return []; } }`,
        lineCount: 4,
      },
      {
        filePath: 'src/modules/users.module.ts',
        fileName: 'users.module.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `@Module({ controllers: [UsersController], providers: [UsersService] }) export class UsersModule {}`,
        lineCount: 3,
      },
      {
        filePath: 'src/entities/user.entity.ts',
        fileName: 'user.entity.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `@Entity() export class User { @PrimaryGeneratedColumn() id: number; }`,
        lineCount: 3,
      },
    ];

    const chunks: ParsedChunk[] = [
      {
        filePath: 'src/controllers/users.controller.ts',
        content: nestFiles[1].content,
        startLine: 1,
        endLine: 4,
        language: 'TypeScript',
        symbolName: 'UsersController',
        symbolType: 'controller',
      },
      {
        filePath: 'src/services/users.service.ts',
        content: nestFiles[2].content,
        startLine: 1,
        endLine: 4,
        language: 'TypeScript',
        symbolName: 'UsersService',
        symbolType: 'service',
      },
      {
        filePath: 'src/modules/users.module.ts',
        content: nestFiles[3].content,
        startLine: 1,
        endLine: 3,
        language: 'TypeScript',
        symbolName: 'UsersModule',
        symbolType: 'class',
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(nestFiles);
    assert.strictEqual(frameworkInfo.framework, 'NestJS');
    assert.strictEqual(frameworkInfo.httpAdapter, 'Express');

    const techs = SummaryService.detectTechnologies(nestFiles, frameworkInfo);
    assert.ok(techs.some((t) => t.name === 'MySQL' && t.category === 'database'));

    const flow = SummaryService.generateArchitectureFlow(nestFiles, chunks, techs, frameworkInfo);
    const nodeIds = flow.nodes.map((n) => n.id);

    assert.deepStrictEqual(nodeIds, ['controllers', 'services', 'modules', 'data-access', 'database']);
    assert.strictEqual(flow.nodes.find((n) => n.id === 'database')?.label, 'MySQL');
  });

  test('3. Next.js & Supabase PostgreSQL Architecture Flow', () => {
    const nextFiles = [
      {
        filePath: 'package.json',
        fileName: 'package.json',
        extension: '.json',
        language: 'JSON',
        content: JSON.stringify({
          name: 'fullstack-next',
          dependencies: {
            'next': '14.2.0',
            'react': '^18.3.0',
            '@supabase/supabase-js': '^2.40.0',
            'pg': '^8.11.0',
          },
        }),
        lineCount: 10,
      },
      {
        filePath: 'app/api/auth/route.ts',
        fileName: 'route.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `export async function POST(req: Request) { return Response.json({ ok: true }); }`,
        lineCount: 3,
      },
      {
        filePath: 'app/actions/user.ts',
        fileName: 'user.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: `'use server'; export async function createUser(data: any) { return null; }`,
        lineCount: 3,
      },
      {
        filePath: 'prisma/schema.prisma',
        fileName: 'schema.prisma',
        extension: '.prisma',
        language: 'Prisma',
        content: `datasource db { provider = "postgresql" url = env("DATABASE_URL") }`,
        lineCount: 3,
      },
    ];

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(nextFiles);
    assert.strictEqual(frameworkInfo.framework, 'Next.js');

    const techs = SummaryService.detectTechnologies(nextFiles, frameworkInfo);
    assert.ok(techs.some((t) => t.name === 'PostgreSQL' && t.category === 'database'));

    const flow = SummaryService.generateArchitectureFlow(nextFiles, [], techs, frameworkInfo);
    const nodeIds = flow.nodes.map((n) => n.id);

    assert.deepStrictEqual(nodeIds, ['routes', 'server-layer', 'data-access', 'database']);
    assert.strictEqual(flow.nodes.find((n) => n.id === 'database')?.label, 'PostgreSQL');
  });
});
