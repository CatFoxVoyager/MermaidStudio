/**
 * Consent-denied GA4 loader (36-01, GA4-01) — the only GA4 injection site in
 * the bundle. Dynamically imported from App's post-mount effect; never a
 * static head tag.
 *
 * Posture (D-01): consent mode v2 with every storage permission defaulted to
 * its 'denied' value. Google-verbatim guarantee: with analytics_storage
 * denied, "No Analytics cookies are set, accessed, or read from the device"
 * — this is what keeps every pinned "cookieless" claim literally true.
 *
 * Ordering is the load-bearing mechanism: the consent default is queued onto
 * window.dataLayer BEFORE the gtag.js script element is appended and before
 * any js/config command. Google states "If your consent code is called out
 * of order, consent defaults won't work" (developers.google.com consent
 * guide).
 *
 * Designed no-op branches (zero script tags, dataLayer untouched): native
 * shell (isNativeShell), missing VITE_GA4_MEASUREMENT_ID (USR-01 not yet
 * done), malformed id (V5 format guard — the id is interpolated into a URL).
 */
import { isNativeShell } from '@/utils/platform';

const CONSENT_DEFAULT = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
} as const;

export function initGa4(): void {
  if (isNativeShell()) return;
  // Read inside the function — tests stub the env per case; a module-level
  // read would freeze the value before any stub applies.
  const id = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  if (!id) return;
  // V5 format guard: reject anything that is not a GA4 measurement id before
  // it reaches a script URL; encodeURIComponent wraps it as belt anyway.
  if (!/^G-[A-Z0-9]+$/.test(id)) return;
  // Idempotency: one script tag per page, ever.
  if (document.getElementById('ga4-script')) return;

  const w = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  const gtag = (...args: unknown[]): void => {
    w.dataLayer!.push(args);
  };
  w.gtag = gtag;

  // 1. Consent default — MUST precede the script append and js/config.
  gtag('consent', 'default', CONSENT_DEFAULT);

  // 2. The script tag: pinned host, anonymous CORS, async.
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.id = 'ga4-script';
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);

  // 3. js/config queue behind the consent default.
  gtag('js', new Date());
  gtag('config', id);
}
