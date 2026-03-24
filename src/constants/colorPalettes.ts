import type { ColorPalette, DiagramStyleOptions } from '@/types';

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

export function generateMermaidThemeConfig(palette: ColorPalette, styleOptions?: DiagramStyleOptions): string {
  const c = palette.colors;
  const font = styleOptions?.fontFamily || 'Inter, system-ui, sans-serif';
  const fontSize = styleOptions?.fontSize || 14;
  const vars: Record<string, string> = {
    primaryColor: c.primary,
    primaryTextColor: getContrastColor(c.primary),
    primaryBorderColor: c.secondary,
    secondaryColor: c.secondary,
    secondaryTextColor: getContrastColor(c.secondary),
    secondaryBorderColor: c.accent,
    tertiaryColor: c.accent,
    tertiaryTextColor: getContrastColor(c.accent),
    tertiaryBorderColor: c.primary,
    mainBkg: c.primary,
    nodeBorder: c.secondary,
    nodeTextColor: getContrastColor(c.primary),
    lineColor: c.secondary,
    background: c.neutral_light,
    fontFamily: font,
    noteBkgColor: c.neutral_light,
    noteBorderColor: c.secondary,
    noteTextColor: getContrastColor(c.neutral_light),
    actorBkg: c.primary,
    actorBorder: c.secondary,
    actorTextColor: getContrastColor(c.primary),
    actorLineColor: c.secondary,
    signalColor: c.secondary,
    signalTextColor: getContrastColor(c.neutral_light),
    labelBoxBkgColor: c.primary,
    labelBoxBorderColor: c.secondary,
    labelTextColor: getContrastColor(c.primary),
    loopTextColor: getContrastColor(c.neutral_light),
    activationBorderColor: c.secondary,
    activationBkgColor: c.accent,
    textColor: getContrastColor(c.neutral_light),
    edgeLabelBackground: c.neutral_light,
    clusterBkg: c.neutral_light,
    clusterBorder: c.secondary,
    titleColor: getContrastColor(c.neutral_light),
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
    gridColor: c.secondary,
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
  const varsStr = Object.entries(vars).map(([k, v]) => `'${k}':'${v}'`).join(',');

  const flowchartCfg = styleOptions
    ? `,'flowchart':{'curve':'${styleOptions.curveStyle}','padding':${styleOptions.nodePadding},'htmlLabels':true,'nodeSpacing':${styleOptions.nodeSpacing},'rankSpacing':${styleOptions.rankSpacing},'useMaxWidth':${styleOptions.useMaxWidth}}`
    : '';

  const layoutCfg = styleOptions?.layoutEngine && styleOptions.layoutEngine !== 'dagre'
    ? `,'layout':'${styleOptions.layoutEngine}'`
    : '';

  return `%%{init:{'theme':'base','themeVariables':{${varsStr}},'fontSize':${fontSize}${flowchartCfg}${layoutCfg}}}%%`;
}

export function generateStyleOnlyConfig(styleOptions: DiagramStyleOptions): string {
  const flowchartCfg = `'flowchart':{'curve':'${styleOptions.curveStyle}','padding':${styleOptions.nodePadding},'htmlLabels':true,'nodeSpacing':${styleOptions.nodeSpacing},'rankSpacing':${styleOptions.rankSpacing},'useMaxWidth':${styleOptions.useMaxWidth}}`;
  const layoutCfg = styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre'
    ? `,'layout':'${styleOptions.layoutEngine}'`
    : '';
  return `%%{init:{'fontSize':${styleOptions.fontSize},'themeVariables':{'fontFamily':'${styleOptions.fontFamily}'},${flowchartCfg}${layoutCfg}}}%%`;
}

export function applyStyleToContent(content: string, styleOptions: DiagramStyleOptions): string {
  const stripped = content.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();
  const styleConfig = generateStyleOnlyConfig(styleOptions);
  return styleConfig + '\n' + stripped;
}

export function applyPaletteWithStylesToContent(content: string, palette: ColorPalette, styleOptions: DiagramStyleOptions): string {
  const themeConfig = generateMermaidThemeConfig(palette, styleOptions);
  const stripped = content.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();
  return themeConfig + '\n' + stripped;
}

export function applyPaletteToContent(content: string, palette: ColorPalette): string {
  const themeConfig = generateMermaidThemeConfig(palette);
  const stripped = content.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();
  return themeConfig + '\n' + stripped;
}
