import { useState, useEffect, useCallback } from 'react';
import { getDiagrams } from '@/services/storage/database';
import { initMermaid } from '@/lib/mermaid/core';
import { AppLayout } from '@/components/AppLayout';
import { ModalProvider } from '@/components/ModalProvider';
import {
  useTheme,
  useLanguage,
  useTabs,
  useToast,
  useDiagramActions,
  useModalProviderProps,
  useAppShortcuts,
  useKeyboardShortcuts,
} from '@/hooks';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { toasts, show: showToast, dismiss } = useToast();
  const { tabs, activeTabId, activeTab, setActiveTabId, openDiagram, closeTab, updateTabContent, saveTab } = useTabs();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [renderTimeMs, setRenderTimeMs] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiSettingsKey, setAiSettingsKey] = useState(0);
  const [diagrams, setDiagrams] = useState<unknown[]>([]);

  useEffect(() => { initMermaid(theme); }, [theme]);

  const modalProps = useModalProviderProps({ tabs, activeTabId, theme, updateTabContent, saveTab, showToast, setFocusMode, setSidebarOpen });

  useEffect(() => {
    if (modalProps.modals.showPalette) {getDiagrams().then(setDiagrams);}
  }, [modalProps.modals.showPalette, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const { newDiagram, handleTemplateSelect, handleNewFolder } = useDiagramActions({ openDiagram, refresh, showToast, closeModal: modalProps.closeModal });

  const { modals, openModal, closeModal, toggleModal } = modalProps;
  const modalClose = (n: keyof typeof modals) => () => closeModal(n);
  const modalOpen = (n: keyof typeof modals) => () => openModal(n);
  const modalToggle = (n: keyof typeof modals) => () => toggleModal(n);

  const shortcuts = useAppShortcuts({
    openModal,
    toggleModal,
    newDiagram,
    activeTab,
    handleSave: modalProps.handleSave,
    toggleFocusMode: modalProps.toggleFocusMode,
    setSidebarOpen,
  });

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <AppLayout
        theme={theme} toggleTheme={toggleTheme} language={language} onChangeLanguage={setLanguage}
        sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(v => !v)} onOpenDiagram={openDiagram} onRefreshSidebar={refresh}
        tabs={tabs} activeTabId={activeTabId} activeTab={activeTab} onSelectTab={setActiveTabId} onCloseTab={closeTab} onContentChange={updateTabContent}
        onSave={modalProps.handleSave} onShowHistory={modalOpen('showHistory')} onShowExport={modalOpen('showExport')} onToggleAI={modalToggle('showAI')} onFullscreen={modalOpen('showFullscreen')} onSaveTemplate={modalOpen('showSaveTemplate')} onNewDiagram={newDiagram} onShowTemplates={modalOpen('showTemplates')} onShowPalette={modalOpen('showPalette')} onShowDiagramColors={modalOpen('showDiagramColors')} onShowAdvancedStyle={modalOpen('showAdvancedStyle')} onOpenCommandPalette={modalOpen('showPalette')} onOpenBackup={modalOpen('showBackup')} onFocusMode={modalProps.toggleFocusMode}
        showAI={modals.showAI} showDiagramColors={modals.showDiagramColors} showAdvancedStyle={modals.showAdvancedStyle}
        onAIApply={modalProps.handleAIApply} onAIClose={modalClose('showAI')} onAIOpenSettings={modalOpen('showAISettings')} onDiagramColorsClose={modalClose('showDiagramColors')} onAdvancedStyleClose={modalClose('showAdvancedStyle')}
        focusMode={focusMode} renderTimeMs={renderTimeMs} onRenderTime={setRenderTimeMs} refreshKey={refreshKey}
      />
      <ModalProvider
        {...modals}
        onCloseTemplates={modalClose('showTemplates')} onCloseHistory={modalClose('showHistory')} onCloseExport={modalClose('showExport')} onClosePalette={modalClose('showPalette')} onCloseBackup={modalClose('showBackup')} onCloseSaveTemplate={modalClose('showSaveTemplate')} onCloseAISettings={modalClose('showAISettings')} onCloseHelp={modalClose('showHelp')} onCloseFullscreen={modalClose('showFullscreen')}
        activeTab={activeTab} handleTemplateSelect={handleTemplateSelect} handleRestore={modalProps.handleRestore} handleCopyLink={modalProps.handleCopyLink}
        newDiagram={newDiagram} handleNewFolder={handleNewFolder} diagrams={diagrams} onOpenDiagram={openDiagram}
        toggleAI={modalToggle('showAI')} toggleTheme={toggleTheme} theme={theme as 'light' | 'dark'} aiSettingsKey={aiSettingsKey} setAiSettingsKey={setAiSettingsKey}
        refresh={refresh} showToast={showToast} toasts={toasts} dismiss={dismiss}
      />
    </>
  );
}
