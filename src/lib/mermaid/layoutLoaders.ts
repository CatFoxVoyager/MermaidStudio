/**
 * Lazy layout loaders for Mermaid 12.3 (`@mermaid-js/layout-tidy-tree`).
 *
 * PERF-01 contract (locked by src/__tests__/bundlePerf.test.ts):
 * - `@mermaid-js/layout-tidy-tree` reaches the browser ONLY through the
 *   dynamic `import()` inside the loader closure — zero static imports exist
 *   anywhere in `src/`.
 * - `vite.config.ts` places a dedicated `layout-tidy-tree` lazy chunk group
 *   ahead of `vendor`, and `vendor` explicitly excludes
 *   `@mermaid-js/layout-tidy-tree` and `non-layered-tidy-tree-layout` so
 *   0 B ride the eager boot graph.
 */
import type mermaid from 'mermaid';
import type { LayoutLoaderDefinition } from 'mermaid';

type LoadedLayoutAlgorithm = Awaited<ReturnType<LayoutLoaderDefinition['loader']>>;

export const TIDY_TREE_LAYOUT_LOADERS: readonly LayoutLoaderDefinition[] = [
  {
    name: 'tidy-tree',
    algorithm: 'tidy-tree',
    loader: async (): Promise<LoadedLayoutAlgorithm> => {
      const mod = await import('@mermaid-js/layout-tidy-tree');
      const firstDef = mod.default?.[0];
      if (!firstDef || typeof firstDef.loader !== 'function') {
        throw new Error('Failed to load @mermaid-js/layout-tidy-tree loader definition');
      }
      return firstDef.loader();
    },
  },
];

let registered = false;

/**
 * Register the lazy tidy-tree layout loader on a mermaid-like instance.
 * Idempotent: repeat calls (multiple doInit / HMR) are no-ops.
 */
export function registerTidyTreeLayout(
  mermaidLike: Pick<typeof mermaid, 'registerLayoutLoaders'>,
): void {
  if (registered) {
    return;
  }
  registered = true;
  mermaidLike.registerLayoutLoaders([...TIDY_TREE_LAYOUT_LOADERS]);
}
