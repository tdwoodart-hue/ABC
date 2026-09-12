import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
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
}

type NewCompanionMessage = Omit<
  CompanionMessage,
  'id' | 'createdAt' | 'deliveredAt'
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
  });
};

export const subscribeToPendingCompanionMessage = (
  coupleId: string,
  recipientCharacter: CharacterId,
  onChange: (message: CompanionMessage | null) => void
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
          !message.deliveredAt
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    onChange(pending[0] || null);
  });

export const markCompanionMessageDelivered = async (
  coupleId: string,
  messageId: string
): Promise<void> => {
  await updateDoc(
    doc(db, 'couples', coupleId, 'companionMessages', messageId),
    { deliveredAt: new Date().toISOString() }
  );
};
