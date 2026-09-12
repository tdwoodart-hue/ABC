import React from 'react';
import { ArrowLeft, CheckCheck, MessageCircle, Send } from 'lucide-react';

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
  const markedSeenRef = React.useRef(new Set<string>());
  const focusedRef = React.useRef<HTMLDivElement | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(
    () => subscribeToCompanionMessageHistory(coupleId, setMessages),
    [coupleId]
  );

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

  const recipientCharacter: CharacterId =
    replyTarget?.senderCharacter ||
    intent?.recipientCharacter ||
    (currentCharacter === 'duong' ? 'chuc' : 'duong');

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (intent?.messageId && focusedRef.current) {
        focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }

      if (intent?.mode === 'reply' || intent?.mode === 'compose') {
        inputRef.current?.focus();
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [intent, messages.length]);

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
    } catch {
      setError('Chưa gửi được. Tin nhắn vẫn được giữ để cậu thử lại nhé.');
    } finally {
      setIsSending(false);
    }
  };

  let previousDay = '';

  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-rose-100 bg-white/95 px-3 py-3 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
          aria-label="Quay lại Trang chủ"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-black text-slate-800 sm:text-lg">
            Lời nhắn của chúng mình
          </h1>
          <p className="text-[11px] font-medium text-slate-500">
            Chibi giữ hộ mọi lời muốn nói 💌
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-2 bg-gradient-to-b from-rose-50/45 via-white to-white px-3 py-4 sm:px-5">
        {messages.length === 0 && (
          <div className="mx-auto flex max-w-xs flex-col items-center py-16 text-center">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500">
              <MessageCircle className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">Chưa có lời nhắn nào</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Viết lời đầu tiên để chibi mang sang cho người ấy nhé.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isMine = message.senderUid === currentUserUid;
          const dayKey = getDayKey(message.createdAt);
          const showDay = dayKey !== previousDay;
          previousDay = dayKey;
          const isFocused = message.id === intent?.messageId;

          return (
            <React.Fragment key={message.id}>
              {showDay && (
                <div className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {formatDayLabel(message.createdAt)}
                </div>
              )}
              <div
                ref={isFocused ? focusedRef : undefined}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-xs transition sm:max-w-[72%] ${
                    isMine
                      ? 'rounded-br-md bg-rose-500 text-white'
                      : 'rounded-bl-md border border-rose-100 bg-white text-slate-700'
                  } ${isFocused ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}
                >
                  <p className={`mb-0.5 text-[10px] font-bold ${isMine ? 'text-rose-100' : 'text-rose-500'}`}>
                    {message.senderName}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.text}
                  </p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMine ? 'text-rose-100' : 'text-slate-400'}`}>
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {isMine && message.seenAt && <CheckCheck className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submitMessage}
        className="sticky bottom-[calc(5.25rem_+_env(safe-area-inset-bottom,0px))] z-20 border-t border-rose-100 bg-white/95 p-3 backdrop-blur sm:bottom-20 sm:px-5"
      >
        {replyTarget && (
          <div className="mb-2 truncate rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-slate-600">
            Trả lời {replyTarget.senderName}: “{replyTarget.text}”
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={160}
            placeholder={`Nhắn ${recipientCharacter === 'chuc' ? chucName : duongName}...`}
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
          />
          <button
            type="submit"
            disabled={isSending || !normalizeCompanionMessage(draft)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500 text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Gửi lời nhắn"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
        {error && <p className="mt-1.5 px-2 text-[11px] font-semibold text-red-500">{error}</p>}
      </form>
    </section>
  );
};
