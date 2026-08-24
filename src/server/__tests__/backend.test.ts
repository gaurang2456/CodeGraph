import assert from 'node:assert';
import { test, describe } from 'node:test';
import { shouldIndexFile, detectLanguage, IGNORED_DIRECTORIES, IGNORED_EXTENSIONS } from '../ingestion/fileFilter';
import { parseGitHubUrl } from '../ingestion/githubIngestion';
import { CodeParser } from '../parsing/codeParser';
import { SummaryService } from '../summary/summaryService';

describe('File Filter & Ingestion Tests', () => {
  test('should accept valid source files', () => {
    assert.strictEqual(shouldIndexFile('src/main/java/com/example/SecurityConfig.java'), true);
    assert.strictEqual(shouldIndexFile('src/components/Navbar.tsx'), true);
    assert.strictEqual(shouldIndexFile('api/routes.py'), true);
    assert.strictEqual(shouldIndexFile('pom.xml'), true);
    assert.strictEqual(shouldIndexFile('package.json'), true);
    assert.strictEqual(shouldIndexFile('application.yml'), true);
  });

  test('should ignore non-source and binary files', () => {
    assert.strictEqual(shouldIndexFile('.git/config'), false);
    assert.strictEqual(shouldIndexFile('node_modules/react/index.js'), false);
    assert.strictEqual(shouldIndexFile('target/classes/App.class'), false);
    assert.strictEqual(shouldIndexFile('dist/bundle.js'), false);
    assert.strictEqual(shouldIndexFile('public/logo.png'), false);
    assert.strictEqual(shouldIndexFile('build/app.exe'), false);
    assert.strictEqual(shouldIndexFile('package-lock.json'), false);
  });

  test('should correctly detect file languages', () => {
    assert.strictEqual(detectLanguage('SecurityConfig.java'), 'Java');
    assert.strictEqual(detectLanguage('app/page.tsx'), 'TypeScript');
    assert.strictEqual(detectLanguage('server/app.py'), 'Python');
    assert.strictEqual(detectLanguage('pom.xml'), 'XML');
    assert.strictEqual(detectLanguage('application.yml'), 'YAML');
  });

  test('should parse GitHub repository URLs accurately', () => {
    const info1 = parseGitHubUrl('https://github.com/spring-projects/spring-petclinic');
    assert.strictEqual(info1.owner, 'spring-projects');
    assert.strictEqual(info1.repo, 'spring-petclinic');
    assert.strictEqual(info1.fullName, 'spring-projects/spring-petclinic');

    const info2 = parseGitHubUrl('gothinkster/spring-boot-realworld-example-app');
    assert.strictEqual(info2.owner, 'gothinkster');
    assert.strictEqual(info2.repo, 'spring-boot-realworld-example-app');

    assert.throws(() => parseGitHubUrl('not-a-valid-url'));
  });
});

describe('Code Parser & Semantic Chunking Tests', () => {
  test('should parse Java class, annotations, and methods with accurate line numbers', () => {
    const javaCode = `package com.example.loan.controllers;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    @GetMapping("/{id}")
    public String getLoan(@PathVariable String id) {
        return "loan-" + id;
    }

    @PostMapping("/apply")
    public String applyLoan(@RequestBody String data) {
        return "applied";
    }
}`;

    const chunks = CodeParser.parseFile('LoanController.java', javaCode, 'Java');
    assert.ok(chunks.length > 0);
    assert.strictEqual(chunks[0].filePath, 'LoanController.java');
    assert.strictEqual(chunks[0].language, 'Java');
    assert.strictEqual(chunks[0].startLine, 1);
    assert.ok(chunks[0].endLine >= 15);
  });

  test('should parse TypeScript functions and exports', () => {
    const tsCode = `export interface User {
  id: string;
  name: string;
}

export function getUser(id: string): User {
  return { id, name: "Alice" };
}

export const calculateTotal = (items: number[]) => {
  return items.reduce((a, b) => a + b, 0);
};`;

    const chunks = CodeParser.parseFile('user.ts', tsCode, 'TypeScript');
    assert.ok(chunks.length > 0);
    assert.strictEqual(chunks[0].filePath, 'user.ts');
    assert.strictEqual(chunks[0].language, 'TypeScript');
  });

  test('should parse Python classes and functions', () => {
    const pyCode = `class LoanService:
    def __init__(self, db):
        self.db = db

    def evaluate(self, score: int) -> bool:
        return score >= 680
`;

    const chunks = CodeParser.parseFile('service.py', pyCode, 'Python');
    assert.ok(chunks.length > 0);
    assert.strictEqual(chunks[0].language, 'Python');
  });

  test('should calculate statistics and detect technologies from files', () => {
    const mockFiles = [
      {
        filePath: 'pom.xml',
        fileName: 'pom.xml',
        extension: '.xml',
        language: 'XML',
        content: '<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>',
        lineCount: 1,
      },
      {
        filePath: 'src/main/java/App.java',
        fileName: 'App.java',
        extension: '.java',
        language: 'Java',
        content: '@RestController public class App { @GetMapping("/hello") public String hello() { return "hi"; } }',
        lineCount: 1,
      }
    ];

    const chunks = CodeParser.parseFile('src/main/java/App.java', mockFiles[1].content, 'Java');
    const stats = SummaryService.calculateStats(mockFiles, chunks);
    const techs = SummaryService.detectTechnologies(mockFiles);

    assert.strictEqual(stats.files, 2);
    assert.ok(stats.classes >= 1);
    assert.ok(stats.dependencies >= 1);
    assert.ok(techs.some((t) => t.name === 'Spring Boot' || t.name === 'Java'));
  });
});
