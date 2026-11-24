import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UIScaleMenu } from '@/components/shared/UIScaleMenu';
import { Modal } from '@/components/shared/Modal';
import {
  UIScaleProvider,
  useUIScaleContext,
  type UIScaleApi,
} from '@/hooks/useUIScale';
import {
  applyScale,
  UI_SCALE_STEPS,
  UI_SCALE_STORAGE_KEY,
} from '@/utils/uiScale';
import {
  mockMatchMedia,
  setViewport,
} from '@/utils/__tests__/uiScaleTestHelpers';
import en from '../../../i18n/locales/en.json';

function lookupKey(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let text = lookupKey(en as unknown as Record<string, unknown>, key);
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return text;
    },
    i18n: {
      changeLanguage: vi.fn(() => Promise.resolve()),
      language: 'en',
    },
  }),
}));

function ContextProbe({ onValue }: { onValue: (api: UIScaleApi | null) => void }) {
  const api = useUIScaleContext();
  useEffect(() => {
    onValue(api);
  });
  return null;
}

function renderWithProvider() {
  let latest: UIScaleApi | null = null;
  const result = render(
    <UIScaleProvider>
      <ContextProbe
        onValue={(api) => {
          latest = api;
        }}
      />
      <UIScaleMenu />
    </UIScaleProvider>
  );
  return { ...result, api: () => latest };
}

afterEach(() => {
  cleanup();
  applyScale(1);
  localStorage.removeItem(UI_SCALE_STORAGE_KEY);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('UIScaleMenu', () => {
  it('renders nothing outside UIScaleProvider', () => {
    const { container } = render(<UIScaleMenu />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('ui-scale-button')).not.toBeInTheDocument();
  });

  it('displays 80 at 1280px with aria-haspopup="menu" and accessible label', () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    renderWithProvider();

    const button = screen.getByTestId('ui-scale-button');
    expect(button).toHaveTextContent('80 %');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-label', 'Interface scale: 80 %');
    expect(button).toHaveAttribute('title', 'Interface scale: 80 %');
  });

  it('opens menu with Auto first then nine steps, aria-checked on Auto', async () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const user = userEvent.setup();
    renderWithProvider();

    const button = screen.getByTestId('ui-scale-button');
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByTestId('ui-scale-menu');
    expect(menu).toHaveAttribute('role', 'menu');

    const items = screen.getAllByRole('menuitemradio');
    expect(items).toHaveLength(1 + UI_SCALE_STEPS.length);

    const autoOption = screen.getByTestId('ui-scale-option-auto');
    expect(items[0]).toBe(autoOption);
    expect(autoOption).toHaveAttribute('aria-checked', 'true');
    expect(autoOption).toHaveTextContent('80 % on this screen');

    UI_SCALE_STEPS.forEach((step, idx) => {
      const pct = Math.round(step * 100);
      const opt = screen.getByTestId(`ui-scale-option-${pct}`);
      expect(items[idx + 1]).toBe(opt);
      expect(opt).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('clicking ui-scale-option-100 sets pref to 1, removes --ui-scale, and closes menu', async () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const user = userEvent.setup();
    const { api } = renderWithProvider();

    await user.click(screen.getByTestId('ui-scale-button'));
    await user.click(screen.getByTestId('ui-scale-option-100'));

    expect(api()?.pref).toBe(1);
    expect(api()?.scale).toBe(1);
    expect(localStorage.getItem(UI_SCALE_STORAGE_KEY)).toBe('1');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');
    expect(screen.queryByTestId('ui-scale-menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('ui-scale-button')).toHaveTextContent('100 %');

    await user.click(screen.getByTestId('ui-scale-button'));
    expect(screen.getByTestId('ui-scale-option-100')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('ui-scale-option-auto')).toHaveAttribute('aria-checked', 'false');
  });

  it('dismisses on Escape and on outside click', async () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('ui-scale-button'));
    expect(screen.getByTestId('ui-scale-menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('ui-scale-menu')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('ui-scale-button'));
    expect(screen.getByTestId('ui-scale-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('ui-scale-menu')).not.toBeInTheDocument();
  });

  it('openMenu({ focusTrigger: true }) opens the menu and focuses ui-scale-button even when called repeatedly', () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const { api } = renderWithProvider();
    const button = screen.getByTestId('ui-scale-button');
    const otherButton = document.createElement('button');
    document.body.appendChild(otherButton);
    otherButton.focus();
    expect(document.activeElement).toBe(otherButton);

    act(() => {
      api()?.openMenu({ focusTrigger: true });
    });

    expect(api()?.menuOpen).toBe(true);
    expect(screen.getByTestId('ui-scale-menu')).toBeInTheDocument();
    expect(button).toHaveFocus();

    // Move focus away while menu is still open, then call openMenu({ focusTrigger: true }) again
    otherButton.focus();
    expect(document.activeElement).toBe(otherButton);

    act(() => {
      api()?.openMenu({ focusTrigger: true });
    });

    expect(button).toHaveFocus();

    act(() => {
      api()?.closeMenu();
    });
    expect(api()?.menuOpen).toBe(false);
    expect(screen.queryByTestId('ui-scale-menu')).not.toBeInTheDocument();

    otherButton.remove();
  });

  it('focuses ui-scale-button even when openMenu({ focusTrigger: true }) runs while closing a Modal', async () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    function Harness() {
      const [modalOpen, setModalOpen] = useState(false);
      const api = useUIScaleContext();
      return (
        <>
          <button data-testid="launcher" onClick={() => setModalOpen(true)}>
            Open
          </button>
          <UIScaleMenu />
          {modalOpen && (
            <Modal isOpen={true} onClose={() => setModalOpen(false)} title="Palette">
              <button
                data-testid="palette-scale-cmd"
                onClick={() => {
                  api?.openMenu({ focusTrigger: true });
                  setModalOpen(false);
                }}
              >
                Scale
              </button>
            </Modal>
          )}
        </>
      );
    }

    const user = userEvent.setup();
    render(
      <UIScaleProvider>
        <Harness />
      </UIScaleProvider>
    );

    await user.click(screen.getByTestId('launcher'));
    await user.click(screen.getByTestId('palette-scale-cmd'));

    expect(screen.getByTestId('ui-scale-menu')).toBeInTheDocument();
    expect(screen.getByTestId('ui-scale-button')).toHaveFocus();
  });

  it('omits autoHint outside the auto band and adapts shortcut modifier to macOS', async () => {
    setViewport(1500, 900);
    mockMatchMedia(() => true);
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    );

    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByTestId('ui-scale-button'));
    expect(screen.getByTestId('ui-scale-option-auto')).not.toHaveTextContent('on this screen');
    expect(screen.getByTestId('ui-scale-menu')).toHaveTextContent('Shortcuts: Ctrl + / − / 0');
  });
});
