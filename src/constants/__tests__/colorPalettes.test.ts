import { describe, it, expect } from 'vitest';
import { applyStyleToContent, applyC4Palette, stripC4Directives } from '../colorPalettes';
import { getStylingCapabilities } from '@/types';
import type { DiagramType, ColorPalette } from '@/types';

describe('applyStyleToContent', () => {
  describe('Pie diagrams', () => {
    it('should NOT apply font settings to pie diagrams without palette (avoids unwanted background colors)', () => {
      const pieContent = `pie title Test
  "A" : 10
  "B" : 20`;

      const styleOptions = {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
      };

      const result = applyStyleToContent(pieContent, styleOptions);

      // Font-only changes without palette should NOT generate YAML to avoid Mermaid applying default colors
      expect(result).toBe(pieContent);
      expect(result).not.toContain('themeVariables');
    });

    it('should apply useMaxWidth to pie diagrams with base theme variables', () => {
      const pieContent = `pie title Test
  "A" : 10
  "B" : 20`;

      const styleOptions = {
        useMaxWidth: false,
      };

      const result = applyStyleToContent(pieContent, styleOptions);

      expect(result).toContain('useMaxWidth');
      expect(result).toContain('false');
      // Should include base theme variables to prevent default colors
      // Note: Mermaid expects quoted values for themeVariables
      expect(result).toContain("theme: 'base'");
      expect(result).toContain("primaryColor: '#fff4dd'");
      expect(result).toContain('themeVariables');
    });

    it('should not modify content if no style options are provided', () => {
      const pieContent = `pie title Test
  "A" : 10
  "B" : 20`;

      const styleOptions = {};

      const result = applyStyleToContent(pieContent, styleOptions);

      // Should return the content as-is (no YAML config added)
      expect(result).toBe(pieContent);
    });
  });

  describe('Timeline diagrams', () => {
    it('should NOT apply font settings to timeline diagrams without palette (avoids unwanted background colors)', () => {
      const timelineContent = `timeline
    title 2024
    2024-01-01 : Start
    2024-12-31 : End`;

      const styleOptions = {
        fontFamily: 'Georgia, serif',
        fontSize: 14,
      };

      const result = applyStyleToContent(timelineContent, styleOptions);

      // Font-only changes without palette should NOT generate YAML to avoid Mermaid applying default colors
      expect(result).toBe(timelineContent);
      expect(result).not.toContain('themeVariables');
    });

    it('should apply font settings when combined with timeline-specific options', () => {
      const timelineContent = `timeline
    title 2024
    2024-01-01 : Start
    2024-12-31 : End`;

      const styleOptions = {
        fontFamily: 'Georgia, serif',
        fontSize: 14,
        disableMulticolor: true,
      };

      const result = applyStyleToContent(timelineContent, styleOptions);

      // Font settings should be applied since we have diagram config
      expect(result).toContain('Georgia');
      expect(result).toContain('14px');
      expect(result).toContain('disableMulticolor');
      expect(result).toContain('themeVariables');
      expect(result).toContain('primaryColor');
    });

    it('should apply timeline-specific options', () => {
      const timelineContent = `timeline
    title 2024
    2024-01-01 : Start
    2024-12-31 : End`;

      const styleOptions = {
        disableMulticolor: true,
        htmlLabels: false,
      };

      const result = applyStyleToContent(timelineContent, styleOptions);

      expect(result).toContain('disableMulticolor');
      expect(result).toContain('htmlLabels');
    });
  });

  describe('Quadrant charts', () => {
    it('should NOT apply font settings to quadrant charts without actual config options (avoids unwanted background colors)', () => {
      const quadrantContent = `quadrantChart
    title Test
    x-axis Low --> High
    y-axis Low --> High`;

      const styleOptions = {
        fontFamily: 'Courier New, monospace',
        fontSize: 12,
      };

      const result = applyStyleToContent(quadrantContent, styleOptions);

      // Font-only changes without palette should NOT generate YAML to avoid Mermaid applying default colors
      expect(result).toBe(quadrantContent);
      expect(result).not.toContain('Courier New');
    });

    it('should apply font settings when combined with chart dimensions', () => {
      const quadrantContent = `quadrantChart
    title Test
    x-axis Low --> High
    y-axis Low --> High`;

      const styleOptions = {
        fontFamily: 'Courier New, monospace',
        fontSize: 12,
        chartWidth: 600,
      };

      const result = applyStyleToContent(quadrantContent, styleOptions);

      // Font settings should be applied since we have diagram config
      expect(result).toContain('Courier New');
      expect(result).toContain('12px');
      expect(result).toContain('chartWidth');
      expect(result).toContain('600');
      expect(result).toContain('themeVariables');
      expect(result).toContain('primaryColor');
    });

    it('should apply chart dimensions', () => {
      const quadrantContent = `quadrantChart
    title Test
    x-axis Low --> High
    y-axis Low --> High`;

      const styleOptions = {
        chartWidth: 600,
        chartHeight: 400,
      };

      const result = applyStyleToContent(quadrantContent, styleOptions);

      expect(result).toContain('chartWidth');
      expect(result).toContain('600');
      expect(result).toContain('chartHeight');
      expect(result).toContain('400');
    });
  });

  describe('XY charts', () => {
    it('should NOT apply font settings to xy charts without actual config options (avoids unwanted background colors)', () => {
      const xyContent = `xychart-beta
    title "Test Chart"
    x-axis [Data]
    y-axis "Value" 0 --> 100`;

      const styleOptions = {
        fontFamily: 'Fira Code, monospace',
        fontSize: 11,
      };

      const result = applyStyleToContent(xyContent, styleOptions);

      // Font-only changes without palette should NOT generate YAML to avoid Mermaid applying default colors
      expect(result).toBe(xyContent);
      expect(result).not.toContain('Fira Code');
    });

    it('should apply font settings when combined with xy chart options', () => {
      const xyContent = `xychart-beta
    title "Test Chart"
    x-axis [Data]
    y-axis "Value" 0 --> 100`;

      const styleOptions = {
        fontFamily: 'Fira Code, monospace',
        fontSize: 11,
        xAxisTitle: 'Time',
      };

      const result = applyStyleToContent(xyContent, styleOptions);

      // Font settings should be applied since we have diagram config
      expect(result).toContain('Fira Code');
      expect(result).toContain('11px');
      expect(result).toContain('xAxisTitle');
      expect(result).toContain('Time');
      expect(result).toContain('themeVariables');
      expect(result).toContain('primaryColor');
    });
  });
});

describe('getStylingCapabilities', () => {
  it('C4 diagram returns supportsClassDef: false, supportsC4Style: true', () => {
    const caps = getStylingCapabilities('c4' as DiagramType);
    expect(caps.supportsClassDef).toBe(false);
    expect(caps.supportsC4Style).toBe(true);
  });

  it('requirementDiagram returns supportsClassDef: true, supportsC4Style: false', () => {
    const caps = getStylingCapabilities('requirementDiagram' as DiagramType);
    expect(caps.supportsClassDef).toBe(true);
    expect(caps.supportsC4Style).toBe(false);
  });

  it('flowchart returns supportsClassDef: true, supportsC4Style: false (no regression)', () => {
    const caps = getStylingCapabilities('flowchart' as DiagramType);
    expect(caps.supportsClassDef).toBe(true);
    expect(caps.supportsC4Style).toBe(false);
  });

  it('erDiagram returns supportsClassDef: false, supportsC4Style: false (no regression)', () => {
    const caps = getStylingCapabilities('erDiagram' as DiagramType);
    expect(caps.supportsClassDef).toBe(false);
    expect(caps.supportsC4Style).toBe(false);
  });
});

describe('applyC4Palette', () => {
  const testPalette: ColorPalette = {
    id: 'test-c4',
    name: 'Test C4',
    description: 'Test palette for C4',
    colors: {
      primary: '#0066CC',
      secondary: '#004499',
      accent: '#0099FF',
      success: '#00AA44',
      warning: '#FF9900',
      error: '#CC0000',
      neutral_light: '#F5F7FA',
      neutral_dark: '#1A1F2E',
    },
  };

  it('generates UpdateElementStyle directives with palette colors', () => {
    const c4Content = `C4Context
    title System Context
    Person(user, "User")
    System(sys, "System")`;

    const result = applyC4Palette(c4Content, testPalette);

    expect(result).toContain('UpdateElementStyle(person,');
    expect(result).toContain('UpdateElementStyle(system,');
    expect(result).toContain(testPalette.colors.primary);
  });

  it('generates UpdateRelStyle directives with palette colors', () => {
    const c4Content = `C4Context
    title System Context
    Person(user, "User")
    System(sys, "System")
    Rel(user, sys, "Uses")`;

    const result = applyC4Palette(c4Content, testPalette);

    expect(result).toContain('UpdateRelStyle(line,');
    expect(result).toContain(testPalette.colors.secondary);
  });

  it('C4 content after palette application contains UpdateElementStyle but NOT classDef', () => {
    const c4Content = `C4Context
    title System Context
    Person(user, "User")`;

    const result = applyC4Palette(c4Content, testPalette);

    expect(result).toContain('UpdateElementStyle');
    expect(result).not.toContain('classDef');
    expect(result).not.toContain('class ');
  });

  it('strips existing UpdateElementStyle/UpdateRelStyle before applying new ones', () => {
    const c4Content = `C4Context
    title System Context
    Person(user, "User")
    UpdateElementStyle(person, $bgColor="#old")
    UpdateRelStyle(line, $lineColor="#old")`;

    const result = applyC4Palette(c4Content, testPalette);

    expect(result).not.toContain('#old');
    expect(result).toContain('UpdateElementStyle(person,');
    expect(result).toContain('UpdateRelStyle(line,');
  });
});

describe('stripC4Directives', () => {
  it('removes UpdateElementStyle lines', () => {
    const content = `C4Context
    Person(user, "User")
    UpdateElementStyle(person, $bgColor="#0066CC")`;

    const result = stripC4Directives(content);

    expect(result).not.toContain('UpdateElementStyle');
    expect(result).toContain('Person(user, "User")');
  });

  it('removes UpdateRelStyle lines', () => {
    const content = `C4Context
    Rel(user, sys, "Uses")
    UpdateRelStyle(line, $lineColor="#004499")`;

    const result = stripC4Directives(content);

    expect(result).not.toContain('UpdateRelStyle');
    expect(result).toContain('Rel(user, sys, "Uses")');
  });

  it('removes both UpdateElementStyle and UpdateRelStyle lines', () => {
    const content = `C4Context
    Person(user, "User")
    UpdateElementStyle(person, $bgColor="#0066CC")
    UpdateRelStyle(line, $lineColor="#004499")`;

    const result = stripC4Directives(content);

    expect(result).not.toContain('UpdateElementStyle');
    expect(result).not.toContain('UpdateRelStyle');
  });
});
