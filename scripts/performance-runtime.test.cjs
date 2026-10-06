"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
const files = new Map();
function readFunction(file, name) {
  if (!files.has(file)) files.set(file, ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true));
  const source = files.get(file);
  const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, name);
  return node.getText(source);
}
function load(c, file, names) { for (const name of names) vm.runInContext(readFunction(file, name), c); }
function context(stubs) {
  return vm.createContext({ Map, Set, WeakMap, Uint8Array, Uint8ClampedArray, Math, Number,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    getFishRenderedHorizontalTurnState: stubs.getFishHorizontalTurnState, ...stubs });
}

function swimContext() {
  const c = context({ runtime: { fishSwimAnimationStates: new Map() },
    getFishSwimAnimationDebugPresetOverride: () => "",
    getFishSwimAnimationSpeedMultiplier: () => 0.9 });
  const source = ts.createSourceFile("bootstrap", fs.readFileSync(path.join(root, "00-bootstrap.js"), "utf8"), ts.ScriptTarget.Latest, true);
  const config = source.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(entry => entry.name.getText(source) === "FISH_SWIM_ANIMATION"));
  vm.runInContext(config.getText(source), c);
  load(c, "rendering/fish-and-effects.js", ["getFishSwimMovementFactor", "getFishSwimAnimationPresetId",
    "normalizeFishSwimAnimationPhase", "getFishSwimAnimationSeedPhase", "advanceFishSwimAnimationPhase", "getFishSwimAnimationState"]);
  return c;
}

test("stopping after travel clears visual effort even when traversal velocity is stale", () => {
  const c = swimContext();
  const fish = { xNorm: 0.5, yNorm: 0.5, swimSpeed: 0.04, traversalVelocityXNorm: 0.04 };
  assert.equal(c.getFishSwimMovementFactor(fish, 1000), 0);
  fish.xNorm += 0.002;
  assert.ok(c.getFishSwimMovementFactor(fish, 1050) > 0.99);
  assert.ok(c.getFishSwimMovementFactor(fish, 1050) > 0.99, "all passes share the same measurement");
  assert.equal(c.getFishSwimMovementFactor(fish, 1100), 0, "no displacement means no propulsion");
  assert.equal(fish.traversalVelocityXNorm, 0.04, "simulation state remains untouched");
});

test("turn entry and exit match the full swimming transform for left/right dives and climbs", () => {
  let progress = 0;
  const c = context({ getFishHorizontalTurnState: fish => ({ active: true, reversing: true, progress,
    fromDirection: fish.turnFromDirection, toDirection: fish.turnToDirection }) });
  load(c, "rendering/fish-turn-v26.js", ["easeFishTurnV26Continuity", "getFishTurnV26MotionTimingProfile",
    "getFishTurnV26TimedProgress", "getFishTurnV26VisualProgress", "getFishTurnV26VisualContinuity"]);
  for (const from of [-1, 1]) for (const entry of [-0.5, 0.5]) for (const exit of [-0.45, 0.45]) {
    const fish = { turnFromDirection: from, turnToDirection: -from, turnV26EntryTilt: entry };
    for (const [p, localTilt, facing] of [[0, entry, from], [1, exit, -from]]) {
      progress = p;
      const worldTilt = c.getFishTurnV26VisualContinuity(fish, exit, 1000).tilt;
      // Compare S(f) R(local) against R(world) S(f), including off-axis
      // points: head slope alone would miss a mirrored body/carry anchor.
      for (const [x, y] of [[1, 0], [0, 1], [-0.3, 0.4]]) {
        const normal = [facing * (Math.cos(localTilt) * x - Math.sin(localTilt) * y),
          Math.sin(localTilt) * x + Math.cos(localTilt) * y];
        const turned = [Math.cos(worldTilt) * facing * x - Math.sin(worldTilt) * y,
          Math.sin(worldTilt) * facing * x + Math.cos(worldTilt) * y];
        assert.ok(normal.every((v, i) => Math.abs(v - turned[i]) < 1e-10), `${from}, ${entry}, ${exit}, ${p}`);
      }
    }
    let previous;
    for (let frame = 0; frame <= 60; frame++) {
      progress = frame / 60;
      const tilt = c.getFishTurnV26VisualContinuity(fish, exit, 1000).tilt;
      if (previous != null) assert.ok(Math.abs(tilt - previous) < 0.05, "bounded intermediate slope change");
      previous = tilt;
    }
  }
});

test("failed complex mesh draws the narrowing animated fallback and latches it", () => {
  const source = files.get("rendering/fish-and-effects.js") || ts.createSourceFile("renderer",
    fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8"), ts.ScriptTarget.Latest, true);
  let branch;
  function visit(node) {
    if (ts.isIfStatement(node) && node.expression.getText(source) === "!renderedByV26") branch = node.thenStatement.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(branch);
  let progress = 0, fallback = "", terminal = 0;
  const scales = [];
  const c = context({ fish: {}, now: 2000, depthRenderImage: {}, fishDrawX: -50, width: 100, spriteHeight: 40,
    FISH_TURN_MIN_SCALE_X: 0.16, FISH_TURN_MAX_SCALE_Y: 1.1,
    tankContext: { save() {}, restore() {}, translate() {}, scale: x => scales.push(x), drawImage() {} },
    markLightweightCausticImage() {}, markFishTurnRendererFallback: (_, backend) => { fallback = backend; },
    markFishTurnFinalFrameRendered: () => { terminal++; },
    getFishHorizontalTurnState: () => ({ active: true, reversing: true, progress, fromDirection: -1, toDirection: 1 }) });
  load(c, "rendering/fish-and-effects.js", ["getFishLightweightTurnFallbackVisualState", "drawFishLightweightTurnFallbackFrame"]);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) { progress = p; vm.runInContext(branch, c); }
  assert.equal(fallback, "simple");
  assert.equal(terminal, 1);
  assert.equal(scales[0], -1);
  assert.ok(Math.abs(scales[2]) < 0.17, "flip occurs while narrow");
  assert.ok(Math.abs(scales[1]) < 0.5 && scales[3] < 0.5);
  assert.ok(Math.abs(scales[4] - 1) < 1e-10);
});

test("a long frame cannot bypass living pose smoothing", () => {
  const c = context({ runtime: { fishVisualPoseSmoothingStates: new Map() },
    FISH_VISUAL_POSE_SMOOTHING: { resetAfterMs: 260, tiltResponsePerSecond: 11,
      scaleResponsePerSecond: 13, wiggleResponsePerSecond: 15, swayResponsePerSecond: 13 } });
  load(c, "rendering/fish-and-effects.js", ["smoothLivingFishVisualPose"]);
  const fish = { id: "test" };
  c.smoothLivingFishVisualPose(fish, { tilt: 0.5 }, 1000);
  const result = c.smoothLivingFishVisualPose(fish, { tilt: -0.5 }, 2000);
  assert.ok(result.tilt > -0.2 && result.tilt < 0.5);
});

test("a stalled frame cannot skip a v26 turn, and repeated render passes never advance it twice", () => {
  const c = context({ runtime: {}, Date });
  load(c, "rendering/fish-motion-and-floor.js", ["normalizeFishHorizontalDirection", "getFishFacingDirection",
    "getFishLogicalDirection", "getFishHorizontalTurnState", "getFishRenderedHorizontalTurnState"]);
  const fish = { turnStartedAt: 1000, turnDurationMs: 650, turnFromDirection: -1, turnToDirection: 1,
    displayDirection: -1, turnRendererBackend: "v26" };
  const normal = c.getFishRenderedHorizontalTurnState(fish, 1000);
  assert.equal(normal.progress, 0);
  const stalled = c.getFishRenderedHorizontalTurnState(fish, 2000);
  assert.equal(stalled.progress, 50 / 650);
  assert.equal(c.getFishRenderedHorizontalTurnState(fish, 2000).progress, stalled.progress);
  assert.equal(c.getFishHorizontalTurnState(fish, 2000).progress, 1, "authoritative turn clock is unchanged");
  fish.turnRendererFallbackBackend = "simple";
  assert.equal(c.getFishRenderedHorizontalTurnState(fish, 3000).progress, 100 / 650, "fallback keeps the same visual clock");
  let final;
  for (let i = 0; i < 11; i++) final = c.getFishRenderedHorizontalTurnState(fish, 4000 + i * 1000);
  assert.ok(Math.abs(final.progress - 1) < 1e-10);
  fish.turnStartedAt = 20000;
  assert.equal(c.getFishRenderedHorizontalTurnState(fish, 20000).progress, 0, "new turn resets its clock");
});

test("stationary shadow pixels reuse one surface and invalidate for geometry, floor and loaded assets", () => {
  const items = [{ id: "one" }, { id: "two" }];
  const metrics = new Map(items.map(item => [item, {}]));
  const runtime = { images: new Map() }, state = { placedDecor: items };
  let floor = 500, seed = 1, mask = null, paints = 0, creates = 0;
  const c = context({ runtime, state, TANK_WIDTH: 1000, TANK_HEIGHT: 600, WATER_SURFACE_Y: 20,
    document: { createElement: () => { creates++; return { getContext: () => ({}) }; } },
    getCachedDecorContactShadowMetrics: item => metrics.get(item), getCurrentTank: () => ({}),
    getTankSubstrateAssetPath: () => "sand", getImageAlphaMask: () => mask,
    getTankFloorDrawBounds: () => ({ bottom: floor }), getTankFloorMaskHillProfile: () => ({ seed }),
    getGravelFloorLayoutKey: () => String(seed), getResolvedTankSubstrateStyle: () => "sand",
    getNaturalSubstrateDrawBounds: () => ({ top: floor }), drawDecorContactShadow: () => { paints++; } });
  load(c, "rendering/decor.js", ["getDecorGroundShadowCanvas"]);
  const first = c.getDecorGroundShadowCanvas();
  assert.equal(paints, 2);
  assert.equal(c.getDecorGroundShadowCanvas(), first);
  assert.equal(paints, 2);
  for (const mutate of [() => metrics.set(items[0], {}), () => { floor++; }, () => { seed++; },
    () => runtime.images.set("sand", {}), () => { mask = {}; }, () => { items.reverse(); }, () => { items.pop(); }]) {
    const previous = paints;
    mutate();
    assert.equal(c.getDecorGroundShadowCanvas(), first, "one bounded raster surface");
    assert.equal(paints, previous + items.length);
    c.getDecorGroundShadowCanvas();
    assert.equal(paints, previous + items.length);
  }
  assert.equal(creates, 1);
});

test("stationary targets do not drive tail effort; coasting relaxes it without changing fish state", () => {
  const c = swimContext();
  const fish = { id: "test", swimSpeed: 0.04, phase: 0.1, xNorm: 0.1, yNorm: 0.4,
    targetXNorm: 0.9, targetYNorm: 0.8, motionLevel: 1, activity: "feeding", panicUntil: 5000 };
  const before = JSON.stringify(fish);
  assert.equal(c.getFishSwimMovementFactor(fish, 1000), 0, "distant target alone is no movement");
  assert.equal(c.getFishSwimAnimationPresetId(fish, {}, 1000), "chill");
  const idle = c.getFishSwimAnimationState(fish, {}, 1000, { immediate: true });
  assert.ok(idle.tailIntensity > 0 && idle.animationSpeed > 0, "tiny idle fin motion remains");
  assert.equal(JSON.stringify(fish), before, "rendering never edits position, target, panic or needs");
  fish.traversalVelocityXNorm = 0.024;
  fish.traversalVelocityYNorm = 0.032;
  fish.xNorm += 0.024 * 0.05;
  fish.yNorm += 0.032 * 0.05;
  assert.ok(Math.abs(c.getFishSwimMovementFactor(fish, 1050) - 1) < 1e-10);
  assert.equal(c.getFishSwimAnimationPresetId(fish, {}, 1050), "panicked");
  fish.panicUntil = 0;
  assert.equal(c.getFishSwimAnimationPresetId(fish, {}, 1050), "feeding");
  const push = c.getFishSwimAnimationState(fish, {}, 1050, { presetId: "regular", immediate: true });
  fish.locomotionTailAmplitudeScale = 0.68;
  fish.locomotionTailFrequencyScale = 0.72;
  const coast = c.getFishSwimAnimationState(fish, {}, 1050, { presetId: "regular", immediate: true });
  assert.ok(coast.tailIntensity < push.tailIntensity && coast.animationSpeed < push.animationSpeed);
  const exact = c.getFishSwimAnimationState(fish, {}, 1000, { presetId: "regular", forceExactPreset: true });
  assert.equal(exact.tailIntensity, 0.55);
  assert.equal(exact.animationSpeed, 1, "tuner preset remains exact during coasting");
});

test("swim transitions preserve phase and remain smooth across frame stalls and frame rates", () => {
  const fish = { id: "test", swimSpeed: 0.04, phase: 0.1, traversalVelocityXNorm: 0.04 };
  const setup = () => {
    const c = swimContext();
    c.getFishSwimAnimationState(fish, {}, 1000, { presetId: "sleepy", movementFactor: 1 });
    return c;
  };
  const stalled = setup(), regular = setup();
  const a = stalled.getFishSwimAnimationState(fish, {}, 6000, { presetId: "panicked", movementFactor: 1 });
  const b = regular.getFishSwimAnimationState(fish, {}, 1000 + 1000 / 30, { presetId: "panicked", movementFactor: 1 });
  for (const key of ["tailIntensity", "animationSpeed", "swimAnimationPhase"]) {
    assert.ok(Math.abs(a[key] - b[key]) < 1e-10, `${key}: stalled frame advances only one bounded step`);
  }
  assert.ok(a.tailIntensity < 0.3 && a.animationSpeed < 0.7, "panic transition cannot pop to full strength");
  const results = [];
  for (const fps of [30, 60]) {
    const c = setup();
    let result;
    for (let frame = 1; frame <= fps; frame++) {
      result = c.getFishSwimAnimationState(fish, {}, 1000 + frame * 1000 / fps, { presetId: "regular", movementFactor: 1 });
    }
    results.push(result);
  }
  for (const key of ["tailIntensity", "animationSpeed"]) {
    assert.ok(Math.abs(results[0][key] - results[1][key]) < 1e-10, `${key}: transition independent of normal frame rate`);
  }
  assert.ok(Math.abs(results[0].swimAnimationPhase - results[1].swimAnimationPhase) < 0.002, "phase stays continuous at both rates");
});

test("decor depth and performance options preserve saved artwork and preview dimensions", () => {
  const decor = { key: "rock", path: "front", bgPath: "back", width: 200 };
  const front = { width: 100, height: 150 }, back = { width: 100, height: 120 };
  const item = { id: "placed", decorKey: "rock", scale: 1.7, xNorm: 0.5, yNorm: 0.8, z: 0.05 };
  const state = { placedDecor: [item] };
  const runtime = { decorMap: new Map([["rock", decor]]), images: new Map([["front", front], ["back", back]]),
    placementMode: { decorKey: "rock", scale: item.scale, tankLayer: 1, z: item.z },
    placementPreview: { xNorm: item.xNorm, yNorm: item.yNorm } };
  let cave = false;
  const draws = [], surfaces = [];
  const tankContext = { save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {} };
  const c = context({ runtime, state, tankContext, TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    DEFAULT_TANK_SUBLAYER: 2,
    getViewportStableObjectScale: () => 0.8, getAquariumPhysicalAssetScale: () => 0.9,
    getPlacedDecorRenderOrder: () => state.placedDecor, getDecorArtworkPaths: () => [],
    getDecorLayerSpan: () => ({ front: 1, back: 1, min: 1, max: 1 }), getDecorTankLayer: () => 1,
    isCaveDecorKey: () => cave, isTransitTubeDecorKey: () => false,
    getDecorImageTopY: (placed, height) => placed.yNorm * 600 - height,
    getDecorMotion: () => ({}), getPlacedDecorGroundBounds: () => null,
    drawCasterShadowOnDecorSurfaces: () => false, getTankDepthShadowStrength: () => 1,
    isDecorHorizontallyFlipped: () => false, hasDecorCaveColorLayers: () => false,
    drawCaveBackgroundLayerToContext: () => false, drawCaveColorLayersToContext: () => false,
    drawDecorImageLayer: (image, x, y, width, height) => draws.push({ image, x, y, width, height }),
    registerDecorShadowSurface: (placed, entry, x, y, width, height) => surfaces.push({ width, height }),
    sanitizeTankDepthZ: value => value, getTankDepthZFromLegacyPosition: () => 0.5,
    getDecorScaleDefault: () => 1 });
  load(c, "decor/layout-and-layers.js", ["getDecorDisplayWidth"]);
  load(c, "rendering/decor.js", ["drawDecor", "drawDecorPreview"]);
  const expectedWidth = decor.width * item.scale * 0.8 * 0.9;
  for (const flag of [null, "debugDecorReducedSwayEnabled", "debugDecorFreezeSwayEnabled",
    "debugDecorCullingDisabled", "debugDecorShadowCacheDisabled"]) {
    if (flag) runtime[flag] = true;
    for (const z of [0.05, 0.5, 0.95]) {
      item.z = runtime.placementMode.z = z;
      const savedBefore = JSON.stringify(state);
      for (const pass of ["base", "cave-back", "cave-front"]) {
        cave = pass !== "base";
        c.drawDecor(1, 1000, { pass });
      }
      c.drawDecorPreview();
      assert.equal(draws.length, 5, "ordinary, both cave passes and both preview layers draw");
      for (const draw of draws.splice(0)) {
        assert.equal(draw.width, expectedWidth);
        assert.equal(draw.height, expectedWidth * (draw.image.height / draw.image.width));
        assert.equal(draw.x, item.xNorm * 1000 - expectedWidth / 2);
        assert.equal(draw.y + draw.height, item.yNorm * 600);
      }
      for (const surface of surfaces.splice(0)) {
        assert.equal(surface.width, expectedWidth);
        assert.equal(surface.height, expectedWidth * 1.5);
      }
      assert.equal(JSON.stringify(state), savedBefore, "drawing must not edit saved placement or scale");
    }
    if (flag) runtime[flag] = false;
  }
  item.scale = runtime.placementMode.scale = 2;
  cave = false;
  c.drawDecor(1, 1000);
  c.drawDecorPreview();
  assert.ok(draws.every(draw => draw.width === decor.width * 2 * 0.8 * 0.9),
    "an explicit saved scale edit still changes both placed art and its preview");
});

test("decor sway uses bounded screen detail by default and retains original debug comparison", () => {
  const runtime = {};
  let debug = true, screenHeight = 600;
  const c = context({ runtime, DECOR_WARP_SLICE_TARGET_PX: 2.25, DECOR_WARP_MIN_SLICES: 28,
    DECOR_WARP_MAX_SLICES: 180, TANK_HEIGHT: 600, isDebugModeEnabled: () => debug,
    getTankStageLayoutSize: () => ({ height: screenHeight }) });
  load(c, "rendering/decor.js", ["getDecorWarpSliceCount"]);
  for (const height of [0, 20, 100, 250, 1000]) {
    assert.equal(c.getDecorWarpSliceCount(height), Math.min(180, Math.max(28, Math.round(Math.max(1, height) / 2.25))));
  }
  runtime.debugDecorReducedSwayEnabled = true;
  assert.equal(c.getDecorWarpSliceCount(1000), 48);
  assert.equal(c.getDecorWarpSliceCount(100), 13);
  screenHeight = 300;
  assert.equal(c.getDecorWarpSliceCount(100), 12);
  debug = false;
  runtime.debugDecorReducedSwayEnabled = false;
  assert.equal(c.getDecorWarpSliceCount(1000), 48);
});

test("decor sampling padding is clipped to shared pixel rows without double alpha coverage", () => {
  const runtime = {};
  const c = context({ runtime, DECOR_WARP_SLICE_OVERLAP_PX: 1.2 });
  load(c, "rendering/decor.js", ["normalizeDecorWarpOffset", "getDecorWarpBandLayout", "drawWarpedImageBandsToContext"]);
  const image = { naturalWidth: 240, naturalHeight: 510 };
  const offset = t => ({ x: Math.sin(t * 3.7) * 12, y: Math.cos(t * 2.1) * 3 });
  for (const [width, height, count] of [[80, 170, 12], [180, 420, 48], [180, 420, 180]]) {
    const transforms = [], draws = [], clips = [];
    let samples = 0;
    const ctx = { save() {}, restore() {}, beginPath() {}, clip() {},
      getTransform: () => ({ a: 1.5, b: 0, c: 0, d: 1.5, e: 0.2, f: 0.3 }),
      rect: (...args) => clips.push(args), transform: (...args) => transforms.push(args), drawImage: (...args) => draws.push(args) };
    c.drawWarpedImageBandsToContext(ctx, image, 13, 27, width, height, count, t => { samples++; return offset(t); });
    // Every source coordinate must retain the original scale. Neighbouring
    // strips map their shared edge to the same point, including vertical sway.
    const sliceHeight = height / count;
    for (let i = 0; i < count; i++) {
      const top = offset(i / count), bottom = offset((i + 1) / count);
      const transform = transforms[i], crop = draws[i], clip = clips[i];
      assert.ok(Math.abs(transform[4] + transform[2] * sliceHeight - (13 + bottom.x)) < 1e-10);
      assert.ok(Math.abs(transform[5] + transform[3] * sliceHeight - (27 + (i + 1) * sliceHeight + bottom.y)) < 1e-10);
      assert.equal(crop[1], 0);
      assert.equal(crop[5], 0);
      assert.ok(Math.abs(crop[8] / crop[4] - height / image.naturalHeight) < 1e-10, "last strip cannot stretch");
      assert.ok(Math.abs(crop[6] - (crop[2] * height / image.naturalHeight - i * sliceHeight)) < 1e-10);
      assert.ok(Math.abs((clip[1] * 1.5 + 0.3) - Math.round(clip[1] * 1.5 + 0.3)) < 1e-10);
      if (i > 0) assert.ok(Math.abs(clips[i - 1][1] + clips[i - 1][3] - clip[1]) < 1e-10, "no gap or overlap between clips");
    }
    assert.equal(samples, count + 1, "adjacent strips share their boundary wave sample");
    assert.equal(c.getDecorWarpBandLayout(image, width, height, count), c.getDecorWarpBandLayout(image, width, height, count));
  }
  const old = c.getDecorWarpBandLayout(image, 80, 170, 12);
  image.naturalHeight = 600;
  assert.notEqual(c.getDecorWarpBandLayout(image, 80, 170, 12), old, "asset resize invalidates crops");
  for (let height = 100; height < 120; height++) c.getDecorWarpBandLayout(image, 80, height, 12);
  assert.equal(runtime.decorWarpBandLayoutCache.get(image).size, 8, "preview/resizing cache stays bounded");
});

test("frozen decor sway retains bobbing and shares the artwork/mask drawing path", () => {
  const runtime = { debugDecorFreezeSwayEnabled: true };
  let debug = true;
  const calls = [];
  const c = context({ runtime, isDebugModeEnabled: () => debug,
    drawDecorWarpedToContext: () => calls.push("warped"),
    drawCustomDecorMotionImageLayerToContext: () => calls.push("custom") });
  load(c, "rendering/decor.js", ["drawDecorMotionImageToContext"]);
  const ctx = { drawImage: (...args) => calls.push(args) }, img = {};
  const motion = { isSeaweed: true, bobX: 2, bobY: -3 };
  c.drawDecorMotionImageToContext(ctx, img, 10, 20, 100, 200, {}, 0, motion);
  assert.deepEqual(calls.pop(), [img, 12, 17, 100, 200]);
  debug = false;
  c.drawDecorMotionImageToContext(ctx, img, 10, 20, 100, 200, {}, 0, motion);
  assert.equal(calls.pop(), "warped");
  debug = true;
  runtime.debugDecorFreezeSwayEnabled = false;
  c.drawDecorMotionImageToContext(ctx, img, 10, 20, 100, 200, {}, 0, { customMotionType: "sway" });
  assert.equal(calls.pop(), "custom");
});

test("offscreen decor culling keeps partial artwork, motion margins and malformed bounds", () => {
  const runtime = {};
  let debug = true;
  const c = context({ runtime, isDebugModeEnabled: () => debug, TANK_WIDTH: 1000, TANK_HEIGHT: 600 });
  load(c, "rendering/decor.js", ["isDecorArtworkOutsideTank"]);
  const outside = (...args) => c.isDecorArtworkOutsideTank(...args);
  assert.equal(outside(-200, 0, 100, 100), true);
  assert.equal(outside(1100, 0, 100, 100), true);
  assert.equal(outside(0, -200, 100, 100), true);
  assert.equal(outside(0, 700, 100, 100), true);
  assert.equal(outside(-50, 0, 100, 100), false);
  assert.equal(outside(-120, 0, 100, 100, { customMotionIntensity: 1 }), false);
  assert.equal(outside(0, 610, 100, 100, { bobY: -8 }), false);
  assert.equal(outside(NaN, 0, 100, 100), false);
  assert.equal(outside(0, 0, -1, 100), false);
  runtime.debugDecorCullingDisabled = true;
  assert.equal(outside(1100, 0, 100, 100), false);
  debug = false;
  assert.equal(outside(1100, 0, 100, 100), true);
});

test("contact shadow geometry cache invalidates for placement, assets, masks, floor and tuning", () => {
  const item = { decorKey: "rock", scale: 1, xNorm: 0.5, yNorm: 0.9 };
  const decor = { path: "rock", width: 100 }, image = { width: 100, height: 200 };
  const runtime = { decorMap: new Map([["rock", decor]]), images: new Map([["rock", image]]) };
  let floor = 500, depth = 1, darkness = 1, objectScale = 1, mask = {}, builds = 0;
  const c = context({ runtime, TANK_WIDTH: 1000, TANK_HEIGHT: 600, WATER_SURFACE_Y: 20,
    isDebugModeEnabled: () => true, getDecorVisibleImagePaths: () => ["rock"],
    getImageAlphaMask: () => mask, getDecorTankLayer: () => 1,
    getDecorDisplayWidth: () => objectScale * item.scale * decor.width,
    getTankLayerBottomBoundaryY: () => floor, getTankDepthShadowStrength: () => depth,
    getDebugGroundShadowDarknessMultiplier: () => darkness, getDecorMotionCapabilities: () => ({}),
    getDecorContactShadowMetrics: () => ({ build: ++builds }) });
  load(c, "rendering/decor.js", ["getCachedDecorContactShadowMetrics"]);
  const query = () => c.getCachedDecorContactShadowMetrics(item);
  assert.equal(query(), query());
  assert.equal(builds, 1);
  for (const mutate of [() => { item.xNorm = 0.6; }, () => { item.scale = 2; },
    () => { item.flipped = true; }, () => { mask = {}; }, () => { floor += 5; },
    () => { depth = 0.8; }, () => { darkness = 1.3; }, () => { objectScale = 1.4; },
    () => { image.height = 250; }, () => { runtime.images.set("rock", { width: 100, height: 250 }); },
    () => { decor.width = 120; }]) {
    const before = query();
    mutate();
    assert.notEqual(query(), before);
    assert.equal(query(), query());
  }
  runtime.debugDecorShadowCacheDisabled = true;
  assert.notEqual(query(), query());
});

test("decor performance toggles are debug-only and reset profiler comparisons", () => {
  const runtime = {};
  let debug = false, resets = 0, renders = 0;
  const c = context({ runtime, Date, isDebugModeEnabled: () => debug,
    resetDebugFrameProfiler: () => resets++, renderControls: () => renders++ });
  load(c, "debug/tools.js", ["toggleDebugDecorPerformanceOption"]);
  assert.equal(c.toggleDebugDecorPerformanceOption("debugDecorReducedSwayEnabled"), false);
  debug = true;
  assert.equal(c.toggleDebugDecorPerformanceOption("unrelatedFlag"), false);
  assert.equal(c.toggleDebugDecorPerformanceOption("debugDecorReducedSwayEnabled"), true);
  assert.equal(c.toggleDebugDecorPerformanceOption("debugDecorReducedSwayEnabled"), false);
  assert.equal(resets, 2);
  assert.equal(renders, 2);
});

test("shadow geometry caching avoids reading companion artwork masks for grounded primary art", () => {
  const item = { decorKey: "rock" }, decor = { path: "front", shadowFootprintPath: "footprint" };
  const runtime = { decorMap: new Map([["rock", decor]]), images: new Map() };
  const reads = [], mask = { bounds: {} };
  const c = context({ runtime, TANK_WIDTH: 1000, TANK_HEIGHT: 600, WATER_SURFACE_Y: 20,
    getImageAlphaMask: path => { reads.push(path); return mask; },
    getDecorVisibleImagePaths: () => { throw Error("unnecessary companion masks"); },
    getDecorTankLayer: () => 1, getDecorDisplayWidth: () => 100,
    getTankLayerBottomBoundaryY: () => 500, getTankDepthShadowStrength: () => 1,
    getDebugGroundShadowDarknessMultiplier: () => 1, getDecorMotionCapabilities: () => ({}),
    getDecorContactShadowMetrics: () => ({}) });
  load(c, "rendering/decor.js", ["getCachedDecorContactShadowMetrics"]);
  c.getCachedDecorContactShadowMetrics(item);
  assert.deepEqual(reads, ["front", "footprint"]);
});

test("bounded surface queries match full scans, including flips and pixel-center boundaries", () => {
  const c = context({ ALPHA_HIT_THRESHOLD: 16 });
  load(c, "decor/hit-testing.js", ["getDecorSurfaceMarkedYAtWorldX"]);
  function original(r, x, y1, y2, target) {
    if (!r || x < r.left || x > r.left + r.width) return null;
    const u = Math.min(1, Math.max(0, (x - r.left) / Math.max(1, r.width)));
    const sx = Math.min(r.mask.width - 1, Math.max(0, Math.floor((r.flipX ? 1 - u : u) * r.mask.width)));
    let nearest = null, distance = Infinity;
    for (let y = 0; y < r.mask.height; y++) {
      const worldY = r.top + ((y + 0.5) / r.mask.height) * r.height;
      if (worldY < Math.min(y1, y2) || worldY > Math.max(y1, y2)) continue;
      const sy = r.flipY ? r.mask.height - 1 - y : y;
      if (r.mask.alpha[(sy * r.mask.width + sx) * 4 + 3] < 16) continue;
      if (Math.abs(worldY - target) < distance) { nearest = worldY; distance = Math.abs(worldY - target); }
    }
    return nearest;
  }
  let seed = 0x124ab;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 5000; i++) {
    const width = 1 + Math.floor(random() * 16), height = 1 + Math.floor(random() * 256);
    const r = { left: random() * 100 - 50, top: random() * 100 - 50,
      width: random() * 400 + 0.01, height: random() * 500 + 0.01,
      flipX: random() < 0.5, flipY: random() < 0.5,
      mask: { width, height, alpha: Uint8Array.from({ length: width * height * 4 }, () => Math.floor(random() * 256)) } };
    const x = r.left + random() * r.width;
    const y1 = i % 3 === 0 ? r.top + ((Math.floor(random() * height) + 0.5) / height) * r.height : r.top + random() * r.height;
    const y2 = y1 + (random() - 0.5) * r.height, target = r.top + random() * r.height;
    assert.equal(c.getDecorSurfaceMarkedYAtWorldX(r, x, y1, y2, target), original(r, x, y1, y2, target));
  }
  const r = { left: 0, top: 0, width: 1, height: 1024, mask: { width: 1, height: 1024, alpha: new Uint8Array(4096).fill(255) } };
  for (const height of [0, -1, NaN, Infinity, 0.001, 1024]) {
    r.height = height;
    for (const y1 of [-Infinity, NaN, 500]) assert.equal(c.getDecorSurfaceMarkedYAtWorldX(r, 0.5, y1, Infinity, 505), original(r, 0.5, y1, Infinity, 505));
  }
});

test("normal fish draw depth stays stable when legacy compatibility fields change near caves", () => {
  const runtime = {};
  const c = context({ runtime, isFishInCaveRenderSublayer: fish => fish.caveState === "inside",
    getFishTankDepthZ: fish => fish.z,
    getLegacyTankDepthPositionFromZ: z => z > 0.6 ? ({ layer: 2, subLayer: 1 }) : ({ layer: 3, subLayer: 3 }),
    getFishTankLayer: fish => fish.tankLayer, getFishTankSubLayer: fish => fish.tankSubLayer,
    clampTankLayer: x => x, getCaveBehaviorDecorById: () => ({ decorKey: "pot" }),
    getDecorTankLayer: () => 2, getDecorLayerSpan: () => ({ front: 2 }) });
  load(c, "rendering/fish-and-effects.js", ["getFishRenderPassLayer", "getFishRenderPassSubLayer"]);
  const fish = { z: 0.7, tankLayer: 2, tankSubLayer: 1 };
  for (let frame = 0; frame < 30; frame++) {
    fish.tankLayer = frame % 2 ? 3 : 2;
    fish.tankSubLayer = frame % 2 ? 3 : 1;
    assert.equal(c.getFishRenderPassLayer(fish), 2);
    assert.equal(c.getFishRenderPassSubLayer(fish), 1);
  }
  fish.z = 0.5;
  assert.equal(c.getFishRenderPassLayer(fish), 3);
  assert.equal(c.getFishRenderPassSubLayer(fish), 3);
  fish.caveState = "inside";
  assert.equal(c.getFishRenderPassLayer(fish), 2, "cave occupants keep their private sandwich");
  fish.caveState = "approach";
  fish.tankLayer = 1;
  assert.equal(c.getFishRenderPassLayer(fish), 3, "approaches follow physical Z until they reach the opening");
});

test("spatial shadow queries preserve every eligible receiver and reverse painter order", () => {
  let seed = 93211;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const receivers = Array.from({ length: 300 }, (_, index) => ({ left: random() * 20000 - 10000,
    width: index % 20 === 0 ? 15000 : random() * 1200, tankLayer: index % 5 + 1 }));
  const runtime = { shadowSurfaceReceivers: receivers };
  const c = context({ runtime, clampTankLayer: x => Math.min(5, Math.max(1, Math.round(Number(x) || 1))) });
  load(c, "rendering/decor.js", ["getShadowSurfaceCandidateIndices"]);
  for (let query = 0; query < 2000; query++) {
    const left = random() * 20000 - 10000, right = left + random() * 500;
    const layer = query % 7 === 0 ? undefined : query % 5 + 1;
    const candidates = c.getShadowSurfaceCandidateIndices(left, right, layer);
    const eligible = index => {
      const r = receivers[index];
      return (layer === undefined || r.tankLayer === layer)
        && Math.min(right, r.left + r.width) - Math.max(left, r.left) >= 2;
    };
    const full = receivers.map((_, index) => index).reverse().filter(eligible);
    assert.deepEqual(Array.from(candidates).filter(eligible), full);
    assert.equal(new Set(candidates).size, candidates.length);
  }
  assert.equal(c.getShadowSurfaceCandidateIndices(-Infinity, Infinity, 1), null);
  assert.equal(c.getShadowSurfaceCandidateIndices(1e30, 1e30, 1), null);
  assert.equal(c.getShadowSurfaceCandidateIndices(-20000, 20000, 1), null);
  const isolated = { shadowSurfaceReceivers: Array.from({ length: 300 }, (_, i) => ({ left: i * 256, width: 80, tankLayer: 1 })) };
  c.runtime = isolated;
  assert.deepEqual(Array.from(c.getShadowSurfaceCandidateIndices(10, 40, 1)), [0]);
});

test("shadow spatial indexing refreshes after moves and reuses geometry-neutral receiver replacements", () => {
  const runtime = { shadowSurfaceReceivers: [] };
  const c = context({ runtime, clampTankLayer: x => x, getPlacedDecorSurfaceReceiver: item => ({ item,
    left: item.x, width: 80, tankLayer: item.layer }) });
  load(c, "rendering/decor.js", ["registerDecorShadowSurface", "getShadowSurfaceCandidateIndices", "rebuildDecorShadowSurfaceReceivers"]);
  for (let i = 0; i < 30; i++) c.registerDecorShadowSurface({ id: i, x: i * 256, layer: 1 }, {});
  assert.deepEqual(Array.from(c.getShadowSurfaceCandidateIndices(10, 40, 1)), [0]);
  const index = runtime.shadowSurfaceSpatialIndex;
  c.registerDecorShadowSurface({ id: 0, x: 0, layer: 1, changed: true }, {});
  assert.equal(runtime.shadowSurfaceSpatialIndex, index);
  c.registerDecorShadowSurface({ id: 0, x: 5000, layer: 2 }, {});
  assert.equal(runtime.shadowSurfaceSpatialIndex, null);
  assert.deepEqual(Array.from(c.getShadowSurfaceCandidateIndices(10, 40, 1)), []);
  assert.ok(c.getShadowSurfaceCandidateIndices(5000, 5040, 2).includes(0));
  c.state = { placedDecor: [] };
  c.rebuildDecorShadowSurfaceReceivers();
  assert.equal(runtime.shadowSurfaceSpatialIndex, null);
});

test("shadow registration preserves insertion and replacement order without quadratic scans", () => {
  const runtime = { shadowSurfaceReceivers: [] };
  runtime.shadowSurfaceReceivers.findIndex = () => { throw Error("linear search"); };
  const c = context({ runtime, getPlacedDecorSurfaceReceiver: item => item.skip ? null : ({ item }) });
  load(c, "rendering/decor.js", ["registerDecorShadowSurface", "rebuildDecorShadowSurfaceReceivers"]);
  for (let i = 0; i < 100; i++) c.registerDecorShadowSurface({ id: i }, {});
  const replacement = { id: 0, updated: true };
  c.registerDecorShadowSurface(replacement, {});
  assert.equal(runtime.shadowSurfaceReceivers.length, 100);
  assert.equal(runtime.shadowSurfaceReceivers[0].item, replacement);
  assert.equal(runtime.shadowSurfaceReceivers[99].item.id, 99);
  runtime.shadowSurfaceReceivers = [{ item: { id: "a" } }, { item: { id: "a" } }];
  c.registerDecorShadowSurface({ id: "a", updated: true }, {});
  assert.equal(runtime.shadowSurfaceReceivers[0].item.updated, true);
  assert.equal(runtime.shadowSurfaceReceivers[1].item.updated, undefined);
  c.state = { placedDecor: [] };
  c.rebuildDecorShadowSurfaceReceivers();
  assert.equal(runtime.shadowSurfaceReceivers.length, 0);
  assert.equal(runtime.shadowSurfaceReceiverIndex.size, 0);
  c.registerDecorShadowSurface({ id: "new" }, {});
  assert.equal(runtime.shadowSurfaceReceivers[0].item.id, "new");
});

test("mixed-size surface shadows reuse one bounded canvas and crop the exact receiver viewport", () => {
  const image = {}, calls = [], sizes = { width: 0, height: 0 };
  let resizes = 0;
  const scratchContext = {
    clearRect: (...args) => calls.push(["clear", ...args]), save() {}, restore() {}, scale() {},
    translate: (...args) => calls.push(["translate", ...args]),
    createRadialGradient: () => ({ addColorStop() {} }), beginPath() {}, arc() {}, fill() {},
    drawImage: (...args) => calls.push(["mask", ...args])
  };
  const scratch = { getContext: () => scratchContext };
  for (const name of ["width", "height"]) Object.defineProperty(scratch, name, {
    get: () => sizes[name], set: value => { sizes[name] = value; resizes++; }
  });
  const runtime = { shadowSurfaceReceivers: [], surfaceShadowScratchCanvas: scratch };
  const tankContext = { save() {}, restore() {}, drawImage: (...args) => calls.push(["draw", ...args]) };
  const c = context({ runtime, tankContext, areDecorShadowsEnabled: () => true,
    isUsableRuntimeImage: () => true, clampTankLayer: x => x,
    getShadowReceiverPlaneY: () => 120, getShadowSurfaceCandidateIndices: () => null,
    getShadowSilhouetteCanvas: () => ({ shadowAlphaBounds: { maxY: 9 }, height: 10 }), drawProjectedSilhouette() {} });
  load(c, "rendering/decor.js", ["drawCasterShadowOnDecorSurfaces"]);
  for (const [width, height] of [[600, 200], [200, 700], [600, 200], [200, 700]]) {
    runtime.shadowSurfaceReceivers = [{ left: 0, top: 0, width, height, tankLayer: 1, image, flipX: true }];
    assert.equal(c.drawCasterShadowOnDecorSurfaces({ image, centerX: 100, bottomY: 100, width: 100, height: 100, tankLayer: 1 }), true);
    assert.deepEqual(calls.filter(call => call[0] === "draw").pop(), ["draw", scratch, 0, 0, width, height, 0, 0, width, height]);
    assert.deepEqual(calls.filter(call => call[0] === "mask").pop(), ["mask", image, 0, 0, width, height]);
    assert.ok(calls.some(call => call[0] === "translate" && call[1] === width && call[2] === 0));
  }
  assert.equal(resizes, 3, "only grows width/height to new maxima");
  assert.equal(scratch.width, 600);
  assert.equal(scratch.height, 700);
});

test("disabling decor shadows also skips fish/decor surface-shadow drawing and receiver queries", () => {
  const c = context({ runtime: {}, areDecorShadowsEnabled: () => false,
    getShadowSurfaceCandidateIndices: () => { throw Error("disabled shadows must not query receivers"); },
    isUsableRuntimeImage: () => { throw Error("disabled shadows must not prepare artwork"); } });
  load(c, "rendering/decor.js", ["drawCasterShadowOnDecorSurfaces"]);
  assert.equal(c.drawCasterShadowOnDecorSurfaces({}), false);
});

function lifecycleContext() {
  class Canvas { constructor() { this.width = this.naturalWidth = 64; this.height = this.naturalHeight = 32; } getContext() {} }
  const deletedBuffers = [], deletedTextures = [];
  const renderer = { gl: { deleteBuffer: buffer => deletedBuffers.push(buffer), deleteTexture: texture => deletedTextures.push(texture) },
    bodyGpuBuffers: new Map(), finGpuBuffers: new Map(), bodyGpuTextures: new Map(), finGpuTextures: new Map() };
  const runtime = { images: new Map(), imageLoadFailures: new Map(), imageRecoveryNextAt: new Map(), alphaMaskCache: new Map(), maskRegionCache: new Map(),
    depthVisualImageCache: new WeakMap(), fishTurnV26BodyShapeCache: new Map(), fishTurnV26FinShapeCache: new Map(), fishTurnV26RendererState: renderer };
  const c = context({ runtime, HTMLCanvasElement: Canvas });
  load(c, "rendering/fish-turn-v26.js", ["getFishTurnV26ImageCacheIdentity", "releaseFishTurnV26ImageResources", "releaseInactiveFishTurnV26FinResources"]);
  load(c, "assets/image-storage-and-import.js", ["releaseImageDerivedResources", "releaseRuntimeImage", "isUsableRuntimeImage"]);
  load(c, "core/utilities.js", ["releaseCachedCanvasValue"]);
  load(c, "assets/sprite-sheets.js", ["setBoundedSpriteFrameCache"]);
  function cacheImage(image) {
    const key = c.getFishTurnV26ImageCacheIdentity(image) + "|64x32";
    runtime.fishTurnV26BodyShapeCache.set(key, { bodyDistance: new Float32Array(5) });
    runtime.fishTurnV26FinShapeCache.set(key, { finLocal: new Float32Array(5) });
    renderer.bodyGpuBuffers.set(key, { distanceBuffer: key + "-distance", localBuffer: key + "-local" });
    renderer.finGpuBuffers.set(key, key + "-fin");
    renderer.bodyGpuTextures.set(key, key + "-body-texture");
    renderer.finGpuTextures.set(key, key + "-fin-texture");
    return key;
  }
  return { c, runtime, renderer, Canvas, deletedBuffers, deletedTextures, cacheImage };
}

test("artwork disposal releases its shapes, GPU resources and depth variants after the last alias", () => {
  const { c, runtime, renderer, Canvas, deletedBuffers, deletedTextures, cacheImage } = lifecycleContext();
  const source = new Canvas(), derived = new Canvas(), active = new Canvas(), highlight = new Canvas(), shadow = new Canvas();
  runtime.fishTopLightOverlayCache = new WeakMap([[source, highlight]]);
  runtime.shadowSilhouetteCache = new WeakMap([[source, shadow]]);
  const sourceKey = cacheImage(source), derivedKey = cacheImage(derived), activeKey = cacheImage(active);
  runtime.depthVisualImageCache.set(source, new Map([[1, source], [2, derived], [3, derived]]));
  runtime.images.set("source", source); runtime.images.set("alias", source); runtime.images.set("active", active);
  assert.equal(c.releaseRuntimeImage("source"), true);
  assert.equal(source.width, 64);
  assert.equal(deletedBuffers.length, 0);
  c.releaseRuntimeImage("alias");
  assert.equal(source.width, 0); assert.equal(derived.width, 0);
  assert.equal(source.naturalWidth, 0); assert.equal(source.naturalHeight, 0);
  assert.equal(c.isUsableRuntimeImage(source), false, "released crops must be decoded again on return");
  assert.equal(highlight.width, 0);
  assert.equal(shadow.width, 0);
  assert.equal(runtime.fishTopLightOverlayCache.has(source), false);
  assert.equal(runtime.depthVisualImageCache.has(source), false);
  assert.equal(runtime.fishTurnV26BodyShapeCache.has(sourceKey), false);
  assert.equal(runtime.fishTurnV26FinShapeCache.has(derivedKey), false);
  assert.equal(deletedBuffers.length, 6); assert.equal(deletedTextures.length, 4);
  assert.equal(renderer.bodyGpuTextures.has(activeKey), true);
  assert.equal(active.width, 64);
  assert.equal(c.releaseRuntimeImage("alias"), false);
});

test("separate live image elements sharing a URL keep shared turn resources", () => {
  const { c, runtime, renderer, Canvas, cacheImage } = lifecycleContext();
  const discarded = new Canvas(), active = new Canvas();
  discarded.src = active.src = "https://example.test/fish.webp";
  const key = cacheImage(discarded);
  runtime.images.set("discarded", discarded); runtime.images.set("active", active);
  c.releaseRuntimeImage("discarded");
  assert.equal(renderer.bodyGpuTextures.has(key), true);
  c.releaseRuntimeImage("active");
  assert.equal(renderer.bodyGpuTextures.size, 0);
});

test("stage layout skips visual rectangle measurement when logical dimensions exist", () => {
  class Element {}
  const stage = new Element();
  let measurements = 0;
  Object.assign(stage, { clientWidth: 1000, clientHeight: 700, getBoundingClientRect: () => { measurements++; return { width: 500, height: 350 }; } });
  const c = context({ runtime: {}, dom: { tankStage: stage }, HTMLElement: Element, TANK_WIDTH: 1600, TANK_HEIGHT: 900 });
  load(c, "assets/custom-content.js", ["getTankStageLayoutSize"]);
  for (let i = 0; i < 100; i++) assert.equal(c.getTankStageLayoutSize().width, 1000);
  assert.equal(measurements, 0);
  stage.clientHeight = 0;
  assert.equal(c.getTankStageLayoutSize().height, 350);
  assert.equal(measurements, 1);
  stage.clientWidth = 0; stage.getBoundingClientRect = () => null;
  assert.equal(c.getTankStageLayoutSize().width, 1600);
});

test("logical stage size is shared only during a render and survives render failures", () => {
  class Element {}
  const stage = new Element();
  let measurements = 0;
  Object.defineProperties(stage, {
    clientWidth: { get() { measurements++; return 1000; } },
    clientHeight: { get() { measurements++; return 700; } }
  });
  const c = context({ runtime: {}, dom: { tankStage: stage, tankCanvas: { style: {} }, grimeCanvas: { style: {} } },
    HTMLElement: Element, TANK_WIDTH: 1600, TANK_HEIGHT: 900, TANK_DEPTH_LAYERS: 5,
    TANK_SUBLAYER_BACK: 3, TANK_SUBLAYER_MIDDLE: 2, TANK_SUBLAYER_FRONT: 1,
    SUCKER_FISH_FRONT_GLASS_LAYER: 1, EFFECT_CLOUD_LAYER_FLOOR: 0, EFFECT_CLOUD_LAYER_FOOD: 1, EFFECT_CLOUD_LAYER_FRONT: 2,
    AUTO_DISPENSER_DEFAULT_TANK_LAYER: 1, state: {}, tankContext: { save() {}, restore() {} }, clampTankLayer: x => x });
  const render = readFunction("rendering/tank-and-water.js", "renderTank");
  const ast = ts.createSourceFile("render.js", render, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && !(node.expression.text in c)) c[node.expression.text] = () => {};
    ts.forEachChild(node, visit);
  }
  visit(ast);
  load(c, "assets/custom-content.js", ["getTankStageLayoutSize"]);
  load(c, "rendering/tank-and-water.js", ["renderTank"]);
  c.drawFish = () => { for (let i = 0; i < 100; i++) assert.equal(c.getTankStageLayoutSize().width, 1000); };
  c.renderTank(1);
  assert.equal(measurements, 2);
  assert.equal(c.runtime.tankStageRenderLayout, undefined);
  c.getTankStageLayoutSize();
  assert.equal(measurements, 4);
  c.drawFish = () => { throw Error("draw failure"); };
  assert.throws(() => c.renderTank(2), /draw failure/);
  assert.equal(c.runtime.tankStageRenderLayout, undefined);
  c.getTankStageLayoutSize();
  assert.equal(measurements, 8);
});

test("a canvas larger than its cache budget remains drawable for its caller", () => {
  const c = context({ runtime: {} });
  load(c, "core/utilities.js", ["getCachedCanvasBytes", "releaseCachedCanvasValue", "setBoundedCanvasCache"]);
  const cache = new Map(), canvas = () => ({ width: 1024, height: 1024, getContext() {} });
  const old = canvas(), next = canvas();
  c.setBoundedCanvasCache(cache, "old", old, { maxBytes: 1024 * 1024 });
  assert.equal(old.width, 1024);
  c.setBoundedCanvasCache(cache, "next", next, { maxBytes: 1024 * 1024 });
  assert.equal(old.width, 0);
  assert.equal(next.width, 1024);
  assert.equal(cache.size, 1);
});

test("small recolors stay warm within the unchanged 48 MiB pixel budget", () => {
  let created = 0;
  const c = context({ runtime: { images: new Map(), caveTintCache: new Map() },
    document: { createElement() { created++; return { width: 0, height: 0, getContext() { return {
      clearRect() {}, drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([100, 150, 200, 255]) }; }, putImageData() {}
    }; } }; } },
    normalizeHexColor: x => x, hexToRgb: () => ({ r: 100, g: 150, b: 200 }), rgbToHsl: () => ({ h: 0, s: .5, l: .5 }),
    hslToRgb: () => ({ r: 50, g: 100, b: 150 }), getCaveLayerSourceStats: () => ({ avgHue: 0 }),
    getHueDeltaUnit: () => 0, normalizeHueUnit: x => x });
  load(c, "core/utilities.js", ["getCachedCanvasBytes", "releaseCachedCanvasValue", "setBoundedCanvasCache"]);
  load(c, "rendering/gravel-and-effects.js", ["getTintedCaveLayerImage"]);
  c.runtime.images.set("fish", { width: 512, height: 384 });
  for (let frame = 0; frame < 3; frame++) for (let i = 0; i < 30; i++) assert.equal(c.getTintedCaveLayerImage("fish", "color-" + i).width, 512);
  assert.equal(created, 30);
  assert.equal(c.runtime.caveTintCache.size, 30);
  for (let i = 30; i < 100; i++) c.getTintedCaveLayerImage("fish", "color-" + i);
  assert.ok([...c.runtime.caveTintCache.values()].reduce((n, image) => n + image.width * image.height * 4, 0) <= 48 * 1024 * 1024);
});

test("depth invalidation retires old body textures while retaining meshes and fins", () => {
  const deleted = [], renderer = { gl: { deleteTexture: t => deleted.push(t) }, bodyGpuTextures: new Map(), finGpuTextures: new Map([["fin", "fin"]]), bodyGpuBuffers: new Map([["mesh", "mesh"]]) };
  const c = context({ runtime: { fishTurnV26RendererState: renderer, depthVisualImageCache: new WeakMap() } });
  load(c, "rendering/depth-visuals.js", ["invalidateTankDepthVisualCaches"]);
  for (let i = 0; i < 100; i++) { renderer.bodyGpuTextures.set("body", i); c.invalidateTankDepthVisualCaches(); assert.equal(renderer.bodyGpuTextures.size, 0); }
  assert.equal(deleted.length, 100);
  assert.equal(renderer.finGpuTextures.get("fin"), "fin");
  assert.equal(renderer.bodyGpuBuffers.get("mesh"), "mesh");
});

test("volume drawing and the caustic mask crop the same bottom-origin viewport", () => {
  const image = { width: 1000, height: 800, fishTurnV26RenderWidth: 600, fishTurnV26RenderHeight: 400 };
  const calls = [], maskCalls = [];
  const drawContext = { globalAlpha: 1, save() {}, restore() {}, scale() {}, drawImage: (...args) => calls.push(args) };
  const mask = { drawImage: (...args) => maskCalls.push(args) };
  const c = context({ runtime: { lightweightCausticFrameEnabled: true }, tankContext: drawContext,
    FISH_TURN_V26_RENDER_PADDING_X: 2.75, FISH_TURN_V26_RENDER_PADDING_Y: 3.5,
    renderFishTurnV26VolumeCanvas: () => image, getFishFacingDirection: () => -1,
    setLightweightCausticMaskTransform: () => mask });
  load(c, "rendering/fish-turn-v26.js", ["drawFishTurnV26VolumeMesh"]);
  load(c, "rendering/tank-and-water.js", ["markLightweightCausticImage"]);
  c.drawFishTurnV26VolumeMesh(drawContext, image, image, -100, 200, 100, {}, 1, {
    alpha: .8, onRenderedVolumeCanvas: r => c.markLightweightCausticImage(drawContext, r.canvas, r.drawX, r.drawY, r.drawWidth, r.drawHeight, r.alpha, r.sourceWidth, r.sourceHeight)
  });
  assert.deepEqual(calls[0], [image, 0, 400, 600, 400, -275, -175, 550, 350]);
  assert.deepEqual(maskCalls[0], calls[0]);
  assert.equal(mask.globalAlpha, .8);
});

test("unavailable WebGL animates both facing directions and completes the terminal handoff", () => {
  const source = files.get("rendering/fish-and-effects.js") || ts.createSourceFile("fish.js", fs.readFileSync(path.join(root, "rendering/fish-and-effects.js"), "utf8"), ts.ScriptTarget.Latest, true);
  let fallback;
  function visit(node) {
    if (ts.isIfStatement(node) && node.expression.getText(source) === "!renderedByV26") fallback = node.thenStatement.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(fallback);
  for (const fromDirection of [-1, 1]) for (const progress of [.1, .5, 1]) {
    const scales = [], drawn = [], marked = [];
    const c = context({ fish: {}, now: 2000, depthRenderImage: {}, fishDrawX: -50, width: 100, spriteHeight: 40,
      FISH_TURN_MIN_SCALE_X: 0.16, FISH_TURN_MAX_SCALE_Y: 1.1,
      tankContext: { save() {}, restore() {}, translate() {}, scale: x => scales.push(x), drawImage: (...args) => drawn.push(args) },
      getFishHorizontalTurnState: () => ({ active: true, reversing: true, progress, fromDirection, toDirection: -fromDirection }),
      markFishTurnRendererFallback() {},
      markLightweightCausticImage() {}, markFishTurnFinalFrameRendered: (...args) => marked.push(args) });
    load(c, "rendering/fish-and-effects.js", ["getFishLightweightTurnFallbackVisualState", "drawFishLightweightTurnFallbackFrame"]);
    vm.runInContext(fallback, c);
    const expected = (progress < 0.5 ? fromDirection : -fromDirection) * (1 - Math.sin(progress * Math.PI) * 0.84);
    assert.ok(Math.abs(scales[0] - expected) < 1e-10);
    assert.equal(drawn.length, 1);
    assert.equal(marked.length, progress < 1 ? 0 : 1);
  }
});

test("repeated artwork retirement leaves no turn cache growth", () => {
  const { c, runtime, renderer, Canvas, deletedBuffers, cacheImage } = lifecycleContext();
  for (let i = 0; i < 100; i++) {
    const image = new Canvas(); cacheImage(image); runtime.images.set("temporary", image);
    c.releaseRuntimeImage("temporary");
  }
  for (const cache of [runtime.fishTurnV26BodyShapeCache, runtime.fishTurnV26FinShapeCache,
    renderer.bodyGpuBuffers, renderer.finGpuBuffers, renderer.bodyGpuTextures, renderer.finGpuTextures]) assert.equal(cache.size, 0);
  assert.equal(deletedBuffers.length, 300);
});

test("retiring one artwork path releases its recolors and keeps active recolors warm", () => {
  const { c, runtime, renderer, Canvas, cacheImage } = lifecycleContext();
  const old = new Canvas(), active = new Canvas(), oldTint = new Canvas(), activeTint = new Canvas();
  cacheImage(oldTint); const activeKey = cacheImage(activeTint);
  runtime.images.set("old", old); runtime.images.set("active", active);
  runtime.caveTintCache = new Map([["old|#ff0000|hue", oldTint], ["active|#00ff00|hue", activeTint]]);
  c.releaseRuntimeImage("old");
  assert.equal(oldTint.width, 0); assert.equal(activeTint.width, 64);
  assert.equal(runtime.caveTintCache.size, 1);
  assert.equal(renderer.bodyGpuTextures.has(activeKey), true);
});

test("sprite crop eviction also releases derived GPU resources", () => {
  const { c, runtime, renderer, Canvas, cacheImage } = lifecycleContext();
  const cache = new Map();
  for (let i = 0; i < 97; i++) {
    const image = new Canvas(); cacheImage(image); runtime.images.set(String(i), image);
    c.setBoundedSpriteFrameCache(cache, String(i), image);
  }
  assert.equal(cache.size, 96); assert.equal(runtime.images.has("0"), false);
  assert.equal(renderer.bodyGpuTextures.size, 96);
});

test("fin discovery cleanup retains active atlas crops and pending loads", () => {
  const { c, runtime, Canvas, cacheImage } = lifecycleContext();
  const active = new Canvas(), old = new Canvas(); cacheImage(active); const oldKey = cacheImage(old);
  runtime.fishTurnV26FinDiscoveryCache = new Map([
    ["active", { status: "ready", image: active, sourceImage: new Canvas() }],
    ["old", { status: "ready", image: old, sourceImage: new Canvas() }],
    ["pending", { status: "pending", promise: Promise.resolve() }]
  ]);
  c.getSpeciesForFish = () => ({});
  c.resolveFishTurnV26FinAssetCandidate = () => ({ path: "fin-atlas", key: "current" });
  c.getFishTurnV26FinCandidateCacheKey = candidate => candidate.key;
  const keep = new Set(); c.releaseInactiveFishTurnV26FinResources([{ turnV26FinOverlayEnabled: true, turnV26FinOverlayCacheKey: "active", turnV26FinOverlayPath: "active-atlas" }], keep);
  assert.equal(keep.has("fin-atlas"), true); assert.equal(active.width, 64); assert.equal(old.width, 0);
  assert.equal(runtime.fishTurnV26FinDiscoveryCache.has("pending"), true);
  assert.equal(runtime.fishTurnV26BodyShapeCache.has(oldKey), false);
});

test("alpha masks keep independent RGBA readback without another full-image copy", () => {
  const pixels = Uint8ClampedArray.from([42, 23, 11, 255, 0, 0, 0, 0]);
  const scratch = { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels }) }) };
  const runtime = { images: new Map([["image", { width: 2, height: 1 }]]), alphaMaskCache: new Map(), maskRegionCache: new Map() };
  const c = context({ runtime, document: { createElement: () => scratch }, ALPHA_MASK_GRID_SIZE: 4, ALPHA_HIT_THRESHOLD: 16 });
  load(c, "assets/image-storage-and-import.js", ["getImageAlphaMask", "buildAlphaMaskFromBuffer", "setBoundedAlphaMask", "getAlphaMaskByteSize", "getMaxAlphaMaskCacheBytes"]);
  const mask = c.getImageAlphaMask("image");
  assert.equal(mask.alpha, pixels); assert.equal(mask.alpha[0], 42); assert.equal(mask.bounds.maxX, 0);
  assert.equal(scratch.width, 0); assert.equal(scratch.height, 0);
  assert.equal(c.getImageAlphaMask("image"), mask);
  scratch.getContext = () => ({ drawImage() { throw new Error("unreadable"); } });
  runtime.alphaMaskCache.clear();
  assert.throws(() => c.getImageAlphaMask("image"), /unreadable/);
  assert.equal(scratch.width, 0); assert.equal(scratch.height, 0);
});

test("caustic base inversion is reused while every local transform stays live", () => {
  let inversions = 0, multiplies = 0;
  class Matrix {
    constructor(values) { this.values = values; }
    inverse() { inversions++; const [s, , , , x, y] = this.values; return { multiply(source) {
      multiplies++; return { a: source.a / s, b: source.b / s, c: source.c / s, d: source.d / s, e: (source.e - x) / s, f: (source.f - y) / s };
    } }; }
  }
  let current = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 };
  let transform;
  const mask = { scale: 0.25, context: { setTransform: (...args) => { transform = args; } } };
  const runtime = { stageRenderScale: 2, stageRenderOffsetX: 10, stageRenderOffsetY: 20 };
  const c = context({ runtime, DOMMatrix: Matrix, getLightweightCausticMask: () => mask });
  load(c, "rendering/tank-and-water.js", ["setLightweightCausticMaskTransform"]);
  for (let i = 0; i < 100; i++) { current = { ...current, a: i % 2 ? -2 : 2, e: 10 + i }; c.setLightweightCausticMaskTransform({ getTransform: () => current }); }
  assert.equal(inversions, 1); assert.equal(multiplies, 100);
  assert.deepEqual(transform, [-0.25, 0, 0, 0.25, 99 / 8, 0]);
  runtime.stageRenderScale = 1.5; c.setLightweightCausticMaskTransform({ getTransform: () => current });
  assert.equal(inversions, 2);
  runtime.stageRenderOffsetX = 10.00000001; c.setLightweightCausticMaskTransform({ getTransform: () => current });
  assert.equal(inversions, 3);
});
