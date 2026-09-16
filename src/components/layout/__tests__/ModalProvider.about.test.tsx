/**
 * Tests for the About modal wiring inside ModalProvider.
 *
 * Contract under lock:
 * - showAbout renders the AboutModal (and nothing else opens it here);
 * - the About "release notes" button closes About and opens the Welcome
 *   modal (mutual swap — the first-run "nag screen" is re-openable);
 * - the command palette receives onOpenAbout / onOpenReleaseNotes handlers.
 *
 * Stubs expose the props they receive, so these tests lock the ModalProvider
 * wiring; the real components' behavior is covered by their own suites.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalProvider } from '../ModalProvider';
import { MobileShellProvider } from '@/hooks/useMobileShell';

vi.mock('@/components/modals/tools/AboutModal', () => ({
  AboutModal: ({ onClose, onShowReleaseNotes }: { onClose: () => void; onShowReleaseNotes: () => void }) => (
    <div data-testid="about-modal">
      <button onClick={onShowReleaseNotes}>Stub Release Notes</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/tools/CommandPalette', () => ({
  CommandPalette: ({ onClose, onOpenAbout, onOpenReleaseNotes }: {
    onClose: () => void; onOpenAbout: () => void; onOpenReleaseNotes: () => void;
  }) => (
    <div data-testid="command-palette">
      <button onClick={() => { onOpenAbout(); onClose(); }}>Stub About</button>
      <button onClick={() => { onOpenReleaseNotes(); onClose(); }}>Stub Palette Release Notes</button>
    </div>
  ),
}));

vi.mock('@/components/modals/tools/WelcomeModal', () => ({
  WelcomeModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="welcome-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('ModalProvider - About modal wiring', () => {
  const onCloseAbout = vi.fn();
  const onOpenAbout = vi.fn();
  const onOpenWelcome = vi.fn();

  const baseProps = {
    showTemplates: false,
    showHistory: false,
    showExport: false,
    showPalette: false,
    showBackup: false,
    showSaveTemplate: false,
    showAISettings: false,
    showHelp: false,
    showFullscreen: false,
    showWelcome: false,
    showAbout: false,
    onCloseTemplates: vi.fn(),
    onOpenTemplates: vi.fn(),
    onCloseHistory: vi.fn(),
    onCloseExport: vi.fn(),
    onClosePalette: vi.fn(),
    onCloseBackup: vi.fn(),
    onCloseSaveTemplate: vi.fn(),
    onCloseAISettings: vi.fn(),
    onCloseHelp: vi.fn(),
    onCloseFullscreen: vi.fn(),
    onCloseWelcome: vi.fn(),
    toggleAI: vi.fn(),
    toggleTheme: vi.fn(),
    theme: 'dark' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the About modal only when showAbout is true', () => {
    const { rerender } = render(
      <MobileShellProvider>
        <ModalProvider {...baseProps} showAbout onCloseAbout={onCloseAbout} onOpenAbout={onOpenAbout} onOpenWelcome={onOpenWelcome} />
      </MobileShellProvider>,
    );
    expect(screen.getByTestId('about-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument();

    rerender(
      <MobileShellProvider>
        <ModalProvider {...baseProps} showAbout={false} onCloseAbout={onCloseAbout} onOpenAbout={onOpenAbout} onOpenWelcome={onOpenWelcome} />
      </MobileShellProvider>,
    );
    expect(screen.queryByTestId('about-modal')).not.toBeInTheDocument();
  });

  it('swaps About for the Welcome (release notes) modal on the button click', async () => {
    render(
      <MobileShellProvider>
        <ModalProvider {...baseProps} showAbout onCloseAbout={onCloseAbout} onOpenAbout={onOpenAbout} onOpenWelcome={onOpenWelcome} />
      </MobileShellProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Stub Release Notes'));
    expect(onCloseAbout).toHaveBeenCalledTimes(1);
    expect(onOpenWelcome).toHaveBeenCalledTimes(1);
  });

  it('passes About / Release Notes handlers to the command palette', async () => {
    render(
      <MobileShellProvider>
        <ModalProvider
          {...baseProps}
          showPalette
          newDiagram={vi.fn()}
          handleNewFolder={vi.fn()}
          diagrams={[]}
          onOpenDiagram={vi.fn()}
          onCloseAbout={onCloseAbout}
          onOpenAbout={onOpenAbout}
          onOpenWelcome={onOpenWelcome}
        />
      </MobileShellProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Stub About'));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Stub Palette Release Notes'));
    expect(onOpenWelcome).toHaveBeenCalledTimes(1);
  });
});
