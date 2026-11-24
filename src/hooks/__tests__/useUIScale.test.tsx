import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import {
  UIScaleProvider,
  useUIScaleContext,
  type UIScaleApi,
} from '@/hooks/useUIScale';
import { applyScale, UI_SCALE_STORAGE_KEY } from '@/utils/uiScale';
import { mockMatchMedia, setViewport } from '@/utils/__tests__/uiScaleTestHelpers';
import { log } from '@/utils/logger';

function Probe({ onValue }: { onValue: (api: UIScaleApi | null) => void }) {
  const api = useUIScaleContext();
  useEffect(() => {
    onValue(api);
  });
  return null;
}

function renderProbe(): { current: () => UIScaleApi | null } {
  let latest: UIScaleApi | null = null;
  render(
    <UIScaleProvider>
      <Probe
        onValue={(api) => {
          latest = api;
        }}
      />
    </UIScaleProvider>
  );
  return { current: () => latest };
}

afterEach(() => {
  cleanup();
  applyScale(1);
  localStorage.removeItem(UI_SCALE_STORAGE_KEY);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('UIScaleProvider', () => {
  it('rend null hors du fournisseur', () => {
    let seen: UIScaleApi | null | undefined;
    render(
      <Probe
        onValue={(api) => {
          seen = api;
        }}
      />
    );
    expect(seen).toBeNull();
  });

  it('profil vierge, 1280 px, pointeur fin → scale 0.8 et --ui-scale vaut 0.8', () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();

    expect(probe.current()).toMatchObject({
      pref: 'auto',
      scale: 0.8,
      autoScale: 0.8,
    });
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.8');
  });

  it('1500 px → scale 1, autoScale null, propriété absente', () => {
    setViewport(1500, 900);
    mockMatchMedia(() => true);

    const probe = renderProbe();

    expect(probe.current()).toMatchObject({
      pref: 'auto',
      scale: 1,
      autoScale: null,
    });
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');
  });

  it('767 px → scale 1, autoScale null, propriété absente', () => {
    setViewport(767, 800);
    mockMatchMedia(() => true);

    const probe = renderProbe();

    expect(probe.current()).toMatchObject({
      pref: 'auto',
      scale: 1,
      autoScale: null,
    });
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');
  });

  it('pointeur grossier → autoScale null, scale 1', () => {
    setViewport(1280, 720);
    mockMatchMedia(() => false);

    const probe = renderProbe();

    expect(probe.current()).toMatchObject({
      pref: 'auto',
      scale: 1,
      autoScale: null,
    });
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');
  });

  it('préférence 0.75 mémorisée → scale 0.75 ; setPref(1.25) persiste et met à jour --ui-scale', () => {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, '0.75');
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();

    expect(probe.current()?.pref).toBe(0.75);
    expect(probe.current()?.scale).toBe(0.75);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.75');

    act(() => {
      probe.current()?.setPref(1.25);
    });

    expect(probe.current()?.pref).toBe(1.25);
    expect(probe.current()?.scale).toBe(1.25);
    expect(localStorage.getItem(UI_SCALE_STORAGE_KEY)).toBe('1.25');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.25');
  });

  it('préférence 1.25 puis largeur 700 → scale 1 ; retour à 1280 → 1.25', () => {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, '1.25');
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();
    expect(probe.current()?.scale).toBe(1.25);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.25');

    act(() => {
      setViewport(700, 800);
      window.dispatchEvent(new Event('resize'));
    });

    expect(probe.current()?.scale).toBe(1);
    expect(probe.current()?.autoScale).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');

    act(() => {
      setViewport(1280, 720);
      window.dispatchEvent(new Event('resize'));
    });

    expect(probe.current()?.scale).toBe(1.25);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.25');
  });

  it('localStorage qui lève → rendu sans exception, scale 0.8', () => {
    vi.spyOn(log, 'debug').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    let probe!: { current: () => UIScaleApi | null };
    expect(() => {
      probe = renderProbe();
    }).not.toThrow();

    expect(probe.current()?.pref).toBe('auto');
    expect(probe.current()?.scale).toBe(0.8);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.8');
  });

  it('expose menuOpen, openMenu et closeMenu mémorisés par useCallback', () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();
    const initialOpen = probe.current()?.openMenu;
    const initialClose = probe.current()?.closeMenu;
    expect(probe.current()?.menuOpen).toBe(false);

    act(() => {
      probe.current()?.openMenu();
    });
    expect(probe.current()?.menuOpen).toBe(true);
    expect(probe.current()?.openMenu).toBe(initialOpen);
    expect(probe.current()?.closeMenu).toBe(initialClose);

    act(() => {
      probe.current()?.closeMenu();
    });
    expect(probe.current()?.menuOpen).toBe(false);
    expect(probe.current()?.openMenu).toBe(initialOpen);
    expect(probe.current()?.closeMenu).toBe(initialClose);
  });

  it('depuis 0.8 auto, stepDown donne la préférence 0.75, stepUp remonte à 0.8, reset met à 1', () => {
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();
    const initialStepDown = probe.current()?.stepDown;
    const initialStepUp = probe.current()?.stepUp;
    const initialReset = probe.current()?.reset;

    expect(probe.current()?.scale).toBe(0.8);

    act(() => {
      probe.current()?.stepDown();
    });
    expect(probe.current()?.pref).toBe(0.75);
    expect(probe.current()?.scale).toBe(0.75);
    expect(localStorage.getItem(UI_SCALE_STORAGE_KEY)).toBe('0.75');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('0.75');

    // Références stables après changement d'échelle, sans fermeture périmée
    expect(probe.current()?.stepDown).toBe(initialStepDown);
    expect(probe.current()?.stepUp).toBe(initialStepUp);
    expect(probe.current()?.reset).toBe(initialReset);

    act(() => {
      probe.current()?.stepUp();
    });
    expect(probe.current()?.pref).toBe(0.8);
    expect(probe.current()?.scale).toBe(0.8);

    act(() => {
      probe.current()?.reset();
    });
    expect(probe.current()?.pref).toBe(1);
    expect(probe.current()?.scale).toBe(1);
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('');
  });

  it('stepDown au plancher (0.5) et stepUp au plafond (1.5) sont sans effet', () => {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, '0.5');
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();
    act(() => {
      probe.current()?.stepDown();
    });
    expect(probe.current()?.pref).toBe(0.5);

    act(() => {
      probe.current()?.setPref(1.5);
    });
    act(() => {
      probe.current()?.stepUp();
    });
    expect(probe.current()?.pref).toBe(1.5);
  });

  it('monte useUIScaleShortcuts : Alt+Minus déclenche stepDown sur window', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    });
    setViewport(1280, 720);
    mockMatchMedia(() => true);

    const probe = renderProbe();
    expect(probe.current()?.scale).toBe(0.8);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Minus', altKey: true, cancelable: true })
      );
    });

    expect(probe.current()?.pref).toBe(0.75);
    expect(probe.current()?.scale).toBe(0.75);
  });
});
