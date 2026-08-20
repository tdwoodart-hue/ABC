import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
} from 'firebase/messaging';

import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  db,
  doc,
  setDoc,
  OUR_COUPLE_ID,
} from '../lib/firebase';
import {
  getOrCreateDeviceId,
  getStoredDeviceName,
} from './deviceHelper';

export type NotificationTestResult =
  | { ok: true; message: string; tokenRegistered?: boolean }
  | { ok: false; message: string; reason?: string };

export type PartnerNotificationType =
  | 'journal_new'
  | 'journal_comment'
  | 'image_comment'
  | 'memory_new'
  | 'status_note'
  | 'finance'
  | 'wake_up'
  | 'anniversary'
  | 'custom';

export interface PartnerNotificationPayload {
  type: PartnerNotificationType;
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
  tag?: string;
}

const PUSH_SW_PATH = '/us-notification-sw.js';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;

  const standaloneMedia =
    window.matchMedia?.('(display-mode: standalone)').matches ?? false;

  const navigatorStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return standaloneMedia || navigatorStandalone;
}

function getFirebaseApp() {
  return getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);
}

async function getNotificationRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Trình duyệt chưa hỗ trợ Service Worker.');
  }

  const registration = await navigator.serviceWorker.register(
    PUSH_SW_PATH,
    { scope: '/' }
  );

  await navigator.serviceWorker.ready;
  await registration.update().catch(() => undefined);

  return registration;
}

export async function enablePushNotifications(
  coupleId: string = OUR_COUPLE_ID
): Promise<NotificationTestResult> {
  if (typeof window === 'undefined') {
    return {
      ok: false,
      message: 'Thông báo chỉ hoạt động trên trình duyệt / điện thoại.',
      reason: 'no-window',
    };
  }

  if (!('Notification' in window)) {
    return {
      ok: false,
      message: 'Trình duyệt này chưa hỗ trợ Notification API.',
      reason: 'notification-unsupported',
    };
  }

  if (isIOS() && !isStandalonePWA()) {
    return {
      ok: false,
      message:
        'Trên iPhone, hãy mở Us từ icon đã Add to Home Screen rồi bật thông báo.',
      reason: 'ios-not-installed',
    };
  }

  const messagingSupported = await isSupported().catch(() => false);

  if (!messagingSupported) {
    return {
      ok: false,
      message: 'Thiết bị này chưa hỗ trợ Firebase Web Push.',
      reason: 'fcm-unsupported',
    };
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      ok: false,
      message:
        permission === 'denied'
          ? 'Quyền thông báo đang bị tắt. Hãy bật Notifications cho Us trong Cài đặt điện thoại.'
          : 'Bạn chưa cho phép thông báo.',
      reason: `permission-${permission}`,
    };
  }

  const user = auth.currentUser;

  if (!user) {
    return {
      ok: false,
      message: 'Hãy đăng nhập Us trước khi bật push notification.',
      reason: 'not-authenticated',
    };
  }

  try {
    const registration = await getNotificationRegistration();
    const messaging = getMessaging(getFirebaseApp());

    const vapidKey =
      (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY?.trim?.() || '';

    const tokenOptions: {
      serviceWorkerRegistration: ServiceWorkerRegistration;
      vapidKey?: string;
    } = {
      serviceWorkerRegistration: registration,
    };

    if (vapidKey) {
      tokenOptions.vapidKey = vapidKey;
    }

    const token = await getToken(messaging, tokenOptions);

    if (!token) {
      return {
        ok: false,
        message:
          'Đã cấp quyền nhưng Firebase chưa tạo được push token. Có thể cần Web Push VAPID key.',
        reason: 'empty-fcm-token',
      };
    }

    const deviceId = getOrCreateDeviceId();
    const deviceName =
      getStoredDeviceName() ||
      `${navigator.platform || 'Điện thoại'} · Us`;

    const tokenDocId = `${user.uid}_${deviceId}`;

    await setDoc(
      doc(
        db,
        'couples',
        coupleId,
        'push_tokens',
        tokenDocId
      ),
      {
        token,
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        deviceId,
        deviceName,
        userAgent: navigator.userAgent,
        enabled: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      ok: true,
      tokenRegistered: true,
      message: 'Đã bật push notification cho thiết bị này.',
    };
  } catch (error: any) {
    console.error('Enable push notification failed:', error);

    const rawMessage =
      error?.message ||
      error?.code ||
      String(error || '');

    const vapidHint =
      rawMessage.toLowerCase().includes('vapid') ||
      rawMessage.toLowerCase().includes('push service');

    return {
      ok: false,
      message: vapidHint
        ? 'Chưa tạo được FCM token. Cần thêm Web Push VAPID key của Firebase.'
        : `Không thể bật push: ${rawMessage}`,
      reason: vapidHint ? 'vapid-required' : 'fcm-token-error',
    };
  }
}

export async function requestAndShowTestNotification(): Promise<NotificationTestResult> {
  if (typeof window === 'undefined') {
    return {
      ok: false,
      message: 'Thông báo chỉ hoạt động trên trình duyệt / điện thoại.',
      reason: 'no-window',
    };
  }

  if (!('Notification' in window)) {
    return {
      ok: false,
      message: 'Trình duyệt này chưa hỗ trợ Notification API.',
      reason: 'notification-unsupported',
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      ok: false,
      message: 'Trình duyệt này chưa hỗ trợ Service Worker.',
      reason: 'service-worker-unsupported',
    };
  }

  if (isIOS() && !isStandalonePWA()) {
    return {
      ok: false,
      message:
        'Trên iPhone, hãy mở web từ icon đã Add to Home Screen rồi bấm thử lại.',
      reason: 'ios-not-installed',
    };
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      ok: false,
      message:
        permission === 'denied'
          ? 'Quyền thông báo đang bị tắt. Hãy bật Notifications cho Us trong Cài đặt điện thoại.'
          : 'Bạn chưa cho phép thông báo.',
      reason: `permission-${permission}`,
    };
  }

  const registration = await getNotificationRegistration();

  await registration.showNotification('Us 💕', {
    body: 'Thông báo thử đã hoạt động. Us có thể gửi notification như app.',
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    tag: 'us-notification-test',
    data: {
      url: '/',
    },
  });

  const remote = await enablePushNotifications().catch(() => null);

  return {
    ok: true,
    tokenRegistered: Boolean(remote?.ok && remote?.tokenRegistered),
    message:
      remote?.ok && remote.tokenRegistered
        ? 'Thông báo thử thành công + thiết bị đã đăng ký nhận push thật.'
        : 'Thông báo thử thành công. Push thật chưa đăng ký được token.',
  };
}

export async function sendPartnerNotification(
  payload: PartnerNotificationPayload
): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    console.warn('Skip push: no authenticated user.');
    return false;
  }

  try {
    const idToken = await user.getIdToken();

    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        coupleId: OUR_COUPLE_ID,
        ...payload,
        url: payload.url || '/',
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.warn(
        'Partner push failed:',
        response.status,
        details
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Partner push error:', error);
    return false;
  }
}