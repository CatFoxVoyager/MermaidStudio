// src/constants/themeDerivation.ts
// Theme derivation engine that mirrors Mermaid's Theme.updateColors() exactly
// Reference: node_modules/mermaid/dist/chunks/mermaid.core/chunk-7R4GIKGN.mjs

import { isDark } from 'khroma';
import type { ThemeCoreColors, MermaidTheme, DiagramType } from '@/types';
import { builtinThemes } from '@/constants/themes';
import { detectDiagramType } from '@/lib/mermaid/core';
import { updateLinkStyle, parseLinkStyles } from '@/lib/mermaid/codeUtils';
import { adjustToHex, darkenToHex, lightenToHex, invertToHex } from '@/utils/colorConversion';

const THEME_COLOR_LIMIT = 12;

/** Keys that should NEVER be inside themeVariables because they are top-level config properties */
const RESTRICTED_THEME_VARIABLES = new Set([
  'flowchart', 'sequence', 'gantt', 'journey', 'class', 'state', 'er',
  'pie', 'mindmap', 'git', 'quadrantChart', 'xyChart', 'sankey',
  'timeline', 'packet', 'kanban', 'architecture', 'zenuml', 'block',
  'c4', 'layout', 'look', 'theme', 'config', 'darkMode'
]);

const DIAGRAM_TYPE_VARIABLES: Record<DiagramType, string[]> = {
  flowchart: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor', 'border2',
    'nodeBkg', 'mainBkg', 'nodeBorder', 'clusterBkg', 'clusterBorder',
    'defaultLinkColor', 'titleColor', 'edgeLabelBackground', 'nodeTextColor',
    'fontFamily', 'fontSize',
  ],
  sequence: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'actorBorder', 'actorBkg', 'actorTextColor', 'actorLineColor',
    'labelBoxBkgColor', 'signalColor', 'signalTextColor', 'labelBoxBorderColor', 'labelTextColor',
    'loopTextColor', 'activationBorderColor', 'activationBkgColor', 'sequenceNumberColor',
    'noteBkgColor', 'noteBorderColor', 'noteTextColor',
    'sectionBkgColor', 'altSectionBkgColor', 'sectionBkgColor2', 'excludeBkgColor',
    'fontFamily', 'fontSize',
  ],
  classDiagram: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'nodeBkg', 'mainBkg', 'nodeBorder', 'clusterBkg', 'clusterBorder',
    'classText', 'fillType0', 'fillType1', 'fillType2', 'fillType3', 'fillType4', 'fillType5', 'fillType6', 'fillType7',
    'fontFamily', 'fontSize',
  ],
  stateDiagram: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'transitionColor', 'transitionLabelColor', 'stateLabelColor', 'stateBkg', 'labelBackgroundColor',
    'compositeBackground', 'altBackground', 'compositeTitleBackground', 'compositeBorder',
    'innerEndBackground', 'errorBkgColor', 'errorTextColor', 'specialStateColor',
    'fontFamily', 'fontSize',
  ],
  erDiagram: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'entityBkg', 'entityBorder', 'attributeBkg', 'attributeBorder', 'relationshipBkg', 'relationshipBorder',
    'fontFamily', 'fontSize',
  ],
  gantt: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'taskBorderColor', 'taskBkgColor', 'activeTaskBorderColor', 'activeTaskBkgColor',
    'gridColor', 'doneTaskBkgColor', 'doneTaskBorderColor',
    'critBorderColor', 'critBkgColor', 'todayLineColor', 'vertLineColor',
    'taskTextColor', 'taskTextOutsideColor', 'taskTextLightColor', 'taskTextDarkColor', 'taskTextClickableColor',
    'sectionBkgColor', 'altSectionBkgColor', 'sectionBkgColor2', 'excludeBkgColor',
    'fontFamily', 'fontSize',
  ],
  pie: [
    'background', 'primaryTextColor',
    'pie1', 'pie2', 'pie3', 'pie4', 'pie5', 'pie6', 'pie7', 'pie8', 'pie9', 'pie10', 'pie11', 'pie12',
    'pieTitleTextSize', 'pieTitleTextColor', 'pieSectionTextSize', 'pieSectionTextColor',
    'pieLegendTextSize', 'pieLegendTextColor', 'pieStrokeColor', 'pieStrokeWidth',
    'pieOuterStrokeWidth', 'pieOuterStrokeColor', 'pieOpacity',
    'fontFamily', 'fontSize',
  ],
  mindmap: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'fontFamily', 'fontSize',
  ],
  gitGraph: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'git0', 'git1', 'git2', 'git3', 'git4', 'git5', 'git6', 'git7',
    'gitInv0', 'gitInv1', 'gitInv2', 'gitInv3', 'gitInv4', 'gitInv5', 'gitInv6', 'gitInv7',
    'branchLabelColor', 'gitBranchLabel0', 'gitBranchLabel1', 'gitBranchLabel2', 'gitBranchLabel3', 'gitBranchLabel4', 'gitBranchLabel5', 'gitBranchLabel6', 'gitBranchLabel7',
    'tagLabelColor', 'tagLabelBackground', 'tagLabelBorder', 'tagLabelFontSize',
    'commitLabelColor', 'commitLabelBackground', 'commitLabelFontSize',
    'fontFamily', 'fontSize',
  ],
  journey: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'fillType0', 'fillType1', 'fillType2', 'fillType3', 'fillType4', 'fillType5', 'fillType6', 'fillType7',
    'fontFamily', 'fontSize',
  ],
  quadrantChart: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'quadrant1Fill', 'quadrant2Fill', 'quadrant3Fill', 'quadrant4Fill',
    'quadrant1TextFill', 'quadrant2TextFill', 'quadrant3TextFill', 'quadrant4TextFill',
    'quadrantPointFill', 'quadrantPointTextFill', 'quadrantXAxisTextFill', 'quadrantYAxisTextFill',
    'quadrantInternalBorderStrokeFill', 'quadrantExternalBorderStrokeFill', 'quadrantTitleFill',
    'fontFamily', 'fontSize',
  ],
  requirementDiagram: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'requirementBackground', 'requirementBorderColor', 'requirementBorderSize', 'requirementTextColor',
    'relationColor', 'relationLabelBackground', 'relationLabelColor',
    'fontFamily', 'fontSize',
  ],
  timeline: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'fontFamily', 'fontSize',
  ],
  sankey: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'fontFamily', 'fontSize',
  ],
  xyChart: [
    'background', 'primaryTextColor',
    'xyChart',
    'fontFamily', 'fontSize',
  ],
  packetDiagram: ['primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'primaryTextColor', 'fontFamily', 'fontSize'],
  kanban: ['primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'primaryTextColor', 'fontFamily', 'fontSize'],
  architectureDiagram: ['primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'primaryTextColor', 'archEdgeColor', 'archEdgeArrowColor', 'archEdgeWidth', 'archGroupBorderColor', 'archGroupBorderWidth', 'fontFamily', 'fontSize'],
  zenuml: ['primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'primaryTextColor', 'fontFamily', 'fontSize'],
  blockDiagram: ['primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'primaryTextColor', 'fontFamily', 'fontSize'],
  c4: ['primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'primaryTextColor', 'fontFamily', 'fontSize'],
  unknown: [
    'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
    'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
    'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor',
    'nodeBkg', 'mainBkg', 'nodeBorder', 'clusterBkg', 'clusterBorder',
    'fontFamily', 'fontSize',
  ],
};

export const DEFAULT_LIGHT_THEME = builtinThemes.find(t => t.id === 'corporate-blue') ?? builtinThemes[0];
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
): Record<string, string> {
  const allVars = deriveThemeVariables(coreColors, darkMode);
  const allowedVars = DIAGRAM_TYPE_VARIABLES[diagramType] || DIAGRAM_TYPE_VARIABLES.unknown;
  const allowedSet = new Set(allowedVars);
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(allVars)) {
    if (key === 'darkMode' || typeof value !== 'string') continue;
    if (allowedSet.has(key)) {
      filtered[key] = value;
    }
    if ((key === 'radar' || key === 'xyChart') && allowedSet.has(key)) {
      const objValue = (allVars as Record<string, unknown>)[key];
      if (typeof objValue === 'object' && objValue !== null) {
        filtered[key] = JSON.stringify(objValue);
      }
    }
  }
  return filtered;
}

export function deriveThemeVariables(
  coreColors: ThemeCoreColors,
  darkMode: boolean
): Record<string, string> {
  const t: Record<string, string | boolean | number> = { ...coreColors, darkMode };
  t.secondaryColor = t.secondaryColor || adjustToHex(t.primaryColor as string, { h: -120 });
  t.tertiaryColor = t.tertiaryColor || adjustToHex(t.primaryColor as string, { h: 180, l: 5 });
  t.primaryBorderColor = t.primaryBorderColor || mkBorder(t.primaryColor as string, darkMode);
  t.secondaryBorderColor = t.secondaryBorderColor || mkBorder(t.secondaryColor as string, darkMode);
  t.tertiaryBorderColor = t.tertiaryBorderColor || mkBorder(t.tertiaryColor as string, darkMode);
  t.noteBorderColor = t.noteBorderColor || mkBorder(t.noteBkgColor as string || '#fff5ad', darkMode);
  t.noteBkgColor = t.noteBkgColor || '#fff5ad';
  t.noteTextColor = t.noteTextColor || '#333';
  t.primaryTextColor = t.primaryTextColor || (darkMode ? '#eee' : '#333');
  t.secondaryTextColor = t.secondaryTextColor || invertToHex(t.secondaryColor as string);
  t.tertiaryTextColor = t.tertiaryTextColor || invertToHex(t.tertiaryColor as string);
  t.lineColor = t.lineColor || invertToHex(t.background as string);
  t.arrowheadColor = t.arrowheadColor || invertToHex(t.background as string);
  t.textColor = t.textColor || t.primaryTextColor;
  t.border2 = t.border2 || t.tertiaryBorderColor;
  t.nodeBkg = t.nodeBkg || t.primaryColor;
  t.mainBkg = t.mainBkg || t.primaryColor;
  t.nodeBorder = t.nodeBorder || t.primaryBorderColor;
  t.clusterBkg = t.clusterBkg || t.tertiaryColor;
  t.clusterBorder = t.clusterBorder || t.tertiaryBorderColor;
  t.defaultLinkColor = t.defaultLinkColor || t.lineColor;
  t.titleColor = t.titleColor || t.tertiaryTextColor;
  t.edgeLabelBackground = t.edgeLabelBackground || t.background;
  t.nodeTextColor = t.nodeTextColor || t.primaryTextColor;
  t.actorBorder = t.actorBorder || t.primaryBorderColor;
  t.actorBkg = t.actorBkg || t.mainBkg;
  t.actorTextColor = t.actorTextColor || t.primaryTextColor;
  t.actorLineColor = t.actorLineColor || t.actorBorder;
  t.labelBoxBkgColor = t.labelBoxBkgColor || t.actorBkg;
  t.signalColor = t.signalColor || t.lineColor;
  t.signalTextColor = t.signalTextColor || t.textColor || t.primaryTextColor;
  t.labelBoxBorderColor = t.labelBoxBorderColor || t.actorBorder;
  t.labelTextColor = t.labelTextColor || t.actorTextColor;
  t.loopTextColor = t.loopTextColor || t.actorTextColor;
  t.activationBorderColor = t.activationBorderColor || darkenToHex(t.secondaryColor as string, 10);
  t.activationBkgColor = t.activationBkgColor || t.secondaryColor;
  t.sequenceNumberColor = t.sequenceNumberColor || invertToHex(t.lineColor as string);
  t.sectionBkgColor = t.sectionBkgColor || t.secondaryColor;
  t.altSectionBkgColor = t.altSectionBkgColor || 'white';
  t.sectionBkgColor2 = t.sectionBkgColor2 || t.primaryColor;
  t.excludeBkgColor = t.excludeBkgColor || '#eeeeee';
  t.taskBorderColor = t.taskBorderColor || t.primaryBorderColor;
  t.taskBkgColor = t.taskBkgColor || t.primaryColor;
  t.activeTaskBorderColor = t.activeTaskBorderColor || t.primaryColor;
  t.activeTaskBkgColor = t.activeTaskBkgColor || lightenToHex(t.primaryColor as string, 23);
  t.gridColor = t.gridColor || 'lightgrey';
  t.doneTaskBkgColor = t.doneTaskBkgColor || 'lightgrey';
  t.doneTaskBorderColor = t.doneTaskBorderColor || 'grey';
  t.critBorderColor = t.critBorderColor || '#ff8888';
  t.critBkgColor = t.critBkgColor || 'red';
  t.todayLineColor = t.todayLineColor || 'red';
  t.vertLineColor = t.vertLineColor || 'navy';
  t.taskTextColor = t.taskTextColor || t.textColor;
  t.taskTextOutsideColor = t.taskTextOutsideColor || t.textColor;
  t.taskTextLightColor = t.taskTextLightColor || t.textColor;
  t.taskTextDarkColor = t.taskTextDarkColor || t.textColor;
  t.taskTextClickableColor = t.taskTextClickableColor || '#003163';
  t.personBorder = t.personBorder || t.primaryBorderColor;
  t.personBkg = t.personBkg || t.mainBkg;
  if (darkMode) {
    t.rowOdd = t.rowOdd || darkenToHex(t.mainBkg as string, 5) || '#ffffff';
    t.rowEven = t.rowEven || darkenToHex(t.mainBkg as string, 10);
  } else {
    t.rowOdd = t.rowOdd || lightenToHex(t.mainBkg as string, 75) || '#ffffff';
    t.rowEven = t.rowEven || lightenToHex(t.mainBkg as string, 5);
  }
  t.transitionColor = t.transitionColor || t.lineColor;
  t.transitionLabelColor = t.transitionLabelColor || t.textColor;
  t.stateLabelColor = t.stateLabelColor || t.stateBkg || t.primaryTextColor;
  t.stateBkg = t.stateBkg || t.mainBkg;
  t.labelBackgroundColor = t.labelBackgroundColor || t.stateBkg;
  t.compositeBackground = t.compositeBackground || t.background || t.tertiaryColor;
  t.altBackground = t.altBackground || t.tertiaryColor;
  t.compositeTitleBackground = t.compositeTitleBackground || t.mainBkg;
  t.compositeBorder = t.compositeBorder || t.nodeBorder;
  t.innerEndBackground = t.nodeBorder;
  t.errorBkgColor = t.errorBkgColor || t.tertiaryColor;
  t.errorTextColor = t.errorTextColor || t.tertiaryTextColor;
  t.specialStateColor = t.lineColor;
  t.cScale0 = t.cScale0 || t.primaryColor;
  t.cScale1 = t.cScale1 || t.secondaryColor;
  t.cScale2 = t.cScale2 || t.tertiaryColor;
  t.cScale3 = t.cScale3 || adjustToHex(t.primaryColor as string, { h: 30 });
  t.cScale4 = t.cScale4 || adjustToHex(t.primaryColor as string, { h: 60 });
  t.cScale5 = t.cScale5 || adjustToHex(t.primaryColor as string, { h: 90 });
  t.cScale6 = t.cScale6 || adjustToHex(t.primaryColor as string, { h: 120 });
  t.cScale7 = t.cScale7 || adjustToHex(t.primaryColor as string, { h: 150 });
  t.cScale8 = t.cScale8 || adjustToHex(t.primaryColor as string, { h: 210, l: 150 });
  t.cScale9 = t.cScale9 || adjustToHex(t.primaryColor as string, { h: 270 });
  t.cScale10 = t.cScale10 || adjustToHex(t.primaryColor as string, { h: 300 });
  t.cScale11 = t.cScale11 || adjustToHex(t.primaryColor as string, { h: 330 });
  if (darkMode) {
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) t['cScale' + i] = darkenToHex(t['cScale' + i] as string, 75);
  } else {
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) t['cScale' + i] = darkenToHex(t['cScale' + i] as string, 25);
  }
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) t['cScaleInv' + i] = t['cScaleInv' + i] || invertToHex(t['cScale' + i] as string);
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    const key = 'cScale' + i;
    const peerKey = 'cScalePeer' + i;
    t[peerKey] = t[peerKey] || (darkMode ? lightenToHex(t[key] as string, 10) : darkenToHex(t[key] as string, 10));
  }
  t.scaleLabelColor = t.scaleLabelColor || t.labelTextColor;
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) t['cScaleLabel' + i] = t['cScaleLabel' + i] || t.scaleLabelColor;
  const multiplier = darkMode ? -4 : -1;
  for (let i = 0; i < 5; i++) {
    const surfaceKey = 'surface' + i;
    const surfacePeerKey = 'surfacePeer' + i;
    t[surfaceKey] = t[surfaceKey] || adjustToHex(t.mainBkg as string, { h: 180, s: -15, l: multiplier * (5 + i * 3) });
    t[surfacePeerKey] = t[surfacePeerKey] || adjustToHex(t.mainBkg as string, { h: 180, s: -15, l: multiplier * (8 + i * 3) });
  }
  t.classText = t.classText || t.textColor;
  t.fillType0 = t.fillType0 || t.primaryColor;
  t.fillType1 = t.fillType1 || t.secondaryColor;
  t.fillType2 = t.fillType2 || adjustToHex(t.primaryColor as string, { h: 64 });
  t.fillType3 = t.fillType3 || adjustToHex(t.secondaryColor as string, { h: 64 });
  t.fillType4 = t.fillType4 || adjustToHex(t.primaryColor as string, { h: -64 });
  t.fillType5 = t.fillType5 || adjustToHex(t.secondaryColor as string, { h: -64 });
  t.fillType6 = t.fillType6 || adjustToHex(t.primaryColor as string, { h: 128 });
  t.fillType7 = t.fillType7 || adjustToHex(t.secondaryColor as string, { h: 128 });
  t.pie1 = t.pie1 || t.primaryColor;
  t.pie2 = t.pie2 || t.secondaryColor;
  t.pie3 = t.pie3 || t.tertiaryColor;
  t.pie4 = t.pie4 || adjustToHex(t.primaryColor as string, { l: -10 });
  t.pie5 = t.pie5 || adjustToHex(t.secondaryColor as string, { l: -10 });
  t.pie6 = t.pie6 || adjustToHex(t.tertiaryColor as string, { l: -10 });
  t.pie7 = t.pie7 || adjustToHex(t.primaryColor as string, { h: 60, l: -10 });
  t.pie8 = t.pie8 || adjustToHex(t.primaryColor as string, { h: -60, l: -10 });
  t.pie9 = t.pie9 || adjustToHex(t.primaryColor as string, { h: 120, l: 0 });
  t.pie10 = t.pie10 || adjustToHex(t.primaryColor as string, { h: 60, l: -20 });
  t.pie11 = t.pie11 || adjustToHex(t.primaryColor as string, { h: -60, l: -20 });
  t.pie12 = t.pie12 || adjustToHex(t.primaryColor as string, { h: 120, l: -10 });
  t.pieTitleTextSize = t.pieTitleTextSize || '25px';
  t.pieTitleTextColor = t.pieTitleTextColor || t.taskTextDarkColor;
  t.pieSectionTextSize = t.pieSectionTextSize || '17px';
  t.pieSectionTextColor = t.pieSectionTextColor || t.textColor;
  t.pieLegendTextSize = t.pieLegendTextSize || '17px';
  t.pieLegendTextColor = t.pieLegendTextColor || t.taskTextDarkColor;
  t.pieStrokeColor = t.pieStrokeColor || 'black';
  t.pieStrokeWidth = t.pieStrokeWidth || '2px';
  t.pieOuterStrokeWidth = t.pieOuterStrokeWidth || '2px';
  t.pieOuterStrokeColor = t.pieOuterStrokeColor || 'black';
  t.pieOpacity = t.pieOpacity || '0.7';
  t.venn1 = t.venn1 ?? adjustToHex(t.primaryColor as string, { l: -30 });
  t.venn2 = t.venn2 ?? adjustToHex(t.secondaryColor as string, { l: -30 });
  t.venn3 = t.venn3 ?? adjustToHex(t.tertiaryColor as string, { l: -30 });
  t.venn4 = t.venn4 ?? adjustToHex(t.primaryColor as string, { h: 60, l: -30 });
  t.venn5 = t.venn5 ?? adjustToHex(t.primaryColor as string, { h: -60, l: -30 });
  t.venn6 = t.venn6 ?? adjustToHex(t.secondaryColor as string, { h: 60, l: -30 });
  t.venn7 = t.venn7 ?? adjustToHex(t.primaryColor as string, { h: 120, l: -30 });
  t.venn8 = t.venn8 ?? adjustToHex(t.secondaryColor as string, { h: 120, l: -30 });
  t.vennTitleTextColor = t.vennTitleTextColor ?? t.titleColor;
  t.vennSetTextColor = t.vennSetTextColor ?? t.textColor;
  t.radar = {
    axisColor: (t.radar as any)?.axisColor || t.lineColor,
    axisStrokeWidth: (t.radar as any)?.axisStrokeWidth || 2,
    axisLabelFontSize: (t.radar as any)?.axisLabelFontSize || 12,
    curveOpacity: (t.radar as any)?.curveOpacity || 0.5,
    curveStrokeWidth: (t.radar as any)?.curveStrokeWidth || 2,
    graticuleColor: (t.radar as any)?.graticuleColor || '#DEDEDE',
    graticuleStrokeWidth: (t.radar as any)?.graticuleStrokeWidth || 1,
    graticuleOpacity: (t.radar as any)?.graticuleOpacity || 0.3,
    legendBoxSize: (t.radar as any)?.legendBoxSize || 12,
    legendFontSize: (t.radar as any)?.legendFontSize || 12,
  };
  t.archEdgeColor = t.archEdgeColor || '#777';
  t.archEdgeArrowColor = t.archEdgeArrowColor || '#777';
  t.archEdgeWidth = t.archEdgeWidth || '3';
  t.archGroupBorderColor = t.archGroupBorderColor || '#000';
  t.archGroupBorderWidth = t.archGroupBorderWidth || '2px';
  t.quadrant1Fill = t.quadrant1Fill || t.primaryColor;
  t.quadrant2Fill = t.quadrant2Fill || adjustToHex(t.primaryColor as string, { r: 5, g: 5, b: 5 });
  t.quadrant3Fill = t.quadrant3Fill || adjustToHex(t.primaryColor as string, { r: 10, g: 10, b: 10 });
  t.quadrant4Fill = t.quadrant4Fill || adjustToHex(t.primaryColor as string, { r: 15, g: 15, b: 15 });
  t.quadrant1TextFill = t.quadrant1TextFill || t.primaryTextColor;
  t.quadrant2TextFill = t.quadrant2TextFill || adjustToHex(t.primaryTextColor as string, { r: -5, g: -5, b: -5 });
  t.quadrant3TextFill = t.quadrant3TextFill || adjustToHex(t.primaryTextColor as string, { r: -10, g: -10, b: -10 });
  t.quadrant4TextFill = t.quadrant4TextFill || adjustToHex(t.primaryTextColor as string, { r: -15, g: -15, b: -15 });
  t.quadrantPointFill = t.quadrantPointFill || (isDark(t.quadrant1Fill as string) ? lightenToHex(t.quadrant1Fill as string) : darkenToHex(t.quadrant1Fill as string));
  t.quadrantPointTextFill = t.quadrantPointTextFill || t.primaryTextColor;
  t.quadrantXAxisTextFill = t.quadrantXAxisTextFill || t.primaryTextColor;
  t.quadrantYAxisTextFill = t.quadrantYAxisTextFill || t.primaryTextColor;
  t.quadrantInternalBorderStrokeFill = t.quadrantInternalBorderStrokeFill || t.primaryBorderColor;
  t.quadrantExternalBorderStrokeFill = t.quadrantExternalBorderStrokeFill || t.primaryBorderColor;
  t.quadrantTitleFill = t.quadrantTitleFill || t.primaryTextColor;
  t.xyChart = {
    backgroundColor: (t.xyChart as any)?.backgroundColor || t.background,
    titleColor: (t.xyChart as any)?.titleColor || t.primaryTextColor,
    xAxisTitleColor: (t.xyChart as any)?.xAxisTitleColor || t.primaryTextColor,
    xAxisLabelColor: (t.xyChart as any)?.xAxisLabelColor || t.primaryTextColor,
    xAxisTickColor: (t.xyChart as any)?.xAxisTickColor || t.primaryTextColor,
    xAxisLineColor: (t.xyChart as any)?.xAxisLineColor || t.primaryTextColor,
    yAxisTitleColor: (t.xyChart as any)?.yAxisTitleColor || t.primaryTextColor,
    yAxisLabelColor: (t.xyChart as any)?.yAxisLabelColor || t.primaryTextColor,
    yAxisTickColor: (t.xyChart as any)?.yAxisTickColor || t.primaryTextColor,
    yAxisLineColor: (t.xyChart as any)?.yAxisLineColor || t.primaryTextColor,
    plotColorPalette: '#FFF4DD,#FFD8B1,#FFA07A,#ECEFF1,#D6DBDF,#C3E0A8,#FFB6A4,#FFD74D,#738FA7,#FFFFF0',
  };
  t.requirementBackground = t.requirementBackground || t.primaryColor;
  t.requirementBorderColor = t.requirementBorderColor || t.primaryBorderColor;
  t.requirementBorderSize = t.requirementBorderSize || '1';
  t.requirementTextColor = t.requirementTextColor || t.primaryTextColor;
  t.relationColor = t.relationColor || t.lineColor;
  t.relationLabelBackground = t.relationLabelBackground || (darkMode ? darkenToHex(t.secondaryColor as string, 30) : t.secondaryColor);
  t.relationLabelColor = t.relationLabelColor || t.actorTextColor;
  t.git0 = t.git0 || t.primaryColor;
  t.git1 = t.git1 || t.secondaryColor;
  t.git2 = t.git2 || t.tertiaryColor;
  t.git3 = t.git3 || adjustToHex(t.primaryColor as string, { h: -30 });
  t.git4 = t.git4 || adjustToHex(t.primaryColor as string, { h: -60 });
  t.git5 = t.git5 || adjustToHex(t.primaryColor as string, { h: -90 });
  t.git6 = t.git6 || adjustToHex(t.primaryColor as string, { h: 60 });
  t.git7 = t.git7 || adjustToHex(t.primaryColor as string, { h: 120 });
  if (darkMode) {
    for (let i = 0; i < 8; i++) t['git' + i] = lightenToHex(t['git' + i] as string, 25);
  } else {
    for (let i = 0; i < 8; i++) t['git' + i] = darkenToHex(t['git' + i] as string, 25);
  }
  for (let i = 0; i < 8; i++) t['gitInv' + i] = t['gitInv' + i] || invertToHex(t['git' + i] as string);
  t.branchLabelColor = t.branchLabelColor || (darkMode ? 'black' : t.labelTextColor);
  for (let i = 0; i < 8; i++) t['gitBranchLabel' + i] = t['gitBranchLabel' + i] || t.branchLabelColor;
  t.tagLabelColor = t.tagLabelColor || t.primaryTextColor;
  t.tagLabelBackground = t.tagLabelBackground || t.primaryColor;
  t.tagLabelBorder = t.tagBorder || t.primaryBorderColor;
  t.tagLabelFontSize = t.tagLabelFontSize || '10px';
  t.commitLabelColor = t.commitLabelColor || t.secondaryTextColor;
  t.commitLabelBackground = t.commitLabelBackground || t.secondaryColor;
  t.commitLabelFontSize = t.commitLabelFontSize || '10px';
  t.attributeBackgroundColorOdd = t.attributeBackgroundColorOdd || t.primaryColor;
  t.attributeBackgroundColorEven = t.attributeBackgroundColorEven || adjustToHex(t.primaryColor as string, { h: 60, l: -10 });
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(t)) {
    if (key === 'darkMode') continue;
    if (key === 'radar' || key === 'xyChart') result[key] = JSON.stringify(value);
    else result[key] = String(value);
  }
  return result;
}

const THEME_COMMENT_RE = /%% @theme (\S+)\n?/m;

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

export function objectToYaml(obj: Record<string, any>, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${objectToYaml(value, indent + 2)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n${spaces}  - ${(value).join('\n' + spaces + '  - ')}\n`;
    } else if (typeof value === 'string') {
      result += `${spaces}${key}: '${value}'\n`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }
  return result;
}

interface YamlConfig {
  [key: string]: string | number | YamlConfig | undefined;
}

function parseYamlConfig(text: string): YamlConfig {
  const result: YamlConfig = {};
  const lines = text.split('\n');
  const stack: Array<{ obj: YamlConfig; indent: number }> = [{ obj: result, indent: -1 }];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---')) continue;
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    let current = stack[stack.length - 1].obj;
    const keyMarkers: Array<{ key: string; start: number; end: number }> = [];
    const keyRegex = /([\w.-]+):/g;
    let match;
    while ((match = keyRegex.exec(line)) !== null) {
      keyMarkers.push({ key: match[1], start: match.index, end: match.index + match[0].length });
    }
    if (keyMarkers.length === 0) continue;
    for (let i = 0; i < keyMarkers.length; i++) {
      const marker = keyMarkers[i];
      const nextMarker = keyMarkers[i + 1];
      const val = line.substring(marker.end, nextMarker ? nextMarker.start : line.length).trim();
      if (val === '' && i === keyMarkers.length - 1) {
        const newSection: YamlConfig = {};
        current[marker.key] = newSection;
        stack.push({ obj: newSection, indent: indent });
      } else if (val === '') {
        const newSection: YamlConfig = {};
        current[marker.key] = newSection;
        current = newSection;
      } else {
        current[marker.key] = val.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return result;
}

export function applyThemeToFrontmatter(
  content: string,
  theme: MermaidTheme,
  _darkMode: boolean,
): string {
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const cleanBody = stripped.replace(THEME_COMMENT_RE, '');

  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  const layoutConfig = {};
  const existingThemeVars: any = {};
  if (frontmatterMatch) {
    try {
      const yamlContent = frontmatterMatch[1];
      const configMatch = yamlContent.match(/config:\s*([\s\S]*)$/);
      if (configMatch) {
        const parsed = parseYamlConfig(configMatch[1]);
        for (const [key, value] of Object.entries(parsed)) {
          if (key === 'themeVariables') {
            if (typeof value === 'object' && value !== null) {
              for (const [tvKey, tvValue] of Object.entries(value)) {
                existingThemeVars[tvKey] = String(tvValue);
              }
            }
          } else if (key !== 'theme') {
            (layoutConfig as any)[key] = value;
          }
        }
      }
    } catch {
      // Silently ignore parsing errors
    }
  }

  const diagramType = detectDiagramType(stripped);
  const allowedVars = new Set(DIAGRAM_TYPE_VARIABLES[diagramType] || DIAGRAM_TYPE_VARIABLES.unknown);
  
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
    themeVariables.arrowheadColor = theme.coreColors.lineColor || themeVariables.lineColor || themeVariables.primaryColor;
  }

  if (diagramType === 'sequence') {
    if (!themeVariables.signalColor) themeVariables.signalColor = theme.coreColors.lineColor || themeVariables.lineColor;
    if (!themeVariables.signalTextColor) themeVariables.signalTextColor = theme.coreColors.textColor || themeVariables.textColor || themeVariables.primaryTextColor;
    if (!themeVariables.labelBoxBkgColor) themeVariables.labelBoxBkgColor = theme.coreColors.background || themeVariables.background;
    if (!themeVariables.labelBoxBorderColor) themeVariables.labelBoxBorderColor = theme.coreColors.primaryColor || themeVariables.primaryColor;
  } else if (diagramType === 'flowchart' || diagramType === 'graph') {
    if (!themeVariables.nodeBkg) themeVariables.nodeBkg = theme.coreColors.primaryColor || themeVariables.primaryColor;
    if (!themeVariables.nodeBorder) themeVariables.nodeBorder = theme.coreColors.primaryBorderColor || themeVariables.primaryBorderColor;
    if (!themeVariables.clusterBkg) themeVariables.clusterBkg = theme.coreColors.tertiaryColor || themeVariables.tertiaryColor;
  }

  // 4. Explicitly preserve/restore typography (safety)
  if (existingThemeVars.fontFamily) themeVariables.fontFamily = existingThemeVars.fontFamily;
  if (existingThemeVars.fontSize) themeVariables.fontSize = existingThemeVars.fontSize;

  // 4. Strip out any derived variables that might have been part of a previous 'mass dump'
  // but are NOT core colors of the current theme OR typography OR essential diagram-specific overrides.
  const coreKeys = new Set(Object.keys(theme.coreColors));
  const typographyKeys = new Set(['fontFamily', 'fontSize']);
  const essentialKeys = new Set(['signalColor', 'signalTextColor', 'arrowheadColor', 'nodeBkg', 'nodeBorder', 'clusterBkg', 'clusterBorder']);
  
  for (const key of Object.keys(themeVariables)) {
    if (!coreKeys.has(key) && !typographyKeys.has(key) && !essentialKeys.has(key) && allowedVars.has(key)) {
      // It's a derived variable that we want to strip to keep YAML clean
      delete themeVariables[key];
    }
  }

  const mergedConfig = {
    theme: theme.baseTheme ?? 'base',
    themeVariables,
    ...layoutConfig,
  };

  const yamlConfig = `---
config:
${objectToYaml(mergedConfig, 2)}---
`;
  return `${yamlConfig}\n%% @theme ${theme.id}\n${cleanBody}`;
}

export function removeThemeColorsFromFrontmatter(content: string): string {
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const cleanBody = stripped.replace(THEME_COMMENT_RE, '');
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  if (!frontmatterMatch) return cleanBody;

  const layoutConfig: any = {};
  const preservedThemeVars: any = {};
  
  try {
    const yamlContent = frontmatterMatch[1];
    const configMatch = yamlContent.match(/config:\s*([\s\S]*)$/);
    if (configMatch) {
      const parsed = parseYamlConfig(configMatch[1]);
      const diagramType = detectDiagramType(stripped);
      const derivedKeys = new Set(DIAGRAM_TYPE_VARIABLES[diagramType] || DIAGRAM_TYPE_VARIABLES.unknown);
      const typographyKeys = new Set(['fontFamily', 'fontSize']);

      for (const [key, value] of Object.entries(parsed)) {
        if (key === 'themeVariables' && typeof value === 'object' && value !== null) {
          for (const [tvKey, tvValue] of Object.entries(value)) {
            // Only preserve typography OR keys NOT in derived list AND NOT restricted
            if (typographyKeys.has(tvKey) || (!derivedKeys.has(tvKey) && !RESTRICTED_THEME_VARIABLES.has(tvKey))) {
              preservedThemeVars[tvKey] = String(tvValue);
            }
          }
        } else if (key !== 'theme') {
          layoutConfig[key] = value;
        }
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

  const yamlConfig = `---
config:
${objectToYaml(mergedConfig, 2)}---

${cleanBody}`;
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
  result[0] = coreColors.lineColor || (darkMode ? lightenToHex(coreColors.background, 40) : darkenToHex(coreColors.background, 40));
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
  styleOptions: StyleOptions & any,
  darkMode: boolean = false
): string {
  let stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const diagramType = detectDiagramType(stripped);
  let hasChanges = false;

  // 1. Apply direction change
  if (styleOptions.direction) {
    const dirMatch = stripped.match(/^(flowchart|graph)\s+(TD|TB|BT|LR|RL)/im);
    if (dirMatch && dirMatch[2].toUpperCase() !== styleOptions.direction.toUpperCase()) {
      stripped = stripped.replace(/^(flowchart|graph)\s+(TD|TB|BT|LR|RL)/im, `$1 ${styleOptions.direction}`);
      hasChanges = true;
    }
  }

  // 2. Apply global edge styles using linkStyle default
  const edgeStyleUpdates: Record<string, string> = {};
  if (styleOptions.edgeStrokeWidth !== undefined) edgeStyleUpdates.strokeWidth = `${styleOptions.edgeStrokeWidth}px`;
  if (styleOptions.edgeStrokeColor !== undefined) edgeStyleUpdates.stroke = styleOptions.edgeStrokeColor;
  if (styleOptions.edgeOpacity !== undefined) edgeStyleUpdates.opacity = `${styleOptions.edgeOpacity}`;
  if (styleOptions.edgeFontSize !== undefined) edgeStyleUpdates.fontSize = `${styleOptions.edgeFontSize}px`;
  if (styleOptions.edgeDasharray !== undefined) edgeStyleUpdates.strokeDasharray = styleOptions.edgeDasharray;
  if (styleOptions.edgeLabelColor !== undefined) edgeStyleUpdates.color = styleOptions.edgeLabelColor;
  if (styleOptions.edgeLabelBackgroundColor !== undefined) edgeStyleUpdates.fill = styleOptions.edgeLabelBackgroundColor;
  if (styleOptions.edgeLabelOpacity !== undefined) edgeStyleUpdates.fillOpacity = `${styleOptions.edgeLabelOpacity}`;

  // Only apply linkStyle to supported diagram types
  const diagramsSupportingLinkStyle = ['flowchart', 'graph', 'journey', 'blockDiagram', 'architectureDiagram'];

  if (Object.keys(edgeStyleUpdates).length > 0 && diagramsSupportingLinkStyle.includes(diagramType)) {
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

  // 3. Handle frontmatter/themeVariables
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  let existingConfig: any = {};
  if (frontmatterMatch) {
    try {
      const yamlContent = frontmatterMatch[1];
      const configMatch = yamlContent.match(/config:\s*([\s\S]*)$/);
      if (configMatch) existingConfig = parseYamlConfig(configMatch[1]);
    } catch {
      // Silently ignore parsing errors
    }
  }

  const newConfig: any = { ...existingConfig };

  // Helper to ensure themeVariables exists
  const ensureThemeVariables = () => {
    if (!newConfig.themeVariables) newConfig.themeVariables = existingConfig.themeVariables ? { ...existingConfig.themeVariables } : {};

    // Clean up if it was accidentally populated with restricted keys
    for (const key of Object.keys(newConfig.themeVariables)) {
      if (RESTRICTED_THEME_VARIABLES.has(key)) {
        delete newConfig.themeVariables[key];
      }
    }
  };

  if (styleOptions.fontFamily && existingConfig.themeVariables?.fontFamily !== styleOptions.fontFamily) {
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


  if (styleOptions.primaryColor && existingConfig.themeVariables?.primaryColor !== styleOptions.primaryColor) {
    ensureThemeVariables();
    newConfig.themeVariables.primaryColor = styleOptions.primaryColor;
    hasChanges = true;
  }

  // 4. Flowchart specific layout options
  if (diagramType === 'flowchart' || diagramType === 'graph') {
    const flowchartCfg: any = { ...(newConfig.flowchart || {}) };
    let hasFlowchartChanges = false;

    if (styleOptions.curveStyle !== undefined && flowchartCfg.curve !== styleOptions.curveStyle) {
      flowchartCfg.curve = styleOptions.curveStyle;
      hasFlowchartChanges = true;
    }
    if (styleOptions.nodePadding !== undefined && flowchartCfg.padding !== styleOptions.nodePadding) {
      flowchartCfg.padding = styleOptions.nodePadding;
      hasFlowchartChanges = true;
    }
    if (styleOptions.nodeSpacing !== undefined && flowchartCfg.nodeSpacing !== styleOptions.nodeSpacing) {
      flowchartCfg.nodeSpacing = styleOptions.nodeSpacing;
      hasFlowchartChanges = true;
    }
    if (styleOptions.rankSpacing !== undefined && flowchartCfg.rankSpacing !== styleOptions.rankSpacing) {
      flowchartCfg.rankSpacing = styleOptions.rankSpacing;
      hasFlowchartChanges = true;
    }

    if (hasFlowchartChanges) {
      newConfig.flowchart = flowchartCfg;
      hasChanges = true;
    }

    if (styleOptions.layoutEngine && newConfig.layout !== styleOptions.layoutEngine) {
      newConfig.layout = styleOptions.layoutEngine;
      hasChanges = true;
    }
  }

  // Only proceed if there are changes
  const themeVars = newConfig.themeVariables;
  const hasThemeVars = themeVars && Object.keys(themeVars).length > 0;
  if (!hasChanges && !hasThemeVars && !newConfig.flowchart && !newConfig.layout) {
    return content;
  }

  if (hasThemeVars) newConfig.theme = 'base';

  const yamlConfig = `---\nconfig:\n${objectToYaml(newConfig, 2)}---\n`;
  return yamlConfig + '\n\n' + stripped;
}

/**
 * Extract current style options from diagram content by parsing frontmatter and linkStyle directives.
 * This allows the UI to stay in sync with manual edits in the editor.
 */
export function extractStyleOptionsFromContent(content: string): Partial<import('@/types').DiagramStyleOptions> {
  const options: Partial<import('@/types').DiagramStyleOptions> = {};
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const diagramType = detectDiagramType(stripped);

  // 1. Extract from Frontmatter (config block)
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  if (frontmatterMatch) {
    try {
      const yamlContent = frontmatterMatch[1];
      const configMatch = yamlContent.match(/config:\s*([\s\S]*)$/);
      if (configMatch) {
        const config = parseYamlConfig(configMatch[1]);
        
        // Extract global theme variables
        if (config.themeVariables && typeof config.themeVariables === 'object') {
          const tv = config.themeVariables as Record<string, any>;
          if (tv.fontFamily) options.fontFamily = tv.fontFamily;
          if (tv.fontSize) {
            const fs = String(tv.fontSize);
            options.fontSize = parseInt(fs);
          }
          if (tv.primaryColor) options.primaryColor = tv.primaryColor;
        }

        // Extract flowchart specific options
        if (config.flowchart && typeof config.flowchart === 'object') {
          const fc = config.flowchart as Record<string, any>;
          if (fc.curve) options.curveStyle = fc.curve as any;
          if (fc.padding) options.nodePadding = parseInt(String(fc.padding));
          if (fc.nodeSpacing) options.nodeSpacing = parseInt(String(fc.nodeSpacing));
          if (fc.rankSpacing) options.rankSpacing = parseInt(String(fc.rankSpacing));
        }

        // Extract layout engine
        if (config.layout) options.layoutEngine = config.layout as any;
      }
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
  const diagramsSupportingLinkStyle = ['flowchart', 'graph', 'journey', 'blockDiagram', 'architectureDiagram'];
  if (diagramsSupportingLinkStyle.includes(diagramType)) {
    const linkStyles = parseLinkStyles(stripped);
    const defaultStyle = linkStyles.get('default');
    if (defaultStyle) {
      if (defaultStyle.stroke) options.edgeStrokeColor = defaultStyle.stroke;
      if (defaultStyle.strokeWidth) options.edgeStrokeWidth = parseInt(String(defaultStyle.strokeWidth));
      if (defaultStyle.opacity) options.edgeOpacity = parseFloat(String(defaultStyle.opacity));
      if (defaultStyle.fontSize) options.edgeFontSize = parseInt(String(defaultStyle.fontSize));
      if (defaultStyle.strokeDasharray) options.edgeDasharray = defaultStyle.strokeDasharray;
      if (defaultStyle.color) options.edgeLabelColor = defaultStyle.color;
      if (defaultStyle.fill) options.edgeLabelBackgroundColor = defaultStyle.fill;
      if (defaultStyle.fillOpacity) options.edgeLabelOpacity = parseFloat(String(defaultStyle.fillOpacity));
    }
  }

  return options;
}
