/**
 * THM-03 render layer — frontmatter config precedence on mermaid 12 (Plan 23-03 Task 2).
 *
 * D8: every layer of `frontmatter > initialize() > per-type default > global default`
 * is tested as winner AND loser. D10: two real layers, split where the levels
 * actually compete:
 *
 *   1. IN-APP LAYER (first describe) — every render goes through `renderDiagram`
 *      (23-RESEARCH.md Pattern 1 / Pitfall 2: a THM-03 file that bypasses the
 *      app gate proves nothing about the app). The layers under test are the
 *      app's own: the hasCustomTheme gate (core.ts:135-147), the render-time
 *      per-diagram theme (setDiagramTheme — the A3 mapping of CONTEXT's
 *      "per-type default"), the user default (setDefaultTheme — "global
 *      default"), and the content %% @theme marker.
 *
 *   2. MERMAID-INTERNAL LAYER (second describe) — direct `mermaid.initialize` +
 *      `mermaid.render` (sanctioned carve-out, 23-RESEARCH.md Pattern 2): the
 *      layer where initialize() and v12's per-type defaultConfig sections
 *      actually compete. WHY THE SPLIT IS NECESSARY (architectural fact,
 *      recorded per the plan): in-app the two CANNOT compete — doInit delivers
 *      the per-type diagram theme THROUGH initialize's themeVariables
 *      (core.ts:22-31: one channel, no competition possible), and when content
 *      carries frontmatter/init the gate suppresses that channel entirely.
 *
 * Observable method (D2/Pitfall 3): ONE computed color per case. In-app cases
 * read the `.node rect` fill rule out of the SVG <style> block text; the
 * mermaid-internal cases read a real fill ATTRIBUTE. Never getComputedStyle.
 * All expected hexes were OBSERVED on mermaid 12.0.0 via a temporary probe
 * render before being asserted (golden discipline — never invented).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderDiagram, setDefaultTheme, initMermaid } from '../core';
import mermaid from 'mermaid';
import { getThemeById } from '@/constants/themes';
import { deriveThemeVariables } from '@/constants/themeDerivation';
import { toHex } from '@/utils/colorConversion';

// ---------------------------------------------------------------------------
// Fixtures (static template literals — core.test.ts style)
// ---------------------------------------------------------------------------

// Frontmatter carrying an explicit primaryColor override: the directive layer
// mermaid resolves BEFORE any initialize/default config.
const FM_PRIMARY_COLOR = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff0000'
---
flowchart TD
  A[Start] --> B[End]`;

// The same diagram body with NO frontmatter — flips the app's hasCustomTheme
// gate off so the app's own themeVariables channel (if any) is active.
const BODY_ONLY = `flowchart TD
  A[Start] --> B[End]`;

// Content-level %% @theme marker — a mermaid COMMENT (invisible to mermaid's
// parser) that the app reads to pick the per-diagram theme (core.ts:139-140).
const MARKER_BODY = `%% @theme sunset
flowchart TD
  A[Start] --> B[End]`;

// v12 negative case: an unrecognised theme name in frontmatter.
const FM_BAD_THEME = `---
config:
  theme: does-not-exist
---
flowchart TD
  A[Start] --> B[End]`;

// Internal-layer fixture: a minimal state diagram. State shapes emit real
// fill attributes on the .outer-path path (validated by probe) — unlike
// flowchart, whose v12 colors live only in the <style> block.
const STATE_DIAGRAM = `stateDiagram-v2
  [*] --> S1
  S1 --> [*]`;

// ---------------------------------------------------------------------------
// Observables (validated by one probe render before authoring — Pitfall 3)
// ---------------------------------------------------------------------------

// OBSERVED on mermaid 12.0.0 (probe, 2026-09-14): a classic-look flowchart
// carries node colors ONLY inside the SVG <style> block — the `<rect>` itself
// has `style=""` and no fill attribute (research assumption A4 does NOT hold
// for flowchart on v12). Pitfall 3's sanctioned fallback applies: parse the
// style text. The `.node rect` rule's fill IS the computed node fill the SVG
// paints; it is read from the DOM as text and toHex-normalized — never
// getComputedStyle (which returns '' for style-block-styled elements in jsdom).
function flowchartNodeFill(svg: string): string {
  expect(svg).not.toBe('');
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const styleText = doc.querySelector('style')?.textContent ?? '';
  const match = styleText.match(/\.node rect[^{]*\{[^}]*?fill:([^;]+);/);
  if (!match) {
    throw new Error(`Probe-validated observable missing: no ".node rect" fill rule in style block`);
  }
  return toHex(match[1].trim());
}

// OBSERVED on mermaid 12.0.0 (probe, 2026-09-14): classic-look state shapes
// DO carry a real fill attribute — the first path under g.node .outer-path is
// the state shape; its fill is the palette's state fill.
function stateShapeFill(svg: string): string {
  expect(svg).not.toBe('');
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const path = doc.querySelector('g.node .outer-path path');
  if (!path) {
    throw new Error(`Probe-validated observable missing: no "g.node .outer-path path" in state svg`);
  }
  const fill = path.getAttribute('fill');
  if (!fill || fill === 'none') {
    throw new Error(`Probe-validated observable missing: state shape path carries no fill attribute`);
  }
  return toHex(fill);
}

// Expected in-app colors come from the app's own derivation engine (the THM-02
// surface): the theme's primaryColor passes through untouched.
function derivedPrimary(themeId: string): string {
  const theme = getThemeById(themeId);
  if (!theme) throw new Error(`Theme ${themeId} not found`);
  return toHex(deriveThemeVariables(theme.coreColors, false).primaryColor);
}

// mermaid 12 leaves temp elements only on FAILED renders (renderDiagram's catch
// cleans both id forms); this guard covers success renders too and keeps every
// case's residue out of subsequent cases. Unique ids per case.
function cleanupTempElements(id: string): void {
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
}

// Observed hexes (mermaid 12.0.0, probe 2026-09-14) — recorded here so the
// asserts below carry their provenance, structure-goldens.test.ts style:
//   base built-in fallback primaryColor (theme-base constructor): #fff4dd
//   mermaid 'default' theme state shape fill (internal control):  #ECECFF
//   mermaid 'forest' theme state shape fill (internal):           #cde498
//   v12 state defaultConfig section palette (initialize silent):  #ffffff
//     (with the start-state dot fill #28253D — same observed palette)

describe('THM-03 in-app precedence through renderDiagram (D8/D10)', { timeout: 30000 }, () => {
  beforeEach(() => {
    initMermaid('light');
    // renderDiagram resets the per-diagram theme on every call (core.ts:141-145)
    // but the GLOBAL default is module state it never touches — reset it here
    // so each case establishes exactly the layer configuration it tests.
    setDefaultTheme(null);
  });

  afterEach(() => {
    setDefaultTheme(null);
  });

  it('1-winner: frontmatter primaryColor defeats the initialize() layer (gate suppresses themeVariables)', async () => {
    // A global default IS installed: were the hasCustomTheme gate (core.ts:135-147)
    // to regress, doInit would deliver sunset's derived themeVariables through
    // initialize and the frontmatter could not win by non-competition.
    const sunset = getThemeById('sunset');
    if (!sunset) throw new Error('sunset theme missing');
    setDefaultTheme(sunset);

    const id = 'prec_fm_winner';
    try {
      const { svg, error } = await renderDiagram(FM_PRIMARY_COLOR, id);
      expect(error).toBeNull();
      // Directive layer resolves first (frontmatter config.themeVariables) —
      // probe-observed: fill #ff0000.
      expect(flowchartNodeFill(svg)).toBe('#ff0000');
    } finally {
      cleanupTempElements(id);
    }
  });

  it('1-loser: same body WITHOUT frontmatter renders the initialize-derived color instead', async () => {
    const sunset = getThemeById('sunset');
    if (!sunset) throw new Error('sunset theme missing');
    setDefaultTheme(sunset);

    const id = 'prec_fm_loser';
    try {
      const { svg, error } = await renderDiagram(BODY_ONLY, id);
      expect(error).toBeNull();
      // Gate flipped off: doInit(useBase=false) now carries the derived
      // themeVariables through initialize — sunset's primaryColor, not the
      // frontmatter hex.
      expect(flowchartNodeFill(svg)).toBe(derivedPrimary('sunset'));
    } finally {
      cleanupTempElements(id);
    }
  });

  it('2-winner: render-time per-diagram theme (themeId) beats the global default', async () => {
    const sunset = getThemeById('sunset');
    const corporateBlue = getThemeById('corporate-blue');
    if (!sunset || !corporateBlue) throw new Error('builtin theme missing');
    setDefaultTheme(sunset); // global default = sunset

    const id = 'prec_pertype_winner';
    try {
      // A3 mapping: the caller's themeId is the app's "per-type default" layer
      // (per-diagram theme via setDiagramTheme, core.ts:22-31 preference chain).
      const { svg, error } = await renderDiagram(BODY_ONLY, id, 'corporate-blue');
      expect(error).toBeNull();
      expect(flowchartNodeFill(svg)).toBe(derivedPrimary('corporate-blue'));
    } finally {
      cleanupTempElements(id);
    }
  });

  it('2-loser: per-diagram theme absent falls to the global default', async () => {
    const sunset = getThemeById('sunset');
    if (!sunset) throw new Error('sunset theme missing');
    setDefaultTheme(sunset);

    const id = 'prec_pertype_loser';
    try {
      // No themeId: renderDiagram calls setDiagramTheme(null) (core.ts:144) and
      // doInit falls to the defaultTheme preference (core.ts:25-27).
      const { svg, error } = await renderDiagram(BODY_ONLY, id);
      expect(error).toBeNull();
      expect(flowchartNodeFill(svg)).toBe(derivedPrimary('sunset'));
    } finally {
      cleanupTempElements(id);
    }
  });

  it('3-winner: global default beats none (default installed, no diagram theme)', async () => {
    const corporateBlue = getThemeById('corporate-blue');
    if (!corporateBlue) throw new Error('corporate-blue theme missing');
    setDefaultTheme(corporateBlue);

    const id = 'prec_global_winner';
    try {
      const { svg, error } = await renderDiagram(BODY_ONLY, id);
      expect(error).toBeNull();
      expect(flowchartNodeFill(svg)).toBe(derivedPrimary('corporate-blue'));
    } finally {
      cleanupTempElements(id);
    }
  });

  it('3-loser: no default and no diagram theme takes the mermaid built-in base path', async () => {
    const id = 'prec_global_loser';
    try {
      const { svg, error } = await renderDiagram(BODY_ONLY, id);
      expect(error).toBeNull();
      // No custom themeVariables anywhere (core.ts:28-31): the built-in base
      // theme applies. OBSERVED: #fff4dd — the documented theme-base constructor
      // primaryColor (chunk-KMA2NSDO.mjs:892, quoted in 23-RESEARCH.md).
      expect(flowchartNodeFill(svg)).toBe('#fff4dd');
    } finally {
      cleanupTempElements(id);
    }
  });

  it('4-winner: content %% @theme marker defeats the caller themeId', async () => {
    const id = 'prec_marker_winner';
    try {
      // core.ts:139-140 — extractThemeIdFromContent wins over the themeId arg.
      const { svg, error } = await renderDiagram(MARKER_BODY, id, 'corporate-blue');
      expect(error).toBeNull();
      expect(flowchartNodeFill(svg)).toBe(derivedPrimary('sunset'));
    } finally {
      cleanupTempElements(id);
    }
  });

  it('4-loser: no marker renders the caller themeId', async () => {
    const id = 'prec_marker_loser';
    try {
      const { svg, error } = await renderDiagram(BODY_ONLY, id, 'corporate-blue');
      expect(error).toBeNull();
      expect(flowchartNodeFill(svg)).toBe(derivedPrimary('corporate-blue'));
    } finally {
      cleanupTempElements(id);
    }
  });

  it('5-negative: unrecognised frontmatter theme name renders without crash, resolving to the fallback palette', async () => {
    const id = 'prec_bad_theme';
    try {
      const { svg, error } = await renderDiagram(FM_BAD_THEME, id);
      // v12 state of the art: no crash — the unrecognised name degrades safely.
      expect(error).toBeNull();
      expect(svg).not.toBe('');

      // OBSERVED (mermaid 12.0.0, probe 2026-09-14): the resolved variables are
      // the theme-base fallback palette — primaryColor #fff4dd, the SAME fill
      // as the no-theme case — NOT the mermaid 'default' theme palette
      // (#ECECFF, observed on the mermaid-internal control render). The
      // release-note wording "resolves to default in name + variables" is thus
      // empirically "default = theme-base fallback values" on 12.0.0. Recorded
      // per D3/D11; no counter-measure — the degradation is safe and silent.
      expect(flowchartNodeFill(svg)).toBe('#fff4dd');
    } finally {
      cleanupTempElements(id);
    }
  });
});

describe('THM-03 mermaid-internal layer: initialize() vs v12 per-type defaultConfig (Pattern 2)', { timeout: 60000 }, () => {
  // Sanctioned direct initialize + render layer (23-RESEARCH.md Pattern 2 /
  // Pitfall 2 carve-out): where the app gate is irrelevant by design.
  //
  // WHY this pair lives here and not in-app (recorded per the plan): in-app,
  // initialize() and the per-type diagram theme CANNOT compete — doInit
  // delivers the per-type theme THROUGH initialize's themeVariables
  // (core.ts:22-31: one channel), so app-side the pair is conflated by
  // construction. Mermaid's own layering (chunk-KMA2NSDO.mjs:5801-5826) scans
  // siteConfigDelta (= initialize config) BEFORE defaultConfig's per-type
  // sections — that ordering is what these cases lock.
  //
  // Both cases pin look:'classic' + layout:'dagre' so `theme` is the ONLY
  // competing key across the pair: the layout pin keeps this suite independent
  // of the ELK-in-jsdom question owned by THM-04 (plan 23-04), and the look
  // pin prevents the state section's look:'neo' from confounding the theme
  // observation. The app's doInit pins the same two values, so the pinning
  // mirrors production initialize state.
  //
  // Pollution discipline: every subsequent renderDiagram re-initializes via
  // doInit (full initialize replaces the site config), so these direct
  // initializes cannot leak into the in-app cases; ids are unique per case and
  // both temp-element forms are removed in finally (mermaid 12 leaves them on
  // failure only — Phase 22 D9 lesson — but the guard is unconditional).

  afterEach(() => {
    // Re-establish the app's config so any later suite in this file starts
    // from production initialize state (belt-and-braces; in-app describe is
    // ordered first anyway).
    initMermaid('light');
  });

  it('6: initialize() theme beats the per-type defaultConfig section (siteConfigDelta scanned first)', async () => {
    mermaid.initialize({ startOnLoad: false, theme: 'forest', look: 'classic', layout: 'dagre' });
    const id = 'prec_state_init_forest';
    try {
      const { svg } = await mermaid.render(id, STATE_DIAGRAM);
      // OBSERVED (probe 2026-09-14): forest's palette — NOT the v12 state
      // section's redux-color palette (#ffffff, case 7) and NOT the global
      // default (#ECECFF, control below). If defaultConfig's per-type section
      // were scanned before siteConfigDelta, the fill would be #ffffff.
      expect(stateShapeFill(svg)).toBe('#cde498');
    } finally {
      cleanupTempElements(id);
    }
  });

  it('7-loser-of-6: per-type section beats the global default when initialize is theme-silent', async () => {
    mermaid.initialize({ startOnLoad: false, look: 'classic', layout: 'dagre' });
    const id = 'prec_state_silent';
    try {
      const { svg } = await mermaid.render(id, STATE_DIAGRAM);
      // OBSERVED (probe 2026-09-14): the v12 state section's palette (#ffffff,
      // start-state dot #28253D) — distinct from BOTH the global 'default'
      // theme palette and the theme-base fallback. readAppearance for key
      // 'theme' finds state.theme usable inside defaultConfig BEFORE falling
      // back to the global defaultConfig.theme.
      expect(stateShapeFill(svg)).toBe('#ffffff');

      // Contrast control — what "the global default wins" looks like on this
      // exact fixture: initialize explicitly carrying theme:'default' resolves
      // the global default palette (#ECECFF, observed). The silent case's
      // #ffffff is therefore provably the per-type section's outcome, not a
      // coincidental rendering of the global default.
      mermaid.initialize({ startOnLoad: false, theme: 'default', look: 'classic', layout: 'dagre' });
      const controlId = 'prec_state_default_control';
      try {
        const { svg: controlSvg } = await mermaid.render(controlId, STATE_DIAGRAM);
        expect(stateShapeFill(controlSvg)).toBe('#ECECFF');
      } finally {
        cleanupTempElements(controlId);
      }
    } finally {
      cleanupTempElements(id);
    }
  });
});
