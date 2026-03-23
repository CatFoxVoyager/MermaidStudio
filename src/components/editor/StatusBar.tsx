import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { detectDiagramType } from '@/lib/mermaid/core';

const TYPE_LABELS: Record<string, string> = {
  flowchart: 'Flowchart', sequence: 'Sequence', classDiagram: 'Class',
  stateDiagram: 'State', erDiagram: 'ER', gantt: 'Gantt',
  pie: 'Pie', mindmap: 'Mindmap', gitGraph: 'Git Graph', unknown: 'Diagram',
};

interface Props {
  content: string;
  lastSaved: string | null;
  renderTimeMs: number | null;
}

export function StatusBar({ content, lastSaved, renderTimeMs }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<number>(0);

  useEffect(() => {
    timerRef.current = window.setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const lines = content.split('\n').length;
  const chars = content.length;
  const type = detectDiagramType(content);

  function relSaved() {
    if (!lastSaved) {return t('status.notSaved');}
    const diff = (now - new Date(lastSaved).getTime()) / 1000;
    if (diff < 5) {return t('status.justSaved');}
    if (diff < 60) {return t('status.savedSecsAgo', { count: Math.floor(diff) });}
    if (diff < 3600) {return t('status.savedMinsAgo', { count: Math.floor(diff / 60) });}
    return t('status.savedHoursAgo', { count: Math.floor(diff / 3600) });
  }

  return (
    <div className="flex items-center justify-between px-3 h-6 flex-shrink-0 border-t text-[10px]"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
      <div className="flex items-center gap-3">
        <span className="font-medium" style={{ color: 'var(--accent)' }}>{TYPE_LABELS[type]}</span>
        <span>{t('status.lines', { count: lines })}</span>
        <span>{t('status.chars', { count: chars.toLocaleString() })}</span>
      </div>
      <div className="flex items-center gap-3">
        {renderTimeMs !== null && <span>{t('status.render', { ms: renderTimeMs })}</span>}
        <span>{relSaved()}</span>
      </div>
    </div>
  );
}
