// src/lib/mermaid/shapes.ts
// Canonical 53-shape SSOT registry (38-01, SHP-01). ONE build-time constant
// that replaces the drifted hand-maintained shape lists (codeUtils union,
// toolbar SHAPES, PropertiesPanel SHAPE_OPTIONS, i18n 26-key block) — every
// consumer derives shape vocabulary from, or translates through,
// toDirectiveShapeName() below.
//
// PERF-01 hard constraint: ZERO imports. This module must never import
// '@/lib/mermaid/core' or any other runtime module — it sits on the eager
// boot chain's parser-only tier (guarded by the PARSER_ONLY_FILES entry in
// src/__tests__/bundlePerf.test.ts, landed in the same commit as this file).
//
// Provenance (T-38-01): the 53 canonical shortNames, the 92-entry alias
// catalog, and their declaration order below are extracted verbatim from the
// mermaid 12.3.0 dist oracle
// (node_modules/mermaid/dist/chunks/mermaid.core/chunk-AXFCVDMN.mjs
// `shapesDefs`) by the research Instrument A/B commands — never hand-typed
// from docs prose. The drift test in
// src/lib/mermaid/__tests__/shapes.test.ts re-runs both instruments at test
// time and asserts set + order equality, so a mermaid bump turns this file
// red instead of silently diverging.
//
// Matching contract: string-EXACT only. toDirectiveShapeName never trims,
// lowercases, or otherwise normalizes its input — normalization is the
// CALLER's documented decision, and mermaid's own addVertex throws on
// uppercase/underscore keys, so silently case-folding here would promise a
// behavior the engine does not honor.
//
// Category taxonomy (UI-SPEC Grey Area #5, planner-locked split 13/13/11/5/11):
// basics(13) · flow(13) · data(11) · devices(5) · symbols(11) = 53.

/** The 53 canonical Mermaid flowchart shape shortNames (dist declaration order). */
export type NodeShapeCanonical =
  | 'rect' | 'rounded' | 'stadium' | 'fr-rect' | 'cyl' | 'datastore' | 'folder'
  | 'bucket' | 'console' | 'browser' | 'person' | 'circle' | 'bang' | 'cloud'
  | 'diam' | 'hex' | 'lean-r' | 'lean-l' | 'trap-b' | 'trap-t' | 'dbl-circ'
  | 'text' | 'notch-rect' | 'lin-rect' | 'sm-circ' | 'fr-circ' | 'fork'
  | 'hourglass' | 'brace' | 'brace-r' | 'braces' | 'bolt' | 'doc' | 'delay'
  | 'h-cyl' | 'lin-cyl' | 'curv-trap' | 'div-rect' | 'tri' | 'win-pane'
  | 'f-circ' | 'notch-pent' | 'flip-tri' | 'sl-rect' | 'docs' | 'st-rect'
  | 'bow-rect' | 'cross-circ' | 'tag-doc' | 'tag-rect' | 'flag' | 'odd'
  | 'lin-doc';

/** Picker category keys — the 5 UI-SPEC-declared slugs, in picker display order. */
export type CategoryKey = 'basics' | 'flow' | 'data' | 'devices' | 'symbols';

/** One canonical shape: its shortName, its picker category, its official aliases. */
export interface CanonicalShape {
  readonly shortName: NodeShapeCanonical;
  readonly category: CategoryKey;
  /** Official aliases from the dist shapesDefs, verbatim (self-aliases included). */
  readonly aliases: readonly string[];
}

/** Category keys in picker display order (UI-SPEC Grey Area #5). */
export const SHAPE_CATEGORIES: readonly CategoryKey[] = Object.freeze([
  'basics', 'flow', 'data', 'devices', 'symbols',
]);

// The registry table: exactly the 53 defs in dist declaration order
// (Instrument A — the order the picker surfaces too), each carrying its
// planner-locked category and the verbatim Instrument B alias array (empty
// when the dist def declares none). Category is per-entry metadata, NOT the
// array's grouping — do not sort this table by category.
const SHAPE_TABLE: CanonicalShape[] = [
  { shortName: 'rect',       category: 'basics',  aliases: ['proc', 'process', 'rectangle'] },
  { shortName: 'rounded',    category: 'basics',  aliases: ['event'] },
  { shortName: 'stadium',    category: 'basics',  aliases: ['terminal', 'pill'] },
  { shortName: 'fr-rect',    category: 'basics',  aliases: ['subprocess', 'subproc', 'framed-rectangle', 'subroutine'] },
  { shortName: 'cyl',        category: 'data',    aliases: ['db', 'database', 'cylinder'] },
  { shortName: 'datastore',  category: 'data',    aliases: ['data-store'] },
  { shortName: 'folder',     category: 'data',    aliases: ['directory'] },
  { shortName: 'bucket',     category: 'data',    aliases: [] },
  { shortName: 'console',    category: 'devices', aliases: [] },
  { shortName: 'browser',    category: 'devices', aliases: [] },
  { shortName: 'person',     category: 'devices', aliases: [] },
  { shortName: 'circle',     category: 'basics',  aliases: ['circ'] },
  { shortName: 'bang',       category: 'symbols', aliases: ['bang'] },
  { shortName: 'cloud',      category: 'devices', aliases: ['cloud'] },
  { shortName: 'diam',       category: 'flow',    aliases: ['decision', 'diamond', 'question'] },
  { shortName: 'hex',        category: 'flow',    aliases: ['hexagon', 'prepare'] },
  { shortName: 'lean-r',     category: 'flow',    aliases: ['lean-right', 'in-out'] },
  { shortName: 'lean-l',     category: 'flow',    aliases: ['lean-left', 'out-in'] },
  { shortName: 'trap-b',     category: 'flow',    aliases: ['priority', 'trapezoid-bottom', 'trapezoid'] },
  { shortName: 'trap-t',     category: 'flow',    aliases: ['manual', 'trapezoid-top', 'inv-trapezoid'] },
  { shortName: 'dbl-circ',   category: 'basics',  aliases: ['double-circle'] },
  { shortName: 'text',       category: 'basics',  aliases: [] },
  { shortName: 'notch-rect', category: 'basics',  aliases: ['card', 'notched-rectangle'] },
  { shortName: 'lin-rect',   category: 'basics',  aliases: ['lined-rectangle', 'lined-process', 'lin-proc', 'shaded-process'] },
  { shortName: 'sm-circ',    category: 'basics',  aliases: ['start', 'small-circle'] },
  { shortName: 'fr-circ',    category: 'symbols', aliases: ['stop', 'framed-circle'] },
  { shortName: 'fork',       category: 'flow',    aliases: ['join'] },
  { shortName: 'hourglass',  category: 'flow',    aliases: ['hourglass', 'collate'] },
  { shortName: 'brace',      category: 'symbols', aliases: ['comment', 'brace-l'] },
  { shortName: 'brace-r',    category: 'symbols', aliases: [] },
  { shortName: 'braces',     category: 'symbols', aliases: [] },
  { shortName: 'bolt',       category: 'symbols', aliases: ['com-link', 'lightning-bolt'] },
  { shortName: 'doc',        category: 'data',    aliases: ['doc', 'document'] },
  { shortName: 'delay',      category: 'flow',    aliases: ['half-rounded-rectangle'] },
  { shortName: 'h-cyl',      category: 'data',    aliases: ['das', 'horizontal-cylinder'] },
  { shortName: 'lin-cyl',    category: 'data',    aliases: ['disk', 'lined-cylinder'] },
  { shortName: 'curv-trap',  category: 'flow',    aliases: ['curved-trapezoid', 'display'] },
  { shortName: 'div-rect',   category: 'basics',  aliases: ['div-proc', 'divided-rectangle', 'divided-process'] },
  { shortName: 'tri',        category: 'flow',    aliases: ['extract', 'triangle'] },
  { shortName: 'win-pane',   category: 'devices', aliases: ['internal-storage', 'window-pane'] },
  { shortName: 'f-circ',     category: 'symbols', aliases: ['junction', 'filled-circle'] },
  { shortName: 'notch-pent', category: 'symbols', aliases: ['loop-limit', 'notched-pentagon'] },
  { shortName: 'flip-tri',   category: 'flow',    aliases: ['manual-file', 'flipped-triangle'] },
  { shortName: 'sl-rect',    category: 'flow',    aliases: ['manual-input', 'sloped-rectangle'] },
  { shortName: 'docs',       category: 'data',    aliases: ['documents', 'st-doc', 'stacked-document'] },
  { shortName: 'st-rect',    category: 'basics',  aliases: ['procs', 'processes', 'stacked-rectangle'] },
  { shortName: 'bow-rect',   category: 'basics',  aliases: ['stored-data', 'bow-tie-rectangle'] },
  { shortName: 'cross-circ', category: 'symbols', aliases: ['summary', 'crossed-circle'] },
  { shortName: 'tag-doc',    category: 'data',    aliases: ['tag-doc', 'tagged-document'] },
  { shortName: 'tag-rect',   category: 'data',    aliases: ['tagged-rectangle', 'tag-proc', 'tagged-process'] },
  { shortName: 'flag',       category: 'symbols', aliases: ['paper-tape'] },
  { shortName: 'odd',        category: 'symbols', aliases: [] },
  { shortName: 'lin-doc',    category: 'data',    aliases: ['lined-document'] },
];

// Deep-freeze: after module load there is no runtime mutation path for the
// registry (plan prohibition — no code path may mutate these collections).
for (const shape of SHAPE_TABLE) {
  Object.freeze(shape.aliases);
  Object.freeze(shape);
}

/** All 53 canonical shapes, in dist declaration order (Instrument A order). */
export const CANONICAL_SHAPES: readonly CanonicalShape[] = Object.freeze(SHAPE_TABLE);

/** The canonical shortName set, derived from CANONICAL_SHAPES. */
export const CANONICAL_SHORT_NAMES: ReadonlySet<string> = Object.freeze(
  new Set(CANONICAL_SHAPES.map((s) => s.shortName)),
);

// Legacy REQUIREMENTS (SHP-01) mappings — the 6 crashing-in-directive legacy
// NodeShape keys plus the 3 aliases the dist catalog already carries. These
// keys must resolve even though several are NOT in the dist alias arrays
// (mermaid 12 throws `No such shape: X.` on them in @{ shape: ... } spans).
// Fold-in discipline: identical targets merge silently; a conflicting target
// is a drift-test failure, never a silent override (the shapes.test.ts drift
// battery asserts the exact measured map size and every per-key target).
const LEGACY_SHAPE_ALIASES: Readonly<Record<string, NodeShapeCanonical>> = Object.freeze({
  round: 'rounded',
  rhombus: 'diam',
  subroutine: 'fr-rect',
  cylinder: 'cyl',
  parallelogram: 'lean-r',
  'parallelogram-alt': 'lean-l',
  trapezoid: 'trap-b',
  'trapezoid-alt': 'trap-t',
  asymmetric: 'odd',
} as Record<string, NodeShapeCanonical>);

// Build the alias index: the 92 raw dist entries first, then the 9 legacy
// mappings folded in (3 of them — subroutine, cylinder, trapezoid — land on
// identical targets and merge; the final measured size is 98).
const ALIAS_INDEX = new Map<string, NodeShapeCanonical>();
for (const shape of CANONICAL_SHAPES) {
  for (const alias of shape.aliases) {
    ALIAS_INDEX.set(alias, shape.shortName);
  }
}
for (const [legacyKey, canonical] of Object.entries(LEGACY_SHAPE_ALIASES)) {
  ALIAS_INDEX.set(legacyKey, canonical);
}

/**
 * Every official alias (92 dist entries) plus the 9 legacy REQUIREMENTS
 * mappings → its one canonical shortName. Measured size: 98
 * (92 raw + 6 net-new legacy keys; 3 legacy keys merge onto identical
 * existing targets).
 */
export const ALIAS_TO_CANONICAL: ReadonlyMap<string, NodeShapeCanonical> = ALIAS_INDEX;

/**
 * Map a user-authored shape token to the canonical shortName allowed inside
 * a @{ shape: ... } directive span — or null when the token is not a
 * canonical name and not a known alias.
 *
 * Resolution order: canonical passthrough first, then the alias/legacy map.
 * STRING-EXACT: no trim, no lowercase, no underscore folding. An uppercase
 * variant of a canonical name ('RECT') returns null — mermaid's addVertex
 * rejects it, so the caller must surface that instead of emitting it.
 * Unknown keys return null — never a silent 'rect' fallback; the caller
 * decides what an unresolved token means.
 */
export function toDirectiveShapeName(token: string): NodeShapeCanonical | null {
  if (CANONICAL_SHORT_NAMES.has(token)) {
    return token as NodeShapeCanonical;
  }
  return ALIAS_TO_CANONICAL.get(token) ?? null;
}
