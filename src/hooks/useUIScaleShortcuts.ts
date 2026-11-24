import { useEffect, useRef } from 'react';
import type { UIScaleApi } from '@/hooks/useUIScale';
import { interceptsBrowserZoomKeys, scaleShortcutModifier } from '@/utils/uiScale';

type ScaleShortcutAction = 'down' | 'up' | 'reset';

function actionForCode(code: string): ScaleShortcutAction | null {
  switch (code) {
    case 'Minus':
    case 'NumpadSubtract':
      return 'down';
    case 'Equal':
    case 'NumpadAdd':
      return 'up';
    case 'Digit0':
    case 'Numpad0':
      return 'reset';
    default:
      return null;
  }
}

/**
 * Global keyboard shortcuts for interface scale.
 *
 * Registers a capture-phase `keydown` listener on `window` with no
 * editable-target filter so shortcuts stay reachable while typing inside
 * inputs or CodeMirror. Uses `Alt` (Windows/Linux) or `Ctrl` (macOS, keeping
 * `Option+-` free for en-dash), plus `Ctrl`/`Cmd` when running as an
 * installed PWA outside the native shell.
 */
export function useUIScaleShortcuts(api: UIScaleApi): void {
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleKeyDown(event: KeyboardEvent) {
      const action = actionForCode(event.code);
      if (action === null) return;

      const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
      const primary = scaleShortcutModifier(ua);

      const matchesPrimary =
        primary === 'alt'
          ? event.altKey && !event.ctrlKey && !event.metaKey
          : event.ctrlKey && !event.metaKey && !event.altKey;

      const matchesBrowserZoom =
        !matchesPrimary &&
        interceptsBrowserZoomKeys() &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey;

      if (!matchesPrimary && !matchesBrowserZoom) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (action === 'down') {
        apiRef.current.stepDown();
      } else if (action === 'up') {
        apiRef.current.stepUp();
      } else {
        apiRef.current.reset();
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
