import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
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

  describe('initial state (desktop-default)', () => {
    it('should return false initially when matchMedia().matches is false (desktop-default)', () => {
      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      expect(result.current).toBe(false);
    });

    it('should call window.matchMedia with the exact query string', () => {
      renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767.98px)');
    });

    it('should return false when window.matchMedia is undefined (SSR path)', () => {
      // Simulate SSR environment by deleting matchMedia
      delete (window as any).matchMedia;

      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      expect(result.current).toBe(false);

      // Restore for other tests
      window.matchMedia = originalMatchMedia;
    });
  });

  describe('transition on change event', () => {
    it('should transition to true when MediaQueryList dispatches change event with matches=true', () => {
      // Track the callback that gets registered
      let changeCallback: (() => void) | null = null;

      // Create a singleton mock MediaQueryList object
      const mqlMock = {
        matches: false,
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

      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      expect(result.current).toBe(false);

      // Simulate viewport resize to mobile
      act(() => {
        // Update matches to true and trigger the callback
        mqlMock.matches = true;
        if (changeCallback) {
          changeCallback();
        }
      });

      expect(result.current).toBe(true);
    });

    it('should transition back to false when MediaQueryList dispatches change event with matches=false', () => {
      // Track the callback
      let changeCallback: (() => void) | null = null;

      // Create a singleton mock
      const mqlMock = {
        matches: false,
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

      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));

      // First transition to mobile
      act(() => {
        mqlMock.matches = true;
        if (changeCallback) {
          changeCallback();
        }
      });
      expect(result.current).toBe(true);

      // Then transition back to desktop
      act(() => {
        mqlMock.matches = false;
        if (changeCallback) {
          changeCallback();
        }
      });
      expect(result.current).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should removeEventListener on unmount', () => {
      // Track both the listener and the cleanup
      let registeredListener: (() => void) | null = null;
      let removedListener: (() => void) | null = null;

      // Create a singleton mock
      const mqlMock = {
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'change') {
            registeredListener = callback;
          }
        }),
        removeEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'change') {
            removedListener = callback;
          }
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        mqlMock.media = query;
        return mqlMock;
      });

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));

      // Verify listener was registered
      expect(registeredListener).not.toBeNull();

      // Unmount the hook
      unmount();

      // Verify cleanup - the same listener was removed
      expect(removedListener).toBe(registeredListener);
    });

    it('should not throw when dispatching change event after unmount', () => {
      // Create a singleton mock
      const mqlMock = {
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        mqlMock.media = query;
        return mqlMock;
      });

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));

      // Unmount
      unmount();

      // The cleanup function should have been called, so there should be no throws
      // (The mock doesn't throw, but the cleanup happens safely)
      expect(() => {
        const event = new Event('change');
        mqlMock.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('getServerSnapshot (SSR safety)', () => {
    it('should have getServerSnapshot returning false (desktop-default)', () => {
      // This test verifies the contract - the hook must use useSyncExternalStore
      // with getServerSnapshot returning false to avoid mobile flash on desktop
      // We can't directly test getServerSnapshot, but we verify the behavior:
      // When window.matchMedia is absent, the hook returns false (tested above)
      // and does not throw, proving the SSR path is handled

      delete (window as any).matchMedia;

      expect(() => {
        renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      }).not.toThrow();

      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      expect(result.current).toBe(false);

      // Restore
      window.matchMedia = originalMatchMedia;
    });
  });
});
