import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const { repository } = await requireRepositoryAccess(id, req);

    return NextResponse.json({ repository });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    await requireRepositoryAccess(id, req);

    await query(`DELETE FROM repositories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Repository deleted successfully.' });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
