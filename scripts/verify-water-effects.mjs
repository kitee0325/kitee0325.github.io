import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const out = 'artifacts/hero-water-effects';
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aquarium-water-'));
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 1300 } });
const checks = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() =>
  sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
);
const snapshot = () =>
  page.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
async function captureBurst(kind, name) {
  const result = await page.evaluate(
    (kind) =>
      new Promise((resolve, reject) => {
        const start = performance.now();
        function frame() {
          const api = document.querySelector('[data-aquarium-p0]').aquariumP0;
          const state = api.snapshot();
          const effect = state.effects.find(
            (e) => e.kind === kind && e.age >= 0.07 && e.age < 0.18
          );
          if (effect)
            resolve({
              effect,
              ecoTime: state.ecoTime,
              png: document.querySelector('canvas').toDataURL().split(',')[1],
            });
          else if (performance.now() - start > 12000)
            reject(new Error('No visible ' + kind + ' burst'));
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
    kind
  );
  fs.writeFileSync(`${out}/${name}.png`, Buffer.from(result.png, 'base64'));
  checks.push({
    capture: name,
    effect: result.effect,
    ecoTime: result.ecoTime,
  });
}
try {
  await page.goto(siteUrl + '/zh-Hans/hero-p0');
  await page.locator('[data-ready="true"]').waitFor();
  const tankBox = await page.locator('canvas').boundingBox();
  const cdp = await page.context().newCDPSession(page),
    frames = [];
  cdp.on('Page.screencastFrame', (e) => {
    const file = path.join(temp, `${frames.length}.jpg`);
    fs.writeFileSync(file, Buffer.from(e.data, 'base64'));
    frames.push({ file, time: e.metadata.timestamp });
    cdp
      .send('Page.screencastFrameAck', { sessionId: e.sessionId })
      .catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 1280,
    maxHeight: 1300,
    everyNthFrame: 2,
  });
  await captureBurst('bubble', 'desktop-bubble-pop');
  await page.locator('[data-toy="react"]').click();
  await captureBurst('entry', 'desktop-entry-splash');
  await page.waitForTimeout(5000);
  await page.locator('[data-toy="ts"]').click();
  await captureBurst('entry', 'desktop-second-splash');
  await page.waitForTimeout(4000);
  await cdp.send('Page.stopScreencast');
  assert.ok(frames.length > 50);
  fs.writeFileSync(
    path.join(temp, 'frames.txt'),
    frames
      .map(
        (f, i) =>
          `file '${f.file}'\nduration ${i + 1 < frames.length ? Math.max(0.01, frames[i + 1].time - f.time) : 0.033}`
      )
      .join('\n')
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      path.join(temp, 'frames.txt'),
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `${out}/water-effects.mp4`,
    ],
    { stdio: 'ignore' }
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      `${out}/water-effects.mp4`,
      '-vf',
      `crop=${Math.floor(tankBox.width / 2) * 2}:${Math.floor(tankBox.height / 2) * 2}:${Math.floor(tankBox.x)}:${Math.floor(tankBox.y)}`,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `${out}/water-effects-detail.mp4`,
    ],
    { stdio: 'ignore' }
  );
  await page.locator('canvas').press('Space');
  const frozen = await snapshot();
  await page.waitForTimeout(400);
  assert.deepEqual(await snapshot(), frozen);
  await page.locator('canvas').press('Space');
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await page.waitForTimeout(700);
  const chart = await snapshot();
  await page.waitForTimeout(600);
  assert.equal((await snapshot()).ecoTime, chart.ecoTime);
  assert.ok((await snapshot()).effects.every((e) => e.kind !== 'bubble'));
  checks.push(
    'Desktop: real bubble and entry bursts captured; pause freezes state; chart stops ambient bubbles'
  );
  await page.getByRole('button', { name: '自由鱼群', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await captureBurst('bubble', 'mobile-bubble-pop');
  await page.locator('[data-toy="vue"]').click();
  await captureBurst('entry', 'mobile-entry-splash');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    ),
    false
  );
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  await captureBurst('bubble', 'mobile-dark-pop');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const reduced = await snapshot();
  await page.waitForTimeout(400);
  assert.deepEqual(await snapshot(), reduced);
  checks.push(
    '390px mobile: bubble and entry splashes captured, no overflow; dark burst captured; reduced motion freezes state'
  );
  assert.deepEqual(errors, []);
  console.log(checks);
} catch (error) {
  checks.push({ failure: error.stack });
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    `${out}/results.json`,
    JSON.stringify({ checks, errors }, null, 2)
  );
  await browser.close();
  fs.rmSync(temp, { recursive: true, force: true });
}
