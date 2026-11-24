import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';
import { UIScaleProvider } from '@/hooks/useUIScale';
import { UI_SCALE_STORAGE_KEY } from '@/utils/uiScale';
import { mockMatchMedia, setViewport } from '@/utils/__tests__/uiScaleTestHelpers';

const openMenuSpy = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useUIScale', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useUIScale')>();
  return {
    ...actual,
    useUIScaleContext: () => {
      const ctx = actual.useUIScaleContext();
      if (!ctx) return null;
      return {
        ...ctx,
        openMenu: (opts?: { focusTrigger?: boolean }) => {
          openMenuSpy(opts);
          ctx.openMenu(opts);
        },
      };
    },
  };
});

Element.prototype.scrollIntoView = vi.fn();

function createProps(onClose = vi.fn()) {
  return {
    onClose,
    onNewDiagram: vi.fn(),
    onNewFolder: vi.fn(),
    onOpenTemplates: vi.fn(),
    onToggleHistory: vi.fn(),
    onToggleAI: vi.fn(),
    onToggleTheme: vi.fn(),
    theme: 'dark' as const,
    diagrams: [],
    onOpenDiagram: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  localStorage.removeItem(UI_SCALE_STORAGE_KEY);
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('CommandPalette - UI scale command', () => {
  it('shows ui-scale in the Settings category inside UIScaleProvider and calls onClose then openMenu({ focusTrigger: true })', async () => {
    setViewport(1280, 720);
    mockMatchMedia((query) => query !== '(max-width: 767.98px)');

    const onClose = vi.fn();
    render(
      <UIScaleProvider>
        <CommandPalette {...createProps(onClose)} />
      </UIScaleProvider>
    );

    const settingsHeading = screen.getByText('commands.categorySettings');
    const settingsGroup = settingsHeading.parentElement!;
    expect(within(settingsGroup).getByText('commands.uiScale')).toBeInTheDocument();
    expect(within(settingsGroup).getByText('commands.uiScaleDesc')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(within(settingsGroup).getByText('commands.uiScale'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openMenuSpy).toHaveBeenCalledTimes(1);
    expect(openMenuSpy).toHaveBeenCalledWith({ focusTrigger: true });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      openMenuSpy.mock.invocationCallOrder[0]
    );
  });

  it('prevents default Enter behavior when activating ui-scale via keyboard so focus transfer does not click the trigger button', async () => {
    setViewport(1280, 720);
    mockMatchMedia((query) => query !== '(max-width: 767.98px)');

    const onClose = vi.fn();
    render(
      <UIScaleProvider>
        <CommandPalette {...createProps(onClose)} />
      </UIScaleProvider>
    );

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('commands.searchPlaceholder');
    await user.type(input, 'commands.uiScale');

    let enterDefaultPrevented = false;
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') enterDefaultPrevented = e.defaultPrevented;
    };
    window.addEventListener('keydown', onWindowKeyDown);

    await user.keyboard('{Enter}');
    window.removeEventListener('keydown', onWindowKeyDown);

    expect(enterDefaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openMenuSpy).toHaveBeenCalledWith({ focusTrigger: true });
  });

  it('omits the ui-scale command when rendered outside UIScaleProvider', () => {
    setViewport(1280, 720);
    mockMatchMedia((query) => query !== '(max-width: 767.98px)');

    render(<CommandPalette {...createProps()} />);

    expect(screen.queryByText('commands.uiScale')).not.toBeInTheDocument();
    expect(screen.queryByText('commands.uiScaleDesc')).not.toBeInTheDocument();
  });

  it('omits the ui-scale command on mobile matchMedia even inside UIScaleProvider', () => {
    setViewport(390, 844);
    mockMatchMedia((query) => query === '(max-width: 767.98px)');

    render(
      <UIScaleProvider>
        <CommandPalette {...createProps()} />
      </UIScaleProvider>
    );

    expect(screen.queryByText('commands.uiScale')).not.toBeInTheDocument();
    expect(screen.queryByText('commands.uiScaleDesc')).not.toBeInTheDocument();
  });
});
