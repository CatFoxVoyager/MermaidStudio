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
    ADD_TAGS: ['foreignObject', 'div', 'span', 'p', 'a'],
    ADD_ATTR: ['requiredFeatures', 'overflow', 'data-rendered', 'data-testid'],
  });
}

/**
 * Neutralize characters that would let a user-provided value break out of a
 * CSS declaration (`;`, `}`) or of an HTML <style> block (`<`, `>`). Quotes
 * and commas are preserved so font stacks like `"Segoe UI", sans-serif`
 * keep working.
 */
export function sanitizeCssValue(value: string): string {
  return value.replace(/[<>{};\\]/g, '').replace(/[\r\n]/g, '');
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

// ---------------------------------------------------------------------------
// <image> href protocol allowlist (ICON-04 / T-39-05)
//
// Mermaid 12 renders img: nodes as <image href="...">. DOMPurify's defaults
// allow data: URIs on image tags, so a data:image/svg+xml payload (nested SVG
// document, script-bearing), a data:text/html URI, or a relative ref all
// survive sanitization today (measured at phase 39 planning HEAD). The
// allowlist admits exactly: https URLs and raster data:image/(png|jpeg|webp|gif)
// URIs — everything else on ANY media-attribute carrier of the image/video
// element family is removed (39-REVIEW WR-01 + WR-06). The carrier class:
// SVG <image> href/xlink:href/src, HTML <img> and <source> src/srcset, and
// <video>/<audio> src (the latter three sit in DOMPurify's DATA_URI_TAGS
// set, so their data: URIs are otherwise admitted). srcset values are
// candidate lists and are checked per candidate: DOMPurify URI-validates a
// srcset VALUE prefix-anchored against its whole text, so one
// scheme-prefixed candidate admits a payload riding in a later slot.
//
// DOMPurify hooks are INSTANCE-GLOBAL (they run for every sanitize call on the
// instance, both sanitizeMermaidSVG passes and the sanitizeSVG preview path),
// so the hook registers ONCE at module load; the flag guards double
// registration if the module ever re-executes (HMR) — addHook appends, so a
// second registration would run the check twice per attribute.
// ---------------------------------------------------------------------------

const IMAGE_HREF_DATA_TYPE = /^data:image\/(png|jpeg|webp|gif)\s*[;,]/i;
const HTTPS_URL = /^https:\/\//i;

function isAllowedImageHref(value: string): boolean {
  const href = value.trim();
  return HTTPS_URL.test(href) || IMAGE_HREF_DATA_TYPE.test(href);
}

// A srcset value is a candidate LIST ("url 1x, url 2x"), not a single URI:
// the browser parses every comma-separated candidate and loads whichever
// matches, so the whole attribute is admitted only when EVERY candidate's
// URL token (first whitespace-delimited field) passes the same allowlist as
// src. Any failing candidate drops the entire attribute — per-candidate
// filtering would have to re-serialize the list, and fail-closed is the
// contract here. A candidate whose URL itself contains a comma (e.g. a
// base64 data URI) splits apart and fails closed; mermaid emits no srcset,
// so that false positive has no in-app cost.
function isAllowedSrcset(value: string): boolean {
  return value
    .split(',')
    .map(candidate => candidate.trim())
    .filter(candidate => candidate !== '')
    .every(candidate => isAllowedImageHref(candidate.split(/\s+/)[0] || ''));
}

// Media elements whose resource-fetching attributes must pass the allowlist.
// Every entry is a carrier of the same payload class the allowlist exists
// for (39-REVIEW WR-01 + WR-06); <source> carries both src (inside
// <video>/<audio>) and srcset (inside <picture>).
const MEDIA_SRC_ATTRS: Readonly<Record<string, readonly string[]>> = {
  img: ['src', 'srcset'],
  image: ['href', 'xlink:href', 'src'],
  source: ['src', 'srcset'],
  video: ['src'],
  audio: ['src'],
};

let imageHrefHookInstalled = false;

function installImageHrefAllowlist(): void {
  if (imageHrefHookInstalled) return;
  imageHrefHookInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    const el = node as Element;
    if (!el.tagName) return;
    const tag = el.tagName.toLowerCase();
    // The hook is instance-global, so this gate covers the mermaid-SVG path,
    // the foreignObject inner HTML pass (whose restored label content would
    // otherwise ride an HTML-profile sanitize with a broader data-URI
    // policy), and the bare sanitizeSVG preview path alike. MEDIA_SRC_ATTRS
    // enumerates the whole carrier class rather than one attribute per
    // element (39-REVIEW WR-01 + WR-06); srcset is candidate-checked.
    const srcAttrs = MEDIA_SRC_ATTRS[tag];
    if (!srcAttrs) return;
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (!srcAttrs.includes(name)) continue;
      const allowed =
        name === 'srcset' ? isAllowedSrcset(attr.value) : isAllowedImageHref(attr.value);
      if (!allowed) {
        el.removeAttribute(attr.name);
      }
    }
  });
}

installImageHrefAllowlist();

/**
 * Sanitize Mermaid SVG output while preserving foreignObject HTML content.
 * DOMPurify strips HTML content inside foreignObject because it doesn't
 * handle SVG↔HTML namespace switching. We work around this by extracting
 * foreignObject content before sanitization, then restoring it after.
 */
export function sanitizeMermaidSVG(svg: string): string {
  // FORBID_TAGS/FORBID_ATTR must be ARRAYS: DOMPurify's _resolveSetOption
  // falls back to an empty set for any non-array value, so the previous
  // object form ({ tag: true }) was silently ignored at runtime and these
  // tags/attributes were NOT actually forbidden. The html USE_PROFILE alone
  // allows form/input/button/iframe, so the explicit forbid list matters.
  const forbiddenTags = [
    'iframe',
    'form',
    'input',
    'textarea',
    'select',
    'button',
    'script',
    'object',
    'embed',
    'applet',
    // Media/resource elements mermaid never emits (39-REVIEW WR-06, same
    // justification as object/embed): the instance-global allowlist hook
    // already gates their fetching attributes on every path, and forbidding
    // the elements removes the whole carrier from the mermaid-SVG path too.
    'video',
    'audio',
    'source',
  ];
  const forbiddenAttrs = [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    // SMIL animation event handlers (ICON-04 / T-39-06): the array feeds BOTH
    // DOMPurify passes (foreignObject inner + main SVG), so these can no longer
    // survive sanitization on animateTransform/animateMotion carriers.
    'onbegin',
    'onend',
    'onrepeat',
  ];

  const foContents: string[] = [];
  const placeholder = '%%MMPRESERVE';
  const withPlaceholders = svg.replace(
    /<foreignObject([^>]*)>([\s\S]*?)<\/foreignObject>/g,
    (_, attrs, content) => {
      // The extracted HTML label content never crosses the outer SVG-profile
      // pass (DOMPurify does not traverse the SVG↔HTML namespace boundary),
      // so restoring it verbatim would be an XSS bypass — sanitize it here
      // with the HTML profile and the same deny lists, before it is
      // reinjected into the sanitized document.
      foContents.push(
        DOMPurify.sanitize(content, {
          USE_PROFILES: { html: true },
          FORBID_TAGS: forbiddenTags,
          FORBID_ATTR: forbiddenAttrs,
        })
      );
      return `<foreignObject${attrs}>${placeholder}${foContents.length - 1}%%</foreignObject>`;
    }
  );

  const sanitized = DOMPurify.sanitize(withPlaceholders, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: ['foreignObject'],
    FORBID_TAGS: forbiddenTags,
    FORBID_ATTR: forbiddenAttrs,
  });

  const restored = sanitized.replace(
    new RegExp(`${placeholder}(\\d+)%%`, 'g'),
    (_, idx) => foContents[parseInt(idx)]
  );

  return stripDegeneratePaths(restored);
}

/**
 * Mermaid's Sankey (and occasionally other) layouts can emit edge <path>
 * elements with NaN coordinates (e.g. `d="M10,NaNC300,NaN,..."`) when rendered
 * into the off-screen measuring container. Such paths render nothing but the
 * browser logs a console error for each one. Drop them so template previews
 * and rendered output stay quiet.
 */
function stripDegeneratePaths(svg: string): string {
  if (!svg.includes('NaN')) return svg;
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    let removed = false;
    doc.querySelectorAll('path[d]').forEach(p => {
      if (/NaN/i.test(p.getAttribute('d') || '')) {
        p.remove();
        removed = true;
      }
    });
    return removed ? (doc.documentElement?.outerHTML ?? svg) : svg;
  } catch {
    return svg;
  }
}
