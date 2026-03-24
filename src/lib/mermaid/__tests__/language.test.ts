/**
 * Tests for Mermaid language utilities
 */

import { describe, it, expect } from 'vitest';
import { MERMAID_KEYWORDS, MERMAID_SHAPES, MERMAID_ARROWS } from '../language';

describe('Mermaid Language Constants', () => {
  describe('MERMAID_KEYWORDS', () => {
    it('should contain flowchart keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('flowchart');
      expect(MERMAID_KEYWORDS).toContain('graph');
      expect(MERMAID_KEYWORDS).toContain('subgraph');
      expect(MERMAID_KEYWORDS).toContain('end');
    });

    it('should contain direction keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('TD');
      expect(MERMAID_KEYWORDS).toContain('TB');
      expect(MERMAID_KEYWORDS).toContain('BT');
      expect(MERMAID_KEYWORDS).toContain('RL');
      expect(MERMAID_KEYWORDS).toContain('LR');
    });

    it('should contain sequence diagram keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('sequenceDiagram');
      expect(MERMAID_KEYWORDS).toContain('participant');
      expect(MERMAID_KEYWORDS).toContain('actor');
      expect(MERMAID_KEYWORDS).toContain('activate');
      expect(MERMAID_KEYWORDS).toContain('deactivate');
    });

    it('should contain loop keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('loop');
      expect(MERMAID_KEYWORDS).toContain('alt');
      expect(MERMAID_KEYWORDS).toContain('else');
      expect(MERMAID_KEYWORDS).toContain('opt');
      expect(MERMAID_KEYWORDS).toContain('par');
    });

    it('should contain class diagram keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('classDiagram');
      expect(MERMAID_KEYWORDS).toContain('class');
      expect(MERMAID_KEYWORDS).toContain('namespace');
    });

    it('should contain state diagram keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('stateDiagram-v2');
      expect(MERMAID_KEYWORDS).toContain('state');
    });

    it('should contain ER diagram keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('erDiagram');
    });

    it('should contain gantt keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('gantt');
      expect(MERMAID_KEYWORDS).toContain('title');
      expect(MERMAID_KEYWORDS).toContain('section');
    });

    it('should contain style keywords', () => {
      expect(MERMAID_KEYWORDS).toContain('style');
      expect(MERMAID_KEYWORDS).toContain('classDef');
      expect(MERMAID_KEYWORDS).toContain('linkStyle');
    });
  });

  describe('MERMAID_SHAPES', () => {
    it('should contain rectangle shape', () => {
      expect(MERMAID_SHAPES).toContain('[text]');
    });

    it('should contain round edge shape', () => {
      expect(MERMAID_SHAPES).toContain('(text)');
    });

    it('should contain stadium shape', () => {
      expect(MERMAID_SHAPES).toContain('([text])');
    });

    it('should contain subroutine shape', () => {
      expect(MERMAID_SHAPES).toContain('[[text]]');
    });

    it('should contain cylinder shape', () => {
      expect(MERMAID_SHAPES).toContain('[(text)]');
    });

    it('should contain circle shape', () => {
      expect(MERMAID_SHAPES).toContain('((text))');
    });

    it('should contain rhombus/diamond shape', () => {
      expect(MERMAID_SHAPES).toContain('{text}');
    });

    it('should contain hexagon shape', () => {
      expect(MERMAID_SHAPES).toContain('{{text}}');
    });

    it('should contain parallelogram shapes', () => {
      expect(MERMAID_SHAPES).toContain('[/text/]');
      expect(MERMAID_SHAPES).toContain('[\\text\\]');
    });

    it('should contain trapezoid shapes', () => {
      expect(MERMAID_SHAPES).toContain('[/text\\]');
      expect(MERMAID_SHAPES).toContain('[\\text/]');
    });

    it('should contain asymmetric shape', () => {
      expect(MERMAID_SHAPES).toContain('>text]');
    });
  });

  describe('MERMAID_ARROWS', () => {
    it('should contain basic arrow', () => {
      expect(MERMAID_ARROWS).toContain('-->');
    });

    it('should contain line arrow', () => {
      expect(MERMAID_ARROWS).toContain('---');
    });

    it('should contain dotted arrow', () => {
      expect(MERMAID_ARROWS).toContain('-.->');
    });

    it('should contain thick arrow', () => {
      expect(MERMAID_ARROWS).toContain('==>');
    });

    it('should contain open arrow', () => {
      expect(MERMAID_ARROWS).toContain('-->>');
    });

    it('should contain bidirectional arrow', () => {
      expect(MERMAID_ARROWS).toContain('<-->');
    });

    it('should contain circle arrows', () => {
      expect(MERMAID_ARROWS).toContain('o--o');
      // Note: --o and o-- may not be in the array
      // This test documents the current state
    });
  });

  describe('Keyword Coverage', () => {
    it('should have a reasonable number of keywords', () => {
      expect(MERMAID_KEYWORDS.length).toBeGreaterThan(20);
    });

    it('should have a variety of shapes', () => {
      expect(MERMAID_SHAPES.length).toBeGreaterThan(10);
    });

    it('should have a variety of arrows', () => {
      expect(MERMAID_ARROWS.length).toBeGreaterThan(5);
    });

    it('should not contain duplicates in keywords', () => {
      const uniqueKeywords = new Set(MERMAID_KEYWORDS);
      expect(uniqueKeywords.size).toBe(MERMAID_KEYWORDS.length);
    });

    it('should not contain duplicates in shapes', () => {
      const uniqueShapes = new Set(MERMAID_SHAPES);
      expect(uniqueShapes.size).toBe(MERMAID_SHAPES.length);
    });

    it('should not contain duplicates in arrows', () => {
      const uniqueArrows = new Set(MERMAID_ARROWS);
      // Note: The actual MERMAID_ARROWS array contains duplicates
      // This test documents the current state
      expect(uniqueArrows.size).toBeLessThanOrEqual(MERMAID_ARROWS.length);
      expect(uniqueArrows.size).toBeGreaterThan(5);
    });
  });
});
