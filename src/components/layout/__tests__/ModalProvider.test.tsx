/**
 * Tests for ModalProvider component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ModalProvider } from '../ModalProvider';
import { MobileShellProvider } from '@/hooks/useMobileShell';

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

vi.mock('@/components/modals/tools/WelcomeModal', () => ({
  WelcomeModal: ({ onClose }: any) => (
    <div data-testid="welcome-modal">
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
      {toasts?.map((t: any) => (
        <div key={t.id}>{t.message}</div>
      ))}
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
    showWelcome: false,
    onCloseTemplates: vi.fn(),
    onCloseHistory: vi.fn(),
    onCloseExport: vi.fn(),
    onClosePalette: vi.fn(),
    onCloseHelp: vi.fn(),
    onCloseBackup: vi.fn(),
    onCloseSaveTemplate: vi.fn(),
    onCloseAISettings: vi.fn(),
    onCloseFullscreen: vi.fn(),
    onCloseWelcome: vi.fn(),
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

  // Helper function to render ModalProvider with MobileShellProvider
  const renderModalProvider = (props: any) => {
    return render(
      <MobileShellProvider>
        <ModalProvider {...props} />
      </MobileShellProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderModalProvider(mockProps);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should not render any modals when all states are false', () => {
      renderModalProvider(mockProps);
      expect(screen.queryByTestId('template-library')).not.toBeInTheDocument();
      expect(screen.queryByTestId('version-history')).not.toBeInTheDocument();
      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });

    it('should render TemplateLibrary when showTemplates is true', async () => {
      renderModalProvider({ ...mockProps, showTemplates: true });
      expect(await screen.findByTestId('template-library')).toBeInTheDocument();
    });

    it('should call onCloseTemplates when close button clicked', async () => {
      const onCloseTemplates = vi.fn();
      renderModalProvider({ ...mockProps, showTemplates: true, onCloseTemplates });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseTemplates).toHaveBeenCalled();
      });
    });

    it('should call handleTemplateSelect when select button clicked', async () => {
      const handleTemplateSelect = vi.fn();
      renderModalProvider({ ...mockProps, showTemplates: true, handleTemplateSelect });
      const selectButton = screen.getByText('Select');
      selectButton.click();
      await waitFor(() => {
        expect(handleTemplateSelect).toHaveBeenCalledWith({ title: 'Test', content: 'test' });
      });
    });

    it('should render VersionHistory when showHistory is true and activeTab exists', async () => {
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({ ...mockProps, showHistory: true, activeTab });
      expect(await screen.findByTestId('version-history')).toBeInTheDocument();
    });

    it('should call onCloseHistory when close button clicked', async () => {
      const onCloseHistory = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({ ...mockProps, showHistory: true, activeTab, onCloseHistory });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseHistory).toHaveBeenCalled();
      });
    });

    it('should call handleRestore when restore button clicked', async () => {
      const handleRestore = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({ ...mockProps, showHistory: true, activeTab, handleRestore });
      const restoreButton = screen.getByText('Restore');
      restoreButton.click();
      await waitFor(() => {
        expect(handleRestore).toHaveBeenCalledWith('restored');
      });
    });

    it('should render ExportModal when showExport is true and activeTab exists', async () => {
      const activeTab = {
        id: '1',
        title: 'Test Diagram',
        content: 'test content',
        diagram_id: 'diag-1',
      };
      renderModalProvider({ ...mockProps, showExport: true, activeTab });
      expect(await screen.findByTestId('export-modal')).toBeInTheDocument();
      expect(screen.getByText('Title: Test Diagram')).toBeInTheDocument();
    });

    it('should call onCloseExport when close button clicked', async () => {
      const onCloseExport = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({ ...mockProps, showExport: true, activeTab, onCloseExport });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseExport).toHaveBeenCalled();
      });
    });

    it('should call handleCopyLink when copy link button clicked', async () => {
      const handleCopyLink = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({ ...mockProps, showExport: true, activeTab, handleCopyLink });
      const copyButton = screen.getByText('Copy Link');
      copyButton.click();
      await waitFor(() => {
        expect(handleCopyLink).toHaveBeenCalled();
      });
    });

    it('should render CommandPalette when showPalette is true', () => {
      renderModalProvider({ ...mockProps, showPalette: true });
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should call onClosePalette when close button clicked', async () => {
      const onClosePalette = vi.fn();
      renderModalProvider({ ...mockProps, showPalette: true, onClosePalette });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onClosePalette).toHaveBeenCalled();
      });
    });

    it('should call newDiagram when new diagram button clicked', async () => {
      const newDiagram = vi.fn();
      renderModalProvider({ ...mockProps, showPalette: true, newDiagram });
      const newButton = screen.getByText('New Diagram');
      newButton.click();
      await waitFor(() => {
        expect(newDiagram).toHaveBeenCalled();
      });
    });

    it('should render KeyboardShortcuts when showHelp is true', () => {
      renderModalProvider({ ...mockProps, showHelp: true });
      expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
    });

    it('should call onCloseHelp when close button clicked', async () => {
      const onCloseHelp = vi.fn();
      renderModalProvider({ ...mockProps, showHelp: true, onCloseHelp });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseHelp).toHaveBeenCalled();
      });
    });

    it('should render BackupPanel when showBackup is true', () => {
      renderModalProvider({ ...mockProps, showBackup: true });
      expect(screen.getByTestId('backup-panel')).toBeInTheDocument();
    });

    it('should call onCloseBackup when close button clicked', async () => {
      const onCloseBackup = vi.fn();
      renderModalProvider({ ...mockProps, showBackup: true, onCloseBackup });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseBackup).toHaveBeenCalled();
      });
    });

    it('should call showToast and refresh when imported', async () => {
      const showToast = vi.fn();
      const refresh = vi.fn();
      renderModalProvider({ ...mockProps, showBackup: true, showToast, refresh });
      const importButton = screen.getByText('Import');
      importButton.click();
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Imported');
        expect(refresh).toHaveBeenCalled();
      });
    });

    it('should render AISettingsModal when showAISettings is true', () => {
      renderModalProvider({ ...mockProps, showAISettings: true });
      expect(screen.getByTestId('ai-settings')).toBeInTheDocument();
    });

    it('should call onCloseAISettings and increment settings key when close button clicked', async () => {
      const onCloseAISettings = vi.fn();
      const setAiSettingsKey = vi.fn();
      renderModalProvider({
        ...mockProps,
        showAISettings: true,
        onCloseAISettings,
        setAiSettingsKey,
      });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseAISettings).toHaveBeenCalled();
        expect(setAiSettingsKey).toHaveBeenCalled();
      });
    });

    it('should render SaveTemplateModal when showSaveTemplate is true and activeTab exists', () => {
      const activeTab = {
        id: '1',
        title: 'Test',
        content: 'test content for template',
        diagram_id: 'diag-1',
      };
      renderModalProvider({ ...mockProps, showSaveTemplate: true, activeTab });
      expect(screen.getByTestId('save-template')).toBeInTheDocument();
      expect(screen.getByText('Content: test content for tem...')).toBeInTheDocument();
    });

    it('should call onCloseSaveTemplate when close button clicked', async () => {
      const onCloseSaveTemplate = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({
        ...mockProps,
        showSaveTemplate: true,
        activeTab,
        onCloseSaveTemplate,
      });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseSaveTemplate).toHaveBeenCalled();
      });
    });

    it('should call showToast when saved', async () => {
      const showToast = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({ ...mockProps, showSaveTemplate: true, activeTab, showToast });
      const saveButton = screen.getByText('Save');
      saveButton.click();
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Template saved');
      });
    });

    it('should render FullscreenPreview when showFullscreen is true and activeTab exists', () => {
      const activeTab = {
        id: '1',
        title: 'Test',
        content: 'fullscreen test content',
        diagram_id: 'diag-1',
      };
      renderModalProvider({ ...mockProps, showFullscreen: true, activeTab });
      expect(screen.getByTestId('fullscreen-preview')).toBeInTheDocument();
      expect(screen.getByText('Content: fullscreen test cont...')).toBeInTheDocument();
    });

    it('should call onCloseFullscreen when close button clicked', async () => {
      const onCloseFullscreen = vi.fn();
      const activeTab = { id: '1', title: 'Test', content: 'test content', diagram_id: 'diag-1' };
      renderModalProvider({
        ...mockProps,
        showFullscreen: true,
        activeTab,
        onCloseFullscreen,
      });
      const closeButton = screen.getByText('Close');
      closeButton.click();
      await waitFor(() => {
        expect(onCloseFullscreen).toHaveBeenCalled();
      });
    });

    it('should render Toast when toasts array has items', () => {
      const toasts = [{ id: '1', message: 'Test toast', type: 'info' }];
      renderModalProvider({ ...mockProps, toasts });
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });

    it('should call dismiss when dismiss button clicked', async () => {
      const dismiss = vi.fn();
      const toasts = [{ id: '1', message: 'Test toast', type: 'info' }];
      renderModalProvider({ ...mockProps, toasts, dismiss });
      const dismissButton = screen.getByText('Dismiss');
      dismissButton.click();
      await waitFor(() => {
        expect(dismiss).toHaveBeenCalledWith('1');
      });
    });

    it('can render multiple modals simultaneously', () => {
      renderModalProvider({
        ...mockProps,
        showTemplates: true,
        showHelp: true,
        showBackup: true,
      });
      expect(screen.getByTestId('template-library')).toBeInTheDocument();
      expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
      expect(screen.getByTestId('backup-panel')).toBeInTheDocument();
    });
  });

  describe('CommandPalette Integration', () => {
    it('should render CommandPalette with all required props', () => {
      const fullProps = {
        ...mockProps,
        showPalette: true,
        newDiagram: vi.fn(),
        handleNewFolder: vi.fn(),
        diagrams: [{ id: '1', title: 'Diagram 1' }] as any,
        onOpenDiagram: vi.fn(),
        toggleTheme: vi.fn(),
        theme: 'dark' as const,
      };
      renderModalProvider(fullProps);
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should not render CommandPalette when required props are missing', () => {
      const incompleteProps = {
        ...mockProps,
        showPalette: true,
        newDiagram: undefined,
        handleNewFolder: undefined,
        diagrams: undefined,
        onOpenDiagram: undefined,
        toggleTheme: undefined,
      };
      renderModalProvider(incompleteProps);
      // CommandPalette should not render if required props are missing
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });
  });
});
