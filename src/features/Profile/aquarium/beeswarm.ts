import { data, FishDatum, Point } from './data';
export const chartTop = 50,
  chartBottom = 240;
export const columnX = (width: number, series: number) => {
  const inset = width === 512 ? 96 : 64;
  return inset + ((width - 2 * inset) * series) / 3;
};
export function beeswarm(
  width: number,
  input: FishDatum[] = data
): Map<string, Point> {
  const result = new Map<string, Point>();
  for (let series = 0; series < 4; series++) {
    const placed: (Point & { id: string })[] = [];
    for (const fish of input
      .filter((f) => f.series === series)
      .sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))) {
      const y = chartBottom - ((chartBottom - chartTop) * fish.value) / 100,
        candidates = [0];
      for (const p of placed)
        if (Math.abs(y - p.y) < 32) {
          const dx = Math.sqrt(32 ** 2 - (y - p.y) ** 2);
          candidates.push(p.x - dx, p.x + dx);
        }
      const x = candidates
        .sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)
        .find((x) =>
          placed.every((p) => Math.hypot(x - p.x, y - p.y) >= 32 - 1e-7)
        );
      if (x === undefined) throw Error('Beeswarm cannot fit');
      placed.push({ id: fish.id, x, y });
    }
    const center =
      (Math.min(...placed.map((p) => p.x)) +
        Math.max(...placed.map((p) => p.x))) /
      2;
    for (const p of placed) {
      if (Math.abs(p.x - center) > 34)
        throw Error('Beeswarm exceeds its series band');
      result.set(p.id, { x: columnX(width, series) + p.x - center, y: p.y });
    }
  }
  return result;
}
