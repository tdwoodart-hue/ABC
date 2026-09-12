import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';
import { CharacterId } from './characterConfig';
import {
  CompanionMessage,
  decryptCompanionMessage,
  markCompanionMessageDelivered,
  sendCompanionMessage,
  subscribeToPendingCompanionMessage,
  subscribeToSentCompanionMessages,
} from '../../lib/companionMessages';
import {
  formatCompanionDelivery,
  normalizeCompanionMessage,
} from './companionMessageLogic';
import {
  formatLocalDateTimeInput,
  formatVietnamDateTime,
  getSentMessageStatus,
  summarizeSentMessages,
} from '../../lib/companionMessageHistory';

interface CouplePixelCardProps {
  duongName: string;
  chucName: string;
  isDuongCurrentUser: boolean;
  isChucCurrentUser: boolean;
  coupleId: string;
  currentUserUid: string;
  currentUserName: string;
}

const DUONG_WELCOME_MS = 2050;
const CHUC_WELCOME_MS = 2640;
const DELIVERY_VISIBLE_MS = 8000;
const LOCK_CLOCK_MS = 5000;

let duongWelcomePlayedThisPageLoad = false;
let chucWelcomePlayedThisPageLoad = false;

type ChucVisualState = 'idle' | 'wave';

const toLocalDateTimeInput = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
};

const formatUnlockTime = (iso: string): string =>
  formatVietnamDateTime(iso);

export const CouplePixelCard: React.FC<
  CouplePixelCardProps
> = ({
  duongName,
  chucName,
  isDuongCurrentUser,
  isChucCurrentUser,
  coupleId,
  currentUserUid,
  currentUserName,
}) => {
  const [duongState, setDuongState] =
    React.useState<CharacterState>('idle');
  const [chucState, setChucState] =
    React.useState<ChucVisualState>('idle');
  const [clock, setClock] = React.useState(() => Date.now());
  const [composerTarget, setComposerTarget] =
    React.useState<CharacterId | null>(null);
  const [draft, setDraft] = React.useState('');
  const [scheduleEnabled, setScheduleEnabled] = React.useState(false);
  const [scheduledUnlockLocal, setScheduledUnlockLocal] = React.useState(
    () => toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState('');
  const [pendingMessage, setPendingMessage] =
    React.useState<CompanionMessage | null>(null);
  const [decryptedPendingText, setDecryptedPendingText] =
    React.useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [decryptError, setDecryptError] = React.useState('');
  const [sentNotice, setSentNotice] = React.useState<{
    speaker: CharacterId;
    text: string;
  } | null>(null);
  const [sentMessages, setSentMessages] = React.useState<CompanionMessage[]>([]);
  const [showSentHistory, setShowSentHistory] = React.useState(false);
  const [historyPlaintexts, setHistoryPlaintexts] = React.useState<Record<string, string>>({});
  const [historyOpeningId, setHistoryOpeningId] = React.useState<string | null>(null);
  const [historyErrorId, setHistoryErrorId] = React.useState<string | null>(null);

  const duongWelcomeStartTimerRef = React.useRef<number | null>(null);
  const duongWelcomeEndTimerRef = React.useRef<number | null>(null);
  const chucWelcomeStartTimerRef = React.useRef<number | null>(null);
  const chucWelcomeEndTimerRef = React.useRef<number | null>(null);
  const deliveryTimerRef = React.useRef<number | null>(null);
  const sentNoticeTimerRef = React.useRef<number | null>(null);

  const currentCharacter: CharacterId | null = isDuongCurrentUser
    ? 'duong'
    : isChucCurrentUser
      ? 'chuc'
      : null;
  const messageTarget: CharacterId | null = currentCharacter
    ? currentCharacter === 'duong'
      ? 'chuc'
      : 'duong'
    : null;

  const openComposer = (target: CharacterId) => {
    if (messageTarget !== target) return;
    setSendError('');
    setComposerTarget((current) => (current === target ? null : target));
  };

  const submitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = normalizeCompanionMessage(draft);
    if (!text || !composerTarget || !currentCharacter || !coupleId) return;

    let unlockAt: string | null = null;

    if (scheduleEnabled) {
      const unlockDate = new Date(scheduledUnlockLocal);
      if (
        !Number.isFinite(unlockDate.getTime()) ||
        unlockDate.getTime() < Date.now() + 30_000
      ) {
        setSendError('Chọn thời gian mở khóa ở tương lai ít nhất 30 giây nhé.');
        return;
      }
      unlockAt = unlockDate.toISOString();
    }

    setIsSending(true);
    setSendError('');

    try {
      await sendCompanionMessage(coupleId, {
        senderUid: currentUserUid,
        senderName: currentUserName,
        senderCharacter: currentCharacter,
        recipientCharacter: composerTarget,
        text,
        unlockAt,
      });

      const targetName = composerTarget === 'chuc' ? chucName : duongName;
      const noticeText = scheduleEnabled && unlockAt
        ? `Mình khóa lời nhắn rồi 🔒 ${targetName} chỉ mở được lúc ${formatUnlockTime(unlockAt)}.`
        : `Đã cất lời nhắn bằng mã hóa rồi 🤫 ${targetName} sẽ nhận ngay sau khi khóa mở.`;

      // Do not persist or retain the sender's plaintext copy after encryption.
      setDraft('');
      setScheduleEnabled(false);
      setComposerTarget(null);
      setSentNotice({
        speaker: composerTarget,
        text: noticeText,
      });

      if (sentNoticeTimerRef.current !== null) {
        window.clearTimeout(sentNoticeTimerRef.current);
      }
      sentNoticeTimerRef.current = window.setTimeout(() => {
        setSentNotice(null);
        sentNoticeTimerRef.current = null;
      }, 5000);
    } catch (error) {
      console.error('Không thể gửi lời nhắn mã hóa cho chibi:', error);
      setSendError(
        error instanceof Error
          ? error.message
          : 'Chưa mã hóa/gửi được, thử lại nhé.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const openSentMessage = async (message: CompanionMessage) => {
    if (getSentMessageStatus(message, Date.now()) === 'locked') return;

    if (historyPlaintexts[message.id]) {
      setHistoryPlaintexts((current) => {
        const next = { ...current };
        delete next[message.id];
        return next;
      });
      return;
    }

    setHistoryOpeningId(message.id);
    setHistoryErrorId(null);

    try {
      const plaintext = await decryptCompanionMessage(message);
      setHistoryPlaintexts((current) => ({
        ...current,
        [message.id]: plaintext,
      }));
    } catch (error) {
      console.warn('Không thể xem lại lời nhắn đã gửi:', error);
      setHistoryErrorId(message.id);
    } finally {
      setHistoryOpeningId(null);
    }
  };

  const getAutomaticState = React.useCallback(
    (now = Date.now()): CharacterState => {
      const hour = new Date(now).getHours();

      if (hour >= 23 || hour < 6) {
        return 'sleepy';
      }

      return 'idle';
    }, []
  );

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setClock(now);

      setDuongState((prev) =>
        prev === 'wave' ? prev : getAutomaticState(now)
      );
    }, LOCK_CLOCK_MS);

    return () => window.clearInterval(interval);
  }, [getAutomaticState]);

  React.useEffect(() => {
    setDuongState((prev) =>
      prev === 'wave' ? prev : getAutomaticState(clock)
    );
  }, [clock, getAutomaticState]);

  React.useEffect(() => {
    if (!coupleId || !currentCharacter) {
      setPendingMessage(null);
      return;
    }

    return subscribeToPendingCompanionMessage(
      coupleId,
      currentCharacter,
      setPendingMessage
    );
  }, [coupleId, currentCharacter]);

  React.useEffect(() => {
    if (!coupleId || !currentUserUid) {
      setSentMessages([]);
      return;
    }

    return subscribeToSentCompanionMessages(
      coupleId,
      currentUserUid,
      setSentMessages
    );
  }, [coupleId, currentUserUid]);

  React.useEffect(() => {
    setDecryptedPendingText(null);
    setDecryptError('');
    setIsDecrypting(false);
  }, [pendingMessage?.id]);

  const pendingUnlockMs = pendingMessage
    ? new Date(pendingMessage.unlockAt).getTime()
    : Number.POSITIVE_INFINITY;
  const pendingIsUnlockable =
    Boolean(pendingMessage) &&
    Number.isFinite(pendingUnlockMs) &&
    clock >= pendingUnlockMs;

  React.useEffect(() => {
    if (
      !pendingMessage ||
      !pendingIsUnlockable ||
      decryptedPendingText ||
      isDecrypting
    ) {
      return;
    }

    let disposed = false;
    setIsDecrypting(true);
    setDecryptError('');

    decryptCompanionMessage(pendingMessage)
      .then((text) => {
        if (disposed) return;
        setDecryptedPendingText(text);
      })
      .catch((error) => {
        if (disposed) return;
        console.warn('Timelock chưa mở được hoặc drand chưa sẵn sàng:', error);
        // The ciphertext itself enforces the round. A client clock changed
        // forward cannot bypass this; decryption still needs the future beacon.
        setDecryptError('Khóa chưa mở được. Chibi sẽ tự thử lại.');
      })
      .finally(() => {
        if (!disposed) setIsDecrypting(false);
      });

    return () => {
      disposed = true;
    };
  }, [
    pendingMessage,
    pendingIsUnlockable,
    decryptedPendingText,
    clock,
  ]);

  React.useEffect(() => {
    if (deliveryTimerRef.current !== null) {
      window.clearTimeout(deliveryTimerRef.current);
      deliveryTimerRef.current = null;
    }

    // Never mark as delivered until the recipient device has actually
    // decrypted the ciphertext and displayed the plaintext.
    if (!pendingMessage || !coupleId || !decryptedPendingText) return;

    deliveryTimerRef.current = window.setTimeout(async () => {
      try {
        await markCompanionMessageDelivered(coupleId, pendingMessage.id);
      } catch (error) {
        console.error('Không thể đánh dấu lời nhắn đã chuyển:', error);
      }
      deliveryTimerRef.current = null;
    }, DELIVERY_VISIBLE_MS);

    return () => {
      if (deliveryTimerRef.current !== null) {
        window.clearTimeout(deliveryTimerRef.current);
        deliveryTimerRef.current = null;
      }
    };
  }, [coupleId, pendingMessage, decryptedPendingText]);

  React.useEffect(
    () => () => {
      if (sentNoticeTimerRef.current !== null) {
        window.clearTimeout(sentNoticeTimerRef.current);
      }
    },
    []
  );

  React.useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    let disposed = false;
    let observer: MutationObserver | null = null;

    const introIsGone = () =>
      !document.querySelector('.us-snake-loader');

    const runAfterIntro = (callback: () => void) => {
      if (introIsGone()) {
        callback();
      } else {
        observer = new MutationObserver(() => {
          if (introIsGone()) {
            observer?.disconnect();
            observer = null;
            callback();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    };

    if (isChucCurrentUser && !duongWelcomePlayedThisPageLoad) {
      runAfterIntro(() => {
        if (disposed || duongWelcomePlayedThisPageLoad) return;

        duongWelcomePlayedThisPageLoad = true;

        duongWelcomeStartTimerRef.current = window.setTimeout(() => {
          if (disposed) return;
          setDuongState('wave');

          duongWelcomeEndTimerRef.current = window.setTimeout(() => {
            if (disposed) return;
            setDuongState(getAutomaticState());
            setClock(Date.now());
          }, DUONG_WELCOME_MS);
        }, 120);
      });
    }

    if (isDuongCurrentUser && !chucWelcomePlayedThisPageLoad) {
      runAfterIntro(() => {
        if (disposed || chucWelcomePlayedThisPageLoad) return;

        chucWelcomePlayedThisPageLoad = true;

        chucWelcomeStartTimerRef.current = window.setTimeout(() => {
          if (disposed) return;
          setChucState('wave');

          chucWelcomeEndTimerRef.current = window.setTimeout(() => {
            if (disposed) return;
            setChucState('idle');
          }, CHUC_WELCOME_MS);
        }, 120);
      });
    }

    return () => {
      disposed = true;
      observer?.disconnect();

      if (duongWelcomeStartTimerRef.current !== null) {
        window.clearTimeout(duongWelcomeStartTimerRef.current);
      }
      if (duongWelcomeEndTimerRef.current !== null) {
        window.clearTimeout(duongWelcomeEndTimerRef.current);
      }
      if (chucWelcomeStartTimerRef.current !== null) {
        window.clearTimeout(chucWelcomeStartTimerRef.current);
      }
      if (chucWelcomeEndTimerRef.current !== null) {
        window.clearTimeout(chucWelcomeEndTimerRef.current);
      }
    };
  }, [getAutomaticState, isChucCurrentUser, isDuongCurrentUser]);

  const pendingBubbleText = React.useMemo(() => {
    if (!pendingMessage) return null;

    if (decryptedPendingText) {
      return formatCompanionDelivery({
        senderName: pendingMessage.senderName,
        senderCharacter: pendingMessage.senderCharacter,
        text: decryptedPendingText,
        createdAt: pendingMessage.createdAt,
      });
    }

    if (!pendingIsUnlockable) {
      return `Có một lời nhắn đang khóa 🔒 Mở lúc ${formatUnlockTime(
        pendingMessage.unlockAt
      )}`;
    }

    if (isDecrypting) {
      return 'Đến giờ rồi, đang mở khóa lời nhắn... 🔐';
    }

    return decryptError || 'Đang chờ khóa thời gian mở...';
  }, [
    pendingMessage,
    decryptedPendingText,
    pendingIsUnlockable,
    isDecrypting,
    decryptError,
  ]);

  const visibleBubble = pendingMessage
    ? {
        speaker: pendingMessage.recipientCharacter,
        text: pendingBubbleText || '',
      }
    : sentNotice;

  const minimumSchedule = toLocalDateTimeInput(
    new Date(Date.now() + 60_000)
  );
  const sentSummary = summarizeSentMessages(sentMessages, clock);

  return (
    <div className="relative min-h-[340px] rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white overflow-hidden">
      {!composerTarget && !showSentHistory && (
        <button
          type="button"
          onClick={() => setShowSentHistory(true)}
          className="absolute right-3 top-3 z-30 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm backdrop-blur-sm transition hover:bg-white active:scale-95"
        >
          💌 Đã gửi {sentSummary.total}
        </button>
      )}

      {showSentHistory && (
        <div className="absolute inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/98 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Lời nhắn đã gửi</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Chưa tới giờ chỉ xem được trạng thái. Qua giờ mới có thể mở lại nội dung.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSentHistory(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 hover:bg-slate-200"
              aria-label="Đóng lịch sử lời nhắn"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 border-b border-slate-100 px-3 py-3">
            <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
              <div className="text-base font-extrabold text-slate-800">{sentSummary.total}</div>
              <div className="text-[9px] font-semibold text-slate-500">Tổng đã gửi</div>
            </div>
            <div className="rounded-xl bg-amber-50 px-2 py-2 text-center">
              <div className="text-base font-extrabold text-amber-700">{sentSummary.locked}</div>
              <div className="text-[9px] font-semibold text-amber-600">Đang khóa</div>
            </div>
            <div className="rounded-xl bg-blue-50 px-1 py-2 text-center">
              <div className="text-base font-extrabold text-blue-700">{sentSummary.unlocked}</div>
              <div className="text-[9px] font-semibold text-blue-600">Đã mở</div>
            </div>
            <div className="rounded-xl bg-emerald-50 px-1 py-2 text-center">
              <div className="text-base font-extrabold text-emerald-700">{sentSummary.seen}</div>
              <div className="text-[9px] font-semibold text-emerald-600">Đã xem</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {sentMessages.length === 0 ? (
              <div className="grid min-h-32 place-items-center text-center text-xs text-slate-400">
                Chưa có lời nhắn mã hóa nào được gửi.
              </div>
            ) : (
              sentMessages.map((message) => {
                const status = getSentMessageStatus(message, clock);
                const targetName =
                  message.recipientCharacter === 'chuc' ? chucName : duongName;
                const plaintext = historyPlaintexts[message.id];
                const isOpening = historyOpeningId === message.id;
                const hasError = historyErrorId === message.id;

                return (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-700">
                          Gửi {targetName}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {formatVietnamDateTime(message.createdAt)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                          status === 'locked'
                            ? 'bg-amber-100 text-amber-700'
                            : status === 'seen'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {status === 'locked'
                          ? '🔒 Đang khóa'
                          : status === 'seen'
                            ? '✓ Đã xem'
                            : '🔓 Đã mở khóa'}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] font-medium text-slate-500">
                      Mở lúc {formatVietnamDateTime(message.unlockAt)}
                      {message.deliveredAt
                        ? ` • Xem lúc ${formatVietnamDateTime(message.deliveredAt)}`
                        : ''}
                    </div>

                    {status === 'locked' ? (
                      <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-400">
                        🔐 Nội dung đang được khóa thời gian
                      </div>
                    ) : (
                      <div className="mt-2">
                        {plaintext && (
                          <div className="mb-2 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-slate-700">
                            “{plaintext}”
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => openSentMessage(message)}
                          disabled={isOpening}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
                        >
                          {isOpening
                            ? 'Đang mở...'
                            : plaintext
                              ? 'Ẩn nội dung'
                              : 'Xem lại'}
                        </button>
                        {hasError && (
                          <span className="ml-2 text-[10px] font-semibold text-red-500">
                            Chưa mở được, thử lại sau.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {composerTarget && (
        <form
          onSubmit={submitMessage}
          className="absolute left-3 right-3 top-3 z-30 rounded-2xl border border-rose-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
        >
          <label
            htmlFor="companion-message"
            className="mb-2 block text-xs font-bold text-slate-700"
          >
            Nhắn chibi {composerTarget === 'chuc' ? chucName : duongName} giữ hộ
          </label>

          <div className="flex gap-2">
            <input
              id="companion-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={160}
              autoFocus
              placeholder="Ví dụ: Yêu Chúc..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <button
              type="submit"
              disabled={isSending || !normalizeCompanionMessage(draft)}
              className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? 'Đang khóa...' : 'Gửi'}
            </button>
          </div>

          <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
                className="h-4 w-4 accent-rose-500"
              />
              🔒 Hẹn giờ mở lời nhắn
            </label>

            {scheduleEnabled && (
              <div className="mt-2">
                <div className="relative">
                  <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    <span>{formatLocalDateTimeInput(scheduledUnlockLocal)}</span>
                    <span aria-hidden="true">📅</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledUnlockLocal}
                    min={minimumSchedule}
                    onChange={(event) => setScheduledUnlockLocal(event.target.value)}
                    aria-label="Chọn ngày giờ mở lời nhắn"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </div>
            )}
          </div>

          {sendError && (
            <p className="mt-1.5 text-[11px] font-semibold text-red-500">
              {sendError}
            </p>
          )}
        </form>
      )}

      <div className="absolute inset-0 pt-6 pb-8 px-4 sm:px-6">
        <div className="h-full w-full flex items-end justify-center gap-2 sm:gap-8">
          <div className="relative w-[42%] sm:w-[38%] max-w-[240px] flex flex-col items-center justify-end">
            {visibleBubble?.speaker === 'duong' && (
              <div className="absolute bottom-[calc(100%_-_2.4rem)] left-1/2 z-20 w-48 max-w-[78vw] -translate-x-1/2 rounded-2xl rounded-bl-sm border border-rose-100 bg-white px-3 py-2 text-center text-xs font-semibold leading-relaxed text-slate-700 shadow-lg">
                {visibleBubble.text}
              </div>
            )}
            <button
              type="button"
              onClick={() => openComposer('duong')}
              disabled={messageTarget !== 'duong'}
              aria-label={messageTarget === 'duong' ? `Nhắn lời cho ${duongName}` : duongName}
              className={`h-56 sm:h-64 w-full flex items-end justify-center rounded-2xl transition ${
                messageTarget === 'duong'
                  ? 'cursor-pointer hover:-translate-y-1 hover:bg-white/40 active:scale-[0.98]'
                  : 'cursor-default'
              }`}
            >
              <PixelCharacter
                state={duongState}
                name={duongName}
                className="h-full w-full"
              />
            </button>

            <span className="mt-2 text-sm sm:text-base font-semibold text-slate-700 text-center leading-none">
              {duongName}
            </span>
          </div>

          <div className="relative w-[38%] sm:w-[34%] max-w-[210px] flex flex-col items-center justify-end">
            {visibleBubble?.speaker === 'chuc' && (
              <div className="absolute bottom-[calc(100%_-_2.4rem)] left-1/2 z-20 w-48 max-w-[78vw] -translate-x-1/2 rounded-2xl rounded-br-sm border border-rose-100 bg-white px-3 py-2 text-center text-xs font-semibold leading-relaxed text-slate-700 shadow-lg">
                {visibleBubble.text}
              </div>
            )}
            <button
              type="button"
              onClick={() => openComposer('chuc')}
              disabled={messageTarget !== 'chuc'}
              aria-label={messageTarget === 'chuc' ? `Nhắn lời cho ${chucName}` : chucName}
              className={`h-52 sm:h-60 w-full flex items-end justify-center rounded-2xl transition ${
                messageTarget === 'chuc'
                  ? 'cursor-pointer hover:-translate-y-1 hover:bg-white/40 active:scale-[0.98]'
                  : 'cursor-default'
              }`}
            >
              <PixelCharacter
                character="chuc"
                state={chucState}
                name={chucName}
                className="h-full w-full"
              />
            </button>

            <span className="mt-2 text-sm sm:text-base font-semibold text-slate-700 text-center leading-none">
              {chucName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
