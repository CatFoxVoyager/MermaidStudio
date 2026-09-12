# Roadmap: MermaidStudio — Milestone v1.3 "Migration Mermaid 12"

## Milestones

- ✅ **v1.0 MVP** - Phases 1-13 (archived: `milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Mobile Responsive Design** - Phases 14-18 (shipped 2026-07-02, archived: `milestones/v1.1-ROADMAP.md`)
- ✅ **v1.2 Mobile Completion & 0.6.0 Release prep** - Phases 19-20 (code complete; 0.6.0 bump/tag user-owned post-UAT, archived: `milestones/v1.2-ROADMAP.md`)
- 🚧 **v1.3 Migration Mermaid 12** - Phases 21-24 (current)

## Overview

v1.3 migrates the rendering engine from mermaid ^11.17.2 to exact-pinned **12.0.0** with a **zero user-facing regression** goal. The code delta is small — `src/lib/mermaid/core.ts` is the only mermaid API call site, and one shared post-processing pipeline (`postProcessDiagramSvg`) serves preview, visual editor, fullscreen, and all exports — but mermaid 12 ships two silent default flips (ELK layout for 7 diagram types; `redux-color`/`neo` look for 10 types) that must be pinned in `doInit()`. The structure is therefore verification-weighted: land the upgrade with pinned defaults and captured baselines (Phase 21), prove the SVG pipeline against v12 output via golden fixtures (Phase 22), validate themes/config/layout — which render through that pipeline (Phase 23) — then sweep all diagram types additively and run the milestone's final gates (Phase 24). Phase numbering continues from v1.2 (last phase: 20).

**Recorded deviation from the milestone letter:** `@mermaid-js/layout-elk` is **removed** (UPG-03), not bumped ^0.2.3 → ^1.x — mermaid 12 bundles and auto-registers ELK; keeping ^1.0.0 would ship ELK twice (~+500 kB gz) and 0.2.3 cannot work under v12.

## Phases

- [ ] **Phase 21: Upgrade & Compatibility** - Land pinned mermaid 12.0.0 with v11 defaults preserved, remove layout-elk, update build/CI/embed plumbing, and capture v11 golden fixtures before the flip
- [ ] **Phase 22: SVG Pipeline Verification** - Prove `postProcessDiagramSvg` against v12 output structure via golden-fixture diffs; re-baseline pixel snapshots; verify error-path contracts
- [ ] **Phase 23: Themes, Config & Layout Validation** - Validate theme matrix, theme derivation, frontmatter round-trip, and layout selector on v12
- [ ] **Phase 24: Diagram-Type Sweep & Full Verification** - Additive v12 syntax support (usecase, autocomplete gaps), 20+ type render sweep, full suite/build gates, browser floor, revert path

## Phase Details

### Phase 21: Upgrade & Compatibility

**Goal**: The app boots and builds on pinned mermaid 12.0.0 with v11 rendering behavior preserved (dagre layout, classic look), all upgrade plumbing (dependencies, chunks, CI, CDN embed) updated, and v11 structural golden fixtures captured before the dependency flip lands.
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: UPG-01, UPG-02, UPG-03, UPG-04, UPG-05, UPG-06, PIPE-01
**Success Criteria** (what must be TRUE):

  1. v11 structural golden fixtures (edge paths, `g.edgeLabels` 1:1 correlation, `flowchart-{ID}-{N}` node ids, marker id substrings, `rect.background`, `.root` ordering) are captured and committed while the app still runs mermaid 11.17.2 — before any v12 code lands
  2. The app boots on mermaid 12.0.0 (exact pin, lockfile updated) and every saved diagram renders with its v11 layout (dagre) and v11 look (classic) — nothing is re-laid-out or reskinned by the upgrade
  3. Production build is green with ELK served from mermaid's own lazy chunks: no `@mermaid-js/layout-elk` in package.json, no `registerLayoutLoaders` call in `core.ts`, no dead `mermaid-elk` manualChunk; imports use the package specifier only
  4. CI passes on Node 22.12+ and 24 only (Node 20 dropped per mermaid 12 engines requirement)
  5. The embed snippet copied from ExportModal references `mermaid@12` with a valid SRI hash and executes in a standalone HTML page

**Plans**: 1/3 plans executed

Plans:
**Wave 1**

- [x] 21-01-PLAN.md — v11 golden baseline capture + v12 default pins in doInit() (PIPE-01, UPG-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 21-02-PLAN.md — atomic mermaid 12.0.0 flip: exact pin, layout-elk removal, chunk rework (UPG-01, UPG-03, UPG-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 21-03-PLAN.md — CI Node matrix, CDN embed + SRI, full phase gates (UPG-05, UPG-06)

> **Ordering constraint (PIPE-01):** the golden-fixture capture MUST be the first plan of this phase, executed before the mermaid 12 dependency flip. The default-flip pins (`layout: 'dagre'`, `look: 'classic'`) are harmless under v11, so the upgrade stays revert-safe at every commit.

### Phase 22: SVG Pipeline Verification

**Goal**: The shared SVG post-processing pipeline (preview, visual editor, fullscreen, PNG/JPEG/SVG exports) is proven — or consciously fixed — against mermaid 12's output structure, with error-path contracts verified.
**Depends on**: Phase 21 (consumes the v11 golden fixtures captured there; all consumers now run on v12)
**Requirements**: PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):

  1. The `postProcessDiagramSvg` suite — static selector tests plus rendered preview/export parity — is green on v12, and any structural selector matching 0 elements fails the suite instead of passing silently (diffed against Phase 21's v11 fixtures)
  2. Pixel-sensitive snapshots are re-baselined and pass, with mermaid 12's documented 1px `intersectPolygon` shift as the only intended diff
  3. A syntax error in a diagram with frontmatter reports the source line the user actually wrote — the manual frontmatter offset is adjusted or removed if double-counting is confirmed on v12
  4. Rendered and exported SVGs contain no leftover temporary mermaid DOM elements on v12 — cleanup verified and the manual `remove()` dropped or confirmed harmless

**Plans**: TBD

### Phase 23: Themes, Config & Layout Validation

**Goal**: Theme rendering, frontmatter configuration, and layout-engine selection behave identically to v11 under mermaid 12.
**Depends on**: Phase 22 (theme checks render through the verified pipeline)
**Requirements**: THM-01, THM-02, THM-03, THM-04
**Success Criteria** (what must be TRUE):

  1. The theme x diagram-type x dark/light snapshot matrix passes on v12 with no unexpected diffs
  2. Custom palettes derived by `themeDerivation.ts` produce the same colors as v11 after re-derivation against v12's `theme-base.js` (variable names survive; formulas verified empirically)
  3. Frontmatter round-trip behaves as on v11: `@theme` extraction works, config precedence holds (frontmatter > `initialize()` > per-type default > global default), and `@{...}` syntax parses
  4. The layout selector switches dagre / elk / elk.stress under mermaid 12's bundled ELK; `elk.stress` resolves or degrades safely (fallback + warning) — never crashes the app

**Plans**: TBD

### Phase 24: Diagram-Type Sweep & Full Verification

**Goal**: Every supported diagram type renders correctly on v12, additive v12 syntax is adopted (usecase diagram, autocomplete gaps, visual-editor fail-safe), and the milestone's final verification gates pass with a documented revert path.
**Depends on**: Phase 23
**Requirements**: DIA-01, DIA-02, DIA-03, DIA-04, VAL-01, VAL-02, VAL-03
**Success Criteria** (what must be TRUE):

  1. A visual spot-check sweep confirms all 20+ supported diagram types render correctly on v12 in dark and light themes
  2. A diagram using v12 `@{...}` syntax opens read-only in the visual editor and is never corrupted by the regex-based parser
  3. `usecaseDiagram` is detected by `detectDiagramType`, autocompleted, available as a template, and themeable; autocomplete additionally covers railroad, cynefin, swimlane, the new shapes, and `@{ view: collapsed }`
  4. Full unit suite (`vitest run`), lint, type-check, and production build are green on mermaid 12; the browser floor is verified (`build.target` ES2024+, webkit E2E at ~Safari 17.4+) with iOS <= 17.3 behavior documented
  5. The revert path (mermaid 11.17.2 + layout-elk 0.2.3 known-good pair) is documented, and 12.0.x point releases are tracked during the milestone for a fast-follow

**Plans**: TBD

## Requirements Coverage

| Phase | Requirements | Count |
|-------|--------------|-------|
| 21. Upgrade & Compatibility | UPG-01, UPG-02, UPG-03, UPG-04, UPG-05, UPG-06, PIPE-01 | 7 |
| 22. SVG Pipeline Verification | PIPE-02, PIPE-03, PIPE-04 | 3 |
| 23. Themes, Config & Layout Validation | THM-01, THM-02, THM-03, THM-04 | 4 |
| 24. Diagram-Type Sweep & Full Verification | DIA-01, DIA-02, DIA-03, DIA-04, VAL-01, VAL-02, VAL-03 | 7 |

**Coverage:** 21/21 v1.3 requirements mapped (100%) — no orphans, no duplicates. Each requirement maps to exactly one phase.

**Ordering rationale:** pins must land before any render can be trusted (21) → pipeline verification before theme validation because themes render through the pipeline (22 → 23) → additive sweep and final gates last (24). Error-path (PIPE-04) and theme checks (23) are gated behind pipeline verification; the additive DIA sweep goes last per its independence.

## Progress

**Execution Order:** 21 → 22 → 23 → 24 (decimal insertions, if any, execute between their surrounding integers)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Upgrade & Compatibility | v1.3 | 1/3 | In Progress|  |
| 22. SVG Pipeline Verification | v1.3 | — | Not started | - |
| 23. Themes, Config & Layout Validation | v1.3 | — | Not started | - |
| 24. Diagram-Type Sweep & Full Verification | v1.3 | — | Not started | - |

---
*Roadmap created: 2026-09-12 — milestone v1.3 "Migration Mermaid 12" (phases continue from v1.2's Phase 20)*
