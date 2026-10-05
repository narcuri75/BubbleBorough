"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const cavePath = path.join(__dirname, "../game/public/app-src/fish/caves-and-collision.js");
const caveSource = fs.readFileSync(cavePath, "utf8");
const caveParsed = ts.createSourceFile("caves.js", caveSource, ts.ScriptTarget.Latest, true);
function load(name, stubs = {}) {
  const fn = caveParsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
  assert.ok(fn, `${name} should exist`);
  return vm.runInNewContext(`(${fn.getText(caveParsed)})`, stubs);
}

function crossingContext(fish) {
  return {
    TANK_WIDTH: 1000,
    TANK_HEIGHT: 600,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    sanitizeTankDepthZ: v => Number(v),
    getFishTankDepthZ: () => fish.z,
    getFishCaveDepthRegion: (f, region) => region === "front" ? 0.2 : 0.8,
    setFishTargetToCaveNode: (f, node, now) => {
      f.targetXNorm = node.xNorm;
      f.targetYNorm = node.yNorm;
      f.targetAt = now + 2000;
      return true;
    }
  };
}

test("portal entry begins without teleporting, zeroing velocity, or changing heading", () => {
  const fish = {
    xNorm: 0.5, yNorm: 0.67, z: 0.2,
    motionVelocityXNorm: 0.03, motionVelocityYNorm: -0.01,
    direction: 1
  };
  const begin = load("beginFishCavePortalCrossing", crossingContext(fish));
  const plan = { entryPathNodes: [{ xNorm: 0.5, yNorm: 0.61 }], inside: { xNorm: 0.5, yNorm: 0.53 } };
  assert.equal(begin(fish, plan, "enter", 1000), true);
  assert.equal(fish.caveState, "portal-enter");
  assert.equal(fish.xNorm, 0.5);
  assert.equal(fish.yNorm, 0.67);
  assert.equal(fish.motionVelocityXNorm, 0.03);
  assert.equal(fish.motionVelocityYNorm, -0.01);
  assert.equal(fish.direction, 1);
  assert.equal(fish.targetYNorm, 0.61);
  assert.equal(fish.cavePortalCrossingStartZ, 0.2);
  assert.equal(fish.cavePortalCrossingEndZ, 0.8);
});

test("portal progress follows physical entry travel and drives continuous depth", () => {
  const fish = {
    caveState: "portal-enter",
    xNorm: 0.5, yNorm: 0.64,
    cavePortalCrossingStartXNorm: 0.5, cavePortalCrossingStartYNorm: 0.67,
    cavePortalCrossingEndXNorm: 0.5, cavePortalCrossingEndYNorm: 0.61,
    cavePortalCrossingStartZ: 0.2, cavePortalCrossingEndZ: 0.8,
    cavePortalCrossingViaXNorm: null, cavePortalCrossingViaYNorm: null
  };
  const ctx = crossingContext(fish);
  const progress = load("getFishCavePortalCrossingProgress", ctx);
  ctx.getFishCavePortalCrossingProgress = progress;
  const depth = load("getFishCavePortalCrossingDepth", ctx);
  assert.ok(Math.abs(progress(fish) - 0.5) < 0.001);
  assert.ok(Math.abs(depth(fish) - 0.5) < 0.001);
});

test("portal exit crosses the mouth before the exterior approach", () => {
  const fish = { xNorm: 0.5, yNorm: 0.60, z: 0.8, direction: 1 };
  const ctx = crossingContext(fish);
  const begin = load("beginFishCavePortalCrossing", ctx);
  const plan = {
    mouth: { xNorm: 0.5, yNorm: 0.67 },
    approach: { xNorm: 0.5, yNorm: 0.77 }
  };
  assert.equal(begin(fish, plan, "exit", 1000), true);
  assert.equal(fish.caveState, "portal-exit");
  assert.equal(fish.targetYNorm, 0.67);
  assert.equal(fish.cavePortalCrossingEndYNorm, 0.77);
  assert.equal(fish.cavePortalCrossingStartZ, 0.8);
  assert.equal(fish.cavePortalCrossingEndZ, 0.2);
});

test("align starts portal-enter instead of switching directly to interior depth", () => {
  assert.match(caveSource, /fish\.caveState === "align"[\s\S]*beginFishCavePortalCrossing\(fish, plan, "enter", now\)/);
  const alignSection = caveSource.slice(caveSource.indexOf('if (fish.caveState === "align")'), caveSource.indexOf('if (fish.caveState === "portal-enter")'));
  assert.doesNotMatch(alignSection, /fish\.caveState = "enter"/);
  assert.doesNotMatch(alignSection, /setFishTankLayers\(fish, interiorLayer/);
});

test("exit finishes through portal-exit instead of jumping directly to leave", () => {
  const exitStart = caveSource.indexOf('if (fish.caveState === "exit")');
  const portalExitStart = caveSource.indexOf('if (fish.caveState === "portal-exit")', exitStart);
  const exitSection = caveSource.slice(exitStart, portalExitStart);
  assert.match(exitSection, /beginFishCavePortalCrossing\(fish, plan, "exit", now\)/);
  assert.doesNotMatch(exitSection, /fish\.caveState = "leave"/);
});

test("continuous portal depth is mirrored into compatibility fields without setFishTankLayers", () => {
  const syncStart = caveSource.indexOf("function syncFishDrawLayer");
  const syncSection = caveSource.slice(syncStart, caveSource.indexOf("// Ordinary fish now travel", syncStart));
  assert.match(syncSection, /\["portal-enter", "portal-exit"\]\.includes\(fish\.caveState\)/);
  assert.match(syncSection, /fish\.z = crossingZ/);
  assert.match(syncSection, /getLegacyTankDepthPositionFromZ\(crossingZ\)/);
});


test("portal crossing remains on its own cave path and avoids strict interior containment until clear", () => {
  const navSource = fs.readFileSync(path.join(__dirname, "../game/public/app-src/fish/cave-navigation.js"), "utf8");
  assert.match(navSource, /\["approach", "align", "portal-enter", "enter", "inside", "exit", "depart", "portal-exit", "leave"\]\.includes\(fish\.caveState\)/);
  assert.match(caveSource, /const interior = \["enter", "inside", "exit", "depart"\]\.includes\(fish\.caveState\)/);
});

test("portal crossing renders in the cave sandwich while depth remains continuous", () => {
  const renderSource = fs.readFileSync(path.join(__dirname, "../game/public/app-src/rendering/fish-and-effects.js"), "utf8");
  assert.match(renderSource, /\["portal-enter", "enter", "inside", "exit", "depart", "portal-exit"\]\.includes\(fish\.caveState\)/);
});

test("crossing state uses raw compatibility depth instead of forcing front or interior legacy slots", () => {
  const layoutSource = fs.readFileSync(path.join(__dirname, "../game/public/app-src/decor/layout-and-layers.js"), "utf8");
  assert.match(layoutSource, /if \(\["portal-enter", "portal-exit"\]\.includes\(fish\.caveState\)\) \{\s*return clampTankLayer\(fish\.tankLayer/);
  assert.match(layoutSource, /return clampTankSubLayer\(fish\?\.tankSubLayer/);
});
