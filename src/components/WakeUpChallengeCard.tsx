import React, { useEffect, useRef, useState } from 'react';
import { runTransaction } from 'firebase/firestore';

import { UserProfile, CoupleData, WakeUpLog } from '../types';
import { db, doc, collection } from '../lib/firebase';
import {
  Sun,
  Award,
  Clock,
  Sparkles,
  Coffee,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { formatDateShortVN } from '../utils/formatDate';

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
    // Clean White / Rose Widget for Home Screen without clutter notes
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs relative overflow-hidden space-y-3">
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

          {onNavigateToFinance && (
            <button
              type="button"
              onClick={
                onNavigateToFinance
              }
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer shrink-0 py-1 px-2 hover:bg-rose-50 rounded-lg transition whitespace-nowrap"
            >
              <span>Xem quỹ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!todayLog ? (
          <button
            type="button"
            onClick={
              handleCheckInWakeUp
            }
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
      </div>
    );
  }

  // Full detailed card in Finance Tab
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 relative overflow-hidden">
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
          </div>
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