import {
  Fish,
  Point,
  ViewMode,
  initialFish,
  toys,
  ToyId,
  config,
  clamp,
} from './data';
import { beeswarm } from './beeswarm';
import { stepSchool, SchoolScare } from './school';
import { Physics, WaterImpulse } from './physics';
import { bubbles, surfaceY } from './water-decoration';

export class Scene {
  fish: Fish[];
  physics: Physics;
  targets: Map<string, Point>;
  mode: ViewMode = 'school';
  paused = false;
  reduced = false;
  time = 0;
  ecoTime = 0;
  schoolAge = 0.5;
  sanded = new Set<ToyId>();
  role = 0;
  roleElapsed = 0;
  pointer:
    | (Point & { speed: number; calm: number; interest: number; at: number })
    | undefined;
  scares: SchoolScare[] = [];
  transition: { start: Point[]; elapsed: number } | null = null;
  impulses: WaterImpulse[] = [];
  effects: (Point & {
    age: number;
    kind: 'sand' | 'entry' | 'bubble';
    strength?: number;
  })[] = [];
  constructor(public width: number) {
    this.fish = initialFish(width);
    this.physics = new Physics(width);
    this.targets = beeswarm(width);
  }
  setMode(mode: ViewMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.pointer = undefined;
    this.scares = [];
    this.fish.forEach((f) => (f.fright = 0));
    if (mode === 'school') this.schoolAge = 0;
    this.transition =
      mode === 'beeswarm'
        ? { start: this.fish.map((f) => ({ x: f.x, y: f.y })), elapsed: 0 }
        : null;
    if (this.paused || this.reduced) {
      if (mode === 'beeswarm')
        this.fish.forEach((f) => Object.assign(f, this.targets.get(f.id)));
      this.transition = null;
    }
  }
  drop(id: ToyId, point: Point) {
    return !this.paused && this.physics.drop(id, point, this.reduced);
  }
  get chartOpacity() {
    return this.mode === 'beeswarm'
      ? this.transition
        ? Math.max(0, Math.min(1, (this.transition.elapsed / 0.9 - 0.3) / 0.7))
        : 1
      : 0;
  }
  tap(point: Point) {
    if (this.paused || this.reduced) return;
    if (this.mode === 'school') {
      this.scare(point, point);
      if (this.pointer) {
        this.pointer.calm = -0.8;
        this.pointer.interest = 0;
      }
    }
    this.physics.surface.impulse(point.x, 45);
    this.impulses.push({
      ...point,
      vx: 20,
      vy: 45,
      radius: 10,
      strength: 0.3,
      kind: 'tap',
    });
  }
  movePointer(point?: Point, at = 0) {
    if (!point || this.paused || this.reduced || this.mode !== 'school') {
      this.pointer = undefined;
      return;
    }
    const previous = this.pointer,
      elapsed = previous ? (at - previous.at) / 1000 : 0,
      distance = previous
        ? Math.hypot(point.x - previous.x, point.y - previous.y)
        : 0,
      speed =
        elapsed > 0 && elapsed < 0.25
          ? distance / Math.max(1 / 120, elapsed)
          : 0;
    if (previous && speed > 220) this.scare(previous, point);
    this.pointer = {
      ...point,
      at,
      speed,
      calm: speed > 100 ? 0 : (previous?.calm ?? 0),
      interest: speed > 100 ? 0 : (previous?.interest ?? 0),
    };
  }
  private scare(from: Point, to: Point) {
    this.scares.push({ from: { x: from.x, y: from.y }, to: { ...to }, age: 0 });
    this.scares = this.scares.slice(-12);
  }
  stepIdentity(dt: number, held = false) {
    if (this.paused || this.reduced || held) return;
    this.roleElapsed += dt;
    if (this.roleElapsed >= [6, 3, 3][this.role] + 0.24) {
      this.role = (this.role + 1) % 3;
      this.roleElapsed = 0;
    }
  }
  step(dt: number) {
    if (this.paused || this.reduced) return [];
    this.time += dt;
    const previousEcoTime = this.ecoTime;
    if (this.mode === 'school') {
      this.ecoTime += dt;
      this.schoolAge += dt;
      if (this.pointer) {
        this.pointer.speed *= Math.exp(-dt * 8);
        if (this.pointer.speed < 100) this.pointer.calm += dt;
        this.pointer.interest = clamp((this.pointer.calm - 0.45) / 0.7, 0, 1);
      }
    }
    this.scares = this.scares.filter((s) => (s.age += dt) < 0.65);
    const entries = this.physics.step(dt);
    this.impulses.push(...entries);
    this.effects = this.effects.filter(
      (e) =>
        (e.age += dt) <
        (e.kind === 'sand' ? 0.4 : e.kind === 'bubble' ? 0.45 : 0.6)
    );
    this.effects.push(
      ...entries.map((e) => ({
        ...e,
        y: surfaceY(this.width, e.x, this.ecoTime, this.physics.surface.h),
        age: 0,
        kind: 'entry' as const,
        strength: Math.min(1, Math.abs(e.vy) / 180),
      }))
    );
    if (this.mode === 'school') {
      for (const b of bubbles(
        this.width,
        this.ecoTime,
        this.physics.surface.h
      )) {
        if (b.popAt <= previousEcoTime || b.popAt > this.ecoTime) continue;
        const y = surfaceY(
          this.width,
          b.x,
          this.ecoTime,
          this.physics.surface.h
        );
        this.effects.push({
          x: b.x,
          y,
          age: this.ecoTime - b.popAt,
          kind: 'bubble',
        });
        this.physics.surface.impulse(b.x, -12);
        this.impulses.push({
          x: b.x,
          y: 32,
          vx: 0,
          vy: -12,
          radius: 4,
          strength: 0.04,
          kind: 'tap',
        });
      }
    }
    for (const t of this.physics.toys)
      if (
        t.depth === 'deep' &&
        t.body.bounds.max.y >= 259 &&
        !this.sanded.has(t.id)
      ) {
        this.sanded.add(t.id);
        this.effects.push({
          x: t.body.position.x,
          y: 260,
          age: 0,
          kind: 'sand',
        });
      }
    if (this.mode === 'school')
      stepSchool(
        this.fish,
        this.width,
        dt * Math.min(1, this.schoolAge / 0.5),
        this.time,
        [
          ...this.physics.toys
            .filter((t) => t.canvas)
            .map((t) => t.body.position),
          ...this.effects,
        ],
        this.pointer,
        this.scares
      );
    else if (this.transition) {
      const t = this.transition;
      t.elapsed += dt;
      const u = Math.min(1, t.elapsed / 0.9),
        ease = u * u * (3 - 2 * u);
      this.fish.forEach((f, i) => {
        const goal = this.targets.get(f.id)!;
        f.x = t.start[i].x + (goal.x - t.start[i].x) * ease;
        f.y = t.start[i].y + (goal.y - t.start[i].y) * ease;
      });
      if (u === 1) {
        this.fish.forEach((f) => Object.assign(f, this.targets.get(f.id)));
        this.transition = null;
      }
    }
    if (
      this.mode === 'school' &&
      Math.floor(this.time * 6) !== Math.floor((this.time - dt) * 6)
    ) {
      for (const f of this.fish)
        this.impulses.push({
          x: f.x - 7 * f.facing,
          y: f.y,
          vx: -f.vx,
          vy: -f.vy,
          radius: 4,
          strength: 0.025,
          kind: 'wake',
        });
    }
    const events = this.impulses;
    this.impulses = [];
    return events;
  }
  resize(width: number) {
    if (width === this.width) return;
    const ratio = (width - 8) / (this.width - 8),
      map = (p: Point) => ({ x: 4 + (p.x - 4) * ratio, y: p.y });
    this.fish.forEach((f) => {
      Object.assign(f, map(f));
      f.vx *= ratio;
    });
    this.pointer = undefined;
    this.scares = [];
    this.effects.forEach((e) => Object.assign(e, map(e)));
    this.physics.resize(width);
    this.width = width;
    this.targets = beeswarm(width);
    if (this.mode === 'beeswarm') {
      this.transition = {
        start: this.fish.map((f) => ({ x: f.x, y: f.y })),
        elapsed: 0,
      };
      if (this.paused || this.reduced) {
        this.fish.forEach((f) => Object.assign(f, this.targets.get(f.id)));
        this.transition = null;
      }
    }
  }
  reset() {
    this.fish = initialFish(this.width);
    this.physics.reset();
    this.mode = 'school';
    this.transition = null;
    this.time = 0;
    this.ecoTime = 0;
    this.schoolAge = 0.5;
    this.sanded.clear();
    this.role = 0;
    this.roleElapsed = 0;
    this.effects = [];
    this.impulses = [];
    this.pointer = undefined;
    this.scares = [];
  }
  snapshot() {
    return {
      width: this.width,
      mode: this.mode,
      paused: this.paused,
      reduced: this.reduced,
      time: this.time,
      ecoTime: this.ecoTime,
      pointer: this.pointer ? { ...this.pointer } : undefined,
      scares: this.scares.map((s) => ({
        ...s,
        from: { ...s.from },
        to: { ...s.to },
      })),
      effects: this.effects.map((e) => ({ ...e })),
      role: this.role,
      fish: this.fish.map((f) => ({ ...f })),
      toys: this.physics.toys.map((t) => ({
        id: t.id,
        bodyId: t.body.id,
        depth: t.depth,
        phase: t.phase,
        canvas: t.canvas,
        guided: t.guided,
        x: t.body.position.x,
        y: t.body.position.y,
        entries: t.entries,
      })),
      bodies: this.physics.engine.world.bodies.length,
      waterMax: Math.max(...this.physics.surface.h.map(Math.abs)),
    };
  }
  dispose() {
    this.physics.dispose();
  }
}

export class FixedClock {
  accumulator = 0;
  advance(elapsed: number, step: () => void) {
    this.accumulator += Math.min(0.1, Math.max(0, elapsed));
    let count = 0;
    while (this.accumulator >= config.dt && count < 4) {
      step();
      this.accumulator -= config.dt;
      count++;
    }
    if (count === 4) this.accumulator = 0;
    return count;
  }
}
