import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Search, X, LoaderCircle, TriangleAlert, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIconData } from '@iconify/utils';
import { ICON_PICKER_PACKS } from './iconPickerPacks';
import type { IconPack, IconPackKey, IconPickerPackSection } from './iconPickerPacks';
import { FOCUS_RING_CLASSES } from './touchTargets';

/**
 * 39-05 (ICON-03, UI-SPEC Surface 2): the searchable FA6 icon picker
 * popover — a SIBLING of ShapePicker cloning its landed recipe (Grey Area
 * 1: ShapePicker is locked as sync build-time data with "NO prop and NO
 * loading state", so the lazy picker is a separate component, never a
 * variant). Preserved recipe invariants:
 *
 * - fixed-position popover anchored from the trigger's viewport rect
 *   (width 264, maxWidth calc(100vw - 16px), --surface-raised bg);
 * - search row FIRST as a shrink-0 sibling above the internal scroller;
 * - outside-tap + Escape dismissal with the triggerRef toggle guard, and
 *   typing never dismisses;
 * - cell recipe (52px min width, hover scale, 44px touch floor) with the
 *   accent treatment on the picked cell.
 *
 * The one structural difference from ShapePicker is the corpus: pack JSON
 * is LAZY (the same dynamic `import()` + `.default` unwrap as 39-02's
 * FA_ICON_PACKS — mermaid spreads loader RESULTS, so the namespace must
 * never be stored). Declared state model:
 *
 * 1. Loading — a spinner row with the `visual.iconLoading` aria copy until
 *    that pack resolves. No percentage, no progress bar.
 * 2. Load error — an inline error row scoped to the failed section
 *    (`TriangleAlert` + `visual.iconLoadError`) with a `visual.iconRetry`
 *    button re-triggering THAT pack's import only; loaded packs render
 *    normally (per-pack partial failure).
 * 3. Loaded — cells render live FA6 glyphs through getIconData (aliases
 *    resolve to their parent glyph, exactly how mermaid renders them) with
 *    `currentColor` so previews theme in dark mode, over a BOUNDED initial
 *    window of 120 cells per section extended on scroll (Grey Area 5 — no
 *    ~4,300-cell full render, no virtualization machinery).
 *
 * Search matches the FULL in-memory pack name set (icons + aliases) with a
 * transient case-fold at comparison time — stored data is never rewritten
 * (the 38-05 search contract). Zero-match sections hide; when nothing
 * matches anywhere, the declared empty-search copy renders. A result count
 * is never shown.
 *
 * Selection reports the icon value with its registered pack prefix —
 * `fa:` (solid, aliasing `fas`), `far:` (regular), `fab:` (brands) — the
 * same prefixes 39-02 registers on mermaid, so the emitted value renders
 * without any mapping layer.
 */

export interface IconPickerAnchor {
  /** Viewport-space offset from the right edge (window.innerWidth - r.right). */
  right: number;
  /** Viewport-space top edge (trigger bottom + 8). */
  top: number;
  /** Viewport clamp (window.innerHeight - trigger bottom - 24). */
  maxHeight: number;
}

interface IconPickerProps {
  anchor: IconPickerAnchor;
  onClose: () => void;
  /** Receives the registered-prefix value, e.g. `fa:house`. */
  onPick: (icon: string) => void;
  /** Currently-selected icon value — carries the accent treatment. */
  selected?: string | null;
  /** The trigger that opened this picker — its taps toggle, never dismiss. */
  triggerRef?: RefObject<HTMLElement | null>;
}

type PackState = 'loading' | 'loaded' | 'error';

/** Bounded initial window per section (Grey Area 5), extended on scroll. */
const WINDOW_STEP = 120;

/**
 * One lazy pack load with its own retry counter — a Retry click bumps only
 * this pack's attempt, so only its dynamic import re-triggers.
 */
function usePack(section: Pick<IconPickerPackSection, 'key' | 'load'>) {
  const [state, setState] = useState<PackState>('loading');
  const [data, setData] = useState<IconPack | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    section
      .load()
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setState('loaded');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section.load, attempt]);

  return {
    state,
    data,
    retry: () => setAttempt((a) => a + 1),
  };
}

export function IconPicker({ anchor, onClose, onPick, selected, triggerRef }: IconPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  const solid = usePack(ICON_PICKER_PACKS[0]);
  const regular = usePack(ICON_PICKER_PACKS[1]);
  const brands = usePack(ICON_PICKER_PACKS[2]);
  const packs: Record<IconPackKey, ReturnType<typeof usePack>> = { solid, regular, brands };

  // Bounded window: visible cell count per section, extended on scroll.
  const [visible, setVisible] = useState<Record<IconPackKey, number>>({
    solid: WINDOW_STEP,
    regular: WINDOW_STEP,
    brands: WINDOW_STEP,
  });

  // Outside-tap + Escape dismissal — the ShapePicker recipe verbatim (the
  // data-icon-picker marker lets hosts guard the surface; taps inside the
  // popover root and inside the opening trigger never count as outside).
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) {return;}
      if (rootRef.current?.contains(target)) {return;}
      if (triggerRef?.current?.contains(target)) {return;}
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose();}
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [onClose, triggerRef]);

  const sections = ICON_PICKER_PACKS.map((section) => {
    const pack = packs[section.key];
    const names: string[] = [];
    if (pack.state === 'loaded' && pack.data) {
      // The FULL in-memory name set — icons and aliases alike — searched
      // with a transient case-fold at comparison time (stored data is
      // never rewritten or persisted lowercased).
      const all = [
        ...Object.keys((pack.data as { icons?: Record<string, unknown> }).icons ?? {}),
        ...Object.keys((pack.data as { aliases?: Record<string, unknown> }).aliases ?? {}),
      ];
      names.push(...(q ? all.filter((name) => name.toLowerCase().includes(q)) : all));
    }
    return { section, pack, names };
  });

  const anyLoading = sections.some((s) => s.pack.state === 'loading');
  const anyError = sections.some((s) => s.pack.state === 'error');
  const loadedSections = sections.filter((s) => s.pack.state === 'loaded');
  const totalMatches = loadedSections.reduce((n, s) => n + s.names.length, 0);
  const emptySearch = !anyLoading && !anyError && loadedSections.length === ICON_PICKER_PACKS.length && totalMatches === 0;

  const onScrollerScroll = () => {
    const el = scrollerRef.current;
    if (!el) {return;}
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 48) {return;}
    setVisible((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const { section, names } of sections) {
        if (next[section.key] < names.length) {
          next[section.key] = next[section.key] + WINDOW_STEP;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const cellBase =
    'flex flex-col items-center gap-1 px-1 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 min-w-[52px] max-md:min-h-[44px] cursor-pointer';

  const renderGlyph = (pack: IconPack, name: string) => {
    // Aliases resolve to their parent glyph — the same getIconData call
    // mermaid's chunk-R3KSYZAL makes, so the picker previews exactly what
    // the rendered diagram will show.
    const icon = getIconData(pack, name);
    if (!icon) {return null;}
    const width = icon.width ?? (pack as { width?: number }).width ?? 16;
    const height = icon.height ?? (pack as { height?: number }).height ?? 16;
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={24}
        height={24}
        fill="currentColor"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: icon.body }}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      data-icon-picker
      className="fixed z-20 flex flex-col rounded-xl border shadow-xl animate-fade-in overflow-hidden"
      style={{
        right: anchor.right,
        top: anchor.top,
        maxHeight: anchor.maxHeight,
        width: 264,
        maxWidth: 'calc(100vw - 16px)',
        background: 'var(--surface-raised)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Search row: shrink-0 FIRST row of the popover — never inside the
          internal scroller (the ShapePicker mask-image constraint). */}
      <div
        className="shrink-0 flex items-center gap-1 px-2 py-2 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Search size={14} aria-hidden="true" className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('visual.iconSearch')}
          aria-label={t('visual.iconSearch')}
          className={`flex-1 min-w-0 bg-transparent rounded-sm text-xs leading-[1.5] max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
          style={{ color: 'var(--text-primary)' }}
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            title={t('visual.iconSearchClear')}
            aria-label={t('visual.iconSearchClear')}
            className={`shrink-0 flex items-center justify-center p-1 rounded-md ${FOCUS_RING_CLASSES}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Internally-scrolling categorized grid — the anchor's maxHeight
          clamps the whole popover; flex-1 + min-h-0 keep the grid scrolling
          under the fixed search row. Scroll near the bottom extends every
          still-truncated section by one bounded window step. */}
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto p-4" onScroll={onScrollerScroll}>
        {emptySearch ? (
          <div className="py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-xs font-medium">{t('visual.iconSearchEmpty')}</p>
            <p className="text-xs mt-1">{t('visual.iconSearchEmptyHint', { query: trimmed })}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sections.map(({ section, pack, names }) => (
              <section key={section.key} data-pack-section={section.key}>
                {pack.state === 'loading' && (
                  <div
                    data-pack-loading={section.key}
                    role="status"
                    aria-label={t('visual.iconLoading')}
                    className="flex items-center gap-1 py-2 text-[11px] leading-[1.5]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <LoaderCircle size={14} className="animate-spin shrink-0" aria-hidden="true" />
                  </div>
                )}
                {pack.state === 'error' && (
                  <div
                    data-pack-error={section.key}
                    className="flex items-center gap-1 py-2 text-[11px] leading-[1.5]"
                    style={{ color: 'var(--danger)' }}
                  >
                    <TriangleAlert size={14} aria-hidden="true" className="shrink-0" />
                    <span>{t('visual.iconLoadError')}</span>
                    <button
                      type="button"
                      data-pack-retry={section.key}
                      onClick={pack.retry}
                      className={`ml-1 flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium ${FOCUS_RING_CLASSES}`}
                      style={{
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--surface-base)',
                        outline: 'none',
                      }}
                    >
                      <RefreshCw size={11} aria-hidden="true" />
                      {t('visual.iconRetry')}
                    </button>
                  </div>
                )}
                {pack.state === 'loaded' && names.length > 0 && (
                  <>
                    <h3
                      className="text-[11px] font-medium uppercase tracking-wider leading-[1.2]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {t(section.headerKey)}
                    </h3>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {names.slice(0, visible[section.key]).map((name) => {
                        const value = `${section.prefix}:${name}`;
                        const isSelected = selected === value;
                        return (
                          <button
                            key={name}
                            type="button"
                            data-icon-cell={name}
                            data-icon-value={value}
                            data-selected={isSelected ? 'true' : undefined}
                            onClick={() => {
                              onPick(value);
                              onClose();
                            }}
                            title={name}
                            aria-label={name}
                            className={`${cellBase} ${FOCUS_RING_CLASSES}`}
                            style={{
                              background: isSelected ? 'var(--accent-dim)' : 'var(--surface-raised)',
                              borderColor: isSelected ? 'var(--accent)' : 'var(--border-subtle)',
                              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                            }}
                          >
                            {renderGlyph(pack.data as IconPack, name)}
                            {/* 10px single-line truncated label; the full
                                name rides title + aria-label. */}
                            <span className="text-[10px] font-normal leading-none truncate max-w-full">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
