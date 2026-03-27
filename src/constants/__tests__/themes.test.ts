import { describe, it, expect } from 'vitest';
import { builtinThemes, getThemeById, getThemeByName } from '../themes';

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
});
