import type { CompanionMessage } from './companionMessages';

export type SentMessageStatus = 'locked' | 'unlocked' | 'seen';

export const formatLocalDateTimeInput = (value: string): string => {
  const [datePart = '', timePart = ''] = value.split('T');
  const [year = '', month = '', day = ''] = datePart.split('-');
  const normalizedTime = timePart.slice(0, 5);

  if (!year || !month || !day || !normalizedTime) return value;
  return `${day}/${month}/${year} • ${normalizedTime}`;
};

export const formatVietnamDateTime = (iso: string): string => {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  return `${value('day')}/${value('month')}/${value('year')} • ${value('hour')}:${value('minute')}`;
};

export const getSentMessageStatus = (
  message: Pick<CompanionMessage, 'unlockAt' | 'deliveredAt'>,
  now = Date.now()
): SentMessageStatus => {
  if (message.deliveredAt) return 'seen';

  const unlockMs = new Date(message.unlockAt).getTime();
  return Number.isFinite(unlockMs) && unlockMs <= now
    ? 'unlocked'
    : 'locked';
};

export const summarizeSentMessages = (
  messages: Array<Pick<CompanionMessage, 'unlockAt' | 'deliveredAt'>>,
  now = Date.now()
) => {
  const summary = {
    total: messages.length,
    locked: 0,
    unlocked: 0,
    seen: 0,
  };

  for (const message of messages) {
    summary[getSentMessageStatus(message, now)] += 1;
  }

  return summary;
};
