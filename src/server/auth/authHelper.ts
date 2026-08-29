import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { query } from '@/server/db/client';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

export class AuthError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 401, code = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Extracts and verifies the current authenticated Supabase user.
 * Reads either Supabase session cookies via @supabase/ssr or an Authorization Bearer header.
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // 1. Check Authorization Bearer header if provided
    const authHeader = req?.headers?.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        };
      }
    }

    // 2. Read session cookies using Supabase SSR client
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
    };
  } catch (err) {
    console.warn('[AuthHelper] Failed to resolve authenticated user:', err);
    return null;
  }
}

/**
 * Requires an authenticated user. Throws AuthError(401) if not logged in.
 */
export async function requireUser(req?: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new AuthError('Authentication required. Please log in.', 401, 'UNAUTHORIZED');
  }
  return user;
}

/**
 * Enforces strict user repository ownership:
 * 1. Ensures user is authenticated.
 * 2. Fetches repository.
 * 3. Confirms repository.user_id matches authenticated user id.
 * 4. Returns 404 (or throws AuthError) if not owned to prevent repository ID probing.
 */
export async function requireRepositoryAccess(
  repositoryId: string,
  req?: NextRequest
): Promise<{ user: AuthenticatedUser; repository: any }> {
  const user = await requireUser(req);

  const res = await query(
    `SELECT id, name, full_name, source_type, github_url, branch, user_id, status, stage, progress,
            file_count, folder_count, line_count, token_count, primary_language, framework,
            technologies, summary, stats, error_message, created_at, updated_at
     FROM repositories
     WHERE id = $1`,
    [repositoryId]
  );

  if (res.rows.length === 0) {
    throw new AuthError('Repository not found.', 404, 'NOT_FOUND');
  }

  const repository = res.rows[0];

  // If repository is owned by another user -> strict 404 to avoid leaking existence
  if (repository.user_id && repository.user_id !== user.id) {
    throw new AuthError('Repository not found.', 404, 'NOT_FOUND');
  }

  // If legacy repository has no user_id, bind it to current user for migration safety
  if (!repository.user_id) {
    await query(`UPDATE repositories SET user_id = $1 WHERE id = $2`, [user.id, repositoryId]);
    repository.user_id = user.id;
  }

  return { user, repository };
}

/**
 * Helper to wrap API Route handlers with standardized error responses.
 */
export function handleAuthApiError(err: any): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status }
    );
  }
  console.error('[API Error]', err);
  return NextResponse.json(
    { error: err?.message || 'An unexpected error occurred.' },
    { status: 500 }
  );
}
