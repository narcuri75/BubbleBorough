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
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function collisionContext() {
  const item = { id: "solid-arch", z: 0.5 };
  let silhouette = true;
  const c = vm.createContext({ Math, Number, WeakMap, clamp, runtime: {}, TANK_DEPTH_LAYERS: 5,
    sanitizeTankDepthZ: z => clamp(z, 0, 1), clampTankLayer: n => n, clampTankSubLayer: n => n,
    getFishTankLayer: () => 3, getFishTankSubLayer: () => 3,
    getFishTankDepthRadius: () => 0.002, getFishShapeDescriptor: () => ({ bounds: { left: 0, right: 10, top: 0, bottom: 10 } }),
    getTankDepthZFromLegacyPosition: () => 0.6, getDecorTankLayer: () => 3,
    doesDecorBlockTankSubLayer: () => false, // A back lane does not occupy the old middle lane.
    getNearbyPlacedDecorByDepth: () => [item], getPlacedDecorDepthZ: d => d.z,
    getPlacedDecorDepthRadius: () => 0.001,
    doTankDepthVolumesOverlap: (z1, r1, z2, r2) => Math.abs(z1 - z2) <= r1 + r2,
    getPlacedDecorOpaqueBounds: () => null, getDecorShapeDescriptor: () => ({}),
    shapesOverlapByMask: () => silhouette, shapesOverlapByMaskStrict: () => silhouette,
    getOverlappingFishForLayerChange: () => [] });
  load(c, "fish/caves-and-collision.js", ["getOverlappingDecorForFish", "canFishOccupyContinuousDepth", "findFishContinuousDepthEscape"]);
  return { c, item, hole: () => { silhouette = false; } };
}

test("continuous depth crossing tests the entire solid plane in both directions", () => {
  const { c } = collisionContext();
  for (const [from, to] of [[0.4, 0.6], [0.6, 0.4]]) {
    assert.equal(c.canFishOccupyContinuousDepth({}, {}, 1000, {}, to, from), false,
      "a free destination does not allow crossing an opaque image");
    assert.equal(c.canFishOccupyContinuousDepth({}, {}, 1000, {}, to), true, "destination alone is free");
  }
  assert.equal(c.canFishOccupyContinuousDepth({}, {}, 1000, {}, 0.501), false, "legacy back-lane exemption cannot bypass continuous collision");
});

test("a genuine transparent opening remains traversable", () => {
  const { c, hole } = collisionContext();
  hole();
  assert.equal(c.canFishOccupyContinuousDepth({}, {}, 1000, {}, 0.6, 0.4), true);
});

test("depth barriers catch a thin opaque leaf that coarse navigation sampling misses", () => {
  const { c } = collisionContext();
  c.ALPHA_COLLISION_THRESHOLD = 16;
  c.ALPHA_HIT_THRESHOLD = 16;
  load(c, "fish/caves-and-collision.js", ["boundsIntersect"]);
  load(c, "rendering/collision-and-masks.js", ["sampleAlphaMask", "sampleMaskGrid", "shapesOverlapByMask", "shapesOverlapByMaskStrict"]);
  const shape = leaf => {
    const alpha = new Uint8Array(21 * 21 * 4);
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) alpha[(y * 21 + x) * 4 + 3] = !leaf || x === 10 ? 255 : 0;
    return { bounds: { left: 0, right: 21, top: 0, bottom: 21 }, worldToUv: (x, y) => ({ u: x / 21, v: y / 21 }),
      mask: { width: 21, height: 21, alpha, bounds: { minX: 0, maxX: 20, minY: 0, maxY: 20 },
        gridWidth: 1, gridHeight: 1, grid: new Uint8Array([1]) } };
  };
  const fish = shape(false), leaf = shape(true);
  assert.equal(c.shapesOverlapByMask(fish, leaf, 10), false);
  c.getFishShapeDescriptor = () => fish;
  c.getDecorShapeDescriptor = () => leaf;
  assert.equal(c.canFishOccupyContinuousDepth({}, {}, 1000, {}, 0.6, 0.4), false);
});

test("continuous crossing includes visible companion art rather than only the primary layer", () => {
  const { c } = collisionContext();
  c.runtime.decorMap = new Map([[undefined, {}]]);
  c.getDecorVisibleImagePaths = () => ["transparent-primary", "solid-roots"];
  c.getDecorShapeDescriptor = (_, path) => ({ opaque: path === "solid-roots" });
  c.shapesOverlapByMaskStrict = (_, descriptor) => descriptor.opaque;
  assert.equal(c.canFishOccupyContinuousDepth({}, {}, 1000, {}, 0.6, 0.4), false);
});

test("depth escape cannot select a route through solid artwork", () => {
  const { c } = collisionContext();
  // Both sides are free at their endpoints, but the nearby plane must be crossed
  // by the preferred escape direction. An escape may only stay on the source side.
  const target = c.findFishContinuousDepthEscape({}, {}, 1000, {}, 0.49, 1);
  assert.ok(target < 0.49);
});

test("a blocked fish holds its depth and bounds escape searches under sustained occlusion", () => {
  let probes = 0;
  const c = vm.createContext({ Math, Number, WeakMap, clamp, runtime: {},
    sanitizeTankDepthZ: z => z, getTankDepthZFromLegacyPosition: () => 0.49,
    getFishTankLayer: () => 3, getFishTankSubLayer: () => 3,
    getDesiredFishTankDepthZ: f => f.desiredZ, getFishPose: () => ({}),
    canFishOccupyContinuousDepth: () => false,
    findFishContinuousDepthEscape: () => { probes++; return null; } });
  load(c, "fish/caves-and-collision.js", ["syncFishContinuousDepth"]);
  const fish = { z: 0.49, desiredZ: 0.7, depthMotionUpdatedAt: 1000 };
  for (let now = 1000; now < 1750; now += 16) c.syncFishContinuousDepth(fish, {}, now);
  assert.equal(fish.z, 0.49);
  assert.equal(probes, 1, "one escape search rather than one per rendered frame");
  c.syncFishContinuousDepth(fish, {}, 1750);
  assert.equal(probes, 2, "route discovery still retries");
  fish.desiredZ = 0.4905;
  c.syncFishContinuousDepth(fish, {}, 1800);
  assert.equal(fish.z, 0.49, "even a small depth adjustment must pass collision");
});

test("a planted aquarium working set stays warm rather than cycling GPU readbacks", () => {
  const runtime = { alphaMaskCache: new Map(), maskRegionCache: new Map() };
  const c = vm.createContext({ runtime, Math, Number });
  load(c, "assets/image-storage-and-import.js", ["getMaxAlphaMaskCacheBytes", "getAlphaMaskByteSize", "setBoundedAlphaMask"]);
  const paths = Array.from({ length: 12 }, (_, n) => `active-art-${n}`);
  let builds = 0;
  for (let frame = 0; frame < 60; frame++) for (const path of paths) {
    const mask = runtime.alphaMaskCache.get(path);
    if (mask) {
      runtime.alphaMaskCache.delete(path);
      runtime.alphaMaskCache.set(path, mask);
    } else {
      builds++;
      c.setBoundedAlphaMask(path, { alpha: { byteLength: 8 * 1024 * 1024 } });
    }
  }
  assert.equal(builds, paths.length, "one readback per image across sixty frames");
  assert.ok(c.getMaxAlphaMaskCacheBytes() <= 128 * 1024 * 1024, "memory remains bounded");
  c.setBoundedAlphaMask("cold-large-image", { alpha: { byteLength: 64 * 1024 * 1024 } });
  const bytes = [...runtime.alphaMaskCache.values()].reduce((sum, mask) => sum + c.getAlphaMaskByteSize(mask), 0);
  assert.ok(bytes <= c.getMaxAlphaMaskCacheBytes());
});
