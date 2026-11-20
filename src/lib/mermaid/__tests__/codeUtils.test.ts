/**
 * Tests for Mermaid code utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseDiagram,
  updateNodeStyle,
  updateNodeLabel,
  updateNodeShape,
  addNode,
  removeNode,
  addEdge,
  getNodeStyle,
  generateNodeId,
  parseFrontmatter,
  generateFrontmatter,
  applyNodePreset,
  parseLinkStyles,
  edgeStyleToString,
  updateLinkStyle,
  removeLinkStyles,
  removeEdge,
  removeSubgraph,
  updateEdgeArrowType,
  updateEdgeLabel,
  bodyHasUnparsedAtDirective,
} from '../codeUtils';
import {
  extractThemeIdFromContent,
  applyThemeToFrontmatter,
  injectThemeComment,
} from '@/constants/themeDerivation';
import { getThemeById } from '@/constants/themes';
import type { NodeShape } from '../codeUtils';
import { CANONICAL_SHAPES, ALIAS_TO_CANONICAL } from '../shapes';

describe('Mermaid Code Utilities', () => {
  describe('parseDiagram', () => {
    it('should parse a simple flowchart', () => {
      const source = 'flowchart TD\nA-->B';
      const result = parseDiagram(source);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].id).toBe('A');
      expect(result.nodes[1].id).toBe('B');
    });

    it('should parse nodes with different shapes', () => {
      const source = 'flowchart TD\nA[Start]\nB(End)\nC{Decision}';
      const result = parseDiagram(source);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[0].shape).toBe('rect');
      // 38-02: the parse side speaks canonical shortNames (round→rounded,
      // rhombus→diam through the SHAPE_PATTERNS re-key).
      expect(result.nodes[1].shape).toBe('rounded');
      expect(result.nodes[2].shape).toBe('diam');
    });

    // Phase 26 (26-01): legacy triple-paren double-circle syntax — the
    // unquoted form must parse into a dbl-circ node with the bare label,
    // never leak the outer parens into the label (greedy circle steal).
    it('should parse unquoted triple-paren nodes as double-circle', () => {
      const source = 'flowchart TD\nA(((Stop)))';
      const result = parseDiagram(source);

      expect(result.nodes[0].shape).toBe('dbl-circ');
      expect(result.nodes[0].label).toBe('Stop');
    });

    it('should parse quoted triple-paren nodes as double-circle with clean labels', () => {
      const source = 'flowchart TD\nA((("Stop")))';
      const result = parseDiagram(source);

      expect(result.nodes[0].shape).toBe('dbl-circ');
      expect(result.nodes[0].label).toBe('Stop');
      expect(result.nodes[0].label).not.toContain('"');
    });

    it('should keep double-paren nodes as circle (greedy non-interference)', () => {
      const source = 'flowchart TD\nA((x))';
      const result = parseDiagram(source);

      expect(result.nodes[0].shape).toBe('circle');
      expect(result.nodes[0].label).toBe('x');
    });

    it('should parse edges with labels', () => {
      const source = 'flowchart TD\nA-->|yes|B';
      const result = parseDiagram(source);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].label).toBe('yes');
    });

    it('should parse subgraphs', () => {
      const source = 'flowchart TD\nsubgraph S\nA-->B\nend';
      const result = parseDiagram(source);

      // Should not crash on subgraph
      expect(result).toBeDefined();
    });

    it('should parse style definitions', () => {
      const source = 'flowchart TD\nA-->B\nstyle A fill:red';
      const result = parseDiagram(source);

      expect(result.styles.get('A')).toEqual({
        fill: 'red',
      });
    });

    it('should parse class definitions', () => {
      const source = 'flowchart TD\nA-->B\nclassDef A fill:red';
      const result = parseDiagram(source);

      expect(result.classDefs.get('A')).toEqual({
        fill: 'red',
      });
    });

    it('should parse node classes', () => {
      const source = 'flowchart TD\nA-->B\nclass A myClass';
      const result = parseDiagram(source);

      expect(result.nodeClasses.get('A')).toEqual(['myClass']);
    });

    it('should handle comments', () => {
      const source = '%% This is a comment\nflowchart TD\nA-->B';
      const result = parseDiagram(source);

      expect(result.nodes).toHaveLength(2);
    });

    it('should handle empty input', () => {
      const result = parseDiagram('');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should parse FontAwesome icon syntax', () => {
      const source = 'flowchart TD\nA[@{ icon: "fa:user", form: "square", label: "User", pos: "t", h: 60 }]';
      const result = parseDiagram(source);

      expect(result.nodes[0].icon).toBeDefined();
      expect(result.nodes[0].icon?.icon).toBe('fa:user');
      expect(result.nodes[0].icon?.form).toBe('square');
      expect(result.nodes[0].icon?.label).toBe('User');
      expect(result.nodes[0].icon?.pos).toBe('t');
      expect(result.nodes[0].icon?.h).toBe(60);
    });

    it('should parse markdown-style labels', () => {
      const source = 'flowchart TD\nA[`**bold**`]';
      const result = parseDiagram(source);

      expect(result.nodes[0].label).toBe('**bold**');
    });

    it('should parse click events and skip them', () => {
      const source = 'flowchart TD\nA-->B\nclick A "https://example.com"\nclick B callback "Tooltip"';
      const result = parseDiagram(source);

      // Should not crash, click events are skipped
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should parse subgraph direction and skip it', () => {
      const source = 'flowchart TD\nsubgraph S\n direction LR\nA-->B\nend';
      const result = parseDiagram(source);

      // Should not crash, direction is skipped
      expect(result).toBeDefined();
    });

    it('should parse new edge types', () => {
      const source = 'flowchart TD\nA~~~B\nAx--xB\nC--oD\nEo--F\nG--|>H';
      const result = parseDiagram(source);

      expect(result.edges).toHaveLength(5);
      expect(result.edges[0].arrowType).toBe('~~~');
      expect(result.edges[1].arrowType).toBe('x--x');
      expect(result.edges[2].arrowType).toBe('--o');
      expect(result.edges[3].arrowType).toBe('o--');
      expect(result.edges[4].arrowType).toBe('--|>');
    });

    it('silently drops a bare post-id metadata line (D6 corruption vector — observation test)', () => {
      // REVERSED in Phase 27 (27-01): the parser upgrade this comment
      // anticipated has landed. The bare post-id form — the exact output of
      // this module's own directive emission — previously matched no parse
      // rule (arrow test, node regex, STANDALONE) and vanished from
      // parsed.nodes; the standalone directive branch now parses it into a
      // typed node carrying its verbatim span, and the D6 gate narrowed to
      // fence only the forms the parser still cannot consume. Same test id
      // and shape kept so the history stays greppable.
      const source = 'flowchart TD\n  A[Start] --> B\n  C@{ shape: "doc", label: "Doc" }';
      const result = parseDiagram(source);

      expect(result.nodes.some(n => n.id === 'A')).toBe(true);
      expect(result.nodes.some(n => n.id === 'B')).toBe(true);
      // Node C exists only through the metadata line — now parsed typed.
      const nodeC = result.nodes.find(n => n.id === 'C');
      expect(nodeC).toBeDefined();
      expect(nodeC?.shape).toBe('doc');
      expect(nodeC?.label).toBe('Doc');
      expect(result.edges).toHaveLength(1);
    });

    // Phase 27 (27-01 Task 1, tracer RED): the directive form parses into a
    // typed node carrying its verbatim original span. The standalone branch
    // does not exist yet, so the line is dropped entirely.
    it('parses a standalone at-brace directive node into a typed node (tracer)', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "Alice" }';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'A');
      expect(node).toBeDefined();
      expect(node?.shape).toBe('person');
      expect(node?.label).toBe('Alice');
      expect(node?.directiveRaw).toBe('@{ shape: "person", label: "Alice" }');
    });

    // ===== Phase 27 (27-01 Task 2): the directive parse matrix — every
    // probe defect from the research baseline (Q5 P2/P5/P6/P9 + R-series
    // forms) pinned as a green case against the Task 1 skeleton. =====

    it('parses a subgraph-wrapped directive node with its parent set', () => {
      const source = 'flowchart TD\n  subgraph S1\n    A@{ shape: "person", label: "P" }\n  end';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'A');
      expect(node?.shape).toBe('person');
      expect(node?.label).toBe('P');
      expect(node?.parentSubgraphId).toBe('S1');
    });

    it('captures unknown params verbatim from an edge-line directive span', () => {
      const source = 'flowchart TD\nA@{ shape: "doc", label: "D", w: 100 } --> B';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'A');
      expect(node?.shape).toBe('doc');
      expect(node?.label).toBe('D');
      expect(node?.unknownParams).toEqual(['w: 100']);
      expect(result.edges).toHaveLength(1);
    });

    it('unescapes backslash-escaped double quotes in directive labels', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "He said \\"hi\\"" }';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'A');
      expect(node?.label).toBe('He said "hi"');
      expect(node?.label).not.toContain('\\');
    });

    it('parses a target-side directive span into a typed node', () => {
      const source = 'flowchart TD\nA --> B@{ shape: "person", label: "P" }';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'B');
      expect(node?.shape).toBe('person');
      expect(node?.label).toBe('P');
    });

    it('defaults a no-label directive to the node id (mermaid vertex.text semantics)', () => {
      const source = 'flowchart TD\nA@{ shape: doc } --> B';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'A');
      expect(node?.shape).toBe('doc');
      expect(node?.label).toBe('A');
    });

    it('preserves an unknown shape key verbatim with authoredShape (38-02 deletes the rect fallback)', () => {
      // Same test id and span kept so the history stays greppable: the
      // pre-38-02 behavior silently mapped the unknown token to rect and
      // discarded it; authoredShape preservation keeps it verbatim.
      const source = 'flowchart TD\nA@{ shape: "future-shape", label: "X" }';
      const result = parseDiagram(source);

      const node = result.nodes.find(n => n.id === 'A');
      expect(node?.shape).toBe('future-shape');
      expect(node?.authoredShape).toBe('future-shape');
      expect(node?.label).toBe('X');
      expect(node?.directiveRaw).toBe('@{ shape: "future-shape", label: "X" }');
    });

    it('declines the space-separated directive form (invalid mermaid 12.1.0)', () => {
      const result = parseDiagram('flowchart TD\nA @{ shape: "person" }');

      expect(result.nodes.find(n => n.id === 'A')).toBeUndefined();
    });

    // Phase 27 review WR-04: the spaced form is declined on edge lines too —
    // the edge capture previously trimmed the leading whitespace and
    // attached the span as a directive (asymmetric with the standalone rule).
    it('declines the space-separated directive form on an edge line too (WR-04)', () => {
      const result = parseDiagram('flowchart TD\nA --> B @{ shape: "person", label: "P" }');
      const b = result.nodes.find(n => n.id === 'B');

      expect(b?.directiveRaw).toBeUndefined();
    });

    // Phase 27 review WR-03: the junk two-span form must not produce a
    // directive node — the greedy capture used to swallow the residual
    // second span as the shape token and the fence called it consumable.
    it('does not parse a junk two-span line into a directive node (WR-03)', () => {
      const result = parseDiagram('flowchart TD\nA@{ shape: person } @{ shape: doc }');

      expect(result.nodes.find(n => n.id === 'A')).toBeUndefined();
    });

    it('handles commas and closing braces inside quoted directive labels', () => {
      const comma = parseDiagram('flowchart TD\nA@{ shape: "person", label: "a, b" }');
      expect(comma.nodes.find(n => n.id === 'A')?.label).toBe('a, b');

      const brace = parseDiagram('flowchart TD\nA@{ shape: "person", label: "a } b" }');
      expect(brace.nodes.find(n => n.id === 'A')?.label).toBe('a } b');
    });
  });

  // Phase 27 (27-01): the D6 gate narrowed from presence-based to
  // parse-completeness — a body line carrying `@{` fences only when the
  // directive rules cannot fully consume it. The frontmatter and init
  // exclusions below are the THM-03 pair pinned since the original gate;
  // they must survive every rewrite of the computation.
  describe('bodyHasUnparsedAtDirective (D6 parse-completeness gate)', () => {
    it('returns false for a plain flowchart (no metadata)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\n  A --> B')).toBe(false);
    });

    it('returns true for a body occurrence (space-separated form)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\n  A @{ shape: doc } ')).toBe(true);
    });

    it('returns false for the bare post-id form now that the parser consumes it', () => {
      expect(
        bodyHasUnparsedAtDirective('flowchart TD\n  A-->B\n  B@{ shape: "doc", label: "Doc" }'),
      ).toBe(false);
    });

    it('returns false when the only occurrence sits inside frontmatter (THM-03 config is legitimate)', () => {
      const source = '---\ntitle: T\nconfig:\n  metadata: "@{ view: collapsed }"\n---\nflowchart TD\n  A --> B';
      expect(bodyHasUnparsedAtDirective(source)).toBe(false);
    });

    it('returns false when the only occurrence sits inside a legacy init directive', () => {
      const source = '%%{init: {"theme":"dark"}}%%\nflowchart TD\nA-->B';
      expect(bodyHasUnparsedAtDirective(source)).toBe(false);
    });

    it('lets a well-formed standalone directive node through (editable)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: "person", label: "Alice" }')).toBe(false);
    });

    // ===== Full contract (27-01 Task 3): the residual read-only set is
    // exactly the four research-named forms — malformed/unclosed spans, the
    // space-separated form, subgraph-header directives, icon-param lines.
    // Everything below the keep-side trio is the editable side. =====

    it('returns false for an unknown shape key (preserved verbatim, editable)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: "future-shape", label: "X" }')).toBe(false);
    });

    it('returns false for an escaped-quote label (parse unescapes, writer re-escapes)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: "person", label: "He said \\"hi\\"" }')).toBe(false);
    });

    it('returns false for a multi-param span (unknown params preserved)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: "delay", label: "W", w: 80 }')).toBe(false);
    });

    it('returns true for an unclosed at-brace span (malformed)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\n  A[Start] --> B\n  B@{ shape: "doc", label: "Doc"')).toBe(true);
    });

    it('returns true for a subgraph header carrying a directive', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nsubgraph S1 @{ view: collapsed }\nA --> B\nend')).toBe(true);
    });

    it('returns true for icon-param lines (no icon write-back)', () => {
      // The standalone icon form, and an icon param riding on a shape span —
      // a rename would silently lose the icon config either way (A5).
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ icon: "fa:user", form: "square", label: "U" }')).toBe(true);
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: "doc", label: "D", icon: "fa:user" }')).toBe(true);
    });

    // Phase 27 review WR-04: the space-separated directive form is invalid
    // mermaid 12.1.0 — declined standalone (pinned above) and, since this
    // fix, declined on edge lines too (both source and target attachment).
    it('returns true for the space-separated directive form on an edge line', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA @{ shape: "person", label: "P" } --> B')).toBe(true);
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA --> B @{ shape: "person", label: "P" }')).toBe(true);
    });

    // Phase 27 review WR-03: unquoted shape values are token-validated and
    // an unquoted `}` ends the span — a greedy two-span line used to parse
    // as one editable rect whose shape token was the junk string
    // `person } @{ shape: doc`, and a rename would re-emit it quoted.
    it('returns true for a junk two-span directive line (unquoted shape token)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: person } @{ shape: doc }')).toBe(true);
    });

    it('returns false for a bare unquoted shape token (still editable)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart TD\nA@{ shape: person }')).toBe(false);
    });

    // ===== Backlog C: bare 12.3 edge ids (`A e1@--> B`) and chained hops
    // (`A --> B --> C`) were fenced while the mutation writers dropped their
    // trailing content; the writers are chain/edge-id safe now (gated by
    // chain-survival.test.ts), so both forms are EDITABLE. These pins keep
    // the fence from creeping back onto them. =====
    it('does not fence bare edge-id lines (writers are chain-safe)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A e1@--> B e2@--> C')).toBe(false);
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A e1@--> B')).toBe(false);
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A e1@-->|yes| B')).toBe(false);
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A e1@-.-> B')).toBe(false);
    });

    it('does not fence multi-hop chain lines (writers are chain-safe)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A --> B --> C')).toBe(false);
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A --> B{q} --> C')).toBe(false);
    });

    it('does not fence plain edges', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A --> B\n  B --> C')).toBe(false);
    });

    it('does not fence @ followed by a letter (emails, mentions in labels)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A[contact user@site.com] --> B')).toBe(false);
    });

    it('still lets a consumed metadata edge span through', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A e1@{ shape: "person" } --> B')).toBe(false);
    });

    it('does not fence single-hop lines', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A --> B')).toBe(false);
    });

    it('does not fence an arrow inside an edge label (not a hop)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A -->|x --> y| B')).toBe(false);
    });

    it('does not fence an arrow inside a target shape span (not a hop)', () => {
      expect(bodyHasUnparsedAtDirective('flowchart LR\n  A --> B{text --> more}')).toBe(false);
    });

    // 12.3 step animation: standalone `@{ step: n }` spans ride unknown
    // (non-icon) params, which the directive rules already consume — the
    // whole step flowchart stays editable now that its bare-id edge lines
    // are unfenced too.
    it('does not fence step-metadata flowcharts', () => {
      expect(
        bodyHasUnparsedAtDirective('flowchart LR\n  A e1@--> B e2@--> C\n  e1@{ step: 1 }\n  e2@{ step: 2 }')
      ).toBe(false);
    });
  });

  describe('parseDiagram — chained edge lines (multi-hop)', () => {
    it('keeps every hop node and edge', () => {
      const result = parseDiagram('flowchart LR\n  A --> B --> C');
      expect(result.nodes.map(n => n.id)).toEqual(['A', 'B', 'C']);
      expect(result.edges.map(e => [e.source, e.target])).toEqual([
        ['A', 'B'],
        ['B', 'C'],
      ]);
    });

    it('keeps four hops in one line', () => {
      const result = parseDiagram('flowchart LR\n  A --> B --> C --> D');
      expect(result.nodes.map(n => n.id)).toEqual(['A', 'B', 'C', 'D']);
      expect(result.edges).toHaveLength(3);
    });

    it('keeps per-hop labels and arrow types', () => {
      const result = parseDiagram('flowchart LR\n  A -->|yes| B -.-> C');
      expect(result.edges.map(e => [e.source, e.target, e.label, e.arrowType])).toEqual([
        ['A', 'B', 'yes', '-->'],
        ['B', 'C', '', '-.->'],
      ]);
    });

    it('slices hop shape spans at the next arrow', () => {
      const result = parseDiagram('flowchart LR\n  A --> B{q?} --> C(round)');
      const b = result.nodes.find(n => n.id === 'B');
      const c = result.nodes.find(n => n.id === 'C');
      expect(b?.label).toBe('q?');
      expect(b?.raw).toBe('{q?}');
      expect(c?.label).toBe('round');
      expect(c?.raw).toBe('(round)');
    });

    it('does not split an arrow inside a shape label', () => {
      const result = parseDiagram('flowchart LR\n  A --> B{text --> more}');
      expect(result.nodes.map(n => n.id)).toEqual(['A', 'B']);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes.find(n => n.id === 'B')?.label).toBe('text --> more');
    });

    it('does not split an arrow inside a quoted label', () => {
      const result = parseDiagram('flowchart LR\n  A --> B["-->"] --> C');
      expect(result.nodes.map(n => n.id)).toEqual(['A', 'B', 'C']);
      expect(result.edges.map(e => e.target)).toEqual(['B', 'C']);
    });

    it('does not treat an arrow inside an edge label as a hop', () => {
      const result = parseDiagram('flowchart LR\n  A -->|x --> y| B');
      expect(result.nodes.map(n => n.id)).toEqual(['A', 'B']);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].label).toBe('x --> y');
    });
  });

  // Phase 27 review WR-02: the fence and the parser share one arrow-line
  // matcher. The old single regex paired two lazy quantifiers with the
  // 14-alternative arrow group and went quadratic on long @{ lines
  // (measured x4 per size doubling, seconds at 16 KB); the replacement
  // enumerates arrow candidates linearly. These pins lock the semantics the
  // rewrite must preserve — winner selection (including the mangled
  // divider-in-label split the fence depends on) — plus the multi-char id
  // capture the old lazy group truncated to its first character.
  describe('arrow-line matcher semantics (WR-02)', () => {
    it('captures a multi-char edge source id in full (old lazy group truncated it)', () => {
      const result = parseDiagram('flowchart TD\nnode1 --> node2');

      expect(result.edges.map(e => [e.source, e.target])).toEqual([['node1', 'node2']]);
      expect(result.nodes.map(n => n.id).sort()).toEqual(['node1', 'node2']);
    });

    it('captures a multi-char directive-source edge without mangling', () => {
      const result = parseDiagram('flowchart TD\nab1@{ shape: "doc", label: "D" } --> B');
      const a = result.nodes.find(n => n.id === 'ab1');

      expect(a?.shape).toBe('doc');
      expect(a?.directiveRaw).toBe('@{ shape: "doc", label: "D" }');
      expect(result.edges.map(e => [e.source, e.target])).toEqual([['ab1', 'B']]);
    });

    it('keeps the divider-in-label winner the fence mirrors (mangled split stays fenced)', () => {
      const line = 'A@{ shape: "rect", label: "aa----bb" } --> B';
      const result = parseDiagram('flowchart TD\n' + line);

      // The winner is the `---` inside the label (target `bb`), exactly as
      // the old engine chose it — the truncated span then fails
      // parseAtDirective and the fence keeps the document read-only.
      expect(result.edges.map(e => [e.arrowType, e.target])).toEqual([['---', 'bb']]);
      expect(bodyHasUnparsedAtDirective('flowchart TD\n' + line)).toBe(true);
    });

    it('parses a 16KB divider-in-label line with the same verdict (scale guard)', () => {
      const filler = 'a'.repeat(8 * 1024);
      const line = 'A@{ shape: "rect", label: "' + filler + '----' + filler + '" } --> B';
      const result = parseDiagram('flowchart TD\n' + line);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.arrowType).toBe('---');
      expect(result.edges[0]?.target).toBe(filler);
      expect(bodyHasUnparsedAtDirective('flowchart TD\n' + line)).toBe(true);
    });

    it('parses a 16KB well-formed directive edge line cleanly (scale guard)', () => {
      const label = 'long label ' + 'x'.repeat(16 * 1024);
      const line = 'A@{ shape: "rect", label: "' + label + '" } --> B';
      const result = parseDiagram('flowchart TD\n' + line);

      expect(result.edges.map(e => [e.source, e.target])).toEqual([['A', 'B']]);
      expect(result.nodes.find(n => n.id === 'A')?.label).toBe(label);
      expect(bodyHasUnparsedAtDirective('flowchart TD\n' + line)).toBe(false);
    });
  });

  describe('updateNodeStyle', () => {
    it('should add style to node', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeStyle(source, 'A', { fill: 'red' });

      expect(result).toContain('style A fill:red');
    });

    it('should update existing style', () => {
      const source = 'flowchart TD\nA-->B\nstyle A fill:blue';
      const result = updateNodeStyle(source, 'A', { fill: 'red' });

      expect(result).toContain('style A fill:red');
    });

    it('should remove style if empty', () => {
      const source = 'flowchart TD\nA-->B\nstyle A fill:red';
      const result = updateNodeStyle(source, 'A', {});

      expect(result).not.toContain('style A');
    });

    it('should handle multiple style properties', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeStyle(source, 'A', {
        fill: 'red',
        stroke: 'blue',
      });

      expect(result).toContain('style A fill:red,stroke:blue');
    });
  });

  describe('updateNodeLabel', () => {
    it('should update node label with quotes', () => {
      const source = 'flowchart TD\nA[OldLabel]-->B';
      const result = updateNodeLabel(source, 'A', 'NewLabel');

      expect(result).toContain('A[NewLabel]');
      expect(result).not.toContain('OldLabel');
    });

    it('should preserve node shape', () => {
      const source = 'flowchart TD\nA(Label1)';
      const result = updateNodeLabel(source, 'A', 'Label2');

      expect(result).toContain('A(Label2)');
    });

    it('should handle node without shape (implicit node definition)', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeLabel(source, 'A', 'NewLabel');

      // Should add shape with new label for source node (no quotes)
      expect(result).toContain('A[NewLabel]');
      expect(result).toContain('-->');
      expect(result).toContain('B');
      expect(result).toBe('flowchart TD\nA[NewLabel]-->B');
    });

    it('should handle target node without shape', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeLabel(source, 'B', 'NewLabel');

      // Should add shape with new label for target node (no quotes)
      expect(result).toContain('A-->');
      expect(result).toContain('B[NewLabel]');
      expect(result).toBe('flowchart TD\nA-->B[NewLabel]');
    });

    // Phase 26 (26-01) round-trip: renaming a double-circle node must keep
    // the triple-paren wrap — today the parse reads it as circle and the
    // rewrite degrades to a double-paren circle.
    it('should preserve the double-circle triple-paren wrap on rename', () => {
      const source = 'flowchart TD\nA(((Stop)))';
      const result = updateNodeLabel(source, 'A', 'Renamed');

      expect(result).toContain('(((');
      expect(result).toContain('A(((Renamed)))');
    });

    // Phase 27 (27-01 Task 1, tracer RED): renaming a person directive node
    // rebuilds the line through the directive writer. Today the standalone
    // gate has no directive alternative and the source comes back unchanged.
    it('should rebuild the directive wrap on rename of a person node', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "Alice" }';
      const result = updateNodeLabel(source, 'A', 'Bob');

      expect(result).toContain('@{ shape: "person", label: "Bob" }');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
    });

    // Phase 27 (27-01 Task 2, RED): rename of an edge-defined directive node
    // keeps the unknown params verbatim (research probe P4 flipped).
    it('keeps unknown params on rename of an edge-defined directive node', () => {
      const source = 'flowchart TD\nA@{ shape: "doc", label: "D", w: 100 } --> B';
      const result = updateNodeLabel(source, 'A', 'Renamed');

      expect(result).toContain('@{ shape: "doc", label: "Renamed", w: 100 }');
      expect(result).toContain('-->');
      expect(result).toContain('B');
    });

    // Round-trip with a double-quote in the label must survive twice
    // consecutively: unescape on parse, re-escape on emission.
    it('round-trips an escaped-quote label through rename twice', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "He said \\"hi\\"" }';
      const once = updateNodeLabel(source, 'A', 'Say "go"');
      expect(once).toContain('label: "Say \\"go\\""');

      const twice = updateNodeLabel(once, 'A', 'Say "stop"');
      expect(twice).toContain('label: "Say \\"stop\\""');
    });

    // Phase 27 review CR-01: a backslash in the label must be escaped on
    // emission (before quotes) and unescaped symmetrically on parse. The
    // writer previously escaped only `"`, so a trailing-backslash rename
    // with trailing params emitted `label: "C:path\", w: 80 }` — the app's
    // own parser read that `\"` as an escaped quote, quote state never
    // closed, the node vanished from the parse and the doc fenced read-only.
    it('round-trips a trailing-backslash label with trailing params through rename', () => {
      const source = 'flowchart TD\nA@{ shape: "rect", label: "C:path", w: 80 }';
      const renamed = updateNodeLabel(source, 'A', 'C:\\path\\');

      expect(renamed).toBe('flowchart TD\nA@{ shape: "rect", label: "C:\\\\path\\\\", w: 80 }');

      const reparsed = parseDiagram(renamed);
      const node = reparsed.nodes.find(n => n.id === 'A');
      expect(node?.label).toBe('C:\\path\\');
      expect(node?.unknownParams).toEqual(['w: 80']);
      expect(bodyHasUnparsedAtDirective(renamed)).toBe(false);
    });

    // CR-01 parse side: a hand-written double backslash is one escaped
    // backslash — unescaped to a single `\` like `\"` unescapes to `"`.
    it('parses a hand-written backslash-escaped label and stays editable', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "C:\\\\path" }';

      expect(bodyHasUnparsedAtDirective(source)).toBe(false);
      const node = parseDiagram(source).nodes.find(n => n.id === 'A');
      expect(node?.label).toBe('C:\\path');
    });

    // Phase 27 (27-02, D2 pin): the surviving v11 cases (docs is a stacked
    // documents shape, not a toolbar target) must escape double quotes on
    // rename just like the toolbar targets — they emit the same directive
    // syntax, so an unescaped quote would produce broken mermaid.
    it('escapes double quotes on rename of a docs line (D2 retrofit pin)', () => {
      const source = 'flowchart TD\nA@{ shape: "docs", label: "Docs" }';
      const result = updateNodeLabel(source, 'A', 'Say "hi"');

      expect(result).toBe('flowchart TD\nA@{ shape: "docs", label: "Say \\"hi\\"" }');
    });

    // Phase 27 (27-02, prohibition pin): unknown params must survive rename
    // across the whole directive shape family, not just the 27-01 tracer
    // shapes (person/doc).
    it('keeps unknown params on rename across the new directive shapes', () => {
      const source = 'flowchart TD\nA@{ shape: "delay", label: "Wait", w: 80 }';
      const result = updateNodeLabel(source, 'A', 'Hold');

      expect(result).toBe('flowchart TD\nA@{ shape: "delay", label: "Hold", w: 80 }');
    });

    // Phase 27 (27-02): the full label pipeline through a NEW directive
    // shape — toolbar add with a double-quote label, rename, re-parse. The
    // quote must survive every hop: escaped on emission, unescaped on parse.
    it('round-trips a double-quote label through a new directive shape', () => {
      const source = 'flowchart TD\nA[Box]';
      const added = addNode(source, 'N', 'Say "hi"', 'folder');

      expect(added).toContain('N@{ shape: "folder", label: "Say \\"hi\\"" }');

      const renamed = updateNodeLabel(added, 'N', 'Say "ho"');
      expect(renamed).toContain('N@{ shape: "folder", label: "Say \\"ho\\"" }');

      const reparsed = parseDiagram(renamed);
      expect(reparsed.nodes.find(n => n.id === 'N')?.label).toBe('Say "ho"');
    });
  });

  describe('updateNodeShape', () => {
    it('should update node shape', () => {
      const source = 'flowchart TD\nA[Label]';
      const result = updateNodeShape(source, 'A', 'round');

      expect(result).toContain('A(Label)');
    });

    it('should preserve label', () => {
      const source = 'flowchart TD\nA[MyLabel]';
      const result = updateNodeShape(source, 'A', 'stadium');

      expect(result).toContain('A([MyLabel])');
    });

    // Phase 26 (26-01): changing shape to double-circle must write the
    // legacy triple-paren form — not the v11 metadata directive, which would
    // trip the D6 read-only gate on the next autosave.
    it('should write legacy triple-paren syntax when changing shape to double-circle', () => {
      const source = 'flowchart TD\nA[Box]';
      const result = updateNodeShape(source, 'A', 'dbl-circ');

      expect(result).toBe('flowchart TD\nA(((Box)))');
    });

    // Phase 26 (WR-01): changing an EMPTY-label node to double-circle emits
    // `((()))`, which must re-parse as an empty dbl-circ — never as a circle
    // labeled `()` (the greedy circle reading when no EMPTY_SHAPES entry
    // claims the bare triple-paren form).
    it('should round-trip an empty-label node through a double-circle shape change', () => {
      const source = 'flowchart TD\nA[]';
      const emitted = updateNodeShape(source, 'A', 'dbl-circ');

      expect(emitted).toBe('flowchart TD\nA((()))');

      const reparsed = parseDiagram(emitted);
      expect(reparsed.nodes[0]).toMatchObject({ shape: 'dbl-circ', label: '' });
    });

    // Phase 27 (27-01 Task 2, RED): shape change on a directive line re-emits
    // through the directive writer (research probe P10 flipped).
    it('rewrites a directive node through the directive writer on shape change', () => {
      const source = 'flowchart TD\nA@{ shape: "doc", label: "D" }';
      const result = updateNodeShape(source, 'A', 'person');

      expect(result).toBe('flowchart TD\nA@{ shape: "person", label: "D" }');
    });

    // Decision D3 (27-01): the edge-line branch stays out of scope this
    // phase — the documented pre-existing gap, pinned as unchanged source.
    it('leaves an edge-defined directive node unchanged on shape change (D3)', () => {
      const source = 'flowchart TD\nA@{ shape: "doc", label: "D" } --> B';
      const result = updateNodeShape(source, 'A', 'person');

      expect(result).toBe(source);
    });

    // The deliberate drop: unknown params cannot be represented in legacy
    // syntax, so converting to a legacy shape loses them (pinned contract).
    // The label stays quoted — the directive context always quotes, and the
    // quoted legacy form round-trips labels containing special characters.
    it('drops unknown params when converting a directive node to a legacy shape', () => {
      const source = 'flowchart TD\nA@{ shape: "doc", label: "D", w: 100 }';
      const result = updateNodeShape(source, 'A', 'round');

      expect(result).toBe('flowchart TD\nA("D")');
      expect(result).not.toContain('w: 100');
    });

    // Phase 27 (27-02): the 12-key toolbar-target sweep. Every key must emit
    // the directive wrap on a plain rect source — never the default rect
    // fallback a missing switch case degrades to. person and doc arrive green
    // from 27-01; the other ten go red until their writer cases land.
    it.each([
      ['person'], ['doc'], ['delay'], ['sl-rect'], ['div-rect'], ['folder'],
      ['datastore'], ['cloud'], ['browser'], ['bolt'], ['tri'], ['hourglass'],
    ] as NodeShape[][])('emits the directive wrap when changing shape to %s', (key) => {
      const result = updateNodeShape('flowchart TD\nA[Box]', 'A', key);

      expect(result).toBe(`flowchart TD\nA@{ shape: "${key}", label: "Box" }`);
    });

    // Phase 27 (27-02, pin): a directive-to-directive shape change keeps the
    // unknown params (the 27-01 tracer proved the plumbing on person only).
    it('keeps unknown params when changing between directive shapes', () => {
      const source = 'flowchart TD\nA@{ shape: "doc", label: "D", w: 100 }';
      const result = updateNodeShape(source, 'A', 'person');

      expect(result).toBe('flowchart TD\nA@{ shape: "person", label: "D", w: 100 }');
    });
  });

  describe('addNode', () => {
    it('should add node to diagram without auto-quoting', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addNode(source, 'C', 'Node C', 'rect');

      expect(result).toContain('C[Node C]');
    });

    it('should add node with custom shape', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addNode(source, 'C', 'Node C', 'round');

      expect(result).toContain('C(Node C)');
    });

    it('should insert node after first line', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addNode(source, 'C', 'C', 'rect');

      const lines = result.split('\n');
      expect(lines[1]).toContain('C');
    });

    // Phase 26 (26-01): toolbar adds of a double-circle node must emit the
    // legacy triple-paren wrap so the autosaved content never carries the
    // v11 metadata directive (D6 read-only trip).
    it('should add a double-circle node with legacy triple-paren wrap', () => {
      const source = 'flowchart TD\nA(((X)))';
      const result = addNode(source, 'Z', 'Stop', 'dbl-circ');

      expect(result).toContain('Z(((Stop)))');
    });

    // Phase 27 (27-01): toolbar adds of a person node emit the directive
    // wrap — the escaped always-quoted emission, never rect brackets.
    it('should add a person node with the directive wrap', () => {
      const source = 'flowchart TD\nA[Box]';
      const result = addNode(source, 'Z', 'Alice', 'person');

      expect(result).toContain('Z@{ shape: "person", label: "Alice" }');
    });

    // Phase 27 (27-02): toolbar adds of the new directive shapes emit the
    // directive wrap — never the default rect brackets a missing switch case
    // degrades to.
    it('should add a delay node with the directive wrap', () => {
      const source = 'flowchart TD\nA[Box]';
      const result = addNode(source, 'N', 'X', 'delay');

      expect(result).toContain('N@{ shape: "delay", label: "X" }');
    });
  });

  describe('removeNode', () => {
    it('should remove node style', () => {
      const source = 'flowchart TD\nA-->B\nstyle B fill:red';
      const result = removeNode(source, 'B');

      expect(result).not.toContain('style B');
    });

    it('should remove node class', () => {
      const source = 'flowchart TD\nA-->B\nclass B myClass';
      const result = removeNode(source, 'B');

      expect(result).not.toContain('class B');
    });

    // Phase 27 (27-01 Task 2, RED): directive definition lines are deletable
    // (research probe P12 flipped) — the gate gains the at-brace alternative.
    it('removes a standalone directive definition line', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "P" }\nB --> C';
      const result = removeNode(source, 'A');

      expect(result).not.toContain('A@{');
      expect(result).toContain('B --> C');
    });
  });

  describe('applyNodePreset', () => {
    const PRESET_COLORS = {
      primaryColor: '#2563eb',
      successColor: '#16a34a',
      warningColor: '#d97706',
      errorColor: '#dc2626',
      infoColor: '#0891b2',
    };

    // Phase 27 (27-01 Task 2, RED): the node-line finder gains the at sign so
    // the class line lands after the directive line instead of at file end.
    it('inserts the class line right after a standalone directive node line', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "P" }';
      const result = applyNodePreset(source, ['A'], 'primary', PRESET_COLORS);

      const lines = result.split('\n');
      const nodeIdx = lines.findIndex(l => l.includes('A@{'));
      expect(nodeIdx).toBeGreaterThanOrEqual(0);
      expect(lines[nodeIdx + 1].trim()).toBe('class A presetPrimary');
    });
  });

  describe('removeEdge', () => {
    it('should remove a simple edge line', () => {
      const source = 'flowchart TD\nA --> B\nB --> C';
      const result = removeEdge(source, 'A', 'B');

      expect(result).not.toContain('A --> B');
      expect(result).toContain('B --> C');
    });

    it('should remove an edge with a label', () => {
      const source = 'flowchart TD\nA -->|go| B\nB --> C';
      const result = removeEdge(source, 'A', 'B');

      expect(result).not.toContain('|go|');
      expect(result).toContain('B --> C');
    });

    it('should respect write direction (A,B does not match B --> A)', () => {
      const source = 'flowchart TD\nB --> A';
      const result = removeEdge(source, 'A', 'B');

      expect(result).toBe(source);
    });

    it('should not match node ids sharing a prefix', () => {
      const source = 'flowchart TD\nAB --> C';
      const result = removeEdge(source, 'A', 'C');

      expect(result).toBe(source);
    });

    // Phase 27 review WR-01: an edge whose SOURCE carries a directive span
    // must be deletable — the before-arrow segment is `A@{...}`, so the old
    // whole-segment comparison never matched and delete silently no-op'd
    // while the preview panel cleared the selection as if it had worked.
    it('removes an edge whose source carries a directive span', () => {
      const source = 'flowchart TD\nA@{ shape: "person", label: "P" } --> B\nB --> C';
      const result = removeEdge(source, 'A', 'B');

      expect(result).toBe('flowchart TD\nB --> C');
    });

    it('removes a directive-source edge and shifts subsequent linkStyles', () => {
      const source = [
        'flowchart TD',
        'A@{ shape: "person", label: "P" } --> B',
        'B --> C',
        'linkStyle 0 stroke:red',
        'linkStyle 1 stroke:blue',
      ].join('\n');
      const result = removeEdge(source, 'A', 'B');

      expect(result).not.toContain('A@{');
      expect(result).toContain('linkStyle 0 stroke:blue');
      expect(result).not.toContain('linkStyle 1');
    });

    it('should remove the edge linkStyle and shift subsequent ones', () => {
      const source = [
        'flowchart TD',
        'A --> B',
        'B --> C',
        'C --> D',
        'linkStyle 0 stroke:red',
        'linkStyle 2 stroke:blue',
      ].join('\n');
      const result = removeEdge(source, 'A', 'B');

      expect(result).not.toContain('linkStyle 0');
      expect(result).toContain('linkStyle 1 stroke:blue');
    });

    it('should leave other edges, nodes and their styles intact', () => {
      const source = 'flowchart TD\nA --> B\nA --> C\nstyle A fill:red\nstyle C fill:blue';
      const result = removeEdge(source, 'A', 'B');

      expect(result).toContain('A --> C');
      expect(result).toContain('style A fill:red');
      expect(result).toContain('style C fill:blue');
    });

    it('should return source unchanged when edge is missing', () => {
      const source = 'flowchart TD\nA --> B';
      const result = removeEdge(source, 'X', 'Y');

      expect(result).toBe(source);
    });
  });

  describe('removeSubgraph', () => {
    it('should remove the block but keep child nodes (de-nesting)', () => {
      const source = 'flowchart TD\nsubgraph sg1["Group"]\n  A[Node A]\n  B[Node B]\nend\nC[Node C]';
      const result = removeSubgraph(source, 'sg1');

      expect(result).not.toContain('subgraph sg1');
      expect(result).not.toContain('Group');
      expect(result).toContain('A[Node A]');
      expect(result).toContain('B[Node B]');
      expect(result).toContain('C[Node C]');
      expect(result.split('\n').filter(l => l.trim() === 'end')).toHaveLength(0);
    });

    it('should remove direction lines that were inside the block', () => {
      const source = 'flowchart TD\nsubgraph sg1\n  direction LR\n  A --> B\nend';
      const result = removeSubgraph(source, 'sg1');

      expect(result).not.toContain('direction');
      expect(result).toContain('A --> B');
    });

    it('should remove the subgraph style but keep children styles', () => {
      const source = 'flowchart TD\nsubgraph sg1\n  A --> B\nend\nstyle sg1 fill:red\nstyle A fill:blue';
      const result = removeSubgraph(source, 'sg1');

      expect(result).not.toContain('style sg1');
      expect(result).toContain('style A fill:blue');
    });

    it('should handle nesting: removing the outer keeps the inner block intact', () => {
      const source = 'flowchart TD\nsubgraph sg1\n  subgraph sg2\n    A --> B\n  end\n  C --> D\nend';
      const result = removeSubgraph(source, 'sg1');

      expect(result).not.toContain('subgraph sg1');
      expect(result).toContain('subgraph sg2');
      expect(result).toContain('A --> B');
      expect(result).toContain('C --> D');
      expect(result.split('\n').filter(l => l.trim() === 'end')).toHaveLength(1);
    });

    it('should remove an inner subgraph without touching the outer', () => {
      const source = 'flowchart TD\nsubgraph sg1\n  subgraph sg2\n    A --> B\n  end\n  C --> D\nend';
      const result = removeSubgraph(source, 'sg2');

      expect(result).toContain('subgraph sg1');
      expect(result).not.toContain('subgraph sg2');
      expect(result).toContain('A --> B');
      expect(result).toContain('C --> D');
      expect(result.split('\n').filter(l => l.trim() === 'end')).toHaveLength(1);
    });

    it('should return source unchanged when subgraph id is missing', () => {
      const source = 'flowchart TD\nsubgraph sg1\n  A --> B\nend';
      const result = removeSubgraph(source, 'nope');

      expect(result).toBe(source);
    });
  });

  describe('addEdge', () => {
    it('should add edge to diagram', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addEdge(source, 'B', 'C', '-->', '');

      expect(result).toContain('B --> C');
    });

    it('should add edge with label', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addEdge(source, 'A', 'B', '-->', 'label');

      expect(result).toContain('A -->|label| B');
    });

    it('should add edge with custom arrow', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addEdge(source, 'A', 'B', '==>', '');

      expect(result).toContain('A ==> B');
    });
  });

  describe('getNodeStyle', () => {
    it('should return direct style', () => {
      const styles = new Map([['A', { fill: 'red' }]]);
      const result = getNodeStyle(styles, new Map(), new Map(), 'A');

      expect(result).toEqual({ fill: 'red' });
    });

    it('should merge class styles', () => {
      const styles = new Map();
      const classDefs = new Map([['myClass', { fill: 'blue' }]]);
      const nodeClasses = new Map([['A', ['myClass']]]);

      const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

      expect(result).toEqual({ fill: 'blue' });
    });

    it('should merge multiple class styles', () => {
      const styles = new Map();
      const classDefs = new Map([
        ['class1', { fill: 'blue' }],
        ['class2', { stroke: 'red' }],
      ]);
      const nodeClasses = new Map([['A', ['class1', 'class2']]]);

      const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

      expect(result).toEqual({ fill: 'blue', stroke: 'red' });
    });

    it('should direct style should override class style', () => {
      const styles = new Map([['A', { fill: 'red' }]]);
      const classDefs = new Map([['myClass', { fill: 'blue' }]]);
      const nodeClasses = new Map([['A', ['myClass']]]);

      const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

      expect(result).toEqual({ fill: 'red' });
    });
  });

  describe('generateNodeId', () => {
    it('should generate unique IDs', () => {
      const existingIds = ['node1', 'node2', 'node3'];
      const result = generateNodeId(existingIds);

      expect(result).toBe('node4');
    });

    it('should handle empty array', () => {
      const result = generateNodeId([]);

      expect(result).toBe('node1');
    });

    it('should handle non-sequential IDs', () => {
      const existingIds = ['node1', 'node5', 'node10'];
      const result = generateNodeId(existingIds);

      expect(result).toBe('node2');
    });
  });

  describe('parseFrontmatter', () => {
    it('should handle no frontmatter', () => {
      const content = 'flowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle invalid JSON', () => {
      const content = '%%{init: {invalid}}%%\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
    });

    it('should handle incomplete init block', () => {
      const content = '%%{init: {"theme": "base"}\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toContain('flowchart TD');
    });

    it('should parse YAML frontmatter format', () => {
      const content = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff0000'
---
flowchart TD
A-->B`;
      const result = parseFrontmatter(content);

      expect(result.frontmatter.config?.theme).toBe('base');
      // themeVariables comes out of the YAML parser as an opaque value; the
      // test asserts its shape, so narrow it explicitly.
      const themeVariables = result.frontmatter.config?.themeVariables as Record<string, string> | undefined;
      expect(themeVariables?.primaryColor).toBe('#ff0000');
      expect(result.body).toContain('flowchart TD');
    });
  });

  // THM-03 unit layer (Plan 23-03 Task 1, D9/D10): frontmatter ROUND-TRIP on
  // mermaid 12 — extraction reads the value, re-generation carries it back
  // without content loss. Render-layer precedence lives in
  // frontmatter-precedence.test.ts (the second D10 layer).
  describe('frontmatter round-trip on v12 (THM-03, D9)', () => {
    it('round-trips a YAML --- block: generateFrontmatter → parseFrontmatter preserves config and body', () => {
      // Complements (does not duplicate) the parseFrontmatter describe above:
      // this exercises the app's actual WRITE path (generateFrontmatter) and
      // proves the written block parses back to an identical config with the
      // body split off byte-identically.
      const config = {
        theme: 'base',
        themeVariables: { primaryColor: '#ff0000', lineColor: '#0066cc' },
      };
      const body = 'flowchart TD\nA[Start] --> B[End]';
      const content = `${generateFrontmatter(config)}\n${body}`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.config?.theme).toBe('base');
      expect(result.frontmatter.config?.themeVariables).toEqual(config.themeVariables);
      expect(result.body).toBe(body);
    });

    it('@theme marker round-trip: applyThemeToFrontmatter re-generates the same id with a lossless body (D9)', () => {
      const body = 'flowchart TD\nA[Start] --> B[End]';
      const sunset = getThemeById('sunset');
      // Guard (not toBeDefined): narrows `sunset` to MermaidTheme for the
      // call below while still failing the test when the id is missing.
      if (!sunset) throw new Error('sunset theme missing from the registry');

      const regenerated = applyThemeToFrontmatter(body, sunset, false);

      // The regenerated content carries the theme id via the %% @theme marker
      // (THEME_COMMENT_RE, themeDerivation.ts:442) — the app's content-level
      // theme channel that renderDiagram prefers over the caller's themeId.
      expect(extractThemeIdFromContent(regenerated)).toBe('sunset');

      // Re-parsing the regenerated content yields the same id...
      const reparsed = parseFrontmatter(regenerated);
      expect(extractThemeIdFromContent(reparsed.body)).toBe('sunset');

      // ...and the diagram body survives regeneration byte-identically. The
      // marker line is app metadata riding in front of the body (it is a
      // mermaid COMMENT, invisible to the renderer); strip it the same way the
      // app does (injectThemeComment(content, null) runs THEME_COMMENT_RE)
      // before the byte-equality comparison — the id must round-trip AND the
      // body must lose nothing (D9: re-generation without loss).
      expect(injectThemeComment(reparsed.body, null)).toBe(body);

      // The regenerated frontmatter config carries the theme's own colors:
      // sunset.primaryColor passes through the derivation untouched.
      expect(reparsed.frontmatter.config?.theme).toBe('base');
      expect((reparsed.frontmatter.config?.themeVariables as Record<string, string>)?.primaryColor).toBe('#FED7AA');
    });

    it('@{...} node-attribute syntax: v11 shape/label attributes parse and regenerate without corruption (D9)', () => {
      // NOTE: this is the app's @{...} meaning — the v11 node shape/label
      // attribute syntax matched by codeUtils.ts:110 (v11Match) and emitted by
      // shapeWrap's v11 branch (codeUtils.ts:219-230). Distinct from v12's
      // frontmatter `@{ view: ... }` syntax, which Phase 24 owns via DIA-02.
      const source = 'flowchart TD\nA@{ shape: "doc", label: "Doc" } --> B';

      // Parse goes through the v11 attribute path: shape "doc" is a V11_SHAPES
      // entry, so the whole @{...} form is consumed as the node's shape raw.
      const parsed = parseDiagram(source);
      const nodeA = parsed.nodes.find(n => n.id === 'A');
      expect(nodeA?.shape).toBe('doc');
      expect(nodeA?.label).toBe('Doc');

      // Regeneration re-emits the same @{ shape, label } form (shapeWrap) and
      // re-parsing recovers both attributes unchanged — no corruption.
      const regenerated = updateNodeLabel(source, 'A', 'Doc v2');
      expect(regenerated).toContain('@{ shape: "doc", label: "Doc v2" }');
      const reparsed = parseDiagram(regenerated);
      const nodeA2 = reparsed.nodes.find(n => n.id === 'A');
      expect(nodeA2?.label).toBe('Doc v2');
      expect(nodeA2?.shape).toBe('doc');
    });

    // Pitfall 5 (23-RESEARCH.md) — owned follow-up APPLIED (WR-03, 23-REVIEW).
    // The app's legacy-directive regex was /%%\{init:\s*({[\s\S]*?})\s*\}\)%%/
    // — it demanded a trailing `)%%` no legal directive spelling can satisfy,
    // so the branch never returned a parsed config (recorded as observation
    // per D3/D11 during 23-03; the fix was deliberately deferred out of the
    // validation task). The stray `)` has now been dropped
    // (codeUtils.ts parseFrontmatter): the flat and nested round-trips below
    // pin app-layer extraction of the legal `}}%%` spelling, and one
    // observation records that malformed spellings still fall through
    // (ignored — never crashed, never misparsed).
    it('parses a flat %%{init: {...}}%% directive into frontmatter config (Pitfall 5 / WR-03)', () => {
      const content = '%%{init: {"theme": "dark"}}%%\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter.config).toEqual({ theme: 'dark' });
      expect(result.body).toBe('flowchart TD\nA-->B');
    });

    it('parses a nested %%{init: {...}}%% payload (themeVariables survive extraction)', () => {
      const content =
        '%%{init: {"theme": "dark", "themeVariables": {"primaryColor": "#ff6b6b"}}}%%\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter.config).toEqual({
        theme: 'dark',
        themeVariables: { primaryColor: '#ff6b6b' },
      });
      expect(result.body).toBe('flowchart TD\nA-->B');
    });

    // WR-04: a directive line may carry trailing text after its `}}%%` close.
    // The block terminator must fire on that line (it CONTAINS `}%%`), not
    // keep scanning to the next `%%`-terminated line — pre-fix, the
    // `%% note %%` comment below ended the block and the body came back
    // EMPTY (the diagram silently dropped).
    it('keeps the diagram body when the directive line carries trailing text (WR-04)', () => {
      const content =
        '%%{init: {"theme": "dark"}}%% some trailing text\nflowchart TD\nA --> B\n%% note %%';
      const result = parseFrontmatter(content);

      expect(result.frontmatter.config).toEqual({ theme: 'dark' });
      expect(result.body).toBe('flowchart TD\nA --> B\n%% note %%');
    });

    // WR-04 kept the accumulation loop (not a single-line-only variant) so
    // the multi-line directive JSON shape stays supported: the terminator is
    // anchored to the directive's own closing line, wherever it sits.
    it('parses a multi-line %%{init: {...}}%% payload (terminator anchored to its own close, WR-04)', () => {
      const content = '%%{init: {\n  "theme": "dark"\n}}%%\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter.config).toEqual({ theme: 'dark' });
      expect(result.body).toBe('flowchart TD\nA-->B');
    });

    it('OBSERVATION (Pitfall 5): trailing-paren spelling %%{init: {"theme": "dark"})%% falls through', () => {
      // The malformed spelling the pre-WR-03 regex demanded. The corrected
      // regex deliberately does NOT match it (a `)` between the JSON and the
      // closing `%%` is not a legal directive), so the app parse layer keeps
      // ignoring it exactly as before — the directive is dropped from
      // consideration, never crashed on. Render precedence is unaffected
      // either way: renderDiagram's hasCustomTheme gate fires on the %%{init:
      // prefix (core.ts:136), independent of this parse layer.
      const content = '%%{init: {"theme": "dark"})%%\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });
  });

  describe('generateFrontmatter', () => {
    it('should generate YAML frontmatter', () => {
      const config = { theme: 'base' };
      const result = generateFrontmatter(config);

      expect(result).toContain('---');
      expect(result).toContain('config:');
      expect(result).toContain('theme:');
      expect(result).toContain('base');
    });

    it('should handle empty config', () => {
      const result = generateFrontmatter({});

      expect(result).toContain('---');
      expect(result).toContain('config:');
    });

    it('should handle complex config', () => {
      const config = { theme: 'forest', themeVariables: { primaryColor: '#ff0000' } };
      const result = generateFrontmatter(config);

      expect(result).toContain('---');
      expect(result).toContain('forest');
      expect(result).toContain('#ff0000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty diagram', () => {
      const result = parseDiagram('flowchart TD');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle only comments', () => {
      const result = parseDiagram('%% Comment 1\n%% Comment 2');
      expect(result.nodes).toHaveLength(0);
    });

    it('should handle multiple arrows', () => {
      const source = 'flowchart TD\nA-->|1|B\nA==>C';
      const result = parseDiagram(source);

      expect(result.edges).toHaveLength(2);
    });

    it('should handle node with ID and label', () => {
      const source = 'flowchart TD\nA[Node A]';
      const result = parseDiagram(source);

      expect(result.nodes[0].id).toBe('A');
      expect(result.nodes[0].label).toBe('Node A');
    });
  });

  describe('Extended NodeStyle', () => {
    describe('parseStyleValue', () => {
      it('should parse comma-separated classDef string with all 10 properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red,stroke:blue,stroke-width:2px,stroke-dasharray:5 5,color:white,font-weight:bold,font-size:16px,rx:10,ry:10,opacity:0.5';
        const result = parseDiagram(source);

        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
          opacity: '0.5',
        });
      });

      it('should parse semicolon-separated style string with all 10 properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red;stroke:blue;stroke-width:2px;stroke-dasharray:5 5;color:white;font-weight:bold;font-size:16px;rx:10;ry:10;opacity:0.5';
        const result = parseDiagram(source);

        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
          opacity: '0.5',
        });
      });

      it('should handle stroke-dasharray with spaces', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass stroke-dasharray:5 5';
        const result = parseDiagram(source);
        expect(result.classDefs.get('myClass')?.strokeDasharray).toBe('5 5');
      });

      it('should be backward-compatible with old 4-property input', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red,stroke:blue,stroke-width:2px,color:white';
        const result = parseDiagram(source);
        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          color: 'white',
        });
      });

      it('should handle partial properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:#eee,font-weight:bold';
        const result = parseDiagram(source);
        expect(result.classDefs.get('myClass')).toEqual({
          fill: '#eee',
          fontWeight: 'bold',
        });
      });
    });

    describe('getNodeStyle extended', () => {
      it('should return merged style including new properties', () => {
        const styles = new Map([['A', { fill: 'red', fontWeight: 'bold' }]]);
        const classDefs = new Map([['myClass', { stroke: 'blue', fontSize: '16px' }]]);
        const nodeClasses = new Map([['A', ['myClass']]]);

        const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

        expect(result).toEqual({
          fill: 'red',
          fontWeight: 'bold',
          stroke: 'blue',
          fontSize: '16px',
        });
      });
    });

    describe('parseDiagram extended', () => {
      it('should correctly parse classDef lines with new properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red,stroke-dasharray:5 5,font-weight:bold';
        const result = parseDiagram(source);

        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          strokeDasharray: '5 5',
          fontWeight: 'bold',
        });
      });
    });
  });

  describe('Edge Style Utilities', () => {
    describe('parseLinkStyles', () => {
      it('should parse linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red,stroke-width:2px';
        const result = parseLinkStyles(source);

        expect(result.size).toBe(1);
        expect(result.get(0)).toEqual({
          stroke: 'red',
          strokeWidth: '2px',
        });
      });

      it('should parse multiple linkStyle lines', () => {
        const source = [
          'flowchart TD',
          'A-->B',
          'C-->D',
          'linkStyle 0 stroke:red',
          'linkStyle 1 stroke:blue,opacity:0.5',
        ].join('\n');
        const result = parseLinkStyles(source);

        expect(result.size).toBe(2);
        expect(result.get(0)?.stroke).toBe('red');
        expect(result.get(1)?.stroke).toBe('blue');
        expect(result.get(1)?.opacity).toBe('0.5');
      });

      it('should handle semicolon-separated styles', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red;stroke-width:2px;opacity:0.5';
        const result = parseLinkStyles(source);

        expect(result.get(0)).toEqual({
          stroke: 'red',
          strokeWidth: '2px',
          opacity: '0.5',
        });
      });

      it('should return empty map when no linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B';
        const result = parseLinkStyles(source);

        expect(result.size).toBe(0);
      });

    });

    describe('edgeStyleToString', () => {
      it('should convert full EdgeStyle to string', () => {
        const result = edgeStyleToString({
          stroke: 'red',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          opacity: '0.5',
        });
        expect(result).toBe('stroke:red,stroke-width:2px,stroke-dasharray:5 5,opacity:0.5');
      });

      it('should return empty string for empty style', () => {
        expect(edgeStyleToString({})).toBe('');
      });

      it('should output only defined properties', () => {
        const result = edgeStyleToString({ stroke: 'blue' });
        expect(result).toBe('stroke:blue');
      });

    });

    describe('updateLinkStyle', () => {
      it('should add new linkStyle line', () => {
        const source = 'flowchart TD\nA-->B';
        const result = updateLinkStyle(source, 0, { stroke: 'red' });

        expect(result).toContain('linkStyle 0 stroke:red');
      });

      it('should update existing linkStyle line', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red';
        const result = updateLinkStyle(source, 0, { stroke: 'blue' });

        expect(result).toContain('linkStyle 0 stroke:blue');
        expect(result).not.toContain('stroke:red');
      });

      it('should remove linkStyle if empty style', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red';
        const result = updateLinkStyle(source, 0, {});

        expect(result).not.toContain('linkStyle 0');
      });

      it('should insert after last existing linkStyle', () => {
        const source = 'flowchart TD\nA-->B\nC-->D\nlinkStyle 0 stroke:red';
        const result = updateLinkStyle(source, 1, { stroke: 'blue' });

        const lines = result.split('\n');
        const linkStyle0Idx = lines.findIndex(l => l.includes('linkStyle 0'));
        const linkStyle1Idx = lines.findIndex(l => l.includes('linkStyle 1'));
        expect(linkStyle1Idx).toBeGreaterThan(linkStyle0Idx);
      });

    });

    describe('removeLinkStyles', () => {
      it('should remove specified linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red\nlinkStyle 1 stroke:blue';
        const result = removeLinkStyles(source, [0]);

        expect(result).not.toContain('linkStyle 0');
        expect(result).toContain('linkStyle 1');
      });

      it('should handle multiple indices', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red\nlinkStyle 1 stroke:blue\nlinkStyle 2 stroke:green';
        const result = removeLinkStyles(source, [0, 2]);

        expect(result).not.toContain('linkStyle 0');
        expect(result).toContain('linkStyle 1');
        expect(result).not.toContain('linkStyle 2');
      });

      it('should preserve non-linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B\nC-->D\nlinkStyle 0 stroke:red';
        const result = removeLinkStyles(source, [0]);

        expect(result).toContain('flowchart TD');
        expect(result).toContain('A-->B');
        expect(result).toContain('C-->D');
      });

    });

    describe('updateEdgeArrowType', () => {
      it('should change arrow type on simple edge', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeArrowType(source, 'A', 'B', '==>');

        expect(result).toContain('A ==> B');
        expect(result).not.toContain('A --> B');
      });

      it('should preserve edge label when changing arrow', () => {
        const source = 'flowchart TD\nA -->|label| B';
        const result = updateEdgeArrowType(source, 'A', 'B', '---');

        expect(result).toContain('A ---|label| B');
      });

      it('should handle dotted arrow type', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeArrowType(source, 'A', 'B', '-.->');

        expect(result).toContain('A -.-> B');
      });

      it('should return unchanged source when edge not found', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeArrowType(source, 'X', 'Y', '==>');

        expect(result).toBe(source);
      });
    });

    describe('updateEdgeLabel', () => {
      it('should add label to edge without label', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeLabel(source, 'A', 'B', 'my label');

        expect(result).toContain('A -->|my label| B');
      });

      it('should update existing edge label', () => {
        const source = 'flowchart TD\nA -->|old| B';
        const result = updateEdgeLabel(source, 'A', 'B', 'new');

        expect(result).toContain('A -->|new| B');
        expect(result).not.toContain('|old|');
      });

      it('should remove label when empty string', () => {
        const source = 'flowchart TD\nA -->|label| B';
        const result = updateEdgeLabel(source, 'A', 'B', '');

        expect(result).toContain('A --> B');
        expect(result).not.toContain('|');
      });

      it('should return unchanged source when edge not found', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeLabel(source, 'X', 'Y', 'label');

        expect(result).toBe(source);
      });
    });

    describe('parseDiagram with linkStyles', () => {
      it('should skip linkStyle lines when parsing', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red';
        const result = parseDiagram(source);

        expect(result.nodes).toHaveLength(2);
        expect(result.edges).toHaveLength(1);
      });
    });
  });
});

// ===== 38-01 Task 2 (tracer pins): the `odd` vertical slice — the crashing
// legacy key `asymmetric` parses to canonical `odd` through the shapes.ts
// SSOT (toDirectiveShapeName), re-emits canonically, and round-trips. The
// emitted span must never carry `asymmetric` inside shape: "..." — mermaid
// 12 throws `No such shape: asymmetric.` on it. =====
describe('odd canonical shape (38-01 tracer)', () => {
  const EDGE_SOURCE = 'flowchart LR\n  A@{ shape: "asymmetric", label: "Gate" } --> B';
  const STANDALONE_SOURCE = 'flowchart LR\n  A@{ shape: "asymmetric", label: "Gate" }';

  it('parses a legacy asymmetric directive on an edge line to shape odd (SSOT choke point consumed)', () => {
    const result = parseDiagram(EDGE_SOURCE);

    const node = result.nodes.find(n => n.id === 'A');
    expect(node).toBeDefined();
    expect(node?.shape).toBe('odd');
    expect(node?.label).toBe('Gate');
    expect(result.edges).toHaveLength(1);
  });

  it('parses a standalone legacy asymmetric directive to shape odd', () => {
    const result = parseDiagram(STANDALONE_SOURCE);

    const node = result.nodes.find(n => n.id === 'A');
    expect(node?.shape).toBe('odd');
    expect(node?.directiveRaw).toBe('@{ shape: "asymmetric", label: "Gate" }');
  });

  it('re-emits canonically on shape change — asymmetric never enters the emitted span', () => {
    const result = updateNodeShape(STANDALONE_SOURCE, 'A', 'odd');

    expect(result).toContain('@{ shape: "odd", label: "Gate" }');
    expect(result).not.toContain('asymmetric');
  });

  it('round-trips: re-parsing the emitted source yields shape odd again', () => {
    const emitted = updateNodeShape(STANDALONE_SOURCE, 'A', 'odd');
    const result = parseDiagram(emitted);

    const node = result.nodes.find(n => n.id === 'A');
    expect(node?.shape).toBe('odd');
    expect(node?.label).toBe('Gate');
    expect(node?.directiveRaw).toBe('@{ shape: "odd", label: "Gate" }');
  });

  it('preserves authored tokens instead of the rect fallback (plan-02 replaces the tracer fallback)', () => {
    // Reversed in 38-02: the tracer contract kept the rect fallback for
    // non-odd tokens "until plan 02 replaces the fallback with authoredShape
    // preservation". Null-resolving tokens keep their spelling verbatim
    // (shape is the authored sentinel); resolvable alias tokens resolve
    // canonically while authoredShape preserves the authored token.
    const unknown = parseDiagram('flowchart TD\nA@{ shape: "future-shape", label: "X" }');
    const u = unknown.nodes.find(n => n.id === 'A');
    expect(u?.shape).toBe('future-shape');
    expect(u?.authoredShape).toBe('future-shape');

    const alias = parseDiagram('flowchart TD\nA@{ shape: "card", label: "X" }');
    const a = alias.nodes.find(n => n.id === 'A');
    expect(a?.shape).toBe('notch-rect');
    expect(a?.authoredShape).toBe('card');
  });
});

// ===== 38-02 Task 1 pins: canonical vocabulary — authoredShape preservation,
// canonical emission through the shapeWrap choke point, CR-01 escape-order
// guard across a shape change. (The full-domain round-trip battery is
// Task 2.) =====
describe('canonical codeUtils vocabulary (38-02 Task 1)', () => {
  it('populates authoredShape for an alias token and leaves canonical tokens undefined', () => {
    const alias = parseDiagram('flowchart TD\nA@{ shape: "card", label: "X" }');
    const a = alias.nodes.find(n => n.id === 'A');
    expect(a?.shape).toBe('notch-rect');
    expect(a?.authoredShape).toBe('card');

    const canonical = parseDiagram('flowchart TD\nA@{ shape: "rect", label: "X" }');
    const r = canonical.nodes.find(n => n.id === 'A');
    expect(r?.shape).toBe('rect');
    expect(r?.authoredShape).toBeUndefined();
  });

  it('populates authoredShape for a legacy directive token while resolving the shape', () => {
    const legacy = parseDiagram('flowchart TD\nA@{ shape: "asymmetric", label: "Gate" }');
    const a = legacy.nodes.find(n => n.id === 'A');
    expect(a?.shape).toBe('odd');
    expect(a?.authoredShape).toBe('asymmetric');
  });

  it.each([
    ['manual-file', 'flip-tri'],
    ['manual-input', 'sl-rect'],
    ['procs', 'st-rect'],
    ['paper-tape', 'flag'],
  ] as [NodeShape, string][])('emits the canonical key when re-shaping to alias member %s', (member, canonical) => {
    const result = updateNodeShape('flowchart TD\nA[Box]', 'A', member);

    expect(result).toBe(`flowchart TD\nA@{ shape: "${canonical}", label: "Box" }`);
    expect(result).not.toContain(`shape: "${member}"`);
  });

  it('keeps an adversarial backslash+quote label byte-faithful through a shape change (CR-01 order)', () => {
    // The label carries BOTH a backslash and a double quote — the CR-01
    // escape order (backslash FIRST, then quotes) must keep the round-trip
    // lossless across a shape change, which re-escapes on emission and
    // re-unescapes on parse. A directive target keeps the escaped
    // always-quoted writer on the path.
    const source = 'flowchart TD\nA@{ shape: "rect", label: "C:\\\\path \\"q\\"", w: 80 }';
    const changed = updateNodeShape(source, 'A', 'person');

    expect(changed).toBe('flowchart TD\nA@{ shape: "person", label: "C:\\\\path \\"q\\"", w: 80 }');

    const reparsed = parseDiagram(changed);
    const node = reparsed.nodes.find(n => n.id === 'A');
    expect(node?.shape).toBe('person');
    expect(node?.label).toBe('C:\\path "q"');
    expect(node?.unknownParams).toEqual(['w: 80']);
  });
});

// ===== 38-02 Task 2: the full-domain round-trip battery. The sweeps
// enumerate the REAL domain — all 53 CANONICAL_SHAPES plus the full
// ALIAS_TO_CANONICAL catalog — never a hand-picked fixture subset; the
// sweep lengths are pinned in dedicated tests so a registry shrink fails
// loudly instead of silently narrowing the battery. =====
describe('full-domain round-trip battery (38-02 Task 2)', () => {
  it('the canonical sweep enumerates the full registry domain (53, not a subset)', () => {
    expect(CANONICAL_SHAPES).toHaveLength(53);
    expect(new Set(CANONICAL_SHAPES.map(s => s.shortName)).size).toBe(53);
  });

  it('the alias sweep enumerates the full catalog (98 measured entries)', () => {
    expect(ALIAS_TO_CANONICAL.size).toBe(98);
  });

  // (1) Canonical sweep: every canonical shortName parses from its directive
  // form with no authored delta, and a same-shape change re-emits text that
  // re-parses identically (shape + label); directive-span emissions carry
  // the canonical key.
  it.each(CANONICAL_SHAPES.map(s => [s.shortName] as [string]))(
    'canonical sweep: %s parses and round-trips losslessly',
    (shortName) => {
      const source = `flowchart TD\nA@{ shape: "${shortName}", label: "X" }`;
      const parsed = parseDiagram(source);
      const node = parsed.nodes.find(n => n.id === 'A');
      if (!node) {throw new Error('canonical sweep: node A missing');}
      expect(node.shape).toBe(shortName);
      expect(node.authoredShape).toBeUndefined();

      const emitted = updateNodeShape(source, 'A', node.shape);
      const reparsed = parseDiagram(emitted);
      const rnode = reparsed.nodes.find(n => n.id === 'A');
      expect(rnode?.shape).toBe(shortName);
      expect(rnode?.label).toBe('X');
      if (emitted.includes('@{')) {
        expect(emitted).toContain(`shape: "${shortName}"`);
      } else {
        // Bracket-form family: the emission is delimiters, never a span.
        expect(emitted).not.toContain('@{');
      }
    },
  );

  // (2) Alias sweep: every catalog entry parses to its canonical target with
  // authoredShape carrying the alias token (self-aliases are canonical
  // tokens — authoredShape undefined); an explicit shape change emits the
  // canonical key, never the alias; a label edit keeps mermaid-safe alias
  // tokens verbatim (authoredShape survives) while the net-new legacy keys
  // (round et al. — mermaid 12 rejects them inside a directive span,
  // probe-verified) translate to their canonical targets.
  it.each([...ALIAS_TO_CANONICAL.entries()] as [string, string][])(
    'alias sweep: %s resolves to %s with authored preservation and canonical emission',
    (alias, target) => {
      const source = `flowchart TD\nA@{ shape: "${alias}", label: "X" }`;
      const parsed = parseDiagram(source);
      const node = parsed.nodes.find(n => n.id === 'A');
      if (!node) {throw new Error('alias sweep: node A missing');}
      expect(node.shape).toBe(target);
      if (alias === target) {
        expect(node.authoredShape).toBeUndefined();
      } else {
        expect(node.authoredShape).toBe(alias);
      }

      const emitted = updateNodeShape(source, 'A', node.shape);
      if (emitted.includes('@{')) {
        expect(emitted).toContain(`shape: "${target}"`);
      } else {
        expect(emitted).not.toContain('@{');
      }
      if (alias !== target) {
        expect(emitted).not.toContain(`shape: "${alias}"`);
      }

      const renamed = updateNodeLabel(source, 'A', 'Y');
      const rnode = parseDiagram(renamed).nodes.find(n => n.id === 'A');
      expect(rnode?.shape).toBe(target);
      const netNewLegacy =
        alias !== target && !CANONICAL_SHAPES.some(s => s.aliases.includes(alias));
      if (netNewLegacy) {
        expect(renamed).not.toContain(`shape: "${alias}"`);
        expect(rnode?.authoredShape).toBeUndefined();
      } else if (alias === target) {
        expect(rnode?.authoredShape).toBeUndefined();
      } else {
        expect(rnode?.authoredShape).toBe(alias);
      }
    },
  );

  // (3) Legacy delimiter-family byte-identity — all 14 SHAPE_PATTERNS
  // families, plain and quoted variants: parse then re-emit (updateNodeShape
  // to the parsed shape) reproduces the line byte-identically. The quoted
  // subroutine uses the compact [["x"]] form the P7-fixed regex now claims;
  // the other quoted spellings parse through their plain family with the
  // quote characters inside the label (byte-identical re-emission).
  it.each([
    ['stadium', 'A([x])', 'A(["x"])'],
    ['fr-rect', 'A[[x]]', 'A[["x"]]'],
    ['cyl', 'A[(x)]', 'A[("x")]'],
    ['dbl-circ', 'A(((x)))', 'A((("x")))'],
    ['circle', 'A((x))', 'A(("x"))'],
    ['hex', 'A{{x}}', 'A{{"x"}}'],
    ['diam', 'A{x}', 'A{"x"}'],
    ['rounded', 'A(x)', 'A("x")'],
    ['odd', 'A>x]', 'A>"x"]'],
    ['lean-r', 'A[/x/]', 'A[/"x"/]'],
    ['lean-l', 'A[\\x\\]', 'A[\\"x"\\]'],
    ['trap-b', 'A[/x\\]', 'A[/"x"\\]'],
    ['trap-t', 'A[\\x/]', 'A[\\"x"/]'],
    ['rect', 'A[x]', 'A["x"]'],
  ] as [string, string, string][])(
    'delimiter family %s round-trips byte-identical (%s and %s)',
    (_family, plain, quoted) => {
      for (const line of [plain, quoted]) {
        const source = `flowchart TD\n${line}`;
        const parsed = parseDiagram(source);
        const node = parsed.nodes.find(n => n.id === 'A');
        if (!node) {throw new Error(`byte-identity: node A missing for ${line}`);}
        const emitted = updateNodeShape(source, 'A', node.shape);
        expect(emitted).toBe(source);
      }
    },
  );

  // (4) Ellipse verbatim pin — `A(-label-)` parses in the paren family with
  // its bare label and re-emits byte-identically. No code path invents an
  // @{ shape: "ellipse" } span or rewrites the node to rect with different
  // text. (The mermaid-side render failure is upstream — P1: shapesDefs has
  // no ellipse entry; the app's Preview shows mermaid's error, the DATA
  // layer must not lose the authored form.)
  it('ellipse paren form parses, keeps its family, and re-emits byte-identical', () => {
    const source = 'flowchart TD\nA(-label-) --> B';
    const parsed = parseDiagram(source);
    const a = parsed.nodes.find(n => n.id === 'A');
    if (!a) {throw new Error('ellipse pin: node A missing');}
    expect(a.label).toBe('-label-');
    expect(a.shape).toBe('rounded');
    expect(a.raw).toBe('(-label-)');

    // Byte-identity through the safe writer path (updateNodeLabel — the
    // updateNodeShape edge-line branch is the documented D3 pre-existing
    // gap and stays out of scope). The edge writer re-emits its normalized
    // single-space form (pre-existing contract — the space before the arrow
    // collapses); the ellipse delimiters and label must survive verbatim,
    // with no invented ellipse span and no rect rewrite.
    const same = updateNodeLabel(source, 'A', '-label-');
    // The writer's normalized form drops arrow-adjacent spaces (the same
    // contract the baseline rename pin asserts: `A[NewLabel]-->B`); the
    // ellipse delimiters and label survive verbatim, with no invented
    // ellipse span and no rect rewrite.
    expect(same).toBe('flowchart TD\nA(-label-)-->B');
    expect(same).not.toContain('@{ shape: "ellipse" }');

    const renamed = updateNodeLabel(source, 'A', '-renamed-');
    expect(renamed).toContain('A(-renamed-)');
    expect(renamed).not.toContain('@{');

    // Standalone form round-trips through updateNodeShape as well.
    const standalone = 'flowchart TD\nA(-label-)';
    expect(updateNodeShape(standalone, 'A', a.shape)).toBe(standalone);
  });

  it('populates authoredShape on an edge-line directive target too', () => {
    const parsed = parseDiagram('flowchart TD\nA --> B@{ shape: "card", label: "B" }');
    const b = parsed.nodes.find(n => n.id === 'B');
    expect(b?.shape).toBe('notch-rect');
    expect(b?.authoredShape).toBe('card');
  });

  // (5) Adjacency: two directive blocks on ONE node line parse
  // independently, each with its own shape and label.
  it('parses two directive blocks on one edge line independently', () => {
    const source = 'flowchart TD\nA@{ shape: "rect", label: "One" } --> B@{ shape: "circle", label: "Two" }';
    const parsed = parseDiagram(source);
    const a = parsed.nodes.find(n => n.id === 'A');
    const b = parsed.nodes.find(n => n.id === 'B');
    expect(a?.shape).toBe('rect');
    expect(a?.label).toBe('One');
    expect(b?.shape).toBe('circle');
    expect(b?.label).toBe('Two');
    expect(parsed.edges).toHaveLength(1);
  });

  // (6) Empty label: the directive form emits label: "" and it survives
  // parse + re-emission as an empty string (never the null-fallback to the
  // node id); empty-line input is a no-op for every mutator.
  it('parses an empty directive label as empty string and re-emits label: ""', () => {
    const source = 'flowchart TD\nA@{ shape: "rect", label: "" }';
    const parsed = parseDiagram(source);
    expect(parsed.nodes.find(n => n.id === 'A')?.label).toBe('');

    const renamed = updateNodeLabel(source, 'A', '');
    expect(renamed).toBe(source);

    const reshaped = updateNodeShape(source, 'A', 'person');
    expect(reshaped).toBe('flowchart TD\nA@{ shape: "person", label: "" }');
    expect(parseDiagram(reshaped).nodes.find(n => n.id === 'A')?.label).toBe('');
  });

  it('returns empty-string input unchanged from updateNodeShape, updateNodeLabel, removeEdge', () => {
    expect(updateNodeShape('', 'A', 'rect')).toBe('');
    expect(updateNodeLabel('', 'A', 'X')).toBe('');
    expect(removeEdge('', 'A', 'B')).toBe('');
  });

  // (7) Encoding: shape matching is lowercase-exact — an uppercase token
  // never silently canonicalizes, and a label edit re-emits the authored
  // spelling verbatim (codeUtils never re-cases user input).
  it('never silently canonicalizes an uppercase token — authoredShape survives a label edit', () => {
    const source = 'flowchart TD\nA@{ shape: "RECT", label: "X" }';
    const parsed = parseDiagram(source);
    const a = parsed.nodes.find(n => n.id === 'A');
    expect(a?.shape).toBe('RECT');
    expect(a?.authoredShape).toBe('RECT');

    const renamed = updateNodeLabel(source, 'A', 'Y');
    expect(renamed).toContain('shape: "RECT"');
    const rnode = parseDiagram(renamed).nodes.find(n => n.id === 'A');
    expect(rnode?.shape).toBe('RECT');
    expect(rnode?.authoredShape).toBe('RECT');
  });

  // (8) Ordering: unknownParams re-emit verbatim, in their original order,
  // after the label — through both a label edit and a directive shape change.
  it('re-emits unknown params in their original order after the label', () => {
    const source = 'flowchart TD\nA@{ shape: "rect", label: "X", w: 40, h: 20, foo: "bar" }';
    const parsed = parseDiagram(source);
    expect(parsed.nodes.find(n => n.id === 'A')?.unknownParams)
      .toEqual(['w: 40', 'h: 20', 'foo: "bar"']);

    const renamed = updateNodeLabel(source, 'A', 'New');
    expect(renamed).toBe('flowchart TD\nA@{ shape: "rect", label: "New", w: 40, h: 20, foo: "bar" }');

    const reshaped = updateNodeShape(source, 'A', 'person');
    expect(reshaped).toBe('flowchart TD\nA@{ shape: "person", label: "X", w: 40, h: 20, foo: "bar" }');
  });
});

// ===== 38-03 Task 1: ghost-node cascade delete =====
// The three research-reproduced defects (38-RESEARCH.md Pattern 2), pinned
// red-to-green on the probe's exact sources. RED baseline measured at HEAD
// e159440 (pre-fix tree): removeNode('A') on the attached-form source
// re-emitted `e1@`, vanished B, and orphaned `e1@{ animate: true }`;
// removeEdge('A','B') on the spaced-form source orphaned the metadata line;
// `SG@{ view: collapsed }` was silently dropped from the parsed model.
describe('ghost-node cascade delete (38-03 Task 1)', () => {
  // The probe's exact source: an edge whose SOURCE carries a directive span,
  // a bare 12.3 edge-id line (attached form), that edge's metadata line, and
  // a subgraph carrying its own directive line.
  const GHOST = [
    'flowchart LR',
    '  A@{ shape: rect, label: "A" } --> B',
    '  e1@--> A',
    '  e1@{ animate: true }',
    '  subgraph SG [Box]',
    '  end',
    '  SG@{ view: collapsed }',
  ].join('\n');

  // The spaced 12.3 edge-id form: the A–B edge CARRIES the id e1, and the
  // `e1@{ animate: true }` line is that edge's metadata.
  const GHOST_SPACED = [
    'flowchart LR',
    '  A@{ shape: rect, label: "A" } e1@--> B',
    '  e1@{ animate: true }',
    '  subgraph SG [Box]',
    '  end',
    '  SG@{ view: collapsed }',
  ].join('\n');

  it('removeNode keeps the directive-edge target alive (vanished-B defect)', () => {
    const out = removeNode(GHOST, 'A');
    // B was only declared on the A–B line — it keeps a standalone declaration.
    expect(out).toContain('  B');
    expect(out).not.toContain('A@{');
    // The re-emission is well-formed: no mangled bare `e1@` remnant, and the
    // untouched source node e1 survives with a clean standalone declaration.
    expect(out).not.toContain('e1@');
    expect(out).toContain('  e1\n');
    // The A–B edge and the e1-->A edge both died with A, so e1's metadata
    // line cascades (the e1 edge no longer exists).
    expect(out).not.toContain('animate');
    // Everything else survives in its original order.
    expect(out).toBe(
      'flowchart LR\n  B\n  e1\n  subgraph SG [Box]\n  end\n  SG@{ view: collapsed }',
    );
  });

  it('removeEdge removes the dead edge id metadata line (orphaned-e1@ defect)', () => {
    const out = removeEdge(GHOST_SPACED, 'A', 'B');
    // The A–B edge carried the id e1 — its metadata dies with it (no orphan).
    expect(out).not.toContain('animate');
    expect(out).not.toContain('e1@');
    // Unrelated linked lines and nodes are untouched.
    expect(out).toContain('SG@{ view: collapsed }');
    expect(out).toContain('subgraph SG [Box]');
  });

  it('removeNode on the spaced form cascades the edge metadata and keeps B', () => {
    const out = removeNode(GHOST_SPACED, 'A');
    // The A–B edge (id e1) died with A; its metadata cascades.
    expect(out).not.toContain('animate');
    // B was only declared on the edge line — it keeps a standalone declaration.
    expect(out).toContain('  B');
    expect(out).not.toContain('e1@');
    expect(out).toContain('SG@{ view: collapsed }');
  });

  it('the subgraph directive line survives unrelated removals verbatim and is linked', () => {
    // Removing an unrelated node / a nonexistent edge leaves every byte in
    // place — including the subgraph's directive line, in position.
    expect(removeNode(GHOST, 'ZZZ')).toBe(GHOST);
    expect(removeEdge(GHOST, 'X', 'Y')).toBe(GHOST);
    // The registry links both metadata lines verbatim, by entity id, and
    // parseDiagram no longer drops them from its model.
    const parsed = parseDiagram(GHOST);
    expect(parsed.linkedDirectives.get('SG')).toEqual(['SG@{ view: collapsed }']);
    expect(parsed.linkedDirectives.get('e1')).toEqual(['e1@{ animate: true }']);
    // The registry carries exactly the NON-node directive lines — the
    // directive node declarations are nodes, not metadata.
    expect(parsed.linkedDirectives.has('A')).toBe(false);
    expect(parsed.linkedDirectives.has('B')).toBe(false);
  });

  it('removeEdge leaves a live edge id metadata line alone (unrelated cascade guard)', () => {
    // On the attached-form source the A–B edge carries NO edge id, so
    // removing it must NOT cascade the e1 metadata — the e1-->A edge is
    // untouched and its metadata stays exactly where it was.
    const out = removeEdge(GHOST, 'A', 'B');
    expect(out).toContain('e1@{ animate: true }');
    expect(out).toContain('e1@--> A');
    expect(out).toContain('SG@{ view: collapsed }');
    expect(out).not.toContain('A@{');
  });

  it('removeNode cascades a linked node directive line generic by id', () => {
    const source = 'flowchart TD\n  A@{ shape: rect, label: "A" }\n  e1@--> A\n  e1@{ animate: true }';
    const out = removeNode(source, 'A');
    expect(out).not.toContain('animate');
    expect(out.split('\n')).toContain('  e1');
    // ...and removing the e1 node itself removes its own metadata line.
    const outE1 = removeNode('flowchart TD\nX\ne1@{ animate: true }', 'e1');
    expect(outE1).not.toContain('animate');
    expect(outE1).toContain('X');
  });

  it('removing one directive node leaves the sibling directive line intact and in order', () => {
    const source = 'flowchart TD\nA@{ shape: rect, label: "A" }\nB@{ shape: rect, label: "B" }';
    const out = removeNode(source, 'A');
    expect(out).toBe('flowchart TD\nB@{ shape: rect, label: "B" }');
    expect(out.indexOf('B@{')).toBeGreaterThan('flowchart TD\n'.length - 1);
  });

  it('removing a directive-less node leaves every other line byte-identical and in order', () => {
    const source = [
      'flowchart LR',
      '  A',
      '  B@{ shape: rect, label: "B" }',
      '  C(x)',
      '  D@{ shape: doc, label: "D" }',
    ].join('\n');
    const out = removeNode(source, 'C');
    expect(out).toBe('flowchart LR\n  A\n  B@{ shape: rect, label: "B" }\n  D@{ shape: doc, label: "D" }');
  });

  it('removeSubgraph cascades the subgraph directive line', () => {
    const out = removeSubgraph(GHOST, 'SG');
    expect(out).not.toContain('subgraph SG');
    expect(out).not.toContain('SG@{ view: collapsed }');
    // Lines outside the block are untouched verbatim — including e1's live
    // metadata (its edge still exists).
    expect(out).toContain('A@{ shape: rect, label: "A" } --> B');
    expect(out).toContain('e1@{ animate: true }');
  });

  it('a two-span edge line fences when one span is malformed and stays editable when both parse', () => {
    const wellFormed = 'flowchart TD\nA@{ shape: rect, label: "A" } --> B@{ shape: doc, label: "B" }';
    expect(bodyHasUnparsedAtDirective(wellFormed)).toBe(false);
    const malformed = 'flowchart TD\nA@{ shape: rect, label: "A" } --> B@{ shape: doc, label: "B"';
    expect(bodyHasUnparsedAtDirective(malformed)).toBe(true);
  });
});
