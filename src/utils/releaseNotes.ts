import changelogRaw from '../../CHANGELOG.md?raw';

export interface ReleaseNoteItem {
  scope?: string;
  text: string;
}

export interface ReleaseSection {
  kind: 'breaking' | 'features' | 'fixes' | 'other';
  title: string;
  items: ReleaseNoteItem[];
}

export interface ReleaseEntry {
  version: string;
  date?: string;
  sections: ReleaseSection[];
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

function classifySection(title: string): ReleaseSection['kind'] {
  const lower = title.toLowerCase();
  if (lower.includes('breaking')) return 'breaking';
  if (lower.includes('feature') || lower.includes('added')) return 'features';
  if (lower.includes('fix')) return 'fixes';
  return 'other';
}

function parseBullet(rawBullet: string): ReleaseNoteItem | null {
  // Strip trailing markdown commit reference e.g. ` ([59c46c6](https://...))`
  let text = rawBullet.replace(/\s*\(\[[0-9a-f]{7,40}\]\([^)]+\)\)\s*$/i, '').trim();
  if (!text) return null;

  text = decodeHtmlEntities(text);

  // Extract optional conventional-commit bold scope: `**ui-scale:** ...`
  const scopeMatch = /^\*\*([^*]+?):\*\*\s*(.+)$/.exec(text);
  if (scopeMatch) {
    return {
      scope: scopeMatch[1].trim(),
      text: scopeMatch[2].trim(),
    };
  }
  return { text };
}

/**
 * Parse a Keep-a-Changelog / release-please CHANGELOG.md into structured
 * release entries (newest first), capped to `maxReleases`.
 */
export function parseReleaseNotes(markdown: string, maxReleases = 3): ReleaseEntry[] {
  const lines = markdown.split(/\r?\n/);
  const releases: ReleaseEntry[] = [];
  let currentRelease: ReleaseEntry | null = null;
  let currentSection: ReleaseSection | null = null;

  for (const line of lines) {
    // Match `## [3.2.0](url) (2026-11-24)` or `## [3.2.0] - 2026-11-24` or `## 3.2.0 (2026-11-24)`
    const releaseMatch = /^##\s+\[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?(?:\s*[-–—]?\s*\(?(\d{4}-\d{2}-\d{2})\)?)?/.exec(
      line
    );
    if (releaseMatch) {
      if (releases.length >= maxReleases) break;
      currentRelease = {
        version: releaseMatch[1],
        date: releaseMatch[2],
        sections: [],
      };
      releases.push(currentRelease);
      currentSection = null;
      continue;
    }

    if (!currentRelease) continue;

    const sectionMatch = /^###\s+(.+)$/.exec(line);
    if (sectionMatch) {
      const title = sectionMatch[1].replace(/^⚠\s*/, '').trim();
      currentSection = {
        kind: classifySection(title),
        title,
        items: [],
      };
      currentRelease.sections.push(currentSection);
      continue;
    }

    const bulletMatch = /^\s*[-*]\s+(.+)$/.exec(line);
    if (bulletMatch && currentSection) {
      const item = parseBullet(bulletMatch[1]);
      if (item) {
        currentSection.items.push(item);
      }
    }
  }

  return releases.map(r => ({
    ...r,
    sections: r.sections.filter(s => s.items.length > 0),
  }));
}

export const RECENT_RELEASES: readonly ReleaseEntry[] = parseReleaseNotes(changelogRaw, 3);
