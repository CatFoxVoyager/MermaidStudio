import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Clock, Download, Sparkles, AlignLeft, Maximize, GitCompare, BookmarkPlus, MousePointer2, Code2, FilePlus, LayoutTemplate, Terminal, Palette, SlidersHorizontal, Undo } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { PreviewPanel } from '@/preview/PreviewPanel';
import { StatusBar } from './StatusBar';
import { DiffView } from './DiffView';
import { TabBar } from './TabBar';
import { VisualEditorCanvas } from '@/visual/VisualEditorCanvas';
import { detectDiagramType } from '@/lib/mermaid/core';
import type { Tab } from '@/types';

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  theme: 'dark' | 'light';
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  onSave: (tabId: string) => void;
  onShowHistory: () => void;
  onShowExport: () => void;
  onToggleAI: () => void;
  onFullscreen: () => void;
  onSaveTemplate: () => void;
  onNewDiagram: () => void;
  onShowTemplates: () => void;
  onShowPalette: () => void;
  onShowDiagramColors: () => void;
  onShowAdvancedStyle: () => void;
  showAI: boolean;
  renderTimeMs: number | null;
  onRenderTime: (ms: number) => void;
}

export function WorkspacePanel({
  tabs, activeTabId, activeTab, theme,
  onSelectTab, onCloseTab, onContentChange, onSave,
  onShowHistory, onShowExport, onToggleAI, onFullscreen, onSaveTemplate,
  onNewDiagram, onShowTemplates, onShowPalette, onShowDiagramColors, onShowAdvancedStyle,
  showAI, renderTimeMs, onRenderTime,
}: Props) {
  const { t } = useTranslation();
  const [splitPos, setSplitPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [visualMode, setVisualMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const diagramType = activeTab ? detectDiagramType(activeTab.content) : 'unknown';
  const canUseVisual = diagramType === 'flowchart';

  const onMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setDragging(true); }, []);

  useEffect(() => {
    if (!dragging) {return;}
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) {return;}
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  if (!activeTab) {return <EmptyState onNewDiagram={onNewDiagram} onShowTemplates={onShowTemplates} onShowPalette={onShowPalette} />;}

  const lastSaved = activeTab.is_dirty ? null : new Date().toISOString();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <TabBar tabs={tabs} activeTabId={activeTabId} onSelect={onSelectTab} onClose={onCloseTab} />

      <div className="flex items-center justify-between px-3 h-10 flex-shrink-0 border-b"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mr-4">
          <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{activeTab.title}</span>
          {activeTab.is_dirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </div>
        <div className="flex items-center gap-0.5">
          {activeTab.is_dirty && (
            <button onClick={() => onContentChange(activeTab.id, activeTab.saved_content)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all hover:bg-white/8"
              style={{ color: 'var(--text-secondary)' }}
              title={t('editor.revertToSaved')}>
              <Undo size={11} /> {showLabels ? t('editor.revert') : ''}
            </button>
          )}
          <button onClick={() => onSave(activeTab.id)} disabled={!activeTab.is_dirty}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }} title={t('editor.saveShortcut')}>
            <Save size={11} /> {t('editor.save')}
          </button>
          <div className="w-px h-4 mx-1.5" style={{ background: 'var(--border-subtle)' }} />
          <ToolbarButton icon={<BookmarkPlus size={13} />} label={t('editor.saveAsTemplate')} showLabel={showLabels}
            onClick={onSaveTemplate} title={t('editor.saveAsTemplate')} />
          <ToolbarButton
            icon={<MousePointer2 size={13} />} label={t('editor.visualEditor')} showLabel={showLabels}
            onClick={() => { if (canUseVisual) {setVisualMode(v => !v);} }}
            title={canUseVisual ? t('editor.toggleVisual') : t('editor.visualFlowchartOnly')}
            disabled={!canUseVisual}
            active={visualMode}
          />
          {visualMode && (
            <ToolbarButton icon={<Code2 size={13} />} label={t('editor.codeEditor')} showLabel={showLabels}
              onClick={() => setVisualMode(false)} title={t('editor.backToCode')} />
          )}
          <ToolbarButton icon={<GitCompare size={13} />} label="Diff" showLabel={showLabels}
            onClick={() => setShowDiff(v => !v)} title={t('editor.compareWithSaved')} active={showDiff} />
          <ToolbarButton icon={<Clock size={13} />} label={t('editor.versionHistory')} showLabel={showLabels}
            onClick={onShowHistory} title={t('editor.versionHistory')} />
          <ToolbarButton icon={<Download size={13} />} label={t('editor.export')} showLabel={showLabels}
            onClick={onShowExport} title={t('editor.export')} />
          <ToolbarButton icon={<Sparkles size={13} />} label="AI" showLabel={showLabels}
            onClick={onToggleAI} title={t('editor.aiAssistant')} active={showAI} />
          <ToolbarButton icon={<Palette size={13} />} label={t('editor.diagramColors')} showLabel={showLabels}
            onClick={onShowDiagramColors} title={t('editor.diagramColors')} />
          <ToolbarButton icon={<SlidersHorizontal size={13} />} label={t('editor.advancedStyling')} showLabel={showLabels}
            onClick={onShowAdvancedStyle} title={t('editor.advancedStyling')} />
          <ToolbarButton icon={<Maximize size={13} />} label={t('editor.fullscreenPreview')} showLabel={showLabels}
            onClick={onFullscreen} title={t('editor.fullscreenPreview')} />
          <ToolbarButton icon={<AlignLeft size={13} />} label={t('editor.resetSplit')} showLabel={showLabels}
            onClick={() => setSplitPos(50)} title={t('editor.resetSplit')} />
          <div className="w-px h-4 mx-1.5" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={() => setShowLabels(v => !v)}
            title={showLabels ? t('editor.hideLabels') : t('editor.showLabels')}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-tertiary)' }}>
            {showLabels ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            )}
            {showLabels && <span>{t('editor.collapse')}</span>}
          </button>
        </div>
      </div>

      {visualMode && canUseVisual ? (
        <div className="flex-1 overflow-hidden">
          <VisualEditorCanvas
            content={activeTab.content}
            theme={theme}
            onChange={v => onContentChange(activeTab.id, v)}
          />
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 flex overflow-hidden"
          style={{ userSelect: dragging ? 'none' : undefined }}>
          <div style={{ width: `${splitPos}%` }} className="flex flex-col overflow-hidden">
            {showDiff ? (
              <DiffView original={activeTab.saved_content} modified={activeTab.content} />
            ) : (
              <CodeEditor value={activeTab.content}
                onChange={v => onContentChange(activeTab.id, v)}
                onSave={() => onSave(activeTab.id)} theme={theme} />
            )}
          </div>
          <div className={`resize-handle ${dragging ? 'dragging' : ''}`} onMouseDown={onMouseDown} />
          <div style={{ width: `${100 - splitPos}%` }} className="flex flex-col overflow-hidden">
            <PreviewPanel content={activeTab.content} theme={theme} onExport={onShowExport} onRenderTime={onRenderTime} />
          </div>
        </div>
      )}

      <StatusBar content={activeTab.content} lastSaved={activeTab.is_dirty ? null : lastSaved} renderTimeMs={renderTimeMs} />
    </div>
  );
}

function ToolbarButton({ icon, label, showLabel, onClick, title, disabled, active }: {
  icon: React.ReactNode;
  label: string;
  showLabel: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-colors hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
        background: active ? 'var(--accent-dim)' : undefined,
      }}>
      {icon}
      {showLabel && <span className="font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>{label}</span>}
    </button>
  );
}

function EmptyState({ onNewDiagram, onShowTemplates, onShowPalette }: {
  onNewDiagram: () => void;
  onShowTemplates: () => void;
  onShowPalette: () => void;
}) {
  const { t } = useTranslation();
  const actions = [
    {
      icon: <FilePlus size={16} />,
      label: t('editor.newDiagram'),
      description: t('editor.newDiagramDesc'),
      shortcut: 'Ctrl+N',
      onClick: onNewDiagram,
    },
    {
      icon: <LayoutTemplate size={16} />,
      label: t('editor.templateLibrary'),
      description: t('editor.templateLibraryDesc'),
      shortcut: 'Ctrl+T',
      onClick: onShowTemplates,
    },
    {
      icon: <Terminal size={16} />,
      label: t('editor.commandPalette'),
      description: t('editor.commandPaletteDesc'),
      shortcut: 'Ctrl+K',
      onClick: onShowPalette,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center preview-grid h-full"
      style={{ background: 'var(--surface-base)' }}>
      <div className="flex flex-col items-center gap-6 text-center max-w-sm p-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--surface-floating)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
            style={{ color: 'var(--text-tertiary)' }}>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <path d="M7 10v4M7 14h10M17 14v-4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>MermaidStudio</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {t('editor.openOrCreate')}
          </p>
        </div>
        <div className="w-full flex flex-col gap-2">
          {actions.map(({ icon, label, description, shortcut, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'var(--surface-floating)',
                borderColor: 'var(--border-subtle)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-rgb),0.4)';
                (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-floating)';
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: 'var(--surface-raised)', color: 'var(--accent)' }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
              </div>
              <kbd className="flex-shrink-0">{shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
