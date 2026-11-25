import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WelcomeModal, RELEASES_URL } from '../WelcomeModal';
import { APP_VERSION } from '@/constants/app';
import { RECENT_RELEASES } from '@/utils/releaseNotes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('WelcomeModal (Release Notes)', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the release notes title with the current app version as subtitle', () => {
    render(<WelcomeModal onClose={onClose} />);
    expect(screen.getByText('header.releaseNotes')).toBeInTheDocument();
    expect(screen.getAllByText(`v${APP_VERSION}`).length).toBeGreaterThanOrEqual(1);
  });

  it('renders actual changelog entries for the latest release instead of generic value props', () => {
    render(<WelcomeModal onClose={onClose} />);
    const latestCard = screen.getByTestId('release-notes-latest');
    expect(latestCard).toHaveTextContent(`v${RECENT_RELEASES[0].version}`);
    expect(latestCard).toHaveTextContent(RECENT_RELEASES[0].sections[0].items[0].text);
    expect(screen.queryByText('welcome.valueProp1')).not.toBeInTheDocument();
  });

  it('links to GitHub Releases rather than a raw CHANGELOG.md blob', () => {
    render(<WelcomeModal onClose={onClose} />);
    const releasesLink = screen.getByRole('link', { name: /welcome\.allReleases/ });
    expect(releasesLink).toHaveAttribute('href', RELEASES_URL);
    expect(RELEASES_URL).toBe('https://github.com/CatFoxVoyager/MermaidStudio/releases');
    expect(releasesLink).toHaveAttribute('target', '_blank');
    expect(releasesLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the GitHub card plus the Liberapay support link', () => {
    render(<WelcomeModal onClose={onClose} />);
    const links = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(links).toContain('https://github.com/CatFoxVoyager/MermaidStudio');
    expect(links).toContain('https://liberapay.com/Jeremie/');
  });
});
