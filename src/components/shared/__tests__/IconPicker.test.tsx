/**
 * Tests for IconPicker — 39-05 (ICON-03, UI-SPEC Surface 2). The lazy-pack
 * behavior contrasted with the sync ShapePicker: per-pack loading /
 * load-error + Retry (retry re-triggers ONLY the failed import) / loaded
 * states, the bounded 120-cell initial window extended on scroll, transient
 * case-fold search over the full in-memory name set (aliases included),
 * zero-match section hiding + declared empty copy, alias glyphs resolving
 * to their parent, and the cloned dismissal guards.
 *
 * The three pack JSON modules are mocked to SMALL fixtures through
 * vi.hoisted holders whose ok flags the tests flip (with vi.resetModules()
 * between tests so the dynamic import re-runs the mocked factory). The REAL
 * @iconify/utils getIconData resolves the fixtures, so alias-to-parent
 * resolution is exercised for real.
 *
 * jsdom is wiring-only (no layout engine): the 320-390px viewport behavior
 * is the UI-SPEC backstop row and is asserted here only as structure
 * (search row shrink-0 above the overflow-y-auto scroller; scroll bounds
 * driven via defineProperty).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IconPicker } from '../IconPicker';

const fixtures = vi.hoisted(() => {
  const solidIcons: Record<string, { body: string }> = {
    house: { body: '<path d="M-house"/>' },
    user: { body: '<path d="M-user"/>' },
  };
  for (let i = 0; i < 150; i++) {
    solidIcons[`glyph${i}`] = { body: `<path d="M-g${i}"/>` };
  }
  return {
    solid: {
      ok: true,
      calls: 0,
      json: {
        prefix: 'fa6-solid',
        width: 512,
        height: 512,
        icons: solidIcons,
        aliases: { home: { parent: 'house' } },
      },
    },
    regular: {
      ok: true,
      calls: 0,
      json: {
        prefix: 'fa6-regular',
        width: 512,
        height: 512,
        icons: {
          anchor: { body: '<path d="M-anchor"/>' },
          bell: { body: '<path d="M-bell"/>' },
          clock: { body: '<path d="M-clock"/>' },
          eye: { body: '<path d="M-eye"/>' },
          flag: { body: '<path d="M-flag"/>' },
          heart: { body: '<path d="M-heart"/>' },
          lightbulb: { body: '<path d="M-bulb"/>' },
          moon: { body: '<path d="M-moon"/>' },
          star: { body: '<path d="M-star"/>' },
          sun: { body: '<path d="M-sun"/>' },
        },
        aliases: {},
      },
    },
    brands: {
      ok: true,
      calls: 0,
      json: {
        prefix: 'fa6-brands',
        width: 512,
        height: 512,
        icons: {
          github: { body: '<path d="M-github"/>' },
          react: { body: '<path d="M-react"/>' },
          'node-js': { body: '<path d="M-node"/>' },
          chrome: { body: '<path d="M-chrome"/>' },
          firefox: { body: '<path d="M-firefox"/>' },
        },
        aliases: {},
      },
    },
  };
});

// The load boundary is mocked at the packs module: the fixtures' ok flags
// are consulted at load() CALL time (not factory time), so per-test flips
// drive both the failure and the retry-heal paths.
vi.mock('../iconPickerPacks', () => ({
  ICON_PICKER_PACKS: [
    {
      key: 'solid',
      headerKey: 'visual.iconPacks.solid',
      prefix: 'fa',
      load: () => {
        fixtures.solid.calls += 1;
        return fixtures.solid.ok
          ? Promise.resolve(fixtures.solid.json)
          : Promise.reject(new Error('solid chunk failed to load'));
      },
    },
    {
      key: 'regular',
      headerKey: 'visual.iconPacks.regular',
      prefix: 'far',
      load: () => {
        fixtures.regular.calls += 1;
        return fixtures.regular.ok
          ? Promise.resolve(fixtures.regular.json)
          : Promise.reject(new Error('regular chunk failed to load'));
      },
    },
    {
      key: 'brands',
      headerKey: 'visual.iconPacks.brands',
      prefix: 'fab',
      load: () => {
        fixtures.brands.calls += 1;
        return fixtures.brands.ok
          ? Promise.resolve(fixtures.brands.json)
          : Promise.reject(new Error('brands chunk failed to load'));
      },
    },
  ],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, args?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'visual.iconSearch': 'Search icons…',
        'visual.iconSearchClear': 'Clear search',
        'visual.iconSearchEmpty': 'No matching icon',
        'visual.iconSearchEmptyHint': 'No icon matches “{{query}}”. Try the FontAwesome name, e.g. “house” or “github”.',
        'visual.iconLoading': 'Loading icon library…',
        'visual.iconLoadError': 'The icon library failed to load.',
        'visual.iconRetry': 'Retry',
        'visual.iconPacks.solid': 'Solid',
        'visual.iconPacks.regular': 'Regular',
        'visual.iconPacks.brands': 'Brands',
      };
      return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(args?.[k] ?? `{{${k}}}`));
    },
  }),
}));

const ANCHOR = { right: 8, top: 40, maxHeight: 400 };

function renderPicker(props: Partial<Parameters<typeof IconPicker>[0]> = {}) {
  return render(<IconPicker anchor={ANCHOR} onClose={vi.fn()} onPick={vi.fn()} {...props} />);
}

/** Flush the lazy pack imports (each resolves a microtask after mount). */
async function settle() {
  await act(async () => {});
}

beforeEach(() => {
  for (const pack of [fixtures.solid, fixtures.regular, fixtures.brands]) {
    pack.ok = true;
    pack.calls = 0;
  }
});

function cells(container: HTMLElement, section?: string): HTMLElement[] {
  const scope = section
    ? (container.querySelector(`section[data-pack-section="${section}"]`) as HTMLElement)
    : container;
  return Array.from(scope.querySelectorAll('button[data-icon-cell]'));
}

describe('IconPicker', () => {
  describe('lazy pack states (the one structural difference from ShapePicker)', () => {
    it('renders the spinner row with the declared aria copy while packs resolve — no progress bar, no cells', async () => {
      const { container } = renderPicker();
      // Synchronously after mount every pack is resolving.
      const loading = container.querySelectorAll('[data-pack-loading]');
      expect(loading.length).toBeGreaterThan(0);
      for (const row of loading) {
        expect(row.getAttribute('aria-label')).toBe('Loading icon library…');
        expect(row.getAttribute('role')).toBe('status');
      }
      expect(container.querySelectorAll('button[data-icon-cell]')).toHaveLength(0);
      expect(container.querySelector('[role="progressbar"]')).toBeNull();
      await settle();
      expect(container.querySelectorAll('[data-pack-loading]')).toHaveLength(0);
    });

    it('renders three proper-noun pack sections once loaded', async () => {
      const { container } = renderPicker();
      await settle();
      const headers = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
      expect(headers).toEqual(['Solid', 'Regular', 'Brands']);
    });

    it('a failing pack renders the error row scoped to its section while loaded sections render normally', async () => {
      fixtures.brands.ok = false;
      const { container } = renderPicker();
      await settle();
      const brandsSection = container.querySelector('section[data-pack-section="brands"]') as HTMLElement;
      expect(brandsSection.querySelector('[data-pack-error="brands"]')).not.toBeNull();
      expect(brandsSection.textContent).toContain('The icon library failed to load.');
      expect(brandsSection.querySelectorAll('button[data-icon-cell]')).toHaveLength(0);
      // The failure never crashes the picker: loaded sections render.
      expect(cells(container, 'solid')).toHaveLength(120);
      expect(cells(container, 'regular')).toHaveLength(10);
      expect(cells(container, 'solid').length + cells(container, 'regular').length).toBe(
        container.querySelectorAll('button[data-icon-cell]').length,
      );
    });

    it('Retry re-triggers ONLY the failed pack import and heals the section', async () => {
      fixtures.brands.ok = false;
      const { container } = renderPicker();
      await settle();
      expect(fixtures.brands.calls).toBe(1); // the load ran and rejected
      expect(fixtures.solid.calls).toBe(1);
      expect(fixtures.regular.calls).toBe(1);

      fixtures.brands.ok = true;
      fireEvent.click(container.querySelector('button[data-pack-retry="brands"]') as HTMLElement);
      await settle();
      expect(fixtures.brands.calls).toBe(2); // only brands re-triggered
      expect(fixtures.solid.calls).toBe(1); // loaded packs untouched
      expect(fixtures.regular.calls).toBe(1);
      expect(cells(container, 'brands')).toHaveLength(5);
      expect(container.querySelector('[data-pack-error="brands"]')).toBeNull();
    });
  });

  describe('bounded grid (Grey Area 5 — no full render)', () => {
    it('caps each section at the initial 120-cell window until scroll extends it', async () => {
      const { container } = renderPicker();
      await settle();
      // Solid carries 152 names (house/user + 150 fixtures) — the window
      // caps it; the smaller packs render whole.
      expect(cells(container, 'solid')).toHaveLength(120);
      expect(cells(container, 'regular')).toHaveLength(10);
      expect(cells(container, 'brands')).toHaveLength(5);
    });

    it('scrolling near the bottom extends still-truncated sections by one window step', async () => {
      const { container } = renderPicker();
      await settle();
      const scroller = container.querySelector('.overflow-y-auto') as HTMLElement;
      const setScroll = (top: number) => {
        Object.defineProperty(scroller, 'scrollTop', { value: top, configurable: true });
        Object.defineProperty(scroller, 'clientHeight', { value: 400, configurable: true });
        Object.defineProperty(scroller, 'scrollHeight', { value: 5000, configurable: true });
      };
      setScroll(0); // far from the bottom — no extension
      fireEvent.scroll(scroller);
      expect(cells(container, 'solid')).toHaveLength(120);

      setScroll(4700); // 4700 + 400 >= 5000 - 48 — near the bottom
      fireEvent.scroll(scroller);
      expect(cells(container, 'solid')).toHaveLength(153); // 152 icons + home alias, window capped by the full name set
      expect(cells(container, 'regular')).toHaveLength(10); // already whole
    });
  });

  describe('search (transient case-fold over the full name set)', () => {
    const type = async (query: string) => {
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Search icons…'), { target: { value: query } });
      });
    };

    it('case-folds the query at comparison time and hides zero-match sections', async () => {
      const { container } = renderPicker();
      await settle();
      await type('HOUS'); // uppercase query, lowercase stored names
      // Only the 'house' icon matches 'hous' (the 'home' alias does not);
      // every other pack section hides.
      expect(cells(container).map((c) => c.getAttribute('data-icon-cell'))).toEqual(['house']);
      const headers = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
      expect(headers).toEqual(['Solid']);
    });

    it('an alias cell renders its parent glyph (getIconData resolution, mermaid parity)', async () => {
      const { container } = renderPicker();
      await settle();
      // 'home' sits beyond the initial 120-cell window — scroll extends the
      // section to the full name set so both cells render for comparison.
      const scroller = container.querySelector('.overflow-y-auto') as HTMLElement;
      Object.defineProperty(scroller, 'scrollTop', { value: 4700, configurable: true });
      Object.defineProperty(scroller, 'clientHeight', { value: 400, configurable: true });
      Object.defineProperty(scroller, 'scrollHeight', { value: 5000, configurable: true });
      fireEvent.scroll(scroller);
      const home = container.querySelector('button[data-icon-cell="home"] svg') as SVGSVGElement;
      const house = container.querySelector('button[data-icon-cell="house"] svg') as SVGSVGElement;
      expect(home).not.toBeNull();
      expect(home.innerHTML).toBe(house.innerHTML);
      expect(home.getAttribute('viewBox')).toBe('0 0 512 512');
    });

    it('hides zero-match sections and renders the declared empty copy when nothing matches anywhere', async () => {
      const { container } = renderPicker();
      await settle();
      await type('zzzz');
      expect(cells(container)).toHaveLength(0);
      expect(container.querySelectorAll('h3')).toHaveLength(0);
      expect(screen.getByText('No matching icon')).not.toBeNull();
      expect(
        screen.getByText('No icon matches “zzzz”. Try the FontAwesome name, e.g. “house” or “github”.'),
      ).not.toBeNull();
      const emptyWrap = screen.getByText('No matching icon').parentElement as HTMLElement;
      expect(emptyWrap.style.color).toBe('var(--text-tertiary)');
    });

    it('shows the clear button only while the query is non-empty and restores the full grid', async () => {
      const { container } = renderPicker();
      await settle();
      expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
      await type('github');
      expect(screen.getByRole('button', { name: 'Clear search' })).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      await settle();
      expect(cells(container).length).toBe(120 + 10 + 5); // the bounded window caps solid at 120; whole packs render whole
      expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    });
  });

  describe('cells', () => {
    it('glyphs carry currentColor and the 10px truncated label keeps the full name in title/aria', async () => {
      const { container } = renderPicker();
      await settle();
      const cell = container.querySelector('button[data-icon-cell="house"]') as HTMLElement;
      const svg = cell.querySelector('svg') as SVGSVGElement;
      expect(svg.getAttribute('fill')).toBe('currentColor');
      expect(cell.getAttribute('title')).toBe('house');
      expect(cell.getAttribute('aria-label')).toBe('house');
      const label = cell.querySelector('span') as HTMLElement;
      expect(label.className).toContain('text-[10px]');
      expect(label.className).toContain('truncate');
    });

    it('selection: a pick reports the registered-prefix value and closes the picker', async () => {
      const onPick = vi.fn();
      const onClose = vi.fn();
      const { container } = renderPicker({ onPick, onClose });
      await settle();
      fireEvent.click(container.querySelector('button[data-icon-cell="house"]') as HTMLElement);
      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick).toHaveBeenCalledWith('fa:house'); // solid -> fa (registered; fas aliases it)
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('the picked cell carries the accent treatment (data-selected + accent vars)', async () => {
      const { container } = renderPicker({ selected: 'far:anchor' });
      await settle();
      const selectedCell = container.querySelector('button[data-icon-cell="anchor"]') as HTMLElement;
      expect(selectedCell.getAttribute('data-selected')).toBe('true');
      expect(selectedCell.getAttribute('data-icon-value')).toBe('far:anchor');
      expect(selectedCell.style.background).toBe('var(--accent-dim)');
      expect(selectedCell.style.borderColor).toBe('var(--accent)');
      const resting = container.querySelector('button[data-icon-cell="github"]') as HTMLElement;
      expect(resting.getAttribute('data-selected')).toBeNull();
      expect(resting.style.background).toBe('var(--surface-raised)');
      expect(resting.style.borderColor).toBe('var(--border-subtle)');
    });

    it('keeps the search row a shrink-0 sibling ABOVE the internal scroller (mask-image constraint)', async () => {
      const { container } = renderPicker();
      const root = container.querySelector('[data-icon-picker]') as HTMLElement;
      expect(root.className).toContain('fixed');
      const firstRow = root.firstElementChild as HTMLElement;
      expect(firstRow.className).toContain('shrink-0');
      expect(firstRow.querySelector('input')).not.toBeNull();
      const scroller = root.lastElementChild as HTMLElement;
      expect(scroller.className).toContain('overflow-y-auto');
      expect(scroller.contains(firstRow)).toBe(false);
    });
  });

  describe('dismissal (the cloned ShapePicker guards)', () => {
    it('closes on outside pointerdown and Escape', async () => {
      const onClose = vi.fn();
      renderPicker({ onClose });
      await settle();
      fireEvent.pointerDown(document.body);
      expect(onClose).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('never counts taps inside the search input or the popover root as outside taps', async () => {
      const onClose = vi.fn();
      const { container } = renderPicker({ onClose });
      await settle();
      fireEvent.pointerDown(screen.getByLabelText('Search icons…'));
      fireEvent.pointerDown(container.querySelector('[data-icon-picker] h3')!);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not dismiss when the opening trigger is tapped (toggle stays host-owned)', async () => {
      const onClose = vi.fn();
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      const triggerRef = { current: trigger };
      renderPicker({ onClose, triggerRef });
      await settle();
      fireEvent.pointerDown(trigger);
      expect(onClose).not.toHaveBeenCalled();
      trigger.remove();
    });

    it('typing in the search input never dismisses the picker', async () => {
      const onClose = vi.fn();
      renderPicker({ onClose });
      await settle();
      const input = screen.getByLabelText('Search icons…');
      fireEvent.change(input, { target: { value: 'hou' } });
      fireEvent.keyDown(input, { key: 'u' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('pack filter pills (45-01 LAY-04)', () => {
    it('filters visible sections to a single pack and restores all on All', async () => {
      const { container } = renderPicker();
      await settle();
      expect(container.querySelectorAll('[data-pack-section]').length).toBe(3);

      fireEvent.click(container.querySelector('[data-pack-filter="brands"]')!);
      expect(container.querySelectorAll('[data-pack-section]').length).toBe(1);
      expect(container.querySelector('[data-pack-section="brands"]')).not.toBeNull();
      expect(container.querySelector('[data-pack-section="solid"]')).toBeNull();

      fireEvent.click(container.querySelector('[data-pack-filter="all"]')!);
      expect(container.querySelectorAll('[data-pack-section]').length).toBe(3);
    });
  });
});

