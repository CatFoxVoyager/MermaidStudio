import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import type { DiagramType } from '@/types';
import { validateDiagramContent } from '@/utils/validation';
import { deriveThemeVariables, extractThemeIdFromContent } from '@/constants/themeDerivation';
import { getThemeById } from '@/constants/themes';
import { sanitizeMermaidSVG } from '@/utils/sanitization';
import type { MermaidTheme } from '@/types';

export type MermaidBuiltinTheme = 'default' | 'dark' | 'forest' | 'neutral' | 'base';

let currentTheme: 'dark' | 'light' = 'light';
let currentMermaidTheme: MermaidBuiltinTheme = 'base';
let defaultTheme: MermaidTheme | null = null;
let diagramTheme: MermaidTheme | null = null;

// Register ELK layout loaders once
mermaid.registerLayoutLoaders(elkLayouts);

function doInit(theme: 'dark' | 'light', useBase: boolean, mermaidTheme?: MermaidBuiltinTheme) {
  const resolvedMermaidTheme =
    mermaidTheme ?? (useBase ? 'base' : theme === 'dark' ? 'dark' : 'default');
  const isDark = theme === 'dark';

  let themeVars: Record<string, string> | undefined;
  if (!useBase && diagramTheme) {
    // Use the diagram-specific theme (render-time theming)
    themeVars = deriveThemeVariables(diagramTheme.coreColors, isDark);
  } else if (!useBase && defaultTheme) {
    // Use the user's default theme for app-level theming
    themeVars = deriveThemeVariables(defaultTheme.coreColors, isDark);
  } else if (!useBase) {
    // Fallback: use Mermaid's built-in theme (no custom themeVariables)
    themeVars = undefined;
  }
  // When useBase is true, don't pass themeVariables (frontmatter controls theming)

  mermaid.initialize({
    startOnLoad: false,
    theme: resolvedMermaidTheme,
    darkMode: isDark,
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 14,
    flowchart: { curve: 'basis', padding: 20, htmlLabels: true, useMaxWidth: false },
    sequence: { useMaxWidth: true, actorMargin: 50 },
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
  diagramTheme = themeId ? getThemeById(themeId) : null;
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

function fixEdgeLabelTextColor(svgStr: string, textColor: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgStr, 'text/html');
  const labels = doc.querySelectorAll('.edgeLabel span, .edgeLabel p');
  labels.forEach(el => {
    (el as HTMLElement).style.color = textColor;
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

  doInit(currentTheme, hasCustomTheme, currentMermaidTheme);

  const safeId = id.replace(/[^a-zA-Z0-9_]/g, '_');
  try {
    let { svg } = await mermaid.render(safeId, content);

    // Always sanitize SVG output for defense-in-depth
    svg = sanitizeMermaidSVG(svg);

    if (hasCustomTheme) {
      const textColor = extractEdgeLabelTextColor(content);
      if (textColor) {
        svg = fixEdgeLabelTextColor(svg, textColor);
      }
    }

    return { svg, error: null };
  } catch (e) {
    // Clean up the temporary rendering element that mermaid leaves behind on failure.
    // Without this, subsequent renders may fail silently after a parse error.
    const el = document.getElementById(safeId);
    if (el) el.remove();
    return { svg: '', error: e instanceof Error ? e.message : String(e) };
  }
}

export function detectDiagramType(content: string): DiagramType {
  // Remove YAML frontmatter if present
  let body = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  body = body.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();
  // Skip Mermaid comment lines (e.g. %% @theme corporate_blue)
  body = body.replace(/^(%%[^\n]*\n?)+/i, '').trim();

  const first = body.split('\n')[0]?.toLowerCase().trim();
  if (!first) return 'unknown';

  // Flowchart and variants
  if (first.startsWith('flowchart') || first.startsWith('graph')) {
    return 'flowchart';
  }

  // Sequence diagram
  if (first.startsWith('sequencediagram')) {
    return 'sequence';
  }

  // Class diagram
  if (first.startsWith('classdiagram')) {
    return 'classDiagram';
  }

  // State diagram
  if (first.startsWith('statediagram')) {
    return 'stateDiagram';
  }

  // ER diagram
  if (first.startsWith('erdiagram')) {
    return 'erDiagram';
  }

  // Gantt chart
  if (first.startsWith('gantt')) {
    return 'gantt';
  }

  // Pie chart
  if (first.startsWith('pie')) {
    return 'pie';
  }

  // Mindmap
  if (first.startsWith('mindmap')) {
    return 'mindmap';
  }

  // Git graph
  if (first.startsWith('gitgraph')) {
    return 'gitGraph';
  }

  // Journey map
  if (first.startsWith('journey')) {
    return 'journey';
  }

  // Timeline
  if (first.startsWith('timeline')) {
    return 'timeline';
  }

  // Quadrant chart
  if (first.startsWith('quadrantchart')) {
    return 'quadrantChart';
  }

  // Requirement diagram
  if (first.startsWith('requirementdiagram')) {
    return 'requirementDiagram';
  }

  // Sankey diagram
  if (first.startsWith('sankey-beta') || first.startsWith('sankey')) {
    return 'sankey';
  }

  // XY Chart
  if (first.startsWith('xychart-beta')) {
    return 'xyChart';
  }

  // Block diagram
  if (first.startsWith('blockbeta') || first.startsWith('block')) {
    return 'blockDiagram';
  }

  // C4 diagram
  if (first.startsWith('c4')) {
    return 'c4';
  }

  // Architecture diagram
  if (first.startsWith('architecture')) {
    return 'architectureDiagram';
  }

  // ZenUML
  if (first.startsWith('zenuml')) {
    return 'zenuml';
  }

  // Packet diagram
  if (first.startsWith('packet')) {
    return 'packetDiagram';
  }

  // Kanban
  if (first.startsWith('kanban')) {
    return 'kanban';
  }

  return 'unknown';
}
