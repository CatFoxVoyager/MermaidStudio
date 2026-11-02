import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenuSheet } from '../MobileMenuSheet';
import { PLAY_STORE_URL } from '@/constants/playStore';

describe('MobileMenuSheet', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onOpenBackup: vi.fn(),
    onOpenReleaseNotes: vi.fn(),
    onOpenAbout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders menu title, the Play promo card, and all action items', () => {
    render(<MobileMenuSheet {...defaultProps} />);

    // The Android card replaces the former premium upsell on mobile web:
    // promote the native app, never a paywall (user decision 2026-10-04).
    expect(screen.getByTestId('mobile-menu-android-card')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-menu-premium-card')).not.toBeInTheDocument();
    expect(screen.queryByText(/premium/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-menu-item-backup')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-menu-item-language')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-menu-item-releasenotes')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-menu-item-about')).toBeInTheDocument();
  });

  it('the promo card is an external https anchor to the Play listing', () => {
    // DELIBERATE CONTRACT CHANGE (CONTEXT.md, user decision 2026-11-01): the
    // testid `mobile-menu-android-card` is kept, but the element's semantics
    // flip from a non-interactive DIV footnote to a real link — the app is
    // live on Google Play. The card is still NOT wired to any premium/paywall
    // action (no role="button", no cursor-pointer), so the anti-paywall
    // intent of the old assertion is preserved while the tag asserts the new
    // anchor contract.
    render(<MobileMenuSheet {...defaultProps} />);
    const card = screen.getByTestId('mobile-menu-android-card');
    expect(card.tagName).toBe('A');
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card.getAttribute('class')).not.toContain('cursor-pointer');
    // External-link hygiene (reverse-tabnabbing control): plain https
    // listing URL from the shared constant, new tab, no opener/referrer.
    expect(card).toHaveAttribute('href', PLAY_STORE_URL);
    expect(card).toHaveAttribute('target', '_blank');
    expect(card.getAttribute('rel')).toContain('noopener');
    expect(card.getAttribute('rel')).toContain('noreferrer');
    // Official badge asset, EN variant under the setup mock (language en):
    // local /badges/ src — never hot-linked to play.google.com.
    const badge = card.querySelector('img');
    expect(badge).not.toBeNull();
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-en.png');
    expect(badge).toHaveAttribute('alt', 'Get MermaidStudio on Google Play');
  });

  it('renders nothing where the promo card would be inside a native shell', () => {
    // The installed Android app must not promote its own store listing:
    // under the native bridge shape the promo slot renders NO element at
    // all — no placeholder, no reserved space.
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true });
    render(<MobileMenuSheet {...defaultProps} />);
    expect(screen.queryByTestId('mobile-menu-android-card')).not.toBeInTheDocument();
  });

  it('calls onOpenBackup when Backup & Import is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileMenuSheet {...defaultProps} />);

    await user.click(screen.getByTestId('mobile-menu-item-backup'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onOpenBackup).toHaveBeenCalled();
  });

  it('calls onOpenReleaseNotes when Release Notes is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileMenuSheet {...defaultProps} />);

    await user.click(screen.getByTestId('mobile-menu-item-releasenotes'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onOpenReleaseNotes).toHaveBeenCalled();
  });

  it('calls onOpenAbout when About is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileMenuSheet {...defaultProps} />);

    await user.click(screen.getByTestId('mobile-menu-item-about'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onOpenAbout).toHaveBeenCalled();
  });
});
