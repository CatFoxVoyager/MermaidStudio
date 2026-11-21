/**
 * Tests for PropertiesPanel — 38-06 (SHP-04), the panel's first-ever test
 * file. Covers the shape-control swap: the hardcoded-EN 23-option select is
 * replaced by a trigger + the unified fixed-position ShapePicker popover
 * (the 220px overflow-hidden panel container cannot clip a fixed host),
 * mixed multi-select applies to every selected node, and rename parity
 * (label input still fires onLabelChange on Enter and blur).
 *
 * Mock labels derive from CANONICAL_SHAPES + the REAL en.json copy (the
 * 38-05 registry-derived mock pattern — no hand-typed 53-key blocks).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from '../PropertiesPanel';
import { ShapePreview } from '@/components/shared/ShapePreview';
import { CANONICAL_SHAPES } from '@/lib/mermaid/shapes';
import type { NodeShape } from '@/lib/mermaid/codeUtils';
import type { VisualNode, VisualEdge } from '../types';

vi.mock('react-i18next', async () => {
  const { CANONICAL_SHAPES } = await import('@/lib/mermaid/shapes');
  const enMod = await import('../../../i18n/locales/en.json');
  const en = (enMod.default ?? enMod) as {
    visual: { shapes: Record<string, string>; shapeChangeHint: string };
    nodeStyle: { mixed: string };
  };
  const shapeLabels: Record<string, string> = Object.fromEntries(
    CANONICAL_SHAPES.map((s) => [`visual.shapes.${s.shortName}`, en.visual.shapes[s.shortName] ?? s.shortName]),
  );
  return {
    useTranslation: () => ({
      t: (key: string, args?: Record<string, unknown>) => {
        const map: Record<string, string> = {
          'visual.shapeChangeHint': en.visual.shapeChangeHint,
          'visual.shapeSearch': 'Search shapes…',
          'visual.shapeSearchClear': 'Clear search',
          'visual.shapeSearchEmpty': 'No matching shape',
          'visual.shapeSearchEmptyHint': 'No shape matches “{{query}}”.',
          'nodeStyle.mixed': en.nodeStyle.mixed,
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
          ...shapeLabels,
        };
        return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(args?.[k] ?? `{{${k}}}`));
      },
    }),
  };
});

const mkNode = (id: string, shape: VisualNode['shape'], label = id): VisualNode => ({
  id, label, shape, style: {}, x: 0, y: 0, width: 10, height: 10,
});

const NO_EDGE: VisualEdge | null = null;

function renderPanel(
  nodes: VisualNode[],
  handlers?: {
    onShape?: ReturnType<typeof vi.fn<(id: string, shape: NodeShape) => void>>;
    onLabel?: ReturnType<typeof vi.fn<(id: string, label: string) => void>>;
  },
) {
  const onShapeChange = handlers?.onShape ?? vi.fn<(id: string, shape: NodeShape) => void>();
  const onLabelChange = handlers?.onLabel ?? vi.fn<(id: string, label: string) => void>();
  const utils = render(
    <PropertiesPanel
      selectedNodes={nodes}
      selectedEdge={NO_EDGE}
      onLabelChange={onLabelChange}
      onShapeChange={onShapeChange}
      onStyleChange={vi.fn()}
      onArrowChange={vi.fn()}
      onEdgeLabelChange={vi.fn()}
      onDeleteEdge={vi.fn()}
    />,
  );
  return { ...utils, onShapeChange, onLabelChange };
}

function trigger(container: HTMLElement): HTMLElement {
  const el = container.querySelector('button[data-shape-trigger]');
  expect(el).not.toBeNull();
  return el as HTMLElement;
}

function pickerRoot(container: HTMLElement): HTMLElement {
  const el = container.querySelector('[data-shape-picker]');
  expect(el).not.toBeNull();
  return el as HTMLElement;
}

describe('PropertiesPanel — unified ShapePicker (38-06 SHP-04)', () => {
  it('shows the current shape label from i18n on the trigger (no hardcoded EN)', () => {
    const { container } = renderPanel([mkNode('a', 'rect', 'Start')]);
    const btn = trigger(container);
    expect(btn.textContent).toContain('Rectangle');
    expect(btn.title).toBe('Set shape: Rectangle');
    expect(btn.getAttribute('aria-label')).toBe('Set shape: Rectangle');
  });

  it('opens the shared ShapePicker with all 53 cells, fixed-position host the 220px clip cannot eat', () => {
    const { container } = renderPanel([mkNode('a', 'rect', 'Start')]);
    fireEvent.click(trigger(container));
    const root = pickerRoot(container);
    // Wiring-only marker for the fixed-position recipe: an absolutely-
    // positioned dropdown would be clipped by the overflow-hidden panel
    // container; a fixed host escapes it (UI-SPEC Surface 2 requirement).
    expect(root.className).toContain('fixed');
    const cells = Array.from(root.querySelectorAll('button[data-shape-cell]'));
    expect(cells).toHaveLength(53);
    expect(cells.some((c) => c.getAttribute('data-shape-cell') === 'rect')).toBe(true);
  });

  it('search-filters the grid and a pick fires onShapeChange once with (id, chosenShape), closing the picker', () => {
    const onShape = vi.fn();
    const { container } = renderPanel([mkNode('a', 'rect', 'Start')], { onShape });
    fireEvent.click(trigger(container));

    const search = screen.getByLabelText('Search shapes…');
    fireEvent.change(search, { target: { value: 'diam' } });

    const root = pickerRoot(container);
    const remaining = Array.from(root.querySelectorAll('button[data-shape-cell]'))
      .map((c) => c.getAttribute('data-shape-cell'));
    expect(remaining).toEqual(['diam']);

    fireEvent.click(root.querySelector('button[data-shape-cell="diam"]') as HTMLElement);
    expect(onShape).toHaveBeenCalledTimes(1);
    expect(onShape).toHaveBeenCalledWith('a', 'diam');
    // Picker closes after the pick.
    expect(container.querySelector('[data-shape-picker]')).toBeNull();
  });

  it('mixed multi-select: the trigger shows the Mixed label with the neutral rect preview and a pick applies to EVERY selected node', () => {
    const onShape = vi.fn();
    const nodes = [mkNode('a', 'rect', 'A'), mkNode('b', 'circle', 'B')];
    const { container } = renderPanel(nodes, { onShape });

    const btn = trigger(container);
    expect(btn.textContent).toContain('Mixed');
    // Neutral rect preview: the trigger's preview svg is byte-identical to
    // ShapePreview shape="rect" (not either node's own shape).
    const ref = render(<ShapePreview shape="rect" />);
    const refSvg = ref.container.querySelector('svg')?.outerHTML;
    expect(refSvg).toBeTruthy();
    expect(btn.querySelector('svg')?.outerHTML).toBe(refSvg);

    fireEvent.click(btn);
    const root = pickerRoot(container);
    // Mixed selection carries no accent (nothing is "the" selected shape).
    expect(root.querySelector('button[data-shape-cell][data-selected="true"]')).toBeNull();

    fireEvent.click(root.querySelector('button[data-shape-cell="diam"]') as HTMLElement);
    expect(onShape).toHaveBeenCalledTimes(2);
    expect(onShape).toHaveBeenNthCalledWith(1, 'a', 'diam');
    expect(onShape).toHaveBeenNthCalledWith(2, 'b', 'diam');
  });

  it('rename parity: the label input still fires onLabelChange on Enter and on blur', () => {
    const onLabel = vi.fn();
    const { container } = renderPanel([mkNode('a', 'rect', 'Start')], { onLabel });

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Start');

    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLabel).toHaveBeenCalledTimes(1);
    expect(onLabel).toHaveBeenCalledWith('a', 'Renamed');

    // Component state is unchanged by the spy parent, so blur re-fires —
    // the parity pin is that BOTH paths still fire after the shape swap.
    fireEvent.blur(input);
    expect(onLabel).toHaveBeenCalledTimes(2);
    expect(onLabel).toHaveBeenLastCalledWith('a', 'Renamed');
  });
});

// ===== 39-04 (ICON-03, Surfaces 1+6): the visual panel's media tabs — the
// identical semantics the preview panel's NodeStylePanel ships, adapted to
// the 220px fixed-position panel. Switch parity is asserted through the
// mutator props (never regex emission); the explicit max-md:min-h-[44px]
// floor is pinned on the new controls (this panel has no .style-panel class).
import type { IconConfig, ImgConfig } from '@/lib/mermaid/codeUtils';

describe('PropertiesPanel media tabs (39-04 ICON-03)', () => {
  const ICON_A: IconConfig = { icon: 'fa:user', form: 'square', pos: 't', w: 80 };
  const IMG_A: ImgConfig = { img: 'data:image/png;base64,x', pos: 'b' };

  const mediaHandlers = {
    onIconChange: vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>(),
    onImageChange: vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>(),
  };

  function renderWithMedia(
    nodes: VisualNode[],
    overrides?: { nodeIcon?: IconConfig | null; nodeImage?: ImgConfig | null },
  ) {
    return render(
      <PropertiesPanel
        selectedNodes={nodes}
        selectedEdge={NO_EDGE}
        onLabelChange={vi.fn()}
        onShapeChange={vi.fn()}
        onStyleChange={vi.fn()}
        nodeIcon={overrides?.nodeIcon ?? null}
        nodeImage={overrides?.nodeImage ?? null}
        onIconChange={mediaHandlers.onIconChange}
        onImageChange={mediaHandlers.onImageChange}
        onArrowChange={vi.fn()}
        onEdgeLabelChange={vi.fn()}
        onDeleteEdge={vi.fn()}
      />,
    );
  }

  beforeEach(() => {
    mediaHandlers.onIconChange.mockClear();
    mediaHandlers.onImageChange.mockClear();
  });

  it('hides the media section when the mutator props are absent (absent-props callers unchanged)', () => {
    const { container } = renderPanel([mkNode('a', 'rect', 'Start')]);
    expect(container.querySelector('[data-media-tab]')).toBeNull();
  });

  it('renders the three segments and lights Text for an all-plain selection', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'Start')]);
    expect(container.querySelector('[data-media-tab="text"]')).not.toBeNull();
    expect(container.querySelector('[data-media-tab="icon"]')).not.toBeNull();
    expect(container.querySelector('[data-media-tab="image"]')).not.toBeNull();
    expect(container.querySelector('[data-media-tab="text"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('active state parity: all-icon lights Icon, all-img lights Image, mixed shows the chip and no segment', () => {
    const iconOnly = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: ICON_A, nodeImage: null });
    expect(iconOnly.container.querySelector('[data-media-tab="icon"]')!.getAttribute('aria-selected')).toBe('true');
    iconOnly.unmount();

    const imgOnly = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: IMG_A });
    expect(imgOnly.container.querySelector('[data-media-tab="image"]')!.getAttribute('aria-selected')).toBe('true');
    imgOnly.unmount();

    const { container } = render(
      <PropertiesPanel
        selectedNodes={[mkNode('a', 'rect', 'A'), mkNode('b', 'circle', 'B')]}
        selectedEdge={NO_EDGE}
        onLabelChange={vi.fn()}
        onShapeChange={vi.fn()}
        onStyleChange={vi.fn()}
        nodeIcon={undefined}
        nodeImage={undefined}
        onIconChange={mediaHandlers.onIconChange}
        onImageChange={mediaHandlers.onImageChange}
        onArrowChange={vi.fn()}
        onEdgeLabelChange={vi.fn()}
        onDeleteEdge={vi.fn()}
      />,
    );
    for (const tab of ['text', 'icon', 'image']) {
      expect(container.querySelector(`[data-media-tab="${tab}"]`)!.getAttribute('aria-selected')).toBe('false');
    }
    expect(container.querySelector('[data-media-mixed]')).not.toBeNull();
  });

  it('switch parity with the preview panel: Icon strips img via onImageChange(null)', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: IMG_A });
    fireEvent.click(container.querySelector('[data-media-tab="icon"]')!);
    expect(mediaHandlers.onImageChange).toHaveBeenCalledTimes(1);
    expect(mediaHandlers.onImageChange).toHaveBeenCalledWith(['a'], null);
    expect(mediaHandlers.onIconChange).not.toHaveBeenCalled();
  });

  it('switch parity: Image strips icon via onIconChange(null); Text clears both on a mixed selection', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: ICON_A, nodeImage: null });
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    expect(mediaHandlers.onIconChange).toHaveBeenCalledWith(['a'], null);
    expect(mediaHandlers.onImageChange).not.toHaveBeenCalled();

    mediaHandlers.onIconChange.mockClear();
    mediaHandlers.onImageChange.mockClear();
    const mixed = render(
      <PropertiesPanel
        selectedNodes={[mkNode('a', 'rect', 'A'), mkNode('b', 'circle', 'B')]}
        selectedEdge={NO_EDGE}
        onLabelChange={vi.fn()}
        onShapeChange={vi.fn()}
        onStyleChange={vi.fn()}
        nodeIcon={undefined}
        nodeImage={undefined}
        onIconChange={mediaHandlers.onIconChange}
        onImageChange={mediaHandlers.onImageChange}
        onArrowChange={vi.fn()}
        onEdgeLabelChange={vi.fn()}
        onDeleteEdge={vi.fn()}
      />,
    );
    fireEvent.click(mixed.container.querySelector('[data-media-tab="text"]')!);
    expect(mediaHandlers.onIconChange).toHaveBeenCalledWith(['a', 'b'], null);
    expect(mediaHandlers.onImageChange).toHaveBeenCalledWith(['a', 'b'], null);
  });

  it('icon param rows render with the 12.3 enum Form control and the Auto placeholder on empty H', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: ICON_A, nodeImage: null });
    expect(container.querySelector('[data-icon-form="square"]')).not.toBeNull();
    expect(container.querySelector('[data-icon-form="circle"]')).not.toBeNull();
    expect(container.querySelector('[data-icon-form="rounded"]')).not.toBeNull();
    const h = container.querySelector('[data-icon-h]') as HTMLInputElement;
    expect(h.value).toBe('');
    expect(h.placeholder).toBe('Auto');
    const w = container.querySelector('[data-icon-w]') as HTMLInputElement;
    expect(w.value).toBe('80');
  });

  it('Remove icon emits onIconChange(ids, null) with danger styling; no confirmation dialog exists', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: ICON_A, nodeImage: null });
    const remove = container.querySelector('[data-icon-remove]') as HTMLElement;
    expect(remove.style.color).toBe('var(--danger)');
    fireEvent.click(remove);
    expect(mediaHandlers.onIconChange).toHaveBeenCalledWith(['a'], null);
  });

  it('the new interactive controls carry the explicit max-md:min-h-[44px] touch floor (no .style-panel class here)', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: ICON_A, nodeImage: null });
    for (const selector of ['[data-media-tab="text"]', '[data-icon-trigger]', '[data-icon-form="square"]', '[data-icon-pos="t"]', '[data-icon-remove]']) {
      const el = container.querySelector(selector) as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.className).toContain('max-md:min-h-[44px]');
    }
  });

  it('the icon trigger uses the fixed-anchor recipe (data-icon-trigger present; no nested popover machinery)', () => {
    const { container } = renderWithMedia([mkNode('a', 'rect', 'A')], { nodeIcon: ICON_A, nodeImage: null });
    const trigger = container.querySelector('[data-icon-trigger]') as HTMLElement;
    expect(trigger.getAttribute('title')).toBe('Set icon: fa:user');
    expect(trigger.getAttribute('aria-label')).toBe('Set icon: fa:user');
  });
});
