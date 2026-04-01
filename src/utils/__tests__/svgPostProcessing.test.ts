import { describe, it, expect } from 'vitest';
import { fixEdgeLabelTextPosition } from '../svgPostProcessing';

describe('svgPostProcessing', () => {
  describe('fixEdgeLabelTextPosition', () => {
    it('should return unchanged SVG if not a flowchart', () => {
      const svgString = '<svg><text>test</text></svg>';
      const result = fixEdgeLabelTextPosition(svgString);
      expect(result).toBe(svgString);
    });

    it('should center edge label text in flowcharts', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="edgeLabel">
          <g class="label">
            <rect class="background" x="0" y="10" width="50" height="20"></rect>
            <text y="15" dy="5">Label</text>
          </g>
        </g>
      </svg>`.replace(/>\s+</g, '><');

      // Add flowchart indicator
      const flowchartSvg = svgString.replace('<svg', '<svg data-type="flowchart"').replace('</svg>', 'flowchart</svg>');
      
      const result = fixEdgeLabelTextPosition(flowchartSvg);
      
      // Check that text y coordinate is centered (rectY + rectH/2 = 10 + 20/2 = 20)
      expect(result).toContain('y="20"');
      expect(result).toContain('dominant-baseline="middle"');
      expect(result).not.toContain('dy="5"');
    });

    it('should handle Sankey diagrams by adding gradients', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="sankey">
        <path stroke="url(#linearGradient-1)"></path>
      </svg>`;
      
      const result = fixEdgeLabelTextPosition(svgString);
      
      // Check that defs element was added
      expect(result).toContain('<defs');
      expect(result).toContain('linearGradient');
      expect(result).toContain('id="linearGradient-1"');
    });

    it('should not modify Sankey if gradients already exist', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="sankey">
        <defs><linearGradient id="existing"></linearGradient></defs>
        <path stroke="url(#linearGradient-1)"></path>
      </svg>`;
      
      const result = fixEdgeLabelTextPosition(svgString);
      
      // Should return unchanged since defs already exists
      expect(result).toBe(svgString);
    });

    it('should reorder SVG elements in flowcharts', () => {
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
        <g class="edgeLabel">Label</g>
        <g class="edgePaths">Path</g>
        <g class="nodes">Node</g>
        flowchart
      </svg>`;
      
      const result = fixEdgeLabelTextPosition(svgString);
      
      // Check that nodes come before edges, edges before labels
      const nodesIndex = result.indexOf('<g class="nodes">');
      const edgesIndex = result.indexOf('<g class="edgePaths">');
      const labelsIndex = result.indexOf('<g class="edgeLabel">');
      
      expect(nodesIndex).toBeLessThan(edgesIndex);
      expect(edgesIndex).toBeLessThan(labelsIndex);
    });
  });
});
