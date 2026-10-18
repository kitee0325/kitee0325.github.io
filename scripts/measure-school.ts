import assert from 'node:assert/strict';
import { initialFish, config } from '../src/features/Profile/aquarium/data';
import { stepSchool } from '../src/features/Profile/aquarium/school';
const results = [];
for (const width of [384, 512]) {
  const fish = initialFish(width);
  const samples = [];
  for (let frame = 0; frame < 7200; frame++) {
    stepSchool(fish, width, config.dt, frame * config.dt);
    if (frame > 600 && frame % 60 === 0) {
      const nearest = fish.map((f, i) =>
        Math.min(
          ...fish
            .filter((_, j) => i !== j)
            .map((g) => Math.hypot(f.x - g.x, f.y - g.y))
        )
      );
      const cells = new Set(
        fish.map(
          (f) =>
            `${Math.floor((f.x / width) * 4)}-${Math.floor(((f.y - 44) / 205) * 3)}`
        )
      );
      samples.push({
        close: nearest.filter((d) => d < 16).length / fish.length,
        spacing: nearest.reduce((a, b) => a + b) / fish.length,
        cells: cells.size,
      });
    }
  }
  results.push({
    width,
    fish: fish.length,
    meanClose: samples.reduce((a, b) => a + b.close, 0) / samples.length,
    meanSpacing: samples.reduce((a, b) => a + b.spacing, 0) / samples.length,
    minCells: Math.min(...samples.map((s) => s.cells)),
    meanCells: samples.reduce((a, b) => a + b.cells, 0) / samples.length,
  });
}
console.log(JSON.stringify(results, null, 2));

for (const r of results) {
  assert.equal(r.fish, 40);
  assert.ok(r.meanClose < 0.08, 'Fish must not remain packed together');
  assert.ok(r.meanSpacing > 24);
  assert.ok(r.meanCells > 9, 'School must use the tank area');
}
