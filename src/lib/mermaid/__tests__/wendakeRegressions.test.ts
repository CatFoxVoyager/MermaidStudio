import { describe, it, expect, vi } from 'vitest';
import {
  parseDiagram,
  getNodeStyle,
  removeNodeStyles,
  updateNodeLabel,
  updateEdgeLabel,
  updateEdgeArrowType,
  removeEdge,
  assignOrUpdateEdgeId,
  upsertEdgeMetadataAtIndex,
  applyEdgeAnimatePreset,
} from '@/lib/mermaid/codeUtils';
import { applyStyleToContent, extractStyleOptionsFromContent } from '@/constants/themeDerivation';
import { postProcessDiagramSvg } from '@/utils/svgPostProcessing';
import { collectNodeElements } from '@/utils/svgEdgeMatching';
import { extractSvgNodes } from '@/components/visual/VisualEditorCanvas';

describe('Wendake complex diagram regressions (B1..B14)', () => {
  it('B12 & B13: parses trailing semicolons on class statements and preserves shared classDef when resetting a single node', () => {
    const src = [
      'flowchart TB',
      '  WAN1(("WAN1<br/>CNW"))',
      '  WAN2(("WAN2<br/>Visiteurs"))',
      '  FW{{"Pare-feu<br/>Wendake-2"}}',
      '  classDef device fill:#191919,stroke:#cccccc,stroke-width:1.4px,color:#eeeeee;',
      '  class WAN1,WAN2,FW device;',
    ].join('\n');

    const parsed = parseDiagram(src);
    expect(parsed.nodeClasses.get('WAN1')).toEqual(['device']);
    expect(parsed.nodeClasses.get('WAN2')).toEqual(['device']);
    expect(getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, 'WAN1')).toMatchObject({
      fill: '#191919',
      stroke: '#cccccc',
      color: '#eeeeee',
    });

    // Resetting/restyling WAN1 alone must NOT wipe classDef device or unstyle WAN2 & FW!
    const afterSingleReset = removeNodeStyles(src, ['WAN1']);
    expect(afterSingleReset).toContain('classDef device');
    expect(afterSingleReset).toContain('class WAN2,FW device;');
    expect(afterSingleReset).not.toContain('WAN1,');

    const reparsed = parseDiagram(afterSingleReset);
    expect(reparsed.nodeClasses.get('WAN1')).toBeUndefined();
    expect(reparsed.nodeClasses.get('WAN2')).toEqual(['device']);
    expect(reparsed.nodeClasses.get('FW')).toEqual(['device']);
  });

  it('B13: updateNodeLabel preserves quotes on bracketed/HTML labels like DIST1["[Distribution_01]"]', () => {
    const src = [
      'flowchart TB',
      '  DIST1["[Distribution_01]"]',
      '  FW{{"Pare-feu<br/>Wendake-2"}}',
    ].join('\n');

    const renamedDist = updateNodeLabel(src, 'DIST1', '[Distribution_Core_01]');
    expect(renamedDist).toContain('DIST1["[Distribution_Core_01]"]');
    const parsedDist = parseDiagram(renamedDist);
    const distNode = parsedDist.nodes.find(n => n.id === 'DIST1');
    expect(distNode?.shape).toBe('rect');
    expect(distNode?.label).toBe('[Distribution_Core_01]');

    const renamedFw = updateNodeLabel(renamedDist, 'FW', 'Pare-feu<br/>Principal');
    expect(renamedFw).toContain('FW{{"Pare-feu<br/>Principal"}}');
  });

  it('B10: unwraps quoted pipe edge labels on parse and targets exact parallel edge via edgeIndex', () => {
    const src = [
      'flowchart TB',
      '  ECOLE1[Ecole_01]',
      '  ECOLE3[Ecole_03]',
      '  ECOLE1 ---|"E01 : 49 / E03 : 25"| ECOLE3',
      '  ECOLE1 ---|"E01 : 50 / E03 : 26"| ECOLE3',
    ].join('\n');

    const parsed = parseDiagram(src);
    expect(parsed.edges).toHaveLength(2);
    expect(parsed.edges[0].label).toBe('E01 : 49 / E03 : 25');
    expect(parsed.edges[1].label).toBe('E01 : 50 / E03 : 26');

    // Update label ONLY on the 2nd parallel edge (index 1)
    const relabeled = updateEdgeLabel(src, 'ECOLE1', 'ECOLE3', 'E01 : 52 / E03 : 28', 1);
    const reparsed = parseDiagram(relabeled);
    expect(reparsed.edges[0].label).toBe('E01 : 49 / E03 : 25');
    expect(reparsed.edges[1].label).toBe('E01 : 52 / E03 : 28');

    // Update arrow type ONLY on the 2nd parallel edge (index 1)
    const rearrowed = updateEdgeArrowType(relabeled, 'ECOLE1', 'ECOLE3', '==>', 1, 1);
    const reparsed2 = parseDiagram(rearrowed);
    expect(reparsed2.edges[0].arrowType).toBe('---');
    expect(reparsed2.edges[1].arrowType).toBe('==>');

    // Delete ONLY the 2nd parallel edge (index 1)
    const afterDelete = removeEdge(rearrowed, 'ECOLE1', 'ECOLE3', 1);
    const reparsed3 = parseDiagram(afterDelete);
    expect(reparsed3.edges).toHaveLength(1);
    expect(reparsed3.edges[0].label).toBe('E01 : 49 / E03 : 25');
  });

  it('B8: auto-mints edge IDs on standard edges for animate, metadata, preset, and manual ID assignment', () => {
    const src = [
      'flowchart TB',
      '  WAN1 -->|"port33"| FW',
      '  WAN2 -->|"port34"| FW',
    ].join('\n');

    // Animate on 2nd edge (index 1) auto-mints e1@ on WAN2 --> FW
    const animated = upsertEdgeMetadataAtIndex(src, 1, { animate: true, animation: 'fast' }, 'WAN2', 'FW');
    const parsed1 = parseDiagram(animated);
    expect(parsed1.edges[0].edgeId).toBeUndefined();
    expect(parsed1.edges[1].edgeId).toBe('e1');
    expect(parsed1.edges[1].metadata).toMatchObject({ animate: true, animation: 'fast' });

    // Assigning custom ID on 1st edge (index 0)
    const withCustomId = assignOrUpdateEdgeId(animated, 0, 'wan1_link', 'WAN1', 'FW');
    const parsed2 = parseDiagram(withCustomId);
    expect(parsed2.edges[0].edgeId).toBe('wan1_link');
    expect(parsed2.edges[1].edgeId).toBe('e1');

    // 1-click preset on parallel edge
    const parallelSrc = 'flowchart TB\n  DIST1 --- DIST2\n  DIST1 --- DIST2';
    const withPreset = applyEdgeAnimatePreset(parallelSrc, 'DIST1', 'DIST2', 1);
    const parsedParallel = parseDiagram(withPreset);
    expect(parsedParallel.edges[0].edgeId).toBeUndefined();
    expect(parsedParallel.edges[1].edgeId).toBe('e1');
    expect(withPreset).toContain('class e1 eDashAnim');
  });

  it('B5 & B9: stepNumbers toggle cleans frontmatter when turned off and solid edgeDasharray clears strokeDasharray', () => {
    const clean = 'flowchart TB\n  A --> B';

    const withSteps = applyStyleToContent(clean, { stepNumbers: true });
    expect(withSteps).toContain('stepNumbers: true');
    expect(withSteps).not.toContain('fontSize');
    expect(withSteps).not.toContain('linkStyle default');

    const withoutSteps = applyStyleToContent(withSteps, { stepNumbers: undefined });
    expect(withoutSteps).not.toContain('stepNumbers');
    expect(withoutSteps.trim()).toBe(clean);

    const dashed = applyStyleToContent(clean, { edgeDasharray: '5 5' });
    expect(dashed).toContain('stroke-dasharray:5 5');
    const backToSolid = applyStyleToContent(dashed, { edgeDasharray: '' });
    expect(backToSolid).not.toContain('stroke-dasharray');
    expect(extractStyleOptionsFromContent(backToSolid).edgeDasharray).toBeUndefined();
  });

  it('B9: postProcessDiagramSvg enforces linkStyle stroke-dasharray over Neo inline dasharray and styles foreignObject edge labels', () => {
    const code = [
      'flowchart TB',
      '  A -->|" Label "| B',
      '  linkStyle 0 stroke:#ff0055,stroke-width:4px,stroke-dasharray:5 5,fill:#223344,color:#ffeeaa,font-size:18px',
    ].join('\n');
    const parsed = parseDiagram(code);
    const neoSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">',
      '  <g class="edgePaths">',
      '    <path id="L_A_B_0" class="edge-thickness-normal flowchart-link" d="M 10 10 L 100 10" style="stroke-dasharray: 0, 0, 90, 0; stroke-dashoffset: 0;" />',
      '  </g>',
      '  <g class="edgeLabels">',
      '    <g class="edgeLabel">',
      '      <g class="label" data-id="L_A_B_0">',
      '        <foreignObject width="60" height="24">',
      '          <div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg"><span class="edgeLabel"><p>Label</p></span></div>',
      '        </foreignObject>',
      '      </g>',
      '    </g>',
      '  </g>',
      '</svg>',
    ].join('');

    const out = postProcessDiagramSvg(neoSvg, parsed);
    expect(out).toContain('stroke-dasharray: 5 5 !important');
    expect(out).toContain('background-color: rgb(34, 51, 68)');
    expect(out).toContain('font-size: 18px');
  });

  it('preserves default redux-color theme when setting Recursive fontFamily or useGradient, and populates Neo gradient stops on custom base theme', () => {
    const clean = 'flowchart TD\n  A[Start] --> B[End]';

    const withFont = applyStyleToContent(clean, { look: 'handDrawn', fontFamily: 'Recursive, sans-serif' });
    expect(withFont).toContain("look: 'handDrawn'");
    expect(withFont).toContain("fontFamily: 'Recursive, sans-serif'");
    expect(withFont).not.toContain('theme:');

    const withNeoGrad = applyStyleToContent(clean, { look: 'neo', useGradient: true });
    expect(withNeoGrad).toContain("look: 'neo'");
    expect(withNeoGrad).toContain('useGradient: true');
    expect(withNeoGrad).not.toContain('theme:');

    const customColorsWithGrad = applyStyleToContent(clean, { primaryColor: '#191919', useGradient: true });
    expect(customColorsWithGrad).toContain("theme: 'base'");
    expect(customColorsWithGrad).toContain("gradientStart: '#0042eb'");
    expect(customColorsWithGrad).toContain("gradientStop: '#eb0042'");
  });

  it('enumerates g.rough-node elements in Hand-Drawn look for edge matching and visual selection', () => {
    const container = document.createElement('div');
    container.innerHTML = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">',
      '  <g class="nodes">',
      '    <g class="rough-node default" id="flowchart-A-0"><path d="M0 0 L80 0 L80 40 L0 40 Z"/></g>',
      '    <g class="rough-node default" id="flowchart-B-1"><path d="M120 0 L200 0 L200 40 L120 40 Z"/></g>',
      '  </g>',
      '</svg>',
    ].join('');
    const svg = container.querySelector('svg')!;
    const collected = collectNodeElements(svg);
    expect(collected.length).toBe(2);

    // Mock non-zero bounding rects so extractSvgNodes produces overlays in JSDOM
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200, toJSON: () => ({}),
    });
    Array.from(svg.querySelectorAll('g.rough-node')).forEach((el, idx) => {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        x: idx * 120, y: 0, left: idx * 120, top: 0, right: idx * 120 + 80, bottom: 40, width: 80, height: 40, toJSON: () => ({}),
      });
    });
    const overlays = extractSvgNodes(container, 1);
    expect(overlays.map(o => o.id)).toEqual(['A', 'B']);
  });
});
