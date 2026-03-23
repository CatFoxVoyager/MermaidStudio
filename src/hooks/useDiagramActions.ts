import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createDiagram, createFolder } from '@/services/storage/database';
import type { Template } from '@/types';

export interface UseDiagramActionsParams {
  openDiagram: (diagramId: string) => Promise<void>;
  refresh: () => void;
  showToast: (message: string) => void;
  closeModal: (name: string) => void;
}

export interface UseDiagramActionsReturn {
  newDiagram: () => Promise<void>;
  handleTemplateSelect: (template: Template) => Promise<void>;
  handleNewFolder: () => Promise<void>;
}

/**
 * Hook for diagram CRUD operations
 * Extracted from App.tsx to reduce complexity
 */
export function useDiagramActions({
  openDiagram,
  refresh,
  showToast,
  closeModal,
}: UseDiagramActionsParams): UseDiagramActionsReturn {
  const { t } = useTranslation();

  const newDiagram = useCallback(async () => {
    const diagram = await createDiagram('Untitled Diagram');
    refresh();
    openDiagram(diagram.id);
  }, [refresh, openDiagram]);

  const handleTemplateSelect = useCallback(async (template: Template) => {
    const diagram = await createDiagram(template.title, template.content);
    refresh();
    openDiagram(diagram.id);
    closeModal('showTemplates');
    showToast(`${t('toast.opened')} "${template.title}"`);
  }, [refresh, openDiagram, closeModal, showToast, t]);

  const handleNewFolder = useCallback(async () => {
    await createFolder('New Folder');
    refresh();
  }, [refresh]);

  return {
    newDiagram,
    handleTemplateSelect,
    handleNewFolder,
  };
}
