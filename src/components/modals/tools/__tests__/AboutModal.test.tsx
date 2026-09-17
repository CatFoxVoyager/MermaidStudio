/**
 * Tests for the About modal (who created MermaidStudio and why).
 *
 * The modal reuses the shared `Modal` skeleton (same as WelcomeModal): title
 * + version subtitle, story paragraphs, a "release notes" button that
 * re-opens the first-run welcome modal, the GitHub link and the license
 * line. i18n is mocked with t(key) => key, so assertions target the keys.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutModal } from '../AboutModal';
import { APP_VERSION } from '@/constants/app';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AboutModal', () => {
  const onClose = vi.fn();
  const onShowReleaseNotes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the about title with the app version as subtitle', () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    expect(screen.getByText('about.title')).toBeInTheDocument();
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  });

  it('renders the why/who story and the license line', () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    expect(screen.getByText('about.why')).toBeInTheDocument();
    expect(screen.getByText('about.how')).toBeInTheDocument();
    expect(screen.getByText('about.license')).toBeInTheDocument();
  });

  it('links to the public GitHub repository', () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    // Scoped by name: the modal also carries Ko-Fi / Liberapay links.
    const link = screen.getByRole('link', { name: /about\.github/ });
    expect(link).toHaveAttribute('href', 'https://github.com/CatFoxVoyager/MermaidStudio');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the Ko-Fi and Liberapay support links next to the GitHub card', () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    const koFi = screen.getByRole('link', { name: /support\.koFi/ });
    expect(koFi).toHaveAttribute('href', 'https://ko-fi.com/jeremie93407');
    expect(koFi).toHaveAttribute('target', '_blank');
    const liberapay = screen.getByRole('link', { name: /support\.liberapay/ });
    expect(liberapay).toHaveAttribute('href', 'https://liberapay.com/Jeremie/');
    expect(liberapay).toHaveAttribute('target', '_blank');
  });

  it('opens the release-notes modal when the button is clicked', async () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'about.releaseNotesButton' }));
    expect(onShowReleaseNotes).toHaveBeenCalledTimes(1);
    // Opening the release notes must not go through the plain close path.
    expect(onClose).not.toHaveBeenCalled();
  });
});
