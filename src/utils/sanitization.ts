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
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: [
      'foreignObject',
      'div', 'span', 'p', 'a'
    ],
    ADD_ATTR: [
      'requiredFeatures', 'overflow',
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
    if (Object.prototype.hasOwnProperty.call(data, key)) {
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
      if (Object.prototype.hasOwnProperty.call(d, key)) {
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
          if (Object.prototype.hasOwnProperty.call(entry, key)) {
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
      if (Object.prototype.hasOwnProperty.call(data.settings as Record<string, unknown>, key)) {
        throw new Error('Invalid backup: settings contains disallowed key');
      }
    }
  }

  return data as unknown as BackupData;
}

/**
 * Sanitize Mermaid SVG output while preserving foreignObject HTML content.
 * DOMPurify strips HTML content inside foreignObject because it doesn't
 * handle SVG↔HTML namespace switching. We work around this by extracting
 * foreignObject content before sanitization, then restoring it after.
 */
export function sanitizeMermaidSVG(svg: string): string {
  const foContents: string[] = [];
  const placeholder = '%%MMPRESERVE';
  const withPlaceholders = svg.replace(
    /<foreignObject([^>]*)>([\s\S]*?)<\/foreignObject>/g,
    (_, attrs, content) => {
      foContents.push(content);
      return `<foreignObject${attrs}>${placeholder}${foContents.length - 1}%%</foreignObject>`;
    }
  );

  const forbiddenTags = ['iframe', 'form', 'input', 'textarea', 'select', 'button', 'script', 'object', 'embed', 'applet'];
  const sanitized = DOMPurify.sanitize(withPlaceholders, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
    FORBID_TAGS: Object.fromEntries(forbiddenTags.map(t => [t, true])),
    FORBID_ATTR: { onerror: true, onload: true, onclick: true, onmouseover: true },
  });

  return sanitized.replace(
    new RegExp(`${placeholder}(\\d+)%%`, 'g'),
    (_, idx) => foContents[parseInt(idx)]
  );
}
