export const performanceTestDiagrams = {
  // Small diagram (fast rendering)
  small: `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`,

  // Medium diagram
  medium: `graph TD
    A[Start] --> B[Process 1]
    B --> C[Decision]
    C -->|Option 1| D[Action 1]
    C -->|Option 2| E[Action 2]
    D --> F[Process 2]
    E --> F
    F --> G[End]`,

  // Large diagram (100 nodes)
  large: (() => {
    let diagram = 'graph TD\n';
    for (let i = 0; i < 100; i++) {
      diagram += `  Node${i}[Node ${i}]`;
      if (i < 99) {
        diagram += ` --> `;
      }
      if (i % 20 === 19 && i < 99) {
        diagram += `\n`;
      }
    }
    return diagram;
  })(),

  // Complex sequence diagram
  sequence: `sequenceDiagram
    participant User
    participant Auth
    participant DB
    participant Cache
    participant API

    User->>Auth: Login
    Auth->>DB: Check credentials
    DB-->>Auth: User data
    Auth->>Cache: Store session
    Cache-->>Auth: Session created
    Auth-->>User: Login successful

    User->>API: Request data
    API->>Cache: Get session
    Cache-->>API: Session valid
    API->>DB: Fetch data
    DB-->>API: Data
    API-->>User: Response`,

  // Complex class diagram
  class: `classDiagram
    class User {
      +String id
      +String name
      +String email
      +login()
      +logout()
      +updateProfile()
    }

    class Account {
      +String accountNumber
      +String accountType
      +BigDecimal balance
      +deposit(amount)
      +withdraw(amount)
      +getBalance()
    }

    class Transaction {
      +String id
      +String type
      +BigDecimal amount
      +Date timestamp
      +execute()
      +reverse()
    }

    class AuditLog {
      +String id
      +String action
      +String userId
      +Date timestamp
      +logAction()
    }

    User "1" -- "1..*" Account : has
    Account "1" -- "0..*" Transaction : contains
    Transaction -- AuditLog : creates`,

  // Complex pie chart
  pie: `pie
    title Project Resource Allocation
    "Development" : 45
    "Testing" : 25
    "Documentation" : 15
    "Management" : 10
    "Other" : 5`
};

export const performanceMetrics = {
  // Expected maximum render times (in milliseconds)
  maxRenderTimes: {
    small: 1000,
    medium: 2000,
    large: 5000,
    sequence: 3000,
    class: 4000,
    pie: 1500
  },

  // Expected number of nodes
  expectedNodes: {
    small: 4,
    medium: 7,
    large: 100,
    sequence: 5,
    class: 4,
    pie: 5
  },

  // Test scenarios
  scenarios: [
    {
      name: 'Small diagram render',
      diagram: 'small',
      maxNodes: 10
    },
    {
      name: 'Medium diagram render',
      diagram: 'medium',
      maxNodes: 15
    },
    {
      name: 'Large diagram render',
      diagram: 'large',
      maxNodes: 150
    },
    {
      name: 'Sequence diagram render',
      diagram: 'sequence',
      maxNodes: 10
    },
    {
      name: 'Class diagram render',
      diagram: 'class',
      maxNodes: 10
    },
    {
      name: 'Pie chart render',
      diagram: 'pie',
      maxNodes: 5
    }
  ]
};

export const stressTestScenarios = [
  // Rapid changes
  {
    name: 'Rapid content changes',
    iterations: 10,
    interval: 500,
    diagram: 'medium'
  },
  // Multiple tabs
  {
    name: 'Multiple tabs with diagrams',
    tabs: 5,
    diagram: 'large'
  },
  // Theme switching
  {
    name: 'Repeated theme switching',
    iterations: 10,
    diagram: 'sequence'
  }
];