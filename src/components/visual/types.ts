import type { NodeShape, NodeStyle } from '@/lib/mermaid/codeUtils';

export type { NodeShape, NodeStyle };

export interface VisualNode {
  id: string;
  label: string;
  shape: NodeShape;
  style: NodeStyle;
  x: number;
  y: number;
  width: number;
  height: number;
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
