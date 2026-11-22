// 39-02 (ICON-02): the lazy FA6 icon-pack oracle. Registration goes through
// registerFaIconPacks + the app's single render entry (renderDiagram — never
// mermaid.render directly, 27-01 sweep convention). Assertions are DOM-level
// class-bearer queries on the mounted svg (39-01 media-oracle convention):
// the planning probe measured that substring checks over-match on mermaid's
// injected CSS, so glyph-vs-fallback is decided by real path data and the
// unknownIcon marker fill (#087ebf), never by string matching over class
// names.
import { describe, it, expect, beforeAll, vi } from 'vitest';
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

// ===== 39-02 Task 2: fallback, idempotency, and lazy-load failure pins. The
// contracts asserted here are the MEASURED mermaid ones (chunk-R3KSYZAL
// icons.ts): the icons store caches the first successful load per prefix;
// an unregistered prefix throws 'Icon set not found' INSIDE getIconSVG,
// which catches it and degrades to the unknownIcon box; a rejecting loader
// throws 'Failed to load icon set' through the same swallow — render
// RESOLVES with the fallback marker in both cases and never rejects. =====

/** Minimal IconifyJSON pack standing in for real pack data on spy prefixes. */
const TINY_PACK = {
  prefix: 'spy',
  width: 16,
  height: 16,
  icons: {
    user: { body: '<path d="M16 8a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/>' },
  },
};

describe('registration idempotency (39-02)', { timeout: 60000 }, () => {
  it('double registerFaIconPacks + double doInit neither throws nor disturbs the fa render', async () => {
    // The Task-1 oracle already registered the packs and initMermaid ran in
    // beforeAll (its doInit path registers too) — repeating every entry to
    // this state must be a silent no-op with the fa glyph still rendering.
    expect(() => registerFaIconPacks(mermaid)).not.toThrow();
    expect(() => initMermaid('light')).not.toThrow();
    expect(() => initMermaid('light')).not.toThrow();

    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "fa:user", form: "square" }',
        'p39_idem_double',
      );
      expect(error).toBeNull();
      host = mountSvg(svg);
      const glyphPath = document.querySelector('.icon-shape path');
      expect(glyphPath).not.toBeNull();
      expect((glyphPath as SVGPathElement).getAttribute('d') ?? '').not.toBe('');
      expect(host.innerHTML).not.toContain('#087ebf');
    } finally {
      host?.remove();
      document.getElementById('p39_idem_double')?.remove();
      document.getElementById('dp39_idem_double')?.remove();
    }
  });

  it('a second render reuses the cached pack (loader runs ONCE per prefix — icons store load-once)', async () => {
    const loader = vi.fn(async () => TINY_PACK);
    mermaid.registerIconPacks([{ name: 'spy-once', loader }]);

    for (const id of ['p39_spy_a', 'p39_spy_b']) {
      let host: HTMLElement | null = null;
      try {
        const { svg, error } = await renderDiagram(
          `flowchart TD\nA@{ icon: "spy-once:user", form: "square" }`,
          id,
        );
        expect(error).toBeNull();
        host = mountSvg(svg);
        expect(document.querySelector('.icon-shape path')).not.toBeNull();
      } finally {
        host?.remove();
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      }
    }
    // Load-once per prefix: the first successful load filled the icons
    // store; the second render must serve from cache, not re-invoke.
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe('LAY-04 extra offline lazy packs: logos & mdi', { timeout: 60000 }, () => {
  it('renders a REAL glyph for logos:react without unknownIcon fallback', async () => {
    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "logos:react" }',
        'p45_logos_react',
      );
      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);
      expect(document.querySelector('.icon-shape')).not.toBeNull();
      expect(host.innerHTML).not.toContain('#087ebf');
    } finally {
      host?.remove();
      document.getElementById('p45_logos_react')?.remove();
      document.getElementById('dp45_logos_react')?.remove();
    }
  });

  it('renders a REAL glyph for mdi:home without unknownIcon fallback', async () => {
    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "mdi:home" }',
        'p45_mdi_home',
      );
      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);
      const glyphPath = document.querySelector('.icon-shape path');
      expect(glyphPath).not.toBeNull();
      expect((glyphPath as SVGPathElement).getAttribute('d') ?? '').not.toBe('');
      expect(host.innerHTML).not.toContain('#087ebf');
    } finally {
      host?.remove();
      document.getElementById('p45_mdi_home')?.remove();
      document.getElementById('dp45_mdi_home')?.remove();
    }
  });
});

describe('unregistered-prefix fallback (39-02)', { timeout: 60000 }, () => {
  it('unknownpack:react renders the unknownIcon fallback cleanly (render resolves, marker fill present, no throw)', async () => {
    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "unknownpack:react" }',
        'p39_unknown_fallback',
      );

      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);
      expect(document.querySelector('.icon-shape')).not.toBeNull();
      expect(host.innerHTML).toContain('#087ebf');
    } finally {
      host?.remove();
      document.getElementById('p39_unknown_fallback')?.remove();
      document.getElementById('dp39_unknown_fallback')?.remove();
    }
  });
});

describe('lazy-load failure contract (39-02)', { timeout: 60000 }, () => {
  it('a rejecting loader degrades to the unknownIcon fallback (render resolves, not rejects) and a later good registration heals', async () => {
    const boom = vi.fn(() => Promise.reject(new Error('pack load boom')));
    mermaid.registerIconPacks([{ name: 'failpack', loader: boom }]);

    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "failpack:user", form: "square" }',
        'p39_failpack',
      );
      expect(error).toBeNull();
      expect(svg).not.toBe('');
      host = mountSvg(svg);
      expect(host.innerHTML).toContain('#087ebf');
      expect(boom).toHaveBeenCalledTimes(1);
    } finally {
      host?.remove();
      document.getElementById('p39_failpack')?.remove();
      document.getElementById('dp39_failpack')?.remove();
    }

    mermaid.registerIconPacks([{ name: 'failpack', loader: vi.fn(async () => TINY_PACK) }]);

    let healedHost: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(
        'flowchart TD\nA@{ icon: "failpack:user", form: "square" }',
        'p39_failpack_healed',
      );
      expect(error).toBeNull();
      healedHost = mountSvg(svg);
      const glyphPath = document.querySelector('.icon-shape path');
      expect(glyphPath).not.toBeNull();
      expect((glyphPath as SVGPathElement).getAttribute('d') ?? '').not.toBe('');
      expect(healedHost.innerHTML).not.toContain('#087ebf');
    } finally {
      healedHost?.remove();
      document.getElementById('p39_failpack_healed')?.remove();
      document.getElementById('dp39_failpack_healed')?.remove();
    }
  });
});

describe('run-once registration guard (39-02 + 45-01)', () => {
  it('repeat registerFaIconPacks calls make no second register call and register all 6 prefixes', async () => {
    vi.resetModules();
    const fresh = await import('../iconPacks');
    const registerIconPacks = vi.fn();
    const mermaidLike = {
      registerIconPacks,
    } as unknown as Parameters<typeof fresh.registerFaIconPacks>[0];

    fresh.registerFaIconPacks(mermaidLike);
    fresh.registerFaIconPacks(mermaidLike);
    fresh.registerFaIconPacks(mermaidLike);

    expect(registerIconPacks).toHaveBeenCalledTimes(1);
    expect(
      registerIconPacks.mock.calls[0][0].map((entry: { name: string }) => entry.name),
    ).toEqual(['fa', 'fas', 'far', 'fab', 'logos', 'mdi']);
  });
});
