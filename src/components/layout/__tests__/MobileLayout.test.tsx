import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileLayout } from '../MobileLayout';
import { MobileShellProvider, useMobileShellContext } from '@/hooks/useMobileShell';

// Mock Sidebar and AIPanel to avoid heavy IndexedDB/AI hook initialization in shell integration test
vi.mock('@/sidebar/Sidebar', () => ({
  Sidebar: ({ onOpenDiagram, activeDiagramId }: { onOpenDiagram: (id: string) => void; activeDiagramId?: string }) => (
    <div data-testid="sidebar-stub" data-active-id={activeDiagramId || 'none'} onClick={() => onOpenDiagram?.('test-diag-1')}>
      Sidebar Stub
    </div>
  ),
}));

vi.mock('@/ai/AIPanel', () => ({
  AIPanel: ({ currentContent, onApply, onClose }: { currentContent: string; onApply: (c: string) => void; onClose?: () => void }) => (
    <div data-testid="ai-panel-stub" data-content={currentContent} onClick={() => onApply?.('test-content')}>
      AI Panel Stub
    </div>
  ),
}));

// Mock MobileWorkspace to avoid CodeMirror/Mermaid initialization in layout integration test
vi.mock('@/components/layout/MobileWorkspace', () => ({
  MobileWorkspace: ({ value, onChange, theme, themeId }: { value: string; onChange: (v: string) => void; theme: string; themeId?: string }) => (
    <div
      data-testid="mobile-workspace"
      data-value={value}
      data-theme={theme}
      data-theme-id={themeId || 'none'}
      onClick={() => onChange?.('test-code-change')}
    >
      MobileWorkspace Stub
    </div>
  ),
}));

// Mock DiagramColorsPanel and AdvancedStylePanel for Phase 17
vi.mock('@/components/modals/settings/DiagramColorsPanel', () => ({
  DiagramColorsPanel: ({ isOpen, currentContent }: { isOpen: boolean; currentContent: string }) => (
    <div data-testid="diagram-colors-stub" data-open={isOpen} data-content={currentContent}>
      DiagramColorsPanel Stub
    </div>
  ),
}));

vi.mock('@/components/modals/settings/AdvancedStylePanel', () => ({
  AdvancedStylePanel: ({ isOpen, currentContent }: { isOpen: boolean; currentContent: string }) => (
    <div data-testid="advanced-style-stub" data-open={isOpen} data-content={currentContent}>
      AdvancedStylePanel Stub
    </div>
  ),
}));

/**
 * Drives the shell context directly. The old tests clicked mobile-nav-*
 * testids that belonged to MobileBottomNav — dead code removed with the
 * bottom-nav slot; today the AI drawer is reached through the menu sheet
 * (GPU-gated row, hidden in jsdom) and style panels through the preview
 * toolbar, so the drawer plumbing is exercised at the context seam.
 */
function ShellProbe() {
  const { setActiveDrawer, openDrawer, closeDrawer } = useMobileShellContext();
  return (
    <div>
      <button onClick={() => setActiveDrawer('ai')}>probe-open-ai</button>
      <button onClick={() => setActiveDrawer('colors')}>probe-open-colors</button>
      <button onClick={() => setActiveDrawer('advanced')}>probe-open-advanced</button>
      <button onClick={closeDrawer}>probe-close</button>
      <span data-testid="probe-open-drawer">{openDrawer ?? 'none'}</span>
    </div>
  );
}

const renderMobileLayout = (props: any, withProbe = false) => {
  return render(
    <MobileShellProvider>
      {withProbe && <ShellProbe />}
      <MobileLayout {...props} />
    </MobileShellProvider>
  );
};

const baseProps = {
  theme: 'light' as const,
  onNewDiagram: vi.fn(),
  onSave: vi.fn(),
  onShowExport: vi.fn(),
  onOpenCommandPalette: vi.fn(),
  onOpenDiagram: vi.fn(),
  activeDiagramId: null,
  onRefresh: vi.fn(),
  onDiagramDeleted: vi.fn(),
  refreshKey: 0,
  currentContent: '',
  onApply: vi.fn(),
  onOpenSettings: vi.fn(),
  settingsKey: 0,
  value: '',
  onContentChange: vi.fn(),
  onSaveTab: vi.fn(),
  onPreviewError: vi.fn(),
};

describe('MobileLayout', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('shell scaffold', () => {
    it('renders root with h-dvh and mobile-layout-root testid', () => {
      const { container } = renderMobileLayout(baseProps);
      const root = container.firstChild as HTMLElement;
      expect(root).toBeInTheDocument();
      expect(root.className).toContain('h-dvh');
      expect(root.className).not.toContain('h-screen');
      expect(root.getAttribute('data-testid')).toBe('mobile-layout-root');
    });

    it('renders dark class only when theme is dark', () => {
      const dark = renderMobileLayout({ ...baseProps, theme: 'dark' });
      expect((dark.container.firstChild as HTMLElement).className).toContain('dark');
      dark.unmount();
      const light = renderMobileLayout({ ...baseProps, theme: 'light' });
      expect((light.container.firstChild as HTMLElement).className).not.toContain('dark');
    });

    it('renders topbar and workspace slots with per-zone safe-area utilities', () => {
      const { container } = renderMobileLayout(baseProps);
      const root = container.firstChild as HTMLElement;
      expect(root.className).not.toContain('safe-top');
      expect(root.className).not.toContain('safe-bottom');

      expect(screen.getByTestId('mobile-topbar-slot').className).toContain('safe-top');
      expect(screen.getByTestId('mobile-workspace-slot').className).toContain('safe-bottom');
      // The bottom-nav slot is gone: navigation lives in the top bar's menu
      // and the workspace segments (MobileBottomNav was dead code).
      expect(screen.queryByTestId('mobile-bottomnav-slot')).not.toBeInTheDocument();
    });

    it('keeps the ad-banner overlay slot at zero height (Phase 32 testid contract)', () => {
      renderMobileLayout(baseProps);
      const slot = screen.getByTestId('mobile-ad-banner-slot');
      expect(slot).toBeInTheDocument();
      expect(slot.style.height).toBe('0px');
    });

    it('renders MobileTopBar inside the topbar slot', () => {
      renderMobileLayout(baseProps);
      const topbarSlot = screen.getByTestId('mobile-topbar-slot');
      expect(within(topbarSlot).getByTestId('mobile-topbar')).toBeInTheDocument();
    });

    it('renders MobileWorkspace inside the workspace slot (Phase 16)', () => {
      renderMobileLayout(baseProps);
      const workspaceSlot = screen.getByTestId('mobile-workspace-slot');
      expect(within(workspaceSlot).getByTestId('mobile-workspace')).toBeInTheDocument();
      expect(within(workspaceSlot).queryByTestId('mobile-topbar')).not.toBeInTheDocument();
    });

    it('threads editor value/onChange/theme through to MobileWorkspace', () => {
      const onContentChange = vi.fn();
      renderMobileLayout({
        ...baseProps,
        value: 'graph TD; A-->B',
        onContentChange,
        theme: 'dark',
      });
      const mobileWorkspace = screen.getByTestId('mobile-workspace');
      expect(mobileWorkspace).toHaveAttribute('data-value', 'graph TD; A-->B');
      expect(mobileWorkspace).toHaveAttribute('data-theme', 'dark');
    });

    it('inherits surface vars from the design system', () => {
      const { container } = renderMobileLayout(baseProps);
      const root = container.firstChild as HTMLElement;
      expect(root.style.background).toBe('var(--surface-base)');
      expect(root.style.color).toBe('var(--text-primary)');
    });
  });

  describe('topbar dirty state threading (critique iter-7)', () => {
    it('disables Save when the active tab is clean', () => {
      renderMobileLayout({ ...baseProps, isDirty: false });
      expect(screen.getByTestId('mobile-topbar-save')).toBeDisabled();
    });

    it('enables Save and shows the dirty dot when the tab is dirty', () => {
      renderMobileLayout({ ...baseProps, isDirty: true });
      expect(screen.getByTestId('mobile-topbar-save')).toBeEnabled();
      expect(screen.getByTestId('mobile-topbar-dirty-dot')).toBeInTheDocument();
    });
  });

  describe('right drawers (AI / Colors / AdvancedStyle)', () => {
    it('opens the AI drawer through the shell context and lazy-mounts the panel', async () => {
      const user = userEvent.setup();
      renderMobileLayout(baseProps, true);
      await user.click(screen.getByText('probe-open-ai'));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('ai-panel-stub')).toBeInTheDocument();
    });

    it('maintains mutual exclusion across drawers', async () => {
      const user = userEvent.setup();
      renderMobileLayout(baseProps, true);
      await user.click(screen.getByText('probe-open-ai'));
      expect(await screen.findByTestId('ai-panel-stub')).toBeInTheDocument();

      await user.click(screen.getByText('probe-open-colors'));
      expect(await screen.findByTestId('diagram-colors-stub')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-panel-stub')).not.toBeInTheDocument();
    });

    it('closes the drawer on backdrop click', async () => {
      const user = userEvent.setup();
      renderMobileLayout(baseProps, true);
      await user.click(screen.getByText('probe-open-ai'));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByTestId('modal-overlay'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByTestId('ai-panel-stub')).not.toBeInTheDocument();
    });
  });

  describe('menu sheet', () => {
    it('opens from the topbar overflow button with Settings and the Android footnote', async () => {
      const user = userEvent.setup();
      const onOpenSettings = vi.fn();
      renderMobileLayout({ ...baseProps, onOpenSettings });
      await user.click(screen.getByTestId('mobile-topbar-overflow'));
      expect(await screen.findByTestId('mobile-menu-sheet')).toBeInTheDocument();

      // The Android note survives as the demoted footnote card.
      expect(screen.getByTestId('mobile-menu-android-card')).toBeInTheDocument();

      // Settings row is wired to the layout's onOpenSettings (and closes
      // the sheet first — so this assertion runs last).
      await user.click(screen.getByTestId('mobile-menu-item-settings'));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('hides the AI row where WebGPU is unavailable (jsdom)', async () => {
      const user = userEvent.setup();
      renderMobileLayout(baseProps);
      await user.click(screen.getByTestId('mobile-topbar-overflow'));
      expect(await screen.findByTestId('mobile-menu-sheet')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-menu-item-ai')).not.toBeInTheDocument();
    });
  });
});
