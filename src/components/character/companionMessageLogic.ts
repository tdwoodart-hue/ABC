const MAX_MESSAGE_LENGTH = 160;
const DUONG_ALIASES = ['lão ấy', 'hắn', 'anh iu', 'chồng iu', 'nó'];
const CHUC_ALIASES = ['bà ấy', 'cô ấy', 'em iu', 'vợ iu', 'nó'];

export interface DeliverableMessage {
  senderName: string;
  senderCharacter?: 'duong' | 'chuc';
  text: string;
  createdAt: string;
}

export const normalizeCompanionMessage = (
  value: string
): string | null => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, MAX_MESSAGE_LENGTH) : null;
};

export const getCompanionMessagePreview = (
  text: string,
  limit = 56
): string => {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
};

export const sortCompanionMessageHistory = <T extends { createdAt: string }>(
  messages: T[]
): T[] => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const canMarkCompanionMessageSeen = (
  message: { senderUid: string; seenAt?: string | null },
  currentUserUid: string
): boolean => message.senderUid !== currentUserUid && !message.seenAt;

export const formatCompanionDelivery = (
  message: DeliverableMessage
): string => {
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(message.createdAt));

  const friendName = message.senderName.trim() || 'người ấy';
  const prefix =
    message.senderCharacter === 'chuc' ||
    friendName.toLowerCase().includes('chúc')
      ? `Bà ${friendName}`
      : `Lão ${friendName}`;

  return `${prefix} nói “${message.text}” lúc ${time} đấy 😏`;
};

const formatTimeVN = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

export const formatReplyInvitation = (
  senderCharacter: 'duong' | 'chuc',
  index: number
): string => {
  const aliases = senderCharacter === 'duong' ? DUONG_ALIASES : CHUC_ALIASES;
  const alias = aliases[Math.abs(Math.trunc(index)) % aliases.length];
  return `Cậu có muốn trả lời ${alias} không?`;
};

export const getCompanionMessageStatus = (
  message: { seenAt?: string | null; repliedAt?: string | null },
  recipientName: string
): string => {
  if (message.repliedAt) {
    return `${recipientName} đã trả lời lúc ${formatTimeVN(message.repliedAt)}`;
  }
  if (message.seenAt) {
    return `${recipientName} đã xem lúc ${formatTimeVN(message.seenAt)}`;
  }
  return `${recipientName} chưa xem`;
};
