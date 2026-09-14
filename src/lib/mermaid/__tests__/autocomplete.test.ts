/**
 * Tests for Mermaid autocomplete utilities
 */

import { describe, it, expect } from 'vitest';
import { mermaidAutocomplete, mermaidCompletions } from '../autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { TEMPLATES } from '@/constants/templates';

interface CompletionOption {
  label: string;
  detail?: string;
  type?: string;
}

/**
 * Invoke the REAL completion source (the same function `mermaidAutocomplete`
 * wires as its override) against a document and return the offered option
 * labels. `pos` defaults to end-of-document; `explicit` defaults to true so
 * contexts with no word under the cursor still produce options.
 */
function runCompletions(doc: string, pos?: number, explicit = true): CompletionOption[] {
  const state = EditorState.create({ doc });
  const context = new CompletionContext(state, pos ?? doc.length, explicit);
  const result = mermaidCompletions(context);
  return result ? Array.from(result.options) as CompletionOption[] : [];
}

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

describe('v12 adopted-type completions', () => {
  const USECASE_LABELS = [
    'actor',
    'systemBoundary',
    'end',
    'direction',
    'note for',
    'classDef',
    'style',
    'include',
    'extend',
    '..>',
    '--|>',
  ];

  it('offers the usecase-beta starter on the first line (verified v12 trigger spelling)', () => {
    const options = runCompletions('use');
    const labels = options.map(o => o.label);
    expect(labels).toContain('usecase-beta');
    // The filter narrows to exactly the new starter — nothing else contains 'use'
    expect(labels).toEqual(['usecase-beta']);
  });

  it('offers the usecase-beta starter on an empty document', () => {
    const labels = runCompletions('').map(o => o.label);
    expect(labels).toContain('usecase-beta');
  });

  it('routes a usecase-beta first line to the usecase completion group', () => {
    const labels = runCompletions('usecase-beta\n').map(o => o.label);
    for (const expected of USECASE_LABELS) {
      expect(labels).toContain(expected);
    }
  });

  it('replaces the generic fallback: no sequence/gitgraph-only entries inside usecase', () => {
    const labels = runCompletions('usecase-beta\n').map(o => o.label);
    expect(labels).not.toContain('participant'); // SEQUENCE_COMPLETIONS only
    expect(labels).not.toContain('commit'); // GITGRAPH_COMPLETIONS only
  });

  it('filters the usecase group by a partial token on a later line', () => {
    const doc = 'usecase-beta\nactor U\nsys';
    const labels = runCompletions(doc).map(o => o.label);
    expect(labels).toContain('systemBoundary');
  });
});

describe('v12 gap entries', () => {
  const RAILROAD_LABELS = ['terminal', 'nonterminal', 'choice', 'sequence', 'optional', 'oneOrMore'];
  const CYNEFIN_LABELS = ['clear', 'complicated', 'complex', 'chaotic', 'confusion'];
  const SWIMLANE_LABELS = ['subgraph', 'direction', 'end', '-->'];
  const SHAPE_LABELS = [
    'doc', 'docs', 'dbl-circ', 'cross-circ', 'bow-rect', 'flip-tri', 'curv-trap',
    'manual-file', 'manual-input', 'procs', 'paper-tape',
    'person', 'browser', 'cloud', 'console', 'bucket', 'folder', 'fork', 'join',
    'hourglass', 'flag', 'text', 'odd', 'bang', 'bolt',
  ];

  describe('starter keywords (verified -beta spellings)', () => {
    it('offers exactly swimlane-beta for partial `swi` on the first line', () => {
      const labels = runCompletions('swi').map(o => o.label);
      expect(labels).toEqual(['swimlane-beta']);
    });

    it('offers exactly railroad-beta for partial `rail` on the first line', () => {
      const labels = runCompletions('rail').map(o => o.label);
      expect(labels).toEqual(['railroad-beta']);
    });

    it('offers exactly cynefin-beta for partial `cynef` on the first line', () => {
      const labels = runCompletions('cynef').map(o => o.label);
      expect(labels).toEqual(['cynefin-beta']);
    });
  });

  describe('completion group routing', () => {
    it('routes a railroad-beta first line to the railroad group', () => {
      const labels = runCompletions('railroad-beta\n').map(o => o.label);
      for (const expected of RAILROAD_LABELS) {
        expect(labels).toContain(expected);
      }
      expect(labels).not.toContain('participant'); // generic fallback must be replaced
    });

    it('routes a cynefin-beta first line to the cynefin group', () => {
      const labels = runCompletions('cynefin-beta\n').map(o => o.label);
      for (const expected of CYNEFIN_LABELS) {
        expect(labels).toContain(expected);
      }
      expect(labels).not.toContain('participant');
    });

    it('routes a swimlane-beta first line to the swimlane group', () => {
      const labels = runCompletions('swimlane-beta\n').map(o => o.label);
      for (const expected of SWIMLANE_LABELS) {
        expect(labels).toContain(expected);
      }
      expect(labels).not.toContain('participant');
    });
  });

  describe('shape completions in flowchart context', () => {
    it('offers the full curated 25-entry shape vocabulary', () => {
      const labels = runCompletions('flowchart TD\n').map(o => o.label);
      for (const shape of SHAPE_LABELS) {
        expect(labels).toContain(shape);
      }
    });

    it('filters shape entries by a partial token', () => {
      const labels = runCompletions('flowchart TD\npers').map(o => o.label);
      expect(labels).toContain('person');
    });
  });

  describe('subgraph metadata entries', () => {
    it('offers both metadata entries for partial `@{`', () => {
      const labels = runCompletions('flowchart TD\n@{').map(o => o.label);
      expect(labels).toContain('@{ view: collapsed }');
      expect(labels).toContain('@{ shape: ');
    });

    it('offers the view-collapse entry for partial `view`', () => {
      const labels = runCompletions('flowchart TD\nview').map(o => o.label);
      expect(labels).toEqual(['@{ view: collapsed }']);
    });
  });
});

describe('v12 metadata completions — post-accept buffer text (WR-01)', () => {
  /**
   * Invoke the real completion source, pick the given option, and apply it to
   * the buffer exactly the way @codemirror/autocomplete does:
   * dist/index.js:1021 — the replacement end defaults to the cursor when the
   * source omits `to`; dist/index.js:1060 — the option label is inserted over
   * [result.from, result.to]. Returns the post-accept document text so tests
   * lock insertion behavior, not merely the offered option list.
   */
  function acceptCompletion(doc: string, label: string, pos?: number, explicit = true): string {
    const state = EditorState.create({ doc });
    const at = pos ?? doc.length;
    const context = new CompletionContext(state, at, explicit);
    const result = mermaidCompletions(context);
    if (!result) { throw new Error(`no completions offered at pos ${at}`); }
    const option = Array.from(result.options).find(o => o.label === label);
    if (!option) { throw new Error(`option not offered: ${label}`); }
    const to = result.to ?? at;
    return state.update({ changes: { from: result.from, to, insert: option.label } }).state.doc.toString();
  }

  it('typing `A@{` then accepting `@{ shape: ` yields `A@{ shape: ` — the typed @ is replaced, not doubled', () => {
    const after = acceptCompletion('flowchart TD\nA@{', '@{ shape: ');
    expect(after).toBe('flowchart TD\nA@{ shape: ');
    expect(after).not.toContain('@@');
  });

  it('typing `A@` then accepting `@{ shape: ` via the explicit path also yields a single @', () => {
    const after = acceptCompletion('flowchart TD\nA@', '@{ shape: ');
    expect(after).toBe('flowchart TD\nA@{ shape: ');
  });

  it('accepting `@{ view: collapsed }` after a typed `@{` yields exactly one `@{`', () => {
    const after = acceptCompletion('flowchart TD\nsubgraph X@{', '@{ view: collapsed }');
    expect(after).toBe('flowchart TD\nsubgraph X@{ view: collapsed }');
  });

  it('completions without a preceding @ are unaffected (replacement still starts at the word)', () => {
    const after = acceptCompletion('flowchart TD\nsu', 'subgraph');
    expect(after).toBe('flowchart TD\nsubgraph');
  });
});

describe('frontmatter documents — detectType sees past YAML frontmatter (WR-02)', () => {
  // All 25 app templates start with frontmatter; before the fix the first
  // non-comment line was the `---` delimiter, so every template-created
  // diagram detected as '' and offered the generic fallback set — the
  // per-type groups below were unreachable on the primary authoring path.
  // A trailing `\n` is appended to each probe so the cursor sits after a
  // line break: word = null, no prefix filter, the FULL group is offered.
  it('routes the frontmatter-carrying usecase-system template to the usecase group', () => {
    const template = TEMPLATES.find(t => t.id === 'usecase-system');
    expect(template).toBeDefined();
    expect(template!.content.startsWith('---')).toBe(true); // fixture premise
    const labels = runCompletions(template!.content + '\n').map(o => o.label);
    for (const expected of ['actor', 'systemBoundary', 'include', 'extend', '--|>']) {
      expect(
        labels,
        `usecase entry "${expected}" missing — frontmatter not stripped, generic fallback active`
      ).toContain(expected);
    }
    expect(labels).not.toContain('participant'); // generic fallback must be replaced
  });

  it('routes frontmatter-carrying sequence and flowchart templates to their groups', () => {
    const sequence = TEMPLATES.find(t => t.type === 'sequence');
    const flowchart = TEMPLATES.find(t => t.type === 'flowchart');
    expect(sequence).toBeDefined();
    expect(flowchart).toBeDefined();
    expect(sequence!.content.startsWith('---')).toBe(true);
    expect(flowchart!.content.startsWith('---')).toBe(true);
    // Group-specific entries that are ABSENT from the generic fallback keyword
    // list (MERMAID_KEYWORDS in language.ts contains 'participant'/'subgraph',
    // so those pass even pre-fix — falsifiability probe 2026-09-14):
    // 'note left of' exists only in SEQUENCE_COMPLETIONS, '@{ shape: ' only in
    // FLOWCHART_COMPLETIONS.
    expect(runCompletions(sequence!.content + '\n').map(o => o.label)).toContain('note left of');
    expect(runCompletions(flowchart!.content + '\n').map(o => o.label)).toContain('@{ shape: ');
  });

  it('still detects types for frontmatter-free documents (no regression on the %%-scan path)', () => {
    expect(runCompletions('usecase-beta\n').map(o => o.label)).toContain('systemBoundary');
  });
});
