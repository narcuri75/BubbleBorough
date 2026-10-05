"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
function load(c, file, names) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  for (const name of names) {
    const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(node, name);
    vm.runInContext(node.getText(source), c);
  }
}
function context(stubs = {}) {
  return vm.createContext({ Math, Number, WeakMap,
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)), ...stubs });
}

test("a delayed browser frame cannot launch a fish ahead of its visible turn", () => {
  const c = context({ runtime: {}, FISH_TURN_LOCOMOTION_RELEASE_PROGRESS: 0.45,
    FISH_TURN_TRAVERSAL_ARC_APEX_PROGRESS: 0.5,
    FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE: 0.12, FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE: 0.4,
    FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE: 0.18 });
  load(c, "rendering/fish-motion-and-floor.js", ["normalizeFishHorizontalDirection", "getFishFacingDirection",
    "getFishLogicalDirection", "getFishHorizontalTurnState", "getFishRenderedHorizontalTurnState", "getFishTurnLocomotionState"]);
  load(c, "fish/predators-and-motion.js", ["getFishTurnReversalTraversal"]);
  for (const from of [-1, 1]) {
    const fish = { displayDirection: from, direction: -from, turnFromDirection: from, turnToDirection: -from,
      turnStartedAt: 1000, turnDurationMs: 1000, turnRendererBackend: "v26", swimSpeed: 0.04 };
    const visual = c.getFishRenderedHorizontalTurnState(fish, 2000);
    const locomotion = c.getFishTurnLocomotionState(fish, 2000);
    const route = c.getFishTurnReversalTraversal(fish, -from * 0.2, 0.05, 2000);
    assert.equal(visual.progress, 0.05);
    assert.equal(locomotion.progress, visual.progress);
    assert.equal(route.progress, visual.progress);
    assert.equal(Math.sign(route.xNorm), from, "still drifting on the source side");
    for (let now = 2050; now <= 2950; now += 50) {
      const rendered = c.getFishRenderedHorizontalTurnState(fish, now);
      const traversal = c.getFishTurnReversalTraversal(fish, -from * 0.2, 0.05, now);
      assert.equal(traversal.progress, rendered.progress);
    }
    assert.equal(c.getFishTurnReversalTraversal(fish, -from * 0.2, 0.05, 2950).travelDirection, -from);
  }
});

test("normal steering continues from the completed reversal heading", () => {
  const c = context({ TANK_WIDTH: 1500, TANK_HEIGHT: 1000, FISH_VERTICAL_TRAVERSAL_MAX_RATIO: 1,
    getFishLocomotionProfile: () => ({}), getFishSteeringHorizontalDirection: (_, dx) => Math.sign(dx),
    getFishFacingDirection: f => f.displayDirection });
  load(c, "rendering/fish-motion-and-floor.js", ["getFishGradualSteeringVector"]);
  for (const to of [-1, 1]) {
    const fish = { displayDirection: to, steeringHeadingXScreen: -to, steeringHeadingYScreen: 0 };
    c.getFishGradualSteeringVector(fish, to * 0.08, 0.02, 1 / 30, { turnReversal: true });
    const next = c.getFishGradualSteeringVector(fish, to * 0.08, 0.02, 1 / 30);
    assert.equal(Math.sign(next.xNorm), to, "no extra swing from the obsolete source heading");
    assert.ok(Math.abs(next.yNorm - 0.02) < 1e-6);
  }
});

test("a diagonal reversal starts with its incoming course rather than the new target's vertical direction", () => {
  let progress = 0;
  const c = context({ getFishRenderedHorizontalTurnState: () => ({ progress }),
    FISH_TURN_TRAVERSAL_ARC_APEX_PROGRESS: 0.5,
    FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE: 0.12, FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE: 0.4,
    FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE: 0.18 });
  load(c, "fish/predators-and-motion.js", ["getFishTurnReversalTraversal"]);
  for (const from of [-1, 1]) for (const vertical of [-1, 1]) {
    progress = 0;
    const fish = { turnStartedAt: 1000, turnDurationMs: 1000, turnFromDirection: from,
      turnToDirection: -from, traversalVelocityXNorm: from * 0.03,
      traversalVelocityYNorm: vertical * 0.015, traversalSpeedNorm: 0.04, swimSpeed: 0.04 };
    const start = c.getFishTurnReversalTraversal(fish, -from * 0.2, -vertical * 0.08, 1000);
    assert.equal(Math.sign(start.yNorm), vertical, "the new target cannot instantly reverse vertical travel");
    assert.ok(Math.abs(start.yNorm / Math.abs(start.xNorm) - vertical * 0.5) < 1e-9, "entry retains the incoming slope");
    progress = 0.05;
    const early = c.getFishTurnReversalTraversal(fish, -from * 0.2, -vertical * 0.08, 1050);
    assert.equal(Math.sign(early.yNorm), vertical);
    progress = 1;
    const end = c.getFishTurnReversalTraversal(fish, -from * 0.2, -vertical * 0.08, 2000);
    assert.equal(Math.sign(end.xNorm), -from);
    assert.equal(Math.sign(end.yNorm), -vertical, "the turn eventually reaches the requested course");
  }
});

test("ordinary steering cannot cross the facing side without an animated reversal", () => {
  const c = context({ TANK_WIDTH: 1500, TANK_HEIGHT: 1000, FISH_VERTICAL_TRAVERSAL_MAX_RATIO: 1,
    getFishLocomotionProfile: () => ({}), getFishSteeringHorizontalDirection: (_, dx) => Math.sign(dx),
    getFishFacingDirection: f => f.displayDirection });
  load(c, "rendering/fish-motion-and-floor.js", ["getFishGradualSteeringVector"]);
  for (const side of [-1, 1]) {
    const fish = { displayDirection: side, steeringHeadingXScreen: side, steeringHeadingYScreen: 0 };
    for (let frame = 0; frame < 120; frame++) {
      const vector = c.getFishGradualSteeringVector(fish, -side * 0.004, -0.1, 1 / 30);
      assert.ok(vector.xNorm * side >= -1e-9, "a small opposite target must not make the fish swim backward");
    }
    const turn = c.getFishGradualSteeringVector(fish, -side * 0.08, -0.02, 1 / 30, { turnReversal: true });
    assert.equal(Math.sign(turn.xNorm), -side, "the reversal controller retains ownership of its animated crossing");
  }
});

test("hovering and decor hangouts remain endpoints instead of cruise chains", () => {
  const c = context({ getFishTraversalCruiseProfile: () => ({ enabled: true, waypointScale: 1 }),
    getFishLocomotionProfile: () => ({}), clearFishCruiseWaypoint: f => { f.traversalCruiseUntil = 0; },
    FISH_CRUISE_WAYPOINT_REACH_NORM: 0.025, FISH_CRUISE_WAYPOINT_MIN_DISTANCE_NORM: 0.12,
    FISH_CRUISE_WAYPOINT_EXTENSION_NORM: 0.08, FISH_CRUISE_WAYPOINT_MS: 2000 });
  load(c, "fish/predators-and-motion.js", ["getFishCruiseContinuationWaypoint"]);
  for (const mode of [{ hangoutDecorId: "arch" }, { hangoutZoneType: "hover" }]) {
    const fish = { xNorm: 0.5, yNorm: 0.5, targetAt: 5000, direction: 1, traversalCruiseUntil: 5000, ...mode };
    assert.equal(c.getFishCruiseContinuationWaypoint(fish, {}, 0.501, 0.5, 2000), null);
    assert.equal(fish.traversalCruiseUntil, 0);
  }
  const cruising = { xNorm: 0.5, yNorm: 0.5, direction: 1 };
  assert.ok(c.getFishCruiseContinuationWaypoint(cruising, {}, 0.501, 0.5, 2000).xNorm > 0.6);
});

test("resting clears swim telemetry and dissipates the old launch velocity without moving the fish", () => {
  const c = context({ FISH_TRAVERSAL_HEADING_MIN_SPEED_NORM: 0.0025, FISH_TRAVERSAL_MAX_VELOCITY_NORM: 0.42,
    FISH_PASSIVE_ARRIVAL_EPSILON_NORM: 0.0012, FISH_PASSIVE_VELOCITY_RESPONSE_PER_SEC: 2.65,
    FISH_PASSIVE_BRAKE_DISTANCE_NORM: 0.12, FISH_LOCOMOTION_SPEED_BIAS_MIN: 0.94,
    FISH_LOCOMOTION_SPEED_BIAS_MAX: 1.06 });
  load(c, "fish/predators-and-motion.js", ["integrateFishPassiveMotion", "syncFishTraversalStateFromMove", "settleFishIdleMotion"]);
  const fish = { xNorm: 0.5, yNorm: 0.4, targetXNorm: 0.5, targetYNorm: 0.4,
    motionVelocityXNorm: -0.04, motionVelocityYNorm: 0.02, traversalVelocityXNorm: -0.04,
    traversalVelocityYNorm: 0.02, traversalSpeedNorm: 0.05, traversalHeadingXNorm: -0.8, traversalHeadingYNorm: 0.4 };
  for (let frame = 0; frame < 60; frame++) c.settleFishIdleMotion(fish, 1000 + frame * 1000 / 30, 1 / 30);
  assert.equal(fish.traversalSpeedNorm, 0);
  assert.equal(fish.traversalState, "idle");
  assert.equal(fish.motionVelocityXNorm, 0);
  assert.equal(fish.motionVelocityYNorm, 0);
  assert.equal(fish.xNorm, 0.5);
  assert.equal(fish.yNorm, 0.4);
  assert.equal(fish.traversalHeadingXNorm, -0.8, "resting does not invent a new direction");
});

test("the FPS limiter discards missed render slots after a stall", () => {
  const c = context({ window: { requestAnimationFrame() {} }, document: { hidden: false },
    runtime: { lastAnimationFrameAt: 1000, lastAnimationUpdateAt: 1000, wallpaperEngineFpsCarrySeconds: 0,
      boroughOverviewOpen: true }, isWallpaperEnginePauseActive: () => false,
    getEffectiveAnimationFpsLimit: () => 30, advanceDebugSimulationClock: n => n,
    beginDebugFrameProfile() {}, finishDebugFrameProfile() {}, updateAmbienceAudioLoop() {}, renderBoroughOverviewFish() {} });
  load(c, "ui/scene-controls-and-animation.js", ["animationLoop"]);
  c.animationLoop(2000);
  assert.ok(c.runtime.wallpaperEngineFpsCarrySeconds < 1 / 30, "no render backlog");
  c.animationLoop(2016);
  assert.equal(c.runtime.lastAnimationUpdateAt, 2000, "no unnecessary frame before the next render slot");
});
