// DIA-01 — exhaustive diagram-type × theme-mode render sweep on mermaid
// 12.0.0 (Phase 24, plan 24-04). The Wave 0 lock-in: 22 supported types ×
// dark/light = 44 cells, every cell rendered through the app's single mermaid
// entrypoint (renderDiagram → validateDiagramContent → doInit dagre/classic
// pins → mermaid.render → sanitizeMermaidSVG — NEVER mermaid.render directly,
// Pitfall 2) and asserted per cell for: no unexpected error, non-empty svg,
// and at least one substance element in the parsed SVG
// (path/rect/circle/polygon/text/line — never an empty-vs-empty comparison).
//
// Harness conventions copied from the Phase 23 theme-matrix precedent:
// renderDiagram ONLY; the narrowed getBBox jsdom swallow (IN-05 shape — a
// genuine crash that only MENTIONS getBBox must surface); DOMParser for
// structure; describe timeout 30000; per-cell initMermaid(mode) module-state
// re-init (the matrix's renderCell approach — renderDiagram re-inits per
// render from that stored mode, so each mode block runs under its own
// configuration).
//
// The zenuml cell is the single expectedError entry, locked ANTI-VACUOUSLY:
// it passes only while the documented failure still occurs. If a future
// mermaid bundles zenuml and renders it, the assertions below fail loudly and
// force re-classification (the rect.background rationale in reverse). Its D2
// classification record (documented pre-existing acceptance — zenuml is
// absent from the mermaid 12.0.0 dist and was never a dependency pre-flip)
// lives in tests/goldens/README.md.
//
// D10 division of labor: this sweep proves INTEGRATION and NON-EMPTY RENDER
// through the app's real pipeline in jsdom; it does NOT prove pixel-accurate
// browser rendering — that is VAL-02's E2E layer (plan 24-05), with the local
// chromium captures (type-sweep-captures.spec.ts) as the human spot-check
// material.
import { describe, it, expect, beforeAll } from 'vitest';
import { renderDiagram, initMermaid } from '../core';
import { SWEEP_FIXTURES } from './fixtures/diagram-type-fixtures';
import type { SweepFixtureKey } from './fixtures/diagram-type-fixtures';

// [D2 environment classification — full record in tests/goldens/README.md,
// Phase 24 sweep section] jsdom implements no SVG text-metrics APIs. The repo
// already polyfills getBBox globally (tests/vitest.setup.ts:62-76, "required
// by Mermaid"); mermaid 12's shared text-wrapping helper ADDITIONALLY
// measures wrapped text via getComputedTextLength on a d3-created tspan
// (computeWidthOfText — mermaid dist chunk-EBKONHZ7.mjs:1915-1919), which the
// timeline / architecture / c4 renderers route through. Without it those
// cells throw "...getComputedTextLength is not a function" and produce no
// SVG — the same jsdom gap already recorded for this API under v11.17.2
// (the htmlLabels:false precedent in tests/goldens/README.md), so this is
// version-independent environment limitation, not a v12 delta and not an app
// bug. Rather than locking the three families as expectedError, install the
// same shape of polyfill the repo getBBox precedent uses — LOCALLY to this
// sweep, so no other suite's recorded classifications change and all 42
// render cells prove a REAL render through the pipeline. The approximation
// (characters × 8px) is monotone in text length and layout-plausible enough
// for renderability — what D1 asserts — never geometry truth.
beforeAll(() => {
  // `as unknown as` — the constructor shape on globalThis doesn't structurally
  // overlap the narrowed probe type, but the property is only read, never
  // reassigned, when the polyfill below runs.
  const proto = (globalThis as unknown as { SVGElement?: { prototype: Record<string, unknown> } }).SVGElement
    ?.prototype;
  if (proto && typeof proto.getComputedTextLength !== 'function') {
    proto.getComputedTextLength = function getComputedTextLength(this: SVGElement): number {
      return (this.textContent ?? '').length * 8;
    };
  }
});

/**
 * The jsdom getBBox limitation (no text metrics → the polyfilled/missing
 * implementation surfaces as a "... getBBox ... is not a function" TypeError).
 * Narrowed swallow (IN-05): a genuine crash that only MENTIONS getBBox — e.g.
 * reading it off an undefined object inside a layout engine — must surface as
 * an unexpected render error, not be silently tolerated.
 */
const GETBBOX_JSDOM_LIMITATION = /\bgetBBox\b[^\n]*\bnot a function\b/;

const SUBSTANCE_SELECTOR = 'path, rect, circle, polygon, text, line';
const MODES = ['light', 'dark'] as const;
type Mode = (typeof MODES)[number];

const TYPE_IDS = Object.keys(SWEEP_FIXTURES) as SweepFixtureKey[];
if (TYPE_IDS.length !== 22) {
  throw new Error(`DIA-01 grid integrity: expected 22 types, found ${TYPE_IDS.length}`);
}

async function renderCell(type: SweepFixtureKey, mode: Mode): Promise<{ svg: string; error: string | null }> {
  initMermaid(mode);
  const fixture = SWEEP_FIXTURES[type];
  const cellId = `sweep_${type}_${mode}`;
  try {
    return await renderDiagram(fixture.content, cellId);
  } finally {
    // Belt-and-braces temp-element cleanup (Phase 22 D9 convention — mermaid
    // leaves {safeId} + d{safeId} only on FAILED renders).
    document.getElementById(cellId)?.remove();
    document.getElementById(`d${cellId}`)?.remove();
  }
}

for (const mode of MODES) {
  describe(`DIA-01 diagram-type sweep — ${mode} theme`, { timeout: 30000 }, () => {
    it.each(TYPE_IDS)('renders %s (' + mode + ') non-empty with substance through renderDiagram', async (type) => {
      const fixture = SWEEP_FIXTURES[type];
      const { svg, error } = await renderCell(type, mode);

      if (fixture.expectedError) {
        // Documented-failure lock (anti-vacuous): the cell PASSES only while
        // the classified failure still occurs. A render here means a future
        // mermaid bundles this type — re-classify per D2.
        expect(
          error,
          `${type}: expected the documented render failure (D2 classification in tests/goldens/README.md) but it rendered — re-classify the cell`
        ).not.toBeNull();
        expect(svg).toBe('');
        return;
      }

      if (error && !GETBBOX_JSDOM_LIMITATION.test(error)) {
        throw new Error(`Unexpected render error for ${type}: ${error}`);
      }
      expect(svg).not.toBe('');
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const substance = doc.querySelector(SUBSTANCE_SELECTOR);
      expect(
        substance,
        `${type}: rendered SVG carries no substance element (${SUBSTANCE_SELECTOR})`
      ).not.toBeNull();
    });
  });
}
