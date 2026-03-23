import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface ExecResult {
  stdout: string;
  stderr: string;
  status: number;
}

export async function execFileNoThrow(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    timeout?: number;
    maxBuffer?: number;
  }
): Promise<ExecResult> {
  try {
    const result = await execFileAsync(command, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024, // 1MB
      timeout: options?.timeout || 30000,
      ...options
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: 0
    };
  } catch (error: any) {
    return {
      stdout: '',
      stderr: error.message || String(error),
      status: error.code || 1
    };
  }
}

// Helper for safe command execution with proper escaping
export function executeCommandSafely(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    timeout?: number;
  }
): Promise<ExecResult> {
  // Validate command and args
  if (typeof command !== 'string' || !command.trim()) {
    throw new Error('Invalid command');
  }

  // Ensure args are strings
  const safeArgs = args.map(arg => {
    if (typeof arg !== 'string') {
      throw new Error(`Invalid argument type: ${typeof arg}`);
    }
    return arg;
  });

  return execFileNoThrow(command, safeArgs, options);
}