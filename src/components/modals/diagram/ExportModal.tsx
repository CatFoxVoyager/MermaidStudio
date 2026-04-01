import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, FileText, Code, Share2, Check, Braces, X, Download, Circle } from 'lucide-react';
import { renderDiagram } from '@/lib/mermaid/core';
import { fixEdgeLabelTextPosition } from '@/utils/svgPostProcessing';

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

  async function getSvgString(): Promise<string | null> {
    const { svg, error } = await renderDiagram(diagramContent, `export_${Date.now()}`);
    if (error || !svg) return null;
    // Fix edge label centering and add missing gradients for Sankey diagrams
    return fixEdgeLabelTextPosition(svg);
  }

  async function exportSvg() {
    const svgStr = await getSvgString();
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${diagramTitle.replace(/\s+/g, '_')}.svg`; a.click();
    URL.revokeObjectURL(url);
    markDone('svg');
  }

  // Helper to convert oklch color to hex
  function oklchToHex(oklchStr: string): string {
    // Parse oklch string like "oklch(50% 0.1 200)" or "oklch(50% 0.1 200 / 0.5)"
    const match = oklchStr.match(/oklch\s*\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/);
    if (!match) return '#333333'; // fallback

    const l = parseFloat(match[1].replace('%', '')) / 100;
    const c = parseFloat(match[2]);
    const h = parseFloat(match[3]);

    // Simplified oklch to sRGB conversion (approximate)
    // For better results, use a library like culori
    const l2 = l + 0.39633777 * c * Math.cos(h * Math.PI / 180) + 0.21580375 * c * Math.sin(h * Math.PI / 180);
    const m2 = 1.0 + 0.39633777 * c * Math.cos(h * Math.PI / 180) - 0.21580375 * c * Math.sin(h * Math.PI / 180);
    const m2b = -0.25656905 * c * Math.cos(h * Math.PI / 180) + 0.62204873 * c * Math.sin(h * Math.PI / 180);

    const l3 = l2 + 0.26405402 * m2b;
    const b = m2 + -0.09511347 * m2b;

    // Simplified gamma correction and RGB conversion
    const r = Math.min(255, Math.max(0, (l3 + b + 1.0) * 127));
    const g = Math.min(255, Math.max(0, (l3 - b) * 127 + 64));
    const b2 = Math.min(255, Math.max(0, (l3 - 2.0 * b) * 127 + 64));

    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
  }

  async function exportPng() {
    const svgStr = await getSvgString();
    if (!svgStr) return;

    try {
      // Clean the SVG string - only replace oklch colors, keep styles
      let cleanSvg = svgStr.replace(/oklch\([^)]+\)/gi, 'rgb(51, 51, 51)');

      // Extract dimensions
      const vbMatch = cleanSvg.match(/viewBox="([^"]+)"/);
      let width = 800, height = 600;
      if (vbMatch) {
        const parts = vbMatch[1].split(/[\s,]+/).map(Number);
        if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      }

      // Fix width/height attributes
      cleanSvg = cleanSvg
        .replace(/<svg([^>]*?)width="[^"]*"/, `<svg$1width="${width}"`)
        .replace(/<svg([^>]*?)height="[^"]*"/, `<svg$1height="${height}"`);

      // Get the current theme's background color
      const bgColor = transparentBg ? 'transparent' : 
        getComputedStyle(document.documentElement).getPropertyValue('--surface-base').trim() || '#ffffff';

      // Create a container in the visible DOM (needed for foreignObject rendering)
      // Position it off-screen but keep it visible to the renderer
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.overflow = 'hidden';
      container.style.zIndex = '-9999';
      container.innerHTML = cleanSvg;
      document.body.appendChild(container);

      const svgElement = container.querySelector('svg');
      if (!svgElement) {
        document.body.removeChild(container);
        return;
      }

      // Ensure the SVG has explicit dimensions for proper rendering
      svgElement.setAttribute('width', String(width));
      svgElement.setAttribute('height', String(height));
      svgElement.style.width = `${width}px`;
      svgElement.style.height = `${height}px`;

      // Add background rect BEFORE any content (so text is visible on top)
      if (!transparentBg) {
        const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        backgroundRect.setAttribute('x', '0');
        backgroundRect.setAttribute('y', '0');
        backgroundRect.setAttribute('width', String(width));
        backgroundRect.setAttribute('height', String(height));
        backgroundRect.setAttribute('fill', bgColor);
        backgroundRect.setAttribute('style', 'pointer-events: none;');

        // Insert at the very beginning so it's behind everything
        svgElement.insertBefore(backgroundRect, svgElement.firstChild);
      }

      // Wait a bit for the DOM to fully render the foreignObject content
      await new Promise(resolve => setTimeout(resolve, 50));

      // Use Canvas API directly with the SVG element from DOM
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        document.body.removeChild(container);
        return;
      }

      // Serialize SVG to string and encode as base64 data URL
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      const url = `data:image/svg+xml;base64,${base64Svg}`;

      const img = new Image();
      img.onload = () => {
        if (!transparentBg) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${diagramTitle.replace(/\s+/g, '_')}.png`;
            a.click();
            URL.revokeObjectURL(pngUrl);
            markDone('png');
          }
          document.body.removeChild(container);
        }, 'image/png');
      };
      img.onerror = (e) => {
        console.error('Failed to load SVG image:', e);
        document.body.removeChild(container);
      };
      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
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
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" integrity="sha384-tI0sDqjGJcqrQ8e/XKiQGS+ee11v5knTNWx2goxMBxe4DO9U0uKlfxJtYB9ILZ4j" crossorigin="anonymous"></script>
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
