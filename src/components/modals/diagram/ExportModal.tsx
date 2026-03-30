import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, FileText, Code, Share2, Check, Braces, X, Download, Circle } from 'lucide-react';

interface Props {
  isOpen?: boolean;
  diagramTitle: string;
  diagramContent: string;
  onClose: () => void;
  onCopyLink: () => void;
}

export function ExportModal({ isOpen = true, diagramTitle, diagramContent, onClose, onCopyLink }: Props) {
  const { t } = useTranslation();
  const [done, setDone] = useState<string | null>(null);
  const [transparentBg, setTransparentBg] = useState(false);

  function markDone(id: string) {
    setDone(id);
    setTimeout(() => setDone(null), 2000);
  }

  function getShadowSvg(): SVGElement | null {
    const shadowHost = document.querySelector('[data-shadow-host]') as HTMLElement & { shadowRoot: ShadowRoot };
    if (!shadowHost?.shadowRoot) return null;
    return shadowHost.shadowRoot.querySelector('svg');
  }

  /** Clone the shadow SVG into a detached DOM element for reliable rendering */
  function cloneSvgForExport(): SVGSVGElement | null {
    const svg = getShadowSvg();
    if (!svg) return null;

    // Serialize and re-parse to get a clean detached copy
    const raw = svg.outerHTML;
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return null;

    const clone = doc.documentElement as unknown as SVGSVGElement;
    // Force explicit pixel dimensions from viewBox
    const vb = clone.getAttribute('viewBox');
    if (vb) {
      const [, , w, h] = vb.split(/\s+/).map(Number);
      if (w && h) {
        clone.setAttribute('width', String(w));
        clone.setAttribute('height', String(h));
      }
    }
    // Keep foreignObject (contains text labels) — data URLs handle it fine

    return clone;
  }

  async function exportSvg() {
    const svg = getShadowSvg();
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${diagramTitle.replace(/\s+/g, '_')}.svg`; a.click();
    URL.revokeObjectURL(url);
    markDone('svg');
  }

  async function exportPng() {
    const svg = cloneSvgForExport();
    if (!svg) return;
    try {
      // Inject background unless transparent background is selected
      if (!transparentBg) {
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--surface-base').trim() || '#0d1117';
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', svg.getAttribute('width')!);
        bgRect.setAttribute('height', svg.getAttribute('height')!);
        bgRect.setAttribute('fill', bgColor);
        svg.insertBefore(bgRect, svg.firstChild);
      }

      const width = parseFloat(svg.getAttribute('width') ?? '0');
      const height = parseFloat(svg.getAttribute('height') ?? '0');

      // Serialize to data URL (blob: URLs are blocked by CSP)
      const data = new XMLSerializer().serializeToString(svg);
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data)))}`;

      const img = document.createElement('img');
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load SVG data URL'));
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${diagramTitle.replace(/\s+/g, '_')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');

      markDone('png');
    } catch (err) {
      console.error('PNG export failed:', err);
      markDone('png');
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText('```mermaid\n' + diagramContent + '\n```');
    markDone('md');
  }

  async function copyEmbedCode() {
    const embed = `<div class="mermaid">
${diagramContent}
</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" integrity="sha384-PLACEHOLDER" crossorigin="anonymous"></script>
<script>mermaid.initialize({ startOnLoad: true });</script>`;
    await navigator.clipboard.writeText(embed);
    markDone('embed');
  }

  async function handleCopyLink() {
    onCopyLink();
    markDone('link');
  }

  const options = [
    { id: 'svg', icon: <FileText size={18} />, label: t('export.exportSvg'), desc: t('export.exportSvgDesc'), action: exportSvg },
    { id: 'png', icon: <ImageIcon size={18} />, label: t('export.exportPng'), desc: t('export.exportPngDesc'), action: exportPng },
    { id: 'md', icon: <Code size={18} />, label: t('export.copyMarkdown'), desc: t('export.copyMarkdownDesc'), action: copyMarkdown },
    { id: 'embed', icon: <Braces size={18} />, label: t('export.copyEmbedCode'), desc: t('export.copyEmbedDesc'), action: copyEmbedCode },
    { id: 'link', icon: <Share2 size={18} />, label: t('export.copyShareLink'), desc: t('export.copyShareLinkDesc'), action: handleCopyLink },
  ];

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <Download size={12} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>{t('export.title')}</span>
              <span className="text-[10px] truncate max-w-[150px] block" style={{ color: 'var(--text-tertiary)' }}>{diagramTitle}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Transparent Background Toggle */}
          <label className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all"
            style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
            <div className="relative">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={e => setTransparentBg(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${transparentBg ? 'bg-teal-500' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${transparentBg ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Circle size={14} style={{ color: transparentBg ? 'var(--accent)' : 'var(--text-tertiary)' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('export.transparentBackground')}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {t('export.transparentBackgroundDesc')}
                </p>
              </div>
            </div>
          </label>
          {options.map(opt => (
            <button key={opt.id} onClick={opt.action}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border transition-all duration-150"
              style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-dim)', color: done === opt.id ? '#22c55e' : 'var(--accent)' }}>
                {done === opt.id ? <Check size={16} /> : opt.icon}
              </span>
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
