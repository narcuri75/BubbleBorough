"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..", "game");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const fishRenderSource = read("public/app-src/rendering/fish-and-effects.js");
const tankSource = read("public/app-src/rendering/tank-and-water.js");
const caveSource = read("public/app-src/fish/caves-and-collision.js");
const turnSource = read("public/app-src/rendering/fish-turn-v26.js");
const motionSource = read("public/app-src/rendering/fish-motion-and-floor.js");

function load(source, name, stubs = {}) {
  const parsed = ts.createSourceFile(`${name}.js`, source, ts.ScriptTarget.Latest, true);
  const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `${name} should exist`);
  return vm.runInNewContext(`(${fn.getText(parsed)})`, stubs);
}

test("portal exterior clip is a mouth-aligned half-plane, not a whole-sprite alpha fade", () => {
  const getPolygon = load(fishRenderSource, "getFishCavePortalExteriorClipPolygon", {
    runtime: {},
    TANK_WIDTH: 1000,
    TANK_HEIGHT: 600,
    Math,
    Number,
    Array,
    isFishInCavePortalCrossing: fish => ["portal-enter", "portal-exit"].includes(fish?.caveState),
    getActiveFishCavePlan: () => ({ mouth: { xNorm: 0.5, yNorm: 0.5 } })
  });
  const fish = {
    caveDecorId: "cave-1",
    caveState: "portal-enter",
    cavePortalCrossingMode: "enter",
    cavePortalCrossingStartXNorm: 0.5,
    cavePortalCrossingStartYNorm: 0.65,
    cavePortalCrossingEndXNorm: 0.5,
    cavePortalCrossingEndYNorm: 0.35,
    cavePortalCrossingViaXNorm: null,
    cavePortalCrossingViaYNorm: null
  };
  const polygon = getPolygon(fish);
  assert.equal(polygon.length, 4);
  // Entry travels upward. Exterior is below the mouth, so the far exterior
  // edge must extend to a screen Y greater than the mouth's 300px position.
  assert.ok(Math.max(...polygon.map(point => point.y)) > 300);
  assert.doesNotMatch(fishRenderSource, /cavePortalExteriorOverlayOnly[\s\S]{0,800}globalAlpha\s*=\s*1\s*-\s*/);
});

test("render order redraws only the exterior portal body after cave front", () => {
  const sandwich = tankSource.slice(
    tankSource.indexOf('drawDecor(layer, now, { pass: "cave-back"', tankSource.indexOf('for (let layer')),
    tankSource.indexOf('drawPoops(now, layer);')
  );
  const interiorIndex = sandwich.indexOf('caveInteriorOnly: true');
  const frontIndex = sandwich.indexOf('pass: "cave-front"');
  const exteriorIndex = sandwich.indexOf('cavePortalExteriorOverlayOnly: true');
  const baseIndex = sandwich.indexOf('pass: "base"');
  assert.ok(interiorIndex >= 0 && frontIndex > interiorIndex && exteriorIndex > frontIndex && baseIndex > exteriorIndex);
  assert.match(fishRenderSource, /clipContextToFishCavePortalExterior\(tankContext, fish\)/);
  assert.match(fishRenderSource, /!cavePortalExteriorOverlayOnly && !pose\.isDead/);
});

test("missing portal coordinates cannot turn the exterior clip into a plane at zero", () => {
  const getPolygon = load(fishRenderSource, "getFishCavePortalExteriorClipPolygon", {
    runtime: {},
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    isFishInCavePortalCrossing: () => true, getActiveFishCavePlan: () => null
  });
  const fish = { caveState: "portal-enter", cavePortalCrossingViaXNorm: null, cavePortalCrossingViaYNorm: null,
    cavePortalCrossingStartXNorm: 0.5, cavePortalCrossingStartYNorm: 0.65,
    cavePortalCrossingEndXNorm: 0.5, cavePortalCrossingEndYNorm: 0.35 };
  const polygon = getPolygon(fish);
  assert.ok(polygon);
  assert.ok(Math.abs(polygon[0].y - 388) < 0.001, "fallback mouth uses the real entry start, not the origin");
  fish.cavePortalCrossingStartYNorm = null;
  assert.equal(getPolygon(fish), null);
});

test("a portal crossing keeps one clip plane when its cave plan is rebuilt or missing", () => {
  let plan = { mouth: { xNorm: 0.5, yNorm: 0.5 } };
  const getPolygon = load(fishRenderSource, "getFishCavePortalExteriorClipPolygon", {
    runtime: {}, TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    isFishInCavePortalCrossing: () => true, getActiveFishCavePlan: () => plan
  });
  const fish = { caveDecorId: "pot", caveState: "portal-enter",
    cavePortalCrossingViaXNorm: null, cavePortalCrossingViaYNorm: null,
    cavePortalCrossingStartXNorm: 0.5, cavePortalCrossingStartYNorm: 0.65,
    cavePortalCrossingEndXNorm: 0.5, cavePortalCrossingEndYNorm: 0.35 };
  const first = getPolygon(fish);
  plan = null;
  assert.equal(getPolygon(fish), first);
  plan = { mouth: { xNorm: 0.1, yNorm: 0.1 } };
  assert.equal(getPolygon(fish), first, "an in-flight crossing does not switch clip planes");
  fish.caveState = "portal-exit";
  assert.notEqual(getPolygon(fish), first, "the next crossing receives a fresh plane");
});

test("portal crossing waits for a horizontal clearance turn to finish", () => {
  assert.match(caveSource, /function prepareFishCavePortalFacing\([\s\S]*?if \(turnState\.active\) \{\s*return false;/);
  const alignStart = caveSource.indexOf('if (fish.caveState === "align")');
  const portalStart = caveSource.indexOf('if (fish.caveState === "portal-enter")', alignStart);
  const align = caveSource.slice(alignStart, portalStart);
  assert.ok(align.indexOf('prepareFishCavePortalFacing(fish, species, plan, "enter", now)') < align.indexOf('beginFishCavePortalCrossing(fish, plan, "enter", now)'));
  const exitStart = caveSource.indexOf('if (fish.caveState === "exit")');
  const departStart = caveSource.indexOf('if (fish.caveState === "depart")', exitStart);
  const exit = caveSource.slice(exitStart, departStart);
  assert.ok(exit.indexOf('prepareFishCavePortalFacing(fish, species, plan, "exit", now)') < exit.indexOf('beginFishCavePortalCrossing(fish, plan, "exit", now)'));
});

test("portal-tight v26 turn has no screen-space trajectory sweep", () => {
  const normalize = load(turnSource, "normalizeFishTurnV26Style", {
    String,
    FISH_TURN_V26_DEFAULT_STYLE: "head-led"
  });
  const context = {
    Math,
    Number,
    String,
    FISH_TURN_V26_DEFAULT_STYLE: "head-led",
    FISH_TURN_V26_TRAJECTORY_UNIT_SCALE: 210,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    normalizeFishTurnV26Style: normalize,
    easeFishTurnV26Sine: t => (1 - Math.cos(Math.PI * t)) / 2,
    easeFishTurnV26CubicInOut: t => t
  };
  context.getFishTurnV26StyleDefinition = load(turnSource, "getFishTurnV26StyleDefinition", context);
  const compute = load(turnSource, "computeFishTurnV26StyleTransform", context);
  const mid = compute("portal-tight", 0.5, 1, 1);
  assert.equal(mid.style.id, "portal-tight");
  assert.equal(mid.motionX, 0);
  assert.equal(mid.motionY, 0);
  assert.ok(Math.abs(mid.translationX) < 1e-12);
  assert.ok(Math.abs(mid.translationY) < 1e-12);
  assert.ok(Math.abs(mid.rotationYDegrees) >= 89);
});

test("cave proximity selects the tight style before open-water style randomization", () => {
  assert.match(turnSource, /if \(context\.caveClearanceConstrained \|\| \["align", "portal-enter", "exit", "depart", "portal-exit"\]\.includes\(fish\?\.caveState\)\) \{\s*return "portal-tight";/);
  assert.match(turnSource, /caveClearanceConstrained = typeof isFishNearCaveShellForTurn === "function"/);
});

test("portal movement locks out a contradictory reversal until the body clears", () => {
  const setDirectionStart = motionSource.indexOf("function setFishDirection(");
  const setDirectionEnd = motionSource.indexOf("function getActiveGravelContour", setDirectionStart);
  const setDirection = motionSource.slice(setDirectionStart, setDirectionEnd);
  assert.match(setDirection, /\["portal-enter", "portal-exit"\]\.includes\(fish\?\.caveState\)/);
  assert.match(setDirection, /portalDirectionLocked && nextDirection !== currentDisplayDirection/);
});
