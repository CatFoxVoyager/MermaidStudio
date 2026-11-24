import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUIScaleShortcuts } from '@/hooks/useUIScaleShortcuts';
import type { UIScaleApi } from '@/hooks/useUIScale';
import { mockMatchMedia } from '@/utils/__tests__/uiScaleTestHelpers';

const WIN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function createMockApi(): UIScaleApi {
  return {
    pref: 'auto',
    scale: 0.8,
    autoScale: 0.8,
    setPref: vi.fn(),
    stepDown: vi.fn(),
    stepUp: vi.fn(),
    reset: vi.fn(),
    menuOpen: false,
    openMenu: vi.fn(),
    closeMenu: vi.fn(),
  };
}

function stubUserAgent(ua: string): void {
  vi.stubGlobal('navigator', { ...navigator, userAgent: ua });
}

function isCaptureOption(options: boolean | AddEventListenerOptions | undefined): boolean {
  return options === true || (typeof options === 'object' && options !== null && options.capture === true);
}

describe('useUIScaleShortcuts', () => {
  let keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  let capturedOptions: boolean | AddEventListenerOptions | undefined;

  beforeEach(() => {
    keydownHandler = null;
    capturedOptions = undefined;
    stubUserAgent(WIN_UA);
    mockMatchMedia(() => false);

    vi.spyOn(window, 'addEventListener').mockImplementation(
      (
        event: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => {
        if (event === 'keydown' && typeof handler === 'function') {
          keydownHandler = handler as (event: KeyboardEvent) => void;
          capturedOptions = options;
        }
      }
    );
  });

  afterEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('enregistre un écouteur keydown en phase capture sur window et le retire au démontage', () => {
    const api = createMockApi();
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useUIScaleShortcuts(api));

    expect(keydownHandler).toBeTypeOf('function');
    expect(isCaptureOption(capturedOptions)).toBe(true);

    unmount();

    const removeCall = removeSpy.mock.calls.find(([ev]) => ev === 'keydown');
    expect(removeCall).toBeDefined();
    expect(removeCall?.[1]).toBe(keydownHandler);
    expect(isCaptureOption(removeCall?.[2])).toBe(true);
  });

  it('Alt+Minus sur une cible <input> appelle stepDown et preventDefault', () => {
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', {
      code: 'Minus',
      altKey: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { writable: false, value: input });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    keydownHandler!(event);

    expect(api.stepDown).toHaveBeenCalledTimes(1);
    expect(api.stepUp).not.toHaveBeenCalled();
    expect(api.reset).not.toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('Alt+Equal avec Maj appelle stepUp et Alt+Digit0 appelle reset', () => {
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const upEvent = new KeyboardEvent('keydown', {
      code: 'Equal',
      altKey: true,
      shiftKey: true,
      cancelable: true,
    });
    const upPrevent = vi.spyOn(upEvent, 'preventDefault');
    keydownHandler!(upEvent);

    expect(api.stepUp).toHaveBeenCalledTimes(1);
    expect(upPrevent).toHaveBeenCalledTimes(1);

    const resetEvent = new KeyboardEvent('keydown', {
      code: 'Digit0',
      altKey: true,
      cancelable: true,
    });
    const resetPrevent = vi.spyOn(resetEvent, 'preventDefault');
    keydownHandler!(resetEvent);

    expect(api.reset).toHaveBeenCalledTimes(1);
    expect(resetPrevent).toHaveBeenCalledTimes(1);
  });

  it('prend en charge les touches du pavé numérique (NumpadSubtract, NumpadAdd, Numpad0)', () => {
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    keydownHandler!(new KeyboardEvent('keydown', { code: 'NumpadSubtract', altKey: true }));
    keydownHandler!(new KeyboardEvent('keydown', { code: 'NumpadAdd', altKey: true }));
    keydownHandler!(new KeyboardEvent('keydown', { code: 'Numpad0', altKey: true }));

    expect(api.stepDown).toHaveBeenCalledTimes(1);
    expect(api.stepUp).toHaveBeenCalledTimes(1);
    expect(api.reset).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Minus dans un onglet ne fait rien ; en PWA installée hors shell natif appelle stepDown', () => {
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const tabEvent = new KeyboardEvent('keydown', {
      code: 'Minus',
      ctrlKey: true,
      cancelable: true,
    });
    const tabPrevent = vi.spyOn(tabEvent, 'preventDefault');
    keydownHandler!(tabEvent);

    expect(api.stepDown).not.toHaveBeenCalled();
    expect(tabPrevent).not.toHaveBeenCalled();

    mockMatchMedia((q) => q.includes('standalone'));

    const pwaEvent = new KeyboardEvent('keydown', {
      code: 'Minus',
      ctrlKey: true,
      cancelable: true,
    });
    const pwaPrevent = vi.spyOn(pwaEvent, 'preventDefault');
    keydownHandler!(pwaEvent);

    expect(api.stepDown).toHaveBeenCalledTimes(1);
    expect(pwaPrevent).toHaveBeenCalledTimes(1);

    const cmdEvent = new KeyboardEvent('keydown', {
      code: 'Equal',
      metaKey: true,
      cancelable: true,
    });
    keydownHandler!(cmdEvent);
    expect(api.stepUp).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Minus dans le shell natif (même standalone) ne fait rien', () => {
    mockMatchMedia((q) => q.includes('standalone'));
    (window as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };

    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const event = new KeyboardEvent('keydown', {
      code: 'Minus',
      ctrlKey: true,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    keydownHandler!(event);

    expect(api.stepDown).not.toHaveBeenCalled();
    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('ignore Ctrl+Alt+Minus (AltGr) même en PWA installée', () => {
    mockMatchMedia((q) => q.includes('standalone'));
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const event = new KeyboardEvent('keydown', {
      code: 'Minus',
      ctrlKey: true,
      altKey: true,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    keydownHandler!(event);

    expect(api.stepDown).not.toHaveBeenCalled();
    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('UA Mac : Alt+Minus ne fait rien (tiret cadratin préservé) ; Ctrl+Minus appelle stepDown', () => {
    stubUserAgent(MAC_UA);
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const altEvent = new KeyboardEvent('keydown', {
      code: 'Minus',
      altKey: true,
      cancelable: true,
    });
    const altPrevent = vi.spyOn(altEvent, 'preventDefault');
    keydownHandler!(altEvent);

    expect(api.stepDown).not.toHaveBeenCalled();
    expect(altPrevent).not.toHaveBeenCalled();

    const ctrlEvent = new KeyboardEvent('keydown', {
      code: 'Minus',
      ctrlKey: true,
      cancelable: true,
    });
    const ctrlPrevent = vi.spyOn(ctrlEvent, 'preventDefault');
    keydownHandler!(ctrlEvent);

    expect(api.stepDown).toHaveBeenCalledTimes(1);
    expect(ctrlPrevent).toHaveBeenCalledTimes(1);
  });

  it('ignore les touches sans rapport', () => {
    const api = createMockApi();
    renderHook(() => useUIScaleShortcuts(api));

    const event = new KeyboardEvent('keydown', {
      code: 'KeyA',
      altKey: true,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    keydownHandler!(event);

    expect(api.stepDown).not.toHaveBeenCalled();
    expect(api.stepUp).not.toHaveBeenCalled();
    expect(api.reset).not.toHaveBeenCalled();
    expect(preventSpy).not.toHaveBeenCalled();
  });
});
