// v11 structural goldens (PIPE-01) — captured against mermaid 11.17.2 on 2026-09-12,
// Phase 21 (Upgrade & Compatibility), BEFORE the mermaid 12 dependency flip (Plan 21-02).
//
// This suite re-runs as the regression gate after the v12 flip: every recorded
// assertion below encodes the v11 structural contract, observed from real
// renders in jsdom (values recorded from the ACTUAL v11 run — see
// tests/goldens/README.md for the full observed-selector table).
//
// NEVER weaken or loosen a recorded assertion to make a future mermaid version
// pass: a 0-match IS the failure signal — the finding gets surfaced and Phase 22
// owns any pipeline selector fix, never an edited baseline.
//
// Phase 22 (PIPE-02) extension: a dedicated describe block below ADDS .root
// order locks (the natural v12 order pre-pipeline, the pipeline-enforced order
// post-pipeline). No recorded v11 assertion above was edited — the locks sit
// alongside them.
//
// Suite-level rules:
// - Structural assertions ONLY: selector counts, id patterns, correlation
//   invariants, marker resolution, group presence. No whole-SVG snapshot
//   mechanism, no assertions on path data, translate coordinates, or style
//   values (coordinates legitimately shift in v12 — Phase 22 re-baselines).
// - describe timeout 30000: each real render costs seconds.
import { describe, it, expect } from 'vitest';
import { renderDiagram } from '../core';
import { parseDiagram } from '../codeUtils';
import { postProcessDiagramSvg } from '@/utils/svgPostProcessing';

const FLOWCHART = `flowchart TD
  A[Start] -->|yes| B{Check}
  B -->|ok| C[End]
  B -->|fix| A
linkStyle default stroke:#333333,fill:#ffffff,fill-opacity:1`;

const SEQUENCE = `sequenceDiagram
  participant A as Client
  participant B as Server
  A->>B: Request
  B-->>A: Response`;

/**
 * Render through the app's single mermaid entrypoint and parse the raw
 * post-sanitize output (PRE-postProcessDiagramSvg — that is the mermaid-emitted
 * contract; the pipeline reorders .root children, so it must not run first).
 * getBBox errors are a jsdom text-metrics limitation, not a diagram error
 * (existing pattern from subgraph-render.test.ts).
 */
async function renderFixture(source: string, id: string): Promise<Document> {
  const { svg, error } = await renderDiagram(source, id);
  if (error && !error.includes('getBBox')) {
    throw new Error(`Unexpected render error: ${error}`);
  }
  expect(svg).not.toBe('');
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

describe('v11 structural goldens — flowchart (PIPE-01)', { timeout: 30000 }, () => {
  it('emits exactly one flowchart-link path per fixture edge (observed v11.17.2: 3)', async () => {
    const doc = await renderFixture(FLOWCHART, 'golden_flow');
    // v11.17.2 observed: 3 (the fixture declares exactly 3 edges).
    // 0 matches on a dependency change = structural contract broken.
    expect(doc.querySelectorAll('.edgePaths path.flowchart-link').length).toBe(3);
  });

  it('correlates g.edgeLabels children 1:1 with edge paths (observed v11.17.2: 3 g.edgeLabel)', async () => {
    const doc = await renderFixture(FLOWCHART, 'golden_flow_labels');
    const edgePathCount = doc.querySelectorAll('.edgePaths path').length;
    const labels = doc.querySelector('g.edgeLabels');
    expect(labels).not.toBeNull();
    // 1:1 correlation invariant the pipeline's label indexing depends on
    // (svgPostProcessing.ts buildSvgToParsedEdgeMap / applyEdgeFontStyles).
    // Observed child element: g.edgeLabel (recorded in tests/goldens/README.md).
    expect(labels!.children.length).toBe(edgePathCount);
  });

  it('gives every .node a flowchart-{ID}-{N} id (pipeline regex, svgPostProcessing.ts:526)', async () => {
    const doc = await renderFixture(FLOWCHART, 'golden_flow_nodes');
    const ids = Array.from(doc.querySelectorAll('.node')).map(n => n.getAttribute('id') ?? '');
    // v11.17.2 observed: 3 nodes, ids golden_flow-flowchart-A-0 / -B-1 / -C-3.
    expect(ids.length).toBe(3);
    ids.forEach(id => expect(id).toMatch(/flowchart-[A-Za-z0-9_-]+-\d+$/));
  });

  it('resolves every edge-path marker-end to an existing marker (observed v11 family: pointEnd)', async () => {
    const doc = await renderFixture(FLOWCHART, 'golden_flow_markers');
    const markerIds = Array.from(doc.querySelectorAll('marker')).map(m => m.id);
    expect(markerIds.length).toBeGreaterThan(0);
    doc.querySelectorAll('.edgePaths path').forEach(p => {
      const ref = p.getAttribute('marker-end')?.match(/url\(#([^)]+)\)/)?.[1];
      expect(ref).toBeDefined();
      expect(markerIds).toContain(ref!);
      // Observed v11.17.2 marker-id family for flowchart edges: the point
      // marker family (…flowchart-v2-pointEnd / -pointStart, plus -margin and
      // per-stroke clones …pointEnd__333333). See tests/goldens/README.md.
      expect(ref!).toContain('pointEnd');
    });
  });

  it('exposes the .root groups the pipeline reorder depends on (order NOT asserted)', async () => {
    const doc = await renderFixture(FLOWCHART, 'golden_flow_root');
    const root = doc.querySelector('.root');
    expect(root).not.toBeNull();
    // The reorder at svgPostProcessing.ts:411-420 filters root children by the
    // class names below. Observed v11 order: g.clusters, g.edgePaths,
    // g.edgeLabels, g.nodes — recorded in the README, deliberately NOT asserted
    // (the pipeline exists to reorder).
    const classes = Array.from(root!.children).map(c => c.getAttribute('class') ?? '');
    expect(classes).toContain('nodes');
    expect(classes.some(c => c === 'edgePaths' || c === 'edges')).toBe(true);
    expect(classes).toContain('edgeLabels');
  });

  // rect.background probe (first-choice selector of the pipeline's edge-label
  // fallback chain, svgPostProcessing.ts:715): observed 0 under v11.17.2 in
  // this fixture (linkStyle default with a fill — the styled-edge-label case)
  // AND in the sequence fixture. With the app's htmlLabels:true config, mermaid
  // emits foreignObject edge labels and NO label rects. Per the capture
  // provenance (tests/goldens/README.md) the family is documented as
  // not-emitted-under-v11 and deliberately NOT asserted as a 0 count — a
  // future version starting to emit it is benign for the pipeline (its first
  // selector starts matching) and must not false-fail this gate. Flagged for
  // Phase 22.
});

describe('v11 structural goldens — sequence (PIPE-01)', { timeout: 30000 }, () => {
  it('emits exactly one messageLine0 (solid) and one messageLine1 (dashed) per message pair (observed v11.17.2)', async () => {
    const doc = await renderFixture(SEQUENCE, 'golden_seq');
    // v11.17.2 observed: 1 each — the solid and the dashed message. The
    // pipeline's color-sync loop at svgPostProcessing.ts:460 iterates these
    // classes (selector '.edgePaths path, .messageLine0, .messageLine1,
    // .messageLine').
    expect(doc.querySelectorAll('.messageLine0').length).toBe(1);
    expect(doc.querySelectorAll('.messageLine1').length).toBe(1);
  });

  it('resolves every messageLine marker-end to an existing marker (observed v11 family: arrowhead)', async () => {
    const doc = await renderFixture(SEQUENCE, 'golden_seq_markers');
    const markerIds = Array.from(doc.querySelectorAll('marker')).map(m => m.id);
    expect(markerIds.length).toBeGreaterThan(0);
    doc.querySelectorAll('.messageLine0, .messageLine1, .messageLine').forEach(line => {
      const ref = line.getAttribute('marker-end')?.match(/url\(#([^)]+)\)/)?.[1];
      expect(ref).toBeDefined();
      expect(markerIds).toContain(ref!);
      // Observed v11.17.2 marker-id family for sequence messages: the
      // arrowhead family ({safeId}-arrowhead; defs also carry -crosshead,
      // -filled-head, -sequencenumber and solid/stick arrowheads — all
      // recorded in tests/goldens/README.md). Referenced family: arrowhead.
      expect(ref!).toContain('arrowhead');
    });
  });

  it('emits one .messageText per message (observed v11.17.2: 2)', async () => {
    const doc = await renderFixture(SEQUENCE, 'golden_seq_texts');
    // v11.17.2 observed: 2 (one per message: Request, Response).
    expect(doc.querySelectorAll('.messageText').length).toBe(2);
  });

  // rect.background probe (carried over from the flowchart fixture per the
  // Task 1 capture protocol): observed 0 under v11.17.2 for sequence output
  // too. The family is documented in tests/goldens/README.md as
  // not-emitted-under-v11 and is deliberately NOT asserted as a 0 count —
  // finding flagged for Phase 22.
});

// Cosmetic v12 delta (observed on mermaid 12.0.0, 2026-09-13): edge paths carry
// the thickness/pattern class prefix DOUBLED — "edge-thickness-normal
// edge-pattern-solid edge-thickness-normal edge-pattern-solid flowchart-link …".
// Every pipeline selector (path.flowchart-link, .edgePaths path) still matches;
// the prefix is deliberately NOT asserted anywhere in this suite — asserting
// cosmetics manufactures false failures the moment upstream removes the
// duplication. Recorded in tests/goldens/README.md (v12 re-run outcome).
describe('v12 .root order lock — natural vs pipeline-enforced (PIPE-02 / D3)', { timeout: 30000 }, () => {
  it('locks the natural v12 .root child order on raw output (observed 12.0.0: clusters, edgePaths, edgeLabels, nodes)', async () => {
    const doc = await renderFixture(FLOWCHART, 'golden_flow_root_order');
    const root = doc.querySelector('.root');
    // Count-first guard (D2): the four groups the pipeline reorder filters on
    // must all be present — and be ALL the children — before any order
    // assertion. A 0-match or an extra group fails loudly here instead of
    // letting the sequence assertion pass silently on wrong premises.
    expect(root).not.toBeNull();
    expect(root!.children.length).toBe(4);
    const classes = Array.from(root!.children).map(c => c.getAttribute('class') ?? '');
    // Observed on mermaid 12.0.0 (2026-09-13): identical to the v11 recorded
    // order (tests/goldens/README.md observed-selector table). This is the
    // order the pipeline reorder at svgPostProcessing.ts:409-422 exists to
    // change — locking it here proves the reorder still has real work to do
    // on v12 (no dead code).
    expect(classes).toEqual(['clusters', 'edgePaths', 'edgeLabels', 'nodes']);
  });

  it('locks the pipeline-enforced .root child order post-pipeline (clusters, nodes, edgePaths, edgeLabels — labels painted last)', async () => {
    // Raw render first (same getBBox swallow as renderFixture) — the raw svg
    // string is kept so the pipeline receives exactly what real callers pass.
    const { svg, error } = await renderDiagram(FLOWCHART, 'golden_flow_root_order_pipeline');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
    expect(svg).not.toBe('');

    const processed = postProcessDiagramSvg(svg, parseDiagram(FLOWCHART));
    const doc = new DOMParser().parseFromString(processed, 'image/svg+xml');
    const root = doc.querySelector('.root');
    // Count-first guard (D2): the reorder must not lose or add .root children.
    expect(root).not.toBeNull();
    expect(root!.children.length).toBe(4);
    const classes = Array.from(root!.children).map(c => c.getAttribute('class') ?? '');
    // svgPostProcessing.ts:409-422 re-appends nodes, then edgePaths, then
    // edgeLabels; clusters are never moved and stay first. Edge labels end up
    // painted LAST (on top of the paths) — the enforced order differs from the
    // natural order locked above, proving the reorder does real work on v12.
    expect(classes).toEqual(['clusters', 'nodes', 'edgePaths', 'edgeLabels']);
  });
});
