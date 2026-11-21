import type { NodeShape, NodeStyle, IconConfig, ImgConfig } from '@/lib/mermaid/codeUtils';

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
}

export interface SelectionState {
  nodeIds: string[];
  edgeKey: string | null;
}

export type ToolMode = 'select' | 'connect';
