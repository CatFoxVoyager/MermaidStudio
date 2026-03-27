import { describe, it, expect } from 'vitest';
import { deriveThemeVariables, applyThemeToFrontmatter, applyC4FromTheme } from '../themeDerivation';
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
      // Should only have one frontmatter block
      const frontmatterCount = (result.match(/^---\n/g) || []).length;
      expect(frontmatterCount).toBe(1);
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
});
