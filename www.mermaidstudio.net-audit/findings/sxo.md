# SXO / Search Experience Audit — https://www.mermaidstudio.net/

- **Date:** 2026-10-29
- **Scope:** Search-experience side only — page-type match, user stories, persona scoring. Crawl/index/schema/content-depth/GEO are other agents' lanes (see `technical.md`, `content.md`, `geo.md`).
- **Evidence base:** orchestrator-shared captures — `raw/home-raw.html` (JS-blind served HTML), `raw/render-home.json` (Chromium render, 200), `raw/visible-text.txt` (rendered text, 101 lines, 100% UI chrome); sibling findings read for consistency; source repo reads (`App.tsx`, `WelcomeModal.tsx`, `en.json`). SERP evidence collected fresh this session: 3 live DuckDuckGo Lite top-10 fetches (HTTP 200, 10 result-links each, challenge-canonical detector negative), transcribed verbatim to `raw/serp-ddg-transcript.txt`.
- **SERP method note:** DuckDuckGo Lite (Bing-backed) was used as the observable proxy; Google was not directly observable from this environment. PAA boxes, ads, AI Overviews and related-searches are **not served by this endpoint and are NOT MEASURED** — no claim in this report depends on them. The 10/10 and 7/10 page-type patterns below are robust to engine variance for this query class (mermaid.live is the category brand in every engine).

## SXO Gap Score: **42 / 100**

Two layers, opposite verdicts. **Once rendered, the page is an excellent tool page (≈60/100)** — the query set wants a tool, and the tool is the page. **The search experience around it fails (≈25/100)**: for every non-rendering entry point the page is a spinner with a brand name, the site appears in **0 of the 30 observed top-10 results** across its own three target queries (its GitHub repo does rank, #7 for "mermaid live editor alternative"), and even the rendered experience explains nothing about itself in the first 3 seconds.

---

## 1. Page-Type Match

### What the SERP rewards (observed, DDG Lite top-10s)

| Query | Observed consensus | Results (position: site — type) |
|---|---|---|
| `mermaid editor online` | **Tool/Interactive 10/10 (100%)** | mermaid.live (Tool), mermaideditor.io (Tool), mermaidview.io (Tool), mermaid.tools (Tool), mermaideditor.app (Tool), mermaid.ai (Tool), markdownviewer.org/mermaid-editor (Tool), mermaidviewer.net/editor (Tool), mermaideditor.com (Tool), mermaid-editor.online (Tool) |
| `free mermaid diagram editor` | **Tool/Interactive 10/10 (100%)** | mermaideditor.io, mermaideditor.app, mermaidview.io, mermaid.tools, eraser.io/make/free-mermaid-diagram-maker (Tool landing), mermandraw.com, drawmaid.com, mermaideditor.io/diagrams, prisment.io/mermaid-editor, markdownviewer.org — all Tool |
| `mermaid live editor alternative` | **Comparison/listicle ~7/10, Tool 2/10, repo 1/10** | mermaidonline.org blog listicle, AlternativeTo ×2, Swimm "Top 6 alternatives", mermaid.live (Tool), mermaidviewer.net/compare, **github.com/CatFoxVoyager/mermaidstudio (#7 — the repo, not the site)**, selfhost.directory, mermaideditor.io, **trymermaid.app/compare/mermaid-live-editor-alternative (#10 — a competitor built a dedicated compare page for this exact query)** |

Zero blog/tutorial results in any of the 30 slots — pure tool intent on queries 1-2, comparison-content intent on query 3.

### Target classification (per page-type taxonomy #8, Tool/Interactive)

Required elements: WebApplication schema — **present** (JSON-LD, `home-raw.html:50-80`); functional tool above fold — **present after render only**; clear input/output flow — **present** (editor → live preview, "85ms render"); no login wall — **present**. Taxonomy's expected structure "Tool interface (above fold) > Brief instructions > Tool output > **Supporting content below**": the first and third elements exist; **"Brief instructions" and "Supporting content below" exist nowhere** — not rendered, not crawlable.

### Mismatch rating

- **Page type: ALIGNED.** A tool page for tool queries is exactly right; a blog or marketing landing page would be a CRITICAL mismatch here. No pivot needed.
- **Execution of that type: CRITICAL mismatch on the crawlable layer.** The taxonomy's first required element ("functional tool above fold") is invisible to every JS-blind fetch. The served HTML's entire body experience is `#boot-splash` — a spinner and the word "MermaidStudio" (`home-raw.html:128-131`) — plus `<!-- Shell removed for dev -->` (`home-raw.html:152`) where the crawlable pitch used to be. The pre-click and crawl experience promised by the SERP (instant tool) is delivered as a loading screen.
- **Query-3 coverage: HIGH mismatch (single URL vs comparison intent).** 7 of 10 observed results for "alternative" are third-party comparison content. A single tool URL with zero comparison content cannot win that query; worse, the one page that does rank for the brand in that SERP is the GitHub repo — so interested searchers land on GitHub, not on the tool.

---

## 2. User Stories (signal-cited)

**US1 — Paste and render NOW (Decision — SERVED).**
As a developer with Mermaid code copied from a README, I want to paste it and see the diagram immediately, because I am mid-task, but I'm blocked by **time pressure**. *(Signal: 10/10 tool-type SERP; competitor titles "Instant Preview, No Signup" — mermaidview.io, mermaideditor.io.)* Page reality: fully served at render — preloaded "Welcome Diagram" sample, working editor, live Preview pane, "85ms render", "Just saved", Fix/Export present (`visible-text.txt:14-99`). This is the page's genuine strength.

**US2 — Draw from scratch with drag-and-drop (Decision — SERVED, but undiscoverable).**
As a PM or student, I want to build a flowchart by dragging shapes, because I don't know Mermaid syntax, but I'm blocked by **technical confusion**. *(Signal: "Drawmaid — Free Mermaid Diagram Editor with Drag and Drop" ranking on query 2 — drag-and-drop is a ranked differentiator.)* Page reality: served — Visual mode with a 30+ shape palette exists (`visible-text.txt:54-94`) — but it is one unlabeled toggle away ("Code / Preview / Visual", line 21) with no rendered hint that a visual mode exists.

**US3 — Compare against mermaid.live before switching (Consideration — NOT SERVED).**
As a mermaid.live user, I want to know why I'd switch, because switching tools has a cost, but I'm blocked by **comparison fatigue**. *(Signal: query 3 SERP is 70% listicles including a competitor's dedicated `/compare/mermaid-live-editor-alternative` page; the deleted crawlable shell's own h2 was "…an open-source alternative to the Mermaid Live Editor".)* Page reality: nothing on the domain addresses comparison in rendered or raw HTML. The one asset that answered this query was deleted with the shell.

**US4 — Is the AI actually local/safe? (Awareness/risk — NOT SERVED at first impression).**
As an AI-curious user burned by cloud AI tools, I want proof my code stays local, because pasting proprietary diagrams into a cloud LLM is a real risk, but I'm blocked by a **trust gap**. *(Signal: mermaid.ai — a cloud AI diagram SaaS — ranks #6 on the core tool query; MermaidStudio's own meta/JSON-LD leads with "in-browser AI (WebGPU)" as feature #1, which *invites* this question.)* Page reality: the rendered page shows only the button labels "AI" and "Fix" (`visible-text.txt:19-20`). The proof — "Your diagrams, settings, and AI models stay in your browser — nothing is sent to a server" (`en.json:667`) — lives in the About modal, 2 clicks deep, invisible to every crawler. The cost disclosure — "First request downloads the AI model (about 400–700 MB, once)" (`en.json:257`) — appears only *after* committing to the AI panel. The differentiator is invisible at exactly the moment it would win the click.

**US5 — Is this unknown site legitimate? (Decision/trust — PARTIALLY SERVED).**
As a technical evaluator, I want to verify this no-name domain is real software, because I'll build documentation workflows on it, but I'm blocked by **zero prior brand exposure**. *(Signal: query-3 SERP routes trust through AlternativeTo/selfhost.directory listicles; the brand's only ranked property is its GitHub repo.)* Page reality: partial — "MermaidStudio is open source" GitHub link in the status bar (`visible-text.txt:101`) and a v2.1.0 badge are visible; but no author name appears anywhere on the rendered page (JSON-LD only), no docs link, no privacy URL, and Release Notes/About trust content is modal-trapped.

---

## 3. Persona Scoring (0-10 each; rubric dimensions from persona-scoring.md folded into the line)

| Persona (signal origin) | Score | One-line justification (rendered evidence) |
|---|---|---|
| **Quick-edit developer** (10/10 tool-result SERP; "Instant Preview" titles) | **9 / 10** | Working editor + sample + live preview + "85ms render" at first paint — Relevance/Action near-max; loses 1 pt because Visual mode and templates are undiscoverable and splash duration is unmeasured. |
| **Privacy-conscious no-account user** ("No Signup" competitor titles; free-intent queries) | **5 / 10** | Action is fine (no account needed, truly), but Clarity/Trust fail: "no account"/privacy prose exists only in meta tags and the About modal — zero rendered reassurance — and the "no telemetry" claim is contradicted by shipped analytics (content.md H-1), a latent trust injury for exactly this persona. |
| **AI-curious evaluator** (mermaid.ai #6 on core query; own featureList leads with WebGPU AI) | **4 / 10** | Weakest persona: the entire differentiator ("local LLM on your GPU, code never leaves your machine") is absent from the rendered DOM and the crawlable layer, while the 400–700 MB model cost is disclosed only post-click — Relevance exists in meta only, Clarity 2/10-equivalent. |
| **Open-source legitimacy checker** (AlternativeTo/listicle trust ecosystem; repo outranks site) | **5 / 10** | One visible GitHub link + honest version badge carry the whole trust load; no on-page author, no docs/CHANGELOG links (modal/GitHub-trapped), no community proof — Trust dimension ~4/10-equivalent for an evaluator who has never heard the name. |

**Weakest persona: AI-curious evaluator (4/10).** Fix: surface one rendered, crawlable line near the editor or in the restored shell — "AI runs locally on your GPU (WebGPU). Your code never leaves your machine." — reusing `en.json:668` verbatim; disclose the one-time 400–700 MB download as a footnote, not a post-click surprise.

**Systemic issue: Clarity.** Across 3 of 4 personas the page never explains itself — 0 prose paragraphs, 1 brand h1, 0 h2/h3 in the rendered DOM (confirmed by technical.md H2), by deliberate first-run decision: the welcome modal carrying all value props "shows on UPDATES only… A fresh install… skips it" (`App.tsx:125-130`). The UX call is defensible (don't block the tool), but it leaves the rendered page with no self-explanation surface at all.

---

## 4. Findings

| # | Sev | Finding | Rendered-evidence quote / source |
|---|---|---|---|
| SXO-C1 | **Critical** | **The search experience never begins for non-rendering entry.** The SERP promises a tool; JS-blind fetches (first indexing wave, social/AI crawlers, link previews) get a spinner. The site appears in **0 of 30 observed top-10 results** for its own three queries; its GitHub repo ranks #7 on query 3 — searchers meet the README, not the tool. | `home-raw.html:152` — `<!-- Shell removed for dev -->`; body = boot splash only; `raw/serp-ddg-transcript.txt` (30/30 slots, site absent) |
| SXO-H1 | **High** | **First-3-seconds rendered experience is a silent tool.** After render: 101 lines of visible text, all UI chrome, 0 prose, 0 explanation, 0 differentiation. Every top-10 competitor title leads with a differentiator ("Instant Preview, No Signup", "Drag and Drop"); MermaidStudio's rendered page offers no sentence answering "what is this / why this over mermaid.live". The value-prop modal is updates-only, so first-timers never see it. | `visible-text.txt` in full (UI labels only); `App.tsx:125-130` — "Show the welcome / release-notes modal on UPDATES only… A fresh install… skips it" |
| SXO-H2 | **High** | **Comparison intent ("alternative") is ceded entirely to third parties.** 7/10 observed results are listicles, including trymermaid.app's dedicated `/compare/mermaid-live-editor-alternative` page. The site carries no comparison framing anywhere; the deleted shell h2 was precisely this framing. | `raw/serp-ddg-transcript.txt` query 3; `grep -ic alternative` on raw + rendered HTML → 0 |
| SXO-H3 | **High** | **Trust/safety answers are click-gated and the AI cost is disclosed late.** "Nothing is sent to a server" is 2 clicks deep (About modal), invisible to crawlers; the 400–700 MB one-time model download is revealed only after opening the AI panel — a post-commitment surprise for the tool's #1 differentiator. | `en.json:667` ("nothing is sent to a server", modal-only); `en.json:257` ("about 400–700 MB, once", panel-only); rendered grep for both phrases → 0 |
| SXO-M1 | **Medium** | **Splash-to-app time unmeasured; bundle is structurally heavy** (10 modulepreloads incl. mermaid-core + codemirror-features). If mount exceeds ~2.5s on mid-tier mobile, the first-3-seconds experience *is* the spinner for Google's mobile users too. Delegated to the CWV lane for measurement. | `home-raw.html:112-121` modulepreload block; splash is the likely LCP element (technical.md §7) |
| SXO-L1 | **Low** | Rendered text noise: shape-palette labels ("Box", "Round"… ×30) dominate the crawlable-after-render text, diluting what little the rendered index sees; Explorer shows leftover sample folder names. Cosmetic, resolved incidentally by the shell restore. | `visible-text.txt:55-94` |

### Verification steps (falsifiable)

- **SXO-C1:** `curl -sS https://www.mermaidstudio.net/ | grep -c "<h1"` → today **0**, pass ≥1 after shell restore; experience-side: re-run the 3-query DDG Lite fetch after re-indexing and check for the site URL in top-20 (repo currently the only ranked property).
- **SXO-H1:** `claude-seo run render_page.py https://www.mermaidstudio.net/ --mode always` then grep `extracted_text` for `local|private|no account|why` → today **0 matches**, pass ≥1 self-explanation sentence above the fold; 5-second fresh-profile test: a viewer must be able to state what the tool is and one reason to choose it, using only the first screen.
- **SXO-H2:** `curl -sS https://www.mermaidstudio.net/ | grep -ic "alternative"` → today **0**, pass ≥1 (restored shell h2 "…an open-source alternative to the Mermaid Live Editor"); tracked outcome: site URL present in ≥2 of the observed listicles within a quarter.
- **SXO-H3:** click-path count from load to the sentence "nothing is sent to a server" → today **2 clicks, crawler-invisible**; pass: the claim (or equivalent) present in raw HTML + rendered first screen; AI panel first-open shows the download-size disclosure before, not after, the "generate" affordance.

---

## 5. SXO Verdict — root-cause attribution

**The dominant gap is the same root cause the other agents found** — the deleted crawlable shell — but seen from the experience side it is not merely a crawling defect: it deletes the *search experience* itself. The SERP-to-page contract for this query set is "click a result, get a tool instantly"; today every JS-blind path delivers a spinner and every ranked path delivers the GitHub repo instead of the tool.

**Plus one genuinely additional experience-layer finding that survives the shell fix:** the rendered app deliberately suppresses all self-explanation for first-time visitors (updates-only welcome modal, `App.tsx:125-130`, a deliberate Phase 24 E2E-lock decision). Even after the shell is restored — which fixes crawlers — the human who arrives from Google still gets zero on-page answer to "what is this, is the AI safe, why not mermaid.live" without clicks. The fix is shell-shaped (restore the prose) plus one rendered surface (a one-line, always-visible value-prop strip or a non-blocking first-run callout), not a modal regression.

**What already matches the SERP (keep):** tool above fold after render, no login/pricing wall, honest WebApplication schema, preloaded sample diagram as try-it-now demo, EN/FR in-app switcher. The deleted shell prose (185 words, FRE 47.4 per content.md) was exactly the "Brief instructions / Supporting content" layer the Tool taxonomy expects — restore it verbatim.

---

## 6. Limitations

- SERP evidence is DuckDuckGo Lite (Bing-influenced proxy), not Google; Google-only features (PAA, AI Overviews, ads, related searches) were **not measurable** from this environment and no finding relies on them. Ranking positions may differ on Google; the page-type consensus is unlikely to.
- Splash-to-app timing (SXO-M1) was not measured — no fresh timing capture in scope; structural bundle evidence only. CWV agent's lane.
- Click-path depths (2 clicks to About prose, 1 click to AI panel) derive from source code and rendered control labels, not a recorded interactive session.
- Position/volume data (click share by query, brand vs non-brand split) unavailable; persona weighting uses intent inference, not measured volume.
- French-market experience not assessed (FR unreachable at any URL — content.md H-2; that lane owns it).

---

*Task-observer: observations matched `seo-sxo` — applied #4717 (fetch ONE SERP query first, verify result-links before batching; all 3 succeeded; transcribed immediately to `raw/serp-ddg-transcript.txt`; challenge detection by result-count + root-canonical, not status code; unobservable features declared NOT MEASURED) and #5751 (evidence-ceiling named per source type — N/A here: shared captures were already rendered). Logged at session start.*
