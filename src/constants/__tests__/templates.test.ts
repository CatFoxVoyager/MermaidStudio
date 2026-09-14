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
import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '../templates';
import { detectDiagramType, renderDiagram, initMermaid } from '@/lib/mermaid/core';

// Same narrowed swallow as theme-matrix/structure-goldens (IN-05).
const GETBBOX_JSDOM_LIMITATION = /\bgetBBox\b[^\n]*\bnot a function\b/;

describe('templates', () => {
  describe('all-templates detection lock', () => {
    it('every template detects to its declared type', () => {
      // Non-vacuity guard: the lock is meaningless over an empty/shrunk library.
      expect(TEMPLATES.length).toBeGreaterThanOrEqual(24);
      for (const t of TEMPLATES) {
        expect(
          detectDiagramType(t.content),
          `template "${t.id}" (${t.type}) content detects as ${detectDiagramType(t.content)} — content keyword and declared type have drifted`
        ).toBe(t.type);
      }
    });
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
