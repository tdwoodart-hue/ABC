import express from 'express';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0445953460';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || 'ai-studio-uscoupleapp-0b350c81-98ca-41de-97e9-ee7ef857209a';

interface WakeUpConfirmBody {
  coupleId?: string;
  myUid?: string;
  myName?: string;
  partnerUid?: string;
  partnerName?: string;
  date?: string;
  timeFormatted?: string;
  source?: string;
}

export default async function wakeUpConfirmHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = String(req.headers?.authorization || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.idToken;

    const body: WakeUpConfirmBody = req.body || {};
    const coupleId = body.coupleId || 'our_couple';
    const myUid = body.myUid || '';
    const myName = body.myName || 'Người ấy';
    const partnerUid = body.partnerUid || '';
    const partnerName = body.partnerName || 'Bạn';
    const date = body.date || new Date().toISOString().slice(0, 10);
    const timeFormatted = body.timeFormatted || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const source = body.source || 'notification_cta';

    console.log(`[WakeUp CTA Confirm] Processing check-in for ${myName} (${myUid}) on ${date} at ${timeFormatted}`);

    // If idToken is available, try writing to Firestore via REST API with user's auth token
    let firestoreSynced = false;
    if (idToken) {
      try {
        const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/couples/${coupleId}/wakeUpLogs/${date}`;
        
        // Check if log already exists
        const checkRes = await fetch(docUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (checkRes.status === 404) {
          // Log doesn't exist yet -> Current user is winner!
          const nowIso = new Date().toISOString();
          const patchUrl = `${docUrl}?updateMask.fieldPaths=id&updateMask.fieldPaths=date&updateMask.fieldPaths=winnerUid&updateMask.fieldPaths=winnerName&updateMask.fieldPaths=winnerTime&updateMask.fieldPaths=winnerSource&updateMask.fieldPaths=loserUid&updateMask.fieldPaths=loserName&updateMask.fieldPaths=fineAmount&updateMask.fieldPaths=finePaid&updateMask.fieldPaths=createdAt`;

          const patchPayload = {
            fields: {
              id: { stringValue: date },
              date: { stringValue: date },
              winnerUid: { stringValue: myUid },
              winnerName: { stringValue: myName },
              winnerTime: { stringValue: timeFormatted },
              winnerSource: { stringValue: source },
              loserUid: { stringValue: partnerUid },
              loserName: { stringValue: partnerName },
              fineAmount: { integerValue: 5000 },
              finePaid: { booleanValue: true },
              createdAt: { stringValue: nowIso },
            },
          };

          const patchRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(patchPayload),
          });

          if (patchRes.ok) {
            firestoreSynced = true;
            console.log(`[WakeUp CTA Confirm] Created winner log for ${myName}`);

            // Also create fund record in finances
            const financesUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/couples/${coupleId}/finances`;
            await fetch(financesUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                fields: {
                  title: { stringValue: `Phạt dậy muộn (${partnerName})` },
                  amount: { integerValue: 5000 },
                  type: { stringValue: 'income' },
                  category: { stringValue: 'Đóng quỹ chung' },
                  paidByUid: { stringValue: partnerUid },
                  paidByName: { stringValue: partnerName },
                  date: { stringValue: date },
                  createdAt: { stringValue: nowIso },
                  note: { stringValue: `☀️ ${myName} dậy sớm lúc ${timeFormatted} nên ${partnerName} đóng phạt 5.000đ vào quỹ (xác nhận từ thông báo)` },
                  source: { stringValue: 'wake-up-challenge' },
                },
              }),
            });
          }
        } else if (checkRes.ok) {
          // Log exists, check if second person
          const existing = await checkRes.json();
          const existingWinnerUid = existing.fields?.winnerUid?.stringValue;

          if (existingWinnerUid !== myUid && !existing.fields?.loserWokeUpAt) {
            const patchSecondUrl = `${docUrl}?updateMask.fieldPaths=loserWokeUpAt&updateMask.fieldPaths=loserWakeSource&updateMask.fieldPaths=loserActualUid`;
            const patchSecondPayload = {
              fields: {
                loserWokeUpAt: { stringValue: timeFormatted },
                loserWakeSource: { stringValue: source },
                loserActualUid: { stringValue: myUid },
              },
            };

            await fetch(patchSecondUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify(patchSecondPayload),
            });

            firestoreSynced = true;
            console.log(`[WakeUp CTA Confirm] Updated second wake-up for ${myName}`);
          }
        }
      } catch (firestoreErr) {
        console.warn('[WakeUp CTA Confirm] Direct REST call to Firestore error:', firestoreErr);
      }
    }

    return res.json({
      success: true,
      recordedAt: timeFormatted,
      date,
      firestoreSynced,
      message: `Đã xác nhận thức dậy lúc ${timeFormatted} thành công!`,
    });
  } catch (error: any) {
    console.error('Error in wake-up confirm API:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi xử lý xác nhận thức dậy',
    });
  }
}
