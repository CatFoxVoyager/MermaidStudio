import { describe, it, expect } from 'vitest';
import { buildFixSystemPrompt } from '../mermaidSystemPrompt';

describe('buildFixSystemPrompt', () => {
  it('should include current diagram code in the prompt', () => {
    const context = {
      currentContent: 'flowchart TD\n  A --> B\n  C[missing]',
      hasDiagram: true,
      diagramType: 'flowchart',
    };
    const prompt = buildFixSystemPrompt(context);
    expect(prompt).toContain('flowchart TD');
    expect(prompt).toContain('A --> B');
  });

  it('should include 3-pass analysis instructions', () => {
    const context = {
      currentContent: 'flowchart TD\n  A --> B',
      hasDiagram: true,
      diagramType: 'flowchart',
    };
    const prompt = buildFixSystemPrompt(context);
    expect(prompt).toContain('syntax');
    expect(prompt).toContain('semantic');
    expect(prompt).toContain('style');
  });

  it('should request explanation + code block format', () => {
    const prompt = buildFixSystemPrompt({
      currentContent: 'broken diagram',
      hasDiagram: true,
    });
    expect(prompt).toContain('explanation');
    expect(prompt).toContain('mermaid');
  });

  it('should handle empty diagrams', () => {
    const prompt = buildFixSystemPrompt({
      currentContent: '',
      hasDiagram: false,
    });
    expect(prompt).toContain('creating');
    expect(prompt.length).toBeGreaterThan(100);
  });
});
