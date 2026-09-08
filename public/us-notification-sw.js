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

  const action = event.action;
  let targetUrl =
    event.notification?.data?.url ||
    event.notification?.data?.FCM_MSG?.data?.url ||
    '/';

  const isWakeUpAction = action === 'wake_up' || event.notification?.data?.autoCheckIn;

  if (action === 'wake_up') {
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}action=wake_up&autolog=1&ts=${Date.now()}`;
  } else if (action === 'snooze') {
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}action=snooze&ts=${Date.now()}`;
  }

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(async (clientList) => {
        for (const client of clientList) {
          // Notify active window client directly if possible
          if (isWakeUpAction && client.postMessage) {
            client.postMessage({
              type: 'US_WAKE_UP_CLICKED',
              action: action || 'wake_up',
              timestamp: Date.now(),
            });
          }

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

const messaging = firebase.messaging();

/*
 * Background push for installed PWA.
 * Server sends DATA-ONLY FCM messages; build the system notification here.
 */
messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};

  const title =
    data.title ||
    'Us 💕';

  const body =
    data.body ||
    'Bạn có thông báo mới.';

  const targetUrl =
    data.url ||
    '/';

  const isWakeUp =
    data.type === 'wake_up' ||
    data.type === 'wake_up_reminder' ||
    String(data.tag || '').includes('wake-up');

  const options = {
    body,
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    tag: data.tag || (isWakeUp ? `us-wake-up-${new Date().toISOString().slice(0, 10)}` : `us-${Date.now()}`),
    renotify: true,
    // Keeps notification pinned on lock screen so it's the first thing seen when turning on the phone
    requireInteraction: isWakeUp ? true : false,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: targetUrl,
      type: data.type,
      autoCheckIn: isWakeUp,
    },
  };

  if (isWakeUp) {
    options.actions = [
      {
        action: 'wake_up',
        title: '☀️ Đã dậy rồi',
        icon: '/icons/icon.png',
      },
      {
        action: 'snooze',
        title: '😴 10 phút nữa',
      },
    ];
  }

  return self.registration.showNotification(title, options);
});