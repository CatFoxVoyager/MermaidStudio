// src/constants/themes.ts
// Preset themes for the MermaidStudio theme system
// Restored from original palettes with correct Mermaid primaryColor mapping

import type { MermaidTheme, ThemeSlotGroup } from '@/types';

/**
 * Builtin preset themes - restored from original palette colors.
 *
 * Mermaid's `primaryColor` is the NODE FILL color, not an accent.
 * The original palette "primary" (e.g. #0066CC) maps to derived Mermaid variables
 * via the derivation engine, while primaryColor here should be the light fill.
 * We set both to preserve the palette identity and let the derivation engine
 * create the right contrast/border/edge colors.
 */
export const builtinThemes: MermaidTheme[] = [
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue tones for business diagrams',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#daeaf2',       // Light blue node fill (Mermaid convention)
      secondaryColor: '#b3d4e8',     // Secondary node fill
      background: '#ffffff',
      lineColor: '#0066CC',          // Edges use the bold palette primary
      primaryTextColor: '#1A1F2E',
      successColor: '#00AA44',
      warningColor: '#FF9900',
      errorColor: '#CC0000',
      infoColor: '#0099FF',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'warm-earth',
    name: 'Warm Earth',
    description: 'Warm, earthy tones for organic designs',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#FDE8CD',
      secondaryColor: '#F5CBA7',
      background: '#FEF5E7',
      lineColor: '#C85A17',
      primaryTextColor: '#2C1810',
      successColor: '#27AE60',
      warningColor: '#E67E22',
      errorColor: '#E74C3C',
      infoColor: '#FF9F43',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Modern dark theme for tech products',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#1a2332',
      secondaryColor: '#162030',
      background: '#0D1117',
      lineColor: '#00D4FF',
      primaryTextColor: '#E0E0E0',
      successColor: '#00E676',
      warningColor: '#FFD600',
      errorColor: '#FF3D00',
      infoColor: '#00B8D4',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'pastel-modern',
    name: 'Pastel Modern',
    description: 'Soft pastel colors for contemporary designs',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#E0D7F5',
      secondaryColor: '#F5D0E3',
      background: '#F8FAFC',
      lineColor: '#A78BFA',
      primaryTextColor: '#1E293B',
      successColor: '#86EFAC',
      warningColor: '#FCD34D',
      errorColor: '#FCA5A5',
      infoColor: '#60A5FA',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool ocean blues and teals',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#CCEDF8',
      secondaryColor: '#A8DBED',
      background: '#ECFDF5',
      lineColor: '#0369A1',
      primaryTextColor: '#082F49',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#06B6D4',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Vibrant sunset gradient colors',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#FED7AA',
      secondaryColor: '#FECACA',
      background: '#FEF3C7',
      lineColor: '#DC2626',
      primaryTextColor: '#7C2D12',
      successColor: '#84CC16',
      warningColor: '#EAB308',
      errorColor: '#991B1B',
      infoColor: '#F59E0B',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep forest greens and browns',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#C6F2C6',
      secondaryColor: '#A7E3A7',
      background: '#F0FDF4',
      lineColor: '#15803D',
      primaryTextColor: '#1B4332',
      successColor: '#16A34A',
      warningColor: '#CA8A04',
      errorColor: '#DC2626',
      infoColor: '#22C55E',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep midnight blues with purple accents',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#C7D2FE',
      secondaryColor: '#A5B4FC',
      background: '#F0F4F8',
      lineColor: '#1E3A8A',
      primaryTextColor: '#0F172A',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#7C3AED',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
    },
  },
];

/** Theme slot groups for the theme editor UI */
export const THEME_SLOT_GROUPS: ThemeSlotGroup[] = [
  {
    id: 'nodes',
    labelKey: 'theme.groups.nodes',
    slots: [
      {
        key: 'primaryColor',
        labelKey: 'theme.slots.primaryColor',
        descriptionKey: 'theme.slots.primaryColor.description',
        defaultValue: '#daeaf2',
      },
      {
        key: 'secondaryColor',
        labelKey: 'theme.slots.secondaryColor',
        descriptionKey: 'theme.slots.secondaryColor.description',
        defaultValue: '',
      },
      {
        key: 'tertiaryColor',
        labelKey: 'theme.slots.tertiaryColor',
        descriptionKey: 'theme.slots.tertiaryColor.description',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'edges',
    labelKey: 'theme.groups.edges',
    slots: [
      {
        key: 'lineColor',
        labelKey: 'theme.slots.lineColor',
        descriptionKey: 'theme.slots.lineColor.description',
        defaultValue: '',
      },
      {
        key: 'arrowheadColor',
        labelKey: 'theme.slots.arrowheadColor',
        descriptionKey: 'theme.slots.arrowheadColor.description',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'backgrounds',
    labelKey: 'theme.groups.backgrounds',
    slots: [
      {
        key: 'background',
        labelKey: 'theme.slots.background',
        descriptionKey: 'theme.slots.background.description',
        defaultValue: '#ffffff',
      },
      {
        key: 'noteBkgColor',
        labelKey: 'theme.slots.noteBkgColor',
        descriptionKey: 'theme.slots.noteBkgColor.description',
        defaultValue: '',
      },
      {
        key: 'clusterBkg',
        labelKey: 'theme.slots.clusterBkg',
        descriptionKey: 'theme.slots.clusterBkg.description',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'text',
    labelKey: 'theme.groups.text',
    slots: [
      {
        key: 'primaryTextColor',
        labelKey: 'theme.slots.primaryTextColor',
        descriptionKey: 'theme.slots.primaryTextColor.description',
        defaultValue: '',
      },
      {
        key: 'secondaryTextColor',
        labelKey: 'theme.slots.secondaryTextColor',
        descriptionKey: 'theme.slots.secondaryTextColor.description',
        defaultValue: '',
      },
      {
        key: 'tertiaryTextColor',
        labelKey: 'theme.slots.tertiaryTextColor',
        descriptionKey: 'theme.slots.tertiaryTextColor.description',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'semantic',
    labelKey: 'theme.groups.semantic',
    slots: [
      {
        key: 'successColor',
        labelKey: 'theme.slots.successColor',
        descriptionKey: 'theme.slots.successColor.description',
        defaultValue: '',
      },
      {
        key: 'warningColor',
        labelKey: 'theme.slots.warningColor',
        descriptionKey: 'theme.slots.warningColor.description',
        defaultValue: '',
      },
      {
        key: 'errorColor',
        labelKey: 'theme.slots.errorColor',
        descriptionKey: 'theme.slots.errorColor.description',
        defaultValue: '',
      },
      {
        key: 'infoColor',
        labelKey: 'theme.slots.infoColor',
        descriptionKey: 'theme.slots.infoColor.description',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'typography',
    labelKey: 'theme.groups.typography',
    slots: [
      {
        key: 'fontFamily',
        labelKey: 'theme.slots.fontFamily',
        descriptionKey: 'theme.slots.fontFamily.description',
        defaultValue: 'Inter, system-ui, sans-serif',
      },
      {
        key: 'fontSize',
        labelKey: 'theme.slots.fontSize',
        descriptionKey: 'theme.slots.fontSize.description',
        defaultValue: '14px',
      },
    ],
  },
];

/**
 * Find a theme by its ID.
 */
export function getThemeById(id: string): MermaidTheme | undefined {
  return builtinThemes.find((t) => t.id === id);
}

/**
 * Find a theme by its name (case-insensitive).
 */
export function getThemeByName(name: string): MermaidTheme | undefined {
  const lowerName = name.toLowerCase();
  return builtinThemes.find((t) => t.name.toLowerCase() === lowerName);
}

/**
 * Get 8 representative swatch colors for a theme card.
 * Uses explicitly defined semantic/line colors from the theme,
 * falling back to derived colors when not set.
 */
export function getSwatchColors(coreColors: Record<string, string>): string[] {
  return [
    coreColors.primaryColor || '#ECECFF',
    coreColors.secondaryColor || '#CDE0F5',
    coreColors.background || '#ffffff',
    coreColors.lineColor || '#333333',
    coreColors.successColor || '#22C55E',
    coreColors.warningColor || '#F59E0B',
    coreColors.errorColor || '#EF4444',
    coreColors.infoColor || '#3B82F6',
  ];
}
