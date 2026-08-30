import OpenAI from 'openai';
import { query } from '../db/client';
import { RagService } from '../rag/ragService';
import { FeaturePlanData, FeaturePlanRecord } from '@/types';

export class FeaturePlannerService {
  /**
   * Generates a repository-aware AI implementation plan for a requested feature.
   */
  static async generatePlan(
    repositoryId: string,
    featureRequest: string,
    userId?: string
  ): Promise<FeaturePlanRecord> {
    if (!featureRequest || !featureRequest.trim()) {
      throw new Error('Feature request description is required.');
    }

    // 1. Fetch repository metadata
    const repoRes = await query(
      `SELECT id, name, framework, primary_language, technologies, summary
       FROM repositories
       WHERE id = $1`,
      [repositoryId]
    );

    if (repoRes.rows.length === 0) {
      throw new Error('Repository not found.');
    }

    const repo = repoRes.rows[0];

    // 2. Perform RAG retrieval for relevant code chunks
    const chunks = await RagService.retrieveRelevantChunks(repositoryId, featureRequest, 10);
    const chunkFilePaths = Array.from(new Set(chunks.map((c) => c.filePath)));

    // 3. Retrieve matching AST symbols for the relevant files
    let symbolsRes = { rows: [] as any[] };
    if (chunkFilePaths.length > 0) {
      symbolsRes = await query(
        `SELECT name, type, file_path, start_line, end_line
         FROM code_symbols
         WHERE repository_id = $1 AND file_path = ANY($2)
         ORDER BY start_line ASC
         LIMIT 40`,
        [repositoryId, chunkFilePaths]
      );
    } else {
      // Fallback: Fetch top high-level symbols in the repository
      symbolsRes = await query(
        `SELECT name, type, file_path, start_line, end_line
         FROM code_symbols
         WHERE repository_id = $1 AND type IN ('class', 'interface', 'controller', 'service')
         LIMIT 30`,
        [repositoryId]
      );
    }

    const symbols = symbolsRes.rows;

    // 4. Retrieve AST relationships
    const relationshipsRes = await query(
      `SELECT source_symbol_id, target_symbol_id, relationship_type
       FROM code_relationships
       WHERE repository_id = $1
       LIMIT 50`,
      [repositoryId]
    );

    const relationships = relationshipsRes.rows;

    // 5. Build context representation for the LLM
    const contextBlocks = chunks
      .map(
        (c, idx) =>
          `[Source Chunk ${idx + 1}]:\nFile: ${c.filePath} (lines ${c.startLine}-${c.endLine})\nLanguage: ${c.language}\nSymbol: ${c.symbolName || 'N/A'}\n\`\`\`\n${c.content}\n\`\`\``
      )
      .join('\n\n');

    const symbolsBlock = symbols
      .map((s) => `- ${s.type.toUpperCase()}: ${s.name} (File: ${s.file_path}, lines ${s.start_line}-${s.end_line})`)
      .join('\n');

    const relationshipsBlock = relationships
      .map((r) => {
        const src = r.source_symbol_id.split(':').pop();
        const tgt = r.target_symbol_id.split(':').pop();
        return `- ${src} --[${r.relationship_type}]--> ${tgt}`;
      })
      .join('\n');

    const techSummary = Array.isArray(repo.technologies)
      ? repo.technologies.map((t: any) => t.name).join(', ')
      : repo.framework || repo.primary_language || 'Standard';

    // 6. Build the prompt
    const prompt = `You are CodeGraph AI Feature Planner, a principal software architect.
Analyze the actual indexed repository context and generate a repository-grounded feature implementation plan.

--- REPOSITORY INFORMATION ---
Project Name: ${repo.name}
Framework: ${repo.framework || 'Detected from codebase'}
Primary Language: ${repo.primary_language}
Detected Tech Stack: ${techSummary}

--- RELEVANT EXISTING CODE CHUNKS ---
${contextBlocks || 'No direct code chunks found; use repository architecture and symbols.'}

--- EXISTING AST SYMBOLS ---
${symbolsBlock || 'No AST symbols extracted.'}

--- EXISTING CODE RELATIONSHIPS ---
${relationshipsBlock || 'No direct code relationships extracted.'}

--- USER FEATURE REQUEST ---
${featureRequest}

--- CRITICAL RULES ---
1. Base your plan STRICTLY on the actual repository architecture, files, and symbols shown above.
2. DO NOT hallucinate files or classes that do not exist.
3. Clearly distinguish between existing files to MODIFY and NEW files to CREATE.
4. If recommending dependencies, only list NEW dependencies needed (not already present in package.json/stack).
5. If database changes are needed, adapt to the project's actual database/ORM (e.g. Prisma, TypeORM, PostgreSQL SQL, etc.), or state "No database changes required."
6. Return ONLY a valid JSON object strictly matching this schema:

{
  "overview": "Clear explanation of how the feature integrates into the existing architecture",
  "relevantArchitecture": [
    {
      "symbol": "AuthService",
      "filePath": "src/services/auth.ts",
      "reason": "Handles authentication lifecycle"
    }
  ],
  "filesToModify": [
    {
      "filePath": "src/services/auth.ts",
      "symbols": ["AuthService"],
      "reason": "Extend login to support OAuth tokens",
      "existingReference": "lines 24-40 in AuthService"
    }
  ],
  "filesToCreate": [
    {
      "filePath": "src/auth/googleStrategy.ts",
      "purpose": "Implements Google OAuth token exchange"
    }
  ],
  "dependencies": [
    {
      "name": "package-name",
      "reason": "Why this package is needed"
    }
  ],
  "databaseChanges": [
    "Add google_id varchar column to users table"
  ],
  "apiChanges": [
    {
      "endpoint": "POST /api/auth/google",
      "type": "NEW ENDPOINT",
      "description": "Receives authorization code from Google"
    }
  ],
  "implementationSteps": [
    {
      "step": 1,
      "title": "Install dependencies",
      "description": "Run package manager to install required libraries",
      "files": ["package.json"],
      "symbols": []
    }
  ],
  "potentialSideEffects": [
    "Existing session token refresh must handle users without passwords"
  ],
  "evidence": {
    "files": ["src/services/auth.ts"],
    "symbols": ["AuthService"],
    "chunkCount": ${chunks.length}
  }
}`;

    // 7. Execute LLM Query
    let planData: FeaturePlanData = await this.queryLlmForJson(prompt, chunks, symbols);

    // 8. Validate and sanitize planData
    planData = this.validateAndSanitizePlan(planData, chunks, symbols);

    // 9. Store in database
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await query(
      `INSERT INTO feature_plans (id, repository_id, user_id, feature_request, plan_json, status)
       VALUES ($1, $2, $3, $4, $5, 'COMPLETED')`,
      [planId, repositoryId, userId || null, featureRequest.trim(), JSON.stringify(planData)]
    );

    return {
      id: planId,
      repositoryId,
      userId,
      featureRequest: featureRequest.trim(),
      planJson: planData,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves all feature plans for a repository.
   */
  static async getPlansForRepository(
    repositoryId: string,
    userId?: string
  ): Promise<FeaturePlanRecord[]> {
    let sql = `
      SELECT id, repository_id, user_id, feature_request, plan_json, status, created_at, updated_at
      FROM feature_plans
      WHERE repository_id = $1
    `;
    const params: any[] = [repositoryId];

    if (userId) {
      sql += ` AND (user_id = $2 OR user_id IS NULL)`;
      params.push(userId);
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const res = await query(sql, params);

    return res.rows.map((row) => ({
      id: row.id,
      repositoryId: row.repository_id,
      userId: row.user_id,
      featureRequest: row.feature_request,
      planJson: typeof row.plan_json === 'string' ? JSON.parse(row.plan_json) : row.plan_json,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Retrieves a single feature plan by ID.
   */
  static async getPlanById(planId: string): Promise<FeaturePlanRecord | null> {
    const res = await query(
      `SELECT id, repository_id, user_id, feature_request, plan_json, status, created_at, updated_at
       FROM feature_plans
       WHERE id = $1`,
      [planId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      repositoryId: row.repository_id,
      userId: row.user_id,
      featureRequest: row.feature_request,
      planJson: typeof row.plan_json === 'string' ? JSON.parse(row.plan_json) : row.plan_json,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Queries Gemini or OpenAI to get a structured JSON object.
   */
  private static async queryLlmForJson(
    prompt: string,
    chunks: any[],
    symbols: any[]
  ): Promise<FeaturePlanData> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const isGemini =
      (geminiKey && !geminiKey.startsWith('sk-')) ||
      (openaiKey && (openaiKey.startsWith('AIzaSy') || openaiKey.startsWith('AQ.')));
    const key = geminiKey || openaiKey || '';

    let rawJsonText = '';

    if (isGemini) {
      const preferredModel = process.env.LLM_MODEL || 'gemini-3.6-flash';
      const models = Array.from(
        new Set([
          preferredModel,
          'gemini-3.6-flash',
          'gemini-3.7-flash',
          'gemini-flash-latest',
          'gemini-3.5-flash',
        ])
      );

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
            signal: AbortSignal.timeout(25000),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              rawJsonText = text;
              break;
            }
          }
        } catch (_) {}
      }
    } else if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: key });
        const completion = await openai.chat.completions.create({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are CodeGraph AI Feature Planner. Respond ONLY with the requested JSON schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
        rawJsonText = completion.choices[0]?.message?.content || '';
      } catch (e) {
        console.error('[FeaturePlanner] OpenAI error:', e);
      }
    }

    if (rawJsonText) {
      try {
        // Strip markdown code fences if present
        const cleaned = rawJsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        return JSON.parse(cleaned);
      } catch (err) {
        console.warn('[FeaturePlanner] JSON parse error, building fallback plan:', err);
      }
    }

    // Fallback if LLM call failed or produced malformed JSON
    return this.buildFallbackPlan(chunks, symbols);
  }

  /**
   * Validates and sanitizes plan JSON against schema requirements.
   */
  static validateAndSanitizePlan(
    data: any,
    chunks: any[] = [],
    symbols: any[] = []
  ): FeaturePlanData {
    const defaultEvidenceFiles = Array.from(new Set(chunks.map((c) => c.filePath))).slice(0, 10);
    const defaultEvidenceSymbols = Array.from(new Set(symbols.map((s) => s.name))).slice(0, 10);

    return {
      overview: typeof data?.overview === 'string' ? data.overview : 'Feature plan generated from codebase analysis.',
      relevantArchitecture: Array.isArray(data?.relevantArchitecture)
        ? data.relevantArchitecture.map((item: any) => ({
            symbol: item.symbol || 'Component',
            filePath: item.filePath || '',
            reason: item.reason || 'Core component involved in the feature flow.',
          }))
        : [],
      filesToModify: Array.isArray(data?.filesToModify)
        ? data.filesToModify.map((item: any) => ({
            filePath: item.filePath || '',
            symbols: Array.isArray(item.symbols) ? item.symbols : [],
            reason: item.reason || 'File requires modification to support feature logic.',
            existingReference: item.existingReference || undefined,
          }))
        : [],
      filesToCreate: Array.isArray(data?.filesToCreate)
        ? data.filesToCreate.map((item: any) => ({
            filePath: item.filePath || '',
            purpose: item.purpose || 'New file to encapsulate feature functionality.',
          }))
        : [],
      dependencies: Array.isArray(data?.dependencies)
        ? data.dependencies.map((item: any) => ({
            name: item.name || '',
            reason: item.reason || '',
          }))
        : [],
      databaseChanges: Array.isArray(data?.databaseChanges)
        ? data.databaseChanges.map((d: any) => (typeof d === 'string' ? d : d?.description || String(d)))
        : [],
      apiChanges: Array.isArray(data?.apiChanges)
        ? data.apiChanges.map((item: any) => ({
            endpoint: item.endpoint || '',
            type: item.type || 'NEW ENDPOINT',
            description: item.description || '',
          }))
        : [],
      implementationSteps: Array.isArray(data?.implementationSteps)
        ? data.implementationSteps.map((step: any, idx: number) => ({
            step: typeof step.step === 'number' ? step.step : idx + 1,
            title: step.title || `Step ${idx + 1}`,
            description: step.description || '',
            files: Array.isArray(step.files) ? step.files : [],
            symbols: Array.isArray(step.symbols) ? step.symbols : [],
          }))
        : [],
      potentialSideEffects: Array.isArray(data?.potentialSideEffects)
        ? data.potentialSideEffects.map((s: any) => (typeof s === 'string' ? s : String(s)))
        : [],
      evidence: {
        files: Array.isArray(data?.evidence?.files) && data.evidence.files.length > 0
          ? data.evidence.files
          : defaultEvidenceFiles,
        symbols: Array.isArray(data?.evidence?.symbols) && data.evidence.symbols.length > 0
          ? data.evidence.symbols
          : defaultEvidenceSymbols,
        chunkCount: typeof data?.evidence?.chunkCount === 'number' ? data.evidence.chunkCount : chunks.length,
      },
    };
  }

  /**
   * Deterministic fallback plan if LLM is unreachable.
   */
  private static buildFallbackPlan(chunks: any[], symbols: any[]): FeaturePlanData {
    const evidenceFiles = Array.from(new Set(chunks.map((c) => c.filePath))).slice(0, 8);
    const evidenceSymbols = Array.from(new Set(symbols.map((s) => s.name))).slice(0, 8);

    return {
      overview: 'Feature plan derived from repository source analysis and AST relationships.',
      relevantArchitecture: evidenceSymbols.map((sym, idx) => ({
        symbol: sym,
        filePath: evidenceFiles[idx] || evidenceFiles[0] || 'src/',
        reason: 'Component participates in core application workflow.',
      })),
      filesToModify: evidenceFiles.slice(0, 3).map((f) => ({
        filePath: f,
        symbols: evidenceSymbols.slice(0, 2),
        reason: 'Extend existing service logic and wire up feature handlers.',
      })),
      filesToCreate: [
        {
          filePath: 'src/features/newFeatureHandler.ts',
          purpose: 'Encapsulates the new feature implementation and logic.',
        },
      ],
      dependencies: [],
      databaseChanges: ['Review schema migrations if persistent state is required.'],
      apiChanges: [
        {
          endpoint: 'POST /api/feature',
          type: 'NEW ENDPOINT',
          description: 'Entry point handler for the new feature functionality.',
        },
      ],
      implementationSteps: [
        {
          step: 1,
          title: 'Review existing architecture',
          description: 'Inspect existing service methods and contracts before extending functionality.',
          files: evidenceFiles.slice(0, 2),
          symbols: evidenceSymbols.slice(0, 2),
        },
        {
          step: 2,
          title: 'Implement new service handler',
          description: 'Create dedicated module to encapsulate feature logic.',
          files: ['src/features/newFeatureHandler.ts'],
          symbols: [],
        },
        {
          step: 3,
          title: 'Expose API endpoint',
          description: 'Add route or controller handler with appropriate authorization guards.',
          files: evidenceFiles.slice(0, 1),
          symbols: [],
        },
        {
          step: 4,
          title: 'Verify and test integration',
          description: 'Run unit and integration tests to verify behavior and ensure zero regressions.',
          files: [],
          symbols: [],
        },
      ],
      potentialSideEffects: [
        'Ensure existing routes and authorization policies continue to function without disruption.',
      ],
      evidence: {
        files: evidenceFiles,
        symbols: evidenceSymbols,
        chunkCount: chunks.length,
      },
    };
  }
}
