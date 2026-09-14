import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { MERMAID_KEYWORDS, MERMAID_ARROWS } from './language';

const DIAGRAM_STARTERS = [
  { label: 'flowchart TD', detail: 'Top-down flowchart', type: 'keyword' },
  { label: 'flowchart LR', detail: 'Left-right flowchart', type: 'keyword' },
  { label: 'flowchart BT', detail: 'Bottom-top flowchart', type: 'keyword' },
  { label: 'flowchart RL', detail: 'Right-left flowchart', type: 'keyword' },
  { label: 'sequenceDiagram', detail: 'Sequence diagram', type: 'keyword' },
  { label: 'classDiagram', detail: 'Class diagram', type: 'keyword' },
  { label: 'stateDiagram-v2', detail: 'State diagram', type: 'keyword' },
  { label: 'erDiagram', detail: 'Entity relationship diagram', type: 'keyword' },
  { label: 'gantt', detail: 'Gantt chart', type: 'keyword' },
  { label: 'pie', detail: 'Pie chart', type: 'keyword' },
  { label: 'mindmap', detail: 'Mindmap', type: 'keyword' },
  { label: 'gitGraph', detail: 'Git graph', type: 'keyword' },
  { label: 'journey', detail: 'User journey', type: 'keyword' },
  { label: 'quadrantChart', detail: 'Quadrant matrix chart', type: 'keyword' },
  { label: 'requirementDiagram', detail: 'System requirements', type: 'keyword' },
  { label: 'timeline', detail: 'Timeline diagram', type: 'keyword' },
  { label: 'sankey-beta', detail: 'Sankey flow diagram', type: 'keyword' },
  { label: 'xychart-beta', detail: 'XY scatter chart', type: 'keyword' },
  { label: 'kanban', detail: 'Kanban board', type: 'keyword' },
  { label: 'block-beta', detail: 'Block diagram', type: 'keyword' },
  { label: 'usecase-beta', detail: 'Use case diagram', type: 'keyword' },
  { label: 'railroad-beta', detail: 'Railroad diagram', type: 'keyword' },
  { label: 'cynefin-beta', detail: 'Cynefin domain chart', type: 'keyword' },
  { label: 'swimlane-beta', detail: 'Swimlane diagram', type: 'keyword' },
];

// Curated v12 shape vocabulary (D5 / Open Question 1 resolution): the app's
// own V11_SHAPES from codeUtils.ts (all resolve under v12 as shortName or
// alias — 24-RESEARCH.md) plus 14 clearly v12-era shortNames from the verified
// 53-name registry. The full registry stays documented in 24-RESEARCH.md as
// the safe superset source; an exhaustive dump is autocomplete noise (D5).
const SHAPE_NAMES = [
  'doc', 'docs', 'dbl-circ', 'cross-circ', 'bow-rect', 'flip-tri', 'curv-trap',
  'manual-file', 'manual-input', 'procs', 'paper-tape',
  'person', 'browser', 'cloud', 'console', 'bucket', 'folder', 'fork', 'join',
  'hourglass', 'flag', 'text', 'odd', 'bang', 'bolt',
];

const SHAPE_COMPLETIONS = SHAPE_NAMES.map(shape => ({ label: shape, detail: `Shape: ${shape}`, type: 'type' }));

const FLOWCHART_COMPLETIONS = [
  { label: 'subgraph', detail: 'Start a subgraph block', type: 'keyword' },
  { label: 'end', detail: 'End a block', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'click', detail: 'Click event handler', type: 'keyword' },
  { label: 'style', detail: 'Style a node', type: 'keyword' },
  { label: 'classDef', detail: 'Define a style class', type: 'keyword' },
  { label: 'linkStyle', detail: 'Style a link', type: 'keyword' },
  { label: '-->', detail: 'Arrow connection', type: 'operator' },
  { label: '---', detail: 'Line connection', type: 'operator' },
  { label: '-.->',detail: 'Dotted arrow', type: 'operator' },
  { label: '==>', detail: 'Thick arrow', type: 'operator' },
  { label: '-->>',detail: 'Open arrow', type: 'operator' },
  { label: '@{ view: collapsed }', detail: 'Collapse subgraph to a single node (makes the visual editor read-only)', type: 'keyword' },
  { label: '@{ shape: ', detail: 'Attach shape metadata to a node (makes the visual editor read-only)', type: 'keyword' },
  ...SHAPE_COMPLETIONS,
];

const SEQUENCE_COMPLETIONS = [
  { label: 'participant', detail: 'Declare a participant', type: 'keyword' },
  { label: 'actor', detail: 'Declare an actor', type: 'keyword' },
  { label: 'activate', detail: 'Activate a lifeline', type: 'keyword' },
  { label: 'deactivate', detail: 'Deactivate a lifeline', type: 'keyword' },
  { label: 'note over', detail: 'Note over participant(s)', type: 'keyword' },
  { label: 'note left of', detail: 'Note on the left', type: 'keyword' },
  { label: 'note right of', detail: 'Note on the right', type: 'keyword' },
  { label: 'loop', detail: 'Loop block', type: 'keyword' },
  { label: 'alt', detail: 'Alternative block', type: 'keyword' },
  { label: 'else', detail: 'Else branch', type: 'keyword' },
  { label: 'opt', detail: 'Optional block', type: 'keyword' },
  { label: 'par', detail: 'Parallel block', type: 'keyword' },
  { label: 'critical', detail: 'Critical block', type: 'keyword' },
  { label: 'break', detail: 'Break block', type: 'keyword' },
  { label: 'rect', detail: 'Highlight rectangle', type: 'keyword' },
  { label: 'end', detail: 'End a block', type: 'keyword' },
  { label: 'autonumber', detail: 'Auto-number messages', type: 'keyword' },
  { label: '->>', detail: 'Solid arrow with head', type: 'operator' },
  { label: '-->>',detail: 'Dotted arrow with head', type: 'operator' },
  { label: '->>', detail: 'Solid arrow', type: 'operator' },
  { label: '->>',  detail: 'Async message', type: 'operator' },
  { label: '-->>',  detail: 'Async reply', type: 'operator' },
  { label: '-x',  detail: 'Lost message', type: 'operator' },
];

const GANTT_COMPLETIONS = [
  { label: 'title', detail: 'Chart title', type: 'keyword' },
  { label: 'dateFormat', detail: 'Set date format', type: 'keyword' },
  { label: 'axisFormat', detail: 'Set axis format', type: 'keyword' },
  { label: 'todayMarker', detail: 'Today marker style', type: 'keyword' },
  { label: 'excludes', detail: 'Exclude dates', type: 'keyword' },
  { label: 'section', detail: 'Define a section', type: 'keyword' },
  { label: ':done,', detail: 'Completed task', type: 'property' },
  { label: ':active,', detail: 'Active task', type: 'property' },
  { label: ':crit,', detail: 'Critical task', type: 'property' },
  { label: ':milestone,', detail: 'Milestone marker', type: 'property' },
  { label: 'after', detail: 'Task dependency', type: 'keyword' },
];

const ER_COMPLETIONS = [
  { label: '||--o{', detail: 'One-to-many', type: 'operator' },
  { label: '||--|{', detail: 'One-to-many (must)', type: 'operator' },
  { label: '}o--o{', detail: 'Many-to-many', type: 'operator' },
  { label: '||--||', detail: 'One-to-one', type: 'operator' },
  { label: 'string', detail: 'String type', type: 'type' },
  { label: 'int', detail: 'Integer type', type: 'type' },
  { label: 'uuid', detail: 'UUID type', type: 'type' },
  { label: 'text', detail: 'Text type', type: 'type' },
  { label: 'timestamp', detail: 'Timestamp type', type: 'type' },
  { label: 'boolean', detail: 'Boolean type', type: 'type' },
  { label: 'float', detail: 'Float type', type: 'type' },
  { label: 'PK', detail: 'Primary key', type: 'keyword' },
  { label: 'FK', detail: 'Foreign key', type: 'keyword' },
];

const STATE_COMPLETIONS = [
  { label: 'state', detail: 'Define a state', type: 'keyword' },
  { label: '[*]', detail: 'Start/end state', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'note left of', detail: 'Note on left', type: 'keyword' },
  { label: 'note right of', detail: 'Note on right', type: 'keyword' },
  { label: '-->', detail: 'Transition', type: 'operator' },
];

const CLASS_COMPLETIONS = [
  { label: 'class', detail: 'Define a class', type: 'keyword' },
  { label: 'namespace', detail: 'Define a namespace', type: 'keyword' },
  { label: '<<interface>>', detail: 'Interface stereotype', type: 'keyword' },
  { label: '<<abstract>>', detail: 'Abstract stereotype', type: 'keyword' },
  { label: '<<enumeration>>', detail: 'Enum stereotype', type: 'keyword' },
  { label: '<|--', detail: 'Inheritance', type: 'operator' },
  { label: '*--', detail: 'Composition', type: 'operator' },
  { label: 'o--', detail: 'Aggregation', type: 'operator' },
  { label: '-->', detail: 'Association', type: 'operator' },
  { label: '..>', detail: 'Dependency', type: 'operator' },
  { label: '..|>', detail: 'Realization', type: 'operator' },
];

const GITGRAPH_COMPLETIONS = [
  { label: 'commit', detail: 'Add a commit', type: 'keyword' },
  { label: 'branch', detail: 'Create a branch', type: 'keyword' },
  { label: 'checkout', detail: 'Switch branch', type: 'keyword' },
  { label: 'merge', detail: 'Merge a branch', type: 'keyword' },
  { label: 'cherry-pick', detail: 'Cherry pick a commit', type: 'keyword' },
  { label: 'id:', detail: 'Set commit ID', type: 'property' },
  { label: 'tag:', detail: 'Set commit tag', type: 'property' },
  { label: 'type:', detail: 'Set commit type', type: 'property' },
];

const JOURNEY_COMPLETIONS = [
  { label: 'title', detail: 'Journey title', type: 'keyword' },
  { label: 'section', detail: 'Journey section', type: 'keyword' },
  { label: 'Task:', detail: 'Task with score', type: 'keyword' },
];

const QUADRANT_COMPLETIONS = [
  { label: 'title', detail: 'Chart title', type: 'keyword' },
  { label: 'x-axis', detail: 'X-axis label', type: 'keyword' },
  { label: 'y-axis', detail: 'Y-axis label', type: 'keyword' },
];

const REQUIREMENT_COMPLETIONS = [
  { label: 'requirement', detail: 'Requirement block', type: 'keyword' },
  { label: 'element', detail: 'Element block', type: 'keyword' },
  { label: 'id:', detail: 'Requirement ID', type: 'property' },
  { label: 'text:', detail: 'Requirement text', type: 'property' },
  { label: 'risk:', detail: 'Risk level', type: 'property' },
  { label: 'verifymethod:', detail: 'Verification method', type: 'property' },
];

const TIMELINE_COMPLETIONS = [
  { label: 'title', detail: 'Timeline title', type: 'keyword' },
];

const SANKEY_COMPLETIONS = [
  { label: 'Source,Target,Value', detail: 'CSV header', type: 'keyword' },
];

const XYCHART_COMPLETIONS = [
  { label: 'title', detail: 'Chart title', type: 'keyword' },
  { label: 'x-axis', detail: 'X-axis definition', type: 'keyword' },
  { label: 'y-axis', detail: 'Y-axis definition', type: 'keyword' },
  { label: 'line', detail: 'Line data', type: 'keyword' },
  { label: 'scatter', detail: 'Scatter data', type: 'keyword' },
];

const KANBAN_COMPLETIONS = [
  { label: '###', detail: 'Column header', type: 'keyword' },
  { label: '-', detail: 'Task item', type: 'keyword' },
];

const BLOCK_COMPLETIONS = [
  { label: 'columns', detail: 'Grid columns', type: 'keyword' },
  { label: 'space', detail: 'Empty space', type: 'keyword' },
  { label: 'block:', detail: 'Block container', type: 'keyword' },
];

const USECASE_COMPLETIONS = [
  { label: 'actor', detail: 'Declare an actor', type: 'keyword' },
  { label: 'systemBoundary', detail: 'System boundary block', type: 'keyword' },
  { label: 'end', detail: 'End a block', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'note for', detail: 'Attach a note to an element', type: 'keyword' },
  { label: 'classDef', detail: 'Define a style class', type: 'keyword' },
  { label: 'style', detail: 'Style an element', type: 'keyword' },
  { label: 'include', detail: 'Include relation', type: 'keyword' },
  { label: 'extend', detail: 'Extend relation', type: 'keyword' },
  { label: '..>', detail: 'Dependency', type: 'operator' },
  { label: '--|>', detail: 'Generalization', type: 'operator' },
];

// Keywords extracted from the installed mermaid 12.0.0 RailroadGrammar
// (Langium grammar, chunk-WLRJLAWP.mjs): terminal, nonterminal, special,
// choice, sequence, optional, oneOrMore, zeroOrMore. The 6 core ones are
// surfaced here (D5 minimalism); rules read `name = terminal("a");`.
const RAILROAD_COMPLETIONS = [
  { label: 'terminal', detail: 'Terminal (literal token)', type: 'keyword' },
  { label: 'nonterminal', detail: 'Nonterminal (rule reference)', type: 'keyword' },
  { label: 'choice', detail: 'Alternatives block', type: 'keyword' },
  { label: 'sequence', detail: 'Ordered sequence', type: 'keyword' },
  { label: 'optional', detail: 'Optional element', type: 'keyword' },
  { label: 'oneOrMore', detail: 'One or more repetitions', type: 'keyword' },
];

// Domain keywords from the installed CynefinGrammar (Langium): clear,
// complicated, complex, chaotic, confusion. Items are quoted strings on
// lines under the bare domain name; transitions use `clear --> complex`.
const CYNEFIN_COMPLETIONS = [
  { label: 'clear', detail: 'Clear domain (best practices)', type: 'keyword' },
  { label: 'complicated', detail: 'Complicated domain (good practices)', type: 'keyword' },
  { label: 'complex', detail: 'Complex domain (emergent practices)', type: 'keyword' },
  { label: 'chaotic', detail: 'Chaotic domain (novel practices)', type: 'keyword' },
  { label: 'confusion', detail: 'Confusion / disorder (centre)', type: 'keyword' },
];

// swimlane-beta is a standalone v12 type rendered by the flowchart engine
// (createFlowDiagram): lanes are declared as subgraph blocks.
const SWIMLANE_COMPLETIONS = [
  { label: 'subgraph', detail: 'Declare a lane', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'end', detail: 'End a lane block', type: 'keyword' },
  { label: '-->', detail: 'Arrow connection', type: 'operator' },
];

function detectType(doc: string): string {
  // WR-02: strip a leading YAML frontmatter block before the comment-scan.
  // All 25 app templates start with `---`; without this, the first
  // non-comment line was the `---` delimiter itself, every
  // frontmatter-carrying document detected as '' and fell to the generic
  // completion set — the per-type groups below were unreachable on the
  // primary (template-created) authoring path. Matches the frontmatter-first
  // behavior of detectDiagramType in core.ts.
  const withoutFrontmatter = doc.replace(/^\s*---[\s\S]*?---\s*/, '');
  const lines = withoutFrontmatter.trim().split('\n');
  let firstLine = '';

  for (const line of lines) {
    const trimmed = line.toLowerCase().trim();
    if (!trimmed.startsWith('%%')) {
      firstLine = trimmed;
      break;
    }
  }

  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {return 'flowchart';}
  if (firstLine.startsWith('sequencediagram')) {return 'sequence';}
  if (firstLine.startsWith('classdiagram')) {return 'class';}
  if (firstLine.startsWith('statediagram')) {return 'state';}
  if (firstLine.startsWith('erdiagram')) {return 'er';}
  if (firstLine.startsWith('gantt')) {return 'gantt';}
  if (firstLine.startsWith('gitgraph')) {return 'gitgraph';}
  if (firstLine.startsWith('pie')) {return 'pie';}
  if (firstLine.startsWith('mindmap')) {return 'mindmap';}
  if (firstLine.startsWith('journey')) {return 'journey';}
  if (firstLine.startsWith('quadrantchart')) {return 'quadrant';}
  if (firstLine.startsWith('requirementdiagram')) {return 'requirement';}
  if (firstLine.startsWith('timeline')) {return 'timeline';}
  if (firstLine.startsWith('sankey')) {return 'sankey';}
  if (firstLine.startsWith('xychart')) {return 'xychart';}
  if (firstLine.startsWith('kanban')) {return 'kanban';}
  if (firstLine.startsWith('block-beta')) {return 'block';}
  if (firstLine.startsWith('usecase-beta')) {return 'usecase';}
  if (firstLine.startsWith('railroad-beta')) {return 'railroad';}
  if (firstLine.startsWith('cynefin-beta')) {return 'cynefin';}
  if (firstLine.startsWith('swimlane-beta')) {return 'swimlane';}
  return '';
}

export function mermaidCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w\-.|<>{}[\]():#]+/);
  if (!word && !context.explicit) {return null;}

  // WR-01: `@` is deliberately outside the matchBefore charset (it is not part
  // of a mermaid identifier), so a typed `@{` yields word = '{' starting AFTER
  // the `@`, and a bare typed `@` yields no word at all (explicit path). In
  // both cases the default `from` lands after the typed `@`, so accepting an
  // `@{ ... }` metadata completion doubled it (`A@@{ shape: `). When the
  // character immediately before the replacement range is `@`, extend the
  // range to consume it so acceptance REPLACES the typed `@`.
  let from = word?.from ?? context.pos;
  if (from > 0 && context.state.doc.sliceString(from - 1, from) === '@') {
    from -= 1;
  }
  const text = word?.text?.toLowerCase() ?? '';
  const doc = context.state.doc.toString();
  const type = detectType(doc);

  const line = context.state.doc.lineAt(context.pos);
  const lineNum = line.number;

  let completions: { label: string; detail?: string; type?: string }[];

  if (lineNum === 1 || doc.trim().length < 3) {
    completions = [...DIAGRAM_STARTERS];
  } else {
    switch (type) {
      case 'flowchart': completions = FLOWCHART_COMPLETIONS; break;
      case 'sequence':  completions = SEQUENCE_COMPLETIONS; break;
      case 'gantt':     completions = GANTT_COMPLETIONS; break;
      case 'er':        completions = ER_COMPLETIONS; break;
      case 'state':     completions = STATE_COMPLETIONS; break;
      case 'class':     completions = CLASS_COMPLETIONS; break;
      case 'gitgraph':  completions = GITGRAPH_COMPLETIONS; break;
      case 'journey':   completions = JOURNEY_COMPLETIONS; break;
      case 'quadrant':  completions = QUADRANT_COMPLETIONS; break;
      case 'requirement': completions = REQUIREMENT_COMPLETIONS; break;
      case 'timeline':  completions = TIMELINE_COMPLETIONS; break;
      case 'sankey':    completions = SANKEY_COMPLETIONS; break;
      case 'xychart':   completions = XYCHART_COMPLETIONS; break;
      case 'kanban':    completions = KANBAN_COMPLETIONS; break;
      case 'block':     completions = BLOCK_COMPLETIONS; break;
      case 'usecase':   completions = USECASE_COMPLETIONS; break;
      case 'railroad':  completions = RAILROAD_COMPLETIONS; break;
      case 'cynefin':   completions = CYNEFIN_COMPLETIONS; break;
      case 'swimlane':  completions = SWIMLANE_COMPLETIONS; break;
      default:
        completions = MERMAID_KEYWORDS.map(k => ({ label: k, type: 'keyword' }));
        completions.push(...MERMAID_ARROWS.map(a => ({ label: a, type: 'operator' })));
    }
  }

  if (text) {
    completions = completions.filter(c => c.label.toLowerCase().includes(text));
  }

  if (completions.length === 0) {return null;}

  return { from, options: completions, validFor: /^[\w\-.|<>{}[\]():#]*$/ };
}

export const mermaidAutocomplete = autocompletion({
  override: [mermaidCompletions],
  activateOnTyping: true,
  maxRenderedOptions: 15,
});
