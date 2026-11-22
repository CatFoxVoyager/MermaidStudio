import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { MERMAID_KEYWORDS, MERMAID_ARROWS } from './language';
import { CANONICAL_SHAPES, ALIAS_TO_CANONICAL } from './shapes';
import { detectDiagramType } from './diagramType';

interface CompletionEntry {
  label: string;
  detail?: string;
  type?: string;
}

const DIAGRAM_STARTERS: CompletionEntry[] = [
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
  { label: 'xychart', detail: 'XY chart', type: 'keyword' },
  { label: 'xychart-beta', detail: 'XY chart (legacy beta alias)', type: 'keyword' },
  { label: 'packet', detail: 'Network packet diagram', type: 'keyword' },
  { label: 'packet-beta', detail: 'Network packet diagram (legacy beta alias)', type: 'keyword' },
  { label: 'kanban', detail: 'Kanban board', type: 'keyword' },
  { label: 'architecture-beta', detail: 'Architecture diagram', type: 'keyword' },
  { label: 'usecase-beta', detail: 'Use case diagram', type: 'keyword' },
  { label: 'block', detail: 'Block diagram', type: 'keyword' },
  { label: 'block-beta', detail: 'Block diagram (legacy beta alias)', type: 'keyword' },
  { label: 'C4Context', detail: 'C4 context diagram', type: 'keyword' },
  { label: 'ishikawa-beta', detail: 'Ishikawa fishbone diagram', type: 'keyword' },
  { label: 'radar-beta', detail: 'Radar spider chart', type: 'keyword' },
  { label: 'treemap-beta', detail: 'Treemap hierarchy chart', type: 'keyword' },
  { label: 'eventmodeling', detail: 'Event modeling diagram', type: 'keyword' },
  { label: 'venn-beta', detail: 'Venn set diagram', type: 'keyword' },
  { label: 'treeView-beta', detail: 'Hierarchical tree view', type: 'keyword' },
  { label: 'wardley-beta', detail: 'Wardley value chain map', type: 'keyword' },
  { label: 'cynefin-beta', detail: 'Cynefin domain chart', type: 'keyword' },
  { label: 'railroad-beta', detail: 'Railroad syntax diagram', type: 'keyword' },
  { label: 'railroad-ebnf-beta', detail: 'Railroad EBNF grammar', type: 'keyword' },
  { label: 'railroad-abnf-beta', detail: 'Railroad ABNF grammar', type: 'keyword' },
  { label: 'railroad-peg-beta', detail: 'Railroad PEG grammar', type: 'keyword' },
  { label: 'swimlane-beta', detail: 'Swimlane diagram', type: 'keyword' },
];

const canonicalNameSet = new Set<string>(CANONICAL_SHAPES.map(shape => shape.shortName));
const SHAPE_COMPLETIONS: CompletionEntry[] = [
  ...CANONICAL_SHAPES.map(shape => ({
    label: shape.shortName,
    detail: `Shape: ${shape.shortName}`,
    type: 'type',
  })),
  ...Array.from(ALIAS_TO_CANONICAL.entries())
    .filter(([alias]) => !canonicalNameSet.has(alias))
    .map(([alias, canonical]) => ({
      label: alias,
      detail: `Shape alias → ${canonical}`,
      type: 'type',
    })),
];

const FLOWCHART_COMPLETIONS: CompletionEntry[] = [
  { label: 'subgraph', detail: 'Start a subgraph block', type: 'keyword' },
  { label: 'end', detail: 'End a block', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'click', detail: 'Click event handler', type: 'keyword' },
  { label: 'style', detail: 'Style a node', type: 'keyword' },
  { label: 'classDef', detail: 'Define a style class', type: 'keyword' },
  { label: 'class', detail: 'Assign style class', type: 'keyword' },
  { label: 'linkStyle', detail: 'Style a link', type: 'keyword' },
  { label: '-->', detail: 'Arrow connection', type: 'operator' },
  { label: '---', detail: 'Line connection', type: 'operator' },
  { label: '-.->', detail: 'Dotted arrow', type: 'operator' },
  { label: '-.-', detail: 'Dotted line', type: 'operator' },
  { label: '==>', detail: 'Thick arrow', type: 'operator' },
  { label: '===', detail: 'Thick line', type: 'operator' },
  { label: '<-->', detail: 'Bidirectional arrow', type: 'operator' },
  { label: '<-.->', detail: 'Bidirectional dotted arrow', type: 'operator' },
  { label: '<==>', detail: 'Bidirectional thick arrow', type: 'operator' },
  { label: 'x--x', detail: 'Cross-ended edge', type: 'operator' },
  { label: '--x', detail: 'Cross arrow', type: 'operator' },
  { label: 'x--', detail: 'Start cross edge', type: 'operator' },
  { label: 'o--o', detail: 'Circle-ended edge', type: 'operator' },
  { label: '--o', detail: 'Circle arrow', type: 'operator' },
  { label: 'o--', detail: 'Start circle edge', type: 'operator' },
  { label: '~~~', detail: 'Invisible link', type: 'operator' },
  { label: '"`Markdown`"', detail: 'Markdown formatted node label', type: 'string' },
  { label: '@{ view: collapsed }', detail: 'Collapse subgraph to a single node (makes the visual editor read-only)', type: 'keyword' },
  { label: '@{ shape: ', detail: 'Attach shape metadata to a node (editable in the visual editor)', type: 'keyword' },
  { label: '@{ icon: "fa:star" }', detail: 'Attach FontAwesome icon node', type: 'keyword' },
  { label: '@{ img: "https://..." }', detail: 'Attach image node', type: 'keyword' },
  { label: '@{ animate: true }', detail: 'Animate edge flow', type: 'keyword' },
  { label: '@{ animation: fast }', detail: 'Fast edge animation', type: 'keyword' },
  { label: '@{ animation: slow }', detail: 'Slow edge animation', type: 'keyword' },
  { label: '@{ step: 1 }', detail: 'Step index for sequential animation', type: 'keyword' },
  { label: '@{ curve: basis }', detail: 'Override edge curve interpolation', type: 'keyword' },
  ...SHAPE_COMPLETIONS,
];

const SEQUENCE_COMPLETIONS: CompletionEntry[] = [
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
  { label: '-->>', detail: 'Dotted arrow with head', type: 'operator' },
  { label: '-x', detail: 'Lost message', type: 'operator' },
];

const GANTT_COMPLETIONS: CompletionEntry[] = [
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

const PIE_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Chart title', type: 'keyword' },
  { label: 'showData', detail: 'Show slice values in legend', type: 'keyword' },
];

const MINDMAP_COMPLETIONS: CompletionEntry[] = [
  { label: 'root((Root))', detail: 'Root circle node', type: 'keyword' },
  { label: '::icon(', detail: 'Node icon class', type: 'property' },
  { label: ':::', detail: 'Attach CSS class', type: 'property' },
];

const ER_COMPLETIONS: CompletionEntry[] = [
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

const STATE_COMPLETIONS: CompletionEntry[] = [
  { label: 'state', detail: 'Define a state', type: 'keyword' },
  { label: '[*]', detail: 'Start/end state', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'note left of', detail: 'Note on left', type: 'keyword' },
  { label: 'note right of', detail: 'Note on right', type: 'keyword' },
  { label: '-->', detail: 'Transition', type: 'operator' },
];

const CLASS_COMPLETIONS: CompletionEntry[] = [
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

const GITGRAPH_COMPLETIONS: CompletionEntry[] = [
  { label: 'commit', detail: 'Add a commit', type: 'keyword' },
  { label: 'branch', detail: 'Create a branch', type: 'keyword' },
  { label: 'checkout', detail: 'Switch branch', type: 'keyword' },
  { label: 'merge', detail: 'Merge a branch', type: 'keyword' },
  { label: 'cherry-pick', detail: 'Cherry pick a commit', type: 'keyword' },
  { label: 'id:', detail: 'Set commit ID', type: 'property' },
  { label: 'tag:', detail: 'Set commit tag', type: 'property' },
  { label: 'type:', detail: 'Set commit type', type: 'property' },
];

const JOURNEY_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Journey title', type: 'keyword' },
  { label: 'section', detail: 'Journey section', type: 'keyword' },
  { label: 'Task:', detail: 'Task with score', type: 'keyword' },
];

const QUADRANT_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Chart title', type: 'keyword' },
  { label: 'x-axis', detail: 'X-axis label', type: 'keyword' },
  { label: 'y-axis', detail: 'Y-axis label', type: 'keyword' },
  { label: 'quadrant-1', detail: 'Top-right quadrant title', type: 'keyword' },
  { label: 'quadrant-2', detail: 'Top-left quadrant title', type: 'keyword' },
  { label: 'quadrant-3', detail: 'Bottom-left quadrant title', type: 'keyword' },
  { label: 'quadrant-4', detail: 'Bottom-right quadrant title', type: 'keyword' },
];

const REQUIREMENT_COMPLETIONS: CompletionEntry[] = [
  { label: 'requirement', detail: 'Requirement block', type: 'keyword' },
  { label: 'functionalRequirement', detail: 'Functional requirement', type: 'keyword' },
  { label: 'element', detail: 'Element block', type: 'keyword' },
  { label: 'id:', detail: 'Requirement ID', type: 'property' },
  { label: 'text:', detail: 'Requirement text', type: 'property' },
  { label: 'risk:', detail: 'Risk level', type: 'property' },
  { label: 'verifymethod:', detail: 'Verification method', type: 'property' },
];

const TIMELINE_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Timeline title', type: 'keyword' },
  { label: 'section', detail: 'Timeline section', type: 'keyword' },
];

const SANKEY_COMPLETIONS: CompletionEntry[] = [
  { label: 'Source,Target,Value', detail: 'CSV header', type: 'keyword' },
];

const XYCHART_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Chart title', type: 'keyword' },
  { label: 'x-axis', detail: 'X-axis definition', type: 'keyword' },
  { label: 'y-axis', detail: 'Y-axis definition', type: 'keyword' },
  { label: 'line', detail: 'Line data', type: 'keyword' },
  { label: 'bar', detail: 'Bar data', type: 'keyword' },
];

const PACKET_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Packet title', type: 'keyword' },
  { label: '0-15: "Field"', detail: 'Bit range field', type: 'property' },
];

const KANBAN_COMPLETIONS: CompletionEntry[] = [
  { label: '###', detail: 'Column header', type: 'keyword' },
  { label: '-', detail: 'Task item', type: 'keyword' },
];

const ARCHITECTURE_COMPLETIONS: CompletionEntry[] = [
  { label: 'group', detail: 'Group container', type: 'keyword' },
  { label: 'service', detail: 'Service node', type: 'keyword' },
  { label: 'junction', detail: 'Connection junction', type: 'keyword' },
  { label: 'in', detail: 'Assign to group', type: 'keyword' },
];

const C4_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Diagram title', type: 'keyword' },
  { label: 'Person(', detail: 'Declare a person', type: 'keyword' },
  { label: 'System(', detail: 'Declare a system', type: 'keyword' },
  { label: 'Container(', detail: 'Declare a container', type: 'keyword' },
  { label: 'Component(', detail: 'Declare a component', type: 'keyword' },
  { label: 'Rel(', detail: 'Declare a relationship', type: 'keyword' },
];

const BLOCK_COMPLETIONS: CompletionEntry[] = [
  { label: 'columns', detail: 'Grid columns', type: 'keyword' },
  { label: 'space', detail: 'Empty space', type: 'keyword' },
  { label: 'block:', detail: 'Block container', type: 'keyword' },
];

const USECASE_COMPLETIONS: CompletionEntry[] = [
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

const ISHIKAWA_COMPLETIONS: CompletionEntry[] = [
  { label: 'Root Problem', detail: 'Fishbone spine title', type: 'keyword' },
  { label: '  Category', detail: 'Primary cause branch', type: 'keyword' },
  { label: '    Cause', detail: 'Detailed root cause', type: 'keyword' },
];

const RADAR_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Radar chart title', type: 'keyword' },
  { label: 'axis', detail: 'Define radar axes', type: 'keyword' },
  { label: 'curve', detail: 'Add data series curve', type: 'keyword' },
  { label: 'min', detail: 'Minimum scale value', type: 'keyword' },
  { label: 'max', detail: 'Maximum scale value', type: 'keyword' },
  { label: 'graticule', detail: 'Grid shape (circle | polygon)', type: 'keyword' },
  { label: 'ticks', detail: 'Number of grid rings', type: 'keyword' },
  { label: 'showLegend', detail: 'Show/hide legend', type: 'keyword' },
];

const TREEMAP_COMPLETIONS: CompletionEntry[] = [
  { label: '"Section"', detail: 'Treemap section header', type: 'keyword' },
  { label: '  "Leaf": 100', detail: 'Weighted leaf node', type: 'property' },
  { label: 'classDef', detail: 'Define a style class', type: 'keyword' },
];

const EVENTMODELING_COMPLETIONS: CompletionEntry[] = [
  { label: 'tf', detail: 'Declare timeline frame', type: 'keyword' },
  { label: 'ui', detail: 'User interface wireframe', type: 'keyword' },
  { label: 'cmd', detail: 'Command step', type: 'keyword' },
  { label: 'evt', detail: 'Domain event', type: 'keyword' },
  { label: 'rmo', detail: 'Read model view', type: 'keyword' },
  { label: 'prj', detail: 'Projection', type: 'keyword' },
  { label: 'aut', detail: 'Automation / processor', type: 'keyword' },
  { label: '->>', detail: 'Data/event link', type: 'operator' },
];

const VENN_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Venn diagram title', type: 'keyword' },
  { label: 'set', detail: 'Declare a set', type: 'keyword' },
  { label: 'union', detail: 'Declare an intersection/union', type: 'keyword' },
  { label: 'text', detail: 'Add text item to set/union', type: 'keyword' },
  { label: 'style', detail: 'Style set or union', type: 'keyword' },
];

const TREEVIEW_COMPLETIONS: CompletionEntry[] = [
  { label: 'root/', detail: 'Root folder line', type: 'keyword' },
  { label: '  child/', detail: 'Nested folder', type: 'keyword' },
  { label: '    file.ts', detail: 'Nested leaf item', type: 'keyword' },
];

const WARDLEY_COMPLETIONS: CompletionEntry[] = [
  { label: 'title', detail: 'Map title', type: 'keyword' },
  { label: 'anchor', detail: 'User need anchor [visibility, evolution]', type: 'keyword' },
  { label: 'component', detail: 'Value chain component [vis, evo]', type: 'keyword' },
  { label: 'pipeline', detail: 'Component pipeline', type: 'keyword' },
  { label: 'evolve', detail: 'Evolution movement', type: 'keyword' },
  { label: 'size', detail: 'Map dimensions [w, h]', type: 'keyword' },
  { label: 'note', detail: 'Map annotation', type: 'keyword' },
  { label: '->', detail: 'Value chain dependency', type: 'operator' },
];

const RAILROAD_COMPLETIONS: CompletionEntry[] = [
  { label: 'terminal', detail: 'Terminal (literal token)', type: 'keyword' },
  { label: 'nonterminal', detail: 'Nonterminal (rule reference)', type: 'keyword' },
  { label: 'choice', detail: 'Alternatives block', type: 'keyword' },
  { label: 'sequence', detail: 'Ordered sequence', type: 'keyword' },
  { label: 'optional', detail: 'Optional element', type: 'keyword' },
  { label: 'oneOrMore', detail: 'One or more repetitions', type: 'keyword' },
  { label: 'zeroOrMore', detail: 'Zero or more repetitions', type: 'keyword' },
];

const CYNEFIN_COMPLETIONS: CompletionEntry[] = [
  { label: 'clear', detail: 'Clear domain (best practices)', type: 'keyword' },
  { label: 'complicated', detail: 'Complicated domain (good practices)', type: 'keyword' },
  { label: 'complex', detail: 'Complex domain (emergent practices)', type: 'keyword' },
  { label: 'chaotic', detail: 'Chaotic domain (novel practices)', type: 'keyword' },
  { label: 'confusion', detail: 'Confusion / disorder (centre)', type: 'keyword' },
];

const SWIMLANE_COMPLETIONS: CompletionEntry[] = [
  { label: 'subgraph', detail: 'Declare a lane', type: 'keyword' },
  { label: 'direction', detail: 'Set direction', type: 'keyword' },
  { label: 'end', detail: 'End a lane block', type: 'keyword' },
  { label: '-->', detail: 'Arrow connection', type: 'operator' },
];

export function mermaidCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w\-.|<>{}[\]():#"`~=*]+/);
  if (!word && !context.explicit) { return null; }

  // Extend backwards across `@` so accepting `@{...}` replaces `@` cleanly instead of doubling `@@{...}`
  let from = word?.from ?? context.pos;
  if (from > 0 && context.state.doc.sliceString(from - 1, from) === '@') {
    from -= 1;
  }
  const text = word?.text?.toLowerCase() ?? '';
  const doc = context.state.doc.toString();
  const type = detectDiagramType(doc);

  const line = context.state.doc.lineAt(context.pos);
  const lineNum = line.number;

  let completions: CompletionEntry[];

  if (lineNum === 1 || doc.trim().length < 3) {
    completions = [...DIAGRAM_STARTERS];
  } else {
    switch (type) {
      case 'flowchart':           completions = FLOWCHART_COMPLETIONS; break;
      case 'sequence':            completions = SEQUENCE_COMPLETIONS; break;
      case 'classDiagram':        completions = CLASS_COMPLETIONS; break;
      case 'stateDiagram':        completions = STATE_COMPLETIONS; break;
      case 'erDiagram':           completions = ER_COMPLETIONS; break;
      case 'gantt':               completions = GANTT_COMPLETIONS; break;
      case 'pie':                 completions = PIE_COMPLETIONS; break;
      case 'mindmap':             completions = MINDMAP_COMPLETIONS; break;
      case 'gitGraph':            completions = GITGRAPH_COMPLETIONS; break;
      case 'journey':             completions = JOURNEY_COMPLETIONS; break;
      case 'quadrantChart':       completions = QUADRANT_COMPLETIONS; break;
      case 'requirementDiagram':  completions = REQUIREMENT_COMPLETIONS; break;
      case 'timeline':            completions = TIMELINE_COMPLETIONS; break;
      case 'sankey':              completions = SANKEY_COMPLETIONS; break;
      case 'xyChart':             completions = XYCHART_COMPLETIONS; break;
      case 'packetDiagram':       completions = PACKET_COMPLETIONS; break;
      case 'kanban':              completions = KANBAN_COMPLETIONS; break;
      case 'architectureDiagram': completions = ARCHITECTURE_COMPLETIONS; break;
      case 'usecaseDiagram':      completions = USECASE_COMPLETIONS; break;
      case 'blockDiagram':        completions = BLOCK_COMPLETIONS; break;
      case 'c4':                  completions = C4_COMPLETIONS; break;
      case 'ishikawa':            completions = ISHIKAWA_COMPLETIONS; break;
      case 'radar':               completions = RADAR_COMPLETIONS; break;
      case 'treemap':             completions = TREEMAP_COMPLETIONS; break;
      case 'eventmodeling':       completions = EVENTMODELING_COMPLETIONS; break;
      case 'venn':                completions = VENN_COMPLETIONS; break;
      case 'treeView':            completions = TREEVIEW_COMPLETIONS; break;
      case 'wardley':             completions = WARDLEY_COMPLETIONS; break;
      case 'cynefin':             completions = CYNEFIN_COMPLETIONS; break;
      case 'railroad':            completions = RAILROAD_COMPLETIONS; break;
      case 'swimlane':            completions = SWIMLANE_COMPLETIONS; break;
      default:
        completions = MERMAID_KEYWORDS.map(k => ({ label: k, type: 'keyword' }));
        completions.push(...MERMAID_ARROWS.map(a => ({ label: a, type: 'operator' })));
    }
  }

  if (text) {
    completions = completions.filter(c => c.label.toLowerCase().includes(text));
  }

  if (completions.length === 0) { return null; }

  return { from, options: completions, validFor: /^[\w\-.|<>{}[\]():#"`~=*]*$/ };
}

export const mermaidAutocomplete = autocompletion({
  override: [mermaidCompletions],
  activateOnTyping: true,
  maxRenderedOptions: 15,
});
