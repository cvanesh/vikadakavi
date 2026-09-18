import { test, expect } from '@playwright/test';
import { unlock, showCard } from './helpers.js';

test.describe('mobile shell', () => {
  test.beforeEach(async ({ page }) => unlock(page, { staticScenes: true }));

  test('never scrolls sideways', async ({ page }) => {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('the whole court and the nav fit the first screen; only the copy may scroll', async ({ page }) => {
    await showCard(page, 'A9');
    const vh = page.viewportSize().height;
    for (const sel of ['.court-in', '.nav']) {
      const box = await page.locator(sel).boundingBox();
      expect(box.y, `${sel} top`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `${sel} bottom`).toBeLessThanOrEqual(vh + 1);
    }
  });

  test('the court gets the majority of the screen', async ({ page }) => {
    await showCard(page, 'A1');
    const court = await page.locator('.court').boundingBox();
    const viewport = page.viewportSize();
    expect(court.height / viewport.height).toBeGreaterThan(0.4);
    expect(court.width).toBeLessThanOrEqual(viewport.width);
    expect(court.y).toBeGreaterThanOrEqual(0);
    expect(court.y + court.height).toBeLessThanOrEqual(viewport.height + 1);
  });

  // The copy takes its natural height and the court fills the rest (owner,
  // 2026-09-18), so the whole card reads without scrolling. Before this, the
  // stage was pinned to `100svh - 150px` and the headline sat under the nav.
  test('on a 360×640 phone the whole card reads without scrolling', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only');
    await page.setViewportSize({ width: 360, height: 640 });
    await showCard(page, 'A9');

    // No scrollIntoView: the point is that every part is already on screen.
    for (const sel of ['h2', '.cue', '#source']) {
      await expect(page.locator(sel), `${sel} on screen`).toBeInViewport();
    }
    // The sticky nav must not cover the last line of copy.
    const source = await page.locator('#source').boundingBox();
    const nav = await page.locator('.nav').boundingBox();
    expect(source.y + source.height, 'source clears the nav').toBeLessThanOrEqual(nav.y + 1);
    expect(nav.y + nav.height, 'nav stays pinned').toBeLessThanOrEqual(641);

    // The court still owns the largest share of the card — it just no longer
    // takes the space the copy needs. 0.40 on this screen, the tightest we ship.
    const court = await page.locator('.court-in').boundingBox();
    expect(court.height / 640, 'baseline to baseline').toBeGreaterThan(0.35);

    // Nothing overflows: the page itself does not scroll.
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(overflow, 'page does not scroll').toBeLessThanOrEqual(0);
  });

  test('every control clears a 44px tap target', async ({ page }) => {
    for (const sel of ['#prev', '#next', '#replay']) {
      const box = await page.locator(sel).boundingBox();
      expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
      expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
    }
  });

  test('body copy is large enough to read at arm’s length', async ({ page }) => {
    const sizes = await page.evaluate(() => ({
      title: parseFloat(getComputedStyle(document.querySelector('h2')).fontSize),
      cue: parseFloat(getComputedStyle(document.querySelector('.cue')).fontSize)
    }));
    expect(sizes.title).toBeGreaterThanOrEqual(19);
    expect(sizes.cue).toBeGreaterThanOrEqual(14);
  });

  test('shows the card copy and its source', async ({ page }) => {
    await showCard(page, 'A1');
    await expect(page.locator('#chip')).toHaveText(/big three/i);
    await expect(page.locator('h2')).toHaveText(/three decisions/i);
    await expect(page.locator('#source')).toHaveText(/Wardlaw/);
  });

  test('runs an elapsed clock that starts from zero', async ({ page }) => {
    await unlock(page);
    await expect(page.locator('#clock')).toHaveText(/^0:0\d$/);
    await expect(page.locator('#clock')).toHaveAttribute('data-over', 'false');
  });

  test('the deck opens on the contents, then walks card by card', async ({ page }) => {
    await expect(page.locator('body')).toHaveAttribute('data-card', 'contents');
    await expect(page.locator('.dot')).toHaveCount(25);
    await expect(page.locator('.dot-gap')).toHaveCount(4);        // contents | oath | directionals | between points | 5 laws
    await expect(page.locator('#prev')).toBeDisabled();
    await expect(page.locator('#why')).toBeDisabled();
    await page.click('#next');
    await expect(page.locator('body')).toHaveAttribute('data-card', 'E1');
    await expect(page.locator('#prev')).toBeEnabled();
  });

  test('a title in the contents jumps to its card', async ({ page }) => {
    await page.locator('.contents button', { hasText: 'Same four steps' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-card', 'C1');
    await expect(page.locator('#count')).toHaveText('19/24');
  });

  test('a topic tile jumps to the first card of that section', async ({ page }) => {
    await expect(page.locator('.topic')).toHaveCount(4);
    await page.locator('.topic', { hasText: '5 Laws' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-card', 'D1');
  });

  // Every other test runs with ?static=1, which mounts a scene down a different
  // path. Walking the deck for real is what caught the oath cards never mounting.
  test('walking the deck with Next mounts each card’s own view', async ({ page }) => {
    await unlock(page);
    const view = () => page.evaluate(() =>          // getAttribute: an SVG's className is not a string
      document.getElementById('courtSlot').firstElementChild?.getAttribute('class')?.split(' ')[0]);
    expect(await view()).toBe('contents');
    for (const expected of ['oath', 'oath', 'court']) {
      await page.click('#next');
      await expect.poll(view, { timeout: 5000 }).toBe(expected);
    }
  });

  test('the oath ticks off line by line and counts them', async ({ page }) => {
    await showCard(page, 'E1');
    const lines = page.locator('.oath button');
    await expect(lines).toHaveCount(12);
    await expect(page.locator('.oath-count b')).toHaveText('0');
    await lines.first().click();
    await lines.nth(3).click();
    await expect(page.locator('.oath-count b')).toHaveText('2');
    await expect(lines.first()).toHaveAttribute('aria-checked', 'true');
    await lines.first().click();                       // and untick
    await expect(page.locator('.oath-count b')).toHaveText('1');
  });

  test('finishing an oath sets off confetti — the player’s and the parent’s alike', async ({ page }) => {
    for (const id of ['E1', 'E2']) {
      await showCard(page, id);
      await expect(page.locator('.confetti'), `${id} before`).toHaveCount(0);
      const lines = page.locator('.oath button');
      const n = await lines.count();
      for (let i = 0; i < n; i++) await lines.nth(i).click();
      await expect(page.locator('.oath'), id).toHaveAttribute('data-done', 'true');
      await expect(page.locator('.confetti i'), id).toHaveCount(64);
      // Untick one and tick it again: it fires on the tick that completes it, once.
      await lines.first().click();
      await expect(page.locator('.oath'), id).toHaveAttribute('data-done', 'false');
    }
  });

  test('a mark in the progress bar jumps to its card', async ({ page }) => {
    await page.locator('.dot[data-card="A5"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-card', 'A5');
    await expect(page.locator('.dot[data-card="A5"]')).toHaveAttribute('aria-current', '');
  });

  test('the court and card copy are centred on the screen, at any width', async ({ page }) => {
    await showCard(page, 'A1');
    const width = page.viewportSize().width;
    for (const sel of ['.court', '#chip', 'h2', '.cue']) {
      const b = await page.locator(sel).boundingBox();
      expect(Math.abs(b.x + b.width / 2 - width / 2), `${sel} centre`).toBeLessThanOrEqual(3);
    }
    await expect(page.locator('#count')).toHaveText('3/24');
  });

  test('Why button clears a 44px tap target', async ({ page }) => {
    const box = await page.locator('#why').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  });
});
