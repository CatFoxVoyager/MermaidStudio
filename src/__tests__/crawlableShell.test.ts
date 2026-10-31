import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as buildTarget.test.ts / cdnEmbed.test.ts.
import { readFileSync, readdirSync } from 'fs';
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

describe('no-server claim class tightened in served copy (WR-02 fix round)', () => {
  it('shell lead paragraph scopes the privacy claim to diagrams (WR-02)', () => {
    expect(
      shellBlock(),
      'WR-02: the lead paragraph under the shell h1 must scope the claim — "No account: your diagrams stay on your device." (the Privacy section below discloses Vercel cookieless analytics, so absolute no-server / everything-stays wording contradicts the same page)',
    ).toContain('No account: your diagrams stay on your device.');
  });

  it('what-is-mermaidstudio answer drops the absolute no-server clause (WR-02)', () => {
    expect(
      shellBlock(),
      'WR-02: the what-is answer must keep the claim diagram-scoped — no absolute no-server denial two sections above the analytics disclosure',
    ).toContain('There is no account, no install — diagrams stay on your device.');
  });

  it('og:description and JSON-LD description are diagram-scoped (WR-02 twins)', () => {
    expect(
      html,
      'WR-02: og:description must scope the privacy claim to diagrams and disclose cookieless analytics (no absolute no-server/everything-stays denial)',
    ).toContain('no account — your diagrams stay on your device; analytics are cookieless.');
    expect(
      html,
      'WR-02: the JSON-LD description must scope the privacy claim to diagrams and disclose cookieless analytics',
    ).toContain('No account — your diagrams stay on your device; analytics are cookieless.');
  });
});

// ---------------------------------------------------------------------------
// Machine-readable head surfaces (META-01/02/05, plan 30-02).
//
// Crawlers, card unfurlers and LLM agents read the raw head bytes: the
// JSON-LD block must carry the screenshot pair and the author identity
// profiles, the og:image metas must describe the composed 1200x630 card,
// the meta description must stay inside the 155-char bound, and the ballast
// metas (keywords / author) must stay gone. Rare literals are derived at
// runtime from surfaces this block does not edit (the canonical link, the
// JSON-LD's own keys, the public/ listing) - the token-immune design of the
// 30-01 metadata suite.
// ---------------------------------------------------------------------------
function jsonLd(): Record<string, unknown> {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(
    m,
    'META-01: the application/ld+json block is missing from index.html',
  ).not.toBeNull();
  return JSON.parse(m![1]) as Record<string, unknown>;
}

function metaContent(attr: string, name: string): string | undefined {
  return html.match(new RegExp('<meta ' + attr + '="' + name + '" content="([^"]*)"'))?.[1];
}

const SITE_ORIGIN = (() => {
  const m = html.match(/rel="canonical" href="(https:\/\/[^/]+)\//);
  expect(m, 'META-01: the canonical link is missing from index.html').not.toBeNull();
  return m![1];
})();

const SCREENSHOT_FILES = readdirSync(resolve(__dirname, '../../public'))
  .filter((f: string) => /^screenshot-.*\.png$/.test(f))
  .sort();

describe('machine-readable head surfaces - META-01/02/05', () => {
  it('extracts the JSON-LD block and JSON.parses it clean (structured-data validity)', () => {
    jsonLd();
  });

  it('JSON-LD screenshot is an array of exactly the two stable screenshot URLs (META-01)', () => {
    const shots = jsonLd().screenshot;
    expect(
      Array.isArray(shots),
      'META-01: screenshot must be its own array key with exactly 2 URLs (adjacent to image, never merged into it)',
    ).toBe(true);
    expect(
      SCREENSHOT_FILES,
      'META-01: public/ must hold exactly the two screenshot assets the JSON-LD points at',
    ).toEqual(['screenshot-narrow.png', 'screenshot-wide.png']);
    expect(shots as string[]).toEqual([
      SITE_ORIGIN + '/screenshot-wide.png',
      SITE_ORIGIN + '/screenshot-narrow.png',
    ]);
  });

  it('JSON-LD author.sameAs carries the GitHub profile and the LinkedIn URL (META-01)', () => {
    const sameAs = (jsonLd().author as { sameAs?: string[] }).sameAs;
    expect(
      Array.isArray(sameAs) && sameAs!.length === 2,
      'META-01: author.sameAs must be a 2-entry array (GitHub profile + LinkedIn)',
    ).toBe(true);
    const profile = (jsonLd().codeRepository as string)
      .split('/')
      .slice(0, 4)
      .join('/');
    expect(sameAs, 'META-01: author.sameAs must carry the GitHub profile URL').toContain(profile);
    expect(
      sameAs,
      'META-01: author.sameAs must carry the LinkedIn URL byte-for-byte from the current sameAs array',
    ).toContain('https://www.linkedin.com/in/jeremiedufault/');
  });

  it('app-level sameAs trims to exactly the repository (META-01 - repo already mirrored by codeRepository)', () => {
    const j = jsonLd();
    expect(
      j.sameAs,
      'META-01: the app-level sameAs must trim to the single repo URL',
    ).toEqual([j.codeRepository]);
  });

  it('og:image metas declare the 1200x630 composed card (META-02)', () => {
    expect(
      metaContent('property', 'og:image:width'),
      'META-02: og:image:width must declare 1200 (the composed card asset from 30-01)',
    ).toBe('1200');
    expect(
      metaContent('property', 'og:image:height'),
      'META-02: og:image:height must declare 630 (the composed card asset from 30-01)',
    ).toBe('630');
  });

  it('og:image:alt describes the composed card and no longer names a version badge (META-02)', () => {
    const alt = metaContent('property', 'og:image:alt');
    expect(alt, 'META-02: og:image:alt is missing').toBeTruthy();
    expect(
      alt!,
      'META-02: og:image:alt must not name a version badge (the composed card is badge-free)',
    ).not.toMatch(/badge/i);
    expect(alt!, 'META-02: og:image:alt must describe the composed share card').toMatch(/card/i);
    const name = jsonLd().name as string;
    expect(alt!.includes(name), 'META-02: og:image:alt must name the product').toBe(true);
  });

  it('meta description is trimmed into the <=155 bound and equals the trimmed literal (META-05)', () => {
    const desc = metaContent('name', 'description');
    expect(desc, 'META-05: the meta description is missing').toBeTruthy();
    expect(
      desc!.length,
      `META-05: the meta description must be <= 155 chars (got ${desc!.length})`,
    ).toBeLessThanOrEqual(155);
    expect(
      desc!.length,
      'META-05: the meta description must be non-empty (an empty description is as RED as an over-long one)',
    ).toBeGreaterThan(0);
    const em = String.fromCharCode(8212);
    const trimmed =
      'Free, open-source Mermaid diagram editor that runs online in your browser ' +
      em +
      ' in-browser AI (WebGPU), drag-and-drop editing, folders and version history.';
    expect(
      desc,
      'META-05: the description must equal the trimmed literal (trailing sentence dropped)',
    ).toBe(trimmed);
  });

  it('ballast metas are gone: keywords and author counts are 0 (META-05)', () => {
    expect(
      (html.match(/<meta name="keywords"/g) ?? []).length,
      'META-05: the keywords meta must be deleted (dead ranking signal, audit L5)',
    ).toBe(0);
    expect(
      (html.match(/<meta name="author"/g) ?? []).length,
      'META-05: the author meta must be deleted (the JSON-LD author now carries identity)',
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Trust-line external links (DOC-01/02, plan 30-02).
//
// Humans and crawlers follow the shell's trust line: it must link the docs
// Pages property and the repo changelog alongside the existing GitHub,
// Ko-Fi and Liberapay anchors. The docs URL is derived from public/llms.txt
// (a surface this block does not edit) so the generated surface and the
// shell anchor must agree byte-for-byte; the changelog URL is derived from
// the untouched noscript GitHub link. Rare-literal hygiene: the only
// spelled literal is the case-sensitive Pages path fragment - GitHub Pages
// project paths are case-sensitive (the lowercase variant live-probed 404).
// ---------------------------------------------------------------------------
const trustLine = html.match(/<p class="trust">[\s\S]*?<\/p>/);
const trustText = trustLine ? trustLine[0] : 'text-missing';

const DOCS_URL = (() => {
  const llms = readFileSync(resolve(__dirname, '../../public/llms.txt'), 'utf8');
  const m = llms.match(/https:\/\/[a-z0-9-]+\.github\.io\/MermaidStudio\//);
  expect(m, 'DOC-01: public/llms.txt must advertise the docs Pages URL').not.toBeNull();
  return m![0];
})();
const REPO_URL = (() => {
  const noscript = html.match(/<noscript>[\s\S]*?<\/noscript>/)![0];
  const m = noscript.match(/https:\/\/github\.com\/[^"]+/);
  expect(m, 'DOC-02: the noscript GitHub link must exist (repo URL source)').not.toBeNull();
  return m![0];
})();

describe('trust-line external links (DOC-01/02)', () => {
  it('trust line exists (anchor for the DOC gates)', () => {
    expect(trustLine, 'DOC-02: the trust-line paragraph is missing').not.toBeNull();
  });

  it('trust line links the docs Pages property with the exact live-probed case (DOC-01)', () => {
    expect(
      trustText,
      'DOC-01: the trust line must carry a Docs anchor to ' + DOCS_URL,
    ).toContain('href="' + DOCS_URL + '"');
    expect(
      trustText.includes('github.io/MermaidStudio/'),
      'DOC-01: docs path case must be exact (capital M and S; the lowercase variant live-probed 404)',
    ).toBe(true);
  });

  it('trust line links the changelog blob on the repo (DOC-02)', () => {
    const changelog = REPO_URL + '/blob/main/CHANGELOG.md';
    expect(
      trustText,
      'DOC-02: the trust line must carry a Changelog anchor to the CHANGELOG.md blob',
    ).toContain('href="' + changelog + '"');
  });

  it('trust line carries >= 3 external https anchors (DOC-02 floor)', () => {
    const origin = html.match(/rel="canonical" href="(https:\/\/[^/]+)\//)![1];
    const hrefs = (trustText.match(/href="(https:\/\/[^"]+)"/g) ?? []).map((entry: string) =>
      entry.slice('href="'.length, -1),
    );
    const external = hrefs.filter((href: string) => !href.startsWith(origin));
    expect(
      external.length,
      `DOC-02: the trust line must carry >= 3 external https links (got ${external.length}; same-origin /privacy does not count toward the floor)`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('the four original anchors keep their hrefs (preservation through the edit)', () => {
    for (const fragment of [REPO_URL + '"', 'https://ko-fi.com/', 'https://liberapay.com/', 'href="/privacy"']) {
      expect(trustText, 'DOC-02: original anchor must survive the edit: ' + fragment).toContain(
        fragment,
      );
    }
  });
});
