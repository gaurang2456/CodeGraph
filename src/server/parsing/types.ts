export interface ParsedChunk {
  content: string;
  startLine: number;
  endLine: number;
  language: string;
  symbolName?: string;
  symbolType?: 'class' | 'interface' | 'method' | 'function' | 'controller' | 'service' | 'repository' | 'config' | 'block' | 'document';
  filePath: string;
}
