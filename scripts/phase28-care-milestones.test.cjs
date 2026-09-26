const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'public/app-src/00-bootstrap.js'), 'utf8');
const events = fs.readFileSync(path.join(root, 'public/app-src/tank/events-recaps-and-save.js'), 'utf8');
const living = fs.readFileSync(path.join(root, 'public/app-src/borough/living-borough.js'), 'utf8');

function milestoneBlock(id) {
  const marker = `id: "${id}"`;
  const start = bootstrap.indexOf(marker);
  assert.ok(start >= 0, `${id} should exist`);
  const next = bootstrap.indexOf('\n  {\n    id:', start + marker.length);
  return bootstrap.slice(start, next >= 0 ? next : bootstrap.indexOf('\n]);', start));
}

test('Phase 28 replaces fish-age gates with Care Level and mastery gates', () => {
  const happy = milestoneBlock('happy-habitat');
  assert.match(happy, /hasLevel3Fish/);
  assert.match(happy, /recentAverageComfort >= 80/);
  assert.doesNotMatch(happy, /oldestLivingFishAgeMs|WEEK_MS/);

  const marine = milestoneBlock('marine-curator');
  assert.match(marine, /hasLevel4Fish/);
  assert.match(marine, /goodRecaps >= 10/);
  assert.doesNotMatch(marine, /oldestLivingFishAgeMs|21 \* DAY_MS/);

  const legends = milestoneBlock('borough-legends');
  assert.match(legends, /hasMasteredSpecies/);
  assert.match(legends, /goodRecaps >= 15/);
  assert.match(legends, /hasSparklingFish/);
  assert.doesNotMatch(legends, /oldestLivingFishAgeMs|30 \* DAY_MS/);
});

test('Phase 28 milestone stats retain historical fish care progress', () => {
  assert.match(events, /const highestFishCareLevel = Math\.max\([\s\S]*currentAndStoredFish[\s\S]*memorialCareLevels[\s\S]*masteryRecords/);
  assert.match(events, /const masteredSpeciesCount = masteryRecords\.filter/);
  assert.match(events, /const hasMasteredSpecies = masteredSpeciesCount > 0/);
  assert.match(events, /highestFishCareLevel,[\s\S]*hasMasteredSpecies,/);
});

test('Phase 28 keeps birthday age milestones as flavor and history', () => {
  assert.match(bootstrap, /const FISH_AGE_MILESTONE_DAYS = Object\.freeze\(\[7, 30, 100, 365\]\)/);
  assert.match(living, /for \(const milestone of FISH_AGE_MILESTONE_DAYS\)/);
  assert.match(living, /type: "birthday"/);
});

test('Phase 28 preserves the existing unlock rewards for the three major milestones', () => {
  assert.match(milestoneBlock('happy-habitat'), /unlocks: \["betta", "blue-ram", "piranha", "wonder-killifish", "rainbowfish", "gourami", "clownfish", "royal-gramma", "seahorse"\]/);
  assert.match(milestoneBlock('marine-curator'), /unlocks: \["pufferfish", "bull-shark", "hammerhead-shark"\]/);
  assert.match(milestoneBlock('borough-legends'), /unlocks: \["great-white-shark", "orca", "__custom-fish-shop__"\]/);
});
