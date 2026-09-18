// Playwright globalSetup: build a real encrypted payload with the test
// passphrase, so the suite exercises the real unlock gate.
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_PASSPHRASE } from './encrypt.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default function globalSetup() {
  const run = (script) => execFileSync('node', [resolve(root, 'tools', script)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VIKADAKAVI_PASSPHRASE: TEST_PASSPHRASE }
  });
  run('build.mjs');
  run('encrypt.mjs');
}

export { TEST_PASSPHRASE };
