// 39-05 (ICON-03) Task 1: the compression util's contract matrix. The REAL
// util runs; only the browser encoding surfaces are mocked (jsdom has no
// createImageBitmap and no canvas.toBlob): a fixture ImageBitmap and a
// toBlob stub whose blob size derives from the recorded canvas dims +
// quality, so the caps, ladders and passthrough branches are exercised for
// real against controlled encodes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCEPTED_MIME_TYPES,
  IMAGE_ACCEPT,
  ImageCompressError,
  MAX_EDGE_PX,
  OUTPUT_MAX_BYTES,
  SOURCE_MAX_BYTES,
  dataUriByteLength,
  fileToCompressedDataUri,
  formatBytes,
} from '../imageCompress';

type RecordedEncode = { width: number; height: number; quality: number; mime: string };

const recorded: RecordedEncode[] = [];
let createImageBitmapMock = vi.fn();
/** Blob size the toBlob stub produces for the next encode attempts. */
let encodeByteBudget: (rec: RecordedEncode) => number = (rec) => rec.width * rec.height;

function makeFile(bytes: number, type: string, name = 'img'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function fixtureBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: () => {} } as unknown as ImageBitmap;
}

beforeEach(() => {
  recorded.length = 0;
  encodeByteBudget = (rec) => rec.width * rec.height;
  createImageBitmapMock = vi.fn(async (file: File | Blob) => {
    // The fixture bitmap's dims ride the file name: "img 2000x1000".
    const m = /(\d+)x(\d+)/.exec(file instanceof File ? file.name : '') ?? ['', '64', '64'];
    return fixtureBitmap(Number(m[1]), Number(m[2]));
  });
  vi.stubGlobal('createImageBitmap', createImageBitmapMock);
  window.HTMLCanvasElement.prototype.toBlob = function (
    this: HTMLCanvasElement,
    cb: (blob: Blob | null) => void,
    mime?: string,
    quality?: number,
  ) {
    const rec: RecordedEncode = {
      width: this.width,
      height: this.height,
      quality: quality ?? 1,
      mime: mime ?? 'image/png',
    };
    recorded.push(rec);
    const size = encodeByteBudget(rec);
    cb(new Blob([new Uint8Array(Math.max(1, size))], { type: rec.mime }));
  } as unknown as HTMLCanvasElement['toBlob'];
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window.HTMLCanvasElement.prototype as { toBlob?: unknown }).toBlob;
});

describe('imageCompress (39-05 ICON-03)', () => {
  it('declares the planner-owned caps and the exact four-mime allowlist', () => {
    expect(SOURCE_MAX_BYTES).toBe(8 * 1024 * 1024);
    expect(MAX_EDGE_PX).toBe(512);
    expect(OUTPUT_MAX_BYTES).toBe(300 * 1024);
    expect(ACCEPTED_MIME_TYPES).toEqual(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    expect(IMAGE_ACCEPT).toBe('image/png,image/jpeg,image/webp,image/gif');
  });

  it('compresses a valid png under the caps to a data:image/png URI (backstop mime shape)', async () => {
    const uri = await fileToCompressedDataUri(makeFile(1024, 'image/png', 'img 2000x1000'));
    expect(uri).toMatch(/^data:image\/png;base64,/);
    // Longest edge fitted to the cap on the FIRST canvas, never upscaled.
    expect(recorded[0].width).toBe(512);
    expect(recorded[0].height).toBe(256);
    expect(dataUriByteLength(uri)).toBeLessThanOrEqual(OUTPUT_MAX_BYTES);
  });

  it('compresses valid jpeg and webp sources through the same pipeline', async () => {
    const jpeg = await fileToCompressedDataUri(makeFile(512, 'image/jpeg', 'img 800x600'));
    const webp = await fileToCompressedDataUri(makeFile(512, 'image/webp', 'img 800x600'));
    expect(jpeg).toMatch(/^data:image\/jpeg;base64,/);
    expect(webp).toMatch(/^data:image\/webp;base64,/);
  });

  it('steps the quality ladder before downscaling (jpeg)', async () => {
    // 512x512 jpeg at quality 0.9 would be too big; 0.8 fits — the ladder
    // must record the failed 0.9 attempt before the passing 0.8 encode.
    encodeByteBudget = (rec) => (rec.quality >= 0.9 ? OUTPUT_MAX_BYTES + 1 : 1024);
    const uri = await fileToCompressedDataUri(makeFile(512, 'image/jpeg', 'img 512x512'));
    expect(uri).toMatch(/^data:image\/jpeg;base64,/);
    expect(recorded.map((r) => r.quality)).toEqual([0.9, 0.8]);
    expect(recorded.every((r) => r.width === 512)).toBe(true); // no downscale needed
  });

  it('adds downscale steps once the quality floor cannot hold the cap', async () => {
    // Every quality at the fitted 512 edge is too big; only the 0.5x
    // downscale produces a fitting encode.
    encodeByteBudget = (rec) => (rec.width > 256 ? OUTPUT_MAX_BYTES + 1 : 512);
    const uri = await fileToCompressedDataUri(makeFile(512, 'image/jpeg', 'img 1024x1024'));
    expect(dataUriByteLength(uri)).toBeLessThanOrEqual(OUTPUT_MAX_BYTES);
    const last = recorded[recorded.length - 1];
    expect(last.width).toBeLessThan(512); // a downscale step actually ran
  });

  it('the output edge never exceeds MAX_EDGE_PX on any attempted encode', async () => {
    encodeByteBudget = (rec) => (rec.width > 256 ? OUTPUT_MAX_BYTES + 1 : 512);
    await fileToCompressedDataUri(makeFile(512, 'image/jpeg', 'img 2000x1000'));
    for (const rec of recorded) {
      expect(Math.max(rec.width, rec.height)).toBeLessThanOrEqual(MAX_EDGE_PX);
    }
  });

  it('rejects an over-cap source with too-large BEFORE any decode work', async () => {
    const big = makeFile(SOURCE_MAX_BYTES + 1, 'image/png', 'img 64x64');
    await expect(fileToCompressedDataUri(big)).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'too-large',
    });
    expect(createImageBitmapMock).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });

  it('rejects a wrong-mime source with invalid-type (no decode, no encode)', async () => {
    await expect(fileToCompressedDataUri(makeFile(64, 'image/bmp'))).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'invalid-type',
    });
    await expect(fileToCompressedDataUri(makeFile(64, ''))).rejects.toMatchObject({ code: 'invalid-type' });
    expect(createImageBitmapMock).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });

  it('maps a decode failure (corrupt bytes) onto the typed invalid-type code', async () => {
    // A mime-valid, size-valid file whose bytes are not a decodable image
    // (truncated download, renamed text file) must reach the panels' typed
    // inline-error row like any other validation failure — a raw DOMException
    // would end the spinner with no user-visible error (39-REVIEW WR-03).
    createImageBitmapMock.mockRejectedValueOnce(
      new DOMException('Underlying decoder refused the bytes', 'InvalidStateError')
    );
    await expect(fileToCompressedDataUri(makeFile(512, 'image/png', 'corrupt'))).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'invalid-type',
    });
    expect(recorded).toHaveLength(0); // no canvas work ran
  });

  it('passes an under-cap GIF through unmodified (no decode, no re-encode)', async () => {
    const gif = makeFile(1024, 'image/gif', 'anim');
    const uri = await fileToCompressedDataUri(gif);
    expect(uri).toMatch(/^data:image\/gif;base64,/);
    expect(createImageBitmapMock).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(0);
  });

  it('rejects an over-cap GIF with too-large (no safe re-encode path)', async () => {
    const gif = makeFile(OUTPUT_MAX_BYTES + 1, 'image/gif', 'anim');
    await expect(fileToCompressedDataUri(gif)).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'too-large',
    });
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  });

  it('throws too-large when even the downscale floor cannot hold the output cap', async () => {
    encodeByteBudget = () => OUTPUT_MAX_BYTES + 1;
    await expect(fileToCompressedDataUri(makeFile(512, 'image/jpeg', 'img 512x512'))).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'too-large',
    });
    // The full ladder ran: 5 scale steps x 5 quality steps.
    expect(recorded).toHaveLength(25);
  });

  it('every emitted output matches the data:image/(png|jpeg|webp|gif) backstop shape', async () => {
    for (const mime of ACCEPTED_MIME_TYPES) {
      const uri = await fileToCompressedDataUri(makeFile(128, mime, 'img 100x100'));
      expect(uri).toMatch(/^data:image\/(png|jpeg|webp|gif);base64,/);
    }
  });

  it('dataUriByteLength decodes standard base64 exactly; formatBytes reads human', () => {
    const payload = 'A'; // 1 byte -> 'QQ=='
    const uri = `data:image/png;base64,${btoa(payload)}`;
    expect(dataUriByteLength(uri)).toBe(1);
    expect(dataUriByteLength(`data:image/png;base64,${btoa('ab')}`)).toBe(2);
    expect(dataUriByteLength('data:image/png;base64,')).toBe(0);
    expect(dataUriByteLength('no-comma')).toBe(0);
    expect(formatBytes(SOURCE_MAX_BYTES)).toBe('8 MB');
    expect(formatBytes(OUTPUT_MAX_BYTES)).toBe('300 KB');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(24 * 1024)).toBe('24 KB');
  });
});
