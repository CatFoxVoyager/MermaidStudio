import { describe, it, expect, beforeEach } from 'vitest';
import { applyEdgeFontStyles } from '../svgPostProcessing';

describe('applyEdgeFontStyles', () => {
  it('should apply font-size to edge labels', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g class="root">
        <g class="edgePaths">
          <path class="flowchart-link" d="M 100 100 L 200 100" stroke="#000000"></path>
        </g>
        <g class="edgeLabels">
          <g class="edgeLabel">
            <g class="label">
              <g>
                <rect class="background" x="-20" y="-10" width="40" height="20"></rect>
                <text y="0" text-anchor="middle">
                  <tspan class="text-outer-tspan row" x="0" dy="1.1em">
                    <tspan class="text-inner-tspan">Test</tspan>
                  </tspan>
                </text>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>`;

    const linkStyles = new Map([[0, { fontSize: '30px' }]]);
    const result = applyEdgeFontStyles(svg, linkStyles);

    console.log('Result SVG:', result);
    console.log('Contains font-size="30px":', result.includes('font-size="30px"'));
    console.log('Contains fontSize:30px:', result.includes('fontSize:30px'));

    // Check that font-size was applied to the text element
    expect(result).toContain('font-size="30px"');
  });

  it('should apply font-size to edge labels with parsedEdges', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g class="root">
        <g class="nodes">
          <g class="node" id="A" transform="translate(100,100)"></g>
          <g class="node" id="B" transform="translate(200,100)"></g>
        </g>
        <g class="edgePaths">
          <path class="flowchart-link" d="M 100 100 L 200 100" stroke="#000000"></path>
        </g>
        <g class="edgeLabels">
          <g class="edgeLabel">
            <g class="label">
              <g>
                <rect class="background" x="-20" y="-10" width="40" height="20"></rect>
                <text y="0" text-anchor="middle">
                  <tspan class="text-outer-tspan row" x="0" dy="1.1em">
                    <tspan class="text-inner-tspan">A->B</tspan>
                  </tspan>
                </text>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>`;

    const parsedEdges = [
      { source: 'A', target: 'B', label: 'A->B' }
    ];

    const linkStyles = new Map([[0, { fontSize: '24px' }]]);
    const result = applyEdgeFontStyles(svg, linkStyles, parsedEdges);

    console.log('Result SVG:', result);

    // Check that font-size was applied to the text element
    expect(result).toContain('font-size="24px"');
  });
});
