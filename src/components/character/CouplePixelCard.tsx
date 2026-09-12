import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';
import { CharacterId } from './characterConfig';
import {
  CompanionMessage,
  markCompanionMessageDelivered,
  sendCompanionMessage,
  subscribeToPendingCompanionMessage,
} from '../../lib/companionMessages';
import {
  formatCompanionDelivery,
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
const DELIVERY_VISIBLE_MS = 8000;

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
  const [pendingMessage, setPendingMessage] =
    React.useState<CompanionMessage | null>(null);
  const [sentNotice, setSentNotice] = React.useState<{
    speaker: CharacterId;
    text: string;
  } | null>(null);

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

    setIsSending(true);
    setSendError('');

    try {
      await sendCompanionMessage(coupleId, {
        senderUid: currentUserUid,
        senderName: currentUserName,
        senderCharacter: currentCharacter,
        recipientCharacter: composerTarget,
        text,
      });

      const targetName = composerTarget === 'chuc' ? chucName : duongName;
      setDraft('');
      setComposerTarget(null);
      setSentNotice({
        speaker: composerTarget,
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
    if (deliveryTimerRef.current !== null) {
      window.clearTimeout(deliveryTimerRef.current);
      deliveryTimerRef.current = null;
    }

    if (!pendingMessage || !coupleId) return;

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
  }, [coupleId, pendingMessage]);

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

  const visibleBubble = pendingMessage
    ? {
        speaker: pendingMessage.recipientCharacter,
        text: formatCompanionDelivery(pendingMessage),
      }
    : sentNotice;

  return (
    <div className="relative min-h-[340px] rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white overflow-hidden">
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
              <div className="absolute bottom-[calc(100%_-_2.4rem)] left-1/2 z-20 w-44 max-w-[75vw] -translate-x-1/2 rounded-2xl rounded-br-sm border border-rose-100 bg-white px-3 py-2 text-center text-xs font-semibold leading-relaxed text-slate-700 shadow-lg">
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
