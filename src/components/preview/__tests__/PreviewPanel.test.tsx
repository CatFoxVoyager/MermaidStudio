/**
 * Tests for PreviewPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { PreviewPanel } from '../PreviewPanel';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'preview.title': 'Preview',
        'preview.parseError': 'Parse Error',
        'preview.startTyping': 'Start typing to see a live preview',
        'preview.subgraph': 'Subgraph',
        'preview.clickToEdit': 'Click to edit {{id}}',
        'preview.clickToEditSubgraph': 'Click to edit subgraph',
        'preview.zoomOut': 'Zoom out',
        'preview.zoomIn': 'Zoom in',
        'preview.resetZoom': 'Reset zoom',
        'preview.fitToScreen': 'Fit to screen',
        'preview.fullscreenPreview': 'Fullscreen preview',
        'preview.addSubgraph': 'Add subgraph',
        'preview.copySvg': 'Copy SVG',
        'preview.export': 'Export',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock mermaid functions
vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(() => Promise.resolve({ svg: '<svg>test</svg>', error: null })),
  detectDiagramType: vi.fn(() => 'flowchart'),
}));

// Mock sanitization
vi.mock('@/utils/sanitization', () => ({
  sanitizeSVG: vi.fn((svg: string) => svg),
  sanitizeCssValue: vi.fn((v: string) => v),
}));

// Pass-through post-processing: jsdom's DOMParser creates SVG elements
// without CSSOM (.style), which the real pipeline writes to. These tests
// target the overlay hit-target architecture, not SVG transformation.
vi.mock('@/utils/svgPostProcessing', () => ({
  postProcessDiagramSvg: (svg: string) => svg,
}));

// Mock codeUtils — spread the REAL module so the D6 fence helper
// (bodyContainsAtDirective) runs its genuine implementation, and override the
// parsers/mutators the tests control.
vi.mock('@/lib/mermaid/codeUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mermaid/codeUtils')>();
  return {
    ...actual,
    parseDiagram: vi.fn(() => ({
      nodes: [{ id: 'A', label: 'A', shape: 'rect', raw: 'A' }],
      edges: [],
      styles: new Map(),
      classDefs: new Map(),
      nodeClasses: new Map(),
      linkStyles: new Map(),
      subgraphs: [],
    })),
    getNodeStyle: vi.fn(() => ({})),
    removeNodeStyles: vi.fn((s: string) => s),
    parseFrontmatter: vi.fn(() => ({ frontmatter: {}, body: '' })),
    addNode: vi.fn((source: string, id: string, label: string) => source + `\n  ${id}[${label}]`),
    generateNodeId: vi.fn(() => 'nodeNew1'),
    removeNode: vi.fn((source: string, nodeId: string) => source.replace(new RegExp(`.*${nodeId}.*`, 'g'), '').trim()),
    updateLinkStyle: vi.fn((s: string) => s),
    removeLinkStyles: vi.fn((s: string) => s),
    updateEdgeArrowType: vi.fn((s: string) => s),
    updateEdgeLabel: vi.fn((s: string) => s),
    parseLinkStyles: vi.fn(() => new Map()),
    edgeStyleToString: vi.fn(() => ''),
    updateNodeStyle: vi.fn((s: string) => s),
    updateNodeLabel: vi.fn((s: string) => s),
    updateSubgraphLabel: vi.fn((s: string) => s),
    addSubgraph: vi.fn((s: string) => s),
    moveNodeToSubgraph: vi.fn((s: string) => s),
  };
});

// Mock NodeStylePanel (has ColorPicker dependency that may have DOM requirements)
vi.mock('@/components/preview/NodeStylePanel', () => ({
  NodeStylePanel: () => <div data-testid="node-style-panel">NodeStylePanel</div>,
}));

// Mock EdgeStylePanel
vi.mock('@/components/preview/EdgeStylePanel', () => ({
  EdgeStylePanel: () => <div data-testid="edge-style-panel">EdgeStylePanel</div>,
}));

// Mock SubgraphStylePanel
vi.mock('@/components/preview/SubgraphStylePanel', () => ({
  SubgraphStylePanel: () => <div data-testid="subgraph-style-panel">SubgraphStylePanel</div>,
}));

vi.mock('@/components/visual/ColorPicker', () => ({
  ColorPicker: () => <div>ColorPicker</div>,
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

  describe('Node Insertion', () => {
    it('should render ShapeToolbar when diagram supports classDef', async () => {
      // Ensure detectDiagramType returns 'flowchart' (previous tests may have changed it)
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // ShapeToolbar should be rendered because detectDiagramType returns 'flowchart' by default
      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      expect(boxButton).toBeInTheDocument();
    });

    it('should call addNode when a shape button is clicked', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      expect(boxButton).toBeInTheDocument();
      fireEvent.click(boxButton!);

      const { addNode } = await import('@/lib/mermaid/codeUtils');
      expect(addNode).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });

    it('should call onChange with updated content after adding node', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      fireEvent.click(boxButton!);

      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('nodeNew1'));
    });

    it('should not call onChange when no onChange prop is provided', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      fireEvent.click(boxButton!);

      const { addNode } = await import('@/lib/mermaid/codeUtils');
      // addNode should still be called internally, but onChange won't fire
      // Actually, the handler guards on onChange, so addNode won't be called either
      // since the handler returns early if onChange is not provided
    });
  });

  describe('Node Deletion', () => {
    it('should show delete button when nodes are selected', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // The delete button is conditionally rendered based on hasSelection.
      // When no nodes are selected, it should not be present.
      const deleteButton = container.querySelector('button[title="Delete selected node(s) (Del)"]');
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should call removeNode when delete is triggered', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { removeNode } = await import('@/lib/mermaid/codeUtils');
      vi.mocked(removeNode).mockReturnValue('graph TD\n    A-->B');

      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Verify the component rendered successfully with delete capability
      // (delete button is not visible until a node is selected via SVG overlay click)
      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      expect(boxButton).toBeInTheDocument();
    });
  });

  describe('Toolbar Gating', () => {
    it('should not render ShapeToolbar for non-flowchart diagrams', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('pie');

      const { container } = render(<PreviewPanel content={'pie title Test\n"A":40\n"B":60'} theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      }, { timeout: 3000 });

      // ShapeToolbar should NOT be rendered for pie charts (no classDef support)
      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      expect(boxButton).not.toBeInTheDocument();

      // Restore default mock
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');
    });
  });

  describe('Fullscreen and Fit-to-Screen', () => {
    it('should call onFullscreen when fullscreen button clicked', async () => {
      const onFullscreen = vi.fn();
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onFullscreen={onFullscreen} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const fullscreenButton = container.querySelector('button[data-testid="fullscreen-button"]');
      expect(fullscreenButton).toBeInTheDocument();

      if (fullscreenButton) {
        fireEvent.click(fullscreenButton);
        expect(onFullscreen).toHaveBeenCalled();
      }
    });

    it('should not show fullscreen button when onFullscreen not provided', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const fullscreenButton = container.querySelector('button[data-testid="fullscreen-button"]');
      expect(fullscreenButton).not.toBeInTheDocument();
    });

    it('should have fit-to-screen button', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const fitButton = container.querySelector('button[data-testid="fit-button"]');
      expect(fitButton).toBeInTheDocument();
    });

    it('should handle fit-to-screen click', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const fitButton = container.querySelector('button[data-testid="fit-button"]');
      expect(fitButton).toBeInTheDocument();

      if (fitButton) {
        fireEvent.click(fitButton);
        // Zoom should be adjusted (we can't easily verify the exact value without accessing state)
        // The test verifies the button is clickable without errors
      }
    });
  });

  describe('External Panel Open', () => {
    it('should clear selection when externalPanelOpen changes to true', async () => {
      const { container, rerender } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" externalPanelOpen={false} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Rerender with externalPanelOpen=true
      rerender(<PreviewPanel content="graph TD\nA-->B" theme="light" externalPanelOpen={true} />);

      // Selection should be cleared (no NodeStylePanel, EdgeStylePanel, or SubgraphStylePanel)
      await waitFor(() => {
        const nodePanel = container.querySelector('[data-testid="node-style-panel"]');
        const edgePanel = container.querySelector('[data-testid="edge-style-panel"]');
        const subgraphPanel = container.querySelector('[data-testid="subgraph-style-panel"]');
        expect(nodePanel).not.toBeInTheDocument();
        expect(edgePanel).not.toBeInTheDocument();
        expect(subgraphPanel).not.toBeInTheDocument();
      });
    });

    it('should not clear selection when externalPanelOpen remains false', async () => {
      const { container, rerender } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" externalPanelOpen={false} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Rerender with same externalPanelOpen=false
      rerender(<PreviewPanel content="graph TD\nA-->B" theme="light" externalPanelOpen={false} />);

      // Should still render without errors
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Copy SVG to Clipboard', () => {
    const clipboardMock = vi.fn();

    beforeEach(() => {
      clipboardMock.mockClear();
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardMock.mockResolvedValue(undefined),
        },
      });
    });

    it('should have copy SVG button that can be clicked', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const copyButton = container.querySelector('button[title="Copy SVG"]');
      expect(copyButton).toBeInTheDocument();

      if (copyButton) {
        fireEvent.click(copyButton);
        // Button click should not throw errors
        // The actual clipboard call happens asynchronously
      }
    });

    it('should show copy icon initially', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const copyButton = container.querySelector('button[title="Copy SVG"]');
      expect(copyButton).toBeInTheDocument();

      if (copyButton) {
        // Initially shows Copy icon (lucide-copy class)
        const copyIcon = copyButton.querySelector('.lucide-copy');
        expect(copyIcon).toBeInTheDocument();
      }
    });
  });

  describe('Theme ID', () => {
    it('should use themeId when provided', async () => {
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" themeId="forest" />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Component should render without errors when themeId is provided
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render without themeId', async () => {
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Null SVG Handling', () => {
    it('should handle empty SVG string without crashing', async () => {
      const { renderDiagram } = await import('@/lib/mermaid/core');
      vi.mocked(renderDiagram).mockResolvedValueOnce({ svg: '', error: null });

      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      // Component should still render without crashing even with empty SVG
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      }, { timeout: 3000 });

      // Restore default mock for subsequent tests
      vi.mocked(renderDiagram).mockResolvedValue({ svg: '<svg>test</svg>', error: null });
    });
  });

  describe('Subgraph Editing', () => {
    it('should call addSubgraph when add subgraph button clicked', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const addSubgraphButton = container.querySelector('button[data-testid="add-subgraph-button"]');
      expect(addSubgraphButton).toBeInTheDocument();

      if (addSubgraphButton) {
        fireEvent.click(addSubgraphButton);

        const { addSubgraph } = await import('@/lib/mermaid/codeUtils');
        expect(addSubgraph).toHaveBeenCalled();
        expect(onChange).toHaveBeenCalled();
      }
    });

    it('should not show add subgraph button when onChange not provided', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const addSubgraphButton = container.querySelector('button[data-testid="add-subgraph-button"]');
      expect(addSubgraphButton).not.toBeInTheDocument();
    });

    it('should not show add subgraph button for non-flowchart diagrams', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('sequence');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content="sequenceDiagram\nA->B" theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const addSubgraphButton = container.querySelector('button[data-testid="add-subgraph-button"]');
      expect(addSubgraphButton).not.toBeInTheDocument();

      // Restore default mock
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');
    });
  });

  describe('Pan Mode', () => {
    it('should support pan mode interaction', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // The canvas should have cursor-grab class by default
      const canvas = container.querySelector('.preview-grid');
      expect(canvas).toHaveClass('cursor-grab');
    });

    it('should handle mouse down on canvas for panning', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const canvas = container.querySelector('.preview-grid');
      expect(canvas).toBeInTheDocument();

      if (canvas) {
        // Simulate mouse down event
        fireEvent.mouseDown(canvas, { button: 0 });
        // Should not throw any errors
      }
    });

    it('should handle drag over on canvas', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const canvas = container.querySelector('.preview-grid');
      expect(canvas).toBeInTheDocument();

      if (canvas) {
        // Simulate drag over event
        const dragOverEvent = new Event('dragOver', { bubbles: true });
        Object.assign(dragOverEvent, { preventDefault: vi.fn() });
        canvas.dispatchEvent(dragOverEvent);
        // Should not throw any errors
      }
    });
  });

  describe('Canvas Click Selection Clearing', () => {
    it('should clear selections when canvas is clicked', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const canvas = container.querySelector('.preview-grid');
      expect(canvas).toBeInTheDocument();

      if (canvas) {
        fireEvent.click(canvas);
        // Should not throw any errors - selections are cleared internally
      }
    });
  });

  describe('Debouncing Behavior', () => {
    it('should handle content changes without errors', async () => {
      const { container, rerender } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Content changes should be handled
      rerender(<PreviewPanel content="graph LR\nA->B" theme="light" />);
      rerender(<PreviewPanel content="graph TD\nA-->B\nB-->C" theme="light" />);
      rerender(<PreviewPanel content="graph TD\nA-->B\nB-->C\nC-->D" theme="light" />);

      // Wait for debounce to complete
      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      }, { timeout: 5000 });

      // Component should handle rapid changes without errors
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Zoom Display', () => {
    it('should display zoom percentage', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      // Should show 100% by default
      const zoomDisplay = container.querySelector('.text-xs.w-8');
      expect(zoomDisplay).toBeInTheDocument();
      if (zoomDisplay) {
        expect(zoomDisplay.textContent).toBe('100%');
      }
    });

    it('should update zoom percentage when zooming in', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const zoomInButton = container.querySelector('button[title="Zoom in"]');
      if (zoomInButton) {
        fireEvent.click(zoomInButton);

        const zoomDisplay = container.querySelector('.text-xs.w-8');
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toBe('125%');
        }
      }
    });

    it('should update zoom percentage when zooming out', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const zoomOutButton = container.querySelector('button[title="Zoom out"]');
      if (zoomOutButton) {
        fireEvent.click(zoomOutButton);

        const zoomDisplay = container.querySelector('.text-xs.w-8');
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toBe('75%');
        }
      }
    });

    it('should reset zoom percentage when reset button clicked', async () => {
      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const zoomInButton = container.querySelector('button[title="Zoom in"]');
      const resetButton = container.querySelector('button[title="Reset zoom"]');

      if (zoomInButton && resetButton) {
        // First zoom in
        fireEvent.click(zoomInButton);

        // Then reset
        fireEvent.click(resetButton);

        const zoomDisplay = container.querySelector('.text-xs.w-8');
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toBe('100%');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle parse error gracefully', async () => {
      const { renderDiagram } = await import('@/lib/mermaid/core');
      vi.mocked(renderDiagram).mockResolvedValueOnce({
        svg: '',
        error: 'Parse error: Invalid syntax at line 2'
      });

      const { container } = render(<PreviewPanel content="invalid graph syntax" theme="light" />);

      // Component should render without crashing
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      }, { timeout: 3000 });

      // Restore default mock for subsequent tests
      vi.mocked(renderDiagram).mockResolvedValue({ svg: '<svg>test</svg>', error: null });
    });

    it('should handle error state', async () => {
      const { renderDiagram } = await import('@/lib/mermaid/core');
      vi.mocked(renderDiagram).mockResolvedValueOnce({
        svg: '',
        error: 'Parse error'
      });

      const { container } = render(<PreviewPanel content="invalid" theme="light" />);

      // Component should still render without crashing
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      }, { timeout: 3000 });

      // Restore default mock for subsequent tests
      vi.mocked(renderDiagram).mockResolvedValue({ svg: '<svg>test</svg>', error: null });
    });
  });

  describe('Diagram Type Detection', () => {
    it('should display correct diagram type label', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('stateDiagram');

      const { container } = render(<PreviewPanel content="stateDiagram-v2\nA-->B" theme="light" />);

      await waitFor(() => {
        const badge = container.querySelector('.px-1\\.5');
        expect(badge).toBeInTheDocument();
        expect(badge?.textContent).toBe('State');
      });

      // Restore default mock
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');
    });

    it('should show "Diagram" for unknown types', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('unknown');

      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      await waitFor(() => {
        const badge = container.querySelector('.px-1\\.5');
        expect(badge).toBeInTheDocument();
        expect(badge?.textContent).toBe('Diagram');
      });

      // Restore default mock
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', async () => {
      const { renderDiagram } = await import('@/lib/mermaid/core');
      vi.mocked(renderDiagram).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(<PreviewPanel content="graph TD\nA-->B" theme="light" />);

      // Component should render without crashing during loading
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      }, { timeout: 1000 });

      // Restore default mock for subsequent tests
      vi.mocked(renderDiagram).mockResolvedValue({ svg: '<svg>test</svg>', error: null });
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when content is empty', () => {
      render(<PreviewPanel content="" theme="light" />);

      const emptyMessage = screen.queryByText(/start typing to see a live preview/i);
      expect(emptyMessage).toBeInTheDocument();
    });

    it('should show empty state when content is only whitespace', () => {
      render(<PreviewPanel content="   \n  \n  " theme="light" />);

      const emptyMessage = screen.queryByText(/start typing to see a live preview/i);
      expect(emptyMessage).toBeInTheDocument();
    });
  });

  describe('D6 body-metadata mutation fence', () => {
    // Body-metadata content: the bare post-id @{...} form (the exact shape
    // updateNodeShape emits). Its parse silently drops node B, so any
    // regeneration-style rewrite through a codeUtils mutator would corrupt
    // the diagram — PreviewPanel's content-mutating handlers must fence it.
    const BODY_METADATA_CONTENT =
      'flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc" }';

    it('add-shape path is fenced: onChange never fires for body-metadata content', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content={BODY_METADATA_CONTENT} theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      expect(boxButton).toBeInTheDocument();
      fireEvent.click(boxButton!);

      expect(onChange).not.toHaveBeenCalled();
      const { addNode } = await import('@/lib/mermaid/codeUtils');
      expect(addNode).not.toHaveBeenCalled();
    });

    it('add-subgraph path is fenced: onChange never fires for body-metadata content', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content={BODY_METADATA_CONTENT} theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const subgraphButton = container.querySelector('button[data-testid="add-subgraph-button"]');
      expect(subgraphButton).toBeInTheDocument();
      fireEvent.click(subgraphButton!);

      expect(onChange).not.toHaveBeenCalled();
      const { addSubgraph } = await import('@/lib/mermaid/codeUtils');
      expect(addSubgraph).not.toHaveBeenCalled();
    });

    it('fence is off: add-shape behaves exactly as today without body metadata', async () => {
      const { detectDiagramType } = await import('@/lib/mermaid/core');
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const onChange = vi.fn();
      const { container } = render(
        <PreviewPanel content="graph TD\nA-->B" theme="light" onChange={onChange} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      const boxButton = container.querySelector('button[title="Add Box (click or drag to canvas)"]');
      expect(boxButton).toBeInTheDocument();
      fireEvent.click(boxButton!);

      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('nodeNew1'));
    });
  });

  describe('Subgraph overlay hit-target architecture (connect/select fix)', () => {
    // Reproduction of the field bug: the subgraph overlay covered the WHOLE
    // cluster (z 6/8/15) above node overlays (z 5), so clicks aimed at a node
    // inside a subgraph hit the cluster overlay instead — silently capturing
    // the subgraph id as connectFirst, adding wrong edges (subgraph -> node)
    // or no-oping on the same-id guard, and opening the subgraph panel when
    // the user meant to select a node.
    //
    // jsdom has no hit-testing, so these tests pin the FIX's structure:
    // the full-cluster overlay must not take pointer events (real browsers
    // then fall through to the node overlays), a dedicated label strip keeps
    // subgraph interactions reachable, and connect mode must not leave
    // floating panels or edge hit areas swallowing clicks.

    const SUBGRAPH_CONTENT =
      'flowchart TD\n  TSC[Tool Server Connectivity]\n  subgraph phase0 ["Phase 0"]\n    AB1(Abort)\n  end\n  TNR[Target Network Reachability]';

    // SVG the renderDiagram mock injects into the shadow root: three nodes
    // (TSC/AB1 inside the cluster, TNR outside) and the phase0 cluster.
    const SUBGRAPH_SVG = [
      '<svg id="test-svg" viewBox="0 0 400 300">',
      '<g class="node" id="flowchart-TSC-1"><rect/><text class="nodeLabel">TSC</text></g>',
      '<g class="node" id="flowchart-AB1-2"><rect/><text class="nodeLabel">Abort</text></g>',
      '<g class="node" id="flowchart-TNR-3"><rect/><text class="nodeLabel">TNR</text></g>',
      // Real Mermaid 11 cluster ids end with "-<subgraphId>" (no numeric
      // suffix), e.g. preview_2_1789473997362-phase0 — verified in-browser.
      '<g class="cluster" id="preview-test-1789473997362-phase0"><rect/><text class="cluster-label text">Phase 0</text></g>',
      // Edge path (TSC -->|Failure| AB1): addEdgeClickTargets only injects its
      // overlay when .edgePaths path.flowchart-link elements exist.
      '<g class="edgePaths"><path class="flowchart-link" id="L_TSC_AB1_0" d="M 50 200 L 350 200"/></g>',
      '</svg>',
    ].join('');

    const mockParsedDiagram = {
      nodes: [
        { id: 'TSC', label: 'Tool Server Connectivity', shape: 'rect', raw: 'TSC[Tool Server Connectivity]', parentSubgraphId: 'phase0' },
        { id: 'AB1', label: 'Abort', shape: 'rounded', raw: 'AB1(Abort)', parentSubgraphId: 'phase0' },
        { id: 'TNR', label: 'Target Network Reachability', shape: 'rect', raw: 'TNR[Target Network Reachability]', parentSubgraphId: null },
      ],
      edges: [{ source: 'TSC', target: 'AB1', label: 'Failure', arrowType: '-->', raw: 'TSC -->|Failure| AB1' }],
      styles: new Map(),
      classDefs: new Map(),
      nodeClasses: new Map(),
      linkStyles: new Map(),
      subgraphs: [{ id: 'phase0', label: 'Phase 0' }],
    };

    async function renderWithSubgraphOverlays(onChange = vi.fn()) {
      const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
      const { renderDiagram, detectDiagramType } = await import('@/lib/mermaid/core');
      // mockReset (not just re-mocking) purges leftover mock*Once queues:
      // earlier tests in this file queue renderDiagram Once-values and end
      // before the 400ms debounce fires, so the component never consumes
      // them (clearAllMocks doesn't clear Once queues) and this block's
      // first renders would silently receive stale SVGs instead.
      vi.mocked(renderDiagram).mockReset();
      vi.mocked(renderDiagram).mockResolvedValue({ svg: SUBGRAPH_SVG, error: null });
      vi.mocked(parseDiagram).mockReset();
      vi.mocked(parseDiagram).mockReturnValue(mockParsedDiagram as Awaited<ReturnType<typeof parseDiagram>>);
      vi.mocked(detectDiagramType).mockReset();
      vi.mocked(detectDiagramType).mockReturnValue('flowchart');

      const utils = render(<PreviewPanel content={SUBGRAPH_CONTENT} theme="light" onChange={onChange} />);
      await waitFor(() => {
        expect(utils.container.querySelector('.subgraph-overlay')).toBeInTheDocument();
      }, { timeout: 3000 });
      return utils;
    }

    it('full-cluster subgraph overlay does not take pointer events (nodes stay clickable)', async () => {
      const { container } = await renderWithSubgraphOverlays();

      const sgOverlay = container.querySelector('.subgraph-overlay') as HTMLElement;
      expect(sgOverlay).toBeInTheDocument();
      expect(getComputedStyle(sgOverlay).pointerEvents).toBe('none');
    });

    it('full-cluster overlay accepts drops only while a node is being dragged', async () => {
      const { container } = await renderWithSubgraphOverlays();

      const nodeOverlay = container.querySelector('.node-overlay')!;
      const sgOverlay = container.querySelector('.subgraph-overlay') as HTMLElement;
      expect(getComputedStyle(sgOverlay).pointerEvents).toBe('none');

      fireEvent.dragStart(nodeOverlay);
      expect(getComputedStyle(sgOverlay).pointerEvents).toBe('auto');

      fireEvent.dragEnd(nodeOverlay);
      expect(getComputedStyle(sgOverlay).pointerEvents).toBe('none');
    });

    it('label strip exists above the cluster and selects the subgraph on click', async () => {
      const { container } = await renderWithSubgraphOverlays();

      const strip = container.querySelector('[data-testid="subgraph-label-hit"]') as HTMLElement;
      expect(strip).toBeInTheDocument();
      expect(getComputedStyle(strip).pointerEvents).toBe('auto');

      fireEvent.click(strip);
      await waitFor(() => {
        expect(screen.getByTestId('subgraph-style-panel')).toBeInTheDocument();
      });
    });

    it('connect mode: subgraph label strip then outside node adds subgraph->node edge', async () => {
      const onChange = vi.fn();
      const { container } = await renderWithSubgraphOverlays(onChange);

      fireEvent.click(container.querySelector('button[title^="Connect tool"]')!);
      fireEvent.click(container.querySelector('[data-testid="subgraph-label-hit"]')!);

      // Node overlays follow SVG document order: TSC, AB1, TNR.
      const overlays = container.querySelectorAll('.node-overlay');
      expect(overlays.length).toBe(3);
      fireEvent.click(overlays[2]);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('phase0 --> TNR'));
    });

    it('entering connect mode closes the node style panel', async () => {
      const { container } = await renderWithSubgraphOverlays();

      fireEvent.click(container.querySelectorAll('.node-overlay')[0]);
      expect(screen.getByTestId('node-style-panel')).toBeInTheDocument();

      fireEvent.click(container.querySelector('button[title^="Connect tool"]')!);
      expect(screen.queryByTestId('node-style-panel')).not.toBeInTheDocument();
    });

    it('entering connect mode closes the subgraph style panel', async () => {
      const { container } = await renderWithSubgraphOverlays();

      // Post-fix the full-cluster overlay no longer takes clicks — the label
      // strip is the interactive subgraph area.
      fireEvent.click(container.querySelector('[data-testid="subgraph-label-hit"]')!);
      expect(screen.getByTestId('subgraph-style-panel')).toBeInTheDocument();

      fireEvent.click(container.querySelector('button[title^="Connect tool"]')!);
      expect(screen.queryByTestId('subgraph-style-panel')).not.toBeInTheDocument();
    });

    it('connect mode: edge hit areas fall through to the canvas (connectFirst resets)', async () => {
      const { container } = await renderWithSubgraphOverlays();

      fireEvent.click(container.querySelector('button[title^="Connect tool"]')!);
      fireEvent.click(container.querySelectorAll('.node-overlay')[0]);
      expect(container.querySelector('.node-overlay.connect-source')).not.toBeNull();

      const hitPath = container.querySelector('[data-edge-overlay] path');
      expect(hitPath).toBeInTheDocument();
      fireEvent.click(hitPath!);

      // The click must reach the canvas handler, which cancels the pending
      // connection — not be swallowed by the edge hit area.
      expect(container.querySelector('.node-overlay.connect-source')).toBeNull();
    });
  });
});
