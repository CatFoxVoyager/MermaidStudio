/**
 * Shared test helpers for the ui-scale test suite.
 *
 * jsdom ships neither `matchMedia` nor a resizable viewport, and every
 * ui-scale test file needs both. Both helpers install via `vi.stubGlobal`,
 * so a single `vi.unstubAllGlobals()` in `afterEach` restores the pristine
 * environment.
 */
import { vi } from 'vitest';

/**
 * Install a `window.matchMedia` stub whose `matches` is decided by the
 * given predicate over the queried media string.
 */
export function mockMatchMedia(matches: (query: string) => boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })
  );
}

/**
 * Define `innerWidth` / `innerHeight` on `window` (jsdom's are fixed).
 */
export function setViewport(width: number, height: number): void {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);
}
