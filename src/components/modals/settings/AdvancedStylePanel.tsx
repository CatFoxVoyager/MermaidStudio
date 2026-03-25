import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Type, Maximize2, ArrowLeftRight, ArrowUpDown, Spline, Square, RotateCcw, LayoutGrid, X, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_STYLE_OPTIONS, type DiagramStyleOptions, type LayoutEngine, getStylingCapabilities } from '@/types';
import { applyStyleToContent, extractStyleOptionsFromContent } from '@/constants/colorPalettes';
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

const CURVE_OPTIONS: { value: DiagramStyleOptions['curveStyle']; label: string }[] = [
  { value: 'basis', label: 'Smooth' },
  { value: 'linear', label: 'Straight' },
  { value: 'stepBefore', label: 'Step Before' },
  { value: 'stepAfter', label: 'Step After' },
  { value: 'cardinal', label: 'Cardinal' },
  { value: 'catmullRom', label: 'Catmull-Rom' },
];

const LAYOUT_OPTIONS: { value: LayoutEngine; label: string; description: string }[] = [
  { value: 'dagre', label: 'Dagre', description: 'Default hierarchical layout' },
  { value: 'elk', label: 'ELK', description: 'Eclipse Layout Kernel' },
  { value: 'elk.stress', label: 'ELK Stress', description: 'Force-directed stress layout' },
];

// Sequence diagram specific options
const SEQUENCE_CURVE_OPTIONS: { value: 'basis' | 'linear' | 'natural'; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'basis', label: 'Basis' },
  { value: 'linear', label: 'Linear' },
];

const AXIS_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: '%Y-%m-%d', label: 'YYYY-MM-DD' },
  { value: '%Y/%m/%d', label: 'YYYY/MM/DD' },
  { value: '%d-%m-%Y', label: 'DD-MM-YYYY' },
  { value: '%m/%d/%Y', label: 'MM/DD/YYYY' },
  { value: '%W%Y', label: 'Week YYYY' },
  { value: '%Q %Y', label: 'Quarter YYYY' },
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
  const [styleOptions, setStyleOptions] = useState<DiagramStyleOptions>({ ...DEFAULT_STYLE_OPTIONS });
  const [diagramType, setDiagramType] = useState<string>('flowchart');
  const baseContentRef = useRef<string>('');
  const isDark = theme === 'dark';
  const isInitialized = useRef(false);

  const isDefault = JSON.stringify(styleOptions) === JSON.stringify(DEFAULT_STYLE_OPTIONS);

  // Store base content when panel opens and initialize styles from it
  useEffect(() => {
    if (isOpen && !isInitialized.current && currentContent) {
      baseContentRef.current = currentContent;
      const detectedType = detectDiagramType(currentContent);
      setDiagramType(detectedType);

      const existingStyles = extractStyleOptionsFromContent(currentContent);
      if (Object.keys(existingStyles).length > 0) {
        setStyleOptions(prev => ({ ...prev, ...existingStyles }));
      }
      isInitialized.current = true;
    } else if (!isOpen) {
      isInitialized.current = false;
      baseContentRef.current = '';
    }
  }, [isOpen]);

  // Define applyStyles function
  const applyStyles = useCallback((opts: DiagramStyleOptions) => {
    if (!baseContentRef.current) {return;}
    // Always use applyStyleToContent which now preserves existing colors
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

  return (
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <SlidersHorizontal size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Advanced Styling</span>
            <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>Type: {diagramType}</span>
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
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Font Family</span>
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
          label="Font Size"
          icon={<Type size={11} />}
          value={styleOptions.fontSize}
          min={8} max={24} step={1} unit="px"
          onChange={(v) => update({ fontSize: v })}
          theme={theme}
        />

        {!hasConfigOptions && (
          <div className="text-center py-6 px-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              No advanced styling options available for <strong>{diagramType}</strong> diagrams.
              You can still use color palettes and basic font settings.
            </p>
          </div>
        )}

        {/* Flowchart/State/Class/ER/C4 controls */}
        {isFlowchart && (
          <>
            <SliderControl
              label="Node Padding"
              icon={<Maximize2 size={11} />}
              value={styleOptions.nodePadding ?? 15}
              min={0} max={50} step={1} unit="px"
              onChange={(v) => update({ nodePadding: v })}
              theme={theme}
            />

            <SliderControl
              label="Horizontal Spacing"
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.nodeSpacing ?? 50}
              min={10} max={150} step={5} unit="px"
              onChange={(v) => update({ nodeSpacing: v })}
              theme={theme}
            />

            <SliderControl
              label="Vertical Spacing"
              icon={<ArrowUpDown size={11} />}
              value={styleOptions.rankSpacing ?? 50}
              min={10} max={150} step={5} unit="px"
              onChange={(v) => update({ rankSpacing: v })}
              theme={theme}
            />

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Layout Engine</span>
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
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Edge Style</span>
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
              label="Actor Margin"
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.actorMargin ?? 50}
              min={10} max={200} step={5} unit="px"
              onChange={(v) => update({ actorMargin: v })}
              theme={theme}
            />

            <SliderControl
              label="Diagram Margin X"
              icon={<Maximize2 size={11} />}
              value={styleOptions.diagramMarginX ?? 50}
              min={0} max={200} step={5} unit="px"
              onChange={(v) => update({ diagramMarginX: v })}
              theme={theme}
            />

            <SliderControl
              label="Diagram Margin Y"
              icon={<ArrowUpDown size={11} />}
              value={styleOptions.diagramMarginY ?? 10}
              min={0} max={100} step={5} unit="px"
              onChange={(v) => update({ diagramMarginY: v })}
              theme={theme}
            />

            <SliderControl
              label="Actor Width"
              icon={<Maximize2 size={11} />}
              value={styleOptions.actorWidth ?? 150}
              min={50} max={300} step={5} unit="px"
              onChange={(v) => update({ actorWidth: v })}
              theme={theme}
            />

            <SliderControl
              label="Actor Height"
              icon={<Maximize2 size={11} />}
              value={styleOptions.actorHeight ?? 65}
              min={30} max={150} step={5} unit="px"
              onChange={(v) => update({ actorHeight: v })}
              theme={theme}
            />

            <div className="flex items-center justify-between px-3 py-2 rounded-lg border"
              style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Mirror Actors</span>
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
              label="Bar Height"
              icon={<Maximize2 size={11} />}
              value={styleOptions.barHeight ?? 20}
              min={10} max={50} step={1} unit="px"
              onChange={(v) => update({ barHeight: v })}
              theme={theme}
            />

            <SliderControl
              label="Bar Gap"
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.barGap ?? 4}
              min={0} max={20} step={1} unit="px"
              onChange={(v) => update({ barGap: v })}
              theme={theme}
            />

            <SliderControl
              label="Top Padding"
              icon={<ArrowUpDown size={11} />}
              value={styleOptions.topPadding ?? 50}
              min={0} max={100} step={5} unit="px"
              onChange={(v) => update({ topPadding: v })}
              theme={theme}
            />

            <SliderControl
              label="Left Padding"
              icon={<ArrowLeftRight size={11} />}
              value={styleOptions.leftPadding ?? 75}
              min={0} max={200} step={5} unit="px"
              onChange={(v) => update({ leftPadding: v })}
              theme={theme}
            />

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Type size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Axis Format</span>
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
            Reset to Defaults
          </button>
        )}
      </div>
    </div>
  );
}
