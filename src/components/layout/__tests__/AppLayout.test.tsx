/**
 * Tests for AppLayout component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { AppLayout } from '../AppLayout';

// Mock child components
vi.mock('@/components/shared/TopBar', () => ({
  TopBar: ({ onToggleTheme, onOpenCommandPalette, sidebarOpen, language }: any) => (
    <div data-testid="topbar">
      <button onClick={onToggleTheme}>Toggle Theme</button>
      <button onClick={onOpenCommandPalette}>Command Palette</button>
      <div>Sidebar: {sidebarOpen ? 'open' : 'closed'}</div>
      <div>Language: {language}</div>
    </div>
  ),
}));

vi.mock('@/sidebar/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/editor/WorkspacePanel', () => ({
  WorkspacePanel: ({ theme, showAI, tabs, onToggleAI }: any) => (
    <div data-testid="workspace-panel">
      <div>Theme: {theme}</div>
      <div>AI: {showAI ? 'visible' : 'hidden'}</div>
      <div>Tabs: {tabs?.length || 0}</div>
      <button onClick={onToggleAI}>Toggle AI</button>
    </div>
  ),
}));

vi.mock('@/ai/AIPanel', () => ({
  AIPanel: ({ currentContent, onApply }: any) => (
    <div data-testid="ai-panel">
      <div>Content: {currentContent?.substring(0, 20)}...</div>
      <button onClick={() => onApply('test content')}>Apply</button>
    </div>
  ),
}));

vi.mock('@/components/modals/settings/DiagramColorsPanel', () => ({
  DiagramColorsPanel: ({ theme, onClose, onContentChange }: any) => (
    <div data-testid="diagram-colors">
      <div>Theme: {theme}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onContentChange('new color content')}>Change Content</button>
    </div>
  ),
  default: ({ theme, onClose, onContentChange }: any) => (
    <div data-testid="diagram-colors">
      <div>Theme: {theme}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onContentChange('new color content')}>Change Content</button>
    </div>
  ),
}));

vi.mock('@/components/modals/settings/AdvancedStylePanel', () => ({
  AdvancedStylePanel: ({ theme, onClose, onContentChange }: any) => (
    <div data-testid="advanced-style">
      <div>Theme: {theme}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onContentChange('new style content')}>Change Content</button>
    </div>
  ),
  default: ({ theme, onClose, onContentChange }: any) => (
    <div data-testid="advanced-style">
      <div>Theme: {theme}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onContentChange('new style content')}>Change Content</button>
    </div>
  ),
}));

describe('AppLayout Component', () => {
  const mockProps = {
    theme: 'light' as const,
    toggleTheme: vi.fn(),
    language: 'en',
    onChangeLanguage: vi.fn(),
    sidebarOpen: true,
    onToggleSidebar: vi.fn(),
    tabs: [],
    activeTabId: null,
    activeTab: null,
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
    onOpenCommandPalette: vi.fn(),
    onOpenHelp: vi.fn(),
    onOpenBackup: vi.fn(),
    onFocusMode: vi.fn(),
    showAI: false,
    showDiagramColors: false,
    showAdvancedStyle: false,
    onAIApply: vi.fn(),
    onAIClose: vi.fn(),
    onAIOpenSettings: vi.fn(),
    onDiagramColorsClose: vi.fn(),
    onAdvancedStyleClose: vi.fn(),
    focusMode: false,
    renderTimeMs: null,
    onRenderTime: vi.fn(),
    refreshKey: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<AppLayout {...mockProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render TopBar', () => {
      render(<AppLayout {...mockProps} />);
      expect(screen.getByTestId('topbar')).toBeInTheDocument();
    });

    it('should render Sidebar when open', () => {
      render(<AppLayout {...mockProps} sidebarOpen={true} />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should not render Sidebar when closed', () => {
      render(<AppLayout {...mockProps} sidebarOpen={false} />);
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    });

    it('should render WorkspacePanel', () => {
      render(<AppLayout {...mockProps} />);
      expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    });
  });

  describe('AI Panel', () => {
    it('should render AI panel when showAI is true', async () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout {...mockProps} showAI={true} activeTab={activeTab as any} />
        </Suspense>
      );
      await waitFor(() => expect(screen.getByTestId('ai-panel')).toBeInTheDocument());
    });

    it('should not render AI panel when showAI is false', () => {
      render(<AppLayout {...mockProps} showAI={false} />);
      expect(screen.queryByTestId('ai-panel')).not.toBeInTheDocument();
    });
  });

  describe('Diagram Colors Panel', () => {
    it('should render diagram colors panel when showDiagramColors is true and active tab exists', async () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout {...mockProps} showDiagramColors={true} activeTab={activeTab as any} />
        </Suspense>
      );
      await waitFor(() => expect(screen.getByTestId('diagram-colors')).toBeInTheDocument());
    });

    it('should not render diagram colors panel when showDiagramColors is false', () => {
      render(<AppLayout {...mockProps} showDiagramColors={false} />);
      expect(screen.queryByTestId('diagram-colors')).not.toBeInTheDocument();
    });
  });

  describe('Advanced Style Panel', () => {
    it('should render advanced style panel when showAdvancedStyle is true and active tab exists', async () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout {...mockProps} showAdvancedStyle={true} activeTab={activeTab as any} />
        </Suspense>
      );
      await waitFor(() => expect(screen.getByTestId('advanced-style')).toBeInTheDocument());
    });

    it('should not render advanced style panel when showAdvancedStyle is false', () => {
      render(<AppLayout {...mockProps} showAdvancedStyle={false} />);
      expect(screen.queryByTestId('advanced-style')).not.toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('should pass theme to child components', () => {
      render(<AppLayout {...mockProps} theme="dark" />);
      expect(screen.getByText('Theme: dark')).toBeInTheDocument();
    });

    it('should pass language to TopBar', () => {
      render(<AppLayout {...mockProps} language="de" />);
      expect(screen.getByText('Language: de')).toBeInTheDocument();
    });

    it('should call onToggleAI when toggle button clicked', () => {
      render(<AppLayout {...mockProps} showAI={true} />);
      const toggleButton = screen.getByText('Toggle AI');
      toggleButton.click();
      expect(mockProps.onToggleAI).toHaveBeenCalled();
    });

    it('should call onDiagramColorsClose when close button clicked', () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(<AppLayout {...mockProps} showDiagramColors={true} activeTab={activeTab as any} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onDiagramColorsClose).toHaveBeenCalled();
    });

    it('should call onAIApply when apply button clicked', () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(<AppLayout {...mockProps} showAI={true} activeTab={activeTab as any} />);
      const applyButton = screen.getByText('Apply');
      applyButton.click();
      expect(mockProps.onAIApply).toHaveBeenCalledWith('test content');
    });
  });

  describe('Theme', () => {
    it('should render with light theme', () => {
      const { container } = render(<AppLayout {...mockProps} theme="light" />);
      expect(container.querySelector('.dark')).toBeNull();
    });

    it('should render with dark theme', () => {
      const { container } = render(<AppLayout {...mockProps} theme="dark" />);
      expect(container.querySelector('.dark')).toBeInTheDocument();
    });
  });

  describe('Focus Mode', () => {
    it('should pass focus mode to TopBar', () => {
      render(<AppLayout {...mockProps} focusMode={true} />);
      expect(screen.getByTestId('topbar')).toBeInTheDocument();
    });
  });

  describe('Panel Conditional Rendering', () => {
    it('should not render diagram colors panel when active tab is null', () => {
      render(<AppLayout {...mockProps} showDiagramColors={true} activeTab={null} />);
      expect(screen.queryByTestId('diagram-colors')).not.toBeInTheDocument();
    });

    it('should not render advanced style panel when active tab is null', () => {
      render(<AppLayout {...mockProps} showAdvancedStyle={true} activeTab={null} />);
      expect(screen.queryByTestId('advanced-style')).not.toBeInTheDocument();
    });

    it('should render AI panel even when active tab is null (shows empty state)', () => {
      render(<AppLayout {...mockProps} showAI={true} activeTab={null} />);
      // AI panel renders but with empty content
      expect(screen.getByTestId('ai-panel')).toBeInTheDocument();
    });

    it('should render all panels when all flags are true and active tab exists', async () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout
            {...mockProps}
            showAI={true}
            showDiagramColors={true}
            showAdvancedStyle={true}
            activeTab={activeTab as any}
          />
        </Suspense>
      );
      await waitFor(() => {
        expect(screen.getByTestId('ai-panel')).toBeInTheDocument();
        expect(screen.getByTestId('diagram-colors')).toBeInTheDocument();
        expect(screen.getByTestId('advanced-style')).toBeInTheDocument();
      });
    });

    it('should call onContentChange with active tab ID when diagram colors panel changes content', async () => {
      const activeTab = { id: 'tab1', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout {...mockProps} showDiagramColors={true} activeTab={activeTab as any} />
        </Suspense>
      );
      await waitFor(() => screen.getByTestId('diagram-colors'));
      const changeButton = screen.getByText('Change Content');
      changeButton.click();
      expect(mockProps.onContentChange).toHaveBeenCalledWith('tab1', 'new color content');
    });

    it('should call onContentChange with active tab ID when advanced style panel changes content', async () => {
      const activeTab = { id: 'tab2', title: 'Test', content: 'test', diagram_id: 'd1', saved_content: 'test', is_dirty: false };
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout {...mockProps} showAdvancedStyle={true} activeTab={activeTab as any} />
        </Suspense>
      );
      await waitFor(() => screen.getByTestId('advanced-style'));
      const changeButton = screen.getByText('Change Content');
      changeButton.click();
      expect(mockProps.onContentChange).toHaveBeenCalledWith('tab2', 'new style content');
    });
  });

  describe('Tabs Handling', () => {
    it('should render with empty tabs array', () => {
      render(<AppLayout {...mockProps} tabs={[]} />);
      expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    });

    it('should render with multiple tabs', () => {
      const tabs = [
        { id: '1', name: 'Tab 1', content: 'content1', dirty: false },
        { id: '2', name: 'Tab 2', content: 'content2', dirty: false }
      ];
      render(<AppLayout {...mockProps} tabs={tabs as any} />);
      expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    });

    it('should pass activeTabId to WorkspacePanel', () => {
      render(<AppLayout {...mockProps} activeTabId="tab1" />);
      expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    });
  });
});
