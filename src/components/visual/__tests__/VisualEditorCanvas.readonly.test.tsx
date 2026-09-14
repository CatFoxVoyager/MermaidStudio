/**
 * DIA-04 / D6 Wave 0 lock — the visual-editor fail-safe round trip.
 *
 * A diagram whose BODY (outside frontmatter) carries the v12 metadata-attach
 * syntax (`@{...}`) must open the visual editor READ-ONLY:
 *   1. parseDiagram (the regex parser) is NEVER invoked on it — the presence
 *      gate sits before the parse memo and short-circuits it;
 *   2. the raw sanitized svg still renders (renderDiagram is a separate path);
 *   3. open/close round-trips byte-identically — onChange never fires;
 *   4. the gate is NOT always-on: metadata-free content parses exactly as
 *      before, and frontmatter-only occurrences never trigger read-only
 *      (frontmatter config is legitimate — THM-03).
 *
 * Mock strategy: renderDiagram + post-processing are mocked (render pipeline),
 * but codeUtils stays REAL via importOriginal — parseDiagram is wrapped in a
 * vi.fn spy so "the parser path is not reached" is directly assertable against
 * the genuine implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisualEditorCanvas } from '../VisualEditorCanvas';

vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn(async () => ({
    svg: '<svg><g class="node" id="flowchart-A-1"><rect width="100" height="50" /></g></svg>',
    error: null,
  })),
}));

vi.mock('@/lib/mermaid/codeUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mermaid/codeUtils')>();
  return {
    ...actual,
    parseDiagram: vi.fn(actual.parseDiagram),
  };
});

vi.mock('@/utils/svgPostProcessing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/svgPostProcessing')>();
  return {
    ...actual,
    postProcessDiagramSvg: vi.fn(actual.postProcessDiagramSvg),
  };
});

// Plain flowchart — no metadata anywhere.
const PLAIN_CONTENT = 'flowchart TD\n  A[Start] --> B\n  B[End]';

// The corruption vector: a bare post-id metadata line — the exact form the
// app's own updateNodeShape emits for the 11 V11_SHAPES.
const BODY_METADATA_CONTENT =
  'flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc" }';

// Metadata occurrence ONLY inside frontmatter (legitimate config — THM-03).
const FRONTMATTER_ONLY_CONTENT =
  '---\ntitle: Config diagram\nconfig:\n  metadata: "@{ view: collapsed }"\n---\nflowchart TD\n  A[Start] --> B[End]';

describe('bodyContainsAtDirective — D6 presence helper (via codeUtils)', () => {
  it('detects a body occurrence (space-separated form)', async () => {
    const { bodyContainsAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyContainsAtDirective('flowchart TD\n  A @{ shape: doc } ')).toBe(true);
  });

  it('detects the bare post-id form emitted by updateNodeShape', async () => {
    const { bodyContainsAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyContainsAtDirective(BODY_METADATA_CONTENT)).toBe(true);
  });

  it('does NOT detect an occurrence confined to frontmatter', async () => {
    const { bodyContainsAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyContainsAtDirective(FRONTMATTER_ONLY_CONTENT)).toBe(false);
  });

  it('does not detect a metadata-free flowchart', async () => {
    const { bodyContainsAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyContainsAtDirective(PLAIN_CONTENT)).toBe(false);
  });
});

describe('VisualEditorCanvas — D6 body-metadata read-only gate', () => {
  beforeEach(() => {
    // jsdom does not implement Pointer Capture API; polyfill as no-ops so the
    // production code's setPointerCapture/releasePointerCapture calls don't throw.
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn();
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn();
    }
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = vi.fn(() => false);
    }
    vi.clearAllMocks();
  });

  it('renders the raw svg with parseDiagram and the post-parse pipeline unreached', async () => {
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const { postProcessDiagramSvg } = await import('@/utils/svgPostProcessing');
    const { container } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={vi.fn()} />,
    );

    // renderDiagram is a separate path and still runs — the user sees the diagram.
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // The regex parser is NEVER invoked for body-metadata content...
    expect(vi.mocked(parseDiagram)).not.toHaveBeenCalled();
    // ...and the post-parse pipeline (whose second argument is the parse
    // result) is skipped with it.
    expect(vi.mocked(postProcessDiagramSvg)).not.toHaveBeenCalled();
  });

  it('read-only state: indicator present, edit affordances and selection overlays hidden', async () => {
    const { container } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // User-visible read-only indicator.
    expect(screen.getByTestId('visual-editor-readonly')).toBeInTheDocument();

    // Editing affordances are hidden: shape toolbar tools and the properties
    // panel (its edge-label input) must not be reachable.
    expect(container.querySelector('button[title="Select tool (V)"]')).not.toBeInTheDocument();
    expect(container.querySelector('input[placeholder="Edge label..."]')).not.toBeInTheDocument();

    // No selection overlays — nothing is clickable as a node.
    expect(container.querySelectorAll('.visual-node-overlay')).toHaveLength(0);
  });

  it('simulated edit interactions produce zero onChange calls', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    const canvasArea = container.querySelector('.preview-grid') as HTMLElement;

    // Keyboard: select/enter-connect shortcuts and delete — the mutating
    // callbacks behind all of them are fenced in read-only mode.
    fireEvent.keyDown(window, { key: 'v' });
    fireEvent.keyDown(window, { key: 'c' });
    fireEvent.pointerDown(canvasArea, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX: 50,
      clientY: 50,
      shiftKey: false,
    });
    fireEvent.keyDown(window, { key: 'Delete' });

    // Drop on canvas (shape insertion path).
    fireEvent.drop(canvasArea);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('open/close round-trip: onChange never fires and the fixture is pinned against drift', async () => {
    // WR-03: this test previously ended with `expect(original).toBe(
    // BODY_METADATA_CONTENT)` where `original` was assigned FROM
    // BODY_METADATA_CONTENT — a const compared to its own source constant can
    // never fail, so the "byte-identical round-trip" claim was unfalsifiable.
    // The fixture is now pinned against an INDEPENDENT literal typed here, so
    // any accidental mutation of the constant under test fails this test. The
    // round-trip guarantee itself rides on the zero-onChange assertion below:
    // this canvas holds no editable buffer of its own, and onChange is the
    // only channel through which the component can mutate diagram content.
    const FIXTURE_LITERAL =
      'flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc" }';
    expect(BODY_METADATA_CONTENT).toBe(FIXTURE_LITERAL);
    const onChange = vi.fn();
    const { container, unmount } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    unmount();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('anti-vacuous control: metadata-free flowchart still invokes parseDiagram exactly as before', async () => {
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={PLAIN_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // The gate is not always-on: the parser runs for ordinary content...
    expect(vi.mocked(parseDiagram)).toHaveBeenCalledWith(PLAIN_CONTENT);
    expect(vi.mocked(parseDiagram).mock.calls.length).toBeGreaterThanOrEqual(1);

    // ...and the editing surface is fully present (no read-only indicator).
    expect(screen.queryByTestId('visual-editor-readonly')).not.toBeInTheDocument();
    expect(container.querySelector('button[title="Select tool (V)"]')).toBeInTheDocument();
  });

  it('frontmatter control: frontmatter-only metadata parses normally (read-only NOT triggered)', async () => {
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={FRONTMATTER_ONLY_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    expect(vi.mocked(parseDiagram)).toHaveBeenCalledWith(FRONTMATTER_ONLY_CONTENT);
    expect(screen.queryByTestId('visual-editor-readonly')).not.toBeInTheDocument();
    expect(container.querySelector('button[title="Select tool (V)"]')).toBeInTheDocument();
  });
});
