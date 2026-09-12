import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';
import { CharacterId } from './characterConfig';
import {
  CompanionMessage,
  markCompanionMessageSeen,
  replyToCompanionMessage,
  sendCompanionMessage,
  subscribeToPendingCompanionMessages,
  subscribeToSentCompanionMessages,
} from '../../lib/companionMessages';
import {
  formatCompanionDelivery,
  formatReplyInvitation,
  getCompanionMessageStatus,
  normalizeCompanionMessage,
} from './companionMessageLogic';

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
const SEEN_AFTER_MS = 2500;
const DELIVERY_VISIBLE_MS = 10_000;
const LONG_PRESS_MS = 600;

let duongWelcomePlayedThisPageLoad = false;
let chucWelcomePlayedThisPageLoad = false;

type ChucVisualState = 'idle' | 'wave';

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
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState('');
  const [pendingMessages, setPendingMessages] =
    React.useState<CompanionMessage[]>([]);
  const [activeMessage, setActiveMessage] =
    React.useState<CompanionMessage | null>(null);
  const [sentMessages, setSentMessages] =
    React.useState<CompanionMessage[]>([]);
  const [statusTarget, setStatusTarget] =
    React.useState<CharacterId | null>(null);
  const [replyingTo, setReplyingTo] =
    React.useState<CompanionMessage | null>(null);
  const [sentNotice, setSentNotice] = React.useState<{
    speaker: CharacterId;
    text: string;
  } | null>(null);
  const [cardIsVisible, setCardIsVisible] = React.useState(false);

  const duongWelcomeStartTimerRef = React.useRef<number | null>(null);
  const duongWelcomeEndTimerRef = React.useRef<number | null>(null);
  const chucWelcomeStartTimerRef = React.useRef<number | null>(null);
  const chucWelcomeEndTimerRef = React.useRef<number | null>(null);
  const deliveryTimerRef = React.useRef<number | null>(null);
  const seenTimerRef = React.useRef<number | null>(null);
  const sentNoticeTimerRef = React.useRef<number | null>(null);
  const longPressTimerRef = React.useRef<number | null>(null);
  const suppressNextClickRef = React.useRef(false);
  const cardRef = React.useRef<HTMLDivElement | null>(null);

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
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (messageTarget !== target) return;
    setSendError('');
    setReplyingTo(null);
    setStatusTarget(null);
    setComposerTarget((current) => (current === target ? null : target));
  };

  const startLongPress = (target: CharacterId) => {
    if (messageTarget !== target) return;
    suppressNextClickRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
      setComposerTarget(null);
      setReplyingTo(null);
      setStatusTarget(target);
      longPressTimerRef.current = null;
      navigator.vibrate?.(25);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const submitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = normalizeCompanionMessage(draft);
    if (!text || !currentCharacter || !coupleId) return;

    setIsSending(true);
    setSendError('');

    try {
      if (replyingTo) {
        await replyToCompanionMessage(coupleId, replyingTo, {
          senderUid: currentUserUid,
          senderName: currentUserName,
          text,
        });
      } else {
        if (!composerTarget) return;
        await sendCompanionMessage(coupleId, {
          senderUid: currentUserUid,
          senderName: currentUserName,
          senderCharacter: currentCharacter,
          recipientCharacter: composerTarget,
          text,
        });
      }

      const finalTarget = replyingTo?.senderCharacter || composerTarget;
      const targetName = finalTarget === 'chuc' ? chucName : duongName;
      setDraft('');
      setComposerTarget(null);
      setReplyingTo(null);
      setSentNotice({
        speaker: finalTarget || currentCharacter,
        text: `Yên tâm, khi ${targetName} vào mình sẽ kể lại nhé 🤫`,
      });

      if (sentNoticeTimerRef.current !== null) {
        window.clearTimeout(sentNoticeTimerRef.current);
      }
      sentNoticeTimerRef.current = window.setTimeout(() => {
        setSentNotice(null);
        sentNoticeTimerRef.current = null;
      }, 4500);
    } catch (error) {
      console.error('Không thể gửi lời nhắn cho chibi:', error);
      setSendError('Chưa gửi được, thử lại nhé.');
    } finally {
      setIsSending(false);
    }
  };

  const getAutomaticState = React.useCallback(
    (now = Date.now()): CharacterState => {
      const hour = new Date(now).getHours();

      if (hour >= 23 || hour < 6) {
        return 'sleepy';
      }

      return 'idle';
    },
    []
  );

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setClock(now);

      setDuongState((prev) =>
        prev === 'wave' ? prev : getAutomaticState(now)
      );
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [getAutomaticState]);

  React.useEffect(() => {
    setDuongState((prev) =>
      prev === 'wave' ? prev : getAutomaticState(clock)
    );
  }, [clock, getAutomaticState]);

  React.useEffect(() => {
    if (!coupleId || !currentCharacter) {
      setPendingMessages([]);
      return;
    }

    return subscribeToPendingCompanionMessages(
      coupleId,
      currentCharacter,
      setPendingMessages
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
    if (!activeMessage && pendingMessages.length > 0) {
      setActiveMessage(pendingMessages[0]);
    }
  }, [activeMessage, pendingMessages]);

  React.useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === 'undefined') {
      setCardIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setCardIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!activeMessage || !coupleId) return;

    let seenSaved = false;

    const clearViewTimers = () => {
      if (seenTimerRef.current !== null) {
        window.clearTimeout(seenTimerRef.current);
        seenTimerRef.current = null;
      }
      if (deliveryTimerRef.current !== null) {
        window.clearTimeout(deliveryTimerRef.current);
        deliveryTimerRef.current = null;
      }
    };

    const startViewTimers = () => {
      clearViewTimers();
      if (document.visibilityState !== 'visible' || !cardIsVisible) return;

      if (!seenSaved && !activeMessage.seenAt) {
        seenTimerRef.current = window.setTimeout(async () => {
          try {
            await markCompanionMessageSeen(coupleId, activeMessage.id);
            seenSaved = true;
          } catch (error) {
            console.error('Không thể đánh dấu lời nhắn đã xem:', error);
          }
          seenTimerRef.current = null;
        }, SEEN_AFTER_MS);
      }

      deliveryTimerRef.current = window.setTimeout(() => {
        setActiveMessage(null);
        deliveryTimerRef.current = null;
      }, DELIVERY_VISIBLE_MS);
    };

    startViewTimers();
    document.addEventListener('visibilitychange', startViewTimers);

    return () => {
      document.removeEventListener('visibilitychange', startViewTimers);
      clearViewTimers();
    };
  }, [activeMessage, cardIsVisible, coupleId]);

  React.useEffect(
    () => () => {
      if (sentNoticeTimerRef.current !== null) {
        window.clearTimeout(sentNoticeTimerRef.current);
      }
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
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

  const visibleBubble = activeMessage
    ? {
        speaker: activeMessage.recipientCharacter,
        text: formatCompanionDelivery(activeMessage),
      }
    : sentNotice;
  const aliasIndex = activeMessage
    ? activeMessage.id
        .split('')
        .reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0)
    : 0;

  return (
    <div ref={cardRef} className="relative min-h-[340px] rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white overflow-hidden">
      {statusTarget && (
        <div className="absolute left-3 right-3 top-3 z-40 max-h-[260px] overflow-y-auto rounded-2xl border border-rose-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-800">Chibi mách bạn</p>
            <button
              type="button"
              onClick={() => setStatusTarget(null)}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500"
            >
              Đóng
            </button>
          </div>
          <div className="space-y-2">
            {sentMessages.filter((message) => message.recipientCharacter === statusTarget).length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">
                Chưa có lời nào cần kiểm tra.
              </p>
            ) : (
              sentMessages
                .filter((message) => message.recipientCharacter === statusTarget)
                .map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                    <p className="text-xs font-semibold text-slate-700">“{message.text}”</p>
                    <p className="mt-1 text-[11px] font-bold text-rose-600">
                      {getCompanionMessageStatus(
                        message,
                        statusTarget === 'chuc' ? chucName : duongName
                      )}
                    </p>
                    {message.replyText && (
                      <p className="mt-1 text-[11px] text-slate-600">
                        Trả lời: “{message.replyText}”
                      </p>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {(composerTarget || replyingTo) && (
        <form
          onSubmit={submitMessage}
          className="absolute left-3 right-3 top-3 z-30 rounded-2xl border border-rose-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
        >
          <label
            htmlFor="companion-message"
            className="mb-2 block text-xs font-bold text-slate-700"
          >
            {replyingTo
              ? `Trả lời ${replyingTo.senderName}`
              : `Nhắn chibi ${composerTarget === 'chuc' ? chucName : duongName} giữ hộ`}
          </label>
          <div className="flex gap-2">
            <input
              id="companion-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={160}
              autoFocus
              placeholder={replyingTo ? 'Nhập câu trả lời...' : 'Ví dụ: Yêu Chúc...'}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <button
              type="submit"
              disabled={isSending || !normalizeCompanionMessage(draft)}
              className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? 'Đang gửi...' : 'Gửi'}
            </button>
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
              <div className="absolute bottom-[calc(100%_-_2.4rem)] left-1/2 z-20 w-44 max-w-[75vw] -translate-x-1/2 rounded-2xl rounded-bl-sm border border-rose-100 bg-white px-3 py-2 text-center text-xs font-semibold leading-relaxed text-slate-700 shadow-lg">
                <p>{visibleBubble.text}</p>
                {activeMessage && (
                  <>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatReplyInvitation(activeMessage.senderCharacter, aliasIndex)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(activeMessage);
                        setComposerTarget(activeMessage.senderCharacter);
                        setDraft('');
                      }}
                      className="mt-2 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      Trả lời
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => openComposer('duong')}
              onPointerDown={() => startLongPress('duong')}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onContextMenu={(event) => event.preventDefault()}
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
              <div className="absolute bottom-[calc(100%_-_2.4rem)] left-1/2 z-20 w-44 max-w-[75vw] -translate-x-1/2 rounded-2xl rounded-br-sm border border-rose-100 bg-white px-3 py-2 text-center text-xs font-semibold leading-relaxed text-slate-700 shadow-lg">
                <p>{visibleBubble.text}</p>
                {activeMessage && (
                  <>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatReplyInvitation(activeMessage.senderCharacter, aliasIndex)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(activeMessage);
                        setComposerTarget(activeMessage.senderCharacter);
                        setDraft('');
                      }}
                      className="mt-2 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      Trả lời
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => openComposer('chuc')}
              onPointerDown={() => startLongPress('chuc')}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onContextMenu={(event) => event.preventDefault()}
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
