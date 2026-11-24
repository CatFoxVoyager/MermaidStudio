/**
 * Global interface scale — pure rule and conversion helpers (Task 1).
 *
 * Single source of truth: the `--ui-scale` custom property on `<html>`,
 * consumed by CSS as `zoom: var(--ui-scale, 1)`. No JavaScript ever sets
 * `zoom` directly. Screen→local coordinate conversions divide by the value
 * read back through `getUiScale()`.
 *
 * Auto rule: on a desktop pointer (`(hover: hover) and (pointer: fine)`)
 * with `768 ≤ innerWidth < 1440`, scale is
 * `clamp(round5(innerWidth / 1600), 0.67, 1)` with `round5(x) =
 * Math.round(x * 20) / 20`; everywhere else (coarse pointer, narrow, wide)
 * it is 1. Whether mobile is forced to 1 is decided by the provider built
 * on top of these helpers, not here.
 *
 * jsdom has no `matchMedia`, so every media-query read is guarded.
 */
import { storage } from '@/utils/logger';
import { isNativeShell } from '@/utils/platform';

/** 'auto' or one of the UI_SCALE_STEPS values. */
export type UIScalePref = 'auto' | number;

export const UI_SCALE_STORAGE_KEY = 'mermaid-studio-ui-scale';
export const UI_SCALE_NOTICE_KEY = 'mermaid-studio-ui-scale-notice-shown';

export const UI_SCALE_STEPS: readonly number[] = [
  0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5,
];

export const AUTO_MIN_WIDTH = 768;
export const AUTO_MAX_WIDTH = 1440;
export const AUTO_REFERENCE_WIDTH = 1600;
export const AUTO_FLOOR = 0.67;

/** Tolerance for "is this exactly a step?" comparisons on floats. */
const STEP_EPSILON = 1e-6;

function round5(x: number): number {
  return Math.round(x * 20) / 20;
}

/**
 * Auto scale for a given viewport width. Widths outside the auto band
 * ([AUTO_MIN_WIDTH, AUTO_MAX_WIDTH)) get 1; inside, the rounded ratio is
 * clamped to [AUTO_FLOOR, 1].
 */
export function computeAutoScale(innerWidth: number): number {
  if (innerWidth < AUTO_MIN_WIDTH || innerWidth >= AUTO_MAX_WIDTH) return 1;
  const raw = round5(innerWidth / AUTO_REFERENCE_WIDTH);
  return Math.min(1, Math.max(AUTO_FLOOR, raw));
}

/**
 * True when the device has a fine, hover-capable pointer. False without a
 * DOM or a matchMedia implementation (jsdom).
 */
export function isDesktopPointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Resolve a preference to an effective scale. A manual step is returned
 * as-is; 'auto' follows the auto rule on a desktop pointer and is 1
 * otherwise.
 */
export function resolveScale(
  pref: UIScalePref,
  innerWidth: number,
  desktopPointer: boolean
): number {
  if (pref !== 'auto') return pref;
  return desktopPointer ? computeAutoScale(innerWidth) : 1;
}

/**
 * Neighbouring step in the given direction from `current` (which may sit
 * between steps, e.g. after a viewport-driven auto change). `null` once
 * the end of the ladder is reached.
 */
export function nextStep(current: number, direction: -1 | 1): number | null {
  if (direction === -1) {
    let best: number | null = null;
    for (const step of UI_SCALE_STEPS) {
      if (step < current - STEP_EPSILON) best = step;
      else break;
    }
    return best;
  }
  for (const step of UI_SCALE_STEPS) {
    if (step > current + STEP_EPSILON) return step;
  }
  return null;
}

/**
 * Read the stored preference. Anything that is not exactly a step value
 * (including a missing key) reads as 'auto'.
 */
export function readPref(): UIScalePref {
  const raw = storage.getItem(UI_SCALE_STORAGE_KEY);
  if (raw === null) return 'auto';
  const value = Number(raw);
  return UI_SCALE_STEPS.includes(value) ? value : 'auto';
}

/**
 * Persist the preference. Never throws (the storage helper swallows
 * quota/private-mode failures).
 */
export function writePref(pref: UIScalePref): void {
  storage.setItem(UI_SCALE_STORAGE_KEY, pref === 'auto' ? 'auto' : String(pref));
}

/**
 * Reflect the scale onto `<html>` as `--ui-scale`. At 1 the property is
 * removed so the CSS fallback (`var(--ui-scale, 1)`) applies — the default
 * document carries no inline style. No-op without a DOM.
 */
export function applyScale(scale: number): void {
  if (typeof document === 'undefined') return;
  const style = document.documentElement.style;
  if (scale === 1) {
    style.removeProperty('--ui-scale');
  } else {
    style.setProperty('--ui-scale', String(scale));
  }
}

/**
 * Current effective scale, read back from the `--ui-scale` custom
 * property. Returns 1 when unset or unparsable.
 */
export function getUiScale(): number {
  if (typeof document === 'undefined') return 1;
  const value = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')
  );
  return value || 1;
}

/** Convert a screen-space x coordinate to local (unscaled) px. */
export function screenToLocal(px: number): number {
  return px / getUiScale();
}

/** Current viewport size in local (unscaled) px. */
export function localViewport(): { width: number; height: number } {
  const scale = getUiScale();
  return {
    width: (typeof window === 'undefined' ? 0 : window.innerWidth) / scale,
    height: (typeof window === 'undefined' ? 0 : window.innerHeight) / scale,
  };
}

/**
 * True when the app runs as an installed PWA outside the native shell —
 * the contexts where browser Ctrl+/- zoom is either absent (standalone
 * window) or already intercepted (native shell delegates to the app), so
 * keyboard shortcuts may drive the app scale instead.
 */
export function interceptsBrowserZoomKeys(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(display-mode: standalone)').matches && !isNativeShell();
}

/**
 * Modifier for the scale keyboard shortcut: on macOS the browser owns
 * Ctrl+/- for zoom, so the app shortcut uses Ctrl; elsewhere Ctrl is free
 * for zoom and the app uses Alt. Decision is made on the UA string.
 */
export function scaleShortcutModifier(userAgent: string): 'alt' | 'ctrl' {
  return userAgent.includes('Mac') ? 'ctrl' : 'alt';
}
