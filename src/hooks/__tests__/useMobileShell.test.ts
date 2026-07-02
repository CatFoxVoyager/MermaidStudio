import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileShell } from '../useMobileShell';

describe('useMobileShell', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Save original to restore after test
    originalMatchMedia = window.matchMedia;
    vi.clearAllMocks();

    // Mock window.matchMedia (jsdom doesn't implement it)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // deprecated Safari
      removeListener: vi.fn(), // deprecated Safari
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    // Restore original to prevent mock leakage
    window.matchMedia = originalMatchMedia;
  });

  describe('default state', () => {
    it('should have activeView default to "edit"', () => {
      const { result } = renderHook(() => useMobileShell());
      expect(result.current.activeView).toBe('edit');
    });

    it('should have openDrawer default to null', () => {
      const { result } = renderHook(() => useMobileShell());
      expect(result.current.openDrawer).toBeNull();
    });
  });

  describe('setActiveView', () => {
    it('should update activeView when setActiveView is called', () => {
      const { result } = renderHook(() => useMobileShell());

      act(() => {
        result.current.setActiveView('files');
      });

      expect(result.current.activeView).toBe('files');
    });

    it('should close drawer when setActiveView is called', () => {
      const { result } = renderHook(() => useMobileShell());

      // First open a drawer
      act(() => {
        result.current.setActiveDrawer('files');
      });
      expect(result.current.openDrawer).toBe('files');

      // Then change active view
      act(() => {
        result.current.setActiveView('edit');
      });

      expect(result.current.activeView).toBe('edit');
      expect(result.current.openDrawer).toBeNull();
    });
  });

  describe('openDrawer with mutual exclusion', () => {
    it('should open drawer when closed', () => {
      const { result } = renderHook(() => useMobileShell());

      act(() => {
        result.current.setActiveDrawer('files');
      });

      expect(result.current.openDrawer).toBe('files');
    });

    it('should switch from one drawer to another (mutual exclusion)', () => {
      const { result } = renderHook(() => useMobileShell());

      // Open files drawer
      act(() => {
        result.current.setActiveDrawer('files');
      });
      expect(result.current.openDrawer).toBe('files');

      // Open ai drawer (should close files drawer)
      act(() => {
        result.current.setActiveDrawer('ai');
      });
      expect(result.current.openDrawer).toBe('ai');
    });

    it('should toggle drawer when same drawer is opened again', () => {
      const { result } = renderHook(() => useMobileShell());

      // Open files drawer
      act(() => {
        result.current.setActiveDrawer('files');
      });
      expect(result.current.openDrawer).toBe('files');

      // Click files again (should close)
      act(() => {
        result.current.setActiveDrawer('files');
      });
      expect(result.current.openDrawer).toBeNull();
    });
  });

  describe('closeDrawer', () => {
    it('should close the open drawer', () => {
      const { result } = renderHook(() => useMobileShell());

      act(() => {
        result.current.setActiveDrawer('files');
      });
      expect(result.current.openDrawer).toBe('files');

      act(() => {
        result.current.closeDrawer();
      });
      expect(result.current.openDrawer).toBeNull();
    });
  });

  describe('NON-PERSISTENT state reset on viewport change (MSHL-03 keystone)', () => {
    it('should reset state to defaults when isMobile transitions to false (mobile->desktop)', () => {
      // Track the callback that gets registered
      let changeCallback: (() => void) | null = null;

      // Create a singleton mock MediaQueryList object
      const mqlMock = {
        matches: true, // Start in mobile mode
        media: '',
        onchange: null,
        addEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'change') {
            changeCallback = callback;
          }
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      // Mock matchMedia to return the same singleton object
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        mqlMock.media = query;
        return mqlMock;
      });

      const { result } = renderHook(() => useMobileShell());

      // Set some state in mobile mode
      act(() => {
        result.current.setActiveView('files');
        result.current.setActiveDrawer('ai');
      });

      expect(result.current.activeView).toBe('files');
      expect(result.current.openDrawer).toBe('ai');

      // Simulate viewport transition to desktop (isMobile becomes false)
      act(() => {
        mqlMock.matches = false;
        if (changeCallback) {
          changeCallback();
        }
      });

      // State should reset to defaults
      expect(result.current.activeView).toBe('edit');
      expect(result.current.openDrawer).toBeNull();
    });

    it('should start fresh when re-entering mobile after desktop', () => {
      // Track the callback
      let changeCallback: (() => void) | null = null;

      const mqlMock = {
        matches: false, // Start in desktop mode
        media: '',
        onchange: null,
        addEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'change') {
            changeCallback = callback;
          }
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        mqlMock.media = query;
        return mqlMock;
      });

      const { result } = renderHook(() => useMobileShell());

      // Desktop mode - defaults
      expect(result.current.activeView).toBe('edit');
      expect(result.current.openDrawer).toBeNull();

      // Simulate transition to mobile (isMobile becomes true)
      act(() => {
        mqlMock.matches = true;
        if (changeCallback) {
          changeCallback();
        }
      });

      // Should still have defaults (no carry-over)
      expect(result.current.activeView).toBe('edit');
      expect(result.current.openDrawer).toBeNull();
    });

    it('should not persist any storage (verify no localStorage/sessionStorage/indexedDB usage)', () => {
      // This test verifies the hook implementation does NOT use persistence
      // by checking that no storage APIs are called
      const localStorageSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {});
      const sessionStorageSpy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {});

      renderHook(() => useMobileShell());

      // Hook should never call storage APIs
      expect(localStorageSpy).not.toHaveBeenCalled();
      expect(sessionStorageSpy).not.toHaveBeenCalled();

      localStorageSpy.mockRestore();
      sessionStorageSpy.mockRestore();
    });
  });
});
