"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const collisionSource = fs.readFileSync(path.join(ROOT, "public/app-src/fish/caves-and-collision.js"), "utf8");
const motionSource = fs.readFileSync(path.join(ROOT, "public/app-src/fish/predators-and-motion.js"), "utf8");
const bootstrapSource = fs.readFileSync(path.join(ROOT, "public/app-src/00-bootstrap.js"), "utf8");
const parsed = ts.createSourceFile("collision.js", collisionSource, ts.ScriptTarget.Latest, true);

function load(name, stubs = {}) {
  const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `${name} should exist`);
  return vm.runInNewContext(`(${fn.getText(parsed)})`, stubs);
}

function getConstant(name) {
  const match = bootstrapSource.match(new RegExp(`const ${name} = ([^;]+);`));
  assert.ok(match, `${name} constant should exist`);
  return Function(`return (${match[1]});`)();
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function spacingHarness(overrides = {}) {
  const runtime = {
    fishSoftBodySpacingById: new Map(),
    fishActionSteeringByFishId: new Map(),
    debugBehaviorSteeringByFishId: new Map(),
    fishDragState: null
  };
  const constants = {
    FISH_SOFT_BODY_SPACING_X_SCALE: getConstant("FISH_SOFT_BODY_SPACING_X_SCALE"),
    FISH_SOFT_BODY_SPACING_Y_SCALE: getConstant("FISH_SOFT_BODY_SPACING_Y_SCALE"),
    FISH_SOFT_BODY_SPACING_MIN_X_NORM: getConstant("FISH_SOFT_BODY_SPACING_MIN_X_NORM"),
    FISH_SOFT_BODY_SPACING_MAX_X_NORM: getConstant("FISH_SOFT_BODY_SPACING_MAX_X_NORM"),
    FISH_SOFT_BODY_SPACING_MIN_Y_NORM: getConstant("FISH_SOFT_BODY_SPACING_MIN_Y_NORM"),
    FISH_SOFT_BODY_SPACING_MAX_Y_NORM: getConstant("FISH_SOFT_BODY_SPACING_MAX_Y_NORM"),
    FISH_SOFT_BODY_SPACING_SOCIAL_PERSONAL_RATIO: getConstant("FISH_SOFT_BODY_SPACING_SOCIAL_PERSONAL_RATIO"),
    FISH_SOFT_BODY_SPACING_URGENT_INNER_RATIO: getConstant("FISH_SOFT_BODY_SPACING_URGENT_INNER_RATIO"),
    FISH_SOFT_BODY_SPACING_MAX_BIAS_PX: getConstant("FISH_SOFT_BODY_SPACING_MAX_BIAS_PX"),
    FISH_SOFT_BODY_SPACING_RESPONSE_MIN_PER_SEC: getConstant("FISH_SOFT_BODY_SPACING_RESPONSE_MIN_PER_SEC"),
    FISH_SOFT_BODY_SPACING_RESPONSE_MAX_PER_SEC: getConstant("FISH_SOFT_BODY_SPACING_RESPONSE_MAX_PER_SEC"),
    FISH_BODY_EXCLUSION_PADDING: getConstant("FISH_BODY_EXCLUSION_PADDING"),
    FISH_BODY_EXCLUSION_FALLBACK_WIDTH_RATIO: getConstant("FISH_BODY_EXCLUSION_FALLBACK_WIDTH_RATIO"),
    FISH_BODY_EXCLUSION_FALLBACK_HEIGHT_RATIO: getConstant("FISH_BODY_EXCLUSION_FALLBACK_HEIGHT_RATIO"),
    FISH_BODY_EXCLUSION_MAX_BIAS_PX: getConstant("FISH_BODY_EXCLUSION_MAX_BIAS_PX"),
    FISH_BODY_EXCLUSION_RESPONSE_MIN_PER_SEC: getConstant("FISH_BODY_EXCLUSION_RESPONSE_MIN_PER_SEC"),
    FISH_BODY_EXCLUSION_RESPONSE_MAX_PER_SEC: getConstant("FISH_BODY_EXCLUSION_RESPONSE_MAX_PER_SEC"),
    FISH_SOFT_BODY_SPACING_RELEASE_PER_SEC: getConstant("FISH_SOFT_BODY_SPACING_RELEASE_PER_SEC"),
    FISH_SOFT_BODY_SPACING_ACTIVE_EPSILON_PX: getConstant("FISH_SOFT_BODY_SPACING_ACTIVE_EPSILON_PX")
  };
  const fish = { id: "a", xNorm: 0.4, yNorm: 0.5, direction: 1, tankId: "tank", tankDepthZ: 0.5 };
  const other = { id: "b", xNorm: 0.445, yNorm: 0.5, direction: -1, tankId: "tank", tankDepthZ: 0.5 };
  const species = { id: "one", width: 100 };
  const otherSpecies = { id: "two", width: 100 };
  const speciesById = new Map([["one", species], ["two", otherSpecies]]);
  fish.speciesId = "one";
  other.speciesId = "two";
  const state = { activeTankId: "tank", fish: [fish, other] };

  const clear = load("clearFishSoftBodySpacing", { runtime });
  const getTankId = load("getFishSoftBodySpacingTankId", { String, state });
  const pairSteer = load("getFishSoftBodySpacingPairSteer", {
    Math, Number, String, clamp, TANK_WIDTH: 1000, TANK_HEIGHT: 600
  });
  const socialPair = load("areFishSoftBodySpacingSocialPair", {
    Number, runtime, Map,
    areFishActiveSchoolmates: overrides.areFishActiveSchoolmates || (() => false)
  });
  const neighbors = () => state.fish.filter(entry => entry.id !== fish.id);
  const bodyExtent = load("getFishSoftBodySpacingBodyExtentPx", {
    Math, Number,
    FISH_BODY_EXCLUSION_FALLBACK_WIDTH_RATIO: constants.FISH_BODY_EXCLUSION_FALLBACK_WIDTH_RATIO,
    FISH_BODY_EXCLUSION_FALLBACK_HEIGHT_RATIO: constants.FISH_BODY_EXCLUSION_FALLBACK_HEIGHT_RATIO,
    getFishBodySizePx: (_entry, spec) => ({
      bodyWidth: Number(spec.width) * 0.62,
      bodyHeight: Number(spec.width) * 0.30
    })
  });
  const getVector = load("getFishSoftBodySpacingVector", {
    Math, Number, String, Map, clamp, runtime, state,
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    ...constants,
    shouldFishParticipateInLivingCollision: entry => Boolean(entry),
    clearFishSoftBodySpacing: clear,
    getFishSoftBodySpacingTankId: getTankId,
    getFishSoftBodySpacingNeighbors: neighbors,
    getSpeciesForFish: entry => speciesById.get(entry.speciesId),
    getFishDisplayWidth: (_entry, spec) => spec.width,
    getFishSoftBodySpacingBodyExtentPx: bodyExtent,
    getFishTankDepthZ: entry => entry.tankDepthZ,
    getFishTankDepthRadius: () => 0.08,
    doTankDepthVolumesOverlap: (a, ar, b, br) => Math.abs(a - b) <= ar + br,
    areFishSoftBodySpacingSocialPair: socialPair,
    getFishSoftBodySpacingPairSteer: pairSteer
  });
  return { runtime, state, fish, other, species, otherSpecies, getVector, pairSteer };
}

test("ordinary nearby fish receive smooth lateral separation instead of a reverse command", () => {
  const h = spacingHarness();
  const result = h.getVector(h.fish, h.species, 1000, 1 / 60, { moveDx: 0.3, moveDy: 0 });
  assert.equal(result.active, true);
  assert.ok(Math.abs(result.yNorm) > 0, "head-on fish choose a passing lane");
  assert.ok(result.xNorm >= -1e-9, "spacing does not command backwards travel");
  const magnitudePx = Math.hypot(result.xNorm * 1000, result.yNorm * 600);
  assert.ok(magnitudePx < getConstant("FISH_SOFT_BODY_SPACING_MAX_BIAS_PX"), "first frame is smoothed rather than shoved at max bias");
});

test("perfectly head-on pair deterministically splits into opposite global vertical lanes", () => {
  const h = spacingHarness();
  const first = h.pairSteer(h.fish, h.other, { x: 1, y: 0 }, 1, 200);
  const second = h.pairSteer(h.other, h.fish, { x: -1, y: 0 }, 1, 200);
  assert.notEqual(Math.sign(first.y), Math.sign(second.y));
});

test("active schoolmates use tighter personal space but keep the same physical exclusion body", () => {
  const h = spacingHarness({ areFishActiveSchoolmates: () => true });
  h.other.xNorm = 0.47;
  const social = h.getVector(h.fish, h.species, 1000, 1 / 60, { moveDx: 0.3, moveDy: 0 });
  assert.equal(social.active, false, "formation spacing remains authoritative outside the physical body zone");
  h.other.xNorm = 0.445;
  const exclusion = h.getVector(h.fish, h.species, 1016, 1 / 60, { moveDx: 0.3, moveDy: 0 });
  assert.equal(exclusion.active, true, "schoolmates still react before their visible bodies merge");
  assert.equal(exclusion.zone, "body");
  assert.ok(exclusion.bodyPressure > 0);
});

test("physical body exclusion responds more strongly than ordinary personal-space yielding", () => {
  const personalHarness = spacingHarness();
  personalHarness.other.xNorm = 0.47;
  const personal = personalHarness.getVector(
    personalHarness.fish,
    personalHarness.species,
    1000,
    0.05,
    { moveDx: 0.3, moveDy: 0 }
  );
  assert.equal(personal.zone, "personal");

  const bodyHarness = spacingHarness();
  bodyHarness.other.xNorm = 0.445;
  const body = bodyHarness.getVector(
    bodyHarness.fish,
    bodyHarness.species,
    1000,
    0.05,
    { moveDx: 0.3, moveDy: 0 }
  );
  assert.equal(body.zone, "body");
  assert.ok(body.bodyPressure > 0);
  assert.ok(
    Math.hypot(body.xNorm * 1000, body.yNorm * 600)
      > Math.hypot(personal.xNorm * 1000, personal.yNorm * 600),
    "body exclusion should produce the stronger steering response"
  );
});

test("fish on non-overlapping depth volumes do not repel", () => {
  const h = spacingHarness();
  h.other.tankDepthZ = 0.9;
  const result = h.getVector(h.fish, h.species, 1000, 1 / 60, { moveDx: 0.3, moveDy: 0 });
  assert.equal(result.active, false);
});

test("spacing decays smoothly after the neighbor leaves", () => {
  const h = spacingHarness();
  for (let i = 0; i < 12; i++) h.getVector(h.fish, h.species, 1000 + i * 16, 0.016, { moveDx: 0.3, moveDy: 0 });
  const before = h.runtime.fishSoftBodySpacingById.get(h.fish.id);
  assert.ok(Math.hypot(before.xPx, before.yPx) > 0);
  h.other.xNorm = 0.8;
  const released = h.getVector(h.fish, h.species, 1300, 0.016, { moveDx: 0.3, moveDy: 0 });
  assert.equal(released.active, true, "the correction eases out instead of disappearing in one frame");
  assert.ok(Math.hypot(released.xNorm * 1000, released.yNorm * 600) < Math.hypot(before.xPx, before.yPx));
});

test("constrained movement owners can disable generic spacing", () => {
  const h = spacingHarness();
  const result = h.getVector(h.fish, h.species, 1000, 1 / 60, { moveDx: 0.3, moveDy: 0, disabled: true });
  assert.equal(result.active, false);
  assert.equal(h.runtime.fishSoftBodySpacingById.has(h.fish.id), false);
});

test("production motion applies spacing before facing and gradual steering decisions", () => {
  const spacingAt = motionSource.indexOf("const softBodySpacing =");
  const directionAt = motionSource.indexOf("const requestedHorizontalDirection =", spacingAt);
  const gradualAt = motionSource.indexOf("const gradualSteering =", spacingAt);
  assert.ok(spacingAt >= 0);
  assert.ok(directionAt > spacingAt);
  assert.ok(gradualAt > directionAt);
  assert.match(motionSource.slice(spacingAt, directionAt), /moveDx \+= Number\(softBodySpacing\.xNorm\)/);
  assert.match(motionSource.slice(spacingAt, directionAt), /emergencyOnly: panicOwnsMovement/);
});

test("hard fish collision fallback damps momentum and does not snap facing", () => {
  const start = collisionSource.indexOf("const retainedMomentum = blocksLayerChange");
  assert.ok(start >= 0);
  const block = collisionSource.slice(start, start + 900);
  assert.match(block, /motionVelocityXNorm.*retainedMomentum/);
  assert.doesNotMatch(block, /setFishDirection\(/);
  assert.doesNotMatch(block, /motionVelocityXNorm\s*=\s*0/);
});
