import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  'gen-lang-client-0445953460';

const DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID ||
  'ai-studio-uscoupleapp-0b350c81-98ca-41de-97e9-ee7ef857209a';

const ALLOWED_EMAILS = new Set([
  'tdwoodart@gmail.com',
  'duong@gmail.com',
  'chucga@gmail.com',
]);

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY'
    );
  }

  return initializeApp({
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail,
      privateKey,
    }),
    projectId: PROJECT_ID,
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}


function getPublicBaseUrl(req: any): string {
  const configured =
    String(process.env.APP_URL || '').trim();

  if (configured) {
    try {
      const parsed = new URL(configured);

      if (parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // Fall back to the actual Vercel request host below.
    }
  }

  const host =
    String(
      req.headers?.['x-forwarded-host'] ||
      req.headers?.host ||
      ''
    ).trim();

  if (!host) {
    throw new Error(
      'APP_URL is missing/invalid and request host could not be detected'
    );
  }

  return `https://${host}`;
}

function toHttpsUrl(
  value: string,
  baseUrl: string
): string | undefined {
  if (!value) return undefined;

  try {
    const resolved =
      new URL(value, `${baseUrl}/`);

    if (resolved.protocol !== 'https:') {
      return undefined;
    }

    return resolved.toString();
  } catch {
    return undefined;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const authHeader =
      String(req.headers?.authorization || '');

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing Firebase ID token',
      });
    }

    const idToken = authHeader.slice(7);
    const app = getAdminApp();

    const decoded = await getAuth(app).verifyIdToken(idToken);
    const senderEmail =
      String(decoded.email || '').toLowerCase();

    if (
      !decoded.uid ||
      !senderEmail ||
      !ALLOWED_EMAILS.has(senderEmail)
    ) {
      return res.status(403).json({
        error: 'Account is not allowed to send Us notifications',
      });
    }

    const body = req.body || {};
    const coupleId =
      cleanText(body.coupleId, 120) || 'our_couple';

    const title = cleanText(body.title, 100);
    const messageBody = cleanText(body.body, 240);
    const type = cleanText(body.type, 60) || 'custom';
    const url = cleanText(body.url, 300) || '/';
    const imageUrl = cleanText(body.imageUrl, 1000);
    const tag =
      cleanText(body.tag, 100) ||
      `us-${type}-${Date.now()}`;

    const baseUrl = getPublicBaseUrl(req);

    /*
     * FCM WebpushFcmOptions.link requires a FULL HTTPS URL.
     * Frontend sends routes such as "/journal"; resolve them here.
     */
    const absoluteLink =
      toHttpsUrl(url, baseUrl) ||
      `${baseUrl}/`;

    const absoluteIcon =
      `${baseUrl}/icons/icon.png`;

    /*
     * FCM notification images should be public HTTPS URLs.
     * Do not pass data:image/... or base64 values.
     */
    const safeImageUrl =
      toHttpsUrl(imageUrl, baseUrl);

    if (!title || !messageBody) {
      return res.status(400).json({
        error: 'title and body are required',
      });
    }

    const targetEmails =
      senderEmail === 'chucga@gmail.com'
        ? new Set([
            'duong@gmail.com',
            'tdwoodart@gmail.com',
          ])
        : new Set(['chucga@gmail.com']);

    const db = getFirestore(app, DATABASE_ID);

    const tokenSnapshot = await db
      .collection('couples')
      .doc(coupleId)
      .collection('push_tokens')
      .get();

    const recipientDocs = tokenSnapshot.docs.filter((docSnap) => {
      const data = docSnap.data() || {};
      const email =
        String(data.email || '').toLowerCase();

      return (
        data.enabled !== false &&
        data.token &&
        data.uid !== decoded.uid &&
        targetEmails.has(email)
      );
    });

    const tokens = recipientDocs
      .map((docSnap) => String(docSnap.data().token || ''))
      .filter(Boolean);

    if (tokens.length === 0) {
      return res.status(200).json({
        ok: true,
        sent: 0,
        message:
          'Partner has not registered a push token yet.',
        senderEmail,
        targetEmails: Array.from(targetEmails),
      });
    }

    const response = await getMessaging(app).sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: messageBody,
        ...(safeImageUrl ? { imageUrl: safeImageUrl } : {}),
      },
      data: {
        type,
        url,
        senderUid: decoded.uid,
        senderEmail,
      },
      webpush: {
        notification: {
          icon: absoluteIcon,
          badge: absoluteIcon,
          tag,
          renotify: true,
        },
        fcmOptions: {
          link: absoluteLink,
        },
      },
    });

    const invalidIndexes: number[] = [];

    response.responses.forEach((item, index) => {
      if (item.success) return;

      const code = String(item.error?.code || '');

      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token')
      ) {
        invalidIndexes.push(index);
      }
    });

    await Promise.all(
      invalidIndexes.map((index) =>
        recipientDocs[index]?.ref.delete().catch(() => undefined)
      )
    );

    return res.status(200).json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
      removedInvalidTokens: invalidIndexes.length,
    });
  } catch (error: any) {
    console.error('send-push API error:', error);

    return res.status(500).json({
      error:
        error?.message ||
        'Unable to send notification',
    });
  }
}