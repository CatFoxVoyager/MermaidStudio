import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query. Returns true while the query matches.
 *
 * Desktop-default: getServerSnapshot returns false so that pre-hydration paint
 * (and any hypothetical SSR) renders the desktop tree — preserving the current
 * desktop first paint with zero mobile flash. The client revalidates in an effect.
 *
 * @param query e.g. '(max-width: 767.98px)' for the mobile branch.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      // Defensive: jsdom without a matchMedia mock, or non-browser env.
      return () => {};
    }
    const mql = window.matchMedia(query);
    // Safari <14 used addListener/removeListener; modern browsers use addEventListener.
    // The project targets modern browsers (CodeMirror 6, Mermaid 11) — addEventListener is safe.
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  };

  const getSnapshot = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = (): boolean => false; // desktop-default

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
