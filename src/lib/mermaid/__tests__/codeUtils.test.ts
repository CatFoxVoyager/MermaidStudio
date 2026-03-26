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
  removeNodeStyles,
  parseStyleValue,
  styleToString,
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
  });

  describe('Extended NodeStyle', () => {
    describe('parseStyleValue', () => {
      it('should parse comma-separated classDef string with all 9 properties', () => {
        const result = parseStyleValue('fill:red,stroke:blue,stroke-width:2px,stroke-dasharray:5 5,color:white,font-weight:bold,font-size:16px,rx:10,ry:10');
        expect(result).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
        });
      });

      it('should parse semicolon-separated style string with all 9 properties', () => {
        const result = parseStyleValue('fill:red;stroke:blue;stroke-width:2px;stroke-dasharray:5 5;color:white;font-weight:bold;font-size:16px;rx:10;ry:10');
        expect(result).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
        });
      });

      it('should handle stroke-dasharray with spaces', () => {
        const result = parseStyleValue('stroke-dasharray:5 5');
        expect(result.strokeDasharray).toBe('5 5');
      });

      it('should be backward-compatible with old 4-property input', () => {
        const result = parseStyleValue('fill:red,stroke:blue,stroke-width:2px,color:white');
        expect(result).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          color: 'white',
        });
      });

      it('should handle partial properties', () => {
        const result = parseStyleValue('fill:#eee,font-weight:bold');
        expect(result).toEqual({
          fill: '#eee',
          fontWeight: 'bold',
        });
      });
    });

    describe('styleToString extended', () => {
      it('should output all 9 properties as comma-separated CSS', () => {
        const style = {
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
        };
        const result = styleToString(style);
        expect(result).toBe('fill:red,stroke:blue,stroke-width:2px,stroke-dasharray:5 5,color:white,font-weight:bold,font-size:16px,rx:10,ry:10');
      });

      it('should return empty string for empty style', () => {
        const result = styleToString({});
        expect(result).toBe('');
      });

      it('should output only defined properties', () => {
        const style = { fill: 'red', fontWeight: 'bold' };
        const result = styleToString(style);
        expect(result).toBe('fill:red,font-weight:bold');
      });
    });

    describe('getNodeStyle extended', () => {
      it('should return merged style including new properties', () => {
        const styles = new Map([['A', { fill: 'red', fontWeight: 'bold' }]]);
        const classDefs = new Map([['myClass', { stroke: 'blue', fontSize: '16px' }]]);
        const nodeClasses = new Map([['A', ['myClass']]]);

        const result = getNodeStyle(styles, classDefs, nodeClasses, 'A');

        expect(result).toEqual({
          fill: 'red',
          fontWeight: 'bold',
          stroke: 'blue',
          fontSize: '16px',
        });
      });
    });

    describe('parseDiagram extended', () => {
      it('should correctly parse classDef lines with new properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red,stroke-dasharray:5 5,font-weight:bold';
        const result = parseDiagram(source);

        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          strokeDasharray: '5 5',
          fontWeight: 'bold',
        });
      });
    });
  });

  describe('removeNodeStyles', () => {
    it('should remove classDef, class assignment, and style lines for a single node', () => {
      const source = [
        'flowchart TD',
        'A-->B',
        'style A fill:red',
        'classDef myClass fill:blue',
        'class A myClass',
      ].join('\n');

      const result = removeNodeStyles(source, ['A']);

      expect(result).not.toContain('style A fill:red');
      expect(result).not.toContain('class A myClass');
      expect(result).not.toContain('classDef myClass fill:blue');
      expect(result).toContain('flowchart TD');
      expect(result).toContain('A-->B');
    });

    it('should handle multiple node IDs', () => {
      const source = [
        'flowchart TD',
        'A-->B',
        'style A fill:red',
        'style B fill:blue',
        'classDef clsA fill:red',
        'classDef clsB fill:blue',
        'class A clsA',
        'class B clsB',
      ].join('\n');

      const result = removeNodeStyles(source, ['A', 'B']);

      expect(result).not.toContain('style A fill:red');
      expect(result).not.toContain('style B fill:blue');
      expect(result).not.toContain('class A clsA');
      expect(result).not.toContain('class B clsB');
      expect(result).not.toContain('classDef clsA fill:red');
      expect(result).not.toContain('classDef clsB fill:blue');
    });

    it('should preserve unrelated lines', () => {
      const source = [
        'flowchart TD',
        'A-->B',
        'C-->D',
        'style A fill:red',
        'classDef myClass fill:blue',
        'class A myClass',
        'style C fill:green',
        'classDef otherClass fill:yellow',
        'class C otherClass',
      ].join('\n');

      const result = removeNodeStyles(source, ['A']);

      expect(result).not.toContain('style A fill:red');
      expect(result).not.toContain('class A myClass');
      expect(result).not.toContain('classDef myClass fill:blue');
      // These should be preserved
      expect(result).toContain('C-->D');
      expect(result).toContain('style C fill:green');
      expect(result).toContain('classDef otherClass fill:yellow');
      expect(result).toContain('class C otherClass');
    });

    it('should return unchanged content when no matching lines exist', () => {
      const source = 'flowchart TD\nA-->B';
      const result = removeNodeStyles(source, ['C']);

      expect(result).toBe(source);
    });

    it('should clean up excessive blank lines after removal', () => {
      const source = [
        'flowchart TD',
        'A-->B',
        '',
        '',
        'style A fill:red',
        '',
        '',
        '',
        'classDef myClass fill:blue',
        '',
        'class A myClass',
      ].join('\n');

      const result = removeNodeStyles(source, ['A']);

      // Should not have 3+ consecutive newlines
      expect(result).not.toMatch(/\n{3,}/);
    });
  });
});
