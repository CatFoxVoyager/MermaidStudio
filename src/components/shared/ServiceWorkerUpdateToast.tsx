import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

/**
 * Detects when a new Service Worker version has been downloaded and prompts the
 * user to reload — instead of auto-reloading (which could interrupt an edit).
 *
 * Flow:
 *   1. On mount, registers /sw.js (idempotent).
 *   2. When a new SW finishes installing (state 'installed') and is waiting,
 *      shows a toast: "A new version is available — Reload".
 *   3. On click, posts { type: 'SKIP_WAITING' } to the waiting SW; the SW then
 *      activates, fires 'controllerchange', and this component reloads once.
 *
 * Note: even without this prompt, the network-first navigation strategy in
 * sw.js prevents the blank-screen-on-deploy bug — this toast is the UX layer.
 */
export function ServiceWorkerUpdateToast() {
  const { t } = useTranslation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registrationRef.current = reg;

        // An update may already be waiting when the page loads
        if (reg.waiting) setUpdateAvailable(true);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            // 'installed' + an existing controller means a new version is ready
            // (the very first install has no controller yet — not an update).
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed silently — app still works online.
      });

    // When the waiting SW takes control (after SKIP_WAITING), reload once.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    });
  }, []);

  const handleReload = () => {
    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // No waiting worker (edge case) — just reload.
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="sw-update-toast"
      className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl max-md:bottom-20 max-md:mx-4 max-md:left-auto max-md:translate-x-0 max-md:w-[calc(100%-2rem)]"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--accent)',
        color: 'var(--text-primary)',
      }}
    >
      <span className="text-sm">
        {t('update.available', 'A new version is available.')}
      </span>
      <button
        type="button"
        onClick={handleReload}
        className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
        style={{ background: 'var(--accent)' }}
      >
        <RefreshCw size={14} />
        {t('update.reload', 'Reload')}
      </button>
    </div>
  );
}
