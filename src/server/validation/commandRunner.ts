import { spawn } from 'child_process';

export interface CommandOptions {
  command: string;
  args?: string[];
  cwd: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface CommandResult {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

const MAX_OUTPUT_BUFFER_BYTES = 512 * 1024; // 512 KB

/**
 * Removes ANSI escape codes and orphaned bracketed color sequences from text.
 */
export function stripAnsi(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Strip standard ANSI escape sequences (CSI, OSC, SGR, etc.)
    .replace(/[\u001b\x1b]\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/[\u001b\x1b]\].*?(?:\u0007|[\u001b\x1b]\\)/g, '')
    .replace(/[\u001b\x1b][@-Z\\-_]/g, '')
    // Also strip orphaned bracketed color sequences like [41m, [37m, [0m
    .replace(/(?:\[(?:\d{1,3}(?:;\d{1,3})*)?m)+/g, '')
    .trim();
}

/**
 * Safely runs a command inside a specific directory using spawn with timeout protection.
 * Prevents shell injection and limits buffer sizes.
 */
export async function runSafeCommand(options: CommandOptions): Promise<CommandResult> {
  const { command, args = [], cwd, timeoutMs = 60000, env = process.env } = options;
  const startTime = Date.now();

  return new Promise<CommandResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let isSettled = false;

    // Use shell on Windows for resolving npm/npx and .cmd/.bat binaries safely
    const isWindows = process.platform === 'win32';
    const useShell =
      isWindows &&
      (command.startsWith('npm') ||
        command.startsWith('npx') ||
        command.endsWith('.cmd') ||
        command.endsWith('.bat'));

    const child = spawn(command, args, {
      cwd,
      env: {
        ...env,
        CI: 'true',
        NODE_ENV: 'test',
        FORCE_COLOR: '0',
      },
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!isSettled) {
            child.kill('SIGKILL');
          }
        }, 3000);
      } catch (_) {}
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BUFFER_BYTES) {
        stdout += chunk.toString('utf8');
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BUFFER_BYTES) {
        stderr += chunk.toString('utf8');
      }
    });

    const handleFinish = (code: number | null, signal: NodeJS.Signals | null) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      const durationMs = Date.now() - startTime;
      const exitCode = timedOut ? -1 : code ?? (signal ? 1 : 0);

      resolve({
        command,
        args,
        exitCode,
        stdout: stripAnsi(stdout),
        stderr: stripAnsi(stderr),
        durationMs,
        timedOut,
      });
    };

    child.on('close', (code, signal) => handleFinish(code, signal));
    child.on('error', (err) => {
      stderr += `\nProcess error: ${err.message}`;
      handleFinish(1, null);
    });
  });
}
