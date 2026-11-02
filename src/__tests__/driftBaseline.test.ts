import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as metadataSurfaces.test.ts / crawlableShell.test.ts.
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Drift baseline fs gates (MON-01) — the committed drift-baseline-*.json
 * fixture (exported verbatim from the claude-seo drift SQLite store) must
 * agree with the two source documents it baselines: index.html (EN route)
 * and public/fr/index.html (FR shell). This is what makes the baseline an
 * ACTIVE PR-time net instead of a passive record: an edit to the title,
 * canonical, meta description, h1, the h2 list, the OG tags or the JSON-LD
 * identity set fails here, before deploy.
 *
 * Design note: every anchor is DERIVED at test runtime from the two source
 * documents — the suite hand-transcribes zero site literals, never fetches
 * the network, and never reads the machine-local drift DB.
 *
 * Token-immune by construction: index.html carries the vite placeholder in
 * its JSON-LD softwareVersion while the capture holds the build-substituted
 * value, so softwareVersion is NEVER compared — the schema gates pin the
 * @type set and the version-independent identity keys (name, url,
 * codeRepository, sameAs).
 */
const ROOT = resolve(__dirname, '../..');
const read = (p: string): string => readFileSync(p, 'utf8');
// File-aware absence check: resolve(ROOT, '') lands on the repo dir itself
// (existsSync true, EISDIR at read), so absence is decided by stat, not path.
const readIf = (p: string): string => {
  if (p === '' || !existsSync(p) || !statSync(p).isFile()) return '';
  return read(p);
};

// The capture stores element TEXT (HTML entities decoded), while index.html
// bytes carry `&amp;` in the h1 — entities are decoded on BOTH sides before
// any comparison. This decoding is the whole EN h1 gate: without it the
// byte-faithful capture and the source document disagree on one glyph.
// `&amp;` is replaced LAST so already-decoded text is never re-decoded.
const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
const stripTags = (s: string): string => decodeEntities(s.replace(/<[^>]*>/g, '')).trim();
const text = (html: string, re: RegExp): string => html.match(re)?.[1] ?? '';

// Trailing-slash-normalized URL compare: the drift tool stores the FR route
// as /fr (it normalizes /fr/ away) while the FR document's canonical link
// carries the trailing slash — raw-string comparison would fail by design.
const normUrl = (u: string): string => u.replace(/\/$/, '');

const enHtml = read(resolve(ROOT, 'index.html'));
const frHtml = read(resolve(ROOT, 'public', 'fr', 'index.html'));

// Single-source anchors, derived from the documents under test:
const enCanonical = text(enHtml, /<link rel="canonical" href="([^"]+)"/);
const frCanonical = text(frHtml, /<link rel="canonical" href="([^"]+)"/);
const enTitle = text(enHtml, /<title>([^<]*)<\/title>/);
const frTitle = text(frHtml, /<title>([^<]*)<\/title>/);
const enDesc = text(enHtml, /<meta name="description" content="([^"]*)"/);
const frDesc = text(frHtml, /<meta name="description" content="([^"]*)"/);
const enH1 = stripTags(text(enHtml, /<h1>([\s\S]*?)<\/h1>/));
const frH1 = stripTags(text(frHtml, /<h1>([\s\S]*?)<\/h1>/));
const h2Texts = (html: string): string[] =>
  [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => stripTags(m[1]));
// All property-carrying metas (og:* AND twitter:*) — whichever subset the
// capture stored, every stored pair must match the document it came from.
const propMetas = (html: string): Record<string, string> =>
  Object.fromEntries(
    [...html.matchAll(/<meta property="([^"]+)" content="([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
const jsonLdOf = (html: string): Record<string, any> =>
  JSON.parse(text(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || '{}');
// The drift tool stores schema_json as a JSON-encoded ARRAY of JSON-LD blocks
// (its summary reports schema_count) — normalize to an array before comparing;
// the local documents each carry exactly one inline block.
const schemasOf = (encoded: string): Array<Record<string, any>> => {
  const parsed = JSON.parse(encoded);
  return Array.isArray(parsed) ? parsed : [parsed];
};
const typeSet = (schema: Record<string, any>): string[] =>
  [schema['@type']].flat().filter(Boolean).sort();
const sameAsSet = (schema: Record<string, any>): string[] =>
  [...(schema.sameAs ?? [])].map(String).sort();
const unprefixOg = (k: string): string => k.replace(/^og:/, '');

// Fixture discovery: prefix glob over the fixtures dir, so a future dated
// re-capture (drift-baseline-YYYY-MM-DD.json) swaps in cleanly. With the
// fixture absent this resolves to a named MISSING file and readFileSync
// fails naming it — the RED state this suite was first observed in.
const fixtureDir = resolve(__dirname, 'fixtures');
const fixtureName =
  readdirSync(fixtureDir).find((f: string) => /^drift-baseline-.*\.json$/.test(f)) ??
  'MISSING-drift-baseline.json';
const fixturePath = resolve(fixtureDir, fixtureName);
const rawFixture = readIf(fixturePath);
const rows: Array<Record<string, any>> = JSON.parse(rawFixture || '[]');

const normRowUrl = (r: Record<string, any>): string => normUrl(String(r.url ?? ''));
// Named row resolution: a missing route row throws HERE (module scope) with a
// message naming the canonical it failed to find — the RED state this suite
// was first observed in — instead of undefined leaking into every gate.
const rowFor = (canonical: string, side: string): Record<string, any> => {
  const row = rows.find((r) => normRowUrl(r) === normUrl(canonical));
  if (!row) {
    throw new Error(`drift fixture: no ${side} row matching ${canonical} (slash-normalized) — capture/export not run?`);
  }
  return row;
};
const enRow = rowFor(enCanonical, 'EN');
const frRow = rowFor(frCanonical, 'FR');

describe('drift baseline fixture (MON-01)', () => {
  it('a drift-baseline fixture exists and carries exactly the two captured routes', () => {
    expect(
      fixtureName,
      'drift-baseline-*.json fixture must exist in src/__tests__/fixtures (capture + export not run?)',
    ).not.toContain('MISSING');
    expect(rawFixture, 'the fixture file must not be empty').not.toBe('');
    expect(rows, `the fixture must be a JSON array of exactly 2 rows (EN + FR), got ${rows.length}`).toHaveLength(2);
    expect(enRow, `a row must match the EN canonical ${enCanonical} (slash-normalized)`).toBeTruthy();
    expect(frRow, `a row must match the FR canonical ${frCanonical} (slash-normalized)`).toBeTruthy();
    expect(
      enRow.id,
      'the EN and FR rows must be two distinct captures (distinct baseline ids)',
    ).not.toBe(frRow.id);
  });

  it('exactly one drift-baseline-*.json fixture exists (discovery glob gate)', () => {
    const matches = readdirSync(fixtureDir).filter((f: string) =>
      /^drift-baseline-.*\.json$/.test(f),
    );
    expect(
      matches,
      `the fixture glob must resolve exactly ONE drift-baseline-*.json (found: ${
        matches.join(', ') || '(none)'
      }); with two matches the discovery's unsorted readdirSync(...).find() picks arbitrarily, so the suite could silently test the OLD fixture while green`,
    ).toHaveLength(1);
  });

  it('both captured rows recorded a 200 status from the fixed production state', () => {
    expect(Number(enRow.status_code), 'EN capture status_code').toBe(200);
    expect(Number(frRow.status_code), 'FR capture status_code').toBe(200);
  });

  it('EN row agrees with index.html — title, meta description, canonical', () => {
    expect(enRow.title, 'EN captured title must equal the index.html <title> text').toBe(enTitle);
    expect(
      enRow.meta_description,
      'EN captured meta_description must equal the index.html description meta content',
    ).toBe(enDesc);
    expect(
      normUrl(String(enRow.canonical)),
      'EN captured canonical must equal the index.html canonical link (slash-normalized)',
    ).toBe(normUrl(enCanonical));
  });

  it('EN row h1 agrees with index.html (HTML entities decoded on both sides)', () => {
    expect(
      decodeEntities(String(enRow.h1)),
      'captured h1 (decoded) must equal the index.html h1 text (decoded — the bytes carry &amp;)',
    ).toBe(decodeEntities(enH1));
  });

  it('EN row h2 list agrees with index.html in document order', () => {
    const rowH2: string[] = JSON.parse(enRow.h2_json);
    expect(rowH2, 'captured h2_json must equal the index.html h2 texts in document order').toEqual(
      h2Texts(enHtml),
    );
  });

  it('EN row OG pairs match the index.html metas for every stored property', () => {
    const rowOg: Record<string, string> = JSON.parse(enRow.og_json);
    const localOg = propMetas(enHtml);
    expect(Object.keys(rowOg).length, 'the capture stored og pairs').toBeGreaterThan(0);
    for (const [key, value] of Object.entries(rowOg)) {
      const local = localOg[key] ?? localOg[unprefixOg(key)] ?? localOg[`og:${unprefixOg(key)}`];
      expect(local, `og pair ${key} stored by the capture must match index.html`).toBe(value);
    }
  });

  it('EN row JSON-LD identity set matches index.html (token-immune: softwareVersion never compared)', () => {
    // The local document carries the vite placeholder as softwareVersion while
    // the capture holds the build-substituted value — that key is deliberately
    // outside this contract (research Pitfall 1 / phase-30 token-immunity).
    const captured = schemasOf(enRow.schema_json);
    expect(captured.length, 'the capture stored the single index.html JSON-LD block').toBe(1);
    const schema = captured[0];
    const localSchema = jsonLdOf(enHtml);
    expect(typeSet(schema), 'schema @type set must match the index.html JSON-LD').toEqual(
      typeSet(localSchema),
    );
    expect(schema.name, 'schema name must match').toBe(localSchema.name);
    expect(schema.url, 'schema url must match').toBe(localSchema.url);
    expect(schema.codeRepository, 'schema codeRepository must match').toBe(localSchema.codeRepository);
    expect(sameAsSet(schema), 'schema sameAs set must match').toEqual(sameAsSet(localSchema));
  });
});

describe('FR drift row (phase-31 continuity)', () => {
  it('FR row agrees with public/fr/index.html — title, description, canonical, h1, h2 list', () => {
    expect(frRow.title, 'FR captured title must equal the FR shell <title> text').toBe(frTitle);
    expect(
      frRow.meta_description,
      'FR captured meta_description must equal the FR shell description meta content',
    ).toBe(frDesc);
    expect(
      normUrl(String(frRow.canonical)),
      'FR captured canonical must equal the FR canonical link (trailing slash normalized — the tool stores /fr)',
    ).toBe(normUrl(frCanonical));
    expect(decodeEntities(String(frRow.h1)), 'FR captured h1 (decoded) must equal the FR shell h1').toBe(
      decodeEntities(frH1),
    );
    const rowH2: string[] = JSON.parse(frRow.h2_json);
    expect(rowH2, 'FR captured h2_json must equal the FR shell h2 texts in document order').toEqual(
      h2Texts(frHtml),
    );
  });

  it('FR row JSON-LD carries NO softwareVersion key at all (T-31-03 omission pinned, not just tolerated)', () => {
    const captured = schemasOf(frRow.schema_json);
    expect(captured.length, 'the capture stored the single FR JSON-LD block').toBe(1);
    const schema = captured[0];
    expect(schema, 'FR schema_json must parse to an object').toBeTruthy();
    expect(
      Object.keys(schema),
      'the captured FR JSON-LD must omit softwareVersion entirely (phase-31 decision — a public/ file would serve the placeholder literally)',
    ).not.toContain('softwareVersion');
    expect(
      'softwareVersion' in jsonLdOf(frHtml),
      'the local FR shell JSON-LD must also omit softwareVersion — if this flips, the omission documented at public/fr/index.html drifted',
    ).toBe(false);
  });
});

describe('negative-artifact gate (T-32-01/P1)', () => {
  // The export is the only bridge from the machine-local drift store to the
  // public repo: the committed fixture carries public served-page metadata
  // ONLY. Each banned string is a machine-local path/artifact shape that must
  // never appear in the committed bytes.
  const banned: Array<[string, string]> = [
    ['~/.cache', 'user-cache path'],
    ['baselines.db', 'drift SQLite filename'],
    ['C:\\', 'Windows drive-letter path'],
    ['/home/', 'POSIX home path'],
    ['/Users/', 'macOS home path'],
  ];
  it.each(banned)('the committed fixture carries no %s (%s)', (needle) => {
    expect(rawFixture, `machine-local artifact "${needle}" must never enter the committed fixture`).not.toContain(
      needle,
    );
  });
});
