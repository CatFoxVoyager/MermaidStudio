# Roadmap: MermaidStudio v1.0

## Phase 06 — Refactoring
**Goal:** Reorganize codebase structure (services, lib, types, modals, constants)
**Status:** Complete
**Depends on:** Phases 01-05 (pre-existing)

## Phase 07 — Security Fixes
**Goal:** Fix all security issues identified in code analysis
**Status:** Complete
**Depends on:** Phase 06

## Phase 08 — Technical Debt Remediation
**Goal:** Fix build infrastructure, TypeScript errors, ESLint issues, App.tsx refactoring
**Status:** Complete
**Depends on:** Phase 07

## Phase 09 — E2E Test Fixes
**Goal:** Fix e2e test failures (theme toggle, CodeMirror input, error detection, accessibility headings)
**Status:** Complete
**Depends on:** Phase 08

## Phase 10 — Visual Polish
**Goal:** Revoir le visuel car c'est pas très beau et professionnels, il faut que ce soit aussi optimal
**Status:** In progress
**Depends on:** Phase 09
**Plans:**
- [10-01](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-01-PLAN.md)
- [10-02](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-02-PLAN.md)
- [10-03](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-03-PLAN.md)
- [10-04](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-04-PLAN.md)

## Phase 11 — Node Style Editing in Preview
**Goal:** Replace floating fill-color popup with comprehensive slide-in style editing panel matching Mermaid Live Editor capabilities (fill, stroke, border width, border style, text color, font properties, border radius, multi-node selection, auto-resync, code editor highlighting)
**Status:** Ready
**Depends on:** Phase 10
**Plans:** 4/5 plans executed
- [ ] [11-01-PLAN.md](./phases/11-node-style-editing-in-preview/11-01-PLAN.md) — Extend NodeStyle type, fix parseStyleValue/styleToString, add removeNodeStyles
- [ ] [11-02-PLAN.md](./phases/11-node-style-editing-in-preview/11-02-PLAN.md) — Build NodeStylePanel slide-in component with two-tier property display
- [ ] [11-03-PLAN.md](./phases/11-node-style-editing-in-preview/11-03-PLAN.md) — Integrate NodeStylePanel into PreviewPanel (replace old popup, multi-select, auto-resync)
- [ ] [11-04-PLAN.md](./phases/11-node-style-editing-in-preview/11-04-PLAN.md) — CodeEditor forwardRef API for line highlighting, WorkspacePanel wiring
- [ ] [11-05-PLAN.md](./phases/11-node-style-editing-in-preview/11-05-PLAN.md) — Manual verification checkpoint

## Phase 12 — Refonte du systeme de palettes et themes Mermaid - migration vers des fichiers theme natifs
**Goal:** [To be planned]
**Status:** Ready
**Depends on:** Phase 11
**Plans:** 0 plans
