import type { ColorPalette, DiagramStyleOptions, LayoutEngine } from '@/types';
import { DEFAULT_STYLE_OPTIONS } from '@/types';

export const colorPalettes: ColorPalette[] = [
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue tones for business diagrams',
    colors: {
      primary: '#0066CC',
      secondary: '#004499',
      accent: '#0099FF',
      success: '#00AA44',
      warning: '#FF9900',
      error: '#CC0000',
      neutral_light: '#F5F7FA',
      neutral_dark: '#1A1F2E',
    },
  },
  {
    id: 'warm-earth',
    name: 'Warm Earth',
    description: 'Warm, earthy tones for organic designs',
    colors: {
      primary: '#C85A17',
      secondary: '#8B4513',
      accent: '#FF9F43',
      success: '#27AE60',
      warning: '#E67E22',
      error: '#E74C3C',
      neutral_light: '#FEF5E7',
      neutral_dark: '#2C1810',
    },
  },
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Modern dark theme for tech products',
    colors: {
      primary: '#00D4FF',
      secondary: '#0099CC',
      accent: '#FF006E',
      success: '#00E676',
      warning: '#FFD600',
      error: '#FF3D00',
      neutral_light: '#E0E0E0',
      neutral_dark: '#0D1117',
    },
  },
  {
    id: 'pastel-modern',
    name: 'Pastel Modern',
    description: 'Soft pastel colors for contemporary designs',
    colors: {
      primary: '#A78BFA',
      secondary: '#F472B6',
      accent: '#60A5FA',
      success: '#86EFAC',
      warning: '#FCD34D',
      error: '#FCA5A5',
      neutral_light: '#F8FAFC',
      neutral_dark: '#1E293B',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool ocean blues and teals',
    colors: {
      primary: '#0369A1',
      secondary: '#0C4A6E',
      accent: '#06B6D4',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      neutral_light: '#ECFDF5',
      neutral_dark: '#082F49',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Vibrant sunset gradient colors',
    colors: {
      primary: '#DC2626',
      secondary: '#EA580C',
      accent: '#F59E0B',
      success: '#84CC16',
      warning: '#EAB308',
      error: '#991B1B',
      neutral_light: '#FEF3C7',
      neutral_dark: '#7C2D12',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep forest greens and browns',
    colors: {
      primary: '#15803D',
      secondary: '#166534',
      accent: '#22C55E',
      success: '#16A34A',
      warning: '#CA8A04',
      error: '#DC2626',
      neutral_light: '#DCFCE7',
      neutral_dark: '#1B4332',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep midnight blues with purple accents',
    colors: {
      primary: '#1E3A8A',
      secondary: '#3730A3',
      accent: '#7C3AED',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      neutral_light: '#F0F4F8',
      neutral_dark: '#0F172A',
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Vibrant rainbow color spectrum',
    colors: {
      primary: '#EC4899',
      secondary: '#8B5CF6',
      accent: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      neutral_light: '#F9FAFB',
      neutral_dark: '#111827',
    },
  },
  {
    id: 'neutral-minimal',
    name: 'Neutral Minimal',
    description: 'Clean, minimal neutral grayscale',
    colors: {
      primary: '#374151',
      secondary: '#6B7280',
      accent: '#9CA3AF',
      success: '#4B5563',
      warning: '#6B7280',
      error: '#111827',
      neutral_light: '#F3F4F6',
      neutral_dark: '#1F2937',
    },
  },
];

export function getPaletteById(id: string): ColorPalette | undefined {
  return colorPalettes.find((p) => p.id === id);
}

export function getPaletteByName(name: string): ColorPalette | undefined {
  return colorPalettes.find((p) => p.name === name);
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function buildThemeVariables(palette: ColorPalette, diagramType?: string): Record<string, string> {
  const c = palette.colors;
  const font = 'Inter, system-ui, sans-serif';
  const fontSize = '14px';

  // Common variables for all diagram types
  const commonVars: Record<string, string> = {
    background: c.neutral_light,
    fontFamily: font,
    fontSize: fontSize,
    primaryColor: c.primary,
    primaryTextColor: getContrastColor(c.primary),
    primaryBorderColor: c.secondary,
    secondaryColor: c.secondary,
    secondaryTextColor: getContrastColor(c.secondary),
    secondaryBorderColor: c.accent,
    tertiaryColor: c.accent,
    tertiaryTextColor: getContrastColor(c.accent),
    tertiaryBorderColor: c.primary,
    textColor: getContrastColor(c.neutral_light),
  };

  // Flowchart specific variables
  const flowchartVars: Record<string, string> = {
    mainBkg: c.primary,
    nodeBorder: c.secondary,
    nodeTextColor: getContrastColor(c.primary),
    lineColor: c.secondary,
    edgeLabelBackground: c.neutral_light,
    clusterBkg: c.neutral_light,
    clusterBorder: c.secondary,
    titleColor: getContrastColor(c.neutral_light),
  };

  // Sequence diagram specific variables
  const sequenceVars: Record<string, string> = {
    actorBkg: c.primary,
    actorBorder: c.secondary,
    actorTextColor: getContrastColor(c.primary),
    actorLineColor: c.secondary,
    signalColor: c.secondary,
    signalTextColor: getContrastColor(c.neutral_light),
    noteBkgColor: c.neutral_light,
    noteBorderColor: c.secondary,
    noteTextColor: getContrastColor(c.neutral_light),
    labelBoxBkgColor: c.primary,
    labelBoxBorderColor: c.secondary,
    labelTextColor: getContrastColor(c.primary),
    loopTextColor: getContrastColor(c.neutral_light),
    activationBorderColor: c.secondary,
    activationBkgColor: c.accent,
  };

  // Gantt chart specific variables
  const ganttVars: Record<string, string> = {
    taskBkgColor: c.primary,
    taskTextColor: getContrastColor(c.primary),
    taskTextLightColor: getContrastColor(c.primary),
    taskBorderColor: c.secondary,
    activeTaskBkgColor: c.accent,
    activeTaskBorderColor: c.primary,
    doneTaskBkgColor: c.success,
    doneTaskBorderColor: c.secondary,
    critBkgColor: c.error,
    critBorderColor: c.secondary,
    todayLineColor: c.error,
    sectionBkgColor: c.neutral_light,
    altSectionBkgColor: c.neutral_dark,
    sectionBkgColor2: c.neutral_light,
  };

  // Pie chart specific variables
  const pieVars: Record<string, string> = {
    pie1: c.primary,
    pie2: c.secondary,
    pie3: c.accent,
    pie4: c.success,
    pie5: c.warning,
    pie6: c.error,
    pie7: c.neutral_dark,
    pieTitleTextColor: getContrastColor(c.neutral_light),
    pieSectionTextColor: '#ffffff',
    pieLegendTextColor: getContrastColor(c.neutral_light),
    pieStrokeColor: c.secondary,
  };

  // State diagram specific variables
  const stateVars: Record<string, string> = {
    altSectionBkgColor: c.neutral_dark,
    background: c.neutral_light,
    comberimentBackground: c.neutral_dark,
    comberimentBorder: c.secondary,
    comberimentLabelColor: getContrastColor(c.neutral_dark),
    comberimentTextAlign: 'center',
    labelBackgroundColor: c.neutral_light,
    nodeBorder: c.secondary,
    stateBkg: c.primary,
    stateLabelColor: getContrastColor(c.primary),
    stateBorder: c.secondary,
  };

  // Class diagram specific variables
  const classVars: Record<string, string> = {
    classText: getContrastColor(c.neutral_light),
    lineColor: c.secondary,
    annotationBkgColor: c.neutral_light,
    annotationBorderColor: c.secondary,
  };

  // ER diagram specific variables
  const erVars: Record<string, string> = {
    entityBackgroundColor: c.primary,
    entityBorderColor: c.secondary,
    attributeBackgroundColor: c.neutral_light,
    attributeBorderColor: c.secondary,
    relationshipLabelColor: getContrastColor(c.neutral_light),
  };

  // Git graph specific variables
  const gitVars: Record<string, string> = {
    commitLabelColor: getContrastColor(c.neutral_light),
    git0: c.primary,
    git1: c.secondary,
    git2: c.accent,
    git3: c.success,
    git4: c.warning,
    git5: c.error,
    git6: c.neutral_dark,
    git7: c.primary,
  };

  // Mindmap specific variables
  const mindmapVars: Record<string, string> = {
    mindmapPrimaryColor: c.primary,
    mindmapPrimaryTextColor: getContrastColor(c.primary),
    mindmapSecondaryColor: c.secondary,
    mindmapSecondaryTextColor: getContrastColor(c.secondary),
    mindmapTertiaryColor: c.accent,
    mindmapTertiaryTextColor: getContrastColor(c.accent),
  };

  // Journey (User Journey) specific variables
  const journeyVars: Record<string, string> = {
    ...flowchartVars,
    fillType0: c.primary,
    fillType1: c.secondary,
    fillType2: c.accent,
    fillType3: c.success,
    fillType4: c.warning,
    fillType5: c.error,
  };

  // Timeline specific variables
  const timelineVars: Record<string, string> = {
    cScale0: c.primary,
    cScale1: c.secondary,
    cScale2: c.accent,
    cScale3: c.success,
    cScale4: c.warning,
    cScale5: c.error,
    cScale6: c.neutral_dark,
    cScale7: c.primary,
    cScale8: c.secondary,
    cScale9: c.accent,
    cScale10: c.success,
    cScale11: c.warning,
    cScaleLabel0: getContrastColor(c.primary),
    cScaleLabel1: getContrastColor(c.secondary),
    cScaleLabel2: getContrastColor(c.accent),
    cScaleLabel3: getContrastColor(c.success),
    cScaleLabel4: getContrastColor(c.warning),
    cScaleLabel5: getContrastColor(c.error),
    cScaleLabel6: getContrastColor(c.neutral_dark),
    cScaleLabel7: getContrastColor(c.primary),
    cScaleLabel8: getContrastColor(c.secondary),
    cScaleLabel9: getContrastColor(c.accent),
    cScaleLabel10: getContrastColor(c.success),
    cScaleLabel11: getContrastColor(c.warning),
  };

  // Block diagram specific variables
  const blockVars: Record<string, string> = {
    ...flowchartVars,
    blockBkg: c.primary,
    blockBorder: c.secondary,
  };

  // C4 Context specific variables
  const c4Vars: Record<string, string> = {
    ...flowchartVars,
    personBackgroundColor: c.primary,
    personBorderColor: c.secondary,
    personTextColor: getContrastColor(c.primary),
    systemBackgroundColor: c.accent,
    systemBorderColor: c.primary,
    systemTextColor: getContrastColor(c.accent),
    containerBackgroundColor: c.secondary,
    containerBorderColor: c.primary,
    containerTextColor: getContrastColor(c.secondary),
  };

  // Architecture diagram specific variables
  const architectureVars: Record<string, string> = {
    ...flowchartVars,
    groupBackgroundColor: c.neutral_light,
    groupBorderColor: c.secondary,
  };

  // Variables per diagram type
  const typeVars: Record<string, Record<string, string>> = {
    flowchart: flowchartVars,
    graph: flowchartVars,
    sequencediagram: sequenceVars,
    sequence: sequenceVars,
    gantt: ganttVars,
    pie: pieVars,
    statediagram: stateVars,
    state: stateVars,
    stateDiagram: stateVars,
    classdiagram: classVars,
    class: classVars,
    classDiagram: classVars,
    erdiagram: erVars,
    er: erVars,
    erDiagram: erVars,
    gitgraph: gitVars,
    git: gitVars,
    mindmap: mindmapVars,
    journey: journeyVars,
    userjourney: journeyVars,
    timeline: timelineVars,
    quadrantchart: pieVars,
    quadrantChart: pieVars,
    block: blockVars,
    blockdiagram: blockVars,
    blockDiagram: blockVars,
    architecture: architectureVars,
    architecturediagram: architectureVars,
    architectureDiagram: architectureVars,
    c4: c4Vars,
    c4context: c4Vars,
    c4Context: c4Vars,
  };

  // Combine common vars with type-specific vars
  const vars = { ...commonVars };
  if (diagramType && typeVars[diagramType.toLowerCase()]) {
    Object.assign(vars, typeVars[diagramType.toLowerCase()]);
  }

  return vars;
}

export function generateMermaidThemeConfig(palette: ColorPalette, styleOptions?: DiagramStyleOptions, diagramType?: string): string {
  const vars = buildThemeVariables(palette, diagramType);

  // Override with style options
  if (styleOptions?.fontFamily) {
    vars.fontFamily = styleOptions.fontFamily;
  }
  if (styleOptions?.fontSize) {
    vars.fontSize = styleOptions.fontSize + 'px';
  }

  const themeConfig: Record<string, unknown> = {
    theme: 'base',
    themeVariables: vars,
  };

  if (styleOptions) {
    const flowchartCfg = {
      curve: styleOptions.curveStyle,
      padding: styleOptions.nodePadding,
      htmlLabels: true,
      nodeSpacing: styleOptions.nodeSpacing,
      rankSpacing: styleOptions.rankSpacing,
      useMaxWidth: styleOptions.useMaxWidth,
    };

    // Nest flowchart config properly
    themeConfig.flowchart = flowchartCfg;

    // Add layout config if specified
    if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
      themeConfig.layout = styleOptions.layoutEngine;
    }
  }

  return `---\nconfig:\n${objectToYaml(themeConfig, 2)}---`;
}

function objectToYaml(obj: Record<string, unknown>, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${objectToYaml(value as Record<string, unknown>, indent + 2)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n${spaces}  - ${(value as unknown[]).join('\n' + spaces + '  - ')}\n`;
    } else if (typeof value === 'string') {
      // Always quote string values for Mermaid compatibility
      // Colors like #fff4dd MUST be quoted: '#fff4dd'
      // Theme names like 'base' should be quoted: 'base'
      result += `${spaces}${key}: '${value}'\n`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}

export function generateStyleOnlyConfig(styleOptions: DiagramStyleOptions, diagramType?: string): string {
  const config: Record<string, unknown> = {
    theme: 'base',
    themeVariables: {
      fontFamily: styleOptions.fontFamily,
      fontSize: styleOptions.fontSize + 'px',
    },
  };

  // Detect diagram type if not provided
  const type = diagramType || detectDiagramTypeFromContent('');

  // Add type-specific configuration
  switch (type) {
    case 'flowchart':
    case 'graph':
    case 'flowchart,sequence':
    case 'journey':
    case 'c4':
    case 'block':
    case 'blockDiagram':
    case 'architecture':
    case 'architectureDiagram':
      config.flowchart = {
        curve: styleOptions.curveStyle,
        padding: styleOptions.nodePadding,
        htmlLabels: true,
        nodeSpacing: styleOptions.nodeSpacing,
        rankSpacing: styleOptions.rankSpacing,
        useMaxWidth: styleOptions.useMaxWidth,
      };
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        config.layout = styleOptions.layoutEngine;
      }
      break;

    case 'sequence':
    case 'sequencediagram':
      config.sequence = {
        diagramMarginX: styleOptions.diagramMarginX ?? 50,
        diagramMarginY: styleOptions.diagramMarginY ?? 10,
        actorMargin: styleOptions.actorMargin ?? 50,
        width: styleOptions.actorWidth ?? 150,
        height: styleOptions.actorHeight ?? 65,
        boxMargin: styleOptions.boxMargin ?? 10,
        mirrorActors: styleOptions.mirrorActors ?? false,
        useMaxWidth: true,
        messageAlign: styleOptions.messageAlign ?? 'center',
        rightAngles: styleOptions.rightAngles ?? false,
        showSequenceNumbers: styleOptions.showSequenceNumbers ?? false,
        wrap: styleOptions.wrap ?? false,
      };
      break;

    case 'gantt':
      config.gantt = {
        titleTopMargin: styleOptions.titleTopMargin ?? 25,
        barHeight: styleOptions.barHeight ?? 20,
        barGap: styleOptions.barGap ?? 4,
        topPadding: styleOptions.topPadding ?? 50,
        leftPadding: styleOptions.leftPadding ?? 75,
        axisFormat: styleOptions.axisFormat ?? '%Y-%m-%d',
        sectionMargin: styleOptions.sectionMargin ?? 10,
      };
      break;

    case 'mindmap':
      config.mindmap = {
        maxNodeWidth: styleOptions.maxNodeWidth ?? 200,
        maxNodeHeight: styleOptions.maxNodeHeight ?? 200,
        maxTextWidth: styleOptions.maxTextWidth ?? 100,
        padding: styleOptions.padding ?? 15,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        config.layout = styleOptions.layoutEngine;
      }
      break;

    case 'statediagram':
    case 'state':
    case 'stateDiagram':
    case 'classdiagram':
    case 'class':
    case 'classDiagram':
    case 'erdiagram':
    case 'er':
    case 'erDiagram':
      config.flowchart = {
        curve: styleOptions.curveStyle,
        padding: styleOptions.padding ?? 15,
        htmlLabels: true,
        nodeSpacing: styleOptions.nodeSpacing,
        rankSpacing: styleOptions.rankSpacing,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        config.layout = styleOptions.layoutEngine;
      }
      // ER diagram specific
      if (type.includes('er') || type === 'erdiagram' || type === 'erDiagram') {
        config.erDiagram = {
          minEntityWidth: styleOptions.minEntityWidth ?? 100,
          minEntityHeight: styleOptions.minEntityHeight ?? 75,
          useMaxWidth: styleOptions.useMaxWidth ?? true,
        };
      }
      break;

    case 'pie':
      config.pie = {
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;

    case 'timeline':
      config.timeline = {
        disableMulticolor: styleOptions.disableMulticolor ?? false,
        htmlLabels: styleOptions.htmlLabels ?? false,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;

    case 'quadrantchart':
    case 'quadrantChart':
      config.quadrantChart = {
        chartWidth: styleOptions.chartWidth ?? 500,
        chartHeight: styleOptions.chartHeight ?? 500,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;

    case 'xychart':
    case 'xyChart':
      config.xyChart = {
        showDataLabel: styleOptions.showDataLabel ?? false,
        xAxisTitle: styleOptions.xAxisTitle ?? '',
        yAxisTitle: styleOptions.yAxisTitle ?? '',
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;

    case 'gitgraph':
    case 'gitGraph':
      config.gitGraph = {
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;

    default:
      // For unsupported types, just use theme variables
      break;
  }

  return `---\nconfig:\n${objectToYaml(config, 2)}---`;
}

export function applyStyleToContent(content: string, styleOptions: DiagramStyleOptions): string {
  const stripped = stripYamlFrontmatter(content);
  const diagramType = detectDiagramTypeFromContent(stripped);

  // Parse existing YAML config to preserve color settings
  const existingConfig = extractExistingConfig(content);

  // If there's existing config (palette applied), merge styles with it (preserving colors)
  if (existingConfig) {
    const mergedConfig = mergeConfigWithStyles(existingConfig, styleOptions, diagramType);
    return `---\nconfig:\n${objectToYaml(mergedConfig, 2)}---\n\n${stripped}`;
  }

  // No palette exists - generate minimal config without theme to avoid applying colors
  // Only include the specific config section for the diagram type (sequence, gantt, etc.)
  const type = diagramType || detectDiagramTypeFromContent(stripped);

  // Build minimal config with only type-specific sections, NO theme
  const minimalConfig: Record<string, unknown> = {};
  let hasNonFontConfig = false; // Track if we have actual diagram config (not just fonts)

  switch (type) {
    case 'sequence':
    case 'sequencediagram':
      if (styleOptions.diagramMarginX !== undefined) minimalConfig.diagramMarginX = styleOptions.diagramMarginX;
      if (styleOptions.diagramMarginY !== undefined) minimalConfig.diagramMarginY = styleOptions.diagramMarginY;
      if (styleOptions.actorMargin !== undefined) minimalConfig.actorMargin = styleOptions.actorMargin;
      if (styleOptions.actorWidth !== undefined) minimalConfig.width = styleOptions.actorWidth;
      if (styleOptions.actorHeight !== undefined) minimalConfig.height = styleOptions.actorHeight;
      if (styleOptions.boxMargin !== undefined) minimalConfig.boxMargin = styleOptions.boxMargin;
      if (styleOptions.mirrorActors !== undefined) minimalConfig.mirrorActors = styleOptions.mirrorActors;
      if (styleOptions.messageAlign !== undefined) minimalConfig.messageAlign = styleOptions.messageAlign;
      if (styleOptions.rightAngles !== undefined) minimalConfig.rightAngles = styleOptions.rightAngles;
      if (styleOptions.showSequenceNumbers !== undefined) minimalConfig.showSequenceNumbers = styleOptions.showSequenceNumbers;
      if (styleOptions.wrap !== undefined) minimalConfig.wrap = styleOptions.wrap;
      if (Object.keys(minimalConfig).length > 0) {
        minimalConfig.useMaxWidth = true;
        hasNonFontConfig = true;
      }
      break;

    case 'gantt':
      if (styleOptions.titleTopMargin !== undefined) minimalConfig.titleTopMargin = styleOptions.titleTopMargin;
      if (styleOptions.barHeight !== undefined) minimalConfig.barHeight = styleOptions.barHeight;
      if (styleOptions.barGap !== undefined) minimalConfig.barGap = styleOptions.barGap;
      if (styleOptions.topPadding !== undefined) minimalConfig.topPadding = styleOptions.topPadding;
      if (styleOptions.leftPadding !== undefined) minimalConfig.leftPadding = styleOptions.leftPadding;
      if (styleOptions.axisFormat !== undefined) minimalConfig.axisFormat = styleOptions.axisFormat;
      if (styleOptions.sectionMargin !== undefined) minimalConfig.sectionMargin = styleOptions.sectionMargin;
      if (Object.keys(minimalConfig).length > 0) {
        minimalConfig.useMaxWidth = true;
        hasNonFontConfig = true;
      }
      break;

    case 'mindmap':
      if (styleOptions.maxNodeWidth !== undefined) minimalConfig.maxNodeWidth = styleOptions.maxNodeWidth;
      if (styleOptions.maxNodeHeight !== undefined) minimalConfig.maxNodeHeight = styleOptions.maxNodeHeight;
      if (styleOptions.maxTextWidth !== undefined) minimalConfig.maxTextWidth = styleOptions.maxTextWidth;
      if (styleOptions.padding !== undefined) minimalConfig.padding = styleOptions.padding;
      if (Object.keys(minimalConfig).length > 0) {
        minimalConfig.useMaxWidth = true;
        hasNonFontConfig = true;
      }
      // Add layout engine if specified
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        minimalConfig.layout = styleOptions.layoutEngine;
      }
      break;

    case 'flowchart':
    case 'graph':
    case 'journey':
    case 'c4':
    case 'block':
    case 'blockDiagram':
    case 'architecture':
    case 'architectureDiagram':
    case 'stateDiagram':
    case 'state':
    case 'classDiagram':
    case 'class':
    case 'erDiagram':
    case 'er':
      // For flowchart-based diagrams, include flowchart config without theme
      if (styleOptions.curveStyle !== undefined) minimalConfig.curve = styleOptions.curveStyle;
      if (styleOptions.nodePadding !== undefined) minimalConfig.padding = styleOptions.nodePadding;
      if (styleOptions.nodeSpacing !== undefined) minimalConfig.nodeSpacing = styleOptions.nodeSpacing;
      if (styleOptions.rankSpacing !== undefined) minimalConfig.rankSpacing = styleOptions.rankSpacing;
      if (styleOptions.useMaxWidth !== undefined) minimalConfig.useMaxWidth = styleOptions.useMaxWidth;
      if (Object.keys(minimalConfig).length > 0) {
        minimalConfig.htmlLabels = true;
        hasNonFontConfig = true;
      }
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        minimalConfig.layout = styleOptions.layoutEngine;
      }
      break;

    case 'pie':
    case 'pieChart':
      if (styleOptions.useMaxWidth !== undefined) minimalConfig.useMaxWidth = styleOptions.useMaxWidth;
      if (Object.keys(minimalConfig).length > 0) {
        hasNonFontConfig = true;
      }
      break;

    case 'timeline':
      if (styleOptions.disableMulticolor !== undefined) minimalConfig.disableMulticolor = styleOptions.disableMulticolor;
      if (styleOptions.htmlLabels !== undefined) minimalConfig.htmlLabels = styleOptions.htmlLabels;
      if (styleOptions.useMaxWidth !== undefined) minimalConfig.useMaxWidth = styleOptions.useMaxWidth;
      if (Object.keys(minimalConfig).length > 0) {
        hasNonFontConfig = true;
      }
      break;

    case 'quadrantchart':
    case 'quadrantChart':
    case 'quadrant':
      if (styleOptions.chartWidth !== undefined || styleOptions.chartHeight !== undefined || styleOptions.useMaxWidth !== undefined) {
        minimalConfig.quadrantChart = {
          chartWidth: styleOptions.chartWidth ?? 500,
          chartHeight: styleOptions.chartHeight ?? 500,
          useMaxWidth: styleOptions.useMaxWidth ?? true,
        };
        hasNonFontConfig = true;
      }
      break;

    case 'xychart':
    case 'xyChart':
    case 'xy':
      if (styleOptions.showDataLabel !== undefined || styleOptions.xAxisTitle !== undefined || styleOptions.yAxisTitle !== undefined || styleOptions.useMaxWidth !== undefined) {
        minimalConfig.xyChart = {
          showDataLabel: styleOptions.showDataLabel ?? false,
          xAxisTitle: styleOptions.xAxisTitle ?? '',
          yAxisTitle: styleOptions.yAxisTitle ?? '',
          useMaxWidth: styleOptions.useMaxWidth ?? true,
        };
        hasNonFontConfig = true;
      }
      break;

    default:
      // For unsupported types, just ensure useMaxWidth if set
      if (styleOptions.useMaxWidth !== undefined) {
        minimalConfig.useMaxWidth = styleOptions.useMaxWidth;
        hasNonFontConfig = true;
      }
      break;
  }

  // Add font settings to themeVariables for all diagram types
  // NOTE: When we have diagram config (hasNonFontConfig), we also include
  // base theme variables to prevent Mermaid from applying its default colors.
  if (hasNonFontConfig) {
    // Set theme to 'base' so that themeVariables are properly applied
    minimalConfig.theme = 'base';

    // Minimal base theme variables - just primaryColor to avoid beige default
    minimalConfig.themeVariables = {
      ...(minimalConfig.themeVariables as Record<string, unknown> | {}),
      primaryColor: '#fff4dd',
    };

    // Add font settings on top of base theme
    if (styleOptions.fontFamily !== undefined) {
      minimalConfig.themeVariables = {
        ...(minimalConfig.themeVariables as Record<string, unknown> | {}),
        fontFamily: styleOptions.fontFamily,
      };
    }
    if (styleOptions.fontSize !== undefined) {
      minimalConfig.themeVariables = {
        ...(minimalConfig.themeVariables as Record<string, unknown> | {}),
        fontSize: styleOptions.fontSize + 'px',
      };
    }
  }

  // Only generate YAML if we have actual settings to apply (not just fonts without palette)
  if (!hasNonFontConfig) {
    return stripped;
  }

  // Generate YAML WITHOUT theme base to avoid applying default colors, but with themeVariables for fonts
  return `---\nconfig:\n${objectToYaml(minimalConfig, 2)}---\n\n${stripped}`;
}

function extractExistingConfig(content: string): Record<string, unknown> | null {
  // More flexible YAML frontmatter matching - handle various formats
  let yamlMatch = content.match(/^\s*---\s*\nconfig:\s*\n([\s\S]*?)\n---/i);
  
  // Also try alternative format with --- on same line as config:
  if (!yamlMatch) {
    yamlMatch = content.match(/^\s*---\s*config:\s*\n([\s\S]*?)---/i);
  }
  
  // Try without config: prefix (just --- ... ---)
  if (!yamlMatch) {
    yamlMatch = content.match(/^\s*---\s*\n([\s\S]*?)---/i);
  }
  
  if (!yamlMatch) return null;

  try {
    // Parse the entire YAML config section more robustly
    const yamlText = yamlMatch[1];
    const config: Record<string, unknown> = { themeVariables: {} };

    const lines = yamlText.split('\n');
    let currentSection: Record<string, unknown> | null = null;
    let currentSectionIndent = -1;
    // Base indent is 2 (under 'config:')
    const baseIndent = 2;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.search(/\S/);

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for key-value or section start
      const kvMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
      if (!kvMatch) continue;

      const key = kvMatch[1];
      let value = kvMatch[2];

      // If at base indent level (2 spaces), this is a top-level config section
      if (indent === baseIndent) {
        currentSection = config;
        currentSectionIndent = indent;

        if (value === '') {
          // Empty value means this is a section start (like 'flowchart:' or 'themeVariables:')
          config[key] = {};
          currentSection = config[key] as Record<string, unknown>;
          currentSectionIndent = indent;
          continue;
        }
      } else if (currentSection && indent > currentSectionIndent) {
        // Nested under current section
      } else {
        // Same or lesser indent - go back to config level
        currentSection = config;
        currentSectionIndent = baseIndent;
      }

      // Parse the value
      if (value === '' && kvMatch[1] !== 'themeVariables') {
        // Start of a nested section
        if (currentSection) {
          (currentSection as Record<string, unknown>)[key] = {};
          currentSection = (currentSection as Record<string, unknown>)[key] as Record<string, unknown>;
          currentSectionIndent = indent;
        }
        continue;
      }

      // Remove quotes from string values
      if ((value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }

      // Handle boolean values
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      // Handle numeric values
      if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }

      if (currentSection) {
        (currentSection as Record<string, unknown>)[key] = value;
      }
    }

    return config;
  } catch {
    return null;
  }
}

function mergeConfigWithStyles(existingConfig: Record<string, unknown>, styleOptions: DiagramStyleOptions, diagramType?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {
    theme: (existingConfig.theme as string) || 'base',
    themeVariables: { ...(existingConfig.themeVariables as Record<string, string>) },
  };

  // Apply style options - don't override existing color variables
  if (styleOptions.fontFamily) {
    (result.themeVariables as Record<string, string>).fontFamily = styleOptions.fontFamily;
  }
  if (styleOptions.fontSize) {
    (result.themeVariables as Record<string, string>).fontSize = styleOptions.fontSize + 'px';
  }

  // Detect diagram type if not provided
  const type = diagramType || detectDiagramTypeFromContent('');

  // Add type-specific configuration, preserving existing non-style settings
  switch (type) {
    case 'flowchart':
    case 'graph':
    case 'journey':
    case 'c4':
    case 'block':
    case 'blockDiagram':
    case 'architecture':
    case 'architectureDiagram': {
      // Preserve existing flowchart config where applicable
      const existingFlowchart = existingConfig.flowchart as Record<string, unknown> | undefined;
      result.flowchart = {
        ...(existingFlowchart || {}),
        curve: styleOptions.curveStyle,
        padding: styleOptions.nodePadding,
        htmlLabels: true,
        nodeSpacing: styleOptions.nodeSpacing,
        rankSpacing: styleOptions.rankSpacing,
        useMaxWidth: styleOptions.useMaxWidth,
      };
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        result.layout = styleOptions.layoutEngine;
      }
      break;
    }

    case 'sequence':
    case 'sequencediagram': {
      const existingSequence = existingConfig.sequence as Record<string, unknown> | undefined;
      result.sequence = {
        ...(existingSequence || {}),
        diagramMarginX: styleOptions.diagramMarginX ?? 50,
        diagramMarginY: styleOptions.diagramMarginY ?? 10,
        actorMargin: styleOptions.actorMargin ?? 50,
        width: styleOptions.actorWidth ?? 150,
        height: styleOptions.actorHeight ?? 65,
        boxMargin: styleOptions.boxMargin ?? 10,
        mirrorActors: styleOptions.mirrorActors ?? false,
        useMaxWidth: true,
        messageAlign: styleOptions.messageAlign ?? 'center',
        rightAngles: styleOptions.rightAngles ?? false,
        showSequenceNumbers: styleOptions.showSequenceNumbers ?? false,
        wrap: styleOptions.wrap ?? false,
      };
      break;
    }

    case 'gantt': {
      const existingGantt = existingConfig.gantt as Record<string, unknown> | undefined;
      result.gantt = {
        ...(existingGantt || {}),
        titleTopMargin: styleOptions.titleTopMargin ?? 25,
        barHeight: styleOptions.barHeight ?? 20,
        barGap: styleOptions.barGap ?? 4,
        topPadding: styleOptions.topPadding ?? 50,
        leftPadding: styleOptions.leftPadding ?? 75,
        axisFormat: styleOptions.axisFormat ?? '%Y-%m-%d',
        sectionMargin: styleOptions.sectionMargin ?? 10,
      };
      break;
    }

    case 'mindmap': {
      const existingMindmap = existingConfig.mindmap as Record<string, unknown> | undefined;
      result.mindmap = {
        ...(existingMindmap || {}),
        maxNodeWidth: styleOptions.maxNodeWidth ?? 200,
        maxNodeHeight: styleOptions.maxNodeHeight ?? 200,
        maxTextWidth: styleOptions.maxTextWidth ?? 100,
        padding: styleOptions.padding ?? 15,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        result.layout = styleOptions.layoutEngine;
      }
      break;
    }

    case 'statediagram':
    case 'state':
    case 'stateDiagram':
    case 'classdiagram':
    case 'class':
    case 'classDiagram':
    case 'erdiagram':
    case 'er':
    case 'erDiagram': {
      // These use flowchart config for layout
      const existingFlowchart2 = existingConfig.flowchart as Record<string, unknown> | undefined;
      result.flowchart = {
        ...(existingFlowchart2 || {}),
        curve: styleOptions.curveStyle,
        padding: styleOptions.padding ?? 15,
        htmlLabels: true,
        nodeSpacing: styleOptions.nodeSpacing,
        rankSpacing: styleOptions.rankSpacing,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        result.layout = styleOptions.layoutEngine;
      }
      // ER diagram specific
      if (type.includes('er') || type === 'erdiagram' || type === 'erDiagram') {
        const existingEr = existingConfig.erDiagram as Record<string, unknown> | undefined;
        result.erDiagram = {
          ...(existingEr || {}),
          minEntityWidth: styleOptions.minEntityWidth ?? 100,
          minEntityHeight: styleOptions.minEntityHeight ?? 75,
          useMaxWidth: styleOptions.useMaxWidth ?? true,
        };
      }
      break;
    }

    case 'pie': {
      const existingPie = existingConfig.pie as Record<string, unknown> | undefined;
      result.pie = {
        ...(existingPie || {}),
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;
    }

    case 'timeline': {
      const existingTimeline = existingConfig.timeline as Record<string, unknown> | undefined;
      result.timeline = {
        ...(existingTimeline || {}),
        disableMulticolor: styleOptions.disableMulticolor ?? false,
        htmlLabels: styleOptions.htmlLabels ?? false,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;
    }

    case 'quadrantchart':
    case 'quadrantChart': {
      const existingQuadrant = existingConfig.quadrantChart as Record<string, unknown> | undefined;
      result.quadrantChart = {
        ...(existingQuadrant || {}),
        chartWidth: styleOptions.chartWidth ?? 500,
        chartHeight: styleOptions.chartHeight ?? 500,
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;
    }

    case 'xychart':
    case 'xyChart': {
      const existingXy = existingConfig.xyChart as Record<string, unknown> | undefined;
      result.xyChart = {
        ...(existingXy || {}),
        showDataLabel: styleOptions.showDataLabel ?? false,
        xAxisTitle: styleOptions.xAxisTitle ?? '',
        yAxisTitle: styleOptions.yAxisTitle ?? '',
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;
    }

    case 'gitgraph':
    case 'gitGraph': {
      const existingGit = existingConfig.gitGraph as Record<string, unknown> | undefined;
      result.gitGraph = {
        ...(existingGit || {}),
        useMaxWidth: styleOptions.useMaxWidth ?? true,
      };
      break;
    }

    default:
      break;
  }

  return result;
}

export function applyPaletteWithStylesToContent(content: string, palette: ColorPalette, styleOptions: DiagramStyleOptions): string {
  const stripped = stripYamlFrontmatter(content);
  const diagramType = detectDiagramTypeFromContent(stripped);
  const themeConfig = generateMermaidThemeConfig(palette, styleOptions, diagramType);
  return themeConfig + '\n' + stripped;
}

export function applyPaletteToContent(content: string, palette: ColorPalette): string {
  const stripped = stripYamlFrontmatter(content);
  const diagramType = detectDiagramTypeFromContent(stripped);
  const themeConfig = generateMermaidThemeConfig(palette, undefined, diagramType);
  return themeConfig + '\n' + stripped;
}

function detectDiagramTypeFromContent(content: string): string | undefined {
  // Skip YAML frontmatter
  let body = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  body = body.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();

  const first = body.split('\n')[0]?.toLowerCase().trim();
  if (!first) return undefined;

  if (first.startsWith('flowchart') || first.startsWith('graph')) return 'flowchart';
  if (first.startsWith('sequencediagram')) return 'sequence';
  if (first.startsWith('classdiagram')) return 'class';
  if (first.startsWith('statediagram')) return 'state';
  if (first.startsWith('erdiagram')) return 'er';
  if (first.startsWith('gantt')) return 'gantt';
  if (first.startsWith('pie')) return 'pie';
  if (first.startsWith('mindmap')) return 'mindmap';
  if (first.startsWith('gitgraph')) return 'git';
  if (first.startsWith('journey')) return 'journey';
  if (first.startsWith('timeline')) return 'timeline';
  if (first.startsWith('quadrantchart')) return 'quadrant';
  if (first.startsWith('c4')) return 'c4';
  if (first.startsWith('block')) return 'block';
  if (first.startsWith('xychart')) return 'xyChart';
  if (first.startsWith('architecture')) return 'architectureDiagram';

  return 'flowchart'; // Default
}

function stripYamlFrontmatter(content: string): string {
  // Remove both YAML frontmatter (---...---) and old init directive (%%{init:...}%%)
  return content
    .replace(/^\s*---[\s\S]*?---\s*/i, '')
    .replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '')
    .trim();
}

/**
 * Wraps diagram content with base theme config to ensure consistent appearance
 * This prevents Mermaid from applying its default colors (including the beige background)
 * when creating new diagrams or using templates
 */
export function addBaseThemeConfig(content: string): string {
  const stripped = stripYamlFrontmatter(content);
  const diagramType = detectDiagramTypeFromContent(stripped);

  // Minimal base theme config - just primaryColor to avoid beige default
  const baseConfig: Record<string, unknown> = {
    theme: 'base',
    themeVariables: {
      primaryColor: '#fff4dd',
    },
  };

  // Add flowchart-specific config for flowcharts
  if (diagramType === 'flowchart' || diagramType === 'graph') {
    baseConfig.flowchart = {
      useMaxWidth: true,
    };
  }

  return `---\nconfig:\n${objectToYaml(baseConfig, 2)}---\n\n${stripped}`;
}

// Extract style options from existing YAML config
// Extract style options from existing YAML config
export function extractStyleOptionsFromContent(content: string): Partial<DiagramStyleOptions> {
  const existingConfig = extractExistingConfig(content);
  if (!existingConfig) return {};

  const options: Partial<DiagramStyleOptions> = {};

  // Extract from themeVariables
  const themeVars = existingConfig.themeVariables as Record<string, unknown>;
  if (themeVars) {
    if (themeVars.fontFamily && typeof themeVars.fontFamily === 'string') {
      options.fontFamily = themeVars.fontFamily;
    }
    if (themeVars.fontSize && typeof themeVars.fontSize === 'string') {
      const match = themeVars.fontSize.match(/(\d+)/);
      if (match) options.fontSize = parseInt(match[1], 10);
    }
  }

  // Extract from flowchart config
  const flowchart = existingConfig.flowchart as Record<string, unknown>;
  if (flowchart) {
    if (flowchart.curve && typeof flowchart.curve === 'string') {
      options.curveStyle = flowchart.curve as DiagramStyleOptions['curveStyle'];
    }
    if (typeof flowchart.padding === 'number') {
      options.nodePadding = flowchart.padding;
      options.padding = flowchart.padding;
    }
    if (typeof flowchart.nodeSpacing === 'number') {
      options.nodeSpacing = flowchart.nodeSpacing;
    }
    if (typeof flowchart.rankSpacing === 'number') {
      options.rankSpacing = flowchart.rankSpacing;
    }
    if (typeof flowchart.useMaxWidth === 'boolean') {
      options.useMaxWidth = flowchart.useMaxWidth;
    }
  }

  // Extract from sequence config
  const sequence = existingConfig.sequence as Record<string, unknown>;
  if (sequence) {
    if (typeof sequence.diagramMarginX === 'number') {
      options.diagramMarginX = sequence.diagramMarginX;
    }
    if (typeof sequence.diagramMarginY === 'number') {
      options.diagramMarginY = sequence.diagramMarginY;
    }
    if (typeof sequence.actorMargin === 'number') {
      options.actorMargin = sequence.actorMargin;
    }
    if (typeof sequence.width === 'number') {
      options.actorWidth = sequence.width;
    }
    if (typeof sequence.height === 'number') {
      options.actorHeight = sequence.height;
    }
    if (typeof sequence.boxMargin === 'number') {
      options.boxMargin = sequence.boxMargin;
    }
    if (typeof sequence.mirrorActors === 'boolean') {
      options.mirrorActors = sequence.mirrorActors;
    }
    if (typeof sequence.messageAlign === 'string') {
      options.messageAlign = sequence.messageAlign as 'left' | 'center' | 'right';
    }
    if (typeof sequence.rightAngles === 'boolean') {
      options.rightAngles = sequence.rightAngles;
    }
    if (typeof sequence.showSequenceNumbers === 'boolean') {
      options.showSequenceNumbers = sequence.showSequenceNumbers;
    }
    if (typeof sequence.wrap === 'boolean') {
      options.wrap = sequence.wrap;
    }
  }

  // Extract from gantt config
  const gantt = existingConfig.gantt as Record<string, unknown>;
  if (gantt) {
    if (typeof gantt.titleTopMargin === 'number') {
      options.titleTopMargin = gantt.titleTopMargin;
    }
    if (typeof gantt.barHeight === 'number') {
      options.barHeight = gantt.barHeight;
    }
    if (typeof gantt.barGap === 'number') {
      options.barGap = gantt.barGap;
    }
    if (typeof gantt.topPadding === 'number') {
      options.topPadding = gantt.topPadding;
    }
    if (typeof gantt.leftPadding === 'number') {
      options.leftPadding = gantt.leftPadding;
    }
    if (gantt.axisFormat && typeof gantt.axisFormat === 'string') {
      options.axisFormat = gantt.axisFormat;
    }
    if (typeof gantt.sectionMargin === 'number') {
      options.sectionMargin = gantt.sectionMargin;
    }
  }

  // Extract from mindmap config
  const mindmap = existingConfig.mindmap as Record<string, unknown>;
  if (mindmap) {
    if (typeof mindmap.maxNodeWidth === 'number') {
      options.maxNodeWidth = mindmap.maxNodeWidth;
    }
    if (typeof mindmap.maxNodeHeight === 'number') {
      options.maxNodeHeight = mindmap.maxNodeHeight;
    }
    if (typeof mindmap.maxTextWidth === 'number') {
      options.maxTextWidth = mindmap.maxTextWidth;
    }
    if (typeof mindmap.padding === 'number') {
      options.padding = mindmap.padding;
    }
    if (typeof mindmap.useMaxWidth === 'boolean') {
      options.useMaxWidth = mindmap.useMaxWidth;
    }
  }

  // Extract from erDiagram config
  const erDiagram = existingConfig.erDiagram as Record<string, unknown>;
  if (erDiagram) {
    if (typeof erDiagram.minEntityWidth === 'number') {
      options.minEntityWidth = erDiagram.minEntityWidth;
    }
    if (typeof erDiagram.minEntityHeight === 'number') {
      options.minEntityHeight = erDiagram.minEntityHeight;
    }
    if (typeof erDiagram.useMaxWidth === 'boolean') {
      options.useMaxWidth = erDiagram.useMaxWidth;
    }
  }

  // Extract from timeline config
  const timeline = existingConfig.timeline as Record<string, unknown>;
  if (timeline) {
    if (typeof timeline.disableMulticolor === 'boolean') {
      options.disableMulticolor = timeline.disableMulticolor;
    }
    if (typeof timeline.htmlLabels === 'boolean') {
      options.htmlLabels = timeline.htmlLabels;
    }
    if (typeof timeline.useMaxWidth === 'boolean') {
      options.useMaxWidth = timeline.useMaxWidth;
    }
  }

  // Extract from quadrantChart config
  const quadrantChart = existingConfig.quadrantChart as Record<string, unknown>;
  if (quadrantChart) {
    if (typeof quadrantChart.chartWidth === 'number') {
      options.chartWidth = quadrantChart.chartWidth;
    }
    if (typeof quadrantChart.chartHeight === 'number') {
      options.chartHeight = quadrantChart.chartHeight;
    }
    if (typeof quadrantChart.useMaxWidth === 'boolean') {
      options.useMaxWidth = quadrantChart.useMaxWidth;
    }
  }

  // Extract from xyChart config
  const xyChart = existingConfig.xyChart as Record<string, unknown>;
  if (xyChart) {
    if (typeof xyChart.showDataLabel === 'boolean') {
      options.showDataLabel = xyChart.showDataLabel;
    }
    if (xyChart.xAxisTitle && typeof xyChart.xAxisTitle === 'string') {
      options.xAxisTitle = xyChart.xAxisTitle;
    }
    if (xyChart.yAxisTitle && typeof xyChart.yAxisTitle === 'string') {
      options.yAxisTitle = xyChart.yAxisTitle;
    }
    if (typeof xyChart.useMaxWidth === 'boolean') {
      options.useMaxWidth = xyChart.useMaxWidth;
    }
  }

  // Extract from gitGraph config
  const gitGraph = existingConfig.gitGraph as Record<string, unknown>;
  if (gitGraph) {
    if (typeof gitGraph.useMaxWidth === 'boolean') {
      options.useMaxWidth = gitGraph.useMaxWidth;
    }
  }

  // Extract from pie config
  const pie = existingConfig.pie as Record<string, unknown>;
  if (pie) {
    if (typeof pie.useMaxWidth === 'boolean') {
      options.useMaxWidth = pie.useMaxWidth;
    }
  }

  // Extract layout engine
  if (existingConfig.layout && typeof existingConfig.layout === 'string') {
    options.layoutEngine = existingConfig.layout as LayoutEngine;
  }

  return options;
}
