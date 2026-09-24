const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const bootstrap = read('public/app-src/00-bootstrap.js');
const catalog = read('public/app-src/store/catalog.js');
const rendering = read('public/app-src/ui/main-and-store-rendering.js');
const custom = read('public/app-src/assets/custom-content.js');
const health = read('public/app-src/fish/health.js');
const behavior = read('public/app-src/fish/needs-disease-and-behavior.js');
const collision = read('public/app-src/fish/caves-and-collision.js');
const corpse = read('public/app-src/fish/corpse-motion.js');
const bundle = read('public/app.js');

test('Food shop In Tank filter defaults on and can be toggled off', () => {
  assert.match(bootstrap, /storeFoodInTank: true/);
  assert.match(catalog, /function isFoodInTankFilterEnabled/);
  assert.match(catalog, /function setFoodInTankFilter/);
  assert.match(rendering, /data-food-in-tank-filter/);
  assert.match(custom, /setFoodInTankFilter\(inTankFilter\.checked\)/);
});

test('Food shop filter uses the active tank actual diet compatibility', () => {
  assert.match(catalog, /function getActiveTankFeedingCreatures/);
  assert.match(catalog, /filter\(\(fish\) => fish && !isFishDead\(fish\)\)/);
  assert.match(catalog, /creatures\.some\(\(fish\) => canFoodSatisfyFishMeal\(fish, foodKey\)\)/);
  assert.match(rendering, /allCatalog\.filter\(\(food\) => isFoodRelevantToActiveTank\(food, activeTank\)\)/);
});

test('Empty tanks show the full food catalog and populated no-match tanks explain the filter', () => {
  assert.match(catalog, /if \(!creatures\.length\) return true/);
  assert.match(catalog, /Empty tank: showing all food\./);
  assert.match(rendering, /No stocked food matches the living creatures in this tank/);
  assert.match(rendering, /Turn off <strong>In Tank<\/strong> to browse all food/);
});

test('Custom content meter warns near the quota and at the quota', () => {
  assert.match(custom, /usage\.ratio >= 0\.9/);
  assert.match(custom, /Storage nearly full/);
  assert.match(custom, /Storage full/);
  assert.match(custom, /data-storage-state=/);
});

test('Death records use the fish actual tank and active-tank deaths toast immediately', () => {
  assert.match(health, /const deathTank = typeof getTankContainingFish/);
  assert.match(health, /recordFishMemorial\(fish, deathTank/);
  assert.match(health, /pushEvent\(reasonText, now, deathTank/);
  assert.match(health, /showToast\(reasonText\)/);
});

test('Eating refusal remains deterministic and state driven', () => {
  assert.match(behavior, /function getFishFoodRefusalReason/);
  assert.match(behavior, /return "panic"/);
  assert.match(behavior, /getFishDiseaseFoodRefusalReason/);
  assert.match(behavior, /getFishImmediateFoodThreat/);
  assert.match(behavior, /there is no probability roll/i);
});

test('Fish depth travel remains stepwise with adjacent sublayers and blocked-edge retries', () => {
  assert.match(collision, /getAdjacentTankDepthPosition/);
  assert.match(collision, /Commit exactly one adjacent position/);
  assert.match(collision, /tryFishSubLayerPass/);
  assert.match(collision, /recordFishNavigationFailure/);
  assert.match(collision, /queueFishCollisionAvoidance/);
});

test('Dead fish retain dedicated passive corpse motion', () => {
  assert.match(corpse, /function getDeadFishCorpseRenderState/);
  assert.match(corpse, /surface/i);
  assert.match(behavior, /corpse presentation/i);
});

test('Generated bundle contains all Phase 15 final-polish paths', () => {
  for (const token of [
    'storeFoodInTank: true',
    'isFoodRelevantToActiveTank',
    'data-food-in-tank-filter',
    'Storage nearly full',
    'const deathTank = typeof getTankContainingFish'
  ]) assert.ok(bundle.includes(token), `bundle missing ${token}`);
});
