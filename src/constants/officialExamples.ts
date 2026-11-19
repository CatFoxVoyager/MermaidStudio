// Official Mermaid examples (`@mermaid-js/examples`, the package the Mermaid
// Live Editor uses to list every diagram type) exposed as read-only templates.
//
// LAZY by design: the package (~50 kB, every diagram type's sample code) is
// only reached through the dynamic import below, called when the Template
// Library opens — never from the boot path. vite.config.ts gives it its own
// `mermaid-examples` chunk group so the eager `vendor` catch-all cannot
// swallow it.
//
// Keep the package pinned in lockstep with `mermaid`: its examples target the
// syntax of the matching mermaid release (examples 2.1.0 ↔ mermaid 12.3.0).
import type { Template } from '@/types';
import { detectDiagramType } from '@/lib/mermaid/diagramType';

type ExamplesModule = typeof import('@mermaid-js/examples');
export type OfficialDiagramMetadata = ExamplesModule['diagramData'][number];

export const OFFICIAL_EXAMPLE_ID_PREFIX = 'official-';

/**
 * Map the package's per-diagram metadata to the app's Template shape.
 * Ids are positional per diagram (`official-<diagramId>-<index>`): stable for
 * a pinned package version, and never persisted — selecting a template copies
 * its title/content into a new diagram.
 */
export function toOfficialTemplates(data: readonly OfficialDiagramMetadata[]): Template[] {
  return data.flatMap(diagram =>
    diagram.examples.map((example, index) => ({
      id: `${OFFICIAL_EXAMPLE_ID_PREFIX}${diagram.id}-${index}`,
      title: example.title,
      description: diagram.description,
      category: diagram.name,
      complexity: example.isDefault ? 'simple' : 'moderate',
      type: detectDiagramType(example.code),
      content: example.code,
    }))
  );
}

let pending: Promise<Template[]> | null = null;

/** Load (once) and map the official examples. A failed load is retried on the next call. */
export function loadOfficialExamples(): Promise<Template[]> {
  pending ??= import('@mermaid-js/examples')
    .then(m => toOfficialTemplates(m.diagramData))
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}
