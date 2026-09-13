#!/usr/bin/env node
/**
 * Post-build guard (WR-03): mermaid's bundled ELK layout engine must stay in
 * its own lazily-imported chunk.
 *
 * vite.config.ts's manualChunks guard pins ELK laziness to mermaid's internal
 * chunk layout (the `dist/chunks/.../elk-*.mjs` naming of mermaid 12.0.0). When
 * mermaid is eventually bumped and that layout changes, the guard stops
 * matching and ELK silently re-inlines into the eagerly-loaded mermaid-core
 * chunk (~+1.4 MB on initial load) with no error and no warning. This script
 * turns that silent regression into a red build.
 *
 * Run after `pnpm run build` (wired into the CI `build` job as
 * `pnpm run check:elk`; run it locally the same way).
 *
 * Checks:
 *  (a) dist/assets/elk-*.js exists (ELK kept its own chunk),
 *  (b) it is above ~1 MB (the full ELK engine, ~1.4 MB minified today —
 *      guards against a partial/truncated split),
 *  (c) dist/index.html contains no script/modulepreload reference to it
 *      (ELK must only be reachable via mermaid's lazy dynamic import).
 */
import fs from 'node:fs';
import path from 'node:path';

const MIN_ELK_BYTES = 1_000_000;

const distDir = path.resolve(process.cwd(), 'dist');
const assetsDir = path.join(distDir, 'assets');

function fail(message) {
  console.error(`\n[check-elk] FAILED: ${message}`);
  console.error('[check-elk] Fix: keep mermaid\'s ELK modules out of the eager');
  console.error('[check-elk] mermaid-core chunk (see the manualChunks guard in vite.config.ts)');
  console.error('[check-elk] and update its regex for the new mermaid chunk layout.\n');
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  fail(`no ${path.relative(process.cwd(), assetsDir)} directory found — run "pnpm run build" first`);
}

const elkChunks = fs.readdirSync(assetsDir).filter((name) => /^elk-.+\.js$/.test(name));
if (elkChunks.length === 0) {
  fail(
    'no elk-*.js chunk in dist/assets — ELK was re-inlined into the eagerly-loaded mermaid-core chunk'
  );
}

const sizes = elkChunks.map((name) => fs.statSync(path.join(assetsDir, name)).size);
const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
if (totalBytes < MIN_ELK_BYTES) {
  fail(
    `elk chunk(s) [${elkChunks.join(', ')}] total ${totalBytes} bytes, below the ` +
      `${MIN_ELK_BYTES}-byte sanity floor (full ELK engine is ~1.4 MB minified) — ` +
      'the ELK split looks partial or the chunk no longer contains the engine'
  );
}

const indexHtmlPath = path.join(distDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
// Any script/link tag pointing at an elk chunk, regardless of attribute order.
const eagerReference = indexHtml.match(/<(?:script|link)\b[^>]*\b(?:src|href)="[^"]*elk-[^"]*"/i);
if (eagerReference) {
  fail(
    `dist/index.html eagerly references an ELK chunk: ${eagerReference[0]} — ` +
      'ELK must only be reachable via mermaid\'s lazy dynamic import'
  );
}

console.log(
  `[check-elk] OK: ${elkChunks.length} ELK chunk(s), ${(totalBytes / 1024).toFixed(0)} kB, ` +
    'not referenced from dist/index.html (stays lazy)'
);
