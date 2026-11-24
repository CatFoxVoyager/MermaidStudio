import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createDiagram, createFolder } from '@/services/storage/database';
import type { Template } from '@/types';
import type { ModalName } from '../useModalManager';

export interface UseDiagramActionsParams {
  openDiagram: (diagramId: string) => Promise<void>;
  refresh: () => void;
  showToast: (message: string) => void;
  closeModal: (name: ModalName) => void;
}

/** Default content used when creating a diagram from a sidebar folder action. */
const FOLDER_DEFAULT_CONTENT = `---
config:
  theme: base
---
flowchart TD
    A --> B`;

export interface NewDiagramDraft {
  /** Changes on every new request; the dialog uses it as its `key` to clear the field. */
  id: number;
  folderId: string | null;
  /** Initial content; `undefined` = `createDiagram` default content. */
  content?: string;
  /** Name proposed by the default-name button. */
  defaultName: string;
  /** Set when creation comes from a template (toast shown after creation). */
  templateTitle?: string;
}

export interface UseDiagramActionsReturn {
  newDiagram: () => void;
  newDiagramInFolder: (folderId: string | null) => void;
  handleTemplateSelect: (template: Template) => void;
  handleNewFolder: () => Promise<void>;
  newDiagramDraft: NewDiagramDraft | null;
  confirmNewDiagram: (name: string) => Promise<void>;
  cancelNewDiagram: () => void;
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
  const [newDiagramDraft, setNewDiagramDraft] = useState<NewDiagramDraft | null>(null);
  // Ref kept synchronously in sync with the state: confirm reads it so a second
  // confirm in the same tick sees the draft already cleared.
  const draftRef = useRef<NewDiagramDraft | null>(null);

  const openDraft = useCallback((partial: Omit<NewDiagramDraft, 'id'>) => {
    const next: NewDiagramDraft = { id: (draftRef.current?.id ?? 0) + 1, ...partial };
    draftRef.current = next;
    setNewDiagramDraft(next);
  }, []);

  const newDiagram = useCallback(() => {
    if (draftRef.current) return;
    openDraft({ folderId: null, defaultName: t('newDiagramDialog.defaultName') });
  }, [openDraft, t]);

  const newDiagramInFolder = useCallback(
    (folderId: string | null) => {
      openDraft({
        folderId,
        content: FOLDER_DEFAULT_CONTENT,
        defaultName: t('newDiagramDialog.defaultName'),
      });
    },
    [openDraft, t]
  );

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      closeModal('showTemplates');
      openDraft({
        folderId: null,
        content: template.content,
        defaultName: template.title,
        templateTitle: template.title,
      });
    },
    [closeModal, openDraft]
  );

  const confirmNewDiagram = useCallback(
    async (name: string) => {
      const draft = draftRef.current;
      const trimmed = name.trim();
      if (!draft || !trimmed) return;
      // Clear before awaiting so a duplicate confirm cannot create twice.
      draftRef.current = null;
      setNewDiagramDraft(null);
      const diagram = await createDiagram(trimmed, draft.content, draft.folderId);
      refresh();
      openDiagram(diagram.id);
      if (draft.templateTitle) {
        showToast(`${t('toast.opened')} "${trimmed}"`);
      }
    },
    [refresh, openDiagram, showToast, t]
  );

  const cancelNewDiagram = useCallback(() => {
    draftRef.current = null;
    setNewDiagramDraft(null);
  }, []);

  const handleNewFolder = useCallback(async () => {
    await createFolder('New Folder');
    refresh();
  }, [refresh]);

  return {
    newDiagram,
    newDiagramInFolder,
    handleTemplateSelect,
    handleNewFolder,
    newDiagramDraft,
    confirmNewDiagram,
    cancelNewDiagram,
  };
}
