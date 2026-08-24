import fs from 'fs';
import path from 'path';

// Helper to load .env.local / .env file
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

import { ensureDatabaseSchema, query, getDbPool } from '../src/server/db/client';

async function verifySupabaseConnection() {
  console.log('🔄 Checking Supabase connection and pgvector extension...');

  try {
    // 1. Initialize schema
    await ensureDatabaseSchema();

    // 2. Verify pgvector extension
    const extRes = await query(`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`);
    if (extRes.rows.length === 0) {
      throw new Error('pgvector extension is not installed on this database.');
    }
    console.log(`✅ pgvector extension active (version: ${extRes.rows[0].extversion})`);

    // 3. Verify tables exist
    const tablesRes = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('repositories', 'repository_files', 'code_chunks', 'chat_messages')
    `);
    console.log(`✅ Verified ${tablesRes.rows.length}/4 tables: ${tablesRes.rows.map((r) => r.table_name).join(', ')}`);

    // 4. Test vector insertion and cosine similarity search
    const testRepoId = `test-repo-${Date.now()}`;
    const testFileId = `test-file-${Date.now()}`;
    const testChunkId = `test-chunk-${Date.now()}`;

    // Sample 1536-dimensional mock vector
    const testVector = new Array(1536).fill(0.01);
    const vectorStr = `[${testVector.join(',')}]`;

    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, status, stage, progress)
       VALUES ($1, 'supabase-test-repo', 'test/supabase-test-repo', 'zip', 'COMPLETED', 'Completed', 100)`,
      [testRepoId]
    );

    await query(
      `INSERT INTO repository_files (id, repository_id, file_path, file_name, extension, language, line_count, content)
       VALUES ($1, $2, 'src/Test.java', 'Test.java', '.java', 'Java', 5, 'public class Test {}')`,
      [testFileId, testRepoId]
    );

    await query(
      `INSERT INTO code_chunks (id, repository_id, file_id, file_path, content, embedding, start_line, end_line, language, symbol_name)
       VALUES ($1, $2, $3, 'src/Test.java', 'public class Test {}', $4::vector, 1, 5, 'Java', 'Test')`,
      [testChunkId, testRepoId, testFileId, vectorStr]
    );

    // Run similarity search
    const simRes = await query(
      `SELECT id, file_path, 1 - (embedding <=> $1::vector) AS similarity
       FROM code_chunks
       WHERE repository_id = $2
       ORDER BY embedding <=> $1::vector ASC
       LIMIT 1`,
      [vectorStr, testRepoId]
    );

    if (simRes.rows.length === 0 || simRes.rows[0].similarity < 0.99) {
      throw new Error('Vector similarity test failed.');
    }
    console.log(`✅ Vector similarity query passed with score: ${simRes.rows[0].similarity.toFixed(4)}`);

    // Clean up test record
    await query(`DELETE FROM repositories WHERE id = $1`, [testRepoId]);
    console.log('✅ Cleaned up test records. Supabase PostgreSQL + pgvector is fully operational!');
  } catch (err: any) {
    console.error('❌ Supabase verification error:', err.message);
    process.exit(1);
  } finally {
    try {
      const pool = getDbPool();
      await pool.end();
    } catch (_) {}
  }
}

verifySupabaseConnection().catch((err) => {
  console.error(err);
  process.exit(1);
});
