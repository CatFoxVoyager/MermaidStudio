import { useState, useCallback } from 'react';
import { X, RotateCcw, ChevronDown, Settings2 } from 'lucide-react';
import { ColorPicker } from '@/components/visual/ColorPicker';
import type { EdgeStyle, ParsedEdge } from '@/lib/mermaid/codeUtils';

interface EdgeStylePanelProps {
  edge: ParsedEdge;
  edgeIndex: number;
  edgeStyle: EdgeStyle;
  onClose: () => void;
  onArrowChange: (source: string, target: string, arrowType: string) => void;
  onLabelChange: (source: string, target: string, label: string) => void;
  onStyleChange: (edgeIndex: number, style: Partial<EdgeStyle>) => void;
  onReset: (edgeIndex: number) => void;
}

const ARROW_OPTIONS = [
  { value: '-->',   label: 'Arrow (-->)' },
  { value: '---',   label: 'Line (---)' },
  { value: '-.->',  label: 'Dotted (-.->)' },
  { value: '==>',   label: 'Thick (==>)' },
  { value: 'o--o',  label: 'Circle (o--o)' },
  { value: 'x--x',  label: 'Cross (x--x)' },
  { value: '<-->',  label: 'Bidirectional (<-->)' },
] as const;

const BORDER_STYLE_OPTIONS = [
  { value: '', label: 'Solid', dasharray: '' },
  { value: '5 5', label: 'Dashed', dasharray: '5 5' },
  { value: '2 2', label: 'Dotted', dasharray: '2 2' },
] as const;

export function EdgeStylePanel({
  edge,
  edgeIndex,
  edgeStyle,
  onClose,
  onArrowChange,
  onLabelChange,
  onStyleChange,
  onReset,
}: EdgeStylePanelProps) {
  const [label, setLabel] = useState(edge.label);

  const handleArrowChange = useCallback(
    (newType: string) => {
      onArrowChange(edge.source, edge.target, newType);
    },
    [edge.source, edge.target, onArrowChange],
  );

  const handleLabelBlur = useCallback(() => {
    onLabelChange(edge.source, edge.target, label);
  }, [edge.source, edge.target, label, onLabelChange]);

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onLabelChange(edge.source, edge.target, label);
      }
    },
    [edge.source, edge.target, label, onLabelChange],
  );

  const handleStyleChange = useCallback(
    (field: keyof EdgeStyle, value: string | undefined) => {
      onStyleChange(edgeIndex, { [field]: value });
    },
    [edgeIndex, onStyleChange],
  );

  const parsePx = (v: string | undefined): number => parseInt(v?.replace('px', '') ?? '') || 0;

  return (
    <div
      className="absolute top-0 right-0 h-full w-[280px] z-30 animate-slide-in-right rounded-l-xl border-l shadow-xl overflow-y-auto"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 size={13} style={{ color: 'var(--accent)' }} />
          <span
            className="text-xs font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            Edge {edgeIndex}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-white/10 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Connection Info */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Connection
          </span>
          <div
            className="text-xs px-2.5 py-2 rounded-md border font-mono"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {edge.source} &rarr; {edge.target}
          </div>
        </div>

        {/* Arrow Type */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Arrow Type
          </span>
          <div className="relative">
            <select
              value={edge.arrowType}
              onChange={e => handleArrowChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              {ARROW_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            />
          </div>
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Label
          </span>
          <input
            type="text"
            value={label}
            placeholder="Edge label..."
            onChange={e => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            className="w-full px-2.5 py-1.5 rounded-md border text-xs"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Stroke Color */}
        <ColorPicker
          label="Stroke Color"
          value={edgeStyle.stroke ?? ''}
          onChange={v => handleStyleChange('stroke', v || undefined)}
        />

        {/* Stroke Width */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Stroke Width
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={parsePx(edgeStyle.strokeWidth) || 2}
              onChange={e => handleStyleChange('strokeWidth', `${e.target.value}px`)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {edgeStyle.strokeWidth ?? '2px'}
            </span>
          </div>
        </div>

        {/* Stroke Style */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Stroke Style
          </span>
          <div className="flex gap-1">
            {BORDER_STYLE_OPTIONS.map(opt => {
              const isActive =
                (opt.value === '' && !edgeStyle.strokeDasharray) ||
                edgeStyle.strokeDasharray === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleStyleChange('strokeDasharray', opt.value || undefined)
                  }
                  className="flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                    background: isActive ? 'var(--accent-dim)' : 'var(--surface-base)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    borderWidth: isActive ? '2px' : '1px',
                    borderBottomStyle: opt.dasharray
                      ? opt.value === '5 5'
                        ? 'dashed'
                        : 'dotted'
                      : 'solid',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Opacity */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Opacity
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={parseFloat(edgeStyle.opacity ?? '1')}
              onChange={e => handleStyleChange('opacity', e.target.value)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {edgeStyle.opacity ?? '1'}
            </span>
          </div>
        </div>

        {/* Reset Button */}
        <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => onReset(edgeIndex)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <RotateCcw size={12} />
            Reset Style
          </button>
        </div>
      </div>
    </div>
  );
}
