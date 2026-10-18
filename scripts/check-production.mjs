import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

for (const locale of ['', 'zh-Hans']) {
  const dir = path.join('build', locale);
  assert.ok(fs.existsSync(path.join(dir, 'index.html')), `Missing ${locale || 'en'} homepage`);
  for (const preview of ['hero-p0', 'hero-p0.html']) {
    assert.ok(!fs.existsSync(path.join(dir, preview)), `Preview leaked into ${dir}`);
  }
  assert.ok(!fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8').includes('/hero-p0'));
  for (const topic of ['hero', 'learning']) {
    for (const source of ['SOURCES.md', 'asset-board.html', 'motifs-fine.png', 'sprites.png', 'sprites-dark.png', 'atlas.json']) {
      assert.ok(!fs.existsSync(path.join(dir, 'img', topic, source)), `Source asset leaked: ${topic}/${source}`);
    }
  }
}
console.log('PASS: both production locales exist; preview routes and source asset boards are excluded');
