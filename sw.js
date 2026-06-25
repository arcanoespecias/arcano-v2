const SW_VERSION = 'v19';

self.addEventListener('install', function(event) {
  console.log('[Arcano SW] Installing ' + SW_VERSION);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[Arcano SW] Activating ' + SW_VERSION);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  if (url.hostname === 'api.github.com') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(response) {
          var clone = response.clone();
          caches.open('arcano-nav-' + SW_VERSION).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || new Response('Sin conexion', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(function(response) {
        var clone = response.clone();
        caches.open('arcano-assets-' + SW_VERSION).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || new Response('', { status: 404 });
        });
      })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_ALL') {
    caches.keys().then(function(keys) {
      keys.forEach(function(k) { caches.delete(k); });
    });
  }
});