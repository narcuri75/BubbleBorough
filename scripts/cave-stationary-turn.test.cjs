"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const read = file => fs.readFileSync(path.join(__dirname, "../game/public/app-src", file), "utf8");
function declarations(file, names) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  return names.map(name => parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name).getText(parsed)).join("\n");
}
function setup() {
  const plan = { inside: { xNorm: 0.4, yNorm: 0.5 }, approach: { xNorm: 0.4, yNorm: 0.5 } };
  let starts = 0;
  const c = vm.createContext({
    TANK_WIDTH: 1000, FISH_DIRECTION_TARGET_DEADZONE_NORM: 0.001,
    FISH_TRAVERSAL_HEADING_MIN_SPEED_NORM: 0.001,
    FISH_TRAVERSAL_TURN_COMMIT_MIN_MS: 360, FISH_TRAVERSAL_POST_TURN_COMMIT_MIN_MS: 650,
    clamp: (v, lo, hi) => Math.max(lo, Math.min(v, hi)),
    getActiveFishCavePlan: () => plan, getFishDisplayWidth: () => 70,
    getSpeciesForFish: () => ({ id: "guppy" }), getEffectiveFishBehavior: () => "swim",
    getFishTurnAnimationMode: () => "v26", beginFishTurnRendererSession: () => { starts++; return "v26"; },
    getFishTurnDurationMs: () => 650, getFishTurnaroundCooldownState: () => ({ active: false }),
    clearFishTurnRendererSession: () => {}
  });
  vm.runInContext(declarations("rendering/fish-motion-and-floor.js", [
    "normalizeFishHorizontalDirection", "getFishFacingDirection", "getFishLogicalDirection",
    "getFishHorizontalTurnState", "setFishDirection"
  ]) + declarations("fish/caves-and-collision.js", [
    "getFishCavePortalDesiredDirection", "prepareFishCavePortalFacing", "applyFishCavePortalFacingHold"
  ]), c);
  const fish = { id: "fish", activity: "roam", caveState: "align", xNorm: 0.5, yNorm: 0.5,
    targetXNorm: 0.5, targetYNorm: 0.5, displayDirection: 1, direction: 1, traversalSpeedNorm: 0 };
  return { c, plan, fish, starts: () => starts };
}

for (const [state, mode] of [["align", "enter"], ["exit", "exit"], ["depart", "exit"]]) {
  test(`${state}: a stopped fish turns once, holds position, and releases only after facing completes`, () => {
    const { c, plan, fish, starts } = setup();
    fish.caveState = state;
    assert.equal(c.prepareFishCavePortalFacing(fish, { id: "guppy" }, plan, mode, 1000), false);
    assert.equal(starts(), 1);
    assert.equal(fish.turnToDirection, -1);
    for (const now of [1100, 1400, 2000]) {
      fish.motionVelocityXNorm = 0.04;
      fish.traversalVelocityYNorm = 0.02;
      fish.targetXNorm = 0.8;
      assert.equal(c.prepareFishCavePortalFacing(fish, { id: "guppy" }, plan, mode, now), false);
      assert.equal(c.applyFishCavePortalFacingHold(fish), true);
      assert.equal(fish.targetXNorm, 0.5);
      assert.equal(fish.motionVelocityXNorm, 0);
      assert.equal(fish.traversalVelocityYNorm, 0);
      assert.equal(fish.xNorm, 0.5);
      assert.equal(starts(), 1);
    }
    // Renderer handoff, not elapsed time alone, completes a horizontal turn.
    fish.displayDirection = -1;
    fish.turnStartedAt = null;
    fish.turnDurationMs = 0;
    assert.equal(c.prepareFishCavePortalFacing(fish, { id: "guppy" }, plan, mode, 2100), true);
    assert.equal(plan.portalFacingHold, null);
    assert.equal(c.applyFishCavePortalFacingHold(fish), false);
  });
}

test("correct-facing fish retains approach momentum; ordinary idle reversals remain blocked", () => {
  const { c, plan, fish, starts } = setup();
  fish.displayDirection = -1;
  fish.motionVelocityXNorm = -0.02;
  assert.equal(c.prepareFishCavePortalFacing(fish, { id: "guppy" }, plan, "enter", 1000), true);
  assert.equal(fish.motionVelocityXNorm, -0.02);
  c.setFishDirection(fish, 1, { id: "guppy" }, 1000);
  assert.equal(starts(), 0);
});

test("stationary-turn permission does not bypass crossing direction locks", () => {
  const { c, fish, starts } = setup();
  fish.caveState = "portal-enter";
  c.setFishDirection(fish, -1, { id: "guppy" }, 1000, { allowStationaryTurn: true, bypassTurnCommitment: true });
  assert.equal(starts(), 0);
  assert.equal(fish.direction, 1);
});

test("a hold expires when another activity or cave state takes ownership", () => {
  for (const change of [{ activity: "feeding" }, { caveState: "portal-exit" }, { caveState: null }]) {
    const { c, fish, plan } = setup();
    plan.portalFacingHold = { xNorm: 0.5, yNorm: 0.5 };
    Object.assign(fish, change);
    assert.equal(c.applyFishCavePortalFacingHold(fish), false);
    assert.equal(plan.portalFacingHold, null);
  }
});

test("the motion update applies the hold after steering and before calculating travel distance", () => {
  const source = read("fish/predators-and-motion.js");
  const begin = source.indexOf("const cavePortalFacingHoldsPosition =");
  const end = source.indexOf("const isDirectedSwim", begin);
  assert.ok(begin > source.indexOf("} else if (turnReversalTraversal)"));
  const { c, fish, plan } = setup();
  plan.portalFacingHold = { xNorm: 0.5, yNorm: 0.5 };
  Object.assign(c, { fish, moveDx: 0.018, moveDy: 0.01, handledDirectionThisFrame: false });
  vm.runInContext(source.slice(begin, end) + "this.distance = moveDistance;", c);
  assert.equal(c.distance, 0);
  assert.equal(c.handledDirectionThisFrame, true);
});
