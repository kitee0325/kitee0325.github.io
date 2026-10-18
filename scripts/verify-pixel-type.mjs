import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl } from './browser-config.mjs';

const browser = await chromium.launch(browserOptions);
const output = 'artifacts/pixel-type';
fs.mkdirSync(output, { recursive: true });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  for (const locale of ['', 'zh-Hans/']) {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${baseUrl}/${locale}`);
      await page.locator('[data-ready="true"]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(
        await page.evaluate(() =>
          document.fonts.check('36px "Fusion Pixel"', '你好 Kite，工程师')
        )
      );
      assert.ok(
        await page.evaluate(() =>
          [...document.fonts].some(
            (font) => font.family === 'Fusion Pixel' && font.status === 'loaded'
          )
        )
      );
      const words = page.locator('h1 [data-pixel-text]');
      for (const word of await words.all()) {
        const result = await word.evaluate((el) => {
          const accessible = el.firstElementChild.textContent;
          const visual = el.querySelector('[aria-hidden]');
          const letters = [...visual.querySelectorAll(':scope > span > span')];
          return {
            accessible,
            visual: visual.textContent,
            delays: letters.map((letter) =>
              parseFloat(getComputedStyle(letter).animationDelay)
            ),
          };
        });
        assert.equal(result.accessible, result.visual);
        assert.ok(
          result.delays.every((delay, i, all) => i === 0 || delay >= all[i - 1])
        );
      }
      const motion = await page
        .locator('h1 [aria-hidden] span > span')
        .first()
        .evaluate((el) => {
          const animation = el.getAnimations()[0];
          if (!animation) return null;
          animation.pause();
          animation.currentTime = 160;
          const peak = new DOMMatrix(getComputedStyle(el).transform).m42;
          animation.finish();
          return {
            peak,
            end: new DOMMatrix(getComputedStyle(el).transform).m42,
          };
        });
      assert.ok(
        motion && motion.peak < 0 && motion.end === 0,
        'Character jumps above its baseline and lands'
      );
      await page.waitForTimeout(1400);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      );
      const heading = page.locator('[data-aquarium] h1');
      assert.ok((await heading.ariaSnapshot()).toLowerCase().includes('kitee'));
      assert.ok(
        await heading.evaluate((el) =>
          getComputedStyle(el).fontFamily.includes('Fusion Pixel')
        )
      );
      const nameLine = page.locator('h1 [data-toy="intp"]').locator('..');
      assert.ok(
        await nameLine.evaluate((el) => {
          const name = el
            .querySelector('[data-pixel-text]')
            .getBoundingClientRect();
          const icon = el.querySelector('button').getBoundingClientRect();
          return (
            Math.abs(
              (name.top + name.bottom) / 2 - (icon.top + icon.bottom) / 2
            ) < 1
          );
        }),
        'Name and personality icon stay on the same line'
      );
      const button = page.locator('[data-toy="react"]');
      await button.click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-toy="react"]')
            .getAttribute('aria-disabled') === 'true'
      );
      await page.screenshot({
        path: `${output}/${locale ? 'zh' : 'en'}-${width}.png`,
        fullPage: true,
      });
      if (width === 390) {
        await page.evaluate(
          () => (document.documentElement.dataset.theme = 'dark')
        );
        await page.screenshot({
          path: `${output}/${locale ? 'zh' : 'en'}-dark.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.goto(`${baseUrl}/zh-Hans/`);
  await page.locator('[data-ready="true"]').waitFor();
  const tankTop = (await page.locator('[data-aquarium] canvas').boundingBox())
    .y;
  for (const id of ['chart', 'palette']) {
    const icon = page.locator(`[data-toy="${id}"]`);
    await icon.waitFor({ state: 'visible', timeout: 20000 });
    await icon.hover();
    await page.waitForTimeout(1200);
    assert.ok(
      Math.abs(
        (await page.locator('[data-aquarium] canvas').boundingBox()).y - tankTop
      ) < 1
    );
    await icon.click();
    assert.equal(await icon.getAttribute('aria-disabled'), 'true');
    await icon.evaluate((el) => el.blur());
    await page.mouse.move(0, 0);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseUrl}/zh-Hans/`);
  await page.locator('[data-ready="true"]').waitFor();
  assert.equal(
    await page
      .locator('h1')
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
    0
  );
  assert.equal(await page.locator('[data-toy]').count(), 14);
  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto(`${baseUrl}/zh-Hans/`);
  assert.ok(await nojs.locator('h1').isVisible());
  assert.ok(
    await nojs
      .locator('h1 [aria-hidden] span > span')
      .evaluateAll((letters) =>
        letters.every((el) => getComputedStyle(el).opacity === '1')
      )
  );
  const fallback = await browser.newPage();
  await fallback.route('**/*.woff2', (route) => route.abort());
  await fallback.goto(`${baseUrl}/zh-Hans/`);
  await fallback.locator('[data-ready="true"]').waitFor();
  await fallback.waitForTimeout(1400);
  assert.ok(await fallback.locator('h1').isVisible());
  assert.deepEqual(errors, []);
  console.log(
    'Pixel typography: both locales at 1440/390/320px, character stagger/bounce, font loading, accessible text, icon interaction, reduced motion, no-JS and missing-font fallback passed.'
  );
} finally {
  await browser.close();
}
