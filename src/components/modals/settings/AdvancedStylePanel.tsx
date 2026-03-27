import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Type, Maximize2, ArrowLeftRight, ArrowUpDown, Spline, Square, RotateCcw, LayoutGrid, X, SlidersHorizontal, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_STYLE_OPTIONS, type DiagramStyleOptions, type DiagramDirection, type LayoutEngine, getStylingCapabilities } from '@/types';
import { applyStyleToContent, extractStyleOptionsFromContent } from '@/constants/themeDerivation';
import { ColorPicker } from '@/components/visual/ColorPicker';
import { detectDiagramType } from '@/lib/mermaid/core';

interface AdvancedStylePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onContentChange: (content: string) => void;
  theme: 'dark' | 'light';
}

const FONT_OPTIONS = [
  'Inter, system-ui, sans-serif',
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Verdana, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
  'Palatino Linotype, serif',
  'Comic Sans MS, cursive',
  'Impact, sans-serif',
  'Fira Code, monospace',
];

function SliderControl({ label, icon, value, min, max, step, unit, onChange, theme }: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  theme: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-sm"
          style={{
            color: 'var(--text-primary)',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
          }}>
          {value}{unit}
        </span>
      </div>
      <div className="relative h-5 flex items-center" ref={trackRef}>
        <div className="absolute inset-x-0 h-1 rounded-full overflow-hidden"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-75"
            style={{ width: `${pct}%`, background: 'var(--accent)' }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="absolute w-3 h-3 rounded-full border-2 pointer-events-none transition-all duration-75"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: 'var(--surface-raised)',
            borderColor: 'var(--accent)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
      </div>
    </div>
  );
}

export function AdvancedStylePanel({ isOpen, onClose, currentContent, onContentChange, theme }: AdvancedStylePanelProps) {
  const { t } = useTranslation();
  const [styleOptions, setStyleOptions] = useState<DiagramStyleOptions>({ ...DEFAULT_STYLE_OPTIONS });

  const CURVE_OPTIONS: { value: DiagramStyleOptions['curveStyle']; label: string }[] = [
    { value: 'basis', label: t('advancedStyle.curveSmooth') },
    { value: 'linear', label: t('advancedStyle.curveStraight') },
    { value: 'stepBefore', label: t('advancedStyle.curveStepBefore') },
    { value: 'stepAfter', label: t('advancedStyle.curveStepAfter') },
    { value: 'cardinal', label: t('advancedStyle.curveCardinal') },
    { value: 'catmullRom', label: t('advancedStyle.curveCatmullRom') },
  ];

  const LAYOUT_OPTIONS: { value: LayoutEngine; label: string; description: string }[] = [
    { value: 'dagre', label: t('advancedStyle.layoutDagre'), description: t('advancedStyle.layoutDagreDesc') },
    { value: 'elk', label: t('advancedStyle.layoutElk'), description: t('advancedStyle.layoutElkDesc') },
    { value: 'elk.stress', label: t('advancedStyle.layoutElkStress'), description: t('advancedStyle.layoutElkStressDesc') },
  ];

  const DIRECTION_OPTIONS: { value: DiagramDirection; label: string }[] = [
    { value: 'TB', label: t('advancedStyle.dirTopDown') },
    { value: 'BT', label: t('advancedStyle.dirBottomUp') },
    { value: 'LR', label: t('advancedStyle.dirLeftRight') },
    { value: 'RL', label: t('advancedStyle.dirRightLeft') },
  ];

  // Sequence diagram specific options
  const SEQUENCE_CURVE_OPTIONS: { value: 'basis' | 'linear' | 'natural'; label: string }[] = [
    { value: 'natural', label: t('advancedStyle.seqCurveNatural') },
    { value: 'basis', label: t('advancedStyle.seqCurveBasis') },
    { value: 'linear', label: t('advancedStyle.seqCurveLinear') },
  ];

  const AXIS_FORMAT_OPTIONS: { value: string; label: string }[] = [
    { value: '%Y-%m-%d', label: 'YYYY-MM-DD' },
    { value: '%Y/%m/%d', label: 'YYYY/MM/DD' },
    { value: '%d-%m-%Y', label: 'DD-MM-YYYY' },
    { value: '%m/%d/%Y', label: 'MM/DD/YYYY' },
    { value: '%W%Y', label: 'Week YYYY' },
    { value: '%Q %Y', label: 'Quarter YYYY' },
  ];
  const [diagramType, setDiagramType] = useState<string>('flowchart');
  const baseContentRef = useRef<string>('');
  const isDark = theme === 'dark';
  const isInitialized = useRef(false);
  const previousContentRef = useRef<string>('');
  const applyingRef = useRef(false); // Prevents init effect from re-triggering apply loop

  const isDefault = JSON.stringify(styleOptions) === JSON.stringify(DEFAULT_STYLE_OPTIONS);

  // Store base content when panel opens and initialize styles from it
  useEffect(() => {
    if (isOpen && currentContent) {
      // Skip if this content change was caused by our own applyStyles
      if (applyingRef.current) {
        applyingRef.current = false;
        previousContentRef.current = currentContent;
        return;
      }

      // Detect if content has significantly changed (tab switch vs style update)
      const contentChanged = previousContentRef.current !== currentContent;
      const isDifferentTab = contentChanged && !currentContent.includes(baseContentRef.current.slice(0, 100));

      // Re-initialize if first time, panel was closed, or content is significantly different
      if (!isInitialized.current || isDifferentTab) {
        baseContentRef.current = currentContent;
        const detectedType = detectDiagramType(currentContent);
        setDiagramType(detectedType);

        const existingStyles = extractStyleOptionsFromContent(currentContent);
        if (Object.keys(existingStyles).length > 0) {
          setStyleOptions(prev => ({ ...prev, ...existingStyles }));
        }
        isInitialized.current = true;
        previousContentRef.current = currentContent;
      }
    } else if (!isOpen) {
      isInitialized.current = false;
      baseContentRef.current = '';
      previousContentRef.current = '';
    }
  }, [isOpen, currentContent]);

  // Define applyStyles function
  const applyStyles = useCallback((opts: DiagramStyleOptions) => {
    if (!baseContentRef.current) {return;}
    applyingRef.current = true;
    onContentChange(applyStyleToContent(baseContentRef.current, opts));
  }, [onContentChange]);

  // Apply styles in real-time when styleOptions change (but only when panel is open)
  useEffect(() => {
    if (isOpen && isInitialized.current) {
      applyStyles(styleOptions);
    }
  }, [isOpen, styleOptions, applyStyles]);

  const update = useCallback((partial: Partial<DiagramStyleOptions>) => {
    setStyleOptions(prev => ({ ...prev, ...partial }));
  }, []);

  const handleReset = useCallback(() => {
    const defaults = { ...DEFAULT_STYLE_OPTIONS };
    setStyleOptions(defaults);
    applyStyles(defaults);
  }, [applyStyles]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) {return null;}

  const stylingCapabilities = getStylingCapabilities(diagramType);
  const isFlowchart = stylingCapabilities.supportsFlowchartConfig;
  const isSequence = stylingCapabilities.supportsSequenceConfig;
  const isGantt = stylingCapabilities.supportsGanttConfig;
  const hasConfigOptions = isFlowchart || isSequence || isGantt;
  const isElkLayout = styleOptions.layoutEngine === 'elk' || styleOptions.layoutEngine === 'elk.stress';
  const supportsDirection = diagramType === 'flowchart' || diagramType === 'graph';

  return (
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <SlidersHorizontal size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('advancedStyle.title')}</span>
            <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{t('advancedStyle.type')} {diagramType}</span>
          </div>
        </div>
        <button onClick={handleClose} className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Common options for all diagram types */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Type size={11} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.fontFamily')}</span>
          </div>
          <select
            value={styleOptions.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full text-[11px] px-2 py-1.5 rounded-sm border outline-hidden transition-colors"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        <SliderControl
          label={t('advancedStyle.fontSize')}
          icon={<Type size={11} />}
          value={styleOptions.fontSize}
          min={8} max={24} step={1} unit="px"
          onChange={(v) => update({ fontSize: v })}
          theme={theme}
        />

        <ColorPicker
          label={t('advancedStyle.primaryColor')}
          value={styleOptions.primaryColor ?? '#daeaf2'}
          onChange={v => update({ primaryColor: v })}
        />

        {!hasConfigOptions && (
          <div className="text-center py-6 px-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('advancedStyle.noOptions', { type: diagramType })}
            </p>
          </div>
        )}

        {/* Flowchart/State/Class/ER/C4 controls */}
        {isFlowchart && (
          <>
            {supportsDirection && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Compass size={11} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.direction')}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {DIRECTION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => update({ direction: opt.value })}
                      className="py-1.5 rounded-sm border transition-all text-center"
                      style={{
                        background: styleOptions.direction === opt.value
                          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                          : 'transparent',
                        borderColor: styleOptions.direction === opt.value
                          ? 'var(--accent)'
                          : 'var(--border-subtle)',
                        color: styleOptions.direction === opt.value
                          ? 'var(--accent)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      <span className="text-[9px] font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SliderControl
              label={t('advancedStyle.nodePadding')}
              icon={<Maximize2 size={11} />}
              value={styleOptions.nodePadding ?? 15}
              min={0} max={50} step={1} unit="px"
              onChange={(v) => update({ nodePadding: v })}
              theme={theme}
            />

            {!isElkLayout && (
              <>
                <SliderControl
                  label={t('advancedStyle.horizontalSpacing')}
                  icon={<ArrowLeftRight size={11} />}
                  value={styleOptions.nodeSpacing ?? 50}
                  min={10} max={150} step={5} unit="px"
                  onChange={(v) => update({ nodeSpacing: v })}
                  theme={theme}
                />

                <SliderControl
                  label={t('advancedStyle.verticalSpacing')}
                  icon={<ArrowUpDown size={11} />}
                  value={styleOptions.rankSpacing ?? 50}
                  min={10} max={150} step={5} unit="px"
                  onChange={(v) => update({ rankSpacing: v })}
                  theme={theme}
                />
              </>
            )}

            {isElkLayout && (
              <div className="px-3 py-2 rounded-lg border"
                style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
                <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {t('advancedStyle.elkSpacingNote')}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.layoutEngine')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {LAYOUT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update({ layoutEngine: opt.value })}
                    className="py-1.5 rounded-sm border transition-all text-center"
                    style={{
                      background: styleOptions.layoutEngine === opt.value
                        ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                        : 'transparent',
                      borderColor: styleOptions.layoutEngine === opt.value
                        ? 'var(--accent)'
                        : 'var(--border-subtle)',
                      color: styleOptions.layoutEngine === opt.value
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                    }}
                    title={opt.description}
                  >
                    <span className="text-[9px] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Spline size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.edgeStyle')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {CURVE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update({ curveStyle: opt.value })}
                    className="text-[9px] py-1.5 rounded-sm border transition-all text-center font-medium"
                    style={{
                      background: styleOptions.curveStyle === opt.value
                        ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                        : 'transparent',
                      borderColor: styleOptions.curveStyle === opt.value
                        ? 'var(--accent)'
                        : 'var(--border-subtle)',
                      color: styleOptions.curveStyle === opt.value
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sequence diagram controls */}
        {isSequence && (
          <>
            <SliderControl
              label={t('advancedStyle.actorMargin')}
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.actorMargin ?? 50}
              min={10} max={200} step={5} unit="px"
              onChange={(v) => update({ actorMargin: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.diagramMarginX')}
              icon={<Maximize2 size={11} />}
              value={styleOptions.diagramMarginX ?? 50}
              min={0} max={200} step={5} unit="px"
              onChange={(v) => update({ diagramMarginX: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.diagramMarginY')}
              icon={<ArrowUpDown size={11} />}
              value={styleOptions.diagramMarginY ?? 10}
              min={0} max={100} step={5} unit="px"
              onChange={(v) => update({ diagramMarginY: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.actorWidth')}
              icon={<Maximize2 size={11} />}
              value={styleOptions.actorWidth ?? 150}
              min={50} max={300} step={5} unit="px"
              onChange={(v) => update({ actorWidth: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.actorHeight')}
              icon={<Maximize2 size={11} />}
              value={styleOptions.actorHeight ?? 65}
              min={30} max={150} step={5} unit="px"
              onChange={(v) => update({ actorHeight: v })}
              theme={theme}
            />

            <div className="flex items-center justify-between px-3 py-2 rounded-lg border"
              style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.mirrorActors')}</span>
              <button
                onClick={() => update({ mirrorActors: !(styleOptions.mirrorActors ?? false) })}
                className={`w-8 h-4 rounded-full transition-colors relative`}
                style={{
                  background: (styleOptions.mirrorActors ?? false) ? 'var(--accent)' : 'var(--border-subtle)',
                }}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                  style={{
                    transform: (styleOptions.mirrorActors ?? false) ? 'translateX(16px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>
          </>
        )}

        {/* Gantt chart controls */}
        {isGantt && (
          <>
            <SliderControl
              label={t('advancedStyle.barHeight')}
              icon={<Maximize2 size={11} />}
              value={styleOptions.barHeight ?? 20}
              min={10} max={50} step={1} unit="px"
              onChange={(v) => update({ barHeight: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.barGap')}
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.barGap ?? 4}
              min={0} max={20} step={1} unit="px"
              onChange={(v) => update({ barGap: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.topPadding')}
              icon={<ArrowUpDown size={11} />}
              value={styleOptions.topPadding ?? 50}
              min={0} max={100} step={5} unit="px"
              onChange={(v) => update({ topPadding: v })}
              theme={theme}
            />

            <SliderControl
              label={t('advancedStyle.leftPadding')}
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.leftPadding ?? 75}
              min={0} max={200} step={5} unit="px"
              onChange={(v) => update({ leftPadding: v })}
              theme={theme}
            />

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Type size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.axisFormat')}</span>
              </div>
              <select
                value={styleOptions.axisFormat ?? '%Y-%m-%d'}
                onChange={(e) => update({ axisFormat: e.target.value })}
                className="w-full text-[11px] px-2 py-1.5 rounded-sm border outline-hidden transition-colors"
                style={{
                  background: 'var(--surface-base)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {AXIS_FORMAT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {!isDefault && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-medium transition-colors"
            style={{
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
              color: isDark ? '#f87171' : '#dc2626',
              background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)';
            }}
          >
            <RotateCcw size={10} />
            {t('advancedStyle.resetToDefaults')}
          </button>
        )}
      </div>
    </div>
  );
}
