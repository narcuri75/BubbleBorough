const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'public/app-src/00-bootstrap.js'), 'utf8');
const events = fs.readFileSync(path.join(root, 'public/app-src/tank/events-recaps-and-save.js'), 'utf8');

function milestoneBlock(id) {
  const marker = `id: "${id}"`;
  const start = bootstrap.indexOf(marker);
  assert.ok(start >= 0, `${id} should exist`);
  const next = bootstrap.indexOf('\n  {\n    id:', start + marker.length);
  return bootstrap.slice(start, next >= 0 ? next : bootstrap.indexOf('\n]);', start));
}

test('Phase 29 exposes explicit persistent fish progression milestone stats', () => {
  assert.match(events, /const highestFishCareLevel = Math\.max\([\s\S]*currentAndStoredFish[\s\S]*memorialCareLevels[\s\S]*masteryRecords/);
  assert.match(events, /const masteredSpeciesCount = masteryRecords\.filter/);
  assert.match(events, /const hasLevel3Fish = highestFishCareLevel >= 3/);
  assert.match(events, /const hasLevel4Fish = highestFishCareLevel >= 4/);
  assert.match(events, /const hasMasteredSpecies = masteredSpeciesCount > 0/);
  assert.match(events, /highestFishCareLevel,[\s\S]*masteredSpeciesCount,[\s\S]*hasLevel3Fish,[\s\S]*hasLevel4Fish,[\s\S]*hasMasteredSpecies,/);
});

test('Phase 29 counts mastered species from permanent mastery records', () => {
  assert.match(events, /\(Number\(entry\?\.highestLevel\) \|\| FISH_CARE_LEVEL_MIN\) >= FISH_CARE_LEVEL_MAX/);
  assert.match(events, /Number\(entry\?\.masteredAt\) > 0/);
});

test('Phase 29 major milestones use progression flags rather than fish age', () => {
  const happy = milestoneBlock('happy-habitat');
  const marine = milestoneBlock('marine-curator');
  const legends = milestoneBlock('borough-legends');
  assert.match(happy, /stats\.hasLevel3Fish/);
  assert.match(marine, /stats\.hasLevel4Fish/);
  assert.match(legends, /stats\.hasMasteredSpecies/);
  assert.doesNotMatch(happy + marine + legends, /oldestLivingFishAgeMs/);
});

test('Phase 29 completed milestones remain sticky and are never re-evaluated as incomplete', () => {
  assert.match(events, /if \(state\.dailyBonus\.milestones\[milestone\.id\] \|\| !milestone\.isMet\(stats\)\) \{\s*continue;/);
});
