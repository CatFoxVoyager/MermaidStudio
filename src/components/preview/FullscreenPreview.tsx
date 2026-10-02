import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderDiagram } from '@/lib/mermaid/core';
import { parseDiagram } from '@/lib/mermaid/codeUtils';
import { postProcessDiagramSvg } from '@/utils/svgPostProcessing';

interface Props {
  content: string;
  themeId?: string;
  onClose: () => void;
}

export function FullscreenPreview({ content, themeId, onClose }: Props) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Same parse as the preview, passed to the shared post-processing pipeline.
  const parsedDiagram = useMemo(() => parseDiagram(content), [content]);

  useEffect(() => {
    renderDiagram(content, `fullscreen_${Date.now()}`, themeId).then(({ svg: s }) => {
      // Same pipeline as the preview and exports so fullscreen matches both.
      if (s) {setSvg(postProcessDiagramSvg(s, parsedDiagram));}
    });
  }, [content, themeId, parsedDiagram]);

  const zoomBy = useCallback((delta: number) => {
    setZoom(z => Math.max(0.1, Math.min(5, z + delta)));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
        x: p.x + dx,
        y: p.y + dy,
      }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const clampedDeltaY = Math.max(-50, Math.min(50, e.deltaY));
    zoomBy(-clampedDeltaY * 0.0015);
  }, [zoomBy]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--surface-base)' }}>
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('fullscreen.title')}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => zoomBy(-0.25)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{ color: 'var(--text-secondary)' }}>
            <ZoomOut size={16} />
          </button>
          <span className="text-xs w-12 text-center font-mono" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => zoomBy(0.25)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{ color: 'var(--text-secondary)' }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{ color: 'var(--text-secondary)' }}>
            <Maximize2 size={16} />
          </button>
          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{ color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing preview-grid"
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        style={{ userSelect: 'none' }}>
        <div className="w-full h-full flex items-center justify-center">
          {/* Safe sink: `svg` was sanitized by renderDiagram (DOMPurify) and
              the post-processing pipeline only mutates attributes via DOM APIs. */}
          {svg ? (
            <div className="mermaid-container"
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

      <div className="flex items-center justify-center gap-4 px-4 h-8 shrink-0 border-t text-[10px]"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        <span>{t('fullscreen.scrollToZoom')}</span>
        <span>{t('fullscreen.dragToPan')}</span>
        <span>{t('fullscreen.zeroToReset')}</span>
        <span>{t('fullscreen.escToClose')}</span>
      </div>
    </div>
  );
}
