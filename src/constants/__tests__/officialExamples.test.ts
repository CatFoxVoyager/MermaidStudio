// Official Mermaid examples (`@mermaid-js/examples`) locks.
//
// Lock 1 — mapping: every package example becomes exactly one Template with a
// unique, prefixed id, non-empty content, and a type that agrees with the
// app's own detector (never a hand-copied label that can drift).
//
// Lock 2 — render: every example goes through the app's single mermaid
// entrypoint (renderDiagram, never mermaid.render directly) and the app's
// content validation without error. A package bump that ships syntax the
// pinned mermaid cannot render — or that the app's validator rejects — fails
// here instead of as a broken card in the Template Library.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { DiagramType } from '@/types';
import { diagramData } from '@mermaid-js/examples';
import {
  loadOfficialExamples,
  localizeOfficialExamples,
  toOfficialTemplates,
  OFFICIAL_EXAMPLE_ID_PREFIX,
} from '../officialExamples';
import {
  OFFICIAL_DIAGRAM_FR_DESCRIPTIONS,
  OFFICIAL_EXAMPLE_FR_TITLES,
} from '../officialExamples.fr';
import { TEMPLATES } from '../templates';
import { renderDiagram, initMermaid } from '@/lib/mermaid/core';
import { validateDiagramContent } from '@/utils/validation';

// jsdom implements no SVG text measurement: diagrams that size labels with
// getBBox (as in templates.test / theme-matrix, IN-05) or getComputedTextLength
// (c4, architecture, timeline, treemap, venn, wardley) abort mid-layout there.
// Narrowed to exactly those two missing APIs — any other error still fails.
const JSDOM_TEXT_MEASUREMENT_LIMITATION =
  /\b(getBBox|getComputedTextLength)\b[^\n]*\bnot a function\b/;

describe('official examples', () => {
  const templates = toOfficialTemplates(diagramData);
  const exampleCount = diagramData.reduce((n, d) => n + d.examples.length, 0);

  it('maps every package example to one template', () => {
    // Non-vacuity guard: examples 2.1.0 ships 33 diagram types / 81 examples.
    expect(diagramData.length).toBeGreaterThanOrEqual(33);
    expect(templates.length).toBe(exampleCount);
    expect(templates.length).toBeGreaterThanOrEqual(70);
  });

  it('gives every template a unique prefixed id that cannot collide with built-in templates', () => {
    const ids = templates.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const builtIn = new Set(TEMPLATES.map(t => t.id));
    for (const id of ids) {
      expect(id.startsWith(OFFICIAL_EXAMPLE_ID_PREFIX)).toBe(true);
      expect(builtIn.has(id)).toBe(false);
    }
  });

  it('derives type from the content and keeps title/description/category from the package', () => {
    for (const t of templates) {
      expect(t.content.trim()).not.toBe('');
      expect(t.title).not.toBe('');
      expect(t.description).not.toBe('');
      expect(t.category).not.toBe('');
    }
    // Each diagram's default example is flagged simple, the others moderate.
    const flowchart = templates.filter(t =>
      t.id.startsWith(`${OFFICIAL_EXAMPLE_ID_PREFIX}flowchart-v2-`)
    );
    expect(flowchart[0].complexity).toBe('simple');
    expect(flowchart.slice(1).every(t => t.complexity === 'moderate')).toBe(true);
  });

  // Pinned app-side type per official diagram id. 'unknown' marks diagram
  // types the app's DiagramType union does not model yet (they still render:
  // mermaid detects them itself) — adding one to the union flips its row
  // here, and a renamed content keyword or a detector regression fails here.
  const EXPECTED_TYPES: Record<string, DiagramType> = {
    'flowchart-v2': 'flowchart',
    c4: 'c4',
    kanban: 'kanban',
    classDiagram: 'classDiagram',
    sequence: 'sequence',
    pie: 'pie',
    journey: 'journey',
    mindmap: 'mindmap',
    requirement: 'requirementDiagram',
    stateDiagram: 'stateDiagram',
    er: 'erDiagram',
    gitGraph: 'gitGraph',
    architecture: 'architectureDiagram',
    xychart: 'xyChart',
    sankey: 'sankey',
    gantt: 'gantt',
    timeline: 'timeline',
    quadrantChart: 'quadrantChart',
    packet: 'packetDiagram',
    block: 'blockDiagram',
    usecase: 'usecaseDiagram',
    ishikawa: 'unknown',
    radar: 'unknown',
    treemap: 'unknown',
    eventmodeling: 'unknown',
    venn: 'unknown',
    treeView: 'unknown',
    wardley: 'unknown',
    cynefin: 'unknown',
    railroad: 'unknown',
    railroadEbnf: 'unknown',
    railroadAbnf: 'unknown',
    railroadPeg: 'unknown',
    swimlane: 'unknown',
  };

  it('maps every official diagram to its pinned app-side type', () => {
    expect(Object.keys(EXPECTED_TYPES).sort()).toEqual(diagramData.map(d => d.id).sort());
    for (const diagram of diagramData) {
      diagram.examples.forEach((_example, index) => {
        const template = templates.find(
          t => t.id === `${OFFICIAL_EXAMPLE_ID_PREFIX}${diagram.id}-${index}`
        );
        expect(template?.type, `${diagram.id}[${index}]`).toBe(EXPECTED_TYPES[diagram.id]);
      });
    }
  });

  it('is pinned in lockstep with the installed mermaid version', () => {
    // The package's exports map blocks importing its package.json; read it from disk.
    const root = resolve(__dirname, '../../..'); // src/constants/__tests__ -> repo root
    const examplesPkg = JSON.parse(
      readFileSync(resolve(root, 'node_modules/@mermaid-js/examples/package.json'), 'utf8')
    );
    const mermaidPkg = JSON.parse(
      readFileSync(resolve(root, 'node_modules/mermaid/package.json'), 'utf8')
    );
    expect(examplesPkg.devDependencies?.mermaid).toBe(mermaidPkg.version);
  });

  // ===== French localization =====
  // The FR dictionary (officialExamples.fr.ts) must cover every package id:
  // a bump adding examples fails here until the translations are completed.
  // Unknown ids fall back to the English strings at runtime.
  it('has a French entry for every package example id and diagram description', () => {
    const missingTitles = templates
      .filter(t => !(t.id in OFFICIAL_EXAMPLE_FR_TITLES))
      .map(t => t.id);
    const missingDescriptions = diagramData
      .map(d => d.id)
      .filter(id => !(id in OFFICIAL_DIAGRAM_FR_DESCRIPTIONS));
    expect(missingTitles, `untranslated titles: ${missingTitles.join(', ')}`).toEqual([]);
    expect(
      missingDescriptions,
      `untranslated descriptions: ${missingDescriptions.join(', ')}`
    ).toEqual([]);
    // No dead keys: every dictionary key must resolve to a real id/diagram.
    const templateIds = new Set(templates.map(t => t.id));
    const deadTitleKeys = Object.keys(OFFICIAL_EXAMPLE_FR_TITLES).filter(
      id => !templateIds.has(id)
    );
    expect(deadTitleKeys, `dead FR title keys: ${deadTitleKeys.join(', ')}`).toEqual([]);
  });

  it('localizes titles and descriptions for French, falls back to English otherwise', () => {
    const fr = localizeOfficialExamples(templates, 'fr');
    const base = templates.find(t => t.id === 'official-flowchart-v2-0')!;
    const localized = fr.find(t => t.id === 'official-flowchart-v2-0')!;
    expect(localized.title).not.toBe(base.title);
    expect(localized.title.length).toBeGreaterThan(2);
    expect(localized.description).not.toBe(base.description);
    // Other fields pass through untouched (content, type, category…).
    expect(localized.content).toBe(base.content);
    expect(localized.type).toBe(base.type);
    expect(localized.category).toBe(base.category);
    // Non-French languages return the input array untouched.
    expect(localizeOfficialExamples(templates, 'en')).toBe(templates);
    expect(localizeOfficialExamples(templates, 'de')).toBe(templates);
  });

  it('loads lazily through loadOfficialExamples and memoizes the result', async () => {
    const first = await loadOfficialExamples();
    expect(first).toEqual(templates);
    expect(await loadOfficialExamples()).toBe(first);
  });

  it('passes the app content validation for every example', () => {
    for (const t of templates) {
      const result = validateDiagramContent(t.content);
      expect(result.valid, `${t.id}: ${result.error}`).toBe(true);
    }
  });

  describe('render', () => {
    // Today 11 examples hit the jsdom text-measurement limitation (c4 ×2,
    // architecture ×3, timeline ×2, treemap ×2, venn, wardley) — verified to
    // render error-free in real Chromium. The bound keeps the tolerance from
    // silently absorbing more examples (e.g. a jsdom wording change making
    // every render take the tolerated branch).
    const MAX_TOLERATED = 11;
    const tolerated: string[] = [];

    beforeAll(() => {
      initMermaid('light');
    });

    afterAll(() => {
      expect(tolerated.length, `tolerated: ${tolerated.join(', ')}`).toBeLessThanOrEqual(
        MAX_TOLERATED
      );
    });

    it.each(templates.map(t => [t.id, t] as const))(
      'renders %s through renderDiagram',
      { timeout: 30000 },
      async (_id, template) => {
        const id = `official_render_${template.id}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const { svg, error } = await renderDiagram(template.content, id);
        try {
          if (error && !JSDOM_TEXT_MEASUREMENT_LIMITATION.test(error)) {
            throw new Error(`Unexpected render error for ${template.id}: ${error}`);
          }
          if (error) {
            tolerated.push(template.id);
          }
          if (!error) {
            expect(svg).toMatch(/<svg[\s>]/);
          }
        } finally {
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
        }
      }
    );
  });
});
