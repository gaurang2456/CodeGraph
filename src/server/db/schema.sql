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
  user_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);

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

-- Code Chunks table with vector embeddings
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

-- Code Symbols table (Phase 2 AST Engine)
CREATE TABLE IF NOT EXISTS code_symbols (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  exported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_symbols_repo_id ON code_symbols(repository_id);
CREATE INDEX IF NOT EXISTS idx_code_symbols_file ON code_symbols(repository_id, file_path);
CREATE INDEX IF NOT EXISTS idx_code_symbols_name ON code_symbols(repository_id, name);

-- Code Relationships table (Phase 2 AST Engine)
CREATE TABLE IF NOT EXISTS code_relationships (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  source_symbol_id TEXT NOT NULL,
  target_symbol_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'high',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_relationships_repo ON code_relationships(repository_id);
CREATE INDEX IF NOT EXISTS idx_code_relationships_source ON code_relationships(repository_id, source_symbol_id);
CREATE INDEX IF NOT EXISTS idx_code_relationships_target ON code_relationships(repository_id, target_symbol_id);

-- Feature Plans table (AI Feature Planner)
CREATE TABLE IF NOT EXISTS feature_plans (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id UUID,
  feature_request TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_plans_repo_id ON feature_plans(repository_id);
CREATE INDEX IF NOT EXISTS idx_feature_plans_user_id ON feature_plans(user_id);

-- Generated Changesets table (Phase 3 Code Change Generation)
CREATE TABLE IF NOT EXISTS generated_changesets (
  id TEXT PRIMARY KEY,
  feature_plan_id TEXT NOT NULL REFERENCES feature_plans(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  parent_changeset_id TEXT REFERENCES generated_changesets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ready', -- 'generating' | 'ready' | 'approved' | 'rejected'
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changesets_plan_id ON generated_changesets(feature_plan_id);
CREATE INDEX IF NOT EXISTS idx_changesets_repo_id ON generated_changesets(repository_id);
CREATE INDEX IF NOT EXISTS idx_changesets_user_id ON generated_changesets(user_id);
CREATE INDEX IF NOT EXISTS idx_changesets_version ON generated_changesets(feature_plan_id, version DESC);

-- Generated File Changes table
CREATE TABLE IF NOT EXISTS generated_file_changes (
  id TEXT PRIMARY KEY,
  changeset_id TEXT NOT NULL REFERENCES generated_changesets(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'modify' | 'create' | 'delete'
  reason TEXT NOT NULL,
  original_content TEXT,
  proposed_content TEXT NOT NULL,
  affected_symbols JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_changes_changeset_id ON generated_file_changes(changeset_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_path ON generated_file_changes(changeset_id, file_path);

