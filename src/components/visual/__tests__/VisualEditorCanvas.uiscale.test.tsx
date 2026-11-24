import { describe, it, expect, afterEach } from 'vitest';
import { extractSvgNodes, extractSvgEdges } from '../VisualEditorCanvas';
import { applyScale } from '@/utils/uiScale';

// UI-scale awareness of the overlay extraction functions. Same fixture as
// VisualEditorCanvas.test.tsx `setupEdgeSvg()` (div at (100, 50, 800, 600),
// svg at (250, 140, 1800, 720)), with each `g.node` given a rect at
// (250, 140, 180, 72). Canvas zoom stays 1: the global interface scale is
// a second, independent factor (getUiScale() read from <html>), and the
// extraction conversion is `screen / (zoom * getUiScale())`.
const twoNodesOneEdgeSvg = `
  <svg viewBox="0 0 400 200">
    <g class="node" id="flowchart-A-1" transform="translate(100,100)"><rect /></g>
    <g class="node" id="flowchart-B-2" transform="translate(300,100)"><rect /></g>
    <g class="edgePaths">
      <path class="flowchart-link" id="L_A_B_0" d="M 100 100 L 300 100" />
    </g>
  </svg>`;

const parsedEdges = [{ source: 'A', target: 'B', arrowType: '-->', label: '' }];

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }),
});

function setupEdgeSvg() {
  const div = document.createElement('div');
  div.innerHTML = twoNodesOneEdgeSvg;
  div.getBoundingClientRect = () => rect(100, 50, 800, 600) as DOMRect;
  const svgEl = div.querySelector('svg') as SVGSVGElement;
  svgEl.getBoundingClientRect = () => rect(250, 140, 1800, 720) as DOMRect;
  div.querySelectorAll('g.node').forEach(g => {
    (g as Element).getBoundingClientRect = () => rect(250, 140, 180, 72) as DOMRect;
  });
  return div;
}

describe('VisualEditorCanvas extraction under UI scale', () => {
  afterEach(() => {
    applyScale(1);
  });

  it('extractSvgNodes divides by zoom * uiScale at 0.8', () => {
    applyScale(0.8);
    const div = setupEdgeSvg();

    const overlays = extractSvgNodes(div, 1);

    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays[0].x).toBeCloseTo(187.5); // (250 - 100) / (1 * 0.8)
    expect(overlays[0].y).toBeCloseTo(112.5); // (140 - 50) / (1 * 0.8)
    expect(overlays[0].width).toBeCloseTo(225); // 180 / 0.8
    expect(overlays[0].height).toBeCloseTo(90); // 72 / 0.8
  });

  it('extractSvgEdges builds the svgBox in local px at 0.8', () => {
    applyScale(0.8);
    const div = setupEdgeSvg();

    const layer = extractSvgEdges(div, 1, parsedEdges as never);

    expect(layer.svgBox).not.toBeNull();
    expect(layer.svgBox!.left).toBeCloseTo(187.5); // (250 - 100) / 0.8
    expect(layer.svgBox!.top).toBeCloseTo(112.5); // (140 - 50) / 0.8
    expect(layer.svgBox!.width).toBeCloseTo(2250); // 1800 / 0.8
    expect(layer.svgBox!.height).toBeCloseTo(900); // 720 / 0.8
  });

  it('extractSvgNodes divides by zoom * uiScale at 1.25', () => {
    applyScale(1.25);
    const div = setupEdgeSvg();

    const overlays = extractSvgNodes(div, 1);

    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays[0].x).toBeCloseTo(120); // 150 / 1.25
    expect(overlays[0].y).toBeCloseTo(72); // 90 / 1.25
    expect(overlays[0].width).toBeCloseTo(144); // 180 / 1.25
    expect(overlays[0].height).toBeCloseTo(57.6); // 72 / 1.25
  });
});
