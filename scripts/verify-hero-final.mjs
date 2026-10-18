// Preview build exercises the same aquarium component as the production homepage.
import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const out = path.resolve('artifacts/hero-final');
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'kitee-hero-final-'));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(browserOptions);
const failures = [],
  results = {
    environment: {
      browser: browser.version(),
      viewport: '1440×900 / 1280×720 / 390×844 / 360×800',
      mobile: 'desktop emulation, not a physical phone',
    },
    checks: [],
  };
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() =>
  sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
);
page.on('pageerror', (e) => failures.push(e.message));
const api = (fn) => page.evaluate(fn);
const snapshot = () =>
  api(() => document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot());
const check = (name, detail) => {
  results.checks.push({ name, detail, passed: true });
  console.log('PASS', name, JSON.stringify(detail ?? ''));
};
const wait = (ms) => page.waitForTimeout(ms);
const ids = [
  'gpt',
  'claude',
  'wave',
  'intp',
  'react',
  'vue',
  'node',
  'ts',
  'math',
  'controller',
  'geometry',
  'godot',
  'chart',
  'palette',
];
async function reset() {
  await api(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
  );
  await wait(80);
}
async function allDrop(order = ids) {
  for (const id of order)
    await page.locator(`[data-toy="${id}"]`).evaluate((b) => b.click());
}
try {
  await page.goto(siteUrl + '/zh-Hans/hero-p0');
  await page.waitForFunction(
    () => document.querySelector('[data-aquarium-p0]')?.aquariumP0
  );
  await wait(1000);
  results.environment.gpu = await api(() => {
    const gl = document
      .querySelector('[data-aquarium-p0]')
      .aquariumP0.fluidCanvas()
      .getContext('webgl2');
    return gl.getParameter(
      gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL
    );
  });
  assert.equal(await page.locator('[data-aquarium] button:not([data-toy])').count(), 2);
  await page.screenshot({
    path: path.join(out, 'desktop-1440.png'),
    fullPage: true,
  });
  const bounds = await api(() => {
    const c = document.querySelector('canvas').getBoundingClientRect(),
      intro = document
        .querySelector('[data-aquarium-p0] h1')
        .parentElement.getBoundingClientRect();
    return {
      width: c.width,
      height: c.height,
      gap: c.top - intro.bottom,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.equal(bounds.width, 1152);
  assert.equal(bounds.width / bounds.height, 16 / 9);
  assert.ok(bounds.gap >= 48 && !bounds.overflow);
  check('Desktop layout', bounds);
  await page.setViewportSize({ width: 1280, height: 720 });
  await wait(200);
  await page.screenshot({
    path: path.join(out, 'desktop-1280.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1600 });
  await reset();
  const cdp = await page.context().newCDPSession(page);
  const records = [];
  cdp.on('Page.screencastFrame', (e) => {
    const file = path.join(
      frames,
      String(records.length).padStart(5, '0') + '.jpg'
    );
    fs.writeFileSync(file, Buffer.from(e.data, 'base64'));
    records.push({ file, t: e.metadata.timestamp });
    cdp
      .send('Page.screencastFrameAck', { sessionId: e.sessionId })
      .catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 75,
    maxWidth: 1440,
    maxHeight: 1600,
    everyNthFrame: 3,
  });
  await page.locator('[data-toy="controller"]').click();
  await wait(700);
  const airborne = await snapshot();
  assert.equal(airborne.toys.length, 1);
  assert.equal(airborne.toys[0].canvas, false);
  const bodyId = airborne.toys[0].bodyId;
  await page.screenshot({ path: path.join(out, 'flight.png'), fullPage: true });
  await wait(3000);
  assert.equal((await snapshot()).toys[0].bodyId, bodyId);
  assert.equal((await snapshot()).toys[0].canvas, true);
  await reset();
  await allDrop();
  await wait(3200);
  await page.screenshot({
    path: path.join(out, 'entry-fluid.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await wait(1300);
  await page.getByRole('button', { name: '自由鱼群', exact: true }).click();
  await wait(1600);
  await cdp.send('Page.stopScreencast');
  await wait(100);
  await cdp.detach();
  fs.writeFileSync(
    path.join(frames, 'frames.txt'),
    records
      .map(
        (r, i) =>
          `file '${r.file}'\nduration ${Math.max(0.01, Math.min(0.5, (records[i + 1]?.t ?? r.t + 0.05) - r.t))}`
      )
      .join('\n')
  );
  check('DOM → Canvas same body, recorded entry and mode switch', {
    bodyId,
    frames: records.length,
  });
  console.log('Measuring 60 seconds of visible GPU simulation…');
  await api(() => {
    const stats = document
      .querySelector('[data-aquarium-p0]')
      .aquariumP0.stats();
    stats.intervals = [];
    stats.drawMs = [];
    stats.frames = 0;
  });
  for (let i = 0; i < 6; i++) {
    await wait(10000);
    console.log('GPU run', 10 * (i + 1), 'seconds');
  }
  const settled = await snapshot();
  assert.equal(settled.toys.length, 14);
  assert.equal(settled.fish.length, 40);
  for (const t of settled.toys) {
    assert.ok(
      t.depth === 'surface'
        ? t.y < 55
        : t.depth === 'middle'
          ? Math.abs(t.y - 150) < 20
          : t.y > 185,
      JSON.stringify(t)
    );
    assert.equal(t.entries, 1);
  }
  await page.screenshot({
    path: path.join(out, 'fourteen-settled.png'),
    fullPage: true,
  });
  results.performance = await api(() => {
    const s = document.querySelector('[data-aquarium-p0]').aquariumP0.stats();
    const summary = (a) => {
      const v = [...a].sort((a, b) => a - b);
      return {
        n: v.length,
        mean: v.reduce((a, b) => a + b, 0) / v.length,
        p50: v[Math.floor(v.length * 0.5)],
        p95: v[Math.floor(v.length * 0.95)],
      };
    };
    return {
      intervalMs: summary(s.intervals),
      drawMs: summary(s.drawMs),
      quality: s.quality,
    };
  });
  check('60-second visible GPU run and 4/2/8 stable layers', {
    performance: results.performance,
    toys: settled.toys,
  });
  for (let i = 0; i < 20; i++) {
    await page
      .getByRole('button', { name: i % 2 ? '自由鱼群' : '蜂群图', exact: true })
      .click();
    await wait(30);
  }
  const school = await snapshot();
  assert.equal(school.mode, 'school');
  assert.deepEqual(
    school.fish.map((f) => f.id),
    settled.fish.map((f) => f.id)
  );
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await wait(1100);
  await page.screenshot({
    path: path.join(out, 'beeswarm-desktop.png'),
    fullPage: true,
  });
  const swarm = await snapshot();
  for (const f of swarm.fish) assert.equal(f.y, 240 - (190 * f.value) / 100);
  check('20 interrupted transitions preserve fish IDs and exact y');
  await page.locator('canvas').press('Space');
  const paused = await snapshot();
  await wait(600);
  assert.deepEqual(await snapshot(), paused);
  await page.getByRole('button', { name: '自由鱼群', exact: true }).click();
  await reset();
  assert.ok((await snapshot()).paused);
  assert.equal((await snapshot()).toys.length, 0);
  await page.locator('canvas').press('Space');
  check('Pause freezes scene; reset preserves pause and clears bodies');
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(200);
  await reset();
  await page.screenshot({
    path: path.join(out, 'mobile-390.png'),
    fullPage: true,
  });
  const mobile = await api(() => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return {
      width: r.width,
      height: r.height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.equal(mobile.width, 358);
  assert.ok(
    Math.abs(mobile.width / mobile.height - 4 / 3) < 0.001 && !mobile.overflow
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-toy="wave"]').click();
  const sourceY = (await snapshot()).toys[0].y;
  await wait(700);
  assert.ok((await snapshot()).toys[0].y > sourceY + 10);
  await reset();
  await allDrop();
  await wait(400);
  const beforeResize = await snapshot();
  await page.setViewportSize({ width: 844, height: 390 });
  await wait(400);
  const afterResize = await snapshot();
  assert.equal(afterResize.width, 512);
  assert.deepEqual(
    afterResize.toys.map((t) => t.bodyId),
    beforeResize.toys.map((t) => t.bodyId)
  );
  assert.equal(afterResize.toys.length, 14);
  await page.setViewportSize({ width: 360, height: 800 });
  await wait(200);
  await page.getByRole('button', { name: '蜂群图', exact: true }).click();
  await wait(1100);
  await page.screenshot({
    path: path.join(out, 'mobile-360-beeswarm.png'),
    fullPage: true,
  });
  check(
    '390 / 360 mobile geometry and in-flight orientation preserve 14 body IDs',
    mobile
  );
  for (let i = 0; i < 20; i++) {
    await reset();
    await allDrop(i % 2 ? ids : [...ids].reverse());
    await wait(220);
    await page.setViewportSize({ width: i % 2 ? 390 : 800, height: 844 });
    await wait(30);
    assert.equal((await snapshot()).toys.length, 14);
    assert.equal((await snapshot()).bodies, 17);
  }
  await reset();
  assert.equal((await snapshot()).bodies, 3);
  assert.equal(await page.locator('[data-flying]').count(), 0);
  check('20 drop/reset/resize cycles, no residual bodies or flight images');
  await page.setViewportSize({ width: 720, height: 450 });
  await wait(200);
  await page.screenshot({
    path: path.join(out, 'zoom-200-equivalent.png'),
    fullPage: true,
  });
  assert.equal(
    await api(() => document.documentElement.scrollWidth > innerWidth),
    false
  );
  check(
    '200% equivalent CSS viewport has no horizontal overflow',
    '720×450 CSS viewport; native browser zoom not asserted'
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await wait(200);
  await allDrop();
  const staticState = await snapshot();
  assert.equal(staticState.toys.length, 14);
  assert.ok(staticState.toys.every((t) => t.canvas && !t.guided));
  assert.equal(await page.locator('[data-flying]').count(), 0);
  await wait(500);
  assert.deepEqual(await snapshot(), staticState);
  await page.screenshot({
    path: path.join(out, 'reduced-motion.png'),
    fullPage: true,
  });
  check('Reduced motion instant placement without persistent animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await wait(200);
  await page.locator('canvas').scrollIntoViewIfNeeded();
  await api(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.loseContext()
  );
  await wait(500);
  assert.match(await page.locator('body').innerText(), /简化水体/);
  assert.equal((await snapshot()).toys.length, 14);
  await page.screenshot({
    path: path.join(out, 'gpu-context-loss.png'),
    fullPage: true,
  });
  check('GPU context loss keeps Canvas scene and all bodies');
  await page.setViewportSize({ width: 1440, height: 900 });
  for (let i = 0; i < 10; i++) {
    await page.goto(siteUrl + '/zh-Hans/hero-p0');
    await page.waitForFunction(
      () => document.querySelector('[data-aquarium-p0]')?.aquariumP0
    );
    await page.getByRole('link', { name: '博客', exact: true }).click();
    await page.waitForURL('**/blog');
  }
  check('10 route navigation cycles without page errors');
  assert.deepEqual(failures, []);
  results.pageErrors = failures;
} catch (error) {
  results.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(out, 'browser-results.json'),
    JSON.stringify(results, null, 2)
  );
  await browser.close();
  fs.rmSync(frames, { recursive: true, force: true });
}
