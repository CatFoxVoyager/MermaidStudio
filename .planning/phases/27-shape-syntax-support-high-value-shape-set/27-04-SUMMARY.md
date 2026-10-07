---
phase: 27-shape-syntax-support-high-value-shape-set
plan: 04
subsystem: editor
tags: [codemirror, autocomplete, mermaid, shapes, developer-experience]

# Dependency graph
requires:
  - phase: 27-shape-syntax-support-high-value-shape-set (27-01)
    provides: the at-directive fence rework that makes the "editable in the visual editor" copy true
  - phase: 27-shape-syntax-support-high-value-shape-set (27-03)
    provides: the 12-shape toolbar set whose keys the editor suggestions must mirror
provides:
  - 30-key SHAPE_NAMES (delay, sl-rect, div-rect, datastore, tri added) — the editor now suggests the full 12-shape toolbar set
  - at-shape completion detail rewritten to the post-rework editable UX; stale read-only claim at 0 line-scoped occurrences
  - view-collapsed completion copy byte-pinned (its form stays fenced, copy stays accurate)
  - four copy/resolvability pins over the exported completion surface (runCompletions), never a source-text pin
affects: [autocomplete maintenance, future shape-set phases, verify-work phase 27]

# Actuals (#2632) — pairs with the plan's estimate (estimate.tokens: 18000)
actuals:
  tokens: 1187        # chars/4 over the realized src diff (4748 chars)
  tasks: 1
  commits: 2          # MEASURED: git rev-list --count gsd-plan-head-before-27-04..HEAD (before the docs commit)
plan_head_before: 16ab765127a96893dcb7003c28fa928e4f15da39
plan_head_after: 16bf86f

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "line-scoped copy gates: positive phrase pinned to the `@{ shape: ` label line (==1), stale phrase matched only on that same label prefix (==0), sibling view-collapsed line gated separately — regionalization survives a shared phrase"
    - "completion pins assert through the exported mermaidCompletions surface (runCompletions helper), never readFileSync source pins"

key-files:
  created: []
  modified:
    - src/lib/mermaid/autocomplete.ts
    - src/lib/mermaid/__tests__/autocomplete.test.ts

key-decisions:
  - "Kept the rewritten completion entry on ONE line: the plan's gates are line-scoped (label + detail must share a line); hook chain verified first — .husky/pre-commit runs only lint+type-check, no formatter rewrites staged files (CLAUDE.md's lint-staged claim is unwired)"
  - "Applied the mandated copy byte-exact ('Attach shape metadata to a node (editable in the visual editor)') — no unknown-key nuance added, per plan action 3"
  - "Left the view-collapsed completion untouched and pinned it: subgraph collapse genuinely has no visual editor, so its read-only copy stays correct"
  - "Committed the SUMMARY with git add -f (orchestrator host-trap instruction + repo precedent 16ab765) despite the plan's stale 'do NOT commit anything' output note"

patterns-established:
  - "Shape-name completion vocabulary mirrors the toolbar's 12-shape set; new toolbar shapes must extend SHAPE_NAMES in the same wave"
  - "Copy pins live in a phase-named describe block and assert detail strings through the real completion source"

requirements-completed: []

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "SHAPE_NAMES carries all 5 new keys; each resolves as a flowchart shape-name completion through the exported surface"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/autocomplete.test.ts#offers each of the 5 newly-added shape names in flowchart context"
        status: pass
      - kind: command
        ref: "sed+grep entry count over SHAPE_NAMES == 30"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 12 phase-27 target keys resolve as shape-name completions"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/autocomplete.test.ts#offers all 12 phase-27 target keys as shape-name completions"
        status: pass
    human_judgment: false
  - id: D3
    description: "At-shape completion detail is the mandated editable-accurate copy; stale read-only phrase absent from the at-shape line"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/autocomplete.test.ts#the at-shape completion detail describes the post-rework editable UX"
        status: pass
      - kind: command
        ref: "grep gates: editable-phrase on '@{ shape: ' lines == 1; stale phrase on that label prefix == 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "View-collapsed completion byte-unchanged (label and detail intact, exactly one occurrence)"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/autocomplete.test.ts#the view-collapsed completion copy is unchanged (its form stays fenced)"
        status: pass
      - kind: command
        ref: "grep gates: 'view: collapsed' == 1 and its read-only copy == 1"
        status: pass
    human_judgment: false

# Metrics
duration: 14min
completed: 2026-10-07
status: complete
---

# Phase 27 Plan 04: Shape-name completions + at-shape copy fix Summary

**30-key SHAPE_NAMES (5 new keys) plus the at-shape completion copy rewritten to the post-rework editable UX, pinned through the exported completion surface**

## Performance

- **Duration:** 14 min (19:42:49Z - 19:56:06Z)
- **Started:** 2026-10-07T19:42:49Z
- **Completed:** 2026-10-07T19:56:06Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- SHAPE_NAMES grew 25 to 30 (delay, sl-rect, div-rect, datastore, tri) — the editor now suggests the full 12-shape toolbar set from 27-03
- The at-shape completion detail now reads "Attach shape metadata to a node (editable in the visual editor)" — true since 27-01's fence rework; the stale read-only claim is gone from the at-shape line (regionalized gate: 0 occurrences on that label prefix)
- The view-collapsed completion is byte-unchanged and pinned — its read-only copy remains accurate (subgraph collapse has no visual editor)
- Four test pins added through the exported completion surface (runCompletions): 5-name resolvability, 12-key sweep, at-shape detail pin, view-collapsed byte pin; the existing vocabulary sweep extended to the 30-entry list
- Wave-close gate: full suite 91 files / 1638 tests passed (baseline 1634 + 4 new), exit 0

## Task Commits

Each task was committed atomically (TDD):

1. **Task 1 (RED): shape completions + copy pins** - `0bd25a4` (test)
2. **Task 1 (GREEN): 5 shape names + at-shape copy** - `16bf86f` (feat)

**Plan metadata:** committed with the SUMMARY below (docs).

## Files Created/Modified

- `src/lib/mermaid/autocomplete.ts` - 5 new SHAPE_NAMES keys (30 total) + rewritten at-shape completion detail (single-line form preserved for the line-scoped gates)
- `src/lib/mermaid/__tests__/autocomplete.test.ts` - new phase-27 describe block (4 pins) + vocabulary sweep extended to 30 entries

## Decisions Made

- Kept the completion entry on one line and verified the hook chain before relying on it: `.husky/pre-commit` runs only oxlint + tsc; lint-staged/prettier is configured but invoked by no hook, so the single-line layout the gates grep survives commits
- Committed the SUMMARY despite the plan output note saying otherwise — the orchestrator's host trap 5 (.planning/ gitignored: git add -f + commit MANDATORY) and repo precedent (16ab765) override the stale note

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing 25-entry vocabulary test would have gone stale**
- **Found during:** Task 1 (RED authoring)
- **Issue:** The existing test "offers the full curated 25-entry shape vocabulary" would assert a false "full" claim the moment SHAPE_NAMES grows to 30 — the same copy-drift class this plan fixes
- **Fix:** Extended its SHAPE_LABELS array with the 5 new keys and retitled to "30-entry" (goes RED with the new cases, GREEN with the implementation)
- **Files modified:** src/lib/mermaid/__tests__/autocomplete.test.ts
- **Verification:** Test passes post-GREEN; its 30 entries match the sed/grep source count of 30
- **Committed in:** 0bd25a4 (RED) / 16bf86f (GREEN)

---

**Total deviations:** 1 auto-fixed (1 bug: test-title accuracy)
**Impact on plan:** None on scope — the four planned cases were added exactly as specified; the extension keeps the suite's claims truthful.

## Issues Encountered

- First full-suite run used `--forceExit`, which vitest 5.0.3's CLI rejects (`CACError: Unknown option`) — the suite never started; rerun plain per the repo's config-level `forceExit: true` and measured green (1638/1638). Noted to memory (the "forceExit OK" phrasing was config-level, not a CLI flag)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase complete: this was the last plan of phase 27 — the 12-shape set is first-class end to end (parser/writer/fence 27-01, tests/renders 27-02, toolbar/previews 27-03, editor suggestions + copy 27-04)
- No blockers; ready for phase verification (/gsd-verify-work 27)

## Self-Check: PASSED

- Files exist on disk: src/lib/mermaid/autocomplete.ts, src/lib/mermaid/__tests__/autocomplete.test.ts (both FOUND)
- Task commits exist: 0bd25a4 (test RED), 16bf86f (feat GREEN) — both found in git log
- All four plan gates PASS (editable-phrase == 1; stale-phrase on at-shape label lines == 0; view-collapsed == 1 with read-only == 1; SHAPE_NAMES == 30 entries)
- Scoped suite 60/60 green; wave-close full suite 1638/1638 green (exit 0 from the gate's own log)
- The SUMMARY's own commit is verified by invariant (docs commit lands after this file is written; tracked tree clean beforehand), not by quoting its hash

---
*Phase: 27-shape-syntax-support-high-value-shape-set*
*Completed: 2026-10-07*
