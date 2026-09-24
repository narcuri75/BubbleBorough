const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('Phase 13 advances save schema and persists feeder automation telemetry', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const catalog = read('public/app-src/tank/catalog-and-equipment.js');
  assert.match(bootstrap, /const STATE_VERSION = (?:60|61);/);
  assert.match(catalog, /smartDispensedAtByFishId: sanitizeFishNeedEventMap/);
  assert.match(catalog, /lastEmptyAlertSlotKey:/);
  assert.match(catalog, /lastFoodMismatchAlertSlotKey:/);
});

test('meal eligibility uses simulation time rather than wall clock', () => {
  const appearance = read('public/app-src/fish/appearance.js');
  assert.match(appearance, /function getMealEligibleFishForSlot\(slot, tank = getCurrentTank\(\), now = Date\.now\(\)\)/);
  assert.match(appearance, /getCurrentMealSlot\(now\)\.key/);
  assert.doesNotMatch(appearance, /getCurrentMealSlot\(Date\.now\(\)\)\.key/);
  assert.match(appearance, /fish\.lastMealSlotKey === slot\.key/);
});

test('smart feeder selects the active 08:00 or 20:00 meal slot and pauses with simulation', () => {
  const feeding = read('public/app-src/fish/feeding-and-medicine.js');
  const catalog = read('public/app-src/tank/catalog-and-equipment.js');
  assert.match(feeding, /if \(!targetTank \|\| isTankCareAutomationPaused\(\)\) return false;/);
  assert.match(feeding, /const slot = getCurrentMealSlot\(now\);/);
  assert.doesNotMatch(feeding, /getTodaysMealSlots\(now\)\.find/);
  assert.match(catalog, /runtime\?\.debugSimulationPaused === true/);
  assert.match(catalog, /isWallpaperEnginePauseActive/);
  assert.match(catalog, /isPeacefulModeEnabled/);
});

test('scheduled feeder uses per-fish duplicate prevention and diet matching', () => {
  const feeding = read('public/app-src/fish/feeding-and-medicine.js');
  assert.match(feeding, /smartDispensedAtByFishId\?\.\[fish\.id\]/);
  assert.match(feeding, /smartDispensedAtByFishId\[fish\.id\] = now/);
  assert.match(feeding, /canFoodSatisfyFishMeal\(fish, storedPellet\?\.foodKey\)/);
  assert.match(feeding, /canFishEatFoodPellet\(fish, storedPellet\?\.foodKey, now\)/);
  assert.match(feeding, /storedPellet\?\.foodKey !== "halloweenCandy"/);
  assert.match(feeding, /floatingPellet\.targetFishId = fish\.id/);
});

test('empty and incompatible feeder states warn once per meal slot and can retry after refill', () => {
  const feeding = read('public/app-src/fish/feeding-and-medicine.js');
  assert.match(feeding, /lastEmptyAlertSlotKey !== slot\.key/);
  assert.match(feeding, /lastFoodMismatchAlertSlotKey !== slot\.key/);
  assert.match(feeding, /Auto feeder empty\. Refill it to resume scheduled feeding\./);
  assert.match(feeding, /Auto feeder needs a compatible food for the remaining fish\./);
  assert.doesNotMatch(feeding, /feederEntries\.every\(\(\{ dispenser \}\) => dispenser\.lastDispensedSlotKey === slot\.key\)/);
});

test('autonomous submarine and boat movement pauses without disabling manual driving', () => {
  const machinery = read('public/app-src/machinery/submarine.js');
  assert.match(machinery, /const automationPaused = typeof isTankCareAutomationPaused/);
  assert.match(machinery, /else if \(!automationPaused\)/);
  assert.match(machinery, /if \(automationPaused\) \{/);
  assert.match(machinery, /isSubmarineManualDriveActive/);
  assert.match(machinery, /isBoatManualDriveActive/);
});

test('equipment tray exposes schedule, pause, and refill status', () => {
  const machinery = read('public/app-src/machinery/submarine.js');
  assert.match(machinery, /automation paused/);
  assert.match(machinery, /REFILL NEEDED/);
  assert.match(machinery, /auto 08:00 \/ 20:00/);
});

test('bundled app contains Phase 13 automation runtime', () => {
  const bundle = read('public/app.js');
  for (const needle of [
    'const STATE_VERSION = 61;',
    'function isTankCareAutomationPaused()',
    'function processSmartAutoFeeder(now = Date.now(), options = {})',
    'lastEmptyAlertSlotKey',
    'lastFoodMismatchAlertSlotKey',
    'diet-matched pellet',
  ]) {
    assert.ok(bundle.includes(needle), `bundle is missing ${needle}`);
  }
});
