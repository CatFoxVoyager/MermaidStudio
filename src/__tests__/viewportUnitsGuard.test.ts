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
 * This gate walks the source bytes directly (no PostCSS involved). Two
 * matchers, one per surface shape:
 * - TS/TSX: string literals only (class names, inline styles). A unit is
 *   covered iff `var(--ui-scale)` lies inside the smallest bracket group
 *   enclosing it (the `[…]` of a Tailwind arbitrary value or the
 *   innermost `(...)`, e.g. a `calc()`); with no enclosing bracket group,
 *   iff the same whitespace-delimited token carries it. An uncovered unit
 *   is exempt only when its class token starts with `max-md:`.
 * - CSS: raw text with comments stripped — declarations are unquoted, so
 *   a literals-only scan would let the whole stylesheet escape. A unit is
 *   covered iff `var(--ui-scale)` appears in the same declaration (between
 *   the preceding `{`/`;` and the following `;`/`}`).
 *
 * The per-occurrence decision (no proximity window) means a converted
 * expression can never mask an adjacent unconverted unit in the same
 * literal. The matcher itself is unit-tested below ("matcher verdicts").
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

const UNIT_RE = /\d+(?:\.\d+)?d?v[wh]/g;
const SCALE_RE = 'var(--ui-scale'; // prefix match: accepts var(--ui-scale) and var(--ui-scale, …)

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

type Literal = { value: string; start: number };
type Occurrence = { unit: string; index: number };

/** The whitespace-delimited token of `text` containing position `pos`. */
function tokenAt(text: string, pos: number): string {
  let start = pos;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  let end = pos;
  while (end < text.length && !/\s/.test(text[end])) end++;
  return text.slice(start, end);
}

/** True when some bracket group (`[…]` or `(...)`) encloses [start,end). */
function innermostGroupCovers(text: string, start: number, end: number): boolean {
  const stack: number[] = [];
  let best: { open: number; close: number } | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') {
      stack.push(i);
    } else if (ch === ')' || ch === ']') {
      const open = stack.pop();
      if (open === undefined) continue; // unbalanced closer
      if (open < start && i >= end && (best === null || i - open < best.close - best.open)) {
        best = { open, close: i };
      }
    }
  }
  if (best === null) return false;
  return text.slice(best.open, best.close + 1).includes(SCALE_RE);
}

/** Verdict inputs for one unit occurrence inside a string literal. */
function literalUnitCovered(literal: string, start: number, end: number): boolean {
  if (innermostGroupCovers(literal, start, end)) return true;
  return tokenAt(literal, start).includes(SCALE_RE);
}

/** Verdict inputs for one unit occurrence inside raw CSS text. */
function cssUnitCovered(css: string, start: number, end: number): boolean {
  // Same declaration: between the preceding { or ; and the next ; or }.
  // Clamped: when no { or ; precedes, the declaration starts at 0 (a
  // negative start would make slice read from the end of the text).
  const declStart = Math.max(0, css.lastIndexOf('{', start), css.lastIndexOf(';', start));
  const semi = css.indexOf(';', end);
  const brace = css.indexOf('}', end);
  const declEnd = semi === -1 ? brace : brace === -1 ? semi : Math.min(semi, brace);
  const declaration = css.slice(declStart, declEnd === -1 ? css.length : declEnd);
  return declaration.includes(SCALE_RE);
}

/**
 * Offending units inside the string literals of a TS/TSX source text.
 * `stringLiterals` may also be exercised directly on sample contents by
 * passing the literal text itself (see the matcher-verdict tests).
 */
function literalOffenders(text: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const lit of stringLiterals(text)) {
    for (const m of lit.value.matchAll(UNIT_RE)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (literalUnitCovered(lit.value, start, end)) continue;
      if (tokenAt(lit.value, start).startsWith('max-md:')) continue;
      out.push({ unit: m[0], index: lit.start + start });
    }
  }
  return out;
}

/** Offending units in raw CSS text (block comments stripped first). */
function cssOffenders(text: string): Occurrence[] {
  const out: Occurrence[] = [];
  const css = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of css.matchAll(UNIT_RE)) {
    const start = m.index!;
    if (!cssUnitCovered(css, start, start + m[0].length)) {
      out.push({ unit: m[0], index: start });
    }
  }
  return out;
}

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

const files = walkSources(SRC);

// Samples are quoted exactly as they appear in real sources: the matcher
// runs on extracted string-literal contents.
describe('viewport-units guard matcher verdicts', () => {
  it('covers a unit inside a bracket group carrying var(--ui-scale)', () => {
    expect(literalOffenders("'max-h-[calc(90vh/var(--ui-scale))]'")).toEqual([]);
  });

  it('flags an adjacent unconverted unit despite a converted neighbour (no proximity window)', () => {
    expect(
      literalOffenders("'max-h-[calc(90vh/var(--ui-scale))] top-[10vh]'").map(o => o.unit)
    ).toEqual(['10vh']);
  });

  it('exempts a max-md: class token', () => {
    expect(literalOffenders("'max-md:max-h-[50dvh]'")).toEqual([]);
  });

  it('covers a bare calc carrying var(--ui-scale)', () => {
    expect(literalOffenders("'calc(100dvh / var(--ui-scale) - 16px)'")).toEqual([]);
  });

  it('flags a bare unconverted unit', () => {
    expect(literalOffenders("'100vh'").map(o => o.unit)).toEqual(['100vh']);
  });

  it('flags an unconverted CSS declaration', () => {
    expect(cssOffenders('max-height: 100vh;').map(o => o.unit)).toEqual(['100vh']);
  });

  it('covers a CSS declaration whose calc divides by var(--ui-scale, 1)', () => {
    expect(cssOffenders('min-height: calc(100vh / var(--ui-scale, 1));')).toEqual([]);
  });
});

describe('desktop viewport units are scale-aware (--ui-scale)', () => {
  it('aucune unité viewport atteignable sur bureau ignore --ui-scale', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(resolve(ROOT, file), 'utf8');
      const found = file.endsWith('.css') ? cssOffenders(text) : literalOffenders(text);
      for (const o of found) {
        offenders.push(`${file}:${lineOf(text, o.index)} → ${o.unit}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
