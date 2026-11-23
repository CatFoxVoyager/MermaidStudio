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
import { registerTidyTreeLayout } from './layoutLoaders';
import type { DiagramLook, DiagramType, MermaidBuiltinTheme, MermaidTheme } from '@/types';

export type { MermaidBuiltinTheme };

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
  'agentflow',
  'xyChart',
]);

let currentTheme: 'dark' | 'light' = 'light';
let currentMermaidTheme: MermaidBuiltinTheme = 'base';
let currentDefaultLook: DiagramLook = 'neo';
let defaultTheme: MermaidTheme | null = null;
let diagramTheme: MermaidTheme | null = null;
let lastInitSignature: string | null = null;

const YAML_EDGE_LABEL_BG_RE = /edgeLabelBackground:\s*['"]?([^'"\n]+)/;
const INIT_EDGE_LABEL_BG_RE = /'edgeLabelBackground'\s*:\s*'([^']+)'/;
const YAML_FRONTMATTER_BLOCK_RE = /^---[\t ]*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const YAML_HAS_THEME_RE = /(?:^|\n)\s*(?:theme|themeVariables)\s*:/;
const YAML_STEP_NUMBERS_TRUE_RE = /(?:^|\n)\s*stepNumbers\s*:\s*true\b/;
const INIT_HAS_THEME_RE = /['"]?(?:theme|themeVariables)['"]?\s*:/;
const SVG_NS = 'http://www.w3.org/2000/svg';

function contentDefinesCustomTheme(trimmed: string): boolean {
  if (trimmed.startsWith('---')) {
    const fm = trimmed.match(YAML_FRONTMATTER_BLOCK_RE);
    return fm ? YAML_HAS_THEME_RE.test(fm[1]) : false;
  }
  if (trimmed.startsWith('%%{init:')) {
    const endIdx = trimmed.indexOf('}%%');
    const block = endIdx !== -1 ? trimmed.slice(0, endIdx) : trimmed;
    return INIT_HAS_THEME_RE.test(block);
  }
  return false;
}

function contentRequestsStepNumbers(trimmed: string): boolean {
  if (!trimmed.startsWith('---')) return false;
  const fm = trimmed.match(YAML_FRONTMATTER_BLOCK_RE);
  return fm ? YAML_STEP_NUMBERS_TRUE_RE.test(fm[1]) : false;
}

function samplePointAlongSvgPath(pathEl: SVGPathElement, fraction: number): { x: number; y: number } | null {
  try {
    if (typeof pathEl.getTotalLength === 'function' && typeof pathEl.getPointAtLength === 'function') {
      const len = pathEl.getTotalLength();
      if (Number.isFinite(len) && len > 0) {
        const pt = pathEl.getPointAtLength(len * fraction);
        if (Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
          return { x: pt.x, y: pt.y };
        }
      }
    }
  } catch {
    // Fallback to `d` coordinate parsing below (e.g. non-layout / jsdom environments)
  }
  const d = pathEl.getAttribute('d') ?? '';
  const nums = Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), m => Number(m[0]));
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (Number.isFinite(nums[i]) && Number.isFinite(nums[i + 1])) {
      pts.push({ x: nums[i], y: nums[i + 1] });
    }
  }
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  const targetIdx = Math.min(pts.length - 2, Math.max(0, Math.floor((pts.length - 1) * fraction)));
  const localT = (pts.length - 1) * fraction - targetIdx;
  const a = pts[targetIdx];
  const b = pts[targetIdx + 1];
  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT,
  };
}

function injectAutoStepBadges(svgStr: string, isDark: boolean): string {
  if (typeof document === 'undefined' || !svgStr.includes('flowchart-link')) {
    return svgStr;
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = svgStr;
  const svgEl = tpl.content.querySelector('svg');
  if (!svgEl) return svgStr;

  // Respect native Mermaid step badges whenever edges explicitly declare `step: N`
  if (svgEl.querySelector('.edge-step-badge')) {
    return svgStr;
  }

  const paths = Array.from(svgEl.querySelectorAll<SVGPathElement>('.edgePaths path.flowchart-link'));
  if (paths.length === 0) return svgStr;

  // Detect which edges carry a non-empty label so badges avoid midpoint label collisions
  const labeledIndices = new Set<number>();
  const labelEls = Array.from(svgEl.querySelectorAll('.edgeLabels .edgeLabel'));
  labelEls.forEach((el, idx) => {
    if ((el.textContent ?? '').trim().length > 0) {
      labeledIndices.add(idx);
    }
  });

  const rootGroup = svgEl.querySelector('g.root') ?? svgEl;
  const layer = document.createElementNS(SVG_NS, 'g');
  layer.setAttribute('class', 'edge-step-badges');

  const badgeFill = isDark ? '#0f766e' : '#0d7377';
  const badgeStroke = isDark ? '#111827' : '#ffffff';

  let added = 0;
  paths.forEach((pathEl, idx) => {
    // Place at 22% along the path when the edge carries a midpoint label, else at 50%
    const fraction = labeledIndices.has(idx) ? 0.22 : 0.5;
    const pos = samplePointAlongSvgPath(pathEl, fraction);
    if (!pos) return;

    const stepNum = idx + 1;
    const radius = stepNum >= 100 ? 12 : stepNum >= 10 ? 10.5 : 9.5;
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'edge-step-badge');
    g.setAttribute('transform', `translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`);
    g.setAttribute('pointer-events', 'none');
    g.setAttribute('data-step', String(stepNum));

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', badgeFill);
    circle.setAttribute('stroke', badgeStroke);
    circle.setAttribute('stroke-width', '1.5');

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'Inter, system-ui, sans-serif');
    text.setAttribute('fill', '#ffffff');
    text.textContent = String(stepNum);

    g.appendChild(circle);
    g.appendChild(text);
    layer.appendChild(g);
    added++;
  });

  if (added === 0) return svgStr;
  rootGroup.appendChild(layer);
  return svgEl.outerHTML;
}

function doInit(
  theme: 'dark' | 'light',
  useBase: boolean,
  mermaidTheme?: MermaidBuiltinTheme,
  diagramType?: DiagramType,
  maxTextSize?: number,
  force = false
) {
  // Register lazy icon packs (FA6 + logos + mdi) and lazy tidy-tree layout on
  // the single init path (PERF-01: 0 B eager boot impact; run-once guarded).
  registerFaIconPacks(mermaid);
  registerTidyTreeLayout(mermaid);
  const isDark = theme === 'dark';

  const activeTheme = diagramTheme ?? defaultTheme;
  const isNative = Boolean(!useBase && activeTheme?.isNativeMermaidTheme && activeTheme.baseTheme);
  const resolvedMermaidTheme: MermaidBuiltinTheme = isNative
    ? activeTheme!.baseTheme!
    : (mermaidTheme ?? (useBase ? 'base' : isDark ? 'dark' : 'default'));

  // Mermaid Wardley maps do not support handDrawn look; gracefully fall back to 'neo'.
  const effectiveLook: DiagramLook =
    diagramType === 'wardley' && currentDefaultLook === 'handDrawn' ? 'neo' : currentDefaultLook;

  const resolvedMaxTextSize = maxTextSize ?? LIMITS.MAX_DIAGRAM_SIZE;
  const useCustomThemeVars = Boolean(!useBase && activeTheme && !isNative);
  const themeFamilyKey =
    useCustomThemeVars && diagramType && FAMILY_SCOPED_THEME_TYPES.has(diagramType)
      ? diagramType
      : '';
  const coreColorsKey =
    useCustomThemeVars && activeTheme ? JSON.stringify(activeTheme.coreColors) : '';

  const initSignature = `${isDark ? 1 : 0}|${resolvedMermaidTheme}|${effectiveLook}|${resolvedMaxTextSize}|${useCustomThemeVars ? 1 : 0}|${themeFamilyKey}|${coreColorsKey}`;
  if (!force && initSignature === lastInitSignature) {
    return;
  }

  let themeVars: Record<string, unknown> | undefined;
  if (useCustomThemeVars && activeTheme) {
    // Use family-scoped derivation (preserving nested objects & contrast-safe
    // overrides) for the 10 new families + radar/xyChart while keeping the
    // legacy 8 theme-matrix families bound directly to deriveThemeVariables.
    themeVars =
      diagramType && FAMILY_SCOPED_THEME_TYPES.has(diagramType)
        ? deriveThemeVariablesForDiagramType(activeTheme.coreColors, isDark, diagramType)
        : deriveThemeVariables(activeTheme.coreColors, isDark);
  } else if (!useBase) {
    // Fallback / native Mermaid theme: let Mermaid's built-in theme stylesheet paint natively
    themeVars = undefined;
  }
  // When useBase is true, don't pass themeVariables (frontmatter controls theming)

  mermaid.initialize({
    startOnLoad: false,
    theme: resolvedMermaidTheme,
    layout: 'dagre', // v11-default pin — v12 would default 7 diagram types to ELK
    look: effectiveLook,
    darkMode: isDark,
    htmlLabels: true,
    maxTextSize: resolvedMaxTextSize,
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 14,
    flowchart: { curve: 'basis', padding: 20, useMaxWidth: false, wrappingWidth: 200 }, // v11-default pin — v12 lowers wrappingWidth to 120, freezing node width so bigger fonts grow node height instead of width
    sequence: { useMaxWidth: true, actorMargin: 50 },
    swimlane: { layout: 'swimlane' },
    ...(themeVars && { themeVariables: themeVars }),
  });
  lastInitSignature = initSignature;
}

export function setDefaultLook(look: DiagramLook): void {
  currentDefaultLook = look;
  doInit(currentTheme, false, currentMermaidTheme, undefined, undefined, true);
}

export function getDefaultLook(): DiagramLook {
  return currentDefaultLook;
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
  doInit(theme, false, currentMermaidTheme, undefined, undefined, true);
}

export function setDefaultTheme(theme: MermaidTheme | null) {
  defaultTheme = theme;
  doInit(currentTheme, false, currentMermaidTheme, undefined, undefined, true);
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
  if (!content.includes('edgeLabelBackground')) {
    return null;
  }

  // Try YAML frontmatter format first, then fall back to old init directive format
  const yamlMatch = content.match(YAML_EDGE_LABEL_BG_RE);
  const bg = yamlMatch
    ? yamlMatch[1].trim()
    : (content.match(INIT_EDGE_LABEL_BG_RE)?.[1] ?? null);
  if (!bg) {
    return null;
  }

  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#000000' : '#ffffff';
}

function hasExplicitAncestorColor(el: Element): boolean {
  let curr: Element | null = el;
  while (curr) {
    if ((curr as HTMLElement).style?.color) {
      return true;
    }
    if (curr.classList.contains('edgeLabel')) {
      return false;
    }
    curr = curr.parentElement;
  }
  return false;
}

function fixEdgeLabelTextColor(svgStr: string, textColor: string): string {
  if (!svgStr.includes('edgeLabel')) {
    return svgStr;
  }

  let svgEl: Element | null = null;
  if (typeof document !== 'undefined') {
    const tpl = document.createElement('template');
    tpl.innerHTML = svgStr;
    svgEl = tpl.content.querySelector('svg');
  } else {
    const parser = new DOMParser();
    svgEl = parser.parseFromString(svgStr, 'text/html').querySelector('svg');
  }
  if (!svgEl) {
    return svgStr;
  }

  const labels = svgEl.querySelectorAll('.edgeLabel span, .edgeLabel p');
  if (labels.length === 0) {
    return svgStr;
  }

  let mutated = false;
  for (let i = 0; i < labels.length; i++) {
    const el = labels[i];
    // Preserve per-edge or default `linkStyle ... color:...` set by Mermaid on `.labelBkg` / `.label`
    if (!hasExplicitAncestorColor(el)) {
      (el as HTMLElement).style.color = textColor;
      mutated = true;
    }
  }

  return mutated ? svgEl.outerHTML : svgStr;
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
  const hasCustomTheme = contentDefinesCustomTheme(trimmed);

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
    let { svg } = await mermaid.render(safeId, trimmed);

    svg = sanitizeMermaidSVG(svg);

    if (hasCustomTheme) {
      const textColor = extractEdgeLabelTextColor(content);
      if (textColor) {
        svg = fixEdgeLabelTextColor(svg, textColor);
      }
    }

    if (diagramType === 'flowchart' && contentRequestsStepNumbers(trimmed)) {
      svg = injectAutoStepBadges(svg, currentTheme === 'dark');
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
    if (trimmed.startsWith('---')) {
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
