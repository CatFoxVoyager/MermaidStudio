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
// Pre-populated with both lowercase (SVG/XML) and uppercase (HTML) tag names
// so the hot-path lookup avoids per-element .toLowerCase() allocations while
// still falling back for exotic mixed-case XML media tags.
const IMG_SRC_ATTRS: readonly string[] = ['src', 'srcset'];
const IMAGE_SRC_ATTRS: readonly string[] = ['href', 'xlink:href', 'src'];
const SOURCE_SRC_ATTRS: readonly string[] = ['src', 'srcset'];
const MEDIA_SRC_ONLY_ATTRS: readonly string[] = ['src'];

const MEDIA_SRC_ATTRS_BY_NAME: ReadonlyMap<string, readonly string[]> = new Map([
  ['img', IMG_SRC_ATTRS],
  ['IMG', IMG_SRC_ATTRS],
  ['image', IMAGE_SRC_ATTRS],
  ['IMAGE', IMAGE_SRC_ATTRS],
  ['source', SOURCE_SRC_ATTRS],
  ['SOURCE', SOURCE_SRC_ATTRS],
  ['video', MEDIA_SRC_ONLY_ATTRS],
  ['VIDEO', MEDIA_SRC_ONLY_ATTRS],
  ['audio', MEDIA_SRC_ONLY_ATTRS],
  ['AUDIO', MEDIA_SRC_ONLY_ATTRS],
]);

let imageHrefHookInstalled = false;

function installImageHrefAllowlist(): void {
  if (imageHrefHookInstalled) return;
  imageHrefHookInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    const el = node as Element;
    const tagName = el.tagName;
    if (!tagName) return;
    // The hook is instance-global, so this gate covers the mermaid-SVG path,
    // the foreignObject inner HTML pass (whose restored label content would
    // otherwise ride an HTML-profile sanitize with a broader data-URI
    // policy), and the bare sanitizeSVG preview path alike.
    // MEDIA_SRC_ATTRS_BY_NAME enumerates the whole carrier class rather than
    // one attribute per element (39-REVIEW WR-01 + WR-06); srcset is
    // candidate-checked.
    let srcAttrs = MEDIA_SRC_ATTRS_BY_NAME.get(tagName);
    if (srcAttrs === undefined) {
      const len = tagName.length;
      if (len === 3 || len === 5 || len === 6) {
        const firstLower = tagName.charCodeAt(0) | 32;
        if (
          firstLower === 105 ||
          firstLower === 115 ||
          firstLower === 118 ||
          firstLower === 97
        ) {
          srcAttrs = MEDIA_SRC_ATTRS_BY_NAME.get(tagName.toLowerCase());
        }
      }
      if (!srcAttrs) return;
    }
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

// FORBID_TAGS/FORBID_ATTR must be plain string[] arrays: DOMPurify's
// _resolveSetOption falls back to an empty set for any non-array value, so
// non-array shapes would silently disable the forbid lists. The html
// USE_PROFILE alone allows form/input/button/iframe, so the explicit forbid
// list matters.
const MERMAID_FORBIDDEN_TAGS: string[] = [
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

const MERMAID_FORBIDDEN_ATTRS: string[] = [
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

const MERMAID_SVG_ADD_TAGS: string[] = ['foreignObject'];

// Strictly non-URI SVG geometric, numeric, typography, and marker-geometry
// attributes verified never to accept URLs, CSS url(), or executable payloads.
// Passing these via ADD_URI_SAFE_ATTR skips DOMPurify's ATTR_WHITESPACE +
// IS_ALLOWED_URI regex scan on large path `d` and coordinate attributes while
// FORBID_ATTR, ALLOWED_ATTR, SAFE_FOR_XML, and the instance-global
// afterSanitizeAttributes media-allowlist hook continue to run on every
// attribute.
//
// SECURITY INVARIANT: URI, paint, script, and SMIL carriers (href, xlink:href,
// src, srcset, style, fill, stroke, filter, clip-path, mask, marker-start,
// marker-mid, marker-end, background, action, formaction, poster, data,
// attributename, begin, end, values, to, from, by) MUST NEVER be added here.
const MERMAID_URI_SAFE_SVG_ATTRS: string[] = [
  'd',
  'points',
  'transform',
  'viewbox',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'dx',
  'dy',
  'stroke-width',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'preserveaspectratio',
  'offset',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'markerunits',
  'markerwidth',
  'markerheight',
  'refx',
  'refy',
  'orient',
];

const PLACEHOLDER_PREFIX = '%%MMPRESERVE';
const FOREIGN_OBJECT_RE = /<foreignObject([^>]*)>([\s\S]*?)<\/foreignObject>/g;
const PLACEHOLDER_RESTORE_RE = /%%MMPRESERVE(\d+)%%/g;
const FO_WRAPPER_ATTR = 'data-mm-fo';
// Stateless (/i without /g) check for tokens that could collide with the
// batch wrapper attribute or interfere with <table><tbody><tr><td> parsing.
const FO_UNSAFE_BATCH_RE =
  /data-mm-fo|<\/?(?:table|tbody|thead|tfoot|tr|td|th|caption|colgroup|col|style|title|textarea|xmp|noscript|noembed|noframes|plaintext|iframe|script|form|template)\b/i;

// Large pure-ASCII <path d="..."> hoisting around the outer DOMPurify pass.
// Avoids parsing and re-serializing hundreds of KB of raw numeric path
// geometry while strictly gating every hoisted value with a 128-byte ASCII
// allowlist LUT (excluding <, >, ", ', &, :, (, ), /, \, =, ;, N for NaN, and
// all non-ASCII code points), tag-boundary and double-quote-parity checks,
// collision rejection on 'MMPATH', and single-use restoration.
const PATH_HOIST_MIN_LEN = 2048;
const PATH_PLACEHOLDER_GUARD = 'MMPATH';
const PATH_PLACEHOLDER_PREFIX = '%%MMPATH';
const PATH_PLACEHOLDER_RESTORE_RE = /(\s)d="%%MMPATH(\d+)%%"/g;
const SVG_PATH_CHAR_LUT = new Uint8Array(128);
{
  const allowed = 'MmLlHhVvCcSsQqTtAaZz0123456789.,+- \t\n\r';
  for (let i = 0; i < allowed.length; i++) {
    SVG_PATH_CHAR_LUT[allowed.charCodeAt(i)] = 1;
  }
}

function isAsciiWs(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13;
}

function hoistLargeSvgPathData(svg: string): { svg: string; hoisted: string[] | null } {
  if (svg.length < PATH_HOIST_MIN_LEN || svg.includes(PATH_PLACEHOLDER_GUARD)) {
    return { svg, hoisted: null };
  }

  let hoisted: string[] | null = null;
  let parts: string[] | null = null;
  let lastEmit = 0;
  let searchFrom = 0;

  while (true) {
    const idx = svg.indexOf('d="', searchFrom);
    if (idx === -1) break;

    if (idx === 0 || !isAsciiWs(svg.charCodeAt(idx - 1))) {
      searchFrom = idx + 3;
      continue;
    }

    const valStart = idx + 3;
    const valEnd = svg.indexOf('"', valStart);
    if (valEnd === -1) break;

    if (valEnd - valStart < PATH_HOIST_MIN_LEN) {
      searchFrom = valEnd + 1;
      continue;
    }

    const tagStart = svg.lastIndexOf('<', idx);
    if (
      tagStart === -1 ||
      !svg.startsWith('<path', tagStart) ||
      !isAsciiWs(svg.charCodeAt(tagStart + 5)) ||
      (tagStart > 0 && svg.lastIndexOf('<', tagStart - 1) > svg.lastIndexOf('>', tagStart - 1))
    ) {
      searchFrom = valEnd + 1;
      continue;
    }

    // Verify we are inside the <path ...> start tag (no '>', no single quotes,
    // and balanced even double-quote parity before this d="..." attribute).
    let tagValid = true;
    let quoteCount = 0;
    for (let j = tagStart + 5; j < idx; j++) {
      const code = svg.charCodeAt(j);
      if (code === 62 /* > */ || code === 39 /* ' */) {
        tagValid = false;
        break;
      }
      if (code === 34 /* " */) {
        quoteCount++;
      }
    }
    if (!tagValid || (quoteCount & 1) !== 0) {
      searchFrom = valEnd + 1;
      continue;
    }

    // Strictly validate every character in the path data against the 128-byte ASCII LUT.
    let valueValid = true;
    for (let j = valStart; j < valEnd; j++) {
      const code = svg.charCodeAt(j);
      if (code >= 128 || SVG_PATH_CHAR_LUT[code] !== 1) {
        valueValid = false;
        break;
      }
    }
    if (!valueValid) {
      searchFrom = valEnd + 1;
      continue;
    }

    if (!hoisted) {
      hoisted = [];
      parts = [];
    }
    const hoistIdx = hoisted.length;
    hoisted.push(svg.slice(valStart, valEnd));
    parts!.push(svg.slice(lastEmit, valStart), `${PATH_PLACEHOLDER_PREFIX}${hoistIdx}%%`);
    lastEmit = valEnd;
    searchFrom = valEnd + 1;
  }

  if (!hoisted || !parts) {
    return { svg, hoisted: null };
  }
  parts.push(svg.slice(lastEmit));
  return { svg: parts.join(''), hoisted };
}

function restoreHoistedSvgPathData(svg: string, hoisted: readonly string[] | null): string {
  if (!hoisted || hoisted.length === 0) return svg;
  const used = new Uint8Array(hoisted.length);
  return svg.replace(PATH_PLACEHOLDER_RESTORE_RE, (match, ws: string, idxStr: string) => {
    const idx = Number(idxStr);
    if (idx >= 0 && idx < hoisted.length && used[idx] === 0 && String(idx) === idxStr) {
      used[idx] = 1;
      return `${ws}d="${hoisted[idx]}"`;
    }
    return match;
  });
}

function sanitizeSingleForeignObject(content: string): string {
  return DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true, mathMl: true },
    FORBID_TAGS: MERMAID_FORBIDDEN_TAGS,
    FORBID_ATTR: MERMAID_FORBIDDEN_ATTRS,
  });
}

/**
 * Sanitize N > 1 unique foreignObject HTML fragments in a single
 * table-cell-isolated DOMPurify pass (WHATWG §13.2.4.3 / §13.2.6.4.15: <td>
 * pushes an active-formatting marker and </td> clears active formatting
 * elements up to that marker, preventing cross-fragment formatting bleed).
 * Fails closed to per-fragment sanitization if canBatch is false or any
 * structural invariant on the returned DOM skeleton does not hold.
 */
function sanitizeForeignObjectBatch(
  uniqueFragments: readonly string[],
  canBatch: boolean
): string[] {
  if (canBatch) {
    const count = uniqueFragments.length;
    const parts = new Array<string>(count + 2);
    parts[0] = '<table><tbody><tr>';
    for (let i = 0; i < count; i++) {
      parts[i + 1] = `<td ${FO_WRAPPER_ATTR}="${i}">${uniqueFragments[i]}</td>`;
    }
    parts[count + 1] = '</tr></tbody></table>';

    const batchedRoot: unknown = DOMPurify.sanitize(parts.join(''), {
      USE_PROFILES: { html: true, mathMl: true },
      FORBID_TAGS: MERMAID_FORBIDDEN_TAGS,
      FORBID_ATTR: MERMAID_FORBIDDEN_ATTRS,
      RETURN_DOM: true,
    });

    if (batchedRoot !== null && typeof batchedRoot === 'object' && 'childNodes' in batchedRoot) {
      const rootNodes = (batchedRoot as Node).childNodes;
      if (rootNodes.length === 1) {
        const tableNode = rootNodes[0];
        if (
          tableNode.nodeType === 1 &&
          tableNode.nodeName === 'TABLE' &&
          (tableNode as Element).attributes.length === 0 &&
          tableNode.childNodes.length === 1
        ) {
          const tbodyNode = tableNode.childNodes[0];
          if (
            tbodyNode.nodeType === 1 &&
            tbodyNode.nodeName === 'TBODY' &&
            (tbodyNode as Element).attributes.length === 0 &&
            tbodyNode.childNodes.length === 1
          ) {
            const trNode = tbodyNode.childNodes[0];
            if (
              trNode.nodeType === 1 &&
              trNode.nodeName === 'TR' &&
              (trNode as Element).attributes.length === 0 &&
              trNode.childNodes.length === count
            ) {
              const results = new Array<string>(count);
              let valid = true;
              for (let i = 0; i < count; i++) {
                const tdNode = trNode.childNodes[i];
                if (
                  tdNode.nodeType !== 1 ||
                  tdNode.nodeName !== 'TD' ||
                  (tdNode as Element).attributes.length !== 1 ||
                  (tdNode as Element).getAttribute(FO_WRAPPER_ATTR) !== String(i)
                ) {
                  valid = false;
                  break;
                }
                results[i] = (tdNode as Element).innerHTML;
              }
              if (valid) {
                return results;
              }
            }
          }
        }
      }
    }
  }

  return uniqueFragments.map(sanitizeSingleForeignObject);
}

/**
 * Sanitize Mermaid SVG output while preserving foreignObject HTML content.
 * DOMPurify strips HTML content inside foreignObject because it doesn't
 * handle SVG↔HTML namespace switching. We work around this by extracting
 * foreignObject content before sanitization, then restoring it after.
 */
export function sanitizeMermaidSVG(svg: string): string {
  if (!svg.includes('<foreignObject')) {
    const { svg: hoistedSvg, hoisted } = hoistLargeSvgPathData(svg);
    const sanitized = DOMPurify.sanitize(hoistedSvg, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
      ADD_TAGS: MERMAID_SVG_ADD_TAGS,
      ADD_URI_SAFE_ATTR: MERMAID_URI_SAFE_SVG_ATTRS,
      FORBID_TAGS: MERMAID_FORBIDDEN_TAGS,
      FORBID_ATTR: MERMAID_FORBIDDEN_ATTRS,
    });
    return stripDegeneratePaths(restoreHoistedSvgPathData(sanitized, hoisted));
  }

  const allowPathHoist = !svg.includes(PATH_PLACEHOLDER_GUARD);
  const uniqueRawFragments: string[] = [];
  const dedupMap = new Map<string, number>();
  let canBatch = true;

  const withPlaceholders = svg.replace(
    FOREIGN_OBJECT_RE,
    (_match, attrs: string, content: string) => {
      let uniqueIdx = dedupMap.get(content);
      if (uniqueIdx === undefined) {
        uniqueIdx = uniqueRawFragments.length;
        dedupMap.set(content, uniqueIdx);
        uniqueRawFragments.push(content);
        if (canBatch && FO_UNSAFE_BATCH_RE.test(content)) {
          canBatch = false;
        }
      }
      return `<foreignObject${attrs}>${PLACEHOLDER_PREFIX}${uniqueIdx}%%</foreignObject>`;
    }
  );

  // The extracted HTML label content never crosses the outer SVG-profile
  // pass (DOMPurify does not traverse the SVG↔HTML namespace boundary),
  // so restoring it verbatim would be an XSS bypass — sanitize it here
  // with the HTML+MathML profile and the same deny lists, before the outer
  // SVG pass and before reinjection into the sanitized document.
  let sanitizedUnique: string[];
  if (uniqueRawFragments.length === 0) {
    sanitizedUnique = [];
  } else if (uniqueRawFragments.length === 1) {
    sanitizedUnique = [sanitizeSingleForeignObject(uniqueRawFragments[0])];
  } else {
    sanitizedUnique = sanitizeForeignObjectBatch(uniqueRawFragments, canBatch);
  }

  const { svg: outerInput, hoisted } = allowPathHoist
    ? hoistLargeSvgPathData(withPlaceholders)
    : { svg: withPlaceholders, hoisted: null };

  const sanitized = DOMPurify.sanitize(outerInput, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
    ADD_TAGS: MERMAID_SVG_ADD_TAGS,
    ADD_URI_SAFE_ATTR: MERMAID_URI_SAFE_SVG_ATTRS,
    FORBID_TAGS: MERMAID_FORBIDDEN_TAGS,
    FORBID_ATTR: MERMAID_FORBIDDEN_ATTRS,
  });

  const pathsRestored = restoreHoistedSvgPathData(sanitized, hoisted);
  const restored =
    sanitizedUnique.length > 0
      ? pathsRestored.replace(PLACEHOLDER_RESTORE_RE, (match, idx: string) => {
          return sanitizedUnique[Number(idx)] ?? match;
        })
      : pathsRestored;

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
