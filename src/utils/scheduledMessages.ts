export interface ScheduledMessageDraft {
  content: string;
  unlockAt: string;
}

export interface EncryptedScheduledMessage {
  ciphertext: string;
  iv: string;
  key: string;
  unlockAt: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getSubtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Thiết bị không hỗ trợ mã hóa an toàn.');
  }

  return globalThis.crypto.subtle;
}

export function validateUnlockAt(unlockAt: string): void {
  const timestamp = Date.parse(unlockAt);

  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    throw new Error('Thời gian mở thư phải ở trong tương lai.');
  }
}

export async function encryptScheduledMessage(
  content: string,
  unlockAt: string
): Promise<EncryptedScheduledMessage> {
  validateUnlockAt(unlockAt);

  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('Nội dung thư không được để trống.');
  }

  const subtle = getSubtleCrypto();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(normalizedContent)
  );
  const rawKey = await subtle.exportKey('raw', key);

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    key: bytesToBase64(new Uint8Array(rawKey)),
    unlockAt: new Date(unlockAt).toISOString(),
  };
}

export async function decryptScheduledMessage(
  encrypted: EncryptedScheduledMessage
): Promise<string> {
  const subtle = getSubtleCrypto();
  const key = await subtle.importKey(
    'raw',
    base64ToBytes(encrypted.key),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const plaintext = await subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(encrypted.iv) },
    key,
    base64ToBytes(encrypted.ciphertext)
  );

  return decoder.decode(plaintext);
}
