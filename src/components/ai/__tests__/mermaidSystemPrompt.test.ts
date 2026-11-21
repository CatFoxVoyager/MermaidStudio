/**
 * Tests for mermaidSystemPrompt utility
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildCompactRAGPrompt, type DiagramContext } from '../mermaidSystemPrompt';
import { getMermaidContext, detectDiagramType as ragDetectType } from '@/services/ai/MermaidRAGService';

describe('buildSystemPrompt', () => {
  it('should return default prompt for undefined diagram type', () => {
    const context: DiagramContext = {
      currentContent: '',
      hasDiagram: false,
      diagramType: undefined
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Mermaid.js');
    expect(prompt).toContain('syntax');
    expect(prompt).toContain('SECURITY');
  });

  it('should return flowchart-specific prompt', () => {
    const context: DiagramContext = {
      currentContent: 'flowchart TD\nA-->B',
      hasDiagram: true,
      diagramType: 'flowchart'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('flowchart');
    expect(prompt).toContain('[process]');
    expect(prompt).toContain('A-->B');
  });

  it('should return sequence-specific prompt', () => {
    const context: DiagramContext = {
      currentContent: 'sequenceDiagram\nA->B: Hello',
      hasDiagram: true,
      diagramType: 'sequenceDiagram'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Sequence');
    expect(prompt).toContain('participant');
    expect(prompt).toContain('A->B: Hello');
  });

  it('should return class diagram-specific prompt', () => {
    const context: DiagramContext = {
      currentContent: 'classDiagram\nAnimal --> Duck',
      hasDiagram: true,
      diagramType: 'classDiagram'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('classDiagram');
    expect(prompt).toContain('Animal --> Duck');
  });

  it('should return state diagram-specific prompt', () => {
    const context: DiagramContext = {
      currentContent: 'stateDiagram-v2\n[*] --> Active',
      hasDiagram: true,
      diagramType: 'stateDiagram-v2'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('state');
    expect(prompt).toContain('[*] --> Active');
  });

  it('should include syntax best practices', () => {
    const context: DiagramContext = {
      currentContent: 'flowchart TD\nA-->B',
      hasDiagram: true,
      diagramType: 'flowchart'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toMatch(/syntax|guideline|best practice|RULES/i);
  });

  it('should include security rules', () => {
    const context: DiagramContext = {
      currentContent: 'flowchart TD\nA-->B',
      hasDiagram: true,
      diagramType: 'flowchart'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('SECURITY');
    expect(prompt).toContain('PROMPT INJECTION PROTECTION');
    expect(prompt).toContain('IGNORE ALL INSTRUCTIONS');
  });

  it('should handle custom diagram types gracefully', () => {
    const context: DiagramContext = {
      currentContent: 'customDiagram\nA-->B',
      hasDiagram: true,
      diagramType: 'customDiagram'
    };
    const prompt = buildSystemPrompt(context);

    // Should still include base prompt sections
    expect(prompt).toContain('Mermaid.js');
    expect(prompt).toContain('A-->B');
  });

  it('should handle no diagram case', () => {
    const context: DiagramContext = {
      currentContent: '',
      hasDiagram: false,
      diagramType: undefined
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Create new based on user request');
    expect(prompt).not.toContain('Current diagram');
  });

  it('should include response format guidelines', () => {
    const context: DiagramContext = {
      currentContent: 'flowchart TD\nA-->B',
      hasDiagram: true,
      diagramType: 'flowchart'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Response Format');
    expect(prompt).toContain('```mermaid');
    expect(prompt).toContain('NO explanations');
  });

  it('should include styling examples', () => {
    const context: DiagramContext = {
      currentContent: 'flowchart TD\nA-->B',
      hasDiagram: true,
      diagramType: 'flowchart'
    };
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Styling');
    expect(prompt).toContain('classDef');
    expect(prompt).toContain('fill:#3b82f6');
  });

  it('includes v12 Flowchart directives, Markdown labels, and all 10 new diagram families (EDIT-02)', () => {
    const prompt = buildSystemPrompt({
      currentContent: '',
      hasDiagram: false,
    });
    expect(prompt).toContain('@{ shape:');
    expect(prompt).toContain('@{ icon:');
    expect(prompt).toContain('@{ animate:');
    expect(prompt).toContain('@{ view: collapsed }');
    for (const family of [
      'ishikawa-beta', 'radar-beta', 'treemap-beta', 'eventmodeling',
      'venn-beta', 'treeView-beta', 'wardley-beta', 'cynefin-beta',
      'railroad-beta', 'swimlane-beta',
    ]) {
      expect(prompt).toContain(family);
    }
  });
});

describe('MermaidRAGService & buildCompactRAGPrompt (EDIT-02)', () => {
  it('routes all 32 families including exact-case treeView-beta and requirementDiagram without substring collision', () => {
    expect(ragDetectType('treeView-beta\n  root/')).toBe('treeView');
    expect(ragDetectType('---\ntitle: Demo\n---\nvenn-beta\n  set A')).toBe('venn');
    expect(ragDetectType('requirementDiagram\n  requirement r1 {}')).toBe('requirementDiagram');
    expect(getMermaidContext('requirementDiagram')).toContain('REQUIREMENTDIAGRAM');
    expect(getMermaidContext('treeView')).toContain('treeView-beta');
    expect(getMermaidContext('ishikawa')).toContain('ishikawa-beta');

    const compact = buildCompactRAGPrompt({
      currentContent: 'cynefin-beta\n  clear\n    "Restart"',
      hasDiagram: true,
    });
    expect(compact).toContain('cynefin-beta');
  });
});

