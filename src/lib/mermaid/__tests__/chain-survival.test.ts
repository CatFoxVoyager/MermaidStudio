// Chain/edge-id survival harness (backlog C): every line-surgical mutation
// writer must preserve what it does not touch. Applied to a chained line
// (`A --> B --> C`) or a bare-edge-id line (`A e1@--> B`), a writer may
// rewrite the tokens it owns (labels, styles, arrows) but the OTHER hops,
// their arrows, and the `ident@` prefixes must survive verbatim — these
// tests are the gate that lets bodyHasUnparsedAtDirective lift the
// multi-hop and bare-id mutation fences.
import { describe, it, expect } from 'vitest';
import {
  updateNodeLabel,
  updateNodeStyle,
  updateEdgeLabel,
  updateEdgeArrowType,
  removeEdge,
  removeNode,
  moveNodeToSubgraph,
  parseDiagram,
} from '@/lib/mermaid/codeUtils';

const CHAIN = 'flowchart LR\n  A --> B --> C';
const BARE = 'flowchart LR\n  A e1@--> B e2@--> C';
const LABEL_CHAIN = 'flowchart LR\n  A[Start] e1@-->|go| B{q?} --> C(round)';

/** The graph must keep every hop node and edge after a mutation. */
function expectSameGraph(source: string, before: string): void {
  const g0 = parseDiagram(before);
  const g1 = parseDiagram(source);
  expect(g1.nodes.map(n => n.id)).toEqual(g0.nodes.map(n => n.id));
  expect(g1.edges.map(e => [e.source, e.target])).toEqual(g0.edges.map(e => [e.source, e.target]));
}

describe('chain survival — mutation writers keep untouched hops', () => {
  it('updateNodeLabel renames the middle node and keeps the chain', () => {
    const out = updateNodeLabel(CHAIN, 'B', 'Bee');
    expect(out).toContain('Bee');
    expect(out).toContain('-->');
    expectSameGraph(out, CHAIN);
  });

  it('updateNodeLabel renames a bare-id source without losing the prefix', () => {
    const out = updateNodeLabel(BARE, 'A', 'Alpha');
    expect(out).toMatch(/Alpha[^\n]*e1@-->/);
    expectSameGraph(out, BARE);
    // The bare id must not leak into the parsed label (ghost 'e1@' guard).
    expect(parseDiagram(out).nodes.every(n => !/@/.test(n.label))).toBe(true);
  });

  it('updateNodeStyle styles the middle node and keeps the chain', () => {
    const out = updateNodeStyle(CHAIN, 'B', { fill: '#ff0000' });
    expect(out).toContain('-->');
    expectSameGraph(out, CHAIN);
    expect(out).toMatch(/^style B fill:#ff0000$/m);
  });

  it('updateEdgeLabel relabels the first hop and keeps the second', () => {
    const out = updateEdgeLabel(CHAIN, 'A', 'B', 'yes');
    expect(out).toContain('|yes|');
    expectSameGraph(out, CHAIN);
  });

  it('updateEdgeArrowType retypes the first hop and keeps the second', () => {
    const out = updateEdgeArrowType(CHAIN, 'A', 'B', '-.->');
    expect(out).toContain('-.->');
    expectSameGraph(out, CHAIN);
  });

  it('removeEdge deletes only the targeted hop of a chain', () => {
    const out = removeEdge(CHAIN, 'A', 'B');
    const g = parseDiagram(out);
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['B', 'C']]);
  });

  it('removeEdge deletes the bare-id hop and its prefix only', () => {
    const out = removeEdge(BARE, 'A', 'B');
    expect(out).not.toContain('e1@');
    const g = parseDiagram(out);
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['B', 'C']]);
    expect(out).toContain('e2@');
  });

  it('removeNode removes a terminal chain node and its hop', () => {
    const out = removeNode(CHAIN, 'C');
    const g = parseDiagram(out);
    expect(g.nodes.map(n => n.id)).toEqual(['A', 'B']);
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['A', 'B']]);
  });

  it('removeNode removes a mid-chain node with its two hops', () => {
    const out = removeNode(CHAIN, 'B');
    const g = parseDiagram(out);
    expect(g.nodes.map(n => n.id)).toEqual(['A', 'C']);
    expect(g.edges).toHaveLength(0);
    expect(out).not.toContain('-->');
  });

  it('moveNodeToSubgraph moves a mid-chain node and keeps the hops', () => {
    const withSub = `${CHAIN}\nsubgraph sg1 [Group]\n  Z\nend`;
    const out = moveNodeToSubgraph(withSub, 'B', 'sg1');
    expectSameGraph(out, withSub);
    expect(parseDiagram(out).nodes.find(n => n.id === 'B')?.parentSubgraphId).toBe('sg1');
  });

  it('updateNodeLabel keeps labels and shapes of neighbouring hops', () => {
    const out = updateNodeLabel(LABEL_CHAIN, 'B', 'Bee');
    expect(out).toContain('|go|');
    expect(out).toContain('C(round)');
    expectSameGraph(out, LABEL_CHAIN);
  });
});

// 40-01 (EDGE-02 markdown survival): an arrow-like token inside a
// bracketed/quoted node label never splits the edge match — matchArrowLine
// and splitEdgeLine share findNextHopArrow's depth/quote state (plus the
// backtick Markdown-string channel), so the span survives parse and
// mutations verbatim.
describe('markdown survival — arrow-like text inside labels never splits', () => {
  // "A[`x --> y`]" with the Markdown-string span on the SOURCE.
  const MD_SOURCE = 'flowchart LR\n  A["`x --> y`"] --> B';
  // The same span on a hop TARGET (its raw is the target shape raw).
  const MD_TARGET = 'flowchart LR\n  A --> B["`x --> y`"]';

  it('a backtick Markdown label containing --> parses as one edge A to B', () => {
    const g = parseDiagram(MD_SOURCE);
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['A', 'B']]);
    // The bracket span survives verbatim on the shape raw (the label model
    // strips markdown backticks — landed parseNodeLabel behavior).
    expect(g.nodes.find(n => n.id === 'A')?.raw).toBe('["`x --> y`"]');
    expect(g.nodes.find(n => n.id === 'A')?.label).toBe('x --> y');
  });

  it('a target-side Markdown span keeps its target shape raw verbatim', () => {
    const g = parseDiagram(MD_TARGET);
    expect(g.edges).toHaveLength(1);
    expect(g.nodes.find(n => n.id === 'B')?.raw).toBe('["`x --> y`"]');
  });

  it('updateEdgeArrowType on a Markdown-span line re-emits the span unchanged', () => {
    const out = updateEdgeArrowType(MD_SOURCE, 'A', 'B', '-.->');
    expect(out).toContain('["`x --> y`"]');
    expect(out).toContain('-.->');
    expectSameGraph(out, MD_SOURCE);
    const out2 = updateEdgeArrowType(MD_TARGET, 'A', 'B', '==>');
    expect(out2).toContain('["`x --> y`"]');
    expect(out2).toContain('==>');
    expectSameGraph(out2, MD_TARGET);
  });

  it('a chain through a Markdown-span hop keeps the trailing hop', () => {
    const chained = 'flowchart LR\n  A --> B["`x --> y`"] --> C';
    const g = parseDiagram(chained);
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['A', 'B'], ['B', 'C']]);
    expect(g.nodes.find(n => n.id === 'B')?.raw).toBe('["`x --> y`"]');
  });

  it('a --- token inside a quoted label never splits the edge', () => {
    const g = parseDiagram('flowchart LR\n  A["a --- b"] --> B');
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['A', 'B']]);
    expect(g.nodes.find(n => n.id === 'A')?.raw).toBe('["a --- b"]');
  });

  it('an arrow inside an unquoted bracket label never wins the first-hop split', () => {
    const g = parseDiagram('flowchart LR\n  A[x --> y] --> B');
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['A', 'B']]);
    expect(g.nodes.find(n => n.id === 'A')?.raw).toBe('[x --> y]');
  });
});
