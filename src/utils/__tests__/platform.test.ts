import { describe, it, expect, vi, afterEach } from 'vitest';
import { isNativeShell } from '../platform';

/**
 * Bridge-shape unit contract (PROM-01, 34-RESEARCH.md Pattern 2).
 * The Capacitor global is injected by the HOST environment, not by this app,
 * so every shape the WebView can present must map deterministically:
 *   (a) global absent  — plain mobile web (this repo bundles no @capacitor/core)
 *   (b) present-false  — a web-mode @capacitor/core global (isNativePlatform false)
 *   (c) present-true   — the installed Android shell (native-bridge.js)
 *   (d) SSR guard      — no window at all (server render / exotic runtimes)
 * No `@capacitor/core` import anywhere: bundling core would CREATE the
 * false-positive surface this util exists to avoid.
 */
describe('isNativeShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('(a) returns false when the Capacitor global is absent (plain mobile web)', () => {
    vi.stubGlobal('Capacitor', undefined);
    expect(isNativeShell()).toBe(false);
  });

  it('(b) returns false when isNativePlatform() returns false (web-mode core shape)', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => false });
    expect(isNativeShell()).toBe(false);
  });

  it('(c) returns true when isNativePlatform() returns true (native shell)', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true });
    expect(isNativeShell()).toBe(true);
  });

  it('(d) returns false when window is undefined (SSR guard)', () => {
    vi.stubGlobal('window', undefined);
    expect(isNativeShell()).toBe(false);
  });
});
