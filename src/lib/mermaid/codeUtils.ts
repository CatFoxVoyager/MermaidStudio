// 38-02: canonical migration window — the union carries ALL 53 canonical
// shortNames (the shapes.ts SSOT vocabulary) PLUS the 13 legacy delimiter
// keys and the 4 legacy alias keys they replace. Legacy members stay until
// plan 06 sheds them; every PARSE already resolves to canonical through
// directiveShapeKey (toDirectiveShapeName), and every directive EMISSION
// routes through the same choke point, so a legacy key never reaches an
// emitted @{ shape: ... } span (mermaid 12 throws on round / rhombus /
// parallelogram / parallelogram-alt / trapezoid-alt / asymmetric there —
// probe-verified).
export type NodeShape =
  // 53 canonical shortNames (dist declaration order).
  | 'rect' | 'rounded' | 'stadium' | 'fr-rect' | 'cyl' | 'datastore' | 'folder'
  | 'bucket' | 'console' | 'browser' | 'person' | 'circle' | 'bang' | 'cloud'
  | 'diam' | 'hex' | 'lean-r' | 'lean-l' | 'trap-b' | 'trap-t' | 'dbl-circ'
  | 'text' | 'notch-rect' | 'lin-rect' | 'sm-circ' | 'fr-circ' | 'fork'
  | 'hourglass' | 'brace' | 'brace-r' | 'braces' | 'bolt' | 'doc' | 'delay'
  | 'h-cyl' | 'lin-cyl' | 'curv-trap' | 'div-rect' | 'tri' | 'win-pane'
  | 'f-circ' | 'notch-pent' | 'flip-tri' | 'sl-rect' | 'docs' | 'st-rect'
  | 'bow-rect' | 'cross-circ' | 'tag-doc' | 'tag-rect' | 'flag' | 'odd'
  | 'lin-doc'
  // Legacy delimiter keys — bracket emissions keep them byte-identical
  // until plan 06 deletes the members.
  | 'round' | 'subroutine' | 'cylinder' | 'asymmetric' | 'rhombus' | 'hexagon'
  | 'parallelogram' | 'parallelogram-alt' | 'trapezoid' | 'trapezoid-alt'
  // Phase 27: high-value directive shapes — mermaid 12 shape-registry keys
  // with no legacy delimiter form; the at-brace span is their only syntax.
  // (The canonical members of this row are listed above; these four are
  // legacy alias tokens retained for the migration window — shapeWrap emits
  // their canonical targets, never the alias literal.)
  | 'manual-file' | 'manual-input' | 'procs' | 'paper-tape';

// 38-01/38-02: codeUtils' first import. shapes.ts is core-free (PERF-01,
// locked in bundlePerf PARSER_ONLY_FILES), so this stays parser-only.
import { toDirectiveShapeName, CANONICAL_SHAPES, CANONICAL_SHORT_NAMES } from './shapes';

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
  /** Full original at-brace span, verbatim, when the node was defined by one. */
  directiveRaw?: string;
  /** Verbatim unknown key/value slices from the span, in original order. */
  unknownParams?: string[];
  /**
   * 38-02 (SHP-02): the verbatim user-authored shape token when it is not
   * already a canonical shortName — alias tokens (card), legacy keys
   * (asymmetric), and unresolvable tokens (RECT) keep their authored form
   * here instead of being silently discarded into rect. Undefined for
   * canonical tokens; populated by the directive parse paths only.
   */
  authoredShape?: string;
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
  /** Bare 12.3 edge id attached before this hop's arrow (`e1@-->`), when present. */
  edgeId?: string;
}

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  color?: string;
  strokeDasharray?: string;  // e.g., "5 5" for dashed
  fontWeight?: string;       // e.g., "bold", "normal"
  fontSize?: string;         // e.g., "16px", "14px"
  fontFamily?: string;       // e.g., "Arial", "Courier"
  rx?: string;              // e.g., "10"
  ry?: string;              // e.g., "10"
  opacity?: string;         // e.g., "0.5"
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: string;
  strokeDasharray?: string;  // e.g., "5 5" for dashed
  opacity?: string;          // e.g., "0.5"
  fontSize?: string;         // e.g., "14px"
  fontWeight?: string;       // e.g., "bold"
  fill?: string;             // Label background color
  fillOpacity?: string;      // Label background opacity
  color?: string;            // Label text color
}

export interface ParsedDiagram {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  styles: Map<string, NodeStyle>;
  classDefs: Map<string, NodeStyle>;
  nodeClasses: Map<string, string[]>;
  linkStyles: Map<number | 'default', EdgeStyle>;
  subgraphs: ParsedSubgraph[];
  /**
   * 38-03 (SHP-06): standalone `id@{...}` lines that do NOT define a node —
   * edge-id metadata lines (`e1@{ animate: true }`) and subgraph directive
   * lines (`SG@{ view: collapsed }`) — linked to their entity id for cascade
   * deletion. The lines are stored VERBATIM and their contents are never
   * interpreted here (the P6 blind spot stays uninterpreted; Phase 40 /
   * EDGE-05 owns interpretation). Deletion mutators consult this registry so
   * removing an entity removes its own directive footprint and nothing else.
   */
  linkedDirectives: Map<string, string[]>;
}

const SHAPE_PATTERNS: Array<{ shape: NodeShape; open: string; close: string; regex: RegExp }> = [
  // 38-02: quoted variants sit IMMEDIATELY BEFORE their plain family entry —
  // behind it they were dead code (the plain lazy regex matched first with
  // the quote characters inside the label), and the canonical sweep's
  // "re-emits re-parsing identical" contract needs quoted re-emissions to
  // parse back to the bare label. All quoted forms are the COMPACT spellings
  // — the spaced [[ "x" ]] / [( "x" )] forms are REJECTED by mermaid 12.3
  // flow.jison (probe-verified, 38-02); the compact quoted slant forms
  // (lean/trap families, new in 38-02) probe PARSE OK. Delimiters and plain
  // regexes are byte-unchanged from the pre-38-02 table.
  { shape: 'stadium',        open: '(["', close: '"])', regex: /^\(\["(.+?)"\]\)$/ },
  { shape: 'stadium',        open: '([', close: '])',   regex: /^\(\[(.+?)\]\)$/ },
  // P7 (38-02): the quoted fr-rect entry with a regex DISTINCT from the
  // quoted rect entry it used to byte-duplicate (rect won first and this
  // entry was unreachable — rect's quoted entry now sits behind every other
  // family, fr-rect's quoted form claims [[ "x" ]] first).
  { shape: 'fr-rect',        open: '[["', close: '"]]', regex: /^\[\["(.+?)"\]\]$/ },
  { shape: 'fr-rect',        open: '[[', close: ']]',  regex: /^\[\[(.+?)\]\]$/ },
  { shape: 'cyl',            open: '[("', close: '")]', regex: /^\[\("(.+?)"\)\]$/ },
  { shape: 'cyl',            open: '[(', close: ')]',  regex: /^\[\((.+?)\)\]$/ },
  // Phase 26: double-circle legacy triple-paren wrap. Quoted variant FIRST
  // (so quote chars never leak into the label), and BOTH entries above the
  // circle entry below — circle's greedy two-paren regex otherwise steals
  // every triple-paren input and the outer parens end up inside the label.
  { shape: 'dbl-circ', open: '((("', close: '")))', regex: /^\(\(\("(.+?)"\)\)\)$/ },
  { shape: 'dbl-circ', open: '(((',  close: ')))',  regex: /^\(\(\((.+?)\)\)\)$/ },
  { shape: 'circle',         open: '(("', close: '"))', regex: /^\(\("(.+?)"\)\)$/ },
  { shape: 'circle',         open: '((', close: '))',  regex: /^\(\((.+?)\)\)$/ },
  // 38-02 re-key: shape values are canonical shortNames — the parse side
  // speaks the registry vocabulary (rhombus→diam, round→rounded,
  // asymmetric→odd, parallelogram→lean-r, parallelogram-alt→lean-l,
  // trapezoid→trap-b, trapezoid-alt→trap-t, hexagon→hex).
  { shape: 'hex',            open: '{{"', close: '"}}', regex: /^\{\{"(.+?)"\}\}$/ },
  { shape: 'hex',            open: '{{', close: '}}',  regex: /^\{\{(.+?)\}\}$/ },
  { shape: 'diam',           open: '{"', close: '"}',  regex: /^\{"(.+?)"\}$/ },
  { shape: 'diam',           open: '{',  close: '}',   regex: /^\{(.+?)\}$/ },
  { shape: 'rounded',        open: '("', close: '")',  regex: /^\("(.+?)"\)$/ },
  { shape: 'rounded',        open: '(',  close: ')',   regex: /^\((.+?)\)$/ },
  { shape: 'odd',            open: '>"', close: '"]',  regex: /^>"(.+?)"\]$/ },
  { shape: 'odd',            open: '>',  close: ']',   regex: /^>(.+?)\]$/ },
  { shape: 'lean-r',         open: '[/"', close: '/"]', regex: /^\[\/"(.+?)"\/\]$/ },
  { shape: 'lean-r',         open: '[/', close: '/]',  regex: /^\[\/(.+?)\/\]$/ },
  { shape: 'lean-l',         open: '[\\"', close: '\\"]', regex: /^\[\\"(.+?)"\\\]$/ },
  { shape: 'lean-l',         open: '[\\', close: '\\]', regex: /^\[\\(.+?)\\\]$/ },
  { shape: 'trap-b',         open: '[/"', close: '\\"]', regex: /^\[\/"(.+?)"\\\]$/ },
  { shape: 'trap-b',         open: '[/', close: '\\]', regex: /^\[\/(.+?)\\\]$/ },
  { shape: 'trap-t',         open: '[\\"', close: '/"]', regex: /^\[\\"(.+?)"\/\]$/ },
  { shape: 'trap-t',         open: '[\\', close: '/]', regex: /^\[\\(.+?)\/\]$/ },
  // rect's quoted variant stays LAST (its ["x"] shape is the loosest quoted
  // form — every other family must claim its input first, the same ordering
  // discipline the plain table always had).
  { shape: 'rect',           open: '["', close: '"]',  regex: /^\["(.+?)"\]$/ },
  { shape: 'rect',           open: '[',  close: ']',   regex: /^\[(.+?)\]$/ },
];

/** Canonical shapes carrying a SHAPE_PATTERNS bracket form (derived, not hand-listed). */
const SHAPE_PATTERNS_KEYS: ReadonlySet<string> = new Set(SHAPE_PATTERNS.map(p => p.shape));

const V11_SHAPES: NodeShape[] = [
  'doc', 'docs', 'dbl-circ', 'cross-circ', 'bow-rect',
  'flip-tri', 'curv-trap', 'manual-file', 'manual-input', 'procs', 'paper-tape',
  'person', 'delay', 'sl-rect', 'div-rect', 'folder', 'datastore',
  'cloud', 'browser', 'bolt', 'tri', 'hourglass',
];

// ===== Phase 27: at-brace directive parser =====
// The `id@{ shape: "key", label: "..." }` metadata form is the only syntax
// the high-value shapes have. This section turns a raw at-brace span into
// typed data; parseDiagram routes spans here (the standalone branch and the
// arrow branch's shape-raw captures).

/**
 * 38-02: every directive shape token resolves through the shapes.ts SSOT —
 * canonical passthrough first, then the alias/legacy catalog (the SSOT runs
 * FIRST: legacy union members would otherwise short-circuit into the
 * mermaid-12 crash keys, the 38-01 lesson). A token the registry cannot
 * resolve is returned VERBATIM as the sentinel shape: callers pair it with
 * `authoredShape` so the authored token survives (rect remains only the
 * render approximation, never the stored truth) — the historical all-rect
 * fallback with token discard is deleted.
 */
function directiveShapeKey(token: string): NodeShape {
  return toDirectiveShapeName(token) ?? (token as NodeShape);
}

/**
 * 38-02 (SHP-02): the verbatim authored token whenever it is not already a
 * canonical shortName — aliases (card → notch-rect), legacy keys
 * (asymmetric → odd), and unresolvable tokens (RECT) all differ from their
 * resolution and are preserved; canonical tokens return undefined.
 */
function authoredShapeFor(token: string): string | undefined {
  return CANONICAL_SHORT_NAMES.has(token) ? undefined : token;
}

/**
 * 38-02: the emit key for a LABEL edit on an existing directive span.
 * Canonical tokens pass through; mermaid-safe dist aliases (card, procs,
 * subroutine — probe-verified to parse inside @{ shape: ... }) keep the
 * authored token verbatim so authoredShape survives the edit; the net-new
 * legacy keys (round, asymmetric et al., which crash mermaid 12 in a
 * directive span) translate to their canonical targets and never enter an
 * emitted span; unresolvable tokens keep their authored spelling rather
 * than being silently re-cased or canonicalized.
 */
function emitKeyForLabelEdit(token: string): string {
  const resolved = toDirectiveShapeName(token);
  if (resolved === null || resolved === token) {return token;}
  return CANONICAL_SHAPES.some(s => s.aliases.includes(token)) ? token : resolved;
}

/**
 * Shapes whose directive-origin re-emission is the directive wrap — derived
 * from the registry (38-02, not hand-listed): every canonical shape without
 * a SHAPE_PATTERNS bracket form, plus `odd` (dual-form: the legacy `>`
 * bracket family AND directive-authored spans) and the four migration-window
 * alias members (which emit their canonical targets through shapeWrap).
 */
const DIRECTIVE_EMISSION_SHAPES: NodeShape[] = [
  ...CANONICAL_SHAPES.map(s => s.shortName).filter(name => !SHAPE_PATTERNS_KEYS.has(name)),
  'odd',
  'manual-file', 'manual-input', 'procs', 'paper-tape',
];

export interface ParsedAtDirective {
  shape: string;
  /** Null when the span carries no label key — callers default to the node id. */
  label: string | null;
  unknownParams: string[];
}

/**
 * Split a directive span body on commas that sit OUTSIDE quote state. A
 * linear character scan: labels may contain commas and closing braces
 * (both render fine in mermaid when quoted), so a naive split or a
 * non-greedy span would corrupt them.
 */
function splitDirectiveParams(body: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' && !inSingle) {
      // A backslash-escaped quote does not toggle double-quote state.
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && body[j] === '\\'; j--) { backslashes++; }
      if (backslashes % 2 === 0) { inDouble = !inDouble; }
      current += ch;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
    } else if (ch === ',' && !inDouble && !inSingle) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Resolve one directive value token: quoted forms unwrap, escapes unescape. */
function parseDirectiveValue(raw: string): string | null {
  if (raw.startsWith('"')) {
    if (raw.length < 2 || !raw.endsWith('"')) {return null;}
    // CR-01: unescape symmetrically with directiveWrap — `\\` -> `\` and
    // `\"` -> `"`. Sequences the writer never emits (a lone `\` before any
    // other char) are preserved verbatim so hand-written Windows-style
    // paths (`C:\new folder`) are not corrupted on read.
    return raw.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (raw.startsWith("'")) {
    if (raw.length < 2 || !raw.endsWith("'")) {return null;}
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * WR-03 helper: does `}` appear outside quote state in a greedy span body?
 * Quote tracking mirrors splitDirectiveParams (backslash-run counting for
 * double quotes, plain toggle for single quotes).
 */
function hasUnquotedCloseBrace(body: string): boolean {
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' && !inSingle) {
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && body[j] === '\\'; j--) { backslashes++; }
      if (backslashes % 2 === 0) { inDouble = !inDouble; }
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '}' && !inDouble && !inSingle) {
      return true;
    }
  }
  return false;
}

/**
 * Parse a raw at-brace span (`@{ ... }`) into typed directive data, or null
 * when the span is not fully consumable — unclosed, an empty/ malformed
 * pair, or no shape key (the bare view/icon forms). Unknown keys are kept
 * as verbatim source slices in original order so write-back can preserve
 * them byte-identically. Single greedy-to-line-end span match plus a linear
 * quote-state scan: no nested quantifiers, no backtracking amplifier.
 */
/**
 * Shared directive-body parser. Strict path (parseAtDirective) additionally
 * requires a `shape` key — the NODE directive form. The LOOSE path accepts
 * shape-less bodies so 12.3 EDGE directives (`e1@{ step: 1 }`) count as
 * consumed by the fence: their params parse cleanly and nothing writes back
 * to them.
 */
function parseDirectiveBody(body: string): { shape: string | null; label: string | null; unknownParams: string[] } | null {
  // WR-03: the greedy capture runs to the LAST `}` — an unquoted `}` before
  // it means the real span closed earlier and the rest is residual line
  // text (e.g. `A@{ shape: person } @{ shape: doc }`). Such a body is never
  // a single directive: refuse it so the fence keeps the doc read-only.
  if (hasUnquotedCloseBrace(body)) {return null;}
  let shape: string | null = null;
  let label: string | null = null;
  const unknownParams: string[] = [];
  for (const pair of splitDirectiveParams(body)) {
    const trimmedPair = pair.trim();
    if (!trimmedPair) {return null;}
    const colonIdx = trimmedPair.indexOf(':');
    if (colonIdx === -1) {return null;}
    const key = trimmedPair.slice(0, colonIdx).trim();
    if (!/^[A-Za-z_][\w-]*$/.test(key)) {return null;}
    const valueToken = trimmedPair.slice(colonIdx + 1).trim();
    const value = parseDirectiveValue(valueToken);
    if (value === null) {return null;}
    // WR-03: an unquoted shape value must be a bare token — junk like
    // `person } @{ shape: doc` is never a shape key. Quoted values pass
    // through so unknown shape tokens stay preserved verbatim.
    if (key === 'shape' && !valueToken.startsWith('"') && !valueToken.startsWith("'")
        && !/^[A-Za-z_][\w-]*$/.test(value)) {return null;}
    if (key === 'shape') { shape = value; }
    else if (key === 'label') { label = value; }
    else { unknownParams.push(trimmedPair); }
  }
  return { shape, label, unknownParams };
}

/** LOOSE parse: shape-less (edge) directive spans stay parseable. */
function parseAtDirectiveLoose(raw: string): { shape: string | null; label: string | null; unknownParams: string[] } | null {
  const spanMatch = raw.match(/^@\{(.*)\}\s*$/);
  if (!spanMatch) {return null;}
  const body = spanMatch[1].trim();
  if (!body) {return null;}
  return parseDirectiveBody(body);
}

export function parseAtDirective(raw: string): ParsedAtDirective | null {
  const spanMatch = raw.match(/^@\{(.*)\}\s*$/);
  if (!spanMatch) {return null;}
  const body = spanMatch[1].trim();
  if (!body) {return null;}
  const parsed = parseDirectiveBody(body);
  if (!parsed || !parsed.shape) {return null;}
  return { shape: parsed.shape, label: parsed.label, unknownParams: parsed.unknownParams };
}

/**
 * Parse a node shape-raw that may carry an at-brace span. Directive spans
 * route to parseAtDirective (label defaults to the node id — mermaid's own
 * vertex.text = id semantics); every other raw keeps parseNodeLabel.
 */
function parseNodeRawDirective(
  raw: string,
  nodeId: string,
): { label: string; shape: NodeShape; directiveRaw?: string; unknownParams?: string[]; authoredShape?: string } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('@{')) {
    // WR-04: the directive form attaches directly to its id (`A@{...}`) —
    // the space-separated form (`A @{...}`) is invalid mermaid 12.1.0 and is
    // declined on the edge path exactly like the standalone rule: no
    // directive interpretation, no silent normalization of the spacing.
    if (!raw.startsWith('@{')) {return parseNodeLabel(trimmed);}
    const parsed = parseAtDirective(trimmed);
    if (parsed) {
      return {
        label: parsed.label ?? nodeId,
        shape: directiveShapeKey(parsed.shape),
        directiveRaw: trimmed,
        unknownParams: parsed.unknownParams,
        authoredShape: authoredShapeFor(parsed.shape),
      };
    }
  }
  return parseNodeLabel(trimmed);
}

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

  // Check for empty brackets (e.g. [], (), {}, [[]], (()), etc.) — 38-02:
  // shape values re-keyed to canonical like SHAPE_PATTERNS above.
  const EMPTY_SHAPES: Array<{ shape: NodeShape; open: string; close: string }> = [
    { shape: 'stadium',        open: '([', close: '])' },
    { shape: 'fr-rect',        open: '[[', close: ']]' },
    { shape: 'cyl',            open: '[(', close: ')]' },
    // Phase 26 (WR-01): the dbl-circ writer emits `((()))` for an empty
    // label; without this reader the bare triple-paren form fell through to
    // the circle pattern and re-parsed as a circle labeled `()`. Positioned
    // above circle to mirror SHAPE_PATTERNS ordering.
    { shape: 'dbl-circ',       open: '(((', close: ')))' },
    { shape: 'circle',         open: '((', close: '))' },
    { shape: 'hex',            open: '{{', close: '}}' },
    { shape: 'diam',           open: '{',  close: '}' },
    { shape: 'rounded',        open: '(',  close: ')' },
    { shape: 'odd',            open: '>',  close: ']' },
    { shape: 'lean-r',         open: '[/', close: '/]' },
    { shape: 'lean-l',         open: '[\\', close: '\\]' },
    { shape: 'trap-b',         open: '[/', close: '\\]' },
    { shape: 'trap-t',         open: '[\\', close: '/]' },
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

// Phase 27: directive emission — always-quoted, and the label is escaped
// (CR-01: backslashes FIRST, then double quotes — a lone `\` emitted before
// the closing quote would read as an escaped quote on re-parse, quote state
// would never close, the span would stop parsing, the node would vanish and
// the document would fence read-only). Unknown params are re-emitted
// verbatim, in their original order, right after the label.
function directiveWrap(shapeKey: string, label: string, unknownParams?: string[]): string {
  const escaped = label.replace(/\\/g, '\\\\').replaceAll('"', '\\"');
  const extras = unknownParams && unknownParams.length > 0 ? `, ${unknownParams.join(', ')}` : '';
  return `@{ shape: "${shapeKey}", label: "${escaped}"${extras} }`;
}

function shapeWrap(label: string, shape: NodeShape, quoted = false, unknownParams?: string[]): string {
  // Only add quotes when explicitly requested (quoted=true) OR when label contains special characters AND quoted is not explicitly false
  // If quoted is explicitly false, never add quotes regardless of content
  const needsQuotes = quoted === false ? false : (quoted || /[^a-zA-Z0-9_-]/.test(label));
  const q = '"';
  const l = needsQuotes ? `${q}${label}${q}` : label;
  // 38-02: the directive-emission choke point — every directiveWrap route
  // resolves its shape key through toDirectiveShapeName FIRST, so an alias
  // or legacy member (manual-file → flip-tri, manual-input → sl-rect,
  // procs → st-rect, paper-tape → flag, …) emits its canonical shortName
  // and a crash key can never enter an emitted span. Unresolvable keys
  // (authored-sentinel shapes) emit verbatim rather than being rewritten.
  const directive = (key: NodeShape): string =>
    directiveWrap(toDirectiveShapeName(key) ?? key, label, unknownParams);

  switch (shape) {
    // Canonical bracket families — the keys parseDiagram resolves since the
    // 38-02 re-key. Delimiter emissions byte-identical to the legacy cases.
    case 'rect':            return `[${l}]`;
    case 'rounded':         return `(${l})`;
    case 'stadium':         return `([${l}])`;
    case 'fr-rect':         return `[[${l}]]`;
    case 'cyl':             return `[(${l})]`;
    case 'circle':          return `((${l}))`;
    case 'diam':            return `{${l}}`;
    case 'hex':             return `{{${l}}}`;
    // `odd` is dual-form: a directive-origin caller carries unknownParams
    // (extras !== undefined) and re-emits the canonical directive span; a
    // bracket-origin caller (the legacy `>` family) keeps the delimiters —
    // the legacy family's byte-identity contract.
    case 'odd':             return unknownParams !== undefined ? directive('odd') : `>${l}]`;
    case 'lean-r':          return `[/${l}/]`;
    case 'lean-l':          return `[\\${l}\\]`;
    case 'trap-b':          return `[/${l}\\]`;
    case 'trap-t':          return `[\\${l}/]`;
    // v11 + Phase 27 directive shapes — all route through the choke point
    // (escaped always-quoted emission, unknown params re-emitted verbatim
    // after the label). Phase 27 (27-01): the raw-label interpolation the
    // v11 cases carried before is gone — every directive-emitting case now
    // escapes labels and carries extras through rename/shape-change.
    case 'doc':             return directive('doc');
    case 'docs':            return directive('docs');
    // Phase 26: legacy triple-paren wrap (quote-aware label var, mirroring
    // the circle case). An at-brace metadata emission here would flip the
    // visual editor read-only via the D6 presence gate on the next autosave.
    case 'dbl-circ':        return `(((${l})))`;
    case 'cross-circ':      return directive('cross-circ');
    case 'bow-rect':        return directive('bow-rect');
    case 'flip-tri':        return directive('flip-tri');
    case 'curv-trap':       return directive('curv-trap');
    case 'div-rect':        return directive('div-rect');
    case 'person':          return directive('person');
    // Phase 27 (27-02): the remaining toolbar targets join person — same
    // escaped always-quoted emission, unknown params re-emitted verbatim.
    case 'delay':           return directive('delay');
    case 'sl-rect':         return directive('sl-rect');
    case 'folder':          return directive('folder');
    case 'datastore':       return directive('datastore');
    case 'cloud':           return directive('cloud');
    case 'browser':         return directive('browser');
    case 'bolt':            return directive('bolt');
    case 'tri':             return directive('tri');
    case 'hourglass':       return directive('hourglass');
    // 38-02: the directive-only canonical shapes grown with the union —
    // every case emits through the choke point.
    case 'bucket':          return directive('bucket');
    case 'console':         return directive('console');
    case 'bang':            return directive('bang');
    case 'text':            return directive('text');
    case 'notch-rect':      return directive('notch-rect');
    case 'lin-rect':        return directive('lin-rect');
    case 'sm-circ':         return directive('sm-circ');
    case 'fr-circ':         return directive('fr-circ');
    case 'fork':            return directive('fork');
    case 'brace':           return directive('brace');
    case 'brace-r':         return directive('brace-r');
    case 'braces':          return directive('braces');
    case 'h-cyl':           return directive('h-cyl');
    case 'lin-cyl':         return directive('lin-cyl');
    case 'win-pane':        return directive('win-pane');
    case 'f-circ':          return directive('f-circ');
    case 'notch-pent':      return directive('notch-pent');
    case 'tag-doc':         return directive('tag-doc');
    case 'tag-rect':        return directive('tag-rect');
    case 'st-rect':         return directive('st-rect');
    case 'flag':            return directive('flag');
    case 'lin-doc':         return directive('lin-doc');
    // 38-02: migration-window alias members emit their canonical targets
    // (flip-tri / sl-rect / st-rect / flag) — never the alias literal.
    case 'manual-file':     return directive('manual-file');
    case 'manual-input':    return directive('manual-input');
    case 'procs':           return directive('procs');
    case 'paper-tape':      return directive('paper-tape');
    // Legacy delimiter keys — migration window: identical delimiter
    // emissions to before the re-key (parse no longer produces these keys,
    // but consumers may still pass them until plan 06 sheds the members).
    case 'round':           return `(${l})`;
    case 'subroutine':      return `[[${l}]]`;
    case 'cylinder':        return `[(${l})]`;
    case 'rhombus':         return `{${l}}`;
    case 'hexagon':         return `{{${l}}}`;
    case 'asymmetric':      return `>${l}]`;
    case 'parallelogram':   return `[/${l}/]`;
    case 'parallelogram-alt': return `[\\${l}\\]`;
    case 'trapezoid':       return `[/${l}\\]`;
    case 'trapezoid-alt':   return `[\\${l}/]`;
    default:                return `[${l}]`;
  }
}

const STANDALONE_NODE_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)$/;
const ARROW_RE = /-->|---|--\|>|\|>|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|~~~/;
// Arrow alternatives in EXACTLY the order the old arrow-line regex listed
// them (same set as ARROW_RE) — candidate enumeration below depends on the
// order to keep picking the winner the old engine picked.
const ARROW_ALT_STRINGS = ['-->', '---', '--|>', '|>', '-.->', '==>', 'x--x', '.->', '<-->', 'o--o', '--o', 'o--', '~~~'] as const;
const EDGE_HEAD_ID_RE = /^([A-Za-z_][A-Za-z0-9_-]*)/;
const WS_RE = /\s/;
const ID_START_RE = /[A-Za-z_]/;
const ID_CHAR_RE = /[A-Za-z0-9_-]/;

/**
 * Full arrow-line structure (id + optional shape raw + arrow + optional edge
 * label + target id + optional target raw). Shared by parseDiagram's edge
 * branch and the D6 fence so their verdicts on a line cannot drift.
 *
 * WR-02: this replaces the single ARROW_LINE_RE regex, whose two lazy
 * quantifiers paired with the 14-alternative arrow group backtracked
 * quadratically on long `@{`-bearing lines (measured x4 per size doubling,
 * seconds at 16 KB on this per-keystroke fence/parse path). The replacement
 * walks candidate arrow positions left-to-right, trying the alternatives in
 * the same per-position order as the old engine, and takes the first
 * candidate whose anchored tail continues — the winning split is the same,
 * the work is linear. Arrow-tail characters that are also id characters
 * (`-`, `o`, `x`) are handled by capping the id capture at the candidate
 * position. The id capture is the longest id-char prefix at or before the
 * arrow: the old lazy capture truncated multi-char ids to their first
 * letter (`node1 --> node2` parsed as node `n` labeled "ode1").
 */
function matchArrowLine(trimmed: string): RegExpMatchArray | null {
  const leadingIdLen = trimmed.match(EDGE_HEAD_ID_RE)?.[0].length ?? 0;
  if (leadingIdLen === 0) {return null;}
  for (let i = 1; i < trimmed.length; i++) {
    for (const alt of ARROW_ALT_STRINGS) {
      if (!trimmed.startsWith(alt, i)) {continue;}
      const tail = matchEdgeTail(trimmed, i + alt.length);
      if (tail) {
        // Group layout mirrors the old regex match so callers keep their
        // indices: [full, id, sourceRaw, arrow, edgeLabel, targetId,
        // targetRaw]. edgeLabel stays undefined when no `|label|` is
        // present, like a non-participating group.
        const idLen = Math.min(leadingIdLen, i);
        return [
          trimmed,
          trimmed.slice(0, idLen),
          trimmed.slice(idLen, i),
          alt,
          tail[0],
          tail[1],
          tail[2],
        ] as unknown as RegExpMatchArray;
      }
    }
  }
  return null;
}

/**
 * Linear, allocation-light tail scan for `\s*(?:\|label\|)?\s*<target-id>`
 * starting at `from`. Deliberately NOT a regex: the equivalent
 * `^\s*(?:\|([^|]*)\|)?\s*(id)` pattern backtracks quadratically inside a
 * long whitespace run (for every position its first `\s*` gives back, the
 * second `\s*` rescans the rest of the run). Returns
 * [edgeLabel, targetId, targetRaw] with edgeLabel undefined when no
 * `|...|` is present, mirroring a non-participating group; null when no
 * target id continues the arrow.
 */
function matchEdgeTail(s: string, from: number): [string | undefined, string, string] | null {
  let i = from;
  while (i < s.length && WS_RE.test(s[i] ?? '')) {i++;}
  let label: string | undefined;
  if (s[i] === '|') {
    const close = s.indexOf('|', i + 1);
    if (close !== -1) {
      label = s.slice(i + 1, close);
      i = close + 1;
    }
  }
  while (i < s.length && WS_RE.test(s[i] ?? '')) {i++;}
  const start = s[i];
  if (start === undefined || !ID_START_RE.test(start)) {return null;}
  let j = i + 1;
  while (j < s.length && ID_CHAR_RE.test(s[j] ?? '')) {j++;}
  // `[^\n]*$` on the remainder always matches (callers pass single lines).
  return [label, s.slice(i, j), s.slice(j)];
}

/**
 * Strip a trailing bare 12.3 edge id (` e1@`) from a source/target span.
 * The id must be a standalone word ending the span; shape spans whose label
 * merely ends in `@` (inside quotes/braces) never match because the closer
 * trails the id. Returns the span without the id and the id itself (''
 * when the span carries none).
 */
function extractTrailingBareEdgeId(raw: string): { span: string; edgeId: string } {
  const trim = raw.trim();
  const m = trim.match(/(?:^|\s)([A-Za-z_][A-Za-z0-9_-]*)@$/);
  if (!m || m.index === undefined) {return { span: raw, edgeId: '' };}
  return { span: trim.slice(0, m.index).trimEnd(), edgeId: m[1] };
}

/**
 * Split the text following a hop's target id into what the target node owns
 * and what belongs to the NEXT hop. The tail starts at the next top-level
 * hop arrow (depth/quote aware via findNextHopArrow); a bare `ident@`
 * immediately before that arrow is the next hop's edge id (mermaid 12.3
 * `A --> B e2@--> C`), not the target's shape. `hopPrefix` re-emits that id
 * verbatim before the tail.
 */
function splitHopTail(rest: string): { targetSpan: string; hopPrefix: string; tail: string } {
  const next = findNextHopArrow(rest);
  if (!next) {return { targetSpan: rest, hopPrefix: '', tail: '' }; }
  const span = rest.slice(0, next.index);
  const { span: cleanSpan, edgeId } = extractTrailingBareEdgeId(span);
  if (edgeId) {
    return {
      targetSpan: cleanSpan,
      hopPrefix: `${span.slice(0, span.length - span.trimEnd().length).trimEnd()} ${edgeId}@`,
      tail: rest.slice(next.index),
    };
  }
  return { targetSpan: span, hopPrefix: '', tail: rest.slice(next.index) };
}

/**
 * Depth- and quote-aware scan for the NEXT edge arrow inside a hop remainder
 * (the text following a hop's target id). Mermaid chains hops on one line
 * (`A --> B --> C`), and a hop's target may carry a shape span whose label
 * contains arrow-like text (`B{text --> more}`, `B["-->"]`) — an arrow only
 * opens a new hop when it sits outside those spans AND a valid edge tail
 * (optional `|label|`, then a target id) continues it. Returns the arrow
 * alternative, its index in `s`, and the matched tail; null when the
 * remainder holds no further hop.
 */
function findNextHopArrow(
  s: string,
): { alt: string; index: number; tail: [string | undefined, string, string] } | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote) {quote = null;}
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) {continue;}
    for (const alt of ARROW_ALT_STRINGS) {
      if (!s.startsWith(alt, i)) {continue;}
      const tail = matchEdgeTail(s, i + alt.length);
      if (tail) {
        return { alt, index: i, tail };
      }
    }
  }
  return null;
}

/**
 * All edge hops on one arrow line. Mermaid chains hops (`A --> B --> C`,
 * optionally with per-hop labels/arrows and shape spans on intermediate
 * targets); matchArrowLine only ever reports the FIRST hop and silently
 * discarded the rest — the visual model then lost every trailing node, and
 * a visual edit rewrote the line without them. The first hop is matched by
 * matchArrowLine (same winner the old engine picked); later hops are found
 * by findNextHopArrow in the previous hop's remainder, with each hop's
 * target shape raw sliced to the text before the next arrow. Hops.length>1
 * lines are fenced from mutation (see bodyHasUnparsedAtDirective): the
 * line-surgical mutation writers cannot re-emit a chain faithfully yet.
 */
interface EdgeHop {
  arrowType: string;
  /** Bare 12.3 edge id attached directly before this hop's arrow (`e1@-->`). */
  edgeId: string;
  label: string;
  targetId: string;
  /** UNTRIMMED slice the target node owns (bare next-hop id stripped). */
  targetShapeRaw: string;
}

interface EdgeChain {
  sourceId: string;
  /** UNTRIMMED slice between the source id and the first arrow. */
  sourceShapeRaw: string;
  /** Bare edge id attached before the first hop's arrow, '' when none. */
  sourceEdgeId: string;
  hops: EdgeHop[];
}

function matchEdgeChain(trimmed: string): EdgeChain | null {
  const first = matchArrowLine(trimmed);
  if (!first) {return null;}
  const sourceId = first[1];
  const sourceRawAll = first[2] ?? '';
  const extractedEdgeId = extractTrailingBareEdgeId(sourceRawAll);
  let sourceEdgeId = extractedEdgeId.edgeId;
  let sourceShapeRaw = sourceEdgeId ? extractedEdgeId.span : sourceRawAll;
  // 38-03: the ATTACHED line-start form (`e1@--> A`) has no source token
  // before the marker — the whole pre-arrow slice is the bare `id@` lexeme
  // (12.3 edge-id syntax with the source elided). The id is then BOTH the
  // source vertex (as before) and the edge's id, so its `id@{ ... }`
  // metadata line links to the edge for cascade deletion; re-emitting the
  // slice as a shape raw was the mangled `e1@` ghost-node defect.
  if (!sourceEdgeId && sourceRawAll.trim() === '@') {
    sourceEdgeId = sourceId;
    sourceShapeRaw = '';
  }
  const hops: EdgeHop[] = [];
  let arrowType = first[3];
  let edgeId = '';
  let label = first[4]?.trim() ?? '';
  let rest = first[6] ?? ''; // text after the current hop's target id
  let targetId = first[5];
  for (;;) {
    const split = splitHopTail(rest);
    hops.push({ arrowType, edgeId, label, targetId, targetShapeRaw: split.targetSpan });
    if (!split.tail) {break;}
    const nextArrow = findNextHopArrow(split.tail);
    if (!nextArrow) {break;}
    const [nextLabel, nextId, nextRaw] = nextArrow.tail;
    arrowType = nextArrow.alt;
    edgeId = split.hopPrefix.trim().replace(/@$/, '');
    label = nextLabel?.trim() ?? '';
    targetId = nextId;
    rest = nextRaw;
  }
  // Unify: the id before hop0's arrow is hop0's edge id (`A e1@--> B`).
  if (hops.length > 0) {hops[0].edgeId = sourceEdgeId;}
  return { sourceId, sourceShapeRaw, sourceEdgeId, hops };
}

/**
 * Re-emit one hop in normalized single-space form, preserving its bare
 * edge-id prefix, arrow, label, target and shape span.
 */
function emitHop(hop: EdgeHop): string {
  return ` ${hop.edgeId ? `${hop.edgeId}@` : ''}${hop.arrowType}${hop.label ? `|${hop.label}|` : ''} ${hop.targetId}${hop.targetShapeRaw}`;
}

/**
 * Rebuild a chain line after dropping hop `skip` (0-based). The lead node of
 * the surviving chain is the skipped hop's target (with its shape span), or
 * the original source when a later hop was removed. Null when no hop
 * remains (the caller deletes the line). Used by the chain-aware mutation
 * writers (removeEdge, removeNode).
 */
function rebuildChainWithoutHop(chain: EdgeChain, skip: number, indent: string): string | null {
  const kept = chain.hops.filter((_, i) => i !== skip);
  if (kept.length === 0) {return null;}
  if (skip === 0) {
    // The skipped hop's target becomes the surviving chain's lead node —
    // every kept hop (starting with the first one) then re-emits fully.
    const lead = chain.hops[0];
    return `${indent}${lead.targetId}${lead.targetShapeRaw.trim()}${kept.map(emitHop).join('')}`;
  }
  return `${indent}${chain.sourceId}${chain.sourceShapeRaw.trim()}${kept.map(emitHop).join('')}`;
}

/**
 * Check if an ID refers to a subgraph.
 */
function isSubgraphId(id: string, subgraphs: ParsedSubgraph[]): boolean {
  return subgraphs.some(sg => sg.id === id);
}

/**
 * Split a CSS declaration list from `style` / `classDef` / `linkStyle` directives.
 * Strips trailing semicolons before picking `;` vs `,` as the delimiter, and respects
 * parentheses (`rgb(...)`) and quotes so commas inside values stay intact.
 */
function splitCssDeclarations(val: string): string[] {
  const cleaned = val.trim().replace(/;+\s*$/, '');
  if (!cleaned) {return [];}

  let hasTopLevelSemi = false;
  let parenDepth = 0;
  let quote: string | null = null;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (quote) {
      if (ch === quote) {quote = null;}
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      parenDepth++;
    } else if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (ch === ';' && parenDepth === 0) {
      hasTopLevelSemi = true;
      break;
    }
  }

  const delimiter = hasTopLevelSemi ? ';' : ',';
  const parts: string[] = [];
  let current = '';
  parenDepth = 0;
  quote = null;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (quote) {
      if (ch === quote) {quote = null;}
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === '(') {
      parenDepth++;
      current += ch;
    } else if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current += ch;
    } else if (ch === delimiter && parenDepth === 0) {
      if (current.trim()) {parts.push(current.trim());}
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {parts.push(current.trim());}
  return parts;
}

function splitCssKeyValue(declaration: string): [string, string] | null {
  const colonIdx = declaration.indexOf(':');
  if (colonIdx === -1) {return null;}
  const k = declaration.slice(0, colonIdx).trim();
  const v = declaration.slice(colonIdx + 1).trim();
  if (!k || !v) {return null;}
  return [k, v];
}

export function parseStyleValue(val: string): NodeStyle {
  const style: NodeStyle = {};
  for (const part of splitCssDeclarations(val)) {
    const kv = splitCssKeyValue(part);
    if (!kv) {continue;}
    const [k, v] = kv;
    if (k === 'fill') {style.fill = v;}
    else if (k === 'stroke') {style.stroke = v;}
    else if (k === 'stroke-width') {style.strokeWidth = v;}
    else if (k === 'stroke-dasharray') {style.strokeDasharray = v;}
    else if (k === 'color') {style.color = v;}
    else if (k === 'font-weight') {style.fontWeight = v;}
    else if (k === 'font-size') {style.fontSize = v;}
    else if (k === 'font-family') {style.fontFamily = v;}
    else if (k === 'rx') {style.rx = v;}
    else if (k === 'ry') {style.ry = v;}
    else if (k === 'opacity') {style.opacity = v;}
  }
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
  if (style.fontFamily !== undefined) {parts.push(`font-family:${style.fontFamily}`);}
  if (style.rx !== undefined) {parts.push(`rx:${style.rx}`);}
  if (style.ry !== undefined) {parts.push(`ry:${style.ry}`);}
  if (style.opacity !== undefined) {parts.push(`opacity:${style.opacity}`);}
  return parts.join(',');
}

export function parseLinkStyles(source: string): Map<number | 'default', EdgeStyle> {
  const linkStyles = new Map<number | 'default', EdgeStyle>();
  const lines = source.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^linkStyle\s+(\d+(?:\s*,\s*\d+)*|default)\s+(.+)$/);
    if (match) {
      const indexStr = match[1];
      const styleStr = match[2];
      const parsedStyle = parseEdgeStyleValue(styleStr);
      if (indexStr === 'default') {
        linkStyles.set('default', { ...linkStyles.get('default'), ...parsedStyle });
      } else {
        for (const rawIdx of indexStr.split(',')) {
          const idx = parseInt(rawIdx.trim(), 10);
          if (!Number.isNaN(idx)) {
            linkStyles.set(idx, { ...linkStyles.get(idx), ...parsedStyle });
          }
        }
      }
    }
  }

  return linkStyles;
}

function parseEdgeStyleValue(val: string): EdgeStyle {
  const style: EdgeStyle = {};
  for (const part of splitCssDeclarations(val)) {
    const kv = splitCssKeyValue(part);
    if (!kv) {continue;}
    const [k, v] = kv;
    // Support both camelCase and kebab-case property names
    if (k === 'stroke') {style.stroke = v;}
    else if (k === 'stroke-width' || k === 'strokeWidth') {style.strokeWidth = v;}
    else if (k === 'stroke-dasharray' || k === 'strokeDasharray') {style.strokeDasharray = v;}
    else if (k === 'opacity') {style.opacity = v;}
    else if (k === 'font-size' || k === 'fontSize') {style.fontSize = v;}
    else if (k === 'font-weight' || k === 'fontWeight') {style.fontWeight = v;}
    else if (k === 'fill') {style.fill = v;}
    else if (k === 'fill-opacity' || k === 'fillOpacity') {style.fillOpacity = v;}
    else if (k === 'color') {style.color = v;}
  }
  return style;
}

export function edgeStyleToString(style: EdgeStyle): string {
  const parts: string[] = [];
  if (style.stroke !== undefined) {parts.push(`stroke:${style.stroke}`);}
  if (style.strokeWidth !== undefined) {parts.push(`stroke-width:${style.strokeWidth}`);}
  if (style.strokeDasharray !== undefined) {parts.push(`stroke-dasharray:${style.strokeDasharray}`);}
  if (style.opacity !== undefined) {parts.push(`opacity:${style.opacity}`);}
  if (style.fontSize !== undefined) {parts.push(`font-size:${style.fontSize}`);}
  if (style.fontWeight !== undefined) {parts.push(`font-weight:${style.fontWeight}`);}
  // Include fill, fillOpacity, and color in linkStyle syntax so they persist during UI updates.
  // Mermaid incorrectly applies fill to edge paths, so we fix this in SVG post-processing.
  if (style.fill !== undefined) {parts.push(`fill:${style.fill}`);}
  if (style.fillOpacity !== undefined) {parts.push(`fill-opacity:${style.fillOpacity}`);}
  if (style.color !== undefined) {parts.push(`color:${style.color}`);}
  return parts.join(',');
}

export function updateLinkStyle(source: string, edgeIndex: number | 'default', style: EdgeStyle): string {
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

/**
 * Remove the edge line connecting srcId -> tgtId (as written in the code).
 * The removed edge's linkStyle line is dropped and subsequent linkStyle
 * indices are decremented, so edge styles stay attached to the right edges.
 */
/**
 * 38-03 (SHP-06): drop the linked `id@{...}` metadata lines of every dead id
 * from a rebuilt line list. The registry comes from parseDiagram on the
 * ORIGINAL source; matching is verbatim (trimmed) and the cascade only ever
 * DELETES — it never rewrites a line (decline-don't-normalize). Linked lines
 * of surviving entities are never touched and never reordered.
 */
function stripLinkedDirectiveLines(
  outLines: string[],
  source: string,
  deadIds: Iterable<string>,
): string {
  const linked = parseDiagram(source).linkedDirectives;
  const doomed = new Set<string>();
  for (const id of deadIds) {
    for (const linkedLine of linked.get(id) ?? []) {
      doomed.add(linkedLine);
    }
  }
  if (doomed.size === 0) {return outLines.join('\n');}
  return outLines.filter(line => !doomed.has(line.trim())).join('\n');
}

export function removeEdge(source: string, srcId: string, tgtId: string): string {
  const lines = source.split('\n');
  const tgtRe = new RegExp(`\\b${escapeRegex(tgtId)}\\b`);
  // Backlog C: prefer the chain-aware match — on a chained line
  // (`A --> B --> C`) only the targeted hop is dropped (the line is rebuilt,
  // edge-line count unchanged so linkStyle indices stay valid); a single-hop
  // line keeps the legacy whole-line delete + linkStyle renumber.
  const edgeInfo = (() => {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed.startsWith(srcId) && !ARROW_RE.test(trimmed)) {continue;}
      const chain = matchEdgeChain(trimmed);
      if (!chain) {continue;}
      const prevOf = (h: number): string => (h === 0 ? chain.sourceId : chain.hops[h - 1].targetId);
      const hopIdx = chain.hops.findIndex((h, idx) => prevOf(idx) === srcId && h.targetId === tgtId);
      if (hopIdx !== -1) {return { index: i, chain, hopIdx }; }
    }
    return null;
  })();
  if (!edgeInfo) {return source;}
  const { index: edgeIdx, chain, hopIdx } = edgeInfo;
  // 38-03 (SHP-06): the dead hop's 12.3 edge id cascades its linked
  // `id@{...}` metadata lines (generic by id — orphaned `e1@{ animate: true }`
  // ghost lines die with their edge).
  const deadEdgeId = chain.hops[hopIdx]?.edgeId ?? '';

  if (chain.hops.length > 1) {
    lines[edgeIdx] = rebuildChainWithoutHop(chain, hopIdx, lines[edgeIdx].match(/^\s*/)?.[0] ?? '') ?? '';
    return stripLinkedDirectiveLines(lines, source, deadEdgeId ? [deadEdgeId] : []);
  }

  // linkStyle indices count edge lines in code order — same numbering mermaid uses
  const isEdgeLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) {return false;}
    if (/^(flowchart|graph|style|class|classDef|linkStyle|click|subgraph|direction|end)\b/i.test(trimmed)) {return false;}
    return splitEdgeLine(trimmed) !== null;
  };
  const ordinal = lines.slice(0, edgeIdx).filter(isEdgeLine).length;

  const filtered = lines
    .flatMap((line, i) => {
      if (i === edgeIdx) {return [];}
      const m = line.trim().match(/^linkStyle\s+(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n === ordinal) {return [];}
        if (n > ordinal) {return [line.replace(/^(linkStyle\s+)(\d+)/, `$1${n - 1}`)];}
      }
      return [line];
    });
  // 38-03: linked metadata lines of the dead edge id cascade with it. They
  // are not edge lines (no arrow), so the linkStyle ordinal math above never
  // counted them and removing them keeps every remaining index valid.
  return stripLinkedDirectiveLines(filtered, source, deadEdgeId ? [deadEdgeId] : []);
}

/**
 * Remove the `subgraph <id>` block and its matching `end` while KEEPING the
 * lines in between — child nodes de-nest to the root, nested subgraph blocks
 * survive untouched. The subgraph's own `direction` and `style`/`class` lines
 * are removed with it.
 */
export function removeSubgraph(source: string, subgraphId: string): string {
  const lines = source.split('\n');
  const openRe = new RegExp(`^subgraph\\s+${escapeRegex(subgraphId)}\\b`);
  const startIdx = lines.findIndex(line => openRe.test(line.trim()));
  if (startIdx === -1) {return source;}

  // Find the matching end, counting nested subgraph opens
  let depth = 1;
  let endIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^subgraph\s+\S/.test(trimmed)) {
      depth++;
    } else if (trimmed === 'end') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx === -1) {
    // One-line inline form: `subgraph id[label] N1[x] end` (user paste). The
    // multi-line scan finds no isolated `end` and would silently no-op.
    // Strip the wrapper keywords from the line, keeping the content.
    if (/(^|\s)subgraph\s+\S/.test(lines[startIdx]) && /\bend\s*$/.test(lines[startIdx])) {
      lines[startIdx] = lines[startIdx]
        .replace(/^\s*subgraph\s+\S+/, '')
        .replace(/\s*\bend\s*$/, '');
      const kept = lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith(`style ${subgraphId} `) || trimmed.startsWith(`style ${subgraphId}\t`)) {return false;}
        if (trimmed.startsWith(`class ${subgraphId} `)) {return false;}
        return true;
      });
      // 38-03: the subgraph's linked directive lines (`SG@{ view: collapsed }`)
      // cascade with it (generic by id).
      return stripLinkedDirectiveLines(kept, source, [subgraphId]);
    }
    return source;
  }

  const kept = lines
    .filter((line, i) => {
      if (i === startIdx || i === endIdx) {return false;}
      // drop the block's own direction lines; children between the braces stay
      if (i > startIdx && i < endIdx && line.trim().startsWith('direction ')) {return false;}
      return true;
    })
    .filter(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`style ${subgraphId} `) || trimmed.startsWith(`style ${subgraphId}\t`)) {return false;}
      if (trimmed.startsWith(`class ${subgraphId} `)) {return false;}
      return true;
    });
  // 38-03: the subgraph's linked directive lines cascade with it.
  return stripLinkedDirectiveLines(kept, source, [subgraphId]);
}

/** Split an edge line into: [beforeArrow, arrowType, edgeLabel, afterArrow] */
function splitEdgeLine(line: string): [string, string, string, string] | null {
  const arrowMatch = line.match(/(-->|---|-.->|-\.->|==>|x--x|\.->|<-->|o--o|--o|o--|--\|>|\|>|~~~)/);
  // `index` is always defined for a non-global match, but the lib types it
  // optional — guard it so the arithmetic below is sound (repaired gate).
  if (!arrowMatch || arrowMatch.index === undefined) return null;
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
  // 38-03 pass-1 residue: the trimmed standalone `id@{...}` lines that DID
  // define a node — pass 2 links every other standalone directive line
  // (edge-id metadata, subgraph directives) by entity id.
  const directiveNodeLines = new Set<string>();

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

    // Phase 27: standalone directive node `id@{ shape: ... }` — placed before
    // the arrow branch and guarded on it (a directive line whose label text
    // contains an arrow token is routed to the edge branch, where the D6
    // fence catches the mangled capture). The at-brace must sit immediately
    // after the id: the space-separated form is invalid mermaid 12.1.0 and
    // stays unparsed.
    if (!ARROW_RE.test(trimmed)) {
      const directiveLine = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)(@\{.*\})$/);
      if (directiveLine) {
        const span = directiveLine[2];
        const parsed = parseAtDirective(span);
        if (parsed && !seenIds.has(directiveLine[1]) && !isSubgraphId(directiveLine[1], subgraphs)) {
          seenIds.add(directiveLine[1]);
          directiveNodeLines.add(trimmed);
          nodes.push({
            id: directiveLine[1],
            label: parsed.label ?? directiveLine[1],
            shape: directiveShapeKey(parsed.shape),
            raw: span,
            parentSubgraphId: parentId,
            directiveRaw: span,
            unknownParams: parsed.unknownParams,
            authoredShape: authoredShapeFor(parsed.shape),
          });
        }
        continue;
      }
    }

    if (ARROW_RE.test(trimmed)) {
      const chain = matchEdgeChain(trimmed);
      if (chain) {
        const sourceId = chain.sourceId;
        const sourceShapeRaw = chain.sourceShapeRaw.trim();

        // Ensure source node exists (unless it's a subgraph)
        if (!seenIds.has(sourceId) && !isSubgraphId(sourceId, subgraphs)) {
          seenIds.add(sourceId);
          if (sourceShapeRaw) {
            // parseNodeRawDirective receives the UNTRIMMED slice: its WR-04
            // check keys on a leading space (` id @{...}` stays declined).
            const parsed = parseNodeRawDirective(chain.sourceShapeRaw, sourceId);
            nodes.push({
              id: sourceId,
              label: parsed.label,
              shape: parsed.shape,
              raw: sourceShapeRaw,
              parentSubgraphId: parentId,
              ...(parsed.directiveRaw
                ? { directiveRaw: parsed.directiveRaw, unknownParams: parsed.unknownParams, authoredShape: parsed.authoredShape }
                : {}),
            });
          } else {
            nodes.push({ id: sourceId, label: sourceId, shape: 'rect', raw: sourceId, parentSubgraphId: parentId });
          }
        }
        // Per-hop target creation (chained lines contribute every hop, not
        // just the first — the model used to silently drop trailing nodes,
        // and a visual edit then rewrote the line without them). Bare hop
        // edge ids (`e2@`) are stripped from the shape slices so the target
        // keeps no ghost label.
        let prevId = sourceId;
        for (const hop of chain.hops) {
          const targetId = hop.targetId;
          const targetShapeRaw = hop.targetShapeRaw.trim();
          // Parse target label from shape (e.g. B{Is it working?}) — the
          // parse call keeps the untrimmed slice for the WR-04 space check.
          if (!seenIds.has(targetId) && !isSubgraphId(targetId, subgraphs)) {
            seenIds.add(targetId);
            if (targetShapeRaw) {
              const parsed = parseNodeRawDirective(hop.targetShapeRaw, targetId);
              nodes.push({
                id: targetId,
                label: parsed.label,
                shape: parsed.shape,
                raw: targetShapeRaw,
                parentSubgraphId: parentId,
                ...(parsed.directiveRaw
                  ? { directiveRaw: parsed.directiveRaw, unknownParams: parsed.unknownParams, authoredShape: parsed.authoredShape }
                  : {}),
              });
            } else {
              nodes.push({ id: targetId, label: targetId, shape: 'rect', raw: targetId, parentSubgraphId: parentId });
            }
          } else if (targetShapeRaw && !isSubgraphId(targetId, subgraphs)) {
            const existing = nodes.find(n => n.id === targetId);
            if (existing && existing.label === existing.id) {
              const parsed = parseNodeRawDirective(hop.targetShapeRaw, targetId);
              existing.label = parsed.label;
              existing.shape = parsed.shape;
              if (parsed.directiveRaw) {
                existing.directiveRaw = parsed.directiveRaw;
                existing.unknownParams = parsed.unknownParams;
                existing.authoredShape = parsed.authoredShape;
              }
            }
          }
          edges.push({
            source: prevId,
            target: targetId,
            arrowType: hop.arrowType,
            label: hop.label,
            raw: trimmed,
            ...(hop.edgeId ? { edgeId: hop.edgeId } : {}),
          });
          prevId = targetId;
        }
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
      // Allow IDs that START with subgraph (like subgraph1) but NOT the bare keyword
      if (['TD', 'TB', 'BT', 'RL', 'LR', 'end', 'direction'].includes(id) || id === 'subgraph') {continue;}
      if (!seenIds.has(id) && !isSubgraphId(id, subgraphs)) {
        seenIds.add(id);
        nodes.push({ id, label: id, shape: 'rect', raw: id, parentSubgraphId: parentId });
      } else if (parentId) {
        // Mermaid semantics: a later standalone reference inside a subgraph
        // places the node into it (moveNodeToSubgraph relies on this for
        // nodes first defined on an edge line).
        const existing = nodes.find(n => n.id === id);
        if (existing && existing.parentSubgraphId !== parentId) {
          existing.parentSubgraphId = parentId;
        }
      }
    }
  }

  const linkStyles = parseLinkStyles(source);
  // 38-03 pass 2: link every standalone `id@{...}` line pass 1 did NOT turn
  // into a node — edge-id metadata lines (`e1@{ animate: true }`) and
  // subgraph directive lines (`SG@{ view: collapsed }`) — to its entity id,
  // verbatim and uninterpreted (parseDiagram stops silently dropping them;
  // interpretation is Phase 40 / EDGE-05). Order-independent: the
  // node-definition test reads pass 1's final seenIds, so a metadata line
  // placed before its edge line still links instead of minting a node.
  const linkedDirectives = new Map<string, string[]>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) {continue;}
    if (ARROW_RE.test(trimmed) || directiveNodeLines.has(trimmed)) {continue;}
    const directiveLine = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)(@\{.*\})$/);
    if (!directiveLine) {continue;}
    const linked = linkedDirectives.get(directiveLine[1]);
    if (linked) {
      linked.push(trimmed);
    } else {
      linkedDirectives.set(directiveLine[1], [trimmed]);
    }
  }
  return { nodes, edges, styles, classDefs, nodeClasses, linkStyles, subgraphs, linkedDirectives };
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
      mergedStyle = parseStyleValue(match[1]);
    }
  }

  // If newStyle is explicitly empty {}, it means we want to CLEAR the style
  if (Object.keys(newStyle).length === 0 && Object.getPrototypeOf(newStyle) === Object.prototype) {
    mergedStyle = {};
  } else {
    // Merge NEW styles into existing
    Object.assign(mergedStyle, newStyle);

    // Remove keys that are explicitly set to undefined or empty string in newStyle
    for (const [key, value] of Object.entries(newStyle)) {
      if (value === undefined || value === '') {
        delete (mergedStyle as any)[key];
      }
    }
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
      // Phase 27: directive definition — rebuild through the directive
      // writer, keeping the span's shape key and unknown params verbatim
      // (only the label changes).
      const directiveMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(@\{.*\})\s*$/);
      if (directiveMatch && directiveMatch[2] === nodeId) {
        const parsed = parseAtDirective(directiveMatch[3]);
        if (parsed) {
          // 38-02: the emit key goes through the label-edit rule — canonical
          // and mermaid-safe alias tokens keep the authored spelling
          // (authoredShape survives), legacy crash keys translate.
          lines[i] = `${directiveMatch[1]}${nodeId}${directiveWrap(emitKeyForLabelEdit(parsed.shape), newLabel, parsed.unknownParams)}`;
          return lines.join('\n');
        }
      }
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
        // Backlog C: a bare 12.3 edge id (`A e1@--> B`) sits in the source
        // span, and a chained tail (`--> C`) trails the target span — both
        // must be re-emitted verbatim around the renamed node.
        const srcParts = extractTrailingBareEdgeId(arrowMatch[2] ?? '');
        const srcEdgePrefix = srcParts.edgeId ? ` ${srcParts.edgeId}@` : '';
        const srcRaw = srcParts.edgeId ? '' : srcParts.span;
        const tailParts = splitHopTail(arrowMatch[6] ?? '');
        // Check source (with or without explicit shape)
        if (arrowMatch[1] === nodeId) {
          if (srcRaw) {
            // Phase 27: directive source — rebuild through the directive
            // writer so the shape key and unknown params survive (P4).
            const srcDirective = srcRaw.startsWith('@{') ? parseAtDirective(srcRaw) : null;
            if (srcDirective) {
              lines[i] = `${nodeId}${directiveWrap(emitKeyForLabelEdit(srcDirective.shape), newLabel, srcDirective.unknownParams)}${srcEdgePrefix}${arrowMatch[3]}${arrowMatch[4] !== undefined ? `|${arrowMatch[4]}|` : ''}${arrowMatch[6] ? ' ' : ''}${arrowMatch[5]}${tailParts.hopPrefix}${tailParts.tail}`;
              return lines.join('\n');
            }
            // Node has explicit shape
            const { shape } = parseNodeLabel(srcRaw);
            lines[i] = `${nodeId}${shapeWrap(newLabel, shape, false)}${srcEdgePrefix}${arrowMatch[3]}${arrowMatch[4] !== undefined ? `|${arrowMatch[4]}|` : ''}${arrowMatch[6] ? ' ' : ''}${arrowMatch[5]}${tailParts.hopPrefix}${tailParts.tail}`;
          } else {
            // Node has no explicit shape, add one with the new label
            lines[i] = `${nodeId}${shapeWrap(newLabel, 'rect', false)}${srcEdgePrefix}${arrowMatch[3]}${arrowMatch[4] !== undefined ? `|${arrowMatch[4]}|` : ''}${arrowMatch[6] ? ' ' : ''}${arrowMatch[5]}${tailParts.hopPrefix}${tailParts.tail}`;
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

          if (tailParts.targetSpan.trim()) {
            const tgtRaw = tailParts.targetSpan.trim();
            // Phase 27: directive target — same directive-writer rebuild.
            const tgtDirective = tgtRaw.startsWith('@{') ? parseAtDirective(tgtRaw) : null;
            if (tgtDirective) {
              lines[i] = `${beforeTarget}${nodeId}${directiveWrap(emitKeyForLabelEdit(tgtDirective.shape), newLabel, tgtDirective.unknownParams)}${tailParts.hopPrefix}${tailParts.tail}`;
              return lines.join('\n');
            }
            // Node has explicit shape
            const { shape } = parseNodeLabel(tgtRaw);
            lines[i] = `${beforeTarget}${nodeId}${shapeWrap(newLabel, shape, false)}${tailParts.hopPrefix}${tailParts.tail}`;
          } else {
            // Node has no explicit shape, add one with the new label
            lines[i] = `${beforeTarget}${nodeId}${shapeWrap(newLabel, 'rect', false)}${tailParts.hopPrefix}${tailParts.tail}`;
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
    // Phase 27: the opener alternation gains the at-brace, so a directive
    // definition line is matched — but only rebuilt when the post-id
    // remainder is EXACTLY a standalone span (an edge line whose match would
    // swallow the arrow returns source unchanged — decision D3, the missing
    // edge-line branch stays documented pre-existing debt).
    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[|\(\["|@\{)["']?[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId) {
      const rest = nodeMatch[4].trim();
      if (rest.startsWith('@{')) {
        // The spaced form (id, whitespace, span) is invalid mermaid 12.1.0 —
        // decline it exactly like the parser does, never silently normalize.
        if (nodeMatch[3] !== '' || !/^@\{.*\}\s*$/.test(rest)) {return source;}
        const parsed = parseAtDirective(rest);
        if (!parsed) {return source;}
        const label = parsed.label ?? nodeId;
        const extras = DIRECTIVE_EMISSION_SHAPES.includes(newShape) ? parsed.unknownParams : undefined;
        lines[i] = `${nodeMatch[1]}${nodeId}${nodeMatch[3]}${shapeWrap(label, newShape, true, extras)}`;
        return lines.join('\n');
      }
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
  // 38-03 (SHP-06): the deleted node's id plus the ids of every edge hop
  // that dies with it cascade their linked `id@{...}` metadata lines.
  const deadIds = new Set<string>([nodeId]);
  const lines: string[] = [];
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`style ${nodeId} `)) {continue;}
    if (trimmed.startsWith(`style ${nodeId}\t`)) {continue;}
    if (trimmed.startsWith(`class ${nodeId} `)) {continue;}

    // 38-03: the standalone branch is guarded on edge lines exactly like
    // updateNodeLabel's — without the ARROW_RE guard it fired on lines whose
    // SOURCE carries a directive span (`A@{...} --> B`), deleting the whole
    // line before the chain rebuild ran and vanishing the untouched target
    // (the reproduced vanished-B ghost-node defect). Edge lines fall through
    // to the hop-aware chain rebuild below, which is the only path that may
    // rewrite them.
    const nodeMatch = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*)((?:\(\[|\[\[|\[\(|\(\(|\{\{|\{|\(|\[\/|\[\\|>|\[|@\{)[^\n]+)/);
    if (nodeMatch && nodeMatch[2] === nodeId && !ARROW_RE.test(trimmed)) {continue;}

    // Backlog C: chained lines are rebuilt hop-aware — removing a node drops
    // only the hops touching it. The entering hop (target === nodeId) and the
    // exiting hop (source === nodeId) die with the node; hops before keep the
    // original source as lead, hops after restart from the exiting hop's
    // target. Untouched endpoints that were only declared on this line keep a
    // standalone definition so they do not vanish from the graph.
    const chain = ARROW_RE.test(trimmed) ? matchEdgeChain(trimmed) : null;
    if (chain) {
      const entryIdx = chain.hops.findIndex(h => h.targetId === nodeId);
      const isChainSource = chain.sourceId === nodeId;
      const exitIdx = isChainSource
        ? 0
        : chain.hops.findIndex((h, i) => i > 0 && chain.hops[i - 1].targetId === nodeId);
      if (entryIdx === -1 && exitIdx === -1) {lines.push(line); continue;}

      // 38-03: hops in [dropStart, dropEnd) die as EDGES with the node —
      // their bare 12.3 edge ids cascade the ids' linked metadata lines.
      const dropStart = entryIdx === -1 ? 0 : entryIdx;
      const dropEnd = exitIdx === -1 ? chain.hops.length : exitIdx + 1;
      for (let h = dropStart; h < dropEnd; h++) {
        const deadEdgeId = chain.hops[h].edgeId;
        if (deadEdgeId) {deadIds.add(deadEdgeId);}
      }

      const indent = line.match(/^\s*/)?.[0] ?? '';
      const out: string[] = [];
      // Pre-segment: hops leading INTO the node, original source as lead.
      if (entryIdx > 0) {
        out.push(`${indent}${chain.sourceId}${chain.sourceShapeRaw.trim()}${chain.hops.slice(0, entryIdx).map(emitHop).join('')}`);
      } else if (entryIdx === 0 && !isChainSource) {
        // The untouched source keeps a standalone declaration (its only one).
        out.push(`${indent}${chain.sourceId}${chain.sourceShapeRaw.trim()}`);
      }
      // Post-segment: the exiting hop's target leads the remaining hops.
      if (exitIdx !== -1 && exitIdx + 1 <= chain.hops.length) {
        const lead = chain.hops[exitIdx];
        out.push(`${indent}${lead.targetId}${lead.targetShapeRaw.trim()}${chain.hops.slice(exitIdx + 1).map(emitHop).join('')}`);
      }
      lines.push(...out);
      continue;
    }

    lines.push(line);
  }
  // 38-03: node/subgraph deletion cascades linked metadata lines generic by
  // id — the dead node's own `id@{...}` lines and the ids of the edges that
  // died with it. Unrelated entities' linked lines are never touched.
  return stripLinkedDirectiveLines(lines, source, deadIds);
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

  // Detect indentation from existing content nodes (skip config and empty lines)
  let indent = '    '; // default 4 spaces
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('---') && !trimmed.startsWith('config:') &&
        !trimmed.startsWith('flowchart') && !trimmed.startsWith('graph') &&
        !trimmed.startsWith('subgraph') && !isMetaLine(trimmed)) {
      const match = line.match(/^(\s+)/);
      if (match) {
        indent = match[1];
        break;
      }
    }
  }

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
  // Add a default node inside so the subgraph is visible (with proper indentation)
  const innerIndent = indent + '  ';
  const block = `${prefix}${indent}subgraph ${subgraphId}${labelFormat}\n${innerIndent}N1[${subgraphLabel}]\n${indent}end`;

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

      // WR-04: the block ends at the directive's OWN close (`}%%`), not at
      // any line that merely *ends* with `%%`. The old suffix check skipped
      // a directive line carrying trailing text (`...}}%% note`) and kept
      // scanning, so a later `%%`-terminated line (e.g. a `%% comment %%`)
      // ended the block — swallowing the diagram lines into initBlock and
      // returning an empty body. Containment (rather than a line suffix)
      // also keeps multi-line directives working: the close arrives on its
      // own line. A spurious early `}%%` cannot lose data — the regex +
      // JSON.parse gate below then fails and the full content falls through
      // as the body.
      if (line.includes('}%%')) {
        foundEnd = true;
        currentLine++;
        break;
      }
      currentLine++;
    }

    if (foundEnd) {
      const body = lines.slice(currentLine).join('\n').trim();

      try {
        // WR-03: the regex previously demanded a trailing `)%%` which no legal
        // directive spelling can satisfy (legal `%%{init: {...}}%%` has no `)`;
        // flat JSON has no second `}` for a `\}\)%%` tail), so this branch
        // never returned a parsed config. The stray `)` is dropped — flat and
        // nested payloads now round-trip (codeUtils.test.ts, Pitfall 5).
        const configMatch = initBlock.match(/%%\{init:\s*({[\s\S]*?})\s*\}%%/);
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

/**
 * D6 fail-safe (DIA-04), reworked in Phase 27: parse-completeness test for
 * the v12 metadata-attach syntax (`@{...}`) OUTSIDE frontmatter. The
 * directive parser now consumes well-formed spans, so content whose body
 * carries them opens the visual editor EDITABLE; any at-brace line the
 * directive rules cannot fully consume keeps the whole-document read-only
 * fence — malformed or unclosed spans, the invalid space-separated form,
 * subgraph-header directives (their rename path would drop the trailing
 * metadata), and icon-param lines (no icon write-back exists). Superset-safe
 * by design: when consumption is uncertain, fence. The body comes from the
 * app's own parseFrontmatter split, so frontmatter-embedded metadata
 * (legitimate mermaid config) and legacy `%%{init:...}%%` directives never
 * trigger the gate — consistent with detectDiagramType's stripping semantics.
 * Formerly also fenced: chained hops (`A --> B --> C`) and bare 12.3 edge
 * ids (`A e1@--> B`) — the mutation writers now survive both (their
 * chain/edge-id survival is gated by chain-survival.test.ts), so both forms
 * are editable.
 */

export function bodyHasUnparsedAtDirective(content: string): boolean {
  const body = parseFrontmatter(content).body;
  for (const line of body.split('\n')) {
    // Backlog C: chained hops and bare 12.3 edge ids are EDITABLE now — the
    // mutation writers survive both (chain-survival.test.ts gates that), so
    // no fence here anymore. The remaining fences are the at-brace forms the
    // directive rules cannot fully consume.
    if (!line.includes('@{')) {continue;}
    if (!directiveLineFullyConsumed(line.trim())) {return true;}
  }
  return false;
}

/** A span is editable when it parses AND carries no icon param (no icon write-back exists). */
function directiveSpanEditable(span: string): boolean {
  // LOOSE parse: 12.3 edge directives (`e1@{ step: 1 }`) carry no shape but
  // parse cleanly — they count as consumed (editable) like node spans.
  const parsed = parseAtDirectiveLoose(span);
  if (!parsed) {return false;}
  return !parsed.unknownParams.some(p => /^icon\s*:/.test(p));
}

/**
 * True when parseDiagram's directive rules consume the whole line. The
 * checks mirror the parser's branches exactly — standalone form only outside
 * arrow lines, edge form via the same arrow-line matcher the parser itself
 * uses — so a line the parser would mangle can never be called consumable
 * here.
 */
function directiveLineFullyConsumed(trimmed: string): boolean {
  if (!trimmed || trimmed.startsWith('%%')) {return true;}
  // A subgraph header carrying a directive stays fenced: its rename path
  // (updateSubgraphLabel) rewrites the line and would drop the metadata.
  if (trimmed.startsWith('subgraph')) {return false;}
  if (!ARROW_RE.test(trimmed)) {
    const standalone = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)(@\{.*\})$/);
    if (standalone) {return directiveSpanEditable(standalone[2]);}
    return false;
  }
  const edge = matchArrowLine(trimmed);
  if (edge) {
    const sourceCapture = edge[2] ?? '';
    const targetCapture = edge[6] ?? '';
    const sourceRaw = sourceCapture.trim();
    const targetRaw = targetCapture.trim();
    // WR-04: a directive span must attach directly to its id — the
    // space-separated form stays fenced on edge lines too (mirrors the
    // standalone rule and parseNodeRawDirective's decline).
    if (sourceRaw.startsWith('@{') && (!sourceCapture.startsWith('@{') || !directiveSpanEditable(sourceRaw))) {return false;}
    if (targetRaw.startsWith('@{') && (!targetCapture.startsWith('@{') || !directiveSpanEditable(targetRaw))) {return false;}
    return true;
  }
  return false;
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
        const indentMatch = lines[i].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
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
function findNodeLine(lines: string[], nodeId: string): { index: number; isStandalone: boolean } {
  const idPattern = new RegExp(`\\b${escapeRegex(nodeId)}\\b`);

  // First: look for standalone declaration (nodeId[Label], nodeId(Label), etc.)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(nodeId) && !ARROW_RE.test(trimmed) && !trimmed.startsWith('style ') && !trimmed.startsWith('class ')) {
      // Matches standalone node pattern (at-brace included — Phase 27
      // directive definitions resolve for moveNodeToSubgraph)
      if (trimmed.match(new RegExp(`^${escapeRegex(nodeId)}(\\[|\\(|\\{|>|\\/|@|$)`))) {
        return { index: i, isStandalone: true };
      }
    }
  }

  // Second: look for node on an edge line
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (ARROW_RE.test(trimmed) && idPattern.test(trimmed)) {
      return { index: i, isStandalone: false };
    }
  }

  return { index: -1, isStandalone: false };
}

/**
 * Move a node to a subgraph (or to root if targetSubgraphId is null).
 * Returns the modified source string, or the original if no changes needed.
 */
export function moveNodeToSubgraph(source: string, nodeId: string, targetSubgraphId: string | null): string {
  const lines = source.split('\n');
  const regions = findSubgraphRegions(lines);

  const { index: nodeLineIdx, isStandalone } = findNodeLine(lines, nodeId);
  if (nodeLineIdx === -1) return source;

  // Find current subgraph of the node (innermost)
  let currentSubgraphId: string | null = null;
  let minRange = Infinity;
  for (const region of regions) {
    if (nodeLineIdx > region.startLineIdx && nodeLineIdx < region.endLineIdx) {
      const range = region.endLineIdx - region.startLineIdx;
      if (range < minRange) {
        minRange = range;
        currentSubgraphId = region.id;
      }
    }
  }

  // No-op: already in target
  if (currentSubgraphId === targetSubgraphId) return source;

  const lineToMove = lines[nodeLineIdx].trim();
  
  if (targetSubgraphId === null) {
    // MOVING OUT to root
    // If it's a standalone line, move the whole line.
    // If it's an edge line, we move the whole edge line because usually 
    // we want the relationship to be at the root level if one of its nodes is out.
    lines.splice(nodeLineIdx, 1);
    const updatedRegions = findSubgraphRegions(lines);

    let insertIdx = lines.length;
    const firstSubgraph = updatedRegions.sort((a, b) => a.startLineIdx - b.startLineIdx)[0];
    
    if (firstSubgraph) {
      insertIdx = firstSubgraph.startLineIdx;
      while (insertIdx > 0 && lines[insertIdx - 1].trim() === '') {
        insertIdx--;
      }
    } else {
      for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (t && !t.startsWith('style ') && !t.startsWith('classDef ') && !t.startsWith('class ') && !t.startsWith('linkStyle ')) {
          insertIdx = i + 1;
          break;
        }
      }
    }
    lines.splice(insertIdx, 0, `  ${lineToMove}`);
  } else {
    // MOVING IN to a subgraph
    const targetRegion = findSubgraphRegions(lines).find(r => r.id === targetSubgraphId);
    if (!targetRegion) return source;

    if (isStandalone) {
      // Move the standalone line into the subgraph
      lines.splice(nodeLineIdx, 1);
      const updatedRegions = findSubgraphRegions(lines);
      const updatedTarget = updatedRegions.find(r => r.id === targetSubgraphId);
      if (updatedTarget) {
        lines.splice(updatedTarget.endLineIdx, 0, `${updatedTarget.indent}  ${lineToMove}`);
      }
    } else {
      // Node only exists in an edge. 
      // DON'T move the edge (it would drag the other node too).
      // Instead, add a standalone definition for the node in the target subgraph.
      // This forces Mermaid to place the node in that subgraph.
      lines.splice(targetRegion.endLineIdx, 0, `${targetRegion.indent}  ${nodeId}`);
    }
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
        // Check if line contains the node (as standalone or in edge; the
        // at-sign covers Phase 27 directive definitions)
        return new RegExp(`(^|\\s)${nodeId}(\\s|\\[|\\(|\\{|@|$)`).test(l);
      });

      if (nodeIdx !== -1) {
        // Insert after the node line
        let insertAfter = nodeIdx;
        // Find the end of multi-line node definition if any. Anchored (27-01
        // Rule-1 fix): the previous pattern's unanchored whitespace/comma
        // alternatives matched ANY line containing a space — including the
        // classDef line this function may have just appended — so the class
        // line never landed next to the node it belongs to.
        while (insertAfter + 1 < lines.length && /^[\x5B\x5D{},]/.test(lines[insertAfter + 1].trim())) {
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
