import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import en from '../../../../i18n/locales/en.json';
import fr from '../../../../i18n/locales/fr.json';
import { ExportModal } from '../ExportModal';

// 39-03 copy pins: byte-verbatim from the UI-SPEC copywriting table
// (transplanted mechanically — the em-dashes and FR accents are exact).
const EXPECTED_EN_ONE = `1 external image could not be embedded (blocked by the remote server) — it may be missing from the PNG.`;
const EXPECTED_EN_OTHER = `{{count}} external images could not be embedded (blocked by the remote server) — they may be missing from the PNG.`;
const EXPECTED_FR_ONE = `1 image externe n'a pas pu être intégrée (bloquée par le serveur distant) — elle peut être absente du PNG.`;
const EXPECTED_FR_OTHER = `{{count}} images externes n'ont pas pu être intégrées (bloquées par le serveur distant) — elles peuvent être absentes du PNG.`;

const URL_1 = 'https://cdn.example.com/pic1.png';
const URL_2 = 'https://cdn.example.com/pic2.png';

// Two unique external hrefs: pic1 appears via BOTH attribute spellings, so
// the fetch pass must dedupe it (two fetch calls, not three).
const TEST_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">' +
  `<image href="${URL_1}" width="10" height="10"/>` +
  `<image xlink:href="${URL_1}"/>` +
  `<image href="${URL_2}" width="10" height="10"/>` +
  '</svg>';

const PNG_DATA_URI_PREFIX = 'data:image/png;base64,';
const PNG_BYTES = 'aHVG'; // arbitrary blob payload

// File-scoped i18n mock: resolves keys against the REAL EN catalog with
// i18next plural-suffix selection and {{count}} interpolation, so the
// warning pins assert the shipped copy verbatim through the component.
vi.mock('react-i18next', () => {
  const translate = (key: string, opts?: Record<string, unknown>) => {
    const count = opts?.count;
    const resolvedKey =
      typeof count === 'number'
        ? `${key}_${count === 1 ? 'one' : 'other'}`
        : key;
    const table = en.export as Record<string, string>;
    const shortKey = resolvedKey.replace(/^export\./, '');
    const value = table[shortKey] ?? key;
    return typeof count === 'number'
      ? value.replace(/\{\{count\}\}/g, String(count))
      : value;
  };
  return {
    useTranslation: () => ({ t: translate, i18n: { language: 'en' } }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(async () => ({ svg: TEST_SVG, error: null })),
}));

vi.mock('@/utils/svgPostProcessing', () => ({
  postProcessDiagramSvg: (svg: string) => svg,
}));

// Rasterization double: jsdom never loads data URLs, so the test drives
// onload manually; the captured src is the proof of the inlining pass.
class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  src = '';
  naturalWidth = 100;
  naturalHeight = 50;
  constructor() {
    FakeImage.instances.push(this);
  }
}

interface FetchDouble {
  ok: boolean;
  status: number;
  blob?: () => Promise<Blob>;
  text?: () => Promise<string>;
}

let fetchBehavior: (url: string) => Promise<FetchDouble>;
let createObjectURLMock: ReturnType<typeof vi.fn>;
let revokeObjectURLMock: ReturnType<typeof vi.fn>;

function pngBlob(): Blob {
  return new Blob([PNG_BYTES], { type: 'image/png' });
}

function setupDomStubs() {
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('fonts.g')) {
        // Font CSS pass: empty CSS makes fetchEmbeddedFontCss throw
        // internally (caught, returns '') — deterministic and network-free.
        return { ok: true, status: 200, text: async () => '' };
      }
      return fetchBehavior(url);
    })
  );
  createObjectURLMock = vi.fn(() => 'blob:mock-url');
  revokeObjectURLMock = vi.fn();
  (URL as unknown as Record<string, unknown>).createObjectURL =
    createObjectURLMock;
  (URL as unknown as Record<string, unknown>).revokeObjectURL =
    revokeObjectURLMock;
  // jsdom has no canvas.toBlob — synchronous callback stub.
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (
    callback: (blob: Blob | null) => void
  ) {
    callback(new Blob(['png'], { type: 'image/png' }));
  };
  return () => {
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    vi.unstubAllGlobals();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  };
}

function renderModal() {
  return render(
    <ExportModal
      diagramTitle="Test Diagram"
      diagramContent={'flowchart TD\n  A --> B'}
      onClose={() => {}}
      onCopyLink={() => {}}
    />
  );
}

/** Decode the rasterized data URL back to the SVG text (the encoded body
 * cannot literally contain URLs — base64 has no ':' or '.' — so assertions
 * on substitution must run against the DECODED payload). */
function decodedRasterPayload(fakeImage: FakeImage): string {
  const base64 = fakeImage.src.split(',')[1];
  return atob(base64);
}

describe('ExportModal PNG CORS inlining (ICON-04, 39-03)', () => {
  let cleanupStubs: () => void;

  beforeEach(() => {
    FakeImage.instances.length = 0;
  });

  afterEach(() => {
    cleanupStubs?.();
  });

  it('completes the export and warns with the count when every fetch fails', async () => {
    fetchBehavior = async () => ({ ok: false, status: 403 });
    cleanupStubs = setupDomStubs();
    renderModal();

    fireEvent.click(screen.getByText('Export PNG'));

    await waitFor(() => {
      expect(FakeImage.instances.length).toBe(1);
    });
    act(() => {
      FakeImage.instances[0].onload?.();
    });

    // The export completed: the download was staged and no error alert.
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Warning renders with the interpolated _other copy, verbatim.
    expect(
      screen.getByText(EXPECTED_EN_OTHER.replace('{{count}}', '2'))
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the _one plural form verbatim for a single blocked image', async () => {
    fetchBehavior = async url => {
      if (url === URL_1) return { ok: false, status: 403 };
      return { ok: true, status: 200, blob: async () => pngBlob() };
    };
    cleanupStubs = setupDomStubs();
    renderModal();

    fireEvent.click(screen.getByText('Export PNG'));

    await waitFor(() => {
      expect(FakeImage.instances.length).toBe(1);
    });
    act(() => {
      FakeImage.instances[0].onload?.();
    });

    expect(
      screen.getByText(EXPECTED_EN_ONE.replace('{{count}}', '1'))
    ).toBeInTheDocument();
  });

  it('substitutes data URIs and renders no warning when every fetch succeeds', async () => {
    fetchBehavior = async () => ({ ok: true, status: 200, blob: async () => pngBlob() });
    cleanupStubs = setupDomStubs();
    renderModal();

    fireEvent.click(screen.getByText('Export PNG'));

    await waitFor(() => {
      expect(FakeImage.instances.length).toBe(1);
    });
    act(() => {
      FakeImage.instances[0].onload?.();
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // The rasterized payload carries the inlined data URIs, not the URLs.
    const payload = decodedRasterPayload(FakeImage.instances[0]);
    expect(payload).toContain(PNG_DATA_URI_PREFIX);
    expect(payload).not.toContain(URL_1);
    expect(payload).not.toContain(URL_2);
  });

  it('performs no image fetches and renders no warning on SVG export', async () => {
    const imageFetch = vi.fn(async (_url: string): Promise<FetchDouble> => {
      throw new Error('image fetch must never happen on SVG export');
    });
    fetchBehavior = imageFetch;
    cleanupStubs = setupDomStubs();
    renderModal();

    fireEvent.click(screen.getByText('Export SVG'));

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled();
    });
    expect(imageFetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('pngImageWarning copy parity (39-03)', () => {
  it('carries the UI-SPEC copy byte-verbatim in both locales', () => {
    const enExport = en.export as Record<string, string>;
    const frExport = fr.export as Record<string, string>;
    expect(enExport.pngImageWarning_one).toBe(EXPECTED_EN_ONE);
    expect(enExport.pngImageWarning_other).toBe(EXPECTED_EN_OTHER);
    expect(frExport.pngImageWarning_one).toBe(EXPECTED_FR_ONE);
    expect(frExport.pngImageWarning_other).toBe(EXPECTED_FR_OTHER);
  });
});
