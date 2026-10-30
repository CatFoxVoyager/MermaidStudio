import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as crawlableShell.test.ts / buildTarget.test.ts (Phase 28).
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Bundle-performance fs gates (PERF-03 / PERF-04).
 *
 * These gates read the source bytes directly — the same bytes Vite ships —
 * so a regression in the boot-splash composition or the font delivery
 * fails the suite.
 *
 * PERF-04 pins the 8s splash fade: the previously-dead
 * `@keyframes boot-splash-out` is applied on #boot-splash with an 8s delay,
 * and the 12s fallback handler CANCELS the fade before swapping in the
 * error copy (without the cancel the swap would render into a
 * visibility:hidden element — the error state would be invisible).
 *
 * PERF-03 pins Google Fonts consolidation: exactly one static head link,
 * zero remote font-host CSS in the compiled app CSS source.
 */
// src/__tests__ -> repo root (same __dirname walk as crawlableShell.test.ts).
const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
// PERF-03 gates read the app CSS source bytes directly too (pure node fs,
// like every suite in this directory — no `?raw` import here).
const appCss = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf8');

/**
 * The exact `#boot-splash{...}` rule — the FIRST occurrence in the file.
 * Not the descendant rules (`#boot-splash .boot-title`) and not the
 * light-scheme media override, both of which appear later.
 */
function bootSplashRule(): string {
  const start = html.indexOf('#boot-splash{');
  expect(
    start,
    'PERF-04: the #boot-splash{ rule was not found in index.html',
  ).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf('}', start));
}

describe('PERF-04 splash fade', () => {
  it('#boot-splash applies boot-splash-out with an 8s delay (dead keyframes applied)', () => {
    const rule = bootSplashRule();
    expect(
      rule,
      'PERF-04: the #boot-splash rule carries no animation: declaration referencing boot-splash-out — the keyframes are still dead code and a hung bundle hangs silently until the 12s swap',
    ).toMatch(/animation:[^;}]*boot-splash-out/);
    expect(
      rule,
      'PERF-04: the #boot-splash fade must fire at 8s (animation-delay 8s) — earlier would fade during slow first loads, later strands users on a dead spinner',
    ).toContain('8s');
  });

  it('@keyframes boot-splash-out exists exactly once (keyframes untouched)', () => {
    const count = (html.match(/@keyframes boot-splash-out\{/g) ?? []).length;
    expect(
      count,
      'PERF-04: expected exactly one @keyframes boot-splash-out in index.html',
    ).toBe(1);
  });

  it('12s handler cancels the fade BEFORE the innerHTML swap (cancel-before-swap composition)', () => {
    const guardIdx = html.indexOf('if(s&&s.parentNode){');
    expect(
      guardIdx,
      'PERF-04: the 12s handler guard `if(s&&s.parentNode){` was not found — the React-detached bail-out must stay',
    ).toBeGreaterThan(-1);
    const swapIdx = html.indexOf('s.innerHTML=', guardIdx);
    expect(
      swapIdx,
      'PERF-04: the 12s handler innerHTML swap was not found after the guard',
    ).toBeGreaterThan(-1);
    const animIdx = html.indexOf("s.style.animation='none'", guardIdx);
    const visIdx = html.indexOf("s.style.visibility='visible'", guardIdx);
    const opIdx = html.indexOf("s.style.opacity='1'", guardIdx);
    expect(
      animIdx,
      'PERF-04: the handler never cancels the fade (style.animation=none missing between the guard and the swap) — after 8s the splash is visibility:hidden, so the error copy would swap in invisibly',
    ).toBeGreaterThan(-1);
    expect(
      visIdx,
      "PERF-04: the handler never restores visibility (style.visibility='visible' missing between the guard and the swap)",
    ).toBeGreaterThan(-1);
    expect(
      opIdx,
      "PERF-04: the handler never restores opacity (style.opacity='1' missing between the guard and the swap)",
    ).toBeGreaterThan(-1);
    expect(
      animIdx < swapIdx && visIdx < swapIdx && opIdx < swapIdx,
      'PERF-04: the cancel statements must run BEFORE the innerHTML swap — cancelling after the swap leaves the error invisible for the fade window',
    ).toBe(true);
    expect(
      animIdx < visIdx && visIdx < opIdx,
      'PERF-04: cancel statements out of order — expected animation=none, then visibility=visible, then opacity=1',
    ).toBe(true);
  });

  it('splash markup, spinner rules and fallback copy are untouched by the fade (do-not-touch presence pins)', () => {
    // Byte-identity is enforced by crawlableShell.test.ts + trustCopy.test.ts;
    // these presence pins catch a fade edit that deleted the surfaces those
    // suites guard from inside THIS suite's own failure messages.
    expect(html, 'PERF-04: splash spinner markup missing').toContain(
      'class="boot-spinner"',
    );
    expect(html, 'PERF-04: splash title markup missing').toContain(
      'class="boot-title"',
    );
    expect(html, 'PERF-04: spinner animation rule missing').toContain(
      'animation:boot-spin 1s linear infinite',
    );
    expect(html, 'PERF-04: 12s fallback copy missing').toContain(
      'MermaidStudio failed to load.',
    );
    expect(html, 'PERF-04: s.parentNode detached-splash guard missing').toContain(
      'if(s&&s.parentNode){',
    );
  });
});

describe('PERF-03 font consolidation', () => {
  it('app CSS source carries zero remote font-host stylesheet URLs (duplicated @import deleted)', () => {
    expect(
      appCss,
      'PERF-03: src/index.css still references fonts.googleapis — the index.html head link is the sole static delivery (its weight set is a strict superset), and a second URL here makes the browser fetch the same families twice',
    ).not.toContain('fonts.googleapis');
  });

  it('index.html carries exactly 1 Google Fonts css2 link (head link is the single static delivery)', () => {
    const count = (html.match(/fonts\.googleapis\.com\/css2/g) ?? []).length;
    expect(
      count,
      'PERF-03: expected exactly 1 Google Fonts css2 URL in index.html — more means the head link multiplied, zero means no fonts ship statically at all',
    ).toBe(1);
  });
});
