const CACHE = 'arcano-v34';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      // Delete ALL old caches (not just different name)
      return Promise.all(
        keys.map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Never cache API calls or Firebase
  var url = e.request.url;
  if (url.indexOf('firebaseio.com') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('gstatic.com') !== -1 ||
      url.indexOf('githubusercontent') !== -1) {
    e.respondWith(fetch(e.request).catch(function() { return new Response('', {status: 503}); }));
    return;
  }

  // Network first, cache fallback
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(response => {
      if (response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(e.request).then(function(cached) {
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});