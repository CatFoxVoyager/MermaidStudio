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
});
