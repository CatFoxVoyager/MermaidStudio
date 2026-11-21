/**
 * 39-05 (ICON-03): the upload/paste image compression pipeline.
 *
 * Untrusted image bytes (file picker or clipboard) are validated against a
 * strict mime allowlist and the planner-declared source cap, then DECODED
 * and RE-ENCODED through a canvas so the emitted value is always a
 * `data:image/(png|jpeg|webp|gif)` URI — the only COEP/CSP/offline-safe
 * form (research-locked). The mandatory decode+re-encode is also the
 * metadata-stripping step (EXIF/geo never survives a canvas re-encode) and
 * the polyglot-payload defense (decoded pixels cannot carry the original
 * file structure) — T-39-11 / T-39-12.
 *
 * Declared caps (planner-owned constants, pinned by the util test matrix):
 * - SOURCE_MAX_BYTES  8 MiB  — sources over the cap are rejected BEFORE
 *   decode (the decompression-bomb guard, T-39-13);
 * - MAX_EDGE_PX       512    — the output's longest edge;
 * - OUTPUT_MAX_BYTES  300 KiB — the encoded output ceiling: quality steps
 *   first, then additional downscale steps; `too-large` when even the
 *   floor cannot hold the cap.
 *
 * GIF passes through UNCHANGED (FileReader only) when it already fits the
 * output cap — a canvas re-encode would drop animation frames — and is
 * rejected with `too-large` otherwise (canvas GIF encoding is lossy to a
 * single frame; oversized GIFs have no safe path).
 *
 * The output mime set is exactly the sanitization allowlist (39-03
 * `image-href` data-URI branches), so a compressed output can always ride
 * the render path it is destined for.
 */

export const SOURCE_MAX_BYTES = 8 * 1024 * 1024; // 8 MiB
export const MAX_EDGE_PX = 512;
export const OUTPUT_MAX_BYTES = 300 * 1024; // 300 KiB

/** The accepted source mimes — also the file input's accept list. */
export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export type AcceptedImageMime = (typeof ACCEPTED_MIME_TYPES)[number];
/** `<input type="file" accept>` value covering the same four mimes. */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/** Typed validation codes the panels render as their declared inline rows. */
export type ImageCompressErrorCode = 'invalid-type' | 'too-large';

export class ImageCompressError extends Error {
  readonly code: ImageCompressErrorCode;

  constructor(code: ImageCompressErrorCode, message: string) {
    super(message);
    this.name = 'ImageCompressError';
    this.code = code;
  }
}

/** Encode quality ladder — tried before each downscale step. */
const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5];
/** Additional downscale steps applied once the quality floor is reached. */
const SCALE_STEPS = [1, 0.75, 0.5, 0.35, 0.25];

function canvasToBlob(canvas: HTMLCanvasElement, mime: AcceptedImageMime, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read compressed image data'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Approximate the payload byte length of a base64 data URI (exact for
 * standard base64: 4 chars -> 3 bytes, minus padding). Feeds the panel's
 * size readout — the ImgConfig carries only the URI, not the blob size.
 */
export function dataUriByteLength(uri: string): number {
  const comma = uri.indexOf(',');
  if (comma < 0) {return 0;}
  const b64 = uri.slice(comma + 1);
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/** Human size readout ("24 KB", "1.2 MB") for the readout and error copy. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${Math.round(bytes / 1024)} KB`;}
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * Validate and compress an image source into a capped data URI.
 *
 * Throws {@link ImageCompressError} with code `invalid-type` (mime outside
 * the allowlist) or `too-large` (over the source cap, oversized GIF, or an
 * output the quality/downscale floor cannot bring under the output cap).
 */
export async function fileToCompressedDataUri(file: File | Blob): Promise<string> {
  // 1. Strict mime allowlist — before any decode work (T-39-11).
  const mime = file.type as AcceptedImageMime;
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageCompressError('invalid-type', `Unsupported file type: ${file.type || 'unknown'}`);
  }
  // 2. Source cap BEFORE decode — the decompression-bomb guard (T-39-13).
  if (file.size > SOURCE_MAX_BYTES) {
    throw new ImageCompressError('too-large', `Image exceeds the ${formatBytes(SOURCE_MAX_BYTES)} source cap`);
  }
  // 3. GIF passthrough: unchanged bytes keep animation; oversized GIFs are
  //    rejected (no safe re-encode path — canvas flattens to one frame).
  if (file.type === 'image/gif') {
    if (file.size <= OUTPUT_MAX_BYTES) {
      return blobToDataUri(file);
    }
    throw new ImageCompressError('too-large', `GIF exceeds the ${formatBytes(OUTPUT_MAX_BYTES)} output cap`);
  }

  // 4. Decode -> downscale -> re-encode. Every emitted byte passes through
  //    the canvas, so original metadata and payload structure never survive
  //    (T-39-11 / T-39-12 by construction).
  const bitmap = await createImageBitmap(file);
  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    // Fit the longest edge to the cap first; never upscale a small source.
    const fitScale = Math.min(1, MAX_EDGE_PX / longestEdge);
    for (const scaleStep of SCALE_STEPS) {
      const scale = fitScale * scaleStep;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {break;}
      ctx.drawImage(bitmap, 0, 0, width, height);
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, mime, quality);
        if (blob && blob.size <= OUTPUT_MAX_BYTES) {
          return await blobToDataUri(blob);
        }
        // PNG/WebP-lossless encodes ignore the quality parameter — the
        // ladder cannot shrink them, so drop straight to the next scale.
        if (file.type === 'image/png') {break;}
      }
    }
    throw new ImageCompressError('too-large', `Image could not be compressed under ${formatBytes(OUTPUT_MAX_BYTES)}`);
  } finally {
    (bitmap as ImageBitmap & { close?: () => void }).close?.();
  }
}
