import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppState } from '../useAppState';

vi.mock('@/utils/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
  storage: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('@/services/storage/database', () => ({
  getDiagrams: vi.fn(() => Promise.resolve([])),
  getDiagram: vi.fn(() => Promise.resolve(null)),
  getSettings: vi.fn(() => Promise.resolve({
    theme: 'light',
    language: 'en',
    lastOpenDiagramId: null,
  })),
  updateSettings: vi.fn(() => Promise.resolve()),
  updateDiagram: vi.fn(() => Promise.resolve()),
  saveVersion: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/mermaid/core', () => ({
  initMermaid: vi.fn(),
}));

vi.mock('@/constants/themes', () => ({
  getThemeById: vi.fn(() => null),
}));

vi.mock('@/constants/themeDerivation', () => ({
  DEFAULT_LIGHT_THEME: { id: 'default-light', name: 'Default Light' },
  DEFAULT_DARK_THEME: { id: 'default-dark', name: 'Default Dark' },
  extractThemeIdFromContent: vi.fn(() => null),
}));

describe('useAppState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.focusMode).toBe(false);
    expect(result.current.renderTimeMs).toBeNull();
    expect(result.current.diagrams).toEqual([]);
  });

  it('should provide theme state from useTheme', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.theme).toBeDefined();
    expect(result.current.defaultTheme).toBeDefined();
    expect(result.current.toggleTheme).toBeDefined();
    expect(result.current.setDefaultTheme).toBeDefined();
  });

  it('should provide tabs state from useTabs', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.tabs).toBeDefined();
    expect(result.current.activeTabId).toBeDefined();
    expect(result.current.activeTab).toBeDefined();
    expect(result.current.openDiagram).toBeDefined();
    expect(result.current.closeTab).toBeDefined();
    expect(result.current.setActiveTabId).toBeDefined();
  });

  it('should load diagrams when showPalette is true', async () => {
    const { getDiagrams } = await import('@/services/storage/database');
    const testDiagrams = [{ id: '1', title: 'Test' }];
    (getDiagrams as vi.Mock).mockResolvedValue(testDiagrams);

    const { result } = renderHook(() => useAppState(true));

    await waitFor(() => {
      expect(getDiagrams).toHaveBeenCalled();
      expect(result.current.diagrams).toEqual(testDiagrams);
    });
  });

  it('should provide refresh callback that updates refreshKey', () => {
    const { result } = renderHook(() => useAppState(false));

    const initialKey = result.current.refreshKey;
    act(() => {
      result.current.refresh();
    });

    expect(result.current.refreshKey).toBe(initialKey + 1);
  });

  it('should initialize Mermaid with theme on mount', async () => {
    const { initMermaid } = await import('@/lib/mermaid/core');
    renderHook(() => useAppState(false));

    expect(initMermaid).toHaveBeenCalled();
  });

  it('should initialize Mermaid with light theme by default', async () => {
    const { initMermaid } = await import('@/lib/mermaid/core');
    renderHook(() => useAppState(false));

    expect(initMermaid).toHaveBeenCalledWith('light');
  });

  it('should not load diagrams when showPalette is false', async () => {
    const { getDiagrams } = await import('@/services/storage/database');

    renderHook(() => useAppState(false));

    // getDiagrams should not be called when showPalette is false
    expect(getDiagrams).not.toHaveBeenCalled();
  });

  it('should set sidebarOpen state', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.sidebarOpen).toBe(true);

    act(() => {
      result.current.setSidebarOpen(false);
    });
    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should set focusMode state', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.focusMode).toBe(false);

    act(() => {
      result.current.setFocusMode(true);
    });
    expect(result.current.focusMode).toBe(true);
  });

  it('should set renderTimeMs state', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.renderTimeMs).toBeNull();

    act(() => {
      result.current.setRenderTimeMs(150);
    });
    expect(result.current.renderTimeMs).toBe(150);
  });

  it('should set aiSettingsKey state', () => {
    const { result } = renderHook(() => useAppState(false));

    expect(result.current.aiSettingsKey).toBe(0);

    act(() => {
      result.current.setAiSettingsKey(1);
    });
    expect(result.current.aiSettingsKey).toBe(1);
  });

  it('should reload diagrams when refresh is called with showPalette true', async () => {
    const { getDiagrams } = await import('@/services/storage/database');
    const testDiagrams = [{ id: '1', title: 'Test' }];
    (getDiagrams as vi.Mock).mockResolvedValue(testDiagrams);

    const { result } = renderHook(() => useAppState(true));

    // Wait for initial load
    await waitFor(() => {
      expect(getDiagrams).toHaveBeenCalledTimes(1);
    });

    // Clear mock to track new calls
    (getDiagrams as vi.Mock).mockClear();

    // Call refresh
    result.current.refresh();

    // Verify getDiagrams was called again
    await waitFor(() => {
      expect(getDiagrams).toHaveBeenCalledTimes(1);
    });
  });
});
