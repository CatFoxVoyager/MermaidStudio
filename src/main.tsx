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

// Register Service Worker for PWA/offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently
    });

    // When a new SW takes control (skipWaiting + clients.claim), reload once
    // so the page picks up the latest assets instead of the stale cached ones.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Listen for sync complete events with origin validation
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SYNC_COMPLETE') {
        // Background sync completed
      }
    });
  });

  // Listen for online/offline events
  window.addEventListener('online', () => {
    document.body.classList.remove('offline');
  });

  window.addEventListener('offline', () => {
    document.body.classList.add('offline');
  });
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
