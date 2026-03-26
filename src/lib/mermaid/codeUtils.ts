export type NodeShape =
  | 'rect' | 'round' | 'stadium' | 'subroutine' | 'cylinder'
  | 'circle' | 'asymmetric' | 'rhombus' | 'hexagon' | 'parallelogram'
  | 'parallelogram-alt' | 'trapezoid' | 'trapezoid-alt';

export interface ParsedNode {
  id: string;
  label: string;
  shape: NodeShape;
  raw: string;
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
];

function parseNodeLabel(raw: string): { label: string; shape: NodeShape } {
  const trimmed = raw.trim();
  for (const pat of SHAPE_PATTERNS) {
    const m = trimmed.match(pat.regex);
    if (m) {return { label: m[1], shape: pat.shape };}
  }
  return { label: trimmed, shape: 'rect' };
}

function shapeWrap(label: string, shape: NodeShape): string {
  switch (shape) {
    case 'rect':            return `[${label}]`;
    case 'round':           return `(${label})`;
    case 'stadium':         return `([${label}])`;
    case 'subroutine':      return `[[${label}]]`;
    case 'cylinder':        return `[(${label})]`;
    case 'circle':          return `((${label}))`;
    case 'rhombus':         return `{${label}}`;
    case 'hexagon':         return `{{${label}}}`;
    case 'asymmetric':      return `>${label}]`;
    case 'parallelogram':   return `[/${label}/]`;
    case 'parallelogram-alt': return `[\\${label}\\]`;
    case 'trapezoid':       return `[/${label}\\]`;
    case 'trapezoid-alt':   return `[\\${label}/]`;
    default:                return `[${label}]`;
  }
}

const STANDALONE_NODE_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)$/;
const ARROW_RE = /-->|---|-.->|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|--\|>|\|>|~~~/;

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

    if (trimmed.startsWith('subgraph') || trimmed === 'end') {continue;}

    // Parse linkStyle lines
    const linkStyleMatch = trimmed.match(/^linkStyle\s+(\d+)\s+(.+)$/);
    if (linkStyleMatch) {continue;}

    if (ARROW_RE.test(trimmed)) {
      const arrowMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)([^\n]*?)\s*(-->|---|-.->|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|--\|>|\|>|~~~)\s*(?:\|([^|]*)\|)?\s*([A-Za-z_][A-Za-z0-9_-]*)([^\n]*)$/);
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
            nodes.push({ id: sourceId, label: srcLabel, shape: srcShape, raw: sourceShapeRaw });
          } else {
            nodes.push({ id: sourceId, label: sourceId, shape: 'rect', raw: sourceId });
          }
        }
        // Parse target label from shape (e.g. B{Is it working?})
        if (!seenIds.has(targetId)) {
          seenIds.add(targetId);
          if (targetShapeRaw) {
            const { label: tgtLabel, shape: tgtShape } = parseNodeLabel(targetShapeRaw);
            nodes.push({ id: targetId, label: tgtLabel, shape: tgtShape, raw: targetShapeRaw });
          } else {
            nodes.push({ id: targetId, label: targetId, shape: 'rect', raw: targetId });
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
      const { label, shape } = parseNodeLabel(rest);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        nodes.push({ id, label, shape, raw: rest });
      }
      continue;
    }

    const standalone = line.match(STANDALONE_NODE_RE);
    if (standalone) {
      const id = standalone[2];
      if (['TD', 'TB', 'BT', 'RL', 'LR', 'end', 'subgraph', 'direction'].includes(id)) {continue;}
      if (!seenIds.has(id)) {
        seenIds.add(id);
        nodes.push({ id, label: id, shape: 'rect', raw: id });
      }
    }
  }

  const linkStyles = parseLinkStyles(source);
  return { nodes, edges, styles, classDefs, nodeClasses, linkStyles };
}

export function updateNodeStyle(source: string, nodeId: string, style: NodeStyle): string {
  const lines = source.split('\n');
  const styleStr = styleToString(style);

  const existingIdx = lines.findIndex(l => l.trim().startsWith(`style ${nodeId} `) || l.trim().startsWith(`style ${nodeId}\t`));
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
    // First try: standalone node definition (nodeId at start of line)
    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {
      const { shape } = parseNodeLabel(nodeMatch[4].trim());
      lines[i] = `${nodeMatch[1]}${nodeId}${nodeMatch[3]}${shapeWrap(newLabel, shape)}`;
      return lines.join('\n');
    }
    // Second try: node defined on an edge line (e.g. A([Start]) --> B{Label})
    if (ARROW_RE.test(line)) {
      const arrowMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)([^\n]*?)\s*(-->|---|-.->|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|--\|>|\|>|~~~)\s*(?:\|([^|]*)\|)?\s*([A-Za-z_][A-Za-z0-9_-]*)([^\n]*)$/);
      if (arrowMatch) {
        // Check source
        if (arrowMatch[1] === nodeId && arrowMatch[2]?.trim()) {
          const { shape } = parseNodeLabel(arrowMatch[2].trim());
          lines[i] = `${nodeId}${shapeWrap(newLabel, shape)}${arrowMatch[3]}${arrowMatch[4] !== undefined ? `|${arrowMatch[4]}|` : ''} ${arrowMatch[5]}${arrowMatch[6] ?? ''}`;
          return lines.join('\n');
        }
        // Check target
        if (arrowMatch[5] === nodeId && arrowMatch[6]?.trim()) {
          const { shape } = parseNodeLabel(arrowMatch[6].trim());
          // Compute position before target using match groups
          const fullMatchEnd = arrowMatch.index + arrowMatch[0].length;
          const targetLen = arrowMatch[5].length + (arrowMatch[6]?.length ?? 0);
          const beforeTarget = line.substring(0, fullMatchEnd - targetLen);
          lines[i] = `${beforeTarget}${nodeId}${shapeWrap(newLabel, shape)}`;
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
    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {
      const { label } = parseNodeLabel(nodeMatch[4].trim());
      lines[i] = `${nodeMatch[1]}${nodeId}${nodeMatch[3]}${shapeWrap(label, newShape)}`;
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
  const re = /^\s*subgraph\s+(\S+)/gm;
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
  const subgraphLabel = label ?? 'New Subgraph';
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
  const block = `${prefix}  subgraph ${subgraphId}["${subgraphLabel}"]\n  end`;

  lines.splice(insertIdx, 0, block);
  return lines.join('\n');
}

export function updateSubgraphLabel(source: string, subgraphId: string, newLabel: string): string {
  const lines = source.split('\n');
  const idPattern = escapeRegex(subgraphId);

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
      lines[i] = `${indent}subgraph ${subgraphId}["${newLabel}"]`;
      return lines.join('\n');
    }

    const inlineMatch = lines[i].match(inlineRe);
    if (inlineMatch) {
      const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
      lines[i] = `${indent}subgraph ${subgraphId}["${newLabel}"]`;
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
        lines[i] = `${indent}subgraph ${subgraphId}["${newLabel}"]`;
        lines.splice(j, 1);
        return lines.join('\n');
      }
      // No label line found — just add bracket label
      const indent = lines[i].match(/^(\s*)/)?.[1] ?? '';
      lines[i] = `${indent}subgraph ${subgraphId}["${newLabel}"]`;
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
    let frontmatterLines: string[] = [];
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
