/**
 * Tests for the clickable version badge in the WorkspacePanel empty state.
 *
 * The "v{APP_VERSION}" pill shown when no diagram is open is the desktop
 * entry point to the About modal (convention: clicking the version opens
 * the about screen). i18n is mocked with t(key) => key.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePanel } from '../WorkspacePanel';
import { APP_VERSION } from '@/constants/app';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('WorkspacePanel - About version badge', () => {
  const onOpenAbout = vi.fn();

  // Empty workspace (no tabs): the only state where the version badge shows.
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
  });

  it('renders the version badge as a button in the empty state', () => {
    render(<WorkspacePanel {...emptyProps} onOpenAbout={onOpenAbout} />);
    const badge = screen.getByRole('button', { name: `v${APP_VERSION}` });
    expect(badge).toBeInTheDocument();
  });

  it('opens the About modal when the badge is clicked', async () => {
    render(<WorkspacePanel {...emptyProps} onOpenAbout={onOpenAbout} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: `v${APP_VERSION}` }));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });
});
