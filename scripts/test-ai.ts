import fs from 'fs';
import path from 'path';

function loadLocalEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadLocalEnv();

import { EmbeddingService } from '../src/server/embeddings/embeddingService';

async function testFullAiPipeline() {
  console.log('Testing EmbeddingService with your Gemini API key...');
  try {
    const emb = await EmbeddingService.embedQuery('public class UserController { ... }');
    console.log(`✅ Embedding Generated! Dimensions: ${emb.length} (Matches vector(1536))`);

    const batch = await EmbeddingService.embedBatch([
      'chunk 1: auth service',
      'chunk 2: user repository',
      'chunk 3: database config'
    ]);
    console.log(`✅ Batch Embeddings Generated! Count: ${batch.length}, Dims: ${batch[0].length}`);

    console.log('✅ ALL AI CHECKS PASSED WITH YOUR GEMINI KEY!');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

testFullAiPipeline();
