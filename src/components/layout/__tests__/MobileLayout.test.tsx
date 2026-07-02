import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileLayout } from '../MobileLayout';

// Mock Sidebar and AIPanel to avoid heavy IndexedDB/AI hook initialization in shell integration test
vi.mock('@/sidebar/Sidebar', () => ({
  Sidebar: ({ onOpenDiagram, activeDiagramId }: { onOpenDiagram: (id: string) => void; activeDiagramId?: string }) => (
    <div data-testid="sidebar-stub" data-active-id={activeDiagramId || 'none'} onClick={() => onOpenDiagram?.('test-diag-1')}>
      Sidebar Stub
    </div>
  ),
}));

vi.mock('@/ai/AIPanel', () => ({
  AIPanel: ({ currentContent, onApply }: { currentContent: string; onApply: (c: string) => void }) => (
    <div data-testid="ai-panel-stub" data-content={currentContent} onClick={() => onApply?.('test-content')}>
      AI Panel Stub
    </div>
  ),
}));

describe('MobileLayout', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Save original to restore after test
    originalMatchMedia = window.matchMedia;
    vi.clearAllMocks();

    // Mock window.matchMedia (jsdom doesn't implement it)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true, // Default to mobile viewport for MobileLayout tests
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // deprecated Safari
      removeListener: vi.fn(), // deprecated Safari
      dispatchEvent: vi.fn(),
    }));
  });

  });

  afterEach(() => {
    // Restore original to prevent mock leakage
    window.matchMedia = originalMatchMedia;
  });

  describe('Phase 14 scaffold tests (regression guard)', () => {
    it('should render root with h-dvh class and mobile-layout-root testid', () => {
      const { container } = render(
        <MobileLayout
          theme="light"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      const root = container.firstChild as HTMLElement;
      expect(root).toBeInTheDocument();
      expect(root.className).toContain('h-dvh');
      expect(root.className).not.toContain('h-screen');
      expect(root.getAttribute('data-testid')).toBe('mobile-layout-root');
    });

    it('should render dark class when theme is dark', () => {
      const { container } = render(
        <MobileLayout
          theme="dark"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('dark');
    });

    it('should not render dark class when theme is light', () => {
      const { container } = render(
        <MobileLayout
          theme="light"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).not.toContain('dark');
    });

    it('should render three placeholder slots with correct testids', () => {
      render(
        <MobileLayout
          theme="light"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      expect(screen.getByTestId('mobile-topbar-slot')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-workspace-slot')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-bottomnav-slot')).toBeInTheDocument();
    });

    it('should apply per-zone safe-area utilities (never on root)', () => {
      const { container } = render(
        <MobileLayout
          theme="light"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).not.toContain('safe-top');
      expect(root.className).not.toContain('safe-bottom');

      const topbarSlot = screen.getByTestId('mobile-topbar-slot');
      expect(topbarSlot.className).toContain('safe-top');

      const bottomnavSlot = screen.getByTestId('mobile-bottomnav-slot');
      expect(bottomnavSlot.className).toContain('safe-bottom');
    });

    it('should apply z-index token only to bottom-nav slot', () => {
      render(
        <MobileLayout
          theme="light"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      const bottomnavSlot = screen.getByTestId('mobile-bottomnav-slot');
      expect(bottomnavSlot.className).toContain('z-[var(--z-bottom-nav)]');

      const topbarSlot = screen.getByTestId('mobile-topbar-slot');
      expect(topbarSlot.className).not.toContain('z-[var(--z-');
    });

    it('should inherit surface vars from existing design system', () => {
      const { container } = render(
        <MobileLayout
          theme="light"
          onNewDiagram={vi.fn()}
          onSave={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenDiagram={vi.fn()}
          activeDiagramId={null}
          onRefresh={vi.fn()}
          onDiagramDeleted={vi.fn()}
          refreshKey={0}
          currentContent=""
          onApply={vi.fn()}
          onOpenSettings={vi.fn()}
          settingsKey={0}
        />
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.background).toBe('var(--surface-base)');
      expect(root.style.color).toBe('var(--text-primary)');
    });
  });

  describe('Mobile shell integration (Plan 15-04)', () => {
    const defaultProps = {
      theme: 'light' as const,
      onNewDiagram: vi.fn(),
      onSave: vi.fn(),
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
    };

    it('should render MobileTopBar inside mobile-topbar-slot', () => {
      render(<MobileLayout {...defaultProps} />);
      const topbarSlot = screen.getByTestId('mobile-topbar-slot');
      expect(within(topbarSlot).getByTestId('mobile-topbar')).toBeInTheDocument();
    });

    it('should render MobileBottomNav inside mobile-bottomnav-slot', () => {
      render(<MobileLayout {...defaultProps} />);
      const bottomnavSlot = screen.getByTestId('mobile-bottomnav-slot');
      expect(within(bottomnavSlot).getByTestId('mobile-nav-files')).toBeInTheDocument();
    });

    it('should remove Phase 14 placeholder text labels', () => {
      render(<MobileLayout {...defaultProps} />);
      expect(screen.queryByText('TopBar slot')).toBeNull();
      expect(screen.queryByText('Bottom Nav slot')).toBeNull();
    });

    it('should preserve workspace slot placeholder (Phase 16 scope)', () => {
      render(<MobileLayout {...defaultProps} />);
      expect(screen.getByTestId('mobile-workspace-slot')).toBeInTheDocument();

      const workspaceSlot = screen.getByTestId('mobile-workspace-slot');
      expect(within(workspaceSlot).queryByTestId('mobile-topbar')).not.toBeInTheDocument();
      expect(within(workspaceSlot).queryByTestId('mobile-nav-files')).not.toBeInTheDocument();
    });

    it('should open Files drawer when tapping mobile-nav-files', async () => {
      const user = userEvent.setup();
      render(<MobileLayout {...defaultProps} />);

      await user.click(screen.getByTestId('mobile-nav-files'));

      // Modal drawer should appear with role="dialog"
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Sidebar stub content should be visible
      expect(screen.getByTestId('sidebar-stub')).toBeInTheDocument();
    });

    it('should maintain mutual exclusion when switching drawers', async () => {
      const user = userEvent.setup();
      render(<MobileLayout {...defaultProps} />);

      // Open Files drawer
      await user.click(screen.getByTestId('mobile-nav-files'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-stub')).toBeInTheDocument();

      // Switch to AI drawer (Files drawer should close)
      await user.click(screen.getByTestId('mobile-nav-ai'));

      // Should still be only one dialog (mutual exclusion)
      const dialogs = screen.getAllByRole('dialog');
      expect(dialogs).toHaveLength(1);

      // AI panel should now be visible
      expect(screen.getByTestId('ai-panel-stub')).toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-stub')).not.toBeInTheDocument();
    });

    it('should close drawer when clicking backdrop overlay', async () => {
      const user = userEvent.setup();
      render(<MobileLayout {...defaultProps} />);

      // Open Files drawer
      await user.click(screen.getByTestId('mobile-nav-files'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click backdrop overlay
      await user.click(screen.getByTestId('modal-overlay'));

      // Drawer should close
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByTestId('sidebar-stub')).not.toBeInTheDocument();
    });

    it('should accept full prop surface without crashing', () => {
      expect(() => {
        render(<MobileLayout {...defaultProps} />);
      }).not.toThrow();
    });
  });
});
