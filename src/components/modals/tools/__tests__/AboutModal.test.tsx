/**
 * Tests for the About modal (who created MermaidStudio and why).
 *
 * The modal reuses the shared `Modal` skeleton (same as WelcomeModal): title
 * + version subtitle, story paragraphs, a "release notes" button that
 * re-opens the first-run welcome modal, the GitHub link and the license
 * line. i18n is mocked with t(key) => key, so assertions target the keys.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutModal } from '../AboutModal';
import { APP_VERSION } from '@/constants/app';
import { PLAY_STORE_URL } from '@/constants/playStore';

let mockLanguage = 'en';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: mockLanguage },
  }),
}));

describe('AboutModal', () => {
  const onClose = vi.fn();
  const onShowReleaseNotes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'en';
  });

  afterEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
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
    // Scoped by name: the modal also carries the Liberapay support link.
    const link = screen.getByRole('link', { name: /about\.github/ });
    expect(link).toHaveAttribute('href', 'https://github.com/CatFoxVoyager/MermaidStudio');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the Liberapay support link next to the GitHub card', () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
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

  it('shows the Android Google Play app card with local badge on the web', () => {
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    const card = screen.getByTestId('about-android-card');
    expect(card).toHaveAttribute('href', PLAY_STORE_URL);
    expect(card).toHaveAttribute('target', '_blank');
    expect(card).toHaveAttribute('rel', 'noopener noreferrer');
    const badge = card.querySelector('img');
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-en.png');
  });

  it('switches the Google Play badge to French when language is fr', () => {
    mockLanguage = 'fr';
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    const badge = screen.getByTestId('about-android-card').querySelector('img');
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-fr.png');
  });

  it('hides the Android Play card inside the installed native Android app', () => {
    (window as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    render(<AboutModal onClose={onClose} onShowReleaseNotes={onShowReleaseNotes} />);
    expect(screen.queryByTestId('about-android-card')).not.toBeInTheDocument();
  });
});
