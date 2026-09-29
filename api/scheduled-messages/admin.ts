import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0445953460';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || 'ai-studio-uscoupleapp-0b350c81-98ca-41de-97e9-ee7ef857209a';
const ALLOWED_EMAILS = new Set(['tdwoodart@gmail.com', 'duong@gmail.com', 'chucga@gmail.com']);

export function getAdminApp() {
  if (getApps()[0]) return getApps()[0];
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials');
  return initializeApp({ credential: cert({ projectId: PROJECT_ID, clientEmail, privateKey }), projectId: PROJECT_ID });
}

export async function verifyAllowedUser(req: any) {
  const token = String(req.headers?.authorization || '');
  if (!token.startsWith('Bearer ')) throw new Error('Missing Firebase ID token');
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token.slice(7));
  if (!decoded.uid || !ALLOWED_EMAILS.has(String(decoded.email || '').toLowerCase())) throw new Error('Account is not allowed');
  return decoded;
}

export function getAdminDb() { return getFirestore(getAdminApp(), DATABASE_ID); }
export function mayReleaseKey(unlockAt: string, now = new Date()) { return Date.parse(unlockAt) <= now.getTime(); }
export function buildDueMessagePush(messageId: string) { return { type: 'scheduled_message', title: 'Đôi lời muốn nói', body: 'Bạn có một lời nhắn vừa được mở.', url: '/?messages=1', tag: `scheduled-message-${messageId}` }; }

function key() {
  const secret = process.env.SCHEDULED_MESSAGES_KEY_SECRET;
  if (!secret || secret.length < 32) throw new Error('Scheduled-message encryption is not configured');
  return createHash('sha256').update(secret).digest();
}
export function sealKeyMaterial(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
export function unsealKeyMaterial(value: { ciphertext: string; iv: string; tag: string }) {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
export async function assertParticipant(coupleId: string, uid: string, recipientUid?: string) {
  const couple = await getAdminDb().collection('couples').doc(coupleId).get();
  const data = couple.data() || {}; const users = [String(data.user1Uid || data.user1Id || ''), String(data.user2Uid || data.user2Id || '')].filter(Boolean);
  if (!users.includes(uid) || (recipientUid && (!users.includes(recipientUid) || recipientUid === uid))) throw new Error('User is not a valid couple participant');
}
