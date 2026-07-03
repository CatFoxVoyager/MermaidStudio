/**
 * DEV-ONLY: Vite Launcher for E2E Tests
 *
 * This script exists SOLELY to bypass Windows subshell PATH issues when running
 * Playwright E2E tests. It launches the Vite dev server via a direct node invocation,
 * avoiding the "node not found" error that occurs in Playwright's webServer subshell.
 *
 * IMPORTANT: This is a development tool only. It adds ZERO runtime dependencies.
 * The canonical production dev command remains `npm run dev` — DO NOT change that.
 *
 * Usage: node scripts/dev-e2e.mjs
 * Purpose: Start dev server on :5173 before running E2E tests with `npm run test:e2e`
 *
 * Technical notes:
 * - Uses `process.execPath` to spawn the current node binary (portable across machines)
 * - Resolves vite bin relative to repo root (no hardcoded paths)
 * - Forwards signals for graceful shutdown
 * - Propagates exit codes for proper test failure handling
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Use the current node executable (portable; avoids machine-specific absolute paths)
const NODE_EXEC = process.execPath;
const VITE_BIN = join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

console.log('🚀 Starting Vite dev server for E2E tests...');
console.log(`Node: ${NODE_EXEC}`);
console.log(`Vite: ${VITE_BIN}`);
console.log(`Working directory: ${rootDir}`);

const viteProcess = spawn(NODE_EXEC, [VITE_BIN], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
  },
});

// Handle spawn errors
viteProcess.on('error', (err) => {
  console.error('❌ Failed to start Vite:', err);
  process.exit(1);
});

// Forward exit code
viteProcess.on('exit', (code) => {
  console.log(`Vite exited with code ${code}`);
  process.exit(code ?? 0);
});

// Graceful shutdown: forward signals to the child process
const shutdownHandler = (signal) => {
  console.log(`Received ${signal}, shutting down Vite...`);
  viteProcess.kill('SIGTERM');
};

process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
process.on('SIGINT', () => shutdownHandler('SIGINT'));
