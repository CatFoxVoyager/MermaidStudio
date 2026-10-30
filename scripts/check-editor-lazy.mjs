#!/usr/bin/env node
/**
 * Post-build guard (29-02, PERF-01/02): the editor/runtime chunks
 * (mermaid-core, mermaid-parser, mermaid-elk, codemirror-core,
 * codemirror-features) must stay lazily-imported — only reachable through
 * the dynamic-import boundaries (ModalProvider modals; the WorkspacePanel /
 * MobileWorkspace editor+preview cells, plan 29-03).
 *
 * Same regression shape check-ai-lazy guards: a shared runtime helper or an
 * eager re-import silently lands one of these chunks in the entry's static
 * closure (and in index.html's modulepreload list), dragging megabytes of
 * Mermaid/CodeMirror back into first paint. Nothing errors when that happens
 * — this script turns the regression into a red build.
 *
 * Run after `npm run build` (npm script `check:editor-lazy`; CI wiring lands
 * in plan 29-03 once the boundary work completes and this guard goes green).
 *
 * Checks:
 *  (a) dist/assets/mermaid-core-*.js exists (guards against the runtime
 *      being re-inlined into an eager chunk, which would make the BFS pass
 *      vacuously),
 *  (b) dist/index.html contains no script/modulepreload reference to a
 *      matching chunk,
 *  (c) no matching chunk is reachable from the entry chunk by following
 *      static ESM imports only (dynamic import("./mermaid-*") edges are
 *      fine and ignored).
 */
import fs from 'node:fs';
import path from 'node:path';

const EDITOR_CHUNK_RE =
  /^(mermaid-core|mermaid-parser|mermaid-elk|codemirror-core|codemirror-features)-.+\.js$/;

const distDir = path.resolve(process.cwd(), 'dist');
const assetsDir = path.join(distDir, 'assets');

function fail(message) {
  console.error(`\n[check-editor-lazy] FAILED: ${message}`);
  console.error('[check-editor-lazy] Fix: editor/runtime chunks must stay dynamically imported —');
  console.error('[check-editor-lazy] boundaries must stay lazy (React.lazy + import()); the');
  console.error('[check-editor-lazy] chunk layout itself comes from the advancedChunks groups');
  console.error('[check-editor-lazy] in vite.config.ts.\n');
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  fail(`no ${path.relative(process.cwd(), assetsDir)} directory found — run "npm run build" first`);
}

// (a) the mermaid runtime chunk exists (vacuous-pass guard for the BFS below)
const editorChunks = fs.readdirSync(assetsDir).filter((name) => EDITOR_CHUNK_RE.test(name));
if (!editorChunks.some((name) => /^mermaid-core-/.test(name))) {
  fail(
    'no mermaid-core-*.js chunk in dist/assets — the mermaid runtime was re-inlined into an eager chunk',
  );
}

const indexHtmlPath = path.join(distDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// (b) no eager reference from the HTML, regardless of attribute order
const eagerReference = indexHtml.match(
  /<(?:script|link)\b[^>]*\b(?:src|href)="[^"]*(?:mermaid-core|mermaid-parser|mermaid-elk|codemirror-core|codemirror-features)-[^"]*"/i,
);
if (eagerReference) {
  fail(`dist/index.html eagerly references an editor chunk: ${eagerReference[0]}`);
}

// (c) BFS over static ESM import edges only, starting from the entry chunk.
// Static edges in rolldown's minified output: `import"./x.js"` and
// `...from"./x.js"` (the latter also covers re-exports). Dynamic imports
// appear as `import("./x.js")` and do NOT match.
const entryMatch = indexHtml.match(/<script\b[^>]*\bsrc="([^"]*assets\/index-[^"]*\.js)"/i);
if (!entryMatch) {
  fail('could not find the entry chunk (assets/index-*.js) referenced by dist/index.html');
}
const entryName = path.basename(entryMatch[1]);

const staticImports = (code) => {
  const targets = [];
  for (const m of code.matchAll(/(?:import|from)"(\.\/[^"]+\.js)"/g)) {
    targets.push(path.basename(m[1]));
  }
  return targets;
};

const visited = new Set();
const parentOf = new Map();
const queue = [entryName];
let entryBytes = 0;
while (queue.length > 0) {
  const name = queue.pop();
  if (visited.has(name)) continue;
  visited.add(name);
  const filePath = path.join(assetsDir, name);
  if (!fs.existsSync(filePath)) continue;
  const code = fs.readFileSync(filePath, 'utf8');
  if (name === entryName) entryBytes = fs.statSync(filePath).size;
  if (EDITOR_CHUNK_RE.test(name)) {
    const chain = [name];
    for (let cur = name; parentOf.has(cur); cur = parentOf.get(cur)) chain.unshift(parentOf.get(cur));
    fail(
      `${name} is statically imported from the entry chunk (via ${chain.join(' -> ')}) — it must only be dynamically imported`,
    );
  }
  for (const dep of staticImports(code)) {
    if (!visited.has(dep) && !parentOf.has(dep)) parentOf.set(dep, name);
    if (!visited.has(dep)) queue.push(dep);
  }
}

console.log(
  `[check-editor-lazy] OK: editor chunks (${editorChunks.join(', ')}) — no static-import path from the entry, nothing eager in index.html`,
);
console.log(`[check-editor-lazy] entry closure: ${visited.size} chunks, entry ${(entryBytes / 1024).toFixed(0)} kB`);
