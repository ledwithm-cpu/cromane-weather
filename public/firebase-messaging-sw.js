// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAbgzfwQ3x0WhXtRvY5LABLPhl8sZDOOZA",
  authDomain: "cromane-weather.firebaseapp.com",
  projectId: "cromane-weather",
  storageBucket: "cromane-weather.firebasestorage.app",
  messagingSenderId: "594882967502",
  appId: "1:594882967502:web:9c7a49e8bf94d64c591d9f",
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