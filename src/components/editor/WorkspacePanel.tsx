import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Clock, Download, Sparkles, AlignLeft, Maximize, GitCompare, BookmarkPlus, FilePlus, LayoutTemplate, Terminal, Palette, SlidersHorizontal, Undo, Copy, Check, RotateCw, Wrench } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import type { CodeEditorRef } from './CodeEditor';
import { PreviewPanel } from '@/preview/PreviewPanel';
import { StatusBar } from './StatusBar';
import { DiffView } from './DiffView';
import { TabBar } from './TabBar';
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
  onDiagramColorsClose: () => void;
  onAdvancedStyleClose: () => void;
  showDiagramColors: boolean;
  showAdvancedStyle: boolean;
  showAI: boolean;
  renderTimeMs: number | null;
  onRenderTime: (ms: number) => void;
  /** Diagram-specific theme ID from the active tab */
  themeId?: string;
  onOpenAIPanel?: (options?: { mode?: 'chat' | 'fix' }) => void;
  onPreviewError?: (error: string | null) => void;
}

export function WorkspacePanel({
  tabs, activeTabId, activeTab, theme,
  onSelectTab, onCloseTab, onContentChange, onSave,
  onShowHistory, onShowExport, onToggleAI, onFullscreen, onSaveTemplate,
  onNewDiagram, onShowTemplates, onShowPalette, onShowDiagramColors, onShowAdvancedStyle,
  onDiagramColorsClose, onAdvancedStyleClose, showDiagramColors, showAdvancedStyle,
  showAI, renderTimeMs, onRenderTime, themeId, onOpenAIPanel, onPreviewError,
}: Props) {
  const { t } = useTranslation();
  const [splitPos, setSplitPos] = useState(40);
  const [dragging, setDragging] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState<number | null>(null);
  const [showAutoSaveMenu, setShowAutoSaveMenu] = useState(false);
  const autoSaveMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<CodeEditorRef>(null);

  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatInterval(ms: number): string {
    const minutes = ms / 60000;
    return `${minutes}m`;
  }

  async function handleCopyCode() {
    if (!activeTab?.content) return;
    await navigator.clipboard.writeText(activeTab.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (!activeTab) return;
    const lines = activeTab.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match node definition patterns: A[Label], A{Label}, A(Label), etc.
      const nodeDefMatch = line.match(
        new RegExp(`^(\\s*)${escapeRegExp(nodeId)}(\\s*)(\\[|\\{|\\(|\\[\\[|\\[\\(|\\(\\[|\\(\\(|\\{\\{|>|\\[\\/|\\[\\\\)`)
      );
      // Also match node in edge: A --> B or A[Label] --> B[Label]
      const edgeMatch = line.match(
        new RegExp(`^(\\s*)${escapeRegExp(nodeId)}(\\s*)(\\(|\\[|\\{|)?(?:[^\\n]*?)\\s*(-->|---|---\\||-->)`)
      );
      if (nodeDefMatch || edgeMatch) {
        codeEditorRef.current?.highlightLine(i + 1); // 1-indexed
        return;
      }
    }
  }, [activeTab]);

  // Auto-save at the selected interval when enabled
  useEffect(() => {
    if (!autoSaveInterval || !activeTab?.is_dirty) return;

    const interval = setInterval(() => {
      if (activeTab?.is_dirty) {
        onSave(activeTab.id);
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSaveInterval, activeTab?.id, activeTab?.is_dirty, onSave]);

  // Close auto-save dropdown when clicking outside
  useEffect(() => {
    if (!showAutoSaveMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (autoSaveMenuRef.current && !autoSaveMenuRef.current.contains(e.target as Node)) {
        setShowAutoSaveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAutoSaveMenu]);

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

      <div className="flex items-center justify-between px-3 h-10 shrink-0 border-b"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mr-4">
          <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{activeTab.title}</span>
          {activeTab.is_dirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </div>
        <div className="flex items-center gap-0.5">
          {activeTab.is_dirty && (
            <button onClick={() => onContentChange(activeTab.id, activeTab.saved_content)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-all hover:bg-white/8"
              style={{ color: 'var(--text-secondary)' }}
              title={t('editor.revertToSaved')}>
              <Undo size={11} /> {showLabels ? t('editor.revert') : ''}
            </button>
          )}
          <button onClick={() => onSave(activeTab.id)} disabled={!activeTab.is_dirty}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }} title={t('editor.saveShortcut')}>
            <Save size={11} /> {t('editor.save')}
          </button>
          <button onClick={handleCopyCode} title="Copy code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-all hover:bg-white/8"
            style={{ color: 'var(--text-tertiary)' }}>
            {copiedCode ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          </button>
          <div className="relative" ref={autoSaveMenuRef}>
            <button onClick={() => setShowAutoSaveMenu(v => !v)}
              title={autoSaveInterval ? `Auto-snapshot every ${formatInterval(autoSaveInterval)}` : 'Auto-snapshot: Off'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-all hover:bg-white/8"
              style={{ color: autoSaveInterval ? 'var(--accent)' : 'var(--text-tertiary)', background: autoSaveInterval ? 'var(--accent-dim)' : undefined }}>
              <RotateCw size={11} className={autoSaveInterval ? 'animate-spin' : ''} />
              {showLabels && <span>Auto-snapshot{autoSaveInterval ? ` ${formatInterval(autoSaveInterval)}` : ''}</span>}
            </button>
            {showAutoSaveMenu && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-md border py-1 min-w-[100px]"
                style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
                {([
                  { value: null, label: 'Off' },
                  { value: 60000, label: '1 min' },
                  { value: 120000, label: '2 min' },
                  { value: 300000, label: '5 min' },
                  { value: 600000, label: '10 min' },
                ] as const).map(opt => (
                  <button key={opt.label}
                    onClick={() => { setAutoSaveInterval(opt.value); setShowAutoSaveMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/8"
                    style={{ color: autoSaveInterval === opt.value ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-4 mx-1.5" style={{ background: 'var(--border-subtle)' }} />
          <ToolbarButton icon={<BookmarkPlus size={13} />} label={t('editor.saveAsTemplate')} showLabel={showLabels}
            onClick={onSaveTemplate} title={t('editor.saveAsTemplate')} />
          <ToolbarButton icon={<GitCompare size={13} />} label="Diff" showLabel={showLabels}
            onClick={() => setShowDiff(v => !v)} title={t('editor.compareWithSaved')} active={showDiff} />
          <ToolbarButton icon={<Clock size={13} />} label={t('editor.versionHistory')} showLabel={showLabels}
            onClick={onShowHistory} title={t('editor.versionHistory')} />
          <ToolbarButton icon={<Download size={13} />} label={t('editor.export')} showLabel={showLabels}
            onClick={onShowExport} title={t('editor.export')} />
          <ToolbarButton
            data-testid="ai-button"
            icon={<Sparkles size={13} />} label="AI" showLabel={showLabels}
            onClick={onToggleAI} title={t('editor.aiAssistant')} active={showAI} />
          <ToolbarButton
            data-testid="fix-diagram-button"
            icon={<><Wrench size={13} /><Sparkles size={9} className="ml-[-4px] mt-[2px]" /></>}
            label="Fix"
            showLabel={showLabels}
            onClick={() => onOpenAIPanel?.({ mode: 'fix' })}
            title={t('ai.fixDiagram')} />
          <ToolbarButton icon={<Palette size={13} />} label={t('editor.diagramColors')} showLabel={showLabels}
            onClick={onShowDiagramColors} title={t('editor.diagramColors')} />
          <ToolbarButton icon={<SlidersHorizontal size={13} />} label={t('editor.advancedStyling')} showLabel={showLabels}
            onClick={onShowAdvancedStyle} title={t('editor.advancedStyling')} />
          <ToolbarButton icon={<Maximize size={13} />} label={t('editor.fullscreenPreview')} showLabel={showLabels}
            onClick={onFullscreen} title={t('editor.fullscreenPreview')} />
          <ToolbarButton icon={<AlignLeft size={13} />} label={t('editor.resetSplit')} showLabel={showLabels}
            onClick={() => setSplitPos(40)} title={t('editor.resetSplit')} />
          <div className="w-px h-4 mx-1.5" style={{ background: 'var(--border-subtle)' }} />
          <button
            onClick={() => setShowLabels(v => !v)}
            title={showLabels ? t('editor.hideLabels') : t('editor.showLabels')}
            className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-colors hover:bg-white/8"
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

      <div ref={containerRef} className="flex-1 flex overflow-hidden"
          style={{ userSelect: dragging ? 'none' : undefined }}>
          <div style={{ width: `${splitPos}%` }} className="flex flex-col overflow-hidden">
            {showDiff ? (
              <DiffView original={activeTab.saved_content} modified={activeTab.content} />
            ) : (
              <CodeEditor ref={codeEditorRef} value={activeTab.content}
                onChange={v => onContentChange(activeTab.id, v)}
                onSave={() => onSave(activeTab.id)} theme={theme} />
            )}
          </div>
          <div className={`resize-handle ${dragging ? 'dragging' : ''}`} onMouseDown={onMouseDown} />
          <div style={{ width: `${100 - splitPos}%` }} className="flex flex-col overflow-hidden">
            <PreviewPanel
              content={activeTab.content}
              theme={theme}
              themeId={themeId}
              onChange={v => onContentChange(activeTab.id, v)}
              onExport={onShowExport}
              onRenderTime={onRenderTime}
              onFullscreen={onFullscreen}
              onNodeSelect={handleNodeSelect}
              onSelectionOpen={() => { onDiagramColorsClose(); onAdvancedStyleClose(); }}
              externalPanelOpen={showDiagramColors || showAdvancedStyle}
              onError={onPreviewError}
            />
          </div>
        </div>

      <StatusBar content={activeTab.content} lastSaved={activeTab.is_dirty ? null : lastSaved} renderTimeMs={renderTimeMs} />
    </div>
  );
}

function ToolbarButton({ icon, label, showLabel, onClick, title, disabled, active, 'data-testid': dataTestId }: {
  icon: React.ReactNode;
  label: string;
  showLabel: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  active?: boolean;
  'data-testid'?: string;
}) {
  return (
    <button
      data-testid={dataTestId}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="flex items-center gap-1.5 px-1.5 py-1 rounded-sm text-xs transition-colors hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
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
      onClick: onNewDiagram,
      testId: 'empty-new-diagram',
    },
    {
      icon: <LayoutTemplate size={16} />,
      label: t('editor.templateLibrary'),
      description: t('editor.templateLibraryDesc'),
      shortcut: 'Ctrl+T',
      onClick: onShowTemplates,
      testId: 'empty-templates',
    },
    {
      icon: <Terminal size={16} />,
      label: t('editor.commandPalette'),
      description: t('editor.commandPaletteDesc'),
      onClick: onShowPalette,
      testId: 'empty-palette',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center preview-grid h-full"
      style={{ background: 'var(--surface-base)' }}>
      <div className="flex flex-col items-center gap-6 text-center max-w-sm p-6">
        <div className="flex items-center gap-3">
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
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>MermaidStudio</span>
          <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-floating)', color: 'var(--text-secondary)' }}>v0.4.1</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('editor.openOrCreate')}
        </p>
        <div className="w-full flex flex-col gap-2">
          {actions.map(({ icon, label, description, onClick, testId }) => (
            <button
              key={label}
              onClick={onClick}
              data-testid={testId}
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={{ background: 'var(--surface-raised)', color: 'var(--accent)' }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
