import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';

const out = 'artifacts/learning-cards';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(browserOptions);
const errors = [],
  checks = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [locale, width] of [
    ['zh-Hans/', 1440],
    ['zh-Hans/', 900],
    ['zh-Hans/', 390],
    ['zh-Hans/', 320],
    ['', 360],
  ]) {
    await page.setViewportSize({ width, height: 1900 });
    await page.goto(`${siteUrl}/${locale}`);
    const section = page.locator('[data-learning]');
    await section.scrollIntoViewIfNeeded();
    await section
      .locator('img')
      .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
    const cards = section.locator('a[data-subject]');
    assert.equal(await cards.count(), 4);
    const boxes = await Promise.all(
      (await cards.all()).map((card) => card.boundingBox())
    );
    assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 1 && boxes[1].x > boxes[0].x);
    assert.ok(Math.abs(boxes[2].y - boxes[3].y) < 1 && boxes[2].y > boxes[0].y);
    assert.equal(await page.locator('video').count(), 0);
    assert.equal(
      await page
        .getByRole('heading', { name: /我做过的项目|What Have I Done/ })
        .count(),
      0
    );
    assert.equal(await section.locator('li').count(), 8);
    assert.ok(
      await section
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (img) =>
              img.naturalWidth === 512 &&
              img.src.includes('/img/learning/') &&
              img.alt === ''
          )
        )
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    for (const card of await cards.all()) {
      assert.ok(await card.evaluate((el) => el.scrollWidth <= el.clientWidth));
      const bounds = await card.boundingBox();
      for (const selector of ['h3', 'p', 'ul', 'strong']) {
        const child = await card.locator(selector).boundingBox();
        assert.ok(
          child.x >= bounds.x &&
            child.x + child.width <= bounds.x + bounds.width + 1
        );
      }
    }
    const hrefs = await cards.evaluateAll((links) =>
      links.map((link) => new URL(link.href).pathname)
    );
    assert.deepEqual(
      hrefs,
      [
        'stanford-cs448b-01-purpose',
        'AI-review',
        'paradox-of-probability-theory',
        'color-space',
      ].map((slug) => `/${locale}blog/${slug}`)
    );
    await section.screenshot({
      path: `${out}/${locale ? 'zh' : 'en'}-${width}.png`,
    });
    if (width === 1440 || width === 390) {
      await page.evaluate(
        () => (document.documentElement.dataset.theme = 'dark')
      );
      await page.waitForTimeout(200);
      await section.screenshot({ path: `${out}/dark-${width}.png` });
      await page.evaluate(
        () => (document.documentElement.dataset.theme = 'light')
      );
    }
    checks.push(
      `${locale || 'en/'} ${width}px: two columns, no project gallery or videos, four local illustrations, eight tags, correct links, no overflow`
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const first = page.locator('[data-learning] a').first();
  await first.hover();
  assert.equal(
    await first.evaluate((el) => getComputedStyle(el).transform),
    'none'
  );
  await page.keyboard.press('Tab');
  await first.focus();
  assert.equal(
    await first.evaluate((el) => getComputedStyle(el).outlineStyle),
    'solid'
  );
  await first.press('Enter');
  await page.waitForURL('**/blog/stanford-cs448b-01-purpose');
  await page.locator('article').first().waitFor();
  checks.push(
    'Visible keyboard focus, Enter opens the article, reduced motion disables hover translation'
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
