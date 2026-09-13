/**
 * Single source of truth for the CDN embed snippet's mermaid version pin and
 * SRI integrity hash. Used by ExportModal's "copy embed code" action.
 *
 * The standalone browser fixture `scripts/verify-cdn-embed.html` must carry
 * the exact same URL and integrity hash —
 * `src/constants/__tests__/cdnEmbed.test.ts` enforces that the two stay in
 * sync and that the hash really matches the pinned version's
 * `node_modules/mermaid/dist/mermaid.min.js` artifact.
 *
 * When bumping mermaid:
 *  1. Update MERMAID_CDN_VERSION below (and package.json).
 *  2. Recompute the SRI hash over the installed artifact, e.g.:
 *     node -e "const c=require('crypto'),fs=require('fs');console.log('sha384-'+c.createHash('sha384').update(fs.readFileSync('node_modules/mermaid/dist/mermaid.min.js')).digest('base64'))"
 *  3. Update MERMAID_CDN_SRI and scripts/verify-cdn-embed.html.
 * The test will fail until every copy agrees — browsers hard-block
 * SRI-mismatched scripts, so a stale hash silently breaks pasted embeds.
 */
export const MERMAID_CDN_VERSION = '12.0.0';

export const MERMAID_CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_CDN_VERSION}/dist/mermaid.min.js`;

export const MERMAID_CDN_SRI =
  'sha384-xzghz1GQ5u9HCpVskeDPqMsdogD1yvuMQbEK53+wi+G70+6J1AG0L2cfi9PHjDWI';

const MERMAID_CDN_BUMP_NOTE =
  '<!-- version tag and integrity hash must be bumped together manually — exact pin, hash valid only for this exact version -->';

/**
 * Build the standalone embed snippet for a diagram's source text.
 * Byte-for-byte the same markup as `scripts/verify-cdn-embed.html` (which the
 * cdnEmbed test enforces), so what users paste is what the fixture verifies.
 */
export function buildMermaidEmbedSnippet(diagramContent: string): string {
  return `<div class="mermaid">
${diagramContent}
</div>
${MERMAID_CDN_BUMP_NOTE}
<script src="${MERMAID_CDN_URL}" integrity="${MERMAID_CDN_SRI}" crossorigin="anonymous"></script>
<script>mermaid.initialize({ startOnLoad: true });</script>`;
}
