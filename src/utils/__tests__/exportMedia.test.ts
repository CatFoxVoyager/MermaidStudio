import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  collectExternalImageHrefs,
  fetchImagesAsDataUris,
} from '../exportMedia';

const TWO_EXTERNAL_SVG =
  '<svg><image href="https://cdn.example.com/pic1.png" width="10"/>' +
  '<image xlink:href="https://cdn.example.com/pic1.png"/>' +
  '<image href="https://cdn.example.com/pic2.png"/></svg>';

describe('collectExternalImageHrefs', () => {
  it('collects both attribute spellings and dedupes', () => {
    expect(collectExternalImageHrefs(TWO_EXTERNAL_SVG)).toEqual([
      'https://cdn.example.com/pic1.png',
      'https://cdn.example.com/pic2.png',
    ]);
  });

  it('keeps only https URLs', () => {
    const svg =
      '<svg>' +
      '<image href="http://insecure.example/a.png"/>' +
      '<image href="data:image/png;base64,AAAA"/>' +
      '<image xlink:href="relative/pic.png"/>' +
      '<image href="https://ok.example/b.png"/></svg>';
    expect(collectExternalImageHrefs(svg)).toEqual([
      'https://ok.example/b.png',
    ]);
  });

  it('returns empty for SVG without images', () => {
    expect(collectExternalImageHrefs('<svg><rect/></svg>')).toEqual([]);
  });
});

describe('fetchImagesAsDataUris', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Structural Response double — SUPERSET on purpose (39-REVIEW WR-02):
  // production reads headers + arrayBuffer (the validated bytes path);
  // `blob` is retained so the pre-fix FileReader path stays exercisable when
  // re-proving the RED bite of the Content-Type pins.
  type ResponseLike = {
    ok: boolean;
    status: number;
    blob: () => Promise<Blob>;
    headers: { get: (name: string) => string | null };
    arrayBuffer: () => Promise<ArrayBuffer>;
  };

  function responseDouble(opts: {
    body?: string;
    contentType?: string | null;
    ok?: boolean;
    status?: number;
  }): ResponseLike {
    const body = opts.body ?? '';
    const contentType = opts.contentType === undefined ? 'image/png' : opts.contentType;
    const blob = () =>
      Promise.resolve(new Blob([body], { type: contentType ?? 'image/png' }));
    return {
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      blob,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? contentType : null,
      },
      arrayBuffer: () => blob().then(b => b.arrayBuffer()),
    };
  }

  function mockFetch(
    behavior: (url: string) => Promise<ResponseLike> | never
  ) {
    return vi.fn(async (input: RequestInfo | URL) => behavior(String(input)));
  }

  it('converts successful fetches to data URIs', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async () => responseDouble({ body: 'hello' }))
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.png',
    ]);
    expect(failed).toBe(0);
    expect(replacements.size).toBe(2);
    const dataUri = replacements.get('https://cdn.example.com/a.png');
    expect(dataUri).toBe('data:image/png;base64,' + btoa('hello'));
  });

  it('counts non-ok responses instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async () => responseDouble({ ok: false, status: 403 }))
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.png',
    ]);
    expect(failed).toBe(1);
    expect(replacements.size).toBe(0);
  });

  it('counts throwing fetches (network errors) instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Network unreachable');
      })
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.png',
    ]);
    expect(failed).toBe(1);
    expect(replacements.size).toBe(0);
  });

  it('counts timed-out fetches and still resolves (never hangs, never throws)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        // Ignores the abort signal entirely — the race fallback is what must
        // rescue this call.
        void init;
        return new Promise<ResponseLike>(() => {});
      })
    );
    const { replacements, failed } = await fetchImagesAsDataUris(
      ['https://cdn.example.com/slow.png'],
      { timeoutMs: 30 }
    );
    expect(failed).toBe(1);
    expect(replacements.size).toBe(0);
  });

  it('mixes successes and failures per URL', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async url => {
        if (url.includes('blocked')) {
          return responseDouble({ ok: false, status: 403 });
        }
        return responseDouble({ body: 'ok' });
      })
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/good.png',
      'https://cdn.example.com/blocked.png',
    ]);
    expect(failed).toBe(1);
    expect(replacements.get('https://cdn.example.com/good.png')).toBe(
      'data:image/png;base64,' + btoa('ok')
    );
  });

  // 39-REVIEW WR-02: the emitted data URI's media type is the server's
  // Content-Type header. A hostile header would break out of the href
  // attribute during ExportModal's textual substitution, so the declared
  // type must be validated against the raster allowlist before the URI is
  // built — anything else is a counted failure, never interpolated.

  it('counts a hostile Content-Type instead of emitting its header verbatim', async () => {
    const hostile = 'image/png";evil="';
    vi.stubGlobal(
      'fetch',
      mockFetch(async () => responseDouble({ body: 'hello', contentType: hostile }))
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.png',
    ]);
    expect(failed).toBe(1);
    expect(replacements.size).toBe(0);
  });

  it('counts a missing Content-Type as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async () => responseDouble({ body: 'hello', contentType: null }))
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.png',
    ]);
    expect(failed).toBe(1);
    expect(replacements.size).toBe(0);
  });

  it('counts a non-raster Content-Type (svg+xml) as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async () =>
        responseDouble({ body: '<svg/>', contentType: 'image/svg+xml' })
      )
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.svg',
    ]);
    expect(failed).toBe(1);
    expect(replacements.size).toBe(0);
  });

  it('admits a Content-Type with parameters and emits the canonical URI', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async () =>
        responseDouble({ body: 'ok', contentType: 'image/png; charset=utf-8' })
      )
    );
    const { replacements, failed } = await fetchImagesAsDataUris([
      'https://cdn.example.com/a.png',
    ]);
    expect(failed).toBe(0);
    expect(replacements.get('https://cdn.example.com/a.png')).toBe(
      'data:image/png;base64,' + btoa('ok')
    );
  });

  it('admits each remaining raster mime (jpeg, webp, gif) with its declared type', async () => {
    for (const mime of ['image/jpeg', 'image/webp', 'image/gif'] as const) {
      vi.stubGlobal(
        'fetch',
        mockFetch(async () => responseDouble({ body: 'x', contentType: mime }))
      );
      const { replacements, failed } = await fetchImagesAsDataUris([
        'https://cdn.example.com/a',
      ]);
      expect(failed, mime).toBe(0);
      expect(replacements.get('https://cdn.example.com/a')).toBe(
        `data:${mime};base64,` + btoa('x')
      );
    }
  });
});
