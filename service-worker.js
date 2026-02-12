// Zynapse Service Worker – v1.0
const CACHE_NAME = 'zynapse-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/zynapse/',
  '/zynapse/index.html',
  '/zynapse/manifest.json',
  '/zynapse/zynaps.png',
  // External resources (CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
  'https://upload-widget.cloudinary.com/global/all.js'
];

// Install event – cache all critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event – serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests like analytics, etc. (optional)
  // We'll handle all requests with a cache-first strategy for static assets,
  // and network-first for HTML navigation.

  const url = new URL(event.request.url);

  // For same-origin HTML navigation: try network first, then cache (offline fallback)
  if (event.request.mode === 'navigate' || 
      (url.pathname.endsWith('.html') && url.origin === location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Optionally cache the fresh HTML
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For all other requests (CSS, JS, images, CDN resources): cache-first
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache – fetch from network, then cache for future
        return fetch(event.request).then(networkResponse => {
          // Cache valid responses (ignore opaque responses if you wish)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(error => {
          // Optional: fallback for images, etc.
          console.error('Fetch failed:', error);
        });
      })
  );
});
