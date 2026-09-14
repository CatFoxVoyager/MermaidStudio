/**
 * Minimal ambient declarations for Node.js builtins referenced by a small,
 * documented set of src files (CR-01 gate repair).
 *
 * Why this exists: `@types/node` is not a direct dependency (pnpm keeps the
 * transitive copy out of the resolvable `node_modules/@types` root), so
 * `tsc -p tsconfig.app.json` cannot resolve the builtins these files use.
 * This shim keeps the real type-check gate green without adding a runtime
 * dependency and without unchecking the affected files. Everything NOT
 * declared here stays fully checked.
 *
 * Scope (kept deliberately as narrow as possible — widen only with the same
 * justification):
 * - fs / path / crypto / child_process / util: ESM-imported by
 *   src/components/layout/__tests__/mobile-zindex.test.ts,
 *   src/constants/__tests__/buildTarget.test.ts,
 *   src/constants/__tests__/cdnEmbed.test.ts (artifact guards that read the
 *   repo from disk) and src/utils/execFileNoThrow.ts (build-support util).
 *   Shorthand ambient modules type their imports `any` — the node surface of
 *   these files is unchecked; the mermaid/application logic around them is.
 * - __dirname: same three test files (repo-root resolution).
 * - global: a few jsdom test files poke fetch/mocks through the Node-style
 *   `global` alias of globalThis (Node 24 runtime under vitest).
 * - NodeJS.Timeout: timeout-handle annotations in src/utils/rateLimiter.ts
 *   and src/components/visual/VisualEditorCanvas.tsx. Under DOM lib
 *   setTimeout returns a number, so the alias resolves to exactly that —
 *   no new runtime surface, just the name these files already use.
 */

declare module 'fs';
declare module 'path';
declare module 'crypto';
declare module 'child_process';
declare module 'util';

declare const __dirname: string;

declare const global: typeof globalThis;

declare namespace NodeJS {
  // `unref`/`ref` are optional: the DOM timer handle is a plain number, and
  // src/utils/rateLimiter.ts feature-detects them before calling
  // (`typeof handle.unref === 'function'`) exactly because browsers lack them.
  type Timeout = ReturnType<typeof setTimeout> & { unref?: () => void; ref?: () => void };
}

/**
 * GPUAdapter.isFallbackAdapter: part of the WebGPU spec (the adapter reports
 * whether it is a software fallback) and read by
 * src/services/ai/WebGPUMLCProvider.ts, but missing from the WebGPU type
 * definitions reachable from this project. Optional + readonly to match the
 * spec attribute while tolerating definitions that omit it.
 */
interface GPUAdapter {
  readonly isFallbackAdapter?: boolean;
}
