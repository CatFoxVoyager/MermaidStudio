# Requirements: MermaidStudio

**Defined:** 2026-03-22
**Core Value:** Users prefer MermaidStudio over Mermaid Live Editor because of its polished interface, AI assistance, and better editing experience.

## v1 Requirements

Requirements for initial AI-powered release. Each maps to roadmap phases.

### AI Foundation

- [ ] **AI-01**: Fix broken LLM connection to enable all AI features
- [ ] **AI-02**: Implement proper error handling and retry logic for AI API calls
- [ ] **AI-03**: Add timeout handling (30s default) to prevent hanging requests
- [ ] **AI-04**: Replace manual fetch with official SDKs (OpenAI, Anthropic)
- [ ] **AI-05**: Encrypt API keys in localStorage using Web Crypto API
- [ ] **AI-06**: Validate and correct default model names for each provider

### Core AI Features

- [ ] **GEN-01**: User can generate diagram from natural language description
- [ ] **GEN-02**: User can request syntax error repair and receive fixed code
- [ ] **GEN-03**: User can request diagram explanation and receive analysis
- [ ] **GEN-04**: AI maintains conversation context across 6+ messages
- [ ] **GEN-05**: User can apply AI-generated code with one click

### Multi-Provider Support

- [ ] **PROV-01**: OpenAI provider works (GPT-4, GPT-3.5)
- [ ] **PROV-02**: Anthropic provider works (Claude Opus, Sonnet, Haiku)
- [ ] **PROV-03**: Google Gemini provider works
- [ ] **PROV-04**: Ollama provider works (local models)
- [ ] **PROV-05**: LM Studio provider works (local models)
- [ ] **PROV-06**: Custom endpoint provider works (self-hosted models)
- [ ] **PROV-07**: User can switch between providers without re-entering keys

### Enhanced UX

- [ ] **UX-01**: AI responses stream in real-time (not waiting for full response)
- [ ] **UX-02**: Code completion suggests Mermaid syntax while typing
- [ ] **UX-03**: Error messages provide actionable guidance (not "API error")
- [ ] **UX-04**: Loading states indicate AI is working (spinner, progress)
- [ ] **UX-05**: Token/cost tracking shows usage per session

### Visual Editor AI

- [ ] **VIS-01**: AI suggestions work in visual drag-and-drop editor
- [ ] **VIS-02**: User can select nodes and request AI modifications
- [x] **VIS-03**: Visual edits sync to code editor correctly

### Advanced Features

- [ ] **ADV-01**: AI can refactor diagrams (simplify, reorganize, extract)
- [ ] **ADV-02**: Template-aware generation (modify existing templates)
- [ ] **ADV-03**: Version history integration (AI explains changes between versions)

### Security & Reliability

- [ ] **SEC-01**: API keys encrypted before localStorage storage
- [ ] **SEC-02**: CORS errors handled with user-friendly message
- [ ] **SEC-03**: Rate limiting prevents API spam
- [ ] **SEC-04**: Request deduplication prevents duplicate AI calls
- [ ] **SEC-05**: Input validation prevents prompt injection

## v1.1 Requirements

Requirements for mobile responsive design milestone. Each maps to roadmap phases (14+). Mobile category prefixes avoid collision with v1 IDs.

### Mobile Foundation

- [x] **MFDN-01**: App renders a dedicated mobile layout at ≤768px viewport and the existing desktop layout above 768px, with zero desktop regression
- [x] **MFDN-02**: Mobile viewport meta configured (width=device-width, viewport-fit=cover) and layout uses dynamic viewport units (dvh) to handle mobile browser chrome
- [x] **MFDN-03**: Safe-area insets (notch / home indicator) respected via env() so content is not obscured
- [x] **MFDN-04**: A documented z-index layering strategy prevents conflicts (bottom nav < modals z-50 < drawers < toasts)

### Mobile Shell

- [x] **MSHL-01**: Condensed mobile TopBar shows brand + primary actions via an overflow menu, fitting a 375px width
- [x] **MSHL-02**: Bottom navigation bar (3 destinations: Files / Edit / AI) provides primary navigation, thumb-reachable
- [x] **MSHL-03**: Mobile shell state (active view, open drawer) managed separately from desktop state to avoid conflicts

### Mobile Workspace

- [x] **MWRK-01**: Editor and preview switch from side-by-side split to a segmented Code↔Preview toggle below 600px
- [x] **MWRK-02**: Toggling Code/Preview preserves scroll position and selection context
- [x] **MWRK-03**: Typography and spacing adapt responsively so code and UI text stay readable on mobile

### Mobile Drawers & Panels

- [x] **MDRW-01**: File browser (Sidebar) opens as a slide-over drawer on mobile
- [x] **MDRW-02**: Style panels (DiagramColors, AdvancedStyle, Node/Edge/Subgraph) open as slide-over drawers or bottom sheets on mobile with mutual exclusion
- [x] **MDRW-03**: Existing modals are mobile-friendly (fit screen, easy dismiss, bottom-anchored where appropriate)
- [x] **MDRW-04**: Drawers reuse existing Modal infrastructure (position="right") rather than a parallel system

### Mobile Touch & Interactions

- [x] **MTCH-01**: All interactive elements meet 44px minimum tap targets with adequate spacing
- [x] **MTCH-02**: Diagram preview supports touch scroll/pan; hover-only interactions replaced with tap/active states
- [x] **MTCH-03**: Visual drag-and-drop editor works on touch (migrated from mouse events to pointer events) with pinch-to-zoom/pan

### Mobile AI

- [x] **MAI-01**: AI assistant panel is accessible on mobile via a drawer (bottom nav "AI" entry), reusing the existing AIPanel

## v1.3 Requirements

Requirements for the mermaid 12 migration milestone. Each maps to roadmap phases (21+). Category prefixes avoid collision with earlier milestone IDs (AI/GEN/PROV/UX/VIS/ADV/SEC, MFDN...MAI). Scope locked 2026-09-12: `@mermaid-js/layout-elk` is **removed**, not bumped (mermaid 12 bundles + auto-registers ELK; keeping ^1.0.0 would ship ELK twice, ~+500 kB gz — recorded deviation from the original "^0.2.3 → ^1.x" milestone letter).

### Upgrade & Compatibility

- [ ] **UPG-01**: mermaid upgraded from ^11.17.2 to exact pinned 12.0.0 (no floating range — no 12.0.x point releases exist yet) with lockfile update and production build green
- [ ] **UPG-02**: Legacy defaults pinned in `doInit()` — `layout: 'dagre'` and `look: 'classic'` (theme already explicit) — neutralizing mermaid 12's two silent default flips (ELK layout for 7 types, redux-color/neo for 10 types); harmless under v11, so revert-safe at any point
- [ ] **UPG-03**: `@mermaid-js/layout-elk` removed — package dropped and `registerLayoutLoaders` call deleted from `core.ts`; ELK arrives bundled and auto-registered in mermaid 12
- [ ] **UPG-04**: `vite.config.ts` manualChunks reworked — dead `mermaid-elk` chunk branch removed, ELK verified to arrive inside mermaid's lazy chunk; package-specifier imports only (never `dist/mermaid.esm.min.mjs`)
- [ ] **UPG-05**: CI Node matrix drops Node 20 (mermaid 12 engines: node >=22.12); matrix covers 22.12+ and 24
- [ ] **UPG-06**: ExportModal CDN embed snippet bumps `mermaid@11` → `mermaid@12` with a regenerated SRI hash (a stale hash silently breaks every copied embed)

### SVG Pipeline Verification

- [ ] **PIPE-01**: v11 structural golden fixtures captured BEFORE the upgrade (`.edgePaths path.flowchart-link`, `g.edgeLabels` 1:1 index correlation, `flowchart-{ID}-{N}` node ids, marker id substrings, `rect.background`, `.root` ordering) then verified against v12 output — 0 selector matches = test failure
- [ ] **PIPE-02**: `postProcessDiagramSvg` test suite (static + rendered preview/export parity) green on v12
- [ ] **PIPE-03**: Pixel-sensitive snapshots re-baselined (mermaid 12's 1px `intersectPolygon` fix shifts dagre output too)
- [ ] **PIPE-04**: Error-path contracts verified on v12: reported line numbers vs the app's manual frontmatter offset (adjust or remove the offset if double-counting is confirmed) and temp-element cleanup behavior (manual `remove()` obsolete-but-harmless or dropped)

### Themes & Configuration

- [ ] **THM-01**: Theme x diagram-type x dark/light snapshot matrix passes on v12
- [ ] **THM-02**: `themeDerivation.ts` re-derived against v12's `theme-base.js` (variable names survive; formulas unverified upstream)
- [ ] **THM-03**: Frontmatter round-trip intact on v12: `@theme` extraction, config precedence (frontmatter > `initialize()` > per-type default > global default), `@{...}` syntax parsing
- [ ] **THM-04**: Layout selector still switches dagre / elk / elk.stress under bundled ELK; `elk.stress` resolves or degrades safely (never crashes)

### Diagram Types & Syntax

- [ ] **DIA-01**: All 20+ supported diagram types render correctly on v12 (visual spot-check sweep)
- [ ] **DIA-02**: Visual editor fail-safe: `@{...}` syntax detected -> read-only mode; the regex-based parser never corrupts a diagram using new v12 syntax
- [ ] **DIA-03**: Additive `usecaseDiagram` support: `detectDiagramType`, autocomplete, template, `usecase*` theme variables
- [ ] **DIA-04**: Autocomplete coverage for gaps inherited from 11.x: railroad, cynefin, swimlane, new shapes, `@{ view: collapsed }`

### Platform & Validation

- [ ] **VAL-01**: Full unit suite (`vitest run`), lint, type-check, and production build green on mermaid 12
- [ ] **VAL-02**: Browser floor verified: `build.target` >= ES2024, webkit E2E ~ Safari 17.4+; behavior on iOS <= 17.3 documented (early-adopter note: mermaid 12.0.0 is 2 days old, zero community post-mortems)
- [ ] **VAL-03**: Revert path documented (11.17.2 + 0.2.3 = known-good pair) and 12.0.x point releases tracked during the milestone

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Community Features

- **COMM-01**: Share diagrams via public links
- **COMM-02**: Discover and explore public diagrams
- **COMM-03**: Contribute templates to community library
- **COMM-04**: Rate and review public diagrams

### Cloud Sync (Optional)

- **SYNC-01**: Optional Supabase sync for multi-device access
- **SYNC-02**: Conflict resolution for sync collisions
- **SYNC-03**: End-to-end encryption for synced data

### Mobile (Deferred from v1.1)

- **MOB-FUT-01**: Mobile export/share via Web Share API (with download fallback)
- **MOB-FUT-02**: CodeMirror mobile keyboard accessory (frequent Mermaid symbols) + mobile-adapted autocomplete
- **MOB-FUT-03**: PWA / offline service worker for full offline support
- **MOB-FUT-04**: Advanced gesture-based diagram navigation (two-finger pan, advanced pinch)

### Mermaid 12 Follow-ups (Deferred from v1.3)

- **FR-01**: `redux-color`/`neo` as an opt-in "modern look" (requires palette-cycling support in the theme derivation engine)
- **FR-02**: ELK as default layout / layout-picker expansion (conflicts with v1.3's zero-regression goal; full pipeline re-verification needed)
- **FR-03**: Dynamic `import('mermaid')` for graceful degradation on pre-ES2024 browsers (capability check vs app-shell breakage — open product decision)
- **FR-04**: `agentflow` diagram type support (detection + autocomplete + templates)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts/authentication | Local-first simplicity, no backend needed |
| Real-time collaboration | Single-user focus for v1, significant complexity |
| Native mobile apps | This milestone (v1.1) is responsive **web** design; native apps remain deferred |
| Voice-to-diagram | Speech recognition errors, text input is faster/more accurate |
| Automatic AI suggestions | On-demand only, avoid interruptive UX |
| Real-time AI collaboration | Async AI only, multi-user state sync too complex |
| Diagram-to-text summarization | Diagrams are visual for reason, reverse is anti-feature |
| Custom diagram types | Mermaid-only focus, not creating new syntax |
| 0.6.0 release (version bump + v0.6.0 tag) | User-owned post-UAT action, tracked in `CHANGELOG.md` |
| TypeScript 7 / Vitest 5 / jsdom 30 | Strict scope: mermaid 12 is the only major bump in v1.3 |
| Adopting mermaid 12's new defaults (ELK layout, redux-color/neo) | Contradicts the zero-regression goal; both are Future items (FR-01/FR-02) |
| Bump to 12.0.x during the milestone | No point releases exist yet (12.0.0 published 2026-09-10); VAL-03 tracks them for a fast-follow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 1 | Pending |
| AI-02 | Phase 1 | Pending |
| AI-03 | Phase 1 | Pending |
| AI-04 | Phase 1 | Pending |
| AI-05 | Phase 2 | Pending |
| AI-06 | Phase 1 | Pending |
| GEN-01 | Phase 2 | Pending |
| GEN-02 | Phase 2 | Pending |
| GEN-03 | Phase 2 | Pending |
| GEN-04 | Phase 2 | Pending |
| GEN-05 | Phase 2 | Pending |
| PROV-01 | Phase 1 | Pending |
| PROV-02 | Phase 1 | Pending |
| PROV-03 | Phase 1 | Pending |
| PROV-04 | Phase 1 | Pending |
| PROV-05 | Phase 1 | Pending |
| PROV-06 | Phase 1 | Pending |
| PROV-07 | Phase 1 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 1 | Pending |
| UX-04 | Phase 1 | Pending |
| UX-05 | Phase 3 | Pending |
| VIS-01 | Phase 4 | Pending |
| VIS-02 | Phase 4 | Pending |
| VIS-03 | Phase 4 | Complete |
| ADV-01 | Phase 4 | Pending |
| ADV-02 | Phase 4 | Pending |
| ADV-03 | Phase 4 | Pending |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 3 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |

**v1.1 (Mobile Responsive Design) — Phases 14-18:**

| Requirement | Phase | Status |
|-------------|-------|--------|
| MFDN-01 | Phase 14 | Complete |
| MFDN-02 | Phase 14 | Complete |
| MFDN-03 | Phase 14 | Complete |
| MFDN-04 | Phase 14 | Complete |
| MSHL-01 | Phase 15 | ✅ Complete |
| MSHL-02 | Phase 15 | Complete |
| MSHL-03 | Phase 15 | Complete |
| MWRK-01 | Phase 16 | Complete |
| MWRK-02 | Phase 16 | Complete |
| MWRK-03 | Phase 16 | Complete |
| MDRW-01 | Phase 17 | Complete |
| MDRW-02 | Phase 17 | Complete |
| MDRW-03 | Phase 17 | Complete |
| MDRW-04 | Phase 17 | Complete |
| MAI-01 | Phase 17 | Complete |
| MTCH-01 | Phase 18 | Complete |
| MTCH-02 | Phase 18 | Complete |
| MTCH-03 | Phase 18 | Complete |

**v1.3 (Migration Mermaid 12) — Phases 21-24:**

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPG-01 | Phase 21 | Pending |
| UPG-02 | Phase 21 | Pending |
| UPG-03 | Phase 21 | Pending |
| UPG-04 | Phase 21 | Pending |
| UPG-05 | Phase 21 | Pending |
| UPG-06 | Phase 21 | Pending |
| PIPE-01 | Phase 21 | Pending |
| PIPE-02 | Phase 22 | Pending |
| PIPE-03 | Phase 22 | Pending |
| PIPE-04 | Phase 22 | Pending |
| THM-01 | Phase 23 | Pending |
| THM-02 | Phase 23 | Pending |
| THM-03 | Phase 23 | Pending |
| THM-04 | Phase 23 | Pending |
| DIA-01 | Phase 24 | Pending |
| DIA-02 | Phase 24 | Pending |
| DIA-03 | Phase 24 | Pending |
| DIA-04 | Phase 24 | Pending |
| VAL-01 | Phase 24 | Pending |
| VAL-02 | Phase 24 | Pending |
| VAL-03 | Phase 24 | Pending |

**Coverage:**

- v1 requirements: 36 total — Mapped to phases: 36 (100%), Unmapped: 0 ✓
- v1.1 requirements: 18 total — Mapped to phases: 18 (100%), Unmapped: 0 ✓
- v1.3 requirements: 21 total — Mapped to phases: 21 (100%), Unmapped: 0 ✓

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-09-12 — v1.3 traceability mapped to Phases 21-24 (21/21 requirements)*
