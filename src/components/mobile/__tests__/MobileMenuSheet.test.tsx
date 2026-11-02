import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Relative (not @/) imports: the tsconfig paths alias does not resolve .json
// ids under the vitest transform ("Failed to resolve import
// @/i18n/locales/en.json") — the repo's own src/i18n/config.ts imports the
// catalogs the same relative way.
import en from '../../../i18n/locales/en.json';
import fr from '../../../i18n/locales/fr.json';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenuSheet } from '../MobileMenuSheet';
import { PLAY_STORE_URL } from '@/constants/playStore';

// Mutable language holder shared with the hoisted mock factory below:
// flip it per test, restore 'en' in beforeEach. vi.hoisted is required
// because vi.mock registrations are hoisted above module body statements.
const i18nMock = vi.hoisted(() => ({ language: 'en' }));

// File-level mock — OVERRIDES the setup-file global react-i18next mock for
// this file only. `t` resolves dot-paths against the REAL catalogs (imported
// above): asserting a rendered catalog string doubles as proof the key
// exists in that catalog — expected strings are never hand-typed.
// `i18nMock.language` drives the FR badge-variant selection live.
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
    i18nMock.language = 'en';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders menu title, the Play promo card, and all action items', () => {
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

  it('the promo card is an external https anchor to the Play listing', () => {
    // DELIBERATE CONTRACT CHANGE (CONTEXT.md, user decision 2026-11-01): the
    // testid `mobile-menu-android-card` is kept, but the element's semantics
    // flip from a non-interactive DIV footnote to a real link — the app is
    // live on Google Play. The card is still NOT wired to any premium/paywall
    // action (no role="button", no cursor-pointer), so the anti-paywall
    // intent of the old assertion is preserved while the tag asserts the new
    // anchor contract.
    render(<MobileMenuSheet {...defaultProps} />);
    const card = screen.getByTestId('mobile-menu-android-card');
    expect(card.tagName).toBe('A');
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card.getAttribute('class')).not.toContain('cursor-pointer');
    // External-link hygiene (reverse-tabnabbing control): plain https
    // listing URL from the shared constant, new tab, no opener/referrer.
    expect(card).toHaveAttribute('href', PLAY_STORE_URL);
    expect(card).toHaveAttribute('target', '_blank');
    expect(card.getAttribute('rel')).toContain('noopener');
    expect(card.getAttribute('rel')).toContain('noreferrer');
    // Official badge asset, EN variant under the default mock language:
    // local /badges/ src — never hot-linked to play.google.com.
    const badge = card.querySelector('img');
    expect(badge).not.toBeNull();
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-en.png');
    expect(badge).toHaveAttribute('alt', 'Get MermaidStudio on Google Play');
  });

  it('the FR locale selects the FR badge and renders the real fr.json strings', () => {
    // FR catalog strings run longer than EN (UI-SPEC long-text backstop,
    // sheet side). jsdom cannot measure layout, so this is a WIRING-level
    // backstop — the device/browser walk is the behavioral gate, not this.
    i18nMock.language = 'fr';
    render(<MobileMenuSheet {...defaultProps} />);
    const card = screen.getByTestId('mobile-menu-android-card');
    const badge = card.querySelector('img');
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-fr.png');
    expect(badge).toHaveAttribute('alt', 'Obtenir MermaidStudio sur Google Play');
    // Real fr.json catalog values, read from the imported catalog object —
    // these assertions double as proof the keys exist in fr.json.
    expect(screen.getByText(fr.menu.androidTitle)).toBeInTheDocument();
    expect(screen.getByText(fr.menu.androidOnPlay)).toBeInTheDocument();
    // No truncation mechanism introduced on the row: no overflow clipping,
    // no ellipsis/nowrap/line-clamp, no fixed width (w-16/w-[240px]) or
    // min/max-width cap — text wraps per the existing line-height. (w-full
    // and w-auto are relational and ARE part of the row recipe.)
    const rowClass = card.getAttribute('class') ?? '';
    expect(rowClass).not.toContain('overflow-hidden');
    expect(rowClass).not.toMatch(
      /(?:^|\s)(truncate|text-ellipsis|whitespace-nowrap|line-clamp-\d+|w-\d+|w-\[|max-w-\S+|min-w-\S+)/
    );
  });

  it('exposes an explicit accessible name built from the visible title and the badge alt', () => {
    // Review WR-02: with no author-defined name the anchor's computed name is
    // the flattened subtree — badge alt + title + sub-line, three
    // near-duplicates. The explicit aria-label ends on the badge alt (UI-SPEC
    // Copywriting Contract) while keeping the visible title text inside it:
    // an alt-only label would sever WCAG 2.5.3 Label-in-Name with the visible
    // row text. Same pattern as the Language row's aria-label.
    render(<MobileMenuSheet {...defaultProps} />);
    expect(screen.getByTestId('mobile-menu-android-card')).toHaveAccessibleName(
      `${en.menu.androidTitle}: Get MermaidStudio on Google Play`
    );
  });

  it('exposes the same accessible-name pattern with the fr.json strings', () => {
    i18nMock.language = 'fr';
    render(<MobileMenuSheet {...defaultProps} />);
    expect(screen.getByTestId('mobile-menu-android-card')).toHaveAccessibleName(
      `${fr.menu.androidTitle}: Obtenir MermaidStudio sur Google Play`
    );
  });

  it('renders nothing where the promo card would be inside a native shell', () => {
    // The installed Android app must not promote its own store listing:
    // under the native bridge shape the promo slot renders NO element at
    // all — no placeholder, no reserved space.
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true });
    render(<MobileMenuSheet {...defaultProps} />);
    expect(screen.queryByTestId('mobile-menu-android-card')).not.toBeInTheDocument();
  });

  it('renders the promo card when the Capacitor global reports web mode', () => {
    // Web-mode bridge shape (@capacitor/core defines the global with
    // isNativePlatform -> false): the promo must STAY — only the true
    // native shape suppresses it. Together with the native-stub case above
    // this covers the sheet side of the D3 wiring.
    vi.stubGlobal('Capacitor', { isNativePlatform: () => false });
    render(<MobileMenuSheet {...defaultProps} />);
    expect(screen.getByTestId('mobile-menu-android-card')).toBeInTheDocument();
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
