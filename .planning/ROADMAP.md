# Roadmap: MermaidStudio v1.0

## Phase 06: Refactoring

**Goal:** Reorganize codebase structure (services, lib, types, modals, constants)
**Status:** Complete
**Depends on:** Phases 01-05 (pre-existing)

## Phase 07: Security Fixes

**Goal:** Fix all security issues identified in code analysis
**Status:** Complete
**Depends on:** Phase 06

## Phase 08: Technical Debt Remediation

**Goal:** Fix build infrastructure, TypeScript errors, ESLint issues, App.tsx refactoring
**Status:** Complete
**Depends on:** Phase 07

## Phase 09: E2E Test Fixes

**Goal:** Fix e2e test failures (theme toggle, CodeMirror input, error detection, accessibility headings)
**Status:** Complete
**Depends on:** Phase 08

## Phase 10: Visual Polish

**Goal:** Revoir le visuel car c'est pas tres beau et professionnels, il faut que ce soit aussi optimal
**Status:** Complete
**Depends on:** Phase 09
**Plans:**

- [10-01](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-01-PLAN.md)
- [10-02](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-02-PLAN.md)
- [10-03](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-03-PLAN.md)
- [10-04](./phases/10-revoir-le-visuel-car-c-est-pas-tr-s-beau-et-professionnels-il-faut-que-ce-soit-aussi-optimal/10-04-PLAN.md)

## Phase 11: Node Style Editing in Preview

**Goal:** Replace floating fill-color popup with comprehensive slide-in style editing panel matching Mermaid Live Editor capabilities (fill, stroke, border width, border style, text color, font properties, border radius, multi-node selection, auto-resync, code editor highlighting)
**Status:** Ready
**Depends on:** Phase 10
**Plans:** 4/5 plans executed

- [ ] [11-01-PLAN.md](./phases/11-node-style-editing-in-preview/11-01-PLAN.md) — Extend NodeStyle type, fix parseStyleValue/styleToString, add removeNodeStyles
- [ ] [11-02-PLAN.md](./phases/11-node-style-editing-in-preview/11-02-PLAN.md) — Build NodeStylePanel slide-in component with two-tier property display
- [ ] [11-03-PLAN.md](./phases/11-node-style-editing-in-preview/11-03-PLAN.md) — Integrate NodeStylePanel into PreviewPanel (replace old popup, multi-select, auto-resync)
- [ ] [11-04-PLAN.md](./phases/11-node-style-editing-in-preview/11-04-PLAN.md) — CodeEditor forwardRef API for line highlighting, WorkspacePanel wiring
- [ ] [11-05-PLAN.md](./phases/11-node-style-editing-in-preview/11-05-PLAN.md) — Manual verification checkpoint

## Phase 12: Refonte du systeme de palettes et themes Mermaid - migration vers des fichiers theme natifs

**Goal:** Superseded by Phase 13
**Status:** Superseded
**Depends on:** Phase 11
**Plans:** Scope fully absorbed into Phase 13

## Phase 13: Custom Mermaid themes from color palettes

**Goal:** Replace the 8-color palette system with a proper Mermaid-native theme system using ~20 core color slots and a derivation engine that mirrors Mermaid's internal Theme.updateColors() logic to produce ~200 themeVariables. Includes theme editor panel, DiagramColorsPanel refactor, and dual apply mechanism (app default + per-diagram frontmatter).
**Status:** Planned
**Depends on:** Phase 10 (supersedes Phase 12)
**Parallel with:** Phase 11 (no file overlap — node styling is orthogonal to theming)
**Plans:** 4/4 plans complete

- [ ] [13-01-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-01-PLAN.md) — Theme types, derivation engine, preset themes, tests (Wave 1)
- [ ] [13-02-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-02-PLAN.md) — Theme editor sidebar panel with live preview (Wave 2)
- [ ] [13-03-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-03-PLAN.md) — DiagramColorsPanel refactor + full migration from palettes to themes (Wave 3)
- [ ] [13-04-PLAN.md](./phases/13-custom-mermaid-themes-from-color-palettes/13-04-PLAN.md) — App-level default theme persistence + dual apply wiring (Wave 4)

## Phase 01: AI Fix Diagram

**Goal:** Add AI-powered "Fix Diagram" feature that detects and fixes syntax, semantic, and style issues in Mermaid diagrams
**Status:** Complete ✅
**Depends on:** None
**Plans:** 1/1 executed

- [x] [PLAN.md](./phases/01-ai-fix-diagram/PLAN.md) — Full implementation: fix mode state, buildFixSystemPrompt, sendFixRequest, Fix Diagram button, app integration, i18n, E2E tests, documentation

**Completed:** 2026-04-10
**Release:** v0.5.0

---

# Milestone v1.1 — Mobile Responsive Design

**Goal:** Deliver a true smartphone mobile experience (dedicated layout) that activates automatically based on viewport (≤768px), while keeping the existing desktop mode entirely intact.
**Phases:** 5 (14-18, continuing from v1.0) | **Requirements:** 18/18 mapped ✓
**Paradigm:** Hybrid — minimal bottom nav (Files / Edit / AI) + segmented Code↔Preview toggle + slide-over drawers for panels.

## Phase 14: Mobile Foundation & Desktop Preservation

**Goal:** App safely detects mobile viewport and renders a dedicated layout, with zero change to the desktop experience.
**Status:** Complete
**Depends on:** Phase 13
**Requirements:** MFDN-01, MFDN-02, MFDN-03, MFDN-04
**Success Criteria:**

1. ✓ At ≤768px the app shows the mobile layout; at >768px it shows the existing desktop layout — no hybrid/broken intermediate state.
2. ✓ The app fills the visible area correctly as mobile browser chrome appears/disappears (dvh units) — no content hidden behind address/toolbar.
3. ✓ On notched devices, no content is obscured by the notch/speaker/home indicator (env() safe-area).
4. Overlays stack in the documented order (bottom nav < modals z-50 < drawers < toasts) — nothing hidden behind a peer.

*Cross-cutting guard: existing desktop view ≥768px is pixel/behaviorally unchanged.*
**Plans:** 3/3 plans complete
Plans:
**Wave 1**

- [x] 14-01-PLAN.md — useMediaQuery hook (useSyncExternalStore + desktop-default SSR snapshot, MFDN-01 detection primitive)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 14-02-PLAN.md — AppLayout top-level branch + MobileLayout scaffold + viewport-fit=cover + built-in h-dvh + per-zone @utility safe-* + centralized --z-* tokens (MFDN-01/02/03/04, keystone non-regression)

**Wave 3** *(complete)*

- [x] 14-03-PLAN.md — Playwright mobile-detection boundary spec at 768px (MFDN-01 empirical proof + desktop E2E non-regression gate)

## Phase 15: Mobile Shell

**Goal:** Users get a thumb-reachable mobile navigation chrome.
**Status:** Planned
**Depends on:** Phase 14
**Requirements:** MSHL-01, MSHL-02, MSHL-03
**Success Criteria:**

1. At 375px width the TopBar fits without truncation — brand visible, primary actions in an overflow menu.
2. A bottom nav (Files / Edit / AI) is thumb-reachable and switches the primary view.
3. Mobile navigation state is independent from desktop state — no cross-bleed on viewport change.
4. Tapping a bottom-nav destination shows exactly one active view immediately.

**Plans:** 4/4 plans complete

- [x] 15-01-PLAN.md
- [x] 15-02-PLAN.md
- [x] 15-03-PLAN.md
- [x] 15-04-PLAN.md

**Wave 1** *(parallel — no file overlap)*

- [x] [15-01-PLAN.md](./phases/15-mobile-shell/15-01-PLAN.md) — useMobileShell hook (non-persistent viewport-reset state, MSHL-03 keystone) + nav.* i18n keys (en/fr)
- [x] [15-03-PLAN.md](./phases/15-mobile-shell/15-03-PLAN.md) — MobileTopBar component (brand + New/Save + overflow trigger reusing CommandPalette, fits 375px, MSHL-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] [15-02-PLAN.md](./phases/15-mobile-shell/15-02-PLAN.md) — MobileBottomNav component (3 equal Files/Edit/AI slots, active indicator, tap handlers, MSHL-02)

**Wave 3** *(blocked on Waves 1+2)*

- [ ] [15-04-PLAN.md](./phases/15-mobile-shell/15-04-PLAN.md) — Integration: fill Phase 14 scaffold slots, remove placeholders, wire Modal position=right drawers (Sidebar/AIPanel) with mutual exclusion via useMobileShell + desktop non-regression guard

## Phase 16: Mobile Workspace

**Goal:** Users can edit code and view preview single-pane on mobile without losing context.
**Status:** Planned
**Depends on:** Phase 15
**Requirements:** MWRK-01, MWRK-02, MWRK-03
**Success Criteria:**

1. Below 600px, editor and preview are shown one at a time via a segmented Code↔Preview toggle (never a cramped horizontal split).
2. Switching Code→Preview and back returns to the same scroll position and selection.
3. Code and UI text stay legible at mobile sizes without manual zoom.
4. Editing in mobile toggle still updates the live preview correctly.

**Plans:** 2/2 plans complete

Plans:

- [ ] [16-01-PLAN.md](./phases/16-mobile-workspace/16-01-PLAN.md) — MobileWorkspace component + custom 600px breakpoint (Wave 1)
- [ ] [16-02-PLAN.md](./phases/16-mobile-workspace/16-02-PLAN.md) — Integration: wire MobileWorkspace into MobileLayout + AppLayout mobile prop pipeline (Wave 2)

## Phase 17: Mobile Drawers & Panels

**Goal:** Users access files, AI, and style tools via slide-over drawers on mobile.
**Status:** Planned
**Depends on:** Phase 16
**Requirements:** MDRW-01, MDRW-02, MDRW-03, MDRW-04, MAI-01
**Success Criteria:**

1. Tapping "Files" opens the Sidebar as a slide-over drawer; closing returns to the prior view without losing work.
2. Style panels (Colors / AdvancedStyle / Node-Edge-Subgraph) open as drawers/bottom sheets with mutual exclusion (opening one closes another).
3. Existing modals fit the mobile screen, dismiss easily, bottom-anchored where appropriate.
4. Drawers reuse existing Modal infrastructure (position="right") — no parallel drawer system.
5. Bottom-nav "AI" opens the AI assistant panel as a drawer with full desktop-equivalent chat.

**Plans:** 3/3 plans complete

**Wave 1** *(parallel — zero file overlap)*

- [x] [17-01-PLAN.md](./phases/17-mobile-drawers-panels/17-01-PLAN.md) — Extend useMobileShell MobileDrawer type/setActiveDrawer signature to include style-panel ids + mutual-exclusion tests (MDRW-02 keystone) ✅
- [ ] [17-03-PLAN.md](./phases/17-mobile-drawers-panels/17-03-PLAN.md) — Adapt shared Modal responsively (fit screen, >=44px close target) + make Node/Edge/Subgraph floating panels full-width mobile slide-overs; desktop unchanged (MDRW-03 + MDRW-02 selection-driven half)

**Wave 2** *(blocked on Wave 1 / 17-01)*

- [ ] [17-02-PLAN.md](./phases/17-mobile-drawers-panels/17-02-PLAN.md) — Wire Colors/AdvancedStyle drawers into MobileLayout (Modal position=right via openDrawer) + TopBar overflow (CommandPalette) + desktop open-handler reuse + MDRW-01/04/MAI-01 non-regression (MDRW-02 consumer wiring + MDRW-04 reuse proof)

## Phase 18: Touch Optimization & Visual Editor

**Goal:** Users can interact with all controls and the visual editor by touch.
**Status:** Executing
**Depends on:** Phase 17
**Requirements:** MTCH-01, MTCH-02, MTCH-03
**Success Criteria:**

1. Every interactive control has a ≥44×44px tappable area with adequate spacing — no mis-taps.
2. In preview, users can scroll/pan with one finger and all actions are tap-reachable (no hover-only interactions remain).
3. In the visual drag-and-drop editor, users can drag/select nodes and trigger AI modifications by touch.
4. Pinch-to-zoom and pan the visual-editor canvas works on mobile without breaking desktop mouse behavior.

**Plans:** 1/2 plans complete

Plans:

**Wave 1** *(parallel — zero file overlap between plans)*

- [x] [18-01-PLAN.md](./phases/18-touch-optimization-visual-editor/18-01-PLAN.md) — MTCH-01/MTCH-02: raise mobile-shell tap targets to ≥44px (MobileTopBar p-3 + min-w/min-h-[44px], MobileBottomNav active:), add preview CSS touch-action (pan-x pan-y pinch-zoom), Wave-0 E2E specs ✅
- [ ] [18-02-PLAN.md](./phases/18-touch-optimization-visual-editor/18-02-PLAN.md) — MTCH-03 keystone: migrate VisualEditorCanvas mouse→Pointer Events (unified, not forked), add multi-touch pinch-zoom via pointerId map, desktop non-regression E2E, real-device human checkpoint

---

## v1.1 Planning Notes (for /gsd-plan-phase)

- **CSS-vs-JS detection tension:** decide per-component whether a Tailwind breakpoint (`md:hidden`/`hidden md:flex`) suffices, reserving JS `useMediaQuery` for state-dependent conditional render (z-index layering, mobile/desktop state separation in MSHL-03).
- **Custom 600px breakpoint required** for MWRK-01 (Tailwind defaults are sm=640 / md=768; neither is 600). Add a custom breakpoint (e.g. `mobile-split`) or media query in Phase 14/16.
- **Phase 18 (pointer-events migration of VisualEditorCanvas) is the highest-risk phase** — recommend a research spike during Phase 18 planning.
- All 5 phases match UI-detection keywords → `/gsd-ui-phase` available for each.
- **Zero new dependencies** (per research): custom `useMediaQuery`, native Touch API, Tailwind v4 variants, CSS `env()` safe-area.
