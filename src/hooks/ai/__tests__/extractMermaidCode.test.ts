import { describe, it, expect } from 'vitest';
import { extractMermaidCode } from '../useAISend';

describe('extractMermaidCode', () => {
  it('should return clean mermaid code unchanged', () => {
    const input = 'sequenceDiagram\n    participant A\n    A->>B: Hello';
    expect(extractMermaidCode(input)).toBe(input);
  });

  it('should strip thinking code block and extract mermaid code', () => {
    const input =
      '```thinking\nLet me analyze this request...\nThe user wants a sequence diagram.\n```\n\nsequenceDiagram\n    participant Client\n    participant Server\n    Client->>Server: Request';
    const result = extractMermaidCode(input);
    expect(result).toBe(
      'sequenceDiagram\n    participant Client\n    participant Server\n    Client->>Server: Request'
    );
  });

  it('should strip reasoning code block', () => {
    const input =
      '```reasoning\nStep 1: Identify diagram type\nStep 2: Build diagram\n```\nflowchart TD\n    A --> B';
    const result = extractMermaidCode(input);
    expect(result).toBe('flowchart TD\n    A --> B');
  });

  it('should strip thought code block', () => {
    const input = '```thought\nHmm, what should I create?\n```\ngraph LR\n    X --> Y';
    const result = extractMermaidCode(input);
    expect(result).toBe('graph LR\n    X --> Y');
  });

  it('should strip markdown fences and extract code', () => {
    const input = '```mermaid\nflowchart TD\n    A --> B\n```';
    const result = extractMermaidCode(input);
    expect(result).toBe('flowchart TD\n    A --> B');
  });

  it('should strip plain code fences', () => {
    const input = '```\nflowchart TD\n    A --> B\n```';
    const result = extractMermaidCode(input);
    expect(result).toBe('flowchart TD\n    A --> B');
  });

  it('should strip preamble text before mermaid code', () => {
    const input =
      'Here is the diagram you requested:\n\nflowchart TD\n    A --> B\n    B --> C';
    const result = extractMermaidCode(input);
    expect(result).toBe('flowchart TD\n    A --> B\n    B --> C');
  });

  it('should handle mixed thinking and preamble', () => {
    const input =
      '```thinking\nI need to create a diagram.\n```\nConvert to sequence diagram\n15:24\n\nsequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello';
    const result = extractMermaidCode(input);
    expect(result).toBe('sequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello');
  });

  it('should return input unchanged when no mermaid code found', () => {
    const input = 'Just some plain text without any diagram';
    expect(extractMermaidCode(input)).toBe(input);
  });

  it('should handle empty input', () => {
    expect(extractMermaidCode('')).toBe('');
    expect(extractMermaidCode('   ')).toBe('');
  });

  it('should handle case-insensitive thinking blocks', () => {
    const input = '```Thinking\nSome reasoning\n```\nflowchart TD\n    A --> B';
    const result = extractMermaidCode(input);
    expect(result).toBe('flowchart TD\n    A --> B');
  });

  it('should handle multiple thinking blocks', () => {
    const input =
      '```thinking\nFirst thought\n```\n```reasoning\nSecond thought\n```\nflowchart TD\n    A --> B';
    const result = extractMermaidCode(input);
    expect(result).toBe('flowchart TD\n    A --> B');
  });
});
