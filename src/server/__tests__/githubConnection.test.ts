import { test, describe, after, before } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Load .env.local if not already in process.env
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { ensureDatabaseSchema, query, getDbPool } from '../db/client';
import { GitHubConnectionService } from '../github/githubConnectionService';
import { createGitHubClient, GitHubApiClient } from '../github/githubClient';
import { GET as getConnectionHandler, DELETE as deleteConnectionHandler } from '@/app/api/github/connection/route';
import { NextRequest } from 'next/server';

describe('Phase 4.0: GitHub Account Connection & Security Tests', () => {
  const userAId = 'a1111111-1111-1111-1111-111111111111';
  const userBId = 'b2222222-2222-2222-2222-222222222222';
  const secretTokenA = 'ghp_secret_token_user_a_1234567890abcdef';
  const updatedTokenA = 'ghp_updated_token_user_a_0987654321fedcba';
  const secretTokenB = 'ghp_secret_token_user_b_9876543210zyxwvu';

  before(async () => {
    if (process.env.DATABASE_URL) {
      await ensureDatabaseSchema();
      // Clean test records before running
      await query(`DELETE FROM github_connections WHERE user_id IN ($1, $2);`, [userAId, userBId]);
    }
  });

  after(async () => {
    if (process.env.DATABASE_URL) {
      // Clean test records after running
      await query(`DELETE FROM github_connections WHERE user_id IN ($1, $2);`, [userAId, userBId]);
    }
  });

  // 1. Connection Tests
  test('1. User can connect GitHub account successfully', async () => {
    if (!process.env.DATABASE_URL) return;

    const result = await GitHubConnectionService.connectGitHubAccount({
      userId: userAId,
      githubUserId: '10001',
      githubLogin: 'octocat-a',
      accessToken: secretTokenA,
      avatarUrl: 'https://avatars.githubusercontent.com/u/10001?v=4',
    });

    assert.strictEqual(result.connected, true);
    assert.strictEqual(result.githubLogin, 'octocat-a');
    assert.strictEqual(result.avatarUrl, 'https://avatars.githubusercontent.com/u/10001?v=4');
    assert.ok(result.connectedAt);

    // Verify boolean check
    const isConnected = await GitHubConnectionService.isGitHubConnected(userAId);
    assert.strictEqual(isConnected, true);
  });

  test('2. Reconnecting GitHub updates the existing connection for the same user (upsert)', async () => {
    if (!process.env.DATABASE_URL) return;

    // Reconnect with updated credentials
    const updatedResult = await GitHubConnectionService.connectGitHubAccount({
      userId: userAId,
      githubUserId: '10001',
      githubLogin: 'octocat-a-updated',
      accessToken: updatedTokenA,
      avatarUrl: 'https://avatars.githubusercontent.com/u/10001_new?v=4',
    });

    assert.strictEqual(updatedResult.connected, true);
    assert.strictEqual(updatedResult.githubLogin, 'octocat-a-updated');

    // Confirm exactly one record exists for userA (no duplicates)
    const countRes = await query(
      `SELECT COUNT(*)::int as count FROM github_connections WHERE user_id = $1;`,
      [userAId]
    );
    assert.strictEqual(countRes.rows[0].count, 1);

    // Confirm the internal token was updated
    const rawToken = await GitHubConnectionService.getRawGitHubTokenForUser(userAId);
    assert.strictEqual(rawToken, updatedTokenA);
  });

  // 2. Security Tests
  test('3. Sanitized getGitHubConnection NEVER contains access_token', async () => {
    if (!process.env.DATABASE_URL) return;

    const connectionInfo = await GitHubConnectionService.getGitHubConnection(userAId);

    assert.strictEqual(connectionInfo.connected, true);
    assert.strictEqual(connectionInfo.githubLogin, 'octocat-a-updated');

    // Assert key does not exist on sanitized object
    assert.strictEqual((connectionInfo as any).accessToken, undefined);
    assert.strictEqual((connectionInfo as any).access_token, undefined);
    assert.strictEqual((connectionInfo as any).token, undefined);

    // Verify serialization never leaks the secret token
    const serialized = JSON.stringify(connectionInfo);
    assert.ok(!serialized.includes(secretTokenA), 'Serialized connection must not leak secret token');
    assert.ok(!serialized.includes(updatedTokenA), 'Serialized connection must not leak updated token');
  });

  test('4. Tokens never appear in GitHubApiClient error objects or messages', async () => {
    const client = new GitHubApiClient('ghp_super_secret_test_token_99999');

    try {
      // Simulate an error with an invalid endpoint
      await client.request('/nonexistent_endpoint_xyz_trigger_error');
      assert.fail('Should have thrown an error');
    } catch (err: any) {
      // The secret token MUST NOT appear anywhere in the error message
      assert.ok(
        !err.message.includes('ghp_super_secret_test_token_99999'),
        'Error message must redact any reflected token'
      );
    }
  });

  // 3. User Isolation Tests
  test('5. User Isolation: User B cannot access User A connection information', async () => {
    if (!process.env.DATABASE_URL) return;

    // Connect User B with separate account
    await GitHubConnectionService.connectGitHubAccount({
      userId: userBId,
      githubUserId: '20002',
      githubLogin: 'octocat-b',
      accessToken: secretTokenB,
      avatarUrl: 'https://avatars.githubusercontent.com/u/20002?v=4',
    });

    const connA = await GitHubConnectionService.getGitHubConnection(userAId);
    const connB = await GitHubConnectionService.getGitHubConnection(userBId);

    assert.strictEqual(connA.githubLogin, 'octocat-a-updated');
    assert.strictEqual(connB.githubLogin, 'octocat-b');
    assert.notStrictEqual(connA.githubLogin, connB.githubLogin);
  });

  test('6. User Isolation: User A cannot disconnect User B connection', async () => {
    if (!process.env.DATABASE_URL) return;

    // Disconnect User A
    const disconnected = await GitHubConnectionService.disconnectGitHubAccount(userAId);
    assert.strictEqual(disconnected, true);

    // User A should now be disconnected
    const connA = await GitHubConnectionService.getGitHubConnection(userAId);
    assert.strictEqual(connA.connected, false);

    // User B MUST remain connected and completely untouched
    const connB = await GitHubConnectionService.getGitHubConnection(userBId);
    assert.strictEqual(connB.connected, true);
    assert.strictEqual(connB.githubLogin, 'octocat-b');
  });

  // 4. GitHub API Client Tests
  test('7. createGitHubClient returns client for connected user and rejects disconnected user', async () => {
    if (!process.env.DATABASE_URL) return;

    // User B is connected -> client created successfully
    const clientB = await createGitHubClient(userBId);
    assert.ok(clientB instanceof GitHubApiClient);

    // User A is disconnected -> must throw descriptive error
    try {
      await createGitHubClient(userAId);
      assert.fail('Should have thrown for disconnected user');
    } catch (err: any) {
      assert.ok(err.message.includes('No GitHub account connected'));
    }
  });

  // 5. API Route Handlers Tests
  test('8. API Routes: Unauthenticated GET /api/github/connection returns 401', async () => {
    const unauthReq = new NextRequest('http://localhost:3000/api/github/connection');
    const response = await getConnectionHandler(unauthReq);

    assert.strictEqual(response.status, 401);
    const body = await response.json();
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  test('9. API Routes: Unauthenticated DELETE /api/github/connection returns 401', async () => {
    const unauthReq = new NextRequest('http://localhost:3000/api/github/connection', {
      method: 'DELETE',
    });
    const response = await deleteConnectionHandler(unauthReq);

    assert.strictEqual(response.status, 401);
    const body = await response.json();
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  test('10. Disconnected user returns safe { connected: false } without errors', async () => {
    const nonExistentUserId = 'c3333333-3333-3333-3333-333333333333';
    const status = await GitHubConnectionService.getGitHubConnection(nonExistentUserId);

    assert.strictEqual(status.connected, false);
    assert.strictEqual(status.githubLogin, undefined);
    assert.strictEqual(status.avatarUrl, undefined);
  });
});
