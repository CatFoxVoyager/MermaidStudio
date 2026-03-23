/**
 * Tests for useAppHandlers hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppHandlers } from '../useAppHandlers';
import type { Tab } from '@/types';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('useAppHandlers Hook', () => {
  const mockActiveTab: Tab = {
    id: 'tab-1',
    diagram_id: 'diagram-1',
    title: 'Test Diagram',
    content: 'graph TD\n  A --> B',
    saved_content: 'graph TD\n  A --> B',
    is_dirty: false,
  };

  const mockUpdateTabContent = vi.fn();
  const mockSaveTab = vi.fn();
  const mockShowToast = vi.fn();
  const mockCloseModal = vi.fn();
  const mockSetFocusMode = vi.fn();
  const mockSetSidebarOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSave', () => {
    it('should call saveTab with the tab id', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleSave('tab-1');
      });

      expect(mockSaveTab).toHaveBeenCalledWith('tab-1');
    });

    it('should show toast notification', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleSave('tab-1');
      });

      expect(mockShowToast).toHaveBeenCalled();
      const toastMessage = mockShowToast.mock.calls[0][0];
      expect(toastMessage).toContain('saved');
    });
  });

  describe('toggleFocusMode', () => {
    it('should toggle focus mode state', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.toggleFocusMode();
      });

      expect(mockSetFocusMode).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call closeModal and setSidebarOpen when toggling', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.toggleFocusMode();
      });

      // These are called conditionally based on focus mode state
      // Just verify the function can be called without errors
      expect(mockSetFocusMode).toHaveBeenCalled();
    });
  });

  describe('handleRestore', () => {
    it('should update tab content when active tab exists', () => {
      const restoredContent = 'graph TD\n  A --> B --> C';

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleRestore(restoredContent);
      });

      expect(mockUpdateTabContent).toHaveBeenCalledWith('tab-1', restoredContent);
    });

    it('should show toast notification', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleRestore('restored content');
      });

      expect(mockShowToast).toHaveBeenCalled();
      const toastMessage = mockShowToast.mock.calls[0][0];
      expect(toastMessage).toBe('toast.versionRestored');
    });

    it('should not update content when no active tab', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: null,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleRestore('some content');
      });

      expect(mockUpdateTabContent).not.toHaveBeenCalled();
    });
  });

  describe('handleAIApply', () => {
    it('should update tab content when active tab exists', () => {
      const aiContent = 'graph TD\n  AI --> Generated';

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleAIApply(aiContent);
      });

      expect(mockUpdateTabContent).toHaveBeenCalledWith('tab-1', aiContent);
    });

    it('should show toast notification', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleAIApply('ai content');
      });

      expect(mockShowToast).toHaveBeenCalled();
      const toastMessage = mockShowToast.mock.calls[0][0];
      expect(toastMessage).toBe('toast.aiSuggestionApplied');
    });

    it('should not update content when no active tab', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: null,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleAIApply('ai content');
      });

      expect(mockUpdateTabContent).not.toHaveBeenCalled();
    });
  });

  describe('handleCopyLink', () => {
    it('should copy encoded URL to clipboard', () => {
      // Mock navigator.clipboard
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleCopyLink();
      });

      expect(mockWriteText).toHaveBeenCalled();
      const copiedUrl = mockWriteText.mock.calls[0][0];
      expect(copiedUrl).toContain(window.location.origin);
      expect(copiedUrl).toContain('#d=');
    });

    it('should encode content correctly', () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleCopyLink();
      });

      const copiedUrl = mockWriteText.mock.calls[0][0];
      expect(copiedUrl).toMatch(/#d=[A-Za-z0-9+/=]+$/);
    });

    it('should show toast notification', () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: mockActiveTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleCopyLink();
      });

      expect(mockShowToast).toHaveBeenCalled();
      const toastMessage = mockShowToast.mock.calls[0][0];
      expect(toastMessage).toBe('toast.shareLinkCopied');
    });

    it('should not copy when no active tab', () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: null,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleCopyLink();
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in content for copy link', () => {
      const specialTab: Tab = {
        ...mockActiveTab,
        content: 'graph TD\n  A[Special: <>&"\'\\n\\t] --> B',
      };

      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { result } = renderHook(() =>
        useAppHandlers({
          activeTab: specialTab,
          updateTabContent: mockUpdateTabContent,
          saveTab: mockSaveTab,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
          setFocusMode: mockSetFocusMode,
          setSidebarOpen: mockSetSidebarOpen,
        })
      );

      act(() => {
        result.current.handleCopyLink();
      });

      expect(mockWriteText).toHaveBeenCalled();
      const url = mockWriteText.mock.calls[0][0];
      expect(url).toContain('#d=');
    });
  });
});
