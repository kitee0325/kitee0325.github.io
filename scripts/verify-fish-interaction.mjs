import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserOptions, baseUrl } from './browser-config.mjs';

const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 1300 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() =>
  sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
);
const snapshot = () =>
  page.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
const reset = () =>
  page.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
  );
const canvas = page.locator('canvas[data-fish-selection]');
async function position(x, y) {
  const box = await canvas.boundingBox();
  const { width } = await snapshot();
  return {
    x: box.x + (x / width) * box.width,
    y: box.y + (y / 288) * box.height,
  };
}
async function move(x, y) {
  const p = await position(x, y);
  await page.mouse.move(p.x, p.y);
}
try {
  await page.goto(baseUrl + '/zh-Hans/hero-p0');
  await page.locator('[data-ready="true"]').waitFor();
  await canvas.scrollIntoViewIfNeeded();
  await reset();
  await move(230, 140);
  await page.waitForTimeout(1400);
  assert.ok((await snapshot()).pointer.interest > 0.9);
  for (let i = 1; i <= 20; i++) {
    await move(230 + i, 140);
    await page.waitForTimeout(35);
  }
  const following = await snapshot();
  assert.ok(following.pointer.interest > 0.9);
  assert.equal(following.scares.length, 0);
  console.log(
    'PASS: real mouse dwell and slow movement build curiosity without startling'
  );

  await move(70, 140);
  await page.waitForTimeout(25);
  await move(440, 140);
  await page.waitForTimeout(100);
  const startled = await snapshot();
  assert.ok(startled.fish.some((f) => f.fright > 0.2));
  await page.mouse.move(0, 0);
  assert.equal((await snapshot()).pointer, undefined);
  await page.waitForTimeout(2500);
  assert.ok((await snapshot()).fish.every((f) => f.fright === 0));
  console.log(
    'PASS: fast sweep startles fish along the path; exit clears the pointer and fish recover'
  );

  await reset();
  const beforeClick = await snapshot();
  const blank = beforeClick.fish
    .flatMap((f) => [
      { x: f.x + 28, y: f.y },
      { x: f.x - 28, y: f.y },
    ])
    .find(
      (p) =>
        p.x > 20 &&
        p.x < beforeClick.width - 20 &&
        beforeClick.fish.every((f) => Math.hypot(f.x - p.x, f.y - p.y) > 22)
    );
  assert.ok(blank);
  const tap = await position(blank.x, blank.y);
  await page.mouse.click(tap.x, tap.y);
  await page.waitForTimeout(120);
  assert.equal(await page.locator('[data-id]').count(), 0);
  assert.ok((await snapshot()).fish.some((f) => f.fright > 0.2));
  console.log('PASS: clicking empty water startles nearby fish');

  await page.mouse.move(0, 0);
  await reset();
  const fish = (await snapshot()).fish[0];
  const target = await position(fish.x, fish.y);
  await page.mouse.click(target.x, target.y);
  assert.equal(
    await page.locator('[data-id]').getAttribute('data-id'),
    fish.id
  );
  assert.equal((await snapshot()).scares.length, 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-id]').count(), 0);
  await canvas.press('ArrowRight');
  assert.equal(
    await page.locator('[data-id]').getAttribute('data-id'),
    's0-f0'
  );
  console.log(
    'PASS: clicking a fish selects it without a tap scare; keyboard selection and Escape still work'
  );

  await canvas.press('Space');
  const frozen = (await snapshot()).fish;
  await move(120, 150);
  await move(380, 150);
  await page.waitForTimeout(200);
  assert.deepEqual((await snapshot()).fish, frozen);
  assert.equal((await snapshot()).pointer, undefined);
  await canvas.press('Space');
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await page.waitForTimeout(1100);
  const chart = (await snapshot()).fish;
  await move(100, 150);
  await move(400, 150);
  const chartTap = await position(256, 35);
  await page.mouse.click(chartTap.x, chartTap.y);
  await page.waitForTimeout(200);
  assert.deepEqual((await snapshot()).fish, chart);
  assert.equal((await snapshot()).scares.length, 0);
  await page.getByRole('button', { name: '自由鱼群', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const reduced = (await snapshot()).fish;
  await move(150, 150);
  await move(350, 150);
  await page.waitForTimeout(200);
  assert.deepEqual((await snapshot()).fish, reduced);
  console.log(
    'PASS: paused, chart and reduced-motion states ignore mouse forces'
  );

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await reset();
  await move(230, 140);
  await page.waitForTimeout(1800);
  fs.mkdirSync('artifacts/fish-interaction', { recursive: true });
  await canvas.screenshot({ path: 'artifacts/fish-interaction/hover.png' });
  await page.setViewportSize({ width: 390, height: 1000 });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal((await snapshot()).width, 384);
  await canvas.screenshot({ path: 'artifacts/fish-interaction/mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: responsive tank and no browser runtime errors');

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.addInitScript(() =>
    sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
  );
  await mobile.goto(baseUrl + '/zh-Hans/hero-p0');
  await mobile.locator('[data-ready="true"]').waitFor();
  const mobileCanvas = mobile.locator('canvas[data-fish-selection]');
  await mobileCanvas.scrollIntoViewIfNeeded();
  const box = await mobileCanvas.boundingBox();
  await mobile.touchscreen.tap(
    box.x + box.width / 2,
    box.y + (box.height * 33) / 288
  );
  await mobile.waitForTimeout(100);
  const tapped = await mobile.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
  assert.equal(
    tapped.pointer,
    undefined,
    'Touch must not leave a hovering pointer'
  );
  assert.ok(
    tapped.scares.length > 0,
    'A touch tap still reaches the click interaction'
  );
  await mobile.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
  );
  const cdp = await mobile.context().newCDPSession(mobile);
  const scrollY = await mobile.evaluate(() => window.scrollY);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 190, y: box.y + 160 }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 190, y: box.y + 160 - i * 14 }],
    });
    await mobile.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await mobile.waitForTimeout(200);
  assert.ok((await mobile.evaluate(() => window.scrollY)) > scrollY + 30);
  const scrolled = await mobile.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
  assert.equal(
    scrolled.scares.length,
    0,
    'Scrolling does not become a tap or sweep'
  );
  assert.equal(scrolled.pointer, undefined);
  assert.deepEqual(errors, []);
  await cdp.detach();
  await mobile.close();
  console.log(
    'PASS: touch tap works; scrolling over the aquarium creates no mouse interaction'
  );
} finally {
  await browser.close();
}
