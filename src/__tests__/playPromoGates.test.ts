import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) — same convention as trustCopy.test.ts
// and buildTarget.test.ts.
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join, relative } from 'path';

/**
 * Play-promo fs gates (v1.7 Phase 34).
 *
 * The Android app is LIVE on Google Play (com.mermaidstudio.net, 2026-11-01),
 * so every "coming soon" Android copy is now FALSE. PROM-03 retires it
 * everywhere — catalogs AND the hardcoded t() fallback literals (a catalog
 * -only gate passes vacuously while the fallback still renders: i18next
 * shows the fallback when the key is missing, so the literal IS user-visible
 * copy). PROM-05 pins the committed badge bytes so the shipped art can never
 * silently drift or be replaced. These gates read the source bytes directly.
 */

const ROOT = resolve(__dirname, '../..');

// D1 census — class-scoped on purpose. A bare "coming soon" phrase ban would
// fail the truthful AISettingsModal hardware-tier chip
// (src/components/ai/AISettingsModal.tsx:179 — that tier genuinely is not
// available yet and is unrelated to Android). The banned class is exactly the
// four Android-copy literals: the retired catalog key plus the three retired
// value fragments (EN note, FR menu line, FR note).
const BANNED_ANDROID_COPY =
  /androidComingSoon|coming soon to Google Play|arrive bientôt|bientôt sur Google Play/g;

function censusMatches(source: string): string[] {
  return source.match(BANNED_ANDROID_COPY) ?? [];
}

/**
 * Recursive walk of src/ limited to .ts/.tsx/.json with every path containing
 * `__tests__` excluded: test files legitimately cite retired copy (expected
 * strings, gate failure messages) and this gate's own regex literal above
 * must never self-match.
 */
function walkSrcFiles(dir: string): Array<[string, string]> {
  const files: Array<[string, string]> = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (full.includes('__tests__')) continue;
    if (statSync(full).isDirectory()) {
      files.push(...walkSrcFiles(full));
    } else if (/\.(ts|tsx|json)$/.test(entry)) {
      files.push([relative(ROOT, full), readFileSync(full, 'utf8')]);
    }
  }
  return files;
}

// The four named emission sites (the human-readable anchors): both catalogs
// and both components. The banner's fallback literal renders when the key is
// missing — sweeping the catalogs alone would leave false copy on screen.
const NAMED_SOURCES: Array<[string, string]> = (
  [
    'src/i18n/locales/en.json',
    'src/i18n/locales/fr.json',
    'src/components/mobile/MobileMenuSheet.tsx',
    'src/components/shared/MobileUpsellBanner.tsx',
  ] as const
).map((rel) => [rel, readFileSync(join(ROOT, rel), 'utf8')]);

describe('D1 Android coming-soon copy census (PROM-03)', () => {
  it('finds zero retired copy at the four named emission sites', () => {
    const offenders = NAMED_SOURCES.flatMap(([name, source]) =>
      censusMatches(source).map((match) => `${name}: "${match}"`),
    );
    // Count assertion (not toEqual([])): the scalar keeps the TAP diagnostic
    // single-line; the joined offender list lives in the failure message.
    expect(
      offenders.length,
      `PROM-03: retired Android coming-soon copy survives at ${offenders.length} named ` +
        `site(s): ${offenders.join(' | ')}. The app is live on Google Play — this copy is ` +
        `false now. Remove the key/value (and, in components, the t() fallback literal).`,
    ).toBe(0);
  });

  it('finds zero retired copy across the recursive src/ walk (ts/tsx/json, __tests__ excluded)', () => {
    const offenders = walkSrcFiles(join(ROOT, 'src')).flatMap(([path, source]) =>
      censusMatches(source).map((match) => `${path}: "${match}"`),
    );
    expect(
      offenders.length,
      `PROM-03: retired Android coming-soon copy survives at ${offenders.length} src/ ` +
        `site(s): ${offenders.join(' | ')}. The census is class-scoped — never ban the bare ` +
        `phrase "coming soon" (the AISettingsModal hardware-tier chip is truthful copy).`,
    ).toBe(0);
  });
});

// D5 — badge asset integrity + hot-link ban (PROM-05, T-34-03). The committed
// badge PNGs ship verbatim to every visitor (repo assets → production CDN is
// the trust boundary), so their bytes ARE the boundary: exact byte pins +
// magic + IHDR dimensions are tamper detection. Existence-only checks are
// vacuous — a truncated or text-renamed file would pass them.
const PNG_MAGIC_HEX = '89504e470d0a1a0a';
const BADGES: Array<{ file: string; url: string; bytes: number }> = [
  {
    file: join(ROOT, 'public/badges/google-play-badge-en.png'),
    url: 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png',
    bytes: 4904,
  },
  {
    file: join(ROOT, 'public/badges/google-play-badge-fr.png'),
    url: 'https://play.google.com/intl/fr_fr/badges/static/images/badges/fr_badge_web_generic.png',
    bytes: 18061,
  },
];

const REBASELINE_NOTE =
  'Repair = deliberate re-download from the OFFICIAL generator URL above, then ' +
  're-pin the NEW byte length in this gate deliberately (never loosen silently to match ' +
  'drifted bytes). Recoloring, cropping, or third-party substitutes are never valid repairs.';

// Hot-linked badge ban: the pattern is anchored to the img-src SHAPE (an img
// tag whose src attribute starts https and names the badge host), not the
// bare domain — the legitimate PLAY_STORE_URL constant in
// src/constants/playStore.ts contains play.google.com outside any img tag
// and must stay green.
const HOTLINKED_BADGE_IMG = /<img\b[^>]*\bsrc\s*=\s*["']https:[^"']*play\.google\.com/;

describe('D5 badge asset integrity + hot-link ban (PROM-05)', () => {
  it('finds both committed badge PNGs', () => {
    for (const badge of BADGES) {
      expect(
        existsSync(badge.file),
        `PROM-05: committed badge missing at public/badges/${badge.file.split('-').pop()} — both official variants (EN + FR) must be committed`,
      ).toBe(true);
    }
  });

  it('carries PNG magic bytes, IHDR 646x250, and the exact probed byte lengths', () => {
    for (const badge of BADGES) {
      const buf = readFileSync(badge.file);
      const name = badge.file.split('/').pop();
      expect(
        buf.length,
        `T-34-03: ${name} is ${buf.length} bytes (pin: ${badge.bytes}). The committed badge ` +
          `bytes ship verbatim to every visitor — the pin is tamper detection. ${REBASELINE_NOTE}`,
      ).toBe(badge.bytes);
      expect(
        buf.subarray(0, 8).toString('hex'),
        `T-34-03: ${name} lost the PNG magic bytes (89 50 4E 47 0D 0A 1A 0A) — the file is ` +
          `not a real PNG. ${REBASELINE_NOTE}`,
      ).toBe(PNG_MAGIC_HEX);
      expect(
        buf.readUInt32BE(16),
        `T-34-03: ${name} IHDR width is ${buf.readUInt32BE(16)} (pin: 646). ${REBASELINE_NOTE}`,
      ).toBe(646);
      expect(
        buf.readUInt32BE(20),
        `T-34-03: ${name} IHDR height is ${buf.readUInt32BE(20)} (pin: 250). ${REBASELINE_NOTE}`,
      ).toBe(250);
    }
  });

  it('finds zero img tags hot-linking play.google.com in the src/ walk', () => {
    const offenders = walkSrcFiles(join(ROOT, 'src')).flatMap(([path, source]) =>
      (source.match(HOTLINKED_BADGE_IMG) ?? []).map((match) => `${path}: "${match}"`),
    );
    expect(
      offenders.length,
      `PROM-05: hot-linked Play badge img src survives at ${offenders.length} src/ ` +
        `site(s): ${offenders.join(' | ')}. Badges are committed under public/badges/ — ` +
        `hot-linking is COEP-fragile under require-corp and drift-prone (Google retires art). ` +
        `Serve the local /badges/ asset.`,
    ).toBe(0);
  });
});

// D6 — spacing rhythm (PROM-04). The items wrapper must separate rows by
// spacing ONLY: the divide-y class AND its inline borderColor style both go
// (a class-only removal leaves a dead style prop and a vacuous green —
// partial-removal pitfall), space-y-1 gains, and every row keeps py-3.5 so
// the rounded-xl hover pills read as distinct rows with 4px gaps.
const MENU_SHEET_SRC = readFileSync(
  join(ROOT, 'src/components/mobile/MobileMenuSheet.tsx'),
  'utf8',
);
// String.match returns null at zero occurrences — a bare .length on that is
// undefined, which silently breaks exact-count assertions; ?? [] normalizes.
const countOccurrences = (source: string, pattern: RegExp) =>
  (source.match(pattern) ?? []).length;

describe('D6 menu-sheet spacing rhythm (PROM-04)', () => {
  it('separates rows by spacing rhythm only (no divide-y, no border-subtle token)', () => {
    const counts = {
      divideY: countOccurrences(MENU_SHEET_SRC, /divide-y/g),
      borderSubtle: countOccurrences(MENU_SHEET_SRC, /border-subtle/g),
      spaceY1Wrapper: countOccurrences(MENU_SHEET_SRC, /className="space-y-1"/g),
      py35Rows: countOccurrences(MENU_SHEET_SRC, /py-3\.5/g),
    };
    expect(
      counts,
      `PROM-04: the menu-sheet wrapper must separate rows by spacing rhythm only — ` +
        `divide-y=0 AND border-subtle=0 (both mechanisms go, never the class alone), ` +
        `className="space-y-1"=1 on the items wrapper, py-3.5=9 (8 rows + the promo anchor).`,
    ).toEqual({ divideY: 0, borderSubtle: 0, spaceY1Wrapper: 1, py35Rows: 9 });
  });
});
