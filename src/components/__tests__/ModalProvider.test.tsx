/**
 * Tests for ModalProvider component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModalProvider } from '../ModalProvider';

// Mock all modal components
vi.mock('@/components/modals/diagram/TemplateLibrary', () => ({
  TemplateLibrary: ({ onSelect, onClose }: any) => (
    <div data-testid="template-library">
      <button onClick={() => onSelect({ title: 'Test', content: 'test' })}>Select</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/diagram/VersionHistory', () => ({
  VersionHistory: ({ onRestore, onClose }: any) => (
    <div data-testid="version-history">
      <button onClick={() => onRestore('restored')}>Restore</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/diagram/ExportModal', () => ({
  ExportModal: ({ diagramTitle, onClose, onCopyLink }: any) => (
    <div data-testid="export-modal">
      <div>Title: {diagramTitle}</div>
      <button onClick={onCopyLink}>Copy Link</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/tools/CommandPalette', () => ({
  CommandPalette: ({ onClose, onNewDiagram }: any) => (
    <div data-testid="command-palette">
      <button onClick={onNewDiagram}>New Diagram</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/tools/KeyboardShortcuts', () => ({
  KeyboardShortcuts: ({ onClose }: any) => (
    <div data-testid="keyboard-shortcuts">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/tools/BackupPanel', () => ({
  BackupPanel: ({ onImported, onClose }: any) => (
    <div data-testid="backup-panel">
      <button onClick={() => onImported('Imported')}>Import</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/ai/AISettingsModal', () => ({
  AISettingsModal: ({ onClose }: any) => (
    <div data-testid="ai-settings">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/modals/diagram/SaveTemplateModal', () => ({
  SaveTemplateModal: ({ content, onClose, onSaved }: any) => (
    <div data-testid="save-template">
      <div>Content: {content?.substring(0, 20)}...</div>
      <button onClick={onSaved}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/preview/FullscreenPreview', () => ({
  FullscreenPreview: ({ content, onClose }: any) => (
    <div data-testid="fullscreen-preview">
      <div>Content: {content?.substring(0, 20)}...</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/shared/Toast', () => ({
  Toast: ({ toasts, dismiss }: any) => (
    <div data-testid="toast">
      {toasts?.map((t: any) => <div key={t.id}>{t.message}</div>)}
      <button onClick={() => dismiss('1')}>Dismiss</button>
    </div>
  ),
}));

describe('ModalProvider Component', () => {
  const mockProps = {
    showTemplates: false,
    showHistory: false,
    showExport: false,
    showPalette: false,
    showHelp: false,
    showBackup: false,
    showSaveTemplate: false,
    showAISettings: false,
    showFullscreen: false,
    onCloseTemplates: vi.fn(),
    onCloseHistory: vi.fn(),
    onCloseExport: vi.fn(),
    onClosePalette: vi.fn(),
    onCloseHelp: vi.fn(),
    onCloseBackup: vi.fn(),
    onCloseSaveTemplate: vi.fn(),
    onCloseAISettings: vi.fn(),
    onCloseFullscreen: vi.fn(),
    activeTab: null,
    handleTemplateSelect: vi.fn(),
    handleRestore: vi.fn(),
    handleCopyLink: vi.fn(),
    newDiagram: vi.fn(),
    handleNewFolder: vi.fn(),
    diagrams: [],
    onOpenDiagram: vi.fn(),
    toggleAI: vi.fn(),
    toggleTheme: vi.fn(),
    theme: 'light' as const,
    aiSettingsKey: 0,
    setAiSettingsKey: vi.fn(),
    refresh: vi.fn(),
    showToast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<ModalProvider {...mockProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should not render any modals when all states are false', () => {
      render(<ModalProvider {...mockProps} />);
      expect(screen.queryByTestId('template-library')).not.toBeInTheDocument();
      expect(screen.queryByTestId('version-history')).not.toBeInTheDocument();
      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
    });
  });

  describe('TemplateLibrary Modal', () => {
    it('should render TemplateLibrary when showTemplates is true', () => {
      render(<ModalProvider {...mockProps} showTemplates={true} />);
      expect(screen.getByTestId('template-library')).toBeInTheDocument();
    });

    it('should call onCloseTemplates when close button clicked', () => {
      render(<ModalProvider {...mockProps} showTemplates={true} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseTemplates).toHaveBeenCalled();
    });

    it('should call handleTemplateSelect when select button clicked', () => {
      render(<ModalProvider {...mockProps} showTemplates={true} />);
      const selectButton = screen.getByText('Select');
      selectButton.click();
      expect(mockProps.handleTemplateSelect).toHaveBeenCalledWith({ title: 'Test', content: 'test' });
    });
  });

  describe('VersionHistory Modal', () => {
    it('should render VersionHistory when showHistory is true and activeTab exists', () => {
      const activeTab = { id: '1', title: 'Test', content: 'test', diagram_id: 'd1' };
      render(<ModalProvider {...mockProps} showHistory={true} activeTab={activeTab as any} />);
      expect(screen.getByTestId('version-history')).toBeInTheDocument();
    });

    it('should call onCloseHistory when close button clicked', () => {
      render(<ModalProvider {...mockProps} showHistory={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseHistory).toHaveBeenCalled();
    });

    it('should call handleRestore when restore button clicked', () => {
      render(<ModalProvider {...mockProps} showHistory={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const restoreButton = screen.getByText('Restore');
      restoreButton.click();
      expect(mockProps.handleRestore).toHaveBeenCalledWith('restored');
    });
  });

  describe('ExportModal', () => {
    it('should render ExportModal when showExport is true and activeTab exists', () => {
      render(<ModalProvider {...mockProps} showExport={true} activeTab={{ id: '1', title: 'Test Diagram', content: 'test content', diagram_id: 'd1' } as any} />);
      expect(screen.getByTestId('export-modal')).toBeInTheDocument();
      expect(screen.getByText('Title: Test Diagram')).toBeInTheDocument();
    });

    it('should call onCloseExport when close button clicked', () => {
      render(<ModalProvider {...mockProps} showExport={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseExport).toHaveBeenCalled();
    });

    it('should call handleCopyLink when copy link button clicked', () => {
      render(<ModalProvider {...mockProps} showExport={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const copyButton = screen.getByText('Copy Link');
      copyButton.click();
      expect(mockProps.handleCopyLink).toHaveBeenCalled();
    });
  });

  describe('CommandPalette', () => {
    it('should render CommandPalette when showPalette is true', () => {
      render(<ModalProvider {...mockProps} showPalette={true} />);
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should call onClosePalette when close button clicked', () => {
      render(<ModalProvider {...mockProps} showPalette={true} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onClosePalette).toHaveBeenCalled();
    });

    it('should call newDiagram when new diagram button clicked', () => {
      render(<ModalProvider {...mockProps} showPalette={true} />);
      const newDiagramButton = screen.getByText('New Diagram');
      newDiagramButton.click();
      expect(mockProps.newDiagram).toHaveBeenCalled();
    });
  });

  describe('KeyboardShortcuts', () => {
    it('should render KeyboardShortcuts when showHelp is true', () => {
      render(<ModalProvider {...mockProps} showHelp={true} />);
      expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
    });

    it('should call onCloseHelp when close button clicked', () => {
      render(<ModalProvider {...mockProps} showHelp={true} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseHelp).toHaveBeenCalled();
    });
  });

  describe('BackupPanel', () => {
    it('should render BackupPanel when showBackup is true', () => {
      render(<ModalProvider {...mockProps} showBackup={true} />);
      expect(screen.getByTestId('backup-panel')).toBeInTheDocument();
    });

    it('should call onCloseBackup when close button clicked', () => {
      render(<ModalProvider {...mockProps} showBackup={true} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseBackup).toHaveBeenCalled();
    });

    it('should call showToast and refresh when imported', () => {
      render(<ModalProvider {...mockProps} showBackup={true} />);
      const importButton = screen.getByText('Import');
      importButton.click();
      expect(mockProps.showToast).toHaveBeenCalledWith('Imported');
      expect(mockProps.refresh).toHaveBeenCalled();
    });
  });

  describe('AISettingsModal', () => {
    it('should render AISettingsModal when showAISettings is true', () => {
      render(<ModalProvider {...mockProps} showAISettings={true} />);
      expect(screen.getByTestId('ai-settings')).toBeInTheDocument();
    });

    it('should call onCloseAISettings and increment settings key when close button clicked', () => {
      render(<ModalProvider {...mockProps} showAISettings={true} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseAISettings).toHaveBeenCalled();
      expect(mockProps.setAiSettingsKey).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('SaveTemplateModal', () => {
    it('should render SaveTemplateModal when showSaveTemplate is true and activeTab exists', () => {
      render(<ModalProvider {...mockProps} showSaveTemplate={true} activeTab={{ id: '1', title: 'Test', content: 'test content here', diagram_id: 'd1' } as any} />);
      expect(screen.getByTestId('save-template')).toBeInTheDocument();
      expect(screen.getByText('Content: test content here...')).toBeInTheDocument();
    });

    it('should call onCloseSaveTemplate when close button clicked', () => {
      render(<ModalProvider {...mockProps} showSaveTemplate={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseSaveTemplate).toHaveBeenCalled();
    });

    it('should call showToast when saved', () => {
      render(<ModalProvider {...mockProps} showSaveTemplate={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const saveButton = screen.getByText('Save');
      saveButton.click();
      expect(mockProps.showToast).toHaveBeenCalledWith('Template saved');
    });
  });

  describe('FullscreenPreview', () => {
    it('should render FullscreenPreview when showFullscreen is true and activeTab exists', () => {
      render(<ModalProvider {...mockProps} showFullscreen={true} activeTab={{ id: '1', title: 'Test', content: 'fullscreen content', diagram_id: 'd1' } as any} />);
      expect(screen.getByTestId('fullscreen-preview')).toBeInTheDocument();
    });

    it('should call onCloseFullscreen when close button clicked', () => {
      render(<ModalProvider {...mockProps} showFullscreen={true} activeTab={{ id: '1', title: 'Test', content: 'test', diagram_id: 'd1' } as any} />);
      const closeButton = screen.getByText('Close');
      closeButton.click();
      expect(mockProps.onCloseFullscreen).toHaveBeenCalled();
    });
  });

  describe('Toast', () => {
    it('should render Toast when toasts array has items', () => {
      const toasts = [
        { id: '1', message: 'Toast 1', type: 'success' },
        { id: '2', message: 'Toast 2', type: 'error' },
      ];
      render(<ModalProvider {...mockProps} toasts={toasts} />);
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
    });

    it('should call dismiss when dismiss button clicked', () => {
      const toasts = [{ id: '1', message: 'Toast 1', type: 'success' }];
      render(<ModalProvider {...mockProps} toasts={toasts} />);
      const dismissButton = screen.getByText('Dismiss');
      dismissButton.click();
      expect(mockProps.dismiss).toHaveBeenCalledWith('1');
    });
  });

  describe('Multiple Modals', () => {
    it('can render multiple modals simultaneously', () => {
      render(
        <ModalProvider
          {...mockProps}
          showTemplates={true}
          showPalette={true}
        />
      );
      expect(screen.getByTestId('template-library')).toBeInTheDocument();
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
  });

  describe('CommandPalette Modal Integration', () => {
    it('should render CommandPalette with all required props', () => {
      const diagrams = [
        { id: '1', name: 'Diagram 1', content: 'content1' },
        { id: '2', name: 'Diagram 2', content: 'content2' }
      ];
      render(
        <ModalProvider
          {...mockProps}
          showPalette={true}
          diagrams={diagrams as any}
          theme="dark"
        />
      );
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should not render CommandPalette when required props are missing', () => {
      render(
        <ModalProvider
          {...mockProps}
          showPalette={true}
          newDiagram={undefined}
          handleNewFolder={undefined}
          diagrams={undefined}
          onOpenDiagram={undefined}
          toggleTheme={undefined}
        />
      );
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });
  });
});
