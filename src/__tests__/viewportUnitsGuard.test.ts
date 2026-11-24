import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';

/**
 * Viewport-unit guard for the global interface scale (ui-scale phase).
 *
 * The scale mechanism is the `--ui-scale` custom property on <html>,
 * consumed by `html { zoom: var(--ui-scale) }`. Root zoom shrinks the
 * whole box tree, but viewport units (vh/vw/dvh/dvw) still resolve
 * against the physical viewport — unscaled — so any desktop component
 * sized in viewport units overshoots its layout at scale < 1 (a modal
 * capped at `90vh` paints 90 % of the *screen* inside a zoomed root,
 * i.e. overflows). The rule: every viewport-unit size reachable on
 * desktop divides by `var(--ui-scale)` inside a calc, so it is expressed
 * in local (unscaled) px and zoom makes it land on the intended share of
 * the screen.
 *
 * Mobile is pinned at scale 1 by rule, so mobile-only surfaces are
 * exempt: branches behind `max-md:` and the dedicated mobile components.
 *
 * This gate walks the source bytes directly (no PostCSS involved) and
 * fails the suite when a raw `NNvh`/`NNvw`/`NNdvh`/`NNdvw` appears in a
 * desktop-reachable string literal without a neighbouring
 * `var(--ui-scale)`.
 */

// Mobile-only surfaces — scale is always 1 there, viewport units are exact.
const EXEMPT = [
  'src/components/mobile/',
  'src/components/layout/MobileLayout.tsx',
  'src/components/layout/MobileWorkspace.tsx',
];

// src/__tests__ -> repo root (same __dirname walk as crawlableShell.test.ts).
const ROOT = resolve(__dirname, '../..');
const SRC = resolve(__dirname, '..');

/** Recursive walk of `src`, .ts|.tsx|.css, outside __tests__ and EXEMPT. */
function walkSources(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...walkSources(full));
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      const rel = relative(ROOT, full).split(sep).join('/');
      if (!EXEMPT.some(e => rel.includes(e))) files.push(rel);
    }
  }
  return files;
}

const files = walkSources(SRC);

type Literal = { value: string; start: number };

/**
 * String-literal contents (with their start offsets), skipping `//` and
 * block comments. Stripping comments first is what keeps an apostrophe in
 * a comment from splicing surrounding code into a phantom literal.
 *
 * Template literals are walked with their `${...}` interpolations scanned
 * as code: a nested template inside an interpolation is itself a literal
 * (skipping it made the nested `max-h-[90vh]` branch of Modal.tsx
 * invisible to the first version of this guard).
 */
function stringLiterals(text: string): Literal[] {
  const out: Literal[] = [];
  scanCode(text, 0, text.length, out, false);
  return out;
}

/** Read a `'`/`"` literal; returns the index just past its closing quote. */
function readQuoted(text: string, i: number, n: number, quote: string, out: Literal[]): number {
  const start = i;
  i++;
  let value = '';
  while (i < n && text[i] !== quote) {
    if (text[i] === '\\') {
      value += text.slice(i, i + 2);
      i += 2;
    } else {
      value += text[i];
      i++;
    }
  }
  out.push({ value, start });
  return i + 1;
}

/** Read a template literal, recursing into `${...}` interpolations. */
function readTemplate(text: string, i: number, n: number, out: Literal[]): number {
  const start = i;
  i++;
  let chunkStart = i;
  let value = '';
  while (i < n) {
    if (text[i] === '\\') {
      value += text.slice(i, i + 2);
      chunkStart = i + 2;
      i += 2;
    } else if (text[i] === '`') {
      break;
    } else if (text[i] === '$' && text[i + 1] === '{') {
      out.push({ value, start: chunkStart });
      value = '';
      i = scanCode(text, i + 2, n, out, true) + 1; // +1: skip the matching `}`
      chunkStart = i;
    } else {
      value += text[i];
      i++;
    }
  }
  out.push({ value, start: chunkStart });
  return i + 1; // skip the closing backtick
}

/**
 * Walk code characters, collecting string literals. With `stopAtBrace`,
 * stops at the `}` that closes an interpolation (caller skips it).
 */
function scanCode(text: string, i: number, n: number, out: Literal[], stopAtBrace: boolean): number {
  while (i < n) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
    } else if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
    } else if (ch === "'" || ch === '"') {
      i = readQuoted(text, i, n, ch, out);
    } else if (ch === '`') {
      i = readTemplate(text, i, n, out);
    } else if (stopAtBrace && ch === '}') {
      return i;
    } else {
      i++;
    }
  }
  return i;
}

/** 1-based line number of a character index. */
function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

describe('desktop viewport units are scale-aware (--ui-scale)', () => {
  it('aucune unité viewport atteignable sur bureau ignore --ui-scale', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(resolve(ROOT, file), 'utf8');
      for (const lit of stringLiterals(text)) {
        for (const u of lit.value.matchAll(/\d+(?:\.\d+)?d?v[wh]/g)) {
          const end = u.index! + u[0].length;
          const word = lit.value.slice(0, end).split(/\s+/).pop() ?? '';
          const around = lit.value.slice(Math.max(0, u.index! - 40), end + 40);
          if (!word.startsWith('max-md:') && !around.includes('var(--ui-scale)')) {
            offenders.push(`${file}:${lineOf(text, lit.start)} → ${u[0]}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
