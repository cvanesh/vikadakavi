// Screenshot sweep for eyeballing the visualisation: every card, its Why panel,
// on each target. Assumes a test-passphrase payload and a server on :8080.
// Output: dev-tools/artifacts/visual/ plus a contact sheet per target.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_PASSPHRASE } from './encrypt.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dev-tools/artifacts/visual');
mkdirSync(out, { recursive: true });

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const ONLY = process.env.TARGET;
const TARGETS = [
  ['phone-390', devices['Pixel 5']],
  ['phone-small-360', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }],
  ['desktop-1440', { viewport: { width: 1440, height: 900 } }]
].filter(([name]) => !ONLY || name === ONLY);

const browser = await chromium.launch();
for (const [name, opts] of TARGETS) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/index.html?static=1`);
  await page.fill('#pass', TEST_PASSPHRASE);
  await page.click('#go');
  await page.waitForSelector('#app', { timeout: 15_000 });

  const ids = await page.evaluate(() => window.__vk.cards.map((c) => c.id));
  for (const [i, id] of ids.entries()) {
    await page.evaluate((n) => window.__vk.render(n), i);
    await page.waitForSelector('[data-scene-state="done"]', { timeout: 15_000 });
    await page.screenshot({ path: resolve(out, `${name}-${id}.png`) });
  }
  // One Why panel per target, opened on a card with several figures.
  await page.evaluate(() => window.__vk.render(window.__vk.cards.findIndex((c) => c.id === 'A8')));
  await page.click('#why');
  await page.screenshot({ path: resolve(out, `${name}-A8-why.png`) });
  await ctx.close();
  console.log(`${name} ✓ ${ids.length} cards${errors.length ? ` — page errors: ${errors.join('; ')}` : ''}`);
}
await browser.close();
console.log(`→ ${out}`);
