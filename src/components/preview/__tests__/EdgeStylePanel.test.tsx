/**
 * Tests for EdgeStylePanel component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EdgeStylePanel } from '../EdgeStylePanel';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'common.close': 'Close',
        'edgeStyle.connection': 'Connection',
        'edgeStyle.arrowType': 'Arrow Type',
        'edgeStyle.label': 'Label',
        'edgeStyle.labelPlaceholder': 'Edge label...',
        'edgeStyle.strokeColor': 'Stroke Color',
        'edgeStyle.strokeWidth': 'Stroke Width',
        'edgeStyle.strokeStyle': 'Stroke Style',
        'edgeStyle.opacity': 'Opacity',
        'edgeStyle.resetStyle': 'Reset Style',
        'edgeStyle.delete': 'Delete',
        'edgeStyle.arrowArrow': 'Arrow (-->)',
        'edgeStyle.arrowLine': 'Line (---)',
        'edgeStyle.arrowDotted': 'Dotted (-.->)',
        'edgeStyle.arrowThick': 'Thick (==>)',
        'edgeStyle.arrowCircle': 'Circle (o--o)',
        'edgeStyle.arrowCross': 'Cross (x--x)',
        'edgeStyle.arrowBidirectional': 'Bidirectional (<-->)',
        // 40-02 (Surface 1): the 9 grown picker labels — the shared
        // EDGE_ARROW_OPTIONS const maps every row through t(labelKey).
        'edgeStyle.arrowDottedOpen': 'Dotted line (-.-)',
        'edgeStyle.arrowThickOpen': 'Thick line (===)',
        'edgeStyle.arrowInvisible': 'Invisible (~~~)',
        'edgeStyle.arrowBidirectionalDotted': 'Bidirectional dotted (<-.->)',
        'edgeStyle.arrowBidirectionalThick': 'Bidirectional thick (<==>)',
        'edgeStyle.arrowCircleEnd': 'Circle end (--o)',
        'edgeStyle.arrowCircleStart': 'Circle start (o--)',
        'edgeStyle.arrowCrossEnd': 'Cross end (--x)',
        'edgeStyle.arrowCrossStart': 'Cross start (x--)',
        'edgeStyle.solid': 'Solid',
        'edgeStyle.dashed': 'Dashed',
        'edgeStyle.dotted': 'Dotted',
        'edgeStyle.animate': 'Animate',
        // 40-02 (EDGE-03, Surface 2/3): the motion-row keys.
        'edgeStyle.edgeId': 'Edge ID',
        'edgeStyle.edgeIdPlaceholder': 'e.g. e1',
        'edgeStyle.linkLength': 'Link length',
        'edgeStyle.animationSpeed': 'Speed',
        'edgeStyle.animationFast': 'Fast',
        'edgeStyle.animationSlow': 'Slow',
        'edgeStyle.step': 'Step',
        'edgeStyle.curve': 'Curve',
        'edgeStyle.curveDefault': 'Default',
        'edgeStyle.animatePreset': 'Animate (preset)',
        'edgeStyle.animatePresetHint': 'Adds a dash-animation classDef and applies it to this edge',
        // the 13-curve labels ride the advancedStyle.* keys (40-01 table)
        'advancedStyle.curveSmooth': 'Smooth',
        'advancedStyle.curveBumpX': 'Bump X',
        'advancedStyle.curveBumpY': 'Bump Y',
        'advancedStyle.curveCardinal': 'Cardinal',
        'advancedStyle.curveCatmullRom': 'Catmull-Rom',
        'advancedStyle.curveStraight': 'Straight',
        'advancedStyle.curveMonotoneX': 'Monotone X',
        'advancedStyle.curveMonotoneY': 'Monotone Y',
        'advancedStyle.curveNatural': 'Natural',
        'advancedStyle.curveStep': 'Step',
        'advancedStyle.curveStepAfter': 'Step After',
        'advancedStyle.curveStepBefore': 'Step Before',
        'advancedStyle.curveRounded': 'Rounded',
      };
      let result = map[key] ?? key;
      if (opts) {
        Object.entries(opts).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

const mockEdge = {
  source: 'A',
  target: 'B',
  arrowType: '-->',
  label: '',
  raw: 'A --> B',
};

const defaultProps = {
  edge: mockEdge,
  edgeIndex: 0,
  edgeStyle: {},
  onClose: vi.fn(),
  onArrowChange: vi.fn(),
  onLabelChange: vi.fn(),
  onStyleChange: vi.fn(),
  onReset: vi.fn(),
};

describe('EdgeStylePanel', () => {
  it('should render connection info', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    // Header and Connection section both name the pair — at least one match.
    expect(screen.getAllByText(/A.*B/).length).toBeGreaterThanOrEqual(1);
  });

  it('should render node names in the sheet header', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    // iter-32: the header names the real endpoints (source → target) —
    // machine numbering ("Edge 0") is numbering the user never wrote.
    expect(screen.getByTitle('A → B')).toBeInTheDocument();
  });

  it('should call onArrowChange when arrow type changes', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const select = screen.getByDisplayValue('Arrow (-->)');
    fireEvent.change(select, { target: { value: '==>' } });

    expect(defaultProps.onArrowChange).toHaveBeenCalledWith('A', 'B', '==>');
  });

  it('should call onLabelChange on blur', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Edge label...');
    fireEvent.change(input, { target: { value: 'test label' } });
    fireEvent.blur(input);

    expect(defaultProps.onLabelChange).toHaveBeenCalledWith('A', 'B', 'test label');
  });

  it('should call onLabelChange on Enter key', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Edge label...');
    fireEvent.change(input, { target: { value: 'test label' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onLabelChange).toHaveBeenCalledWith('A', 'B', 'test label');
  });

  it('should render existing label in input', () => {
    const edgeWithLabel = { ...mockEdge, label: 'existing label' };
    render(<EdgeStylePanel {...defaultProps} edge={edgeWithLabel} />);

    expect(screen.getByDisplayValue('existing label')).toBeInTheDocument();
  });

  it('should call onStyleChange when stroke width changes', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const rangeInput = screen.getByRole('slider');
    fireEvent.change(rangeInput, { target: { value: '4' } });

    expect(defaultProps.onStyleChange).toHaveBeenCalledWith(0, { strokeWidth: '4.0px' });
  });

  it('should call onStyleChange when stroke style changes', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const dashedButton = screen.getByText('Dashed');
    fireEvent.click(dashedButton);

    expect(defaultProps.onStyleChange).toHaveBeenCalledWith(0, { strokeDasharray: '5 5' });
  });

  it('should call onReset when reset button clicked', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const resetButton = screen.getByText('Reset Style');
    fireEvent.click(resetButton);

    expect(defaultProps.onReset).toHaveBeenCalledWith(0);
  });

  it('should call onDelete on the SECOND click (two-step arm, iter-24)', () => {
    const onDelete = vi.fn();
    render(<EdgeStylePanel {...defaultProps} onDelete={onDelete} />);

    // First click arms, second executes (same pattern as the node panel).
    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByTitle('Delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('should hide the delete button when onDelete is not provided', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(<EdgeStylePanel {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should stop propagation on panel click', () => {
    const container = render(<EdgeStylePanel {...defaultProps} />);
    const panel = container.container.firstElementChild as HTMLElement;

    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: panel });
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    panel.dispatchEvent(clickEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should render with existing edge style values', () => {
    const edgeStyle = { stroke: 'red', strokeWidth: '3px', strokeDasharray: '5 5' };
    render(<EdgeStylePanel {...defaultProps} edgeStyle={edgeStyle} />);

    expect(screen.getByRole('slider')).toHaveValue('3');
    // jsdom 30 computes border-width per the CSS spec (0px when border-style
    // is none — no Tailwind stylesheet is loaded here), so getComputedStyle no
    // longer reflects the inline value. The panel's contract is the inline
    // style it writes, so read that directly.
    expect(screen.getByText('Dashed').closest('button')?.style.borderWidth).toBe('2px');
  });

  describe('Animate toggle (40-01 EDGE-02 tracer)', () => {
    it('renders the toggle only when onAnimateChange is provided', () => {
      render(<EdgeStylePanel {...defaultProps} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

      render(<EdgeStylePanel {...defaultProps} onAnimateChange={vi.fn()} />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('derives the on-state from edgeMeta.animate', () => {
      render(
        <EdgeStylePanel
          {...defaultProps}
          edgeMeta={{ animate: true }}
          onAnimateChange={vi.fn()}
        />,
      );
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('renders off when edgeMeta is absent', () => {
      render(<EdgeStylePanel {...defaultProps} onAnimateChange={vi.fn()} />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('clicking the on toggle fires onAnimateChange(false)', () => {
      const onAnimateChange = vi.fn();
      render(
        <EdgeStylePanel
          {...defaultProps}
          edgeMeta={{ animate: true }}
          onAnimateChange={onAnimateChange}
        />,
      );
      fireEvent.click(screen.getByRole('checkbox'));
      expect(onAnimateChange).toHaveBeenCalledWith(false);
    });

    it('clicking the off toggle fires onAnimateChange(true)', () => {
      const onAnimateChange = vi.fn();
      render(<EdgeStylePanel {...defaultProps} onAnimateChange={onAnimateChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(onAnimateChange).toHaveBeenCalledWith(true);
    });
  });

  describe('inspector motion rows (40-02 EDGE-03, Surface 2/3)', () => {
    const rowProps = {
      edgeMeta: { animate: false, animation: 'fast' as const, step: 3, curve: 'linear' },
      onEdgeMetaChange: vi.fn(),
      onEdgeIdChange: vi.fn(),
      onEdgeLengthChange: vi.fn(),
      onAnimatePreset: vi.fn(),
    };

    it('absent handler props hide every new row (39-04 contract)', () => {
      const { container } = render(<EdgeStylePanel {...defaultProps} />);
      expect(container.querySelector('[data-edge-id-input]')).toBeNull();
      expect(container.querySelector('[data-edge-length-input]')).toBeNull();
      expect(container.querySelector('[data-edge-speed]')).toBeNull();
      expect(container.querySelector('[data-edge-step-input]')).toBeNull();
      expect(container.querySelector('[data-edge-curve-select]')).toBeNull();
      expect(container.querySelector('[data-edge-animate-preset]')).toBeNull();
    });

    it('Edge ID input displays the parsed id; typing routes through onEdgeIdChange', () => {
      const edge = { ...mockEdge, edgeId: 'e1' };
      const onEdgeIdChange = vi.fn();
      const { container } = render(
        <EdgeStylePanel {...defaultProps} edge={edge} onEdgeIdChange={onEdgeIdChange} />,
      );
      const input = container.querySelector('[data-edge-id-input]') as HTMLInputElement;
      expect(input.value).toBe('e1');
      expect(input.placeholder).toBe('e.g. e1');
      expect(input.className).toContain('font-mono');
      fireEvent.change(input, { target: { value: 'r1' } });
      expect(onEdgeIdChange).toHaveBeenCalledWith('r1');
    });

    it('connection row prefix renders `e1 · A → B` in mono when edgeId exists (Surface 7)', () => {
      const edge = { ...mockEdge, edgeId: 'e1' };
      const { container } = render(<EdgeStylePanel {...defaultProps} edge={edge} />);
      const box = container.querySelector('.font-mono');
      expect(box?.textContent).toContain('e1 · ');
      expect(box?.textContent).toContain('A');
    });

    it('length input displays the authored length verbatim and clamps NEW typed input to 1..4', () => {
      const edge = { ...mockEdge, arrowType: '-->', length: 6 };
      const onEdgeLengthChange = vi.fn();
      const { container } = render(
        <EdgeStylePanel {...defaultProps} edge={edge} onEdgeLengthChange={onEdgeLengthChange} />,
      );
      const input = container.querySelector('[data-edge-length-input]') as HTMLInputElement;
      // authored 6 displays 6 (Grey Area 4 — never rewritten by selection)
      expect(input.value).toBe('6');
      // NEW input clamps: typed 9 commits 4; typed 2 commits 2 (a same-value
      // change event dedupes on a controlled input, so distinct values fire)
      fireEvent.change(input, { target: { value: '9' } });
      expect(onEdgeLengthChange).toHaveBeenCalledWith('-->', 4);
      onEdgeLengthChange.mockClear();
      fireEvent.change(input, { target: { value: '2' } });
      expect(onEdgeLengthChange).toHaveBeenCalledWith('-->', 2);
    });

    it('a circle-start token sets the length input min to 2 (probe-invalid below it)', () => {
      const edge = { ...mockEdge, arrowType: 'o--', length: 1 };
      const { container } = render(
        <EdgeStylePanel {...defaultProps} edge={edge} onEdgeLengthChange={vi.fn()} />,
      );
      const input = container.querySelector('[data-edge-length-input]') as HTMLInputElement;
      expect(input.min).toBe('2');
    });

    it('speed segments render fast/slow, active derives from metadata, clicks commit through metadata', () => {
      const onEdgeMetaChange = vi.fn();
      const { container } = render(
        <EdgeStylePanel {...defaultProps} {...rowProps} onEdgeMetaChange={onEdgeMetaChange} />,
      );
      const fast = container.querySelector('[data-edge-speed="fast"]') as HTMLElement;
      const slow = container.querySelector('[data-edge-speed="slow"]') as HTMLElement;
      // active segment carries the accent treatment (Color item 2, inline)
      expect(fast.style.borderColor).toBe('var(--accent)');
      expect(fast.style.color).toBe('var(--accent)');
      expect(slow.style.color).toBe('var(--text-secondary)');
      fireEvent.click(slow);
      expect(onEdgeMetaChange).toHaveBeenCalledWith(
        expect.objectContaining({ animation: 'slow' }),
      );
    });

    it('step input renders the parsed integer, ignores non-integer input, commits empty = omitted', () => {
      const onEdgeMetaChange = vi.fn();
      const { container } = render(
        <EdgeStylePanel {...defaultProps} {...rowProps} onEdgeMetaChange={onEdgeMetaChange} />,
      );
      const input = container.querySelector('[data-edge-step-input]') as HTMLInputElement;
      expect(input.value).toBe('3');
      // integers only — a decimal is ignored on commit (a non-numeric string
      // never reaches value on a native number input: the browser sanitizes
      // it to '', the declared empty = omitted path)
      fireEvent.change(input, { target: { value: '2.5' } });
      expect(onEdgeMetaChange).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: '' } });
      expect(onEdgeMetaChange).toHaveBeenCalledWith({ animate: false, animation: 'fast', curve: 'linear' });
      onEdgeMetaChange.mockClear();
      fireEvent.change(input, { target: { value: '5' } });
      expect(onEdgeMetaChange).toHaveBeenCalledWith(
        expect.objectContaining({ step: 5 }),
      );
    });

    it('curve select renders Default first + exactly 13 in config-union order; a pick writes metadata.curve', () => {
      const onEdgeMetaChange = vi.fn();
      const { container } = render(
        <EdgeStylePanel {...defaultProps} {...rowProps} onEdgeMetaChange={onEdgeMetaChange} />,
      );
      const select = container.querySelector('[data-edge-curve-select]') as HTMLSelectElement;
      const values = Array.from(select.querySelectorAll('option')).map(o => o.value);
      expect(values).toEqual([
        '', 'basis', 'bumpX', 'bumpY', 'cardinal', 'catmullRom', 'linear',
        'monotoneX', 'monotoneY', 'natural', 'step', 'stepAfter', 'stepBefore', 'rounded',
      ]);
      expect(select.value).toBe('linear');
      fireEvent.change(select, { target: { value: '' } });
      expect(onEdgeMetaChange).toHaveBeenCalledWith(
        expect.not.objectContaining({ curve: expect.anything() }),
      );
    });

    it('the preset button renders full-width with the hint and fires onAnimatePreset', () => {
      const onAnimatePreset = vi.fn();
      const { container } = render(
        <EdgeStylePanel {...defaultProps} onAnimatePreset={onAnimatePreset} />,
      );
      const btn = container.querySelector('[data-edge-animate-preset]') as HTMLElement;
      expect(btn.getAttribute('aria-label')).toBe('Adds a dash-animation classDef and applies it to this edge');
      expect(btn.style.background).toBe('var(--accent-dim)');
      fireEvent.click(btn);
      expect(onAnimatePreset).toHaveBeenCalled();
    });
  });

  describe('shared 16-token arrow list (40-02 EDGE-01 Surface 1)', () => {
    it('renders exactly the shared 16 options mapped through t(labelKey)', () => {
      const { container } = render(<EdgeStylePanel {...defaultProps} />);
      const options = Array.from(container.querySelectorAll('select option')) as HTMLOptionElement[];
      expect(options).toHaveLength(16);
      expect(options.map(o => o.value)).toEqual([
        '-->', '---', '-.->', '==>', 'o--o', 'x--x', '<-->',
        '-.-', '===', '~~~', '<-.->', '<==>', '--o', 'o--', '--x', 'x--',
      ]);
      expect(options[0].textContent).toBe('Arrow (-->)');
      expect(options[13].textContent).toBe('Circle start (o--)');
    });

    it('an authored combo outside the shared 16 renders ONE extra disabled option (truthfulness)', () => {
      const comboEdge = { ...mockEdge, arrowType: 'o-.->' };
      const { container } = render(<EdgeStylePanel {...defaultProps} edge={comboEdge} />);
      const options = Array.from(container.querySelectorAll('select option'));
      expect(options).toHaveLength(17);
      const extra = options[16] as HTMLOptionElement;
      expect(extra.value).toBe('o-.->');
      expect(extra.disabled).toBe(true);
      // the select still displays the authored token truthfully
      expect((container.querySelector('select') as HTMLSelectElement).value).toBe('o-.->');
    });
  });

  describe('Phase 17 mobile responsiveness (MDRW-02)', () => {
    // Mock matchMedia per file
    const mockMatchMedia = (matches: boolean) => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    };

    describe('Mobile viewport (max-width: 767.98px)', () => {
      beforeEach(() => {
        mockMatchMedia(true); // Mobile viewport
      });

      it('should apply max-md:w-full to outer container', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:w-full');
        // Desktop base class should still be present
        expect(panel).toHaveClass('w-[280px]');
      });

      it('should apply max-md:right-0 to outer container', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:right-0');
      });

      it('should apply max-md:top-0 to outer container', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:top-auto');
      });

      it('should apply max-md:bottom-0 to outer container', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:bottom-0');
      });

      it('should apply max-md:rounded-none to outer container', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:rounded-b-none');
      });

      it('should apply max-md:h-full to outer container', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:h-[40dvh]');
      });

      it('should have close button with >=44px tap target on mobile', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const closeButton = container.querySelector('button[aria-label="Close"]');
        expect(closeButton).toHaveClass('max-md:min-w-[44px]');
        expect(closeButton).toHaveClass('max-md:min-h-[44px]');
      });
    });

    describe('Desktop viewport (>768px)', () => {
      beforeEach(() => {
        mockMatchMedia(false); // Desktop viewport
      });

      it('should preserve desktop w-[280px] base class', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('w-[280px]');
      });

      it('should preserve desktop positioning classes', () => {
        const { container } = render(<EdgeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('absolute');
        expect(panel).toHaveClass('top-0');
        expect(panel).toHaveClass('right-0');
        expect(panel).toHaveClass('h-full');
      });
    });

    describe('Functionality preserved (regression guard)', () => {
      it('should still call onClose when close button clicked on mobile', () => {
        mockMatchMedia(true);
        render(<EdgeStylePanel {...defaultProps} />);
        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });

      it('should still call onStyleChange when style changes on mobile', () => {
        mockMatchMedia(true);
        render(<EdgeStylePanel {...defaultProps} />);
        const dashedButton = screen.getByText('Dashed');
        fireEvent.click(dashedButton);
        expect(defaultProps.onStyleChange).toHaveBeenCalledWith(0, { strokeDasharray: '5 5' });
      });
    });
  });
});
