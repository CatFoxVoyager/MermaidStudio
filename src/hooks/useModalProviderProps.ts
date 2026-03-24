import { useMemo } from 'react';
import { useModalManager } from './useModalManager';
import { useAppHandlers } from './useAppHandlers';
import type { Tab } from '@/types';

export interface UseModalProviderPropsParams {
  tabs: Tab[];
  activeTabId: string | null;
  theme: string;
  updateTabContent: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => void;
  showToast: (message: string) => void;
  setFocusMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Hook that builds the props object for ModalProvider
 * Consolidates modal state management, app handlers, and active tab calculation
 */
export function useModalProviderProps({
  tabs,
  activeTabId,
  theme,
  updateTabContent,
  saveTab,
  showToast,
  setFocusMode,
  setSidebarOpen,
}: UseModalProviderPropsParams) {
  const { modals, openModal, closeModal, toggleModal, closeAllModals } = useModalManager();

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || null,
    [tabs, activeTabId]
  );

  const {
    handleSave,
    toggleFocusMode,
    handleRestore,
    handleAIApply,
    handleCopyLink,
  } = useAppHandlers({
    activeTab,
    updateTabContent,
    saveTab,
    showToast,
    closeModal,
    setFocusMode,
    setSidebarOpen,
  });

  return {
    // Modal states
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    // App handlers
    handleSave,
    toggleFocusMode,
    handleRestore,
    handleAIApply,
    handleCopyLink,
    // Tab data
    activeTab,
    theme,
  };
}
