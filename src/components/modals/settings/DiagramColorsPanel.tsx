import { RotateCcw, X, Palette, Check } from 'lucide-react';
import { colorPalettes } from '@/constants/colorPalettes';
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

interface DiagramColorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onContentChange: (content: string) => void;
  theme: 'dark' | 'light';
}

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

// Extract relationships and assign colors by branch
function extractBranchesAndAssignColors(content: string, palette: ColorPalette): Array<{ id: string; label: string; color: string }> {
  const nodes = extractNodes(content);
  if (nodes.length === 0) return [];

  // Parse relationships to build adjacency list (preserving order!)
  const adjacency = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('---') || trimmed.startsWith('classDef') || trimmed.startsWith('class ')) continue;

    // Match relationships with optional node labels: A([Start]) --> B{Decision}
    const match = trimmed.match(/^([A-Za-z0-9_]+)(?:\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|\(\([^)]*\)\)|\[\[[^\]]*\]\])?\s*-->\s*(?:\|[^|]+\|)?\s*([A-Za-z0-9_]+)/);
    if (match) {
      const [_, from, to] = match;
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!reverseAdj.has(to)) reverseAdj.set(to, []);
      if (!adjacency.get(from)!.includes(to)) {
        adjacency.get(from)!.push(to);
      }
      if (!reverseAdj.get(to)!.includes(from)) {
        reverseAdj.get(to)!.push(from);
      }
    }
  }

  // Detect start nodes
  const startNodes = nodes.filter(n => !reverseAdj.has(n.id));
  if (startNodes.length === 0 && nodes.length > 0) {
    startNodes.push(nodes[0]);
  }

  const branchColors = [
    palette.colors.primary,
    palette.colors.secondary,
    palette.colors.accent,
    palette.colors.success,
    palette.colors.warning,
    palette.colors.error,
  ];

  const assigned = new Map<string, number>();
  const visited = new Set<string>();

  // BFS from start nodes
  const queue: Array<{ nodeId: string; colorIndex: number }> = [];

  startNodes.forEach(start => {
    queue.push({ nodeId: start.id, colorIndex: 0 });
  });

  while (queue.length > 0) {
    const { nodeId, colorIndex } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    assigned.set(nodeId, colorIndex);

    const children = adjacency.get(nodeId) || [];

    if (children.length > 1) {
      // Branching point: first child keeps color, others get incrementally different colors
      children.forEach((childId, idx) => {
        if (!visited.has(childId)) {
          const childColorIndex = (idx === 0) ? colorIndex : (colorIndex + idx);
          queue.push({ nodeId: childId, colorIndex: childColorIndex });
        }
      });
    } else {
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ nodeId: childId, colorIndex });
        }
      });
    }
  }

  return nodes.map(node => {
    const colorIndex = assigned.get(node.id) ?? 0;
    return {
      id: node.id,
      label: node.label,
      color: branchColors[colorIndex % branchColors.length]
    };
  });
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
    /requirementDiagram/i,
    /quadrantChart/i,
    /xychart-beta/i,
    /sankey-beta/i,
    /timeline/i,
    /mindmap/i,
    /zenuml/i,
    /kanban/i,
    /packet/i,
  ];

  // Check if this is an unsupported diagram type
  const isUnsupported = unsupportedTypes.some(regex => regex.test(bodyContent));

  // If unsupported, don't apply any node styles
  if (isUnsupported) {
    return content;
  }

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

  const styleSection = '\n' + classDefs.join('\n') + '\n' + classAssignments.join('\n');

  // Remove old classDef and class statements (entire lines including leading whitespace)
  let cleaned = content.replace(/^[ \t]*classDef\s+\w+\s+[^\n]*$/gm, '');
  cleaned = cleaned.replace(/^[ \t]*class\s+[^\n]*$/gm, '');
  // Clean up multiple consecutive empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

  // If there's YAML frontmatter, remove it to avoid themeVariables conflicts
  if (/^\s*---[\s\S]*?---\s*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^\s*---[\s\S]*?---\s*/i, '');
  }

  return cleaned.trim() + styleSection;
}

function stripThemeDirective(content: string): string {
  return content
    .replace(/^\s*---[\s\S]*?---\s*/i, '')
    .replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '')
    .replace(/^[ \t]*classDef\s+\w+\s+[^\n]*$/gm, '')
    .replace(/^[ \t]*class\s+[^\n]*$/gm, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function extractCurrentPalette(content: string): ColorPalette | null {
  // Check for classDef patterns to detect active palette
  const classDefMatch = content.match(/classDef\s+\w+\s+fill:(#[A-Fa-f0-9]{6})/i);
  if (classDefMatch) {
    const primaryColor = classDefMatch[1].toUpperCase();
    return colorPalettes.find(p => p.colors.primary.toUpperCase() === primaryColor) || null;
  }

  // Try YAML format
  let match = content.match(/primaryColor:\s*['"]?([^'"\n\s]+)['"]?/);
  if (!match) {
    match = content.match(/'primaryColor'\s*:\s*'([^']+)'/);
  }
  if (!match) {return null;}
  const primaryColor = match[1].toUpperCase();
  return colorPalettes.find(p => p.colors.primary.toUpperCase() === primaryColor) || null;
}

const SAMPLE_DIAGRAM = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;

export function DiagramColorsPanel({ isOpen, onClose, currentContent, onContentChange, theme }: DiagramColorsPanelProps) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const activePalette = extractCurrentPalette(currentContent);

  // Preview state - shows when a palette is clicked (selected)
  const [previewSvg, setPreviewSvg] = useState('');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const previewIdRef = useRef(0);

  // Node Styles state
  const [nodeStyles, setNodeStyles] = useState<NodeStyle[]>([]);

  // Initialize node styles from current content
  useEffect(() => {
    const nodes = extractNodes(currentContent);
    if (nodes.length > 0) {
      // Extract colors from existing classDef if present
      const colorMap = new Map<string, string>();
      const classDefRegex = /classDef\s+\w+\s+fill:(#[A-Fa-f0-9]{6})/gi;
      let match;
      let index = 0;
      while ((match = classDefRegex.exec(currentContent)) !== null && index < nodes.length) {
        colorMap.set(nodes[index].id, match[1]);
        index++;
      }

      const defaultColor = activePalette?.colors.primary || '#0066CC';
      const updatedNodes = nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: colorMap.get(node.id) || defaultColor
      }));
      setNodeStyles(updatedNodes);
    }
  }, [currentContent, activePalette?.id]);

  // Generate preview for selected palette
  useEffect(() => {
    const palette = selectedPalette;
    if (palette) {
      const id = ++previewIdRef.current;
      const nodeColors = extractBranchesAndAssignColors(SAMPLE_DIAGRAM, palette);
      const contentWithStyles = applyNodeStyles(SAMPLE_DIAGRAM, nodeColors);

      renderDiagram(contentWithStyles, `palette_preview_${id}_${Date.now()}`).then(({ svg }) => {
        if (svg && id === previewIdRef.current) {
          setPreviewSvg(svg);
        }
      });
    } else {
      setPreviewSvg('');
    }
  }, [selectedPalette?.id]);

  // Apply palette
  const handleApplyPalette = (palette: ColorPalette) => {
    if (currentContent) {
      const cleanContent = stripThemeDirective(currentContent);
      const nodeColors = extractBranchesAndAssignColors(cleanContent, palette);
      const contentWithNodeColors = applyNodeStyles(cleanContent, nodeColors);
      onContentChange(contentWithNodeColors);
      setNodeStyles(nodeColors);
    }
  };

  // Apply individual node color change
  const handleResetToDefault = () => {
    if (currentContent) {
      onContentChange(stripThemeDirective(currentContent));
      setNodeStyles([]);
      setSelectedPalette(null);
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
        {/* Reset Button */}
        {activePalette && (
          <button
            onClick={handleResetToDefault}
            className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
            style={{
              background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
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
                Remove custom colors and use theme colors
              </p>
            </div>
          </button>
        )}

        {/* Color Palettes */}
        {colorPalettes.map((palette) => {
          const isActive = activePalette?.id === palette.id;
          const isSelected = selectedPalette?.id === palette.id;
          const showPreview = isSelected && previewSvg;

          return (
            <div
              key={palette.id}
              data-testid="palette-item"
              onClick={() => setSelectedPalette(palette)}
              className="rounded-lg border transition-all overflow-hidden cursor-pointer"
              style={{
                background: isActive
                  ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                  : (isSelected ? 'var(--surface-floating)' : 'var(--surface-base)'),
                borderColor: isActive ? 'var(--accent)' : (isSelected ? 'var(--accent)' : 'var(--border-subtle)'),
              }}
              title={palette.description}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {palette.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ color: 'var(--accent)', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        Active
                      </span>
                    )}
                    {isSelected && !isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPalette(palette);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium text-white transition-colors hover:opacity-90"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Check size={10} />
                        Apply
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.primary, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Primary" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.secondary, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Secondary" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.accent, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Accent" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.success, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Success" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.warning, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Warning" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.error, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Error" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.neutral_light, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Light" />
                  <div className="h-5 rounded-sm border" style={{ backgroundColor: palette.colors.neutral_dark, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} title="Dark" />
                </div>
              </div>

              {/* Preview Section - Below the palette colors, shown on click */}
              {showPreview && (
                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Preview
                    </span>
                  </div>
                  <div className="relative">
                    {/* Preview Diagram */}
                    <div
                      className="flex justify-center items-center overflow-auto"
                      style={{
                        background: isDark ? '#0d1117' : '#ffffff',
                        maxHeight: '180px'
                      }}
                    >
                      <div
                        className="pointer-events-none p-2"
                        dangerouslySetInnerHTML={{ __html: sanitizeSVG(previewSvg) }}
                      />
                    </div>

                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
