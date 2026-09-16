/**
 * Tests for drag-to-connect in the visual editor.
 *
 * Contract under lock:
 * - dragging from one node overlay onto another node overlay creates an edge
 *   (addEdge via onChange) — the gesture users expect from diagram editors;
 * - a drag that ends anywhere else is silently cancelled (no onChange);
 * - movements below the drag threshold never arm the gesture, so a plain
 *   click still selects (pointer flow unchanged);
 * - pointerCancel mid-drag resets the ghost line.
 *
 * Rects: node A occupies (100,100)-(200,150), node B (300,100)-(400,150)
 * in viewport coordinates; the container is (0,0)-(800,600).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { VisualEditorCanvas } from '../VisualEditorCanvas';

const mockSvg = `
<svg>
  <g class="node" id="flowchart-A-1"><rect width="100" height="50" /></g>
  <g class="node" id="flowchart-B-1"><rect width="100" height="50" /></g>
</svg>`;

vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(async () => ({ svg: mockSvg, error: null })),
}));

vi.mock('@/utils/sanitization', () => ({
  sanitizeSVG: vi.fn((svg: string) => svg),
}));

vi.mock('@/utils/svgPostProcessing', () => ({
  postProcessDiagramSvg: (svg: string) => svg,
}));

function makeRect(x: number, y: number, width: number, height: number) {
  const rect = {
    left: x, top: y, width, height,
    right: x + width, bottom: y + height, x, y,
    toJSON: () => ({ left: x, top: y, width, height, right: x + width, bottom: y + height, x, y }),
  };
  return rect;
}

describe('VisualEditorCanvas - drag-to-connect', () => {
  const defaultProps = {
    content: 'graph TD\n  A[Start]\n  B[End]',
    theme: 'light' as const,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn();
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn();
    }
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = vi.fn(() => false);
    }

    const containerRect = makeRect(0, 0, 800, 600);
    const rectA = makeRect(100, 100, 100, 50);
    const rectB = makeRect(300, 100, 100, 50);

    Element.prototype.getBoundingClientRect = vi.fn(function(this: Element) {
      if (this.classList.contains('mermaid-container')) {
        return containerRect;
      }
      // Node overlays carry the node id in their title attribute.
      if (this.classList.contains('visual-node-overlay')) {
        return this.getAttribute('title') === 'B' ? rectB : rectA;
      }
      if (this.id?.includes('flowchart-B')) {
        return rectB;
      }
      if (this.id?.includes('flowchart-')) {
        return rectA;
      }
      return containerRect;
    });

    vi.clearAllMocks();
  });

  function getOverlay(container: HTMLElement, id: 'A' | 'B') {
    const overlay = container.querySelector(`.visual-node-overlay[title="${id}"]`) as HTMLElement;
    expect(overlay).toBeInTheDocument();
    return overlay;
  }

  function drag(from: HTMLElement, points: Array<{ x: number; y: number }>, pointerId = 1) {
    const [start, ...rest] = points;
    fireEvent.pointerDown(from, {
      pointerId, pointerType: 'mouse', button: 0, buttons: 1,
      clientX: start.x, clientY: start.y, shiftKey: false,
    });
    for (const p of rest) {
      fireEvent.pointerMove(from, {
        pointerId, pointerType: 'mouse', buttons: 1,
        clientX: p.x, clientY: p.y,
      });
    }
    const end = rest[rest.length - 1] ?? start;
    fireEvent.pointerUp(from, {
      pointerId, pointerType: 'mouse', button: 0, buttons: 0,
      clientX: end.x, clientY: end.y, shiftKey: false,
    });
  }

  it('creates an edge when a node is dragged onto another node', async () => {
    const onChange = vi.fn();
    const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(container.querySelectorAll('.visual-node-overlay').length).toBe(2);
    });

    const a = getOverlay(container, 'A');
    drag(a, [{ x: 150, y: 125 }, { x: 250, y: 125 }, { x: 350, y: 125 }]);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('A --> B'));
    // The ghost line is gone once the gesture ends.
    expect(container.querySelector('[data-testid="drag-connect-indicator"]')).not.toBeInTheDocument();
  });

  it('cancels silently when the drag ends over empty canvas', async () => {
    const onChange = vi.fn();
    const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(container.querySelectorAll('.visual-node-overlay').length).toBe(2);
    });

    const a = getOverlay(container, 'A');
    drag(a, [{ x: 150, y: 125 }, { x: 200, y: 400 }]);

    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="drag-connect-indicator"]')).not.toBeInTheDocument();
  });

  it('does not arm below the movement threshold — a click still selects', async () => {
    const onChange = vi.fn();
    const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(container.querySelectorAll('.visual-node-overlay').length).toBe(2);
    });

    const a = getOverlay(container, 'A');
    drag(a, [{ x: 150, y: 125 }, { x: 153, y: 127 }, { x: 150, y: 125 }]);

    expect(onChange).not.toHaveBeenCalled();
    // Selection flow untouched: the node is selected like a plain click.
    await waitFor(() => {
      expect(container.querySelector('.visual-node-overlay.selected')).toBeInTheDocument();
    });
  });

  it('resets the ghost line on pointerCancel mid-drag', async () => {
    const onChange = vi.fn();
    const { container } = render(<VisualEditorCanvas {...defaultProps} onChange={onChange} />);

    await waitFor(() => {
      expect(container.querySelectorAll('.visual-node-overlay').length).toBe(2);
    });

    const a = getOverlay(container, 'A');
    fireEvent.pointerDown(a, {
      pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1,
      clientX: 150, clientY: 125, shiftKey: false,
    });
    fireEvent.pointerMove(a, {
      pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: 250, clientY: 125,
    });
    await waitFor(() => {
      expect(container.querySelector('[data-testid="drag-connect-indicator"]')).toBeInTheDocument();
    });

    fireEvent.pointerCancel(a, { pointerId: 1, pointerType: 'mouse', clientX: 250, clientY: 125 });

    expect(container.querySelector('[data-testid="drag-connect-indicator"]')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
