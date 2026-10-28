import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: { ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:5173',
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
  // webServer.command MUST be cross-platform: `node scripts/dev-e2e.mjs` works
  // on the Linux CI runners (node is on PATH there) and locally under
  // PowerShell/cmd. NEVER put an absolute node path here: it breaks the Linux
  // runners. Locally (Git Bash PATH issue), you may still start the server
  // manually first — reuseExistingServer (true when !CI) reuses it.
  webServer: {
    command: 'node scripts/dev-e2e.mjs',
    url: 'https://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
