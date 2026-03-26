import { describe, it, expect } from 'vitest';
import { renderDiagram } from '../core';
import { addSubgraph } from '../codeUtils';

describe('addSubgraph mermaid rendering', () => {
  it('renders simple diagram + empty subgraph (bracket syntax)', async () => {
    const source = 'flowchart TD\nA-->B';
    const withSubgraph = addSubgraph(source);
    expect(withSubgraph).toContain('subgraph subgraph1["New Subgraph"]');
    const { svg, error } = await renderDiagram(withSubgraph, 'test_empty_sub');
    // getBBox error is a jsdom limitation, not a syntax error
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
  });

  it('renders complex diagram + empty subgraph (bracket syntax)', async () => {
    const source = `flowchart TD
    A([Start]) --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug it]
    D --> B
    C --> E([End])`;
    const withSubgraph = addSubgraph(source);
    expect(withSubgraph).toContain('subgraph subgraph1["New Subgraph"]');
    const { svg, error } = await renderDiagram(withSubgraph, 'test_complex_empty');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
  });

  it('renders subgraph with custom id and label', async () => {
    const source = 'flowchart TD\nA-->B';
    const withSubgraph = addSubgraph(source, 'myGroup', 'My Group');
    expect(withSubgraph).toContain('subgraph myGroup["My Group"]');
    const { svg, error } = await renderDiagram(withSubgraph, 'test_custom');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
  });
});
