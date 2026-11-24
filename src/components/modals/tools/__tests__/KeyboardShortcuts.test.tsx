import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { KeyboardShortcuts } from '../KeyboardShortcuts';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const WIN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('KeyboardShortcuts', () => {
  it('displays the Interface group with Alt shortcuts on non-Mac platforms', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: WIN_UA });
    render(<KeyboardShortcuts onClose={vi.fn()} />);

    expect(screen.getByText('shortcuts.interface')).toBeInTheDocument();
    expect(screen.getByText('shortcuts.uiScaleIn')).toBeInTheDocument();
    expect(screen.getByText('shortcuts.uiScaleOut')).toBeInTheDocument();
    expect(screen.getByText('shortcuts.uiScaleReset')).toBeInTheDocument();

    expect(screen.getByText('Alt++')).toBeInTheDocument();
    expect(screen.getByText('Alt+−')).toBeInTheDocument();
    expect(screen.getByText('Alt+0')).toBeInTheDocument();
  });

  it('displays the Interface group with Ctrl shortcuts on macOS', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: MAC_UA });
    render(<KeyboardShortcuts onClose={vi.fn()} />);

    expect(screen.getByText('shortcuts.interface')).toBeInTheDocument();
    expect(screen.getByText('Ctrl++')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+−')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+0')).toBeInTheDocument();
  });
});
