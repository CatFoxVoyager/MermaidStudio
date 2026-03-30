// src/constants/themeDerivation.ts
// Theme derivation engine that mirrors Mermaid's Theme.updateColors() exactly
// Reference: node_modules/mermaid/dist/chunks/mermaid.core/chunk-7R4GIKGN.mjs

import { adjust, darken, invert, isDark, lighten } from 'khroma';
import type { ThemeCoreColors, MermaidTheme } from '@/types';
import { builtinThemes } from '@/constants/themes';
import { detectDiagramType } from '@/lib/mermaid/core';

const THEME_COLOR_LIMIT = 12;

/** Default light theme for app-level fallback */
export const DEFAULT_LIGHT_THEME = builtinThemes.find(t => t.id === 'corporate-blue') ?? builtinThemes[0];

/** Default dark theme for app-level fallback */
export const DEFAULT_DARK_THEME = builtinThemes.find(t => t.id === 'dark-tech') ?? builtinThemes[0];

/** Border color generation - matches Mermaid's mkBorder exactly */
export function mkBorder(col: string, darkMode: boolean): string {
  return darkMode ? adjust(col, { s: -40, l: 10 }) : adjust(col, { s: -40, l: -10 });
}

/**
 * Derive all ~200 Mermaid themeVariables from ~20 core colors.
 * This mirrors Mermaid's Theme.updateColors() method exactly.
 *
 * @param coreColors - The user-defined core color slots
 * @param darkMode - Whether to use dark mode adjustments
 * @returns Record of all Mermaid themeVariables
 */
export function deriveThemeVariables(
  coreColors: ThemeCoreColors,
  darkMode: boolean
): Record<string, string> {
  const t: Record<string, string | boolean | number> = { ...coreColors, darkMode };

  // Step 1: Derive secondary/tertiary if not provided
  t.secondaryColor = t.secondaryColor || adjust(t.primaryColor as string, { h: -120 });
  t.tertiaryColor = t.tertiaryColor || adjust(t.primaryColor as string, { h: 180, l: 5 });

  // Step 2: Derive borders via mkBorder
  t.primaryBorderColor = t.primaryBorderColor || mkBorder(t.primaryColor as string, darkMode);
  t.secondaryBorderColor = t.secondaryBorderColor || mkBorder(t.secondaryColor as string, darkMode);
  t.tertiaryBorderColor = t.tertiaryBorderColor || mkBorder(t.tertiaryColor as string, darkMode);
  t.noteBorderColor = t.noteBorderColor || mkBorder(t.noteBkgColor as string || '#fff5ad', darkMode);

  // Step 3: Set note colors
  t.noteBkgColor = t.noteBkgColor || '#fff5ad';
  t.noteTextColor = t.noteTextColor || '#333';

  // Step 4: Derive text colors via invert
  t.primaryTextColor = t.primaryTextColor || (darkMode ? '#eee' : '#333');
  t.secondaryTextColor = t.secondaryTextColor || invert(t.secondaryColor as string);
  t.tertiaryTextColor = t.tertiaryTextColor || invert(t.tertiaryColor as string);
  t.lineColor = t.lineColor || invert(t.background as string);
  t.arrowheadColor = t.arrowheadColor || invert(t.background as string);
  t.textColor = t.textColor || t.primaryTextColor;
  t.border2 = t.border2 || t.tertiaryBorderColor;

  // Step 5: Map node/cluster/edge defaults
  t.nodeBkg = t.nodeBkg || t.primaryColor;
  t.mainBkg = t.mainBkg || t.primaryColor;
  t.nodeBorder = t.nodeBorder || t.primaryBorderColor;
  t.clusterBkg = t.clusterBkg || t.tertiaryColor;
  t.clusterBorder = t.clusterBorder || t.tertiaryBorderColor;
  t.defaultLinkColor = t.defaultLinkColor || t.lineColor;
  t.titleColor = t.titleColor || t.tertiaryTextColor;
  t.edgeLabelBackground = t.edgeLabelBackground || t.background;
  t.nodeTextColor = t.nodeTextColor || t.primaryTextColor;

  // Step 6: Sequence diagram colors
  t.actorBorder = t.actorBorder || t.primaryBorderColor;
  t.actorBkg = t.actorBkg || t.mainBkg;
  t.actorTextColor = t.actorTextColor || t.primaryTextColor;
  t.actorLineColor = t.actorLineColor || t.actorBorder;
  t.labelBoxBkgColor = t.labelBoxBkgColor || t.actorBkg;
  t.signalColor = t.signalColor || t.textColor;
  t.signalTextColor = t.signalTextColor || t.textColor;
  t.labelBoxBorderColor = t.labelBoxBorderColor || t.actorBorder;
  t.labelTextColor = t.labelTextColor || t.actorTextColor;
  t.loopTextColor = t.loopTextColor || t.actorTextColor;
  t.activationBorderColor = t.activationBorderColor || darken(t.secondaryColor as string, 10);
  t.activationBkgColor = t.activationBkgColor || t.secondaryColor;
  t.sequenceNumberColor = t.sequenceNumberColor || invert(t.lineColor as string);

  // Step 7: Section colors
  t.sectionBkgColor = t.sectionBkgColor || t.secondaryColor;
  t.altSectionBkgColor = t.altSectionBkgColor || 'white';
  t.sectionBkgColor2 = t.sectionBkgColor2 || t.primaryColor;
  t.excludeBkgColor = t.excludeBkgColor || '#eeeeee';

  // Step 8: Gantt chart colors
  t.taskBorderColor = t.taskBorderColor || t.primaryBorderColor;
  t.taskBkgColor = t.taskBkgColor || t.primaryColor;
  t.activeTaskBorderColor = t.activeTaskBorderColor || t.primaryColor;
  t.activeTaskBkgColor = t.activeTaskBkgColor || lighten(t.primaryColor as string, 23);
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
  t.taskTextColor = t.taskTextColor || t.primaryTextColor;
  t.taskTextDarkColor = t.taskTextDarkColor || t.textColor;
  t.taskTextClickableColor = t.taskTextClickableColor || '#003163';

  // Step 9: C4/Person colors
  t.personBorder = t.personBorder || t.primaryBorderColor;
  t.personBkg = t.personBkg || t.mainBkg;

  // Step 10: rowOdd/rowEven with darkMode branching
  if (darkMode) {
    t.rowOdd = t.rowOdd || darken(t.mainBkg as string, 5) || '#ffffff';
    t.rowEven = t.rowEven || darken(t.mainBkg as string, 10);
  } else {
    t.rowOdd = t.rowOdd || lighten(t.mainBkg as string, 75) || '#ffffff';
    t.rowEven = t.rowEven || lighten(t.mainBkg as string, 5);
  }

  // Step 11: State diagram colors
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

  // Step 12: cScale0-11 palette
  t.cScale0 = t.cScale0 || t.primaryColor;
  t.cScale1 = t.cScale1 || t.secondaryColor;
  t.cScale2 = t.cScale2 || t.tertiaryColor;
  t.cScale3 = t.cScale3 || adjust(t.primaryColor as string, { h: 30 });
  t.cScale4 = t.cScale4 || adjust(t.primaryColor as string, { h: 60 });
  t.cScale5 = t.cScale5 || adjust(t.primaryColor as string, { h: 90 });
  t.cScale6 = t.cScale6 || adjust(t.primaryColor as string, { h: 120 });
  t.cScale7 = t.cScale7 || adjust(t.primaryColor as string, { h: 150 });
  t.cScale8 = t.cScale8 || adjust(t.primaryColor as string, { h: 210, l: 150 });
  t.cScale9 = t.cScale9 || adjust(t.primaryColor as string, { h: 270 });
  t.cScale10 = t.cScale10 || adjust(t.primaryColor as string, { h: 300 });
  t.cScale11 = t.cScale11 || adjust(t.primaryColor as string, { h: 330 });

  // Step 13: Darken/lighten cScale based on darkMode
  if (darkMode) {
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
      const key = 'cScale' + i;
      t[key] = darken(t[key] as string, 75);
    }
  } else {
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
      const key = 'cScale' + i;
      t[key] = darken(t[key] as string, 25);
    }
  }

  // Step 14: cScaleInv (inverted)
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    const key = 'cScale' + i;
    const invKey = 'cScaleInv' + i;
    t[invKey] = t[invKey] || invert(t[key] as string);
  }

  // Step 15: cScalePeer (darken/lighten variants)
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    const key = 'cScale' + i;
    const peerKey = 'cScalePeer' + i;
    if (darkMode) {
      t[peerKey] = t[peerKey] || lighten(t[key] as string, 10);
    } else {
      t[peerKey] = t[peerKey] || darken(t[key] as string, 10);
    }
  }

  t.scaleLabelColor = t.scaleLabelColor || t.labelTextColor;
  for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
    const labelKey = 'cScaleLabel' + i;
    t[labelKey] = t[labelKey] || t.scaleLabelColor;
  }

  // Step 16: surface colors
  const multiplier = darkMode ? -4 : -1;
  for (let i = 0; i < 5; i++) {
    const surfaceKey = 'surface' + i;
    const surfacePeerKey = 'surfacePeer' + i;
    t[surfaceKey] = t[surfaceKey] || adjust(t.mainBkg as string, { h: 180, s: -15, l: multiplier * (5 + i * 3) });
    t[surfacePeerKey] = t[surfacePeerKey] || adjust(t.mainBkg as string, { h: 180, s: -15, l: multiplier * (8 + i * 3) });
  }

  // Step 17: fillType0-7 (journey diagrams)
  t.classText = t.classText || t.textColor;
  t.fillType0 = t.fillType0 || t.primaryColor;
  t.fillType1 = t.fillType1 || t.secondaryColor;
  t.fillType2 = t.fillType2 || adjust(t.primaryColor as string, { h: 64 });
  t.fillType3 = t.fillType3 || adjust(t.secondaryColor as string, { h: 64 });
  t.fillType4 = t.fillType4 || adjust(t.primaryColor as string, { h: -64 });
  t.fillType5 = t.fillType5 || adjust(t.secondaryColor as string, { h: -64 });
  t.fillType6 = t.fillType6 || adjust(t.primaryColor as string, { h: 128 });
  t.fillType7 = t.fillType7 || adjust(t.secondaryColor as string, { h: 128 });

  // Step 18: pie1-12 colors
  t.pie1 = t.pie1 || t.primaryColor;
  t.pie2 = t.pie2 || t.secondaryColor;
  t.pie3 = t.pie3 || t.tertiaryColor;
  t.pie4 = t.pie4 || adjust(t.primaryColor as string, { l: -10 });
  t.pie5 = t.pie5 || adjust(t.secondaryColor as string, { l: -10 });
  t.pie6 = t.pie6 || adjust(t.tertiaryColor as string, { l: -10 });
  t.pie7 = t.pie7 || adjust(t.primaryColor as string, { h: 60, l: -10 });
  t.pie8 = t.pie8 || adjust(t.primaryColor as string, { h: -60, l: -10 });
  t.pie9 = t.pie9 || adjust(t.primaryColor as string, { h: 120, l: 0 });
  t.pie10 = t.pie10 || adjust(t.primaryColor as string, { h: 60, l: -20 });
  t.pie11 = t.pie11 || adjust(t.primaryColor as string, { h: -60, l: -20 });
  t.pie12 = t.pie12 || adjust(t.primaryColor as string, { h: 120, l: -10 });
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

  // Step 19: venn1-8 colors
  t.venn1 = t.venn1 ?? adjust(t.primaryColor as string, { l: -30 });
  t.venn2 = t.venn2 ?? adjust(t.secondaryColor as string, { l: -30 });
  t.venn3 = t.venn3 ?? adjust(t.tertiaryColor as string, { l: -30 });
  t.venn4 = t.venn4 ?? adjust(t.primaryColor as string, { h: 60, l: -30 });
  t.venn5 = t.venn5 ?? adjust(t.primaryColor as string, { h: -60, l: -30 });
  t.venn6 = t.venn6 ?? adjust(t.secondaryColor as string, { h: 60, l: -30 });
  t.venn7 = t.venn7 ?? adjust(t.primaryColor as string, { h: 120, l: -30 });
  t.venn8 = t.venn8 ?? adjust(t.secondaryColor as string, { h: 120, l: -30 });
  t.vennTitleTextColor = t.vennTitleTextColor ?? t.titleColor;
  t.vennSetTextColor = t.vennSetTextColor ?? t.textColor;

  // Step 20: radar nested object
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

  // Step 21: architecture colors
  t.archEdgeColor = t.archEdgeColor || '#777';
  t.archEdgeArrowColor = t.archEdgeArrowColor || '#777';
  t.archEdgeWidth = t.archEdgeWidth || '3';
  t.archGroupBorderColor = t.archGroupBorderColor || '#000';
  t.archGroupBorderWidth = t.archGroupBorderWidth || '2px';

  // Step 22: quadrant colors
  t.quadrant1Fill = t.quadrant1Fill || t.primaryColor;
  t.quadrant2Fill = t.quadrant2Fill || adjust(t.primaryColor as string, { r: 5, g: 5, b: 5 });
  t.quadrant3Fill = t.quadrant3Fill || adjust(t.primaryColor as string, { r: 10, g: 10, b: 10 });
  t.quadrant4Fill = t.quadrant4Fill || adjust(t.primaryColor as string, { r: 15, g: 15, b: 15 });
  t.quadrant1TextFill = t.quadrant1TextFill || t.primaryTextColor;
  t.quadrant2TextFill = t.quadrant2TextFill || adjust(t.primaryTextColor as string, { r: -5, g: -5, b: -5 });
  t.quadrant3TextFill = t.quadrant3TextFill || adjust(t.primaryTextColor as string, { r: -10, g: -10, b: -10 });
  t.quadrant4TextFill = t.quadrant4TextFill || adjust(t.primaryTextColor as string, { r: -15, g: -15, b: -15 });
  t.quadrantPointFill = t.quadrantPointFill || (isDark(t.quadrant1Fill as string) ? lighten(t.quadrant1Fill as string) : darken(t.quadrant1Fill as string));
  t.quadrantPointTextFill = t.quadrantPointTextFill || t.primaryTextColor;
  t.quadrantXAxisTextFill = t.quadrantXAxisTextFill || t.primaryTextColor;
  t.quadrantYAxisTextFill = t.quadrantYAxisTextFill || t.primaryTextColor;
  t.quadrantInternalBorderStrokeFill = t.quadrantInternalBorderStrokeFill || t.primaryBorderColor;
  t.quadrantExternalBorderStrokeFill = t.quadrantExternalBorderStrokeFill || t.primaryBorderColor;
  t.quadrantTitleFill = t.quadrantTitleFill || t.primaryTextColor;

  // Step 23: xyChart nested object
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
    plotColorPalette: (t.xyChart as any)?.plotColorPalette || '#FFF4DD,#FFD8B1,#FFA07A,#ECEFF1,#D6DBDF,#C3E0A8,#FFB6A4,#FFD74D,#738FA7,#FFFFF0',
  };

  // Step 24: requirement colors
  t.requirementBackground = t.requirementBackground || t.primaryColor;
  t.requirementBorderColor = t.requirementBorderColor || t.primaryBorderColor;
  t.requirementBorderSize = t.requirementBorderSize || '1';
  t.requirementTextColor = t.requirementTextColor || t.primaryTextColor;
  t.relationColor = t.relationColor || t.lineColor;
  t.relationLabelBackground = t.relationLabelBackground || (darkMode ? darken(t.secondaryColor as string, 30) : t.secondaryColor);
  t.relationLabelColor = t.relationLabelColor || t.actorTextColor;

  // Step 25: git0-7 colors
  t.git0 = t.git0 || t.primaryColor;
  t.git1 = t.git1 || t.secondaryColor;
  t.git2 = t.git2 || t.tertiaryColor;
  t.git3 = t.git3 || adjust(t.primaryColor as string, { h: -30 });
  t.git4 = t.git4 || adjust(t.primaryColor as string, { h: -60 });
  t.git5 = t.git5 || adjust(t.primaryColor as string, { h: -90 });
  t.git6 = t.git6 || adjust(t.primaryColor as string, { h: 60 });
  t.git7 = t.git7 || adjust(t.primaryColor as string, { h: 120 });

  // Step 26: git dark/light adjustments
  if (darkMode) {
    t.git0 = lighten(t.git0 as string, 25);
    t.git1 = lighten(t.git1 as string, 25);
    t.git2 = lighten(t.git2 as string, 25);
    t.git3 = lighten(t.git3 as string, 25);
    t.git4 = lighten(t.git4 as string, 25);
    t.git5 = lighten(t.git5 as string, 25);
    t.git6 = lighten(t.git6 as string, 25);
    t.git7 = lighten(t.git7 as string, 25);
  } else {
    t.git0 = darken(t.git0 as string, 25);
    t.git1 = darken(t.git1 as string, 25);
    t.git2 = darken(t.git2 as string, 25);
    t.git3 = darken(t.git3 as string, 25);
    t.git4 = darken(t.git4 as string, 25);
    t.git5 = darken(t.git5 as string, 25);
    t.git6 = darken(t.git6 as string, 25);
    t.git7 = darken(t.git7 as string, 25);
  }

  // Step 27: gitInv0-7 (inverted git colors)
  t.gitInv0 = t.gitInv0 || invert(t.git0 as string);
  t.gitInv1 = t.gitInv1 || invert(t.git1 as string);
  t.gitInv2 = t.gitInv2 || invert(t.git2 as string);
  t.gitInv3 = t.gitInv3 || invert(t.git3 as string);
  t.gitInv4 = t.gitInv4 || invert(t.git4 as string);
  t.gitInv5 = t.gitInv5 || invert(t.git5 as string);
  t.gitInv6 = t.gitInv6 || invert(t.git6 as string);
  t.gitInv7 = t.gitInv7 || invert(t.git7 as string);

  // Step 28: branch and tag label colors
  t.branchLabelColor = t.branchLabelColor || (darkMode ? 'black' : t.labelTextColor);
  t.gitBranchLabel0 = t.gitBranchLabel0 || t.branchLabelColor;
  t.gitBranchLabel1 = t.gitBranchLabel1 || t.branchLabelColor;
  t.gitBranchLabel2 = t.gitBranchLabel2 || t.branchLabelColor;
  t.gitBranchLabel3 = t.gitBranchLabel3 || t.branchLabelColor;
  t.gitBranchLabel4 = t.gitBranchLabel4 || t.branchLabelColor;
  t.gitBranchLabel5 = t.gitBranchLabel5 || t.branchLabelColor;
  t.gitBranchLabel6 = t.gitBranchLabel6 || t.branchLabelColor;
  t.gitBranchLabel7 = t.gitBranchLabel7 || t.branchLabelColor;
  t.tagLabelColor = t.tagLabelColor || t.primaryTextColor;
  t.tagLabelBackground = t.tagLabelBackground || t.primaryColor;
  t.tagLabelBorder = t.tagBorder || t.primaryBorderColor;
  t.tagLabelFontSize = t.tagLabelFontSize || '10px';
  t.commitLabelColor = t.commitLabelColor || t.secondaryTextColor;
  t.commitLabelBackground = t.commitLabelBackground || t.secondaryColor;
  t.commitLabelFontSize = t.commitLabelFontSize || '10px';

  // Step 29: attribute background colors (ER diagrams)
  const oldAttributeBackgroundColorOdd = t.primaryColor;
  const oldAttributeBackgroundColorEven = adjust(t.primaryColor as string, { h: 60, l: -10 });
  t.attributeBackgroundColorOdd = t.attributeBackgroundColorOdd || oldAttributeBackgroundColorOdd;
  t.attributeBackgroundColorEven = t.attributeBackgroundColorEven || oldAttributeBackgroundColorEven;

  // Convert all values to strings for return type
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(t)) {
    if (key === 'darkMode') continue; // Don't include darkMode in themeVariables
    if (key === 'radar' || key === 'xyChart') {
      result[key] = JSON.stringify(value);
    } else if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      result[key] = String(value);
    }
  }

  return result;
}

/**
 * Apply a theme to diagram content via YAML frontmatter.
 * Only writes the coreColors (~10 values) as themeVariables — Mermaid derives the rest.
 * Preserves existing layout config (flowchart.curve, spacing, etc.) from Advanced Style.
 * Adds %% @theme comment for MermaidStudio detection.
 */
export function applyThemeToFrontmatter(
  content: string,
  theme: MermaidTheme,
  _darkMode: boolean,
): string {
  // Strip existing YAML frontmatter
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  // Remove existing %% @theme comment
  const cleanBody = stripped.replace(THEME_COMMENT_RE, '');

  // Parse existing layout config (from Advanced Style) to preserve it
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  const layoutConfig: Record<string, unknown> = {};
  if (frontmatterMatch) {
    try {
      const yamlContent = frontmatterMatch[1];
      const configMatch = yamlContent.match(/config:\s*\n([\s\S]*?)(?=\n---|\n\s*\n|\s*$)/);
      if (configMatch) {
        const parsed = parseYamlConfig(configMatch[1]);
        for (const [key, value] of Object.entries(parsed)) {
          if (key === 'theme' || key === 'themeVariables' || key === '__line') continue;
          layoutConfig[key] = value;
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Only include coreColors — Mermaid derives the rest automatically
  const themeVariables: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.coreColors)) {
    if (value !== undefined && value !== null) {
      themeVariables[key] = value;
    }
  }

  const mergedConfig: Record<string, unknown> = {
    theme: theme.baseTheme ?? 'base',
    themeVariables,
    ...layoutConfig,
  };

  const yamlConfig = `---
config:
${configToYaml(mergedConfig)}---
`;

  return `${yamlConfig}\n%% @theme ${theme.id}\n${cleanBody}`;
}

/**
 * Apply a theme to diagram content via YAML frontmatter.
 * Wraps content in YAML config with themeVariables.
 * @deprecated This function is kept for backward compatibility with existing tests.
 * For new code, use render-time theming via `setDiagramTheme()` and `renderDiagram(content, id, themeId)`.
 */
export function applyThemeToFrontmatterLegacy(
  content: string,
  theme: MermaidTheme,
  darkMode: boolean
): string {
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const themeVariables = deriveThemeVariables(theme.coreColors, darkMode);

  const yamlConfig = `---
config:
  theme: '${theme.baseTheme ?? 'base'}'
  themeVariables:
${objectToYaml(themeVariables, 4)}---
`;

  return yamlConfig + '\n\n' + stripped;
}

/**
 * Get 8 swatch colors for theme card display.
 * Derives colors from ThemeCoreColors using the same logic as deriveThemeVariables.
 *
 * @param coreColors - The core colors from a MermaidTheme
 * @param darkMode - Whether dark mode is active
 * @returns Array of 8 color strings for swatch display
 */
export function getSwatchColors(coreColors: ThemeCoreColors, darkMode: boolean): string[] {
  const result: string[] = [];

  // Put vivid/identity colors first, pale fills last
  // 1. Line color (the bold identity color — e.g. #0066CC for Corporate Blue)
  result[0] = coreColors.lineColor || invert(coreColors.background);

  // 2. Primary fill (lighter, e.g. #daeaf2)
  result[1] = coreColors.primaryColor;

  // 3. Secondary fill
  result[2] = coreColors.secondaryColor || adjust(coreColors.primaryColor, { h: -120 });

  // 4. Background
  result[3] = coreColors.background;

  // 5. Success
  result[4] = coreColors.successColor || adjust(coreColors.primaryColor, { h: 120 });

  // 6. Warning
  result[5] = coreColors.warningColor || adjust(coreColors.primaryColor, { h: 45 });

  // 7. Error
  result[6] = coreColors.errorColor || adjust(coreColors.primaryColor, { h: 0, s: 80 });

  // 8. Info
  result[7] = coreColors.infoColor || adjust(coreColors.primaryColor, { h: 200 });

  return result;
}

/**
 * Apply C4-specific styling from a theme.
 * Generates UpdateElementStyle/UpdateRelStyle directives from theme colors.
 */
export function applyC4FromTheme(content: string, theme: MermaidTheme): string {
  const cleaned = stripC4Directives(content);
  const body = cleaned.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();

  const { primaryColor, background } = theme.coreColors;

  // Derive secondary and tertiary if not set
  const secondary = theme.coreColors.secondaryColor || adjust(primaryColor, { h: -120 });
  const tertiary = theme.coreColors.tertiaryColor || adjust(primaryColor, { h: 180, l: 5 });

  // Use khroma's invert for contrast color
  const contrast = invert(primaryColor);

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

/**
 * Strip UpdateElementStyle and UpdateRelStyle directives from C4 diagram content.
 */
export function stripC4Directives(content: string): string {
  return content
    .replace(/^[ \t]*UpdateElementStyle\s*\([^)]*\)\s*$/gm, '')
    .replace(/^[ \t]*UpdateRelStyle\s*\([^)]*\)\s*$/gm, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Strip YAML frontmatter and all theme-related directives from content.
 */
export function stripThemeDirective(content: string): string {
  let cleaned = content;

  // Strip YAML frontmatter
  cleaned = cleaned.replace(/^\s*---[\s\S]*?---\s*/i, '');

  // Strip %%{init}%% blocks
  cleaned = cleaned.replace(/%%{init[\s\S]*?}%%/gi, '');

  // Strip %% @theme comments (MermaidStudio theme metadata)
  cleaned = cleaned.replace(/^%% @theme \S+\n?/gm, '');

  // Strip classDef and class directives EXCEPT for preset classes
  // Presets use classDef presetPrimary, presetSuccess, presetWarning, presetDanger, presetInfo
  // and class assignments like "class A presetWarning"
  const presetClasses = /\b(presetPrimary|presetSuccess|presetWarning|presetDanger|presetInfo)\b/;
  cleaned = cleaned.replace(/^[ \t]*classDef\s+(?!.*\bpreset(?:Primary|Success|Warning|Danger|Info)\b).*$/gm, '');
  // Strip class lines EXCEPT those that assign nodes to preset classes
  cleaned = cleaned.replace(/^[ \t]*class\s+.*$/gm, (match) => {
    // Keep if line contains a preset class reference
    if (presetClasses.test(match)) {
      return match; // Keep the line
    }
    return ''; // Remove the line
  });

  // Strip C4 directives
  cleaned = stripC4Directives(cleaned);

  // Clean up blank lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return cleaned;
}

/**
 * Convert object to YAML string with proper indentation.
 * Ported from colorPalettes.ts
 */
type YamlValue = string | number | boolean | YamlConfig | unknown[];

export function objectToYaml(obj: Record<string, YamlValue>, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Nested object
      result += `${spaces}${key}:\n${objectToYaml(value as Record<string, YamlValue>, indent + 2)}`;
    } else if (Array.isArray(value)) {
      // Array
      result += `${spaces}${key}:\n${spaces}  - ${(value as unknown[]).join('\n' + spaces + '  - ')}\n`;
    } else if (typeof value === 'string') {
      // Always quote string values for Mermaid compatibility
      result += `${spaces}${key}: '${value}'\n`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}

/**
 * Simplified version: prepend base theme config to content.
 */
export function addBaseThemeConfig(content: string): string {
  const stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();

  const baseConfig: Record<string, unknown> = {
    theme: 'base',
    themeVariables: {
      primaryColor: '#daeaf2',
    },
  };

  return `---\nconfig:\n${objectToYaml(baseConfig, 2)}---\n\n${stripped}`;
}

/**
 * Extract style options from existing YAML config in content.
 * Parses existing config to populate style options in UI.
 */
interface StyleOptions {
  theme?: string;
  fontFamily?: string;
  fontSize?: string;
  layout?: string;
  direction?: string;
  flowchart?: {
    curve?: string;
    padding?: string;
    nodeSpacing?: string;
    rankSpacing?: string;
  };
  [key: string]: unknown;
}

export function extractStyleOptionsFromContent(content: string): StyleOptions {
  const frontmatterMatch = content.match(/^\s*---[\s\S]*?---\s*/i);
  if (!frontmatterMatch) {
    return {};
  }

  try {
    const yamlContent = frontmatterMatch[0].replace(/---\s*/, '').trim();
    const configMatch = yamlContent.match(/config:\s*\n([\s\S]*?)(?=\n---|\n\s*\n|\s*$)/);
    if (!configMatch) return {};

    const configText = configMatch[1];
    const options: StyleOptions = {};

    const parseKeyValue = (line: string, key: string, targetKey?: string) => {
      const match = line.match(new RegExp(`^\\s*${key}:\\s*(.+)$`));
      if (match) {
        const value = match[1].trim().replace(/^['"]|['"]$/g, '');
        if (targetKey) {
          if (!options[targetKey]) {
            options[targetKey] = {};
          }
          (options[targetKey] as Record<string, string>)[key] = value;
        } else {
          options[key] = value;
        }
      }
    };

    const lines = configText.split('\n');
    for (const line of lines) {
      if (line.includes('flowchart:')) {
        const flowchartMatch = line.match(/flowchart:\s*\n([\s\S]*?)(?=\n\s*\w|\n---|\s*$)/);
        if (flowchartMatch) {
          const flowchartText = flowchartMatch[1];
          for (const fc of flowchartText.split('\n')) {
            parseKeyValue(fc, 'curve', 'flowchart');
            parseKeyValue(fc, 'padding', 'flowchart');
            parseKeyValue(fc, 'nodeSpacing', 'flowchart');
            parseKeyValue(fc, 'rankSpacing', 'flowchart');
          }
        }
      }
      parseKeyValue(line, 'theme');
      parseKeyValue(line, 'fontFamily');
      parseKeyValue(line, 'fontSize');
      parseKeyValue(line, 'layout');
    }

    return options;
  } catch {
    return {};
  }
}

/**
 * Apply style options to diagram content via YAML frontmatter.
 * Updates existing config or creates new one as needed.
 */
interface FlowchartConfig {
  curve?: string;
  padding?: string;
  nodeSpacing?: string;
  rankSpacing?: string;
}

export function applyStyleToContent(
  content: string,
  styleOptions: StyleOptions & {
    direction?: string;
    primaryColor?: string;
    fontSize?: string | number;
    diagramMarginX?: number;
    diagramMarginY?: number;
    actorMargin?: number;
    actorWidth?: number;
    actorHeight?: number;
    mirrorActors?: boolean;
    barHeight?: number;
    barGap?: number;
    topPadding?: number;
    leftPadding?: number;
    axisFormat?: string;
    curveStyle?: string;
    nodePadding?: number;
    nodeSpacing?: number;
    rankSpacing?: number;
    layoutEngine?: string;
  },
  darkMode: boolean = false
): string {

  let stripped = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();

  const diagramType = detectDiagramType(stripped);
  let hasChanges = false;

  // Apply direction change — only if actually different
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

  // Check if there's existing frontmatter with config
  const frontmatterMatch = content.match(/^\s*---([\s\S]*?)---\s*/i);
  let existingConfig: YamlConfig = {};

  if (frontmatterMatch) {
    try {
      const yamlContent = frontmatterMatch[1];
      const configMatch = yamlContent.match(/config:\s*\n([\s\S]*?)(?=\n---|\n\s*\n|\s*$)/);
      if (configMatch) {
        existingConfig = parseYamlConfig(configMatch[1]);
      }
    } catch {
      // If parsing fails, treat as no existing config
    }
  }

  // Build new config
  const newConfig: YamlConfig = { ...existingConfig };

  // Helper to set config value if different
  const setConfig = (path: string[], value: string | number | boolean) => {
    if (value === undefined || value === null) return;

    let current: YamlConfig = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]] as YamlConfig;
    }

    const key = path[path.length - 1];
    if (current[key] !== value) {
      current[key] = value;
      hasChanges = true;
    }
  };

  // Apply style options based on diagram type
  const type = diagramType || 'flowchart';

  // Helper to ensure themeVariables object exists and preserves existing values
  const ensureThemeVariables = () => {
    if (!newConfig.themeVariables) {
      newConfig.themeVariables = existingConfig.themeVariables ?
        { ...existingConfig.themeVariables as YamlConfig } :
        {};
    }
  };

  // Font/color settings — only apply if value differs from existing config
  if (styleOptions.fontFamily &&
      (existingConfig.themeVariables as YamlConfig)?.fontFamily !== styleOptions.fontFamily) {
    ensureThemeVariables();
    (newConfig.themeVariables as YamlConfig).fontFamily = styleOptions.fontFamily;
    hasChanges = true;
  }
  if (styleOptions.fontSize) {
    const raw = String(styleOptions.fontSize);
    const normalized = raw.endsWith('px') ? raw : raw + 'px';
    if ((existingConfig.themeVariables as YamlConfig)?.fontSize !== normalized) {
      ensureThemeVariables();
      (newConfig.themeVariables as YamlConfig).fontSize = normalized;
      hasChanges = true;
    }
  }
  if (styleOptions.primaryColor &&
      (existingConfig.themeVariables as YamlConfig)?.primaryColor !== styleOptions.primaryColor) {
    ensureThemeVariables();
    (newConfig.themeVariables as YamlConfig).primaryColor = styleOptions.primaryColor;
    hasChanges = true;
  }

  // Type-specific options
  switch (type) {
    case 'sequence':
    case 'sequencediagram':
      if (styleOptions.diagramMarginX !== undefined) setConfig(['diagramMarginX'], styleOptions.diagramMarginX);
      if (styleOptions.diagramMarginY !== undefined) setConfig(['diagramMarginY'], styleOptions.diagramMarginY);
      if (styleOptions.actorMargin !== undefined) setConfig(['actorMargin'], styleOptions.actorMargin);
      if (styleOptions.actorWidth !== undefined) setConfig(['width'], styleOptions.actorWidth);
      if (styleOptions.actorHeight !== undefined) setConfig(['height'], styleOptions.actorHeight);
      if (styleOptions.mirrorActors !== undefined) setConfig(['mirrorActors'], styleOptions.mirrorActors);
      break;

    case 'gantt':
      if (styleOptions.barHeight !== undefined) setConfig(['barHeight'], styleOptions.barHeight);
      if (styleOptions.barGap !== undefined) setConfig(['barGap'], styleOptions.barGap);
      if (styleOptions.topPadding !== undefined) setConfig(['topPadding'], styleOptions.topPadding);
      if (styleOptions.leftPadding !== undefined) setConfig(['leftPadding'], styleOptions.leftPadding);
      if (styleOptions.axisFormat !== undefined) setConfig(['axisFormat'], styleOptions.axisFormat);
      break;

    case 'flowchart':
    case 'graph':
    case 'stateDiagram':
    case 'state':
    case 'classDiagram':
    case 'class':
    case 'erDiagram':
    case 'er':
    case 'journey':
    case 'c4':
    case 'block':
    case 'blockDiagram':
    case 'architecture':
    case 'architectureDiagram': {
      const flowchartCfg: FlowchartConfig = {};
      if (styleOptions.curveStyle !== undefined) {
        flowchartCfg.curve = styleOptions.curveStyle;
        hasChanges = true;
      }
      if (styleOptions.nodePadding !== undefined) {
        flowchartCfg.padding = String(styleOptions.nodePadding);
        hasChanges = true;
      }
      if (styleOptions.nodeSpacing !== undefined) {
        flowchartCfg.nodeSpacing = String(styleOptions.nodeSpacing);
        hasChanges = true;
      }
      if (styleOptions.rankSpacing !== undefined) {
        flowchartCfg.rankSpacing = String(styleOptions.rankSpacing);
        hasChanges = true;
      }
      if (Object.keys(flowchartCfg).length > 0) {
        newConfig.flowchart = { ...(existingConfig.flowchart as YamlConfig || {}), ...flowchartCfg };
        hasChanges = true;
      }
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        newConfig.layout = styleOptions.layoutEngine;
        hasChanges = true;
      }
      break;
    }

    case 'mindmap':
      if (styleOptions.layoutEngine && styleOptions.layoutEngine !== 'dagre') {
        newConfig.layout = styleOptions.layoutEngine;
        hasChanges = true;
      }
      break;
  }

  // Only generate YAML if there are actual changes
  if (!hasChanges) {
    return content;
  }

  // Set theme to base if we have themeVariables
  if (newConfig.themeVariables && typeof newConfig.themeVariables === 'object' &&
      Object.keys(newConfig.themeVariables).length > 0) {
    newConfig.theme = 'base';
  }

  // Generate YAML frontmatter
  const yamlConfig = `---
config:
${configToYaml(newConfig as Record<string, YamlValue>)}---
`;

  return yamlConfig + '\n\n' + stripped;
}

/**
 * Simple YAML config parser - extracts key-value pairs from config section
 */
interface YamlConfig {
  [key: string]: string | number | YamlConfig | undefined;
  __line?: string;
}

function parseYamlConfig(configText: string): YamlConfig {
  const config: YamlConfig = {};
  const lines = configText.split('\n');
  let currentSection: YamlConfig;
  const sectionStack: YamlConfig[] = [config];

  const getIndent = (line: string): number => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  for (const line of lines) {
    const indent = getIndent(line);
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Adjust stack based on indentation
    while (sectionStack.length > 1 && getIndent(sectionStack[sectionStack.length - 1]?.__line || '') >= indent) {
      sectionStack.pop();
    }
    currentSection = sectionStack[sectionStack.length - 1];

    // Check for nested section (ends with :)
    if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
      const key = trimmed.slice(0, -1);
      const newSection: YamlConfig = {};
      newSection.__line = line;
      currentSection[key] = newSection;
      sectionStack.push(newSection);
    } else {
      // Key-value pair
      const match = trimmed.match(/^([\w.-]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        currentSection[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  return config;
}

// ── Theme comment helpers ────────────────────────────────────────────────────
// %% @theme <themeId> is a MermaidStudio-specific comment embedded in diagram
// content so that copy-pasting a diagram preserves the theme selection.

const THEME_COMMENT_RE = /^%% @theme (\S+)\n?/m;

/** Extract themeId from a `%% @theme <id>` comment in diagram content. */
export function extractThemeIdFromContent(content: string): string | null {
  const match = content.match(THEME_COMMENT_RE);
  return match ? match[1] : null;
}

/**
 * Inject or remove a `%% @theme <id>` comment in diagram content.
 * Placed after any YAML frontmatter so it doesn't break Mermaid parsing.
 * Pass `null` to remove the comment.
 */
export function injectThemeComment(content: string, themeId: string | null): string {
  // Remove existing theme comment
  const cleaned = content.replace(THEME_COMMENT_RE, '');

  if (!themeId) return cleaned;

  const comment = `%% @theme ${themeId}\n`;

  // If content starts with YAML frontmatter, place comment after it
  const yamlMatch = cleaned.match(/^(\s*---[\s\S]*?---\s*\n)/);
  if (yamlMatch) {
    return cleaned.replace(yamlMatch[1], `$1${comment}`);
  }

  // No YAML frontmatter — place at the very beginning
  return `${comment}${cleaned}`;
}

/**
 * Convert config object to YAML string
 */
function configToYaml(config: Record<string, YamlValue>, indent: number = 2): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(config)) {
    if (key === '__line') continue;
    if (value === undefined || value === null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      result += configToYaml(value as Record<string, YamlValue>, indent + 2);
    } else if (typeof value === 'boolean') {
      result += `${spaces}${key}: ${value}\n`;
    } else if (typeof value === 'string') {
      // Quote string values
      result += `${spaces}${key}: '${value}'\n`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}
