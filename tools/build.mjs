// Bundles src/ (JS + CSS + inlined silhouette SVGs) into one IIFE string.
// Output: dist/bundle.js — plaintext, gitignored, input to encrypt.mjs.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(root, 'dist'), { recursive: true });

const result = await build({
  entryPoints: [resolve(root, 'src/app/main.js')],
  outfile: resolve(root, 'dist/bundle.js'),
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  minify: process.env.NODE_ENV !== 'development',
  sourcemap: false,
  legalComments: 'none',
  // Book figures ship as data URLs inside the encrypted bundle, never as files.
  loader: { '.css': 'text', '.svg': 'text', '.png': 'dataurl' },
  logLevel: 'info',
  metafile: true
});

const bytes = Object.values(result.metafile.outputs)[0].bytes;
console.log(`bundle: ${(bytes / 1024).toFixed(1)} KB`);
