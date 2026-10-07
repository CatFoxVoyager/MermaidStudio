// Phase 26 (26-01) — dbl-circ render canary. The legacy triple-paren syntax
// variant is NOT a diagram type, so it cannot ride in SWEEP_FIXTURES (the
// sweep hard-asserts the 22-type grid); this canary copies the sweep's probe
// pattern instead: initMermaid(mode) then renderDiagram — never mermaid.render
// directly — through the app's single mermaid entrypoint.
//
// R1/R4 (26-RESEARCH.md Q3): both the unquoted and the quoted form render
// error-free on mermaid 12.1.0 (svgLen 10797 / 10799, circles=6), so this
// file pins non-empty render + >=2 circle elements — the double-circle
// geometry — for both input forms.
import { describe, it, expect, beforeAll } from 'vitest';
import { renderDiagram, initMermaid } from '../core';

beforeAll(() => {
  // jsdom implements no SVG text-metrics APIs; same polyfill shape as the
  // diagram-type sweep (characters x 8px — monotone and layout-plausible
  // enough for renderability, never geometry truth).
  const proto = (globalThis as unknown as { SVGElement?: { prototype: Record<string, unknown> } }).SVGElement
    ?.prototype;
  if (proto && typeof proto.getComputedTextLength !== 'function') {
    proto.getComputedTextLength = function getComputedTextLength(this: SVGElement): number {
      return (this.textContent ?? '').length * 8;
    };
  }
  initMermaid('light');
});

async function renderProbe(content: string, cellId: string): Promise<{ svg: string; error: string | null }> {
  try {
    return await renderDiagram(content, cellId);
  } finally {
    // Belt-and-braces temp-element cleanup (sweep convention — mermaid leaves
    // {safeId} + d{safeId} behind only on FAILED renders).
    document.getElementById(cellId)?.remove();
    document.getElementById(`d${cellId}`)?.remove();
  }
}

describe('dbl-circ legacy syntax render canary (26-01)', { timeout: 30000 }, () => {
  it('renders an unquoted triple-paren node non-empty with at least two circles', async () => {
    const { svg, error } = await renderProbe('flowchart TD\nA(((Stop)))', 'p26_dbl_circ');

    expect(error).toBeNull();
    expect(svg).not.toBe('');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
  });

  it('renders a quoted triple-paren node non-empty with at least two circles', async () => {
    const { svg, error } = await renderProbe('flowchart TD\nA((("Quoted")))', 'p26_dbl_circ_quoted');

    expect(error).toBeNull();
    expect(svg).not.toBe('');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
  });
});
