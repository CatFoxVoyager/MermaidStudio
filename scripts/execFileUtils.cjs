const { execFile, ChildProcess } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function execFileNoThrow(
  command,
  args,
  options
) {
  try {
    const result = await execFileAsync(command, args, {
      encoding: 'utf8',
      maxBuffer: options?.maxBuffer || 1024 * 1024,
      timeout: options?.timeout || 30000,
      ...options
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: 0
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message || String(error),
      status: error.code || 1
    };
  }
}

// Helper for safe command execution
function executeCommandSafely(command, args, options) {
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

module.exports = {
  execFileNoThrow,
  executeCommandSafely
};