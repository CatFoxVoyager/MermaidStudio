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
});
