// DIA-01 sweep fixtures (Phase 24, plan 24-04) — one fixture per supported
// DiagramType union entry (22 = the 21 legacy entries + usecaseDiagram),
// shared by the jsdom lock-in sweep (diagram-type-sweep.test.ts) and the
// local-only chromium capture spec
// (tests/e2e/tests/visual/type-sweep-captures.spec.ts), so the human
// spot-check reviews exactly what the lock asserts.
//
// Content provenance (plan 24-04 priority order):
//   1. Probe-validated Phase 23 theme-matrix FAMILY_FIXTURES (render-proven
//      on mermaid 12.0.0 in both modes): flowchart, sequence, classDiagram,
//      stateDiagram, erDiagram, gantt, pie, mindmap.
//   2. Proven template bodies from src/constants/templates.ts (they ship in
//      the app and render — trimmed to minimal but substance-bearing):
//      gitGraph, journey, quadrantChart, requirementDiagram, timeline,
//      sankey, xyChart, packetDiagram, kanban, architectureDiagram,
//      blockDiagram, c4.
//   3. The canonical usecase fixture from plan 24-01's core.test.ts
//      (grammar-corrected against the installed package and render-validated
//      there — NOT the 24-RESEARCH.md candidate, which was found not
//      parse-valid): usecaseDiagram.
//
// expectedError is pre-authorized for zenuml ONLY. Any further entry requires
// observing the failure first and classifying it per D2 (app-side fix /
// changelog-cited v12 delta / documented pre-existing acceptance), with the
// classification recorded in tests/goldens/README.md and a pointer comment
// here. Never author an expectedError entry blind.
import type { DiagramType } from '@/types';

export type SweepFixtureKey = Exclude<DiagramType, 'unknown'>;

export interface SweepFixture {
  type: SweepFixtureKey;
  content: string;
  expectedError?: boolean;
}

export const SWEEP_FIXTURES: Record<SweepFixtureKey, SweepFixture> = {
  flowchart: {
    type: 'flowchart',
    content: `flowchart TD
  A[Start] -->|yes| B{Check}
  B --> C[End]`,
  },
  sequence: {
    type: 'sequence',
    content: `sequenceDiagram
  participant A as Client
  participant B as Server
  A->>B: Request
  B-->>A: Response`,
  },
  classDiagram: {
    type: 'classDiagram',
    content: `classDiagram
  class Animal {
    +int age
  }
  Animal <|-- Dog`,
  },
  stateDiagram: {
    type: 'stateDiagram',
    content: `stateDiagram-v2
  [*] --> S1
  S1 --> S2
  S2 --> [*]`,
  },
  erDiagram: {
    type: 'erDiagram',
    content: `erDiagram
  CUSTOMER ||--o{ ORDER : places`,
  },
  gantt: {
    type: 'gantt',
    content: `gantt
  title Plan
  dateFormat YYYY-MM-DD
  section S1
  Task1 :a1, 2024-01-01, 30d
  section S2
  Task2 :after a1, 20d`,
  },
  pie: {
    type: 'pie',
    content: `pie title Sample
  "Alpha" : 40
  "Beta" : 60`,
  },
  mindmap: {
    type: 'mindmap',
    content: `mindmap
  root((Root))
    Child1
    Child2`,
  },
  gitGraph: {
    type: 'gitGraph',
    content: `gitGraph
  commit id: "Initial commit"
  branch feature/auth
  checkout feature/auth
  commit id: "Add login"
  checkout main
  merge feature/auth`,
  },
  journey: {
    type: 'journey',
    content: `journey
  title Onboarding
  section Sign Up
    Sign up page: 5: User
    Email verification: 4: User
  section First Use
    Dashboard tour: 3: User`,
  },
  quadrantChart: {
    type: 'quadrantChart',
    content: `quadrantChart
  title Prioritize Work
  x-axis Low --> High Importance
  y-axis Low --> High Urgency
  Crisis: [0.8, 0.8]
  Planning: [0.8, 0.3]`,
  },
  requirementDiagram: {
    type: 'requirementDiagram',
    content: `requirementDiagram
  requirement security_req {
    id: 1
    text: the system shall protect user data
    risk: high
    verifymethod: test
  }
  functionalRequirement user_mgmt {
    id: 1.1
    text: the system shall provide intuitive navigation
    risk: low
    verifymethod: inspection
  }
  security_req - traces -> user_mgmt`,
  },
  timeline: {
    type: 'timeline',
    content: `timeline
  title Product Roadmap
  2024-Q1 : MVP Release
    : Core features launch
  2024-Q2 : Growth Phase
    : Expanded features`,
  },
  sankey: {
    type: 'sankey',
    content: `sankey
  Source,Target,Value
  Google,Landing,450
  Landing,Home,600
  Home,Product,400`,
  },
  xyChart: {
    type: 'xyChart',
    content: `xychart-beta
  title Performance vs Load
  x-axis [Low, Medium, High]
  y-axis "Response Time (ms)" 0 --> 500
  line [100, 250, 450]`,
  },
  packetDiagram: {
    type: 'packetDiagram',
    content: `packet-beta
  title UDP Packet
  0-15: "Source Port"
  16-31: "Destination Port"
  32-47: "Length"`,
  },
  kanban: {
    type: 'kanban',
    content: `kanban
  ## Kanban Board
  ### To Do
  - Implement login
  ### In Progress
  - API endpoints`,
  },
  architectureDiagram: {
    type: 'architectureDiagram',
    content: `architecture-beta
  group client(cloud)[Client]
  service web(server)[Web App] in client
  service mobile(tablet)[Mobile App] in client
  web:R -- L:mobile`,
  },
  zenuml: {
    // D2 classification: documented pre-existing acceptance — zenuml is
    // ABSENT from the entire mermaid 12.0.0 dist (case-insensitive package
    // search: zero hits) and @mermaid-js/mermaid-zenuml was never a
    // dependency pre-flip (bf3658e^ package.json audit), so the app union
    // entry errors version-independently. Full evidence in
    // tests/goldens/README.md (Phase 24 sweep record).
    type: 'zenuml',
    content: `zenuml
  Alice->Bob: Hello`,
    expectedError: true,
  },
  blockDiagram: {
    type: 'blockDiagram',
    content: `block-beta
  columns 3
  block:group1
    columns 2
    A["Client A"]
    B["Client B"]
  end
  C["Load Balancer"]`,
  },
  c4: {
    type: 'c4',
    content: `C4Context
  title System Context - Online Shopping
  Person(customer, "Customer", "Buys products online")
  System(store, "Online Store", "Web shop")
  Rel(customer, store, "Uses")`,
  },
  usecaseDiagram: {
    // Canonical fixture from plan 24-01's core.test.ts (grammar-corrected
    // against the installed package: systemBoundary closes with `end`, the
    // include dependency is `src ..> : include target`) — reused verbatim so
    // the sweep, the template tests and the theme-routing locks all assert
    // the same render-proven content.
    type: 'usecaseDiagram',
    content: `usecase-beta
  actor User
  actor Admin
  Admin --|> User
  systemBoundary App
    "Log in"
    "View dashboard"
  end
  User --> "Log in"
  User --> "View dashboard"
  "Log in" ..> : include "View dashboard"`,
  },
};

// DIA-01 grid integrity: exactly 22 fixtures (theme-matrix shrink-guard
// precedent). A future type adoption must extend the sweep consciously —
// the Record<SweepFixtureKey, ...> typing already forces the key set at
// compile time; this guards the runtime count against silent erosion.
const SWEEP_KEYS = Object.keys(SWEEP_FIXTURES);
if (SWEEP_KEYS.length !== 22) {
  throw new Error(
    `DIA-01 grid integrity: expected 22 sweep fixtures (21 legacy union entries + usecaseDiagram), found ${SWEEP_KEYS.length} — a type adoption must extend the sweep consciously, never silently`
  );
}
