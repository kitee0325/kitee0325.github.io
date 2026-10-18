import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {
  data,
  toys,
  validateData,
  initialFish,
  config,
  speedBand,
} from '../src/features/Profile/aquarium/data';
import {
  beeswarm,
  columnX,
  chartTop,
  chartBottom,
} from '../src/features/Profile/aquarium/beeswarm';
import { stepSchool } from '../src/features/Profile/aquarium/school';
import {
  Physics,
  WaterSurface,
  flight,
  categories,
} from '../src/features/Profile/aquarium/physics';
import { Scene, FixedClock } from '../src/features/Profile/aquarium/scene';
import { waterCoordinates } from '../src/features/Background/engine';

validateData(data);
for (const invalid of [
  data.map((d, i) => (i === 1 ? { ...d, id: data[0].id } : d)),
  data.map((d, i) => (i === 0 ? { ...d, value: NaN } : d)),
  data.map((d, i) => (i === 0 ? { ...d, value: 101 } : d)),
])
  assert.throws(() => validateData(invalid));
for (const width of [512, 384]) {
  const layout = beeswarm(width);
  assert.deepEqual(layout, beeswarm(width));
  for (const f of data) {
    const p = layout.get(f.id)!;
    assert.equal(p.y, chartBottom - ((chartBottom - chartTop) * f.value) / 100);
    assert.ok(Math.abs(p.x - columnX(width, f.series)) <= 34);
    for (const g of data) {
      if (f.id === g.id) continue;
      const q = layout.get(g.id)!;
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 32 - 1e-7);
    }
  }
  assert.throws(() =>
    beeswarm(
      width,
      data.map((d) => ({ ...d, value: 50 }))
    )
  );
  const fish = initialFish(width);
  Object.assign(fish[1], { x: fish[0].x, y: fish[0].y, vx: 0, vy: 0 });
  Object.assign(fish[2], { x: 16, y: 44, vx: 0, vy: 0 });
  for (let i = 0; i < 3600; i++) {
    stepSchool(fish, width, config.dt, i * config.dt, [{ x: 100, y: 100 }], {
      x: 200,
      y: 150,
      interest: 1,
    });
    for (const f of fish) {
      assert.ok([f.x, f.y, f.vx, f.vy].every(Number.isFinite));
      assert.ok(f.x >= 16 && f.x <= width - 16 && f.y >= 44 && f.y <= 248);
    }
  }
  for (const order of [
    toys,
    [...toys].reverse(),
    [...toys.slice(4), ...toys.slice(0, 4)],
  ]) {
    const physics = new Physics(width);
    order.forEach((t, i) => {
      assert.equal(
        physics.drop(t.id, {
          x: width / 2 + ((i % 3) - 1) * 8,
          y: -170 - i * 3,
        }),
        true
      );
      assert.equal(physics.drop(t.id, { x: 20, y: -100 }), false);
    });
    const bodyIds = physics.toys.map((t) => t.body.id);
    let events = 0;
    for (let i = 0; i < 7200; i++) {
      events += physics.step(config.dt).length;
      for (const t of physics.toys)
        assert.ok(
          [
            t.body.position.x,
            t.body.position.y,
            t.body.velocity.x,
            t.body.velocity.y,
          ].every(Number.isFinite)
        );
    }
    assert.equal(events, toys.length);
    assert.deepEqual(
      physics.toys.map((t) => t.body.id),
      bodyIds
    );
    const rows = physics.toys.map((t) => ({
      id: t.id,
      depth: t.depth,
      x: Math.round(t.body.position.x),
      y: Math.round(t.body.position.y),
    }));
    for (const t of physics.toys) {
      const y = t.body.position.y;
      assert.ok(t.canvas && t.entries === 1);
      assert.ok(t.body.position.x >= 4 && t.body.position.x <= width - 4);
      assert.ok(
        t.depth === 'surface'
          ? y < 55
          : t.depth === 'middle'
            ? Math.abs(y - 150) < 20
            : y > 185,
        JSON.stringify(rows)
      );
      for (const other of physics.toys) {
        if (other === t) continue;
        assert.equal(
          Matter.Detector.canCollide(
            t.body.collisionFilter,
            other.body.collisionFilter
          ),
          t.depth === other.depth
        );
      }
    }
    const y0 = physics.toys.map((t) => t.body.position.y);
    for (let i = 0; i < 600; i++) physics.step(config.dt);
    physics.toys.forEach((t, i) =>
      assert.ok(
        Math.abs(t.body.position.y - y0[i]) < 1,
        `${width}px ${order[0].id} order: ${t.id} moved from ${y0[i]} to ${t.body.position.y}`
      )
    );
    physics.resize(width === 512 ? 384 : 512);
    assert.deepEqual(
      physics.toys.map((t) => t.body.id),
      bodyIds
    );
    physics.reset();
    assert.equal(physics.toys.length, 0);
    assert.equal(physics.engine.world.bodies.length, 3);
    physics.dispose();
    assert.equal(physics.engine.world.bodies.length, 0);
  }
  const water = new WaterSurface(width);
  water.impulse(width / 2, 180);
  for (let i = 0; i < 600; i++) {
    water.step(config.dt);
    assert.ok(Math.max(...water.h.map(Math.abs)) <= 5);
    assert.ok(Math.abs(water.h.reduce((a, b) => a + b, 0)) < 1e-7);
  }
  assert.ok(Math.max(...water.h.map(Math.abs)) < 0.001);
  for (let i = 0; i < 600; i++) {
    water.impulse(4 + (i % (width - 8)), 10000);
    water.step(config.dt);
    assert.ok([...water.h, ...water.v].every(Number.isFinite));
    assert.ok(Math.max(...water.h.map(Math.abs)) <= 5 + 1e-8);
  }
}
const scene = new Scene(512);
scene.setMode('beeswarm');
for (let i = 0; i < 20; i++) scene.step(config.dt);
const midway = scene.fish.map((f) => ({ x: f.x, y: f.y }));
scene.setMode('school');
assert.deepEqual(
  scene.fish.map((f) => ({ x: f.x, y: f.y })),
  midway
);
for (let i = 0; i < 20; i++) {
  scene.setMode(i % 2 ? 'school' : 'beeswarm');
  scene.step(config.dt);
}
assert.deepEqual(
  scene.fish.map((f) => f.id),
  data.map((f) => f.id)
);
scene.paused = true;
scene.setMode('beeswarm');
scene.fish.forEach((f) =>
  assert.deepEqual({ x: f.x, y: f.y }, scene.targets.get(f.id))
);
scene.reset();
assert.ok(scene.paused);
assert.equal(scene.transition, null);
scene.paused = false;
scene.setMode('beeswarm');
for (let i = 0; i < 60; i++) scene.step(config.dt);
scene.fish.forEach((f) =>
  assert.deepEqual({ x: f.x, y: f.y }, scene.targets.get(f.id))
);
scene.reset();
scene.paused = false;
for (let i = 0; i < 360; i++) scene.stepIdentity(config.dt);
assert.equal(scene.role, 0);
for (let i = 0; i < 16; i++) scene.stepIdentity(config.dt);
assert.equal(scene.role, 1);
const elapsed = scene.roleElapsed;
scene.stepIdentity(3, true);
assert.equal(scene.roleElapsed, elapsed);
scene.reset();
scene.reduced = true;
scene.drop('gpt', { x: 200, y: -100 });
assert.equal(scene.physics.toys[0].body.position.y, 150);
scene.paused = true;
assert.equal(scene.drop('ts', { x: 0, y: 0 }), false);
scene.dispose();
for (const x of [-120, 200, 700]) {
  const start = { x, y: -200 },
    end = { x: Math.max(24, Math.min(488, x)), y: -20 };
  assert.deepEqual(flight(start, end, 0), start);
  assert.deepEqual(flight(start, end, 1), end);
  const before = flight(start, end, 0.999999);
  assert.ok(Math.abs(end.x - before.x) < 0.00001);
}
const clock = new FixedClock();
let count = 0;
assert.equal(
  clock.advance(4, () => count++),
  4
);
assert.equal(count, 4);
for (const threshold of config.thresholds) {
  assert.equal(
    speedBand((threshold - 1e-6) * 80),
    config.thresholds.indexOf(threshold)
  );
  assert.equal(
    speedBand(threshold * 80),
    config.thresholds.indexOf(threshold) + 1
  );
}
for (const width of [512, 384])
  for (const h of [96, 64]) {
    const w = Math.round((h * (width - 8)) / 228);
    const e = {
      x: width / 2,
      y: 146,
      vx: 80,
      vy: 40,
      radius: 10,
      strength: 1,
      kind: 'entry' as const,
    };
    const c = waterCoordinates(e, width, w, h);
    assert.ok(Math.abs((c.vx * (width - 8)) / w - 80) < 1e-8);
    assert.equal((-c.vy * 228) / h, 40);
    assert.equal(c.v, 0.5);
  }
console.log(
  `PASS: data, deterministic dodge, 60s Boids, six ${toys.length}-toy simulations, layer collisions, reset/dispose, water decay, transitions, role hold, static drop, flight endpoints, fixed clock, GPU units/color thresholds`
);

// Session demonstration: eligibility, pre-release cancellation and storage failure.
import { Demo } from '../src/features/Profile/aquarium/demo';
const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
};
const auto = new Demo(storage),
  cancelled = new Demo(storage),
  invisible = new Demo(storage);
const broken = new Demo({
  getItem() {
    throw Error('unavailable');
  },
  setItem() {
    throw Error('unavailable');
  },
});
for (let i = 0; i < 300; i++)
  assert.equal(invisible.step(config.dt, false), undefined);
const actions: string[] = [];
for (let i = 0; i < 180; i++) {
  const action = auto.step(config.dt, true);
  if (action) actions.push(action);
}
assert.deepEqual(actions, ['wiggle', 'drop']);
assert.ok(new Demo(storage).done);
cancelled.cancel();
for (let i = 0; i < 300; i++)
  assert.equal(cancelled.step(config.dt, true), undefined);
broken.cancel();
assert.ok(new Demo().done);
console.log(
  'PASS: eligible one-shot demo, cancellation, session persistence and unavailable storage'
);

for (const [id, y, direction] of [
  ['ts', 100, -1],
  ['godot', 100, 1],
  ['gpt', 120, 1],
  ['gpt', 180, -1],
] as const) {
  const physics = new Physics(512);
  physics.drop(id, { x: 200, y: -100 }, true);
  physics.setReduced(false);
  Matter.Body.setPosition(physics.toys[0].body, { x: 200, y });
  physics.step(config.dt);
  assert.equal(
    Math.sign(Matter.Body.getVelocity(physics.toys[0].body).y),
    direction
  );
  physics.dispose();
}
const atRate = (rate: number) => {
  const s = new Scene(512),
    clock = new FixedClock();
  s.drop('controller', { x: 200, y: -120 });
  for (let i = 0; i < rate * 5; i++)
    clock.advance(1 / rate, () => s.step(config.dt));
  const p = { ...s.physics.toys[0].body.position };
  s.dispose();
  return p;
};
const thirty = atRate(30),
  sixty = atRate(60);
assert.ok(Math.hypot(thirty.x - sixty.x, thirty.y - sixty.y) < 1e-6);
console.log(
  'PASS: buoyancy and middle spring directions; identical fixed-step result at 30/60 render rates'
);

import {
  surfaceWave,
  bubbles,
  surfaceY,
  splashParticles,
} from '../src/features/Profile/aquarium/water-decoration';
const sizes = initialFish(512).map((f) => f.size);
assert.equal(new Set(sizes).size, 6);
assert.ok(Math.min(...sizes) >= 0.9 && Math.max(...sizes) <= 1.12);
assert.deepEqual(
  initialFish(384).map((f) => f.size),
  sizes
);
assert.ok(sizes.every((size) => Math.hypot(11.5 * size, 8 * size) < 16));
for (let frame = 0; frame < 600; frame++) {
  const time = frame / 12;
  for (let i = 0; i < 64; i++) assert.ok(Math.abs(surfaceWave(i, time)) <= 2.1);
  for (const width of [384, 512])
    for (const b of bubbles(width, time))
      assert.ok(
        b.x > 4 &&
          b.x + b.size < width - 4 &&
          b.y >= surfaceY(width, b.x, time) + b.size / 2 - 1e-7 &&
          b.y <= 248
      );
}
assert.notEqual(surfaceWave(20, 0), surfaceWave(20, 1));
console.log(
  'PASS: vertical value mapping and horizontal dodge; stable modest fish sizes; bounded ambient waves and bubbles'
);

for (const width of [512, 384]) {
  const heights = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i) * 4);
  for (const [i, bubble] of bubbles(width, 0).entries()) {
    const before = bubbles(width, bubble.popAt - 1e-6, heights)[i];
    assert.equal(before.phase, 'rise');
    assert.ok(
      Math.abs(
        before.y -
          before.size / 2 -
          surfaceY(width, before.x, bubble.popAt - 1e-6, heights)
      ) < 0.001
    );
    assert.equal(bubbles(width, bubble.popAt + 1e-6)[i].phase, 'pop');
    assert.equal(bubbles(width, bubble.popAt + 0.6)[i].phase, 'rest');
    assert.equal(bubbles(width, bubble.popAt + 0.901)[i].phase, 'rise');
  }
  const scene = new Scene(width);
  let expected = 0,
    actual = 0;
  for (let frame = 0; frame < 5400; frame++) {
    const previous = scene.ecoTime;
    scene.step(config.dt);
    expected += bubbles(width, scene.ecoTime).filter(
      (b) => b.popAt > previous && b.popAt <= scene.ecoTime
    ).length;
    actual += scene.effects.filter(
      (e) => e.kind === 'bubble' && e.age < config.dt
    ).length;
    assert.ok(scene.effects.length <= 10);
    assert.ok(Math.max(...scene.physics.surface.h.map(Math.abs)) <= 5);
  }
  assert.ok(actual > 30);
  assert.equal(actual, expected, 'Each surface arrival emits exactly one pop');
  scene.paused = true;
  const frozen = JSON.stringify(scene.snapshot());
  scene.step(1);
  assert.equal(JSON.stringify(scene.snapshot()), frozen);
  scene.paused = false;
  scene.reduced = true;
  const reducedSnapshot = JSON.stringify(scene.snapshot());
  scene.step(1);
  assert.equal(JSON.stringify(scene.snapshot()), reducedSnapshot);
  scene.reduced = false;
  scene.setMode('beeswarm');
  const eco = scene.ecoTime;
  for (let i = 0; i < 60; i++) scene.step(config.dt);
  assert.equal(scene.ecoTime, eco);
  assert.ok(scene.effects.every((e) => e.kind !== 'bubble'));
  scene.reset();
  assert.equal(scene.ecoTime, 0);
  assert.deepEqual(scene.effects, []);
  scene.dispose();
}
for (const kind of ['entry', 'bubble'] as const) {
  const life = kind === 'entry' ? 0.6 : 0.45;
  for (let age = 0; age < life; age += 1 / 120) {
    const particles = splashParticles(kind, age);
    assert.ok(particles.length <= (kind === 'entry' ? 8 : 5));
    assert.ok(
      particles.every(
        (p) =>
          p.y >= -16 &&
          p.y <= 0 &&
          Math.abs(p.x) < 44 &&
          p.alpha >= 0 &&
          p.alpha <= 1
      )
    );
  }
  assert.deepEqual(splashParticles(kind, life), []);
}
assert.ok(new Set(splashParticles('entry', 0.12).map((p) => p.y)).size > 2);
console.log(
  'PASS: bubbles reach the moving surface, pop exactly once and respawn; splash arcs, particle budget, pause, chart, reduced motion and reset'
);

// Tail deformation must not change the head position or crop outside the sprite.
import { sprite, atlas } from '../src/features/Profile/aquarium/scenery';
for (const name of ['fish-0', 'fish-1', 'fish-2', 'fish-3']) {
  const r = atlas[name][0];
  for (let frame = 0; frame < 4; frame++) {
    const calls: number[][] = [];
    const ctx = {
      save() {},
      restore() {},
      translate() {},
      drawImage(_image: unknown, ...args: number[]) {
        calls.push(args);
      },
    } as unknown as CanvasRenderingContext2D;
    sprite(ctx, {} as HTMLImageElement, name, 0, 0, frame);
    assert.ok(
      Math.abs(calls.reduce((sum, c) => sum + c[6], 0) - r.drawW) < 1e-7
    );
    for (const c of calls) {
      assert.ok(c[0] >= r.x && c[0] + c[2] <= r.x + r.w + 1e-7);
      assert.ok(Math.abs(c[5] + r.anchorY) <= 0.45 + 1e-7);
    }
    assert.equal(calls.at(-1)![5], -r.anchorY);
  }
}
console.log(
  'PASS: fine sprite tail bends stay bounded and preserve head position'
);

// Exercise the same pointer/tap entry points as the canvas, with isolated fish.
for (const width of [384, 512]) {
  const make = () => {
    const scene = new Scene(width);
    scene.fish = [{ ...scene.fish[0], x: 160, y: 140, vx: 0, vy: 0 }];
    return scene;
  };
  const rest = make(),
    hover = make(),
    follow = make();
  hover.movePointer({ x: 90, y: 140 }, 1000);
  follow.movePointer({ x: 230, y: 140 }, 1000);
  assert.equal(
    hover.pointer?.interest,
    0,
    'Entering the tank is not a scare or instant attraction'
  );
  assert.equal(hover.scares.length, 0);
  for (let i = 1; i <= 180; i++) {
    follow.movePointer({ x: 230 + i / 6, y: 140 }, 1000 + (i * 1000) / 60);
    for (const s of [rest, hover, follow]) s.step(config.dt);
  }
  assert.ok(
    hover.fish[0].x < rest.fish[0].x - 20,
    'Dwell draws a nearby fish closer'
  );
  assert.ok(
    follow.fish[0].x > rest.fish[0].x + 20,
    'A slowly moving pointer draws a follower'
  );
  assert.equal(follow.scares.length, 0, 'Slow movement never startles');
  assert.ok(
    hover.fish[0].x > 102,
    'Curious fish leave room around the pointer'
  );
  hover.movePointer();
  assert.equal(hover.pointer, undefined);

  const click = make(),
    swipe = make(),
    control = make();
  click.tap({ x: 130, y: 140 });
  swipe.movePointer({ x: 40, y: 115 }, 1000);
  swipe.movePointer({ x: width - 40, y: 115 }, 1016);
  assert.equal(swipe.scares.length, 1);
  let peak = 0;
  for (let i = 0; i < 30; i++) {
    for (const s of [click, swipe, control]) s.step(config.dt);
    peak = Math.max(peak, Math.hypot(swipe.fish[0].vx, swipe.fish[0].vy));
  }
  assert.ok(
    click.fish[0].x > control.fish[0].x + 5,
    'Click drives nearby fish away'
  );
  assert.ok(
    swipe.fish[0].y > control.fish[0].y + 5,
    'A fast sweep reaches fish between event endpoints'
  );
  assert.ok(
    peak > 26,
    'Startled fish briefly swim faster than their cruising limit'
  );
  swipe.movePointer();
  for (let i = 0; i < 180; i++) swipe.step(config.dt);
  assert.equal(swipe.scares.length, 0);
  assert.equal(swipe.fish[0].fright, 0);
  assert.ok(Math.hypot(swipe.fish[0].vx, swipe.fish[0].vy) <= 26 + 1e-8);
  for (const s of [rest, hover, follow, click, swipe, control]) s.dispose();
}
const crowd = initialFish(512)
  .slice(0, 4)
  .map((f, i) => ({
    ...f,
    x: [160, 200, 300, 365][i],
    y: 140,
    vx: 0,
    vy: 0,
  }));
const unobserved = crowd.map((f) => ({ ...f }));
stepSchool(crowd, 512, config.dt, 0, [], { x: 250, y: 140, interest: 1 });
stepSchool(unobserved, 512, config.dt, 0);
assert.ok(crowd[0].vx > unobserved[0].vx && crowd[1].vx > unobserved[1].vx);
assert.ok(crowd[2].vx < unobserved[2].vx);
assert.deepEqual(
  crowd[3],
  unobserved[3],
  'Only the three nearest fish become curious'
);

const interaction = new Scene(512);
for (const state of ['paused', 'reduced', 'beeswarm'] as const) {
  interaction.paused = state === 'paused';
  interaction.reduced = state === 'reduced';
  interaction.setMode(state === 'beeswarm' ? 'beeswarm' : 'school');
  const fish = interaction.fish.map((f) => ({ ...f }));
  interaction.movePointer({ x: 100, y: 140 }, 1000);
  interaction.movePointer({ x: 400, y: 140 }, 1016);
  interaction.tap({ x: 200, y: 140 });
  assert.equal(interaction.pointer, undefined);
  assert.equal(interaction.scares.length, 0);
  assert.deepEqual(interaction.fish, fish);
}
interaction.setMode('school');
for (let i = 0; i < 200; i++) interaction.tap({ x: 200, y: 140 });
assert.ok(
  interaction.scares.length <= 12,
  'Rapid input has a bounded scare budget'
);
interaction.movePointer({ x: 200, y: 140 }, 1000);
interaction.resize(384);
assert.equal(interaction.pointer, undefined);
assert.equal(interaction.scares.length, 0);
interaction.tap({ x: 180, y: 140 });
interaction.reset();
assert.equal(interaction.scares.length, 0);
assert.ok(interaction.fish.every((f) => f.fright === 0));
interaction.dispose();
console.log(
  'PASS: dwell, slow following, three-fish curiosity, click escape, swept-path startle, recovery, input budget, pause/chart/reduced-motion isolation and reset/resize'
);
