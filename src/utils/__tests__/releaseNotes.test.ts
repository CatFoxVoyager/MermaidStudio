import { describe, it, expect } from 'vitest';
import { parseReleaseNotes, RECENT_RELEASES } from '../releaseNotes';
import pkg from '../../../package.json';

describe('parseReleaseNotes', () => {
  it('parses release-please headings, sections, scopes, and strips commit links', () => {
    const sample = [
      '# Changelog',
      '',
      '## [3.2.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/v3.1.0...v3.2.0) (2026-11-24)',
      '',
      '### Features',
      '',
      '* **ui-scale:** add interface scale menu ([8eeac65](https://github.com/CatFoxVoyager/MermaidStudio/commit/8eeac65))',
      '* upload -&gt; compress ([b5fda36](https://github.com/CatFoxVoyager/MermaidStudio/commit/b5fda36))',
      '',
      '### Bug Fixes',
      '',
      '* **render:** apply look switches ([48fba7c](https://github.com/CatFoxVoyager/MermaidStudio/commit/48fba7c))',
      '',
      '## [3.1.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/v3.0.0...v3.1.0) (2026-11-23)',
      '',
      '### ⚠ BREAKING CHANGES',
      '',
      '* **shapes:** unified picker',
    ].join('\n');

    const parsed = parseReleaseNotes(sample, 2);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      version: '3.2.0',
      date: '2026-11-24',
      sections: [
        {
          kind: 'features',
          title: 'Features',
          items: [
            { scope: 'ui-scale', text: 'add interface scale menu' },
            { text: 'upload -> compress' },
          ],
        },
        {
          kind: 'fixes',
          title: 'Bug Fixes',
          items: [{ scope: 'render', text: 'apply look switches' }],
        },
      ],
    });
    expect(parsed[1].version).toBe('3.1.0');
    expect(parsed[1].sections[0].kind).toBe('breaking');
  });

  it('parses the live CHANGELOG.md with the current package.json version at the top', () => {
    expect(RECENT_RELEASES.length).toBeGreaterThanOrEqual(1);
    expect(RECENT_RELEASES[0].version).toBe(pkg.version);
    expect(RECENT_RELEASES[0].sections.length).toBeGreaterThan(0);
  });
});
