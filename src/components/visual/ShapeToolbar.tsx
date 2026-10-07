import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MousePointer2, Link, Trash2, LayoutGrid, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NodeShape, ToolMode } from './types';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';

interface ShapeButtonProps {
  shape: NodeShape;
  label: string;
  onPick: (shape: NodeShape) => void;
}

function ShapePreview({ shape }: { shape: NodeShape }) {
  const props = { stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' };
  switch (shape) {
    case 'rect':          return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /></svg>;
    case 'round':         return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="7" {...props} /></svg>;
    case 'stadium':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="7" {...props} /><line x1="9" y1="3" x2="9" y2="17" {...props} /><line x1="19" y1="3" x2="19" y2="17" {...props} /></svg>;
    case 'subroutine':    return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="6" y1="3" x2="6" y2="17" {...props} /><line x1="22" y1="3" x2="22" y2="17" {...props} /></svg>;
    case 'cylinder':      return <svg width="28" height="20" viewBox="0 0 28 20"><ellipse cx="14" cy="6" rx="10" ry="3" {...props} /><ellipse cx="14" cy="14" rx="10" ry="3" {...props} /><line x1="4" y1="6" x2="4" y2="14" {...props} /><line x1="24" y1="6" x2="24" y2="14" {...props} /></svg>;
    case 'circle':        return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /></svg>;
    case 'dbl-circ':      return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /><circle cx="14" cy="10" r="4.5" {...props} /></svg>;
    case 'rhombus':       return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="14,2 26,10 14,18 2,10" {...props} /></svg>;
    case 'hexagon':       return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="8,3 20,3 26,10 20,17 8,17 2,10" {...props} /></svg>;
    case 'asymmetric':    return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,3 22,3 26,10 22,17 2,17" {...props} /></svg>;
    case 'parallelogram': return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="6,3 26,3 22,17 2,17" {...props} /></svg>;
    case 'parallelogram-alt': return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,3 22,3 26,17 6,17" {...props} /></svg>;
    case 'trapezoid':     return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="6,3 22,3 26,17 2,17" {...props} /></svg>;
    case 'trapezoid-alt': return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,3 26,3 22,17 6,17" {...props} /></svg>;
    default:              return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /></svg>;
  }
}

function ShapeButton({ shape, label, onPick }: ShapeButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      draggable
      onDragStart={() => onPick(shape)}
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

// Labels live in i18n (visual.shapes.*) — the toolbar previously hardcoded
// English names and English titles (critique iter-9 P2).
const SHAPES: { shape: NodeShape; labelKey: string }[] = [
  { shape: 'rect',          labelKey: 'visual.shapes.box' },
  { shape: 'round',         labelKey: 'visual.shapes.round' },
  { shape: 'stadium',       labelKey: 'visual.shapes.stadium' },
  { shape: 'rhombus',       labelKey: 'visual.shapes.rhombus' },
  { shape: 'circle',        labelKey: 'visual.shapes.circle' },
  { shape: 'hexagon',       labelKey: 'visual.shapes.hexagon' },
  { shape: 'cylinder',      labelKey: 'visual.shapes.cylinder' },
  { shape: 'parallelogram', labelKey: 'visual.shapes.slant' },
  { shape: 'parallelogram-alt', labelKey: 'visual.shapes.slantAlt' },
  { shape: 'trapezoid',     labelKey: 'visual.shapes.trapezoid' },
  { shape: 'trapezoid-alt', labelKey: 'visual.shapes.trapezoidAlt' },
  { shape: 'subroutine',    labelKey: 'visual.shapes.subroutine' },
  { shape: 'asymmetric',    labelKey: 'visual.shapes.flag' },
  { shape: 'dbl-circ',      labelKey: 'visual.shapes.dblCirc' },
];

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
  /** Optional inline delete (visual editor keeps it; PreviewPanel moved
   *  deletion into its detail panels, so it no longer passes these). */
  onDeleteSelected?: () => void;
  hasSelection?: boolean;
}

export function ShapeToolbar({ toolMode, onToolMode, onAddShape, onDragStart, onDeleteSelected, hasSelection }: Props) {
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
    const gap = 4; // gap-1 inside the primary group
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
    const padRight = parseFloat(getComputedStyle(el).paddingRight) || 0;
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
    // lane) disappears entirely. Pass 2: otherwise the group reserves the
    // More lane (pr-16 = 64px) AFTER the shapes — the fill must leave it
    // free, or the row overflows by exactly the lane width.
    const base = el.clientWidth - leftPrefix - padRight - rightFixed;
    const countAll = greedy(base);
    const count = countAll >= SHAPES.length
      ? countAll
      : Math.max(MIN_PRIMARY_SHAPE_COUNT, greedy(base - 64));
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

  const toggleMore = () => {
    // Anchor from the FIXED trigger's viewport rect (it lives outside the
    // scroller — iter-14: inside the scroller the More button itself was
    // off-screen at x397).
    if (!moreOpen && moreBtnRef.current) {
      const r = moreBtnRef.current.getBoundingClientRect();
      setMoreAnchor({
        right: window.innerWidth - r.right,
        top: r.bottom + 8,
        maxHeight: window.innerHeight - r.bottom - 24,
      });
    }
    setMoreOpen(v => !v);
  };

  // Outside-tap + Escape dismissal (iter-14 P2/P3: the popover previously
  // ignored both — a floating surface with no visible close is a dead end).
  useEffect(() => {
    if (!moreOpen) {return;}
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (moreBtnRef.current?.contains(t)) {return;}
      if (t.closest('[data-more-popover]')) {return;}
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

  return (
    <div className="relative shrink-0 border-b" style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      {/* Root wrapper is NOT masked: a mask-image on an ancestor paints its
          whole subtree — including position:fixed descendants — in the
          mask's coordinate space, which buried the More popover at alpha 0
          (iter-13 P0, triangulated live). The fade mask lives on the
          scroller child; the popover is the scroller's SIBLING. */}
      <div ref={scrollerRef} className="flex items-center gap-1 px-3 py-2 overflow-x-auto scroll-fade-x">
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
          <ShapeButton key={shape} shape={shape} label={t(labelKey)} onPick={onAddShape} />
        ))}
      </div>

      {hasSelection && onDeleteSelected && (
        <div data-shapes-after className="flex items-center shrink-0">
          <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={onDeleteSelected}
            title={t('visual.deleteSelected')}
            className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors shrink-0 ${FOCUS_RING_CLASSES}`}
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
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
          style={{ background: moreOpen ? 'var(--accent-dim)' : 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: moreOpen ? 'var(--accent)' : 'var(--text-secondary)', minWidth: 52 }}>
          <LayoutGrid size={16} />
          <span className="text-xs font-medium leading-none flex items-center gap-0.5">
            {t('visual.moreShapes')}
            <ChevronUp size={10} className={`transition-transform duration-150 ${moreOpen ? '' : 'rotate-180'}`} aria-hidden="true" />
          </span>
        </button>
      )}

      {/* Secondary shapes grid — position:fixed from the button's viewport
          rect, and a SIBLING of the masked scroller: a mask-image on an
          ancestor paints fixed descendants in the mask's coordinate space
          (iter-13→14, proven live). Sibling placement escapes it. */}
      {moreOpen && moreAnchor && (
        <div
          data-more-popover
          className="fixed z-20 grid grid-cols-3 gap-1.5 p-2.5 rounded-xl border shadow-xl animate-fade-in overflow-y-auto"
          style={{ right: moreAnchor.right, top: moreAnchor.top, maxHeight: moreAnchor.maxHeight, background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
        >
          {secondary.map(({ shape, labelKey }) => (
            <ShapeButton key={shape} shape={shape} label={t(labelKey)} onPick={pickSecondary} />
          ))}
        </div>
      )}

      {/* Hidden measurer: every shape at identical styles, off the paint and
          the a11y tree (visibility:hidden). width:max-content is load-bearing
          — an absolute shrink-to-fit container clamps to the parent and
          squeezes the buttons (52px minimums), over-counting what fits. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, width: 'max-content', visibility: 'hidden', pointerEvents: 'none', display: 'flex', gap: 4, whiteSpace: 'nowrap' }}
      >
        {SHAPES.map(({ shape, labelKey }) => (
          <ShapeButton key={shape} shape={shape} label={t(labelKey)} onPick={() => {}} />
        ))}
      </div>
    </div>
  );
}
