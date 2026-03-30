/**
 * Tests for useLanguage hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLanguage } from '../useLanguage';

// Mock database functions
vi.mock('@/services/storage/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/storage/database')>();
  return {
    ...actual,
    getSettings: vi.fn(() => Promise.resolve({
      theme: 'light',
      language: 'en',
      lastOpenDiagramId: null,
    })),
    updateSettings: vi.fn(() => Promise.resolve()),
  };
});

// Mock react-i18next
const changeLanguageMock = vi.fn(() => Promise.resolve());
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage: changeLanguageMock,
    },
  }),
}));

describe('useLanguage Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeLanguageMock.mockClear();
  });

  describe('Initialization', () => {
    it('should initialize with en as default language when settings have no language', async () => {
      const { getSettings } = await import('@/services/storage/database');
      (getSettings as any).mockResolvedValueOnce({
        theme: 'light',
        language: null,
        lastOpenDiagramId: null,
      });

      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });
    });

    it('should initialize with stored language from getSettings', async () => {
      const { getSettings } = await import('@/services/storage/database');
      (getSettings as any).mockResolvedValueOnce({
        theme: 'light',
        language: 'fr',
        lastOpenDiagramId: null,
      });

      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('fr');
      });
    });
  });

  describe('setLanguage', () => {
    it('should update the language state when setLanguage is called', async () => {
      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });

      act(() => {
        result.current.setLanguage('fr');
      });

      expect(result.current.language).toBe('fr');
    });

    it('should call updateSettings with new language when language changes', async () => {
      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });

      const { updateSettings } = await import('@/services/storage/database');

      await act(async () => {
        await result.current.setLanguage('fr');
      });

      expect(updateSettings).toHaveBeenCalledWith({ language: 'fr' });
    });
  });

  describe('toggle', () => {
    it('should switch between en and fr when toggle is called', async () => {
      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });

      act(() => {
        result.current.toggle();
      });

      expect(result.current.language).toBe('fr');

      act(() => {
        result.current.toggle();
      });

      expect(result.current.language).toBe('en');
    });
  });

  describe('i18n Integration', () => {
    it('should not call i18n.changeLanguage before initialized', async () => {
      const initialCallCount = changeLanguageMock.mock.calls.length;

      const { result } = renderHook(() => useLanguage());

      // Before initialization completes, changeLanguage should not be called
      expect(changeLanguageMock).toHaveBeenCalledTimes(initialCallCount);

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });
    });

    it('should call i18n.changeLanguage after language changes', async () => {
      const { result } = renderHook(() => useLanguage());

      await waitFor(() => {
        expect(result.current.language).toBe('en');
      });

      changeLanguageMock.mockClear();

      act(() => {
        result.current.setLanguage('fr');
      });

      // Wait for the effect to run
      await waitFor(() => {
        expect(result.current.language).toBe('fr');
      });

      expect(changeLanguageMock).toHaveBeenCalledWith('fr');
    });
  });
});
