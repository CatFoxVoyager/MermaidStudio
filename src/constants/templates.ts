import type { Template } from '@/types';

export const TEMPLATES: Template[] = [
  {
    id: 'flowchart-basic', title: 'Basic Flowchart', description: 'A simple decision-based flow',
    category: 'Flowchart', complexity: 'simple', type: 'flowchart',
    content: `---
config:
  theme: 'base'
---
flowchart TD
    A([Start]) --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action A]
    C -->|No| E[Action B]
    D --> F([End])
    E --> F`,
  },
  {
    id: 'flowchart-cicd', title: 'CI/CD Pipeline', description: 'Software delivery pipeline with stages',
    category: 'Flowchart', complexity: 'advanced', type: 'flowchart',
    content: `---
config:
  theme: 'base'
---
flowchart LR
    subgraph Source
        A[Code Push] --> B[Lint & Test]
    end
    subgraph Build
        C[Docker Build] --> D[Image Scan]
    end
    subgraph Deploy
        E[Staging] --> F{QA Pass?}
        F -->|Yes| G[Production]
        F -->|No| H[Rollback]
    end
    B -->|Pass| C
    B -->|Fail| I[Notify Dev]
    D --> E`,
  },
  {
    id: 'sequence-api', title: 'API Request Flow', description: 'REST API sequence with auth',
    category: 'Sequence', complexity: 'moderate', type: 'sequence',
    content: `---
config:
  theme: 'base'
---
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant S as Service
    participant D as Database
    C->>G: POST /api/resource
    G->>A: Validate Token
    A-->>G: Token Valid
    G->>S: Forward Request
    S->>D: Query Data
    D-->>S: Return Results
    S-->>G: Response 200
    G-->>C: JSON Response`,
  },
  {
    id: 'sequence-oauth', title: 'OAuth2 Flow', description: 'OAuth2 authorization code flow',
    category: 'Sequence', complexity: 'advanced', type: 'sequence',
    content: `---
config:
  theme: 'base'
---
sequenceDiagram
    participant U as User
    participant App
    participant AS as Auth Server
    participant RS as Resource Server
    U->>App: Login Request
    App->>AS: Authorization Request
    AS->>U: Login Page
    U->>AS: Credentials
    AS-->>App: Auth Code
    App->>AS: Exchange Code + Secret
    AS-->>App: Access Token
    App->>RS: API Request + Token
    RS-->>App: Protected Resource`,
  },
  {
    id: 'class-ecommerce', title: 'E-Commerce Domain', description: 'Core e-commerce class relationships',
    category: 'Class Diagram', complexity: 'moderate', type: 'erDiagram',
    content: `---
config:
  theme: 'base'
---
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER_ITEM }o--|| PRODUCT : references`,
  },
  {
    id: 'er-blog', title: 'Blog Database Schema', description: 'Entity relationships for a blog',
    category: 'ER Diagram', complexity: 'moderate', type: 'erDiagram',
    content: `---
config:
  theme: 'base'
---
erDiagram
    USER ||--o{ POST : writes
    POST ||--o{ COMMENT : has
    USER ||--o{ COMMENT : makes
    POST }o--o{ TAG : tagged`,
  },
  {
    id: 'state-order', title: 'Order State Machine', description: 'E-commerce order lifecycle',
    category: 'State Diagram', complexity: 'moderate', type: 'stateDiagram',
    content: `---
config:
  theme: 'base'
---
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing : Payment Confirmed
    Pending --> Cancelled : Timeout
    Processing --> Shipped : Fulfillment
    Processing --> Cancelled : Out of Stock
    Shipped --> Delivered : Delivery Confirmed
    Shipped --> Returned : Return Request
    Delivered --> Returned : Return Window
    Returned --> Refunded : Refund Processed
    Cancelled --> [*]
    Refunded --> [*]
    Delivered --> [*]`,
  },
  {
    id: 'gantt-sprint', title: 'Sprint Planning', description: 'Two-week sprint task timeline',
    category: 'Gantt', complexity: 'moderate', type: 'gantt',
    content: `---
config:
  theme: 'base'
---
gantt
    title Sprint 24 — Feb 3–14
    dateFormat  YYYY-MM-DD
    section Design
    UI Wireframes     :done,    d1, 2024-02-03, 2d
    Design Review     :done,    d2, after d1, 1d
    section Frontend
    Auth Flow         :active,  f1, 2024-02-05, 3d
    Dashboard UI      :         f2, after f1, 4d
    section Backend
    API Endpoints     :done,    b1, 2024-02-03, 4d
    Database Migrate  :         b2, after b1, 2d`,
  },
  {
    id: 'pie-market', title: 'Market Share', description: 'Simple pie chart visualization',
    category: 'Pie Chart', complexity: 'simple', type: 'pie',
    content: `---
config:
  theme: 'base'
---
pie title Browser Market Share 2024
    "Chrome" : 65.4
    "Safari" : 18.9
    "Firefox" : 4.1
    "Edge" : 5.0
    "Other" : 6.6`,
  },
  {
    id: 'mindmap-product', title: 'Product Roadmap', description: 'Feature planning mindmap',
    category: 'Mindmap', complexity: 'moderate', type: 'mindmap',
    content: `---
config:
  theme: 'base'
---
mindmap
  root((Product 2024))
    Q1 Launch
      Auth System
      Dashboard
      API v1
    Q2 Growth
      Mobile App
      Analytics
      Integrations
    Q3 Scale
      Performance
      Multi-tenant
      AI Features`,
  },
  {
    id: 'git-feature', title: 'Git Feature Branch', description: 'Git branching strategy',
    category: 'Git Graph', complexity: 'moderate', type: 'gitGraph',
    content: `---
config:
  theme: 'base'
---
gitGraph
    commit id: "Initial commit"
    commit id: "Setup project"
    branch feature/auth
    checkout feature/auth
    commit id: "Add login"
    commit id: "Add signup"
    checkout main
    branch hotfix/bug-123
    checkout hotfix/bug-123
    commit id: "Fix critical bug"
    checkout main
    merge hotfix/bug-123
    checkout feature/auth
    commit id: "Add OAuth"
    checkout main
    merge feature/auth id: "Merge auth"`,
  },
  {
    id: 'journey-onboarding', title: 'User Onboarding', description: 'Customer onboarding journey',
    category: 'User Journey', complexity: 'moderate', type: 'journey',
    content: `---
config:
  theme: 'base'
---
journey
    title User Onboarding Journey
    section Sign Up
      Sign up page: 5: User
      Email verification: 4: User
      Profile setup: 4: User
    section First Use
      Dashboard tour: 3: User
      Create first project: 4: User
      Invite team members: 3: User
    section Activation
      Complete setup wizard: 5: User
      Launch project: 5: User
      Get first results: 4: User`,
  },
  {
    id: 'quadrant-priorities', title: 'Priority Matrix', description: 'Importance vs Urgency matrix',
    category: 'Quadrant Chart', complexity: 'simple', type: 'quadrantChart',
    content: `---
config:
  theme: 'base'
---
quadrantChart
    title Prioritize Work Items
    x-axis Low --> High Importance
    y-axis Low --> High Urgency
    Crisis Crisis Management: [0.8, 0.8]
    Scheduling: [0.2, 0.7]
    Planning: [0.8, 0.3]
    Distraction: [0.2, 0.2]`,
  },
  {
    id: 'requirement-system', title: 'System Requirements', description: 'System requirements specification',
    category: 'Requirement Diagram', complexity: 'moderate', type: 'flowchart',
    content: `---
config:
  theme: 'base'
---
flowchart TD
    A[Authentication System]
    B[API Rate Limiting]
    C[Data Encryption]
    A -->|requires| C
    B -->|refines| A
    D[Web Application]
    E[Database]
    D -.->|implements| A
    E -.->|uses| C
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style C fill:#ffe1e1`,
  },
  {
    id: 'timeline-product', title: 'Product Evolution', description: 'Timeline of product milestones',
    category: 'Timeline', complexity: 'moderate', type: 'timeline',
    content: `---
config:
  theme: 'base'
---
timeline
    title Product Roadmap Timeline
    2024-Q1 : MVP Release
        : Core features launch
        : First 100 users
    2024-Q2 : Growth Phase
        : Expanded features
        : 1000 users milestone
    2024-Q3 : Scale Up
        : Enterprise tier
        : 10000 users
    2024-Q4 : Market Leader
        : AI integration
        : 50000 users`,
  },
  {
    id: 'sankey-traffic', title: 'Traffic Flow', description: 'Website traffic flow analysis',
    category: 'Sankey', complexity: 'moderate', type: 'sankey',
    content: `---
config:
  theme: 'base'
---
sankey
    Source,Target,Value
    Google,Landing,450
    Facebook,Landing,200
    Direct,Landing,150
    Landing,Home,600
    Landing,Pricing,180
    Home,Product,400
    Home,Blog,120
    Pricing,Signup,200
    Product,Signup,150`,
  },
  {
    id: 'xy-scatter', title: 'Performance Analysis', description: 'XY scatter plot for data analysis',
    category: 'XY Chart', complexity: 'moderate', type: 'xyChart',
    content: `---
config:
  theme: 'base'
---
xychart-beta
    title Performance vs Load
    x-axis [Low, Medium, High]
    y-axis "Response Time (ms)" 0 --> 500
    line [100, 250, 450]`,
  },
  {
    id: 'kanban-sprint', title: 'Sprint Board', description: 'Kanban board for sprint tracking',
    category: 'Kanban', complexity: 'simple', type: 'kanban',
    content: `---
config:
  theme: 'base'
---
kanban
    ## Kanban Board
    ### To Do
    - Implement login
    - Design dashboard
    - Setup database
    ### In Progress
    - API endpoints
    ### Done
    - Project setup
    - Architecture design`,
  },
  {
    id: 'architecture-system', title: 'System Architecture', description: 'High-level system architecture',
    category: 'Architecture Diagram', complexity: 'advanced', type: 'architectureDiagram',
    content: `---
config:
  theme: 'base'
---
architecture-beta
    group client(cloud)[Client]
    service web(server)[Web App] in client
    service mobile(tablet)[Mobile App] in client
    group api(cloud)[API Layer]
    service gateway(internet)[API Gateway] in api
    service auth(lock)[Auth Service] in api
    group services(cloud)[Services]
    service users(server)[User Service] in services
    service orders(server)[Order Service] in services
    group data(cloud)[Data]
    service userdb(database)[User DB] in data
    service orderdb(database)[Order DB] in data
    service cache(cache)[Cache] in data
    web:R -- L:gateway
    mobile:R -- L:gateway
    gateway:R -- L:auth
    gateway:B -- T:users
    gateway:B -- T:orders
    users:B -- T:userdb
    users:B -- T:cache
    orders:B -- T:orderdb`,
  },
  {
    id: 'block-network', title: 'Network Design', description: 'Block diagram for network topology',
    category: 'Block Diagram', complexity: 'moderate', type: 'blockDiagram',
    content: `---
config:
  theme: 'base'
---
block-beta
    columns 3
    block:group1
        columns 2
        A["Client A"]
        B["Client B"]
    end
    space
    C["Load Balancer"]
    block:group2
        columns 2
        D["Server 1"]
        E["Server 2"]
        F["Server 3"]
    end
    space
    G["Database"]`,
  },
  {
    id: 'class-animals', title: 'UML Class Diagram', description: 'Object-oriented class relationships',
    category: 'Class Diagram', complexity: 'moderate', type: 'classDiagram',
    content: `---
config:
  theme: 'base'
---
classDiagram
    class Vehicle {
        <<abstract>>
        +String make
        +String model
        +int year
        +start() void
        +stop() void
    }
    class Car {
        +int numDoors
        +openTrunk() void
    }
    class Truck {
        +double payloadCapacity
        +loadCargo(double weight) bool
    }
    class Engine {
        +int horsepower
        +String fuelType
        +ignite() void
    }
    class Manufacturer {
        +String name
        +String country
    }
    Vehicle <|-- Car
    Vehicle <|-- Truck
    Vehicle *-- Engine : contains
    Vehicle o-- Manufacturer : made by`,
  },
  {
    id: 'c4-system-context', title: 'System Context Diagram', description: 'C4 architecture showing services and users',
    category: 'C4 Diagram', complexity: 'advanced', type: 'c4',
    content: `---
config:
  theme: 'base'
---
C4Context
    title System Context - Online Shopping
    Enterprise_Boundary(b0, "Company") {
        Person(customer, "Customer", "Buys products online")
        System(store, "Online Store", "Web shop")
        System_Ext(email, "Email System", "Notifications")
        System_Ext(payment, "Payment Gateway", "Payments")
    }
    Rel(customer, store, "Uses")
    Rel(store, email, "Sends emails", "SMTP")
    Rel(store, payment, "Processes payments", "HTTPS/API")`,
  },
  {
    id: 'packet-udp', title: 'UDP Packet', description: 'Network packet structure',
    category: 'Packet Diagram', complexity: 'simple', type: 'packetDiagram',
    content: `---
config:
  theme: 'base'
---
packet-beta
    title UDP Packet
    0-15: "Source Port"
    16-31: "Destination Port"
    32-47: "Length"
    48-63: "Checksum"`,
  },
  {
    id: 'requirement-auth', title: 'System Requirements', description: 'Requirements traceability',
    category: 'Requirement Diagram', complexity: 'moderate', type: 'requirementDiagram',
    content: `---
config:
  theme: 'base'
---
requirementDiagram
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
    performanceRequirement perf_req {
        id: 1.2
        text: Response time under 200ms
        risk: medium
        verifymethod: demonstration
    }
    element user_service {
        type: systemElement
    }
    security_req - traces -> user_mgmt
    security_req - derives -> perf_req
    user_service - satisfies -> security_req
    user_mgmt - refines -> user_service`,
  },
];

export const CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))];
