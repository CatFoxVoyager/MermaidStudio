import { RotateCcw, X, Palette, Hash, Plus, ChevronDown } from 'lucide-react';
import { colorPalettes, applyPaletteToContent, generateMermaidThemeConfig } from '@/constants/colorPalettes';
import type { ColorPalette } from '@/types';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { renderDiagram } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';

interface NodeStyle {
  id: string;
  label: string;
  color: string;
}

// Simple node parser to extract node IDs and labels from Mermaid code
function extractNodes(content: string): Array<{ id: string; label: string }> {
  const nodes: Array<{ id: string; label: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('---')) continue;

    // Match patterns like:
    // A[Label]
    // B{Decision}
    // C[Label]
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
      // Clean up label for display
      nodeLabel = nodeLabel.trim() || nodeId;
      if (!nodes.find(n => n.id === nodeId)) {
        nodes.push({ id: nodeId, label: nodeLabel });
      }
    }

    // Also match nodes that appear in relationships (e.g., A --> B)
    const relationMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*-->/);
    if (relationMatch) {
      const nodeId = relationMatch[1];
      if (!nodes.find(n => n.id === nodeId)) {
        nodes.push({ id: nodeId, label: nodeId });
      }
    }

    // Match target nodes in relationships
    const targetMatch = trimmed.match(/-->\s*([A-Za-z0-9_]+)/);
    if (targetMatch) {
      const nodeId = targetMatch[1];
      // Remove any label syntax
      const cleanId = nodeId.split('|')[0].trim();
      if (!nodes.find(n => n.id === cleanId)) {
        nodes.push({ id: cleanId, label: cleanId });
      }
    }
  }

  return nodes;
}

// Extract relationships and assign colors by branch
function extractBranchesAndAssignColors(content: string, palette: ColorPalette): Array<{ id: string; label: string; color: string }> {
  const nodes = extractNodes(content);
  if (nodes.length === 0) return [];

  // Parse relationships to build adjacency list (preserving order!)
  const adjacency = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>(); // To find predecessors

  // Process lines in order to preserve the relationship order
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('---')) continue;

    // Match: A --> B (with optional label)
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*-->\s*(?:\|[^\|]+\|)?\s*([A-Za-z0-9_]+)/);
    if (match) {
      const [_, from, to] = match;
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!reverseAdj.has(to)) reverseAdj.set(to, []);
      // Only add if not already in list (avoid duplicates)
      if (!adjacency.get(from)!.includes(to)) {
        adjacency.get(from)!.push(to);
      }
      if (!reverseAdj.get(to)!.includes(from)) {
        reverseAdj.get(to)!.push(from);
      }
    }
  }

  // Detect start nodes (no predecessors)
  const startNodes = nodes.filter(n => !reverseAdj.has(n.id));
  if (startNodes.length === 0 && nodes.length > 0) {
    startNodes.push(nodes[0]);
  }

  // Assign colors by tracing branches from start nodes using BFS
  const assigned = new Map<string, string>();
  const visited = new Set<string>();
  const branchColors = [
    palette.colors.primary,
    palette.colors.secondary,
    palette.colors.accent,
    palette.colors.success,
    palette.colors.warning,
    palette.colors.error,
  ];

  // BFS with branch color tracking
  const queue: Array<{ nodeId: string; colorIndex: number }> = [];

  startNodes.forEach(start => {
    queue.push({ nodeId: start.id, colorIndex: 0 });
  });

  while (queue.length > 0) {
    const { nodeId, colorIndex } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // Assign current color to this node
    assigned.set(nodeId, branchColors[colorIndex % branchColors.length]);

    // Get children and add to queue
    const children = adjacency.get(nodeId) || [];
    children.forEach((childId, idx) => {
      if (!visited.has(childId)) {
        if (idx === 0) {
          // First child: SAME color (continuation)
          queue.push({ nodeId: childId, colorIndex });
        } else {
          // Other children: NEW color (new branch)
          queue.push({ nodeId: childId, colorIndex: colorIndex + 1 });
        }
      }
    });
  }

  // Build result array
  return nodes.map(node => ({
    id: node.id,
    label: node.label,
    color: assigned.get(node.id) || palette.colors.primary
  }));
}

// Function to add node styles to Mermaid content
function applyNodeStyles(content: string, nodeStyles: NodeStyle[]): string {
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

  // Check if this is an unsupported diagram type
  const isUnsupported = unsupportedTypes.some(regex => regex.test(bodyContent));

  // If unsupported, don't apply any node styles
  if (isUnsupported) {
    return content;
  }

  // Remove existing class definitions and assignments
  let cleaned = content.replace(/classDef\s+\w+\s+([^\n]+)/gi, '');
  cleaned = cleaned.replace(/class\s+[^,\n]+(,\s*[^,\n]+)*/gi, '');
  cleaned = cleaned.trim();

  // Helper to determine text color based on background
  function getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // Build class definitions and assignments
  const classDefs: string[] = [];
  const classAssignments: string[] = [];

  nodeStyles.forEach((nodeStyle, index) => {
    const className = `customNode_${index}`;
    const textColor = getContrastColor(nodeStyle.color);
    classDefs.push(`    classDef ${className} fill:${nodeStyle.color},stroke:#333,stroke-width:1px,color:${textColor}`);
    classAssignments.push(`    class ${nodeStyle.id} ${className}`);
  });

  // Add class definitions and assignments AFTER the diagram content
  const styleSection = '\n' + classDefs.join('\n') + '\n' + classAssignments.join('\n');

  return cleaned + styleSection;
}

interface DiagramColorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onContentChange: (content: string) => void;
  theme: 'dark' | 'light';
}

function stripThemeDirective(content: string): string {
  return content
    .replace(/^\s*---[\s\S]*?---\s*/i, '')  // YAML format
    .replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '')  // Old init format
    .trim();
}

function extractCurrentPalette(content: string): ColorPalette | null {
  // Try YAML format first (primaryColor: '#0066CC' or primaryColor: '#0066CC')
  let match = content.match(/primaryColor:\s*['"]?([^'"\n\s]+)['"]?/);
  if (!match) {
    // Try old init format
    match = content.match(/'primaryColor'\s*:\s*'([^']+)'/);
  }
  if (!match) {return null;}
  const primaryColor = match[1].toUpperCase();
  return colorPalettes.find(p => p.colors.primary.toUpperCase() === primaryColor) || null;
}

// predefined colors for the custom color picker
const PREDEFINED_COLORS = [
  // Reds
  '#FF6B6B', '#EE5A5A', '#DC2626', '#B91C1C', '#991B1B',
  // Oranges
  '#FFA07A', '#FF9F43', '#F59E0B', '#EA580C', '#C85A17',
  // Yellows
  '#FFD93D', '#FCD34D', '#FBBF24', '#EAB308', '#CA8A04',
  // Greens
  '#6BCF7F', '#4ADE80', '#22C55E', '#16A34A', '#15803D',
  // Teals
  '#2DD4BF', '#14B8A6', '#0D9488', '#0F766E', '#115E59',
  // Blues
  '#74C0FC', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8',
  // Indigos
  '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6',
  // Purples
  '#C084FC', '#A855F7', '#9333EA', '#7E22CE', '#6B21A8',
  // Pinks
  '#F472B6', '#EC4899', '#DB2777', '#BE185D', '#9D174D',
  // Grays
  '#F3F4F6', '#D1D5DB', '#9CA3AF', '#6B7280', '#374151',
  // Dark neutrals
  '#1F2937', '#111827', '#0D1117', '#000000',
];

export function DiagramColorsPanel({ isOpen, onClose, currentContent, onContentChange, theme }: DiagramColorsPanelProps) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const hasCustomTheme = currentContent.trimStart().startsWith('%%{init:') || currentContent.trimStart().startsWith('---');
  const activePalette = hasCustomTheme ? extractCurrentPalette(currentContent) : null;

  // Preview SVG state
  const [previewSvg, setPreviewSvg] = useState('');
  const previewIdRef = useRef(0);

  // Node Styles state
  const [nodeStyles, setNodeStyles] = useState<NodeStyle[]>([]);
  const [showNodeStyles, setShowNodeStyles] = useState(false);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  // Extract nodes when content changes
  useEffect(() => {
    const nodes = extractNodes(currentContent);
    // Default color from active palette or fallback
    const defaultColor = activePalette?.colors.primary || '#0066CC';
    // Only initialize if we don't have styles yet or if number of nodes changed
    if (nodeStyles.length === 0 || nodeStyles.length !== nodes.length) {
      const updatedNodes = nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: defaultColor
      }));
      setNodeStyles(updatedNodes);
    }
  }, [currentContent]);

  // Track if we've already auto-applied for this session
  const [autoApplied, setAutoApplied] = useState(false);

  // Refs to avoid triggering useEffect on content changes
  const contentRef = useRef(currentContent);
  const activePaletteRef = useRef(activePalette);

  useEffect(() => {
    contentRef.current = currentContent;
    activePaletteRef.current = activePalette;
  }, [currentContent, activePalette]);

  // Auto-apply node colors when section is opened
  useEffect(() => {
    if (showNodeStyles && !autoApplied && activePalette) {
      // Auto-assign colors by branch structure
      const autoColoredNodes = extractBranchesAndAssignColors(currentContent, activePalette);
      setNodeStyles(autoColoredNodes);
      setAutoApplied(true);

      // Auto-apply the styles
      const updatedContent = applyNodeStyles(currentContent, autoColoredNodes);
      onContentChange(updatedContent);
    }
  }, [showNodeStyles, autoApplied, activePalette, currentContent]);

  // Reset auto-applied flag when section is closed
  useEffect(() => {
    if (!showNodeStyles) {
      setAutoApplied(false);
    }
  }, [showNodeStyles]);

  // Apply individual node colors
  const handleApplyNodeStyles = () => {
    const updatedContent = applyNodeStyles(currentContent, nodeStyles);
    onContentChange(updatedContent);
  };

  const handleNodeColorChange = (nodeId: string, color: string) => {
    setNodeStyles(prev => prev.map(ns => ns.id === nodeId ? { ...ns, color } : ns));
  };

  const clearNodeStyles = () => {
    // Remove all node styles
    const cleaned = currentContent
      .replace(/classDef\s+\w+\s+([^\n]+)/gi, '')
      .replace(/class\s+[^,\n]+(,\s*[^,\n]+)*/gi, '')
      .trim();
    onContentChange(cleaned);
    // Reset and re-assign colors by branch
    if (activePalette) {
      const autoColoredNodes = extractBranchesAndAssignColors(cleaned, activePalette);
      setNodeStyles(autoColoredNodes);
    } else {
      const defaultColor = '#0066CC';
      setNodeStyles(prev => prev.map(ns => ({ ...ns, color: defaultColor })));
    }
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodeId(expandedNodeId === nodeId ? null : nodeId);
  };

  // Get palette colors for individual node styling
  const getPaletteColors = () => {
    if (!activePalette) {
      // Default colors when no palette is active
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
      // Add some variations
      adjustBrightness(c.primary, 20),
      adjustBrightness(c.primary, -20),
      adjustBrightness(c.secondary, 20),
      adjustBrightness(c.secondary, -20),
    ];
  };

  // Helper to adjust color brightness
  function adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  // Generate preview when active palette changes
  useEffect(() => {
    if (activePalette) {
      const id = ++previewIdRef.current;
      const sampleDiagram = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;

      // Add theme config to sample diagram
      const themeConfig = generateMermaidThemeConfig(activePalette, undefined, 'flowchart');
      const contentWithTheme = themeConfig + '\n' + sampleDiagram;

      renderDiagram(contentWithTheme, `palette_preview_${id}_${Date.now()}`).then(({ svg }) => {
        if (svg && id === previewIdRef.current) {
          setPreviewSvg(svg);
        }
      });

      // Also update node styles with active palette colors
      const nodeColors = extractBranchesAndAssignColors(contentRef.current, activePalette);
      setNodeStyles(nodeColors);
    } else {
      setPreviewSvg('');
    }
  }, [activePalette?.id]);

  const handlePaletteClick = (palette: ColorPalette) => {
    // Apply immediately
    if (currentContent) {
      const updatedContent = applyPaletteToContent(currentContent, palette);
      // Also apply individual node colors based on branches
      const nodeColors = extractBranchesAndAssignColors(updatedContent, palette);
      const contentWithNodeColors = applyNodeStyles(updatedContent, nodeColors);
      onContentChange(contentWithNodeColors);
      setNodeStyles(nodeColors);
    }
  };

  const handleResetToDefault = () => {
    if (currentContent) {
      onContentChange(stripThemeDirective(currentContent));
    }
  };

  if (!isOpen) {return null;}

  return (
    <div data-testid="settings-modal palette-modal" className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <Palette size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }} data-testid="settings-title">{t('editor.diagramColors')}</span>
        </div>
        <button
          data-testid="close-palette close-settings"
          onClick={onClose}
          className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {hasCustomTheme && (
          <button
            onClick={handleResetToDefault}
            className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
            style={{
              background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)';
            }}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}>
              <RotateCcw size={14} style={{ color: isDark ? '#f87171' : '#dc2626' }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>
                Reset to Default
              </p>
              <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                Remove custom palette and use theme colors
              </p>
            </div>
          </button>
        )}

        {colorPalettes.map((palette) => {
          const isActive = activePalette?.id === palette.id;
          return (
            <button
              key={palette.id}
              data-testid="palette-item"
              onClick={() => handlePaletteClick(palette)}
              className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isActive
                  ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                  : 'var(--surface-base)',
                borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
              }}
              onMouseEnter={e => {
                if (activePalette?.id !== palette.id) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-floating)';
                }
              }}
              onMouseLeave={e => {
                if (activePalette?.id !== palette.id) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-base)';
                }
              }}
              title={palette.description}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {palette.name}
                </p>
                {isActive && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ color: 'var(--accent)', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.primary, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Primary</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.secondary, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Secondary</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.accent, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Accent</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.success, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Success</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.warning, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Warning</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.error, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Error</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.neutral_light, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Light</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded-sm border" style={{ backgroundColor: palette.colors.neutral_dark, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Dark</span>
                </div>
              </div>
              <p className="text-[9px] mt-2 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                {palette.description}
              </p>

              {/* Preview for currently selected/active palette */}
              {isActive && previewSvg && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="h-32 rounded-lg overflow-y-auto overflow-x-hidden flex justify-center border preview-grid"
                    style={{ background: isDark ? '#0d1117' : '#ffffff', borderColor: 'var(--border-subtle)' }}>
                    <div
                      className="pointer-events-none"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'top center', minWidth: '200%' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeSVG(previewSvg) }}
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* Node Styles Section */}
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => setShowNodeStyles(!showNodeStyles)}
            className="w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all hover:bg-white/8"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <Hash size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Individual Node Colors
              </span>
            </div>
            <Plus size={12} style={{ color: 'var(--text-secondary)', transform: showNodeStyles ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>

          {showNodeStyles && (
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center px-2">
                <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                  {nodeStyles.length} nodes detected • Auto-colored by branch
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={clearNodeStyles}
                    className="text-[8px] px-2 py-1 rounded hover:bg-white/8 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleApplyNodeStyles}
                    className="text-[8px] px-2 py-1 rounded text-white transition-colors"
                    style={{ background: 'var(--accent)' }}
                  >
                    Re-apply
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {nodeStyles.map((node) => (
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
                      <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)', minWidth: '40px' }}>
                        {node.id}
                      </span>
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
                        <div className="mb-2 flex items-center gap-1">
                          <p className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
                            {activePalette ? `From ${activePalette.name}` : 'Default colors'}
                          </p>
                        </div>
                        <div className="grid grid-cols-6 gap-1 mb-1">
                          {getPaletteColors().slice(0, 12).map((color, index) => {
                            const isPrimary = activePalette && color === activePalette.colors.primary;
                            return (
                            <button
                              key={`${color}-${index}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNodeColorChange(node.id, color);
                              }}
                              className="w-6 h-6 rounded border hover:scale-110 transition-transform relative"
                              style={{
                                backgroundColor: color,
                                borderColor: node.color === color ? 'var(--accent)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                                borderWidth: node.color === color ? '2px' : '1px'
                              }}
                              title={isPrimary ? 'Primary color' : color}
                            >
                              {isPrimary && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full text-[5px] flex items-center justify-center"
                                  style={{ background: 'var(--accent)', color: 'white' }}>
                                  ✓
                                </span>
                              )}
                            </button>
                          )})}
                        </div>
                        <p className="text-[7px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                          Primary color marked with ✓
                        </p>
                        <div className="mt-2 flex items-center gap-2">
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
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {nodeStyles.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                    No nodes detected in diagram
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
