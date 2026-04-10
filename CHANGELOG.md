# Changelog

All notable changes to MermaidStudio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
