"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
function load(file, name, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const fn = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  return vm.runInNewContext(`(${fn.getText(source)})`, context);
}
function scene(items, records) {
  const painted = [];
  const context = {
    Map, isCaveDecorKey: key => key === "cave",
    prepareFishRenderFrameCache: () => ({ buckets: [[], [], [], records] }),
    getDecorRenderDepthZ: item => item.z,
    comparePlacedDecorDrawOrder: () => 0, compareFishRenderRecords: () => 0,
    drawDecor: (l, n, o) => painted.push(`${o.items[0].id}:${o.pass}`),
    drawFish: (n, l, o) => { for (const r of o.records) {
      if (o.cavePortalExteriorOverlayOnly && r.fish.caveState !== "portal-enter") continue;
      painted.push(`${r.fish.id}${o.cavePortalExteriorOverlayOnly ? ':exterior' : ''}`);
    } }
  };
  const draw = load("rendering/tank-and-water.js", "drawCaveLayerScene", context);
  draw(1000, 3, { layers: [[], [], [], items] });
  return painted;
}
const cave = (id, z) => ({ id, decorKey: "cave", z });
const fish = (id, z, extra = {}) => ({ fish: { id, ...extra }, depthZ: z, effectiveBehavior: "normal", caveInteriorFish: Boolean(extra.caveDecorId) });

test("front fish remains above the cave on both sides of a rounded sublayer boundary", () => {
  for (const z of [0.501, 0.531, 0.533, 0.54]) {
    assert.deepEqual(scene([cave("pot", 0.5)], [fish("pink", z)]),
      ["pot:cave-back", "pot:cave-front", "pink"]);
  }
  assert.deepEqual(scene([cave("pot", 0.5)], [fish("rear", 0.499)]),
    ["rear", "pot:cave-back", "pot:cave-front"]);
});
test("each cave owns only its own occupants and completes its shell once", () => {
  assert.deepEqual(scene([cave("rear-pot", 0.48), cave("front-pot", 0.55)], [
    fish("rear-occupant", 0.48, { caveDecorId: "rear-pot", caveState: "inside" }),
    fish("front-occupant", 0.55, { caveDecorId: "front-pot", caveState: "portal-enter" }),
    fish("free", 0.52)
  ]), ["rear-pot:cave-back", "rear-occupant", "rear-pot:cave-front", "free",
    "front-pot:cave-back", "front-occupant", "front-pot:cave-front", "front-occupant:exterior"]);
});
test("a front plant can occlude a front fish while a deeper plant cannot", () => {
  assert.deepEqual(scene([cave("pot", 0.5), { id: "plant", decorKey: "plant", z: 0.57 }],
    [fish("free", 0.54)]), ["pot:cave-back", "pot:cave-front", "free", "plant:base"]);
});
test("cave approach, align, and leave cannot ease depth through opaque shell", () => {
  let clear = false;
  const probes = [];
  const context = {
    runtime: { fishLayerTravelStepTransitions: new Map() },
    isFishDead: () => false, getEffectiveFishBehavior: () => "normal",
    clampTankLayer: x => x, DEFAULT_TANK_LAYER: 3,
    setFishTankLayers: () => {}, getFishActiveCaveInsideLayer: () => 3,
    getFishCaveDepthRegion: () => 0.7,
    sanitizeTankDepthZ: z => z, getTankDepthZFromLegacyPosition: () => 0.5,
    getFishTankLayer: () => 3, getFishTankSubLayer: () => 1,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    getFishContinuousDepthCollisionPose: () => ({ facingScaleX: 1 }),
    canFishOccupyContinuousDepth: (f, s, n, p, z, from) => { probes.push([from, z]); return clear; }
  };
  const sync = load("fish/caves-and-collision.js", "syncFishDrawLayer", context);
  for (const caveState of ["approach", "align", "leave"]) {
    const f = { z: 0.51, caveState, caveDepthUpdatedAt: 1000 };
    sync(f, {}, 1120);
    assert.equal(f.z, 0.51);
    assert.equal(f.depthMotionBlockedAt, 1120);
    clear = true; sync(f, {}, 1240); clear = false;
    assert.ok(f.z > 0.51 && f.z <= 0.534001, "clear travel remains gradual");
  }
  assert.equal(probes.length, 6);
  assert.ok(probes.every(([from, to]) => from === 0.51 && to > from), "every probe includes the source depth");
});
test("turning edge-on does not shrink the depth collision silhouette", () => {
  const pose = load("fish/caves-and-collision.js", "getFishContinuousDepthCollisionPose", {
    getFishCollisionPose: () => ({ facingScaleX: -1, bodyScaleX: 0.03, bodyScaleY: 1, tilt: 0.4 })
  })({ direction: -1 }, {}, 1000);
  assert.equal(pose.bodyScaleX, 1);
  assert.equal(pose.facingScaleX, -1);
  assert.equal(pose.tilt, 0.4);
});
test("cave depth anchors follow the placed artwork and scaled collision clearance", () => {
  const regions = load("fish/caves-and-collision.js", "getCaveDepthRegions", {
    clampTankLayer: x => x, DEFAULT_TANK_LAYER: 3, TANK_SUBLAYER_MIDDLE: 2,
    getPlacedDecorDepthZ: d => d.z, getPlacedDecorDepthRadius: () => 0.088,
    getFishTankDepthRadius: () => 0.025, sanitizeTankDepthZ: z => z
  })({ frontLayer: 3, backLayer: 3 }, { z: 0.47 }, {});
  assert.equal(regions.interior, 0.47);
  assert.ok(regions.front > 0.583);
  assert.ok(regions.rear < 0.357);
});

test("cave shading follows physical portal progress and leaves exterior bodies illuminated", () => {
  const shade = load("rendering/fish-and-effects.js", "getFishCaveShadowStrength", {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    isFishInCaveRenderSublayer: f => Boolean(f.caveDecorId) && !["approach", "align", "leave"].includes(f.caveState),
    isFishInCavePortalCrossing: f => f.caveState.startsWith("portal-"),
    getFishCavePortalCrossingProgress: f => f.progress
  });
  const f = { caveDecorId: "pot", caveState: "inside" };
  assert.equal(shade(f), 1);
  assert.equal(shade(f, true), 0);
  f.caveState = "approach"; assert.equal(shade(f), 0);
  for (const state of ["portal-enter", "portal-exit"]) {
    f.caveState = state;
    const values = [0, 0.25, 0.5, 0.75, 1].map(progress => { f.progress = progress; return shade(f); });
    assert.equal(values[2], 0.5);
    assert.equal(values[0], state === "portal-enter" ? 0 : 1);
    assert.equal(values[4], state === "portal-enter" ? 1 : 0);
  }
});
test("cave shadow texture preserves alpha, reuses warm images, and caps texture memory", () => {
  let allocations = 0;
  const paint = [];
  const context = { drawImage: () => paint.push("image"), fillRect: () => paint.push("darken") };
  let limits;
  const shade = load("rendering/fish-and-effects.js", "getFishCaveShadowImage", {
    runtime: {}, WeakMap, Map,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    isUsableRuntimeImage: () => true,
    document: { createElement: () => { allocations++; return { getContext: () => context }; } },
    setBoundedCanvasCache: (cache, key, value, options) => { cache.set(key, value); limits = options; }
  });
  const source = { width: 1200, height: 600 };
  assert.equal(shade(source, 0), source);
  const dark = shade(source, 1);
  assert.equal(dark.width, 384); assert.equal(dark.height, 192);
  assert.equal(context.globalCompositeOperation, "source-atop");
  assert.equal(context.fillStyle, "rgba(0, 0, 0, 0.62)");
  for (let frame = 0; frame < 120; frame++) assert.equal(shade(source, 1), dark);
  assert.equal(allocations, 1); assert.deepEqual(paint, ["image", "darken"]);
  assert.equal(limits.maxBytes, 16 * 1024 * 1024);
});
