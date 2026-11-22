// src/constants/diagramLabels.ts
// Core-free exhaustive map of human-readable diagram type labels (DIAG-02, PERF-01).
// Zero runtime imports by design so StatusBar and PreviewPanel stay decoupled
// and never leave any DiagramType falling back to 'Diagram'.
import type { DiagramType } from '@/types';

export const DIAGRAM_LABELS: Record<DiagramType, string> = {
  flowchart: 'Flowchart',
  sequence: 'Sequence',
  classDiagram: 'Class',
  stateDiagram: 'State',
  erDiagram: 'ER',
  gantt: 'Gantt',
  pie: 'Pie',
  mindmap: 'Mindmap',
  gitGraph: 'Git Graph',
  journey: 'Journey',
  quadrantChart: 'Quadrant',
  requirementDiagram: 'Requirement',
  timeline: 'Timeline',
  sankey: 'Sankey',
  xyChart: 'XY Chart',
  packetDiagram: 'Packet',
  kanban: 'Kanban',
  architectureDiagram: 'Architecture',
  usecaseDiagram: 'Use Case',
  zenuml: 'ZenUML',
  blockDiagram: 'Block',
  c4: 'C4',
  ishikawa: 'Ishikawa',
  radar: 'Radar',
  treemap: 'Treemap',
  eventmodeling: 'Event Modeling',
  venn: 'Venn',
  treeView: 'TreeView',
  wardley: 'Wardley Map',
  cynefin: 'Cynefin',
  railroad: 'Railroad',
  swimlane: 'Swimlane',
  agentflow: 'Agentflow',
  unknown: 'Diagram',
};
