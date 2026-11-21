// Template library locks (24-01 Task 2, DIA-02/D4).
//
// Lock 1 — all-templates detection: every TEMPLATES entry's content must
// detect to its own declared `type`. This is the systemic keyword-mismatch
// guard for the whole library: a template whose content keyword drifts from
// its declared type (e.g. the v12 `usecase-beta` trigger vs the app-internal
// `usecaseDiagram` union label) fails here at the library level, not as a
// broken user-facing template. Never weaken or delete this assertion to get
// green — fix the type or the content keyword at the root.
//
// Lock 2 — usecase render: the new usecase template renders through the app's
// single mermaid entrypoint (renderDiagram — never mermaid.render directly,
// Pitfall 2) with no error (getBBox tolerance) and a non-empty sanitized SVG.
// Render-validated before locking (research A4 observe-before-assert).
import { describe, it, expect, beforeAll } from 'vitest';
import { TEMPLATES } from '../templates';
import { detectDiagramType, renderDiagram, initMermaid } from '@/lib/mermaid/core';

// Same narrowed swallow as theme-matrix/structure-goldens (IN-05).
const GETBBOX_JSDOM_LIMITATION = /\bgetBBox\b[^\n]*\bnot a function\b/;

// Local getComputedTextLength polyfill matching diagram-type-sweep.test.ts so
// treemap/venn/wardley curated templates prove a real render through renderDiagram.
beforeAll(() => {
  const proto = (globalThis as unknown as { SVGElement?: { prototype: Record<string, unknown> } })
    .SVGElement?.prototype;
  if (proto && typeof proto.getComputedTextLength !== 'function') {
    proto.getComputedTextLength = function getComputedTextLength(this: SVGElement): number {
      return (this.textContent ?? '').length * 8;
    };
  }
});

const PHASE_41_CURATED_IDS = [
  'flowchart-v12-shapes',
  'flowchart-v12-icons',
  'flowchart-v12-edges',
  'flowchart-v12-collapsed',
  'ishikawa-root-cause',
  'radar-skills',
  'treemap-budget',
  'eventmodeling-checkout',
  'venn-product-fit',
  'treeview-repo',
  'wardley-tea-shop',
  'cynefin-incident',
  'railroad-grammar',
  'swimlane-support',
] as const;

describe('templates', () => {
  describe('all-templates detection lock', () => {
    it('every template detects to its declared type', () => {
      // Non-vacuity guard: the lock is meaningless over an empty/shrunk library.
      expect(TEMPLATES.length).toBeGreaterThanOrEqual(38);
      for (const t of TEMPLATES) {
        expect(
          detectDiagramType(t.content),
          `template "${t.id}" (${t.type}) content detects as ${detectDiagramType(t.content)} — content keyword and declared type have drifted`
        ).toBe(t.type);
      }
    });
  });

  describe('TMPL-01 repaired broken templates', () => {
    it('class-ecommerce and requirement-system declare matching categories and types', () => {
      const classEcommerce = TEMPLATES.find(t => t.id === 'class-ecommerce');
      expect(classEcommerce).toBeDefined();
      expect(classEcommerce?.type).toBe('classDiagram');
      expect(classEcommerce?.category).toBe('Class Diagram');
      expect(detectDiagramType(classEcommerce!.content)).toBe('classDiagram');

      const reqSystem = TEMPLATES.find(t => t.id === 'requirement-system');
      const reqAuth = TEMPLATES.find(t => t.id === 'requirement-auth');
      expect(reqSystem).toBeDefined();
      expect(reqSystem?.type).toBe('requirementDiagram');
      expect(reqSystem?.category).toBe('Requirement Diagram');
      expect(detectDiagramType(reqSystem!.content)).toBe('requirementDiagram');
      expect(reqSystem?.content).not.toBe(reqAuth?.content);
    });

    it.each(['class-ecommerce', 'requirement-system'] as const)(
      'renders repaired %s template cleanly',
      { timeout: 30000 },
      async templateId => {
        initMermaid('light');
        const template = TEMPLATES.find(t => t.id === templateId)!;
        const id = `repaired_${templateId}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const { svg, error } = await renderDiagram(template.content, id);
        try {
          if (error && !GETBBOX_JSDOM_LIMITATION.test(error)) {
            throw new Error(`Unexpected render error for ${templateId}: ${error}`);
          }
          expect(svg).not.toBe('');
          expect(svg).toMatch(/<(rect|circle|ellipse|polygon|path|text)[\s>]/);
        } finally {
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
        }
      }
    );
  });

  describe('TMPL-02 curated Phase 41 templates (10 families + 4 v12 Flowchart showcases)', () => {
    it('includes all 14 curated Phase 41 templates with unique ids', () => {
      const ids = TEMPLATES.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of PHASE_41_CURATED_IDS) {
        expect(TEMPLATES.find(t => t.id === id), `missing template ${id}`).toBeDefined();
      }
    });

    it.each(TEMPLATES.map(t => [t.id, t] as const))(
      'renders built-in template %s cleanly through renderDiagram',
      { timeout: 30000 },
      async (templateId, template) => {
        initMermaid('light');
        const id = `builtin_${templateId}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const { svg, error } = await renderDiagram(template.content, id);
        try {
          if (error && !GETBBOX_JSDOM_LIMITATION.test(error)) {
            throw new Error(`Unexpected render error for ${templateId}: ${error}`);
          }
          expect(svg).not.toBe('');
          expect(svg).toMatch(/<(rect|circle|ellipse|polygon|path|text|line)[\s>]/);
        } finally {
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
        }
      }
    );
  });

  describe('usecase template (D4)', () => {
    it('exists exactly once and starts with the v12 trigger keyword', () => {
      const usecaseTemplates = TEMPLATES.filter(t => t.type === 'usecaseDiagram');
      expect(usecaseTemplates.length).toBe(1);
      const template = usecaseTemplates[0];
      // The content's first line (after frontmatter) must be the v12 trigger
      // keyword `usecase-beta` — never the internal module-name spelling
      // (research Pitfall 1).
      expect(template.id).toBe('usecase-system');
      expect(template.content).toMatch(/^---\nconfig:\n {2}theme: 'base'\n---\nusecase-beta\n/);
    });

    it('renders the usecase template content through renderDiagram', { timeout: 30000 }, async () => {
      initMermaid('light');
      const template = TEMPLATES.find(t => t.id === 'usecase-system');
      expect(template).toBeDefined();
      const id = 'usecase_template_render';
      const { svg, error } = await renderDiagram(template!.content, id);
      try {
        if (error && !GETBBOX_JSDOM_LIMITATION.test(error)) {
          throw new Error(`Unexpected render error: ${error}`);
        }
        // Non-empty sanitized SVG with at least one shape/text element (D1 floor).
        expect(svg).not.toBe('');
        expect(svg).toMatch(/<(rect|circle|ellipse|polygon|path|text)[\s>]/);
      } finally {
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      }
    });
  });
});
