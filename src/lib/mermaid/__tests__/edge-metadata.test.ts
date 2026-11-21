// EDGE-02 battery (40-01): typed edge metadata parse through the PROMOTED
// 39-01 span grammar, strictly-after emission, in-place replace idempotency,
// the D6 unknown-param fence, and the empty-span / no-reordering round-trip
// pins. Task 2 extends this battery to the full param set + the 13-curve
// round-trip backstop.
import { describe, it, expect } from 'vitest';
import { parseDiagram, updateEdgeMetadata, updateEdgeArrowType } from '@/lib/mermaid/codeUtils';

const BASE = 'flowchart LR\n  A e1@--> B\n  e1@{ animate: true }';
const META_BEFORE = 'flowchart LR\n  e1@{ animate: true }\n  A e1@--> B';

describe('edge metadata parse (EDGE-02 promoted span grammar)', () => {
  it('links a standalone e1@{...} line into typed metadata on the matching edge', () => {
    const g = parseDiagram(BASE);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].edgeId).toBe('e1');
    expect(g.edges[0].metadata?.animate).toBe(true);
  });

  it('attaches metadata placed BEFORE its edge line (registry is order-independent)', () => {
    const g = parseDiagram(META_BEFORE);
    expect(g.edges[0].metadata?.animate).toBe(true);
    // The registry keeps the line verbatim (cascade source of truth).
    expect(g.linkedDirectives.get('e1')).toEqual(['e1@{ animate: true }']);
  });

  it('keeps unknown keys in unknownParams verbatim, in original order', () => {
    const src = 'flowchart LR\n  A e1@--> B\n  e1@{ animate: true, foo: bar, animation: fast }';
    const meta = parseDiagram(src).edges[0].metadata;
    expect(meta?.animate).toBe(true);
    expect(meta?.animation).toBe('fast');
    expect(meta?.unknownParams).toEqual(['foo: bar']);
  });

  it('an empty metadata span (e1@{}) parses to no metadata', () => {
    const src = 'flowchart LR\n  A e1@--> B\n  e1@{}';
    const g = parseDiagram(src);
    expect(g.edges[0].metadata).toBeUndefined();
    // The registry still owns the verbatim line for cascade.
    expect(g.linkedDirectives.get('e1')).toEqual(['e1@{}']);
  });

  it('an orphan metadata line with no matching edge attaches to nothing', () => {
    const g = parseDiagram('flowchart LR\n  A --> B\n  e1@{ animate: true }');
    expect(g.edges.every(e => e.metadata === undefined)).toBe(true);
    expect(g.linkedDirectives.has('e1')).toBe(true);
  });

  it('a multi-param span types every field', () => {
    const src = 'flowchart LR\n  A e1@--> B\n  e1@{ animate: true, animation: fast, step: 2, curve: basis }';
    const meta = parseDiagram(src).edges[0].metadata;
    expect(meta?.animate).toBe(true);
    expect(meta?.animation).toBe('fast');
    expect(meta?.step).toBe(2);
    expect(meta?.curve).toBe('basis');
    expect(meta?.unknownParams ?? []).toHaveLength(0);
  });
});

describe('updateEdgeMetadata — emit / replace / remove', () => {
  it('{ animate: false } removes the existing metadata line', () => {
    const out = updateEdgeMetadata(BASE, 'e1', { animate: false });
    expect(out).not.toContain('e1@{');
    expect(out).toContain('A e1@--> B');
  });

  it('null removes the existing metadata line', () => {
    const out = updateEdgeMetadata(BASE, 'e1', null);
    expect(out).not.toContain('e1@{');
  });

  it('a populated metadata replaces an existing line IN PLACE (line count stable, no duplicate)', () => {
    const out = updateEdgeMetadata(BASE, 'e1', { animate: true, animation: 'fast' });
    const lines = out.split('\n');
    expect(lines).toHaveLength(BASE.split('\n').length);
    expect(out).not.toContain('e1@{ animate: true }');
    expect(out).toContain('e1@{ animate: true, animation: fast }');
    // Re-parsing the emitted source types the new field and stays linked.
    expect(parseDiagram(out).edges[0].metadata).toMatchObject({ animate: true, animation: 'fast' });
  });

  it('emission lands strictly AFTER the edge declaration line, never before, never inline', () => {
    const src = 'flowchart LR\n  A e1@--> B\n  C --> D';
    const out = updateEdgeMetadata(src, 'e1', { animate: true });
    const lines = out.split('\n');
    const edgeIdx = lines.findIndex(l => l.includes('A e1@--> B'));
    const metaIdx = lines.findIndex(l => l.trim() === 'e1@{ animate: true }');
    expect(metaIdx).toBe(edgeIdx + 1);
    // The insertion never rides the edge line itself.
    expect(lines[edgeIdx]).not.toContain('@{');
    // The unrelated edge after it is untouched.
    expect(lines[metaIdx + 1]).toBe('  C --> D');
  });

  it('a span carrying an unknown key returns source unchanged (D6 decline)', () => {
    const fenced = 'flowchart LR\n  A e1@--> B\n  e1@{ animate: true, foo: bar }';
    expect(updateEdgeMetadata(fenced, 'e1', { animate: false })).toBe(fenced);
    expect(updateEdgeMetadata(fenced, 'e1', { animate: true, animation: 'slow' })).toBe(fenced);
    expect(updateEdgeMetadata(fenced, 'e1', null)).toBe(fenced);
  });

  it('an unparseable existing span (e1@{}) declines mutation — source unchanged', () => {
    const src = 'flowchart LR\n  A e1@--> B\n  e1@{}';
    expect(updateEdgeMetadata(src, 'e1', { animate: true })).toBe(src);
    expect(updateEdgeMetadata(src, 'e1', null)).toBe(src);
  });

  it('inserting with no anchor (no edge line carries the id) returns source unchanged', () => {
    const src = 'flowchart LR\n  A --> B';
    expect(updateEdgeMetadata(src, 'e1', { animate: true })).toBe(src);
  });

  it('clearing with no existing line returns source unchanged (no-op mutation)', () => {
    const src = 'flowchart LR\n  A e1@--> B';
    expect(updateEdgeMetadata(src, 'e1', null)).toBe(src);
    expect(updateEdgeMetadata(src, 'e1', { animate: false })).toBe(src);
  });

  it('an invalid edge id never re-enters the source', () => {
    const src = 'flowchart LR\n  A e1@--> B\n  e1@{ animate: true }';
    expect(updateEdgeMetadata(src, 'e1; drop', { animate: true })).toBe(src);
    expect(updateEdgeMetadata(src, '', { animate: true })).toBe(src);
  });

  it('emission respects the line indent of its edge declaration', () => {
    const src = 'flowchart LR\n    A e1@--> B';
    const out = updateEdgeMetadata(src, 'e1', { animate: true });
    expect(out.split('\n')[1]).toBe('    A e1@--> B');
    expect(out.split('\n')[2]).toBe('    e1@{ animate: true }');
  });

  it('parse-edit-emit cycles never reorder edges', () => {
    const src = [
      'flowchart LR',
      '  A e1@--> B',
      '  B e2@--> C',
      '  C e3@--> D',
      '  e2@{ animate: true }',
    ].join('\n');
    const before = parseDiagram(src).edges.map(e => e.edgeId);
    const out = updateEdgeMetadata(src, 'e2', { animate: true, step: 3 });
    const after = parseDiagram(out).edges.map(e => e.edgeId);
    expect(after).toEqual(before);
    expect(after).toEqual(['e1', 'e2', 'e3']);
    // A second edit on a different edge keeps the order stable too.
    const out2 = updateEdgeArrowType(out, 'B', 'C', '-.->');
    expect(parseDiagram(out2).edges.map(e => e.edgeId)).toEqual(['e1', 'e2', 'e3']);
  });
});
