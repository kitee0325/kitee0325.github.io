// Package the generated sheet without repainting or changing its alpha channel.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
const dir = 'static/img/hero';
const specs = [
  ['fish-0', 32, 70, 210, 190, 20, 16],
  ['fish-1', 265, 70, 245, 195, 23, 16],
  ['fish-2', 524, 62, 211, 205, 20, 19],
  ['fish-3', 750, 72, 220, 190, 21, 17],
  ['wave', 1010, 50, 210, 220, 28, 28],
  ['intp', 20, 340, 355, 150, 36, 12],
  ['gpt', 375, 300, 205, 220, 28, 28],
  ['claude', 594, 300, 210, 220, 28, 28],
  ['react', 805, 303, 217, 220, 28, 28],
  ['vue', 1022, 316, 214, 215, 28, 27],
  ['node', 40, 530, 200, 215, 26, 28],
  ['ts', 285, 540, 205, 200, 28, 28],
  ['math', 510, 546, 195, 190, 27, 27],
  ['controller', 705, 547, 260, 186, 32, 23],
  ['geometry', 965, 577, 271, 137, 34, 17],
  ['godot', 20, 780, 240, 215, 28, 25],
  ['plant-0', 276, 742, 236, 293, 30, 48],
  ['plant-1', 520, 738, 218, 296, 32, 50],
  ['plant-2', 758, 735, 211, 301, 30, 48],
  ['rock-0', 972, 800, 254, 198, 30, 22],
  ['rock-1', 22, 1042, 256, 180, 30, 21],
  ['rock-2', 286, 1040, 245, 185, 30, 22],
  ['shell-0', 536, 1037, 202, 185, 16, 15],
  ['shell-1', 777, 1037, 195, 190, 16, 16],
  ['sand', 1019, 1024, 218, 209, 16, 16],
  ['chart', 32, 1274, 200, 200, 28, 28],
  ['palette', 282, 1274, 200, 200, 28, 28],
];
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ src, specs }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const atlas = {},
        icons = {};
      for (const [id, x, y, w, h, drawW, drawH] of specs) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h).data;
        let left = w,
          top = h,
          right = 0,
          bottom = 0;
        for (let yy = 0; yy < h; yy++)
          for (let xx = 0; xx < w; xx++)
            if (pixels[(yy * w + xx) * 4 + 3] > 180) {
              left = Math.min(left, xx);
              top = Math.min(top, yy);
              right = Math.max(right, xx);
              bottom = Math.max(bottom, yy);
            }
        const r = {
          x: x + left,
          y: y + top,
          w: right - left + 1,
          h: bottom - top + 1,
          drawW,
          drawH,
          anchorX: drawW / 2,
          anchorY: id.startsWith('plant') ? drawH : drawH / 2,
          duration: 0,
        };
        if (id === 'sand') {
          r.x += 25;
          r.y += 25;
          r.w -= 50;
          r.h -= 50;
          r.anchorX = 0;
          r.anchorY = 0;
        }
        atlas[id] = [r];
        if (
          !id.startsWith('fish') &&
          !id.startsWith('plant') &&
          !id.startsWith('rock') &&
          !id.startsWith('shell') &&
          id !== 'sand'
        ) {
          canvas.width = 160;
          canvas.height = 160;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            image,
            r.x,
            r.y,
            r.w,
            r.h,
            (40 - drawW) * 2,
            (40 - drawH) * 2,
            drawW * 4,
            drawH * 4
          );
          icons[id] = canvas.toDataURL('image/png').split(',')[1];
        }
      }
      return { atlas, icons };
    },
    {
      src:
        'data:image/png;base64,' +
        fs.readFileSync(dir + '/sprites-fine.png').toString('base64'),
      specs,
    }
  );
  fs.writeFileSync(
    dir + '/atlas-fine.json',
    JSON.stringify(result.atlas, null, 2) + '\n'
  );
  for (const [name, png] of Object.entries(result.icons))
    fs.writeFileSync(`${dir}/${name}.png`, Buffer.from(png, 'base64'));
  const motifs = await page.evaluate(async src => {
    const image = new Image(); image.src = src; await image.decode();
    const result = {};
    for (const [name,x,y,w,h] of [['cloud',365,305,530,200],['island',180,885,520,200]]) {
      const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 144;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image,x,y,w,h,0,0,384,144);
      result[name] = canvas.toDataURL('image/png').split(',')[1];
    }
    return result;
  }, 'data:image/png;base64,' + fs.readFileSync('design-assets/hero/motifs-fine.png').toString('base64'));
  for (const [name,png] of Object.entries(motifs)) fs.writeFileSync(`${dir}/${name}.png`,Buffer.from(png,'base64'));
  console.log(
    `Packaged ${Object.keys(result.atlas).length} fine sprites and ${Object.keys(result.icons).length} transparent icons`
  );
} finally {
  await browser.close();
}
