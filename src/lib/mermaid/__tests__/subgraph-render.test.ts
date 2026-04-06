import { describe, it, expect } from 'vitest';
import { renderDiagram } from '../core';
import { addSubgraph } from '../codeUtils';

describe('addSubgraph mermaid rendering', () => {
  it('renders simple diagram + subgraph with default node (bracket syntax)', async () => {
    const source = 'flowchart TD\nA-->B';
    const withSubgraph = addSubgraph(source);
    expect(withSubgraph).toContain('subgraph subgraph1[Subgraph]');
    expect(withSubgraph).toContain('N1[Subgraph]'); // Verify default node is added
    const { svg, error } = await renderDiagram(withSubgraph, 'test_sub_with_node');
    // getBBox error is a jsdom limitation, not a syntax error
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
  });

  it('renders complex diagram + subgraph with default node (bracket syntax)', async () => {
    const source = `flowchart TD
    A([Start]) --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug it]
    D --> B
    C --> E([End])`;
    const withSubgraph = addSubgraph(source);
    expect(withSubgraph).toContain('subgraph subgraph1[Subgraph]');
    expect(withSubgraph).toContain('N1[Subgraph]'); // Verify default node is added
    const { svg, error } = await renderDiagram(withSubgraph, 'test_complex_with_node');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
  });

  it('renders subgraph with custom id and label (with default node)', async () => {
    const source = 'flowchart TD\nA-->B';
    const withSubgraph = addSubgraph(source, 'myGroup', 'My Group');
    expect(withSubgraph).toContain('subgraph myGroup["My Group"]');
    expect(withSubgraph).toContain('N1[My Group]'); // Verify default node uses custom label
    const { svg, error } = await renderDiagram(withSubgraph, 'test_custom');
    if (error && !error.includes('getBBox')) {
      throw new Error(`Unexpected render error: ${error}`);
    }
  });
});
