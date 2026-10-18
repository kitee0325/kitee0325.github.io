import Matter from 'matter-js';
import { Point, ToyId, toys, config, clamp, Depth } from './data';
const { Engine, Bodies, Body, Composite } = Matter;
export interface WaterImpulse extends Point {
  vx: number;
  vy: number;
  radius: number;
  strength: number;
  kind: 'entry' | 'tap' | 'wake';
}
export interface Toy {
  id: ToyId;
  depth: Depth;
  body: Matter.Body;
  phase: 'loosening' | 'falling' | 'inWater';
  age: number;
  start: Point;
  end: Point;
  duration: number;
  guided: boolean;
  entered: boolean;
  canvas: boolean;
  entries: number;
}
export const categories = { surface: 2, middle: 4, deep: 8 };
export function flight(start: Point, end: Point, u: number) {
  const h = end.y - start.y,
    v = 1 - u;
  return {
    x:
      v ** 3 * start.x +
      3 * v * v * u * start.x +
      3 * v * u * u * end.x +
      u ** 3 * end.x,
    y:
      v ** 3 * start.y +
      3 * v * v * u * (start.y + 0.25 * h) +
      3 * v * u * u * (end.y - 0.25 * h) +
      u ** 3 * end.y,
  };
}
export class WaterSurface {
  h = new Float64Array(64);
  v = new Float64Array(64);
  constructor(public width: number) {}
  impulse(x: number, vy: number) {
    const weights = Array.from({ length: 62 }, (_, i) =>
      Math.exp(-(((4 + ((i + 1) * (this.width - 8)) / 63 - x) / 10) ** 2))
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    weights.forEach(
      (w, i) =>
        (this.v[i + 1] +=
          (clamp(vy * 0.8, -160, 160) * w) / Math.max(sum, 1e-8))
    );
  }
  step(dt: number) {
    const next = this.h.slice(),
      velocity = this.v.slice(),
      dx = (this.width - 8) / 63;
    for (let i = 1; i < 63; i++) {
      velocity[i] +=
        (-36 * this.h[i] -
          8 * this.v[i] +
          (900 * (this.h[i - 1] - 2 * this.h[i] + this.h[i + 1])) / dx ** 2) *
        dt;
      next[i] += velocity[i] * dt;
    }
    const mh = next.reduce((a, b) => a + b, 0) / 62,
      mv = velocity.reduce((a, b) => a + b, 0) / 62;
    for (let i = 1; i < 63; i++) {
      next[i] -= mh;
      velocity[i] -= mv;
    }
    const scale = Math.min(1, 5 / Math.max(...next.map(Math.abs)));
    this.h = next.map((v) => v * scale);
    this.v = velocity.map((v) => v * scale);
  }
  reset() {
    this.h.fill(0);
    this.v.fill(0);
  }
}
export class Physics {
  engine = Engine.create({
    gravity: { x: 0, y: 1, scale: config.gravity },
    // Keep the larger stack stable when all personal icons land together.
    positionIterations: 10,
    velocityIterations: 8,
  });
  toys: Toy[] = [];
  walls: Matter.Body[] = [];
  surface: WaterSurface;
  constructor(public width: number) {
    this.surface = new WaterSurface(width);
    this.makeWalls();
  }
  makeWalls() {
    Composite.remove(this.engine.world, this.walls);
    this.walls = [
      Bodies.rectangle(-16, 140, 40, 280, { isStatic: true }),
      Bodies.rectangle(this.width + 16, 140, 40, 280, { isStatic: true }),
      Bodies.rectangle(this.width / 2, 280, this.width + 80, 40, {
        isStatic: true,
      }),
    ];
    this.walls.forEach(
      (b) => (b.collisionFilter = { category: 1, mask: 14, group: 0 })
    );
    Composite.add(this.engine.world, this.walls);
  }
  drop(id: ToyId, start: Point, instant = false) {
    if (this.toys.some((t) => t.id === id)) return false;
    const def = toys.find((t) => t.id === id);
    if (!def) return false;
    let body = Bodies.rectangle(
      start.x,
      start.y,
      id === 'intp' ? 30 : 24,
      id === 'intp' ? 12 : 22,
      {
        restitution: config.restitution,
        friction: 0.35,
        frictionAir: 0,
        collisionFilter: { category: categories[def.depth], mask: 0, group: 0 },
      }
    );
    if (id === 'controller') {
      const options = {
        restitution: config.restitution,
        friction: 0.35,
        frictionAir: 0,
        collisionFilter: { category: categories[def.depth], mask: 0, group: 0 },
      };
      body = Body.create({
        ...options,
        parts: [
          Bodies.rectangle(start.x, start.y - 3, 22, 10, options),
          Bodies.rectangle(start.x - 8, start.y + 3, 8, 10, options),
          Bodies.rectangle(start.x + 8, start.y + 3, 8, 10, options),
        ],
      });
    }
    Body.setPosition(body, start);
    Body.setStatic(body, true);
    Body.setAngle(body, (3 * Math.PI) / 180);
    const end = { x: clamp(start.x, 24, this.width - 24), y: -20 };
    const toy: Toy = {
      id,
      depth: def.depth,
      body,
      phase: 'loosening',
      age: 0,
      start: { ...start },
      end,
      duration: Math.max(0.55, (0.75 * (end.y - start.y)) / 180),
      guided: true,
      entered: false,
      canvas: false,
      entries: 0,
    };
    this.toys.push(toy);
    Composite.add(this.engine.world, body);
    if (instant || start.y >= -20) this.settle(toy);
    return true;
  }
  settle(toy: Toy) {
    const def = toys.find((t) => t.id === toy.id)!;
    Body.setStatic(toy.body, true);
    Body.setPosition(toy.body, {
      x: def.x[this.width === 512 ? 0 : 1],
      y: def.y,
    });
    Body.setAngle(toy.body, 0);
    toy.guided = false;
    toy.canvas = true;
    toy.entered = true;
    toy.phase = 'inWater';
  }
  setReduced(reduced: boolean) {
    for (const toy of this.toys) {
      if (reduced) this.settle(toy);
      else if (toy.body.isStatic) {
        Body.setStatic(toy.body, false);
        toy.body.collisionFilter.mask = categories[toy.depth] | 1;
        Body.setVelocity(toy.body, { x: 0, y: 0 });
        Body.setAngularVelocity(toy.body, 0);
      }
    }
  }
  step(dt: number): WaterImpulse[] {
    const events: WaterImpulse[] = [];
    for (const t of this.toys) {
      t.age += dt;
      if (t.phase === 'loosening') {
        if (t.age < 0.18) continue;
        t.phase = 'falling';
        t.age = 0;
      }
      if (t.guided) {
        Body.setPosition(
          t.body,
          flight(t.start, t.end, Math.min(1, t.age / t.duration))
        );
        if (t.age < t.duration) continue;
        t.guided = false;
        Body.setStatic(t.body, false);
        t.body.collisionFilter.mask = categories[t.depth] | 1;
        Body.setVelocity(t.body, {
          x: 0,
          y: (0.75 * (t.end.y - t.start.y)) / t.duration / 60,
        });
      }
      const b = t.body;
      if (b.isStatic || !Number.isFinite(b.mass)) continue;
      const submerged = clamp(
        (b.bounds.max.y - 32) / (b.bounds.max.y - b.bounds.min.y),
        0,
        1
      );
      // shortcut: 以浸水比例和共享冲量近似水体耦合，需要真实排水或流固反馈时再升级求解器
      Body.applyForce(b, b.position, {
        x: 0,
        y: -b.mass * config.gravity * submerged * config.buoyancy[t.depth],
      });
      b.frictionAir = config.drag * submerged;
      // 中层弹簧表达个人工具层次，不代表均匀水体中的自然悬浮。
      if (t.depth === 'middle' && submerged === 1)
        Body.applyForce(b, b.position, {
          x: 0,
          y:
            (b.mass *
              clamp(
                4 * (150 - b.position.y) - 4 * Body.getVelocity(b).y * 60,
                -80,
                80
              )) /
            1e6,
        });
      const velocity = Body.getVelocity(b);
      const speed = Math.hypot(velocity.x, velocity.y) * 60;
      if (speed > 240)
        Body.setVelocity(b, {
          x: (velocity.x * 240) / speed,
          y: (velocity.y * 240) / speed,
        });
      Body.setAngularVelocity(
        b,
        clamp(Body.getAngularVelocity(b), -0.025, 0.025)
      );
    }
    Engine.update(this.engine, dt * 1000);
    for (const t of this.toys) {
      const b = t.body;
      if (!t.guided && b.bounds.min.y >= 4) t.canvas = true;
      if (
        !t.entered &&
        !b.isStatic &&
        (b.bounds.max.y - 32) / (b.bounds.max.y - b.bounds.min.y) > 0.05 &&
        Body.getVelocity(b).y > 0
      ) {
        t.entered = true;
        t.phase = 'inWater';
        t.entries++;
        const e: WaterImpulse = {
          x: b.position.x,
          y: 32,
          vx: Body.getVelocity(b).x * 60,
          vy: Body.getVelocity(b).y * 60,
          radius: 14,
          strength: 1,
          kind: 'entry',
        };
        events.push(e);
        this.surface.impulse(e.x, e.vy);
      }
    }
    this.surface.step(dt);
    return events;
  }
  resize(width: number) {
    const ratio = (width - 8) / (this.width - 8),
      map = (p: Point) => ({ x: 4 + (p.x - 4) * ratio, y: p.y });
    for (const t of this.toys) {
      Body.setPosition(t.body, map(t.body.position));
      const v = Body.getVelocity(t.body);
      Body.setVelocity(t.body, { x: v.x * ratio, y: v.y });
      t.start = map(t.start);
      t.end = map(t.end);
    }
    this.width = width;
    this.surface.width = width;
    this.surface.reset();
    this.makeWalls();
  }
  reset() {
    Composite.remove(
      this.engine.world,
      this.toys.map((t) => t.body)
    );
    this.toys = [];
    Engine.clear(this.engine);
    this.surface.reset();
  }
  dispose() {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.toys = [];
  }
}
