// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBrVtSAOckpj8_fRA3-0kI7vAzOpXDUqxs",
  authDomain: "zynapse-68181.firebaseapp.com",
  projectId: "zynapse-68181",
  storageBucket: "zynapse-68181.firebasestorage.app",
  messagingSenderId: "841353050519",
  appId: "1:841353050519:web:3b16d95d8f4cd3b9506cd2",
  measurementId: "G-4764XLL6WS"
  // Note: databaseURL is not needed in service worker
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in focus/closed)
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'New message';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/zynaps.png',          // your app icon
    badge: '/zynaps.png',          // small badge icon (optional)
    data: payload.data,             // pass all custom data
    tag: payload.data?.chatId || 'default', // group notifications by chat
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click – open the app and navigate to the relevant chat/call
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Extract data from the notification
  const data = event.notification.data;
  let url = '/'; // fallback to home

  if (data) {
    if (data.chatId) {
      // For message notifications, open the specific chat
      url = `/?chatId=${data.chatId}`;
    } else if (data.callId) {
      // For call notifications, you might open the call screen
      url = `/?callId=${data.callId}`;
    }
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window/tab open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.focus();
          // Send a message to the client to navigate to the chat
          client.postMessage({ action: 'navigate', url });
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});
