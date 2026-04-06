import { useState, useCallback } from 'react';
import { X, RotateCcw, Settings2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from '@/components/visual/ColorPicker';
import type { NodeStyle } from '@/lib/mermaid/codeUtils';

interface SubgraphStylePanelProps {
  subgraphId: string;
  subgraphLabel: string;
  subgraphStyle: NodeStyle;
  onClose: () => void;
  onStyleChange: (subgraphId: string, style: Partial<NodeStyle>) => void;
  onLabelChange: (subgraphId: string, newLabel: string) => void;
  onReset: (subgraphId: string) => void;
}

export function SubgraphStylePanel({
  subgraphId,
  subgraphLabel,
  subgraphStyle,
  onClose,
  onStyleChange,
  onLabelChange,
  onReset,
}: SubgraphStylePanelProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(subgraphLabel);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleLabelChange = useCallback(
    (newLabel: string) => {
      setLabel(newLabel);
      onLabelChange(subgraphId, newLabel);
    },
    [subgraphId, onLabelChange],
  );

  const BORDER_STYLE_OPTIONS = [
    { value: '', label: t('subgraphStyle.solid'), dasharray: '' },
    { value: '5 5', label: t('subgraphStyle.dashed'), dasharray: '5 5' },
    { value: '2 2', label: t('subgraphStyle.dotted'), dasharray: '2 2' },
  ] as const;

  const FONT_WEIGHT_OPTIONS = [
    { value: '', label: t('nodeStyle.fontDefault') },
    { value: 'normal', label: t('nodeStyle.fontNormal') },
    { value: 'bold', label: t('nodeStyle.fontBold') },
    { value: 'lighter', label: t('nodeStyle.fontLighter') },
    { value: 'bolder', label: t('nodeStyle.fontBolder') },
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

  const handleStyleChange = useCallback(
    (field: keyof NodeStyle, value: string | undefined) => {
      onStyleChange(subgraphId, { [field]: value });
    },
    [subgraphId, onStyleChange],
  );

  const parsePx = (v: string | undefined): number => parseInt(v?.replace('px', '') ?? '') || 0;

  return (
    <div
      className="absolute top-0 right-0 h-full w-[280px] z-30 animate-slide-in-right rounded-l-xl border-l shadow-xl overflow-y-auto"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
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
            {subgraphLabel || subgraphId}
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
        {/* Subgraph ID */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('subgraphStyle.subgraphId')}
          </span>
          <div
            className="text-xs px-2.5 py-2 rounded-md border font-mono"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {subgraphId}
          </div>
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('subgraphStyle.label')}
          </span>
          <input
            type="text"
            value={label}
            placeholder={t('subgraphStyle.labelPlaceholder')}
            onChange={e => handleLabelChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md border text-xs"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Fill Color */}
        <ColorPicker
          label={t('subgraphStyle.fillColor')}
          value={subgraphStyle.fill ?? ''}
          onChange={v => handleStyleChange('fill', v || undefined)}
        />

        {/* Stroke Color */}
        <ColorPicker
          label={t('subgraphStyle.borderColor')}
          value={subgraphStyle.stroke ?? ''}
          onChange={v => handleStyleChange('stroke', v || undefined)}
        />

        {/* Stroke Width */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('subgraphStyle.strokeWidth')}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={parsePx(subgraphStyle.strokeWidth) || 1}
              onChange={e => handleStyleChange('strokeWidth', `${e.target.value}px`)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {subgraphStyle.strokeWidth ?? '1px'}
            </span>
          </div>
        </div>

        {/* Border Style */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('subgraphStyle.borderStyle')}
          </span>
          <div className="flex gap-1">
            {BORDER_STYLE_OPTIONS.map(opt => {
              const isActive =
                (opt.value === '' && !subgraphStyle.strokeDasharray) ||
                subgraphStyle.strokeDasharray === opt.value;
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
          label={t('subgraphStyle.textColor')}
          value={subgraphStyle.color ?? ''}
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
          {t('nodeStyle.advanced')}
        </button>

        {/* Advanced Section */}
        {advancedOpen && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Font Family */}
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('subgraphStyle.fontFamily')}
              </span>
              <div className="relative">
                <select
                  value={subgraphStyle.fontFamily ?? ''}
                  onChange={e =>
                    handleStyleChange('fontFamily', e.target.value || undefined)
                  }
                  className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  <option value="">{t('nodeStyle.fontDefault')}</option>
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
                  <option value="'Playfair Display', serif">Playfair Display</option>
                  <option value="monospace">Monospace</option>
                </select>
                <ChevronDown
                  size={11}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </div>
            </div>

            {/* Font Weight */}
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('subgraphStyle.fontWeight')}
              </span>
              <div className="relative">
                <select
                  value={subgraphStyle.fontWeight ?? ''}
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
                {t('subgraphStyle.fontSize')}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={48}
                  step={1}
                  value={
                    subgraphStyle.fontSize ? parsePx(subgraphStyle.fontSize) : 16
                  }
                  onChange={e => {
                    const v = e.target.value;
                    handleStyleChange('fontSize', v ? `${v}px` : undefined);
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
          </div>
        )}

        {/* Opacity */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('subgraphStyle.opacity')}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={parseFloat(subgraphStyle.opacity ?? '1')}
              onChange={e => handleStyleChange('opacity', e.target.value)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {subgraphStyle.opacity ?? '1'}
            </span>
          </div>
        </div>

        {/* Reset Button */}
        <div className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => onReset(subgraphId)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <RotateCcw size={12} />
            {t('subgraphStyle.resetStyle')}
          </button>
        </div>
      </div>
    </div>
  );
}
