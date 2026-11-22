// src/lib/mermaid/diagramType.ts
// Core-free home of detectDiagramType (29-02, PERF-01): a regex-only pure
// parser that must stay synchronously callable WITHOUT the mermaid runtime.
// Zero runtime imports by design — boot-path consumers (themeDerivation,
// StatusBar, Sidebar, SaveTemplateModal, AdvancedStylePanel) import from
// here, never from './core', so the boot chain stays lazy. Guarded by the
// PERF-01 parser purity gate in src/__tests__/bundlePerf.test.ts.
import type { DiagramType } from '@/types';

const UNICODE_WS_RE = /\s/;
const XYCHART_RE = /^xychart(?:-beta)?(?:\s|$)/;
const USECASE_RE = /^usecase-beta(?:\s|$)/;
const ISHIKAWA_RE = /^ishikawa(?:-beta)?\b/i;
const RADAR_RE = /^radar-beta(?:\s|$)/;
const TREEMAP_RE = /^treemap(?:-beta)?(?:\s|$)/;
const EVENTMODELING_RE = /^eventmodeling(?:\s|$)/;
const VENN_RE = /^venn-beta(?:\s|$)/;
const TREEVIEW_RE = /^treeView-beta(?:\s|$)/;
const WARDLEY_RE = /^wardley-beta(?:\s|$)/i;
const CYNEFIN_RE = /^cynefin-beta(?:[\s:]|$)/;
const RAILROAD_RE = /^railroad(?:-(?:ebnf|abnf|peg))?-beta(?:\s|$)/i;
const SWIMLANE_RE = /^swimlane-beta\b/;
const AGENTFLOW_RE = /^agentflow(?:-beta)?(?:\s|$)/i;

function skipWs(s: string, i: number): number {
  const len = s.length;
  while (i < len) {
    const c = s.charCodeAt(i);
    if (c === 32 || (c >= 9 && c <= 13)) {
      i++;
    } else if (c > 127 && UNICODE_WS_RE.test(s[i])) {
      i++;
    } else {
      break;
    }
  }
  return i;
}

export function detectDiagramType(content: string): DiagramType {
  const len = content.length;
  let pos = skipWs(content, 0);

  // Skip YAML frontmatter if present (matches /^\s*---[\s\S]*?---\s*/i once)
  if (
    pos + 2 < len &&
    content.charCodeAt(pos) === 45 &&
    content.charCodeAt(pos + 1) === 45 &&
    content.charCodeAt(pos + 2) === 45
  ) {
    const closeIdx = content.indexOf('---', pos + 3);
    if (closeIdx !== -1) {
      pos = skipWs(content, closeIdx + 3);
    }
  }

  // Skip legacy init directive if present (matches /^\s*%%\{init:[\s\S]*?\}%%\s*/i once)
  if (
    pos + 7 < len &&
    content.charCodeAt(pos) === 37 &&
    content.charCodeAt(pos + 1) === 37 &&
    content.charCodeAt(pos + 2) === 123 &&
    content.slice(pos + 3, pos + 8).toLowerCase() === 'init:'
  ) {
    const closeIdx = content.indexOf('}%%', pos + 8);
    if (closeIdx !== -1) {
      pos = skipWs(content, closeIdx + 3);
    }
  }

  // Skip leading Mermaid comment lines (matches /^(%%[^\n]*\n?)+/i followed by .trim())
  while (
    pos + 1 < len &&
    content.charCodeAt(pos) === 37 &&
    content.charCodeAt(pos + 1) === 37
  ) {
    const nl = content.indexOf('\n', pos + 2);
    if (nl === -1) {
      pos = len;
      break;
    }
    pos = nl + 1;
  }
  pos = skipWs(content, pos);

  if (pos >= len) return 'unknown';

  // Preserve original casing for case-sensitive v12 detectors (e.g. `treeView-beta`).
  const lineEnd = content.indexOf('\n', pos);
  const rawFirst = (lineEnd === -1 ? content.slice(pos) : content.slice(pos, lineEnd)).trim();
  const first = rawFirst.toLowerCase();
  if (!first) return 'unknown';

  switch (first.charCodeAt(0)) {
    case 97: // 'a'
      if (first.startsWith('architecture')) return 'architectureDiagram';
      if (AGENTFLOW_RE.test(rawFirst)) return 'agentflow';
      return 'unknown';

    case 98: // 'b'
      if (first.startsWith('blockbeta') || first.startsWith('block')) return 'blockDiagram';
      return 'unknown';

    case 99: // 'c'
      if (first.startsWith('classdiagram')) return 'classDiagram';
      if (first.startsWith('c4')) return 'c4';
      if (CYNEFIN_RE.test(rawFirst)) return 'cynefin';
      return 'unknown';

    case 101: // 'e'
      if (first.startsWith('erdiagram')) return 'erDiagram';
      if (EVENTMODELING_RE.test(rawFirst)) return 'eventmodeling';
      return 'unknown';

    case 102: // 'f'
      if (first.startsWith('flowchart')) return 'flowchart';
      return 'unknown';

    case 103: // 'g'
      if (first.startsWith('graph')) return 'flowchart';
      if (first.startsWith('gantt')) return 'gantt';
      if (first.startsWith('gitgraph')) return 'gitGraph';
      return 'unknown';

    case 105: // 'i'
      if (ISHIKAWA_RE.test(rawFirst)) return 'ishikawa';
      return 'unknown';

    case 106: // 'j'
      if (first.startsWith('journey')) return 'journey';
      return 'unknown';

    case 107: // 'k'
      if (first.startsWith('kanban')) return 'kanban';
      return 'unknown';

    case 109: // 'm'
      if (first.startsWith('mindmap')) return 'mindmap';
      return 'unknown';

    case 112: // 'p'
      if (first.startsWith('pie')) return 'pie';
      if (first.startsWith('packet')) return 'packetDiagram';
      return 'unknown';

    case 113: // 'q'
      if (first.startsWith('quadrantchart')) return 'quadrantChart';
      return 'unknown';

    case 114: // 'r'
      if (first.startsWith('requirementdiagram')) return 'requirementDiagram';
      if (RADAR_RE.test(rawFirst)) return 'radar';
      if (RAILROAD_RE.test(rawFirst)) return 'railroad';
      return 'unknown';

    case 115: // 's'
      if (first.startsWith('sequencediagram')) return 'sequence';
      if (first.startsWith('statediagram')) return 'stateDiagram';
      if (first.startsWith('sankey-beta') || first.startsWith('sankey')) return 'sankey';
      if (SWIMLANE_RE.test(rawFirst)) return 'swimlane';
      return 'unknown';

    case 116: // 't'
      if (first.startsWith('timeline')) return 'timeline';
      if (TREEMAP_RE.test(rawFirst)) return 'treemap';
      if (TREEVIEW_RE.test(rawFirst)) return 'treeView';
      return 'unknown';

    case 117: // 'u'
      if (USECASE_RE.test(first)) return 'usecaseDiagram';
      return 'unknown';

    case 118: // 'v'
      if (VENN_RE.test(rawFirst)) return 'venn';
      return 'unknown';

    case 119: // 'w'
      if (WARDLEY_RE.test(rawFirst)) return 'wardley';
      return 'unknown';

    case 120: // 'x'
      if (XYCHART_RE.test(first)) return 'xyChart';
      return 'unknown';

    case 122: // 'z'
      if (first.startsWith('zenuml')) return 'zenuml';
      return 'unknown';

    default:
      return 'unknown';
  }
}
