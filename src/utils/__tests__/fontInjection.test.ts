import { describe, it, expect, beforeEach } from 'vitest';
// PERF-03 gated font loading: Google Fonts stylesheets are injected ONLY on
// actual need (a persisted non-default family, or an explicit selection) —
// never eagerly at boot. jsdom + real document.head, no mocks: the util's
// entire surface is link creation in head, keyed by the `font-<slug>` id.
import {
  ensureGoogleFont,
  ensureGoogleFontsForFamily,
} from '@/utils/fontInjection';
import { SUPPORTED_GOOGLE_FONTS } from '@/constants/fonts';

// The two families the index.html head link already ships — they must never
// produce an injected link (kept in sync with HEAD_LINK_FAMILIES in the util).
const HEAD_LINK_FAMILIES = ['Inter', 'JetBrains Mono'];

// Test family picked dynamically (first supported entry NOT delivered by the
// head link) so this suite survives font-table edits.
const TEST_FONT = SUPPORTED_GOOGLE_FONTS.find(
  f => !HEAD_LINK_FAMILIES.includes(f.name),
)!;
const INTER = SUPPORTED_GOOGLE_FONTS.find(f => f.name === 'Inter')!;

function injectedLinks(): HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[id^="font-"]'));
}

describe('fontInjection (PERF-03 gated font loading)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('injects nothing before any call (default boot state)', () => {
    expect(injectedLinks()).toHaveLength(0);
  });

  it('appends exactly 1 COEP-qualified stylesheet link for a resolvable non-head-link family', () => {
    ensureGoogleFontsForFamily(TEST_FONT.family);
    const links = injectedLinks();
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(
      `font-${TEST_FONT.name.replace(/\s+/g, '-').toLowerCase()}`,
    );
    expect(links[0].rel).toBe('stylesheet');
    expect(links[0].href).toBe(TEST_FONT.url);
    // T-29-02: under COEP require-corp an unqualified cross-origin stylesheet
    // fetch fails silently — the attribute must ride every injected link.
    expect(links[0].crossOrigin).toBe('anonymous');
  });

  it('removes the link when the stylesheet fails to load, so the next call retries', () => {
    ensureGoogleFont(TEST_FONT);
    expect(injectedLinks()).toHaveLength(1);
    // A failed stylesheet fetch (offline boot, captive portal, Google 5xx)
    // fires `error` on the link element. WR-01: the failed link must leave
    // no element in head — otherwise the `font-<slug>` id dedup early-returns
    // on the dead link for the rest of the session.
    injectedLinks()[0].dispatchEvent(new Event('error'));
    expect(injectedLinks()).toHaveLength(0);
    // The next call (App boot effect re-run on theme change, font-picker
    // change) must actually retry: re-create the link with the same url.
    ensureGoogleFont(TEST_FONT);
    expect(injectedLinks()).toHaveLength(1);
    expect(injectedLinks()[0].href).toBe(TEST_FONT.url);
  });

  it('is idempotent under repeat and same-tick double calls (id dedup, no cache)', () => {
    ensureGoogleFontsForFamily(TEST_FONT.family);
    ensureGoogleFontsForFamily(TEST_FONT.family);
    ensureGoogleFont(TEST_FONT);
    expect(injectedLinks()).toHaveLength(1);
  });

  it('injects nothing for the default Inter stack (head-link family)', () => {
    ensureGoogleFontsForFamily(INTER.family);
    expect(injectedLinks()).toHaveLength(0);
  });

  it('injects nothing for the other head-link family (JetBrains Mono)', () => {
    const jbm = SUPPORTED_GOOGLE_FONTS.find(f => f.name === 'JetBrains Mono')!;
    ensureGoogleFontsForFamily(jbm.family);
    expect(injectedLinks()).toHaveLength(0);
  });

  it('injects nothing for unresolvable or empty values (T-29-01: no raw-URL path)', () => {
    ensureGoogleFontsForFamily('Comic Sans Ultimate, cursive');
    ensureGoogleFontsForFamily('');
    ensureGoogleFontsForFamily(null);
    ensureGoogleFontsForFamily(undefined);
    expect(injectedLinks()).toHaveLength(0);
  });
});
