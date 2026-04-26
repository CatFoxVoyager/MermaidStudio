/**
 * MermaidRAGService - Comprehensive context-aware documentation for Mermaid.js
 * Optimized for CPU-based Micro LLMs (sub-2B parameters)
 */

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
      'Nodes: [square], (rounded), ([stadium]), {diamond}, ((circle)), [(database)]',
      'Edges: --> (arrow), --- (line), -.-> (dotted), ==> (thick), -- text --> (with label)',
      'Subgraphs: subgraph ID [Title] ... end',
      'Styling: classDef className fill:#f9f,stroke:#333; class nodeID className'
    ],
    example: 'flowchart TD\n  Start([Start]) --> Proc[Process]\n  Proc --> Dec{Decision}\n  Dec -- Yes --> End([End])'
  },
  sequence: {
    type: 'sequence',
    syntax: 'sequenceDiagram',
    bestPractices: [
      'Participants: participant Name, actor User',
      'Messages: -> (solid line), ->> (arrow), -->> (dashed arrow), -) (async)',
      'Activation: activate/deactivate or suffix +/- to arrows',
      'Groups: alt/else (conditional), opt (optional), loop (repetition)',
      'Notes: Note over/left of/right of'
    ],
    example: 'sequenceDiagram\n  autonumber\n  User->>+System: Request\n  System-->>-User: Response'
  },
  class: {
    type: 'class',
    syntax: 'classDiagram-v2',
    bestPractices: [
      'Visibility: + (public), - (private), # (protected), ~ (package)',
      'Relationships: <|-- (inheritance), *-- (composition), o-- (aggregation), --> (association)',
      'Members: className : +int attr, className : method() void'
    ],
    example: 'classDiagram-v2\n  class Vehicle {\n    +String make\n    +start() void\n  }\n  Vehicle <|-- Car'
  },
  state: {
    type: 'state',
    syntax: 'stateDiagram-v2',
    bestPractices: [
      'Points: [*] for start/end',
      'Transitions: S1 --> S2 : Event',
      'Composite: state Parent { [*] --> Child }',
      'Choice: state choice_node <<choice>>'
    ],
    example: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy : start\n  Busy --> [*] : finish'
  },
  er: {
    type: 'er',
    syntax: 'erDiagram',
    bestPractices: [
      'Relationships: ||--o{ (1 to many), }o--|| (many to 1), ||--|| (1 to 1)',
      'Attributes: Entity { type name }',
      'Primary Keys: PK, Foreign Keys: FK'
    ],
    example: 'erDiagram\n  USER ||--o{ POST : writes\n  USER { string username PK }'
  },
  gantt: {
    type: 'gantt',
    syntax: 'gantt',
    bestPractices: [
      'Date format: dateFormat YYYY-MM-DD',
      'Task syntax: Task name :[status], [id], [start], [duration]',
      'Status: active, done, crit'
    ],
    example: 'gantt\n  title Project Plan\n  dateFormat YYYY-MM-DD\n  section Dev\n  Task1 :done, a1, 2024-01-01, 3d'
  },
  pie: {
    type: 'pie',
    syntax: 'pie',
    bestPractices: [
      'Title: title Header',
      'Data: "Label" : value'
    ],
    example: 'pie title Fruits\n  "Apple" : 45\n  "Banana" : 25'
  },
  git: {
    type: 'gitGraph',
    syntax: 'gitGraph',
    bestPractices: [
      'Actions: commit, branch, checkout, merge, cherry-pick',
      'Commit options: id, tag, type (NORMAL, REVERSE, HIGHLIGHT)'
    ],
    example: 'gitGraph\n  commit\n  branch feat\n  commit\n  checkout main\n  merge feat'
  },
  mindmap: {
    type: 'mindmap',
    syntax: 'mindmap',
    bestPractices: [
      'Root node starts at level 0',
      'Indentation defines hierarchy',
      'Shapes: ((circle)), [square], (rounded), {{hex}}'
    ],
    example: 'mindmap\n  root((Root))\n    Child1\n      Grandchild\n    Child2'
  },
  timeline: {
    type: 'timeline',
    syntax: 'timeline',
    bestPractices: [
      'Format: Time Period : Event : Event',
      'Group multiple events under one period'
    ],
    example: 'timeline\n  2023 : Launch\n  2024 : Growth : Scale'
  },
  journey: {
    type: 'journey',
    syntax: 'journey',
    bestPractices: [
      'Syntax: section Title, Task: score: Actors',
      'Scores are 1-5'
    ],
    example: 'journey\n  title My Day\n  section Work\n    Coffee: 5: Me\n    Email: 1: Me'
  },
  quadrant: {
    type: 'quadrantChart',
    syntax: 'quadrantChart',
    bestPractices: [
      'X/Y axis labels: x-axis Low --> High',
      'Quads: quadrant-1 Title, quadrant-2 Title...',
      'Points: Label: [x, y]'
    ],
    example: 'quadrantChart\n  x-axis Low --> High Importance\n  Item1: [0.7, 0.8]'
  },
  xy: {
    type: 'xyChart',
    syntax: 'xychart-beta',
    bestPractices: [
      'Orientation: orientation horizontal/vertical',
      'Axis: x-axis [labels], y-axis "Title" min --> max',
      'Types: line, bar'
    ],
    example: 'xychart-beta\n  x-axis [Jan, Feb]\n  bar [10, 20]'
  },
  block: {
    type: 'block',
    syntax: 'block-beta',
    bestPractices: [
      'Columns: columns N',
      'Block ID["Text"]',
      'Groups: block:ID ... end'
    ],
    example: 'block-beta\n  columns 2\n  A["Start"] B["End"]'
  },
  architecture: {
    type: 'architecture',
    syntax: 'architecture-beta',
    bestPractices: [
      'Groups: group ID(icon)[Title]',
      'Services: service ID(icon)[Title] in group',
      'Connections: ID1:R -- L:ID2'
    ],
    example: 'architecture-beta\n  service web(server)[Web]\n  service db(database)[DB]\n  web:R -- L:db'
  },
  c4: {
    type: 'c4',
    syntax: 'C4Context, C4Container, C4Component',
    bestPractices: [
      'Elements: Person, System, Container, Component',
      'Relationships: Rel(from, to, label, protocol)'
    ],
    example: 'C4Context\n  Person(p1, "User")\n  System(s1, "App")\n  Rel(p1, s1, "Uses")'
  },
  packet: {
    type: 'packet',
    syntax: 'packet-beta',
    bestPractices: [
      'Bit ranges: Start-End: "Label"',
      'Bit values: Start: "Label"'
    ],
    example: 'packet-beta\n  0-7: "Header"\n  8-15: "Data"'
  },
  kanban: {
    type: 'kanban',
    syntax: 'kanban',
    bestPractices: [
      'Headers: ## Title',
      'Sections: ### Section',
      'Items: - Task'
    ],
    example: 'kanban\n  ## Sprint\n  ### Todo\n  - Item 1'
  },
  sankey: {
    type: 'sankey',
    syntax: 'sankey',
    bestPractices: [
      'CSV format: Source,Target,Value'
    ],
    example: 'sankey\n  A,B,10\n  B,C,5'
  }
};

export function getMermaidContext(type: string = 'flowchart'): string {
  const normalizedType = type.toLowerCase();
  
  // Find best match in knowledge base
  const entry = Object.entries(KNOWLEDGE_BASE).find(([key]) => {
    // Exact match or partial match
    return normalizedType.includes(key) || key.includes(normalizedType);
  });

  const snippet = entry ? entry[1] : KNOWLEDGE_BASE.flowchart;

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
  const clean = content.trim().toLowerCase();
  const firstLine = clean.split('\n')[0];
  
  if (firstLine.includes('flowchart') || firstLine.includes('graph ')) return 'flowchart';
  if (firstLine.includes('sequencediagram')) return 'sequence';
  if (firstLine.includes('classdiagram')) return 'class';
  if (firstLine.includes('erdiagram')) return 'er';
  if (firstLine.includes('statediagram')) return 'state';
  if (firstLine.includes('gantt')) return 'gantt';
  if (firstLine.includes('pie')) return 'pie';
  if (firstLine.includes('gitgraph')) return 'git';
  if (firstLine.includes('mindmap')) return 'mindmap';
  if (firstLine.includes('timeline')) return 'timeline';
  if (firstLine.includes('journey')) return 'journey';
  if (firstLine.includes('quadrantchart')) return 'quadrant';
  if (firstLine.includes('xychart')) return 'xy';
  if (firstLine.includes('block-beta')) return 'block';
  if (firstLine.includes('architecture-beta')) return 'architecture';
  if (firstLine.includes('c4')) return 'c4';
  if (firstLine.includes('packet-beta')) return 'packet';
  if (firstLine.includes('kanban')) return 'kanban';
  if (firstLine.includes('sankey')) return 'sankey';
  
  return 'flowchart'; // Default
}
