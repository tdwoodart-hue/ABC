export type NotificationTestResult =
  | { ok: true; message: string }
  | { ok: false; message: string; reason?: string };

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

  const registration = await navigator.serviceWorker.register(
    '/us-notification-sw.js',
    { scope: '/' }
  );

  await registration.update().catch(() => undefined);

  await registration.showNotification('Us 💕', {
    body: 'Thông báo thử đã hoạt động. Sau bước này có thể nối Dương ↔ Chúc để nhận push thật.',
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    tag: 'us-notification-test',
    data: {
      url: '/profile',
    },
  });

  return {
    ok: true,
    message: 'Đã gửi notification thử ra điện thoại.',
  };
}