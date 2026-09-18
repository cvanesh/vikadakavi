// Encrypts dist/bundle.js -> dist/payload.enc.js (AES-256-GCM, PBKDF2-SHA256).
// Wire format (base64): salt[16] | iv[12] | ciphertext+tag
// Passphrase: $VIKADAKAVI_PASSPHRASE, else a hidden prompt. Never written to disk.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';

export const ITERATIONS = 310000;

// Tests build a real payload so the real unlock gate is exercised. Payloads
// built with this passphrase are stamped `t:1`, and tools/check-payload.mjs
// fails the deploy if a stamped payload ever reaches main.
export const TEST_PASSPHRASE = 'test';

export async function deriveKey(passphrase, salt, iterations = ITERATIONS) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  ));
  const out = new Uint8Array(salt.length + iv.length + ct.length);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(ct, salt.length + iv.length);
  return Buffer.from(out).toString('base64');
}

function promptHidden(question) {
  return new Promise((done) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        stdout.write('\n');
        done(value);
      } else if (ch === '') {
        stdout.write('\n');
        process.exit(130);
      } else if (ch === '') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const bundle = readFileSync(resolve(root, 'dist/bundle.js'), 'utf8');

  let passphrase = process.env.VIKADAKAVI_PASSPHRASE;
  if (!passphrase) {
    passphrase = await promptHidden('Passphrase: ');
    const confirm = await promptHidden('Confirm:    ');
    if (passphrase !== confirm) {
      console.error('Passphrases do not match.');
      process.exit(1);
    }
  }
  if (passphrase !== TEST_PASSPHRASE && passphrase.length < 8) {
    console.error('Passphrase must be at least 8 characters.');
    process.exit(1);
  }

  const isTest = passphrase === TEST_PASSPHRASE;
  const data = await encrypt(bundle, passphrase);
  writeFileSync(
    resolve(root, 'dist/payload.enc.js'),
    `window.PAYLOAD={v:1,iter:${ITERATIONS},${isTest ? 't:1,' : ''}data:"${data}"};\n`
  );
  console.log(
    `payload.enc.js: ${(data.length / 1024).toFixed(1)} KB base64` +
    (isTest ? '  ⚠ TEST PAYLOAD — do not deploy' : '')
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
