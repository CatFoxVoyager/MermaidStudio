import type { Diagnostic } from '@codemirror/lint';
import type { Text } from '@codemirror/state';
import { detectDiagramType } from './diagramType';

export interface AgentflowDiagnosticPosition {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface AgentflowDiagnostic {
  id: string;
  severity: 'warning' | 'error';
  message: string;
  nodeId?: string;
  edgeId?: string;
  position?: AgentflowDiagnosticPosition;
}

interface AgentflowElementMapping {
  id: string;
  type: string;
  position: AgentflowDiagnosticPosition;
}

interface AgentflowSemanticVertex {
  id: string;
  label?: string;
  shape?: string;
  vertexKind?: string;
  metadata?: Record<string, unknown>;
}

interface AgentflowSemanticEdge {
  id?: string;
  start: string;
  end: string;
  label?: string;
  type?: string;
  stroke?: string;
  edgeSemantic?: string;
}

interface AgentflowSemanticSubGraph {
  id: string;
  nodes: string[];
  type?: string;
  title?: string;
}

interface AgentflowSemanticModel {
  vertices: AgentflowSemanticVertex[];
  edges: AgentflowSemanticEdge[];
  subGraphs: AgentflowSemanticSubGraph[];
  connectors: Array<{ id: string; title?: string }>;
  diagnostics?: AgentflowDiagnostic[];
}

interface AgentflowDBLike {
  getData?: () => unknown;
  getDiagnostics?: () => AgentflowDiagnostic[];
  getSemanticModel?: () => AgentflowSemanticModel;
  getElementById?: (id: string) => AgentflowElementMapping | undefined;
  globalNodes?: Set<string>;
}

/**
 * Compute how many lines precede the diagram header (leading blank lines +
 * YAML frontmatter block) so Mermaid's 1-based line numbers align with the
 * raw CodeMirror document when Mermaid hasn't already added the offset.
 */
function countFrontmatterLines(content: string): number {
  const lines = content.split('\n');
  let idx = 0;
  while (idx < lines.length && lines[idx].trim() === '') idx++;
  if (idx < lines.length && lines[idx].trim() === '---') {
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        return i + 1;
      }
    }
  }
  return idx;
}

function collectSemanticWarnings(
  db: AgentflowDBLike,
  model: AgentflowSemanticModel,
  existing: AgentflowDiagnostic[]
): AgentflowDiagnostic[] {
  const results: AgentflowDiagnostic[] = [];
  const seen = new Set(existing.map(d => `${d.id}:${d.nodeId ?? ''}:${d.edgeId ?? ''}`));

  const pushUnique = (diag: AgentflowDiagnostic) => {
    const key = `${diag.id}:${diag.nodeId ?? ''}:${diag.edgeId ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(diag);
  };

  const posOf = (id?: string): AgentflowDiagnosticPosition | undefined => {
    if (!id || typeof db.getElementById !== 'function') return undefined;
    return db.getElementById(id)?.position;
  };

  const subGraphIds = new Set(model.subGraphs.map(sg => sg.id));
  const connectorIds = new Set(model.connectors.map(c => c.id));
  const vertexById = new Map(model.vertices.map(v => [v.id, v]));
  const globalNodes = db.globalNodes instanceof Set ? db.globalNodes : new Set<string>();

  // Nodes contained inside any flow subgraph
  const containedNodeIds = new Set<string>();
  for (const sg of model.subGraphs) {
    for (const nodeId of sg.nodes) {
      containedNodeIds.add(nodeId);
    }
  }

  // 1. TASK_OUTSIDE_FLOW: task / tool / decision nodes placed outside any flow (and not in global)
  if (model.subGraphs.length > 0) {
    for (const v of model.vertices) {
      if (
        (v.vertexKind === 'task' || v.vertexKind === 'tool' || v.vertexKind === 'decision') &&
        !containedNodeIds.has(v.id) &&
        !globalNodes.has(v.id)
      ) {
        pushUnique({
          id: 'TASK_OUTSIDE_FLOW',
          severity: 'warning',
          nodeId: v.id,
          message: `Node "${v.id}" (${v.vertexKind}) is outside any flow container.`,
          position: posOf(v.id),
        });
      }
    }
  }

  // 2. FLOW_NO_INPUT: top-level or nested flow container has no input vertex in its subtree
  const subGraphById = new Map(model.subGraphs.map(sg => [sg.id, sg]));
  const hasInputInSubtree = (sgId: string, visited = new Set<string>()): boolean => {
    if (visited.has(sgId)) return false;
    visited.add(sgId);
    const sg = subGraphById.get(sgId);
    if (!sg) return false;
    for (const memberId of sg.nodes) {
      const v = vertexById.get(memberId);
      if (v?.vertexKind === 'input') return true;
      if (subGraphById.has(memberId) && hasInputInSubtree(memberId, visited)) return true;
    }
    return false;
  };

  for (const sg of model.subGraphs) {
    if (!hasInputInSubtree(sg.id)) {
      pushUnique({
        id: 'FLOW_NO_INPUT',
        severity: 'warning',
        nodeId: sg.id,
        message: `Flow "${sg.id}" has no input node (shape: input).`,
        position: posOf(sg.id),
      });
    }
  }

  // 3. CONNECTOR_REF_UNRESOLVED: tool/vertex connectorRef does not match a declared connector
  for (const v of model.vertices) {
    const rawRef = v.metadata?.connectorRef;
    if (typeof rawRef === 'string' && rawRef.trim().length > 0) {
      const prefix = rawRef.trim().split(/[./:]/)[0];
      if (!connectorIds.has(rawRef.trim()) && !connectorIds.has(prefix)) {
        pushUnique({
          id: 'CONNECTOR_REF_UNRESOLVED',
          severity: 'warning',
          nodeId: v.id,
          message: `connectorRef "${rawRef}" on "${v.id}" does not match any declared connector.`,
          position: posOf(v.id),
        });
      }
    }
  }

  // 4. Edge semantics: REFERENCE_EDGE_LABEL_REJECTED & EDGE_SEMANTIC_CONTRADICTION
  for (const e of model.edges) {
    const isReference = e.edgeSemantic === 'reference' || e.stroke === 'dotted';
    const isFailure = e.edgeSemantic === 'failure' || e.type === 'arrow_cross';
    const edgeAnchor = e.id ?? `${e.start}>${e.end}`;

    if (isReference && e.label && e.label.trim().length > 0) {
      pushUnique({
        id: 'REFERENCE_EDGE_LABEL_REJECTED',
        severity: 'warning',
        edgeId: edgeAnchor,
        message: `Reference edge (${e.start} -.- ${e.end}) ignores edge labels.`,
        position: posOf(e.start) ?? posOf(e.end),
      });
    }

    if (isReference) {
      const startKind = vertexById.get(e.start)?.vertexKind;
      const endKind = vertexById.get(e.end)?.vertexKind;
      if (startKind !== 'refdoc' && endKind !== 'refdoc') {
        pushUnique({
          id: 'EDGE_SEMANTIC_CONTRADICTION',
          severity: 'warning',
          edgeId: edgeAnchor,
          message: `Reference edge (${e.start} -.- ${e.end}) should connect to a refdoc node.`,
          position: posOf(e.start) ?? posOf(e.end),
        });
      }
    }

    if (isFailure && !subGraphIds.has(e.start) && !vertexById.has(e.start)) {
      pushUnique({
        id: 'EDGE_SEMANTIC_CONTRADICTION',
        severity: 'warning',
        edgeId: edgeAnchor,
        message: `Failure edge (${e.start} --x ${e.end}) originates from an unknown source.`,
        position: posOf(e.end),
      });
    }
  }

  // 5. DECISION_BRANCH_UNGUARDED: decision node with an unlabeled outgoing sequence edge
  for (const v of model.vertices) {
    if (v.vertexKind !== 'decision') continue;
    const outgoing = model.edges.filter(
      e => e.start === v.id && e.edgeSemantic !== 'reference' && e.stroke !== 'dotted'
    );
    const hasUnlabeledBranch = outgoing.some(e => !e.label || e.label.trim().length === 0);
    if (outgoing.length > 0 && hasUnlabeledBranch) {
      pushUnique({
        id: 'DECISION_BRANCH_UNGUARDED',
        severity: 'warning',
        nodeId: v.id,
        message: `Decision "${v.id}" has an unlabeled outgoing branch (add |condition| labels).`,
        position: posOf(v.id),
      });
    }
  }

  return results;
}

/**
 * Collect non-blocking Agentflow diagnostics by invoking Mermaid 12.3.0's
 * AgentFlowDB parser (`getDiagnostics()` + `getSemanticModel()`).
 * Lazily imports `mermaid` so boot/editor chunks keep 0 B static Mermaid impact.
 */
export async function collectAgentflowDiagnostics(code: string): Promise<AgentflowDiagnostic[]> {
  if (detectDiagramType(code) !== 'agentflow') {
    return [];
  }

  const trimmed = code.trimStart();
  if (!trimmed) return [];

  try {
    const { default: mermaid } = await import('mermaid');
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(trimmed);
    const db = (diagram as { db?: AgentflowDBLike })?.db;
    if (!db) return [];

    // Trigger Mermaid's normaliseNodeShapes & containment validators via getData()
    // before reading getDiagnostics() and getSemanticModel().
    if (typeof db.getData === 'function') {
      db.getData();
    }
    const semanticModel = typeof db.getSemanticModel === 'function' ? db.getSemanticModel() : undefined;
    const parserDiags: AgentflowDiagnostic[] =
      typeof db.getDiagnostics === 'function' ? db.getDiagnostics() : [];

    const semanticDiags = semanticModel
      ? collectSemanticWarnings(db, semanticModel, parserDiags)
      : [];

    return [...parserDiags, ...semanticDiags];
  } catch {
    // Syntax errors are already surfaced by the live preview panel — keep lint non-blocking.
    return [];
  }
}

/**
 * Convert Agentflow diagnostics into CodeMirror `@codemirror/lint` Diagnostic entries.
 */
export function mapAgentflowDiagnosticsToCodeMirror(
  doc: Text,
  diagnostics: AgentflowDiagnostic[]
): Diagnostic[] {
  if (diagnostics.length === 0 || doc.lines === 0) return [];

  const rawText = doc.toString();
  const frontmatterOffset = countFrontmatterLines(rawText);

  return diagnostics.map(diag => {
    let from = 0;
    let to = Math.min(doc.length, doc.line(1).to);

    if (diag.position && diag.position.startLine >= 1) {
      // Mermaid's AgentFlowDB already tracks frontmatterLineOffset when set,
      // but if position.startLine falls inside the frontmatter region we shift it.
      let startLineNum = diag.position.startLine;
      let endLineNum = diag.position.endLine || startLineNum;
      if (frontmatterOffset > 0 && startLineNum <= frontmatterOffset) {
        startLineNum += frontmatterOffset;
        endLineNum += frontmatterOffset;
      }

      const clampedStartLine = Math.min(Math.max(1, startLineNum), doc.lines);
      const clampedEndLine = Math.min(Math.max(clampedStartLine, endLineNum), doc.lines);
      const startLine = doc.line(clampedStartLine);
      const endLine = doc.line(clampedEndLine);

      const startCol = Math.min(Math.max(0, diag.position.startColumn ?? 0), startLine.length);
      const endCol = Math.min(
        Math.max(startCol, diag.position.endColumn ?? endLine.length),
        endLine.length
      );

      from = startLine.from + startCol;
      to = Math.max(from, endLine.from + endCol);
      if (from === to) {
        from = startLine.from;
        to = startLine.to;
      }
    }

    return {
      from,
      to,
      severity: diag.severity === 'error' ? 'error' : 'warning',
      source: 'agentflow',
      message: `[${diag.id}] ${diag.message}`,
    };
  });
}
