import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('home uses the anniversary doodle for the seven-day countdown', async () => {
  const source = await readFile(
    new URL('../src/components/home/HomeTab.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /import \{ AnniversaryDoodle \} from '\.\/AnniversaryDoodle';/);
  assert.match(source, /<AnniversaryDoodle/);
});
