const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const EXPECTED_OPENINGS = new Map([
  ['ceramic-tube-cluster__cave__theme-artificial__front.png', 5],
  ['clay-multi__cave__theme-artificial__front.png', 4],
  ['extra-narrow-pleco-tubes__cave__theme-artificial__front.png', 5],
  ['seashell-cluster__cave-coral__theme-reef__front.png', 3],
  ['slate-stack__cave-rock__theme-natural__front.png', 3]
]);

function getSeatOnlyCaves() {
  const payload = JSON.parse(read('assets/decor/decor_types.json'));
  const decor = Array.isArray(payload) ? payload : payload.decor;
  return decor.filter((entry) => entry?.behavior === 'cave_layered' && entry.swimmable === false);
}

test('every seat-only cave authors one portal and one seat for every usable opening', () => {
  const caves = getSeatOnlyCaves();
  assert.equal(caves.length, 5);

  for (const cave of caves) {
    const expectedCount = EXPECTED_OPENINGS.get(cave.file);
    assert.ok(expectedCount, `unexpected seat-only cave ${cave.file}`);
    const profile = cave.caveBehavior;
    assert.ok(profile && typeof profile === 'object', `${cave.file} must author caveBehavior`);
    assert.equal(profile.portals?.length, expectedCount, `${cave.file} portal count`);
    assert.equal(profile.insideSlots?.length, expectedCount, `${cave.file} seat count`);

    const portalIds = new Set(profile.portals.map((portal) => portal.id));
    assert.equal(portalIds.size, expectedCount, `${cave.file} portal ids must be unique`);

    for (const portal of profile.portals) {
      for (const field of ['approachX', 'approachY', 'mouthX', 'mouthY']) {
        assert.equal(typeof portal[field], 'number', `${cave.file} ${portal.id}.${field}`);
        assert.ok(portal[field] >= 0 && portal[field] <= 1, `${cave.file} ${portal.id}.${field} must be normalized`);
      }
    }

    for (const seat of profile.insideSlots) {
      assert.equal(typeof seat.x, 'number', `${cave.file} ${seat.id}.x`);
      assert.equal(typeof seat.y, 'number', `${cave.file} ${seat.id}.y`);
      assert.ok(seat.x >= 0 && seat.x <= 1, `${cave.file} ${seat.id}.x must be normalized`);
      assert.ok(seat.y >= 0 && seat.y <= 1, `${cave.file} ${seat.id}.y must be normalized`);
      assert.equal(typeof seat.layer, 'number', `${cave.file} ${seat.id} must author an interior layer`);
      assert.ok(seat.facing === -1 || seat.facing === 1, `${cave.file} ${seat.id} must author a preferred facing`);
      assert.equal(seat.portalIds?.length, 1, `${cave.file} ${seat.id} must belong to exactly one opening`);
      assert.ok(portalIds.has(seat.portalIds[0]), `${cave.file} ${seat.id} references a missing portal`);
    }
  }
});

test('authored cave portals and seats outrank derived mask regions', () => {
  const source = read('public/app-src/rendering/collision-and-masks.js');

  const triggerFnStart = source.indexOf('function getCaveTriggerRegions');
  const seatFnStart = source.indexOf('function getCaveSeatRegions');
  const nextFn = source.indexOf('function getCaveSeatRegions', triggerFnStart);
  const triggerFn = source.slice(triggerFnStart, nextFn);
  const seatFnEnd = source.indexOf('function findRegionById', seatFnStart);
  const seatFn = source.slice(seatFnStart, seatFnEnd);

  assert.ok(triggerFn.indexOf('authoredProfile?.portals') >= 0, 'trigger regions must recognize authored portals');
  assert.ok(triggerFn.indexOf('authoredProfile?.portals') < triggerFn.indexOf('getDerivedCaveTriggerRegions'), 'authored portals must be considered before derived triggers');
  assert.ok(seatFn.indexOf('authoredProfile?.insideSlots') >= 0, 'seat regions must recognize authored seats');
  assert.ok(seatFn.indexOf('authoredProfile?.insideSlots') < seatFn.indexOf('decor.seatsPath'), 'authored seats must be considered before mask-authored seats');
});

test('seat-only cave behavior holds the authored seat and exits through the portal path', () => {
  const caves = read('public/app-src/fish/caves-and-collision.js');
  assert.match(caves, /if \(!swimmable\) \{[\s\S]*?plan\.normalInsideMode = "seat-hold"[\s\S]*?plan\.normalSeatPoint[\s\S]*?applyFishCaveSeatFacingWhenSettled[\s\S]*?beginFishNormalCaveExit/);
  assert.match(caves, /function beginFishNormalCaveExit\([\s\S]*?plan\.exitPathNodes\[0\] \|\| mouthNode/);
});
