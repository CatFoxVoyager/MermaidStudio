// Phase 27 — directive-shape render canary (27-01 tracer slice, 27-02 full
// set; 38-02 grows the sweep from 12 keys to ALL 53 canonical shapes). The
// @{ shape } syntax variant is NOT a diagram type, so it cannot ride in
// SWEEP_FIXTURES (the sweep hard-asserts the 22-type grid); this canary
// copies the sweep's probe pattern (initMermaid then renderDiagram — never
// mermaid.render directly) and pins that EVERY canonical directive form the
// writer emits renders error-free through the app's single mermaid
// entrypoint (research Q4: svgLen 11152-32602, error null). The it.each
// table is GENERATED from shapes.ts CANONICAL_SHAPES — the sweep cannot
// silently drop a shape; the length pin keeps it at exactly 53. A typo'd or
// crashing key surfaces here as mermaid's "No such shape" error string.
import { describe, it, expect, beforeAll } from 'vitest';
import { renderDiagram, initMermaid } from '../core';
import { CANONICAL_SHAPES } from '../shapes';

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

describe('at-brace directive render canary (27-01 tracer, 27-02 full set, 38-02 all-53 sweep)', { timeout: 30000 }, () => {
  // The table below is generated from the SSOT registry — this pin keeps the
  // sweep at exactly 53 unique keys (registry shrink fails loudly here).
  const SWEEP_KEYS: string[] = CANONICAL_SHAPES.map(s => s.shortName);

  it('the generated sweep covers exactly the 53 canonical shapes', () => {
    expect(CANONICAL_SHAPES).toHaveLength(53);
    expect(new Set(SWEEP_KEYS).size).toBe(53);
  });

  // Probe floors from research Q4 (rendered svg lengths 11152-32602; 5000
  // sits far below the minimum). A typo'd shape key surfaces as mermaid's
  // "No such shape" error string — the null assert plus the svg floor
  // catches it.
  it.each(SWEEP_KEYS)('renders a standalone %s directive node error-free', async (key) => {
    const { svg, error } = await renderProbe(
      `flowchart TD\nA@{ shape: "${key}", label: "L" }`,
      `p38_${key}`,
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

// ===== 39-01 (ICON-01): the media render oracle. The Image.prototype.decode
// polyfill in tests/vitest.setup.ts is the unblock — at planning HEAD the
// img render died with "img.decode is not a function" in jsdom
// (probe-39-result.json, img_alone/shape_plus_img). Assertions run against
// DOM nodes (document-level querySelector on the returned svg injected into
// the body), NOT substring checks — the planning probe measured that class
// substrings over-match. Mermaid removes its own temp host after render, so
// the oracle mounts the returned svg itself. =====
describe('media node render oracle (39-01 ICON-01)', { timeout: 30000 }, () => {
  // 1x1 PNG — the canonical smallest valid data:image/png URI.
  const TINY_PNG_URI =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  /** Mount a returned svg into the document and hand back its host (caller cleans up). */
  function mountSvg(svg: string): HTMLElement {
    const host = document.createElement('div');
    host.innerHTML = svg;
    document.body.appendChild(host);
    return host;
  }

  it('renders an img data-URI node with a document-level .image-shape group', async () => {
    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        `flowchart TD\nA@{ img: "${TINY_PNG_URI}", constraint: "on" }`,
        'p39_img_oracle',
      );

      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);
      // The architectural premise: mermaid 12.3 emits the .image-shape group
      // for img nodes. Class-bearer querySelector — no substring matching.
      expect(document.querySelector('.image-shape')).not.toBeNull();
    } finally {
      host?.remove();
      document.getElementById('p39_img_oracle')?.remove();
      document.getElementById('dp39_img_oracle')?.remove();
    }
  });

  it('renders an unregistered icon node via the unknownIcon fallback (render resolves, no throw)', async () => {
    let host: HTMLElement | null = null;
    try {
      // Packs are NOT registered in the vitest environment
      // (mermaid.registerIconPacks never runs here), so the icon path takes
      // the unknownIcon fallback — the blue question-mark box (#087ebf).
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "fa:user", form: "square" }',
        'p39_icon_oracle',
      );

      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);
      // The icon node carries the .icon-shape class-bearer group...
      expect(document.querySelector('.icon-shape')).not.toBeNull();
      // ...and the unknownIcon fallback body renders (blue ? box fill).
      expect(document.body.innerHTML).toContain('#087ebf');
    } finally {
      host?.remove();
      document.getElementById('p39_icon_oracle')?.remove();
      document.getElementById('dp39_icon_oracle')?.remove();
    }
  });
});
