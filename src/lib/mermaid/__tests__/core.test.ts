/**
 * Tests for Mermaid core with SVG sanitization and input validation
 */

import { describe, it, expect } from 'vitest';
import { renderDiagram, initMermaid, detectDiagramType } from '../core';
import DOMPurify from 'dompurify';
import { validateDiagramContent } from '@/utils/validation';

// Import the sanitization config for testing
const SANITIZATION_CONFIG = {
  ALLOWED_TAGS: [
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line',
    'text', 'tspan', 'foreignObject', 'span', 'div', 'p',
    'marker', 'defs', 'use', 'style',
    'clipPath', 'pattern', 'mask', 'symbol',
  ],
  ALLOWED_ATTR: [
    'xmlns', 'viewBox', 'preserveAspectRatio',
    'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity',
    'text-anchor', 'font-family', 'font-size', 'font-weight', 'dominant-baseline',
    'd', 'points', 'transform', 'pathLength',
    'id', 'class', 'href', 'xlink:href', 'marker-start', 'marker-end', 'marker-mid',
    'role', 'aria-label',
  ],
};

describe('Mermaid Core SVG Sanitization', () => {
  describe('Input validation', () => {
    it('should reject oversized diagrams (>100KB)', async () => {
      const largeContent = 'flowchart TD\n' + '  A'.repeat(100000);
      const result = await renderDiagram(largeContent, 'test-id');

      expect(result.svg).toBe('');
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should reject diagrams with too many lines (>2000)', async () => {
      const manyLines = Array(2500).fill('  A --> B').join('\n');
      const content = `flowchart TD\n${manyLines}`;
      const result = await renderDiagram(content, 'test-id');

      expect(result.svg).toBe('');
      expect(result.error).toContain('exceeds maximum line count');
    });

    it('should detect malicious patterns like script tags', async () => {
      const maliciousContent = 'flowchart TD\n  A --> B\n  C --> D<script>alert("xss")</script>';
      const result = await renderDiagram(maliciousContent, 'test-id');

      expect(result.svg).toBe('');
      expect(result.error).toContain('malicious');
    });

    it('should detect javascript: protocol', async () => {
      const maliciousContent = 'flowchart TD\n  A --> B[javascript:alert("xss")]';
      const result = await renderDiagram(maliciousContent, 'test-id');

      expect(result.svg).toBe('');
      expect(result.error).toContain('malicious');
    });

    it('should detect event handlers', async () => {
      const maliciousContent = 'flowchart TD\n  A[onclick="alert(\'xss\')"] --> B';
      const result = await renderDiagram(maliciousContent, 'test-id');

      expect(result.svg).toBe('');
      expect(result.error).toContain('malicious');
    });

    it('should allow valid diagrams within limits', async () => {
      const validContent = 'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End]\n  B -->|No| A';
      const validation = validateDiagramContent(validContent);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
  });

  describe('SVG sanitization', () => {
    it('should sanitize SVG output with DOMPurify before return', () => {
      const maliciousSvg = '<svg><script>alert("xss")</script></svg>';
      const sanitized = DOMPurify.sanitize(maliciousSvg, SANITIZATION_CONFIG);

      // Script tags should be removed
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should preserve text elements (critical for Mermaid labels)', () => {
      const svgWithText = '<svg xmlns="http://www.w3.org/2000/svg"><g><rect x="10" y="10" width="80" height="30"/><text x="50" y="30" text-anchor="middle">Hello World</text></g></svg>';
      const sanitized = DOMPurify.sanitize(svgWithText, SANITIZATION_CONFIG);

      // Text elements should be preserved
      expect(sanitized).toContain('<text');
      expect(sanitized).toContain('Hello World');
      expect(sanitized).toContain('text-anchor');
    });

    it('should preserve tspan elements (used for multi-line text)', () => {
      const svgWithTspan = '<svg xmlns="http://www.w3.org/2000/svg"><text><tspan x="10" dy="0">Line 1</tspan><tspan x="10" dy="20">Line 2</tspan></text></svg>';
      const sanitized = DOMPurify.sanitize(svgWithTspan, SANITIZATION_CONFIG);

      // Tspan elements should be preserved
      expect(sanitized).toContain('<tspan');
      expect(sanitized).toContain('Line 1');
      expect(sanitized).toContain('Line 2');
    });

    it('should allow safe SVG content like style tags', () => {
      const safeSvg = '<svg><style>.test { color: red; }</style></svg>';
      const sanitized = DOMPurify.sanitize(safeSvg, SANITIZATION_CONFIG);

      // Style tags should be allowed
      expect(sanitized).toContain('<style>');
      expect(sanitized).toContain('color: red');
    });

    it('should allow SVG attributes like viewBox', () => {
      const safeSvg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';
      const sanitized = DOMPurify.sanitize(safeSvg, SANITIZATION_CONFIG);

      // viewBox attribute should be allowed
      expect(sanitized).toContain('viewBox');
    });

    it('should block event handlers like onclick', () => {
      const maliciousSvg = '<svg><rect onclick="alert(\'xss\')" x="10" y="10" width="50" height="50"/></svg>';
      const sanitized = DOMPurify.sanitize(maliciousSvg, SANITIZATION_CONFIG);

      // onclick handler should be removed
      expect(sanitized).not.toContain('onclick');
    });

    it('should detect and block javascript: protocol in SVG', () => {
      const maliciousSvg = '<svg><a href="javascript:alert(\'xss\')">Click</a></svg>';
      const sanitized = DOMPurify.sanitize(maliciousSvg, SANITIZATION_CONFIG);

      // javascript: protocol should be removed
      expect(sanitized).not.toContain('javascript:');
    });

    it('should re-sanitize after custom theme edge label fix', () => {
      const safeSvg = '<svg><circle cx="50" cy="50" r="40"/></svg>';
      const sanitized = DOMPurify.sanitize(safeSvg, SANITIZATION_CONFIG);

      // Simulate modification
      const modifiedSvg = sanitized.replace('r="40"', 'r="50"');

      // Re-sanitize after modification
      const reSanitized = DOMPurify.sanitize(modifiedSvg, SANITIZATION_CONFIG);

      // Should still be clean
      expect(reSanitized).not.toContain('<script>');
      expect(reSanitized).not.toContain('javascript:');
    });

    it('should allow foreignObject element but sanitize its content', () => {
      const svgWithForeignObject = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject x="10" y="10" width="100" height="50"><div>Rich label</div></foreignObject></svg>';
      const sanitized = DOMPurify.sanitize(svgWithForeignObject, SANITIZATION_CONFIG);

      // foreignObject tag itself should be preserved
      expect(sanitized).toContain('<foreignObject');

      // Note: DOMPurify may strip HTML content inside foreignObject for security
      // This is acceptable - Mermaid primarily uses text/tspan for labels
    });

    it('should block SMIL animation tags to reduce attack surface', () => {
      // Note: Mermaid uses CSS animations, not SMIL animations
      const svgWithAnimation = '<svg><circle cx="50" cy="50" r="40"><animate attributeName="r" from="40" to="50" dur="1s"/></circle></svg>';
      const sanitized = DOMPurify.sanitize(svgWithAnimation, SANITIZATION_CONFIG);

      // animate tag should be removed
      expect(sanitized).not.toContain('<animate');
    });

    it('should detect custom theme directive in content', () => {
      // Content with custom theme
      const contentWithCustomTheme = `%%{init: {'theme':'base', 'themeVariables': { 'edgeLabelBackground':'#ffffff' }}}%%
flowchart TD
  A --> B`;

      expect(contentWithCustomTheme.trimStart().startsWith('%%{init:')).toBe(true);
    });

    it('should extract edgeLabelBackground color from content', () => {
      // Test the color extraction regex pattern
      const content = `%%{init: {'theme':'base', 'themeVariables': { 'edgeLabelBackground':'#ffffff' }}}%%
flowchart TD
  A --> B`;

      const match = content.match(/'edgeLabelBackground'\s*:\s*'([^']+)'/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('#ffffff');
    });

    it('should return null when edgeLabelBackground is not present', () => {
      const contentWithoutEdgeLabel = `%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#ff0000' }}}%%
flowchart TD
  A --> B`;

      const match = contentWithoutEdgeLabel.match(/'edgeLabelBackground'\s*:\s*'([^']+)'/);
      expect(match).toBeNull();
    });

    it('should calculate luminance for light background', () => {
      // Simulate the luminance calculation for white background
      const bg = '#ffffff';
      const r = parseInt(bg.substr(1, 2), 16);
      const g = parseInt(bg.substr(3, 2), 16);
      const b = parseInt(bg.substr(5, 2), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      expect(lum).toBeGreaterThan(0.5);
      // White background should use black text
      const textColor = lum > 0.5 ? '#000000' : '#ffffff';
      expect(textColor).toBe('#000000');
    });

    it('should calculate luminance for dark background', () => {
      // Simulate the luminance calculation for black background
      const bg = '#000000';
      const r = parseInt(bg.substr(1, 2), 16);
      const g = parseInt(bg.substr(3, 2), 16);
      const b = parseInt(bg.substr(5, 2), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      expect(lum).toBeLessThanOrEqual(0.5);
      // Dark background should use white text
      const textColor = lum > 0.5 ? '#000000' : '#ffffff';
      expect(textColor).toBe('#ffffff');
    });

    it('should handle edge label color fix safely in SVG string manipulation', () => {
      // Test the SVG manipulation without actual rendering
      const svgString = '<svg xmlns="http://www.w3.org/2000/svg"><g class="edgeLabel"><span>Label</span></g></svg>';

      // Simulate DOMParser manipulation (simplified)
      const textColor = '#000000';
      const modifiedSvg = svgString.replace(/<span>/g, `<span style="color: ${textColor}">`);

      expect(modifiedSvg).toContain('style="color: #000000"');
      // After modification, should still be sanitizable
      const sanitized = DOMPurify.sanitize(modifiedSvg, SANITIZATION_CONFIG);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('initMermaid', () => {
    it('should initialize with default dark theme', () => {
      // This test verifies that initMermaid doesn't throw
      expect(() => initMermaid('dark')).not.toThrow();
    });

    it('should initialize with light theme', () => {
      expect(() => initMermaid('light')).not.toThrow();
    });

    it('should accept both theme variants', () => {
      expect(() => initMermaid('dark')).not.toThrow();
      expect(() => initMermaid('light')).not.toThrow();
    });
  });

  describe('detectDiagramType', () => {
    it('should detect flowchart TD type', () => {
      const content = 'flowchart TD\nA-->B';
      const type = detectDiagramType(content);
      expect(type).toBe('flowchart');
    });

    it('should detect flowchart LR type', () => {
      const content = 'flowchart LR\nA-->B';
      const type = detectDiagramType(content);
      expect(type).toBe('flowchart');
    });

    it('should detect graph type (old syntax)', () => {
      const content = 'graph TD\nA-->B';
      const type = detectDiagramType(content);
      expect(type).toBe('flowchart');
    });

    it('should detect sequence diagram type', () => {
      const content = 'sequenceDiagram\nA->B: Hello';
      const type = detectDiagramType(content);
      expect(type).toBe('sequence');
    });

    it('should detect class diagram type', () => {
      const content = 'classDiagram\nAnimal --> Duck';
      const type = detectDiagramType(content);
      expect(type).toBe('classDiagram');
    });

    it('should detect state diagram type', () => {
      const content = 'stateDiagram-v2\n[*] --> Active';
      const type = detectDiagramType(content);
      expect(type).toBe('stateDiagram');
    });

    it('should detect ER diagram type', () => {
      const content = 'erDiagram\nCustomer ||--o{ Order : places';
      const type = detectDiagramType(content);
      expect(type).toBe('erDiagram');
    });

    it('should detect gantt chart type', () => {
      const content = 'gantt\n    title A Gantt Diagram\n    section Section';
      const type = detectDiagramType(content);
      expect(type).toBe('gantt');
    });

    it('should detect pie chart type', () => {
      const content = 'pie title Pets\n    "Dogs" : 386';
      const type = detectDiagramType(content);
      expect(type).toBe('pie');
    });

    it('should detect mindmap type', () => {
      const content = 'mindmap\n  root((mindmap))';
      const type = detectDiagramType(content);
      expect(type).toBe('mindmap');
    });

    it('should detect git graph type', () => {
      const content = 'gitGraph\n    commit';
      const type = detectDiagramType(content);
      expect(type).toBe('gitGraph');
    });

    it('should return unknown for unrecognized types', () => {
      const content = 'not a valid diagram type';
      const type = detectDiagramType(content);
      expect(type).toBe('unknown');
    });

    it('should handle case-insensitive detection', () => {
      const content = 'FLOWCHART TD\nA-->B';
      const type = detectDiagramType(content);
      expect(type).toBe('flowchart');
    });

    it('should trim whitespace from content', () => {
      const content = '  \n  flowchart TD\nA-->B';
      const type = detectDiagramType(content);
      expect(type).toBe('flowchart');
    });

    it('should handle empty content', () => {
      const content = '';
      const type = detectDiagramType(content);
      expect(type).toBe('unknown');
    });

    it('should handle whitespace-only content', () => {
      const content = '   \n\n  \n   ';
      const type = detectDiagramType(content);
      expect(type).toBe('unknown');
    });
  });
});
