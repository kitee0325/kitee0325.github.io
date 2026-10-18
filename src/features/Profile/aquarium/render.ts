import { Scene } from './scene';
import { columnX, chartTop, chartBottom } from './beeswarm';
import {
  surfaceWave,
  surfaceY,
  bubbles,
  splashParticles,
} from './water-decoration';
import { createScenery, sprite } from './scenery';
import { tankPath, glassFrame } from './glass';
import type { Fluid } from '../../Background/engine';
export function createRenderer(
  light: HTMLImageElement,
  darkImage: HTMLImageElement
) {
  const scenery = createScenery(light, darkImage);
  return (
    ctx: CanvasRenderingContext2D,
    s: Scene,
    fluid: Fluid | null,
    dark: boolean
  ) => {
    const w = s.width,
      image = dark ? darkImage : light;
    const waterline = s.physics.surface.h.map(
      (h, i) => h + surfaceWave(i, s.ecoTime)
    );
    ctx.setTransform(ctx.canvas.width / w, 0, 0, ctx.canvas.height / 288, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, 288);
    ctx.save();
    tankPath(ctx, w);
    ctx.clip();
    ctx.fillStyle = dark ? '#182841' : '#F6F5FC';
    ctx.fillRect(0, 0, w, 288);
    ctx.save();
    ctx.beginPath();
    waterline.forEach((v, i) => {
      const x = Math.round(4 + (i * (w - 8)) / 63),
        y = Math.round(32 + v);
      if (i === 0) ctx.moveTo(x, y);
      else {
        ctx.lineTo(x, Math.round(32 + waterline[i - 1]));
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(w - 4, 260);
    ctx.lineTo(4, 260);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = dark ? '#223D5B' : '#EAF6FD';
    ctx.fillRect(4, 24, w - 8, 236);
    if (fluid && !fluid.lost) {
      fluid.render(dark);
      ctx.globalAlpha = s.mode === 'beeswarm' ? 0.35 : 1;
      ctx.drawImage(fluid.canvas, 4, 32, w - 8, 228);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    scenery(ctx, w, dark, s.ecoTime, s.mode === 'beeswarm');
    ctx.save();
    ctx.globalAlpha = s.mode === 'school' ? 0.75 : 0.35;
    ctx.fillStyle = dark ? '#9DC4DF' : '#87BDD7';
    for (const bubble of bubbles(w, s.ecoTime, s.physics.surface.h)) {
      if (bubble.phase !== 'rise') continue;
      const { size } = bubble,
        x = Math.round(bubble.x - size / 2),
        y = Math.round(bubble.y - size / 2);
      ctx.fillRect(x + 1, y, size - 2, 1);
      ctx.fillRect(x + 1, y + size - 1, size - 2, 1);
      ctx.fillRect(x, y + 1, 1, size - 2);
      ctx.fillRect(x + size - 1, y + 1, 1, size - 2);
      ctx.fillStyle = dark ? '#D5E7F3' : '#FFFFFF';
      ctx.fillRect(x + 1, y + 1, 1, 1);
      ctx.fillStyle = dark ? '#9DC4DF' : '#87BDD7';
    }
    ctx.restore();
    for (const depth of ['deep', 'middle', 'surface'])
      for (const t of s.physics.toys.filter(
        (t) => t.canvas && t.depth === depth
      )) {
        ctx.save();
        ctx.translate(
          Math.round(t.body.position.x),
          Math.round(t.body.position.y)
        );
        ctx.rotate(t.body.angle);
        sprite(ctx, image, t.id, 0, 0);
        ctx.restore();
      }
    if (s.mode === 'beeswarm') {
      ctx.globalAlpha = s.chartOpacity;
      ctx.strokeStyle = dark ? '#42617E' : '#CFDFED';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(columnX(w, i), chartTop);
        ctx.lineTo(columnX(w, i), chartBottom);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(32, chartTop);
      ctx.lineTo(32, chartBottom);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const f of s.fish) {
      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.size, f.size);
      sprite(
        ctx,
        image,
        `fish-${f.series}`,
        0,
        0,
        s.mode === 'school' ? Math.floor(s.time * 7) : 0
      );
      ctx.restore();
    }
    for (const e of s.effects.filter((e) => e.kind === 'sand').slice(-1)) {
      ctx.fillStyle = dark ? '#8994AE' : '#C4C9DA';
      for (let i = 0; i < 6; i++)
        ctx.fillRect(
          Math.round(e.x + (i - 2.5) * e.age * 25),
          Math.round(259 - e.age * 12 - (i % 3)),
          1,
          1
        );
    }
    ctx.beginPath();
    waterline.forEach((v, i) => {
      const x = Math.round(4 + (i * (w - 8)) / 63),
        y = Math.round(32 + v);
      if (i === 0) ctx.moveTo(x, y);
      else {
        ctx.lineTo(x, Math.round(32 + waterline[i - 1]));
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = '#8ABDDC';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Two bursts at most keep the shared splash budget within 16 droplets.
    const splashes = [
      ...s.effects.filter((e) => e.kind === 'entry').slice(-2),
      ...s.effects.filter((e) => e.kind === 'bubble').slice(-2),
    ].slice(0, 2);
    for (const e of splashes) {
      if (e.kind === 'sand') continue;
      const small = e.kind === 'bubble',
        life = small ? 0.45 : 0.6,
        x = Math.round(e.x),
        y = surfaceY(w, e.x, s.ecoTime, s.physics.surface.h),
        radius = Math.round((small ? 2 : 13) + e.age * (small ? 14 : 34));
      ctx.save();
      ctx.globalAlpha = (1 - e.age / life) * (small ? 0.7 : 0.9);
      ctx.fillStyle = dark ? '#A8DAF5' : '#70B7E8';
      // A stepped oval spreads along the surface while droplets follow their arcs.
      ctx.fillRect(x - radius + 2, y - 1, Math.max(1, radius * 2 - 4), 1);
      ctx.fillRect(x - radius + 2, y + 1, Math.max(1, radius * 2 - 4), 1);
      ctx.fillRect(x - radius, y, 2, 1);
      ctx.fillRect(x + radius - 1, y, 2, 1);
      if (e.age < 0.14) {
        const height = Math.round(
          Math.sin((e.age / 0.14) * Math.PI) * (small ? 3 : 7)
        );
        ctx.fillRect(x - 1, y - height, 2, height);
        for (const side of [-1, 1]) {
          ctx.fillRect(
            x + side * (small ? 3 : 13),
            y - Math.ceil(height / 2),
            2,
            Math.ceil(height / 2)
          );
        }
      }
      for (const p of splashParticles(e.kind, e.age, e.strength)) {
        const px = Math.round(e.x + p.x),
          py = Math.round(e.y + p.y);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = dark ? '#98D2F3' : '#559FD2';
        ctx.fillRect(px, py, p.size, p.size + (e.age < 0.15 ? 1 : 0));
        if (p.size > 1 || e.age < 0.15) {
          ctx.fillStyle = dark ? '#E3F7FF' : '#FFFFFF';
          ctx.fillRect(px, py, 1, 1);
        }
      }
      ctx.restore();
    }
    ctx.restore();
    glassFrame(ctx, w, dark);
  };
}
