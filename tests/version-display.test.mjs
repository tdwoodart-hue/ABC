import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('profile settings display the package version dynamically', async () => {
  const [profileSource, packageSource] = await Promise.all([
    readFile(new URL('../src/components/profile/ProfileTab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ]);
  const { version } = JSON.parse(packageSource);

  assert.equal(version, '0.3.18');
  assert.match(profileSource, /import appPackage from '\.\.\/\.\.\/\.\.\/package\.json';/);
  assert.match(profileSource, /const APP_VERSION = appPackage\.version;/);
  assert.match(profileSource, /v\{APP_VERSION\}/);
});
