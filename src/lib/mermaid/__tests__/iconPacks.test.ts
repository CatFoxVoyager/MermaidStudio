// 39-02 (ICON-02): the lazy FA6 icon-pack oracle. Registration goes through
// registerFaIconPacks + the app's single render entry (renderDiagram — never
// mermaid.render directly, 27-01 sweep convention). Assertions are DOM-level
// class-bearer queries on the mounted svg (39-01 media-oracle convention):
// the planning probe measured that substring checks over-match on mermaid's
// injected CSS, so glyph-vs-fallback is decided by real path data and the
// unknownIcon marker fill (#087ebf), never by string matching over class
// names.
import { describe, it, expect, beforeAll } from 'vitest';
import mermaid from 'mermaid';
import { renderDiagram, initMermaid } from '../core';
import { registerFaIconPacks } from '../iconPacks';

beforeAll(() => {
  // jsdom implements no SVG text-metrics APIs; same polyfill shape as the
  // directive-shape render canary (characters x 8px).
  const proto = (globalThis as unknown as { SVGElement?: { prototype: Record<string, unknown> } })
    .SVGElement?.prototype;
  if (proto && typeof proto.getComputedTextLength !== 'function') {
    proto.getComputedTextLength = function getComputedTextLength(this: SVGElement): number {
      return (this.textContent ?? '').length * 8;
    };
  }
  initMermaid('light');
});

/** Mount a returned svg into the document and hand back its host (caller cleans up). */
function mountSvg(svg: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = svg;
  document.body.appendChild(host);
  return host;
}

describe('FA6 icon pack render oracle (39-02 ICON-02)', { timeout: 60000 }, () => {
  it('registers the fa pack and renders a REAL FA glyph for fa:user (unknownIcon marker absent)', async () => {
    registerFaIconPacks(mermaid);

    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "fa:user", form: "square" }',
        'p39_fa_user',
      );

      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);

      // The icon node carries the .icon-shape class-bearer group...
      const shape = document.querySelector('.icon-shape');
      expect(shape).not.toBeNull();
      // ...with REAL glyph path data (the FA6 solid user path), proving the
      // loader unwrapped the ESM JSON namespace and mermaid spread the pack
      // (not the fallback box) into its icons store...
      const glyphPath = shape!.querySelector('path');
      expect(glyphPath).not.toBeNull();
      expect((glyphPath as SVGPathElement).getAttribute('d') ?? '').not.toBe('');
      // ...and the unknownIcon fallback (the blue ? box fill) is ABSENT.
      expect(host.innerHTML).not.toContain('#087ebf');
    } finally {
      host?.remove();
      document.getElementById('p39_fa_user')?.remove();
      document.getElementById('dp39_fa_user')?.remove();
    }
  });
});
