import { query, ensureDatabaseSchema } from '@/server/db/client';
import { GitHubConnectionStatus } from '@/types';

export interface ConnectGitHubAccountParams {
  userId: string;
  githubUserId: string;
  githubLogin: string;
  accessToken: string;
  avatarUrl?: string | null;
}

export class GitHubConnectionService {
  /**
   * Connects or updates a GitHub account for the given user.
   * Performs an upsert based on user_id so reconnecting safely rotates/refreshes the access token.
   * SECURITY: The access token is stored safely in PostgreSQL and never returned or logged.
   */
  static async connectGitHubAccount(
    params: ConnectGitHubAccountParams
  ): Promise<GitHubConnectionStatus> {
    await ensureDatabaseSchema();

    const { userId, githubUserId, githubLogin, accessToken, avatarUrl } = params;

    if (!userId || !githubUserId || !githubLogin || !accessToken) {
      throw new Error('Missing required fields to connect GitHub account.');
    }

    const sql = `
      INSERT INTO github_connections (
        user_id,
        github_user_id,
        github_login,
        access_token,
        avatar_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        github_user_id = EXCLUDED.github_user_id,
        github_login = EXCLUDED.github_login,
        access_token = EXCLUDED.access_token,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING github_login, avatar_url, created_at, updated_at;
    `;

    const res = await query(sql, [
      userId,
      githubUserId,
      githubLogin,
      accessToken,
      avatarUrl || null,
    ]);

    const row = res.rows[0];

    return {
      connected: true,
      githubLogin: row.github_login,
      avatarUrl: row.avatar_url || undefined,
      connectedAt: (row.updated_at || row.created_at)?.toISOString?.() || new Date().toISOString(),
    };
  }

  /**
   * Retrieves sanitized GitHub connection status for a user.
   * STRICT SECURITY: Never returns access_token.
   */
  static async getGitHubConnection(userId: string): Promise<GitHubConnectionStatus> {
    await ensureDatabaseSchema();

    if (!userId) {
      return { connected: false };
    }

    const sql = `
      SELECT github_login, avatar_url, created_at, updated_at
      FROM github_connections
      WHERE user_id = $1
      LIMIT 1;
    `;

    const res = await query(sql, [userId]);

    if (res.rows.length === 0) {
      return { connected: false };
    }

    const row = res.rows[0];

    return {
      connected: true,
      githubLogin: row.github_login,
      avatarUrl: row.avatar_url || undefined,
      connectedAt: (row.updated_at || row.created_at)?.toISOString?.() || new Date(row.created_at).toISOString(),
    };
  }

  /**
   * Checks whether a user has an active GitHub connection.
   */
  static async isGitHubConnected(userId: string): Promise<boolean> {
    await ensureDatabaseSchema();

    if (!userId) return false;

    const res = await query(
      `SELECT 1 FROM github_connections WHERE user_id = $1 LIMIT 1;`,
      [userId]
    );

    return res.rows.length > 0;
  }

  /**
   * Disconnects a user's GitHub account by removing their connection record.
   * Strictly scoped to the authenticated user (WHERE user_id = $1).
   */
  static async disconnectGitHubAccount(userId: string): Promise<boolean> {
    await ensureDatabaseSchema();

    if (!userId) return false;

    const res = await query(
      `DELETE FROM github_connections WHERE user_id = $1;`,
      [userId]
    );

    return (res.rowCount ?? 0) > 0;
  }

  /**
   * SERVER-ONLY: Retrieves raw access token for authenticated GitHub API operations.
   * Never expose this method or its return value to API routes, client components, or logs.
   */
  static async getRawGitHubTokenForUser(userId: string): Promise<string | null> {
    await ensureDatabaseSchema();

    if (!userId) return null;

    const res = await query(
      `SELECT access_token FROM github_connections WHERE user_id = $1 LIMIT 1;`,
      [userId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0].access_token;
  }
}
