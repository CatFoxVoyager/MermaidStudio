# Technical SEO Audit — https://www.mermaidstudio.net/

- **Date:** 2026-10-29
- **Site type:** Single-page React 19 SPA (client-rendered), Vercel-hosted, PWA
- **Evidence sources:** live probes (curl headers/status, robots.txt, sitemap.xml, 404 probes), raw served HTML (`raw/home-raw.html`, 10,771 bytes), Chromium-rendered DOM (`raw/render-home.json`, status 200), and site source repo `d:\code\mermaidstudio` (index.html, public/, vercel.json, src/, git history)
- **Canonical form:** `https://www.mermaidstudio.net/` (apex redirects to www)

## Overall Technical SEO Score: 62 / 100

| # | Category | Score | Verdict |
|---|----------|-------|---------|
| 1 | Crawlability | 95 | Pass |
| 2 | Indexability | 70 | Pass with risks |
| 3 | Redirects | 65 | Fail (307 on host canonicalization) |
| 4 | Security | 75 | Pass with findings |
| 5 | URL structure | 95 | Pass |
| 6 | Mobile | 95 | Pass |
| 7 | Core Web Vitals (structural only) | 80 | Pass with notes |
| 8 | JavaScript rendering | 35 | **Fail (Critical)** |
| 9 | hreflang / localization | 100 | Pass (correctly absent) |
| — | On-page basics | 80 | Pass with findings |
| — | Structured data | Pass | WebApplication JSON-LD, no HowTo |

The score is dragged down by one Critical finding (the crawlable HTML shell was deleted from production) and the 307 host redirect. Both are one-commit fixes; post-fix this site would score ~90+.

---

## Findings (prioritized)

| ID | Severity | Category | Finding | Evidence |
|----|----------|----------|---------|----------|
| C1 | **Critical** | JS rendering / Indexability | Crawlable shell content removed from production HTML since 2026-10-06. Served HTML body contains only a boot splash, a 12s error-fallback inline script, and a one-line `<noscript>`. Zero `<h1>`/`<h2>`/paragraph content in raw HTML. Non-rendering crawlers (GPTBot, ClaudeBot, PerplexityBot, social crawlers, first-wave indexing) see no content at all. | `raw/home-raw.html:149-155` (comment promises "Crawlable shell content" immediately followed by `<!-- Shell removed for dev -->`); repo `index.html:158-164`; content exists in `git show d169dbf~1:index.html`, removed by `d169dbf` (2026-10-06, "fix(ui): mobile polish loop it25-33") |
| H1 | **High** | Redirects | apex → www uses **307 Temporary Redirect** instead of 301/308 permanent. A temporary status for a permanent host move prevents full signal consolidation and lets the apex host persist as a separate indexable entity. Path is preserved correctly (e.g. `/robots.txt` → `https://www.mermaidstudio.net/robots.txt`). | `curl -sSI https://mermaidstudio.net/` → `HTTP/1.1 307 Temporary Redirect`, `Location: https://www.mermaidstudio.net/`; not configured in `vercel.json` (no `redirects` block), so it lives in Vercel domain settings |
| H2 | **High** | On-page / headings | Rendered DOM heading structure is broken: exactly one `<h1>` — the tiny top-bar brand mark (`text-sm font-semibold`, text "MermaidStudio") — with an interactive `<button>` nested inside it, and **zero `<h2>`/`<h3>` in the entire rendered page**. The only keyword-bearing heading on the site exists nowhere at render time. | `raw/render-home.json` line 4: `<h1 class="text-sm ...">Mermaid<span ...>Studio</span> <button data-testid="topbar-about-badge" ...>`; no `<h2`/`<h3` matches anywhere in the 115 KB rendered DOM |
| M1 | Medium | Security | CSP is **Report-Only** only (`Content-Security-Policy-Report-Only`), so the policy is not enforced. Note for enforcement: `script-src 'self'` will block the inline bootstrap script (`index.html:136-148`) — it needs a SHA-256 hash or externalization before flipping to enforcing. `style-src 'unsafe-inline'` is required (React inline styles + shell `<style>`) and already present. | Live header; `vercel.json:31-33` |
| L1 | Low | Security | HSTS is Vercel's platform default: `max-age=63072000` with **no `includeSubDomains`, no `preload`**. `vercel.json` does not set HSTS at all. | Live header vs `vercel.json:2-35` |
| L2 | Low | Indexability | Sitemap `<lastmod>2026-10-04</lastmod>` is stale — the document's `Last-Modified` is 2026-10-29 and the repo has shipped content changes since 10-04. Repeatedly inaccurate lastmod trains crawlers to ignore it. | `public/sitemap.xml:5`; live `Last-Modified: Thu, 29 Oct 2026 12:33:56 GMT` |
| L3 | Low | Indexability | `https://www.mermaidstudio.net/index.html` returns 200 with the same document instead of redirecting to `/`. Self-referencing canonical (`index.html:18`) mitigates duplication; a 301 to `/` would be cleaner. | `curl -sSI https://www.mermaidstudio.net/index.html` → 200 |
| L4 | Low | Security | `Access-Control-Allow-Origin: *` on everything including the HTML document. Harmless for a fully public, credential-free site, and CORS-qualified responses are required by `COEP: require-corp` (Google Fonts depends on it — documented at `index.html:99-101`). Informational. | Live headers; `vercel.json` |
| L5 | Low | On-page | Meta description is ~163 chars (truncation risk in SERP snippets); `<meta name="keywords">` is obsolete ballast (`index.html:40`). | `index.html:17,40` |
| L6 | Info | Housekeeping | `public/app-ads.txt` declares an AdSense publisher (`google.com, pub-7769962314825213, DIRECT, f08c47fec0942fa0`) while the app has no ads and no `ads.txt`. Stale monetization artifact; no SEO impact. | `public/app-ads.txt:1` |
| L7 | Info | IndexNow | No IndexNow key file in `public/` — protocol not implemented. Optional for a one-URL site already discovered via robots.txt + sitemap. | `public/` glob |

---

## Critical / High findings — details and falsifiable verification

### C1 — Production HTML has zero crawlable content (shell removed "for dev", never restored)

Until 2026-10-06 the served HTML contained a deliberate pre-hydration marketing block — the git parent of `d169dbf` shows what was deleted:

```html
<main class="shell">
  <h1>MermaidStudio — Free & Open-Source Mermaid Diagram Editor</h1>
  <p>Draw flowcharts, sequence diagrams, class diagrams, Gantt charts and mind maps…</p>
  <h2>A free online Mermaid diagram editor — an open-source alternative to the Mermaid Live Editor</h2>
  <!-- 5-item feature list, trust links (GitHub / Ko-Fi / Liberapay) -->
</main>
```

This block was explicitly designed to be crawled ("indexed by search engines and AI crawlers" — comment at `index.html:158-160`), with the boot splash layered over it visually (z-index) so users never saw a flash. Deleting it "for dev" and shipping that state means:

- Raw HTML now has **0 heading elements and 0 content paragraphs** (the only h1 hit in `home-raw.html` is a CSS selector at line 110).
- JS-less crawlers — GPTBot, ClaudeBot, PerplexityBot and most social/link-preview crawlers — index nothing. This is the exact audience the shell was built for, and robots.txt intentionally allows them all.
- Google (which renders JS) still sees the app UI, but that UI's only heading is the H2 finding below — so even the rendered index is semantically thin.

**Fix:** restore the `<main class="shell">` block from `git show d169dbf~1:index.html` into `index.html` (between the boot splash and `<noscript>`), re-add the matching inline `.shell` styles that were minified out of the served version, and commit. This is a web-repo-only change (no `src/` changes → no MermaidStudio-App port needed per the cross-repo sync rule). Note: pushing to `main` deploys to Vercel prod — do not push without explicit request.

**Verification (falsifiable):**
```
curl -sS https://www.mermaidstudio.net/ | grep -c "<h1"          # today: 0 — pass: >= 1
curl -sS https://www.mermaidstudio.net/ | grep -F "Mermaid Live Editor"   # today: no match — pass: match
```

### H1 — apex → www redirect is 307 Temporary, must be 301/308

Full chains observed:
- `https://mermaidstudio.net/` → **307** → `https://www.mermaidstudio.net/` → 200 (1 hop, wrong status)
- `http://mermaidstudio.net/` → 308 → `https://mermaidstudio.net/` → **307** → `https://www.mermaidstudio.net/` → 200 (2 hops)
- `http://www.mermaidstudio.net/` → 308 → `https://www.mermaidstudio.net/` → 200 (correct)

The http→https hops are permanent (308, Vercel platform default) — good. Only the host canonicalization hop is temporary. Since `vercel.json` has no `redirects` block, the 307 is configured in the Vercel project's domain settings. Either flip it to a permanent redirect there, or take explicit control in the repo:

```json
"redirects": [
  { "source": "/(.*)",
    "has": [{ "type": "host", "value": "mermaidstudio.net" }],
    "destination": "https://www.mermaidstudio.net/$1",
    "permanent": true }
]
```

**Verification (falsifiable):**
```
curl -sSI https://mermaidstudio.net/ | head -n 1
# today: HTTP/1.1 307 Temporary Redirect — pass: 301 or 308
```

### H2 — Rendered page has one brand-mark h1 (with a button inside it) and no h2/h3

Google renders the app, so the rendered DOM is the ranking-relevant document. It contains exactly one `<h1>`: the top-bar brand (`Mermaid<span>Studio</span>`) styled at `text-sm`, with the About `<button>` nested inside the h1 — interactive content inside a heading is invalid heading semantics. No `<h2>` or `<h3>` exists anywhere in the rendered 115 KB DOM. The strongest keyword phrase on the site ("Free Online Mermaid Diagram Editor") appears only in `<title>`/meta, never as a heading.

**Fix (two parts):**
1. Restore the shell (C1) — fixes the raw HTML for non-rendering crawlers.
2. In the app: demote the top-bar brand from `<h1>` to `<div>`/`<p>`, move the About badge button out of the heading, and add a page-level `<h1>` (visually hidden is acceptable) at the app root, e.g. "MermaidStudio — Free Online Mermaid Diagram Editor". Add `<h2>`s where the UI has natural sections (About modal, Release Notes, templates gallery).

**Verification (falsifiable):**
```
claude-seo run render_page.py https://www.mermaidstudio.net/ --mode always --output rendered-check.html
grep -c "<h2" rendered-check.html        # today: 0 — pass: >= 1
grep -o "<h1[^>]*>[^<]*" rendered-check.html  # pass: h1 text contains "Mermaid Diagram Editor", no <button> inside <h1>
```

---

## Category detail

### 1. Crawlability — PASS (95)
- `robots.txt` live matches repo (`public/robots.txt`): `User-agent: * / Allow: /`, sitemap declared. Validated by `sitemap_discovery.py`: declared sitemap `https://www.mermaidstudio.net/sitemap.xml` → HTTP 200, valid urlset, no warnings.
- No AI-crawler blocks (GPTBot, ClaudeBot, etc. all allowed) — consistent with the site's open-source positioning; but see C1: those crawlers currently get zero content.
- Unknown paths return real **404** (`/this-page-does-not-exist-xyz123` → 404; `/fr/` → 404) — no SPA catch-all rewrite, so no soft-404 factory.
- No `noindex` anywhere; `X-Robots-Tag` header absent on 200 responses (indexable by default).

### 2. Indexability — PASS WITH RISKS (70)
- Canonical `https://www.mermaidstudio.net/` (`index.html:18`) is self-referencing, matches og:url, sitemap loc, robots.txt host and JSON-LD url — perfect consistency.
- `meta robots: index, follow` (`index.html:42`); no conflicting headers.
- Sitemap: exactly 1 URL, correct absolute www HTTPS URL. Single-URL sitemap is appropriate for a mono-page site.
- Risks: C1 (no raw content to index), L2 (stale lastmod), L3 (`/index.html` duplicate served at 200).

### 3. Redirects — FAIL (65)
- H1 above (307). Everything else clean: http→https 308, apex path preservation correct, redirect chains ≤ 2 hops, no redirect loops, no trailing-slash variants to worry about on a one-URL site.

### 4. Security — PASS WITH FINDINGS (75)
Present and enforced: `Strict-Transport-Security` (max-age=63072000), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/payment denied), `COOP: same-origin`, `COEP: require-corp` (required for WebGPU cross-origin isolation — correctly in `vercel.json:11-17`).
Findings: M1 (CSP Report-Only), L1 (HSTS flags), L4 (ACO wildcard, informational).

### 5. URL structure — PASS (95)
Single clean canonical URL: HTTPS, www, no extension, lowercase, no path, parameters only for in-app actions (`/?action=new`, `/?action=templates` from `manifest.json:39,46`) which consolidate to `/` via the fixed canonical. Matches the actual `?` redirect conventions.

### 6. Mobile — PASS (95)
- Viewport `width=device-width, initial-scale=1.0` (`index.html:12`), with a documented, reasoned decision against `viewport-fit=cover` (`index.html:6-11`).
- Full PWA: manifest with `display: standalone`, maskable icons (192/512 + SVG), wide+narrow screenshots, shortcuts (`public/manifest.json`); apple-touch-icon and iOS meta present; dual theme-color for light/dark.
- Tailwind responsive utility CSS; screenshots (`screenshot-wide.png`, `screenshot-narrow.png`) both 200.

### 7. Core Web Vitals — structural notes only (80) — field data left to the CWV agent
Positives: instant-paint boot splash inside `#root` (likely LCP element, fast), preconnects for Google Fonts (`index.html:96-97`), `font-display=swap`, HTML `max-age=0, must-revalidate` + hashed assets `max-age=31536000, immutable` (`vercel.json:7-9,36-44`), aggressive manual chunk splitting (react-vendor, mermaid-*, codemirror-*, etc. — 10 modulepreloads in served HTML), SW uses **network-first for navigation documents** (`sw.js:80-95`) so users never get stale HTML referencing deleted chunks.
Risks: one render-blocking cross-origin stylesheet (Google Fonts CSS); heavy editor bundle (CodeMirror/Mermaid/transformers) affects INP/TTI, unassessable from source; CLS structurally low (fixed overlay splash, no image-driven content flow). Sourcemaps disabled — no ranking impact either way. Googlebot does not execute service workers, so the SW has no crawl/index effect.

### 8. JavaScript rendering — FAIL (35) — the site's #1 risk class, realized
- CSR-only: no SSR/SSG/prerender tooling in `package.json` or `vite.config.ts`; served HTML is a pure app shell.
- C1: the one mitigation the site had (static shell content) was removed in production on 2026-10-06. Restoring it converts this back to a resilient hybrid: crawlers that don't render JS get the full pitch; Google renders the app on top.
- Hydration failure modes are well-handled: 12s no-mount fallback with reload button (`index.html:136-148` served), 8s splash CSS timeout, noscript messaging.
- Rendered DOM confirmed good: status 200, title preserved (`MermaidStudio — Free Online Mermaid Diagram Editor`), `lang="en"` preserved (`src/hooks/useLanguage.ts:24` updates it on locale switch), app UI text present in `extracted_text`.
- SW registered prod-only via `src/components/shared/ServiceWorkerUpdateToast.tsx:29` (`.register('/sw.js')`); versioned cache + skipWaiting gated behind a user prompt (`sw.js:150-153`).

### 9. hreflang / localization — PASS (100)
No `hreflang` link tags exist in the raw HTML — the "both spellings" hits are an HTML **comment** (`home-raw.html:43-44`, `index.html:43-45`) documenting deliberate removal: `<!-- hreflang /en /fr retirés : ces routes n'existent pas (404). -->`. That decision is correct and verified: `/fr/` returns real 404. Self-referencing-only hreflang on a single URL would have been invalid; pointing at 404 routes worse. Current handling is right: one URL, in-app EN/FR switcher (`useLanguage.ts`), `og:locale:alternate: fr_FR` (`index.html:30`), JSON-LD `inLanguage: ["en","fr"]`. Reintroduce hreflang only if real localized routes ship.

### Structured data — PASS
One `WebApplication` JSON-LD (`index.html:50-80`), build-pipeline substitutes `softwareVersion` (`%APP_VERSION%` → `2.1.0` in served HTML). No `aggregateRating`, no HowTo (deprecated Sept 2023 — and out of scope here), no FAQPage. Fields consistent with visible content.

### On-page basics — PASS WITH FINDINGS (80)
- Title: `MermaidStudio — Free Online Mermaid Diagram Editor` (51 chars, keyword-rich) — good; survives rendering unchanged.
- Meta description: present, compelling, ~163 chars (L5 truncation nit).
- Headings: see H2 (Critical-adjacent).
- Social: og:title/description/url/image (absolute 1920x1080, alt, dimensions) + twitter:card `summary_large_image` — complete; `og-image.png`, `favicon.svg`, `apple-touch-icon.png` all live-verified 200.
- `lang="en"` on `<html>`, runtime-updated on locale switch.

---

## Recommended action order

1. **C1** — restore crawlable shell from `git show d169dbf~1:index.html` (one commit + deploy).
2. **H1** — permanent (308) apex redirect via `vercel.json` `redirects` or Vercel domain settings.
3. **H2** — app-root real h1 + demote top-bar brand + remove button from heading (needs MermaidStudio-App port review since it touches shared UI components).
4. **M1** — after a quiet CSP report window, flip `Content-Security-Policy-Report-Only` → `Content-Security-Policy`, having first hashed or externalized the inline bootstrap script.
5. **L1-L5** — HSTS `includeSubDomains`; wire `lastmod` to the deploy (or drop it); 301 `/index.html` → `/`; trim description; drop `keywords`/`app-ads.txt`.

---

*Task-observer: 7 observations matched `seo-technical`; applied — plain `curl -sSI` (no `-w` path-mangling), bare `claude-seo` script names, no UA-probe redirect misclassification, and 5748's variant-negotiation caveat (N/A: this site serves one language variant at one URL, raw and rendered captures agree).*
