import React, { useEffect, useMemo, useRef, useState } from 'react';
import { runTransaction } from 'firebase/firestore';

import { UserProfile, CoupleData, WakeUpLog } from '../types';
import { db, doc, collection, setDoc } from '../lib/firebase';
import {
  Sun,
  Award,
  Clock,
  Sparkles,
  Coffee,
  CheckCircle2,
  ChevronRight,
  Bell,
  Settings2,
  Send,
  Smartphone,
  X,
  Shuffle,
  Check,
  Loader2,
  Volume2,
} from 'lucide-react';
import { formatDateShortVN } from '../utils/formatDate';
import { sendPartnerNotification, showLocalWakeUpReminderNotification } from '../utils/notifications';
import { buildWakeUpNotification, buildWakeUpReminderNotification } from '../utils/notificationEvents';

export interface WakeUpReminderSettings {
  enabled: boolean;
  mode: 'early_540' | 'random_morning' | 'fixed_630' | 'custom';
  customTime: string;
  keepOnLockscreen: boolean;
}

const DEFAULT_REMINDER_SETTINGS: WakeUpReminderSettings = {
  enabled: true,
  mode: 'early_540',
  customTime: '05:40',
  keepOnLockscreen: true,
};

const SETTINGS_STORAGE_KEY = 'us_wakeup_reminder_settings_v1';
const LAST_REMINDER_SENT_KEY = 'us_wakeup_reminder_last_sent_date';

// Deterministically compute random minutes between 05:40 and 06:30 for a given date
const getRandomMorningMinutesForDate = (dateStr: string): number => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const minOffset = Math.abs(hash) % 51; // 0..50
  return 340 + minOffset; // 340 = 05:40, 390 = 06:30
};

const getScheduledReminderMinutes = (
  settings: WakeUpReminderSettings,
  dateStr: string
): number => {
  if (settings.mode === 'early_540') return 5 * 60 + 40; // 05:40
  if (settings.mode === 'fixed_630') return 6 * 60 + 30; // 06:30
  if (settings.mode === 'random_morning') return getRandomMorningMinutesForDate(dateStr);
  if (settings.mode === 'custom' && settings.customTime) {
    const parts = settings.customTime.split(':').map(Number);
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
  }
  return 5 * 60 + 40;
};

const formatMinutesToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

interface WakeUpChallengeCardProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  todayLog: WakeUpLog | null;
  allLogs?: WakeUpLog[];
  onNavigateToFinance?: () => void;
  compact?: boolean;
}

type WakeCheckInResult =
  | 'winner'
  | 'second'
  | 'already';

const AUTO_WAKE_START_MINUTES = 5 * 60 + 30; // 05:30
const AUTO_WAKE_END_MINUTES = 12 * 60; // before 12:00

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getMinutesSinceMidnight = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

const isInsideAutoWakeWindow = (date: Date): boolean => {
  const minutes = getMinutesSinceMidnight(date);

  return (
    minutes >= AUTO_WAKE_START_MINUTES &&
    minutes < AUTO_WAKE_END_MINUTES
  );
};

const isBeforeWakeStart = (date: Date): boolean =>
  getMinutesSinceMidnight(date) < AUTO_WAKE_START_MINUTES;

export const WakeUpChallengeCard: React.FC<
  WakeUpChallengeCardProps
> = ({
  userProfile,
  coupleData,
  todayLog,
  allLogs = [],
  onNavigateToFinance,
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] =
    useState(false);

  /*
   * React StrictMode can mount/effect twice in development.
   * Firestore transaction already guarantees correctness, but this
   * prevents needless duplicate calls from the same mounted card.
   */
  const autoAttemptKeyRef = useRef('');

  // Determine current partner vs me
  const currentUserIsUser1 =
    coupleData?.user1Uid === userProfile.uid ||
    coupleData?.user1Id === userProfile.uid ||
    userProfile.email
      ?.toLowerCase()
      .includes('duong');

  const myUid = userProfile.uid;

  const myName =
    userProfile.displayName ||
    (currentUserIsUser1 ? 'Dương' : 'Chúc Gà');

  const partnerUid = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Uid ||
        coupleData.user2Id
      : coupleData.user1Uid ||
        coupleData.user1Id
    : null;

  let rawPartnerName = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Name || 'Chúc Gà'
      : coupleData.user1Name || 'Dương'
    : currentUserIsUser1
      ? 'Chúc Gà'
      : 'Dương';

  if (
    rawPartnerName.trim() === myName.trim()
  ) {
    rawPartnerName = currentUserIsUser1
      ? 'Chúc Gà'
      : 'Dương';
  }

  const partnerName = rawPartnerName;

  /*
   * IMPORTANT:
   * Do NOT use new Date().toISOString().split('T')[0] here.
   * At 05:30 in Vietnam it can still be the PREVIOUS UTC date.
   */
  const todayStr = getLocalDateKey(new Date());

  const currentTimeStr =
    new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  // Wake-up Reminder Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [sendingNudge, setSendingNudge] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);

  const [reminderSettings, setReminderSettings] = useState<WakeUpReminderSettings>(() => {
    if (coupleData?.wakeUpReminderSettings) {
      return {
        enabled: coupleData.wakeUpReminderSettings.enabled ?? true,
        mode: coupleData.wakeUpReminderSettings.mode ?? 'early_540',
        customTime: coupleData.wakeUpReminderSettings.customTime ?? '05:40',
        keepOnLockscreen: coupleData.wakeUpReminderSettings.keepOnLockscreen ?? true,
      };
    }
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_REMINDER_SETTINGS;
  });

  const [tempSettings, setTempSettings] = useState<WakeUpReminderSettings>(reminderSettings);

  // Keep modal temp settings in sync when opening
  useEffect(() => {
    if (showSettingsModal) {
      setTempSettings(reminderSettings);
    }
  }, [showSettingsModal, reminderSettings]);

  // Sync if coupleData updates from partner
  useEffect(() => {
    if (coupleData?.wakeUpReminderSettings) {
      const synced: WakeUpReminderSettings = {
        enabled: coupleData.wakeUpReminderSettings.enabled ?? true,
        mode: coupleData.wakeUpReminderSettings.mode ?? 'early_540',
        customTime: coupleData.wakeUpReminderSettings.customTime ?? '05:40',
        keepOnLockscreen: coupleData.wakeUpReminderSettings.keepOnLockscreen ?? true,
      };
      setReminderSettings(synced);
    }
  }, [coupleData?.wakeUpReminderSettings]);

  // Auto clear notification toast
  useEffect(() => {
    if (!notificationToast) return;
    const timer = window.setTimeout(() => setNotificationToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notificationToast]);

  const todayScheduledMinutes = useMemo(
    () => getScheduledReminderMinutes(reminderSettings, todayStr),
    [reminderSettings, todayStr]
  );
  const todayScheduledTimeStr = formatMinutesToTime(todayScheduledMinutes);

  const getModeLabel = (settings: WakeUpReminderSettings) => {
    switch (settings.mode) {
      case 'early_540':
        return '05:40 (Sớm hẳn)';
      case 'random_morning':
        return `Ngẫu nhiên (~${todayScheduledTimeStr})`;
      case 'fixed_630':
        return '06:30 (Đúng giờ)';
      case 'custom':
        return settings.customTime || 'Tự chọn';
      default:
        return '05:40';
    }
  };

  const performWakeUpCheckIn = async (
    source: 'auto' | 'manual'
  ): Promise<WakeCheckInResult | null> => {
    if (
      !userProfile.coupleId ||
      !myUid ||
      loading
    ) {
      return null;
    }

    const now = new Date();

    /*
     * Before 05:30 we deliberately do NOT count a wake-up.
     * Someone may simply still be awake from the previous night.
     */
    if (
      source === 'manual' &&
      isBeforeWakeStart(now)
    ) {
      alert(
        'Thử thách dậy sớm bắt đầu từ 05:30 nhé!'
      );
      return null;
    }

    setLoading(true);

    try {
      const localDate = getLocalDateKey(now);

      const timeFormatted =
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

      const targetLoserUid =
        partnerUid ||
        (currentUserIsUser1
          ? 'user2'
          : 'user1');

      const targetLoserName =
        partnerName;

      const logRef = doc(
        db,
        'couples',
        userProfile.coupleId,
        'wakeUpLogs',
        localDate
      );

      /*
       * Generate the finance document reference BEFORE the transaction.
       * The same ref is reused if Firestore retries the transaction.
       */
      const financeDocRef = doc(
        collection(
          db,
          'couples',
          userProfile.coupleId,
          'finances'
        )
      );

      const result =
        await runTransaction(
          db,
          async (
            transaction
          ): Promise<WakeCheckInResult> => {
            const logSnapshot =
              await transaction.get(logRef);

            /*
             * First person today:
             * write BOTH wake log + 5k finance record atomically.
             *
             * If both phones open together, one transaction wins.
             * The other transaction is retried and becomes "second".
             */
            if (!logSnapshot.exists()) {
              const createdAt =
                now.toISOString();

              transaction.set(
                financeDocRef,
                {
                  title: `Phạt dậy muộn ${formatDateShortVN(
                    localDate
                  )} (${targetLoserName})`,
                  amount: 5000,
                  type: 'income',
                  category:
                    'Đóng quỹ chung',
                  paidByUid:
                    targetLoserUid,
                  paidByName:
                    targetLoserName,
                  date: localDate,
                  createdAt,
                  note: `☀️ ${myName} dậy sớm lúc ${timeFormatted} nên ${targetLoserName} đóng phạt 5.000đ vào quỹ`,
                  source:
                    'wake-up-challenge',
                }
              );

              transaction.set(
                logRef,
                {
                  id: localDate,
                  date: localDate,
                  winnerUid: myUid,
                  winnerName: myName,
                  winnerTime:
                    timeFormatted,
                  winnerSource: source,
                  loserUid:
                    targetLoserUid,
                  loserName:
                    targetLoserName,
                  fineAmount: 5000,
                  finePaid: true,
                  transactionId:
                    financeDocRef.id,
                  createdAt,
                }
              );

              return 'winner';
            }

            const existing =
              logSnapshot.data();

            if (
              existing.winnerUid ===
              myUid
            ) {
              return 'already';
            }

            /*
             * Second person:
             * Opening the app is enough to record their wake-up time.
             * The winner / finance record is NOT touched.
             */
            if (
              !existing.loserWokeUpAt
            ) {
              transaction.update(
                logRef,
                {
                  loserWokeUpAt:
                    timeFormatted,
                  loserWakeSource:
                    source,
                  loserActualUid:
                    myUid,
                }
              );

              return 'second';
            }

            return 'already';
          }
        );

      if (result === 'winner') {
        setShowCelebration(true);

        const notificationTime =
          now.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });

        void sendPartnerNotification(
          buildWakeUpNotification({
            winnerName: myName,
            winnerTime: notificationTime,
            loserName: targetLoserName,
            fineAmount: 5000,
          })
        );

        window.setTimeout(
          () =>
            setShowCelebration(
              false
            ),
          3500
        );
      }

      return result;
    } catch (err) {
      console.error(
        source === 'auto'
          ? 'Lỗi tự động điểm danh dậy sớm:'
          : 'Lỗi điểm danh dậy sớm:',
        err
      );

      /*
       * Automatic background behavior should never interrupt the user.
       * Manual actions still show feedback.
       */
      if (source === 'manual') {
        alert(
          'Không thể ghi nhận điểm danh dậy sớm. Vui lòng thử lại!'
        );
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  // Manual fallback
  const handleCheckInWakeUp =
    async () => {
      await performWakeUpCheckIn(
        'manual'
      );
    };

  // Manual fallback for second person
  const handleSecondPersonWakeUp =
    async () => {
      await performWakeUpCheckIn(
        'manual'
      );
    };

  /*
   * AUTO CHECK-IN
   *
   * 05:30–11:59 local time:
   * - app opens on Home -> auto check-in
   * - PWA/browser returns from background -> auto check-in
   * - first person = winner + 5k fine
   * - second person = loserWokeUpAt
   */
  useEffect(() => {
    if (
      !userProfile.coupleId ||
      !myUid
    ) {
      return;
    }

    const tryAutoCheckIn =
      () => {
        const now =
          new Date();

        if (
          !isInsideAutoWakeWindow(
            now
          )
        ) {
          return;
        }

        const localDate =
          getLocalDateKey(now);

        const attemptKey = `${localDate}:${myUid}`;

        if (
          autoAttemptKeyRef.current ===
          attemptKey
        ) {
          return;
        }

        autoAttemptKeyRef.current =
          attemptKey;

        void performWakeUpCheckIn(
          'auto'
        );
      };

    /*
     * Let auth/couple props settle first.
     */
    const initialTimer =
      window.setTimeout(
        tryAutoCheckIn,
        250
      );

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          /*
           * Allow another server check after a real app resume.
           * Transaction makes it idempotent.
           */
          autoAttemptKeyRef.current =
            '';
          tryAutoCheckIn();
        }
      };

    const handleFocus = () => {
      autoAttemptKeyRef.current =
        '';
      tryAutoCheckIn();
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    window.addEventListener(
      'focus',
      handleFocus
    );

    return () => {
      window.clearTimeout(
        initialTimer
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );

      window.removeEventListener(
        'focus',
        handleFocus
      );
    };
  }, [
    userProfile.coupleId,
    myUid,
    partnerUid,
    partnerName,
    currentUserIsUser1,
  ]);

  /*
   * Handle interactive push notification clicks:
   * 1. URL search params: ?action=wake_up or ?action=snooze
   * 2. Service Worker postMessage event (when PWA tab is already active)
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action === 'wake_up') {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('action');
      cleanUrl.searchParams.delete('autolog');
      cleanUrl.searchParams.delete('ts');
      window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));

      void performWakeUpCheckIn('manual').then((res) => {
        if (res === 'winner') {
          setNotificationToast('🎉 Chào buổi sáng! Bạn đã dậy sớm nhất hôm nay!');
        } else if (res === 'second') {
          setNotificationToast('☀️ Chào buổi sáng! Đã ghi nhận bạn thức dậy.');
        } else if (res === 'already') {
          setNotificationToast('☀️ Bạn đã điểm danh hôm nay rồi!');
        }
      });
    } else if (action === 'snooze') {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('action');
      cleanUrl.searchParams.delete('ts');
      window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));

      setNotificationToast('😴 Đã hẹn báo lại sau 10 phút nhé, ngủ thêm xíu đi nè!');

      window.setTimeout(() => {
        void showLocalWakeUpReminderNotification(
          partnerName || 'Us 💕',
          'Đã hết 10 phút ngủ nướng rồi nè! ☀️ Mau dậy bấm "Đã dậy rồi" thôi nào!'
        );
      }, 10 * 60 * 1000);
    }

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'US_WAKE_UP_CLICKED') {
        if (event.data.action === 'wake_up') {
          void performWakeUpCheckIn('manual');
        } else if (event.data.action === 'snooze') {
          setNotificationToast('😴 Đã báo lại sau 10 phút nhé!');
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [userProfile.coupleId, myUid, partnerName]);

  /*
   * Daily scheduled reminder trigger:
   * Checks every minute if current time >= scheduled reminder time (05:40, random, or custom)
   * and fires interactive push notification if not checked in yet today.
   */
  useEffect(() => {
    if (!reminderSettings.enabled) return;

    const checkReminderTime = () => {
      const now = new Date();
      const localDate = getLocalDateKey(now);
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const schedMin = getScheduledReminderMinutes(reminderSettings, localDate);

      // Within morning window: between scheduled minute and 11:30 AM
      if (currentMin >= schedMin && currentMin <= 11 * 60 + 30) {
        const lastSentDate = localStorage.getItem(LAST_REMINDER_SENT_KEY);
        if (lastSentDate !== localDate) {
          const myDone =
            todayLog?.winnerUid === myUid ||
            Boolean(todayLog && todayLog.winnerUid !== myUid && todayLog.loserWokeUpAt);

          if (!myDone) {
            localStorage.setItem(LAST_REMINDER_SENT_KEY, localDate);
            const timeStr = formatMinutesToTime(schedMin);
            void showLocalWakeUpReminderNotification(
              partnerName,
              `Đã ${timeStr} rồi nè! ☀️ Bấm nút "Đã dậy rồi" để điểm danh cùng người ấy nha!`
            );
          }
        }
      }
    };

    checkReminderTime();
    const interval = window.setInterval(checkReminderTime, 60000);
    return () => window.clearInterval(interval);
  }, [reminderSettings, todayLog, myUid, partnerName]);

  const handleSaveSettings = async () => {
    setReminderSettings(tempSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(tempSettings));
      if (userProfile.coupleId) {
        await setDoc(
          doc(db, 'couples', userProfile.coupleId),
          { wakeUpReminderSettings: tempSettings },
          { merge: true }
        );
      }
      setNotificationToast('✅ Đã lưu cài đặt lời nhắc thức dậy!');
    } catch (err) {
      console.warn('Could not sync reminder settings to cloud:', err);
      setNotificationToast('✅ Đã lưu cài đặt trên thiết bị!');
    }
    setShowSettingsModal(false);
  };

  const handleTestReminderNotification = async () => {
    setTestingNotification(true);
    try {
      const ok = await showLocalWakeUpReminderNotification(
        partnerName,
        `Chào buổi sáng ${myName}! ☀️ Bấm nút "Đã dậy rồi" bên dưới xem sao nha!`
      );
      if (ok) {
        setNotificationToast('🔔 Đã bắn thông báo có nút "Đã dậy rồi" lên màn hình!');
      } else {
        alert('Chưa thể hiển thị thông báo. Hãy cho phép quyền Thông Báo (Notifications) trong cài đặt trình duyệt nhé!');
      }
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi gửi thông báo thử.');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleNudgePartner = async () => {
    if (sendingNudge) return;
    setSendingNudge(true);
    try {
      await sendPartnerNotification(
        buildWakeUpReminderNotification({
          senderName: myName,
          recipientName: partnerName,
        })
      );
      setNotificationToast(`⏰ Đã gửi chuông gọi ${partnerName} thức dậy!`);
    } catch (e) {
      console.error('Error sending wake up reminder:', e);
      alert('Chưa thể gửi chuông nhắc. Vui lòng thử lại!');
    } finally {
      setSendingNudge(false);
    }
  };

  const renderNotificationToast = () => {
    if (!notificationToast) return null;
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-2 animate-fadeIn max-w-[90vw]">
        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        <span className="truncate">{notificationToast}</span>
        <button
          type="button"
          onClick={() => setNotificationToast(null)}
          className="ml-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!showSettingsModal) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100/80">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Cài Đặt Lời Nhắc Thức Dậy ⏰
                </h3>
                <p className="text-[11px] text-slate-500">
                  Thông báo đẩy có nút "Đã dậy rồi" trên màn hình khóa
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 space-y-4 overflow-y-auto text-xs">
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
              <div>
                <p className="font-bold text-slate-800">Bật thông báo nhắc dậy sáng</p>
                <p className="text-[11px] text-slate-500">
                  Tự động gửi thông báo đến máy bạn mỗi buổi sáng
                </p>
              </div>
              <input
                type="checkbox"
                checked={tempSettings.enabled}
                onChange={(e) =>
                  setTempSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {/* Mode selection */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">
                Chọn thời điểm gửi thông báo:
              </label>

              {/* Mode 1: Early 05:40 */}
              <div
                onClick={() => setTempSettings((prev) => ({ ...prev, mode: 'early_540' }))}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  tempSettings.mode === 'early_540'
                    ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌅</span>
                    <span className="font-bold text-slate-800">Sớm hẳn (05:40)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    Khuyên dùng
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Gửi từ 05:40 sáng và ghim cố định trên màn hình khóa. Khi mở điện thoại lên là thấy ngay nút "Đã dậy rồi"!
                </p>
              </div>

              {/* Mode 2: Random Morning 05:40 - 06:30 */}
              <div
                onClick={() => setTempSettings((prev) => ({ ...prev, mode: 'random_morning' }))}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  tempSettings.mode === 'random_morning'
                    ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎲</span>
                    <span className="font-bold text-slate-800">Ngẫu nhiên (05:40 – 06:30)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Bất ngờ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Mỗi ngày app tự tính một giờ ngẫu nhiên (hôm nay: {todayScheduledTimeStr}). Giúp buổi sáng bớt đơn điệu và tự nhiên hơn.
                </p>
              </div>

              {/* Mode 3: Fixed 06:30 */}
              <div
                onClick={() => setTempSettings((prev) => ({ ...prev, mode: 'fixed_630' }))}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  tempSettings.mode === 'fixed_630'
                    ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⏰</span>
                  <span className="font-bold text-slate-800">Đúng 06:30</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Nhắc nhẹ nhàng vào đúng 06:30 sáng mỗi ngày.
                </p>
              </div>

              {/* Mode 4: Custom time */}
              <div
                onClick={() => setTempSettings((prev) => ({ ...prev, mode: 'custom' }))}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  tempSettings.mode === 'custom'
                    ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚙️</span>
                    <span className="font-bold text-slate-800">Tùy chọn giờ</span>
                  </div>
                  {tempSettings.mode === 'custom' && (
                    <input
                      type="time"
                      value={tempSettings.customTime}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setTempSettings((prev) => ({ ...prev, customTime: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Tự chỉnh giờ cố định theo thời gian biểu của hai bạn.
                </p>
              </div>
            </div>

            {/* Lockscreen persistence */}
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="keepOnLockscreen"
                checked={tempSettings.keepOnLockscreen}
                onChange={(e) =>
                  setTempSettings((prev) => ({ ...prev, keepOnLockscreen: e.target.checked }))
                }
                className="mt-0.5 w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
              <label htmlFor="keepOnLockscreen" className="text-[11px] text-slate-600 cursor-pointer">
                <span className="font-bold text-slate-800 block">
                  Ghim trên màn hình khóa (Require Interaction)
                </span>
                Thông báo không tự biến mất mà giữ nguyên trên màn hình khóa cho tới khi bạn chạm vào để mở máy.
              </label>
            </div>

            {/* Test & Nudge actions */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestReminderNotification}
                disabled={testingNotification}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl border border-amber-200 transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                {testingNotification ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                ) : (
                  <Bell className="w-4 h-4 text-amber-600" />
                )}
                <span>🔔 Bấm thử để nhận thông báo có nút "Đã dậy rồi" ngay</span>
              </button>

              <button
                type="button"
                onClick={handleNudgePartner}
                disabled={sendingNudge}
                className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                {sendingNudge ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>⏰ Gửi chuông gọi {partnerName} thức dậy ngay bây giờ</span>
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-xs transition cursor-pointer"
            >
              Lưu Cài Đặt
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Compute overall stats
  const myWins = allLogs.filter(
    (log) =>
      log.winnerUid === myUid
  ).length;

  const partnerWins =
    allLogs.filter(
      (log) =>
        log.winnerUid ===
          partnerUid ||
        (partnerUid
          ? false
          : log.winnerUid !==
            myUid)
    ).length;

  const totalFines =
    allLogs.length * 5000;

  const isWinnerToday =
    todayLog?.winnerUid === myUid;

  const beforeWakeStart =
    isBeforeWakeStart(
      new Date()
    );

  if (compact) {
    const isMorningTime = getMinutesSinceMidnight(new Date()) >= AUTO_WAKE_START_MINUTES && getMinutesSinceMidnight(new Date()) < AUTO_WAKE_END_MINUTES;
    const myCheckedInToday = Boolean(
      todayLog?.winnerUid === myUid ||
      (todayLog && todayLog.winnerUid !== myUid && todayLog.loserWokeUpAt)
    );
    const showMorningGreeting = isMorningTime && !myCheckedInToday && !greetingDismissed;

    // Clean White / Rose Widget for Home Screen with bright light aesthetic
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs relative overflow-hidden space-y-3">
        {renderNotificationToast()}
        {renderSettingsModal()}

        {showCelebration && (
          <div className="absolute inset-0 bg-rose-500/95 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-fadeIn p-4 text-center">
            <Sparkles className="w-7 h-7 text-pink-200 animate-bounce mb-1" />
            <p className="font-bold text-sm">
              🎉 Bạn đã dậy sớm nhất hôm nay!
            </p>
            <p className="text-xs opacity-90">
              {partnerName} đóng 5.000đ vào quỹ chung ☕
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Sun className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
              Ai Dậy Sớm Hơn?
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="Cài đặt nhắc nhở thức dậy & thông báo màn hình khóa"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              {reminderSettings.enabled && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {onNavigateToFinance && (
              <button
                type="button"
                onClick={onNavigateToFinance}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer shrink-0 py-1 px-2 hover:bg-rose-50 rounded-lg transition whitespace-nowrap"
              >
                <span>Xem quỹ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Morning greeting callout */}
        {showMorningGreeting && (
          <div className="p-3 bg-linear-to-r from-amber-50/90 via-rose-50/70 to-orange-50/80 border border-amber-200/80 rounded-xl space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                Chào buổi sáng {myName}! ☀️
              </span>
              <button
                type="button"
                onClick={() => setGreetingDismissed(true)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Ẩn lời chào"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {todayLog
                ? `🏆 ${todayLog.winnerName} đã dậy lúc ${todayLog.winnerTime}! Mau bấm điểm danh để hoàn thành thử thách nha.`
                : 'Bạn đã tỉnh giấc chưa? Bấm ngay để ghi nhận thức dậy và nhận thưởng nha!'}
            </p>
          </div>
        )}

        {!todayLog ? (
          <button
            type="button"
            onClick={handleCheckInWakeUp}
            disabled={
              loading ||
              beforeWakeStart
            }
            className="w-full py-3.5 px-4 bg-rose-500 hover:bg-rose-600 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Sun className="w-4 h-4 text-amber-200" />
            <span>
              {beforeWakeStart
                ? 'Bắt đầu từ 05:30'
                : loading
                  ? 'Đang ghi nhận...'
                  : '☀️ Tôi Đã Dậy Rồi!'}
            </span>
          </button>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800 truncate">
                  {isWinnerToday
                    ? `🏆 Bạn đã dậy trước (${todayLog.winnerTime})`
                    : `🏆 ${todayLog.winnerName} đã dậy trước (${todayLog.winnerTime})`}
                </span>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                +5.000đ quỹ
              </span>
            </div>

            {!isWinnerToday &&
              !todayLog.loserWokeUpAt && (
                <button
                  type="button"
                  onClick={
                    handleSecondPersonWakeUp
                  }
                  disabled={loading}
                  className="w-full mt-1 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
                >
                  <Coffee className="w-4 h-4 text-rose-500" />
                  <span>
                    Tôi cũng vừa dậy ({currentTimeStr})
                  </span>
                </button>
              )}
          </div>
        )}

        {/* Quick reminder status & actions bar */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1 text-slate-600 hover:text-rose-600 font-medium cursor-pointer transition truncate max-w-[55%]"
            title="Nhấn để đổi giờ nhắc hoặc chọn ngẫu nhiên"
          >
            <Bell className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">Nhắc: {getModeLabel(reminderSettings)}</span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleTestReminderNotification}
              disabled={testingNotification}
              className="text-amber-700 hover:text-amber-800 font-semibold px-2 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Bắn thử thông báo có nút 'Đã dậy rồi' lên máy của bạn"
            >
              {testingNotification ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Smartphone className="w-3 h-3" />
              )}
              <span>Thử báo</span>
            </button>

            {partnerUid && (
              <button
                type="button"
                onClick={handleNudgePartner}
                disabled={sendingNudge}
                className="text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 rounded-lg transition cursor-pointer flex items-center gap-1"
                title={`Gửi chuông đánh thức kèm nút Đã dậy sang máy ${partnerName}`}
              >
                {sendingNudge ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Gọi {partnerName}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full detailed card in Finance Tab
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 relative overflow-hidden">
      {renderNotificationToast()}
      {renderSettingsModal()}

      {showCelebration && (
        <div className="absolute inset-0 bg-rose-500/95 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-fadeIn p-4 text-center">
          <Sparkles className="w-8 h-8 text-pink-200 animate-bounce mb-2" />
          <h3 className="font-bold text-base">
            🎉 Bạn đã dậy sớm nhất hôm nay!
          </h3>
          <p className="text-xs opacity-90 mt-1">
            Đã ghi nhận lúc {currentTimeStr} & cộng 5.000đ vào quỹ chung!
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <Sun className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              Thử Thách Dậy Sớm
            </h3>
            <p className="text-[11px] text-slate-500">
              Điểm danh buổi sáng • Phạt 5.000đ vào quỹ chung
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 text-rose-500" />
          <span>Cài đặt nhắc nhở</span>
        </button>
      </div>

      {/* Morning Reminder Strip */}
      <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white text-rose-500 flex items-center justify-center border border-rose-200/80 shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-slate-800">
              Lời nhắc: {getModeLabel(reminderSettings)}
            </p>
            <p className="text-[11px] text-slate-500">
              {reminderSettings.keepOnLockscreen
                ? 'Ghim cố định trên màn hình khóa điện thoại (Mở máy là thấy)'
                : 'Thông báo đẩy tiêu chuẩn'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleTestReminderNotification}
            disabled={testingNotification}
            className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-amber-800 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition shadow-2xs"
          >
            {testingNotification ? <Loader2 className="w-3 h-3 animate-spin" /> : <Smartphone className="w-3 h-3" />}
            <span>Thử thông báo</span>
          </button>

          {partnerUid && (
            <button
              type="button"
              onClick={handleNudgePartner}
              disabled={sendingNudge}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition shadow-2xs"
            >
              {sendingNudge ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>Gọi {partnerName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scoreboard / Stats Bar */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200/60">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            🏆 {myName}
          </p>
          <p className="text-sm sm:text-base font-bold text-slate-800">
            {myWins}{' '}
            <span className="text-[11px] font-normal text-slate-400">
              lần
            </span>
          </p>
        </div>

        <div className="text-center border-x border-slate-200/60">
          <p className="text-[10px] text-slate-400 font-medium">
            🏆 {partnerName}
          </p>
          <p className="text-sm sm:text-base font-bold text-slate-800">
            {partnerWins}{' '}
            <span className="text-[11px] font-normal text-slate-400">
              lần
            </span>
          </p>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            💰 Quỹ thu được
          </p>
          <p className="text-sm sm:text-base font-bold text-emerald-600">
            {totalFines.toLocaleString(
              'vi-VN'
            )}{' '}
            <span className="text-[10px] font-normal text-slate-400">
              đ
            </span>
          </p>
        </div>
      </div>

      {/* Today status & Action Button */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Hôm nay: {formatDateShortVN(todayStr)}
          </span>
          <span className="text-slate-400 text-[11px]">
            Giờ hiện tại: {currentTimeStr}
          </span>
        </div>

        {!todayLog ? (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={
                handleCheckInWakeUp
              }
              disabled={
                loading ||
                beforeWakeStart
              }
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sun className="w-4 h-4 text-amber-200" />
              <span>
                {beforeWakeStart
                  ? 'Bắt đầu từ 05:30'
                  : loading
                    ? 'Đang ghi nhận...'
                    : '☀️ Tôi đã dậy rồi!'}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isWinnerToday
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="text-xl shrink-0">
                {isWinnerToday
                  ? '🏆'
                  : '⏰'}
              </div>

              <div className="flex-1 text-xs">
                <p className="font-bold text-xs">
                  {isWinnerToday
                    ? `Bạn đã dậy trước (${todayLog.winnerTime})`
                    : `${todayLog.winnerName} đã dậy trước (${todayLog.winnerTime})`}
                </p>

                {todayLog.loserWokeUpAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    (Dậy lúc: {todayLog.loserWokeUpAt})
                  </p>
                )}
              </div>
            </div>

            {!isWinnerToday &&
              !todayLog.loserWokeUpAt && (
                <button
                  type="button"
                  onClick={
                    handleSecondPersonWakeUp
                  }
                  disabled={loading}
                  className="w-full py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Coffee className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    Tôi cũng vừa dậy ({currentTimeStr})
                  </span>
                </button>
              )}
          </div>
        )}
      </div>

      {/* Recent wake up history */}
      {allLogs.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-rose-500" />
            Lịch sử dậy sớm gần đây ({allLogs.length} ngày)
          </h4>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {allLogs
              .slice(0, 10)
              .map((log) => {
                const iWon =
                  log.winnerUid ===
                  myUid;

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {iWon
                          ? '🏆'
                          : '⏰'}
                      </span>

                      <div>
                        <span className="font-bold text-slate-800">
                          {iWon
                            ? myName
                            : log.winnerName}
                        </span>

                        <span className="text-slate-400 text-[11px] ml-1.5">
                          lúc {log.winnerTime}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        +5.000đ
                      </span>

                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateShortVN(
                          log.date
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};