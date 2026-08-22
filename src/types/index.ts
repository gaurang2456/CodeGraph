export type TabType = 'summary' | 'graph' | 'files' | 'analysis' | 'dashboard' | 'chat' | 'settings';

export interface FileCitation {
  filename: string;
  path: string;
  language: string;
  snippet?: string;
  lineRange?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: FileCitation[];
  confidenceScore?: number; // e.g. 0.96 for 96%
  isStreaming?: boolean;
  implementationPlan?: {
    step: number;
    title: string;
    targetFile: string;
  }[];
}

export interface Technology {
  name: string;
  category: 'language' | 'framework' | 'database' | 'caching' | 'auth' | 'build' | 'container';
  icon?: string;
  color?: string;
}

export interface RepositoryStats {
  classes: number;
  packages: number;
  files: number;
  endpoints: number;
  dependencies: number;
  functions: number;
}

export interface RepositorySummary {
  projectType: string;
  architecture: string;
  backend: string;
  frontend: string;
  authentication: string;
  database: string;
  caching: string;
  buildTool: string;
  description: string;
  keyPackages: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  category: 'controller' | 'service' | 'repository' | 'database';
  icon: string;
  x: number;
  y: number;
  file?: string;
  details: string;
  methods?: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'calls' | 'uses' | 'accesses' | 'queries';
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  isOpen?: boolean;
  children?: FileTreeNode[];
  content?: string;
  language?: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url?: string;
  size: string;
  primaryLanguage: string;
  framework: string;
  fileCount: number;
  folderCount: number;
  estimatedTokens: number;
  branch: string;
  commitCount: number;
  status: 'indexed' | 'indexing' | 'error';
  lastIndexedAt: string;
  stats?: RepositoryStats;
  technologies: Technology[];
  summary: RepositorySummary;
  sampleQuestions: string[];
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  fileTree?: FileTreeNode;
}

export type IndexingStage =
  | 'uploading'
  | 'extracting'
  | 'reading'
  | 'chunking'
  | 'embeddings'
  | 'saving'
  | 'completed';

export interface IndexingStepStatus {
  id: IndexingStage;
  label: string;
  detail: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
}
