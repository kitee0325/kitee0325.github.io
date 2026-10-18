import atlasData from '../../../../static/img/hero/atlas-fine.json';
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  duration: number;
  drawW: number;
  drawH: number;
}
export const atlas: Record<string, Frame[]> = atlasData;
export function sprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  name: string,
  x: number,
  y: number,
  frame = 0
) {
  const frames = atlas[name],
    r = frames[frame % frames.length];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (name.startsWith('plant'))
    ctx.transform(1, 0, Math.sin(frame * 2.1) * 0.018, 1, 0, 0);
  // Bend only the tail; preserve the detailed face and body without swapping art.
  if (name.startsWith('fish') && frame % 4 !== 0) {
    for (let part = 0; part < 4; part++) {
      const u = part / 16;
      ctx.drawImage(
        image,
        r.x + r.w * u,
        r.y,
        r.w / 16,
        r.h,
        -r.anchorX + r.drawW * u,
        -r.anchorY + Math.sin((frame * Math.PI) / 2) * 0.45 * (1 - part / 4),
        r.drawW / 16,
        r.drawH
      );
    }
    ctx.drawImage(
      image,
      r.x + r.w / 4,
      r.y,
      r.w * 0.75,
      r.h,
      -r.anchorX + r.drawW / 4,
      -r.anchorY,
      r.drawW * 0.75,
      r.drawH
    );
  } else
    ctx.drawImage(
      image,
      r.x,
      r.y,
      r.w,
      r.h,
      -r.anchorX,
      -r.anchorY,
      r.drawW,
      r.drawH
    );
  ctx.restore();
}
export function createScenery(
  light: HTMLImageElement,
  darkImage: HTMLImageElement
) {
  const caches = new Map<string, HTMLCanvasElement>();
  return (
    ctx: CanvasRenderingContext2D,
    width: number,
    dark: boolean,
    time: number,
    chart: boolean
  ) => {
    const key = `${width}-${dark}`,
      image = dark ? darkImage : light;
    let cached = caches.get(key);
    if (!cached) {
      cached = document.createElement('canvas');
      cached.width = width * 3;
      cached.height = 288 * 3;
      const c = cached.getContext('2d')!;
      c.scale(3, 3);
      c.imageSmoothingEnabled = false;
      c.fillStyle = dark ? '#3D4C65' : '#E2E3EC';
      c.fillRect(4, 260, width - 8, 24);
      c.save();
      c.beginPath();
      c.rect(4, 260, width - 8, 24);
      c.clip();
      c.globalAlpha = dark ? 0.15 : 0.35;
      for (let y = 260; y < 284; y += 16)
        for (let x = 4; x < width - 4; x += 16) sprite(c, light, 'sand', x, y);
      c.restore();
      for (const [x, i] of [
        [22, 0],
        [width * 0.36, 0],
        [width * 0.67, 2],
        [width - 27, 1],
        [width - 49, 2],
      ])
        sprite(c, image, `rock-${i}`, x, 263);
      caches.set(key, cached);
    }
    ctx.save();
    ctx.globalAlpha = chart ? 0.28 : 0.8;
    const plants =
      width === 512
        ? [
            [18, 0],
            [43, 1],
            [width * 0.33, 2],
            [width * 0.62, 1],
            [width - 22, 2],
            [width - 45, 0],
          ]
        : [
            [18, 1],
            [width * 0.35, 0],
            [width * 0.65, 2],
            [width - 20, 2],
          ];
    plants.forEach(([x, i], n) =>
      sprite(ctx, image, `plant-${i}`, x, 260, Math.floor(time * 4 + n) % 3)
    );
    ctx.restore();
    ctx.drawImage(cached, 0, 0, width, 288);
    const shellFrame =
      time % 13 < 0.9 ? Math.min(2, Math.floor((time % 13) / 0.3)) : 0;
    ctx.save();
    ctx.globalAlpha = chart ? 0.45 : 1;
    sprite(ctx, image, 'shell-0', 57, 270, shellFrame);
    sprite(ctx, image, 'shell-1', width * 0.25, 275);
    sprite(ctx, image, 'shell-0', width * 0.52, 271, shellFrame);
    sprite(ctx, image, 'shell-1', width - 63, 273);
    ctx.restore();
  };
}
