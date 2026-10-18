import { Fish, Point, clamp } from './data';
export function stepSchool(
  fish: Fish[],
  width: number,
  dt: number,
  time: number,
  obstacles: Point[] = [],
  pointer?: Point
) {
  const old = fish.map((f) => ({ ...f }));
  fish.forEach((f, i) => {
    const p = old[i];
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
    for (const o of pointer ? [...obstacles, pointer] : obstacles) {
      const dx = p.x - o.x,
        dy = p.y - o.y,
        d = Math.hypot(dx, dy);
      if (d < 36) {
        fx += ((dx || 1) / Math.max(d, 1)) * (36 - d) * 3;
        fy += (dy / Math.max(d, 1)) * (36 - d) * 3;
      }
    }
    const a = Math.hypot(fx, fy);
    if (a > 45) {
      fx *= 45 / a;
      fy *= 45 / a;
    }
    f.vx += fx * dt;
    f.vy += fy * dt;
    const speed = Math.hypot(f.vx, f.vy);
    if (speed > 26) {
      f.vx *= 26 / speed;
      f.vy *= 26 / speed;
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
