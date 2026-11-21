import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixDiagramLabels, applyEdgeFontStyles, applyNodeFontStyles } from '../svgPostProcessing';

// Mock DOMParser and XMLSerializer for the test environment
// Vitest uses jsdom which already provides these
describe('svgPostProcessing', () => {
  describe('fixDiagramLabels', () => {
    it('should center node labels by removing transform and setting x/y/text-anchor', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart">
        <g class="node" id="node1">
          <rect width="100" height="50" x="0" y="0"/>
          <g class="label" transform="translate(10, 10)">
            <text><tspan>Node Label</tspan></text>
          </g>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const result = fixDiagramLabels(svgString);

      expect(result).toContain('text-anchor="middle"');
      expect(result).toContain('dominant-baseline="central"');
      // Should have removed transform from label group
      expect(result).not.toContain('transform="translate(10, 10)"');
    });

    it('should NOT center labels if it is not a flowchart', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="sequence">
        <g class="node">
          <text>Something</text>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const result = fixDiagramLabels(svgString);
      expect(result).toBe(svgString);
    });

    it('should handle Sankey diagrams by adding gradients', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="sankey">
        <path stroke="url(#linearGradient-1)"/>
      </svg>`.replace(/>\s+</g, '><');

      const result = fixDiagramLabels(svgString);
      expect(result).toContain('<defs>');
      expect(result).toContain('<linearGradient id="linearGradient-1"');
    });

    it('should render edgeLabels on top of edgePaths for visibility with opaque backgrounds', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart">
        <g class="root">
          <g class="edgePaths"><g class="edgePath">Edge</g></g>
          <g class="edgeLabels"><g class="edgeLabel">Label</g></g>
          <g class="nodes"><g class="node">Node</g></g>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const result = fixDiagramLabels(svgString);

      // edgeLabels must appear AFTER edgePaths (so edgeLabels are rendered on top)
      const labelsIndex = result.indexOf('g class="edgeLabels"');
      const pathsIndex = result.indexOf('g class="edgePaths"');
      expect(labelsIndex).toBeGreaterThan(-1);
      expect(pathsIndex).toBeGreaterThan(-1);
      // In SVG, later elements are rendered on top
      expect(labelsIndex).toBeGreaterThan(pathsIndex);
    });

    it('should scale markers to use strokeWidth units for proportional arrowhead sizing', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart">
        <defs>
          <marker id="arrowhead-pointEnd" class="marker" viewBox="0 0 10 10" refX="6" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" class="arrowMarkerPath" style="stroke-width: 1; stroke-dasharray: 1,0"/>
          </marker>
        </defs>
        <g class="root">
          <g class="edgePaths"><g class="edgePath">E</g></g>
          <g class="nodes"><g class="node">N</g></g>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const result = fixDiagramLabels(svgString);
      expect(result).toContain('markerUnits="strokeWidth"');
      expect(result).toContain('markerWidth="6"');
      expect(result).toContain('markerHeight="6"');
      expect(result).toContain('overflow="visible"');
    });

    it('should preserve <defs> and <marker> elements', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart">
        <defs>
          <marker id="arrowhead"><path d="M0 0 L10 5 L0 10 z"/></marker>
          <style>.node rect { fill: red; }</style>
        </defs>
        <g class="root">
          <g class="nodes">Nodes</g>
          <g class="edgePaths">Edges</g>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const result = fixDiagramLabels(svgString);

      expect(result).toContain('id="arrowhead"');
      expect(result).toContain('overflow="visible"');
      expect(result).toContain('fill: red');
    });
  });

  describe('applyEdgeFontStyles', () => {
    it('should return unchanged SVG if no font styles', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="edgeLabels"><g><text>L1</text></g></g>
        <g class="edgePaths"><path class="flowchart-link"/></g>
      </svg>`.replace(/>\s+</g, '><');

      const result = applyEdgeFontStyles(svgString, new Map());
      // It won't be EXACTLY identical because of final cleanup removing fill
      expect(result).toContain('fill="none"');
    });

    it('should apply font-size to the correct edge label using positional fallback', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="edgeLabels">
          <g class="edgeLabel"><text>L1</text></g>
          <g class="edgeLabel"><text>L2</text></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link"/>
          <path class="flowchart-link"/>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const styles = new Map();
      styles.set(1, { fontSize: '20px' });

      const result = applyEdgeFontStyles(svgString, styles);
      expect(result).toContain('font-size="20px">L2');
      expect(result).not.toContain('font-size="20px">L1');
    });

    it('should apply font-weight to the correct edge label', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="edgeLabels">
          <g class="edgeLabel"><text>L1</text></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link"/>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const styles = new Map();
      styles.set(0, { fontWeight: 'bold' });

      const result = applyEdgeFontStyles(svgString, styles);
      expect(result).toContain('font-weight="bold"');
    });

    it('should use geometric matching to map edges when parsedEdges is provided', () => {
      // SVG with edges in specific order
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="nodes">
          <g class="node" id="A" transform="translate(0,0)"><rect width="10" height="10"/></g>
          <g class="node" id="B" transform="translate(100,0)"><rect width="10" height="10"/></g>
        </g>
        <g class="edgeLabels">
          <g class="edgeLabel"><text>Edge 1</text></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link" d="M 5 5 L 95 5"/>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const parsedEdges = [{ source: 'A', target: 'B', label: 'Edge 1' }];
      const styles = new Map();
      styles.set(0, { stroke: '#ff0000' });

      const result = applyEdgeFontStyles(svgString, styles, parsedEdges);
      expect(result).toContain('stroke="#ff0000"');
    });

    it('should not apply styles to wrong labels when edges are reordered', () => {
      // Mock SVG where visual order (edgePaths) doesn't match logical order
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="nodes">
          <g class="node" id="A" transform="translate(0,0)"><rect/></g>
          <g class="node" id="B" transform="translate(100,0)"><rect/></g>
          <g class="node" id="C" transform="translate(0,100)"><rect/></g>
        </g>
        <g class="edgeLabels">
          <g class="edgeLabel"><text>A-C</text></g>
          <g class="edgeLabel"><text>A-B</text></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link" d="M 0 5 L 0 95"/>
          <path class="flowchart-link" d="M 5 0 L 95 0"/>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const parsedEdges = [
        { source: 'A', target: 'B', label: 'A-B' }, // Index 0
        { source: 'A', target: 'C', label: 'A-C' }  // Index 1
      ];

      const styles = new Map();
      styles.set(0, { fontSize: '20px' }); // Style A-B

      const result = applyEdgeFontStyles(svgString, styles, parsedEdges);
      // Geometric matching should find that SVG edge 1 (A-B) matches parsed edge 0
      expect(result).toContain('font-size="20px">A-B');
      expect(result).not.toContain('font-size="20px">A-C');
    });

    it('should use label text to disambiguate edges sharing a node', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="nodes">
          <g class="node" id="A" transform="translate(0,0)"><rect/></g>
          <g class="node" id="B" transform="translate(100,0)"><rect/></g>
        </g>
        <g class="edgeLabels">
          <g class="edgeLabel"><text>Label X</text></g>
          <g class="edgeLabel"><text>Label Y</text></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link" d="M 5 5 L 95 5"/>
          <path class="flowchart-link" d="M 5 5 L 95 5"/>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const parsedEdges = [
        { source: 'A', target: 'B', label: 'Label X' }, // Index 0
        { source: 'A', target: 'B', label: 'Label Y' }  // Index 1
      ];

      const styles = new Map();
      styles.set(1, { stroke: '#00ff00' }); // Style Label Y

      const result = applyEdgeFontStyles(svgString, styles, parsedEdges);
      // Should match by text content even if geometry is identical
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, 'image/svg+xml');
      const paths = doc.querySelectorAll('.edgePaths path');
      const labels = doc.querySelectorAll('.edgeLabel text');

      // Find path with green stroke
      let styledPathIdx = -1;
      paths.forEach((p, i) => {
        if (p.getAttribute('stroke') === '#00ff00') styledPathIdx = i;
      });

      expect(styledPathIdx).toBe(1);
      expect(labels[styledPathIdx].textContent).toBe('Label Y');
    });

    it('should enforce one-to-one mapping so no two SVG edges map to same parsed edge', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="nodes">
          <g class="node" id="A" transform="translate(0,0)"><rect/></g>
          <g class="node" id="B" transform="translate(100,0)"><rect/></g>
        </g>
        <g class="edgeLabels">
          <g class="edgeLabel"><text>Same</text></g>
          <g class="edgeLabel"><text>Same</text></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link" d="M 5 5 L 95 5"/>
          <path class="flowchart-link" d="M 5 5 L 95 5"/>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const parsedEdges = [
        { source: 'A', target: 'B', label: 'Same' },
        { source: 'A', target: 'B', label: 'Same' }
      ];

      const styles = new Map();
      styles.set(0, { stroke: '#ff0000' });
      styles.set(1, { stroke: '#0000ff' });

      const result = applyEdgeFontStyles(svgString, styles, parsedEdges);
      expect(result).toContain('stroke="#ff0000"');
      expect(result).toContain('stroke="#0000ff"');
    });
  });

  describe('applyNodeFontStyles', () => {
    it('should apply styles to nodes by ID', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="node" id="node-A-1"><text>A</text></g>
        <g class="node" id="node-B-2"><text>B</text></g>
      </svg>`.replace(/>\s+</g, '><');

      const styles = new Map();
      styles.set('node-A-1', { fontSize: '20px', fontWeight: 'bold', color: '#ff0000' });

      const result = applyNodeFontStyles(svgString, styles);
      expect(result).toContain('font-size="20px"');
      expect(result).toContain('font-weight="bold"');
      expect(result).toContain('fill="#ff0000"');
      expect(result).toContain('>A<');
      expect(result).not.toContain('font-size="20px">B');
    });

    it('should support simple ID matching for flowchart nodes', () => {
      // Mermaid often generates IDs like "flowchart-A-123"
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="node" id="my-flowchart-A-123"><text>A</text></g>
      </svg>`.replace(/>\s+</g, '><');

      const styles = new Map();
      styles.set('A', { fontSize: '20px' });

      const result = applyNodeFontStyles(svgString, styles);
      expect(result).toContain('font-size="20px"');
    });

    it('should style foreignObject content for Mermaid 11+', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="node" id="A">
          <foreignObject>
            <div style="color: black;">A Label</div>
          </foreignObject>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const styles = new Map();
      styles.set('A', { color: '#00ff00' });

      const result = applyNodeFontStyles(svgString, styles);
      expect(result).toContain('color: rgb(0, 255, 0)'); // JSDOM might convert hex to rgb in style
    });
  });

  describe('Mermaid 12 foreignObject labels, comma paths, wide nodes, and pointEnd markers', () => {
    it('maps linkStyle 0 to labeled edge 0 (not stolen by later unlabeled edges) on htmlLabels + comma paths + wide nodes', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="p_flowchart-v2-pointEnd"><path d="M0,0 L10,5 L0,10 z"/></marker>
        </defs>
        <g class="root">
          <g class="nodes">
            <g class="node" id="p-flowchart-DIST1-0" transform="translate(500,100)"><rect x="-100" y="-20" width="200" height="40"/></g>
            <g class="node" id="p-flowchart-RMS1-1" transform="translate(100,300)"><rect x="-40" y="-20" width="80" height="40"/></g>
            <g class="node" id="p-flowchart-FMON-2" transform="translate(800,100)"><rect x="-40" y="-20" width="80" height="40"/></g>
            <g class="node" id="p-flowchart-FW-3" transform="translate(800,300)"><rect x="-40" y="-20" width="80" height="40"/></g>
          </g>
          <g class="edgePaths">
            <path id="p-L_DIST1_RMS1_0" class="flowchart-link" d="M400,100L100,280" marker-end="url(#p_flowchart-v2-pointEnd)" style="stroke:#bbbbbb"/>
            <path id="p-L_FMON_FW_0" class="flowchart-link" d="M800,120L800,280" marker-end="url(#p_flowchart-v2-pointEnd)" style="stroke:#bbbbbb"/>
          </g>
          <g class="edgeLabels">
            <g class="edgeLabel"><g class="label" data-id="L_DIST1_RMS1_0"><foreignObject width="100" height="24"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg"><span><p>D01 : 44 / RMS_01 : 25</p></span></div></foreignObject></g></g>
            <g class="edgeLabel"><g class="label" data-id="L_FMON_FW_0"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg"><span></span></div></foreignObject></g></g>
          </g>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      const parsedEdges = [
        { source: 'DIST1', target: 'RMS1', label: '"D01 : 44 / RMS_01 : 25"' },
        { source: 'FMON', target: 'FW', label: '' },
      ];
      const styles = new Map<number | 'default', { stroke?: string; color?: string; strokeWidth?: string }>([
        ['default', { stroke: '#bbbbbb', color: '#dddddd', strokeWidth: '1px' }],
        [0, { stroke: '#959595', color: '#c99732', strokeWidth: '1.8px' }],
      ]);

      const result = applyEdgeFontStyles(svgString, styles, parsedEdges);
      const doc = new DOMParser().parseFromString(result, 'image/svg+xml');
      const paths = doc.querySelectorAll('.edgePaths path');
      expect(paths[0].getAttribute('stroke')).toBe('#959595');
      expect(paths[0].getAttribute('stroke-width')).toBe('1.8px');
      expect(paths[0].getAttribute('marker-end')).toBe('url(#p_flowchart-v2-pointEnd-959595)');
      expect(paths[1].getAttribute('stroke')).toBe('#bbbbbb');
      expect(paths[1].getAttribute('marker-end')).toBe('url(#p_flowchart-v2-pointEnd-bbbbbb)');

      // Final cleanup must insert a semicolon before fill: none !important
      expect(paths[1].getAttribute('style')).toContain('; fill: none !important;');

      // Label text color must follow linkStyle color on foreignObject spans
      const firstLabelSpan = doc.querySelectorAll('.edgeLabel span')[0] as HTMLElement;
      expect(firstLabelSpan.style.color).toBe('rgb(201, 151, 50)');

      // Idempotency: running twice must not double-suffix marker IDs
      const second = applyEdgeFontStyles(result, styles, parsedEdges);
      const doc2 = new DOMParser().parseFromString(second, 'image/svg+xml');
      expect(doc2.querySelectorAll('.edgePaths path')[0].getAttribute('marker-end')).toBe(
        'url(#p_flowchart-v2-pointEnd-959595)'
      );
    });
  });
});

// ===== 39-04 (ICON-03, UI-SPEC Surface 4, preserved invariant): the
// label-fix loop must cover mermaid 12.3's special-shape groups exactly like
// rect nodes — no skip, no double-process. Measured live DOM (39-04 probe):
// img/icon nodes emit <g class="image-shape default"> / <g class="icon-shape
// default"> carrying NO `node` class, so the plain .node query skipped them;
// the widened query also stays single-visit (querySelectorAll dedupes
// elements matching several alternatives).
describe('39-04 special-shape label parity', () => {
  /** One rect + one image-shape + one icon-shape node, SVG-text labels (the
   * htmlLabels:false form the loop actually transforms). */
  const MEDIA_FIXTURE = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart">
    <g class="node default" id="flowchart-A-1">
      <rect width="100" height="50" x="0" y="0"/>
      <g class="label" transform="translate(10, 10)"><text><tspan>Rect</tspan></text></g>
    </g>
    <g class="image-shape default" id="flowchart-I-2">
      <rect width="100" height="50" x="0" y="0"/>
      <image />
      <g class="label" transform="translate(12, 14)"><text><tspan>Photo</tspan></text></g>
    </g>
    <g class="icon-shape default" id="flowchart-N-3">
      <rect width="100" height="50" x="0" y="0"/>
      <path />
      <g class="label" transform="translate(14, 16)"><text><tspan>IconNode</tspan></text></g>
    </g>
  </svg>`.replace(/>\s+</g, '><');

  it('the label-fix loop transforms .image-shape and .icon-shape labels exactly like the rect node', () => {
    const result = fixDiagramLabels(MEDIA_FIXTURE);

    // The rect node keeps its pre-existing transform...
    expect(result).toContain('text-anchor="middle"');
    // ...and the special-shape label groups lost their offsets the same way
    // (the loop entered them — no skip).
    expect(result).not.toContain('transform="translate(10, 10)"');
    expect(result).not.toContain('transform="translate(12, 14)"');
    expect(result).not.toContain('transform="translate(14, 16)"');
    // All three label texts survive.
    expect(result).toContain('Rect');
    expect(result).toContain('Photo');
    expect(result).toContain('IconNode');
    // The special-shape groups themselves survive (no structural damage).
    expect(result).toContain('image-shape');
    expect(result).toContain('icon-shape');
  });

  it('no double-process: a second run is attribute-stable on the mixed fixture', () => {
    const once = fixDiagramLabels(MEDIA_FIXTURE);
    const twice = fixDiagramLabels(once);
    expect(twice).toBe(once);
  });

  it('the widened query enumerates each special-shape group exactly once', () => {
    const doc = new DOMParser().parseFromString(MEDIA_FIXTURE, 'image/svg+xml');
    const groups = doc.querySelectorAll('.node, .icon-shape, .image-shape');
    // 3 nodes — querySelectorAll dedupes, and the measured classes are
    // disjoint from `node`, so no element can be visited twice.
    expect(groups).toHaveLength(3);
    const ids = Array.from(groups).map(g => g.id);
    expect(ids).toEqual(['flowchart-A-1', 'flowchart-I-2', 'flowchart-N-3']);
  });

  it('live render oracle: a data-URI img node enumerates under the production selector form and label-fixes without skipping', async () => {
    // The 39-01 oracle fixture idiom (decode polyfill lives in the global
    // vitest setup). This pins the selector against what mermaid 12.3
    // ACTUALLY emits — never an assumed group form.
    const proto = (globalThis as unknown as { SVGElement?: { prototype: Record<string, unknown> } }).SVGElement
      ?.prototype;
    if (proto && typeof proto.getComputedTextLength !== 'function') {
      proto.getComputedTextLength = function getComputedTextLength(this: SVGElement): number {
        return (this.textContent ?? '').length * 8;
      };
    }
    const { initMermaid } = await import('@/lib/mermaid/core');
    initMermaid('light');
    const { renderDiagram } = await import('@/lib/mermaid/core');
    const { parseDiagram } = await import('@/lib/mermaid/codeUtils');
    const { postProcessDiagramSvg } = await import('../svgPostProcessing');

    const TINY_PNG_URI =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const SRC = `flowchart TD\nA@{ img: "${TINY_PNG_URI}", label: "Photo", constraint: "on" }`;
    let host: HTMLElement | null = null;
    try {
      const { svg, error } = await renderDiagram(SRC, 'p39_04_postproc_oracle');
      expect(error).toBeNull();
      expect(svg).not.toBe('');

      // The production selector form (identical to both canvas sites) finds
      // the img group, and the unchanged id regex extracts the node id.
      host = document.createElement('div');
      host.innerHTML = svg;
      document.body.appendChild(host);
      const svgEl = host.querySelector('svg');
      expect(svgEl).not.toBeNull();
      const groups = svgEl!.querySelectorAll('g.node, g.nodeLabel, g.icon-shape, g.image-shape');
      expect(groups).toHaveLength(1);
      const idMatch = groups[0].id.match(/flowchart-([A-Za-z0-9_-]+)-\d+$/);
      expect(idMatch?.[1]).toBe('A');

      // The label-fix pipeline runs the img group through fixNodeLabels
      // without skipping it: the group and its label content survive.
      const parsed = parseDiagram(SRC);
      const processed = postProcessDiagramSvg(svg, parsed);
      expect(processed).toContain('image-shape');
      const pDoc = new DOMParser().parseFromString(processed, 'image/svg+xml');
      const pGroup = pDoc.querySelector('.image-shape');
      expect(pGroup?.id).toBe(groups[0].id);
      expect(pGroup?.querySelector('span, div, p, text')?.textContent).toContain('Photo');
    } finally {
      host?.remove();
      document.getElementById('p39_04_postproc_oracle')?.remove();
      document.getElementById('dp39_04_postproc_oracle')?.remove();
    }
  });
});
