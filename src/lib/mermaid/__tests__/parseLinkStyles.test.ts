import { describe, it, expect } from 'vitest';
import { parseLinkStyles, edgeStyleToString, parseStyleValue } from '../codeUtils';

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

  it('should parse comma-separated linkStyle directives with trailing semicolons', () => {
    const source = `flowchart TB
    A ---|"D01 : 44"| B
    linkStyle default stroke:#bbbbbb,color:#dddddd,stroke-width:1px;
    linkStyle 0 stroke:#959595,color:#c99732,stroke-width:1.8px;`;

    const linkStyles = parseLinkStyles(source);
    expect(linkStyles.get('default')).toEqual({
      stroke: '#bbbbbb',
      color: '#dddddd',
      strokeWidth: '1px',
    });
    expect(linkStyles.get(0)).toEqual({
      stroke: '#959595',
      color: '#c99732',
      strokeWidth: '1.8px',
    });
  });

  it('should preserve rgb() commas and support comma-separated indices in linkStyle', () => {
    const source = `flowchart TB
    A --> B
    B --> C
    linkStyle 0,1 stroke:rgb(149, 149, 149),color:#eeeeee;`;

    const linkStyles = parseLinkStyles(source);
    expect(linkStyles.get(0)).toEqual({ stroke: 'rgb(149, 149, 149)', color: '#eeeeee' });
    expect(linkStyles.get(1)).toEqual({ stroke: 'rgb(149, 149, 149)', color: '#eeeeee' });
  });

  it('should parse comma-separated classDef/style values with trailing semicolons', () => {
    expect(parseStyleValue('fill:#191919,stroke:#cccccc,color:#eeeeee,stroke-width:1.5px;')).toEqual({
      fill: '#191919',
      stroke: '#cccccc',
      color: '#eeeeee',
      strokeWidth: '1.5px',
    });
  });
});
