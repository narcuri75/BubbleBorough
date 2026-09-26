const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'public/app-src/tank/events-recaps-and-save.js');
const events = fs.readFileSync(EVENTS_PATH, 'utf8');

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

function makeSurfaceHarness() {
  const surfaced = [];
  const pushed = [];
  const context = {
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    Date,
    Math,
    Number,
    String,
    Array,
    getCurrentTank: () => ({ id: 'tank-1' }),
    pushEvent: (...args) => { pushed.push(args); return {}; },
    surfaceStandaloneFishProgressionNotification: (title, detail, options) => {
      surfaced.push({ title, detail, options });
      return true;
    }
  };
  const fn = vm.runInNewContext(`(${extractFunction(events, 'surfaceFishCareLevelProgressionNotification')})`, context);
  return { fn, surfaced, pushed };
}

test('Phase 36 surfaces one clean notification for a normal fish level-up', () => {
  const { fn, surfaced, pushed } = makeSurfaceHarness();
  const result = fn(
    { id: 'fish-1', name: 'Bubbles', speciesId: 'goldfish' },
    { id: 'goldfish', name: 'Goldfish' },
    { oldLevel: 2, newLevel: 3, levelsGained: 1 },
    { highestLevelIncreased: false, record: { highestLevel: 4 } },
    [],
    123456,
    { id: 'tank-1' },
    '2026-09-24'
  );

  assert.equal(result.title, 'Bubbles reached Level 3!');
  assert.equal(surfaced.length, 1);
  assert.equal(pushed.length, 1);
  assert.equal(surfaced[0].title, 'Bubbles reached Level 3!');
  assert.match(surfaced[0].detail, /Goldfish care progression advanced/);
});

test('Phase 36 combines level, variant, and mastery into one progression notification', () => {
  const { fn, surfaced } = makeSurfaceHarness();
  fn(
    { id: 'fish-2', name: 'Finn', speciesId: 'guppy' },
    { id: 'guppy', name: 'Guppy' },
    { oldLevel: 2, newLevel: 3, levelsGained: 1 },
    { highestLevelIncreased: true, record: { highestLevel: 3 } },
    [{ variantLabel: 'Moscow Blue', collectionCompleted: false }],
    123456,
    { id: 'tank-1' },
    '2026-09-24'
  );

  assert.equal(surfaced.length, 1);
  assert.equal(surfaced[0].title, 'Finn reached Level 3!');
  assert.match(surfaced[0].detail, /New Guppy Variant: Moscow Blue/);
  assert.match(surfaced[0].detail, /Guppy Mastery reached Lv\. 3/);
});

test('Phase 36 later generations can unlock variants without falsely announcing mastery', () => {
  const { fn, surfaced } = makeSurfaceHarness();
  fn(
    { id: 'fish-3', name: 'Junior', speciesId: 'betta' },
    { id: 'betta', name: 'Betta' },
    { oldLevel: 1, newLevel: 2, levelsGained: 1 },
    { highestLevelIncreased: false, record: { highestLevel: 5 } },
    [{ variantLabel: 'Copper', collectionCompleted: false }],
    123456,
    { id: 'tank-1' },
    '2026-09-24'
  );

  assert.equal(surfaced.length, 1);
  assert.match(surfaced[0].detail, /New Betta Variant: Copper/);
  assert.doesNotMatch(surfaced[0].detail, /Mastery reached/);
});

test('Phase 36 consolidates unusual multi-level jumps instead of flooding notifications', () => {
  const { fn, surfaced } = makeSurfaceHarness();
  fn(
    { id: 'fish-4', name: 'Skip', speciesId: 'tetra' },
    { id: 'tetra', name: 'Tetra' },
    { oldLevel: 2, newLevel: 4, levelsGained: 2 },
    { highestLevelIncreased: true, record: { highestLevel: 4 } },
    [
      { variantLabel: 'Silver', collectionCompleted: false },
      { variantLabel: 'Gold', collectionCompleted: true }
    ],
    123456,
    { id: 'tank-1' },
    '2026-09-24'
  );

  assert.equal(surfaced.length, 1);
  assert.equal(surfaced[0].title, 'Skip reached Level 4!');
  assert.match(surfaced[0].detail, /Levels 3-4 reached/);
  assert.match(surfaced[0].detail, /New Tetra Variants: Silver, Gold/);
  assert.match(surfaced[0].detail, /Tetra Variant Collection Complete!/);
});

test('Phase 36 recap processing suppresses standalone variant notices and emits the consolidated level notice', () => {
  assert.match(events, /processFishCareLevelIncreaseProgression\(fish, species, levelResult, now, tank, dayKey\)/);
  assert.match(events, /unlockFishAppearanceVariantsForLevelIncrease\(fish, species, oldLevel, newLevel, now, tank, \{ dayKey, notify: false \}\)/);
  assert.match(events, /surfaceFishCareLevelProgressionNotification\(fish, species, \{ \.\.\.levelResult, oldLevel, newLevel, levelsGained \}, masteryResult, variantUnlocks, now, tank, dayKey\)/);
});

test('Phase 36 standalone progression surface uses the notification center with toast only as fallback', () => {
  assert.match(events, /function surfaceStandaloneFishProgressionNotification[\s\S]*?queueBoroughActivityNotification\(title, detail/);
  assert.match(events, /function surfaceStandaloneFishProgressionNotification[\s\S]*?if \(!surfaced && typeof showToast === \"function\"\)/);
  assert.match(events, /function surfaceStandaloneFishProgressionNotification[\s\S]*?type: options\.type \|\| \"fish_progression\"/);
});
