import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/server/db/client';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';
import { FeaturePlannerService } from '@/server/planner/featurePlannerService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const { user } = await requireRepositoryAccess(id, req);

    const plans = await FeaturePlannerService.getPlansForRepository(id, user.id);

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
