# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-10-06

The mobile editor received a full design-polish pass (31 review/fix iterations,
convergence double-verified): every touch surface, overlay and error state was
measured live at phone size and brought to the same bar as the desktop app.

### Added
- **Mobile menu sheet** - The bottom navigation became a bottom sheet (handle, swipe-to-dismiss, backdrop): Commands, Backup, Settings, Language and About live in one place, with the open document's name as the sheet subtitle so you always know what you are editing
- **Editor key row** - A syntax keyboard row under the code editor inserts the symbols Mermaid diagrams need most (`-->`, `|`, `{`, `"`, tab, arrows), grouped as 6 tinted insert keys and 5 command keys with 44px+ touch targets
- **"✓ Saved" flash** - Every real persist (autosave included) briefly flashes a check next to the document title on mobile; the amber checkpoint dot still shows separately, so "persisted" and "edited since checkpoint" are two honest signals instead of one ambiguous dot
- **Undo/redo everywhere on mobile** - The top bar carries undo/redo on every screen, wired to the editor history even while the Files screen is front (buttons disable honestly where history cannot act)

### Changed
- **Parse errors are readable** - A failed parse now shows an opaque card (icon, plain title, recovery button announced via `role="alert"`) instead of transparent text interleaved with the stale diagram; the root cause was fixed, not papered over: React reused the canvas host element across state branches, keeping the old diagram's shadow root alive inside the error card
- **Color picker fits the phone** - The popover now measures its real height after opening, clamps to the viewport and scrolls if needed — the last swatch row and the custom-color entry are reachable again; swatches are 40px visuals with 44px hit areas, a visible focus ring, Escape dismisses popover-then-panel layer by layer
- **Touch floor systematized** - One shared hit-target recipe (44px floor + invisible stretch) covers top bar, keycaps, swatches, sheet rows and export cards; export cards gained pressed-state feedback
- **Style panels answer Escape anywhere** - Node, Edge and Subgraph panels close on Escape regardless of keyboard focus; the node panel's desktop 12px scrollbar is gone (4px mobile rule)
- **Edge sheets name their endpoints** - The sheet header reads "Source → Target" instead of machine numbering ("Edge 1"); Connection section unchanged

### Fixed
- **Subgraph deletion leaves no orphan code** - Deleting a subgraph re-homes its nodes to the parent level AND removes the placeholder node seeded at creation (previously a stray `N1[Subgraph]` line stayed in the code); a renamed seed counts as user content and survives
- **Welcome diagram renders everywhere** - The seed content dropped its frontmatter header that the visual editor's parser rejected, so a first-time user's very first tap no longer lands on an error

## [0.9.0] - 2026-10-04

### Added
- **Import safety confirmation** - Importing a backup now shows exactly what it will replace (live diagram/folder counts, pluralized, with a dedicated "your library is empty" variant) and requires an explicit "Replace everything" action; an "export first" hint precedes the point of no return
- **Keyboard-complete dialogs** - Every dialog (Backup & Import, folder picker, delete confirmations) traps Tab inside the panel, restores focus to its trigger on close, and answers Escape from the first keystroke; document tabs are keyboard-operable (arrows, Home/End, Enter/Space) with a visible focus ring
- **"More" actions menu** - Save as Template, Version History, Diagram Colors, Advanced Styling, Fullscreen and Reset Split moved into an overflow menu; the editor toolbar now leads with Save, Diff, Export, AI and Fix
- **Clear-filters exit** - Empty search results gain a "Clear search & filters" action instead of a dead end
- **Boot splash** - Themed loading screen (spinner + app name) replaces the static SEO shell flash during cold loads; auto-dismisses when the app is ready, falls back to the crawlable shell if loading fails

### Changed
- **Honest save status** - The status bar no longer claims unsaved work: "Edited · autosaved" while typing, and real "Saved Nm ago" timestamps after each persist (previously "Not saved" showed while content was already stored); the amber dirty dot explains itself on hover, in both tab bar and toolbar
- **Dependencies refreshed, majors included** - vitest 5, jsdom 30, jest-dom 7, TypeScript 7 (native compiler); ESLint + typescript-eslint replaced by OxLint (Rust-based linter, TypeScript-version independent); Vite 8.3.2, ESLint ecosystem removal, lucide-react 1.51, transformers 4.3
- **Mermaid 12.1.0** - Engine unpinned from 12.0.0; CDN embed snippet and SRI hash re-pinned together
- **Tag chips really filter** - Clicking a tag now filters the file list (previously lit up without changing it); existing libraries get the seed tags backfilled on first load
- **Unified hover and danger theming** - Hover feedback is visible in light theme via a themed `--hover` token (all 71 white washes migrated); destructive buttons and surfaces use AA-contrast `--danger` tokens

### Fixed
- **Folder deletion confirms first** - Deleting a folder asks for confirmation and tells the truth: its diagrams and subfolders are re-parented to the parent folder, never destroyed (pluralized copy, zero-diagram variant)
- **Accessibility sweep** - aria-labels across all icon-only buttons; language menu closes on Escape and outside-click; sidebar "⋯" buttons reachable by keyboard focus; `html lang` follows the UI language; destructive contrast raised to AA (white on `#dc2626` = 4.8:1, was 3.76:1)
- **Typography floor** - No interface text below 11px (9-10px text in 25+ places raised); status bar at 12px; keyboard shortcut badges at 11px
- **Stale offline banner removed** - It advertised local AI providers that were never wired in

## [0.8.1] - 2026-09-15

### Fixed
- **Mobile bottom nav flush** - The gap between the bottom navigation and the Android gesture bar is gone: `viewport-fit=cover` removed (it made browsers report a bottom inset they don't actually overlay) and the safe-area padding zeroed in browser tabs, so the nav sits flush at the viewport bottom. The inset is honored only where the page is truly edge-to-edge (installed PWA/fullscreen). Browser chrome (URL bar, gesture zone) follows the app theme via a synced `theme-color`.

## [0.8.0] - 2026-09-14

### Changed
- **Mermaid 12 engine** - Diagram engine upgraded to Mermaid 12 with the same familiar look by design (v11 dagre/classic defaults pinned; zero user-facing regression verified by the 1446-test suite and 3-browser E2E matrix)
- **ELK layout bundled** - ELK layout engine now ships inside the Mermaid 12 package — available in the layout picker with no double download
- **Embeddable CDN build re-pinned** - CDN embed script re-pinned with an integrity hash (SRI sha384)

### Added
- **usecaseDiagram type** - New diagram type support with expanded autocomplete coverage (railroad, cynefin, swimlane layouts and new shapes)

### Security
- **SVG post-processing hardened** - Pipeline locked against real Mermaid 12 output: preview/export parity and hardened XSS sanitization

## [0.6.0] - 2026-07-03

### Added
- **Mobile responsive layout** - Dedicated mobile UI for viewports ≤768px (mobile shell with TopBar + overflow menu + bottom navigation: Files/Edit/AI)
- **Mobile workspace** - Segmented Code↔Preview toggle below 600px viewport (replaces desktop split-view on mobile)
- **Mobile drawers** - File browser (Sidebar), AI assistant, and style panels (DiagramColors, AdvancedStyle) open as slide-over drawers with mutual exclusion
- **Visual editor on mobile** - Visual drag-and-drop editor accessible via Code/Preview/Visual toggle on mobile devices
- **Touch interaction support** - Pointer events migration for unified mouse/touch handling in visual editor with pinch-to-zoom and pan
- **Safe-area inset support** - env() CSS for notch/home-indicator clearance on modern smartphones (viewport-fit=cover meta tag)
- **Mobile E2E test suite** - Comprehensive Playwright specs for mobile detection, touch targets (≥44px), touch interactions, and visual-editor touch support
- **E2E infrastructure improvements** - Dev-only Vite launcher script (`scripts/dev-e2e.mjs`) for Windows PATH compatibility + Playwright server reuse configuration
- **Comprehensive mobile UAT checklist** - `.planning/v1.2-UAT-CHECKLIST.md` for real-device validation (gates 0.6.0 release)

### Changed
- **Visual editor accessibility** - Existing Visual toggle now works on both desktop and mobile (previously desktop-only)
- **Workspace responsiveness** - Editor and preview switch from side-by-side to segmented toggle below 600px viewport
- **Typography and spacing** - Text and UI elements scale responsively on mobile for readability without manual zoom
- **Touch interaction model** - Hover-only interactions replaced with tap/active states for mobile compatibility

### Fixed
- **Touch scroll/pan in diagram preview** - Native touch-action CSS (pan-x pan-y pinch-zoom) enables smooth touch scrolling
- **Active tap states on mobile buttons** - Visual feedback during tap (active:bg-white/15) improves touch responsiveness
- **Windows E2E test compatibility** - Node PATH issue resolved via absolute-path launcher script (dev-e2e.mjs) + Playwright reuseExistingServer configuration

### Technical Notes
- **Zero desktop regression** - Desktop layout (≥1280px) remains pixel-perfect; all desktop controls/functionality unchanged
- **Zero new runtime dependencies** - Mobile UI uses existing React 19, Tailwind CSS 4, and native Touch/Pointer APIs; zero new runtime deps added
- **Version bump gated** - 0.5.1 → 0.6.0 bump explicitly DEFERRED pending 100% real-device UAT validation (see `.planning/v1.2-UAT-CHECKLIST.md`)
- **Self-signed cert handling** - HTTPS dev server (`.cert/`) requires manual browser acceptance for real-device testing (documented in UAT checklist)
- **Playwright server reuse** - Local E2E tests reuse manually-started dev server (`reuseExistingServer: !CI`) to avoid Windows subshell PATH issues

## [0.5.1] - 2026-07-01

## [0.5.1] - 2026-07-01

### Fixed
- **Template apply modal** - Applying a template no longer throws "closeModal is not a function"; the Templates modal now closes correctly (App.tsx wiring fix)
- **Mermaid SVG output** - Degenerate `<path>` elements with NaN coordinates (notably from Sankey previews) are now stripped during sanitization, reducing console errors on render

### Changed
- **Codebase hierarchy** - App-level orchestration hooks moved into `hooks/app/` (per CLAUDE.md); top-level layout components grouped into `components/layout/`; dev scripts grouped into `scripts/{docs,build,e2e}/`
- **Pre-commit hook** - No longer runs the full vitest suite (which hangs at teardown on Windows); now runs lint + type-check only. Full suite remains in CI
- **.gitignore** - Scoped overly broad patterns (`*.txt`, `.dockerignore`, `Dockerfile.dev`) to the repo root; `CLAUDE.md`, `docker/.dockerignore`, `public/robots.txt`, and three unit tests are now tracked

### Verified
- Exhaustive Playwright/Chrome pass: editor + live preview, templates (apply/create/save), AI panel with full WebGPU LLM inference (Qwen3.5 0.8B), all modals, theme, i18n (en/fr), visual editor

## [0.5.0] - 2026-04-10

### Added
- **AI Fix Diagram** - Automatically detect and fix syntax, semantic, and style issues in Mermaid diagrams
- New "Fix Diagram" button in editor toolbar (Wrench + Sparkles icon)
- AI Panel now supports fix mode with 3-pass analysis (syntax → semantic → style)
- Enhanced error handling with fallback to chat mode
- i18n support for fix mode in English and French
- E2E tests for AI fix diagram feature
- Manual testing checklist for comprehensive validation

### Changed
- AIPanel now accepts `fixMode` and `onEnterFixMode` props
- WorkspacePanel `onOpenAIPanel` now accepts mode option (`{ mode: 'fix' }`)
- useAISend hook exports `sendFixRequest` function
- mermaidSystemPrompt exports `buildFixSystemPrompt` function
- useEffect in AIPanel to auto-trigger fix request when fix mode is active

### Fixed
- Improved AI error message sanitization for security
- Fix mode now properly hides suggestions in AI Panel
- Fix mode resets correctly when closing AI Panel

### Technical
- Added `buildFixSystemPrompt` function for 3-pass diagram analysis
- Added `sendFixRequest` function in useAISend hook
- Enhanced AIPanel with fix mode state management
- Added comprehensive E2E test coverage for fix diagram feature
- Added i18n translations: `fixDiagram`, `fixDiagramTitle`, `fixDiagramButton`, `analyzing`, `noIssuesFound`, `fixErrorPrefix`, `openChatForHelp`

## [0.4.1] - 2026-04-08

### Fixed
- Fixed blank page issue on initial load
- Fixed diagram creation flow
- Fixed PNG export functionality

## [0.4.0] - 2026-04-07

### Added
- Analytics integration with privacy controls
- Security enhancements (API key encryption, XSS prevention)
- Theme system with light/dark mode support
- i18n support (English and French)
- Visual editor with drag-and-drop
- Improved UI/UX with better navigation and layout

### Changed
- Enhanced state management
- Improved error handling
- Better accessibility support

## [0.3.0] - 2026-03-25

### Added
- Initial release of MermaidStudio
- Code editor with CodeMirror 6
- Mermaid.js diagram preview
- Basic AI chat functionality
- Template library
- Export functionality (PNG, SVG)
- Version history
- Theme customization
