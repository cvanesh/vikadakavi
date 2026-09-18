import { expect } from '@playwright/test';
import { TEST_PASSPHRASE } from '../tools/encrypt.mjs';

export { TEST_PASSPHRASE };

/** Open the app and get through the gate. `static` freezes scenes at their end frame. */
export async function unlock(page, { staticScenes = false } = {}) {
  await page.goto(staticScenes ? '/index.html?static=1' : '/index.html');
  await page.fill('#pass', TEST_PASSPHRASE);
  await page.click('#go');
  await expect(page.locator('#app')).toBeVisible({ timeout: 15_000 });
}

/** Show a card by id, e.g. 'A4'. */
export async function showCard(page, id) {
  await page.evaluate((cid) => window.__vk.render(window.__vk.cards.findIndex((c) => c.id === cid)), id);
  await expect(page.locator('body')).toHaveAttribute('data-card', id);
}

/** Wait for the current card's scene to finish animating. */
export async function sceneDone(page) {
  await expect(page.locator('.court')).toHaveAttribute('data-scene-state', 'done',
    { timeout: 15_000 });
}
