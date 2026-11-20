import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { X, RotateCcw, ChevronDown, Settings2, Zap, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from '@/components/visual/ColorPicker';
// 38-06 (SHP-04): shape-change parity with the visual editor's PropertiesPanel
// — the same unified ShapePicker, mounted as a fixed-position popover so the
// panel's own overflow clipping cannot eat it.
import { ShapePicker } from '@/components/shared/ShapePicker';
import type { ShapePickerAnchor } from '@/components/shared/ShapePicker';
import { ShapePreview } from '@/components/shared/ShapePreview';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import type { NodeStyle, NodeShape, PresetType } from '@/lib/mermaid/codeUtils';

interface NodeStylePreset {
  label: string;
  presetType: PresetType;
  color: string;
}

interface NodeStylePanelProps {
  selectedNodeIds: string[];
  /** Array of styles for each selected node, same order as selectedNodeIds */
  nodeStyles: NodeStyle[];
  /** 38-06: Array of shapes for each selected node, same order as selectedNodeIds (required with onShapeChange) */
  nodeShapes?: NodeShape[];
  nodeLabels: Map<string, string>;
  onClose: () => void;
  onStyleChange: (nodeIds: string[], style: Partial<NodeStyle>) => void;
  /** 38-06 (SHP-04): shape change for the selection — mirrors the onStyleChange multi-node signature */
  onShapeChange?: (nodeIds: string[], shape: NodeShape) => void;
  onReset: (nodeIds: string[]) => void;
  /** If true, hide rx/ry properties (for circle/diamond shapes where border radius has no visual effect) */
  hideBorderRadius?: boolean;
  /** Map of node ID to parent subgraph ID (null = root) */
  nodeSubgraphIds?: Map<string, string | null>;
  /** Available subgraphs */
  subgraphs?: Array<{ id: string; label: string }>;
  /** Callback when subgraph assignment changes */
  onSubgraphChange?: (nodeId: string, subgraphId: string | null) => void;
  /** Callback when node label changes */
  onLabelChange?: (nodeId: string, newLabel: string) => void;
  /** Presets generated from current theme colors */
  presets?: NodeStylePreset[];
  /** Callback when a preset is applied */
  onPresetApply?: (nodeIds: string[], presetType: PresetType) => void;
  /** Callback when the selected nodes are deleted (hides the button if absent) */
  onDelete?: () => void;
}

function getSharedValue(styles: NodeStyle[], field: keyof NodeStyle): string | 'mixed' | undefined {
  if (styles.length === 0) return undefined;
  const first = styles[0][field];
  if (first === undefined) return undefined;
  const allSame = styles.every(s => s[field] === first);
  return allSame ? first : 'mixed';
}

export function NodeStylePanel({
  selectedNodeIds,
  nodeStyles,
  nodeShapes,
  nodeLabels,
  onClose,
  onStyleChange,
  onShapeChange,
  onReset,
  hideBorderRadius = false,
  nodeSubgraphIds,
  subgraphs,
  onSubgraphChange,
  onLabelChange,
  presets,
  onPresetApply,
  onDelete,
}: NodeStylePanelProps) {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // 38-06 (SHP-04): the Shape row's trigger + fixed-position picker state.
  const [shapeOpen, setShapeOpen] = useState(false);
  const [shapeAnchor, setShapeAnchor] = useState<ShapePickerAnchor | null>(null);
  const shapeBtnRef = useRef<HTMLButtonElement>(null);

  const BORDER_STYLE_OPTIONS = [
    { value: '', label: t('nodeStyle.solid'), dasharray: '' },
    { value: '5 5', label: t('nodeStyle.dashed'), dasharray: '5 5' },
    { value: '2 2', label: t('nodeStyle.dotted'), dasharray: '2 2' },
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
  const singleNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const [label, setLabel] = useState(singleNodeId ? (nodeLabels.get(singleNodeId) ?? '') : '');

  // Sync label when selection changes
  useEffect(() => {
    if (singleNodeId) {
      setLabel(nodeLabels.get(singleNodeId) ?? '');
    }
  }, [singleNodeId, nodeLabels]);

  const handleStyleChange = useCallback(
    (field: keyof NodeStyle, value: string | undefined) => {
      onStyleChange(selectedNodeIds, { [field]: value });
    },
    [selectedNodeIds, onStyleChange],
  );

  const headerTitle =
    selectedNodeIds.length === 1
      ? (nodeLabels.get(selectedNodeIds[0]) ?? selectedNodeIds[0])
      : t('nodeStyle.nodes', { count: selectedNodeIds.length });

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

  // 38-06 (SHP-04): shared shape across the selection — 'mixed' when the
  // selected nodes disagree (the PropertiesPanel sharedShape idiom).
  const sharedShape: NodeShape | 'mixed' | undefined =
    !nodeShapes || nodeShapes.length === 0
      ? undefined
      : nodeShapes.every(s => s === nodeShapes[0])
        ? nodeShapes[0]
        : 'mixed';
  const shapeLabel = sharedShape === 'mixed'
    ? t('nodeStyle.mixed')
    : sharedShape
      ? t(`visual.shapes.${sharedShape}`)
      : '';

  // Fixed-position anchor recipe (Surface 1, ShapeToolbar): the popover is
  // position:fixed, so no panel ancestor's overflow clipping can bury it.
  const toggleShapePicker = () => {
    if (!shapeOpen && shapeBtnRef.current) {
      const r = shapeBtnRef.current.getBoundingClientRect();
      setShapeAnchor({
        right: window.innerWidth - r.right,
        top: r.bottom + 8,
        maxHeight: window.innerHeight - r.bottom - 24,
      });
    }
    setShapeOpen(v => !v);
  };

  const closeShapePicker = () => {
    setShapeOpen(false);
    setShapeAnchor(null);
  };

  // Helper to format color values for ColorPicker (mixed -> '' with mixed label)
  const colorValue = (v: string | 'mixed' | undefined): string =>
    v === 'mixed' || v === undefined ? '' : v;
  const colorLabel = (label: string, v: string | 'mixed' | undefined): string =>
    v === 'mixed' ? `${label} (${t('nodeStyle.mixed')})` : label;

  // Helper for range/select inputs with mixed state
  const numericValue = (v: string | 'mixed' | undefined, fallback: string): string =>
    v === 'mixed' ? fallback : v ?? fallback;
  const parsePx = (v: string): number => parseInt(v.replace('px', '')) || 0;

  // Escape closes the panel regardless of where focus sits (iter-32 P2:
  // this panel kept an onKeyDown on the non-focusable wrapper div — dead
  // after a touch open, focus stayed on the page — while Edge/Subgraph got
  // the document-level idiom in iter-28; the family fix skipped this
  // sibling). ColorPicker's popover Escape runs in capture phase and stops
  // propagation, so only the topmost layer closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 38-06: the shape picker owns Escape while it is open (topmost layer
      // closes first — ShapePicker's own handler does not stop propagation,
      // so this guard is what keeps one Escape from closing panel + picker).
      if (shapeOpen) {return;}
      if (e.key === 'Escape') {onClose();}
    };
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('keydown', onKey);};
  }, [onClose, shapeOpen]);

  return (
    <>
      <div
        className="style-panel absolute right-0 top-[110px] bottom-0 w-[280px] z-30 flex flex-col animate-slide-in-right rounded-l-xl border-l shadow-xl max-md:w-full max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0 max-md:h-[40dvh] max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-t max-md:border-l-0"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
        }}
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
            {headerTitle}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-[var(--hover)] shrink-0 max-md:min-w-[44px] max-md:min-h-[44px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 node-panel-scroll"
        /* `scrollbar-width` only accepts auto/thin/none — a length is invalid
           CSS that browsers ignore (real width styling is the
           ::-webkit-scrollbar block above). Kept verbatim under a cast
           rather than "fixed" to a valid value, which would change rendering;
           the double cast is required because the value is outside the
           property's declared union by design. */
        style={{
          scrollbarWidth: '12px',
          scrollbarColor: 'rgba(0,0,0,0.3) transparent',
        } as unknown as CSSProperties}
      >
        {/* Label (single node only) */}
        {singleNodeId && onLabelChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('nodeStyle.label')}
            </span>
            <input
              type="text"
              value={label}
              placeholder={t('nodeStyle.labelPlaceholder')}
              onChange={e => { setLabel(e.target.value); onLabelChange(singleNodeId, e.target.value); }}
              className="w-full px-2.5 py-1.5 rounded-md border text-xs"
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* 38-06 (SHP-04): Shape row, grouped with the label row — the same
            unified ShapePicker the visual editor's PropertiesPanel mounts.
            Renders only when the host wires shape-change support
            (onShapeChange + nodeShapes); absent props keep the panel
            byte-compatible for every existing caller. */}
        {onShapeChange && nodeShapes && sharedShape !== undefined && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('nodeStyle.shape')}
            </span>
            <button
              ref={shapeBtnRef}
              type="button"
              data-shape-trigger
              onClick={toggleShapePicker}
              title={t('visual.shapeChangeHint', { shape: shapeLabel })}
              aria-label={t('visual.shapeChangeHint', { shape: shapeLabel })}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              <span className="shrink-0 flex items-center">
                {/* Mixed selection carries the neutral rect preview (the
                    PropertiesPanel trigger precedent). */}
                <ShapePreview shape={sharedShape === 'mixed' ? 'rect' : sharedShape} />
              </span>
              <span className="truncate">{shapeLabel}</span>
              <ChevronDown
                size={11}
                className="ml-auto shrink-0 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </button>
            {shapeOpen && shapeAnchor && (
              <ShapePicker
                anchor={shapeAnchor}
                onClose={closeShapePicker}
                onPick={(shape) => {
                  onShapeChange?.(selectedNodeIds, shape);
                  closeShapePicker();
                }}
                selected={sharedShape === 'mixed' ? null : sharedShape}
                triggerRef={shapeBtnRef}
              />
            )}
          </div>
        )}

        {/* Presets */}
        {presets && presets.length > 0 && (() => {
          // Dark text on the raw theme color (iter-13): every preset family
          // the themes ship is a light/mid tone — #111827 measures 4.5–9:1
          // on all of them, while per-color white failed Danger at 3.76.
          // The chip now shows the EXACT color applied to the node.
          return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Zap size={11} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {t('nodeStyle.presets') || 'Presets'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map(preset => (
              <button
                key={preset.label}
                onClick={() => onPresetApply?.(selectedNodeIds, preset.presetType)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 min-w-0"
                title={preset.label}
                style={{
                  borderColor: preset.color,
                  color: '#111827',
                  /* Pure theme color + dark text (iter-13): the previous
                     veils carried AA white but painted the chip darker than
                     the color actually applied — the chip contradicted its
                     own result. */
                  backgroundColor: preset.color,
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0 border border-black/20" style={{ background: preset.color }} />
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
          </div>
          );
        })()}

        {/* Recommended Section */}
        <ColorPicker
          label={colorLabel(t('nodeStyle.fillColor'), fillColor)}
          value={colorValue(fillColor)}
          onChange={v => handleStyleChange('fill', v || undefined)}
        />
        <ColorPicker
          label={colorLabel(t('nodeStyle.borderColor'), borderColor)}
          value={colorValue(borderColor)}
          onChange={v => handleStyleChange('stroke', v || undefined)}
        />

        {/* Border Width */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('nodeStyle.borderWidth')}
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
              {borderWidth === 'mixed' ? t('nodeStyle.mixed') : borderWidth ?? '1px'}
            </span>
          </div>
        </div>

        {/* Border Style */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('nodeStyle.borderStyle')}
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
                  className="flex-1 py-1.5 rounded-md border text-[11px] font-medium transition-all"
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
          label={colorLabel(t('nodeStyle.textColor'), textColor)}
          value={colorValue(textColor)}
          onChange={v => handleStyleChange('color', v || undefined)}
        />

        {/* Subgraph Dropdown */}
        {selectedNodeIds.length === 1 && nodeSubgraphIds && subgraphs && onSubgraphChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('nodeStyle.subgraph')}
            </span>
            <div className="relative">
              <select
                value={nodeSubgraphIds.get(selectedNodeIds[0]) ?? ''}
                onChange={e => {
                  const val = e.target.value || null;
                  onSubgraphChange(selectedNodeIds[0], val);
                }}
                className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
                style={{
                  background: 'var(--surface-base)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="">{t('nodeStyle.noneRoot')}</option>
                {subgraphs.map(sg => (
                  <option key={sg.id} value={sg.id}>
                    {sg.label || sg.id}
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
        )}

        {/* Advanced Toggle */}
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          className="flex items-center gap-1 py-1 text-xs font-medium uppercase tracking-wider transition-colors"
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
          <div className="flex flex-col gap-4">
            {/* Font Weight */}
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('nodeStyle.fontWeight')}
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
                    <option value="">{t('nodeStyle.mixed')}</option>
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
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('nodeStyle.fontSize')}
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
                      : fontSize ? parsePx(fontSize) : 18
                  }
                  placeholder={fontSize === 'mixed' ? t('nodeStyle.mixed') : ''}
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

            {/* Border Radius X */}
            {!hideBorderRadius && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('nodeStyle.borderRadiusX')}
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
                    {rx === 'mixed' ? t('nodeStyle.mix') : rx ?? '0'}
                  </span>
                </div>
              </div>
            )}

            {/* Border Radius Y */}
            {!hideBorderRadius && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('nodeStyle.borderRadiusY')}
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
                    {ry === 'mixed' ? t('nodeStyle.mix') : ry ?? '0'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset / Delete Buttons — separated (iter-13) AND delete is a
            two-step arm (iter-14 P1: removeNode executed with zero
            confirmation, 8px below Reset, both red-family — a mis-tap at
            momentum-scroll speed destroyed diagram content). Contrast:
            red-600 ink on the tint (3.29 → ≥4.6) and red-600 fill (white
            4.83 vs #ef4444's 3.76). */}
        <div className="mt-auto pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => onReset(selectedNodeIds)}
            className="flex items-center justify-center gap-1.5 w-full min-w-0 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(220,38,38,0.08)',
              color: '#b91c1c',
              border: '1px solid rgba(220,38,38,0.25)',
            }}
          >
            <RotateCcw size={12} className="shrink-0" />
            <span className="truncate">{t('nodeStyle.resetStyles')}</span>
          </button>
          {onDelete && (
            <button
              onClick={e => {
                const btn = e.currentTarget;
                if (btn.dataset.armed) {
                  delete btn.dataset.armed;
                  onDelete?.();
                  return;
                }
                btn.dataset.armed = 'true';
                /* Armed state gets a VISUAL change beyond text (iter-14 P3:
                   the text-only cue was easy to miss — same red background). */
                btn.style.background = '#7f1d1d';
                btn.style.borderColor = '#7f1d1d';
                btn.querySelector('span')!.textContent = t('nodeStyle.confirmDelete');
                setTimeout(() => {
                  if (btn.isConnected && btn.dataset.armed) {
                    delete btn.dataset.armed;
                    btn.style.background = '#dc2626';
                    btn.style.borderColor = '#dc2626';
                    const span = btn.querySelector('span');
                    if (span) {span.textContent = t('nodeStyle.delete');}
                  }
                }, 3000);
              }}
              title={t('nodeStyle.delete')}
              className="flex items-center justify-center gap-1.5 w-full min-w-0 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: '1px solid #dc2626',
              }}
            >
              <Trash2 size={12} className="shrink-0" />
              <span className="truncate">{t('nodeStyle.delete')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
