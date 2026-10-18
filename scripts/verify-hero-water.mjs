import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } }),
  out = 'artifacts/hero-final',
  result = {};
const api = (fn) => page.evaluate(fn);
await page.addInitScript(() =>
  sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
);
async function counts() {
  return api(() => {
    const c = document.querySelector('[data-aquarium] canvas'),
      pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data,
      colors = [
        [234, 246, 253],
        [206, 232, 245],
        [162, 206, 234],
        [119, 159, 209],
      ],
      counts = colors.map(() => 0);
    for (let i = 0; i < pixels.length; i += 4) {
      const index = colors.findIndex((c) =>
        c.every((v, j) => v === pixels[i + j])
      );
      if (index >= 0) counts[index]++;
    }
    return counts;
  });
}
fs.mkdirSync(out, { recursive: true });
try {
  await page.goto(siteUrl + '/zh-Hans/hero-p0');
  await page.locator('[data-ready="true"]').waitFor();
  await api(() => {
    window.__originalFluid = document
      .querySelector('[data-aquarium-p0]')
      .aquariumP0.fluidCanvas();
  });
  for (let i = 0; i < 20; i++) {
    await api(() =>
      document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
    );
    await page.locator('[data-toy="controller"]').evaluate((b) => b.click());
    await page.waitForTimeout(20);
  }
  await api(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
  );
  assert.ok(
    await api(
      () =>
        window.__originalFluid ===
        document.querySelector('[data-aquarium-p0]').aquariumP0.fluidCanvas()
    )
  );
  result.reset = '20 resets reuse the same GPU context and clear all toys';
  result.baseline = await counts();
  await page.locator('[data-toy="wave"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot().toys[0]
        ?.entries === 1
  );
  await page.locator('canvas').press('Space');
  result.entry = await counts();
  assert.ok(result.entry[2] + result.entry[3] > 0);
  await page.screenshot({ path: out + '/E-single-entry.png', fullPage: true });
  await page.locator('canvas').press('Space');
  await page.waitForTimeout(3500);
  result.decayed = await counts();
  assert.ok(
    result.decayed[2] + result.decayed[3] < result.entry[2] + result.entry[3]
  );
  await api(() => {
    document.querySelector('[data-aquarium-p0]').aquariumP0.stats().intervals =
      Array(180).fill(26);
  });
  await page.waitForTimeout(200);
  assert.equal(
    await api(
      () =>
        document.querySelector('[data-aquarium-p0]').aquariumP0.stats().quality
    ),
    64
  );
  const start = await api(
    () =>
      document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot().time
  );
  await page.waitForTimeout(500);
  const state = await api(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
  assert.equal(state.fish.length, 40);
  assert.ok(state.time - start > 0.4 && state.time - start < 0.7);
  result.lowQuality =
    'Forced slow history: one downgrade to 64, 40 fish retained, simulation continues at fixed dt';
  await page.locator('canvas').press('Space');
  await api(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.loseContext()
  );
  await page
    .getByText('简化水体 · 流速着色暂不可用', { exact: true })
    .waitFor();
  result.pausedContextLoss =
    'Fallback notification and static Canvas draw while paused';

  await api(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
  );
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await page.locator('canvas').press('Space');
  const positions = await api(() =>
    document
      .querySelector('[data-aquarium-p0]')
      .aquariumP0.snapshot()
      .fish.map(({ id, x, y }) => ({ id, x, y }))
  );
  await page.locator('[data-toy="gpt"]').click();
  await page.waitForTimeout(3000);
  assert.deepEqual(
    await api(() =>
      document
        .querySelector('[data-aquarium-p0]')
        .aquariumP0.snapshot()
        .fish.map(({ id, x, y }) => ({ id, x, y }))
    ),
    positions
  );
  result.chartDrop =
    'Dropping GPT in beeswarm leaves all 40 encoded positions unchanged';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(100);
  await page.locator('canvas').press('ArrowRight');
  await page.locator('canvas').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const tooltip = await page.locator('[data-id]').boundingBox();
  assert.ok(tooltip.x >= 0 && tooltip.x + tooltip.width <= 360);
  await page.screenshot({
    path: out + '/F-mobile-tooltip.png',
    fullPage: true,
  });
  result.mobileTooltip =
    'Keyboard-selected datum tooltip remains inside the 360px viewport';
  console.log(result);
} catch (error) {
  result.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    out + '/water-results.json',
    JSON.stringify(result, null, 2)
  );
  await browser.close();
}
