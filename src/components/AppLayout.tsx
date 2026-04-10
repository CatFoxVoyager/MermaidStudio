import { lazy, Suspense } from 'react';
import { TopBar } from '@/components/shared/TopBar';
import { Sidebar } from '@/sidebar/Sidebar';
import { WorkspacePanel } from '@/editor/WorkspacePanel';
import type { Tab, MermaidTheme } from '@/types';

// Lazy load heavy panel components
const LazyAIPanel = lazy(() => import('@/ai/AIPanel').then(m => ({ default: m.AIPanel })));
const LazyDiagramColorsPanel = lazy(() => import('@/components/modals/settings/DiagramColorsPanel').then(m => ({ default: m.DiagramColorsPanel })));
const LazyAdvancedStylePanel = lazy(() => import('@/components/modals/settings/AdvancedStylePanel').then(m => ({ default: m.AdvancedStylePanel })));

interface AppLayoutProps {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  defaultTheme?: MermaidTheme | null;
  setDefaultTheme?: (theme: MermaidTheme | null) => void;
  // Language
  language: string;
  onChangeLanguage: (lang: string) => void;
  // Sidebar
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenDiagram: (id: string) => void;
  onRefreshSidebar: () => void;
  onDiagramDeleted: (diagramIds: string[]) => void;
  // Tabs
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  onSave: (tabId: string) => void;
  // Panel triggers
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
  onOpenCommandPalette: () => void;
  onOpenBackup: () => void;
  onFocusMode: () => void;
  // Panel states
  showAI: boolean;
  showDiagramColors: boolean;
  showAdvancedStyle: boolean;
  // Callbacks for panels
  onAIApply: (content: string) => void;
  onAIClose: () => void;
  onAIOpenSettings: () => void;
  onOpenAIPanel?: (options?: { mode?: 'chat' | 'fix' }) => void;
  aiFixMode?: boolean;
  onDiagramColorsClose: () => void;
  onAdvancedStyleClose: () => void;
  /** Called when diagram-level theme changes (from DiagramColorsPanel) */
  onThemeIdChange?: (themeId: string | null) => void;
  // Other
  focusMode: boolean;
  renderTimeMs: number | null;
  onRenderTime: (ms: number) => void;
  refreshKey: number;
}

export function AppLayout({
  theme,
  toggleTheme,
  defaultTheme,
  setDefaultTheme,
  language,
  onChangeLanguage,
  sidebarOpen,
  onToggleSidebar,
  onOpenDiagram,
  onRefreshSidebar,
  onDiagramDeleted,
  tabs,
  activeTabId,
  activeTab,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSave,
  onShowHistory,
  onShowExport,
  onToggleAI,
  onFullscreen,
  onSaveTemplate,
  onNewDiagram,
  onShowTemplates,
  onShowPalette,
  onShowDiagramColors,
  onShowAdvancedStyle,
  onOpenCommandPalette,
  onOpenBackup,
  onFocusMode,
  showAI,
  showDiagramColors,
  showAdvancedStyle,
  onAIApply,
  onAIClose,
  onAIOpenSettings,
  onOpenAIPanel,
  aiFixMode,
  onDiagramColorsClose,
  onAdvancedStyleClose,
  onThemeIdChange,
  focusMode,
  renderTimeMs,
  onRenderTime,
  refreshKey,
}: AppLayoutProps) {
  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}>
      <TopBar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenTemplates={onShowTemplates}
        onNewDiagram={onNewDiagram}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        onOpenBackup={onOpenBackup}
        onFocusMode={onFocusMode}
        focusMode={focusMode}
        language={language}
        onChangeLanguage={onChangeLanguage}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="shrink-0 overflow-hidden transition-all duration-200"
          style={{ width: sidebarOpen ? 260 : 0 }}>
          {sidebarOpen && (
            <Sidebar
              onOpenDiagram={onOpenDiagram}
              activeDiagramId={activeTab?.diagram_id ?? null}
              onRefresh={onRefreshSidebar}
              onDiagramDeleted={onDiagramDeleted}
              key={refreshKey}
            />
          )}
        </div>

        <main className="flex-1 flex overflow-hidden min-w-0" role="main">
          <WorkspacePanel
            tabs={tabs}
            activeTabId={activeTabId}
            activeTab={activeTab}
            theme={theme}
            themeId={activeTab?.themeId}
            onSelectTab={onSelectTab}
            onCloseTab={onCloseTab}
            onContentChange={onContentChange}
            onSave={onSave}
            onShowHistory={onShowHistory}
            onShowExport={onShowExport}
            onToggleAI={onToggleAI}
            showAI={showAI}
            onFullscreen={onFullscreen}
            onSaveTemplate={onSaveTemplate}
            onNewDiagram={onNewDiagram}
            onShowTemplates={onShowTemplates}
            onShowPalette={onShowPalette}
            onShowDiagramColors={onShowDiagramColors}
            onShowAdvancedStyle={onShowAdvancedStyle}
            onDiagramColorsClose={onDiagramColorsClose}
            onAdvancedStyleClose={onAdvancedStyleClose}
            showDiagramColors={showDiagramColors}
            showAdvancedStyle={showAdvancedStyle}
            onRenderTime={onRenderTime}
            onOpenAIPanel={onOpenAIPanel}
          />

          <div className="shrink-0 overflow-hidden transition-all duration-200"
            style={{ width: showDiagramColors ? 280 : 0 }}>
            {showDiagramColors && activeTab && (
              <Suspense fallback={null}>
                <LazyDiagramColorsPanel
                  isOpen
                  onClose={onDiagramColorsClose}
                  currentContent={activeTab.content}
                  onContentChange={(content) => onContentChange(activeTab.id, content)}
                  theme={theme}
                  currentThemeId={activeTab.themeId}
                  onThemeIdChange={onThemeIdChange}
                  defaultThemeId={defaultTheme?.id}
                  onSetDefaultTheme={setDefaultTheme}
                />
              </Suspense>
            )}
          </div>

          <div className="shrink-0 overflow-hidden transition-all duration-200"
            style={{ width: showAdvancedStyle ? 280 : 0 }}>
            {showAdvancedStyle && activeTab && (
              <Suspense fallback={null}>
                <LazyAdvancedStylePanel
                  isOpen
                  onClose={onAdvancedStyleClose}
                  currentContent={activeTab.content}
                  onContentChange={(content) => onContentChange(activeTab.id, content)}
                  theme={theme}
                />
              </Suspense>
            )}
          </div>

          <div className="shrink-0 overflow-hidden transition-all duration-200"
            style={{ width: showAI ? 300 : 0 }}>
            {showAI && (
              <Suspense fallback={null}>
                <LazyAIPanel
                  currentContent={activeTab?.content ?? ''}
                  onApply={onAIApply}
                  onClose={onAIClose}
                  onOpenSettings={onAIOpenSettings}
                  settingsKey={0} // This would need to be passed separately
                  fixMode={aiFixMode}
                  onEnterFixMode={() => {}}
                />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
