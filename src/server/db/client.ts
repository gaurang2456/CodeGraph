import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not defined. Please set your Supabase PostgreSQL connection string in .env.local'
      );
    }

    const isSupabaseOrCloud =
      connectionString.includes('supabase.co') ||
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('sslmode=require') ||
      process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString,
      ssl: isSupabaseOrCloud ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

/**
 * Execute a query on the pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getDbPool();
  return p.query<T>(text, params);
}

/**
 * Acquire a client from the pool with automatic transaction release helper.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getDbPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

let isSchemaInitialized = false;

/**
 * Ensure pgvector extension and all tables are initialized.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isSchemaInitialized) return;

  try {
    const schemaSql = `
      -- Enable pgvector extension
      CREATE EXTENSION IF NOT EXISTS vector;

      -- Repositories table
      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        github_url TEXT,
        branch TEXT DEFAULT 'main',
        status TEXT NOT NULL DEFAULT 'PENDING',
        stage TEXT DEFAULT 'Pending',
        progress INTEGER DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        folder_count INTEGER DEFAULT 0,
        line_count INTEGER DEFAULT 0,
        token_count INTEGER DEFAULT 0,
        primary_language TEXT,
        framework TEXT,
        technologies JSONB DEFAULT '[]'::jsonb,
        summary JSONB,
        stats JSONB,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Repository Files table
      CREATE TABLE IF NOT EXISTS repository_files (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        extension TEXT NOT NULL,
        language TEXT NOT NULL,
        line_count INTEGER NOT NULL DEFAULT 0,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_repo_files_repo_id ON repository_files(repository_id);
      CREATE INDEX IF NOT EXISTS idx_repo_files_path ON repository_files(repository_id, file_path);

      -- Code Chunks table with vector embeddings (1536 dimensions)
      CREATE TABLE IF NOT EXISTS code_chunks (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        file_id TEXT NOT NULL REFERENCES repository_files(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        language TEXT NOT NULL,
        symbol_name TEXT,
        symbol_type TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_code_chunks_repo_id ON code_chunks(repository_id);

      -- Chat Messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        citations JSONB DEFAULT '[]'::jsonb,
        confidence_score REAL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_repo_id ON chat_messages(repository_id, created_at ASC);
    `;

    await query(schemaSql);
    isSchemaInitialized = true;
    console.log('✅ Supabase PostgreSQL + pgvector schema verified and ready.');
  } catch (err) {
    console.error('⚠️ Could not initialize database schema automatically:', err);
    throw err;
  }
}
