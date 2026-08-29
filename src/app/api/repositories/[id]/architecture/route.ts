import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { SummaryService } from '@/server/summary/summaryService';
import { ExtractedFile } from '@/server/ingestion/zipExtractor';
import { ParsedChunk } from '@/server/parsing/types';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const { repository: repo } = await requireRepositoryAccess(id, req);

    // If already generated in summary, return it immediately
    if (repo.summary && repo.summary.architectureFlow && repo.summary.architectureFlow.nodes?.length > 0) {
      return NextResponse.json(repo.summary.architectureFlow);
    }

    // Otherwise, compute dynamically from indexed repository files and chunks
    const filesRes = await query(
      `SELECT file_path, file_name, extension, language, line_count, content
       FROM repository_files
       WHERE repository_id = $1
       ORDER BY line_count DESC`,
      [id]
    );

    const files: ExtractedFile[] = filesRes.rows.map((r: any) => ({
      filePath: r.file_path,
      fileName: r.file_name,
      extension: r.extension,
      language: r.language,
      lineCount: r.line_count,
      content: r.content || '',
    }));

    const chunksRes = await query(
      `SELECT file_path, content, start_line, end_line, language, symbol_name, symbol_type
       FROM code_chunks
       WHERE repository_id = $1`,
      [id]
    );

    const chunks: ParsedChunk[] = chunksRes.rows.map((r: any) => ({
      filePath: r.file_path,
      content: r.content,
      startLine: r.start_line,
      endLine: r.end_line,
      language: r.language,
      symbolName: r.symbol_name,
      symbolType: r.symbol_type,
    }));

    const frameworkInfo = SummaryService.detectFrameworkAndAdapter(files);
    const techs = SummaryService.detectTechnologies(files, frameworkInfo);
    const flow = SummaryService.generateArchitectureFlow(files, chunks, techs, frameworkInfo);

    // Cache to summary in background
    if (flow.nodes.length > 0) {
      const updatedSummary = {
        ...(repo.summary || {}),
        architectureFlow: flow,
      };
      await query(
        `UPDATE repositories
         SET summary = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [id, JSON.stringify(updatedSummary)]
      );
    }

    return NextResponse.json(flow);
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
