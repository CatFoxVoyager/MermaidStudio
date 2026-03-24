import { describe, it, expect } from 'vitest';
import { validateDiagramContent, validateTitle, LIMITS } from '../validation';

describe('Validation Utilities', () => {
  describe('LIMITS constant', () => {
    it('should have correct limit values', () => {
      expect(LIMITS.MAX_DIAGRAM_SIZE).toBe(100000);
      expect(LIMITS.MAX_DIAGRAM_LINES).toBe(2000);
      expect(LIMITS.MAX_NESTING_DEPTH).toBe(50);
      expect(LIMITS.MAX_TITLE_LENGTH).toBe(200);
      expect(LIMITS.MIN_TITLE_LENGTH).toBe(1);
    });
  });

  describe('validateDiagramContent', () => {
    it('should accept valid diagram content', () => {
      const validContent = 'graph TD\n  A[Start] --> B[End]';
      const result = validateDiagramContent(validContent);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject content exceeding MAX_DIAGRAM_SIZE', () => {
      const largeContent = 'x'.repeat(100001);
      const result = validateDiagramContent(largeContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should accept content exactly at MAX_DIAGRAM_SIZE', () => {
      const maxSizeContent = 'x'.repeat(100000);
      const result = validateDiagramContent(maxSizeContent);
      expect(result.valid).toBe(true);
    });

    it('should reject content exceeding MAX_DIAGRAM_LINES', () => {
      const manyLines = Array(2001).fill('line').join('\n');
      const result = validateDiagramContent(manyLines);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum line count');
    });

    it('should accept content exactly at MAX_DIAGRAM_LINES', () => {
      const maxLines = Array(2000).fill('line').join('\n');
      const result = validateDiagramContent(maxLines);
      expect(result.valid).toBe(true);
    });

    it('should reject content with script tags', () => {
      const scriptContent = 'graph TD\n  A[<script>alert("xss")</script>]';
      const result = validateDiagramContent(scriptContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should reject content with javascript: protocol', () => {
      const jsContent = 'graph TD\n  A[javascript:alert("xss")]';
      const result = validateDiagramContent(jsContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should reject content with event handlers', () => {
      const eventContent = 'graph TD\n  A[Click me <button onclick="bad()">]';
      const result = validateDiagramContent(eventContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should reject content with iframe tags', () => {
      const iframeContent = 'graph TD\n  A[<iframe src="evil.com"></iframe>]';
      const result = validateDiagramContent(iframeContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should reject content with object tags', () => {
      const objectContent = 'graph TD\n  A[<object data="evil.swf"></object>]';
      const result = validateDiagramContent(objectContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should reject content with embed tags', () => {
      const embedContent = 'graph TD\n  A[<embed src="evil.swf">]';
      const result = validateDiagramContent(embedContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should handle empty content', () => {
      const result = validateDiagramContent('');
      expect(result.valid).toBe(true);
    });

    it('should detect mixed case malicious patterns', () => {
      const mixedCase = 'graph TD\n  A[<SCRIPT>alert("xss")</SCRIPT>]';
      const result = validateDiagramContent(mixedCase);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });

    it('should detect javascript: with different casing', () => {
      const mixedCase = 'graph TD\n  A[JAVASCRIPT:alert("xss")]';
      const result = validateDiagramContent(mixedCase);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });
  });

  describe('validateTitle', () => {
    it('should accept valid titles', () => {
      const result = validateTitle('My Diagram');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject titles exceeding MAX_TITLE_LENGTH', () => {
      const longTitle = 'x'.repeat(201);
      const result = validateTitle(longTitle);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should accept title exactly at MAX_TITLE_LENGTH', () => {
      const maxTitle = 'x'.repeat(200);
      const result = validateTitle(maxTitle);
      expect(result.valid).toBe(true);
    });

    it('should reject empty titles', () => {
      const result = validateTitle('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject titles shorter than MIN_TITLE_LENGTH', () => {
      const result = validateTitle('x');
      expect(result.valid).toBe(true); // Single character is valid
    });

    it('should handle whitespace-only titles', () => {
      const result = validateTitle('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should accept titles with special characters', () => {
      const result = validateTitle('Diagram - 2024 @#$%');
      expect(result.valid).toBe(true);
    });

    it('should accept titles with numbers', () => {
      const result = validateTitle('Diagram 123');
      expect(result.valid).toBe(true);
    });
  });
});
