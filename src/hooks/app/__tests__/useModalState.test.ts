import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useModalState } from '../useModalState';

const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockHandleSave = vi.fn();
const mockHandleAIApply = vi.fn();

vi.mock('@/hooks/useModalProviderProps', () => ({
  useModalProviderProps: vi.fn((params) => ({
    modals: { showDiagramColors: false, showAdvancedStyle: false },
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
    handleSave: mockHandleSave,
    handleAIApply: mockHandleAIApply,
  })),
}));

describe('useModalState', () => {
  const mockParams = {
    tabs: [],
    activeTabId: null,
    theme: 'light',
    updateTabContent: vi.fn(),
    saveTab: vi.fn(),
    showToast: vi.fn(),
    setFocusMode: vi.fn(),
    setSidebarOpen: vi.fn(),
    openDiagram: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return modal props from useModalProviderProps', () => {
    const { result } = renderHook(() => useModalState(mockParams));

    expect(result.current.modals).toBeDefined();
    expect(result.current.openModal).toBeDefined();
    expect(result.current.closeModal).toBeDefined();
  });

  it('should provide openDiagramColors that closes advanced style', () => {
    const { result } = renderHook(() => useModalState(mockParams));

    act(() => {
      result.current.openDiagramColors();
    });

    expect(result.current.openModal).toHaveBeenCalledWith('showDiagramColors');
    expect(result.current.closeModal).toHaveBeenCalledWith('showAdvancedStyle');
  });

  it('should provide openAdvancedStyle that closes diagram colors', () => {
    const { result } = renderHook(() => useModalState(mockParams));

    act(() => {
      result.current.openAdvancedStyle();
    });

    expect(result.current.openModal).toHaveBeenCalledWith('showAdvancedStyle');
    expect(result.current.closeModal).toHaveBeenCalledWith('showDiagramColors');
  });

  it('should close diagram-specific panels when active tab changes', async () => {
    const { result, rerender } = renderHook(
      ({ activeTabId }) => useModalState({ ...mockParams, activeTabId }),
      { initialProps: { activeTabId: null as string | null } }
    );

    const { closeModal } = result.current;

    rerender({ activeTabId: 'tab-1' });

    await waitFor(() => {
      expect(closeModal).toHaveBeenCalledWith('showDiagramColors');
      expect(closeModal).toHaveBeenCalledWith('showAdvancedStyle');
    });
  });
});
