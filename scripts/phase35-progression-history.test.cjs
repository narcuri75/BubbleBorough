const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'public/app-src/tank/events-recaps-and-save.js');
const PERSISTENCE_PATH = path.join(ROOT, 'public/app-src/core/settings-and-persistence.js');
const BOOTSTRAP_PATH = path.join(ROOT, 'public/app-src/00-bootstrap.js');
const events = fs.readFileSync(EVENTS_PATH, 'utf8');
const persistence = fs.readFileSync(PERSISTENCE_PATH, 'utf8');
const bootstrap = fs.readFileSync(BOOTSTRAP_PATH, 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

test('Phase 35 records one structured fish level-up event for every crossed care level', () => {
  const state = { progressionHistory: [] };
  const context = {
    state,
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    PROGRESSION_HISTORY_LIMIT: 240,
    clamp,
    getLocalDayKey: () => '09/25/2026',
    Date,
    Math
  };
  context.getFishCrossedCareLevels = vm.runInNewContext(`(${extractFunction(events, 'getFishCrossedCareLevels')})`, context);
  context.recordProgressionEvent = vm.runInNewContext(`(${extractFunction(events, 'recordProgressionEvent')})`, context);
  const record = vm.runInNewContext(`(${extractFunction(events, 'recordFishLevelUpProgressionEvents')})`, context);
  const result = record(
    { id: 'fish-1', name: 'Bubbles', speciesId: 'goldfish' },
    { id: 'goldfish', name: 'Goldfish' },
    2,
    4,
    123456,
    '09/24/2026'
  );

  assert.equal(result.length, 2);
  assert.deepEqual(Array.from(result, (entry) => entry.careLevel), [3, 4]);
  assert.deepEqual(Array.from(result, (entry) => entry.previousCareLevel), [2, 3]);
  assert.ok(result.every((entry) => entry.type === 'fish_level_up'));
  assert.ok(result.every((entry) => entry.dayKey === '09/24/2026'));
  assert.equal(state.progressionHistory.length, 2);
});

test('Phase 35 records permanent species mastery increases as structured events', () => {
  const state = { progressionHistory: [] };
  const context = {
    state,
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    PROGRESSION_HISTORY_LIMIT: 240,
    clamp,
    getLocalDayKey: () => '09/25/2026',
    Date,
    Math
  };
  context.recordProgressionEvent = vm.runInNewContext(`(${extractFunction(events, 'recordProgressionEvent')})`, context);
  const record = vm.runInNewContext(`(${extractFunction(events, 'recordFishSpeciesMasteryProgressionEvents')})`, context);
  const result = record(
    { id: 'fish-2', name: 'Finn', speciesId: 'guppy', careLevel: 5 },
    { id: 'guppy', name: 'Guppy' },
    { previousHighestLevel: 3, record: { highestLevel: 5, masteredAt: 123456 } },
    123456,
    '09/24/2026'
  );

  assert.equal(result.length, 2);
  assert.deepEqual(Array.from(result, (entry) => entry.masteryLevel), [4, 5]);
  assert.equal(result[1].masteredNow, true);
  assert.equal(result[1].masteredAt, 123456);
  assert.ok(result.every((entry) => entry.type === 'species_mastery_increased'));
});

test('Phase 35 Weekly Reports prefer structured counts independently per event type', () => {
  const state = {
    progressionHistory: [
      { type: 'fish_level_up', dayKey: '09/20/2026', levelsGained: 1 },
      { type: 'fish_level_up', dayKey: '09/20/2026', levelsGained: 1 },
      { type: 'variant_unlocked', dayKey: '09/20/2026' }
    ]
  };
  const context = { state, getLocalDayKey: () => '09/20/2026', Math, Number, String, Array, Set };
  const fn = vm.runInNewContext(`(${extractFunction(events, 'getWeeklyReportProgressionCounts')})`, context);
  const counts = fn(['09/20/2026'], [{
    dayKey: '09/20/2026',
    careXpAwards: [{ levelsGained: 7 }],
    variantUnlocks: [{}, {}, {}]
  }]);
  assert.deepEqual({ fishLevelUps: counts.fishLevelUps, variantsUnlocked: counts.variantsUnlocked }, { fishLevelUps: 2, variantsUnlocked: 1 });
});

test('Phase 35 legacy Weekly Report windows fall back separately when one structured event type is missing', () => {
  const state = { progressionHistory: [{ type: 'variant_unlocked', dayKey: '09/20/2026' }] };
  const context = { state, getLocalDayKey: () => '09/20/2026', Math, Number, String, Array, Set };
  const fn = vm.runInNewContext(`(${extractFunction(events, 'getWeeklyReportProgressionCounts')})`, context);
  const counts = fn(['09/20/2026'], [{
    dayKey: '09/20/2026',
    careXpAwards: [{ levelsGained: 2 }],
    variantUnlocks: [{}, {}, {}]
  }]);
  assert.deepEqual({ fishLevelUps: counts.fishLevelUps, variantsUnlocked: counts.variantsUnlocked }, { fishLevelUps: 2, variantsUnlocked: 1 });
});

test('Phase 35 progression history sanitization preserves structured level/mastery fields and remains capped', () => {
  assert.match(bootstrap, /const PROGRESSION_HISTORY_LIMIT = 240;/);
  assert.match(persistence, /previousCareLevel:/);
  assert.match(persistence, /levelsGained:/);
  assert.match(persistence, /previousMasteryLevel:/);
  assert.match(persistence, /masteryLevel:/);
  assert.match(persistence, /masteredNow:/);
  assert.match(persistence, /\.slice\(0, PROGRESSION_HISTORY_LIMIT\)/);
});

test('Phase 35 recap processing records structured level and mastery events and uses the recap day for variant events', () => {
  assert.match(events, /processFishCareLevelIncreaseProgression\(fish, species, levelResult, now, tank, dayKey\)/);
  assert.match(events, /recordFishLevelUpProgressionEvents\(fish, species, oldLevel, newLevel, now, dayKey\)/);
  assert.match(events, /recordFishSpeciesMasteryProgressionEvents\(fish, species, masteryResult, now, dayKey\)/);
  assert.match(events, /unlockFishAppearanceVariantsForLevelIncrease\(fish, species, oldLevel, newLevel, now, tank, \{ dayKey, notify: false \}\)/);
  assert.match(events, /dayKey: String\(options\?\.dayKey/);
});
