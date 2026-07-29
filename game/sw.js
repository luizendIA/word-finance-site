// Service worker do Word Finance Blocks.
// REGRA CRITICA: NUNCA cachear chamadas de API/checkout ("/api/"). Somente
// assets estaticos, com versao explicita — trocar CACHE_VERSION a cada release
// para nunca servir um checkout antigo.
const CACHE_VERSION = 'wfb-v0.4.4-third-person-raygun';
const STATIC_ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // API e tudo que nao for GET: sempre rede, nunca cache.
  if (event.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  // Assets: cache-first com atualizacao em segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    }),
  );
});
