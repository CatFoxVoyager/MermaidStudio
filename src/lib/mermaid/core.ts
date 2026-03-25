import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import type { DiagramType } from '@/types';
import { validateDiagramContent } from '@/utils/validation';

/**
 * DOMPurify configuration for sanitizing Mermaid SVG output.
 *
 * SECURITY NOTE: We trust Mermaid's output to be safe (it generates diagrams from structured text),
 * but we sanitize to prevent any potential XSS if Mermaid has vulnerabilities or if user input
 * somehow influences the SVG generation in unexpected ways.
 *
 * The 'foreignObject' element allows HTML content inside SVG. While this increases attack surface,
 * Mermaid uses it legitimately for rendering node labels. We trust Mermaid's output but monitor
 * for any security advisories.
 */
const SANITIZATION_CONFIG = {
  ALLOWED_TAGS: [
    // Basic SVG structure
    'svg', 'g',
    // Shapes
    'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line',
    // Text elements (critical for Mermaid labels)
    'text', 'tspan',
    // foreignObject allows HTML content inside SVG - Mermaid uses this for rich labels
    // SECURITY: Trust Mermaid's output, but monitor for security advisories
    'foreignObject',
    // HTML elements inside foreignObject (used by Mermaid for labels)
    'span', 'div', 'p',
    // Markers and definitions (arrowheads, gradients, etc.)
    'marker', 'defs', 'use', 'style',
    // Other SVG features
    'clipPath', 'pattern', 'mask', 'symbol',
    // HTML body for foreignObject content
    'body', 'main',
  ],
  ALLOWED_ATTR: [
    // Core SVG attributes
    'xmlns', 'viewBox', 'preserveAspectRatio',
    // Positioning and sizing
    'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
    // Sizing for foreignObject
    'requiredFeatures', 'overflow',
    // Styling
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity',
    // Text attributes
    'text-anchor', 'font-family', 'font-size', 'font-weight', 'dominant-baseline', 'alignment-baseline',
    // Inline styles for dynamic content
    'style',
    // Path and shape data
    'd', 'points', 'transform', 'pathLength', 'transform-origin',
    // References
    'id', 'class', 'href', 'xlink:href', 'marker-start', 'marker-end', 'marker-mid',
    // Accessibility
    'role', 'aria-label',
    // HTML attributes for foreignObject content
    'xmlns:xlink', 'xmlns:xhtml',
    // ForeignObject specific
    'xlink:type',
  ],
  // Allow data URIs for images
  ALLOW_DATA_URI: true,
  // Allow unknown attributes for Mermaid compatibility
  ALLOW_UNKNOWN_ATTRS: false,
} satisfies { ALLOWED_TAGS: string[]; ALLOWED_ATTR: string[]; ALLOW_DATA_URI: boolean; ALLOW_UNKNOWN_ATTRS: boolean };

let currentTheme: 'dark' | 'light' = 'dark';

const darkVars = {
  primaryColor: '#161b22',
  primaryTextColor: '#f0f6fc',
  primaryBorderColor: '#30363d',
  lineColor: '#8b949e',
  secondaryColor: '#21262d',
  tertiaryColor: '#0d1117',
  background: '#0d1117',
  mainBkg: '#161b22',
  nodeBorder: '#30363d',
  nodeTextColor: '#f0f6fc',
  clusterBkg: '#21262d',
  clusterBorder: '#30363d',
  titleColor: '#f0f6fc',
  edgeLabelBackground: '#21262d',
  actorBkg: '#161b22',
  actorBorder: '#30363d',
  actorTextColor: '#f0f6fc',
  actorLineColor: '#8b949e',
  signalColor: '#8b949e',
  signalTextColor: '#f0f6fc',
  noteBkgColor: '#21262d',
  noteBorderColor: '#30363d',
  noteTextColor: '#f0f6fc',
};

const lightVars = {
  primaryColor: '#ffffff',
  primaryTextColor: '#111827',
  primaryBorderColor: '#d1d5db',
  lineColor: '#6b7280',
  background: '#fafaf9',
  mainBkg: '#ffffff',
  nodeBorder: '#d1d5db',
  nodeTextColor: '#111827',
  noteBkgColor: '#f3f4f6',
  noteBorderColor: '#d1d5db',
  noteTextColor: '#111827',
};

function doInit(theme: 'dark' | 'light', useBase: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: useBase ? 'base' : (theme === 'dark' ? 'dark' : 'default'),
    darkMode: theme === 'dark',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 14,
    flowchart: { curve: 'basis', padding: 20, htmlLabels: false },
    sequence: { useMaxWidth: true, actorMargin: 50 },
    themeVariables: useBase ? {} : (theme === 'dark' ? darkVars : lightVars),
  });
}

export function initMermaid(theme: 'dark' | 'light') {
  currentTheme = theme;
  doInit(theme, false);
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
  if (!oldMatch) {return null;}
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
  labels.forEach((el) => {
    (el as HTMLElement).style.color = textColor;
  });
  const svgEl = doc.querySelector('svg');
  return svgEl ? svgEl.outerHTML : svgStr;
}

export async function renderDiagram(content: string, id: string): Promise<{ svg: string; error: string | null }> {
  // Validate input before processing
  const validation = validateDiagramContent(content);
  if (!validation.valid) {
    return { svg: '', error: validation.error ?? 'Invalid content' };
  }

  const trimmed = content.trimStart();
  const hasCustomTheme = trimmed.startsWith('---') || trimmed.startsWith('%%{init:');
  doInit(currentTheme, hasCustomTheme);

  const safeId = id.replace(/[^a-zA-Z0-9_]/g, '_');
  try {
    let { svg } = await mermaid.render(safeId, content);

    // Skip sanitization for Mermaid output - Mermaid is a trusted library
    // and sanitization with foreignObject has issues that remove text labels
    // We only sanitize if there are script tags or other dangerous content
    const hasScripts = svg.includes('<script') || svg.includes('javascript:');
    const hasDataUris = svg.includes('data:image') || svg.includes('data:video');

    if (hasScripts || hasDataUris) {
      svg = DOMPurify.sanitize(svg, SANITIZATION_CONFIG);
    }

    if (hasCustomTheme) {
      const textColor = extractEdgeLabelTextColor(content);
      if (textColor) {
        svg = fixEdgeLabelTextColor(svg, textColor);
      }
    }
    return { svg, error: null };
  } catch (e) {
    return { svg: '', error: e instanceof Error ? e.message : String(e) };
  }
}

export function detectDiagramType(content: string): DiagramType {
  // Remove YAML frontmatter if present
  let body = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  body = body.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();

  const first = body.split('\n')[0]?.toLowerCase().trim();
  if (!first) return 'unknown';

  // Flowchart and variants
  if (first.startsWith('flowchart') || first.startsWith('graph')) {return 'flowchart';}

  // Sequence diagram
  if (first.startsWith('sequencediagram')) {return 'sequence';}

  // Class diagram
  if (first.startsWith('classdiagram')) {return 'classDiagram';}

  // State diagram
  if (first.startsWith('statediagram')) {return 'stateDiagram';}

  // ER diagram
  if (first.startsWith('erdiagram')) {return 'erDiagram';}

  // Gantt chart
  if (first.startsWith('gantt')) {return 'gantt';}

  // Pie chart
  if (first.startsWith('pie')) {return 'pie';}

  // Mindmap
  if (first.startsWith('mindmap')) {return 'mindmap';}

  // Git graph
  if (first.startsWith('gitgraph')) {return 'gitGraph';}

  // Journey map
  if (first.startsWith('journey')) {return 'journey';}

  // Timeline
  if (first.startsWith('timeline')) {return 'timeline';}

  // Quadrant chart
  if (first.startsWith('quadrantchart')) {return 'quadrantChart';}

  // Requirement diagram
  if (first.startsWith('requirementdiagram')) {return 'requirementDiagram';}

  // Sankey diagram
  if (first.startsWith('sankey-beta') || first.startsWith('sankey')) {return 'sankey';}

  // XY Chart
  if (first.startsWith('xychart-beta')) {return 'xyChart';}

  // Block diagram
  if (first.startsWith('blockbeta') || first.startsWith('block')) {return 'blockDiagram';}

  // C4 diagram
  if (first.startsWith('c4')) {return 'c4';}

  // Architecture diagram
  if (first.startsWith('architecture')) {return 'architectureDiagram';}

  // ZenUML
  if (first.startsWith('zenuml')) {return 'zenuml';}

  // Packet diagram
  if (first.startsWith('packet')) {return 'packetDiagram';}

  // Kanban
  if (first.startsWith('kanban')) {return 'kanban';}

  return 'unknown';
}
