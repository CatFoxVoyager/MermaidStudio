/**
 * Gated Google Fonts stylesheet injection (PERF-03).
 *
 * The old eager loop in App.tsx injected all 17 SUPPORTED_GOOGLE_FONTS
 * stylesheets at boot (17 network requests on top of the head link + the CSS
 * @import — audit F2). Fonts now load only on actual need: a persisted
 * non-default theme family resolved at boot, or an explicit font selection.
 *
 * Safety (threat register T-29-01): the ONLY way a link is created is a value
 * resolvable through findGoogleFont against the SUPPORTED_GOOGLE_FONTS
 * constant — there is no raw-URL parameter and no user-content-derived href.
 *
 * COEP (T-29-02): the app ships `Cross-Origin-Embedder-Policy: require-corp`;
 * an unqualified cross-origin stylesheet fetch fails silently under it, so
 * every injected link sets crossOrigin='anonymous' (the head link at
 * index.html:102 carries the same `crossorigin` attribute).
 */

import { findGoogleFont, type GoogleFont } from '@/constants/fonts';

// The index.html head link already ships both families (Inter 300-700 +
// JetBrains Mono 400;500, display=swap) — injecting a duplicate stylesheet
// for either would add a second Google Fonts request to every boot for zero
// new glyphs.
const HEAD_LINK_FAMILIES = new Set(['Inter', 'JetBrains Mono']);

/** Injects one family's stylesheet, deduped by the `font-<slug>` link id.
 * No loading-state cache: a failed load leaves no link, so the next call
 * retries (silent degrade to the fallback stack in the meantime). */
export function ensureGoogleFont(font: GoogleFont): void {
  const linkId = `font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) {
    return;
  }
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.url;
  link.crossOrigin = 'anonymous';
  // A failed fetch (offline boot, captive portal, Google 5xx) must leave no
  // element behind: the id dedup above would otherwise early-return on the
  // dead link for the rest of the session, and the documented retry-on-next-
  // call would never fire (WR-01). In-flight/succeeded loads keep the link,
  // so idempotency is unchanged.
  link.addEventListener('error', () => link.remove(), { once: true });
  document.head.appendChild(link);
}

/** Resolves a font-family string (persisted setting or selection value)
 * through the supported-fonts table and injects it when actually needed.
 * No-ops for nullish/unresolvable values and for the two families the
 * index.html head link already delivers. */
export function ensureGoogleFontsForFamily(
  familyValue: string | null | undefined,
): void {
  if (!familyValue) {
    return;
  }
  const font = findGoogleFont(familyValue);
  if (!font || HEAD_LINK_FAMILIES.has(font.name)) {
    return;
  }
  ensureGoogleFont(font);
}
