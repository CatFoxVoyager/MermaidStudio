import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Copy, Check, Download, Move, Group, Hand } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core';
import { extractThemeIdFromContent } from '@/constants/themeDerivation';
import { getThemeById } from '@/constants/themes';
import { sanitizeSVG } from '@/utils/sanitization';
import { fixDiagramLabels, applyEdgeFontStyles, applyNodeFontStyles } from '@/utils/svgPostProcessing';
import { parseDiagram, getNodeStyle, removeNodeStyles, parseFrontmatter, updateLinkStyle, removeLinkStyles, updateEdgeArrowType, updateEdgeLabel, parseLinkStyles, edgeStyleToString, updateNodeStyle, addNode, addEdge, generateNodeId, removeNode, updateNodeLabel, updateSubgraphLabel, addSubgraph, moveNodeToSubgraph, applyNodePreset, updatePresetColors } from '@/lib/mermaid/codeUtils';
import type { NodeStyle, EdgeStyle, ParsedEdge, NodeShape, PresetType, PresetColors } from '@/lib/mermaid/codeUtils';
import { NodeStylePanel } from './NodeStylePanel';
import { EdgeStylePanel } from './EdgeStylePanel';
import { SubgraphStylePanel } from './SubgraphStylePanel';
import { ShapeToolbar } from '../visual/ShapeToolbar';
import { getStylingCapabilities } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  flowchart: 'Flowchart', sequence: 'Sequence', classDiagram: 'Class',
  stateDiagram: 'State', erDiagram: 'ER', gantt: 'Gantt',
  pie: 'Pie', mindmap: 'Mindmap', gitGraph: 'Git Graph', unknown: 'Diagram',
};

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
}

function extractSvgNodes(outerContainer: HTMLDivElement, shadowHost: HTMLDivElement): NodeOverlay[] {
  // Find SVG in Shadow DOM
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return [];

  const svg = shadowRoot.querySelector('svg');
  if (!svg) {return [];}

  const nodeElements = svg.querySelectorAll('g.node, g.nodeLabel');
  const overlays: NodeOverlay[] = [];
  const seen = new Set<string>();

  // Account for scroll offset
  const scrollLeft = outerContainer.scrollLeft;
  const scrollTop = outerContainer.scrollTop;

  nodeElements.forEach(el => {
    const idAttr = el.id ?? '';
    const flowchartMatch = idAttr.match(/flowchart-([^-]+)-\d+/);
    const nodeId = flowchartMatch ? flowchartMatch[1] : null;
    if (!nodeId || seen.has(nodeId)) {return;}
    seen.add(nodeId);

    try {
      const rect = el.getBoundingClientRect();
      const containerRect = outerContainer.getBoundingClientRect();
      overlays.push({
        id: nodeId,
        x: rect.left - containerRect.left + scrollLeft,
        y: rect.top - containerRect.top + scrollTop,
        width: rect.width,
        height: rect.height,
      });
    } catch {
      // skip
    }
  });

  return overlays;
}

function extractSubgraphOverlays(outerContainer: HTMLDivElement, shadowHost: HTMLDivElement, knownSubgraphIds: string[]): SubgraphOverlay[] {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return [];

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return [];

  const overlays: SubgraphOverlay[] = [];
  const knownSet = new Set(knownSubgraphIds);

  // Mermaid v11 often uses class "node" for subgraphs, and ID format is "preview_N_TIMESTAMP-subgraphId"
  // We'll look for any g element that has a rect and an ID containing one of our known subgraph IDs.
  const allGs = Array.from(svg.querySelectorAll('g'));
  const candidates: Map<string, SVGElement> = new Map();

  for (const sgId of knownSet) {
    // Look for the best matching G element for this subgraph ID
    const match = allGs.find(g => {
      const id = g.id || '';
      return id === sgId || id.endsWith(`-${sgId}`);
    });

    if (match && match.querySelector('rect')) {
      candidates.set(sgId, match);
    }
  }

  for (const [sgId, el] of candidates) {
    // Try different selectors for label text depending on Mermaid version
    const labelText = el.querySelector('.cluster-label text, .nodeLabel text, .label text, text');
    const label = labelText?.textContent ?? sgId;

    // Account for scroll offset
    const scrollLeft = outerContainer.scrollLeft;
    const scrollTop = outerContainer.scrollTop;

    try {
      const containerRect = outerContainer.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      
      const clusterX = rect.left - containerRect.left + scrollLeft;
      const clusterY = rect.top - containerRect.top + scrollTop;
      const clusterWidth = rect.width;
      const clusterHeight = rect.height;

      // Click target for the label area (Strategy: use the top part of the cluster)
      const x = clusterX;
      const y = clusterY;
      const width = clusterWidth;
      const height = Math.min(clusterHeight, 30); // Use top 30px as label area

      overlays.push({ id: sgId, label, x, y, width, height, clusterX, clusterY, clusterWidth, clusterHeight });
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
): () => void {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return () => {};

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return () => {};

  const edgePaths = svg.querySelectorAll('.edgePaths path.flowchart-link');
  if (edgePaths.length === 0) return () => {};

  // Create a mapping from SVG path index to parsed edge index by matching source/target
  const svgToParsedIndex = new Map<number, number>();

  // Get node positions from SVG for matching
  const nodePositions = new Map<string, { x: number; y: number }>();
  svg.querySelectorAll('.node').forEach((nodeEl) => {
    const transform = nodeEl.getAttribute('transform');
    const nodeId = nodeEl.getAttribute('id') || nodeEl.getAttribute('data-id');
    if (transform && nodeId) {
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        nodePositions.set(nodeId, { x: parseFloat(match[1]), y: parseFloat(match[2]) });
      }
    }
  });

  // For each SVG edge path, find the matching parsed edge by checking path endpoints
  edgePaths.forEach((path, svgIndex) => {
    const d = path.getAttribute('d');
    if (!d) return;

    // Extract path start and end points
    const moveMatch = d.match(/M\s+([-\d.]+)\s+([-\d.]+)/);
    const endMatch = d.match(/([-\d.]+)\s+([-\d.]+)$/);

    if (!moveMatch || !endMatch) {
      // Fallback: use SVG order if we can't parse path
      svgToParsedIndex.set(svgIndex, Math.min(svgIndex, parsedEdges.length - 1));
      return;
    }

    const pathStart = { x: parseFloat(moveMatch[1]), y: parseFloat(moveMatch[2]) };
    const pathEnd = { x: parseFloat(endMatch[1]), y: parseFloat(endMatch[2]) };

    // Find the closest matching parsed edge by checking node positions
    let bestMatch = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < parsedEdges.length; i++) {
      const edge = parsedEdges[i];
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);

      if (!sourcePos || !targetPos) continue;

      // Check if path direction matches source->target or target->source
      const distStartToSource = Math.hypot(pathStart.x - sourcePos.x, pathStart.y - sourcePos.y);
      const distStartToTarget = Math.hypot(pathStart.x - targetPos.x, pathStart.y - targetPos.y);
      const distEndToSource = Math.hypot(pathEnd.x - sourcePos.x, pathEnd.y - sourcePos.y);
      const distEndToTarget = Math.hypot(pathEnd.x - targetPos.x, pathEnd.y - targetPos.y);

      // Edge matches if one endpoint is near source and the other near target
      const forwardMatch = distStartToSource + distEndToTarget;
      const reverseMatch = distStartToTarget + distEndToSource;
      const minMatch = Math.min(forwardMatch, reverseMatch);

      if (minMatch < bestDistance && minMatch < 50) { // 50px tolerance
        bestDistance = minMatch;
        bestMatch = i;
      }
    }

    if (bestMatch !== -1) {
      svgToParsedIndex.set(svgIndex, bestMatch);
    } else {
      // Fallback: use SVG order if no match found
      svgToParsedIndex.set(svgIndex, Math.min(svgIndex, parsedEdges.length - 1));
    }
  });

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
    const parsedIndex = svgToParsedIndex.get(svgIndex) ?? svgIndex;

    hitPath.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onEdgeClick(parsedIndex);
    });

    overlaySvg.appendChild(hitPath);
  });

  containerEl.appendChild(overlaySvg);
  return () => overlaySvg.remove();
}

function highlightSelectedEdge(shadowHost: HTMLDivElement, edgeIndex: number | null, parsedEdges: ParsedEdge[]) {
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return;

  const svg = shadowRoot.querySelector('svg');
  if (!svg) return;

  const edgePaths = svg.querySelectorAll('.edgePaths path.flowchart-link');
  if (edgePaths.length === 0) return;
  if (edgeIndex === null) {
    // Clear all selections
    edgePaths.forEach((path) => {
      (path as SVGPathElement).removeAttribute('data-selected-edge');
      (path as SVGPathElement).style.filter = '';
    });
    return;
  }

  // Get node positions from SVG for matching
  const nodePositions = new Map<string, { x: number; y: number }>();
  svg.querySelectorAll('.node').forEach((nodeEl) => {
    const transform = nodeEl.getAttribute('transform');
    const nodeId = nodeEl.getAttribute('id') || nodeEl.getAttribute('data-id');
    if (transform && nodeId) {
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        nodePositions.set(nodeId, { x: parseFloat(match[1]), y: parseFloat(match[2]) });
      }
    }
  });

  // Find the SVG path index that matches the selected parsed edge
  const selectedEdge = parsedEdges[edgeIndex];
  if (!selectedEdge) return;

  let matchingSvgIndex = -1;
  const sourcePos = nodePositions.get(selectedEdge.source);
  const targetPos = nodePositions.get(selectedEdge.target);

  if (sourcePos && targetPos) {
    let bestDistance = Infinity;
    edgePaths.forEach((path, svgIndex) => {
      const d = path.getAttribute('d');
      if (!d) return;

      const moveMatch = d.match(/M\s+([-\d.]+)\s+([-\d.]+)/);
      const endMatch = d.match(/([-\d.]+)\s+([-\d.]+)$/);
      if (!moveMatch || !endMatch) return;

      const pathStart = { x: parseFloat(moveMatch[1]), y: parseFloat(moveMatch[2]) };
      const pathEnd = { x: parseFloat(endMatch[1]), y: parseFloat(endMatch[2]) };

      const distStartToSource = Math.hypot(pathStart.x - sourcePos.x, pathStart.y - sourcePos.y);
      const distStartToTarget = Math.hypot(pathStart.x - targetPos.x, pathStart.y - targetPos.y);
      const distEndToSource = Math.hypot(pathEnd.x - sourcePos.x, pathEnd.y - sourcePos.y);
      const distEndToTarget = Math.hypot(pathEnd.x - targetPos.x, pathEnd.y - targetPos.y);

      const forwardMatch = distStartToSource + distEndToTarget;
      const reverseMatch = distStartToTarget + distEndToSource;
      const minMatch = Math.min(forwardMatch, reverseMatch);

      if (minMatch < bestDistance && minMatch < 50) {
        bestDistance = minMatch;
        matchingSvgIndex = svgIndex;
      }
    });
  }

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
}

function PreviewPanelInner({ content, theme, themeId, onChange, onExport, onRenderTime, onFullscreen, onNodeSelect, onSelectionOpen, externalPanelOpen }: Props) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [nodeOverlays, setNodeOverlays] = useState<Array<NodeOverlay>>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [panelStyles, setPanelStyles] = useState<Map<string, NodeStyle>>(new Map());
  const [panelLabels, setPanelLabels] = useState<Map<string, string>>(new Map());
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const [parsedEdges, setParsedEdges] = useState<ParsedEdge[]>([]);
  const [parsedLinkStyles, setParsedLinkStyles] = useState<Map<number, EdgeStyle>>(new Map());
  const [toolMode, setToolMode] = useState<'select' | 'connect'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectFirst, setConnectFirst] = useState<string | null>(null);
  const [dragShape, setDragShape] = useState<NodeShape | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOverSubgraphId, setDragOverSubgraphId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgNaturalSizeRef = useRef({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const renderIdRef = useRef(0);
  const contentRef = useRef(content);
  const debounceRef = useRef<number>(0);
  const skipResyncRef = useRef(false);
  const edgeCleanupRef = useRef<(() => void) | null>(null);
  const relativeContainerRef = useRef<HTMLDivElement>(null);
  const [subgraphOverlays, setSubgraphOverlays] = useState<SubgraphOverlay[]>([]);
  const [nodeSubgraphIds, setNodeSubgraphIds] = useState<Map<string, string | null>>(new Map());
  const [subgraphList, setSubgraphList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedSubgraphId, setSelectedSubgraphId] = useState<string | null>(null);
  const [parsedStyles, setParsedStyles] = useState<Map<string, NodeStyle>>(new Map());
  const toolModeRef = useRef(toolMode);

  // Keep refs in sync without accessing them during render
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);

  // Generate node presets based on current theme (syncs with theme changes)
  const nodePresets = useMemo(() => {
    // Try themeId prop first, then extract from content
    const effectiveThemeId = themeId ?? extractThemeIdFromContent(content);
    const currentTheme = effectiveThemeId ? getThemeById(effectiveThemeId) : null;
    const colors = currentTheme?.coreColors;

    return [
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
    ];
  }, [content, themeId, theme]);

  // Get current theme colors and theme ID for preset operations
  const { currentThemeColors, effectiveThemeId } = useMemo(() => {
    const effectiveThemeId = themeId ?? extractThemeIdFromContent(content);
    const currentTheme = effectiveThemeId ? getThemeById(effectiveThemeId) : null;
    const colors = currentTheme?.coreColors;
    return {
      effectiveThemeId,
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
    if (!hasPresets) return;

    // Update all preset classDef colors in the diagram
    const updated = updatePresetColors(content, currentThemeColors);
    if (updated !== content && onChange) {
      skipResyncRef.current = true;
      onChange(updated);
    }
  }, [effectiveThemeId, content, currentThemeColors]);

  const type = detectDiagramType(content);
  const stylingCapabilities = getStylingCapabilities(type);
  const supportsClassDef = stylingCapabilities.supportsClassDef;

  // Keep zoomRef in sync with zoom state
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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
      onRenderTime?.(elapsed);

      if (e) {
        setError(e);
        setSvg('');
      } else {
        // Add data-rendered attribute to SVG for E2E tests
        // Simply replace the first <svg occurrence
        const svgWithAttr = s.replace('<svg', '<svg data-rendered="true"');
        setSvg(svgWithAttr);
        setError(null);
      }
    } finally {
      // Always clear loading state, even if render was cancelled
      if (id === renderIdRef.current) {
        setLoading(false);
      }
    }
  }, [content, onRenderTime, themeId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, 400);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  // Setup Shadow DOM for SVG isolation
  useEffect(() => {
    if (!shadowHostRef.current) return;

    // Clean up shadow root when svg is cleared (e.g. after a parse error)
    if (!svg) {
      if (shadowHostRef.current.shadowRoot) {
        shadowHostRef.current.shadowRoot.textContent = '';
      }
      return;
    }

    // Clean up previous shadow root
    if (shadowHostRef.current.shadowRoot) {
      shadowHostRef.current.shadowRoot.textContent = '';
    }

    // Create shadow root only if it doesn't exist
    if (!shadowHostRef.current.shadowRoot) {
      shadowHostRef.current.attachShadow({ mode: 'open' });
    }

    const shadowRoot = shadowHostRef.current.shadowRoot;
    if (!shadowRoot) return;

    // Extract theme variables from content and define them in Shadow DOM
    let shadowCSS = ':host { all: initial; }\n';
    let fontFamily = '';
    let fontSize = '';

    try {
      const { frontmatter } = parseFrontmatter(content);
      const config = frontmatter.config as Record<string, any>;
      const themeVars = config?.themeVariables as Record<string, string> | undefined;

      // Extract font settings for direct CSS application
      if (themeVars) {
        fontFamily = themeVars.fontFamily || '';
        fontSize = themeVars.fontSize || '';

        // Map Mermaid theme variables to CSS variables
        const cssVars: string[] = [];
        for (const [key, value] of Object.entries(themeVars)) {
          if (typeof value === 'string') {
            cssVars.push(`  --${key}: ${value};`);
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

    // Create style element with theme variables
    const styleEl = document.createElement('style');
    styleEl.textContent = shadowCSS;
    shadowRoot.appendChild(styleEl);

    // Create container for SVG — apply edge and node font styles via SVG post-processing
    const svgContainer = document.createElement('div');
    svgContainer.className = 'mermaid';

    // Extract font-related node styles for post-processing
    const nodeFontStyles = new Map<string, { fontSize?: string; fontWeight?: string; color?: string }>();
    parsedStyles.forEach((style, nodeId) => {
      const fontStyle: { fontSize?: string; fontWeight?: string; color?: string } = {};
      if (style.fontSize) fontStyle.fontSize = style.fontSize;
      if (style.fontWeight) fontStyle.fontWeight = style.fontWeight;
      if (style.color) fontStyle.color = style.color;
      if (Object.keys(fontStyle).length > 0) {
        nodeFontStyles.set(nodeId, fontStyle);
      }
    });

    svgContainer.innerHTML = applyNodeFontStyles(
      applyEdgeFontStyles(fixDiagramLabels(sanitizeSVG(svg)), parsedLinkStyles, parsedEdges),
      nodeFontStyles
    );
    shadowRoot.appendChild(svgContainer);

    // Store reference for size calculations (pointing to SVG container in Shadow DOM)
    svgContainerRef.current = svgContainer as unknown as HTMLDivElement;

    // Capture SVG natural size for fit-to-screen
    const svgElement = svgContainer.querySelector('svg');
    if (svgElement) {
      svgNaturalSizeRef.current = {
        width: svgElement.getAttribute('width') ? parseFloat(svgElement.getAttribute('width')!) : 0,
        height: svgElement.getAttribute('height') ? parseFloat(svgElement.getAttribute('height')!) : 0,
      };
      // If no explicit size, use viewBox
      if (svgNaturalSizeRef.current.width === 0 || svgNaturalSizeRef.current.height === 0) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const [, , w, h] = viewBox.split(/\s+/).map(Number);
          svgNaturalSizeRef.current = { width: w, height: h };
        }
      }
    }

    // Inject edge click hit targets (must be after SVG is in DOM)
    if (supportsClassDef && relativeContainerRef.current) {
      edgeCleanupRef.current = addEdgeClickTargets(shadowHostRef.current, relativeContainerRef.current, (index) => {
        if (toolModeRef.current === 'connect') return;
        setSelectedNodeIds(new Set());
        setSelectedSubgraphId(null);
        setSelectedEdgeIndex(prev => {
          const willSelect = prev !== index;
          if (willSelect) onSelectionOpen?.();
          return willSelect ? index : null;
        });
      }, parsedEdges);
    }

  }, [svg, content, parsedEdges, panelStyles, parsedLinkStyles]);

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

  // Extract node overlays after SVG renders
  useEffect(() => {
    if (!svg || !svgContainerRef.current || !containerRef.current || !shadowHostRef.current) return;
    
    // Inject custom centering styles into shadow root
    const shadowRoot = shadowHostRef.current.shadowRoot;
    if (shadowRoot) {
      const styleId = 'mermaid-centering-fix';
      if (!shadowRoot.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          foreignObject > div, 
          foreignObject > span,
          .nodeLabel,
          .cluster-label,
          .label {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 100% !important;
            width: 100% !important;
            line-height: 1 !important;
            text-align: center !important;
            pointer-events: auto !important;
          }

          /* Ensure containers don't block clicks to elements behind them */
          foreignObject,
          .cluster-label {
            pointer-events: none !important;
          }
          
          /* Subgraph label centering (SVG and HTML) */
          .cluster-label text,
          .label text {
            dominant-baseline: hanging !important;
            text-anchor: middle !important;
            y: 0 !important;
          }
        `;
        shadowRoot.appendChild(style);
      }
    }

    const timer = setTimeout(() => {
      const nodes = extractSvgNodes(containerRef.current!, shadowHostRef.current!);
      setNodeOverlays(nodes);
      const knownIds = subgraphList.map(sg => sg.id);
      const subgraphs = extractSubgraphOverlays(containerRef.current!, shadowHostRef.current!, knownIds);
      setSubgraphOverlays(subgraphs);
    }, 100);
    return () => clearTimeout(timer);
  }, [svg, zoom, subgraphList]);

  // Update overlay positions on scroll (immediate, not debounced)
  useEffect(() => {
    if (!svg || !containerRef.current || !shadowHostRef.current) return;
    const scrollableContainer = containerRef.current;

    const handleScroll = () => {
      const nodes = extractSvgNodes(scrollableContainer, shadowHostRef.current!);
      setNodeOverlays(nodes);
      const knownIds = subgraphList.map(sg => sg.id);
      const subgraphs = extractSubgraphOverlays(scrollableContainer, shadowHostRef.current!, knownIds);
      setSubgraphOverlays(subgraphs);
    };

    scrollableContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollableContainer.removeEventListener('scroll', handleScroll);
    };
  }, [svg, zoom, subgraphList]);

  // Highlight selected edge when selection changes
  useEffect(() => {
    if (!shadowHostRef.current) return;
    highlightSelectedEdge(shadowHostRef.current, selectedEdgeIndex, parsedEdges);
  }, [selectedEdgeIndex, svg, parsedEdges]);

  // Parse diagram and initialize node/label/style data
  useEffect(() => {
    if (!supportsClassDef) return;
    const parsed = parseDiagram(content);
    const labels = new Map<string, string>();
    const styles = new Map<string, NodeStyle>();
    const subgraphIds = new Map<string, string | null>();
    for (const node of parsed.nodes) {
      labels.set(node.id, node.label);
      styles.set(node.id, getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, node.id));
      subgraphIds.set(node.id, node.parentSubgraphId ?? null);
    }
    setPanelLabels(labels);
    setPanelStyles(styles);
    setParsedEdges(parsed.edges);
    setParsedLinkStyles(parsed.linkStyles);
    setNodeSubgraphIds(subgraphIds);
    setSubgraphList(parsed.subgraphs.map(sg => ({ id: sg.id, label: sg.label })));
    setParsedStyles(parsed.styles);
  }, [content, supportsClassDef]);

  // Auto-resync: update panel styles when content changes from code editor
  useEffect(() => {
    if (!supportsClassDef || selectedNodeIds.size === 0 || skipResyncRef.current) {
      skipResyncRef.current = false;
      return;
    }
    const parsed = parseDiagram(content);
    const updatedStyles = new Map<string, NodeStyle>();
    for (const nodeId of selectedNodeIds) {
      const nodeStyle = getNodeStyle(parsed.styles, parsed.classDefs, parsed.nodeClasses, nodeId);
      updatedStyles.set(nodeId, nodeStyle);
    }
    setPanelStyles(updatedStyles);
  }, [content, supportsClassDef, selectedNodeIds]);

  // Node click handler with multi-node selection (shift+click)
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!supportsClassDef) return;
    setSelectedEdgeIndex(null);
    setSelectedSubgraphId(null);
    if (toolMode === 'connect') {
      if (!connectFirst) {
        setConnectFirst(nodeId);
        return;
      }
      if (connectFirst !== nodeId) {
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
  }, [supportsClassDef, onNodeSelect, onSelectionOpen, toolMode, connectFirst, onChange, content, selectedNodeIds]);

  const handleAddSubgraph = useCallback(() => {
    if (!onChange) return;
    onChange(addSubgraph(content, undefined, t('preview.subgraph')));
  }, [onChange, content, t]);

  const handleSubgraphClick = useCallback((e: React.MouseEvent, subgraphId: string) => {
    e.stopPropagation();
    if (!supportsClassDef) return;

    // Handle connect mode for subgraphs (connect subgraph-to-node or subgraph-to-subgraph)
    if (toolMode === 'connect') {
      setSelectedEdgeIndex(null);
      if (!connectFirst) {
        setConnectFirst(subgraphId);
        setSelectedSubgraphId(null);
        return;
      }
      if (connectFirst !== subgraphId && onChange) {
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
  }, [supportsClassDef, onSelectionOpen, toolMode, connectFirst, onChange, content]);

  const handleSubgraphStyleChange = useCallback((subgraphId: string, styleUpdate: Partial<NodeStyle>) => {
    if (!onChange) return;
    const existingStyle = parsedStyles.get(subgraphId) ?? {};
    const mergedStyle = { ...existingStyle, ...styleUpdate };
    const result = updateNodeStyle(content, subgraphId, mergedStyle);
    onChange(result);
  }, [onChange, content, parsedStyles]);

  const handleSubgraphLabelChange = useCallback((subgraphId: string, newLabel: string) => {
    if (!onChange) return;
    const result = updateSubgraphLabel(content, subgraphId, newLabel);
    onChange(result);
  }, [onChange, content]);

  const handleSubgraphReset = useCallback((subgraphId: string) => {
    if (!onChange) return;
    const result = removeNodeStyles(content, [subgraphId]);
    onChange(result);
    setSelectedSubgraphId(null);
  }, [onChange, content]);

  const handleCanvasClick = useCallback(() => {
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
    skipResyncRef.current = true;

    // Update panelStyles immediately so UI reflects the change
    setPanelStyles(prev => {
      const next = new Map(prev);
      for (const nodeId of nodeIds) {
        const existing = next.get(nodeId) ?? {};
        next.set(nodeId, { ...existing, ...styleUpdate });
      }
      return next;
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
  }, [onChange, content, panelStyles]);

  // Reset handler: removes all classDef/class lines for selected nodes
  const handleResetStyles = useCallback((nodeIds: string[]) => {
    if (!onChange) return;
    skipResyncRef.current = true;
    const result = removeNodeStyles(content, nodeIds);
    onChange(result);
    setSelectedNodeIds(new Set());
  }, [onChange, content]);

  // Subgraph change handler: moves a node to a different subgraph
  const handleSubgraphChange = useCallback((nodeId: string, subgraphId: string | null) => {
    if (!onChange) return;
    const result = moveNodeToSubgraph(content, nodeId, subgraphId);
    onChange(result);
  }, [onChange, content]);

  // Preset handler: applies a preset using classDef
  const handlePresetApply = useCallback((nodeIds: string[], presetType: PresetType) => {
    if (!onChange) return;
    skipResyncRef.current = true;

    // Remove old styles for these nodes first
    let result = removeNodeStyles(content, nodeIds);

    // Apply the preset
    result = applyNodePreset(result, nodeIds, presetType, currentThemeColors);

    onChange(result);
  }, [onChange, content, currentThemeColors]);

  // Edge style change handler
  const handleEdgeStyleChange = useCallback((edgeIndex: number, styleUpdate: Partial<EdgeStyle>) => {
    if (!onChange) return;
    const existingStyle = parsedLinkStyles.get(edgeIndex) ?? {};
    const mergedStyle = { ...existingStyle, ...styleUpdate };
    const result = updateLinkStyle(content, edgeIndex, mergedStyle);
    onChange(result);
  }, [onChange, content, parsedLinkStyles]);

  // Edge arrow type change handler
  const handleEdgeArrowChange = useCallback((source: string, target: string, arrowType: string) => {
    if (!onChange) return;
    const result = updateEdgeArrowType(content, source, target, arrowType);
    onChange(result);
  }, [onChange, content]);

  // Node label change handler
  const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
    if (!onChange) return;
    const result = updateNodeLabel(content, nodeId, newLabel);
    onChange(result);
  }, [onChange, content]);

  // Edge label change handler
  const handleEdgeLabelChange = useCallback((source: string, target: string, label: string) => {
    if (!onChange) return;
    const result = updateEdgeLabel(content, source, target, label);
    onChange(result);
  }, [onChange, content]);

  // Edge reset handler
  const handleEdgeReset = useCallback((edgeIndex: number) => {
    if (!onChange) return;
    const result = removeLinkStyles(content, [edgeIndex]);
    onChange(result);
    setSelectedEdgeIndex(null);
  }, [onChange, content]);

  // Shape insertion handler: adds a new node to the diagram
  const handleAddShape = useCallback((shape: NodeShape) => {
    if (!onChange) return;
    const parsed = parseDiagram(content);
    const existingIds = parsed.nodes.map(n => n.id);
    const id = generateNodeId(existingIds);
    const result = addNode(content, id, 'New Node', shape);
    onChange(result);
    setSelectedNodeIds(new Set([id]));
    setSelectedEdgeIndex(null);
  }, [onChange, content]);

  // Delete selected nodes handler
  const handleDeleteSelected = useCallback(() => {
    if (!onChange) return;
    let updated = content;
    selectedNodeIds.forEach(id => { updated = removeNode(updated, id); });
    setSelectedNodeIds(new Set());
    setSelectedEdgeIndex(null);
    onChange(updated);
  }, [onChange, content, selectedNodeIds]);

  // Drop handler: adds a shape when dragged onto the canvas, or moves node to root
  const handleDropOnCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('DROP ON CANVAS - dragNodeId:', dragNodeId);
    // If dragging a node over the canvas (not a shape from toolbar), move to root
    if (dragNodeId && onChange) {
      console.log('MOVING TO ROOT:', dragNodeId);
      onChange(moveNodeToSubgraph(content, dragNodeId, null));
      setDragNodeId(null);
      setDragOverSubgraphId(null);
      return;
    }
    if (!dragShape) return;
    handleAddShape(dragShape);
    setDragShape(null);
  }, [dragShape, dragNodeId, handleAddShape, onChange, content]);

  // Pan handlers for drag navigation
  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    // Only enable drag on left click when clicking on canvas background
    if (e.button !== 0 || !containerRef.current) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }, []);

  // Add global mousemove/mouseup listeners for panning
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft -= dx;
      containerRef.current.scrollTop -= dy;
      setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsPanning(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart]);

  async function copySvg() {
    if (!svg) {return;}
    await navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleFitToScreen = useCallback(() => {
    if (!shadowHostRef.current?.shadowRoot) {return;}

    const svgElement = shadowHostRef.current.shadowRoot.querySelector('svg');
    if (!svgElement) {return;}

    const { width: naturalWidth, height: naturalHeight } = svgNaturalSizeRef.current;

    if (naturalWidth === 0 || naturalHeight === 0) {return;}

    // Find the scrollable container (parent of shadow host)
    const scrollableContainer = shadowHostRef.current?.closest('.overflow-auto');
    if (!scrollableContainer) {return;}

    const containerRect = scrollableContainer.getBoundingClientRect();
    const padding = 32;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;

    const scaleX = availableWidth / naturalWidth;
    const scaleY = availableHeight / naturalHeight;

    // Use min to ensure entire diagram fits in view
    const optimalZoom = Math.min(scaleX, scaleY);

    // Cap zoom between 0.25x and 10x
    const finalZoom = Math.max(0.25, Math.min(optimalZoom, 10));

    setZoom(finalZoom);

    // Reset scroll position
    scrollableContainer.scrollTop = 0;
    scrollableContainer.scrollLeft = 0;
  }, []);

  return (
    <div data-testid="preview-panel" className="flex flex-col h-full relative" style={{ background: 'var(--surface-raised)' }}>
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('preview.title')}</span>
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),0.2)' }}>
            {TYPE_LABELS[type] ?? 'Diagram'}
          </span>
          {loading && <RefreshCw size={11} style={{ color: 'var(--text-tertiary)' }} className="animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title={t('preview.zoomOut')}
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <ZoomOut size={13} />
          </button>
          <span className="text-xs w-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(10, z + 0.25))} title={t('preview.zoomIn')}
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <ZoomIn size={13} />
          </button>
          <button onClick={() => setZoom(1)} title={t('preview.resetZoom')}
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <RefreshCw size={13} />
          </button>
          <button
            data-testid="fit-button"
            onClick={handleFitToScreen}
            title={t('preview.fitToScreen')} className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <Move size={13} />
          </button>
          {onFullscreen && (
            <button
              data-testid="fullscreen-button"
              onClick={onFullscreen}
              title={t('preview.fullscreenPreview')} className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
              <Maximize2 size={13} />
            </button>
          )}
          {onChange && supportsClassDef && (
            <button
              data-testid="add-subgraph-button"
              onClick={handleAddSubgraph}
              title={t('preview.addSubgraph')}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors hover:bg-white/8"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Group size={13} />
              <span>{t('preview.subgraph')}</span>
            </button>
          )}
          <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />
          <button onClick={copySvg} title={t('preview.copySvg')}
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          {onExport && (
            <button onClick={onExport} title={t('preview.export')}
              className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
              <Download size={13} />
            </button>
          )}
        </div>
      </div>

      {supportsClassDef && (
        <ShapeToolbar
          toolMode={toolMode}
          onToolMode={setToolMode}
          onAddShape={handleAddShape}
          onDragStart={shape => setDragShape(shape)}
          onDeleteSelected={handleDeleteSelected}
          hasSelection={selectedNodeIds.size > 0}
        />
      )}

      <div
        ref={containerRef}
        className={`flex-1 overflow-auto preview-grid ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onClick={handleCanvasClick}
        onMouseDown={handlePanMouseDown}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropOnCanvas}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="error-message">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('preview.parseError')}</p>
            <p className="text-xs font-mono max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {error.split('\n')[0]}
            </p>
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
          <div ref={relativeContainerRef} className="relative min-h-full flex items-center justify-center p-8">
            <div
              ref={shadowHostRef}
              data-shadow-host=""
              className="transition-transform duration-150"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%'
              }}
            />

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
                  onClick={e => handleNodeClick(e, overlay.id)}
                  onMouseDown={e => {
                    // Prevent canvas drag when clicking on nodes
                    e.stopPropagation();
                  }}
                  draggable={toolMode === 'select' && supportsClassDef ? true : undefined}
                  onDragStart={e => {
                    if (!supportsClassDef) return;
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
                    cursor: toolMode === 'connect' ? 'crosshair' : (supportsClassDef ? 'pointer' : 'default'),
                    zIndex: isDragging ? 10 : 5,
                    border: isSelected ? '2px solid var(--accent)' : isConnectSource ? '2px dashed var(--accent)' : '2px solid transparent',
                    borderRadius: '4px',
                    transition: 'border-color 0.15s',
                    background: isConnectSource ? 'rgba(var(--accent-rgb), 0.1)' : undefined,
                    opacity: isDragging ? 0.5 : undefined,
                    pointerEvents: shouldBlockClicks ? 'none' : 'auto',
                  }}
                  title={supportsClassDef ? t('preview.clickToEdit', { id: overlay.id }) : overlay.id}
                />
              );
            })}

            {subgraphOverlays.map(sg => {
              const isSelected = selectedSubgraphId === sg.id;
              const isDropTarget = dragOverSubgraphId === sg.id;
              const isConnectSource = connectFirst === sg.id;
              return (
                <div
                  key={`sg-${sg.id}`}
                  onClick={e => handleSubgraphClick(e, sg.id)}
                  onMouseDown={e => {
                    // Prevent canvas drag when clicking on subgraphs
                    e.stopPropagation();
                  }}
                  onDragOver={e => {
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
                    // Fallback to dataTransfer if dragNodeId state is lost
                    const droppedId = dragNodeId || e.dataTransfer.getData('text/plain');
                    console.log('SUBGRAPH DROP - state dragNodeId:', dragNodeId, 'dt droppedId:', droppedId, 'target sgId:', sg.id);

                    if (droppedId && onChange) {
                      onChange(moveNodeToSubgraph(content, droppedId, sg.id));
                    }
                    setDragNodeId(null);
                    setDragOverSubgraphId(null);
                  }}
                  className="subgraph-overlay"
                  style={{
                    position: 'absolute',
                    left: sg.clusterX,
                    top: sg.clusterY,
                    width: sg.clusterWidth,
                    height: sg.clusterHeight,
                    cursor: toolMode === 'connect' ? 'crosshair' : (supportsClassDef ? 'pointer' : 'default'),
                    // Subgraphs must be above nodes for connect mode and drag-drop, but below dragging nodes
                    zIndex: toolMode === 'connect' ? 15 : (dragNodeId ? 8 : 6),
                    border: isSelected ? '2px solid var(--accent)' : (isConnectSource || isDropTarget) ? '2px dashed var(--accent)' : '2px solid transparent',
                    borderRadius: '4px',
                    background: isConnectSource ? 'rgba(var(--accent-rgb), 0.1)' : (isDropTarget ? 'rgba(var(--accent-rgb), 0.08)' : undefined),
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  title={supportsClassDef ? (toolMode === 'connect' ? `Click to connect from/to ${sg.id}` : t('preview.clickToEditSubgraph')) : sg.label}
                />
              );
            })}
          </div>
        )}
      </div>

      {selectedEdgeIndex !== null && parsedEdges[selectedEdgeIndex] && supportsClassDef && (
        <EdgeStylePanel
          edge={parsedEdges[selectedEdgeIndex]}
          edgeIndex={selectedEdgeIndex}
          edgeStyle={parsedLinkStyles.get(selectedEdgeIndex) ?? {}}
          onClose={() => setSelectedEdgeIndex(null)}
          onArrowChange={handleEdgeArrowChange}
          onLabelChange={handleEdgeLabelChange}
          onStyleChange={handleEdgeStyleChange}
          onReset={handleEdgeReset}
        />
      )}

      {selectedSubgraphId !== null && supportsClassDef && (
        <SubgraphStylePanel
          subgraphId={selectedSubgraphId}
          subgraphLabel={subgraphList.find(sg => sg.id === selectedSubgraphId)?.label ?? ''}
          subgraphStyle={parsedStyles.get(selectedSubgraphId) ?? {}}
          onClose={() => setSelectedSubgraphId(null)}
          onStyleChange={handleSubgraphStyleChange}
          onLabelChange={handleSubgraphLabelChange}
          onReset={handleSubgraphReset}
        />
      )}

      {selectedNodeIds.size > 0 && (
        <NodeStylePanel
          selectedNodeIds={Array.from(selectedNodeIds)}
          nodeStyles={Array.from(selectedNodeIds).map(id => panelStyles.get(id) ?? {})}
          nodeLabels={panelLabels}
          onClose={() => setSelectedNodeIds(new Set())}
          onStyleChange={handleStyleChange}
          onLabelChange={handleNodeLabelChange}
          onReset={handleResetStyles}
          nodeSubgraphIds={nodeSubgraphIds}
          subgraphs={subgraphList}
          onSubgraphChange={handleSubgraphChange}
          presets={nodePresets}
          onPresetApply={handlePresetApply}
        />
      )}
    </div>
  );
}

// Memoize PreviewPanel to prevent unnecessary re-renders from parent state changes
// Only re-renders when content, theme, themeId, onChange, onExport, onRenderTime, etc. actually change
export const PreviewPanel = React.memo(PreviewPanelInner);
