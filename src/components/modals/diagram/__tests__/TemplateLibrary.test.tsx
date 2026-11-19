// TemplateLibrary — official Mermaid examples chip.
// react-i18next is mocked globally (tests/vitest.setup.ts): t() returns the key,
// so the chip label is the literal 'templates.officialExamples'.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { Template } from '@/types';
import { TEMPLATES } from '@/constants/templates';

const loadOfficialExamples = vi.fn<() => Promise<Template[]>>();

vi.mock('@/constants/officialExamples', () => ({
  loadOfficialExamples: () => loadOfficialExamples(),
}));
vi.mock('@/services/storage/database', () => ({
  getUserTemplates: vi.fn(() => Promise.resolve([])),
  deleteUserTemplate: vi.fn(() => Promise.resolve()),
}));
// Previews are irrelevant here; keep every card in its spinner state.
vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(() => new Promise(() => {})),
}));
const { mediaState } = vi.hoisted(() => ({ mediaState: { mobile: false } }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => mediaState.mobile }));

import { TemplateLibrary } from '../TemplateLibrary';
import { renderDiagram } from '@/lib/mermaid/core';

const OFFICIAL: Template[] = [
  {
    id: 'official-wardley-0',
    title: 'Tea Shop Value Chain',
    description: 'Visualize value chains',
    category: 'Wardley Maps',
    complexity: 'simple',
    type: 'unknown',
    content: 'wardley-beta\n',
  },
  {
    id: 'official-swimlane-0',
    title: 'Support Request',
    description: 'Visualize processes across lanes',
    category: 'Swimlane Diagram',
    complexity: 'simple',
    type: 'unknown',
    content: 'swimlane-beta\n',
  },
];

const OFFICIAL_CHIP = 'templates.officialExamples';

function names() {
  return screen.queryAllByTestId('template-name').map(n => n.textContent);
}

describe('TemplateLibrary — official Mermaid examples', () => {
  beforeEach(() => {
    loadOfficialExamples.mockReset();
  });

  it('lists the official examples under their own chip, not in the unfiltered All grid', async () => {
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);

    // Header count includes them once loaded…
    await screen.findByText(`${TEMPLATES.length + OFFICIAL.length} templates.templates`);
    // …but 'All' (the default) still shows only the built-in templates.
    expect(names()).toHaveLength(TEMPLATES.length);
    expect(names()).not.toContain('Tea Shop Value Chain');

    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    expect(names()).toEqual(['Tea Shop Value Chain', 'Support Request']);
  });

  it('includes official examples in All while a search is active', async () => {
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText(`${TEMPLATES.length + OFFICIAL.length} templates.templates`);

    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'wardley' } });
    expect(names()).toEqual(['Tea Shop Value Chain']);
  });

  it('passes the selected official example to onSelect and closes', async () => {
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<TemplateLibrary onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    fireEvent.click(await screen.findByText('Support Request'));
    expect(onSelect).toHaveBeenCalledWith(OFFICIAL[1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a loading state, then an error state when the examples chunk fails', async () => {
    let reject!: (e: Error) => void;
    loadOfficialExamples.mockReturnValue(
      new Promise((_, r) => {
        reject = r;
      })
    );
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    expect(screen.getByTestId('official-examples-status').textContent).toBe(
      'templates.officialLoading'
    );

    reject(new Error('chunk load failed'));
    await waitFor(() =>
      expect(screen.getByTestId('official-examples-status').textContent).toContain(
        'templates.officialError'
      )
    );
    // The retry button re-runs the (cache-cleared) load and recovers.
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    fireEvent.click(screen.getByTestId('official-examples-retry'));
    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    await screen.findByText('Tea Shop Value Chain');
    expect(screen.queryByTestId('official-examples-retry')).toBeNull();
    // Built-in templates are unaffected by the failure.
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(names()).toHaveLength(TEMPLATES.length);
  });

  it('does not pull official examples into All for a whitespace-only search', async () => {
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText(`${TEMPLATES.length + OFFICIAL.length} templates.templates`);

    fireEvent.change(screen.getByTestId('search-input'), { target: { value: '   ' } });
    expect(names()).toHaveLength(TEMPLATES.length);
  });

  it('ignores a load that settles after unmount', async () => {
    let resolve!: (v: Template[]) => void;
    loadOfficialExamples.mockReturnValue(
      new Promise(r => {
        resolve = r;
      })
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    unmount();
    resolve(OFFICIAL);
    await Promise.resolve();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('TemplateCard — viewport-gated preview rendering', () => {
  let observed: Element[];
  let callbacks: IntersectionObserverCallback[];

  beforeEach(() => {
    observed = [];
    callbacks = [];
    // mockReset restores the factory default (a never-settling promise), so
    // the content-routed implementations below never leak into other tests.
    vi.mocked(renderDiagram).mockReset();
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    class IOStub {
      constructor(cb: IntersectionObserverCallback) {
        callbacks.push(cb);
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', IOStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a card preview only once its card intersects the viewport', async () => {
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    const second = await screen
      .findByText('Support Request')
      .then(el => el.closest('[data-testid=template-item]')!);

    // Passive effects flush asynchronously: under parallel-worker load,
    // findByText can resolve before the observers run — poll instead of
    // asserting immediately.
    const index = await waitFor(() => {
      const i = observed.indexOf(second);
      if (i === -1) {throw new Error('official card not observed yet');}
      return i;
    });

    // Every card is observed, none rendered yet.
    // (cards from the initial 'All' grid were observed too, then unmounted)
    expect(observed.filter(el => el.isConnected)).toHaveLength(OFFICIAL.length);
    expect(renderDiagram).not.toHaveBeenCalled();

    // Intersect only the second official card.
    act(() => {
      callbacks[index](
        [{ isIntersecting: true, target: second } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(renderDiagram).toHaveBeenCalledTimes(1);
    expect(vi.mocked(renderDiagram).mock.calls[0][0]).toBe(OFFICIAL[1].content);
  });

  it('shows an error state instead of an endless spinner when the preview render fails', async () => {
    // Regression guard: the WebKit eventmodeling example renders with an
    // error ("svg element not in render tree", upstream limitation) — the
    // card used to spin forever because the error was swallowed. IO is
    // stubbed out so the component takes its immediate-render fallback: the
    // test must not depend on observer plumbing (an under-load CI worker
    // once resolved findByText before the observers ran). The mock routes
    // by content: immediate fallback renders EVERY card, so a Once-mock
    // would be consumed by a built-in card instead of the target one.
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.mocked(renderDiagram).mockImplementation(async (content: string) =>
      content === OFFICIAL[1].content
        ? { svg: '', error: 'svg element not in render tree' }
        : { svg: '', error: null }
    );
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    const card = await screen
      .findByText('Support Request')
      .then(el => el.closest('[data-testid=template-item]')!);
    await waitFor(() =>
      expect(card.querySelector('[data-testid=template-preview-error]')).not.toBeNull()
    );
    expect(card.querySelector('.animate-spin')).toBeNull();
    expect(card.querySelector('.mermaid-container')).toBeNull();
  });

  it('renders the sanitized preview when the render succeeds', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.mocked(renderDiagram).mockImplementation(async (content: string) =>
      content === OFFICIAL[1].content
        ? { svg: '<svg><rect x="0" y="0" width="4" height="4"/></svg>', error: null }
        : { svg: '', error: null }
    );
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    const card = await screen
      .findByText('Support Request')
      .then(el => el.closest('[data-testid=template-item]')!);
    await waitFor(() => expect(card.querySelector('.mermaid-container svg')).not.toBeNull());
    expect(card.querySelector('[data-testid=template-preview-error]')).toBeNull();
  });
});

describe('TemplateLibrary — mobile restricted types', () => {
  beforeEach(() => {
    loadOfficialExamples.mockReset();
    mediaState.mobile = true;
  });

  afterEach(() => {
    mediaState.mobile = false;
  });

  // RESTRICTED_TYPES regression guard: 'architecture' (the stale label) never
  // matched the detector's 'architectureDiagram' output, so architecture
  // examples shipped to mobile despite the restriction.
  it('hides c4, gantt and architecture official examples on mobile', async () => {
    loadOfficialExamples.mockResolvedValue([
      OFFICIAL[1], // swimlane (unknown type) — stays visible
      { id: 'official-architecture-0', title: 'Basic System Architecture', description: 'd', category: 'Architecture Diagram', complexity: 'moderate', type: 'architectureDiagram', content: 'architecture-beta\n' },
      { id: 'official-c4-0', title: 'Internet Banking System Context', description: 'd', category: 'C4 Diagram', complexity: 'moderate', type: 'c4', content: 'C4Context\n' },
      { id: 'official-gantt-0', title: 'Product Launch Plan', description: 'd', category: 'Gantt', complexity: 'moderate', type: 'gantt', content: 'gantt\n' },
    ]);
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: OFFICIAL_CHIP }));
    await screen.findByText('Support Request');

    expect(screen.queryByText('Basic System Architecture')).toBeNull();
    expect(screen.queryByText('Internet Banking System Context')).toBeNull();
    expect(screen.queryByText('Product Launch Plan')).toBeNull();
    expect(screen.getByText('Support Request')).toBeTruthy();
  });

  it('header count mirrors the mobile-visible templates', async () => {
    loadOfficialExamples.mockResolvedValue(OFFICIAL);
    render(<TemplateLibrary onSelect={vi.fn()} onClose={vi.fn()} />);
    // TEMPLATES includes one c4 and one gantt (restricted on mobile); the two
    // OFFICIAL fixtures are unrestricted (type 'unknown').
    const visible = [...TEMPLATES, ...OFFICIAL].filter(
      t => !['c4', 'gantt', 'architectureDiagram'].includes(t.type)
    ).length;
    await screen.findByText(`${visible} templates.templates`);
  });
});
