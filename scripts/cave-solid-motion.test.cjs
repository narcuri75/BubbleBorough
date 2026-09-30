"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../public/app-src/fish/caves-and-collision.js"), "utf8");
const parsed = ts.createSourceFile("caves.js", source, ts.ScriptTarget.Latest, true);
function load(name, stubs) {
  const fn = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
  return vm.runInNewContext(`(${fn.getText(parsed)})`, stubs);
}
function harness(extra = {}) {
  return {
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    getSpeciesForFish: () => ({ behavior: "normal" }),
    getFishTankLayer: () => 2, getFishDisplayWidth: () => 40,
    getCaveCollisionFrameCandidates: () => [{ descriptor: { bounds: {} } }],
    boundsIntersect: () => true,
    getFishCollisionPose: (f, s, now, x, y) => ({ x, y }),
    fishShapeLeavesActiveCaveInterior: () => false,
    findBlockingCaveForFishPose: () => null,
    resolveFishCaveCollisionEndpoint: (f, x, y) => ({ xNorm: x, yNorm: y, blocked: false }),
    ...extra
  };
}
test("interior movement stops before crossing a wall even if endpoint is clear", () => {
  const move = load("resolveFishCaveCollision", harness({
    fishShapeLeavesActiveCaveInterior: (f, s, n, x) => x >= 0.512 && x <= 0.520
  }));
  const f = { caveState: "inside", xNorm: 0.5, yNorm: 0.5 };
  const result = move(f, 0.54, 0.5, 1000);
  assert.equal(result.blocked, true);
  assert.ok(result.xNorm < 0.512);
  assert.equal(f.xNorm, 0.5, "validation never mutates position or depth");
});
test("entering fish have the same solid interior boundary", () => {
  const move = load("resolveFishCaveCollision", harness({ fishShapeLeavesActiveCaveInterior: () => true }));
  const result = move({ caveState: "enter", xNorm: 0.5, yNorm: 0.5 }, 0.51, 0.5, 1000);
  assert.equal(result.xNorm, 0.5);
  assert.equal(result.caveInteriorBlocked, true);
});
test("long frames bound collision work by shortening travel, not skipping walls", () => {
  let checks = 0;
  const move = load("resolveFishCaveCollision", harness({
    fishShapeLeavesActiveCaveInterior: () => { checks++; return false; }
  }));
  const result = move({ caveState: "inside", xNorm: 0.2, yNorm: 0.5 }, 0.9, 0.5, 1000);
  assert.ok(result.xNorm <= 0.24800001);
  assert.equal(checks, 12);
});
test("open water avoids detailed swept cave checks", () => {
  const move = load("resolveFishCaveCollision", harness({
    getCaveCollisionFrameCandidates: () => [],
    getFishCollisionPose: () => { throw Error("unexpected narrow phase"); }
  }));
  assert.equal(move({ xNorm: 0.2, yNorm: 0.5 }, 0.3, 0.5, 1000).xNorm, 0.3);
});
test("exterior fish cannot jump across a thin cave wall", () => {
  const move = load("resolveFishCaveCollision", harness({
    findBlockingCaveForFishPose: (f, s, n, p) => p.x >= 0.512 && p.x <= 0.52 ? { item: {} } : null
  }));
  const result = move({ xNorm: 0.5, yNorm: 0.5 }, 0.54, 0.5, 1000);
  assert.equal(result.blocked, true);
  assert.ok(result.xNorm < 0.512);
});
test("interior validation uses allowed space, not opaque cave background", () => {
  const check = load("fishShapeLeavesActiveCaveInterior", {
    getActiveFishCavePlan: () => ({ decorId: "pot" }), getCaveBehaviorDecorById: () => ({}),
    getFishCollisionPose: () => ({}), getFishShapeDescriptor: () => ({}),
    getCaveInteriorContainmentDescriptor: () => ({}), shapeContainedByMaskStrict: () => true,
    CAVE_STRICT_SAMPLE_STEP_PX: 2
  });
  for (const caveState of ["enter", "inside", "exit", "depart"]) {
    assert.equal(check({ caveState, caveDecorId: "pot", xNorm: 0.5 }, {}, 1000, 0.5, 0.5), false);
  }
});
test("blocked cave recovery retains depth and rate limits route searches", () => {
  let searches = 0;
  const plan = { decorId: "pot", inside: { xNorm: 0.4, yNorm: 0.5 } };
  const recover = load("recoverFishInsideCave", {
    getActiveFishCavePlan: () => plan, getCaveBehaviorDecorById: () => ({}),
    getActiveFishCaveTriggerRegion: () => null,
    buildNormalCaveInsideTravelNodes: () => { searches++; return []; }
  });
  const fish = { caveState: "inside", tankLayer: 3, xNorm: 0.5, yNorm: 0.5 };
  for (let t = 1000; t < 1900; t += 16) recover(fish, {}, t);
  assert.equal(searches, 1);
  assert.equal(fish.tankLayer, 3);
  assert.equal(fish.caveState, "inside");
});

for (const phase of ["align", "exit", "depart"]) {
  test(`${phase} cannot change depth through an obstructed mouth, even after timeout`, () => {
    const mouth = { xNorm: 0.5, yNorm: 0.5 };
    const plan = { decorId: "pot", mouth, inside: mouth, entryPathNodes: [], exitPathNodes: [] };
    const fish = { caveState: phase, caveDecorId: "pot", activity: "roam", xNorm: 0.506,
      yNorm: 0.5, targetXNorm: 0.5, targetYNorm: 0.5, targetAt: 1 };
    const update = load("updateFishCaveBehavior", {
      getActiveFishCavePlan: () => plan, getCaveBehaviorDecorById: () => ({}),
      getActiveFishCaveTriggerRegion: () => mouth, getActiveFishCaveSeatRegion: () => null,
      isFishWithinRegionBounds: () => true, portalOpeningFitsFish: () => false,
      isFishCaveEntranceBusy: () => false,
      getFishActiveCaveInsideLayer: () => 3, clampTankLayer: x => x,
      setFishTankLayers: () => {}, setFishTankSublayers: () => {},
      DEFAULT_TANK_LAYER: 2, TANK_DEPTH_LAYERS: 5, TANK_SUBLAYER_FRONT: 2, TANK_SUBLAYER_MIDDLE: 1,
      CAVE_GENERAL_REACHED_DISTANCE_NORM: 0.018, CAVE_MOUTH_REACHED_DISTANCE_NORM: 0.014,
      CAVE_TRIGGER_STALL_FORCE_MS: 100, CAVE_TRIGGER_STALL_FORCE_DISTANCE_NORM: 0.1
    });
    update(fish, { behavior: "normal" }, 10000);
    assert.equal(fish.caveState, phase);
    assert.equal(fish.xNorm, 0.506, "no mouth teleport");
    assert.equal(fish.targetXNorm, 0.5, "continues to seek the opening");
  });
}

test("repeated cancellation requests preserve progress along the physical exit", () => {
  const plan = { decorId: "pot", mouth: { xNorm: 0.5, yNorm: 0.5 }, exitRequested: true };
  const abort = load("abortFishCaveBehavior", {
    getActiveFishCavePlan: () => plan, getCaveBehaviorDecorById: () => ({}),
    getSpeciesForFish: () => ({}), portalOpeningFitsFish: () => false
  });
  const fish = { caveState: "exit", cavePathIndex: 2, tankLayer: 3 };
  abort(fish, 1000);
  assert.equal(fish.cavePathIndex, 2);
  assert.equal(fish.tankLayer, 3);
});

test("a real opening admits fish, while solid rim and transparent space above roof do not", () => {
  const nav = ts.createSourceFile("nav.js", fs.readFileSync(path.join(__dirname,
    "../public/app-src/fish/cave-navigation.js"), "utf8"), ts.ScriptTarget.Latest, true);
  const fn = nav.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === "portalOpeningFitsFish");
  let contained = true, blocked = false;
  const fits = vm.runInNewContext(`(${fn.getText(nav)})`, {
    getFishCollisionPose: () => ({}), getFishShapeDescriptor: () => ({}),
    getCaveInteriorContainmentDescriptor: () => ({}), getCaveFrontDescriptor: () => ({}),
    shapeContainedByMaskStrict: () => contained, shapesOverlapByMaskStrict: () => blocked,
    CAVE_STRICT_SAMPLE_STEP_PX: 2
  });
  assert.equal(fits({}, {}, {}, 1000, {}), true);
  blocked = true;
  assert.equal(fits({}, {}, {}, 1000, {}), false);
  blocked = false; contained = false;
  assert.equal(fits({}, {}, {}, 1000, {}), false);
});

test("cached ordinary draw passes cannot draw an interior fish a second time", () => {
  const render = fs.readFileSync(path.join(__dirname, "../public/app-src/rendering/fish-and-effects.js"), "utf8");
  const begin = render.indexOf("function drawFish(");
  const end = render.indexOf("    const prepared = record.render;", begin);
  const seen = [];
  const record = { fish: { id: "inside" }, effectiveBehavior: "normal", caveInteriorFish: true };
  const draw = vm.runInNewContext(`(${render.slice(begin, end)}seen.push(fish.id);\n}\n})`, {
    seen, state: { fish: [record.fish] }, runtime: { debugFrameProfilerEnabled: false },
    clampTankLayer: x => x, clampTankSubLayer: x => x,
    prepareFishRenderFrameCache: () => ({ buckets: [[], [record]],
      passBuckets: [null, { nonSuckerBySubLayer: [[record], [], []] }] })
  });
  draw(1000, 1, { excludeBehavior: "sucker", subLayer: 0, excludeCaveInterior: true });
  draw(1000, 1, { excludeBehavior: "sucker", caveInteriorOnly: true });
  assert.deepEqual(seen, ["inside"]);
});

test("legacy cave occupants render in their cave's sandwich, not behind its background", () => {
  const render = ts.createSourceFile("render.js", fs.readFileSync(path.join(__dirname,
    "../public/app-src/rendering/fish-and-effects.js"), "utf8"), ts.ScriptTarget.Latest, true);
  const fn = render.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === "getFishRenderPassLayer");
  const layer = vm.runInNewContext(`(${fn.getText(render)})`, {
    isFishInCaveRenderSublayer: f => f.caveState === "inside",
    getCaveBehaviorDecorById: () => ({ decorKey: "pot" }),
    getDecorTankLayer: () => 2, getDecorLayerSpan: () => ({ front: 2, back: 3 }),
    getFishTankLayer: () => 3, clampTankLayer: x => x
  });
  assert.equal(layer({ caveState: "inside" }), 2);
  assert.equal(layer({ caveState: "roam" }), 3);
});

test("entrance yields to nearby occupants and has deterministic arrival priority", () => {
  const fish = { id: "a", caveDecorId: "pot", caveState: "align", xNorm: 0.5, yNorm: 0.5 };
  const other = { ...fish, id: "b" };
  const busy = load("isFishCaveEntranceBusy", {
    state: { fish: [fish, other] }, TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    getFishDisplayWidth: () => 40, getSpeciesForFish: () => ({}), isFishDead: () => false
  });
  const mouth = { xNorm: 0.5, yNorm: 0.5 };
  assert.equal(busy(fish, "pot", mouth, {}, 1000), false);
  assert.equal(busy(other, "pot", mouth, {}, 1000), true);
  other.caveState = "exit";
  assert.equal(busy(fish, "pot", mouth, {}, 1000), true);
  other.xNorm = 0.8;
  assert.equal(busy(fish, "pot", mouth, {}, 1000), false);
});

test("repeated blocked seat routes release the seat and seek an exit", () => {
  const plan = { decorId: "pot", seatId: "seat", normalSeatPoint: { xNorm: 0.4, yNorm: 0.5 },
    mouth: { xNorm: 0.6, yNorm: 0.5 } };
  const recover = load("recoverFishInsideCave", {
    getActiveFishCavePlan: () => plan, getCaveBehaviorDecorById: () => ({}),
    getActiveFishCaveTriggerRegion: () => null, buildNormalCaveInsideTravelNodes: () => []
  });
  const fish = { caveState: "inside", xNorm: 0.5, yNorm: 0.5, caveSeatId: "seat" };
  recover(fish, {}, 1000); recover(fish, {}, 2000);
  assert.equal(fish.caveState, "exit");
  assert.equal(plan.exitRequested, true);
  assert.equal(plan.seatId, null);
});
