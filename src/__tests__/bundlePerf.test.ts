import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as crawlableShell.test.ts / buildTarget.test.ts (Phase 28).
import { readdirSync, readFileSync } from 'fs';
import { relative, resolve } from 'path';

/**
 * Bundle-performance fs gates (PERF-01 / PERF-03 / PERF-04).
 *
 * These gates read the source bytes directly — the same bytes Vite ships —
 * so a regression in the boot-splash composition, the font delivery, or
 * the boot chain's parser purity fails the suite.
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

// PERF-01 parser purity (29-02): the boot chain's parser-only consumers of
// detectDiagramType must import it from the core-free
// src/lib/mermaid/diagramType.ts, never from '@/lib/mermaid/core' — a static
// core import here keeps the mermaid runtime on the eager boot graph
// (useTabs reaches themeDerivation at mount).
//
// WR-01 (38 review): the gate matches the MODULE, not one import spelling.
// For each file it certifies the absence of every static-import specifier
// that resolves to src/lib/mermaid/core.ts from that file's own directory —
// the '@/lib/mermaid/core' alias form AND the per-file relative form
// ('./core' from inside src/lib/mermaid/, '../lib/mermaid/core' from
// elsewhere) — in single, double, or backtick quotes, on whitespace-
// normalized source, so the side-effect spelling (no `from` clause) is
// caught too. Matching runs on comment-stripped source (leading-comment and
// block-comment lines dropped): the contract binds applied code, not prose
// mentions (shapes.ts's own header quotes the core specifier when telling
// readers never to import it). NOT certified forms: dynamic `import()`
// (a lazy chunk stays off the eager boot chain by construction) and
// `require()` (absent from this ESM-only codebase).
const PARSER_ONLY_FILES = [
  'src/constants/themeDerivation.ts',
  'src/components/editor/StatusBar.tsx',
  'src/components/sidebar/Sidebar.tsx',
  'src/components/modals/diagram/SaveTemplateModal.tsx',
  'src/components/modals/settings/AdvancedStylePanel.tsx',
  'src/lib/mermaid/diagramType.ts',
  'src/lib/mermaid/shapes.ts',
] as const;

// Comment-line filter shared by both gates below. This is a line-granular
// strip (lines whose first non-space char is a comment opener); a quoted
// specifier inside a TRAILING comment on a code line could still trip the
// gate — none exists today, and a trip fails loud, not silent.
const stripCommentLines = (src: string): string =>
  src
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n');

// Every static-import specifier spelling that resolves to the core module
// from the directory of `rel`: the alias form plus the per-file relative
// form (computed, so the check tracks the file's real location).
function coreSpecifiersFor(rel: (typeof PARSER_ONLY_FILES)[number]): string[] {
  const root = resolve(__dirname, '../..');
  const dir = resolve(root, rel, '..');
  const relSpec = relative(dir, resolve(root, 'src/lib/mermaid/core')).replace(/\\/g, '/');
  return ['@/lib/mermaid/core', relSpec.startsWith('.') ? relSpec : `./${relSpec}`];
}

describe('PERF-01 parser purity', () => {
  it.each(PARSER_ONLY_FILES)(
    '%s carries zero core-module import specifiers (any static import form)',
    (rel) => {
      const flat = stripCommentLines(
        readFileSync(resolve(__dirname, '../..', rel), 'utf8'),
      ).replace(/\s+/g, '');
      for (const spec of coreSpecifiersFor(rel)) {
        for (const q of ['\'', '"', '`']) {
          expect(
            flat,
            `PERF-01: ${rel} statically imports the mermaid core module ('${spec}') — parser-only consumers must import detectDiagramType from the core-free diagramType module ('@/lib/mermaid/diagramType') or the mermaid runtime stays on the eager boot chain`,
          ).not.toContain(`${q}${spec}${q}`);
        }
      }
    },
  );

  it('src/lib/mermaid/shapes.ts stays import-free (its documented contract is ZERO imports of any kind)', () => {
    const code = stripCommentLines(
      readFileSync(resolve(__dirname, '../../src/lib/mermaid/shapes.ts'), 'utf8'),
    );
    expect(
      code.match(/^\s*(?:import\b|export\s+(?:\*|\{))/m),
      'PERF-01: src/lib/mermaid/shapes.ts must stay import-free — zero imports is the header-documented contract for this eager-boot parser-only module (any import or re-export drags runtime modules onto the boot chain)',
    ).toBeNull();
  });
});

// ===== 39-02 (ICON-02 + PERF-01): the lazy icon-pack source contract. The
// FA6 Iconify JSON packs must reach the browser ONLY through the dynamic
// import() closures in src/lib/mermaid/iconPacks.ts, and vite.config.ts must
// keep them out of the eager vendor catch-all (negative clause) while a
// dedicated `icon-packs` lazy group ahead of it captures them. These pins
// scan the SOURCE bytes (same contract style as the parser-purity gate
// above) and landed in the SAME task/commit as iconPacks.ts itself — the
// lock cannot be decoupled from the code it locks (0 B boot, ever). =====

const viteConfigSrc = stripCommentLines(
  readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8'),
).replace(/\s+/g, '');

// Static-import specifiers end with `from '<spec>'` (named/default/re-export
// or type-only) or the side-effect form `import '<spec>'` — quote directly
// after the keyword. The certified dynamic form is `import('<spec>')`; the
// `(` between keyword and quote keeps it out of every pattern below.
const STATIC_ICONIFY_IMPORT_PATTERNS = [
  /from['"]@iconify-json\//,
  /import['"]@iconify-json\//,
] as const;

/** Every .ts/.tsx source file under src/ (recursive walk, .d.ts included). */
function srcSourceFiles(): string[] {
  const root = resolve(__dirname, '../../src');
  const entries = readdirSync(root, { recursive: true }) as Array<
    string | { name?: string; parentPath?: string }
  >;
  const files: string[] = [];
  for (const entry of entries) {
    const rel = typeof entry === 'string' ? entry : ((entry.name && entry.parentPath ? `${entry.parentPath}/${entry.name}` : String(entry)));
    if (/\.tsx?$/.test(rel)) {
      files.push(rel);
    }
  }
  return files;
}

describe('PERF-01 icon pack lazy boundary (39-02)', () => {
  it('the vite vendor catch-all carries the negative clause excluding @iconify-json (pack bytes stay off the eager chunk)', () => {
    expect(
      viteConfigSrc,
      "PERF-01 (39-02): vite.config.ts's vendor catch-all lost its `!id.includes('@iconify-json')` negative clause — the FA6 pack JSON would ride the eagerly imported vendor file into first paint (~1.5 MB of unused icon data on the boot budget)",
    ).toContain("!id.includes('@iconify-json')");
  });

  it('an icon-packs lazy group exists BEFORE the vendor catch-all', () => {
    const packsIdx = viteConfigSrc.indexOf("name:'icon-packs'");
    const vendorIdx = viteConfigSrc.indexOf("name:'vendor'");
    expect(
      packsIdx,
      'PERF-01 (39-02): the icon-packs chunk group is missing from vite.config.ts — without it the @iconify-json JSON falls to automatic chunking and the vendor clause alone cannot give the packs a stable lazy chunk',
    ).toBeGreaterThan(-1);
    expect(
      packsIdx < vendorIdx,
      `PERF-01 (39-02): the icon-packs group (idx ${packsIdx}) must precede the vendor catch-all (idx ${vendorIdx}) — at equal priority the earlier group wins, so a group after vendor would never claim the packages`,
    ).toBe(true);
  });

  it('src carries zero STATIC iconify import specifiers (dynamic import() is the certified pattern)', () => {
    const files = srcSourceFiles();
    expect(
      files.length,
      'PERF-01 (39-02): the src walk found no .ts/.tsx files — the scan is silently empty and proves nothing',
    ).toBeGreaterThan(50);
    for (const rel of files) {
      const flat = stripCommentLines(
        readFileSync(resolve(__dirname, '../../src', rel), 'utf8'),
      ).replace(/\s+/g, '');
      for (const pattern of STATIC_ICONIFY_IMPORT_PATTERNS) {
        expect(
          flat,
          `PERF-01 (39-02): ${rel} contains a static iconify import (${pattern}) — pack JSON may only enter through the dynamic import() loader closures in src/lib/mermaid/iconPacks.ts, otherwise the pack bytes join the eager boot chain`,
        ).not.toMatch(pattern);
      }
    }
  });
});
