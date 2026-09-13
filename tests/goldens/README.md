# Golden Fixture Capture Provenance (PIPE-01)

Provenance for `src/lib/mermaid/__tests__/structure-goldens.test.ts` — the
structural contract suite that gates the mermaid 11 → 12 migration.

## Capture details

| Property | Value |
|---|---|
| Capture date | **2026-09-12** |
| Installed mermaid at capture | **11.17.2** |
| Phase / requirement | Phase 21 (Upgrade & Compatibility), PIPE-01 |
| Capture timing | BEFORE the mermaid 12 dependency flip (Plan 21-02) — this is the v11 baseline |
| Suite | `src/lib/mermaid/__tests__/structure-goldens.test.ts` |
| Renderer | `renderDiagram()` (`src/lib/mermaid/core.ts`) — real mermaid in jsdom via the `getBBox` polyfill in `tests/vitest.setup.ts`; assertions run on the RAW post-sanitize output, PRE-`postProcessDiagramSvg` |

**Capture command:**

```bash
pnpm exec vitest run src/lib/mermaid/__tests__/structure-goldens.test.ts
```

**Installed-version check (run before every capture/re-run):**

```bash
node -p "require('./node_modules/mermaid/package.json').version"
```

## Rules

1. **0-match equals failure.** Every recorded count below is exact. After any
   dependency change, a selector dropping to 0 matches fails the suite by
   construction — that is the early-warning signal the goldens exist to provide.
2. **Never weaken a recorded assertion to make a future mermaid version pass.**
   The recorded assertions encode the v11 contract. If mermaid 12 legitimately
   drifts from it, the fix is a **pipeline selector update** — Phase 22 owns
   `src/utils/svgPostProcessing.ts` selector fixes — never an edited baseline.
   A 0-match is a finding to surface, not a number to edit.

## Observed-selector table (mermaid 11.17.2, captured 2026-09-12)

| Selector | Fixture | Observed value under v11 |
|---|---|---|
| `.edgePaths path.flowchart-link` | flowchart | **3** (exact; the fixture declares 3 edges) |
| `.edgePaths path` | flowchart | **3** |
| `g.edgeLabels` | flowchart | present; **3 direct children**, all `g.edgeLabel` (1:1 with edge paths) |
| `.edgeLabel` internals | flowchart | `g.label > foreignObject > div.labelBkg > span.edgeLabel > p` — **no rect emitted** (`htmlLabels: true` in `doInit()`) |
| `.node` ids | flowchart | **3** nodes; ids `golden_flow-flowchart-A-0`, `golden_flow-flowchart-B-1`, `golden_flow-flowchart-C-3` — all match `/flowchart-[A-Za-z0-9_-]+-\d+$/` (pipeline regex at `svgPostProcessing.ts:526`) |
| `marker` ids | flowchart | `{safeId}_flowchart-v2-{pointStart\|pointEnd\|circleStart\|circleEnd\|crossStart\|crossEnd}` plus `-margin` variants; styled edges additionally get a per-stroke clone `{safeId}_flowchart-v2-pointEnd__333333` (mermaid appends `__{hex-without-#}` per edge stroke color) |
| `.edgePaths path[@marker-end]` | flowchart | all 3 → `url(#…flowchart-v2-pointEnd__333333)`; every reference resolves to an existing `marker` id; observed id-family substring: **`pointEnd`** |
| `.root` children | flowchart | observed order: `g.clusters`, `g.edgePaths`, `g.edgeLabels`, `g.nodes` — order recorded but **NOT asserted** (the pipeline reorder at `svgPostProcessing.ts:411-420` exists to change it); asserted: classes cover `nodes`, `edgePaths` (or `edges`), `edgeLabels` |
| `.messageLine0` | sequence | **1** (the solid message, `A->>B`) |
| `.messageLine1` | sequence | **1** (the dashed message, `B-->>A`) |
| `.messageLine0/1[@marker-end]` | sequence | both → `url(#golden_seq-arrowhead)`; every reference resolves to an existing `marker` id; observed id-family substring: **`arrowhead`** |
| `marker` ids | sequence | `{safeId}-arrowhead`, `-crosshead`, `-filled-head`, `-sequencenumber`, `-solidTopArrowHead`, `-solidBottomArrowHead`, `-stickTopArrowHead`, `-stickBottomArrowHead` |
| `.messageText` | sequence | **2** (one per message) |

## rect.background finding (flagged for Phase 22)

**`rect.background` is NOT emitted under mermaid 11.17.2** — observed count **0**
in both fixture families:

- **flowchart** (with `linkStyle default … fill:#ffffff,fill-opacity:1`, i.e. the
  styled-edge-label case): 0. With the app's `flowchart.htmlLabels: true` config
  (`doInit()` in `core.ts`), edge labels are `foreignObject`-based and mermaid
  emits **no label rects at all** (any `rect` under `g.edgeLabels`: 0).
- **sequence**: 0. Message lines carry no label rects.

An `htmlLabels: false` flowchart variant — the mermaid mode that does emit
label background rects — **cannot render in jsdom** (`getComputedTextLength` is
not implemented by the DOM shim), so the family could not be captured with a
real observed value on either route.

Consequences, recorded so Phase 22 does not have to re-derive them:

1. The pipeline's edge-label rect fallback chain
   (`svgPostProcessing.ts:715-726`: `rect.background` → `g.label rect.background`
   → `g rect` → `rect`, then next-sibling hunt) resolves **null** for every
   edge label on real v11 renders — label background styling is a **no-op**
   under v11.17.2 in this app configuration.
2. The golden suite **deliberately does not assert a `rect.background` count of
   0.** If a future mermaid version starts emitting the rects, that is benign
   for the pipeline (its first-choice selector starts matching) and must not
   false-fail the regression gate. An assertion whose only expected value was
   "absent" would punish exactly the change that heals the no-op.

## Re-run protocol (after the v12 flip, Plans 21-02 / 21-03)

```bash
node -p "require('./node_modules/mermaid/package.json').version"   # expect 12.0.0
pnpm exec vitest run src/lib/mermaid/__tests__/structure-goldens.test.ts
```

Green → the v11 structural contract survived the flip. Red → a recorded
selector no longer matches: **surface the finding** (this file, plus the phase
summary), then let Phase 22 decide the pipeline selector fix. Do not edit the
baseline to get green.

## v12 re-run outcome (Phase 22, PIPE-02)

Recorded 2026-09-13 by Plan 22-02. The rules section above stays authoritative:
never weaken a recorded assertion; a red selector is a finding, and the
fixes-if-red ownership for **pipeline selectors** remains Phase 22 (this phase).

### Capture details

| Property | Value |
|---|---|
| Re-run date | **2026-09-13** |
| Installed mermaid at re-run | **12.0.0** (exact pin from Phase 21) |
| Phase / requirement | Phase 22 (SVG Pipeline Verification), Plan 22-02, PIPE-02 |
| Suite | `src/lib/mermaid/__tests__/structure-goldens.test.ts` — all recorded v11 assertions re-run UNCHANGED, plus a new PIPE-02/D3 order-lock describe block |

**Re-run command** (from `D:/code/mermaidstudio`):

```bash
pnpm exec vitest run src/lib/mermaid/__tests__/structure-goldens.test.ts
```

**Version check** (run before every capture/re-run):

```bash
node -p "require('./node_modules/mermaid/package.json').version"
# → 12.0.0
```

**Result: green (10/10 on 2026-09-13).** Every recorded v11 assertion holds on
mermaid 12.0.0 with ZERO recorded-assertion edits. One structural delta was
observed (cosmetic — documented below, deliberately not asserted).

### Observed-selector v12 table (mermaid 12.0.0, re-run 2026-09-13)

One row per selector family from the v11 table above; the v11 record remains
the baseline reference. Values marked "suite" are asserted by the green run
itself; values marked "spike" come from the Phase 22 research spike against the
same installed 12.0.0 (`22-RESEARCH.md`, Empirical Findings §1).

| Selector family | v12 observed value | Verdict vs v11 |
|---|---|---|
| `.edgePaths path.flowchart-link` / `.edgePaths path` | **3** (suite) — the fixture declares 3 edges | identical |
| `g.edgeLabels` | present; **3 direct children**, all `g.edgeLabel`, 1:1 with edge paths (suite) | identical |
| `.edgeLabel` internals | `g.label > foreignObject > div.labelBkg > span.edgeLabel > p`; **no `text` element, no rects** (spike; consistent with the suite's 1:1 and no-rect observations) | identical |
| `.node` ids | 3 nodes (suite); ids `…-flowchart-A-0`, `-B-1`, `-C-3` under the render's safeId prefix — same **counter skip** (0/1/3) as v11 (spike); all match the pipeline regex `/flowchart-[A-Za-z0-9_-]+-\d+$/` | identical |
| `marker` ids / `.edgePaths path[@marker-end]` | all 3 resolve; observed family **`pointEnd`** with per-stroke clone `…pointEnd__333333` (suite asserts resolution + family) | identical |
| `.root` children | natural order **`clusters, edgePaths, edgeLabels, nodes`** — identical to the v11 recorded order. **Now ASSERTED** (this is the v11-table update): the PIPE-02/D3 order-lock describe added 2026-09-13 asserts the natural order pre-pipeline AND the pipeline-enforced order post-pipeline (`clusters, nodes, edgePaths, edgeLabels` — labels painted last), proving the reorder still does real work on v12. The v11 row's "recorded but NOT asserted" wording described capture-time state only | identical, now locked |
| `.messageLine0` / `.messageLine1` | **1** each (suite) | identical |
| `.messageLine0/1[@marker-end]` | both resolve; family **`arrowhead`** (suite) | identical |
| `marker` ids (sequence) | `…-arrowhead` family with the v11 auxiliaries (suite asserts resolution + family) | identical |
| `.messageText` | **2** (suite) | identical |
| `rect.background` | **0** — see the finding update below | identical (still not emitted) |

### Structural delta: doubled edge-path class prefix (cosmetic — NOT asserted)

v12 edge paths carry the thickness/pattern class prefix **doubled**:

```
class="edge-thickness-normal edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link …"
```

Every pipeline selector (`path.flowchart-link`, `.edgePaths path`) still
matches. The prefix is deliberately **NOT asserted in any suite**: asserting
cosmetics manufactures false failures the moment upstream removes the
duplication. Recorded here as observed-and-not-asserted (also noted in-source
in the order-lock describe).

### rect.background finding update (v12)

Still **0** under mermaid 12.0.0 with the app's `flowchart.htmlLabels: true`
config: the html-labels branch of mermaid's text builder emits no label rects
(v12 dist-source verification in `22-RESEARCH.md`), so the pipeline's
edge-label rect fallback chain (`svgPostProcessing.ts:715-728`) remains a
**no-op**, and the v11 rationale carries over unchanged — the family stays
deliberately NOT asserted as a 0 count, because a future emission is benign
(the first-choice selector starts matching) and must not false-fail the gate.

### D1/D3 verdict

**Zero pipeline selectors broken on v12; zero dead pipeline code found.**
`src/utils/svgPostProcessing.ts` required **no changes** in this phase: the
`.root` reorder still does real work (v12's natural order differs from the
enforced order — both now locked by tests), and every selector the pipeline
depends on matches v12 output. Functional equivalence (D4) is locked by the
rendered preview/export parity test and the order locks
(`src/utils/__tests__/postProcessDiagramSvg.test.ts`).

### Pixel diagnostics (PIPE-03) — v12 diagnostic re-run and diff classification (Phase 22, Plan 22-03)

Recorded 2026-09-13 by Plan 22-03. Scope per D5: every existing pixel-sensitive
artifact = the ~24 gitignored local diagnostic specs under
`tests/e2e/tests/visual/` (uncommitted scratch, chromium-only). There are NO
committed pixel baselines and NO v11-era captures on this host (research A5
confirmed) — "re-baseline" therefore means: re-run, capture fresh, classify
every observed difference against the mermaid 12.0.0 changelog, record.

#### Run details

| Property | Value |
|---|---|
| Re-run date | **2026-09-13** |
| Installed mermaid at re-run | **12.0.0** (exact pin from Phase 21) |
| Phase / requirement | Phase 22 (SVG Pipeline Verification), Plan 22-03, PIPE-03 |
| Runner | Playwright 1.63.0, `--project=chromium` (the visual specs are chromium diagnostics; firefox/webkit sweeps belong to CI and Phase 24) |
| Server | Vite dev server on `http://localhost:5173` (launched via `node scripts/dev-e2e.mjs`, playwright `reuseExistingServer`) |
| Result | **25 passed / 1 failed (26 tests in 24 files), ~49s** — the failure is classified below as environment drift, not a pipeline regression |

Environment notes for future re-derivation:

- **Fresh captures land in the repository ROOT** (playwright resolves each
  spec's relative `page.screenshot({ path })` against the process cwd), not in
  `tests/e2e/tests/visual/`. Both locations are gitignored (`.gitignore`
  `*.png` root rule + `tests/e2e/tests/visual/`), so nothing is committable by
  accident. 26 fresh PNGs were captured 2026-09-13 ~09:23.
- **The first-run welcome modal** (v0.6.0 release-notes dialog, app feature
  added after these specs were written) is open in every fresh-context capture
  and occludes the app with a dimmed backdrop. DOM-level probes (the specs'
  locator/computed-style evidence, quoted below) are unaffected; full-page
  pixel review of the captures is limited by the overlay, and the modal
  directly caused the single failure (coordinate click intercepted).

#### Scope classification (resolves the D5 open question)

**21 of 24 files are pipeline-relevant** (subject is SVG post-processing
output: edge/fill/label/reorder/multiline/fontsize/structure/verification
specs). **3 files are out-of-scope helpers**, documented with rationale:

| Helper spec | Why out of scope | Run outcome |
|---|---|---|
| `find-svg.spec.ts` | SVG discovery utility (locates the rendered diagram node for other specs); probes app chrome, not SVG output | pass |
| `ui-panel-background-test.spec.ts` | UI panel interaction (style panel flow); app chrome, not mermaid SVG output (its internal flow observed rotted: EdgeStylePanel not found — pre-existing scratch rot, unrelated to the migration) | pass |
| `check-shadow-css.spec.ts` | Shadow-DOM CSS layer inspection (app CSS, not mermaid output); confirmed the app's edge-label CSS rules (`g.edgeLabel rect { fill-opacity: 1 !important … }`) are present and unchanged | pass |

#### Classification table (21 pipeline-relevant specs, chromium, mermaid 12.0.0)

Verdict vocabulary per D6: **none** = no difference beyond the documented
deltas; **documented** = matches a changelog-cited v12 delta (PR cited);
**investigated** = observed, root-caused, cited; **UNEXPLAINED** = would be
flagged for the D7 promotion decision (count this run: **0**).

| Spec | Subject | Diff observed | Classification |
|---|---|---|---|
| edge-fill-debug | where fill lands when edgeLabelBackground is set | 0 rects in edgeLabels; both edge paths `fill="none"` attr + computed, stroke rgb(11,11,11) | none — matches documented no-rect state (htmlLabels:true) + pipeline FINAL CLEANUP |
| edge-background-debug | what edge label processing affects | same family: no label rects, labelBkg via CSS only | none |
| edge-label-background-test | edge label background color + opacity | `Found 0 rects in edgeLabels` | none — documented not-emitted family (see rect.background finding above) |
| computed-fill-test | computed fill of edge label backgrounds | labelBkg computed `rgba(245, 247, 250, 0.5)`, opacity 1, opaque via CSS | none |
| verify-css-opacity | edge label background opacity | opacity 1 observed | none |
| default-edge-label-state | default state (no linkStyle) | default `#F5F7FA` edgeLabel CSS; no rects | none |
| edge-color-mapping-debug | linkStyle 1 targets the correct edge | **Path 1 `stroke attr: #ff0000`** (correct edge B→C); labels 16px where the spec's console note "expected" 20px | stroke mapping **correct on v12** (the spec's named April bug is absent). The 16px label: investigated — the style value is **not** lost at parse time: `parseEdgeStyleValue` accepts camelCase (`codeUtils.ts:313`; source comment: "Support both camelCase and kebab-case property names"). It is dropped at **application** time: the edge-label font application (`svgPostProcessing.ts:731-740`) queries `text` elements only, and under `htmlLabels: true` (`core.ts:42`) edge labels are foreignObject-based with no `text` element, so linkStyle font-size/font-weight are silently skipped (recorded as the known-limitation entry below). Version-independent (identical under v11 — the text-only block predates the migration, added bb1ef46 v0.4) — **pre-existing app behavior, NOT a v12 delta** |
| debug-fontsize | linkStyle 0 fontSize:30px reaches label? | `font-size="30px": false`; label computed 16px | investigated — same root cause as the row above: text-element-only edge-label font application silently skipped under htmlLabels:true (value not lost at parse; see the known-limitation entry below). Pre-existing, version-independent, not v12 |
| edge-label-centering (2 tests) | vertical centering + SVG structure | centers present; edge paths `fill: "none"` (the spec's own ❌ marker is stale scratch noise — fill:none is the pipeline's CORRECT state) | none |
| edge-label-real-svg (2 tests) | centering in real SVG + full dump | group/content dimensions match; labelBkg inline structure normal | none |
| ambiguous-labels-test | same-label edges + linkStyle targeting | 3 edges same label "connect"; node coords sane; linkStyle 1 → B→C | none |
| edge-reordering-debug | edge order vs display order | sane post-pipeline (order locks green in the structural suite) | none |
| edge-path-inspection | full raw SVG structure dump | raw v12 dump shows: doubled `edge-thickness-normal edge-pattern-solid` class prefix; FINAL CLEANUP `fill="none" fill-opacity="0"` + `;fill: none !important; fill-opacity: 0 !important;`; `pointEnd` marker family; `aria-roledescription="flowchart-v2"`; node ids `…-flowchart-A-0/-B-1/-C-3` (counter skip 0/1/3) | documented — doubled prefix = the cosmetic delta recorded in the v12 table above; everything else identical to the structural record |
| debug-svg-structure | full structure dump | `g.label > foreignObject > div.labelBkg > span.edgeLabel > p` chain | none |
| complete-verification | centering + background + path visibility sweep | all three probes OK | none |
| final-verification | opaque background does NOT affect edge path | background opaque; path fill none | none |
| verify-fill-not-on-path | fill NOT on path when label bg set | paths fill:none | none |
| fontsize-centering | single/multi-line label centering | center offset 0.00px; group heights 24/48/72 px exact per line count; styled edge stroke #ff0000 correct | none |
| multiline-label-bug | multiline edge label rendering | content `<p>Line 1<br>Line 2</p>`, `Has line breaks: true`, 2-line height exact | documented — line-break handling correct on v12 (#8048 family; no anomaly) |
| multiline-br-test | explicit line breaks | `<p>First line<br>Second line<br>Third line</p>`, 3-line height exact, fits group | documented — same as above, breaks functional (#8048 family) |
| test-edge-label-fill-fix | label bg must NOT affect edge path | **FAILED**: editor `click()` intercepted by the first-run welcome modal (`div[role="dialog"]`), 60s retry storm, timeout | investigated — **environment drift, not a pipeline regression**: the modal is an app feature added after these April-era scratch specs were written (fresh context per test ⇒ modal every run). Cross-checked against the green structural goldens (Plan 22-02) and sibling coverage: the spec's subject (fill isolation) is proven passing by edge-fill-debug, computed-fill-test and verify-fill-not-on-path in this same run. Scratch specs are deliberately unedited (plan prohibition) |

#### Changelog-delta coverage (Pitfall 4 decision table applied)

| Upstream delta | Trigger surface in the suite | Outcome |
|---|---|---|
| **#8152** — intersectPolygon fix, ≤1px movement wherever a polygon shape terminates an edge (dagre included) | every spec (rect nodes terminate edges) | **documented, present-by-changelog**: the intended D5 diff. Not differentially observable (no v11 captures on this host) and below attribute-probe resolution; geometry probes sane (edges attach exactly at node boundaries, e.g. path start y=72 against a node spanning y=8..72) |
| **#8227 / #8232** — label-wrap exemptions for circle / double-circle / Display / Delay shapes | **none** — no such shape in any spec | not applicable (nothing to observe) |
| **#8048** — `</br>` line-break handling | multiline-label-bug, multiline-br-test | **documented, healthy**: breaks render as breaks with exact per-line heights — no anomaly to classify |
| doubled edge-path class prefix (v12 renderer unification, recorded in the v12 table above) | visible in every raw dump | documented (cosmetic, observed-and-not-asserted) |

#### D6 policy statement as applied

**Epsilon 0 outside the changelog-cited deltas — held.** Nothing was absorbed
into a tolerance, retry, or skip-listing; no assertion was promoted or
weakened. Counts over the 21 pipeline-relevant specs: **18 none-observed, 2
investigated** (both root-caused to pre-existing, version-independent app
behavior — the text-element-only edge-label font application
(`svgPostProcessing.ts:731-740`) silently skipped under `htmlLabels: true`
(`core.ts:42`); the parser itself accepts camelCase — `codeUtils.ts:313` —
not v12 deltas), **1 environment-drift failure** (welcome modal; cross-checked
against the green structural goldens and sibling specs, not a pipeline
regression), **0 UNEXPLAINED**, **0 unclassified**.

#### D7 status

`tests/e2e/tests/visual/` and the root-level capture PNGs remain **local-only
gitignored diagnostics**: nothing committed, nothing promoted to
`toHaveScreenshot` assertions, no spec edited. **No promotion trigger fired**
(zero unexplained diffs). Caveat recorded for any future pixel review: fresh
captures include the first-run welcome modal overlay (see environment notes);
dismissing it (or persisting its localStorage flag) before a capture run would
give unoccluded images.

Re-derivation for a future session: start the dev server (`node
scripts/dev-e2e.mjs`), run `npx playwright test tests/e2e/tests/visual
--project=chromium --reporter=list`, fresh PNGs appear in the repository root
(gitignored), and the console evidence quoted above reproduces. If the dev
server comes up HTTPS (`.cert/cert.pem` present), playwright's
`http://localhost:5173` URL check cannot detect or reach it — serve HTTP for
the diagnostic runs.

### Idempotency probe outcome (PIPE-04 carry-over, answered by Plan 22-02)

The double-application probe was answered empirically on 2026-09-13 (temporary
probe, deleted after the observation run): `postProcessDiagramSvg` is
**deterministic but NOT byte-idempotent** under re-application — each pass over
already-processed output appends exactly one whitespace character to each
styled edge path's `style` attribute (observed +3 bytes per run on the 3-edge
fixture; unbounded across runs; root cause: the FINAL CLEANUP strip+append at
`svgPostProcessing.ts:863-883` is not separator-safe, combined with CSSOM
re-serialization per pass). The delta is **whitespace-only** — no attribute
value, structure, count, or marker ever changes — and it is **unreachable at
runtime**: all five pipeline surfaces feed it raw mermaid output exactly once
per render. Locked as whitespace-insensitive equality
(`test_v12_idempotent` in the pipeline suite); making the cleanup
separator-safe is a conscious pipeline change, deliberately out of Plan
22-02's proof-and-lock footprint and surfaced here for phase ownership.

### Known limitation: linkStyle font-size/font-weight silently ignored on edge labels (htmlLabels:true)

Recorded 2026-09-13 by Plan 22-04 (gap closure). Observed on mermaid 12.0.0 on
2026-09-13 (the PIPE-03 diagnostic run above) and identical under the mermaid
11.17.2 v11 baseline — path/line provenance below, per this file's convention.

- **Mechanism.** The pipeline's edge-label font application runs only against
  `text` elements (`svgPostProcessing.ts:731-740`:
  `label.querySelector('text')`). With the app's `flowchart.htmlLabels: true`
  config (`core.ts:42`, `doInit()`), edge labels are foreignObject-based
  (`g.label > foreignObject > …` — no `text` element, per the v11/v12
  selector tables above), so the block never matches and linkStyle
  `font-size`/`font-weight` have **no visible effect** — silently skipped,
  no warning. Observed in this run: the two font-size specs' 20px/30px
  linkStyle intents never landed; labels computed at the 16px default
  (rows edge-color-mapping-debug and debug-fontsize in the classification
  table above). The style value itself survives parsing —
  `parseEdgeStyleValue` accepts camelCase (`codeUtils.ts:313`) — the drop is
  at application time only.
- **Provenance.** Predates the migration: the text-only application block was
  added in bb1ef46 (v0.4) and `src/utils/svgPostProcessing.ts` was untouched
  in phases 21-22. **Version-independent, identical under v11 and v12; NOT a
  v12 delta.**
- **Disposition.** Consciously **ACCEPTED for v1.3**: fixing it would make
  linkStyle fonts START applying to edge labels — a deliberate rendering
  change vs the v11 baseline that contradicts the milestone's
  zero-regression goal. The fix (foreignObject-aware application) is a
  pipeline-enhancement candidate surfaced for UAT ratification alongside the
  idempotency deferral (22-VERIFICATION human item 2). If the user overturns,
  it becomes a tracked post-milestone item.
