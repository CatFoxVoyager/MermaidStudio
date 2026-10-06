/**
 * The old tappable version-badge About entry was removed from the top bar
 * (About moved to the MobileMenuSheet). The remaining About-adjacent
 * contract on this component is the theme button's fallback chain:
 * onToggleTheme when wired, onOpenAbout otherwise. i18n is mocked with
 * t(key) => key.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTopBar } from '../MobileTopBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MobileTopBar - theme button fallback chain', () => {
  const baseProps = {
    onSave: vi.fn(),
    onExport: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onOpenAbout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onToggleTheme when a theme handler is wired', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(<MobileTopBar {...baseProps} onToggleTheme={onToggleTheme} />);
    await user.click(screen.getByTestId('mobile-topbar-theme'));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenAbout).not.toHaveBeenCalled();
  });

  it('falls back to onOpenAbout when no theme handler is wired', async () => {
    const user = userEvent.setup();
    render(<MobileTopBar {...baseProps} onToggleTheme={undefined} />);
    await user.click(screen.getByTestId('mobile-topbar-theme'));
    expect(baseProps.onOpenAbout).toHaveBeenCalledTimes(1);
  });
});
