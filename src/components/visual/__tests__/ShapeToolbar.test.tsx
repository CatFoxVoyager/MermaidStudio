/**
 * Tests for ShapeToolbar — Phase 26 (26-01): the double-circle toolbar entry.
 *
 * The i18n mock is mandatory (PreviewPanel.test.tsx:30-32 precedent): the
 * toolbar resolves its labels through visual.*, so the mock must cover them
 * or the shape buttons render raw i18n keys and every name query finds
 * nothing.
 *
 * jsdom instrument notes (measured on this suite's first RED run):
 * - The mount layout-effect fit measures a zero-width scroller, so the
 *   primary row determinically holds MIN_PRIMARY_SHAPE_COUNT shapes and a
 *   More popover carries the rest — unlike the in-app wide-panel default.
 * - The hidden measurer row is aria-hidden + visibility:hidden, so RTL role
 *   queries never see its copies; title-attribute queries do.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShapeToolbar } from '../ShapeToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, args?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'visual.selectTool': 'Select',
        'visual.selectToolHint': 'Select tool (V)',
        'visual.connectTool': 'Connect',
        'visual.connectToolHint': 'Connect tool (C)',
        'visual.deleteSelected': 'Delete',
        'visual.shapesTitle': 'SHAPES',
        'visual.moreShapes': 'More',
        'visual.shapeAddHint': 'Add {{shape}} (tap to add, drag to canvas)',
        'visual.shapes.box': 'Box',
        'visual.shapes.round': 'Round',
        'visual.shapes.stadium': 'Stadium',
        'visual.shapes.rhombus': 'Diamond',
        'visual.shapes.circle': 'Circle',
        'visual.shapes.hexagon': 'Hexagon',
        'visual.shapes.cylinder': 'Cylinder',
        'visual.shapes.slant': 'Slant',
        'visual.shapes.slantAlt': 'Slant (mirrored)',
        'visual.shapes.trapezoid': 'Trapezoid',
        'visual.shapes.trapezoidAlt': 'Trapezoid (mirrored)',
        'visual.shapes.subroutine': 'Subroutine',
        'visual.shapes.flag': 'Flag',
        'visual.shapes.dblCirc': 'Double Circle',
        'visual.shapes.person': 'Person',
        'visual.shapes.delay': 'Delay',
        'visual.shapes.slRect': 'Sloped rect',
        'visual.shapes.divRect': 'Divided rect',
        'visual.shapes.folder': 'Folder',
        'visual.shapes.datastore': 'Data store',
        'visual.shapes.cloud': 'Cloud',
        'visual.shapes.browser': 'Browser',
        'visual.shapes.bolt': 'Bolt',
        'visual.shapes.tri': 'Triangle',
        'visual.shapes.hourglass': 'Hourglass',
        'visual.shapes.doc': 'Document',
      };
      return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(args?.[k] ?? `{{${k}}}`));
    },
  }),
}));

const DBL_CIRC_NAME = 'Add Double Circle (tap to add, drag to canvas)';
const CIRCLE_NAME = 'Add Circle (tap to add, drag to canvas)';

function renderToolbar() {
  return render(
    <ShapeToolbar
      toolMode="select"
      onToolMode={vi.fn()}
      onAddShape={vi.fn()}
      onDragStart={vi.fn()}
    />,
  );
}

describe('ShapeToolbar', () => {
  describe('double-circle entry (26-01)', () => {
    it('renders a double-circle button whose accessible name resolves the localized add hint', () => {
      const { container } = renderToolbar();

      // The entry lives behind the More chip in jsdom (fit note above) —
      // open the popover so the accessible copy mounts.
      fireEvent.click(screen.getByRole('button', { name: 'More' }));

      // Exactly ONE accessible instance (the popover copy); the measurer copy
      // is aria-hidden and excluded from role queries.
      const btns = screen.getAllByRole('button', { name: DBL_CIRC_NAME });
      expect(btns).toHaveLength(1);
      expect(btns[0].textContent).toContain('Double Circle');

      // Both structural copies render (popover + hidden measurer).
      const copies = container.querySelectorAll(`button[title="${DBL_CIRC_NAME}"]`);
      expect(copies).toHaveLength(2);
    });

    it("draws the double-circle preview with exactly two circles on every copy's SVG", () => {
      const { container } = renderToolbar();

      // Scope to the matched buttons — never container-wide (the toolbar
      // renders many shapes' SVGs side by side). The hidden measurer renders
      // every shape unconditionally, so the copies exist without opening the
      // popover.
      const copies = container.querySelectorAll(`button[title="${DBL_CIRC_NAME}"]`);
      expect(copies.length).toBeGreaterThan(0);
      copies.forEach((btn) => {
        expect(btn.querySelectorAll('circle')).toHaveLength(2);
      });
    });

    it('keeps the circle preview at exactly one circle (no cross-contamination)', () => {
      const { container } = renderToolbar();

      const copies = container.querySelectorAll(`button[title="${CIRCLE_NAME}"]`);
      expect(copies.length).toBeGreaterThan(0);
      copies.forEach((btn) => {
        expect(btn.querySelectorAll('circle')).toHaveLength(1);
      });
    });
  });

  // 27-03: the 12-shape toolbar set. The plan's structural net: every new
  // entry renders twice (popover copy + hidden measurer copy), resolves its
  // localized label (no raw i18n key in the accessible name), and carries a
  // preview whose svg markup is pairwise-unique across ALL 26 shapes — a
  // missing ShapePreview case silently renders the default-rect fallback and
  // duplicates that markup, which the uniqueness sweep flips on.
  describe('12-shape set entries (27-03)', () => {
    // [shape key, mock label] — the mock is language-neutral (en values).
    const NEW_SHAPES: [shape: string, label: string][] = [
      ['person', 'Person'],
      ['delay', 'Delay'],
      ['sl-rect', 'Sloped rect'],
      ['div-rect', 'Divided rect'],
      ['folder', 'Folder'],
      ['datastore', 'Data store'],
      ['cloud', 'Cloud'],
      ['browser', 'Browser'],
      ['bolt', 'Bolt'],
      ['tri', 'Triangle'],
      ['hourglass', 'Hourglass'],
      ['doc', 'Document'],
    ];

    const ALL_LABELS = [
      'Box', 'Round', 'Stadium', 'Diamond', 'Circle', 'Hexagon', 'Cylinder',
      'Slant', 'Slant (mirrored)', 'Trapezoid', 'Trapezoid (mirrored)',
      'Subroutine', 'Flag', 'Double Circle',
      ...NEW_SHAPES.map(([, label]) => label),
    ];

    const hintFor = (label: string) => `Add ${label} (tap to add, drag to canvas)`;

    it.each(NEW_SHAPES)('renders the %s entry with a resolved label on both structural copies', (shape, label) => {
      const { container } = renderToolbar();
      const name = hintFor(label);

      // The entry lives behind the More chip in jsdom (fit note at top) —
      // open the popover so the accessible copy mounts.
      fireEvent.click(screen.getByRole('button', { name: 'More' }));

      // Exactly TWO structural copies: popover + hidden measurer.
      const copies = container.querySelectorAll(`button[title="${name}"]`);
      expect(copies).toHaveLength(2);

      // Exactly ONE accessible instance (the measurer copy is aria-hidden
      // and visibility:hidden — role queries exclude it, 26-01 measured).
      const btns = screen.getAllByRole('button', { name });
      expect(btns).toHaveLength(1);
      expect(btns[0].textContent).toContain(label);
    });

    it('renders all 26 shape previews with pairwise-unique svg markup (no default-rect fallback)', () => {
      const { container } = renderToolbar();

      // The hidden measurer renders every shape unconditionally, so the
      // sweep needs no popover. Markup (not element counts) is the net: any
      // shape falling through ShapePreview's default branch duplicates the
      // plain-rect markup and shrinks the set below 26.
      const markups = ALL_LABELS.map((label) => {
        const copy = container.querySelector(`button[title="${hintFor(label)}"]`);
        expect(copy).not.toBeNull();
        const svg = copy?.querySelector('svg');
        expect(svg).not.toBeNull();
        return svg?.outerHTML ?? '';
      });
      expect(new Set(markups).size).toBe(26);
    });

    it('differentiates the three research-named confusion pairs in svg markup', () => {
      const { container } = renderToolbar();
      const markup = (label: string) => {
        const copy = container.querySelector(`button[title="${hintFor(label)}"]`);
        expect(copy).not.toBeNull();
        return copy?.querySelector('svg')?.outerHTML ?? '';
      };

      // 27-RESEARCH Q6 named these pairs as the manual-check confusions;
      // the structural half of that check is pinned here.
      expect(markup('Sloped rect')).not.toBe(markup('Slant'));
      expect(markup('Data store')).not.toBe(markup('Cylinder'));
      expect(markup('Triangle')).not.toBe(markup('Flag'));
    });
  });
});
