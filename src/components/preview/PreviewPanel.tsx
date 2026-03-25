import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Copy, Check, Download, Move, X } from 'lucide-react';
import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import { parseFrontmatter, parseDiagram, updateNodeStyle, getNodeStyle } from '@/lib/mermaid/codeUtils';
import { ColorPicker } from '@/components/visual/ColorPicker';
import type { NodeStyle } from '@/lib/mermaid/codeUtils';

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

interface Props {
  content: string;
  theme: 'dark' | 'light';
  onChange?: (content: string) => void;
  onExport?: () => void;
  onRenderTime?: (ms: number) => void;
  onFullscreen?: () => void;
}

export function PreviewPanel({ content, theme, onChange, onExport, onRenderTime, onFullscreen }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [nodeOverlays, setNodeOverlays] = useState<Array<NodeOverlay>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgNaturalSizeRef = useRef({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const renderIdRef = useRef(0);
  const debounceRef = useRef<number>(0);

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

  }, [svg, content]);

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

  // Node click handlers
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
  }, [selectedNodeId]);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Color change handler
  const handleColorChange = useCallback((field: keyof NodeStyle, value: string) => {
    if (!selectedNodeId || !onChange) return;
    const parsed = parseDiagram(content);
    const currentStyle = getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, selectedNodeId);
    const updatedStyle = { ...currentStyle, [field]: value };
    const updatedContent = updateNodeStyle(content, selectedNodeId, updatedStyle);
    onChange(updatedContent);
  }, [selectedNodeId, content, onChange]);

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

  const type = detectDiagramType(content);

  // Get selected node data for color picker
  const parsed = parseDiagram(content);
  const selectedNodeStyle = selectedNodeId
    ? getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, selectedNodeId)
    : null;

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

      <div ref={containerRef} className="flex-1 overflow-auto preview-grid" onClick={handleCanvasClick}>
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
          <div className="min-h-full flex items-center justify-center p-8">
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

            {selectedNodeId && selectedNodeStyle && onChange && (
              <div className="absolute top-2 left-2 z-20 w-64 rounded-xl border shadow-lg p-3 animate-fade-in"
                style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-3 pb-2 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Edit Node
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      {selectedNodeId}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded-sm transition-colors hover:bg-white/8"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Close">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <ColorPicker
                    label="Fill Color"
                    value={selectedNodeStyle.fill ?? ''}
                    onChange={v => handleColorChange('fill', v)}
                  />
                  <ColorPicker
                    label="Border Color"
                    value={selectedNodeStyle.stroke ?? ''}
                    onChange={v => handleColorChange('stroke', v)}
                  />
                  <ColorPicker
                    label="Text Color"
                    value={selectedNodeStyle.color ?? ''}
                    onChange={v => handleColorChange('color', v)}
                  />
                </div>
              </div>
            )}

            {nodeOverlays.map(overlay => {
              const isSelected = overlay.id === selectedNodeId;
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
                    cursor: 'pointer',
                    zIndex: 5,
                    border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: '4px',
                    transition: 'border-color 0.15s',
                  }}
                  title={`Click to edit ${overlay.id}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
