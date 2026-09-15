---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Migration Mermaid 12
current_phase: 24
status: Awaiting next milestone
stopped_at: Phase 24 complete — all phases complete
last_updated: "2026-09-15T00:55:14.051Z"
last_activity: 2026-09-14
last_activity_desc: Milestone v1.3 completed and archived
state_head: 3345b6eec953cc51ba862a23af904587bfbf584e
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 16
  completed_plans: 16
  percent: 100
current_phase_name: Diagram-Type Sweep & Full Verification
---

# STATE: MermaidStudio

**Last Updated:** 2026-09-14
**Last Session:** 2026-09-14T20:31:05.834Z
**Stopped At:** Phase 24 complete — all 4 phases of v1.3 complete (milestone end: task #22 version bump, then audit/complete/cleanup)
**Current Phase:** 24 (complete)
**Progress:** [████████████] 100%

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-14)

**Core Value:** Users prefer MermaidStudio over Mermaid Live Editor because of its polished interface, AI assistance, and better editing experience.

**Current Focus:** Phase 24 — Diagram-Type Sweep & Full Verification

**Key Constraints:**

- React + TypeScript + Vite; static hosting only (Vercel/Docker/GH Pages)
- Mermaid pinned to exact 12.0.0 (no floating range; no 12.0.x point releases exist yet)
- Zero user-facing regression is the milestone goal — v11 defaults (dagre/classic) pinned in `doInit()`
- Strict scope: mermaid 12 is the only major bump (TS 7 / Vitest 5 / jsdom 30 deferred)
- 0.6.0 release (bump + tag) remains user-owned post-UAT, tracked in CHANGELOG.md

## Current Position

Phase: Milestone v1.3 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-09-14 — Milestone v1.3 completed and archived

## Performance Metrics

**Velocity:**

- Total plans completed (this milestone): 7 (Phase 21 : 3, Phase 22 : 4 — dont 1 gap closure)
- Average duration: ~31min
- Total execution time: ~92min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21 | 3 | 92min | ~31min |
| 22 | 4 | - | - |
| 23 | 4 | - | - |
| 24 | 5 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 21 P21-01 | 14min | 3 tasks | 3 files |
| Phase 21 P21-02 | 24min | 3 tasks | 4 files |
| Phase 21 P21-03 | 54min | 3 tasks | 3 files |
| Phase 22 P01 | 10min | 3 tasks | 2 files |
| Phase 22 P02 | 22min | 3 tasks | 3 files |
| Phase 22 P03 | 27min | 3 tasks | 1 files |
| Phase 24 P01 | 17min | 3 tasks | 8 files |
| Phase 24 P04 | 17min | 2 tasks | 4 files |
| Phase 24 P05 | ~7h (2 sessions) | 3 tasks | 14 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- Milestone scope (2026-09-12): `@mermaid-js/layout-elk` is REMOVED, not bumped — mermaid 12 bundles + auto-registers ELK; keeping ^1.0.0 would ship ELK twice (~+500 kB gz). Recorded deviation from the original milestone letter
- mermaid pinned to exact 12.0.0; 12.0.x bumps deferred until point releases exist (VAL-03 tracks them)
- PIPE-01 golden fixtures MUST be captured on v11 before the dependency flip lands — first plan of Phase 21
- Adoption of mermaid 12's new defaults (ELK layout, redux-color/neo) is out of scope — Future items FR-01/FR-02
- [Phase 21]: PIPE-01 golden baseline captured on v11 before the flip; rect.background family documented as not-emitted (asserting the observed 0 would false-fail a benign future emission) — PIPE-01 golden baseline captured on v11 before the flip; rect.background family documented as not-emitted (asserting the observed 0 would false-fail a benign future emission)
- [Phase 21]: Capture correctness: every golden expected value observed from a real 11.17.2 render before being asserted; .root order recorded but not asserted — Capture correctness: every golden expected value observed from a real 11.17.2 render before being asserted; .root order recorded but not asserted
- [Phase 21]: mermaid flipped to exact 12.0.0 in atomic commit (manifest+lockfile+core.ts, bf3658e) — git revert restores the 11.17.2 + 0.2.3 known-good pair (VAL-03)
- [Phase 21]: ELK lazy boundary preserved via manualChunks fall-through guard (mermaid-internal elk-*.mjs adapters + elkjs engine package); mermaid-core carries zero ELK content, verified by org.eclipse.elk marker greps
- [Phase 21]: User approved mermaid 12.0.0 package-legitimacy checkpoint (blocking-human, never auto-approved): official org, no install scripts, early-adopter risk accepted with VAL-03 revert path
- [Phase 21]: 21-03: CDN embed exact-pinned to mermaid@12.0.0 (not floating @12) with live-recomputed sha384 SRI; user confirmation queued as end-of-phase UAT
- [Phase 21]: Windows host invariant: run vitest only from canonical-drive-case cwd (D:/code/mermaidstudio) — lowercase-drive cwd silently un-mocks every alias vi.mock (registry key case mismatch)
- [Phase 21]: Code review loop (3 itérations, convergé clean) : source de vérité unique CDN version+SRI (`src/constants/cdnEmbed.ts`, test recalculant le sha384), oklchToHex réécrit en pipeline CSS Color 4 (OKLab→sRGB correct), guards CI bloquants `check:elk` + `check:cdn-embed` dans le build job
- [Phase 21]: UAT fin de phase (2026-09-13) : exact-pin + lecture UPG-04 (+22,9 % mermaid-core = surface v12 organique, 0 marqueur ELK) + 4 prohibitions ADR-550 D4 ratifiés en bloc ; items navigateur/CI restent tracés user-owned (21-UAT.md)
- [Phase 21]: Security gate verified : 5/5 menaces CLOSED (threats_open: 0, ASVS L1) ; risques acceptés AR-21-01 (foreignObject CR-008, tracé CONCERNS.md) + AR-21-02 (matrix CI en réduction seule)
- [Phase 22]: D8 KEEP locked on v12: frontmatter errors report the true editor line via the existing offset (test-locked, core.ts untouched) — v12 reports body-relative lines; offset produces the line the user wrote; D8 prohibition (no blind adjustment) honored
- [Phase 22]: D9 KEEP-with-extension: renderDiagram catch block removes both the error svg and the d{safeId} container div mermaid 12 leaves on failure — v12 only self-cleans on the success path and surfaces pass unique per-render ids; closes one-div-per-failed-render accumulation; locked by D9/D10 tests
- [Phase 22]: A4 resolved to adjusted-arithmetic: v12 sequence parse errors carry body-relative line references, so the offset fires (2+3=5) — locked by test — Observed empirically 2026-09-13 via temporary probe (deleted); one deterministic outcome encoded with in-source observation comment
- [Phase 22]: D3 resolved by evidence, pipeline untouched: v12 natural .root order (clusters, edgePaths, edgeLabels, nodes) identical to v11 and now asserted; pipeline-enforced order (clusters, nodes, edgePaths, edgeLabels) locked by tests — reorder proven non-dead on v12; svgPostProcessing.ts unchanged — D1/D3 verdict from research held on re-run: all pipeline selectors match v12 output; the order lock (D3 test requirement) proves the reorder does real work without any source edit
- [Phase 22]: Idempotency probe answered NEGATIVE and surfaced: postProcessDiagramSvg is deterministic but not byte-idempotent (whitespace-only growth per re-application, +1 space per styled edge path, unreachable at runtime); locked as whitespace-insensitive equality; separator-safe cleanup fix deferred to phase ownership (recorded in tests/goldens/README.md) — Plan proof-and-lock charter fences pipeline source edits; drift is whitespace-only and unreachable at runtime (all five surfaces feed raw render output exactly once per render); the fix is a conscious pipeline change deferred with a README record
- [Phase 22]: v12 golden provenance: doubled edge-path class prefix documented as cosmetic observed-and-NOT-asserted; rect.background still 0 under htmlLabels:true (fallback chain remains a no-op); D1/D3 verdict zero broken selectors, zero dead pipeline code — Plan prohibition: asserting cosmetics manufactures false failures on upstream cleanup; the rect.background rationale carries over from v11 (htmlLabels branch emits no label rects)
- [Phase 22]: Pixel re-baseline resolved to re-run + classify + record (D5): no committed pixel baselines exist (visual/* is gitignored scratch) and no v11-era captures remain on this host; the durable PIPE-03 artifact is the changelog-cited classification record in tests/goldens/README.md (26 fresh chromium captures stay local-only) — Research A5 anticipated the degeneration; the D5 scope open question is resolved generously — all 24 visual spec files re-run, the 21 pipeline-relevant ones classified, the 3 helpers documented out-of-scope with rationale
- [Phase 22]: Both observed label font-size diffs (linkStyle camelCase fontSize not reaching edge labels) classified PRE-EXISTING app behavior, NOT v12 deltas: parseEdgeStyleValue in codeUtils.ts recognizes kebab-case keys only — identical code path under v11; 0 UNEXPLAINED diffs, 0 promotion triggers (D6/D7 hold) — Root cause read from the app source (not the changelog); cross-checked against the green structural goldens from Plan 22-02 and sibling specs covering the same fill-isolation subject (all passing in the same run)
- [Phase 22]: Diagnostic E2E runs must serve HTTP: with .cert/cert.pem present the dev server speaks HTTPS and playwright's committed http://localhost:5173 URL check can neither detect nor reach it; cert was temporarily set aside for the run and restored after (recorded in tests/goldens/README.md) — playwright.config.ts is a committed file this plan may not modify; the temporary cert rename is git-invisible (.cert/ gitignored) and was reverted after the run — the README now carries the re-derivation recipe
- [Phase 23]: Deliverable = lock-in suite (6 test files, 3497 lines + shared fixture): theme matrix 192-cell grid, derivation exact-hex anchors, frontmatter round-trip + 4-level precedence, layout engines — all wired to real production surfaces (renderDiagram/deriveThemeVariables/applyStyleToContent/parseFrontmatter), never mocks; independently re-executed 362/362 + full 10-file D16 gate 432/432 in 219.23s
- [Phase 23]: themeDerivation.ts stays byte-untouched; v11 hex locked as a priori deviations (signalColor←lineColor, edgeLabelBackground←background) — any future engine alignment toward v12 updateColors fails the suite by design
- [Phase 23]: elk.stress RESOLVES under mermaid 12 bundled ELK — locked with fallback-proof discrimination (stress geometry ≠ dagre AND ≠ elk, no not-registered warn); write path applyStyleToContent → frontmatter.config.layout verified for all three engines
- [Phase 23]: WR-03/WR-04 production parse repairs in codeUtils.ts (regex tail `\}\)%%`→`\}%%`, terminator `endsWith('%%')`→`includes('}%%')`, commits cca94fb+7aac26d) ratified by user sign-off via AskUserQuestion 2026-09-14 — flag retired, recorded in 23-UAT.md
- [Phase 23]: Toast disjunction closed on RESOLVES (D12 honored): all six Task-3 paths byte-untouched in phase diff, useToast type union unchanged, elkStressFallback i18n key absent — the conditional toast was never needed because elk.stress resolves
- [Phase 24 — Diagram-Type Sweep & Full Verification]: usecase adopted via verified v12 trigger keyword usecase-beta (content) vs usecaseDiagram (internal union label only); research candidate fixture grammar-corrected by probe before locking
- [Phase 24 — Diagram-Type Sweep & Full Verification]: themeDerivation byte-untouched constraint refined: one compiler-forced DIAGRAM_TYPE_VARIABLES.usecaseDiagram entry, engine/formulas untouched; Phase 23 exact-hex locks 239/239 green as zero-drift proof
- [Phase 24 — Diagram-Type Sweep & Full Verification]: 24-04: jsdom getComputedTextLength gap (timeline/architecture/c4) enabled via a suite-local polyfill mirroring the repo getBBox precedent — all 42 render cells lock a REAL render; global vitest.setup.ts untouched
- [Phase 24 — Diagram-Type Sweep & Full Verification]: 24-04: zenuml locked as the single expectedError cell ANTI-VACUOUSLY (passes only while the documented failure occurs) — documented pre-existing acceptance in tests/goldens/README.md
- [Phase 24 — Diagram-Type Sweep & Full Verification]: 24-04: capture spec left uncommitted — tests/e2e/tests/visual/ is a gitignored local-only diagnostic directory (Phase 22 D7 precedent); 22 PNGs stay local-only
- [Phase 24 — Diagram-Type Sweep & Full Verification]: 24-04: fixture provenance priority Phase 23 matrix > template bodies > 24-01 canonical usecase fixture; shared SWEEP_FIXTURES module feeds BOTH the jsdom lock and the capture spec
- [Phase 24 — Diagram-Type Sweep & Full Verification]: Welcome/release-notes modal opens on UPDATES only (Rule 4 option B user-ratified): fresh install = seen current version; 0.8.0 bump still nags 0.6.0 users
- [Phase 24 — Diagram-Type Sweep & Full Verification]: VAL-02 firefox in-suite failures classified D2 load-timing flakes: isolation greens at --workers=1 + disjoint failure sets across runs; no product defect
- [Phase 24 — Diagram-Type Sweep & Full Verification]: Vitest 4: top-level maxWorkers 8 + 900s one-shot wrapper (cold wall ~796s parallelism-independent); poolOptions silently ignored

### Roadmap Evolution

- Milestone v1.3 started (2026-09-12): Migration Mermaid 12 — Phases 21-24 (Upgrade & Compatibility → SVG Pipeline Verification → Themes/Config/Layout → Diagram-Type Sweep & Full Verification), 21 requirements (UPG/PIPE/THM/DIA/VAL), verification-weighted structure

### Pending Todos

None yet.

### Blockers/Concerns

- Early-adopter risk: mermaid 12.0.0 is 2 days old — zero community post-mortems, no point releases. Mitigation: exact pin + documented revert path (VAL-03, Phase 24)
- Whether v12 reports absolute error lines (decides the manual frontmatter offset's fate) is empirical — resolved in Phase 22 (PIPE-04)
- Browser-level (non-jsdom) rendering confirmation of theme/layout behavior — RESOLVED in Phase 24 (E2E ×3 matrix green: chromium 99/99, webkit 97/97, firefox 99/99 effective; ratifications recorded in 24-VERIFICATION.md)
- VAL-02 welcome-modal interception (200/369 E2E failing) — RESOLVED 2026-09-14: Rule 4 checkpoint user-ratified option B (modal opens on upgrades only, 1b4a5d6 + App.welcomeModal.test.tsx 3 locks); E2E suite green across all 3 browsers. Remaining tracked item: add a CI E2E job (deferred-items.md item 2, user decision 2026-09-14 = track for next milestone)

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| deferred_items | 02/deferred-items.md: 1. AppLayout.test.tsx - Missing Test IDs (3 tests; missing data-testid) | acknowledged | 2026-09-14 | v1.3 |
| deferred_items | 02/deferred-items.md: 2. database.test.ts - Base Theme Frontmatter Expectation (2 tests; stale expectations) | acknowledged | 2026-09-14 | v1.3 |
| verification_gaps | 11/11-VERIFICATION.md | gaps_found | 2026-09-14 | v1.3 |
| verification_gaps | 02/02-VERIFICATION.md | gaps_found | 2026-09-14 | v1.3 |
| uat_gaps | 22/22-UAT.md | testing | 2026-09-14 | v1.3 |
| uat_gaps | 21/21-UAT.md | testing | 2026-09-14 | v1.3 |
| quick_tasks | diagram-styling-by-type | missing | 2026-09-14 | v1.3 |
| quick_tasks | 260414-d1i-integrate-custom-finetuned-qwen3-onnx-mo | missing | 2026-09-14 | v1.3 |
| quick_tasks | 260407-9g8-add-open-source-footer-with-github-link- | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260406-gpt-recreate-png-export-from-scratch-using-a | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260406-bly-fix-png-export-output-file-is-empty-tran | missing | 2026-09-14 | v1.3 |
| quick_tasks | 260405-h6o-detect-theme-directives-in-pasted-mermai | missing | 2026-09-14 | v1.3 |
| quick_tasks | 260405-cg1-check-templates-with-advanced-styling | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260330-iom-fix-security-issues-from-analysis | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260328-34y-create-real-themes-with-proper-color-sch | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260327-qfx-fix-theme-system-apply-themes-at-render- | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260327-iwh-add-all-missing-mermaid-flowchart-featur | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260327-c50-audit-all-mermaid-diagram-types-styling- | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260327-b1e-support-diagram-colors-for-non-classdef- | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 260325-lyf-move-node-color-picker-to-main-previewpa | unknown | 2026-09-14 | v1.3 |
| quick_tasks | 1-fix-technical-debt-and-setup-pre-commit- | unknown | 2026-09-14 | v1.3 |
| Mermaid 12 follow-up | FR-01: redux-color/neo opt-in "modern look" | Deferred | 2026-09-12 | v2 |
| Mermaid 12 follow-up | FR-02: ELK as default layout / picker expansion | Deferred | 2026-09-12 | v2 |
| Mermaid 12 follow-up | FR-03: dynamic `import('mermaid')` for pre-ES2024 degradation | Deferred | 2026-09-12 | v2 |
| Mermaid 12 follow-up | FR-04: agentflow diagram type support | Deferred | 2026-09-12 | v2 |
| Release | 0.6.0 version bump + v0.6.0 tag | User-owned post-UAT | 2026-07-02 | post-v1.2 |

## Session Continuity

Last session: 2026-09-14
Stopped at: Milestone v1.3 complete and archived (tag pending user)
Resume file: None

**If returning after break:**

1. Review current state in this STATE.md
2. Check `.planning/MILESTONES.md` for the v1.3 record
3. Review `.planning/PROJECT.md` Next Milestone Goals (candidates)
4. Run `/gsd-new-milestone`

**Quick Links:**

- Roadmap: `.planning/ROADMAP.md`
- Milestones: `.planning/MILESTONES.md`
- Research: `.planning/research/SUMMARY.md`
- Project context: `.planning/PROJECT.md`

---
*State initialized for milestone v1.3: 2026-09-12*

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
