/**
 * Tests for the tappable version badge in the mobile top bar.
 *
 * The "v{APP_VERSION}" span inside the brand block is the mobile entry
 * point to the About modal. i18n is mocked with t(key) => key.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTopBar } from '../MobileTopBar';
import { APP_VERSION } from '@/constants/app';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MobileTopBar - About version badge', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onNewDiagram: vi.fn(),
    onExport: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onOpenAbout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the version badge as a tappable button', () => {
    render(<MobileTopBar {...defaultProps} />);
    const badge = screen.getByTestId('mobile-topbar-about');
    expect(badge.tagName).toBe('BUTTON');
    expect(badge).toHaveTextContent(`v${APP_VERSION}`);
  });

  it('opens the About modal when the badge is tapped', async () => {
    render(<MobileTopBar {...defaultProps} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('mobile-topbar-about'));
    expect(defaultProps.onOpenAbout).toHaveBeenCalledTimes(1);
  });
});
