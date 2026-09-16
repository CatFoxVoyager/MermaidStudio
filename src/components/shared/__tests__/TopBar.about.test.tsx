/**
 * Tests for the About / Release Notes entries in the desktop TopBar.
 *
 * Contract under lock:
 * - the top bar exposes "About" and "Release Notes" buttons (desktop parity
 *   with the command palette entries and the mobile top bar);
 * - the version badge in the title is clickable and opens About (same
 *   contract as the empty-state badge and the mobile top bar badge);
 * - without handlers the buttons and the clickable badge stay hidden so the
 *   TopBar keeps working in hosts that don't wire About.
 *
 * i18n is mocked with t(key) => key, so the visible labels are the keys.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from '../TopBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TopBar - About & Release Notes entries', () => {
  const onOpenAbout = vi.fn();
  const onOpenReleaseNotes = vi.fn();

  function renderTopBar(overrides: Record<string, unknown> = {}) {
    return render(
      <TopBar
        theme="dark"
        onToggleTheme={vi.fn()}
        onOpenCommandPalette={vi.fn()}
        onOpenTemplates={vi.fn()}
        sidebarOpen
        onToggleSidebar={vi.fn()}
        onOpenBackup={vi.fn()}
        onFocusMode={vi.fn()}
        focusMode={false}
        language="fr"
        onChangeLanguage={vi.fn()}
        {...overrides}
      />,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows both buttons when handlers are provided', () => {
    renderTopBar({ onOpenAbout, onOpenReleaseNotes });
    expect(screen.getByTestId('topbar-about')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-release-notes')).toBeInTheDocument();
  });

  it('fires the About handler on the About button click', async () => {
    renderTopBar({ onOpenAbout, onOpenReleaseNotes });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('topbar-about'));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });

  it('fires the release-notes handler on the Release Notes button click', async () => {
    renderTopBar({ onOpenAbout, onOpenReleaseNotes });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('topbar-release-notes'));
    expect(onOpenReleaseNotes).toHaveBeenCalledTimes(1);
  });

  it('makes the version badge clickable and opens About', async () => {
    renderTopBar({ onOpenAbout, onOpenReleaseNotes });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('topbar-about-badge'));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });

  it('hides the buttons and the clickable badge without handlers', () => {
    renderTopBar();
    expect(screen.queryByTestId('topbar-about')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topbar-release-notes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topbar-about-badge')).not.toBeInTheDocument();
  });
});
