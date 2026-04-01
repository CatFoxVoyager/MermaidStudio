import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tab } from '@/types';
import { validateDiagramContent } from '@/utils/validation';

export interface UseAppHandlersParams {
  activeTab: Tab | null;
  updateTabContent: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => void;
  showToast: (message: string) => void;
  closeModal: (name: string) => void;
  setFocusMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export interface UseAppHandlersReturn {
  handleSave: (tabId: string) => void;
  toggleFocusMode: () => void;
  handleRestore: (content: string) => void;
  handleAIApply: (content: string) => void;
  handleCopyLink: () => void;
}

/**
 * Hook for UI event handlers
 * Extracted from App.tsx to reduce complexity
 */
export function useAppHandlers({
  activeTab,
  updateTabContent,
  saveTab,
  showToast,
  closeModal,
  setFocusMode,
  setSidebarOpen,
}: UseAppHandlersParams): UseAppHandlersReturn {
  const { t } = useTranslation();

  const handleSave = useCallback((tabId: string) => {
    saveTab(tabId);
    showToast(t('toast.saved'));
  }, [saveTab, showToast, t]);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
        closeModal('showAI');
      } else {
        setSidebarOpen(true);
      }
      return next;
    });
  }, [closeModal, setFocusMode, setSidebarOpen]);

  const handleRestore = useCallback((content: string) => {
    if (!activeTab) {return;}
    updateTabContent(activeTab.id, content);
    showToast(t('toast.versionRestored'));
  }, [activeTab, updateTabContent, showToast, t]);

  const handleAIApply = useCallback((content: string) => {
    if (!activeTab) {return;}
    updateTabContent(activeTab.id, content);
    showToast(t('toast.aiSuggestionApplied'));
  }, [activeTab, updateTabContent, showToast, t]);

  const handleCopyLink = useCallback(() => {
    if (!activeTab) {return;}
    // Validate diagram content before sharing via URL
    const validation = validateDiagramContent(activeTab.content);
    if (!validation.valid) {
      showToast(t('toast.invalidContent') || 'Content contains unsafe elements');
      return;
    }
    const encoded = btoa(encodeURIComponent(activeTab.content));
    const url = `${window.location.origin}${window.location.pathname}#d=${encoded}`;
    navigator.clipboard.writeText(url);
    showToast(t('toast.shareLinkCopied'));
  }, [activeTab, showToast, t]);

  return {
    handleSave,
    toggleFocusMode,
    handleRestore,
    handleAIApply,
    handleCopyLink,
  };
}
