export type SymbolType =
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'constructor'
  | 'enum'
  | 'variable';

export type RelationshipType =
  | 'IMPORTS'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'USES'
  | 'INJECTS'
  | 'CALLS';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CodeSymbol {
  id: string; // Stable: `${repositoryId}:${filePath}:${symbolPath}`
  repositoryId: string;
  name: string;
  type: SymbolType;
  filePath: string;
  startLine: number;
  endLine: number;
  exported: boolean;
}

export interface CodeRelationship {
  id: string; // Stable: `${repositoryId}:${sourceSymbolId}:${relationshipType}:${targetSymbolId}`
  repositoryId: string;
  sourceSymbolId: string;
  targetSymbolId: string;
  relationshipType: RelationshipType;
  confidence: ConfidenceLevel;
}

export interface AnalysisError {
  filePath: string;
  message: string;
  stack?: string;
}

export interface AnalysisResult {
  symbols: CodeSymbol[];
  relationships: CodeRelationship[];
  errors: AnalysisError[];
}

export interface RepositoryFile {
  filePath: string;
  content: string;
  language?: string;
}

export interface CodeAnalyzer {
  name: string;
  supports(filePath: string): boolean;
  analyze(repositoryId: string, files: RepositoryFile[]): Promise<AnalysisResult>;
}

export interface GraphNode {
  id: string;
  name: string;
  type: SymbolType;
  filePath: string;
  startLine: number;
  endLine: number;
  exported: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  confidence: ConfidenceLevel;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    symbolCount: number;
    relationshipCount: number;
  };
}
