import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';

import { CharacterId } from '../components/character/characterConfig';
import { db } from './firebase';
import {
  createTimelockEnvelope,
  decryptTimelockEnvelope,
} from './timelock';

const DEFAULT_IMMEDIATE_DELAY_MS = 15_000;

export interface CompanionMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderCharacter: CharacterId;
  recipientCharacter: CharacterId;
  ciphertext: string;
  unlockAt: string;
  timelockRound: number;
  encryption: 'tlock-drand-quicknet-v1';
  createdAt: string;
  deliveredAt?: string | null;
}

export interface NewCompanionMessage {
  senderUid: string;
  senderName: string;
  senderCharacter: CharacterId;
  recipientCharacter: CharacterId;
  text: string;
  unlockAt?: string | null;
}

const messagesCollection = (coupleId: string) =>
  collection(db, 'couples', coupleId, 'companionMessages');

export const sendCompanionMessage = async (
  coupleId: string,
  message: NewCompanionMessage
): Promise<void> => {
  const {
    text,
    unlockAt,
    ...safeMetadata
  } = message;

  // Even "send now" is encrypted to a near-future drand round so plaintext
  // is never persisted to Firestore.
  const effectiveUnlockAt =
    unlockAt ||
    new Date(Date.now() + DEFAULT_IMMEDIATE_DELAY_MS).toISOString();

  const envelope = await createTimelockEnvelope(
    text,
    effectiveUnlockAt
  );

  await addDoc(messagesCollection(coupleId), {
    ...safeMetadata,
    ciphertext: envelope.ciphertext,
    unlockAt: envelope.unlockAt,
    timelockRound: envelope.round,
    encryption: envelope.encryption,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
  });
};

export const decryptCompanionMessage = async (
  message: CompanionMessage
): Promise<string> =>
  decryptTimelockEnvelope(message.ciphertext);

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
          !message.deliveredAt &&
          typeof message.ciphertext === 'string' &&
          typeof message.unlockAt === 'string'
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    onChange(pending[0] || null);
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
      .filter(
        (message) =>
          message.senderUid === senderUid &&
          typeof message.ciphertext === 'string' &&
          typeof message.unlockAt === 'string'
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    onChange(sent);
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
