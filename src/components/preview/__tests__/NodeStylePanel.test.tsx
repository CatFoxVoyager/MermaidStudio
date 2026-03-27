/**
 * Tests for NodeStylePanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeStylePanel } from '../NodeStylePanel';
import type { NodeStyle } from '@/lib/mermaid/codeUtils';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'nodeStyle.nodes': '{{count}} Nodes',
        'nodeStyle.label': 'Label',
        'nodeStyle.labelPlaceholder': 'Node label...',
        'nodeStyle.fillColor': 'Fill Color',
        'nodeStyle.borderColor': 'Border Color',
        'nodeStyle.borderWidth': 'Border Width',
        'nodeStyle.borderStyle': 'Border Style',
        'nodeStyle.textColor': 'Text Color',
        'nodeStyle.subgraph': 'Subgraph',
        'nodeStyle.noneRoot': 'None (Root)',
        'nodeStyle.advanced': 'Advanced',
        'nodeStyle.fontWeight': 'Font Weight',
        'nodeStyle.fontSize': 'Font Size',
        'nodeStyle.borderRadiusX': 'Border Radius X',
        'nodeStyle.borderRadiusY': 'Border Radius Y',
        'nodeStyle.resetStyles': 'Reset Styles',
        'nodeStyle.mixed': 'Mixed',
        'nodeStyle.mix': 'Mix',
        'nodeStyle.solid': 'Solid',
        'nodeStyle.dashed': 'Dashed',
        'nodeStyle.dotted': 'Dotted',
        'nodeStyle.fontDefault': 'Default',
        'nodeStyle.fontNormal': 'Normal',
        'nodeStyle.fontBold': 'Bold',
        'nodeStyle.fontLighter': 'Lighter',
        'nodeStyle.fontBolder': 'Bolder',
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
  selectedNodeIds: ['A'],
  nodeStyles: [{ fill: '#dbeafe', stroke: '#3b82f6', color: '#1d4ed8' }] as NodeStyle[],
  nodeLabels: new Map<string, string>([['A', 'Node A']]),
  onClose: vi.fn(),
  onStyleChange: vi.fn(),
  onReset: vi.fn(),
};

describe('NodeStylePanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing when given valid props', () => {
      const { container } = render(<NodeStylePanel {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show node label in header when single node selected', () => {
      render(<NodeStylePanel {...defaultProps} />);
      expect(screen.getByText('Node A')).toBeInTheDocument();
    });

    it('should show "N Nodes" in header when multiple nodes selected', () => {
      render(
        <NodeStylePanel
          {...defaultProps}
          selectedNodeIds={['A', 'B']}
          nodeStyles={[
            { fill: '#dbeafe' } as NodeStyle,
            { fill: '#dcfce7' } as NodeStyle,
          ]}
          nodeLabels={new Map([['A', 'Node A'], ['B', 'Node B']])}
        />
      );
      expect(screen.getByText('2 Nodes')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should call onClose when close button clicked', () => {
      render(<NodeStylePanel {...defaultProps} />);
      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('Recommended Properties', () => {
    it('should show 5 recommended properties by default', () => {
      render(<NodeStylePanel {...defaultProps} />);
      // Fill Color, Border Color, Border Width, Border Style, Text Color
      expect(screen.getByTestId('color-picker-fill-color')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker-border-color')).toBeInTheDocument();
      expect(screen.getByText('Border Width')).toBeInTheDocument();
      expect(screen.getByText('Border Style')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker-text-color')).toBeInTheDocument();
    });
  });

  describe('Advanced Toggle', () => {
    it('should show advanced section when toggle clicked', () => {
      render(<NodeStylePanel {...defaultProps} />);
      // Advanced section should NOT be visible initially
      expect(screen.queryByText('Font Weight')).not.toBeInTheDocument();

      // Click the advanced toggle
      const toggle = screen.getByText('Advanced');
      fireEvent.click(toggle);

      // Now advanced fields should be visible
      expect(screen.getByText('Font Weight')).toBeInTheDocument();
      expect(screen.getByText('Font Size')).toBeInTheDocument();
    });

    it('should show border radius fields when not hidden', () => {
      render(<NodeStylePanel {...defaultProps} />);
      const toggle = screen.getByText('Advanced');
      fireEvent.click(toggle);
      expect(screen.getByText('Border Radius X')).toBeInTheDocument();
      expect(screen.getByText('Border Radius Y')).toBeInTheDocument();
    });

    it('should hide border radius fields when hideBorderRadius is true', () => {
      render(<NodeStylePanel {...defaultProps} hideBorderRadius />);
      const toggle = screen.getByText('Advanced');
      fireEvent.click(toggle);
      expect(screen.queryByText('Border Radius X')).not.toBeInTheDocument();
      expect(screen.queryByText('Border Radius Y')).not.toBeInTheDocument();
    });
  });

  describe('Multi-Node Mixed Values', () => {
    it('should show "Mixed" for color fields when selected nodes have different values', () => {
      render(
        <NodeStylePanel
          {...defaultProps}
          selectedNodeIds={['A', 'B']}
          nodeStyles={[
            { fill: '#dbeafe' } as NodeStyle,
            { fill: '#dcfce7' } as NodeStyle,
          ]}
          nodeLabels={new Map([['A', 'Node A'], ['B', 'Node B']])}
        />
      );
      // The Fill Color picker label should include "(Mixed)"
      expect(screen.getByText(/Fill Color \(Mixed\)/)).toBeInTheDocument();
    });
  });

  describe('Style Changes', () => {
    it('should call onStyleChange with updated style when a property changes', () => {
      render(<NodeStylePanel {...defaultProps} />);
      const fillBtn = screen.getByTestId('color-btn-fill-color');
      fireEvent.click(fillBtn);
      expect(defaultProps.onStyleChange).toHaveBeenCalledWith(
        ['A'],
        expect.objectContaining({ fill: '#ff0000' })
      );
    });
  });

  describe('Reset Button', () => {
    it('should call onReset when reset button clicked', () => {
      render(<NodeStylePanel {...defaultProps} />);
      const resetBtn = screen.getByText('Reset Styles');
      fireEvent.click(resetBtn);
      expect(defaultProps.onReset).toHaveBeenCalledWith(['A']);
    });

    it('should call onReset with all selected node IDs for multi-selection', () => {
      render(
        <NodeStylePanel
          {...defaultProps}
          selectedNodeIds={['A', 'B', 'C']}
          nodeStyles={[{}, {}, {}] as NodeStyle[]}
          nodeLabels={new Map([['A', 'A'], ['B', 'B'], ['C', 'C']])}
        />
      );
      const resetBtn = screen.getByText('Reset Styles');
      fireEvent.click(resetBtn);
      expect(defaultProps.onReset).toHaveBeenCalledWith(['A', 'B', 'C']);
    });
  });

  describe('ColorPicker Integration', () => {
    it('should use ColorPicker component for fill, stroke, and text color fields', () => {
      render(<NodeStylePanel {...defaultProps} />);
      expect(screen.getByTestId('color-picker-fill-color')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker-border-color')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker-text-color')).toBeInTheDocument();
    });
  });

  describe('Animation Class', () => {
    it('should use animate-slide-in-right CSS class', () => {
      const { container } = render(<NodeStylePanel {...defaultProps} />);
      const panel = container.querySelector('.animate-slide-in-right');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Subgraph Dropdown', () => {
    it('should show dropdown when 1 node selected and subgraph props provided', () => {
      render(
        <NodeStylePanel
          {...defaultProps}
          nodeSubgraphIds={new Map([['A', null]])}
          subgraphs={[{ id: 'S1', label: 'Group 1' }]}
          onSubgraphChange={vi.fn()}
        />
      );
      expect(screen.getByText('Subgraph')).toBeInTheDocument();
      expect(screen.getByText('None (Root)')).toBeInTheDocument();
    });

    it('should hide dropdown when multiple nodes selected', () => {
      render(
        <NodeStylePanel
          {...defaultProps}
          selectedNodeIds={['A', 'B']}
          nodeStyles={[{}, {}] as NodeStyle[]}
          nodeLabels={new Map([['A', 'A'], ['B', 'B']])}
          nodeSubgraphIds={new Map([['A', null], ['B', 'S1']])}
          subgraphs={[{ id: 'S1', label: 'Group 1' }]}
          onSubgraphChange={vi.fn()}
        />
      );
      expect(screen.queryByText('Subgraph')).not.toBeInTheDocument();
    });

    it('should hide dropdown when subgraphs not provided', () => {
      render(<NodeStylePanel {...defaultProps} />);
      expect(screen.queryByText('Subgraph')).not.toBeInTheDocument();
    });

    it('should show current subgraph value', () => {
      render(
        <NodeStylePanel
          {...defaultProps}
          nodeSubgraphIds={new Map([['A', 'S1']])}
          subgraphs={[{ id: 'S1', label: 'Group 1' }]}
          onSubgraphChange={vi.fn()}
        />
      );
      const select = screen.getByDisplayValue('Group 1');
      expect(select).toBeInTheDocument();
    });

    it('should call onSubgraphChange with null when "None (Root)" selected', () => {
      const onSubgraphChange = vi.fn();
      render(
        <NodeStylePanel
          {...defaultProps}
          nodeSubgraphIds={new Map([['A', 'S1']])}
          subgraphs={[{ id: 'S1', label: 'Group 1' }]}
          onSubgraphChange={onSubgraphChange}
        />
      );
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '' } });
      expect(onSubgraphChange).toHaveBeenCalledWith('A', null);
    });

    it('should call onSubgraphChange with id when subgraph selected', () => {
      const onSubgraphChange = vi.fn();
      render(
        <NodeStylePanel
          {...defaultProps}
          nodeSubgraphIds={new Map([['A', null]])}
          subgraphs={[{ id: 'S1', label: 'Group 1' }]}
          onSubgraphChange={onSubgraphChange}
        />
      );
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'S1' } });
      expect(onSubgraphChange).toHaveBeenCalledWith('A', 'S1');
    });
  });
});
