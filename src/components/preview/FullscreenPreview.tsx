import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Scan } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderDiagram } from '@/lib/mermaid/core';
import { parseDiagram } from '@/lib/mermaid/codeUtils';
import { postProcessDiagramSvg } from '@/utils/svgPostProcessing';
import { screenToLocal } from '@/utils/uiScale';

interface Props {
  content: string;
  themeId?: string;
  onClose: () => void;
}

function extractSvgIntrinsicSize(svgMarkup: string): { width: number; height: number } {
  const vbMatch = svgMarkup.match(/viewBox=["']([^"']+)["']/i);
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3]) && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const wMatch = svgMarkup.match(/\bwidth=["'](\d+(?:\.\d+)?)/i);
  const hMatch = svgMarkup.match(/\bheight=["'](\d+(?:\.\d+)?)/i);
  const w = wMatch ? Number(wMatch[1]) : 0;
  const h = hMatch ? Number(hMatch[1]) : 0;
  return { width: Number.isFinite(w) ? w : 0, height: Number.isFinite(h) ? h : 0 };
}

export function FullscreenPreview({ content, themeId, onClose }: Props) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const didInitialFitRef = useRef(false);

  // Same parse as the preview, passed to the shared post-processing pipeline.
  const parsedDiagram = useMemo(() => parseDiagram(content), [content]);

  const fitToScreen = useCallback((svgMarkup?: string) => {
    const targetSvg = svgMarkup ?? svg;
    const el = containerRef.current;
    if (!targetSvg || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const { width: natW, height: natH } = extractSvgIntrinsicSize(targetSvg);
    if (natW <= 0 || natH <= 0) return;
    const padding = 32;
    const availW = Math.max(64, screenToLocal(rect.width) - padding * 2);
    const availH = Math.max(64, screenToLocal(rect.height) - padding * 2);
    const optimal = Math.min(1, availW / natW, availH / natH);
    setZoom(Math.max(0.05, Math.round(optimal * 100) / 100));
    setPan({ x: 0, y: 0 });
  }, [svg]);

  useEffect(() => {
    didInitialFitRef.current = false;
  }, [content]);

  useEffect(() => {
    renderDiagram(content, `fullscreen_${Date.now()}`, themeId).then(({ svg: s }) => {
      // Same pipeline as the preview and exports so fullscreen matches both.
      if (s) {
        const processed = postProcessDiagramSvg(s, parsedDiagram);
        setSvg(processed);
        if (!didInitialFitRef.current) {
          didInitialFitRef.current = true;
          requestAnimationFrame(() => fitToScreen(processed));
        }
      }
    });
  }, [content, themeId, parsedDiagram, fitToScreen]);

  const zoomBy = useCallback((delta: number) => {
    setZoom(z => {
      const step = Math.abs(delta) >= 0.2 && z <= 0.25 && delta < 0 ? -0.05 : delta;
      return Math.max(0.05, Math.min(5, z + step));
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const handled = e.key === 'Escape' || e.key === '+' || e.key === '=' ||
        e.key === '-' || e.key === '0';
      if (!handled) {return;}
      // Capture phase: the preview panel keeps its own ctrl+zoom window
      // listener while this modal is open — stop the event here so the
      // diagram behind the fullscreen view is not zoomed twice.
      e.stopPropagation();
      if (e.key === 'Escape') {onClose();}
      if (e.key === '+' || e.key === '=') {
        if (e.ctrlKey || e.metaKey) {e.preventDefault();}
        zoomBy(0.25);
      }
      if (e.key === '-') {
        if (e.ctrlKey || e.metaKey) {e.preventDefault();}
        zoomBy(-0.25);
      }
      if (e.key === '0') {
        if (e.ctrlKey || e.metaKey) {e.preventDefault();}
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, zoomBy]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) {return;}
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!dragging) {return;}
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setPan(p => ({
        x: p.x + screenToLocal(dx),
        y: p.y + screenToLocal(dy),
      }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  // React registers `wheel` as a passive listener, where preventDefault is
  // ignored — a native listener is needed to block the browser's ctrl+wheel
  // page zoom. Same pattern as the preview panel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {return;}
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const clampedDeltaY = Math.max(-50, Math.min(50, e.deltaY));
      zoomBy(-clampedDeltaY * 0.0015);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--surface-base)' }}>
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('fullscreen.title')}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.05, z <= 0.25 ? z - 0.05 : z - 0.25))}
            title={t('preview.zoomOut')} aria-label={t('preview.zoomOut')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
            <ZoomOut size={16} />
          </button>
          <span className="text-xs w-12 text-center font-mono" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(5, z < 0.25 ? z + 0.05 : z + 0.25))}
            title={t('preview.zoomIn')} aria-label={t('preview.zoomIn')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={() => fitToScreen()}
            title={t('preview.fitToScreen')} aria-label={t('preview.fitToScreen')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
            <Scan size={16} />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title={t('preview.resetZoom')} aria-label={t('preview.resetZoom')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
            <Maximize2 size={16} />
          </button>
          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing preview-grid"
        onMouseDown={onMouseDown}
        style={{ userSelect: 'none' }}>
        <div className="w-full h-full flex items-center justify-center">
          {/* Safe sink: `svg` was sanitized by renderDiagram (DOMPurify) and
              the post-processing pipeline only mutates attributes via DOM APIs. */}
          {svg ? (
            <div className="mermaid-container mermaid-canvas-svg shrink-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 h-8 shrink-0 border-t text-[11px]"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        <span>{t('fullscreen.scrollToZoom')}</span>
        <span>{t('fullscreen.dragToPan')}</span>
        <span>{t('fullscreen.zeroToReset')}</span>
        <span>{t('fullscreen.escToClose')}</span>
      </div>
    </div>
  );
}
