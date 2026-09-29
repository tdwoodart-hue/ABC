import assert from 'node:assert/strict';
import test from 'node:test';

const api = await import('../api/scheduled-messages/admin.ts');

test('refuses key release before the scheduled opening time', () => {
  assert.equal(
    api.mayReleaseKey('2030-01-01T00:00:00.000Z', new Date('2029-12-31T23:59:59.000Z')),
    false
  );
});

test('allows key release once the scheduled opening time has arrived', () => {
  assert.equal(
    api.mayReleaseKey('2030-01-01T00:00:00.000Z', new Date('2030-01-01T00:00:00.000Z')),
    true
  );
});

test('builds a generic due-message notification without plaintext content', () => {
  const payload = api.buildDueMessagePush('message-123');

  assert.deepEqual(payload, {
    type: 'scheduled_message',
    title: 'Đôi lời muốn nói',
    body: 'Bạn có một lời nhắn vừa được mở.',
    url: '/?messages=1',
    tag: 'scheduled-message-message-123',
  });
  assert.equal('content' in payload, false);
});
