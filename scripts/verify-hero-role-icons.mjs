import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';

const out = 'artifacts/hero-role-icons';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage();
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  if (window === window.top)
    sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done');
});
const snapshot = () =>
  page.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
try {
  for (const [locale, width] of [
    ['zh-Hans/', 1440],
    ['zh-Hans/', 390],
    ['', 360],
  ]) {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto(`${siteUrl}/${locale}hero-p0`);
    await page.locator('[data-ready="true"]').waitFor();
    const tankTop = (await page.locator('canvas').boundingBox()).y;
    for (const id of ['chart', 'palette']) {
      const button = page.locator(`[data-toy="${id}"]`);
      assert.equal(await button.count(), 1);
      await button.waitFor({ state: 'visible', timeout: 16000 });
      await button.hover();
      await page.waitForTimeout(300);
      assert.ok(
        await button
          .locator('img')
          .evaluate((img) => img.complete && img.naturalWidth === 160)
      );
      assert.ok(
        Math.abs((await page.locator('canvas').boundingBox()).y - tankTop) < 1,
        'Role rotation must not move the aquarium'
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      );
      const intro = page.locator('[data-aquarium] h1').locator('..');
      await intro.screenshot({
        path: `${out}/${locale ? 'zh' : 'en'}-${width}-${id}.png`,
      });
      await button.click();
      await page.waitForTimeout(400);
      assert.equal(
        (await snapshot()).toys.filter((t) => t.id === id).length,
        1
      );
      assert.equal(await button.getAttribute('aria-disabled'), 'true');
      await button.evaluate((el) => el.blur());
      await page.mouse.move(0, 0);
    }
    await page.waitForFunction(
      () => {
        const toys = document
          .querySelector('[data-aquarium-p0]')
          .aquariumP0.snapshot().toys;
        return ['chart', 'palette'].every((id) =>
          toys.some(
            (t) => t.id === id && t.canvas && t.entries === 1 && t.y > 185
          )
        );
      },
      null,
      { timeout: 15000 }
    );
    await page
      .locator('[data-aquarium]')
      .screenshot({
        path: `${out}/${locale ? 'zh' : 'en'}-${width}-dropped.png`,
      });
    checks.push(
      `${locale || 'en/'} ${width}px: both role icons visible, stable layout, exactly one deep-water entry each`
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl + '/zh-Hans/hero-p0');
  await page.locator('[data-ready="true"]').waitFor();
  for (const id of ['chart', 'palette']) {
    const button = page.locator(`[data-toy="${id}"]`);
    assert.equal(await button.count(), 1);
    assert.ok(await button.isVisible());
    await button.click();
  }
  await page.evaluate(() => {
    const root = document.querySelector('[data-aquarium-p0]');
    for (const button of root.querySelectorAll('[data-toy]'))
      root.aquariumP0.drop(button.dataset.toy);
  });
  const staticState = await snapshot();
  assert.equal(staticState.toys.length, 14);
  const deep = staticState.toys.filter((t) => t.depth === 'deep');
  assert.equal(deep.length, 8);
  for (const a of deep)
    for (const b of deep) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= 40);
  await page
    .locator('[data-aquarium]')
    .screenshot({ path: `${out}/reduced-360.png` });
  checks.push(
    'Reduced motion: both icons available without rotation; all 14 toys present; eight deep slots separated'
  );
  assert.deepEqual(errors, []);
} catch (error) {
  checks.push({ failure: error.stack });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    `${out}/results.json`,
    JSON.stringify({ checks, errors }, null, 2)
  );
  console.log(checks);
  await browser.close();
}
