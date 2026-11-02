import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Relative (not @/) imports: the tsconfig paths alias does not resolve .json
// ids under the vitest transform ("Failed to resolve import
// @/i18n/locales/en.json") — the repo's own src/i18n/config.ts imports the
// catalogs the same relative way (pattern proven in 34-01).
import en from '../../../i18n/locales/en.json';
import fr from '../../../i18n/locales/fr.json';
import { render, screen } from '@testing-library/react';
import { MobileUpsellBanner } from '../MobileUpsellBanner';

// Mutable language holder shared with the hoisted mock factory below:
// flip it per test, restore 'en' in beforeEach. vi.hoisted is required
// because vi.mock registrations are hoisted above module body statements.
const i18nMock = vi.hoisted(() => ({ language: 'en' }));

// File-level mock — OVERRIDES the setup-file global react-i18next mock for
// this file only. `t` resolves dot-paths against the REAL catalogs (imported
// above): asserting a rendered catalog string doubles as proof the key
// exists in that catalog — expected strings are never hand-typed.
vi.mock('react-i18next', () => {
  const resolve = (
    catalog: Record<string, unknown>,
    key: string,
    defaultValue?: string
  ): string => {
    let current: unknown = catalog;
    for (const part of key.split('.')) {
      if (
        current &&
        typeof current === 'object' &&
        part in (current as Record<string, unknown>)
      ) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return defaultValue ?? key; // i18next-style missing-key fallback
      }
    }
    return typeof current === 'string' ? current : (defaultValue ?? key);
  };
  return {
    useTranslation: () => ({
      t: (key: string, defaultValue?: string) =>
        resolve(
          i18nMock.language.startsWith('fr') ? fr : en,
          key,
          defaultValue
        ),
      i18n: {
        language: i18nMock.language,
        changeLanguage: vi.fn(() => Promise.resolve()),
      },
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

describe('MobileUpsellBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nMock.language = 'en';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the truthful EN note from the real en.json catalog', () => {
    const { container } = render(
      <MobileUpsellBanner featureName="High-resolution export" />,
    );
    // Catalog-sourced expectation (never hand-typed): this doubles as proof
    // common.mobileAppNote still exists in en.json with the honest
    // "Available in the mobile app on Google Play." value (PROM-03). The
    // note is a bare text node between sibling spans (feature name + ': '),
    // so no single element carries it alone — assert on the paragraph's
    // textContent instead of getByText.
    expect(screen.getByText('High-resolution export')).toBeInTheDocument();
    expect(container.querySelector('p')?.textContent).toContain(
      en.common.mobileAppNote,
    );
  });

  it('renders the truthful FR note from the real fr.json catalog', () => {
    // FR string runs longer than EN (UI-SPEC long-text backstop, banner
    // side). jsdom cannot measure layout, so the class pin below is the
    // wiring-level backstop — no truncation mechanism exists to clip it.
    i18nMock.language = 'fr';
    const { container } = render(
      <MobileUpsellBanner featureName="Export haute résolution" />,
    );
    expect(container.querySelector('p')?.textContent).toContain(
      fr.common.mobileAppNote,
    );
  });

  it('keeps the exact banner class string (icon + 12px text craft)', () => {
    // Visual-identity pin (UI-SPEC E3 populated): no border, no fill, no
    // truncation classes — the p element's class list is unchanged.
    const { container } = render(
      <MobileUpsellBanner featureName="High-resolution export" />,
    );
    const note = container.querySelector('p');
    expect(note).not.toBeNull();
    expect(note).toHaveAttribute(
      'class',
      'flex items-start gap-2 py-1 text-xs leading-relaxed',
    );
  });

  it('renders nothing inside a native shell (no placeholder, no reserved space)', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true });
    const { container } = render(
      <MobileUpsellBanner featureName="High-resolution export" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the banner when the Capacitor global reports web mode', () => {
    // Web-mode bridge shape (@capacitor/core defines the global with
    // isNativePlatform -> false): the banner must STAY — only the true
    // native shape suppresses it. Together with the native-stub case above
    // this covers the banner side of the D3 wiring.
    vi.stubGlobal('Capacitor', { isNativePlatform: () => false });
    const { container } = render(
      <MobileUpsellBanner featureName="High-resolution export" />,
    );
    expect(container.querySelector('p')?.textContent).toContain(
      en.common.mobileAppNote,
    );
  });
});
