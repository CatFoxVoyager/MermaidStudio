// THM-01 — theme × family × dark/light render matrix on mermaid 12.0.0
// (Phase 23, plan 23-04). The widest observational net of the theme campaign:
// 12 palettes (10 builtins + 2 synthetic custom derived palettes, D4) × 8
// rendering families (flowchart, sequence, class, state, ER, pie, gantt,
// mindmap — every distinct rendering family represented, D1) × 2 modes
// (light/dark) = a fixed 192-cell grid, every cell rendered through the app's
// single mermaid entrypoint (renderDiagram → validateDiagramContent →
// sanitizeMermaidSVG — never mermaid.render directly, Pitfall 2) and asserted
// against the app's own derivation engine with EXACT hex equality after
// toHex() normalization (D5 epsilon 0 — no ΔE, no tolerance, no skip-lists).
//
// The chain under observation (THM-01/THM-02):
//   coreColors → deriveThemeVariables(coreColors, isDark) → doInit initialize
//   themeVariables → mermaid 12 Theme.calculate(overrides) → rendered SVG.
// Every expected value is computed IN-TEST by the same deriveThemeVariables
// call the render consumed, so any drift between "what the engine derives"
// and "what the render paints" fails the cell. Hardcoded anchors duplicated
// from 23-02's recorded exact-hex lock sit alongside (cross-layer drift
// catcher: if the engine AND the render drifted together, the anchors still
// fire).
//
// Observability method (Pitfall 3): jsdom does not cascade the SVG's internal
// <style> block onto elements (getComputedStyle returns ''), and the 23-03
// probe already proved research assumption A4 does NOT hold for flowchart on
// v12 (node rects carry style="" — colors live ONLY in the style block). Per
// family, the observable read path below was validated by ONE probe render
// per family per mode (temporary probe, 2026-09-14, run + observed via file
// channel + DELETED — Phase 22 probe-observe-delete discipline) BEFORE any
// assertion was authored: real getAttribute reads where v12 emits
// presentation attributes (state/class outer-path, pie slices), deterministic
// style-rule-text parses where colors live only in the block (flowchart,
// sequence, ER, gantt, mindmap). A family whose observable went missing
// throws loudly — never a vacuous '' === '' pass.
//
// D3 disposition record (epsilon 0, updated as the matrix ran):
// - ZERO unclassified diffs across the full grid. Every probed observable
//   equalled the derivation engine's output exactly, in both modes.
// - The two research-identified v11→v12 theme-engine deltas were probed and
//   verified INVISIBLE under the classic-look + dagre pins:
//     (a) flowContainerStroke (new v12 theme-base variable, app never sets
//         it): no flowchart-family observable carries it under classic look.
//     (b) Theme.calculate()'s useGradient tail (a nodeBorder override without
//         explicit useGradient flips it to false): expected neo-look-gated.
//         CONFIRMED invisible — flowchart/class node fills read as flat hex
//         (#daeaf2), never url(#...) gradient references (the noGradient
//         guards below assert this on every flowchart/class cell; A2 verified
//         empirically, not assumed).
// - Recorded non-observable (deliberately NOT asserted): sequence actor rects
//   and ER relationship-end circles carry theme-INDEPENDENT attribute-layer
//   values (#eaeaea/#666, "white" — identical in light and dark, probed both
//   modes). The CSS cascade paints the THEME colors from the style block over
//   those presentation attributes; the theme-driven observable is the style
//   rule (or the painted result in a real browser). Asserting the attribute
//   values would lock theme-independent mermaid internals, not the theme
//   chain.
import { describe, it, expect } from 'vitest';
import { renderDiagram, initMermaid } from '../core';
import { builtinThemes } from '@/constants/themes';
import { deriveThemeVariables } from '@/constants/themeDerivation';
import { toHex } from '@/utils/colorConversion';
import { CUSTOM_PALETTE_A, CUSTOM_PALETTE_B } from '@/constants/__tests__/fixtures/palettes';
import type { MermaidTheme, ThemeCoreColors } from '@/types';

// ---------------------------------------------------------------------------
// Fixtures — one minimal static diagram per family (D1). No linkStyle/styles
// directives anywhere: every asserted color must come from the THEME chain,
// not from in-content user styling.
// ---------------------------------------------------------------------------
const FAMILY_FIXTURES = {
  flowchart: `flowchart TD
  A[Start] -->|yes| B{Check}
  B --> C[End]`,
  sequence: `sequenceDiagram
  participant A as Client
  participant B as Server
  A->>B: Request
  B-->>A: Response`,
  class: `classDiagram
  class Animal {
    +int age
  }
  Animal <|-- Dog`,
  state: `stateDiagram-v2
  [*] --> S1
  S1 --> S2
  S2 --> [*]`,
  er: `erDiagram
  CUSTOMER ||--o{ ORDER : places`,
  pie: `pie title Sample
  "Alpha" : 40
  "Beta" : 60`,
  gantt: `gantt
  title Plan
  dateFormat YYYY-MM-DD
  section S1
  Task1 :a1, 2024-01-01, 30d
  section S2
  Task2 :after a1, 20d`,
  mindmap: `mindmap
  root((Root))
    Child1
    Child2`,
} as const;

type FamilyId = keyof typeof FAMILY_FIXTURES;
type Mode = 'light' | 'dark';
const MODES: Mode[] = ['light', 'dark'];

// D1 grid integrity: exactly 8 rendering families, no shrinking (the plan's
// prohibitions forbid reducing the D1×D4 grid; per-command scope shrinks, the
// grid does not).
const FAMILY_IDS = Object.keys(FAMILY_FIXTURES) as FamilyId[];
if (FAMILY_IDS.length !== 8) {
  throw new Error(`D1 grid integrity: expected 8 families, found ${FAMILY_IDS.length}`);
}

// ---------------------------------------------------------------------------
// Palettes (D4): all 10 builtins + 2 synthetic custom derived palettes.
// Custom shapes come from the SHARED fixture src/constants/__tests__/fixtures/palettes.ts
// (IN-04; under src since IN-07 so the repo gates cover it) — the exact
// CUSTOM_PALETTE_A / CUSTOM_PALETTE_B objects the unit
// sweep in themes.test.ts locks, so the matrix covers the user-authored theme
// path with the same fixtures as the sweep (the old verbatim-copy +
// "keep in sync" comment arrangement is gone).
// The localStorage lookup path is out of scope (D4) — synthetics reach the
// render through the app default-theme channel (initMermaid → doInit
// preference chain, core.ts:25-27) because getThemeById cannot resolve them.
//
// anchorPrimary: hardcoded hex duplicated from the themes.ts core slot
// (pass-through-locked by 23-02's exact-hex lock: primaryColor is emitted
// unchanged). Asserted directly against the RENDERED value on every
// flowchart cell of the anchored palette — catches the engine and the render
// layer drifting TOGETHER, which in-test derived expectations cannot see.
// ---------------------------------------------------------------------------

interface MatrixPalette {
  label: string;
  coreColors: ThemeCoreColors;
  /** builtin id — rendered through renderDiagram's per-diagram themeId path */
  renderThemeId?: string;
  /** 23-02-anchored hardcoded primaryColor (cross-layer drift catcher) */
  anchorPrimary?: string;
}

const BUILTIN_ANCHOR_PRIMARY: Record<string, string> = {
  'corporate-blue': '#daeaf2', // themes.ts:24 — 23-02 pass-through lock
  'dark-tech': '#1a2332', // themes.ts:60 — 23-02 pass-through lock
};

const CUSTOM_THEMES: Record<string, MermaidTheme> = {
  'custom-a': {
    id: 'custom-a',
    name: 'Matrix Custom A',
    description: 'Synthetic user-authored palette A (23-04 matrix)',
    isBuiltin: false,
    coreColors: CUSTOM_PALETTE_A,
  },
  'custom-b': {
    id: 'custom-b',
    name: 'Matrix Custom B',
    description: 'Synthetic user-authored palette B (23-04 matrix)',
    isBuiltin: false,
    coreColors: CUSTOM_PALETTE_B,
  },
};

const PALETTES: MatrixPalette[] = [
  ...builtinThemes.map(t => ({
    label: t.id,
    coreColors: t.coreColors,
    renderThemeId: t.id,
    anchorPrimary: BUILTIN_ANCHOR_PRIMARY[t.id],
  })),
  { label: 'custom-a', coreColors: CUSTOM_PALETTE_A, anchorPrimary: '#ff6b6b' },
  { label: 'custom-b', coreColors: CUSTOM_PALETTE_B },
];

// D4 grid integrity: exactly 12 palettes (10 builtins + 2 custom).
if (PALETTES.length !== 12) {
  throw new Error(`D4 grid integrity: expected 12 palettes, found ${PALETTES.length}`);
}

// IN-06: the it.each lookups do `PALETTES.find(p => p.label === label)!` and
// renderCell routes on `CUSTOM_THEMES[palette.label]` — both assume labels are
// unique. The length guard above cannot see a future builtin taking the
// custom-a/custom-b id (the grid would still total 12): `find` would resolve
// the builtin first, that palette would render through the per-diagram
// builtin path twice, and the user-authored default-theme path would silently
// lose all coverage — with zero failures.
if (new Set(PALETTES.map(p => p.label)).size !== PALETTES.length) {
  throw new Error('D4 grid integrity: palette labels must be unique');
}

// ---------------------------------------------------------------------------
// Harness — renderFixture copied verbatim from structure-goldens.test.ts
// (renderDiagram ONLY — Pitfall 2; getBBox swallow; DOMParser on the
// sanitized svg; describe-level timeout 30000 per the established convention).
// ---------------------------------------------------------------------------
/**
 * The jsdom getBBox limitation (no text metrics → the polyfilled/missing
 * implementation surfaces as a "... getBBox ... is not a function" TypeError).
 * Narrow the swallow to that message shape (IN-05): a genuine crash that only
 * MENTIONS getBBox — e.g. reading it off an undefined object inside a layout
 * engine ("Cannot read properties of undefined (reading 'getBBox')") — must
 * surface as an unexpected render error, not be silently tolerated.
 */
const GETBBOX_JSDOM_LIMITATION = /\bgetBBox\b[^\n]*\bnot a function\b/;

async function renderFixture(source: string, id: string, themeId?: string): Promise<Document> {
  try {
    const { svg, error } = await renderDiagram(source, id, themeId);
    if (error && !GETBBOX_JSDOM_LIMITATION.test(error)) {
      throw new Error(`Unexpected render error: ${error}`);
    }
    expect(svg).not.toBe('');
    return new DOMParser().parseFromString(svg, 'image/svg+xml');
  } finally {
    // Belt-and-braces temp-element cleanup (Phase 22 D9: mermaid 12 leaves
    // {safeId} + d{safeId} only on FAILED renders, but the guard is
    // unconditional — frontmatter-precedence.test.ts convention).
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

/**
 * Establish exactly the app theme configuration one cell tests, then render
 * its fixture. Builtins go through the app's per-diagram theme path
 * (renderDiagram themeId → setDiagramTheme → getThemeById); synthetics go
 * through the app default-theme path (initMermaid appDefaultTheme → doInit
 * preference chain) — the only path available to user-authored palettes.
 * Both converge in doInit on themeVariables = deriveThemeVariables(coreColors,
 * isDark) — the exact engine call every cell's expectations come from.
 */
async function renderCell(family: FamilyId, palette: MatrixPalette, mode: Mode): Promise<Document> {
  const cellId = `tmx_${family}_${palette.label.replace(/[^a-zA-Z0-9_]/g, '_')}_${mode}`;
  if (palette.renderThemeId) {
    initMermaid(mode, 'base', null);
  } else {
    initMermaid(mode, 'base', CUSTOM_THEMES[palette.label]);
  }
  return renderFixture(FAMILY_FIXTURES[family], cellId, palette.renderThemeId);
}

// ---------------------------------------------------------------------------
// Observable read paths (Pitfall 3) — every selector/regex below was
// validated against BOTH modes by the pre-authoring probe (2026-09-14, since
// deleted). Read methods:
//   'style' — parse the rule text out of the SVG <style> block (deterministic
//             DOM text read; NEVER getComputedStyle, which returns '' for
//             style-block-styled elements in jsdom).
//   'attr'  — real presentation-attribute read via querySelectorAll.
//   'anchor'— hardcoded expected hex (23-02 lock duplication), style-rule read.
// ---------------------------------------------------------------------------
type ReadMethod =
  | { kind: 'style'; rule: RegExp; prop: 'fill' | 'stroke'; variable: string; raw?: boolean; noGradient?: boolean }
  | { kind: 'attr'; selector: string; index: number; prop: 'fill' | 'stroke'; variable: string; raw?: boolean; noGradient?: boolean }
  | { kind: 'anchor'; rule: RegExp; prop: 'fill' | 'stroke'; expected: string; note: string };

// Variable-name notes (expected values come from the SAME derivation map the
// render consumed — the app derives the FULL variable set, and these keys are
// locked aliased by construction in themeDerivation.ts, so the choice of
// aliased key cannot weaken any assertion):
//   mainBkg ← primaryColor (themeDerivation.ts:219), stateBkg ← mainBkg (:272),
//   actorBkg ← mainBkg (:228), actorBorder ← primaryBorderColor (:227),
//   nodeBorder ← primaryBorderColor (:220), relationColor ← lineColor (:405),
//   pie1 ← primaryColor (:323), pie2 ← secondaryColor (:324),
//   taskBkgColor ← primaryColor (:245), taskBorderColor ← primaryBorderColor (:244),
//   sectionBkgColor ← secondaryColor (:240).
// entityBox is keyed primaryColor/primaryBorderColor because the app does NOT
// emit entityBkg/entityBorder at all — the v12 ER template consumes the base
// keys (probe-verified: .entityBox fill == primaryColor, stroke ==
// primaryBorderColor for corporate-blue, both modes).
const FAMILY_OBSERVABLES: Record<FamilyId, ReadMethod[]> = {
  // Node colors live ONLY in the style block on v12 (23-03 probe finding:
  // node rect carries style="" — A4 does not hold for flowchart). The
  // `.node rect` fill rule is the painted node fill.
  flowchart: [
    { kind: 'style', rule: /\.node rect[^{]*\{[^}]*\}/, prop: 'fill', variable: 'mainBkg', noGradient: true },
    { kind: 'style', rule: /\.node rect[^{]*\{[^}]*\}/, prop: 'stroke', variable: 'nodeBorder' },
    { kind: 'style', rule: /\.marker\{[^}]*\}/, prop: 'fill', variable: 'lineColor' },
  ],
  // Actor boxes paint from the style rule (.actor{stroke:…;fill:…}); the
  // rect's own presentation attributes (#eaeaea/#666) are theme-INDEPENDENT
  // mermaid attribute-layer defaults (probed identical in light and dark) —
  // recorded non-observable, see header. messageLine0's stroke is
  // signalColor — and because the app's derivation deliberately sets
  // signalColor ← lineColor (themeDerivation.ts:232, locked AS the deviation
  // by 23-02), this assertion proves the DEVIATION itself survives the render
  // chain (mermaid's own updateColors would paint textColor here).
  sequence: [
    { kind: 'style', rule: /\.actor\{[^}]*\}/, prop: 'fill', variable: 'actorBkg' },
    { kind: 'style', rule: /\.actor\{[^}]*\}/, prop: 'stroke', variable: 'actorBorder' },
    { kind: 'style', rule: /\.messageLine0\{[^}]*\}/, prop: 'stroke', variable: 'signalColor' },
  ],
  // Class boxes emit a real fill attribute on the shape path
  // (g.basic.label-container.outer-path — probe-validated both modes).
  class: [
    { kind: 'attr', selector: 'g.node .outer-path path', index: 0, prop: 'fill', variable: 'mainBkg', noGradient: true },
  ],
  // State shapes emit a real fill attribute (same selector family 23-03
  // validated). The .state-note rules carry 23-02's hardcoded v12-constructor
  // anchors on every palette: noteBkgColor #fff5ad and noteTextColor #333
  // (the engine emits them unchanged for every coreColors input — recorded
  // verbatim in 23-02's OBSERVED_LIGHT / OBSERVED_DARK maps).
  state: [
    { kind: 'attr', selector: 'g.node .outer-path path', index: 0, prop: 'fill', variable: 'stateBkg' },
    { kind: 'anchor', rule: /\.state-note\{[^}]*\}/, prop: 'fill', expected: '#fff5ad', note: '23-02 anchor noteBkgColor #fff5ad (v12 theme-base constructor, chunk-KMA2NSDO.mjs:893)' },
    { kind: 'anchor', rule: /\.state-note text\{[^}]*\}/, prop: 'fill', expected: '#333', note: '23-02 anchor noteTextColor #333 (v12 theme-base constructor, chunk-KMA2NSDO.mjs:894)' },
  ],
  er: [
    { kind: 'style', rule: /\.entityBox\{[^}]*\}/, prop: 'fill', variable: 'primaryColor' },
    { kind: 'style', rule: /\.entityBox\{[^}]*\}/, prop: 'stroke', variable: 'primaryBorderColor' },
    { kind: 'style', rule: /\.relationshipLine\{[^}]*\}/, prop: 'stroke', variable: 'relationColor' },
  ],
  // Pie slices emit real fill attributes indexed per slice (probe-validated:
  // slice 0 = pie1, slice 1 = pie2). The slice stroke rule is mermaid's
  // 'black' literal — raw string equality (epsilon 0, no toHex needed).
  pie: [
    { kind: 'attr', selector: 'path.pieCircle', index: 0, prop: 'fill', variable: 'pie1', noGradient: true },
    { kind: 'attr', selector: 'path.pieCircle', index: 1, prop: 'fill', variable: 'pie2', noGradient: true },
    { kind: 'style', rule: /\.pieCircle\{[^}]*\}/, prop: 'stroke', variable: 'pieStrokeColor', raw: true },
  ],
  // Task/section/today/grid colors live only in the style block (probe: task
  // rects carry no fill attributes; axis lines use stroke="currentColor"
  // fed by the block). grid/today are raw literals ('lightgrey'/'red') —
  // exact string equality.
  gantt: [
    { kind: 'style', rule: /\.task0[^{]*\{[^}]*\}/, prop: 'fill', variable: 'taskBkgColor', noGradient: true },
    { kind: 'style', rule: /\.task0[^{]*\{[^}]*\}/, prop: 'stroke', variable: 'taskBorderColor' },
    { kind: 'style', rule: /\.section0\{[^}]*\}/, prop: 'fill', variable: 'sectionBkgColor' },
    { kind: 'style', rule: /\.grid \.tick\{[^}]*\}/, prop: 'stroke', variable: 'gridColor', raw: true },
    { kind: 'style', rule: /\.today\{[^}]*\}/, prop: 'stroke', variable: 'todayLineColor', raw: true },
  ],
  // Mindmap sections are keyed by cScale (probe-verified against the engine:
  // section -1 = the root → cScale0, section 0 = first child level → cScale1
  // for corporate-blue in both modes; the template maps section k to
  // cScale(k+1) for k ≥ 0).
  mindmap: [
    { kind: 'style', rule: /\.section--1 rect[^{]*\{[^}]*\}/, prop: 'fill', variable: 'cScale0', noGradient: true },
    { kind: 'style', rule: /\.section-0 rect[^{]*\{[^}]*\}/, prop: 'fill', variable: 'cScale1', noGradient: true },
  ],
};

// ---------------------------------------------------------------------------
// Assertion engine — throws loudly on ANY missing observable (a 0-match is a
// failure signal, never a skip), compares with epsilon 0.
// ---------------------------------------------------------------------------
function styleTextOf(doc: Document, label: string): string {
  const text = doc.querySelector('style')?.textContent ?? '';
  if (!text) {
    throw new Error(`Probe-validated observable missing (${label}): svg carries no <style> block`);
  }
  return text;
}

function readRuleProp(styleText: string, rule: RegExp, prop: 'fill' | 'stroke', label: string, what: string): string {
  const ruleText = styleText.match(rule)?.[0];
  if (!ruleText) {
    throw new Error(`Probe-validated observable missing (${label}): no style rule matching ${what}`);
  }
  // `${prop}:` cannot false-match `stroke-width:` / `fill-opacity:` — the
  // colon boundary excludes them.
  const value = ruleText.match(new RegExp(`${prop}:([^;]+)`))?.[1];
  if (!value) {
    throw new Error(`Probe-validated observable missing (${label}): no ${prop}: inside rule ${what}`);
  }
  return value.trim();
}

function assertObservables(family: FamilyId, doc: Document, derived: Record<string, string>, label: string): void {
  const styleText = styleTextOf(doc, label);
  for (const obs of FAMILY_OBSERVABLES[family]) {
    if (obs.kind === 'anchor') {
      const observed = readRuleProp(styleText, obs.rule, obs.prop, label, obs.note);
      expect(observed, `${label}: hardcoded anchor failed — ${obs.note}`).toBe(obs.expected);
      continue;
    }
    let observed: string;
    let what: string;
    if (obs.kind === 'style') {
      what = `style rule ${obs.rule} (${obs.prop})`;
      observed = readRuleProp(styleText, obs.rule, obs.prop, label, what);
    } else {
      what = `attr ${obs.selector}[${obs.index}] (${obs.prop})`;
      const els = doc.querySelectorAll(obs.selector);
      if (els.length <= obs.index) {
        throw new Error(`Probe-validated observable missing (${label}): ${obs.selector} matched only ${els.length} element(s)`);
      }
      const value = els[obs.index].getAttribute(obs.prop);
      if (!value || value === 'none') {
        throw new Error(`Probe-validated observable missing (${label}): ${what} has no usable value`);
      }
      observed = value;
    }
    if (obs.noGradient) {
      // Pitfall 4 watch (flowchart/class — the families whose filtered
      // variable sets include nodeBorder): the v12 useGradient tail MUST stay
      // invisible under the classic-look pin. A url(#...) reference here is
      // the v12 delta surfacing — classify under D3, never weaken this guard.
      expect(observed, `${label}: ${what} must be a flat hex — url(#…) would be the v12 useGradient delta (Pitfall 4, D3)`).toMatch(/^#/);
    }
    const expected = derived[obs.variable];
    expect(expected, `${label}: derivation map must contain ${obs.variable}`).toBeDefined();
    if (obs.raw) {
      expect(observed, `${label}: ${what} (raw literal, ${obs.variable})`).toBe(expected);
    } else {
      // toHex normalization is format equivalence ONLY (D5) — the underlying
      // comparison stays exact hex equality.
      expect(toHex(observed), `${label}: ${what} vs derived ${obs.variable}`).toBe(toHex(expected));
    }
  }
}

// ---------------------------------------------------------------------------
// The matrix — TWO top-level describes (research OQ3 runtime budget): each
// half runs as its own targeted command if needed. The GRID stays 192 cells;
// per-command scope shrinks, never the grid. 24 cells per family (12 palettes
// × 2 modes), one render per cell, every cell asserted against the engine.
// ---------------------------------------------------------------------------

// ── Half 1: flowchart, sequence, class, state ──────────────────────────────
describe.each(FAMILY_IDS.slice(0, 4) as FamilyId[])('theme matrix — family: %s', family => {
  it.each(PALETTES.flatMap(p => MODES.map(mode => ({ label: p.label, mode }))))(
    '[$label × $mode] renders exactly the derived colors (THM-01)',
    { timeout: 30000 },
    async ({ label, mode }) => {
      const palette = PALETTES.find(p => p.label === label)!;
      const derived = deriveThemeVariables(palette.coreColors, mode === 'dark');
      const doc = await renderCell(family, palette, mode);
      const cellLabel = `${family} [${label} × ${mode}]`;
      assertObservables(family, doc, derived, cellLabel);

      // Cross-layer hardcoded anchor (23-02 lock duplication): the rendered
      // node fill must equal the palette's literal primaryColor, not merely
      // the engine's output — catches engine+render drifting together.
      if (family === 'flowchart' && palette.anchorPrimary) {
        const styleText = styleTextOf(doc, cellLabel);
        const observedFill = readRuleProp(styleText, /\.node rect[^{]*\{[^}]*\}/, 'fill', cellLabel, '.node rect fill');
        expect(toHex(observedFill), `${cellLabel}: 23-02 anchor — themes.ts primaryColor ${palette.anchorPrimary} must reach the render verbatim (pass-through lock)`).toBe(
          toHex(palette.anchorPrimary)
        );
      }
    }
  );
});

// ── Half 2: er, pie, gantt, mindmap ────────────────────────────────────────
describe.each(FAMILY_IDS.slice(4) as FamilyId[])('theme matrix — family: %s', family => {
  it.each(PALETTES.flatMap(p => MODES.map(mode => ({ label: p.label, mode }))))(
    '[$label × $mode] renders exactly the derived colors (THM-01)',
    { timeout: 30000 },
    async ({ label, mode }) => {
      const palette = PALETTES.find(p => p.label === label)!;
      const derived = deriveThemeVariables(palette.coreColors, mode === 'dark');
      const doc = await renderCell(family, palette, mode);
      assertObservables(family, doc, derived, `${family} [${label} × ${mode}]`);
    }
  );
});

// ---------------------------------------------------------------------------
// E6-empty guard: invalid/empty matrix input routes to the existing
// renderDiagram error path — the error svg ({safeId}) and its d{safeId}
// container are removed (core.ts:163-174) — never a blank palette state. The
// matrix harness itself can never produce a vacuous pass: every observable
// throws on a 0-match.
// ---------------------------------------------------------------------------
describe('theme matrix — input routing (E6-empty)', { timeout: 30000 }, () => {
  it('routes empty input to the error path and removes both temp elements', async () => {
    initMermaid('light', 'base', null);
    const id = 'tmx_empty_input';
    try {
      const { svg, error } = await renderDiagram('', id);
      expect(svg).toBe('');
      expect(error, 'empty input must produce an error, never a blank palette state').not.toBeNull();
      expect(document.getElementById(id)).toBeNull();
      expect(document.getElementById(`d${id}`)).toBeNull();
    } finally {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
    }
  });
});
