import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { SummaryService } from '@/server/summary/summaryService';
import { ExtractedFile } from '@/server/ingestion/zipExtractor';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const { repository: repo } = await requireRepositoryAccess(id, req);

    // Fetch key manifest & config files from repository_files
    const filesRes = await query(
      `SELECT file_path, file_name, extension, language, line_count, content
       FROM repository_files
       WHERE repository_id = $1
       ORDER BY line_count DESC
       LIMIT 100`,
      [id]
    );

    const files: ExtractedFile[] = filesRes.rows.map((r: any) => ({
      filePath: r.file_path,
      fileName: r.file_name,
      extension: r.extension,
      language: r.language,
      lineCount: r.line_count,
      content: r.content,
    }));

    const techs = SummaryService.detectTechnologies(files);
    const stats = SummaryService.calculateStats(files, []);

    const summary = await SummaryService.generateSummary(repo.name, files, techs, stats);

    await query(
      `UPDATE repositories
       SET summary = $2::jsonb,
           technologies = $3::jsonb,
           framework = $4,
           primary_language = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        JSON.stringify(summary),
        JSON.stringify(techs),
        techs.find((t) => t.category === 'framework')?.name || null,
        techs.find((t) => t.category === 'language')?.name || repo.primary_language || 'Plain Text'
      ]
    );

    return NextResponse.json({ success: true, summary, technologies: techs });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
