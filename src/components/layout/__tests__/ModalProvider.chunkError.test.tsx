/**
 * WR-02 pin: the three sibling lazy modals (TemplateLibrary, VersionHistory,
 * ExportModal) must be scoped by an ErrorBoundary rendering ChunkErrorFallback
 * — the same T-29-05 pattern the two 29-02 lazy edges already have. A rejected
 * chunk fetch on any of them must NOT unmount the whole app to the root
 * boundary (main.tsx) the way a bare <Suspense> edge does.
 *
 * The module factories throw at import time, so each lazy import() rejects
 * exactly like an offline/5xx chunk fetch does in production.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModalProvider } from '../ModalProvider';
import { MobileShellProvider } from '@/hooks/useMobileShell';

vi.mock('@/components/modals/diagram/TemplateLibrary', () => {
  throw new Error('simulated chunk fetch failure: TemplateLibrary');
});
vi.mock('@/components/modals/diagram/VersionHistory', () => {
  throw new Error('simulated chunk fetch failure: VersionHistory');
});
vi.mock('@/components/modals/diagram/ExportModal', () => {
  throw new Error('simulated chunk fetch failure: ExportModal');
});

// Statically imported siblings — inert stubs so loading ModalProvider does
// not pull the real (heavy) modules; none of these render in this suite.
vi.mock('@/components/modals/tools/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));
vi.mock('@/components/modals/tools/BackupPanel', () => ({
  BackupPanel: () => <div data-testid="backup-panel" />,
}));
vi.mock('@/ai/AISettingsModal', () => ({
  AISettingsModal: () => <div data-testid="ai-settings" />,
}));
vi.mock('@/components/modals/tools/KeyboardShortcuts', () => ({
  KeyboardShortcuts: () => <div data-testid="keyboard-shortcuts" />,
}));
vi.mock('@/components/modals/tools/WelcomeModal', () => ({
  WelcomeModal: () => <div data-testid="welcome-modal" />,
}));
vi.mock('@/components/modals/tools/AboutModal', () => ({
  AboutModal: () => <div data-testid="about-modal" />,
}));
vi.mock('@/components/shared/Toast', () => ({
  Toast: () => <div data-testid="toast" />,
}));

const baseProps = {
  showTemplates: false,
  showHistory: false,
  showExport: false,
  showPalette: false,
  showBackup: false,
  showSaveTemplate: false,
  showAISettings: false,
  showHelp: false,
  showFullscreen: false,
  showWelcome: false,
  showAbout: false,
  onCloseTemplates: vi.fn(),
  onOpenTemplates: vi.fn(),
  onCloseHistory: vi.fn(),
  onCloseExport: vi.fn(),
  onClosePalette: vi.fn(),
  onCloseBackup: vi.fn(),
  onCloseSaveTemplate: vi.fn(),
  onCloseAISettings: vi.fn(),
  onCloseHelp: vi.fn(),
  onCloseFullscreen: vi.fn(),
  onCloseWelcome: vi.fn(),
  onCloseAbout: vi.fn(),
  onOpenAbout: vi.fn(),
  onOpenWelcome: vi.fn(),
  toggleAI: vi.fn(),
  theme: 'light' as const,
};

const activeTab = {
  id: '1',
  title: 'Test',
  content: 'test content',
  diagram_id: 'diag-1',
};

// react-i18next is globally mocked with a key-returning t: the fallback's
// exact i18n keys double as its DOM signature (same convention as
// ChunkErrorFallback.test.tsx).
async function expectChunkErrorFallback() {
  expect(await screen.findByText('common.chunkLoadError')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'update.reload' })
  ).toBeInTheDocument();
}

describe('ModalProvider lazy-modal chunk failures (WR-02)', () => {
  it('scopes a rejected TemplateLibrary chunk to ChunkErrorFallback', async () => {
    render(
      <MobileShellProvider>
        <ModalProvider
          {...baseProps}
          showTemplates
          handleTemplateSelect={vi.fn()}
        />
      </MobileShellProvider>
    );
    await expectChunkErrorFallback();
  });

  it('scopes a rejected VersionHistory chunk to ChunkErrorFallback', async () => {
    render(
      <MobileShellProvider>
        <ModalProvider
          {...baseProps}
          showHistory
          activeTab={activeTab}
          handleRestore={vi.fn()}
        />
      </MobileShellProvider>
    );
    await expectChunkErrorFallback();
  });

  it('scopes a rejected ExportModal chunk to ChunkErrorFallback', async () => {
    render(
      <MobileShellProvider>
        <ModalProvider
          {...baseProps}
          showExport
          activeTab={activeTab}
          handleCopyLink={vi.fn()}
        />
      </MobileShellProvider>
    );
    await expectChunkErrorFallback();
  });
});
