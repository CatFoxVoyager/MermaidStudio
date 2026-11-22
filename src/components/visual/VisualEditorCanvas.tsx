import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle } from 'lucide-react';
import { renderDiagram } from '@/lib/mermaid/core';
import { postProcessDiagramSvg } from '@/utils/svgPostProcessing';
import { buildSvgToParsedEdgeMap } from '@/utils/svgEdgeMatching';
import {
  parseDiagram, updateNodeStyle, updateNodeLabel, updateNodeShape,
  addNode, removeNode, addEdge, generateNodeId, getNodeStyle,
  updateEdgeArrowType, updateEdgeLabel, removeEdge,
  updateEdgeMetadata, updateEdgeId, applyEdgeAnimatePreset,
  updateSubgraphView,
  bodyHasUnparsedAtDirective, updateNodeIcon, updateNodeImg,
} from '@/lib/mermaid/codeUtils';
import type { ParsedDiagram, ParsedEdge, IconConfig, ImgConfig, EdgeMetadata } from '@/lib/mermaid/codeUtils';
import { detectDiagramType } from '@/lib/mermaid/diagramType';
import { ShapeToolbar } from './ShapeToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import type { SpecialMediaShape } from '../shared/ShapePicker';
import type { NodeShape, NodeStyle, VisualNode, VisualEdge, SelectionState, ToolMode } from './types';

interface NodeOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SubgraphOverlay {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed?: boolean;
}

function isCollapsedSubgraphGroup(el: Element): boolean {
  return /\bcollapsed-group\b/.test(el.getAttribute('class') ?? '') || el.querySelector('.collapsed-group') !== null;
}

// Node overlays live INSIDE the zoom-scaled wrapper, while getBoundingClientRect()
// returns screen coordinates that the wrapper's `scale(zoom)` has already
// multiplied. Dividing deltas and dimensions by zoom recovers the local
// (un-scaled) coordinates the CSS left/top/width/height need — without this,
// overlays drift away from their nodes by (zoom-1) × distance-from-origin.
export function extractSvgNodes(container: HTMLDivElement, zoom: number): NodeOverlay[] {
  const svg = container.querySelector('svg');
  if (!svg) {return [];}

  // 39-04 (ICON-03, UI-SPEC Surface 4): the selector also matches mermaid
  // 12.3's special-shape groups — measured live DOM (39-04 dom probe): img
  // nodes emit <g class="image-shape default" id="flowchart-<id>-<n>"> and
  // icon nodes <g class="icon-shape default">, carrying NO `node` class, so
  // the plain g.node query missed them entirely. Class-bearer queries only
  // (class substrings over-match — the 39-01 oracle lesson). The id regex
  // below is unchanged: special-shape groups carry the same
  // flowchart-<id>-<n> ids, so selection parity is selector-widening only.
  const nodeElements = svg.querySelectorAll('g.node, g.nodeLabel, g.icon-shape, g.image-shape');
  const overlays: NodeOverlay[] = [];
  const seen = new Set<string>();

  nodeElements.forEach(el => {
    const idAttr = el.id ?? '';
    const flowchartMatch = idAttr.match(/flowchart-([A-Za-z0-9_-]+)-\d+$/);
    const nodeId = flowchartMatch ? flowchartMatch[1] : null;
    if (!nodeId || seen.has(nodeId)) {return;}
    // 40-04 (EDGE-05, UI-SPEC Grey Area 7): a collapsed subgraph wears a
    // node shape inside g.nodes (mermaid places `.collapsed-group` on its
    // child <rect>/<path>, or on the group in mocks) — it IS the subgraph.
    if (isCollapsedSubgraphGroup(el)) {return;}
    seen.add(nodeId);

    try {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      overlays.push({
        id: nodeId,
        x: (rect.left - containerRect.left) / zoom,
        y: (rect.top - containerRect.top) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
      });
    } catch {
      // skip
    }
  });

  return overlays;
}

/**
 * 40-04 (EDGE-05, Grey Area #2): extract minimal subgraph hit-target bands
 * (top-30px label strip for expanded clusters so inner nodes stay clickable;
 * full collapsed box for `.collapsed-group` groups). Bounds stay local to
 * the zoom-scaled SVG wrapper so bands remain viewport/canvas-bounded.
 */
export function extractSvgSubgraphs(
  container: HTMLDivElement,
  zoom: number,
  knownSubgraphIds: string[],
): SubgraphOverlay[] {
  if (knownSubgraphIds.length === 0) {return [];}
  const svg = container.querySelector('svg');
  if (!svg) {return [];}

  const allGs = Array.from(svg.querySelectorAll('g'));
  const candidates = new Map<string, SVGElement>();

  for (const sgId of knownSubgraphIds) {
    const match = allGs.find(g => {
      const id = g.id || '';
      return id === sgId || id.endsWith(`-${sgId}`);
    });
    if (match && match.querySelector('rect')) {
      candidates.set(sgId, match);
      continue;
    }

    const collapsedMatch = allGs.find(g => {
      if (!isCollapsedSubgraphGroup(g)) {return false;}
      const id = g.id || '';
      const flowchartMatch = id.match(/flowchart-([A-Za-z0-9_-]+)-\d+$/);
      return (flowchartMatch !== null && flowchartMatch[1] === sgId) || id === sgId || id.endsWith(`-${sgId}`);
    });
    if (collapsedMatch && collapsedMatch.querySelector('rect')) {
      candidates.set(sgId, collapsedMatch);
    }
  }

  const overlays: SubgraphOverlay[] = [];
  const containerRect = container.getBoundingClientRect();
  for (const [sgId, el] of candidates) {
    const isCollapsed = isCollapsedSubgraphGroup(el);
    const labelText = el.querySelector('.cluster-label text, .nodeLabel text, .label text, text');
    const label = labelText?.textContent ?? sgId;
    try {
      const rect = el.getBoundingClientRect();
      const clusterWidth = rect.width / zoom;
      const clusterHeight = rect.height / zoom;
      overlays.push({
        id: sgId,
        label,
        x: (rect.left - containerRect.left) / zoom,
        y: (rect.top - containerRect.top) / zoom,
        width: clusterWidth,
        height: isCollapsed ? clusterHeight : Math.min(clusterHeight, 30),
        isCollapsed,
      });
    } catch {
      // skip
    }
  }
  return overlays;
}

/**
 * 40-04 (EDGE-05): true when viewport coordinates (clientX, clientY) land
 * inside any rendered `.collapsed-group` group's or rect's bounding box. Drops
 * inside collapsed bounds are no-ops (collapsed internals are hidden from SVG DOM).
 */
function isPointInCollapsedGroup(
  container: HTMLDivElement | null,
  clientX: number,
  clientY: number,
): boolean {
  if (!container) {return false;}
  const groups = container.querySelectorAll('svg g.collapsed-group, svg .collapsed-group');
  for (const group of groups) {
    const r = group.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {continue;}
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return true;
    }
  }
  return false;
}

export interface EdgeOverlay {
  source: string;
  target: string;
  d: string;
}

export interface EdgeLayer {
  edges: EdgeOverlay[];
  svgBox: { left: number; top: number; width: number; height: number } | null;
  viewBox: string | null;
}

// Extract clickable edge hit-targets from the rendered flowchart SVG. Each
// `.edgePaths path.flowchart-link` is matched back to a parsed edge with the
// same endpoint-distance heuristic the PreviewPanel uses (node ids in the SVG
// are sanitized, so the path id `L_<src>_<tgt>_<n>` cannot be split reliably).
export function extractSvgEdges(
  container: HTMLDivElement,
  zoom: number,
  parsedEdges: ParsedEdge[],
): EdgeLayer {
  const svg = container.querySelector('svg');
  if (!svg) {return { edges: [], svgBox: null, viewBox: null };}

  const edgePaths = Array.from(svg.querySelectorAll('.edgePaths path.flowchart-link'));
  if (edgePaths.length === 0) {return { edges: [], svgBox: null, viewBox: null };}
  // Without parsed edges there is nothing to label a hit target with — the
  // order fallback below would index out of bounds.
  if (parsedEdges.length === 0) {return { edges: [], svgBox: null, viewBox: null };}

  const containerRect = container.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const svgBox = {
    left: (svgRect.left - containerRect.left) / zoom,
    top: (svgRect.top - containerRect.top) / zoom,
    width: svgRect.width / zoom,
    height: svgRect.height / zoom,
  };

  const svgToParsed = buildSvgToParsedEdgeMap(svg, parsedEdges, edgePaths);

  const edges: EdgeOverlay[] = [];
  edgePaths.forEach((path, svgIndex) => {
    const d = path.getAttribute('d');
    if (!d) {return;}

    const parsedIdx = svgToParsed.get(svgIndex) ?? Math.min(svgIndex, parsedEdges.length - 1);
    edges.push({ source: parsedEdges[parsedIdx].source, target: parsedEdges[parsedIdx].target, d });
  });

  return { edges, svgBox, viewBox: svg.getAttribute('viewBox') };
}

// Real hit-test at viewport coordinates against the edge overlay's
// hit-paths. Chrome's touch adjustment ("aim assist") can deliver a tap
// that actually lands on an edge to a nearby node overlay instead — the
// visible "clickable" element — with contact coordinates outside that
// overlay's rect; this recovers the edge the user actually tapped.
// Returns the covering hit-path's data-edge-key, or null when nothing
// covers the point (or the geometry APIs are unavailable, e.g. jsdom).
function edgeKeyAtPoint(x: number, y: number): string | null {
  for (const svg of document.querySelectorAll<SVGSVGElement>('svg[data-edge-overlay]')) {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {continue;}
    const ctm = svg.getScreenCTM();
    if (!ctm) {continue;}
    const inv = ctm.inverse();
    const localX = inv.a * x + inv.c * y + inv.e;
    const localY = inv.b * x + inv.d * y + inv.f;
    for (const path of svg.querySelectorAll<SVGPathElement>('path[data-edge-key]')) {
      if (typeof path.isPointInStroke !== 'function') {continue;}
      if (path.isPointInStroke({ x: localX, y: localY })) {
        return path.getAttribute('data-edge-key');
      }
    }
  }
  return null;
}

interface Props {
  content: string;
  theme: 'dark' | 'light';
  themeId?: string;
  onChange: (content: string) => void;
}

// D6 read-only stand-in parse result: the read-only gate short-circuits the
// parse memo so parseDiagram is never invoked for body-metadata content; the
// `parsed` consumers below see an empty structure instead (overlays and the
// properties panel are hidden in read-only mode anyway).
const EMPTY_PARSED: ParsedDiagram = {
  nodes: [],
  edges: [],
  styles: new Map(),
  classDefs: new Map(),
  nodeClasses: new Map(),
  linkStyles: new Map(),
  subgraphs: [],
  linkedDirectives: new Map(),
};

export function VisualEditorCanvas({ content, theme, themeId, onChange }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [overlays, setOverlays] = useState<NodeOverlay[]>([]);
  const [subgraphOverlays, setSubgraphOverlays] = useState<SubgraphOverlay[]>([]);
  const [edgeLayer, setEdgeLayer] = useState<EdgeLayer>({ edges: [], svgBox: null, viewBox: null });
  // Bumped whenever the SVG container becomes visible or changes size, so the
  // overlay-positioning effect re-runs even when the canvas was hidden (e.g.
  // display:none) at mount time — see the container-observer effect below.
  const [visibilityTick, setVisibilityTick] = useState(0);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeKey: null, subgraphId: null });
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [connectFirst, setConnectFirst] = useState<string | null>(null);
  const [dragShape, setDragShape] = useState<NodeShape | null>(null);
  const [dragSpecialShape, setDragSpecialShape] = useState<SpecialMediaShape | null>(null);
  const [pendingSpecialShape, setPendingSpecialShape] = useState<{ nodeId: string; mode: SpecialMediaShape } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  // Drag-to-connect: source anchor (node center) + current pointer position
  // (viewport coords) for the ghost line. The anchor is captured at arm time
  // so rendering never reads a ref. The refs below hold the gesture's
  // working state — the state only exists to render the indicator.
  const [dragConnect, setDragConnect] = useState<
    { sourceId: string; x1: number; y1: number; x: number; y: number } | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const debounceRef = useRef<number>(0);
  const capturedPointerIdsRef = useRef<Set<number>>(new Set());
  // Pointers whose touch events were delivered to a node overlay by
  // Chrome's touch adjustment while really landing on an edge hit-path
  // (see handleNodePointerDown): pointerup must not select the node.
  const adjustedPointerIdsRef = useRef<Set<number>>(new Set());
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchPrevDistanceRef = useRef<number | null>(null);
  // Drag-to-connect: overlay elements by node id (for the pointerup
  // hit-test), the pointerdown origin, and the armed source node id.
  const overlayElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragConnectRef = useRef<string | null>(null);

  // D6 fail-safe (DIA-04), narrowed in Phase 27 to a parse-completeness
  // gate: content whose BODY (outside frontmatter) carries an at-brace line
  // the directive parser cannot fully consume opens read-only. The gate is
  // computed BEFORE the parse memo and short-circuits it, so the regex-based
  // parser is never invoked on un-consumable content — any regeneration-style
  // edit would then corrupt the diagram. Well-formed directive content is
  // editable end-to-end.
  const readOnly = useMemo(() => bodyHasUnparsedAtDirective(content), [content]);
  const isFlowchart = useMemo(() => detectDiagramType(content) === 'flowchart', [content]);

  // Parse once per content change (previously re-parsed on every render, i.e.
  // on every drag/selection state update). Shared with the render pipeline
  // below and the node/edge style helpers.
  const parsed = useMemo(
    () => (readOnly ? EMPTY_PARSED : parseDiagram(content)),
    [content, readOnly],
  );

  const render = useCallback(async () => {
    const id = ++renderIdRef.current;
    setLoading(true);
    const { svg: s, error: e } = await renderDiagram(content, `visual_${id}_${Date.now()}`, themeId);
    if (id !== renderIdRef.current) {return;}
    setLoading(false);
    if (e) { setError(e); return; }
    setError(null);
    if (readOnly) {
      // D6 read-only mode: postProcessDiagramSvg's second argument is the
      // parse result — skipping it keeps the whole parse-based pipeline out
      // of the read-only path. The visual delta is cosmetic fill/ordering
      // polish; acceptable for a degraded read-only view.
      setSvg(s);
      return;
    }
    // Same pipeline as the preview and exports so the visual editor matches.
    setSvg(postProcessDiagramSvg(s, parsed));
  }, [content, themeId, parsed, readOnly]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, 300);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  useEffect(() => {
    if (!svg || !svgContainerRef.current) {return;}
    const container = svgContainerRef.current;
    const timer = setTimeout(() => {
      setOverlays(extractSvgNodes(container, zoom));
      setEdgeLayer(extractSvgEdges(container, zoom, parsed.edges));
      if (isFlowchart && parsed.subgraphs.length > 0) {
        setSubgraphOverlays(extractSvgSubgraphs(container, zoom, parsed.subgraphs.map(s => s.id)));
      } else {
        setSubgraphOverlays([]);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [svg, zoom, visibilityTick, parsed, isFlowchart]);

  // Observe the SVG container for visibility/size changes. When the canvas is
  // mounted inside a hidden (display:none) pane — as MobileWorkspace does for
  // inactive tabs — getBoundingClientRect() returns 0×0 and overlays end up
  // empty. This re-bumps visibilityTick when the pane becomes visible (or
  // resizes), forcing the overlay-positioning effect above to recompute.
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) {return;}

    if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') {
      // jsdom / unsupported environment — skip silently.
      return;
    }

    const intersection = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
            setVisibilityTick(t => t + 1);
          }
        }
      },
      { threshold: 0 },
    );
    intersection.observe(container);

    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setVisibilityTick(t => t + 1);
        }
      }
    });
    resize.observe(container);

    return () => {
      intersection.disconnect();
      resize.disconnect();
    };
  }, [svg]);

  function getVisualNode(id: string): VisualNode | null {
    const node = parsed.nodes.find(n => n.id === id);
    if (!node) {return null;}
    const overlay = overlays.find(o => o.id === id);
    const style = getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, id);
    return {
      id: node.id,
      label: node.label,
      shape: node.shape,
      style,
      x: overlay?.x ?? 0,
      y: overlay?.y ?? 0,
      width: overlay?.width ?? 80,
      height: overlay?.height ?? 40,
      // 39-04 (ICON-03): the parsed media configs ride the visual model so
      // PropertiesPanel derives the media-tab state from typed data.
      icon: node.icon,
      img: node.img,
    };
  }

  const selectedNodes: VisualNode[] = selection.nodeIds.flatMap(id => {
    const n = getVisualNode(id);
    return n ? [n] : [];
  });

  // 39-04: the selection's shared media data for the PropertiesPanel tabs —
  // a config when every selected node carries that kind, null when none
  // does, undefined when the kinds mix (the panel's mixed idiom). Derived
  // from the parsed VisualNode data, never from re-parsing code strings.
  const allIconSel = selectedNodes.length > 0 && selectedNodes.every(n => !!n.icon);
  const allPlainSel = selectedNodes.length > 0 && selectedNodes.every(n => !n.icon && !n.img);
  const allImgSel = !allIconSel && selectedNodes.length > 0 && selectedNodes.every(n => !!n.img);
  const sharedNodeIcon: IconConfig | null | undefined =
    allIconSel ? selectedNodes[0].icon : (allPlainSel || allImgSel) ? null : undefined;
  const sharedNodeImage: ImgConfig | null | undefined =
    allImgSel ? selectedNodes[0].img : (allPlainSel || allIconSel) ? null : undefined;

  const selectedEdge: VisualEdge | null = (() => {
    if (!selection.edgeKey) {return null;}
    const [src, tgt] = selection.edgeKey.split('::');
    const edge = parsed.edges.find(e => e.source === src && e.target === tgt);
    if (!edge) {return null; }
    return {
      source: edge.source,
      target: edge.target,
      arrowType: edge.arrowType,
      label: edge.label,
      // 40-02 (EDGE-03): the inspector rows read the parsed edge's id,
      // length, and typed metadata — never a re-parse of code strings.
      ...(edge.edgeId ? { edgeId: edge.edgeId } : {}),
      ...(edge.length ? { length: edge.length } : {}),
      ...(edge.metadata ? { metadata: edge.metadata } : {}),
    };
  })();

  const selectedSubgraph = selection.subgraphId
    ? parsed.subgraphs.find(s => s.id === selection.subgraphId) ?? null
    : null;

  function handleNodePointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();

    // Chrome's touch adjustment can retarget a tap that really lands on
    // an edge hit-path to the nearest visible clickable element — this
    // node overlay — delivering pointer events whose contact coordinates
    // lie OUTSIDE the overlay's own rect (observed on mobile: a tap on a
    // short A->B edge selected node A instead of the edge). When the
    // contact point is not actually inside this overlay, real-hit-test
    // at the contact coordinates and honor the edge instead.
    if (toolMode !== 'connect' && e.pointerType !== 'mouse') {
      const r = e.currentTarget.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) {
        const adjustedEdgeKey = edgeKeyAtPoint(e.clientX, e.clientY);
        if (adjustedEdgeKey) {
          adjustedPointerIdsRef.current.add(e.pointerId);
          setSelection({ nodeIds: [], edgeKey: adjustedEdgeKey, subgraphId: null });
          return;
        }
      }
    }

    // Capture pointer for reliable gesture tracking
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    capturedPointerIdsRef.current.add(e.pointerId);

    if (toolMode === 'connect') {
      if (!connectFirst) {
        setConnectFirst(nodeId);
        return;
      }
      // D6 belt-and-braces: read-only content never reaches a codeUtils mutator.
      if (!readOnly && connectFirst !== nodeId) {
        onChange(addEdge(content, connectFirst, nodeId));
      }
      setConnectFirst(null);
      setToolMode('select');
      return;
    }

    // Drag-to-connect candidate: remember where the gesture started so
    // pointermove can arm the drag past the threshold. Connect mode has
    // already returned above — its click-click flow is untouched.
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    // Start long-press timer for touch multi-select (500ms)
    if (e.pointerType === 'touch') {
      const timer = setTimeout(() => {
        setSelection(s => ({
          nodeIds: s.nodeIds.includes(nodeId) ? s.nodeIds.filter(id => id !== nodeId) : [...s.nodeIds, nodeId],
          edgeKey: null,
          subgraphId: null,
        }));
      }, 500);
      setLongPressTimer(timer);
    }

    // Handle multi-select on Shift key (mouse) or immediate select for non-touch
    if (e.shiftKey && e.pointerType === 'mouse') {
      setSelection(s => ({
        nodeIds: s.nodeIds.includes(nodeId) ? s.nodeIds.filter(id => id !== nodeId) : [...s.nodeIds, nodeId],
        edgeKey: null,
        subgraphId: null,
      }));
    } else if (e.pointerType === 'mouse') {
      setSelection({ nodeIds: [nodeId], edgeKey: null, subgraphId: null });
    }
    // For touch, wait to see if it becomes a long-press (multi-select) or tap (single-select)
  }

  const DRAG_CONNECT_THRESHOLD_PX = 6;

  function resetDragConnect() {
    dragStartRef.current = null;
    dragConnectRef.current = null;
    setDragConnect(null);
  }

  function handleNodePointerMove(e: React.PointerEvent, nodeId: string) {
    // Not a drag candidate (no recent pointerdown on this overlay)
    if (!dragStartRef.current && !dragConnectRef.current) {return;}

    if (dragConnectRef.current) {
      // Armed: follow the pointer with the ghost line.
      setDragConnect(prev => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
      return;
    }

    const start = dragStartRef.current;
    if (!start) {return;}
    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (distance <= DRAG_CONNECT_THRESHOLD_PX) {return;}

    // Past the threshold: arm the drag. The long-press timer is cancelled
    // so a touch drag never fires the 500ms multi-select, and the click
    // interpretation of this gesture is over. The ghost line anchors on the
    // source node's center, read here in the handler (render must not
    // touch refs).
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragStartRef.current = null;
    dragConnectRef.current = nodeId;
    setDragConnect({
      sourceId: nodeId,
      x1: r.left + r.width / 2,
      y1: r.top + r.height / 2,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function handleNodePointerCancel(e: React.PointerEvent) {
    if (dragConnectRef.current || dragStartRef.current) {
      resetDragConnect();
    }
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }

  function handleNodePointerUp(e: React.PointerEvent, nodeId: string) {
    const target = e.currentTarget as HTMLElement;

    // Touch-adjustment guard: the pointerdown was really an edge tap —
    // the edge is already selected, so the tap-completion path below
    // must not select this node.
    if (adjustedPointerIdsRef.current.has(e.pointerId)) {
      adjustedPointerIdsRef.current.delete(e.pointerId);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      return;
    }

    // Release pointer capture
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }

    // Drag-to-connect drop: hit-test the release point against every other
    // node overlay (pointer capture kept the events flowing to this
    // overlay, so the coordinates are plain viewport clientX/Y). A completed
    // drag never re-selects — early return skips the tap flow below.
    if (dragConnectRef.current) {
      if (isPointInCollapsedGroup(svgContainerRef.current, e.clientX, e.clientY)) {
        resetDragConnect();
        return;
      }
      const sourceId = dragConnectRef.current;
      let targetId: string | null = null;
      for (const [id, el] of overlayElsRef.current) {
        if (id === sourceId) {continue;}
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          targetId = id;
          break;
        }
      }
      // D6 belt-and-braces: read-only content never reaches a codeUtils mutator.
      if (targetId && !readOnly) {
        onChange(addEdge(content, sourceId, targetId));
      }
      resetDragConnect();
      return;
    }
    dragStartRef.current = null;

    // Clear long-press timer if still active (means it was a tap, not long-press)
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);

      // For touch, if timer was cleared it means it was a short tap - single select
      if (e.pointerType === 'touch') {
        setSelection({ nodeIds: [nodeId], edgeKey: null, subgraphId: null });
      }
    }
  }

  function handleCanvasPointerDown(e: React.PointerEvent) {
    // Never capture pointers that start on toolbar controls: capturing
    // retargets the browser's synthetic click to the capture element (this
    // canvas), so the button's own onClick never fires — the zoom buttons
    // were dead in-browser. Pinch/gesture tracking only matters on the
    // diagram itself.
    if ((e.target as Element).closest?.('button')) {return;}

    // Capture pointer for reliable gesture tracking
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    capturedPointerIdsRef.current.add(e.pointerId);

    // Record pointer for pinch detection
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // If we now have 2 pointers, initialize pinch gesture
    if (activePointersRef.current.size === 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchPrevDistanceRef.current = distance;

      // Skip normal canvas behavior when pinch starts
      return;
    }

    // Normal single-pointer behavior
    if (toolMode === 'connect') {
      setConnectFirst(null);
      return;
    }
    setSelection({ nodeIds: [], edgeKey: null, subgraphId: null });
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    // Only process moves for tracked pointers
    if (!activePointersRef.current.has(e.pointerId)) return;

    // Update pointer position
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle pinch-zoom when exactly 2 pointers are active
    if (activePointersRef.current.size === 2 && pinchPrevDistanceRef.current !== null) {
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      // Calculate zoom delta from distance change
      const zoomDelta = currentDistance / pinchPrevDistanceRef.current;

      // Apply zoom with existing clamp (0.25..3)
      setZoom(z => Math.max(0.25, Math.min(3, z * zoomDelta)));

      // Update previous distance for next frame
      pinchPrevDistanceRef.current = currentDistance;

      // Prevent default during active pinch (avoid browser zoom competition)
      e.preventDefault();
    }
  }

  function handleCanvasPointerUp(e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;

    // Release pointer capture
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }

    // Remove pointer from active tracking
    activePointersRef.current.delete(e.pointerId);

    // Reset pinch state when we drop below 2 pointers
    if (activePointersRef.current.size < 2) {
      pinchPrevDistanceRef.current = null;
    }
  }

  function handleCanvasPointerCancel(e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;

    // Release pointer capture on cancel
    if (capturedPointerIdsRef.current.has(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }

    // Remove pointer from active tracking
    activePointersRef.current.delete(e.pointerId);

    // Reset pinch state when we drop below 2 pointers
    if (activePointersRef.current.size < 2) {
      pinchPrevDistanceRef.current = null;
    }
  }

  // D6 belt-and-braces: every edit callback below early-returns in read-only
  // mode so no path can hand body-metadata content to a codeUtils mutator —
  // the affordance hiding in the JSX is the first fence, these are the second.

  // 39-04 (ICON-03, T-39-09): media & shape mutations route ONLY through
  // codeUtils mutators, behind the same readOnly guard as every sibling
  // handler. The ref chains synchronous calls (e.g. clearing icon/img then
  // applying a geometric shape in one click) without lost updates.
  const mediaContentRef = useRef(content);
  useEffect(() => {
    mediaContentRef.current = content;
  }, [content]);

  function handleAddShape(shape: NodeShape) {
    if (readOnly) {return;}
    const id = generateNodeId(parsed.nodes.map(n => n.id));
    const result = addNode(content, id, 'New Node', shape);
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
    setSelection({ nodeIds: [id], edgeKey: null, subgraphId: null });
  }

  function handleAddSpecialShape(kind: SpecialMediaShape) {
    if (readOnly) {return;}
    const id = generateNodeId(parsed.nodes.map(n => n.id));
    let result = addNode(content, id, 'New Node', 'rect');
    if (kind === 'icon') {
      result = updateNodeIcon(result, id, { icon: 'fa:star' });
      setPendingSpecialShape(null);
    } else {
      setPendingSpecialShape({ nodeId: id, mode: 'img' });
    }
    mediaContentRef.current = result;
    onChange(result);
    setSelection({ nodeIds: [id], edgeKey: null, subgraphId: null });
  }

  function handleDropOnCanvas(e: React.DragEvent) {
    e.preventDefault();
    if (readOnly || (!dragShape && !dragSpecialShape)) {return;}
    if (isPointInCollapsedGroup(svgContainerRef.current, e.clientX, e.clientY)) {
      setDragShape(null);
      setDragSpecialShape(null);
      return;
    }
    if (dragSpecialShape) {
      handleAddSpecialShape(dragSpecialShape);
      setDragSpecialShape(null);
      return;
    }
    if (dragShape) {
      handleAddShape(dragShape);
      setDragShape(null);
    }
  }

  function handleDeleteSelected() {
    if (readOnly) {return;}
    let updated = content;
    selection.nodeIds.forEach(id => { updated = removeNode(updated, id); });
    setSelection({ nodeIds: [], edgeKey: null, subgraphId: null });
    onChange(updated);
  }

  function handleLabelChange(id: string, label: string) {
    if (readOnly) {return;}
    onChange(updateNodeLabel(content, id, label));
  }

  function handleShapeChange(id: string, shape: NodeShape) {
    if (readOnly) {return;}
    const result = updateNodeShape(mediaContentRef.current, id, shape);
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
  }

  function handleIconChange(nodeIds: string[], icon: IconConfig | null) {
    if (readOnly) {return;}
    let result = mediaContentRef.current;
    for (const id of nodeIds) {result = updateNodeIcon(result, id, icon);}
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
  }
  function handleImageChange(nodeIds: string[], img: ImgConfig | null) {
    if (readOnly) {return;}
    let result = mediaContentRef.current;
    for (const id of nodeIds) {result = updateNodeImg(result, id, img);}
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
  }

  function handleStyleChange(id: string, style: NodeStyle) {
    if (readOnly) {return;}
    onChange(updateNodeStyle(content, id, style));
  }

  // 38-03 (SHP-06): every edge mutation is a thin readOnly-guarded delegate
  // to the codeUtils mutator — the duplicated inline regex/filter bodies are
  // deleted, so the canvas has exactly one edge-mutation vocabulary. The
  // mutators are chain-aware (bare 12.3 edge ids, multi-hop) and decline on
  // ambiguity, which the inline regexes silently mishandled.
  function handleArrowChange(source: string, target: string, arrowType: string) {
    if (readOnly) {return;}
    // 40-02: the family switch preserves the selected edge's authored length
    // (the length row owns length edits — picking a family never resets it).
    const current = selectedEdge;
    const length = current && current.source === source && current.target === target
      ? (current.length ?? 1)
      : 1;
    onChange(updateEdgeArrowType(content, source, target, arrowType, length));
  }

  function handleEdgeLabelChange(source: string, target: string, label: string) {
    if (readOnly) {return;}
    onChange(updateEdgeLabel(content, source, target, label));
  }

  // 40-02 (EDGE-03): the inspector's edge-row delegates — the ONLY write
  // paths are the codeUtils mutators (one vocabulary, like the 38-03 rule).
  function handleEdgeMetaChange(meta: EdgeMetadata) {
    if (readOnly) {return;}
    const edge = selectedEdge;
    if (!edge?.edgeId) {return;}
    onChange(updateEdgeMetadata(content, edge.edgeId, meta));
  }

  function handleEdgeIdChange(newId: string) {
    if (readOnly) {return;}
    const edge = selectedEdge;
    if (!edge?.edgeId) {return;}
    onChange(updateEdgeId(content, edge.edgeId, newId));
  }

  function handleEdgeLengthChange(token: string, length: number) {
    if (readOnly) {return;}
    const edge = selectedEdge;
    if (!edge) {return;}
    onChange(updateEdgeArrowType(content, edge.source, edge.target, token, length));
  }

  function handleAnimatePreset() {
    if (readOnly) {return;}
    const edge = selectedEdge;
    if (!edge) {return;}
    onChange(applyEdgeAnimatePreset(content, edge.source, edge.target));
  }

  function handleDeleteEdge(source: string, target: string) {
    if (readOnly) {return;}
    onChange(removeEdge(content, source, target));
    setSelection({ nodeIds: [], edgeKey: null, subgraphId: null });
  }

  function handleSubgraphViewChange(view: 'collapsed' | 'expanded') {
    if (readOnly || !selection.subgraphId) {return;}
    onChange(updateSubgraphView(content, selection.subgraphId, view));
  }

  useEffect(() => {
    // Same editable-target fence as useKeyboardShortcuts and the PreviewPanel
    // handler: INPUT/TEXTAREA/SELECT plus contenteditable targets. The code
    // pane (CodeMirror) stays mounted next to this canvas and its editing
    // surface carries contenteditable="true" (@codemirror/view sets it on the
    // content DOM), so a visual selection persisting into a typing context
    // must not be mutated by these window-level shortcuts.
    function isEditableTarget(el: Element | null): boolean {
      if (!el) {return false;}
      const t = el as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') {return true;}
      if (t.isContentEditable) {return true;}
      return typeof t.closest === 'function' && t.closest('input, textarea, [contenteditable]') !== null;
    }
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.nodeIds.length > 0) {
        if (isEditableTarget(document.activeElement)) {return;}
        e.preventDefault();
        handleDeleteSelected();
      }
      if (e.key === 'v' || e.key === 'V') {
        if (isEditableTarget(document.activeElement)) {return;}
        setToolMode('select');
      }
      if (e.key === 'c' || e.key === 'C') {
        if (isEditableTarget(document.activeElement)) {return;}
        if (e.ctrlKey || e.metaKey) {return;}
        if (!readOnly) {setToolMode('connect');}
      }
      if (e.key === 'Escape') {
        setConnectFirst(null);
        setToolMode('select');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, readOnly]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!readOnly && (
        <ShapeToolbar
          toolMode={toolMode}
          onToolMode={m => { setToolMode(m); setConnectFirst(null); }}
          onAddShape={handleAddShape}
          onDragStart={shape => setDragShape(shape)}
          onAddSpecialShape={handleAddSpecialShape}
          onDragStartSpecial={shape => setDragSpecialShape(shape)}
          onDeleteSelected={handleDeleteSelected}
          hasSelection={selection.nodeIds.length > 0}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative overflow-auto preview-grid"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnCanvas}
          style={{ cursor: toolMode === 'connect' ? 'crosshair' : 'default', touchAction: 'none' }}>

          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg border shadow-xs"
            style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
            {loading && <RefreshCw size={11} className="animate-spin mr-1" style={{ color: 'var(--text-tertiary)' }} />}
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              className="p-1 rounded-sm transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-tertiary)' }} title="Zoom out">
              <ZoomOut size={11} />
            </button>
            <span className="text-[11px] w-7 text-center" style={{ color: 'var(--text-secondary)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="p-1 rounded-sm transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-tertiary)' }} title="Zoom in">
              <ZoomIn size={11} />
            </button>
            <button onClick={() => setZoom(1)}
              className="p-1 rounded-sm transition-colors hover:bg-[var(--hover)]" style={{ color: 'var(--text-tertiary)' }} title="Reset zoom">
              <Maximize2 size={11} />
            </button>
          </div>

          {readOnly && (
            <div
              data-testid="visual-editor-readonly"
              aria-live="polite"
              className="absolute top-2 left-2 z-10 px-2 py-1 rounded-lg border text-[11px] font-medium"
              style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              {'Read-only — v12 metadata syntax (@{...}) cannot be edited here'}
            </div>
          )}

          {toolMode === 'connect' && !readOnly && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{ background: 'var(--accent-dim)', borderColor: 'rgba(var(--accent-rgb),0.3)', color: 'var(--accent)' }}>
              {connectFirst
                ? `Click target node to connect from "${connectFirst}"`
                : 'Click first node to start connection (Esc to cancel)'}
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Parse Error</p>
              <p className="text-xs font-mono max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {error.split('\n')[0]}
              </p>
            </div>
          ) : (
            <div className="min-h-full flex items-center justify-center p-8">
              <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
                {/* Safe sink: `svg` was sanitized by renderDiagram (DOMPurify) and
                    the post-processing pipeline only mutates attributes via DOM APIs. */}
                <div
                  ref={svgContainerRef}
                  className="mermaid-container"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />

                {!readOnly && isFlowchart && subgraphOverlays.map(sg => {
                  const isSelected = selection.subgraphId === sg.id;
                  const isConnectSource = sg.id === connectFirst;
                  return (
                    <div
                      key={`sg-${sg.id}`}
                      data-subgraph-id={sg.id}
                      onPointerDown={e => {
                        e.stopPropagation();
                        if (toolMode === 'connect') {
                          if (!connectFirst) {
                            setConnectFirst(sg.id);
                            return;
                          }
                          if (!readOnly && connectFirst !== sg.id) {
                            onChange(addEdge(content, connectFirst, sg.id));
                          }
                          setConnectFirst(null);
                          setToolMode('select');
                          return;
                        }
                        setSelection({ nodeIds: [], edgeKey: null, subgraphId: sg.id });
                      }}
                      className={`visual-subgraph-overlay ${isSelected ? 'selected' : ''} ${isConnectSource ? 'connect-source' : ''}`}
                      style={{
                        position: 'absolute',
                        left: sg.x,
                        top: sg.y,
                        width: sg.width,
                        height: sg.height,
                        cursor: toolMode === 'connect' ? 'crosshair' : 'pointer',
                        zIndex: 9,
                        background: isConnectSource ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                        border: isSelected ? '2px solid var(--accent)' : isConnectSource ? '2px dashed var(--accent)' : '2px solid transparent',
                        borderRadius: '4px',
                      }}
                      title={sg.label}
                    />
                  );
                })}

                {!readOnly && overlays.map(overlay => {
                  const isSelected = selection.nodeIds.includes(overlay.id);
                  const isConnectSource = overlay.id === connectFirst;
                  return (
                    <div
                      key={overlay.id}
                      ref={el => {
                        if (el) {overlayElsRef.current.set(overlay.id, el);}
                        else {overlayElsRef.current.delete(overlay.id);}
                      }}
                      onPointerDown={e => handleNodePointerDown(e, overlay.id)}
                      onPointerMove={e => handleNodePointerMove(e, overlay.id)}
                      onPointerUp={e => handleNodePointerUp(e, overlay.id)}
                      onPointerCancel={handleNodePointerCancel}
                      className={`visual-node-overlay ${isSelected ? 'selected' : ''} ${isConnectSource ? 'connect-source' : ''}`}
                      style={{
                        position: 'absolute',
                        left: overlay.x,
                        top: overlay.y,
                        width: overlay.width,
                        height: overlay.height,
                        cursor: toolMode === 'connect' ? 'crosshair' : 'pointer',
                        zIndex: 10,
                      }}
                      title={overlay.id}
                    />
                  );
                })}

                {/* Edge hit-targets: transparent 15px-wide strokes above each
                    flowchart-link path (same pattern as PreviewPanel). Rendered
                    inside the scaled wrapper so zoom applies to the overlay the
                    same way it applies to the SVG beneath it. */}
                {!readOnly && edgeLayer.svgBox && edgeLayer.edges.length > 0 && (
                  <svg
                    data-edge-overlay=""
                    className="visual-edge-overlay"
                    style={{
                      position: 'absolute',
                      left: edgeLayer.svgBox.left,
                      top: edgeLayer.svgBox.top,
                      width: edgeLayer.svgBox.width,
                      height: edgeLayer.svgBox.height,
                      zIndex: 10,
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                    viewBox={edgeLayer.viewBox ?? undefined}
                  >
                    {edgeLayer.edges.map((edge, i) => {
                      const edgeKey = `${edge.source}::${edge.target}`;
                      const isSelected = selection.edgeKey === edgeKey;
                      return (
                        <g key={`${edgeKey}#${i}`}>
                          {isSelected && (
                            <path
                              d={edge.d}
                              stroke="var(--accent)"
                              strokeWidth={3}
                              fill="none"
                              data-selected-edge="true"
                              pointerEvents="none"
                            />
                          )}
                          <path
                            d={edge.d}
                            stroke="transparent"
                            strokeWidth={15}
                            fill="none"
                            data-edge-key={edgeKey}
                            style={{
                              pointerEvents: 'stroke',
                              cursor: toolMode === 'connect' ? 'crosshair' : 'pointer',
                            }}
                            onPointerDown={e => {
                              // In connect mode the click must fall through to
                              // the canvas so it cancels a pending connectFirst —
                              // return BEFORE stopPropagation (same contract as
                              // the PreviewPanel edge targets).
                              if (toolMode === 'connect') {return;}
                              e.stopPropagation();
                              setSelection({ nodeIds: [], edgeKey: edgeKey, subgraphId: null });
                            }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="shrink-0 overflow-hidden transition-all duration-200"
            style={{ width: 220 }}>
            <PropertiesPanel
              selectedNodes={selectedNodes}
              selectedEdge={selectedEdge}
              onLabelChange={handleLabelChange}
              onShapeChange={handleShapeChange}
              onStyleChange={handleStyleChange}
              nodeIcon={sharedNodeIcon}
              nodeImage={sharedNodeImage}
              onIconChange={handleIconChange}
              onImageChange={handleImageChange}
              initialMediaMode={
                selection.nodeIds.length === 1 && pendingSpecialShape?.nodeId === selection.nodeIds[0]
                  ? pendingSpecialShape.mode
                  : null
              }
              onArrowChange={handleArrowChange}
              onEdgeLabelChange={handleEdgeLabelChange}
              onDeleteEdge={handleDeleteEdge}
              onEdgeMetaChange={handleEdgeMetaChange}
              onEdgeIdChange={handleEdgeIdChange}
              onEdgeLengthChange={handleEdgeLengthChange}
              onAnimatePreset={handleAnimatePreset}
              selectedSubgraphId={selectedSubgraph?.id ?? null}
              selectedSubgraphLabel={selectedSubgraph?.label}
              subgraphView={selectedSubgraph?.view}
              onViewChange={selectedSubgraph ? handleSubgraphViewChange : undefined}
            />
          </div>
        )}
      </div>

      {/* Drag-to-connect ghost line: fixed overlay in viewport coordinates,
          matching the clientX/Y the gesture tracks. Non-interactive. */}
      {dragConnect && (
        <svg
          data-testid="drag-connect-indicator"
          aria-hidden="true"
          width="100%"
          height="100%"
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
          <line
            x1={dragConnect.x1} y1={dragConnect.y1} x2={dragConnect.x} y2={dragConnect.y}
            stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 4" />
          <circle cx={dragConnect.x} cy={dragConnect.y} r={4} fill="var(--accent)" />
        </svg>
      )}
    </div>
  );
}
