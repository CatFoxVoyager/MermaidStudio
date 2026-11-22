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
    baseTheme: 'base',
    coreColors: {
      primaryColor: '#daeaf2', // Light blue node fill (Mermaid convention)
      secondaryColor: '#b3d4e8', // Secondary node fill
      background: '#F5F7FA',
      lineColor: '#0066CC', // Edges use the bold palette primary
      primaryTextColor: '#1A1F2E',
      successColor: '#00AA44',
      warningColor: '#FF9900',
      errorColor: '#CC0000',
      infoColor: '#0099FF',
    },
  },
  {
    id: 'warm-earth',
    name: 'Warm Earth',
    description: 'Warm, earthy tones for organic designs',
    isBuiltin: true,
    baseTheme: 'base',
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
    },
  },
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Modern dark theme for tech products',
    isBuiltin: true,
    baseTheme: 'base',
    coreColors: {
      primaryColor: '#1a2332',
      secondaryColor: '#162030',
      background: '#0D1117',
      lineColor: '#00D4FF',
      primaryTextColor: '#E0E0E0',
      successColor: '#00E676',
      warningColor: '#FFD600',
      errorColor: '#FF3D00',
      infoColor: '#FF006E', // Changed from #00B8D4 to use original accent color
    },
  },
  {
    id: 'pastel-modern',
    name: 'Pastel Modern',
    description: 'Soft pastel colors for contemporary designs',
    isBuiltin: true,
    baseTheme: 'base',
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
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool ocean blues and teals',
    isBuiltin: true,
    baseTheme: 'base',
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
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Vibrant sunset gradient colors',
    isBuiltin: true,
    baseTheme: 'base',
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
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep forest greens and browns',
    isBuiltin: true,
    baseTheme: 'base',
    coreColors: {
      primaryColor: '#C6F2C6',
      secondaryColor: '#A7E3A7',
      background: '#DCFCE7',
      lineColor: '#15803D',
      primaryTextColor: '#1B4332',
      successColor: '#16A34A',
      warningColor: '#CA8A04',
      errorColor: '#DC2626',
      infoColor: '#22C55E',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep midnight blues with purple accents',
    isBuiltin: true,
    baseTheme: 'base',
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
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Vibrant rainbow color spectrum',
    isBuiltin: true,
    baseTheme: 'base',
    coreColors: {
      primaryColor: '#FCE7F3',
      secondaryColor: '#EDE9FE',
      background: '#F9FAFB',
      lineColor: '#EC4899',
      primaryTextColor: '#111827',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  {
    id: 'neutral-minimal',
    name: 'Neutral Minimal',
    description: 'Clean, minimal neutral grayscale',
    isBuiltin: true,
    baseTheme: 'base',
    coreColors: {
      primaryColor: '#E5E7EB',
      secondaryColor: '#D1D5DB',
      background: '#F3F4F6',
      lineColor: '#374151',
      primaryTextColor: '#1F2937',
      successColor: '#4B5563',
      warningColor: '#6B7280',
      errorColor: '#111827',
      infoColor: '#9CA3AF',
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
 * All 11 official Mermaid 12.3.0 native themes, rendered directly via `config.theme`
 * without derived `themeVariables` overrides.
 */
export const NATIVE_MERMAID_THEMES: MermaidTheme[] = [
  {
    id: 'mermaid-redux-color',
    name: 'Mermaid Redux Color',
    description: 'Official Mermaid v12 colorful modern Neo/Redux theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'redux-color',
    coreColors: {
      primaryColor: '#ECECFF',
      secondaryColor: '#FFF5AD',
      background: '#FFFFFF',
      lineColor: '#333333',
      primaryTextColor: '#1E1E1E',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  {
    id: 'mermaid-redux-dark-color',
    name: 'Mermaid Redux Dark Color',
    description: 'Official Mermaid v12 colorful dark Neo/Redux theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'redux-dark-color',
    coreColors: {
      primaryColor: '#2E3440',
      secondaryColor: '#3B4252',
      background: '#12151C',
      lineColor: '#A3BE8C',
      primaryTextColor: '#ECEFF4',
      successColor: '#4ADE80',
      warningColor: '#FBBF24',
      errorColor: '#F87171',
      infoColor: '#60A5FA',
    },
  },
  {
    id: 'mermaid-redux',
    name: 'Mermaid Redux',
    description: 'Official Mermaid v12 clean monochrome light Redux theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'redux',
    coreColors: {
      primaryColor: '#F4F4F5',
      secondaryColor: '#E4E4E7',
      background: '#FFFFFF',
      lineColor: '#27272A',
      primaryTextColor: '#18181B',
      successColor: '#16A34A',
      warningColor: '#D97706',
      errorColor: '#DC2626',
      infoColor: '#2563EB',
    },
  },
  {
    id: 'mermaid-redux-dark',
    name: 'Mermaid Redux Dark',
    description: 'Official Mermaid v12 clean monochrome dark Redux theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'redux-dark',
    coreColors: {
      primaryColor: '#27272A',
      secondaryColor: '#3F3F46',
      background: '#09090B',
      lineColor: '#D4D4D8',
      primaryTextColor: '#FAFAFA',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  {
    id: 'mermaid-neo',
    name: 'Mermaid Neo',
    description: 'Official Mermaid v12 crisp light Neo theme with subtle depth',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'neo',
    coreColors: {
      primaryColor: '#F3F0FF',
      secondaryColor: '#E9D5FF',
      background: '#FFFFFF',
      lineColor: '#5B21B6',
      primaryTextColor: '#1F2937',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#6366F1',
    },
  },
  {
    id: 'mermaid-neo-dark',
    name: 'Mermaid Neo Dark',
    description: 'Official Mermaid v12 crisp dark Neo theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'neo-dark',
    coreColors: {
      primaryColor: '#262135',
      secondaryColor: '#342B4A',
      background: '#0F111A',
      lineColor: '#A78BFA',
      primaryTextColor: '#F3F4F6',
      successColor: '#34D399',
      warningColor: '#FBBF24',
      errorColor: '#F87171',
      infoColor: '#818CF8',
    },
  },
  {
    id: 'mermaid-default',
    name: 'Mermaid Default',
    description: 'Classic Mermaid default lavender theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'default',
    coreColors: {
      primaryColor: '#ECECFF',
      secondaryColor: '#FFFFDE',
      background: '#FFFFFF',
      lineColor: '#333333',
      primaryTextColor: '#333333',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
  {
    id: 'mermaid-neutral',
    name: 'Mermaid Neutral',
    description: 'Official Mermaid grayscale theme ideal for print and docs',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'neutral',
    coreColors: {
      primaryColor: '#EEEEEE',
      secondaryColor: '#DDDDDD',
      background: '#FFFFFF',
      lineColor: '#666666',
      primaryTextColor: '#111111',
      successColor: '#4B5563',
      warningColor: '#6B7280',
      errorColor: '#374151',
      infoColor: '#9CA3AF',
    },
  },
  {
    id: 'mermaid-dark',
    name: 'Mermaid Dark',
    description: 'Official Mermaid classic dark theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'dark',
    coreColors: {
      primaryColor: '#1F2020',
      secondaryColor: '#333333',
      background: '#121212',
      lineColor: '#81B1DB',
      primaryTextColor: '#CCCCCC',
      successColor: '#4ADE80',
      warningColor: '#FACC15',
      errorColor: '#F87171',
      infoColor: '#60A5FA',
    },
  },
  {
    id: 'mermaid-forest',
    name: 'Mermaid Forest',
    description: 'Official Mermaid vibrant green forest theme',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'forest',
    coreColors: {
      primaryColor: '#CDE498',
      secondaryColor: '#93C47D',
      background: '#FFFFFF',
      lineColor: '#13540C',
      primaryTextColor: '#1B3B18',
      successColor: '#15803D',
      warningColor: '#CA8A04',
      errorColor: '#DC2626',
      infoColor: '#0D9488',
    },
  },
  {
    id: 'mermaid-base',
    name: 'Mermaid Base',
    description: 'Official Mermaid minimal base theme for custom overrides',
    isBuiltin: true,
    isNativeMermaidTheme: true,
    baseTheme: 'base',
    coreColors: {
      primaryColor: '#F4F4F4',
      secondaryColor: '#E5E7EB',
      background: '#FFFFFF',
      lineColor: '#555555',
      primaryTextColor: '#222222',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      infoColor: '#3B82F6',
    },
  },
];

/**
 * Find a theme by its ID.
 * Searches in builtin studio themes, native Mermaid v12 themes, then localStorage custom themes.
 */
export function getThemeById(id: string): MermaidTheme | undefined {
  const builtinTheme = builtinThemes.find(t => t.id === id);
  if (builtinTheme) return builtinTheme;

  const nativeTheme = NATIVE_MERMAID_THEMES.find(t => t.id === id);
  if (nativeTheme) return nativeTheme;

  // Then, search in localStorage custom themes
  try {
    const stored = localStorage.getItem('mermaid-studio-custom-themes');
    if (stored) {
      const customThemes: MermaidTheme[] = JSON.parse(stored);
      return customThemes.find(t => t.id === id);
    }
  } catch (err) {
    console.warn('Failed to load custom themes from localStorage:', err);
  }

  return undefined;
}

/**
 * Find a theme by its name (case-insensitive).
 */
export function getThemeByName(name: string): MermaidTheme | undefined {
  const lowerName = name.toLowerCase();
  return (
    builtinThemes.find(t => t.name.toLowerCase() === lowerName) ??
    NATIVE_MERMAID_THEMES.find(t => t.name.toLowerCase() === lowerName)
  );
}
