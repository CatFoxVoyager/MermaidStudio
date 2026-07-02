import { describe, it, expect } from 'vitest';
import { parseLinkStyles, edgeStyleToString } from '../codeUtils';

describe('parseLinkStyles', () => {
  it('should parse fontSize from linkStyle', () => {
    const source = `graph TD
    A[Start] -->|Label| B[End]
    linkStyle 0 fontSize:30px,stroke:#ff0000`;

    const linkStyles = parseLinkStyles(source);
    console.log('Parsed linkStyles:', Array.from(linkStyles.entries()));

    expect(linkStyles.size).toBeGreaterThan(0);
    const style = linkStyles.get(0);
    console.log('Style for edge 0:', style);

    expect(style).toBeDefined();
    expect(style?.fontSize).toBe('30px');
    expect(style?.stroke).toBe('#ff0000');
  });

  it('should convert edgeStyle with fontSize', () => {
    const style = { fontSize: '30px', stroke: '#ff0000' };
    const styleStr = edgeStyleToString(style);

    console.log('edgeStyleToString result:', styleStr);

    expect(styleStr).toContain('font-size:30px');
    expect(styleStr).toContain('stroke:#ff0000');
  });
});
