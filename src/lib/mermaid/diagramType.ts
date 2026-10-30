// src/lib/mermaid/diagramType.ts
// Core-free home of detectDiagramType (29-02, PERF-01): a regex-only pure
// parser that must stay synchronously callable WITHOUT the mermaid runtime.
// Zero runtime imports by design — boot-path consumers (themeDerivation,
// StatusBar, Sidebar, SaveTemplateModal, AdvancedStylePanel) import from
// here, never from './core', so the boot chain stays lazy. Guarded by the
// PERF-01 parser purity gate in src/__tests__/bundlePerf.test.ts.
import type { DiagramType } from '@/types';

export function detectDiagramType(content: string): DiagramType {
  // Remove YAML frontmatter if present
  let body = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  body = body.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();
  // Skip Mermaid comment lines (e.g. %% @theme corporate_blue)
  body = body.replace(/^(%%[^\n]*\n?)+/i, '').trim();

  const first = body.split('\n')[0]?.toLowerCase().trim();
  if (!first) return 'unknown';

  // Flowchart and variants
  if (first.startsWith('flowchart') || first.startsWith('graph')) {
    return 'flowchart';
  }

  // Sequence diagram
  if (first.startsWith('sequencediagram')) {
    return 'sequence';
  }

  // Class diagram
  if (first.startsWith('classdiagram')) {
    return 'classDiagram';
  }

  // State diagram
  if (first.startsWith('statediagram')) {
    return 'stateDiagram';
  }

  // ER diagram
  if (first.startsWith('erdiagram')) {
    return 'erDiagram';
  }

  // Gantt chart
  if (first.startsWith('gantt')) {
    return 'gantt';
  }

  // Pie chart
  if (first.startsWith('pie')) {
    return 'pie';
  }

  // Mindmap
  if (first.startsWith('mindmap')) {
    return 'mindmap';
  }

  // Git graph
  if (first.startsWith('gitgraph')) {
    return 'gitGraph';
  }

  // Journey map
  if (first.startsWith('journey')) {
    return 'journey';
  }

  // Timeline
  if (first.startsWith('timeline')) {
    return 'timeline';
  }

  // Quadrant chart
  if (first.startsWith('quadrantchart')) {
    return 'quadrantChart';
  }

  // Requirement diagram
  if (first.startsWith('requirementdiagram')) {
    return 'requirementDiagram';
  }

  // Sankey diagram
  if (first.startsWith('sankey-beta') || first.startsWith('sankey')) {
    return 'sankey';
  }

  // XY Chart
  if (first.startsWith('xychart-beta')) {
    return 'xyChart';
  }

  // Block diagram
  if (first.startsWith('blockbeta') || first.startsWith('block')) {
    return 'blockDiagram';
  }

  // C4 diagram
  if (first.startsWith('c4')) {
    return 'c4';
  }

  // Architecture diagram
  if (first.startsWith('architecture')) {
    return 'architectureDiagram';
  }

  // ZenUML
  if (first.startsWith('zenuml')) {
    return 'zenuml';
  }

  // Packet diagram
  if (first.startsWith('packet')) {
    return 'packetDiagram';
  }

  // Kanban
  if (first.startsWith('kanban')) {
    return 'kanban';
  }

  // Use case diagram (mermaid 12) — the v12 content trigger keyword is
  // `usecase-beta` (mermaid's detector is /^\s*usecase-beta(?:\s|$)/, verified
  // mermaid.core.mjs:591-599); the 'usecaseDiagram' union label is
  // app-internal only and never appears as content. The (?:\s|$) boundary
  // mirrors the renderer's detector exactly: a longer word like
  // `usecase-betamax` falls through to 'unknown' here instead of mislabeling
  // input the renderer will reject (IN-03).
  if (/^usecase-beta(?:\s|$)/.test(first)) {
    return 'usecaseDiagram';
  }

  return 'unknown';
}
