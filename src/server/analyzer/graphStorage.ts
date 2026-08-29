import { query, withTransaction } from '../db/client';
import { CodeSymbol, CodeRelationship, GraphData, GraphNode, GraphEdge } from './types';

export interface GraphQueryOptions {
  type?: string;
  confidence?: string;
  filePath?: string;
  limit?: number;
}

export class GraphStorage {
  /**
   * Validates symbols and relationships against strict repository isolation rules.
   */
  static validateGraphData(
    repositoryId: string,
    symbols: CodeSymbol[],
    relationships: CodeRelationship[]
  ): { validSymbols: CodeSymbol[]; validRelationships: CodeRelationship[] } {
    if (!repositoryId) {
      throw new Error('repositoryId is required for graph storage operations.');
    }

    // 1. Validate Symbols and enforce repository isolation
    const validSymbols = symbols.filter((s) => {
      if (!s.id || !s.repositoryId || s.repositoryId !== repositoryId) {
        console.warn(`[GraphStorage] Skipping symbol with invalid repository isolation: ${s.id}`);
        return false;
      }
      return true;
    });

    const symbolIdSet = new Set(validSymbols.map((s) => s.id));

    // 2. Validate Relationships and enforce repository isolation
    const validRelationships = relationships.filter((r) => {
      if (!r.id || !r.repositoryId || r.repositoryId !== repositoryId) {
        console.warn(`[GraphStorage] Skipping relationship with invalid repository isolation: ${r.id}`);
        return false;
      }
      if (!r.sourceSymbolId.startsWith(`${repositoryId}:`) || !r.targetSymbolId.startsWith(`${repositoryId}:`)) {
        console.warn(`[GraphStorage] Cross-repository relationship blocked: ${r.id}`);
        return false;
      }
      // Ensure target and source symbols are valid within this repository
      if (!symbolIdSet.has(r.sourceSymbolId) || !symbolIdSet.has(r.targetSymbolId)) {
        // Only keep high confidence relationships where both nodes exist
        return false;
      }
      return true;
    });

    return { validSymbols, validRelationships };
  }

  /**
   * Replaces graph data for a repository atomically inside a transaction.
   * Enforces strict repository isolation.
   */
  static async replaceGraphData(
    repositoryId: string,
    symbols: CodeSymbol[],
    relationships: CodeRelationship[]
  ): Promise<{ insertedSymbols: number; insertedRelationships: number }> {
    const { validSymbols, validRelationships } = this.validateGraphData(repositoryId, symbols, relationships);

    // Execute atomic replace inside transaction
    await withTransaction(async (client) => {
      // Step A: Delete existing relationships and symbols for this repository
      await client.query(`DELETE FROM code_relationships WHERE repository_id = $1`, [repositoryId]);
      await client.query(`DELETE FROM code_symbols WHERE repository_id = $1`, [repositoryId]);

      // Step B: Batch insert symbols
      const SYMBOL_BATCH_SIZE = 50;
      for (let i = 0; i < validSymbols.length; i += SYMBOL_BATCH_SIZE) {
        const batch = validSymbols.slice(i, i + SYMBOL_BATCH_SIZE);
        const values: any[] = [];
        const placeholders: string[] = [];

        batch.forEach((sym, idx) => {
          const baseIdx = idx * 8;
          placeholders.push(
            `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8})`
          );
          values.push(
            sym.id,
            repositoryId,
            sym.name,
            sym.type,
            sym.filePath,
            sym.startLine,
            sym.endLine,
            sym.exported
          );
        });

        if (placeholders.length > 0) {
          await client.query(
            `INSERT INTO code_symbols (id, repository_id, name, type, file_path, start_line, end_line, exported)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT (id) DO UPDATE
             SET name = EXCLUDED.name,
                 type = EXCLUDED.type,
                 file_path = EXCLUDED.file_path,
                 start_line = EXCLUDED.start_line,
                 end_line = EXCLUDED.end_line,
                 exported = EXCLUDED.exported`,
            values
          );
        }
      }

      // Step C: Batch insert relationships
      const REL_BATCH_SIZE = 50;
      for (let i = 0; i < validRelationships.length; i += REL_BATCH_SIZE) {
        const batch = validRelationships.slice(i, i + REL_BATCH_SIZE);
        const values: any[] = [];
        const placeholders: string[] = [];

        batch.forEach((rel, idx) => {
          const baseIdx = idx * 6;
          placeholders.push(
            `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6})`
          );
          values.push(
            rel.id,
            repositoryId,
            rel.sourceSymbolId,
            rel.targetSymbolId,
            rel.relationshipType,
            rel.confidence
          );
        });

        if (placeholders.length > 0) {
          await client.query(
            `INSERT INTO code_relationships (id, repository_id, source_symbol_id, target_symbol_id, relationship_type, confidence)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT (id) DO UPDATE
             SET relationship_type = EXCLUDED.relationship_type,
                 confidence = EXCLUDED.confidence`,
            values
          );
        }
      }
    });

    return {
      insertedSymbols: validSymbols.length,
      insertedRelationships: validRelationships.length,
    };
  }

  /**
   * Retrieves graph nodes and edges for a repository with strict repository isolation and optional filters.
   */
  static async getGraph(repositoryId: string, options: GraphQueryOptions = {}): Promise<GraphData> {
    if (!repositoryId) {
      throw new Error('repositoryId is required to query graph data.');
    }

    // Query symbols
    let symbolSql = `SELECT id, name, type, file_path AS "filePath", start_line AS "startLine", end_line AS "endLine", exported
                     FROM code_symbols
                     WHERE repository_id = $1`;
    const symbolParams: any[] = [repositoryId];

    if (options.type) {
      const types = options.type.split(',').map((t) => t.trim().toLowerCase());
      symbolSql += ` AND LOWER(type) = ANY($${symbolParams.length + 1})`;
      symbolParams.push(types);
    }

    if (options.filePath) {
      symbolSql += ` AND file_path = $${symbolParams.length + 1}`;
      symbolParams.push(options.filePath);
    }

    symbolSql += ` ORDER BY file_path ASC, start_line ASC`;

    if (options.limit && options.limit > 0) {
      symbolSql += ` LIMIT $${symbolParams.length + 1}`;
      symbolParams.push(options.limit);
    }

    const symbolsRes = await query<GraphNode>(symbolSql, symbolParams);
    const nodes = symbolsRes.rows;
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Query relationships
    let relSql = `SELECT id, source_symbol_id AS "source", target_symbol_id AS "target", relationship_type AS "type", confidence
                  FROM code_relationships
                  WHERE repository_id = $1`;
    const relParams: any[] = [repositoryId];

    if (options.confidence) {
      relSql += ` AND confidence = $${relParams.length + 1}`;
      relParams.push(options.confidence);
    }

    const relsRes = await query<GraphEdge>(relSql, relParams);
    // Filter edges to ensure both source and target exist in queried nodes if filtered
    const edges = relsRes.rows.filter((edge) => {
      // If no node filter was applied, include all edges; otherwise verify source and target exist
      return !options.type && !options.filePath ? true : nodeIds.has(edge.source) && nodeIds.has(edge.target);
    });

    return {
      nodes,
      edges,
      stats: {
        symbolCount: nodes.length,
        relationshipCount: edges.length,
      },
    };
  }
}
