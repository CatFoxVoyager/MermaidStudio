import { describe, it, expect } from 'vitest';
import { builtinThemes, getThemeById, getThemeByName } from '../themes';
import { getSwatchColors, DEFAULT_DARK_THEME } from '../themeDerivation';

describe('themes', () => {
  it('builtinThemes has 10 entries', () => {
    expect(builtinThemes.length).toBe(10);
  });

  it('each theme has required fields', () => {
    builtinThemes.forEach((theme) => {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('description');
      expect(theme).toHaveProperty('isBuiltin');
      expect(theme).toHaveProperty('coreColors');
      expect(theme.coreColors).toHaveProperty('primaryColor');
      expect(theme.coreColors).toHaveProperty('background');
    });
  });

  it('each theme has valid hex primaryColor and background', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    builtinThemes.forEach((theme) => {
      expect(theme.coreColors.primaryColor).toMatch(hexPattern);
      expect(theme.coreColors.background).toMatch(hexPattern);
    });
  });

  it('getThemeById finds theme by id', () => {
    const theme = getThemeById('corporate-blue');
    expect(theme).toBeDefined();
    expect(theme?.id).toBe('corporate-blue');
  });

  it('getThemeByName finds theme by name', () => {
    const theme = getThemeByName('Corporate Blue');
    expect(theme).toBeDefined();
    expect(theme?.name).toBe('Corporate Blue');
  });

  it('getThemeByName is case-insensitive', () => {
    const theme1 = getThemeByName('Corporate Blue');
    const theme2 = getThemeByName('corporate blue');
    const theme3 = getThemeByName('CORPORATE BLUE');
    expect(theme1).toBe(theme2);
    expect(theme2).toBe(theme3);
  });

  it('getThemeById returns undefined for unknown id', () => {
    const theme = getThemeById('nonexistent');
    expect(theme).toBeUndefined();
  });

  it('getThemeByName returns undefined for unknown name', () => {
    const theme = getThemeByName('Nonexistent Theme');
    expect(theme).toBeUndefined();
  });

  it('DEFAULT_DARK_THEME resolves to dark-tech theme', () => {
    expect(DEFAULT_DARK_THEME).toBeDefined();
    expect(DEFAULT_DARK_THEME.id).toBe('dark-tech');
  });

  it('each theme has visually distinct swatch colors from other themes', () => {
    // Get swatch colors for all themes
    const themeSwatches = builtinThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      swatches: getSwatchColors(theme.coreColors, theme.id === 'dark-tech'),
    }));

    // Compare each pair of themes
    for (let i = 0; i < themeSwatches.length; i++) {
      for (let j = i + 1; j < themeSwatches.length; j++) {
        const themeA = themeSwatches[i];
        const themeB = themeSwatches[j];

        // Count how many swatch colors differ by a meaningful amount
        // Two colors are "different" if at least 3 hex characters differ
        let differingColors = 0;
        for (let k = 0; k < 8; k++) {
          const colorA = themeA.swatches[k];
          const colorB = themeB.swatches[k];

          // Count differing hex characters (excluding the leading #)
          let diffCount = 0;
          for (let charIdx = 1; charIdx <= 6; charIdx++) {
            if (colorA[charIdx] !== colorB[charIdx]) {
              diffCount++;
            }
          }

          // Consider it different if at least 3 characters differ
          if (diffCount >= 3) {
            differingColors++;
          }
        }

        // Each theme pair should have at least 3 visually different swatches
        expect(differingColors).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
