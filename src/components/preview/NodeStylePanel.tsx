import { useState, useCallback } from 'react';
import { X, RotateCcw, ChevronDown, Settings2 } from 'lucide-react';
import { ColorPicker } from '@/components/visual/ColorPicker';
import type { NodeStyle } from '@/lib/mermaid/codeUtils';

interface NodeStylePanelProps {
  selectedNodeIds: string[];
  /** Array of styles for each selected node, same order as selectedNodeIds */
  nodeStyles: NodeStyle[];
  nodeLabels: Map<string, string>;
  onClose: () => void;
  onStyleChange: (nodeIds: string[], style: Partial<NodeStyle>) => void;
  onReset: (nodeIds: string[]) => void;
  /** If true, hide rx/ry properties (for circle/diamond shapes where border radius has no visual effect) */
  hideBorderRadius?: boolean;
}

function getSharedValue(styles: NodeStyle[], field: keyof NodeStyle): string | 'mixed' | undefined {
  if (styles.length === 0) return undefined;
  const first = styles[0][field];
  if (first === undefined) return undefined;
  const allSame = styles.every(s => s[field] === first);
  return allSame ? first : 'mixed';
}

const BORDER_STYLE_OPTIONS = [
  { value: '', label: 'Solid', dasharray: '' },
  { value: '5 5', label: 'Dashed', dasharray: '5 5' },
  { value: '2 2', label: 'Dotted', dasharray: '2 2' },
] as const;

const FONT_WEIGHT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'lighter', label: 'Lighter' },
  { value: 'bolder', label: 'Bolder' },
  { value: '100', label: '100' },
  { value: '200', label: '200' },
  { value: '300', label: '300' },
  { value: '400', label: '400' },
  { value: '500', label: '500' },
  { value: '600', label: '600' },
  { value: '700', label: '700' },
  { value: '800', label: '800' },
  { value: '900', label: '900' },
] as const;

export function NodeStylePanel({
  selectedNodeIds,
  nodeStyles,
  nodeLabels,
  onClose,
  onStyleChange,
  onReset,
  hideBorderRadius = false,
}: NodeStylePanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleStyleChange = useCallback(
    (field: keyof NodeStyle, value: string | undefined) => {
      onStyleChange(selectedNodeIds, { [field]: value });
    },
    [selectedNodeIds, onStyleChange],
  );

  const headerTitle =
    selectedNodeIds.length === 1
      ? (nodeLabels.get(selectedNodeIds[0]) ?? selectedNodeIds[0])
      : `${selectedNodeIds.length} Nodes`;

  // Compute shared values for multi-node editing
  const fillColor = getSharedValue(nodeStyles, 'fill');
  const borderColor = getSharedValue(nodeStyles, 'stroke');
  const borderWidth = getSharedValue(nodeStyles, 'strokeWidth');
  const borderStyle = getSharedValue(nodeStyles, 'strokeDasharray');
  const textColor = getSharedValue(nodeStyles, 'color');
  const fontWeight = getSharedValue(nodeStyles, 'fontWeight');
  const fontSize = getSharedValue(nodeStyles, 'fontSize');
  const rx = getSharedValue(nodeStyles, 'rx');
  const ry = getSharedValue(nodeStyles, 'ry');

  // Helper to format color values for ColorPicker (mixed -> '' with mixed label)
  const colorValue = (v: string | 'mixed' | undefined): string =>
    v === 'mixed' || v === undefined ? '' : v;
  const colorLabel = (label: string, v: string | 'mixed' | undefined): string =>
    v === 'mixed' ? `${label} (Mixed)` : label;

  // Helper for range/select inputs with mixed state
  const numericValue = (v: string | 'mixed' | undefined, fallback: string): string =>
    v === 'mixed' ? fallback : v ?? fallback;
  const parsePx = (v: string): number => parseInt(v.replace('px', '')) || 0;

  return (
    <div
      className="absolute top-0 right-0 h-full w-[280px] z-30 animate-slide-in-right rounded-l-xl border-l shadow-xl overflow-y-auto"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
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
            {headerTitle}
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
        {/* Recommended Section */}
        <ColorPicker
          label={colorLabel('Fill Color', fillColor)}
          value={colorValue(fillColor)}
          onChange={v => handleStyleChange('fill', v || undefined)}
        />
        <ColorPicker
          label={colorLabel('Border Color', borderColor)}
          value={colorValue(borderColor)}
          onChange={v => handleStyleChange('stroke', v || undefined)}
        />

        {/* Border Width */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Border Width
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={parsePx(numericValue(borderWidth, '1px'))}
              onChange={e => handleStyleChange('strokeWidth', `${e.target.value}px`)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {borderWidth === 'mixed' ? 'Mixed' : borderWidth ?? '1px'}
            </span>
          </div>
        </div>

        {/* Border Style */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Border Style
          </span>
          <div className="flex gap-1">
            {BORDER_STYLE_OPTIONS.map(opt => {
              const isActive =
                borderStyle === 'mixed'
                  ? false
                  : (opt.value === '' && !borderStyle) || borderStyle === opt.value;
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

        <ColorPicker
          label={colorLabel('Text Color', textColor)}
          value={colorValue(textColor)}
          onChange={v => handleStyleChange('color', v || undefined)}
        />

        {/* Advanced Toggle */}
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          className="flex items-center gap-1 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ChevronDown
            size={11}
            style={{
              transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
          Advanced
        </button>

        {/* Advanced Section */}
        {advancedOpen && (
          <div className="flex flex-col gap-4">
            {/* Font Weight */}
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Font Weight
              </span>
              <div className="relative">
                <select
                  value={fontWeight === 'mixed' ? '' : fontWeight ?? ''}
                  onChange={e =>
                    handleStyleChange('fontWeight', e.target.value || undefined)
                  }
                  className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  {fontWeight === 'mixed' && (
                    <option value="">Mixed</option>
                  )}
                  {FONT_WEIGHT_OPTIONS.map(opt => (
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

            {/* Font Size */}
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Font Size
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={48}
                  step={1}
                  value={
                    fontSize === 'mixed'
                      ? ''
                      : fontSize
                        ? parsePx(fontSize)
                        : ''
                  }
                  placeholder={fontSize === 'mixed' ? 'Mixed' : ''}
                  onChange={e => {
                    const v = e.target.value;
                    if (v) {
                      handleStyleChange('fontSize', `${v}px`);
                    }
                  }}
                  className="flex-1 px-2 py-1.5 rounded-md border text-xs font-mono w-0"
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  px
                </span>
              </div>
            </div>

            {/* Border Radius X */}
            {!hideBorderRadius && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Border Radius X
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={rx === 'mixed' ? 0 : parseInt(rx ?? '0') || 0}
                    onChange={e => handleStyleChange('rx', e.target.value)}
                    className="flex-1 accent-teal-500"
                  />
                  <span
                    className="text-xs w-8 text-right font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {rx === 'mixed' ? 'Mix' : rx ?? '0'}
                  </span>
                </div>
              </div>
            )}

            {/* Border Radius Y */}
            {!hideBorderRadius && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Border Radius Y
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={ry === 'mixed' ? 0 : parseInt(ry ?? '0') || 0}
                    onChange={e => handleStyleChange('ry', e.target.value)}
                    className="flex-1 accent-teal-500"
                  />
                  <span
                    className="text-xs w-8 text-right font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {ry === 'mixed' ? 'Mix' : ry ?? '0'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset Button */}
        <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => onReset(selectedNodeIds)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <RotateCcw size={12} />
            Reset Styles
          </button>
        </div>
      </div>
    </div>
  );
}
