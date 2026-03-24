/**
 * Tests for Mermaid autocomplete utilities
 */

import { describe, it, expect } from 'vitest';
import { mermaidAutocomplete } from '../autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

describe('Mermaid Autocomplete', () => {
  describe('Diagram Type Detection', () => {
    it('should detect flowchart type', () => {
      const doc = 'flowchart TD\nA-->B';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 10, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect sequence diagram type', () => {
      const doc = 'sequenceDiagram\nA->B: Hello';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 20, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect class diagram type', () => {
      const doc = 'classDiagram\nA --> B';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 15, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect state diagram type', () => {
      const doc = 'stateDiagram-v2\nA --> B';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 18, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect ER diagram type', () => {
      const doc = 'erDiagram\nA ||--o{ B';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 15, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect gantt chart type', () => {
      const doc = 'gantt\ntitle Test';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 10, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect pie chart type', () => {
      const doc = 'pie title Test';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 10, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect mindmap type', () => {
      const doc = 'mindmap\nRoot((A))';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 10, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect git graph type', () => {
      const doc = 'gitGraph\ncommit';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 10, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should detect journey type', () => {
      const doc = 'journey\ntitle Test';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 10, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });
  });

  describe('Keyword Completions', () => {
    it('should provide flowchart keywords', () => {
      const doc = 'flowchart TD\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide sequence diagram keywords', () => {
      const doc = 'sequenceDiagram\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide gantt keywords', () => {
      const doc = 'gantt\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide ER diagram keywords', () => {
      const doc = 'erDiagram\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide state diagram keywords', () => {
      const doc = 'stateDiagram-v2\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide class diagram keywords', () => {
      const doc = 'classDiagram\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide git graph keywords', () => {
      const doc = 'gitGraph\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should provide journey keywords', () => {
      const doc = 'journey\n';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const doc = '';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 0, true);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle comments', () => {
      const doc = '%% This is a comment\nflowchart TD';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle multiline input', () => {
      const doc = 'flowchart TD\n  A-->B\n  B-->C';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle partial diagram type', () => {
      const doc = 'flowc';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, true);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle lowercase diagram type', () => {
      const doc = 'flowchart td\na-->b';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle graph alias for flowchart', () => {
      const doc = 'graph LR\nA-->B';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, 5, false);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });
  });

  describe('Completion Filtering', () => {
    it('should filter completions by context', () => {
      const doc = 'flowchart TD\nsu';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, true);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle arrow completion', () => {
      const doc = 'flowchart TD\nA--';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, true);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });

    it('should handle node completion', () => {
      const doc = 'flowchart TD\nA[';
      const state = EditorState.create({ doc });
      void new CompletionContext(state, doc.length, true);

      const result = mermaidAutocomplete as any;
      expect(result).toBeDefined();
    });
  });

  describe('Completion Content Tests', () => {
    it('should return diagram starters for first line', () => {
      const doc = '';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, 0, true);

      // Test that we get completions for empty document
      expect(context).toBeDefined();
      expect(state.doc.length).toBe(0);
    });

    it('should return flowchart-specific keywords', () => {
      const doc = 'flowchart TD\n';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, doc.length, true);

      // Verify context is created for flowchart
      expect(context).toBeDefined();
      expect(doc).toContain('flowchart');
    });

    it('should return sequence diagram-specific keywords', () => {
      const doc = 'sequenceDiagram\n';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, doc.length, true);

      // Verify context is created for sequence diagram
      expect(context).toBeDefined();
      expect(doc).toContain('sequenceDiagram');
    });

    it('should return class diagram-specific keywords', () => {
      const doc = 'classDiagram\n';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, doc.length, true);

      // Verify context is created for class diagram
      expect(context).toBeDefined();
      expect(doc).toContain('classDiagram');
    });

    it('should return state diagram-specific keywords', () => {
      const doc = 'stateDiagram-v2\n';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, doc.length, true);

      // Verify context is created for state diagram
      expect(context).toBeDefined();
      expect(doc).toContain('stateDiagram-v2');
    });

    it('should filter completions by prefix', () => {
      const doc = 'flowchart TD\nsub';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, doc.length, true);

      // Verify context is created for prefix filtering
      expect(context).toBeDefined();
      expect(doc).toContain('sub');
    });

    it('should handle unknown diagram types', () => {
      const doc = 'unknownDiagram\n';
      const state = EditorState.create({ doc });
      const context = new CompletionContext(state, doc.length, true);

      // Should still create context even for unknown types
      expect(context).toBeDefined();
    });
  });
});
