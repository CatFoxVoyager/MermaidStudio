/**
 * Tests for ShapeToolbar — 38-05 (SHP-03): the toolbar is a derived view of
 * the shapes.ts SSOT (53 canonical entries), the preview table moved to the
 * shared ShapePreview, and the More popover hosts the shared ShapePicker.
 *
 * The CI uniqueness lock moved 26 → 53 IN THIS COMMIT (the same commit as
 * the SSOT-derived growth it locks — research-verified Wave-0 requirement).
 *
 * The i18n mock is mandatory (PreviewPanel.test.tsx:30-32 precedent): the
 * toolbar resolves its labels through visual.*, so the mock must cover them
 * or the shape buttons render raw i18n keys and every name query finds
 * nothing. The 53 mock entries are DERIVED FROM CANONICAL_SHAPES
 * (language-neutral: the label is the canonical slug) rather than hand-typed,
 * so the mock cannot drift from the registry.
 *
 * jsdom instrument notes (measured on this suite's first RED run):
 * - The mount layout-effect fit measures a zero-width scroller, so the
 *   primary row determinically holds MIN_PRIMARY_SHAPE_COUNT shapes and the
 *   More ShapePicker carries the remaining 51 — unlike the in-app
 *   wide-panel default.
 * - The hidden measurer row is aria-hidden + visibility:hidden, so RTL role
 *   queries never see its copies; title-attribute queries do.
 */
import { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ShapeToolbar } from '../ShapeToolbar';
import { CANONICAL_SHAPES } from '@/lib/mermaid/shapes';
import { UIScaleProvider, useUIScaleContext, type UIScaleApi } from '@/hooks/useUIScale';
import { applyScale, UI_SCALE_STORAGE_KEY } from '@/utils/uiScale';
import { mockMatchMedia, setViewport } from '@/utils/__tests__/uiScaleTestHelpers';

// 38-05: the 26 legacy-era toolbar entries at HEAD before the SSOT growth.
// Hand-typed ONCE as the historical baseline — the it.each below derives the
// beyond-baseline entries from the registry against this list.
const ORIGINAL_TOOLBAR_SHAPES = [
  'rect', 'round', 'stadium', 'rhombus', 'circle', 'hexagon', 'cylinder',
  'parallelogram', 'parallelogram-alt', 'trapezoid', 'trapezoid-alt',
  'subroutine', 'odd', 'dbl-circ', 'person', 'delay', 'sl-rect', 'div-rect',
  'folder', 'datastore', 'cloud', 'browser', 'bolt', 'tri', 'hourglass', 'doc',
] as const;

vi.mock('react-i18next', async () => {
  const { CANONICAL_SHAPES, SHAPE_CATEGORIES } = await import('@/lib/mermaid/shapes');
  const map: Record<string, string> = {
    'visual.selectTool': 'Select',
    'visual.selectToolHint': 'Select tool (V)',
    'visual.connectTool': 'Connect',
    'visual.connectToolHint': 'Connect tool (C)',
    'visual.deleteSelected': 'Delete',
    'visual.moreShapes': 'More',
    'visual.shapeAddHint': 'Add {{shape}} (tap to add, drag to canvas)',
    // ShapePicker surface keys (the More popover hosts the shared picker).
    'visual.shapeSearch': 'Search shapes…',
    'visual.shapeSearchClear': 'Clear search',
    'visual.shapeSearchEmpty': 'No matching shape',
    'visual.shapeSearchEmptyHint': 'No shape matches “{{query}}”.',
    ...Object.fromEntries(SHAPE_CATEGORIES.map((c) => [`visual.shapeCategories.${c}`, c])),
    // Registry-derived 53: label = canonical slug (language-neutral).
    ...Object.fromEntries(CANONICAL_SHAPES.map((s) => [`visual.shapes.${s.shortName}`, s.shortName])),
  };
  return {
    useTranslation: () => ({
      t: (key: string, args?: Record<string, unknown>) =>
        (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(args?.[k] ?? `{{${k}}}`)),
    }),
  };
});

// Registry-derived label list — the sweep cannot drift from shapes.ts.
const ALL_LABELS = CANONICAL_SHAPES.map((s) => s.shortName);

// jsdom fit note: the zero-width scroller pins visibleCount to
// MIN_PRIMARY_SHAPE_COUNT (2), so the primary row is the first two registry
// entries (basics, dist order) — these render an extra hint-titled copy.
const PRIMARY_IN_JSDOM = CANONICAL_SHAPES.slice(0, 2).map((s) => s.shortName);

// Registry-derived growth: the canonical shapes beyond the original 26.
const NEW_SHAPES = CANONICAL_SHAPES
  .map((s) => s.shortName)
  .filter((slug) => !(ORIGINAL_TOOLBAR_SHAPES as readonly string[]).includes(slug));

const hintFor = (label: string) => `Add ${label} (tap to add, drag to canvas)`;

function renderToolbar(overrides: { onAddShape?: (s: string) => void; onDragStart?: (s: string) => void } = {}) {
  return render(
    <ShapeToolbar
      toolMode="select"
      onToolMode={vi.fn()}
      onAddShape={overrides.onAddShape ?? vi.fn()}
      onDragStart={overrides.onDragStart ?? vi.fn()}
    />,
  );
}

function markupFor(container: HTMLElement, label: string): string {
  const copy = container.querySelector(`button[title="${hintFor(label)}"]`);
  expect(copy).not.toBeNull();
  const svg = copy?.querySelector('svg');
  expect(svg).not.toBeNull();
  return svg?.outerHTML ?? '';
}

describe('ShapeToolbar', () => {
  describe('canonical heritage entries', () => {
    it('renders a double-circle button whose accessible name resolves the localized add hint', () => {
      const { container } = renderToolbar();

      // The entry lives behind the More chip in jsdom (fit note above) —
      // open the popover so the accessible copy mounts.
      fireEvent.click(screen.getByRole('button', { name: 'More' }));

      // Exactly ONE accessible instance: the ShapePicker cell (label = the
      // canonical slug); the measurer copy is aria-hidden and excluded from
      // role queries.
      const btns = screen.getAllByRole('button', { name: 'dbl-circ' });
      expect(btns).toHaveLength(1);
      expect(btns[0].textContent).toContain('dbl-circ');

      // Both structural copies render: the ShapePicker cell (title = the
      // full label, per the picker contract) + the hidden measurer copy
      // (title = the add hint).
      expect(container.querySelectorAll('button[data-shape-cell="dbl-circ"]')).toHaveLength(1);
      expect(container.querySelectorAll(`button[title="${hintFor('dbl-circ')}"]`)).toHaveLength(1);
    });

    it("draws the double-circle preview with exactly two circles on every copy's SVG", () => {
      const { container } = renderToolbar();

      // Scope to the matched buttons — never container-wide (the toolbar
      // renders many shapes' SVGs side by side). The hidden measurer renders
      // every shape unconditionally, so the copies exist without opening the
      // popover.
      const copies = container.querySelectorAll(`button[title="${hintFor('dbl-circ')}"]`);
      expect(copies.length).toBeGreaterThan(0);
      copies.forEach((btn) => {
        expect(btn.querySelectorAll('circle')).toHaveLength(2);
      });
    });

    it('keeps the circle preview at exactly one circle (no cross-contamination)', () => {
      const { container } = renderToolbar();

      const copies = container.querySelectorAll(`button[title="${hintFor('circle')}"]`);
      expect(copies.length).toBeGreaterThan(0);
      copies.forEach((btn) => {
        expect(btn.querySelectorAll('circle')).toHaveLength(1);
      });
    });
  });

  // 38-05: registry-derived growth — every canonical shape beyond the
  // original 26 renders twice (ShapePicker cell + hidden measurer copy),
  // resolves its localized label (no raw i18n key in the accessible name),
  // and its preview stays unique (uniqueness lock below).
  describe('registry-derived entries (38-05)', () => {
    it.each(NEW_SHAPES)('renders the %s entry with a resolved label on both structural copies', (slug) => {
      const { container } = renderToolbar();
      const name = hintFor(slug);

      // The entry lives behind the More chip in jsdom (fit note at top) —
      // open the popover so the accessible copy mounts.
      fireEvent.click(screen.getByRole('button', { name: 'More' }));

      // Exactly TWO structural copies: the ShapePicker cell (title = the
      // full label, per the picker contract) + the hidden measurer copy
      // (title = the add hint). Entries the jsdom fit promotes to the
      // primary row (the first two registry entries) carry one extra
      // hint-titled copy there.
      expect(container.querySelectorAll(`button[data-shape-cell="${slug}"]`)).toHaveLength(1);
      expect(container.querySelectorAll(`button[title="${name}"]`))
        .toHaveLength(PRIMARY_IN_JSDOM.includes(slug) ? 2 : 1);

      // Exactly ONE accessible instance: the ShapePicker cell (the measurer
      // copy is aria-hidden and visibility:hidden — role queries exclude it,
      // 26-01 measured).
      const btns = screen.getAllByRole('button', { name: slug });
      expect(btns).toHaveLength(1);
      expect(btns[0].textContent).toContain(slug);
    });

    it('renders all 53 shape previews with pairwise-unique svg markup (no default-rect fallback)', () => {
      const { container } = renderToolbar();

      // The hidden measurer renders every shape unconditionally, so the
      // sweep needs no popover. Markup (not element counts) is the net: any
      // canonical shape falling through ShapePreview's default branch
      // duplicates the plain-rect markup and shrinks the set below 53.
      const markups = ALL_LABELS.map((label) => markupFor(container, label));
      expect(new Set(markups).size).toBe(53);
    });

    it('differentiates the research-named confusion families in svg markup', () => {
      const { container } = renderToolbar();
      const markup = (label: string) => markupFor(container, label);

      // 38-RESEARCH named these as the manual-check confusions; the
      // structural half of that check is pinned here:
      // - sl-rect (manual-input) vs the lean parallelogram family
      expect(markup('sl-rect')).not.toBe(markup('lean-r'));
      expect(markup('sl-rect')).not.toBe(markup('lean-l'));
      expect(markup('lean-r')).not.toBe(markup('lean-l'));
      // - flip-tri (manual-file target) vs its upright tri cousin
      expect(markup('flip-tri')).not.toBe(markup('tri'));
      // - tag-doc vs tag-rect (tagged document vs tagged rectangle)
      expect(markup('tag-doc')).not.toBe(markup('tag-rect'));
    });
  });

  describe('gestures (38-05)', () => {
    it('adds on click and drag-places from the primary row', () => {
      const onAddShape = vi.fn();
      const onDragStart = vi.fn();
      renderToolbar({ onAddShape, onDragStart });

      // jsdom fit: the primary row holds the first registry entries.
      const first = screen.getByRole('button', { name: hintFor('rect') });
      fireEvent.click(first);
      expect(onAddShape).toHaveBeenCalledWith('rect');
      expect(onDragStart).not.toHaveBeenCalled();

      fireEvent.dragStart(first);
      expect(onDragStart).toHaveBeenCalledWith('rect');
      expect(onAddShape).toHaveBeenCalledTimes(1);
    });

    it('adds on click from a picker cell and closes; drag places without closing', () => {
      const onAddShape = vi.fn();
      const onDragStart = vi.fn();
      const { container } = renderToolbar({ onAddShape, onDragStart });

      fireEvent.click(screen.getByRole('button', { name: 'More' }));
      expect(container.querySelector('[data-shape-picker]')).not.toBeNull();

      fireEvent.click(container.querySelector('button[data-shape-cell="diam"]')!);
      expect(onAddShape).toHaveBeenCalledWith('diam');
      expect(container.querySelector('[data-shape-picker]')).toBeNull();

      // Re-open: the drag gesture hands the shape to the host and keeps the
      // picker open (drop placement happens on the canvas).
      fireEvent.click(screen.getByRole('button', { name: 'More' }));
      fireEvent.dragStart(container.querySelector('button[data-shape-cell="diam"]')!);
      expect(onDragStart).toHaveBeenCalledWith('diam');
      expect(container.querySelector('[data-shape-picker]')).not.toBeNull();
    });

    it('closes the picker on Escape', () => {
      const { container } = renderToolbar();
      fireEvent.click(screen.getByRole('button', { name: 'More' }));
      expect(container.querySelector('[data-shape-picker]')).not.toBeNull();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(container.querySelector('[data-shape-picker]')).toBeNull();
    });
  });

  describe('UI scale greedy fit consistency', () => {
    afterEach(() => {
      applyScale(1);
      localStorage.removeItem(UI_SCALE_STORAGE_KEY);
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it.each([1, 0.8, 1.25])(
      'fits the same 4 primary shapes in a 500px local toolbar at scale %s',
      (scale) => {
        applyScale(scale);

        // Local geometry: scroller clientWidth=500, paddingRight=12, prefix=120,
        // More lane=68 => 300 local px available; each shape=60 + gap 4 = 64
        // local px => floor(300 / 64) = 4 primary shapes regardless of UI scale.
        // Under CSS zoom, clientWidth & computed paddingRight stay in local px
        // while getBoundingClientRect() returns scaled screen px.
        const origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
          configurable: true,
          get(this: HTMLElement) {
            return this.classList.contains('scroll-fade-x') ? 500 : 0;
          },
        });

        const origGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
          const cs = origGetComputedStyle.call(window, el, pseudo);
          if (el instanceof HTMLElement && el.classList.contains('scroll-fade-x')) {
            return new Proxy(cs, {
              get(target, prop) {
                if (prop === 'paddingRight') return '12px';
                const v = Reflect.get(target, prop);
                return typeof v === 'function' ? v.bind(target) : v;
              },
            });
          }
          return cs;
        });

        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
          if (this.classList.contains('scroll-fade-x')) {
            return { left: 0, top: 0, right: 500 * scale, bottom: 60 * scale, width: 500 * scale, height: 60 * scale, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
          }
          if (this.tagName === 'BUTTON' && this.closest('[aria-hidden="true"]')) {
            return { left: 0, top: 0, right: 60 * scale, bottom: 52 * scale, width: 60 * scale, height: 52 * scale, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
          }
          if (this.parentElement?.classList.contains('scroll-fade-x') && this.classList.contains('shrink-0')) {
            return { left: 120 * scale, top: 0, right: 400 * scale, bottom: 52 * scale, width: 280 * scale, height: 52 * scale, x: 120 * scale, y: 0, toJSON: () => ({}) } as DOMRect;
          }
          return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        });

        try {
          const { container } = renderToolbar();
          const primaryGroup = container.querySelector('.scroll-fade-x > div.flex.items-center.gap-1.shrink-0:not(.mr-2)');
          expect(primaryGroup).not.toBeNull();
          expect(primaryGroup!.querySelectorAll('button')).toHaveLength(4);
        } finally {
          if (origClientWidth) {
            Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClientWidth);
          } else {
            delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
          }
        }
      },
    );

    it('re-anchors an open ShapePicker when visibleCount reflows the toolbar', () => {
      applyScale(1.25);
      let toolbarWidth = 500;
      let moreBottom = 229.5;
      let resizeCb: ResizeObserverCallback | null = null;
      const OrigResizeObserver = globalThis.ResizeObserver;
      class FakeResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          resizeCb = cb;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      }
      globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

      const origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) {
          return this.classList.contains('scroll-fade-x') ? toolbarWidth : 0;
        },
      });

      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('aria-label') === 'More') {
          return { left: 1196, top: moreBottom - 66, right: 1270, bottom: moreBottom, width: 74, height: 66, x: 1196, y: moreBottom - 66, toJSON: () => ({}) } as DOMRect;
        }
        if (this.classList.contains('scroll-fade-x')) {
          return { left: 0, top: 0, right: toolbarWidth * 1.25, bottom: 75, width: toolbarWidth * 1.25, height: 75, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.tagName === 'BUTTON' && this.closest('[aria-hidden="true"]')) {
          return { left: 0, top: 0, right: 75, bottom: 65, width: 75, height: 65, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.parentElement?.classList.contains('scroll-fade-x') && this.classList.contains('shrink-0')) {
          return { left: 150, top: 0, right: 500, bottom: 65, width: 350, height: 65, x: 150, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      try {
        const { container } = renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        const picker = container.querySelector('[data-shape-picker]') as HTMLElement;
        expect(picker).not.toBeNull();
        expect(parseFloat(picker.style.top)).toBeCloseTo((229.5 + 8) / 1.25, 2);

        // Simulate toolbar narrowing -> visibleCount shrinks -> scrollbar collapses -> More shifts up 3px
        toolbarWidth = 350;
        moreBottom = 226.5;
        act(() => {
          resizeCb?.([], {} as ResizeObserver);
        });
        expect(parseFloat(picker.style.top)).toBeCloseTo((226.5 + 8) / 1.25, 2);
      } finally {
        globalThis.ResizeObserver = OrigResizeObserver;
        if (origClientWidth) {
          Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClientWidth);
        } else {
          delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
        }
      }
    });

    it('re-anchors an open ShapePicker when uiScale changes without visibleCount changing', () => {
      setViewport(1280, 720);
      mockMatchMedia(() => true);

      let moreBottom = 180;
      let moreRight = 1000;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('aria-label') === 'More') {
          return {
            left: moreRight - 60,
            top: moreBottom - 50,
            right: moreRight,
            bottom: moreBottom,
            width: 60,
            height: 50,
            x: moreRight - 60,
            y: moreBottom - 50,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const apiRef: { current: UIScaleApi | null } = { current: null };
      function ScaleProbe() {
        const api = useUIScaleContext();
        useEffect(() => {
          apiRef.current = api;
        });
        return null;
      }

      const { container } = render(
        <UIScaleProvider>
          <ScaleProbe />
          <ShapeToolbar
            toolMode="select"
            onToolMode={vi.fn()}
            onAddShape={vi.fn()}
            onDragStart={vi.fn()}
          />
        </UIScaleProvider>
      );

      expect(apiRef.current?.scale).toBe(0.8);
      fireEvent.click(screen.getByRole('button', { name: 'More' }));
      const picker = container.querySelector('[data-shape-picker]') as HTMLElement;
      expect(picker).not.toBeNull();
      expect(parseFloat(picker.style.top)).toBeCloseTo((180 + 8) / 0.8, 2);

      // Change UI scale from 0.8 -> 1.25 while visibleCount stays unchanged (no ResizeObserver fire).
      moreBottom = 260;
      moreRight = 1120;
      act(() => {
        apiRef.current?.setPref(1.25);
      });

      expect(parseFloat(picker.style.top)).toBeCloseTo((260 + 8) / 1.25, 2);
      expect(parseFloat(picker.style.right)).toBeCloseTo((1280 - 1120) / 1.25, 2);
    });
  });
});
