import { chromium } from 'playwright';
import { browserOptions, baseUrl as siteUrl } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch(browserOptions);
const out = 'artifacts/hero-final',
  checks = [],
  errors = [];
fs.mkdirSync(out, { recursive: true });
const url = siteUrl + '/zh-Hans/hero-p0';
const snap = (p) =>
  p.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.snapshot()
  );
const reset = (p) =>
  p.evaluate(() =>
    document.querySelector('[data-aquarium-p0]').aquariumP0.reset()
  );
const check = (name, detail) => {
  checks.push({ name, detail, passed: true });
  console.log('PASS', name, detail ?? '');
};
async function make(options = {}, init) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 1600 },
    ...options,
  });
  if (init) await c.addInitScript(init);
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url);
  await p.locator('[data-ready="true"]').waitFor();
  return p;
}
async function shot(p, name) {
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
try {
  const p = await make();
  await p.waitForTimeout(4500);
  assert.deepEqual(
    (await snap(p)).toys.map((t) => t.id),
    ['controller']
  );
  await shot(p, 'D-auto-demo');
  await reset(p);
  await p.waitForTimeout(3000);
  assert.equal((await snap(p)).toys.length, 0);
  check('Automatic demonstration once; reset does not replay');
  await reset(p);
  const before = await p.locator('canvas').boundingBox();
  await p.locator('[data-toy="gpt"]').focus();
  await p.waitForTimeout(6500);
  assert.equal((await snap(p)).role, 0);
  await p.locator('[data-toy="gpt"]').press('Enter');
  await p.getByRole('button', { name: '蜂群图', exact: true }).focus();
  await p.waitForTimeout(6800);
  assert.equal((await snap(p)).role, 1);
  assert.equal((await p.locator('canvas').boundingBox()).y, before.y);
  assert.equal((await snap(p)).toys.filter((t) => t.id === 'gpt').length, 1);
  check(
    'Identity holds focus, then changes without moving the aquarium or recreating GPT'
  );
  const data = p.locator('canvas');
  await data.press('ArrowRight');
  assert.match(await p.locator('[data-id]').innerText(), /s0-f0/);
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('[data-id]').count(), 0);
  await data.press('ArrowRight');
  await p.locator('h1').click();
  assert.equal(await p.locator('[data-id]').count(), 0);
  check('Keyboard data selection, Escape and outside click');
  await p.context().close();
  const cancel = await make();
  await cancel.locator('[data-toy="gpt"]').focus();
  await cancel.waitForTimeout(3200);
  assert.equal((await snap(cancel)).toys.length, 0);
  check('User activity cancels the pending demonstration');
  await cancel.context().close();
  const reduced = await make({ reducedMotion: 'reduce' });
  await reduced.waitForTimeout(300);
  assert.equal(
    await reduced
      .locator('[data-role]')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
    '1'
  );
  await reduced.emulateMedia({ reducedMotion: 'no-preference' });
  await reduced.waitForTimeout(3200);
  assert.equal((await snap(reduced)).toys.length, 0);
  check(
    'Reduced-motion Agent stays visible; restoring motion does not trigger a demonstration'
  );
  await reduced.context().close();
  const store = await make({}, () =>
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw Error('storage unavailable');
      },
    })
  );
  await store.waitForTimeout(4500);
  assert.equal((await snap(store)).toys.length, 1);
  await reset(store);
  await store.waitForTimeout(2400);
  assert.equal((await snap(store)).toys.length, 0);
  check('Blocked sessionStorage uses memory fallback without crashing');
  await store.context().close();
  const gpu = await make({}, () => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : get.call(this, type, ...args);
    };
  });
  assert.match(await gpu.locator('[data-aquarium]').innerText(), /简化水体/);
  await gpu.locator('[data-toy="react"]').click();
  await gpu.waitForTimeout(2500);
  assert.equal((await snap(gpu)).toys.length, 1);
  await shot(gpu, 'E-webgl-unavailable');
  check('Unavailable WebGL preserves manual drops and readable fallback');
  await gpu.context().close();
  for (const failure of ['canvas', 'assets']) {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    if (failure === 'canvas')
      await c.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === '2d' ? null : get.call(this, type, ...args);
        };
      });
    else await c.route('**/img/hero/sprites*.png', (route) => route.abort());
    const page = await c.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.getByText('静态鱼缸 · 动画暂不可用', { exact: true }).waitFor();
    assert.equal(
      await page.locator('[data-aquarium] picture img:visible').count(),
      1
    );
    assert.equal(await page.locator('[data-toy]:disabled').count(), 14);
    await shot(page, `F-${failure}-poster`);
    await c.close();
    check(`${failure} failure retains poster and disables simulation controls`);
  }
  const lifecycle = await make({}, () => {
    sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done');
    window.__liveGpu = new Set();
    for (const name of [
      'Texture',
      'Framebuffer',
      'Program',
      'Shader',
      'Buffer',
    ]) {
      const proto = WebGL2RenderingContext.prototype,
        create = proto['create' + name],
        remove = proto['delete' + name];
      proto['create' + name] = function (...a) {
        const object = create.apply(this, a);
        if (object) window.__liveGpu.add(object);
        return object;
      };
      proto['delete' + name] = function (object) {
        window.__liveGpu.delete(object);
        return remove.call(this, object);
      };
    }
    window.__hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => window.__hidden });
  });
  const owned = await lifecycle.evaluate(() => window.__liveGpu.size);
  assert.ok(owned > 0);
  await lifecycle.evaluate(() => {
    window.__hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await snap(lifecycle);
  await lifecycle.waitForTimeout(600);
  assert.deepEqual(await snap(lifecycle), hidden);
  await lifecycle.evaluate(() => {
    window.__hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await lifecycle.waitForTimeout(150);
  assert.ok((await snap(lifecycle)).time - hidden.time < 0.3);
  check(
    'Visibility-event suspension and bounded resume (synthetic hidden property)'
  );
  for (let i = 0; i < 3; i++) {
    await lifecycle.getByRole('link', { name: '博客', exact: true }).click();
    await lifecycle.waitForURL('**/blog');
    await lifecycle.locator('[data-aquarium]').waitFor({ state: 'detached' });
    await lifecycle.waitForTimeout(100);
    assert.equal(await lifecycle.evaluate(() => window.__liveGpu.size), 0);
    await lifecycle.goBack();
    await lifecycle.locator('[data-ready="true"]').waitFor();
    assert.equal(await lifecycle.evaluate(() => window.__liveGpu.size), owned);
  }
  check('Three SPA unmount/remount cycles release every tracked GPU object', {
    owned,
    afterUnmount: 0,
  });
  await lifecycle.context().close();
  const touch = await make(
    {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    () => sessionStorage.setItem('kitee-aquarium-demo-v1.3', 'done')
  );
  await touch.locator('canvas').scrollIntoViewIfNeeded();
  const b = await touch.locator('canvas').boundingBox(),
    cdp = await touch.context().newCDPSession(touch);
  const startY = await touch.evaluate(() => scrollY);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 190, y: b.y + 160 }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 190, y: b.y + 160 - i * 14 }],
    });
    await touch.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await touch.waitForTimeout(300);
  assert.ok((await touch.evaluate(() => scrollY)) > startY + 30);
  assert.equal((await snap(touch)).toys.length, 0);
  await shot(touch, 'F-mobile-dpr2');
  check('DPR 2 and emulated touch scroll over the aquarium without a drop');
  await cdp.detach();
  await touch.context().close();
  assert.deepEqual(errors, []);
} catch (error) {
  checks.push({ passed: false, error: error.stack });
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    out + '/integration-results.json',
    JSON.stringify({ checks, errors }, null, 2)
  );
  await browser.close();
}
