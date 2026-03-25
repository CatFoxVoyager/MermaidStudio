import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Copy, Check, Download, Move, X, ChevronDown, Hash } from 'lucide-react';
import { renderDiagram, detectDiagramType } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import { parseFrontmatter } from '@/lib/mermaid/codeUtils';
import { colorPalettes } from '@/constants/colorPalettes';
import type { ColorPalette } from '@/types';

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

interface NodeColorStyle {
  id: string;
  label: string;
  color: string;
}

const PREDEFINED_COLORS = [
  '#FF6B6B', '#EE5A5A', '#DC2626', '#B91C1C',
  '#FFA07A', '#FF9F43', '#F59E0B', '#EA580C',
  '#FFD93D', '#FCD34D', '#FBBF24', '#EAB308',
  '#6BCF7F', '#4ADE80', '#22C55E', '#16A34A',
  '#2DD4BF', '#14B8A6', '#0D9488', '#0F766E',
  '#74C0FC', '#60A5FA', '#3B82F6', '#2563EB',
  '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9',
  '#C084FC', '#A855F7', '#9333EA', '#7E22CE',
  '#F472B6', '#EC4899', '#DB2777', '#BE185D',
  '#F3F4F6', '#D1D5DB', '#9CA3AF', '#6B7280',
];

// Simple node parser to extract node IDs and labels from Mermaid code
function extractNodes(content: string): Array<{ id: string; label: string }> {
  const nodes: Array<{ id: string; label: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments, empty lines, and style directives
    if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('---') || trimmed.startsWith('classDef') || trimmed.startsWith('class ')) continue;

    // Match patterns like:
    // A[Label]
    // B{Decision}
    // A([Start])
    // A --> B
    const nodeMatch = trimmed.match(/^([A-Za-z0-9_]+)\[([^\]]*)\]/) ||
                    trimmed.match(/^([A-Za-z0-9_]+){([^}]*)}/) ||
                    trimmed.match(/^([A-Za-z0-9_]+)\(\[([^\]]*)\]\)/) ||
                    trimmed.match(/^([A-Za-z0-9_]+)\(\(([^(]*)\)\)/) ||
                    trimmed.match(/^([A-Za-z0-9_]+)\[\[([^\]]*)\]\]/);

    if (nodeMatch) {
      const nodeId = nodeMatch[1];
      let nodeLabel = nodeMatch[2] || nodeId;
      nodeLabel = nodeLabel.trim() || nodeId;
      if (!nodes.find(n => n.id === nodeId)) {
        nodes.push({ id: nodeId, label: nodeLabel });
      }
    }

    // Also match nodes that appear in relationships (e.g., A --> B)
    const relationMatch = trimmed.match(/^([A-Za-z0-9_]+)(?:\([^)]*\)|\[[^\]]*\]|\{[^}]*\})?\s*-->/);
    if (relationMatch) {
      const nodeId = relationMatch[1];
      if (!nodes.find(n => n.id === nodeId)) {
        nodes.push({ id: nodeId, label: nodeId });
      }
    }

    // Match target nodes in relationships
    const targetMatch = trimmed.match(/-->\s*(?:\|[^|]+\|)?\s*([A-Za-z0-9_]+)/);
    if (targetMatch) {
      const nodeId = targetMatch[1];
      if (!nodes.find(n => n.id === nodeId)) {
        nodes.push({ id: nodeId, label: nodeId });
      }
    }
  }

  return nodes;
}

// Extract current palette from content
function extractCurrentPalette(content: string): ColorPalette | null {
  const classDefMatch = content.match(/classDef\s+\w+\s+fill:(#[A-Fa-f0-9]{6})/i);
  if (classDefMatch) {
    const primaryColor = classDefMatch[1].toUpperCase();
    return colorPalettes.find(p => p.colors.primary.toUpperCase() === primaryColor) || null;
  }
  let match = content.match(/primaryColor:\s*['"]?([^'"\n\s]+)['"]?/);
  if (!match) {
    match = content.match(/'primaryColor'\s*:\s*'([^']+)'/);
  }
  if (!match) {return null;}
  const primaryColor = match[1].toUpperCase();
  return colorPalettes.find(p => p.colors.primary.toUpperCase() === primaryColor) || null;
}

// Strip theme directives and classDefs
function stripThemeDirective(content: string): string {
  return content
    .replace(/^\s*---[\s\S]*?---\s*/i, '')
    .replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '')
    .replace(/^[ \t]*classDef\s+\w+\s+[^\n]*$/gm, '')
    .replace(/^[ \t]*class\s+[^\n]*$/gm, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Function to add node styles to Mermaid content
function applyNodeStyles(content: string, nodeStyles: NodeColorStyle[]): string {
  if (nodeStyles.length === 0) return content;

  // Extract diagram body (without YAML frontmatter) for type detection
  const bodyContent = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();

  // Diagram types that DO NOT support class/classDef
  const unsupportedTypes = [
    /sequenceDiagram|sequencediagram/i,
    /gantt/i,
    /pie/i,
    /erDiagram|erdiagram/i,
    /gitGraph/i,
    /journey/i,
    /requirementDiagram/i,
    /quadrantChart/i,
    /xychart-beta/i,
    /sankey-beta/i,
    /timeline/i,
    /mindmap/i,
    /stateDiagram|statediagram/i,
    /block/i,
    /c4/i,
  ];

  const isUnsupported = unsupportedTypes.some(regex => regex.test(bodyContent));
  if (isUnsupported) return content;

  function getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  const classDefs: string[] = [];
  const classAssignments: string[] = [];

  nodeStyles.forEach((nodeStyle, index) => {
    const className = `customNode_${index}`;
    const textColor = getContrastColor(nodeStyle.color);
    classDefs.push(`    classDef ${className} fill:${nodeStyle.color},stroke:#333,stroke-width:1px,color:${textColor}`);
    classAssignments.push(`    class ${nodeStyle.id} ${className}`);
  });

  const styleSection = '\n' + classDefs.join('\n') + '\n' + classAssignments.join('\n');

  let cleaned = content.replace(/^[ \t]*classDef\s+\w+\s+[^\n]*$/gm, '');
  cleaned = cleaned.replace(/^[ \t]*class\s+[^\n]*$/gm, '');
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (/^\s*---[\s\S]*?---\s*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^\s*---[\s\S]*?---\s*/i, '');
  }

  return cleaned.trim() + styleSection;
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
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      });
    } catch {
      // skip
    }
  });

  return overlays;
}

interface Props {
  content: string;
  theme: 'dark' | 'light';
  onChange?: (content: string) => void;
  onExport?: () => void;
  onRenderTime?: (ms: number) => void;
  onFullscreen?: () => void;
}

export function PreviewPanel({ content, theme, onChange, onExport, onRenderTime, onFullscreen }: Props) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [nodeOverlays, setNodeOverlays] = useState<Array<NodeOverlay>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNodeColorsPanel, setShowNodeColorsPanel] = useState(false);
  const [nodeColorStyles, setNodeColorStyles] = useState<NodeColorStyle[]>([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgNaturalSizeRef = useRef({ width: 0, height: 0 });
  const zoomRef = useRef(1);
  const renderIdRef = useRef(0);
  const debounceRef = useRef<number>(0);

  // Keep zoomRef in sync with zoom state
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const render = useCallback(async () => {
    const id = ++renderIdRef.current;
    setLoading(true);
    const start = performance.now();

    try {
      const { svg: s, error: e } = await renderDiagram(content, `preview_${id}_${Date.now()}`);

      // Check if this render is still the latest one
      if (id !== renderIdRef.current) {return;}

      const elapsed = Math.round(performance.now() - start);
      onRenderTime?.(elapsed);

      if (e) {
        setError(e);
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
  }, [content, onRenderTime]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(render, 400);
    return () => clearTimeout(debounceRef.current);
  }, [render, theme]);

  // Setup Shadow DOM for SVG isolation
  useEffect(() => {
    if (!shadowHostRef.current || !svg) return;

    // Clean up previous shadow root
    if (shadowHostRef.current.shadowRoot) {
      shadowHostRef.current.shadowRoot.innerHTML = '';
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
    if (fontFamily || fontSize) {
      shadowCSS += '\n/* Font styles */\n';
      shadowCSS += '.mermaid, .mermaid * {\n';
      if (fontFamily) shadowCSS += `  font-family: ${fontFamily};\n`;
      if (fontSize) shadowCSS += `  font-size: ${fontSize};\n`;
      shadowCSS += '}\n';
    }

    // Create style element with theme variables
    const styleEl = document.createElement('style');
    styleEl.textContent = shadowCSS;
    shadowRoot.appendChild(styleEl);

    // Create container for SVG
    const svgContainer = document.createElement('div');
    svgContainer.className = 'mermaid';
    svgContainer.innerHTML = sanitizeSVG(svg);
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

  }, [svg, content]);

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
    const timer = setTimeout(() => {
      const nodes = extractSvgNodes(containerRef.current!, shadowHostRef.current!);
      setNodeOverlays(nodes);
    }, 100);
    return () => clearTimeout(timer);
  }, [svg, zoom]);

  // Initialize node color styles from content
  useEffect(() => {
    const nodes = extractNodes(content);
    if (nodes.length > 0) {
      // Extract colors from existing classDef if present
      const colorMap = new Map<string, string>();
      const classDefRegex = /classDef\s+\w+\s+fill:(#[A-Fa-f0-9]{6})/gi;
      let match;
      let index = 0;
      while ((match = classDefRegex.exec(content)) !== null && index < nodes.length) {
        colorMap.set(nodes[index].id, match[1]);
        index++;
      }

      const activePalette = extractCurrentPalette(content);
      const defaultColor = activePalette?.colors.primary || '#0066CC';
      const updatedNodes = nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: colorMap.get(node.id) || defaultColor
      }));
      setNodeColorStyles(updatedNodes);
    } else {
      setNodeColorStyles([]);
    }
  }, [content]);

  // Node click handlers
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
  }, [selectedNodeId]);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Color change handler for individual nodes
  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    if (!onChange) return;

    const updatedStyles = nodeColorStyles.map(ns => ns.id === nodeId ? { ...ns, color } : ns);
    setNodeColorStyles(updatedStyles);

    // Apply to diagram
    const cleanContent = stripThemeDirective(content);
    const contentWithNodeColors = applyNodeStyles(cleanContent, updatedStyles);
    onChange(contentWithNodeColors);
  }, [nodeColorStyles, content, onChange]);

  const toggleNodeExpanded = useCallback((nodeId: string) => {
    setExpandedNodeId(expandedNodeId === nodeId ? null : nodeId);
  }, [expandedNodeId]);

  function adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  // Get palette colors for swatches
  const getPaletteColors = useCallback(() => {
    const activePalette = extractCurrentPalette(content);
    if (!activePalette) {
      return PREDEFINED_COLORS;
    }
    const c = activePalette.colors;
    return [
      c.primary,
      c.secondary,
      c.accent,
      c.success,
      c.warning,
      c.error,
      c.neutral_light,
      c.neutral_dark,
      adjustBrightness(c.primary, 20),
      adjustBrightness(c.primary, -20),
      adjustBrightness(c.secondary, 20),
      adjustBrightness(c.secondary, -20),
    ];
  }, [content]);

  const isDark = theme === 'dark';

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

  const type = detectDiagramType(content);

  // Get selected node color style from nodeColorStyles
  const selectedNodeStyle = selectedNodeId
    ? nodeColorStyles.find(n => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div data-testid="preview-panel" className="flex flex-col h-full" style={{ background: 'var(--surface-raised)' }}>
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Preview</span>
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),0.2)' }}>
            {TYPE_LABELS[type] ?? 'Diagram'}
          </span>
          {loading && <RefreshCw size={11} style={{ color: 'var(--text-tertiary)' }} className="animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom out"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <ZoomOut size={13} />
          </button>
          <span className="text-xs w-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(10, z + 0.25))} title="Zoom in"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <ZoomIn size={13} />
          </button>
          <button
            data-testid="fit-button"
            onClick={handleFitToScreen}
            title="Fit to screen" className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            <Move size={13} />
          </button>
          {onFullscreen && (
            <button
              data-testid="fullscreen-button"
              onClick={onFullscreen}
              title="Fullscreen preview" className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
              <Maximize2 size={13} />
            </button>
          )}
          <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />
          {onChange && nodeColorStyles.length > 0 && (
            <button
              onClick={() => setShowNodeColorsPanel(!showNodeColorsPanel)}
              title="Node Colors"
              className="p-1 rounded-sm transition-colors hover:bg-white/8"
              style={{ color: showNodeColorsPanel ? 'var(--accent)' : 'var(--text-tertiary)' }}
            >
              <Hash size={13} />
            </button>
          )}
          <button onClick={copySvg} title="Copy SVG"
            className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          {onExport && (
            <button onClick={onExport} title="Export"
              className="p-1 rounded-sm transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
              <Download size={13} />
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto preview-grid" onClick={handleCanvasClick}>
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="error-message">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Parse Error</p>
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
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Start typing to see a live preview</p>
          </div>
        ) : (
          <div className="relative min-h-full flex items-center justify-center p-8">
            <div
              ref={shadowHostRef}
              className="transition-transform duration-150"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                width: '100%',
                height: '100%'
              }}
            />

            {selectedNodeId && selectedNodeStyle && onChange && (
              <div className="absolute top-2 left-2 z-20 w-64 rounded-xl border shadow-lg p-3 animate-fade-in"
                style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-3 pb-2 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Edit Node
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      {selectedNodeId}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded-sm transition-colors hover:bg-white/8"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Close">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[9px] font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Fill Color</span>
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {getPaletteColors().slice(0, 12).map((color, index) => (
                        <button
                          key={`${color}-${index}`}
                          onClick={() => handleNodeColorChange(selectedNodeId, color)}
                          className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: color,
                            borderColor: selectedNodeStyle.color === color ? 'var(--accent)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                            borderWidth: selectedNodeStyle.color === color ? '2px' : '1px'
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Custom:</span>
                      <input
                        type="text"
                        value={selectedNodeStyle.color ?? ''}
                        onChange={(e) => handleNodeColorChange(selectedNodeId, e.target.value)}
                        className="flex-1 px-1.5 py-0.5 text-[8px] font-mono rounded border outline-hidden"
                        style={{
                          background: 'var(--surface-base)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)'
                        }}
                        placeholder="#0066CC"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Node Colors Panel */}
            {showNodeColorsPanel && nodeColorStyles.length > 0 && (
              <div
                className="absolute top-2 left-2 z-20 w-64 rounded-xl border shadow-lg animate-fade-in"
                style={{
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--border-subtle)',
                  maxHeight: '320px',
                  overflowY: 'auto'
                }}
              >
                <div className="sticky top-0 p-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Click a node to change color
                  </span>
                  <button
                    onClick={() => setShowNodeColorsPanel(false)}
                    className="p-1 rounded-sm transition-colors hover:bg-white/8"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Close"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {nodeColorStyles.map((node) => (
                    <div key={node.id}>
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer hover:bg-white/4 transition-colors"
                        style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}
                        onClick={() => toggleNodeExpanded(node.id)}
                      >
                        <div
                          className="w-4 h-4 rounded border shrink-0"
                          style={{ backgroundColor: node.color, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                        />
                        <span className="text-[9px] truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                          {node.label}
                        </span>
                        <ChevronDown
                          size={10}
                          style={{
                            color: 'var(--text-tertiary)',
                            transform: expandedNodeId === node.id ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        />
                      </div>

                      {expandedNodeId === node.id && (
                        <div className="mt-1 p-2 rounded border" style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
                          <div className="grid grid-cols-6 gap-1 mb-2">
                            {getPaletteColors().slice(0, 12).map((color, index) => (
                              <button
                                key={`${color}-${index}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNodeColorChange(node.id, color);
                                }}
                                className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                style={{
                                  backgroundColor: color,
                                  borderColor: node.color === color ? 'var(--accent)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                                  borderWidth: node.color === color ? '2px' : '1px'
                                }}
                                title={color}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Custom:</span>
                            <input
                              type="text"
                              value={node.color}
                              onChange={(e) => handleNodeColorChange(node.id, e.target.value)}
                              className="flex-1 px-1.5 py-0.5 text-[8px] font-mono rounded border outline-hidden"
                              style={{
                                background: 'var(--surface-base)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-primary)'
                              }}
                              placeholder="#0066CC"
                              maxLength={7}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nodeOverlays.map(overlay => {
              const isSelected = overlay.id === selectedNodeId;
              return (
                <div
                  key={overlay.id}
                  onClick={e => handleNodeClick(e, overlay.id)}
                  className={`node-overlay ${isSelected ? 'selected' : ''}`}
                  style={{
                    position: 'absolute',
                    left: overlay.x,
                    top: overlay.y,
                    width: overlay.width,
                    height: overlay.height,
                    cursor: 'pointer',
                    zIndex: 5,
                    border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: '4px',
                    transition: 'border-color 0.15s',
                  }}
                  title={`Click to edit ${overlay.id}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
