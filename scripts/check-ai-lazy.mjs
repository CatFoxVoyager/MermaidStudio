#!/usr/bin/env node
/**
 * Post-build guard (audit H4): the AI inference chunks (ai-webgpu = web-llm,
 * ai-transformers = transformers.js/onnxruntime) must stay lazily-imported —
 * only reachable through the dynamic import in WebGPUMLCProvider.
 *
 * Rolldown parks shared runtime helpers (Vite's \0vite/preload-helper) in one
 * of the chunks that use them, and it once picked ai-webgpu — which made the
 * ~6 MB web-llm chunk a *static* dependency of the entry and landed it in
 * index.html's modulepreload list (~half of the initial payload). The fix
 * (advancedChunks' vite-helpers group in vite.config.ts) is easy to regress
 * silently on a Vite/Rolldown bump: nothing errors, the chunk just reappears
 * in the preload list. This script turns that regression into a red build.
 *
 * Run after `pnpm run build` (wired into the CI `build` job as
 * `pnpm run check:ai-lazy`; run it locally the same way).
 *
 * Checks:
 *  (a) dist/assets/ai-webgpu-*.js exists and is above ~1 MB (the vendored
 *      web-llm runtime — guards against a partial split),
 *  (b) dist/index.html contains no script/modulepreload reference to an
 *      ai-* chunk,
 *  (c) no ai-* chunk is reachable from the entry chunk by following static
 *      ESM imports only (dynamic import("./ai-*") edges are fine and ignored).
 */
import fs from 'node:fs';
import path from 'node:path';

const MIN_AI_BYTES = 1_000_000;
const AI_CHUNK_RE = /^ai-(webgpu|transformers)-.+\.js$/;

const distDir = path.resolve(process.cwd(), 'dist');
const assetsDir = path.join(distDir, 'assets');

function fail(message) {
  console.error(`\n[check-ai-lazy] FAILED: ${message}`);
  console.error('[check-ai-lazy] Fix: the AI chunks must only be reachable via the dynamic');
  console.error('[check-ai-lazy] import in WebGPUMLCProvider — see the advancedChunks groups');
  console.error('[check-ai-lazy] in vite.config.ts (vite-helpers must keep the shared preload');
  console.error('[check-ai-lazy] helper out of ai-webgpu).\n');
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  fail(`no ${path.relative(process.cwd(), assetsDir)} directory found — run "pnpm run build" first`);
}

// (a) the chunk exists and carries the real runtime
const aiChunks = fs.readdirSync(assetsDir).filter((name) => AI_CHUNK_RE.test(name));
if (!aiChunks.some((name) => /^ai-webgpu-/.test(name))) {
  fail('no ai-webgpu-*.js chunk in dist/assets — web-llm was re-inlined into an eager chunk');
}
for (const name of aiChunks) {
  const size = fs.statSync(path.join(assetsDir, name)).size;
  if (/^ai-webgpu-/.test(name) && size < MIN_AI_BYTES) {
    fail(
      `ai-webgpu chunk ${name} is ${size} bytes, below the ${MIN_AI_BYTES}-byte sanity floor ` +
        '(vendored web-llm is ~6 MB minified) — the split looks partial'
    );
  }
}

const indexHtmlPath = path.join(distDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// (b) no eager reference from the HTML, regardless of attribute order
const eagerReference = indexHtml.match(/<(?:script|link)\b[^>]*\b(?:src|href)="[^"]*ai-(?:webgpu|transformers)-[^"]*"/i);
if (eagerReference) {
  fail(`dist/index.html eagerly references an AI chunk: ${eagerReference[0]}`);
}

// (c) BFS over static ESM import edges only, starting from the entry chunk.
// Static edges in rolldown's minified output: `import"./x.js"` and
// `...from"./x.js"` (the latter also covers re-exports). Dynamic imports
// appear as `import("./x.js")` / import(`./x.js`) and do NOT match.
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
  if (AI_CHUNK_RE.test(name)) {
    const chain = [name];
    for (let cur = name; parentOf.has(cur); cur = parentOf.get(cur)) chain.unshift(parentOf.get(cur));
    fail(`${name} is statically imported from the entry chunk (via ${chain.join(' -> ')}) — it must only be dynamically imported`);
  }
  for (const dep of staticImports(code)) {
    if (!visited.has(dep) && !parentOf.has(dep)) parentOf.set(dep, name);
    if (!visited.has(dep)) queue.push(dep);
  }
}

console.log(
  `[check-ai-lazy] OK: ${aiChunks.join(', ')} (${aiChunks
    .map((n) => `${(fs.statSync(path.join(assetsDir, n)).size / 1024 / 1024).toFixed(1)} MB`)
    .join(', ')}) — no static-import path from the entry, nothing eager in index.html`
);
console.log(`[check-ai-lazy] entry closure: ${visited.size} chunks, entry ${(entryBytes / 1024).toFixed(0)} kB`);
