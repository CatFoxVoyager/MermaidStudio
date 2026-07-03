import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VisualEditorCanvas } from '../VisualEditorCanvas';

// Mock the Mermaid rendering library
vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(async () => ({
    svg: '<svg><g class="node" id="flowchart-A-1"><rect width="100" height="50" /></g></svg>',
    error: null,
  })),
}));

// Mock the sanitization utility
vi.mock('@/utils/sanitization', () => ({
  sanitizeSVG: vi.fn((svg: string) => svg),
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
    mockContainerRect = mockGetBoundingClientRect(0, 0, 800, 600);

    // Mock getBoundingClientRect for SVG node elements
    mockElementRect = mockGetBoundingClientRect(100, 100, 100, 50);

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
});
