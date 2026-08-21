import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  register,
  unregister,
} from 'firebase/messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { deleteInstallations, getInstallations } from 'firebase/installations';

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

const PUSH_FID_RESET_MIGRATION_KEY =
  'us_push_fid_reset_2026_08_v1';


let foregroundListenerStarted = false;
let automaticPushBootstrapStarted = false;

async function showForegroundSystemNotification(
  title: string,
  body: string,
  url: string = '/'
): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  try {
    const registration = await getNotificationRegistration();

    await registration.showNotification(title || 'Us 💕', {
      body,
      icon: '/icons/icon.png',
      badge: '/icons/icon.png',
      tag: `us-foreground-${Date.now()}`,
      data: { url },
    });
  } catch (error) {
    console.warn('Unable to show foreground notification:', error);
  }
}

async function startForegroundPushListener(): Promise<void> {
  if (foregroundListenerStarted) return;

  const supported = await isSupported().catch(() => false);
  if (!supported) return;

  try {
    const messaging = getMessaging(getFirebaseApp());

    onMessage(messaging, (payload) => {
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'Us 💕';

      const body =
        payload.notification?.body ||
        payload.data?.body ||
        'Bạn có thông báo mới.';

      const url =
        payload.data?.url || '/';

      void showForegroundSystemNotification(
        title,
        body,
        url
      );
    });

    foregroundListenerStarted = true;
  } catch (error) {
    console.warn('Unable to start foreground FCM listener:', error);
  }
}


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


async function registerAndWaitForFreshFid(
  messaging: ReturnType<typeof getMessaging>,
  registration: ServiceWorkerRegistration,
  vapidKey: string
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let fid = '';
    let registerFinished = false;
    let settled = false;

    const finishIfReady = () => {
      if (
        settled ||
        !registerFinished ||
        !fid
      ) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      unsubscribeRegistered();
      resolve(fid);
    };

    const unsubscribeRegistered = onRegistered(
      messaging,
      (installationId) => {
        fid = installationId || '';
        finishIfReady();
      }
    );

    const timeout = window.setTimeout(() => {
      if (settled) return;

      settled = true;
      unsubscribeRegistered();
      reject(
        new Error(
          'Timed out waiting for a confirmed Firebase Installation ID registration.'
        )
      );
    }, 20000);

    const options: {
      serviceWorkerRegistration: ServiceWorkerRegistration;
      vapidKey?: string;
    } = {
      serviceWorkerRegistration: registration,
    };

    if (vapidKey) {
      options.vapidKey = vapidKey;
    }

    register(messaging, options)
      .then(() => {
        registerFinished = true;
        finishIfReady();
      })
      .catch((error) => {
        if (settled) return;

        settled = true;
        window.clearTimeout(timeout);
        unsubscribeRegistered();
        reject(error);
      });
  });
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

    /*
     * Wait for BOTH:
     * - register() to finish successfully
     * - onRegistered() to return the confirmed FID
     *
     * This prevents saving a cached/stale FID before FCM registration
     * has actually completed on Safari/iPhone.
     */
    const fid = await registerAndWaitForFreshFid(
      messaging,
      registration,
      vapidKey
    );

    const deviceId = getOrCreateDeviceId();
    const deviceName =
      getStoredDeviceName() ||
      `${navigator.platform || 'Điện thoại'} · Us`;

    const registrationDocId = `${user.uid}_${deviceId}`;

    await setDoc(
      doc(
        db,
        'couples',
        coupleId,
        'push_tokens',
        registrationDocId
      ),
      {
        fid,
        // Clear the legacy token by replacing it with an empty value.
        // Backend V8 ignores legacy token whenever a FID is present.
        token: '',
        registrationMode: 'fid',
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
      message: 'Đã đăng ký FID push cho thiết bị này.',
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



export async function resetPushRegistrationOnce(
  coupleId: string = OUR_COUPLE_ID
): Promise<NotificationTestResult> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return {
      ok: false,
      message: 'Chưa có quyền notification để reset FID.',
      reason: 'permission-not-granted',
    };
  }

  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    /*
     * Remove the old FCM registration first.
     * It is fine if it was already invalid/deleted server-side.
     */
    await unregister(messaging).catch((error) => {
      console.warn(
        'Old FCM registration could not be unregistered; continuing with FID reset:',
        error
      );
    });

    /*
     * Delete the Firebase Installation itself so Firebase must create
     * a completely new FID. This is a one-time migration after the
     * old iPhone registration repeatedly returned INVALID_ARGUMENT.
     */
    await deleteInstallations(
      getInstallations(app)
    );

    const result =
      await enablePushNotifications(coupleId);

    if (result.ok) {
      window.localStorage.setItem(
        PUSH_FID_RESET_MIGRATION_KEY,
        'done'
      );
    }

    return result;
  } catch (error: any) {
    console.error(
      'One-time FID reset failed:',
      error
    );

    return {
      ok: false,
      message:
        error?.message ||
        'Không thể tạo FID mới.',
      reason: 'fid-reset-failed',
    };
  }
}

export async function ensurePushNotificationsSilently(
  coupleId: string = OUR_COUPLE_ID
): Promise<NotificationTestResult> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return {
      ok: false,
      message: 'Notification API chưa sẵn sàng.',
      reason: 'notification-unavailable',
    };
  }

  /*
   * IMPORTANT:
   * Never trigger a permission prompt automatically.
   * The user grants permission once from the explicit button.
   * After that, every app launch silently refreshes/saves the FCM token.
   */
  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      message:
        Notification.permission === 'denied'
          ? 'Quyền thông báo đang bị tắt.'
          : 'Chưa bật thông báo.',
      reason: `permission-${Notification.permission}`,
    };
  }

  const result = await enablePushNotifications(coupleId);

  if (result.ok) {
    await startForegroundPushListener();
  }

  return result;
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
        ? 'Thông báo thử thành công + thiết bị đã đăng ký FID push thật.'
        : 'Thông báo thử thành công. Push thật chưa đăng ký được FID.',
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

    const result = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      console.warn(
        'Partner push failed:',
        response.status,
        result
      );
      return false;
    }

    if (
      result &&
      typeof result.sent === 'number' &&
      result.sent === 0
    ) {
      console.warn(
        'Partner push was accepted but no partner token was available:',
        result
      );
      return false;
    }

    console.info('Partner push result:', result);
    return true;
  } catch (error) {
    console.warn('Partner push error:', error);
    return false;
  }
}

/*
 * Automatic push bootstrap.
 *
 * The permission prompt is NEVER shown here.
 * If the user already granted notifications once, opening Us automatically:
 * 1) refreshes/saves the current FCM token
 * 2) starts the foreground notification listener
 *
 * This removes the need to press "Bật & thử" on every visit.
 */
if (
  typeof window !== 'undefined' &&
  !automaticPushBootstrapStarted
) {
  automaticPushBootstrapStarted = true;

  onAuthStateChanged(auth, (user) => {
    if (
      !user ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const needsOneTimeFidReset =
      window.localStorage.getItem(
        PUSH_FID_RESET_MIGRATION_KEY
      ) !== 'done';

    const registrationTask =
      needsOneTimeFidReset
        ? resetPushRegistrationOnce()
        : ensurePushNotificationsSilently();

    void registrationTask.then((result) => {
      if (!result.ok) {
        console.warn(
          needsOneTimeFidReset
            ? 'One-time FID reset did not complete:'
            : 'Automatic push registration did not complete:',
          result
        );
      }
    });
  });
}
