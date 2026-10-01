const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('every authored cave-layered decor exposes the JSON swimmable toggle', () => {
  const payload = JSON.parse(read('assets/decor/decor_types.json'));
  const decor = Array.isArray(payload) ? payload : payload.decor;
  assert.ok(Array.isArray(decor) && decor.length > 0);
  const caves = decor.filter((entry) => entry && entry.behavior === 'cave_layered');
  assert.ok(caves.length > 0);
  for (const cave of caves) {
    assert.equal(typeof cave.swimmable, 'boolean', `${cave.file} must author swimmable as a boolean`);
  }
});


test('only the five authored seat-only caves are swimmable false', () => {
  const payload = JSON.parse(read('assets/decor/decor_types.json'));
  const decor = Array.isArray(payload) ? payload : payload.decor;
  const falseCaves = decor
    .filter((entry) => entry && entry.behavior === 'cave_layered' && entry.swimmable === false)
    .map((entry) => entry.file)
    .sort();
  assert.deepEqual(falseCaves, [
    'ceramic-tube-cluster__cave__theme-artificial__front.png',
    'clay-multi__cave__theme-artificial__front.png',
    'extra-narrow-pleco-tubes__cave__theme-artificial__front.png',
    'seashell-cluster__cave-coral__theme-reef__front.png',
    'slate-stack__cave-rock__theme-natural__front.png'
  ]);
});

test('decor metadata keeps swimmable separate from cave geometry settings', () => {
  const source = read('public/app-src/assets/custom-content.js');
  assert.match(source, /swimmable:\s*typeof entry\.swimmable === "boolean"[\s\S]*?entry\.swimmable[\s\S]*?caveBehavior\?\.swimmable/);
  assert.match(source, /caveBehavior:\s*meta\.caveBehavior \|\| null,[\s\S]*?swimmable:\s*meta\.swimmable !== false,[\s\S]*?caveSettings:/);
});

test('cave profiles and docking plans propagate authored swimmability', () => {
  const nav = read('public/app-src/fish/cave-navigation.js');
  assert.match(nav, /function getDecorCaveSwimmable\([\s\S]*?return DEFAULT_CAVE_BEHAVIOR_PROFILE\.swimmable !== false;/);
  assert.match(nav, /function getCaveBehaviorProfileForItem\([\s\S]*?swimmable:\s*authoredProfile\?\.swimmable !== false/);
  const propagated = nav.match(/swimmable:\s*profile\??\.swimmable !== false/g) || [];
  assert.ok(propagated.length >= 2, 'both trigger-seat and profile docking plans must carry swimmability');
});

test('seat-only caves cannot start normal or debug interior roaming', () => {
  const caves = read('public/app-src/fish/caves-and-collision.js');
  assert.match(caves, /if \(plan\.swimmable === false\) \{[\s\S]*?beginFishDebugCaveExit/);
  assert.match(caves, /const swimmable = plan\.swimmable !== false;/);
  assert.match(caves, /const beginRoam = \(\) => \{\s*if \(!swimmable \|\| configuredPoints\)/);
  assert.match(caves, /if \(!swimmable\) \{[\s\S]*?plan\.normalInsideMode = "seat-hold"[\s\S]*?beginFishNormalCaveExit/);
  assert.match(caves, /debugTestLoop && swimmable \? CAVE_DEBUG_TEST_ROAM_MS/);
});

test('missing swimmable remains backward-compatible and defaults to true', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  assert.match(bootstrap, /const DEFAULT_CAVE_BEHAVIOR_PROFILE = \{\s*swimmable: true,/);
  const docs = read('docs/cave-swimmability.md');
  assert.match(docs, /If the field is missing, the runtime resolves it as `true`/);
});
