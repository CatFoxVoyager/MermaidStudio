import { useState, useCallback, useEffect } from 'react';
import { X, RotateCcw, ChevronDown, Settings2, Trash2, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from '@/components/visual/ColorPicker';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
// 40-02 (EDGE-01, UI-SPEC Surface 1): the ONE shared 16-token picker list —
// this panel and PropertiesPanel's EdgePanel consume the same const (Grey
// Area 9; no per-panel duplicate).
import { EDGE_ARROW_OPTIONS, EDGE_CURVE_OPTIONS, extraArrowOption } from '@/components/shared/edgeArrowOptions';
import type { EdgeStyle, EdgeMetadata, ParsedEdge } from '@/lib/mermaid/codeUtils';

interface EdgeStylePanelProps {
  edge: ParsedEdge;
  edgeIndex: number;
  edgeStyle: EdgeStyle;
  onClose: () => void;
  onArrowChange: (source: string, target: string, arrowType: string) => void;
  onLabelChange: (source: string, target: string, label: string) => void;
  onStyleChange: (edgeIndex: number, style: Partial<EdgeStyle>) => void;
  onReset: (edgeIndex: number) => void;
  /** Callback when the edge is deleted (hides the button if absent) */
  onDelete?: () => void;
  /**
   * 40-01 (EDGE-02 tracer): parsed metadata of the selected edge — the
   * Animate toggle's ONLY read path (components never re-parse code
   * strings; locked 39 derivation rule).
   */
  edgeMeta?: EdgeMetadata | null;
  /**
   * When present, the Animate toggle row renders and clicks route here;
   * absent props keep existing callers byte-identical (39-04 pattern).
   */
  onAnimateChange?: (animate: boolean) => void;
  /**
   * 40-02 (EDGE-03): the remaining inspector-row delegates — absent props
   * hide their rows for existing callers (the 39-04 contract).
   */
  onEdgeMetaChange?: (meta: EdgeMetadata) => void;
  onEdgeIdChange?: (newId: string) => void;
  onEdgeLengthChange?: (token: string, length: number) => void;
  onAnimatePreset?: () => void;
}

export function EdgeStylePanel({
  edge,
  edgeIndex,
  edgeStyle,
  onClose,
  onArrowChange,
  onLabelChange,
  onStyleChange,
  onReset,
  onDelete,
  edgeMeta,
  onAnimateChange,
  onEdgeMetaChange,
  onEdgeIdChange,
  onEdgeLengthChange,
  onAnimatePreset,
}: EdgeStylePanelProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(edge.label);

  // Escape closes the panel regardless of where focus sits (iter-28 P1:
  // the panel-level keydown only fired when focus was inside the panel —
  // after open, focus stayed on the page and Escape was dead 2/2 tries).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose();}
    };
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('keydown', onKey);};
  }, [onClose]);


  const handleLabelChange = useCallback(
    (newLabel: string) => {
      setLabel(newLabel);
      onLabelChange(edge.source, edge.target, newLabel);
    },
    [edge.source, edge.target, onLabelChange],
  );

  const BORDER_STYLE_OPTIONS = [
    { value: '', label: t('edgeStyle.solid'), dasharray: '' },
    { value: '5 5', label: t('edgeStyle.dashed'), dasharray: '5 5' },
    { value: '2 2', label: t('edgeStyle.dotted'), dasharray: '2 2' },
  ] as const;

  const handleArrowChange = useCallback(
    (newType: string) => {
      onArrowChange(edge.source, edge.target, newType);
    },
    [edge.source, edge.target, onArrowChange],
  );

  const handleStyleChange = useCallback(
    (field: keyof EdgeStyle, value: string | undefined) => {
      onStyleChange(edgeIndex, { [field]: value });
    },
    [edgeIndex, onStyleChange],
  );

  // 40-02 (EDGE-03): the motion-row commit delegates — metadata writes
  // compose from the PARSED metadata (never a re-parse of code strings).
  const typedMeta = edgeMeta ?? null;
  const commitStep = (raw: string) => {
    if (!onEdgeMetaChange) {return; }
    if (raw === '') {
      const { step: _drop, ...rest } = typedMeta ?? {};
      onEdgeMetaChange(rest);
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {return; }
    onEdgeMetaChange({ ...(typedMeta ?? {}), step: n });
  };
  const commitCurve = (raw: string) => {
    if (!onEdgeMetaChange) {return; }
    if (raw === '') {
      const { curve: _drop, ...rest } = typedMeta ?? {};
      onEdgeMetaChange(rest);
      return;
    }
    onEdgeMetaChange({ ...(typedMeta ?? {}), curve: raw });
  };
  const commitSpeed = (speed: 'fast' | 'slow') => {
    if (!onEdgeMetaChange) {return; }
    if (typedMeta?.animation === speed) {
      const { animation: _drop, ...rest } = typedMeta;
      onEdgeMetaChange(rest);
      return;
    }
    onEdgeMetaChange({ ...(typedMeta ?? {}), animation: speed });
  };

  // The length row's min attribute follows the selected family's minimum
  // (the circle/cross start tokens are probe-invalid below it).
  const lengthOption = EDGE_ARROW_OPTIONS.find(opt => opt.value === edge.arrowType);
  const minLen = lengthOption?.minimumLength ?? 1;

  const parsePx = (v: string | undefined): number => parseInt(v?.replace('px', '') ?? '') || 0;

  return (
    <div
      className="style-panel absolute top-0 right-0 h-full w-[280px] z-30 flex flex-col animate-slide-in-right rounded-l-xl border-l shadow-xl overflow-hidden max-md:w-full max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0 max-md:h-[40dvh] max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-t max-md:border-l-0"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={e => {
        // Escape parity with the shared Modal (iter-27 P1).
        if (e.key === 'Escape') {onClose();}
      }}
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
            title={`${edge.source} → ${edge.target}`}
          >
            {/* Real node names in the sheet header (iter-28 P1, re-applied
                iter-32: the claimed fix was absent from the tree — "Edge 1"
                is machine numbering the user never wrote; the connection
                line lower in the panel carries the names). */}
            {edge.source} &rarr; {edge.target}
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
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Connection Info */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('edgeStyle.connection')}
          </span>
          <div
            className="text-xs px-2.5 py-2 rounded-md border font-mono"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {/* 40-02 (UI-SPEC Surface 7 item 2): an authored edge id prefixes
                the connection row in mono — `e1 · A → B` — in both panels. */}
            {edge.edgeId ? `${edge.edgeId} · ` : ''}{edge.source} &rarr; {edge.target}
          </div>
        </div>

        {/* Arrow Type */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('edgeStyle.arrowType')}
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
              {EDGE_ARROW_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
              {/* Truthfulness (UI-SPEC Surface 1): an authored combo or the
                  legacy token matches no shared entry — one extra DISABLED
                  option carries the authored token so the select never
                  displays a lie. */}
              {extraArrowOption(edge.arrowType) && (
                <option value={edge.arrowType} disabled>
                  {edge.arrowType}
                </option>
              )}
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
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('edgeStyle.label')}
          </span>
          <input
            type="text"
            value={label}
            placeholder={t('edgeStyle.labelPlaceholder')}
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

        {/* Animate (40-01 EDGE-02 tracer): rendered only when the parent
            wires onAnimateChange — absent props keep existing callers
            byte-identical. On-state derives from parsed edge metadata; the
            click routes through the parent to the updateEdgeMetadata
            mutator (the ExportModal w-9 h-5 pill-switch idiom, 40-UI-SPEC
            Surface 2). */}
        {/* Edge ID (40-02 EDGE-03, Surface 2): single-line mono input; the
            commit routes through updateEdgeId (rename + class-list rewrite).
            Empty = no id — the mutator declines an invalid id so clearing
            never destroys the anchor silently. */}
        {onEdgeIdChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('edgeStyle.edgeId')}
            </span>
            <input
              type="text"
              value={edge.edgeId ?? ''}
              placeholder={t('edgeStyle.edgeIdPlaceholder')}
              onChange={e => onEdgeIdChange(e.target.value)}
              data-edge-id-input
              className="w-full px-2.5 py-1.5 rounded-md border text-xs font-mono"
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Link length (40-02 EDGE-03, Surface 2 / Grey Area 4): the DISPLAYED
            value is the parsed authored length verbatim (authored 5..10 never
            clamped); clamping applies only to NEWLY TYPED input. The min
            attribute follows the family minimum. */}
        {onEdgeLengthChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('edgeStyle.linkLength')}
            </span>
            <input
              type="number"
              min={minLen}
              max={4}
              value={edge.length ?? 1}
              onChange={e => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) {return; }
                onEdgeLengthChange(edge.arrowType, Math.min(4, Math.max(minLen, n)));
              }}
              data-edge-length-input
              className="w-full px-2.5 py-1.5 rounded-md border text-xs font-mono"
              style={{
                background: 'var(--surface-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {onAnimateChange && (
          <div className="flex flex-col gap-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('edgeStyle.animate')}
            </span>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={edgeMeta?.animate ?? false}
                onChange={e => onAnimateChange(e.target.checked)}
                className="peer sr-only"
              />
              <div
                aria-hidden="true"
                className={`relative w-9 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-2 ${edgeMeta?.animate ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${edgeMeta?.animate ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </label>
          </div>
        )}

        {/* Speed (40-02 EDGE-03, Surface 2 / Grey Area 5): independent of the
            Animate toggle — mermaid renders animation: standalone. Active
            segment = accent (Color item 2). */}
        {onEdgeMetaChange && (
          <>
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('edgeStyle.animationSpeed')}
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(['fast', 'slow'] as const).map(speed => {
                  const isActive = typedMeta?.animation === speed;
                  return (
                    <button
                      key={speed}
                      onClick={() => commitSpeed(speed)}
                      data-edge-speed={speed}
                      className={`py-1.5 rounded-md border text-[11px] font-medium transition-all ${FOCUS_RING_CLASSES}`}
                      style={{
                        borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                        background: isActive ? 'var(--accent-dim)' : 'var(--surface-base)',
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {t(speed === 'fast' ? 'edgeStyle.animationFast' : 'edgeStyle.animationSlow')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step (Surface 2): integers only — non-numeric input ignored on
                commit; empty = param omitted. */}
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('edgeStyle.step')}
              </span>
              <input
                type="number"
                min={1}
                value={typedMeta?.step ?? ''}
                onChange={e => commitStep(e.target.value)}
                data-edge-step-input
                className="w-full px-2.5 py-1.5 rounded-md border text-xs font-mono"
                style={{
                  background: 'var(--surface-base)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Curve (Surface 2 / Grey Area 8): leading Default option = param
                omitted, then the 13 mermaid values in config-union order. */}
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('edgeStyle.curve')}
              </span>
              <div className="relative">
                <select
                  value={typedMeta?.curve ?? ''}
                  onChange={e => commitCurve(e.target.value)}
                  data-edge-curve-select
                  className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  <option value="">{t('edgeStyle.curveDefault')}</option>
                  {EDGE_CURVE_OPTIONS.map(cv => (
                    <option key={cv.value} value={cv.value}>{t(cv.labelKey)}</option>
                  ))}
                </select>
                <ChevronDown
                  size={11}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </div>
            </div>

          </>
        )}

        {onAnimatePreset && (
          <button
            onClick={onAnimatePreset}
            title={t('edgeStyle.animatePresetHint')}
            aria-label={t('edgeStyle.animatePresetHint')}
            data-edge-animate-preset
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            <Zap size={11} className="shrink-0" />
            <span className="truncate">{t('edgeStyle.animatePreset')}</span>
          </button>
        )}

        {/* Stroke Color */}
        <ColorPicker
          label={t('edgeStyle.strokeColor')}
          value={edgeStyle.stroke ?? ''}
          onChange={v => handleStyleChange('stroke', v || undefined)}
        />

        {/* Stroke Width */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('edgeStyle.strokeWidth')}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={parsePx(edgeStyle.strokeWidth) || 1.5}
              onChange={e => handleStyleChange('strokeWidth', `${parseFloat(e.target.value).toFixed(1)}px`)}
              className="flex-1 accent-teal-500"
            />
            <span
              className="text-xs w-8 text-right font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {edgeStyle.strokeWidth ?? '1.5px'}
            </span>
          </div>
        </div>

        {/* Stroke Style */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('edgeStyle.strokeStyle')}
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

        {/* Background Color */}
        <ColorPicker
          label={t('edgeStyle.labelBackground') || 'Label Background'}
          value={edgeStyle.fill ?? ''}
          onChange={v => handleStyleChange('fill', v || undefined)}
        />

        {/* Label Text Color */}
        <ColorPicker
          label={t('edgeStyle.labelTextColor') || 'Label Text Color'}
          value={edgeStyle.color ?? ''}
          onChange={v => handleStyleChange('color', v || undefined)}
        />

        {/* Label Font Size */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('edgeStyle.labelFontSize')}
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={8}
              max={48}
              step={1}
              value={parsePx(edgeStyle.fontSize) || 18}
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

        {/* Reset / Delete Buttons — full-width rows, delete BELOW the
            divider (iter-24 P1: single-tap delete adjacent to Reset, both
            red-family, at a scroll extreme — same two-step arming as the
            node panel). */}
        <div className="mt-auto pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => onReset(edgeIndex)}
            className="flex items-center justify-center gap-1.5 w-full min-w-0 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(220,38,38,0.08)',
              color: '#b91c1c',
              border: '1px solid rgba(220,38,38,0.25)',
            }}
          >
            <RotateCcw size={12} className="shrink-0" />
            <span className="truncate">{t('edgeStyle.resetStyle')}</span>
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
                btn.style.background = '#7f1d1d';
                btn.querySelector('span')!.textContent = t('nodeStyle.confirmDelete');
                setTimeout(() => {
                  if (btn.isConnected && btn.dataset.armed) {
                    delete btn.dataset.armed;
                    btn.style.background = '#dc2626';
                    const span = btn.querySelector('span');
                    if (span) {span.textContent = t('edgeStyle.delete');}
                  }
                }, 3000);
              }}
              title={t('edgeStyle.delete')}
              className="flex items-center justify-center gap-1.5 w-full min-w-0 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: '1px solid #dc2626',
              }}
            >
              <Trash2 size={12} className="shrink-0" />
              <span className="truncate">{t('edgeStyle.delete')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
