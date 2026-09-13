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
