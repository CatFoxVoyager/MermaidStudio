export type NodeShape =
  | 'rect' | 'round' | 'stadium' | 'subroutine' | 'cylinder'
  | 'circle' | 'asymmetric' | 'rhombus' | 'hexagon' | 'parallelogram'
  | 'parallelogram-alt' | 'trapezoid' | 'trapezoid-alt'
  | 'doc' | 'docs' | 'dbl-circ' | 'cross-circ' | 'bow-rect'
  | 'flip-tri' | 'curv-trap' | 'manual-file' | 'manual-input' | 'procs' | 'paper-tape';

export interface ParsedNode {
  id: string;
  label: string;
  shape: NodeShape;
  raw: string;
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
}

export interface ParsedDiagram {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  styles: Map<string, NodeStyle>;
  classDefs: Map<string, NodeStyle>;
  nodeClasses: Map<string, string[]>;
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
  // v11 new shapes
  { shape: 'doc',            open: '[/', close: '/]',  regex: /^\[\/(.+?)\/\]$/ },  // Document (wavy bottom)
  { shape: 'docs',           open: '[/', close: '/]',  regex: /^\[\/(.+?)\/\]$/ },  // Multi-documents
  { shape: 'dbl-circ',       open: '((', close: '))',  regex: /^\(\((.+?)\)\)$/ },  // Double circle
  { shape: 'cross-circ',     open: '((', close: '))',  regex: /^\(\((.+?)\)\)$/ },  // Crossed circle
  { shape: 'bow-rect',       open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },      // Bow-tie rectangle
  { shape: 'flip-tri',       open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },      // Flipped triangle
  { shape: 'curv-trap',      open: '[/', close: '\\]', regex: /^\[\/(.+?)\\\]$/ },  // Curved trapezoid
  { shape: 'manual-file',    open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },      // Manual file
  { shape: 'manual-input',   open: '[/', close: '/]',  regex: /^\[\/(.+?)\/\]$/ },  // User input
  { shape: 'procs',          open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },      // Process automation
  { shape: 'paper-tape',     open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },      // Paper records
];

function parseNodeLabel(raw: string): { label: string; shape: NodeShape; icon?: IconConfig } {
  const trimmed = raw.trim();

  for (const pat of SHAPE_PATTERNS) {
    const m = trimmed.match(pat.regex);
    if (m) {
      let labelContent = m[1];

      // Check for markdown-style labels (backtick-wrapped) inside the shape
      const markdownMatch = labelContent.match(/^`(.+)`$/);
      if (markdownMatch) {
        labelContent = markdownMatch[1];
      }

      // Check if label contains FontAwesome icon syntax: @{ icon: "fa:user", form: "square", label: "User", pos: "t", h: 60 }
      const innerIconMatch = labelContent.match(/@\{\s*icon:\s*["']([^"']+)["'](?:\s*,\s*form:\s*["']?(\w+)["']?)?(?:\s*,\s*label:\s*["']([^"']*)["'])?(?:\s*,\s*pos:\s*["']?([tblrc])["']?)?(?:\s*,\s*h:\s*(\d+))?\s*\}/);
      if (innerIconMatch) {
        const icon: IconConfig = {
          icon: innerIconMatch[1],
          ...(innerIconMatch[2] && { form: innerIconMatch[2] as 'square' | 'circle' | 'rounded' | 'squircle' }),
          ...(innerIconMatch[3] && { label: innerIconMatch[3] }),
          ...(innerIconMatch[4] && { pos: innerIconMatch[4] as 't' | 'b' | 'l' | 'r' | 'c' }),
          ...(innerIconMatch[5] && { h: parseInt(innerIconMatch[5], 10) }),
        };
        const labelWithoutIcon = labelContent.replace(/@\{[^}]*\}/, '').trim();
        return { label: labelWithoutIcon || labelContent, shape: pat.shape, icon };
      }
      return { label: labelContent, shape: pat.shape };
    }
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
    // v11 new shapes - use @{ shape: "name" } syntax
    case 'doc':             return `@{ shape: "doc", label: "${label}" }`;
    case 'docs':            return `@{ shape: "docs", label: "${label}" }`;
    case 'dbl-circ':        return `@{ shape: "dbl-circ", label: "${label}" }`;
    case 'cross-circ':      return `@{ shape: "cross-circ", label: "${label}" }`;
    case 'bow-rect':        return `@{ shape: "bow-rect", label: "${label}" }`;
    case 'flip-tri':        return `@{ shape: "flip-tri", label: "${label}" }`;
    case 'curv-trap':       return `@{ shape: "curv-trap", label: "${label}" }`;
    case 'manual-file':     return `@{ shape: "manual-file", label: "${label}" }`;
    case 'manual-input':    return `@{ shape: "manual-input", label: "${label}" }`;
    case 'procs':           return `@{ shape: "procs", label: "${label}" }`;
    case 'paper-tape':      return `@{ shape: "paper-tape", label: "${label}" }`;
    default:                return `[${label}]`;
  }
}

const STANDALONE_NODE_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)$/;

function parseStyleValue(val: string): NodeStyle {
  const style: NodeStyle = {};
  val.split(';').forEach(part => {
    const [k, v] = part.trim().split(':').map(s => s.trim());
    if (!k || !v) {return;}
    if (k === 'fill') {style.fill = v;}
    else if (k === 'stroke') {style.stroke = v;}
    else if (k === 'stroke-width') {style.strokeWidth = v;}
    else if (k === 'color') {style.color = v;}
  });
  return style;
}

function styleToString(style: NodeStyle): string {
  const parts: string[] = [];
  if (style.fill !== undefined) {parts.push(`fill:${style.fill}`);}
  if (style.stroke !== undefined) {parts.push(`stroke:${style.stroke}`);}
  if (style.strokeWidth !== undefined) {parts.push(`stroke-width:${style.strokeWidth}`);}
  if (style.color !== undefined) {parts.push(`color:${style.color}`);}
  return parts.join(',');
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

    if (trimmed.startsWith('linkStyle') || trimmed.startsWith('subgraph') || trimmed === 'end') {continue;}

    // Parse and skip click events
    if (trimmed.startsWith('click ')) {
      continue;
    }

    // Parse and skip subgraph direction
    if (trimmed.startsWith('direction ')) {
      continue;
    }

    const edgeMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*?)\s*(?:\[([^\]]*)\])?\s*(--\|>|-->|---|-.->|-\.->|==>|-->>|\.->|<-->|o--o|--o|o--|~~~|x--x|\|>)[^\n]*/);
    if (edgeMatch) {
      const sourceId = edgeMatch[1];
      if (!seenIds.has(sourceId)) {
        seenIds.add(sourceId);
        nodes.push({ id: sourceId, label: sourceId, shape: 'rect', raw: sourceId });
      }

      const arrowMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*?)((?:\[[^\]]*\])?)\s*(--\|>|-->|---|-.->|-\.->|==>|-->>|\.->|<-->|o--o|--o|o--|~~~|x--x|\|>)\|?([^|]*)?\|?\s*([A-Za-z_][A-Za-z0-9_-]*?)((?:\[[^\]]*\]|(?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|>)[^\n]*)?)/);
      if (arrowMatch) {
        const targetId = arrowMatch[5];
        if (!seenIds.has(targetId)) {
          seenIds.add(targetId);
          nodes.push({ id: targetId, label: targetId, shape: 'rect', raw: targetId });
        }
        edges.push({ source: sourceId, target: targetId, arrowType: arrowMatch[3], label: arrowMatch[4]?.trim() ?? '', raw: trimmed });
      }
      continue;
    }

    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch) {
      const id = nodeMatch[2];
      const rest = nodeMatch[4].trim();
      const { label, shape, icon } = parseNodeLabel(rest);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        nodes.push({ id, label, shape, raw: rest, icon });
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

  return { nodes, edges, styles, classDefs, nodeClasses };
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
    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {
      const { shape } = parseNodeLabel(nodeMatch[4].trim());
      lines[i] = `${nodeMatch[1]}${nodeId}${nodeMatch[3]}${shapeWrap(newLabel, shape)}`;
      return lines.join('\n');
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

    const edgeRe = new RegExp(`(^|\\s)${nodeId}(\\s*)(-->|---|-.->|-\\.->|==>|-->>|\\.->|<-->|o--o|--|~~~)`);
    const edgeRe2 = new RegExp(`(-->|---|-.->|-\\.->|==>|-->>|\\.->|<-->|o--o|--|~~~)[^\\n]*\\s${nodeId}\\s*$`);
    if (edgeRe.test(trimmed) || edgeRe2.test(trimmed)) {return false;}

    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[)[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {return false;}

    return true;
  });
  return lines.join('\n');
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
