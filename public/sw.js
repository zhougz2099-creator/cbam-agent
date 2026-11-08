/*
 * Offline shell for LightTodo. The app has no backend and stores data in
 * localStorage, so caching the built shell makes it fully usable offline.
 * Bump CACHE when the deployed shell changes.
 */
const CACHE = 'lighttodo-shell-v2';

async function precache() {
  const cache = await caches.open(CACHE);
  const htmlResponse = await fetch('/index.html', { cache: 'reload' });
  if (!htmlResponse.ok) throw new Error('Unable to fetch index.html');

  await cache.put('/index.html', htmlResponse.clone());
  await cache.put('/', htmlResponse.clone());

  const html = await htmlResponse.text();
  const assets = new Set(['/favicon.svg']);
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
    assets.add(match[1]);
  }

  await Promise.all(
    [...assets].map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      } catch {
        // A missing asset is surfaced as a broken offline shell, but install
        // must not fail: the app still works while online.
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match('/index.html', { ignoreVary: true })
            .then((cached) => cached || caches.match('/', { ignoreVary: true })),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
