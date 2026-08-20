/* Us Push Service Worker
 *
 * Supports:
 * 1) local system notification test
 * 2) Firebase Cloud Messaging background push
 * 3) clicking a notification to reopen the correct Us screen
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url ||
    event.notification?.data?.FCM_MSG?.data?.url ||
    '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Ignore navigation failure and still focus the app.
            }
          }

          if ('focus' in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});

importScripts(
  'https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyB8UKUDstz0U5TdqUCSIhj1GFkuxiFg2cw',
  authDomain: 'gen-lang-client-0445953460.firebaseapp.com',
  projectId: 'gen-lang-client-0445953460',
  storageBucket: 'gen-lang-client-0445953460.firebasestorage.app',
  messagingSenderId: '322165688030',
  appId: '1:322165688030:web:1326472f21d3bd5393a44f',
});

firebase.messaging();