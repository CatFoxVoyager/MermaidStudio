/**
 * SVG post-processing utilities for fixing Mermaid rendering issues.
 */
import type { ParsedDiagram } from '@/lib/mermaid/codeUtils';
import {
  buildEdgeLabelIndex,
  buildSvgToParsedEdgeMap,
  collectFlowchartEdgePaths,
  collectNodeElements,
  extractPathIdSuffix,
  findEdgeLabelsContainer,
} from './svgEdgeMatching';

/** Subset of ParsedDiagram needed to drive the post-processing pipeline. */
export type ParsedDiagramStyles = Pick<ParsedDiagram, 'styles' | 'linkStyles' | 'edges'>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_OPEN_TAG_RE = /<svg[\s>]/i;
const XML_ONLY_SYNTAX_RE = /<!\[CDATA\[|<!DOCTYPE/i;
const HTML_VOID_TAG_RE =
  /<(?:br|img|hr|input|meta|link|col|area|base|embed|param|source|track|wbr)(?:[\s/>]|$)/i;
const NBSP_ENTITY_RE = /\u00a0|&(?:nbsp|NonBreakingSpace);|&#0*160;|&#x0*a0;/i;
const ATTR_LT_ENTITY_RE = /<[^>]*(?:&lt;|&#0*60;|&#x0*3c;)/i;
const FONT_FAMILY_RE = /font-family:\s*([^;]+)/;
const MARKER_URL_RE = /url\(#([^)]+)\)/;
const SIMPLE_NODE_ID_RE = /(?:^|-)flowchart-([A-Za-z0-9_-]+)-\d+$/;
const SANKEY_GRADIENT_RE = /url\(#(linearGradient-[^)]+)\)/;
const FILL_STYLE_RE = /fill\s*:\s*[^;]+;?/g;
const FILL_OPACITY_STYLE_RE = /fill-opacity\s*:\s*[^;]+;?/g;

const PATH_HOIST_MIN_SVG_LEN = 16384;
const PATH_HOIST_MIN_D_LEN = 2048;

// Strictly valid ASCII SVG path `d` bytes: [MmLlHhVvCcSsQqTtAaZzEe0-9.,+-\s]
const PATH_D_ASCII_LUT = new Uint8Array(128);
{
  const allowed = 'MmLlHhVvCcSsQqTtAaZzEe0123456789.,+- \t\n\r\f\v';
  for (let i = 0; i < allowed.length; i++) {
    PATH_D_ASCII_LUT[allowed.charCodeAt(i)] = 1;
  }
}

let hoistNonceCounter = 0;

function isAsciiWsCode(code: number): boolean {
  return code === 32 || (code >= 9 && code <= 13);
}

function hasUnsafeOuterHtmlChars(value: string | undefined): boolean {
  return value !== undefined && (value.includes('<') || value.includes('\u00a0'));
}

function hasExcludedEdgePathToken(slice: string): boolean {
  return (
    slice.includes('flowchart-link') ||
    slice.includes('edgePath') ||
    slice.includes('messageLine') ||
    slice.includes('edge-thickness') ||
    slice.includes('LS-') ||
    slice.includes('LE-')
  );
}

interface HoistedPathPayloads {
  svg: string;
  prefix: string;
  payloads: string[];
}

/**
 * Partition large (>= 2KB) strictly-ASCII non-edge `<path d="...">` payloads out
 * of string-returning `postProcessDiagramSvg` before HTML5 parsing and serialization,
 * then restore them linearly afterward. Edge paths are never hoisted.
 */
function hoistLargeNonEdgePathPayloads(svg: string): HoistedPathPayloads | null {
  const len = svg.length;
  if (len < PATH_HOIST_MIN_SVG_LEN) return null;
  if (svg.includes('MMPATH')) return null;

  const prefix = `MMPATH_${++hoistNonceCounter}_`;
  let parts: string[] | null = null;
  let payloads: string[] | null = null;
  let lastCopied = 0;
  let cursor = 0;

  while (cursor < len) {
    const tagStart = svg.indexOf('<path', cursor);
    if (tagStart === -1) break;

    const afterNamePos = tagStart + 5;
    if (afterNamePos >= len || !isAsciiWsCode(svg.charCodeAt(afterNamePos))) {
      cursor = afterNamePos;
      continue;
    }

    // Verify `<path` is not inside an unclosed tag / attribute value
    if (tagStart > 0) {
      const lastLt = svg.lastIndexOf('<', tagStart - 1);
      const lastGt = svg.lastIndexOf('>', tagStart - 1);
      if (lastLt > lastGt) {
        cursor = afterNamePos;
        continue;
      }
    }

    // Quote-aware attribute scan locating closing `>` and double-quoted `d="..."`
    let p = afterNamePos;
    let tagEnd = -1;
    let dValStart = -1;
    let dValEnd = -1;
    let dAttrCount = 0;
    let malformed = false;

    while (p < len) {
      while (p < len && isAsciiWsCode(svg.charCodeAt(p))) p++;
      if (p >= len) {
        malformed = true;
        break;
      }
      const ch = svg.charCodeAt(p);
      if (ch === 62) {
        // '>'
        tagEnd = p;
        break;
      }
      if (ch === 47) {
        // '/'
        if (p + 1 < len && svg.charCodeAt(p + 1) === 62) {
          tagEnd = p + 1;
          break;
        }
        malformed = true;
        break;
      }
      if (ch === 60) {
        // '<'
        malformed = true;
        break;
      }

      const nameStart = p;
      while (p < len) {
        const c = svg.charCodeAt(p);
        if (isAsciiWsCode(c) || c === 61 || c === 62 || c === 47 || c === 60) break;
        p++;
      }
      const nameEnd = p;
      if (nameEnd === nameStart) {
        malformed = true;
        break;
      }

      while (p < len && isAsciiWsCode(svg.charCodeAt(p))) p++;
      if (p < len && svg.charCodeAt(p) === 61) {
        // '='
        p++;
        while (p < len && isAsciiWsCode(svg.charCodeAt(p))) p++;
        if (p >= len) {
          malformed = true;
          break;
        }
        const q = svg.charCodeAt(p);
        if (q === 34 || q === 39) {
          // '"' or "'"
          const valStart = p + 1;
          const closeIdx = svg.indexOf(q === 34 ? '"' : "'", valStart);
          if (closeIdx === -1) {
            malformed = true;
            break;
          }
          if (nameEnd - nameStart === 1 && svg.charCodeAt(nameStart) === 100) {
            // 'd'
            dAttrCount++;
            if (q === 34 && dAttrCount === 1) {
              dValStart = valStart;
              dValEnd = closeIdx;
            } else {
              dValStart = -1;
              dValEnd = -1;
            }
          }
          p = closeIdx + 1;
        } else {
          const valStart = p;
          while (p < len) {
            const c = svg.charCodeAt(p);
            if (isAsciiWsCode(c) || c === 62 || c === 47) break;
            p++;
          }
          if (nameEnd - nameStart === 1 && svg.charCodeAt(nameStart) === 100) {
            dAttrCount++;
            dValStart = -1;
            dValEnd = -1;
          }
          if (p === valStart) {
            malformed = true;
            break;
          }
        }
      }
    }

    if (malformed || tagEnd === -1) {
      cursor = afterNamePos;
      continue;
    }

    cursor = tagEnd + 1;

    if (dValStart === -1 || dValEnd - dValStart < PATH_HOIST_MIN_D_LEN) {
      continue;
    }

    // Never hoist any edge path (inspect tag slices outside the large `d` payload)
    if (
      hasExcludedEdgePathToken(svg.slice(tagStart, dValStart)) ||
      hasExcludedEdgePathToken(svg.slice(dValEnd + 1, tagEnd + 1))
    ) {
      continue;
    }

    // Verify every byte in `d` is strictly valid ASCII path syntax
    let validAsciiPath = true;
    for (let i = dValStart; i < dValEnd; i++) {
      const code = svg.charCodeAt(i);
      if (code >= 128 || PATH_D_ASCII_LUT[code] !== 1) {
        validAsciiPath = false;
        break;
      }
    }
    if (!validAsciiPath) {
      continue;
    }

    if (parts === null) {
      parts = [];
      payloads = [];
    }
    const idx = payloads!.length;
    payloads!.push(svg.slice(dValStart, dValEnd));
    parts.push(svg.slice(lastCopied, dValStart), `${prefix}${idx}__`);
    lastCopied = dValEnd;
  }

  if (parts === null || payloads === null) return null;
  parts.push(svg.slice(lastCopied));
  return { svg: parts.join(''), prefix, payloads };
}

/**
 * Single-pass linear restore of hoisted `d="..."` payloads with a single-use
 * bitset verifying every placeholder restores strictly inside `d="..."` once.
 */
function restoreLargeNonEdgePathPayloads(
  serialized: string,
  prefix: string,
  payloads: string[]
): string | null {
  const count = payloads.length;
  const used = new Uint8Array(count);
  const needle = `d="${prefix}`;
  const needleLen = needle.length;
  const len = serialized.length;

  const parts: string[] = [];
  let lastCopied = 0;
  let cursor = 0;
  let restoredCount = 0;

  while (cursor < len) {
    const idx = serialized.indexOf(needle, cursor);
    if (idx === -1) break;

    // Must be a standalone `d="..."` attribute preceded by ASCII whitespace
    if (idx === 0 || !isAsciiWsCode(serialized.charCodeAt(idx - 1))) {
      cursor = idx + 1;
      continue;
    }

    const digitsStart = idx + needleLen;
    let p = digitsStart;
    let id = 0;
    while (p < len) {
      const c = serialized.charCodeAt(p);
      if (c < 48 || c > 57) break;
      id = id * 10 + (c - 48);
      p++;
    }

    if (
      p === digitsStart ||
      p + 2 >= len ||
      serialized.charCodeAt(p) !== 95 || // '_'
      serialized.charCodeAt(p + 1) !== 95 || // '_'
      serialized.charCodeAt(p + 2) !== 34 // '"'
    ) {
      cursor = digitsStart;
      continue;
    }

    if (id < 0 || id >= count || used[id] !== 0) {
      return null;
    }

    used[id] = 1;
    restoredCount++;
    const valStart = idx + 3; // right after `d="`
    const valEnd = p + 2; // right before closing `"`
    parts.push(serialized.slice(lastCopied, valStart), payloads[id]);
    lastCopied = valEnd;
    cursor = valEnd + 1;
  }

  if (restoredCount !== count) {
    return null;
  }

  parts.push(serialized.slice(lastCopied));
  return parts.join('');
}

interface PostProcessSvgContext {
  svg: SVGSVGElement;
  defs: Element | null;
  defsChecked: boolean;
  markerMap: Map<string, SVGMarkerElement> | null;
  edgePaths: Element[] | null;
  parsedViaXmlFallback: boolean;
  isSankey: boolean;
  unsafeXmlSerialization: boolean;
  edgeLabelsContainer: Element | null;
}

let sharedSerializer: XMLSerializer | null = null;
function getSerializer(): XMLSerializer {
  if (!sharedSerializer) {
    sharedSerializer = new XMLSerializer();
  }
  return sharedSerializer;
}

let measureContextInitialized = false;
let sharedMeasureContext: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (!measureContextInitialized) {
    measureContextInitialized = true;
    if (typeof document !== 'undefined') {
      sharedMeasureContext = document.createElement('canvas').getContext('2d');
    }
  }
  return sharedMeasureContext;
}

let outerHtmlRealmSupported: boolean | null = null;
function supportsSafeOuterHtmlSerialization(): boolean {
  if (outerHtmlRealmSupported !== null) {
    return outerHtmlRealmSupported;
  }
  if (typeof document === 'undefined') {
    outerHtmlRealmSupported = false;
    return false;
  }
  const tpl = document.createElement('template');
  tpl.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"></div></foreignObject></svg>';
  const probeSvg = tpl.content.querySelector('svg');
  if (!probeSvg || typeof probeSvg.outerHTML !== 'string') {
    outerHtmlRealmSupported = false;
    return false;
  }
  const out = probeSvg.outerHTML;
  const hasSvgXmlns = /^<svg\b[^>]*\bxmlns="http:\/\/www\.w3\.org\/2000\/svg"/i.test(out);
  const hasDupDivXmlns = /<div\b[^>]*\bxmlns=[^>]*\bxmlns=/i.test(out);
  let xmlValid = false;
  if (hasSvgXmlns && !hasDupDivXmlns && typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(out, 'image/svg+xml');
    xmlValid = parsed.querySelector('parsererror') === null;
  }
  outerHtmlRealmSupported = hasSvgXmlns && !hasDupDivXmlns && xmlValid;
  return outerHtmlRealmSupported;
}

let foreignObjectXmlnsCleanupNeeded: boolean | null = null;
function needsForeignObjectXmlnsCleanup(): boolean {
  if (foreignObjectXmlnsCleanupNeeded !== null) {
    return foreignObjectXmlnsCleanupNeeded;
  }
  if (typeof document === 'undefined') {
    foreignObjectXmlnsCleanupNeeded = false;
    return false;
  }
  const tpl = document.createElement('template');
  tpl.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"></div></foreignObject></svg>';
  const probeSvg = tpl.content.querySelector('svg');
  if (!probeSvg) {
    foreignObjectXmlnsCleanupNeeded = false;
    return false;
  }
  const serialized = getSerializer().serializeToString(probeSvg);
  foreignObjectXmlnsCleanupNeeded = /<div\b[^>]*\bxmlns=[^>]*\bxmlns=/i.test(serialized);
  return foreignObjectXmlnsCleanupNeeded;
}

function canSerializeWithOuterHtml(ctx: PostProcessSvgContext, source: string): boolean {
  if (!supportsSafeOuterHtmlSerialization()) return false;
  if (ctx.parsedViaXmlFallback || ctx.unsafeXmlSerialization) return false;
  if (typeof ctx.svg.outerHTML !== 'string') return false;
  if (typeof document === 'undefined' || ctx.svg.ownerDocument !== document) return false;
  if (ctx.svg.getAttribute('xmlns') !== SVG_NS) return false;
  if (source.includes('xlink:') || source.includes('<?')) return false;
  if (HTML_VOID_TAG_RE.test(source)) return false;
  if (NBSP_ENTITY_RE.test(source)) return false;
  if (ATTR_LT_ENTITY_RE.test(source)) return false;

  const styles = ctx.svg.getElementsByTagName('style');
  for (let i = 0; i < styles.length; i++) {
    const text = styles[i].textContent;
    if (text && (text.includes('<') || text.includes('&') || text.includes(']]>'))) {
      return false;
    }
  }
  return true;
}

function serializeSvgElement(
  svg: SVGSVGElement,
  ctx?: PostProcessSvgContext,
  source?: string
): string {
  if (ctx && source !== undefined && canSerializeWithOuterHtml(ctx, source)) {
    return svg.outerHTML;
  }
  if (needsForeignObjectXmlnsCleanup()) {
    svg.querySelectorAll('foreignObject [xmlns]').forEach(el => {
      el.removeAttributeNS(null, 'xmlns');
    });
  }
  return getSerializer().serializeToString(svg);
}

function createPostProcessContext(
  svg: SVGSVGElement,
  parsedViaXmlFallback: boolean
): PostProcessSvgContext {
  return {
    svg,
    defs: null,
    defsChecked: false,
    markerMap: null,
    edgePaths: null,
    parsedViaXmlFallback,
    isSankey: false,
    unsafeXmlSerialization: false,
    edgeLabelsContainer: null,
  };
}

function ensureDefs(ctx: PostProcessSvgContext): Element {
  if (!ctx.defsChecked) {
    ctx.defs = ctx.svg.getElementsByTagName('defs')[0] ?? null;
    ctx.defsChecked = true;
  }
  if (!ctx.defs) {
    ctx.defs = ctx.svg.ownerDocument.createElementNS(SVG_NS, 'defs');
    ctx.svg.insertBefore(ctx.defs, ctx.svg.firstChild);
  }
  return ctx.defs;
}

/**
 * Core shared post-processing pipeline returning the post-processing context
 * (or null when the input does not parse into an <svg>).
 */
function runPostProcessingPipeline(
  svg: string,
  parsed: ParsedDiagramStyles
): PostProcessSvgContext | null {
  // Extract font-related node styles without allocating for unstyled nodes
  const nodeFontStyles = new Map<
    string,
    { fontSize?: string; fontWeight?: string; color?: string }
  >();
  parsed.styles.forEach((style, nodeId) => {
    if (style.fontSize || style.fontWeight || style.color) {
      const fontStyle: { fontSize?: string; fontWeight?: string; color?: string } = {};
      if (style.fontSize) fontStyle.fontSize = style.fontSize;
      if (style.fontWeight) fontStyle.fontWeight = style.fontWeight;
      if (style.color) fontStyle.color = style.color;
      nodeFontStyles.set(nodeId, fontStyle);
    }
  });

  const parsedSvg = parseSvgElement(svg, true);
  if (!parsedSvg) return null;

  const ctx = createPostProcessContext(parsedSvg.svg, parsedSvg.parsedViaXmlFallback);
  fixDiagramLabelsInSvg(ctx, svg);
  if (
    !(
      ctx.isSankey &&
      parsed.linkStyles.size === 0 &&
      !svg.includes('edgePaths') &&
      !svg.includes('messageLine')
    )
  ) {
    applyEdgeFontStylesInSvg(ctx, parsed.linkStyles, parsed.edges, svg);
  }
  if (nodeFontStyles.size > 0) {
    applyNodeFontStylesInSvg(ctx, nodeFontStyles);
  }

  return ctx;
}

/**
 * Shared post-processing pipeline returning a ready-to-mount SVGSVGElement
 * for direct DOM/Shadow DOM insertion (avoids XMLSerializer + innerHTML re-parse).
 */
export function postProcessDiagramSvgToElement(
  svg: string,
  parsed: ParsedDiagramStyles
): SVGSVGElement | null {
  return runPostProcessingPipeline(svg, parsed)?.svg ?? null;
}

/**
 * Shared post-processing pipeline applied to rendered diagrams by the preview
 * and the SVG/PNG exports. Keeping a single pipeline guarantees exports match
 * what the user sees in the preview.
 *
 * In particular, the style panel persists `fill`/`fill-opacity` (edge label
 * background) into `linkStyle` directives, but Mermaid misapplies that fill to
 * the open edge paths — filled open paths render as large white polygons
 * (especially visible with curve: stepAfter). applyEdgeFontStyles' final
 * cleanup neutralizes the path fill; it must never be skipped.
 *
 * `parsed` must be the parse of the CURRENT diagram content: callers pass
 * their existing (or memoized) parse instead of this function re-parsing raw
 * source on every call.
 */
export function postProcessDiagramSvg(svg: string, parsed: ParsedDiagramStyles): string {
  const hoisted = hoistLargeNonEdgePathPayloads(svg);
  if (hoisted) {
    const ctx = runPostProcessingPipeline(hoisted.svg, parsed);
    if (!ctx) return svg;
    const serialized = serializeSvgElement(ctx.svg, ctx, hoisted.svg);
    const restored = restoreLargeNonEdgePathPayloads(serialized, hoisted.prefix, hoisted.payloads);
    if (restored !== null) {
      return restored;
    }
  }
  const ctx = runPostProcessingPipeline(svg, parsed);
  return ctx ? serializeSvgElement(ctx.svg, ctx, svg) : svg;
}

/**
 * Parse an SVG string into an SVGSVGElement. Uses HTML5 <template>.innerHTML
 * foreign-content parsing on the primary path (avoids slower libxml2 XML
 * parsing and handles Mermaid's unclosed HTML void elements inside
 * foreignObject), falling back to DOMParser('image/svg+xml') for XML-only
 * constructs (CDATA/DOCTYPE) or non-DOM environments.
 */
function parseSvgElement(
  svgString: string,
  allowHtmlFallback: boolean
): { svg: SVGSVGElement; parsedViaXmlFallback: boolean } | null {
  if (!svgString || !SVG_OPEN_TAG_RE.test(svgString)) return null;

  if (
    typeof document !== 'undefined' &&
    (!svgString.includes('<!') || !XML_ONLY_SYNTAX_RE.test(svgString))
  ) {
    const tpl = document.createElement('template');
    tpl.innerHTML = svgString;
    const firstEl = tpl.content.firstElementChild;
    const svg =
      firstEl && (firstEl.tagName === 'svg' || firstEl.tagName === 'SVG')
        ? firstEl
        : tpl.content.querySelector('svg');
    if (svg && svg.namespaceURI === SVG_NS) {
      return { svg: svg as SVGSVGElement, parsedViaXmlFallback: false };
    }
  }

  const parser = new DOMParser();
  let doc = parser.parseFromString(svgString, 'image/svg+xml');
  if (allowHtmlFallback && doc.querySelector('parsererror')) {
    const htmlDoc = parser.parseFromString(svgString, 'text/html');
    const svgEl = htmlDoc.querySelector('svg');
    if (svgEl) {
      doc = parser.parseFromString(getSerializer().serializeToString(svgEl), 'image/svg+xml');
    }
  }
  const svgEl = doc.querySelector('svg') as SVGSVGElement | null;
  return svgEl ? { svg: svgEl, parsedViaXmlFallback: true } : null;
}

/**
 * Resize background rect and center text within it.
 * Uses dominant-baseline for reliable SVG text centering.
 */
function resizeBackgroundRect(
  text: Element,
  rect: Element,
  fontSize: number,
  fontFamily?: string
): void {
  const content = text.textContent?.trim() ?? '';
  if (!content) return;

  // Use cached canvas context for precise text measurement
  const context = getMeasureContext();
  let textWidth = content.length * fontSize * 0.6; // Fallback

  if (context) {
    context.font = `${fontSize}px ${fontFamily || 'Inter, system-ui, sans-serif'}`;
    textWidth = context.measureText(content).width;
  }

  const textHeight = fontSize * 1.2;
  const hPad = 8;
  const vPad = 4;

  const newWidth = textWidth + hPad * 2;
  const newHeight = textHeight + vPad * 2;

  const textX = parseFloat(text.getAttribute('x') || '0');
  const textY = parseFloat(text.getAttribute('y') || '0');

  // Resize and reposition rect
  rect.setAttribute('width', String(newWidth));
  rect.setAttribute('height', String(newHeight));
  rect.setAttribute('x', String(textX - newWidth / 2));
  rect.setAttribute('y', String(textY - newHeight / 2));

  // Center text using dominant-baseline
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('text-anchor', 'middle');

  // Clear dy attributes on all tspans to prevent interference
  text.querySelectorAll('tspan').forEach(tspan => {
    tspan.setAttribute('dy', '0');
    tspan.setAttribute('x', String(textX));
  });
}

/** Add missing gradient definitions for Sankey diagrams (Mermaid 11.x bug workaround) */
function addSankeyGradients(ctx: PostProcessSvgContext, source: string): boolean {
  const { svg } = ctx;
  // Check if defs already exists
  if (!ctx.defsChecked) {
    ctx.defs = svg.getElementsByTagName('defs')[0] ?? null;
    ctx.defsChecked = true;
  }
  if (ctx.defs) return false;
  if (!source.includes('url(#linearGradient-')) return false;

  // Find all gradient references in the SVG
  const gradientRefs = new Set<string>();
  const paths = svg.getElementsByTagName('path');
  for (let i = 0; i < paths.length; i++) {
    const stroke = paths[i].getAttribute('stroke');
    if (stroke && stroke.includes('url(#linearGradient-')) {
      const match = stroke.match(SANKEY_GRADIENT_RE);
      if (match) {
        gradientRefs.add(match[1]);
      }
    }
  }

  if (gradientRefs.size === 0) return false;

  const ownerDoc = svg.ownerDocument;
  // Create defs element with gradient definitions
  const defs = ownerDoc.createElementNS(SVG_NS, 'defs');

  // Sankey color palette (Tableau 10 colors)
  const colors = [
    '#4E79A7',
    '#F28E2B',
    '#E15759',
    '#76B7B2',
    '#59A14F',
    '#EDC948',
    '#B07AA1',
    '#FF9DA7',
    '#9C755F',
    '#BAB0AC',
  ];

  let colorIndex = 0;
  gradientRefs.forEach(id => {
    const gradient = ownerDoc.createElementNS(SVG_NS, 'linearGradient');
    gradient.setAttribute('id', id);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    const color = colors[colorIndex % colors.length];
    const stop1 = ownerDoc.createElementNS(SVG_NS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color);
    stop1.setAttribute('stop-opacity', '0.3');

    const stop2 = ownerDoc.createElementNS(SVG_NS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color);
    stop2.setAttribute('stop-opacity', '0.8');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    colorIndex++;
  });

  // Insert defs at the beginning of SVG (before other elements)
  svg.insertBefore(defs, svg.firstChild);
  ctx.defs = defs;
  ctx.defsChecked = true;

  return true;
}

/**
 * Center legacy SVG <text> node labels within their shapes.
 */
function fixNodeLabels(svg: SVGSVGElement, fontFamily: string): boolean {
  if (svg.getElementsByTagName('text').length === 0) return false;

  let changed = false;
  const lowerFont = fontFamily.toLowerCase();
  const dyValue = lowerFont.includes('impact') || lowerFont.includes('oswald') ? '0.15em' : '0.1em';

  // 39-04 (ICON-03, UI-SPEC Surface 4): cover mermaid 12.3 special-shape groups
  // (.icon-shape, .image-shape) alongside .node across all nested subgraphs and fixtures.
  const nodeList = collectNodeElements(svg);
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i];
    const text = node.getElementsByTagName('text')[0] as SVGTextElement | undefined;
    if (!text) continue;

    const content = text.textContent?.trim() ?? '';
    if (!content) continue;

    const shape = node.querySelector('rect, polygon, path, circle, ellipse');
    if (!shape) continue;

    const hasForeignObject = node.getElementsByTagName('foreignObject').length > 0;

    // 2. Center the label position within the existing shape bounding box
    const gLabel = node.querySelector('g.label');
    if (gLabel) {
      if (!hasForeignObject) {
        // Get the bounding box of the shape to find its center
        const sRect = (shape as any).getBBox?.() || { x: 0, y: 0, width: 0, height: 0 };
        const sCenterX = sRect.x + sRect.width / 2;
        const sCenterY = sRect.y + sRect.height / 2;

        // SVG text elements: center at shape's center
        text.setAttribute('x', String(sCenterX));
        text.setAttribute('y', String(sCenterY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        gLabel.removeAttribute('transform');
      }
      changed = true;
    }

    // 4. DEEP CLEANING: Force center alignment on text elements
    // Only apply when using SVG text (not foreignObjects) for labels.
    // foreignObjects handle their own text layout via HTML/CSS, and
    // overriding text positioning breaks diagrams with themeVariables.
    if (!hasForeignObject) {
      node.querySelectorAll('text, tspan').forEach(el => {
        const tag = el.tagName.toLowerCase();

        if (tag === 'text' || tag === 'tspan') {
          el.setAttribute('x', '0');
          el.setAttribute('text-anchor', 'middle');
          el.setAttribute('dominant-baseline', 'central');
          el.removeAttribute('y');
          el.removeAttribute('dx');
          el.removeAttribute('dy');

          const style = (el as HTMLElement).style;
          style.setProperty('text-anchor', 'middle', 'important');
          style.setProperty('text-align', 'center', 'important');
          style.setProperty('alignment-baseline', 'central', 'important');
          style.setProperty('transform', 'none', 'important');
          style.setProperty('x', '0', 'important');
        }
      });
    }

    // Final vertical nudge for text element
    text.setAttribute('dy', dyValue);
    text.style.setProperty('alignment-baseline', 'central', 'important');
  }

  return changed;
}

/**
 * Center edge and node labels within their containers.
 * Also reorders SVG elements to ensure proper z-index layering.
 */
export function fixDiagramLabels(svgString: string): string {
  const parsedSvg = parseSvgElement(svgString, true);
  if (!parsedSvg) return svgString;
  const ctx = createPostProcessContext(parsedSvg.svg, parsedSvg.parsedViaXmlFallback);
  if (!fixDiagramLabelsInSvg(ctx, svgString)) return svgString;
  return serializeSvgElement(parsedSvg.svg, ctx, svgString);
}

/**
 * In-SVG variant of fixDiagramLabels. Mutates `ctx.svg` in place and returns
 * whether anything changed. `source` is the SVG source the element was parsed
 * from (kept for the substring-based diagram-type detection below).
 */
function fixDiagramLabelsInSvg(ctx: PostProcessSvgContext, source: string): boolean {
  let changed = false;

  const { svg } = ctx;

  // Check Sankey first to avoid flowchart queries on Sankey diagrams
  const roleDescription = svg.getAttribute('aria-roledescription');
  const isSankey = roleDescription === 'sankey' || source.includes('sankey');
  if (isSankey) {
    ctx.isSankey = true;
    return addSankeyGradients(ctx, source);
  }

  const isFlowchart =
    roleDescription === 'flowchart' ||
    roleDescription === 'flowchart-v2' ||
    source.includes('flowchart') ||
    svg.getElementsByClassName('flowchart').length > 0 ||
    (svg.getElementsByClassName('node').length > 0 &&
      svg.getElementsByClassName('edgePath').length > 0);

  // Apply node label fixes (only when SVG <text> nodes exist)
  if (isFlowchart && (source.includes('<text') || source.includes('<TEXT'))) {
    const svgStyle = svg.getAttribute('style') || '';
    const fontMatch = svgStyle.match(FONT_FAMILY_RE);
    const fontFamily = fontMatch ? fontMatch[1].trim() : 'Inter, system-ui, sans-serif';
    changed = fixNodeLabels(svg, fontFamily) || changed;
  }

  // Center edge label text vertically within its background rect.
  // DISABLED: Automatic centering breaks multi-line labels and is too complex.
  // Mermaid's default positioning works correctly for both single and multi-line labels.
  /*
  doc.querySelectorAll('.edgeLabel .label').forEach(label => {
    const rect = label.querySelector('rect.background');
    const text = label.querySelector('text');
    if (!rect || !text) return;

    const rectY = parseFloat(rect.getAttribute('y') || '0');
    const rectH = parseFloat(rect.getAttribute('height') || '0');
    if (rectH <= 0) return;

    // The rect is positioned relative to the label group's transform
    // We need to calculate dy to center the text within the rect
    // The first tspan's dy positions the text relative to the text element
    const firstTspan = text.querySelector('tspan');
    if (firstTspan) {
      // Get original dy value (Mermaid uses "1.1em" for multi-line)
      const originalDy = firstTspan.getAttribute('dy') || '0';
      // Calculate the offset needed: (rectH/2) - (font-size * 1.1) / 2
      // For a 14px font, 1.1em = ~15.4px, half is ~7.7px
      // rectH/2 should position us at center, so we adjust dy accordingly
      const fontSize = parseFloat(text.getAttribute('font-size') || '14');
      const tspanOffset = parseFloat(originalDy) || (fontSize * 1.1);
      const centerOffset = (rectH / 2) - (fontSize * 0.5); // Approximate visual center

      firstTspan.setAttribute('dy', String(centerOffset));
    }

    text.setAttribute('text-anchor', 'middle');
    text.removeAttribute('dominant-baseline');
    text.removeAttribute('y'); // Let dy handle positioning

    // Fix tspans: set x position but preserve dy for multi-line
    text.querySelectorAll('tspan').forEach(tspan => {
      tspan.setAttribute('x', text.getAttribute('x') || '0');
      tspan.removeAttribute('y');
      // DO NOT modify dy except for the first one (handled above)
      // Multi-line tspans keep their original dy values
    });

    // DO NOT resize the background rect
    // Mermaid already calculates the correct size for multi-line labels

    // Apply background color and opacity from Mermaid style if available
    const fill = rect.getAttribute('fill');
    const fillOpacity = rect.getAttribute('fill-opacity');
    if (fill && fill !== 'none') {
      rect.style.fill = fill;
    }
    if (fillOpacity) {
      rect.style.fillOpacity = fillOpacity;
    }

    changed = true;
  });
  */

  // Reorder SVG elements so edge labels are ABOVE edge paths.
  // This ensures label backgrounds with opaque colors cover the edge lines.
  let root: Element | null = null;
  const svgChildren = svg.children;
  for (let i = 0; i < svgChildren.length; i++) {
    if (svgChildren[i].classList.contains('root')) {
      root = svgChildren[i];
      break;
    }
  }
  if (!root) {
    root = svg.getElementsByClassName('root')[0] ?? svg;
  }

  const nodes: Element[] = [];
  const edgePathGroups: Element[] = [];
  const edgeLabels: Element[] = [];
  // Mermaid appends g.edge-step-badges to the flowchart root as a sibling of
  // the edge groups (EDGE-04, Surface 7 item 3) — without collecting it here,
  // the re-appends below would strand the step-number badges UNDER the layers
  // they manage. Badge content, placement, aria attributes, and mermaid's
  // reduced-motion style are never touched — z-order is the only mutation.
  const edgeStepBadges: Element[] = [];

  const rootChildren = root.children;
  for (let i = 0; i < rootChildren.length; i++) {
    const el = rootChildren[i];
    const cl = el.classList;
    if (cl.contains('nodes')) nodes.push(el);
    if (cl.contains('edgePaths') || cl.contains('edges')) edgePathGroups.push(el);
    if (cl.contains('edgeLabels')) edgeLabels.push(el);
    if (cl.contains('edge-step-badges')) edgeStepBadges.push(el);
  }

  if (edgeLabels.length > 0) {
    const firstEdgeLabels = edgeLabels[0];
    if (firstEdgeLabels.tagName === 'g' || firstEdgeLabels.tagName === 'G') {
      ctx.edgeLabelsContainer = firstEdgeLabels;
    }
  }

  const totalLayerGroups =
    nodes.length + edgePathGroups.length + edgeLabels.length + edgeStepBadges.length;
  if (totalLayerGroups > 0) {
    let alreadyOrdered = totalLayerGroups <= rootChildren.length;
    if (alreadyOrdered) {
      let offset = rootChildren.length - totalLayerGroups;
      for (let i = 0; i < nodes.length && alreadyOrdered; i++) {
        if (rootChildren[offset++] !== nodes[i]) alreadyOrdered = false;
      }
      for (let i = 0; i < edgePathGroups.length && alreadyOrdered; i++) {
        if (rootChildren[offset++] !== edgePathGroups[i]) alreadyOrdered = false;
      }
      for (let i = 0; i < edgeLabels.length && alreadyOrdered; i++) {
        if (rootChildren[offset++] !== edgeLabels[i]) alreadyOrdered = false;
      }
      for (let i = 0; i < edgeStepBadges.length && alreadyOrdered; i++) {
        if (rootChildren[offset++] !== edgeStepBadges[i]) alreadyOrdered = false;
      }
    }
    if (!alreadyOrdered) {
      for (let i = 0; i < nodes.length; i++) root.appendChild(nodes[i]);
      for (let i = 0; i < edgePathGroups.length; i++) root.appendChild(edgePathGroups[i]); // Paths FIRST (bottom)
      for (let i = 0; i < edgeLabels.length; i++) root.appendChild(edgeLabels[i]); // Labels LAST (on top)
      // Step-number badges re-appended LAST — above nodes, edge paths, and edge
      // labels (the UI-SPEC badges-z-order contract; a missing badges layer
      // renders nothing — no crash surface).
      for (let i = 0; i < edgeStepBadges.length; i++) root.appendChild(edgeStepBadges[i]);
    }
    changed = true;
  }

  // Scale and color arrowhead markers
  const markerMap = new Map<string, SVGMarkerElement>();
  if (source.includes('<marker') || source.includes('<MARKER')) {
    const markers = svg.getElementsByTagName('marker');
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      markerMap.set(marker.id, marker as SVGMarkerElement);

      // Ensure markers are visible even if content exceeds viewport (Mermaid sequence diagram bug)
      marker.setAttribute('overflow', 'visible');

      if (marker.getAttribute('markerUnits') === 'userSpaceOnUse') {
        marker.setAttribute('markerUnits', 'strokeWidth');
        const mw = parseFloat(marker.getAttribute('markerWidth') || '0');
        const mh = parseFloat(marker.getAttribute('markerHeight') || '0');

        // If no viewBox exists, add one based on original dimensions to prevent clipping when scaling down
        if (!marker.getAttribute('viewBox') && mw > 0 && mh > 0) {
          marker.setAttribute('viewBox', `0 0 ${mw} ${mh}`);
        }

        if (mw > 0) marker.setAttribute('markerWidth', String(mw / 2));
        if (mh > 0) marker.setAttribute('markerHeight', String(mh / 2));
        if (marker.getAttribute('viewBox')) {
          marker.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        changed = true;
      }
    }
  }
  ctx.markerMap = markerMap;

  // Sync edge arrowheads with edge colors and collect edge paths for the next pass
  const collectedEdgePaths: Element[] = [];
  const hasMarkers = markerMap.size > 0;
  if (!source.includes('messageLine')) {
    const containers = svg.getElementsByClassName('edgePaths');
    const seen = containers.length > 1 ? new Set<Element>() : null;
    for (let i = 0; i < containers.length; i++) {
      const paths = containers[i].getElementsByTagName('path');
      for (let j = 0; j < paths.length; j++) {
        const path = paths[j];
        if (seen) {
          if (seen.has(path)) continue;
          seen.add(path);
        }
        if (path.classList.contains('flowchart-link')) {
          collectedEdgePaths.push(path);
        }
        if (hasMarkers) {
          const stroke =
            (path.hasAttribute('style') ? (path as SVGPathElement).style.stroke : '') ||
            path.getAttribute('stroke');
          if (!stroke || stroke === 'none') continue;
          if (syncMarkerColorForAttr(ctx, path, 'marker-end', stroke)) {
            changed = true;
          }
          if (syncMarkerColorForAttr(ctx, path, 'marker-start', stroke)) {
            changed = true;
          }
        }
      }
    }
  } else {
    // Expanded selector to include sequence diagram message lines
    const matchedPaths = svg.querySelectorAll(
      '.edgePaths path, .messageLine0, .messageLine1, .messageLine'
    );
    for (let i = 0; i < matchedPaths.length; i++) {
      const path = matchedPaths[i];
      const tag = path.tagName;
      if (
        ((tag === 'path' || tag === 'PATH') &&
          path.classList.contains('flowchart-link') &&
          (path.parentElement?.closest('.edgePaths') ?? null) !== null) ||
        ((tag === 'line' || tag === 'LINE') &&
          (path.classList.contains('messageLine0') ||
            path.classList.contains('messageLine1') ||
            path.classList.contains('messageLine')))
      ) {
        collectedEdgePaths.push(path);
      }

      if (hasMarkers) {
        const stroke =
          (path.hasAttribute('style') ? (path as SVGPathElement).style.stroke : '') ||
          path.getAttribute('stroke');
        if (!stroke || stroke === 'none') continue;
        if (syncMarkerColorForAttr(ctx, path, 'marker-end', stroke)) {
          changed = true;
        }
        if (syncMarkerColorForAttr(ctx, path, 'marker-start', stroke)) {
          changed = true;
        }
      }
    }
  }
  ctx.edgePaths = collectedEdgePaths;

  return changed;
}

/**
 * Clone a marker with a color-specific ID and apply `stroke` to its shape elements
 * (supporting flowchart pointEnd/crossEnd/circleEnd as well as sequence arrowheads).
 * Returns true if the attribute was updated.
 */
function syncMarkerColorForAttr(
  ctx: PostProcessSvgContext,
  path: Element,
  attrName: 'marker-end' | 'marker-start',
  stroke: string
): boolean {
  const markerRef = path.getAttribute(attrName);
  if (!markerRef) return false;
  const markerIdMatch = markerRef.match(MARKER_URL_RE);
  if (!markerIdMatch) return false;

  const currentMarkerId = markerIdMatch[1];
  const safeStroke = stroke.replace('#', '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeStroke || currentMarkerId.endsWith(`-${safeStroke}`)) return false;

  const markerMap = ctx.markerMap!;
  const currentMarker = markerMap.get(currentMarkerId);
  if (!currentMarker || (currentMarker.tagName !== 'marker' && currentMarker.tagName !== 'MARKER')) {
    return false;
  }

  const baseMarkerId = currentMarker.getAttribute('data-base-marker') || currentMarkerId;
  const baseMarker = markerMap.get(baseMarkerId) ?? currentMarker;
  const newMarkerId = `${baseMarkerId}-${safeStroke}`;

  if (!markerMap.has(newMarkerId)) {
    const newMarker = baseMarker.cloneNode(true) as SVGMarkerElement;
    newMarker.id = newMarkerId;
    newMarker.setAttribute('data-base-marker', baseMarkerId);
    newMarker.querySelectorAll('path, circle, polygon').forEach(shapeEl => {
      const s = shapeEl as SVGElement;
      if (s.getAttribute('fill') !== 'none' && s.style.fill !== 'none') {
        s.setAttribute('fill', stroke);
        s.style.fill = stroke;
      }
      if (s.getAttribute('stroke') !== 'none' && s.style.stroke !== 'none') {
        s.setAttribute('stroke', stroke);
        s.style.stroke = stroke;
      }
    });
    ensureDefs(ctx).appendChild(newMarker);
    markerMap.set(newMarkerId, newMarker);
  }

  path.setAttribute(attrName, `url(#${newMarkerId})`);
  return true;
}

/**
 * Apply per-edge style overrides (font, stroke, color, arrowheads) directly to SVG elements.
 * Uses label, identity, and geometric matching to reliably map linkStyle indices to SVG paths and labels.
 */
export function applyEdgeFontStyles(
  svgString: string,
  linkStyles: Map<
    number | 'default',
    {
      fontSize?: string;
      fontWeight?: string;
      stroke?: string;
      strokeWidth?: string;
      strokeDasharray?: string;
      opacity?: string;
      color?: string;
      fill?: string;
      fillOpacity?: string;
    }
  >,
  parsedEdges?: Array<{ source: string; target: string; label?: string }>
): string {
  const parsedSvg = parseSvgElement(svgString, false);
  if (!parsedSvg) return svgString;
  const ctx = createPostProcessContext(parsedSvg.svg, parsedSvg.parsedViaXmlFallback);
  applyEdgeFontStylesInSvg(ctx, linkStyles, parsedEdges, svgString);
  return serializeSvgElement(parsedSvg.svg, ctx, svgString);
}

/**
 * SVG-level variant of {@link applyEdgeFontStyles} used by the shared
 * pipeline (parses once, mutates `ctx.svg` in place).
 */
function applyEdgeFontStylesInSvg(
  ctx: PostProcessSvgContext,
  linkStyles: Map<
    number | 'default',
    {
      fontSize?: string;
      fontWeight?: string;
      stroke?: string;
      strokeWidth?: string;
      strokeDasharray?: string;
      opacity?: string;
      color?: string;
      fill?: string;
      fillOpacity?: string;
    }
  >,
  parsedEdges?: Array<{ source: string; target: string; label?: string }>,
  source?: string
): void {
  const { svg } = ctx;

  // Include sequence diagram message lines (line elements) in addition to flowchart paths
  const edgePaths =
    ctx.edgePaths ??
    (source !== undefined && !source.includes('messageLine')
      ? collectFlowchartEdgePaths(svg)
      : Array.from(
          svg.querySelectorAll(
            '.edgePaths path.flowchart-link, line.messageLine0, line.messageLine1, line.messageLine'
          )
        ));

  if (linkStyles.size > 0) {
    const edgeLabelsContainer = ctx.edgeLabelsContainer ?? findEdgeLabelsContainer(svg);
    const edgeLabelIndex = edgeLabelsContainer ? buildEdgeLabelIndex(edgeLabelsContainer) : null;
    const labelChildren = edgeLabelIndex ? edgeLabelIndex.children : null;
    const labelCount = labelChildren ? labelChildren.length : 0;
    const labelByDataId = edgeLabelIndex ? edgeLabelIndex.elementByDataId : null;

    // Collect all markers so flowchart pointEnd/crossEnd/circleEnd and sequence arrowheads all sync
    if (!ctx.markerMap) {
      const markerMap = new Map<string, SVGMarkerElement>();
      const markers = svg.getElementsByTagName('marker');
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        markerMap.set(marker.id, marker as SVGMarkerElement);
      }
      ctx.markerMap = markerMap;
    }

    const fontMatch = svg.getAttribute('style')?.match(FONT_FAMILY_RE);
    const svgFontFamily = fontMatch ? fontMatch[1].trim() : undefined;

    const resolveLabelForEdge = (svgPathIdx: number, path?: Element): Element | undefined => {
      if (labelByDataId && labelByDataId.size > 0) {
        const pathId = path?.getAttribute('id') || '';
        if (pathId) {
          const direct = labelByDataId.get(pathId);
          if (direct) return direct;
          const suffix = extractPathIdSuffix(pathId);
          if (suffix !== null) {
            const bySuffix = labelByDataId.get(suffix);
            if (bySuffix) return bySuffix;
          }
        }
      }
      return labelChildren && svgPathIdx < labelCount ? labelChildren[svgPathIdx] : undefined;
    };

    const applyToEdge = (
      svgPathIdx: number,
      style: {
        fontSize?: string;
        fontWeight?: string;
        stroke?: string;
        strokeWidth?: string;
        strokeDasharray?: string;
        opacity?: string;
        color?: string;
        fill?: string;
        fillOpacity?: string;
      }
    ) => {
      if (
        !ctx.unsafeXmlSerialization &&
        (hasUnsafeOuterHtmlChars(style.stroke) ||
          hasUnsafeOuterHtmlChars(style.strokeWidth) ||
          hasUnsafeOuterHtmlChars(style.strokeDasharray) ||
          hasUnsafeOuterHtmlChars(style.opacity) ||
          hasUnsafeOuterHtmlChars(style.color) ||
          hasUnsafeOuterHtmlChars(style.fontSize) ||
          hasUnsafeOuterHtmlChars(style.fontWeight) ||
          hasUnsafeOuterHtmlChars(style.fill) ||
          hasUnsafeOuterHtmlChars(style.fillOpacity))
      ) {
        ctx.unsafeXmlSerialization = true;
      }

      // 1. Apply to Path (Stroke, Width, Dasharray, Opacity & Arrowheads)
      const path = edgePaths[svgPathIdx];
      if (path instanceof SVGElement) {
        const tagName = path.nodeName;
        const isLineOrPath =
          tagName === 'path' || tagName === 'line' || tagName === 'PATH' || tagName === 'LINE';
        if (style.stroke) {
          path.setAttribute('stroke', style.stroke);
          if (isLineOrPath) {
            (path as any).style.stroke = style.stroke;
          }
          syncMarkerColorForAttr(ctx, path, 'marker-end', style.stroke);
          syncMarkerColorForAttr(ctx, path, 'marker-start', style.stroke);
        }
        if (style.strokeWidth) {
          path.setAttribute('stroke-width', style.strokeWidth);
          if (isLineOrPath) {
            (path as any).style.strokeWidth = style.strokeWidth;
          }
        }
        if (style.strokeDasharray) {
          path.setAttribute('stroke-dasharray', style.strokeDasharray);
          if (isLineOrPath) {
            (path as any).style.strokeDasharray = style.strokeDasharray;
          }
        }
        if (style.opacity) {
          path.setAttribute('opacity', style.opacity);
          if (isLineOrPath) {
            (path as any).style.opacity = style.opacity;
          }
        }
      }

      // 2. Apply to Label (Font, Color, Background, Opacity)
      const label = resolveLabelForEdge(svgPathIdx, path);
      if (label) {
        // Find the background rect - in Mermaid 11.x, it may be a sibling of the label group,
        // not nested inside it. Check the label itself first, then adjacent children.
        let rectEl =
          label.querySelector('rect.background') ||
          label.querySelector('g.label rect.background') ||
          label.querySelector('g rect') ||
          label.querySelector('rect');

        // If not found in the label itself, check the next sibling (Mermaid 11.x pattern)
        if (!rectEl && labelChildren && svgPathIdx + 1 < labelCount) {
          const nextSibling = labelChildren[svgPathIdx + 1];
          if (nextSibling) {
            rectEl =
              nextSibling.querySelector('rect.background') ||
              nextSibling.querySelector('rect') ||
              (nextSibling instanceof SVGRectElement ? nextSibling : null);
          }
        }

        // Text color (supports both Mermaid 11/12 foreignObject labels and legacy SVG text)
        if (style.color) {
          const svgText = label.getElementsByTagName('text')[0];
          if (svgText) {
            svgText.setAttribute('fill', style.color);
            (svgText as SVGTextElement).style.fill = style.color;
          }
          label.querySelectorAll('foreignObject div, foreignObject span, foreignObject p').forEach(el => {
            (el as HTMLElement).style.setProperty('color', style.color!, 'important');
          });
        }

        // Font styles
        if (style.fontSize || style.fontWeight) {
          const textEl = label.getElementsByTagName('text')[0];
          if (textEl) {
            const fontSize = style.fontSize ? parseInt(style.fontSize) : 18;
            if (style.fontSize) {
              textEl.setAttribute('font-size', style.fontSize);
            }
            if (style.fontWeight) textEl.setAttribute('font-weight', style.fontWeight);

            // Ensure tspans are horizontally centered but preserve their vertical offset (dy)
            const tspans = textEl.getElementsByTagName('tspan');
            const textXAttr = textEl.getAttribute('x') || '0';
            for (let t = 0; t < tspans.length; t++) {
              tspans[t].setAttribute('x', textXAttr);
              tspans[t].removeAttribute('y');
              // DO NOT remove dy
            }

            if (rectEl) resizeBackgroundRect(textEl, rectEl, fontSize, svgFontFamily);
          }
        }

        // Background color and opacity
        if (rectEl instanceof SVGRectElement) {
          // Mark this rect as styled by post-processing for testing
          rectEl.setAttribute('data-styled-by-post-processing', 'true');

          if (style.fill) {
            // Only override fill if user specified a custom color
            rectEl.style.setProperty('fill', style.fill, 'important');
            rectEl.setAttribute('fill', style.fill);
          }
          // If no custom fill, use Mermaid's default color (don't override)

          if (style.fillOpacity) {
            rectEl.style.setProperty('fill-opacity', style.fillOpacity, 'important');
            rectEl.setAttribute('fill-opacity', style.fillOpacity);
          } else {
            // Force opacity to 1 for opaque backgrounds
            rectEl.style.setProperty('fill-opacity', '1', 'important');
            rectEl.setAttribute('fill-opacity', '1');
          }
        } else if (style.fill || style.fillOpacity) {
          // Mermaid didn't create a background rect - create one now
          const textEl = label.getElementsByTagName('text')[0];
          if (textEl) {
            const textContent = textEl.textContent?.trim() ?? '';
            if (textContent) {
              // Get the actual bounding box of the text element
              // This correctly handles multi-line labels (multiple tspans)
              const bbox = (textEl as SVGTextElement).getBBox();
              const textWidth = bbox.width;
              const textHeight = bbox.height;
              const textX = bbox.x + bbox.width / 2;
              const textY = bbox.y + bbox.height / 2;

              const fontSize = parseInt(textEl.getAttribute('font-size') || '14');
              const hPad = fontSize * 0.5;
              const vPad = fontSize * 0.3;
              const rectWidth = textWidth + hPad * 2;
              const rectHeight = textHeight + vPad * 2;

              // Create background rect centered on the text bounding box
              const newRect = svg.ownerDocument.createElementNS(SVG_NS, 'rect');
              newRect.setAttribute('class', 'background');
              newRect.setAttribute('x', String(textX - rectWidth / 2));
              newRect.setAttribute('y', String(textY - rectHeight / 2));
              newRect.setAttribute('width', String(rectWidth));
              newRect.setAttribute('height', String(rectHeight));
              newRect.setAttribute('rx', '4'); // Rounded corners
              newRect.setAttribute('ry', '4');

              // Apply fill and opacity
              if (style.fill) {
                newRect.setAttribute('fill', style.fill);
                newRect.style.fill = style.fill;
              } else {
                newRect.setAttribute('fill', '#ffffff'); // Default white background
                newRect.style.fill = '#ffffff';
              }

              if (style.fillOpacity) {
                newRect.setAttribute('fill-opacity', style.fillOpacity);
                newRect.style.fillOpacity = style.fillOpacity;
              } else {
                newRect.setAttribute('fill-opacity', '1'); // Default opaque
                newRect.style.fillOpacity = '1';
              }

              // Insert rect before text in the label group
              const labelGroup = label.getElementsByTagName('g')[0];
              if (labelGroup) {
                labelGroup.insertBefore(newRect, labelGroup.firstChild);
              } else {
                label.insertBefore(newRect, textEl);
              }
            }
          }
        }
      }
    };

    // Handle 'default' style first
    const defaultStyle = linkStyles.get('default');
    if (defaultStyle) {
      for (let idx = 0; idx < edgePaths.length; idx++) {
        applyToEdge(idx, defaultStyle);
      }
    }

    // Map SVG indices to parsed indices only when indexed linkStyle entries exist
    if (linkStyles.size > (defaultStyle ? 1 : 0)) {
      if (parsedEdges && parsedEdges.length > 0) {
        const svgToParsed = buildSvgToParsedEdgeMap(svg, parsedEdges, edgePaths, {
          edgeLabelIndex,
        });
        const parsedToSvg = new Map<number, number>();
        svgToParsed.forEach((parsedIdx, svgIdx) => parsedToSvg.set(parsedIdx, svgIdx));

        for (const [parsedIdx, style] of linkStyles) {
          if (parsedIdx === 'default') continue;
          const svgIdx = parsedToSvg.get(parsedIdx as number);
          if (svgIdx !== undefined) {
            applyToEdge(svgIdx, style);
          }
        }
      } else {
        // Fallback: direct index mapping
        for (const [idx, style] of linkStyles) {
          if (idx === 'default') continue;
          if (typeof idx === 'number' && idx < edgePaths.length) {
            applyToEdge(idx, style);
          }
        }
      }
    }
  }

  // FINAL CLEANUP: Remove fill from ALL edge paths (even those without custom styles)
  // This ensures Mermaid's incorrect fill application is always cleaned up
  for (let i = 0; i < edgePaths.length; i++) {
    const path = edgePaths[i];
    const tagName = path.nodeName;
    if (tagName === 'path' || tagName === 'line' || tagName === 'PATH' || tagName === 'LINE') {
      path.setAttribute('fill', 'none');
      path.setAttribute('fill-opacity', '0');

      // Also try style attribute if it exists
      const currentStyle = path.getAttribute('style') || '';
      if (currentStyle) {
        const cleaned = (
          currentStyle.includes('fill')
            ? currentStyle.replace(FILL_STYLE_RE, '').replace(FILL_OPACITY_STYLE_RE, '')
            : currentStyle
        ).trimEnd();
        const sep = cleaned && !cleaned.endsWith(';') ? '; ' : cleaned ? ' ' : '';
        path.setAttribute(
          'style',
          `${cleaned}${sep}fill: none !important; fill-opacity: 0 !important;`
        );
      }
    }
  }
}

/**
 * Apply per-node style overrides (font weight, font size, text color) directly to SVG elements.
 * Matches nodes by ID and applies styles to their text elements and shapes.
 */
export function applyNodeFontStyles(
  svgString: string,
  nodeStyles: Map<string, { fontSize?: string; fontWeight?: string; color?: string }>
): string {
  if (nodeStyles.size === 0) return svgString;
  const parsedSvg = parseSvgElement(svgString, false);
  if (!parsedSvg) return svgString;
  const ctx = createPostProcessContext(parsedSvg.svg, parsedSvg.parsedViaXmlFallback);
  applyNodeFontStylesInSvg(ctx, nodeStyles);
  return serializeSvgElement(parsedSvg.svg, ctx, svgString);
}

/**
 * SVG-level variant of {@link applyNodeFontStyles} used by the shared
 * pipeline (the caller skips the call when nodeStyles is empty).
 */
function applyNodeFontStylesInSvg(
  ctx: PostProcessSvgContext,
  nodeStyles: Map<string, { fontSize?: string; fontWeight?: string; color?: string }>
): void {
  const { svg } = ctx;
  // Get all nodes in the SVG (including v12 special icon/image shapes and nested subgraphs)
  const nodes = collectNodeElements(svg);

  for (let i = 0; i < nodes.length; i++) {
    const nodeEl = nodes[i];
    const nodeId = nodeEl.getAttribute('id') || nodeEl.getAttribute('data-id');
    if (!nodeId) continue;

    // Try to find a matching style by ID
    let matchedStyle: { fontSize?: string; fontWeight?: string; color?: string } | undefined;

    // Direct ID match
    if (nodeStyles.has(nodeId)) {
      matchedStyle = nodeStyles.get(nodeId);
    } else {
      // Try simple ID match (extracted from flowchart-{ID}-{NUM} or prefix-flowchart-{ID}-{NUM})
      const simpleIdMatch = nodeId.match(SIMPLE_NODE_ID_RE);
      if (simpleIdMatch) {
        const simpleId = simpleIdMatch[1];
        if (nodeStyles.has(simpleId)) {
          matchedStyle = nodeStyles.get(simpleId);
        }
      }
    }

    if (!matchedStyle) continue;

    if (
      !ctx.unsafeXmlSerialization &&
      (hasUnsafeOuterHtmlChars(matchedStyle.fontSize) ||
        hasUnsafeOuterHtmlChars(matchedStyle.fontWeight) ||
        hasUnsafeOuterHtmlChars(matchedStyle.color))
    ) {
      ctx.unsafeXmlSerialization = true;
    }

    // Apply font styles to text elements within the node
    const textElements = nodeEl.getElementsByTagName('text');
    for (let t = 0; t < textElements.length; t++) {
      const textEl = textElements[t] as SVGTextElement;
      if (matchedStyle.fontSize) {
        textEl.setAttribute('font-size', matchedStyle.fontSize);
        textEl.style.fontSize = matchedStyle.fontSize;
      }
      if (matchedStyle.fontWeight) {
        textEl.setAttribute('font-weight', matchedStyle.fontWeight);
        textEl.style.fontWeight = matchedStyle.fontWeight;
      }
      if (matchedStyle.color) {
        textEl.setAttribute('fill', matchedStyle.color);
        textEl.style.color = matchedStyle.color;
      }
    }

    // For foreignObject elements (HTML-based labels in Mermaid 11+)
    const foreignObjects = nodeEl.getElementsByTagName('foreignObject');
    for (let f = 0; f < foreignObjects.length; f++) {
      const fo = foreignObjects[f];
      const div = fo.getElementsByTagName('div')[0];
      if (div) {
        const divStyle = (div as HTMLElement).style;
        if (matchedStyle.fontSize) {
          divStyle.fontSize = matchedStyle.fontSize;
        }
        if (matchedStyle.fontWeight) {
          divStyle.fontWeight = matchedStyle.fontWeight;
        }
        if (matchedStyle.color) {
          divStyle.color = matchedStyle.color;
        }
      }

      // Also style spans within foreignObject
      const spans = fo.getElementsByTagName('span');
      for (let s = 0; s < spans.length; s++) {
        const spanStyle = (spans[s] as HTMLElement).style;
        if (matchedStyle.fontSize) {
          spanStyle.fontSize = matchedStyle.fontSize;
        }
        if (matchedStyle.fontWeight) {
          spanStyle.fontWeight = matchedStyle.fontWeight;
        }
        if (matchedStyle.color) {
          spanStyle.color = matchedStyle.color;
        }
      }
    }
  }
}
