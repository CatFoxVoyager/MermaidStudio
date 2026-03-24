/**
 * Tests for useModalManager hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalManager } from '../useModalManager';
import type { ModalName } from '../useModalManager';

describe('useModalManager', () => {
  describe('Initialization', () => {
    it('should initialize all modals to false', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.modals.showAI).toBe(false);
      expect(result.current.modals.showTemplates).toBe(false);
      expect(result.current.modals.showHistory).toBe(false);
      expect(result.current.modals.showExport).toBe(false);
      expect(result.current.modals.showPalette).toBe(false);
      expect(result.current.modals.showHelp).toBe(false);
      expect(result.current.modals.showBackup).toBe(false);
      expect(result.current.modals.showSaveTemplate).toBe(false);
      expect(result.current.modals.showAISettings).toBe(false);
      expect(result.current.modals.showFullscreen).toBe(false);
      expect(result.current.modals.showDiagramColors).toBe(false);
      expect(result.current.modals.showAdvancedStyle).toBe(false);
    });

    it('should provide all control functions', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.openModal).toBeDefined();
      expect(result.current.closeModal).toBeDefined();
      expect(result.current.toggleModal).toBeDefined();
      expect(result.current.closeAllModals).toBeDefined();
      expect(result.current.isModalOpen).toBeDefined();
    });
  });

  describe('openModal', () => {
    it('should open a specific modal', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showTemplates');
      });

      expect(result.current.modals.showTemplates).toBe(true);
    });

    it('should only open the specified modal', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(true);
      expect(result.current.modals.showTemplates).toBe(false);
      expect(result.current.modals.showHistory).toBe(false);
    });

    it('should work with all modal names', () => {
      const modalNames: ModalName[] = [
        'showAI',
        'showTemplates',
        'showHistory',
        'showExport',
        'showPalette',
        'showHelp',
        'showBackup',
        'showSaveTemplate',
        'showAISettings',
        'showFullscreen',
        'showDiagramColors',
        'showAdvancedStyle',
      ];

      modalNames.forEach((modalName) => {
        const { result } = renderHook(() => useModalManager());

        act(() => {
          result.current.openModal(modalName);
        });

        expect(result.current.modals[modalName]).toBe(true);
      });
    });
  });

  describe('closeModal', () => {
    it('should close a specific modal', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showTemplates');
      });
      expect(result.current.modals.showTemplates).toBe(true);

      act(() => {
        result.current.closeModal('showTemplates');
      });
      expect(result.current.modals.showTemplates).toBe(false);
    });

    it('should only close the specified modal', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
        result.current.openModal('showTemplates');
      });

      act(() => {
        result.current.closeModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(false);
      expect(result.current.modals.showTemplates).toBe(true);
    });

    it('should handle closing already closed modal', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.modals.showAI).toBe(false);

      act(() => {
        result.current.closeModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(false);
    });
  });

  describe('toggleModal', () => {
    it('should toggle modal from closed to open', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.modals.showAI).toBe(false);

      act(() => {
        result.current.toggleModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(true);
    });

    it('should toggle modal from open to closed', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
      });
      expect(result.current.modals.showAI).toBe(true);

      act(() => {
        result.current.toggleModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(false);
    });

    it('should only toggle the specified modal', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
        result.current.openModal('showTemplates');
      });

      act(() => {
        result.current.toggleModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(false);
      expect(result.current.modals.showTemplates).toBe(true);
    });
  });

  describe('closeAllModals', () => {
    it('should close all open modals', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
        result.current.openModal('showTemplates');
        result.current.openModal('showHistory');
        result.current.openModal('showExport');
      });

      expect(result.current.modals.showAI).toBe(true);
      expect(result.current.modals.showTemplates).toBe(true);
      expect(result.current.modals.showHistory).toBe(true);
      expect(result.current.modals.showExport).toBe(true);

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.modals.showAI).toBe(false);
      expect(result.current.modals.showTemplates).toBe(false);
      expect(result.current.modals.showHistory).toBe(false);
      expect(result.current.modals.showExport).toBe(false);
    });

    it('should handle closing when no modals are open', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.closeAllModals();
      });

      Object.values(result.current.modals).forEach((modalState) => {
        expect(modalState).toBe(false);
      });
    });
  });

  describe('isModalOpen', () => {
    it('should return true when modal is open', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
      });

      expect(result.current.isModalOpen('showAI')).toBe(true);
    });

    it('should return false when modal is closed', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.isModalOpen('showAI')).toBe(false);
    });

    it('should return correct state for all modals', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
        result.current.openModal('showTemplates');
        result.current.openModal('showHistory');
      });

      expect(result.current.isModalOpen('showAI')).toBe(true);
      expect(result.current.isModalOpen('showTemplates')).toBe(true);
      expect(result.current.isModalOpen('showHistory')).toBe(true);
      expect(result.current.isModalOpen('showExport')).toBe(false);
      expect(result.current.isModalOpen('showPalette')).toBe(false);
    });

    it('should update after modal state changes', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.isModalOpen('showAI')).toBe(false);

      act(() => {
        result.current.openModal('showAI');
      });
      expect(result.current.isModalOpen('showAI')).toBe(true);

      act(() => {
        result.current.closeModal('showAI');
      });
      expect(result.current.isModalOpen('showAI')).toBe(false);
    });
  });

  describe('Multiple modal interactions', () => {
    it('should allow multiple modals to be open simultaneously', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
        result.current.openModal('showTemplates');
        result.current.openModal('showHistory');
      });

      expect(result.current.modals.showAI).toBe(true);
      expect(result.current.modals.showTemplates).toBe(true);
      expect(result.current.modals.showHistory).toBe(true);
    });

    it('should handle complex modal workflows', () => {
      const { result } = renderHook(() => useModalManager());

      // Open multiple modals
      act(() => {
        result.current.openModal('showAI');
        result.current.openModal('showTemplates');
      });

      expect(result.current.isModalOpen('showAI')).toBe(true);
      expect(result.current.isModalOpen('showTemplates')).toBe(true);

      // Toggle one
      act(() => {
        result.current.toggleModal('showAI');
      });

      expect(result.current.isModalOpen('showAI')).toBe(false);
      expect(result.current.isModalOpen('showTemplates')).toBe(true);

      // Close all
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.isModalOpen('showAI')).toBe(false);
      expect(result.current.isModalOpen('showTemplates')).toBe(false);
    });

    it('should handle rapid modal state changes', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
        result.current.closeModal('showAI');
        result.current.openModal('showAI');
        result.current.toggleModal('showAI');
        result.current.toggleModal('showAI');
      });

      expect(result.current.modals.showAI).toBe(true);
    });
  });

  describe('State immutability', () => {
    it('should not mutate state when opening modal', () => {
      const { result } = renderHook(() => useModalManager());

      const prevState = { ...result.current.modals };

      act(() => {
        result.current.openModal('showAI');
      });

      expect(result.current.modals).not.toBe(prevState);
      expect(prevState.showAI).toBe(false);
      expect(result.current.modals.showAI).toBe(true);
    });

    it('should not mutate state when closing modal', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('showAI');
      });

      const prevState = { ...result.current.modals };

      act(() => {
        result.current.closeModal('showAI');
      });

      expect(result.current.modals).not.toBe(prevState);
      expect(prevState.showAI).toBe(true);
      expect(result.current.modals.showAI).toBe(false);
    });
  });
});
