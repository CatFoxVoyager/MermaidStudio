/**
 * Best-effort external-image inlining for PNG export (ICON-04 / T-39-08).
 *
 * Browsers forbid network subresource loads inside SVG-as-<img>, so external
 * `<image href="https://...">` refs render blank in the rasterized PNG even
 * when they show in the live DOM. Before rasterization the export collects
 * the external hrefs, fetches each one, and substitutes a data URI.
 *
 * Everything here is best-effort: fetch failures (CORS blocks, offline,
 * HTTP errors, timeouts) are COUNTED, never thrown — the export proceeds and
 * the modal warns with the failed count (export.pngImageWarning_*).
 */

const IMAGE_TAG_RE = /<image\b[^>]*>/gi;
const IMAGE_HREF_ATTR_RE = /\b(?:xlink:href|href)\s*=\s*"([^"]*)"/gi;
const HTTPS_URL_RE = /^https:\/\//i;

/** Unique external https URLs found in <image> href/xlink:href attributes. */
export function collectExternalImageHrefs(svg: string): string[] {
  const urls = new Set<string>();
  for (const tagMatch of svg.matchAll(IMAGE_TAG_RE)) {
    for (const attrMatch of tagMatch[0].matchAll(IMAGE_HREF_ATTR_RE)) {
      const value = attrMatch[1].trim();
      if (HTTPS_URL_RE.test(value)) urls.add(value);
    }
  }
  return [...urls];
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

interface InlineFetchOptions {
  /** Per-request ceiling in ms (abort + race fallback). Default 8s. */
  timeoutMs?: number;
}

export interface InlineFetchResult {
  /** url -> data URI for every successfully fetched image. */
  replacements: Map<string, string>;
  /** How many fetches failed (CORS, HTTP error, timeout). Never thrown. */
  failed: number;
}

async function fetchOneAsDataUri(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  // The race fallback covers fetch implementations that ignore the abort
  // signal (stubbed environments); both timers are cleared on settlement.
  let cancelRaceTimer: () => void = () => {};
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { signal: controller.signal, mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return blobToDataUri(await response.blob());
      })(),
      new Promise<never>((_, reject) => {
        const raceTimer = setTimeout(
          () => reject(new Error('Image fetch timed out')),
          timeoutMs
        );
        cancelRaceTimer = () => clearTimeout(raceTimer);
      }),
    ]);
  } finally {
    clearTimeout(abortTimer);
    cancelRaceTimer();
  }
}

/**
 * Fetch each URL and convert the blob to a data URI, best-effort: per-URL
 * failures (including the timeout) increment `failed` instead of rejecting.
 */
export async function fetchImagesAsDataUris(
  urls: string[],
  options: InlineFetchOptions = {}
): Promise<InlineFetchResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const replacements = new Map<string, string>();
  let failed = 0;

  await Promise.all(
    urls.map(async url => {
      try {
        const dataUri = await fetchOneAsDataUri(url, timeoutMs);
        replacements.set(url, dataUri);
      } catch {
        failed += 1;
      }
    })
  );

  return { replacements, failed };
}
