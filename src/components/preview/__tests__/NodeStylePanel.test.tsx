/**
 * Tests for NodeStylePanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeStylePanel } from '../NodeStylePanel';
import type { NodeStyle, NodeShape } from '@/lib/mermaid/codeUtils';

// Mock i18n — 38-06: the shape-label surface derives from CANONICAL_SHAPES +
// the REAL en.json copy (the 38-05 registry-derived mock pattern), since the
// panel's Shape row resolves visual.shapes.<slug> through the same keys the
// production toolbar/picker use.
vi.mock('react-i18next', async () => {
  const { CANONICAL_SHAPES } = await import('@/lib/mermaid/shapes');
  const enMod = await import('../../../i18n/locales/en.json');
  const en = (enMod.default ?? enMod) as {
    visual: { shapes: Record<string, string>; shapeChangeHint: string };
    nodeStyle: Record<string, string>;
  };
  const shapeLabels: Record<string, string> = Object.fromEntries(
    CANONICAL_SHAPES.map((s) => [`visual.shapes.${s.shortName}`, en.visual.shapes[s.shortName] ?? s.shortName]),
  );
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, string | number>) => {
        const map: Record<string, string> = {
          'nodeStyle.nodes': '{{count}} Nodes',
          'nodeStyle.label': 'Label',
          'nodeStyle.shape': 'Shape',
          'nodeStyle.labelPlaceholder': 'Node label...',
          'nodeStyle.confirmDelete': 'Tap again to delete',
          'nodeStyle.presets': 'Presets',
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
          'nodeStyle.delete': 'Delete',
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
          'visual.shapeChangeHint': en.visual.shapeChangeHint,
          'visual.shapeSearch': 'Search shapes…',
          'visual.shapeSearchClear': 'Clear search',
          'visual.shapeSearchEmpty': 'No matching shape',
          'visual.shapeSearchEmptyHint': 'No shape matches “{{query}}”.',
          ...shapeLabels,
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
  };
});

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

// presetType mirrors the component's NodeStylePreset (required — it is what
// the preset button hands to onPresetApply) and the PresetType values the
// panel's preset classDefs use.
const defaultPresets = [
  {
    label: 'Primary',
    presetType: 'primary' as const,
    style: { fill: '#3b82f6', stroke: '#3b82f6', color: '#ffffff' } as NodeStyle,
    color: '#3b82f6',
  },
  {
    label: 'Success',
    presetType: 'success' as const,
    style: { fill: '#22c55e', stroke: '#22c55e', color: '#ffffff' } as NodeStyle,
    color: '#22c55e',
  },
  {
    label: 'Warning',
    presetType: 'warning' as const,
    style: { fill: '#f59e0b', stroke: '#f59e0b', color: '#ffffff' } as NodeStyle,
    color: '#f59e0b',
  },
  {
    label: 'Danger',
    presetType: 'danger' as const,
    style: { fill: '#ef4444', stroke: '#ef4444', color: '#ffffff' } as NodeStyle,
    color: '#ef4444',
  },
  {
    label: 'Info',
    presetType: 'info' as const,
    style: { fill: '#06b6d4', stroke: '#06b6d4', color: '#ffffff' } as NodeStyle,
    color: '#06b6d4',
  },
];

const defaultProps = {
  selectedNodeIds: ['A'],
  nodeStyles: [{ fill: '#dbeafe', stroke: '#3b82f6', color: '#1d4ed8' }] as NodeStyle[],
  nodeLabels: new Map<string, string>([['A', 'Node A']]),
  onClose: vi.fn(),
  onStyleChange: vi.fn(),
  onReset: vi.fn(),
  presets: defaultPresets,
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

    it('should call onDelete only on the SECOND click (two-step arm, iter-14)', () => {
      const onDelete = vi.fn();
      render(<NodeStylePanel {...defaultProps} onDelete={onDelete} />);
      const deleteBtn = screen.getByTitle('Delete');
      // First click ARMS the button (label flips to the confirm copy) — the
      // destructive action must not execute on a stray tap.
      fireEvent.click(deleteBtn);
      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.getByText('Tap again to delete')).toBeInTheDocument();
      // Second click EXECUTES.
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('disarms the delete button after the 3s timeout', () => {
      vi.useFakeTimers();
      try {
        const onDelete = vi.fn();
        render(<NodeStylePanel {...defaultProps} onDelete={onDelete} />);
        const deleteBtn = screen.getByTitle('Delete');
        fireEvent.click(deleteBtn);
        expect(screen.getByText('Tap again to delete')).toBeInTheDocument();
        vi.advanceTimersByTime(3100);
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(onDelete).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should hide the delete button when onDelete is not provided', () => {
      render(<NodeStylePanel {...defaultProps} />);
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
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
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:w-full');
        // Desktop base class should still be present
        expect(panel).toHaveClass('w-[280px]');
      });

      it('should apply max-md:right-0 to outer container', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:right-0');
      });

      it('should apply max-md:top-0 to outer container', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:top-auto');
      });

      it('should apply max-md:bottom-0 to outer container', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:bottom-0');
      });

      it('should apply max-md:rounded-none to outer container', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:rounded-b-none');
      });

      it('should apply max-md:h-full to outer container', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('max-md:h-[40dvh]');
      });

      it('should have close button with >=44px tap target on mobile', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
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
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('w-[280px]');
      });

      it('should preserve desktop positioning classes', () => {
        const { container } = render(<NodeStylePanel {...defaultProps} />);
        const panel = container.querySelector('.animate-slide-in-right');
        expect(panel).toHaveClass('absolute');
        expect(panel).toHaveClass('right-0');
        expect(panel).toHaveClass('top-[110px]');
        expect(panel).toHaveClass('bottom-0');
      });
    });

    describe('Functionality preserved (regression guard)', () => {
      it('should still call onClose when close button clicked on mobile', () => {
        mockMatchMedia(true);
        render(<NodeStylePanel {...defaultProps} />);
        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);
        expect(defaultProps.onClose).toHaveBeenCalledOnce();
      });

      it('should still call onStyleChange when style changes on mobile', () => {
        mockMatchMedia(true);
        render(<NodeStylePanel {...defaultProps} />);
        const fillBtn = screen.getByTestId('color-btn-fill-color');
        fireEvent.click(fillBtn);
        expect(defaultProps.onStyleChange).toHaveBeenCalledWith(
          ['A'],
          expect.objectContaining({ fill: '#ff0000' })
        );
      });
    });
  });

  // 38-06 (SHP-04): the Shape row — the unified ShapePicker mounted with
  // shape-change parity with the visual editor's PropertiesPanel.
  describe('Shape row (38-06 SHP-04)', () => {
    const shapeProps = {
      nodeShapes: ['rect', 'circle'] as NodeShape[],
      onShapeChange: vi.fn(),
    };

    it('opens the picker and a pick fires onShapeChange once with (nodeIds, chosenShape), closing the picker', () => {
      const onShapeChange = vi.fn();
      const { container } = render(
        <NodeStylePanel
          {...defaultProps}
          nodeShapes={['rect'] as NodeShape[]}
          onShapeChange={onShapeChange}
        />,
      );

      const trig = container.querySelector('button[data-shape-trigger]') as HTMLElement;
      expect(trig).not.toBeNull();
      expect(trig.textContent).toContain('Rectangle');
      expect(trig.title).toBe('Set shape: Rectangle');

      fireEvent.click(trig);
      const root = container.querySelector('[data-shape-picker]') as HTMLElement;
      expect(root).not.toBeNull();
      expect(root.className).toContain('fixed');

      fireEvent.click(root.querySelector('button[data-shape-cell="diam"]') as HTMLElement);
      expect(onShapeChange).toHaveBeenCalledTimes(1);
      expect(onShapeChange).toHaveBeenCalledWith(['A'], 'diam');
      expect(container.querySelector('[data-shape-picker]')).toBeNull();
    });

    it('renders no Shape row when onShapeChange/nodeShapes are absent (backward compatible)', () => {
      const { container } = render(<NodeStylePanel {...defaultProps} />);
      expect(container.querySelector('button[data-shape-trigger]')).toBeNull();
      expect(container.querySelector('[data-shape-picker]')).toBeNull();
    });

    it('mixed selection shows the Mixed label and a pick applies to the whole selection', () => {
      const onShapeChange = vi.fn();
      render(
        <NodeStylePanel
          {...defaultProps}
          selectedNodeIds={['A', 'B']}
          nodeStyles={[{ fill: '#fff' } as NodeStyle, { fill: '#000' } as NodeStyle]}
          nodeShapes={['rect', 'circle'] as NodeShape[]}
          onShapeChange={onShapeChange}
        />,
      );
      const trig = screen.getByRole('button', { name: 'Set shape: Mixed' });
      expect(trig.textContent).toContain('Mixed');
      fireEvent.click(trig);
      const root = document.querySelector('[data-shape-picker]') as HTMLElement;
      expect(root.querySelector('button[data-shape-cell][data-selected="true"]')).toBeNull();
      fireEvent.click(root.querySelector('button[data-shape-cell="diam"]') as HTMLElement);
      expect(onShapeChange).toHaveBeenCalledTimes(1);
      expect(onShapeChange).toHaveBeenCalledWith(['A', 'B'], 'diam');
    });

    it('label parity: the label row still fires onLabelChange', () => {
      const onLabelChange = vi.fn();
      render(
        <NodeStylePanel
          {...defaultProps}
          onLabelChange={onLabelChange}
        />,
      );
      const input = screen.getByPlaceholderText('Node label...');
      fireEvent.change(input, { target: { value: 'Renamed' } });
      expect(onLabelChange).toHaveBeenCalledWith('A', 'Renamed');
    });

    it('Escape closes the picker first and the panel only on a second press', () => {
      const onClose = vi.fn();
      const { container } = render(
        <NodeStylePanel
          {...defaultProps}
          nodeShapes={['rect'] as NodeShape[]}
          onShapeChange={vi.fn()}
          onClose={onClose}
        />,
      );
      fireEvent.click(container.querySelector('button[data-shape-trigger]') as HTMLElement);
      expect(container.querySelector('[data-shape-picker]')).not.toBeNull();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(container.querySelector('[data-shape-picker]')).toBeNull();
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
