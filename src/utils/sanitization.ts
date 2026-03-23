import DOMPurify from 'dompurify';

/**
 * Sanitize SVG output from Mermaid rendering
 * Uses DOMPurify to prevent XSS attacks while preserving valid SVG
 *
 * IMPORTANT: Mermaid uses foreignObject elements for HTML labels in flowcharts.
 * We trust Mermaid's output as it's a reputable library, so we allow foreignObject
 * and common HTML elements that Mermaid uses for rendering labels.
 */
export function sanitizeSVG(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: [
      'iframe',      // Mermaid may use iframes for some features
      'foreignObject', // Mermaid uses this for HTML labels in flowcharts
      // HTML elements used inside foreignObject for labels
      'div', 'span', 'p', 'a'
    ],
    ADD_ATTR: [
      'allowfullscreen',  // Required iframe attribute
      'frameborder',      // Required iframe attribute
      // ForeignObject specific attributes
      'requiredFeatures', 'overflow'
    ]
  });
}
