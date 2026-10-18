import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1500 });
    await page.goto(siteUrl + '/zh-Hans/hero-p0');
    await page.locator('[data-ready="true"]').waitFor();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme
      );
      await page.waitForTimeout(100);
      const png = await page
        .locator('canvas')
        .evaluate((c) => c.toDataURL('image/png').split(',')[1]);
      fs.writeFileSync(
        `static/img/hero/poster${width < 768 ? '-mobile' : ''}${theme === 'dark' ? '-dark' : ''}.png`,
        Buffer.from(png, 'base64')
      );
    }
  }
} finally {
  await browser.close();
}
