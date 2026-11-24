import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MousePointer2, Link, Trash2, LayoutGrid, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NodeShape, ToolMode } from './types';
import { CANONICAL_SHAPES, SHAPE_CATEGORIES } from '@/lib/mermaid/shapes';
import type { CategoryKey } from '@/lib/mermaid/shapes';
import { ShapePreview } from '@/components/shared/ShapePreview';
import { ShapePicker } from '@/components/shared/ShapePicker';
import type { SpecialMediaShape } from '@/components/shared/ShapePicker';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import { getUiScale } from '@/utils/uiScale';

interface ShapeButtonProps {
  shape: NodeShape;
  label: string;
  onPick: (shape: NodeShape) => void;
  /** 38-05: drag-placement gesture — dragstart hands the shape to the host
   *  (canvases setDragShape → drop adds at the canvas). Before 38-05 the
   *  toolbar never invoked its onDragStart prop and dragstart conflated into
   *  onPick, so drop-placement was dead wiring. */
  onDragStart?: (shape: NodeShape) => void;
}

function ShapeButton({ shape, label, onPick, onDragStart }: ShapeButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      draggable={onDragStart ? true : undefined}
      onDragStart={onDragStart ? (e) => { e.dataTransfer?.setData('text/plain', shape); onDragStart(shape); } : undefined}
      onClick={() => onPick(shape)}
      title={t('visual.shapeAddHint', { shape: label })}
      aria-label={t('visual.shapeAddHint', { shape: label })}
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing ${FOCUS_RING_CLASSES}`}
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', minWidth: 52 }}>
      <ShapePreview shape={shape} />
      <span className="text-xs font-medium leading-none">{label}</span>
    </button>
  );
}

// 38-05 (SHP-03): the toolbar is a DERIVED VIEW of the shapes.ts SSOT —
// flatten SHAPE_CATEGORIES picker order, keeping CANONICAL_SHAPES dist order
// within each category (the picker-order truth). Labels resolve through
// visual.shapes.<canonicalSlug>; ellipse is structurally absent (not in the
// registry — UI-SPEC Grey Area #1). No hand-maintained shape list remains
// here: a shape added to the registry renders without a toolbar edit, and
// the CI uniqueness lock moves with the registry, not with this file.
const SHAPES: { shape: NodeShape; labelKey: string; category: CategoryKey }[] =
  SHAPE_CATEGORIES.flatMap((category) =>
    CANONICAL_SHAPES
      .filter((s) => s.category === category)
      .map((s) => ({ shape: s.shortName, labelKey: `visual.shapes.${s.shortName}`, category })),
  );

// Mobile-first split (critique iter-10→13): the pinned More chip occupies
// the scroller's reserved right lane, and a third primary spawned INSIDE
// that lane — Stadium sat 83% occluded under the chip at rest (iter-13
// measurement). Two primaries (Box, Round) clear the lane; everything else
// lives in the popover. Desktop shows as many shapes as the panel width
// actually fits (measured fit-check below — the split panel is resizable,
// so the count follows the real width instead of a breakpoint); 2 stays the
// floor.
const MIN_PRIMARY_SHAPE_COUNT = 2;

interface Props {
  toolMode: ToolMode;
  onToolMode: (m: ToolMode) => void;
  onAddShape: (shape: NodeShape) => void;
  onDragStart: (shape: NodeShape) => void;
  /** Optional special Mermaid media shapes (`icon`, `img`) surfaced in ShapePicker. */
  onAddSpecialShape?: (shape: SpecialMediaShape) => void;
  onDragStartSpecial?: (shape: SpecialMediaShape) => void;
  /** Optional inline delete (visual editor keeps it; PreviewPanel moved
   *  deletion into its detail panels, so it no longer passes these). */
  onDeleteSelected?: () => void;
  hasSelection?: boolean;
}

export function ShapeToolbar({
  toolMode,
  onToolMode,
  onAddShape,
  onDragStart,
  onAddSpecialShape,
  onDragStartSpecial,
  onDeleteSelected,
  hasSelection,
}: Props) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  // Adaptive primary count (desktop ask: the fixed count of 2 wasted a wide
  // panel — 11 shapes sat behind "More" next to ~900px of empty toolbar).
  // Measured in ONE pass, never incremented on screen: a hidden measurer
  // renders every button at identical styles, the fit greedily fills the
  // width left after the fixed toolbar content, and the count is committed
  // in a layout effect — the first paint already shows the final row (the
  // first version grew one button per rAF and the toolbar visibly flashed
  // its way from 2 to 13 on every mount).
  const [visibleCount, setVisibleCount] = useState(SHAPES.length);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const primaryGroupRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const fitShapes = useCallback(() => {
    const el = scrollerRef.current;
    const measure = measureRef.current;
    const group = primaryGroupRef.current;
    if (!el || !measure || !group) {return;}
    const btns = Array.from(measure.querySelectorAll('button'));
    if (btns.length === 0) {return;}
    const scale = getUiScale();
    const gap = 4 * scale; // gap-1 inside the primary group
    const widths = btns.map(b => b.getBoundingClientRect().width + gap);
    // Room for the shape row = panel width minus everything that is NOT a
    // shape: the geometric prefix before the group (padding-left + tool
    // pills + divider + gaps), the scroller's right padding, and the
    // optional delete cluster after the group. scrollWidth is deliberately
    // NOT used here: without overflow it collapses to clientWidth, so
    // "fixed" would swallow the whole width and freeze the count at
    // whatever it was when the panel was last narrow (grow-side bug).
    const elRect = el.getBoundingClientRect();
    const leftPrefix = group.getBoundingClientRect().left - elRect.left;
    const padRight = (parseFloat(getComputedStyle(el).paddingRight) || 0) * scale;
    const deleteCluster = el.querySelector('[data-shapes-after]');
    const rightFixed = deleteCluster
      ? deleteCluster.getBoundingClientRect().width + gap
      : 0;
    const greedy = (available: number) => {
      let acc = 0;
      let count = 0;
      for (let i = 0; i < widths.length; i++) {
        if (acc + widths[i] > available) {break;}
        acc += widths[i];
        count = i + 1;
      }
      return count;
    };
    // Pass 1: could ALL shapes fit inline? Then the More button (and its
    // lane) disappears entirely. Pass 2: otherwise reserve the More lane
    // (68px = More chip + right offset + breathing gap) AFTER the shapes.
    // When el.clientWidth === 0 (jsdom / unmeasured layout), keep the
    // deterministic MIN_PRIMARY_SHAPE_COUNT floor; in a real browser with
    // measured geometry, never force more shapes than actually clear the
    // pinned More chip (fixes 320px & narrow desktop split overlaps).
    const base = el.clientWidth * scale - leftPrefix - padRight - rightFixed;
    const countAll = greedy(base);
    const count = el.clientWidth === 0
      ? MIN_PRIMARY_SHAPE_COUNT
      : countAll >= SHAPES.length
        ? countAll
        : greedy(base - 68 * scale);
    setVisibleCount(count);
  }, []);


  // First fit is a LAYOUT effect: measured and committed before the browser
  // paints, so the row never appears at the wrong count.
  useLayoutEffect(() => {
    fitShapes();
    const el = scrollerRef.current;
    let ro: ResizeObserver | undefined;
    // jsdom has no ResizeObserver (and no layout) — tests keep the initial
    // all-visible state deterministically.
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fitShapes);
      ro.observe(el);
    }
    // Font swap changes label widths after first paint.
    document.fonts?.ready.then(fitShapes).catch(() => {});
    return () => { ro?.disconnect(); };
  }, [fitShapes, hasSelection]);
  // Anchored to the VIEWPORT (fixed), not the toolbar: the toolbar is an
  // overflow-x scroller whose computed overflow-y also clips, so an
  // absolutely-positioned popover inside it rendered at (-122,-87) —
  // invisible, ten shapes unreachable (iter-11 regression, measured by
  // iter-12). Iter-13 correction of that correction: anchoring with `bottom`
  // flipped a tall grid ABOVE the viewport (y=-83, behind the header) — the
  // grid now anchors DOWNWARD from the trigger with a viewport-height clamp
  // and internal scroll.
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<{ right: number; top: number; maxHeight: number } | null>(null);
  const primary = SHAPES.slice(0, visibleCount);
  const secondary = SHAPES.slice(visibleCount);

  // A widened panel can absorb the last secondary shape while the popover is
  // open — an empty popover must not linger.
  useEffect(() => {
    if (moreOpen && secondary.length === 0) {setMoreOpen(false);}
  }, [moreOpen, secondary.length]);

  const updateMoreAnchor = useCallback(() => {
    if (!moreBtnRef.current) {return;}
    const r = moreBtnRef.current.getBoundingClientRect();
    const next = {
      right: window.innerWidth - r.right,
      top: r.bottom + 8,
      maxHeight: window.innerHeight - r.bottom - 24,
    };
    setMoreAnchor(prev =>
      prev && prev.right === next.right && prev.top === next.top && prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, []);

  // Keep the open ShapePicker anchored to the More button if the toolbar
  // reflows after opening (e.g. ResizeObserver updates visibleCount after a
  // scale change, collapsing a horizontal scrollbar and shifting top-1/2).
  useLayoutEffect(() => {
    if (!moreOpen) {return;}
    updateMoreAnchor();
  }, [moreOpen, visibleCount, updateMoreAnchor]);

  const toggleMore = () => {
    // Anchor from the FIXED trigger's viewport rect (it lives outside the
    // scroller — iter-14: inside the scroller the More button itself was
    // off-screen at x397).
    if (!moreOpen) {
      updateMoreAnchor();
    }
    setMoreOpen(v => !v);
  };

  // Outside-tap + Escape dismissal (iter-14 P2/P3: the popover previously
  // ignored both — a floating surface with no visible close is a dead end).
  // The guard keys on the ShapePicker's data-shape-picker marker (38-05:
  // the picker replaced the old inline data-more-popover grid), so taps
  // inside the picker — its search input included — never count as outside
  // taps. ShapePicker runs its own guard too; both close idempotently.
  useEffect(() => {
    if (!moreOpen) {return;}
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (moreBtnRef.current?.contains(t)) {return;}
      if (t.closest('[data-shape-picker]')) {return;}
      setMoreOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {setMoreOpen(false);}
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [moreOpen]);

  const pickSecondary = (shape: NodeShape) => {
    setMoreOpen(false);
    onAddShape(shape);
  };

  const pickSpecial = onAddSpecialShape
    ? (shape: SpecialMediaShape) => {
        setMoreOpen(false);
        onAddSpecialShape(shape);
      }
    : undefined;

  return (
    <div className="relative shrink-0 border-b" style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      {/* Root wrapper is NOT masked: a mask-image on an ancestor paints its
          whole subtree — including position:fixed descendants — in the
          mask's coordinate space, which buried the More popover at alpha 0
          (iter-13 P0, triangulated live). The fade mask lives on the
          scroller child; the ShapePicker popover is the scroller's SIBLING. */}
      {/* max-md:overflow-x-hidden (user walk 2026-10-07): the mobile row is
          FIXED — the mobile-first split (2 primaries + pinned More popover)
          already owns every width past the pills, so the residual ~10px of
          scroll was dead travel on a row that must not move. Nothing visible
          clips: the leftover is the primary group's empty pr-16 More lane.
          Desktop keeps the scroller — the adaptive count follows the panel
          width and wide panels scroll legitimately. */}
      <div ref={scrollerRef} className="flex items-center gap-1 px-3 py-2 overflow-x-auto max-md:overflow-x-hidden scroll-fade-x">
      {/* Tool pills measured 30px tall on mobile (critique iter-8 P0) —
          min-h-[44px] + aria-pressed (the accent fill was the only state
          signal) + the shared focus-ring idiom. */}
      <div className="flex items-center gap-1 shrink-0 mr-2">
        <button
          onClick={() => onToolMode('select')}
          aria-pressed={toolMode === 'select'}
          title={t('visual.selectToolHint', 'Select tool (V)')}
          aria-label={t('visual.selectTool')}
          className={`flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors shrink-0 ${FOCUS_RING_CLASSES}`}
          style={{
            background: toolMode === 'select' ? 'var(--accent-dim)' : 'transparent',
            color: toolMode === 'select' ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${toolMode === 'select' ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border-subtle)'}`,
          }}>
          <MousePointer2 size={14} />
          <span>{t('visual.selectTool')}</span>
        </button>
        <button
          onClick={() => onToolMode('connect')}
          aria-pressed={toolMode === 'connect'}
          title={t('visual.connectToolHint')}
          aria-label={t('visual.connectTool')}
          className={`flex items-center gap-1 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors shrink-0 ${FOCUS_RING_CLASSES}`}
          style={{
            background: toolMode === 'connect' ? 'var(--accent-dim)' : 'transparent',
            color: toolMode === 'connect' ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${toolMode === 'connect' ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border-subtle)'}`,
          }}>
          <Link size={14} />
          <span>{t('visual.connectTool')}</span>
        </button>
      </div>

      <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />

      {/* No section label: "SHAPES" cost ~60px that pushed the More button
          off-screen at 390px (iter-14 P1) — the shape previews speak for
          themselves. */}

      <div ref={primaryGroupRef} className={`flex items-center gap-1 shrink-0 ${secondary.length ? 'pr-16' : 'pr-1'}`}>
        {primary.map(({ shape, labelKey }) => (
          <ShapeButton key={shape} shape={shape} label={t(labelKey)} onPick={onAddShape} onDragStart={onDragStart} />
        ))}
      </div>

      {hasSelection && onDeleteSelected && (
        <div data-shapes-after className="flex items-center shrink-0">
          <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={onDeleteSelected}
            title={t('visual.deleteSelected')}
            className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors shrink-0 ${FOCUS_RING_CLASSES}`}
            style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <Trash2 size={14} />
            {t('visual.deleteSelected')}
          </button>
        </div>
      )}
      </div>

      {/* More trigger lives OUTSIDE the scroller, pinned to the toolbar's
          right edge: inside the scroller it scrolled to x397 — fully
          off-screen at 390px, hiding 10 shapes behind an undiscoverable
          scroll (iter-13 P1, measured). pr-16 on the scroller reserves its
          lane so the fade doesn't overlap it. Hidden entirely when every
          shape already fits the panel (wide desktop splits). */}
      {secondary.length > 0 && (
        <button
          type="button"
          ref={moreBtnRef}
          onClick={toggleMore}
          aria-expanded={moreOpen}
          aria-label={t('visual.moreShapes')}
          title={t('visual.moreShapes')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1 px-2 min-h-[53px] rounded-lg border transition-colors ${FOCUS_RING_CLASSES}`}
          style={{
            background: moreOpen
              ? 'color-mix(in srgb, var(--accent) 12%, var(--surface-base))'
              : 'var(--surface-base)',
            borderColor: moreOpen ? 'var(--accent)' : 'var(--border-subtle)',
            color: moreOpen ? 'var(--accent)' : 'var(--text-secondary)',
            minWidth: 52,
          }}>
          <LayoutGrid size={16} />
          <span className="text-xs font-medium leading-none flex items-center gap-0.5">
            {t('visual.moreShapes')}
            <ChevronUp size={10} className={`transition-transform duration-150 ${moreOpen ? '' : 'rotate-180'}`} aria-hidden="true" />
          </span>
        </button>
      )}

      {/* The More popover IS the shared ShapePicker (38-05): search row above
          the internally-scrolling categorized grid over all 53 registry
          shapes. position:fixed from the trigger's viewport rect, and a
          SIBLING of the masked scroller: a mask-image on an ancestor paints
          fixed descendants in the mask's coordinate space (iter-13→14,
          proven live). Sibling placement escapes it. */}
      {moreOpen && moreAnchor && (
        <ShapePicker
          anchor={moreAnchor}
          onClose={() => setMoreOpen(false)}
          onPick={pickSecondary}
          onDragStart={onDragStart}
          onPickSpecial={pickSpecial}
          onDragStartSpecial={onDragStartSpecial}
          triggerRef={moreBtnRef}
        />
      )}

      {/* Hidden measurer: every shape at identical styles, off the paint and
          the a11y tree (visibility:hidden). width:max-content is load-bearing
          — an absolute shrink-to-fit container clamps to the parent and
          squeezes the buttons (52px minimums), over-counting what fits.
          left:-10000px is ALSO load-bearing (device walk 2026-10-07): at
          left:0 the full-width strip (53 buttons ≈ 3900px) spilled into the
          scrollable overflow of every non-clipping ancestor — the preview
          pane's overflow-auto became horizontally pannable, so a touch drag
          past the toolbar's scroll edge chained up and dragged the whole
          workspace. Overflow to the LEFT is unreachable in LTR (scrollLeft
          can't go negative): no ancestor gains a pan lane. Only the buttons'
          individual widths are read — the container's own position never
          enters a measurement. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: -10000, width: 'max-content', visibility: 'hidden', pointerEvents: 'none', display: 'flex', gap: 4, whiteSpace: 'nowrap' }}
      >
        {SHAPES.map(({ shape, labelKey }) => (
          <ShapeButton key={shape} shape={shape} label={t(labelKey)} onPick={() => {}} />
        ))}
      </div>
    </div>
  );
}
