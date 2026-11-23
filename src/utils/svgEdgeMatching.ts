/**
 * Shared SVG-to-parsed-edge matching utilities for flowcharts.
 * Used by SVG post-processing, PreviewPanel hit targets/highlighting, and VisualEditorCanvas.
 */

export interface NodeBox {
  x: number;
  y: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface EdgeMatchTarget {
  source: string;
  target: string;
  label?: string;
}

export interface EdgeLabelIndex {
  children: HTMLCollection;
  elementByDataId: Map<string, Element>;
  textByIndex: string[];
  textByDataId: Map<string, string>;
}

export interface BuildSvgToParsedEdgeMapOptions {
  edgeLabelIndex?: EdgeLabelIndex | null;
}

const NODE_ID_RE = /flowchart-([A-Za-z0-9_-]+)-\d+$/;
const NUMBER_RE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
const TRANSLATE_RE = /translate\(([^,]+),\s*([^)]+)\)/;
const BR_TAG_RE = /<br\s*\/?>/gi;
const WHITESPACE_RE = /\s+/g;
const NON_ASCII_WS_RE = /\s/;
const EMPTY_INDICES: readonly number[] = [];

function isWhitespaceAt(str: string, idx: number): boolean {
  const code = str.charCodeAt(idx);
  if (code === 32 || (code >= 9 && code <= 13)) return true;
  return code >= 160 && NON_ASCII_WS_RE.test(str[idx]);
}

function hasNoWhitespaceFrom(str: string, from: number): boolean {
  for (let i = from; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 32 || (code >= 9 && code <= 13)) return false;
    if (code >= 160 && NON_ASCII_WS_RE.test(str[i])) return false;
  }
  return true;
}

function hasClassToken(cls: string, token: string): boolean {
  const len = token.length;
  let searchFrom = 0;
  while (searchFrom <= cls.length - len) {
    const idx = cls.indexOf(token, searchFrom);
    if (idx === -1) return false;
    const startOk = idx === 0 || isWhitespaceAt(cls, idx - 1);
    const endPos = idx + len;
    const endOk = endPos === cls.length || isWhitespaceAt(cls, endPos);
    if (startOk && endOk) return true;
    searchFrom = idx + 1;
  }
  return false;
}

/**
 * Extract the leftmost `(?:^|-)(L_[^\s]+)$` suffix from a Mermaid path ID
 * without regex or match-array allocations.
 */
export function extractPathIdSuffix(pathId: string): string | null {
  const len = pathId.length;
  if (len < 3) return null;

  if (
    pathId.charCodeAt(0) === 76 && // 'L'
    pathId.charCodeAt(1) === 95 && // '_'
    hasNoWhitespaceFrom(pathId, 2)
  ) {
    return pathId;
  }

  let searchFrom = 0;
  while (searchFrom <= len - 4) {
    const idx = pathId.indexOf('-L_', searchFrom);
    if (idx === -1) return null;
    const start = idx + 1;
    if (start + 2 < len && hasNoWhitespaceFrom(pathId, start + 2)) {
      return pathId.slice(start);
    }
    searchFrom = idx + 1;
  }
  return null;
}

/**
 * Collect all flowchart edge paths (`path.flowchart-link` inside `.edgePaths`
 * containers) using live DOM collections instead of full-tree querySelectorAll.
 */
export function collectFlowchartEdgePaths(svg: Element): Element[] {
  const containers = svg.getElementsByClassName('edgePaths');
  const result: Element[] = [];
  if (containers.length === 0) return result;

  const seen = containers.length > 1 ? new Set<Element>() : null;
  for (let i = 0; i < containers.length; i++) {
    const paths = containers[i].getElementsByTagName('path');
    for (let j = 0; j < paths.length; j++) {
      const p = paths[j];
      if (!p.classList.contains('flowchart-link')) continue;
      if (seen) {
        if (seen.has(p)) continue;
        seen.add(p);
      }
      result.push(p);
    }
  }
  return result;
}

/**
 * Locate the first `<g class="edgeLabels">` container via live class lookup.
 */
export function findEdgeLabelsContainer(svg: Element): Element | null {
  const containers = svg.getElementsByClassName('edgeLabels');
  for (let i = 0; i < containers.length; i++) {
    const el = containers[i];
    if (el.tagName === 'g' || el.tagName === 'G') {
      return el;
    }
  }
  return null;
}

/**
 * Collect all diagram node groups (`.node`, `.icon-shape`, `.image-shape`)
 * across the full SVG (including nested subgraphs, composite states, and
 * minimal fixtures), deduping only when icon/image shapes are present.
 */
export function collectNodeElements(svg: Element): ArrayLike<Element> {
  const nodes = svg.getElementsByClassName('node');
  const roughNodes = svg.getElementsByClassName('rough-node');
  const iconShapes = svg.getElementsByClassName('icon-shape');
  const imageShapes = svg.getElementsByClassName('image-shape');

  if (roughNodes.length === 0 && iconShapes.length === 0 && imageShapes.length === 0) {
    return nodes;
  }

  const seen = new Set<Element>();
  const result: Element[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    seen.add(el);
    result.push(el);
  }
  for (let i = 0; i < roughNodes.length; i++) {
    const el = roughNodes[i];
    if (!seen.has(el)) {
      seen.add(el);
      result.push(el);
    }
  }
  for (let i = 0; i < iconShapes.length; i++) {
    const el = iconShapes[i];
    if (!seen.has(el)) {
      seen.add(el);
      result.push(el);
    }
  }
  for (let i = 0; i < imageShapes.length; i++) {
    const el = imageShapes[i];
    if (!seen.has(el)) {
      seen.add(el);
      result.push(el);
    }
  }
  return result;
}

/**
 * Single-pass index over `g.edgeLabels` children collecting label elements and
 * normalized label text once per edge label (shared by post-processing and edge matching).
 */
export function buildEdgeLabelIndex(edgeLabelsContainer: Element): EdgeLabelIndex {
  const children = edgeLabelsContainer.children;
  const childCount = children.length;
  const elementByDataId = new Map<string, Element>();
  const textByIndex = new Array<string>(childCount);
  const textByDataId = new Map<string, string>();

  for (let i = 0; i < childCount; i++) {
    const child = children[i];
    const first = child.firstElementChild;
    let text = '';

    // 2-level direct-child fast path for standard Mermaid 11/12 labels:
    // <g class="edgeLabel"><g class="label"><foreignObject>...</foreignObject></g></g>
    // or <g class="edgeLabel"><text>...</text></g>
    if (child.childElementCount === 1 && first) {
      const firstTag = first.tagName;
      if (firstTag === 'text' || firstTag === 'TEXT') {
        text = normalizeEdgeLabelForMatch(first.textContent ?? '');
      } else if (
        (firstTag === 'g' || firstTag === 'G') &&
        first.childElementCount === 1 &&
        first.firstElementChild
      ) {
        const grand = first.firstElementChild;
        const grandTag = grand.tagName;
        if (
          grandTag === 'foreignObject' ||
          grandTag === 'FOREIGNOBJECT' ||
          grandTag === 'text' ||
          grandTag === 'TEXT'
        ) {
          text = normalizeEdgeLabelForMatch(grand.textContent ?? '');
        } else {
          const rawChildText = child.textContent ?? '';
          if (rawChildText.trim().length > 0) {
            const textEl =
              child.getElementsByTagName('text')[0] ??
              child.getElementsByTagName('foreignObject')[0] ??
              child;
            text = normalizeEdgeLabelForMatch(textEl.textContent ?? '');
          }
        }
      } else {
        const rawChildText = child.textContent ?? '';
        if (rawChildText.trim().length > 0) {
          const textEl =
            child.getElementsByTagName('text')[0] ??
            child.getElementsByTagName('foreignObject')[0] ??
            child;
          text = normalizeEdgeLabelForMatch(textEl.textContent ?? '');
        }
      }
    } else {
      const rawChildText = child.textContent ?? '';
      if (rawChildText.trim().length > 0) {
        const textEl =
          child.getElementsByTagName('text')[0] ??
          child.getElementsByTagName('foreignObject')[0] ??
          child;
        text = normalizeEdgeLabelForMatch(textEl.textContent ?? '');
      }
    }

    textByIndex[i] = text;

    let dataId = child.getAttribute('data-id');
    if (!dataId) {
      if (first && first.hasAttribute('data-id')) {
        dataId = first.getAttribute('data-id');
      } else {
        dataId = child.querySelector('[data-id]')?.getAttribute('data-id') ?? null;
      }
    }
    if (dataId && !elementByDataId.has(dataId)) {
      elementByDataId.set(dataId, child);
      textByDataId.set(dataId, text);
    }
  }

  return { children, elementByDataId, textByIndex, textByDataId };
}

function isPathNumberChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    code === 46 || // .
    code === 45 || // -
    code === 43 || // +
    code === 101 || // e
    code === 69 // E
  );
}

function isIdSeparator(code: number): boolean {
  return code === 95 || code === 45; // '_' or '-'
}

/**
 * Locate the separator (`_` or `-`) immediately preceding trailing ASCII digits (`\d+$`).
 * Returns -1 unless there is at least one trailing digit AND a valid separator before it.
 */
function findPathIdBodyEnd(id: string): number {
  let bodyEnd = id.length - 1;
  while (bodyEnd >= 0) {
    const code = id.charCodeAt(bodyEnd);
    if (code < 48 || code > 57) break;
    bodyEnd--;
  }
  if (bodyEnd >= id.length - 1 || bodyEnd < 0 || !isIdSeparator(id.charCodeAt(bodyEnd))) {
    return -1;
  }
  return bodyEnd;
}

function matchesPathId(id: string, source: string, target: string): boolean {
  const bodyEnd = findPathIdBodyEnd(id);
  if (bodyEnd < 3) return false;

  const startPos = bodyEnd - source.length - target.length - 3;
  if (startPos < 0) return false;
  if (startPos > 0 && id.charCodeAt(startPos - 1) !== 45) return false;
  if (id.charCodeAt(startPos) !== 76) return false; // 'L'
  if (!isIdSeparator(id.charCodeAt(startPos + 1))) return false;
  if (!isIdSeparator(id.charCodeAt(startPos + 2 + source.length))) return false;

  return (
    id.startsWith(source, startPos + 2) && id.startsWith(target, startPos + 3 + source.length)
  );
}

interface BucketAccumulator {
  first: number[] | null;
  extra: number[][] | null;
}

function recordBucket(acc: BucketAccumulator, bucket: number[] | undefined): void {
  if (!bucket || bucket.length === 0) return;
  if (acc.first === null) {
    acc.first = bucket;
    return;
  }
  if (bucket === acc.first) return;
  if (acc.extra === null) {
    acc.extra = [bucket];
    return;
  }
  if (!acc.extra.includes(bucket)) {
    acc.extra.push(bucket);
  }
}

function findPathEndpointMatches(
  path: Element,
  parsedBySourceTarget: Map<string, Map<string, number[]>>
): { indices: readonly number[]; singleKey: boolean } {
  const acc: BucketAccumulator = { first: null, extra: null };

  const id = path.getAttribute('id') || '';
  if (id) {
    const bodyEnd = findPathIdBodyEnd(id);
    if (bodyEnd >= 3) {
      let searchFrom = 0;
      const maxStart = bodyEnd - 3;
      while (searchFrom <= maxStart) {
        const startPos = id.indexOf('L', searchFrom);
        if (startPos === -1 || startPos > maxStart) break;
        searchFrom = startPos + 1;

        if (startPos > 0 && id.charCodeAt(startPos - 1) !== 45) continue;
        if (!isIdSeparator(id.charCodeAt(startPos + 1))) continue;

        const payloadStart = startPos + 2;
        for (let sep = payloadStart; sep < bodyEnd; sep++) {
          if (!isIdSeparator(id.charCodeAt(sep))) continue;
          const byTarget = parsedBySourceTarget.get(id.slice(payloadStart, sep));
          if (byTarget) {
            recordBucket(acc, byTarget.get(id.slice(sep + 1, bodyEnd)));
          }
        }
      }
    }
  }

  const cls = path.getAttribute('class') || '';
  if (cls && cls.includes('LS-') && cls.includes('LE-')) {
    const clsLen = cls.length;
    let sSearch = 0;
    while (sSearch < clsLen) {
      const sPos = cls.indexOf('LS-', sSearch);
      if (sPos === -1) break;
      if (sPos > 0 && !isWhitespaceAt(cls, sPos - 1)) {
        sSearch = sPos + 3;
        continue;
      }
      let sEnd = sPos + 3;
      while (sEnd < clsLen && !isWhitespaceAt(cls, sEnd)) {
        sEnd++;
      }
      sSearch = sEnd;

      const byTarget = parsedBySourceTarget.get(cls.slice(sPos + 3, sEnd));
      if (!byTarget) continue;

      let tSearch = 0;
      while (tSearch < clsLen) {
        const tPos = cls.indexOf('LE-', tSearch);
        if (tPos === -1) break;
        if (tPos > 0 && !isWhitespaceAt(cls, tPos - 1)) {
          tSearch = tPos + 3;
          continue;
        }
        let tEnd = tPos + 3;
        while (tEnd < clsLen && !isWhitespaceAt(cls, tEnd)) {
          tEnd++;
        }
        tSearch = tEnd;
        recordBucket(acc, byTarget.get(cls.slice(tPos + 3, tEnd)));
      }
    }
  }

  if (acc.first === null) {
    return { indices: EMPTY_INDICES, singleKey: true };
  }
  if (acc.extra === null) {
    return { indices: acc.first, singleKey: true };
  }

  const merged = acc.first.slice();
  for (let i = 0; i < acc.extra.length; i++) {
    const bucket = acc.extra[i];
    for (let j = 0; j < bucket.length; j++) {
      merged.push(bucket[j]);
    }
  }
  merged.sort((a, b) => a - b);
  return { indices: merged, singleKey: false };
}

/**
 * Extract start and end coordinates from an SVG path `d` attribute.
 * Handles both space-separated ("M 10 20") and comma-separated ("M10,20") Mermaid paths.
 */
export function extractPathEndpoints(
  d: string
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  NUMBER_RE.lastIndex = 0;
  const m0 = NUMBER_RE.exec(d);
  if (!m0) return null;
  const m1 = NUMBER_RE.exec(d);
  if (!m1) return null;

  const afterStart = NUMBER_RE.lastIndex;
  const start = { x: parseFloat(m0[0]), y: parseFloat(m1[0]) };

  let windowSize = 64;
  while (true) {
    let scanStart = Math.max(afterStart, d.length - windowSize);
    while (scanStart > afterStart && isPathNumberChar(d.charCodeAt(scanStart - 1))) {
      scanStart--;
    }

    NUMBER_RE.lastIndex = scanStart;
    let prev = '';
    let last = '';
    let tailCount = 0;
    let m: RegExpExecArray | null;
    while ((m = NUMBER_RE.exec(d)) !== null) {
      prev = last;
      last = m[0];
      tailCount++;
    }

    if (tailCount >= 2) {
      return {
        start,
        end: { x: parseFloat(prev), y: parseFloat(last) },
      };
    }

    if (scanStart <= afterStart) {
      return null;
    }

    windowSize *= 4;
  }
}

/**
 * Collect node centers and bounding boxes in SVG coordinates from `.node` elements.
 * Keys map by both full element ID and bare Mermaid node ID (extracted from `flowchart-{ID}-{NUM}`).
 */
export function collectNodeBoxes(svg: Element): Map<string, NodeBox> {
  const nodeBoxes = new Map<string, NodeBox>();
  const nodeElements = collectNodeElements(svg);

  for (let i = 0; i < nodeElements.length; i++) {
    const nodeEl = nodeElements[i];
    const transform = nodeEl.getAttribute('transform');
    if (!transform) continue;

    const tMatch = transform.match(TRANSLATE_RE);
    if (!tMatch) continue;

    const idAttr = nodeEl.getAttribute('id') || '';
    const dataId = nodeEl.getAttribute('data-id') || '';
    if (!idAttr && !dataId) continue;

    const cx = parseFloat(tMatch[1]);
    const cy = parseFloat(tMatch[2]);

    let box: NodeBox = { x: cx, y: cy, minX: cx, minY: cy, maxX: cx, maxY: cy };

    // Use live SVG getBBox when available (browser) so large/wide nodes match perimeter endpoints.
    const svgGroup = nodeEl as unknown as {
      getBBox?: () => { x: number; y: number; width: number; height: number };
    };
    let gotShapeBox = false;
    if (typeof svgGroup.getBBox === 'function') {
      try {
        const b = svgGroup.getBBox();
        if (b && (b.width > 0 || b.height > 0)) {
          box = {
            x: cx,
            y: cy,
            minX: cx + b.x,
            minY: cy + b.y,
            maxX: cx + b.x + b.width,
            maxY: cy + b.y + b.height,
          };
          gotShapeBox = true;
        }
      } catch {
        // Ignore getBBox errors on detached/hidden SVGs (e.g. jsdom)
      }
    }

    if (!gotShapeBox) {
      const rect = nodeEl.getElementsByTagName('rect')[0];
      if (rect) {
        const rw = parseFloat(rect.getAttribute('width') || '0');
        const rh = parseFloat(rect.getAttribute('height') || '0');
        if (rw > 0 || rh > 0) {
          const rx = parseFloat(rect.getAttribute('x') || String(-rw / 2));
          const ry = parseFloat(rect.getAttribute('y') || String(-rh / 2));
          box = {
            x: cx,
            y: cy,
            minX: cx + rx,
            minY: cy + ry,
            maxX: cx + rx + rw,
            maxY: cy + ry + rh,
          };
        }
      }
    }

    if (idAttr) {
      nodeBoxes.set(idAttr, box);
      const simpleMatch = idAttr.match(NODE_ID_RE);
      if (simpleMatch) {
        nodeBoxes.set(simpleMatch[1], box);
      }
    }
    if (dataId) {
      nodeBoxes.set(dataId, box);
    }
  }

  return nodeBoxes;
}

/**
 * Euclidean distance from a point to the nearest point inside/on a NodeBox.
 * Returns 0 if the point lies inside the bounding box.
 */
export function distanceToNodeBox(point: { x: number; y: number }, box: NodeBox): number {
  const dx = point.x < box.minX ? box.minX - point.x : point.x > box.maxX ? point.x - box.maxX : 0;
  const dy = point.y < box.minY ? box.minY - point.y : point.y > box.maxY ? point.y - box.maxY : 0;
  return Math.hypot(dx, dy);
}

/**
 * Normalize an edge label for comparison between parsed Mermaid source and rendered SVG.
 * Strips matching outer quotes and collapses `<br>` / whitespace.
 */
export function normalizeEdgeLabelForMatch(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  if (s.length === 0) return '';
  if (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(BR_TAG_RE, '').replace(WHITESPACE_RE, ' ').trim();
}

/**
 * Extract rendered edge label text per SVG edge path.
 * Supports both legacy SVG `<text>` labels and Mermaid 11/12 HTML `<foreignObject>` labels.
 * Returns `null` for entries where no corresponding `<g class="edgeLabel">` element exists
 * (e.g. synthetic SVGs without `<g class="edgeLabels">`), so callers do not confuse a
 * missing label container with an explicitly unlabeled edge `""`.
 */
export function extractSvgEdgeLabels(
  svg: Element,
  edgePaths: Element[],
  edgeLabelIndexOverride?: EdgeLabelIndex | null
): Array<string | null> {
  const pathCount = edgePaths.length;
  let index: EdgeLabelIndex | null;
  if (edgeLabelIndexOverride !== undefined) {
    index = edgeLabelIndexOverride;
  } else {
    const edgeLabelsContainer = findEdgeLabelsContainer(svg);
    index = edgeLabelsContainer ? buildEdgeLabelIndex(edgeLabelsContainer) : null;
  }

  if (!index) {
    return new Array<string | null>(pathCount).fill(null);
  }

  const labelByIndex = index.textByIndex;
  const labelByDataId = index.textByDataId;
  const childCount = labelByIndex.length;

  const result = new Array<string | null>(pathCount);
  if (labelByDataId.size === 0) {
    for (let idx = 0; idx < pathCount; idx++) {
      result[idx] = idx < childCount ? labelByIndex[idx] : null;
    }
    return result;
  }

  for (let idx = 0; idx < pathCount; idx++) {
    const pathId = edgePaths[idx].getAttribute('id') || '';
    if (pathId) {
      // Mermaid 12 renders path id "<prefix>-L_A_B_0" and label data-id "L_A_B_0"
      const direct = labelByDataId.get(pathId);
      if (direct !== undefined) {
        result[idx] = direct;
        continue;
      }
      const suffix = extractPathIdSuffix(pathId);
      if (suffix !== null) {
        const bySuffix = labelByDataId.get(suffix);
        if (bySuffix !== undefined) {
          result[idx] = bySuffix;
          continue;
        }
      }
    }
    result[idx] = idx < childCount ? labelByIndex[idx] : null;
  }

  return result;
}

/**
 * Check if an SVG edge path carries Mermaid's endpoint ID (`L_{src}_{tgt}_{n}`)
 * or class markers (`LS-{src} LE-{tgt}`).
 */
export function edgeMatchesPathIdentity(path: Element, edge: EdgeMatchTarget): boolean {
  const id = path.getAttribute('id') || '';
  if (id && matchesPathId(id, edge.source, edge.target)) {
    return true;
  }

  const cls = path.getAttribute('class') || '';
  if (cls && cls.includes('LS-') && cls.includes('LE-')) {
    if (hasClassToken(cls, `LS-${edge.source}`) && hasClassToken(cls, `LE-${edge.target}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Compute geometric distance between an SVG path's endpoints and a candidate edge's nodes.
 * Returns Infinity if endpoint coordinates or node boxes are unavailable.
 */
export function getEdgeEndpointDistance(
  endpoints: { start: { x: number; y: number }; end: { x: number; y: number } } | null,
  edge: EdgeMatchTarget,
  nodeBoxes: Map<string, NodeBox>
): number {
  if (!endpoints) return Infinity;
  const sourceBox = nodeBoxes.get(edge.source);
  const targetBox = nodeBoxes.get(edge.target);
  if (!sourceBox || !targetBox) return Infinity;

  const forward =
    distanceToNodeBox(endpoints.start, sourceBox) + distanceToNodeBox(endpoints.end, targetBox);
  const reverse =
    distanceToNodeBox(endpoints.start, targetBox) + distanceToNodeBox(endpoints.end, sourceBox);
  return Math.min(forward, reverse);
}

/**
 * Build a one-to-one mapping from SVG edge-path index to parsed-edge index.
 * Combines label matching, Mermaid path ID/class identity, and node bounding-box geometry.
 */
export function buildSvgToParsedEdgeMap(
  svg: Element,
  parsedEdges: EdgeMatchTarget[],
  edgePathsOverride?: Element[],
  options?: BuildSvgToParsedEdgeMapOptions
): Map<number, number> {
  const edgePaths = edgePathsOverride ?? collectFlowchartEdgePaths(svg);
  const map = new Map<number, number>();
  const edgeCount = parsedEdges.length;
  if (edgePaths.length === 0 || edgeCount === 0) return map;

  const svgLabelTexts = extractSvgEdgeLabels(svg, edgePaths, options?.edgeLabelIndex);
  const normalizedParsedLabels = new Array<string>(edgeCount);
  const parsedByLabel = new Map<string, number[]>();
  const remainingByLabel = new Map<string, number>();
  const headByLabel = new Map<string, number>();

  for (let i = 0; i < edgeCount; i++) {
    const edge = parsedEdges[i];
    const label = normalizeEdgeLabelForMatch(edge.label ?? '');
    normalizedParsedLabels[i] = label;

    const labelBucket = parsedByLabel.get(label);
    if (!labelBucket) {
      parsedByLabel.set(label, [i]);
      remainingByLabel.set(label, 1);
      headByLabel.set(label, 0);
    } else {
      labelBucket.push(i);
      remainingByLabel.set(label, (remainingByLabel.get(label) ?? 0) + 1);
    }
  }

  let cachedParsedBySourceTarget: Map<string, Map<string, number[]>> | null = null;
  const getParsedBySourceTarget = (): Map<string, Map<string, number[]>> => {
    if (cachedParsedBySourceTarget === null) {
      cachedParsedBySourceTarget = new Map<string, Map<string, number[]>>();
      for (let i = 0; i < edgeCount; i++) {
        const edge = parsedEdges[i];
        let byTarget = cachedParsedBySourceTarget.get(edge.source);
        if (!byTarget) {
          byTarget = new Map<string, number[]>();
          cachedParsedBySourceTarget.set(edge.source, byTarget);
        }
        const pairBucket = byTarget.get(edge.target);
        if (!pairBucket) {
          byTarget.set(edge.target, [i]);
        } else {
          pairBucket.push(i);
        }
      }
    }
    return cachedParsedBySourceTarget;
  };

  const matched = new Uint8Array(edgeCount);
  let matchedCount = 0;
  let firstUnmatchedCursor = 0;

  let cachedNodeBoxes: Map<string, NodeBox> | null = null;
  const getNodeBoxes = (): Map<string, NodeBox> => {
    if (cachedNodeBoxes === null) {
      cachedNodeBoxes = collectNodeBoxes(svg);
    }
    return cachedNodeBoxes;
  };

  let endpointsForPath: Element | null = null;
  let cachedEndpoints: { start: { x: number; y: number }; end: { x: number; y: number } } | null =
    null;
  const getEndpoints = (
    path: Element
  ): { start: { x: number; y: number }; end: { x: number; y: number } } | null => {
    if (endpointsForPath !== path) {
      endpointsForPath = path;
      const d = path.getAttribute('d');
      cachedEndpoints = d ? extractPathEndpoints(d) : null;
    }
    return cachedEndpoints;
  };

  const markMatched = (svgIndex: number, parsedIdx: number): void => {
    map.set(svgIndex, parsedIdx);
    matched[parsedIdx] = 1;
    matchedCount++;
    const label = normalizedParsedLabels[parsedIdx];
    remainingByLabel.set(label, (remainingByLabel.get(label) ?? 1) - 1);
  };

  const pickByDistance = (candidates: number[], path: Element): number => {
    const endpoints = getEndpoints(path);
    if (endpoints !== null) {
      const nodeBoxes = getNodeBoxes();
      if (nodeBoxes.size > 0) {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < candidates.length; i++) {
          const idx = candidates[i];
          const dist = getEdgeEndpointDistance(endpoints, parsedEdges[idx], nodeBoxes);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        }
        if (bestIdx !== -1) {
          return bestIdx;
        }
      }
    }
    return candidates[0];
  };

  for (let svgIndex = 0; svgIndex < edgePaths.length; svgIndex++) {
    const path = edgePaths[svgIndex];
    const svgLabel = svgLabelTexts[svgIndex];

    // 1. Collect unmatched parsed edges with matching label text (only when label container provided a label)
    if (svgLabel !== null) {
      const rem = remainingByLabel.get(svgLabel) ?? 0;
      if (rem === 1) {
        const labelBucket = parsedByLabel.get(svgLabel)!;
        let head = headByLabel.get(svgLabel) ?? 0;
        while (head < labelBucket.length && matched[labelBucket[head]]) {
          head++;
        }
        headByLabel.set(svgLabel, head);
        if (head < labelBucket.length) {
          markMatched(svgIndex, labelBucket[head]);
          continue;
        }
      } else if (rem > 1) {
        const { indices: pathMatches, singleKey } = findPathEndpointMatches(
          path,
          getParsedBySourceTarget()
        );

        if (singleKey) {
          let chosen = -1;
          for (let i = 0; i < pathMatches.length; i++) {
            const idx = pathMatches[i];
            if (!matched[idx] && normalizedParsedLabels[idx] === svgLabel) {
              chosen = idx;
              break;
            }
          }
          if (chosen !== -1) {
            markMatched(svgIndex, chosen);
            continue;
          }
        } else if (pathMatches.length > 0) {
          const idCandidates: number[] = [];
          for (let i = 0; i < pathMatches.length; i++) {
            const idx = pathMatches[i];
            if (!matched[idx] && normalizedParsedLabels[idx] === svgLabel) {
              idCandidates.push(idx);
            }
          }
          if (idCandidates.length === 1) {
            markMatched(svgIndex, idCandidates[0]);
            continue;
          }
          if (idCandidates.length > 1) {
            markMatched(svgIndex, pickByDistance(idCandidates, path));
            continue;
          }
        }

        const labelBucket = parsedByLabel.get(svgLabel)!;
        let head = headByLabel.get(svgLabel) ?? 0;
        while (head < labelBucket.length && matched[labelBucket[head]]) {
          head++;
        }
        headByLabel.set(svgLabel, head);
        if (head < labelBucket.length) {
          let winner = labelBucket[head];
          const endpoints = getEndpoints(path);
          if (endpoints !== null) {
            const nodeBoxes = getNodeBoxes();
            if (nodeBoxes.size > 0) {
              let bestIdx = -1;
              let bestDist = Infinity;
              for (let i = head; i < labelBucket.length; i++) {
                const idx = labelBucket[i];
                if (matched[idx]) continue;
                const dist = getEdgeEndpointDistance(endpoints, parsedEdges[idx], nodeBoxes);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestIdx = idx;
                }
              }
              if (bestIdx !== -1 && bestDist < 50) {
                winner = bestIdx;
              }
            }
          }
          markMatched(svgIndex, winner);
          continue;
        }
      }
    }

    // 2. No label match (e.g. synthetic SVG without edgeLabels): match across all unmatched edges
    if (matchedCount >= edgeCount) continue;

    const { indices: pathMatches, singleKey } = findPathEndpointMatches(
      path,
      getParsedBySourceTarget()
    );
    if (singleKey) {
      let chosen = -1;
      for (let i = 0; i < pathMatches.length; i++) {
        const idx = pathMatches[i];
        if (!matched[idx]) {
          chosen = idx;
          break;
        }
      }
      if (chosen !== -1) {
        markMatched(svgIndex, chosen);
        continue;
      }
    } else if (pathMatches.length > 0) {
      const idMatches: number[] = [];
      for (let i = 0; i < pathMatches.length; i++) {
        const idx = pathMatches[i];
        if (!matched[idx]) {
          idMatches.push(idx);
        }
      }
      if (idMatches.length === 1) {
        markMatched(svgIndex, idMatches[0]);
        continue;
      }
      if (idMatches.length > 1) {
        markMatched(svgIndex, pickByDistance(idMatches, path));
        continue;
      }
    }

    while (firstUnmatchedCursor < edgeCount && matched[firstUnmatchedCursor]) {
      firstUnmatchedCursor++;
    }
    if (firstUnmatchedCursor >= edgeCount) continue;

    let winner = firstUnmatchedCursor;
    const endpoints = getEndpoints(path);
    if (endpoints !== null) {
      const nodeBoxes = getNodeBoxes();
      if (nodeBoxes.size > 0) {
        let bestMatch = -1;
        let bestDist = Infinity;
        for (let idx = firstUnmatchedCursor; idx < edgeCount; idx++) {
          if (matched[idx]) continue;
          const dist = getEdgeEndpointDistance(endpoints, parsedEdges[idx], nodeBoxes);
          if (dist < bestDist && dist < 50) {
            bestDist = dist;
            bestMatch = idx;
          }
        }
        if (bestMatch !== -1) {
          winner = bestMatch;
        }
      }
    }
    markMatched(svgIndex, winner);
  }

  return map;
}
