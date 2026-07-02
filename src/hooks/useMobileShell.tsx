import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Mobile view types for the mobile shell navigation.
 * These are the main navigation views in the mobile layout.
 * - 'files': File browser sidebar
 * - 'edit': Workspace editor (default)
 * - 'ai': AI assistant panel
 */
export type MobileView = 'files' | 'edit' | 'ai';

/**
 * Individual drawer IDs for type-safe drawer references.
 * Exported for consumer components (MobileLayout, CommandPalette, etc.).
 */
export type MobileDrawerId = 'files' | 'ai' | 'colors' | 'advanced' | 'node' | 'edge' | 'subgraph';

/**
 * Mobile drawer state - mutually exclusive drawer management.
 * - null: No drawer open
 * - 'files': Sidebar drawer open
 * - 'ai': AI panel drawer open
 * - 'colors': Diagram colors panel drawer open (Phase 17)
 * - 'advanced': Advanced style panel drawer open (Phase 17)
 * - 'node': Node style panel drawer open (Phase 17)
 * - 'edge': Edge style panel drawer open (Phase 17)
 * - 'subgraph': Subgraph style panel drawer open (Phase 17)
 */
export type MobileDrawer = null | MobileDrawerId;

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
  setActiveDrawer: (drawer: MobileDrawerId) => void;
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
  const setActiveDrawer = useCallback((drawer: MobileDrawerId) => {
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

// ============================================================================
// React Context Provider for shared mobile shell state
// ============================================================================

/**
 * Context for sharing mobile shell state across multiple components.
 *
 * This context provides a SINGLE instance of mobile shell state that is shared
 * across MobileLayout and ModalProvider, fixing the cross-phase integration issue
 * where multiple calls to useMobileShell() created independent state instances.
 */
const MobileShellContext = createContext<MobileShellApi | null>(null);

/**
 * Provider component that creates a single instance of mobile shell state
 * and shares it with all consumers via React Context.
 *
 * This component should wrap BOTH AppLayout and ModalProvider in App.tsx to ensure
 * they share the same mobile shell state instance.
 */
export function MobileShellProvider({ children }: { children: React.ReactNode }) {
  const mobileShellState = useMobileShell();

  return (
    <MobileShellContext.Provider value={mobileShellState}>
      {children}
    </MobileShellContext.Provider>
  );
}

/**
 * Hook to consume the shared mobile shell state from context.
 *
 * This hook should be used by components that need access to mobile shell state
 * instead of calling useMobileShell() directly. This ensures all components
 * share the same state instance.
 *
 * @throws {Error} If used outside of MobileShellProvider
 * @returns MobileShellApi from the shared context
 */
export function useMobileShellContext(): MobileShellApi {
  const context = useContext(MobileShellContext);
  if (!context) {
    throw new Error('useMobileShellContext must be used within MobileShellProvider');
  }
  return context;
}
