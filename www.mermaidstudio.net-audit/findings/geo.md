# GEO / AI Search Readiness Audit — https://www.mermaidstudio.net/

Audit date: 2026-10-29. Scope: single-page React 19 SPA (CSR), canonical `https://www.mermaidstudio.net/` (http apex 308 → https apex 307 → www, verified live; canonical tag matches final URL).
Evidence sources: live curl fetches (robots.txt, sitemap.xml, llms.txt, headers, GitHub API, Wikipedia API), shared crawl data `raw/home-raw.html` (10.9 KB JS-blind fetch), `raw/render-home.json` (Playwright-Chromium render, `is_spa: true`), repo `index.html`, `public/`, `vite.config.ts`, `src/i18n/`.

## 1. AI Search Readiness Score: 37 / 100

| Dimension | Weight | Score | Basis |
|---|---|---|---|
| Citability | 25% | 5/25 | Only quotable prose for any crawler: 27-word meta description + 24-word `<noscript>` sentence + JSON-LD `featureList`. No 134–167-word passage anywhere. Rendered DOM adds **zero** prose (796 chars, all UI labels). |
| Structural Readability | 20% | 4/20 | **Zero `<h1>`–`<h6>` in raw AND rendered DOM** (heading regex over rendered content: 0 matches). `.shell` heading/paragraph CSS ships in prod HTML with no content to style. |
| Multi-Modal Content | 15% | 6/15 | og-image 1920×1080 with alt text (HTTP 200), screenshots + PWA manifest + icons in `public/`; but no `<img>` in page body, no demo video, no sample diagrams as HTML content. en+fr i18n is a plus. |
| Authority & Brand | 20% | 9/20 | Valid JSON-LD `WebApplication` (author Person, `sameAs` GitHub+LinkedIn, MIT license, `softwareVersion` 2.1.0, 1 valid block per render `structured_data`). GitHub public repo: 15★ / 7 forks / MIT / 8 topics / homepage set / pushed 2026-10-29. No Wikipedia entity (API search: 0 relevant hits of 37 token-overlap hits). 15 stars = weak third-party corroboration. |
| Technical Accessibility | 20% | 13/20 | robots.txt blanket-allow + sitemap (verified live, HTTP 200), canonical correct, no X-Robots-Tag header, apex→www chain clean. **But the body is 100% JS-gated** — the entire prose layer is invisible to non-rendering crawlers. llms.txt 404. |

## 2. AI Crawler Access Status (robots.txt fetched live 2026-10-29, HTTP 200)

`public/robots.txt:1-10` and live copy are identical: `User-agent: * / Allow: /` + `Sitemap: https://www.mermaidstudio.net/sitemap.xml`. **No user-agent-specific rules exist, so every AI crawler below is ALLOWED by wildcard.**

| Crawler | Purpose | Status | Implication |
|---|---|---|---|
| GPTBot | ChatGPT training | Allowed | Content eligible for training — but JS-blind, sees meta layer only |
| OAI-SearchBot | ChatGPT Search citations | Allowed | Can index; JS-blind → title/meta/JSON-LD only |
| ChatGPT-User | User-triggered browsing | Allowed | Live fetches see meta layer only |
| ClaudeBot | Claude training | Allowed | JS-blind; meta layer only |
| Claude-Web / anthropic-ai | Legacy/supplementary Anthropic | Allowed | No obstacle |
| PerplexityBot | Perplexity index | Allowed | PerplexityBot does not execute JS → meta layer only |
| Perplexity-User | User-action fetches | Allowed | No obstacle |
| Google-Extended | Gemini training | Allowed | Does NOT control AI Overviews citation (that is Googlebot + ranking); allowed is fine either way |
| Applebot-Extended | Apple Intelligence training | Allowed | Optional block not present; fine for an OSS reach-maximizing site |
| Bytespider | ByteDance | Allowed | Broad reach; no risk for a free tool |
| CCBot | Common Crawl | Allowed | Feeds many training corpora; consistent with open-source posture |
| meta-externalagent | Meta AI training | Allowed | No obstacle |

Verdict: the blanket-allow posture is **correct for this site's goal** (maximum AI citation reach, nothing proprietary). No change needed. The bottleneck is not permission — it is that there is nothing on the page to cite.

Sitemap: present, 1 URL, `lastmod 2026-10-04` (`public/sitemap.xml:5`) — lastmod now lags the Oct 28–29 push activity.

## 3. llms.txt status: MISSING (both 404)

- `https://www.mermaidstudio.net/llms.txt` → HTTP 404 (Vercel NOT_FOUND). `llms-full.txt` → 404. No file in `public/` (glob confirmed).
- Honest cost/benefit for a 1-URL site: llms.txt is a navigation/index aid for multi-page corpora; for a single-URL site it reduces to "one link + a summary that duplicates the meta description". It is **not** read by Google Search. Verdict: cheap nice-to-have (15 min), near-zero standalone impact; only worth adding as part of the shell-content fix. A GitHub-README-anchored llms.txt at least gives agentic fetchers a stable machine-readable summary.

## 4. Citability of the one page — SPA exposure analysis

**What a JS-blind crawler sees** (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, CCBot, Bytespider — i.e. ~all training crawlers and most search-citation crawlers):
- `<title>`: "MermaidStudio — Free Online Mermaid Diagram Editor" (`index.html:15`) — good.
- meta description (27 words, definitional, quotable) (`index.html:17`).
- Full og:/twitter: card set (`index.html:20-37`).
- JSON-LD `WebApplication` with `featureList` of 5 features, `codeRepository`, `sameAs`, author, MIT license, price 0 (`index.html:50-80`; deployed with `softwareVersion: "2.1.0"` — `%APP_VERSION%` build replacement via `vite.config.ts:14-19` verified working).
- `<noscript>`: one definitional sentence + GitHub link (`index.html:162-164`).
- **That is the entire text corpus: ~50 words.** The optimal citable passage is 134–167 words; nothing on the page approaches it.

**Smoking gun — the crawlable shell was removed and never restored.** `home-raw.html:149-152` and `index.html:158-161` both read:
```
<!-- Crawlable shell content: indexed by search engines and AI crawlers ... -->
<!-- Shell removed for dev -->
```
The `.shell` CSS (h1/p/ul/li styles) still ships in prod HTML (`home-raw.html:110`) with nothing to style. Git: the SEO shell shipped in `b221289` ("feat(seo): audit action plan") and the removal comment entered in `d169dbf` ("fix(ui): mobile polish loop it25-33") — a dev-loop deletion that propagated to production because `index.html` *is* the prod template. This is a regression, not a design choice.

**What the rendered DOM adds** (`render-home.json`, `is_spa: true`, rendered text 796 chars): brand header, buttons ("New Diagram", "Templates", "Export"...), 30+ shape names, a sample flowchart's syntax tokens. **0 headings, 0 paragraphs, 0 definitional passages.** The only real prose in the product is locked behind clicks and JS: `src/i18n/locales/en.json:670` ("Free & private — open source (MIT), no account, no telemetry, works offline.") and `en.json:683` (full "how it works" paragraph) — exactly the citable material AI engines need, and it is invisible to every crawler.

**For AI Overviews / ChatGPT / Bing (JS-rendering indexers):** Googlebot/Bingbot can render the app, so the page is *indexed*, but there are no passage-shaped text blocks to extract for grounding. AI Overviews cite passages, not apps — the current page offers none.

## 5. Brand mention signals (cheap checks only)

| Signal | Result | Evidence |
|---|---|---|
| GitHub project | Yes — public, active | api.github.com/repos/CatFoxVoyager/MermaidStudio: `private:false`, 15★, 7 forks, MIT, homepage=https://www.mermaidstudio.net, topics: diagram-editor, flowchart, in-browser-llm, mermaid, open-source, react, typescript, webgpu; created 2026-03-23, pushed 2026-10-29 |
| Schema.org entity data | Present (not duplicating schema agent's full work) | One grep of `home-raw.html:50-80`: JSON-LD `@type: "WebApplication"` (subtype of SoftwareApplication) with author/sameAs/featureList; render `structured_data` confirms 1 valid block |
| Wikipedia entity | None | Wikipedia API search: 37 token-overlap hits, 0 relevant (PlantUML, UML tools list...) |
| Reddit / YouTube / LinkedIn mentions | **UNVERIFIED — platform evidence only** | JS-wall/login-wall sources per verdict-with-ceiling rule: absence NOT concluded from HTTP. Ceiling: verify via GSC, Vercel Analytics referrers, server logs, or logged-in spot checks. Note YouTube mention correlation ~0.737 (strongest known brand-citation signal) — a 2-min demo video is the single highest-leverage off-page action |
| package.json entity fields | Missing | `package.json` has no `repository`/`homepage`/`description`/`author`/`license` fields (grep: only `"version"` matched) — ecosystem crawlers get no entity link |

## 6. Findings table

| # | Severity | Finding | Evidence |
|---|---|---|---|
| F1 | **Critical** | No crawlable body content: production HTML ships with crawlable shell removed (`Shell removed for dev`), leaving ~50 citable words (title+meta+noscript+JSON-LD). Regression from `d169dbf` after `b221289` shipped the SEO shell. Affects every JS-blind crawler: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, CCBot, Bytespider. | `home-raw.html:149-155`; `index.html:158-164`; `render-home.json` `is_spa:true`, `extracted_text` 795 chars of UI labels; git log -S "Shell removed for dev" → d169dbf |
| F2 | **Critical** | Zero heading structure: no `<h1>`–`<h6>` in raw or rendered DOM. No document outline for passage extraction or anchor targeting on any platform. | Heading regex over `render-home.json` rendered content: 0 matches; visible-text.txt (953 B) contains no headings |
| F3 | **High** | No citable passage in the 134–167-word band; no self-contained definitional block reachable without JS. The rich prose exists but is JS/click-gated in i18n bundles. | meta description 27 words (`index.html:17`); `src/i18n/locales/en.json:670,683` (gated prose); `raw/visible-text.txt` |
| F4 | **High** | llms.txt + llms-full.txt absent (404). Marginal value for a 1-URL site (and unread by Google Search) but trivially cheap; would anchor agentic fetchers to the GitHub README. | curl live 2026-10-29: both 404; `public/` glob: no llms.txt |
| F5 | **High** | Brand-correlation gap: no Wikipedia entity, GitHub 15★, Reddit/YouTube presence unverified (JS-wall ceiling — recorded as platform-evidence-only, not absence). YouTube is the highest-correlated citation signal (~0.737) and nothing exists to find. | Wikipedia API (0 relevant hits); GitHub API (15★); ceiling rule for social platforms |
| F6 | Medium | package.json lacks `repository`, `homepage`, `description`, `author`, `license` — broken entity linking for npm/GitHub-ecosystem crawlers and knowledge-graph consolidation. | grep package.json: only `"version"` matched |
| F7 | Low | Freshness plumbing drift: sitemap `lastmod` 2026-10-04 vs pushes through 2026-10-29; no visible date/version on page (renderer's `publication_date` fell back to 2026-01-01). Slight freshness-signal loss. | `public/sitemap.xml:5`; `render-home.json` `publication_date:"2026-01-01"`; git log dates |
| F8 | Low | Dead weight / stale comments in shipped HTML: `.shell` stylesheet + "crawlable shell" comments with no shell content; will be resolved by F1's fix (note: restored shell will be visually covered by boot-splash for slow loads — fine for crawlers, which read DOM text). | `home-raw.html:107-110,149-152` |

**Platform-specific readiness:** Google AI Overviews 35/100 (Googlebot renders the app; nothing passage-shaped to cite; brutal competition: mermaid.live, draw.io) · ChatGPT 25/100 (OAI-SearchBot JS-blind → meta layer only) · Perplexity 25/100 (PerplexityBot executes no JS → meta layer only) · Bing Copilot 30/100 (Bingbot renders; same thin-content ceiling).

## 7. Top 5 highest-impact changes (ranked)

1. **Restore the static crawlable shell in `#root`** (fixes F1+F2+F3, CRITICAL, ~1-2 h). Ship in `index.html`: one `<h1>` "MermaidStudio — Free Online Mermaid Diagram Editor"; a 134-167-word definitional paragraph opening "MermaidStudio is a free, open-source Mermaid diagram editor that runs entirely in your browser..." (reuse `en.json:670,683` prose); 3 question-style `<h2>` blocks with 40-60-word direct answers ("Is MermaidStudio free?", "Does it work offline?", "Can AI generate diagrams locally?"); a `<ul>` of the 5 features (already in JSON-LD `featureList`); links to GitHub + Release Notes. React already replaces `#root` children on first render — zero app-code risk. Expected impact: lifts every JS-blind platform at once; converts meta-only citations into passage citations.
2. **Add `public/llms.txt`** (F4, HIGH, 15-30 min). ~15 lines: tool summary, canonical URL, version, license, GitHub README link. Honest expectation: small gain; bundle with item 1.
3. **Brand-mention seeds** (F5, HIGH, 0.5-1 day, non-code). Publish a 2-min YouTube demo (strongest correlated signal); post to r/mermaid + r/webdev/Show HN; PR the repo onto awesome-mermaid-style lists. Keep the GitHub README the best-written definitional prose about the project — it is HTML on a crawlable domain and is currently the project's most-citable document.
4. **Fill package.json entity fields** (F6, MEDIUM, 10 min). Add `repository`, `homepage`, `description`, `author`, `license`, `keywords`.
5. **Freshness plumbing** (F7, LOW, 30 min). Print "v2.1.0 · updated 2026-10" in the shell (static HTML, matches JSON-LD `softwareVersion`); bump sitemap `lastmod` in the release flow (the docs workflow already refreshes "Updated" dates — same hook).

**Verification steps for Critical/High findings:**
- F1/F2: `curl -s https://www.mermaidstudio.net/ | grep -c "<h1"` → today: 0; after fix: ≥1. Also `curl -s https://www.mermaidstudio.net/ | grep -o "MermaidStudio is a free, open-source"` must return the shell paragraph.
- F3: after fix, extract the first `<p>` after the `<h1>` from raw HTML and count words → must land in 134-167; today's raw-HTML prose total is ~50 words (countable from `home-raw.html:17,154`).
- F4: `curl -s -o /dev/null -w "%{http_code}" https://www.mermaidstudio.net/llms.txt` → today 404; after fix 200.
- F5: ceiling-bound — falsifiable only via platform evidence (GSC/Publisher Center, Vercel Analytics referrer report, logged-in Reddit/YouTube search). Do not accept an HTTP-fetch "absence" claim for these sources.
- F6: `node -e "console.log(require('./package.json').repository?.url)"` → today undefined; after fix a github.com URL.

## 8. Audit-persistence JSON fragment (AI Search Readiness category)

```json
{
  "category": "AI Search Readiness",
  "geo_score": 37,
  "dimensions": {"citability": 5, "structural_readability": 4, "multi_modal": 6, "authority_brand": 9, "technical_accessibility": 13},
  "platform_scores": {"google_aio": 35, "chatgpt": 25, "perplexity": 25, "bing_copilot": 30},
  "ai_crawlers": {"status": "all_allowed_via_wildcard", "user_agents_checked": ["GPTBot","OAI-SearchBot","ChatGPT-User","ClaudeBot","Claude-Web","anthropic-ai","PerplexityBot","Perplexity-User","Google-Extended","Applebot-Extended","Bytespider","CCBot","meta-externalagent"]},
  "llms_txt": {"present": false, "llms_full": false},
  "structured_data": {"webapplication_jsonld": true, "blocks_valid": 1},
  "crawlable_body_words_js_blind": 50,
  "headings_raw": 0,
  "headings_rendered": 0,
  "github": {"stars": 15, "license": "MIT", "public": true, "homepage_set": true},
  "wikipedia_entity": false,
  "critical_findings": ["F1-shell-removed", "F2-no-headings"],
  "high_findings": ["F3-no-passage-134-167", "F4-llms-txt-404", "F5-brand-mention-gap"],
  "platform_evidence_only": ["reddit", "youtube", "linkedin"]
}
```
