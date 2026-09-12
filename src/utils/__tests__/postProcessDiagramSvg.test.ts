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
