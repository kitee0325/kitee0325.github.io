import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out = 'artifacts/hero-theme';
const browser = await chromium.launch(browserOptions);
const errors = [],
  checks = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  if (window === window.top)
    sessionStorage?.setItem('kitee-aquarium-demo-v1.3', 'done');
});
async function shot(name, selector) {
  await page.evaluate(() => scrollTo(0, 0));
  if (selector) {
    const box = await page.locator(selector).boundingBox(),
      cdp = await page.context().newCDPSession(page);
    const image = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { ...box, scale: 1 },
    });
    fs.writeFileSync(`${out}/${name}.png`, Buffer.from(image.data, 'base64'));
    await cdp.detach();
  } else await page.screenshot({ path: `${out}/${name}.png` });
}
const snapshot = () =>
  page.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
fs.mkdirSync(out, { recursive: true });
try {
  await page.goto(siteUrl + '/zh-Hans/hero-p0');
  await page.locator('[data-ready="true"]').waitFor();
  await page.waitForTimeout(1500);
  assert.equal((await snapshot()).fish.length, 40);
  assert.equal(await page.locator('canvas').getAttribute('width'), '1536');
  const corners = await page
    .locator('canvas')
    .evaluate((c) =>
      [0, 1, 2].map((i) => c.getContext('2d').getImageData(i, i, 1, 1).data[3])
    );
  assert.deepEqual(corners, [0, 0, 0]);
  await shot('hero-desktop', '[data-aquarium]');
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await page.waitForTimeout(1000);
  for (const f of (await snapshot()).fish)
    assert.equal(f.y, 240 - (190 * f.value) / 100);
  await shot('chart-desktop', '[data-aquarium]');
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(1100);
    const s = await snapshot();
    for (const f of s.fish)
      for (const g of s.fish)
        if (f.id !== g.id)
          assert.ok(Math.hypot(f.x - g.x, f.y - g.y) >= 32 - 1e-7);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    await page.locator('canvas').evaluate((c) => c.blur());
    await shot(`chart-${width}`, '[data-aquarium]');
  }
  await page.getByRole('button', { name: '自由鱼群', exact: true }).click();
  await page.waitForTimeout(1600);
  await shot('hero-mobile', '[data-aquarium]');
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  await page.waitForTimeout(100);
  await shot('hero-mobile-dark', '[data-aquarium]');
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const api = document.querySelector('[data-aquarium-p0]').aquariumP0;
    for (const id of [
      'wave',
      'intp',
      'gpt',
      'claude',
      'react',
      'vue',
      'node',
      'ts',
      'math',
      'controller',
      'geometry',
      'godot',
      'chart',
      'palette',
    ])
      api.drop(id);
  });
  await page.waitForTimeout(9000);
  assert.equal((await snapshot()).toys.length, 14);
  await shot('fourteen-toys', '[data-aquarium]');
  checks.push(
    '40 fish; 3x canvas; transparent stepped corners; exact vertical values and 32px chart spacing on desktop/mobile; all 14 toys retained'
  );
  await page.goto(siteUrl + '/zh-Hans/');
  await page.locator('[data-ready="true"]').waitFor();
  await page.locator('section').nth(1).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/home-cards.png` });
  for (const route of [
    '/zh-Hans/blog',
    '/zh-Hans/blog/stanford-cs448b-01-purpose',
  ]) {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(siteUrl + route);
    await page.locator('article').first().waitFor();
    const name = route.endsWith('/blog') ? 'blog-list' : 'article';
    await shot(name);
    await page.evaluate(
      () => (document.documentElement.dataset.theme = 'dark')
    );
    await shot(name + '-dark');
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(name + '-mobile-dark');
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
  }
  await page.goto(siteUrl + '/zh-Hans/');
  await page.getByRole('button', { name: '切换侧边栏' }).click();
  await page.waitForTimeout(350);
  assert.ok(await page.locator('.navbar-sidebar').isVisible());
  await page.screenshot({ path: `${out}/mobile-navigation.png` });
  checks.push(
    'Home cards, blog list, article, mobile navigation and dark theme render without horizontal overflow'
  );
  assert.deepEqual(errors, []);
} catch (error) {
  checks.push({ failure: error.stack });
  process.exitCode = 1;
  console.error(error);
} finally {
  fs.writeFileSync(
    `${out}/browser-results.json`,
    JSON.stringify({ checks, errors }, null, 2)
  );
  await browser.close();
  console.log(checks);
}
