import { assertParticipant, getAdminDb, sealKeyMaterial, verifyAllowedUser } from './admin.js';
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await verifyAllowedUser(req); const body = req.body || {}; const unlockAt = String(body.unlockAt || '');
    if (!body.coupleId || !body.recipientUid || !body.ciphertext || !body.iv || !body.key || !Number.isFinite(Date.parse(unlockAt)) || Date.parse(unlockAt) <= Date.now()) return res.status(400).json({ error: 'Invalid scheduled message' });
    await assertParticipant(String(body.coupleId), user.uid, String(body.recipientUid));
    const db = getAdminDb(); const ref = db.collection('couples').doc(String(body.coupleId)).collection('scheduled_messages').doc();
    await ref.set({ senderUid: user.uid, recipientUid: String(body.recipientUid), ciphertext: String(body.ciphertext), iv: String(body.iv), unlockAt: new Date(unlockAt).toISOString(), createdAt: new Date().toISOString(), notifiedAt: null });
    await db.collection('scheduled_message_keys').doc(ref.id).set({ coupleId: String(body.coupleId), ...sealKeyMaterial(String(body.key)) });
    return res.status(201).json({ id: ref.id });
  } catch (error: any) { return res.status(error?.message?.includes('token') || error?.message?.includes('allowed') ? 401 : 500).json({ error: error?.message || 'Unable to create scheduled message' }); }
}
