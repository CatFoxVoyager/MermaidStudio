export type NodeShape =
  | 'rect' | 'round' | 'stadium' | 'subroutine' | 'cylinder'
  | 'circle' | 'asymmetric' | 'rhombus' | 'hexagon' | 'parallelogram'
  | 'parallelogram-alt' | 'trapezoid' | 'trapezoid-alt'
  | 'doc' | 'docs' | 'dbl-circ' | 'cross-circ' | 'bow-rect'
  | 'flip-tri' | 'curv-trap' | 'manual-file' | 'manual-input' | 'procs' | 'paper-tape';

export interface ParsedSubgraph {
  id: string;
  label: string;
  parentSubgraphId: string | null;
}

export interface ParsedNode {
  id: string;
  label: string;
  shape: NodeShape;
  raw: string;
  parentSubgraphId?: string | null;
  icon?: IconConfig;
}

export interface IconConfig {
  icon: string;
  form?: 'square' | 'circle' | 'rounded' | 'squircle';
  label?: string;
  pos?: 't' | 'b' | 'l' | 'r' | 'c';
  h?: number;
}

export interface ParsedEdge {
  source: string;
  target: string;
  arrowType: string;
  label: string;
  raw: string;
}

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  color?: string;
  strokeDasharray?: string;  // e.g., "5 5" for dashed
  fontWeight?: string;       // e.g., "bold", "normal"
  fontSize?: string;         // e.g., "16px", "14px"
  rx?: string;              // e.g., "10"
  ry?: string;              // e.g., "10"
  opacity?: string;         // e.g., "0.5"
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: string;
  strokeDasharray?: string;  // e.g., "5 5" for dashed
  opacity?: string;          // e.g., "0.5"
}

export interface ParsedDiagram {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  styles: Map<string, NodeStyle>;
  classDefs: Map<string, NodeStyle>;
  nodeClasses: Map<string, string[]>;
  linkStyles: Map<number, EdgeStyle>;
  subgraphs: ParsedSubgraph[];
}

const SHAPE_PATTERNS: Array<{ shape: NodeShape; open: string; close: string; regex: RegExp }> = [
  { shape: 'stadium',        open: '([', close: '])',   regex: /^\(\[(.+?)\]\)$/ },
  { shape: 'subroutine',     open: '[[', close: ']]',  regex: /^\[\[(.+?)\]\]$/ },
  { shape: 'cylinder',       open: '[(', close: ')]',  regex: /^\[\((.+?)\)\]$/ },
  { shape: 'circle',         open: '((', close: '))',  regex: /^\(\((.+?)\)\)$/ },
  { shape: 'hexagon',        open: '{{', close: '}}',  regex: /^\{\{(.+?)\}\}$/ },
  { shape: 'rhombus',        open: '{',  close: '}',   regex: /^\{(.+?)\}$/ },
  { shape: 'round',          open: '(',  close: ')',   regex: /^\((.+?)\)$/ },
  { shape: 'asymmetric',     open: '>',  close: ']',   regex: /^>(.+?)\]$/ },
  { shape: 'parallelogram',  open: '[/', close: '/]',  regex: /^\[\/(.+?)\/\]$/ },
  { shape: 'parallelogram-alt', open: '[\\', close: '\\]', regex: /^\[\\(.+?)\\\]$/ },
  { shape: 'trapezoid',      open: '[/', close: '\\]', regex: /^\[\/(.+?)\\\]$/ },
  { shape: 'trapezoid-alt',  open: '[\\', close: '/]', regex: /^\[\\(.+?)\/\]$/ },
  { shape: 'rect',           open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },
  // Quoted variants (Mermaid v11: ["label"], ("label"), etc.)
  { shape: 'rect',           open: '["', close: '"]',  regex: /^\["(.+?)"\]$/ },
  { shape: 'round',          open: '("', close: '")',  regex: /^\("(.+?)"\)$/ },
  { shape: 'stadium',        open: '(["', close: '"])', regex: /^\(\["(.+?)"\]\)$/ },
  { shape: 'subroutine',     open: '["', close: '"]',  regex: /^\["(.+?)"\]$/ },
  { shape: 'rhombus',        open: '{"', close: '"}',  regex: /^\{"(.+?)"\}$/ },
  { shape: 'hexagon',        open: '{{"', close: '"}}', regex: /^\{\{"(.+?)"\}\}$/ },
  { shape: 'circle',         open: '("', close: '")',  regex: /^\(\("(.+?)"\)\)$/ },
  { shape: 'cylinder',       open: '["', close: '")',  regex: /^\[\("(.+?)"\)\]$/ },
  { shape: 'asymmetric',     open: '>"', close: '"]',  regex: /^>"(.+?)"\]$/ },
];

const V11_SHAPES: NodeShape[] = [
  'doc', 'docs', 'dbl-circ', 'cross-circ', 'bow-rect',
  'flip-tri', 'curv-trap', 'manual-file', 'manual-input', 'procs', 'paper-tape',
];

function parseNodeLabel(raw: string): { label: string; shape: NodeShape; quoted: boolean; icon?: IconConfig } {
  const trimmed = raw.trim();

  // Check for v11 @{ shape: "...", label: "..." } syntax first
  const v11Match = trimmed.match(/^@\{\s*shape:\s*["']?(\w[\w-]*)["']?\s*(?:,\s*label:\s*["']([^"']*)["'])?/);
  if (v11Match) {
    const shapeName = v11Match[1];
    const label = v11Match[2] ?? shapeName;
    if (V11_SHAPES.includes(shapeName as NodeShape)) {
      return { label, shape: shapeName as NodeShape, quoted: true };
    }
  }

  // Check for v11 @{ icon: "fa:user", form: "square", label: "User", pos: "t", h: 60 } syntax
  const iconMatch = trimmed.match(/^@\{\s*icon:\s*["']([^"']+)["']\s*(?:,\s*form:\s*["']?(\w+)["']?)?\s*(?:,\s*label:\s*["']([^"']*)["'])?\s*(?:,\s*pos:\s*["']?([tblrc])["']?)?\s*(?:,\s*h:\s*(\d+))?\s*\}/);
  if (iconMatch) {
    return {
      label: iconMatch[3] ?? iconMatch[1],
      shape: 'rect',
      quoted: false,
      icon: {
        icon: iconMatch[1],
        ...(iconMatch[2] ? { form: iconMatch[2] as IconConfig['form'] } : {}),
        ...(iconMatch[3] ? { label: iconMatch[3] } : {}),
        ...(iconMatch[4] ? { pos: iconMatch[4] as IconConfig['pos'] } : {}),
        ...(iconMatch[5] ? { h: parseInt(iconMatch[5], 10) } : {}),
      },
    };
  }

  // Check for empty brackets (e.g. [], (), {}, [[]], (()), etc.)
  const EMPTY_SHAPES: Array<{ shape: NodeShape; open: string; close: string }> = [
    { shape: 'stadium',        open: '([', close: '])' },
    { shape: 'subroutine',     open: '[[', close: ']]' },
    { shape: 'cylinder',       open: '[(', close: ')]' },
    { shape: 'circle',         open: '((', close: '))' },
    { shape: 'hexagon',        open: '{{', close: '}}' },
    { shape: 'rhombus',        open: '{',  close: '}' },
    { shape: 'round',          open: '(',  close: ')' },
    { shape: 'asymmetric',     open: '>',  close: ']' },
    { shape: 'parallelogram',  open: '[/', close: '/]' },
    { shape: 'parallelogram-alt', open: '[\\', close: '\\]' },
    { shape: 'trapezoid',      open: '[/', close: '\\]' },
    { shape: 'trapezoid-alt',  open: '[\\', close: '/]' },
    { shape: 'rect',           open: '[',  close: ']' },
  ];
  for (const es of EMPTY_SHAPES) {
    if (trimmed === `${es.open}${es.close}`) {
      return { label: '', shape: es.shape, quoted: false };
    }
  }

  for (const pat of SHAPE_PATTERNS) {
    const m = trimmed.match(pat.regex);
    if (m) {
      let label = m[1];
      const quoted = pat.open.startsWith('"') || pat.open.endsWith('"');
      // Strip markdown backticks from label
      const mdMatch = label.match(/^`(.+)`$/);
      if (mdMatch) {
        label = mdMatch[1];
      }
      // Check if label contains @{ icon: ... } or @{ shape: ... } syntax
      const innerV11 = label.match(/^@\{\s*shape:\s*["']?(\w[\w-]*)["']?\s*(?:,\s*label:\s*["']([^"']*)["'])?/);
      if (innerV11) {
        const shapeName = innerV11[1];
        const v11Label = innerV11[2] ?? shapeName;
        if (V11_SHAPES.includes(shapeName as NodeShape)) {
          return { label: v11Label, shape: shapeName as NodeShape, quoted: true };
        }
      }
      const innerIcon = label.match(/^@\{\s*icon:\s*["']([^"']+)["']\s*(?:,\s*form:\s*["']?(\w+)["']?)?\s*(?:,\s*label:\s*["']([^"']*)["'])?\s*(?:,\s*pos:\s*["']?([tblrc])["']?)?\s*(?:,\s*h:\s*(\d+))?\s*\}/);
      if (innerIcon) {
        return {
          label: innerIcon[3] ?? innerIcon[1],
          shape: pat.shape,
          quoted,
          icon: {
            icon: innerIcon[1],
            ...(innerIcon[2] ? { form: innerIcon[2] as IconConfig['form'] } : {}),
            ...(innerIcon[3] ? { label: innerIcon[3] } : {}),
            ...(innerIcon[4] ? { pos: innerIcon[4] as IconConfig['pos'] } : {}),
            ...(innerIcon[5] ? { h: parseInt(innerIcon[5], 10) } : {}),
          },
        };
      }
      return { label, shape: pat.shape, quoted };
    }
  }
  return { label: trimmed, shape: 'rect', quoted: false };
}

function shapeWrap(label: string, shape: NodeShape, quoted = false): string {
  // Only add quotes when explicitly requested (quoted=true) OR when label contains special characters AND quoted is not explicitly false
  // If quoted is explicitly false, never add quotes regardless of content
  const needsQuotes = quoted === false ? false : (quoted || /[^a-zA-Z0-9_-]/.test(label));
  const q = '"';
  const l = needsQuotes ? `${q}${label}${q}` : label;

  switch (shape) {
    case 'rect':            return `[${l}]`;
    case 'round':           return `(${l})`;
    case 'stadium':         return `([${l}])`;
    case 'subroutine':      return `[[${l}]]`;
    case 'cylinder':        return `[(${l})]`;
    case 'circle':          return `((${l}))`;
    case 'rhombus':         return `{${l}}`;
    case 'hexagon':         return `{{${l}}}`;
    case 'asymmetric':      return `>${l}]`;
    case 'parallelogram':   return `[/${l}/]`;
    case 'parallelogram-alt': return `[\\${l}\\]`;
    case 'trapezoid':       return `[/${l}\\]`;
    case 'trapezoid-alt':   return `[\\${l}/]`;
    // v11 new shapes - use @{ shape: "name" } syntax
    case 'doc':             return `@{ shape: "doc", label: ${q}${label}${q} }`;
    case 'docs':            return `@{ shape: "docs", label: ${q}${label}${q} }`;
    case 'dbl-circ':        return `@{ shape: "dbl-circ", label: ${q}${label}${q} }`;
    case 'cross-circ':      return `@{ shape: "cross-circ", label: ${q}${label}${q} }`;
    case 'bow-rect':        return `@{ shape: "bow-rect", label: ${q}${label}${q} }`;
    case 'flip-tri':        return `@{ shape: "flip-tri", label: ${q}${label}${q} }`;
    case 'curv-trap':       return `@{ shape: "curv-trap", label: ${q}${label}${q} }`;
    case 'manual-file':     return `@{ shape: "manual-file", label: ${q}${label}${q} }`;
    case 'manual-input':    return `@{ shape: "manual-input", label: ${q}${label}${q} }`;
    case 'procs':           return `@{ shape: "procs", label: ${q}${label}${q} }`;
    case 'paper-tape':      return `@{ shape: "paper-tape", label: ${q}${label}${q} }`;
    default:                return `[${l}]`;
  }
}

const STANDALONE_NODE_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)$/;
const ARROW_RE = /-->|---|--\|>|\|>|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|~~~/;

export function parseStyleValue(val: string): NodeStyle {
  const style: NodeStyle = {};
  // Try comma split first (classDef format), fall back to semicolon (style format)
  const separator = val.includes(',') && !val.includes(';') ? ',' : ';';
  val.split(separator).forEach(part => {
    const [k, v] = part.trim().split(':').map(s => s.trim());
    if (!k || !v) {return;}
    if (k === 'fill') {style.fill = v;}
    else if (k === 'stroke') {style.stroke = v;}
    else if (k === 'stroke-width') {style.strokeWidth = v;}
    else if (k === 'stroke-dasharray') {style.strokeDasharray = v;}
    else if (k === 'color') {style.color = v;}
    else if (k === 'font-weight') {style.fontWeight = v;}
    else if (k === 'font-size') {style.fontSize = v;}
    else if (k === 'rx') {style.rx = v;}
    else if (k === 'ry') {style.ry = v;}
    else if (k === 'opacity') {style.opacity = v;}
  });
  return style;
}

export function styleToString(style: NodeStyle): string {
  const parts: string[] = [];
  if (style.fill !== undefined) {parts.push(`fill:${style.fill}`);}
  if (style.stroke !== undefined) {parts.push(`stroke:${style.stroke}`);}
  if (style.strokeWidth !== undefined) {parts.push(`stroke-width:${style.strokeWidth}`);}
  if (style.strokeDasharray !== undefined) {parts.push(`stroke-dasharray:${style.strokeDasharray}`);}
  if (style.color !== undefined) {parts.push(`color:${style.color}`);}
  if (style.fontWeight !== undefined) {parts.push(`font-weight:${style.fontWeight}`);}
  if (style.fontSize !== undefined) {parts.push(`font-size:${style.fontSize}`);}
  if (style.rx !== undefined) {parts.push(`rx:${style.rx}`);}
  if (style.ry !== undefined) {parts.push(`ry:${style.ry}`);}
  if (style.opacity !== undefined) {parts.push(`opacity:${style.opacity}`);}
  return parts.join(',');
}

export function parseLinkStyles(source: string): Map<number, EdgeStyle> {
  const linkStyles = new Map<number, EdgeStyle>();
  const lines = source.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^linkStyle\s+(\d+)\s+(.+)$/);
    if (match) {
      const index = parseInt(match[1], 10);
      const styleStr = match[2];
      linkStyles.set(index, parseEdgeStyleValue(styleStr));
    }
  }

  return linkStyles;
}

function parseEdgeStyleValue(val: string): EdgeStyle {
  const style: EdgeStyle = {};
  const separator = val.includes(',') && !val.includes(';') ? ',' : ';';
  val.split(separator).forEach(part => {
    const [k, v] = part.trim().split(':').map(s => s.trim());
    if (!k || !v) {return;}
    if (k === 'stroke') {style.stroke = v;}
    else if (k === 'stroke-width') {style.strokeWidth = v;}
    else if (k === 'stroke-dasharray') {style.strokeDasharray = v;}
    else if (k === 'opacity') {style.opacity = v;}
  });
  return style;
}

export function edgeStyleToString(style: EdgeStyle): string {
  const parts: string[] = [];
  if (style.stroke !== undefined) {parts.push(`stroke:${style.stroke}`);}
  if (style.strokeWidth !== undefined) {parts.push(`stroke-width:${style.strokeWidth}`);}
  if (style.strokeDasharray !== undefined) {parts.push(`stroke-dasharray:${style.strokeDasharray}`);}
  if (style.opacity !== undefined) {parts.push(`opacity:${style.opacity}`);}
  return parts.join(',');
}

export function updateLinkStyle(source: string, edgeIndex: number, style: EdgeStyle): string {
  const lines = source.split('\n');
  const styleStr = edgeStyleToString(style);

  const existingIdx = lines.findIndex(l => {
    const t = l.trim();
    return t.match(new RegExp(`^linkStyle\\s+${edgeIndex}\\s+`));
  });

  const styleLine = `linkStyle ${edgeIndex} ${styleStr}`;

  if (existingIdx !== -1) {
    if (styleStr) {
      lines[existingIdx] = styleLine;
    } else {
      lines.splice(existingIdx, 1);
    }
  } else if (styleStr) {
    // Append after the last linkStyle line or at the end
    let insertIdx = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('linkStyle')) {
        insertIdx = i + 1;
        break;
      }
    }
    lines.splice(insertIdx, 0, styleLine);
  }

  return lines.join('\n');
}

export function removeLinkStyles(source: string, indices: number[]): string {
  const indicesToRemove = new Set(indices);
  const lines = source.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    const match = trimmed.match(/^linkStyle\s+(\d+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      return !indicesToRemove.has(idx);
    }
    return true;
  });
  const result = filtered.join('\n').replace(/\n{3,}/g, '\n\n');
  if (source.endsWith('\n')) {
    return result.trimEnd() + '\n';
  }
  return result.trimEnd();
}

/** Split an edge line into: [beforeArrow, arrowType, edgeLabel, afterArrow] */
function splitEdgeLine(line: string): [string, string, string, string] | null {
  const arrowMatch = line.match(/(-->|---|-.->|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|--\|>|\|>|~~~)/);
  if (!arrowMatch) return null;
  const beforeArrow = line.substring(0, arrowMatch.index);
  const arrow = arrowMatch[0];
  const rest = line.substring(arrowMatch.index + arrow.length);
  // Extract edge label if present: |label|
  const labelMatch = rest.match(/^\|([^|]*)\|\s*(.*)/);
  if (labelMatch) {
    return [beforeArrow, arrow, labelMatch[1], labelMatch[2]];
  }
  return [beforeArrow, arrow, '', rest];
}

export function updateEdgeArrowType(source: string, srcId: string, tgtId: string, newType: string): string {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith(srcId)) continue;
    const parts = splitEdgeLine(trimmed);
    if (!parts) continue;
    const [, , label, after] = parts;
    // Verify target ID appears after the arrow+label
    const tgtRe = new RegExp(`\\b${escapeRegex(tgtId)}\\b`);
    if (!tgtRe.test(after)) continue;
    lines[i] = lines[i].replace(trimmed, `${parts[0].trimEnd()} ${newType}${label ? `|${label}|` : ''} ${after.trimStart()}`);
    return lines.join('\n');
  }
  return source;
}

export function updateEdgeLabel(source: string, srcId: string, tgtId: string, newLabel: string): string {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith(srcId)) continue;
    const parts = splitEdgeLine(trimmed);
    if (!parts) continue;
    const [before, arrow, , after] = parts;
    const tgtRe = new RegExp(`\\b${escapeRegex(tgtId)}\\b`);
    if (!tgtRe.test(after)) continue;
    lines[i] = lines[i].replace(trimmed, `${before.trimEnd()} ${arrow}${newLabel ? `|${newLabel}|` : ''} ${after.trimStart()}`);
    return lines.join('\n');
  }
  return source;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseDiagram(source: string): ParsedDiagram {
  const lines = source.split('\n');
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const styles = new Map<string, NodeStyle>();
  const classDefs = new Map<string, NodeStyle>();
  const nodeClasses = new Map<string, string[]>();
  const seenIds = new Set<string>();
  const subgraphs: ParsedSubgraph[] = [];
  const subgraphStack: string[] = []; // stack of subgraph IDs

  const currentParent = (): string | null => subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) {continue;}

    if (trimmed.match(/^(flowchart|graph)\s/i)) {continue;}

    if (trimmed.startsWith('style ')) {
      const rest = trimmed.slice(6).trim();
      const spaceIdx = rest.search(/\s/);
      if (spaceIdx !== -1) {
        const nodeId = rest.slice(0, spaceIdx);
        const styleStr = rest.slice(spaceIdx).trim();
        styles.set(nodeId, parseStyleValue(styleStr));
      }
      continue;
    }

    if (trimmed.startsWith('classDef ')) {
      const rest = trimmed.slice(9).trim();
      const spaceIdx = rest.search(/\s/);
      if (spaceIdx !== -1) {
        const className = rest.slice(0, spaceIdx);
        const styleStr = rest.slice(spaceIdx).trim();
        classDefs.set(className, parseStyleValue(styleStr));
      }
      continue;
    }

    if (trimmed.startsWith('class ')) {
      const rest = trimmed.slice(6).trim();
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        const ids = parts[0].split(',');
        const cls = parts[1];
        ids.forEach(id => {
          const existing = nodeClasses.get(id) ?? [];
          if (!existing.includes(cls)) {existing.push(cls);}
          nodeClasses.set(id, existing);
        });
      }
      continue;
    }

    // Handle subgraph lines
    if (trimmed.startsWith('subgraph')) {
      const subgraphMatch = trimmed.match(/^subgraph\s+([A-Za-z_][A-Za-z0-9_-]*)/);
      if (subgraphMatch) {
        const sgId = subgraphMatch[1];
        // Extract label from bracket format: id["label"] or id[label]
        const bracketLabel = trimmed.match(/\[(?:"([^"]*)"|'([^']*)'|([^\]]*))\]/);
        const sgLabel = bracketLabel
          ? (bracketLabel[1] ?? bracketLabel[2] ?? bracketLabel[3]?.trim()) ?? sgId
          : sgId;
        subgraphs.push({ id: sgId, label: sgLabel, parentSubgraphId: currentParent() });
        subgraphStack.push(sgId);
      }
      continue;
    }

    if (trimmed === 'end') {
      if (subgraphStack.length > 0) {
        subgraphStack.pop();
      }
      continue;
    }

    // Parse linkStyle lines
    const linkStyleMatch = trimmed.match(/^linkStyle\s+(\d+)\s+(.+)$/);
    if (linkStyleMatch) {continue;}

    // Skip click events
    if (trimmed.startsWith('click ')) {continue;}

    // Skip subgraph direction
    if (trimmed.startsWith('direction ')) {continue;}

    const parentId = currentParent();

    if (ARROW_RE.test(trimmed)) {
      const arrowMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*?)([^\n]*?)\s*(-->|---|--\|>|\|>|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|~~~)\s*(?:\|([^|]*)\|)?\s*([A-Za-z_][A-Za-z0-9_-]*)([^\n]*)$/);
      if (arrowMatch) {
        const sourceId = arrowMatch[1];
        const sourceShapeRaw = arrowMatch[2]?.trim();
        const targetId = arrowMatch[5];
        const targetShapeRaw = arrowMatch[6]?.trim();

        // Ensure source node exists
        if (!seenIds.has(sourceId)) {
          seenIds.add(sourceId);
          if (sourceShapeRaw) {
            const { label: srcLabel, shape: srcShape } = parseNodeLabel(sourceShapeRaw);
            nodes.push({ id: sourceId, label: srcLabel, shape: srcShape, raw: sourceShapeRaw, parentSubgraphId: parentId });
          } else {
            nodes.push({ id: sourceId, label: sourceId, shape: 'rect', raw: sourceId, parentSubgraphId: parentId });
          }
        }
        // Parse target label from shape (e.g. B{Is it working?})
        if (!seenIds.has(targetId)) {
          seenIds.add(targetId);
          if (targetShapeRaw) {
            const { label: tgtLabel, shape: tgtShape } = parseNodeLabel(targetShapeRaw);
            nodes.push({ id: targetId, label: tgtLabel, shape: tgtShape, raw: targetShapeRaw, parentSubgraphId: parentId });
          } else {
            nodes.push({ id: targetId, label: targetId, shape: 'rect', raw: targetId, parentSubgraphId: parentId });
          }
        } else if (targetShapeRaw) {
          const existing = nodes.find(n => n.id === targetId);
          if (existing && existing.label === existing.id) {
            const { label: tgtLabel, shape: tgtShape } = parseNodeLabel(targetShapeRaw);
            existing.label = tgtLabel;
            existing.shape = tgtShape;
          }
        }
        edges.push({ source: sourceId, target: targetId, arrowType: arrowMatch[3], label: arrowMatch[4]?.trim() ?? '', raw: trimmed });
      }
      continue;
    }

    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch && !ARROW_RE.test(trimmed)) {
      const id = nodeMatch[2];
      const rest = nodeMatch[4].trim();
      const { label, shape, icon } = parseNodeLabel(rest);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        nodes.push({ id, label, shape, raw: rest, parentSubgraphId: parentId, ...(icon ? { icon } : {}) });
      }
      continue;
    }

    const standalone = line.match(STANDALONE_NODE_RE);
    if (standalone) {
      const id = standalone[2];
      if (['TD', 'TB', 'BT', 'RL', 'LR', 'end', 'subgraph', 'direction'].includes(id)) {continue;}
      if (!seenIds.has(id)) {
        seenIds.add(id);
        nodes.push({ id, label: id, shape: 'rect', raw: id, parentSubgraphId: parentId });
      }
    }
  }

  const linkStyles = parseLinkStyles(source);
  return { nodes, edges, styles, classDefs, nodeClasses, linkStyles, subgraphs };
}

export function updateNodeStyle(source: string, nodeId: string, newStyle: NodeStyle): string {
  const lines = source.split('\n');

  // Find existing direct style line for this node
  const existingIdx = lines.findIndex(l => l.trim().startsWith(`style ${nodeId} `) || l.trim().startsWith(`style ${nodeId}\t`));

  // Get existing style to merge with new style
  let mergedStyle: NodeStyle = {};
  if (existingIdx !== -1) {
    const line = lines[existingIdx];
    const match = line.match(/^style\s+\S+\s+(.+)$/);
    if (match) {
      const existingStyle = parseStyleValue(match[1]);
      mergedStyle = { ...existingStyle, ...newStyle };
    } else {
      mergedStyle = newStyle;
    }
  } else {
    mergedStyle = newStyle;
  }

  const styleStr = styleToString(mergedStyle);
  const styleLine = `style ${nodeId} ${styleStr}`;

  if (existingIdx !== -1) {
    if (styleStr) {
      lines[existingIdx] = styleLine;
    } else {
      lines.splice(existingIdx, 1);
    }
  } else if (styleStr) {
    lines.push(styleLine);
  }

  return lines.join('\n');
}

export function updateNodeLabel(source: string, nodeId: string, newLabel: string): string {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // First try: standalone node definition (nodeId at start of line, no arrow on the line)
    // Matches both A[label] and A["label"] style definitions
    if (!ARROW_RE.test(line)) {
      const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[|\(\[")["']?[^\n]+)/);
      if (nodeMatch && nodeMatch[2] === nodeId) {
        const { shape } = parseNodeLabel(nodeMatch[4].trim());
        lines[i] = `${nodeMatch[1]}${nodeId}${nodeMatch[3]}${shapeWrap(newLabel, shape, false)}`;
        return lines.join('\n');
      }
    }
    // Second try: node defined on an edge line (e.g. A([Start]) --> B{Label})
    if (ARROW_RE.test(line)) {
      const arrowMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)([^\n]*?)\s*(-->|---|-.->|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|--\|>|\|>|~~~)\s*(?:\|([^|]*)\|)?\s*([A-Za-z_][A-Za-z0-9_-]*)([^\n]*)$/);
      if (arrowMatch) {
        // Check source (with or without explicit shape)
        if (arrowMatch[1] === nodeId) {
          if (arrowMatch[2]?.trim()) {
            // Node has explicit shape
            const { shape } = parseNodeLabel(arrowMatch[2].trim());
            lines[i] = `${nodeId}${shapeWrap(newLabel, shape, false)}${arrowMatch[3]}${arrowMatch[4] !== undefined ? `|${arrowMatch[4]}|` : ''}${arrowMatch[6] ? ' ' : ''}${arrowMatch[5]}${arrowMatch[6] ?? ''}`;
          } else {
            // Node has no explicit shape, add one with the new label
            lines[i] = `${nodeId}${shapeWrap(newLabel, 'rect', false)}${arrowMatch[3]}${arrowMatch[4] !== undefined ? `|${arrowMatch[4]}|` : ''}${arrowMatch[6] ? ' ' : ''}${arrowMatch[5]}${arrowMatch[6] ?? ''}`;
          }
          return lines.join('\n');
        }
        // Check target (with or without explicit shape)
        if (arrowMatch[5] === nodeId) {
          // Find target ID position in the line, after the arrow and optional edge label
          // (avoids matching the ID inside edge labels or node shapes)
          const arrowEndPos = arrowMatch[0].indexOf(arrowMatch[3]) + arrowMatch[3].length;
          let searchFrom = arrowEndPos;
          if (arrowMatch[4] !== undefined) {
            // Skip past |edgeLabel|
            const pipeOpen = arrowMatch[0].indexOf('|', searchFrom);
            if (pipeOpen !== -1) {
              const pipeClose = arrowMatch[0].indexOf('|', pipeOpen + 1);
              if (pipeClose !== -1) {
                searchFrom = pipeClose + 1;
              }
            }
          }
          const targetInMatch = arrowMatch[0].indexOf(arrowMatch[5], searchFrom);
          const beforeTarget = line.substring(0, (arrowMatch.index ?? 0) + targetInMatch);

          if (arrowMatch[6]?.trim()) {
            // Node has explicit shape
            const { shape } = parseNodeLabel(arrowMatch[6].trim());
            lines[i] = `${beforeTarget}${nodeId}${shapeWrap(newLabel, shape, false)}`;
          } else {
            // Node has no explicit shape, add one with the new label
            lines[i] = `${beforeTarget}${nodeId}${shapeWrap(newLabel, 'rect', false)}`;
          }
          return lines.join('\n');
        }
      }
    }
  }
  return source;
}

export function updateNodeShape(source: string, nodeId: string, newShape: NodeShape): string {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[|\(\[")["']?[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {
      const { label, quoted } = parseNodeLabel(nodeMatch[4].trim());
      lines[i] = `${nodeMatch[1]}${nodeId}${nodeMatch[3]}${shapeWrap(label, newShape, quoted)}`;
      return lines.join('\n');
    }
  }
  return source;
}

export function addNode(source: string, id: string, label: string, shape: NodeShape): string {
  const lines = source.split('\n');
  const insertIdx = lines.length > 1 ? lines.length - 1 : 1;
  const newLine = `  ${id}${shapeWrap(label, shape)}`;
  lines.splice(insertIdx, 0, newLine);
  return lines.join('\n');
}

export function removeNode(source: string, nodeId: string): string {
  const lines = source.split('\n').filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith(`style ${nodeId} `)) {return false;}
    if (trimmed.startsWith(`style ${nodeId}\t`)) {return false;}
    if (trimmed.startsWith(`class ${nodeId} `)) {return false;}

    const edgeRe = new RegExp(`(^|\\s)${nodeId}(\\s*)(-->|---|-.->|-\\.->|==>|x--x|\\.->|<-->|o--o|--|~~~)`);
    const edgeRe2 = new RegExp(`(-->|---|-.->|-\\.->|==>|x--x|\\.->|<-->|o--o|--|~~~)[^\\n]*\\s${nodeId}\\s*$`);
    if (edgeRe.test(trimmed) || edgeRe2.test(trimmed)) {return false;}

    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {return false;}

    return true;
  });
  return lines.join('\n');
}

export function removeNodeStyles(source: string, nodeIds: string[]): string {
  const ids = new Set(nodeIds);
  const lines = source.split('\n');
  const classNamesToRemove = new Set<string>();

  // First pass: find classDef classNames used by the target nodes
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('class ')) {
      const rest = trimmed.slice(6).trim();
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        const idsInLine = parts[0].split(',').map(id => id.trim());
        if (idsInLine.some(id => ids.has(id))) {
          classNamesToRemove.add(parts[1]);
        }
      }
    }
  }

  // Second pass: remove style, class assignment, and classDef lines
  const filtered = lines.filter(line => {
    const trimmed = line.trim();

    // Remove style lines for target nodes
    for (const id of ids) {
      if (trimmed.startsWith(`style ${id} `) || trimmed.startsWith(`style ${id}\t`)) {
        return false;
      }
    }

    // Remove class assignment lines for target nodes
    if (trimmed.startsWith('class ')) {
      const rest = trimmed.slice(6).trim();
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        const idsInLine = parts[0].split(',').map(id => id.trim());
        if (idsInLine.some(id => ids.has(id))) {
          return false;
        }
      }
    }

    // Remove classDef lines that are only used by target nodes
    if (trimmed.startsWith('classDef ')) {
      const rest = trimmed.slice(9).trim();
      const spaceIdx = rest.search(/\s/);
      if (spaceIdx !== -1) {
        const className = rest.slice(0, spaceIdx);
        if (classNamesToRemove.has(className)) {
          return false;
        }
      }
    }

    return true;
  });

  // Clean up excessive blank lines
  const result = filtered.join('\n').replace(/\n{3,}/g, '\n\n');
  // Preserve original trailing newline behavior
  if (source.endsWith('\n')) {
    return result.trimEnd() + '\n';
  }
  return result.trimEnd();
}

export function addEdge(source: string, sourceId: string, targetId: string, arrowType = '-->', label = ''): string {
  const lines = source.split('\n');
  const edgeLine = label
    ? `  ${sourceId} ${arrowType}|${label}| ${targetId}`
    : `  ${sourceId} ${arrowType} ${targetId}`;
  lines.push(edgeLine);
  return lines.join('\n');
}

export function getNodeStyle(styles: Map<string, NodeStyle>, classDefs: Map<string, NodeStyle>, nodeClasses: Map<string, string[]>, nodeId: string): NodeStyle {
  const directStyle = styles.get(nodeId) ?? {};
  const classes = nodeClasses.get(nodeId) ?? [];
  const classStyle: NodeStyle = {};
  for (const cls of classes) {
    const def = classDefs.get(cls);
    if (def) {Object.assign(classStyle, def);}
  }
  return { ...classStyle, ...directStyle };
}

export function generateNodeId(existingIds: string[]): string {
  const set = new Set(existingIds);
  let i = 1;
  while (set.has(`node${i}`)) {i++;}
  return `node${i}`;
}

function generateSubgraphId(source: string): string {
  const existingIds = new Set<string>();
  const re = /^\s*subgraph\s+(\w+)/gm;
  let m;
  while ((m = re.exec(source)) !== null) {
    existingIds.add(m[1]);
  }
  let i = 1;
  while (existingIds.has(`subgraph${i}`)) { i++; }
  return `subgraph${i}`;
}

function isMetaLine(trimmed: string): boolean {
  return (
    trimmed.startsWith('style ') ||
    trimmed.startsWith('classDef ') ||
    trimmed.startsWith('class ') ||
    trimmed.startsWith('linkStyle ')
  );
}

export function addSubgraph(source: string, id?: string, label?: string): string {
  const subgraphId = id ?? generateSubgraphId(source);
  const subgraphLabel = label ?? 'Subgraph';
  const lines = source.split('\n');

  let insertIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isMetaLine(lines[i].trim())) {
      insertIdx = i;
    } else if (lines[i].trim() === 'end' || lines[i].trim() === '') {
      // Skip trailing blank lines and end keywords
    } else {
      break;
    }
  }

  const prefix = insertIdx > 0 && lines[insertIdx - 1].trim() !== '' ? '\n' : '';
  const needsQuotes = /[^a-zA-Z0-9_-]/.test(subgraphLabel);
  const labelFormat = needsQuotes ? `["${subgraphLabel}"]` : `[${subgraphLabel}]`;
  const block = `${prefix}  subgraph ${subgraphId}${labelFormat}\n  end`;

  lines.splice(insertIdx, 0, block);
  return lines.join('\n');
}

export function updateSubgraphLabel(source: string, subgraphId: string, newLabel: string): string {
  const lines = source.split('\n');
  const idPattern = escapeRegex(subgraphId);

  // Helper to format subgraph label with or without quotes
  const formatSubgraphLabel = (label: string): string => {
    const needsQuotes = /[^a-zA-Z0-9_-]/.test(label);
    return needsQuotes ? `["${label}"]` : `[${label}]`;
  };

  // Match bracket format: subgraph id["label"] or subgraph id[label]
  const bracketRe = new RegExp(`^(\\s*subgraph\\s+${idPattern})\\[["']?[^"\\]]*["']?\\]`, '');
  // Match inline format: subgraph id label
  const inlineRe = new RegExp(`^(\\s*subgraph\\s+${idPattern})\\s+(?!\\[)\\S`, '');
  // Match bare subgraph id (label on next line)
  const bareRe = new RegExp(`^\\s*subgraph\\s+${idPattern}\\s*$`, '');

  for (let i = 0; i < lines.length; i++) {
    const bracketMatch = lines[i].match(bracketRe);
    if (bracketMatch) {
      const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
      lines[i] = `${indent}subgraph ${subgraphId}${formatSubgraphLabel(newLabel)}`;
      return lines.join('\n');
    }

    const inlineMatch = lines[i].match(inlineRe);
    if (inlineMatch) {
      const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
      lines[i] = `${indent}subgraph ${subgraphId}${formatSubgraphLabel(newLabel)}`;
      return lines.join('\n');
    }

    if (bareRe.test(lines[i])) {
      // Label is on the next non-empty, non-end line
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed === '' || nextTrimmed === 'end' || nextTrimmed.startsWith('subgraph') || nextTrimmed.startsWith('direction')) {
          continue;
        }
        // Remove the old label line and convert to bracket format
        const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
        lines[i] = `${indent}subgraph ${subgraphId}${formatSubgraphLabel(newLabel)}`;
        lines.splice(j, 1);
        return lines.join('\n');
      }
      // No label line found — just add bracket label
      const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
      lines[i] = `${indent}subgraph ${subgraphId}${formatSubgraphLabel(newLabel)}`;
      return lines.join('\n');
    }
  }
  return source;
}

export interface FrontmatterConfig {
  title?: string;
  config?: Record<string, unknown>;
}

export function parseFrontmatter(content: string): { frontmatter: FrontmatterConfig; body: string } {
  const lines = content.split('\n');
  let currentLine = 0;

  // Check for YAML frontmatter format (---...---)
  if (lines[0]?.trim() === '---') {
    const frontmatterLines: string[] = [];
    let foundEnd = false;
    currentLine++; // Skip opening ---

    while (currentLine < lines.length) {
      const line = lines[currentLine];
      if (line.trim() === '---') {
        foundEnd = true;
        currentLine++;
        break;
      }
      frontmatterLines.push(line);
      currentLine++;
    }

    if (foundEnd) {
      const body = lines.slice(currentLine).join('\n').trim();
      const parsed = parseYamlFrontmatter(frontmatterLines.join('\n'));
      // The YAML format has a top-level 'config' key that contains the actual config
      const config = (parsed.config as Record<string, unknown>) || parsed;
      return { frontmatter: { title: (config.title as string | undefined), config }, body };
    }
  }

  // Check for old init directive format (%%{init:...}%%)
  if (lines[0]?.startsWith('%%{init:')) {
    let initBlock = '';
    let foundEnd = false;

    while (currentLine < lines.length) {
      const line = lines[currentLine];
      initBlock += line + '\n';

      if (line.trim().endsWith('%%')) {
        foundEnd = true;
        currentLine++;
        break;
      }
      currentLine++;
    }

    if (foundEnd) {
      const body = lines.slice(currentLine).join('\n').trim();

      try {
        const configMatch = initBlock.match(/%%\{init:\s*({[\s\S]*?})\s*\}\)%%/);
        if (configMatch) {
          const config = JSON.parse(configMatch[1]);
          return {
            frontmatter: {
              title: config.title,
              config,
            },
            body,
          };
        }
      } catch {
        // Invalid JSON, treat as no frontmatter
      }
    }
  }

  return { frontmatter: {}, body: content };
}

function parseYamlFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');

  // Stack for tracking nested objects: [object, indentLevel]
  const stack: Array<[Record<string, unknown>, number]> = [[result, -1]];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith('%%')) continue;

    const indent = line.search(/\S/);
    const colonIdx = trimmed.indexOf(':');

    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();

    // Find the appropriate parent by popping from stack
    while (stack.length > 1 && stack[stack.length - 1][1] >= indent) {
      stack.pop();
    }

    const [parentObj] = stack[stack.length - 1];

    if (!rest) {
      // This is a nested object key
      const newObj: Record<string, unknown> = {};
      parentObj[key] = newObj;
      stack.push([newObj, indent]);
    } else {
      // This is a leaf value
      parentObj[key] = parseYamlValue(rest);
    }
  }

  return result;
}

function parseYamlValue(value: string): unknown {
  // Remove quotes if present
  if ((value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }

  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }

  // Try to parse as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value;
}

export function generateFrontmatter(config: Record<string, unknown>): string {
  return `---\nconfig:\n${objectToYaml(config, 2)}---`;
}

function objectToYaml(obj: Record<string, unknown>, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${objectToYaml(value as Record<string, unknown>, indent + 2)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n${spaces}  - ${(value as unknown[]).join('\n' + spaces + '  - ')}\n`;
    } else if (typeof value === 'string') {
      result += `${spaces}${key}: '${value}'\n`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}

interface SubgraphRegion {
  id: string;
  startLineIdx: number;
  endLineIdx: number;
  indent: string;
}

function findSubgraphRegions(lines: string[]): SubgraphRegion[] {
  const regions: SubgraphRegion[] = [];
  const stack: { id: string; startLineIdx: number; indent: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('subgraph')) {
      const match = trimmed.match(/^subgraph\s+([A-Za-z_][A-Za-z0-9_-]*)/);
      if (match) {
        const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
        stack.push({ id: match[1], startLineIdx: i, indent });
      }
    } else if (trimmed === 'end' && stack.length > 0) {
      const entry = stack.pop()!;
      regions.push({ id: entry.id, startLineIdx: entry.startLineIdx, endLineIdx: i, indent: entry.indent });
    }
  }

  return regions;
}

/** Find the line index of a node's standalone declaration, or the first edge line it appears on */
function findNodeLine(lines: string[], nodeId: string): number {
  const idPattern = new RegExp(`\\b${escapeRegex(nodeId)}\\b`);

  // First: look for standalone declaration (nodeId[Label], nodeId(Label), etc.)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(nodeId) && !ARROW_RE.test(trimmed) && !trimmed.startsWith('style ') && !trimmed.startsWith('class ')) {
      // Matches standalone node pattern
      if (trimmed.match(new RegExp(`^${escapeRegex(nodeId)}(\\[|\\(|\\{|>|\\/)`))) {
        return i;
      }
    }
  }

  // Second: look for node on an edge line
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (ARROW_RE.test(trimmed) && idPattern.test(trimmed)) {
      return i;
    }
  }

  // Third: look for bare node ID
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === nodeId) {
      return i;
    }
  }

  return -1;
}

/**
 * Move a node to a subgraph (or to root if targetSubgraphId is null).
 * Returns the modified source string, or the original if no changes needed.
 */
export function moveNodeToSubgraph(source: string, nodeId: string, targetSubgraphId: string | null): string {
  const lines = source.split('\n');
  const regions = findSubgraphRegions(lines);

  // Find the standalone declaration line for the node
  let standaloneIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(nodeId) && !ARROW_RE.test(trimmed) && !trimmed.startsWith('style ') && !trimmed.startsWith('class ') && !trimmed.startsWith('linkStyle ')) {
      // Matches standalone node pattern: nodeId[Label], nodeId(Label], etc.
      if (trimmed.match(new RegExp(`^${escapeRegex(nodeId)}(\\[|\\(|\\{|>|\\/)`))) {
        standaloneIdx = i;
        break;
      }
      // Bare node ID (just the id on its own)
      if (trimmed === nodeId) {
        standaloneIdx = i;
        break;
      }
    }
  }

  // If no standalone declaration, find the first edge line the node appears on
  let edgeLineIdx = -1;
  if (standaloneIdx === -1) {
    const idPattern = new RegExp(`\\b${escapeRegex(nodeId)}\\b`);
    for (let i = 0; i < lines.length; i++) {
      if (ARROW_RE.test(lines[i]) && idPattern.test(lines[i])) {
        edgeLineIdx = i;
        break;
      }
    }
  }

  // Use whichever we found
  const nodeLineIdx = standaloneIdx !== -1 ? standaloneIdx : edgeLineIdx;
  if (nodeLineIdx === -1) return source;

  // Find current subgraph of the node
  let currentSubgraphId: string | null = null;
  for (const region of regions) {
    if (nodeLineIdx > region.startLineIdx && nodeLineIdx < region.endLineIdx) {
      currentSubgraphId = region.id;
    }
  }

  // No-op: already in target
  if (currentSubgraphId === targetSubgraphId) return source;

  const isStandalone = standaloneIdx !== -1;

  // Only remove the line if it's a standalone declaration (not an edge)
  if (isStandalone) {
    const nodeLine = lines[standaloneIdx];
    lines.splice(standaloneIdx, 1);
  }

  // Recalculate regions after removal (line indices shifted)
  const updatedRegions = findSubgraphRegions(lines);

  // Build the line to insert
  const trimmedNodeLine = isStandalone
    ? source.split('\n')[standaloneIdx]?.trim() ?? nodeId
    : nodeId;

  if (targetSubgraphId === null) {
    // Move to root: insert before first subgraph or after last node/edge
    let insertIdx = lines.length;
    if (updatedRegions.length > 0) {
      insertIdx = updatedRegions[0].startLineIdx;
      // Skip backwards over blank lines
      while (insertIdx > 0 && lines[insertIdx - 1].trim() === '') {
        insertIdx--;
      }
    } else {
      // Find last content line (node/edge)
      for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (t && !t.startsWith('style ') && !t.startsWith('classDef ') && !t.startsWith('class ') && !t.startsWith('linkStyle ')) {
          insertIdx = i + 1;
          break;
        }
      }
    }

    const rootIndent = '  ';
    lines.splice(insertIdx, 0, `${rootIndent}${trimmedNodeLine}`);
  } else {
    // Move into a target subgraph
    const targetRegion = updatedRegions.find(r => r.id === targetSubgraphId);
    if (!targetRegion) return source;

    // Insert before the 'end' line of the target subgraph
    const endLineIdx = targetRegion.endLineIdx;
    const subgraphIndent = targetRegion.indent;
    const contentIndent = subgraphIndent + '  ';

    lines.splice(endLineIdx, 0, `${contentIndent}${trimmedNodeLine}`);
  }

  return lines.join('\n');
}

// ===== Preset Management =====

export type PresetType = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface PresetColors {
  primaryColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
}

/**
 * Apply a preset to nodes using classDef
 * Creates/updates a classDef for the preset and assigns nodes to it
 */
export function applyNodePreset(source: string, nodeIds: string[], presetType: PresetType, colors: PresetColors): string {
  if (nodeIds.length === 0) return source;

  const lines = source.split('\n');
  const className = `preset${presetType.charAt(0).toUpperCase() + presetType.slice(1)}`;

  // Get the color for this preset - use the actual theme colors passed in
  const colorMap: Record<PresetType, keyof PresetColors> = {
    primary: 'primaryColor',
    success: 'successColor',
    warning: 'warningColor',
    danger: 'errorColor',
    info: 'infoColor',
  };

  const color = colors[colorMap[presetType]];

  // Create or update the classDef - use black border for all presets
  const classDefLine = `classDef ${className} fill:${color},stroke:#000000,color:#000000`;
  const classDefIdx = lines.findIndex(l => l.trim().startsWith(`classDef ${className}`));

  if (classDefIdx !== -1) {
    lines[classDefIdx] = classDefLine;
  } else {
    // Find a good place to insert the classDef (after existing classDefs or near the end)
    let insertIdx = lines.length;
    const lastClassDefIdx = lines.map(l => l.trim()).map((t, i) => ({ t, i }))
      .filter(x => x.t.startsWith('classDef '))
      .pop();

    if (lastClassDefIdx) {
      insertIdx = lastClassDefIdx.i + 1;
    } else {
      // Find last style/class line
      for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (t.startsWith('style ') || t.startsWith('class ') || t.startsWith('linkStyle ')) {
          insertIdx = i + 1;
          break;
        }
      }
    }

    lines.splice(insertIdx, 0, classDefLine);
  }

  // Assign nodes to the class
  for (const nodeId of nodeIds) {
    const classLine = `class ${nodeId} ${className}`;
    const existingClassIdx = lines.findIndex(l => {
      const trimmed = l.trim();
      return trimmed.startsWith(`class ${nodeId} `) || trimmed.startsWith(`class ${nodeId}\t`);
    });

    if (existingClassIdx !== -1) {
      // Append to existing class assignment
      const existingLine = lines[existingClassIdx];
      if (!existingLine.includes(className)) {
        lines[existingClassIdx] = existingLine.trim() + ',' + className;
      }
    } else {
      // Find the line after the node definition to insert the class line
      const nodeIdx = lines.findIndex(l => {
        const trimmed = l.trim();
        // Check if line contains the node (as standalone or in edge)
        return new RegExp(`(^|\\s)${nodeId}(\\s|\\[|\\(|\\{|$)`).test(l);
      });

      if (nodeIdx !== -1) {
        // Insert after the node line
        let insertAfter = nodeIdx;
        // Find the end of multi-line node definition if any
        while (insertAfter + 1 < lines.length && /^[\x5B\x5D{}]|\s|,/.test(lines[insertAfter + 1].trim())) {
          insertAfter++;
        }
        lines.splice(insertAfter + 1, 0, `  ${classLine}`);
      } else {
        // Node not found, add at end
        lines.push(`  ${classLine}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Update all preset classDef colors when theme changes
 * Finds all preset classDef lines and updates their colors
 */
export function updatePresetColors(source: string, colors: PresetColors): string {
  const lines = source.split('\n');

  const colorMap: Record<string, string> = {
    presetPrimary: colors.primaryColor,
    presetSuccess: colors.successColor,
    presetWarning: colors.warningColor,
    presetDanger: colors.errorColor,
    presetInfo: colors.infoColor,
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    for (const [className, color] of Object.entries(colorMap)) {
      if (trimmed.startsWith(`classDef ${className}`)) {
        // Update the classDef with new colors - use black border for all presets
        lines[i] = `classDef ${className} fill:${color},stroke:#000000,color:#000000`;
        break;
      }
    }
  }

  return lines.join('\n');
}

/**
 * Check if a node uses a preset class
 */
export function getNodePreset(source: string, nodeId: string): PresetType | null {
  const lines = source.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`class ${nodeId} `) || trimmed.startsWith(`class ${nodeId}\t`)) {
      const rest = trimmed.slice(6).trim();
      const classNames = rest.split(',').map(c => c.trim());
      for (const cn of classNames) {
        if (cn.startsWith('preset')) {
          const preset = cn.replace('preset', '').toLowerCase();
          if (['primary', 'success', 'warning', 'danger', 'info'].includes(preset)) {
            return preset as PresetType;
          }
        }
      }
    }
  }
  return null;
}
