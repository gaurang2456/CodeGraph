import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { GraphStorage } from '@/server/analyzer/graphStorage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;

    // Verify repository exists
    const repoCheck = await query(`SELECT id FROM repositories WHERE id = $1`, [id]);
    if (repoCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const confidence = searchParams.get('confidence') || undefined;
    const filePath = searchParams.get('filePath') || undefined;
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    const graphData = await GraphStorage.getGraph(id, {
      type,
      confidence,
      filePath,
      limit,
    });

    return NextResponse.json(graphData);
  } catch (error: any) {
    console.error('Error fetching repository graph:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch repository graph.' },
      { status: 500 }
    );
  }
}
