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
  primaryBorderColor?: string;

  // Background colors (group: "backgrounds")
  background: string;
  noteBkgColor?: string;
  clusterBkg?: string;

  // Text colors (group: "text")
  primaryTextColor?: string;
  secondaryTextColor?: string;
  tertiaryTextColor?: string;
  textColor?: string;

  // Semantic colors (group: "semantic") per D-03
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  infoColor?: string;

  // Typography (group: "typography")
  fontFamily?: string;
  fontSize?: string;
}

/** All 11 official Mermaid 12.3.0 native themes */
export type MermaidBuiltinTheme =
  | 'redux-color'
  | 'redux-dark-color'
  | 'redux'
  | 'redux-dark'
  | 'neo'
  | 'neo-dark'
  | 'default'
  | 'neutral'
  | 'dark'
  | 'forest'
  | 'base';

/** A complete theme with metadata and core colors */
export interface MermaidTheme {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  coreColors: ThemeCoreColors;
  /** Mermaid base theme to use (any of the 11 official Mermaid 12.3 native themes) */
  baseTheme?: MermaidBuiltinTheme;
  /** True for official Mermaid built-in themes applied directly via config.theme without derived themeVariables overrides */
  isNativeMermaidTheme?: boolean;
}

/** Group definition for the theme editor UI */
export interface ThemeSlotGroup {
  id: string;
  labelKey: string; // i18n key
  slots: ThemeSlotDef[];
}

export interface ThemeSlotDef {
  key: keyof ThemeCoreColors;
  labelKey: string; // i18n key
  descriptionKey?: string; // i18n key
  defaultValue: string;
}

/** Stored theme data in localStorage */
export interface StoredThemeData {
  defaultThemeId: string;
  customThemes: MermaidTheme[];
}
