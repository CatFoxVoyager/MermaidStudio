import { describe, it, expect } from 'vitest';
// Imported from the NEW module directly: this also proves the module graph
// is clean — if anything transitively pulled the mermaid runtime, the jsdom
// test runtime would show it (slow load, side effects). The module must stay
// import-free apart from the erased `import type` (PERF-01 parser purity).
import { detectDiagramType } from '@/lib/mermaid/diagramType';

/**
 * Parity suite for the detectDiagramType relocation (29-02, PERF-01).
 * The function body moved verbatim out of src/lib/mermaid/core.ts into the
 * core-free src/lib/mermaid/diagramType.ts — these cases pin the behavior
 * the boot path depends on (status-bar type label, sidebar badges) so the
 * relocation is behavior-neutral.
 */
describe('detectDiagramType (core-free module parity)', () => {
  it("detects 'flowchart TB' as flowchart", () => {
    expect(detectDiagramType('flowchart TB\n  A --> B')).toBe('flowchart');
  });

  it("detects 'sequenceDiagram' as sequence", () => {
    expect(detectDiagramType('sequenceDiagram\n  A->>B: hi')).toBe('sequence');
  });

  it('detects through YAML frontmatter', () => {
    expect(
      detectDiagramType('---\ntitle: X\n---\nflowchart LR\n  A --> B'),
    ).toBe('flowchart');
  });

  it('detects through an init directive', () => {
    expect(
      detectDiagramType(
        "%%{init: {'theme': 'dark'}}%%\nsequenceDiagram\n  A->>B: hi",
      ),
    ).toBe('sequence');
  });

  it('detects through leading Mermaid comments', () => {
    expect(
      detectDiagramType('%% @theme corporate_blue\n%% another comment\npie\n  "a": 1'),
    ).toBe('pie');
  });

  it('returns unknown for empty content', () => {
    expect(detectDiagramType('')).toBe('unknown');
  });

  describe('DIAG-01 missing 10 Mermaid 12.3.0 families', () => {
    it.each([
      ['ishikawa-beta\n  Blurry Photo\n  Process', 'ishikawa'],
      ['ishikawa\n  Blurry Photo\n  Process', 'ishikawa'],
      ['radar-beta\n  axis A, B\n  curve c1{1, 2}', 'radar'],
      ['treemap-beta\n"Root"\n  "Leaf": 10', 'treemap'],
      ['treemap\n"Root"\n  "Leaf": 10', 'treemap'],
      ['eventmodeling\n  tf 01 ui Screen', 'eventmodeling'],
      ['venn-beta\n  set A\n  set B', 'venn'],
      ['treeView-beta\n  root/\n    child', 'treeView'],
      ['wardley-beta\n  title Tea', 'wardley'],
      ['cynefin-beta\n  title Sense', 'cynefin'],
      ['cynefin-beta:\n  title Sense', 'cynefin'],
      ['railroad-beta\n  r = terminal("a") ;', 'railroad'],
      ['railroad-ebnf-beta\n  r = "a" ;', 'railroad'],
      ['railroad-abnf-beta\n  r = "a"', 'railroad'],
      ['railroad-peg-beta\n  r <- "a"', 'railroad'],
      ['swimlane-beta\n  subgraph Lane\n    A\n  end', 'swimlane'],
    ] as const)('detects %s cleanly', (content, expected) => {
      expect(detectDiagramType(content)).toBe(expected);
    });

    it('enforces exact camelCase sensitivity on treeView-beta', () => {
      expect(detectDiagramType('treeView-beta\n  src/')).toBe('treeView');
      expect(detectDiagramType('treeview-beta\n  src/')).toBe('unknown');
      expect(detectDiagramType('TREEVIEW-BETA\n  src/')).toBe('unknown');
    });

    it('enforces word boundaries so prefixed invalid keywords fall through to unknown', () => {
      expect(detectDiagramType('radar-betamax\n  axis A')).toBe('unknown');
      expect(detectDiagramType('treemap-betax\n"Root"')).toBe('unknown');
      expect(detectDiagramType('eventmodelings\n  tf 01 ui A')).toBe('unknown');
      expect(detectDiagramType('venn-betamax\n  set A')).toBe('unknown');
      expect(detectDiagramType('treeView-betamax\n  src/')).toBe('unknown');
      expect(detectDiagramType('wardley-betamax\n  title X')).toBe('unknown');
      expect(detectDiagramType('cynefin-betamax\n  title X')).toBe('unknown');
      expect(detectDiagramType('railroad-betamax\n  r = "a"')).toBe('unknown');
      expect(detectDiagramType('swimlane-betamax\n  subgraph A\n  end')).toBe('unknown');
    });

    it('detects new families behind YAML frontmatter, init directives, and comments', () => {
      expect(
        detectDiagramType('---\nconfig:\n  theme: base\n---\n%% comment\ntreeView-beta\n  app/')
      ).toBe('treeView');
      expect(
        detectDiagramType("%%{init: {'theme': 'dark'}}%%\nswimlane-beta\n  subgraph S\n    A\n  end")
      ).toBe('swimlane');
    });
  });
});
