// Service Worker for Zynapse PWA
const CACHE_NAME = 'zynapse-v1';
const urlsToCache = [
  '/',
  'index.html',
  'home.html',
  'zynaps.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://upload-widget.cloudinary.com/global/all.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      // Make network request
      return fetch(fetchRequest).then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Add to cache
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If offline and request is for HTML, return offline page
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/');
        }
        
        // For other requests, return cached version or nothing
        return caches.match(event.request);
      });
    })
  );
});

// Background sync for offline messages
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New message in Zynapse',
    icon: 'zynaps.png',
    badge: 'zynaps.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Zynapse'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Zynapse', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function for message sync
async function syncMessages() {
  // This would sync messages when back online
  console.log('Syncing messages...');
  // Implementation would depend on your Firebase setup
}
