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
});
