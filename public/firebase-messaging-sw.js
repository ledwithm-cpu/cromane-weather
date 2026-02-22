// Firebase Cloud Messaging Service Worker
// This file must be at the root of the public directory

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config will be injected when the app registers this SW
// For now, handle background messages with defaults
firebase.initializeApp({
  // These will be populated by the main app's postMessage
  apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
  projectId: self.__FIREBASE_CONFIG__?.projectId || '',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
  appId: self.__FIREBASE_CONFIG__?.appId || '',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const title = payload.notification?.title || '⚡ Cromane Watch';
  const options = {
    body: payload.notification?.body || 'Weather alert for Cromane.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.notification_type || 'cromane-alert',
    renotify: true,
    vibrate: [200, 100, 200],
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
