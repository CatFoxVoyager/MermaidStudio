/**
 * Single native-shell detection source (PROM-01).
 *
 * Duck-typed on purpose — both classic shortcuts are empirically wrong here:
 * - `!!window.Capacitor` false-positives: a WEB-mode Capacitor global (if
 *   @capacitor/core ever entered this bundle) defines
 *   `isNativePlatform: () => getPlatform() !== 'web'`, i.e. FALSE — presence
 *   alone says nothing. This repo deliberately does NOT bundle
 *   @capacitor/core; importing it would create the exact false-positive
 *   surface this util exists to avoid.
 * - UA sniffing false-negatives: the Android shell ships no `appendUserAgent`
 *   override, so the user agent is indistinguishable from mobile Chrome.
 *
 * The real native shell injects `window.Capacitor` (native-bridge.js ends
 * with `win.Capacitor = cap;`, `isNativePlatform = () => true`) BEFORE page
 * scripts, so a render-time duck call is stable inside the WebView and
 * `undefined → false` on the web.
 */
export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false; // SSR/jsdom guard
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}
