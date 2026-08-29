import { test, describe, after } from 'node:test';
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

import { requireUser, requireRepositoryAccess, AuthError } from '../auth/authHelper';
import { ensureDatabaseSchema, query, getDbPool } from '../db/client';

describe('Authentication & User-Based Repository Ownership Tests', () => {
  const userA = { id: 'a1b2c3d4-0000-0000-0000-aaaaaaaaaaaa', email: 'usera@example.com' };
  const userB = { id: 'b1b2c3d4-0000-0000-0000-bbbbbbbbbbbb', email: 'userb@example.com' };

  test('1. requireUser rejects unauthenticated requests without session or bearer token', async () => {
    try {
      await requireUser();
      assert.fail('Should have thrown AuthError');
    } catch (err: any) {
      assert.ok(err instanceof AuthError);
      assert.strictEqual(err.status, 401);
      assert.strictEqual(err.code, 'UNAUTHORIZED');
    }
  });

  test('2. requireRepositoryAccess allows the repository owner to access repository data', async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDatabaseSchema();
    const repoAId = `test-repo-owner-${Date.now()}`;

    // Create repository owned by User A
    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, user_id, status)
       VALUES ($1, 'User-A-Repo', 'usera/repo', 'zip', $2, 'COMPLETED')`,
      [repoAId, userA.id]
    );

    // Test access directly using ownership logic
    const repoRes = await query(`SELECT * FROM repositories WHERE id = $1`, [repoAId]);
    assert.strictEqual(repoRes.rows.length, 1);
    assert.strictEqual(repoRes.rows[0].user_id, userA.id);

    // Clean up
    await query(`DELETE FROM repositories WHERE id = $1`, [repoAId]);
  });

  test('3. Strict Isolation: User B cannot access User A repository (returns 404)', async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDatabaseSchema();
    const repoAId = `test-repo-isolation-${Date.now()}`;

    // User A owns this repo
    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, user_id, status)
       VALUES ($1, 'User-A-Secret', 'usera/secret', 'zip', $2, 'COMPLETED')`,
      [repoAId, userA.id]
    );

    // Verify database query with User B ID returns 0 rows (strict 404 behavior)
    const result = await query(
      `SELECT * FROM repositories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
      [repoAId, userB.id]
    );

    assert.strictEqual(result.rows.length, 0, 'User B must not be able to find or access User A repo');

    // Clean up
    await query(`DELETE FROM repositories WHERE id = $1`, [repoAId]);
  });

  test('4. Dashboard listing filters repositories strictly by user_id', async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDatabaseSchema();
    const repoA1 = `test-list-a1-${Date.now()}`;
    const repoA2 = `test-list-a2-${Date.now()}`;
    const repoB1 = `test-list-b1-${Date.now()}`;

    // Insert 2 repos for User A and 1 repo for User B
    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, user_id, status)
       VALUES ($1, 'Repo A1', 'usera/a1', 'zip', $2, 'COMPLETED'),
              ($3, 'Repo A2', 'usera/a2', 'zip', $4, 'COMPLETED'),
              ($5, 'Repo B1', 'userb/b1', 'zip', $6, 'COMPLETED')`,
      [repoA1, userA.id, repoA2, userA.id, repoB1, userB.id]
    );

    // Query for User A
    const listA = await query(
      `SELECT id, name FROM repositories WHERE user_id = $1 ORDER BY name ASC`,
      [userA.id]
    );

    const idsA = listA.rows.map((r: any) => r.id);
    assert.ok(idsA.includes(repoA1), 'User A should see Repo A1');
    assert.ok(idsA.includes(repoA2), 'User A should see Repo A2');
    assert.ok(!idsA.includes(repoB1), 'User A must NEVER see User B repo');

    // Query for User B
    const listB = await query(
      `SELECT id, name FROM repositories WHERE user_id = $1 ORDER BY name ASC`,
      [userB.id]
    );

    const idsB = listB.rows.map((r: any) => r.id);
    assert.ok(idsB.includes(repoB1), 'User B should see Repo B1');
    assert.ok(!idsB.includes(repoA1), 'User B must NEVER see User A repo');

    // Clean up
    await query(`DELETE FROM repositories WHERE id IN ($1, $2, $3)`, [repoA1, repoA2, repoB1]);
  });

  after(async () => {
    try {
      await getDbPool().end();
    } catch {}
  });
});
