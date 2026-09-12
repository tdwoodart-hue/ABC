const MAX_MESSAGE_LENGTH = 160;

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
