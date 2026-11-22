/**
 * MermaidRAGService - Comprehensive context-aware documentation for Mermaid.js
 * Optimized for CPU-based Micro LLMs (sub-2B parameters)
 */
import { detectDiagramType as detectSharedDiagramType } from '@/lib/mermaid/diagramType';

export interface MermaidSnippet {
  type: string;
  syntax: string;
  bestPractices: string[];
  example: string;
}

const KNOWLEDGE_BASE: Record<string, MermaidSnippet> = {
  flowchart: {
    type: 'flowchart',
    syntax: 'flowchart [direction] (TD, BT, LR, RL)',
    bestPractices: [
      'Shapes: [box], {diamond}, ([stadium]), ((circle)), [(cylinder)], @{ shape: canonicalName } (53 canonical shapes), @{ icon: "fa:star" }, @{ img: "..." }',
      'Markdown labels: "`line 1\\n**bold**`"',
      'Edges: -->, ---, -.->, ==>, x--x, o--o, <-->, <-.->, <==>, ~~~; animated/curved: e1@--> + e1@{ animate: true, animation: fast, step: 1, curve: basis }',
      'Subgraphs: subgraph ID [Title] ... end; collapsible: ID@{ view: collapsed }',
      'Styling: classDef className fill:#f9f,stroke:#333; class nodeID className',
    ],
    example: 'flowchart TD\n  Start([Start]) e1@--> Proc@{ shape: rounded, label: "`Process`" }\n  e1@{ animate: true, curve: basis }\n  Proc --> Dec{Decision}\n  Dec -- Yes --> End([End])',
  },
  sequence: {
    type: 'sequence',
    syntax: 'sequenceDiagram',
    bestPractices: [
      'Participants: participant Name, actor User',
      'Messages: -> (solid line), ->> (arrow), -->> (dashed arrow), -) (async)',
      'Activation: activate/deactivate or suffix +/- to arrows',
      'Groups: alt/else (conditional), opt (optional), loop (repetition)',
      'Notes: Note over/left of/right of',
    ],
    example: 'sequenceDiagram\n  autonumber\n  User->>+System: Request\n  System-->>-User: Response',
  },
  classDiagram: {
    type: 'classDiagram',
    syntax: 'classDiagram',
    bestPractices: [
      'Visibility: + (public), - (private), # (protected), ~ (package)',
      'Relationships: <|-- (inheritance), *-- (composition), o-- (aggregation), --> (association)',
      'Members: className : +int attr, className : method() void',
    ],
    example: 'classDiagram\n  class Vehicle {\n    +String make\n    +start() void\n  }\n  Vehicle <|-- Car',
  },
  stateDiagram: {
    type: 'stateDiagram',
    syntax: 'stateDiagram-v2',
    bestPractices: [
      'Points: [*] for start/end',
      'Transitions: S1 --> S2 : Event',
      'Composite: state Parent { [*] --> Child }',
      'Choice: state choice_node <<choice>>',
    ],
    example: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy : start\n  Busy --> [*] : finish',
  },
  erDiagram: {
    type: 'erDiagram',
    syntax: 'erDiagram',
    bestPractices: [
      'Relationships: ||--o{ (1 to many), }o--|| (many to 1), ||--|| (1 to 1)',
      'Attributes: Entity { type name }',
      'Primary Keys: PK, Foreign Keys: FK',
    ],
    example: 'erDiagram\n  USER ||--o{ POST : writes\n  USER { string username PK }',
  },
  gantt: {
    type: 'gantt',
    syntax: 'gantt',
    bestPractices: [
      'Date format: dateFormat YYYY-MM-DD',
      'Task syntax: Task name :[status], [id], [start], [duration]',
      'Status: active, done, crit',
    ],
    example: 'gantt\n  title Project Plan\n  dateFormat YYYY-MM-DD\n  section Dev\n  Task1 :done, a1, 2024-01-01, 3d',
  },
  pie: {
    type: 'pie',
    syntax: 'pie [showData]',
    bestPractices: [
      'Title: title Header',
      'Data: "Label" : value',
    ],
    example: 'pie title Fruits\n  "Apple" : 45\n  "Banana" : 25',
  },
  gitGraph: {
    type: 'gitGraph',
    syntax: 'gitGraph',
    bestPractices: [
      'Actions: commit, branch, checkout, merge, cherry-pick',
      'Commit options: id, tag, type (NORMAL, REVERSE, HIGHLIGHT)',
    ],
    example: 'gitGraph\n  commit\n  branch feat\n  commit\n  checkout main\n  merge feat',
  },
  mindmap: {
    type: 'mindmap',
    syntax: 'mindmap',
    bestPractices: [
      'Root node starts at level 0',
      'Indentation defines hierarchy',
      'Shapes: ((circle)), [square], (rounded), {{hex}}',
    ],
    example: 'mindmap\n  root((Root))\n    Child1\n      Grandchild\n    Child2',
  },
  timeline: {
    type: 'timeline',
    syntax: 'timeline',
    bestPractices: [
      'Format: Time Period : Event : Event',
      'Group multiple events under one period',
    ],
    example: 'timeline\n  2023 : Launch\n  2024 : Growth : Scale',
  },
  journey: {
    type: 'journey',
    syntax: 'journey',
    bestPractices: [
      'Syntax: section Title, Task: score: Actors',
      'Scores are 1-5',
    ],
    example: 'journey\n  title My Day\n  section Work\n    Coffee: 5: Me\n    Email: 1: Me',
  },
  quadrantChart: {
    type: 'quadrantChart',
    syntax: 'quadrantChart',
    bestPractices: [
      'X/Y axis labels: x-axis Low --> High',
      'Quads: quadrant-1 Title, quadrant-2 Title...',
      'Points: Label: [x, y]',
    ],
    example: 'quadrantChart\n  x-axis Low --> High Importance\n  Item1: [0.7, 0.8]',
  },
  requirementDiagram: {
    type: 'requirementDiagram',
    syntax: 'requirementDiagram',
    bestPractices: [
      'Blocks: requirement Name { id: ..., text: ..., risk: low|medium|high, verifymethod: test|inspection|analysis|demonstration }',
      'Relationships: req1 - traces|satisfies|verifies|derives -> req2',
    ],
    example: 'requirementDiagram\n  requirement sec_req {\n    id: 1\n    text: Encrypt data\n    risk: high\n    verifymethod: test\n  }\n  element api { type: service }\n  api - satisfies -> sec_req',
  },
  xyChart: {
    type: 'xyChart',
    syntax: 'xychart-beta',
    bestPractices: [
      'Orientation: orientation horizontal/vertical',
      'Axis: x-axis [labels], y-axis "Title" min --> max',
      'Types: line, bar',
    ],
    example: 'xychart-beta\n  x-axis [Jan, Feb]\n  bar [10, 20]',
  },
  blockDiagram: {
    type: 'blockDiagram',
    syntax: 'block-beta',
    bestPractices: [
      'Columns: columns N',
      'Block ID["Text"]',
      'Groups: block:ID ... end',
    ],
    example: 'block-beta\n  columns 2\n  A["Start"] B["End"]',
  },
  architectureDiagram: {
    type: 'architectureDiagram',
    syntax: 'architecture-beta',
    bestPractices: [
      'Groups: group ID(icon)[Title]',
      'Services: service ID(icon)[Title] in group',
      'Connections: ID1:R -- L:ID2',
    ],
    example: 'architecture-beta\n  service web(server)[Web]\n  service db(database)[DB]\n  web:R -- L:db',
  },
  c4: {
    type: 'c4',
    syntax: 'C4Context, C4Container, C4Component',
    bestPractices: [
      'Elements: Person, System, Container, Component',
      'Relationships: Rel(from, to, label, protocol)',
    ],
    example: 'C4Context\n  Person(p1, "User")\n  System(s1, "App")\n  Rel(p1, s1, "Uses")',
  },
  packetDiagram: {
    type: 'packetDiagram',
    syntax: 'packet-beta',
    bestPractices: [
      'Bit ranges: Start-End: "Label"',
      'Bit values: Start: "Label"',
    ],
    example: 'packet-beta\n  0-7: "Header"\n  8-15: "Data"',
  },
  kanban: {
    type: 'kanban',
    syntax: 'kanban',
    bestPractices: [
      'Headers: ## Title',
      'Sections: ### Section',
      'Items: - Task',
    ],
    example: 'kanban\n  ## Sprint\n  ### Todo\n  - Item 1',
  },
  sankey: {
    type: 'sankey',
    syntax: 'sankey-beta',
    bestPractices: [
      'CSV format: Source,Target,Value',
    ],
    example: 'sankey-beta\n  A,B,10\n  B,C,5',
  },
  usecaseDiagram: {
    type: 'usecaseDiagram',
    syntax: 'usecase-beta',
    bestPractices: [
      'Actors: actor Name',
      'Containers: systemBoundary Name ... end',
      'Links: User --> "Use Case", "A" ..> : include "B", Admin --|> User',
    ],
    example: 'usecase-beta\n  actor User\n  systemBoundary App\n    "Log in"\n  end\n  User --> "Log in"',
  },
  ishikawa: {
    type: 'ishikawa',
    syntax: 'ishikawa-beta',
    bestPractices: [
      'First indented level is the root problem spine',
      'Nested indentation defines categories and sub-causes',
    ],
    example: 'ishikawa-beta\n  Slow Build\n  Tooling\n    Cold cache\n  Tests\n    No sharding',
  },
  radar: {
    type: 'radar',
    syntax: 'radar-beta',
    bestPractices: [
      'Axes: axis a["Label A"], b["Label B"]',
      'Series: curve c1["Series"]{80, 90}',
      'Scale: min 0, max 100, graticule polygon|circle',
    ],
    example: 'radar-beta\n  axis q["Quality"], s["Speed"], r["Reliability"]\n  curve a["Team"]{85, 75, 90}\n  max 100\n  min 0',
  },
  treemap: {
    type: 'treemap',
    syntax: 'treemap-beta',
    bestPractices: [
      'Quoted section headers with indented weighted leaves: "Leaf": 100',
      'Supports :::className and classDef styling',
    ],
    example: 'treemap-beta\n"Budget"\n  "Engineering": 60\n  "Design": 40',
  },
  eventmodeling: {
    type: 'eventmodeling',
    syntax: 'eventmodeling',
    bestPractices: [
      'Frames: tf 01 ui|cmd|evt|rmo|prj|aut Name',
      'Links: tf 04 rmo View ->> 03',
    ],
    example: 'eventmodeling\n  tf 01 ui Checkout\n  tf 02 cmd SubmitOrder\n  tf 03 evt OrderSubmitted\n  tf 04 rmo OrderView ->> 03',
  },
  venn: {
    type: 'venn',
    syntax: 'venn-beta',
    bestPractices: [
      'Sets: set Name',
      'Intersections: union A,B["Overlap"]',
      'Optional text items and style overrides',
    ],
    example: 'venn-beta\n  title "Overlap"\n  set A\n  set B\n  union A,B["Shared"]',
  },
  treeView: {
    type: 'treeView',
    syntax: 'treeView-beta (case-sensitive header)',
    bestPractices: [
      'Header MUST be exact camelCase: treeView-beta',
      'Indentation defines parent-child tree structure',
    ],
    example: 'treeView-beta\n  project/\n    src/\n      main.ts',
  },
  wardley: {
    type: 'wardley',
    syntax: 'wardley-beta',
    bestPractices: [
      'Nodes: anchor/component Name [visibility, evolution]',
      'Links: NodeA -> NodeB',
    ],
    example: 'wardley-beta\n  title Cup of Tea\n  anchor Customer [0.95, 0.63]\n  component Tea [0.75, 0.60]\n  Customer -> Tea',
  },
  cynefin: {
    type: 'cynefin',
    syntax: 'cynefin-beta',
    bestPractices: [
      'Domains: clear, complicated, complex, chaotic, confusion',
      'Quoted items indented under each domain header',
    ],
    example: 'cynefin-beta\n  title Decision Map\n  clear\n    "Runbook fix"\n  complex\n    "Probe & learn"',
  },
  railroad: {
    type: 'railroad',
    syntax: 'railroad-beta | railroad-ebnf-beta | railroad-abnf-beta | railroad-peg-beta',
    bestPractices: [
      'Rules end with `;`',
      'Combinators: sequence(...), choice(...), optional(...), oneOrMore(...), zeroOrMore(...), terminal("..."), nonterminal("...")',
    ],
    example: 'railroad-beta\n  title Expr\n  expr = sequence(nonterminal("term"), terminal("+"), nonterminal("term")) ;',
  },
  swimlane: {
    type: 'swimlane',
    syntax: 'swimlane-beta [LR | TD]',
    bestPractices: [
      'Each lane is a `subgraph LaneName ... end` block',
      'Connect tasks across lanes using Flowchart arrows',
    ],
    example: 'swimlane-beta LR\n  subgraph User\n    a[Submit]\n  end\n  subgraph Support\n    b[Triage]\n  end\n  a --> b',
  },
  agentflow: {
    type: 'agentflow',
    syntax: 'agentflow-beta [TB | LR]',
    bestPractices: [
      'Wrap workflow steps in `flow id["Title"] ... end` containers; declare shared refdocs/actions in `global ... end` and connectors with `connector id["Title"]`',
      'Use semantic shapes: `@{ shape: input | task | tool | decision | refdoc | action, label: "..." }`',
      'Use semantic edges: `-->` (sequence), `-.-` (unlabeled reference to `refdoc`), `--x` (failure/escalation)',
      'Every `flow` should contain at least one `input` node; label outgoing branches from `decision` nodes (`-->|Yes|`)',
    ],
    example: 'agentflow-beta TB\n  connector api["CRM API"]\n  flow triage["Triage"]\n    inp@{ shape: input, label: "Ticket" }\n    step@{ shape: task, label: "Classify" }\n    tool1@{ shape: tool, label: "Lookup", connectorRef: "api" }\n    inp --> step --> tool1\n  end',
  },
};

const TYPE_ALIASES: Record<string, string> = {
  class: 'classDiagram',
  state: 'stateDiagram',
  er: 'erDiagram',
  git: 'gitGraph',
  quadrant: 'quadrantChart',
  requirement: 'requirementDiagram',
  xy: 'xyChart',
  xychart: 'xyChart',
  block: 'blockDiagram',
  architecture: 'architectureDiagram',
  packet: 'packetDiagram',
  usecase: 'usecaseDiagram',
  treeview: 'treeView',
  'agentflow-beta': 'agentflow',
};

export function getMermaidContext(type: string = 'flowchart'): string {
  const canonicalKey = TYPE_ALIASES[type.toLowerCase()] ?? type;
  const snippet =
    KNOWLEDGE_BASE[type] ??
    KNOWLEDGE_BASE[canonicalKey] ??
    KNOWLEDGE_BASE[type.toLowerCase()] ??
    KNOWLEDGE_BASE.flowchart;

  return `
## Mermaid.js ${snippet.type.toUpperCase()} Syntax Reference
Syntax: ${snippet.syntax}

### Best Practices:
${snippet.bestPractices.map(p => `- ${p}`).join('\n')}

### Correct Example:
\`\`\`mermaid
${snippet.example}
\`\`\`
`;
}

export function detectDiagramType(content: string): string {
  const detected = detectSharedDiagramType(content);
  return detected === 'unknown' ? 'flowchart' : detected;
}
