import { assertParticipant, getAdminDb, mayReleaseKey, unsealKeyMaterial, verifyAllowedUser } from './admin.js';
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await verifyAllowedUser(req); const { coupleId, messageId } = req.body || {}; const db = getAdminDb();
    const message = await db.collection('couples').doc(String(coupleId)).collection('scheduled_messages').doc(String(messageId)).get(); const data = message.data();
    if (!data || data.recipientUid !== user.uid) return res.status(403).json({ error: 'Message is not available to this account' });
    await assertParticipant(String(coupleId), user.uid); if (!mayReleaseKey(data.unlockAt)) return res.status(423).json({ error: 'Message is still locked' });
    const sealed = (await db.collection('scheduled_message_keys').doc(String(messageId)).get()).data(); if (!sealed) throw new Error('Key material is unavailable');
    return res.status(200).json({ key: unsealKeyMaterial(sealed as any) });
  } catch (error: any) { return res.status(500).json({ error: error?.message || 'Unable to release message key' }); }
}
