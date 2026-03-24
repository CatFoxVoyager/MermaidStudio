import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Copy, Check, Download, Move } from 'lucide-react';
import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';

const TYPE_LABELS: Record<string, string> = {
  flowchart: 'Flowchart', sequence: 'Sequence', classDiagram: 'Class',
  stateDiagram: 'State', erDiagram: 'ER', gantt: 'Gantt',
  pie: 'Pie', mindmap: 'Mindmap', gitGraph: 'Git Graph', unknown: 'Diagram',
};

interface Props {
  content: string;
  theme: 'dark' | 'light';
  onExport?: () => void;
  onRenderTime?: (ms: number) => void;
  onFullscreen?: () => void;
}

export function PreviewPanel({ content, theme, onExport, onRenderTime, onFullscreen }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
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
    const { svg: s, error: e } = await renderDiagram(content, `preview_${id}_${Date.now()}`);
    if (id !== renderIdRef.current) {return;}
    const elapsed = Math.round(performance.now() - start);
    onRenderTime?.(elapsed);
    setLoading(false);
    if (e) {setError(e);}
    else {
      // Add data-rendered attribute to SVG for E2E tests
      // Simply replace the first <svg occurrence
      const svgWithAttr = s.replace('<svg', '<svg data-rendered="true"');
      setSvg(svgWithAttr);
      setError(null);
    }
  }, [content, onRenderTime]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, 400);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  // Store natural SVG dimensions when SVG changes and auto-fit (only once per SVG)
  useEffect(() => {
    if (!svg || !svgRef.current) {return;}

    const storeNaturalSizeAndFit = () => {
      const svgElement = svgRef.current?.querySelector('svg');
      if (!svgElement || !containerRef.current) {return;}

      // Get current rendered size and divide by zoom to get natural size
      const currentZoom = zoomRef.current;
      const rect = svgElement.getBoundingClientRect();
      const naturalWidth = rect.width / currentZoom;
      const naturalHeight = rect.height / currentZoom;

      svgNaturalSizeRef.current = { width: naturalWidth, height: naturalHeight };

      // Calculate optimal zoom to fit
      const containerRect = containerRef.current.getBoundingClientRect();
      const padding = 32;
      const availableWidth = containerRect.width - padding * 2;
      const availableHeight = containerRect.height - padding * 2;

      const scaleX = availableWidth / naturalWidth;
      const scaleY = availableHeight / naturalHeight;
      const optimalZoom = Math.min(scaleX, scaleY);
      const finalZoom = Math.max(0.25, Math.min(optimalZoom, 10));

      setZoom(finalZoom);
    };

    const timeoutId = setTimeout(storeNaturalSizeAndFit, 150);
    return () => clearTimeout(timeoutId);
     
  }, [svg]);

  async function copySvg() {
    if (!svg) {return;}
    await navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) {return;}

    const container = containerRef.current;
    const { width: naturalWidth, height: naturalHeight } = svgNaturalSizeRef.current;

    if (naturalWidth === 0 || naturalHeight === 0) {return;}

    const containerRect = container.getBoundingClientRect();

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
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
  }, []);

  const type = detectDiagramType(content);

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

      <div ref={containerRef} className="flex-1 overflow-auto preview-grid">
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
            <div ref={svgRef} className="mermaid-container transition-transform duration-150"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }} />
          </div>
        )}
      </div>
    </div>
  );
}
