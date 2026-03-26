import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Copy, Check, Download, Move } from 'lucide-react';
import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import { parseDiagram, getNodeStyle, removeNodeStyles, parseFrontmatter, updateLinkStyle, removeLinkStyles, updateEdgeArrowType, updateEdgeLabel, parseLinkStyles, edgeStyleToString, addNode, generateNodeId, removeNode } from '@/lib/mermaid/codeUtils';
import type { NodeStyle, EdgeStyle, ParsedEdge, NodeShape } from '@/lib/mermaid/codeUtils';
import { NodeStylePanel } from './NodeStylePanel';
import { EdgeStylePanel } from './EdgeStylePanel';
import { ShapeToolbar } from '../visual/ShapeToolbar';
import { getStylingCapabilities } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  flowchart: 'Flowchart', sequence: 'Sequence', classDiagram: 'Class',
  stateDiagram: 'State', erDiagram: 'ER', gantt: 'Gantt',
  pie: 'Pie', mindmap: 'Mindmap', gitGraph: 'Git Graph', unknown: 'Diagram',
};

interface NodeOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function extractSvgNodes(outerContainer: HTMLDivElement, shadowHost: HTMLDivElement): NodeOverlay[] {
  // Find SVG in Shadow DOM
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return [];

  const svg = shadowRoot.querySelector('svg');
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
      const containerRect = outerContainer.getBoundingClientRect();
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

function addEdgeClickTargets(
  shadowHost: HTMLDivElement,
  containerEl: HTMLDivElement,
  onEdgeClick: (index: number) => void,
): () => void {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return () => {};

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return () => {};

  const edgePaths = svg.querySelectorAll('.edgePaths path.flowchart-link');
  if (edgePaths.length === 0) return () => {};

  // Create an overlay SVG in the main DOM (above node overlays which have z-index: 5)
  const svgRect = svg.getBoundingClientRect();
  const containerRect = containerEl.getBoundingClientRect();
  const viewBox = svg.getAttribute('viewBox');

  const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.setAttribute('data-edge-overlay', 'true');
  overlaySvg.style.position = 'absolute';
  overlaySvg.style.left = `${svgRect.left - containerRect.left}px`;
  overlaySvg.style.top = `${svgRect.top - containerRect.top}px`;
  overlaySvg.style.width = `${svgRect.width}px`;
  overlaySvg.style.height = `${svgRect.height}px`;
  overlaySvg.style.zIndex = '10';
  overlaySvg.style.pointerEvents = 'none';
  overlaySvg.style.overflow = 'visible';
  if (viewBox) {
    overlaySvg.setAttribute('viewBox', viewBox);
  }

  edgePaths.forEach((path, index) => {
    const d = path.getAttribute('d');
    if (!d) return;

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '15');
    hitPath.setAttribute('fill', 'none');
    hitPath.style.pointerEvents = 'stroke';
    hitPath.style.cursor = 'pointer';

    hitPath.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onEdgeClick(index);
    });

    overlaySvg.appendChild(hitPath);
  });

  containerEl.appendChild(overlaySvg);
  return () => overlaySvg.remove();
}

function highlightSelectedEdge(shadowHost: HTMLDivElement, edgeIndex: number | null) {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return;

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return;

  const edgePaths = svg.querySelectorAll('.edgePaths path.flowchart-link');
  edgePaths.forEach((path, index) => {
    if (index === edgeIndex) {
      (path as SVGPathElement).setAttribute('data-selected-edge', 'true');
      (path as SVGPathElement).style.filter = 'drop-shadow(0 0 4px var(--accent))';
    } else {
      (path as SVGPathElement).removeAttribute('data-selected-edge');
      (path as SVGPathElement).style.filter = '';
    }
  });
}

interface Props {
  content: string;
  theme: 'dark' | 'light';
  onChange?: (content: string) => void;
  onExport?: () => void;
  onRenderTime?: (ms: number) => void;
  onFullscreen?: () => void;
  onNodeSelect?: (nodeId: string) => void;
}

export function PreviewPanel({ content, theme, onChange, onExport, onRenderTime, onFullscreen, onNodeSelect }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [nodeOverlays, setNodeOverlays] = useState<Array<NodeOverlay>>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [panelStyles, setPanelStyles] = useState<Map<string, NodeStyle>>(new Map());
  const [panelLabels, setPanelLabels] = useState<Map<string, string>>(new Map());
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const [parsedEdges, setParsedEdges] = useState<ParsedEdge[]>([]);
  const [parsedLinkStyles, setParsedLinkStyles] = useState<Map<number, EdgeStyle>>(new Map());
  const [toolMode, setToolMode] = useState<'select' | 'connect'>('select');
  const [dragShape, setDragShape] = useState<NodeShape | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgNaturalSizeRef = useRef({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const renderIdRef = useRef(0);
  const debounceRef = useRef<number>(0);
  const skipResyncRef = useRef(false);
  const edgeCleanupRef = useRef<(() => void) | null>(null);
  const relativeContainerRef = useRef<HTMLDivElement>(null);

  const type = detectDiagramType(content);
  const stylingCapabilities = getStylingCapabilities(type);
  const supportsClassDef = stylingCapabilities.supportsClassDef;

  // Keep zoomRef in sync with zoom state
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const render = useCallback(async () => {
    const id = ++renderIdRef.current;
    setLoading(true);
    const start = performance.now();

    try {
      const { svg: s, error: e } = await renderDiagram(content, `preview_${id}_${Date.now()}`);

      // Check if this render is still the latest one
      if (id !== renderIdRef.current) {return;}

      const elapsed = Math.round(performance.now() - start);
      onRenderTime?.(elapsed);

      if (e) {
        setError(e);
      } else {
        // Add data-rendered attribute to SVG for E2E tests
        // Simply replace the first <svg occurrence
        const svgWithAttr = s.replace('<svg', '<svg data-rendered="true"');
        setSvg(svgWithAttr);
        setError(null);
      }
    } finally {
      // Always clear loading state, even if render was cancelled
      if (id === renderIdRef.current) {
        setLoading(false);
      }
    }
  }, [content, onRenderTime]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, 400);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  // Setup Shadow DOM for SVG isolation
  useEffect(() => {
    if (!shadowHostRef.current || !svg) return;

    // Clean up previous shadow root
    if (shadowHostRef.current.shadowRoot) {
      shadowHostRef.current.shadowRoot.innerHTML = '';
    }

    // Create shadow root only if it doesn't exist
    if (!shadowHostRef.current.shadowRoot) {
      shadowHostRef.current.attachShadow({ mode: 'open' });
    }

    const shadowRoot = shadowHostRef.current.shadowRoot;
    if (!shadowRoot) return;

    // Extract theme variables from content and define them in Shadow DOM
    let shadowCSS = ':host { all: initial; }\n';
    let fontFamily = '';
    let fontSize = '';

    try {
      const { frontmatter } = parseFrontmatter(content);
      const config = frontmatter.config as Record<string, any>;
      const themeVars = config?.themeVariables as Record<string, string> | undefined;

      // Extract font settings for direct CSS application
      if (themeVars) {
        fontFamily = themeVars.fontFamily || '';
        fontSize = themeVars.fontSize || '';

        // Map Mermaid theme variables to CSS variables
        const cssVars: string[] = [];
        for (const [key, value] of Object.entries(themeVars)) {
          if (typeof value === 'string') {
            cssVars.push(`  --${key}: ${value};`);
          }
        }
        if (cssVars.length > 0) {
          shadowCSS += '.mermaid {\n' + cssVars.join('\n') + '\n}\n';
        }
      }
    } catch {
      // If parsing fails, use defaults
    }

    // Add font styles to Shadow DOM - these need to be applied directly
    if (fontFamily || fontSize) {
      shadowCSS += '\n/* Font styles */\n';
      shadowCSS += '.mermaid, .mermaid * {\n';
      if (fontFamily) shadowCSS += `  font-family: ${fontFamily};\n`;
      if (fontSize) shadowCSS += `  font-size: ${fontSize};\n`;
      shadowCSS += '}\n';
    }

    // Create style element with theme variables
    const styleEl = document.createElement('style');
    styleEl.textContent = shadowCSS;
    shadowRoot.appendChild(styleEl);

    // Create container for SVG
    const svgContainer = document.createElement('div');
    svgContainer.className = 'mermaid';
    svgContainer.innerHTML = sanitizeSVG(svg);
    shadowRoot.appendChild(svgContainer);

    // Store reference for size calculations (pointing to SVG container in Shadow DOM)
    svgContainerRef.current = svgContainer as unknown as HTMLDivElement;

    // Capture SVG natural size for fit-to-screen
    const svgElement = svgContainer.querySelector('svg');
    if (svgElement) {
      svgNaturalSizeRef.current = {
        width: svgElement.getAttribute('width') ? parseFloat(svgElement.getAttribute('width')!) : 0,
        height: svgElement.getAttribute('height') ? parseFloat(svgElement.getAttribute('height')!) : 0,
      };
      // If no explicit size, use viewBox
      if (svgNaturalSizeRef.current.width === 0 || svgNaturalSizeRef.current.height === 0) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const [, , w, h] = viewBox.split(/\s+/).map(Number);
          svgNaturalSizeRef.current = { width: w, height: h };
        }
      }
    }

    // Inject edge click hit targets (must be after SVG is in DOM)
    if (supportsClassDef && relativeContainerRef.current) {
      edgeCleanupRef.current = addEdgeClickTargets(shadowHostRef.current, relativeContainerRef.current, (index) => {
        setSelectedNodeIds(new Set());
        setSelectedEdgeIndex(prev => prev === index ? null : index);
      });
    }

  }, [svg, content]);

  // Cleanup edge hit targets on unmount
  useEffect(() => {
    return () => {
      edgeCleanupRef.current?.();
    };
  }, []);

  // Cleanup shadow root on unmount
  useEffect(() => {
    return () => {
      if (shadowHostRef.current?.shadowRoot) {
        shadowHostRef.current.shadowRoot.innerHTML = '';
      }
    };
  }, []);

  // Extract node overlays after SVG renders
  useEffect(() => {
    if (!svg || !svgContainerRef.current || !containerRef.current || !shadowHostRef.current) return;
    const timer = setTimeout(() => {
      const nodes = extractSvgNodes(containerRef.current!, shadowHostRef.current!);
      setNodeOverlays(nodes);
    }, 100);
    return () => clearTimeout(timer);
  }, [svg, zoom]);

  // Highlight selected edge when selection changes
  useEffect(() => {
    if (!shadowHostRef.current) return;
    highlightSelectedEdge(shadowHostRef.current, selectedEdgeIndex);
  }, [selectedEdgeIndex, svg]);

  // Parse diagram and initialize node/label/style data
  useEffect(() => {
    if (!supportsClassDef) return;
    const parsed = parseDiagram(content);
    const labels = new Map<string, string>();
    const styles = new Map<string, NodeStyle>();
    for (const node of parsed.nodes) {
      labels.set(node.id, node.label);
      styles.set(node.id, getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, node.id));
    }
    setPanelLabels(labels);
    setPanelStyles(styles);
    setParsedEdges(parsed.edges);
    setParsedLinkStyles(parsed.linkStyles);
  }, [content, supportsClassDef]);

  // Auto-resync: update panel styles when content changes from code editor
  useEffect(() => {
    if (!supportsClassDef || selectedNodeIds.size === 0 || skipResyncRef.current) {
      skipResyncRef.current = false;
      return;
    }
    const parsed = parseDiagram(content);
    const updatedStyles = new Map<string, NodeStyle>();
    for (const nodeId of selectedNodeIds) {
      updatedStyles.set(nodeId, getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, nodeId));
    }
    setPanelStyles(updatedStyles);
  }, [content, supportsClassDef, selectedNodeIds]);

  // Node click handler with multi-node selection (shift+click)
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!supportsClassDef) return;
    setSelectedEdgeIndex(null);
    if (e.shiftKey) {
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    } else {
      setSelectedNodeIds(prev =>
        prev.size === 1 && prev.has(nodeId) ? new Set() : new Set([nodeId])
      );
      onNodeSelect?.(nodeId);
    }
  }, [supportsClassDef, onNodeSelect]);

  const handleCanvasClick = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      setSelectedNodeIds(new Set());
    }
    if (selectedEdgeIndex !== null) {
      setSelectedEdgeIndex(null);
    }
  }, [selectedNodeIds, selectedEdgeIndex]);

  // Style change handler: writes classDef/class lines to code via onChange
  const handleStyleChange = useCallback((nodeIds: string[], styleUpdate: Partial<NodeStyle>) => {
    if (!onChange) return;
    skipResyncRef.current = true;

    // Remove old classDef and class lines for these nodes
    let result = removeNodeStyles(content, nodeIds);

    // Build new classDefs and class assignments
    const newLines: string[] = [];
    const classNameBase = `nodeStyle_${Date.now()}`;
    nodeIds.forEach((nodeId, index) => {
      // Merge existing style with update
      const existingStyle = panelStyles.get(nodeId) ?? {};
      const mergedStyle = { ...existingStyle, ...styleUpdate };

      // Only create classDef if there are actual style properties
      if (Object.keys(mergedStyle).length > 0) {
        const className = `${classNameBase}_${index}`;
        // Build classDef line
        const styleParts: string[] = [];
        if (mergedStyle.fill) styleParts.push(`fill:${mergedStyle.fill}`);
        if (mergedStyle.stroke) styleParts.push(`stroke:${mergedStyle.stroke}`);
        if (mergedStyle.strokeWidth) styleParts.push(`stroke-width:${mergedStyle.strokeWidth}`);
        if (mergedStyle.strokeDasharray) styleParts.push(`stroke-dasharray:${mergedStyle.strokeDasharray}`);
        if (mergedStyle.color) styleParts.push(`color:${mergedStyle.color}`);
        if (mergedStyle.fontWeight) styleParts.push(`font-weight:${mergedStyle.fontWeight}`);
        if (mergedStyle.fontSize) styleParts.push(`font-size:${mergedStyle.fontSize}`);
        if (mergedStyle.rx) styleParts.push(`rx:${mergedStyle.rx}`);
        if (mergedStyle.ry) styleParts.push(`ry:${mergedStyle.ry}`);
        newLines.push(`    classDef ${className} ${styleParts.join(',')}`);
        newLines.push(`    class ${nodeId} ${className}`);
      }
    });

    if (newLines.length > 0) {
      result = result.trimEnd() + '\n' + newLines.join('\n') + '\n';
    }

    onChange(result);
  }, [onChange, content, panelStyles]);

  // Reset handler: removes all classDef/class lines for selected nodes
  const handleResetStyles = useCallback((nodeIds: string[]) => {
    if (!onChange) return;
    skipResyncRef.current = true;
    const result = removeNodeStyles(content, nodeIds);
    onChange(result);
    setSelectedNodeIds(new Set());
  }, [onChange, content]);

  // Edge style change handler
  const handleEdgeStyleChange = useCallback((edgeIndex: number, styleUpdate: Partial<EdgeStyle>) => {
    if (!onChange) return;
    const existingStyle = parsedLinkStyles.get(edgeIndex) ?? {};
    const mergedStyle = { ...existingStyle, ...styleUpdate };
    const result = updateLinkStyle(content, edgeIndex, mergedStyle);
    onChange(result);
  }, [onChange, content, parsedLinkStyles]);

  // Edge arrow type change handler
  const handleEdgeArrowChange = useCallback((source: string, target: string, arrowType: string) => {
    if (!onChange) return;
    const result = updateEdgeArrowType(content, source, target, arrowType);
    onChange(result);
  }, [onChange, content]);

  // Edge label change handler
  const handleEdgeLabelChange = useCallback((source: string, target: string, label: string) => {
    if (!onChange) return;
    const result = updateEdgeLabel(content, source, target, label);
    onChange(result);
  }, [onChange, content]);

  // Edge reset handler
  const handleEdgeReset = useCallback((edgeIndex: number) => {
    if (!onChange) return;
    const result = removeLinkStyles(content, [edgeIndex]);
    onChange(result);
    setSelectedEdgeIndex(null);
  }, [onChange, content]);

  // Shape insertion handler: adds a new node to the diagram
  const handleAddShape = useCallback((shape: NodeShape) => {
    if (!onChange) return;
    const parsed = parseDiagram(content);
    const existingIds = parsed.nodes.map(n => n.id);
    const id = generateNodeId(existingIds);
    const result = addNode(content, id, 'New Node', shape);
    onChange(result);
    setSelectedNodeIds(new Set([id]));
    setSelectedEdgeIndex(null);
  }, [onChange, content]);

  // Delete selected nodes handler
  const handleDeleteSelected = useCallback(() => {
    if (!onChange) return;
    let updated = content;
    selectedNodeIds.forEach(id => { updated = removeNode(updated, id); });
    setSelectedNodeIds(new Set());
    setSelectedEdgeIndex(null);
    onChange(updated);
  }, [onChange, content, selectedNodeIds]);

  // Drop handler: adds a shape when dragged onto the canvas
  const handleDropOnCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragShape) return;
    handleAddShape(dragShape);
    setDragShape(null);
  }, [dragShape, handleAddShape]);

  async function copySvg() {
    if (!svg) {return;}
    await navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleFitToScreen = useCallback(() => {
    if (!shadowHostRef.current?.shadowRoot) {return;}

    const svgElement = shadowHostRef.current.shadowRoot.querySelector('svg');
    if (!svgElement) {return;}

    const { width: naturalWidth, height: naturalHeight } = svgNaturalSizeRef.current;

    if (naturalWidth === 0 || naturalHeight === 0) {return;}

    // Find the scrollable container (parent of shadow host)
    const scrollableContainer = shadowHostRef.current?.closest('.overflow-auto');
    if (!scrollableContainer) {return;}

    const containerRect = scrollableContainer.getBoundingClientRect();
    const padding = 32;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;

    const scaleX = availableWidth / naturalWidth;
    const scaleY = availableHeight / naturalHeight;

    // Use min to ensure entire diagram fits in view
    const optimalZoom = Math.min(scaleX, scaleY);

    // Cap zoom between 0.25x and 10x
    const finalZoom = Math.max(0.25, Math.min(optimalZoom, 10));

    setZoom(finalZoom);

    // Reset scroll position
    scrollableContainer.scrollTop = 0;
    scrollableContainer.scrollLeft = 0;
  }, []);

  return (
    <div data-testid="preview-panel" className="flex flex-col h-full" style={{ background: 'var(--surface-raised)' }}>
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Preview</span>
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),0.2)' }}>
            {TYPE_LABELS[type] ?? 'Diagram'}
          </span>
          {loading && <RefreshCw size={11} style={{ color: 'var(--text-tertiary)' }} className="animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom out"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <ZoomOut size={13} />
          </button>
          <span className="text-xs w-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(10, z + 0.25))} title="Zoom in"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <ZoomIn size={13} />
          </button>
          <button onClick={() => setZoom(1)} title="Reset zoom"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <RefreshCw size={13} />
          </button>
          <button
            data-testid="fit-button"
            onClick={handleFitToScreen}
            title="Fit to screen" className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <Move size={13} />
          </button>
          {onFullscreen && (
            <button
              data-testid="fullscreen-button"
              onClick={onFullscreen}
              title="Fullscreen preview" className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
              <Maximize2 size={13} />
            </button>
          )}
          <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button onClick={copySvg} title="Copy SVG"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          {onExport && (
            <button onClick={onExport} title="Export"
              className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
              <Download size={13} />
            </button>
          )}
        </div>
      </div>

      {supportsClassDef && (
        <ShapeToolbar
          toolMode={toolMode}
          onToolMode={setToolMode}
          onAddShape={handleAddShape}
          onDragStart={shape => setDragShape(shape)}
          onDeleteSelected={handleDeleteSelected}
          hasSelection={selectedNodeIds.size > 0}
        />
      )}

      <div ref={containerRef} className="flex-1 overflow-auto preview-grid" onClick={handleCanvasClick} onDragOver={e => e.preventDefault()} onDrop={handleDropOnCanvas}>
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="error-message">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Parse Error</p>
            <p className="text-xs font-mono max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {error.split('\n')[0]}
            </p>
          </div>
        ) : !svg && !loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 opacity-30"
              style={{ background: 'var(--surface-floating)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <path d="M7 10v4M7 14h10M17 14v-4" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Start typing to see a live preview</p>
          </div>
        ) : (
          <div ref={relativeContainerRef} className="relative min-h-full flex items-center justify-center p-8">
            <div
              ref={shadowHostRef}
              className="transition-transform duration-150"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%'
              }}
            />

            {selectedNodeIds.size > 0 && supportsClassDef && (
              <NodeStylePanel
                selectedNodeIds={Array.from(selectedNodeIds)}
                nodeStyles={Array.from(selectedNodeIds).map(id => panelStyles.get(id) ?? {})}
                nodeLabels={panelLabels}
                onClose={() => setSelectedNodeIds(new Set())}
                onStyleChange={handleStyleChange}
                onReset={handleResetStyles}
              />
            )}

            {selectedEdgeIndex !== null && parsedEdges[selectedEdgeIndex] && supportsClassDef && (
              <EdgeStylePanel
                edge={parsedEdges[selectedEdgeIndex]}
                edgeIndex={selectedEdgeIndex}
                edgeStyle={parsedLinkStyles.get(selectedEdgeIndex) ?? {}}
                onClose={() => setSelectedEdgeIndex(null)}
                onArrowChange={handleEdgeArrowChange}
                onLabelChange={handleEdgeLabelChange}
                onStyleChange={handleEdgeStyleChange}
                onReset={handleEdgeReset}
              />
            )}

            {nodeOverlays.map(overlay => {
              const isSelected = selectedNodeIds.has(overlay.id);
              return (
                <div
                  key={overlay.id}
                  onClick={e => handleNodeClick(e, overlay.id)}
                  className={`node-overlay ${isSelected ? 'selected' : ''}`}
                  style={{
                    position: 'absolute',
                    left: overlay.x,
                    top: overlay.y,
                    width: overlay.width,
                    height: overlay.height,
                    cursor: supportsClassDef ? 'pointer' : 'default',
                    zIndex: 5,
                    border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: '4px',
                    transition: 'border-color 0.15s',
                  }}
                  title={supportsClassDef ? `Click to edit ${overlay.id}` : overlay.id}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
