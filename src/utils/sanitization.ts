import DOMPurify from 'dompurify';
import type { BackupData } from '@/types';

/**
 * Sanitize SVG output from Mermaid rendering
 * Uses DOMPurify to prevent XSS attacks while preserving valid SVG
 *
 * IMPORTANT: Mermaid uses foreignObject elements for HTML labels in flowcharts.
 * We allow foreignObject and common HTML elements that Mermaid uses for rendering labels.
 * iframe is NOT allowed as Mermaid never generates iframes in SVG output.
 */
export function sanitizeSVG(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: [
      'foreignObject', // Mermaid uses this for HTML labels in flowcharts
      // HTML elements used inside foreignObject for labels
      'div', 'span', 'p', 'a'
    ],
    ADD_ATTR: [
      // ForeignObject specific attributes
      'requiredFeatures', 'overflow',
      // E2E test attributes
      'data-rendered', 'data-testid'
    ]
  });
}

// Backup import validation constants
const MAX_BACKUP_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_STRING_FIELD_LENGTH = 10000;
const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Validate backup data before importing to prevent prototype pollution,
 * oversized payloads, and malformed entries.
 */
export function validateBackupData(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid backup: expected an object');
  }
  const data = raw as Record<string, unknown>;

  // Check for prototype pollution keys at top level
  for (const key of PROTOTYPE_POLLUTION_KEYS) {
    if (key in data) {
      throw new Error(`Invalid backup: contains disallowed key "${key}"`);
    }
  }

  // diagrams must be an array
  if (!Array.isArray(data.diagrams)) {
    throw new Error('Invalid backup: missing or invalid diagrams array');
  }

  // Validate each diagram entry
  for (let i = 0; i < data.diagrams.length; i++) {
    const d = data.diagrams[i] as Record<string, unknown>;
    if (!d || typeof d !== 'object') {
      throw new Error(`Invalid backup: diagrams[${i}] is not an object`);
    }
    for (const key of PROTOTYPE_POLLUTION_KEYS) {
      if (key in d) {
        throw new Error(`Invalid backup: diagrams[${i}] contains disallowed key "${key}"`);
      }
    }
    if (typeof d.id !== 'string' || d.id.length === 0 || d.id.length > MAX_STRING_FIELD_LENGTH) {
      throw new Error(`Invalid backup: diagrams[${i}].id is invalid`);
    }
    if (typeof d.title !== 'string' || d.title.length > MAX_STRING_FIELD_LENGTH) {
      throw new Error(`Invalid backup: diagrams[${i}].title is invalid`);
    }
    if (typeof d.content !== 'string' || d.content.length > MAX_BACKUP_SIZE) {
      throw new Error(`Invalid backup: diagrams[${i}].content is too large or missing`);
    }
  }

  // Validate optional array fields with same pollution checks
  for (const field of ['folders', 'versions', 'tags', 'diagramTags', 'userTemplates'] as const) {
    if (field in data && data[field] !== undefined) {
      if (!Array.isArray(data[field])) {
        throw new Error(`Invalid backup: ${field} must be an array`);
      }
      for (const entry of data[field] as Record<string, unknown>[]) {
        for (const key of PROTOTYPE_POLLUTION_KEYS) {
          if (key in entry) {
            throw new Error(`Invalid backup: ${field} entry contains disallowed key "${key}"`);
          }
        }
      }
    }
  }

  // Validate optional settings object
  if (data.settings !== undefined && data.settings !== null) {
    if (typeof data.settings !== 'object' || Array.isArray(data.settings)) {
      throw new Error('Invalid backup: settings must be an object');
    }
    for (const key of PROTOTYPE_POLLUTION_KEYS) {
      if (key in (data.settings as Record<string, unknown>)) {
        throw new Error('Invalid backup: settings contains disallowed key');
      }
    }
  }

  return data as unknown as BackupData;
}

/**
 * DOMPurify configuration for sanitizing Mermaid SVG output.
 * Explicit allowlist approach — more restrictive than USE_PROFILES.
 */
export const MERMAID_SVG_CONFIG = {
  ALLOWED_TAGS: [
    // Basic SVG structure
    'svg', 'g',
    // Shapes
    'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line',
    // Text elements (critical for Mermaid labels)
    'text', 'tspan',
    // foreignObject allows HTML content inside SVG - Mermaid uses this for rich labels
    'foreignObject',
    // HTML elements inside foreignObject (used by Mermaid for labels)
    'span', 'div', 'p',
    // Markers and definitions (arrowheads, gradients, etc.)
    'marker', 'defs', 'use', 'style',
    // Other SVG features
    'clipPath', 'pattern', 'mask', 'symbol',
  ],
  ALLOWED_ATTR: [
    // Core SVG attributes
    'xmlns', 'viewBox', 'preserveAspectRatio',
    // Positioning and sizing
    'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
    // Sizing for foreignObject
    'requiredFeatures', 'overflow',
    // Styling
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity',
    // Text attributes
    'text-anchor', 'font-family', 'font-size', 'font-weight', 'dominant-baseline', 'alignment-baseline',
    // Inline styles for dynamic content
    'style',
    // Path and shape data
    'd', 'points', 'transform', 'pathLength', 'transform-origin',
    // References
    'id', 'class', 'href', 'xlink:href', 'marker-start', 'marker-end', 'marker-mid',
    // Accessibility
    'role', 'aria-label',
    // HTML attributes for foreignObject content
    'xmlns:xlink', 'xmlns:xhtml',
    // ForeignObject specific
    'xlink:type',
  ],
  // Allow data URIs for images
  ALLOW_DATA_URI: true,
  // Disallow unknown attributes for security
  ALLOW_UNKNOWN_ATTRS: false,
} satisfies { ALLOWED_TAGS: string[]; ALLOWED_ATTR: string[]; ALLOW_DATA_URI: boolean; ALLOW_UNKNOWN_ATTRS: boolean };

/**
 * Sanitize Mermaid SVG output using the restrictive allowlist config.
 */
export function sanitizeMermaidSVG(svg: string): string {
  return DOMPurify.sanitize(svg, MERMAID_SVG_CONFIG);
}
