import React from 'react';
import { ArrowLeft, CheckCheck, ChevronDown, MessageCircle, Send } from 'lucide-react';

import {
  CompanionMessage,
  markCompanionMessageSeen,
  replyToCompanionMessage,
  sendCompanionMessage,
  subscribeToCompanionMessageHistory,
} from '../../lib/companionMessages';
import { CharacterId } from './characterConfig';
import {
  canMarkCompanionMessageSeen,
  getNewestCompanionMessageId,
  normalizeCompanionMessage,
} from './companionMessageLogic';

export type CompanionMessageOpenMode = 'view' | 'reply' | 'compose';

export interface CompanionMessageNavigationIntent {
  mode: CompanionMessageOpenMode;
  messageId?: string;
  recipientCharacter?: CharacterId;
}

interface CompanionMessagesScreenProps {
  coupleId: string;
  currentUserUid: string;
  currentUserName: string;
  currentCharacter: CharacterId;
  duongName: string;
  chucName: string;
  intent: CompanionMessageNavigationIntent | null;
  onBack: () => void;
}

const formatMessageTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

const formatDayLabel = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const getDayKey = (value: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

export const CompanionMessagesScreen: React.FC<
  CompanionMessagesScreenProps
> = ({
  coupleId,
  currentUserUid,
  currentUserName,
  currentCharacter,
  duongName,
  chucName,
  intent,
  onBack,
}) => {
  const [messages, setMessages] = React.useState<CompanionMessage[]>([]);
  const [draft, setDraft] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);
  const markedSeenRef = React.useRef(new Set<string>());
  const focusedRef = React.useRef<HTMLDivElement | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const messageListRef = React.useRef<HTMLDivElement | null>(null);
  const firstHistoryLoadRef = React.useRef(true);
  const isNearLatestRef = React.useRef(true);

  React.useEffect(
    () => subscribeToCompanionMessageHistory(coupleId, setMessages),
    [coupleId]
  );

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  React.useEffect(() => {
    messages.forEach((message) => {
      if (
        canMarkCompanionMessageSeen(message, currentUserUid) &&
        !markedSeenRef.current.has(message.id)
      ) {
        markedSeenRef.current.add(message.id);
        void markCompanionMessageSeen(coupleId, message.id).catch(() => {
          markedSeenRef.current.delete(message.id);
        });
      }
    });
  }, [coupleId, currentUserUid, messages]);

  const replyTarget = React.useMemo(
    () =>
      intent?.mode === 'reply'
        ? messages.find((message) => message.id === intent.messageId) || null
        : null,
    [intent, messages]
  );
  const newestMessageId = getNewestCompanionMessageId(messages);

  const recipientCharacter: CharacterId =
    replyTarget?.senderCharacter ||
    intent?.recipientCharacter ||
    (currentCharacter === 'duong' ? 'chuc' : 'duong');

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (intent?.messageId && focusedRef.current) {
        focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstHistoryLoadRef.current || isNearLatestRef.current) {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }

      firstHistoryLoadRef.current = false;

      if (intent?.mode === 'reply' || intent?.mode === 'compose') {
        inputRef.current?.focus();
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [intent, newestMessageId]);

  const handleMessageListScroll = () => {
    const list = messageListRef.current;
    if (!list) return;
    const distanceFromLatest = list.scrollHeight - list.scrollTop - list.clientHeight;
    const isNearLatest = distanceFromLatest < 96;
    isNearLatestRef.current = isNearLatest;
    setShowJumpToLatest(!isNearLatest);
  };

  const jumpToLatest = () => {
    isNearLatestRef.current = true;
    setShowJumpToLatest(false);
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const submitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = normalizeCompanionMessage(draft);
    if (!text || isSending) return;

    setIsSending(true);
    setError('');

    try {
      if (replyTarget) {
        await replyToCompanionMessage(coupleId, replyTarget, {
          senderUid: currentUserUid,
          senderName: currentUserName,
          text,
        });
      } else {
        await sendCompanionMessage(coupleId, {
          senderUid: currentUserUid,
          senderName: currentUserName,
          senderCharacter: currentCharacter,
          recipientCharacter,
          text,
          parentMessageId: null,
        });
      }
      setDraft('');
      window.setTimeout(jumpToLatest, 40);
    } catch {
      setError('Chưa gửi được. Tin nhắn vẫn được giữ để cậu thử lại nhé.');
    } finally {
      setIsSending(false);
    }
  };

  let previousDay = '';

  return (
    <section className="fixed inset-0 z-[70] bg-[#fff7f8]">
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-[0_0_40px_rgba(136,19,55,0.08)]">
        <header
          className="z-20 flex shrink-0 items-center gap-3 border-b border-rose-100 bg-white/95 px-3 pb-3 backdrop-blur sm:px-5"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
        >
          <button
            type="button"
            onClick={onBack}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-95"
            aria-label="Quay lại Trang chủ"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex -space-x-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-800 text-[10px] font-black text-white">
                {duongName.slice(0, 1).toUpperCase()}
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-rose-400 text-[10px] font-black text-white">
                {chucName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-black text-slate-800 sm:text-base">
                Dương & Chúc
              </h1>
              <p className="truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">
                Lời nhắn chibi giữ hộ 💌
              </p>
            </div>
          </div>
        </header>

        <div
          ref={messageListRef}
          onScroll={handleMessageListScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-rose-50/50 via-[#fffafb] to-white px-3 py-4 sm:px-6"
        >
          {messages.length === 0 && (
            <div className="mx-auto flex h-full max-w-xs flex-col items-center justify-center pb-16 text-center">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                <MessageCircle className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-slate-700">Chưa có lời nhắn nào</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Viết lời đầu tiên để chibi mang sang cho người ấy nhé.
              </p>
            </div>
          )}

          <div className="mx-auto w-full max-w-2xl space-y-1">
            {messages.map((message, index) => {
              const isMine = message.senderUid === currentUserUid;
              const previousMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const dayKey = getDayKey(message.createdAt);
              const showDay = dayKey !== previousDay;
              previousDay = dayKey;
              const joinsPrevious =
                !showDay && previousMessage?.senderUid === message.senderUid;
              const joinsNext =
                nextMessage?.senderUid === message.senderUid &&
                getDayKey(nextMessage.createdAt) === dayKey;
              const isFocused = message.id === intent?.messageId;

              return (
                <React.Fragment key={message.id}>
                  {showDay && (
                    <div className="py-3 text-center">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 shadow-xs">
                        {formatDayLabel(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    ref={isFocused ? focusedRef : undefined}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${
                      joinsPrevious ? 'pt-0' : 'pt-1.5'
                    }`}
                  >
                    <div
                      className={`max-w-[78%] px-3.5 py-2.5 shadow-xs transition sm:max-w-[68%] ${
                        isMine
                          ? `bg-rose-500 text-white ${joinsPrevious ? 'rounded-tr-md' : 'rounded-tr-2xl'} ${joinsNext ? 'rounded-br-md' : 'rounded-br-2xl'} rounded-l-2xl`
                          : `border border-rose-100 bg-white text-slate-700 ${joinsPrevious ? 'rounded-tl-md' : 'rounded-tl-2xl'} ${joinsNext ? 'rounded-bl-md' : 'rounded-bl-2xl'} rounded-r-2xl`
                      } ${isFocused ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}
                    >
                      {!joinsPrevious && (
                        <p className={`mb-0.5 text-[10px] font-bold ${isMine ? 'text-rose-100' : 'text-rose-500'}`}>
                          {message.senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.text}
                      </p>
                      {!joinsNext && (
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMine ? 'text-rose-100' : 'text-slate-400'}`}>
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {isMine && message.seenAt && <CheckCheck className="h-3.5 w-3.5" />}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={endRef} className="h-1" />
          </div>
        </div>

        {showJumpToLatest && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-24 right-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-rose-100 bg-white text-rose-500 shadow-lg transition hover:bg-rose-50 active:scale-95 sm:right-6"
            aria-label="Xuống tin nhắn mới nhất"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}

        <form
          onSubmit={submitMessage}
          className="z-20 shrink-0 border-t border-rose-100 bg-white/95 px-3 pt-2.5 backdrop-blur sm:px-5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
        >
          <div className="mx-auto w-full max-w-2xl">
            {replyTarget && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-rose-400 bg-rose-50 px-3 py-2 text-[11px] text-slate-600">
                <span className="shrink-0 font-bold text-rose-500">Trả lời {replyTarget.senderName}</span>
                <span className="truncate">“{replyTarget.text}”</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={160}
                placeholder={`Nhắn ${recipientCharacter === 'chuc' ? chucName : duongName}...`}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="submit"
                disabled={isSending || !normalizeCompanionMessage(draft)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500 text-white shadow-sm transition hover:bg-rose-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi lời nhắn"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
            {error && <p className="mt-1.5 px-2 text-[11px] font-semibold text-red-500">{error}</p>}
          </div>
        </form>
      </div>
    </section>
  );
};
