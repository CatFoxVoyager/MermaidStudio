// src/types/mermaid.ts
// Mermaid-specific types extracted from types/index.ts

export type DiagramType =
  | 'flowchart' | 'sequence' | 'classDiagram' | 'stateDiagram'
  | 'erDiagram' | 'gantt' | 'pie' | 'mindmap' | 'gitGraph'
  | 'journey' | 'quadrantChart' | 'requirementDiagram' | 'timeline'
  | 'sankey' | 'xyChart' | 'packetDiagram' | 'kanban'
  | 'architectureDiagram' | 'zenuml' | 'blockDiagram' | 'c4' | 'unknown';

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

// Base style options that apply to all diagram types
export interface BaseStyleOptions {
  fontFamily: string;
  fontSize: number;
}

// Flowchart-specific options
export interface FlowchartStyleOptions {
  nodePadding: number;
  nodeSpacing: number;
  rankSpacing: number;
  curveStyle: 'basis' | 'linear' | 'stepBefore' | 'stepAfter' | 'cardinal' | 'catmullRom';
  borderRadius: number;
  useMaxWidth: boolean;
  layoutEngine: LayoutEngine;
}

// Sequence diagram-specific options
export interface SequenceStyleOptions {
  diagramMarginX: number;
  diagramMarginY: number;
  actorMargin: number;
  width: number;
  height: number;
  boxMargin: number;
  mirrorActors: boolean;
}

// Gantt chart-specific options
export interface GanttStyleOptions {
  titleTopMargin: number;
  barHeight: number;
  barGap: number;
  topPadding: number;
  leftPadding: number;
  axisFormat: string;
  sectionMargin: number;
}

// Combined style options for all types
export interface DiagramStyleOptions extends BaseStyleOptions {
  // Flowchart options (only apply to flowcharts)
  nodePadding?: number;
  nodeSpacing?: number;
  rankSpacing?: number;
  curveStyle?: 'basis' | 'linear' | 'stepBefore' | 'stepAfter' | 'cardinal' | 'catmullRom';
  borderRadius?: number;
  borderWidth?: number;
  useMaxWidth?: boolean;
  layoutEngine?: LayoutEngine;

  // Sequence diagram options
  diagramMarginX?: number;
  diagramMarginY?: number;
  actorMargin?: number;
  actorWidth?: number;
  actorHeight?: number;
  boxMargin?: number;
  mirrorActors?: boolean;

  // Gantt chart options
  titleTopMargin?: number;
  barHeight?: number;
  barGap?: number;
  topPadding?: number;
  leftPadding?: number;
  axisFormat?: string;
  sectionMargin?: number;
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

// Styling capabilities per diagram type
export interface StylingCapabilities {
  supportsClassDef: boolean;  // Can use classDef/class for individual node colors
  supportsFlowchartConfig: boolean;  // Can use flowchart config (curve, spacing, etc.)
  supportsSequenceConfig: boolean;  // Can use sequence config
  supportsGanttConfig: boolean;  // Can use gantt config
  availableConfigOptions: string[];  // List of available config option names
}

export function getStylingCapabilities(diagramType: DiagramType): StylingCapabilities {
  switch (diagramType) {
    case 'flowchart':
    case 'journey':
    case 'c4':
    case 'blockDiagram':
    case 'architectureDiagram':
      return {
        supportsClassDef: true,
        supportsFlowchartConfig: true,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth', 'htmlLabels'],
      };

    case 'stateDiagram':
      return {
        supportsClassDef: true,
        supportsFlowchartConfig: true,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth'],
      };

    case 'classDiagram':
      return {
        supportsClassDef: true,
        supportsFlowchartConfig: true,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth'],
      };

    case 'sequence':
      return {
        supportsClassDef: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: true,
        supportsGanttConfig: false,
        availableConfigOptions: ['diagramMarginX', 'diagramMarginY', 'actorMargin', 'width', 'height', 'boxMargin', 'mirrorActors', 'useMaxWidth'],
      };

    case 'gantt':
      return {
        supportsClassDef: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: true,
        availableConfigOptions: ['titleTopMargin', 'barHeight', 'barGap', 'topPadding', 'leftPadding', 'axisFormat', 'sectionMargin'],
      };

    case 'erDiagram':
      return {
        supportsClassDef: false,
        supportsFlowchartConfig: true,  // Uses flowchart for layout
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth'],
      };

    case 'mindmap':
    case 'gitGraph':
    case 'pie':
    case 'timeline':
    case 'quadrantChart':
    case 'requirementDiagram':
    case 'sankey':
    case 'xyChart':
    case 'packetDiagram':
    case 'kanban':
    case 'zenuml':
    case 'unknown':
    default:
      return {
        supportsClassDef: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        availableConfigOptions: [],
      };
  }
}
