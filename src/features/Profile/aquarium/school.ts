import { Fish, Point, clamp } from './data';
export interface SchoolScare {
  from: Point;
  to: Point;
  age: number;
}
export function stepSchool(
  fish: Fish[],
  width: number,
  dt: number,
  time: number,
  obstacles: Point[] = [],
  pointer?: Point & { interest: number },
  scares: SchoolScare[] = []
) {
  const old = fish.map((f) => ({ ...f }));
  const curious =
    pointer && pointer.interest > 0
      ? old
          .filter(
            (f) =>
              f.fright < 0.1 &&
              Math.hypot(f.x - pointer.x, f.y - pointer.y) < 140
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - pointer.x, a.y - pointer.y) -
              Math.hypot(b.x - pointer.x, b.y - pointer.y)
          )
          .slice(0, 3)
      : [];
  fish.forEach((f, i) => {
    const p = old[i];
    f.fright = Math.max(0, p.fright - dt * 0.65);
    let sx = 0,
      sy = 0,
      ax = 0,
      ay = 0,
      cx = 0,
      cy = 0,
      weight = 0;
    old.forEach((q, j) => {
      if (i === j) return;
      let dx = p.x - q.x,
        dy = p.y - q.y,
        d = Math.hypot(dx, dy);
      if (d < 0.001) {
        dx = i < j ? -1 : 1;
        dy = 0;
        d = 1;
      }
      // Start separating before the sprites touch, regardless of species.
      if (d < 32) {
        sx += (dx / d) * (32 - d) * 2;
        sy += (dy / d) * (32 - d) * 2;
      }
      if (d < 42) {
        const w = p.series === q.series ? 1 : 0.08;
        ax += q.vx * w;
        ay += q.vy * w;
        cx += q.x * w;
        cy += q.y * w;
        weight += w;
      }
    });
    let fx = sx + Math.cos(time * 0.17 + i * 2.4) * 9 - p.vx * 0.18,
      fy = sy + Math.sin(time * 0.13 + i * 1.3) * 7 - p.vy * 0.18;
    if (weight) {
      fx += 0.22 * (ax / weight - p.vx) + 0.06 * (cx / weight - p.x);
      fy += 0.22 * (ay / weight - p.vy) + 0.06 * (cy / weight - p.y);
    }
    fx += Math.max(0, 40 - p.x) * 2 - Math.max(0, p.x - width + 40) * 2;
    fy += Math.max(0, 68 - p.y) * 2 - Math.max(0, p.y - 228) * 2;
    for (const o of obstacles) {
      const dx = p.x - o.x,
        dy = p.y - o.y,
        d = Math.hypot(dx, dy);
      if (d < 36) {
        fx += ((dx || 1) / Math.max(d, 1)) * (36 - d) * 3;
        fy += (dy / Math.max(d, 1)) * (36 - d) * 3;
      }
    }
    if (pointer) {
      const dx = pointer.x - p.x,
        dy = pointer.y - p.y,
        d = Math.hypot(dx, dy);
      // Keep a small viewing distance so curious fish remain easy to select.
      if (curious.includes(p) && d > 28) {
        const pull = Math.min(38, (d - 28) * 0.8) * pointer.interest;
        fx += (dx / d) * pull - p.vx * 0.8 * pointer.interest;
        fy += (dy / d) * pull - p.vy * 0.8 * pointer.interest;
      } else if (d < 20) {
        fx -= ((dx || 1) / Math.max(1, d)) * (20 - d) * 2;
        fy -= (dy / Math.max(1, d)) * (20 - d) * 2;
      }
    }
    for (const scare of scares) {
      if (scare.age < (i % 4) * 0.025) continue;
      const sx = scare.to.x - scare.from.x,
        sy = scare.to.y - scare.from.y,
        length2 = sx * sx + sy * sy,
        t = length2
          ? clamp(
              ((p.x - scare.from.x) * sx + (p.y - scare.from.y) * sy) / length2,
              0,
              1
            )
          : 0,
        dx = p.x - scare.from.x - sx * t,
        dy = p.y - scare.from.y - sy * t,
        d = Math.hypot(dx, dy),
        strength = Math.max(0, 1 - d / 76) * Math.max(0, 1 - scare.age / 0.65);
      f.fright = Math.max(f.fright, strength);
      fx += ((dx || (i % 2 ? 1 : -1)) / Math.max(1, d)) * strength * 180;
      fy += (dy / Math.max(1, d)) * strength * 180;
    }
    const a = Math.hypot(fx, fy);
    const acceleration = 45 + f.fright * 180;
    if (a > acceleration) {
      fx *= acceleration / a;
      fy *= acceleration / a;
    }
    f.vx += fx * dt;
    f.vy += fy * dt;
    const speed = Math.hypot(f.vx, f.vy);
    const limit = 26 + f.fright * 46;
    if (speed > limit) {
      f.vx *= limit / speed;
      f.vy *= limit / speed;
    }
    f.x = clamp(f.x + f.vx * dt, 16, width - 16);
    f.y = clamp(f.y + f.vy * dt, 44, 248);
    if (f.x === 16) f.vx = Math.abs(f.vx);
    if (f.x === width - 16) f.vx = -Math.abs(f.vx);
    if (f.y === 44) f.vy = Math.abs(f.vy);
    if (f.y === 248) f.vy = -Math.abs(f.vy);
    if (Math.abs(f.vx) > 1) f.facing = f.vx < 0 ? -1 : 1;
  });
}
