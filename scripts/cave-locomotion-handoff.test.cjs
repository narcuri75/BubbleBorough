"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..", "game");
const caveSource = fs.readFileSync(path.join(ROOT, "public/app-src/fish/caves-and-collision.js"), "utf8");
const motionSource = fs.readFileSync(path.join(ROOT, "public/app-src/fish/predators-and-motion.js"), "utf8");
const parsed = ts.createSourceFile("caves.js", caveSource, ts.ScriptTarget.Latest, true);

function load(name, stubs = {}) {
  const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `${name} should exist`);
  return vm.runInNewContext(`(${fn.getText(parsed)})`, stubs);
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

test("cave takeover preserves velocity and seeds steering ahead of current motion", () => {
  const getHeading = load("getFishCaveMotionHeading", { Math, Number });
  const initialize = load("initializeFishCaveLocomotionHandoff", {
    Math, Number, clamp, getFishCaveMotionHeading: getHeading
  });
  const fish = {
    xNorm: 0.4, yNorm: 0.5, direction: 1,
    motionVelocityXNorm: 0.05, motionVelocityYNorm: -0.01
  };
  const plan = {};
  initialize(fish, plan, 1000);
  assert.equal(fish.motionVelocityXNorm, 0.05);
  assert.equal(fish.motionVelocityYNorm, -0.01);
  assert.equal(plan.entryMotionVelocityXNorm, 0.05);
  assert.equal(plan.entryMotionVelocityYNorm, -0.01);
  assert.ok(plan.caveSteeringTargetXNorm > fish.xNorm);
  assert.ok(plan.caveSteeringTargetYNorm < fish.yNorm);
});

test("cave waypoint changes become steering goals instead of instantaneous target snaps", () => {
  const plan = { caveSteeringTargetXNorm: 0.4, caveSteeringTargetYNorm: 0.5 };
  const getSteering = load("getFishCaveSteeringTarget", {
    Math, Number, clamp,
    getActiveFishCavePlan: () => plan
  });
  const fish = {
    caveState: "enter", xNorm: 0.4, yNorm: 0.5,
    targetXNorm: 0.8, targetYNorm: 0.3
  };
  const first = getSteering(fish, 1 / 60);
  assert.ok(first.xNorm > 0.4 && first.xNorm < 0.8);
  assert.ok(first.yNorm < 0.5 && first.yNorm > 0.3);
  assert.ok(Math.hypot(first.xNorm - 0.4, first.yNorm - 0.5) < Math.hypot(0.8 - 0.4, 0.3 - 0.5));
});

test("moving fish can roll through intermediate cave nodes without pinning to each coordinate", () => {
  const reach = load("getFishCaveWaypointReachDistanceNorm", {
    Math, Number, clamp, CAVE_GENERAL_REACHED_DISTANCE_NORM: 0.018
  });
  const fish = { motionVelocityXNorm: 0.06, motionVelocityYNorm: 0 };
  assert.ok(reach(fish, false) > 0.018);
  assert.ok(reach(fish, false) <= 0.032);
  assert.equal(reach(fish, true), 0.018);
});

test("cave locomotion coasts through routes and brakes more firmly only for seats", () => {
  let plan = { normalInsideMode: "roam" };
  const tuning = load("getFishCaveLocomotionTuning", {
    String, getActiveFishCavePlan: () => plan
  });
  const transit = tuning({ caveState: "enter" });
  assert.ok(transit.decelerationScale < 1);
  assert.ok(transit.accelerationScale >= 1);
  plan = { normalInsideMode: "seat-hold" };
  const seat = tuning({ caveState: "inside" });
  assert.ok(seat.decelerationScale > 1);
  assert.ok(seat.accelerationScale < transit.accelerationScale);
});

test("blocked cave recovery sheds momentum rather than erasing it", () => {
  const plan = {
    decorId: "pot", inside: { xNorm: 0.5, yNorm: 0.5 },
    collisionRetryAt: 0
  };
  const recover = load("recoverFishInsideCave", {
    Math, Number,
    getActiveFishCavePlan: () => plan,
    getCaveBehaviorDecorById: () => ({}),
    getActiveFishCaveTriggerRegion: () => null,
    setFishTargetToCaveNode: () => true,
    buildNormalCaveInsideTravelNodes: () => []
  });
  const fish = {
    caveState: "inside", xNorm: 0.5, yNorm: 0.5,
    motionVelocityXNorm: 0.04, motionVelocityYNorm: 0.02
  };
  recover(fish, {}, 1000);
  assert.ok(fish.motionVelocityXNorm > 0 && fish.motionVelocityXNorm < 0.04);
  assert.ok(fish.motionVelocityYNorm > 0 && fish.motionVelocityYNorm < 0.02);
});

test("seat facing waits until the fish has physically settled", () => {
  const isSettled = load("isFishSettledAtCaveSeat", {
    Math, Number, CAVE_NORMAL_SEAT_SETTLE_DISTANCE_NORM: 0.008
  });
  let turns = 0;
  const apply = load("applyFishCaveSeatFacingWhenSettled", {
    Number,
    isFishSettledAtCaveSeat: isSettled,
    setFishDirection: () => { turns++; },
    normalizeCaveSeatFacing: direction => direction < 0 ? -1 : 1,
    applyFishCaveSeatFacingById: () => { turns++; }
  });
  const plan = {
    normalSeatPoint: { xNorm: 0.5, yNorm: 0.5 },
    normalSeatDirection: -1,
    normalSeatFacingApplied: false
  };
  const fish = {
    xNorm: 0.5, yNorm: 0.5, swimSpeed: 0.03,
    motionVelocityXNorm: 0.03, motionVelocityYNorm: 0
  };
  assert.equal(apply(fish, {}, {}, plan, 1000), false);
  assert.equal(turns, 0);
  fish.motionVelocityXNorm = 0.001;
  assert.equal(apply(fish, {}, {}, plan, 1016), true);
  assert.equal(turns, 1);
  assert.equal(plan.normalSeatFacingApplied, true);
});

test("cave exit hands the fish back to roaming with outbound momentum and turn commitment", () => {
  const getHeading = load("getFishCaveMotionHeading", { Math, Number });
  let cooldownDirection = 0;
  const release = load("releaseFishFromCaveWithMomentum", {
    Math, Number, clamp,
    TANK_WIDTH: 1000,
    DEFAULT_TANK_LAYER: 2,
    getFishCaveMotionHeading: getHeading,
    getFishVisualSize: () => 60,
    clampTankLayer: value => value,
    abortFishCaveBehavior: fish => { fish.caveState = null; fish.caveDecorId = null; },
    setFishTankLayers: (fish, layer) => { fish.tankLayer = layer; },
    setFishDesiredTankLayer: () => {},
    getFishFacingDirection: fish => fish.direction || 1,
    beginFishTurnaroundCooldown: (_fish, direction) => { cooldownDirection = direction; }
  });
  const fish = {
    caveState: "leave", caveDecorId: "pot", caveFrontLayer: 2,
    xNorm: 0.52, yNorm: 0.5, direction: 1,
    motionVelocityXNorm: 0.05, motionVelocityYNorm: 0.005
  };
  const plan = {
    frontLayer: 2,
    mouth: { xNorm: 0.5, yNorm: 0.5 },
    approach: { xNorm: 0.7, yNorm: 0.5 }
  };
  release(fish, {}, plan, 2000);
  assert.equal(fish.caveState, null);
  assert.equal(fish.motionVelocityXNorm, 0.05);
  assert.equal(fish.motionVelocityYNorm, 0.005);
  assert.ok(fish.targetXNorm > fish.xNorm);
  assert.ok(fish.targetAt > 2000);
  assert.equal(cooldownDirection, 1);
});

test("shared locomotion applies cave steering and cave-specific acceleration tuning", () => {
  assert.match(motionSource, /fish\.caveState && typeof getFishCaveSteeringTarget === "function"/);
  assert.match(motionSource, /const caveLocomotionTuning = fish\.caveState/);
  assert.match(motionSource, /arrivalDistanceNorm: caveLocomotionTuning\?\.arrivalDistanceNorm/);
  const urgentStart = motionSource.indexOf("const traversalTargetUrgent =");
  const urgentEnd = motionSource.indexOf("const traversalTarget =", urgentStart);
  const urgentBlock = motionSource.slice(urgentStart, urgentEnd);
  assert.doesNotMatch(urgentBlock, /fish\.caveState/);
});

test("normal cave exit uses the momentum-preserving release handoff", () => {
  const leaveStart = caveSource.lastIndexOf('if (fish.caveState === "leave")');
  assert.ok(leaveStart >= 0);
  const leaveBlock = caveSource.slice(leaveStart, leaveStart + 2200);
  assert.match(leaveBlock, /releaseFishFromCaveWithMomentum\(fish, species, plan, now\)/);
  assert.doesNotMatch(leaveBlock, /fish\.targetAt\s*=\s*now\s*;/);
});
