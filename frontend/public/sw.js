/* Public static assets only. Private pages, APIs and news HTML are never cached. */
const CACHE = 'up24-static-v1';
const MAX_ENTRIES = 48;
const MAX_BYTES = 1024 * 1024;
const PRIVATE = /^\/(?:api|admin|newsroom|account|saved)(?:\/|$)/;
const ASSET = /^\/(?:_next\/static|fonts|brand|icons)\//;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('up24-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function remember(request, response) {
  if (!response.ok || response.type !== 'basic' || !response.body) return;
  // Retain the original Response metadata instead of rebuilding a decoded body
  // with the network response's compressed Content-Length/Content-Encoding.
  const candidate = response.clone();
  const reader = response.clone().body.getReader();
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      void reader.cancel();
      void candidate.body.cancel();
      return;
    }
  }
  const cache = await caches.open(CACHE);
  await cache.put(request, candidate);
  const keys = await cache.keys();
  const removable = keys.filter(key => !key.url.endsWith('/offline.html') && !key.url.endsWith('/icons/icon-192.png'));
  while (removable.length > MAX_ENTRIES - 2) await cache.delete(removable.shift());
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error()));
    return;
  }
  if (!ASSET.test(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const stored = await caches.match(request);
    if (stored && url.pathname.startsWith('/_next/static/')) return stored;
    try {
      const response = await fetch(request);
      event.waitUntil(remember(request, response).catch(() => undefined));
      return response;
    } catch { return stored || Response.error(); }
  })());
});
