import { test, expect } from '@playwright/test';
import { unlock, TEST_PASSPHRASE } from './helpers.js';

test.describe('unlock gate', () => {
  test('shows nothing but the gate before a passphrase is entered', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#gate')).toBeVisible();
    await expect(page.locator('#app')).toHaveCount(0);

    // No lesson content anywhere in the served HTML.
    const html = await page.content();
    expect(html).not.toContain('Wardlaw');
    expect(html).not.toContain('inside ball');
  });

  test('the shipped payload is ciphertext, not readable source', async ({ page }) => {
    const res = await page.request.get('/dist/payload.enc.js');
    const body = await res.text();
    expect(body).not.toContain('Wardlaw');
    expect(body).not.toContain('court-geometry');
    expect(body).not.toContain('function');
    expect(body).toMatch(/window\.PAYLOAD=\{v:1/);
  });

  test('rejects a wrong passphrase without mounting the app', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#pass', 'not-the-passphrase');
    await page.click('#go');
    await expect(page.locator('#msg')).toHaveText('Wrong passphrase.', { timeout: 15_000 });
    await expect(page.locator('#app')).toHaveCount(0);
    await expect(page.locator('#pass')).toHaveValue('');
  });

  test('accepts the right passphrase and removes the gate', async ({ page }) => {
    await unlock(page);
    await expect(page.locator('#gate')).toHaveCount(0);
    await expect(page.locator('.contents')).toBeVisible();   // the deck opens on its contents
  });

  test('drops the passphrase and payload from memory after unlocking', async ({ page }) => {
    await unlock(page);
    expect(await page.evaluate(() => window.PAYLOAD)).toBeNull();
    const stored = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage)
    }));
    expect(stored.local).not.toContain(TEST_PASSPHRASE);
    expect(stored.session).not.toContain(TEST_PASSPHRASE);
  });
});
