import { describe, it, expect } from 'vitest';
import { builtinThemes, getThemeById, getThemeByName } from '../themes';
import { getSwatchColors, DEFAULT_DARK_THEME, deriveThemeVariables } from '../themeDerivation';
import { CUSTOM_PALETTE_A, CUSTOM_PALETTE_B } from './fixtures/palettes';
import type { ThemeCoreColors } from '@/types';

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
      // IN-03: follow the DEFAULT_DARK_THEME pointer instead of hardcoding the
      // one dark builtin id, so a future dark theme derives swatches correctly.
      swatches: getSwatchColors(theme.coreColors, theme.id === DEFAULT_DARK_THEME.id),
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

describe('derivation sweep — 10 builtins + 2 custom (D4)', () => {
  // Core slots the engine is documented to emit for every palette (THM-02).
  const CORE_SLOTS = [
    'primaryColor',
    'background',
    'lineColor',
    'primaryTextColor',
    'primaryBorderColor',
  ] as const;

  // Engine outputs that are NOT color values (sizes, opacities, widths, the
  // serialized radar/xyChart objects, and the pass-through typography keys) —
  // excluded from the color-literal sweep, which applies to color values only.
  // This is scoping, not weakening: exact color VALUES are the exact-hex
  // palette lock's concern (themeDerivation.test.ts); this task is the
  // breadth sweep (D4).
  const NON_COLOR_KEYS = new Set([
    'pieTitleTextSize',
    'pieSectionTextSize',
    'pieLegendTextSize',
    'pieStrokeWidth',
    'pieOuterStrokeWidth',
    'pieOpacity',
    'requirementBorderSize',
    'archEdgeWidth',
    'archGroupBorderWidth',
    'tagLabelFontSize',
    'commitLabelFontSize',
    'radar',
    'xyChart',
    'fontFamily',
    'fontSize',
  ]);

  // RAW-value grammar check (WR-01): the previous sweep round-tripped every
  // value through toHex and matched its OUTPUT against a hex pattern — vacuous,
  // because toHex is total (any unparseable input falls through to
  // hslToHex → rgbToHex(0,0,0) = '#000000'), so that check could never fail.
  // Assert the engine's literal instead: hex, or one of the small closed set
  // of CSS named colors the engine legitimately emits as fallbacks
  // (themeDerivation.ts — 'white' :241, 'lightgrey' :248-249, 'grey' :250,
  // 'red' :252-253, 'navy' :254, 'black' :341/:344).
  const CSS_NAMED = new Set(['white', 'black', 'red', 'grey', 'lightgrey', 'navy']);
  const isColorValue = (v: string) =>
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) || CSS_NAMED.has(v);

  /**
   * Breadth assertion for one palette in BOTH modes: derives without throwing,
   * produces a non-empty map, contains the core slots, and every remaining
   * value IS a color literal (raw-value check — see isColorValue above).
   */
  function assertDerivesCleanly(coreColors: ThemeCoreColors, label: string): void {
    for (const darkMode of [false, true]) {
      expect(() => deriveThemeVariables(coreColors, darkMode), `${label} threw (darkMode=${darkMode})`).not.toThrow();
      const map = deriveThemeVariables(coreColors, darkMode);
      expect(Object.keys(map).length, `${label} produced an empty map (darkMode=${darkMode})`).toBeGreaterThan(0);
      for (const slot of CORE_SLOTS) {
        // A missing core slot is a FINDING (D3 protocol), not a test
        // accommodation — do not weaken this into an optional check.
        expect(map[slot], `${label} missing core slot ${slot} (darkMode=${darkMode})`).toBeDefined();
      }
      for (const [key, value] of Object.entries(map)) {
        if (NON_COLOR_KEYS.has(key)) continue;
        expect(
          isColorValue(value),
          `${label}: ${key} is not a color literal (darkMode=${darkMode})`
        ).toBe(true);
      }
    }
  }

  // Two synthetic custom palettes — the shape a user-authored custom theme
  // stores and getThemeById resolves from localStorage — with deliberately
  // distinct hex per slot. Defined ONCE in ./fixtures/palettes.ts (IN-04;
  // under src since IN-07 so the repo gates cover it) and shared with the
  // theme-matrix render suite, so the sweep and the matrix
  // can never silently validate different palettes. The localStorage lookup
  // path itself is out of scope (D4): the derivation engine is the validated
  // surface.

  it('every builtin theme derives in light and dark mode (core slots + color-literal values)', () => {
    builtinThemes.forEach((theme) => assertDerivesCleanly(theme.coreColors, theme.id));
  });

  it('custom palette A derives in light and dark mode (D4 custom path)', () => {
    assertDerivesCleanly(CUSTOM_PALETTE_A, 'custom-palette-a');
  });

  it('custom palette B derives in light and dark mode (D4 custom path)', () => {
    assertDerivesCleanly(CUSTOM_PALETTE_B, 'custom-palette-b');
  });

  it('variable names survive: flowchart-family names all appear in a builtin derivation (THM-02)', () => {
    // DIAGRAM_TYPE_VARIABLES.flowchart (themeDerivation.ts:23-30 — not
    // exported; keep this list in sync). These are the app-emitted names that
    // mermaid 12's Theme.calculate(overrides) accepts (research-verified in
    // v12 source — 23-RESEARCH.md Pattern 3).
    const flowchartVariables = [
      'primaryColor', 'secondaryColor', 'tertiaryColor', 'background', 'lineColor', 'arrowheadColor',
      'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'textColor',
      'primaryBorderColor', 'secondaryBorderColor', 'tertiaryBorderColor', 'border2',
      'nodeBkg', 'mainBkg', 'nodeBorder', 'clusterBkg', 'clusterBorder',
      'defaultLinkColor', 'titleColor', 'edgeLabelBackground', 'nodeTextColor',
      'fontFamily', 'fontSize',
    ];
    const corporateBlue = builtinThemes.find((t) => t.id === 'corporate-blue');
    expect(corporateBlue).toBeDefined();
    const result = deriveThemeVariables(corporateBlue!.coreColors, false);
    for (const name of flowchartVariables) {
      // Typography keys are pass-through-only: the engine emits them only
      // when coreColors carries them (builtins do not set them — covered by
      // the typography pass-through test below).
      if (name === 'fontFamily' || name === 'fontSize') continue;
      expect(result[name], `flowchart variable "${name}" missing from derived output`).toBeDefined();
    }
  });

  it('typography pass-through: fontFamily/fontSize survive when coreColors carries them', () => {
    const result = deriveThemeVariables(CUSTOM_PALETTE_A, false);
    expect(result.fontFamily).toBe('Inter, system-ui, sans-serif');
    expect(result.fontSize).toBe('14px');
  });
});
