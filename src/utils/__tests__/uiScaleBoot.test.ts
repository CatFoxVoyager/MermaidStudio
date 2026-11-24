import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { applyScale, resolveScale, UI_SCALE_STORAGE_KEY } from '../uiScale';
import { mockMatchMedia, setViewport } from './uiScaleTestHelpers';

const START_MARKER = '<!-- ui-scale-boot:start -->';
const END_MARKER = '<!-- ui-scale-boot:end -->';

function extractBootCode(): string {
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
  const start = html.indexOf(START_MARKER);
  const end = html.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Missing ${START_MARKER} ... ${END_MARKER} block in index.html`);
  }
  return html
    .slice(start + START_MARKER.length, end)
    .replace(/<\/?script[^>]*>/gi, '')
    .trim();
}

function run(): void {
  document.documentElement.style.removeProperty('--ui-scale');
  const code = extractBootCode();
  new Function(code).call(window);
}

const readApplied = () =>
  parseFloat(document.documentElement.style.getPropertyValue('--ui-scale')) || 1;

afterEach(() => {
  applyScale(1);
  localStorage.removeItem(UI_SCALE_STORAGE_KEY);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ui-scale inline boot script (index.html)', () => {
  it.each<[string, number, boolean, number]>([
    ['auto', 1280, true, 0.8],
    ['auto', 1440, true, 1],
    ['auto', 960, false, 1],
    ['0.75', 1280, true, 0.75],
    ['0.75', 700, true, 1],
    ['1', 1280, true, 1],
    ['abc', 1280, true, 0.8],
  ])('préférence %s, %i px, pointeur fin %s → %s', (pref, w, fine, expected) => {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, pref);
    setViewport(w, 640);
    mockMatchMedia(() => fine);
    run();
    expect(readApplied()).toBe(expected);
  });

  it('donne toujours la même échelle que resolveScale', () => {
    for (const w of [700, 768, 900, 1024, 1100, 1280, 1366, 1439, 1440, 1500]) {
      for (const fine of [true, false]) {
        localStorage.setItem(UI_SCALE_STORAGE_KEY, 'auto');
        setViewport(w, 640);
        mockMatchMedia(() => fine);
        run();
        expect(readApplied()).toBe(resolveScale('auto', w, fine));
      }
    }
  });

  it('applique tout de même le repli auto (0.8 à 1280 px) si localStorage.getItem lève', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError');
    });
    setViewport(1280, 720);
    mockMatchMedia(() => true);
    run();
    expect(readApplied()).toBe(0.8);
  });
});
