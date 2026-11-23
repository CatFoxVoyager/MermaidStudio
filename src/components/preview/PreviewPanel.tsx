import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Copy, Check, Download, Scan, Group, Hand } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { extractThemeIdFromContent } from '@/constants/themeDerivation';
import { getThemeById } from '@/constants/themes';
import { sanitizeCssValue } from '@/utils/sanitization';
import * as svgPostProcessing from '@/utils/svgPostProcessing';
import { buildSvgToParsedEdgeMap } from '@/utils/svgEdgeMatching';
import { parseDiagram, getNodeStyle, removeNodeStyles, parseFrontmatter, updateLinkStyle, removeLinkStyles, updateEdgeArrowType, updateEdgeLabel, assignOrUpdateEdgeId, upsertEdgeMetadataAtIndex, applyEdgeAnimatePreset, parseLinkStyles, edgeStyleToString, updateNodeStyle, updateNodeShape, addNode, addEdge, generateNodeId, removeNode, removeEdge, removeSubgraph, updateNodeLabel, updateSubgraphLabel, updateSubgraphView, addSubgraph, moveNodeToSubgraph, applyNodePreset, updatePresetColors, bodyHasUnparsedAtDirective, updateNodeIcon, updateNodeImg } from '@/lib/mermaid/codeUtils';
import type { NodeStyle, EdgeStyle, EdgeMetadata, ParsedEdge, NodeShape, PresetType, PresetColors, IconConfig, ImgConfig } from '@/lib/mermaid/codeUtils';
import { shapeSupportsBorderRadius } from '@/lib/mermaid/shapes';
import { NodeStylePanel } from './NodeStylePanel';
import { EdgeStylePanel } from './EdgeStylePanel';
import { SubgraphStylePanel } from './SubgraphStylePanel';
import { ShapeToolbar } from '../visual/ShapeToolbar';
import type { SpecialMediaShape } from '../shared/ShapePicker';
import { getStylingCapabilities } from '@/types';
import { DIAGRAM_LABELS } from '@/constants/diagramLabels';

interface NodeOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SubgraphOverlay {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  clusterX: number;
  clusterY: number;
  clusterWidth: number;
  clusterHeight: number;
  isCollapsed?: boolean;
}

const RENDER_DEBOUNCE_MS = 95;
const FLOWCHART_NODE_ID_RE = /flowchart-([A-Za-z0-9_-]+)-\d+$/;
const COLLAPSED_GROUP_RE = /\bcollapsed-group\b/;
const EMPTY_NODE_PANEL_DATA: {
  panelLabels: Map<string, string>;
  basePanelStyles: Map<string, NodeStyle>;
  nodeSubgraphIds: Map<string, string | null>;
} = {
  panelLabels: new Map(),
  basePanelStyles: new Map(),
  nodeSubgraphIds: new Map(),
};
const EMPTY_SUBGRAPH_LIST: Array<{ id: string; label: string }> = [];
const SHADOW_CENTERING_CSS = `
  foreignObject {
    overflow: visible;
    pointer-events: none !important;
  }

  foreignObject > div {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    width: 100% !important;
    text-align: center !important;
    pointer-events: auto !important;
  }

  .nodeLabel,
  .cluster-label,
  .label {
    text-align: center !important;
    line-height: 1.3;
  }

  .nodeLabel p {
    margin: 0;
    line-height: 1.35;
  }

  /* Ensure containers don't block clicks to elements behind them */
  .cluster-label {
    pointer-events: none !important;
  }

  /* Subgraph label centering (SVG text fallback) */
  .cluster-label text,
  .label text {
    dominant-baseline: hanging !important;
    text-anchor: middle !important;
    y: 0 !important;
  }
`;

interface RenderedSnapshot {
  svg: string;
  renderId: number;
  content: string;
  parsedDiagram: ReturnType<typeof parseDiagram>;
  supportsVisualEditing: boolean;
}

function isCollapsedSubgraphGroup(el: Element): boolean {
  const cls = el.getAttribute('class');
  if (cls && cls.includes('collapsed-group') && COLLAPSED_GROUP_RE.test(cls)) {
    return true;
  }
  return el.querySelector('.collapsed-group') !== null;
}

function extractSvgNodes(
  svg: SVGSVGElement,
  offsetX: number,
  offsetY: number,
  hasCollapsedGroups: boolean,
): NodeOverlay[] {
  // 39-04 (ICON-03, UI-SPEC Surface 4): widened to mermaid 12.3's
  // special-shape groups — measured live DOM: img nodes emit
  // <g class="image-shape default" id="flowchart-<id>-<n>"> and icon nodes
  // <g class="icon-shape default"> with NO `node` class, so g.node missed
  // them. Identical widening to VisualEditorCanvas.extractSvgNodes (parity
  // means identical); the flowchart id regex below is unchanged.
  const nodeElements = svg.querySelectorAll('g.node, g.nodeLabel, g.icon-shape, g.image-shape');
  const overlays: NodeOverlay[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < nodeElements.length; i++) {
    const el = nodeElements[i];
    const idAttr = el.id ?? '';
    const flowchartMatch = FLOWCHART_NODE_ID_RE.exec(idAttr);
    const nodeId = flowchartMatch ? flowchartMatch[1] : null;
    if (!nodeId || seen.has(nodeId)) {continue;}
    // 40-04 (EDGE-05, UI-SPEC Grey Area 7): a collapsed subgraph wears a
    // node shape inside g.nodes (mermaid puts `.collapsed-group` on its
    // child <rect>/<path>, or on the group itself in mocks) — it IS the
    // subgraph, never a node. Excluded here so no node overlay can attach.
    if (hasCollapsedGroups && isCollapsedSubgraphGroup(el)) {continue;}
    seen.add(nodeId);

    try {
      const rect = el.getBoundingClientRect();
      overlays.push({
        id: nodeId,
        x: rect.left + offsetX,
        y: rect.top + offsetY,
        width: rect.width,
        height: rect.height,
      });
    } catch {
      // skip
    }
  }

  return overlays;
}

function extractSubgraphOverlays(
  svg: SVGSVGElement,
  offsetX: number,
  offsetY: number,
  knownSubgraphIds: string[],
  hasCollapsedGroups: boolean,
): SubgraphOverlay[] {
  if (knownSubgraphIds.length === 0) return [];

  const knownSet = new Set(knownSubgraphIds);
  const remainingRegular = new Set(knownSet);
  const remainingCollapsed = hasCollapsedGroups ? new Set(knownSet) : null;
  const firstRegularMatch = new Map<string, SVGGElement>();
  const firstCollapsedMatch = hasCollapsedGroups ? new Map<string, SVGGElement>() : null;

  // Mermaid v11 often uses class "node" for subgraphs, and ID format is "preview_N_TIMESTAMP-subgraphId"
  // Match known subgraph IDs in a single pass over g[id] without splitting on '-' (IDs may contain hyphens).
  const allGs = svg.querySelectorAll<SVGGElement>('g[id]');
  for (let i = 0; i < allGs.length; i++) {
    if (remainingRegular.size === 0 && (!remainingCollapsed || remainingCollapsed.size === 0)) {
      break;
    }
    const g = allGs[i];
    const id = g.id;
    if (!id) continue;

    if (remainingRegular.size > 0) {
      for (const sgId of remainingRegular) {
        if (id === sgId || id.endsWith(`-${sgId}`)) {
          firstRegularMatch.set(sgId, g);
          remainingRegular.delete(sgId);
        }
      }
    }

    // 40-04 (EDGE-05, UI-SPEC Grey Area 7): a collapsed subgraph renders as
    // a NODE-shaped group carrying `.collapsed-group` (on the group or its
    // container rect/path) with the flowchart-<id>-<n> id family —
    // classified as a SUBGRAPH hit here so its click target routes to the
    // subgraph panel and the Expand toggle stays reachable.
    if (remainingCollapsed && remainingCollapsed.size > 0 && isCollapsedSubgraphGroup(g)) {
      const flowchartMatch = FLOWCHART_NODE_ID_RE.exec(id);
      const flowchartId = flowchartMatch ? flowchartMatch[1] : null;
      for (const sgId of remainingCollapsed) {
        if (flowchartId === sgId || id === sgId || id.endsWith(`-${sgId}`)) {
          firstCollapsedMatch!.set(sgId, g);
          remainingCollapsed.delete(sgId);
        }
      }
    }
  }

  const overlays: SubgraphOverlay[] = [];
  for (const sgId of knownSet) {
    const regular = firstRegularMatch.get(sgId);
    let el: SVGGElement | undefined;
    if (regular && regular.querySelector('rect')) {
      el = regular;
    } else if (firstCollapsedMatch) {
      const collapsed = firstCollapsedMatch.get(sgId);
      if (collapsed && collapsed.querySelector('rect')) {
        el = collapsed;
      }
    }
    if (!el) continue;

    // 40-04 (EDGE-05): a collapsed-group hit covers the WHOLE shape — the
    // top-30px label-strip strategy has no separate label area on the
    // node-shaped collapsed form.
    const isCollapsed = hasCollapsedGroups ? isCollapsedSubgraphGroup(el) : false;
    // Try different selectors for label text depending on Mermaid version
    const labelText = el.querySelector('.cluster-label text, .nodeLabel text, .label text, text');
    const label = labelText?.textContent ?? sgId;

    try {
      const rect = el.getBoundingClientRect();

      const clusterX = rect.left + offsetX;
      const clusterY = rect.top + offsetY;
      const clusterWidth = rect.width;
      const clusterHeight = rect.height;

      // Click target for the label area (Strategy: use the top part of the cluster)
      const x = clusterX;
      const y = clusterY;
      const width = clusterWidth;
      const height = isCollapsed ? clusterHeight : Math.min(clusterHeight, 30); // Use top 30px as label area

      overlays.push({ id: sgId, label, x, y, width, height, clusterX, clusterY, clusterWidth, clusterHeight, isCollapsed });
    } catch {
      // skip
    }
  }

  return overlays;
}

function addEdgeClickTargets(
  shadowHost: HTMLDivElement,
  containerEl: HTMLDivElement,
  onEdgeClick: (index: number) => void,
  parsedEdges: ParsedEdge[],
  isConnectMode: () => boolean,
): () => void {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return () => {};

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return () => {};

  const edgePaths = Array.from(svg.querySelectorAll('.edgePaths path.flowchart-link'));
  if (edgePaths.length === 0) return () => {};

  const svgToParsedIndex = buildSvgToParsedEdgeMap(svg, parsedEdges, edgePaths);

  // Create an overlay SVG in the main DOM (above node overlays which have z-index: 5)
  const svgRect = svg.getBoundingClientRect();
  const containerRect = containerEl.getBoundingClientRect();
  const viewBox = svg.getAttribute('viewBox');

  const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.setAttribute('data-edge-overlay', 'true');
  overlaySvg.style.position = 'absolute';
  overlaySvg.style.left = `${svgRect.left - containerRect.left}px`;
  overlaySvg.style.top = `${svgRect.top - containerRect.top}px`;
  overlaySvg.style.width = `${svgRect.width}px`;
  overlaySvg.style.height = `${svgRect.height}px`;
  overlaySvg.style.zIndex = '10';
  overlaySvg.style.pointerEvents = 'none';
  overlaySvg.style.overflow = 'visible';
  if (viewBox) {
    overlaySvg.setAttribute('viewBox', viewBox);
  }

  edgePaths.forEach((path, svgIndex) => {
    const d = path.getAttribute('d');
    if (!d) return;

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '15');
    hitPath.setAttribute('fill', 'none');
    hitPath.style.pointerEvents = 'stroke';
    hitPath.style.cursor = 'pointer';

    // Use the mapped parsed edge index instead of SVG index
    const parsedIndex = svgToParsedIndex.get(svgIndex) ?? Math.min(svgIndex, Math.max(0, parsedEdges.length - 1));
    hitPath.setAttribute('data-edge-index', String(parsedIndex));

    overlaySvg.appendChild(hitPath);
  });

  const handleOverlayClick = (e: MouseEvent) => {
    const hitEl = e.target instanceof Element ? e.target.closest('[data-edge-index]') : null;
    if (!hitEl) return;
    // In connect mode the click must fall through to the canvas so it can
    // cancel a pending connectFirst — return BEFORE stopPropagation, or the
    // 15px-wide hit path silently swallows every connect-mode click.
    if (isConnectMode()) return;
    e.stopPropagation();
    e.preventDefault();
    const parsedIndex = Number(hitEl.getAttribute('data-edge-index'));
    if (!Number.isNaN(parsedIndex)) {
      onEdgeClick(parsedIndex);
    }
  };

  overlaySvg.addEventListener('click', handleOverlayClick);
  containerEl.appendChild(overlaySvg);
  return () => {
    overlaySvg.removeEventListener('click', handleOverlayClick);
    overlaySvg.remove();
  };
}

export function highlightSelectedEdge(shadowHost: HTMLDivElement, edgeIndex: number | null, parsedEdges: ParsedEdge[]) {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return;

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return;

  const edgePaths = Array.from(svg.querySelectorAll('.edgePaths path.flowchart-link'));
  if (edgePaths.length === 0) return;
  if (edgeIndex === null) {
    // Clear all selections
    edgePaths.forEach((path) => {
      (path as SVGPathElement).removeAttribute('data-selected-edge');
      (path as SVGPathElement).style.filter = '';
    });
    return;
  }

  const svgToParsed = buildSvgToParsedEdgeMap(svg, parsedEdges, edgePaths);
  let matchingSvgIndex = -1;
  svgToParsed.forEach((parsedIdx, svgIdx) => {
    if (parsedIdx === edgeIndex && matchingSvgIndex === -1) {
      matchingSvgIndex = svgIdx;
    }
  });

  // Apply highlight to the matching edge (or fallback to index)
  edgePaths.forEach((path, index) => {
    if (index === matchingSvgIndex || (matchingSvgIndex === -1 && index === edgeIndex)) {
      (path as SVGPathElement).setAttribute('data-selected-edge', 'true');
      (path as SVGPathElement).style.filter = 'drop-shadow(0 0 4px var(--accent))';
    } else {
      (path as SVGPathElement).removeAttribute('data-selected-edge');
      (path as SVGPathElement).style.filter = '';
    }
  });
}

interface Props {
  content: string;
  /** Stable identifier of the active diagram/tab so switching diagrams auto-fits & centers cleanly */
  diagramKey?: string;
  theme: 'dark' | 'light';
  themeId?: string;
  onChange?: (content: string) => void;
  onExport?: () => void;
  onRenderTime?: (ms: number) => void;
  onFullscreen?: () => void;
  onNodeSelect?: (nodeId: string) => void;
  /** Called when a style panel opens (node/edge/subgraph selected) */
  onSelectionOpen?: () => void;
  /** When true, clears any local selection (e.g. diagram colors panel opened) */
  externalPanelOpen?: boolean;
  onError?: (error: string | null) => void;
  /** Recovery path from the parse-error card: hosts that own a code pane
   *  pass a switch handler; the card's "Open in Code" button renders only
   *  when this is wired (critique iter-9 P0). */
  onOpenCode?: () => void;
}

function PreviewPanelInner({ content, diagramKey, theme, themeId, onChange, onExport, onRenderTime, onFullscreen, onNodeSelect, onSelectionOpen, externalPanelOpen, onError, onOpenCode }: Props) {
  const { t } = useTranslation();
  // Mobile preview drops the Copy-SVG toolbar action (redundant with the
  // Export sheet's copy actions and the toolbar's overflow casualty).
  const isMobilePreview = useMediaQuery('(max-width: 767.98px)');
  const [renderedSnapshot, setRenderedSnapshot] = useState<RenderedSnapshot | null>(null);
  const svg = renderedSnapshot?.svg ?? '';
  const hasSvg = Boolean(renderedSnapshot);
  const [error, setError] = useState<string | null>(null);

  // Remonter l'erreur au parent
  useEffect(() => {
    onError?.(error);
  }, [error, onError]);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [nodeOverlays, setNodeOverlays] = useState<Array<NodeOverlay>>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [panelStyleOverride, setPanelStyleOverride] = useState<{
    diagram: ReturnType<typeof parseDiagram>;
    styles: Map<string, NodeStyle>;
  } | null>(null);
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const [toolMode, setToolMode] = useState<'select' | 'connect'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);
  const [connectFirst, setConnectFirst] = useState<string | null>(null);
  const [dragShape, setDragShape] = useState<NodeShape | null>(null);
  const [dragSpecialShape, setDragSpecialShape] = useState<SpecialMediaShape | null>(null);
  const [pendingSpecialShape, setPendingSpecialShape] = useState<{ nodeId: string; mode: SpecialMediaShape } | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOverSubgraphId, setDragOverSubgraphId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizingWrapperRef = useRef<HTMLDivElement>(null);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgNaturalSizeRef = useRef({ width: 0, height: 0 });
  const [svgNaturalSize, setSvgNaturalSize] = useState({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const needsAutoFitRef = useRef(true);
  const prevAutoFitSizeRef = useRef({ width: 0, height: 0 });
  const prevDiagramKeyRef = useRef(diagramKey);
  const renderIdRef = useRef(0);
  const contentRef = useRef(content);
  const debounceRef = useRef<number>(0);
  const renderTimeTimerRef = useRef<number>(0);
  const edgeCleanupRef = useRef<(() => void) | null>(null);
  const relativeContainerRef = useRef<HTMLDivElement>(null);
  const [subgraphOverlays, setSubgraphOverlays] = useState<SubgraphOverlay[]>([]);
  const [selectedSubgraphId, setSelectedSubgraphId] = useState<string | null>(null);
  // Bumped whenever the SVG container becomes visible or changes size. On
  // mobile the preview tab renders hidden (display:none): overlays measured at
  // mount time collapse to 0×0 and stay stale until something re-runs the
  // measure. The tick re-triggers it when the tab is shown — same pattern as
  // VisualEditorCanvas.
  const [visibilityTick, setVisibilityTick] = useState(0);
  const visibilityTickRef = useRef(visibilityTick);
  const lastMeasuredRef = useRef<{
    renderId: number;
    zoom: number;
    visibilityTick: number;
    width: number;
    height: number;
  } | null>(null);
  const toolModeRef = useRef(toolMode);
  // Latest-ref pattern: syncEdgeTargets must not depend on the onSelectionOpen
  // prop identity. WorkspacePanel passes it as an inline arrow, so depending on
  // it re-ran the shadow-DOM setup effect (textContent = '' + innerHTML) on
  // every parent re-render — destroying the whole SVG and the just-applied
  // edge highlight on every selection.
  const onSelectionOpenRef = useRef(onSelectionOpen);
  const selectedEdgeIndexRef = useRef<number | null>(null);
  const renderedSnapshotRef = useRef<RenderedSnapshot | null>(null);
  const onRenderTimeRef = useRef(onRenderTime);

  // Keep refs in sync without accessing them during render
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);
  useEffect(() => { onSelectionOpenRef.current = onSelectionOpen; }, [onSelectionOpen]);
  useEffect(() => { selectedEdgeIndexRef.current = selectedEdgeIndex; }, [selectedEdgeIndex]);
  useEffect(() => { onRenderTimeRef.current = onRenderTime; }, [onRenderTime]);
  useEffect(() => { visibilityTickRef.current = visibilityTick; }, [visibilityTick]);
  useEffect(() => () => clearTimeout(renderTimeTimerRef.current), []);

  // Entering connect mode closes every floating panel and clears the current
  // selection: the Node/Edge/Subgraph style panels float above the canvas
  // (z-30) and would otherwise swallow the second click of a connect gesture.
  useEffect(() => {
    if (toolMode === 'connect') {
      setSelectedNodeIds(new Set());
      setSelectedEdgeIndex(null);
      setSelectedSubgraphId(null);
    }
  }, [toolMode]);

  // Parse the diagram once per content change; shared by the preview pipeline,
  // the style panels, and Copy SVG so every consumer sees the same parse.
  const parsedDiagram = useMemo(() => parseDiagram(content), [content]);

  // D6 fail-safe (DIA-04, Open Question 2 resolution (a)), narrowed in
  // Phase 27 to a parse-completeness gate: an at-brace line in the diagram
  // body that the directive parser cannot fully consume fences every
  // mutating handler below — a rewrite through a codeUtils mutator would
  // corrupt such a diagram (the same corruption risk as the visual editor,
  // fenced by the same shared helper). Well-formed directive content is
  // editable. Display-side parsing (parsedDiagram above) stays: it only
  // feeds pickers; the corruption risk is mutation. (Derived from content,
  // which is already in every handler's dependency array — the closures can
  // never see a stale fence.)
  const bodyHasMetadata = useMemo(() => bodyHasUnparsedAtDirective(content), [content]);

  // Resolve effective theme, preset button swatches, and preset colors once per content/themeId change
  const { nodePresets, currentThemeColors, effectiveThemeId } = useMemo(() => {
    // Try themeId prop first, then extract from content
    const resolvedThemeId = themeId ?? extractThemeIdFromContent(content);
    const currentTheme = resolvedThemeId ? getThemeById(resolvedThemeId) : null;
    const colors = currentTheme?.coreColors;

    return {
      effectiveThemeId: resolvedThemeId,
      nodePresets: [
        {
          label: 'Primary',
          presetType: 'primary' as PresetType,
          color: colors?.primaryColor ?? '#94a3b8', // Shows theme base color in button
        },
        {
          label: 'Success',
          presetType: 'success' as PresetType,
          color: colors?.successColor ?? '#22c55e',
        },
        {
          label: 'Warning',
          presetType: 'warning' as PresetType,
          color: colors?.warningColor ?? '#f59e0b',
        },
        {
          label: 'Danger',
          presetType: 'danger' as PresetType,
          color: colors?.errorColor ?? '#ef4444',
        },
        {
          label: 'Info',
          presetType: 'info' as PresetType,
          color: colors?.infoColor ?? '#06b6d4',
        },
      ],
      currentThemeColors: {
        primaryColor: colors?.primaryColor ?? '#3b82f6',
        successColor: colors?.successColor ?? '#22c55e',
        warningColor: colors?.warningColor ?? '#f59e0b',
        errorColor: colors?.errorColor ?? '#ef4444',
        infoColor: colors?.infoColor ?? '#06b6d4',
      },
    };
  }, [content, themeId]);

  // Track previous theme ID to detect when user switches themes
  const prevThemeIdRef = useRef<string | null>(null);

  // Update preset colors when theme changes
  useEffect(() => {
    // Skip if no change
    if (prevThemeIdRef.current === effectiveThemeId) return;

    const prevThemeId = prevThemeIdRef.current;

    // Update ref AFTER checking
    prevThemeIdRef.current = effectiveThemeId;

    // Only update if we had a previous theme and there are presets in the content
    if (!prevThemeId) return;

    // Check if any preset classDef exists
    const hasPresets = /\bclassDef\s+preset(?:Primary|Success|Warning|Danger|Info)\b/.test(content);
    // D6 fence: body-metadata content is never rewritten, even automatically.
    if (!hasPresets || bodyHasMetadata) return;

    // Update all preset classDef colors in the diagram
    const updated = updatePresetColors(content, currentThemeColors);
    if (updated !== content && onChange) {
      onChange(updated);
    }
  }, [effectiveThemeId, content, currentThemeColors]);

  const type = useMemo(() => detectDiagramType(content), [content]);
  const stylingCapabilities = getStylingCapabilities(type);
  const supportsVisualEditing = stylingCapabilities.supportsVisualEditing;

  const parsedEdges = parsedDiagram.edges;
  const parsedLinkStyles = parsedDiagram.linkStyles;
  const parsedStyles = parsedDiagram.styles;

  const hasSelectedNodes = selectedNodeIds.size > 0;
  const { panelLabels, basePanelStyles, nodeSubgraphIds } = useMemo(() => {
    if (!supportsVisualEditing || !hasSelectedNodes) {
      return EMPTY_NODE_PANEL_DATA;
    }
    const labels = new Map<string, string>();
    const styles = new Map<string, NodeStyle>();
    const subgraphIds = new Map<string, string | null>();
    for (const node of parsedDiagram.nodes) {
      labels.set(node.id, node.label);
      styles.set(node.id, getNodeStyle(parsedDiagram.styles, parsedDiagram.classDefs, parsedDiagram.nodeClasses, node.id));
      subgraphIds.set(node.id, node.parentSubgraphId ?? null);
    }
    return {
      panelLabels: labels,
      basePanelStyles: styles,
      nodeSubgraphIds: subgraphIds,
    };
  }, [parsedDiagram, supportsVisualEditing, hasSelectedNodes]);

  const panelStyles =
    panelStyleOverride && panelStyleOverride.diagram === parsedDiagram
      ? panelStyleOverride.styles
      : basePanelStyles;

  const needsSubgraphList = hasSelectedNodes || selectedSubgraphId !== null;
  const subgraphList = useMemo(() => {
    if (!supportsVisualEditing || !needsSubgraphList) {
      return EMPTY_SUBGRAPH_LIST;
    }
    return parsedDiagram.subgraphs.map(sg => ({ id: sg.id, label: sg.label }));
  }, [parsedDiagram, supportsVisualEditing, needsSubgraphList]);

  // Keep zoomRef & panRef in sync with state
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Re-arm auto-fit & clear stale selections whenever the active diagram changes
  useEffect(() => {
    if (prevDiagramKeyRef.current !== diagramKey) {
      prevDiagramKeyRef.current = diagramKey;
      needsAutoFitRef.current = true;
      prevAutoFitSizeRef.current = { width: 0, height: 0 };
      setSelectedNodeIds(new Set());
      setSelectedEdgeIndex(null);
      setSelectedSubgraphId(null);
    }
  }, [diagramKey]);

  // Clear local selections when an external panel (diagram colors / advanced style) opens
  const prevExternalOpenRef = useRef(false);
  useEffect(() => {
    if (externalPanelOpen && !prevExternalOpenRef.current) {
      setSelectedNodeIds(new Set());
      setSelectedEdgeIndex(null);
      setSelectedSubgraphId(null);
    }
    prevExternalOpenRef.current = !!externalPanelOpen;
  }, [externalPanelOpen]);

  const render = useCallback(async () => {
    const id = ++renderIdRef.current;
    setLoading(true);
    const start = performance.now();

    try {
      const { svg: s, error: e } = await renderDiagram(content, `preview_${id}_${Date.now()}`, themeId);

      // Check if this render is still the latest one
      if (id !== renderIdRef.current) {return;}

      const elapsed = Math.round(performance.now() - start);
      clearTimeout(renderTimeTimerRef.current);
      renderTimeTimerRef.current = window.setTimeout(() => {
        if (id === renderIdRef.current) {
          onRenderTimeRef.current?.(elapsed);
        }
      }, 0);

      if (e) {
        // Clear the shadow root while the canvas branch is still mounted —
        // once React swaps to the error branch, the host div is REUSED for
        // the error card's own divs (same element type at the same ternary
        // position, no unmount) and the ref detaches to null, so the !svg
        // cleanup effect below never runs: the last good SVG kept painting
        // from inside the error card, over its opaque background (iter-32
        // P1 — invisible to elementsFromPoint because the painter is a
        // shadow root, which DOM queries don't traverse).
        if (shadowHostRef.current?.shadowRoot) {
          shadowHostRef.current.shadowRoot.textContent = '';
        }
        edgeCleanupRef.current?.();
        edgeCleanupRef.current = null;
        setError(e);
        setRenderedSnapshot(null);
      } else {
        // Add data-rendered attribute to SVG for E2E tests
        // Simply replace the first <svg occurrence
        const svgWithAttr = s ? s.replace('<svg', '<svg data-rendered="true"') : '';
        setRenderedSnapshot(svgWithAttr ? {
          svg: svgWithAttr,
          renderId: id,
          content,
          parsedDiagram,
          supportsVisualEditing,
        } : null);
        setError(null);
      }
    } finally {
      // Always clear loading state, even if render was cancelled
      if (id === renderIdRef.current) {
        setLoading(false);
      }
    }
  }, [content, parsedDiagram, supportsVisualEditing, themeId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, RENDER_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  // Re-measure node + subgraph overlays from current screen geometry. Overlays
  // live in the unscaled relative container, so measured rects are used as-is
  // (no /zoom division — that only applies to overlays living inside a scaled
  // wrapper, like the visual editor's).
  const remeasureOverlays = useCallback(() => {
    const snap = renderedSnapshotRef.current;
    if (!snap || !snap.supportsVisualEditing) {
      setNodeOverlays(prev => prev.length === 0 ? prev : []);
      setSubgraphOverlays(prev => prev.length === 0 ? prev : []);
      return;
    }
    const relContainer = relativeContainerRef.current;
    const shadowRoot = shadowHostRef.current?.shadowRoot;
    if (!relContainer || !shadowRoot) return;

    const svgEl = shadowRoot.querySelector('svg');
    if (!svgEl) return;

    const relRect = relContainer.getBoundingClientRect();
    const offsetX = -relRect.left;
    const offsetY = -relRect.top;
    const hasCollapsedGroups = svgEl.querySelector('.collapsed-group') !== null;

    setNodeOverlays(extractSvgNodes(svgEl, offsetX, offsetY, hasCollapsedGroups));
    const knownIds = snap.parsedDiagram.subgraphs.map(sg => sg.id);
    setSubgraphOverlays(extractSubgraphOverlays(svgEl, offsetX, offsetY, knownIds, hasCollapsedGroups));
  }, []);

  // (Re)create the edge hit-target layer, releasing the previous one first so
  // effect re-runs never stack stale overlays.
  const syncEdgeTargets = useCallback((snapshotOverride?: RenderedSnapshot | null) => {
    edgeCleanupRef.current?.();
    edgeCleanupRef.current = null;
    const snap = snapshotOverride !== undefined ? snapshotOverride : renderedSnapshotRef.current;
    if (!snap || !snap.supportsVisualEditing || !shadowHostRef.current || !relativeContainerRef.current) return;
    edgeCleanupRef.current = addEdgeClickTargets(shadowHostRef.current, relativeContainerRef.current, (index) => {
      if (toolModeRef.current === 'connect') return;
      setSelectedNodeIds(new Set());
      setSelectedSubgraphId(null);
      // Read the previous selection from a ref instead of the setState updater:
      // calling onSelectionOpen inside the updater fired a parent setState
      // during this component's render pass ("Cannot update a component"), and
      // the resulting parent re-render destroyed the shadow DOM (see
      // onSelectionOpenRef above). Defer the open to the next frame, like the
      // node/subgraph handlers.
      const willSelect = selectedEdgeIndexRef.current !== index;
      setSelectedEdgeIndex(willSelect ? index : null);
      if (willSelect) {
        requestAnimationFrame(() => onSelectionOpenRef.current?.());
      }
    }, snap.parsedDiagram.edges, () => toolModeRef.current === 'connect');
  }, []);

  // Setup Shadow DOM for SVG isolation
  useEffect(() => {
    renderedSnapshotRef.current = renderedSnapshot;

    // Clean up shadow root, edge targets, and overlays when snapshot is cleared
    // (e.g. after a parse error, even if shadowHostRef detached on error branch swap)
    if (!renderedSnapshot) {
      lastMeasuredRef.current = null;
      if (shadowHostRef.current?.shadowRoot) {
        shadowHostRef.current.shadowRoot.textContent = '';
      }
      edgeCleanupRef.current?.();
      edgeCleanupRef.current = null;
      setNodeOverlays(prev => prev.length === 0 ? prev : []);
      setSubgraphOverlays(prev => prev.length === 0 ? prev : []);
      return;
    }

    if (!shadowHostRef.current) return;

    // Create shadow root only if it doesn't exist
    if (!shadowHostRef.current.shadowRoot) {
      shadowHostRef.current.attachShadow({ mode: 'open' });
    }

    const shadowRoot = shadowHostRef.current.shadowRoot;
    if (!shadowRoot) return;

    // Extract theme variables from snapshot content and define them in Shadow DOM
    let shadowCSS = ':host { all: initial; }\n';
    let fontFamily = '';
    let fontSize = '';

    try {
      const { frontmatter } = parseFrontmatter(renderedSnapshot.content);
      const config = frontmatter.config as Record<string, any>;
      const themeVars = config?.themeVariables as Record<string, string> | undefined;

      // Extract font settings for direct CSS application
      if (themeVars) {
        fontFamily = sanitizeCssValue(themeVars.fontFamily || '');
        fontSize = sanitizeCssValue(themeVars.fontSize || '');

        // Map Mermaid theme variables to CSS variables
        const cssVars: string[] = [];
        for (const [key, value] of Object.entries(themeVars)) {
          if (typeof value === 'string') {
            cssVars.push(`  --${sanitizeCssValue(key)}: ${sanitizeCssValue(value)};`);
          }
        }
        if (cssVars.length > 0) {
          shadowCSS += '.mermaid {\n' + cssVars.join('\n') + '\n}\n';
        }
      }
    } catch {
      // If parsing fails, use defaults
    }

    // Add font styles to Shadow DOM - these need to be applied directly
    // Note: font-size is only applied to .mermaid (not *) so that per-node
    // font-size set via classDef/style directives is not overridden.
    if (fontFamily || fontSize) {
      shadowCSS += '\n/* Font styles */\n';
      shadowCSS += '.mermaid {\n';
      if (fontFamily) shadowCSS += `  font-family: ${fontFamily};\n`;
      if (fontSize) shadowCSS += `  font-size: ${fontSize};\n`;
      shadowCSS += '}\n';
      if (fontFamily) {
        shadowCSS += '.mermaid * {\n';
        shadowCSS += `  font-family: ${fontFamily};\n`;
        shadowCSS += '}\n';
      }
    }

    // Edge label: force opaque background (color is set by SVG post-processing)
    shadowCSS += '\n/* Edge label styling */\n';
    shadowCSS += `g.edgeLabel rect.background, g.edgeLabel rect { fill-opacity: 1 !important; opacity: 1 !important; stroke: none !important; }\n`;
    shadowCSS += `g.edgeLabel .label div, g.edgeLabel .label span { background-color: inherit; opacity: 1 !important; }\n`;

    // Shared post-processing (label fixes + edge style cleanup, incl. neutralizing
    // the linkStyle fill that Mermaid misapplies to edge paths) — same pipeline as
    // the exports so PNG/SVG output matches the preview.
    const processedSvgEl =
      'postProcessDiagramSvgToElement' in svgPostProcessing &&
      typeof svgPostProcessing.postProcessDiagramSvgToElement === 'function'
        ? svgPostProcessing.postProcessDiagramSvgToElement(
            renderedSnapshot.svg,
            renderedSnapshot.parsedDiagram
          )
        : null;

    let svgContainer: Element;
    let svgElement: SVGSVGElement | null;

    if (processedSvgEl) {
      let themeStyle = shadowRoot.querySelector<HTMLStyleElement>('style[data-shadow-theme]');
      let centeringStyle = shadowRoot.getElementById('mermaid-centering-fix') as HTMLStyleElement | null;
      let wrapper = shadowRoot.querySelector<HTMLDivElement>('.mermaid');

      if (themeStyle && centeringStyle && wrapper) {
        if (themeStyle.textContent !== shadowCSS) {
          themeStyle.textContent = shadowCSS;
        }
        wrapper.replaceChildren(document.adoptNode(processedSvgEl));
      } else {
        themeStyle = document.createElement('style');
        themeStyle.setAttribute('data-shadow-theme', '');
        themeStyle.textContent = shadowCSS;
        centeringStyle = document.createElement('style');
        centeringStyle.id = 'mermaid-centering-fix';
        centeringStyle.textContent = SHADOW_CENTERING_CSS;
        wrapper = document.createElement('div');
        wrapper.className = 'mermaid';
        wrapper.appendChild(document.adoptNode(processedSvgEl));
        shadowRoot.replaceChildren(themeStyle, centeringStyle, wrapper);
      }
      svgContainer = wrapper;
      svgElement = processedSvgEl;
    } else {
      const processedSvg = svgPostProcessing.postProcessDiagramSvg(
        renderedSnapshot.svg,
        renderedSnapshot.parsedDiagram
      );

      // Safe sink: `svg` was sanitized by renderDiagram (DOMPurify) and the
      // post-processing pipeline only mutates attributes via DOM APIs — it
      // cannot introduce markup. shadowCSS values are escaped above.
      shadowRoot.innerHTML = `<style>${shadowCSS}</style><style id="mermaid-centering-fix">${SHADOW_CENTERING_CSS}</style><div class="mermaid">${processedSvg}</div>`;
      // innerHTML was just set with a `.mermaid` div, so the container exists.
      svgContainer = shadowRoot.querySelector('.mermaid')!;
      svgElement = svgContainer.querySelector('svg');
    }

    // Store reference for size calculations (pointing to SVG container in Shadow DOM)
    svgContainerRef.current = svgContainer as unknown as HTMLDivElement;

    // Capture SVG natural size for fit-to-screen
    if (svgElement) {
      const widthAttr = svgElement.getAttribute('width');
      const heightAttr = svgElement.getAttribute('height');
      let nextWidth = widthAttr ? parseFloat(widthAttr) : 0;
      let nextHeight = heightAttr ? parseFloat(heightAttr) : 0;
      if (!Number.isFinite(nextWidth)) nextWidth = 0;
      if (!Number.isFinite(nextHeight)) nextHeight = 0;

      // If no explicit size, use viewBox
      if (nextWidth === 0 || nextHeight === 0) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const [, , w, h] = viewBox.trim().split(/[\s,]+/).map(Number);
          nextWidth = Number.isFinite(w) ? w : 0;
          nextHeight = Number.isFinite(h) ? h : 0;
        }
      }
      const nextSize = { width: nextWidth, height: nextHeight };
      svgNaturalSizeRef.current = nextSize;
      setSvgNaturalSize(prev =>
        prev.width === nextSize.width && prev.height === nextSize.height ? prev : nextSize
      );

      // Auto-fit & center on initial load, diagram switch, or when pasting a large
      // diagram into an unpanned 100% tab so the entire graph is visible immediately.
      const viewport = containerRef.current;
      if (viewport && nextSize.width > 0 && nextSize.height > 0) {
        const vpRect = viewport.getBoundingClientRect();
        if (vpRect.width > 0 && vpRect.height > 0) {
          const padding = 32;
          const availW = Math.max(64, vpRect.width - padding * 2);
          const availH = Math.max(64, vpRect.height - padding * 2);
          const prevSize = prevAutoFitSizeRef.current;
          const prevFitted = prevSize.width <= availW && prevSize.height <= availH;
          const nextOverflows = nextSize.width > availW * 1.15 || nextSize.height > availH * 1.15;
          const jumpedToLarge =
            prevFitted &&
            nextOverflows &&
            zoomRef.current === 1 &&
            panRef.current.x === 0 &&
            panRef.current.y === 0;
          prevAutoFitSizeRef.current = nextSize;

          if (needsAutoFitRef.current || jumpedToLarge) {
            needsAutoFitRef.current = false;
            const fitScale = Math.min(1, availW / nextSize.width, availH / nextSize.height);
            const targetZoom = Math.max(0.05, Math.round(fitScale * 100) / 100);
            zoomRef.current = targetZoom;
            panRef.current = { x: 0, y: 0 };
            setZoom(targetZoom);
            setPan({ x: 0, y: 0 });
          }
        }
      }

      // Imperatively sync wrapper and shadow-host dimensions before synchronous
      // overlay/edge measurement so size-changing renders avoid an extra rAF.
      // Null-guarded when recovering from the error/empty ternary branch.
      const sizingWrapper = sizingWrapperRef.current;
      if (sizingWrapper) {
        sizingWrapper.style.width = nextSize.width ? `${nextSize.width * zoomRef.current}px` : '100%';
        sizingWrapper.style.height = nextSize.height ? `${nextSize.height * zoomRef.current}px` : '100%';
      }
      const shadowHost = shadowHostRef.current;
      if (shadowHost) {
        shadowHost.style.width = nextSize.width ? `${nextSize.width}px` : '100%';
        shadowHost.style.height = nextSize.height ? `${nextSize.height}px` : '100%';
      }
    }

    // Inject edge click hit targets (must be after SVG is in DOM)
    syncEdgeTargets(renderedSnapshot);
    remeasureOverlays();
    lastMeasuredRef.current = {
      renderId: renderedSnapshot.renderId,
      zoom: zoomRef.current,
      visibilityTick: visibilityTickRef.current,
      width: svgNaturalSizeRef.current.width,
      height: svgNaturalSizeRef.current.height,
    };

  }, [renderedSnapshot, syncEdgeTargets, remeasureOverlays]);

  // Cleanup edge hit targets on unmount
  useEffect(() => {
    return () => {
      edgeCleanupRef.current?.();
    };
  }, []);

  // Cleanup shadow root on unmount
  useEffect(() => {
    return () => {
      if (shadowHostRef.current?.shadowRoot) {
        shadowHostRef.current.shadowRoot.innerHTML = '';
      }
    };
  }, []);

  // Extract node overlays and align edge overlay geometry after SVG renders
  useEffect(() => {
    if (!renderedSnapshot || !svgContainerRef.current || !containerRef.current || !shadowHostRef.current) return;

    const last = lastMeasuredRef.current;
    if (
      last &&
      last.renderId === renderedSnapshot.renderId &&
      last.zoom === zoom &&
      last.visibilityTick === visibilityTick &&
      last.width === svgNaturalSize.width &&
      last.height === svgNaturalSize.height
    ) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      remeasureOverlays();
      const shadowRoot = shadowHostRef.current?.shadowRoot;
      const relativeContainer = relativeContainerRef.current;
      if (shadowRoot && relativeContainer) {
        const svgEl = shadowRoot.querySelector('svg');
        const edgeOverlay = relativeContainer.querySelector<SVGSVGElement>('[data-edge-overlay="true"]');
        if (svgEl && edgeOverlay) {
          const svgRect = svgEl.getBoundingClientRect();
          const containerRect = relativeContainer.getBoundingClientRect();
          edgeOverlay.style.left = `${svgRect.left - containerRect.left}px`;
          edgeOverlay.style.top = `${svgRect.top - containerRect.top}px`;
          edgeOverlay.style.width = `${svgRect.width}px`;
          edgeOverlay.style.height = `${svgRect.height}px`;
        }
      }
      lastMeasuredRef.current = {
        renderId: renderedSnapshot.renderId,
        zoom,
        visibilityTick,
        width: svgNaturalSize.width,
        height: svgNaturalSize.height,
      };
    });
    return () => cancelAnimationFrame(rafId);
  }, [renderedSnapshot, svgNaturalSize, zoom, visibilityTick, remeasureOverlays]);

  // Watch for the container becoming visible or resized (mobile tab switches,
  // panel layout changes): overlays measured while hidden are 0×0 and must be
  // re-measured once real geometry exists. Feature-detected because jsdom has
  // neither observer.
  useEffect(() => {
    const el = containerRef.current;
    if (!hasSvg || !el || typeof IntersectionObserver === 'undefined') return;

    const bump = () => setVisibilityTick(t => t + 1);
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
          bump();
        }
      }
    });
    io.observe(el);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            bump();
          }
        }
      });
      ro.observe(el);
    }

    return () => {
      io.disconnect();
      ro?.disconnect();
    };
  }, [hasSvg]);

  // Unlimited drag/pan navigation uses CSS translate3d on relativeContainerRef
  // (no scrollbars clamping negative or positive offsets), so node/subgraph/edge
  // overlays move in lockstep with the SVG without scroll-driven re-measurement.

  // Settle pass: scoped strictly to zoom and visibilityTick changes so normal
  // typing edits do not trigger a redundant post-render settle rebuild while
  // zoom transitions (150ms transform) and mobile tab reveals keep exact settle
  // behavior. transitionend is the precise signal (it bubbles out of the shadow
  // root); the timeout covers environments that never fire it (jsdom) and zoom
  // changes too small to produce an event.
  const prevZoomRef = useRef(zoom);
  const prevVisibilityTickRef = useRef(visibilityTick);
  useEffect(() => {
    const zoomChanged = prevZoomRef.current !== zoom;
    const visibilityChanged = prevVisibilityTickRef.current !== visibilityTick;
    prevZoomRef.current = zoom;
    prevVisibilityTickRef.current = visibilityTick;

    if (!zoomChanged && !visibilityChanged) return;
    if (!renderedSnapshotRef.current || !shadowHostRef.current) return;

    const host = shadowHostRef.current;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      // Deferred auto-fit when a previously hidden pane (e.g. mobile Visual tab) becomes visible
      if (needsAutoFitRef.current && containerRef.current) {
        const vpRect = containerRef.current.getBoundingClientRect();
        const { width: natW, height: natH } = svgNaturalSizeRef.current;
        if (vpRect.width > 0 && vpRect.height > 0 && natW > 0 && natH > 0) {
          needsAutoFitRef.current = false;
          const availW = Math.max(64, vpRect.width - 64);
          const availH = Math.max(64, vpRect.height - 64);
          const fitScale = Math.min(1, availW / natW, availH / natH);
          const targetZoom = Math.max(0.05, Math.round(fitScale * 100) / 100);
          zoomRef.current = targetZoom;
          panRef.current = { x: 0, y: 0 };
          setZoom(targetZoom);
          setPan({ x: 0, y: 0 });
        }
      }
      remeasureOverlays();
      syncEdgeTargets();
    };
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') settle();
    };
    host.addEventListener('transitionend', onTransitionEnd);
    const fallback = setTimeout(settle, 220);
    return () => {
      host.removeEventListener('transitionend', onTransitionEnd);
      clearTimeout(fallback);
    };
  }, [zoom, visibilityTick, remeasureOverlays, syncEdgeTargets]);

  // Highlight selected edge when selection changes
  useEffect(() => {
    if (!shadowHostRef.current || !renderedSnapshot) return;
    highlightSelectedEdge(shadowHostRef.current, selectedEdgeIndex, renderedSnapshot.parsedDiagram.edges);
  }, [selectedEdgeIndex, renderedSnapshot]);

  // Node click handler with multi-node selection (shift+click)
  // SyntheticEvent: reached from both the pointer click and the node
  // overlay's Enter/Space keyboard activation (iter-12 canvas parity).
  // shiftKey is only read on the pointer path (multi-select); the keyboard
  // path never supplies it, which is correct — Enter toggles directly.
  // 39-04 (Rule 1): the multi-select read is the EVENT's shiftKey — the
  // previous `e.currentTarget?.shiftKey` read the DOM ELEMENT property,
  // which never exists, so shift multi-select on preview nodes silently
  // never engaged (measured: a shift+click replaced the selection instead
  // of extending it; the visual canvas reads e.shiftKey — its working
  // sibling idiom). Both event families carry shiftKey.
  const handleNodeClick = useCallback((e: React.MouseEvent | React.KeyboardEvent, nodeId: string) => {
    e.stopPropagation();
    if (!supportsVisualEditing) return;
    setSelectedEdgeIndex(null);
    setSelectedSubgraphId(null);
    if (toolMode === 'connect') {
      if (!connectFirst) {
        setConnectFirst(nodeId);
        return;
      }
      // D6 fence: body-metadata content never reaches a codeUtils mutator.
      // Same inline onChange guard as the subgraph edge path below — the
      // prop is optional in this component's Props.
      if (!bodyHasMetadata && connectFirst !== nodeId && onChange) {
        onChange(addEdge(content, connectFirst, nodeId));
      }
      setConnectFirst(null);
      setToolMode('select');
      return;
    }
    if (e.shiftKey) {
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
      // Delay onSelectionOpen to avoid setState during render
      requestAnimationFrame(() => onSelectionOpen?.());
    } else {
      const willSelect = !(selectedNodeIds.size === 1 && selectedNodeIds.has(nodeId));
      setSelectedNodeIds(prev =>
        prev.size === 1 && prev.has(nodeId) ? new Set() : new Set([nodeId])
      );
      if (willSelect) {
        // Delay onSelectionOpen to avoid setState during render
        requestAnimationFrame(() => onSelectionOpen?.());
      }
      onNodeSelect?.(nodeId);
    }
  }, [supportsVisualEditing, onNodeSelect, onSelectionOpen, toolMode, connectFirst, onChange, content, selectedNodeIds]);

  const handleAddSubgraph = useCallback(() => {
    if (!onChange) return;
    // D6 fence: body-metadata content is never rewritten.
    if (bodyHasMetadata) return;
    onChange(addSubgraph(content, undefined, t('preview.subgraph')));
  }, [onChange, content, t, bodyHasMetadata]);

  const handleSubgraphClick = useCallback((e: React.MouseEvent, subgraphId: string) => {
    e.stopPropagation();
    if (!supportsVisualEditing) return;

    // Handle connect mode for subgraphs (connect subgraph-to-node or subgraph-to-subgraph)
    if (toolMode === 'connect') {
      setSelectedEdgeIndex(null);
      if (!connectFirst) {
        setConnectFirst(subgraphId);
        setSelectedSubgraphId(null);
        return;
      }
      // D6 fence: body-metadata content never reaches a codeUtils mutator.
      if (connectFirst !== subgraphId && onChange && !bodyHasMetadata) {
        onChange(addEdge(content, connectFirst, subgraphId));
      }
      setConnectFirst(null);
      setToolMode('select');
      setSelectedSubgraphId(null);
      return;
    }

    // Normal selection mode
    setSelectedNodeIds(new Set());
    setSelectedEdgeIndex(null);
    setSelectedSubgraphId(prev => {
      const willSelect = prev !== subgraphId;
      if (willSelect) {
        // Delay onSelectionOpen to avoid setState during render
        requestAnimationFrame(() => onSelectionOpen?.());
      }
      return willSelect ? subgraphId : null;
    });
  }, [supportsVisualEditing, onSelectionOpen, toolMode, connectFirst, onChange, content, bodyHasMetadata]);

  const handleSubgraphStyleChange = useCallback((subgraphId: string, styleUpdate: Partial<NodeStyle>) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const existingStyle = parsedStyles.get(subgraphId) ?? {};
    const mergedStyle = { ...existingStyle, ...styleUpdate };
    const result = updateNodeStyle(content, subgraphId, mergedStyle);
    onChange(result);
  }, [onChange, content, parsedStyles, bodyHasMetadata]);

  const handleSubgraphLabelChange = useCallback((subgraphId: string, newLabel: string) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const result = updateSubgraphLabel(content, subgraphId, newLabel);
    onChange(result);
  }, [onChange, content, bodyHasMetadata]);

  const handleSubgraphReset = useCallback((subgraphId: string) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const result = removeNodeStyles(content, [subgraphId]);
    onChange(result);
    setSelectedSubgraphId(null);
  }, [onChange, content, bodyHasMetadata]);

  // 40-04 (EDGE-05): the selected subgraph's parsed view — read-only
  // derivation from the parseDiagram result (components never re-parse code
  // strings); absent directive = undefined (Expand active in the panel).
  const selectedSubgraphView = selectedSubgraphId !== null
    ? parsedDiagram.subgraphs.find(s => s.id === selectedSubgraphId)?.view
    : undefined;

  // 40-04 (EDGE-05): view writes route ONLY through the updateSubgraphView
  // mutator, D6-gated like every other subgraph handler (the view directive
  // line is fully consumed by the parser, so the fence stays lifted on
  // well-formed view documents).
  const handleSubgraphViewChange = useCallback((view: 'collapsed' | 'expanded') => {
    if (selectedSubgraphId === null || !onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    onChange(updateSubgraphView(content, selectedSubgraphId, view));
  }, [onChange, content, selectedSubgraphId, bodyHasMetadata]);

  const handleCanvasClick = useCallback(() => {
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    if (toolMode === 'connect') {
      setConnectFirst(null);
      return;
    }
    if (selectedNodeIds.size > 0) {
      setSelectedNodeIds(new Set());
    }
    if (selectedEdgeIndex !== null) {
      setSelectedEdgeIndex(null);
    }
    if (selectedSubgraphId !== null) {
      setSelectedSubgraphId(null);
    }
  }, [selectedNodeIds, selectedEdgeIndex, selectedSubgraphId, toolMode]);

  // Style change handler: writes classDef/class lines to code via onChange
  const handleStyleChange = useCallback((nodeIds: string[], styleUpdate: Partial<NodeStyle>) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence — also skips the panelStyles update below

    // Update optimistic panelStyles immediately so UI reflects the change
    setPanelStyleOverride(prev => {
      const source = prev && prev.diagram === parsedDiagram ? prev.styles : basePanelStyles;
      const next = new Map(source);
      for (const nodeId of nodeIds) {
        next.set(nodeId, { ...(next.get(nodeId) ?? {}), ...styleUpdate });
      }
      return { diagram: parsedDiagram, styles: next };
    });

    // Remove old classDef and class lines for these nodes
    let result = removeNodeStyles(content, nodeIds);

    // Build new classDefs, class assignments, and direct style lines
    const newLines: string[] = [];
    const classNameBase = `nodeStyle_${Date.now()}`;
    nodeIds.forEach((nodeId, index) => {
      // Merge existing style with update
      const existingStyle = panelStyles.get(nodeId) ?? {};
      const mergedStyle = { ...existingStyle, ...styleUpdate };

      const classDefStyles: string[] = [];

      // Properties applied via classDef
      if (mergedStyle.fill) classDefStyles.push(`fill:${mergedStyle.fill}`);
      if (mergedStyle.stroke) classDefStyles.push(`stroke:${mergedStyle.stroke}`);
      if (mergedStyle.strokeWidth) classDefStyles.push(`stroke-width:${mergedStyle.strokeWidth}`);
      if (mergedStyle.strokeDasharray) classDefStyles.push(`stroke-dasharray:${mergedStyle.strokeDasharray}`);
      if (mergedStyle.color) classDefStyles.push(`color:${mergedStyle.color}`);
      if (mergedStyle.fontWeight) classDefStyles.push(`font-weight:${mergedStyle.fontWeight}`);
      if (mergedStyle.rx) classDefStyles.push(`rx:${mergedStyle.rx}`);
      if (mergedStyle.ry) classDefStyles.push(`ry:${mergedStyle.ry}`);
      if (mergedStyle.opacity) classDefStyles.push(`opacity:${mergedStyle.opacity}`);
      if (mergedStyle.fontSize) classDefStyles.push(`font-size:${mergedStyle.fontSize}`);

      // Add classDef line if we have classDef-compatible styles
      if (classDefStyles.length > 0) {
        const className = `${classNameBase}_${index}`;
        newLines.push(`    classDef ${className} ${classDefStyles.join(',')}`);
        newLines.push(`    class ${nodeId} ${className}`);
      }

      // Direct style line for properties Mermaid classDef may not handle
      const directStyles: string[] = [];
      if (mergedStyle.fontSize) directStyles.push(`font-size:${mergedStyle.fontSize}`);
      if (directStyles.length > 0) {
        newLines.push(`    style ${nodeId} ${directStyles.join(',')}`);
      }

    });

    if (newLines.length > 0) {
      result = result.trimEnd() + '\n' + newLines.join('\n') + '\n';
    }

    onChange(result);
  }, [onChange, content, panelStyles, parsedDiagram, basePanelStyles, bodyHasMetadata]);

  // Reset handler: removes all classDef/class lines for selected nodes
  const handleResetStyles = useCallback((nodeIds: string[]) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    setPanelStyleOverride(null);
    const result = removeNodeStyles(content, nodeIds);
    onChange(result);
    setSelectedNodeIds(new Set());
  }, [onChange, content, bodyHasMetadata]);

  // Subgraph change handler: moves a node to a different subgraph
  const handleSubgraphChange = useCallback((nodeId: string, subgraphId: string | null) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const result = moveNodeToSubgraph(content, nodeId, subgraphId);
    onChange(result);
  }, [onChange, content, bodyHasMetadata]);

  // Preset handler: applies a preset using classDef
  const handlePresetApply = useCallback((nodeIds: string[], presetType: PresetType) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence — also skips the panelStyles update below
    setPanelStyleOverride(null);

    // Remove old styles for these nodes first
    let result = removeNodeStyles(content, nodeIds);

    // Apply the preset
    result = applyNodePreset(result, nodeIds, presetType, currentThemeColors);

    onChange(result);
  }, [onChange, content, currentThemeColors, bodyHasMetadata]);

  // Edge style change handler
  const handleEdgeStyleChange = useCallback((edgeIndex: number, styleUpdate: Partial<EdgeStyle>) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const existingStyle = parsedLinkStyles.get(edgeIndex) ?? {};
    const mergedStyle = { ...existingStyle, ...styleUpdate };
    const result = updateLinkStyle(content, edgeIndex, mergedStyle);
    onChange(result);
  }, [onChange, content, parsedLinkStyles, bodyHasMetadata]);

  // Edge arrow type change handler
  const handleEdgeArrowChange = useCallback((source: string, target: string, arrowType: string) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const edge = parsedEdges[selectedEdgeIndex ?? -1];
    const length = edge && edge.source === source && edge.target === target
      ? (edge.length ?? 1)
      : 1;
    const result = updateEdgeArrowType(content, source, target, arrowType, length, selectedEdgeIndex ?? undefined);
    onChange(result);
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  // Animate toggle delegate — automatically mints an edge id when the selected edge has none.
  const handleEdgeAnimateChange = useCallback((animate: boolean) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const idx = selectedEdgeIndex ?? -1;
    const edge = parsedEdges[idx];
    if (!edge) return;
    const { unknownParams: _fenced, ...typed } = edge.metadata ?? {};
    const result = upsertEdgeMetadataAtIndex(content, idx, { ...typed, animate }, edge.source, edge.target);
    onChange(result);
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  // Inspector-row delegates — auto-assigns an edge id on id-less edges when setting metadata or id.
  const handleEdgeMetaChange = useCallback((meta: EdgeMetadata) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const idx = selectedEdgeIndex ?? -1;
    const edge = parsedEdges[idx];
    if (!edge) return;
    onChange(upsertEdgeMetadataAtIndex(content, idx, meta, edge.source, edge.target));
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  const handleEdgeIdChange = useCallback((newId: string) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const idx = selectedEdgeIndex ?? -1;
    const edge = parsedEdges[idx];
    if (!edge) return;
    onChange(assignOrUpdateEdgeId(content, idx, newId, edge.source, edge.target));
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  const handleEdgeLengthChange = useCallback((token: string, length: number) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const idx = selectedEdgeIndex ?? -1;
    const edge = parsedEdges[idx];
    if (!edge) return;
    onChange(updateEdgeArrowType(content, edge.source, edge.target, token, length, idx));
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  const handleAnimatePreset = useCallback(() => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const idx = selectedEdgeIndex ?? -1;
    const edge = parsedEdges[idx];
    if (!edge) return;
    onChange(applyEdgeAnimatePreset(content, edge.source, edge.target, idx));
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  // Node label change handler
  const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const result = updateNodeLabel(content, nodeId, newLabel);
    onChange(result);
  }, [onChange, content, bodyHasMetadata]);

  // 39-04 (ICON-03, T-39-09): media-mutation delegates — the ONLY write
  // path is the 39-01 updateNodeIcon/updateNodeImg mutators (components
  // never regex-edit directive spans). The media content ref chains
  // SEQUENTIAL mutator calls: switching from an Icon/Image shape to a
  // geometric shape fires onIconChange(null), onImageChange(null), and
  // onShapeChange(shape) synchronously, and each handler must mutate the
  // prior call's result, not the stale `content` prop (a lost-update otherwise).
  const mediaContentRef = useRef(content);
  useEffect(() => {
    // The ref syncs from the prop here (not during render — refs are
    // render-off-limits per the correctness lint) and inline inside the
    // handlers below, so synchronous chained calls always compose cleanly.
    mediaContentRef.current = content;
  }, [content]);

  // 38-06 (SHP-04): node shape change handler — the NodeStylePanel Shape
  // row's delegate, gated like its sibling mutators and threaded through
  // mediaContentRef so clearing active icon/img media and setting the new
  // geometric shape compose synchronously without lost updates.
  const handleNodeShapeChange = useCallback((nodeIds: string[], shape: NodeShape) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    let result = mediaContentRef.current;
    for (const id of nodeIds) {
      result = updateNodeShape(result, id, shape);
    }
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
  }, [onChange, bodyHasMetadata]);

  const handleNodeIconChange = useCallback((nodeIds: string[], icon: IconConfig | null) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    let result = mediaContentRef.current;
    for (const id of nodeIds) {
      result = updateNodeIcon(result, id, icon);
    }
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
  }, [onChange, bodyHasMetadata]);
  const handleNodeImageChange = useCallback((nodeIds: string[], img: ImgConfig | null) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    let result = mediaContentRef.current;
    for (const id of nodeIds) {
      result = updateNodeImg(result, id, img);
    }
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
  }, [onChange, bodyHasMetadata]);

  // 39-04: the selection's shared media data for the NodeStylePanel tabs —
  // a config when every selected node carries that kind, null when none
  // does, undefined when the kinds mix (the panel's mixed idiom). Derived
  // from the PARSED node data, never from re-parsing code strings.
  const selectedNodeList = Array.from(selectedNodeIds);
  const selectedParsedNodes = selectedNodeList
    .map(id => parsedDiagram.nodes.find(n => n.id === id))
    .filter((n): n is NonNullable<ReturnType<typeof parsedDiagram.nodes.find>> => Boolean(n));
  const allIcon = selectedParsedNodes.length > 0 && selectedParsedNodes.every(n => !!n.icon);
  const allPlain = selectedParsedNodes.length > 0 && selectedParsedNodes.every(n => !n.icon && !n.img);
  const allImg = !allIcon && selectedParsedNodes.length > 0 && selectedParsedNodes.every(n => !!n.img);
  const sharedNodeIcon: IconConfig | null | undefined =
    allIcon ? selectedParsedNodes[0].icon : (allPlain || allImg) ? null : undefined;
  const sharedNodeImage: ImgConfig | null | undefined =
    allImg ? selectedParsedNodes[0].img : (allPlain || allIcon) ? null : undefined;
  const hideNodeBorderRadius =
    selectedParsedNodes.length > 0 &&
    selectedParsedNodes.every(n => !shapeSupportsBorderRadius(n.shape, Boolean(n.icon || n.img)));

  // Edge label change handler
  const handleEdgeLabelChange = useCallback((source: string, target: string, label: string) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const result = updateEdgeLabel(content, source, target, label, selectedEdgeIndex ?? undefined);
    onChange(result);
  }, [onChange, content, selectedEdgeIndex, bodyHasMetadata]);

  // Edge reset handler
  const handleEdgeReset = useCallback((edgeIndex: number) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const result = removeLinkStyles(content, [edgeIndex]);
    onChange(result);
    setSelectedEdgeIndex(null);
  }, [onChange, content, bodyHasMetadata]);

  // Shape insertion handler: adds a new node to the diagram
  const handleAddShape = useCallback((shape: NodeShape) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const existingIds = parsedDiagram.nodes.map(n => n.id);
    const id = generateNodeId(existingIds);
    const result = addNode(content, id, 'New Node', shape);
    mediaContentRef.current = result;
    setPendingSpecialShape(null);
    onChange(result);
    setSelectedNodeIds(new Set([id]));
    setSelectedEdgeIndex(null);
  }, [onChange, content, parsedDiagram, bodyHasMetadata]);

  // Media shape insertion handler: Icon inserts a ready-to-render fa:star node;
  // Image inserts a node and arms the inspector directly on Image upload.
  const handleAddSpecialShape = useCallback((kind: SpecialMediaShape) => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const existingIds = parsedDiagram.nodes.map(n => n.id);
    const id = generateNodeId(existingIds);
    let result = addNode(content, id, 'New Node', 'rect');
    if (kind === 'icon') {
      result = updateNodeIcon(result, id, { icon: 'fa:star' });
      setPendingSpecialShape(null);
    } else {
      setPendingSpecialShape({ nodeId: id, mode: 'img' });
    }
    mediaContentRef.current = result;
    onChange(result);
    setSelectedNodeIds(new Set([id]));
    setSelectedEdgeIndex(null);
  }, [onChange, content, parsedDiagram, bodyHasMetadata]);

  // Delete selected nodes handler
  const handleDeleteSelected = useCallback(() => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    let updated = content;
    selectedNodeIds.forEach(id => { updated = removeNode(updated, id); });
    setSelectedNodeIds(new Set());
    setSelectedEdgeIndex(null);
    onChange(updated);
  }, [onChange, content, selectedNodeIds, bodyHasMetadata]);

  // Delete selected edge handler
  const handleDeleteSelectedEdge = useCallback(() => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    const idx = selectedEdgeIndex ?? -1;
    const edge = parsedEdges[idx];
    if (!edge) return;
    const updated = removeEdge(content, edge.source, edge.target, idx);
    setSelectedEdgeIndex(null);
    onChange(updated);
  }, [onChange, content, parsedEdges, selectedEdgeIndex, bodyHasMetadata]);

  // Delete selected subgraph handler (children de-nest to the root)
  const handleDeleteSelectedSubgraph = useCallback(() => {
    if (!onChange) return;
    if (bodyHasMetadata) return; // D6 fence
    if (selectedSubgraphId === null) return;
    // addSubgraph seeds every new subgraph with a placeholder node carrying
    // the subgraph's own label — it exists so the empty subgraph is visible
    // on the canvas, not as user content. removeSubgraph de-nests children
    // by design, so deleting a freshly-created subgraph re-rooted that seed
    // as an orphan `N1[Subgraph]` line (iter-32 P1, live-witnessed). A seed
    // is recognized by its label still mirroring the subgraph's: once the
    // user renames either side, the node is content and survives.
    const sg = parsedDiagram.subgraphs.find(s => s.id === selectedSubgraphId);
    let updated = content;
    if (sg) {
      parsedDiagram.nodes
        .filter(n => n.parentSubgraphId === selectedSubgraphId && n.label.trim() === sg.label.trim())
        .forEach(n => { updated = removeNode(updated, n.id); });
    }
    updated = removeSubgraph(updated, selectedSubgraphId);
    setSelectedSubgraphId(null);
    onChange(updated);
  }, [onChange, content, parsedDiagram, selectedSubgraphId, bodyHasMetadata]);

  // Keyboard: Delete/Backspace removes the current selection (nodes first,
  // then edge, then subgraph). Skipped while typing in any editable element —
  // inputs, textareas, selects and CodeMirror's contenteditable — so erasing
  // text in the editor or a panel field never deletes diagram content.
  useEffect(() => {
    const onPreviewKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') {return;}
      const hasSelection =
        selectedNodeIds.size > 0 ||
        selectedEdgeIndex !== null ||
        selectedSubgraphId !== null;
      if (!hasSelection) {return;}
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {return;}
      e.preventDefault();
      if (selectedNodeIds.size > 0) {handleDeleteSelected();}
      else if (selectedEdgeIndex !== null) {handleDeleteSelectedEdge();}
      else if (selectedSubgraphId !== null) {handleDeleteSelectedSubgraph();}
    };
    document.addEventListener('keydown', onPreviewKeyDown);
    return () => document.removeEventListener('keydown', onPreviewKeyDown);
  }, [selectedNodeIds, selectedEdgeIndex, selectedSubgraphId, handleDeleteSelected, handleDeleteSelectedEdge, handleDeleteSelectedSubgraph]);

  // Drop handler: adds a shape when dragged onto the canvas, or moves node to root
  const handleDropOnCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // D6 fence: body-metadata content is never rewritten.
    if (bodyHasMetadata) return;
    // If dragging a node over the canvas (not a shape from toolbar), move to root
    if (dragNodeId && onChange) {
      onChange(moveNodeToSubgraph(content, dragNodeId, null));
      setDragNodeId(null);
      setDragOverSubgraphId(null);
      return;
    }
    if (dragSpecialShape) {
      handleAddSpecialShape(dragSpecialShape);
      setDragSpecialShape(null);
      return;
    }
    if (!dragShape) return;
    handleAddShape(dragShape);
    setDragShape(null);
  }, [dragShape, dragSpecialShape, dragNodeId, handleAddShape, handleAddSpecialShape, onChange, content, bodyHasMetadata]);

  // Pan handlers for unlimited drag navigation in all directions (up, down, left, right)
  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    // Enable drag on left or middle click when pressing on canvas background
    if ((e.button !== 0 && e.button !== 1) || !containerRef.current) return;
    didPanRef.current = false;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    e.preventDefault();
  }, []);

  // Global mousemove/mouseup listeners for unlimited 1:1 panning
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        didPanRef.current = true;
      }
      panStartRef.current = { x: e.clientX, y: e.clientY };
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const handleMouseUp = () => setIsPanning(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  // Single-finger touch panning in all directions on mobile/tablet
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchActive = false;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchActive = false;
        return;
      }
      const target = e.target as Element | null;
      if (target?.closest('button, input, select, textarea, a')) return;
      touchActive = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchActive || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      e.preventDefault();
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const onTouchEnd = () => {
      touchActive = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setZoom(z => {
      const step = Math.abs(delta) >= 0.2 && z <= 0.25 && delta < 0 ? -0.05 : delta;
      return Math.max(0.05, Math.min(10, z + step));
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {return;}
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(0.25);
      } else if (e.key === '-') {
        e.preventDefault();
        zoomBy(-0.25);
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomBy]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {return;}

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const clampedDeltaY = Math.max(-50, Math.min(50, e.deltaY));
        zoomBy(-clampedDeltaY * 0.0025);
      } else {
        setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  async function copySvg() {
    if (!renderedSnapshot) {return;}
    // Same pipeline as the preview and exports so the clipboard SVG matches
    // what the user sees (incl. the edge-fill cleanup).
    await navigator.clipboard.writeText(
      svgPostProcessing.postProcessDiagramSvg(renderedSnapshot.svg, renderedSnapshot.parsedDiagram)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleFitToScreen = useCallback(() => {
    if (!shadowHostRef.current?.shadowRoot) {return;}

    const svgElement = shadowHostRef.current.shadowRoot.querySelector('svg');
    if (!svgElement) {return;}

    const { width: naturalWidth, height: naturalHeight } = svgNaturalSizeRef.current;

    if (naturalWidth === 0 || naturalHeight === 0) {return;}

    const viewport = containerRef.current;
    if (!viewport) {return;}

    const containerRect = viewport.getBoundingClientRect();
    const padding = 32;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;

    const scaleX = availableWidth / naturalWidth;
    const scaleY = availableHeight / naturalHeight;

    // Use min to ensure entire diagram fits in view
    const optimalZoom = Math.min(scaleX, scaleY);

    // Cap zoom between 0.05x (5%) and 10x so wide network/architecture topologies fit completely
    const finalZoom = Math.max(0.05, Math.min(optimalZoom, 10));

    setZoom(finalZoom);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div data-testid="preview-panel" className="flex flex-col h-full relative" style={{ background: 'var(--surface-raised)' }}>
      {/* Toolbar — mobile mirrors the Android native app's preview bar
          (user walk 2026-10-07): no type badge, no zoom % (the Android app
          ships both max-md:hidden), and the icon row is FIXED and evenly
          spread (max-md:flex-1 justify-between) instead of a horizontal
          scroller — a toolbar that pans sideways read as a grabbable
          surface and fed the drag-the-workspace complaint. Glyph deltas
          kept deliberately: the web's 1:1 reset beat Android's RefreshCw
          (iter-31: read as "reload page") and Scan fit is equivalent. */}
      <div className="flex items-center justify-between gap-2 px-3 min-h-12 shrink-0 border-b max-md:pl-2 max-md:pr-2 max-md:overflow-hidden"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 shrink-0">
          {/* "Preview" label hidden on mobile (iter-25 P1: it duplicated the
              Visual segment name and crowded the zoom row past the viewport
              — the Flowchart type badge alone carries the context). */}
          <span className="hidden lg:inline text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('preview.title')}</span>
          <span className="px-1.5 py-0.5 rounded-sm text-xs font-semibold border shrink-0 max-md:hidden"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),0.2)' }}>
            {DIAGRAM_LABELS[type]}
          </span>
          {loading && <RefreshCw size={11} style={{ color: 'var(--text-tertiary)' }} className="animate-spin" />}
        </div>
        <div className="flex items-center gap-1 min-w-0 max-md:flex-1 max-md:justify-between overflow-x-auto max-md:overflow-hidden">
          <button onClick={() => setZoom(z => Math.max(0.05, z <= 0.25 ? Math.round((z - 0.05) * 100) / 100 : z - 0.25))} title={t('preview.zoomOut')} aria-label={t('preview.zoomOut')}
            className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
            <ZoomOut size={16} />
          </button>
          <span className="text-xs w-8 text-center shrink-0 max-md:hidden" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(10, z < 0.25 ? Math.min(0.25, Math.round((z + 0.05) * 100) / 100) : z + 0.25))} title={t('preview.zoomIn')} aria-label={t('preview.zoomIn')}
            className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title={t('preview.resetZoom')} aria-label={t('preview.resetZoom')}
            className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
            {/* "1:1" text glyph — the standard reset-zoom affordance in
                diagram editors (RefreshCw read as "reload page", iter-31). */}
            <span className="text-[11px] font-semibold leading-none">1:1</span>
          </button>
          <button
            data-testid="fit-button"
            onClick={handleFitToScreen}
            title={t('preview.fitToScreen')} aria-label={t('preview.fitToScreen')}
            className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
            <Scan size={16} />
          </button>
          {onFullscreen && (
            <button
              data-testid="fullscreen-button"
              onClick={onFullscreen}
              title={t('preview.fullscreenPreview')} aria-label={t('preview.fullscreenPreview')}
              className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
              <Maximize2 size={16} />
            </button>
          )}
          {onChange && supportsVisualEditing && (
            <button
              data-testid="add-subgraph-button"
              onClick={handleAddSubgraph}
              title={t('preview.addSubgraph')} aria-label={t('preview.addSubgraph')}
              className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-md text-xs font-medium transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] shrink-0 max-md:px-0 max-md:w-11 max-md:justify-center"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Group size={14} />
              <span className="max-md:hidden">{t('preview.subgraph')}</span>
            </button>
          )}
          <div className="w-px h-4 mx-1 shrink-0 max-md:hidden" style={{ background: 'var(--border-subtle)' }} />
          {/* Copy SVG is desktop-only: on mobile the Export sheet already
             offers Copy-as-Markdown + share link, and this button was the
             toolbar's overflow casualty (fully off-screen at 390px,
             iter-12/13). */}
          {!isMobilePreview && (
            <button onClick={copySvg} title={t('preview.copySvg')} aria-label={t('preview.copySvg')}
              className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          )}
          {onExport && (
            <button onClick={onExport} title={t('preview.export')} aria-label={t('preview.export')}
              className={`w-11 h-11 inline-flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-tertiary)' }}>
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {supportsVisualEditing && (
        <ShapeToolbar
          toolMode={toolMode}
          onToolMode={setToolMode}
          onAddShape={handleAddShape}
          onDragStart={shape => setDragShape(shape)}
          onAddSpecialShape={handleAddSpecialShape}
          onDragStartSpecial={shape => setDragSpecialShape(shape)}
        />
      )}

      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden preview-grid relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onClick={handleCanvasClick}
        onMouseDown={handlePanMouseDown}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropOnCanvas}
        style={{
          touchAction: isPanning ? 'none' : 'pan-x pan-y pinch-zoom',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="error-message" role="alert"
            style={{ background: 'var(--surface-base)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            </div>
            {/* Error card (critique iter-9 P0: this state was a gray parser
                dump with zero affordances — a dead end at the exact moment a
                first-time user should see their diagram). Danger-tinted
                title, and a real recovery path when the host can switch to
                the code pane. iter-32 P1: the card rendered TRANSPARENT over
                the visual editor's stale canvas (last good parse keeps
                painting as DOM shapes — the SVG ternary unmounts, the model
                doesn't), composing an unreadable soup at the exact moment
                of failure. Opaque surface + role=alert (Riley: the error
                existed in the DOM but was never announced). */}
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--danger)' }}>{t('preview.parseError')}</p>
            <p className="text-xs font-mono max-w-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: 'var(--text-secondary)' }}>
              {error.replace(/^Parse error\s*/i, '')}
            </p>
            {onOpenCode && (
              <button
                type="button"
                onClick={onOpenCode}
                className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--accent)', color: '#ffffff' }}>
                {t('preview.openInCode')}
              </button>
            )}
          </div>
        ) : !svg && !loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 opacity-30"
              style={{ background: 'var(--surface-floating)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <path d="M7 10v4M7 14h10M17 14v-4" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('preview.startTyping')}</p>
          </div>
        ) : (
          <div
            ref={relativeContainerRef}
            data-pan-layer=""
            className="relative h-full w-full p-8"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'visible',
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
              willChange: isPanning ? 'transform' : undefined,
            }}
          >
            <div
              ref={sizingWrapperRef}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: svgNaturalSize.width ? svgNaturalSize.width * zoom : '100%',
                height: svgNaturalSize.height ? svgNaturalSize.height * zoom : '100%',
              }}
            >
              <div
                ref={shadowHostRef}
                data-shadow-host=""
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: svgNaturalSize.width || '100%',
                  height: svgNaturalSize.height || '100%',
                }}
              />
            </div>

            {nodeOverlays.map(overlay => {
              const isSelected = selectedNodeIds.has(overlay.id);
              const isConnectSource = connectFirst === overlay.id;
              const isDragging = dragNodeId === overlay.id;
              // If we are dragging SOME node, all OTHER node overlays should ignore pointer events
              // so they don't block the drop target (subgraphs).
              // BUT the dragging node itself must keep pointer events auto to finish the drag.
              const shouldBlockClicks = !!dragNodeId && !isDragging;

              return (
                <div
                  key={overlay.id}
                  role={toolMode === 'select' && supportsVisualEditing ? 'button' : undefined}
                  tabIndex={toolMode === 'select' && supportsVisualEditing ? 0 : undefined}
                  aria-label={t('preview.clickToEdit', { id: overlay.id })}
                  onKeyDown={e => {
                    // Keyboard parity for node selection (iter-12 P1: a
                    // 26-stop Tab walk found ZERO canvas stops — selecting,
                    // styling, deleting a node was pointer-only).
                    if ((e.key === 'Enter' || e.key === ' ') && toolMode === 'select' && supportsVisualEditing) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNodeClick(e, overlay.id);
                    }
                  }}
                  onClick={e => handleNodeClick(e, overlay.id)}
                  onMouseDown={e => {
                    // Prevent canvas drag when clicking on nodes
                    e.stopPropagation();
                  }}
                  draggable={toolMode === 'select' && supportsVisualEditing ? true : undefined}
                  onDragStart={e => {
                    if (!supportsVisualEditing) return;
                    console.log('DRAG START - Node:', overlay.id);
                    setDragNodeId(overlay.id);
                    // Explicitly check for dataTransfer presence
                    if (e.dataTransfer) {
                      e.dataTransfer.setData('text/plain', overlay.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }
                  }}
                  onDragEnd={() => {
                    console.log('DRAG END - Node:', overlay.id);
                    setDragNodeId(null);
                    setDragOverSubgraphId(null);
                  }}
                  className={`node-overlay ${isSelected ? 'selected' : ''} ${isConnectSource ? 'connect-source' : ''}`}
                  style={{
                    position: 'absolute',
                    left: overlay.x,
                    top: overlay.y,
                    width: overlay.width,
                    height: overlay.height,
                    cursor: toolMode === 'connect' ? 'crosshair' : (supportsVisualEditing ? 'pointer' : 'default'),
                    zIndex: isDragging ? 10 : 5,
                    border: isSelected ? '2px solid var(--accent)' : isConnectSource ? '2px dashed var(--accent)' : '2px solid transparent',
                    borderRadius: '4px',
                    transition: 'border-color 0.15s',
                    background: isConnectSource ? 'rgba(var(--accent-rgb), 0.1)' : undefined,
                    opacity: isDragging ? 0.5 : undefined,
                    pointerEvents: shouldBlockClicks ? 'none' : 'auto',
                  }}
                  title={supportsVisualEditing ? t('preview.clickToEdit', { id: overlay.id }) : overlay.id}
                />
              );
            })}

            {subgraphOverlays.map(sg => {
              const isSelected = selectedSubgraphId === sg.id;
              const isCollapsedSubgraph = Boolean(
                sg.isCollapsed || parsedDiagram.subgraphs.find(s => s.id === sg.id)?.view === 'collapsed',
              );
              const isDropTarget = !isCollapsedSubgraph && dragOverSubgraphId === sg.id;
              const isConnectSource = connectFirst === sg.id;
              const title = supportsVisualEditing ? (toolMode === 'connect' ? `Click to connect from/to ${sg.id}` : t('preview.clickToEditSubgraph')) : sg.label;
              return (
                <React.Fragment key={`sg-${sg.id}`}>
                  {/* Full-cluster outline: visual state only. pointerEvents is
                      disabled except while a node is being dragged (drop
                      target) — covering the whole cluster above the node
                      overlays (z 5) used to swallow every click aimed at a
                      node inside the subgraph. */}
                  <div
                    className="subgraph-overlay"
                    onDragOver={e => {
                      if (isCollapsedSubgraph) {return;}
                      e.preventDefault();
                      if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'move';
                      }
                      setDragOverSubgraphId(sg.id);
                    }}
                    onDragLeave={() => setDragOverSubgraphId(null)}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isCollapsedSubgraph) {
                        setDragNodeId(null);
                        setDragOverSubgraphId(null);
                        return;
                      }
                      // Fallback to dataTransfer if dragNodeId state is lost
                      const droppedId = dragNodeId || e.dataTransfer.getData('text/plain');
                      console.log('SUBGRAPH DROP - state dragNodeId:', dragNodeId, 'dt droppedId:', droppedId, 'target sgId:', sg.id);

                      if (droppedId && onChange && !bodyHasMetadata) {
                        // (D6 fence: body-metadata content is never rewritten)
                        onChange(moveNodeToSubgraph(content, droppedId, sg.id));
                      }
                      setDragNodeId(null);
                      setDragOverSubgraphId(null);
                    }}
                    style={{
                      position: 'absolute',
                      left: sg.clusterX,
                      top: sg.clusterY,
                      width: sg.clusterWidth,
                      height: sg.clusterHeight,
                      // Subgraphs must be above nodes for drag-drop, but below dragging nodes
                      zIndex: dragNodeId ? 8 : 6,
                      pointerEvents: dragNodeId && !isCollapsedSubgraph ? 'auto' : 'none',
                      border: isSelected ? '2px solid var(--accent)' : (isConnectSource || isDropTarget) ? '2px dashed var(--accent)' : '2px solid transparent',
                      borderRadius: '4px',
                      background: isConnectSource ? 'rgba(var(--accent-rgb), 0.1)' : (isDropTarget ? 'rgba(var(--accent-rgb), 0.08)' : undefined),
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  />
                  {/* Label strip (top 30px of the cluster, computed by
                      extractSubgraphOverlays): the only always-clickable
                      subgraph area, above the node overlays so subgraph
                      selection and connect-from-subgraph stay reachable. */}
                  <div
                    data-testid="subgraph-label-hit"
                    className="subgraph-label-hit"
                    onClick={e => handleSubgraphClick(e, sg.id)}
                    onMouseDown={e => {
                      // Prevent canvas drag when clicking on subgraphs
                      e.stopPropagation();
                    }}
                    style={{
                      position: 'absolute',
                      left: sg.x,
                      top: sg.y,
                      width: sg.width,
                      height: sg.height,
                      cursor: toolMode === 'connect' ? 'crosshair' : (supportsVisualEditing ? 'pointer' : 'default'),
                      zIndex: toolMode === 'connect' ? 16 : 7,
                      borderRadius: '4px 4px 0 0',
                    }}
                    title={title}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {selectedEdgeIndex !== null && parsedEdges[selectedEdgeIndex] && supportsVisualEditing && (
        <EdgeStylePanel
          edge={parsedEdges[selectedEdgeIndex]}
          edgeIndex={selectedEdgeIndex}
          edgeStyle={{
            ...(parsedLinkStyles.get('default') ?? {}),
            ...(parsedLinkStyles.get(selectedEdgeIndex) ?? {}),
          }}
          edgeMeta={parsedEdges[selectedEdgeIndex].metadata ?? null}
          onAnimateChange={handleEdgeAnimateChange}
          onEdgeMetaChange={handleEdgeMetaChange}
          onEdgeIdChange={handleEdgeIdChange}
          onEdgeLengthChange={handleEdgeLengthChange}
          onAnimatePreset={handleAnimatePreset}
          onClose={() => setSelectedEdgeIndex(null)}
          onArrowChange={handleEdgeArrowChange}
          onLabelChange={handleEdgeLabelChange}
          onStyleChange={handleEdgeStyleChange}
          onReset={handleEdgeReset}
          onDelete={handleDeleteSelectedEdge}
        />
      )}

      {selectedSubgraphId !== null && supportsVisualEditing && (
        <SubgraphStylePanel
          subgraphId={selectedSubgraphId}
          subgraphLabel={subgraphList.find(sg => sg.id === selectedSubgraphId)?.label ?? ''}
          subgraphStyle={parsedStyles.get(selectedSubgraphId) ?? {}}
          onClose={() => setSelectedSubgraphId(null)}
          onStyleChange={handleSubgraphStyleChange}
          onLabelChange={handleSubgraphLabelChange}
          onReset={handleSubgraphReset}
          onDelete={handleDeleteSelectedSubgraph}
          subgraphView={selectedSubgraphView}
          onViewChange={handleSubgraphViewChange}
        />
      )}

      {selectedNodeIds.size > 0 && supportsVisualEditing && (
        <NodeStylePanel
          selectedNodeIds={Array.from(selectedNodeIds)}
          nodeStyles={Array.from(selectedNodeIds).map(id => panelStyles.get(id) ?? {})}
          nodeShapes={Array.from(selectedNodeIds).map(id => parsedDiagram.nodes.find(n => n.id === id)?.shape ?? 'rect')}
          nodeLabels={panelLabels}
          onClose={() => setSelectedNodeIds(new Set())}
          onStyleChange={handleStyleChange}
          onShapeChange={handleNodeShapeChange}
          nodeIcon={sharedNodeIcon}
          nodeImage={sharedNodeImage}
          onIconChange={handleNodeIconChange}
          onImageChange={handleNodeImageChange}
          initialMediaMode={
            selectedNodeList.length === 1 && pendingSpecialShape?.nodeId === selectedNodeList[0]
              ? pendingSpecialShape.mode
              : null
          }
          onLabelChange={handleNodeLabelChange}
          onReset={handleResetStyles}
          hideBorderRadius={hideNodeBorderRadius}
          nodeSubgraphIds={nodeSubgraphIds}
          subgraphs={subgraphList}
          onSubgraphChange={handleSubgraphChange}
          presets={nodePresets}
          onPresetApply={handlePresetApply}
          onDelete={handleDeleteSelected}
        />
      )}
    </div>
  );
}

// Memoize PreviewPanel to prevent unnecessary re-renders from parent state changes
// Only re-renders when content, theme, themeId, onChange, onExport, onRenderTime, etc. actually change
export const PreviewPanel = React.memo(PreviewPanelInner);
