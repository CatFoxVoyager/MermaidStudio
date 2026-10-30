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
});
