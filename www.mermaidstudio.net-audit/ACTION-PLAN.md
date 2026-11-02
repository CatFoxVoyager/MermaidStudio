# ACTION PLAN — mermaidstudio.net SEO Audit (2026-10-29)

Health score **51/100** → projected **80+** from Phase 1 + Phase 2 alone (shell + redirect + headings + privacy are single-category fixes with large weights).

Dependency note: **the shell restore is the unlock for the most items** (content depth, citability passages, headings layer, trust links, comparison framing). Do it first; everything else is independent.

---

## Phase 1 — Critical Fixes (Week 1)

| # | Action | File / Where | Effort | Verification (falsifiable) |
|---|---|---|---|---|
| 1.1 | **Restore crawlable shell** from `git show d169dbf~1:index.html` (h1 + 2 paragraphs + 5-item feature list + trust links + `.shell` styles). In dev, gate by env (`import.meta.env.DEV`) instead of deleting. Web-repo only — no Android port (no `src/` change). | `index.html` (between boot splash and `<noscript>`) | 1-2 h | `curl -s .../ | grep -c '<h1'` ≥1; ≥185 words; `grep -F "Mermaid Live Editor"` matches |
| 1.2 | **apex→www 308 permanent**: add `redirects: [{ source: "/(.*)", has: [{type:"host", value:"mermaidstudio.net"}], destination: "https://www.mermaidstudio.net/$1", permanent: true }]` | `vercel.json` | 15 min | `curl -sSI https://mermaidstudio.net/ | head -1` → 308 |
| 1.3 | **Real h1 + heading tree**: app-root visible h1 "MermaidStudio — Free Online Mermaid Diagram Editor"; demote topbar brand to `<div>`; move About button out of the h1; h2 for natural sections. **FLAG: shared UI → port to MermaidStudio-App** (cross-repo sync rule). | `src/` topbar + app root | 1-2 h | rendered DOM: h1 contains "Mermaid Diagram Editor", 0 button inside h1, ≥1 h2 |
| 1.4 | **Privacy page + copy alignment**: publish `/privacy` (static, self-canonical) from amended PRIVACY.md disclosing Vercel Analytics; change "no telemetry / no tracking" → "no accounts, local-first, cookieless analytics"; link from shell + app footer. | `public/privacy.html` (or route), `src/i18n/locales/en.json:670,683`, `PRIVACY.md:11,29-41` | 2-3 h | `/privacy` → 200; `_vercel/insights` beacon disclosed in policy |
| 1.5 | **GSC access**: share `sc-domain:mermaidstudio.net` with `pagespeed@home-22395.iam.gserviceaccount.com` (Restricted) — or create the Domain property + DNS verify. Unlocks indexation/perf reporting for every future audit. | Google Search Console UI | 10 min | re-run GSC probe → 200 instead of 403 |

## Phase 2 — High-Impact Improvements (Weeks 2-3)

| # | Action | File / Where | Effort | Verification |
|---|---|---|---|---|
| 2.1 | **De-eager the mermaid stack**: dynamic-import `@/lib/mermaid/core` inside PreviewPanel's render effect (or React.lazy the panel) with skeleton; idle-prefetch post-paint. In-repo precedent: `ai-webgpu` (already correctly lazy). | `src/components/preview/PreviewPanel.tsx:4`, `src/components/editor/WorkspacePanel.tsx:7` | 2-4 h | `modulepreload` 11 → ≤9; mermaid matches → 0; PSI unused-JS < 400 KiB |
| 2.2 | **Lazy CodeEditor**: `React.lazy(() => import('./CodeEditor'))` + idle preload | `src/components/editor/WorkspacePanel.tsx:5` | 1-2 h | codemirror chunk no longer in served HTML modulepreload census |
| 2.3 | **Fonts dedup**: delete `src/index.css:1` `@import`; gate the 17-font injection (`App.tsx:18-28`) behind actual font selection; keep `crossorigin` (COEP) | `src/index.css:1`, `src/App.tsx:18-28`, `src/constants/fonts.ts` | 1-2 h | exactly 1 Google Fonts request per load; 0 render-blocking |
| 2.4 | **JSON-LD upgrade**: add `screenshot` array + move person identities to `author.sameAs` (GitHub profile), app `sameAs` = repo — ready-to-paste block in findings/schema.md | `index.html:50-80` (replace) | 30 min | `grep -c "screenshot-wide.png"` ≥1; validator clean |
| 2.5 | **og-image v2**: regenerate WITHOUT version badge (badges go stale — v0.9.0 is baked today), 1200×630, large wordmark + one-line value prop + enlarged diagram motif; re-capture manifest screenshots | `public/og-image.png`, `public/screenshot-*.png` | 1-2 h | badge absent; new md5 differs from 52c0b89b…; legible at 400 px |
| 2.6 | **llms.txt + entity fields**: `public/llms.txt` (summary, canonical, version, license, GitHub README link); add repository/homepage/description/author/license to package.json | `public/`, `package.json` | 30 min | `/llms.txt` 200; `node -e require('./package.json').repository?.url` defined |
| 2.7 | **Sitemap lastmod generator**: `scripts/generate-sitemap.mjs` as `prebuild` (lastmod = deploy date, never false) | `scripts/`, `package.json` | 30 min | internal lastmod ≥ latest content commit date after next deploy |
| 2.8 | **Small security/housekeeping batch**: apply `boot-splash-out` fade at 8 s (dead code today); HSTS `includeSubDomains`; 301 `/index.html` → `/`; drop `meta keywords` + `public/app-ads.txt`; trim meta description to ~155 | `index.html`, `vercel.json` | 1-2 h | fade rule applies (occurrence ≥2); header check; `/index.html` → 301 |
| 2.9 | **Ship the docs property**: verify self-hosted CI runners are active (job never ran → Pages 404/NXDOMAIN); deploy docs; link docs/CHANGELOG/GitHub from shell footer | `.github/workflows/ci.yml` (deploy-docs), self-hosted stack | 1-4 h (infra-dependent) | `catfoxvoyager.github.io/MermaidStudio/` → 200; footer links count ≥3 |

## Phase 3 — Content & Authority (Month 2)

| # | Action | Rationale (from audit) |
|---|---|---|
| 3.1 | **Always-visible value-prop strip** (rendered, crawlable): "AI runs locally on your GPU (WebGPU) — your code never leaves your machine" + footnote the 400–700 MB one-time model download | AI-curious persona scored 4/10; claim today is 2 clicks deep, crawler-invisible; cost disclosure post-commitment |
| 3.2 | **French decision**: ship `/fr/` with rendered FR shell (611 keys ready) OR drop `og:locale:alternate` + `inLanguage` until reachable | 611 FR keys = dead inventory; crawlers see zero French words |
| 3.3 | **Brand seeds**: 2-min YouTube demo (highest-correlation signal ~0.737), Show HN, awesome-mermaid PRs, r/mermaid + r/webdev, dev.to build-log | 1 verified inbound link total; comparison SERP ceded to listicles; repo outranks site |
| 3.4 | **3 h2 sections in shell area**: "What is MermaidStudio" / "How it works" / "Privacy" with 40-60-word direct answers | passage-level citability for AI Overviews/LLMs |
| 3.5 | **GA4 + author surface**: configure `ga4_property_id`; footer credit matching JSON-LD Person; fix `meta author` | Tier-2 reporting; author invisible today |

## Phase 4 — Monitoring & Iteration (Ongoing)

- **Drift baseline** after Phases 1-2 land: `claude-seo run drift_baseline.py https://www.mermaidstudio.net/` — regression net for future deploys (none existed at audit time).
- **CrUX re-probe monthly** — field LCP/INP become measurable once the origin qualifies; then CrUX History gives the 25-week trend.
- **SERP re-check quarterly** — site URL present in top-20 of the 3 observed queries; listicle placements.
- **CSP enforcement** after a quiet report window: hash the inline bootstrap, flip Report-Only off.
- **Re-audit post-fix** — expected 51 → 80+ from Phases 1-2; validate the projection against the falsifiable gates in FULL-AUDIT-REPORT.md.
