/**
 * useModalManager Hook
 *
 * Centralized modal state management for the application.
 * Manages visibility state for all modals and provides utility functions
 * for opening, closing, and toggling modals.
 *
 * @example
 * ```tsx
 * const { modals, openModal, closeModal, toggleModal, closeAllModals, isModalOpen } = useModalManager();
 *
 * // Open a modal
 * openModal('showTemplates');
 *
 * // Check if modal is open
 * if (isModalOpen('showAI')) {
 *   // Do something when AI modal is open
 * }
 *
 * // Close all modals
 * closeAllModals();
 * ```
 */

import { useState, useCallback } from 'react';

/**
 * Modal state interface defining all available modals in the application.
 * Each modal has a boolean visibility state.
 */
export interface ModalState {
  /** AI Assistant panel visibility */
  showAI: boolean;
  /** Template library modal visibility */
  showTemplates: boolean;
  /** Version history modal visibility */
  showHistory: boolean;
  /** Export modal visibility */
  showExport: boolean;
  /** Command palette visibility */
  showPalette: boolean;
  /** Keyboard shortcuts help modal visibility */
  showHelp: boolean;
  /** Backup/Import panel visibility */
  showBackup: boolean;
  /** Save template modal visibility */
  showSaveTemplate: boolean;
  /** AI settings modal visibility */
  showAISettings: boolean;
  /** Fullscreen preview visibility */
  showFullscreen: boolean;
  /** Diagram colors panel visibility */
  showDiagramColors: boolean;
  /** Advanced style panel visibility */
  showAdvancedStyle: boolean;
}

/**
 * Modal state keys for type-safe modal name references
 */
export type ModalName = keyof ModalState;

/**
 * Initial state for all modals (all closed)
 */
const INITIAL_MODAL_STATE: ModalState = {
  showAI: false,
  showTemplates: false,
  showHistory: false,
  showExport: false,
  showPalette: false,
  showHelp: false,
  showBackup: false,
  showSaveTemplate: false,
  showAISettings: false,
  showFullscreen: false,
  showDiagramColors: false,
  showAdvancedStyle: false,
};

/**
 * Hook return value interface
 */
export interface UseModalManagerReturn {
  /** Current state of all modals */
  modals: ModalState;
  /** Open a specific modal by name */
  openModal: (name: ModalName) => void;
  /** Close a specific modal by name */
  closeModal: (name: ModalName) => void;
  /** Toggle a specific modal's visibility */
  toggleModal: (name: ModalName) => void;
  /** Close all open modals */
  closeAllModals: () => void;
  /** Check if a specific modal is currently open */
  isModalOpen: (name: ModalName) => boolean;
}

/**
 * Custom hook for managing modal state across the application.
 *
 * Provides a centralized way to manage multiple modal states,
 * reducing the need for multiple useState declarations.
 *
 * @returns Object containing modal state and control functions
 */
export function useModalManager(): UseModalManagerReturn {
  const [modals, setModals] = useState<ModalState>(INITIAL_MODAL_STATE);

  /**
   * Opens a specific modal by setting its state to true
   */
  const openModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  /**
   * Closes a specific modal by setting its state to false
   */
  const closeModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: false }));
  }, []);

  /**
   * Toggles a modal's visibility state
   */
  const toggleModal = useCallback((name: ModalName) => {
    setModals(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  /**
   * Closes all modals by resetting the entire state
   */
  const closeAllModals = useCallback(() => {
    setModals(INITIAL_MODAL_STATE);
  }, []);

  /**
   * Checks if a specific modal is currently open
   */
  const isModalOpen = useCallback(
    (name: ModalName): boolean => {
      return modals[name];
    },
    [modals]
  );

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    isModalOpen,
  };
}
