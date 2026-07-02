/**
 * Tests for SubgraphStylePanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubgraphStylePanel } from '../SubgraphStylePanel';
import type { NodeStyle } from '@/lib/mermaid/codeUtils';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'subgraphStyle.subgraphId': 'Subgraph ID',
        'subgraphStyle.label': 'Label',
        'subgraphStyle.labelPlaceholder': 'Subgraph label...',
        'subgraphStyle.fillColor': 'Fill Color',
        'subgraphStyle.borderColor': 'Border Color',
        'subgraphStyle.strokeWidth': 'Stroke Width',
        'subgraphStyle.borderStyle': 'Border Style',
        'subgraphStyle.opacity': 'Opacity',
        'subgraphStyle.resetStyle': 'Reset Style',
        'subgraphStyle.solid': 'Solid',
        'subgraphStyle.dashed': 'Dashed',
        'subgraphStyle.dotted': 'Dotted',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock ColorPicker to avoid complex picker interactions
vi.mock('@/components/visual/ColorPicker', () => ({
  ColorPicker: ({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) => (
    <div data-testid={`color-picker-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span>{label}</span>
      <button data-testid={`color-btn-${label.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => onChange('#ff0000')}>
        {value || 'none'}
      </button>
    </div>
  ),
}));

const defaultProps = {
  subgraphId: 'S1',
  subgraphLabel: 'Group 1',
  subgraphStyle: { fill: '#dbeafe', stroke: '#3b82f6' } as NodeStyle,
  onClose: vi.fn(),
  onStyleChange: vi.fn(),
  onLabelChange: vi.fn(),
  onReset: vi.fn(),
};

describe('SubgraphStylePanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing when given valid props', () => {
      const { container } = render(<SubgraphStylePanel {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show subgraph label in header', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByText('Group 1')).toBeInTheDocument();
    });

    it('should show subgraph ID when no label', () => {
      render(<SubgraphStylePanel {...defaultProps} subgraphLabel="" />);
      expect(screen.getAllByText('S1').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Close Button', () => {
    it('should call onClose when close button clicked', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('Subgraph ID Display', () => {
    it('should show Subgraph ID as read-only info', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByText('Subgraph ID')).toBeInTheDocument();
      expect(screen.getByText('S1')).toBeInTheDocument();
    });
  });

  describe('Label Input', () => {
    it('should show label input', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByText('Label')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Subgraph label...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Group 1');
    });

    it('should call onLabelChange on blur', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      const input = screen.getByPlaceholderText('Subgraph label...');
      fireEvent.change(input, { target: { value: 'New Label' } });
      fireEvent.blur(input);
      expect(defaultProps.onLabelChange).toHaveBeenCalledWith('S1', 'New Label');
    });

    it('should call onLabelChange on Enter key', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      const input = screen.getByPlaceholderText('Subgraph label...');
      fireEvent.change(input, { target: { value: 'New Label' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onLabelChange).toHaveBeenCalledWith('S1', 'New Label');
    });
  });

  describe('Style Properties', () => {
    it('should show Fill Color and Border Color pickers', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByTestId('color-picker-fill-color')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker-border-color')).toBeInTheDocument();
    });

    it('should show Stroke Width slider', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByText('Stroke Width')).toBeInTheDocument();
    });

    it('should show Border Style buttons', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByText('Solid')).toBeInTheDocument();
      expect(screen.getByText('Dashed')).toBeInTheDocument();
      expect(screen.getByText('Dotted')).toBeInTheDocument();
    });

    it('should show Opacity slider', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      expect(screen.getByText('Opacity')).toBeInTheDocument();
    });
  });

  describe('Style Changes', () => {
    it('should call onStyleChange with fill value when fill color changes', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      const fillBtn = screen.getByTestId('color-btn-fill-color');
      fireEvent.click(fillBtn);
      expect(defaultProps.onStyleChange).toHaveBeenCalledWith(
        'S1',
        expect.objectContaining({ fill: '#ff0000' })
      );
    });

    it('should call onStyleChange with stroke value when border color changes', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      const borderBtn = screen.getByTestId('color-btn-border-color');
      fireEvent.click(borderBtn);
      expect(defaultProps.onStyleChange).toHaveBeenCalledWith(
        'S1',
        expect.objectContaining({ stroke: '#ff0000' })
      );
    });
  });

  describe('Reset Button', () => {
    it('should call onReset with subgraphId when reset clicked', () => {
      render(<SubgraphStylePanel {...defaultProps} />);
      const resetBtn = screen.getByText('Reset Style');
      fireEvent.click(resetBtn);
      expect(defaultProps.onReset).toHaveBeenCalledWith('S1');
    });
  });

  describe('Animation Class', () => {
    it('should use animate-slide-in-right CSS class', () => {
      const { container } = render(<SubgraphStylePanel {...defaultProps} />);
      const panel = container.querySelector('.animate-slide-in-right');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Empty Style', () => {
    it('should render with empty style', () => {
      render(<SubgraphStylePanel {...defaultProps} subgraphStyle={{}} />);
      expect(screen.getByText('Group 1')).toBeInTheDocument();
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
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:w-full');
        // Desktop base class should still be present
        expect(panel).toHaveClass('w-[280px]');
      });

      it('should apply max-md:right-0 to outer container', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:right-0');
      });

      it('should apply max-md:top-0 to outer container', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:top-0');
      });

      it('should apply max-md:bottom-0 to outer container', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:bottom-0');
      });

      it('should apply max-md:rounded-none to outer container', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:rounded-none');
      });

      it('should apply max-md:h-full to outer container', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:h-full');
      });

      it('should have close button with >=44px tap target on mobile', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
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
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('w-[280px]');
      });

      it('should preserve desktop positioning classes', () => {
        const { container } = render(<SubgraphStylePanel {...defaultProps} />);
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
        render(<SubgraphStylePanel {...defaultProps} />);
        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);
        expect(defaultProps.onClose).toHaveBeenCalledOnce();
      });

      it('should still call onStyleChange when style changes on mobile', () => {
        mockMatchMedia(true);
        render(<SubgraphStylePanel {...defaultProps} />);
        const fillBtn = screen.getByTestId('color-btn-fill-color');
        fireEvent.click(fillBtn);
        expect(defaultProps.onStyleChange).toHaveBeenCalledWith(
          'S1',
          expect.objectContaining({ fill: '#ff0000' })
        );
      });
    });
  });
});
