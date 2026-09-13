import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MERMAID_CDN_URL, MERMAID_CDN_SRI, buildMermaidEmbedSnippet } from '../cdnEmbed';

// Path guards (src/constants/__tests__ -> repo root):
// - scripts/verify-cdn-embed.html: the manual browser fixture that must carry
//   the exact same embed snippet as ExportModal pastes.
// - node_modules/mermaid/: the pinned artifact the hash was computed over.
const FIXTURE_PATH = resolve(__dirname, '../../../scripts/verify-cdn-embed.html');
const MERMAID_PKG_PATH = resolve(__dirname, '../../../node_modules/mermaid/package.json');
const MERMAID_MIN_JS_PATH = resolve(__dirname, '../../../node_modules/mermaid/dist/mermaid.min.js');

/**
 * WR-01 regression guard: the CDN embed snippet (version tag + SRI hash)
 * previously lived as copy-pasted literals in ExportModal and in the manual
 * fixture, with nothing enforcing that the copies (or the hash itself) stay
 * correct. A stale hash hard-blocks the script in browsers — the pasted embed
 * silently renders nothing — so these invariants are load-bearing.
 */
describe('cdnEmbed single source of truth', () => {
  it('manual fixture scripts/verify-cdn-embed.html uses the exact same URL and SRI hash', () => {
    const html = readFileSync(FIXTURE_PATH, 'utf8');
    expect(html).toContain(MERMAID_CDN_URL);
    expect(html).toContain(MERMAID_CDN_SRI);

    // The fixture's script tag must carry URL and hash together (catches a
    // partial bump that edits one attribute but not the other).
    expect(
      html.includes(`<script src="${MERMAID_CDN_URL}" integrity="${MERMAID_CDN_SRI}" crossorigin="anonymous">`)
    ).toBe(true);
  });

  it('pinned URL references the installed mermaid version', () => {
    const pkg = JSON.parse(readFileSync(MERMAID_PKG_PATH, 'utf8'));
    expect(pkg.version).toBe(MERMAID_CDN_URL.match(/mermaid@([^/]+)\//)?.[1]);
  });

  it('SRI hash matches the installed mermaid.min.js artifact', () => {
    const artifact = readFileSync(MERMAID_MIN_JS_PATH);
    const computed = 'sha384-' + createHash('sha384').update(artifact).digest('base64');
    expect(computed).toBe(MERMAID_CDN_SRI);
  });

  it('buildMermaidEmbedSnippet emits the pinned URL, hash, and initialize call', () => {
    const snippet = buildMermaidEmbedSnippet('flowchart TD\n  A --> B');
    expect(snippet).toContain(MERMAID_CDN_URL);
    expect(snippet).toContain(MERMAID_CDN_SRI);
    expect(snippet).toContain('mermaid.initialize({ startOnLoad: true });');
    expect(snippet).toContain('<div class="mermaid">\nflowchart TD\n  A --> B\n</div>');
    expect(snippet).toContain('crossorigin="anonymous"');
  });
});
