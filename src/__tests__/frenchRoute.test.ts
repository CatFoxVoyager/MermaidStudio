import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) — the same convention as
// crawlableShell.test.ts / trustCopy.test.ts / metadataSurfaces.test.ts.
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * French-route fs gates (FR-01/02/03, phase 31).
 *
 * Crawlers and AI assistants fetch raw HTML bytes: /fr/ must serve a rendered
 * French shell, both heads must carry the identical reciprocal hreflang trio
 * (Google ignores non-reciprocal pairs), and the machine locale declarations
 * (og:locale pair, JSON-LD inLanguage) must match the real routes on both
 * pages. These gates read the source bytes directly — the same bytes Vite
 * ships (public/ is copied verbatim; index.html is the build entry).
 *
 * Absence-tolerance: both page reads return an empty string when the file is
 * missing, so absence surfaces as named per-gate failures below — never as a
 * module-level crash that would mask the rest of the suite.
 *
 * Token immunity: the site origin is derived at runtime from the EN canonical
 * link (a surface the FR work does not edit); the pinned French strings are
 * read from src/i18n/locales/fr.json at runtime via JSON.parse — the shell
 * must carry the catalog's actual bytes, so nothing French is transcribed
 * into this file (Pitfall 9).
 */
const ROOT = resolve(__dirname, '../..');
const readIf = (p: string): string => {
  if (!existsSync(p) || !statSync(p).isFile()) return '';
  return readFileSync(p, 'utf8');
};

const en = readIf(resolve(ROOT, 'index.html'));
const fr = readIf(resolve(ROOT, 'public', 'fr', 'index.html'));

// Token-immune origin: from the EN canonical link (never hardcoded).
const ORIGIN = en.match(/rel="canonical" href="(https:\/\/[^/]+)\//)?.[1] ?? '';
const FR_ROUTE = ORIGIN + '/fr/';

// Pinned catalog strings (the FR page quotes these byte-for-byte).
const frCatalog = JSON.parse(readIf(resolve(ROOT, 'src', 'i18n', 'locales', 'fr.json')) || '{}') as {
  header?: { appHeading?: string };
  status?: { privacy?: string };
  welcome?: { intro?: string };
};
const APP_HEADING = frCatalog.header?.appHeading ?? '';
const PRIVACY_LABEL = frCatalog.status?.privacy ?? '';

// Sorted (hreflang, href) tuples — order-insensitive reciprocity comparison
// (link-tag order in head is unspecified; the SET is the contract).
function hreflangSet(html: string): Array<[string, string]> {
  return [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
    .map((m) => [m[1], m[2]] as [string, string])
    .sort();
}

function frJsonLd(): Record<string, unknown> {
  const m = fr.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return {};
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// --- FR-01: the FR page exists and is well-formed -------------------------
describe('FR page exists + lang (FR-01)', () => {
  it('public/fr/index.html exists and is non-empty', () => {
    expect(
      fr,
      'FR-01: public/fr/index.html is missing — the /fr/ route has no file to serve',
    ).not.toBe('');
  });

  it('html lang equals fr', () => {
    expect(
      fr.includes('<html lang="fr">'),
      'FR-01: the FR page must declare <html lang="fr">',
    ).toBe(true);
  });
});

// --- FR-03: the FR route spelling is one-spelling everywhere ---------------
describe('FR route URL contract (FR-03)', () => {
  it('derives the origin token-immunely from the EN canonical link', () => {
    expect(ORIGIN, 'the canonical link is missing from index.html').not.toBe('');
  });

  it('FR canonical and og:url both equal origin + /fr/', () => {
    const canonical = fr.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
    const ogUrl = fr.match(/<meta property="og:url" content="([^"]+)"/)?.[1] ?? '';
    expect(canonical, 'FR-03: the FR canonical must be origin + /fr/').toBe(FR_ROUTE);
    expect(ogUrl, 'FR-03: the FR og:url must be origin + /fr/').toBe(FR_ROUTE);
  });

  it('og:locale fr_FR and og:locale:alternate en_US', () => {
    expect(
      fr.includes('<meta property="og:locale" content="fr_FR">'),
      'FR-03: the FR page must declare og:locale fr_FR',
    ).toBe(true);
    expect(
      fr.includes('<meta property="og:locale:alternate" content="en_US">'),
      'FR-03: the FR page must declare og:locale:alternate en_US',
    ).toBe(true);
  });
});

// --- FR-02: hreflang reciprocity -------------------------------------------
describe('hreflang reciprocity (FR-02)', () => {
  it('both heads carry the identical (hreflang, href) set', () => {
    expect(
      hreflangSet(en),
      'FR-02: the hreflang sets of index.html and public/fr/index.html must be identical (Google requires the same set on every version; non-reciprocal pairs are ignored)',
    ).toEqual(hreflangSet(fr));
  });

  it('the set is exactly en→/, fr→/fr/, x-default→/ — bare codes, three entries', () => {
    expect(
      hreflangSet(fr),
      'FR-02: the FR head must carry exactly the reciprocal trio (bare en/fr codes, x-default to the EN route)',
    ).toEqual([
      ['en', ORIGIN + '/'],
      ['fr', ORIGIN + '/fr/'],
      ['x-default', ORIGIN + '/'],
    ]);
    expect(hreflangSet(fr), 'FR-02: exactly three hreflang entries').toHaveLength(3);
  });

  it('the hreflang removal comment is gone from index.html', () => {
    expect(
      en.includes('réintroduire des hreflang'),
      'FR-02: the hreflang removal comment must be deleted — its documented condition (localized routes exist) is now met',
    ).toBe(false);
  });
});

// --- FR-03: EN-side declarations become true, byte-unchanged ---------------
describe('EN-side declarations byte-unchanged (FR-03)', () => {
  it('index.html still declares og:locale en_US + og:locale:alternate fr_FR', () => {
    expect(
      en.includes('<meta property="og:locale" content="en_US">'),
      'FR-03: the EN og:locale en_US must stay byte-unchanged',
    ).toBe(true);
    expect(
      en.includes('<meta property="og:locale:alternate" content="fr_FR">'),
      'FR-03: the EN og:locale:alternate fr_FR must stay byte-unchanged (it becomes true once /fr/ exists)',
    ).toBe(true);
  });

  it('index.html JSON-LD still declares inLanguage [en, fr]', () => {
    const m = en.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m, 'the EN ld+json block is missing').not.toBeNull();
    const ld = JSON.parse(m![1]) as { inLanguage?: string[] };
    expect(ld.inLanguage, 'FR-03: the EN inLanguage array must stay ["en","fr"]').toEqual([
      'en',
      'fr',
    ]);
  });
});

// --- FR-03: the FR JSON-LD mirror (softwareVersion omitted, T-31-03) -------
describe('FR JSON-LD mirror (FR-03)', () => {
  it('carries exactly one ld+json block that JSON.parses clean', () => {
    const m = fr.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m, 'FR-03: the application/ld+json block is missing from public/fr/index.html').not.toBeNull();
    expect(() => JSON.parse(m![1]), 'FR-03: the FR JSON-LD must parse clean').not.toThrow();
  });

  it('type WebApplication, url = origin + /fr/, inLanguage fr', () => {
    const ld = frJsonLd();
    expect(ld['@type'], 'FR-03: the FR JSON-LD must be a WebApplication').toBe('WebApplication');
    expect(ld.url, 'FR-03: the FR JSON-LD url must be origin + /fr/').toBe(FR_ROUTE);
    expect(ld.inLanguage, 'FR-03: the FR JSON-LD inLanguage must be "fr"').toBe('fr');
  });

  it('softwareVersion is OMITTED and zero placeholder tokens anywhere (T-31-03)', () => {
    const ld = frJsonLd();
    expect(
      Object.prototype.hasOwnProperty.call(ld, 'softwareVersion'),
      'FR-03/T-31-03: softwareVersion must be omitted — %APP_VERSION% is substituted for the build entry only; a public/ file would serve it literally',
    ).toBe(false);
    expect(
      fr.includes('%APP_VERSION%'),
      'T-31-03: the vite placeholder must never appear in a public/ file',
    ).toBe(false);
  });
});

// --- T-31-01: zero-JS / zero-external census on the FR file ----------------
describe('zero-JS census on the FR file (T-31-01)', () => {
  it('exactly one <script> tag and it is the ld+json block', () => {
    const scripts = fr.match(/<script\b[^>]*>/g) ?? [];
    expect(
      scripts,
      'T-31-01: the FR page must carry exactly one script tag — the ld+json block; no app JS, no analytics',
    ).toHaveLength(1);
    expect(scripts[0], 'T-31-01: the only script must be the application/ld+json block').toContain(
      'application/ld+json',
    );
  });

  it('every <link> tag is the canonical or an hreflang alternate', () => {
    const links = fr.match(/<link\b[^>]*>/g) ?? [];
    expect(links.length, 'T-31-01: expected the canonical + the hreflang trio').toBeGreaterThanOrEqual(4);
    for (const link of links) {
      const allowed = link.includes('rel="canonical"') || /rel="alternate" hreflang="/.test(link);
      expect(allowed, `T-31-01: non-canonical/alternate <link> found: ${link}`).toBe(true);
    }
  });

  it('no @import rule and no url(http external fetch', () => {
    expect(fr.includes('@import'), 'T-31-01: the FR page must not fetch CSS via @import').toBe(false);
    expect(
      fr.includes('url(http'),
      'T-31-01: the FR page must not fetch external resources via url(...)',
    ).toBe(false);
  });
});

// --- FR-01: title + description bounds --------------------------------------
describe('FR title + meta description bounds (FR-01)', () => {
  it('title is the pinned fr.json app heading (catalog-derived, non-empty)', () => {
    const title = fr.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    expect(APP_HEADING, 'the fr.json header.appHeading key must exist').not.toBe('');
    expect(title, 'FR-01: the FR title must equal the pinned app heading').toBe(APP_HEADING);
  });

  it('meta description is non-empty and at most 155 chars', () => {
    const desc = fr.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    expect(desc, 'FR-01: the FR meta description is missing').not.toBe('');
    expect(
      desc.length,
      `FR-01: the FR meta description must be <= 155 chars (got ${desc.length})`,
    ).toBeLessThanOrEqual(155);
  });
});

// --- FR-01: the FR shell body contract (phase 31 Task 2) -------------------
// Mirrors the EN shell block element by element (index.html .shell): h1, lead,
// comparison h2 + paragraph, 5-item list, value-prop strip, three anchored
// definitional sections, trust line. The word counter and the 40-60 answer
// extractor are the crawlableShell conventions with the subject swapped to
// the FR block. Banned-phrase enforcement lives in trustCopy's census (the
// fr-shell source entry) — never ad-hoc checks here.
function frShellBlock(): string {
  const start = fr.indexOf('<main class="shell">');
  expect(
    start,
    'FR-01: <main class="shell"> not found in public/fr/index.html — the FR shell block is missing',
  ).toBeGreaterThan(-1);
  const end = fr.indexOf('</main>', start);
  return fr.slice(start, end);
}

describe('FR shell body contract (FR-01)', () => {
  it('carries >= 185 words of static prose (word floor, EN tag-strip counter)', () => {
    const words = frShellBlock()
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    expect(
      words.length,
      `FR-01: FR shell prose word count below the 185-word crawlability floor (got ${words.length})`,
    ).toBeGreaterThanOrEqual(185);
  });

  it('carries exactly 4 h2s (comparison + the three definitional sections)', () => {
    const h2Count = (frShellBlock().match(/<h2/g) ?? []).length;
    expect(
      h2Count,
      `FR-01: the FR shell must carry exactly 4 h2s (got ${h2Count})`,
    ).toBe(4);
  });

  it('keeps the three EN anchor ids verbatim (heading text is French)', () => {
    const block = frShellBlock();
    for (const id of ['what-is-mermaidstudio', 'how-it-works', 'privacy']) {
      expect(
        block,
        `FR-01: missing anchor <h2 id="${id}"> in the FR shell block`,
      ).toContain(`<h2 id="${id}">`);
    }
  });

  it('each definitional answer measures 40-60 words (EN extractor boundaries)', () => {
    const block = frShellBlock();
    for (const id of ['what-is-mermaidstudio', 'how-it-works', 'privacy']) {
      const h2Start = block.indexOf(`<h2 id="${id}">`);
      expect(h2Start, `FR-01: missing h2 id="${id}"`).toBeGreaterThan(-1);
      const close = block.indexOf('</h2>', h2Start);
      // Answer region ends at the next h2 or at the trust line — the same
      // crawlableShell boundaries (the extractor already ends at <p class="trust").
      const nextH2 = block.indexOf('<h2', close);
      const trust = block.indexOf('<p class="trust"', close);
      const candidates = [nextH2, trust].filter((i) => i !== -1);
      const end = candidates.length === 0 ? block.length : Math.min(...candidates);
      const answer = block
        .slice(close + '</h2>'.length, end)
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
      expect(
        answer,
        `FR-01: "${id}" answer must be 40-60 words (got ${answer}) — direct-answer length for AI crawlers`,
      ).toBeGreaterThanOrEqual(40);
      expect(
        answer,
        `FR-01: "${id}" answer must be 40-60 words (got ${answer})`,
      ).toBeLessThanOrEqual(60);
    }
  });

  it('valueprop strip carries the strong lead-in and the 400-700 Mo footnote', () => {
    const block = frShellBlock();
    expect(
      block,
      'FR-01: strip main line missing — must carry the <p class="valueprop-main"><strong> lead-in (local-GPU claim)',
    ).toMatch(/<p class="valueprop-main"><strong>[^<]+<\/strong>/);
    expect(
      block,
      'FR-01: strip footnote missing — the 400-700 Mo first-use model download must be disclosed before commitment',
    ).toContain('400–700 Mo');
    expect(
      block,
      'FR-01: the footnote must carry the runs-offline-after claim',
    ).toContain('hors ligne');
  });

  it('trust line carries every EN trust href byte-equal plus a visible app link and the catalog privacy label', () => {
    const trust = frShellBlock().match(/<p class="trust">[\s\S]*?<\/p>/);
    expect(trust, 'FR-01: the FR trust line <p class="trust"> is missing').not.toBeNull();
    const enTrust = en.match(/<p class="trust">[\s\S]*?<\/p>/);
    expect(enTrust, 'the EN trust line is missing from index.html').not.toBeNull();
    const enHrefs = [...enTrust![0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(enHrefs.length, 'EN trust href extraction failed').toBeGreaterThan(0);
    for (const href of enHrefs) {
      expect(
        trust![0],
        `FR-01: the FR trust line must carry the EN trust href byte-equal: ${href}`,
      ).toContain(`href="${href}"`);
    }
    expect(
      trust![0],
      'FR-01: the trust line must carry a visible link to the app (anchor href="/" with its own label)',
    ).toContain('href="/">');
    expect(
      PRIVACY_LABEL,
      'the fr.json status.privacy key must exist',
    ).not.toBe('');
    expect(
      trust![0],
      'FR-01: the /privacy anchor label must equal the fr.json status.privacy bytes',
    ).toContain(`href="/privacy">${PRIVACY_LABEL}</a>`);
  });
});

describe('FR typography hygiene (Pitfall 9)', () => {
  it('zero typographic apostrophes (U+2019) and zero non-breaking spaces (U+00A0)', () => {
    expect(
      fr.includes(String.fromCharCode(8217)),
      'typographic apostrophe U+2019 found in public/fr/index.html — use the straight ASCII apostrophe so the catalog byte gates stay exact',
    ).toBe(false);
    expect(
      fr.includes(String.fromCharCode(160)),
      'non-breaking space U+00A0 found in public/fr/index.html — use the regular space',
    ).toBe(false);
  });
});
