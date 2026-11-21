/**
 * Tests for sanitization utilities
 *
 * Uses the REAL DOMPurify (wrapped, call-through). A previous version mocked
 * sanitize with an identity function, which made every assertion here pass
 * even if sanitization were fully inert — the XSS regression tests below
 * (foreignObject content) are the reason the real implementation matters:
 * sanitizeMermaidSVG extracts foreignObject HTML before the outer pass and
 * restores it after, so that content bypasses the SVG-profile sanitization.
 *
 * DOMPurify MUTATES the config object it receives (_parseConfig merges the
 * USE_PROFILES expansions back into it), so config assertions cannot inspect
 * the spy's recorded arguments — they read a structuredClone taken BEFORE
 * the real implementation runs (see sanitizeCalls below).
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { sanitizeSVG, sanitizeMermaidSVG } from '../sanitization';
import DOMPurify from 'dompurify';

type SanitizeConfig = Record<string, unknown>;
const sanitizeCalls: Array<{ input: string; config?: SanitizeConfig }> = [];

beforeAll(() => {
  const realSanitize = DOMPurify.sanitize.bind(DOMPurify);
  vi.spyOn(DOMPurify, 'sanitize').mockImplementation(((html: string, config?: SanitizeConfig) => {
    // Snapshot the config before DOMPurify's _parseConfig mutates it.
    sanitizeCalls.push({ input: html, config: config ? structuredClone(config) : undefined });
    return realSanitize(html, config);
  }) as typeof DOMPurify.sanitize);
});

/** Config captured on the Nth (1-based) DOMPurify.sanitize call. */
function configOfCall(n: number): SanitizeConfig | undefined {
  const call = sanitizeCalls[n - 1];
  expect(call, `expected a DOMPurify.sanitize call #${n}`).toBeDefined();
  return call.config;
}

describe('sanitizeSVG', () => {
  beforeEach(() => {
    sanitizeCalls.length = 0;
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

      expect(configOfCall(1)).toEqual(
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

      expect(configOfCall(1)).toEqual(
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

      expect(configOfCall(1)).toEqual(
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
      expect(result).toContain('<foreignObject');
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

      expect(configOfCall(1)).toEqual(
        expect.objectContaining({
          ADD_ATTR: expect.arrayContaining(['data-rendered']),
        })
      );
    });

    it('should preserve data-testid attribute', () => {
      const input = '<svg><rect data-testid="test-element"/></svg>';

      sanitizeSVG(input);

      expect(configOfCall(1)).toEqual(
        expect.objectContaining({
          ADD_ATTR: expect.arrayContaining(['data-testid']),
        })
      );
    });
  });
});

describe('sanitizeMermaidSVG', () => {
  beforeEach(() => {
    sanitizeCalls.length = 0;
  });

  describe('DOMPurify configuration', () => {
    it('should call DOMPurify.sanitize with FORBID_TAGS/FORBID_ATTR as arrays containing the deny-listed entries', () => {
      sanitizeMermaidSVG('<svg/>');

      // Regression lock: FORBID_TAGS and FORBID_ATTR MUST be arrays.
      // DOMPurify's _resolveSetOption silently resolves any non-array value
      // (e.g. the historical { tag: true } object form) to an empty set, so a
      // shape revert would re-disable the forbid list on the app's XSS
      // boundary with no error and no user-visible difference. The asserted
      // members mirror the production deny lists; arrayContaining makes this
      // assertion fail whenever either value stops being an array.
      expect(configOfCall(1)).toEqual(
        expect.objectContaining({
          FORBID_TAGS: expect.arrayContaining([
            'script',
            'iframe',
            'form',
            'input',
          ]),
          FORBID_ATTR: expect.arrayContaining(['onerror', 'onload']),
        })
      );
    });

    it('should sanitize the extracted foreignObject content with an HTML profile and the same deny lists', () => {
      const svg =
        '<svg><foreignObject><div>label</div></foreignObject></svg>';

      sanitizeMermaidSVG(svg);

      // Call 1: the extracted foreignObject content (before the outer SVG
      // pass); call 2: the SVG with placeholders. The inner call is the XSS
      // boundary — it must exist and must carry the deny lists.
      expect(sanitizeCalls.length).toBe(2);
      expect(configOfCall(1)).toEqual(
        expect.objectContaining({
          USE_PROFILES: expect.objectContaining({ html: true }),
          FORBID_TAGS: expect.arrayContaining(['script', 'iframe', 'form', 'input']),
          FORBID_ATTR: expect.arrayContaining(['onerror', 'onload']),
        })
      );
    });
  });

  describe('XSS regression — foreignObject content is sanitized, not restored verbatim', () => {
    // foreignObject content bypasses the outer SVG-profile pass (DOMPurify
    // does not cross the SVG↔HTML namespace boundary), so it must be
    // sanitized on its own before being restored.

    it('strips script tags injected inside foreignObject content', () => {
      const svg =
        '<svg><foreignObject><div>ok</div><script>alert(1)</script></foreignObject></svg>';

      const out = sanitizeMermaidSVG(svg);

      expect(out).not.toContain('<script');
      expect(out).not.toContain('alert(1)');
    });

    it('strips event handler attributes inside foreignObject content', () => {
      const svg =
        '<svg><foreignObject><div onerror="alert(1)">label</div></foreignObject></svg>';

      const out = sanitizeMermaidSVG(svg);

      expect(out).not.toContain('onerror');
    });

    it('strips form controls inside foreignObject content', () => {
      const svg =
        '<svg><foreignObject><form action="https://evil.example"><input/><button>go</button></form></foreignObject></svg>';

      const out = sanitizeMermaidSVG(svg);

      expect(out).not.toContain('<form');
      expect(out).not.toContain('<input');
      expect(out).not.toContain('<button');
    });

    it('strips iframes inside foreignObject content', () => {
      const svg =
        '<svg><foreignObject><iframe src="https://evil.example"></iframe></foreignObject></svg>';

      const out = sanitizeMermaidSVG(svg);

      expect(out).not.toContain('<iframe');
    });

    it('preserves benign Mermaid label markup inside foreignObject', () => {
      const svg =
        '<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"><p>Label</p></span></div></foreignObject></svg>';

      const out = sanitizeMermaidSVG(svg);

      expect(out).toContain('<p>Label</p>');
    });
  });

  describe('image href protocol allowlist (ICON-04, 39-03)', () => {
    // The canonical smallest valid 1x1 data:image/png URI (same fixture the
    // 39-01 render oracle uses — the allowlist must not fight it).
    const PNG_DATA_URI =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const imageSvg = (attrs: string) =>
      `<svg><image ${attrs} width="10" height="10"/></svg>`;

    it('strips a data:image/svg+xml href from <image>', () => {
      const out = sanitizeMermaidSVG(
        imageSvg('href="data:image/svg+xml;base64,PHN2Zy8+"')
      );
      expect(out).not.toContain('data:image/svg+xml');
      expect(out).not.toContain('PHN2Zy8+');
    });

    it('strips a relative href from <image>', () => {
      const out = sanitizeMermaidSVG(imageSvg('href="images/pic.png"'));
      expect(out).not.toContain('images/pic.png');
    });

    it('strips a data:text/html href from <image>', () => {
      const out = sanitizeMermaidSVG(
        imageSvg('href="data:text/html;base64,PGI+PHA+aGk8L3A+PC9i+"')
      );
      expect(out).not.toContain('data:text/html');
    });

    it('strips a javascript: xlink:href from <image>', () => {
      const out = sanitizeMermaidSVG(
        imageSvg('xlink:href="javascript:alert(1)"')
      );
      expect(out).not.toContain('javascript:');
    });

    it('keeps an allowed data:image/png href', () => {
      const out = sanitizeMermaidSVG(imageSvg(`href="${PNG_DATA_URI}"`));
      expect(out).toContain(PNG_DATA_URI);
    });

    it('keeps an https href', () => {
      const out = sanitizeMermaidSVG(
        imageSvg('href="https://example.com/pic.png"')
      );
      expect(out).toContain('https://example.com/pic.png');
    });

    it('adjudicates href and xlink:href independently on the same element', () => {
      const out = sanitizeMermaidSVG(
        imageSvg(
          `href="${PNG_DATA_URI}" xlink:href="data:image/svg+xml;base64,PHN2Zy8+"`
        )
      );
      expect(out).toContain(PNG_DATA_URI);
      expect(out).not.toContain('data:image/svg+xml');
    });
  });

  describe('SMIL event-handler forbid list (ICON-04, 39-03)', () => {
    it('forbids onbegin/onend/onrepeat in BOTH DOMPurify passes', () => {
      const svg =
        '<svg><foreignObject><div>label</div></foreignObject><animate attributeName="x"/></svg>';

      sanitizeMermaidSVG(svg);

      // Call 1: the extracted foreignObject inner pass (HTML profile); call 2:
      // the main SVG-profile pass. The forbiddenAttrs array feeds both.
      expect(sanitizeCalls.length).toBe(2);
      for (const call of [1, 2]) {
        expect(configOfCall(call)).toEqual(
          expect.objectContaining({
            FORBID_ATTR: expect.arrayContaining([
              'onbegin',
              'onend',
              'onrepeat',
            ]),
          })
        );
      }
    });

    it('strips onbegin/onend/onrepeat from a surviving animateTransform element', () => {
      // Carrier is animateTransform, NOT animate: DOMPurify 3.4.17's defaults
      // strip plain <animate> outright (measured at 39-03 HEAD), so an animate
      // carrier would make these attribute assertions pass vacuously — the
      // element must SURVIVE the pipeline for an attribute-strip pin to prove
      // anything. animateTransform/animateMotion are the SMIL carriers
      // mermaid's step: edges actually emit and they survive (measured).
      const out = sanitizeMermaidSVG(
        '<svg><animateTransform attributeName="transform" onbegin="alert(1)" onend="alert(2)" onrepeat="alert(3)"/></svg>'
      );
      expect(out).toContain('<animateTransform');
      expect(out).toContain('attributeName="transform"');
      expect(out).not.toContain('onbegin');
      expect(out).not.toContain('onend');
      expect(out).not.toContain('onrepeat');
    });

    it('keeps benign SMIL carriers (step: edges) intact', () => {
      const out = sanitizeMermaidSVG(
        '<svg><animateTransform attributeName="transform"/><animateMotion path="M0,0 L10,10"/></svg>'
      );
      expect(out).toContain('<animateTransform');
      expect(out).toContain('<animateMotion');
      expect(out).toContain('attributeName="transform"');
    });
  });

  describe('allowlist hook registration guard (39-03)', () => {
    it('stays effective across repeated sanitize calls (no double-registration drift)', () => {
      const good = sanitizeMermaidSVG(
        '<svg><image href="https://example.com/a.png"/></svg>'
      );
      const bad = sanitizeMermaidSVG(
        '<svg><image href="data:image/svg+xml;base64,PHN2Zy8+"/></svg>'
      );
      expect(good).toContain('https://example.com/a.png');
      expect(bad).not.toContain('data:image/svg+xml');
    });
  });
});
