import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { inject } from '@vercel/analytics';
import App from './App.tsx';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import i18n from './i18n/config.ts';
import './index.css';

// Initialize Vercel Analytics
inject();

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Service worker registration + "new version" prompt is owned by
    // <ServiceWorkerUpdateToast /> (it holds the registration so it can detect
    // updates and prompt before reloading, avoiding surprise reloads mid-edit).

    // Listen for sync complete events with origin validation
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SYNC_COMPLETE') {
        // Background sync completed
      }
    });
  });

  // No offline banner: the app is fully client-side (IndexedDB + local
  // inference), it works identically offline — an "offline mode" notice would
  // only spread anxiety (critique iter-2 P3: stale copy naming providers that
  // were never wired in).
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </ErrorBoundary>
  </StrictMode>
);
