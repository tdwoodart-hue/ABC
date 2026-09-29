import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('More menu exposes Đôi lời muốn nói and modal keeps locked content hidden', async () => {
  const [menu, navigation, modal] = await Promise.all([
    readFile(new URL('../src/components/MoreMenuSheet.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/BottomNavigation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ScheduledMessagesModal.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(menu, /Đôi lời muốn nói/);
  assert.match(modal, /Thư sẽ mở lúc/);
  assert.match(modal, /isUnlocked/);
  assert.doesNotMatch(modal, /setOpened\(\(current\).*await/);
  assert.match(menu, /onOpenMessages/);
  assert.match(navigation, /ScheduledMessagesModal/);
  assert.match(modal, /Thư đến/);
  assert.match(modal, /Đã gửi/);
});
