import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleAuthApiError } from '@/server/auth/authHelper';
import { GitHubConnectionService } from '@/server/github/githubConnectionService';

/**
 * GET /api/github/connection
 * Retrieves the current authenticated user's GitHub connection status.
 * STRICT SECURITY: Never returns access_token.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const connection = await GitHubConnectionService.getGitHubConnection(user.id);
    return NextResponse.json(connection);
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}

/**
 * DELETE /api/github/connection
 * Disconnects the current authenticated user's GitHub connection.
 * Scoped strictly to the requesting user ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await GitHubConnectionService.disconnectGitHubAccount(user.id);
    return NextResponse.json({
      success: true,
      message: 'GitHub account disconnected successfully.',
    });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
