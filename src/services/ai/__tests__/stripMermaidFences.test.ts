import { describe, it, expect } from 'vitest';
import { stripMermaidFences } from '../WebGPUMLCProvider';

describe('stripMermaidFences', () => {
  it('should strip thinking code blocks with content', () => {
    const input =
      '```thinking\nLet me analyze this...\n```\nflowchart TD\n    A --> B';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should strip reasoning code blocks with content', () => {
    const input = '```reasoning\nStep 1\nStep 2\n```\ngraph TD\n    A --> B';
    expect(stripMermaidFences(input)).toBe('graph TD\n    A --> B');
  });

  it('should strip thought code blocks with content', () => {
    const input = '```thought\nHmm...\n```\nsequenceDiagram\n    A->>B: Hi';
    expect(stripMermaidFences(input)).toBe('sequenceDiagram\n    A->>B: Hi');
  });

  it('should strip <thinking> tags with content', () => {
    const input = '<thinking>I need to think about this</thinking>\nflowchart TD\n    A --> B';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should strip <|think_start|>...<|think_end|> tokens with content', () => {
    const input = '<|think_start|>reasoning here<|think_end|>\nflowchart TD\n    A --> B';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should strip mermaid fences keeping content', () => {
    const input = '```mermaid\nflowchart TD\n    A --> B\n```';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should strip plain code fences keeping content', () => {
    const input = '```\nflowchart TD\n    A --> B\n```';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should truncate at User: marker', () => {
    const input = 'flowchart TD\n    A --> B\nUser: Can you also add C?';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should strip <|...|> tokens', () => {
    const input = 'flowchart TD\n    A --> B\n<|im_end|>';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should handle the user-reported scenario: thinking + preamble + mermaid', () => {
    const input =
      '```thinking\nI need to convert this to a sequence diagram.\n```\nConvert to sequence diagram\n15:24\n\nsequenceDiagram\n    participant Client\n    participant WebServer\n    participant Database\n    Client->>WebServer: Request POST /api/dog\n    WebServer->>Database: Save dog data\n    Database-->>WebServer: Return JSON response\n    WebServer-->>Client: Return JSON response';
    const result = stripMermaidFences(input);
    expect(result).toContain('sequenceDiagram');
    expect(result).toContain('Client->>WebServer');
    expect(result).not.toContain('thinking');
    expect(result).not.toContain('convert');
  });

  it('should handle multiple thinking blocks', () => {
    const input =
      '```thinking\nFirst\n```\n```reasoning\nSecond\n```\nflowchart TD\n    A --> B';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should be case-insensitive for thinking blocks', () => {
    const input = '```Thinking\nThoughts\n```\nflowchart TD\n    A --> B';
    expect(stripMermaidFences(input)).toBe('flowchart TD\n    A --> B');
  });

  it('should handle empty input', () => {
    expect(stripMermaidFences('')).toBe('');
  });

  it('should return clean mermaid code unchanged', () => {
    const input = 'flowchart TD\n    A --> B\n    B --> C';
    expect(stripMermaidFences(input)).toBe(input);
  });
});
