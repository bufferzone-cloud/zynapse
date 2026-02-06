// Service Worker for Zynapse PWA
const CACHE_NAME = 'zynapse-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/home.html',
    '/chat.html',
    '/style.css',
    '/app.js',
    '/firebase-config.js',
    '/imagekit-config.js',
    '/zynaps.png',
    '/notification.mp3',
    '/icons/home.svg',
    '/icons/status.svg',
    '/icons/groups.svg',
    '/icons/requests.svg',
    '/icons/contacts.svg',
    '/icons/send.svg',
    '/icons/attach.svg',
    '/icons/copy.svg',
    '/icons/menu.svg',
    '/icons/search.svg'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Activate event
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
        })
    );
});

// Push notification event
self.addEventListener('push', event => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/zynaps.png',
        badge: '/zynaps.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
