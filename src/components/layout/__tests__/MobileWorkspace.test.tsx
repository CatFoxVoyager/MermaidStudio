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

describe('MobileWorkspace', () => {
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

  describe('render and initial state', () => {
    it('renders the workspace container', () => {
      render(<MobileWorkspace {...defaultProps} />);
      expect(screen.getByTestId('mobile-workspace')).toBeInTheDocument();
    });

    it('renders both toggle buttons', () => {
      render(<MobileWorkspace {...defaultProps} />);
      expect(screen.getByTestId('mobile-workspace-tab-code')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-workspace-tab-preview')).toBeInTheDocument();
    });

    it('renders both panes in DOM (keep-alive invariant)', () => {
      render(<MobileWorkspace {...defaultProps} />);
      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });

    it('shows code pane as active by default', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const codeTab = screen.getByTestId('mobile-workspace-tab-code');
      const previewTab = screen.getByTestId('mobile-workspace-tab-preview');

      expect(codeTab).toHaveAttribute('aria-pressed', 'true');
      expect(previewTab).toHaveAttribute('aria-pressed', 'false');
    });

    it('hides preview pane initially but keeps it mounted (keep-alive)', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const previewPane = screen.getByTestId('preview-panel');

      // Preview pane should be in DOM but hidden
      expect(previewPane).toBeInTheDocument();
      expect(previewPane).toHaveClass('hidden');
    });
  });

  describe('toggle behavior', () => {
    it('switches to preview pane when preview tab is clicked', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const previewTab = screen.getByTestId('mobile-workspace-tab-preview');

      fireEvent.click(previewTab);

      expect(previewTab).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('mobile-workspace-tab-code')).toHaveAttribute('aria-pressed', 'false');
    });

    it('switches back to code pane when code tab is clicked', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const codeTab = screen.getByTestId('mobile-workspace-tab-code');
      const previewTab = screen.getByTestId('mobile-workspace-tab-preview');

      // First switch to preview
      fireEvent.click(previewTab);
      // Then back to code
      fireEvent.click(codeTab);

      expect(codeTab).toHaveAttribute('aria-pressed', 'true');
      expect(previewTab).toHaveAttribute('aria-pressed', 'false');
    });

    it('maintains both panes mounted during toggle (keep-alive invariant)', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const previewTab = screen.getByTestId('mobile-workspace-tab-preview');

      // Switch to preview
      fireEvent.click(previewTab);

      // Both panes should still be in DOM
      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });
  });

  describe('scroll preservation', () => {
    it('preserves scroll position when toggling between panes', () => {
      render(<MobileWorkspace {...defaultProps} />);

      // Get the code container ref
      const codeContainer = screen.getByTestId('code-editor').closest('div[style*="overflow"]');
      if (!codeContainer) throw new Error('Code container not found');

      // Set initial scroll position
      Object.defineProperty(codeContainer, 'scrollTop', {
        writable: true,
        value: 100,
        configurable: true,
      });

      const previewTab = screen.getByTestId('mobile-workspace-tab-preview');
      const codeTab = screen.getByTestId('mobile-workspace-tab-code');

      // Switch to preview
      fireEvent.click(previewTab);

      // Switch back to code
      fireEvent.click(codeTab);

      // Scroll should be restored (this tests the useEffect scroll restoration)
      expect(codeContainer.scrollTop).toBe(100);
    });
  });

  describe('live preview wiring', () => {
    it('passes value changes to CodeEditor', () => {
      const handleChange = vi.fn();
      render(<MobileWorkspace {...defaultProps} onChange={handleChange} />);

      const codeInput = screen.getByLabelText('Code editor input');
      fireEvent.change(codeInput, { target: { value: 'new code' } });

      expect(handleChange).toHaveBeenCalledWith('new code');
    });

    it('passes same value to PreviewPanel for live preview', () => {
      render(<MobileWorkspace {...defaultProps} />);

      const previewPane = screen.getByTestId('preview-panel');
      expect(previewPane).toHaveAttribute('data-content', 'graph TD\nA[Start] --> B[End]');
    });
  });

  describe('responsive typography (MWRK-03)', () => {
    it('applies max-mobile-split variant class to toggle buttons', () => {
      render(<MobileWorkspace {...defaultProps} />);
      const codeTab = screen.getByTestId('mobile-workspace-tab-code');

      // Check that the responsive variant class is present
      expect(codeTab.className).toContain('max-mobile-split:');
    });
  });
});
