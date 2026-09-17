/**
 * Tests for the first-run Welcome modal (SXO/audit M4 + Phase 4).
 *
 * The modal leads with a 3-bullet value proposition (what the app does for
 * you), not with per-version release notes in contributor jargon: the
 * changelog is demoted to a link, and donation links (Ko-Fi / Liberapay) sit
 * next to the GitHub card so a first-run visitor can support the project.
 * i18n is mocked with t(key) => key, so assertions target the keys.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WelcomeModal } from '../WelcomeModal';
import { APP_VERSION } from '@/constants/app';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('WelcomeModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the welcome title with the app version as subtitle', () => {
    render(<WelcomeModal onClose={onClose} />);
    expect(screen.getByText('welcome.title')).toBeInTheDocument();
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  });

  it('leads with exactly three value-proposition bullets', () => {
    render(<WelcomeModal onClose={onClose} />);
    const bullets = screen.getAllByText(/welcome\.valueProp\d/);
    expect(bullets).toHaveLength(3);
    expect(screen.getByText('welcome.valueProp1')).toBeInTheDocument();
    expect(screen.getByText('welcome.valueProp2')).toBeInTheDocument();
    expect(screen.getByText('welcome.valueProp3')).toBeInTheDocument();
  });

  it('demotes per-version release notes to a changelog link', () => {
    render(<WelcomeModal onClose={onClose} />);
    // The jargon-y per-version list is gone…
    expect(screen.queryByText(/welcome\.releaseNotes\./)).not.toBeInTheDocument();
    // …replaced by a single link to the repository changelog.
    const changelogLink = screen.getByRole('link', { name: /welcome\.changelogLink/ });
    expect(changelogLink).toHaveAttribute(
      'href',
      'https://github.com/CatFoxVoyager/MermaidStudio/blob/main/CHANGELOG.md'
    );
    expect(changelogLink).toHaveAttribute('target', '_blank');
    expect(changelogLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the GitHub card plus Ko-Fi and Liberapay support links', () => {
    render(<WelcomeModal onClose={onClose} />);
    const koFi = screen.getByRole('link', { name: /support\.koFi/ });
    expect(koFi).toHaveAttribute('href', 'https://ko-fi.com/jeremie93407');
    const links = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(links).toContain('https://github.com/CatFoxVoyager/MermaidStudio');
    expect(links).toContain('https://ko-fi.com/jeremie93407');
    expect(links).toContain('https://liberapay.com/Jeremie/');
  });
});
