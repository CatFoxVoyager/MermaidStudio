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

  // Minimal structural Response double: production touches ok/status/blob.
  type ResponseLike = {
    ok: boolean;
    status: number;
    blob: () => Promise<Blob>;
  };

  function mockFetch(
    behavior: (url: string) => Promise<ResponseLike> | never
  ) {
    return vi.fn(async (input: RequestInfo | URL) => behavior(String(input)));
  }

  it('converts successful fetches to data URIs', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(async () => ({
        ok: true,
        status: 200,
        blob: async () => new Blob(['hello'], { type: 'image/png' }),
      }))
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
      mockFetch(async () => ({ ok: false, status: 403, blob: async () => new Blob() }))
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
          return { ok: false, status: 403, blob: async () => new Blob() };
        }
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob(['ok'], { type: 'image/png' }),
        };
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
});
