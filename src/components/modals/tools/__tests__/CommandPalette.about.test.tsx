/**
 * Tests for the About / Release Notes commands in the command palette.
 *
 * Both commands live in the Settings category and close the palette after
 * firing their handler (same contract as every other palette command).
 * i18n is mocked with t(key) => key, so the visible labels are the keys.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock scrollIntoView for jsdom (same pattern as AIPanel / PreviewPanel tests)
Element.prototype.scrollIntoView = vi.fn();

describe('CommandPalette - About & Release Notes commands', () => {
  const onClose = vi.fn();
  const onOpenAbout = vi.fn();
  const onOpenReleaseNotes = vi.fn();

  function renderPalette() {
    render(
      <CommandPalette
        onClose={onClose}
        onNewDiagram={vi.fn()}
        onNewFolder={vi.fn()}
        onOpenTemplates={vi.fn()}
        onToggleHistory={vi.fn()}
        onToggleAI={vi.fn()}
        onToggleTheme={vi.fn()}
        theme="dark"
        diagrams={[]}
        onOpenDiagram={vi.fn()}
        onOpenAbout={onOpenAbout}
        onOpenReleaseNotes={onOpenReleaseNotes}
      />,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows both commands in the Settings category', () => {
    renderPalette();
    expect(screen.getByText('commands.about')).toBeInTheDocument();
    expect(screen.getByText('commands.releaseNotes')).toBeInTheDocument();
  });

  it('closes the palette and fires the handler for the About command', async () => {
    renderPalette();
    const user = userEvent.setup();
    await user.click(screen.getByText('commands.about'));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the palette and fires the handler for the Release Notes command', async () => {
    renderPalette();
    const user = userEvent.setup();
    await user.click(screen.getByText('commands.releaseNotes'));
    expect(onOpenReleaseNotes).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
