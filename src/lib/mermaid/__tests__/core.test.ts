/**
 * Tests for Mermaid core with SVG sanitization and input validation
 */

import { describe, it, expect } from 'vitest';
import { renderDiagram, initMermaid, detectDiagramType } from '../core';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { validateDiagramContent } from '@/utils/validation';

// Shared error-path fixtures (PIPE-04).
//
// FM_ERROR: exactly 8 lines — frontmatter = lines 1-5 (closing --- on line 5, so
// the app's frontmatterEndLine = 5); the syntax error is physically on editor
// line 8. Mermaid parses the frontmatter-stripped body, so its raw report is
// body-relative line 3, and the offset must produce "line 8 (absolute)".
// Matches the 22-RESEARCH.md v12 spike verbatim (spike date 2026-09-13).
const FM_ERROR = `---
config:
  flowchart:
    curve: basis
---
flowchart TD
  A[Start] --> B
  B ---> ]Broken`;

// BODY_ONLY: the identical body without frontmatter — the error is physically
// on line 3 and mermaid's raw report already says line 3.
const BODY_ONLY = `flowchart TD
  A[Start] --> B
  B ---> ]Broken`;

// SEQ_FM_ERROR: 3-line frontmatter block (closing --- on line 3, so the app's
// frontmatterEndLine = 3), sequenceDiagram on line 4, invalid statement on
// line 5 (body-relative line 2). Probes research assumption A4: the v12
// sequence parser's raw error DOES carry a body-relative line reference.
const SEQ_FM_ERROR = `---
config:
---
sequenceDiagram
  ThisIsNotAStatement !!!`;

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

    it('should detect YAML frontmatter in content', () => {
      // Content with custom theme using YAML frontmatter
      const contentWithCustomTheme = `---
config:
  theme: base
  themeVariables:
    edgeLabelBackground: '#ffffff'
---
flowchart TD
  A --> B`;

      expect(contentWithCustomTheme.trimStart().startsWith('---')).toBe(true);
    });

    it('should extract edgeLabelBackground color from YAML frontmatter', () => {
      // Test the color extraction from YAML frontmatter
      const content = `---
config:
  theme: base
  themeVariables:
    edgeLabelBackground: '#ffffff'
---
flowchart TD
  A --> B`;

      const match = content.match(/edgeLabelBackground:\s*['"]?([^'"\n]+)/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('#ffffff');
    });

    it('should return null when edgeLabelBackground is not present', () => {
      const contentWithoutEdgeLabel = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff0000'
---
flowchart TD
  A --> B`;

      const match = contentWithoutEdgeLabel.match(/edgeLabelBackground:\s*['"]?([^'"\n]+)/);
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

describe('PIPE-04 D8 — frontmatter error lines (mermaid 12 lock)', { timeout: 30000 }, () => {
  it('reports the editor line for frontmatter-diagram syntax errors on mermaid 12 (offset kept)', async () => {
    const { error } = await renderDiagram(FM_ERROR, 'test_fm_line');

    // Anti-vacuous precondition: mermaid itself parsed and failed —
    // validateDiagramContent must not have rejected the fixture first.
    expect(error).not.toBeNull();
    expect(error).toContain('Lexical error');

    // D8 lock (KEEP decision): raw v12 reports body-relative "line 3";
    // the app offset (frontmatterEndLine = 5) yields the line the user
    // actually wrote: 3 + 5 = 8.
    expect(error).toContain('line 8 (absolute)');
  });

  it('keeps the raw body-relative line for frontmatter-less syntax errors (offset gated on ---)', async () => {
    const { error } = await renderDiagram(BODY_ONLY, 'test_fmless_line');

    // Anti-vacuous precondition: mermaid actually failed.
    expect(error).not.toBeNull();
    expect(error).toContain('Lexical error');

    // The offset logic is gated on content starting with --- and must not
    // fire without frontmatter: the raw body-relative reference survives
    // unchanged and never gains the "(absolute)" suffix.
    expect(error).toContain('line 3');
    expect(error).not.toContain('(absolute)');
  });

  it('reports the editor line for sequence-diagram frontmatter errors too (A4 probe)', async () => {
    const { error } = await renderDiagram(SEQ_FM_ERROR, 'test_seq_fm_line');

    // Anti-vacuous precondition: mermaid's sequence parser actually failed
    // (its raw v12 message form is "Parse error on line N", not "Lexical error").
    expect(error).not.toBeNull();
    expect(error).toContain('Parse error');

    // OBSERVED on mermaid 12.0.0, 2026-09-13 (probe run during Plan 22-01
    // Task 3): the sequence parser's raw error carries a body-relative line
    // reference ("Parse error on line 2"), so the offset regex fires —
    // 2 + frontmatterEndLine(3) = 5, the physical line of the invalid
    // statement. A4's "no line reference → regex no-op" branch did NOT
    // materialize for sequence diagrams on v12.
    expect(error).toContain('line 5 (absolute)');
  });
});

describe('PIPE-04 D9/D10 — temp-element non-remnance (mermaid 12 lock)', { timeout: 30000 }, () => {
  // mermaid 12 leaves BOTH the error svg ({safeId}) and its d-prefixed container
  // div (d{safeId}) in the document after a failed render — its internal cleanup
  // runs only on the success path. renderDiagram's catch block removes both.
  // The negative control below proves that premise on the installed version;
  // the per-surface tests lock zero residue for the id schemes real callers use.
  //
  // Surface coverage note: the visual-editor (VisualEditorCanvas.tsx:99) and
  // fullscreen (FullscreenPreview.tsx:29) surfaces call renderDiagram exactly
  // like preview/export, so these function-level locks cover all five pipeline
  // call-sites by construction (enumerated in 22-RESEARCH.md Verified
  // Codebase Facts).

  it('raw mermaid.render failure leaves BOTH temp elements in the document (negative control)', async () => {
    // Install the app's full mermaid config (dagre/classic pins) before the
    // raw library render, so the control reproduces the app's exact setup.
    initMermaid('light');

    // The raw render must actually fail (premise of the control).
    await expect(mermaid.render('raw_fail_probe', BODY_ONLY)).rejects.toThrow();

    // mermaid 12 does NOT self-clean failed renders: the error svg and its
    // d-prefixed container div both remain in the document.
    expect(document.getElementById('raw_fail_probe')).not.toBeNull();
    expect(document.getElementById('draw_fail_probe')).not.toBeNull();

    // Clean up so the control cannot pollute the rest of the suite.
    document.getElementById('raw_fail_probe')?.remove();
    document.getElementById('draw_fail_probe')?.remove();
  });

  it('preview surface leaves no mermaid temp elements after a failed render', async () => {
    const id = 'preview_fail_probe'; // mirror PreviewPanel.tsx:643 render surface
    const { error } = await renderDiagram(FM_ERROR, id);

    // Anti-vacuous precondition: mermaid actually failed.
    expect(error).not.toBeNull();
    expect(error).toContain('Lexical error');

    // Zero residue for BOTH id forms: the svg (pre-existing removal) and the
    // d-prefixed container div (cleanup extension).
    expect(document.querySelectorAll(`#${id}, #d${id}`).length).toBe(0);
  });

  it('export surface leaves no mermaid temp elements after a failed render', async () => {
    const id = `export_${Date.now()}`; // mirror ExportModal.tsx getSvgString id scheme
    const { error } = await renderDiagram(FM_ERROR, id);

    // Anti-vacuous precondition: mermaid actually failed.
    expect(error).not.toBeNull();
    expect(error).toContain('Lexical error');

    // Zero residue for BOTH id forms of the computed export id.
    expect(document.querySelectorAll(`#${id}, #d${id}`).length).toBe(0);
  });
});
