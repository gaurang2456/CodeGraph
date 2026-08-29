import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/server/db/client';
import { GraphStorage } from '@/server/analyzer/graphStorage';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    await requireRepositoryAccess(id, req);

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
    return handleAuthApiError(error);
  }
}
