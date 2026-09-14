import { describe, it, expect } from 'vitest';
import { deriveThemeVariables, deriveThemeVariablesForDiagramType, applyThemeToFrontmatter, applyC4FromTheme, applyStyleToContent, stripThemeDirective, removeThemeColorsFromFrontmatter, DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from '../themeDerivation';
import { toHex } from '@/utils/colorConversion';
import type { ThemeCoreColors } from '@/types';

describe('themeDerivation', () => {
  describe('deriveThemeVariables', () => {
    it('produces >= 150 themeVariables from core colors', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(150);
    });

    it('derives secondaryColor from primaryColor when not provided', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.secondaryColor).toBeDefined();
      expect(result.secondaryColor).not.toBe('#ECECFF');
    });

    it('derives tertiaryColor from primaryColor when not provided', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.tertiaryColor).toBeDefined();
      expect(result.tertiaryColor).not.toBe('#ECECFF');
    });

    it('derives border colors via mkBorder', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.primaryBorderColor).toBeDefined();
      expect(result.secondaryBorderColor).toBeDefined();
      expect(result.tertiaryBorderColor).toBeDefined();
    });

    it('derives text colors via invert', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.primaryTextColor).toBeDefined();
      expect(result.secondaryTextColor).toBeDefined();
      expect(result.tertiaryTextColor).toBeDefined();
    });

    it('produces cScale0-cScale11', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      for (let i = 0; i <= 11; i++) {
        expect(result[`cScale${i}`]).toBeDefined();
      }
    });

    it('darkens cScale differently for dark vs light mode', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const lightResult = deriveThemeVariables(coreColors, false);
      const darkResult = deriveThemeVariables(coreColors, true);
      // cScale0 should be different between light and dark
      expect(lightResult.cScale0).not.toBe(darkResult.cScale0);
    });

    it('derives fillType0-7', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      for (let i = 0; i <= 7; i++) {
        expect(result[`fillType${i}`]).toBeDefined();
      }
    });

    it('derives pie1-12', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      for (let i = 1; i <= 12; i++) {
        expect(result[`pie${i}`]).toBeDefined();
      }
    });

    it('derives git0-7 with dark/light adjustments', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const lightResult = deriveThemeVariables(coreColors, false);
      const darkResult = deriveThemeVariables(coreColors, true);
      for (let i = 0; i <= 7; i++) {
        expect(lightResult[`git${i}`]).toBeDefined();
        expect(darkResult[`git${i}`]).toBeDefined();
        // Git colors should be different between light and dark
        expect(lightResult[`git${i}`]).not.toBe(darkResult[`git${i}`]);
      }
    });

    it('derives surface0-4 and surfacePeer0-4', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      for (let i = 0; i <= 4; i++) {
        expect(result[`surface${i}`]).toBeDefined();
        expect(result[`surfacePeer${i}`]).toBeDefined();
      }
    });

    it('derives quadrant fill/text colors', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      for (let i = 1; i <= 4; i++) {
        expect(result[`quadrant${i}Fill`]).toBeDefined();
        expect(result[`quadrant${i}TextFill`]).toBeDefined();
      }
    });

    it('derives xyChart nested object', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.xyChart).toBeDefined();
      expect(typeof result.xyChart).toBe('string');
    });

    it('derives radar nested object', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.radar).toBeDefined();
      expect(typeof result.radar).toBe('string');
    });

    it('derives venn1-8', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      for (let i = 1; i <= 8; i++) {
        expect(result[`venn${i}`]).toBeDefined();
      }
    });

    it('derives requirement colors', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.requirementBackground).toBeDefined();
      expect(result.requirementBorderColor).toBeDefined();
      expect(result.requirementTextColor).toBeDefined();
    });

    it('derives architecture edge/group colors', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const result = deriveThemeVariables(coreColors, false);
      expect(result.archEdgeColor).toBeDefined();
      expect(result.archGroupBorderColor).toBeDefined();
    });

    it('darkMode produces different rowOdd/rowEven', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
      };
      const lightResult = deriveThemeVariables(coreColors, false);
      const darkResult = deriveThemeVariables(coreColors, true);
      expect(lightResult.rowOdd).not.toBe(darkResult.rowOdd);
      expect(lightResult.rowEven).not.toBe(darkResult.rowEven);
    });

    it('user overrides preserved after derivation (calculate pattern)', () => {
      const coreColors: ThemeCoreColors = {
        primaryColor: '#ECECFF',
        background: '#ffffff',
        lineColor: '#ff0000',
      };
      const result = deriveThemeVariables(coreColors, false);
      // User-provided lineColor should be preserved
      expect(result.lineColor).toBe('#ff0000');
    });
  });

  describe('applyThemeToFrontmatter', () => {
    it('wraps content in YAML frontmatter with themeVariables', () => {
      const theme = {
        id: 'test',
        name: 'Test',
        description: 'Test theme',
        isBuiltin: true,
        coreColors: {
          primaryColor: '#ECECFF',
          background: '#ffffff',
        },
      };
      const content = 'flowchart TD\n  A --> B';
      const result = applyThemeToFrontmatter(content, theme, false);
      expect(result).toMatch(/^---\nconfig:/);
      expect(result).toContain("theme: 'base'");
      expect(result).toContain('themeVariables:');
      expect(result).toContain('primaryColor:');
    });

    it('strips existing frontmatter before applying', () => {
      const theme = {
        id: 'test',
        name: 'Test',
        description: 'Test theme',
        isBuiltin: true,
        coreColors: {
          primaryColor: '#ECECFF',
          background: '#ffffff',
        },
      };
      const content = `---
config:
  theme: default
---
flowchart TD
  A --> B`;
      const result = applyThemeToFrontmatter(content, theme, false);
      // Should only have one frontmatter block. Count block OPENERS (`---` +
      // `config:`) with the `m` flag (WR-02): without `m`, `^` matches only at
      // string index 0, so a strip regression leaking the old block mid-string
      // stayed invisible; and a bare `^---` with `m` would count the CLOSING
      // delimiter line too (the template always emits open + close), so the
      // opener shape `---\nconfig:` is the countable unit.
      const frontmatterCount = (result.match(/^---\nconfig:/gm) || []).length;
      expect(frontmatterCount).toBe(1);
      // Pin the strip negatively: the old block's `theme: default` must never
      // survive into the regenerated output — the neighboring toContain merge
      // assertions cannot distinguish a leaked old block from the new one.
      expect(result).not.toContain('theme: default');
    });
  });

  describe('applyC4FromTheme', () => {
    it('generates UpdateElementStyle directives from theme', () => {
      const theme = {
        id: 'test',
        name: 'Test',
        description: 'Test theme',
        isBuiltin: true,
        coreColors: {
          primaryColor: '#ECECFF',
          background: '#ffffff',
        },
      };
      const c4Content = `C4Context
    title System Context
    Person(user, "User")
    System(sys, "System")`;
      const result = applyC4FromTheme(c4Content, theme);
      expect(result).toContain('UpdateElementStyle(person,');
      expect(result).toContain('UpdateElementStyle(system,');
      expect(result).toContain(theme.coreColors.primaryColor);
    });
  });

  describe('applyStyleToContent', () => {
    it('preserves existing themeVariables when adding style options', () => {
      const contentWithTheme = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff6b6b'
    primaryTextColor: '#ffffff'
    lineColor: '#ff6b6b'
    fontSize: '16px'
  flowchart:
    curve: basis
---
graph TD
    A[Start] --> B[End]
`;

      const result = applyStyleToContent(contentWithTheme, {
        fontFamily: 'Arial, Helvetica, sans-serif'
      });

      // Should preserve existing themeVariables
      expect(result).toContain("primaryColor: '#ff6b6b'");
      expect(result).toContain("primaryTextColor: '#ffffff'");
      expect(result).toContain("lineColor: '#ff6b6b'");
      expect(result).toContain("fontSize: '16px'");

      // Should add the new fontFamily
      expect(result).toContain("fontFamily: 'Arial, Helvetica, sans-serif'");
    });

    it('preserves existing themeVariables when changing fontSize', () => {
      const contentWithTheme = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff6b6b'
    fontSize: '16px'
---
graph TD
    A[Start] --> B[End]
`;

      const result = applyStyleToContent(contentWithTheme, {
        fontSize: 20
      });

      // Should preserve existing primaryColor
      expect(result).toContain("primaryColor: '#ff6b6b'");

      // Should update the fontSize
      expect(result).toContain("fontSize: '20px'");

      // Should NOT contain the old fontSize value
      expect(result).not.toContain("fontSize: '16px'");
    });

    it('preserves existing themeVariables when adding primaryColor', () => {
      const contentWithTheme = `---
config:
  theme: base
  themeVariables:
    fontSize: '16px'
    fontFamily: 'Arial, sans-serif'
---
graph TD
    A[Start] --> B[End]
`;

      const result = applyStyleToContent(contentWithTheme, {
        primaryColor: '#00ff00'
      });

      // Should preserve existing themeVariables
      expect(result).toContain("fontSize: '16px'");
      expect(result).toContain("fontFamily: 'Arial, sans-serif'");

      // Should add the new primaryColor
      expect(result).toContain("primaryColor: '#00ff00'");
    });

    it('adds only the specified option when no themeVariables exist', () => {
      const contentWithoutTheme = `graph TD
    A[Start] --> B[End]
`;

      const result = applyStyleToContent(contentWithoutTheme, {
        fontFamily: 'Arial, Helvetica, sans-serif'
      }, false); // light mode

      // Should only include fontFamily, not all default colors
      expect(result).toContain("themeVariables:");
      expect(result).toContain("fontFamily: 'Arial, Helvetica, sans-serif'");
      // Should NOT include default theme colors
      expect(result).not.toContain("primaryColor:");
      expect(result).not.toContain("background:");
    });

    // IN-02: applyStyleToContent declares a darkMode parameter but never reads
    // it (themeDerivation.ts:781-785), so this exercises the identical
    // light-mode path under darkMode=true. Kept as a mode sweep so a future
    // wiring of the flag is already covered; the name no longer implies
    // dark-specific behavior.
    it('adds only the specified option with darkMode=true (flag currently inert)', () => {
      const contentWithoutTheme = `graph TD
    A[Start] --> B[End]
`;

      const result = applyStyleToContent(contentWithoutTheme, {
        fontSize: 18
      }, true); // darkMode flag — currently inert (see IN-02 note above)

      // Should only include fontSize, not all default colors
      expect(result).toContain("themeVariables:");
      expect(result).toContain("fontSize: '18px'");
      // Should NOT include default theme colors
      expect(result).not.toContain("primaryColor:");
      expect(result).not.toContain("background:");
    });
  });

  describe('stripThemeDirective', () => {
    it('strips YAML frontmatter', () => {
      const content = `---
config:
  theme: base
---
flowchart TD
  A --> B`;
      const result = stripThemeDirective(content);
      expect(result).not.toMatch(/^---/);
      expect(result).toContain('flowchart TD');
    });

    it('strips %%{init}%% blocks', () => {
      const content = `%%{init: {'theme': 'base'}}%%
flowchart TD
  A --> B`;
      const result = stripThemeDirective(content);
      expect(result).not.toContain('%%{init');
      expect(result).toContain('flowchart TD');
    });

    it('strips %% @theme comments', () => {
      const content = `%% @theme ocean
flowchart TD
  A --> B`;
      const result = stripThemeDirective(content);
      expect(result).not.toContain('%% @theme');
      expect(result).toContain('flowchart TD');
    });

    it('preserves custom classDef lines', () => {
      const content = `flowchart TD
  A[Start] --> B[End]
  classDef myCustom fill:#f9f,stroke:#333,stroke-width:2px
  classDef anotherStyle fill:#bbf,stroke:#666
  class A myCustom`;
      const result = stripThemeDirective(content);
      expect(result).toContain('classDef myCustom');
      expect(result).toContain('classDef anotherStyle');
    });

    it('preserves custom class assignment lines', () => {
      const content = `flowchart TD
  A[Start] --> B[End]
  classDef myCustom fill:#f9f
  class A myCustom
  class B myCustom`;
      const result = stripThemeDirective(content);
      expect(result).toContain('class A myCustom');
      expect(result).toContain('class B myCustom');
    });

    it('preserves preset class definitions', () => {
      const content = `flowchart TD
  A[Start] --> B[End]
  classDef presetPrimary fill:#ff6b6b
  class A presetPrimary`;
      const result = stripThemeDirective(content);
      expect(result).toContain('classDef presetPrimary');
      expect(result).toContain('class A presetPrimary');
    });

    it('strips C4 UpdateElementStyle and UpdateRelStyle directives', () => {
      const content = `C4Context
    title System Context
    Person(user, "User")
    UpdateElementStyle(person, $bgColor="#fff", $fontColor="#000")
    UpdateRelStyle(line, $lineColor="#666")
    System(sys, "System")`;
      const result = stripThemeDirective(content);
      expect(result).not.toContain('UpdateElementStyle');
      expect(result).not.toContain('UpdateRelStyle');
      expect(result).toContain('Person(user, "User")');
      expect(result).toContain('System(sys, "System")');
    });
  });

  // IN-01: renamed so the two applyThemeToFrontmatter suites (basic wrapping
  // above, merge semantics here) are distinguishable in test output.
  describe('applyThemeToFrontmatter — merge semantics', () => {
    it('merges new colors into existing themeVariables (preserves custom keys)', () => {
      const theme = {
        id: 'test',
        name: 'Test',
        description: 'Test theme',
        isBuiltin: true,
        coreColors: {
          primaryColor: '#00ff00',
          background: '#111111',
          lineColor: '#00ff00',
        },
      };
      const content = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff6b6b'
    fontSize: '16px'
    fontFamily: 'Arial, sans-serif'
---
flowchart TD
  A[Start] --> B[End]`;

      const result = applyThemeToFrontmatter(content, theme, false);

      // New theme colors should override
      expect(result).toContain("primaryColor: '#00ff00'");

      // Custom keys should be preserved
      expect(result).toContain("fontSize: '16px'");
      expect(result).toContain("fontFamily: 'Arial, sans-serif'");
    });

    it('overwrites color keys from theme even when they already exist', () => {
      const theme = {
        id: 'ocean',
        name: 'Ocean',
        description: 'Ocean theme',
        isBuiltin: true,
        coreColors: {
          primaryColor: '#4ECDC4',
          background: '#1A535C',
          lineColor: '#F7FFF7',
        },
      };
      const content = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff0000'
    background: '#ffffff'
---
flowchart TD
  A --> B`;

      const result = applyThemeToFrontmatter(content, theme, false);

      expect(result).toContain("primaryColor: '#4ECDC4'");
      expect(result).toContain("background: '#1A535C'");
    });

    it('preserves layout config (non-theme, non-themeVariables keys)', () => {
      const theme = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        isBuiltin: true,
        coreColors: {
          primaryColor: '#ECECFF',
          background: '#ffffff',
        },
      };
      const content = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff6b6b'
  flowchart:
    curve: basis
    padding: 20
---
flowchart TD
  A --> B`;

      const result = applyThemeToFrontmatter(content, theme, false);

      expect(result).toContain('curve:');
      expect(result).toContain('basis');
      expect(result).toContain('padding:');
      expect(result).toContain('20');
    });
  });

  describe('removeThemeColorsFromFrontmatter', () => {
    // CR-02 regression: the function is declared to return string, but the
    // return statement was dropped — the built frontmatter was discarded and
    // the function returned undefined. The caller (DiagramColorsPanel
    // handleResetToDefault) assigns the result to the diagram content and
    // feeds it straight into onContentChange, so a dropped return destroys
    // the editor content on "Reset to default".
    it('returns a string that preserves the diagram body for frontmatter input (CR-02)', () => {
      const content = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff6b6b'
    fontSize: '16px'
  flowchart:
    curve: basis
---
flowchart TD
  A[Start] --> B[End]`;

      const result: unknown = removeThemeColorsFromFrontmatter(content);

      // Contract with the caller: the result replaces the diagram content.
      expect(typeof result).toBe('string');
      const text = result as string;
      // Diagram body survives the reset verbatim
      expect(text).toContain('flowchart TD');
      expect(text).toContain('A[Start] --> B[End]');
      // Theme-derived colors are stripped (primaryColor is in the flowchart
      // derived set) — the reset's whole purpose
      expect(text).not.toContain('#ff6b6b');
      // Typography (typographyKeys) and layout config are preserved
      expect(text).toContain("fontSize: '16px'");
      expect(text).toContain('curve:');
      expect(text).toContain('basis');
    });

    it('returns the cleaned body unchanged for content without frontmatter', () => {
      const content = 'flowchart TD\n  A --> B';
      expect(removeThemeColorsFromFrontmatter(content)).toBe('flowchart TD\n  A --> B');
    });
  });

  describe('default themes', () => {
    it('DEFAULT_LIGHT_THEME is a valid MermaidTheme', () => {
      expect(DEFAULT_LIGHT_THEME).toBeDefined();
      expect(DEFAULT_LIGHT_THEME.id).toBeDefined();
      expect(DEFAULT_LIGHT_THEME.name).toBeDefined();
      expect(DEFAULT_LIGHT_THEME.coreColors).toBeDefined();
      expect(DEFAULT_LIGHT_THEME.coreColors.primaryColor).toBeDefined();
      expect(DEFAULT_LIGHT_THEME.coreColors.background).toBeDefined();
    });

    it('DEFAULT_DARK_THEME is a valid MermaidTheme', () => {
      expect(DEFAULT_DARK_THEME).toBeDefined();
      expect(DEFAULT_DARK_THEME.id).toBeDefined();
      expect(DEFAULT_DARK_THEME.name).toBeDefined();
      expect(DEFAULT_DARK_THEME.coreColors).toBeDefined();
      expect(DEFAULT_DARK_THEME.coreColors.primaryColor).toBeDefined();
      expect(DEFAULT_DARK_THEME.coreColors.background).toBeDefined();
    });

    it('deriveThemeVariables with DEFAULT_LIGHT_THEME produces all variables', () => {
      const result = deriveThemeVariables(DEFAULT_LIGHT_THEME.coreColors, false);
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(150);
    });

    it('deriveThemeVariables with DEFAULT_DARK_THEME produces all variables', () => {
      const result = deriveThemeVariables(DEFAULT_DARK_THEME.coreColors, true);
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(150);
    });
  });
});

// ---------------------------------------------------------------------------
// Exact-hex palette lock (v12 source values → v11 hex, D5/D7) — THM-02.
//
// (a) The two deviations locked below are DELIBERATE v11-behavior preservation,
//     NOT bugs: signalColor ← lineColor (themeDerivation.ts:232) and
//     edgeLabelBackground ← background (themeDerivation.ts:225-226). Mermaid's
//     own Theme.updateColors() derives signalColor ← textColor and
//     edgeLabelBackground ← (darkMode ? darken(secondaryColor, 30) : secondaryColor)
//     (v12 chunk-KMA2NSDO.mjs:935/927 — byte-identical to v11.17.2 per tarball
//     diff, 23-RESEARCH.md). The engine file's "mirrors Theme.updateColors()
//     exactly" header has NEVER been literally true and must NOT be
//     "corrected": these deviations are the historical source of the v11 look
//     (23-RESEARCH.md Pitfall 1; D6/D7). If these tests fail because someone
//     "aligned", "synced" or "fixed" the engine toward mermaid's formulas,
//     that edit is the Pitfall-1 prohibition firing — revert it.
// (b) The v11 → v12 theme-system deltas are research-verified output-neutral
//     (23-RESEARCH.md, v11.17.2 vs 12.0.0 tarball diff):
//       - `flowContainerStroke` is a NEW v12 theme-base variable the app never
//         sets — no assertion here (asserting the engine's absence would
//         false-fail a benign future emission; same discipline as Phase 21's
//         rect.background not-emitted record).
//       - `Theme.calculate()`'s new useGradient tail (a nodeBorder override
//         without explicit useGradient flips it to false) is neo-look-gated
//         and invisible under the app's classic-look pin in doInit().
// Equality criterion: EXACT hex after toHex() normalization (D5 — epsilon 0).
// No ΔE, no value tolerance, no approximate match (D3).
// ---------------------------------------------------------------------------

// The ONE fixed lock fixture: all 9 semantic slots set to stable, visually
// distinct hex values, with primaryColor/background taken verbatim from the
// v12 theme-base constructor (chunk-KMA2NSDO.mjs:891-903, quoted in
// 23-RESEARCH.md) so the lock is literally "fed by v12 source values" (D7).
const V12_SOURCE_LOCK_FIXTURE: ThemeCoreColors = {
  primaryColor: '#fff4dd',       // v12 theme-base constructor value
  secondaryColor: '#e0f2fe',
  background: '#f4f4f4',         // v12 theme-base constructor value
  lineColor: '#1d4ed8',
  primaryTextColor: '#333333',
  successColor: '#16a34a',
  warningColor: '#f59e0b',
  errorColor: '#dc2626',
  infoColor: '#2563eb',
};

// Observation provenance (Phase 21/22 golden-capture discipline — never invent
// expected values): OBSERVED_LIGHT / OBSERVED_DARK are the derivation engine's
// ACTUAL complete output for V12_SOURCE_LOCK_FIXTURE, observed 2026-09-13 on
// mermaid 12.0.0 (updateColors formula-identical to v11.17.2 per tarball diff —
// 23-RESEARCH.md) via a temporary probe test that has since been deleted
// (Phase 22 probe-observe-delete pattern). Every subsequent derivation must
// equal these maps exactly (toEqual: same keys, same values, no extras). If the
// fixture changes, re-run the probe; never hand-adjust these constants.
const OBSERVED_LIGHT: Record<string, string> = {
  'activationBkgColor': '#e0f2fe',
  'activationBorderColor': '#afddfc',
  'activeTaskBkgColor': '#ffffff',
  'activeTaskBorderColor': '#fff4dd',
  'actorBkg': '#fff4dd',
  'actorBorder': '#eedebb',
  'actorLineColor': '#eedebb',
  'actorTextColor': '#333333',
  'altBackground': '#f7f9ff',
  'altSectionBkgColor': 'white',
  'archEdgeArrowColor': '#777',
  'archEdgeColor': '#777',
  'archEdgeWidth': '3',
  'archGroupBorderColor': '#000',
  'archGroupBorderWidth': '2px',
  'arrowheadColor': '#0b0b0b',
  'attributeBackgroundColorEven': '#c6ffaa',
  'attributeBackgroundColorOdd': '#fff4dd',
  'background': '#f4f4f4',
  'border2': '#d0d9f3',
  'branchLabelColor': '#333333',
  'cScale0': '#ffcb5e',
  'cScale1': '#65befa',
  'cScale10': '#ff5e92',
  'cScale11': '#ff7a5e',
  'cScale2': '#7899ff',
  'cScale3': '#e3ff5e',
  'cScale4': '#92ff5e',
  'cScale5': '#5eff7a',
  'cScale6': '#5effcb',
  'cScale7': '#5ee3ff',
  'cScale8': '#bfbfbf',
  'cScale9': '#ff5ee3',
  'cScaleInv0': '#0034a1',
  'cScaleInv1': '#9a4105',
  'cScaleInv10': '#00a16d',
  'cScaleInv11': '#0085a1',
  'cScaleInv2': '#876600',
  'cScaleInv3': '#1c00a1',
  'cScaleInv4': '#6d00a1',
  'cScaleInv5': '#a10085',
  'cScaleInv6': '#a10034',
  'cScaleInv7': '#a11c00',
  'cScaleInv8': '#404040',
  'cScaleInv9': '#00a11c',
  'cScaleLabel0': '#333333',
  'cScaleLabel1': '#333333',
  'cScaleLabel10': '#333333',
  'cScaleLabel11': '#333333',
  'cScaleLabel2': '#333333',
  'cScaleLabel3': '#333333',
  'cScaleLabel4': '#333333',
  'cScaleLabel5': '#333333',
  'cScaleLabel6': '#333333',
  'cScaleLabel7': '#333333',
  'cScaleLabel8': '#333333',
  'cScaleLabel9': '#333333',
  'cScalePeer0': '#ffbb2b',
  'cScalePeer1': '#34a9f8',
  'cScalePeer10': '#ff2b70',
  'cScalePeer11': '#ff502b',
  'cScalePeer2': '#4573ff',
  'cScalePeer3': '#daff2b',
  'cScalePeer4': '#70ff2b',
  'cScalePeer5': '#2bff50',
  'cScalePeer6': '#2bffbb',
  'cScalePeer7': '#2bdaff',
  'cScalePeer8': '#a6a6a6',
  'cScalePeer9': '#ff2bda',
  'classText': '#333333',
  'clusterBkg': '#f7f9ff',
  'clusterBorder': '#d0d9f3',
  'commitLabelBackground': '#e0f2fe',
  'commitLabelColor': '#1f0d01',
  'commitLabelFontSize': '10px',
  'compositeBackground': '#f4f4f4',
  'compositeBorder': '#eedebb',
  'compositeTitleBackground': '#fff4dd',
  'critBkgColor': 'red',
  'critBorderColor': '#ff8888',
  'defaultLinkColor': '#1d4ed8',
  'doneTaskBkgColor': 'lightgrey',
  'doneTaskBorderColor': 'grey',
  'edgeLabelBackground': '#f4f4f4',
  'errorBkgColor': '#f7f9ff',
  'errorColor': '#dc2626',
  'errorTextColor': '#080600',
  'excludeBkgColor': '#eeeeee',
  'fillType0': '#fff4dd',
  'fillType1': '#e0f2fe',
  'fillType2': '#e6ffdd',
  'fillType3': '#eee0fe',
  'fillType4': '#ffddea',
  'fillType5': '#e0feea',
  'fillType6': '#ddfff9',
  'fillType7': '#fee0ee',
  'git0': '#ffcb5e',
  'git1': '#65befa',
  'git2': '#7899ff',
  'git3': '#ff7a5e',
  'git4': '#ff5e92',
  'git5': '#ff5ee3',
  'git6': '#92ff5e',
  'git7': '#5effcb',
  'gitBranchLabel0': '#333333',
  'gitBranchLabel1': '#333333',
  'gitBranchLabel2': '#333333',
  'gitBranchLabel3': '#333333',
  'gitBranchLabel4': '#333333',
  'gitBranchLabel5': '#333333',
  'gitBranchLabel6': '#333333',
  'gitBranchLabel7': '#333333',
  'gitInv0': '#0034a1',
  'gitInv1': '#9a4105',
  'gitInv2': '#876600',
  'gitInv3': '#0085a1',
  'gitInv4': '#00a16d',
  'gitInv5': '#00a11c',
  'gitInv6': '#6d00a1',
  'gitInv7': '#a10034',
  'gridColor': 'lightgrey',
  'infoColor': '#2563eb',
  'innerEndBackground': '#eedebb',
  'labelBackgroundColor': '#fff4dd',
  'labelBoxBkgColor': '#fff4dd',
  'labelBoxBorderColor': '#eedebb',
  'labelTextColor': '#333333',
  'lineColor': '#1d4ed8',
  'loopTextColor': '#333333',
  'mainBkg': '#fff4dd',
  'nodeBkg': '#fff4dd',
  'nodeBorder': '#eedebb',
  'nodeTextColor': '#333333',
  'noteBkgColor': '#fff5ad',
  'noteBorderColor': '#e4db95',
  'noteTextColor': '#333',
  'personBkg': '#fff4dd',
  'personBorder': '#eedebb',
  'pie1': '#fff4dd',
  'pie10': '#a3ff77',
  'pie11': '#ff77a3',
  'pie12': '#aaffe4',
  'pie2': '#e0f2fe',
  'pie3': '#f7f9ff',
  'pie4': '#ffe4aa',
  'pie5': '#afddfc',
  'pie6': '#c4d3ff',
  'pie7': '#c6ffaa',
  'pie8': '#ffaac6',
  'pie9': '#ddfff4',
  'pieLegendTextColor': '#333333',
  'pieLegendTextSize': '17px',
  'pieOpacity': '0.7',
  'pieOuterStrokeColor': 'black',
  'pieOuterStrokeWidth': '2px',
  'pieSectionTextColor': '#333333',
  'pieSectionTextSize': '17px',
  'pieStrokeColor': 'black',
  'pieStrokeWidth': '2px',
  'pieTitleTextColor': '#333333',
  'pieTitleTextSize': '25px',
  'primaryBorderColor': '#eedebb',
  'primaryColor': '#fff4dd',
  'primaryTextColor': '#333333',
  'quadrant1Fill': '#fff4dd',
  'quadrant1TextFill': '#333333',
  'quadrant2Fill': '#fff9e2',
  'quadrant2TextFill': '#2e2e2e',
  'quadrant3Fill': '#fffee7',
  'quadrant3TextFill': '#292929',
  'quadrant4Fill': '#ffffec',
  'quadrant4TextFill': '#242424',
  'quadrantExternalBorderStrokeFill': '#eedebb',
  'quadrantInternalBorderStrokeFill': '#eedebb',
  'quadrantPointFill': '#000000',
  'quadrantPointTextFill': '#333333',
  'quadrantTitleFill': '#333333',
  'quadrantXAxisTextFill': '#333333',
  'quadrantYAxisTextFill': '#333333',
  'radar': '{"axisColor":"#1d4ed8","axisStrokeWidth":2,"axisLabelFontSize":12,"curveOpacity":0.5,"curveStrokeWidth":2,"graticuleColor":"#DEDEDE","graticuleStrokeWidth":1,"graticuleOpacity":0.3,"legendBoxSize":12,"legendFontSize":12}',
  'relationColor': '#1d4ed8',
  'relationLabelBackground': '#e0f2fe',
  'relationLabelColor': '#333333',
  'requirementBackground': '#fff4dd',
  'requirementBorderColor': '#eedebb',
  'requirementBorderSize': '1',
  'requirementTextColor': '#333333',
  'rowEven': '#fffcf7',
  'rowOdd': '#ffffff',
  'scaleLabelColor': '#333333',
  'secondaryBorderColor': '#bfdaec',
  'secondaryColor': '#e0f2fe',
  'secondaryTextColor': '#1f0d01',
  'sectionBkgColor': '#e0f2fe',
  'sectionBkgColor2': '#fff4dd',
  'sequenceNumberColor': '#e2b127',
  'signalColor': '#1d4ed8',
  'signalTextColor': '#333333',
  'specialStateColor': '#1d4ed8',
  'stateBkg': '#fff4dd',
  'stateLabelColor': '#333333',
  'successColor': '#16a34a',
  'surface0': '#c8d8fb',
  'surface1': '#bacef9',
  'surface2': '#acc4f8',
  'surface3': '#9ebbf7',
  'surface4': '#8fb1f6',
  'surfacePeer0': '#bacef9',
  'surfacePeer1': '#acc4f8',
  'surfacePeer2': '#9ebbf7',
  'surfacePeer3': '#8fb1f6',
  'surfacePeer4': '#81a7f5',
  'tagLabelBackground': '#fff4dd',
  'tagLabelBorder': '#eedebb',
  'tagLabelColor': '#333333',
  'tagLabelFontSize': '10px',
  'taskBkgColor': '#fff4dd',
  'taskBorderColor': '#eedebb',
  'taskTextClickableColor': '#003163',
  'taskTextColor': '#333333',
  'taskTextDarkColor': '#333333',
  'taskTextLightColor': '#333333',
  'taskTextOutsideColor': '#333333',
  'tertiaryBorderColor': '#d0d9f3',
  'tertiaryColor': '#f7f9ff',
  'tertiaryTextColor': '#080600',
  'textColor': '#333333',
  'titleColor': '#080600',
  'todayLineColor': 'red',
  'transitionColor': '#1d4ed8',
  'transitionLabelColor': '#333333',
  'venn1': '#ffc344',
  'venn2': '#4cb4f9',
  'venn3': '#5e86ff',
  'venn4': '#81ff44',
  'venn5': '#ff4481',
  'venn6': '#914cf9',
  'venn7': '#44ffc3',
  'venn8': '#f94cb4',
  'vennSetTextColor': '#333333',
  'vennTitleTextColor': '#080600',
  'vertLineColor': 'navy',
  'warningColor': '#f59e0b',
  'xyChart': '{"backgroundColor":"#f4f4f4","titleColor":"#333333","xAxisTitleColor":"#333333","xAxisLabelColor":"#333333","xAxisTickColor":"#333333","xAxisLineColor":"#333333","yAxisTitleColor":"#333333","yAxisLabelColor":"#333333","yAxisTickColor":"#333333","yAxisLineColor":"#333333","plotColorPalette":"#FFF4DD,#FFD8B1,#FFA07A,#ECEFF1,#D6DBDF,#C3E0A8,#FFB6A4,#FFD74D,#738FA7,#FFFFF0"}',
};

const OBSERVED_DARK: Record<string, string> = {
  'activationBkgColor': '#e0f2fe',
  'activationBorderColor': '#afddfc',
  'activeTaskBkgColor': '#ffffff',
  'activeTaskBorderColor': '#fff4dd',
  'actorBkg': '#fff4dd',
  'actorBorder': '#ffffff',
  'actorLineColor': '#ffffff',
  'actorTextColor': '#333333',
  'altBackground': '#f7f9ff',
  'altSectionBkgColor': 'white',
  'archEdgeArrowColor': '#777',
  'archEdgeColor': '#777',
  'archEdgeWidth': '3',
  'archGroupBorderColor': '#000',
  'archGroupBorderWidth': '2px',
  'arrowheadColor': '#0b0b0b',
  'attributeBackgroundColorEven': '#c6ffaa',
  'attributeBackgroundColorOdd': '#fff4dd',
  'background': '#f4f4f4',
  'border2': '#ffffff',
  'branchLabelColor': 'black',
  'cScale0': '#5e3f00',
  'cScale1': '#03395d',
  'cScale10': '#5e001e',
  'cScale11': '#5e1100',
  'cScale2': '#001e78',
  'cScale3': '#4d5e00',
  'cScale4': '#1e5e00',
  'cScale5': '#005e11',
  'cScale6': '#005e3f',
  'cScale7': '#004d5e',
  'cScale8': '#404040',
  'cScale9': '#5e004d',
  'cScaleInv0': '#a1c0ff',
  'cScaleInv1': '#fcc6a2',
  'cScaleInv10': '#a1ffe1',
  'cScaleInv11': '#a1eeff',
  'cScaleInv2': '#ffe187',
  'cScaleInv3': '#b2a1ff',
  'cScaleInv4': '#e1a1ff',
  'cScaleInv5': '#ffa1ee',
  'cScaleInv6': '#ffa1c0',
  'cScaleInv7': '#ffb2a1',
  'cScaleInv8': '#bfbfbf',
  'cScaleInv9': '#a1ffb2',
  'cScaleLabel0': '#333333',
  'cScaleLabel1': '#333333',
  'cScaleLabel10': '#333333',
  'cScaleLabel11': '#333333',
  'cScaleLabel2': '#333333',
  'cScaleLabel3': '#333333',
  'cScaleLabel4': '#333333',
  'cScaleLabel5': '#333333',
  'cScaleLabel6': '#333333',
  'cScaleLabel7': '#333333',
  'cScaleLabel8': '#333333',
  'cScaleLabel9': '#333333',
  'cScalePeer0': '#916100',
  'cScalePeer1': '#05578e',
  'cScalePeer10': '#91002e',
  'cScalePeer11': '#911a00',
  'cScalePeer2': '#002bab',
  'cScalePeer3': '#779100',
  'cScalePeer4': '#2e9100',
  'cScalePeer5': '#00911a',
  'cScalePeer6': '#009161',
  'cScalePeer7': '#007791',
  'cScalePeer8': '#5a5a5a',
  'cScalePeer9': '#910077',
  'classText': '#333333',
  'clusterBkg': '#f7f9ff',
  'clusterBorder': '#ffffff',
  'commitLabelBackground': '#e0f2fe',
  'commitLabelColor': '#1f0d01',
  'commitLabelFontSize': '10px',
  'compositeBackground': '#f4f4f4',
  'compositeBorder': '#ffffff',
  'compositeTitleBackground': '#fff4dd',
  'critBkgColor': 'red',
  'critBorderColor': '#ff8888',
  'defaultLinkColor': '#1d4ed8',
  'doneTaskBkgColor': 'lightgrey',
  'doneTaskBorderColor': 'grey',
  'edgeLabelBackground': '#f4f4f4',
  'errorBkgColor': '#f7f9ff',
  'errorColor': '#dc2626',
  'errorTextColor': '#080600',
  'excludeBkgColor': '#eeeeee',
  'fillType0': '#fff4dd',
  'fillType1': '#e0f2fe',
  'fillType2': '#e6ffdd',
  'fillType3': '#eee0fe',
  'fillType4': '#ffddea',
  'fillType5': '#e0feea',
  'fillType6': '#ddfff9',
  'fillType7': '#fee0ee',
  'git0': '#ffffff',
  'git1': '#ffffff',
  'git2': '#ffffff',
  'git3': '#ffffff',
  'git4': '#ffffff',
  'git5': '#ffffff',
  'git6': '#ffffff',
  'git7': '#ffffff',
  'gitBranchLabel0': 'black',
  'gitBranchLabel1': 'black',
  'gitBranchLabel2': 'black',
  'gitBranchLabel3': 'black',
  'gitBranchLabel4': 'black',
  'gitBranchLabel5': 'black',
  'gitBranchLabel6': 'black',
  'gitBranchLabel7': 'black',
  'gitInv0': '#000000',
  'gitInv1': '#000000',
  'gitInv2': '#000000',
  'gitInv3': '#000000',
  'gitInv4': '#000000',
  'gitInv5': '#000000',
  'gitInv6': '#000000',
  'gitInv7': '#000000',
  'gridColor': 'lightgrey',
  'infoColor': '#2563eb',
  'innerEndBackground': '#ffffff',
  'labelBackgroundColor': '#fff4dd',
  'labelBoxBkgColor': '#fff4dd',
  'labelBoxBorderColor': '#ffffff',
  'labelTextColor': '#333333',
  'lineColor': '#1d4ed8',
  'loopTextColor': '#333333',
  'mainBkg': '#fff4dd',
  'nodeBkg': '#fff4dd',
  'nodeBorder': '#ffffff',
  'nodeTextColor': '#333333',
  'noteBkgColor': '#fff5ad',
  'noteBorderColor': '#f9f7e6',
  'noteTextColor': '#333',
  'personBkg': '#fff4dd',
  'personBorder': '#ffffff',
  'pie1': '#fff4dd',
  'pie10': '#a3ff77',
  'pie11': '#ff77a3',
  'pie12': '#aaffe4',
  'pie2': '#e0f2fe',
  'pie3': '#f7f9ff',
  'pie4': '#ffe4aa',
  'pie5': '#afddfc',
  'pie6': '#c4d3ff',
  'pie7': '#c6ffaa',
  'pie8': '#ffaac6',
  'pie9': '#ddfff4',
  'pieLegendTextColor': '#333333',
  'pieLegendTextSize': '17px',
  'pieOpacity': '0.7',
  'pieOuterStrokeColor': 'black',
  'pieOuterStrokeWidth': '2px',
  'pieSectionTextColor': '#333333',
  'pieSectionTextSize': '17px',
  'pieStrokeColor': 'black',
  'pieStrokeWidth': '2px',
  'pieTitleTextColor': '#333333',
  'pieTitleTextSize': '25px',
  'primaryBorderColor': '#ffffff',
  'primaryColor': '#fff4dd',
  'primaryTextColor': '#333333',
  'quadrant1Fill': '#fff4dd',
  'quadrant1TextFill': '#333333',
  'quadrant2Fill': '#fff9e2',
  'quadrant2TextFill': '#2e2e2e',
  'quadrant3Fill': '#fffee7',
  'quadrant3TextFill': '#292929',
  'quadrant4Fill': '#ffffec',
  'quadrant4TextFill': '#242424',
  'quadrantExternalBorderStrokeFill': '#ffffff',
  'quadrantInternalBorderStrokeFill': '#ffffff',
  'quadrantPointFill': '#000000',
  'quadrantPointTextFill': '#333333',
  'quadrantTitleFill': '#333333',
  'quadrantXAxisTextFill': '#333333',
  'quadrantYAxisTextFill': '#333333',
  'radar': '{"axisColor":"#1d4ed8","axisStrokeWidth":2,"axisLabelFontSize":12,"curveOpacity":0.5,"curveStrokeWidth":2,"graticuleColor":"#DEDEDE","graticuleStrokeWidth":1,"graticuleOpacity":0.3,"legendBoxSize":12,"legendFontSize":12}',
  'relationColor': '#1d4ed8',
  'relationLabelBackground': '#4cb4f9',
  'relationLabelColor': '#333333',
  'requirementBackground': '#fff4dd',
  'requirementBorderColor': '#ffffff',
  'requirementBorderSize': '1',
  'requirementTextColor': '#333333',
  'rowEven': '#ffe4aa',
  'rowOdd': '#ffecc4',
  'scaleLabelColor': '#333333',
  'secondaryBorderColor': '#ffffff',
  'secondaryColor': '#e0f2fe',
  'secondaryTextColor': '#1f0d01',
  'sectionBkgColor': '#e0f2fe',
  'sectionBkgColor2': '#fff4dd',
  'sequenceNumberColor': '#e2b127',
  'signalColor': '#1d4ed8',
  'signalTextColor': '#333333',
  'specialStateColor': '#1d4ed8',
  'stateBkg': '#fff4dd',
  'stateLabelColor': '#333333',
  'successColor': '#16a34a',
  'surface0': '#81a7f5',
  'surface1': '#497ff0',
  'surface2': '#1358e9',
  'surface3': '#0e43b0',
  'surface4': '#0a2d78',
  'surfacePeer0': '#497ff0',
  'surfacePeer1': '#1358e9',
  'surfacePeer2': '#0e43b0',
  'surfacePeer3': '#0a2d78',
  'surfacePeer4': '#05183f',
  'tagLabelBackground': '#fff4dd',
  'tagLabelBorder': '#ffffff',
  'tagLabelColor': '#333333',
  'tagLabelFontSize': '10px',
  'taskBkgColor': '#fff4dd',
  'taskBorderColor': '#ffffff',
  'taskTextClickableColor': '#003163',
  'taskTextColor': '#333333',
  'taskTextDarkColor': '#333333',
  'taskTextLightColor': '#333333',
  'taskTextOutsideColor': '#333333',
  'tertiaryBorderColor': '#ffffff',
  'tertiaryColor': '#f7f9ff',
  'tertiaryTextColor': '#080600',
  'textColor': '#333333',
  'titleColor': '#080600',
  'todayLineColor': 'red',
  'transitionColor': '#1d4ed8',
  'transitionLabelColor': '#333333',
  'venn1': '#ffc344',
  'venn2': '#4cb4f9',
  'venn3': '#5e86ff',
  'venn4': '#81ff44',
  'venn5': '#ff4481',
  'venn6': '#914cf9',
  'venn7': '#44ffc3',
  'venn8': '#f94cb4',
  'vennSetTextColor': '#333333',
  'vennTitleTextColor': '#080600',
  'vertLineColor': 'navy',
  'warningColor': '#f59e0b',
  'xyChart': '{"backgroundColor":"#f4f4f4","titleColor":"#333333","xAxisTitleColor":"#333333","xAxisLabelColor":"#333333","xAxisTickColor":"#333333","xAxisLineColor":"#333333","yAxisTitleColor":"#333333","yAxisLabelColor":"#333333","yAxisTickColor":"#333333","yAxisLineColor":"#333333","plotColorPalette":"#FFF4DD,#FFD8B1,#FFA07A,#ECEFF1,#D6DBDF,#C3E0A8,#FFB6A4,#FFD74D,#738FA7,#FFFFF0"}',
};

describe('exact-hex palette lock (v12 source values → v11 hex, D5/D7)', () => {
  it('pass-through lock: primaryColor and background are emitted unchanged (light + dark)', () => {
    for (const darkMode of [false, true]) {
      const result = deriveThemeVariables(V12_SOURCE_LOCK_FIXTURE, darkMode);
      expect(result.primaryColor).toBe(toHex(V12_SOURCE_LOCK_FIXTURE.primaryColor));
      expect(result.background).toBe(toHex(V12_SOURCE_LOCK_FIXTURE.background));
    }
  });

  it('deviation lock: signalColor ← lineColor and edgeLabelBackground ← background — deliberate v11-look deviations, NOT mermaid updateColors targets (D6/D7)', () => {
    // Mermaid's Theme.updateColors() would derive signalColor ← textColor and
    // edgeLabelBackground ← (darkMode ? darken(secondaryColor, 30) : secondaryColor)
    // (v12 chunk-KMA2NSDO.mjs:935/927 — byte-identical to v11.17.2). The app
    // engine derives them from lineColor / background instead — that IS the
    // v11 look this milestone must preserve (Pitfall 1; D6/D7). If this test
    // fails after a "fix" toward mermaid's formulas, revert the engine edit.
    for (const darkMode of [false, true]) {
      const result = deriveThemeVariables(V12_SOURCE_LOCK_FIXTURE, darkMode);
      expect(result.signalColor).toBe(toHex(V12_SOURCE_LOCK_FIXTURE.lineColor as string));
      expect(result.edgeLabelBackground).toBe(toHex(V12_SOURCE_LOCK_FIXTURE.background));
    }
  });

  it('light-mode derivation equals the recorded observed map exactly (D5: epsilon 0)', () => {
    expect(deriveThemeVariables(V12_SOURCE_LOCK_FIXTURE, false)).toEqual(OBSERVED_LIGHT);
  });

  it('dark-mode derivation equals the recorded observed map exactly (D5: epsilon 0)', () => {
    expect(deriveThemeVariables(V12_SOURCE_LOCK_FIXTURE, true)).toEqual(OBSERVED_DARK);
  });

  it('v12 theme-base constructor anchors reproduce through the engine (D7)', () => {
    // Fed by v12 theme-base source values (chunk-KMA2NSDO.mjs:891-903):
    //   background #f4f4f4, primaryColor #fff4dd (fixture above),
    //   noteBkgColor #fff5ad, noteTextColor #333, THEME_COLOR_LIMIT 12.
    const light = deriveThemeVariables(V12_SOURCE_LOCK_FIXTURE, false);
    const dark = deriveThemeVariables(V12_SOURCE_LOCK_FIXTURE, true);
    expect(light.noteBkgColor).toBe('#fff5ad');
    expect(light.noteTextColor).toBe('#333');
    expect(dark.noteBkgColor).toBe('#fff5ad');
    expect(dark.noteTextColor).toBe('#333');
    // THEME_COLOR_LIMIT = 12 → cScale0..cScale11 emitted, cScale12 absent.
    for (let i = 0; i <= 11; i++) {
      expect(light[`cScale${i}`]).toBeDefined();
      expect(dark[`cScale${i}`]).toBeDefined();
    }
    expect(light.cScale12).toBeUndefined();
    expect(dark.cScale12).toBeUndefined();
  });
});

describe('usecase routing (24-01 DIA-02 — DIAGRAM_TYPE_VARIABLES.usecaseDiagram)', () => {
  // The usecase map entry (24-01 Task 1) is a compiler-forced Record key that
  // routes the new type into the EXISTING derivation path — no formula or
  // engine change. These locks prove the routing is real, not vacuous: the
  // discriminating keys below are present in the usecase entry but ABSENT
  // from the `unknown` fallback set, so a missing entry (fallback active)
  // would strip them and fail these assertions.
  const USECASE_ONLY_KEYS = ['defaultLinkColor', 'titleColor', 'edgeLabelBackground'] as const;

  const CORE_COLORS: ThemeCoreColors = {
    primaryColor: '#ECECFF',
    background: '#ffffff',
  };

  it('deriveThemeVariablesForDiagramType filters to the usecase entry — usecase-only keys survive', () => {
    const result = deriveThemeVariablesForDiagramType(CORE_COLORS, false, 'usecaseDiagram');
    for (const key of USECASE_ONLY_KEYS) {
      expect(
        result[key],
        `usecase-only key "${key}" was stripped — the usecase map entry is missing and the unknown fallback is active`
      ).toBeDefined();
    }
    // The generic node/edge/label portion of the entry survives too
    // (fontFamily/fontSize are pass-through keys, not engine-derived, so they
    // are only asserted when provided in coreColors).
    expect(result.nodeBkg).toBeDefined();
    expect(result.clusterBkg).toBeDefined();
    expect(result.textColor).toBeDefined();
  });

  it('applyThemeToFrontmatter routes usecase-beta content through the new detect branch', () => {
    const theme = {
      id: 'test', name: 'Test', description: 'Test theme', isBuiltin: true,
      coreColors: {
        ...CORE_COLORS,
        // Discriminator: secondaryTextColor is allowed by the UNKNOWN fallback
        // set but NOT by the usecase entry — its absence from the output
        // proves the content routed through the usecase branch's allowed set.
        secondaryTextColor: '#eeeeee',
      },
    };
    // The render-validated 24-01 Task 1 fixture (verbatim).
    const fixture = `usecase-beta
  actor User
  actor Admin
  Admin --|> User
  systemBoundary App
    "Log in"
    "View dashboard"
  end
  User --> "Log in"
  User --> "View dashboard"
  "Log in" ..> : include "View dashboard"`;
    const result = applyThemeToFrontmatter(fixture, theme, false);
    // Positive: the engine always ensures arrowheadColor for types whose
    // allowed set has it (the usecase entry does) — a derived usecase-set key
    // present in the produced frontmatter.
    expect(result).toContain('arrowheadColor:');
    // Negative discriminator: the usecase entry excludes secondaryTextColor,
    // so the core color is filtered out and the key never reaches the YAML.
    expect(result).not.toContain('secondaryTextColor');
  });
});
