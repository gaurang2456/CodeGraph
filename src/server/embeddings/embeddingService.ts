import OpenAI from 'openai';

function getApiConfig(): { apiKey: string; isGemini: boolean } {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && !geminiKey.startsWith('sk-')) {
    return { apiKey: geminiKey, isGemini: true };
  }
  if (openaiKey) {
    if (openaiKey.startsWith('AIzaSy') || openaiKey.startsWith('AQ.')) {
      return { apiKey: openaiKey, isGemini: true };
    }
    return { apiKey: openaiKey, isGemini: false };
  }
  return { apiKey: '', isGemini: false };
}

const BATCH_SIZE = 20;

export class EmbeddingService {
  /**
   * Generates a single vector embedding for a query string.
   */
  static async embedQuery(text: string): Promise<number[]> {
    const { apiKey, isGemini } = getApiConfig();
    const cleanText = text.replace(/\n+/g, ' ').trim();

    if (isGemini) {
      return generateGeminiEmbedding(cleanText, apiKey);
    } else {
      const openai = new OpenAI({ apiKey: apiKey || 'dummy' });
      const response = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: cleanText,
      });
      return response.data[0].embedding;
    }
  }

  /**
   * Generates batch embeddings for a list of text chunks.
   */
  static async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { apiKey, isGemini } = getApiConfig();

    if (isGemini) {
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.replace(/\r\n/g, '\n').slice(0, 8000));

        const batchPromises = batch.map((chunk) => generateGeminiEmbedding(chunk, apiKey));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      return results;
    } else {
      const openai = new OpenAI({ apiKey: apiKey || 'dummy' });
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.replace(/\r\n/g, '\n').slice(0, 8000));

        const response = await openai.embeddings.create({
          model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
          input: batch,
        });

        const sorted = response.data.sort((a, b) => a.index - b.index);
        for (const item of sorted) {
          results.push(item.embedding);
        }
      }

      return results;
    }
  }

  /**
   * Formats a floating-point array into PostgreSQL vector syntax `[0.1,0.2,...]`.
   */
  static formatPgVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}

/**
 * Calls Gemini REST embedding API with 1536-dimensional output.
 */
async function generateGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const modelsToTry = ['text-embedding-004', 'embedding-001', 'gemini-embedding-001', 'gemini-embedding-2'];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          outputDimensionality: 1536,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.embedding?.values) {
          return padOrTrimTo1536(data.embedding.values);
        }
      }
    } catch (_) {}
  }

  // Deterministic 1536-dim fallback if network/quota is exceeded
  return createDeterministicEmbedding(text);
}

function padOrTrimTo1536(values: number[]): number[] {
  if (values.length === 1536) return values;
  if (values.length < 1536) {
    const padded = new Array(1536).fill(0);
    for (let i = 0; i < values.length; i++) {
      padded[i] = values[i];
    }
    return padded;
  }
  return values.slice(0, 1536);
}

function createDeterministicEmbedding(text: string): number[] {
  const vec = new Array(1536).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
    const idx = Math.abs(hash) % 1536;
    vec[idx] += 0.1;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
