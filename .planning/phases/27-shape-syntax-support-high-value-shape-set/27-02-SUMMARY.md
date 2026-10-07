---
phase: 27-shape-syntax-support-high-value-shape-set
plan: 02
subsystem: mermaid-visual-editor
tags: [mermaid, writer, directive-syntax, escaping, render-canary, vitest, tdd]

requires:
  - phase: 27-shape-syntax-support-high-value-shape-set (plan 01)
    provides: the parser, the narrowed fence, the person writer slice, directiveWrap (the shared escaped always-quoted template), and the unknownParams-aware rename/shape-change plumbing this plan extends across the full shape set
provides:
  - The complete 12-shape writer surface: delay, sl-rect, div-rect, folder, datastore, cloud, browser, bolt, tri, hourglass join person through shapeWrap, each emitting the escaped always-quoted directive wrap with verbatim unknown-param carry-through
  - 21 directive-emitting shapeWrap cases total (11 new + doc + docs + 9 surviving v11), zero raw-label interpolation (count gate 0)
  - Render canary at 14 tests: all 12 shapes standalone (svg floor), the two-directive-node edge, and the escaped-quote label form
affects: [plan 27-03 (toolbar surface — every toolbar emit path now has a correct writer case behind it), plan 27-04 (autocomplete copy)]

tech-stack:
  added: []
  patterns:
    - "Shared emission template: every directive-emitting case is a one-line directiveWrap(key, label, unknownParams) call — escaping, quoting and extras routing live in exactly one place"

key-files:
  created: []
  modified:
    - src/lib/mermaid/codeUtils.ts
    - src/lib/mermaid/__tests__/codeUtils.test.ts
    - src/lib/mermaid/__tests__/directive-shape-render.test.ts

key-decisions:
  - "The 10 new shapeWrap cases are one-line directiveWrap calls mirroring the person case — no per-case template divergence, so escaping and extras routing cannot drift per shape"
  - "directiveWrap's escape flipped from a /g-regex replace to the plan's named replaceAll mechanism — behavior byte-identical, the plan's escaping-presence gate passes verbatim"
  - "Green-on-arrival pins kept as tests: the docs-line escaping, cross-shape param carry, and new-key rename pins were documented RED in the plan but arrived green because 27-01 pre-applied the escaped template; they are kept as the permanent contract pins"

requirements-completed: []

coverage:
  - id: P1
    description: "All 12 toolbar-target shapes emit the directive wrap from updateNodeShape on a plain rect source — never the default rect fallback"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#emits the directive wrap when changing shape to <key> (it.each, 12 rows)"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#should add a delay node with the directive wrap"
        status: pass
    human_judgment: false
  - id: P2
    description: "Escaping and param preservation across the writer paths: double-quote labels survive emission and re-parse through a new shape, docs-line rename escapes (D2 pin), unknown params carry through rename and directive-to-directive shape change"
    verification:
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#round-trips a double-quote label through a new directive shape"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#escapes double quotes on rename of a docs line (D2 retrofit pin)"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#keeps unknown params on rename across the new directive shapes"
        status: pass
      - kind: unit
        ref: "tests/src/lib/mermaid/__tests__/codeUtils.test.ts#keeps unknown params when changing between directive shapes"
        status: pass
    human_judgment: false
  - id: P3
    description: "Render canary: all 12 shapes standalone (error null, svg above the research floor), the person-to-folder directive edge, and the escaped-quote form render error-free through the app's real renderDiagram pipeline (mermaid 12.1.0, jsdom, sweep probe pattern, never SWEEP_FIXTURES)"
    verification:
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/directive-shape-render.test.ts#renders a standalone <key> directive node error-free (it.each, 12 rows)"
        status: pass
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/directive-shape-render.test.ts#renders an edge between two directive nodes error-free"
        status: pass
      - kind: integration
        ref: "tests/src/lib/mermaid/__tests__/directive-shape-render.test.ts#renders the escaped-quote label form error-free"
        status: pass
    human_judgment: false
  - id: P4
    description: "No regressions: raw-template count gate 0 on the committed tree; full unit suite green at wave close"
    verification:
      - kind: other
        ref: "command: grep -cF of the banned raw-template bytes in codeUtils.ts = 0; replaceAll + 10 per-member case greps pass"
        status: pass
      - kind: unit
        ref: "command: npx vitest run — 91 files, 1620 tests passed, exit 0 (27-01 baseline 1591 + 29 new)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-10-07
status: complete
actuals:
  tokens: 2600         # chars/4 over the realized diff (3 files, +114/-13, 10257 chars)
  tasks: 2
  commits: 3           # measured: git rev-list --count b9b6e96..a96d08c
plan_head_before: b9b6e96c392941f7833af9b87bd95a43ed7b5f4a
plan_head_after: a96d08c36e0a2ce5bd0f53e96d16173236900e42
---

# Phase 27 Plan 02: Writer shape-set completion + escaping Summary

**The writer emits `@{ }` for the full high-value set — 10 new shape cases join person through the shared escaped always-quoted template (21 directive-emitting cases, raw-label interpolation count 0), unknown params ride through rename and cross-shape changes, and a 14-test render canary proves all 12 shapes plus the directive edge render error-free through the app's own pipeline; full suite 1620 green.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-07T19:04:21Z
- **Completed:** 2026-10-07T19:16:27Z
- **Tasks:** 2 (Task 1 tdd-rated: RED-first observed and evidence-recorded; Task 2 auto)
- **Files changed:** 3 (all modified; +114/-13)

## Accomplishments
- `shapeWrap` carries the full 12-shape toolbar-target set: `delay`, `sl-rect`, `div-rect`, `folder`, `datastore`, `cloud`, `browser`, `bolt`, `tri`, `hourglass` join `person`, each a one-line `directiveWrap(key, label, unknownParams)` call — escaped always-quoted emission, unknown params re-emitted verbatim after the label
- 21 directive-emitting cases total (11 new + doc + docs + the 9 surviving v11 cases), all through the shared template; the raw-label interpolation census in codeUtils.ts is 0 (measured pre-change 0 — 27-01 pre-applied the D2 retrofit — and 0 after, gate stays green)
- Writer matrix pinned: 12-key emission sweep on `updateNodeShape` (rect source → directive wrap, no rect fallback), toolbar `addNode` case, double-quote label round-trip through a new shape (add → rename → re-parse), docs-line escaped rename (D2 pin), param-preserving rename on a new key (`w: 80`), directive-to-directive shape change keeping `w: 100`, and the documented directive-to-legacy drop carried from 27-01
- Render canary extended from 2 to 14 tests on the established polyfill/cleanup pattern: 12 standalone keys via `it.each` (row callback uses the row value directly — no string destructuring), the two-directive-node edge (now also asserts label substance), and the escaped-quote label form; a typo'd key would surface as mermaid's No-such-shape error against the null assert
- Wave close: full suite 91 files / 1620 tests green, exit 0 (27-01 baseline 1591 + 29 new)

## Task Commits

1. **Task 1 (auto, tdd): writer expansion — 11 new cases, doc retemplate, escaping retrofit, param-preserving rename**
   - `2ffc4bd` (test) RED: 12 failing behaviors — the 10 missing emission sweep keys, the addNode delay case, and the folder double-quote round-trip, all on the documented default-rect fallback; evidence `.gsd/27-02-t1-red-evidence.json` + full log
   - `85b3b05` (feat) GREEN: the 10 shapeWrap cases + the replaceAll escape mechanism; scoped suite 156/156, count gate 0, per-member presence green
2. **Task 2 (auto): render canary completion + wave-close full suite**
   - `a96d08c` (test): canary at 14 renders, all green; wave-close full suite 1620 green

**Plan metadata:** the SUMMARY commit (docs, `git add -f` — .planning/ is gitignored) follows this file.

## TDD Gate Compliance

Task 1 RED ran before implementation: 12 target tests failed on planned-behavior assertions (default-rect fallback outputs quoted in the evidence diff), zero unrelated failures, zero unexpected reds. `gsd_run check tdd-red-evidence` is absent from the subagent shell PATH on this host (known #5244/#5246); RED was self-validated against the canonical INVALID_RED checklist and recorded at `.gsd/27-02-t1-red-evidence.json` (27-01 precedent). Four plan-documented RED behaviors arrived GREEN (see Deviations) — pinned, not counted as RED evidence. No REFACTOR commit: the GREEN diff was already minimal (13 insertions).

## Decisions Made
- **One-line cases over per-shape templates:** each new case is `return directiveWrap('<key>', label, unknownParams);` — the template (escaping, quoting, extras join) lives in one function, so the phase prohibitions (escaped labels, verbatim params) hold by construction rather than by 21 copies.
- **Escape mechanism conformance:** the plan's Task-1 CLI gate greps `replaceAll` in codeUtils.ts; 27-01 had shipped the identical escaping via a global-regex `replace`. Flipped the one line to `replaceAll('"', ...)` — byte-identical output (no `$` patterns involved), the gate passes verbatim, and the scoped suite re-proved it.
- **Green-on-arrival pins stay:** the plan flagged several behaviors "green-or-red per 27-01 state"; all landed green. Kept as permanent pins (docs escaping, cross-shape param carry, new-key rename) — they guard the contract against future template drift.
- **Canary substance asserts:** each sweep row asserts error null plus svg length above 5000 (research Q4 floors run 11152-32602; the floor sits far below the minimum); the edge and escaped-form rows additionally assert label text presence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker, instrument conformance] Escape mechanism literal aligned with the plan's gate**
- **Found during:** Task 1 (baseline measurement)
- **Issue:** the plan's second CLI verify gate asserts `replaceAll` present in codeUtils.ts, but 27-01 had shipped the escape in `directiveWrap` as a global-regex `replace` — the gate literal was authored pre-27-01 against the research's mechanism sketch.
- **Fix:** flipped the single escape line to `replaceAll('"', '\\"')` (behavior byte-identical; ES2022 lib supports it; no `$` sequences in the replacement). Gate passes verbatim; scoped suite re-run green.
- **Files modified:** src/lib/mermaid/codeUtils.ts (in commit 85b3b05)
- **Verification:** scoped vitest 156/156; count gate still 0; the flipped line is covered by the double-quote round-trip tests

**2. [Plan-premise note, no code change] Four documented RED behaviors arrived green**
- **Found during:** Task 1 (RED run)
- **Issue:** the plan's RED list presumed the raw-label interpolation still live on the surviving v11 cases and the param-carry only tracer-tested; 27-01's pre-applied retrofit made the docs-escaping, delay-rename, and doc-to-person param pins green on arrival.
- **Fix:** none needed — the plan itself flagged these "green-or-red per 27-01 state; kept as the pin". They are recorded as pins, excluded from RED evidence, and the genuine RED (10 missing cases) drove the GREEN commit.
- **Files modified:** none
- **Verification:** RED evidence JSON lists the four green-on-arrival pins explicitly

---

**Total deviations:** 1 auto-fixed (1 instrument-conformance blocker) + 1 premise note. **Impact:** none on the plan's contract — every must-have holds; the fix makes a gate literal match the shipped mechanism without behavior change.

## Issues Encountered
- None beyond the known host quirks honored throughout: Node PATH prefixed on every vitest/commit invocation, commit trailers verified post-commit, watched gate literals never written into codeUtils.ts comments (observation #5165 hygiene), `.gsd/` evidence left untracked by convention.

## Threats Disposition (plan threat_model)
- **T-27-04 (Tampering via label breakout, mitigate):** mitigation now spans all 21 directive-emitting cases — the label is always quoted and double-quote-escaped, unknown params re-emit verbatim from parse and are never re-interpreted; pinned by the double-quote round-trip tests (person from 27-01, folder new this plan) and the count gate at 0.
- **T-27-SC (npm installs):** no packages installed; nothing to gate.
- No security-relevant surface beyond the plan's threat model (writer emission only — no endpoints, auth, storage, or schema changes; SVG still passes the existing DOMPurify gate downstream).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 27-03 (toolbar) starts from a complete writer: every SHAPES append and ShapePreview case it adds has a correct, escaped, param-preserving emission path already pinned behind it — the toolbar work is purely surface (SHAPES entries, previews, i18n keys, PropertiesPanel parity).
- Known clean state: no stubs, no skipped tests, all verify blocks executed for real; raw-template count gate 0 on the committed tree.
- The 27-04 autocomplete copy debt ("makes the visual editor read-only") remains the last user-facing text item, unchanged by this plan.

## Self-Check: PASSED

- Files verified on disk: src/lib/mermaid/codeUtils.ts, src/lib/mermaid/__tests__/codeUtils.test.ts, src/lib/mermaid/__tests__/directive-shape-render.test.ts (3/3 of files_modified).
- Commits verified in git log: 2ffc4bd, 85b3b05, a96d08c (3/3, parent chain on b9b6e96); every trailer verified post-commit.
- Final gates re-run on the committed tree: count gate 0; scoped runs 156 + 14 green; full suite 91 files / 1620 tests green (exit 0).
- The docs commit that contains this self-check is verified by invariant (staged via forced add; working tree clean of src/ changes afterwards), not by quoting its own hash.

---
*Phase: 27-shape-syntax-support-high-value-shape-set*
*Completed: 2026-10-07*
