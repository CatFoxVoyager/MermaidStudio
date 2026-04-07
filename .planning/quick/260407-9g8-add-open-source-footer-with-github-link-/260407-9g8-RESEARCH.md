# Quick Task 260407-9g8: Add Open Source Footer with GitHub Link - Research

**Researched:** 2026-04-07
**Domain:** UI component addition to existing status bar
**Confidence:** HIGH

## Summary

Adding an open source notice with GitHub link to the existing StatusBar component at the bottom of the MermaidStudio app. The StatusBar already uses a two-column flex layout (`justify-between`) with status info on the left and render/saved time on the right. The open source notice goes on the right side, after the existing status items.

**Primary recommendation:** Add a right-aligned GitHub link with inline SVG icon (not Lucide's deprecated `Github` icon) directly into the existing StatusBar component's right-side `div`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Add open source notice to the EXISTING footer bar (status bar), not a new row
- GitHub icon + text "View on GitHub" linking to https://github.com/CatFoxVoyager/MermaidStudio
- Display "MermaidStudio is open source" alongside the GitHub icon and link
- Place the open source notice on the RIGHT side of the existing footer bar (status info stays on the left)

### Claude's Discretion
- None specified -- follow locked decisions

### Deferred Ideas (OUT OF SCOPE)
- None specified
</user_constraints>

## Integration Point: StatusBar Component

**File:** `src/components/editor/StatusBar.tsx`
**Rendered by:** `WorkspacePanel.tsx` (line 271)
**Current layout:**

```
+----------------------------------------------------------+
| [Type] [Lines] [Chars]        [Render ms] [Saved X ago]  |
+----------------------------------------------------------+
```

The component uses `flex items-center justify-between` with two child `div`s:
- **Left div** (`gap-3`): diagram type, line count, char count
- **Right div** (`gap-3`): render time, relative saved time

**Target layout after change:**

```
+--------------------------------------------------------------------------+
| [Type] [Lines] [Chars]     [Render ms] [Saved X ago] | [icon] View on GitHub |
+--------------------------------------------------------------------------+
```

The right div already has `gap-3`, so adding the GitHub link as a sibling after the saved time span will get consistent spacing. A subtle separator (`|` or `border-l`) between existing status items and the open source notice would improve readability.

## Lucide React Github Icon -- NOT Available

**Critical finding:** The `Github` icon is **deprecated** on lucide.dev and is **not exported** from lucide-react 1.7.0 (the installed version, which is also the latest). Verified by:

1. `require('lucide-react').Github` returns `undefined` [VERIFIED: runtime check]
2. Searching all exports for "github" returns zero results [VERIFIED: runtime check]
3. lucide.dev/icons/github page shows "Deprecated" badge [VERIFIED: website]

**Recommended alternative:** Use an inline SVG for the GitHub mark icon. This is the standard approach for brand logos and is more stable than depending on a deprecated icon export. The GitHub octocat SVG is small (~400 bytes) and widely used.

## Recommended Implementation

### Inline SVG GitHub Icon

```tsx
// Inside StatusBar.tsx -- add a small GitHub icon component
function GitHubIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}
```

### Adding to StatusBar Right Side

```tsx
{/* Inside the right div, after existing status items */}
<div className="flex items-center gap-3">
  {renderTimeMs !== null && <span data-testid="render-time">{t('status.render', { ms: renderTimeMs })}</span>}
  <span>{relSaved()}</span>
  <span className="mx-1 opacity-30">|</span>
  <a
    href="https://github.com/CatFoxVoyager/MermaidStudio"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
  >
    <GitHubIcon size={12} />
    <span>MermaidStudio is open source</span>
  </a>
</div>
```

## Styling Notes

- The StatusBar uses inline `style` for colors (`var(--text-tertiary)`, `var(--surface-raised)`, `var(--border-subtle)`), NOT Tailwind color classes. The GitHub link will inherit `var(--text-tertiary)` text color from the parent, which is appropriate for a subtle footer element.
- Text size is `text-[10px]` on the parent div -- the GitHub text will inherit this size.
- A `hover:opacity-80` provides subtle feedback without needing additional color variables.
- The `target="_blank" rel="noopener noreferrer"` is standard for external links to prevent tab-napping attacks.

## Common Pitfalls

### Pitfall 1: Using deprecated Lucide Github icon
**What goes wrong:** Import `{ Github } from 'lucide-react'` resolves to `undefined` in v1.7.0, causing a runtime crash or rendering nothing.
**How to avoid:** Use inline SVG for brand icons instead. [VERIFIED: runtime test showed Github is undefined]

### Pitfall 2: Adding a new footer row instead of integrating
**What goes wrong:** Creates visual clutter with two thin bars at the bottom.
**How to avoid:** Modify the existing StatusBar component only. The CONTEXT.md explicitly says "Do NOT create a new footer row."

### Pitfall 3: Breaking the StatusBar when no tab is active
**What goes wrong:** StatusBar receives content when no tab is open, potentially causing errors.
**How to avoid:** The GitHub link is static content that renders regardless of tab state. It should sit outside any conditional rendering that depends on tab content.

## Project Constraints (from CLAUDE.md)

- Use Tailwind utility classes exclusively (no CSS modules, no styled-components)
- Dark/light theme support via CSS variables and `dark:` prefix
- Path aliases: use `@/editor/StatusBar` style imports
- Co-located tests in `__tests__/` directory
- Commitlint enforces conventional commits (`feat:`, `fix:`, etc.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GitHub URL is https://github.com/CatFoxVoyager/MermaidStudio (from CONTEXT.md, confirmed via `git remote get-url origin`) | Integration Point | Low -- verified from git remote |

**No unverified assumptions.** All claims verified via runtime checks, file reads, and git commands.

## Sources

### Primary (HIGH confidence)
- `src/components/editor/StatusBar.tsx` -- read and analyzed current implementation
- `src/components/editor/WorkspacePanel.tsx` -- verified StatusBar render location
- lucide-react 1.7.0 runtime exports -- verified Github icon is missing
- lucide.dev/icons/github -- confirmed deprecated status
- `git remote get-url origin` -- confirmed repository URL
