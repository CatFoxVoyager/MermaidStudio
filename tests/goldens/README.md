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
