import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Type, Maximize2, ArrowLeftRight, ArrowUpDown, Spline, Square, RotateCcw, LayoutGrid, X, SlidersHorizontal, Compass, Waypoints, Rows3, Sparkles, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_STYLE_OPTIONS,
  isElkLayoutEngine,
  supportsElkLayout,
  supportsTidyTreeLayout,
  type DiagramStyleOptions,
  type DiagramDirection,
  type DiagramLook,
  type LayoutEngine,
  type ElkNodePlacementStrategy,
  type ElkNodePlacementAlignment,
  type ElkPreset,
  type DiagramType,
  getStylingCapabilities,
} from '@/types';
import { applyStyleToContent, extractStyleOptionsFromContent } from '@/constants/themeDerivation';
import { ColorPicker } from '@/components/visual/ColorPicker';
import { detectDiagramType } from '@/lib/mermaid/diagramType';

interface AdvancedStylePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onContentChange: (content: string) => void;
  theme: 'dark' | 'light';
}

import { FONT_FAMILY_OPTIONS } from '@/constants/fonts';
import { ensureGoogleFontsForFamily } from '@/utils/fontInjection';
import { EDGE_CURVE_OPTIONS } from '@/components/shared/edgeArrowOptions';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';

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
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-sm"
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
          aria-label={label}
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

  // The 13 mermaid config-union curves (EDGE-04, Surface 4) come from the ONE
  // shared EDGE_CURVE_OPTIONS const (40-02) — no second hand-listed copy —
  // with labels from the 40-01 `advancedStyle.curve*` key table.
  const CURVE_OPTIONS: { value: DiagramStyleOptions['curveStyle']; label: string }[] =
    EDGE_CURVE_OPTIONS.map(opt => ({
      value: opt.value as DiagramStyleOptions['curveStyle'],
      label: t(opt.labelKey),
    }));

  const LAYOUT_OPTIONS: { value: LayoutEngine; label: string; description: string }[] = [
    { value: 'dagre', label: t('advancedStyle.layoutDagre'), description: t('advancedStyle.layoutDagreDesc') },
    { value: 'elk', label: t('advancedStyle.layoutElk'), description: t('advancedStyle.layoutElkDesc') },
    { value: 'elk.stress', label: t('advancedStyle.layoutElkStress'), description: t('advancedStyle.layoutElkStressDesc') },
    { value: 'elk.force', label: t('advancedStyle.layoutElkForce'), description: t('advancedStyle.layoutElkForceDesc') },
    { value: 'elk.mrtree', label: t('advancedStyle.layoutElkMrtree'), description: t('advancedStyle.layoutElkMrtreeDesc') },
    { value: 'elk.sporeOverlap', label: t('advancedStyle.layoutElkSporeOverlap'), description: t('advancedStyle.layoutElkSporeOverlapDesc') },
    { value: 'elk.box', label: t('advancedStyle.layoutElkBox'), description: t('advancedStyle.layoutElkBoxDesc') },
    { value: 'elk.rectpacking', label: t('advancedStyle.layoutElkRectpacking'), description: t('advancedStyle.layoutElkRectpackingDesc') },
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
    { value: '%H:%M', label: 'HH:MM' },
    { value: '%W%Y', label: 'Week YYYY' },
    { value: '%Q %Y', label: 'Quarter YYYY' },
  ];
  // DiagramType (not string): the only writer is detectDiagramType, which
  // returns DiagramType, and getStylingCapabilities takes DiagramType.
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const baseContentRef = useRef<string>('');
  const isDark = theme === 'dark';
  const isInitialized = useRef(false);
  const previousContentRef = useRef<string>('');
  const applyingRef = useRef(false); // Prevents init effect from re-triggering apply loop
  const userHasChangedStyles = useRef(false); // Track if user made any changes
  const onContentChangeRef = useRef(onContentChange);
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  const isDefault = JSON.stringify(styleOptions) === JSON.stringify(DEFAULT_STYLE_OPTIONS);

  // Store base content when panel opens and initialize styles from it
  useEffect(() => {
    if (isOpen && currentContent) {
      // If we are currently applying a style change, just update refs and skip re-extraction
      if (applyingRef.current) {
        applyingRef.current = false;
        previousContentRef.current = currentContent;
        baseContentRef.current = currentContent;
        return;
      }

      // Check if content has changed since last time
      const contentChanged = previousContentRef.current !== currentContent;
      
      if (contentChanged) {
        // Update diagram type if it changed
        const detectedType = detectDiagramType(currentContent);
        if (detectedType !== diagramType) {
          setDiagramType(detectedType);
        }

        const existingStyles = extractStyleOptionsFromContent(currentContent);
        
        // ALWAYS sync our state if the change came from outside (editor or other panel)
        // This ensures the UI reflects manual code edits or Diagram Colors updates instantly
        setStyleOptions(prev => {
          const next = { ...DEFAULT_STYLE_OPTIONS, ...existingStyles };
          // Simple equality check to avoid redundant state updates
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
          return next;
        });
        
        // Reset the flag since we are now in sync with the current content
        userHasChangedStyles.current = false;

        previousContentRef.current = currentContent;
        baseContentRef.current = currentContent;
      }
      
      isInitialized.current = true;
    } else if (!isOpen) {
      isInitialized.current = false;
      baseContentRef.current = '';
      previousContentRef.current = '';
      userHasChangedStyles.current = false;
    }
  }, [isOpen, currentContent, diagramType]);

  // Define applyStyles function
  const applyStyles = useCallback((opts: DiagramStyleOptions) => {
    if (!baseContentRef.current) {return;}
    const isDark = theme === 'dark';
    const newContent = applyStyleToContent(baseContentRef.current, opts, isDark);
    if (newContent === previousContentRef.current) {return;}
    applyingRef.current = true;
    previousContentRef.current = newContent;
    onContentChangeRef.current(newContent);
  }, [theme]);

  // Apply styles in real-time when styleOptions change (but only when panel is open)
  useEffect(() => {
    if (isOpen && isInitialized.current) {
      applyStyles(styleOptions);
    }
  }, [isOpen, styleOptions, applyStyles]);

  const update = useCallback((partial: Partial<DiagramStyleOptions>) => {
    setStyleOptions(prev => {
      return { ...prev, ...partial };
    });
  }, []);

  const handleReset = useCallback(() => {
    const defaults = { ...DEFAULT_STYLE_OPTIONS };
    userHasChangedStyles.current = true; 
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
  const isSwimlane = stylingCapabilities.supportsSwimlaneConfig;
  const canUseElk = supportsElkLayout(diagramType);
  const canUseTidyTree = supportsTidyTreeLayout(diagramType);
  const hasConfigOptions = isFlowchart || isSequence || isGantt || isSwimlane || canUseElk || canUseTidyTree;
  const isElkLayout = isElkLayoutEngine(styleOptions.layoutEngine);
  // diagramType is a DiagramType; detectDiagramType normalizes `graph …`
  // sources to 'flowchart', so no separate 'graph' branch exists.
  const supportsDirection = diagramType === 'flowchart';

  // Use the new capabilities from types
  const supportsStyleKeyword = stylingCapabilities.supportsStyleKeyword;
  const supportsRectBlocks = stylingCapabilities.supportsRectBlocks;
  const isThemeOnly = stylingCapabilities.supportsThemeVariablesOnly;

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
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{t('advancedStyle.type')} {diagramType}</span>
          </div>
        </div>
        <button onClick={handleClose} className="p-1.5 rounded-sm transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Common options for all diagram types */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Type size={11} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.fontFamily')}</span>
          </div>
          <select
            value={styleOptions.fontFamily}
            onChange={(e) => {
              ensureGoogleFontsForFamily(e.target.value);
              update({ fontFamily: e.target.value });
            }}
            className="w-full text-[11px] px-2 py-1.5 rounded-sm border outline-hidden transition-colors"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {FONT_FAMILY_OPTIONS.map(f => (
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

        {/* Visual Look (THM-02): Neo / Classic / Hand-Drawn */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.look')}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'neo' as DiagramLook, label: t('advancedStyle.lookNeo') },
              { value: 'classic' as DiagramLook, label: t('advancedStyle.lookClassic') },
              { value: 'handDrawn' as DiagramLook, label: t('advancedStyle.lookHandDrawn') },
            ]).map(opt => {
              const effectiveLook: DiagramLook = styleOptions.look ?? 'neo';
              const isWardleyBlocked = opt.value === 'handDrawn' && diagramType === 'wardley';
              const active = !isWardleyBlocked && effectiveLook === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isWardleyBlocked}
                  aria-pressed={active}
                  title={isWardleyBlocked ? t('advancedStyle.wardleyHandDrawnUnsupported') : undefined}
                  onClick={() => update({ look: opt.value })}
                  className={`py-1.5 rounded-sm border transition-all text-center ${FOCUS_RING_CLASSES} ${isWardleyBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    background: active
                      ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                      : 'transparent',
                    borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <span className="text-[11px] font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {diagramType === 'wardley' && (
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('advancedStyle.wardleyHandDrawnUnsupported')}
            </p>
          )}
        </div>

        {/* Hand-Drawn options: deterministic seed + Recursive font shortcut */}
        {styleOptions.look === 'handDrawn' && diagramType !== 'wardley' && (
          <div className="space-y-2 px-2.5 py-2 rounded-lg border" style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.handDrawnSeed')}</span>
              <input
                type="number"
                min={0}
                step={1}
                aria-label={t('advancedStyle.handDrawnSeed')}
                value={styleOptions.handDrawnSeed ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    update({ handDrawnSeed: undefined });
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isInteger(n) || n < 0) return;
                  update({ handDrawnSeed: n });
                }}
                className={`w-20 text-xs px-2 py-1 rounded-sm border text-right tabular-nums outline-hidden ${FOCUS_RING_CLASSES}`}
                style={{
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                ensureGoogleFontsForFamily('Recursive, sans-serif');
                update({ fontFamily: 'Recursive, sans-serif' });
              }}
              className={`w-full text-[11px] py-1 px-2 rounded-sm border transition-colors hover:bg-[var(--hover)] ${FOCUS_RING_CLASSES}`}
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent)',
              }}
            >
              {t('advancedStyle.useRecursiveFont')}
            </button>
          </div>
        )}

        {/* Neo Gradients toggle (applies in Neo look) */}
        {(styleOptions.look ?? 'neo') === 'neo' && (
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.useGradient')}</span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={styleOptions.useGradient ?? true}
              onChange={(e) => update({ useGradient: e.target.checked })}
            />
            <div aria-hidden="true"
              className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${(styleOptions.useGradient ?? true) ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${(styleOptions.useGradient ?? true) ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </label>
        )}

        {!hasConfigOptions && (
          <div className="text-center py-6 px-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {isThemeOnly ? (
                <>
                  <strong>{diagramType}</strong> diagrams support styling through <strong>theme variables</strong> only.
                  <br /><br />
                  Use the <strong>Diagram Colors</strong> panel to customize colors, or manually add <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--surface-base)' }}>%%&#123;init: &#123;...&#125;%%&#125;</code> directives to set theme variables.
                  <br /><br />
                  <span style={{ color: 'var(--text-tertiary)' }}>Examples: <code>primaryColor</code>, <code>lineColor</code>, <code>fontSize</code></span>
                </>
              ) : (
                t('advancedStyle.noOptions', { type: diagramType })
              )}
            </p>
          </div>
        )}

        {supportsStyleKeyword && !isFlowchart && (
          <div className="py-3 px-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong>{diagramType}</strong> styling: Use the <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--surface-base)' }}>style</code> keyword for individual elements.
              <br /><br />
              <span style={{ color: 'var(--text-tertiary)' }}>Example:</span>
              <pre className="mt-2 text-[11px] p-2 rounded overflow-x-auto" style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}>
{diagramType === 'stateDiagram' ? `style StateName fill:#6f6,stroke:#0f0,color:#000` : `style ClassName fill:#dbeafe,stroke:#1d4ed8`}
              </pre>
            </p>
          </div>
        )}

        {supportsRectBlocks && (
          <div className="py-3 px-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}>
            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong>{diagramType}</strong> styling: Use <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--surface-base)' }}>rect</code> blocks to highlight sections.
              <br /><br />
              <span style={{ color: 'var(--text-tertiary)' }}>Example:</span>
              <pre className="mt-2 text-[11px] p-2 rounded overflow-x-auto" style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}>
{`rect rgb(59, 130, 246)
    A->>B: Message in highlighted section
end`}
              </pre>
            </div>
          </div>
        )}

        {/* Shared ELK / Dagre layout engine & ELK sub-options (LAY-01/02: all ELK-capable diagram types, never swimlane) */}
        {canUseElk && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.layoutEngine')}</span>
              </div>
              <select
                aria-label={t('advancedStyle.layoutEngine')}
                value={
                  LAYOUT_OPTIONS.some(opt => opt.value === styleOptions.layoutEngine)
                    ? styleOptions.layoutEngine
                    : 'dagre'
                }
                onChange={(e) => update({ layoutEngine: e.target.value as LayoutEngine })}
                className={`w-full text-[11px] px-2 py-1.5 rounded-sm border outline-hidden transition-colors ${FOCUS_RING_CLASSES}`}
                style={{
                  background: 'var(--surface-base)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {LAYOUT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} title={opt.description}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isElkLayout && (
              <div className="space-y-2.5 p-2.5 rounded-lg border"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
                <span className="block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  {t('advancedStyle.elkOptions')}
                </span>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.elkMergeEdges')}</span>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={styleOptions.elkMergeEdges ?? false}
                    onChange={(e) => update({ elkMergeEdges: e.target.checked })}
                  />
                  <div aria-hidden="true"
                    className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${(styleOptions.elkMergeEdges ?? false) ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${(styleOptions.elkMergeEdges ?? false) ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                </label>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.elkPreset')}</span>
                  <select
                    aria-label={t('advancedStyle.elkPreset')}
                    value={styleOptions.elkPreset ?? 'default'}
                    onChange={(e) => update({ elkPreset: e.target.value as ElkPreset })}
                    className={`w-full text-[11px] px-2 py-1 rounded-sm border outline-hidden ${FOCUS_RING_CLASSES}`}
                    style={{
                      background: 'var(--surface-raised)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="default">default</option>
                    <option value="legacy">legacy</option>
                    <option value="modelOrder">modelOrder</option>
                    <option value="depthFirst">depthFirst</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.elkNodePlacementStrategy')}</span>
                  <select
                    aria-label={t('advancedStyle.elkNodePlacementStrategy')}
                    value={styleOptions.elkNodePlacementStrategy ?? 'BRANDES_KOEPF'}
                    onChange={(e) => update({ elkNodePlacementStrategy: e.target.value as ElkNodePlacementStrategy })}
                    className={`w-full text-[11px] px-2 py-1 rounded-sm border outline-hidden ${FOCUS_RING_CLASSES}`}
                    style={{
                      background: 'var(--surface-raised)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="BRANDES_KOEPF">BRANDES_KOEPF</option>
                    <option value="NETWORK_SIMPLEX">NETWORK_SIMPLEX</option>
                    <option value="LINEAR_SEGMENTS">LINEAR_SEGMENTS</option>
                    <option value="SIMPLE">SIMPLE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.elkNodePlacementAlignment')}</span>
                  <select
                    aria-label={t('advancedStyle.elkNodePlacementAlignment')}
                    value={styleOptions.elkNodePlacementAlignment ?? 'BALANCED'}
                    onChange={(e) => update({ elkNodePlacementAlignment: e.target.value as ElkNodePlacementAlignment })}
                    className={`w-full text-[11px] px-2 py-1 rounded-sm border outline-hidden ${FOCUS_RING_CLASSES}`}
                    style={{
                      background: 'var(--surface-raised)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="BALANCED">BALANCED</option>
                    <option value="NONE">NONE</option>
                    <option value="LEFTUP">LEFTUP</option>
                    <option value="LEFTDOWN">LEFTDOWN</option>
                    <option value="RIGHTUP">RIGHTUP</option>
                    <option value="RIGHTDOWN">RIGHTDOWN</option>
                  </select>
                </div>

                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {t('advancedStyle.elkSpacingNote')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mindmap layout picker (LAY-03: COSE-Bilkent vs lazy Tidy Tree) */}
        {canUseTidyTree && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <LayoutGrid size={11} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.mindmapLayout')}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {([
                { value: 'cose-bilkent' as LayoutEngine, label: t('advancedStyle.layoutCoseBilkent') },
                { value: 'tidy-tree' as LayoutEngine, label: t('advancedStyle.layoutTidyTree') },
              ]).map(opt => {
                const active = opt.value === 'tidy-tree'
                  ? styleOptions.layoutEngine === 'tidy-tree'
                  : styleOptions.layoutEngine !== 'tidy-tree';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ layoutEngine: opt.value })}
                    className={`py-1.5 rounded-sm border transition-all text-center ${FOCUS_RING_CLASSES}`}
                    style={{
                      background: active
                        ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                        : 'transparent',
                      borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-[11px] font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Flowchart/State/Class/ER/C4 controls */}
        {isFlowchart && (
          <>
            {supportsDirection && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Compass size={11} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.direction')}</span>
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
                      <span className="text-[11px] font-medium">{opt.label}</span>
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

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Spline size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.edgeStyle', 'Edge Curve Style')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {CURVE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update({ curveStyle: opt.value })}
                    className="text-[11px] py-1.5 rounded-sm border transition-all text-center font-medium"
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

              {/* Step duration (Mermaid 12.3 flowchart.stepDuration in seconds):
                  empty input leaves the option undefined so Mermaid's default
                  applies; positive finite decimals (e.g. 0.5) are accepted. */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.stepDuration')}</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  aria-label={t('advancedStyle.stepDuration')}
                  value={styleOptions.stepDuration ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      update({ stepDuration: undefined });
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n) || n <= 0) return;
                    update({ stepDuration: n });
                  }}
                  className={`w-20 text-xs px-2 py-1.5 rounded-sm border text-right tabular-nums outline-hidden ${FOCUS_RING_CLASSES}`}
                  style={{
                    background: 'var(--surface-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Flowchart step numbers (THM-03: Mermaid 12.3 flowchart.stepNumbers) */}
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.stepNumbers')}</span>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={styleOptions.stepNumbers ?? false}
                  onChange={(e) => update({ stepNumbers: e.target.checked })}
                />
                <div aria-hidden="true"
                  className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${(styleOptions.stepNumbers ?? false) ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${(styleOptions.stepNumbers ?? false) ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </label>

              {/* Markdown auto-wrap (Mermaid root config.markdownAutoWrap,
                  default true; undefined writes no config key until toggled). */}
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.markdownAutoWrap')}</span>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={styleOptions.markdownAutoWrap ?? true}
                  onChange={(e) => update({ markdownAutoWrap: e.target.checked })}
                />
                <div aria-hidden="true"
                  className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${(styleOptions.markdownAutoWrap ?? true) ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${(styleOptions.markdownAutoWrap ?? true) ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </label>
            </div>

            {/* Global Edge Styling */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Spline size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Global Edge Styling</span>
              </div>

              <SliderControl
                label="Edge Stroke Width"
                icon={<Maximize2 size={11} />}
                value={styleOptions.edgeStrokeWidth ?? 2}
                min={1} max={10} step={1} unit="px"
                onChange={(v) => update({ edgeStrokeWidth: v })}
                theme={theme}
              />

              <ColorPicker
                label="Edge Stroke Color"
                value={styleOptions.edgeStrokeColor ?? '#333333'}
                onChange={v => update({ edgeStrokeColor: v })}
              />

              <SliderControl
                label="Edge Opacity"
                icon={<Square size={11} />}
                value={styleOptions.edgeOpacity ?? 1}
                min={0.1} max={1} step={0.1} unit=""
                onChange={(v) => update({ edgeOpacity: v })}
                theme={theme}
              />

              <SliderControl
                label="Edge Font Size"
                icon={<Type size={11} />}
                value={styleOptions.edgeFontSize ?? 14}
                min={8} max={24} step={1} unit="px"
                onChange={(v) => update({ edgeFontSize: v })}
                theme={theme}
              />

              <ColorPicker
                label="Edge Label Color"
                value={styleOptions.edgeLabelColor ?? (isDark ? '#e5e7eb' : '#374151')}
                onChange={v => update({ edgeLabelColor: v })}
              />

              <ColorPicker
                label="Edge Label Background"
                value={styleOptions.edgeLabelBackgroundColor ?? (isDark ? '#1a1f2e' : '#ffffff')}
                onChange={v => update({ edgeLabelBackgroundColor: v })}
              />

              <SliderControl
                label="Edge Label Opacity"
                icon={<Square size={11} />}
                value={styleOptions.edgeLabelOpacity ?? 1}
                min={0} max={1} step={0.1} unit=""
                onChange={(v) => update({ edgeLabelOpacity: v })}
                theme={theme}
              />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Spline size={11} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Line Style</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { value: '', label: 'Solid' },
                    { value: '5 5', label: 'Dashed' },
                    { value: '2 2', label: 'Dotted' }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => update({ edgeDasharray: opt.value })}
                      className="text-[11px] py-1.5 rounded-sm border transition-all text-center font-medium"
                      style={{
                        background: (styleOptions.edgeDasharray || '') === opt.value
                          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                          : 'transparent',
                        borderColor: (styleOptions.edgeDasharray || '') === opt.value
                          ? 'var(--accent)'
                          : 'var(--border-subtle)',
                        color: (styleOptions.edgeDasharray || '') === opt.value
                          ? 'var(--accent)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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

            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer"
              style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.mirrorActors')}</span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={styleOptions.mirrorActors ?? true}
                onChange={(e) => update({ mirrorActors: e.target.checked })}
              />
              <div aria-hidden="true"
                className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${(styleOptions.mirrorActors ?? true) ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${(styleOptions.mirrorActors ?? true) ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </label>
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
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.axisFormat')}</span>
              </div>
              <select
                aria-label={t('advancedStyle.axisFormat')}
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

            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer"
              style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.compactDisplayMode')}</span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={styleOptions.displayMode === 'compact'}
                onChange={(e) => update({ displayMode: e.target.checked ? 'compact' : undefined })}
              />
              <div aria-hidden="true"
                className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${styleOptions.displayMode === 'compact' ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${styleOptions.displayMode === 'compact' ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </label>
          </>
        )}

        {/* Swimlane diagram controls */}
        {isSwimlane && (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Waypoints size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.swimlaneLineHops')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { value: 'arc', label: t('advancedStyle.swimlaneLineHopsArc') },
                  { value: 'gap', label: t('advancedStyle.swimlaneLineHopsGap') },
                  { value: false, label: t('advancedStyle.swimlaneLineHopsOff') },
                ] as const).map(opt => {
                  const active = opt.value === 'arc'
                    ? (styleOptions.lineHops === undefined || styleOptions.lineHops === true || styleOptions.lineHops === 'arc')
                    : styleOptions.lineHops === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ lineHops: opt.value })}
                      className={`py-1.5 rounded-sm border transition-all text-center ${FOCUS_RING_CLASSES}`}
                      style={{
                        background: active
                          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                          : 'transparent',
                        borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="text-[11px] font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Rows3 size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.swimlaneAutoOrder')}</span>
              </div>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={styleOptions.automaticLaneOrdering ?? false}
                onChange={(e) => update({ automaticLaneOrdering: e.target.checked })}
              />
              <div aria-hidden="true"
                className={`relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring-color)] peer-focus-visible:ring-offset-2 ${(styleOptions.automaticLaneOrdering ?? false) ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${(styleOptions.automaticLaneOrdering ?? false) ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </label>
          </>
        )}

        {/* Custom CSS (THM-04: Mermaid root config.themeCSS) */}
        <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5">
            <Code2 size={11} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('advancedStyle.themeCSS')}</span>
          </div>
          <textarea
            aria-label={t('advancedStyle.themeCSS')}
            rows={3}
            spellCheck={false}
            placeholder={t('advancedStyle.themeCSSPlaceholder')}
            value={styleOptions.themeCSS ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              update({ themeCSS: raw.trim().length === 0 ? undefined : raw });
            }}
            className={`w-full font-mono text-[11px] px-2 py-1.5 rounded-sm border outline-hidden resize-y ${FOCUS_RING_CLASSES}`}
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {!isDefault && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[11px] font-medium transition-colors"
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
