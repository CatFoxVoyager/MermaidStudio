import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '../../../i18n/locales/en.json';
import fr from '../../../i18n/locales/fr.json';
import { render, screen } from '@testing-library/react';
import { WorkspacePanel } from '../WorkspacePanel';
import { PLAY_STORE_URL } from '@/constants/playStore';

const i18nMock = vi.hoisted(() => ({ language: 'en' }));

vi.mock('react-i18next', () => {
  const resolve = (
    catalog: Record<string, unknown>,
    key: string,
    defaultValue?: string
  ): string => {
    let current: unknown = catalog;
    for (const part of key.split('.')) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return defaultValue ?? key;
      }
    }
    return typeof current === 'string' ? current : (defaultValue ?? key);
  };
  return {
    useTranslation: () => ({
      t: (key: string, defaultValue?: string) =>
        resolve(i18nMock.language.startsWith('fr') ? fr : en, key, defaultValue),
      i18n: {
        language: i18nMock.language,
        changeLanguage: vi.fn(() => Promise.resolve()),
      },
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

describe('WorkspacePanel - EmptyState Android promo link', () => {
  const emptyProps = {
    tabs: [],
    activeTabId: null,
    activeTab: null,
    theme: 'dark' as const,
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onContentChange: vi.fn(),
    onSave: vi.fn(),
    onShowHistory: vi.fn(),
    onShowExport: vi.fn(),
    onToggleAI: vi.fn(),
    onFullscreen: vi.fn(),
    onSaveTemplate: vi.fn(),
    onNewDiagram: vi.fn(),
    onShowTemplates: vi.fn(),
    onShowPalette: vi.fn(),
    onShowDiagramColors: vi.fn(),
    onShowAdvancedStyle: vi.fn(),
    onDiagramColorsClose: vi.fn(),
    onAdvancedStyleClose: vi.fn(),
    showDiagramColors: false,
    showAdvancedStyle: false,
    showAI: false,
    renderTimeMs: null,
    onRenderTime: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    i18nMock.language = 'en';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an external https link to Google Play with the EN badge and copy on the empty state', () => {
    render(<WorkspacePanel {...emptyProps} />);
    expect(screen.getByText(en.editor.openOrCreate)).toBeInTheDocument();

    const card = screen.getByTestId('empty-android-card');
    expect(card.tagName).toBe('A');
    expect(card).toHaveAttribute('href', PLAY_STORE_URL);
    expect(card).toHaveAttribute('target', '_blank');
    expect(card.getAttribute('rel')).toContain('noopener');
    expect(card.getAttribute('rel')).toContain('noreferrer');
    expect(card).toHaveAccessibleName(`${en.menu.androidTitle}: Get MermaidStudio on Google Play`);

    const badge = card.querySelector('img');
    expect(badge).not.toBeNull();
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-en.png');
    expect(badge).toHaveAttribute('alt', 'Get MermaidStudio on Google Play');
    expect(screen.getByText(en.menu.androidTitle)).toBeInTheDocument();
    expect(screen.getByText(en.menu.androidOnPlay)).toBeInTheDocument();
  });

  it('selects the FR badge and renders the FR catalog strings in French', () => {
    i18nMock.language = 'fr';
    render(<WorkspacePanel {...emptyProps} />);

    const card = screen.getByTestId('empty-android-card');
    const badge = card.querySelector('img');
    expect(badge).toHaveAttribute('src', '/badges/google-play-badge-fr.png');
    expect(badge).toHaveAttribute('alt', 'Obtenir MermaidStudio sur Google Play');
    expect(card).toHaveAccessibleName(
      `${fr.menu.androidTitle}: Obtenir MermaidStudio sur Google Play`
    );
    expect(screen.getByText(fr.menu.androidTitle)).toBeInTheDocument();
    expect(screen.getByText(fr.menu.androidOnPlay)).toBeInTheDocument();
  });

  it('renders nothing for the Android promo link inside a native shell', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true });
    render(<WorkspacePanel {...emptyProps} />);
    expect(screen.queryByTestId('empty-android-card')).not.toBeInTheDocument();
  });

  it('renders the Android promo link when Capacitor reports web mode', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => false });
    render(<WorkspacePanel {...emptyProps} />);
    expect(screen.getByTestId('empty-android-card')).toBeInTheDocument();
  });
});
