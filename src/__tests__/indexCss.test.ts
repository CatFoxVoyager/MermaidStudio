import { describe, it, expect } from 'vitest';
import css from '../index.css?raw';

/**
 * index.css is not loaded by jsdom, so a PostCSS-fatal syntax error ships
 * to CI green: iter-14 shipped a stray `}` that 500'd the whole stylesheet
 * and hung the app on its splash forever (Assessment A11 P0). This gate
 * catches that class of breakage in the suite: brace balance per rule, no
 * stray closers, and a real postcss parse.
 */
describe('index.css syntax sanity', () => {

  it('keeps braces balanced', () => {
    let depth = 0;
    let line = 1;
    for (const ch of css) {
      if (ch === '\n') {line++;}
      if (ch === '{') {depth++;}
      if (ch === '}') {
        depth--;
        expect(depth, `unbalanced } at line ${line}`).toBeGreaterThanOrEqual(0);
      }
    }
    expect(depth, 'unclosed { at end of file').toBe(0);
  });

  it('does not close a rule before the media block that contains it', () => {
    // The iter-14 breakage shape: a top-level rule appeared INSIDE what was
    // meant to be a media block, followed by a stray }. Detect the signature:
    // a line ending in `}` immediately followed by an indented declaration
    // (two leading spaces) that is not a new selector.
    const lines = css.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const closing = lines[i].trimEnd();
      const next = lines[i + 1];
      if (closing === '}' && /^ {2}[a-z-]+: /.test(next)) {
        expect.fail(`orphan declaration after a closing brace at line ${i + 2}: "${next.trim()}"`);
      }
    }
  });

  it('compiles through a real CSS parser (WebKit-style token check)', async () => {
    // Beyond brace counting: postcss is in the dependency tree (Tailwind
    // runs through it), so an actual parse failure surfaces here.
    const postcss = (await import('postcss')).default;
    expect(() => postcss.parse(css, { from: 'src/index.css' })).not.toThrow();
  });
});
