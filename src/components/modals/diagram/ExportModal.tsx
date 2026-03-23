import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, FileText, Code, Share2, Check, Braces, X, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

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

  function markDone(id: string) {
    setDone(id);
    setTimeout(() => setDone(null), 2000);
  }

  async function exportSvg() {
    const svgEl = document.querySelector('.mermaid-container svg') as SVGElement;
    if (!svgEl) {return;}
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${diagramTitle.replace(/\s+/g, '_')}.svg`; a.click();
    URL.revokeObjectURL(url);
    markDone('svg');
  }

  async function exportPng() {
    const container = document.querySelector('.mermaid-container') as HTMLElement;
    if (!container) {return;}
    try {
      const dataUrl = await toPng(container, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${diagramTitle.replace(/\s+/g, '_')}.png`;
      a.click();
      markDone('png');
    } catch {
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
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
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
    { id: 'png', icon: <Image size={18} />, label: t('export.exportPng'), desc: t('export.exportPngDesc'), action: exportPng },
    { id: 'md', icon: <Code size={18} />, label: t('export.copyMarkdown'), desc: t('export.copyMarkdownDesc'), action: copyMarkdown },
    { id: 'embed', icon: <Braces size={18} />, label: t('export.copyEmbedCode'), desc: t('export.copyEmbedDesc'), action: copyEmbedCode },
    { id: 'link', icon: <Share2 size={18} />, label: t('export.copyShareLink'), desc: t('export.copyShareLinkDesc'), action: handleCopyLink },
  ];

  if (!isOpen) {return null;}

  return (
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
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
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {options.map(opt => (
          <button key={opt.id} onClick={opt.action}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border transition-all duration-150"
            style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
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
  );
}
