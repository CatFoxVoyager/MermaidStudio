/**
 * Shared synthetic custom palettes (IN-04, 23-REVIEW): the single source for
 * CUSTOM_PALETTE_A / CUSTOM_PALETTE_B, imported by BOTH the unit derivation
 * sweep (src/constants/__tests__/themes.test.ts, D4) and the theme render
 * matrix (src/lib/mermaid/__tests__/theme-matrix.test.ts, THM-01). Extracted
 * from two verbatim copies that carried manual "keep in sync" comments, so
 * drift between the sweep and the matrix fixtures is no longer possible.
 *
 * The shape is what a user-authored custom theme stores and getThemeById
 * resolves from localStorage; every color slot carries a deliberately distinct
 * hex value so a change in any single slot is observable downstream.
 */
import type { ThemeCoreColors } from '@/types';

export const CUSTOM_PALETTE_A: ThemeCoreColors = {
  primaryColor: '#ff6b6b',
  secondaryColor: '#4ecdc4',
  background: '#f7fff7',
  lineColor: '#1a535c',
  primaryTextColor: '#22223b',
  successColor: '#2a9d8f',
  warningColor: '#e9c46a',
  errorColor: '#e76f51',
  infoColor: '#264653',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px',
};

export const CUSTOM_PALETTE_B: ThemeCoreColors = {
  primaryColor: '#dbe7ff',
  secondaryColor: '#b8c7ff',
  background: '#0f1222',
  lineColor: '#7c9cff',
  primaryTextColor: '#e8ecff',
  successColor: '#00c48c',
  warningColor: '#ffb648',
  errorColor: '#ff5470',
  infoColor: '#4d9fff',
};
