/**
 * Capture the PWA assets from the running dev server (HTTPS, self-signed).
 *
 * Generates in public/:
 *   - og-image.png            1920×1080  (dark theme, app mounted, modal closed)
 *   - screenshot-wide.png     1280×720   (manifest wide screenshot)
 *   - screenshot-narrow.png   750×1334   (manifest narrow screenshot, mobile layout)
 *   - icon-512.png / icon-192.png / apple-touch-icon.png  (favicon.svg rasterized)
 *
 * Usage:  node scripts/capture-pwa-assets.mjs [baseUrl]
 *   baseUrl defaults to https://localhost:5173 (pass the LAN URL for a
 *   different instance). Requires Playwright browsers (pnpm run e2e:install).
 *
 * Rationale: these five files are referenced by index.html and manifest.json
 * but are not reproducible from source — they are screenshots of the running
 * app. Re-run this script on every release that changes the UI (the og-image
 * must always show the deployed version badge).
 */
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'https://localhost:5173';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60000 });
// App mounted = the boot splash (self-fading) has been removed by React.
await page.waitForFunction(() => !document.getElementById('boot-splash'), null, { timeout: 60000 });
// Close the first-run welcome modal if it opened (fresh browser profile).
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// Dark theme for the og-image (on-brand, matches the diagram colors).
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(600);

await page.screenshot({ path: 'public/og-image.png', type: 'png' });
console.log('og-image.png OK');

await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/screenshot-wide.png', type: 'png' });
console.log('screenshot-wide.png OK');

await page.setViewportSize({ width: 750, height: 1334 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'public/screenshot-narrow.png', type: 'png' });
console.log('screenshot-narrow.png OK');

// Icons: rasterize favicon.svg at the three required sizes (the SVG has a
// 24×24 viewBox and no fixed width/height, so it scales to the viewport).
await page.setViewportSize({ width: 512, height: 512 });
await page.goto(`${base}/favicon.svg`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/icon-512.png' });
await page.setViewportSize({ width: 192, height: 192 });
await page.screenshot({ path: 'public/icon-192.png' });
await page.setViewportSize({ width: 180, height: 180 });
await page.screenshot({ path: 'public/apple-touch-icon.png' });
console.log('icons OK (512 / 192 / 180)');

await browser.close();
console.log('All PWA assets captured into public/');
