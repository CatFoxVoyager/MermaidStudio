import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { detectDiagramType } from '@/lib/mermaid/core';

function GitHubIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

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
    <div data-testid="status" className="flex items-center justify-between px-3 h-6 shrink-0 border-t text-[10px]"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
      <div className="flex items-center gap-3">
        <span className="font-medium" style={{ color: 'var(--accent)' }}>{TYPE_LABELS[type]}</span>
        <span>{t('status.lines', { count: lines })}</span>
        <span>{t('status.chars', { count: chars.toLocaleString() })}</span>
      </div>
      <div className="flex items-center gap-3">
        {renderTimeMs !== null && <span data-testid="render-time">{t('status.render', { ms: renderTimeMs })}</span>}
        <span>{relSaved()}</span>
        <span className="mx-1 opacity-30">|</span>
        <a
          href="https://github.com/CatFoxVoyager/MermaidStudio"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <GitHubIcon size={12} />
          <span>MermaidStudio is open source</span>
        </a>
      </div>
    </div>
  );
}
