import { test, expect } from '@playwright/test';
import { unlock, sceneDone, showCard } from './helpers.js';

test.describe('Module A deck', () => {
  test('every card draws, finishes and never scrolls sideways', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await unlock(page, { staticScenes: true });
    const ids = await page.evaluate(() => window.__vk.cards.map((c) => c.id));
    expect(ids).toHaveLength(30);           // contents + 2 oath + 16 directionals + 1 between points + 5 laws + 5 math
    for (const id of ids) {
      await showCard(page, id);
      await expect(page.locator('[data-scene-state="done"]'), id).toHaveCount(1);
      // Vertical scroll is allowed on phones: the copy sits below a full-height court.
      const { scrollWidth, clientWidth } = await page.evaluate(() =>
        ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(scrollWidth, `${id} width`).toBeLessThanOrEqual(clientWidth + 1);
    }
    expect(errors).toEqual([]);
  });

  test('every rally the scripts describe is drawn as a step', async ({ page }) => {
    await unlock(page, { staticScenes: true });
    const counts = await page.evaluate(() => Object.fromEntries(window.__vk.cards.map((c) => [c.id, c.side ? 1 : c.scenes.length])));
    expect(counts).toMatchObject({ A2: 4, A3: 2, A4: 2, A5: 2, A6: 2, A8: 4, A9: 3, A10: 3, A11: 3, A12: 5, A14: 2, D2: 2 });
  });

  test('the margins card measures the net clearance, then the room inside their lines', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'D2');
    // Step 1 is a side view: net clearance is a height, which a top view cannot show.
    // Both edges of the band are dimensioned back to the tape, so they read as clearance.
    await expect(page.locator('.court.sideview')).toBeVisible();
    await expect(page.locator('.court text', { hasText: '3 ft' })).toHaveCount(1);
    await expect(page.locator('.court text', { hasText: '5 ft' })).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#step')).toHaveText(/^2\/2/);
    // Step 2 is the top view: a rule against their sideline and against their baseline.
    await expect(page.locator('.court .rule')).toHaveCount(6);   // two rules, a line and two ticks each
    await expect(page.locator('.court text', { hasText: '3–4 ft' })).toHaveCount(2);
  });

  test('the 5 Laws section carries all five laws, spin beside the margins', async ({ page }) => {
    await unlock(page, { staticScenes: true });
    const laws = await page.evaluate(() =>
      window.__vk.cards.filter((c) => c.module === '5 Laws').map((c) => c.id));
    expect(laws).toEqual(['D1', 'D2', 'D5', 'D3', 'D4']);
    await showCard(page, 'D5');
    await expect(page.locator('.court.sideview')).toBeVisible();
  });

  test('the hidden-math section draws bars for the numbers and a court for the shots', async ({ page }) => {
    await unlock(page, { staticScenes: true });
    const math = await page.evaluate(() =>
      window.__vk.cards.filter((c) => c.module === 'The hidden math').map((c) => c.id));
    expect(math).toEqual(['B1', 'B2', 'B3', 'B4', 'B5']);
    // B1's two bars are the whole argument: 55% of points, 91% of matches.
    await showCard(page, 'B1');
    await expect(page.locator('.bars li')).toHaveCount(3);
    await expect(page.locator('.bars-value').first()).toHaveText('55%');
    await expect(page.locator('.bars-value').nth(1)).toHaveText('91%');
    // The two shot cards stay on the court.
    for (const id of ['B3', 'B5']) {
      await showCard(page, id);
      await expect(page.locator('.court'), id).toBeVisible();
      await expect(page.locator('.bars'), id).toHaveCount(0);
    }
  });

  test('the leverage ladder steps from the hinge scores to the break point', async ({ page }) => {
    // Not static: static mode composes the last step, and the point here is the
    // move from the first to the second.
    await unlock(page);
    await showCard(page, 'B2');
    // Step 1 is the cheap end of the ladder, step 2 the two that decide the game.
    const lit = () => page.locator('.bars li[data-dim="false"] .bars-label').allTextContents();
    expect(await lit()).toEqual(['30–0', '40–0']);
    await page.click('#step');
    await expect.poll(lit).toEqual(['30–40 · break point', '30–30 · deuce']);
    // The numbers on the bars are the same units the card's words use.
    await expect(page.locator('.bars-value').first()).toHaveText('69');
    // Break point is drawn longer than deuce, because 0.69 beats 0.46.
    await expect(page.locator('[data-scene-state="done"]')).toHaveCount(1, { timeout: 15_000 });
    const width = (n) => page.locator('.bars-track i').nth(n).boundingBox().then((b) => b.width);
    expect(await width(0)).toBeGreaterThan(await width(1));
  });

  test('the opening D3 leaves them is drawn only once he has recovered', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'D3');
    const opening = page.locator('.court text', { hasText: 'line only (hard)' });
    await expect(page.locator('.court text', { hasText: 'recover here' }))
      .toHaveAttribute('opacity', '1', { timeout: 15_000 });
    await expect(opening).toHaveAttribute('opacity', '0');       // he is still running
    await expect(opening).toHaveAttribute('opacity', '1', { timeout: 15_000 });
  });

  test('steps wait for the player: the arrow keys move them, the nav arrows move cards', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'A6');
    await expect(page.locator('#step')).toHaveText(/^1\/2/);
    await sceneDone(page);
    // No timer takes it on — it is still on step 1 a good while later.
    await page.waitForTimeout(3000);
    await expect(page.locator('#step')).toHaveText(/^1\/2/);

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#step')).toHaveText(/^2\/2/);
    await sceneDone(page);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#step')).toHaveText(/^1\/2/);

    // Past the last step, an arrow key rolls into the next card.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('body')).toHaveAttribute('data-card', 'A7');

    // The nav arrow skips the rest of a card's steps.
    await showCard(page, 'A6');
    await page.click('#next');
    await expect(page.locator('body')).toHaveAttribute('data-card', 'A7');
  });

  test('tapping the step counter takes the next step', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'A6');
    await expect(page.locator('#step')).toHaveAttribute('data-more', 'true');
    await page.click('#step');
    await expect(page.locator('#step')).toHaveText(/^2\/2/);
    await expect(page.locator('#step')).toHaveAttribute('data-more', 'false');
  });

  test('stepping back from a card lands on the last step of the one before', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'A7');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('body')).toHaveAttribute('data-card', 'A6');
    await expect(page.locator('#step')).toHaveText(/^2\/2/);
  });

  test('Why shows the book figures in place of the court, and closes on the next card', async ({ page }) => {
    await unlock(page, { staticScenes: true });
    await showCard(page, 'A8');
    await expect(page.locator('#whyPanel')).toBeHidden();
    await page.click('#why');
    await expect(page.locator('#whyPanel')).toBeVisible();
    await expect(page.locator('#courtSlot')).toBeHidden();
    await expect(page.locator('#whyText')).toHaveText(/neutralise/);
    const imgs = page.locator('#whyFigs img');
    await expect(imgs).toHaveCount(6);
    expect(await imgs.first().evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    expect(await imgs.first().getAttribute('src')).toMatch(/^data:image\/png;base64,/);

    await page.click('#why');                        // closing brings the court back
    await expect(page.locator('#whyPanel')).toBeHidden();
    await expect(page.locator('#courtSlot')).toBeVisible();

    await page.click('#why');                        // Why is optional: the next card opens on its court
    await page.click('#next');
    await expect(page.locator('body')).toHaveAttribute('data-card', 'A9');
    await expect(page.locator('#whyPanel')).toBeHidden();
    await expect(page.locator('#courtSlot')).toBeVisible();
    await expect(page.locator('#why')).toHaveAttribute('aria-pressed', 'false');
  });

  test('replay starts the player back in the ready position', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'A13');                          // a single-rally card
    await sceneDone(page);
    const frames = page.locator('.player .silhouette-frame');
    await expect(frames.nth(1)).toHaveCSS('opacity', '1');
    await page.click('#replay');
    await expect(frames.nth(0)).toHaveCSS('opacity', '1');
    await expect(frames.nth(1)).toHaveCSS('opacity', '0');
  });

  test('a runner starts where he was and ends where he hits', async ({ page }) => {
    await unlock(page);
    await showCard(page, 'A11');
    await page.evaluate(() => { window.__vk.playStep(0); });
    const x =() => page.locator('.player').evaluate((n) => Number(n.getAttribute('transform').match(/translate\(([-\d.]+)/)[1]));
    const start = await x();
    await sceneDone(page);
    expect(Math.abs((await x()) - start)).toBeGreaterThan(2);
  });
});
