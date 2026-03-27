// src/constants/themes.ts
// Preset themes for the MermaidStudio theme system

import type { MermaidTheme, ThemeSlotGroup } from '@/types';

/** Builtin preset themes - 10 curated themes per D-04 */
export const builtinThemes: MermaidTheme[] = [
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue tones for business diagrams',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#ECECFF',
      background: '#ffffff',
    },
  },
  {
    id: 'dark-github',
    name: 'Dark GitHub',
    description: 'Dark theme inspired by GitHub dark mode',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#161b22',
      background: '#0d1117',
      primaryTextColor: '#f0f6fc',
    },
  },
  {
    id: 'warm-earth',
    name: 'Warm Earth',
    description: 'Warm, earthy tones for organic diagrams',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#C85A17',
      background: '#FEF5E7',
    },
  },
  {
    id: 'pastel-modern',
    name: 'Pastel Modern',
    description: 'Soft pastel colors with a modern aesthetic',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#A78BFA',
      background: '#F8FAFC',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural forest greens for environmental themes',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#134E4A',
      background: '#F0FDF4',
    },
  },
  {
    id: 'ocean-deep',
    name: 'Ocean Deep',
    description: 'Deep ocean blues for data-intensive diagrams',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#0C4A6E',
      background: '#082F49',
      primaryTextColor: '#E0F2FE',
    },
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    description: 'Warm sunset colors for energetic diagrams',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#EA580C',
      background: '#FFF7ED',
    },
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Minimalist light theme with subtle grays',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#F5F5F4',
      background: '#FAFAF9',
    },
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    description: 'Vibrant neon colors on dark background',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#A855F7',
      background: '#0A0A0A',
      primaryTextColor: '#E9D5FF',
    },
  },
  {
    id: 'rose-garden',
    name: 'Rose Garden',
    description: 'Soft rose pinks for elegant diagrams',
    isBuiltin: true,
    coreColors: {
      primaryColor: '#FDA4AF',
      background: '#FFF1F2',
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
        defaultValue: '#ECECFF',
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
