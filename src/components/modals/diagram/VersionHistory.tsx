import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, RotateCcw } from 'lucide-react';
import { getVersions, saveVersion } from '@/services/storage/database';
import { renderDiagram } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import type { DiagramVersion } from '@/types';

interface Props {
  diagramId: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

function VersionRow({ v, isActive, onPreview, onRestore }: {
  v: DiagramVersion; isActive: boolean;
  onPreview: () => void; onRestore: () => void;
}) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Update time for relative timestamps
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    renderDiagram(v.content, `vh_${v.id}_${Date.now()}`).then(({ svg }) => { if (svg) {setSvg(svg);} });
  }, [v]);

  function relTime(date: Date) {
    const s = (now - date.getTime()) / 1000;
    if (s < 60) {return t('versions.justNow');}
    if (s < 3600) {return t('versions.minsAgo', { count: Math.floor(s / 60) });}
    if (s < 86400) {return t('versions.hoursAgo', { count: Math.floor(s / 3600) });}
    return t('versions.daysAgo', { count: Math.floor(s / 86400) });
  }

  return (
    <div onClick={onPreview} className="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-100 border-l-2"
      style={{
        borderColor: isActive ? 'var(--accent)' : 'transparent',
        background: isActive ? 'var(--accent-dim)' : undefined,
      }}
      onMouseEnter={e => { if (!isActive) {e.currentTarget.style.background = 'var(--surface-floating)';} }}
      onMouseLeave={e => { if (!isActive) {e.currentTarget.style.background = '';} }}>
      <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border preview-grid"
        style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
        {svg ? (
          <div className="pointer-events-none"
            style={{ transform: 'scale(0.14)', transformOrigin: 'center center', maxWidth: '700%' }}
            dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }} />
        ) : <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Clock size={10} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{relTime(new Date(v.created_at))}</span>
        </div>
        {v.label && <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{v.label}</span>}
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(v.created_at).toLocaleString()}
        </p>
      </div>
      <button onClick={e => { e.stopPropagation(); onRestore(); }}
        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white transition-all"
        style={{ background: 'var(--accent)' }}>
        <RotateCcw size={10} /> {t('versions.restore')}
      </button>
    </div>
  );
}

export function VersionHistory({ diagramId, currentContent, onRestore, onClose }: Props) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    (async () => {
      setVersions(await getVersions(diagramId));
    })();
  }, [diagramId]);

  async function preview(v: DiagramVersion) {
    setActiveId(v.id);
    const { svg } = await renderDiagram(v.content, `vhp_${v.id}_${Date.now()}`);
    if (svg) {setPreviewSvg(svg);}
  }

  async function saveSnapshot() {
    const v = await saveVersion(diagramId, currentContent, label.trim() || t('versions.manualSnapshot'));
    setVersions(await getVersions(diagramId));
    setLabel('');
    preview(v);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('versions.title')}
      subtitle={t('versions.subtitle', { count: versions.length })}
      position="right"
      size="xl"
    >
      <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex gap-2">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('versions.snapshotLabel')}
            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          <button onClick={saveSnapshot} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: 'var(--accent)' }}>{t('common.save')}</button>
        </div>
      </div>

      {previewSvg && (
        <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>{t('versions.preview')}</p>
          <div className="h-28 rounded-xl overflow-hidden flex items-center justify-center preview-grid border"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
            <div className="pointer-events-none"
              style={{ transform: 'scale(0.45)', transformOrigin: 'center center', maxWidth: '220%' }}
              dangerouslySetInnerHTML={{ __html: sanitizeSVG(previewSvg) }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Clock size={24} className="mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('versions.noVersions')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('versions.noVersionsHint')}</p>
          </div>
        ) : versions.map(v => (
          <VersionRow key={v.id} v={v} isActive={v.id === activeId}
            onPreview={() => preview(v)} onRestore={() => { onRestore(v.content); onClose(); }} />
        ))}
      </div>
    </Modal>
  );
}
