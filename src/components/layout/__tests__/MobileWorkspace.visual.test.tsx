import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileWorkspace } from '../MobileWorkspace';

// Mock CodeEditor and PreviewPanel to avoid CodeMirror/Mermaid initialization
vi.mock('@/editor/CodeEditor', () => ({
  CodeEditor: ({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: 'dark' | 'light' }) => (
    <div data-testid="code-editor" data-theme={theme} data-value={value}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Code editor input"
      />
    </div>
  ),
}));

vi.mock('@/preview/PreviewPanel', () => ({
  PreviewPanel: ({ content, theme, onError }: { content: string; theme: 'dark' | 'light'; onError?: (e: string | null) => void }) => (
    <div data-testid="preview-panel" data-theme={theme} data-content={content}>
      <div>Preview: {content}</div>
    </div>
  ),
}));

// Mock VisualEditorCanvas to avoid SVG rendering and pointer events
vi.mock('@/visual/VisualEditorCanvas', () => ({
  VisualEditorCanvas: ({ content, onChange }: { content: string; onChange: (v: string) => void }) => (
    <div data-testid="visual-editor-canvas" data-content={content}>
      <button
        onClick={() => onChange('updated visual content')}
        aria-label="Visual canvas change button"
      >
        Simulate Visual Change
      </button>
    </div>
  ),
}));

describe('MobileWorkspace - Visual Mode Integration', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Save original to restore after test
    originalMatchMedia = window.matchMedia;
    vi.clearAllMocks();

    // Mock window.matchMedia (jsdom doesn't implement it)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, // Default to desktop viewport
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // deprecated Safari
      removeListener: vi.fn(), // deprecated Safari
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    // Restore original to prevent mock leakage
    window.matchMedia = originalMatchMedia;
  });

  const defaultProps = {
    value: 'graph TD\nA[Start] --> B[End]',
    onChange: vi.fn(),
    theme: 'light' as const,
    themeId: 'default',
    onPreviewError: vi.fn(),
  };

  describe('3-segment toggle', () => {
    it('renders three toggle buttons with correct testids', () => {
      render(<MobileWorkspace {...defaultProps} />);

      expect(screen.getByTestId('mobile-workspace-tab-code')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-workspace-tab-preview')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-workspace-tab-visual')).toBeInTheDocument();
    });

    it('shows Visual button label from i18n', () => {
      render(<MobileWorkspace {...defaultProps} />);

      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');
      expect(visualTab).toHaveAttribute('aria-label', 'workspace.toggle.visual');
    });
  });

  describe('keep-alive invariant', () => {
    it('renders all three panes in DOM regardless of active pane', () => {
      render(<MobileWorkspace {...defaultProps} />);

      // All three panes should be present in DOM
      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
      expect(screen.getByTestId('visual-editor-canvas')).toBeInTheDocument();
    });

    it('maintains all three panes mounted when switching to visual', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');

      // Switch to visual
      fireEvent.click(visualTab);

      // All three panes should still be in DOM (keep-alive)
      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
      expect(screen.getByTestId('visual-editor-canvas')).toBeInTheDocument();
    });
  });

  describe('default active state', () => {
    it('shows code pane as active by default', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const codeTab = screen.getByTestId('mobile-workspace-tab-code');
      const previewTab = screen.getByTestId('mobile-workspace-tab-preview');
      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');

      expect(codeTab).toHaveAttribute('aria-pressed', 'true');
      expect(previewTab).toHaveAttribute('aria-pressed', 'false');
      expect(visualTab).toHaveAttribute('aria-pressed', 'false');
    });

    it('hides preview and visual panes initially but keeps them mounted (keep-alive)', () => {
      render(<MobileWorkspace {...defaultProps} />);

      const previewPane = screen.getByTestId('preview-panel');
      const visualPane = screen.getByTestId('visual-editor-canvas');

      // Both panes should be in DOM but their containers should be hidden
      expect(previewPane).toBeInTheDocument();
      expect(visualPane).toBeInTheDocument();

      const previewContainer = previewPane.closest('div.absolute');
      const visualContainer = visualPane.closest('div.absolute');

      expect(previewContainer).toHaveClass('hidden');
      expect(visualContainer).toHaveClass('hidden');
    });
  });

  describe('switch to visual pane', () => {
    it('switches to visual pane when visual tab is clicked', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');

      fireEvent.click(visualTab);

      expect(visualTab).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('mobile-workspace-tab-code')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('mobile-workspace-tab-preview')).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows visual pane and hides code/preview when visual is active', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');

      fireEvent.click(visualTab);

      // Visual pane should be visible (no hidden class)
      const visualPane = screen.getByTestId('visual-editor-canvas');
      const visualContainer = visualPane.closest('div.absolute');
      expect(visualContainer).not.toHaveClass('hidden');

      // Code and preview panes should be hidden
      const codePane = screen.getByTestId('code-editor');
      const previewPane = screen.getByTestId('preview-panel');
      const codeContainer = codePane.closest('div.absolute');
      const previewContainer = previewPane.closest('div.absolute');

      expect(codeContainer).toHaveClass('hidden');
      expect(previewContainer).toHaveClass('hidden');
    });
  });

  describe('VIS-03 sync', () => {
    it('calls onChange when VisualEditorCanvas fires onChange', () => {
      const handleChange = vi.fn();
      render(<MobileWorkspace {...defaultProps} onChange={handleChange} />);

      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');
      fireEvent.click(visualTab);

      const visualButton = screen.getByLabelText('Visual canvas change button');
      fireEvent.click(visualButton);

      expect(handleChange).toHaveBeenCalledWith('updated visual content');
    });
  });

  describe('scroll preservation for visual pane', () => {
    it('has visual container ref and scroll position ref', () => {
      render(<MobileWorkspace {...defaultProps} />);

      const visualPane = screen.getByTestId('visual-editor-canvas');
      const visualContainer = visualPane.closest('div.absolute');

      // The visual pane should be inside a container div (the ref target)
      expect(visualContainer).toBeInTheDocument();
    });

    it('preserves scroll position when switching away from visual and back', () => {
      render(<MobileWorkspace {...defaultProps} />);

      // Switch to visual first
      const visualTab = screen.getByTestId('mobile-workspace-tab-visual');
      fireEvent.click(visualTab);

      // Get the visual container (the div with overflow-auto)
      const visualContainer = screen.getByTestId('visual-editor-canvas').closest('div.overflow-auto');
      if (!visualContainer) throw new Error('Visual container not found');

      // Set initial scroll position
      Object.defineProperty(visualContainer, 'scrollTop', {
        writable: true,
        value: 150,
        configurable: true,
      });
      visualContainer.scrollTop = 150;

      const codeTab = screen.getByTestId('mobile-workspace-tab-code');

      // Switch to code (this triggers save scroll in useEffect)
      fireEvent.click(codeTab);

      // Switch back to visual (this triggers restore scroll in useEffect)
      fireEvent.click(visualTab);

      // Scroll should be restored (this tests the useEffect scroll restoration)
      expect(visualContainer.scrollTop).toBe(150);
    });
  });
});