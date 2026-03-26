import { MousePointer2, Link, Trash2, Group } from 'lucide-react';
import type { NodeShape, ToolMode } from './types';

interface ShapeButtonProps {
  shape: NodeShape;
  label: string;
  onDragStart: (shape: NodeShape) => void;
  onClick: (shape: NodeShape) => void;
}

function ShapePreview({ shape }: { shape: NodeShape }) {
  const props = { stroke: 'currentColor', strokeWidth: 1.5, fill: 'none' };
  switch (shape) {
    case 'rect':          return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /></svg>;
    case 'round':         return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="7" {...props} /></svg>;
    case 'stadium':       return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="7" {...props} /><line x1="9" y1="3" x2="9" y2="17" {...props} /><line x1="19" y1="3" x2="19" y2="17" {...props} /></svg>;
    case 'subroutine':    return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /><line x1="6" y1="3" x2="6" y2="17" {...props} /><line x1="22" y1="3" x2="22" y2="17" {...props} /></svg>;
    case 'cylinder':      return <svg width="28" height="20" viewBox="0 0 28 20"><ellipse cx="14" cy="6" rx="10" ry="3" {...props} /><ellipse cx="14" cy="14" rx="10" ry="3" {...props} /><line x1="4" y1="6" x2="4" y2="14" {...props} /><line x1="24" y1="6" x2="24" y2="14" {...props} /></svg>;
    case 'circle':        return <svg width="28" height="20" viewBox="0 0 28 20"><circle cx="14" cy="10" r="8" {...props} /></svg>;
    case 'rhombus':       return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="14,2 26,10 14,18 2,10" {...props} /></svg>;
    case 'hexagon':       return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="8,3 20,3 26,10 20,17 8,17 2,10" {...props} /></svg>;
    case 'asymmetric':    return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="2,3 22,3 26,10 22,17 2,17" {...props} /></svg>;
    case 'parallelogram': return <svg width="28" height="20" viewBox="0 0 28 20"><polygon points="6,3 26,3 22,17 2,17" {...props} /></svg>;
    default:              return <svg width="28" height="20" viewBox="0 0 28 20"><rect x="2" y="3" width="24" height="14" rx="2" {...props} /></svg>;
  }
}

function ShapeButton({ shape, label, onDragStart, onClick }: ShapeButtonProps) {
  return (
    <button
      draggable
      onDragStart={() => onDragStart(shape)}
      onClick={() => onClick(shape)}
      title={`Add ${label} (click or drag to canvas)`}
      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', minWidth: 52 }}>
      <ShapePreview shape={shape} />
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}

const SHAPES: { shape: NodeShape; label: string }[] = [
  { shape: 'rect',          label: 'Box' },
  { shape: 'round',         label: 'Round' },
  { shape: 'stadium',       label: 'Stadium' },
  { shape: 'rhombus',       label: 'Diamond' },
  { shape: 'circle',        label: 'Circle' },
  { shape: 'hexagon',       label: 'Hexagon' },
  { shape: 'cylinder',      label: 'Cylinder' },
  { shape: 'parallelogram', label: 'Slant' },
  { shape: 'subroutine',    label: 'Subroutine' },
  { shape: 'asymmetric',    label: 'Flag' },
];

interface Props {
  toolMode: ToolMode;
  onToolMode: (m: ToolMode) => void;
  onAddShape: (shape: NodeShape) => void;
  onDragStart: (shape: NodeShape) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onAddSubgraph?: () => void;
}

export function ShapeToolbar({ toolMode, onToolMode, onAddShape, onDragStart, onDeleteSelected, hasSelection, onAddSubgraph }: Props) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 shrink-0 border-b overflow-x-auto"
      style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-1 shrink-0 mr-2">
        <button
          onClick={() => onToolMode('select')}
          title="Select tool (V)"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: toolMode === 'select' ? 'var(--accent-dim)' : 'transparent',
            color: toolMode === 'select' ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${toolMode === 'select' ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border-subtle)'}`,
          }}>
          <MousePointer2 size={12} />
          <span>Select</span>
        </button>
        <button
          onClick={() => onToolMode('connect')}
          title="Connect tool (C) - click two nodes to connect"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: toolMode === 'connect' ? 'var(--accent-dim)' : 'transparent',
            color: toolMode === 'connect' ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${toolMode === 'connect' ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border-subtle)'}`,
          }}>
          <Link size={12} />
          <span>Connect</span>
        </button>
      </div>

      <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />

      <span className="text-[10px] font-medium shrink-0 mr-1" style={{ color: 'var(--text-tertiary)' }}>SHAPES</span>

      <div className="flex items-center gap-1 shrink-0">
        {SHAPES.map(({ shape, label }) => (
          <ShapeButton key={shape} shape={shape} label={label} onDragStart={onDragStart} onClick={onAddShape} />
        ))}
      </div>

      {onAddSubgraph && (
        <>
          <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={onAddSubgraph}
            title="Add subgraph"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}>
            <Group size={12} />
            <span>Subgraph</span>
          </button>
        </>
      )}

      {hasSelection && (
        <>
          <div className="w-px h-8 shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={onDeleteSelected}
            title="Delete selected node(s) (Del)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Trash2 size={12} />
            Delete
          </button>
        </>
      )}
    </div>
  );
}
