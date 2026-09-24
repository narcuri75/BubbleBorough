const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const fishData = JSON.parse(read('assets/fish/fish-types.json')).fish;
const byId = new Map(fishData.map((fish) => [fish.id, fish]));

function assertNoArtPointers(species) {
  for (const key of ['asset', 'storeAsset', 'antennaAsset', 'legAsset', 'deadAsset']) {
    assert.equal(Object.prototype.hasOwnProperty.call(species, key), false, `${species.id} should not define ${key} while art is pending`);
  }
}

test('cleanup crew species data is present and water-compatible', () => {
  const freshwaterShrimp = byId.get('freshwater-shrimp');
  const marineShrimp = byId.get('marine-shrimp');
  const nerite = byId.get('nerite-snail');
  const turbo = byId.get('turbo-snail');

  assert.ok(freshwaterShrimp);
  assert.equal(freshwaterShrimp.cleanupAnimal, true);
  assert.equal(freshwaterShrimp.waterType, 'freshwater');

  assert.ok(marineShrimp);
  assert.equal(marineShrimp.cleanupAnimal, true);
  assert.equal(marineShrimp.waterType, 'saltwater');
  assert.equal(marineShrimp.asset, '/assets/fish/shrimp_body.png');
  assert.equal(marineShrimp.storeAsset, '/assets/fish/shrimp_preview.png');

  assert.ok(nerite);
  assert.equal(nerite.cleanupAnimal, true);
  assert.equal(nerite.waterType, 'freshwater');
  assert.notEqual(nerite.artPending, true);
  assert.notEqual(nerite.storeHiddenUntilArt, true);
  assert.equal(nerite.assetVariants?.length, 5);

  assert.ok(turbo);
  assert.equal(turbo.cleanupAnimal, true);
  assert.equal(turbo.waterType, 'saltwater');
  assert.equal(turbo.artPending, true);
  assert.equal(turbo.storeHiddenUntilArt, true);
  assertNoArtPointers(turbo);
});

test('shrimp and snails are separated from ordinary fish but rendered inside Fish > Other', () => {
  const catalog = read('public/app-src/store/catalog.js');
  const ui = read('public/app-src/ui/main-and-store-rendering.js');
  const trayUi = read('public/app-src/ui/customization-actions-and-inventory.js');
  assert.match(catalog, /function isOtherAquariumCreature\(species\)/);
  assert.match(catalog, /function getOtherAquariumCreatureShopCatalog\(\)/);
  assert.match(catalog, /!isOtherAquariumCreature\(species\)/);
  assert.match(catalog, /isOtherAquariumCreature\(species\)/);
  assert.match(catalog, /species\.artPending !== true/);
  assert.match(catalog, /species\.storeHiddenUntilArt !== true/);
  assert.match(ui, /renderStoreSubcategorySection\("fish-other", "Other", "Shrimp, snails, and other aquarium creatures\."/);
  assert.match(ui, /const renderFishStoreThumbnail = \(/);
  assert.match(ui, /layered-shrimp-thumb-legs[\s\S]*layered-shrimp-thumb-body[\s\S]*layered-shrimp-thumb-antennae/);
  assert.match(trayUi, /const renderFishTrayThumbnail = \(/);
  assert.match(trayUi, /layered-shrimp-tray-legs[\s\S]*layered-shrimp-tray-body[\s\S]*layered-shrimp-tray-antennae/);
});

test('cleanup creatures do not create a separate store tab', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const ui = read('public/app-src/ui/main-and-store-rendering.js');
  const websurf = read('public/websurf-store.js');
  assert.doesNotMatch(ui, /function ensureCleanupCrewStoreDom\(\)/);
  assert.doesNotMatch(bootstrap, /ensureCleanupCrewStoreDom\(\);/);
  assert.doesNotMatch(websurf, /const CATEGORY_IDS = \[[^\]]*"cleanup"/);
  assert.doesNotMatch(websurf, /storeCleanupTab/);
  assert.match(ui, /renderStoreSubcategorySection\("fish-other", "Other"/);
});

test('passive cleanup has a dirtiness floor so animals cannot replace manual cleaning', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const simulation = read('public/app-src/tank/simulation.js');
  assert.match(bootstrap, /const CLEANUP_CREW_DIRTINESS_FLOOR = 0\.12;/);
  assert.match(simulation, /function getCleanupCrewDirtinessFloor\(species\)/);
  assert.match(simulation, /function applyCleanupCrewGrimeReduction\(species, now\)/);
  assert.match(simulation, /cleanupFloor/);
  assert.match(simulation, /processDetritusFish\(now\)/);
});

test('snail behavior exists and Turbo art can be enabled from its runtime sprite sheet', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const lifecycle = read('public/app-src/fish/lifecycle-and-breeding.js');
  const content = read('public/app-src/assets/custom-content.js');
  const sprites = read('public/app-src/assets/sprite-sheets.js');
  const initSource = read('public/app-src/ui/tool-modes-and-debug-panels.js');
  assert.match(bootstrap, /"nerite-snail"/);
  assert.match(bootstrap, /"turbo-snail"/);
  assert.match(lifecycle, /behavior === "snail"/);
  assert.match(content, /entry\.artPending === true \|\| entry\.storeHiddenUntilArt === true/);
  assert.match(content, /const resolvedAsset = artPending \? null :/);
  assert.match(sprites, /function loadOptionalFishSpriteSheetDefinition\(/);
  assert.match(sprites, /Build-time sprite definitions are authoritative[\s\S]*const staticSheet[\s\S]*if \(staticSheet\)[\s\S]*return Object\.keys\(staticSheet\.frames\)/);
  assert.match(initSource, /loadOptionalFishSpriteSheetDefinition\("turbo_snail", "turbo_snail", 5\)/);
});

test('bundled app contains Phase 11 cleanup crew runtime', () => {
  const bundle = read('public/app.js');
  assert.ok(!bundle.includes('function ensureCleanupCrewStoreDom()'), 'bundle must not recreate a Cleanup Crew tab');
  for (const needle of [
    'function getOtherAquariumCreatureShopCatalog()',
    'function applyCleanupCrewGrimeReduction(species, now)',
    'function loadOptionalFishSpriteSheetDefinition(',
    'renderStoreSubcategorySection("fish-other", "Other"',
    '"id": "marine-shrimp"',
    '"id": "nerite-snail"',
    '"id": "turbo-snail"',
  ]) {
    assert.ok(bundle.includes(needle), `bundle is missing ${needle}`);
  }
});
