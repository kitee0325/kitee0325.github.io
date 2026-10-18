export type ViewMode = 'school' | 'beeswarm';
export type Depth = 'surface' | 'middle' | 'deep';
export interface FishDatum {
  id: string;
  series: number;
  value: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Fish extends FishDatum, Point {
  vx: number;
  vy: number;
  facing: number;
  size: number;
}
export const values = [
  [10, 14, 35, 59, 63, 90, 25, 46, 76, 98],
  [18, 22, 43, 65, 69, 84, 7, 34, 54, 97],
  [8, 31, 35, 56, 78, 82, 18, 46, 66, 95],
  [15, 39, 43, 61, 85, 89, 5, 27, 72, 98],
];
export const data: FishDatum[] = values.flatMap((row, series) =>
  row.map((value, i) => ({ id: `s${series}-f${i}`, series, value }))
);
export const toys = [
  { id: 'wave', label: '挥手', depth: 'deep', x: [40, 28], y: 244 },
  {
    id: 'intp',
    label: 'INTP',
    depth: 'deep',
    x: [104, 75],
    y: 244,
  },
  {
    id: 'gpt',
    label: 'GPT',
    depth: 'middle',
    x: [180, 128],
    y: 150,
  },
  {
    id: 'claude',
    label: 'Claude',
    depth: 'middle',
    x: [332, 256],
    y: 150,
  },
  {
    id: 'react',
    label: 'React',
    depth: 'surface',
    x: [76, 60],
    y: 36,
  },
  {
    id: 'vue',
    label: 'Vue',
    depth: 'surface',
    x: [196, 148],
    y: 36,
  },
  {
    id: 'node',
    label: 'Node.js',
    depth: 'surface',
    x: [316, 236],
    y: 36,
  },
  { id: 'ts', label: 'TS', depth: 'surface', x: [436, 324], y: 36 },
  {
    id: 'math',
    label: '数学',
    depth: 'deep',
    x: [168, 122],
    y: 244,
  },
  {
    id: 'controller',
    label: '手柄',
    depth: 'deep',
    x: [232, 169],
    y: 244,
  },
  {
    id: 'geometry',
    label: '可视化',
    depth: 'deep',
    x: [296, 216],
    y: 244,
  },
  {
    id: 'godot',
    label: 'Godot',
    depth: 'deep',
    x: [360, 263],
    y: 244,
  },
  { id: 'chart', label: '数据图表', depth: 'deep', x: [424, 310], y: 244 },
  { id: 'palette', label: '调色盘', depth: 'deep', x: [488, 357], y: 244 },
] as const;
export type ToyId = (typeof toys)[number]['id'];
export const config = {
  dt: 1 / 60,
  gravity: 0.001,
  buoyancy: { surface: 1.5, middle: 1, deep: 0.65 },
  drag: 0.08,
  restitution: 0.12,
  referenceSpeed: 80,
  thresholds: [0.12, 0.3, 0.6],
  waterColors: ['#EAF6FD', '#CEE8F5', '#A2CEEA', '#779FD1'],
};
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function validateData(input: FishDatum[]) {
  const ids = new Set<string>();
  for (const f of input) {
    if (
      ids.has(f.id) ||
      !Number.isInteger(f.series) ||
      f.series < 0 ||
      f.series > 3 ||
      !Number.isFinite(f.value) ||
      f.value < 0 ||
      f.value > 100
    )
      throw Error('Invalid aquarium datum');
    ids.add(f.id);
  }
  if (
    input.length !== 40 ||
    [0, 1, 2, 3].some((s) => input.filter((f) => f.series === s).length !== 10)
  )
    throw Error('Expected four series of ten fish');
}
export function seededRandom(seed = 329) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function initialFish(width: number): Fish[] {
  validateData(data);
  const random = seededRandom();
  return data.map((f, i) => ({
    ...f,
    x: 24 + ((((i * 7) % 10) + 0.2 + random() * 0.6) * (width - 48)) / 10,
    y:
      52 +
      ((Math.floor(((i * 17) % 40) / 10) + 0.2 + random() * 0.6) * 184) / 4,
    vx: (random() - 0.5) * 28,
    vy: (random() - 0.5) * 18,
    facing: 1,
    size: [0.9, 1.02, 1.12, 0.96, 1.08, 1][i % 6],
  }));
}
export function speedBand(speed: number) {
  return config.thresholds.filter((t) => speed / config.referenceSpeed >= t)
    .length;
}
