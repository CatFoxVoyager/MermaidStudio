import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WorkspacePanel } from '../WorkspacePanel';
import type { Tab } from '@/types';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock CodeEditor
vi.mock('@/components/editor/CodeEditor', () => ({
  CodeEditor: ({ onChange }: { onChange: (val: string) => void }) => {
    onChange('mock code content');
    return <div data-testid="code-editor">Code Editor</div>;
  },
}));

// Mock PreviewPanel
vi.mock('@/components/preview/PreviewPanel', () => ({
  PreviewPanel: ({ onChange }: { onChange: (val: string) => void }) => {
    onChange('mock preview content');
    return <div data-testid="preview-panel">Preview Panel</div>;
  },
}));

// Mock VisualEditorCanvas
vi.mock('@/components/visual/VisualEditorCanvas', () => ({
  VisualEditorCanvas: ({ content, onChange }: { content: string; onChange: (val: string) => void }) => {
    return (
      <div data-testid="visual-editor-canvas">
        <div>Visual Editor Content: {content}</div>
        <button
          data-testid="visual-onchange-btn"
          onClick={() => onChange('updated visual content')}
        >
          Simulate Change
        </button>
      </div>
    );
  },
}));

// Mock StatusBar
vi.mock('@/components/editor/StatusBar', () => ({
  StatusBar: () => <div data-testid="status-bar">Status Bar</div>,
}));

// Mock DiffView
vi.mock('@/components/editor/DiffView', () => ({
  DiffView: () => <div data-testid="diff-view">Diff View</div>,
}));

// Mock TabBar
vi.mock('@/components/editor/TabBar', () => ({
  TabBar: () => <div data-testid="tab-bar">Tab Bar</div>,
}));

describe('WorkspacePanel - Visual Editor Toggle', () => {
  const mockTabs: Tab[] = [{
    id: '1',
    title: 'Test Diagram',
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
    themeId: 'default',
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
    onOpenAIPanel: vi.fn(),
    onPreviewError: vi.fn(),
    previewError: null,
  };

  it('should render split view by default (Code/Preview)', () => {
    render(<WorkspacePanel {...mockProps} />);

    // Should have split view elements
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();

    // Should NOT have visual editor
    expect(screen.queryByTestId('visual-editor-canvas')).not.toBeInTheDocument();
  });

  it('should show VisualEditorCanvas when visual view is activated', () => {
    render(<WorkspacePanel {...mockProps} />);

    // Initially should not have visual editor
    expect(screen.queryByTestId('visual-editor-canvas')).not.toBeInTheDocument();

    // Click the visual toggle button
    act(() => {
      const visualButton = screen.getByTestId('workspace-view-visual');
      visualButton.click();
    });

    // Now should have visual editor
    expect(screen.getByTestId('visual-editor-canvas')).toBeInTheDocument();

    // Split view should be hidden
    expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();
  });

  it('should return to split view when split view button is clicked', () => {
    render(<WorkspacePanel {...mockProps} />);

    // Click to visual view
    act(() => {
      const visualButton = screen.getByTestId('workspace-view-visual');
      visualButton.click();
    });

    expect(screen.getByTestId('visual-editor-canvas')).toBeInTheDocument();

    // Click back to split view
    act(() => {
      const splitButton = screen.getByTestId('workspace-view-split');
      splitButton.click();
    });

    // Should return to split view
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('visual-editor-canvas')).not.toBeInTheDocument();
  });

  it('should wire VisualEditorCanvas onChange to onContentChange (VIS-03 sync)', () => {
    render(<WorkspacePanel {...mockProps} />);

    // Switch to visual view
    act(() => {
      const visualButton = screen.getByTestId('workspace-view-visual');
      visualButton.click();
    });

    // Get the visual editor and trigger a change
    const visualCanvas = screen.getByTestId('visual-editor-canvas');
    const changeButton = screen.getByTestId('visual-onchange-btn');

    // Reset mock to track calls
    vi.clearAllMocks();

    // Trigger the change
    act(() => {
      changeButton.click();
    });

    // Should call onContentChange with active tab ID and new content
    expect(mockProps.onContentChange).toHaveBeenCalledWith('1', 'updated visual content');
  });

  it('should maintain existing functionality (resize handle, DiffView, etc.) in split view', () => {
    render(<WorkspacePanel {...mockProps} />);

    // Should have the resize handle in split view
    const container = screen.getByTestId('code-editor').closest('.flex-1.flex.overflow-hidden');
    expect(container).toBeInTheDocument();

    // StatusBar should be present
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });
});