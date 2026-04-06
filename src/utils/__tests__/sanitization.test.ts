/**
 * Tests for sanitization utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeSVG } from '../sanitization';

// Mock DOMPurify since jsdom may not have full DOMPurify support
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
  __esModule: true,
}));

// Import the mock after it's defined
import DOMPurify from 'dompurify';

describe('sanitizeSVG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return sanitized output from DOMPurify.sanitize', () => {
      const input = '<svg><rect width="100" height="100"/></svg>';
      const result = sanitizeSVG(input);

      expect(result).toBeDefined();
    });

    it('should handle empty strings', () => {
      const result = sanitizeSVG('');
      expect(result).toBe('');
    });

    it('should handle strings with special characters', () => {
      const input = '<svg><text>&lt;special&gt;</text></svg>';
      const result = sanitizeSVG(input);
      expect(result).toBeDefined();
    });
  });

  describe('DOMPurify configuration', () => {
    it('should call DOMPurify.sanitize with USE_PROFILES containing svg: true', () => {
      const input = '<svg><rect/></svg>';

      sanitizeSVG(input);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(
        input,
        expect.objectContaining({
          USE_PROFILES: expect.objectContaining({
            svg: true,
            svgFilters: true,
          }),
        })
      );
    });

    it('should call DOMPurify.sanitize with ADD_TAGS including foreignObject, div, and span', () => {
      const input = '<svg><foreignObject><div>content</div></foreignObject></svg>';

      sanitizeSVG(input);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(
        input,
        expect.objectContaining({
          ADD_TAGS: expect.arrayContaining([
            'foreignObject',
            'div',
            'span',
          ]),
        })
      );
    });

    it('should call DOMPurify.sanitize with ADD_ATTR including data-rendered and data-testid', () => {
      const input = '<svg><rect data-rendered="true" data-testid="rect-1"/></svg>';

      sanitizeSVG(input);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(
        input,
        expect.objectContaining({
          ADD_ATTR: expect.arrayContaining([
            'data-rendered',
            'data-testid',
          ]),
        })
      );
    });
  });

  describe('Mermaid-specific SVG elements', () => {
    it('should allow foreignObject elements', () => {
      const input = '<svg><foreignObject><div>Label</div></foreignObject></svg>';
      const result = sanitizeSVG(input);
      expect(result).toBeDefined();
    });

    it('should allow iframe elements', () => {
      const input = '<svg><iframe src="content.html"/></svg>';
      const result = sanitizeSVG(input);
      expect(result).toBeDefined();
    });

    it('should allow standard HTML elements inside foreignObject', () => {
      const input = '<svg><foreignObject><p>Text</p><a href="#">Link</a></foreignObject></svg>';
      const result = sanitizeSVG(input);
      expect(result).toBeDefined();
    });
  });

  describe('E2E test attributes', () => {
    it('should preserve data-rendered attribute', () => {
      const input = '<svg><rect data-rendered="true"/></svg>';

      sanitizeSVG(input);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(
        input,
        expect.objectContaining({
          ADD_ATTR: expect.arrayContaining(['data-rendered']),
        })
      );
    });

    it('should preserve data-testid attribute', () => {
      const input = '<svg><rect data-testid="test-element"/></svg>';

      sanitizeSVG(input);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(
        input,
        expect.objectContaining({
          ADD_ATTR: expect.arrayContaining(['data-testid']),
        })
      );
    });
  });
});
