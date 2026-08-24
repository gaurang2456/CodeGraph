import OpenAI from 'openai';
import { query } from '../db/client';
import { EmbeddingService } from '../embeddings/embeddingService';

export interface RetrievedChunk {
  id: string;
  repositoryId: string;
  fileId: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
  symbolName: string | null;
  similarity: number;
}

export interface RagResponse {
  answer: string;
  citations: Array<{
    id: string;
    filename: string;
    path: string;
    lineRange: string;
    startLine: number;
    endLine: number;
    language: string;
    similarity: number;
    snippet: string;
  }>;
  confidenceScore: number;
  implementationPlan?: string[];
}

export class RagService {
  /**
   * Performs vector similarity retrieval against code_chunks strictly scoped to repository_id.
   */
  static async retrieveRelevantChunks(
    repositoryId: string,
    queryText: string,
    topK: number = 8
  ): Promise<RetrievedChunk[]> {
    const queryEmbedding = await EmbeddingService.embedQuery(queryText);
    const vectorStr = EmbeddingService.formatPgVector(queryEmbedding);

    const sql = `
      SELECT 
        id,
        repository_id,
        file_id,
        file_path,
        content,
        start_line,
        end_line,
        language,
        symbol_name,
        1 - (embedding <=> $1::vector) AS similarity
      FROM code_chunks
      WHERE repository_id = $2
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $3
    `;

    const result = await query(sql, [vectorStr, repositoryId, topK]);

    return result.rows.map((row) => ({
      id: row.id,
      repositoryId: row.repository_id,
      fileId: row.file_id,
      filePath: row.file_path,
      content: row.content,
      startLine: row.start_line,
      endLine: row.end_line,
      language: row.language,
      symbolName: row.symbol_name,
      similarity: Number(row.similarity),
    }));
  }

  /**
   * Answers a question about a repository using retrieved code chunks and generates real citations.
   */
  static async queryRepository(
    repositoryId: string,
    userQuery: string
  ): Promise<RagResponse> {
    const chunks = await this.retrieveRelevantChunks(repositoryId, userQuery, 6);

    if (chunks.length === 0) {
      return {
        answer: "I couldn't find any relevant indexed code chunks in this repository to answer your question.",
        citations: [],
        confidenceScore: 0.2,
      };
    }

    const contextBlocks = chunks
      .map(
        (chunk, idx) =>
          `[Source Chunk ${idx + 1}]:\nFile: ${chunk.filePath}\nLines: ${chunk.startLine}-${chunk.endLine}\nLanguage: ${chunk.language}\nSymbol: ${chunk.symbolName || 'N/A'}\n\`\`\`${chunk.language.toLowerCase()}\n${chunk.content}\n\`\`\``
      )
      .join('\n\n');

    const prompt = `You are CodeGraph AI, an expert codebase and architecture intelligence assistant.
Answer the following question about the indexed repository based ONLY on the provided verified code chunks.

--- RETRIEVED REPOSITORY CONTEXT ---
${contextBlocks}

--- USER QUESTION ---
${userQuery}

--- INSTRUCTIONS ---
1. Base your answer strictly on the provided code chunks above.
2. In your explanation, reference exact files and line ranges (e.g. \`src/main/java/... (lines 12-45)\`).
3. Explain the architecture, mechanics, annotations, or logic clearly with code references.
4. If asked for implementation steps or fixes, provide a numbered breakdown.
5. If the context does not contain enough information, explain what is available from the retrieved files honestly.`;

    let answerText = '';
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const isGemini = (geminiKey && !geminiKey.startsWith('sk-')) || (openaiKey && (openaiKey.startsWith('AIzaSy') || openaiKey.startsWith('AQ.')));
    const key = geminiKey || openaiKey || '';

    if (isGemini) {
      const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              answerText = text;
              break;
            }
          }
        } catch (_) {}
      }
    } else {
      const openai = new OpenAI({ apiKey: key });
      const completion = await openai.chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are CodeGraph AI, an expert codebase assistant. Answer accurately with verified citations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      });
      answerText = completion.choices[0]?.message?.content || 'Unable to generate response.';
    }

    if (!answerText) {
      answerText = `Based on retrieved chunks in \`${chunks[0]?.filePath}\`, this module contains definitions for ${chunks.map(c => c.symbolName || c.filePath).slice(0, 3).join(', ')}.`;
    }

    const citations = chunks.map((chunk) => {
      const filename = chunk.filePath.split('/').pop() || chunk.filePath;
      return {
        id: chunk.id,
        filename,
        path: chunk.filePath,
        lineRange: `L${chunk.startLine}-${chunk.endLine}`,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        language: chunk.language,
        similarity: Number(chunk.similarity.toFixed(4)),
        snippet: chunk.content,
      };
    });

    const avgConfidence =
      chunks.reduce((acc, c) => acc + c.similarity, 0) / (chunks.length || 1);

    return {
      answer: answerText,
      citations,
      confidenceScore: Math.min(Math.max(avgConfidence, 0.5), 0.99),
    };
  }

  /**
   * Alias for queryRepository
   */
  static async answerQuestion(repositoryId: string, userQuery: string): Promise<RagResponse> {
    return this.queryRepository(repositoryId, userQuery);
  }
}
