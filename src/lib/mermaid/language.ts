import { StreamLanguage, StringStream } from '@codemirror/language';
import { CANONICAL_SHAPES, ALIAS_TO_CANONICAL } from './shapes';

const EXACT_DIAGRAM_TYPES = new Set(['treeView-beta']);

const DIAGRAM_TYPES = new Set([
  'flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram',
  'statediagram-v2', 'erdiagram', 'gantt', 'pie', 'mindmap', 'gitgraph',
  'journey', 'quadrantchart', 'requirementdiagram', 'timeline', 'sankey',
  'sankey-beta', 'xychart', 'xychart-beta', 'block', 'block-beta', 'kanban',
  'architecture-beta', 'c4context', 'c4container', 'c4component', 'c4dynamic',
  'c4deployment', 'packet', 'packet-beta', 'usecase-beta', 'ishikawa',
  'ishikawa-beta', 'radar-beta', 'treemap', 'treemap-beta', 'eventmodeling',
  'venn-beta', 'wardley-beta', 'cynefin-beta', 'railroad-beta',
  'railroad-ebnf-beta', 'railroad-abnf-beta', 'railroad-peg-beta',
  'swimlane-beta', 'agentflow', 'agentflow-beta',
]);

const SHAPE_TOKENS = new Set<string>([
  ...CANONICAL_SHAPES.map(shape => shape.shortName),
  ...ALIAS_TO_CANONICAL.keys(),
  'task', 'tool', 'input', 'decision', 'refdoc', 'action',
]);

const DIRECTIVE_KEYWORDS = new Set([
  'shape', 'icon', 'img', 'form', 'pos', 'w', 'h', 'constraint', 'label',
  'animate', 'animation', 'step', 'curve', 'view', 'collapsed', 'expanded',
  'fast', 'slow', 'algorithm', 'schedule', 'cron', 'at', 'timezone',
  'instruction', 'description', 'connectorRef', 'params', 'protocol',
]);

const FLOWCHART_KEYWORDS = new Set([
  'subgraph', 'end', 'direction', 'click', 'style', 'classDef', 'class',
  'linkStyle', 'callback', 'TD', 'TB', 'BT', 'RL', 'LR',
]);

const SEQUENCE_KEYWORDS = new Set([
  'participant', 'actor', 'activate', 'deactivate', 'note', 'over',
  'loop', 'alt', 'else', 'opt', 'par', 'and', 'critical', 'break',
  'rect', 'end', 'autonumber', 'title',
]);

const GANTT_KEYWORDS = new Set([
  'title', 'dateformat', 'axisformat', 'todaymarker', 'excludes',
  'section', 'done', 'active', 'crit', 'milestone', 'after',
]);

const STATE_KEYWORDS = new Set([
  'state', 'direction', 'note', 'end', 'fork', 'join', 'choice',
]);

const CLASS_KEYWORDS = new Set([
  'class', 'namespace', 'callback', 'click', 'link', 'style',
  'cssclass', 'direction', 'note',
]);

const ER_KEYWORDS = new Set(['title', 'accTitle', 'accDescr']);

const V12_FAMILY_KEYWORDS = new Set([
  'systemBoundary', 'include', 'extend', 'group', 'service', 'junction', 'in',
  'Person', 'System', 'Container', 'Component', 'Rel',
  'axis', 'min', 'max', 'graticule', 'ticks', 'showLegend', 'showData',
  'clear', 'complicated', 'complex', 'chaotic', 'confusion',
  'set', 'union', 'tf', 'ui', 'cmd', 'evt', 'rmo', 'prj', 'aut',
  'terminal', 'nonterminal', 'special', 'sequence', 'optional', 'oneOrMore', 'zeroOrMore',
  'anchor', 'component', 'pipeline', 'evolve', 'source', 'accelerator', 'deaccelerator',
  'x-axis', 'y-axis', 'columns', 'space', 'requirement', 'element', 'functionalRequirement',
  'flow', 'global', 'connector',
]);

const ALL_KEYWORDS = new Set([
  ...FLOWCHART_KEYWORDS, ...SEQUENCE_KEYWORDS, ...GANTT_KEYWORDS,
  ...STATE_KEYWORDS, ...CLASS_KEYWORDS, ...ER_KEYWORDS,
  ...DIRECTIVE_KEYWORDS, ...V12_FAMILY_KEYWORDS,
]);

const mermaidMode = {
  startState() {
    return { inString: false, inComment: false, diagramType: '' };
  },

  token(stream: StringStream, state: { inString: boolean; inComment: boolean; diagramType: string }) {
    if (state.inComment) {
      if (stream.match('*/')) { state.inComment = false; return 'comment'; }
      stream.next();
      return 'comment';
    }

    if (stream.match('%%')) {
      stream.skipToEnd();
      return 'comment';
    }

    if (stream.match('/*')) {
      state.inComment = true;
      return 'comment';
    }

    if (stream.eatSpace()) { return null; }

    // Markdown ("`text`") and standard quoted strings
    if (stream.match(/^"(?:`[^`]*`|[^"\\]|\\.)*"/)) { return 'string'; }
    if (stream.match(/^`[^`]*`/)) { return 'string'; }
    if (stream.match(/^'(?:[^'\\]|\\.)*'/)) { return 'string'; }

    // ER / Class connectors
    if (stream.match(/^\|\|--o\{/)) { return 'keyword'; }
    if (stream.match(/^\|\|--\|\{/)) { return 'keyword'; }
    if (stream.match(/^\}o--o\{/)) { return 'keyword'; }
    if (stream.match(/^\|\|--\|\|/)) { return 'keyword'; }
    if (stream.match(/^\}o--\|\{/)) { return 'keyword'; }
    if (stream.match(/^<\|--/)) { return 'keyword'; }
    if (stream.match(/^\*--/)) { return 'keyword'; }

    // Bidirectional and v12 Flowchart / Sequence arrows
    if (stream.match(/^<--+>/)) { return 'keyword'; }
    if (stream.match(/^<-\.-+>/)) { return 'keyword'; }
    if (stream.match(/^<==+>/)) { return 'keyword'; }
    if (stream.match(/^x--+x/)) { return 'keyword'; }
    if (stream.match(/^o--+o/)) { return 'keyword'; }
    if (stream.match(/^x-\.-+x/)) { return 'keyword'; }
    if (stream.match(/^o-\.-+o/)) { return 'keyword'; }
    if (stream.match(/^x==+x/)) { return 'keyword'; }
    if (stream.match(/^o==+o/)) { return 'keyword'; }
    if (stream.match(/^[xo]--+[xo>]?/)) { return 'keyword'; }
    if (stream.match(/^[xo]-\.-+[xo>]?/)) { return 'keyword'; }
    if (stream.match(/^[xo]==+[xo>]?/)) { return 'keyword'; }
    if (stream.match(/^---?>>?/)) { return 'keyword'; }
    if (stream.match(/^-->>/)) { return 'keyword'; }
    if (stream.match(/^-\.->>?/)) { return 'keyword'; }
    if (stream.match(/^==+[xo>]?/)) { return 'keyword'; }
    if (stream.match(/^--+[xo>]/)) { return 'keyword'; }
    if (stream.match(/^-\.-+[xo>]?/)) { return 'keyword'; }
    if (stream.match(/^---+/)) { return 'keyword'; }
    if (stream.match(/^===+/)) { return 'keyword'; }
    if (stream.match(/^~~~+/)) { return 'keyword'; }
    if (stream.match(/^<--/)) { return 'keyword'; }
    if (stream.match(/^--\|>/)) { return 'keyword'; }
    if (stream.match(/^\|>/)) { return 'keyword'; }

    // Edge ID prefix (e.g. e1@-->) without swallowing node@{...}
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_-]*@(?![\s{])/)) {
      return 'variableName';
    }
    if (stream.match(/^@/)) { return 'keyword'; }

    if (stream.match(/^[|]{1,2}/)) { return 'bracket'; }
    if (stream.match(/^[{}[\]()]/)) { return 'bracket'; }
    if (stream.match(/^[<>]+/)) { return 'bracket'; }

    if (stream.match(/^:>/)) { return 'operator'; }
    if (stream.peek() === ':') { stream.next(); return 'operator'; }

    if (stream.match(/^\d{4}-\d{2}-\d{2}/)) { return 'number'; }
    if (stream.match(/^\d+(\.\d+)?/)) { return 'number'; }
    if (stream.match(/^#[0-9a-fA-F]{3,8}/)) { return 'number'; }

    if (stream.match(/^[a-zA-Z_](?:[a-zA-Z0-9_]|-(?![->.]))*/)) {
      const word = stream.current();
      const lower = word.toLowerCase();

      if (!state.diagramType && (EXACT_DIAGRAM_TYPES.has(word) || DIAGRAM_TYPES.has(lower))) {
        state.diagramType = EXACT_DIAGRAM_TYPES.has(word) ? word : lower;
        return 'keyword';
      }

      if (ALL_KEYWORDS.has(word) || ALL_KEYWORDS.has(lower)) {
        return 'keyword';
      }

      if (SHAPE_TOKENS.has(word)) {
        return 'typeName';
      }

      if (lower === 'true' || lower === 'false') { return 'atom'; }

      if (word.startsWith('PK') || word.startsWith('FK') || word === 'UK') { return 'typeName'; }

      return 'variableName';
    }

    if (stream.match(/^&[#\w]+;/)) { return 'string'; }

    stream.next();
    return null;
  },
};

export const mermaidLanguage = StreamLanguage.define(mermaidMode);

export const MERMAID_KEYWORDS = Array.from(new Set([
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2',
  'erDiagram', 'gantt', 'pie', 'mindmap', 'gitGraph', 'journey',
  'quadrantChart', 'requirementDiagram', 'timeline', 'sankey-beta',
  'xychart', 'xychart-beta', 'block', 'block-beta', 'kanban',
  'architecture-beta', 'C4Context', 'packet', 'packet-beta', 'usecase-beta',
  'ishikawa-beta', 'radar-beta',
  'treemap-beta', 'eventmodeling', 'venn-beta', 'treeView-beta',
  'wardley-beta', 'cynefin-beta', 'railroad-beta', 'railroad-ebnf-beta',
  'railroad-abnf-beta', 'railroad-peg-beta', 'swimlane-beta', 'agentflow-beta',
  'subgraph', 'flow', 'global', 'connector', 'end', 'participant', 'actor', 'activate', 'deactivate',
  'note', 'over', 'loop', 'alt', 'else', 'opt', 'par', 'and',
  'critical', 'break', 'rect', 'autonumber', 'title', 'section',
  'dateFormat', 'axisFormat', 'todayMarker', 'excludes',
  'done', 'active', 'crit', 'milestone', 'after',
  'state', 'direction', 'class', 'namespace', 'callback',
  'click', 'link', 'style', 'classDef', 'linkStyle',
  'systemBoundary', 'animate', 'animation', 'step', 'curve', 'view',
  'collapsed', 'expanded', 'algorithm', 'schedule', 'icon', 'img',
  'TD', 'TB', 'BT', 'RL', 'LR',
]));

export const MERMAID_SHAPES = Array.from(new Set([
  '[text]', '(text)', '([text])', '[[text]]', '[(text)]',
  '{text}', '{{text}}', '[/text/]', '[\\text\\]',
  '[/text\\]', '[\\text/]', '((text))', '>text]',
  '@{ shape: rect, label: "text" }', '"`Markdown`"',
]));

export const MERMAID_ARROWS = Array.from(new Set([
  '-->', '---', '-.->', '-.->>', '==>', '-->>',
  '<-->', '<-.->', '<==>', 'o--o', '--o', 'o--',
  'x--x', '--x', 'x--', '-.-', '===', '~~~',
]));
