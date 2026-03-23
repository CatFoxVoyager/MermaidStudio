import { useMemo } from 'react';
import type { Shortcut } from './useKeyboardShortcuts';

interface UseAppShortcutsParams {
  openModal: (name: string) => void;
  toggleModal: (name: string) => void;
  newDiagram: () => void;
  activeTab: { id: string } | null;
  handleSave: (tabId: string) => void;
  toggleFocusMode: () => void;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Hook for application keyboard shortcuts
 * Extracted from App.tsx to reduce complexity
 */
export function useAppShortcuts({
  openModal,
  toggleModal,
  newDiagram,
  activeTab,
  handleSave,
  toggleFocusMode,
  setSidebarOpen,
}: UseAppShortcutsParams): Shortcut[] {
  return useMemo<Shortcut[]>(() => [
    { key: 'k', ctrl: true, action: () => openModal('showPalette') },
    { key: 't', ctrl: true, action: () => openModal('showTemplates') },
    { key: 'n', ctrl: true, action: () => newDiagram() },
    { key: '/', ctrl: true, action: () => toggleModal('showAI') },
    { key: 'e', ctrl: true, action: () => activeTab && openModal('showExport'), condition: () => !!activeTab },
    { key: 's', ctrl: true, action: () => activeTab && handleSave(activeTab.id), condition: () => !!activeTab },
    { key: 'b', ctrl: true, action: () => setSidebarOpen(v => !v) },
    { key: 'F', ctrl: true, shift: true, action: () => toggleFocusMode() },
    { key: 'F11', action: () => activeTab && toggleModal('showFullscreen'), condition: () => !!activeTab },
    { key: '?', action: () => toggleModal('showHelp') },
  ], [openModal, toggleModal, newDiagram, activeTab, handleSave, toggleFocusMode, setSidebarOpen]);
}

export type { UseAppShortcutsParams };
