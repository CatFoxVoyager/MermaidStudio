import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FullscreenPreview } from '../FullscreenPreview';
import { applyScale } from '@/utils/uiScale';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn().mockResolvedValue({
    svg: '<svg viewBox="0 0 1000 500"><rect width="1000" height="500"/></svg>',
    error: null,
  }),
}));

vi.mock('@/lib/mermaid/codeUtils', () => ({
  parseDiagram: vi.fn().mockReturnValue({ nodes: [], edges: [], subgraphs: [] }),
}));

vi.mock('@/utils/svgPostProcessing', () => ({
  postProcessDiagramSvg: vi.fn((svg: string) => svg),
}));

describe('FullscreenPreview UI scale alignment', () => {
  let originalGetBCR: typeof Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    originalGetBCR = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return {
        left: 0,
        top: 0,
        width: 640,
        height: 480,
        right: 640,
        bottom: 480,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    };
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalGetBCR;
    applyScale(1);
  });

  it('fits to screen using local viewport dimensions and pans 1:1 under UI scale 0.8', async () => {
    applyScale(0.8);
    const { container } = render(<FullscreenPreview content="graph TD\nA-->B" onClose={vi.fn()} />);

    // Wait for SVG to render.
    await waitFor(() => expect(container.querySelector('.mermaid-canvas-svg')).not.toBeNull());

    // Local viewport is 640/0.8 = 800 x 480/0.8 = 600.
    // availW = 800 - 64 = 736, availH = 600 - 64 = 536.
    // optimal = min(1, 736/1000, 536/500) = 0.736 -> rounded 0.74 -> 74%
    // (Without screenToLocal it would be (640-64)/1000 = 0.58 -> 58%.)
    fireEvent.click(screen.getByTitle('preview.fitToScreen'));
    await waitFor(() => expect(screen.getByText('74%')).toBeInTheDocument());

    // Pointer pan: 40x20 screen px -> 50x25 local px.
    const canvas = container.querySelector('.preview-grid') as HTMLElement;
    const svgHost = container.querySelector('.mermaid-canvas-svg') as HTMLElement;
    fireEvent.mouseDown(canvas, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: 40, clientY: 20 });
    fireEvent.mouseUp(window);
    expect(svgHost.style.transform).toBe('translate(50px, 25px) scale(0.74)');
  });

  it('ignores defaultPrevented keydown events and Alt zoom chords', async () => {
    const onClose = vi.fn();
    const { container } = render(<FullscreenPreview content="graph TD\nA-->B" onClose={onClose} />);
    await waitFor(() => expect(container.querySelector('.mermaid-canvas-svg')).not.toBeNull());

    fireEvent.click(screen.getByTitle('preview.fitToScreen'));
    await waitFor(() => expect(screen.getByText('58%')).toBeInTheDocument());

    // defaultPrevented events (e.g. consumed by UI scale shortcuts) must not zoom, reset, or close.
    for (const init of [
      { key: '-', ctrlKey: true },
      { key: '=', ctrlKey: true },
      { key: '+', ctrlKey: true },
      { key: '0', ctrlKey: true },
      { key: 'Escape' },
    ]) {
      const ev = new KeyboardEvent('keydown', { ...init, cancelable: true });
      ev.preventDefault();
      fireEvent(window, ev);
    }
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Alt+- / Alt+= / Alt++ / Alt+0 must not zoom or reset even without defaultPrevented.
    for (const key of ['-', '=', '+', '0']) {
      fireEvent.keyDown(window, { key, altKey: true });
    }
    expect(screen.getByText('58%')).toBeInTheDocument();

    // Unmodified '+' still zooms the fullscreen diagram.
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByText('83%')).toBeInTheDocument();
  });
});
