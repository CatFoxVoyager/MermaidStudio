import { useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppLayout } from '@/components/AppLayout';
import { ModalProvider } from '@/components/ModalProvider';
import { useKeyboardShortcuts, useDiagramActions, useAppShortcuts } from '@/hooks';
import { useAppState } from './hooks/app/useAppState';
import { useModalState } from './hooks/app/useModalState';
import { SUPPORTED_GOOGLE_FONTS } from '@/constants/fonts';

export default function App() {
  // Pre-load Google Fonts
  useEffect(() => {
    SUPPORTED_GOOGLE_FONTS.forEach(font => {
      const linkId = `font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = font.url;
        document.head.appendChild(link);
      }
    });
  }, []);

  // Get app state (theme, tabs, UI state)
  const appState = useAppState(false);

  // Get modal state with mutual exclusion logic
  const {
    modals,
    openModal,
    closeModal,
    toggleModal,
    openDiagramColors,
    openAdvancedStyle,
    ...modalHandlers
  } = useModalState({
    tabs: appState.tabs,
    activeTabId: appState.activeTabId,
    theme: appState.theme,
    updateTabContent: appState.updateTabContent,
    saveTab: appState.saveTab,
    showToast: appState.show,
    setFocusMode: appState.setFocusMode,
    setSidebarOpen: appState.setSidebarOpen,
    openDiagram: appState.openDiagram,
    refresh: appState.refresh,
  });

  // Diagram actions
  const { newDiagram, handleTemplateSelect, handleNewFolder } = useDiagramActions({
    openDiagram: appState.openDiagram,
    refresh: appState.refresh,
    showToast: appState.show,
    closeModal: modalHandlers.closeModal,
  });

  // Keyboard shortcuts
  const shortcuts = useAppShortcuts({
    openModal,
    toggleModal,
    newDiagram,
    activeTab: appState.activeTab,
    handleSave: modalHandlers.handleSave,
    toggleFocusMode: modalHandlers.toggleFocusMode,
    setSidebarOpen: appState.setSidebarOpen,
  });

  useKeyboardShortcuts(shortcuts);

  // Modal wrapper functions
  const modalClose = useCallback((n: keyof typeof modals) => () => closeModal(n), [closeModal]);
  const modalOpen = useCallback((n: keyof typeof modals) => () => openModal(n), [openModal]);
  const modalToggle = useCallback((n: keyof typeof modals) => () => toggleModal(n), [toggleModal]);

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <AppLayout
        theme={appState.theme}
        toggleTheme={appState.toggleTheme}
        defaultTheme={appState.defaultTheme}
        setDefaultTheme={appState.setDefaultTheme}
        language={appState.language}
        onChangeLanguage={appState.setLanguage}
        sidebarOpen={appState.sidebarOpen}
        onToggleSidebar={() => appState.setSidebarOpen(v => !v)}
        onOpenDiagram={appState.openDiagram}
        onRefreshSidebar={appState.refresh}
        onDiagramDeleted={appState.closeTabsByDiagramIds}
        tabs={appState.tabs}
        activeTabId={appState.activeTabId}
        activeTab={appState.activeTab}
        onSelectTab={appState.setActiveTabId}
        onCloseTab={appState.closeTab}
        onContentChange={appState.updateTabContent}
        onSave={modalHandlers.handleSave}
        onShowHistory={modalOpen('showHistory')}
        onShowExport={modalOpen('showExport')}
        onToggleAI={modalToggle('showAI')}
        onFullscreen={modalOpen('showFullscreen')}
        onSaveTemplate={modalOpen('showSaveTemplate')}
        onNewDiagram={newDiagram}
        onShowTemplates={modalOpen('showTemplates')}
        onShowPalette={modalOpen('showPalette')}
        onShowDiagramColors={openDiagramColors}
        onShowAdvancedStyle={openAdvancedStyle}
        onOpenCommandPalette={modalOpen('showPalette')}
        onOpenBackup={modalOpen('showBackup')}
        onFocusMode={modalHandlers.toggleFocusMode}
        onThemeIdChange={appState.activeTab ? (themeId: string | null) => appState.updateTabTheme(appState.activeTab.id, themeId) : undefined}
        showAI={modals.showAI}
        showDiagramColors={modals.showDiagramColors}
        showAdvancedStyle={modals.showAdvancedStyle}
        onAIApply={modalHandlers.handleAIApply}
        onAIClose={modalClose('showAI')}
        onAIOpenSettings={modalOpen('showAISettings')}
        onDiagramColorsClose={modalClose('showDiagramColors')}
        onAdvancedStyleClose={modalClose('showAdvancedStyle')}
        focusMode={appState.focusMode}
        renderTimeMs={appState.renderTimeMs}
        onRenderTime={appState.setRenderTimeMs}
        refreshKey={appState.refreshKey}
      />
      <ModalProvider
        {...modals}
        onCloseTemplates={modalClose('showTemplates')}
        onCloseHistory={modalClose('showHistory')}
        onCloseExport={modalClose('showExport')}
        onClosePalette={modalClose('showPalette')}
        onCloseBackup={modalClose('showBackup')}
        onCloseSaveTemplate={modalClose('showSaveTemplate')}
        onCloseAISettings={modalClose('showAISettings')}
        onCloseHelp={modalClose('showHelp')}
        onCloseFullscreen={modalClose('showFullscreen')}
        activeTab={appState.activeTab}
        handleTemplateSelect={handleTemplateSelect}
        handleRestore={modalHandlers.handleRestore}
        handleCopyLink={modalHandlers.handleCopyLink}
        newDiagram={newDiagram}
        handleNewFolder={handleNewFolder}
        diagrams={appState.diagrams}
        onOpenDiagram={appState.openDiagram}
        toggleAI={modalToggle('showAI')}
        toggleTheme={appState.toggleTheme}
        theme={appState.theme as 'light' | 'dark'}
        aiSettingsKey={appState.aiSettingsKey}
        setAiSettingsKey={appState.setAiSettingsKey}
        refresh={appState.refresh}
        showToast={appState.show}
        toasts={appState.toasts}
        dismiss={appState.dismiss}
      />
    </>
  );
}
