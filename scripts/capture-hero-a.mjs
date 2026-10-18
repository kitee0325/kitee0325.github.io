import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch(browserOptions);
const output = 'artifacts/hero-final',
  errors = [],
  checks = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
page.on('pageerror', (e) => errors.push(e.message));
fs.mkdirSync(output, { recursive: true });
try {
  for (const [locale, width, dark] of [
    ['', 1440, false],
    ['zh-Hans/', 1440, false],
    ['zh-Hans/', 390, false],
    ['', 360, false],
    ['zh-Hans/', 1440, true],
    ['', 390, true],
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(siteUrl + '/' + locale);
    await page.locator('[data-ready="true"]').waitFor();
    await page.evaluate(
      (dark) =>
        (document.documentElement.dataset.theme = dark ? 'dark' : 'light'),
      dark
    );
    await page.waitForTimeout(150);
    const geometry = await page.locator('[data-aquarium]').evaluate((el) => {
      const c = el.querySelector('canvas').getBoundingClientRect(),
        intro = el.querySelector('h1').parentElement.getBoundingClientRect();
      return {
        width: c.width,
        height: c.height,
        gap: c.top - intro.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
        icons: el.querySelectorAll('[data-toy]').length,
        links: el.querySelectorAll('a').length,
      };
    });
    assert.equal(geometry.icons, 14);
    assert.equal(geometry.links, 0);
    assert.ok(!geometry.overflow && geometry.gap > 0);
    assert.ok(
      Math.abs(
        geometry.width / geometry.height - (width < 768 ? 4 / 3 : 16 / 9)
      ) < 0.001
    );
    const file = `A-${locale ? 'zh' : 'en'}-${width}-${dark ? 'dark' : 'light'}.png`;
    await page.evaluate(() => scrollTo(0, 0));
    const clip = await page.locator('[data-aquarium]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const capture = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { ...clip, scale: 1 },
    });
    fs.writeFileSync(output + '/' + file, Buffer.from(capture.data, 'base64'));
    await cdp.detach();
    checks.push({ file, ...geometry });
  }
  const nojs = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  await nojs.goto(siteUrl + '/zh-Hans/');
  await nojs.screenshot({
    path: output + '/A-no-js-poster.png',
    clip: await nojs.locator('[data-aquarium]').boundingBox(),
  });
  assert.equal(await nojs.locator('[data-aquarium] picture img:visible').count(), 1);
  assert.equal(await nojs.locator('[data-fish-selection]').count(), 1);
  assert.equal(await nojs.locator('details').count(), 0);
  await nojs.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    output + '/A-results.json',
    JSON.stringify(
      {
        checks,
        errors,
        noJavaScript: 'poster and intro present; removed data list absent',
      },
      null,
      2
    )
  );
  console.log(checks);
} finally {
  await browser.close();
}
