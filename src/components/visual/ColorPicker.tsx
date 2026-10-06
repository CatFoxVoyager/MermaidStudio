import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Pipette } from 'lucide-react';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';

const PRESETS = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
  '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b',
  '#fee2e2', '#fca5a5', '#ef4444', '#dc2626',
  '#dcfce7', '#86efac', '#22c55e', '#16a34a',
  '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8',
  '#cffafe', '#67e8f9', '#06b6d4', '#0891b2',
  '#f3e8ff', '#d8b4fe', '#a855f7', '#7c3aed',
  '#fce7f3', '#fbcfe8', '#ec4899', '#be185d',
  '#111827', '#374151', '#6b7280', '#9ca3af',
  '#0d7377', '#2dd4bf', '#14b8a6', '#0f766e',
  'none', 'transparent',
];

interface Props {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value && value !== 'none' && value !== 'transparent' ? value : '');
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);

  // Sync hex when value prop changes
  useLayoutEffect(() => {
    if (value && value !== 'none' && value !== 'transparent') {setHex(value);}
    else {setHex('');}
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // iter-32 P3: dismissal was mousedown-only — worked on touch through
    // the compatibility event, but Escape (keyboard parity, iter-30 fixed
    // the trigger) and interrupted pointers (pointercancel) leaked.
    // Capture-phase Escape: the host panel also listens on document
    // (bubble) for its own Escape — stopping propagation here closes only
    // the topmost layer (the popover), not the panel underneath it.
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }
    function handlePointerCancel() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [open]);

  function handleHexChange(v: string) {
    setHex(v);
    // Only accept hex colors: #RGB or #RRGGBB
    if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
    }
  }

  // Popover position: FIXED, anchored to the trigger, clamped to the real
  // measured box (iter-29 P0: an absolute popover inside the 40dvh
  // overflow-hidden style panel opened entirely below the viewport —
  // invisible, unreachable; fixed coordinates escape the clip entirely.
  // iter-32 P1: the flip then computed on a stale POPOVER_H constant — 294
  // vs 418px real — leaving 116px under the fold: last swatch row +
  // pipette/hex unreachable at 390×844. Measure after layout, never trust
  // a height constant.)
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{ left: number; top: number } | null>(null);

  const toggleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const margin = 8;
      // Initial estimate (below the trigger); the layout effect below
      // clamps both axes against the popover's real measured box before
      // first paint.
      const left = Math.max(margin, Math.min(r.left, window.innerWidth - 256 - margin));
      setPopPos({ left, top: r.bottom + margin });
    }
    setOpen(v => !v);
  };

  useLayoutEffect(() => {
    if (!open || !popRef.current) return;
    const pop = popRef.current;
    const margin = 8;
    const realW = pop.offsetWidth;
    const realH = pop.offsetHeight;
    setPopPos(prev => {
      if (!prev) return prev;
      let left = Math.min(prev.left, window.innerWidth - realW - margin);
      left = Math.max(margin, left);
      // Flip above when the real box overflows the viewport bottom.
      const maxTop = Math.max(margin, window.innerHeight - realH - margin);
      return { left, top: Math.min(prev.top, maxTop) };
    });
  }, [open]);

  function handlePreset(color: string) {
    onChange(color);
    setHex(color === 'none' || color === 'transparent' ? '' : color);
    setOpen(false);
  }

  const displayColor = value && value !== 'none' && value !== 'transparent' ? value : undefined;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          onClick={toggleOpen}
          onKeyDown={(e) => {
            // Keyboard parity (iter-12 P1): the trigger used onMouseDown +
            // preventDefault, so Enter/Space activation never opened the
            // picker — it was pointer-only.
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleOpen();
            }
          }}
          aria-label={label}
          aria-expanded={open}
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-xs transition-colors ${FOCUS_RING_CLASSES}`}
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
          <span
            className="w-4 h-4 rounded-sm shrink-0 border"
            style={{
              background: displayColor ?? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px',
              borderColor: 'var(--border-strong)',
            }} />
          <span className="flex-1 text-left truncate font-mono">
            {value || 'none'}
          </span>
        </button>

        {open && popPos && (
          <div
            ref={popRef}
            className="fixed z-50 w-64 rounded-xl border shadow-2xl p-3 animate-fade-in overflow-y-auto"
            style={{ left: popPos.left, top: popPos.top, maxHeight: 'calc(100dvh - 16px)', background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
            {/* 5 columns of 40px swatches (iter-30 P1: was 32px in 8 cols).
                iter-32: FOCUS_RING_CLASSES on swatches — the ring was the
                UA default outline, breaking the app-wide recipe. */}
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {PRESETS.map(color => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePreset(color);
                  }}
                  title={color}
                  aria-label={color}
                  className={`swatch w-10 h-10 rounded-md border transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${FOCUS_RING_CLASSES}`}
                  style={{
                    background: color === 'none' || color === 'transparent'
                      ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px'
                      : color,
                    borderColor: value === color ? 'var(--accent)' : 'var(--border-subtle)',
                    outline: value === color ? '2px solid var(--accent)' : undefined,
                    outlineOffset: '1px',
                  }}>
                  {(color === 'none' || color === 'transparent') && (
                    <span className="text-[8px] font-bold text-gray-500">∅</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={nativeRef}
                type="color"
                className="w-0 h-0 opacity-0 absolute"
                value={displayColor ?? '#ffffff'}
                onChange={e => { onChange(e.target.value); setHex(e.target.value); }}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  nativeRef.current?.click();
                }}
                aria-label="Custom color"
                className={`flex items-center justify-center w-11 h-11 rounded-md border transition-colors hover:bg-[var(--hover)] ${FOCUS_RING_CLASSES}`}
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                title="Custom color">
                <Pipette size={14} />
              </button>
              <input
                type="text"
                value={hex}
                placeholder="#rrggbb"
                aria-label="Hex color value"
                onChange={e => handleHexChange(e.target.value)}
                className="flex-1 min-w-0 px-2 py-2 text-base rounded-md border font-mono"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
