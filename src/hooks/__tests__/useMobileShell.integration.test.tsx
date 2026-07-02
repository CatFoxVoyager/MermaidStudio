import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { MobileShellProvider, useMobileShellContext, useMobileShell } from '../useMobileShell';

describe('useMobileShell - Integration (Phase 17)', () => {
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

  describe('MobileShellProvider shared state', () => {
    it('should provide the same state instance to all consumers', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MobileShellProvider>{children}</MobileShellProvider>
      );

      // Render both consumers in the same render cycle to ensure they share the same provider instance
      const { result } = renderHook(
        () => {
          const consumer1 = useMobileShellContext();
          const consumer2 = useMobileShellContext();
          return { consumer1, consumer2 };
        },
        { wrapper }
      );

      // Both should have the same initial state
      expect(result.current.consumer1.activeView).toBe('edit');
      expect(result.current.consumer2.activeView).toBe('edit');
      expect(result.current.consumer1.openDrawer).toBeNull();
      expect(result.current.consumer2.openDrawer).toBeNull();

      // First consumer opens 'colors' drawer
      act(() => {
        result.current.consumer1.setActiveDrawer('colors');
      });

      // Both should see the same state change
      expect(result.current.consumer1.openDrawer).toBe('colors');
      expect(result.current.consumer2.openDrawer).toBe('colors');

      // Second consumer closes the drawer
      act(() => {
        result.current.consumer2.closeDrawer();
      });

      // Both should see the drawer closed
      expect(result.current.consumer1.openDrawer).toBeNull();
      expect(result.current.consumer2.openDrawer).toBeNull();
    });

    it('should throw error when useMobileShellContext is used without provider', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useMobileShellContext());
      }).toThrow('useMobileShellContext must be used within MobileShellProvider');

      console.error = consoleError;
    });
  });

  describe('Cross-phase integration: ModalProvider -> MobileLayout flow', () => {
    it('should allow ModalProvider to trigger drawer state that MobileLayout reads', () => {
      // Simulate the integration flow where ModalProvider calls setActiveDrawer('colors')
      // and MobileLayout should render the Colors drawer based on the shared state

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MobileShellProvider>{children}</MobileShellProvider>
      );

      // Render both consumers in the same render cycle
      const { result } = renderHook(
        () => {
          const modalProviderShell = useMobileShellContext();
          const mobileLayoutShell = useMobileShellContext();
          return { modalProviderShell, mobileLayoutShell };
        },
        { wrapper }
      );

      // Verify both start with no drawer open
      expect(result.current.modalProviderShell.openDrawer).toBeNull();
      expect(result.current.mobileLayoutShell.openDrawer).toBeNull();

      // ModalProvider triggers the 'colors' drawer (simulating CommandPalette selection)
      act(() => {
        result.current.modalProviderShell.setActiveDrawer('colors');
      });

      // MobileLayout should see the 'colors' drawer open and render it
      expect(result.current.mobileLayoutShell.openDrawer).toBe('colors');

      // Verify mutual exclusion works across consumers
      act(() => {
        result.current.modalProviderShell.setActiveDrawer('advanced');
      });

      expect(result.current.mobileLayoutShell.openDrawer).toBe('advanced');

      // Verify toggle works across consumers
      act(() => {
        result.current.modalProviderShell.setActiveDrawer('advanced');
      });

      expect(result.current.mobileLayoutShell.openDrawer).toBeNull();
    });

    it('should preserve all drawer types in shared state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MobileShellProvider>{children}</MobileShellProvider>
      );

      // Render both consumers in the same render cycle
      const { result } = renderHook(
        () => {
          const consumer1 = useMobileShellContext();
          const consumer2 = useMobileShellContext();
          return { consumer1, consumer2 };
        },
        { wrapper }
      );

      // Test all drawer types work across consumers
      const drawerIds = ['files', 'ai', 'colors', 'advanced', 'node', 'edge', 'subgraph'] as const;

      drawerIds.forEach((drawerId) => {
        act(() => {
          result.current.consumer1.setActiveDrawer(drawerId);
        });

        // Both consumers should see the same drawer open
        expect(result.current.consumer1.openDrawer).toBe(drawerId);
        expect(result.current.consumer2.openDrawer).toBe(drawerId);

        // Close it for next iteration
        act(() => {
          result.current.consumer2.closeDrawer();
        });

        expect(result.current.consumer1.openDrawer).toBeNull();
        expect(result.current.consumer2.openDrawer).toBeNull();
      });
    });
  });

  describe('Backwards compatibility: useMobileShell still works', () => {
    it('should preserve the original hook behavior for direct usage', () => {
      // The original useMobileShell hook should still work for non-shared usage
      const { result } = renderHook(() => useMobileShell());

      expect(result.current.activeView).toBe('edit');
      expect(result.current.openDrawer).toBeNull();

      act(() => {
        result.current.setActiveDrawer('ai');
      });

      expect(result.current.openDrawer).toBe('ai');
    });

    it('should maintain MSHL-03 reset behavior in shared context', () => {
      let changeCallback: (() => void) | null = null;

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

      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        mqlMock.media = query;
        return mqlMock;
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MobileShellProvider>{children}</MobileShellProvider>
      );

      const { result } = renderHook(() => useMobileShellContext(), { wrapper });

      // Open a drawer in mobile mode
      act(() => {
        result.current.setActiveDrawer('colors');
      });

      expect(result.current.openDrawer).toBe('colors');

      // Simulate viewport transition to desktop
      act(() => {
        mqlMock.matches = false;
        if (changeCallback) {
          changeCallback();
        }
      });

      // State should reset to defaults
      expect(result.current.openDrawer).toBeNull();
      expect(result.current.activeView).toBe('edit');
    });
  });

  describe('Desktop non-regression', () => {
    it('should not affect desktop usage when provider wraps entire app', () => {
      // Mock desktop viewport
      const desktopMql = {
        matches: false, // Desktop mode
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockImplementation(() => desktopMql);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MobileShellProvider>{children}</MobileShellProvider>
      );

      const { result } = renderHook(() => useMobileShellContext(), { wrapper });

      // Desktop mode - should have defaults and not interfere
      expect(result.current.activeView).toBe('edit');
      expect(result.current.openDrawer).toBeNull();

      // Even if state is changed, it should work correctly
      act(() => {
        result.current.setActiveView('files');
      });

      expect(result.current.activeView).toBe('files');
    });
  });
});
