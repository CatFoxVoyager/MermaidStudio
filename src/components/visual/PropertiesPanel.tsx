import { useState, useLayoutEffect, useRef } from 'react';
import { Settings2, ChevronDown, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from './ColorPicker';
// 38-06 (SHP-04): the flat hardcoded-EN 23-option <select> is replaced by the
// unified ShapePicker (SSOT-derived 53 shapes, searchable, categorized). The
// trigger opens it as a FIXED-position popover anchored to the trigger's
// viewport rect — the panel's 220px overflow-hidden container
// (VisualEditorCanvas.tsx:884-885) would clip an absolutely-positioned
// dropdown, but cannot clip a fixed host.
import { ShapePicker } from '@/components/shared/ShapePicker';
import type { ShapePickerAnchor } from '@/components/shared/ShapePicker';
import { ShapePreview } from '@/components/shared/ShapePreview';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import type { NodeShape, NodeStyle, VisualNode, VisualEdge } from './types';

const ARROW_OPTIONS = [
  { value: '-->',   label: 'Arrow (-->)' },
  { value: '---',   label: 'Line (---)' },
  { value: '-.->', label: 'Dotted (-.->) ' },
  { value: '==>',   label: 'Thick (==>)' },
  { value: '-->>',  label: 'Double Arrow (-->>)' },
  { value: 'o--o',  label: 'Circle (o--o)' },
  { value: '<-->',  label: 'Bidirectional (<-->)' },
];

const PRESETS: { label: string; style: NodeStyle; color: string }[] = [
  { label: 'Primary',  style: { fill: '#dbeafe', stroke: '#3b82f6', color: '#1d4ed8' }, color: '#3b82f6' },
  { label: 'Success',  style: { fill: '#dcfce7', stroke: '#22c55e', color: '#15803d' }, color: '#22c55e' },
  { label: 'Warning',  style: { fill: '#fef3c7', stroke: '#f59e0b', color: '#b45309' }, color: '#f59e0b' },
  { label: 'Danger',   style: { fill: '#fee2e2', stroke: '#ef4444', color: '#b91c1c' }, color: '#ef4444' },
  { label: 'Teal',     style: { fill: '#cffafe', stroke: '#06b6d4', color: '#0e7490' }, color: '#06b6d4' },
  { label: 'Dark',     style: { fill: '#1f2937', stroke: '#374151', color: '#f9fafb' }, color: '#374151' },
];

interface NodePanelProps {
  nodes: VisualNode[];
  onLabelChange: (id: string, label: string) => void;
  onShapeChange: (id: string, shape: NodeShape) => void;
  onStyleChange: (id: string, style: NodeStyle) => void;
}

function NodePanel({ nodes, onLabelChange, onShapeChange, onStyleChange }: NodePanelProps) {
  const { t } = useTranslation();
  const single = nodes.length === 1 ? nodes[0] : null;
  const [label, setLabel] = useState(single?.label ?? '');
  const [shapeOpen, setShapeOpen] = useState(false);
  const [shapeAnchor, setShapeAnchor] = useState<ShapePickerAnchor | null>(null);
  const shapeBtnRef = useRef<HTMLButtonElement>(null);

  // Sync label when single node changes
  useLayoutEffect(() => { setLabel(single?.label ?? ''); }, [single?.id, single?.label]);

  function handleStyleField(field: keyof NodeStyle, value: string) {
    nodes.forEach(n => {
      onStyleChange(n.id, { ...n.style, [field]: value });
    });
  }

  const sharedStyle = single?.style ?? {};
  const sharedShape: NodeShape | 'mixed' = nodes.length === 1
    ? nodes[0].shape
    : (nodes.every(n => n.shape === nodes[0].shape) ? nodes[0].shape : 'mixed' as const);
  // 38-06: labels come only from i18n keys — the shape label from the
  // canonical slug key, the multi-select mixed state from nodeStyle.mixed
  // (the "Mixed shapes" hardcoded-EN select option it replaces).
  const shapeLabel = sharedShape === 'mixed' ? t('nodeStyle.mixed') : t(`visual.shapes.${sharedShape}`);

  // Fixed-position anchor recipe (Surface 1, ShapeToolbar): measure the
  // trigger's viewport rect at open time; the popover is position:fixed, so
  // the 220px overflow-hidden panel container cannot clip it.
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

  return (
    <div className="flex flex-col gap-4">
      {single && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Label</span>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={() => { if (label !== single.label) {onLabelChange(single.id, label);} }}
            onKeyDown={e => { if (e.key === 'Enter') {onLabelChange(single.id, label);} }}
            className="w-full px-2.5 py-1.5 rounded-md border text-xs"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Shape</span>
        <button
          ref={shapeBtnRef}
          type="button"
          data-shape-trigger
          onClick={toggleShapePicker}
          title={t('visual.shapeChangeHint', { shape: shapeLabel })}
          aria-label={t('visual.shapeChangeHint', { shape: shapeLabel })}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${FOCUS_RING_CLASSES}`}
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
          <span className="shrink-0 flex items-center">
            {/* Mixed state carries the neutral rect preview (the old
                "Mixed shapes" select-option precedent, carried to the
                trigger). */}
            <ShapePreview shape={sharedShape === 'mixed' ? 'rect' : sharedShape} />
          </span>
          <span className="truncate">{shapeLabel}</span>
          <ChevronDown size={11} className="ml-auto shrink-0 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </button>
        {shapeOpen && shapeAnchor && (
          <ShapePicker
            anchor={shapeAnchor}
            onClose={closeShapePicker}
            onPick={(shape) => {
              // Mixed multi-select: apply the chosen shape to every selected
              // node (the old select's onChange.forEach idiom, unchanged).
              nodes.forEach(n => onShapeChange(n.id, shape));
              closeShapePicker();
            }}
            selected={sharedShape === 'mixed' ? null : sharedShape}
            triggerRef={shapeBtnRef}
          />
        )}
      </div>

      <ColorPicker label="Fill Color" value={sharedStyle.fill ?? ''} onChange={v => handleStyleField('fill', v)} />
      <ColorPicker label="Border Color" value={sharedStyle.stroke ?? ''} onChange={v => handleStyleField('stroke', v)} />
      <ColorPicker label="Text Color" value={sharedStyle.color ?? ''} onChange={v => handleStyleField('color', v)} />

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Border Width
        </span>
        <div className="flex items-center gap-2">
          <input
            type="range" min={1} max={8} step={1}
            value={parseInt(sharedStyle.strokeWidth ?? '1') || 1}
            onChange={e => handleStyleField('strokeWidth', `${e.target.value}px`)}
            className="flex-1 accent-teal-500"
          />
          <span className="text-xs w-8 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
            {sharedStyle.strokeWidth ?? '1px'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Zap size={11} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Presets</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => nodes.forEach(n => onStyleChange(n.id, p.style))}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:scale-105 active:scale-95 min-w-0"
              title={p.label}
              style={{ borderColor: p.color, color: p.label === 'Dark' ? '#ffffff' : p.color, background: p.style.fill }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {single && (
        <div className="pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>ID: {single.id}</span>
        </div>
      )}
    </div>
  );
}

interface EdgePanelProps {
  edge: VisualEdge;
  onArrowChange: (source: string, target: string, arrowType: string) => void;
  onLabelChange: (source: string, target: string, label: string) => void;
  onDeleteEdge: (source: string, target: string) => void;
}

function EdgePanel({ edge, onArrowChange, onLabelChange, onDeleteEdge }: EdgePanelProps) {
  const [label, setLabel] = useState(edge.label);

  // Sync label when edge changes
  useLayoutEffect(() => { setLabel(edge.label); }, [edge.label]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Connection</span>
        <div className="text-xs px-2.5 py-2 rounded-md border font-mono" style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
          {edge.source} → {edge.target}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Arrow Type</span>
        <div className="relative">
          <select
            value={edge.arrowType}
            onChange={e => onArrowChange(edge.source, edge.target, e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md border text-xs appearance-none pr-8"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
            {ARROW_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Label</span>
        <input
          type="text"
          value={label}
          placeholder="Edge label..."
          onChange={e => setLabel(e.target.value)}
          onBlur={() => onLabelChange(edge.source, edge.target, label)}
          onKeyDown={e => { if (e.key === 'Enter') {onLabelChange(edge.source, edge.target, label);} }}
          className="w-full px-2.5 py-1.5 rounded-md border text-xs"
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>

      <button
        onClick={() => onDeleteEdge(edge.source, edge.target)}
        className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
        Delete Connection
      </button>
    </div>
  );
}

interface Props {
  selectedNodes: VisualNode[];
  selectedEdge: VisualEdge | null;
  onLabelChange: (id: string, label: string) => void;
  onShapeChange: (id: string, shape: NodeShape) => void;
  onStyleChange: (id: string, style: NodeStyle) => void;
  onArrowChange: (source: string, target: string, arrowType: string) => void;
  onEdgeLabelChange: (source: string, target: string, label: string) => void;
  onDeleteEdge: (source: string, target: string) => void;
}

export function PropertiesPanel({
  selectedNodes, selectedEdge,
  onLabelChange, onShapeChange, onStyleChange,
  onArrowChange, onEdgeLabelChange, onDeleteEdge,
}: Props) {
  const hasNode = selectedNodes.length > 0;
  const hasEdge = !!selectedEdge;

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--surface-raised)', borderLeft: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <Settings2 size={13} style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          {hasNode
            ? selectedNodes.length === 1 ? 'Node Properties' : `${selectedNodes.length} Nodes`
            : hasEdge ? 'Edge Properties' : 'Properties'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!hasNode && !hasEdge ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 py-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center opacity-30"
              style={{ background: 'var(--surface-floating)' }}>
              <Settings2 size={18} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Click a node to edit its properties, or select a shape from the toolbar to add one.
            </p>
          </div>
        ) : hasNode ? (
          <NodePanel
            nodes={selectedNodes}
            onLabelChange={onLabelChange}
            onShapeChange={onShapeChange}
            onStyleChange={onStyleChange}
          />
        ) : selectedEdge ? (
          <EdgePanel
            edge={selectedEdge}
            onArrowChange={onArrowChange}
            onLabelChange={onEdgeLabelChange}
            onDeleteEdge={onDeleteEdge}
          />
        ) : null}
      </div>
    </div>
  );
}
