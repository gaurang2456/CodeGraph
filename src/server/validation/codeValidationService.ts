import fs from 'fs';
import path from 'path';
import { query } from '../db/client';
import { WorkspaceService } from './workspaceService';
import { runSafeCommand, stripAnsi } from './commandRunner';
import {
  ValidationResult,
  ValidationCheck,
  ValidationError,
  ValidationStatus,
  GeneratedChangeset,
} from '@/types';
import { CodeGeneratorService } from '../planner/codeGeneratorService';

export { stripAnsi };

export class CodeValidationService {
  /**
   * Validates a generated changeset inside an isolated temporary workspace.
   */
  static async validateChangeset(
    changesetId: string,
    userId?: string
  ): Promise<ValidationResult> {
    const changeset = await CodeGeneratorService.getChangesetById(changesetId);
    if (!changeset) {
      throw new Error('Changeset not found.');
    }

    const validationId = `val-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startedAt = new Date().toISOString();

    // Create initial validation DB record with 'running' status
    await query(
      `INSERT INTO changeset_validations (id, changeset_id, repository_id, user_id, status, result, created_at)
       VALUES ($1, $2, $3, $4, 'running', '{}'::jsonb, NOW())`,
      [validationId, changesetId, changeset.repositoryId, userId || null]
    );

    let workspacePath = '';
    const checks: ValidationCheck[] = [];
    let finalStatus: ValidationStatus = 'passed';
    let summaryText = 'All validation checks completed.';

    try {
      // 1. Create temporary workspace
      workspacePath = await WorkspaceService.createWorkspace(changeset.repositoryId, validationId);

      // 2. Reconstruct repository from database
      await WorkspaceService.reconstructRepository(workspacePath, changeset.repositoryId);

      // 3. Apply the generated changeset (validate proposed code, not original)
      await WorkspaceService.applyChangeset(workspacePath, changeset.changes);

      // 4. Inspect repository structure & configuration
      const packageJsonPath = path.join(workspacePath, 'package.json');
      const tsconfigPath = path.join(workspacePath, 'tsconfig.json');

      let packageJson: any = null;
      if (fs.existsSync(packageJsonPath)) {
        try {
          packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
        } catch (_) {}
      }

      const hasTsConfig = fs.existsSync(tsconfigPath);
      const scripts = packageJson?.scripts || {};

      // STAGE 1: Type Checking
      const typecheckResult = await this.runTypecheckStage(workspacePath, hasTsConfig, scripts);
      checks.push(typecheckResult);

      // STAGE 2: Build (only if build script exists)
      if (scripts.build) {
        const buildResult = await this.runBuildStage(workspacePath, scripts);
        checks.push(buildResult);
      }

      // STAGE 3: Tests (only if test script exists and is defined)
      if (scripts.test && !scripts.test.includes('no test specified')) {
        const testResult = await this.runTestStage(workspacePath, scripts);
        checks.push(testResult);
      }

      // Calculate finalStatus properly distinguishing passed, failed, skipped, and error
      const hasFailed = checks.some((c) => c.status === 'failed');
      const hasError = checks.some((c) => c.status === 'error');
      const hasPassed = checks.some((c) => c.status === 'passed');
      const allSkipped = checks.length > 0 && checks.every((c) => c.status === 'skipped');

      if (hasFailed) {
        finalStatus = 'failed';
        summaryText = `Validation failed: ${checks
          .filter((c) => c.status === 'failed')
          .map((c) => c.name)
          .join(', ')} reported errors.`;
      } else if (hasError) {
        finalStatus = 'error';
        summaryText = 'Validation encountered system or execution errors.';
      } else if (allSkipped) {
        finalStatus = 'skipped';
        summaryText = 'Validation skipped: Applicable validators or project dependencies are not configured in this repository.';
      } else if (hasPassed) {
        finalStatus = 'passed';
        const skippedCount = checks.filter((c) => c.status === 'skipped').length;
        summaryText =
          skippedCount > 0
            ? `Generated changes passed applicable validation checks (${skippedCount} skipped).`
            : `Generated changes passed all ${checks.length} validation checks.`;
      } else {
        finalStatus = 'skipped';
        summaryText = 'No validation checks were applicable to this repository.';
      }
    } catch (err: any) {
      console.error('[CodeValidationService] Validation infrastructure error:', err);
      finalStatus = 'error';
      summaryText = `Validation infrastructure error: ${stripAnsi(err?.message || 'Unknown error')}`;
      checks.push({
        type: 'typecheck',
        name: 'Validation Workspace Setup',
        status: 'error',
        output: stripAnsi(err?.stack || err?.message || 'Workspace initialization failed'),
        message: stripAnsi(err?.message || 'Workspace initialization failed'),
        errorCount: 1,
        errors: [{ message: stripAnsi(err?.message || 'Workspace initialization failed'), severity: 'error' }],
      });
    } finally {
      // 4. GUARANTEED CLEANUP: Always remove temporary workspace
      if (workspacePath) {
        await WorkspaceService.cleanupWorkspace(workspacePath);
      }
    }

    const completedAt = new Date().toISOString();

    const validationResult: ValidationResult = {
      id: validationId,
      changesetId,
      repositoryId: changeset.repositoryId,
      userId,
      status: finalStatus,
      overallStatus: finalStatus,
      summary: summaryText,
      checks,
      startedAt,
      completedAt,
      createdAt: startedAt,
    };

    // Save final validation result to database
    await query(
      `UPDATE changeset_validations
       SET status = $1, result = $2, completed_at = NOW()
       WHERE id = $3`,
      [finalStatus, JSON.stringify(validationResult), validationId]
    );

    return validationResult;
  }

  /**
   * Retrieves the latest validation result for a changeset.
   */
  static async getLatestValidationForChangeset(
    changesetId: string
  ): Promise<ValidationResult | null> {
    const res = await query(
      `SELECT id, changeset_id, repository_id, user_id, status, result, created_at, completed_at
       FROM changeset_validations
       WHERE changeset_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [changesetId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const resultData =
      typeof row.result === 'string' ? JSON.parse(row.result) : row.result;

    const parsedStatus = row.status as ValidationStatus;

    return {
      id: row.id,
      changesetId: row.changeset_id,
      repositoryId: row.repository_id,
      userId: row.user_id,
      status: parsedStatus,
      overallStatus: parsedStatus,
      summary: resultData?.summary,
      checks: Array.isArray(resultData?.checks) ? resultData.checks : [],
      startedAt: row.created_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    };
  }

  /**
   * Discovers whether TypeScript is installed in the target repository's workspace.
   * Prefer local node_modules/.bin/tsc or direct node execution.
   */
  static locateTargetRepositoryTypeScript(workspacePath: string): {
    isInstalled: boolean;
    command?: string;
    args?: string[];
  } {
    const isWindows = process.platform === 'win32';

    // 1. Direct binaries in node_modules/.bin
    const localBinWin = path.join(workspacePath, 'node_modules', '.bin', 'tsc.cmd');
    const localBinPs = path.join(workspacePath, 'node_modules', '.bin', 'tsc.ps1');
    const localBin = path.join(workspacePath, 'node_modules', '.bin', 'tsc');
    const tscJs = path.join(workspacePath, 'node_modules', 'typescript', 'bin', 'tsc');

    if (isWindows && fs.existsSync(localBinWin)) {
      return { isInstalled: true, command: localBinWin, args: ['--noEmit'] };
    }
    if (isWindows && fs.existsSync(localBinPs)) {
      return { isInstalled: true, command: localBinPs, args: ['--noEmit'] };
    }
    if (fs.existsSync(localBin)) {
      return { isInstalled: true, command: localBin, args: ['--noEmit'] };
    }
    if (fs.existsSync(tscJs)) {
      return { isInstalled: true, command: process.execPath, args: [tscJs, '--noEmit'] };
    }

    // 2. Check if node_modules/typescript package exists
    if (fs.existsSync(path.join(workspacePath, 'node_modules', 'typescript'))) {
      return { isInstalled: true, command: 'npx', args: ['--no-install', 'tsc', '--noEmit'] };
    }

    return { isInstalled: false };
  }

  /**
   * Runs Typecheck stage with output parsing and missing-dependency handling.
   */
  private static async runTypecheckStage(
    workspacePath: string,
    hasTsConfig: boolean,
    scripts: Record<string, string>
  ): Promise<ValidationCheck> {
    // 1. If repository does not have tsconfig.json, skip gracefully
    if (!hasTsConfig) {
      return {
        type: 'typecheck',
        name: 'TypeScript Type Check',
        status: 'skipped',
        durationMs: 0,
        output: 'No tsconfig.json found. TypeScript validation is not applicable to this repository.',
        message: 'No tsconfig.json found. TypeScript validation is not applicable to this repository.',
        errorCount: 0,
        errors: [],
      };
    }

    // 2. Locate TypeScript in the target repository's local environment
    const tsLocation = this.locateTargetRepositoryTypeScript(workspacePath);

    if (!tsLocation.isInstalled) {
      return {
        type: 'typecheck',
        name: 'TypeScript Type Check',
        status: 'skipped',
        command: 'tsc --noEmit',
        durationMs: 0,
        output: 'TypeScript is not installed in the target repository. Run npm install before validation.',
        message: 'TypeScript is not installed in the target repository. Run npm install before validation.',
        errorCount: 0,
        errors: [],
      };
    }

    // 3. Execute the detected local TypeScript command
    const res = await runSafeCommand({
      command: tsLocation.command!,
      args: tsLocation.args || ['--noEmit'],
      cwd: workspacePath,
      timeoutMs: 45000,
    });

    const rawOutput = `${res.stdout}\n${res.stderr}`.trim();
    const cleanOutput = stripAnsi(rawOutput);

    // 4. Guard against missing tsc / npm dummy placeholder
    const isMissingTsc =
      cleanOutput.includes('This is not the tsc command you are looking for') ||
      cleanOutput.includes('To get access to the TypeScript compiler, install TypeScript first') ||
      cleanOutput.includes('could not determine executable to run') ||
      cleanOutput.includes("Cannot find module 'typescript'") ||
      cleanOutput.includes('command not found');

    if (isMissingTsc) {
      return {
        type: 'typecheck',
        name: 'TypeScript Type Check',
        status: 'skipped',
        command: 'tsc --noEmit',
        durationMs: res.durationMs,
        output: 'TypeScript is not installed in the target repository. Run npm install before validation.',
        message: 'TypeScript is not installed in the target repository. Run npm install before validation.',
        errorCount: 0,
        errors: [],
      };
    }

    const errors = this.parseCompilerErrors(cleanOutput);
    const isSuccess = res.exitCode === 0 && errors.length === 0;

    return {
      type: 'typecheck',
      name: 'TypeScript Type Check',
      status: isSuccess ? 'passed' : 'failed',
      command: `${tsLocation.command} ${(tsLocation.args || []).join(' ')}`.trim(),
      exitCode: res.exitCode,
      durationMs: res.durationMs,
      output: cleanOutput || (isSuccess ? 'TypeScript compilation passed with 0 errors.' : 'Type checking failed.'),
      errorCount: errors.length,
      message: isSuccess
        ? 'TypeScript compilation passed.'
        : `Found ${errors.length} TypeScript compiler error${errors.length === 1 ? '' : 's'}.`,
      errors,
    };
  }

  /**
   * Runs Build stage with dependency check.
   */
  private static async runBuildStage(
    workspacePath: string,
    scripts: Record<string, string>
  ): Promise<ValidationCheck> {
    if (!scripts.build) {
      return {
        type: 'build',
        name: 'Production Build',
        status: 'skipped',
        durationMs: 0,
        output: 'No build script defined in package.json.',
        message: 'No build script defined in package.json.',
        errorCount: 0,
        errors: [],
      };
    }

    const hasNodeModules = fs.existsSync(path.join(workspacePath, 'node_modules'));
    if (!hasNodeModules) {
      return {
        type: 'build',
        name: 'Production Build',
        status: 'skipped',
        command: 'npm run build',
        durationMs: 0,
        output: 'Build skipped because project dependencies are not installed in repository.',
        message: 'Build skipped because project dependencies are not installed in repository.',
        errorCount: 0,
        errors: [],
      };
    }

    const res = await runSafeCommand({
      command: 'npm',
      args: ['run', 'build'],
      cwd: workspacePath,
      timeoutMs: 60000,
    });

    const rawOutput = `${res.stdout}\n${res.stderr}`.trim();
    const cleanOutput = stripAnsi(rawOutput);
    const isSuccess = res.exitCode === 0;

    return {
      type: 'build',
      name: 'Production Build',
      status: isSuccess ? 'passed' : 'failed',
      command: 'npm run build',
      exitCode: res.exitCode,
      durationMs: res.durationMs,
      output: cleanOutput || (isSuccess ? 'Build completed successfully.' : 'Build failed.'),
      errorCount: isSuccess ? 0 : 1,
      message: isSuccess ? 'Build completed successfully.' : 'Build process exited with non-zero code.',
      errors: isSuccess ? [] : [{ message: 'Build process exited with non-zero code', severity: 'error' }],
    };
  }

  /**
   * Runs Tests stage with dependency check.
   */
  private static async runTestStage(
    workspacePath: string,
    scripts: Record<string, string>
  ): Promise<ValidationCheck> {
    if (!scripts.test || scripts.test.includes('no test specified')) {
      return {
        type: 'test',
        name: 'Automated Tests',
        status: 'skipped',
        durationMs: 0,
        output: 'No test script defined in package.json.',
        message: 'No test script defined in package.json.',
        errorCount: 0,
        errors: [],
      };
    }

    const hasNodeModules = fs.existsSync(path.join(workspacePath, 'node_modules'));
    if (!hasNodeModules) {
      return {
        type: 'test',
        name: 'Automated Tests',
        status: 'skipped',
        command: 'npm test',
        durationMs: 0,
        output: 'Tests skipped because project dependencies are not installed in repository.',
        message: 'Tests skipped because project dependencies are not installed in repository.',
        errorCount: 0,
        errors: [],
      };
    }

    const res = await runSafeCommand({
      command: 'npm',
      args: ['test'],
      cwd: workspacePath,
      timeoutMs: 60000,
    });

    const rawOutput = `${res.stdout}\n${res.stderr}`.trim();
    const cleanOutput = stripAnsi(rawOutput);
    const isSuccess = res.exitCode === 0;

    return {
      type: 'test',
      name: 'Automated Tests',
      status: isSuccess ? 'passed' : 'failed',
      command: 'npm test',
      exitCode: res.exitCode,
      durationMs: res.durationMs,
      output: cleanOutput || (isSuccess ? 'All tests passed.' : 'One or more tests failed.'),
      errorCount: isSuccess ? 0 : 1,
      message: isSuccess ? 'All tests passed.' : 'Test runner reported failures.',
      errors: isSuccess ? [] : [{ message: 'Test runner reported failures', severity: 'error' }],
    };
  }

  /**
   * Parses TypeScript / compiler error lines into structured ValidationError objects.
   */
  static parseCompilerErrors(rawOutput: string): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!rawOutput) return errors;

    const cleaned = stripAnsi(rawOutput);
    const lines = cleaned.split('\n');
    for (const line of lines) {
      // Matches TypeScript format: src/file.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.
      // or: src/file.ts:12:5 - error TS2322: ...
      const match =
        line.match(/^(.+?)(?:\((\d+),(\d+)\)|:(\d+):(\d+))?:\s*(error|warning)\s*(?:TS\d+:)?\s*(.*)$/i) ||
        line.match(/^(.+?):(\d+):(\d+)\s*-\s*(error|warning)\s*(?:TS\d+:)?\s*(.*)$/i);

      if (match) {
        const filePath = match[1]?.trim();
        const lineNum = parseInt(match[2] || match[4] || '0', 10) || undefined;
        const colNum = parseInt(match[3] || match[5] || '0', 10) || undefined;
        const severity = (match[6] || match[4] || 'error').toLowerCase() as 'error' | 'warning';
        const message = match[7] || match[5] || line.trim();

        errors.push({
          filePath,
          line: lineNum,
          column: colNum,
          message: message.trim(),
          severity,
        });
      }
    }

    return errors;
  }
}
