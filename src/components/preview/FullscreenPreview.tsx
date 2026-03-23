import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { renderDiagram } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';

interface Props {
  content: string;
  onClose: () => void;
}

export function FullscreenPreview({ content, onClose }: Props) {
  const [svg, setSvg] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderDiagram(content, `fullscreen_${Date.now()}`).then(({ svg: s }) => {
      if (s) {setSvg(s);}
    });
  }, [content]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {onClose();}
      if (e.key === '+' || e.key === '=') {setZoom(z => Math.min(5, z + 0.25));}
      if (e.key === '-') {setZoom(z => Math.max(0.1, z - 0.25));}
      if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) {return;}
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!dragging) {return;}
    const onMove = (e: MouseEvent) => {
      setPan(p => ({
        x: p.x + e.clientX - lastPos.current.x,
        y: p.y + e.clientY - lastPos.current.y,
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
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(5, Math.max(0.1, z + delta)));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--surface-base)' }}>
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Fullscreen Preview</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{ color: 'var(--text-secondary)' }}>
            <ZoomOut size={16} />
          </button>
          <span className="text-xs w-12 text-center font-mono" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(5, z + 0.25))}
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
          {svg ? (
            <div className="mermaid-container transition-transform duration-75"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }} />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 h-8 flex-shrink-0 border-t text-[10px]"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        <span>Scroll to zoom</span>
        <span>Drag to pan</span>
        <span>0 to reset</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
}
