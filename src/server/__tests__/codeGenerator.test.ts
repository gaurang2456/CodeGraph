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

import { CodeGeneratorService } from '../planner/codeGeneratorService';
import { FeaturePlannerService } from '../planner/featurePlannerService';
import { computeLineDiff, calculateDiffStats, generateUnifiedDiff } from '../planner/diffUtils';
import { ensureDatabaseSchema, query, getDbPool } from '../db/client';

describe('AI Code Change Generation & Git Diff Engine Tests', () => {
  const userA = { id: 'a1b2c3d4-1111-1111-1111-aaaaaaaaaaaa', email: 'usera@example.com' };
  const userB = { id: 'b1b2c3d4-2222-2222-2222-bbbbbbbbbbbb', email: 'userb@example.com' };

  test('1. Path Sanitization: blocks path traversal and malicious paths', () => {
    assert.strictEqual(CodeGeneratorService.sanitizeFilePath('../../etc/passwd'), 'etc/passwd');
    assert.strictEqual(CodeGeneratorService.sanitizeFilePath('/root/secret.ts'), 'root/secret.ts');
    assert.strictEqual(CodeGeneratorService.sanitizeFilePath('src\\auth\\auth.service.ts'), 'src/auth/auth.service.ts');
    assert.strictEqual(CodeGeneratorService.sanitizeFilePath('src/auth/auth.service.ts'), 'src/auth/auth.service.ts');
    assert.strictEqual(CodeGeneratorService.sanitizeFilePath(''), null);
  });

  test('2. Diff Utilities: calculates structured diffs, stats, and unified diffs accurately', () => {
    const original = 'line 1\nline 2\nline 3';
    const proposed = 'line 1\nline 2 modified\nline 3\nline 4';

    const diffLines = computeLineDiff(original, proposed);
    assert.ok(diffLines.length >= 4);

    const stats = calculateDiffStats(original, proposed);
    assert.strictEqual(stats.additions, 2); // 'line 2 modified', 'line 4'
    assert.strictEqual(stats.deletions, 1); // 'line 2'

    const unified = generateUnifiedDiff('src/test.ts', original, proposed);
    assert.ok(unified.includes('--- a/src/test.ts'));
    assert.ok(unified.includes('+++ b/src/test.ts'));
    assert.ok(unified.includes('+ line 4'));
    assert.ok(unified.includes('- line 2'));
  });

  test('3. Code Generation, Database Grounding, and Immutable Versioning', async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDatabaseSchema();

    const repoId = `test-codegen-repo-${Date.now()}`;
    const planId = `test-codegen-plan-${Date.now()}`;

    // 1. Create Repository
    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, user_id, status)
       VALUES ($1, 'AuthServiceRepo', 'usera/auth-repo', 'zip', $2, 'COMPLETED')`,
      [repoId, userA.id]
    );

    // 2. Insert Actual File into repository_files (Database Source of Truth)
    const exactOriginalContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validateUser(username: string, pass: string): Promise<any> {
    return null;
  }
}`;

    await query(
      `INSERT INTO repository_files (id, repository_id, file_path, file_name, extension, language, line_count, content)
       VALUES ($1, $2, 'src/auth/auth.service.ts', 'auth.service.ts', '.ts', 'typescript', 8, $3)`,
      [`file-${Date.now()}`, repoId, exactOriginalContent]
    );

    // 3. Create Feature Plan
    const planData = {
      overview: 'Implement password reset logic by modifying AuthService and creating PasswordResetService.',
      relevantArchitecture: [{ symbol: 'AuthService', filePath: 'src/auth/auth.service.ts', reason: 'Core auth service' }],
      filesToModify: [
        { filePath: 'src/auth/auth.service.ts', symbols: ['AuthService'], reason: 'Add password reset request method' },
      ],
      filesToCreate: [
        { filePath: 'src/auth/password-reset.service.ts', purpose: 'Handles token hashing and expiry' },
      ],
      dependencies: [],
      databaseChanges: [],
      apiChanges: [],
      implementationSteps: [{ step: 1, title: 'Add reset method', description: 'Extend AuthService', files: ['src/auth/auth.service.ts'], symbols: ['AuthService'] }],
      potentialSideEffects: [],
      evidence: { files: ['src/auth/auth.service.ts'], symbols: ['AuthService'], chunkCount: 1 },
    };

    await query(
      `INSERT INTO feature_plans (id, repository_id, user_id, feature_request, plan_json, status)
       VALUES ($1, $2, $3, 'Add password reset', $4, 'COMPLETED')`,
      [planId, repoId, userA.id, JSON.stringify(planData)]
    );

    // 4. Generate Changeset Version 1
    const changesetV1 = await CodeGeneratorService.generateCodeChanges(planId, userA.id);

    assert.ok(changesetV1.id);
    assert.strictEqual(changesetV1.version, 1);
    assert.strictEqual(changesetV1.parentChangesetId, null);
    assert.strictEqual(changesetV1.status, 'ready');
    assert.ok(changesetV1.changes.length >= 2);

    // Check MODIFY file: originalContent MUST come directly from database
    const modifyFile = changesetV1.changes.find((c) => c.filePath === 'src/auth/auth.service.ts');
    assert.ok(modifyFile, 'Modify file must be present');
    assert.strictEqual(modifyFile.changeType, 'modify');
    assert.strictEqual(
      modifyFile.originalContent,
      exactOriginalContent,
      'original_content must match the exact repository_files database content'
    );
    assert.ok(modifyFile.proposedContent.length > 0, 'proposed_content must be generated');

    // Check CREATE file: originalContent MUST be null
    const createFile = changesetV1.changes.find((c) => c.filePath === 'src/auth/password-reset.service.ts');
    assert.ok(createFile, 'Create file must be present');
    assert.strictEqual(createFile.changeType, 'create');
    assert.strictEqual(createFile.originalContent, null, 'CREATE file original_content must be NULL');
    assert.ok(createFile.proposedContent.length > 0);

    // 5. Approve Changeset Version 1
    const approvedV1 = await CodeGeneratorService.updateChangesetStatus(changesetV1.id, 'approved');
    assert.strictEqual(approvedV1.status, 'approved');

    // 6. Regenerate Changes (Adjustment 2: Immutable Versioning)
    const changesetV2 = await CodeGeneratorService.generateCodeChanges(planId, userA.id);

    assert.ok(changesetV2.id);
    assert.notStrictEqual(changesetV2.id, changesetV1.id, 'New changeset must have unique ID');
    assert.strictEqual(changesetV2.version, 2, 'Version must increment to 2');
    assert.strictEqual(changesetV2.parentChangesetId, changesetV1.id, 'Parent must point to V1');
    assert.strictEqual(changesetV2.status, 'ready');

    // 7. Verify Approved Changeset V1 is STILL Intact and Approved
    const reloadedV1 = await CodeGeneratorService.getChangesetById(changesetV1.id);
    assert.ok(reloadedV1);
    assert.strictEqual(reloadedV1.status, 'approved', 'Approved V1 must remain unchanged after V2 generation');
    assert.strictEqual(reloadedV1.version, 1);

    // 8. Test getAllChangesetsForPlan
    const allChangesets = await CodeGeneratorService.getAllChangesetsForPlan(planId);
    assert.strictEqual(allChangesets.length, 2);
    assert.strictEqual(allChangesets[0].version, 2);
    assert.strictEqual(allChangesets[1].version, 1);

    // 9. Clean up
    await query(`DELETE FROM repositories WHERE id = $1`, [repoId]);
  });

  after(async () => {
    try {
      await getDbPool().end();
    } catch {}
  });
});
