import type { Diagram } from '@/types';

export function createDiagram(overrides: Partial<Diagram> = {}): Diagram {
  return {
    id: crypto.randomUUID(),
    title: 'Test Diagram',
    content: '---\nconfig:\n  theme: base\n---\nflowchart LR\n  A-->B',
    folder_id: null,
    themeId: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

export function createFlowchartDiagram(): Diagram {
  return createDiagram({
    title: 'Flowchart',
    content: '---\nconfig:\n  theme: base\n---\nflowchart LR\n  Start-->End'
  });
}

export function createSequenceDiagram(): Diagram {
  return createDiagram({
    title: 'Sequence Diagram',
    content: 'sequenceDiagram\n  Alice->>Bob: Hello'
  });
}
