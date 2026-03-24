export const basicDiagrams = {
  simpleFlow: `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]
    C --> D`,

  sequenceDiagram: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!`,

  classDiagram: `classDiagram
    class Animal {
      +String name
      +Integer age
      +makeSound()
    }

    class Dog {
      +bark()
    }

    class Cat {
      +meow()
    }

    Animal <|-- Dog
    Animal <|-- Cat`,

  gitGraph: `gitGraph
    commit id: "Initial commit"
    branch develop
    checkout develop
    commit id: "Add feature"
    checkout main
    merge develop
    commit id: "Fix bug"`,

  pieChart: `pie
    title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`
};

export const diagramTemplates = [
  {
    id: 'flowchart',
    name: 'Flowchart Template',
    description: 'Simple flowchart with decision points',
    content: basicDiagrams.simpleFlow
  },
  {
    id: 'sequence',
    name: 'Sequence Diagram',
    description: 'Sequence diagram showing interactions',
    content: basicDiagrams.sequenceDiagram
  },
  {
    id: 'class',
    name: 'Class Diagram',
    description: 'UML class diagram',
    content: basicDiagrams.classDiagram
  }
];

export const paletteItems = [
  {
    id: 'flowchart',
    name: 'Basic Flowchart',
    description: 'Standard flowchart shapes',
    code: 'graph TD\\n    A[Start] --> B{Decision}\\n    B -->|Yes| C[End]\\n    B -->|No| D[Loop]'
  },
  {
    id: 'sequence',
    name: 'Sequence',
    description: 'Sequence diagram elements',
    code: 'sequenceDiagram\\n    participant A\\n    participant B\\n    A->>B: Hello'
  },
  {
    id: 'class',
    name: 'Class',
    description: 'UML class elements',
    code: 'classDiagram\\n    class A\\n    class B\\n    A --|> B'
  }
];