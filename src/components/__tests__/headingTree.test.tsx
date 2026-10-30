/**
 * Heading-tree contract gates (HEAD-01/HEAD-02, phase 28 plan 02).
 *
 * The rendered app carries exactly ONE h1: a sr-only app-level heading bound
 * to header.appHeading, rendered in App.tsx BEFORE the exclusive
 * AppLayout/MobileLayout early-return branch — so exactly-one-h1 holds at
 * every viewport (AppLayout.tsx early-returns MobileLayout on mobile; the h1
 * sits outside that branch). Both top-bar brands are demoted to testid divs
 * (zero interactive elements inside any heading), and the shared Modal keeps
 * its h2 title (HEAD-02 rendered half — no new always-visible app h2; the
 * modal-open h2s plus the static shell's 4 pre-mount h2s own coverage per the
 * UI-SPEC contract).
 *
 * Scope note: this is a rendered-app-DOM claim, not a whole-document one —
 * the served document intentionally carries the static shell h1 pre-mount
 * (plan 28-01, index.html) plus this sr-only h1 post-mount.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../App';
import { TopBar } from '../shared/TopBar';
import { MobileTopBar } from '../mobile/MobileTopBar';
import { Modal } from '../shared/Modal';

// File-level mock overrides the setup-file mock: the appHeading value is the
// gate's text assertion (default EN per the UI-SPEC contract).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'header.appHeading'
        ? 'MermaidStudio — Free Online Mermaid Diagram Editor'
        : key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  I18nextProvider: ({ children }: any) => children,
  Trans: ({ children }: any) => children,
}));

// Mock all database functions (App.test.tsx mock pattern)
vi.mock('@/services/storage/database', () => ({
  getDiagrams: vi.fn(() => Promise.resolve([])),
  getFolders: vi.fn(() => Promise.resolve([])),
  getTags: vi.fn(() => Promise.resolve([])),
  createDiagram: vi.fn(() => Promise.resolve({ id: 'diagram-1', title: 'Test Diagram', content: 'graph TD\nA-->B' })),
  createFolder: vi.fn(() => Promise.resolve({ id: 'folder-1', title: 'New Folder' })),
  getDiagram: vi.fn(() => Promise.resolve({ id: 'diagram-1', title: 'Test Diagram', content: 'graph TD\nA-->B' })),
  updateDiagram: vi.fn(() => Promise.resolve()),
  saveVersion: vi.fn(() => Promise.resolve()),
  getSettings: vi.fn(() => Promise.resolve({
    theme: 'light',
    language: 'en',
    lastOpenDiagramId: null,
  })),
  updateSettings: vi.fn(() => Promise.resolve()),
}));

// Mock Mermaid
vi.mock('@/lib/mermaid/core', () => ({
  initMermaid: vi.fn(),
  renderDiagram: vi.fn(() => Promise.resolve({ svg: '<svg></svg>', error: null })),
  detectDiagramType: vi.fn(() => 'flowchart'),
}));

// Mock AppLayout and ModalProvider (the layout branches stay out of this
// gate's scope — the h1 must exist BEFORE them, which is exactly what the
// App render proves).
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ theme }: any) => (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`} data-testid="app-layout" />
  ),
}));

vi.mock('@/components/layout/ModalProvider', () => ({
  ModalProvider: () => <div data-testid="modal-provider">Modals</div>,
}));

// Mock hooks (App.test.tsx mock pattern)
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
  useToast: vi.fn(() => ({
    toasts: [],
    show: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

vi.mock('@/hooks/useModalManager', () => ({
  useModalManager: vi.fn(() => ({
    modals: {
      showAI: false,
      showTemplates: false,
      showHistory: false,
      showExport: false,
      showPalette: false,
      showHelp: false,
      showBackup: false,
      showSaveTemplate: false,
      showAISettings: false,
      showFullscreen: false,
      showDiagramColors: false,
      showAdvancedStyle: false,
    },
    openModal: vi.fn(),
    closeModal: vi.fn(),
    toggleModal: vi.fn(),
    closeAllModals: vi.fn(),
    isModalOpen: vi.fn(() => false),
  })),
}));

describe('App-level heading tree (HEAD-01)', () => {
  it('renders exactly one h1: sr-only, contracted text, zero interactive descendants', () => {
    render(<App />);
    const h1s = document.querySelectorAll('h1');
    expect(
      h1s.length,
      'HEAD-01: exactly one h1 must exist in the rendered app DOM (it renders before the exclusive layout branch, so this holds at every viewport)',
    ).toBe(1);
    const h1 = h1s[0];
    expect(
      h1.textContent,
      'HEAD-01: the app h1 must contain the contracted heading text (header.appHeading, default EN)',
    ).toContain('Mermaid Diagram Editor');
    expect(
      h1.className,
      'HEAD-01: the app h1 must be visually hidden (sr-only) — the visible h1 is the static shell pre-mount',
    ).toContain('sr-only');
    expect(
      h1.querySelector('button, a, input, select, textarea'),
      'HEAD-01: the app h1 must carry zero interactive descendants (the version-badge About button lives in the demoted brand div, outside any heading)',
    ).toBeNull();
  });
});

describe('TopBar brand demotion (HEAD-01)', () => {
  it('renders the brand as a div with data-testid="topbar-brand" — zero h1', () => {
    const { container } = render(
      <TopBar
        theme="dark"
        onToggleTheme={vi.fn()}
        onOpenCommandPalette={vi.fn()}
        onOpenTemplates={vi.fn()}
        sidebarOpen
        onToggleSidebar={vi.fn()}
        onOpenBackup={vi.fn()}
        onFocusMode={vi.fn()}
        focusMode={false}
        language="fr"
        onChangeLanguage={vi.fn()}
        onOpenAbout={vi.fn()}
      />,
    );
    expect(
      container.querySelector('h1'),
      'HEAD-01: the desktop brand must not be a heading',
    ).toBeNull();
    const brand = container.querySelector('[data-testid="topbar-brand"]');
    expect(
      brand,
      'HEAD-01: the demoted brand must carry data-testid="topbar-brand"',
    ).not.toBeNull();
    expect(brand!.tagName).toBe('DIV');
    expect(brand!.textContent).toContain('Studio');
    // The version-badge About button stays, now OUTSIDE any heading.
    expect(
      brand!.querySelector('[data-testid="topbar-about-badge"]'),
      'HEAD-01: the version-badge About button must remain (nested in the brand div)',
    ).not.toBeNull();
  });
});

describe('MobileTopBar brand demotion (HEAD-01)', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onExport: vi.fn(),
    onToggleTheme: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onOpenMenu: vi.fn(),
    isDirty: true,
  };

  it('renders the brand as a div with data-testid="mobile-topbar-brand" — zero h1, aria-label span intact', () => {
    const { container } = render(<MobileTopBar {...defaultProps} />);
    expect(
      container.querySelector('h1'),
      'HEAD-01: the mobile brand must not be a heading',
    ).toBeNull();
    const brand = container.querySelector('[data-testid="mobile-topbar-brand"]');
    expect(
      brand,
      'HEAD-01: the demoted brand must carry data-testid="mobile-topbar-brand"',
    ).not.toBeNull();
    expect(brand!.tagName).toBe('DIV');
    const wordmark = brand!.querySelector('span[aria-label]');
    expect(
      wordmark?.getAttribute('aria-label'),
      'HEAD-01: the full-name accessible label must survive the demotion',
    ).toBe('MermaidStudio');
    expect(brand!.textContent).toBe('MS');
  });
});

describe('Modal heading level (HEAD-02 rendered half)', () => {
  it('renders the modal title as h2 — no new always-visible app h2 exists', () => {
    const { container } = render(
      <Modal isOpen onClose={vi.fn()} title="About MermaidStudio">
        <p>body</p>
      </Modal>,
    );
    const title = container.querySelector('#modal-title');
    expect(title, 'HEAD-02: the shared Modal must render #modal-title').not.toBeNull();
    expect(
      title!.tagName,
      'HEAD-02: the modal title must stay an h2 (modal-open h2s own rendered-DOM coverage)',
    ).toBe('H2');
  });
});
