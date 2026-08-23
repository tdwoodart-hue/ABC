import { JournalEntry } from '../types';
import { PartnerNotificationPayload } from './notifications';

const MAX_NOTIFICATION_BODY_LENGTH = 120;

const cleanText = (value?: string | null): string =>
  (value || '').replace(/\s+/g, ' ').trim();

const truncate = (
  value: string,
  maxLength = MAX_NOTIFICATION_BODY_LENGTH
): string => {
  const cleaned = cleanText(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const quote = (value?: string | null): string => {
  const cleaned = cleanText(value);
  return cleaned ? `“${truncate(cleaned, 88)}”` : '';
};

export const notificationRoutes = {
  home: () => '/',

  wakeUp: () => '/?focus=wakeup',

  status: () => '/?focus=status',

  finance: () => '/finance',

  journal: (journalId: string) =>
    `/journal?post=${encodeURIComponent(journalId)}`,

  journalComments: (journalId: string) =>
    `/journal?post=${encodeURIComponent(journalId)}&focus=comments`,

  journalImageComments: (
    journalId: string,
    imageIndex: number
  ) =>
    `/journal?post=${encodeURIComponent(
      journalId
    )}&image=${Math.max(0, imageIndex)}&focus=image-comments`,
};

export interface JournalNotificationArgs {
  journal: JournalEntry;
  actorName: string;
}

export interface JournalCommentNotificationArgs {
  journalId: string;
  journalTitle?: string;
  actorName: string;
  comment: string;
}

export interface ImageCommentNotificationArgs {
  journalId: string;
  journalTitle?: string;
  imageIndex: number;
  actorName: string;
  comment: string;
}

export interface WakeUpNotificationArgs {
  winnerName: string;
  winnerTime: string;
  loserName: string;
  fineAmount?: number;
}

export interface FinanceNotificationArgs {
  actorName: string;
  title?: string;
  amount?: number;
}

export interface StatusNotificationArgs {
  actorName: string;
  status: string;
}

const formatMoney = (amount: number): string =>
  `${Math.max(0, amount).toLocaleString('vi-VN')}đ`;

export const buildJournalCreatedNotification = ({
  journal,
  actorName,
}: JournalNotificationArgs): PartnerNotificationPayload => {
  const title = `📖 ${cleanText(actorName) || 'Nửa kia'} vừa thêm một kỷ niệm`;

  const body =
    quote(journal.title) ||
    quote(journal.content) ||
    'Mở Us để xem kỷ niệm mới.';

  return {
    type: 'journal_new',
    title,
    body,
    url: notificationRoutes.journal(journal.id),
    tag: `journal-new-${journal.id}`,
  };
};

export const buildJournalCommentNotification = ({
  journalId,
  journalTitle,
  actorName,
  comment,
}: JournalCommentNotificationArgs): PartnerNotificationPayload => {
  const title = `💬 ${cleanText(actorName) || 'Nửa kia'} vừa bình luận`;

  const commentText = quote(comment);
  const journalText = cleanText(journalTitle);

  const body = commentText
    ? journalText
      ? `${commentText} · ${truncate(journalText, 42)}`
      : commentText
    : 'Mở Us để xem bình luận mới.';

  return {
    type: 'journal_comment',
    title,
    body,
    url: notificationRoutes.journalComments(journalId),
    tag: `journal-comment-${journalId}`,
  };
};

export const buildImageCommentNotification = ({
  journalId,
  journalTitle,
  imageIndex,
  actorName,
  comment,
}: ImageCommentNotificationArgs): PartnerNotificationPayload => {
  const title = `📸 ${cleanText(actorName) || 'Nửa kia'} bình luận một bức ảnh`;

  const commentText = quote(comment);
  const journalText = cleanText(journalTitle);

  const body = commentText
    ? journalText
      ? `${commentText} · ${truncate(journalText, 42)}`
      : commentText
    : 'Mở Us để xem bình luận ảnh mới.';

  return {
    type: 'image_comment',
    title,
    body,
    url: notificationRoutes.journalImageComments(
      journalId,
      imageIndex
    ),
    tag: `image-comment-${journalId}-${Math.max(0, imageIndex)}`,
  };
};

export const buildWakeUpNotification = ({
  winnerName,
  winnerTime,
  loserName,
  fineAmount = 5000,
}: WakeUpNotificationArgs): PartnerNotificationPayload => {
  const winner = cleanText(winnerName) || 'Nửa kia';
  const loser = cleanText(loserName) || 'Người còn lại';
  const time = cleanText(winnerTime);

  return {
    type: 'wake_up',
    title: `☀️ ${winner} dậy rồi!`,
    body: time
      ? `${time} · ${loser} đóng ${formatMoney(fineAmount)} vào quỹ 😴`
      : `${loser} đóng ${formatMoney(fineAmount)} vào quỹ 😴`,
    url: notificationRoutes.wakeUp(),
    tag: 'wake-up-today',
  };
};

export const buildFinanceNotification = ({
  actorName,
  title,
  amount,
}: FinanceNotificationArgs): PartnerNotificationPayload => {
  const actor = cleanText(actorName) || 'Nửa kia';
  const financeTitle = cleanText(title);

  const bodyParts: string[] = [];

  if (financeTitle) {
    bodyParts.push(truncate(financeTitle, 70));
  }

  if (
    typeof amount === 'number' &&
    Number.isFinite(amount)
  ) {
    bodyParts.push(formatMoney(amount));
  }

  return {
    type: 'finance',
    title: `💰 ${actor} vừa cập nhật quỹ`,
    body:
      bodyParts.join(' · ') ||
      'Mở Us để xem thay đổi mới trong quỹ.',
    url: notificationRoutes.finance(),
    tag: `finance-${Date.now()}`,
  };
};

export const buildStatusNotification = ({
  actorName,
  status,
}: StatusNotificationArgs): PartnerNotificationPayload => {
  const actor = cleanText(actorName) || 'Nửa kia';

  return {
    type: 'status_note',
    title: `💗 ${actor} vừa cập nhật trạng thái`,
    body:
      quote(status) ||
      'Mở Us để xem trạng thái mới.',
    url: notificationRoutes.status(),
    tag: 'couple-status',
  };
};