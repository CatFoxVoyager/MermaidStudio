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
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) — same convention as
// crawlableShell.test.ts / trustCopy.test.ts (WR-04 raw-fs census below).
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { render } from '@testing-library/react';
import App from '../../App';
import { TopBar } from '../shared/TopBar';
import { MobileTopBar } from '../mobile/MobileTopBar';
import { Modal } from '../shared/Modal';
import { StatusBar } from '../editor/StatusBar';
import { AboutModal } from '../modals/tools/AboutModal';

// File-level mock overrides the setup-file mock: `t` resolves the REAL en
// catalog (the default-EN convention of the UI-SPEC contract), so label
// assertions prove both the catalog value and the component binding — no
// hand-maintained mock strings. FR geometry (status.privacy in the h-6 bar)
// is browser-only evidence (UAT walk); the FR catalog VALUE is byte-pinned
// by trustCopy.test.ts.
vi.mock('react-i18next', async () => {
  // unknown-first hop: the JSON literal type nests three levels deep
  // (visual.shapes.*), which no flat Record cast overlaps sufficiently.
  const en = (await import('../../i18n/locales/en.json')).default as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const t = (key: string): string => {
    const [section, name] = key.split('.');
    const value = en[section]?.[name];
    return typeof value === 'string' ? value : key;
  };
  return {
    useTranslation: () => ({
      t,
      i18n: { changeLanguage: vi.fn(), language: 'en' },
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    I18nextProvider: ({ children }: any) => children,
    Trans: ({ children }: any) => children,
  };
});

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

describe('Privacy reachability (PRIV-03)', () => {
  it('renders a /privacy anchor in the desktop footer (StatusBar), left of the GitHub link', () => {
    // Mirrors the real render site (WorkspacePanel.tsx: StatusBar with
    // content/lastSaved/renderTimeMs/isDirty from the active tab).
    const { container } = render(
      <StatusBar
        content={'graph TD\nA-->B'}
        lastSaved={null}
        renderTimeMs={42}
        isDirty={false}
      />,
    );
    const privacy = container.querySelector('a[href="/privacy"]');
    expect(
      privacy,
      'PRIV-03: the desktop footer must carry a /privacy anchor',
    ).not.toBeNull();
    expect(
      privacy!.textContent,
      'PRIV-03: the footer anchor must be labeled from status.privacy (real en catalog value)',
    ).toBe('Privacy');
    expect(
      privacy!.getAttribute('rel') ?? privacy!.getAttribute('target'),
      'PRIV-03: the /privacy anchor is same-origin — no rel/target needed',
    ).toBeNull();
    const github = container.querySelector(
      'a[href="https://github.com/CatFoxVoyager/MermaidStudio"]',
    );
    expect(github, 'PRIV-03: the GitHub anchor must remain').not.toBeNull();
    expect(
      (privacy!.compareDocumentPosition(github!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      'PRIV-03: the privacy anchor must sit LEFT of (before) the GitHub anchor in DOM order',
    ).toBe(true);
  });

  it('renders a /privacy row in the About modal beside the GitHub row (mobile reachability)', () => {
    const { container } = render(
      <AboutModal onClose={vi.fn()} onShowReleaseNotes={vi.fn()} />,
    );
    const privacy = container.querySelector('a[href="/privacy"]');
    expect(
      privacy,
      'PRIV-03: the AboutModal must carry an internal /privacy row (the app has no mobile footer)',
    ).not.toBeNull();
    expect(privacy!.getAttribute('target')).toBeNull();
    expect(
      privacy!.textContent,
      'PRIV-03: the AboutModal row must be labeled from status.privacy',
    ).toBe('Privacy');
    expect(
      privacy!.className,
      'PRIV-03: the AboutModal row must reuse the rounded-xl bordered row shape',
    ).toContain('rounded-xl');
    const github = container.querySelector(
      'a[href="https://github.com/CatFoxVoyager/MermaidStudio"]',
    );
    expect(github, 'PRIV-03: the GitHub row must remain').not.toBeNull();
    expect(
      (github!.compareDocumentPosition(privacy!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      'PRIV-03: the privacy row must sit after (beside) the GitHub row in DOM order',
    ).toBe(true);
  });
});

// WR-04 (fix round 2026-10-31): the rendered-DOM gates above mock AppLayout
// and ModalProvider, so a second <h1> added inside the real layout or any
// modal would pass them — pair the rendered half with a raw-fs census over
// shipped src (same source-bytes style as crawlableShell.test.ts) so the
// exactly-one-h1 contract is total, not only proven where h1s are already
// known to be absent.
describe('shipped-src h1 census (WR-04 raw-fs half of HEAD-01)', () => {
  it('counts exactly one h1 across shipped src — the sr-only App.tsx heading', () => {
    const walk = (dir: string): string[] => {
      const files: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          files.push(...walk(full));
        } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          files.push(full);
        }
      }
      return files;
    };
    const srcDir = resolve(__dirname, '../..');
    const hits: string[] = [];
    for (const file of walk(srcDir)) {
      const occurrences = readFileSync(file, 'utf8').split('<h1').length - 1;
      for (let i = 0; i < occurrences; i += 1) hits.push(file);
    }
    expect(
      hits.length,
      `HEAD-01/WR-04: shipped src carries ${hits.length} h1 occurrence(s) — the contract is exactly one, the sr-only App.tsx h1 (demote any new h1 to a div, like the top-bar brands)`,
    ).toBe(1);
    expect(
      hits[0],
      'HEAD-01/WR-04: the sole h1 must be the sr-only app heading in src/App.tsx',
    ).toBe(resolve(srcDir, 'App.tsx'));
  });
});
