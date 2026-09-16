import { useCallback, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ModalProvider } from '@/components/layout/ModalProvider';
import { ServiceWorkerUpdateToast } from '@/components/shared/ServiceWorkerUpdateToast';
import { MobileShellProvider } from '@/hooks/useMobileShell';
import { useKeyboardShortcuts, useDiagramActions, useAppShortcuts, useToast } from '@/hooks';
import { useAppState } from './hooks/app/useAppState';
import { useModalState } from './hooks/app/useModalState';
import { SUPPORTED_GOOGLE_FONTS } from '@/constants/fonts';
import { APP_VERSION } from '@/constants/app';
import { getSettings, updateSettings } from '@/services/storage/database';

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
  const { show: showToast, toasts, dismiss } = useToast();

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
    showToast: showToast,
    setFocusMode: appState.setFocusMode,
    setSidebarOpen: appState.setSidebarOpen,
    openDiagram: appState.openDiagram,
    refresh: appState.refresh,
  });

  // Fix mode state for AI panel
  const [aiFixMode, setAiFixMode] = useState(false);
  const [aiFixTrigger, setAiFixTrigger] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreviewError = useCallback((error: string | null) => {
    setPreviewError(error);
  }, []);

  // Handler for opening AI panel with mode option
  const handleOpenAIPanel = useCallback(
    (options?: { mode?: 'chat' | 'fix' }) => {
      openModal('showAI');
      if (options?.mode === 'fix') {
        setAiFixMode(true);
        setAiFixTrigger(prev => prev + 1);
      } else {
        setAiFixMode(false);
      }
    },
    [openModal]
  );

  // Update handleCloseAIPanel to reset fix mode
  const handleCloseAIPanel = useCallback(() => {
    closeModal('showAI');
    setAiFixMode(false);
  }, [closeModal]);

  // Diagram actions
  const { newDiagram, handleTemplateSelect, handleNewFolder } = useDiagramActions({
    openDiagram: appState.openDiagram,
    refresh: appState.refresh,
    showToast: showToast,
    closeModal: closeModal,
  });

  // Keyboard shortcuts
  // Local const so the null-check below narrows inside the onThemeIdChange
  // closure (re-reading appState.activeTab there defeats narrowing).
  const activeTab = appState.activeTab;

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

  // Show the welcome / release-notes modal on UPDATES only: a stored version
  // that differs from the current one means the user is returning after an
  // upgrade. A fresh install (no stored version — the DEFAULT_SETTINGS value
  // is undefined) skips it: release notes for a version the user never ran
  // are noise, and a fresh-profile auto-open blocked every interaction in
  // the E2E suite (locked by App.welcomeModal.test.tsx, Phase 24 decision).
  // At this bump (0.6.0 → 0.8.0), users who saw 0.6.0 (stored "0.6.0")
  // still get the new notes.
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then(s => {
        if (
          !cancelled &&
          s.seenReleaseNotesVersion !== undefined &&
          s.seenReleaseNotesVersion !== APP_VERSION
        ) {
          openModal('showWelcome');
        }
      })
      .catch(() => {
        /* ignore — first-run storage read failure is non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, [openModal]);

  // Closing the welcome modal marks the current version as seen
  const handleCloseWelcome = useCallback(() => {
    closeModal('showWelcome');
    void updateSettings({ seenReleaseNotesVersion: APP_VERSION });
  }, [closeModal]);

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <MobileShellProvider>
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
          onOpenAbout={modalOpen('showAbout')}
          onOpenBackup={modalOpen('showBackup')}
          onFocusMode={modalHandlers.toggleFocusMode}
          onThemeIdChange={
            activeTab
              ? (themeId: string | null) => appState.updateTabTheme(activeTab.id, themeId)
              : undefined
          }
          showAI={modals.showAI}
          showDiagramColors={modals.showDiagramColors}
          showAdvancedStyle={modals.showAdvancedStyle}
          onAIApply={modalHandlers.handleAIApply}
          onAIClose={handleCloseAIPanel}
          onAIOpenSettings={modalOpen('showAISettings')}
          onOpenAIPanel={handleOpenAIPanel}
          aiFixMode={aiFixMode}
          aiFixTrigger={aiFixTrigger}
          onPreviewError={handlePreviewError}
          previewError={previewError}
          onDiagramColorsClose={modalClose('showDiagramColors')}
          onAdvancedStyleClose={modalClose('showAdvancedStyle')}
          focusMode={appState.focusMode}
          renderTimeMs={appState.renderTimeMs}
          onRenderTime={appState.setRenderTimeMs}
          refreshKey={appState.refreshKey}
          aiSettingsKey={appState.aiSettingsKey}
        />
        <ModalProvider
          {...modals}
          onCloseTemplates={modalClose('showTemplates')}
          onOpenTemplates={modalOpen('showTemplates')}
          onCloseHistory={modalClose('showHistory')}
          onCloseExport={modalClose('showExport')}
          onClosePalette={modalClose('showPalette')}
          onCloseBackup={modalClose('showBackup')}
          onCloseSaveTemplate={modalClose('showSaveTemplate')}
          onCloseAISettings={modalClose('showAISettings')}
          onCloseHelp={modalClose('showHelp')}
          onCloseFullscreen={modalClose('showFullscreen')}
          onCloseWelcome={handleCloseWelcome}
          onCloseAbout={modalClose('showAbout')}
          onOpenAbout={modalOpen('showAbout')}
          onOpenWelcome={modalOpen('showWelcome')}
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
          theme={appState.theme}
          aiSettingsKey={appState.aiSettingsKey}
          setAiSettingsKey={appState.setAiSettingsKey}
          refresh={appState.refresh}
          showToast={showToast}
          toasts={toasts}
          dismiss={dismiss}
        />
      </MobileShellProvider>
      <ServiceWorkerUpdateToast />
    </>
  );
}
