---
phase: 27-shape-syntax-support-high-value-shape-set
plan: 03
subsystem: mermaid-visual-editor
tags: [react, toolbar, svg-previews, i18n, vitest, tdd, mermaid]

requires:
  - phase: 27-shape-syntax-support-high-value-shape-set (plan 02)
    provides: the complete 12-shape writer surface — every toolbar emit path this plan exposes has a correct, escaped, param-preserving case behind it
  - phase: 26-double-circle-shape-legacy-syntax
    provides: the ShapeToolbar.test.tsx file, its i18n mock pattern, and the measured jsdom notes (popover copy accessible, measurer copy aria-hidden) this plan's tests reuse
provides:
  - 26-entry toolbar SHAPES surface (13 original + dbl-circ + the 12 new) feeding the adaptive visibleCount/More-popover layout unchanged
  - 12 distinct ShapePreview line-art cases (person bust, delay D-shape, sl-rect sloped, div-rect divided, folder, datastore drum, cloud, browser window, bolt, tri, hourglass, wavy-bottom doc) preempting the default-rect fallback
  - 24 i18n keys (12 per locale) in the NESTED visual.shapes block, camelCase; doc newly toolbar-reachable
  - 12 SHAPE_OPTIONS entries so the properties-panel shape select resolves every new node
  - 26-button component suite: 2-structural-copy assertions, pairwise-unique-markup sweep, three research-named confusion pins
affects: [plan 27-04 (autocomplete copy), /gsd-verify-work (designated manual preview-quality check), visual editor UX]

tech-stack:
  added: []
  patterns:
    - "Anti-fallback net: pairwise-unique svg-markup Set over every toolbar preview — a switch case missing from ShapePreview duplicates the default-rect markup and shrinks the set, so the fallback can never ship silently"

key-files:
  created: []
  modified:
    - src/components/visual/ShapeToolbar.tsx
    - src/components/visual/__tests__/ShapeToolbar.test.tsx
    - src/components/visual/PropertiesPanel.tsx
    - src/i18n/locales/en.json
    - src/i18n/locales/fr.json

key-decisions:
  - "Task 1 landed the SHAPES entries + i18n keys before Task 2's assertions, so the 12 per-shape render assertions and the 3 confusion pins arrived green-on-arrival in the RED run and stay as permanent contract pins (27-02 precedent); the genuine RED was the uniqueness sweep (14 vs 26)"
  - "The plan's 'getAllByRole finds exactly 2 instances per shape' literal was implemented on the measured DOM shape Phase 26 pinned in this same file: exactly 2 STRUCTURAL copies (popover + hidden measurer, title query) and exactly 1 ACCESSIBLE instance (role query — the measurer is aria-hidden and visibility:hidden)"
  - "Preview geometry used the research's implementation freedom; distinctness is enforced mechanically (Set size 26 + three named pins), and the aesthetic call is routed to 27-VALIDATION's designated manual check rather than silently skipped"

requirements-completed: []

coverage:
  - id: D1
    description: "The toolbar exposes all 26 shapes — 12 new SHAPES entries with camelCase labelKeys after dbl-circ, adaptive layout untouched"
    verification:
      - kind: other
        ref: "command: for k in person delay slRect divRect folder datastore cloud browser bolt tri hourglass doc; grep labelKey: 'visual.shapes.$k' — 12/12 present, entry count 26"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/ShapeToolbar.test.tsx#renders the <key> entry with a resolved label on both structural copies (it.each, 12 rows)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both locales carry the 12 new keys inside the nested visual.shapes block only (en: Person..Document; fr: Personne..Document); the flat shapes namespace untouched"
    verification:
      - kind: other
        ref: "command: windowed (55-95) key loop over en.json and fr.json — 12/12 in both, exits 0; node JSON.parse on both files passes"
        status: pass
    human_judgment: false
  - id: D3
    description: "The properties-panel shape select resolves every new node — SHAPE_OPTIONS carries the 12 values"
    verification:
      - kind: other
        ref: "command: for k in person delay sl-rect div-rect folder datastore cloud browser bolt tri hourglass doc; grep value: '$k' in PropertiesPanel.tsx — 12/12 present"
        status: pass
    human_judgment: false
  - id: D4
    description: "Structural preview distinctness: no new case falls through to the default rect — all 26 previews render pairwise-unique svg markup and the three research-named confusion pairs are markup-unequal"
    verification:
      - kind: unit
        ref: "tests/src/components/visual/__tests__/ShapeToolbar.test.tsx#renders all 26 shape previews with pairwise-unique svg markup (no default-rect fallback)"
        status: pass
      - kind: unit
        ref: "tests/src/components/visual/__tests__/ShapeToolbar.test.tsx#differentiates the three research-named confusion pairs in svg markup"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual quality of the 12 new thumbnails at 100% (recognizability; distinctness of slRect vs parallelogram, datastore vs cylinder, tri vs flag) — the phase's designated manual/browser check"
    verification: []
    human_judgment: true
    rationale: "27-VALIDATION.md routes thumbnail aesthetics to a human glance at verify-work; jsdom can pin distinct markup but not visual recognizability (27-RESEARCH A2: geometry is implementation freedom, quality is the manual gate)"
  - id: D6
    description: "No regressions: scoped toolbar suite 17/17 and the full unit suite green at wave close"
    verification:
      - kind: unit
        ref: "command: npx vitest run — 91 files, 1634 tests passed, exit 0 (27-02 baseline 1620 + 14 new)"
        status: pass
    human_judgment: false

# Metrics
duration: 14min
completed: 2026-10-07
status: complete
actuals:
  tokens: 2933        # chars/4 over the realized diff (5 files, +158/-2, 11735 chars)
  tasks: 2
  commits: 3          # measured: git rev-list --count ca3e3da..76ebd0c
plan_head_before: ca3e3da26528b57d36950b4080cdacad735ae3de
plan_head_after: 76ebd0c7f1208d120d7483c5c2c544637ef40ec6
---

# Phase 27 Plan 03: Toolbar surface for the 12-shape set Summary

**26-entry toolbar with 12 new distinct line-art previews, en/fr labels in the nested visual.shapes block (doc newly reachable), and properties-panel parity — previews pinned by a 26-markup uniqueness sweep plus three confusion pins; full suite 1634 green.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-10-07T19:21:43Z
- **Completed:** 2026-10-07T19:36:14Z
- **Tasks:** 2 (Task 2 tdd-rated: RED-first observed and evidence-recorded)
- **Files changed:** 5 (all modified; +158/-2)

## Accomplishments
- SHAPES grows 14 to 26 entries: person, delay, sl-rect, div-rect, folder, datastore, cloud, browser, bolt, tri, hourglass and doc join after dbl-circ — shape keys keep the mermaid hyphenation, labelKeys go camelCase per the slantAlt convention; the adaptive visibleCount/More-popover layout derives from SHAPES.length with zero structural change
- ShapePreview gains the 12 cases before the default branch, each on the shared 28×20 stroke-currentColor/1.5/fill-none contract: person bust, delay D-shape, sloped rect (vertical sides, sloped top+bottom), divided rect, folder with tab, open-top datastore drum, cloud outline, browser window with title bar and dot, bolt polygon, upward triangle, hourglass bowtie, wavy-bottom doc
- 24 i18n keys added to the NESTED visual.shapes block of both locales (en.json / fr.json now 26 shape keys each); the flat shapes namespace at :381/:384 untouched; fr wordings per research Q6 (Personne, Délai, Rect. incliné, Rect. divisé, Dossier, Base de données, Nuage, Navigateur, Éclair, Triangle, Sablier, Document)
- PropertiesPanel SHAPE_OPTIONS carries the 12 values so the shape select shows a selection for every new node shape
- Component suite grows 3 to 17 tests: 12 per-shape render assertions (two structural copies each — popover + hidden measurer; one accessible instance with the resolved localized label), the 26-markup pairwise-uniqueness sweep, and the three research-named confusion pins (Sloped rect ≠ Slant, Data store ≠ Cylinder, Triangle ≠ Flag)
- Wave close: full suite 91 files / 1634 tests green, exit 0 (27-02 baseline 1620 + 14 new)

## Task Commits

1. **Task 1 (auto): data surface — 12 SHAPES entries, 24 i18n keys, 12 panel options**
   - `7dd9c09` (feat): 4 files, +50/-2; all three structural gates green pre-commit (12/12 labelKeys, 12/12+12/12 windowed locale keys, 12/12 option values); both locale files JSON-parse verified
2. **Task 2 (auto, tdd): previews + component tests**
   - `f2f615a` (test) RED: the uniqueness sweep failed `expected 14 to be 26` — all 12 new shapes duplicated the default-rect markup; zero unrelated failures; evidence `.gsd/27-03-t2-red-evidence.json`
   - `76ebd0c` (feat) GREEN: the 12 preview cases; scoped suite 17/17, then full suite 1634 green

**Plan metadata:** the SUMMARY commit (docs, `git add -f` — .planning/ is gitignored) follows this file. No REFACTOR commit — the GREEN diff was already minimal (12 insertions).

## TDD Gate Compliance

RED ran before implementation: the plan's named anti-fallback instrument (pairwise-unique-markup sweep) failed on a planned-behavior assertion (Set size 14 vs 26 — the default-rect duplication, exactly the plan's "[RED today: 12 of 26 markups missing/duplicated]"), zero unrelated failures, zero unexpected reds. `gsd_run check tdd-red-evidence` is absent from the subagent shell PATH on this host (known #5244/#5246); RED was self-validated against the canonical INVALID_RED checklist and recorded at `.gsd/27-03-t2-red-evidence.json` (27-01/27-02 precedent). Fourteen plan behaviors arrived green in the RED run (see Deviations) — pinned, not counted as RED evidence.

## Decisions Made
- **Data-surface-before-tests:** Task 1's entries + the RED commit's mock keys make the per-shape assertions resolve; they pin the 2-copies + resolved-label contract permanently rather than serving as RED evidence.
- **Measured DOM shape over the plan's query-count literal:** the plan's "getAllByRole finds exactly 2 instances" was transcribed onto the two assertions Phase 26 measured in this same file — 2 structural copies (title query; popover + measurer) and 1 accessible instance (role query; the measurer is aria-hidden + visibility:hidden). Same net coverage, executable assertions.
- **Mechanical distinctness, human aesthetics:** geometry follows the research proposals but the binding checks are the Set-size-26 sweep and the three pins; the recognizability call is explicitly routed to the phase's manual check (D5), not silently skipped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Instrument adaptation] "getAllByRole finds exactly 2 instances per shape" is unmeetable in the measured jsdom DOM**
- **Found during:** Task 2 (RED authoring)
- **Issue:** the plan's behavior line describes a primary-row + hidden-measurer model where both copies are accessible; Phase 26's own committed test (which the plan mandates reusing) measured the opposite — the hidden measurer is aria-hidden + visibility:hidden so role queries see exactly ONE accessible copy per popover shape, and the second copy is only visible to title-attribute queries.
- **Fix:** the 2-instance assertion implemented on the structural title query (popover + measurer = exactly 2) and the accessible-name assertion on getAllByRole (exactly 1, textContent contains the label) — the plan's intent (both structural copies exist, label resolves) fully asserted with executable expectations.
- **Files modified:** src/components/visual/__tests__/ShapeToolbar.test.tsx (in commit f2f615a)
- **Verification:** scoped suite green post-GREEN; the plan's other RED driver (uniqueness sweep) genuinely failed as designed

**2. [Plan-premise note, no code change] Fourteen behaviors arrived green in the RED run**
- **Found during:** Task 2 (RED run)
- **Issue:** the 12 per-shape render assertions and the 3 confusion pins passed immediately — Task 1 had already landed the SHAPES entries, and the confusion pins compare the rect-fallback markup against three differently-shaped existing previews, so they hold before the real previews exist. The plan's "[RED today: 0 instances]" described the pre-Task-1/pre-mock state.
- **Fix:** none needed — kept as permanent contract pins (27-02's green-on-arrival precedent); the genuine RED (14 ≠ 26) drove the GREEN commit and is recorded in the evidence JSON.
- **Files modified:** none

---

**Total deviations:** 1 instrument adaptation + 1 premise note (no code fixes needed). **Impact:** none on the plan's contract — every must-have holds; the adaptation makes the plan's DOM claims executable against the a11y-tree behavior its own cited precedent measured.

## Issues Encountered
- None beyond the known host quirks honored throughout: Node PATH prefixed on every vitest/commit invocation, husky lint + type-check green on all three commits, trailers verified post-commit, and the plan's grep-gate literals never cited in watched-file comments (observation #5165 hygiene).

## Threats Disposition (plan threat_model)
- **T-27-05 (Tampering/XSS via preview SVG, accept with existing controls):** all 12 new cases are static JSX elements with hardcoded geometry — no user input interpolated, no dangerouslySetInnerHTML; they render inside the React tree like the 14 existing cases. Nothing to add.
- **T-27-SC (npm installs):** no packages installed; nothing to gate.
- No security-relevant surface beyond the plan's threat model (static catalogue data + previews; no endpoints, auth, storage, or schema changes).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 27-04 (autocomplete) is the phase's last plan: its work is the 5 missing SHAPE_NAMES entries (delay, sl-rect, div-rect, datastore, tri) and the stale "makes the visual editor read-only" detail copy.
- The 12 thumbnails' visual quality is queued for /gsd-verify-work as the phase's designated manual check (SUMMARY coverage D5) — slRect-vs-parallelogram, datastore-vs-cylinder, tri-vs-flag are the named calls.
- Known clean state: no stubs, no skipped tests, all verify blocks executed for real; working tree clean on 76ebd0c.

## Self-Check: PASSED

- Files verified on disk: src/components/visual/ShapeToolbar.tsx, src/components/visual/__tests__/ShapeToolbar.test.tsx, src/components/visual/PropertiesPanel.tsx, src/i18n/locales/en.json, src/i18n/locales/fr.json (5/5 of files_modified).
- Commits verified in git log: 7dd9c09, f2f615a, 76ebd0c (3/3, parent chain on ca3e3da); every trailer verified post-commit; each commit's stat line matches its intended file list exactly.
- Final gates re-run on the committed tree: three structural gates (12/12 labelKeys, 12/12 both locale windows, 12/12 panel options) all pass; scoped toolbar suite 17/17 (exit 0); full suite 91 files / 1634 tests (exit 0) on the identical tree content (tracked working tree clean).
- The docs commit that contains this self-check is verified by invariant (staged via forced add; tracked tree clean afterwards), not by quoting its own hash.

---
*Phase: 27-shape-syntax-support-high-value-shape-set*
*Completed: 2026-10-07*
