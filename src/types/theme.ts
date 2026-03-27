// src/types/theme.ts
// Theme types for the MermaidStudio theme system (replaces ColorPalette)

/** The ~20 core color slots users edit in the theme editor */
export interface ThemeCoreColors {
  // Node colors (group: "nodes")
  primaryColor: string;
  secondaryColor?: string;
  tertiaryColor?: string;

  // Edge colors (group: "edges")
  lineColor?: string;
  arrowheadColor?: string;

  // Background colors (group: "backgrounds")
  background: string;
  noteBkgColor?: string;
  clusterBkg?: string;

  // Text colors (group: "text")
  primaryTextColor?: string;
  secondaryTextColor?: string;
  tertiaryTextColor?: string;

  // Semantic colors (group: "semantic") per D-03
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;

  // Typography (group: "typography")
  fontFamily?: string;
  fontSize?: string;
}

/** A complete theme with metadata and core colors */
export interface MermaidTheme {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  coreColors: ThemeCoreColors;
}

/** Group definition for the theme editor UI */
export interface ThemeSlotGroup {
  id: string;
  labelKey: string;           // i18n key
  slots: ThemeSlotDef[];
}

export interface ThemeSlotDef {
  key: keyof ThemeCoreColors;
  labelKey: string;           // i18n key
  descriptionKey?: string;    // i18n key
  defaultValue: string;
}

/** Stored theme data in localStorage */
export interface StoredThemeData {
  defaultThemeId: string;
  customThemes: MermaidTheme[];
}
