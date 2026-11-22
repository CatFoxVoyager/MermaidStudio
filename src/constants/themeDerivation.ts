// src/constants/themeDerivation.ts
// Theme derivation engine that mirrors Mermaid's Theme.updateColors() exactly
// Reference: node_modules/mermaid/dist/chunks/mermaid.core/chunk-7R4GIKGN.mjs

import { isDark } from 'khroma';
import {
  isElkLayoutEngine,
  supportsElkLayout,
  supportsTidyTreeLayout,
  type ThemeCoreColors,
  type MermaidTheme,
  type DiagramType,
  type DiagramStyleOptions,
} from '@/types';
import { builtinThemes } from '@/constants/themes';
import { detectDiagramType } from '@/lib/mermaid/diagramType';
import { updateLinkStyle, parseLinkStyles } from '@/lib/mermaid/codeUtils';
import {
  adjustToHex,
  darkenToHex,
  lightenToHex,
  invertToHex,
  parseHexToHsl,
  adjustParsedHslToHex,
} from '@/utils/colorConversion';

const THEME_COLOR_LIMIT = 12;

/** Keys that should NEVER be inside themeVariables because they are top-level config properties */
const RESTRICTED_THEME_VARIABLES = new Set([
  'flowchart',
  'sequence',
  'gantt',
  'journey',
  'class',
  'state',
  'er',
  'pie',
  'mindmap',
  'git',
  'gitGraph',
  'quadrantChart',
  'xyChart',
  'sankey',
  'timeline',
  'packet',
  'kanban',
  'architecture',
  'zenuml',
  'block',
  'c4',
  'ishikawa',
  'treemap',
  'eventmodeling',
  'venn',
  'treeView',
  'railroad',
  'swimlane',
  'agentflow',
  'layout',
  'look',
  'theme',
  'config',
  'darkMode',
]);

const DIAGRAM_TYPE_VARIABLES: Record<DiagramType, string[]> = {
  flowchart: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'border2',
    'nodeBkg',
    'mainBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    'defaultLinkColor',
    'titleColor',
    'edgeLabelBackground',
    'nodeTextColor',
    'fontFamily',
    'fontSize',
  ],
  sequence: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'actorBorder',
    'actorBkg',
    'actorTextColor',
    'actorLineColor',
    'labelBoxBkgColor',
    'signalColor',
    'signalTextColor',
    'labelBoxBorderColor',
    'labelTextColor',
    'loopTextColor',
    'activationBorderColor',
    'activationBkgColor',
    'sequenceNumberColor',
    'noteBkgColor',
    'noteBorderColor',
    'noteTextColor',
    'sectionBkgColor',
    'altSectionBkgColor',
    'sectionBkgColor2',
    'excludeBkgColor',
    'fontFamily',
    'fontSize',
  ],
  classDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'nodeBkg',
    'mainBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    'classText',
    'fillType0',
    'fillType1',
    'fillType2',
    'fillType3',
    'fillType4',
    'fillType5',
    'fillType6',
    'fillType7',
    'fontFamily',
    'fontSize',
  ],
  stateDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'transitionColor',
    'transitionLabelColor',
    'stateLabelColor',
    'stateBkg',
    'labelBackgroundColor',
    'compositeBackground',
    'altBackground',
    'compositeTitleBackground',
    'compositeBorder',
    'innerEndBackground',
    'errorBkgColor',
    'errorTextColor',
    'specialStateColor',
    'fontFamily',
    'fontSize',
  ],
  erDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'entityBkg',
    'entityBorder',
    'attributeBkg',
    'attributeBorder',
    'relationshipBkg',
    'relationshipBorder',
    'fontFamily',
    'fontSize',
  ],
  gantt: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'taskBorderColor',
    'taskBkgColor',
    'activeTaskBorderColor',
    'activeTaskBkgColor',
    'gridColor',
    'doneTaskBkgColor',
    'doneTaskBorderColor',
    'critBorderColor',
    'critBkgColor',
    'todayLineColor',
    'vertLineColor',
    'taskTextColor',
    'taskTextOutsideColor',
    'taskTextLightColor',
    'taskTextDarkColor',
    'taskTextClickableColor',
    'sectionBkgColor',
    'altSectionBkgColor',
    'sectionBkgColor2',
    'excludeBkgColor',
    'fontFamily',
    'fontSize',
  ],
  pie: [
    'background',
    'primaryTextColor',
    'pie1',
    'pie2',
    'pie3',
    'pie4',
    'pie5',
    'pie6',
    'pie7',
    'pie8',
    'pie9',
    'pie10',
    'pie11',
    'pie12',
    'pieTitleTextSize',
    'pieTitleTextColor',
    'pieSectionTextSize',
    'pieSectionTextColor',
    'pieLegendTextSize',
    'pieLegendTextColor',
    'pieStrokeColor',
    'pieStrokeWidth',
    'pieOuterStrokeWidth',
    'pieOuterStrokeColor',
    'pieOpacity',
    'fontFamily',
    'fontSize',
  ],
  mindmap: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'fontFamily',
    'fontSize',
  ],
  gitGraph: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'git0',
    'git1',
    'git2',
    'git3',
    'git4',
    'git5',
    'git6',
    'git7',
    'gitInv0',
    'gitInv1',
    'gitInv2',
    'gitInv3',
    'gitInv4',
    'gitInv5',
    'gitInv6',
    'gitInv7',
    'branchLabelColor',
    'gitBranchLabel0',
    'gitBranchLabel1',
    'gitBranchLabel2',
    'gitBranchLabel3',
    'gitBranchLabel4',
    'gitBranchLabel5',
    'gitBranchLabel6',
    'gitBranchLabel7',
    'tagLabelColor',
    'tagLabelBackground',
    'tagLabelBorder',
    'tagLabelFontSize',
    'commitLabelColor',
    'commitLabelBackground',
    'commitLabelFontSize',
    'fontFamily',
    'fontSize',
  ],
  journey: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'fillType0',
    'fillType1',
    'fillType2',
    'fillType3',
    'fillType4',
    'fillType5',
    'fillType6',
    'fillType7',
    'fontFamily',
    'fontSize',
  ],
  quadrantChart: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'quadrant1Fill',
    'quadrant2Fill',
    'quadrant3Fill',
    'quadrant4Fill',
    'quadrant1TextFill',
    'quadrant2TextFill',
    'quadrant3TextFill',
    'quadrant4TextFill',
    'quadrantPointFill',
    'quadrantPointTextFill',
    'quadrantXAxisTextFill',
    'quadrantYAxisTextFill',
    'quadrantInternalBorderStrokeFill',
    'quadrantExternalBorderStrokeFill',
    'quadrantTitleFill',
    'fontFamily',
    'fontSize',
  ],
  requirementDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'requirementBackground',
    'requirementBorderColor',
    'requirementBorderSize',
    'requirementTextColor',
    'relationColor',
    'relationLabelBackground',
    'relationLabelColor',
    'fontFamily',
    'fontSize',
  ],
  timeline: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'fontFamily',
    'fontSize',
  ],
  sankey: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'fontFamily',
    'fontSize',
  ],
  xyChart: ['background', 'primaryTextColor', 'xyChart', 'fontFamily', 'fontSize'],
  packetDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'fontFamily',
    'fontSize',
  ],
  kanban: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'fontFamily',
    'fontSize',
  ],
  architectureDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'archEdgeColor',
    'archEdgeArrowColor',
    'archEdgeWidth',
    'archGroupBorderColor',
    'archGroupBorderWidth',
    'fontFamily',
    'fontSize',
  ],
  // Union-membership forces this Record key (compiler-required data entry only);
  // it routes usecase into the EXISTING derivation path — both
  // deriveThemeVariablesForDiagramType and applyThemeToFrontmatter filter
  // through this one map. No derivation formula or engine change.
  usecaseDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'textColor',
    'primaryBorderColor',
    'nodeBkg',
    'mainBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    'defaultLinkColor',
    'titleColor',
    'edgeLabelBackground',
    'fontFamily',
    'fontSize',
  ],
  zenuml: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'fontFamily',
    'fontSize',
  ],
  blockDiagram: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'fontFamily',
    'fontSize',
  ],
  c4: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'fontFamily',
    'fontSize',
  ],
  ishikawa: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'mainBkg',
    'primaryTextColor',
    'textColor',
    'fontFamily',
    'fontSize',
  ],
  radar: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'textColor',
    'titleColor',
    'radar',
    'cScale0',
    'cScale1',
    'cScale2',
    'cScale3',
    'cScale4',
    'cScale5',
    'cScale6',
    'cScale7',
    'cScale8',
    'cScale9',
    'cScale10',
    'cScale11',
    'fontFamily',
    'fontSize',
  ],
  treemap: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'textColor',
    'titleColor',
    'cScale0',
    'cScale1',
    'cScale2',
    'cScale3',
    'cScale4',
    'cScale5',
    'cScale6',
    'cScale7',
    'cScale8',
    'cScale9',
    'cScale10',
    'cScale11',
    'cScalePeer0',
    'cScalePeer1',
    'cScalePeer2',
    'cScalePeer3',
    'cScalePeer4',
    'cScalePeer5',
    'cScalePeer6',
    'cScalePeer7',
    'cScalePeer8',
    'cScalePeer9',
    'cScalePeer10',
    'cScalePeer11',
    'cScaleLabel0',
    'cScaleLabel1',
    'cScaleLabel2',
    'cScaleLabel3',
    'cScaleLabel4',
    'cScaleLabel5',
    'cScaleLabel6',
    'cScaleLabel7',
    'cScaleLabel8',
    'cScaleLabel9',
    'cScaleLabel10',
    'cScaleLabel11',
    'fontFamily',
    'fontSize',
  ],
  eventmodeling: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'textColor',
    'emUiFill',
    'emUiStroke',
    'emProcessorFill',
    'emProcessorStroke',
    'emReadModelFill',
    'emReadModelStroke',
    'emCommandFill',
    'emCommandStroke',
    'emEventFill',
    'emEventStroke',
    'emRelationStroke',
    'emSwimlaneBackgroundOdd',
    'emSwimlaneBackgroundStroke',
    'emArrowhead',
    'fontFamily',
    'fontSize',
  ],
  venn: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'primaryTextColor',
    'textColor',
    'titleColor',
    'venn1',
    'venn2',
    'venn3',
    'venn4',
    'venn5',
    'venn6',
    'venn7',
    'venn8',
    'vennTitleTextColor',
    'vennSetTextColor',
    'fontFamily',
    'fontSize',
  ],
  treeView: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'textColor',
    'fontFamily',
    'fontSize',
  ],
  wardley: [
    'background',
    'lineColor',
    'primaryTextColor',
    'textColor',
    'wardley',
    'fontFamily',
    'fontSize',
  ],
  cynefin: [
    'background',
    'lineColor',
    'primaryTextColor',
    'textColor',
    'cynefin',
    'fontFamily',
    'fontSize',
  ],
  railroad: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'mainBkg',
    'secondBkg',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'titleColor',
    'labelBackground',
    'fontFamily',
    'fontSize',
  ],
  swimlane: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'nodeBkg',
    'mainBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    'defaultLinkColor',
    'edgeLabelBackground',
    'nodeTextColor',
    'flowContainerStroke',
    'fontFamily',
    'fontSize',
  ],
  agentflow: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'nodeBkg',
    'mainBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    'defaultLinkColor',
    'edgeLabelBackground',
    'nodeTextColor',
    'flowContainerStroke',
    'fontFamily',
    'fontSize',
  ],
  unknown: [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'background',
    'lineColor',
    'arrowheadColor',
    'primaryTextColor',
    'secondaryTextColor',
    'tertiaryTextColor',
    'textColor',
    'primaryBorderColor',
    'secondaryBorderColor',
    'tertiaryBorderColor',
    'nodeBkg',
    'mainBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    'fontFamily',
    'fontSize',
  ],
};

export const DEFAULT_LIGHT_THEME =
  builtinThemes.find(t => t.id === 'corporate-blue') ?? builtinThemes[0];
export const DEFAULT_DARK_THEME = builtinThemes.find(t => t.id === 'dark-tech') ?? builtinThemes[0];

export function mkBorder(col: string, darkMode: boolean): string {
  return darkMode ? adjustToHex(col, { s: -40, l: 10 }) : adjustToHex(col, { s: -40, l: -10 });
}

export function isDarkColor(color: string): boolean {
  try {
    return isDark(color);
  } catch {
    return false;
  }
}

export function deriveThemeVariablesForDiagramType(
  coreColors: ThemeCoreColors,
  darkMode: boolean,
  diagramType: DiagramType
): Record<string, unknown> {
  const allVars = deriveThemeVariables(coreColors, darkMode);
  const allowedVars = DIAGRAM_TYPE_VARIABLES[diagramType] || DIAGRAM_TYPE_VARIABLES.unknown;
  const allowedSet = new Set(allowedVars);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(allVars)) {
    if (key === 'darkMode') continue;
    if ((key === 'radar' || key === 'xyChart') && allowedSet.has(key)) {
      if (typeof value === 'string') {
        try {
          filtered[key] = JSON.parse(value);
        } catch {
          filtered[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = value;
      }
      continue;
    }
    if (typeof value !== 'string') continue;
    if (allowedSet.has(key)) {
      filtered[key] = value;
    }
  }

  if (diagramType === 'cynefin') {
    const contrastText = darkMode ? '#f1f5f9' : '#1f2937';
    const contrastLabel = darkMode ? '#f8fafc' : '#111827';
    filtered.textColor = contrastText;
    filtered.primaryTextColor = contrastLabel;
    filtered.cynefin = {
      domainFontSize: 16,
      itemFontSize: 12,
      boundaryColor: allVars.lineColor,
      boundaryWidth: 2,
      cliffColor: darkMode ? '#f87171' : '#8B0000',
      cliffWidth: 4,
      arrowColor: allVars.lineColor,
      arrowWidth: 2,
      complexBg: darkMode ? '#1B5E20' : '#E8F5E9',
      complicatedBg: darkMode ? '#0D47A1' : '#E3F2FD',
      chaoticBg: darkMode ? '#BF360C' : '#FBE9E7',
      clearBg: darkMode ? '#78350F' : '#FFF8E1',
      confusionBg: darkMode ? '#4A148C' : '#F3E5F5',
      textColor: contrastText,
      labelColor: contrastLabel,
    };
  } else if (diagramType === 'wardley') {
    filtered.wardley = {
      backgroundColor: allVars.background,
      axisColor: allVars.lineColor,
      axisTextColor: allVars.primaryTextColor,
      gridColor: darkMode ? '#334155' : '#cbd5e1',
      componentFill: allVars.background,
      componentStroke: allVars.lineColor,
      componentLabelColor: allVars.primaryTextColor,
      linkStroke: allVars.lineColor,
      evolutionStroke: darkMode ? '#f87171' : '#dc3545',
      annotationStroke: allVars.secondaryBorderColor ?? allVars.lineColor,
      annotationTextColor: allVars.primaryTextColor,
      annotationFill: allVars.primaryColor,
    };
  } else if (diagramType === 'eventmodeling') {
    if (darkMode) {
      filtered.textColor = '#f1f5f9';
      filtered.primaryTextColor = '#f1f5f9';
      filtered.emUiFill = '#1e293b';
      filtered.emUiStroke = '#64748b';
      filtered.emProcessorFill = '#4a1d59';
      filtered.emProcessorStroke = '#c084fc';
      filtered.emReadModelFill = '#2b4714';
      filtered.emReadModelStroke = '#84cc16';
      filtered.emCommandFill = '#1b3559';
      filtered.emCommandStroke = '#60a5fa';
      filtered.emEventFill = '#5c2d0c';
      filtered.emEventStroke = '#fb923c';
      filtered.emSwimlaneBackgroundOdd = '#161b26';
      filtered.emSwimlaneBackgroundStroke = '#334155';
    } else {
      filtered.textColor = '#1f2937';
      filtered.primaryTextColor = '#1f2937';
      filtered.emUiFill = '#ffffff';
      filtered.emUiStroke = '#cbd5e1';
      filtered.emProcessorFill = '#edb3f6';
      filtered.emProcessorStroke = '#b88cbf';
      filtered.emReadModelFill = '#d3f1a2';
      filtered.emReadModelStroke = '#a3b732';
      filtered.emCommandFill = '#bcd6fe';
      filtered.emCommandStroke = '#679ac3';
      filtered.emEventFill = '#ffb778';
      filtered.emEventStroke = '#c19a0f';
      filtered.emSwimlaneBackgroundOdd = '#f8fafc';
      filtered.emSwimlaneBackgroundStroke = '#e2e8f0';
    }
    filtered.emRelationStroke = allVars.lineColor;
    filtered.emArrowhead = allVars.lineColor;
  } else if (diagramType === 'railroad') {
    filtered.secondBkg = allVars.secondaryColor;
    filtered.labelBackground = allVars.background;
  } else if (diagramType === 'swimlane' || diagramType === 'agentflow') {
    filtered.flowContainerStroke = allVars.secondaryBorderColor ?? allVars.lineColor;
  }

  return filtered;
}

export function deriveThemeVariables(
  coreColors: ThemeCoreColors,
  darkMode: boolean
): Record<string, string> {
  const rawCore = coreColors as unknown as Record<string, unknown>;
  const initialRadar = rawCore.radar as Record<string, unknown> | undefined;
  const initialXyChart = rawCore.xyChart as Record<string, unknown> | undefined;

  const result: Record<string, string> = {};
  for (const key in rawCore) {
    if (!Object.prototype.hasOwnProperty.call(rawCore, key)) continue;
    if (key === 'darkMode' || key === 'radar' || key === 'xyChart') continue;
    const value = rawCore[key];
    if (value === undefined) continue;
    result[key] = typeof value === 'string' ? value : String(value);
  }

  const adjustHsl = (
    baseColor: string,
    baseHsl: readonly [number, number, number] | null,
    dh: number,
    ds: number,
    dl: number
  ): string =>
    baseHsl
      ? adjustParsedHslToHex(baseHsl, dh, ds, dl)
      : adjustToHex(baseColor, { h: dh, s: ds, l: dl });

  const primaryHsl = parseHexToHsl(result.primaryColor);
  result.secondaryColor =
    result.secondaryColor || adjustHsl(result.primaryColor, primaryHsl, -120, 0, 0);
  result.tertiaryColor =
    result.tertiaryColor || adjustHsl(result.primaryColor, primaryHsl, 180, 0, 5);
  const secondaryHsl = parseHexToHsl(result.secondaryColor);
  const tertiaryHsl = parseHexToHsl(result.tertiaryColor);
  const borderL = darkMode ? 10 : -10;
  result.primaryBorderColor =
    result.primaryBorderColor || adjustHsl(result.primaryColor, primaryHsl, 0, -40, borderL);
  result.secondaryBorderColor =
    result.secondaryBorderColor || adjustHsl(result.secondaryColor, secondaryHsl, 0, -40, borderL);
  result.tertiaryBorderColor =
    result.tertiaryBorderColor || adjustHsl(result.tertiaryColor, tertiaryHsl, 0, -40, borderL);
  result.noteBorderColor =
    result.noteBorderColor || mkBorder(result.noteBkgColor || '#fff5ad', darkMode);
  result.noteBkgColor = result.noteBkgColor || '#fff5ad';
  result.noteTextColor = result.noteTextColor || '#333';
  result.primaryTextColor = result.primaryTextColor || (darkMode ? '#eee' : '#333');
  result.secondaryTextColor = result.secondaryTextColor || invertToHex(result.secondaryColor);
  result.tertiaryTextColor = result.tertiaryTextColor || invertToHex(result.tertiaryColor);
  if (!result.lineColor || !result.arrowheadColor) {
    const invertedBackground = invertToHex(result.background);
    if (!result.lineColor) result.lineColor = invertedBackground;
    if (!result.arrowheadColor) result.arrowheadColor = invertedBackground;
  }
  result.textColor = result.textColor || result.primaryTextColor;
  result.border2 = result.border2 || result.tertiaryBorderColor;
  result.nodeBkg = result.nodeBkg || result.primaryColor;
  result.mainBkg = result.mainBkg || result.primaryColor;
  const mainBkgHsl =
    result.mainBkg === result.primaryColor ? primaryHsl : parseHexToHsl(result.mainBkg);
  result.nodeBorder = result.nodeBorder || result.primaryBorderColor;
  result.clusterBkg = result.clusterBkg || result.tertiaryColor;
  result.clusterBorder = result.clusterBorder || result.tertiaryBorderColor;
  result.defaultLinkColor = result.defaultLinkColor || result.lineColor;
  result.titleColor = result.titleColor || result.tertiaryTextColor;
  result.edgeLabelBackground = result.edgeLabelBackground || result.background;
  result.nodeTextColor = result.nodeTextColor || result.primaryTextColor;
  result.actorBorder = result.actorBorder || result.primaryBorderColor;
  result.actorBkg = result.actorBkg || result.mainBkg;
  result.actorTextColor = result.actorTextColor || result.primaryTextColor;
  result.actorLineColor = result.actorLineColor || result.actorBorder;
  result.labelBoxBkgColor = result.labelBoxBkgColor || result.actorBkg;
  result.signalColor = result.signalColor || result.lineColor;
  result.signalTextColor = result.signalTextColor || result.textColor || result.primaryTextColor;
  result.labelBoxBorderColor = result.labelBoxBorderColor || result.actorBorder;
  result.labelTextColor = result.labelTextColor || result.actorTextColor;
  result.loopTextColor = result.loopTextColor || result.actorTextColor;
  result.activationBorderColor =
    result.activationBorderColor || darkenToHex(result.secondaryColor, 10);
  result.activationBkgColor = result.activationBkgColor || result.secondaryColor;
  result.sequenceNumberColor = result.sequenceNumberColor || invertToHex(result.lineColor);
  result.sectionBkgColor = result.sectionBkgColor || result.secondaryColor;
  result.altSectionBkgColor = result.altSectionBkgColor || 'white';
  result.sectionBkgColor2 = result.sectionBkgColor2 || result.primaryColor;
  result.excludeBkgColor = result.excludeBkgColor || '#eeeeee';
  result.taskBorderColor = result.taskBorderColor || result.primaryBorderColor;
  result.taskBkgColor = result.taskBkgColor || result.primaryColor;
  result.activeTaskBorderColor = result.activeTaskBorderColor || result.primaryColor;
  result.activeTaskBkgColor = result.activeTaskBkgColor || lightenToHex(result.primaryColor, 23);
  result.gridColor = result.gridColor || 'lightgrey';
  result.doneTaskBkgColor = result.doneTaskBkgColor || 'lightgrey';
  result.doneTaskBorderColor = result.doneTaskBorderColor || 'grey';
  result.critBorderColor = result.critBorderColor || '#ff8888';
  result.critBkgColor = result.critBkgColor || 'red';
  result.todayLineColor = result.todayLineColor || 'red';
  result.vertLineColor = result.vertLineColor || 'navy';
  result.taskTextColor = result.taskTextColor || result.textColor;
  result.taskTextOutsideColor = result.taskTextOutsideColor || result.textColor;
  result.taskTextLightColor = result.taskTextLightColor || result.textColor;
  result.taskTextDarkColor = result.taskTextDarkColor || result.textColor;
  result.taskTextClickableColor = result.taskTextClickableColor || '#003163';
  result.personBorder = result.personBorder || result.primaryBorderColor;
  result.personBkg = result.personBkg || result.mainBkg;
  if (darkMode) {
    result.rowOdd = result.rowOdd || darkenToHex(result.mainBkg, 5) || '#ffffff';
    result.rowEven = result.rowEven || darkenToHex(result.mainBkg, 10);
  } else {
    result.rowOdd = result.rowOdd || lightenToHex(result.mainBkg, 75) || '#ffffff';
    result.rowEven = result.rowEven || lightenToHex(result.mainBkg, 5);
  }
  result.transitionColor = result.transitionColor || result.lineColor;
  result.transitionLabelColor = result.transitionLabelColor || result.textColor;
  result.stateLabelColor = result.stateLabelColor || result.stateBkg || result.primaryTextColor;
  result.stateBkg = result.stateBkg || result.mainBkg;
  result.labelBackgroundColor = result.labelBackgroundColor || result.stateBkg;
  result.compositeBackground =
    result.compositeBackground || result.background || result.tertiaryColor;
  result.altBackground = result.altBackground || result.tertiaryColor;
  result.compositeTitleBackground = result.compositeTitleBackground || result.mainBkg;
  result.compositeBorder = result.compositeBorder || result.nodeBorder;
  result.innerEndBackground = result.nodeBorder;
  result.errorBkgColor = result.errorBkgColor || result.tertiaryColor;
  result.errorTextColor = result.errorTextColor || result.tertiaryTextColor;
  result.specialStateColor = result.lineColor;
  result.cScale0 = result.cScale0 || result.primaryColor;
  result.cScale1 = result.cScale1 || result.secondaryColor;
  result.cScale2 = result.cScale2 || result.tertiaryColor;
  result.cScale3 = result.cScale3 || adjustHsl(result.primaryColor, primaryHsl, 30, 0, 0);
  result.cScale4 = result.cScale4 || adjustHsl(result.primaryColor, primaryHsl, 60, 0, 0);
  result.cScale5 = result.cScale5 || adjustHsl(result.primaryColor, primaryHsl, 90, 0, 0);
  result.cScale6 = result.cScale6 || adjustHsl(result.primaryColor, primaryHsl, 120, 0, 0);
  result.cScale7 = result.cScale7 || adjustHsl(result.primaryColor, primaryHsl, 150, 0, 0);
  result.cScale8 = result.cScale8 || adjustHsl(result.primaryColor, primaryHsl, 210, 0, 150);
  result.cScale9 = result.cScale9 || adjustHsl(result.primaryColor, primaryHsl, 270, 0, 0);
  result.cScale10 = result.cScale10 || adjustHsl(result.primaryColor, primaryHsl, 300, 0, 0);
  result.cScale11 = result.cScale11 || adjustHsl(result.primaryColor, primaryHsl, 330, 0, 0);
  const cScaleDarken = darkMode ? 75 : 25;
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    const key = 'cScale' + i;
    result[key] = darkenToHex(result[key], cScaleDarken);
  }
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    result['cScaleInv' + i] = result['cScaleInv' + i] || invertToHex(result['cScale' + i]);
  }
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    const key = 'cScale' + i;
    const peerKey = 'cScalePeer' + i;
    result[peerKey] =
      result[peerKey] ||
      (darkMode ? lightenToHex(result[key], 10) : darkenToHex(result[key], 10));
  }
  result.scaleLabelColor = result.scaleLabelColor || result.labelTextColor;
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    result['cScaleLabel' + i] = result['cScaleLabel' + i] || result.scaleLabelColor;
  }
  const multiplier = darkMode ? -4 : -1;
  for (let i = 0; i < 5; i++) {
    const surfaceKey = 'surface' + i;
    const surfacePeerKey = 'surfacePeer' + i;
    result[surfaceKey] =
      result[surfaceKey] || adjustHsl(result.mainBkg, mainBkgHsl, 180, -15, multiplier * (5 + i * 3));
    result[surfacePeerKey] =
      result[surfacePeerKey] ||
      adjustHsl(result.mainBkg, mainBkgHsl, 180, -15, multiplier * (8 + i * 3));
  }
  result.classText = result.classText || result.textColor;
  result.fillType0 = result.fillType0 || result.primaryColor;
  result.fillType1 = result.fillType1 || result.secondaryColor;
  result.fillType2 = result.fillType2 || adjustHsl(result.primaryColor, primaryHsl, 64, 0, 0);
  result.fillType3 = result.fillType3 || adjustHsl(result.secondaryColor, secondaryHsl, 64, 0, 0);
  result.fillType4 = result.fillType4 || adjustHsl(result.primaryColor, primaryHsl, -64, 0, 0);
  result.fillType5 = result.fillType5 || adjustHsl(result.secondaryColor, secondaryHsl, -64, 0, 0);
  result.fillType6 = result.fillType6 || adjustHsl(result.primaryColor, primaryHsl, 128, 0, 0);
  result.fillType7 = result.fillType7 || adjustHsl(result.secondaryColor, secondaryHsl, 128, 0, 0);
  result.pie1 = result.pie1 || result.primaryColor;
  result.pie2 = result.pie2 || result.secondaryColor;
  result.pie3 = result.pie3 || result.tertiaryColor;
  result.pie4 = result.pie4 || adjustHsl(result.primaryColor, primaryHsl, 0, 0, -10);
  result.pie5 = result.pie5 || adjustHsl(result.secondaryColor, secondaryHsl, 0, 0, -10);
  result.pie6 = result.pie6 || adjustHsl(result.tertiaryColor, tertiaryHsl, 0, 0, -10);
  result.pie7 = result.pie7 || adjustHsl(result.primaryColor, primaryHsl, 60, 0, -10);
  result.pie8 = result.pie8 || adjustHsl(result.primaryColor, primaryHsl, -60, 0, -10);
  result.pie9 = result.pie9 || adjustHsl(result.primaryColor, primaryHsl, 120, 0, 0);
  result.pie10 = result.pie10 || adjustHsl(result.primaryColor, primaryHsl, 60, 0, -20);
  result.pie11 = result.pie11 || adjustHsl(result.primaryColor, primaryHsl, -60, 0, -20);
  result.pie12 = result.pie12 || adjustHsl(result.primaryColor, primaryHsl, 120, 0, -10);
  result.pieTitleTextSize = result.pieTitleTextSize || '25px';
  result.pieTitleTextColor = result.pieTitleTextColor || result.taskTextDarkColor;
  result.pieSectionTextSize = result.pieSectionTextSize || '17px';
  result.pieSectionTextColor = result.pieSectionTextColor || result.textColor;
  result.pieLegendTextSize = result.pieLegendTextSize || '17px';
  result.pieLegendTextColor = result.pieLegendTextColor || result.taskTextDarkColor;
  result.pieStrokeColor = result.pieStrokeColor || 'black';
  result.pieStrokeWidth = result.pieStrokeWidth || '2px';
  result.pieOuterStrokeWidth = result.pieOuterStrokeWidth || '2px';
  result.pieOuterStrokeColor = result.pieOuterStrokeColor || 'black';
  result.pieOpacity = result.pieOpacity || '0.7';
  result.venn1 = result.venn1 ?? adjustHsl(result.primaryColor, primaryHsl, 0, 0, -30);
  result.venn2 = result.venn2 ?? adjustHsl(result.secondaryColor, secondaryHsl, 0, 0, -30);
  result.venn3 = result.venn3 ?? adjustHsl(result.tertiaryColor, tertiaryHsl, 0, 0, -30);
  result.venn4 = result.venn4 ?? adjustHsl(result.primaryColor, primaryHsl, 60, 0, -30);
  result.venn5 = result.venn5 ?? adjustHsl(result.primaryColor, primaryHsl, -60, 0, -30);
  result.venn6 = result.venn6 ?? adjustHsl(result.secondaryColor, secondaryHsl, 60, 0, -30);
  result.venn7 = result.venn7 ?? adjustHsl(result.primaryColor, primaryHsl, 120, 0, -30);
  result.venn8 = result.venn8 ?? adjustHsl(result.secondaryColor, secondaryHsl, 120, 0, -30);
  result.vennTitleTextColor = result.vennTitleTextColor ?? result.titleColor;
  result.vennSetTextColor = result.vennSetTextColor ?? result.textColor;
  result.radar = JSON.stringify({
    axisColor: initialRadar?.axisColor || result.lineColor,
    axisStrokeWidth: initialRadar?.axisStrokeWidth || 2,
    axisLabelFontSize: initialRadar?.axisLabelFontSize || 12,
    curveOpacity: initialRadar?.curveOpacity || 0.5,
    curveStrokeWidth: initialRadar?.curveStrokeWidth || 2,
    graticuleColor: initialRadar?.graticuleColor || '#DEDEDE',
    graticuleStrokeWidth: initialRadar?.graticuleStrokeWidth || 1,
    graticuleOpacity: initialRadar?.graticuleOpacity || 0.3,
    legendBoxSize: initialRadar?.legendBoxSize || 12,
    legendFontSize: initialRadar?.legendFontSize || 12,
  });
  result.archEdgeColor = result.archEdgeColor || '#777';
  result.archEdgeArrowColor = result.archEdgeArrowColor || '#777';
  result.archEdgeWidth = result.archEdgeWidth || '3';
  result.archGroupBorderColor = result.archGroupBorderColor || '#000';
  result.archGroupBorderWidth = result.archGroupBorderWidth || '2px';
  result.quadrant1Fill = result.quadrant1Fill || result.primaryColor;
  result.quadrant2Fill =
    result.quadrant2Fill || adjustToHex(result.primaryColor, { r: 5, g: 5, b: 5 });
  result.quadrant3Fill =
    result.quadrant3Fill || adjustToHex(result.primaryColor, { r: 10, g: 10, b: 10 });
  result.quadrant4Fill =
    result.quadrant4Fill || adjustToHex(result.primaryColor, { r: 15, g: 15, b: 15 });
  result.quadrant1TextFill = result.quadrant1TextFill || result.primaryTextColor;
  result.quadrant2TextFill =
    result.quadrant2TextFill || adjustToHex(result.primaryTextColor, { r: -5, g: -5, b: -5 });
  result.quadrant3TextFill =
    result.quadrant3TextFill || adjustToHex(result.primaryTextColor, { r: -10, g: -10, b: -10 });
  result.quadrant4TextFill =
    result.quadrant4TextFill || adjustToHex(result.primaryTextColor, { r: -15, g: -15, b: -15 });
  result.quadrantPointFill =
    result.quadrantPointFill ||
    (isDark(result.quadrant1Fill)
      ? lightenToHex(result.quadrant1Fill)
      : darkenToHex(result.quadrant1Fill));
  result.quadrantPointTextFill = result.quadrantPointTextFill || result.primaryTextColor;
  result.quadrantXAxisTextFill = result.quadrantXAxisTextFill || result.primaryTextColor;
  result.quadrantYAxisTextFill = result.quadrantYAxisTextFill || result.primaryTextColor;
  result.quadrantInternalBorderStrokeFill =
    result.quadrantInternalBorderStrokeFill || result.primaryBorderColor;
  result.quadrantExternalBorderStrokeFill =
    result.quadrantExternalBorderStrokeFill || result.primaryBorderColor;
  result.quadrantTitleFill = result.quadrantTitleFill || result.primaryTextColor;
  result.xyChart = JSON.stringify({
    backgroundColor: initialXyChart?.backgroundColor || result.background,
    titleColor: initialXyChart?.titleColor || result.primaryTextColor,
    xAxisTitleColor: initialXyChart?.xAxisTitleColor || result.primaryTextColor,
    xAxisLabelColor: initialXyChart?.xAxisLabelColor || result.primaryTextColor,
    xAxisTickColor: initialXyChart?.xAxisTickColor || result.primaryTextColor,
    xAxisLineColor: initialXyChart?.xAxisLineColor || result.primaryTextColor,
    yAxisTitleColor: initialXyChart?.yAxisTitleColor || result.primaryTextColor,
    yAxisLabelColor: initialXyChart?.yAxisLabelColor || result.primaryTextColor,
    yAxisTickColor: initialXyChart?.yAxisTickColor || result.primaryTextColor,
    yAxisLineColor: initialXyChart?.yAxisLineColor || result.primaryTextColor,
    plotColorPalette:
      '#FFF4DD,#FFD8B1,#FFA07A,#ECEFF1,#D6DBDF,#C3E0A8,#FFB6A4,#FFD74D,#738FA7,#FFFFF0',
  });
  result.requirementBackground = result.requirementBackground || result.primaryColor;
  result.requirementBorderColor = result.requirementBorderColor || result.primaryBorderColor;
  result.requirementBorderSize = result.requirementBorderSize || '1';
  result.requirementTextColor = result.requirementTextColor || result.primaryTextColor;
  result.relationColor = result.relationColor || result.lineColor;
  result.relationLabelBackground =
    result.relationLabelBackground ||
    (darkMode ? darkenToHex(result.secondaryColor, 30) : result.secondaryColor);
  result.relationLabelColor = result.relationLabelColor || result.actorTextColor;
  result.git0 = result.git0 || result.primaryColor;
  result.git1 = result.git1 || result.secondaryColor;
  result.git2 = result.git2 || result.tertiaryColor;
  result.git3 = result.git3 || adjustHsl(result.primaryColor, primaryHsl, -30, 0, 0);
  result.git4 = result.git4 || adjustHsl(result.primaryColor, primaryHsl, -60, 0, 0);
  result.git5 = result.git5 || adjustHsl(result.primaryColor, primaryHsl, -90, 0, 0);
  result.git6 = result.git6 || adjustHsl(result.primaryColor, primaryHsl, 60, 0, 0);
  result.git7 = result.git7 || adjustHsl(result.primaryColor, primaryHsl, 120, 0, 0);
  if (darkMode) {
    for (let i = 0; i < 8; i++) result['git' + i] = lightenToHex(result['git' + i], 25);
  } else {
    for (let i = 0; i < 8; i++) result['git' + i] = darkenToHex(result['git' + i], 25);
  }
  for (let i = 0; i < 8; i++) {
    result['gitInv' + i] = result['gitInv' + i] || invertToHex(result['git' + i]);
  }
  result.branchLabelColor = result.branchLabelColor || (darkMode ? 'black' : result.labelTextColor);
  for (let i = 0; i < 8; i++) {
    result['gitBranchLabel' + i] = result['gitBranchLabel' + i] || result.branchLabelColor;
  }
  result.tagLabelColor = result.tagLabelColor || result.primaryTextColor;
  result.tagLabelBackground = result.tagLabelBackground || result.primaryColor;
  result.tagLabelBorder = result.tagBorder || result.primaryBorderColor;
  result.tagLabelFontSize = result.tagLabelFontSize || '10px';
  result.commitLabelColor = result.commitLabelColor || result.secondaryTextColor;
  result.commitLabelBackground = result.commitLabelBackground || result.secondaryColor;
  result.commitLabelFontSize = result.commitLabelFontSize || '10px';
  result.attributeBackgroundColorOdd = result.attributeBackgroundColorOdd || result.primaryColor;
  result.attributeBackgroundColorEven =
    result.attributeBackgroundColorEven || adjustHsl(result.primaryColor, primaryHsl, 60, 0, -10);
  return result;
}

const THEME_COMMENT_RE = /%% @theme (\S+)\n?/m;

// Variables applyThemeToFrontmatter derives from a theme's coreColors and
// exempts from its clean-YAML strip (they exist so manual edits survive a
// re-apply). That same exemption means a theme SWITCH must drop them
// explicitly: otherwise the previous apply's values are seen as "existing
// manual changes" and only recomputed "if missing" — the old theme's colors
// leak into the new theme's render (nodes/arrows stayed on the old palette).
const THEME_DERIVED_KEYS = new Set([
  'arrowheadColor',
  'signalColor',
  'signalTextColor',
  'labelBoxBkgColor',
  'labelBoxBorderColor',
  'nodeBkg',
  'nodeBorder',
  'clusterBkg',
  'clusterBorder',
]);

export function extractThemeIdFromContent(content: string): string | null {
  const match = content.match(THEME_COMMENT_RE);
  return match ? match[1] : null;
}

export function injectThemeComment(content: string, themeId: string | null): string {
  const cleaned = content.replace(THEME_COMMENT_RE, '');
  if (!themeId) return cleaned;
  const comment = `%% @theme ${themeId}\n`;
  const yamlMatch = cleaned.match(/^(\s*---[\s\S]*?---\s*\n)/);
  if (yamlMatch) return cleaned.replace(yamlMatch[1], `$1${comment}`);
  return `${comment}${cleaned}`;
}

function formatYamlKey(key: string): string {
  if (/^[\w.-]+$/.test(key)) return key;
  return `'${key.replace(/'/g, "''")}'`;
}

export function objectToYaml(obj: Record<string, any>, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const yamlKey = formatYamlKey(key);
    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${yamlKey}:\n${objectToYaml(value, indent + 2)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${yamlKey}:\n${spaces}  - ${value.join('\n' + spaces + '  - ')}\n`;
    } else if (typeof value === 'string') {
      if (value.includes('\n') || value.includes('\r')) {
        result += `${spaces}${yamlKey}: ${JSON.stringify(value)}\n`;
      } else {
        result += `${spaces}${yamlKey}: '${value.replace(/'/g, "''")}'\n`;
      }
    } else {
      result += `${spaces}${yamlKey}: ${value}\n`;
    }
  }
  return result;
}

type YamlScalar = string | number | boolean;

interface YamlConfig {
  [key: string]: YamlScalar | YamlConfig | undefined;
}

function parseYamlScalar(raw: string): YamlScalar {
  const trimmed = raw.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') return parsed;
    } catch {
      // Fall through to raw unquoted slice for non-JSON double-quoted YAML escapes
    }
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;
  }
  return trimmed;
}

function parseYamlConfig(text: string): YamlConfig {
  const result: YamlConfig = {};
  const lines = text.split('\n');
  const stack: Array<{ obj: YamlConfig; indent: number }> = [{ obj: result, indent: -1 }];
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---')) continue;
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const current = stack[stack.length - 1].obj;
    const kvMatch = trimmed.match(/^(?:'((?:''|[^'])*)'|"((?:\\.|[^"\\])*)"|([^:]+?)):(?:\s+(.*))?$/);
    if (!kvMatch) continue;
    let key: string;
    if (kvMatch[1] !== undefined) {
      key = kvMatch[1].replace(/''/g, "'");
    } else if (kvMatch[2] !== undefined) {
      try {
        key = String(JSON.parse(`"${kvMatch[2]}"`));
      } catch {
        key = kvMatch[2];
      }
    } else {
      key = kvMatch[3].trim();
    }
    if (!key) continue;
    const rest = kvMatch[4]?.trim() ?? '';
    if (rest === '') {
      const newSection: YamlConfig = {};
      current[key] = newSection;
      stack.push({ obj: newSection, indent });
    } else {
      current[key] = parseYamlScalar(rest);
    }
  }
  return result;
}

function parseFrontmatterBlock(yamlContent: string): {
  config: YamlConfig;
  siblings: YamlConfig;
} {
  const root = parseYamlConfig(yamlContent);
  const siblings: YamlConfig = {};
  let config: YamlConfig = {};
  for (const [key, value] of Object.entries(root)) {
    if (key === 'config' && value && typeof value === 'object') {
      config = { ...(value as YamlConfig) };
    } else if (key !== 'config' && value !== undefined) {
      siblings[key] = value;
    }
  }
  return { config, siblings };
}

function serializeFrontmatter(
  siblings: Record<string, unknown>,
  config: Record<string, unknown>
): string {
  const hasSiblings = Object.keys(siblings).length > 0;
  const hasConfig = Object.keys(config).length > 0;
  if (!hasSiblings && !hasConfig) return '';
  let body = '';
  if (hasSiblings) {
    body += objectToYaml(siblings, 0);
  }
  if (hasConfig) {
    body += `config:\n${objectToYaml(config, 2)}`;
  }
  return `---\n${body}---\n`;
}

export function applyThemeToFrontmatter(
  content: string,
  theme: MermaidTheme,
  _darkMode: boolean
): string {
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const cleanBody = stripped.replace(THEME_COMMENT_RE, '');

  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  const layoutConfig: Record<string, unknown> = {};
  const existingThemeVars: any = {};
  let frontmatterSiblings: YamlConfig = {};
  if (frontmatterMatch) {
    try {
      const { config: parsed, siblings } = parseFrontmatterBlock(frontmatterMatch[1]);
      frontmatterSiblings = siblings;
      for (const [key, value] of Object.entries(parsed)) {
        if (key === 'themeVariables') {
          if (typeof value === 'object' && value !== null) {
            for (const [tvKey, tvValue] of Object.entries(value)) {
              existingThemeVars[tvKey] =
                typeof tvValue === 'object' && tvValue !== null
                  ? tvValue
                  : typeof tvValue === 'boolean'
                    ? tvValue
                    : String(tvValue);
            }
          }
        } else if (key !== 'theme') {
          layoutConfig[key] = value;
        }
      }
    } catch {
      // Silently ignore parsing errors
    }
  }

  // Native Mermaid 12.3 themes (THM-01): apply directly via config.theme without
  // injecting derived color overrides that would mask Mermaid's built-in palette.
  if (theme.isNativeMermaidTheme && theme.baseTheme) {
    const preservedNonColorVars: Record<string, unknown> = {};
    if (existingThemeVars.fontFamily) preservedNonColorVars.fontFamily = existingThemeVars.fontFamily;
    if (existingThemeVars.fontSize) preservedNonColorVars.fontSize = existingThemeVars.fontSize;
    if (typeof existingThemeVars.useGradient === 'boolean') {
      preservedNonColorVars.useGradient = existingThemeVars.useGradient;
    }
    const mergedConfig: Record<string, unknown> = {
      theme: theme.baseTheme,
      ...(Object.keys(preservedNonColorVars).length > 0
        ? { themeVariables: preservedNonColorVars }
        : {}),
      ...layoutConfig,
    };
    const yamlConfig = serializeFrontmatter(frontmatterSiblings, mergedConfig);
    return `${yamlConfig}\n%% @theme ${theme.id}\n${cleanBody}`;
  }

  // Theme switch: drop the previous apply's derived overrides so they are
  // recomputed from the NEW theme instead of surviving as if they were
  // manual edits (a real user edit made after the last apply lives outside
  // this key set and is still preserved by step 1).
  const prevThemeId = content.match(THEME_COMMENT_RE)?.[1];
  if (prevThemeId && prevThemeId !== theme.id) {
    for (const key of Object.keys(existingThemeVars)) {
      if (THEME_DERIVED_KEYS.has(key)) {
        delete existingThemeVars[key];
      }
    }
  }

  const diagramType = detectDiagramType(stripped);
  const allowedVars = new Set(
    DIAGRAM_TYPE_VARIABLES[diagramType] || DIAGRAM_TYPE_VARIABLES.unknown
  );

  // 1. Initialize with EXISTING variables to preserve manual changes
  const themeVariables: any = { ...existingThemeVars };

  // Remove any keys that don't belong in themeVariables
  for (const key of Object.keys(themeVariables)) {
    if (RESTRICTED_THEME_VARIABLES.has(key)) {
      delete themeVariables[key];
    }
  }

  // 2. Overwrite only with the new theme's core colors that are relevant
  for (const [key, value] of Object.entries(theme.coreColors)) {
    if (value && typeof value === 'string' && allowedVars.has(key)) {
      themeVariables[key] = value;
    }
  }

  // 3. Intelligent mapping for missing but critical diagram-specific variables
  // Always ensure arrowheadColor is set if the diagram type supports it
  if (allowedVars.has('arrowheadColor') && !themeVariables.arrowheadColor) {
    themeVariables.arrowheadColor =
      theme.coreColors.lineColor || themeVariables.lineColor || themeVariables.primaryColor;
  }

  const familyEssentialKeys = new Set<string>();
  const effectiveDark = _darkMode || isDarkColor(theme.coreColors.background);

  if (diagramType === 'sequence') {
    if (!themeVariables.signalColor)
      themeVariables.signalColor = theme.coreColors.lineColor || themeVariables.lineColor;
    if (!themeVariables.signalTextColor)
      themeVariables.signalTextColor =
        theme.coreColors.textColor || themeVariables.textColor || themeVariables.primaryTextColor;
    if (!themeVariables.labelBoxBkgColor)
      themeVariables.labelBoxBkgColor = theme.coreColors.background || themeVariables.background;
    if (!themeVariables.labelBoxBorderColor)
      themeVariables.labelBoxBorderColor =
        theme.coreColors.primaryColor || themeVariables.primaryColor;
    // `graph` source syntax is mapped to 'flowchart' by detectDiagramType, so a
    // 'graph' diagramType value can never occur here (the repaired type-check
    // gate flagged the comparison as having no overlap).
  } else if (diagramType === 'flowchart') {
    if (!themeVariables.nodeBkg)
      themeVariables.nodeBkg = theme.coreColors.primaryColor || themeVariables.primaryColor;
    if (!themeVariables.nodeBorder)
      themeVariables.nodeBorder =
        theme.coreColors.primaryBorderColor || themeVariables.primaryBorderColor;
    if (!themeVariables.clusterBkg)
      themeVariables.clusterBkg = theme.coreColors.tertiaryColor || themeVariables.tertiaryColor;
  } else if (
    diagramType === 'cynefin' ||
    diagramType === 'wardley' ||
    diagramType === 'radar' ||
    diagramType === 'eventmodeling'
  ) {
    const familyVars = deriveThemeVariablesForDiagramType(
      theme.coreColors,
      effectiveDark,
      diagramType
    );
    for (const [fk, fv] of Object.entries(familyVars)) {
      if (
        fk === diagramType ||
        fk.startsWith('em') ||
        ((diagramType === 'cynefin' || diagramType === 'eventmodeling') &&
          (fk === 'textColor' || fk === 'primaryTextColor'))
      ) {
        themeVariables[fk] = fv;
        familyEssentialKeys.add(fk);
      }
    }
  }

  // 4. Explicitly preserve/restore typography (safety)
  if (existingThemeVars.fontFamily) themeVariables.fontFamily = existingThemeVars.fontFamily;
  if (existingThemeVars.fontSize) themeVariables.fontSize = existingThemeVars.fontSize;

  // 4. Strip out any derived variables that might have been part of a previous 'mass dump'
  // but are NOT core colors of the current theme OR typography OR essential diagram-specific overrides.
  const coreKeys = new Set(Object.keys(theme.coreColors));
  const typographyKeys = new Set(['fontFamily', 'fontSize']);
  const essentialKeys = new Set([
    'signalColor',
    'signalTextColor',
    'arrowheadColor',
    'nodeBkg',
    'nodeBorder',
    'clusterBkg',
    'clusterBorder',
    ...familyEssentialKeys,
  ]);

  for (const key of Object.keys(themeVariables)) {
    if (
      !coreKeys.has(key) &&
      !typographyKeys.has(key) &&
      !essentialKeys.has(key) &&
      allowedVars.has(key)
    ) {
      // It's a derived variable that we want to strip to keep YAML clean
      delete themeVariables[key];
    }
  }

  const mergedConfig = {
    theme: theme.baseTheme ?? 'base',
    themeVariables,
    ...layoutConfig,
  };

  const yamlConfig = serializeFrontmatter(frontmatterSiblings, mergedConfig);
  return `${yamlConfig}\n%% @theme ${theme.id}\n${cleanBody}`;
}

export function removeThemeColorsFromFrontmatter(content: string): string {
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const cleanBody = stripped.replace(THEME_COMMENT_RE, '');
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  if (!frontmatterMatch) return cleanBody;

  const layoutConfig: any = {};
  const preservedThemeVars: any = {};
  let frontmatterSiblings: YamlConfig = {};

  try {
    const { config: parsed, siblings } = parseFrontmatterBlock(frontmatterMatch[1]);
    frontmatterSiblings = siblings;
    const diagramType = detectDiagramType(stripped);
    const derivedKeys = new Set(
      DIAGRAM_TYPE_VARIABLES[diagramType] || DIAGRAM_TYPE_VARIABLES.unknown
    );
    const typographyKeys = new Set(['fontFamily', 'fontSize']);

    for (const [key, value] of Object.entries(parsed)) {
      if (key === 'themeVariables' && typeof value === 'object' && value !== null) {
        for (const [tvKey, tvValue] of Object.entries(value)) {
          // Only preserve typography OR keys NOT in derived list AND NOT restricted
          if (
            typographyKeys.has(tvKey) ||
            (!derivedKeys.has(tvKey) && !RESTRICTED_THEME_VARIABLES.has(tvKey))
          ) {
            preservedThemeVars[tvKey] =
              typeof tvValue === 'object' && tvValue !== null ? tvValue : String(tvValue);
          }
        }
      } else if (key !== 'theme') {
        layoutConfig[key] = value;
      }
    }
  } catch {
    // Silently ignore parsing errors
  }

  const mergedConfig = {
    theme: 'base',
    themeVariables: preservedThemeVars,
    ...layoutConfig,
  };

  const yamlConfig = serializeFrontmatter(frontmatterSiblings, mergedConfig);
  return `${yamlConfig}\n${cleanBody}`;
}

/**
 * Remove font-size from all node-specific style and classDef directives ONLY if they match
 * the target global font size. This prevents unnecessary layout shifts.
 */
export function removeNodeFontSizeStyles(content: string, targetFontSize?: string): string {
  if (!targetFontSize) return content;

  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Handle style directives: style NODE fill:#fff,font-size:16px,...
    if (trimmed.startsWith('style ') && !trimmed.startsWith('styleDef ')) {
      const match = trimmed.match(/^style\s+(\S+)\s+(.+)$/);
      if (match) {
        const nodeId = match[1];
        const styleParts = match[2].split(',').filter(part => {
          const p = part.trim();
          if (p.startsWith('font-size:')) {
            const val = p.replace('font-size:', '').trim();
            // Only remove if it matches the new global font size
            return val !== targetFontSize;
          }
          return true;
        });

        if (styleParts.length > 0) {
          const indent = line.match(/^\s*/)?.[0] || '';
          result.push(`${indent}style ${nodeId} ${styleParts.join(',')}`);
        }
        continue;
      }
    }

    // 2. Handle classDef directives
    if (trimmed.startsWith('classDef ')) {
      const match = trimmed.match(/^classDef\s+(\S+)\s+(.+)$/);
      if (match) {
        const className = match[1];
        const styleParts = match[2].split(',').filter(part => {
          const p = part.trim();
          if (p.startsWith('font-size:')) {
            const val = p.replace('font-size:', '').trim();
            return val !== targetFontSize;
          }
          return true;
        });

        if (styleParts.length > 0) {
          const indent = line.match(/^\s*/)?.[0] || '';
          result.push(`${indent}classDef ${className} ${styleParts.join(',')}`);
        }
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

export function getSwatchColors(coreColors: ThemeCoreColors, darkMode: boolean): string[] {
  const result = [];
  result[0] =
    coreColors.lineColor ||
    (darkMode ? lightenToHex(coreColors.background, 40) : darkenToHex(coreColors.background, 40));
  result[1] = coreColors.primaryColor;
  result[2] = coreColors.secondaryColor || adjustToHex(coreColors.primaryColor, { h: -120 });
  result[3] = coreColors.background;
  result[4] = coreColors.successColor || adjustToHex(coreColors.primaryColor, { h: 120 });
  result[5] = coreColors.warningColor || adjustToHex(coreColors.primaryColor, { h: 45 });
  result[6] = coreColors.errorColor || adjustToHex(coreColors.primaryColor, { h: 0, s: 80 });
  result[7] = coreColors.infoColor || adjustToHex(coreColors.primaryColor, { h: 200 });
  return result;
}

export function applyC4FromTheme(content: string, theme: MermaidTheme): string {
  const cleaned = stripC4Directives(content);
  const body = cleaned.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const { primaryColor, background } = theme.coreColors;
  const secondary = theme.coreColors.secondaryColor || adjustToHex(primaryColor, { h: -120 });
  const tertiary = theme.coreColors.tertiaryColor || adjustToHex(primaryColor, { h: 180, l: 5 });
  const contrast = invertToHex(primaryColor);
  const directives = [
    `    UpdateElementStyle(person, $bgColor="${primaryColor}", $fontColor="${contrast}", $borderColor="${secondary}")`,
    `    UpdateElementStyle(system, $bgColor="${tertiary}", $fontColor="${contrast}", $borderColor="${primaryColor}")`,
    `    UpdateElementStyle(system_db, $bgColor="${secondary}", $fontColor="${contrast}", $borderColor="${primaryColor}")`,
    `    UpdateElementStyle(container, $bgColor="${secondary}", $fontColor="${contrast}", $borderColor="${primaryColor}")`,
    `    UpdateElementStyle(component, $bgColor="${background}", $fontColor="${contrast}", $borderColor="${secondary}")`,
    `    UpdateElementStyle(component_db, $bgColor="${background}", $fontColor="${contrast}", $borderColor="${secondary}")`,
    `    UpdateRelStyle(line, $lineColor="${secondary}", $textColor="${contrast}")`,
  ].join('\n');
  return body + '\n' + directives;
}

export function stripC4Directives(content: string): string {
  return content
    .replace(/^[ \t]*UpdateElementStyle\s*\([^)]*\)\s*$/gm, '')
    .replace(/^[ \t]*UpdateRelStyle\s*\([^)]*\)\s*$/gm, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export function stripThemeDirective(content: string): string {
  let cleaned = content;
  cleaned = cleaned.replace(/^\s*---[\s\S]*?---\s*/i, '');
  cleaned = cleaned.replace(/%%{init[\s\S]*?}%%/gi, '');
  cleaned = cleaned.replace(/^%% @theme \S+\n?/gm, '');
  cleaned = stripC4Directives(cleaned);
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  return cleaned;
}

export function applyStyleToContent(
  content: string,
  // Every option is applied conditionally, so callers may pass any subset —
  // the test suite and extractStyleOptionsFromContent (which returns a
  // Partial) both rely on that.
  styleOptions: Partial<DiagramStyleOptions>,
  darkMode: boolean = false
): string {
  let stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const diagramType = detectDiagramType(stripped);
  let hasChanges = false;

  // 1. Apply direction change
  if (styleOptions.direction) {
    const dirMatch = stripped.match(/^(flowchart|graph)\s+(TD|TB|BT|LR|RL)/im);
    if (dirMatch && dirMatch[2].toUpperCase() !== styleOptions.direction.toUpperCase()) {
      stripped = stripped.replace(
        /^(flowchart|graph)\s+(TD|TB|BT|LR|RL)/im,
        `$1 ${styleOptions.direction}`
      );
      hasChanges = true;
    }
  }

  // 2. Apply global edge styles using linkStyle default
  const edgeStyleUpdates: Record<string, string> = {};
  if (styleOptions.edgeStrokeWidth !== undefined)
    edgeStyleUpdates.strokeWidth = `${styleOptions.edgeStrokeWidth}px`;
  if (styleOptions.edgeStrokeColor !== undefined)
    edgeStyleUpdates.stroke = styleOptions.edgeStrokeColor;
  if (styleOptions.edgeOpacity !== undefined)
    edgeStyleUpdates.opacity = `${styleOptions.edgeOpacity}`;
  if (styleOptions.edgeFontSize !== undefined)
    edgeStyleUpdates.fontSize = `${styleOptions.edgeFontSize}px`;
  if (styleOptions.edgeDasharray !== undefined)
    edgeStyleUpdates.strokeDasharray = styleOptions.edgeDasharray;
  if (styleOptions.edgeLabelColor !== undefined)
    edgeStyleUpdates.color = styleOptions.edgeLabelColor;
  if (styleOptions.edgeLabelBackgroundColor !== undefined)
    edgeStyleUpdates.fill = styleOptions.edgeLabelBackgroundColor;
  if (styleOptions.edgeLabelOpacity !== undefined)
    edgeStyleUpdates.fillOpacity = `${styleOptions.edgeLabelOpacity}`;

  // Only apply linkStyle to supported diagram types
  const diagramsSupportingLinkStyle = [
    'flowchart',
    'graph',
    'journey',
    'blockDiagram',
    'architectureDiagram',
  ];

  if (
    Object.keys(edgeStyleUpdates).length > 0 &&
    diagramsSupportingLinkStyle.includes(diagramType)
  ) {
    const linkStyles = parseLinkStyles(stripped);
    const currentDefault: any = linkStyles.get('default') || {};

    let hasEdgeChanges = false;
    for (const [k, v] of Object.entries(edgeStyleUpdates)) {
      const currentVal = currentDefault[k];
      if (currentVal === v) continue;

      // Handle numeric comparisons (e.g. "2px" vs "2px", "1" vs "1.0")
      if (typeof v === 'string' && typeof currentVal === 'string') {
        const vNum = parseFloat(v);
        const curNum = parseFloat(currentVal);
        if (!isNaN(vNum) && !isNaN(curNum) && vNum === curNum) continue;
      }

      hasEdgeChanges = true;
      break;
    }

    if (hasEdgeChanges) {
      stripped = updateLinkStyle(stripped, 'default', { ...currentDefault, ...edgeStyleUpdates });
      hasChanges = true;
    }
  }

  // 3. Handle frontmatter/themeVariables (lossless sibling preservation)
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  let existingConfig: any = {};
  let existingSiblings: YamlConfig = {};
  if (frontmatterMatch) {
    try {
      const parsed = parseFrontmatterBlock(frontmatterMatch[1]);
      existingConfig = parsed.config;
      existingSiblings = parsed.siblings;
    } catch {
      // Silently ignore parsing errors
    }
  }

  const newConfig: any = { ...existingConfig };
  const newSiblings: YamlConfig = { ...existingSiblings };

  // Helper to ensure themeVariables exists
  const ensureThemeVariables = () => {
    if (!newConfig.themeVariables)
      newConfig.themeVariables = existingConfig.themeVariables
        ? { ...existingConfig.themeVariables }
        : {};

    // Clean up if it was accidentally populated with restricted keys
    for (const key of Object.keys(newConfig.themeVariables)) {
      if (RESTRICTED_THEME_VARIABLES.has(key)) {
        delete newConfig.themeVariables[key];
      }
    }
  };

  if (
    styleOptions.fontFamily &&
    existingConfig.themeVariables?.fontFamily !== styleOptions.fontFamily
  ) {
    ensureThemeVariables();
    newConfig.themeVariables.fontFamily = styleOptions.fontFamily;
    hasChanges = true;
  }

  if (styleOptions.fontSize) {
    const raw = String(styleOptions.fontSize);
    const normalized = raw.endsWith('px') ? raw : raw + 'px';
    if (existingConfig.themeVariables?.fontSize !== normalized) {
      ensureThemeVariables();
      newConfig.themeVariables.fontSize = normalized;
      hasChanges = true;
      stripped = removeNodeFontSizeStyles(stripped, normalized);
    }
  }

  if (
    styleOptions.primaryColor &&
    existingConfig.themeVariables?.primaryColor !== styleOptions.primaryColor
  ) {
    ensureThemeVariables();
    newConfig.themeVariables.primaryColor = styleOptions.primaryColor;
    hasChanges = true;
  }

  if (
    typeof styleOptions.useGradient === 'boolean' &&
    existingConfig.themeVariables?.useGradient !== styleOptions.useGradient
  ) {
    ensureThemeVariables();
    newConfig.themeVariables.useGradient = styleOptions.useGradient;
    hasChanges = true;
  }

  // Root-level Mermaid look (THM-02): 'neo' | 'classic' | 'handDrawn'.
  // Mermaid Wardley maps do not support handDrawn; ignore handDrawn on wardley.
  if (
    styleOptions.look === 'neo' ||
    styleOptions.look === 'classic' ||
    (styleOptions.look === 'handDrawn' && diagramType !== 'wardley')
  ) {
    if (newConfig.look !== styleOptions.look) {
      newConfig.look = styleOptions.look;
      hasChanges = true;
    }
  } else if (
    'look' in styleOptions &&
    styleOptions.look === undefined &&
    'look' in newConfig
  ) {
    delete newConfig.look;
    hasChanges = true;
  }

  // Root-level handDrawnSeed (integer >= 0)
  if (
    typeof styleOptions.handDrawnSeed === 'number' &&
    Number.isInteger(styleOptions.handDrawnSeed) &&
    styleOptions.handDrawnSeed >= 0 &&
    newConfig.handDrawnSeed !== styleOptions.handDrawnSeed
  ) {
    newConfig.handDrawnSeed = styleOptions.handDrawnSeed;
    hasChanges = true;
  } else if (
    'handDrawnSeed' in styleOptions &&
    styleOptions.handDrawnSeed === undefined &&
    'handDrawnSeed' in newConfig
  ) {
    delete newConfig.handDrawnSeed;
    hasChanges = true;
  }

  // Root-level themeCSS (THM-04): strip </style tag breakout attempts for SVG safety.
  if (typeof styleOptions.themeCSS === 'string') {
    const safeCss = styleOptions.themeCSS.replace(/<\/style/gi, '').trim();
    if (safeCss.length > 0 && newConfig.themeCSS !== safeCss) {
      newConfig.themeCSS = safeCss;
      hasChanges = true;
    } else if (safeCss.length === 0 && 'themeCSS' in newConfig) {
      delete newConfig.themeCSS;
      hasChanges = true;
    }
  } else if (
    'themeCSS' in styleOptions &&
    styleOptions.themeCSS === undefined &&
    'themeCSS' in newConfig
  ) {
    delete newConfig.themeCSS;
    hasChanges = true;
  }

  // Root-level Mermaid option: markdownAutoWrap (default true in Mermaid 12.3).
  if (typeof styleOptions.markdownAutoWrap === 'boolean') {
    if (newConfig.markdownAutoWrap !== styleOptions.markdownAutoWrap) {
      newConfig.markdownAutoWrap = styleOptions.markdownAutoWrap;
      hasChanges = true;
    }
    if (newConfig.flowchart && 'markdownAutoWrap' in newConfig.flowchart) {
      const cleanedFlowchart = { ...newConfig.flowchart };
      delete cleanedFlowchart.markdownAutoWrap;
      if (Object.keys(cleanedFlowchart).length === 0) {
        delete newConfig.flowchart;
      } else {
        newConfig.flowchart = cleanedFlowchart;
      }
      hasChanges = true;
    }
  }

  // 4. Diagram-specific config options
  // Same detectDiagramType mapping as above: 'graph' never occurs as a
  // diagramType value, so only 'flowchart' is compared here.
  if (diagramType === 'flowchart') {
    const flowchartCfg: any = { ...(newConfig.flowchart || {}) };
    let hasFlowchartChanges = false;

    if (styleOptions.curveStyle !== undefined && flowchartCfg.curve !== styleOptions.curveStyle) {
      flowchartCfg.curve = styleOptions.curveStyle;
      hasFlowchartChanges = true;
    }
    // Mermaid 12.3 flowchart.stepDuration is in seconds and accepts positive finite decimals (e.g. 0.5).
    if (
      typeof styleOptions.stepDuration === 'number' &&
      Number.isFinite(styleOptions.stepDuration) &&
      styleOptions.stepDuration > 0 &&
      flowchartCfg.stepDuration !== styleOptions.stepDuration
    ) {
      flowchartCfg.stepDuration = styleOptions.stepDuration;
      hasFlowchartChanges = true;
    } else if (
      'stepDuration' in styleOptions &&
      styleOptions.stepDuration === undefined &&
      'stepDuration' in flowchartCfg
    ) {
      delete flowchartCfg.stepDuration;
      hasFlowchartChanges = true;
    }
    if (
      typeof styleOptions.stepNumbers === 'boolean' &&
      flowchartCfg.stepNumbers !== styleOptions.stepNumbers
    ) {
      flowchartCfg.stepNumbers = styleOptions.stepNumbers;
      hasFlowchartChanges = true;
    }
    if (
      styleOptions.nodePadding !== undefined &&
      flowchartCfg.padding !== styleOptions.nodePadding
    ) {
      flowchartCfg.padding = styleOptions.nodePadding;
      hasFlowchartChanges = true;
    }
    if (
      styleOptions.nodeSpacing !== undefined &&
      flowchartCfg.nodeSpacing !== styleOptions.nodeSpacing
    ) {
      flowchartCfg.nodeSpacing = styleOptions.nodeSpacing;
      hasFlowchartChanges = true;
    }
    if (
      styleOptions.rankSpacing !== undefined &&
      flowchartCfg.rankSpacing !== styleOptions.rankSpacing
    ) {
      flowchartCfg.rankSpacing = styleOptions.rankSpacing;
      hasFlowchartChanges = true;
    }

    if (hasFlowchartChanges) {
      if (Object.keys(flowchartCfg).length === 0) {
        delete newConfig.flowchart;
      } else {
        newConfig.flowchart = flowchartCfg;
      }
      hasChanges = true;
    }
  } else if (diagramType === 'sequence') {
    const sequenceCfg: any = { ...(newConfig.sequence || {}) };
    let hasSequenceChanges = false;

    if (
      typeof styleOptions.actorMargin === 'number' &&
      Number.isFinite(styleOptions.actorMargin) &&
      sequenceCfg.actorMargin !== styleOptions.actorMargin
    ) {
      sequenceCfg.actorMargin = styleOptions.actorMargin;
      hasSequenceChanges = true;
    }
    if (
      typeof styleOptions.diagramMarginX === 'number' &&
      Number.isFinite(styleOptions.diagramMarginX) &&
      sequenceCfg.diagramMarginX !== styleOptions.diagramMarginX
    ) {
      sequenceCfg.diagramMarginX = styleOptions.diagramMarginX;
      hasSequenceChanges = true;
    }
    if (
      typeof styleOptions.diagramMarginY === 'number' &&
      Number.isFinite(styleOptions.diagramMarginY) &&
      sequenceCfg.diagramMarginY !== styleOptions.diagramMarginY
    ) {
      sequenceCfg.diagramMarginY = styleOptions.diagramMarginY;
      hasSequenceChanges = true;
    }
    // Mermaid SequenceDiagramConfig uses `width` and `height` for actor dimensions.
    if (
      typeof styleOptions.actorWidth === 'number' &&
      Number.isFinite(styleOptions.actorWidth) &&
      sequenceCfg.width !== styleOptions.actorWidth
    ) {
      sequenceCfg.width = styleOptions.actorWidth;
      hasSequenceChanges = true;
    }
    if (
      typeof styleOptions.actorHeight === 'number' &&
      Number.isFinite(styleOptions.actorHeight) &&
      sequenceCfg.height !== styleOptions.actorHeight
    ) {
      sequenceCfg.height = styleOptions.actorHeight;
      hasSequenceChanges = true;
    }
    if (
      typeof styleOptions.mirrorActors === 'boolean' &&
      sequenceCfg.mirrorActors !== styleOptions.mirrorActors
    ) {
      sequenceCfg.mirrorActors = styleOptions.mirrorActors;
      hasSequenceChanges = true;
    }

    if (hasSequenceChanges) {
      if (Object.keys(sequenceCfg).length === 0) {
        delete newConfig.sequence;
      } else {
        newConfig.sequence = sequenceCfg;
      }
      hasChanges = true;
    }
  } else if (diagramType === 'gantt') {
    const ganttCfg: any = { ...(newConfig.gantt || {}) };
    let hasGanttChanges = false;

    if (
      typeof styleOptions.barHeight === 'number' &&
      Number.isFinite(styleOptions.barHeight) &&
      ganttCfg.barHeight !== styleOptions.barHeight
    ) {
      ganttCfg.barHeight = styleOptions.barHeight;
      hasGanttChanges = true;
    }
    if (
      typeof styleOptions.barGap === 'number' &&
      Number.isFinite(styleOptions.barGap) &&
      ganttCfg.barGap !== styleOptions.barGap
    ) {
      ganttCfg.barGap = styleOptions.barGap;
      hasGanttChanges = true;
    }
    if (
      typeof styleOptions.topPadding === 'number' &&
      Number.isFinite(styleOptions.topPadding) &&
      ganttCfg.topPadding !== styleOptions.topPadding
    ) {
      ganttCfg.topPadding = styleOptions.topPadding;
      hasGanttChanges = true;
    }
    if (
      typeof styleOptions.leftPadding === 'number' &&
      Number.isFinite(styleOptions.leftPadding) &&
      ganttCfg.leftPadding !== styleOptions.leftPadding
    ) {
      ganttCfg.leftPadding = styleOptions.leftPadding;
      hasGanttChanges = true;
    }
    if (
      typeof styleOptions.axisFormat === 'string' &&
      styleOptions.axisFormat.length > 0 &&
      ganttCfg.axisFormat !== styleOptions.axisFormat
    ) {
      ganttCfg.axisFormat = styleOptions.axisFormat;
      hasGanttChanges = true;
    }

    if (hasGanttChanges) {
      if (Object.keys(ganttCfg).length === 0) {
        delete newConfig.gantt;
      } else {
        newConfig.gantt = ganttCfg;
      }
      hasChanges = true;
    }

    // Mermaid Gantt compact mode lives as a top-level frontmatter sibling (`displayMode: compact`).
    if (styleOptions.displayMode === 'compact' && newSiblings.displayMode !== 'compact') {
      newSiblings.displayMode = 'compact';
      hasChanges = true;
    } else if (
      'displayMode' in styleOptions &&
      styleOptions.displayMode === undefined &&
      'displayMode' in newSiblings
    ) {
      delete newSiblings.displayMode;
      hasChanges = true;
    }
  } else if (diagramType === 'swimlane') {
    const swimlaneCfg: any = { ...(newConfig.swimlane || {}) };
    let hasSwimlaneChanges = false;

    const normalizedLineHops =
      styleOptions.lineHops === true ? 'arc' : styleOptions.lineHops;
    if (
      (normalizedLineHops === 'arc' ||
        normalizedLineHops === 'gap' ||
        normalizedLineHops === false) &&
      swimlaneCfg.lineHops !== normalizedLineHops
    ) {
      swimlaneCfg.lineHops = normalizedLineHops;
      hasSwimlaneChanges = true;
    }
    if (
      typeof styleOptions.automaticLaneOrdering === 'boolean' &&
      swimlaneCfg.automaticLaneOrdering !== styleOptions.automaticLaneOrdering
    ) {
      swimlaneCfg.automaticLaneOrdering = styleOptions.automaticLaneOrdering;
      hasSwimlaneChanges = true;
    }

    if (hasSwimlaneChanges) {
      if (Object.keys(swimlaneCfg).length === 0) {
        delete newConfig.swimlane;
      } else {
        newConfig.swimlane = swimlaneCfg;
      }
      hasChanges = true;
    }
  } else if (diagramType === 'agentflow') {
    const agentflowCfg: Record<string, unknown> = { ...(newConfig.agentflow || {}) };
    let hasAgentflowChanges = false;
    const afNumericKeys: Array<[keyof DiagramStyleOptions, string]> = [
      ['nodeSpacing', 'nodeSpacing'],
      ['rankSpacing', 'rankSpacing'],
      ['wrappingWidth', 'wrappingWidth'],
      ['minNodeWidth', 'minNodeWidth'],
      ['diagramPadding', 'diagramPadding'],
    ];
    for (const [optKey, cfgKey] of afNumericKeys) {
      const val = styleOptions[optKey];
      if (typeof val === 'number' && Number.isFinite(val) && agentflowCfg[cfgKey] !== val) {
        agentflowCfg[cfgKey] = val;
        hasAgentflowChanges = true;
      } else if (optKey in styleOptions && val === undefined && cfgKey in agentflowCfg) {
        delete agentflowCfg[cfgKey];
        hasAgentflowChanges = true;
      }
    }
    if (hasAgentflowChanges) {
      if (Object.keys(agentflowCfg).length === 0) {
        delete newConfig.agentflow;
      } else {
        newConfig.agentflow = agentflowCfg;
      }
      hasChanges = true;
    }
  } else {
    // CFG-01 & CFG-02: Per-diagram Mermaid 12.3.0 config namespaces
    const syncSection = (
      sectionKey: string,
      mutate: (cfg: Record<string, unknown>) => boolean
    ) => {
      const existingSection =
        newConfig[sectionKey] && typeof newConfig[sectionKey] === 'object'
          ? (newConfig[sectionKey] as Record<string, unknown>)
          : {};
      const cfg: Record<string, unknown> = { ...existingSection };
      if (mutate(cfg)) {
        if (Object.keys(cfg).length === 0) {
          delete newConfig[sectionKey];
        } else {
          newConfig[sectionKey] = cfg;
        }
        hasChanges = true;
      }
    };

    const syncBool = (
      cfg: Record<string, unknown>,
      optKey: keyof DiagramStyleOptions,
      cfgKey: string
    ): boolean => {
      const val = styleOptions[optKey];
      if (typeof val === 'boolean' && cfg[cfgKey] !== val) {
        cfg[cfgKey] = val;
        return true;
      }
      if (optKey in styleOptions && val === undefined && cfgKey in cfg) {
        delete cfg[cfgKey];
        return true;
      }
      return false;
    };

    const syncNumber = (
      cfg: Record<string, unknown>,
      optKey: keyof DiagramStyleOptions,
      cfgKey: string,
      opts?: { min?: number; max?: number; integer?: boolean; exclusiveMin?: boolean }
    ): boolean => {
      const val = styleOptions[optKey];
      if (typeof val === 'number' && Number.isFinite(val)) {
        const minOk =
          opts?.min === undefined
            ? true
            : opts.exclusiveMin
              ? val > opts.min
              : val >= opts.min;
        const maxOk = opts?.max === undefined ? true : val <= opts.max;
        const intOk = opts?.integer ? Number.isInteger(val) : true;
        if (minOk && maxOk && intOk && cfg[cfgKey] !== val) {
          cfg[cfgKey] = val;
          return true;
        }
        return false;
      }
      if (optKey in styleOptions && val === undefined && cfgKey in cfg) {
        delete cfg[cfgKey];
        return true;
      }
      return false;
    };

    const syncEnum = (
      cfg: Record<string, unknown>,
      optKey: keyof DiagramStyleOptions,
      cfgKey: string,
      allowed: ReadonlySet<string>
    ): boolean => {
      const val = styleOptions[optKey];
      if (typeof val === 'string' && allowed.has(val) && cfg[cfgKey] !== val) {
        cfg[cfgKey] = val;
        return true;
      }
      if (optKey in styleOptions && val === undefined && cfgKey in cfg) {
        delete cfg[cfgKey];
        return true;
      }
      return false;
    };

    const syncString = (
      cfg: Record<string, unknown>,
      optKey: keyof DiagramStyleOptions,
      cfgKey: string
    ): boolean => {
      const val = styleOptions[optKey];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.length > 0 && cfg[cfgKey] !== trimmed) {
          cfg[cfgKey] = trimmed;
          return true;
        }
        if (trimmed.length === 0 && cfgKey in cfg) {
          delete cfg[cfgKey];
          return true;
        }
        return false;
      }
      if (optKey in styleOptions && val === undefined && cfgKey in cfg) {
        delete cfg[cfgKey];
        return true;
      }
      return false;
    };

    if (diagramType === 'pie') {
      const validLegendPos = new Set(['top', 'bottom', 'left', 'right', 'center']);
      syncSection('pie', cfg => {
        let changed = false;
        changed = syncNumber(cfg, 'donutHole', 'donutHole', { min: 0, max: 0.9 }) || changed;
        changed = syncEnum(cfg, 'legendPosition', 'legendPosition', validLegendPos) || changed;
        changed = syncString(cfg, 'highlightSlice', 'highlightSlice') || changed;
        changed = syncNumber(cfg, 'textPosition', 'textPosition', { min: 0, max: 1 }) || changed;
        return changed;
      });
    } else if (diagramType === 'xyChart') {
      syncSection('xyChart', cfg => {
        let changed = false;
        changed = syncBool(cfg, 'showDataLabel', 'showDataLabel') || changed;
        changed = syncBool(cfg, 'showDataLabelOutsideBar', 'showDataLabelOutsideBar') || changed;
        return changed;
      });
    } else if (diagramType === 'sankey') {
      const validLabelStyle = new Set(['legacy', 'outlined']);
      const validAlign = new Set(['left', 'right', 'center', 'justify']);
      syncSection('sankey', cfg => {
        let changed = false;
        changed = syncEnum(cfg, 'labelStyle', 'labelStyle', validLabelStyle) || changed;
        changed =
          syncNumber(cfg, 'sankeyNodeWidth', 'nodeWidth', { min: 0, exclusiveMin: true }) || changed;
        changed = syncNumber(cfg, 'sankeyNodePadding', 'nodePadding', { min: 0 }) || changed;
        changed = syncString(cfg, 'linkColor', 'linkColor') || changed;
        changed = syncEnum(cfg, 'nodeAlignment', 'nodeAlignment', validAlign) || changed;
        changed = syncBool(cfg, 'showValues', 'showValues') || changed;

        if ('nodeColors' in styleOptions) {
          const nextMap: Record<string, string> = {};
          if (styleOptions.nodeColors && typeof styleOptions.nodeColors === 'object') {
            for (const [k, v] of Object.entries(styleOptions.nodeColors)) {
              const nk = k.trim();
              const nv = typeof v === 'string' ? v.trim() : '';
              if (nk && nv) nextMap[nk] = nv;
            }
          }
          const prevMap =
            cfg.nodeColors && typeof cfg.nodeColors === 'object'
              ? (cfg.nodeColors as Record<string, unknown>)
              : undefined;
          const nextKeys = Object.keys(nextMap);
          if (nextKeys.length === 0) {
            if ('nodeColors' in cfg) {
              delete cfg.nodeColors;
              changed = true;
            }
          } else {
            const prevKeys = prevMap ? Object.keys(prevMap) : [];
            const same =
              prevKeys.length === nextKeys.length &&
              nextKeys.every(k => prevMap && prevMap[k] === nextMap[k]);
            if (!same) {
              cfg.nodeColors = nextMap;
              changed = true;
            }
          }
        }
        return changed;
      });
    } else if (diagramType === 'mindmap') {
      const validColorBy = new Set(['branch', 'depth']);
      syncSection('mindmap', cfg => syncEnum(cfg, 'colorBy', 'colorBy', validColorBy));
    } else if (diagramType === 'classDiagram') {
      syncSection('class', cfg => {
        let changed = false;
        changed = syncBool(cfg, 'hierarchicalNamespaces', 'hierarchicalNamespaces') || changed;
        changed = syncBool(cfg, 'hideEmptyMembersBox', 'hideEmptyMembersBox') || changed;
        return changed;
      });
    } else if (diagramType === 'packetDiagram') {
      const validBitOrder = new Set(['ascending', 'descending']);
      syncSection('packet', cfg => {
        let changed = false;
        changed = syncEnum(cfg, 'bitOrder', 'bitOrder', validBitOrder) || changed;
        changed =
          syncNumber(cfg, 'bitsPerRow', 'bitsPerRow', { min: 1, integer: true }) || changed;
        changed = syncBool(cfg, 'showBits', 'showBits') || changed;
        return changed;
      });
    } else if (diagramType === 'architectureDiagram') {
      syncSection('architecture', cfg => {
        let changed = false;
        changed = syncBool(cfg, 'randomize', 'randomize') || changed;
        changed = syncNumber(cfg, 'seed', 'seed', { min: 0, integer: true }) || changed;
        changed =
          syncNumber(cfg, 'nodeSeparation', 'nodeSeparation', { min: 0, exclusiveMin: true }) ||
          changed;
        changed =
          syncNumber(cfg, 'idealEdgeLengthMultiplier', 'idealEdgeLengthMultiplier', {
            min: 0,
            exclusiveMin: true,
          }) || changed;
        changed =
          syncNumber(cfg, 'edgeElasticity', 'edgeElasticity', { min: 0, exclusiveMin: true }) ||
          changed;
        changed = syncNumber(cfg, 'numIter', 'numIter', { min: 1, integer: true }) || changed;
        return changed;
      });
    } else if (diagramType === 'c4') {
      syncSection('c4', cfg => syncBool(cfg, 'wrap', 'wrap'));
    } else if (diagramType === 'treeView') {
      syncSection('treeView', cfg => {
        let changed = false;
        changed = syncBool(cfg, 'showIcons', 'showIcons') || changed;
        changed = syncString(cfg, 'defaultIconPack', 'defaultIconPack') || changed;
        return changed;
      });
    } else if (diagramType === 'timeline') {
      syncSection('timeline', cfg => syncBool(cfg, 'disableMulticolor', 'disableMulticolor'));
    } else if (diagramType === 'gitGraph') {
      syncSection('gitGraph', cfg => {
        let changed = false;
        changed = syncBool(cfg, 'showBranches', 'showBranches') || changed;
        changed = syncBool(cfg, 'showCommitLabel', 'showCommitLabel') || changed;
        changed = syncBool(cfg, 'rotateCommitLabel', 'rotateCommitLabel') || changed;
        changed = syncBool(cfg, 'parallelCommits', 'parallelCommits') || changed;
        changed = syncString(cfg, 'mainBranchName', 'mainBranchName') || changed;
        return changed;
      });
    } else if (diagramType === 'kanban') {
      syncSection('kanban', cfg => syncString(cfg, 'ticketBaseUrl', 'ticketBaseUrl'));
    } else if (diagramType === 'treemap') {
      syncSection('treemap', cfg => {
        let changed = false;
        changed = syncBool(cfg, 'showValues', 'showValues') || changed;
        changed = syncString(cfg, 'valueFormat', 'valueFormat') || changed;
        changed = syncNumber(cfg, 'diagramPadding', 'diagramPadding', { min: 0 }) || changed;
        return changed;
      });
    }
  }

  // 4b. Layout engine & ELK options (LAY-01/02/03)
  // Applied across all ELK-capable diagram types without ever overriding swimlane's native layout.
  if (supportsElkLayout(diagramType)) {
    const requestedLayout = styleOptions.layoutEngine;
    if (requestedLayout) {
      const shouldWriteLayout =
        isElkLayoutEngine(requestedLayout) ||
        (requestedLayout === 'dagre' && (diagramType === 'flowchart' || 'layout' in existingConfig));
      if (shouldWriteLayout && newConfig.layout !== requestedLayout) {
        newConfig.layout = requestedLayout;
        hasChanges = true;
      }
    }

    const elkCfg: Record<string, unknown> = {
      ...(newConfig.elk && typeof newConfig.elk === 'object' ? newConfig.elk : {}),
    };
    let hasElkChanges = false;
    const validStrategies = new Set(['SIMPLE', 'NETWORK_SIMPLEX', 'LINEAR_SEGMENTS', 'BRANDES_KOEPF']);
    const validAlignments = new Set(['NONE', 'LEFTUP', 'LEFTDOWN', 'RIGHTUP', 'RIGHTDOWN', 'BALANCED']);
    const validPresets = new Set(['default', 'legacy', 'modelOrder', 'depthFirst']);

    if (typeof styleOptions.elkMergeEdges === 'boolean' && elkCfg.mergeEdges !== styleOptions.elkMergeEdges) {
      elkCfg.mergeEdges = styleOptions.elkMergeEdges;
      hasElkChanges = true;
    } else if ('elkMergeEdges' in styleOptions && styleOptions.elkMergeEdges === undefined && 'mergeEdges' in elkCfg) {
      delete elkCfg.mergeEdges;
      hasElkChanges = true;
    }

    if (
      typeof styleOptions.elkNodePlacementStrategy === 'string' &&
      validStrategies.has(styleOptions.elkNodePlacementStrategy) &&
      elkCfg.nodePlacementStrategy !== styleOptions.elkNodePlacementStrategy
    ) {
      elkCfg.nodePlacementStrategy = styleOptions.elkNodePlacementStrategy;
      hasElkChanges = true;
    } else if (
      'elkNodePlacementStrategy' in styleOptions &&
      styleOptions.elkNodePlacementStrategy === undefined &&
      'nodePlacementStrategy' in elkCfg
    ) {
      delete elkCfg.nodePlacementStrategy;
      hasElkChanges = true;
    }

    if (
      typeof styleOptions.elkNodePlacementAlignment === 'string' &&
      validAlignments.has(styleOptions.elkNodePlacementAlignment) &&
      elkCfg.nodePlacementAlignment !== styleOptions.elkNodePlacementAlignment
    ) {
      elkCfg.nodePlacementAlignment = styleOptions.elkNodePlacementAlignment;
      hasElkChanges = true;
    } else if (
      'elkNodePlacementAlignment' in styleOptions &&
      styleOptions.elkNodePlacementAlignment === undefined &&
      'nodePlacementAlignment' in elkCfg
    ) {
      delete elkCfg.nodePlacementAlignment;
      hasElkChanges = true;
    }

    if (
      typeof styleOptions.elkPreset === 'string' &&
      validPresets.has(styleOptions.elkPreset) &&
      elkCfg.preset !== styleOptions.elkPreset
    ) {
      elkCfg.preset = styleOptions.elkPreset;
      hasElkChanges = true;
    } else if ('elkPreset' in styleOptions && styleOptions.elkPreset === undefined && 'preset' in elkCfg) {
      delete elkCfg.preset;
      hasElkChanges = true;
    }

    if (hasElkChanges) {
      if (Object.keys(elkCfg).length === 0) {
        delete newConfig.elk;
      } else {
        newConfig.elk = elkCfg;
      }
      hasChanges = true;
    }
  } else if (supportsTidyTreeLayout(diagramType)) {
    const requestedLayout = styleOptions.layoutEngine;
    if (
      (requestedLayout === 'tidy-tree' || requestedLayout === 'cose-bilkent') &&
      newConfig.layout !== requestedLayout
    ) {
      newConfig.layout = requestedLayout;
      hasChanges = true;
    } else if (
      'layoutEngine' in styleOptions &&
      styleOptions.layoutEngine === undefined &&
      'layout' in newConfig
    ) {
      delete newConfig.layout;
      hasChanges = true;
    }
  }

  // Only proceed if there are changes
  const themeVars = newConfig.themeVariables;
  const hasThemeVars = themeVars && Object.keys(themeVars).length > 0;
  const hasSiblings = Object.keys(newSiblings).length > 0;
  if (
    !hasChanges &&
    !hasThemeVars &&
    !hasSiblings &&
    !newConfig.flowchart &&
    !newConfig.sequence &&
    !newConfig.gantt &&
    !newConfig.swimlane &&
    !newConfig.agentflow &&
    !newConfig.pie &&
    !newConfig.xyChart &&
    !newConfig.sankey &&
    !newConfig.mindmap &&
    !newConfig.class &&
    !newConfig.packet &&
    !newConfig.architecture &&
    !newConfig.c4 &&
    !newConfig.treeView &&
    !newConfig.timeline &&
    !newConfig.gitGraph &&
    !newConfig.kanban &&
    !newConfig.treemap &&
    !newConfig.elk &&
    !newConfig.layout &&
    !newConfig.look &&
    newConfig.handDrawnSeed === undefined &&
    !newConfig.themeCSS &&
    newConfig.markdownAutoWrap === undefined
  ) {
    return content;
  }

  if (Object.keys(newConfig).length === 0 && !hasSiblings) {
    return stripped;
  }

  // Preserve an explicit native Mermaid theme (e.g. redux-color, neo) if already configured;
  // default to 'base' only when custom themeVariables are introduced with no existing theme.
  if (hasThemeVars && !newConfig.theme) newConfig.theme = 'base';

  const yamlConfig = serializeFrontmatter(newSiblings, newConfig);
  return yamlConfig + '\n\n' + stripped;
}

/**
 * Extract current style options from diagram content by parsing frontmatter and linkStyle directives.
 * This allows the UI to stay in sync with manual edits in the editor.
 */
export function extractStyleOptionsFromContent(
  content: string
): Partial<import('@/types').DiagramStyleOptions> {
  const options: Partial<import('@/types').DiagramStyleOptions> = {};
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const diagramType = detectDiagramType(stripped);

  const parseBooleanValue = (val: unknown): boolean | undefined => {
    if (val === true || val === 'true') return true;
    if (val === false || val === 'false') return false;
    return undefined;
  };

  const parseFiniteNumber = (val: unknown): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  };

  // 1. Extract from Frontmatter (siblings + config block)
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  if (frontmatterMatch) {
    try {
      const { config, siblings } = parseFrontmatterBlock(frontmatterMatch[1]);

      if (siblings.displayMode === 'compact') {
        options.displayMode = 'compact';
      }

      // Extract global theme variables
      if (config.themeVariables && typeof config.themeVariables === 'object') {
        const tv = config.themeVariables as Record<string, any>;
        if (tv.fontFamily) options.fontFamily = String(tv.fontFamily);
        if (tv.fontSize) {
          const fs = String(tv.fontSize);
          options.fontSize = parseInt(fs, 10);
        }
        if (tv.primaryColor) options.primaryColor = String(tv.primaryColor);
        const useGrad = parseBooleanValue(tv.useGradient);
        if (useGrad !== undefined) options.useGradient = useGrad;
      }

      // Extract root look, handDrawnSeed, themeCSS, markdownAutoWrap
      if (config.look === 'neo' || config.look === 'classic' || config.look === 'handDrawn') {
        options.look = config.look;
      }
      const seed = parseFiniteNumber(config.handDrawnSeed);
      if (seed !== undefined && Number.isInteger(seed) && seed >= 0) {
        options.handDrawnSeed = seed;
      }
      if (typeof config.themeCSS === 'string' && config.themeCSS.trim().length > 0) {
        options.themeCSS = config.themeCSS;
      }

      // Root markdownAutoWrap (preferred in Mermaid 12.3)
      const rootWrap = parseBooleanValue(config.markdownAutoWrap);
      if (rootWrap !== undefined) {
        options.markdownAutoWrap = rootWrap;
      }

      // Extract flowchart specific options
      if (config.flowchart && typeof config.flowchart === 'object') {
        const fc = config.flowchart as Record<string, any>;
        if (fc.curve) options.curveStyle = fc.curve as any;
        if (fc.padding !== undefined) options.nodePadding = parseInt(String(fc.padding), 10);
        if (fc.nodeSpacing !== undefined) options.nodeSpacing = parseInt(String(fc.nodeSpacing), 10);
        if (fc.rankSpacing !== undefined) options.rankSpacing = parseInt(String(fc.rankSpacing), 10);
        const sd = parseFiniteNumber(fc.stepDuration);
        if (sd !== undefined && sd > 0) options.stepDuration = sd;
        const stepNums = parseBooleanValue(fc.stepNumbers);
        if (stepNums !== undefined) options.stepNumbers = stepNums;
        // Backward-compatible read of legacy nested flowchart.markdownAutoWrap
        if (options.markdownAutoWrap === undefined) {
          const legacyWrap = parseBooleanValue(fc.markdownAutoWrap);
          if (legacyWrap !== undefined) options.markdownAutoWrap = legacyWrap;
        }
      }

      // Extract sequence specific options
      if (config.sequence && typeof config.sequence === 'object') {
        const seq = config.sequence as Record<string, any>;
        const actorMargin = parseFiniteNumber(seq.actorMargin);
        if (actorMargin !== undefined) options.actorMargin = actorMargin;
        const diagramMarginX = parseFiniteNumber(seq.diagramMarginX);
        if (diagramMarginX !== undefined) options.diagramMarginX = diagramMarginX;
        const diagramMarginY = parseFiniteNumber(seq.diagramMarginY);
        if (diagramMarginY !== undefined) options.diagramMarginY = diagramMarginY;
        const actorWidth = parseFiniteNumber(seq.width ?? seq.actorWidth);
        if (actorWidth !== undefined) options.actorWidth = actorWidth;
        const actorHeight = parseFiniteNumber(seq.height ?? seq.actorHeight);
        if (actorHeight !== undefined) options.actorHeight = actorHeight;
        const mirrorActors = parseBooleanValue(seq.mirrorActors);
        if (mirrorActors !== undefined) options.mirrorActors = mirrorActors;
      }

      // Extract gantt specific options
      if (config.gantt && typeof config.gantt === 'object') {
        const gantt = config.gantt as Record<string, any>;
        const barHeight = parseFiniteNumber(gantt.barHeight);
        if (barHeight !== undefined) options.barHeight = barHeight;
        const barGap = parseFiniteNumber(gantt.barGap);
        if (barGap !== undefined) options.barGap = barGap;
        const topPadding = parseFiniteNumber(gantt.topPadding);
        if (topPadding !== undefined) options.topPadding = topPadding;
        const leftPadding = parseFiniteNumber(gantt.leftPadding);
        if (leftPadding !== undefined) options.leftPadding = leftPadding;
        if (typeof gantt.axisFormat === 'string' && gantt.axisFormat.length > 0) {
          options.axisFormat = gantt.axisFormat;
        }
      }

      // Extract swimlane specific options
      if (config.swimlane && typeof config.swimlane === 'object') {
        const sw = config.swimlane as Record<string, any>;
        if (sw.lineHops === false || sw.lineHops === 'false') {
          options.lineHops = false;
        } else if (sw.lineHops === 'gap') {
          options.lineHops = 'gap';
        } else if (sw.lineHops === 'arc' || sw.lineHops === true || sw.lineHops === 'true') {
          options.lineHops = 'arc';
        }
        const autoOrder = parseBooleanValue(sw.automaticLaneOrdering);
        if (autoOrder !== undefined) options.automaticLaneOrdering = autoOrder;
      }

      // Extract agentflow specific options (AGF-01)
      if (config.agentflow && typeof config.agentflow === 'object') {
        const af = config.agentflow as Record<string, any>;
        const nodeSpacing = parseFiniteNumber(af.nodeSpacing);
        if (nodeSpacing !== undefined) options.nodeSpacing = nodeSpacing;
        const rankSpacing = parseFiniteNumber(af.rankSpacing);
        if (rankSpacing !== undefined) options.rankSpacing = rankSpacing;
        const wrappingWidth = parseFiniteNumber(af.wrappingWidth);
        if (wrappingWidth !== undefined) options.wrappingWidth = wrappingWidth;
        const minNodeWidth = parseFiniteNumber(af.minNodeWidth);
        if (minNodeWidth !== undefined) options.minNodeWidth = minNodeWidth;
        const diagramPadding = parseFiniteNumber(af.diagramPadding);
        if (diagramPadding !== undefined) options.diagramPadding = diagramPadding;
      }

      // Extract pie specific options (CFG-01)
      if (config.pie && typeof config.pie === 'object') {
        const pie = config.pie as Record<string, any>;
        const donutHole = parseFiniteNumber(pie.donutHole);
        if (donutHole !== undefined && donutHole >= 0 && donutHole <= 0.9) {
          options.donutHole = donutHole;
        }
        if (
          pie.legendPosition === 'top' ||
          pie.legendPosition === 'bottom' ||
          pie.legendPosition === 'left' ||
          pie.legendPosition === 'right' ||
          pie.legendPosition === 'center'
        ) {
          options.legendPosition = pie.legendPosition;
        }
        if (typeof pie.highlightSlice === 'string' && pie.highlightSlice.trim().length > 0) {
          options.highlightSlice = pie.highlightSlice.trim();
        }
        const textPosition = parseFiniteNumber(pie.textPosition);
        if (textPosition !== undefined && textPosition >= 0 && textPosition <= 1) {
          options.textPosition = textPosition;
        }
      }

      // Extract xyChart specific options (CFG-01)
      if (config.xyChart && typeof config.xyChart === 'object') {
        const xy = config.xyChart as Record<string, any>;
        const showDataLabel = parseBooleanValue(xy.showDataLabel);
        if (showDataLabel !== undefined) options.showDataLabel = showDataLabel;
        const outsideBar = parseBooleanValue(xy.showDataLabelOutsideBar);
        if (outsideBar !== undefined) options.showDataLabelOutsideBar = outsideBar;
      }

      // Extract sankey specific options (CFG-01)
      if (config.sankey && typeof config.sankey === 'object') {
        const sk = config.sankey as Record<string, any>;
        if (sk.labelStyle === 'legacy' || sk.labelStyle === 'outlined') {
          options.labelStyle = sk.labelStyle;
        }
        const nodeWidth = parseFiniteNumber(sk.nodeWidth);
        if (nodeWidth !== undefined && nodeWidth > 0) options.sankeyNodeWidth = nodeWidth;
        const nodePadding = parseFiniteNumber(sk.nodePadding);
        if (nodePadding !== undefined && nodePadding >= 0) options.sankeyNodePadding = nodePadding;
        if (sk.nodeColors && typeof sk.nodeColors === 'object') {
          const colors: Record<string, string> = {};
          for (const [k, v] of Object.entries(sk.nodeColors)) {
            if (typeof v === 'string' && v.trim()) colors[k] = v.trim();
          }
          if (Object.keys(colors).length > 0) options.nodeColors = colors;
        }
        if (typeof sk.linkColor === 'string' && sk.linkColor.trim().length > 0) {
          options.linkColor = sk.linkColor.trim();
        }
        if (
          sk.nodeAlignment === 'left' ||
          sk.nodeAlignment === 'right' ||
          sk.nodeAlignment === 'center' ||
          sk.nodeAlignment === 'justify'
        ) {
          options.nodeAlignment = sk.nodeAlignment;
        }
        const showValues = parseBooleanValue(sk.showValues);
        if (showValues !== undefined) options.showValues = showValues;
      }

      // Extract mindmap specific options (CFG-01)
      if (config.mindmap && typeof config.mindmap === 'object') {
        const mm = config.mindmap as Record<string, any>;
        if (mm.colorBy === 'branch' || mm.colorBy === 'depth') {
          options.colorBy = mm.colorBy;
        }
      }

      // Extract class specific options (CFG-02)
      if (config.class && typeof config.class === 'object') {
        const cls = config.class as Record<string, any>;
        const hier = parseBooleanValue(cls.hierarchicalNamespaces);
        if (hier !== undefined) options.hierarchicalNamespaces = hier;
        const hideEmpty = parseBooleanValue(cls.hideEmptyMembersBox);
        if (hideEmpty !== undefined) options.hideEmptyMembersBox = hideEmpty;
      }

      // Extract packet specific options (CFG-02)
      if (config.packet && typeof config.packet === 'object') {
        const pkt = config.packet as Record<string, any>;
        if (pkt.bitOrder === 'ascending' || pkt.bitOrder === 'descending') {
          options.bitOrder = pkt.bitOrder;
        }
        const bitsPerRow = parseFiniteNumber(pkt.bitsPerRow);
        if (bitsPerRow !== undefined && Number.isInteger(bitsPerRow) && bitsPerRow >= 1) {
          options.bitsPerRow = bitsPerRow;
        }
        const showBits = parseBooleanValue(pkt.showBits);
        if (showBits !== undefined) options.showBits = showBits;
      }

      // Extract architecture specific options (CFG-02)
      if (config.architecture && typeof config.architecture === 'object') {
        const arch = config.architecture as Record<string, any>;
        const randomize = parseBooleanValue(arch.randomize);
        if (randomize !== undefined) options.randomize = randomize;
        const archSeed = parseFiniteNumber(arch.seed);
        if (archSeed !== undefined && Number.isInteger(archSeed) && archSeed >= 0) {
          options.seed = archSeed;
        }
        const nodeSep = parseFiniteNumber(arch.nodeSeparation);
        if (nodeSep !== undefined && nodeSep > 0) options.nodeSeparation = nodeSep;
        const idealLen = parseFiniteNumber(arch.idealEdgeLengthMultiplier);
        if (idealLen !== undefined && idealLen > 0) options.idealEdgeLengthMultiplier = idealLen;
        const elasticity = parseFiniteNumber(arch.edgeElasticity);
        if (elasticity !== undefined && elasticity > 0) options.edgeElasticity = elasticity;
        const numIter = parseFiniteNumber(arch.numIter);
        if (numIter !== undefined && Number.isInteger(numIter) && numIter >= 1) {
          options.numIter = numIter;
        }
      }

      // Extract C4 specific options (CFG-02)
      if (config.c4 && typeof config.c4 === 'object') {
        const c4 = config.c4 as Record<string, any>;
        const wrap = parseBooleanValue(c4.wrap);
        if (wrap !== undefined) options.wrap = wrap;
      }

      // Extract treeView specific options (CFG-02)
      if (config.treeView && typeof config.treeView === 'object') {
        const tv = config.treeView as Record<string, any>;
        const showIcons = parseBooleanValue(tv.showIcons);
        if (showIcons !== undefined) options.showIcons = showIcons;
        if (typeof tv.defaultIconPack === 'string' && tv.defaultIconPack.trim().length > 0) {
          options.defaultIconPack = tv.defaultIconPack.trim();
        }
      }

      // Extract timeline specific options (CFG-02)
      if (config.timeline && typeof config.timeline === 'object') {
        const tl = config.timeline as Record<string, any>;
        const disableMulti = parseBooleanValue(tl.disableMulticolor);
        if (disableMulti !== undefined) options.disableMulticolor = disableMulti;
      }

      // Extract gitGraph specific options (CFG-02)
      if (config.gitGraph && typeof config.gitGraph === 'object') {
        const gg = config.gitGraph as Record<string, any>;
        const showBranches = parseBooleanValue(gg.showBranches);
        if (showBranches !== undefined) options.showBranches = showBranches;
        const showCommitLabel = parseBooleanValue(gg.showCommitLabel);
        if (showCommitLabel !== undefined) options.showCommitLabel = showCommitLabel;
        const rotateCommitLabel = parseBooleanValue(gg.rotateCommitLabel);
        if (rotateCommitLabel !== undefined) options.rotateCommitLabel = rotateCommitLabel;
        const parallelCommits = parseBooleanValue(gg.parallelCommits);
        if (parallelCommits !== undefined) options.parallelCommits = parallelCommits;
        if (typeof gg.mainBranchName === 'string' && gg.mainBranchName.trim().length > 0) {
          options.mainBranchName = gg.mainBranchName.trim();
        }
      }

      // Extract kanban specific options (CFG-02)
      if (config.kanban && typeof config.kanban === 'object') {
        const kb = config.kanban as Record<string, any>;
        if (typeof kb.ticketBaseUrl === 'string' && kb.ticketBaseUrl.trim().length > 0) {
          options.ticketBaseUrl = kb.ticketBaseUrl.trim();
        }
      }

      // Extract treemap specific options (CFG-02)
      if (config.treemap && typeof config.treemap === 'object') {
        const tm = config.treemap as Record<string, any>;
        const showValues = parseBooleanValue(tm.showValues);
        if (showValues !== undefined) options.showValues = showValues;
        if (typeof tm.valueFormat === 'string' && tm.valueFormat.trim().length > 0) {
          options.valueFormat = tm.valueFormat.trim();
        }
        const diagramPadding = parseFiniteNumber(tm.diagramPadding);
        if (diagramPadding !== undefined && diagramPadding >= 0) {
          options.diagramPadding = diagramPadding;
        }
      }

      // Extract ELK sub-options (LAY-02)
      if (config.elk && typeof config.elk === 'object') {
        const elk = config.elk as Record<string, any>;
        const mergeEdges = parseBooleanValue(elk.mergeEdges);
        if (mergeEdges !== undefined) options.elkMergeEdges = mergeEdges;
        if (
          elk.nodePlacementStrategy === 'SIMPLE' ||
          elk.nodePlacementStrategy === 'NETWORK_SIMPLEX' ||
          elk.nodePlacementStrategy === 'LINEAR_SEGMENTS' ||
          elk.nodePlacementStrategy === 'BRANDES_KOEPF'
        ) {
          options.elkNodePlacementStrategy = elk.nodePlacementStrategy;
        }
        if (
          elk.nodePlacementAlignment === 'NONE' ||
          elk.nodePlacementAlignment === 'LEFTUP' ||
          elk.nodePlacementAlignment === 'LEFTDOWN' ||
          elk.nodePlacementAlignment === 'RIGHTUP' ||
          elk.nodePlacementAlignment === 'RIGHTDOWN' ||
          elk.nodePlacementAlignment === 'BALANCED'
        ) {
          options.elkNodePlacementAlignment = elk.nodePlacementAlignment;
        }
        if (
          elk.preset === 'default' ||
          elk.preset === 'legacy' ||
          elk.preset === 'modelOrder' ||
          elk.preset === 'depthFirst'
        ) {
          options.elkPreset = elk.preset;
        }
      }

      // Extract layout engine
      if (config.layout) options.layoutEngine = config.layout as any;
    } catch (e) {
      console.warn('Failed to parse frontmatter for style extraction:', e);
    }
  }

  // 2. Extract Direction from the diagram header (e.g., flowchart TD)
  const dirMatch = stripped.match(/^(flowchart|graph)\s+(TD|TB|BT|LR|RL)/im);
  if (dirMatch) {
    options.direction = dirMatch[2].toUpperCase() as any;
  }

  // 3. Extract Global Edge Styles from linkStyle default
  const diagramsSupportingLinkStyle = [
    'flowchart',
    'graph',
    'journey',
    'blockDiagram',
    'architectureDiagram',
  ];
  if (diagramsSupportingLinkStyle.includes(diagramType)) {
    const linkStyles = parseLinkStyles(stripped);
    const defaultStyle = linkStyles.get('default');
    if (defaultStyle) {
      if (defaultStyle.stroke) options.edgeStrokeColor = defaultStyle.stroke;
      if (defaultStyle.strokeWidth)
        options.edgeStrokeWidth = parseInt(String(defaultStyle.strokeWidth), 10);
      if (defaultStyle.opacity) options.edgeOpacity = parseFloat(String(defaultStyle.opacity));
      if (defaultStyle.fontSize) options.edgeFontSize = parseInt(String(defaultStyle.fontSize), 10);
      if (defaultStyle.strokeDasharray) options.edgeDasharray = defaultStyle.strokeDasharray;
      if (defaultStyle.color) options.edgeLabelColor = defaultStyle.color;
      if (defaultStyle.fill) options.edgeLabelBackgroundColor = defaultStyle.fill;
      if (defaultStyle.fillOpacity)
        options.edgeLabelOpacity = parseFloat(String(defaultStyle.fillOpacity));
    }
  }

  return options;
}
