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
