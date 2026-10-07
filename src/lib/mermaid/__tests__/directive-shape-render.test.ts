// Phase 27 — directive-shape render canary (27-01 tracer slice, 27-02 full
// set). The @{ shape } syntax variant is NOT a diagram type, so it cannot
// ride in SWEEP_FIXTURES (the sweep hard-asserts the 22-type grid); this
// canary copies the sweep's probe pattern (initMermaid then renderDiagram —
// never mermaid.render directly) and pins that the directive forms the
// parser consumes and the writer emits render error-free through the app's
// single mermaid entrypoint (research Q4: svgLen 11152-32602, error null).
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

describe('at-brace directive render canary (27-01 tracer, 27-02 full set)', { timeout: 30000 }, () => {
  // Phase 27 (27-02): the full 12-key toolbar-target sweep. A typo'd shape
  // key surfaces here as mermaid's "No such shape" error string — the null
  // assert plus the svg floor catches it. Probe floors from research Q4
  // (rendered svg lengths 11152-32602; 5000 sits far below the minimum).
  it.each([
    ['person'], ['doc'], ['delay'], ['sl-rect'], ['div-rect'], ['folder'],
    ['datastore'], ['cloud'], ['browser'], ['bolt'], ['tri'], ['hourglass'],
  ])('renders a standalone %s directive node error-free', async (key) => {
    const { svg, error } = await renderProbe(
      `flowchart TD\nA@{ shape: "${key}", label: "L" }`,
      `p27_${key}`,
    );

    expect(error).toBeNull();
    expect(svg.length).toBeGreaterThan(5000);
  });

  it('renders an edge between two directive nodes error-free', async () => {
    const { svg, error } = await renderProbe(
      'flowchart TD\nA@{ shape: "person", label: "Alice" } --> B@{ shape: "folder", label: "Docs" }',
      'p27_person_edge',
    );

    expect(error).toBeNull();
    expect(svg).not.toBe('');
    expect(svg).toContain('Docs');
  });

  it('renders the escaped-quote label form error-free', async () => {
    const { svg, error } = await renderProbe(
      'flowchart TD\nA@{ shape: "doc", label: "Say \\"hi\\"" }',
      'p27_escaped',
    );

    expect(error).toBeNull();
    expect(svg).not.toBe('');
    expect(svg).toContain('Say');
  });
});
