import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspacePanel } from '../WorkspacePanel';
import type { Tab } from '@/types';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock CodeMirror
vi.mock('@/components/editor/CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({ onChange }: { onChange: (val: string) => void }) => {
    onChange('mock content');
    return null;
  },
}));

describe('WorkspacePanel - Fix Diagram Button', () => {
  const mockTabs: Tab[] = [{
    id: '1',
    title: 'Test',
    content: 'flowchart TD\n  A --> B',
    created_at: Date.now(),
    updated_at: Date.now(),
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

  it('should render Fix Diagram button', () => {
    render(<WorkspacePanel {...mockProps} onOpenAIPanel={vi.fn()} />);
    const fixButton = screen.getByTestId('fix-diagram-button');
    expect(fixButton).toBeInTheDocument();
  });

  it('should call onOpenAIPanel with fix mode when clicked', () => {
    const mockOpenAIPanel = vi.fn();
    render(<WorkspacePanel {...mockProps} onOpenAIPanel={mockOpenAIPanel} />);
    const fixButton = screen.getByTestId('fix-diagram-button');
    fixButton.click();
    expect(mockOpenAIPanel).toHaveBeenCalledWith({ mode: 'fix' });
  });
});
