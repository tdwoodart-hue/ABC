import assert from 'node:assert/strict';
import test from 'node:test';

const messages = await import('../src/utils/scheduledMessages.ts');

test('encrypts and decrypts a scheduled message without retaining plaintext', async () => {
  const encrypted = await messages.encryptScheduledMessage(
    'Chúc mừng kỷ niệm của chúng mình 💕',
    '2030-01-01T00:00:00.000Z'
  );

  assert.equal(encrypted.plaintext, undefined);
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.key);

  const plaintext = await messages.decryptScheduledMessage(encrypted);

  assert.equal(plaintext, 'Chúc mừng kỷ niệm của chúng mình 💕');
});

test('rejects tampered encryption data', async () => {
  const encrypted = await messages.encryptScheduledMessage(
    'Tin nhắn không được phép thay đổi',
    '2030-01-01T00:00:00.000Z'
  );

  await assert.rejects(
    messages.decryptScheduledMessage({
      ...encrypted,
      iv: encrypted.iv.replace(/^./, encrypted.iv.startsWith('A') ? 'B' : 'A'),
    })
  );
});

test('rejects a scheduled time that is not in the future', () => {
  assert.throws(
    () => messages.validateUnlockAt('2020-01-01T00:00:00.000Z'),
    /tương lai/i
  );
});
