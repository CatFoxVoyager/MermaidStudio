const CACHE_NAME = 'mermaidstudio-v1';
const CACHE_VERSION = '2024-03-30';

// Core assets to cache immediately
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg'
];

// Cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// Nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Verify response origin matches expected origin
function isSameOrigin(requestUrl, responseUrl) {
  try {
    const req = new URL(requestUrl);
    const res = new URL(responseUrl);
    return req.origin === res.origin;
  } catch {
    return false;
  }
}

// Stratégie de cache optimisée pour offline + LLM local
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter :
  // - Les appels API locaux (Ollama, LM Studio, etc.)
  // - Les appels aux providers d'IA (fonctionnement en offline si local)
  if (request.method !== 'GET') return;

  const isLocalAPI = url.hostname === 'localhost' ||
                     url.hostname === '127.0.0.1' ||
                     url.hostname === 'host.docker.internal';

  const isAPI = url.pathname.startsWith('/api/') ||
                url.pathname.includes('/v1/');

  // Laisser passer les appels API (surtout locaux pour LLM)
  if (isLocalAPI || isAPI) {
    return;
  }

  // Only cache same-origin requests to prevent third-party cache poisoning
  if (!isSameOrigin(request.url, request.url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      // Cache hit → retourner le cache
      if (cached) {
        return cached;
      }

      // Cache miss → aller sur le réseau
      return fetch(request).then((response) => {
        // Ne pas mettre en cache si erreur ou non-200
        if (!response || response.status !== 200) {
          return response;
        }

        // Only cache same-origin responses to prevent integrity issues
        const responseUrl = response.url || request.url;
        if (!isSameOrigin(request.url, responseUrl)) {
          return response;
        }

        // Mettre en cache les assets statiques (same-origin only)
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // Offline → retourner la page offline pour les documents
        if (request.destination === 'document') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Background sync pour la sauvegarde offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-diagram') {
    event.waitUntil(syncDiagram());
  }
});

// Handle messages with origin validation
self.addEventListener('message', (event) => {
  // Validate message origin matches the app's origin
  const validOrigins = [self.location.origin];
  if (validOrigins.includes(event.origin)) {
    if (event.data?.type === 'SYNC_COMPLETE') {
      // Handle sync complete
    }
  }
});

async function syncDiagram() {
  // Synchroniser les diagrammes modifiés offline
  // Cette fonction serait appelée quand la connexion revient
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    // Only post to same-origin clients
    if (new URL(client.url).origin === self.location.origin) {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    }
  });
}
