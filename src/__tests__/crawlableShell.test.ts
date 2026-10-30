import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as buildTarget.test.ts / cdnEmbed.test.ts.
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Crawlable-shell fs gates (SHELL-01/02).
 *
 * Non-JS crawlers and AI assistants fetch the raw index.html bytes: if the
 * static <main class="shell"> block is missing (deleted "for dev" in d169dbf,
 * 2026-10-06), the served HTML carries zero h1/h2/prose and the site is
 * uncrawlable. These gates read the source bytes directly — the same bytes
 * Vite ships — so a deletion or a wording regression fails the suite.
 */
// src/__tests__ -> repo root (same __dirname walk as buildTarget.test.ts).
const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

function shellBlock(): string {
  const start = html.indexOf('<main class="shell">');
  expect(
    start,
    'SHELL-01: <main class="shell"> not found in index.html — the crawlable shell block is missing',
  ).toBeGreaterThan(-1);
  const end = html.indexOf('</main>', start);
  return html.slice(start, end);
}

describe('crawlable shell restored in index.html (SHELL-01/02)', () => {
  it('carries the <main class="shell"> block (SHELL-01: shell markup restored)', () => {
    shellBlock();
  });

  it('shell h1 names the product for crawlers (SHELL-01: restored h1)', () => {
    expect(
      shellBlock(),
      'SHELL-01: the shell h1 "MermaidStudio — Free &amp; Open-Source Mermaid Diagram Editor" is missing',
    ).toContain('MermaidStudio — Free &amp; Open-Source Mermaid Diagram Editor');
  });

  it('shell block carries >= 185 words of static prose (SHELL-01 word floor)', () => {
    const words = shellBlock()
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    expect(
      words.length,
      'SHELL-01: shell prose word count below the 185-word crawlability floor',
    ).toBeGreaterThanOrEqual(185);
  });

  it('dev-removal comment is deleted (SHELL-02: shell is permanent markup)', () => {
    const hasRemovalComment = html.includes('Shell removed for dev');
    expect(
      hasRemovalComment,
      'SHELL-02: the "Shell removed for dev" removal comment must be deleted — the shell is permanent markup, never hidden or removed for development',
    ).toBe(false);
  });

  it('shell coexists with boot splash, 12s fallback and noscript (SHELL-02)', () => {
    expect(
      html,
      'SHELL-02: #boot-splash must remain (it covers the shell until React mounts)',
    ).toContain('id="boot-splash"');
    expect(
      html,
      'SHELL-02: the 12s inline fallback script must remain (bundle-fail reveal of the shell)',
    ).toContain('MermaidStudio failed to load.');
    const noscript = html.match(/<noscript>[\s\S]*?<\/noscript>/);
    expect(
      noscript,
      'SHELL-02: the <noscript> block must remain for JS-disabled visitors',
    ).not.toBeNull();
    expect(noscript![0]).toContain(
      'https://github.com/CatFoxVoyager/MermaidStudio',
    );
  });
});
