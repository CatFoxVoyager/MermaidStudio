// EDGE-01 battery (40-02): the probed-valid Flowchart arrow grammar pinned
// end-to-end. The fixture matrix IS the planning probe record
// (40-probe-grammar.cjs rounds 1-2 + 40-probe-glue.cjs at mermaid@12.3.0) —
// every VALID here parsed green in mermaid; every INVALID was probe-ERR.
// The matcher must agree with the engine on both sides: valid tokens parse
// to family + length and re-emit verbatim; invalid forms never match (the
// fence treats such lines as non-edge).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  parseDiagram,
  matchEdgeChain,
  updateEdgeArrowType,
  updateEdgeLabel,
  updateEdgeMetadata,
  removeEdge,
  bodyHasUnparsedAtDirective,
} from '@/lib/mermaid/codeUtils';

const doc = (body: string): string => `flowchart LR\n${body}`;

/** The line parses to exactly one edge with the expected family token. */
function expectEdge(source: string, src: string, tgt: string, arrowType: string, length?: number) {
  const g = parseDiagram(source);
  const edges = g.edges.filter(e => e.source === src && e.target === tgt);
  expect(edges).toHaveLength(1);
  expect(edges[0].arrowType).toBe(arrowType);
  // length is OMITTED at 1 (the plain token) — normalize both sides.
  expect(edges[0].length ?? 1).toBe(length ?? 1);
  return edges[0];
}

/** The line produces NO edge (and the fence does not claim it consumable). */
function expectNoEdge(line: string) {
  const g = parseDiagram(doc(`  ${line}`));
  expect(g.edges).toHaveLength(0);
  expect(matchEdgeChain(line)).toBeNull();
}

describe('EDGE-01 valid single-length core tokens (14 + legacy leading dot)', () => {
  const core: Array<[string, string]> = [
    ['A --> B', '-->'],
    ['A --- B', '---'],
    ['A -.-> B', '-.->'],
    ['A ==> B', '==>'],
    ['A o--o B', 'o--o'],
    ['A x--x B', 'x--x'],
    ['A <--> B', '<-->'],
    ['A -.- B', '-.-'],
    ['A === B', '==='],
    ['A ~~~ B', '~~~'],
    ['A <-.-> B', '<-.->'],
    ['A <==> B', '<==>'],
    ['A --o B', '--o'],
    ['A --x B', '--x'],
  ];
  for (const [line, token] of core) {
    it(`parses \`${line}\` to the family token \`${token}\` at length 1`, () => {
      expectEdge(doc(`  ${line}`), 'A', 'B', token, 1);
    });
  }
  it('legacy leading-dot `.->` parses and round-trips (never picker-emitted)', () => {
    expectEdge(doc('  A .-> B'), 'A', 'B', '.->', 1);
  });
  it('glued targets are legal zero-space tails (`-->B`, `----oB`, `o==oB`)', () => {
    // probe-glue: PARSE OK for every glued family spelling
    expectEdge(doc('  A -->B'), 'A', 'B', '-->', 1);
    expectEdge(doc('  A ----oB'), 'A', 'B', '--o', 3);
    expectEdge(doc('  A o==oB'), 'A', 'B', 'o==o', 1);
  });
});

describe('EDGE-01 length-1 circle/cross start forms never match (probe ERR)', () => {
  it('`o--` is not an edge token in any spelling (spaced, glued, labeled)', () => {
    expectNoEdge('A o-- B');
    expectNoEdge('A o--B');
    expectNoEdge('A o--|lbl| B');
    expect(matchEdgeChain('A o-- B')).toBeNull();
  });
  it('`x--` is not an edge token in any spelling', () => {
    expectNoEdge('A x-- B');
    expectNoEdge('A x--B');
    expectNoEdge('A x--|lbl| B');
  });
  it('`o---` / `x---` DO match (circle/cross start, length 1)', () => {
    expectEdge(doc('  A o--- B'), 'A', 'B', 'o--', 1);
    expectEdge(doc('  A x--- B'), 'A', 'B', 'x--', 1);
  });
});

describe('EDGE-01 the Sequence-invalid flag tokens match nowhere', () => {
  it('source-level: codeUtils.ts carries no flag-token literal (grep clean)', () => {
    // resolved from the vitest root (import.meta.url is a module-space URL
    // under the Vite transform, not file://)
    const src = readFileSync('src/lib/mermaid/codeUtils.ts', 'utf8');
    expect(src.includes('--|>')).toBe(false);
    // The old enumeration's quoted `'|>'` alternative and its `--\|>` regex
    // fragment are gone (pre-existing `|` alternation pipes inside shape
    // regexes are NOT the token — they stay).
    expect(/['"]\|>['"]/.test(src)).toBe(false);
    expect(src.includes('--\\|>')).toBe(false);
  });
  it('behavior: `--|>` and `|>` lines parse to no edge', () => {
    expectNoEdge('A --|> B');
    expectNoEdge('A |> B');
  });
});

describe('EDGE-01 invalid combos never match (probe ERR)', () => {
  it('`o-.o` / `x-.x` (compact 4-char dotted forms) never match', () => {
    expectNoEdge('A o-.o B');
    expectNoEdge('A x-.x B');
  });
  it('`==>>` never matches', () => {
    expectNoEdge('A ==>> B');
  });
  it('glued marker chars after arrow-final tokens never match (`-->o B`, `-..->o B`, `==>o B`)', () => {
    // probe-glue: the o/x glues into an invalid lexeme — the matcher must
    // refuse where a normal glued id char (`-->B`) is legal
    expectNoEdge('A -->o B');
    expectNoEdge('A -->x B');
    expectNoEdge('A -..->o B');
    expectNoEdge('A -..->x B');
    expectNoEdge('A ==>o B');
    // ...while the spaced form keeps its target (the glue is the defect)
    expectEdge(doc('  A --> o B'), 'A', 'o', '-->', 1);
  });
});

describe('EDGE-01 variable link lengths 1..10 parse to canonical + length', () => {
  const lengths: Array<[string, (n: number) => string, string, (span: string) => number]> = [
    // [family canonical, span builder, name, length-of-span]
    ['-->', n => `${'-'.repeat(n + 1)}>`, 'arrow', span => span.length - 2],
    ['-.-', n => `-${'.'.repeat(n)}-`, 'dottedOpen', span => span.length - 2],
    ['==>', n => `${'='.repeat(n + 1)}>`, 'thickArrow', span => span.length - 2],
    ['===', n => '='.repeat(n + 2), 'thickOpen', span => span.length - 2],
    ['<-->', n => `<${'-'.repeat(n + 1)}>`, 'bidiArrow', span => span.length - 3],
    ['~~~', n => '~'.repeat(n + 2), 'invisible', span => span.length - 2],
    ['o--o', n => `o${'-'.repeat(n + 1)}o`, 'circleBoth', span => span.length - 3],
    ['-.->', n => `-${'.'.repeat(n)}->`, 'dottedArrow', span => span.length - 3],
  ];
  for (const [canonical, build, name, lenOf] of lengths) {
    it(`${name} scales 1..10 (probe: every spelling PARSE OK)`, () => {
      for (let n = 1; n <= 10; n++) {
        const span = build(n);
        expect(lenOf(span)).toBe(n);
        expectEdge(doc(`  A ${span} B`), 'A', 'B', canonical, n);
      }
    });
  }
  it('circle/cross start scales from length 1 = 3 dashes (`o--` never; `o---` yes)', () => {
    for (let n = 1; n <= 10; n++) {
      expectEdge(doc(`  A o${'-'.repeat(n + 2)} B`), 'A', 'B', 'o--', n);
      expectEdge(doc(`  A x${'-'.repeat(n + 2)} B`), 'A', 'B', 'x--', n);
    }
  });
  it('probed combo families round-trip at their scaled spellings', () => {
    expectEdge(doc('  A o-..-o B'), 'A', 'B', 'o-.-o', 2);
    expectEdge(doc('  A x-..-> B'), 'A', 'B', 'x-.->', 2);
    expectEdge(doc('  A o===> B'), 'A', 'B', 'o==>', 2);
    expectEdge(doc('  A x===x B'), 'A', 'B', 'x==x', 2);
    expectEdge(doc('  A o----------o B'), 'A', 'B', 'o--o', 9); // 10 dashes = N+1
  });
});

describe('EDGE-01 authored spellings re-emit verbatim when untouched', () => {
  it('retyping hop 2 keeps hop 1’s authored length-4 spelling byte-identical', () => {
    // length 4 = 5 dashes (arrows emit N+1)
    const src = doc('  A -----> B -.-> C');
    const out = updateEdgeArrowType(src, 'B', 'C', '-->', 1);
    expect(out).toContain('A -----> B');
    expect(out).toContain('--> C');
    const g = parseDiagram(out);
    expect(g.edges.find(e => e.source === 'A')?.length).toBe(4);
  });
  it('an animate toggle (updateEdgeMetadata) never rewrites an authored length', () => {
    const src = doc('  A -----> B\n  B e2@-.-> C');
    const withMeta = updateEdgeMetadata(src, 'e2', { animate: true });
    expect(withMeta).toContain('A -----> B');
    expect(withMeta).toContain('B e2@-.-> C');
    expect(parseDiagram(withMeta).edges.find(e => e.source === 'A')?.length).toBe(4);
  });
  it('a length change via the family token rewrites only the length', () => {
    const src = doc('  A ----> B');
    const out = updateEdgeArrowType(src, 'A', 'B', '-->', 2);
    expect(out).toBe(doc('  A ---> B'));
    expect(parseDiagram(out).edges[0].length).toBe(2);
  });
});

describe('EDGE-01 mutator family table (minimums + bounds)', () => {
  it('updateEdgeArrowType(src, tgt, \'o--\', 1) emits `o---` (per-family minimum)', () => {
    const out = updateEdgeArrowType(doc('  A --> B'), 'A', 'B', 'o--', 1);
    expect(out).toBe(doc('  A o--- B'));
    expect(parseDiagram(out).edges[0].arrowType).toBe('o--');
  });
  it('updateEdgeArrowType(src, tgt, \'x--\', 1) emits `x---`', () => {
    expect(updateEdgeArrowType(doc('  A --> B'), 'A', 'B', 'x--', 1)).toBe(doc('  A x--- B'));
  });
  it('emission clamps to the probed 1..10 band (no unbounded runs)', () => {
    const out = updateEdgeArrowType(doc('  A --> B'), 'A', 'B', '-->', 500);
    expect(out).toBe(doc(`  A ${'-'.repeat(11)}> B`));
  });
  it('length below a family minimum clamps up (`o--` at 0 emits the minimum)', () => {
    expect(updateEdgeArrowType(doc('  A --> B'), 'A', 'B', 'o--', 0)).toBe(doc('  A o--- B'));
  });
  it('tokens outside the family table decline (source unchanged)', () => {
    const src = doc('  A --> B');
    expect(updateEdgeArrowType(src, 'A', 'B', '-->>', 1)).toBe(src);
    expect(updateEdgeArrowType(src, 'A', 'B', '--|>', 1)).toBe(src);
  });
});

describe('EDGE-01 amp chains', () => {
  it('`A & B --> C` yields two ParsedEdge entries sharing raw', () => {
    const g = parseDiagram(doc('  A & B --> C'));
    expect(g.edges).toHaveLength(2);
    expect(g.edges.map(e => [e.source, e.target])).toEqual([['A', 'C'], ['B', 'C']]);
    expect(new Set(g.edges.map(e => e.raw))).toEqual(new Set(['A & B --> C']));
    expect(g.nodes.map(n => n.id).sort()).toEqual(['A', 'B', 'C']);
  });
  it('`A --> B & C` yields two entries; `A & B --> C & D` yields four', () => {
    const g1 = parseDiagram(doc('  A --> B & C'));
    expect(g1.edges.map(e => [e.source, e.target])).toEqual([['A', 'B'], ['A', 'C']]);
    const g2 = parseDiagram(doc('  A & B --> C & D'));
    expect(g2.edges.map(e => [e.source, e.target])).toEqual([
      ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'],
    ]);
  });
  it('an amp line with a shared edge id links the id to every pair', () => {
    const g = parseDiagram(doc('  A & B e1@--> C'));
    expect(g.edges.every(e => e.edgeId === 'e1')).toBe(true);
    expect(g.edges).toHaveLength(2);
  });
  it('an arrow change rewrites the SHARED token once (every pair flips)', () => {
    const out = updateEdgeArrowType(doc('  A & B --> C & D'), 'A', 'C', 'o--', 1);
    expect(out).toBe(doc('  A & B o--- C & D'));
    expect(parseDiagram(out).edges.every(e => e.arrowType === 'o--')).toBe(true);
  });
  it('a label change rewrites the shared label once', () => {
    const out = updateEdgeLabel(doc('  A & B --> C'), 'A', 'C', 'go');
    expect(out).toBe(doc('  A & B -->|go| C'));
  });
  it('removing one pair drops that member; a singleton group drops the `&`', () => {
    const out1 = removeEdge(doc('  A & B --> C & D'), 'A', 'C');
    expect(out1).toBe(doc('  B --> C & D'));
    expect(parseDiagram(out1).edges.map(e => [e.source, e.target])).toEqual([['B', 'C'], ['B', 'D']]);
    const out2 = removeEdge(doc('  A & B --> C'), 'A', 'C');
    expect(out2).toBe(doc('  B --> C'));
    const out3 = removeEdge(doc('  A --> B & C'), 'A', 'C');
    expect(out3).toBe(doc('  A --> B'));
  });
  it('removing the last pair of a group line deletes the line (cascade intact)', () => {
    const src = doc('  A & B e1@--> C\n  e1@{ animate: true }');
    const out = removeEdge(src, 'A', 'C');
    // B->C survives with its id; the metadata line survives with it
    expect(out).toContain('B e1@--> C');
    expect(out).toContain('e1@{ animate: true }');
  });
  it('amp + multi-hop fences read-only (D6) and mutators decline', () => {
    const src = doc('  A & B --> C --> D');
    // parse-side still contributes the edges (mermaid parses this fine)
    const g = parseDiagram(src);
    expect(g.edges.length).toBeGreaterThanOrEqual(3);
    expect(bodyHasUnparsedAtDirective(src)).toBe(true);
    expect(updateEdgeArrowType(src, 'A', 'C', '==>', 1)).toBe(src);
    expect(removeEdge(src, 'A', 'C')).toBe(src);
  });
});

describe('EDGE-01 bare edge-id (`e1@-->`) survival across every mutation', () => {
  const SRC = doc('  A e1@--> B');
  it('survives an arrow change', () => {
    expect(updateEdgeArrowType(SRC, 'A', 'B', '==>', 1)).toBe(doc('  A e1@==> B'));
  });
  it('survives a length change', () => {
    expect(updateEdgeArrowType(SRC, 'A', 'B', '-->', 3)).toBe(doc('  A e1@----> B'));
  });
  it('survives a label change', () => {
    expect(updateEdgeLabel(SRC, 'A', 'B', 'go')).toBe(doc('  A e1@-->|go| B'));
  });
  it('survives a metadata change (strictly-after line, edge line untouched)', () => {
    const out = updateEdgeMetadata(SRC, 'e1', { animate: true });
    expect(out).toContain('  A e1@--> B');
    expect(out).toContain('e1@{ animate: true }');
  });
  it('survives per-hop chains (`A e1@--> B e2@--> C` mutations keep both ids)', () => {
    const chain = doc('  A e1@--> B e2@--> C');
    const out = updateEdgeArrowType(chain, 'B', 'C', '-.->', 1);
    expect(out).toContain('e1@');
    expect(out).toContain('e2@-.->');
    const g = parseDiagram(out);
    expect(g.edges.find(e => e.source === 'A')?.edgeId).toBe('e1');
    expect(g.edges.find(e => e.source === 'B')?.edgeId).toBe('e2');
  });
  it('pair removal on an amp line keeps the shared id on the survivor', () => {
    const out = removeEdge(doc('  A & B e1@--> C'), 'A', 'C');
    expect(out).toBe(doc('  B e1@--> C'));
  });
});

describe('EDGE-01 removeEdge keeps lengths on surviving hops', () => {
  it('removing hop 2 of a length-4 chain keeps the length-4 spelling', () => {
    const src = doc('  A -----> B --> C');
    const out = removeEdge(src, 'B', 'C');
    // the surviving hop's target-shape slice keeps its authored trailing
    // whitespace (landed emitHop contract) — trimEnd for the pin
    expect(out.trimEnd()).toBe(doc('  A -----> B'));
    expect(parseDiagram(out).edges[0].length).toBe(4);
  });
});

describe('EDGE-01 fence agreement (matcher and D6 cannot drift)', () => {
  it('a line the matcher rejects is a NON-EDGE (no edge entries, no hop to splice)', () => {
    // `-.->o` gates (the regex finds `-.->` inside) but the glue rule
    // rejects — the fence treats such a line as non-edge: nothing parses as
    // an edge and no writer finds a hop
    expect(parseDiagram(doc('  A -.->o B')).edges).toHaveLength(0);
    expect(matchEdgeChain('A -.->o B')).toBeNull();
    expect(updateEdgeArrowType(doc('  A -.->o B'), 'A', 'B', '-->', 1)).toBe(doc('  A -.->o B'));
  });
  it('valid grammar lines stay consumable', () => {
    expect(bodyHasUnparsedAtDirective(doc('  A o--- B'))).toBe(false);
    expect(bodyHasUnparsedAtDirective(doc('  A & B --> C'))).toBe(false);
    expect(bodyHasUnparsedAtDirective(doc('  A & B --> C & D'))).toBe(false);
    expect(bodyHasUnparsedAtDirective(doc('  A ----> B'))).toBe(false);
  });
});

describe('EDGE-01 addendum: parse-edit-emit cycles never reorder edges', () => {
  it('an arrow edit on a multi-edge document keeps the edge order', () => {
    const src = doc('  A --> B\n  B -.-> C\n  C o--o D\n  D ==> E');
    const g0 = parseDiagram(src).edges.map(e => [e.source, e.target]);
    let out = updateEdgeArrowType(src, 'B', 'C', '==>', 1);
    out = updateEdgeLabel(out, 'C', 'D', 'mid');
    out = removeEdge(out, 'D', 'E');
    const g1 = parseDiagram(out).edges.map(e => [e.source, e.target]);
    expect(g1).toEqual([['A', 'B'], ['B', 'C'], ['C', 'D']]);
    expect(g1.slice(0, 3)).toEqual(g0.slice(0, 3));
  });
  it('a length edit never reorders or relabels sibling edges', () => {
    const src = doc('  A -->|first| B\n  B ----> C\n  C --> D');
    const out = updateEdgeArrowType(src, 'B', 'C', '-->', 1);
    const g = parseDiagram(out);
    expect(g.edges.map(e => [e.source, e.target, e.label])).toEqual([
      ['A', 'B', 'first'], ['B', 'C', ''], ['C', 'D', ''],
    ]);
    expect(out).toContain('A -->|first| B');
    expect(out).toContain('C --> D');
  });
});

describe('EDGE-01 T-40-03: the family matcher stays linear on the per-keystroke path', () => {
  it('a 16KB line riddled with arrow-like label text parses under a bounded budget', () => {
    const chunk = 'A["label ----> more |fake| text"] -.-> ';
    const body = `  ${chunk.repeat(400)}Z`;
    const src = doc(body);
    const started = performance.now();
    const g = parseDiagram(src);
    const elapsed = performance.now() - started;
    expect(g.edges.length).toBeGreaterThanOrEqual(400);
    // The WR-02 quadratic engine measured seconds at 16KB; the linear walk
    // sits orders of magnitude below this generous ceiling (CI-safety 5s).
    expect(elapsed).toBeLessThan(5000);
  });
});
