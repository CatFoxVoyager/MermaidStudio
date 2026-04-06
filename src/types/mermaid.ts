// src/types/mermaid.ts
// Mermaid-specific types extracted from types/index.ts

export type DiagramType =
  | 'flowchart' | 'sequence' | 'classDiagram' | 'stateDiagram'
  | 'erDiagram' | 'gantt' | 'pie' | 'mindmap' | 'gitGraph'
  | 'journey' | 'quadrantChart' | 'requirementDiagram' | 'timeline'
  | 'sankey' | 'xyChart' | 'packetDiagram' | 'kanban'
  | 'architectureDiagram' | 'zenuml' | 'blockDiagram' | 'c4' | 'unknown';

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
export type DiagramDirection = 'TD' | 'TB' | 'BT' | 'LR' | 'RL';

// Base style options that apply to all diagram types
export interface BaseStyleOptions {
  fontFamily: string;
  fontSize: number;
}

// Flowchart-specific options
export interface FlowchartStyleOptions {
  direction: DiagramDirection;
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
  // Theme variables (apply to all diagram types)
  primaryColor?: string;

  // Global Edge options
  edgeStrokeWidth?: number;
  edgeStrokeColor?: string;
  edgeOpacity?: number;
  edgeFontSize?: number;
  edgeDasharray?: string;
  edgeLabelBackgroundColor?: string;
  edgeLabelOpacity?: number;
  edgeLabelColor?: string;

  // Flowchart options (apply to flowcharts, journey, c4, block, architecture)
  direction?: DiagramDirection;
  nodePadding?: number;
  nodeSpacing?: number;
  rankSpacing?: number;
  curveStyle?: 'basis' | 'linear' | 'stepBefore' | 'stepAfter' | 'cardinal' | 'catmullRom' | 'natural';
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
  messageAlign?: 'left' | 'center' | 'right';
  rightAngles?: boolean;
  showSequenceNumbers?: boolean;
  wrap?: boolean;

  // Gantt chart options
  titleTopMargin?: number;
  barHeight?: number;
  barGap?: number;
  topPadding?: number;
  leftPadding?: number;
  axisFormat?: string;
  sectionMargin?: number;

  // Mindmap options
  maxNodeWidth?: number;
  maxNodeHeight?: number;
  maxTextWidth?: number;
  padding?: number;
  useMaxWidth?: boolean;

  // State diagram options
  padding?: number;
  useMaxWidth?: boolean;

  // Class diagram options
  padding?: number;
  useMaxWidth?: boolean;

  // ER diagram options
  padding?: number;
  useMaxWidth?: boolean;
  minEntityWidth?: number;
  minEntityHeight?: number;

  // Journey options (uses flowchart config)
  padding?: number;
  useMaxWidth?: boolean;

  // Timeline options
  disableMulticolor?: boolean;
  htmlLabels?: boolean;

  // Block diagram options
  padding?: number;
  useMaxWidth?: boolean;

  // C4 context options
  padding?: number;
  useMaxWidth?: boolean;

  // Architecture diagram options
  padding?: number;
  useMaxWidth?: boolean;

  // Quadrant chart options (uses pie config)
  chartWidth?: number;
  chartHeight?: number;

  // XY chart options
  showDataLabel?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
}

export const DEFAULT_STYLE_OPTIONS: DiagramStyleOptions = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 18,
  nodePadding: 15,
  nodeSpacing: 50,
  rankSpacing: 50,
  curveStyle: 'basis',
  borderRadius: 5,
  borderWidth: 2,
  useMaxWidth: true,
  layoutEngine: 'dagre',
  edgeStrokeWidth: 2,
  edgeStrokeColor: '#333333',
  edgeOpacity: 1,
  edgeFontSize: 14,
  edgeLabelColor: '#374151',
  edgeLabelBackgroundColor: '#ffffff',
  edgeLabelOpacity: 1,
};

// Styling capabilities per diagram type
export interface StylingCapabilities {
  supportsClassDef: boolean;  // Can use classDef/class for reusable styles (flowcharts only)
  supportsStyleKeyword: boolean;  // Can use style keyword for individual elements (state, class diagrams)
  supportsRectBlocks: boolean;  // Can use rect blocks for background highlighting (sequence diagrams)
  supportsFlowchartConfig: boolean;  // Can use flowchart config (curve, spacing, etc.)
  supportsSequenceConfig: boolean;  // Can use sequence config
  supportsGanttConfig: boolean;  // Can use gantt config
  supportsC4Style: boolean;  // Can use UpdateElementStyle/UpdateRelStyle (C4 diagrams)
  supportsThemeVariablesOnly: boolean;  // Only theme variables, no per-element styling
  availableConfigOptions: string[];  // List of available config option names
}

export function getStylingCapabilities(diagramType: DiagramType): StylingCapabilities {
  switch (diagramType) {
    case 'flowchart':
      return {
        supportsClassDef: true,  // classDef/class only for flowcharts
        supportsStyleKeyword: true,  // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth', 'htmlLabels', 'layoutEngine'],
      };

    case 'journey':
      return {
        supportsClassDef: true,  // classDef/class supported
        supportsStyleKeyword: true,  // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true,  // Uses flowchart config
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth', 'htmlLabels', 'layoutEngine', 'taskMargin'],
      };

    case 'blockDiagram':
      return {
        supportsClassDef: true,  // classDef/class supported
        supportsStyleKeyword: true,  // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true,  // Uses flowchart config
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth', 'htmlLabels', 'layoutEngine'],
      };

    case 'architectureDiagram':
      return {
        supportsClassDef: true,  // classDef/class supported
        supportsStyleKeyword: true,  // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true,  // Uses flowchart config
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth', 'htmlLabels', 'layoutEngine', 'randomize'],
      };

    case 'c4':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: true,
        supportsThemeVariablesOnly: true,  // C4 uses built-in styling + theme vars
        availableConfigOptions: ['personBgColor', 'personFontColor', 'systemBgColor', 'systemFontColor', 'containerBgColor', 'containerFontColor'],
      };

    case 'stateDiagram':
      return {
        supportsClassDef: false,  // NO classDef support
        supportsStyleKeyword: true,  // Uses style keyword for individual states
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,  // Does NOT support flowchart config options
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,  // Supports themeVariables for global styling
        availableConfigOptions: ['useMaxWidth'],  // Very limited config support
      };

    case 'classDiagram':
      return {
        supportsClassDef: false,  // NO classDef support
        supportsStyleKeyword: true,  // Uses style keyword for individual classes
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,  // Does NOT support flowchart config options
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,  // Supports themeVariables for global styling
        availableConfigOptions: ['useMaxWidth'],  // Very limited config support
      };

    case 'sequence':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: true,  // Uses rect for section highlighting
        supportsFlowchartConfig: false,
        supportsSequenceConfig: true,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['diagramMarginX', 'diagramMarginY', 'actorMargin', 'width', 'height', 'boxMargin', 'mirrorActors', 'useMaxWidth', 'messageAlign', 'rightAngles', 'showSequenceNumbers', 'wrap'],
      };

    case 'gantt':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: true,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['titleTopMargin', 'barHeight', 'barGap', 'topPadding', 'leftPadding', 'rightPadding', 'axisFormat', 'tickInterval', 'topAxis', 'displayMode', 'weekday', 'fontSize', 'sectionFontSize', 'numberSectionStyles', 'gridLineStartPadding', 'useMaxWidth'],
      };

    case 'erDiagram':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: true,  // Some flowchart config applies
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // ER diagrams only support theme variables
        availableConfigOptions: ['curve', 'padding', 'nodeSpacing', 'rankSpacing', 'useMaxWidth', 'minEntityWidth', 'minEntityHeight', 'layoutEngine'],
      };

    case 'mindmap':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['maxNodeWidth', 'maxNodeHeight', 'maxTextWidth', 'padding', 'useMaxWidth', 'layoutEngine'],
      };

    case 'pie':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['textPosition', 'useMaxWidth'],
      };

    case 'timeline':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['disableMulticolor', 'htmlLabels', 'useMaxWidth'],
      };

    case 'quadrantChart':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['chartWidth', 'chartHeight', 'quadrantPadding', 'useMaxWidth'],
      };

    case 'xyChart':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['width', 'height', 'showDataLabel', 'xAxisTitle', 'yAxisTitle', 'useMaxWidth'],
      };

    case 'requirementDiagram':
      return {
        supportsClassDef: true,  // Requirement diagrams DO support classDef
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [],
      };

    case 'gitGraph':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: [],
      };

    case 'sankey':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['width', 'height', 'linkColor', 'nodeAlignment', 'showValues', 'prefix', 'suffix', 'useMaxWidth'],
      };

    case 'packetDiagram':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['showBits'],
      };

    case 'kanban':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: ['ticketBaseUrl'],
      };

    case 'zenuml':
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Theme variables only
        availableConfigOptions: [],
      };

    case 'unknown':
    default:
      return {
        supportsClassDef: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,  // Default to theme variables
        availableConfigOptions: [],
      };
  }
}
