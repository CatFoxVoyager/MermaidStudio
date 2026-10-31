/**
 * IN-01 pin: the boot-path dynamic imports of '@/lib/mermaid/core' (both
 * boot hooks + useTheme.setDefaultTheme) must end in a `.catch` that logs
 * through the scoped logger. 29-02 turned a formerly impossible failure
 * (static import failing = whole bundle failing) into a per-site rejection;
 * without the catch that surfaces as an unhandled promise rejection at
 * boot. The accepted recovery stays as designed: the splash's 12s swap
 * covers pre-mount failures only (the splash is detached once React
 * mounts), and renderDiagram re-runs doInit per call, so the next render
 * attempt re-initializes once the chunk eventually loads.
 *
 * The mocked module factory throws, so every import() rejects exactly like
 * an offline/5xx chunk fetch does in production.
 */
import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppState } from '../useAppState';
import { useTheme } from '@/hooks/useTheme';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => {
  const log = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    logger: { scope: vi.fn(() => log) },
    storage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  };
});

// Same mock set as useAppState.test.ts (plus getSettings for useTheme).
vi.mock('@/services/storage/database', () => ({
  getDiagrams: vi.fn(() => Promise.resolve([])),
  getDiagram: vi.fn(() => Promise.resolve(null)),
  getSettings: vi.fn(() =>
    Promise.resolve({ theme: 'light', language: 'en', lastOpenDiagramId: null })
  ),
  updateSettings: vi.fn(() => Promise.resolve()),
  updateDiagram: vi.fn(() => Promise.resolve()),
  saveVersion: vi.fn(() => Promise.resolve()),
}));

// The chunk fetch itself fails: the module factory rejects the import.
vi.mock('@/lib/mermaid/core', () => {
  throw new Error('simulated chunk fetch failure: mermaid core');
});

vi.mock('@/constants/themes', () => ({
  getThemeById: vi.fn(() => null),
}));

vi.mock('@/constants/themeDerivation', () => ({
  DEFAULT_LIGHT_THEME: { id: 'default-light', name: 'Default Light' },
  DEFAULT_DARK_THEME: { id: 'default-dark', name: 'Default Dark' },
  extractThemeIdFromContent: vi.fn(() => null),
}));

// scope() returns the same log object to every caller, so this handle is
// the exact mock the hooks' .catch handlers wrote through.
const log = logger.scope('test');

describe('boot-path mermaid chunk failures (IN-01)', () => {
  it('useAppState: a rejected mermaid chunk is logged, not left unhandled', async () => {
    renderHook(() => useAppState());
    await waitFor(() => {
      expect(log.error).toHaveBeenCalledWith(
        'mermaid core chunk failed to load',
        expect.any(Error)
      );
    });
  });

  it('useTheme: a rejected mermaid chunk at boot is logged, not left unhandled', async () => {
    renderHook(() => useTheme());
    await waitFor(() => {
      expect(log.error).toHaveBeenCalledWith(
        'mermaid core chunk failed to load',
        expect.any(Error)
      );
    });
  });

  it('useTheme.setDefaultTheme: a rejected mermaid chunk is logged, not unhandled', async () => {
    const { result } = renderHook(() => useTheme());
    // The boot effect's rejection lands first; clear it so only the
    // setDefaultTheme site's catch is measured.
    await waitFor(() => expect(log.error).toHaveBeenCalled());
    (log.error as Mock).mockClear();

    act(() => result.current.setDefaultTheme(null));
    await waitFor(() => {
      expect(log.error).toHaveBeenCalledWith(
        'mermaid core chunk failed to load',
        expect.any(Error)
      );
    });
  });
});
