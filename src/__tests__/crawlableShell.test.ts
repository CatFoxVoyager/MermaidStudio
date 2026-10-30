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

describe('definitional h2 sections + value-prop strip (SHELL-03/04)', () => {
  it('shell carries exactly 4 h2s (SHELL-03 + HEAD-02 raw-HTML half)', () => {
    const h2Count = (shellBlock().match(/<h2/g) ?? []).length;
    expect(
      h2Count,
      'SHELL-03: the shell must carry exactly 4 h2s — the restored comparison h2 plus what-is-mermaidstudio / how-it-works / privacy',
    ).toBe(4);
  });

  it('each definitional section has its anchor id (SHELL-03: h2-anchored)', () => {
    const block = shellBlock();
    for (const id of ['what-is-mermaidstudio', 'how-it-works', 'privacy']) {
      expect(
        block,
        `SHELL-03: missing anchor <h2 id="${id}"> in the shell block`,
      ).toContain(`<h2 id="${id}">`);
    }
  });

  it('each definitional answer measures 40-60 words (SHELL-03: AI-crawler answer length)', () => {
    const block = shellBlock();
    for (const id of ['what-is-mermaidstudio', 'how-it-works', 'privacy']) {
      const h2Start = block.indexOf(`<h2 id="${id}">`);
      expect(h2Start, `SHELL-03: missing h2 id="${id}"`).toBeGreaterThan(-1);
      const close = block.indexOf('</h2>', h2Start);
      // Answer region ends at the next h2 or at the trust line (the last
      // definitional section is followed by <p class="trust">, which is not
      // part of any answer).
      const nextH2 = block.indexOf('<h2', close);
      const trust = block.indexOf('<p class="trust"', close);
      const candidates = [nextH2, trust].filter((i) => i !== -1);
      const end = candidates.length === 0 ? block.length : Math.min(...candidates);
      const answer = block
        .slice(close + '</h2>'.length, end)
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
      expect(
        answer,
        `SHELL-03: "${id}" answer must be 40-60 words (got ${answer}) — direct-answer length for AI crawlers`,
      ).toBeGreaterThanOrEqual(40);
      expect(
        answer,
        `SHELL-03: "${id}" answer must be 40-60 words (got ${answer})`,
      ).toBeLessThanOrEqual(60);
    }
  });

  it('value-prop strip main line and footnote are present verbatim (SHELL-04: zero-JS strip)', () => {
    const block = shellBlock();
    expect(
      block,
      'SHELL-04: strip main line missing — must carry the <strong> lead-in and the never-leaves-your-machine claim',
    ).toContain(
      '<strong>AI runs locally on your GPU (WebGPU)</strong> — your code never leaves your machine.',
    );
    expect(
      block,
      'SHELL-04: strip footnote missing — the 400-700 MB first-use model download must be disclosed before commitment',
    ).toContain(
      'First use downloads the AI model once (about 400–700 MB). After that it runs entirely offline — nothing is uploaded.',
    );
  });

  it('shell h2 + valueprop CSS rules exist in the inline style block (SHELL-03 styling)', () => {
    const style = html.match(/<style>[\s\S]*?<\/style>/);
    expect(style).not.toBeNull();
    expect(
      style![0],
      'SHELL-03: the inline <style> block must carry the .shell h2 heading rule',
    ).toContain('.shell h2{');
  });

  it('added shell CSS carries no fixed width declarations (UI-SPEC overflow row)', () => {
    const style = html.match(/<style>[\s\S]*?<\/style>/)! [0];
    const newRules = style.match(/\.shell (h2|\.valueprop[a-z-]*)\{[^}]*\}/g) ?? [];
    expect(
      newRules.length,
      'SHELL-03/04: expected the .shell h2 and .valueprop rules to exist',
    ).toBeGreaterThan(0);
    for (const rule of newRules) {
      expect(
        rule,
        `UI-SPEC overflow row: shell rule must not fix a width — "${rule}"`,
      ).not.toMatch(/(^|[^-])width:|min-width:/);
    }
  });
});
