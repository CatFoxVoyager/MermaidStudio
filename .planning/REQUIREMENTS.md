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

**Coverage:**

- v1 requirements: 36 total — Mapped to phases: 36 (100%), Unmapped: 0 ✓
- v1.1 requirements: 18 total — Mapped to phases: 18 (100%), Unmapped: 0 ✓

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation*
