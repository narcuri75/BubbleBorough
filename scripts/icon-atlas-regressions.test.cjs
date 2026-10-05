const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'game');
const ICON_SHEETS = ['icons', 'settings', 'settings_2', 'cursors'];

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(filePath));
    } else if (/\.(?:js|css|html)$/i.test(entry.name)) {
      files.push(filePath);
    }
  }
  return files;
}

function getAtlasFrameNames() {
  const names = new Set();
  for (const sheetName of ICON_SHEETS) {
    const sheet = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'icons', `${sheetName}.json`), 'utf8'));
    for (const layer of sheet.layers || []) {
      for (const sprite of layer.sprites || []) {
        if (sprite?.name) names.add(sprite.name);
      }
    }
  }
  return names;
}

test('icon references resolve through the current atlas manifest', () => {
  const sourceFiles = [
    ...collectSourceFiles(path.join(ROOT, 'public', 'app-src')),
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'mobile.html'),
    path.join(ROOT, 'public', 'styles.css'),
    path.join(ROOT, 'public', 'websurf-store.js'),
    path.join(ROOT, 'public', 'store-variants.js')
  ];
  const frameNames = getAtlasFrameNames();
  const referenced = new Set();
  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(/assets\/icons\/([^"'`?\s)]+\.png)/g)) {
      if (!match[1].includes('${')) referenced.add(match[1]);
    }
  }
  const missing = [...referenced].filter((name) => !frameNames.has(name));
  assert.deepEqual(missing, [], `icon paths without an atlas frame: ${missing.join(', ')}`);
});

test('cart control uses the generated cart frame instead of stale atlas coordinates', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');
  assert.match(styles, /generated\/sprites\/icons\/icons\/store\.png\.thumb\.webp/);
  assert.doesNotMatch(styles, /assets\/icons\/Icons\.webp/);
});
