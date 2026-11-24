import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyScale,
  computeAutoScale,
  getUiScale,
  interceptsBrowserZoomKeys,
  localViewport,
  nextStep,
  readPref,
  resolveScale,
  scaleShortcutModifier,
  screenToLocal,
  UI_SCALE_STORAGE_KEY,
  writePref,
  type UIScalePref,
} from '../uiScale';
import { mockMatchMedia, setViewport } from './uiScaleTestHelpers';
import { log } from '@/utils/logger';

describe('computeAutoScale', () => {
  it.each<[number, number]>([
    [767, 1],
    [768, 0.67],
    [960, 0.67],
    [1024, 0.67],
    [1100, 0.7],
    [1280, 0.8],
    [1366, 0.85],
    [1439, 0.9],
    [1440, 1],
    [1920, 1],
  ])('%i px → %s', (w, expected) => {
    expect(computeAutoScale(w)).toBe(expected);
  });
});

describe('resolveScale', () => {
  it('laisse un palier manuel tel quel', () =>
    expect(resolveScale(0.75, 1920, true)).toBe(0.75));
  it('vaut 1 en auto sur pointeur grossier', () =>
    expect(resolveScale('auto', 1280, false)).toBe(1));
  it('suit la règle auto sur pointeur fin', () =>
    expect(resolveScale('auto', 1280, true)).toBe(0.8));
});

describe('nextStep', () => {
  it.each<[number, -1 | 1, number | null]>([
    [0.8, -1, 0.75],
    [0.85, -1, 0.8],
    [0.67, -1, 0.5],
    [0.5, -1, null],
    [0.8, 1, 0.9],
    [0.85, 1, 0.9],
    [1.5, 1, null],
  ])('depuis %s, direction %i → %s',
    (cur, dir, expected) => {
      expect(nextStep(cur, dir)).toBe(expected);
    }
  );
});

describe('readPref / writePref', () => {
  it.each<[string | null, UIScalePref]>([
    ['0.8', 0.8],
    ['auto', 'auto'],
    [null, 'auto'],
    ['abc', 'auto'],
    ['0', 'auto'],
    ['7', 'auto'],
    ['0.85', 'auto'],
    ['0.8x', 'auto'],
  ])('%s → %s', (raw, expected) => {
    if (raw === null) {
      localStorage.removeItem(UI_SCALE_STORAGE_KEY);
    } else {
      localStorage.setItem(UI_SCALE_STORAGE_KEY, raw);
    }
    expect(readPref()).toBe(expected);
  });

  it('rend auto quand la lecture lève', () => {
    vi.spyOn(log, 'debug').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(readPref()).toBe('auto');
  });

  it("ne lève jamais à l'écriture", () => {
    vi.spyOn(log, 'debug').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writePref(0.8)).not.toThrow();
  });

  it("fait l'aller-retour", () => {
    writePref(0.75);
    expect(readPref()).toBe(0.75);
    writePref('auto');
    expect(readPref()).toBe('auto');
  });
});

describe('applyScale / getUiScale / screenToLocal / localViewport', () => {
  it('pose --ui-scale sur <html> et getUiScale le lit', () => {
    applyScale(0.8);
    expect(getUiScale()).toBe(0.8);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.8');
  });

  it('retire la propriété à 1', () => {
    applyScale(0.8);
    applyScale(1);
    expect(getUiScale()).toBe(1);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');
  });

  it('convertit les px écran en px locaux', () => {
    applyScale(0.8);
    expect(screenToLocal(80)).toBe(100);
  });

  it('donne le viewport en px locaux', () => {
    applyScale(0.8);
    setViewport(1280, 640);
    expect(localViewport()).toEqual({ width: 1600, height: 800 });
  });
});

describe('interceptsBrowserZoomKeys', () => {
  it('est faux dans un onglet', () => {
    mockMatchMedia(() => false);
    expect(interceptsBrowserZoomKeys()).toBe(false);
  });

  it('est vrai en PWA installée hors shell natif', () => {
    mockMatchMedia((q) => q.includes('standalone'));
    expect(interceptsBrowserZoomKeys()).toBe(true);
  });

  it('est faux dans le shell natif, même installé', () => {
    mockMatchMedia((q) => q.includes('standalone'));
    (window as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(interceptsBrowserZoomKeys()).toBe(false);
  });
});

describe('scaleShortcutModifier', () => {
  it.each<[string, 'alt' | 'ctrl']>([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'ctrl',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'alt',
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'alt',
    ],
  ])('%s → %s', (ua, expected) => {
    expect(scaleShortcutModifier(ua)).toBe(expected);
  });
});

afterEach(() => {
  applyScale(1);
  delete (window as { Capacitor?: unknown }).Capacitor;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
