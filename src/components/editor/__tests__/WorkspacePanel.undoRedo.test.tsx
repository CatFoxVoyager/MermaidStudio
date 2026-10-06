/**
 * Desktop toolbar undo/redo buttons (WorkspacePanel): they sit next to Copy
 * with the same compact icon-button style and dispatch through the shared
 * historyActions seam (activate pane → registry view → CM6 command → focus).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePanel } from '../WorkspacePanel';
import type { Tab } from '@/types';
import * as historyActions from '@/lib/editor/historyActions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('WorkspacePanel - undo/redo buttons', () => {
  const mockTabs: Tab[] = [{
    id: '1',
    diagram_id: 'diagram-1',
    title: 'Test',
    content: 'flowchart TD\n  A --> B',
    is_dirty: false,
    saved_content: 'flowchart TD\n  A --> B',
  }];

  const mockProps = {
    tabs: mockTabs,
    activeTabId: '1',
    activeTab: mockTabs[0],
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

  it('renders undo and redo toolbar buttons', () => {
    render(<WorkspacePanel {...mockProps} onOpenAIPanel={vi.fn()} />);
    expect(screen.getByTitle('shortcuts.undo')).toBeInTheDocument();
    expect(screen.getByTitle('shortcuts.redo')).toBeInTheDocument();
  });

  it('dispatches undoInView on undo button click', async () => {
    const user = userEvent.setup();
    const undoSpy = vi.spyOn(historyActions, 'undoInView').mockReturnValue(true);
    render(<WorkspacePanel {...mockProps} onOpenAIPanel={vi.fn()} />);

    await user.click(screen.getByTitle('shortcuts.undo'));
    expect(undoSpy).toHaveBeenCalledTimes(1);
  });

  it('dispatches redoInView on redo button click', async () => {
    const user = userEvent.setup();
    const redoSpy = vi.spyOn(historyActions, 'redoInView').mockReturnValue(true);
    render(<WorkspacePanel {...mockProps} onOpenAIPanel={vi.fn()} />);

    await user.click(screen.getByTitle('shortcuts.redo'));
    expect(redoSpy).toHaveBeenCalledTimes(1);
  });
});
