import { getIconData } from '@iconify/utils';

/**
 * 39-05 (ICON-03, UI-SPEC Surface 2): the IconPicker's lazy FA6 pack
 * loaders — the SAME dynamic `import()` + `.default` unwrap idiom as
 * 39-02's `FA_ICON_PACKS` (mermaid SPREADS loader results into its icons
 * store, so the ESM JSON namespace must never be stored; the picker feeds
 * the raw IconifyJSON to getIconData instead).
 *
 * The three sections carry the picker's browsing metadata: the proper-noun
 * header key and the registered mermaid prefix each section's picks emit
 * (`fa:` for solid — the canonical prefix whose registration `fas` aliases,
 * `far:` regular, `fab:` brands — the Grey Area 6 planner-owned mapping,
 * matching 39-02's registration so picked values render with no mapping
 * layer). Split out of IconPicker.tsx so tests can mock this load boundary
 * directly and flip per-pack failure flags at call time.
 *
 * PERF-01 carries over unchanged: the pack JSON is reachable ONLY through
 * these dynamic `import()` closures — zero static @iconify-json imports —
 * so the bytes stay off the eager boot chain (the bundlePerf source
 * contract walks src for exactly that).
 */

/**
 * The IconifyJSON pack shape getIconData consumes (typed through the util
 * itself — @iconify/utils does not re-export IconifyJSON).
 */
export type IconPack = Parameters<typeof getIconData>[0];

export type IconPackKey = 'solid' | 'regular' | 'brands';

export interface IconPickerPackSection {
  key: IconPackKey;
  headerKey: string;
  /** The registered mermaid prefix this section's picks emit. */
  prefix: string;
  load: () => Promise<IconPack>;
}

export const ICON_PICKER_PACKS: readonly IconPickerPackSection[] = [
  {
    key: 'solid',
    headerKey: 'visual.iconPacks.solid',
    prefix: 'fa',
    load: () => import('@iconify-json/fa6-solid/icons.json').then((m) => m.default as unknown as IconPack),
  },
  {
    key: 'regular',
    headerKey: 'visual.iconPacks.regular',
    prefix: 'far',
    load: () => import('@iconify-json/fa6-regular/icons.json').then((m) => m.default as unknown as IconPack),
  },
  {
    key: 'brands',
    headerKey: 'visual.iconPacks.brands',
    prefix: 'fab',
    load: () => import('@iconify-json/fa6-brands/icons.json').then((m) => m.default as unknown as IconPack),
  },
];
