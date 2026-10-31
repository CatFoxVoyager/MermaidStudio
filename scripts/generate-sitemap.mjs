/**
 * Build-time generator for the site's machine-readable surfaces.
 *
 * Wired as the explicit first step of `npm run build` AND as the `prebuild`
 * lifecycle script (npm 11+ no longer fires pre/post user-script hooks —
 * probed 2026-10-31 — while pnpm, the packageManager-pinned path Vercel uses,
 * does; the explicit build-chain invocation makes generation manager-proof.
 * Managers that fire both run this twice — harmless: the output is
 * deterministic for a given build date).
 *
 * Emits (the ONLY file this script writes — T-30-01):
 *   public/sitemap.xml — lastmod = build date (never hand-maintained: the
 *   hand-edited copy went stale at 2026-10-04 while 27 content commits
 *   shipped). The XML SHAPE (root tag, url/loc/date tag names, xmlns) is
 *   extracted from the currently committed sitemap — the protocol-validated
 *   bytes — and reproduced verbatim, so a regeneration can never drift the
 *   schema the site already serves. The base URL is derived from index.html's
 *   canonical link (single source of truth for the site origin), the filename
 *   from robots.txt's Sitemap directive (the discovery surface search engines
 *   actually use).
 *
 * Task 2 extends this script with the public/llms.txt emission (version read
 * from package.json — never a second hand-edited version string).
 *
 * Zero dependencies: node:fs / node:path / node:url only.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');


// Extensible top-of-file URL list: one entry per indexable route. /privacy is
// live and indexable since phase 28; add future routes here.
const URLS = ['/', '/privacy', '/fr/'];

const TODAY = new Date().toISOString().slice(0, 10);

// The sitemap filename is whatever robots.txt advertises (the URL search
// engines are told to fetch). Fail loudly if the directive is missing —
// never guess a filename.
const robots = readFileSync(join(PUBLIC_DIR, 'robots.txt'), 'utf8');
const sitemapName = (robots.match(/Sitemap:\s*(\S+)/)?.[1] ?? '').split('/').pop() ?? '';
if (!sitemapName) {
  throw new Error('generate-sitemap: robots.txt carries no "Sitemap:" directive — cannot derive the target filename');
}
const sitemapPath = join(PUBLIC_DIR, sitemapName);

// The canonical origin comes from index.html (the site's own self-describing
// surface), not from a second hand-maintained constant.
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
const canonical = indexHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
if (!canonical) {
  throw new Error('generate-sitemap: index.html carries no canonical link — cannot derive the site origin');
}
const SITE_BASE = canonical.replace(/\/$/, '');
const ldOpen = indexHtml.indexOf('<script type="application/ld+json">');
const ldClose = indexHtml.indexOf('</script>', ldOpen);
if (ldOpen < 0 || ldClose < 0) {
  throw new Error('generate-sitemap: index.html carries no JSON-LD block — cannot derive repo anchors');
}
const jsonLd = JSON.parse(indexHtml.slice(ldOpen + 35, ldClose));

// Extract the wire shape from the committed sitemap (root tag, xmlns, and the
// per-url tag names). Falls back to the sitemaps.org protocol defaults only
// when no committed file exists yet.
const existing = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';
const shape = existing
  ? {
      rootTag: existing.match(/<(\w+)[^>]*xmlns=/)?.[1],
      xmlns: existing.match(/xmlns="([^"]+)"/)?.[1],
      urlTag: existing.match(/<(\w+)>\s*<loc>/)?.[1],
      locTag: 'loc',
      dateTag: existing.match(/<(\w+)>\d{4}-\d{2}-\d{2}<\/\1>/)?.[1],
    }
  : {};
if (!shape.rootTag || !shape.xmlns || !shape.urlTag || !shape.dateTag) {
  throw new Error(`generate-sitemap: cannot derive the sitemap wire shape from ${sitemapName} — inspect the committed file`);
}

const body = URLS.map(
  (p) =>
    `  <${shape.urlTag}>\n` +
    `    <${shape.locTag}>${SITE_BASE}${p}</${shape.locTag}>\n` +
    `    <${shape.dateTag}>${TODAY}</${shape.dateTag}>\n` +
    `  </${shape.urlTag}>`,
).join('\n');

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<${shape.rootTag} xmlns="${shape.xmlns}">\n` +
  `${body}\n` +
  `</${shape.rootTag}>\n`;

writeFileSync(sitemapPath, sitemap);
console.log(`generate-sitemap: wrote ${sitemapPath} (${URLS.length} urls, lastmod ${TODAY})`);

// --- llms.txt (META-03): the LLM-facing surface, version from package.json ---
// Anchors derived from served surfaces (never a second hand-edited constant):
// name / codeRepository / license from the JSON-LD block, origin from the
// canonical link, docs host from the repo slug. Copy stays WR-02-honest: the
// analytics disclosure is "cookieless", never an absolute no-telemetry claim.
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const repoUrl = String(jsonLd.codeRepository ?? '');
const repoOwner = repoUrl.replace(/^https?:\/\/[^/]+\//, '').split('/')[0] ?? '';
const repoName = repoUrl.replace(/^https?:\/\/[^/]+\//, '').split('/')[1] ?? '';
const docsUrl = `https://${repoOwner.toLowerCase()}.github.io/${repoName}/`;
const changelogUrl = `${repoUrl}/blob/main/CHANGELOG.md`;
const licenseUrl = String(jsonLd.license ?? '');

const llmsTxt = [
  `# ${jsonLd.name}`,
  '',
  '> Free, open-source diagram editor that runs entirely in your browser:',
  '> drag-and-drop visual editing over the live preview, folders, tags and',
  '> version history, and in-browser AI (WebGPU) running locally on your GPU.',
  '> The public website uses cookieless analytics.',
  '',
  `- Canonical site: ${SITE_BASE}/`,
  `- Version: ${pkg.version}`,
  `- License: MIT (${licenseUrl})`,
  `- Source & README: ${repoUrl}`,
  `- Docs: ${docsUrl}`,
  `- Privacy: ${SITE_BASE}/privacy`,
  '',
  '## Optional',
  '',
  `- Changelog: ${changelogUrl}`,
  '',
].join('\n');

const llmsPath = join(PUBLIC_DIR, 'llms.txt');
writeFileSync(llmsPath, llmsTxt);
console.log(`generate-sitemap: wrote ${llmsPath} (version ${pkg.version})`);
