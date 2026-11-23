import type { NodeShape, NodeStyle, IconConfig, ImgConfig, EdgeMetadata } from '@/lib/mermaid/codeUtils';

export type { NodeShape, NodeStyle };
export type { IconConfig, ImgConfig };

export interface VisualNode {
  id: string;
  label: string;
  shape: NodeShape;
  style: NodeStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * 39-04 (ICON-03): the node's parsed media configs (from the 39-01 typed
   * directive layer), carried on the visual model so PropertiesPanel can
   * derive the media-tab state. Undefined when the node carries no such
   * media — mermaid's cross-strip invariant means a node never carries both.
   */
  icon?: IconConfig;
  img?: ImgConfig;
}

export interface VisualEdge {
  source: string;
  target: string;
  arrowType: string;
  label: string;
  edgeIndex?: number;
  /**
   * 40-02 (EDGE-03): the parsed edge's bare 12.3 id, user-facing link length
   * (omitted at 1) and typed metadata — derived from parseDiagram's edge in
   * VisualEditorCanvas's selectedEdge path (components never re-parse code
   * strings; the locked 39 derivation rule). Writes route through the
   * codeUtils mutators via the canvas handlers.
   */
  edgeId?: string;
  length?: number;
  metadata?: EdgeMetadata;
}

export interface SelectionState {
  nodeIds: string[];
  edgeKey: string | null;
  subgraphId?: string | null;
}

export type ToolMode = 'select' | 'connect';
