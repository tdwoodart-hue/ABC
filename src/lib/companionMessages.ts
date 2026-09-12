import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';

import { CharacterId } from '../components/character/characterConfig';
import { db } from './firebase';

export interface CompanionMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderCharacter: CharacterId;
  recipientCharacter: CharacterId;
  text: string;
  createdAt: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
  repliedAt?: string | null;
  replyText?: string | null;
  parentMessageId?: string | null;
}

type NewCompanionMessage = Omit<
  CompanionMessage,
  'id' | 'createdAt' | 'deliveredAt' | 'seenAt' | 'repliedAt' | 'replyText'
>;

const messagesCollection = (coupleId: string) =>
  collection(db, 'couples', coupleId, 'companionMessages');

export const sendCompanionMessage = async (
  coupleId: string,
  message: NewCompanionMessage
): Promise<void> => {
  await addDoc(messagesCollection(coupleId), {
    ...message,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    seenAt: null,
    repliedAt: null,
    replyText: null,
    parentMessageId: message.parentMessageId || null,
  });
};

export const subscribeToPendingCompanionMessages = (
  coupleId: string,
  recipientCharacter: CharacterId,
  onChange: (messages: CompanionMessage[]) => void
): (() => void) =>
  onSnapshot(messagesCollection(coupleId), (snapshot) => {
    const pending = snapshot.docs
      .map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }) as CompanionMessage)
      .filter(
        (message) =>
          message.recipientCharacter === recipientCharacter &&
          !message.seenAt
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    onChange(pending);
  });

export const subscribeToSentCompanionMessages = (
  coupleId: string,
  senderUid: string,
  onChange: (messages: CompanionMessage[]) => void
): (() => void) =>
  onSnapshot(messagesCollection(coupleId), (snapshot) => {
    const sent = snapshot.docs
      .map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }) as CompanionMessage)
      .filter((message) => message.senderUid === senderUid && !message.parentMessageId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    onChange(sent);
  });

export const markCompanionMessageSeen = async (
  coupleId: string,
  messageId: string
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  batch.update(
    doc(db, 'couples', coupleId, 'companionMessages', messageId),
    { deliveredAt: now, seenAt: now }
  );
  await batch.commit();
};

export const replyToCompanionMessage = async (
  coupleId: string,
  original: CompanionMessage,
  reply: {
    senderUid: string;
    senderName: string;
    text: string;
  }
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  const originalRef = doc(
    db,
    'couples',
    coupleId,
    'companionMessages',
    original.id
  );
  const replyRef = doc(messagesCollection(coupleId));

  batch.update(originalRef, {
    seenAt: original.seenAt || now,
    deliveredAt: original.deliveredAt || now,
    repliedAt: now,
    replyText: reply.text,
  });
  batch.set(replyRef, {
    senderUid: reply.senderUid,
    senderName: reply.senderName,
    senderCharacter: original.recipientCharacter,
    recipientCharacter: original.senderCharacter,
    text: reply.text,
    createdAt: now,
    deliveredAt: null,
    seenAt: null,
    repliedAt: null,
    replyText: null,
    parentMessageId: original.id,
  });

  await batch.commit();
};
