// Stepped corners keep the glass silhouette on the same pixel grid as the art.
export function tankPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  inset = 2
) {
  const x = inset,
    y = inset,
    w = width - inset * 2,
    h = 288 - inset * 2;
  const corner = [
    [14, 0],
    [8, 0],
    [8, 2],
    [4, 2],
    [4, 5],
    [2, 5],
    [2, 9],
    [0, 9],
    [0, 14],
  ];
  const points = [
    ...corner.map(([a, b]) => [x + a, y + b]).reverse(),
    ...corner.map(([a, b]) => [x + w - a, y + b]),
    ...corner.map(([a, b]) => [x + w - a, y + h - b]).reverse(),
    ...corner.map(([a, b]) => [x + a, y + h - b]),
  ];
  ctx.beginPath();
  points.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
  ctx.closePath();
}
export function glassFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  dark: boolean
) {
  tankPath(ctx, width);
  ctx.strokeStyle = dark ? '#7599BC' : '#6084AC';
  ctx.lineWidth = 2;
  ctx.stroke();
  tankPath(ctx, width, 5);
  ctx.strokeStyle = dark ? '#365774' : '#D1E8F4';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  tankPath(ctx, width, 4);
  ctx.clip();
  ctx.fillStyle = dark ? '#B6DDF0' : '#FFFFFF';
  ctx.globalAlpha = dark ? 0.35 : 0.8;
  ctx.fillRect(18, 6, width - 40, 1);
  ctx.fillRect(9, 20, 2, 58);
  ctx.fillRect(9, 84, 2, 14);
  ctx.fillRect(14, 10, 38, 2);
  ctx.globalAlpha = 0.18;
  ctx.fillRect(7, 30, 5, 220);
  ctx.fillRect(width - 13, 38, 4, 224);
  ctx.fillStyle = '#B6A4DE';
  ctx.fillRect(18, 280, width - 36, 3);
  ctx.restore();
}
