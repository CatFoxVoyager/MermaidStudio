---
phase: 26-double-circle-shape-legacy-syntax
plan: 01
subsystem: mermaid-visual-editor
tags: [mermaid, parser, shapes, legacy-syntax, react, i18n, vitest, tdd]

requires:
  - phase: 24-diagram-type-render-sweep
    provides: renderDiagram pipeline + jsdom probe pattern (getComputedTextLength polyfill, renderCell) reused by the dbl-circ render canary
  - phase: 23-theme-matrix
    provides: temp-element cleanup convention and vitest harness conventions copied by the canary test
provides:
  - parseDiagram reads legacy triple-paren double-circle nodes, quoted and unquoted, with clean labels (entries ordered quoted-first before the greedy circle entry)
  - shapeWrap emits the legacy wrap for dbl-circ via the quote-aware label variable (no v11 at-brace emission — D6 gate can no longer be self-tripped by toolbar-created dbl-circ nodes)
  - render canary pinning non-empty two-circle render through the app pipeline for both input forms
  - ShapeToolbar 14th shape entry with a two-concentric-circle preview, en/fr labels, PropertiesPanel select option
  - ShapeToolbar.test.tsx component suite (first dedicated toolbar test in the repo)
affects: [phase 27 at-brace parsing, visual editor shape styling, shape-toolbar consumers]

tech-stack:
  added: []
  patterns:
    - "SHAPE_PATTERNS ordering rule: quoted variant of a greedy prefix precedes the greedy entry, and both precede it (the file's trailing quoted-variants tail is dead code — do not replicate)"
    - "jsdom toolbar-test recipe: mount fit yields a 2-shape primary row + More popover; open the popover for accessible copies, title-attribute queries reach the aria-hidden measurer copies"

key-files:
  created:
    - src/lib/mermaid/__tests__/dbl-circ-render.test.ts
    - src/components/visual/__tests__/ShapeToolbar.test.tsx
  modified:
    - src/lib/mermaid/codeUtils.ts
    - src/lib/mermaid/__tests__/codeUtils.test.ts
    - src/components/visual/ShapeToolbar.tsx
    - src/components/visual/PropertiesPanel.tsx
    - src/i18n/locales/en.json
    - src/i18n/locales/fr.json

key-decisions:
  - "Legacy writer over directive writer (plan-locked): any at-brace emission would flip the visual editor read-only via the D6 presence gate on the next autosave; prohibition gate on the emission template measures 0 post-change"
  - "V11_SHAPES and the other ten v11 shapeWrap cases untouched: unit-level edge-line recognition of the directive form is preserved, and the D6 gate semantics are deliberately unchanged this phase"
  - "Toolbar test asserts real jsdom semantics (popover-open + title-attribute queries) instead of the plan's falsified instrument assumptions — same behavioral intent, working instruments"

patterns-established:
  - "Quoted-before-greedy ordering for delimiter pattern tables, with a comment explaining why the entries sit above the circle entry"
  - "Render canary pattern for syntax variants that are not diagram types (own file, sweep probe pattern, never SWEEP_FIXTURES)"

requirements-completed: []

coverage:
  - id: D1
    description: "Parser recognizes legacy triple-paren double-circle nodes (unquoted + quoted forms) into dbl-circ shape with clean labels; double-paren input still parses circle"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should parse unquoted triple-paren nodes as double-circle"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should parse quoted triple-paren nodes as double-circle with clean labels"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should keep double-paren nodes as circle (greedy non-interference)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Writer emits legacy syntax on all three paths (toolbar add, shape change, rename round-trip) — no at-brace emission for dbl-circ anywhere in the writer"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should add a double-circle node with legacy triple-paren wrap"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should write legacy triple-paren syntax when changing shape to double-circle"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should preserve the double-circle triple-paren wrap on rename"
        status: pass
      - kind: other
        ref: "command: grep -cF 'shape: \"dbl-circ\"' src/lib/mermaid/codeUtils.ts == 0 (prohibition gate, pre-change measured 1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Legacy syntax renders non-empty through the app's real renderDiagram pipeline with double-circle geometry (>=2 circle elements), quoted and unquoted"
    verification:
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/dbl-circ-render.test.ts#renders an unquoted triple-paren node non-empty with at least two circles"
        status: pass
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/dbl-circ-render.test.ts#renders a quoted triple-paren node non-empty with at least two circles"
        status: pass
    human_judgment: false
  - id: D4
    description: "ShapeToolbar exposes the double-circle shape with a distinct two-circle preview and the localized add-hint accessible name; PropertiesPanel select lists it"
    verification:
      - kind: unit
        ref: "tests/src/components/visual/__tests__/ShapeToolbar.test.tsx#renders a double-circle button whose accessible name resolves the localized add hint"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/ShapeToolbar.test.tsx#draws the double-circle preview with exactly two circles on every copy's SVG"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/ShapeToolbar.test.tsx#keeps the circle preview at exactly one circle (no cross-contamination)"
        status: pass
      - kind: other
        ref: "command: grep gates — labelKey visual.shapes.dblCirc + preview case in ShapeToolbar.tsx, value option in PropertiesPanel.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "en/fr locale files carry visual.shapes.dblCirc inside the nested visual.shapes block only (Double Circle / Double cercle), JSON valid"
    verification:
      - kind: other
        ref: "command: sed -n '55,90p' src/i18n/locales/{en,fr}.json | grep dblCirc (nested-block window; flat shapes block untouched) + node JSON.parse on both files"
        status: pass
    human_judgment: false
  - id: D6
    description: "Full unit suite green — no regressions in the 22-type sweep, D6 readonly suite, or VisualEditorCanvas suite"
    verification:
      - kind: unit
        ref: "command: npx vitest run — 90 files, 1559 tests passed, exit 0 (baseline 1548 + 11 new)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Optional dev-server glance at the two-circle preview aesthetics (declared nice-to-have, not a gate, by 26-VALIDATION.md)"
    verification: []
    human_judgment: true
    rationale: "Purely visual judgment the plan explicitly classifies as optional and non-gating; all automated criteria are covered by D1-D6."

# Metrics
duration: 18min
completed: 2026-10-07
status: complete
actuals:
  tokens: 3400        # chars/4 over the realized diff (8 files, +243/-3)
  tasks: 2
  commits: 4          # measured: git rev-list --count 599fbd4..fea7211
plan_head_before: 599fbd43151d0d4df432066c7a379f03c728a29f
plan_head_after: fea7211  # HEAD at SUMMARY write; the docs commit below adds one more
---

# Phase 26 Plan 01: Double-circle shape (legacy syntax) Summary

**Double-circle terminal shape end-to-end on legacy `((( )))` syntax: parser reads quoted/unquoted forms, writer emits the legacy wrap (at-brace emission eliminated, prohibition gate 0), toolbar + panel + en/fr labels shipped, 11 new tests, full suite 1559 green.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-10-07T16:59:17Z
- **Completed:** 2026-10-07T17:18:06Z
- **Tasks:** 2
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- `parseDiagram` recognizes `id(((label)))` — quoted and unquoted — into `dbl-circ` nodes with clean labels; the two SHAPE_PATTERNS entries sit quoted-first immediately above the greedy circle entry, so `A((x))` still parses `circle`
- The writer emits the legacy triple-paren wrap on all three mutation paths (addNode, updateNodeShape, updateNodeLabel) via the quote-aware label variable — the v11 at-brace emission template is gone from the writer (prohibition gate measures 0; pre-change 1)
- Render canary proves both input forms render error-free through the app's real `renderDiagram` pipeline with >=2 circle elements (mermaid 12.1.0, jsdom, sweep probe pattern)
- ShapeToolbar gains a 14th shape entry with a two-concentric-circle preview (r=8 + r=4.5), en `"Double Circle"` / fr `"Double cercle"` labels in the nested `visual.shapes` block, and a PropertiesPanel select option
- Full unit suite green: 90 files, 1559 tests (baseline 1548 + 11 new), zero failing files

## Task Commits

Each task was committed atomically (TDD RED -> GREEN per task):

1. **Task 1 (tracer, tdd): dbl-circ core — parse -> write -> render pin**
   - `70c75f7` (test) RED: five failing dbl-circ behaviors in codeUtils.test.ts
   - `3f31291` (feat) GREEN: SHAPE_PATTERNS entries + shapeWrap rewrite + render canary
2. **Task 2 (auto, tdd): toolbar exposure — 14th shape, preview, labels, panel, component test**
   - `78a82b6` (test) RED: ShapeToolbar.test.tsx (dbl-circ cases failing, circle control green)
   - `fea7211` (feat) GREEN: SHAPES entry + ShapePreview case + SHAPE_OPTIONS + en/fr keys

**Plan metadata:** the SUMMARY commit (docs) follows this file; no REFACTOR commit — the GREEN diffs were already minimal.

## Files Created/Modified
- `src/lib/mermaid/codeUtils.ts` - two dbl-circ SHAPE_PATTERNS entries (quoted first, before circle) + shapeWrap legacy emission
- `src/lib/mermaid/__tests__/codeUtils.test.ts` - parse x3 (incl. non-interference), write x2, round-trip x1
- `src/lib/mermaid/__tests__/dbl-circ-render.test.ts` - NEW: render canary for both input forms (sweep probe pattern)
- `src/components/visual/ShapeToolbar.tsx` - SHAPES 14th entry + two-circle ShapePreview case
- `src/components/visual/__tests__/ShapeToolbar.test.tsx` - NEW: toolbar component suite with i18n mock
- `src/components/visual/PropertiesPanel.tsx` - SHAPE_OPTIONS dbl-circ entry
- `src/i18n/locales/en.json` / `fr.json` - `visual.shapes.dblCirc` in the nested shapes block only

## Decisions Made
- Legacy writer over directive writer (plan-locked option b): any at-brace dbl-circ emission would self-sabotage against `bodyContainsAtDirective` — the editor would freeze on the first toolbar-created node's autosave. Verified post-change: the emission template count in codeUtils.ts is 0.
- V11_SHAPES and the other ten v11 cases byte-unchanged (plan mandate): unit-level edge-line recognition of the directive form preserved; D6 gate semantics untouched.
- Toolbar test rewritten to measured jsdom semantics (see Deviations) rather than the plan's falsified instrument assumptions — the behavioral assertions (localized accessible name, two-circle preview, circle control) are unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Toolbar-test instrument assumptions falsified by the RED run's own a11y dump**
- **Found during:** Task 2 (RED phase, first run)
- **Issue:** The plan asserted (a) jsdom keeps `visibleCount` at `SHAPES.length` (no ResizeObserver) and (b) `getAllByRole` finds 2 dbl-circ instances (primary row + hidden measurer). Measured reality: the mount layout-effect fit runs regardless of ResizeObserver and measures a zero-width scroller, so the primary row deterministically holds 2 shapes behind a More popover; and the measurer row is `aria-hidden` + `visibility:hidden`, so RTL role queries exclude it — max 1 accessible instance.
- **Fix:** Test rewritten to true semantics: open the More popover for the accessible copy (assert exactly 1 + localized name + both structural copies via title-attribute query = 2), and scope the circle-count assertions to matched buttons (measurer copies render unconditionally). Same behavioral intent as the plan's behavior block.
- **Files modified:** src/components/visual/__tests__/ShapeToolbar.test.tsx
- **Verification:** RED run 2 (2 dbl-circ failures with absence signals, circle control green), then GREEN 3/3 after implementation; full suite 1559 green
- **Committed in:** 78a82b6 (test) / fea7211 (impl, part of task commits)

---

**Total deviations:** 1 auto-fixed (1 bug — test instrument correction; no production code deviation).
**Impact on plan:** None on shipped behavior — the correction makes the component test assert the same user-facing contract through working instruments.

## Issues Encountered
- `gsd_run` (GSD CLI) is absent from the subagent shell PATH on this host (known, #5244/#5246 in the observation log): the `check tdd-red-evidence` gate verb could not be invoked. The RED evidence was recorded to a JSON record plus the full vitest log and self-validated against the canonical INVALID_RED checklist (all five target tests failed on planned-behavior assertions — received shape `circle` on both parse cases, at-brace output on both write cases, double-paren degrade on the round-trip; the non-interference guard and all 107 baseline tests passed; zero crashes).
- The plan's Task 1 action says "observe the four dbl-circ behaviors fail"; five failed (the plan's own signal list covers five tests: 2 parse + 2 write + 1 round-trip). Count imprecision only — all documented signals observed.

## Threats Disposition (plan threat_model)
- **T-26-01 (DoS, new regexes, accept):** both patterns shipped anchored with a single lazy group, no nested quantifiers — as planned; nothing further required.
- **T-26-02 (Tampering via label breakout, mitigate):** mitigation in place — the writer wraps with the quote-aware variable `l` (needsQuotes quotes any non-alphanumeric label), pinned by the quoted-label parse case and the round-trip case.
- **T-26-03 (XSS via rendered SVG, accept existing control):** no new injection surface; the canary renders through the same sanitized pipeline (DOMPurify downstream of renderDiagram), unchanged.
- No new security-relevant surface beyond the plan's threat model (no endpoints, auth, or storage changes).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 26 success criteria all hold (see coverage D1-D6); the visual editor now offers the double-circle shape that creates valid mermaid, round-trips, and supports styling/rename like every other shape.
- Phase 27 territory (full `@{ }` parsing incl. unknown-key preservation and icon form) is untouched by design: V11_SHAPES, the D6 gate, and the other ten v11 writer cases are byte-unchanged.
- Known clean state: no stubs, no skipped tests, all verify blocks executed for real.

## Self-Check: PASSED

- Files verified on disk: src/lib/mermaid/codeUtils.ts, src/lib/mermaid/__tests__/codeUtils.test.ts, src/lib/mermaid/__tests__/dbl-circ-render.test.ts, src/components/visual/ShapeToolbar.tsx, src/components/visual/__tests__/ShapeToolbar.test.tsx, src/components/visual/PropertiesPanel.tsx, src/i18n/locales/en.json, src/i18n/locales/fr.json — all present (8/8 of files_modified).
- Commits verified in git log: 70c75f7, 3f31291, 78a82b6, fea7211 (4/4, parent chain on 599fbd4).
- Final gates re-run on the committed tree: prohibition count 0; scoped runs 115 + 3 green; full suite 1559 green (exit 0).
- The docs commit that contains this self-check is verified by invariant (staged via forced add; working tree clean afterwards), not by quoting its own hash.

---
*Phase: 26-double-circle-shape-legacy-syntax*
*Completed: 2026-10-07*
