import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch(browserOptions);
const out = 'artifacts/hero-refinement',
  checks = [],
  errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
await page.addInitScript(() =>
  sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
);
page.on('pageerror', (e) => errors.push(e.message));
const snapshot = () =>
  page.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
async function shot(name) {
  await page.evaluate(() => scrollTo(0, 0));
  const box = await page.locator('[data-aquarium]').boundingBox(),
    cdp = await page.context().newCDPSession(page);
  const r = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { ...box, scale: 1 },
  });
  fs.writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64'));
  await cdp.detach();
}
fs.mkdirSync(out, { recursive: true });
try {
  await page.goto(siteUrl + '/zh-Hans/hero-p0');
  await page.locator('[data-ready="true"]').waitFor();
  await page.waitForTimeout(700);
  assert.equal(
    await page.locator('[data-aquarium] button:not([data-toy])').count(),
    2
  );
  assert.equal(await page.locator('[data-aquarium] details').count(), 0);
  assert.equal(
    await page.getByText('查看演示数据', { exact: true }).count(),
    0
  );
  const sizes = (await snapshot()).fish.map((f) => f.size);
  assert.equal(new Set(sizes).size, 6);
  assert.equal(Math.min(...sizes), 0.9);
  assert.equal(Math.max(...sizes), 1.12);
  await shot('desktop-school');
  const line = () =>
    page
      .locator('canvas')
      .evaluate((c) =>
        Array.from(c.getContext('2d').getImageData(12, 72, c.width - 24, 48).data)
      );
  const wave = await line();
  await page.waitForTimeout(1300);
  assert.notDeepEqual(await line(), wave);
  await page.locator('canvas').press('Space');
  const frozen = await snapshot(),
    frozenLine = await line();
  await page.waitForTimeout(300);
  assert.deepEqual(await snapshot(), frozen);
  assert.deepEqual(await line(), frozenLine);
  await page.locator('canvas').press('Space');
  checks.push(
    'Two mode buttons only; no bottom controls, legend or data list; 90–112% fish; ambient surface animates and pauses'
  );
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await page.waitForTimeout(1100);
  let s = await snapshot();
  for (const f of s.fish) assert.equal(f.y, 240 - (190 * f.value) / 100);
  for (const f of s.fish)
    for (const g of s.fish)
      if (f.id !== g.id)
        assert.ok(Math.hypot(f.x - g.x, f.y - g.y) >= 32 - 1e-7);
  await shot('desktop-vertical');
  const positions = s.fish.map(({ id, x, y }) => ({ id, x, y }));
  await page.locator('[data-toy="wave"]').click();
  await page.waitForTimeout(2800);
  assert.deepEqual(
    (await snapshot()).fish.map(({ id, x, y }) => ({ id, x, y })),
    positions
  );
  for (let i = 0; i < 20; i++)
    await page
      .getByRole('button', { name: i % 2 ? '蜂群图' : '自由鱼群', exact: true })
      .click();
  await page.waitForTimeout(1000);
  assert.deepEqual(
    (await snapshot()).fish.map(({ id, x, y }) => ({ id, x, y })),
    positions
  );
  checks.push(
    'Vertical y encodes value, horizontal dodge maintains 32px spacing; drops and 20 mode switches preserve positions and IDs'
  );
  await page.locator('canvas').press('ArrowRight');
  assert.match(await page.locator('[data-id]').innerText(), /s0-f0/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-id]').count(), 0);
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(1100);
    s = await snapshot();
    for (const f of s.fish) assert.equal(f.y, 240 - (190 * f.value) / 100);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    await shot(`mobile-${width}-vertical`);
  }
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  await page.waitForTimeout(100);
  await shot('mobile-dark-vertical');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const still = await snapshot();
  await page.waitForTimeout(350);
  assert.deepEqual(await snapshot(), still);
  checks.push(
    'Keyboard selection, 390/360 vertical layout, dark theme and reduced motion pass'
  );
  assert.deepEqual(errors, []);
  console.log(checks);
} catch (error) {
  console.error(error);
  checks.push({ failure: error.stack });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    out + '/results.json',
    JSON.stringify({ checks, errors }, null, 2)
  );
  await browser.close();
}
