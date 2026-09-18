import { test, expect } from '@playwright/test';
import { unlock } from './helpers.js';

// sw.js serves cache-first under a fixed cache name, so a new deploy would sit
// unseen until the second launch. index.html closes that gap by comparing
// validators at startup instead of bumping a version on every build.
//
// These tests drive the cache directly rather than a real service worker: the
// worker is https-only, and the check reads the same Cache Storage either way.
const CACHE = 'vk-v1';

// Playwright's WebKit drops Cache Storage on every reload of an http origin —
// verified with an empty page and no app code: seeded before, gone after.
// Chromium keeps it, and so does real Safari over https, which is where this
// ships. So the checks that need the cache to survive a reload skip there;
// it is a limit of the harness, not of the app.
const needsCacheAcrossReload = (browserName) =>
  test.skip(browserName === 'webkit', 'WebKit clears Cache Storage on reload over http');

/** Put a response in the cache under `url` carrying a deliberately wrong ETag. */
async function seedStale(page, url) {
  await page.evaluate(async ([cacheName, key]) => {
    const cache = await caches.open(cacheName);
    const real = await fetch(key, { cache: 'no-store' });
    const body = await real.arrayBuffer();
    await cache.put(key, new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/javascript', 'ETag': '"stale-on-purpose"' }
    }));
  }, [CACHE, url]);
}

// Returns null rather than throwing while the page is reloading under us, so a
// poll keeps trying. Assertions compare against the real ETag, never merely
// "not the stale one" — an error sentinel would satisfy that by accident.
const etagIn = async (page, url) => {
  try {
    return await page.evaluate(async ([cacheName, key]) => {
      const hit = await (await caches.open(cacheName)).match(key);
      return hit ? hit.headers.get('ETag') : null;
    }, [CACHE, url]);
  } catch {
    return null;                       // navigating; the poll will come back
  }
};

/** What the server is actually serving right now. */
const servedEtag = async (page, url) =>
  (await page.request.head(url)).headers()['etag'];

test.describe('stale cache refresh', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(async () => {
      for (const k of await caches.keys()) await caches.delete(k);
    });
  });

  test('refreshes the cached payload and reloads when the deploy changed', async ({ page, browserName }) => {
    needsCacheAcrossReload(browserName);
    const served = await servedEtag(page, '/dist/payload.enc.js');
    await seedStale(page, './dist/payload.enc.js');
    expect(await etagIn(page, './dist/payload.enc.js')).toBe('"stale-on-purpose"');

    // A mark that only survives while this document does; a reload clears it.
    await page.evaluate(() => { window.__survived = true; });
    await page.reload();

    await expect.poll(
      () => etagIn(page, './dist/payload.enc.js'),
      { message: 'cached payload carries the served ETag', timeout: 15_000 }
    ).toBe(served);

    // It reloaded rather than leaving the stale app on screen.
    await expect.poll(
      () => page.evaluate(() => window.__survived === true).catch(() => null),
      { message: 'the document was replaced', timeout: 15_000 }
    ).toBe(false);
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('leaves an up-to-date cache alone and does not reload', async ({ page }) => {
    // Cache the real responses, validators and all.
    await page.evaluate(async ([cacheName]) => {
      const cache = await caches.open(cacheName);
      await cache.addAll(['./', './dist/payload.enc.js']);
    }, [CACHE]);

    await page.evaluate(() => { window.__survived = true; });
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.__survived === true)).toBe(true);
  });

  test('never reloads out from under someone who is typing', async ({ page, browserName }) => {
    needsCacheAcrossReload(browserName);
    const served = await servedEtag(page, '/dist/payload.enc.js');
    await seedStale(page, './dist/payload.enc.js');
    await page.reload();
    // Type immediately, before the check can finish its round trip.
    await page.fill('#pass', 'half-typed');

    await expect.poll(
      () => etagIn(page, './dist/payload.enc.js'),
      { message: 'cache still refreshes in the background', timeout: 15_000 }
    ).toBe(served);

    // The cache is new for next launch, but this session was not interrupted.
    await expect(page.locator('#pass')).toHaveValue('half-typed');
  });

  test('a stale cache does not stop the app unlocking', async ({ page }) => {
    await seedStale(page, './dist/payload.enc.js');
    await unlock(page);
    await expect(page.locator('.contents')).toBeVisible();
  });

  test('leaves no cache-busting URLs behind in the cache', async ({ page, browserName }) => {
    needsCacheAcrossReload(browserName);
    const served = await servedEtag(page, '/dist/payload.enc.js');
    await seedStale(page, './dist/payload.enc.js');
    await page.reload();

    await expect.poll(
      () => etagIn(page, './dist/payload.enc.js'),
      { timeout: 15_000 }
    ).toBe(served);

    // The reload may still be in flight, so poll rather than assume it settled.
    await expect.poll(async () => {
      try {
        const keys = await page.evaluate(async ([cacheName]) => {
          const cache = await caches.open(cacheName);
          return (await cache.keys()).map((r) => r.url);
        }, [CACHE]);
        return keys.filter((u) => u.includes('__fresh='));
      } catch {
        return null;                   // navigating; try again
      }
    }, { message: 'no cache-busted URLs left behind', timeout: 15_000 }).toEqual([]);
  });

  // Courtside there may be no signal. A check that cannot reach the network
  // must leave the cached app exactly as it found it — never delete first.
  // (Reloading with the network off cannot be tested here: the worker is
  // https-only, so on localhost there is nothing to serve the page offline.)
  test('a check that cannot reach the network leaves the cache alone', async ({ page, browserName }) => {
    needsCacheAcrossReload(browserName);
    await seedStale(page, './dist/payload.enc.js');
    await page.route('**/payload.enc.js*', (route) =>
      route.request().method() === 'HEAD' ? route.abort() : route.continue());

    await page.reload();
    await page.waitForTimeout(2000);

    // Still the offline copy, untouched, and the app still opens on it.
    expect(await etagIn(page, './dist/payload.enc.js')).toBe('"stale-on-purpose"');
    await expect(page.locator('#gate')).toBeVisible();
  });
});
