"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..", "game");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
function load(file, name, stubs) {
  const parsed = ts.createSourceFile(file, read(`public/app-src/${file}`), ts.ScriptTarget.Latest, true);
  const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, name);
  return vm.runInNewContext(`(${fn.getText(parsed)})`, stubs);
}
const cave = (name, stubs) => load("fish/caves-and-collision.js", name, stubs);

test("43 species can visit caves, with pelagic animals and attached crawlers excluded", () => {
  const catalog = JSON.parse(read("assets/fish/fish-types.json")).fish;
  assert.equal(catalog.filter(fish => fish.caveEnabled).length, 43);
  for (const id of ["betta", "molly", "swordtail", "tang", "goldfish", "angelfish", "pufferfish", "rainbowfish", "discus", "moor-goldfish", "piranha", "freshwater-shrimp", "marine-shrimp"]) {
    assert.equal(catalog.find(fish => fish.id === id)?.caveEnabled, true, id);
  }
  for (const id of ["otocinclus", "nerite-snail", "turbo-snail", "koi", "sunfish", "pilot-fish", "lookdown", "bull-shark", "great-white-shark", "hammerhead-shark", "orca"]) {
    assert.equal(catalog.find(fish => fish.id === id)?.caveEnabled, false, id);
  }
  const small = JSON.parse(read("assets/fish/small_fish/fish-types.json")).fish;
  assert.equal(small.find(fish => fish.id === "wonder-killifish")?.caveEnabled, true);
  for (const fish of small) {
    const normal = catalog.find(entry => entry.id === fish.id);
    if (normal) assert.equal(fish.caveEnabled, normal.caveEnabled, fish.id);
  }
});

test("untouched legacy editor defaults cannot hide authored openings; edited geometry survives", () => {
  const defaults = { entry: { x: 0.5, y: 0.7 }, seats: [{ x: 0.4, y: 0.5 }] };
  let authored = null;
  const decorMap = new Map([["tube", { caveBehavior: { portals: [{}], insideSlots: [{}] } }]]);
  const hasSettings = load("decor/customization.js", "hasPlacedCaveSettings", {
    JSON, isCaveDecorKey: () => true, getAuthoredDecorCaveSettings: () => authored,
    sanitizePlacedCaveSettings: settings => settings || defaults,
    runtime: { decorMap, decorMeta: {} }
  });
  assert.equal(hasSettings({ decorKey: "tube", caveSettings: defaults }), false);
  assert.equal(hasSettings({ decorKey: "tube" }), false);
  assert.equal(hasSettings({ decorKey: "tube", caveSettings: { ...defaults, entry: { x: 0.2, y: 0.7 } } }), true);
  decorMap.set("pot", { path: "front.webp", bgPath: "back.webp" });
  assert.equal(hasSettings({ decorKey: "pot", caveSettings: defaults }), false,
    "legacy templates must also reveal mask-derived entrances");
  authored = defaults;
  assert.equal(hasSettings({ decorKey: "tube", caveSettings: defaults }), true);
});

test("mask-authored entrances retain their measured mouth instead of generic profile coordinates", () => {
  let explicit = false;
  const match = load("fish/cave-navigation.js", "getPortalMatchForTriggerRegion", {
    Math, TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    hasPlacedCaveSettings: () => false,
    getExplicitCaveBehaviorPortals: () => explicit ? [{}] : [],
    getCaveSeatRegions: () => [{ xNorm: 0.3, yNorm: 0.5 }],
    mapDecorLocalPointToTankNorm: (item, x, y) => ({ xNorm: x, yNorm: y })
  });
  const profile = { portals: [{ id: "right", mouthX: 0.62, mouthY: 0.69, approachX: 0.66, approachY: 0.76 }] };
  const trigger = { id: "opening", xNorm: 0.4, yNorm: 0.5 };
  const measured = match({ decorKey: "pot" }, trigger, profile);
  assert.equal(measured.mouthPoint.xNorm, 0.4);
  assert.equal(measured.mouthPoint.yNorm, 0.5);
  assert.equal(measured.approachPoint.xNorm, 0.448);
  assert.equal(measured.portal.id, "opening");
  explicit = true;
  assert.equal(match({ decorKey: "pot" }, trigger, profile).mouthPoint.xNorm, 0.62,
    "explicit geometry still controls the mouth");
});

test("busy entrances do not suppress a second available cave", () => {
  const pick = cave("pickCaveEntryBehavior", {
    Number, Math: { ...Math, random: () => 0 },
    state: { placedDecor: [] }, getCaveBehaviorChance: () => 1,
    collectCaveBehaviorPlansForFish: () => [{ decorId: "busy", mouth: {} }, { decorId: "open", mouth: {} }],
    isFishCaveEntranceBusy: (fish, id) => id === "busy"
  });
  assert.equal(pick({ caveEnabled: true }, { id: "fish" }, 1000).decorId, "open");
});

test("slow cumulative progress stays alive while a frozen entrance times out", () => {
  const progress = cave("updateFishCaveTransitProgress", { Math });
  const fish = { caveState: "approach", xNorm: 0, yNorm: 0.5, targetXNorm: 0.4, targetYNorm: 0.5 };
  const plan = {};
  for (let now = 0; now <= 15000; now += 1000) {
    fish.xNorm += 0.001;
    assert.equal(progress(fish, plan, now), false);
  }
  assert.equal(progress(fish, plan, 24000), true);
  assert.equal(progress(fish, plan, 24001), false);
  fish.caveState = "inside"; plan.normalInsideMode = "seat-hold";
  assert.equal(progress(fish, plan, 40000), false, "rest is not a transit stall");
});

test("interior linger starts on arrival rather than on a long approach", () => {
  const arrive = cave("completeFishCaveEntryArrival", {
    Number, Math, CAVE_TRIGGER_COOLDOWN_MS: 10000,
    CAVE_NORMAL_SEAT_HOLD_MIN_MS: 12000, CAVE_NORMAL_SEAT_HOLD_MAX_MS: 22000,
    randomBetween: () => 12000, clearNormalCavePathState: () => {},
    setFishDesiredTankLayer: () => {}, getFishActiveCaveInsideLayer: () => 3,
    TANK_DEPTH_LAYERS: 5, resetFishCavePortalCrossing: () => {}
  });
  const fish = { caveInsideUntil: 15000, xNorm: 0.4, yNorm: 0.5 };
  arrive(fish, {}, {}, { seatId: "seat", inside: { xNorm: 0.4, yNorm: 0.5 }, lingerMs: 18000 }, 60000);
  assert.equal(fish.caveInsideUntil, 78000);
});

test("an unsettled seat still leaves when its visit expires", () => {
  let exits = 0;
  const inside = cave("updateNormalFishCaveInsideBehavior", {
    Number, beginFishNormalCaveExit: () => { exits++; return true; }
  });
  assert.equal(inside({ caveInsideUntil: 10000 }, {}, {}, {}, {}, 10001), true);
  assert.equal(exits, 1);
});

test("rate-limited cave recovery does not damp velocity each frame", () => {
  const plan = { decorId: "pot", collisionRetryAt: 5000 };
  const recover = cave("recoverFishInsideCave", {
    Number, getActiveFishCavePlan: () => plan, getCaveBehaviorDecorById: () => ({})
  });
  const fish = { motionVelocityXNorm: 0.04, motionVelocityYNorm: 0.02 };
  recover(fish, {}, 1000); recover(fish, {}, 1016);
  assert.equal(fish.motionVelocityXNorm, 0.04);
  assert.equal(fish.motionVelocityYNorm, 0.02);
});

test("blocked cave motion never reaches the ordinary zero-velocity reset", () => {
  let recoveries = 0;
  const retarget = load("fish/predators-and-motion.js", "retargetFishAfterBlockedMove", {
    Math, Number, recoverFishInsideCave: () => { recoveries++; }
  });
  const fish = { activity: "roam", caveState: "exit", motionVelocityXNorm: 0.03, motionVelocityYNorm: 0.01 };
  retarget(fish, {}, { xNorm: 0.2, yNorm: 0.3, caveInteriorBlocked: true }, 0.3, 0.3, 1000);
  assert.equal(recoveries, 1);
  assert.equal(fish.motionVelocityXNorm, 0.03);
});

test("cave plans reject neighboring walls across the complete entry and exit route", () => {
  let blockX = 50;
  const wall = { item: { id: "neighbor" }, descriptor: { bounds: {} } };
  const clear = load("fish/cave-navigation.js", "isCavePlanClearOfNeighbors", {
    Math, Set, getSpeciesForFish: () => ({}), clampTankLayer: x => x,
    getCaveCollisionFrameCandidates: layer => layer === 3 ? [wall] : [],
    getFishDisplayWidth: () => 10, boundsIntersect: () => true,
    TANK_WIDTH: 100, TANK_HEIGHT: 100, CAVE_STRICT_SAMPLE_STEP_PX: 2,
    getFishCollisionPose: (fish, species, now, x, y) => ({ x: x * 100, y: y * 100 }),
    getFishShapeDescriptor: (fish, species, now, pose) => ({ ...pose, bounds: {} }),
    shapesOverlapByMaskStrict: shape => Math.abs(shape.x - blockX) < 2
  });
  const point = x => ({ xNorm: x, yNorm: 0.5 });
  const item = { id: "own" }, fish = { direction: 1 };
  const plan = { frontLayer: 3, backLayer: 3, approach: point(0.1), mouth: point(0.3),
    entryPathNodes: [point(0.3), point(0.7)], inside: point(0.7), exitPathNodes: [point(0.4), point(0.3)] };
  assert.equal(clear(item, fish, plan), false, "wall between mouth and seat blocks entry");
  blockX = 20;
  assert.equal(clear(item, fish, plan), false, "exterior staging route must also be open");
  blockX = 90;
  assert.equal(clear(item, fish, plan), true, "distant neighboring wall is safe");
  blockX = 50; plan.frontLayer = plan.backLayer = 2;
  assert.equal(clear(item, fish, plan), true, "decor on another main layer does not block");
  plan.frontLayer = plan.backLayer = 3; wall.item.id = "own";
  assert.equal(clear(item, fish, plan), true, "own cave geometry has its separate interior checks");
});

test("a stalled portal entry backs out physically without clearing depth or teleporting", () => {
  const plan = { decorId: "pot", approach: { xNorm: 0.7, yNorm: 0.5 }, mouth: { xNorm: 0.5, yNorm: 0.5 } };
  const stubs = { Math, Number, TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    getActiveFishCavePlan: () => plan, getCaveBehaviorDecorById: () => ({}),
    isDebugCaveTestFish: () => false, updateFishCaveTransitProgress: () => true,
    isFishDead: () => false, getFishTankDepthZ: fish => fish.z,
    getFishCaveDepthRegion: () => 0.2,
    setFishTargetToCaveNode: (fish, node) => { fish.targetXNorm = node.xNorm; fish.targetYNorm = node.yNorm; return true; }
  };
  stubs.beginFishCavePortalCrossing = cave("beginFishCavePortalCrossing", stubs);
  stubs.abortFishCaveBehavior = cave("abortFishCaveBehavior", stubs);
  const update = cave("updateFishCaveBehavior", stubs);
  const fish = { caveState: "portal-enter", caveDecorId: "pot", activity: "roam",
    xNorm: 0.49, yNorm: 0.5, z: 0.45, motionVelocityXNorm: 0.02 };
  assert.equal(update(fish, {}, 20000), true);
  assert.equal(fish.caveState, "portal-exit");
  assert.equal(plan.exitRequested, true);
  assert.equal(fish.xNorm, 0.49);
  assert.equal(fish.yNorm, 0.5);
  assert.equal(fish.z, 0.45);
  assert.equal(fish.motionVelocityXNorm, 0.02);
  assert.equal(fish.cavePortalCrossingStartZ, 0.45);
});
