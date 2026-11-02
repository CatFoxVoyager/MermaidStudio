import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims — same
// convention as trustCopy.test.ts (import.meta.url/URL tricks broke under
// this vitest transform on Windows, obs 5816).
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Inverted cookieless census (36-01, GA4-04 + GA4-06 + the GA4-03
 * shell/llms disclosure pins + the loader wiring pin).
 *
 * STATE.md names the worst failure mode: shipping stock GA4 (cookie-writing)
 * while any surface still says "cookieless". This census makes that
 * regression fail the suite instead of shipping silently:
 * - GA4-06: the tracker hostnames are banned from the three zero-JS trust
 *   surfaces forever (a hand-edited static head tag fails here). The
 *   literals are hostname-shaped, so copy that names "Google Analytics 4"
 *   (spaced) cannot trip them. Ban scope is exactly these surfaces — src/
 *   legitimately names the host in the lazy loader, and vercel.json/test
 *   files carry it inside the CSP value.
 * - GA4-04: the loader source must carry the consent-denied default and
 *   zero granted consent values anywhere (comments included) — a stock-GA4
 *   swap fails here. The behavioral ordering invariant stays owned by
 *   src/lib/analytics/__tests__/ga4.test.ts; no source-order pin duplicated.
 * - GA4-03: the shells and llms.txt must name consent-denied GA4 (the
 *   copy-truth half; PRIVACY.md/privacy.html byte ownership stays with
 *   trustCopy).
 * - Wiring: the loader is invoked post-mount from App.tsx, never orphaned.
 */
const ROOT = resolve(__dirname, '../..');
const ZERO_JS_SURFACES = [
  'index.html',
  'public/fr/index.html',
  'public/privacy.html',
];
const TRACKER_LITERALS = ['googletagmanager', 'google-analytics'];

function read(repoPath: string): string {
  return readFileSync(resolve(ROOT, repoPath), 'utf8');
}

describe('GA4-06 tracker ban in the zero-JS trust surfaces', () => {
  for (const surface of ZERO_JS_SURFACES) {
    for (const tracker of TRACKER_LITERALS) {
      it(`${surface} carries zero "${tracker}" literals`, () => {
        const src = read(surface);
        expect(
          src.split(tracker).length - 1,
          `GA4-06: "${tracker}" found in ${surface} — GA4 must never enter the zero-JS trust surfaces; the only allowed injection site is the lazy consent-denied loader`,
        ).toBe(0);
      });
    }
  }
});

describe('GA4-04 loader posture (inverted cookieless census)', () => {
  const ga4 = read('src/lib/analytics/ga4.ts');

  it("pins the consent-denied default: analytics_storage: 'denied' present", () => {
    expect(
      ga4.includes("analytics_storage: 'denied'"),
      "GA4-04: the consent-denied default analytics_storage: 'denied' is missing — a loader without a consent default is a stock-GA4 regression",
    ).toBe(true);
  });

  it('carries zero granted consent values anywhere (comments included)', () => {
    expect(
      (ga4.match(/granted/g) ?? []).length,
      'GA4-04: a consent value was granted — stock-GA4 (cookie-writing) regression while the surfaces say cookieless',
    ).toBe(0);
  });
});

describe('GA4-03 disclosure pins (shells + llms.txt)', () => {
  it('EN shell names consent-denied Google Analytics 4', () => {
    expect(
      read('index.html'),
      'GA4-03: the EN shell privacy answer must name consent-denied GA4 — silent analytics would falsify the disclosure posture',
    ).toContain('consent-denied Google Analytics 4');
  });

  it('FR shell names Google Analytics 4 en consentement refusé', () => {
    expect(
      read('public/fr/index.html'),
      'GA4-03: the FR shell privacy answer must name consent-denied GA4',
    ).toContain('Google Analytics 4 en consentement refusé');
  });

  it('llms.txt names Google Analytics 4 in consent-denied', () => {
    expect(
      read('public/llms.txt'),
      'GA4-03: the LLM-facing surface must carry the GA4 disclosure line (generator: scripts/generate-sitemap.mjs)',
    ).toContain('Google Analytics 4 in consent-denied');
  });
});

describe('loader wiring pin (post-mount invocation)', () => {
  it('App.tsx dynamically imports the loader via the pinned specifier', () => {
    expect(
      read('src/App.tsx').includes('@/lib/analytics/ga4'),
      'GA4-01: the loader must be invoked post-mount from App.tsx — an orphaned module never loads and the app silently loses disclosure-backed measurement',
    ).toBe(true);
  });
});
