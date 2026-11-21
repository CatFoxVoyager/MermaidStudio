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

// ===== 39-05 (ICON-03, Surface 3): the visual panel's Image tab + paste
// flow — the SAME semantics the preview panel ships, pinned pin-for-pin on
// the 220px panel (explicit max-md:min-h-[44px] floors on every new
// control; this panel has no .style-panel class). The compression util and
// the pack loaders are mocked (their own contracts live in
// imageCompress.test.ts / IconPicker.test.tsx).
import { act } from '@testing-library/react';
import { fileToCompressedDataUri, ImageCompressError } from '@/utils/imageCompress';

vi.mock('@/utils/imageCompress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/imageCompress')>();
  return {
    ...actual,
    fileToCompressedDataUri: vi.fn<(file: File) => Promise<string>>(),
  };
});

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

describe('PropertiesPanel image tab parity (39-05 ICON-03)', () => {
  const IMG_BIG = 'data:image/png;base64,QUJDREVGRw';
  const IMG_COMPRESSED = 'data:image/jpeg;base64,aaBBccDD';
  const makePng = (name = 'photo.png'): File => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

  const imageMediaHandlers = {
    onIconChange: vi.fn<(nodeIds: string[], icon: IconConfig | null) => void>(),
    onImageChange: vi.fn<(nodeIds: string[], img: ImgConfig | null) => void>(),
  };

  function renderImagePanel(
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
        onIconChange={imageMediaHandlers.onIconChange}
        onImageChange={imageMediaHandlers.onImageChange}
        onArrowChange={vi.fn()}
        onEdgeLabelChange={vi.fn()}
        onDeleteEdge={vi.fn()}
      />,
    );
  }

  const pasteEvent = async (file: File | null) => {
    await act(async () => {
      fireEvent.paste(document, {
        clipboardData: { items: file ? [{ type: file.type, getAsFile: () => file }] : [{ type: 'text/plain', getAsFile: () => null }] },
      });
    });
  };

  beforeEach(() => {
    vi.mocked(fileToCompressedDataUri).mockReset();
    imageMediaHandlers.onIconChange.mockClear();
    imageMediaHandlers.onImageChange.mockClear();
  });

  it('empty state parity: the upload CTA + paste hint pair render on an armed plain selection', () => {
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: null });
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    expect(container.querySelector('[data-image-upload]')).not.toBeNull();
    expect(container.querySelector('[data-image-hint]')).not.toBeNull();
    expect(container.querySelector('[data-image-thumbnail]')).toBeNull();
    expect(container.querySelector('[data-media-tab="text"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('populated parity: thumbnail + readout + Replace/Remove with the 44px floors', () => {
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: { img: IMG_BIG } });
    const thumb = container.querySelector('[data-image-thumbnail]') as HTMLImageElement;
    expect(thumb.src).toBe(IMG_BIG);
    expect(thumb.className).toContain('max-h-16');
    expect(container.querySelector('[data-image-readout]')!.textContent).toBe('7 B after compression');
    expect(container.querySelector('[data-image-replace]')).not.toBeNull();
    const remove = container.querySelector('[data-image-remove]') as HTMLElement;
    expect(remove.style.color).toBe('var(--danger)');
    fireEvent.click(remove);
    expect(imageMediaHandlers.onImageChange).toHaveBeenCalledWith(['a'], null);
    for (const selector of ['[data-image-replace]', '[data-image-remove]', '[data-image-constraint]', '[data-image-pos="t"]']) {
      expect((container.querySelector(selector) as HTMLElement).className).toContain('max-md:min-h-[44px]');
    }
  });

  it('advisory parity: an https img renders the advisory + truncated source row + upload CTA, and NO URL input exists', () => {
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], {
      nodeIcon: null,
      nodeImage: { img: 'https://example.com/a-very-long-picture-name.png' },
    });
    const advisory = container.querySelector('[data-image-advisory]') as HTMLElement;
    expect(advisory.textContent).toContain('External image URLs can fail to render');
    expect(advisory.style.background).toBe('var(--surface-floating)');
    expect(advisory.style.color).toBe('var(--text-secondary)');
    // The upload result (thumbnail) does NOT render for an external URL —
    // the advisory + corrective upload replaces it; the URL itself only
    // shows in the truncated source row with its full value as the title.
    expect(container.querySelector('[data-image-thumbnail]')).toBeNull();
    const source = container.querySelector('[data-image-source]') as HTMLElement;
    expect(source.getAttribute('title')).toBe('https://example.com/a-very-long-picture-name.png');
    const uploadBtn = container.querySelector('[data-image-upload]') as HTMLElement;
    expect(uploadBtn).not.toBeNull();
    expect(advisory.compareDocumentPosition(uploadBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('input[type="url"]')).toBeNull();
    expect(container.querySelector('input[data-image-url]')).toBeNull();
  });

  it('constraint parity: the Fit switch maps constraint on/off through the mutator; Position rows emit', () => {
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: { img: IMG_BIG, pos: 'b' } });
    expect(container.querySelector('[data-image-constraint]')!.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(container.querySelector('[data-image-constraint]')!);
    expect(imageMediaHandlers.onImageChange).toHaveBeenCalledWith(['a'], { img: IMG_BIG, pos: 'b', constraint: 'on' });
    // The mock parent keeps the original prop, so the Position click
    // composes from the parsed config: pos flips to t.
    fireEvent.click(container.querySelector('[data-image-pos="t"]')!);
    expect(imageMediaHandlers.onImageChange).toHaveBeenLastCalledWith(['a'], { img: IMG_BIG, pos: 't' });
  });

  it('validation parity: the typed codes render the declared inline danger rows (never a toast)', async () => {
    vi.mocked(fileToCompressedDataUri).mockRejectedValue(new ImageCompressError('invalid-type', 'bad mime'));
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: null });
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    const input = container.querySelector('[data-image-input]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [makePng()], configurable: true });
    await act(async () => {
      fireEvent.change(input);
    });
    const row = container.querySelector('[data-image-error="invalid-type"]') as HTMLElement;
    expect(row.textContent).toContain('Unsupported file — use PNG, JPEG, WebP, or GIF.');
    expect(row.style.color).toBe('var(--danger)');
    expect(imageMediaHandlers.onImageChange).not.toHaveBeenCalled();
  });

  it('upload parity: a picked file flows through fileToCompressedDataUri and emits the compressed URI', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: null });
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    const input = container.querySelector('[data-image-input]') as HTMLInputElement;
    const file = makePng();
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => {
      fireEvent.change(input);
    });
    expect(fileToCompressedDataUri).toHaveBeenCalledWith(file);
    expect(imageMediaHandlers.onImageChange).toHaveBeenCalledWith(['a'], { img: IMG_COMPRESSED });
  });

  it('paste parity: a pasted image routes through the compression path while the tab is open (ICON-03 bind/unbind lifecycle)', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: null });
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    const file = makePng('pasted.png');
    await pasteEvent(file);
    expect(fileToCompressedDataUri).toHaveBeenCalledWith(file);
    expect(imageMediaHandlers.onImageChange).toHaveBeenCalledWith(['a'], { img: IMG_COMPRESSED });
  });

  it('paste parity: the listener is removed on tab switch and unmount (ICON-03 bind/unbind lifecycle)', async () => {
    vi.mocked(fileToCompressedDataUri).mockResolvedValue(IMG_COMPRESSED);
    const { container, unmount } = renderImagePanel([mkNode('a', 'rect', 'A')], { nodeIcon: null, nodeImage: null });
    fireEvent.click(container.querySelector('[data-media-tab="image"]')!);
    // Tab switch unbinds.
    fireEvent.click(container.querySelector('[data-media-tab="text"]')!);
    await pasteEvent(makePng());
    expect(fileToCompressedDataUri).not.toHaveBeenCalled();
    expect(imageMediaHandlers.onImageChange).not.toHaveBeenCalled();
    // Unmount unbinds (no throw, no call).
    unmount();
    await pasteEvent(makePng());
    expect(fileToCompressedDataUri).not.toHaveBeenCalled();
    expect(imageMediaHandlers.onImageChange).not.toHaveBeenCalled();
  });

  it('picker parity: the icon trigger opens the fixed-position IconPicker; a pick emits per selected node', async () => {
    const { container } = renderImagePanel(
      [mkNode('a', 'rect', 'A'), mkNode('b', 'circle', 'B')],
      { nodeIcon: null, nodeImage: null },
    );
    fireEvent.click(container.querySelector('[data-media-tab="icon"]')!);
    fireEvent.click(container.querySelector('[data-icon-trigger]') as HTMLElement);
    const root = container.querySelector('[data-icon-picker]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('fixed');
    await act(async () => {});
    fireEvent.click(root.querySelector('button[data-icon-cell="house"]') as HTMLElement);
    expect(imageMediaHandlers.onIconChange).toHaveBeenCalledTimes(2);
    expect(imageMediaHandlers.onIconChange).toHaveBeenNthCalledWith(1, ['a'], { icon: 'fa:house' });
    expect(imageMediaHandlers.onIconChange).toHaveBeenNthCalledWith(2, ['b'], { icon: 'fa:house' });
    expect(container.querySelector('[data-icon-picker]')).toBeNull();
  });
});
