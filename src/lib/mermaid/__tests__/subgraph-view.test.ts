// EDGE-05 battery (40-04): subgraph view directives parse from the landed
// 38-03 linkedDirectives registry through the PROMOTED span grammar, the
// updateSubgraphView mutator emits strictly AFTER the block's depth-matched
// end (never inline), replace-in-place idempotency, expand-to-default
// removal, the unknown-value fence, the removeSubgraph cascade, and the
// one-line / nested-block declines.
import { describe, it, expect } from 'vitest';
import {
  parseDiagram,
  updateSubgraphView,
  removeSubgraph,
  parseSubgraphViewSpan,
  parseEdgeDirectiveSpan,
  bodyHasUnparsedAtDirective,
} from '@/lib/mermaid/codeUtils';

const COLLAPSED = 'flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: collapsed }';

describe('subgraph view parse (EDGE-05 promoted span grammar)', () => {
  it('types a standalone collapsed directive onto the subgraph', () => {
    const g = parseDiagram(COLLAPSED);
    expect(g.subgraphs).toHaveLength(1);
    expect(g.subgraphs[0].view).toBe('collapsed');
    // The registry keeps the line verbatim (cascade source of truth).
    expect(g.linkedDirectives.get('sg1')).toEqual(['sg1@{ view: collapsed }']);
  });

  it('types an expanded directive; an absent directive means expanded (undefined)', () => {
    const expanded = parseDiagram('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: expanded }');
    expect(expanded.subgraphs[0].view).toBe('expanded');
    const absent = parseDiagram('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end');
    expect(absent.subgraphs[0].view).toBeUndefined();
    expect(absent.subgraphs[0].unknownViewParams).toBeUndefined();
  });

  it('types the quoted value the same as the bare one', () => {
    const g = parseDiagram('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: "collapsed" }');
    expect(g.subgraphs[0].view).toBe('collapsed');
  });

  it('links the directive placed BEFORE its block (registry is order-independent)', () => {
    const g = parseDiagram('flowchart LR\n  sg1@{ view: collapsed }\n  subgraph sg1 [Box]\n    A[x]\n  end');
    expect(g.subgraphs[0].view).toBe('collapsed');
    // The line must not mint a phantom node.
    expect(g.nodes.every(n => n.id !== 'sg1')).toBe(true);
  });

  it('an unknown view value leaves view undefined and lands verbatim in unknownViewParams', () => {
    const g = parseDiagram('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: sideways }');
    expect(g.subgraphs[0].view).toBeUndefined();
    expect(g.subgraphs[0].unknownViewParams).toEqual(['view: sideways']);
  });

  it('an unknown sibling param stays verbatim and the view still types', () => {
    const g = parseDiagram('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: collapsed, foo: bar }');
    expect(g.subgraphs[0].view).toBe('collapsed');
    expect(g.subgraphs[0].unknownViewParams).toEqual(['foo: bar']);
  });
});

describe('updateSubgraphView — strictly-after emission / replace / remove', () => {
  it('emits the directive line immediately AFTER the block matching end', () => {
    const out = updateSubgraphView('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  B[y]', 'sg1', 'collapsed');
    const lines = out.split('\n');
    const endIdx = lines.findIndex(l => l.trim() === 'end');
    expect(lines[endIdx + 1]).toBe('  sg1@{ view: collapsed }');
    expect(lines[endIdx + 2]).toBe('  B[y]');
    // Never inline on the subgraph header.
    expect(lines.some(l => l.includes('subgraph sg1@{'))).toBe(false);
    const g = parseDiagram(out);
    expect(g.subgraphs[0].view).toBe('collapsed');
  });

  it('replaces an existing directive line in place (line count stable)', () => {
    const once = updateSubgraphView(COLLAPSED, 'sg1', 'collapsed');
    expect(once.split('\n')).toHaveLength(COLLAPSED.split('\n').length);
    expect(once).toBe(COLLAPSED);
    // Toggling expanded→collapsed on an existing expanded line rewrites it.
    const expanded = 'flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: expanded }';
    const toggled = updateSubgraphView(expanded, 'sg1', 'collapsed');
    expect(toggled.split('\n')).toHaveLength(expanded.split('\n').length);
    expect(toggled.split('\n')[4]).toBe('  sg1@{ view: collapsed }');
  });

  it('collapse → expand → collapse leaves exactly one directive line', () => {
    const step1 = updateSubgraphView('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end', 'sg1', 'collapsed');
    const step2 = updateSubgraphView(step1, 'sg1', 'expanded');
    expect(step2.split('\n').filter(l => l.includes('sg1@{'))).toHaveLength(0);
    const step3 = updateSubgraphView(step2, 'sg1', 'collapsed');
    expect(step3.split('\n').filter(l => l.includes('sg1@{'))).toHaveLength(1);
    expect(step3.split('\n')).toHaveLength(step1.split('\n').length);
  });

  it('expand-to-default removes the line; expanding an already-expanded subgraph is a no-op', () => {
    const expanded = updateSubgraphView(COLLAPSED, 'sg1', 'expanded');
    expect(expanded.split('\n').filter(l => l.includes('sg1@{'))).toHaveLength(0);
    expect(expanded).toBe('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end');
    // expanded on a subgraph with NO directive line: unchanged (empty resolution).
    const bare = 'flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end';
    expect(updateSubgraphView(bare, 'sg1', 'expanded')).toBe(bare);
    expect(updateSubgraphView(bare, 'sg1', null)).toBe(bare);
  });

  it('emits after the INNER block own end when targeting the nested id (depth-matched)', () => {
    const src = 'flowchart LR\n  subgraph sg0 [Outer]\n    subgraph sg1 [Inner]\n      A[x]\n    end\n    B[y]\n  end';
    const out = updateSubgraphView(src, 'sg1', 'collapsed');
    const lines = out.split('\n');
    const innerEndIdx = lines.findIndex(l => l.trim() === 'end');
    expect(lines[innerEndIdx + 1]).toBe('    sg1@{ view: collapsed }');
    expect(lines[innerEndIdx + 2]).toBe('    B[y]');
    const g = parseDiagram(out);
    expect(g.subgraphs.find(s => s.id === 'sg1')?.view).toBe('collapsed');
    expect(g.subgraphs.find(s => s.id === 'sg0')?.view).toBeUndefined();
  });

  it('declines the inline one-line subgraph form', () => {
    const src = 'flowchart LR\n  subgraph sg1 [Box] A[x] end\n  B[y]';
    expect(updateSubgraphView(src, 'sg1', 'collapsed')).toBe(src);
  });

  it('declines mutation on an unknown view value (fence) and on foreign-family spans', () => {
    const sideways = 'flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: sideways }';
    expect(updateSubgraphView(sideways, 'sg1', 'collapsed')).toBe(sideways);
    expect(updateSubgraphView(sideways, 'sg1', null)).toBe(sideways);
    const foreign = 'flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ animate: true }';
    expect(updateSubgraphView(foreign, 'sg1', 'collapsed')).toBe(foreign);
    const empty = 'flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{}';
    expect(updateSubgraphView(empty, 'sg1', 'collapsed')).toBe(empty);
  });

  it('declines unknown ids and subgraphs that do not exist', () => {
    expect(updateSubgraphView(COLLAPSED, 'bad id!', 'collapsed')).toBe(COLLAPSED);
    expect(updateSubgraphView(COLLAPSED, 'nope', 'collapsed')).toBe(COLLAPSED);
  });
});

describe('view directive cascade + fence interplay', () => {
  it('removeSubgraph cascades the directive line (landed 38-03 pin stays green)', () => {
    const out = removeSubgraph(COLLAPSED, 'sg1');
    expect(out.split('\n').filter(l => l.includes('sg1@{'))).toHaveLength(0);
    expect(out).toBe('flowchart LR\n    A[x]');
  });

  it('a failed view param fences the document; a well-formed view span stays editable', () => {
    expect(bodyHasUnparsedAtDirective('flowchart LR\n  subgraph sg1 [Box]\n    A[x]\n  end\n  sg1@{ view: sideways }')).toBe(true);
    expect(bodyHasUnparsedAtDirective(COLLAPSED)).toBe(false);
  });

  it('parseSubgraphViewSpan reports the typed view, unknowns, and foreign families', () => {
    expect(parseSubgraphViewSpan('@{ view: collapsed }')).toEqual({ view: 'collapsed', unknownViewParams: [], foreignFamily: false });
    expect(parseSubgraphViewSpan('@{ view: sideways }')).toEqual({ unknownViewParams: ['view: sideways'], foreignFamily: false });
    expect(parseSubgraphViewSpan('@{ animate: true }')?.foreignFamily).toBe(true);
    expect(parseSubgraphViewSpan('@{ view: collapsed, foo: bar }')).toEqual({
      view: 'collapsed',
      unknownViewParams: ['foo: bar'],
      foreignFamily: false,
    });
    expect(parseSubgraphViewSpan('@{}')).toBeNull();
    expect(parseSubgraphViewSpan('not a span')).toBeNull();
  });

  it('parseEdgeDirectiveSpan declines a span the subgraph view family typed (cross-family)', () => {
    expect(parseEdgeDirectiveSpan('@{ animate: true, view: collapsed }')).toBeNull();
    expect(parseEdgeDirectiveSpan('@{ view: collapsed }')).toBeNull();
    // The edge family itself keeps typing.
    expect(parseEdgeDirectiveSpan('@{ animate: true }')?.animate).toBe(true);
  });
});
