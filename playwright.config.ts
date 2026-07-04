import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
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
  // webServer.command MUST be cross-platform: `npm run dev` works on the Linux
  // CI runners (node is on PATH there) and locally under PowerShell/cmd.
  // For the Git Bash local flow (where `npm run dev` hits a node-PATH issue),
  // start the server manually first with `node scripts/dev-e2e.mjs` —
  // reuseExistingServer (true when !CI) will reuse it instead of spawning
  // another. NEVER put an absolute node path here: it breaks the Linux runners.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
