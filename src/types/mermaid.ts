// src/types/mermaid.ts
// Mermaid-specific types extracted from types/index.ts

export type DiagramType =
  | 'flowchart'
  | 'sequence'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'gitGraph'
  | 'journey'
  | 'quadrantChart'
  | 'requirementDiagram'
  | 'timeline'
  | 'sankey'
  | 'xyChart'
  | 'packetDiagram'
  | 'kanban'
  | 'architectureDiagram'
  | 'usecaseDiagram'
  | 'zenuml'
  | 'blockDiagram'
  | 'c4'
  | 'ishikawa'
  | 'radar'
  | 'treemap'
  | 'eventmodeling'
  | 'venn'
  | 'treeView'
  | 'wardley'
  | 'cynefin'
  | 'railroad'
  | 'swimlane'
  | 'agentflow'
  | 'unknown';

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: 'simple' | 'moderate' | 'advanced';
  content: string;
  type: DiagramType;
}

export type ElkLayoutAlgorithm =
  | 'elk'
  | 'elk.stress'
  | 'elk.force'
  | 'elk.mrtree'
  | 'elk.sporeOverlap'
  | 'elk.box'
  | 'elk.rectpacking';

export const ELK_LAYOUT_ALGORITHMS: readonly ElkLayoutAlgorithm[] = [
  'elk',
  'elk.stress',
  'elk.force',
  'elk.mrtree',
  'elk.sporeOverlap',
  'elk.box',
  'elk.rectpacking',
] as const;

export type LayoutEngine = 'dagre' | ElkLayoutAlgorithm | 'tidy-tree' | 'cose-bilkent';
export type ElkNodePlacementStrategy = 'SIMPLE' | 'NETWORK_SIMPLEX' | 'LINEAR_SEGMENTS' | 'BRANDES_KOEPF';
export type ElkNodePlacementAlignment = 'NONE' | 'LEFTUP' | 'LEFTDOWN' | 'RIGHTUP' | 'RIGHTDOWN' | 'BALANCED';
export type ElkPreset = 'default' | 'legacy' | 'modelOrder' | 'depthFirst';
export type DiagramDirection = 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
export type DiagramLook = 'neo' | 'classic' | 'handDrawn';

export const ELK_CAPABLE_DIAGRAM_TYPES: ReadonlySet<DiagramType> = new Set<DiagramType>([
  'flowchart',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'requirementDiagram',
  'usecaseDiagram',
  'agentflow',
  'journey',
  'blockDiagram',
  'architectureDiagram',
]);

export function isElkLayoutEngine(layout?: string): boolean {
  return layout === 'elk' || (typeof layout === 'string' && layout.startsWith('elk.'));
}

export function supportsElkLayout(diagramType: DiagramType): boolean {
  return diagramType !== 'swimlane' && ELK_CAPABLE_DIAGRAM_TYPES.has(diagramType);
}

export function supportsTidyTreeLayout(diagramType: DiagramType): boolean {
  return diagramType === 'mindmap';
}

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
  // The 13-value mermaid config union (config.type.d.ts:415, declared order).
  curveStyle:
    | 'basis'
    | 'bumpX'
    | 'bumpY'
    | 'cardinal'
    | 'catmullRom'
    | 'linear'
    | 'monotoneX'
    | 'monotoneY'
    | 'natural'
    | 'step'
    | 'stepAfter'
    | 'stepBefore'
    | 'rounded';
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
  // Theme variables & global Mermaid look/CSS options (apply to all diagram types)
  theme?: import('./theme').MermaidBuiltinTheme;
  primaryColor?: string;
  look?: DiagramLook;
  handDrawnSeed?: number;
  useGradient?: boolean;
  themeCSS?: string;

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
  curveStyle?:
    | 'basis'
    | 'bumpX'
    | 'bumpY'
    | 'cardinal'
    | 'catmullRom'
    | 'linear'
    | 'monotoneX'
    | 'monotoneY'
    | 'natural'
    | 'step'
    | 'stepAfter'
    | 'stepBefore'
    | 'rounded';
  stepDuration?: number;
  stepNumbers?: boolean;
  markdownAutoWrap?: boolean;
  borderRadius?: number;
  borderWidth?: number;
  useMaxWidth?: boolean;
  layoutEngine?: LayoutEngine;

  // ELK layout sub-options (LAY-02: config.elk.*)
  elkMergeEdges?: boolean;
  elkNodePlacementStrategy?: ElkNodePlacementStrategy;
  elkNodePlacementAlignment?: ElkNodePlacementAlignment;
  elkPreset?: ElkPreset;

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
  displayMode?: 'compact';

  // Mindmap options (CFG-01: config.mindmap.*)
  maxNodeWidth?: number;
  maxNodeHeight?: number;
  maxTextWidth?: number;
  colorBy?: 'branch' | 'depth';

  // Pie options (CFG-01: config.pie.*)
  donutHole?: number;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightSlice?: string;
  textPosition?: number;

  // Sankey options (CFG-01: config.sankey.*)
  labelStyle?: 'legacy' | 'outlined';
  sankeyNodeWidth?: number;
  sankeyNodePadding?: number;
  nodeColors?: Record<string, string>;
  linkColor?: string;
  nodeAlignment?: 'left' | 'right' | 'center' | 'justify';
  showValues?: boolean;

  // Class diagram options (CFG-02: config.class.*)
  hierarchicalNamespaces?: boolean;
  hideEmptyMembersBox?: boolean;

  // Packet diagram options (CFG-02: config.packet.*)
  bitOrder?: 'ascending' | 'descending';
  bitsPerRow?: number;
  showBits?: boolean;

  // Architecture diagram options (CFG-02: config.architecture.*)
  randomize?: boolean;
  seed?: number;
  nodeSeparation?: number;
  idealEdgeLengthMultiplier?: number;
  edgeElasticity?: number;
  numIter?: number;

  // TreeView options (CFG-02: config.treeView.*)
  showIcons?: boolean;
  defaultIconPack?: string;

  // GitGraph options (CFG-02: config.gitGraph.*)
  showBranches?: boolean;
  showCommitLabel?: boolean;
  rotateCommitLabel?: boolean;
  parallelCommits?: boolean;
  mainBranchName?: string;

  // Kanban options (CFG-02: config.kanban.*)
  ticketBaseUrl?: string;

  // Treemap options (CFG-02: config.treemap.*; shares showValues & diagramPadding)
  valueFormat?: string;

  // ER diagram options
  minEntityWidth?: number;
  minEntityHeight?: number;

  // Timeline options (CFG-02: config.timeline.*)
  disableMulticolor?: boolean;
  htmlLabels?: boolean;

  // Shared sizing keys: the state, class, ER, journey, block, C4 and
  // architecture sections each previously re-declared the identical optional
  // `padding` / `useMaxWidth` pair; duplicate property declarations are a
  // compile error surfaced by the repaired type-check gate (CR-01). The two
  // single declarations here (`padding`) and in the flowchart section above
  // (`useMaxWidth`) preserve the combined shape exactly.
  padding?: number;

  // Quadrant chart options (uses pie config)
  chartWidth?: number;
  chartHeight?: number;

  // XY chart options (CFG-01: config.xyChart.*)
  showDataLabel?: boolean;
  showDataLabelOutsideBar?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;

  // Swimlane options
  lineHops?: boolean | 'arc' | 'gap';
  automaticLaneOrdering?: boolean;

  // Agentflow options (AGF-01: config.agentflow.*)
  wrappingWidth?: number;
  minNodeWidth?: number;
  diagramPadding?: number;
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
  supportsClassDef: boolean; // Can use classDef/class for reusable styles
  supportsVisualEditing: boolean; // Interactive flowchart visual editing (ShapeToolbar, node/edge/subgraph tools)
  supportsStyleKeyword: boolean; // Can use style keyword for individual elements (state, class diagrams)
  supportsRectBlocks: boolean; // Can use rect blocks for background highlighting (sequence diagrams)
  supportsFlowchartConfig: boolean; // Can use flowchart config (curve, spacing, etc.)
  supportsSequenceConfig: boolean; // Can use sequence config
  supportsGanttConfig: boolean; // Can use gantt config
  supportsSwimlaneConfig: boolean; // Can use swimlane config (lineHops, automaticLaneOrdering)
  supportsAgentflowConfig?: boolean; // Can use agentflow config (nodeSpacing, rankSpacing, wrappingWidth, minNodeWidth, diagramPadding)
  supportsC4Style: boolean; // Can use UpdateElementStyle/UpdateRelStyle (C4 diagrams)
  supportsThemeVariablesOnly: boolean; // Only theme variables, no per-element styling
  availableConfigOptions: string[]; // List of available config option names
}

export function getStylingCapabilities(diagramType: DiagramType): StylingCapabilities {
  switch (diagramType) {
    case 'flowchart':
      return {
        supportsClassDef: true, // classDef/class only for flowcharts
        supportsVisualEditing: true,
        supportsStyleKeyword: true, // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'curve',
          'padding',
          'nodeSpacing',
          'rankSpacing',
          'useMaxWidth',
          'htmlLabels',
          'layoutEngine',
        ],
      };

    case 'journey':
      return {
        supportsClassDef: true, // classDef/class supported
        supportsVisualEditing: false,
        supportsStyleKeyword: true, // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true, // Uses flowchart config
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'curve',
          'padding',
          'nodeSpacing',
          'rankSpacing',
          'useMaxWidth',
          'htmlLabels',
          'layoutEngine',
          'taskMargin',
        ],
      };

    case 'blockDiagram':
      return {
        supportsClassDef: true, // classDef/class supported
        supportsVisualEditing: false,
        supportsStyleKeyword: true, // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true, // Uses flowchart config
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'curve',
          'padding',
          'nodeSpacing',
          'rankSpacing',
          'useMaxWidth',
          'htmlLabels',
          'layoutEngine',
        ],
      };

    case 'architectureDiagram':
      return {
        supportsClassDef: true, // classDef/class supported
        supportsVisualEditing: false,
        supportsStyleKeyword: true, // Also supports style keyword
        supportsRectBlocks: false,
        supportsFlowchartConfig: true, // Uses flowchart config
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'curve',
          'padding',
          'nodeSpacing',
          'rankSpacing',
          'useMaxWidth',
          'htmlLabels',
          'layoutEngine',
          'randomize',
        ],
      };

    case 'c4':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: true,
        supportsThemeVariablesOnly: true, // C4 uses built-in styling + theme vars
        availableConfigOptions: [
          'personBgColor',
          'personFontColor',
          'systemBgColor',
          'systemFontColor',
          'containerBgColor',
          'containerFontColor',
        ],
      };

    case 'stateDiagram':
      return {
        supportsClassDef: false, // NO classDef support
        supportsVisualEditing: false,
        supportsStyleKeyword: true, // Uses style keyword for individual states
        supportsRectBlocks: false,
        supportsFlowchartConfig: false, // Does NOT support flowchart config options
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false, // Supports themeVariables for global styling
        availableConfigOptions: ['useMaxWidth'], // Very limited config support
      };

    case 'classDiagram':
      return {
        supportsClassDef: false, // NO classDef support
        supportsVisualEditing: false,
        supportsStyleKeyword: true, // Uses style keyword for individual classes
        supportsRectBlocks: false,
        supportsFlowchartConfig: false, // Does NOT support flowchart config options
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false, // Supports themeVariables for global styling
        availableConfigOptions: ['useMaxWidth'], // Very limited config support
      };

    case 'sequence':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: true, // Uses rect for section highlighting
        supportsFlowchartConfig: false,
        supportsSequenceConfig: true,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'diagramMarginX',
          'diagramMarginY',
          'actorMargin',
          'width',
          'height',
          'boxMargin',
          'mirrorActors',
          'useMaxWidth',
          'messageAlign',
          'rightAngles',
          'showSequenceNumbers',
          'wrap',
        ],
      };

    case 'gantt':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: true,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'titleTopMargin',
          'barHeight',
          'barGap',
          'topPadding',
          'leftPadding',
          'rightPadding',
          'axisFormat',
          'tickInterval',
          'topAxis',
          'displayMode',
          'weekday',
          'fontSize',
          'sectionFontSize',
          'numberSectionStyles',
          'gridLineStartPadding',
          'useMaxWidth',
        ],
      };

    case 'erDiagram':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: true, // Some flowchart config applies
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // ER diagrams only support theme variables
        availableConfigOptions: [
          'curve',
          'padding',
          'nodeSpacing',
          'rankSpacing',
          'useMaxWidth',
          'minEntityWidth',
          'minEntityHeight',
          'layoutEngine',
        ],
      };

    case 'mindmap':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: [
          'maxNodeWidth',
          'maxNodeHeight',
          'maxTextWidth',
          'padding',
          'useMaxWidth',
          'layoutEngine',
        ],
      };

    case 'pie':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: ['textPosition', 'useMaxWidth'],
      };

    case 'timeline':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: ['disableMulticolor', 'htmlLabels', 'useMaxWidth'],
      };

    case 'quadrantChart':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: ['chartWidth', 'chartHeight', 'quadrantPadding', 'useMaxWidth'],
      };

    case 'xyChart':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: [
          'width',
          'height',
          'showDataLabel',
          'xAxisTitle',
          'yAxisTitle',
          'useMaxWidth',
        ],
      };

    case 'requirementDiagram':
      return {
        supportsClassDef: true, // Requirement diagrams DO support classDef
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [],
      };

    case 'gitGraph':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: [],
      };

    case 'sankey':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: [
          'width',
          'height',
          'linkColor',
          'nodeAlignment',
          'showValues',
          'prefix',
          'suffix',
          'useMaxWidth',
        ],
      };

    case 'packetDiagram':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: ['showBits'],
      };

    case 'kanban':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: ['ticketBaseUrl'],
      };

    case 'usecaseDiagram':
      return {
        supportsClassDef: true, // classDef token verified in the v12 usecase grammar
        supportsVisualEditing: false,
        supportsStyleKeyword: true, // style token verified in the v12 usecase grammar
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['direction'], // TD/TB/BT/LR/RL verified in the grammar
      };

    case 'zenuml':
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Theme variables only
        availableConfigOptions: [],
      };

    case 'treemap':
      return {
        supportsClassDef: true, // treemap grammar supports classDef/class statements
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true,
        availableConfigOptions: [],
      };

    case 'swimlane':
      return {
        supportsClassDef: true, // swimlane supports classDef & style keywords
        supportsVisualEditing: false,
        supportsStyleKeyword: true,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: true,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: ['lineHops', 'automaticLaneOrdering'],
      };

    case 'agentflow':
      return {
        supportsClassDef: true, // agentflow supports classDef & style keywords
        supportsVisualEditing: false,
        supportsStyleKeyword: true,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsAgentflowConfig: true,
        supportsC4Style: false,
        supportsThemeVariablesOnly: false,
        availableConfigOptions: [
          'nodeSpacing',
          'rankSpacing',
          'wrappingWidth',
          'minNodeWidth',
          'diagramPadding',
          'layoutEngine',
        ],
      };

    case 'ishikawa':
    case 'radar':
    case 'eventmodeling':
    case 'venn':
    case 'treeView':
    case 'wardley':
    case 'cynefin':
    case 'railroad':
    case 'unknown':
    default:
      return {
        supportsClassDef: false,
        supportsVisualEditing: false,
        supportsStyleKeyword: false,
        supportsRectBlocks: false,
        supportsFlowchartConfig: false,
        supportsSequenceConfig: false,
        supportsGanttConfig: false,
        supportsSwimlaneConfig: false,
        supportsC4Style: false,
        supportsThemeVariablesOnly: true, // Default to theme variables
        availableConfigOptions: [],
      };
  }
}
