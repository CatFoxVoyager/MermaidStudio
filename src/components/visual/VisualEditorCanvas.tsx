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
  themeId?: string;
  onChange: (content: string) => void;
}

export function VisualEditorCanvas({ content, theme, themeId, onChange }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [overlays, setOverlays] = useState<NodeOverlay[]>([]);
  // Bumped whenever the SVG container becomes visible or changes size, so the
  // overlay-positioning effect re-runs even when the canvas was hidden (e.g.
  // display:none) at mount time — see the container-observer effect below.
  const [visibilityTick, setVisibilityTick] = useState(0);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeKey: null });
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [connectFirst, setConnectFirst] = useState<string | null>(null);
  const [dragShape, setDragShape] = useState<NodeShape | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const debounceRef = useRef<number>(0);
  const capturedPointerIdsRef = useRef<Set<number>>(new Set());
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchPrevDistanceRef = useRef<number | null>(null);

  const render = useCallback(async () => {
    const id = ++renderIdRef.current;
    setLoading(true);
    const { svg: s, error: e } = await renderDiagram(content, `visual_${id}_${Date.now()}`, themeId);
    if (id !== renderIdRef.current) {return;}
    setLoading(false);
    if (e) { setError(e); return; }
    setError(null);
    setSvg(s);
  }, [content, themeId]);

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
  }, [svg, zoom, visibilityTick]);

  // Observe the SVG container for visibility/size changes. When the canvas is
  // mounted inside a hidden (display:none) pane — as MobileWorkspace does for
  // inactive tabs — getBoundingClientRect() returns 0×0 and overlays end up
  // empty. This re-bumps visibilityTick when the pane becomes visible (or
  // resizes), forcing the overlay-positioning effect above to recompute.
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) {return;}

    if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') {
      // jsdom / unsupported environment — skip silently.
      return;
    }

    const intersection = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
            setVisibilityTick(t => t + 1);
          }
        }
      },
      { threshold: 0 },
    );
    intersection.observe(container);

    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setVisibilityTick(t => t + 1);
        }
      }
    });
    resize.observe(container);

    return () => {
      intersection.disconnect();
      resize.disconnect();
    };
  }, [svg]);

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

  function handleNodePointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();

    // Capture pointer for reliable gesture tracking
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    capturedPointerIdsRef.current.add(e.pointerId);

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

    // Start long-press timer for touch multi-select (500ms)
    if (e.pointerType === 'touch') {
      const timer = setTimeout(() => {
        setSelection(s => ({
          nodeIds: s.nodeIds.includes(nodeId) ? s.nodeIds.filter(id => id !== nodeId) : [...s.nodeIds, nodeId],
          edgeKey: null,
        }));
      }, 500);
      setLongPressTimer(timer);
    }

    // Handle multi-select on Shift key (mouse) or immediate select for non-touch
    if (e.shiftKey && e.pointerType === 'mouse') {
      setSelection(s => ({
        nodeIds: s.nodeIds.includes(nodeId) ? s.nodeIds.filter(id => id !== nodeId) : [...s.nodeIds, nodeId],
        edgeKey: null,
      }));
    } else if (e.pointerType === 'mouse') {
      setSelection({ nodeIds: [nodeId], edgeKey: null });
    }
    // For touch, wait to see if it becomes a long-press (multi-select) or tap (single-select)
  }

  function handleNodePointerUp(e: React.PointerEvent, nodeId: string) {
    const target = e.currentTarget as HTMLElement;

    // Release pointer capture
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }

    // Clear long-press timer if still active (means it was a tap, not long-press)
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);

      // For touch, if timer was cleared it means it was a short tap - single select
      if (e.pointerType === 'touch') {
        setSelection({ nodeIds: [nodeId], edgeKey: null });
      }
    }
  }

  function handleCanvasPointerDown(e: React.PointerEvent) {
    // Capture pointer for reliable gesture tracking
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    capturedPointerIdsRef.current.add(e.pointerId);

    // Record pointer for pinch detection
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // If we now have 2 pointers, initialize pinch gesture
    if (activePointersRef.current.size === 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchPrevDistanceRef.current = distance;

      // Skip normal canvas behavior when pinch starts
      return;
    }

    // Normal single-pointer behavior
    if (toolMode === 'connect') {
      setConnectFirst(null);
      return;
    }
    setSelection({ nodeIds: [], edgeKey: null });
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    // Only process moves for tracked pointers
    if (!activePointersRef.current.has(e.pointerId)) return;

    // Update pointer position
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle pinch-zoom when exactly 2 pointers are active
    if (activePointersRef.current.size === 2 && pinchPrevDistanceRef.current !== null) {
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      // Calculate zoom delta from distance change
      const zoomDelta = currentDistance / pinchPrevDistanceRef.current;

      // Apply zoom with existing clamp (0.25..3)
      setZoom(z => Math.max(0.25, Math.min(3, z * zoomDelta)));

      // Update previous distance for next frame
      pinchPrevDistanceRef.current = currentDistance;

      // Prevent default during active pinch (avoid browser zoom competition)
      e.preventDefault();
    }
  }

  function handleCanvasPointerUp(e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;

    // Release pointer capture
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }

    // Remove pointer from active tracking
    activePointersRef.current.delete(e.pointerId);

    // Reset pinch state when we drop below 2 pointers
    if (activePointersRef.current.size < 2) {
      pinchPrevDistanceRef.current = null;
    }
  }

  function handleCanvasPointerCancel(e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;

    // Release pointer capture on cancel
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }

    // Remove pointer from active tracking
    activePointersRef.current.delete(e.pointerId);

    // Reset pinch state when we drop below 2 pointers
    if (activePointersRef.current.size < 2) {
      pinchPrevDistanceRef.current = null;
    }
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
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnCanvas}
          style={{ cursor: toolMode === 'connect' ? 'crosshair' : 'default', touchAction: 'none' }}>

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
                      onPointerDown={e => handleNodePointerDown(e, overlay.id)}
                      onPointerUp={e => handleNodePointerUp(e, overlay.id)}
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
