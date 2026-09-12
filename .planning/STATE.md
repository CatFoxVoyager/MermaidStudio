---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Migration Mermaid 12
current_phase: 21
current_phase_name: Upgrade & Compatibility
status: executing
stopped_at: ROADMAP.md written (Phases 21-24), STATE.md reset for v1.3, REQUIREMENTS.md traceability updated
last_updated: "2026-09-12T22:04:07.784Z"
last_activity: 2026-09-12
last_activity_desc: Phase 21 execution started
state_head: 6bf7e8ea3aa18d55b14253fbc6154fea7f333118
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
  percent: 0
---

# STATE: MermaidStudio

**Last Updated:** 2026-09-12
**Last Session:** 2026-09-12T22:04:07.770Z
**Stopped At:** Completed 21-02-PLAN.md
**Current Phase:** 21
**Progress:** [░░░░░░░░░░] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core Value:** Users prefer MermaidStudio over Mermaid Live Editor because of its polished interface, AI assistance, and better editing experience.

**Current Focus:** Phase 21 — Upgrade & Compatibility

**Key Constraints:**

- React + TypeScript + Vite; static hosting only (Vercel/Docker/GH Pages)
- Mermaid pinned to exact 12.0.0 (no floating range; no 12.0.x point releases exist yet)
- Zero user-facing regression is the milestone goal — v11 defaults (dagre/classic) pinned in `doInit()`
- Strict scope: mermaid 12 is the only major bump (TS 7 / Vitest 5 / jsdom 30 deferred)
- 0.6.0 release (bump + tag) remains user-owned post-UAT, tracked in CHANGELOG.md

## Current Position

Milestone: v1.3 Migration Mermaid 12 (Phases 21-24)
Phase: 21 (Upgrade & Compatibility) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-09-12 — Phase 21 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed (this milestone): 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21 | 0 | — | — |
| 22 | 0 | — | — |
| 23 | 0 | — | — |
| 24 | 0 | — | — |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 21 P21-01 | 14min | 3 tasks | 3 files |
| Phase 21 P21-02 | 24min | 3 tasks | 4 files |

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

### Roadmap Evolution

- Milestone v1.3 started (2026-09-12): Migration Mermaid 12 — Phases 21-24 (Upgrade & Compatibility → SVG Pipeline Verification → Themes/Config/Layout → Diagram-Type Sweep & Full Verification), 21 requirements (UPG/PIPE/THM/DIA/VAL), verification-weighted structure

### Pending Todos

None yet.

### Blockers/Concerns

- Early-adopter risk: mermaid 12.0.0 is 2 days old — zero community post-mortems, no point releases. Mitigation: exact pin + documented revert path (VAL-03, Phase 24)
- Whether v12 reports absolute error lines (decides the manual frontmatter offset's fate) is empirical — resolved in Phase 22 (PIPE-04)
- `elk.stress` survival under bundled ELK is MEDIUM confidence — runtime check in Phase 23 (THM-04)

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Mermaid 12 follow-up | FR-01: redux-color/neo opt-in "modern look" | Deferred | 2026-09-12 | v2 |
| Mermaid 12 follow-up | FR-02: ELK as default layout / picker expansion | Deferred | 2026-09-12 | v2 |
| Mermaid 12 follow-up | FR-03: dynamic `import('mermaid')` for pre-ES2024 degradation | Deferred | 2026-09-12 | v2 |
| Mermaid 12 follow-up | FR-04: agentflow diagram type support | Deferred | 2026-09-12 | v2 |
| Release | 0.6.0 version bump + v0.6.0 tag | User-owned post-UAT | 2026-07-02 | post-v1.2 |

## Session Continuity

Last session: 2026-09-12
Stopped at: ROADMAP.md written (Phases 21-24), STATE.md reset for v1.3, REQUIREMENTS.md traceability updated
Resume file: None

**If returning after break:**

1. Review current phase status in this STATE.md
2. Check ROADMAP.md for phase success criteria
3. Review REQUIREMENTS.md traceability table
4. Run `/gsd-plan-phase 21`

**Quick Links:**

- Roadmap: `.planning/ROADMAP.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Research: `.planning/research/SUMMARY.md`
- Project context: `.planning/PROJECT.md`

---
*State initialized for milestone v1.3: 2026-09-12*
