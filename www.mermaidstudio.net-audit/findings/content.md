# Content Quality / E-E-A-T / AI-Citation Audit — https://www.mermaidstudio.net/

**Date:** 2026-10-29 · **Scope:** Content quality, E-E-A-T, AI citation readiness (mono-page SPA; schema/tech/hreflang are other agents' lanes)
**Evidence base:** Chromium-rendered crawl `d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/render-home.json` (status 200, playwright-chromium); live verification curls 2026-10-29; own source repo `d:/code/mermaidstudio`.
**Derived evidence files:** `d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/visible-text.txt` (rendered visible text), `d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/raw-shell.html` (deployed raw HTML). Repro scripts: `scratch_extract.py`, `scratch_readability.py` in the audit dir.

---

## 1. Scores

| Metric | Score | Basis |
|---|---|---|
| **Content Quality** | **34 / 100** | Meta/structured layer is excellent (9/10) but the on-page content layer is ~empty (1/10): ~116 rendered word tokens, 100% UI chrome, 0 prose paragraphs. Weighted toward on-page substance. |
| **E-E-A-T** | **38 / 100** | Experience 3/10, Expertise 5/10, Authoritativeness 3/10, Trustworthiness 4/10 (weights 20/25/25/30 — internal model; Google publishes no numeric weights, trust is stated as most important). |
| **AI Citation Readiness** | **18 / 100** | Non-JS AI crawlers see title + meta description + JSON-LD featureList + a 20-word noscript. JS-rendering consumers see button labels with no quotable passages. Saved from single digits only by the meta layer. |

E-E-A-T rationale (weighted: Experience 3×.20 + Expertise 5×.25 + Authority 3×.25 + Trust 4×.30 = 3.8/10):

- **Experience 3/10** — A genuine first-hand origin story exists ("born out of frustration with online diagram editors", en.json:682) and the working tool is itself experience evidence — but every crawlable trace of the human and the story was deleted with the shell (C-1). No on-page authorship, no case studies, no screenshots-with-context as content.
- **Expertise 5/10** — JSON-LD featureList is technically precise and verified accurate against the codebase (local WebGPU inference via `WebGPUMLCProvider`, PWA, MIT). The deleted shell showed real domain knowledge ("an open-source alternative to the Mermaid Live Editor"). A full docs corpus exists (`docs/`: user-guide, developer-guide, architecture) but is unlinked from the site (H-3).
- **Authoritativeness 3/10** — Exactly one link site-wide (GitHub footer, `StatusBar.tsx:68`). Author identity appears only inside JSON-LD, never visibly (M-1). Ko-Fi/Liberapay support links were deleted with the shell. GitHub Pages docs site exists but is undiscoverable from the property.
- **Trustworthiness 4/10** — Good: HSTS, strict headers (verified in crawl headers), verifiable open source, "no account" claim true. Bad: "no telemetry"/"no tracking" copy contradicted by live Vercel Analytics + Speed Insights (`App.tsx:161-162`); no privacy policy or terms reachable at any URL (`/privacy` → 404, verified) despite a privacy-first value proposition; repo PRIVACY.md's third-party disclosure omits Vercel Analytics entirely.

---

## 2. Findings table

| # | Sev | Finding | Evidence (verbatim + location) |
|---|---|---|---|
| C-1 | **Critical** | **Production page ships zero crawlable body content — the deliberately built crawlable shell was removed and the removal shipped to prod.** Live HTML contains no shell: `curl -s https://www.mermaidstudio.net/ \| grep -c 'class="shell"'` → **0** (verified 2026-10-29). Deployed body = 1,910 bytes: boot splash + 12s-error fallback + noscript, nothing else. Repo index.html:158-160 says *"Crawlable shell content: indexed by search engines and AI crawlers, and shown while the app bundle loads… keep an equivalent fallback if this block changes"* — immediately followed by index.html:161: `<!-- Shell removed for dev -->`. Orphaned shell CSS styles content that no longer exists (index.html:111-118: `.shell h1{…}.shell p{…}.shell ul{…}.shell .trust{…}`). Git: `d9eaa77 feat(seo): crawlable shell, WebApplication JSON-LD and honest meta (P2)` built it; `d169dbf fix(ui): mobile polish loop it25-33 — error state, popover, a11y` removed it (`git log -S "Shell removed for dev" -- index.html` → d169dbf). Deleted copy (recovered via `git show d169dbf^:index.html`): h1 *"MermaidStudio — Free & Open-Source Mermaid Diagram Editor"*; h2 *"A free online Mermaid diagram editor — an open-source alternative to the Mermaid Live Editor"*; 2 paragraphs (*"Unlike cloud editors, MermaidStudio runs entirely on your machine…"*); a 5-item feature list (*"In-browser AI (WebGPU) — generate and fix diagrams with a local LLM; your code never leaves the machine."* …); trust line *"Free & open source (MIT) · Runs entirely in your browser — even the AI · ★ GitHub · ☕ Ko-Fi · Liberapay"*. | 
| C-2 | **Critical** | **Effective content depth ≈ 0.** Rendered visible text = 846 chars / ~116 word tokens, essentially all UI control labels (70 `<button>` labels: "Box", "Round", "Stadium", "Diamond"…), **0 prose paragraphs, 1 h1, 0 h2/h3, 1 link**. Fails every page-type floor (homepage 500 / product 300+). Raw HTML (what 100% of AI crawlers index) carries 20 words of prose (noscript). `content_quality.py` on rendered text: `tokens: 116`, flags `["thin-content"]` (its 90 overall score reflects absence of filler, not substance). |
| H-1 | **High** | **Privacy claims conflict with production code, and no privacy policy is reachable on the domain.** Copy: en.json:670 *"Free & private — open source (MIT), no account, no telemetry, works offline."*; en.json:683 *"Free, open source, no tracking."* Code: `App.tsx:161-162` mounts `<Analytics />` (`@vercel/analytics`) and `<SpeedInsights />`. Policy: `d:/code/mermaidstudio/PRIVACY.md:11` says *"We run no accounts, no servers, and no analytics of our own"* and its only third-party disclosure is Google AdMob **on Android** (PRIVACY.md:29-41) — Vercel Analytics (web) is undisclosed. On-domain: `curl /privacy` → **404** (verified). Vercel Analytics is cookieless, but it is third-party usage telemetry (page views, referrer, coarse geo) — the absolute "no telemetry / no tracking" wording is falsifiable in any devtools panel. |
| H-2 | **High** | **French content is unreachable at every URL despite bilingual positioning.** `fr.json` maintains 611 leaf keys; `og:locale:alternate fr_FR` (index.html:30) and JSON-LD `"inLanguage": ["en", "fr"]` declare French; yet `src/i18n/config.ts:13` hardcodes `lng: 'en'` (no detector), and the repo comment (index.html:43-45) confirms: *"hreflang /en /fr retirés : ces routes n'existent pas (404)"*. Verified live: `curl /fr` → **404**; homepage with any Accept-Language returns the identical English shell. No crawler — with or without JS — ever sees a single French word. The FR catalog is dead inventory for search and AI systems. |
| H-3 | **High** | **All supporting/authority content exists but is unreachable or unlinked — the site is an island.** `docs/` (user-guide, developer-guide, architecture, CONTRIBUTING.md) deploys to GitHub Pages (`.github/workflows/ci.yml` deploy-docs job, `path: docs/`) with zero links from the site (`/docs` on-domain → 404, verified). CHANGELOG.md is reachable only via the Welcome modal (`WelcomeModal.tsx:8`: `${GITHUB_URL}/blob/main/CHANGELOG.md`). The best definitional copy is modal-trapped (en.json:667, 682-683). The rendered DOM contains **exactly one `<a>`**: "MermaidStudio is open source" → `StatusBar.tsx:68`. |
| M-1 | Medium | **Author identity invisible on-page.** JSON-LD: `"author": { "@type": "Person", "name": "Jérémie Dufault", "url": "https://jeremiedufault.ca" }` (index.html:65) with LinkedIn in sameAs (index.html:77) — but the rendered page shows the name zero times, and index.html:41 `meta author="MermaidStudio"` (brand) contradicts the Person entity. Quality raters and LLMs cannot connect the content to a human. |
| M-2 | Medium | **AI-citation passage structure absent.** No definitional passage ("what is MermaidStudio"), no h2-anchored sections, no self-contained paragraphs in the rendered DOM (only buttons + code sample). The most quotable sentences on the whole property are deleted (shell, C-1) or modal-trapped, e.g. en.json:667 *"A fast, fully client-side editor for Mermaid diagrams. Your diagrams, settings, and AI models stay in your browser — nothing is sent to a server."* Remaining quotable assets are meta-only: the 158-char meta description and JSON-LD `featureList` (5 claims, cross-checked accurate against the code: local WebGPU inference, visual editor, folders/versions, export, PWA en/fr). |
| L-1 | Low | **en/fr catalog drift.** `fr.json` is missing `preview.confirmDelete` (FR UI silently falls back to English for that string); 3 FR-only keys (`ai.modelNotAvailable`, `ai.syntaxIssues`, `ai.applyAnyway`) have no EN counterpart; 22 EN=FR identical values (mostly legitimate cognates: "Triangle", "Document", "Menu"). |
| L-2 | Low | **Freshness signals are meta-only.** No visible date anywhere on the page; freshness cues are v2.1.0 badge, sitemap `lastmod 2026-10-04`, and HTTP `last-modified` (same-day). Release notes live off-site (GitHub CHANGELOG). |
| L-3 | Low | **Minor trust/cosmetic oddities.** `public/app-ads.txt` declares AdSense publisher `pub-7769962314825213` on an ad-free, "no tracking"-positioned web property (explainable as Android AdMob verification — PRIVACY.md discloses AdMob — but a careful rater can question it); legacy `meta keywords` tag (index.html:40, ignored by search engines); title says "Online" while og:title says "Open-Source" for the same page. |

### What is done right (keep)
- Honest, specific meta description: *"Free, open-source Mermaid diagram editor that runs online in your browser — in-browser AI (WebGPU), drag-and-drop editing, folders and version history. No account."* (index.html:17) — self-contained, quotable, 158 chars.
- JSON-LD integrity: explicit refusal to fabricate (`index.html:47-49`: *"No fabricated aggregateRating, no HowTo (deprecated Sept 2023), no FAQPage (rich results retired May 2026)"*); `featureList` verified accurate against `src/services/ai/WebGPUMLCProvider.ts`.
- Correct canonical, clean robots.txt + single-URL sitemap, one well-anchored footer link, zero filler/AI-slop patterns in all copy that exists (content_quality.py: `filler_score: 0`, `ai_pattern_score: 0`). The deleted prose was genuinely good writing — restore it, don't rewrite it.

---

## 3. Readability

| Text body | Words | Flesch Reading Ease | FK grade | Verdict |
|---|---|---|---|---|
| Rendered visible copy | ~116 (UI labels) | N/A | N/A | Not prose; readability metrics meaningless on button labels |
| **Deleted shell prose** (should be the page) | 185 | 47.4 | 11.8 | Slightly dense; fine for a developer audience; sentences avg 20.6 words |
| Modal-trapped prose (welcome+about) | 138 | 56.1 | 8.9 | Good |
| Noscript (only non-JS prose) | 20 | 44.4 | 9.6 | Adequate |

Target once the shell is restored: keep FRE in the 50-60 band by splitting the two longest sentences.

## 4. Language coverage summary

- Crawlers without JS (all major AI crawlers: GPTBot, ClaudeBot, PerplexityBot, etc.): title + meta description + splash text "MermaidStudio" + 20-word noscript. French: **0 words at any URL**.
- Crawlers with JS (Googlebot): English app UI (~116 tokens of labels). French: still **0 words** — the FR switcher is in-app state on a single URL (`config.ts:13`).
- Strategy implication: the maintained 611-key FR catalog currently has zero search/AI value. Either ship a localized route (`/fr/` with a rendered FR shell) or accept that FR is product-UX-only and stop declaring FR to machines (`og:locale:alternate`, `inLanguage`) until it is reachable. (hreflang validity itself is another agent's lane.)

## 5. Verification steps (Critical/High)

- **C-1:** `curl -s https://www.mermaidstudio.net/ | grep -c 'class="shell"'` → currently **0**. After restoring the shell from `git show d169dbf^:index.html`: expect ≥1, and visible word count ≥ 185. History check: `git log -S "Shell removed for dev" -- index.html` → d169dbf.
- **C-2:** `python d:/code/mermaidstudio/www.mermaidstudio.net-audit/scratch_extract.py` → prints rendered headings/links/blocks and word count (currently: 1 h1, 0 h2, 1 link, ~116 tokens, 0 `<p>`).
- **H-1:** (a) `curl -s -o /dev/null -w "%{http_code}" https://www.mermaidstudio.net/privacy` → currently **404**; (b) load the site with devtools Network filtered on `_vercel/insights` → a view beacon appears, falsifying "no telemetry"; (c) `grep -i vercel PRIVACY.md` → no disclosure.
- **H-2:** `curl -s -o /dev/null -w "%{http_code}" https://www.mermaidstudio.net/fr` → currently **404**; `curl -s -H "Accept-Language: fr" https://www.mermaidstudio.net/ | grep -c "Éditeur\|éditeur"` → 0 (no French in served HTML).
- **H-3:** count anchors in rendered DOM (`scratch_extract.py` links section) → exactly 1 (`https://github.com/CatFoxVoyager/MermaidStudio`); `curl -s -o /dev/null -w "%{http_code}" https://www.mermaidstudio.net/docs` → 404 (docs live on GitHub Pages, unlinked).

## 6. Recommendations (priority order)

1. **Restore the crawlable shell in production** (C-1, C-2): revert the shell deletion from d169dbf; if it interferes with mobile dev, gate it by env (`import.meta.env.DEV`) rather than deleting. This single change roughly fixes scores C-2, M-2, and lifts E-E-A-T Authority/Trust (the shell carried the Ko-Fi/Liberapay/trust links).
2. **Publish a privacy page on-domain** and link it from the app footer and the restored shell; amend PRIVACY.md's third-party section to disclose Vercel Analytics (web) (H-1). Align copy: "no accounts, local-first, cookieless analytics" instead of absolute "no tracking/no telemetry".
3. **Surface the author visibly** (M-1): an "About the author" line or footer credit matching the JSON-LD Person; fix `meta author` to match.
4. **Link the supporting content** (H-3): add visible links to docs (GitHub Pages URL), CHANGELOG, GitHub from the shell/footer; consider an on-domain `/docs` path.
5. **Decide French strategy** (H-2): ship `/fr/` with a rendered FR shell (fr.json copy is ready) or drop machine-facing FR declarations.
6. Restore the on-page definition passage and add 2-3 h2-anchored sections ("What is MermaidStudio", "How it works", "Privacy") so AI systems get self-contained, heading-anchored quotable passages (M-2).
7. Sync `preview.confirmDelete` into fr.json and the 3 ai.* keys into en.json (L-1).
