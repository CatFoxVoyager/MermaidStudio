import { useEffect, useRef, useState } from 'react';
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
];

// Mobile-first split (critique iter-10→13): the pinned More chip occupies
// the scroller's reserved right lane, and a third primary spawned INSIDE
// that lane — Stadium sat 83% occluded under the chip at rest (iter-13
// measurement). Two primaries (Box, Round) clear the lane; everything else
// lives in the popover.
const PRIMARY_SHAPE_COUNT = 2;

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
  const primary = SHAPES.slice(0, PRIMARY_SHAPE_COUNT);
  const secondary = SHAPES.slice(PRIMARY_SHAPE_COUNT);

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
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scroll-fade-x">
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

      <div className="flex items-center gap-1 shrink-0 pr-16">
        {primary.map(({ shape, labelKey }) => (
          <ShapeButton key={shape} shape={shape} label={t(labelKey)} onPick={onAddShape} />
        ))}
      </div>

      {hasSelection && onDeleteSelected && (
        <>
          <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={onDeleteSelected}
            title={t('visual.deleteSelected')}
            className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors shrink-0 ${FOCUS_RING_CLASSES}`}
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Trash2 size={14} />
            {t('visual.deleteSelected')}
          </button>
        </>
      )}
      </div>

      {/* More trigger lives OUTSIDE the scroller, pinned to the toolbar's
          right edge: inside the scroller it scrolled to x397 — fully
          off-screen at 390px, hiding 10 shapes behind an undiscoverable
          scroll (iter-13 P1, measured). pr-16 on the scroller reserves its
          lane so the fade doesn't overlap it. */}
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
    </div>
  );
}
