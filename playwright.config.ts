import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // Local development flow: Run `node scripts/dev-e2e.mjs` first, then `npm run test:e2e`.
  // reuseExistingServer avoids the Windows subshell node-PATH spawn issue.
  webServer: {
    command: '"C:\\Users\\jerem\\scoop\\apps\\nodejs-lts\\current\\node.exe" scripts/dev-e2e.mjs', // Absolute node path for Windows
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // Reuse script-started server in local dev
    timeout: 120000,
  },
});
