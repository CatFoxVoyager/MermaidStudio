import mermaid from 'mermaid';
import { LIMITS, validateDiagramContent } from '@/utils/validation';
import {
  deriveThemeVariables,
  deriveThemeVariablesForDiagramType,
  extractThemeIdFromContent,
} from '@/constants/themeDerivation';
import { getThemeById } from '@/constants/themes';
import { sanitizeMermaidSVG } from '@/utils/sanitization';
import { detectDiagramType } from './diagramType';
import { registerFaIconPacks } from './iconPacks';
import type { DiagramType, MermaidTheme } from '@/types';

export type MermaidBuiltinTheme = 'default' | 'dark' | 'forest' | 'neutral' | 'base';

const FAMILY_SCOPED_THEME_TYPES: ReadonlySet<DiagramType> = new Set<DiagramType>([
  'ishikawa',
  'radar',
  'treemap',
  'eventmodeling',
  'venn',
  'treeView',
  'wardley',
  'cynefin',
  'railroad',
  'swimlane',
  'xyChart',
]);

let currentTheme: 'dark' | 'light' = 'light';
let currentMermaidTheme: MermaidBuiltinTheme = 'base';
let defaultTheme: MermaidTheme | null = null;
let diagramTheme: MermaidTheme | null = null;

function doInit(
  theme: 'dark' | 'light',
  useBase: boolean,
  mermaidTheme?: MermaidBuiltinTheme,
  diagramType?: DiagramType,
  maxTextSize?: number
) {
  // 39-02 (ICON-02): register the lazy FA6 icon packs on the single init
  // path. iconPacks.ts carries no heavy static import — it rides this lazy
  // mermaid chunk, its pack JSONs live only inside dynamic-import loader
  // closures (PERF-01: 0 B eager boot impact), and its run-once guard makes
  // the repeated doInit calls below a no-op after the first.
  registerFaIconPacks(mermaid);
  const resolvedMermaidTheme =
    mermaidTheme ?? (useBase ? 'base' : theme === 'dark' ? 'dark' : 'default');
  const isDark = theme === 'dark';

  const activeTheme = diagramTheme ?? defaultTheme;
  let themeVars: Record<string, unknown> | undefined;
  if (!useBase && activeTheme) {
    // Use family-scoped derivation (preserving nested objects & contrast-safe
    // overrides) for the 10 new families + radar/xyChart while keeping the
    // legacy 8 theme-matrix families bound directly to deriveThemeVariables.
    themeVars =
      diagramType && FAMILY_SCOPED_THEME_TYPES.has(diagramType)
        ? deriveThemeVariablesForDiagramType(activeTheme.coreColors, isDark, diagramType)
        : deriveThemeVariables(activeTheme.coreColors, isDark);
  } else if (!useBase) {
    // Fallback: use Mermaid's built-in theme (no custom themeVariables)
    themeVars = undefined;
  }
  // When useBase is true, don't pass themeVariables (frontmatter controls theming)

  mermaid.initialize({
    startOnLoad: false,
    theme: resolvedMermaidTheme,
    layout: 'dagre', // v11-default pin — v12 would default 7 diagram types to ELK
    look: 'neo', // v12 neo/redux-color look — flips the Phase-21 classic pin (revert-safe)
    darkMode: isDark,
    maxTextSize: maxTextSize ?? LIMITS.MAX_DIAGRAM_SIZE,
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 14,
    flowchart: { curve: 'basis', padding: 20, htmlLabels: true, useMaxWidth: false, wrappingWidth: 200 }, // v11-default pin — v12 lowers wrappingWidth to 120, freezing node width so bigger fonts grow node height instead of width
    sequence: { useMaxWidth: true, actorMargin: 50 },
    swimlane: { layout: 'swimlane' },
    ...(themeVars && { themeVariables: themeVars }),
  });
}

export function initMermaid(
  theme: 'dark' | 'light',
  mermaidTheme?: MermaidBuiltinTheme,
  appDefaultTheme?: MermaidTheme | null
) {
  currentTheme = theme;
  if (mermaidTheme) {
    currentMermaidTheme = mermaidTheme;
  }
  if (appDefaultTheme !== undefined) {
    defaultTheme = appDefaultTheme;
  }
  doInit(theme, false, currentMermaidTheme);
}

export function setDefaultTheme(theme: MermaidTheme | null) {
  defaultTheme = theme;
  doInit(currentTheme, false, currentMermaidTheme);
}

export function getDefaultTheme(): MermaidTheme | null {
  return defaultTheme;
}

/**
 * Set a diagram-specific theme for render-time theming.
 * This allows diagrams to have their own theme preference without
 * injecting YAML frontmatter into content.
 */
export function setDiagramTheme(themeId: string | null): void {
  // getThemeById is typed `| undefined` for an unknown id; normalize so the
  // module-level cache keeps its declared `MermaidTheme | null` shape.
  diagramTheme = themeId ? (getThemeById(themeId) ?? null) : null;
}

/**
 * Get the current diagram-specific theme.
 */
export function getDiagramTheme(): MermaidTheme | null {
  return diagramTheme;
}

function extractEdgeLabelTextColor(content: string): string | null {
  // Try YAML frontmatter format first
  const yamlMatch = content.match(/edgeLabelBackground:\s*['"]?([^'"\n]+)/);
  if (yamlMatch) {
    const bg = yamlMatch[1].trim();
    const r = parseInt(bg.substr(1, 2), 16);
    const g = parseInt(bg.substr(3, 2), 16);
    const b = parseInt(bg.substr(5, 2), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#000000' : '#ffffff';
  }

  // Fall back to old init directive format
  const oldMatch = content.match(/'edgeLabelBackground'\s*:\s*'([^']+)'/);
  if (!oldMatch) {
    return null;
  }
  const bg = oldMatch[1];
  const r = parseInt(bg.substr(1, 2), 16);
  const g = parseInt(bg.substr(3, 2), 16);
  const b = parseInt(bg.substr(5, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#000000' : '#ffffff';
}

function hasExplicitAncestorColor(el: Element): boolean {
  const boundary = el.closest('.edgeLabel');
  let curr: Element | null = el;
  while (curr) {
    if ((curr as HTMLElement).style?.color) {
      return true;
    }
    if (curr === boundary) break;
    curr = curr.parentElement;
  }
  return false;
}

function fixEdgeLabelTextColor(svgStr: string, textColor: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgStr, 'text/html');
  const labels = doc.querySelectorAll('.edgeLabel span, .edgeLabel p');
  labels.forEach(el => {
    // Preserve per-edge or default `linkStyle ... color:...` set by Mermaid on `.labelBkg` / `.label`
    if (!hasExplicitAncestorColor(el)) {
      (el as HTMLElement).style.color = textColor;
    }
  });
  const svgEl = doc.querySelector('svg');
  return svgEl ? svgEl.outerHTML : svgStr;
}

export async function renderDiagram(
  content: string,
  id: string,
  themeId?: string
): Promise<{ svg: string; error: string | null }> {
  // Validate input before processing
  const validation = validateDiagramContent(content);
  if (!validation.valid) {
    return { svg: '', error: validation.error ?? 'Invalid content' };
  }

  const trimmed = content.trimStart();
  const hasCustomTheme = trimmed.startsWith('---') || trimmed.startsWith('%%{init:');

  // Set diagram theme: content @theme directive takes priority, then provided themeId
  const contentThemeId = extractThemeIdFromContent(content);
  const effectiveThemeId = contentThemeId ?? themeId;
  if (effectiveThemeId !== undefined) {
    setDiagramTheme(effectiveThemeId);
  } else {
    setDiagramTheme(null);
  }

  const diagramType = detectDiagramType(content);
  const requiredMaxTextSize = Math.max(LIMITS.MAX_DIAGRAM_SIZE, trimmed.length + 1024);
  doInit(currentTheme, hasCustomTheme, currentMermaidTheme, diagramType, requiredMaxTextSize);

  const safeId = id.replace(/[^a-zA-Z0-9_]/g, '_');
  try {
    // Leading whitespace defeats mermaid's frontmatter detection (it needs
    // column 0): an indented `---` is lexed as an edge token and the render
    // dies with "got LINK" (critique iter-9 P1 — the stored seed shipped
    // with 18 leading spaces). Trim is render-only; the stored content and
    // the code pane keep their original bytes.
    let { svg } = await mermaid.render(safeId, content.trimStart());

    svg = sanitizeMermaidSVG(svg);

    if (hasCustomTheme) {
      const textColor = extractEdgeLabelTextColor(content);
      if (textColor) {
        svg = fixEdgeLabelTextColor(svg, textColor);
      }
    }

    return { svg, error: null };
  } catch (e) {
    // mermaid 12 leaves BOTH the error svg ({safeId}) and its d-prefixed container
    // div (d{safeId}) in the document after a failed render — its internal
    // temp-element cleanup runs only on the success path. Render surfaces pass
    // unique per-render ids (preview_*/export_* + timestamp), so the library's
    // same-id pre-clean never fires across renders; removing both here closes
    // the one-error-svg-plus-empty-div-per-failed-render accumulation observed
    // under v11 and v12 alike (locked by core.test.ts D9/D10 non-remnance tests).
    const el = document.getElementById(safeId);
    if (el) el.remove();
    const container = document.getElementById(`d${safeId}`);
    if (container) container.remove();

    const originalError = e instanceof Error ? e.message : String(e);
    
    // Adjust line numbers if frontmatter is present
    // Mermaid often starts counting lines after the frontmatter block
    if (content.trimStart().startsWith('---')) {
      const lines = content.split('\n');
      let frontmatterEndLine = -1;
      let dashCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          dashCount++;
          if (dashCount === 2) {
            frontmatterEndLine = i + 1;
            break;
          }
        }
      }

      if (frontmatterEndLine !== -1) {
        // Find "line X" or "line:X" patterns and adjust them
        // Mermaid reports line numbers relative to the start of the diagram body (after frontmatter)
        // We add the frontmatter line count to get the absolute line in the editor
        const adjustedError = originalError.replace(/(?:line|Line)\s*:?\s*(\d+)/g, (match, lineNum) => {
          const absoluteLine = parseInt(lineNum, 10) + frontmatterEndLine;
          return `line ${absoluteLine} (absolute)`;
        });
        
        console.debug('[Mermaid Core] Adjusted error lines:', { original: originalError, adjusted: adjustedError, offset: frontmatterEndLine });
        return { svg: '', error: adjustedError };
      }
    }

    return { svg: '', error: originalError };
  }
}

// detectDiagramType moved to ./diagramType (29-02, PERF-01): the pure
// parser must stay importable without the mermaid runtime. Re-exported
// here so lazy-path consumers (PreviewPanel, DiagramColorsPanel) keep
// compiling unchanged.
export { detectDiagramType } from './diagramType';
