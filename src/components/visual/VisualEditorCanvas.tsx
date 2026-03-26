import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle } from 'lucide-react';
import { renderDiagram } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import {
  parseDiagram, updateNodeStyle, updateNodeLabel, updateNodeShape,
  addNode, removeNode, addEdge, generateNodeId, getNodeStyle, addSubgraph,
} from '@/lib/mermaid/codeUtils';
import { ShapeToolbar } from './ShapeToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import type { NodeShape, NodeStyle, VisualNode, VisualEdge, SelectionState, ToolMode } from './types';

interface NodeOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function extractSvgNodes(container: HTMLDivElement): NodeOverlay[] {
  const svg = container.querySelector('svg');
  if (!svg) {return [];}

  const nodeElements = svg.querySelectorAll('g.node, g.nodeLabel');
  const overlays: NodeOverlay[] = [];
  const seen = new Set<string>();

  nodeElements.forEach(el => {
    const idAttr = el.id ?? '';
    const flowchartMatch = idAttr.match(/flowchart-([^-]+)-\d+/);
    const nodeId = flowchartMatch ? flowchartMatch[1] : null;
    if (!nodeId || seen.has(nodeId)) {return;}
    seen.add(nodeId);

    try {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      overlays.push({
        id: nodeId,
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      });
    } catch {
      // skip
    }
  });

  return overlays;
}

interface Props {
  content: string;
  theme: 'dark' | 'light';
  onChange: (content: string) => void;
}

export function VisualEditorCanvas({ content, theme, onChange }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [overlays, setOverlays] = useState<NodeOverlay[]>([]);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeKey: null });
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [connectFirst, setConnectFirst] = useState<string | null>(null);
  const [dragShape, setDragShape] = useState<NodeShape | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const debounceRef = useRef<number>(0);

  const render = useCallback(async () => {
    const id = ++renderIdRef.current;
    setLoading(true);
    const { svg: s, error: e } = await renderDiagram(content, `visual_${id}_${Date.now()}`);
    if (id !== renderIdRef.current) {return;}
    setLoading(false);
    if (e) { setError(e); return; }
    setError(null);
    setSvg(s);
  }, [content]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, 300);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  useEffect(() => {
    if (!svg || !svgContainerRef.current) {return;}
    const container = svgContainerRef.current;
    const timer = setTimeout(() => {
      const nodes = extractSvgNodes(container);
      setOverlays(nodes);
    }, 80);
    return () => clearTimeout(timer);
  }, [svg, zoom]);

  const parsed = parseDiagram(content);

  function getVisualNode(id: string): VisualNode | null {
    const node = parsed.nodes.find(n => n.id === id);
    if (!node) {return null;}
    const overlay = overlays.find(o => o.id === id);
    const style = getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, id);
    return {
      id: node.id,
      label: node.label,
      shape: node.shape,
      style,
      x: overlay?.x ?? 0,
      y: overlay?.y ?? 0,
      width: overlay?.width ?? 80,
      height: overlay?.height ?? 40,
    };
  }

  const selectedNodes: VisualNode[] = selection.nodeIds.flatMap(id => {
    const n = getVisualNode(id);
    return n ? [n] : [];
  });

  const selectedEdge: VisualEdge | null = (() => {
    if (!selection.edgeKey) {return null;}
    const [src, tgt] = selection.edgeKey.split('::');
    const edge = parsed.edges.find(e => e.source === src && e.target === tgt);
    return edge ? { source: edge.source, target: edge.target, arrowType: edge.arrowType, label: edge.label } : null;
  })();

  function handleNodeClick(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    if (toolMode === 'connect') {
      if (!connectFirst) {
        setConnectFirst(nodeId);
        return;
      }
      if (connectFirst !== nodeId) {
        onChange(addEdge(content, connectFirst, nodeId));
      }
      setConnectFirst(null);
      setToolMode('select');
      return;
    }
    if (e.shiftKey) {
      setSelection(s => ({
        nodeIds: s.nodeIds.includes(nodeId) ? s.nodeIds.filter(id => id !== nodeId) : [...s.nodeIds, nodeId],
        edgeKey: null,
      }));
    } else {
      setSelection({ nodeIds: [nodeId], edgeKey: null });
    }
  }

  function handleCanvasClick() {
    if (toolMode === 'connect') {
      setConnectFirst(null);
      return;
    }
    setSelection({ nodeIds: [], edgeKey: null });
  }

  function handleAddShape(shape: NodeShape) {
    const id = generateNodeId(parsed.nodes.map(n => n.id));
    onChange(addNode(content, id, 'New Node', shape));
    setSelection({ nodeIds: [id], edgeKey: null });
  }

  function handleDropOnCanvas(e: React.DragEvent) {
    e.preventDefault();
    if (!dragShape) {return;}
    handleAddShape(dragShape);
    setDragShape(null);
  }

  function handleDeleteSelected() {
    let updated = content;
    selection.nodeIds.forEach(id => { updated = removeNode(updated, id); });
    setSelection({ nodeIds: [], edgeKey: null });
    onChange(updated);
  }

  function handleLabelChange(id: string, label: string) {
    onChange(updateNodeLabel(content, id, label));
  }

  function handleShapeChange(id: string, shape: NodeShape) {
    onChange(updateNodeShape(content, id, shape));
  }

  function handleStyleChange(id: string, style: NodeStyle) {
    onChange(updateNodeStyle(content, id, style));
  }

  function handleArrowChange(source: string, target: string, arrowType: string) {
    const lines = content.split('\n');
    const updated = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.includes(source) && trimmed.includes(target)) {
        const edgeMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*(-->|---|-.->|-\.->|==>|-->>|o--o|<-->)/);
        if (edgeMatch && edgeMatch[1] === source) {
          return line.replace(edgeMatch[2], arrowType);
        }
      }
      return line;
    });
    onChange(updated.join('\n'));
  }

  function handleEdgeLabelChange(source: string, target: string, label: string) {
    const lines = content.split('\n');
    const updated = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed.includes(source) || !trimmed.includes(target)) {return line;}
      const withLabel = label
        ? line.replace(/(-->|---|-.->|-\.->|==>|-->>|o--o|<-->)\s*(?:\|[^|]*\|)?\s*/, `$1|${label}| `)
        : line.replace(/\|[^|]*\|\s*/, '');
      return withLabel;
    });
    onChange(updated.join('\n'));
  }

  function handleDeleteEdge(source: string, target: string) {
    const lines = content.split('\n').filter(line => {
      const t = line.trim();
      return !(t.includes(source) && t.includes(target) && (t.includes('-->') || t.includes('---') || t.includes('==>') || t.includes('-.->') || t.includes('o--o')));
    });
    setSelection({ nodeIds: [], edgeKey: null });
    onChange(lines.join('\n'));
  }

  function handleAddSubgraph() {
    onChange(addSubgraph(content));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.nodeIds.length > 0) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {return;}
        e.preventDefault();
        handleDeleteSelected();
      }
      if (e.key === 'v' || e.key === 'V') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {return;}
        setToolMode('select');
      }
      if (e.key === 'c' || e.key === 'C') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {return;}
        if (e.ctrlKey || e.metaKey) {return;}
        setToolMode('connect');
      }
      if (e.key === 'Escape') {
        setConnectFirst(null);
        setToolMode('select');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ShapeToolbar
        toolMode={toolMode}
        onToolMode={m => { setToolMode(m); setConnectFirst(null); }}
        onAddShape={handleAddShape}
        onDragStart={shape => setDragShape(shape)}
        onDeleteSelected={handleDeleteSelected}
        hasSelection={selection.nodeIds.length > 0}
        onAddSubgraph={handleAddSubgraph}
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative overflow-auto preview-grid"
          onClick={handleCanvasClick}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnCanvas}
          style={{ cursor: toolMode === 'connect' ? 'crosshair' : 'default' }}>

          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg border shadow-xs"
            style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
            {loading && <RefreshCw size={11} className="animate-spin mr-1" style={{ color: 'var(--text-tertiary)' }} />}
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }} title="Zoom out">
              <ZoomOut size={11} />
            </button>
            <span className="text-[10px] w-7 text-center" style={{ color: 'var(--text-secondary)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }} title="Zoom in">
              <ZoomIn size={11} />
            </button>
            <button onClick={() => setZoom(1)}
              className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }} title="Reset zoom">
              <Maximize2 size={11} />
            </button>
          </div>

          {toolMode === 'connect' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{ background: 'var(--accent-dim)', borderColor: 'rgba(var(--accent-rgb),0.3)', color: 'var(--accent)' }}>
              {connectFirst
                ? `Click target node to connect from "${connectFirst}"`
                : 'Click first node to start connection (Esc to cancel)'}
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Parse Error</p>
              <p className="text-xs font-mono max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {error.split('\n')[0]}
              </p>
            </div>
          ) : (
            <div className="min-h-full flex items-center justify-center p-8">
              <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
                <div
                  ref={svgContainerRef}
                  className="mermaid-container"
                  dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }}
                />

                {overlays.map(overlay => {
                  const isSelected = selection.nodeIds.includes(overlay.id);
                  const isConnectSource = overlay.id === connectFirst;
                  return (
                    <div
                      key={overlay.id}
                      onClick={e => handleNodeClick(e, overlay.id)}
                      className={`visual-node-overlay ${isSelected ? 'selected' : ''} ${isConnectSource ? 'connect-source' : ''}`}
                      style={{
                        position: 'absolute',
                        left: overlay.x,
                        top: overlay.y,
                        width: overlay.width,
                        height: overlay.height,
                        cursor: toolMode === 'connect' ? 'crosshair' : 'pointer',
                        zIndex: 10,
                      }}
                      title={overlay.id}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 overflow-hidden transition-all duration-200"
          style={{ width: 220 }}>
          <PropertiesPanel
            selectedNodes={selectedNodes}
            selectedEdge={selectedEdge}
            onLabelChange={handleLabelChange}
            onShapeChange={handleShapeChange}
            onStyleChange={handleStyleChange}
            onArrowChange={handleArrowChange}
            onEdgeLabelChange={handleEdgeLabelChange}
            onDeleteEdge={handleDeleteEdge}
          />
        </div>
      </div>
    </div>
  );
}
