import { defineConfig, devices } from '@playwright/test';

// Cross-Browser Tests (e2e-tests.yml) exports PLAYWRIGHT_BROWSER so each of
// its 5 matrix legs runs exactly one browser project. Before 2026-11-16 the
// variable was never read here: every leg ran the FULL chromium+firefox+webkit
// suite (~35 min x 5) on the single sequential self-hosted runner. Combined
// with concurrent Renovate PRs this saturated the runner — jobs queued 2-5 h,
// the local dev server starved of CPU, and random 30 s page.goto /
// networkidle timeouts hit a different leg on every run (evidence: run
// 43296280192 "edge" leg = 1 failed + 4 flaky, all goto/networkidle timeouts,
// with firefox/webkit projects inside the edge leg).
// edge/chrome map to the `chromium` project: branded channels were never
// installed on the runner, so those legs were already exercising plain
// Chromium — this preserves the effective coverage while removing the x3
// duplicate work. Adding real channel coverage needs `playwright install
// chrome msedge` on the runner image first.
const browserLeg = process.env.PLAYWRIGHT_BROWSER;
const legProjects: Record<string, string[]> = {
  chromium: ['chromium'],
  firefox: ['firefox'],
  webkit: ['webkit'],
  edge: ['chromium'],
  chrome: ['chromium'],
};
if (browserLeg && !legProjects[browserLeg]) {
  throw new Error(`Unknown PLAYWRIGHT_BROWSER leg: ${browserLeg}`);
}
const legFilter = browserLeg ? legProjects[browserLeg] : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 1 : undefined,
  // 60 s in CI: the sequential self-hosted runner runs the dev server and the
  // browser on the same machine, and under PR contention a cold page.goto +
  // networkidle can exceed the 30 s default (the recurring flaky signature).
  timeout: process.env.CI ? 60_000 : 30_000,
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
  ].filter((project) => !legFilter || legFilter.includes(project.name)),
  // webServer.command MUST be cross-platform: `node scripts/dev-e2e.mjs` works
  // on the Linux CI runners (node is on PATH there) and locally under
  // PowerShell/cmd. NEVER put an absolute node path here: it breaks the Linux
  // runners. Locally (Git Bash PATH issue), you may still start the server
  // manually first — reuseExistingServer (true when !CI) reuses it.
  webServer: {
    command: 'node scripts/dev-e2e.mjs',
    url: 'https://localhost:5173',
    // The health probe does NOT inherit use.ignoreHTTPSErrors — without this,
    // it rejects the self-signed cert (workflow-generated) and times out.
    ignoreHTTPSErrors: true,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
