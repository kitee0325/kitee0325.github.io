import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';

const baseUrl = process.env.BLOG_BASE_URL || `${siteUrl}/zh-Hans`;
const output = 'artifacts/blog-layout';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch(browserOptions);
const results = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/blog/color-review`);
  await page.locator('.blog-layout').waitFor();
  await page.getByRole('button', { name: '收起浮窗' }).click();
  for (const width of [1440, 1280, 1279, 1100, 1024, 997, 996, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() =>
      innerWidth < 1280
        ? document.querySelector('.blog-toc-compact') && !document.querySelector('.blog-toc-desktop')
        : document.querySelector('.blog-toc-desktop') && !document.querySelector('.blog-toc-compact')
    );
    const compact = page.locator('.blog-toc-compact');
    const desktop = page.locator('.blog-toc-desktop');
    assert.equal(await compact.isVisible(), width < 1280);
    assert.equal(await desktop.isVisible(), width >= 1280);
    const metrics = await page.evaluate(() => ({
      main: document.querySelector('main').clientWidth,
      text: document.querySelector('.markdown').clientWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(metrics.overflow, false, `Overflow at ${width}px`);
    assert.ok(metrics.main >= width - (width >= 1280 ? 464 : width > 996 ? 248 : 1));
    if (width < 1280) {
      assert.equal(await compact.getAttribute('open'), null);
      await compact.locator('summary').focus();
      await page.keyboard.press('Enter');
      const link = compact.locator('a').first();
      assert.ok(await link.isVisible());
      const hash = await link.getAttribute('href');
      await link.click();
      assert.equal(new URL(page.url()).hash, new URL(hash, page.url()).hash);
      await compact.locator('summary').click();
      assert.equal(await compact.getAttribute('open'), null);
    } else {
      await desktop.locator('a').first().click();
      await desktop.locator('.table-of-contents__link--active').waitFor();
    }
    await page.evaluate(() => scrollTo(0, 0));
    if ([1440, 1100, 390].includes(width)) {
      await page.screenshot({ path: `${output}/${width}.png` });
      await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
      await page.screenshot({ path: `${output}/${width}-dark.png` });
      await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
    }
    results.push({ width, ...metrics });
  }
  await page.locator('.navbar__toggle').click();
  await page.locator('.navbar-sidebar .menu__link[href$="/blog/color-review"]').waitFor({ state: 'visible' });
  await page.locator('.navbar-sidebar__close').click();
  for (const width of [1440, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() =>
      innerWidth < 1280
        ? document.querySelector('.blog-toc-compact') && !document.querySelector('.blog-toc-desktop')
        : document.querySelector('.blog-toc-desktop') && !document.querySelector('.blog-toc-compact')
    );
    await page.locator('.immersive-button').waitFor({ state: 'visible' });
    const before = (await page.locator('main').boundingBox()).width;
    await page.locator('.immersive-button').click();
    await page.waitForFunction(
      (before) => document.querySelector('main').getBoundingClientRect().width > before,
      before
    );
    assert.equal(await page.locator('.blog-layout aside').isVisible(), false);
    await page.locator('.immersive-button').click();
  }
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/blog`);
    assert.equal(await page.locator('.blog-toc-compact').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  assert.deepEqual(errors, []);
  console.log(results);
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
