import { test, expect } from '@playwright/test';
import { unlock, sceneDone, showCard } from './helpers.js';

// A4 — inside ball, change direction — is the reference rally these assert on.
test.describe('court rendering', () => {
  test.beforeEach(async ({ page }) => {
    await unlock(page);
    await showCard(page, 'A4');
    await page.evaluate(() => { window.__vk.playStep(0); });   // the forehand rally alone
  });

  test('draws a full court from the geometry module', async ({ page }) => {
    const court = page.locator('.court');
    await expect(court).toHaveAttribute('viewBox', /^-6\.885 -15\.785 13\.77 30\.07$/);
    await expect(court.locator('.court-in')).toHaveCount(1);
    await expect(court.locator('.court-lines line')).toHaveCount(11);
    await expect(court.locator('.court-net .net-post')).toHaveCount(2);
  });

  test('the scene draws the incoming ball and the reply', async ({ page }) => {
    await expect(page.locator('.trail-incoming')).toHaveCount(1);
    await expect(page.locator('.trail-outgoing')).toHaveCount(1);
    await expect(page.locator('.ball')).toHaveCount(1);
  });

  test('arrows show which way each ball is travelling', async ({ page }) => {
    await sceneDone(page);

    const angles = async (sel) => page.locator(sel).evaluateAll((nodes) =>
      nodes.map((n) => {
        const m = n.getAttribute('transform').match(/rotate\(([-\d.]+)\)/);
        return Number(m[1]);
      }));

    const incoming = await angles('.arrow-incoming');
    const outgoing = await angles('.arrow-outgoing');
    expect(incoming.length).toBeGreaterThan(0);
    expect(outgoing.length).toBeGreaterThan(0);

    // Our player is at the top. The ball comes up the screen to him (pointing
    // in -y, so a negative angle) and his reply goes back down (+y, positive).
    for (const a of incoming) expect(a).toBeLessThan(0);
    for (const a of outgoing) expect(a).toBeGreaterThan(0);

    await expect(page.locator('.arrow[opacity="1"]'))
      .toHaveCount(incoming.length + outgoing.length);
  });

  test('the ball comes to rest at the end of the reply, not mid-court',
    async ({ page }) => {
      await sceneDone(page);
      const ball = await page.locator('.ball').evaluate((n) => ({
        x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy'))
      }));
      // Our player is on the far side, so his reply finishes deep in the
      // opponent's corner at the bottom of the screen, across from his forehand.
      expect(ball.y).toBeGreaterThan(10);
      expect(ball.x).toBeGreaterThan(2);
    });

  test('the player changes from ready to the stroke', async ({ page }) => {
    const frames = page.locator('.player .silhouette-frame');
    await expect(frames).toHaveCount(2);
    await expect(frames.nth(0)).toHaveAttribute('data-frame', 'ready');
    await expect(frames.nth(1)).toHaveAttribute('data-frame', 'forehand');

    await sceneDone(page);
    // Ends on the stroke, not still waiting in ready position.
    await expect(frames.nth(1)).toHaveAttribute('opacity', '1');
    await expect(frames.nth(0)).toHaveAttribute('opacity', '0');
  });

  test('the animation runs to completion and marks both bounces', async ({ page }) => {
    await sceneDone(page);
    const shown = page.locator('.bounce[opacity="1"]');
    await expect(shown).toHaveCount(2); // ghost trail has no bounce
  });

  test('trails are fully drawn once the scene is done', async ({ page }) => {
    await sceneDone(page);
    // WebKit reports lengths as "0px", so read the computed value, not the
    // raw inline string.
    const offsets = await page.locator('.trail').evaluateAll(
      (nodes) => nodes.map((n) => parseFloat(getComputedStyle(n).strokeDashoffset) || 0)
    );
    for (const o of offsets) expect(Math.abs(o)).toBeLessThan(0.01);
  });

  test('reduced motion composes the final frame instead of animating',
    async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await unlock(page);
      await showCard(page, 'A4');
      await expect(page.locator('.court')).toHaveAttribute('data-scene-state', 'done');
      await ctx.close();
    });

  test('static mode renders the composed frame for screenshot review',
    async ({ page }) => {
      await unlock(page, { staticScenes: true });
      await showCard(page, 'A4');
      await expect(page.locator('.court')).toHaveAttribute('data-scene-state', 'done');
    });
});
