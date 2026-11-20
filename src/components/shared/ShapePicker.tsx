import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CANONICAL_SHAPES, SHAPE_CATEGORIES } from '@/lib/mermaid/shapes';
import type { NodeShapeCanonical } from '@/lib/mermaid/shapes';
import type { NodeShape } from '@/lib/mermaid/codeUtils';
import { ShapePreview } from './ShapePreview';
import { FOCUS_RING_CLASSES } from './touchTargets';

/**
 * 38-05 (SHP-03): the unified searchable categorized shape picker popover —
 * ONE component for all three picker surfaces (ShapeToolbar More popover,
 * plan-06 PropertiesPanel/NodeStylePanel triggers).
 *
 * The shape list has NO prop and NO loading state: sections and cells derive
 * synchronously from the shapes.ts build-time SSOT constant (CANONICAL_SHAPES
 * + SHAPE_CATEGORIES), so the grid can never be empty and never fetches.
 * The host positions the popover (fixed-position sibling-of-masked-scroller
 * recipe) and hands in the anchor rect; dismissal is owned here.
 *
 * Search corpus per shape: EN label + FR label (both locale label sets are
 * matched regardless of the active locale), the canonical shortName, and the
 * official dist aliases. Matching folds case TRANSIENTLY at comparison time
 * (the query is lowercased once; stored label/alias strings are never
 * rewritten or persisted lowercased — a full-word query like "diamond" or
 * the FR "losange" reaches the rhombus, per the UI-SPEC search contract).
 * Zero-match sections are hidden entirely; when nothing matches, the locked
 * empty-state copy renders inside the grid area. A result count is never
 * shown.
 */

export interface ShapePickerAnchor {
  /** Viewport-space offset from the right edge (window.innerWidth - r.right). */
  right: number;
  /** Viewport-space top edge (trigger bottom + 8). */
  top: number;
  /** Viewport clamp (window.innerHeight - trigger bottom - 24). */
  maxHeight: number;
}

interface ShapePickerProps {
  anchor: ShapePickerAnchor;
  onClose: () => void;
  onPick: (shape: NodeShapeCanonical) => void;
  /** Drag placement gesture (toolbar). Cells are only draggable when set. */
  onDragStart?: (shape: NodeShapeCanonical) => void;
  /** Currently-selected canonical shape — carries the accent treatment. */
  selected?: NodeShape | null;
  /** The trigger that opened this picker — its taps toggle, never dismiss. */
  triggerRef?: RefObject<HTMLElement | null>;
}

export function ShapePicker({ anchor, onClose, onPick, onDragStart, selected, triggerRef }: ShapePickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  const sections = SHAPE_CATEGORIES
    .map((category) => ({
      category,
      shapes: CANONICAL_SHAPES.filter((s) => {
        if (s.category !== category) {return false;}
        if (!q) {return true;}
        const en = t(`visual.shapes.${s.shortName}`, { lng: 'en' });
        const fr = t(`visual.shapes.${s.shortName}`, { lng: 'fr' });
        return [en, fr, s.shortName, ...s.aliases].some((candidate) => candidate.toLowerCase().includes(q));
      }),
    }))
    .filter((section) => section.shapes.length > 0);

  // Outside-tap + Escape dismissal. Events originating inside the popover
  // root — the search input and its clear button included — and inside the
  // opening trigger never count as outside taps (the data-shape-picker
  // marker also lets hosts guard the whole surface, mirroring
  // data-more-popover).
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

  const cellBase = 'flex flex-col items-center gap-1 px-1 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 min-w-[52px] max-md:min-h-[44px]';

  return (
    <div
      ref={rootRef}
      data-shape-picker
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
          internal scroller (scroll-fade-x's mask-image paints fixed
          descendants in mask coordinate space). */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <Search size={14} aria-hidden="true" className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('visual.shapeSearch')}
          aria-label={t('visual.shapeSearch')}
          className={`flex-1 min-w-0 bg-transparent rounded-sm text-xs leading-[1.5] max-md:min-h-[44px] ${FOCUS_RING_CLASSES}`}
          style={{ color: 'var(--text-primary)' }}
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            title={t('visual.shapeSearchClear')}
            aria-label={t('visual.shapeSearchClear')}
            className={`shrink-0 flex items-center justify-center p-1 rounded-md ${FOCUS_RING_CLASSES}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Internally-scrolling categorized grid. The anchor's maxHeight clamps
          the whole popover; flex-1 + min-h-0 keep the grid region scrolling
          under the fixed search row. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {sections.length === 0 ? (
          <div className="py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-xs font-medium">{t('visual.shapeSearchEmpty')}</p>
            <p className="text-xs mt-1">{t('visual.shapeSearchEmptyHint', { query: trimmed })}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sections.map(({ category, shapes }) => (
              <section key={category}>
                <h3
                  className="text-[11px] font-medium uppercase tracking-wider leading-[1.2]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t(`visual.shapeCategories.${category}`)}
                </h3>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {shapes.map((s) => {
                    const label = t(`visual.shapes.${s.shortName}`);
                    const isSelected = selected === s.shortName;
                    return (
                      <button
                        key={s.shortName}
                        type="button"
                        data-shape-cell={s.shortName}
                        data-selected={isSelected ? 'true' : undefined}
                        draggable={onDragStart ? true : undefined}
                        onDragStart={onDragStart ? (e) => { e.dataTransfer?.setData('text/plain', s.shortName); onDragStart(s.shortName); } : undefined}
                        onClick={() => onPick(s.shortName)}
                        title={label}
                        aria-label={label}
                        className={`${cellBase} ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${FOCUS_RING_CLASSES}`}
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--surface-raised)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-subtle)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        <ShapePreview shape={s.shortName} />
                        <span className="text-xs font-medium leading-none line-clamp-2">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
