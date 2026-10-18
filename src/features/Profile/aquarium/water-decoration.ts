// Low-amplitude ambient movement shares the scene clock; impact waves stay physical.
export function surfaceWave(index: number, time: number) {
  return (
    Math.sin((Math.PI * index) / 63) *
    (1.4 * Math.sin(index * 0.43 - time * 0.9) +
      0.7 * Math.sin(index * 0.19 + time * 0.6))
  );
}
export function surfaceY(
  width: number,
  x: number,
  time: number,
  heights?: ArrayLike<number>
) {
  const index = Math.max(
    0,
    Math.min(63, Math.round(((x - 4) / (width - 8)) * 63))
  );
  return Math.round(32 + (heights?.[index] ?? 0) + surfaceWave(index, time));
}
export function bubbles(
  width: number,
  time: number,
  heights?: ArrayLike<number>
) {
  return [0.06, 0.08, 0.33, 0.35, 0.37, 0.62, 0.64, 0.67, 0.91, 0.94].map(
    (origin, i) => {
      const rise = 216 / (9 + (i % 3) * 2),
        cycle = rise + 0.9,
        offset = (i / 10) * cycle,
        lap = Math.floor((time + offset) / cycle),
        age = time + offset - lap * cycle,
        x = Math.round(
          12 + origin * (width - 24) + Math.sin(time * 0.7 + i) * 2
        ),
        top = surfaceY(width, x, time, heights),
        size = i % 3 === 0 ? 5 : 3;
      return {
        x,
        y: 248 + (top + size / 2 - 248) * Math.min(1, age / rise),
        size,
        phase: age < rise ? 'rise' : age < rise + 0.45 ? 'pop' : 'rest',
        popAt: lap * cycle + rise - offset,
      };
    }
  );
}
export function splashParticles(
  kind: 'entry' | 'bubble',
  age: number,
  strength = 1
) {
  const life = kind === 'entry' ? 0.6 : 0.45;
  if (age < 0 || age >= life) return [];
  const power =
    kind === 'entry' ? 0.7 + Math.min(1, Math.max(0, strength)) * 0.3 : 0.48;
  return Array.from({ length: kind === 'entry' ? 8 : 5 }, (_, i) => {
    const pair = Math.floor(i / 2),
      direction = i % 2 ? 1 : -1;
    return {
      x:
        direction *
        ((kind === 'entry' ? 9 : 2) + [24, 48, 68, 90][pair] * power * age),
      y: -[84, 104, 92, 70][pair] * power * age + 180 * age ** 2,
      size: kind === 'entry' && i % 3 === 0 ? 2 : 1,
      alpha: Math.max(0, 1 - (age / life) ** 2),
    };
  }).filter((p) => p.y <= 0);
}
