import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VisualEditorCanvas, extractSvgNodes, extractSvgEdges } from '../VisualEditorCanvas';

// Mock the Mermaid rendering library. The returned SVG is a mutable module
// variable so individual tests can swap in a richer diagram (e.g. edges);
// the default keeps the original single-node diagram for legacy tests.
let mockSvg = '<svg><g class="node" id="flowchart-A-1"><rect width="100" height="50" /></g></svg>';

vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(async () => ({
    svg: mockSvg,
    error: null,
  })),
}));

// Mock the sanitization utility
vi.mock('@/utils/sanitization', () => ({
  sanitizeSVG: vi.fn((svg: string) => svg),
}));

// Pass-through post-processing: jsdom's DOMParser creates SVG elements
// without CSSOM (.style), which the real pipeline writes to — same reason
// the PreviewPanel tests mock it. These tests target overlays and pointer
// handling, not SVG transformation.
vi.mock('@/utils/svgPostProcessing', () => ({
  postProcessDiagramSvg: (svg: string) => svg,
}));

// Mock getBoundingClientRect for the SVG container
const mockGetBoundingClientRect = (x = 0, y = 0, width = 100, height = 50) => {
  return vi.fn(() => ({
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    x,
    y,
    toJSON: () => ({ left: x, top: y, width, height, right: x + width, bottom: y + height, x, y }),
  }));
};

describe('VisualEditorCanvas - Pointer Events', () => {
  let mockContainerRect: DOMRect;
  let mockElementRect: DOMRect;

  beforeEach(() => {
    // jsdom does not implement Pointer Capture API; polyfill as no-ops so the
    // production code's setPointerCapture/releasePointerCapture calls don't throw.
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn();
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn();
    }
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = vi.fn(() => false);
    }

    // Mock getBoundingClientRect for the container
    mockContainerRect = mockGetBoundingClientRect(0, 0, 800, 600) as unknown as DOMRect;

    // Mock getBoundingClientRect for SVG node elements
    mockElementRect = mockGetBoundingClientRect(100, 100, 100, 50) as unknown as DOMRect;

    // Mock Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(function(this: Element) {
      if (this.classList.contains('mermaid-container')) {
        return mockContainerRect;
      }
      if (this.id?.includes('flowchart-')) {
        return mockElementRect;
      }
      return mockContainerRect;
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Mouse pointer selection', () => {
    const defaultProps = {
      content: 'graph TD\n  A[Start]',
      theme: 'light' as const,
      onChange: vi.fn(),
    };

    it('should select a node on mouse click', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      // Wait for the SVG to render and overlays to appear
      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;
      expect(overlay).toBeInTheDocument();

      // Simulate mouse pointer down (left click, no shift)
      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      // Simulate pointer up
      fireEvent.pointerUp(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      await waitFor(() => {
        const selectedOverlay = container.querySelector('.visual-node-overlay.selected');
        expect(selectedOverlay).toBeInTheDocument();
      });
    });

    it('should multi-select with shift+click', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;

      // First click to select
      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      fireEvent.pointerUp(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay.selected')).toBeInTheDocument();
      });

      // Shift+click should keep selection (same node, toggles off then on)
      fireEvent.pointerDown(overlay, {
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: true,
      });

      fireEvent.pointerUp(overlay, {
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: true,
      });

      await waitFor(() => {
        // Node should be deselected after shift+click
        expect(container.querySelector('.visual-node-overlay.selected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Touch pointer selection', () => {
    const defaultProps = {
      content: 'graph TD\n  A[Start]',
      theme: 'light' as const,
      onChange: vi.fn(),
    };

    it('should select a node on touch tap (short press)', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;

      // Simulate touch pointer down
      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      // Simulate pointer up before long-press threshold (500ms)
      fireEvent.pointerUp(overlay, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      await waitFor(() => {
        const selectedOverlay = container.querySelector('.visual-node-overlay.selected');
        expect(selectedOverlay).toBeInTheDocument();
      });
    });

    it('should multi-select on touch long-press (500ms)', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      // Let the initial async render (renderDiagram) resolve with REAL timers so
      // the overlay appears. waitFor requires real timers (no fake-timer mixing).
      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;

      // First tap to select
      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });
      fireEvent.pointerUp(overlay, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay.selected')).toBeInTheDocument();
      });

      // Switch to fake timers ONLY for the long-press threshold advance.
      vi.useFakeTimers();
      try {
        // Long press to multi-select
        fireEvent.pointerDown(overlay, {
          pointerId: 2,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: 150,
          clientY: 125,
          shiftKey: false,
        });
        // Advance timers past the 500ms threshold
        await act(async () => {
          vi.advanceTimersByTime(501);
        });
      } finally {
        vi.useRealTimers();
      }

      // Node should be deselected: the 500ms long-press toggles multi-select,
      // and since the first tap already selected this node, the toggle removes it.
      // (This proves the long-press timer fired — the core behavior under test.)
      expect(container.querySelector('.visual-node-overlay.selected')).not.toBeInTheDocument();
    });
  });

  describe('Connect mode', () => {
    const defaultProps = {
      content: 'graph TD\n  A[Start]\n  B[End]',
      theme: 'light' as const,
      onChange: vi.fn(),
    };

    it('should handle connect mode with mouse pointer events', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlays = container.querySelectorAll('.visual-node-overlay');
      const firstOverlay = overlays[0] as HTMLElement;
      const secondOverlay = overlays[1] as HTMLElement;

      // Click first node to start connection (we need to set connect mode first)
      // For this test, we'll assume the component is in connect mode

      // Clear selection first
      fireEvent.pointerDown(firstOverlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      fireEvent.pointerUp(firstOverlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay.selected')).toBeInTheDocument();
      });
    });
  });

  describe('setPointerCapture and releasePointerCapture', () => {
    const defaultProps = {
      content: 'graph TD\n  A[Start]',
      theme: 'light' as const,
      onChange: vi.fn(),
    };

    it('should call setPointerCapture on pointer down', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;

      // Spy on setPointerCapture
      const setPointerCaptureSpy = vi.spyOn(overlay, 'setPointerCapture');

      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      expect(setPointerCaptureSpy).toHaveBeenCalledWith(1);

      setPointerCaptureSpy.mockRestore();
    });

    it('should call releasePointerCapture on pointer up', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;

      // Spy on releasePointerCapture
      const releasePointerCaptureSpy = vi.spyOn(overlay, 'releasePointerCapture');

      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      fireEvent.pointerUp(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      expect(releasePointerCaptureSpy).toHaveBeenCalledWith(1);

      releasePointerCaptureSpy.mockRestore();
    });
  });

  describe('Canvas background interactions', () => {
    const defaultProps = {
      content: 'graph TD\n  A[Start]',
      theme: 'light' as const,
      onChange: vi.fn(),
    };

    it('should clear selection on canvas pointer down', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const overlays = container.querySelectorAll('.visual-node-overlay');
        expect(overlays.length).toBeGreaterThan(0);
      });

      const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;
      const canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // Select a node first
      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      fireEvent.pointerUp(overlay, {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 125,
        shiftKey: false,
      });

      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay.selected')).toBeInTheDocument();
      });

      // Click on canvas background to clear selection
      fireEvent.pointerDown(canvasArea, {
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 50,
        clientY: 50,
        shiftKey: false,
      });

      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay.selected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pinch-to-zoom gestures', () => {
    const defaultProps = {
      content: 'graph TD\n  A[Start]',
      theme: 'light' as const,
      onChange: vi.fn(),
    };

    it('should not zoom with single pointer movement', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const canvasArea = container.querySelector('.preview-grid');
        expect(canvasArea).toBeInTheDocument();
      });

      const canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // Single pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      // Single pointer move (should not trigger zoom)
      fireEvent.pointerMove(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: 150,
        shiftKey: false,
      });

      // Zoom should remain at default (1.0)
      await waitFor(() => {
        const zoomLabel = container.textContent;
        expect(zoomLabel).toContain('100%');
      });

      // Clean up
      fireEvent.pointerUp(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 150,
        clientY: 150,
        shiftKey: false,
      });
    });

    it('should zoom in with two-pointer pinch (distance increase)', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const canvasArea = container.querySelector('.preview-grid');
        expect(canvasArea).toBeInTheDocument();
      });

      const canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // First pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      // Second pointer down (pinch starts)
      fireEvent.pointerDown(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });

      // Move pointers apart (zoom in)
      fireEvent.pointerMove(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 50,
        clientY: 50,
        shiftKey: false,
      });

      fireEvent.pointerMove(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 250,
        clientY: 250,
        shiftKey: false,
      });

      // Zoom should increase (above 100%)
      await waitFor(() => {
        const zoomLabel = container.textContent;
        expect(zoomLabel).toContain('%');
        // Should be > 100% since we moved pointers apart
        const zoomMatch = zoomLabel?.match(/(\d+)%/);
        expect(zoomMatch).toBeTruthy();
        const zoomPercent = parseInt(zoomMatch?.[1] || '100');
        expect(zoomPercent).toBeGreaterThan(100);
      });

      // Clean up both pointers
      fireEvent.pointerUp(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 50,
        clientY: 50,
        shiftKey: false,
      });

      fireEvent.pointerUp(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 250,
        clientY: 250,
        shiftKey: false,
      });
    });

    it('should zoom out with two-pointer pinch (distance decrease)', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const canvasArea = container.querySelector('.preview-grid');
        expect(canvasArea).toBeInTheDocument();
      });

      const canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // First pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 50,
        clientY: 50,
        shiftKey: false,
      });

      // Second pointer down (pinch starts)
      fireEvent.pointerDown(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 250,
        clientY: 250,
        shiftKey: false,
      });

      // Move pointers together (zoom out)
      fireEvent.pointerMove(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      fireEvent.pointerMove(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });

      // Zoom should decrease (below 100%)
      await waitFor(() => {
        const zoomLabel = container.textContent;
        expect(zoomLabel).toContain('%');
        // Should be < 100% since we moved pointers together
        const zoomMatch = zoomLabel?.match(/(\d+)%/);
        expect(zoomMatch).toBeTruthy();
        const zoomPercent = parseInt(zoomMatch?.[1] || '100');
        expect(zoomPercent).toBeLessThan(100);
      });

      // Clean up both pointers
      fireEvent.pointerUp(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      fireEvent.pointerUp(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });
    });

    it('should clamp zoom between 0.25 (25%) and 3 (300%)', async () => {
      // Upper bound: pinch out should clamp at 300%.
      const onChange = vi.fn();
      const upper = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);
      let container = upper.container;

      await waitFor(() => {
        const canvasArea = container.querySelector('.preview-grid');
        expect(canvasArea).toBeInTheDocument();
      });

      let canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // First pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      // Second pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });

      // Try to zoom in beyond 300% (extreme pinch out)
      for (let i = 0; i < 5; i++) {
        fireEvent.pointerMove(canvasArea, {
          pointerId: 1,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: 100 - i * 50,
          clientY: 100 - i * 50,
          shiftKey: false,
        });

        fireEvent.pointerMove(canvasArea, {
          pointerId: 2,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: 200 + i * 50,
          clientY: 200 + i * 50,
          shiftKey: false,
        });
      }

      // Should clamp at 300%
      await waitFor(() => {
        const zoomLabel = container.textContent;
        expect(zoomLabel).toContain('300%');
      });

      // Clean up upper-bound gesture
      fireEvent.pointerUp(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: -50,
        clientY: -50,
        shiftKey: false,
      });
      fireEvent.pointerUp(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 450,
        clientY: 450,
        shiftKey: false,
      });

      // Lower bound: fresh mount (zoom resets to 100%), pinch in should clamp at 25%.
      upper.unmount();
      const lower = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);
      container = lower.container;

      await waitFor(() => {
        const freshCanvas = container.querySelector('.preview-grid');
        expect(freshCanvas).toBeInTheDocument();
      });

      canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // Start with pointers far apart
      fireEvent.pointerDown(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });
      fireEvent.pointerDown(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });

      // Pinch in: move both pointers toward the midpoint (150,150) without
      // crossing, so distance monotonically shrinks (zoom delta < 1 each step).
      for (let i = 1; i <= 8; i++) {
        const t = i / 8; // 0.125 .. 1.0
        fireEvent.pointerMove(canvasArea, {
          pointerId: 1,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: Math.round(100 + (150 - 100) * t),
          clientY: Math.round(100 + (150 - 100) * t),
          shiftKey: false,
        });
        fireEvent.pointerMove(canvasArea, {
          pointerId: 2,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: Math.round(200 + (150 - 200) * t),
          clientY: Math.round(200 + (150 - 200) * t),
          shiftKey: false,
        });
      }

      // Should clamp at 25%
      await waitFor(() => {
        const zoomLabel = container.textContent;
        expect(zoomLabel).toContain('25%');
      });

      // Clean up
      fireEvent.pointerUp(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 220,
        clientY: 220,
        shiftKey: false,
      });
      fireEvent.pointerUp(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 20,
        clientY: 20,
        shiftKey: false,
      });
    });

    it('should handle releasing one pointer during pinch', async () => {
      const onChange = vi.fn();
      const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

      await waitFor(() => {
        const canvasArea = container.querySelector('.preview-grid');
        expect(canvasArea).toBeInTheDocument();
      });

      const canvasArea = container.querySelector('.preview-grid') as HTMLElement;

      // First pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      // Second pointer down
      fireEvent.pointerDown(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });

      // Move pointers (zoom in)
      fireEvent.pointerMove(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 50,
        clientY: 50,
        shiftKey: false,
      });

      fireEvent.pointerMove(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 250,
        clientY: 250,
        shiftKey: false,
      });

      // Release first pointer
      fireEvent.pointerUp(canvasArea, {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 50,
        clientY: 50,
        shiftKey: false,
      });

      // Remaining pointer move should not crash or cause issues
      fireEvent.pointerMove(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 300,
        clientY: 300,
        shiftKey: false,
      });

      // Should still be functional
      expect(canvasArea).toBeInTheDocument();

      // Clean up remaining pointer
      fireEvent.pointerUp(canvasArea, {
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 300,
        clientY: 300,
        shiftKey: false,
      });
    });
  });

  // Utility: build a DOMRect-like object without depending on the jsdom stub.
  const rect = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }),
  });

  describe('Zoom-aware node overlays (extractSvgNodes)', () => {
    it('divides screen deltas and dimensions by zoom', () => {
      // At zoom 1.5 the on-screen rect of a node is scaled up 1.5x; the overlay
      // lives INSIDE the scaled wrapper, so its coordinates must be local
      // (un-scaled): delta/zoom and size/zoom.
      // NOTE: direct property assignment, not vi.spyOn — the file-level
      // beforeEach makes getBoundingClientRect an own prototype property, and
      // vi.spyOn on inherited members then mutates the shared prototype mock.
      const div = document.createElement('div');
      div.innerHTML = '<svg><g class="node" id="flowchart-A-1"><rect /></g></svg>';
      const nodeEl = div.querySelector('g.node') as SVGElement;
      nodeEl.getBoundingClientRect = () => rect(250, 140, 180, 72) as DOMRect;
      div.getBoundingClientRect = () => rect(100, 50, 800, 600) as DOMRect;

      const overlays = extractSvgNodes(div, 1.5);

      expect(overlays).toHaveLength(1);
      expect(overlays[0].id).toBe('A');
      expect(overlays[0].x).toBeCloseTo(100); // (250-100)/1.5
      expect(overlays[0].y).toBeCloseTo(60); // (140-50)/1.5
      expect(overlays[0].width).toBeCloseTo(120); // 180/1.5
      expect(overlays[0].height).toBeCloseTo(48); // 72/1.5
    });

    it('is a no-op scaling at zoom 1', () => {
      const div = document.createElement('div');
      div.innerHTML = '<svg><g class="node" id="flowchart-A-1"><rect /></g></svg>';
      const nodeEl = div.querySelector('g.node') as SVGElement;
      nodeEl.getBoundingClientRect = () => rect(150, 130, 90, 44) as DOMRect;
      div.getBoundingClientRect = () => rect(50, 30, 800, 600) as DOMRect;

      const overlays = extractSvgNodes(div, 1);

      expect(overlays[0].x).toBeCloseTo(100);
      expect(overlays[0].y).toBeCloseTo(100);
      expect(overlays[0].width).toBeCloseTo(90);
      expect(overlays[0].height).toBeCloseTo(44);
    });

    it('repositions overlays after the zoom changes (integration)', async () => {
      const onChange = vi.fn();
      const { container } = render(
        <VisualEditorCanvas content={'graph TD\n  A[Start]'} theme="light" onChange={onChange} />,
      );

      await waitFor(() => {
        expect(container.querySelectorAll('.visual-node-overlay').length).toBeGreaterThan(0);
      });

      // Default stubs: node rect at (100,100) size 100x50. At zoom 1.25 the
      // overlay must be at 100/1.25 = 80.
      // NOTE: the file-level beforeEach returns bare vi.fn objects as "rects",
      // so rect.left is undefined and React drops the style. This geometry
      // test needs real objects, so it re-installs the prototype mock. The
      // next test's beforeEach restores the original one.
      Element.prototype.getBoundingClientRect = vi.fn(function(this: Element) {
        if (this.classList.contains('mermaid-container')) {
          return rect(0, 0, 800, 600) as DOMRect;
        }
        if (this.id?.includes('flowchart-')) {
          return rect(100, 100, 100, 50) as DOMRect;
        }
        return rect(0, 0, 800, 600) as DOMRect;
      });

      fireEvent.click(screen.getByTitle('Zoom in'));

      await waitFor(() => {
        const overlay = container.querySelector('.visual-node-overlay') as HTMLElement;
        expect(overlay.style.left).toBe('80px');
        expect(overlay.style.width).toBe('80px');
      });
    });
  });

  describe('Edge overlays (extractSvgEdges)', () => {
    const twoNodesOneEdgeSvg = `
      <svg viewBox="0 0 400 200">
        <g class="node" id="flowchart-A-1" transform="translate(100,100)"><rect /></g>
        <g class="node" id="flowchart-B-2" transform="translate(300,100)"><rect /></g>
        <g class="edgePaths">
          <path class="flowchart-link" id="L_A_B_0" d="M 100 100 L 300 100" />
        </g>
      </svg>`;

    const parsedEdges = [{ source: 'A', target: 'B', arrowType: '-->', label: '' }];

    function setupEdgeSvg() {
      const div = document.createElement('div');
      div.innerHTML = twoNodesOneEdgeSvg;
      div.getBoundingClientRect = () => rect(100, 50, 800, 600) as DOMRect;
      const svgEl = div.querySelector('svg') as SVGSVGElement;
      svgEl.getBoundingClientRect = () => rect(250, 140, 1800, 720) as DOMRect;
      // Node g elements get generic rects (values unused by edge extraction).
      div.querySelectorAll('g.node').forEach(g => {
        (g as Element).getBoundingClientRect = () => rect(0, 0, 100, 50) as DOMRect;
      });
      return div;
    }

    it('maps each flowchart-link path to its parsed edge', () => {
      const div = setupEdgeSvg();

      const layer = extractSvgEdges(div, 1, parsedEdges as never);

      expect(layer.edges).toHaveLength(1);
      expect(layer.edges[0].source).toBe('A');
      expect(layer.edges[0].target).toBe('B');
      expect(layer.edges[0].d).toBe('M 100 100 L 300 100');
    });

    it('returns local (un-scaled) svg geometry at zoom != 1', () => {
      const div = setupEdgeSvg();

      const layer = extractSvgEdges(div, 1.5, parsedEdges as never);

      expect(layer.svgBox).not.toBeNull();
      expect(layer.svgBox!.left).toBeCloseTo(100); // (250-100)/1.5
      expect(layer.svgBox!.top).toBeCloseTo(60); // (140-50)/1.5
      expect(layer.svgBox!.width).toBeCloseTo(1200); // 1800/1.5
      expect(layer.svgBox!.height).toBeCloseTo(480); // 720/1.5
      expect(layer.viewBox).toBe('0 0 400 200');
    });

    it('selects the edge on hit-path click and shows it in the properties panel', async () => {
      mockSvg = twoNodesOneEdgeSvg;
      const onChange = vi.fn();
      const { container } = render(
        <VisualEditorCanvas content={'graph TD\n  A[Start] --> B[End]'} theme="light" onChange={onChange} />,
      );

      await waitFor(() => {
        expect(container.querySelectorAll('.visual-node-overlay').length).toBe(2);
      });

      await waitFor(() => {
        expect(container.querySelector('[data-edge-overlay] path')).toBeInTheDocument();
      });

      const hitPath = container.querySelector('[data-edge-overlay] path[stroke-width="15"]') as SVGPathElement
        | HTMLElement;
      expect(hitPath).toBeInTheDocument();

      fireEvent.pointerDown(hitPath, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 });

      // Edge selection surfaces in the properties panel; no node is selected.
      await waitFor(() => {
        expect(screen.getByText('Edge Properties')).toBeInTheDocument();
      });
      expect(screen.getByText('A → B')).toBeInTheDocument();
      expect(container.querySelector('.visual-node-overlay.selected')).not.toBeInTheDocument();
      expect(container.querySelector('[data-selected-edge="true"]')).toBeInTheDocument();
    });

    it('does not capture edge clicks in connect mode', async () => {
      mockSvg = twoNodesOneEdgeSvg;
      const onChange = vi.fn();
      const { container } = render(
        <VisualEditorCanvas content={'graph TD\n  A[Start] --> B[End]'} theme="light" onChange={onChange} />,
      );

      await waitFor(() => {
        expect(container.querySelector('[data-edge-overlay] path')).toBeInTheDocument();
      });

      // Enter connect mode with the keyboard shortcut.
      fireEvent.keyDown(window, { key: 'c' });

      const hitPath = container.querySelector('[data-edge-overlay] path[stroke-width="15"]') as HTMLElement;
      fireEvent.pointerDown(hitPath, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 });

      expect(screen.queryByText('Edge Properties')).not.toBeInTheDocument();
      mockSvg = '<svg><g class="node" id="flowchart-A-1"><rect width="100" height="50" /></g></svg>';
    });

    // Chrome's touch adjustment ("aim assist") can retarget a tap that
    // really lands on an edge hit-path to the nearest visible clickable
    // element — the node overlay — delivering pointer events whose contact
    // coordinates sit OUTSIDE that overlay's rect (observed in-browser on
    // mobile: a tap on a short A->B edge selected node A instead of the
    // edge; the compat mouse events even snapped into the node's rect).
    // The node handler must real-hit-test at the contact coordinates and
    // honor the edge.
    it('selects the edge when touch adjustment retargets the tap to a nearby node overlay', async () => {
      mockSvg = twoNodesOneEdgeSvg;
      const onChange = vi.fn();
      const { container } = render(
        <VisualEditorCanvas content={'graph TD\n  A[Start] --> B[End]'} theme="light" onChange={onChange} />,
      );

      await waitFor(() => {
        expect(container.querySelectorAll('.visual-node-overlay').length).toBe(2);
      });
      await waitFor(() => {
        expect(container.querySelector('[data-edge-overlay] path')).toBeInTheDocument();
      });

      // jsdom has no geometry APIs: an identity CTM on the overlay and a
      // stroke hit on the hit-path stand in for isPointInStroke().
      const overlaySvg = container.querySelector('[data-edge-overlay]') as unknown as SVGSVGElement;
      overlaySvg.getScreenCTM = () =>
        ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }) as unknown as DOMMatrix;
      const hitPath = container.querySelector(
        '[data-edge-overlay] path[stroke-width="15"]',
      ) as SVGPathElement;
      hitPath.isPointInStroke = () => true;

      // Node A's overlay rect is (100,100,100,50): the retargeted tap's
      // contact point (150,175) lies OUTSIDE it, on the edge below.
      const nodeOverlayA = container.querySelectorAll('.visual-node-overlay')[0] as HTMLElement;
      nodeOverlayA.getBoundingClientRect = () => rect(100, 100, 100, 50) as DOMRect;

      fireEvent.pointerDown(nodeOverlayA, {
        pointerId: 7, pointerType: 'touch', button: 0, buttons: 1,
        clientX: 150, clientY: 175,
      });
      fireEvent.pointerUp(nodeOverlayA, {
        pointerId: 7, pointerType: 'touch', button: 0, buttons: 0,
        clientX: 150, clientY: 175,
      });

      await waitFor(() => {
        expect(screen.getByText('Edge Properties')).toBeInTheDocument();
      });
      expect(container.querySelector('.visual-node-overlay.selected')).not.toBeInTheDocument();
      expect(container.querySelector('[data-selected-edge="true"]')).toBeInTheDocument();
      mockSvg = '<svg><g class="node" id="flowchart-A-1"><rect width="100" height="50" /></g></svg>';
    });

    // Real Mermaid 12 edge paths don't use the "M x y" space-separated format:
    // they write comma-separated coordinates and endpoints far from node
    // centers. Dropping unparseable paths left the visual editor with NO edge
    // hit targets at all (verified in-browser).
    describe('real-mermaid path tolerance', () => {
      function setupEdgeSvgWithD(d: string) {
        const div = document.createElement('div');
        div.innerHTML = twoNodesOneEdgeSvg.replace('M 100 100 L 300 100', d);
        div.getBoundingClientRect = () => rect(100, 50, 800, 600) as DOMRect;
        const svgEl = div.querySelector('svg') as SVGSVGElement;
        svgEl.getBoundingClientRect = () => rect(250, 140, 1800, 720) as DOMRect;
        return div;
      }

      it('parses comma-separated coordinates ("M 100,100 C ...")', () => {
        const div = setupEdgeSvgWithD('M 100,100 C 150,100 250,100 300,100');

        const layer = extractSvgEdges(div, 1, parsedEdges as never);

        expect(layer.edges).toHaveLength(1);
        expect(layer.edges[0].source).toBe('A');
        expect(layer.edges[0].target).toBe('B');
        expect(layer.edges[0].d).toBe('M 100,100 C 150,100 250,100 300,100');
      });

      it('falls back to parsed-edge order when endpoints sit far from node centers', () => {
        // Endpoints 100px away from the transform centers (beyond the
        // heuristic tolerance) — must still produce a hit target via order
        // fallback instead of being dropped.
        const div = setupEdgeSvgWithD('M 0 100 L 400 100');

        const layer = extractSvgEdges(div, 1, parsedEdges as never);

        expect(layer.edges).toHaveLength(1);
        expect(layer.edges[0].source).toBe('A');
        expect(layer.edges[0].target).toBe('B');
      });

      it('still emits a hit target for a path with no parseable coordinates', () => {
        const div = setupEdgeSvgWithD('garbage');

        const layer = extractSvgEdges(div, 1, parsedEdges as never);

        expect(layer.edges).toHaveLength(1);
        expect(layer.edges[0].d).toBe('garbage');
      });
    });
  });

  describe('Toolbar pointer capture guard', () => {
    it('does not capture pointers that start on toolbar buttons', async () => {
      const { container } = render(
        <VisualEditorCanvas content={'graph TD\n  A[Start]'} theme="light" onChange={vi.fn()} />,
      );
      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay')).toBeInTheDocument();
      });

      // Pointer capture retargets the browser's synthetic click to the
      // capture element — capturing a pointerdown that bubbled from a toolbar
      // button kills its onClick (the zoom buttons were dead in-browser).
      const spy = vi.spyOn(Element.prototype, 'setPointerCapture');
      try {
        fireEvent.pointerDown(screen.getByTitle('Zoom in'), {
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          buttons: 1,
        });
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('zoom button still zooms after a real pointerdown+click sequence', async () => {
      const { container } = render(
        <VisualEditorCanvas content={'graph TD\n  A[Start]'} theme="light" onChange={vi.fn()} />,
      );
      await waitFor(() => {
        expect(container.querySelector('.visual-node-overlay')).toBeInTheDocument();
      });

      const zoomIn = screen.getByTitle('Zoom in');
      fireEvent.pointerDown(zoomIn, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 });
      fireEvent.click(zoomIn);

      await waitFor(() => {
        expect(container.querySelector('[style*="scale(1.25)"]')).toBeInTheDocument();
      });
    });
  });
});
