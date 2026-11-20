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

const NODE_ID_RE = /flowchart-([A-Za-z0-9_-]+)-\d+$/;
const NUMBER_RE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract start and end coordinates from an SVG path `d` attribute.
 * Handles both space-separated ("M 10 20") and comma-separated ("M10,20") Mermaid paths.
 */
export function extractPathEndpoints(
  d: string
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  const coords = d.match(NUMBER_RE);
  if (!coords || coords.length < 4) return null;
  return {
    start: { x: parseFloat(coords[0]), y: parseFloat(coords[1]) },
    end: { x: parseFloat(coords[coords.length - 2]), y: parseFloat(coords[coords.length - 1]) },
  };
}

/**
 * Collect node centers and bounding boxes in SVG coordinates from `.node` elements.
 * Keys map by both full element ID and bare Mermaid node ID (extracted from `flowchart-{ID}-{NUM}`).
 */
export function collectNodeBoxes(svg: Element): Map<string, NodeBox> {
  const nodeBoxes = new Map<string, NodeBox>();

  svg.querySelectorAll('.node').forEach(nodeEl => {
    const transform = nodeEl.getAttribute('transform');
    const idAttr = nodeEl.getAttribute('id') || '';
    const dataId = nodeEl.getAttribute('data-id') || '';
    if (!transform && !idAttr && !dataId) return;

    let cx = 0;
    let cy = 0;
    if (transform) {
      const tMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (!tMatch) return;
      cx = parseFloat(tMatch[1]);
      cy = parseFloat(tMatch[2]);
    } else {
      return;
    }

    let box: NodeBox = { x: cx, y: cy, minX: cx, minY: cy, maxX: cx, maxY: cy };

    // Use live SVG getBBox when available (browser) so large/wide nodes match perimeter endpoints.
    const svgGroup = nodeEl as unknown as { getBBox?: () => { x: number; y: number; width: number; height: number } };
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
      const rect = nodeEl.querySelector('rect');
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
  });

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
  let s = raw.trim();
  if (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/<br\s*\/?>/gi, '').replace(/\s+/g, ' ').trim();
}

/**
 * Extract rendered edge label text per SVG edge path.
 * Supports both legacy SVG `<text>` labels and Mermaid 11/12 HTML `<foreignObject>` labels.
 * Returns `null` for entries where no corresponding `<g class="edgeLabel">` element exists
 * (e.g. synthetic SVGs without `<g class="edgeLabels">`), so callers do not confuse a
 * missing label container with an explicitly unlabeled edge `""`.
 */
export function extractSvgEdgeLabels(svg: Element, edgePaths: Element[]): Array<string | null> {
  const edgeLabelsContainer = svg.querySelector('g.edgeLabels');
  if (!edgeLabelsContainer) return edgePaths.map(() => null);

  const labelChildren = Array.from(edgeLabelsContainer.children);
  const labelByDataId = new Map<string, string>();
  const labelByIndex: string[] = [];

  for (const child of labelChildren) {
    const textEl = child.querySelector('text') ?? child.querySelector('foreignObject') ?? child;
    const text = normalizeEdgeLabelForMatch(textEl.textContent ?? '');
    labelByIndex.push(text);
    const dataId =
      child.getAttribute('data-id') || child.querySelector('[data-id]')?.getAttribute('data-id');
    if (dataId && !labelByDataId.has(dataId)) {
      labelByDataId.set(dataId, text);
    }
  }

  return edgePaths.map((path, idx) => {
    const pathId = path.getAttribute('id') || '';
    if (pathId) {
      // Mermaid 12 renders path id "<prefix>-L_A_B_0" and label data-id "L_A_B_0"
      const direct = labelByDataId.get(pathId);
      if (direct !== undefined) return direct;
      const suffixMatch = pathId.match(/(?:^|-)(L_[^\s]+)$/);
      if (suffixMatch) {
        const bySuffix = labelByDataId.get(suffixMatch[1]);
        if (bySuffix !== undefined) return bySuffix;
      }
    }
    return idx < labelByIndex.length ? labelByIndex[idx] : null;
  });
}

/**
 * Check if an SVG edge path carries Mermaid's endpoint ID (`L_{src}_{tgt}_{n}`)
 * or class markers (`LS-{src} LE-{tgt}`).
 */
export function edgeMatchesPathIdentity(path: Element, edge: EdgeMatchTarget): boolean {
  const id = path.getAttribute('id') || '';
  if (id) {
    const src = escapeRegex(edge.source);
    const tgt = escapeRegex(edge.target);
    const idRe = new RegExp(`(?:^|-)L[_-]${src}[_-]${tgt}[_-]\\d+$`);
    if (idRe.test(id)) return true;
  }

  const cls = path.getAttribute('class') || '';
  if (cls) {
    const tokens = cls.split(/\s+/);
    if (tokens.includes(`LS-${edge.source}`) && tokens.includes(`LE-${edge.target}`)) {
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
  edgePathsOverride?: Element[]
): Map<number, number> {
  const edgePaths =
    edgePathsOverride ?? Array.from(svg.querySelectorAll('.edgePaths path.flowchart-link'));
  const map = new Map<number, number>();
  if (edgePaths.length === 0 || parsedEdges.length === 0) return map;

  const nodeBoxes = collectNodeBoxes(svg);
  const svgLabelTexts = extractSvgEdgeLabels(svg, edgePaths);
  const normalizedParsedLabels = parsedEdges.map(e => normalizeEdgeLabelForMatch(e.label ?? ''));
  const matchedParsed = new Set<number>();

  const pickBestAmong = (
    candidates: number[],
    path: Element,
    endpoints: { start: { x: number; y: number }; end: { x: number; y: number } } | null
  ): number => {
    if (candidates.length === 0) return -1;
    if (candidates.length === 1) return candidates[0];

    // Prefer candidates whose source/target match the SVG path's L_<src>_<tgt>_<n> ID or LS-/LE- classes
    const idCandidates = candidates.filter(idx => edgeMatchesPathIdentity(path, parsedEdges[idx]));
    if (idCandidates.length === 1) return idCandidates[0];

    const pool = idCandidates.length > 0 ? idCandidates : candidates;

    // Disambiguate using node bounding-box endpoint distance
    let bestIdx = -1;
    let bestDist = Infinity;
    for (const idx of pool) {
      const dist = getEdgeEndpointDistance(endpoints, parsedEdges[idx], nodeBoxes);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    }

    if (bestIdx !== -1 && (bestDist < 50 || idCandidates.length > 0)) {
      return bestIdx;
    }

    return pool[0];
  };

  edgePaths.forEach((path, svgIndex) => {
    const svgLabel = svgLabelTexts[svgIndex];
    const d = path.getAttribute('d');
    const endpoints = d ? extractPathEndpoints(d) : null;

    // 1. Collect unmatched parsed edges with matching label text (only when label container provided a label)
    if (svgLabel !== null) {
      const textCandidates: number[] = [];
      for (let i = 0; i < parsedEdges.length; i++) {
        if (matchedParsed.has(i)) continue;
        if (normalizedParsedLabels[i] === svgLabel) {
          textCandidates.push(i);
        }
      }

      if (textCandidates.length === 1) {
        map.set(svgIndex, textCandidates[0]);
        matchedParsed.add(textCandidates[0]);
        return;
      }

      if (textCandidates.length > 1) {
        const chosen = pickBestAmong(textCandidates, path, endpoints);
        if (chosen !== -1) {
          map.set(svgIndex, chosen);
          matchedParsed.add(chosen);
          return;
        }
      }
    }

    // 2. No label match (e.g. synthetic SVG without edgeLabels): match across all unmatched edges
    const allUnmatched = parsedEdges.map((_, i) => i).filter(i => !matchedParsed.has(i));
    if (allUnmatched.length === 0) return;

    const idMatches = allUnmatched.filter(idx => edgeMatchesPathIdentity(path, parsedEdges[idx]));
    if (idMatches.length > 0) {
      const chosen = pickBestAmong(idMatches, path, endpoints);
      map.set(svgIndex, chosen);
      matchedParsed.add(chosen);
      return;
    }

    let bestMatch = -1;
    let bestDist = Infinity;
    for (const idx of allUnmatched) {
      const dist = getEdgeEndpointDistance(endpoints, parsedEdges[idx], nodeBoxes);
      if (dist < bestDist && dist < 50) {
        bestDist = dist;
        bestMatch = idx;
      }
    }

    const winner = bestMatch !== -1 ? bestMatch : allUnmatched[0];
    map.set(svgIndex, winner);
    matchedParsed.add(winner);
  });

  return map;
}
