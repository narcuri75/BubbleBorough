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
