/**
 * DIA-04 / D6 lock — the visual-editor gate round trip (Phase 27 contract).
 *
 * The gate is a PARSE-COMPLETENESS predicate since 27-01: an at-brace line
 * the directive parser cannot fully consume opens the visual editor
 * READ-ONLY (parse short-circuited, badge shown, zero onChange), while
 * well-formed directive content is editable end-to-end — parsed, overlaid,
 * and mutable through the normal handlers.
 *   1. MALFORMED_METADATA_CONTENT (unclosed span): parseDiagram is NEVER
 *      invoked — the gate sits before the parse memo and short-circuits it;
 *   2. the raw sanitized svg still renders on the read-only path
 *      (renderDiagram is a separate path);
 *   3. open/close round-trips byte-identically — onChange never fires;
 *   4. BODY_METADATA_CONTENT (well-formed) is EDITABLE: the parser runs,
 *      overlays appear, and a mutating handler fires onChange;
 *   5. the gate is NOT always-on: metadata-free content parses exactly as
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

// ShapeToolbar resolves its labels through i18n (iter-9) — this file never
// mocked react-i18next before because the toolbar was hardcoded English.
vi.mock('react-i18next', async () => {
  // 38-05 (SHP-03): the toolbar derives its entries from shapes.ts and
  // resolves visual.shapes.<canonicalSlug>, so the legacy 27-key block is
  // gone. Derive the full 53-label surface from the registry + the REAL
  // en.json copy — the button titles these tests query are production labels.
  const { CANONICAL_SHAPES } = await import('@/lib/mermaid/shapes');
  const enMod = await import('../../../i18n/locales/en.json');
  const en = (enMod.default ?? enMod) as { visual: { shapes: Record<string, string> } };
  const shapeLabels: Record<string, string> = Object.fromEntries(
    CANONICAL_SHAPES.map((s) => [`visual.shapes.${s.shortName}`, en.visual.shapes[s.shortName] ?? s.shortName]),
  );
  return {
    useTranslation: () => ({
      t: (key: string, args?: Record<string, unknown>) => {
        const map: Record<string, string> = {
          'visual.selectTool': 'Select',
          'visual.selectToolHint': 'Select tool (V)',
          'visual.connectTool': 'Connect',
          'visual.connectToolHint': 'Connect tool (C) - click two nodes to connect',
          'visual.deleteSelected': 'Delete',
          'visual.shapesTitle': 'SHAPES',
          'visual.shapeAddHint': 'Add {{shape}} (tap to add, drag to canvas)',
          ...shapeLabels,
        };
        return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(args?.[k] ?? `{{${k}}}`));
      },
    }),
  };
});

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

// Well-formed directive content — the parser fully consumes it, so it is
// EDITABLE since the 27-01 narrowing.
const BODY_METADATA_CONTENT =
  'flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc" }';

// The residual fence: the same diagram with the final brace removed — an
// unclosed span the parser cannot consume. Carries the read-only UX tests.
const MALFORMED_METADATA_CONTENT =
  'flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc"';

// Metadata occurrence ONLY inside frontmatter (legitimate config — THM-03).
const FRONTMATTER_ONLY_CONTENT =
  '---\ntitle: Config diagram\nconfig:\n  metadata: "@{ view: collapsed }"\n---\nflowchart TD\n  A[Start] --> B[End]';

// 39-01 (ICON-01): a well-formed img:-bearing span — the params now parse
// TYPED and the write-back preserves them, so the span is EDITABLE (the
// 38-03 superset-safe fence is deliberately narrowed; the inverted pins
// below carry both directions).
const IMG_METADATA_CONTENT =
  'flowchart TD\n  A[Start] --> B\n  B@{ img: "data:image/png;base64,AAAA", label: "Pic" }';

// The residual img: fence: an UNTERMINATED img value — a span the parser
// cannot fully consume keeps the whole-document read-only behavior (T-39-01).
const IMG_MALFORMED_METADATA_CONTENT =
  'flowchart TD\n  A[Start] --> B\n  B@{ img: "data:image/png;base64,AAA';

describe('bodyHasUnparsedAtDirective — D6 parse-completeness helper (via codeUtils)', () => {
  it('keeps the space-separated form fenced (invalid mermaid 12.1.0)', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective('flowchart TD\n  A @{ shape: doc } ')).toBe(true);
  });

  it('keeps a malformed (unclosed) span fenced', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective(MALFORMED_METADATA_CONTENT)).toBe(true);
  });

  // 39-01 (ICON-01): the deliberate narrowing of the 38-03 img: fence — a
  // well-formed img span parses TYPED so it is editable now; the fence
  // fires on the malformed img value below (the 38-03 pins asserted the
  // exact inverse).
  it('opens a well-formed img:-bearing span (typed parse; write-back preserves it)', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective(IMG_METADATA_CONTENT)).toBe(false);
  });

  it('still fences an unterminated img value (malformed span)', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective(IMG_MALFORMED_METADATA_CONTENT)).toBe(true);
  });

  it('control: the same span without img stays editable (fence only widened for img)', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective('flowchart TD\n  A[Start] --> B\n  B@{ shape: "rect", label: "Pic" }')).toBe(false);
  });

  it('lets the well-formed bare post-id form through (editable since 27-01)', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective(BODY_METADATA_CONTENT)).toBe(false);
  });

  it('does NOT fence an occurrence confined to frontmatter', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective(FRONTMATTER_ONLY_CONTENT)).toBe(false);
  });

  it('does not fence a metadata-free flowchart', async () => {
    const { bodyHasUnparsedAtDirective } = await import('@/lib/mermaid/codeUtils');
    expect(bodyHasUnparsedAtDirective(PLAIN_CONTENT)).toBe(false);
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
      <VisualEditorCanvas content={MALFORMED_METADATA_CONTENT} theme="light" onChange={vi.fn()} />,
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
      <VisualEditorCanvas content={MALFORMED_METADATA_CONTENT} theme="light" onChange={vi.fn()} />,
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
      <VisualEditorCanvas content={MALFORMED_METADATA_CONTENT} theme="light" onChange={onChange} />,
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
    // MALFORMED_METADATA_CONTENT)` where `original` was assigned FROM
    // MALFORMED_METADATA_CONTENT — a const compared to its own source constant can
    // never fail, so the "byte-identical round-trip" claim was unfalsifiable.
    // The fixture is now pinned against an INDEPENDENT literal typed here, so
    // any accidental mutation of the constant under test fails this test. The
    // round-trip guarantee itself rides on the zero-onChange assertion below:
    // this canvas holds no editable buffer of its own, and onChange is the
    // only channel through which the component can mutate diagram content.
    const FIXTURE_LITERAL =
      'flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc"';
    expect(MALFORMED_METADATA_CONTENT).toBe(FIXTURE_LITERAL);
    const onChange = vi.fn();
    const { container, unmount } = render(
      <VisualEditorCanvas content={MALFORMED_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    unmount();

    expect(onChange).not.toHaveBeenCalled();
  });

  // ===== Phase 27 (27-01): the editable side of the narrowed gate —
  // well-formed directive content parses, overlays, and mutates. =====

  it('well-formed directive content is EDITABLE: parser runs, overlays present, no badge', async () => {
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const { postProcessDiagramSvg } = await import('@/utils/svgPostProcessing');
    const { container } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // The parser runs (no short-circuit) and the full post-parse pipeline
    // follows it — the exact inverse of the read-only assertions above. The
    // render is debounced (300ms), so the pipeline assertions wait for it.
    expect(vi.mocked(parseDiagram)).toHaveBeenCalledWith(BODY_METADATA_CONTENT);
    await waitFor(() => {
      expect(vi.mocked(postProcessDiagramSvg)).toHaveBeenCalled();
    });

    // No read-only indicator; the editing surface is fully present.
    expect(screen.queryByTestId('visual-editor-readonly')).not.toBeInTheDocument();
    expect(container.querySelector('button[title="Select tool (V)"]')).toBeInTheDocument();

    // Node overlays exist — the directive node is clickable like any other
    // (overlays are extracted 80ms after the svg lands).
    await waitFor(() => {
      expect(container.querySelectorAll('.visual-node-overlay').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('well-formed directive content allows a mutating handler: shape add fires onChange', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    const boxButton = container.querySelector('button[title="Add Rectangle (tap to add, drag to canvas)"]');
    expect(boxButton).toBeInTheDocument();
    fireEvent.click(boxButton!);

    // The mutation went through: a node was added and the directive line
    // itself survived untouched.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContain('node1[New Node]');
    expect(onChange.mock.calls[0][0]).toContain('B@{ shape: "doc", label: "Doc" }');
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

  // ===== 39-01 (ICON-01): the img: fence narrows — a well-formed img span
  // opens EDITABLE (typed parse, write-back preserves it), the malformed
  // img span keeps the exact 38-03 read-only UX (pill, parse short-circuit,
  // Surface 4 copy unchanged). =====

  it('well-formed img:-bearing span is EDITABLE: parser runs, no pill', async () => {
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const { postProcessDiagramSvg } = await import('@/utils/svgPostProcessing');
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={IMG_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // The parse runs (no short-circuit) and the post-parse pipeline follows —
    // the exact inverse of the read-only assertions below.
    expect(vi.mocked(parseDiagram)).toHaveBeenCalledWith(IMG_METADATA_CONTENT);
    await waitFor(() => {
      expect(vi.mocked(postProcessDiagramSvg)).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('visual-editor-readonly')).not.toBeInTheDocument();
    expect(container.querySelector('button[title="Select tool (V)"]')).toBeInTheDocument();
    // The node overlay exists — the img node is selectable like any other.
    await waitFor(() => {
      expect(container.querySelectorAll('.visual-node-overlay').length).toBeGreaterThanOrEqual(1);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('malformed img:-bearing span opens the editor read-only (pill present, parse short-circuited)', async () => {
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={IMG_MALFORMED_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    // The same D6 read-only UX as any malformed span — pill visible...
    expect(screen.getByTestId('visual-editor-readonly')).toBeInTheDocument();
    // ...the parse memo short-circuits (gate sits before the parse)...
    expect(vi.mocked(parseDiagram)).not.toHaveBeenCalled();
    // ...and no mutation can fire.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('control: a plain shape span stays editable (no pill) beside the img: fixture', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <VisualEditorCanvas content={BODY_METADATA_CONTENT} theme="light" onChange={onChange} />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('visual-editor-readonly')).not.toBeInTheDocument();
    expect(container.querySelector('button[title="Select tool (V)"]')).toBeInTheDocument();
  });
});
