/**
 * Lazy FontAwesome 6 icon packs for mermaid's `@{ icon: ... }` directive
 * (39-02, ICON-02 + PERF-01).
 *
 * mermaid 12.3 registers zero icon packs by default: an icon value with an
 * unregistered prefix renders the `unknownIcon` fallback (the blue `?` box).
 * This module registers the three offline FA6 Iconify JSON packs under the
 * four prefixes mermaid's flowchart icon support documents (`fa`/`fas` ->
 * fa6-solid, `far` -> fa6-regular, `fab` -> fa6-brands) through
 * `mermaid.registerIconPacks`.
 *
 * PERF-01 contract (locked by src/__tests__/bundlePerf.test.ts):
 * - the pack JSON reaches the browser ONLY through the dynamic `import()`
 *   inside each loader closure — zero static iconify imports exist in src;
 * - vite.config.ts carries an `icon-packs` lazy group BEFORE the vendor
 *   catch-all, and the catch-all carries the negative clause excluding
 *   `@iconify-json` — the pack bytes never ride the eager boot chain
 *   (0 B on first paint; a chunk loads only when a diagram uses icons).
 *
 * The mermaid instance is passed in (`registerFaIconPacks(mermaid)`) so this
 * module carries no mermaid runtime import of its own and rides the existing
 * lazy mermaid chunk (the `mermaid` import below is type-only, erased at
 * build). Loaders unwrap the ESM JSON namespace (`.default`) before
 * returning: mermaid SPREADS the loader result into its icons store
 * (`{ ...loaded, prefix }` — measured in mermaid's chunk-R3KSYZAL
 * getRegisteredIconData), so a raw namespace object would park the pack data
 * under `default` and corrupt the store.
 *
 * `registerFaIconPacks` is guarded to run once: repeat calls (double doInit,
 * hot reload) are no-ops. mermaid's own loaderStore is a keyed Map whose set
 * overwrites, so repeats would be harmless — the guard keeps init logs quiet.
 */
import type mermaid from 'mermaid';

/** The loader-entry shape mermaid's registerIconPacks accepts. */
type MermaidIconLoaders = Parameters<typeof mermaid.registerIconPacks>[0];
type MermaidAsyncIconLoader = Extract<MermaidIconLoaders[number], { loader: unknown }>;

/** IconifyJSON pack data, typed through mermaid's public API surface. */
export type IconifyJSONPack = Awaited<ReturnType<MermaidAsyncIconLoader['loader']>>;

export interface FaIconPackLoader {
  name: string;
  loader: () => Promise<IconifyJSONPack>;
}

/**
 * Offline lazy Iconify JSON packs registered on Mermaid:
 * - FA6 (`fa`/`fas` -> fa6-solid, `far` -> fa6-regular, `fab` -> fa6-brands)
 * - Tech & cloud brand logos (`logos` -> @iconify-json/logos, used by official architecture-beta docs)
 * - Material Design Icons (`mdi` -> @iconify-json/mdi, used by official treeView-beta & icon docs)
 */
export const FA_ICON_PACKS: readonly FaIconPackLoader[] = [
  {
    name: 'fa',
    loader: () => import('@iconify-json/fa6-solid/icons.json').then((m) => m.default),
  },
  {
    name: 'fas',
    loader: () => import('@iconify-json/fa6-solid/icons.json').then((m) => m.default),
  },
  {
    name: 'far',
    loader: () => import('@iconify-json/fa6-regular/icons.json').then((m) => m.default),
  },
  {
    name: 'fab',
    loader: () => import('@iconify-json/fa6-brands/icons.json').then((m) => m.default),
  },
  {
    name: 'logos',
    loader: () => import('@iconify-json/logos/icons.json').then((m) => m.default),
  },
  {
    name: 'mdi',
    loader: () => import('@iconify-json/mdi/icons.json').then((m) => m.default),
  },
];

export const ICON_PACKS = FA_ICON_PACKS;

let registered = false;

/**
 * Register the offline lazy Iconify icon packs on a mermaid-like instance.
 * Idempotent: the run-once guard makes repeat calls (double doInit, hot reload) no-ops.
 */
export function registerFaIconPacks(
  mermaidLike: Pick<typeof mermaid, 'registerIconPacks'>,
): void {
  if (registered) {
    return;
  }
  registered = true;
  mermaidLike.registerIconPacks([...FA_ICON_PACKS]);
}
