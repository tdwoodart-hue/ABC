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

// Helper to get formatted VN time & date
function getVietnamTimeInfo() {
  const now = new Date();
  const vnDate = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const hours = String(vnDate.getHours()).padStart(2, '0');
  const minutes = String(vnDate.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}`;
  const yyyy = vnDate.getFullYear();
  const mm = String(vnDate.getMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;
  return { timeFormatted, dateKey, timestamp: now.getTime() };
}

// Store confirmed wake-up in Cache Storage so client can read it anytime
async function storeConfirmedWakeUp(data) {
  try {
    const cache = await caches.open('us-wake-up-store');
    await cache.put(
      new Request(`/wake-up-cta-${data.dateKey}`),
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (err) {
    console.warn('[SW] Could not store wake up in cache:', err);
  }
}

// Read cached auth info
async function getCachedAuth() {
  try {
    const cache = await caches.open('us-auth-cache');
    const response = await cache.match('/us-auth-token');
    if (response) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[SW] Error reading cached auth:', err);
  }
  return null;
}

// Background handler for CTA button "☀️ Đã dậy" (NO WINDOW OPENED)
async function handleWakeUpCtaClick(event) {
  const notifData = event.notification?.data || {};
  const { timeFormatted, dateKey, timestamp } = getVietnamTimeInfo();

  console.log(`[SW] Wake Up CTA clicked at ${timeFormatted} on ${dateKey}. Confirming without opening app...`);

  // 1. Show immediate confirmation notification on lock screen / notification shade
  try {
    await self.registration.showNotification('🎉 Đã xác nhận thức dậy!', {
      body: `☀️ Tuyệt vời! Đã ghi nhận bạn dậy lúc ${timeFormatted} thành công mà không cần vào app.`,
      icon: '/icons/icon.png',
      badge: '/icons/icon.png',
      tag: `us-wake-up-confirmed-${dateKey}`,
      renotify: true,
      vibrate: [150, 70, 150],
      data: { confirmed: true, time: timeFormatted, date: dateKey },
    });
  } catch (err) {
    console.warn('[SW] Error showing confirmation notification:', err);
  }

  // 2. Persist confirmed wake-up record in Cache Storage
  const authData = await getCachedAuth();
  const record = {
    dateKey,
    timeFormatted,
    timestamp,
    source: 'notification_cta',
    coupleId: notifData.coupleId || authData?.coupleId || 'our_couple',
    myUid: notifData.myUid || authData?.uid || '',
    myName: notifData.myName || authData?.displayName || 'Người ấy',
    partnerUid: notifData.partnerUid || authData?.partnerUid || '',
    partnerName: notifData.partnerName || authData?.partnerName || 'Bạn',
    confirmed: true,
    synced: false,
  };

  await storeConfirmedWakeUp(record);

  // 3. Notify any active window client in background
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      if (client.postMessage) {
        client.postMessage({
          type: 'US_WAKE_UP_CONFIRMED_VIA_CTA',
          ...record,
        });
      }
    }
  } catch (err) {
    console.warn('[SW] Error broadcasting to clients:', err);
  }

  // 4. Send background fetch to /api/wake-up-confirm
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authData?.idToken) {
      headers['Authorization'] = `Bearer ${authData.idToken}`;
    }

    await fetch('/api/wake-up-confirm', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        coupleId: record.coupleId,
        myUid: record.myUid,
        myName: record.myName,
        partnerUid: record.partnerUid,
        partnerName: record.partnerName,
        date: dateKey,
        timeFormatted,
        source: 'notification_cta',
        idToken: authData?.idToken,
      }),
    });
  } catch (err) {
    console.warn('[SW] Background fetch to /api/wake-up-confirm failed (will sync when app opens):', err);
  }
}

// Background handler for CTA button "😴 10 phút nữa" (NO WINDOW OPENED)
async function handleSnoozeCtaClick() {
  const { dateKey } = getVietnamTimeInfo();

  try {
    await self.registration.showNotification('😴 Đã hẹn báo lại sau 10 phút!', {
      body: 'Ngủ thêm xíu đi nè, 10 phút nữa Us sẽ nhắc lại nhé! ⏰',
      icon: '/icons/icon.png',
      badge: '/icons/icon.png',
      tag: 'us-snooze-notice',
    });
  } catch (err) {
    console.warn('[SW] Error showing snooze notice:', err);
  }

  // Schedule a reminder in 10 minutes
  setTimeout(async () => {
    try {
      await self.registration.showNotification('⏰ Hết 10 phút ngủ nướng rồi!', {
        body: 'Dậy thôi bạn ơi! ☀️ Bấm nút "Đã dậy" ngay bên dưới để xác nhận nha!',
        icon: '/icons/icon.png',
        badge: '/icons/icon.png',
        tag: `us-wake-up-${dateKey}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'wake_up', title: '☀️ Đã dậy' },
          { action: 'snooze', title: '😴 10 phút nữa' },
        ],
      });
    } catch (e) {
      console.warn('[SW] Error firing snoozed reminder:', e);
    }
  }, 10 * 60 * 1000);
}

// Handler when user taps the notification body itself (OPEN APP)
async function handleNotificationBodyClick(event) {
  let targetUrl =
    event.notification?.data?.url ||
    event.notification?.data?.FCM_MSG?.data?.url ||
    '/';

  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    if ('navigate' in client) {
      try {
        await client.navigate(targetUrl);
      } catch {
        // Ignore navigation failure
      }
    }
    if ('focus' in client) {
      return client.focus();
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;

  // Case 1: Clicked CTA button "☀️ Đã dậy" directly on notification banner
  // Confirms in background, DOES NOT OPEN THE APP!
  if (action === 'wake_up') {
    event.waitUntil(handleWakeUpCtaClick(event));
    return;
  }

  // Case 2: Clicked CTA button "😴 10 phút nữa"
  // Snoozes in background, DOES NOT OPEN THE APP!
  if (action === 'snooze') {
    event.waitUntil(handleSnoozeCtaClick());
    return;
  }

  // Case 3: Clicked the notification body itself -> Open/focus the app
  event.waitUntil(handleNotificationBodyClick(event));
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