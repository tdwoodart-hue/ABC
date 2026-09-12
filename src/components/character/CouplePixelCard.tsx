import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';
import { CharacterId } from './characterConfig';
import {
  CompanionMessage,
  subscribeToPendingCompanionMessages,
  subscribeToSentCompanionMessages,
} from '../../lib/companionMessages';
import {
  formatCompanionDelivery,
  getCompanionMessagePreview,
  getCompanionMessageStatus,
} from './companionMessageLogic';
import { getCharacterCardLayout } from './companionLayout';
import { CompanionMessageNavigationIntent } from './CompanionMessagesScreen';

interface CouplePixelCardProps {
  duongName: string;
  chucName: string;
  isDuongCurrentUser: boolean;
  isChucCurrentUser: boolean;
  coupleId: string;
  currentUserUid: string;
  onOpenMessages: (intent: CompanionMessageNavigationIntent) => void;
}

const DUONG_WELCOME_MS = 2050;
const CHUC_WELCOME_MS = 2640;
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
  onOpenMessages,
}) => {
  const [duongState, setDuongState] =
    React.useState<CharacterState>('idle');
  const [chucState, setChucState] =
    React.useState<ChucVisualState>('idle');
  const [clock, setClock] = React.useState(() => Date.now());
  const [pendingMessages, setPendingMessages] =
    React.useState<CompanionMessage[]>([]);
  const [activeMessage, setActiveMessage] =
    React.useState<CompanionMessage | null>(null);
  const [sentMessages, setSentMessages] =
    React.useState<CompanionMessage[]>([]);
  const [statusTarget, setStatusTarget] =
    React.useState<CharacterId | null>(null);

  const duongWelcomeStartTimerRef = React.useRef<number | null>(null);
  const duongWelcomeEndTimerRef = React.useRef<number | null>(null);
  const chucWelcomeStartTimerRef = React.useRef<number | null>(null);
  const chucWelcomeEndTimerRef = React.useRef<number | null>(null);
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
    setStatusTarget(null);
    onOpenMessages({ mode: 'compose', recipientCharacter: target });
  };

  const startLongPress = (target: CharacterId) => {
    if (messageTarget !== target) return;
    suppressNextClickRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
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

  React.useEffect(
    () => () => {
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
        text: getCompanionMessagePreview(formatCompanionDelivery(activeMessage), 66),
      }
    : null;
  const cardLayout = getCharacterCardLayout(Boolean(visibleBubble));

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white transition-[min-height] duration-200"
      style={{ minHeight: cardLayout.minHeight }}
    >
      {statusTarget && (
        <div className="fixed inset-x-3 bottom-[calc(6.5rem_+_env(safe-area-inset-bottom))] z-50 max-h-[60vh] overflow-y-auto rounded-2xl border border-rose-100 bg-white/[0.98] p-3 shadow-2xl backdrop-blur-sm sm:absolute sm:inset-x-3 sm:bottom-auto sm:top-3 sm:z-40 sm:max-h-[260px]">
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

      {visibleBubble && (
        <div
          className={`absolute inset-x-3 top-2.5 z-20 flex sm:inset-x-6 ${
            visibleBubble.speaker === 'chuc' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`w-[72%] max-w-[240px] rounded-2xl border border-rose-100 bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-slate-700 shadow-md sm:max-w-[260px] ${
              visibleBubble.speaker === 'chuc' ? 'rounded-br-md' : 'rounded-bl-md'
            }`}
          >
            <p className="line-clamp-2">{visibleBubble.text}</p>
            {activeMessage && (
              <div className="mt-1.5 flex items-center gap-3 border-t border-rose-50 pt-1.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => onOpenMessages({ mode: 'view', messageId: activeMessage.id })}
                  className="text-slate-500 transition hover:text-slate-700"
                >
                  Xem lời nhắn
                </button>
                <button
                  type="button"
                  onClick={() => onOpenMessages({ mode: 'reply', messageId: activeMessage.id })}
                  className="text-rose-500 transition hover:text-rose-600"
                >
                  Trả lời →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 px-3 pb-8 pt-6 transition-[top] duration-200 sm:px-6"
        style={{ top: cardLayout.speechZoneHeight }}
      >
        <div className="h-full w-full flex items-end justify-center gap-2 sm:gap-8">
          <div className="relative w-[42%] sm:w-[38%] max-w-[240px] flex flex-col items-center justify-end">
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
