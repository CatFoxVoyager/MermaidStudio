import { useCallback, useEffect } from 'react';
import { useModalProviderProps } from '@/hooks';
import type { Tab } from '@/types';

export interface UseModalStateParams {
  /* Typed directly (Tab[]), not inferred from useModalProviderProps: the
     conditional-type inference below read `tabs` off the hook's RETURN type
     (which has no `tabs` member), so the parameter silently collapsed to
     `never` and rejected every real call site. */
  tabs: Tab[];
  activeTabId: string | null;
  theme: string;
  updateTabContent: (id: string, content: string) => void;
  saveTab: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  /* Updater form matches UseModalProviderPropsParams — useAppHandlers calls
     setFocusMode(prev => ...) with an updater function. */
  setFocusMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  openDiagram: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useModalState(params: UseModalStateParams) {
  const modalProps = useModalProviderProps(params);
  const { modals, openModal, closeModal } = modalProps;

  // Make diagram colors and advanced styling mutually exclusive
  const openDiagramColors = useCallback(() => {
    openModal('showDiagramColors');
    closeModal('showAdvancedStyle');
  }, [openModal, closeModal]);

  const openAdvancedStyle = useCallback(() => {
    openModal('showAdvancedStyle');
    closeModal('showDiagramColors');
  }, [openModal, closeModal]);

  // Close diagram-specific panels when switching tabs
  useEffect(() => {
    if (params.activeTabId) {
      closeModal('showDiagramColors');
      closeModal('showAdvancedStyle');
    }
  }, [params.activeTabId, closeModal]);

  return {
    ...modalProps,
    openDiagramColors,
    openAdvancedStyle,
  };
}
