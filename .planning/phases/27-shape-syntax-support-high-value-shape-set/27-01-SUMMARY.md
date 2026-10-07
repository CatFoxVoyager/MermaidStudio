---
phase: 27-shape-syntax-support-high-value-shape-set
plan: 01
subsystem: mermaid-visual-editor
tags: [mermaid, parser, directive-syntax, read-only-gate, writer, react, vitest, tdd]

requires:
  - phase: 26-double-circle-shape-legacy-syntax
    provides: post-26 writer state this plan diffs against (dbl-circ legacy wrap, 10 surviving v11 directive cases, 11-entry V11_SHAPES) and the render-canary test pattern the directive canary copies
  - phase: 24-diagram-type-render-sweep
    provides: D6 presence gate being narrowed (fb0c61f) and the jsdom probe pattern (getComputedTextLength polyfill, renderDiagram-only renders)
provides:
  - parseAtDirective span parser (greedy-to-line-end span, quote-aware comma splitter, escaped-quote unescape, unknownParams verbatim slices) with directiveRaw/unknownParams on ParsedNode
  - standalone directive branch in parseDiagram (subgraph-wrapped via currentParent) plus arrow-branch routing for at-brace shape-raw captures on both sides
  - bodyHasUnparsedAtDirective: the D6 fence narrowed from presence to parse-completeness, live on both consumers with plumbing byte-identical
  - directive-aware mutator paths: rename (standalone + edge source/target), shape change (standalone), removeNode, findNodeLine, applyNodePreset
  - person writer case with the escaped always-quoted emission; unknown params re-emitted verbatim on rename/shape-change
  - render canary for directive forms (person standalone + person-to-folder edge)
affects: [plan 27-02 (writer's 12 cases — escape retrofit pre-applied), plan 27-03 (toolbar surface), plan 27-04 (autocomplete copy), visual editor directive UX]

tech-stack:
  added: []
  patterns:
    - "Parse-completeness fence: a gate predicate that mirrors the parser's own branch structure (shared ARROW_LINE_RE) so a line the parser would mangle can never be called consumable — superset-safe by construction"
    - "TDD RED on a type-checked host: new type surface in RED tests ships behind cast accessors so husky's tsc gate passes while the runtime assertion still fails"

key-files:
  created:
    - src/lib/mermaid/__tests__/directive-shape-render.test.ts
  modified:
    - src/lib/mermaid/codeUtils.ts
    - src/lib/mermaid/__tests__/codeUtils.test.ts
    - src/components/visual/VisualEditorCanvas.tsx
    - src/components/preview/PreviewPanel.tsx
    - src/components/visual/__tests__/VisualEditorCanvas.readonly.test.tsx
    - src/components/preview/__tests__/PreviewPanel.test.tsx

key-decisions:
  - "D1 adopted (plan-locked): a no-label directive parses label = node id (mermaid's own vertex.text = id semantics), superseding the V11 branch's shape-name fallback for raw spans; pinned by a green case"
  - "The 10 surviving v11 shapeWrap cases were routed through directiveWrap this plan, not 27-02: the phase prohibition (rename re-emits unknownParams verbatim on every directive shape) requires the shared escaped+extras template; the raw-label interpolation is gone from the writer (count 0 — 27-02's gate baseline improved early)"
  - "D3 honored: updateNodeShape gains the standalone at-brace alternative only; edge-line directive nodes return source unchanged, pinned as documented pre-existing debt"
  - "Fence predicate mirrors the parser's branches exactly (shared ARROW_LINE_RE, same no-arrow guard on the standalone form) so fence verdicts and parser behavior cannot drift"

requirements-completed: []

coverage:
  - id: P1
    description: "parseDiagram recognizes the directive form into typed nodes — standalone, subgraph-wrapped, and both edge-line positions — with escaped-quote labels, id-default labels, unknown keys as verbatim unknownParams, and directiveRaw carrying the original span"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#parses a standalone at-brace directive node into a typed node (tracer)"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#parses a subgraph-wrapped directive node with its parent set"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#parses a target-side directive span into a typed node"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#unescapes backslash-escaped double quotes in directive labels"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#defaults a no-label directive to the node id (mermaid vertex.text semantics)"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#preserves an unknown shape key as a rect with the verbatim span"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#captures unknown params verbatim from an edge-line directive span"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#declines the space-separated directive form (invalid mermaid 12.1.0)"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#handles commas and closing braces inside quoted directive labels"
        status: pass
    human_judgment: false
  - id: P2
    description: "Person writer slice: addNode and rename emit the escaped always-quoted directive wrap; escaped-quote labels round-trip twice consecutively; unknown params survive rename (P4 flipped)"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should add a person node with the directive wrap"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should rebuild the directive wrap on rename of a person node"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#round-trips an escaped-quote label through rename twice"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#keeps unknown params on rename of an edge-defined directive node"
        status: pass
    human_judgment: false
  - id: P3
    description: "D6 narrowing holds in both directions: seven editable-side forms parse and edit; malformed, space-separated, subgraph-header, and icon forms keep the complete read-only UX; frontmatter/init exclusions survive verbatim"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#bodyHasUnparsedAtDirective (D6 parse-completeness gate) — 12-case describe"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/VisualEditorCanvas.readonly.test.tsx#well-formed directive content is EDITABLE: parser runs, overlays present, no badge"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/VisualEditorCanvas.readonly.test.tsx#well-formed directive content allows a mutating handler: shape add fires onChange"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/VisualEditorCanvas.readonly.test.tsx#read-only state: indicator present, edit affordances and selection overlays hidden (MALFORMED fixture)"
        status: pass
      - kind: unit
        ref: "tests/src/components/preview/__tests__/PreviewPanel.test.tsx#well-formed directive content allows a mutating handler (editable)"
        status: pass
      - kind: unit
        ref: "tests/src/components/preview/__tests__/PreviewPanel.test.tsx#add-shape path is fenced: onChange never fires for malformed directive content"
        status: pass
      - kind: other
        ref: "command: grep bodyHasUnparsedAtDirective exported in codeUtils.ts + called in VisualEditorCanvas.tsx and PreviewPanel.tsx (three consumer greps, all pass)"
        status: pass
    human_judgment: false
  - id: P4
    description: "Mutator gates accept directive lines: shape change re-emits through the directive writer (extras kept for directive targets, deliberately dropped on legacy conversion), removeNode deletes directive definitions, findNodeLine and applyNodePreset resolve them; edge-line shape change stays unchanged (D3 pin)"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#rewrites a directive node through the directive writer on shape change"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#drops unknown params when converting a directive node to a legacy shape"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#leaves an edge-defined directive node unchanged on shape change (D3)"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#removes a standalone directive definition line"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#inserts the class line right after a standalone directive node line"
        status: pass
    human_judgment: false
  - id: P5
    description: "Render canary: person standalone and the person-to-folder directive edge render error-free through the app's real renderDiagram pipeline (mermaid 12.1.0, jsdom, sweep probe pattern, never SWEEP_FIXTURES)"
    verification:
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/directive-shape-render.test.ts#renders a standalone person directive node error-free"
        status: pass
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/directive-shape-render.test.ts#renders an edge between two directive nodes error-free"
        status: pass
    human_judgment: false
  - id: P6
    description: "No regressions: full unit suite green after the fence narrowing landed on both consumers"
    verification:
      - kind: unit
        ref: "command: npx vitest run — 91 files, 1591 tests passed, exit 0 (post-26 baseline 1559 + 32 new)"
        status: pass
    human_judgment: false

# Metrics
duration: 34min
completed: 2026-10-07
status: complete
actuals:
  tokens: 58000        # chars/4 over the realized diff (7 files, +823/-116)
  tasks: 3
  commits: 5           # measured: git rev-list --count b11217c..4d0d15b
plan_head_before: b11217c5d23b9f8f8263a55e55ed83aa1f7c910e
plan_head_after: 4d0d15b8526eb494f61b731693d208f19048605a
---

# Phase 27 Plan 01: At-brace directive tracer core Summary

**`@{ shape }` end-to-end on the tracer slice: a greedy-span directive parser feeds typed nodes (standalone, subgraph-wrapped, both edge positions), the D6 fence narrowed to parse-completeness on both consumers, rename/shape-change/delete/move/preset all handle directive lines with verbatim unknown-param carry-through, and the full 12-case fence contract pins both directions — 32 new tests, full suite 1591 green.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-10-07T18:21:26Z
- **Completed:** 2026-10-07T18:55:28Z
- **Tasks:** 3 (all tdd-rated; RED-first observed and evidence-recorded per task)
- **Files changed:** 7 (1 created, 6 modified)

## Accomplishments
- `parseAtDirective` parses a raw at-brace span into typed data: greedy-to-line-end span extraction (brace-in-quotes safe), quote-aware comma splitting (comma-in-label safe), backslash-double-quote unescaping, `shape`/`label` typed, every other key captured as a verbatim source slice in original order; missing label defaults to the node id (decision D1, mermaid's own semantics)
- `parseDiagram` has a standalone directive branch placed before the arrow branch (subgraph-wrapped nodes work automatically via `currentParent()`), and the arrow branch routes at-brace shape-raw captures on BOTH sides to the directive parser — fixing the target-side asymmetry (probe P6)
- The D6 gate is reworked per 27-RESEARCH option (a): `bodyContainsAtDirective` → `bodyHasUnparsedAtDirective`, a parse-completeness predicate that keeps the frontmatter/init exclusions and mirrors the parser's own branch structure (shared `ARROW_LINE_RE`); both consumers swapped with plumbing byte-identical (~35 PreviewPanel fences + ~13 canvas early-returns untouched)
- Mutator paths handle directive lines: rename (standalone + edge source/target) re-emits through the directive writer preserving shape key and unknownParams verbatim; shape change rebuilds standalone spans (extras kept for directive targets, deliberately dropped on legacy conversion, pinned); removeNode, findNodeLine, and applyNodePreset gates accept the at sign; the space-separated form is declined everywhere (invalid mermaid 12.1.0)
- The writer's directive cluster emits through one escaped always-quoted template (`directiveWrap`): labels with double quotes round-trip twice consecutively, unknown params re-emit verbatim after the label; the raw-label interpolation is gone from codeUtils.ts (count 0)
- Component suites flipped both directions: well-formed directive content is editable end-to-end in the canvas (parser runs, overlays present, shape add fires onChange) and the preview panel; the read-only UX lives on a new MALFORMED (unclosed span) fixture; PreviewPanel fence tests re-pointed at it
- Full suite green: 91 files, 1591 tests (post-26 baseline 1559 + 32 new)

## Task Commits

Each task committed atomically (TDD RED -> GREEN; Task 3's GREEN is test-only because the predicate shipped complete in Task 1):

1. **Task 1 (tracer, tdd): directive slice — parse -> fence -> writer -> render**
   - `f643c84` (test) RED: 4 failing behaviors (parse drop = P1 shape, missing helper export, rect emission, unchanged rename); evidence `.gsd/27-01-t1-red-evidence.json`
   - `be93f38` (feat) GREEN: parser + narrowed fence + person case + consumer swaps + reversed drop-observation test + render canary
2. **Task 2 (auto, tdd): parse matrix + mutator gates**
   - `2548714` (test) RED: 5 gate defects (rename extras loss, shape-change unchanged, legacy-conversion unchanged, removeNode miss, preset placement); 10 matrix pins green against the Task 1 skeleton; evidence `.gsd/27-01-t2-red-evidence.json`
   - `cac9923` (feat) GREEN: gates + directive writer carry-through + v11 case cluster conversion + preset-scan anchor fix
3. **Task 3 (auto, tdd): full fence contract**
   - `4d0d15b` (test) GREEN: 12-case fence describe, readonly fixture split both directions, PreviewPanel flip + malformed re-point; scoped 225 green, then full suite 1591 green

**Plan metadata:** the SUMMARY commit (docs, `git add -f` — .planning/ is gitignored) follows this file. No REFACTOR commits — the GREEN diffs were already minimal.

## TDD Gate Compliance

RED and GREEN commits present in order for Tasks 1 and 2; Task 3's implementation pre-existed in Task 1's GREEN (the plan built the predicate complete in Task 1; Task 3 is its contract), so Task 3 has a single test-type commit. `gsd_run check tdd-red-evidence` is absent from the subagent shell PATH on this host (known #5244/#5246); both RED phases were self-validated against the canonical INVALID_RED checklist — every target test failed on a planned-behavior assertion, zero unrelated failures, zero unexpected greens, records at `.gsd/27-01-t{1,2}-red-evidence.json`.

## Decisions Made
- **D1 (adopted):** no-label directive parses label = node id. No existing test pinned the old shape-name fallback (probe-only); the new no-label test pins the id default.
- **Escape retrofit pre-applied (deviation, see below):** the phase prohibition "never drop unknown-key content on write-back" requires rename of ANY directive shape to re-emit unknownParams — so all 21 directive-emitting cases route through `directiveWrap` as of Task 2, not just person. 27-02's raw-label count gate (`== 0` after it) is already satisfied; its remaining work is the 11 new union cases' writer cases.
- **Fence predicate mirrors the parser:** the fence reuses the parser's exact arrow-line regex and standalone no-arrow guard, so "fenced" and "parser would mangle" can never disagree; the icon-param refusal (no icon write-back, A5) is the one deliberate extra fence.
- **The inner quoted-label form (`A["@{ shape: doc }"]`) stays fenced:** its rename path rebuilds through shapeWrap and would corrupt the line; superset-safety governs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Readonly test file needed a mechanical name swap inside Task 1**
- **Found during:** Task 1 (GREEN commit blocked by husky)
- **Issue:** husky's pre-commit runs `tsc --noEmit`; after the helper rename, `VisualEditorCanvas.readonly.test.tsx`'s four dynamic imports of the old name failed type-check, blocking the Task 1 commit. The plan assigns that file's rewrite to Task 3.
- **Fix:** swapped the four identifiers to the new name only (expectations untouched — the old read-only expectations then fail, which is exactly Task 3's RED). The behavioral contract rewrite stayed in Task 3 as planned.
- **Files modified:** src/components/visual/__tests__/VisualEditorCanvas.readonly.test.tsx (in commit be93f38)
- **Verification:** type-check green; Task 3's RED run shows the expectation failures as designed

**2. [Task-boundary adjustment] Drop-observation test reversal moved from Task 2 to Task 1**
- **Found during:** Task 1 (first scoped run)
- **Issue:** the plan reverses `silently drops a bare post-id metadata line` in Task 2, but Task 1's parser commit already flips it, and Task 1's verify gate requires codeUtils.test.ts green.
- **Fix:** reversed the test in Task 1's GREEN (same test id and shape kept, comment updated to record that the anticipated parser upgrade landed). Task 2's RED then contained only genuinely-red gate cases.
- **Files modified:** src/lib/mermaid/__tests__/codeUtils.test.ts (in commit be93f38)

**3. [Rule 1 - Bug] applyNodePreset continuation scan anchored**
- **Found during:** Task 2 (GREEN run)
- **Issue:** the "skip continuation lines" regex `^[\x5B\x5D{}]|\s|,` was only anchored on its first alternative — the unanchored whitespace/comma alternatives matched ANY line containing a space, including the classDef line the same function had just appended, so the class assignment never landed adjacent to its node (for legacy nodes too — pre-existing, but it defeated this plan's pinned placement).
- **Fix:** anchored the char class (`/^[\x5B\x5D{},]/`) so only structural continuation lines extend the insertion point.
- **Files modified:** src/lib/mermaid/codeUtils.ts (in commit cac9923)
- **Verification:** new preset-placement test green; full suite green

**4. [Rule 1 - Test instrument] Two test expectations corrected against measured behavior**
- **Found during:** Task 2 (GREEN run)
- **Issue:** (a) legacy-conversion expectation wrote `A(D)` but the directive context always quotes — the correct faithful emission is `A("D")` (also the only form that round-trips special-char labels); (b) the canvas EDITABLE test asserted the post-parse pipeline synchronously, but the old tests' `waitFor(svg)` resolves off the component's svg scaffold before the 300ms debounced render — the pipeline assertions now wait explicitly.
- **Fix:** expectation `A("D")` with a comment; debounced-pipeline and overlay assertions wrapped in `waitFor`.
- **Files modified:** codeUtils.test.ts, VisualEditorCanvas.readonly.test.tsx (in commits cac9923 / 4d0d15b)

**5. [Instrument adaptation] "rename via canvas fires onChange" has no rename interaction**
- **Found during:** Task 3
- **Issue:** the plan's editable-side behavior names a canvas rename path; VisualEditorCanvas has no rename interaction (grep: no dblclick/rename handler). Its mutating paths are shape add, delete, and connect.
- **Fix:** the editable flip asserts the shape-add mutation (`handleAddShape` → addNode → onChange, directive line untouched in the output) — same behavioral intent: a mutating handler fires onChange on well-formed directive content.
- **Files modified:** VisualEditorCanvas.readonly.test.tsx (in commit 4d0d15b)

**6. [Scope note] 27-02's escape retrofit partially pre-applied**
- **Found during:** Task 2
- **Issue:** decision D2 defers the escaped-emission retrofit of the surviving v11 cases to 27-02, but the P4 pin (rename of a doc node carrying `w: 100` keeps the param — a phase prohibition) requires the doc case to carry extras, and a shared template is the only non-duplicated implementation.
- **Fix:** the whole directive cluster routes through `directiveWrap` (escaped + extras). Raw-label template count in codeUtils.ts: 10 pre-change → 0 now. Impact on 27-02: its count gate is already at the target; its per-case work shrinks. No behavior lost — the escape fix D2 recommended is in.
- **Files modified:** src/lib/mermaid/codeUtils.ts (in commit cac9923)

---

**Total deviations:** 5 auto-fixed (2 blockers, 2 bugs, 1 instrument adaptation) + 1 scope note. **Impact:** none on the plan's contract — every pinned behavior holds; the fixes make the TDD commits type-clean, keep every intermediate commit's scoped gate green, and close a pre-existing adjacency bug the pinned preset behavior exposed.

### Intentional intermediate state (plan-designed)
Between `be93f38` and `4d0d15b` the two component suites carried failing read-only expectations (old contract vs new editable behavior) — the plan's Task 3 owns their flip, and Tasks 1-2's scoped verify gates never included those files. Every commit's own verify block passed at its commit; the tree reached all-green at Task 3.

## Issues Encountered
- `gsd_run` (GSD CLI) is absent from the subagent shell PATH (known #5244/#5246): the `check tdd-red-evidence` gate verb could not run; RED evidence was recorded to JSON plus full vitest logs and self-validated against the INVALID_RED checklist (26-01 precedent).
- Host quirk honored throughout: Node PATH prefixed for every vitest/commit invocation; commit trailers verified post-commit; the raw-label literal was never written into codeUtils.ts comments (grep-count gate hygiene, observation #5165).

## Threats Disposition (plan threat_model)
- **T-27-01 (ReDoS, mitigate by construction):** the scanner is one greedy-to-line-end span match plus a linear quote-state character scan — no nested quantifiers, no backtracking amplifier; nothing to add.
- **T-27-02 (Tampering via label breakout, mitigate):** mitigation shipped — emission always quotes and escapes the label; unknownParams re-emit verbatim from parse, never re-interpreted; pinned by the twice-consecutive escaped-quote round-trip and the P4 extras case.
- **T-27-03 (Tampering — fence narrowing, mitigate):** shipped in the SAME commit as the parser and its pinning tests (be93f38), superset-safe by construction, residual set pinned by the 12-case describe plus both component suites. Ship-order rule respected.
- **T-27-SC (npm installs):** no packages installed; nothing to gate.
- No security-relevant surface beyond the plan's threat model (no endpoints, auth, storage, or schema changes).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 27-02 starts from: `parseAtDirective` + `directiveWrap` + the mutator gates all in place, raw-label count already 0; its work is the 11 new shapes' toolbar-grade writer cases (the `directiveWrap(shapeKey, ...)` calls are one-liners), the D2 retrofit (done), and its own toolbar/i18n surface.
- The fence's residual read-only set is exactly the four research-named forms; 27-04's autocomplete copy update ("makes the visual editor read-only" is now wrong for `@{ shape: ... }`) is the last user-facing text debt.
- Known clean state: no stubs, no skipped tests, all verify blocks executed for real.

## Self-Check: PASSED

- Files verified on disk: src/lib/mermaid/codeUtils.ts, src/lib/mermaid/__tests__/codeUtils.test.ts, src/lib/mermaid/__tests__/directive-shape-render.test.ts, src/components/visual/VisualEditorCanvas.tsx, src/components/preview/PreviewPanel.tsx, src/components/visual/__tests__/VisualEditorCanvas.readonly.test.tsx, src/components/preview/__tests__/PreviewPanel.test.tsx — all present (7/7 of files_modified).
- Commits verified in git log: f643c84, be93f38, 2548714, cac9923, 4d0d15b (5/5, parent chain on b11217c); every trailer verified post-commit.
- Final gates re-run on the committed tree: scoped runs 120 + 133 + 225 green; full suite 91 files / 1591 tests green (exit 0); three helper-presence greps pass; ship-order invariant (fence + parser + tests in be93f38) verified via git show --stat.
- The docs commit that contains this self-check is verified by invariant (staged via forced add; working tree clean afterwards), not by quoting its own hash.

---
*Phase: 27-shape-syntax-support-high-value-shape-set*
*Completed: 2026-10-07*
