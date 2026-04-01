import { useCallback, useEffect } from 'react';
import { useModalProviderProps } from '@/hooks';

export interface UseModalStateParams {
  tabs: ReturnType<typeof useModalProviderProps> extends infer T ? T extends { tabs: infer U } ? U : never : never;
  activeTabId: string | null;
  theme: unknown;
  updateTabContent: (id: string, content: string) => void;
  saveTab: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setFocusMode: (focus: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
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
