import { getMessaging } from 'firebase-admin/messaging';
import { buildDueMessagePush, getAdminApp, getAdminDb } from './admin';

export default async function handler(req: any, res: any) {
  if (req.headers?.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const db = getAdminDb(); const now = new Date().toISOString();
    const due = await db.collectionGroup('scheduled_messages').where('unlockAt', '<=', now).where('notifiedAt', '==', null).get();
    let sent = 0;
    for (const message of due.docs) {
      const data = message.data(); const tokens = await message.ref.parent.parent!.collection('push_tokens').where('uid', '==', data.recipientUid).get();
      const fids = tokens.docs.map((token) => String(token.data().fid || '')).filter(Boolean);
      if (fids.length) { const payload = buildDueMessagePush(message.id); await getMessaging(getAdminApp()).sendEachForMulticast({ fids, data: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])) } as any); sent += fids.length; }
      await message.ref.update({ notifiedAt: now });
    }
    return res.status(200).json({ notifiedMessages: due.size, sent });
  } catch (error: any) { return res.status(500).json({ error: error?.message || 'Unable to notify due messages' }); }
}
