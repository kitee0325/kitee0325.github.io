import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  for (const id of ['datavis', 'ai', 'math', 'design']) {
    const source = fs.readFileSync(
      `design-assets/learning/sources/${id}.png`
    );
    const result = await page.evaluate(
      async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let l = image.width,
          t = image.height,
          r = 0,
          b = 0;
        for (let y = 0; y < image.height; y++)
          for (let x = 0; x < image.width; x++) {
            if (pixels[(y * image.width + x) * 4 + 3] > 128) {
              l = Math.min(l, x);
              r = Math.max(r, x);
              t = Math.min(t, y);
              b = Math.max(b, y);
            }
          }
        const w = r - l + 1,
          h = b - t + 1,
          scale = 464 / Math.max(w, h);
        canvas.width = canvas.height = 512;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          image,
          l,
          t,
          w,
          h,
          (512 - w * scale) / 2,
          (512 - h * scale) / 2,
          w * scale,
          h * scale
        );
        return {
          webp: canvas.toDataURL('image/webp', 0.94).split(',')[1],
          alpha: ctx.getImageData(0, 0, 1, 1).data[3],
          w,
          h,
        };
      },
      'data:image/png;base64,' + source.toString('base64')
    );
    assert.ok(result.w > 0 && result.h > 0);
    assert.equal(result.alpha, 0);
    const output = Buffer.from(result.webp, 'base64');
    fs.writeFileSync(`static/img/learning/${id}.webp`, output);
    console.log(
      `${id}: 512×512 transparent WebP, ${Math.round(output.length / 1024)} KiB`
    );
  }
} finally {
  await browser.close();
}
