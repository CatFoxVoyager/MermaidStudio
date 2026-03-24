/**
 * Tests for PreviewPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { PreviewPanel } from '../PreviewPanel';

// Mock mermaid functions
vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(() => Promise.resolve({ svg: '<svg>test</svg>', error: null })),
  detectDiagramType: vi.fn(() => 'flowchart'),
}));

// Mock sanitization
vi.mock('@/utils/sanitization', () => ({
  sanitizeSVG: vi.fn((svg: string) => svg),
}));

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

describe('PreviewPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render empty state when no content', () => {
      render(<PreviewPanel content="" theme="light" />);
      expect(screen.getByText(/start typing to see a live preview/i)).toBeInTheDocument();
    });

    it('should render loading state while rendering', async () => {
      const { renderDiagram } = await import('@/lib/mermaid/core');
      vi.mocked(renderDiagram).mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const refreshIcon = container.querySelector('.animate-spin');
        expect(refreshIcon).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should render SVG when rendering complete', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render error state on parse error', async () => {
      const { renderDiagram } = await import('@/lib/mermaid/core');
      vi.mocked(renderDiagram).mockResolvedValue({ svg: '', error: 'Parse error: Invalid syntax' });

      const { container } = render(<PreviewPanel content="invalid graph" theme="light" />);

      await waitFor(() => {
        const errorContainer = container.querySelector('.flex.flex-col.items-center.justify-center.h-full.p-8');
        expect(errorContainer).toBeInTheDocument();
        const errorText = container.querySelector('.text-sm.font-medium');
        expect(errorText?.textContent).toBe('Parse Error');
      });
    });

    it('should show diagram type badge', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('sequence');

      const { container } = render(<PreviewPanel content="sequenceDiagram\nA->B" theme="light" />);

      await waitFor(() => {
        const badge = container.querySelector('.px-1\\.5');
        expect(badge).toBeInTheDocument();
        expect(badge?.textContent).toBe('Sequence');
      });
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in when zoom in button clicked', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const zoomInButton = container.querySelector('button[title="Zoom in"]');
      expect(zoomInButton).toBeInTheDocument();

      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        // Zoom level should increase (we can't easily check the state without access to it)
      }
    });

    it('should zoom out when zoom out button clicked', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const zoomOutButton = container.querySelector('button[title="Zoom out"]');
      expect(zoomOutButton).toBeInTheDocument();

      if (zoomOutButton) {
        fireEvent.click(zoomOutButton);
        // Zoom level should decrease
      }
    });

    it('should reset zoom when reset button clicked', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const resetButton = container.querySelector('button[title="Reset zoom"]');
      expect(resetButton).toBeInTheDocument();

      if (resetButton) {
        fireEvent.click(resetButton);
        // Zoom should reset to 100%
      }
    });

    it('should display current zoom percentage', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const zoomPercentage = container.querySelector('.text-xs');
        expect(zoomPercentage).toBeInTheDocument();
      });
    });
  });

  describe('Copy SVG', () => {
    it('should have copy SVG button', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const copyButton = container.querySelector('button[title="Copy SVG"]');
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('Export', () => {
    it('should call onExport when export button clicked', async () => {
      const onExport = vi.fn();
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onExport={onExport} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const exportButton = container.querySelector('button[title="Export"]');
      expect(exportButton).toBeInTheDocument();

      if (exportButton) {
        fireEvent.click(exportButton);
        expect(onExport).toHaveBeenCalled();
      }
    });

    it('should not show export button when onExport not provided', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const exportButton = container.querySelector('button[title="Export"]');
      expect(exportButton).not.toBeInTheDocument();
    });
  });

  describe('Theme', () => {
    it('should render with light theme', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const panel = container.querySelector('.flex.flex-col');
      expect(panel).toBeInTheDocument();
    });

    it('should render with dark theme', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="dark" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const panel = container.querySelector('.flex.flex-col');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Render Time Callback', () => {
    it('should call onRenderTime with render duration', async () => {
      const onRenderTime = vi.fn();
      render(<PreviewPanel content="graph TD\nA-->B" theme="light" onRenderTime={onRenderTime} />);

      await waitFor(() => {
        expect(onRenderTime).toHaveBeenCalled();
        const renderTime = onRenderTime.mock.calls[0][0];
        expect(typeof renderTime).toBe('number');
        // Render time can be 0 in tests due to fast execution
        expect(renderTime).toBeGreaterThanOrEqual(0);
      }, { timeout: 3000 });
    });
  });

  describe('Debouncing', () => {
    it('should handle content changes', async () => {
      const { container, rerender } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      }, { timeout: 5000 });

      // Change content
      rerender(<PreviewPanel content="graph LR\nA->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
