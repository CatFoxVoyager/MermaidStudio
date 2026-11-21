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
          'nodeStyle.media': 'Content',
          'nodeStyle.tabText': 'Text',
          'nodeStyle.tabIcon': 'Icon',
          'nodeStyle.tabImage': 'Image',
          'nodeStyle.iconPickAction': 'Choose an icon…',
          'nodeStyle.iconForm': 'Form',
          'nodeStyle.iconFormSquare': 'Square',
          'nodeStyle.iconFormCircle': 'Circle',
          'nodeStyle.iconFormRounded': 'Rounded',
          'nodeStyle.iconPosition': 'Position',
          'nodeStyle.iconPositionTop': 'Top',
          'nodeStyle.iconPositionBottom': 'Bottom',
          'nodeStyle.iconSize': 'Size (W × H)',
          'nodeStyle.iconSizeAuto': 'Auto',
          'nodeStyle.iconRemove': 'Remove icon',
          'visual.iconChangeHint': 'Set icon: {{icon}}',
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

// ===== 39-04 (ICON-03, Surfaces 1+6): media-mode tabs + icon param rows.
// Every mutation assertion targets the MUTATOR PROPS (the panel never
// regex-edits source); active states derive from the parsed data props.
import type { IconConfig, ImgConfig } from '@/lib/mermaid/codeUtils';

describe('NodeStylePanel media tabs (39-04 ICON-03)', () => {
  const ICON_A: IconConfig = { icon: 'fa:user', form: 'square', pos: 't', w: 80 };
  const IMG_A: ImgConfig = { img: 'data:image/png;base64,x', pos: 'b' };

  const mediaProps = {
    onIconChange: vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>(),
    onImageChange: vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>(),
  };

  beforeEach(() => {
    mediaProps.onIconChange.mockClear();
    mediaProps.onImageChange.mockClear();
  });

  it('hides the media section entirely when the mutator props are absent (absent-props callers unchanged)', () => {
    const { container } = render(<NodeStylePanel {...defaultProps} />);
    expect(container.querySelector('[data-media-tab]')).toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });

  it('renders the three Text | Icon | Image segments when media support is wired', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(container.querySelector('[data-media-tab="text"]')).not.toBeNull();
    expect(container.querySelector('[data-media-tab="icon"]')).not.toBeNull();
    expect(container.querySelector('[data-media-tab="image"]')).not.toBeNull();
  });

  it('active state: all-icon selection lights the Icon segment', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={ICON_A} nodeImage={null} />,
    );
    expect(container.querySelector('[data-media-tab="icon"]')!.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-media-tab="text"]')!.getAttribute('aria-selected')).toBe('false');
    expect(container.querySelector('[data-media-tab="image"]')!.getAttribute('aria-selected')).toBe('false');
  });

  it('active state: all-img selection lights the Image segment', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={IMG_A} />,
    );
    expect(container.querySelector('[data-media-tab="image"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('active state: all-plain selection lights the Text segment', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    expect(container.querySelector('[data-media-tab="text"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('active state: mixed media kinds show no active segment and the nodeStyle.mixed chip', () => {
    const { container } = render(
      <NodeStylePanel
        {...defaultProps}
        {...mediaProps}
        selectedNodeIds={['A', 'B']}
        nodeStyles={[{}, {}]}
        nodeIcon={undefined}
        nodeImage={undefined}
      />,
    );
    for (const tab of ['text', 'icon', 'image']) {
      expect(container.querySelector(`[data-media-tab="${tab}"]`)!.getAttribute('aria-selected')).toBe('false');
    }
    expect(screen.getByText('Mixed')).toBeInTheDocument();
  });

  it('switch to Icon strips the img params through the img mutator (onImageChange(ids, null))', () => {
    const onIconChange = vi.fn();
    const onImageChange = vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} onImageChange={onImageChange} nodeIcon={null} nodeImage={IMG_A} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="icon"]')!);
    expect(onImageChange).toHaveBeenCalledTimes(1);
    expect(onImageChange).toHaveBeenCalledWith(['A'], null);
    expect(onIconChange).not.toHaveBeenCalled();
  });

  it('switch to Image strips the icon params through the icon mutator (onIconChange(ids, null))', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const onImageChange = vi.fn();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} onImageChange={onImageChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    expect(onIconChange).toHaveBeenCalledTimes(1);
    expect(onIconChange).toHaveBeenCalledWith(['A'], null);
    expect(onImageChange).not.toHaveBeenCalled();
  });

  it('switch to Text on an icon selection clears icon only', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const onImageChange = vi.fn();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} onImageChange={onImageChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="text"]')!);
    expect(onIconChange).toHaveBeenCalledWith(['A'], null);
    expect(onImageChange).not.toHaveBeenCalled();
  });

  it('switch to Text on a mixed selection clears BOTH media kinds (two mutator calls)', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const onImageChange = vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel
        {...defaultProps}
        {...mediaProps}
        onIconChange={onIconChange}
        onImageChange={onImageChange}
        selectedNodeIds={['A', 'B']}
        nodeStyles={[{}, {}]}
        nodeIcon={undefined}
        nodeImage={undefined}
      />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="text"]')!);
    expect(onIconChange).toHaveBeenCalledWith(['A', 'B'], null);
    expect(onImageChange).toHaveBeenCalledWith(['A', 'B'], null);
  });

  it('switch to Text on an all-plain selection is a no-op (no source rewrite)', () => {
    const onIconChange = vi.fn();
    const onImageChange = vi.fn();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} onImageChange={onImageChange} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="text"]')!);
    expect(onIconChange).not.toHaveBeenCalled();
    expect(onImageChange).not.toHaveBeenCalled();
  });

  it('switch to Icon on a plain selection writes NO scaffolding (empty state; picker picks in 39-05)', () => {
    const onIconChange = vi.fn();
    const onImageChange = vi.fn();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} onImageChange={onImageChange} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="icon"]')!);
    expect(onIconChange).not.toHaveBeenCalled();
    expect(onImageChange).not.toHaveBeenCalled();
    // Empty state: the declared CTA copy shows in the opened tab body.
    expect(screen.getByText('Choose an icon…')).toBeInTheDocument();
  });

  it('icon param rows: Form renders exactly the 12.3 enums and marks the active one', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={ICON_A} nodeImage={null} />,
    );
    expect(container.querySelector('[data-icon-form="square"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-icon-form="circle"]')).not.toBeNull();
    expect(container.querySelector('[data-icon-form="rounded"]')).not.toBeNull();
    expect(screen.getByText('Square')).toBeInTheDocument();
    expect(screen.getByText('Circle')).toBeInTheDocument();
    expect(screen.getByText('Rounded')).toBeInTheDocument();
  });

  it('icon param rows: Position marks the parsed pos; W shows the parsed value, H empty shows the Auto placeholder', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={ICON_A} nodeImage={null} />,
    );
    expect(container.querySelector('[data-icon-pos="t"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-icon-pos="b"]')!.getAttribute('aria-pressed')).toBe('false');
    const w = container.querySelector('[data-icon-w]') as HTMLInputElement;
    const h = container.querySelector('[data-icon-h]') as HTMLInputElement;
    expect(w.value).toBe('80');
    expect(h.value).toBe('');
    expect(h.placeholder).toBe('Auto');
  });

  it('the picked name truncates with the full value as its accessible title (iconChangeHint)', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={ICON_A} nodeImage={null} />,
    );
    const trigger = container.querySelector('[data-icon-trigger]') as HTMLElement;
    expect(trigger.getAttribute('title')).toBe('Set icon: fa:user');
    expect(trigger.getAttribute('aria-label')).toBe('Set icon: fa:user');
    expect(trigger.textContent).toContain('fa:user');
  });

  it('empty W input emits the config without w (param omitted on emit)', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    const w = container.querySelector('[data-icon-w]') as HTMLInputElement;
    fireEvent.change(w, { target: { value: '' } });
    expect(onIconChange).toHaveBeenCalledTimes(1);
    const emitted = onIconChange.mock.calls[0][1] as IconConfig;
    expect(emitted).not.toHaveProperty('w');
    expect(emitted.h).toBeUndefined();
    expect(emitted.icon).toBe('fa:user');
    expect(emitted.form).toBe('square');
  });

  it('a numeric W entry emits through the mutator; invalid and negative entries are ignored (no emit)', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    const h = container.querySelector('[data-icon-h]') as HTMLInputElement;
    fireEvent.change(h, { target: { value: '99.5' } });
    expect(onIconChange).toHaveBeenCalledTimes(1);
    expect((onIconChange.mock.calls[0][1] as IconConfig).h).toBe(99.5);

    onIconChange.mockClear();
    fireEvent.change(h, { target: { value: 'abc' } });
    fireEvent.change(h, { target: { value: '-5' } });
    expect(onIconChange).not.toHaveBeenCalled();
  });

  it('Remove icon clears the params through the mutator with danger styling and no confirmation dialog', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    const remove = container.querySelector('[data-icon-remove]') as HTMLElement;
    expect(remove.style.color).toBe('var(--danger)');
    fireEvent.click(remove);
    expect(onIconChange).toHaveBeenCalledTimes(1);
    expect(onIconChange).toHaveBeenCalledWith(['A'], null);
  });

  it('a Form segment pick composes the next config from the parsed data and emits it', () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-icon-form="circle"]')!);
    expect(onIconChange).toHaveBeenCalledTimes(1);
    expect(onIconChange).toHaveBeenCalledWith(['A'], { ...ICON_A, form: 'circle' });
  });
});
