import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useModalProviderProps } from '../useModalProviderProps';
import type { Tab } from '@/types';

// Mock the hooks that useModalProviderProps depends on
vi.mock('../useModalManager', () => ({
  useModalManager: vi.fn(() => ({
    modals: {
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
    },
    openModal: vi.fn(),
    closeModal: vi.fn(),
    toggleModal: vi.fn(),
    closeAllModals: vi.fn(),
    isModalOpen: vi.fn(),
  })),
}));

vi.mock('../useAppHandlers', () => ({
  useAppHandlers: vi.fn(() => ({
    handleSave: vi.fn(),
    toggleFocusMode: vi.fn(),
    handleRestore: vi.fn(),
    handleAIApply: vi.fn(),
    handleCopyLink: vi.fn(),
  })),
}));

describe('useModalProviderProps', () => {
  const mockTabs: Tab[] = [
    { id: '1', name: 'Tab 1', content: 'content1', dirty: false, diagram_id: 'diag1' },
    { id: '2', name: 'Tab 2', content: 'content2', dirty: false, diagram_id: 'diag2' },
  ];

  const mockParams = {
    tabs: mockTabs,
    activeTabId: '1',
    theme: 'dark',
    updateTabContent: vi.fn(),
    saveTab: vi.fn(),
    showToast: vi.fn(),
    setFocusMode: vi.fn(),
    setSidebarOpen: vi.fn(),
  };

  it('should return all required modal provider props', () => {
    const { result } = renderHook(() =>
      useModalProviderProps(mockParams)
    );

    expect(result.current.modals).toBeDefined();
    expect(result.current.openModal).toBeInstanceOf(Function);
    expect(result.current.closeModal).toBeInstanceOf(Function);
    expect(result.current.toggleModal).toBeInstanceOf(Function);
    expect(result.current.closeAllModals).toBeInstanceOf(Function);
    expect(result.current.handleSave).toBeInstanceOf(Function);
    expect(result.current.toggleFocusMode).toBeInstanceOf(Function);
    expect(result.current.handleRestore).toBeInstanceOf(Function);
    expect(result.current.handleAIApply).toBeInstanceOf(Function);
    expect(result.current.handleCopyLink).toBeInstanceOf(Function);
    expect(result.current.activeTab).toBeDefined();
    expect(result.current.theme).toBe('dark');
  });

  it('should calculate activeTab correctly', () => {
    const { result } = renderHook(() =>
      useModalProviderProps(mockParams)
    );

    expect(result.current.activeTab).toEqual(mockTabs[0]);
  });

  it('should return null activeTab when activeTabId does not match', () => {
    const { result } = renderHook(() =>
      useModalProviderProps({
        ...mockParams,
        activeTabId: '999',
      })
    );

    expect(result.current.activeTab).toBeNull();
  });

  it('should return null activeTab when no tabs exist', () => {
    const { result } = renderHook(() =>
      useModalProviderProps({
        ...mockParams,
        tabs: [],
      })
    );

    expect(result.current.activeTab).toBeNull();
  });

  it('should pass theme through to props', () => {
    const { result } = renderHook(() =>
      useModalProviderProps(mockParams)
    );

    expect(result.current.theme).toBe('dark');
  });

  it('should update activeTab when activeTabId changes', () => {
    const { result, rerender } = renderHook(
      ({ activeTabId }) => useModalProviderProps({ ...mockParams, activeTabId }),
      { initialProps: { activeTabId: '1' } }
    );

    expect(result.current.activeTab).toEqual(mockTabs[0]);

    rerender({ activeTabId: '2' });

    expect(result.current.activeTab).toEqual(mockTabs[1]);
  });

  it('should memoize activeTab calculation', () => {
    const { result, rerender } = renderHook(
      (props) => useModalProviderProps(props),
      { initialProps: mockParams }
    );

    const firstActiveTab = result.current.activeTab;

    // Re-render with same props
    rerender(mockParams);

    const secondActiveTab = result.current.activeTab;

    expect(firstActiveTab).toBe(secondActiveTab);
  });
});
