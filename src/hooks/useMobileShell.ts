import { useState, useCallback, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Mobile view types for the mobile shell navigation.
 * - 'files': File browser sidebar
 * - 'edit': Workspace editor (default)
 * - 'ai': AI assistant panel
 */
export type MobileView = 'files' | 'edit' | 'ai';

/**
 * Mobile drawer state - mutually exclusive drawer management.
 * - null: No drawer open
 * - 'files': Sidebar drawer open
 * - 'ai': AI panel drawer open
 */
export type MobileDrawer = null | 'files' | 'ai';

/**
 * API surface for the useMobileShell hook.
 * Provides state and actions for managing mobile-specific UI state.
 */
export interface MobileShellApi {
  /** The currently active mobile view */
  activeView: MobileView;
  /** The currently open drawer (null if none) */
  openDrawer: MobileDrawer;
  /** Set the active view and close any open drawer */
  setActiveView: (view: MobileView) => void;
  /** Open a drawer (mutual exclusion - closes other drawers; toggles if same drawer) */
  setActiveDrawer: (drawer: 'files' | 'ai') => void;
  /** Close the currently open drawer */
  closeDrawer: () => void;
}

/**
 * Mobile shell state management hook (MSHL-03).
 *
 * This hook manages mobile-only UI state separately from desktop state to prevent
 * cross-bleed on viewport changes. The state is NON-PERSISTENT and resets to
 * defaults when the viewport transitions from mobile to desktop.
 *
 * Key behaviors:
 * - Default active view is 'edit' (workspace)
 * - Opening a drawer uses mutual exclusion (one drawer open at a time)
 * - Clicking the same drawer again toggles it closed
 * - State resets to defaults when isMobile becomes false (desktop transition)
 * - No persistence to localStorage, sessionStorage, or IndexedDB
 *
 * @returns MobileShellApi with state and actions
 */
export function useMobileShell(): MobileShellApi {
  // Default state: active view is 'edit' (workspace), no drawer open
  const [activeView, setActiveViewState] = useState<MobileView>('edit');
  const [openDrawerState, setOpenDrawerState] = useState<MobileDrawer>(null);

  // Subscribe to viewport changes for NON-PERSISTENT state reset (MSHL-03 keystone)
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  // Reset state to defaults when leaving mobile viewport
  // This prevents cross-bleed between mobile and desktop state
  useEffect(() => {
    if (!isMobile) {
      setActiveViewState('edit');
      setOpenDrawerState(null);
    }
  }, [isMobile]);

  // Set active view and close any open drawer
  const setActiveView = useCallback((view: MobileView) => {
    setActiveViewState(view);
    setOpenDrawerState(null);
  }, []);

  // Open drawer with mutual exclusion and same-drawer toggle
  // - If the same drawer is clicked, close it
  // - If a different drawer is clicked, switch to it (mutual exclusion)
  const setActiveDrawer = useCallback((drawer: 'files' | 'ai') => {
    setOpenDrawerState((prev) => (prev === drawer ? null : drawer));
  }, []);

  // Close the currently open drawer
  const closeDrawer = useCallback(() => {
    setOpenDrawerState(null);
  }, []);

  return {
    activeView,
    openDrawer: openDrawerState,
    setActiveView,
    setActiveDrawer,
    closeDrawer,
  };
}
