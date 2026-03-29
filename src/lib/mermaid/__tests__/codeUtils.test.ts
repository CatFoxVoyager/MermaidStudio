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
  parseLinkStyles,
  edgeStyleToString,
  updateLinkStyle,
  removeLinkStyles,
  updateEdgeArrowType,
  updateEdgeLabel,
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
    it('should update node label with quotes', () => {
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

    it('should handle node without shape (implicit node definition)', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeLabel(source, 'A', 'NewLabel');

      // Should add shape with new label for source node (no quotes)
      expect(result).toContain('A[NewLabel]');
      expect(result).toContain('-->');
      expect(result).toContain('B');
      expect(result).toBe('flowchart TD\nA[NewLabel]-->B');
    });

    it('should handle target node without shape', () => {
      const source = 'flowchart TD\nA-->B';
      const result = updateNodeLabel(source, 'B', 'NewLabel');

      // Should add shape with new label for target node (no quotes)
      expect(result).toContain('A-->');
      expect(result).toContain('B[NewLabel]');
      expect(result).toBe('flowchart TD\nA-->B[NewLabel]');
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
    it('should add node to diagram without auto-quoting', () => {
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
      it('should parse comma-separated classDef string with all 10 properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red,stroke:blue,stroke-width:2px,stroke-dasharray:5 5,color:white,font-weight:bold,font-size:16px,rx:10,ry:10,opacity:0.5';
        const result = parseDiagram(source);

        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
          opacity: '0.5',
        });
      });

      it('should parse semicolon-separated style string with all 10 properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red;stroke:blue;stroke-width:2px;stroke-dasharray:5 5;color:white;font-weight:bold;font-size:16px;rx:10;ry:10;opacity:0.5';
        const result = parseDiagram(source);

        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          rx: '10',
          ry: '10',
          opacity: '0.5',
        });
      });

      it('should handle stroke-dasharray with spaces', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass stroke-dasharray:5 5';
        const result = parseDiagram(source);
        expect(result.classDefs.get('myClass')?.strokeDasharray).toBe('5 5');
      });

      it('should be backward-compatible with old 4-property input', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:red,stroke:blue,stroke-width:2px,color:white';
        const result = parseDiagram(source);
        expect(result.classDefs.get('myClass')).toEqual({
          fill: 'red',
          stroke: 'blue',
          strokeWidth: '2px',
          color: 'white',
        });
      });

      it('should handle partial properties', () => {
        const source = 'flowchart TD\nA-->B\nclassDef myClass fill:#eee,font-weight:bold';
        const result = parseDiagram(source);
        expect(result.classDefs.get('myClass')).toEqual({
          fill: '#eee',
          fontWeight: 'bold',
        });
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

  describe('Edge Style Utilities', () => {
    describe('parseLinkStyles', () => {
      it('should parse linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red,stroke-width:2px';
        const result = parseLinkStyles(source);

        expect(result.size).toBe(1);
        expect(result.get(0)).toEqual({
          stroke: 'red',
          strokeWidth: '2px',
        });
      });

      it('should parse multiple linkStyle lines', () => {
        const source = [
          'flowchart TD',
          'A-->B',
          'C-->D',
          'linkStyle 0 stroke:red',
          'linkStyle 1 stroke:blue,opacity:0.5',
        ].join('\n');
        const result = parseLinkStyles(source);

        expect(result.size).toBe(2);
        expect(result.get(0)?.stroke).toBe('red');
        expect(result.get(1)?.stroke).toBe('blue');
        expect(result.get(1)?.opacity).toBe('0.5');
      });

      it('should handle semicolon-separated styles', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red;stroke-width:2px;opacity:0.5';
        const result = parseLinkStyles(source);

        expect(result.get(0)).toEqual({
          stroke: 'red',
          strokeWidth: '2px',
          opacity: '0.5',
        });
      });

      it('should return empty map when no linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B';
        const result = parseLinkStyles(source);

        expect(result.size).toBe(0);
      });

    });

    describe('edgeStyleToString', () => {
      it('should convert full EdgeStyle to string', () => {
        const result = edgeStyleToString({
          stroke: 'red',
          strokeWidth: '2px',
          strokeDasharray: '5 5',
          opacity: '0.5',
        });
        expect(result).toBe('stroke:red,stroke-width:2px,stroke-dasharray:5 5,opacity:0.5');
      });

      it('should return empty string for empty style', () => {
        expect(edgeStyleToString({})).toBe('');
      });

      it('should output only defined properties', () => {
        const result = edgeStyleToString({ stroke: 'blue' });
        expect(result).toBe('stroke:blue');
      });

    });

    describe('updateLinkStyle', () => {
      it('should add new linkStyle line', () => {
        const source = 'flowchart TD\nA-->B';
        const result = updateLinkStyle(source, 0, { stroke: 'red' });

        expect(result).toContain('linkStyle 0 stroke:red');
      });

      it('should update existing linkStyle line', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red';
        const result = updateLinkStyle(source, 0, { stroke: 'blue' });

        expect(result).toContain('linkStyle 0 stroke:blue');
        expect(result).not.toContain('stroke:red');
      });

      it('should remove linkStyle if empty style', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red';
        const result = updateLinkStyle(source, 0, {});

        expect(result).not.toContain('linkStyle 0');
      });

      it('should insert after last existing linkStyle', () => {
        const source = 'flowchart TD\nA-->B\nC-->D\nlinkStyle 0 stroke:red';
        const result = updateLinkStyle(source, 1, { stroke: 'blue' });

        const lines = result.split('\n');
        const linkStyle0Idx = lines.findIndex(l => l.includes('linkStyle 0'));
        const linkStyle1Idx = lines.findIndex(l => l.includes('linkStyle 1'));
        expect(linkStyle1Idx).toBeGreaterThan(linkStyle0Idx);
      });

    });

    describe('removeLinkStyles', () => {
      it('should remove specified linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red\nlinkStyle 1 stroke:blue';
        const result = removeLinkStyles(source, [0]);

        expect(result).not.toContain('linkStyle 0');
        expect(result).toContain('linkStyle 1');
      });

      it('should handle multiple indices', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red\nlinkStyle 1 stroke:blue\nlinkStyle 2 stroke:green';
        const result = removeLinkStyles(source, [0, 2]);

        expect(result).not.toContain('linkStyle 0');
        expect(result).toContain('linkStyle 1');
        expect(result).not.toContain('linkStyle 2');
      });

      it('should preserve non-linkStyle lines', () => {
        const source = 'flowchart TD\nA-->B\nC-->D\nlinkStyle 0 stroke:red';
        const result = removeLinkStyles(source, [0]);

        expect(result).toContain('flowchart TD');
        expect(result).toContain('A-->B');
        expect(result).toContain('C-->D');
      });

    });

    describe('updateEdgeArrowType', () => {
      it('should change arrow type on simple edge', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeArrowType(source, 'A', 'B', '==>');

        expect(result).toContain('A ==> B');
        expect(result).not.toContain('A --> B');
      });

      it('should preserve edge label when changing arrow', () => {
        const source = 'flowchart TD\nA -->|label| B';
        const result = updateEdgeArrowType(source, 'A', 'B', '---');

        expect(result).toContain('A ---|label| B');
      });

      it('should handle dotted arrow type', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeArrowType(source, 'A', 'B', '-.->');

        expect(result).toContain('A -.-> B');
      });

      it('should return unchanged source when edge not found', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeArrowType(source, 'X', 'Y', '==>');

        expect(result).toBe(source);
      });
    });

    describe('updateEdgeLabel', () => {
      it('should add label to edge without label', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeLabel(source, 'A', 'B', 'my label');

        expect(result).toContain('A -->|my label| B');
      });

      it('should update existing edge label', () => {
        const source = 'flowchart TD\nA -->|old| B';
        const result = updateEdgeLabel(source, 'A', 'B', 'new');

        expect(result).toContain('A -->|new| B');
        expect(result).not.toContain('|old|');
      });

      it('should remove label when empty string', () => {
        const source = 'flowchart TD\nA -->|label| B';
        const result = updateEdgeLabel(source, 'A', 'B', '');

        expect(result).toContain('A --> B');
        expect(result).not.toContain('|');
      });

      it('should return unchanged source when edge not found', () => {
        const source = 'flowchart TD\nA --> B';
        const result = updateEdgeLabel(source, 'X', 'Y', 'label');

        expect(result).toBe(source);
      });
    });

    describe('parseDiagram with linkStyles', () => {
      it('should skip linkStyle lines when parsing', () => {
        const source = 'flowchart TD\nA-->B\nlinkStyle 0 stroke:red';
        const result = parseDiagram(source);

        expect(result.nodes).toHaveLength(2);
        expect(result.edges).toHaveLength(1);
      });
    });
  });
});
