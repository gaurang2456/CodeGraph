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

import { FeaturePlannerService } from '../planner/featurePlannerService';
import { ensureDatabaseSchema, query, getDbPool } from '../db/client';

describe('AI Feature Planner & Pull Request Planning Engine Tests', () => {
  const userA = { id: 'a1b2c3d4-0000-0000-0000-aaaaaaaaaaaa', email: 'usera@example.com' };
  const userB = { id: 'b1b2c3d4-0000-0000-0000-bbbbbbbbbbbb', email: 'userb@example.com' };

  test('1. Schema Validation: validateAndSanitizePlan enforces strict 10-section structure', () => {
    const rawPlan = {
      overview: 'Integration plan for Google OAuth',
      relevantArchitecture: [
        { symbol: 'AuthService', filePath: 'src/auth/auth.service.ts', reason: 'Handles user tokens' },
      ],
      filesToModify: [
        { filePath: 'src/auth/auth.service.ts', symbols: ['AuthService'], reason: 'Add OAuth strategy' },
      ],
      filesToCreate: [
        { filePath: 'src/auth/google.strategy.ts', purpose: 'Google passport strategy' },
      ],
      dependencies: [
        { name: 'passport-google-oauth20', reason: 'OAuth2 strategy library' },
      ],
      databaseChanges: ['Add google_id column to users table'],
      apiChanges: [
        { endpoint: 'POST /auth/google', type: 'NEW ENDPOINT', description: 'Exchange code for token' },
      ],
      implementationSteps: [
        { step: 1, title: 'Install packages', description: 'Add passport-google-oauth20', files: ['package.json'], symbols: [] },
      ],
      potentialSideEffects: ['Passwordless users must be supported'],
      evidence: {
        files: ['src/auth/auth.service.ts'],
        symbols: ['AuthService'],
        chunkCount: 3,
      },
    };

    const sanitized = FeaturePlannerService.validateAndSanitizePlan(rawPlan);

    assert.strictEqual(sanitized.overview, 'Integration plan for Google OAuth');
    assert.strictEqual(sanitized.relevantArchitecture.length, 1);
    assert.strictEqual(sanitized.filesToModify.length, 1);
    assert.strictEqual(sanitized.filesToCreate.length, 1);
    assert.strictEqual(sanitized.dependencies.length, 1);
    assert.strictEqual(sanitized.databaseChanges.length, 1);
    assert.strictEqual(sanitized.apiChanges.length, 1);
    assert.strictEqual(sanitized.implementationSteps.length, 1);
    assert.strictEqual(sanitized.potentialSideEffects.length, 1);
    assert.strictEqual(sanitized.evidence.chunkCount, 3);
  });

  test('2. Schema Fallback: Missing fields are automatically populated with safe defaults', () => {
    const brokenData = { overview: 'Incomplete plan' };
    const mockChunks = [{ filePath: 'src/index.ts', symbolName: 'App' }];
    const mockSymbols = [{ name: 'App', type: 'class', file_path: 'src/index.ts' }];

    const sanitized = FeaturePlannerService.validateAndSanitizePlan(brokenData, mockChunks, mockSymbols);

    assert.strictEqual(sanitized.overview, 'Incomplete plan');
    assert.ok(Array.isArray(sanitized.relevantArchitecture));
    assert.ok(Array.isArray(sanitized.filesToModify));
    assert.ok(Array.isArray(sanitized.filesToCreate));
    assert.ok(Array.isArray(sanitized.dependencies));
    assert.ok(Array.isArray(sanitized.databaseChanges));
    assert.ok(Array.isArray(sanitized.apiChanges));
    assert.ok(Array.isArray(sanitized.implementationSteps));
    assert.ok(Array.isArray(sanitized.potentialSideEffects));
    assert.ok(sanitized.evidence.files.includes('src/index.ts'));
  });

  test('3. Feature Plan Persistence & Repository Isolation in Database', async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDatabaseSchema();

    const repoAId = `test-planner-repo-a-${Date.now()}`;
    const repoBId = `test-planner-repo-b-${Date.now()}`;

    // Create repos
    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, user_id, status)
       VALUES ($1, 'Repo A', 'usera/repoa', 'zip', $2, 'COMPLETED'),
              ($3, 'Repo B', 'userb/repob', 'zip', $4, 'COMPLETED')`,
      [repoAId, userA.id, repoBId, userB.id]
    );

    // Save a plan for Repo A
    const planA = await FeaturePlannerService.generatePlan(
      repoAId,
      'Add Stripe subscription billing',
      userA.id
    );

    assert.ok(planA.id);
    assert.strictEqual(planA.repositoryId, repoAId);
    assert.strictEqual(planA.userId, userA.id);
    assert.strictEqual(planA.featureRequest, 'Add Stripe subscription billing');

    // Retrieve plans for Repo A
    const plansA = await FeaturePlannerService.getPlansForRepository(repoAId, userA.id);
    assert.strictEqual(plansA.length, 1);
    assert.strictEqual(plansA[0].id, planA.id);

    // User B querying Repo A plans must return empty
    const plansB = await FeaturePlannerService.getPlansForRepository(repoAId, userB.id);
    assert.strictEqual(plansB.length, 0, 'User B must not see User A feature plans');

    // Clean up
    await query(`DELETE FROM repositories WHERE id IN ($1, $2)`, [repoAId, repoBId]);
  });

  after(async () => {
    try {
      await getDbPool().end();
    } catch {}
  });
});
