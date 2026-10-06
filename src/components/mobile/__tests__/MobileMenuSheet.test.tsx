import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenuSheet } from '../MobileMenuSheet';

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

  it('renders menu title, the Android-coming card, and all action items', () => {
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

  it('the Android card is informational only — no premium callback prop', () => {
    // The card must not be wired to any premium/paywall action.
    render(<MobileMenuSheet {...defaultProps} />);
    const card = screen.getByTestId('mobile-menu-android-card');
    expect(card.tagName).toBe('DIV');
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card.getAttribute('class')).not.toContain('cursor-pointer');
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
