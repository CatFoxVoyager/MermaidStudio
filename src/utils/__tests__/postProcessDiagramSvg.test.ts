import { describe, it, expect } from 'vitest';
import { renderDiagram } from '@/lib/mermaid/core';
import { parseDiagram } from '@/lib/mermaid/codeUtils';
import { fixDiagramLabels, postProcessDiagramSvg } from '../svgPostProcessing';

/**
 * Reproduction for PNG/SVG export artifacts:
 * The style panel persists `fill` / `fill-opacity` (edge label background) into
 * `linkStyle default`, but Mermaid misapplies that fill to the open edge paths.
 * Filled open paths render as large white polygons (visible with curve: stepAfter).
 * The preview neutralizes this via applyEdgeFontStyles; the export pipeline must
 * go through the same shared post-processing so preview and export match.
 */
const DIAGRAM_WITH_EDGE_FILL = `---
config:
  flowchart:
    curve: 'stepAfter'
---
graph LR
  A[Client Web] -->|Requêtes HTTPS 443| H((Hub))
  H -->|Redirection entrante| B[Reverse Proxy]
  H <-->|Authentification VPN| C[Serveur RADIUS]
linkStyle default stroke:#333333,stroke-width:2px,opacity:1,font-size:14px,fill:#ffffff,fill-opacity:1,color:#374151`;

/** Minimal flowchart-shaped fixture (structure Mermaid emits, no render needed). */
const FLOWCHART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" id="preview_test" width="200" height="100" viewBox="0 0 200 100">
  <defs><marker id="arrowhead0"><path d="M0,0 L10,5 L0,10"></path></marker></defs>
  <g class="edgePaths">
    <path id="L_A_B_0" class="flowchart-link LS-A LE-B" d="M10,50 C50,50 150,50 190,50" marker-end="url(#arrowhead0)" style="fill:#ffffff"></path>
  </g>
  <g class="edgeLabels">
    <g class="edgeLabel" data-id="0"><rect class="background" fill="#ffffff"></rect><text>link</text></g>
  </g>
  <g class="node" id="flowchart-A-1"><rect></rect><text>Client</text></g>
</svg>`;

/** Sequence-diagram-shaped fixture: message lines instead of flowchart paths. */
const SEQUENCE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" id="preview_seq" width="200" height="100" viewBox="0 0 200 100">
  <g><line class="messageLine0" x1="10" y1="20" x2="190" y2="20" stroke-width="2" style="fill:#ffffff"></line></g>
</svg>`;

const EMPTY_PARSED = { styles: new Map(), linkStyles: new Map(), edges: [] };

function parseDoc(svg: string): Document {
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

function getEdgePathFills(svg: string): Array<{ fillAttr: string | null; styleAttr: string }> {
  return Array.from(parseDoc(svg).querySelectorAll('.edgePaths path')).map(p => ({
    fillAttr: p.getAttribute('fill'),
    styleAttr: p.getAttribute('style') || '',
  }));
}

describe('postProcessDiagramSvg — static fixtures', () => {
  it('returns the input unchanged when the SVG cannot be parsed', () => {
    const garbage = 'this is not svg at all';
    expect(postProcessDiagramSvg(garbage, EMPTY_PARSED)).toBe(garbage);
  });

  it('handles a diagram without any linkStyle directive (final fill cleanup still runs)', () => {
    const doc = parseDoc(postProcessDiagramSvg(FLOWCHART_SVG, EMPTY_PARSED));
    expect(doc.querySelector('svg')).not.toBeNull();
    const paths = doc.querySelectorAll('.edgePaths path');
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach(p => expect(p.getAttribute('fill')).toBe('none'));
  });

  it('neutralizes fill on sequence-diagram message lines', () => {
    const doc = parseDoc(postProcessDiagramSvg(SEQUENCE_SVG, EMPTY_PARSED));
    const line = doc.querySelector('line.messageLine0');
    expect(line).not.toBeNull();
    expect(line!.getAttribute('fill')).toBe('none');
  });

  it('keeps hostile style values as inert attribute data (no script/img injection)', () => {
    const hostile = '" onerror="alert(1)"><img src=x><script>alert(1)</script>';
    const linkStyles = new Map([['default' as const, { stroke: hostile, fill: hostile }]]);
    const doc = parseDoc(postProcessDiagramSvg(FLOWCHART_SVG, { styles: new Map(), linkStyles, edges: [] }));

    // Values applied via setAttribute can never break out of attribute context
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelectorAll('[onerror]')).toHaveLength(0);
    // The hostile string is preserved as inert attribute DATA on the edge path
    const path = doc.querySelector('.edgePaths path');
    expect(path?.getAttribute('stroke')).toBe(hostile);
  });
});

describe('postProcessDiagramSvg — rendered diagrams', { timeout: 30000 }, () => {
  it('forces fill:none on edge paths when linkStyle default carries a fill', async () => {
    const { svg, error } = await renderDiagram(DIAGRAM_WITH_EDGE_FILL, 'test_export_edge_fill');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
    expect(svg).not.toBe('');

    const processed = postProcessDiagramSvg(svg, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    const fills = getEdgePathFills(processed);
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) {
      expect(f.fillAttr).toBe('none');
      expect(f.styleAttr).toContain('fill: none !important');
    }
  });

  it('leaves no active white fill after the shared pipeline (export parity with preview)', async () => {
    const { svg, error } = await renderDiagram(DIAGRAM_WITH_EDGE_FILL, 'test_export_edge_fill_parity');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }

    // Sanity check: mermaid DOES emit a fill on the edge paths before post-processing
    // (this is the source of the white wedges seen in exported PNGs).
    const rawFills = getEdgePathFills(fixDiagramLabels(svg));
    const hasActiveFill = rawFills.some(
      f => (f.fillAttr && f.fillAttr !== 'none') || /fill\s*:\s*(?!none)[^;]+/.test(f.styleAttr)
    );
    expect(hasActiveFill).toBe(true);

    const processed = postProcessDiagramSvg(svg, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    const fills = getEdgePathFills(processed);
    for (const f of fills) {
      expect(f.fillAttr).toBe('none');
    }
  });

  it('applies an indexed linkStyle stroke to the matching edge path', async () => {
    const code = `graph LR
  A[One] --> B[Two]
  A --> C[Three]
linkStyle 1 stroke:#ff0000,stroke-width:3px`;
    const { svg, error } = await renderDiagram(code, 'test_linkstyle_index');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }

    const processed = postProcessDiagramSvg(svg, parseDiagram(code));
    const doc = parseDoc(processed);
    const strokes = Array.from(doc.querySelectorAll('.edgePaths path')).map(p => p.getAttribute('stroke'));
    expect(strokes).toContain('#ff0000');
    doc.querySelectorAll('.edgePaths path').forEach(p => expect(p.getAttribute('fill')).toBe('none'));
  });
});

describe('postProcessDiagramSvg — v12 rendered parity, idempotency, invariants (PIPE-02)', { timeout: 30000 }, () => {
  // Why ONE function-level test covers every render/export surface: all five
  // pipeline consumers call this identical signature with identical arguments
  // on the same rendered svg — PreviewPanel.tsx:643 (live preview) and :1140
  // (clipboard copy), VisualEditorCanvas.tsx:99, FullscreenPreview.tsx:29,
  // ExportModal.tsx:127 (getSvgString → SVG/PNG/JPEG). Byte-equality of two
  // pipeline runs on the same input proves preview and export processing are
  // the same deterministic transform — whatever one surface shows, all five show.
  it('is deterministic: two pipeline runs on the same rendered svg produce exactly equal strings (preview/export parity)', async () => {
    const { svg, error } = await renderDiagram(DIAGRAM_WITH_EDGE_FILL, 'test_v12_parity');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
    expect(svg).not.toBe('');

    const first = postProcessDiagramSvg(svg, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    const second = postProcessDiagramSvg(svg, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    expect(first).not.toBe('');
    expect(second).toBe(first);
  });

  // Idempotency probe (flagged in Plan 22-01) — ANSWERED EMPIRICALLY
  // 2026-09-13 (temporary probe, deleted after the observation run): the
  // pipeline is NOT byte-idempotent under re-application. Each pass over
  // already-processed output appends exactly one whitespace character to each
  // styled edge path's style attribute (observed: +3 bytes per run on this
  // 3-edge fixture, unbounded across runs — root cause is the FINAL CLEANUP
  // strip+append not being separator-safe, combined with CSSOM
  // re-serialization per pass). The delta is whitespace-only — no attribute
  // value, structure, or count ever changes — and it is functionally inert
  // for the app: all five surfaces feed the pipeline RAW mermaid output
  // exactly once per render (PreviewPanel :643/:1140, VisualEditorCanvas :99,
  // FullscreenPreview :29, ExportModal :127), so the drift can never
  // accumulate at runtime. Recorded as a low-severity finding in
  // tests/goldens/README.md; fixing it is a conscious pipeline change owned
  // by the phase, outside this plan's proof-and-lock footprint. The
  // assertion below therefore locks what is operationally true and
  // protective: re-processing changes NOTHING but whitespace — value,
  // structure, and count mutations fail loudly, and a future
  // byte-idempotent pipeline stays green.
  it('is content-idempotent: re-processing already-processed output changes nothing but whitespace', async () => {
    const { svg, error } = await renderDiagram(DIAGRAM_WITH_EDGE_FILL, 'test_v12_idempotent');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
    expect(svg).not.toBe('');

    const once = postProcessDiagramSvg(svg, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    const twice = postProcessDiagramSvg(once, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    expect(once).not.toBe('');
    // Whitespace-insensitive equality (ALL whitespace stripped from both
    // sides): run 1's missing separator space and run 2's restored one must
    // compare equal, so collapsing whitespace RUNS is not enough. Known
    // blind spot (by design): the strip-all comparison also masks
    // whitespace-only changes inside text-node content — the observed drift
    // is attribute-internal whitespace and cannot be distinguished from it.
    // Value, structure, count, and non-whitespace text mutations all fail
    // loudly.
    expect(twice.replace(/\s+/g, '')).toBe(once.replace(/\s+/g, ''));
  });

  it('preserves the post-pipeline structural invariants (count-first: 3 edge paths, 3 edge labels, FINAL CLEANUP fill, enforced .root order)', async () => {
    const { svg, error } = await renderDiagram(DIAGRAM_WITH_EDGE_FILL, 'test_v12_invariants');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
    expect(svg).not.toBe('');

    const processed = postProcessDiagramSvg(svg, parseDiagram(DIAGRAM_WITH_EDGE_FILL));
    const doc = parseDoc(processed);

    // Count-first (D2): exact counts on BOTH sides of the 1:1 edge↔label
    // correlation the pipeline's edge map depends on — observed on mermaid
    // 12.0.0 (2026-09-13): 3 and 3 for this fixture. Asserting each number
    // explicitly (not just their equality) keeps a 0-match failing loudly.
    const pathCount = doc.querySelectorAll('.edgePaths path').length;
    const labels = doc.querySelector('g.edgeLabels');
    expect(labels).not.toBeNull();
    const labelCount = labels!.children.length;
    expect(pathCount).toBe(3);
    expect(labelCount).toBe(3);

    // FINAL CLEANUP contract (svgPostProcessing.ts:863-883): every edge path
    // carries the fill="none" attribute AND the important-flagged inline
    // fill:none declaration (the white-wedge export fix).
    const fills = getEdgePathFills(processed);
    expect(fills.length).toBe(3);
    for (const f of fills) {
      expect(f.fillAttr).toBe('none');
      expect(f.styleAttr).toContain('fill: none !important');
    }

    // Enforced .root child order (locked in structure-goldens.test.ts,
    // PIPE-02/D3): clusters first (never moved), then nodes, edgePaths,
    // edgeLabels — edge labels painted last, on top.
    const root = doc.querySelector('.root');
    expect(root).not.toBeNull();
    expect(root!.children.length).toBe(4);
    const classes = Array.from(root!.children).map(c => c.getAttribute('class') ?? '');
    expect(classes).toEqual(['clusters', 'nodes', 'edgePaths', 'edgeLabels']);
  });
});
