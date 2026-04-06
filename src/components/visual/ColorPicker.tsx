import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Pipette } from 'lucide-react';

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

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  function handleHexChange(v: string) {
    setHex(v);
    // Only accept hex colors: #RGB or #RRGGBB
    if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
    }
  }

  function handlePreset(color: string) {
    onChange(color);
    setHex(color === 'none' || color === 'transparent' ? '' : color);
    setOpen(false);
  }

  const displayColor = value && value !== 'none' && value !== 'transparent' ? value : undefined;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      <div ref={containerRef} className="relative">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen(v => !v);
          }}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-xs transition-colors"
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

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl border shadow-2xl p-3 animate-fade-in"
            style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
            <div className="grid grid-cols-8 gap-1 mb-3">
              {PRESETS.map(color => (
                <button
                  key={color}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePreset(color);
                  }}
                  title={color}
                  className="w-5 h-5 rounded-md border transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  nativeRef.current?.click();
                }}
                className="flex items-center justify-center w-8 h-7 rounded-md border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                title="Custom color">
                <Pipette size={12} />
              </button>
              <input
                type="text"
                value={hex}
                placeholder="#rrggbb"
                onChange={e => handleHexChange(e.target.value)}
                className="flex-1 px-2 py-1 rounded-md border text-xs font-mono"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
