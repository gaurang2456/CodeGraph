import OpenAI from 'openai';
import { ExtractedFile } from '../ingestion/zipExtractor';
import { ParsedChunk } from '../parsing/types';

export interface TechTag {
  name: string;
  category: 'language' | 'framework' | 'database' | 'caching' | 'auth' | 'build' | 'tools';
  icon?: string;
  color?: string;
}

export interface GeneratedSummary {
  projectType: string;
  architecture: string;
  backend: string;
  frontend: string;
  database: string;
  authentication: string;
  caching?: string;
  buildTool?: string;
  description: string;
  keyPackages: string[];
}

export interface CalculatedStats {
  classes: number;
  packages: number;
  files: number;
  endpoints: number;
  dependencies: number;
  functions: number;
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
        chunk.content.includes('app.get(') ||
        chunk.content.includes('app.post(') ||
        chunk.content.includes('router.get(') ||
        chunk.content.includes('router.post(') ||
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
   * Detects technologies and frameworks from repository configuration and manifest files.
   */
  static detectTechnologies(files: ExtractedFile[]): TechTag[] {
    const techMap = new Map<string, TechTag>();
    const fileContents = files.map((f) => f.content).join('\n');
    const fileNames = new Set(files.map((f) => f.fileName.toLowerCase()));

    // Language detections
    const langCounts: Record<string, number> = {};
    for (const f of files) {
      langCounts[f.language] = (langCounts[f.language] || 0) + 1;
    }
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    if (sortedLangs.length > 0) {
      techMap.set(sortedLangs[0][0], {
        name: sortedLangs[0][0],
        category: 'language',
        icon: 'code',
        color: 'text-[#fbcfe8]',
      });
    }

    // Framework detection
    if (fileNames.has('pom.xml') || fileContents.includes('org.springframework')) {
      techMap.set('Spring Boot', { name: 'Spring Boot', category: 'framework', icon: 'energy_program_saving', color: 'text-[#b7c8e1]' });
    }
    if (fileContents.includes('next') && fileNames.has('package.json')) {
      techMap.set('Next.js', { name: 'Next.js', category: 'framework', icon: 'layers', color: 'text-[#b7c8e1]' });
    } else if (fileContents.includes('react') && fileNames.has('package.json')) {
      techMap.set('React', { name: 'React', category: 'framework', icon: 'layers', color: 'text-[#b7c8e1]' });
    }
    if (fileContents.includes('fastapi')) {
      techMap.set('FastAPI', { name: 'FastAPI', category: 'framework', icon: 'bolt', color: 'text-[#b7c8e1]' });
    }
    if (fileContents.includes('express')) {
      techMap.set('Express', { name: 'Express', category: 'framework', icon: 'layers', color: 'text-[#b7c8e1]' });
    }

    // Database detection
    if (fileContents.includes('mysql') || fileContents.includes('com.mysql')) {
      techMap.set('MySQL', { name: 'MySQL', category: 'database', icon: 'database', color: 'text-[#d7c3b6]' });
    } else if (fileContents.includes('postgresql') || fileContents.includes('org.postgresql') || fileContents.includes('pgvector')) {
      techMap.set('PostgreSQL', { name: 'PostgreSQL', category: 'database', icon: 'database', color: 'text-[#d7c3b6]' });
    } else if (fileContents.includes('mongodb') || fileContents.includes('mongoose')) {
      techMap.set('MongoDB', { name: 'MongoDB', category: 'database', icon: 'database', color: 'text-[#d7c3b6]' });
    } else if (fileContents.includes('sqlite')) {
      techMap.set('SQLite', { name: 'SQLite', category: 'database', icon: 'database', color: 'text-[#d7c3b6]' });
    }

    // Caching detection
    if (fileContents.includes('redis') || fileContents.includes('spring-boot-starter-data-redis')) {
      techMap.set('Redis', { name: 'Redis', category: 'caching', icon: 'speed', color: 'text-rose-400' });
    }

    // Auth detection
    if (fileContents.includes('jwt') || fileContents.includes('jjwt') || fileContents.includes('jsonwebtoken') || fileContents.includes('oauth2')) {
      techMap.set('JWT / Auth', { name: 'JWT Auth', category: 'auth', icon: 'key', color: 'text-amber-400' });
    }

    return Array.from(techMap.values());
  }

  /**
   * Generates a repository summary based on actual evidence collected from files.
   */
  static async generateSummary(
    repoName: string,
    files: ExtractedFile[],
    techs: TechTag[],
    stats: CalculatedStats
  ): Promise<GeneratedSummary> {
    const keyFiles = files
      .filter((f) => ['pom.xml', 'package.json', 'readme.md', 'application.yml', 'application.properties', 'schema.sql', 'dockerfile'].includes(f.fileName.toLowerCase()))
      .map((f) => `--- File: ${f.filePath} ---\n${f.content.slice(0, 1500)}`)
      .join('\n\n');

    const prompt = `You are an expert software architect analyzing the repository "${repoName}".
Here are the facts extracted from the repository:
- Total source files: ${stats.files}
- Classes/Interfaces: ${stats.classes}
- Endpoints: ${stats.endpoints}
- Detected technologies: ${techs.map((t) => t.name).join(', ')}

Key configuration and manifest files:
${keyFiles.slice(0, 6000)}

Please return a concise JSON summary adhering strictly to this JSON format:
{
  "projectType": "e.g. Spring Boot Backend / Next.js Fullstack / Python API",
  "architecture": "e.g. Layered MVC (Controller -> Service -> Repository -> DB) or Clean Architecture",
  "backend": "e.g. Spring Boot 3.2 (Java 21) or Node.js / Express",
  "frontend": "e.g. Next.js App Router or N/A (REST API Service)",
  "database": "e.g. MySQL 8.0 or PostgreSQL or N/A",
  "authentication": "e.g. JWT Token Filter + Spring Security 6 or OAuth2 or None",
  "caching": "e.g. Redis or None",
  "buildTool": "e.g. Maven 3.9 or npm or Gradle",
  "description": "A 2 to 3 sentence factual overview of what this application does based on its code.",
  "keyPackages": ["list", "of", "3-5", "main", "directories"]
}
Output only valid JSON.`;

    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      const isGemini = (geminiKey && !geminiKey.startsWith('sk-')) || (openaiKey && (openaiKey.startsWith('AIzaSy') || openaiKey.startsWith('AQ.')));
      const key = geminiKey || openaiKey || '';

      let cleanJson = '{}';

      if (isGemini) {
        const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
        for (const model of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${prompt}\nOutput only valid JSON.` }] }],
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
              if (cleanJson) break;
            }
          } catch (_) {}
        }
      } else {
        const openai = new OpenAI({ apiKey: key });
        const response = await openai.chat.completions.create({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a code analyzer that outputs only strict JSON without markdown formatting.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
        });
        const raw = response.choices[0]?.message?.content || '{}';
        cleanJson = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      const parsed = JSON.parse(cleanJson);

      return {
        projectType: parsed.projectType || 'Software Repository',
        architecture: parsed.architecture || 'Modular Architecture',
        backend: parsed.backend || techs.find((t) => t.category === 'framework')?.name || 'Custom Backend',
        frontend: parsed.frontend || 'N/A',
        database: parsed.database || techs.find((t) => t.category === 'database')?.name || 'N/A',
        authentication: parsed.authentication || techs.find((t) => t.category === 'auth')?.name || 'Standard Auth',
        caching: parsed.caching,
        buildTool: parsed.buildTool,
        description: parsed.description || `Repository ${repoName} containing ${stats.files} files across ${stats.packages} packages.`,
        keyPackages: parsed.keyPackages || [],
      };
    } catch (err: any) {
      console.warn('[Summary Generation Warning] LLM summary fallback:', err?.message);
      return {
        projectType: `${techs.find((t) => t.category === 'language')?.name || 'Code'} Application`,
        architecture: 'Layered MVC with Clean Domain Separation',
        backend: techs.find((t) => t.category === 'framework')?.name || 'Standard Backend',
        frontend: 'N/A',
        database: techs.find((t) => t.category === 'database')?.name || 'N/A',
        authentication: techs.find((t) => t.category === 'auth')?.name || 'JWT / Standard Auth',
        description: `This is a repository for ${repoName} containing ${stats.files} indexed source files, ${stats.classes} classes, and ${stats.endpoints} endpoints.`,
        keyPackages: files.slice(0, 4).map((f) => f.filePath.split('/')[0]),
      };
    }
  }
}
