/**
 * Capture the PWA assets from the running dev server (HTTPS, self-signed).
 *
 * Generates in public/:
 *   - og-image.png            1200x630  (composed share card — NO version badge)
 *   - screenshot-wide.png     1280x720   (manifest wide screenshot)
 *   - screenshot-narrow.png   750x1334   (manifest narrow screenshot, mobile layout)
 *   - icon-512.png / icon-192.png / apple-touch-icon.png  (favicon.svg rasterized)
 *
 * Usage:  node scripts/capture-pwa-assets.mjs [baseUrl]
 *   baseUrl defaults to https://localhost:5173 (pass the LAN URL for a
 *   different instance). Requires Playwright browsers (pnpm run e2e:install).
 *
 * Rationale: the app screenshots are not reproducible from source — they are
 * screenshots of the running app; re-run this script on every release that
 * changes the UI. The og-image is NOT a raw app screenshot: it is a composed
 * share card rendered via page.setContent (META-02) — deliberately WITHOUT a
 * baked version badge (the old badge policy guaranteed staleness: v0.9.0
 * shipped for months). The version lives in the JSON-LD softwareVersion and
 * the page badge, never inside the PNG. The card DOM is fully self-contained
 * — system font stack, inline SVG, zero external resource references
 * (T-30-02) — so no third-party content can ride into the brand asset.
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

// --- og-image: composed 1200x630 share card (META-02, badge-free — T-30-02) ---
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0">
    <div style="width:1200px;height:630px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;background:radial-gradient(ellipse at 50% 118%, #16324e 0%, #0d1117 62%);color:#e6edf3;font-family:Inter,'Segoe UI',system-ui,sans-serif">
      <div style="font-size:92px;font-weight:650;letter-spacing:-1px">Mermaid<span style="color:#58a6ff">Studio</span></div>
      <div style="font-size:30px;color:#adbac7;max-width:900px;text-align:center;line-height:1.4">Free, open-source Mermaid diagram editor — the AI runs locally in your browser (WebGPU)</div>
      <svg width="640" height="190" viewBox="0 0 640 190" fill="none" aria-hidden="true">
        <rect x="12" y="65" width="168" height="60" rx="12" fill="#161b22" stroke="#3fb950" stroke-width="2"/>
        <text x="96" y="101" text-anchor="middle" font-size="22" fill="#e6edf3" font-family="system-ui,sans-serif">graph TD</text>
        <path d="M 180 95 H 236" stroke="#3fb950" stroke-width="2.5"/>
        <polygon points="236,88 250,95 236,102" fill="#3fb950"/>
        <polygon points="330,20 412,95 330,170 248,95" fill="#161b22" stroke="#a371f7" stroke-width="2"/>
        <text x="330" y="103" text-anchor="middle" font-size="24" fill="#e6edf3" font-family="system-ui,sans-serif">ok?</text>
        <path d="M 412 95 H 468" stroke="#a371f7" stroke-width="2.5"/>
        <polygon points="468,88 482,95 468,102" fill="#a371f7"/>
        <rect x="486" y="65" width="142" height="60" rx="12" fill="#161b22" stroke="#58a6ff" stroke-width="2"/>
        <text x="557" y="101" text-anchor="middle" font-size="22" fill="#e6edf3" font-family="system-ui,sans-serif">render</text>
      </svg>
    </div>
  </body>
</html>`);
await page.waitForTimeout(600);
await page.screenshot({ path: 'public/og-image.png', type: 'png' });
console.log('og-image.png OK (1200x630 composed card)');

// setContent replaced the document — restore the app page for the manifest
// screenshots (full boot flow again: mount, modal dismissal, dark theme).
await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => !document.getElementById('boot-splash'), null, { timeout: 60000 });
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// Dark theme for the app screenshots (on-brand, matches the diagram colors).
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(600);

await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/screenshot-wide.png', type: 'png' });
console.log('screenshot-wide.png OK');

await page.setViewportSize({ width: 750, height: 1334 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'public/screenshot-narrow.png', type: 'png' });
console.log('screenshot-narrow.png OK');

// Icons: rasterize favicon.svg at the three required sizes (the SVG has a
// 24x24 viewBox and no fixed width/height, so it scales to the viewport).
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
