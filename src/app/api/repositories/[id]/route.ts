import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;

    const result = await query(
      `SELECT id, name, full_name, source_type, github_url, branch, status, stage, progress,
              file_count, folder_count, line_count, token_count, primary_language, framework,
              technologies, summary, stats, error_message, created_at, updated_at
       FROM repositories
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
    }

    return NextResponse.json({ repository: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching repository details:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch repository details.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;

    await query(`DELETE FROM repositories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Repository deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting repository:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete repository.' },
      { status: 500 }
    );
  }
}
