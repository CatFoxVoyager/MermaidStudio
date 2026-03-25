import type { ColorPalette, DiagramStyleOptions, LayoutEngine } from '@/types';

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
    journey: flowchartVars,
    timeline: ganttVars,
    quadrantchart: pieVars,
    block: flowchartVars,
    architecture: flowchartVars,
    c4: flowchartVars,
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
    case 'architecture':
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

    case 'statediagram':
    case 'state':
    case 'stateDiagram':
    case 'classdiagram':
    case 'class':
    case 'classDiagram':
    case 'erdiagram':
    case 'er':
    case 'erDiagram':
      // These use flowchart config for layout
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
  const styleConfig = generateStyleOnlyConfig(styleOptions, diagramType);

  // If there's existing config, merge styles with it (preserving colors)
  if (existingConfig) {
    const mergedConfig = mergeConfigWithStyles(existingConfig, styleOptions, diagramType);
    return `---\nconfig:\n${objectToYaml(mergedConfig, 2)}---\n\n${stripped}`;
  }

  return styleConfig + '\n\n' + stripped;
}

function extractExistingConfig(content: string): Record<string, unknown> | null {
  const yamlMatch = content.match(/^\s*---\nconfig:\n([\s\S]*?)---/i);
  if (!yamlMatch) return null;

  try {
    // Parse the entire YAML config section more robustly
    const yamlText = yamlMatch[1];
    const config: Record<string, unknown> = { themeVariables: {} };

    const lines = yamlText.split('\n');
    let currentSection: Record<string, unknown> | null = null;
    let inThemeVariables = false;
    let themeVarsIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for themeVariables section
      if (trimmed.startsWith('themeVariables:')) {
        inThemeVariables = true;
        themeVarsIndent = line.search(/\S/);
        if (!config.themeVariables) {
          config.themeVariables = {};
        }
        currentSection = config.themeVariables as Record<string, unknown>;
        continue;
      }

      // Check for other top-level sections
      const sectionMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*):$/);
      if (sectionMatch && !line.startsWith(' ')) {
        inThemeVariables = false;
        const sectionName = sectionMatch[1];
        config[sectionName] = {};
        currentSection = config[sectionName] as Record<string, unknown>;
        continue;
      }

      // Parse key-value pairs within current section
      if (currentSection) {
        const indent = line.search(/\S/);
        const isNested = inThemeVariables && indent > themeVarsIndent;

        // Only parse direct children of current section
        const kvMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/);
        if (kvMatch) {
          const key = kvMatch[1];
          let value = kvMatch[2];

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

          (currentSection as Record<string, unknown>)[key] = value;
        }
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
    case 'architecture': {
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

  return 'flowchart'; // Default
}

function stripYamlFrontmatter(content: string): string {
  // Remove both YAML frontmatter (---...---) and old init directive (%%{init:...}%%)
  return content
    .replace(/^\s*---[\s\S]*?---\s*/i, '')
    .replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '')
    .trim();
}

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

  // Extract layout engine
  if (existingConfig.layout && typeof existingConfig.layout === 'string') {
    options.layoutEngine = existingConfig.layout as LayoutEngine;
  }

  return options;
}
