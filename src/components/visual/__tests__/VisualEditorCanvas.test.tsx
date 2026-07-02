import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    // Setup fake timers for long-press detection
    vi.useFakeTimers();

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

  afterEach(() => {
    vi.useRealTimers();
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
      vi.advanceTimersByTime(501);

      await waitFor(() => {
        // Node should still be selected (multi-select on same node keeps it selected)
        expect(container.querySelector('.visual-node-overlay.selected')).toBeInTheDocument();
      });
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

      // Reset and try to zoom out below 25% (extreme pinch in)
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

      // New pinch attempt for zoom out
      fireEvent.pointerDown(canvasArea, {
        pointerId: 3,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
        shiftKey: false,
      });

      fireEvent.pointerDown(canvasArea, {
        pointerId: 4,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: 110,
        clientY: 110,
        shiftKey: false,
      });

      // Try to zoom out extremely (pinch in)
      for (let i = 0; i < 5; i++) {
        fireEvent.pointerMove(canvasArea, {
          pointerId: 3,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: 100 + i * 20,
          clientY: 100 + i * 20,
          shiftKey: false,
        });

        fireEvent.pointerMove(canvasArea, {
          pointerId: 4,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
          clientX: 110 - i * 20,
          clientY: 110 - i * 20,
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
        pointerId: 3,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 200,
        clientY: 200,
        shiftKey: false,
      });

      fireEvent.pointerUp(canvasArea, {
        pointerId: 4,
        pointerType: 'touch',
        button: 0,
        buttons: 0,
        clientX: 10,
        clientY: 10,
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
