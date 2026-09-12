import { CharacterId } from './characterConfig';

export type CompanionActionId = 'talk' | 'hug' | 'tease' | 'eat';

export interface CompanionAction {
  id: CompanionActionId;
  label: string;
  emoji: string;
}

export interface CompanionReply {
  speaker: CharacterId;
  text: string;
}

export const COMPANION_ACTIONS: CompanionAction[] = [
  { id: 'talk', label: 'Nói chuyện', emoji: '💬' },
  { id: 'hug', label: 'Ôm một cái', emoji: '🤗' },
  { id: 'tease', label: 'Trêu người ấy', emoji: '😝' },
  { id: 'eat', label: 'Gọi đi ăn', emoji: '🍜' },
];

const REPLIES: Record<
  CharacterId,
  Record<CompanionActionId, string[]>
> = {
  duong: {
    talk: [
      'Anh đang giả vờ bận để chờ em gọi đây.',
      'Có chuyện gì kể anh nghe nào?',
      'Anh ở đây, em cứ nói đi.',
    ],
    hug: [
      'Lại đây, ôm một cái thật lâu nhé!',
      'Ôm rồi là không được chạy đâu đấy.',
      'Đã nhận được một cái ôm siêu ấm!',
    ],
    tease: [
      'Ơ kìa, anh có làm gì đâu!',
      'Trêu nữa là anh méc Chúc Gà đấy nhé.',
      'Anh ghi sổ rồi, lát anh trêu lại!',
    ],
    eat: [
      'Đi luôn! Nhưng hôm nay em chọn món nhé.',
      'Anh đói đúng lúc em gọi luôn đấy.',
      'Chốt! Ăn ngon rồi mình tính tiếp.',
    ],
  },
  chuc: {
    talk: [
      'Em đang nghe đây, anh kể đi.',
      'Tự nhiên gọi em, nhớ em đúng không?',
      'Có em đây rồi, nói chuyện nào!',
    ],
    hug: [
      'Cho ôm đúng năm phút thôi nhé!',
      'Lại đây nào, hôm nay ngoan thế.',
      'Ôm một cái rồi hết dỗi nha!',
    ],
    tease: [
      'Anh đứng yên đấy, em lấy chổi đây!',
      'Trêu em là xác định chạy quanh nhà nhé.',
      'Em nhớ rồi đấy, chưa tha đâu!',
    ],
    eat: [
      'Đi ăn thì được, nhưng không được nói tùy em!',
      'Em chọn món, anh chọn quán nhé.',
      'Được! Cho anh ba phút chuẩn bị.',
    ],
  },
};

export const getInteractionTarget = (
  isDuongCurrentUser: boolean,
  isChucCurrentUser: boolean
): CharacterId | null => {
  if (isDuongCurrentUser === isChucCurrentUser) return null;
  return isDuongCurrentUser ? 'chuc' : 'duong';
};

export const getReply = (
  action: CompanionActionId,
  target: CharacterId,
  index: number
): CompanionReply => {
  const lines = REPLIES[target][action];
  const safeIndex = Math.abs(Math.trunc(index)) % lines.length;

  return {
    speaker: target,
    text: lines[safeIndex],
  };
};
