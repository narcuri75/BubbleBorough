const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const root = path.join(__dirname, "../game/public/app-src");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const noop = () => {};

function load(file, names, bindings) {
  const parsed = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text));
  assert.equal(declarations.length, names.length);
  const context = vm.isContext(bindings) ? bindings : vm.createContext(bindings);
  vm.runInContext(declarations.map(n => n.getText(parsed)).join("\n"), context);
  return context;
}

function claims() {
  const plant = { id: "plant", decorKey: "anubias", xNorm: .5, yNorm: .5 };
  const fish = { id: "fish", name: "Ada", xNorm: .5, yNorm: .5, z: .4, personality: "territorial" };
  const other = { id: "other", name: "Bea", xNorm: .54, yNorm: .5, z: .4 };
  const tank = { id: "tank", fish: [fish, other], placedDecor: [plant] };
  const remote = { id: "remote", fish: [{ id: "remote-fish" }], placedDecor: [] };
  const state = { tanks: [tank, remote], fish: tank.fish, placedDecor: tank.placedDecor };
  const c = load("fish/decor-behavior.js", ["getFishDecorClaimId", "getTankContainingFish", "tryClaimFishDecor", "releaseFishDecorClaim", "getDecorFishBehaviorMeta", "getDecorShelterCapacity", "isDecorClaimEligible", "getDecorClaimants", "getDecorClaimCount", "clearDecorClaims"], {
    state, runtime: { decorMap: new Map(), decorMeta: {} }, getAllTanks: s => s.tanks,
    getAllTankFish: (s = state) => s.tanks.flatMap(t => t.fish), isFishDead: f => !!f.dead,
    isCaveDecorKey: k => k.startsWith("cave"), saveState: noop
  });
  return { c, fish, other, plant, tank, state, remote };
}

test("claims are automatic, local, capacity limited, expire and are not extended by repeated targeting", () => {
  const { c, fish, other, plant, remote } = claims();
  assert.equal(c.tryClaimFishDecor(fish, plant.id, 1000), true);
  assert.equal(fish.decorClaimUntil, 91000);
  assert.equal(c.tryClaimFishDecor(fish, plant.id, 2000), true);
  assert.equal(fish.decorClaimUntil, 91000);
  assert.equal(c.tryClaimFishDecor(other, plant.id, 2000), false);
  assert.equal(c.tryClaimFishDecor(remote.fish[0], plant.id, 2000), false);
  assert.equal(c.getFishDecorClaimId(fish, 91000), null);
  assert.equal(c.tryClaimFishDecor(other, plant.id, 91000), true);
  c.releaseFishDecorClaim(other);
  assert.equal(other.decorClaimUntil, 0);
});

test("removing decor clears even expired claims", () => {
  const { c, fish, plant } = claims();
  fish.decorClaimId = plant.id; fish.decorClaimUntil = 0;
  assert.equal(c.clearDecorClaims(plant.id, { save: false }), 1);
  assert.equal(fish.decorClaimId, null);
});

test("territorial warnings need an active claim and nearby intruder, respect friends, depth, sleep and cooldown", () => {
  const { c, fish, other, plant } = claims();
  Object.assign(c, { clamp, getFishPersonality: f => f.personality, isFishAdult: () => true, isPeacefulModeEnabled: () => false,
    getFishTankDepthZ: f => f.z, getRelationshipKindForFish: () => "neutral",
    randomBetween: (a,b) => (a+b)/2, getFishMoodAdjustedBehaviorChance: () => .22,
    reinforceFishAvoidanceRelationship: noop });
  load("fish/needs-disease-and-behavior.js", ["pickClaimedDecorTerritoryTarget"], c);
  const pick = now => c.pickClaimedDecorTerritoryTarget(fish, { id: "danio" }, now, { force: true });
  assert.equal(pick(1000), null);
  c.tryClaimFishDecor(fish, plant.id, 1000);
  other.xNorm = .9; assert.equal(pick(1000), null);
  other.xNorm = .54; other.z = .9; assert.equal(pick(1000), null);
  other.z = .4; fish.relationships = { other: { kind: "friend" } }; assert.equal(pick(1000), null);
  fish.relationships = {}; fish.sleepShelter = {}; assert.equal(pick(1000), null);
  fish.sleepShelter = null;
  assert.equal(pick(1000).intentTargetId, "other");
  assert.equal(pick(2000).intentTargetId, "other", "warning remains committed briefly");
  assert.equal(pick(5000), null, "cooldown prevents repeated aggression");
  assert.equal(pick(92000), null, "expired claims cannot trigger aggression");
});

test("a declined warning gets a cooldown instead of rolling every animation frame", () => {
  const { c, fish, plant } = claims();
  const math = Object.create(Math); math.random = () => .99;
  Object.assign(c, { Math: math, clamp, getFishPersonality: f => f.personality, isFishAdult: () => true,
    getFishTankDepthZ: f => f.z, getRelationshipKindForFish: () => "neutral", randomBetween: () => 12000,
    getFishMoodAdjustedBehaviorChance: () => .22, reinforceFishAvoidanceRelationship: () => assert.fail("no warning expected") });
  load("fish/needs-disease-and-behavior.js", ["pickClaimedDecorTerritoryTarget"], c);
  c.tryClaimFishDecor(fish, plant.id, 1000);
  assert.equal(c.pickClaimedDecorTerritoryTarget(fish, {}, 1000), null);
  assert.equal(fish.territoryWarningCooldownUntil, 13000);
});

test("sleep selects an available fitting cave and delegates entrance movement to the cave executor", () => {
  const { c, fish, tank } = claims();
  tank.placedDecor.push({ id: "cave", decorKey: "cave-pot" });
  let chosen;
  Object.assign(c, { prepareFishForUserAction: noop, collectCaveBehaviorPlansForFish: () => [{ decorId: "busy", mouth: {} }, { decorId: "cave", mouth: {} }],
    isFishCaveEntranceBusy: (f,id) => id === "busy", beginFishCaveBehavior: (f,plan) => { chosen = plan; f.caveState = "approach"; return true; },
    setFishBehaviorIntent: noop, markFishActionStateDirty: noop, showFishRoutineToast: noop, FISH_ACTION_SLEEP_DURATION_MS: 12000 });
  load("fish/actions.js", ["pickFishSleepCavePlan", "triggerFishActionSleep"], c);
  assert.equal(c.triggerFishActionSleep(fish, { caveEnabled: true }, 1000), true);
  assert.equal(chosen.decorId, "cave"); assert.equal(chosen.sleepShelter, true);
  assert.equal(fish.sleepShelter.sleepingUntil, 0);
  assert.equal(fish.sleepShelter.approachDeadline, 46000);
});

test("sleep behind decor waits for arrival in position AND depth, then holds for twelve seconds", () => {
  const { c, fish } = claims();
  const sleep = { cave: false, decorId: "plant", target: { xNorm: .7, yNorm: .5, targetZ: .2 }, durationMs: 12000, approachDeadline: 45000, sleepingUntil: 0 };
  fish.sleepShelter = sleep;
  let target;
  Object.assign(c, { getFishTankDepthZ: f => f.z, applyBehaviorTarget: (f,s,t) => { target = t; } });
  load("fish/actions.js", ["updateFishSleepShelter"], c);
  const item = { action: "sleep", endsAt: 12000 };
  c.updateFishSleepShelter(fish, {}, item, 1000); assert.equal(sleep.sleepingUntil, 0);
  fish.xNorm = .7; c.updateFishSleepShelter(fish, {}, item, 2000); assert.equal(sleep.sleepingUntil, 0);
  fish.z = .2; c.updateFishSleepShelter(fish, {}, item, 3000);
  assert.equal(item.endsAt, 15000); assert.equal(target.intentType, "sleep");
  c.updateFishSleepShelter(fish, {}, item, 4000); assert.equal(item.endsAt, 15000);
  fish.activity = "feeding";
  assert.equal(c.updateFishSleepShelter(fish, {}, item, 5000), false); assert.equal(item.endsAt, 5000);
});

test("sleep falls back behind decor when caves are unavailable", () => {
  const { c, fish } = claims();
  let target;
  Object.assign(c, { clamp, prepareFishForUserAction: noop, FISH_ACTION_SLEEP_DURATION_MS: 12000,
    collectCaveBehaviorPlansForFish: () => [], getFishTankLayer: () => 1,
    pickDecorHangoutTarget: (s,f,now,options) => {
      assert.equal(options.excludeCaves, true); assert.equal(options.requireBehindSpace, true);
      assert.equal(options.ignoreOccupancy, undefined);
      return { decorId: "plant", xNorm: .5, yNorm: .45, zoneType: "plant" };
    }, getPlacedDecorDepthZ: () => .5, getFishTankDepthRadius: () => .03,
    sanitizeTankDepthZ: x => x, applyBehaviorTarget: (f,s,t) => { target = t; },
    markFishActionStateDirty: noop, showFishRoutineToast: noop });
  load("fish/actions.js", ["pickFishSleepCavePlan", "triggerFishActionSleep"], c);
  c.triggerFishActionSleep(fish, {}, 1000);
  assert.ok(target.targetZ < .5, "target is behind the decor");
  assert.equal(fish.decorClaimId, "plant"); assert.equal(fish.sleepShelter.cave, false);
});

test("cave entry refuses a shelter whose claim slots are already taken", () => {
  const fish = { id: "fish" };
  const c = load("fish/caves-and-collision.js", ["beginFishCaveBehavior"], {
    isFishCaveEntranceBusy: () => false, getSpeciesForFish: () => ({}), tryClaimFishDecor: () => false
  });
  assert.equal(c.beginFishCaveBehavior(fish, { decorId: "full" }, 1000), false);
  assert.equal(fish.caveState, undefined);
});

test("cave sleep timer starts on interior arrival, holds without roaming and exits when done", () => {
  let exits = 0;
  const c = load("fish/caves-and-collision.js", ["completeFishCaveEntryArrival", "updateNormalFishCaveInsideBehavior"], {
    CAVE_TRIGGER_COOLDOWN_MS: 10000, CAVE_NORMAL_SEAT_HOLD_MIN_MS: 12000, CAVE_NORMAL_SEAT_HOLD_MAX_MS: 22000,
    randomBetween: () => 12000, clearNormalCavePathState: noop, setFishDesiredTankLayer: noop,
    getFishActiveCaveInsideLayer: () => 3, TANK_DEPTH_LAYERS: 5, resetFishCavePortalCrossing: noop,
    setFishBehaviorIntent: noop, beginFishNormalCaveExit: () => { exits++; return true; }
  });
  const fish = { xNorm: .4, yNorm: .5, sleepShelter: { durationMs: 12000, sleepingUntil: 0 } };
  const plan = { sleepShelter: true, inside: { xNorm: .4, yNorm: .5 }, lingerMs: 12000 };
  c.completeFishCaveEntryArrival(fish, {}, {}, plan, 30000);
  assert.equal(fish.caveInsideUntil, 42000); assert.equal(fish.sleepShelter.sleepingUntil, 42000);
  c.updateNormalFishCaveInsideBehavior(fish, {}, {}, plan, {}, 31000);
  assert.equal(fish.targetXNorm, .4); assert.equal(fish.targetAt, 42000); assert.equal(exits, 0);
  c.updateNormalFishCaveInsideBehavior(fish, {}, {}, plan, {}, 42000); assert.equal(exits, 1);
});

test("assignment controls and legacy residence restoration are retired", () => {
  const html = fs.readFileSync(path.join(__dirname, "../game/index.html"), "utf8");
  const bootstrap = fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8");
  const sanitize = fs.readFileSync(path.join(root, "decor/layout-and-layers.js"), "utf8");
  assert.doesNotMatch(html, /selectedDecorAssignButton|Assign Residence/);
  assert.doesNotMatch(bootstrap, /decor-residence|residenceSettingsDecorId/);
  assert.doesNotMatch(sanitize, /residenceDecorId:\s/);
  assert.match(sanitize, /favoriteSpot: fish\.residenceDecorId \? null/);
});

test("the live movement loop lets a queued Sleep action advance the cave controller", () => {
  const file = "fish/predators-and-motion.js";
  const parsed = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === "caveBehaviorOwnsMovement") expression = node.initializer.getText(parsed);
    ts.forEachChild(node, visit);
  }
  visit(parsed); assert.ok(expression);
  let calls = 0;
  const c = vm.createContext({ panicOwnsMovement: false, pufferInflatedOwnsMovement: false, breedingRole: null,
    queuedFishActionActive: true, activeQueuedFishAction: { action: "sleep" }, gravelPebbleOwnsMovement: false,
    fish: { activity: "roam", sleepShelter: { cave: true } }, species: {}, now: 1000,
    updateFishCaveBehavior: () => { calls++; return true; } });
  assert.equal(vm.runInContext(expression, c), true); assert.equal(calls, 1);
  c.activeQueuedFishAction = { action: "inspect" };
  assert.equal(vm.runInContext(expression, c), false); assert.equal(calls, 1);
  c.activeQueuedFishAction = { action: "sleep" }; c.panicOwnsMovement = true;
  assert.equal(vm.runInContext(expression, c), false); assert.equal(calls, 1);
});

test("ending sleep uses the cave exit and keeps the next action queued until the exit completes", () => {
  const fish = { id: "fish", caveState: "inside", caveInsideUntil: 15000, targetAt: 15000, sleepShelter: { cave: true } };
  const queue = { active: null, restUntil: 0, items: [{ action: "inspect" }] };
  const c = load("fish/actions.js", ["finishFishActionQueueItem", "promoteNextFishActionQueueItem"], {
    runtime: { debugFishActionIndicatorsEnabled: false }, requestDeferredStateSave: noop,
    getFishActionQueueState: () => queue, getManagedFishById: () => ({ fish }), isFishDead: () => false
  });
  c.finishFishActionQueueItem(fish, { action: "sleep" }, 5000, { cancelled: true, silent: true });
  assert.equal(fish.caveState, "inside", "the established controller still owns the exit");
  assert.equal(fish.caveInsideUntil, 5000); assert.equal(fish.sleepShelter, null);
  assert.equal(c.promoteNextFishActionQueueItem(fish.id, 5000), false);
  assert.equal(queue.items.length, 1);
});
