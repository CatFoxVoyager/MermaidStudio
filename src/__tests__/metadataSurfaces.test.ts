import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as crawlableShell.test.ts / trustCopy.test.ts.
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Metadata machine-surface fs gates (META-02/03/04 + META-05 repo half) —
 * the sitemap and llms.txt are build-generated; these gates pin the generator
 * contract, the committed artifacts, and the prebuild wiring.
 *
 * Design note: every rare literal (domain, repo slug, author name, asset
 * filenames, sitemap tag names) is DERIVED at test runtime from surfaces this
 * phase does not edit (index.html canonical/JSON-LD, robots.txt, the audited
 * baseline fixture) — the committed artifacts must agree with the served
 * surfaces they describe, so drift between generator output and the real site
 * URLs fails here.
 *
 * The suite NEVER invokes the generator (running it here would dirty public/
 * from CI). It pins the generator SOURCE, the build WIRING, and the
 * COMMITTED artifacts.
 */
const ROOT = resolve(__dirname, '../..');
const read = (p: string): string => readFileSync(p, 'utf8');
// File-aware: resolve(ROOT, '') lands on the repo dir itself (existsSync true,
// EISDIR at read), so absence must be decided by stat, not by the path string.
const readIf = (p: string): string => {
  if (p === '' || !existsSync(p) || !statSync(p).isFile()) return '';
  return read(p);
};

const pkg = JSON.parse(read(resolve(ROOT, 'package.json')));
const indexHtml = read(resolve(ROOT, 'index.html'));
const robotsTxt = read(resolve(ROOT, 'public/robots.txt'));

// Single-source anchors, derived from unedited surfaces:
const canonical = indexHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
const siteBase = canonical.replace(/\/$/, '');
const jsonLd = JSON.parse(
  indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '{}',
);
// The sitemap filename the site actually advertises (robots.txt is the
// discovery surface Google uses — whatever it names is the file to generate).
const sitemapName = (robotsTxt.match(/Sitemap:\s*\S+/)?.[0] ?? '').trim().split('/').pop() ?? '';
const liveSitemap = readIf(resolve(ROOT, 'public', sitemapName));

// Audited pre-fix baseline (copied verbatim from public/ before the first
// generator run — the XML shape the sitemaps.org protocol validated in prod).
const fixtureDir = resolve(__dirname, 'fixtures');
const baselineSitemap = read(
  resolve(fixtureDir, readdirSync(fixtureDir).find((f: string) => f.endsWith('.xml')) ?? 'MISSING.xml'),
);

const urlCount = (s: string): number => (s.match(/<url[\s>]/g) ?? []).length;
const locs = (s: string): string[] => [...s.matchAll(/<(loc)>([^<]+)<\/\1>/g)].map((m) => m[2]);
const dates = (s: string): string[] =>
  [...s.matchAll(/<(\w+)>(\d{4}-\d{2}-\d{2})<\/\1>/g)].map((m) => m[2]);
const xmlnsOf = (s: string): string => s.match(/xmlns="([^"]+)"/)?.[1] ?? '';

// The generator is addressed through the build wiring itself (package.json
// scripts.prebuild) — a renamed or moved script fails HERE instead of
// silently rotting the wiring.
const generatorPath = (pkg.scripts['prebuild'] ?? '').replace(/^node /, '');
const generatorSrc = readIf(resolve(ROOT, generatorPath));
const llmsTxt = readIf(resolve(ROOT, 'public', 'llms.txt'));

describe('prebuild wiring (META-04)', () => {
  it('package.json wires the generator as the prebuild script', () => {
    expect(pkg.scripts['prebuild'], 'scripts.prebuild must be "node scripts/generate-sitemap.mjs"').toBe(
      'node scripts/generate-sitemap.mjs',
    );
  });

  it('the build chain invokes the generator explicitly (npm 11+ drops pre/post user-script hooks — probed 2026-10-31)', () => {
    expect(
      pkg.scripts['build'],
      'scripts.build must start with an explicit generator invocation so npm-only contributors still generate',
    ).toMatch(/^node scripts\/generate-sitemap\.mjs && /);
  });
});

describe('generator contract (META-04)', () => {
  it('generator pins the build-date lastmod formula (never hand-maintained)', () => {
    expect(generatorSrc, 'the generator named by scripts.prebuild is missing on disk').toContain(
      'new Date().toISOString().slice(0, 10)',
    );
  });

  it('generator declares its write root as the repo public dir and writes exactly one file (T-30-01 path-safety pin)', () => {
    expect(generatorSrc).toContain("join(ROOT, 'public')");
    const writes = (generatorSrc.match(/writeFileSync\(/g) ?? []).length;
    expect(writes, 'the generator writes exactly the two contracted machine surfaces').toBe(2);
  });
});

describe('committed public sitemap (META-04)', () => {
  it('the live sitemap is the one robots.txt advertises', () => {
    expect(sitemapName).toMatch(/\.xml$/);
    expect(liveSitemap, 'the robots.txt-advertised sitemap file must exist in public/').not.toBe('');
  });

  it('urlset namespace is unchanged from the audited baseline (same schema)', () => {
    expect(xmlnsOf(liveSitemap), 'live sitemap must exist').not.toBe('');
    expect(xmlnsOf(liveSitemap)).toBe(xmlnsOf(baselineSitemap));
  });

  it('carries exactly one more url than the audited baseline (adds /privacy)', () => {
    expect(urlCount(liveSitemap)).toBe(urlCount(baselineSitemap) + 1);
  });

  it('keeps the baseline root loc (which must equal the canonical link) and adds /privacy', () => {
    const baseLocs = locs(baselineSitemap);
    const liveLocs = locs(liveSitemap);
    // Cross-anchor: the audited root loc must be the canonical the site serves.
    expect(baseLocs[0]?.replace(/\/$/, '')).toBe(canonical.replace(/\/$/, ''));
    expect(liveLocs).toEqual([...baseLocs, siteBase + '/privacy']);
  });

  it('every url carries an ISO lastmod, regenerated — never the stale baseline value', () => {
    const liveDates = dates(liveSitemap);
    const staleDates = dates(baselineSitemap);
    expect(liveDates).toHaveLength(urlCount(liveSitemap));
    for (const d of liveDates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(staleDates, 'a stale baseline lastmod reappeared — the generator was bypassed').not.toContain(d);
    }
  });
});

// --- Task 2 anchors (derived, never transcribed) ---
const readmeUrl = String(jsonLd.codeRepository ?? ''); // the repo's canonical GitHub URL
const ownerName = readmeUrl.replace(/^https?:\/\/[^/]+\//, '').split('/')[0] ?? '';
const repoName = readmeUrl.replace(/^https?:\/\/[^/]+\//, '').split('/')[1] ?? '';
const docsUrl = `https://${ownerName.toLowerCase()}.github.io/${repoName}/`;
const changelogUrl = `${readmeUrl}/blob/main/CHANGELOG.md`;
const licenseUrl = String(jsonLd.license ?? '');

// Honesty census: parsed from trustCopy.test.ts's BANNED_PHRASES array — the
// claim class is read from the canonical source, so the two suites cannot
// drift apart.
const trustCopySrc = read(resolve(ROOT, 'src/__tests__/trustCopy.test.ts'));
const censusSlice = trustCopySrc.slice(
  trustCopySrc.indexOf('BANNED_PHRASES'),
  trustCopySrc.indexOf('] as const'),
);
const bannedPhrases = [...censusSlice.matchAll(/'([^']+)'|"([^"]+)"/g)]
  .map((m) => m[1] ?? m[2])
  .filter((p): p is string => Boolean(p));

describe('committed public/llms.txt (META-03)', () => {
  it('exists with the required H1 first line (product name from the JSON-LD block)', () => {
    expect(llmsTxt, 'public/llms.txt is missing — run the generator').not.toBe('');
    expect(llmsTxt.split('\n')[0]).toBe(`# ${jsonLd.name}`);
  });

  it('carries the package.json version (the drift-kill gate)', () => {
    const version = llmsTxt.match(/Version:\s*(\d+\.\d+\.\d+)/)?.[1] ?? '';
    expect(version, 'llms.txt version must be read from package.json by the generator').toBe(pkg.version);
  });

  it('links the canonical site, README, docs Pages, privacy and the MIT license', () => {
    for (const url of [canonical, readmeUrl, docsUrl, `${siteBase}/privacy`, licenseUrl]) {
      expect(url, 'anchor derivation failed — the JSON-LD/canonical surface changed').not.toBe('');
      expect(llmsTxt).toContain(url);
    }
  });

  it('offers the changelog under the Optional section (llmstxt.org secondary convention)', () => {
    expect(llmsTxt).toContain('## Optional');
    expect(llmsTxt).toContain(changelogUrl);
  });

  it('stays WR-02 honest — zero banned absolute-telemetry phrases (census shared with trustCopy)', () => {
    expect(bannedPhrases.length, 'census extraction failed — trustCopy.test.ts shape changed').toBeGreaterThan(0);
    const haystack = llmsTxt.toLowerCase();
    for (const phrase of bannedPhrases) {
      expect(haystack, `banned absolute claim leaked into llms.txt: class "${phrase}"`).not.toContain(
        phrase.toLowerCase(),
      );
    }
  });
});

describe('package.json repo-entity fields (META-05c)', () => {
  it('carries all five entity fields, values anchored to the served surfaces', () => {
    expect(pkg.description, 'description must be a non-empty tool summary').toBeTruthy();
    expect(pkg.homepage).toBe(canonical);
    expect(pkg.license).toBe('MIT');
    expect(pkg.author).toBe(jsonLd.author.name);
    expect(String(pkg.repository?.url)).toContain(jsonLd.codeRepository);
  });
});

describe('public/app-ads.txt removed (META-05d)', () => {
  it('the stale AdSense publisher artifact no longer exists', () => {
    expect(existsSync(resolve(ROOT, 'public', 'app-ads.txt'))).toBe(false);
  });
});
