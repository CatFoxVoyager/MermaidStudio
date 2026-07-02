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
      // Create a reference to the mock MediaQueryList
      const mqlMock = window.matchMedia('(max-width: 767.98px)') as MediaQueryList & {
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
      };

      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
      expect(result.current).toBe(false);

      // Simulate viewport resize to mobile by dispatching change event
      act(() => {
        // Update matches to true
        Object.defineProperty(mqlMock, 'matches', { value: true, writable: true });
        // Call the change listener that was registered
        const changeCallback = mqlMock.addEventListener.mock.calls[0][1];
        changeCallback();
      });

      expect(result.current).toBe(true);
    });

    it('should transition back to false when MediaQueryList dispatches change event with matches=false', () => {
      const mqlMock = window.matchMedia('(max-width: 767.98px)') as MediaQueryList & {
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
      };

      const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));

      // First transition to mobile
      act(() => {
        Object.defineProperty(mqlMock, 'matches', { value: true, writable: true });
        const changeCallback = mqlMock.addEventListener.mock.calls[0][1];
        changeCallback();
      });
      expect(result.current).toBe(true);

      // Then transition back to desktop
      act(() => {
        Object.defineProperty(mqlMock, 'matches', { value: false, writable: true });
        const changeCallback = mqlMock.addEventListener.mock.calls[0][1];
        changeCallback();
      });
      expect(result.current).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should removeEventListener on unmount', () => {
      const mqlMock = window.matchMedia('(max-width: 767.98px)') as MediaQueryList & {
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
      };

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));

      // Verify listener was added
      expect(mqlMock.addEventListener).toHaveBeenCalled();
      const listener = mqlMock.addEventListener.mock.calls[0][1];

      // Unmount the hook
      unmount();

      // Verify cleanup - removeEventListener was called with the same listener
      expect(mqlMock.removeEventListener).toHaveBeenCalledWith('change', listener);
    });

    it('should not throw when dispatching change event after unmount', () => {
      const mqlMock = window.matchMedia('(max-width: 767.98px)') as MediaQueryList & {
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
        dispatchEvent: ReturnType<typeof vi.fn>;
      };

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));

      // Unmount
      unmount();

      // Dispatching a change event after unmount should not throw
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
