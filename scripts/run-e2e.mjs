/**
 * Playwright E2E Test Runner with PATH Fix
 *
 * This script runs Playwright tests with proper PATH setup to avoid
 * the Windows subshell node-PATH issue. Use this instead of direct
 * playwright test commands.
 *
 * Usage: node scripts/run-e2e.mjs [test-spec]
 * Example: node scripts/run-e2e.mjs tests/e2e/tests/mobile-foundation/mobile-detection.spec.ts
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Get test spec from command line arguments
const testSpec = process.argv[2] || '';

console.log('🧪 Running Playwright E2E tests...');
console.log(`Test spec: ${testSpec || 'all tests'}`);
console.log(`Working directory: ${rootDir}`);

// Use the current node executable
const NODE_EXEC = process.execPath;
const PLAYWRIGHT_CLI = join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');

const args = ['test'];
if (testSpec) {
  args.push(testSpec);
}

console.log(`Command: ${PLAYWRIGHT_CLI} ${args.join(' ')}`);

const playwrightProcess = spawn(NODE_EXEC, [PLAYWRIGHT_CLI, ...args], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    // Ensure node is in PATH for subprocess
    PATH: `${process.env.PATH}:${join(process.execPath, '..')}`,
  },
});

playwrightProcess.on('error', (err) => {
  console.error('❌ Failed to run Playwright:', err);
  process.exit(1);
});

playwrightProcess.on('exit', (code) => {
  console.log(`Playwright exited with code ${code}`);
  process.exit(code ?? 0);
});

// Handle signals
const shutdownHandler = (signal) => {
  console.log(`Received ${signal}, shutting down Playwright...`);
  playwrightProcess.kill('SIGTERM');
};

process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
process.on('SIGINT', () => shutdownHandler('SIGINT'));
