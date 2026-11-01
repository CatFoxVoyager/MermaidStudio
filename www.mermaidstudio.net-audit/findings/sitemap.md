# Sitemap Audit — https://www.mermaidstudio.net/sitemap.xml

Audit date: 2026-10-29. Scope: the XML sitemap document itself. hreflang and canonical policy are owned by other agents and excluded here. Site facts taken as given per anti-duplication brief (1-URL urlset, mono-page React SPA, apex 307 to www) and independently re-verified where cheap.

---

## 1. Sitemap category contribution note

This category feeds **Technical SEO only; it carries no standalone weight**. Verdict for the aggregation: the sitemap document passes every hard gate (validity, namespace, protocol, size, host consistency, robots declaration). The single substantive finding is the **lastmod freshness mechanism (Low)** — the date is hand-maintained and is already stale against demonstrable content churn. Everything else is Info/PASS. No Critical or High findings exist in this category.

## 2. Validation report (pass/fail per check)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | HTTP status of sitemap | PASS | `HTTP/1.1 200 OK` (curl -sI) |
| 2 | Content-Type | PASS | `application/xml` |
| 3 | XML well-formedness | PASS | Python expat `parseString`: root `urlset`, no errors |
| 4 | XML declaration | PASS | `<?xml version="1.0" encoding="UTF-8"?>` |
| 5 | Namespace | PASS | `http://www.sitemaps.org/schemas/sitemap/0.9` |
| 6 | Schema kind | PASS | `urlset` (not an index); discovery script: `kind: "urlset", valid: true` |
| 7 | Element inventory | PASS | exactly `urlset, url, loc, lastmod` — nothing extra |
| 8 | Deprecated `priority` tag | PASS — absent | regex scan: false |
| 9 | Deprecated `changefreq` tag | PASS — absent | regex scan: false |
| 10 | `loc` absolute-URL format | PASS | `https://www.mermaidstudio.net/` (scheme + host + path) |
| 11 | Host consistency (canonical www) | PASS | loc host = www; apex `mermaidstudio.net` returns `307` → `Location: https://www.mermaidstudio.net/` (verified live) |
| 12 | Trailing-slash consistency vs canonical | PASS | sitemap loc `.../net/` === canonical tag `href="https://www.mermaidstudio.net/"` (fetched from live homepage `<head>`) |
| 13 | `lastmod` W3C datetime format | PASS | `2026-10-04` is a valid full-date |
| 14 | `lastmod` accuracy | **WARNING** | stale vs content churn — see F1 |
| 15 | Size limit: ≤ 50,000 URLs | PASS | 1 URL entry |
| 16 | Size limit: ≤ 50 MB uncompressed | PASS | 207 bytes (`Content-Length: 207`) |
| 17 | News sitemap 1,000-URL cap | N/A | no `news:` namespace |
| 18 | Same-host rule (sitemap host = listed URLs host) | PASS | both `www.mermaidstudio.net` |
| 19 | robots.txt `Sitemap:` declaration | PASS | `Sitemap: https://www.mermaidstudio.net/sitemap.xml` on the www host; live robots.txt matches repo `public/robots.txt` |
| 20 | Noindexed URLs in sitemap | PASS — none | `/offline.html` is served 200 with `meta robots noindex` and is correctly absent from the sitemap |
| 21 | Redirected URLs in sitemap | PASS — none | the sole loc returns 200 |
| 22 | 404 URLs in sitemap | PASS — none | the sole loc returns 200 |

## 3. Findings

| ID | Severity | Finding | Evidence | Falsifiable verification |
|----|----------|---------|----------|--------------------------|
| F1 | **Low** | **`lastmod` is hand-maintained and stale.** Sitemap says `2026-10-04`; the repo shipped **27 commits touching `index.html`/`src/`** since then (out of 53 total), including real content (phases 26-27: new mermaid shapes, toolbar previews, locale copy). Proof of hand-maintenance: the sitemap file itself was deployed today unchanged — its HTTP `Last-Modified` is `Thu, 29 Oct 2026 12:35:25 GMT` (deploy time) while its internal `lastmod` still reads `2026-10-04`. Sole git edit to the file: `b221289 2026-10-04 feat(seo): audit action plan`. This confirms and sharpens Technical finding L2: the Vercel header alone wouldn't prove staleness (it is deploy-time, not content-time), but git history does. Repeatedly inaccurate lastmod trains crawlers to discount the signal. | `git log --oneline b221289..HEAD -- index.html src/` → 27 entries; `git log --format="%h %ad %s" --date=short -- public/sitemap.xml` → single entry b221289 2026-10-04; live headers as above | Re-run the two git commands and `curl -sI https://www.mermaidstudio.net/sitemap.xml \| grep -i last-modified`. Falsified if the internal lastmod equals a date ≥ the latest content commit touching `src/`/`index.html` |
| F2 | Info | **Coverage is complete for today's URL universe.** The only indexable URL (`/`, canonical, `meta robots: index, follow`) is present in the sitemap. Probes: `/privacy` 404, `/docs` 404, `/llms.txt` 404 (nothing to add); `/og-image.png` 200 but it is an `og:image` asset — correctly excluded from a urlset sitemap; `/offline.html` 200 + `noindex` — correctly excluded; `/index.html` duplicate (Technical L3) — correctly excluded, canonical root listed instead. **Missing from sitemap: none. Extra/invalid in sitemap: none.** | probe loop output: `404 /privacy`, `404 /docs`, `404 /llms.txt`, `200 /og-image.png`, `200 /offline.html`; homepage head shows `rel=canonical` + `meta robots index, follow` | Re-run: `for p in privacy docs llms.txt og-image.png offline.html; do curl -s -o /dev/null -w "%{http_code} /$p\n" https://www.mermaidstudio.net/$p; done` |
| F3 | Info | **Location-page quality gates N/A.** The site has **0 location pages**, so the 30-page WARNING gate (60% unique content required) and the 50-page HARD STOP gate (explicit justification required) do not apply. No programmatic page families of any kind exist (single SPA page; no integrations/glossary/branch-page templates). Nothing in this sitemap is at doorway-page risk. | sitemap contains exactly 1 URL (`url entries: 1` in node scan) | Any future addition of location-style pages must re-trigger the gates; until `url entries > 1` with city/geo patterns, gates stay N/A |
| F4 | Info | **The sitemap earns its keep even at 1 URL — keep it unchanged structurally.** It provides (a) a robots.txt-declared discovery path (discovery script: `declared` + `found`, `status_code: 200`, `valid: true`, zero warnings), (b) a change-frequency signal via lastmod once F1 is fixed, (c) a Search Console submission surface, at a cost of 207 bytes. | discovery JSON: `found[0].url = https://www.mermaidstudio.net/sitemap.xml, valid: true` | Re-run `claude-seo run sitemap_discovery.py https://www.mermaidstudio.net --json` and confirm the declared entry resolves 200/valid |
| F5 | Info | **No deprecated or junk tags.** `priority` and `changefreq` (both ignored by Google) are already absent; element inventory is the minimal conforming set. No action needed. | node element scan: `urlset, url, loc, lastmod` | Re-run the element scan on a fresh fetch |

## 4. lastmod integrity — assessment and concrete recommendation

**Adjudication of Technical L2 ("stale lastmod"): confirmed, Low.** Two independent proofs: (1) 27 content-touching commits since the lastmod date; (2) the sitemap file rode today's deploy unchanged with its old internal date, proving the date is hand-edited, not generated. One correction to L2's framing: Vercel's HTTP `Last-Modified` is the deploy timestamp, not a content-change timestamp — CI-only commits bump it too — so the header alone overstates staleness; the git evidence is what settles it.

**Recommendation: wire `lastmod` to the release flow (build-time generation), do not drop it.**

- Why wire: the failure mode is proven (one manual edit in 25 days while 27 content commits shipped). The repo deploys to production on push to main via Vercel, and every production deploy of a mono-page SPA is a potential content event — so a build-date `lastmod` is never materially false. Over-signaling on CI-only deploys is harmless at this scale: lastmod is a hint, and an unnecessary recrawl of one 200-byte-adjacent page costs nothing.
- Why not drop: honest absence is the clean fallback and loses little, but it forfeits the one signal this sitemap exists to carry, and the repo demonstrably cannot be trusted to hand-maintain anything time-based.
- Implementation (~10 lines, no new deps) — `scripts/generate-sitemap.mjs`:

```js
import { writeFileSync } from "node:fs";
const today = new Date().toISOString().slice(0, 10);
const urls = ["/"]; // add future indexable routes here (e.g. "/privacy", "/docs")
const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((p) => `  <url>\n    <loc>https://www.mermaidstudio.net${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join("\n") +
  `\n</urlset>\n`;
writeFileSync("public/sitemap.xml", body);
```

  Wire as `"prebuild": "node scripts/generate-sitemap.mjs"` in `package.json`; Vercel runs it on every production build, so `lastmod` is fresh-by-construction. Document the convention in one line (e.g. beside the script): `lastmod = production deploy date`. If strict "last significant change" semantics are ever wanted, gate the bump on a manual edit — but the git record shows manual gates are the mechanism that already failed.

## 5. Forward guidance — when /privacy, /docs, or other routes ship

Only indexable HTML pages belong in this urlset, so the flow should be: ship the page as a real static file or route (Vercel currently 404s unknown paths — there is no SPA rewrite producing soft-404s, which keeps this clean), give it a self-canonical `https://www.mermaidstudio.net/<path>` tag matching the loc format exactly (https, www, same trailing-slash convention), verify it returns 200 with `meta robots: index, follow` and no X-Robots-Tag, then add its path to the `urls` array in the sitemap generator from section 4 — the next deploy picks it up automatically with a fresh lastmod, and the sitemap stays a single file (no index needed until 50k URLs, which will never happen here). Do not add non-page assets (`/og-image.png` stays an `og:image` reference; `/llms.txt`, if ever added, is an AI-crawler convention, not a sitemap URL), and do not add noindexed utility files like `/offline.html`. One boundary to remember: if `/docs` ends up on GitHub Pages (per the repo's docs workflow) rather than on the www host, those URLs cannot live in this sitemap — the same-host rule requires a separate sitemap declared in that host's own robots.txt.

## 6. Structured findings (for audit-data.json, Sitemap category)

```json
{
  "category": "Sitemap",
  "contributes_to": "Technical SEO",
  "standalone_weight": false,
  "sitemap_url": "https://www.mermaidstudio.net/sitemap.xml",
  "url_count": 1,
  "size_bytes": 207,
  "hard_gates": { "xml_valid": true, "namespace_ok": true, "size_ok": true, "host_consistent": true, "robots_declared": true },
  "findings": [
    { "id": "S1", "severity": "Low", "title": "lastmod hand-maintained and stale vs 27 content commits since 2026-10-04; wire to build-time generation", "cross_ref": "Technical L2 (confirmed, with deploy-time header nuance)" },
    { "id": "S2", "severity": "Info", "title": "Coverage complete: only indexable URL / present; privacy/docs/llms.txt 404; og-image and offline.html correctly excluded" },
    { "id": "S3", "severity": "Info", "title": "Location-page gates (30 warn / 50 stop) N/A: 0 location pages" },
    { "id": "S4", "severity": "Info", "title": "1-URL sitemap earns its keep: discovery + change signal + GSC surface; keep" },
    { "id": "S5", "severity": "Info", "title": "No priority/changefreq deprecated tags present" }
  ]
}
```

---

*Task-observer: observation log scanned this session; no OPEN observations name a skill loaded here. Archived entries consulted and applied: 2099 (fetch canonical www target before scoring — done), 5058/5060 (curl `-w` output and apex-redirect classification on git bash — `Location` header read directly, no redirect-following misclassification).*
