/**
 * Tests for Mermaid code utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseDiagram,
  updateNodeStyle,
  updateNodeLabel,
  updateNodeShape,
  addNode,
  removeNode,
  addEdge,
  getNodeStyle,
  generateNodeId,
  parseFrontmatter,
  generateFrontmatter,
} from '../codeUtils';

describe('Mermaid Code Utilities', () => {
  describe('parseDiagram', () => {
    it('should parse a simple flowchart', () => {
      const source = 'flowchart TD\nA-->B';
      const result = parseDiagram(source);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].id).toBe('A');
      expect(result.nodes[1].id).toBe('B');
    });

    it('should parse nodes with different shapes', () => {
      const source = 'flowchart TD\nA[Start]\nB(End)\nC{Decision}';
      const result = parseDiagram(source);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[0].shape).toBe('rect');
      expect(result.nodes[1].shape).toBe('round');
      expect(result.nodes[2].shape).toBe('rhombus');
    });

    it('should parse edges with labels', () => {
      const source = 'flowchart TD\nA-->|yes|B';
      const result = parseDiagram(source);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].label).toBe('yes');
    });

    it('should parse subgraphs', () => {
      const source = 'flowchart TD\nsubgraph S\nA-->B\nend';
      const result = parseDiagram(source);

      // Should not crash on subgraph
      expect(result).toBeDefined();
    });

    it('should parse style definitions', () => {
      const source = 'flowchart TD\nA-->B\nstyle A fill:red';
      const result = parseDiagram(source);

      expect(result.styles.get('A')).toEqual({
        fill: 'red',
      });
    });

    it('should parse class definitions', () => {
      const source = 'flowchart TD\nA-->B\nclassDef A fill:red';
      const result = parseDiagram(source);

      expect(result.classDefs.get('A')).toEqual({
        fill: 'red',
      });
    });

    it('should parse node classes', () => {
      const source = 'flowchart TD\nA-->B\nclass A myClass';
      const result = parseDiagram(source);

      expect(result.nodeClasses.get('A')).toEqual(['myClass']);
    });

    it('should handle comments', () => {
      const source = '%% This is a comment\nflowchart TD\nA-->B';
      const result = parseDiagram(source);

      expect(result.nodes).toHaveLength(2);
    });

    it('should handle empty input', () => {
      const result = parseDiagram('');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('updateNodeStyle', () => {
    it('should add style to node', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeStyle(source, 'A', { fill: 'red' });

      expect(result).toContain('style A fill:red');
    });

    it('should update existing style', () => {
      const source = 'flowchart TD\nA-->B\nstyle A fill:blue';
      const result = updateNodeStyle(source, 'A', { fill: 'red' });

      expect(result).toContain('style A fill:red');
    });

    it('should remove style if empty', () => {
      const source = 'flowchart TD\nA-->B\nstyle A fill:red';
      const result = updateNodeStyle(source, 'A', {});

      expect(result).not.toContain('style A');
    });

    it('should handle multiple style properties', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeStyle(source, 'A', {
        fill: 'red',
        stroke: 'blue',
      });

      expect(result).toContain('style A fill:red,stroke:blue');
    });
  });

  describe('updateNodeLabel', () => {
    it('should update node label', () => {
      const source = 'flowchart TD\nA[OldLabel]-->B';
      const result = updateNodeLabel(source, 'A', 'NewLabel');

      expect(result).toContain('A[NewLabel]');
      expect(result).not.toContain('OldLabel');
    });

    it('should preserve node shape', () => {
      const source = 'flowchart TD\nA(Label1)';
      const result = updateNodeLabel(source, 'A', 'Label2');

      expect(result).toContain('A(Label2)');
    });

    it('should handle node without shape', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeLabel(source, 'A', 'NewLabel');

      // Should not crash
      expect(result).toBeDefined();
    });
  });

  describe('updateNodeShape', () => {
    it('should update node shape', () => {
      const source = 'flowchart TD\nA[Label]';
      const result = updateNodeShape(source, 'A', 'round');

      expect(result).toContain('A(Label)');
    });

    it('should preserve label', () => {
      const source = 'flowchart TD\nA[MyLabel]';
      const result = updateNodeShape(source, 'A', 'stadium');

      expect(result).toContain('A([MyLabel])');
    });
  });

  describe('addNode', () => {
    it('should add node to diagram', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addNode(source, 'C', 'Node C', 'rect');

      expect(result).toContain('C[Node C]');
    });

    it('should add node with custom shape', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addNode(source, 'C', 'Node C', 'round');

      expect(result).toContain('C(Node C)');
    });

    it('should insert node after first line', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addNode(source, 'C', 'C', 'rect');

      const lines = result.split('\n');
      expect(lines[1]).toContain('C');
    });
  });

  describe('removeNode', () => {
    it('should remove node style', () => {
      const source = 'flowchart TD\nA-->B\nstyle B fill:red';
      const result = removeNode(source, 'B');

      expect(result).not.toContain('style B');
    });

    it('should remove node class', () => {
      const source = 'flowchart TD\nA-->B\nclass B myClass';
      const result = removeNode(source, 'B');

      expect(result).not.toContain('class B');
    });
  });

  describe('addEdge', () => {
    it('should add edge to diagram', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addEdge(source, 'B', 'C', '-->', '');

      expect(result).toContain('B --> C');
    });

    it('should add edge with label', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addEdge(source, 'A', 'B', '-->', 'label');

      expect(result).toContain('A -->|label| B');
    });

    it('should add edge with custom arrow', () => {
      const source = 'flowchart TD\nA-->B';
      const result = addEdge(source, 'A', 'B', '==>', '');

      expect(result).toContain('A ==> B');
    });
  });

  describe('getNodeStyle', () => {
    it('should return direct style', () => {
      const styles = new Map([['A', { fill: 'red' }]]);
      const result = getNodeStyle(styles, new Map(), new Map(), 'A');

      expect(result).toEqual({ fill: 'red' });
    });

    it('should merge class styles', () => {
      const styles = new Map();
      const classDefs = new Map([['myClass', { fill: 'blue' }]]);
      const nodeClasses = new Map([['A', ['myClass']]]);

      const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

      expect(result).toEqual({ fill: 'blue' });
    });

    it('should merge multiple class styles', () => {
      const styles = new Map();
      const classDefs = new Map([
        ['class1', { fill: 'blue' }],
        ['class2', { stroke: 'red' }],
      ]);
      const nodeClasses = new Map([['A', ['class1', 'class2']]]);

      const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

      expect(result).toEqual({ fill: 'blue', stroke: 'red' });
    });

    it('should direct style should override class style', () => {
      const styles = new Map([['A', { fill: 'red' }]]);
      const classDefs = new Map([['myClass', { fill: 'blue' }]]);
      const nodeClasses = new Map([['A', ['myClass']]]);

      const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

      expect(result).toEqual({ fill: 'red' });
    });
  });

  describe('generateNodeId', () => {
    it('should generate unique IDs', () => {
      const existingIds = ['node1', 'node2', 'node3'];
      const result = generateNodeId(existingIds);

      expect(result).toBe('node4');
    });

    it('should handle empty array', () => {
      const result = generateNodeId([]);

      expect(result).toBe('node1');
    });

    it('should handle non-sequential IDs', () => {
      const existingIds = ['node1', 'node5', 'node10'];
      const result = generateNodeId(existingIds);

      expect(result).toBe('node2');
    });
  });

  describe('parseFrontmatter', () => {
    it('should handle no frontmatter', () => {
      const content = 'flowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle invalid JSON', () => {
      const content = '%%{init: {invalid}}%%\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
    });

    it('should handle incomplete init block', () => {
      const content = '%%{init: {"theme": "base"}\nflowchart TD\nA-->B';
      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toContain('flowchart TD');
    });

    it('should parse YAML frontmatter format', () => {
      const content = `---
config:
  theme: base
  themeVariables:
    primaryColor: '#ff0000'
---
flowchart TD
A-->B`;
      const result = parseFrontmatter(content);

      expect(result.frontmatter.config?.theme).toBe('base');
      expect(result.frontmatter.config?.themeVariables?.primaryColor).toBe('#ff0000');
      expect(result.body).toContain('flowchart TD');
    });
  });

  describe('generateFrontmatter', () => {
    it('should generate YAML frontmatter', () => {
      const config = { theme: 'base' };
      const result = generateFrontmatter(config);

      expect(result).toContain('---');
      expect(result).toContain('config:');
      expect(result).toContain('theme:');
      expect(result).toContain('base');
    });

    it('should handle empty config', () => {
      const result = generateFrontmatter({});

      expect(result).toContain('---');
      expect(result).toContain('config:');
    });

    it('should handle complex config', () => {
      const config = { theme: 'forest', themeVariables: { primaryColor: '#ff0000' } };
      const result = generateFrontmatter(config);

      expect(result).toContain('---');
      expect(result).toContain('forest');
      expect(result).toContain('#ff0000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty diagram', () => {
      const result = parseDiagram('flowchart TD');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle only comments', () => {
      const result = parseDiagram('%% Comment 1\n%% Comment 2');
      expect(result.nodes).toHaveLength(0);
    });

    it('should handle multiple arrows', () => {
      const source = 'flowchart TD\nA-->|1|B\nA==>C';
      const result = parseDiagram(source);

      expect(result.edges).toHaveLength(2);
    });

    it('should handle node with ID and label', () => {
      const source = 'flowchart TD\nA[Node A]';
      const result = parseDiagram(source);

      expect(result.nodes[0].id).toBe('A');
      expect(result.nodes[0].label).toBe('Node A');
    });

    it('should parse FontAwesome icon syntax', () => {
      const source = 'flowchart TD\nA[@{ icon: "fa:user", form: "square", label: "User", pos: "t", h: 60 }]';
      const result = parseDiagram(source);

      expect(result.nodes[0].icon).toBeDefined();
      expect(result.nodes[0].icon?.icon).toBe('fa:user');
      expect(result.nodes[0].icon?.form).toBe('square');
      expect(result.nodes[0].icon?.label).toBe('User');
      expect(result.nodes[0].icon?.pos).toBe('t');
      expect(result.nodes[0].icon?.h).toBe(60);
    });

    it('should parse markdown-style labels', () => {
      const source = 'flowchart TD\nA[`**bold**`]';
      const result = parseDiagram(source);

      expect(result.nodes[0].label).toBe('**bold**');
    });

    it('should parse click events and skip them', () => {
      const source = 'flowchart TD\nA-->B\nclick A "https://example.com"\nclick B callback "Tooltip"';
      const result = parseDiagram(source);

      // Should not crash, click events are skipped
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should parse subgraph direction and skip it', () => {
      const source = 'flowchart TD\nsubgraph S\n direction LR\nA-->B\nend';
      const result = parseDiagram(source);

      // Should not crash, direction is skipped
      expect(result).toBeDefined();
    });

    it('should parse new edge types', () => {
      const source = 'flowchart TD\nA~~~B\nAx--xB\nC--oD\nEo--F\nG--|>H';
      const result = parseDiagram(source);

      expect(result.edges).toHaveLength(5);
      expect(result.edges[0].arrowType).toBe('~~~');
      expect(result.edges[1].arrowType).toBe('x--x');
      expect(result.edges[2].arrowType).toBe('--o');
      expect(result.edges[3].arrowType).toBe('o--');
      expect(result.edges[4].arrowType).toBe('--|>');
    });
  });
});
