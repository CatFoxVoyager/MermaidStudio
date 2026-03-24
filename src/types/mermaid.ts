// src/types/mermaid.ts
// Mermaid-specific types extracted from types/index.ts

export type DiagramType =
  | 'flowchart' | 'sequence' | 'classDiagram' | 'stateDiagram'
  | 'erDiagram' | 'gantt' | 'pie' | 'mindmap' | 'gitGraph'
  | 'journey' | 'quadrantChart' | 'requirementDiagram' | 'timeline'
  | 'sankey' | 'xyChart' | 'packetDiagram' | 'kanban'
  | 'architectureDiagram' | 'zenuml' | 'blockDiagram' | 'unknown';

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    neutral_light: string;
    neutral_dark: string;
  };
}

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: 'simple' | 'moderate' | 'advanced';
  content: string;
  type: DiagramType;
}

export type LayoutEngine = 'dagre' | 'elk' | 'elk.stress';

export interface DiagramStyleOptions {
  fontFamily: string;
  fontSize: number;
  nodePadding: number;
  nodeSpacing: number;
  rankSpacing: number;
  curveStyle: 'basis' | 'linear' | 'stepBefore' | 'stepAfter' | 'cardinal' | 'catmullRom';
  borderRadius: number;
  borderWidth: number;
  useMaxWidth: boolean;
  layoutEngine: LayoutEngine;
}

export const DEFAULT_STYLE_OPTIONS: DiagramStyleOptions = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  nodePadding: 15,
  nodeSpacing: 50,
  rankSpacing: 50,
  curveStyle: 'basis',
  borderRadius: 5,
  borderWidth: 2,
  useMaxWidth: true,
  layoutEngine: 'dagre',
};
