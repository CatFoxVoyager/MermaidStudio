# Changelog

All notable changes to MermaidStudio will be documented in this file.

## [Unreleased]

### Added
- **Drag-to-pan navigation** - Navigate the preview canvas by clicking and dragging (grab cursor always active)
- **Theme base configuration** - All themes now specify their Mermaid base theme (`base`, `default`, `forest`, `neutral`, `dark`)
- **Template theme defaults** - All diagram templates now include `theme: 'base'` configuration for consistency
- **Enhanced scrollbar** - NodeStylePanel now has a thicker (12px), darker scrollbar for better visibility

### Changed
- **Code/preview split ratio** - Adjusted from 50/50 to 40/60 (2/5 code, 3/5 preview) for better workspace balance
- **Preset color behavior** - Node presets now use actual theme colors (success, warning, danger, info) instead of all using primary color
- **Preset text color** - Preset text is now black for better readability (previously white)

### Fixed
- **NodeStylePanel positioning** - Panel now correctly stays on the right side during window resize
- **Node selectors scroll tracking** - Selection overlays now correctly follow nodes during canvas scrolling
- **Theme derivation** - `applyThemeToFrontmatter` now uses `theme.baseTheme` property (defaults to 'base')

### Technical Details

#### Theme System
Each theme now has a `baseTheme` property that specifies which Mermaid base theme to use:
- `corporate-blue` → `base`
- `warm-earth` → `base`
- `dark-tech` → `base`
- `pastel-modern` → `base`
- `ocean` → `base`
- `sunset` → `base`
- `forest` → `base`
- `midnight` → `base`
- `rainbow` → `base`
- `neutral-minimal` → `base`

#### Navigation
- Drag is always active on the preview canvas
- Clicking on nodes/subgraphs prevents drag (via `stopPropagation`)
- Cursor changes between `grab` (idle) and `grabbing` (dragging)

#### Layout
- WorkspacePanel default split position changed from 50 to 40
- NodeStylePanel positioned at `top-[110px]` (below ShapeToolbar)
- Panel stays on right side with `absolute` positioning

## [0.2.0] - Main Branch
Base version for comparison. See main branch for original features.
