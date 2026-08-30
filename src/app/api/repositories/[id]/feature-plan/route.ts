import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/server/db/client';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';
import { FeaturePlannerService } from '@/server/planner/featurePlannerService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const { user } = await requireRepositoryAccess(id, req);

    const body = await req.json();
    const featureRequest = body.feature || body.featureRequest || body.prompt;

    if (!featureRequest || typeof featureRequest !== 'string' || !featureRequest.trim()) {
      return NextResponse.json(
        { error: 'Feature request description is required.' },
        { status: 400 }
      );
    }

    const plan = await FeaturePlannerService.generatePlan(id, featureRequest.trim(), user.id);

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
