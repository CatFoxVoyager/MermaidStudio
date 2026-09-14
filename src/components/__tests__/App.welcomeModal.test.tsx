/**
 * Tests for the welcome / release-notes modal auto-open condition (App.tsx).
 *
 * Contract (Phase 24 decision, 24-05): the modal opens on UPDATES only —
 * a stored seenReleaseNotesVersion that differs from the current APP_VERSION.
 * A fresh install (no stored version — DEFAULT_SETTINGS uses undefined) must
 * NOT auto-open: release notes for a version the user never ran are noise,
 * and a fresh-profile auto-open blocked every interaction in the E2E suite
 * (200 failures, see 24-GATES-EVIDENCE.md). At a future bump, users who saw
 * 0.6.0 (stored "0.6.0") still get the new notes.
 *
 * Unlike App.test.tsx (which stubs useModalManager with a no-op openModal),
 * these tests use the REAL useModalManager hook and expose its showWelcome
 * state through a stubbed ModalProvider — the full effect path
 * (getSettings -> openModal -> modals.showWelcome) is under lock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import { APP_VERSION } from '@/constants/app';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// getSettings payload is overridden per test via mockGetSettings.
const mockGetSettings = vi.fn(() => Promise.resolve({ theme: 'light', language: 'en' }));

vi.mock('@/services/storage/database', () => ({
  getDiagrams: vi.fn(() => Promise.resolve([])),
  getFolders: vi.fn(() => Promise.resolve([])),
  getTags: vi.fn(() => Promise.resolve([])),
  getDiagram: vi.fn(() => Promise.resolve(null)),
  getSettings: (...args: unknown[]) => mockGetSettings(...(args as [])),
  updateSettings: vi.fn(() => Promise.resolve()),
  saveVersion: vi.fn(() => Promise.resolve()),
  createDiagram: vi.fn(() => Promise.resolve({ id: 'diagram-1', title: 't', content: '' })),
  createFolder: vi.fn(() => Promise.resolve({ id: 'folder-1', title: 'f' })),
  updateDiagram: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/mermaid/core', () => ({
  initMermaid: vi.fn(),
  renderDiagram: vi.fn(() => Promise.resolve({ svg: '<svg></svg>', error: null })),
  detectDiagramType: vi.fn(() => 'flowchart'),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ theme }: any) => (
    <div data-testid="app-layout" className={theme === 'dark' ? 'dark' : ''}>layout</div>
  ),
}));

// Expose the real modal state: showWelcome comes from the REAL useModalManager.
vi.mock('@/components/layout/ModalProvider', () => ({
  ModalProvider: ({ showWelcome }: any) => (
    <div data-testid="welcome-state">{String(showWelcome)}</div>
  ),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ theme: 'light', toggle: vi.fn() })),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: vi.fn(() => ({ language: 'en', setLanguage: vi.fn() })),
}));

vi.mock('@/hooks/useTabs', () => ({
  useTabs: vi.fn(() => ({
    tabs: [],
    activeTabId: null,
    activeTab: null,
    setActiveTabId: vi.fn(),
    openDiagram: vi.fn(),
    closeTab: vi.fn(),
    updateTabContent: vi.fn(),
    saveTab: vi.fn(),
  })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ toasts: [], show: vi.fn(), dismiss: vi.fn() })),
}));

const baseSettings = {
  theme: 'dark',
  language: 'en',
  lastOpenDiagramId: null,
  ai_machine_size: 'low',
  ai_api_key: '',
  ai_model: '',
  ai_base_url: '',
};

describe('App — welcome/release-notes modal auto-open condition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('fresh install (no stored seenReleaseNotesVersion) does NOT auto-open', async () => {
    mockGetSettings.mockResolvedValue({ ...baseSettings });

    render(<App />);

    // Wait out the async getSettings effect, then confirm the modal never opened.
    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalled();
    });
    await new Promise(r => setTimeout(r, 25));
    expect(screen.getByTestId('welcome-state')).toHaveTextContent('false');
  });

  it('upgrade (stored version differs from APP_VERSION) auto-opens', async () => {
    mockGetSettings.mockResolvedValue({
      ...baseSettings,
      seenReleaseNotesVersion: '0.0.1', // any version older than current
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('welcome-state')).toHaveTextContent('true');
    });
  });

  it('returning user on the current version (stored === APP_VERSION) does NOT re-open', async () => {
    mockGetSettings.mockResolvedValue({
      ...baseSettings,
      seenReleaseNotesVersion: APP_VERSION,
    });

    render(<App />);

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalled();
    });
    await new Promise(r => setTimeout(r, 25));
    expect(screen.getByTestId('welcome-state')).toHaveTextContent('false');
  });
});
