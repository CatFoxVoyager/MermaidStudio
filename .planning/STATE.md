---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Migration Mermaid 12
current_phase: 21
current_phase_name: upgrade-compatibility
status: executing
stopped_at: ROADMAP.md written (Phases 21-24), STATE.md reset for v1.3, REQUIREMENTS.md traceability updated
last_updated: "2026-09-12T13:38:48.159Z"
last_activity: 2026-09-12
last_activity_desc: v1.3 roadmap created
state_head: e3c54b93fca12c1dca64d2c7332aef8e7ba8c078
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 3
  completed_plans: 0
  percent: 0
---

# STATE: MermaidStudio

**Last Updated:** 2026-09-12
**Last Session:** 2026-09-12 — v1.3 roadmap created
**Stopped At:** Roadmap created for milestone v1.3 (Phases 21-24); ready to plan Phase 21
**Current Phase:** 21
**Progress:** [░░░░░░░░░░] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core Value:** Users prefer MermaidStudio over Mermaid Live Editor because of its polished interface, AI assistance, and better editing experience.

**Current Focus:** Phase 21 — Upgrade & Compatibility (mermaid 11.17.2 → pinned 12.0.0)

**Key Constraints:**

- React + TypeScript + Vite; static hosting only (Vercel/Docker/GH Pages)
- Mermaid pinned to exact 12.0.0 (no floating range; no 12.0.x point releases exist yet)
- Zero user-facing regression is the milestone goal — v11 defaults (dagre/classic) pinned in `doInit()`
- Strict scope: mermaid 12 is the only major bump (TS 7 / Vitest 5 / jsdom 30 deferred)
- 0.6.0 release (bump + tag) remains user-owned post-UAT, tracked in CHANGELOG.md

## Current Position

Milestone: v1.3 Migration Mermaid 12 (Phases 21-24)
Phase: 21 (upgrade-compatibility) — READY TO EXECUTE
Plan: — (not yet planned)
Status: Ready to execute
Last activity: 2026-09-12 — v1.3 roadmap created

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- Milestone scope (2026-09-12): `@mermaid-js/layout-elk` is REMOVED, not bumped — mermaid 12 bundles + auto-registers ELK; keeping ^1.0.0 would ship ELK twice (~+500 kB gz). Recorded deviation from the original milestone letter
- mermaid pinned to exact 12.0.0; 12.0.x bumps deferred until point releases exist (VAL-03 tracks them)
- PIPE-01 golden fixtures MUST be captured on v11 before the dependency flip lands — first plan of Phase 21
- Adoption of mermaid 12's new defaults (ELK layout, redux-color/neo) is out of scope — Future items FR-01/FR-02

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
