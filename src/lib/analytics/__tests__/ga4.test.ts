// Behavioral contract for the consent-denied GA4 loader (36-01, GA4-01).
//
// RED-first: this file was written BEFORE src/lib/analytics/ga4.ts existed —
// the first run failed at collection with the module-resolution error naming
// the missing file (the plan-defined RED).
//
// Env-stub mechanism note: vi.stubEnv('VITE_GA4_MEASUREMENT_ID', …) DOES
// reach import.meta.env under this vitest 5 transform — probed when the
// happy-path test first went green (the loader's in-function
// import.meta.env read only sees the id through the stub; the no-op tests
// prove the unstubbed/absent path). No direct import.meta.env assignment
// was needed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initGa4 } from '@/lib/analytics/ga4';

// The four consent-mode v2 params, every storage permission denied
// (D-01). Deep-equal target for dataLayer[0]'s third element.
const CONSENT_DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

function scriptTags(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll('script'));
}

function dataLayer(): unknown[] | undefined {
  return (window as { dataLayer?: unknown[] }).dataLayer;
}

beforeEach(() => {
  document.head.innerHTML = '';
  delete (window as { dataLayer?: unknown }).dataLayer;
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { Capacitor?: unknown }).Capacitor;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('initGa4 (GA4-01 consent-denied loader)', () => {
  it('happy path: exactly one pinned-host anonymous script, consent entry at dataLayer[0] BEFORE js/config', () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-AB12CD34');

    initGa4();

    const scripts = scriptTags();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-AB12CD34'
    );
    expect(scripts[0].crossOrigin).toBe('anonymous');
    expect(scripts[0].async).toBe(true);
    expect(scripts[0].id).toBe('ga4-script');

    // Ordering is the load-bearing mechanism (Google-verbatim: consent code
    // called out of order means consent defaults do not work) — the consent
    // default entry must be index 0, before 'js' and 'config'.
    const dl = dataLayer();
    expect(dl).toBeDefined();
    expect(dl![0]).toEqual(['consent', 'default', CONSENT_DENIED]);
    expect((dl![1] as unknown[])[0]).toBe('js');
    expect((dl![2] as unknown[])[0]).toBe('config');
  });

  it('native shell no-op: zero script tags, dataLayer stays undefined', () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-AB12CD34');
    (window as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };

    initGa4();

    expect(scriptTags()).toHaveLength(0);
    expect(dataLayer()).toBeUndefined();
  });

  it('missing env no-op: zero script tags (designed no-op until USR-01)', () => {
    initGa4();

    expect(scriptTags()).toHaveLength(0);
    expect(dataLayer()).toBeUndefined();
  });

  it('malformed env no-op: the format guard rejects a non-measurement id', () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'not-a-valid-id');

    initGa4();

    expect(scriptTags()).toHaveLength(0);
    expect(dataLayer()).toBeUndefined();
  });

  it('idempotent: two sequential calls still inject exactly one script tag', () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-AB12CD34');

    initGa4();
    initGa4();

    expect(scriptTags()).toHaveLength(1);
  });
});
