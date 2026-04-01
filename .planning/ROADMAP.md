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
**Goal:** Revoir le visuel car c'est pas tres beau et professionnels, il faut que ce soit aussi optimal
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
**Goal:** Superseded by Phase 13
**Status:** Superseded
**Depends on:** Phase 11
**Plans:** Scope fully absorbed into Phase 13

## Phase 13 — Custom Mermaid themes from color palettes
**Goal:** Replace the 8-color palette system with a proper Mermaid-native theme system using ~20 core color slots and a derivation engine that mirrors Mermaid's internal Theme.updateColors() logic to produce ~200 themeVariables. Includes theme editor panel, DiagramColorsPanel refactor, and dual apply mechanism (app default + per-diagram frontmatter).
**Status:** Planned
**Depends on:** Phase 11 (supersedes Phase 12)
**Plans:** 4/4 plans complete
- [ ] [13-01-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-01-PLAN.md) — Theme types, derivation engine, preset themes, tests (Wave 1)
- [ ] [13-02-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-02-PLAN.md) — Theme editor sidebar panel with live preview (Wave 2)
- [ ] [13-03-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-03-PLAN.md) — DiagramColorsPanel refactor + full migration from palettes to themes (Wave 3)
- [ ] [13-04-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-04-PLAN.md) — App-level default theme persistence + dual apply wiring (Wave 4)

### Phase 1: With lighthouse, do a benchmark, and after we will try to refactoring the code to get better speed and more optimisation

**Goal:** Establish Lighthouse benchmark baseline and implement performance optimizations (code splitting, lazy loading, React memoization) to reduce bundle size and improve app speed
**Requirements:** N/A (performance optimization phase, no formal requirements)
**Depends on:** None
**Plans:** 3 plans (all complete)

Plans:
- [x] [01-01-PLAN.md](./phases/01-with-lighthouse-do-a-benchmark-and-after-we-will-try-to-refactoring-the-code-to-get-better-speed-and-more-optimisation/01-01-PLAN.md) — Lighthouse baseline + bundle visualizer (Wave 1)
- [x] [01-02-PLAN.md](./phases/01-with-lighthouse-do-a-benchmark-and-after-we-will-try-to-refactoring-the-code-to-get-better-speed-and-more-optimisation/01-02-PLAN.md) — Vite build optimization with manualChunks (Wave 2)
- [x] [01-03-PLAN.md](./phases/01-with-lighthouse-do-a-benchmark-and-after-we-will-try-to-refactoring-the-code-to-get-better-speed-and-more-optimisation/01-03-PLAN.md) — React render optimization with memo + lazy loading (Wave 3)

### Phase 2: Fix technical debt - split god classes, fix tests, improve coverage

**Goal:** Refactor App.tsx and AIPanel.tsx god classes into testable, focused modules while fixing broken tests and achieving meaningful test coverage (75% lines/functions, 70% branches)
**Requirements:** N/A (technical debt phase, no formal requirement mappings)
**Depends on:** Phase 1
**Plans:** 8/9 plans executed

**Wave Structure:**
- Wave 0: Fix test infrastructure (broken mocks, act warnings, missing dependencies)
- Wave 1a: Characterization tests + useAppState hook extraction
- Wave 1b: useModalState hook extraction + App.tsx refactor
- Wave 2a: Characterization tests + useAIChat/useAISend extraction
- Wave 2b: useAISend tests + useAISettings extraction + AIPanel refactor
- Wave 3a: Enhanced coverage for providers, database, utils
- Wave 3b: E2E tests + Lighthouse CI + final coverage verification

Plans:
- [ ] [02-00-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-00-PLAN.md) — Fix test infrastructure and create shared fixtures (Wave 0)
- [ ] [02-01a-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-01a-PLAN.md) — Characterization tests + useAppState hook (Wave 1a)
- [ ] [02-01b-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-01b-PLAN.md) — useModalState hook + App.tsx refactor (Wave 1b)
- [ ] [02-02a-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-02a-PLAN.md) — Characterization tests + useAIChat/useAISend (Wave 2a)
- [ ] [02-02b-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-02b-PLAN.md) — useAISend tests + useAISettings + AIPanel refactor (Wave 2b)
- [ ] [02-03a-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-03a-PLAN.md) — Enhanced coverage for critical paths (Wave 3a)
- [ ] [02-03b-PLAN.md](./phases/02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage/02-03b-PLAN.md) — E2E tests + Lighthouse CI + coverage verification (Wave 3b)
