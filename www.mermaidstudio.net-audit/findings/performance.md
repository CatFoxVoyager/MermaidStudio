# Performance (Core Web Vitals) — www.mermaidstudio.net

**Fetch date:** 2026-10-29 (all measurements UTC unless noted)
**Target:** `https://www.mermaidstudio.net/` (canonical; apex 307→www — verified below)
**Companion report:** `findings/google-field-data.md` (PSI/CrUX/GSC — no numbers re-run here; anti-duplication rule respected: one lab instrument per number)

---

## 1. Category Score

## Performance (CWV): **40 / 100**

Basis: PSI/Lighthouse mobile lab 40/100 governs (real-traffic skew is mobile; desktop 46/100). **No CrUX field data exists** (origin below Chrome-traffic eligibility, confirmed 2026-10-29), so the category score rests entirely on lab evidence plus first-party structural analysis of the served artifacts. The score is consistent with, and not merely copied from, PSI: the two structural root causes PSI flagged (eager editor bundle, duplicate font CSS) were independently verified against the served HTML, the compiled CSS, the CDN, and the source repo.

### CWV status (lab + structure; field impossible — see §6)

| Metric | Value | Source / instrument | Status |
|---|---|---|---|
| LCP (mobile lab) | 15.4 s | PSI Lighthouse mobile, 2026-10-29T12:41Z | **Fail** (>4 s) |
| LCP (desktop lab) | 2.8 s | PSI Lighthouse desktop, same run | Needs improvement (2.5–4 s) |
| INP (field) | **Does not exist** | CrUX API 404, 2026-10-29 | Unmeasurable (Info) |
| INP proxy (lab TBT) | 610 ms mobile / 790 ms desktop | PSI Lighthouse, same run | Fail (>500 ms-equivalent) |
| CLS (mobile lab) | 0.04 | PSI Lighthouse, same run | Pass (≤0.1) |
| CLS (structural) | No shift source found | curl GET of served HTML 2026-10-29: boot splash (`#boot-splash`) is `position:fixed; inset:0` and is *replaced* (not shifted) by React mount | Pass corroborated |

---

## 2. Eager bundle: ground truth from the CDN and the served HTML

**Instruments:** `curl -sI` (HEAD) + `curl -s -o /dev/null -w %{size_download}` (GET per encoding) against the live Vercel CDN, 2026-10-29 ~12:47Z; served HTML fetched via `curl -s`. Every eager chunk: `content-encoding: br`, `X-Vercel-Cache: HIT`, `Cache-Control: public, max-age=31536000, immutable`.

The served HTML (`/` → 200, single hop) `modulepreload`s **all 11 chunks** of the eager stack:

| Chunk (served hash) | Raw bytes | Brotli wire | gzip wire | Share of eager wire |
|---|---|---|---|---|
| mermaid-core-C2SI5FZb.js | 2,699,666 | **703,694** (687 KiB) | 757,719 | 54.6% |
| mermaid-parser-wbE3AjXh.js | 644,649 | **132,003** | 131,069 | 10.2% |
| vendor-8DQrmIKO.js | 378,491 | 116,263 | 112,954 | 9.0% |
| codemirror-features-AlSpkWjR.js | 379,404 | **126,129** | 121,978 | 9.8% |
| index-DtfPhLI0.js (entry) | 419,624 | 105,700 | 106,301 | 8.2% |
| react-vendor-B8yHM89o.js | 223,604 | 70,561 | 69,709 | 5.5% |
| i18n-K6II2v-y.js | 49,021 | 16,991 | 16,019 | 1.3% |
| lucide-8AJCvN1A.js | 27,137 | 9,115 | 9,215 | 0.7% |
| codemirror-core-B2cPIUA4.js | 13,936 | 5,856 | 5,518 | 0.5% |
| vite-helpers-CguI1RFX.js | 2,144 | 1,118 | 1,083 | 0.1% |
| rolldown-runtime-Dd_uD5pT.js | 1,106 | 649 | 629 | 0.1% |
| index-B_ABXwMQ.css | 53,858 | 11,286 | 10,943 | 0.9% |
| **Eager stack total** | **4,892,636 B (4.67 MiB)** | **1,299,365 B (1.24 MiB)** | — | 100% |

(PSI's "mermaid-core 704 KiB" is consistent with the brotli wire size within measurement variance. PSI total scripts 2,614 KiB also includes font CSS + late chunks; my chunk table covers the 12 eagerly referenced assets exactly.)

### Config vs browser behavior — verdict: the config is correct; the *import graph* is the problem

`vite.config.ts:98-188` (`advancedChunks`, the Rolldown replacement for `manualChunks`) partitions correctly: `mermaid-core` group at **vite.config.ts:141-148**, `mermaid-parser` at 133-136, `codemirror-features` at 151-159, and the 6 MB `ai-webgpu` chunk is correctly **absent** from the served HTML because `WebGPUMLCProvider` reaches it through a dynamic import — proof that Vite/Rolldown emits lazy chunks and skips their `modulepreload` when the code actually uses dynamic imports.

The mermaid/CodeMirror chunks are eager because the entry's static import graph reaches them:

- `src/components/layout/AppLayout.tsx:4` → `@/editor/WorkspacePanel`
- `src/components/editor/WorkspacePanel.tsx:5` → `./CodeEditor` → `src/components/editor/CodeEditor.tsx:2-7` statically imports `codemirror`, `@codemirror/*`, `@lezer` (the whole `codemirror-features` group)
- `src/components/editor/WorkspacePanel.tsx:7` → `@/preview/PreviewPanel` → `src/components/preview/PreviewPanel.tsx:4` statically imports `renderDiagram, detectDiagramType` from `@/lib/mermaid/core` (pulls mermaid → `mermaid-core`, and `@mermaid-js/parser` → `mermaid-parser`)

So: **~945 KiB of the 1,24 MiB eager brotli budget (73%) is the mermaid + CodeMirror stack, loaded and parsed before the user has expressed any intent.** The app's own status bar reports an ~85 ms mermaid render (rendered-DOM capture `raw/render-home.json`, 2026-10-29 08:38 local) — the actual *work* mermaid does at boot is tiny compared to its download+parse cost.

### What the browser does with it (repeat visits / SW)

`public/sw.js`: documents are **network-first** (sw.js:80-95 — never serves stale HTML, correct for immutable-hashed assets), hashed `/assets/*` are **cache-first** (sw.js:97-132), registration happens post-`load` (`src/components/shared/ServiceWorkerUpdateToast.tsx:29`). First visit gets no SW benefit; repeat visits serve the 4.6 MB stack from cache — acceptable, but the first-visit cost above remains the LCP story, and every deploy re-downloads the entry+changed chunks as designed.

---

## 3. Google Fonts: three injection sites, two render-blocking CSS, 19 boot-time font CSS requests

**Instruments:** paired GETs of both css2 variants (2026-10-29); `grep` of served `/assets/index-B_ABXwMQ.css` (first bytes) and of `src/`.

1. **Render-blocking link (head):** `index.html:102` — `css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500` → wire **17,327 B**, references 47 woff2 URLs (browser downloads only used subsets after layout, `display=swap`). Has `preconnect`s (`index.html:96-97`) and `crossorigin` (COEP-safe).
2. **Render-blocking @import (duplicated weight set):** `src/index.css:1` — `@import url('...Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500...') layer(base)`, compiled into the first bytes of the served app CSS. **This is PSI's second weight set** (`300;400;500;600`, no 700): the browser must download the app CSS, parse it, then issue a *second* render-blocking cross-origin CSS request → wire **14,856 B**. Both variants duplicate font-face declarations for Inter and JetBrains Mono (shared subsets downloaded twice where weight ranges overlap).
3. **Eager JS injection of 17 font families:** `src/App.tsx:18-28` appends a `<link rel=stylesheet>` for **every** entry of `SUPPORTED_GOOGLE_FONTS` (`src/constants/fonts.ts:13-93` — Roboto, Open Sans, Montserrat, Poppins, … 17 css2 URLs) on mount, before any user intent. Code-derived ground truth: **19 Google Fonts CSS requests per load**; PSI's census of 40 total stylesheets includes these plus first-party assets.

The two render-blocking CSS requests directly delay FCP/LCP (PSI render-blocking audit, mobile FCP 9.1 s); the 17 injected ones compete for connections/bandwidth against the 1.24 MiB eager stack on the slow-4G profile.

---

## 4. Entry path, preload audit, COOP/COEP

**Instruments:** `curl -sI` apex + www (2026-10-29 12:47Z); `claude-seo run preload_check.py --json` (2026-10-29).

- **www → 200 in a single hop.** Apex → `307 Temporary Redirect` → www. Only apex/http entrants pay one redirect hop; the canonical URL is clean. PSI's "8,618 ms multiple-redirects" is a throttled-lab estimate whose *existence* signal (a hop somewhere on the tested entry path) is real but whose magnitude is not. Vercel-level apex→www behavior; nothing in `vercel.json` introduces hops.
- **preload_check score 50/100:** 0 preload hints, 0 speculation rules, 0 `fetchpriority=high`, no bfcache blockers (`no-store` absent, no unload/beforeunload listeners). Speculation rules are largely moot for a single-page app; the actionable item is removing the duplicate font CSS rather than preloading it. The LCP candidate is text (boot splash → app UI), so `fetchpriority` on an image does not apply.
- **COOP/COEP:** `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` present on both the document and asset responses (`vercel.json:11-22`; verified in curl headers). Required for the WebGPU AI feature — every recommendation below is same-origin chunk restructuring or removal of duplicated cross-origin CSS; none touches these headers. The Google Fonts `<link>` keeps its `crossorigin` attribute (`index.html:102`) — under `require-corp` this is what keeps the CSS fetch CORS-qualified; do not remove it.

---

## 5. Findings table

Severity rule applied: missing field coverage = Info; lab-bad values = High only when the cause is structural (eager bundle architecture), otherwise Medium. Every number is labeled with its instrument.

| # | Finding | Severity | Evidence (instrument, date) |
|---|---|---|---|
| F1 | **Eager 4.67 MiB raw / 1.24 MiB brotli JS+CSS critical path before first paint** — 73% of eager wire is the mermaid+CodeMirror stack (mermaid-core 687 KiB br, mermaid-parser 129 KiB, codemirror-features 123 KiB, codemirror-core 5.7 KiB), statically imported from the entry graph. Drives mobile LCP 15.4 s, FCP 9.1 s, TBT 610 ms, script eval ~1.9 s, PSI unused-JS 1,599 KiB. Config (vite.config.ts) verified correct — the cause is the static import graph, i.e. structural. | **High** | curl HEAD+GET paired, CDN br/gzip per chunk (2026-10-29 12:47Z); served HTML modulepreload census (curl GET, same); source import chain WorkspacePanel.tsx:5,7 → CodeEditor.tsx:2-7, PreviewPanel.tsx:4; cross-checks vite.config.ts:98-188; PSI 2026-10-29T12:41Z |
| F2 | **Google Fonts triple-injection**: 2 render-blocking cross-origin CSS (duplicated weight sets, 32.2 KiB wire combined, duplicated font-face/woff2 downloads) + 17 eagerly injected font-family stylesheets on mount = 19 Google CSS requests per load. | **Medium** | `curl -s` of served app CSS first bytes shows `@import` layer(base) variant (2026-10-29); paired GET of both css2 variants (17,327 B / 14,856 B); grep of `src/index.css:1`, `index.html:102`, `src/App.tsx:18-28`, `src/constants/fonts.ts:13-93` |
| F3 | **Redirect hop for non-canonical entrants** (apex 307→www). Canonical entry is single-hop 200; PSI's 8.6 s magnitude is throttle-inflated. | **Low** | curl -sI apex (307) + www (200), 2026-10-29 12:47Z; PSI redirects audit 2026-10-29T12:41Z |
| F4 | **No resource hints**: 0 preload/preload-hints, 0 fetchpriority, 0 speculation rules (preload_check score 50/100). Mostly a consequence of F1/F2 — for this page shape (text LCP, SPA) the high-value hints work is the font dedup; hints alone would move little. | **Low** | `claude-seo run preload_check.py --json`, 2026-10-29 |
| F5 | **Zero CrUX field coverage** — LCP/INP/CLS unverifiable in the field; INP cannot exist for this origin until Chrome-traffic eligibility. Lab TBT (610/790 ms, poor) is the only responsiveness signal. | **Info** | CrUX API 404 ("insufficient Chrome traffic"), `claude-seo run lcp_subparts.py` + field agent report, 2026-10-29 |
| F6 | **Lab LCP subparts unavailable** (TTFB / load delay / render delay decomposition): `lcp_subparts.py` is CrUX-based and this origin returns 404; bundled `render_page.py` emits rendered DOM/text only (no nav-timing or perf entries). Decomposition therefore not produced; root-cause attribution for LCP rests on F1/F2 structural evidence instead. | **Info** (instrument limitation) | lcp_subparts.py 404 output 2026-10-29; raw/render-home.json content schema inspected 2026-10-29 |

No Critical finding: nothing can be judged broken *in the field* (no field data exists — F5), and CLS passes everywhere measured.

---

## 6. Recommendations (anchored in the repo, ordered by expected impact)

**R1 — Take the mermaid stack off the critical path (targets F1; biggest win by far).**
Make the preview render lazily so `mermaid-core` (687 KiB br), `mermaid-parser` (129 KiB br) and their dependencies leave the static graph:
- `src/components/preview/PreviewPanel.tsx:4` — replace the static `import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core'` with an in-effect dynamic import: `const { renderDiagram } = await import('@/lib/mermaid/core')` inside the existing render effect (the component already renders chrome/controls independently of the SVG).
- Alternatively/easier at the boundary: `React.lazy(() => import('@/preview/PreviewPanel'))` at `src/components/editor/WorkspacePanel.tsx:7` with a `<Suspense>` skeleton echoing the existing `#boot-splash` visual (`index.html`), then trigger the import after first paint via `requestIdleCallback` so it prefetches immediately but never blocks FCP.
- Expected effect: ~73% of eager wire bytes removed from first paint; the preview area shows a skeleton for ~0.1–0.3 s (the app itself reports ~85 ms mermaid render — the placeholder window is imperceptible next to a 9–15 s FCP/LCP gain on throttled profiles).
- Precedent in-repo: `ai-webgpu` (6 MB) already does exactly this via dynamic import and is correctly absent from the served HTML.

**R2 — Lazy-load the CodeEditor the same way (targets F1).**
`src/components/editor/WorkspacePanel.tsx:5` → `React.lazy(() => import('./CodeEditor'))`; preload on idle after mount (`requestIdleCallback(() => import('./CodeEditor'))`) since the editor is primary UX. Removes `codemirror-features` (123 KiB br) + `codemirror-core` (5.7 KiB br) from the blocking path while keeping interaction latency safe.

**R3 — Collapse Google Fonts to exactly one request (targets F2).**
- Delete the `@import` at `src/index.css:1` (keep `font-family` stacks; the head `<link>` at `index.html:102` already covers Inter 300–700 + JetBrains Mono 400/500).
- Gate the 17-font injection (`src/App.tsx:18-28`) behind actual need: inject a family's stylesheet only when the user selects it in the style/settings panels (consumers: `ExportModal.tsx`, `AdvancedStylePanel.tsx`, `ThemeEditorPanel.tsx`). `src/constants/fonts.ts` stays as the data source.
- Expected effect: 19 Google CSS requests → 1 on boot; −2 render-blocking cross-origin roundtrips; −32 KiB wire + no duplicated woff2 subset downloads; direct FCP/LCP benefit on the mobile profile.
- Keep the `crossorigin` attribute on the remaining link (COEP `require-corp` requirement; `index.html:96-102` preconnects already correct).

**R4 — Do not add speculative preloads; re-audit after R1–R3 (targets F4).**
`preload_check` gaps (0 hints) are secondary for a text-LCP SPA. After R1/R3, re-run preload_check and PSI; if the mermaid chunks become interaction-time loads, consider `<link rel="modulepreload">`-on-idle for them (same-origin, CORP-safe) rather than head preloads.

**R5 — Constraints honored (no action).**
- COOP/COEP headers (`vercel.json:11-22`) untouched; all changes are same-origin restructuring. WebGPU/MLC path (`ai-webgpu` dynamic import) unaffected.
- `sourcemap: false` (`vite.config.ts:195`) is intentional — not re-flagged.
- Service worker (`public/sw.js`) already correct for the new shape: network-first documents, cache-first hashed assets; lazy chunks get cached on first fetch automatically.

---

## 7. Falsifiable verification steps

**F1 (High) — eager stack:**
1. Current state (reproduce now): `curl -s https://www.mermaidstudio.net/ | grep -c 'modulepreload'` → **11**; `grep -c 'modulepreload[^>]*mermaid'` → **2** (mermaid-parser + mermaid-core).
2. After R1/R2 land and deploy: the same greps must return **≤9** total modulepreloads and **0** for mermaid/codemirror; the chunk files must still exist in `/assets/` (fetched only on demand).
3. Outcome check: re-run PSI once — `reduce-unused-JavaScript` estimate must drop from ~1,599 KiB to under ~400 KiB, and mobile lab LCP must improve by multiple seconds (F2's removal stacks on top). If unused-JS barely moves, the static import survived somewhere — grep `src/` for remaining static `from '@/lib/mermaid/core'` / `from 'codemirror'` imports reachable from the entry.

**F2 (Medium) — font dedup:**
1. Current state: `curl -s https://www.mermaidstudio.net/assets/index-B_ABXwMQ.css | head -c 200` contains `@import "https://fonts.googleapis.com/...wght@300;400;500;600...` → **true today**.
2. After R3: the same command returns no `fonts.googleapis` in the first bytes (returns Tailwind `@layer properties` instead), served HTML contains exactly **1** `link[href*="fonts.googleapis"]`, and a DevTools/trace network census shows Google Fonts CSS requests on load = **1** (down from 19).

---

## 8. Instrument limitations & gaps (explicit)

1. **No independent lab timing numbers in this report beyond PSI.** The bundled `claude-seo run` allowlist exposes `render_page.py` (rendered DOM/text — the 2026-10-29 08:38 local capture at `raw/render-home.json` proves full client-side mount and the app's self-reported "85ms render"), `preload_check.py`, `lcp_subparts.py`, `capture_screenshot.py`, `parse_html.py` — none emits navigation timing/paint/LCP/longtask data. A custom Playwright probe is outside the allowlisted surface. Per instruction, recorded as a gap rather than improvised: all timing values above are the existing PSI run (2026-10-29T12:41Z), relabeled; all *new* numbers here are structural/curl-derived ground truth, which do not depend on throttling.
2. **CrUX LCP subparts:** 404 (origin ineligible) — not producible for this domain today.
3. **DOM-size/INP check:** no field INP can exist (F5); lab TBT is the proxy. PSI's excessive-DOM audit did not flag the page.
4. Run-to-run variance: throttled mobile LCP at the 15 s scale varies by seconds between runs; the structural findings (F1/F2) are deterministic artifacts of the served build and are the stable basis for remediation.

---

### Freshness
- PSI lab: single run 2026-10-29T12:41Z (from companion report; not re-run).
- curl CDN paired GETs, served HTML/CSS fetches, header checks: 2026-10-29 ~12:47–13:05Z.
- preload_check.py, lcp_subparts.py: 2026-10-29.
- Rendered-DOM capture raw/render-home.json: 2026-10-29 08:38 local (pre-existing artifact, reused).
