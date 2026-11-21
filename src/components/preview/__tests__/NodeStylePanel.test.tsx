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
          'nodeStyle.imageUpload': 'Upload image',
          'nodeStyle.imageEmptyHint': '…or paste an image from the clipboard',
          'nodeStyle.imageCompressing': 'Compressing…',
          'nodeStyle.imageSizeReadout': '{{size}} after compression',
          'nodeStyle.imageReplace': 'Replace',
          'nodeStyle.imageRemove': 'Remove image',
          'nodeStyle.imageInvalidType': 'Unsupported file — use PNG, JPEG, WebP, or GIF.',
          'nodeStyle.imageTooLarge': 'Image too large — pick one under {{limit}}.',
          'nodeStyle.imageExternalWarning': 'External image URLs can fail to render (CSP) and may be dropped from PNG export (COEP). Upload a local image for reliable results.',
          'nodeStyle.imageConstraint': 'Fit node to image',
          'visual.iconChangeHint': 'Set icon: {{icon}}',
          'visual.iconSearch': 'Search icons…',
          'visual.iconSearchClear': 'Clear search',
          'visual.iconSearchEmpty': 'No matching icon',
          'visual.iconSearchEmptyHint': 'No icon matches “{{query}}”.',
          'visual.iconLoading': 'Loading icon library…',
          'visual.iconLoadError': 'The icon library failed to load.',
          'visual.iconRetry': 'Retry',
          'visual.iconPacks.solid': 'Solid',
          'visual.iconPacks.regular': 'Regular',
          'visual.iconPacks.brands': 'Brands',
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
    expect(container.querySelector('[data-media-mixed]')).not.toBeNull();
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

// ===== 39-05 Task 1 (ICON-03, Surface 3): the Image tab body — the
// upload -> compress -> emit -> thumbnail tracer slice. The compression
// util is MOCKED here (its own contract matrix lives in
// imageCompress.test.ts); the panel pins are about routing (every value
// through onImageChange -> updateNodeImg, never direct text edits) and the
// declared empty / in-flight / populated states.
import { act } from '@testing-library/react';
import { useState } from 'react';
import { fileToCompressedDataUri, ImageCompressError } from '@/utils/imageCompress';

vi.mock('@/utils/imageCompress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/imageCompress')>();
  return {
    ...actual,
    fileToCompressedDataUri: vi.fn<(file: File) => Promise<string>>(),
  };
});

// The IconPicker's pack loads are mocked to tiny fixtures — the picker pins
// here are about the panel's wiring (trigger opens the fixed-position
// popover, a pick emits through the mutator), not the pack corpus (that is
// IconPicker.test.tsx's job).
vi.mock('@/components/shared/iconPickerPacks', () => ({
  ICON_PICKER_PACKS: [
    {
      key: 'solid',
      headerKey: 'visual.iconPacks.solid',
      prefix: 'fa',
      load: () =>
        Promise.resolve({
          prefix: 'fa6-solid',
          width: 512,
          height: 512,
          icons: { house: { body: '<path d="M-house"/>' } },
          aliases: {},
        }),
    },
    {
      key: 'regular',
      headerKey: 'visual.iconPacks.regular',
      prefix: 'far',
      load: () => Promise.resolve({ prefix: 'fa6-regular', width: 512, height: 512, icons: {}, aliases: {} }),
    },
    {
      key: 'brands',
      headerKey: 'visual.iconPacks.brands',
      prefix: 'fab',
      load: () => Promise.resolve({ prefix: 'fa6-brands', width: 512, height: 512, icons: {}, aliases: {} }),
    },
  ],
}));

describe('NodeStylePanel image tab (39-05 Task 1 ICON-03)', () => {
  const IMG_BIG = 'data:image/png;base64,QUJDREVGRw'; // 7 payload bytes
  const IMG_COMPRESSED = 'data:image/jpeg;base64,aaBBccDD';
  const ICON_A: IconConfig = { icon: 'fa:user', form: 'square', pos: 't', w: 80 };

  const mediaProps = {
    onIconChange: vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>(),
    onImageChange: vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>(),
  };

  const makePng = (name = 'photo.png'): File => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

  async function upload(container: HTMLElement, file: File): Promise<void> {
    const input = container.querySelector('[data-image-input]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => {
      fireEvent.change(input);
    });
  }

  beforeEach(() => {
    vi.mocked(fileToCompressedDataUri).mockReset();
    mediaProps.onIconChange.mockClear();
    mediaProps.onImageChange.mockClear();
    defaultProps.onStyleChange.mockClear();
  });

  it('empty state on a plain selection: the upload CTA + paste hint pair render — no dropzone chrome, no thumbnail', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    expect(container.querySelector('[data-image-upload]')).not.toBeNull();
    expect(container.querySelector('[data-image-hint]')).not.toBeNull();
    expect(container.querySelector('[data-image-thumbnail]')).toBeNull();
    expect(container.querySelector('[data-image-busy]')).toBeNull();
    // The highlight still follows the DATA (the locked switch table).
    expect(container.querySelector('[data-media-tab="text"]')!.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-media-tab="image"]')!.getAttribute('aria-selected')).toBe('false');
  });

  it('the hidden file input is limited to the declared four image mimes', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    const input = container.querySelector('[data-image-input]') as HTMLInputElement;
    expect(input.accept).toBe('image/png,image/jpeg,image/webp,image/gif');
  });

  it('populated state: thumbnail + size readout + Replace + Remove (danger, no confirmation)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={{ img: IMG_BIG }} />,
    );
    const thumb = container.querySelector('[data-image-thumbnail]') as HTMLImageElement;
    expect(thumb).not.toBeNull();
    expect(thumb.src).toBe(IMG_BIG);
    expect(thumb.className).toContain('max-h-16');
    expect(thumb.className).toContain('object-contain');
    expect(container.querySelector('[data-image-readout]')!.textContent).toBe('7 B after compression');
    expect(container.querySelector('[data-image-replace]')).not.toBeNull();
    const remove = container.querySelector('[data-image-remove]') as HTMLElement;
    expect(remove.style.color).toBe('var(--danger)');
    fireEvent.click(remove);
    expect(mediaProps.onImageChange).toHaveBeenCalledTimes(1);
    expect(mediaProps.onImageChange).toHaveBeenCalledWith(['A'], null);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('upload flows the file through fileToCompressedDataUri and emits the compressed URI through onImageChange (the mutator route)', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    await upload(container, makePng());
    expect(fileToCompressedDataUri).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fileToCompressedDataUri).mock.calls[0][0].type).toBe('image/png');
    expect(mediaProps.onImageChange).toHaveBeenCalledTimes(1);
    expect(mediaProps.onImageChange).toHaveBeenCalledWith(['A'], { img: IMG_COMPRESSED });
    // The emit NEVER touches the style/label routes.
    expect(mediaProps.onIconChange).not.toHaveBeenCalled();
    expect(defaultProps.onStyleChange).not.toHaveBeenCalled();
  });

  it('in-flight compression shows the spinner slot with the compressing copy, then the populated state', async () => {
    let resolveCompress!: (v: string) => void;
    vi.mocked(fileToCompressedDataUri).mockImplementation(
      () => new Promise<string>((res) => { resolveCompress = res; }),
    );
    // A stateful host wrapper — the real hosts feed the emitted config back
    // through parsed props, so the populated thumbnail follows the emit.
    function Host() {
      const [img, setImg] = useState<ImgConfig | null>(null);
      return (
        <NodeStylePanel
          {...defaultProps}
          {...mediaProps}
          nodeIcon={null}
          nodeImage={img}
          onImageChange={(ids, cfg) => {
            mediaProps.onImageChange(ids, cfg);
            setImg(cfg);
          }}
        />
      );
    }
    const { container } = render(<Host />);
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    await upload(container, makePng());
    expect(container.querySelector('[data-image-busy]')).not.toBeNull();
    expect(container.querySelector('[data-image-busy]')!.textContent).toContain('Compressing…');
    expect(container.querySelector('[data-image-thumbnail]')).toBeNull();
    await act(async () => {
      resolveCompress(IMG_COMPRESSED);
    });
    expect(container.querySelector('[data-image-busy]')).toBeNull();
    expect((container.querySelector('[data-image-thumbnail]') as HTMLImageElement).src).toBe(IMG_COMPRESSED);
    expect(mediaProps.onImageChange).toHaveBeenCalledWith(['A'], { img: IMG_COMPRESSED });
  });

  it('a typed validation failure renders the declared inline danger row and emits nothing', async () => {
    vi.mocked(fileToCompressedDataUri).mockRejectedValue(new ImageCompressError('invalid-type', 'bad mime'));
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    await upload(container, makePng());
    const row = container.querySelector('[data-image-error="invalid-type"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.textContent).toContain('Unsupported file — use PNG, JPEG, WebP, or GIF.');
    expect(row.style.color).toBe('var(--danger)');
    expect(mediaProps.onImageChange).not.toHaveBeenCalled();
  });

  it('the too-large failure interpolates the declared source-cap limit (8 MB)', async () => {
    vi.mocked(fileToCompressedDataUri).mockRejectedValue(new ImageCompressError('too-large', 'huge'));
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    await upload(container, makePng());
    const row = container.querySelector('[data-image-error="too-large"]') as HTMLElement;
    expect(row.textContent).toContain('Image too large — pick one under 8 MB.');
    expect(row.style.color).toBe('var(--danger)');
  });

  it('validation rows are persistent until the next attempt clears them (inline, never a toast)', async () => {
    vi.mocked(fileToCompressedDataUri).mockRejectedValueOnce(new ImageCompressError('invalid-type', 'bad mime'));
    vi.mocked(fileToCompressedDataUri).mockResolvedValueOnce(IMG_COMPRESSED);
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    await upload(container, makePng());
    expect(container.querySelector('[data-image-error]')).not.toBeNull();
    // The next attempt clears the row (and succeeds).
    await upload(container, makePng('second.png'));
    expect(container.querySelector('[data-image-error]')).toBeNull();
    expect(mediaProps.onImageChange).toHaveBeenCalledWith(['A'], { img: IMG_COMPRESSED });
  });

  it('an https img value renders the advisory row above the upload control and NO URL input exists', () => {
    const { container } = render(
      <NodeStylePanel
        {...defaultProps}
        {...mediaProps}
        nodeIcon={null}
        nodeImage={{ img: 'https://example.com/cat.png' }}
      />,
    );
    const advisory = container.querySelector('[data-image-advisory]') as HTMLElement;
    expect(advisory).not.toBeNull();
    expect(advisory.textContent).toContain('External image URLs can fail to render');
    expect(advisory.style.background).toBe('var(--surface-floating)');
    expect(advisory.style.color).toBe('var(--text-secondary)');
    // DOM order: the advisory sits BEFORE the upload control (the
    // corrective action directly below the advisory).
    const uploadBtn = container.querySelector('[data-image-upload]') as HTMLElement;
    expect(uploadBtn).not.toBeNull();
    expect(advisory.compareDocumentPosition(uploadBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Grey Area 2: no free-form URL input exists in the tab — the only
    // input besides the param rows is the hidden file input.
    expect(container.querySelector('input[data-image-url]')).toBeNull();
    expect(container.querySelector('input[type="url"]')).toBeNull();
  });

  it('a compressed data URI shows no advisory', () => {
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={{ img: IMG_BIG }} />,
    );
    expect(container.querySelector('[data-image-advisory]')).toBeNull();
  });

  it('the constraint switch maps constraint on/off through the mutator (12.3 semantics)', () => {
    const onImageChange = vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel
        {...defaultProps}
        {...mediaProps}
        onImageChange={onImageChange}
        nodeIcon={null}
        nodeImage={{ img: IMG_BIG }}
      />,
    );
    const toggle = container.querySelector('[data-image-constraint]') as HTMLElement;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(onImageChange).toHaveBeenCalledWith(['A'], { img: IMG_BIG, constraint: 'on' });
  });

  it('an on-constraint flips to off; image Position rows emit through the mutator', () => {
    const onImageChange = vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel
        {...defaultProps}
        {...mediaProps}
        onImageChange={onImageChange}
        nodeIcon={null}
        nodeImage={{ img: IMG_BIG, constraint: 'on', pos: 'b' }}
      />,
    );
    expect(container.querySelector('[data-image-constraint]')!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(container.querySelector('[data-image-constraint]')!);
    expect(onImageChange).toHaveBeenCalledWith(['A'], { img: IMG_BIG, constraint: 'off', pos: 'b' });
    // Position rows: the parsed pos is marked; clicking t emits it.
    fireEvent.click(container.querySelector('[data-image-pos="t"]')!);
    expect(onImageChange).toHaveBeenLastCalledWith(['A'], { img: IMG_BIG, constraint: 'on', pos: 't' });
  });

  it('absent image w/h render empty inputs with the Auto placeholder and omit the params on emit', () => {
    const onImageChange = vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel
        {...defaultProps}
        {...mediaProps}
        onImageChange={onImageChange}
        nodeIcon={null}
        nodeImage={{ img: IMG_BIG, w: 120 }}
      />,
    );
    const w = container.querySelector('[data-image-w]') as HTMLInputElement;
    const h = container.querySelector('[data-image-h]') as HTMLInputElement;
    expect(w.value).toBe('120');
    expect(h.value).toBe('');
    expect(h.placeholder).toBe('Auto');
    // Clearing W (Auto) deletes the param on emit (the tracked value is
    // '120', so '' is a real change React reports).
    fireEvent.change(w, { target: { value: '' } });
    const emitted = onImageChange.mock.calls[0][1] as ImgConfig;
    expect(emitted).not.toHaveProperty('w');
    expect(emitted.img).toBe(IMG_BIG);
    // A numeric H entry emits through the mutator.
    fireEvent.change(h, { target: { value: '90' } });
    expect(onImageChange).toHaveBeenLastCalledWith(['A'], { img: IMG_BIG, w: 120, h: 90 });
  });

  it('the icon trigger opens the fixed-position IconPicker and a pick emits through onIconChange', async () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="icon"]')!);
    fireEvent.click(container.querySelector('[data-icon-trigger]') as HTMLElement);
    const root = container.querySelector('[data-icon-picker]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('fixed');
    await act(async () => {});
    fireEvent.click(root.querySelector('button[data-icon-cell="house"]') as HTMLElement);
    expect(onIconChange).toHaveBeenCalledWith(['A'], { icon: 'fa:house' });
    expect(container.querySelector('[data-icon-picker]')).toBeNull();
  });

  it('a pick on an existing icon config composes the next config (icon replaced, params kept)', async () => {
    const onIconChange = vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} onIconChange={onIconChange} nodeIcon={ICON_A} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-icon-trigger]') as HTMLElement);
    await act(async () => {});
    const root = container.querySelector('[data-icon-picker]') as HTMLElement;
    fireEvent.click(root.querySelector('button[data-icon-cell="house"]') as HTMLElement);
    expect(onIconChange).toHaveBeenCalledWith(['A'], { ...ICON_A, icon: 'fa:house' });
  });

  it('Escape closes the IconPicker first and the panel only on a second press', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={ICON_A} nodeImage={null} onClose={onClose} />,
    );
    fireEvent.click(container.querySelector('[data-icon-trigger]') as HTMLElement);
    expect(container.querySelector('[data-icon-picker]')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('[data-icon-picker]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ===== 39-05 Task 3 (ICON-03): the paste flow — the ICON-03 concurrency
// resolution: the clipboard listener is bound ONLY while the Image tab is
// open, and removed on tab switch and unmount (the bind/unbind lifecycle
// the checker info names).
describe('NodeStylePanel paste flow (39-05 ICON-03 bind/unbind lifecycle)', () => {
  const IMG_COMPRESSED = 'data:image/jpeg;base64,aaBBccDD';
  const mediaProps = {
    onIconChange: vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>(),
    onImageChange: vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>(),
  };
  const makePng = (name = 'pasted.png'): File => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

  const pasteEvent = async (file: File | null) => {
    await act(async () => {
      fireEvent.paste(document, {
        clipboardData: { items: file ? [{ type: file.type, getAsFile: () => file }] : [{ type: 'text/plain', getAsFile: () => null }] },
      });
    });
  };

  beforeEach(() => {
    vi.mocked(fileToCompressedDataUri).mockReset();
    mediaProps.onIconChange.mockClear();
    mediaProps.onImageChange.mockClear();
    defaultProps.onStyleChange.mockClear();
  });

  it('a pasted image routes through fileToCompressedDataUri while the Image tab is open', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    const file = makePng();
    await pasteEvent(file);
    expect(fileToCompressedDataUri).toHaveBeenCalledWith(file);
    expect(mediaProps.onImageChange).toHaveBeenCalledWith(['A'], { img: IMG_COMPRESSED });
  });

  it('the paste listener is removed on tab switch (ICON-03 bind/unbind lifecycle)', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    fireEvent.click(container.querySelector('[data-media-tab="text"]')!);
    vi.mocked(fileToCompressedDataUri).mockClear();
    await pasteEvent(makePng());
    expect(fileToCompressedDataUri).not.toHaveBeenCalled();
    expect(mediaProps.onImageChange).not.toHaveBeenCalled();
  });

  it('the paste listener is removed on unmount (ICON-03 bind/unbind lifecycle)', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container, unmount } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    unmount();
    vi.mocked(fileToCompressedDataUri).mockClear();
    await pasteEvent(makePng());
    expect(fileToCompressedDataUri).not.toHaveBeenCalled();
    expect(mediaProps.onImageChange).not.toHaveBeenCalled();
  });

  it('a non-image paste item is not routed through the compression path', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container } = render(
      <NodeStylePanel {...defaultProps} {...mediaProps} nodeIcon={null} nodeImage={null} />,
    );
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    await pasteEvent(null);
    expect(fileToCompressedDataUri).not.toHaveBeenCalled();
    expect(mediaProps.onImageChange).not.toHaveBeenCalled();
  });
});
