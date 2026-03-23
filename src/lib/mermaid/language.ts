import { StreamLanguage, StringStream } from '@codemirror/language';

const DIAGRAM_TYPES = new Set([
  'flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram',
  'statediagram-v2', 'erdiagram', 'gantt', 'pie', 'mindmap', 'gitgraph',
  'journey', 'quadrantchart', 'requirementdiagram', 'timeline', 'sankey-beta',
  'xychart-beta', 'block-beta',
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

const ALL_KEYWORDS = new Set([
  ...FLOWCHART_KEYWORDS, ...SEQUENCE_KEYWORDS, ...GANTT_KEYWORDS,
  ...STATE_KEYWORDS, ...CLASS_KEYWORDS, ...ER_KEYWORDS,
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

    if (stream.eatSpace()) {return null;}

    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) {return 'string';}
    if (stream.match(/^'(?:[^'\\]|\\.)*'/)) {return 'string';}

    if (stream.match(/^---?>>?/)) {return 'keyword';}
    if (stream.match(/^-->>/)) {return 'keyword';}
    if (stream.match(/^-\.->>?/)) {return 'keyword';}
    if (stream.match(/^==+>/)) {return 'keyword';}
    if (stream.match(/^--+>/)) {return 'keyword';}
    if (stream.match(/^-\.->/)) {return 'keyword';}
    if (stream.match(/^-->/)) {return 'keyword';}
    if (stream.match(/^---/)) {return 'keyword';}
    if (stream.match(/^-\.->?/)) {return 'keyword';}
    if (stream.match(/^~~~/)) {return 'keyword';}
    if (stream.match(/^<--/)) {return 'keyword';}
    if (stream.match(/^o--/)) {return 'keyword';}
    if (stream.match(/^--o/)) {return 'keyword';}
    if (stream.match(/^\|>/)) {return 'keyword';}
    if (stream.match(/^--\|>/)) {return 'keyword';}

    if (stream.match(/^\|\|--o\{/)) {return 'keyword';}
    if (stream.match(/^\|\|--\|\{/)) {return 'keyword';}
    if (stream.match(/^\}o--o\{/)) {return 'keyword';}
    if (stream.match(/^\|\|--\|\|/)) {return 'keyword';}
    if (stream.match(/^\}o--\|\{/)) {return 'keyword';}

    if (stream.match(/^[|]{1,2}/)) {return 'bracket';}

    if (stream.match(/^[{}[\]()]/)) {return 'bracket';}
    if (stream.match(/^[<>]+/)) {return 'bracket';}

    if (stream.match(/^:>/)) {return 'operator';}
    if (stream.peek() === ':') { stream.next(); return 'operator'; }

    if (stream.match(/^\d{4}-\d{2}-\d{2}/)) {return 'number';}
    if (stream.match(/^\d+(\.\d+)?/)) {return 'number';}

    if (stream.match(/^#[0-9a-fA-F]{3,8}/)) {return 'number';}

    if (stream.match(/^[a-zA-Z_]\w*/)) {
      const word = stream.current();
      const lower = word.toLowerCase();

      if (!state.diagramType && DIAGRAM_TYPES.has(lower)) {
        state.diagramType = lower;
        return 'keyword';
      }

      if (ALL_KEYWORDS.has(word) || ALL_KEYWORDS.has(lower)) {
        return 'keyword';
      }

      if (lower === 'true' || lower === 'false') {return 'atom';}

      if (word.startsWith('PK') || word.startsWith('FK') || word === 'UK') {return 'typeName';}

      return 'variableName';
    }

    if (stream.match(/^&[#\w]+;/)) {return 'string';}

    stream.next();
    return null;
  },
};

export const mermaidLanguage = StreamLanguage.define(mermaidMode);

export const MERMAID_KEYWORDS = [
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2',
  'erDiagram', 'gantt', 'pie', 'mindmap', 'gitGraph', 'journey',
  'subgraph', 'end', 'participant', 'actor', 'activate', 'deactivate',
  'note', 'over', 'loop', 'alt', 'else', 'opt', 'par', 'and',
  'critical', 'break', 'rect', 'autonumber', 'title', 'section',
  'dateFormat', 'axisFormat', 'todayMarker', 'excludes',
  'done', 'active', 'crit', 'milestone', 'after',
  'state', 'direction', 'class', 'namespace', 'callback',
  'click', 'link', 'style', 'classDef', 'linkStyle',
  'TD', 'TB', 'BT', 'RL', 'LR',
];

export const MERMAID_SHAPES = [
  '[text]', '(text)', '([text])', '[[text]]', '[(text)]',
  '{text}', '{{text}}', '[/text/]', '[\\text\\]',
  '[/text\\]', '[\\text/]', '((text))', '>text]',
];

export const MERMAID_ARROWS = [
  '-->', '---', '-.->', '-.->>', '==>', '-->>', '-->>',
  '<-->', 'o--o', '<-->',
];
