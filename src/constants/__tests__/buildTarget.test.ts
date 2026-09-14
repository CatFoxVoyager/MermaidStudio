import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Path guards (src/constants/__tests__ -> repo root):
// - vite.config.ts: the build config whose build.target defines the JS language
//   floor the shipped bundle is compiled to.
// - playwright.config.ts: the committed E2E config whose projects array defines
//   the browser matrix the suite is proven on.
const VITE_CONFIG_PATH = resolve(__dirname, '../../../vite.config.ts');
const PLAYWRIGHT_CONFIG_PATH = resolve(__dirname, '../../../playwright.config.ts');

/**
 * VAL-02 browser-floor guards (Phase 24, D8 — LOCK, not change).
 *
 * WHY esnext is locked: mermaid 12's dist ships modern (ES2024+) syntax, so the
 * app's bundle floor IS the mermaid floor. `build.target: 'esnext'` satisfies
 * that floor; lowering the target cannot restore graceful degradation on older
 * browsers (mermaid 12 itself still ships modern syntax) — it only hides the
 * breakage until runtime. D8's letter is to LOCK the esnext target so any
 * future lowering is a deliberate, suite-failing act; the real
 * graceful-degradation fix is FR-03 (dynamic import('mermaid'), deferred to
 * v2), not a transpile target.
 *
 * WHY a text guard: the target and the project matrix are load-bearing at the
 * config→runtime trust boundary (threat register T-24-09 / T-24-10) and there
 * is no cheaper artifact that would not simply mirror the same config. The
 * files are read as text OUTSIDE any try/catch — a missing config file fails
 * the suite loudly (no error-suppressing reads).
 */
describe('browser-floor config guards (VAL-02, D8 LOCK)', () => {
  it('vite.config.ts builds for esnext — the mermaid 12 ES2024 floor', () => {
    const config = readFileSync(VITE_CONFIG_PATH, 'utf8');

    // The literal spelling at vite.config.ts:84 is `target: 'esnext',` inside
    // the `build:` block. Asserting the build block's position as context keeps
    // a similarly spelled option elsewhere in the file from satisfying the
    // guard, and asserting the exact quoted value keeps `es2020`-style
    // lowerings (or a dropped option) from sneaking through.
    const buildBlockAt = config.search(/^\s*build:\s*\{/m);
    const targetMatch = config.match(/^\s*target:\s*'esnext',\s*$/m);

    expect(buildBlockAt).toBeGreaterThanOrEqual(0);
    expect(targetMatch).not.toBeNull();
    expect(targetMatch?.index).toBeGreaterThan(buildBlockAt);
  });

  it('playwright.config.ts declares the full ×3 browser matrix (chromium, firefox, webkit)', () => {
    const config = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf8');

    // The ×3 matrix is the D8 browser-proof contract: the complete E2E suite
    // is only proven for the app when every one of the three projects is
    // declared. A silent narrowing (dropping webkit, the Safari-17.4+ floor
    // proxy) must fail the suite.
    for (const project of ['chromium', 'firefox', 'webkit']) {
      expect(config).toMatch(new RegExp(`name:\\s*'${project}'`));
    }
  });
});
