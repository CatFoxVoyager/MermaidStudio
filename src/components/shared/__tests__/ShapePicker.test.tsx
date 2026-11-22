/**
 * Tests for ShapePicker — 38-05 (SHP-03): SSOT-derived grid (53 cells / 5
 * sections in registry order), search corpus (EN label, FR accented label,
 * shortName, alias), zero-match empty state, category hiding, clear button,
 * selection accent, and dismissal guards.
 *
 * jsdom is wiring-only (no layout engine): the 320-390px viewport behavior —
 * popover fits the viewport, scrolls internally — is VALIDATION.md's
 * manual-only row and is asserted here only as structure (search row is the
 * shrink-0 sibling ABOVE the overflow-y-auto region).
 *
 * Mock labels are language-neutral slugs by default, with a few hand-set
 * EN/FR overrides so each corpus lane can be exercised in isolation (e.g.
 * diam's EN label "Diamond" does not contain the query "losange", so a hit
 * can only have come from the FR label).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShapePicker } from '../ShapePicker';
import { CANONICAL_SHAPES, SHAPE_CATEGORIES } from '@/lib/mermaid/shapes';

const ANCHOR = { right: 8, top: 40, maxHeight: 400 };

const EN_OVERRIDES: Record<string, string> = {
  'visual.shapes.rect': 'Rectangle',
  'visual.shapes.diam': 'Diamond',
  'visual.shapes.text': 'Plain label',
};
const FR_OVERRIDES: Record<string, string> = {
  'visual.shapes.diam': 'Losange',
  'visual.shapes.lean-r': 'Parallélogramme (droite)',
  'visual.shapes.trap-b': 'Trapèze (bas)',
  'visual.shapes.text': 'Étiquette simple',
};

const labelFor = (slug: string, lng?: string) => {
  const key = `visual.shapes.${slug}`;
  if (lng === 'fr') {return FR_OVERRIDES[key] ?? slug;}
  if (lng === 'en') {return EN_OVERRIDES[key] ?? slug;}
  return slug;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, args?: Record<string, unknown>) => {
      const lng = typeof args?.lng === 'string' ? args.lng : undefined;
      const map: Record<string, string> = {
        'visual.shapeSearch': 'Search shapes…',
        'visual.shapeSearchClear': 'Clear search',
        'visual.shapeSearchEmpty': 'No matching shape',
        'visual.shapeSearchEmptyHint': 'No shape matches “{{query}}”. Try a shorter term or browse the categories.',
        'visual.shapeCategoryMedia': 'Media',
        'nodeStyle.tabIcon': lng === 'fr' ? 'Icône' : 'Icon',
        'nodeStyle.tabImage': 'Image',
        ...Object.fromEntries(SHAPE_CATEGORIES.map(c => [`visual.shapeCategories.${c}`, c])),
      };
      const shapeMatch = /^visual\.shapes\.(.+)$/.exec(key);
      const value = shapeMatch ? labelFor(shapeMatch[1], lng) : (map[key] ?? key);
      return value.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(args?.[k] ?? `{{${k}}}`));
    },
  }),
}));

/** Registry picker order: SHAPE_CATEGORIES sections, CANONICAL_SHAPES dist order within each. */
const EXPECTED_CELL_ORDER = SHAPE_CATEGORIES.flatMap((category) =>
  CANONICAL_SHAPES.filter((s) => s.category === category).map((s) => s.shortName),
);

function renderPicker(props: Partial<Parameters<typeof ShapePicker>[0]> = {}) {
  return render(
    <ShapePicker
      anchor={ANCHOR}
      onClose={vi.fn()}
      onPick={vi.fn()}
      {...props}
    />,
  );
}

function cell(container: HTMLElement, slug: string): HTMLElement {
  const el = container.querySelector(`button[data-shape-cell="${slug}"]`);
  expect(el).not.toBeNull();
  return el as HTMLElement;
}

describe('ShapePicker', () => {
  describe('SSOT-derived grid', () => {
    it('renders exactly 53 cells across 5 category sections in registry order', () => {
      const { container } = renderPicker();

      const headers = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
      expect(headers).toEqual([...SHAPE_CATEGORIES]);

      const cells = Array.from(container.querySelectorAll('button[data-shape-cell]'));
      expect(cells).toHaveLength(53);
      expect(cells.map((c) => c.getAttribute('data-shape-cell'))).toEqual(EXPECTED_CELL_ORDER);
    });

    it('renders all 53 previews pairwise-unique (no default-rect fallback)', () => {
      const { container } = renderPicker();
      const markups = Array.from(container.querySelectorAll('button[data-shape-cell] svg'))
        .map((svg) => svg.outerHTML);
      expect(markups).toHaveLength(53);
      expect(new Set(markups).size).toBe(53);
    });

    it('keeps the search row a shrink-0 sibling ABOVE the internal scroller (mask-image constraint)', () => {
      const { container } = renderPicker();
      const root = container.querySelector('[data-shape-picker]');
      expect(root).not.toBeNull();
      const firstRow = root!.firstElementChild as HTMLElement;
      expect(firstRow.className).toContain('shrink-0');
      expect(firstRow.querySelector('input')).not.toBeNull();
      const scroller = root!.lastElementChild as HTMLElement;
      expect(scroller.className).toContain('overflow-y-auto');
      expect(scroller.contains(firstRow)).toBe(false);
    });

    it('carries the full label in the cell title/aria-label and clamps visible label to 2 lines', () => {
      const { container } = renderPicker();
      const el = cell(container, 'lean-r');
      expect(el.title).toBe('lean-r');
      expect(el.getAttribute('aria-label')).toBe('lean-r');
      const span = el.querySelector('span');
      expect(span?.className).toContain('line-clamp-2');
    });
  });

  describe('search filtering', () => {
    const type = (query: string) => {
      fireEvent.change(screen.getByLabelText('Search shapes…'), { target: { value: query } });
    };
    const visibleSlugs = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('button[data-shape-cell]'))
        .map((c) => c.getAttribute('data-shape-cell'));

    it('matches an EN label that no shortName/alias contains', () => {
      const { container } = renderPicker();
      type('plain');
      // text: EN "Plain label", FR "Étiquette simple", shortName "text", no aliases.
      expect(visibleSlugs(container)).toEqual(['text']);
    });

    it('matches an FR label regardless of the active locale (UI-SPEC "losange" example)', () => {
      const { container } = renderPicker();
      type('losange');
      // diam: EN "Diamond", FR "Losange" — only the FR label lane contains the query.
      expect(visibleSlugs(container)).toEqual(['diam']);
    });

    it('matches an accented FR term (accent byte-verbatim, query folded transiently)', () => {
      const { container } = renderPicker();
      type('parallélogramme');
      expect(visibleSlugs(container)).toEqual(['lean-r']);
    });

    it('matches the canonical shortName when neither locale label contains it', () => {
      const { container } = renderPicker();
      type('text');
      expect(visibleSlugs(container)).toEqual(['text']);
    });

    it('matches an official alias', () => {
      const { container } = renderPicker();
      type('decision');
      expect(visibleSlugs(container)).toEqual(['diam']);
    });

    it('hides categories with zero matches (only matching sections render)', () => {
      const { container } = renderPicker();
      type('losange'); // diam lives in flow only
      const headers = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
      expect(headers).toEqual(['flow']);
    });

    it('renders the locked empty-state copy on zero matches, inside the grid area', () => {
      const { container } = renderPicker();
      type('zzzz');
      expect(container.querySelectorAll('button[data-shape-cell]')).toHaveLength(0);
      expect(container.querySelectorAll('h3')).toHaveLength(0);
      expect(screen.getByText('No matching shape')).not.toBeNull();
      expect(screen.getByText('No shape matches “zzzz”. Try a shorter term or browse the categories.')).not.toBeNull();
      // The empty state renders inside the scrolling grid area, tinted with
      // the tertiary token (accent is never used for empty-search copy).
      const emptyWrap = screen.getByText('No matching shape').parentElement as HTMLElement;
      expect(emptyWrap.style.color).toBe('var(--text-tertiary)');
      const scroller = emptyWrap.closest('.overflow-y-auto') as HTMLElement | null;
      expect(scroller).not.toBeNull();
    });

    it('shows the clear button only while the query is non-empty and restores the full grid', () => {
      const { container } = renderPicker();
      expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
      type('losange');
      expect(screen.getByRole('button', { name: 'Clear search' })).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(visibleSlugs(container)).toHaveLength(53);
      expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    });
  });

  describe('selection accent', () => {
    it('marks the selected cell with the accent contract and leaves the rest at rest', () => {
      const { container } = renderPicker({ selected: 'diam' });
      const selectedCell = cell(container, 'diam');
      expect(selectedCell.getAttribute('data-selected')).toBe('true');
      expect(selectedCell.style.background).toBe('var(--accent-dim)');
      expect(selectedCell.style.borderColor).toBe('var(--accent)');
      expect(selectedCell.style.color).toBe('var(--accent)');

      const resting = cell(container, 'rect');
      expect(resting.getAttribute('data-selected')).toBeNull();
      expect(resting.style.background).toBe('var(--surface-raised)');
      expect(resting.style.borderColor).toBe('var(--border-subtle)');
    });
  });

  describe('gestures', () => {
    it('picks on click and drag-places on dragstart when onDragStart is wired', () => {
      const onPick = vi.fn();
      const onDragStart = vi.fn();
      const { container } = renderPicker({ onPick, onDragStart });
      const el = cell(container, 'circle');
      expect(el.getAttribute('draggable')).toBe('true');
      fireEvent.click(el);
      expect(onPick).toHaveBeenCalledWith('circle');
      fireEvent.dragStart(el);
      expect(onDragStart).toHaveBeenCalledWith('circle');
    });

    it('keeps cells click-only (not draggable) without onDragStart', () => {
      const { container } = renderPicker();
      expect(cell(container, 'circle').getAttribute('draggable')).toBeNull();
    });
  });

  describe('dismissal', () => {
    it('closes on outside pointerdown and Escape', () => {
      const onClose = vi.fn();
      renderPicker({ onClose });
      fireEvent.pointerDown(document.body);
      expect(onClose).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('never counts taps inside the search input or the popover root as outside taps', () => {
      const onClose = vi.fn();
      const { container } = renderPicker({ onClose });
      fireEvent.pointerDown(screen.getByLabelText('Search shapes…'));
      fireEvent.pointerDown(container.querySelector('[data-shape-picker] h3')!);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not dismiss when the opening trigger is tapped (toggle stays host-owned)', () => {
      const onClose = vi.fn();
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      const triggerRef = { current: trigger };
      renderPicker({ onClose, triggerRef });
      fireEvent.pointerDown(trigger);
      expect(onClose).not.toHaveBeenCalled();
      trigger.remove();
    });
  });

  describe('special media shapes (Icon & Image)', () => {
    it('omits the Media section when onPickSpecial is not provided', () => {
      const { container } = renderPicker();
      expect(container.querySelector('[data-shape-section="media"]')).toBeNull();
      expect(container.querySelectorAll('button[data-special-shape]')).toHaveLength(0);
    });

    it('renders Icon and Image under Media when onPickSpecial is wired while keeping canonical shape cells at 53', () => {
      const onPickSpecial = vi.fn();
      const { container } = renderPicker({ onPickSpecial });

      expect(container.querySelector('[data-shape-section="media"]')).not.toBeNull();
      expect(container.querySelectorAll('button[data-shape-cell]')).toHaveLength(53);

      const iconBtn = container.querySelector('button[data-special-shape="icon"]') as HTMLElement;
      const imgBtn = container.querySelector('button[data-special-shape="img"]') as HTMLElement;
      expect(iconBtn).not.toBeNull();
      expect(imgBtn).not.toBeNull();

      fireEvent.click(iconBtn);
      expect(onPickSpecial).toHaveBeenCalledWith('icon');
      fireEvent.click(imgBtn);
      expect(onPickSpecial).toHaveBeenCalledWith('img');
    });

    it('marks the active special shape with accent styling when selectedSpecial is set', () => {
      const { container } = renderPicker({ onPickSpecial: vi.fn(), selectedSpecial: 'icon' });
      const iconBtn = container.querySelector('button[data-special-shape="icon"]') as HTMLElement;
      const imgBtn = container.querySelector('button[data-special-shape="img"]') as HTMLElement;
      expect(iconBtn.getAttribute('data-selected')).toBe('true');
      expect(iconBtn.style.borderColor).toBe('var(--accent)');
      expect(imgBtn.getAttribute('data-selected')).toBeNull();
    });

    it('filters special media shapes via EN/FR labels and aliases and hides Media when unmatched', () => {
      const { container } = renderPicker({ onPickSpecial: vi.fn() });
      const input = screen.getByLabelText('Search shapes…');

      fireEvent.change(input, { target: { value: 'icône' } });
      expect(container.querySelector('button[data-special-shape="icon"]')).not.toBeNull();
      expect(container.querySelector('button[data-special-shape="img"]')).toBeNull();

      fireEvent.change(input, { target: { value: 'photo' } });
      expect(container.querySelector('button[data-special-shape="img"]')).not.toBeNull();
      expect(container.querySelector('button[data-special-shape="icon"]')).toBeNull();

      fireEvent.change(input, { target: { value: 'losange' } });
      expect(container.querySelector('[data-shape-section="media"]')).toBeNull();
    });

    it('supports dragging special shapes when onDragStartSpecial is wired', () => {
      const onDragStartSpecial = vi.fn();
      const { container } = renderPicker({ onPickSpecial: vi.fn(), onDragStartSpecial });
      const iconBtn = container.querySelector('button[data-special-shape="icon"]') as HTMLElement;
      expect(iconBtn.getAttribute('draggable')).toBe('true');
      fireEvent.dragStart(iconBtn);
      expect(onDragStartSpecial).toHaveBeenCalledWith('icon');
    });
  });
});
