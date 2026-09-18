// Deploy guard: refuse to publish a payload built with the test passphrase,
// or a payload that is missing entirely.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let src;
try {
  src = readFileSync(resolve(root, 'dist/payload.enc.js'), 'utf8');
} catch {
  console.error('dist/payload.enc.js is missing. Run `npm run build` and commit it.');
  process.exit(1);
}

if (/[{,]t:1[,}]/.test(src)) {
  console.error('dist/payload.enc.js was built with the TEST passphrase. Rebuild before deploying.');
  process.exit(1);
}
if (!/data:"[A-Za-z0-9+/=]{500,}"/.test(src)) {
  console.error('dist/payload.enc.js does not look like a real payload.');
  process.exit(1);
}
console.log('payload ok');
