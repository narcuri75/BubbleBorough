"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "game/public/app-src");
const parsedFiles = new Map();

function parsed(relative) {
  if (!parsedFiles.has(relative)) parsedFiles.set(relative, ts.createSourceFile(relative,
    fs.readFileSync(path.join(sourceRoot, relative), "utf8"), ts.ScriptTarget.Latest, true));
  return parsedFiles.get(relative);
}
function load(context, relative, names) {
  const source = parsed(relative);
  for (const name of names) {
    const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, `${name} exists`);
    vm.runInContext(node.getText(source), context);
  }
}
function context(stubs) {
  return vm.createContext({ Math, Number, Object, Array, Map, WeakMap, Float64Array, ...stubs });
}

test("profiler separates rendered FPS from callbacks and respects deliberate caps", () => {
  let clock = 0;
  let cap = 32;
  let paused = false;
  const overlay = {};
  const runtime = { debugFrameProfilerEnabled: true, boroughOverviewOpen: true,
    lastAnimationFrameAt: 1000, lastAnimationUpdateAt: 1000, wallpaperEngineFpsCarrySeconds: 0,
    frameProfilerSamples: [], frameProfilerLongFrameCount: 0, frameProfilerLastOverlayAt: 0,
    frameProfilerLastTickMs: 0, frameProfilerLastDeferredUiMs: 0, frameProfilerLastSaveMs: 0, frameProfilerLastUiRenderMs: 0 };
  const c = context({ runtime, document: { hidden: false }, window: { requestAnimationFrame() {} },
    performance: { now: () => clock }, ensureDebugFrameProfilerOverlay: () => overlay,
    isWallpaperEnginePauseActive: () => paused, getEffectiveAnimationFpsLimit: () => cap,
    advanceDebugSimulationClock: value => value, updateAmbienceAudioLoop() {}, renderBoroughOverviewFish() {} });
  load(c, "debug/tools.js", ["beginDebugFrameProfile", "finishDebugFrameProfile", "endDebugFrameProfilerSection",
    "recordDebugFrameProfilerDuration", "getDebugFrameProfilerAverage", "updateDebugFrameProfilerOverlay"]);
  load(c, "ui/scene-controls-and-animation.js", ["animationLoop"]);
  for (let frame = 1; frame <= 64; frame++) { clock = 1000 + frame * 15.625; c.animationLoop(clock); }
  c.updateDebugFrameProfilerOverlay(true);
  assert.equal(runtime.frameProfilerSamples.length, 32);
  assert.match(overlay.textContent, /FPS 32\.0 rendered.*frame 31\.3 ms.*RAF 15\.6 ms/);
  assert.match(overlay.textContent, /p95/);
  assert.equal(runtime.frameProfilerLongFrameCount, 0);
  paused = true; clock += 1000; c.animationLoop(clock);
  paused = false; clock += 31.25; c.animationLoop(clock);
  assert.equal(runtime.frameProfilerLongFrameCount, 0, "pause is not a slow rendered frame");
  cap = 0; clock += 100; c.animationLoop(clock);
  assert.equal(runtime.frameProfilerSamples.at(-1).renderGapMs, 100, "measurement is not clipped to the physics timestep");
  assert.equal(runtime.frameProfilerLongFrameCount, 1);
  clock += 2500; c.animationLoop(clock);
  assert.equal(runtime.frameProfilerSamples.at(-1).rafGapMs, 2500, "callback measurements are not clipped to the FPS carry timestep");
});

test("decoration buckets preserve precise painter order across every repeated layer pass", () => {
  let spanReads = 0;
  let depthReads = 0;
  const visits = [];
  const fishlessState = { placedDecor: Array.from({ length: 100 }, (_, i) => ({ id: `d-${i}`, decorKey: `d-${i}`,
    z: (i % 10) / 10, yNorm: (i % 7) / 10, layer: i % 5 + 1, bubbler: i % 3 === 0 })) };
  const spans = new Map(fishlessState.placedDecor.map((item, i) => [item.decorKey,
    { min: Math.max(1, item.layer - (i % 2)), max: item.layer, front: item.layer }]));
  const c = context({ state: fishlessState, runtime: { decorMap: { get: key => { visits.push(key); return null; } } },
    TANK_DEPTH_LAYERS: 5, DEFAULT_TANK_SUBLAYER: 0, getTankDepthZFromLegacyPosition: () => 0,
    sanitizeTankDepthZ: z => { depthReads++; return z; }, getDecorTankLayer: item => item.layer,
    canConfigureDecorBubbler: item => item.bubbler,
    getDecorLayerSpan: key => { spanReads++; return spans.get(key); } });
  load(c, "rendering/decor.js", ["getDecorSameLayerRenderPriority", "getDecorRenderDepthZ", "comparePlacedDecorDrawOrder",
    "getPlacedDecorRenderOrder", "preparePlacedDecorRenderFrame", "drawDecor"]);
  const expected = [...fishlessState.placedDecor].sort(c.comparePlacedDecorDrawOrder);
  const frame = c.preparePlacedDecorRenderFrame();
  const readsAfterPreparation = depthReads;
  assert.equal(spanReads, 100);
  for (let layer = 5; layer >= 1; layer--) {
    const order = expected.filter(item => layer >= spans.get(item.decorKey).min && layer <= spans.get(item.decorKey).max).map(item => item.decorKey);
    for (const pass of ["cave-back", "cave-back", "cave-front", "base"]) {
      visits.length = 0;
      c.drawDecor(layer, 1000, { pass, frameCache: frame });
      assert.deepEqual(visits, order);
    }
  }
  assert.equal(depthReads, readsAfterPreparation, "no cache-key scans or subset sorts during the 20 passes");
  assert.equal(spanReads, 100, "layer selection is computed once");
  fishlessState.placedDecor = [{ id: "a", decorKey: "a", z: 0.50000001, yNorm: 0.5 }, { id: "b", decorKey: "b", z: 0.50000002, yNorm: 0.5 }];
  assert.equal(c.getPlacedDecorRenderOrder()[0].id, "a");
  fishlessState.placedDecor[0].z = 0.50000003;
  assert.equal(c.getPlacedDecorRenderOrder()[0].id, "b", "tiny depth edits invalidate exact order");
});

function lookupContext(fish, pellets = []) {
  const c = context({ runtime: {}, state: { fish, floatingPellets: pellets }, isFishDead: fish => Boolean(fish.dead) });
  load(c, "fish/needs-disease-and-behavior.js", ["rebuildFishFrameLookup", "getFishByIdFast", "invalidateFishSchoolFollowerLookup",
    "getFishSchoolFollowerCandidates", "getFloatingPelletByIdFast"]);
  load(c, "fish/gravel-and-schooling.js", ["getFishSchoolFollowLeader", "getFishSchoolActiveFollowers"]);
  load(c, "fish/health.js", ["clearFishSchoolFollowState"]);
  return c;
}

test("fish and food lookups survive removals, replacements, duplicate IDs and tank switches", () => {
  const a = { id: "a" }, b = { id: "b" }, p = { id: "p" };
  const c = lookupContext([a, b], [p]);
  assert.equal(c.getFishByIdFast("a"), a);
  const replacement = { id: "a" };
  c.state.fish[0] = replacement;
  assert.equal(c.getFishByIdFast("a"), replacement);
  c.state.fish[1] = { id: "new" };
  assert.equal(c.getFishByIdFast("new"), c.state.fish[1]);
  assert.equal(c.getFishByIdFast("b"), null);
  c.state.fish.push(b); assert.equal(c.getFishByIdFast("b"), b);
  c.state.fish.splice(0, 1); assert.equal(c.getFishByIdFast("a"), null);
  c.state.fish = [a, { id: "a" }]; assert.equal(c.getFishByIdFast("a"), a);
  c.state.fish = []; assert.equal(c.getFishByIdFast("a"), null);
  assert.equal(c.getFloatingPelletByIdFast("p"), p);
  const newP = { id: "p" }; c.state.floatingPellets[0] = newP;
  assert.equal(c.getFloatingPelletByIdFast("p"), newP);
  c.state.floatingPellets[0] = { id: "q" };
  assert.equal(c.getFloatingPelletByIdFast("q"), c.state.floatingPellets[0]);
  assert.equal(c.getFloatingPelletByIdFast("p"), null);
  c.state.floatingPellets = []; assert.equal(c.getFloatingPelletByIdFast("q"), null);
});

test("follower index stays live for expiry, death, cleared relationships and new relationships", () => {
  const leader = { id: "l" }, other = { id: "other" };
  const a = { id: "a", followFishId: "l", followUntil: 2000 };
  const b = { id: "b", followFishId: "l", followUntil: 1200 };
  const c = lookupContext([leader, other, a, b]);
  const ids = now => Array.from(c.getFishSchoolActiveFollowers(leader, now), fish => fish.id);
  assert.deepEqual(ids(1000), ["a", "b"]);
  const groups = c.runtime.fishSchoolFollowersByLeaderId;
  assert.deepEqual(ids(1500), ["a"]);
  assert.equal(c.runtime.fishSchoolFollowersByLeaderId, groups);
  a.dead = true; assert.deepEqual(ids(1500), []);
  a.dead = false; c.clearFishSchoolFollowState(a); assert.deepEqual(ids(1000), ["b"]);
  load(c, "fish/gravel-and-schooling.js", ["requestFishSchoolingRelationship"]);
  Object.assign(c, { getSpeciesForFish: () => ({}), isFishEligibleSchoolLeader: () => true,
    SCHOOL_MAX_FOLLOWERS: 4, SAME_SPECIES_FOLLOW_MIN_MS: 2000, SAME_SPECIES_FOLLOW_MAX_MS: 4000,
    SCHOOL_FORMATION_MIN_MS: 2000, SCHOOL_FORMATION_MAX_MS: 4000, randomBetween: min => min,
    getFishSchoolLeaderFormationDirection: () => 1, assignFishSchoolFormationDepthSlot() {}, assignFishSchoolFormationSlot() {} });
  c.getFishSchoolActiveFollowers(other, 2000); // Populate the empty leader bucket before the request.
  assert.equal(c.requestFishSchoolingRelationship(a, other, 2000), a);
  assert.equal(c.getFishSchoolActiveFollowers(other, 2000)[0], a);
  assert.equal(c.getFishSchoolFollowLeader(a), other);
  c.state.fish = [leader]; assert.deepEqual(ids(1000), []);
});

function swimContext(relative = "rendering/fish-and-effects.js") {
  const configSource = parsed("00-bootstrap.js");
  const declaration = configSource.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(item => item.name.getText(configSource) === "FISH_SWIM_ANIMATION"));
  const c = context({ runtime: { fishSwimSliceProfileCache: new Map(), fishSwimAnimationDebugMetrics: new Map() }, state: { fish: [] },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)), isDebugModeEnabled: () => true,
    shouldUseFishSwimDepthWarp: () => true, getFishSwimAnimationSpeedMultiplier: () => 0.9,
    getImageAlphaMask: key => key === "cropped" ? { width: 128, bounds: { minX: 14, maxX: 114 } } : null });
  vm.runInContext(declaration.getText(configSource) + "\nglobalThis.config = FISH_SWIM_ANIMATION;", c);
  load(c, relative, ["smoothFishSwimStep", "getFishSwimSliceProfile", "normalizeFishSwimAnimationPhase",
    "getFishSwimSliceCount", "getFishSwimOpaqueHorizontalBounds", "drawFishSwimDepthWarpImage"]);
  if (parsed(relative).statements.some(node => node.name?.text === "getFishSwimFrameGeometry")) load(c, relative, ["getFishSwimFrameGeometry"]);
  c.getFishSwimAnimationState = () => c.animationState;
  return c;
}

function swimCoordinates(c) {
  const output = [];
  const fish = { id: "fish", name: "Test" }, species = { id: "test" };
  for (const [presetId, preset] of Object.entries(c.config.presets)) {
    for (const width of [30, 65, 120, 210]) {
      for (const quality of [undefined, "highlight", "borough"]) {
        c.animationState = { ...preset, presetId, swimAnimationPhase: width / 23 };
        const argumentsList = [];
        const drawing = { drawImage: (_, ...args) => argumentsList.push(args) };
        const image = { width: 256, height: 128 };
        const options = { quality, imagePath: width % 2 ? "cropped" : "", fishCount: width === 210 ? 30 : 1 };
        c.drawFishSwimDepthWarpImage(drawing, image, -width / 2, -width / 4, width, width / 2, fish, species, 1000, options);
        const first = argumentsList.slice(); argumentsList.length = 0;
        c.drawFishSwimDepthWarpImage(drawing, { ...image }, -width / 2, -width / 4, width, width / 2, fish, species, 1000, options);
        assert.deepEqual(argumentsList, first, "alternate-image pass uses identical coordinates");
        output.push(first);
      }
    }
  }
  return output;
}

test("swim drawing matches pre-optimization coordinates for all eight presets and qualities", () => {
  const coordinates = swimCoordinates(swimContext());
  // Golden digest of every drawImage coordinate from the original renderer:
  // 96 cases covering sizes, cropped/full artwork, crowded density and quality.
  assert.equal(createHash("sha256").update(JSON.stringify(coordinates)).digest("hex"), "f1cc2c2587811b6ead98355869c2323dbcd96340b237f1394fc979e8ee216cd6");
});

test("swim geometry reuses matching passes and invalidates pose, dimensions, time and frame", () => {
  const c = swimContext();
  let builds = 0;
  c.runtime.debugFrameProfilerEnabled = true;
  c.incrementDebugFrameProfilerCounter = name => { if (name === "fishSwimGeometryBuilds") builds++; };
  const fish = { id: "f" }, species = { id: "s" }, image = { width: 128, height: 64 };
  c.animationState = { ...c.config.presets.regular, swimAnimationPhase: 1 };
  const draws = [];
  const draw = (now = 1000, width = 80, options = {}) => {
    draws.length = 0;
    c.drawFishSwimDepthWarpImage({ drawImage: (_, ...args) => draws.push(args) }, image, -40, -20, width, 40, fish, species, now, options);
    return c.runtime.fishSwimFrameGeometryCache.get(fish);
  };
  let frame = draw(); const geometry = frame.entries[0]; const original = JSON.stringify(draws);
  assert.equal(draw().entries[0], geometry);
  c.animationState.swimAnimationPhase = 1.2; draw(); assert.equal(frame.entries.length, 2); assert.notEqual(JSON.stringify(draws), original);
  draw(1000, 90); assert.equal(frame.entries.length, 3);
  draw(1000, 80, { quality: "highlight" }); assert.equal(frame.entries.length, 4);
  const buffers = frame.entries.map(entry => entry.rectangles);
  const sourceLayouts = frame.entries.map(entry => entry.sourceLayout);
  const buildsBeforeNextFrame = builds;
  draw(1001);
  assert.equal(builds, buildsBeforeNextFrame + 1);
  assert.ok(buffers.includes(frame.entries.find(entry => entry.used).rectangles), "next frame reuses storage");
  assert.ok(sourceLayouts.includes(frame.entries.find(entry => entry.used).sourceLayout), "next frame keeps the source layout");
  draw(1001); assert.equal(builds, buildsBeforeNextFrame + 1);
  c.runtime.fishSwimGeometryRenderFrame = 2; draw(1001);
  assert.equal(builds, buildsBeforeNextFrame + 2, "new rendered frame rebuilds even at an unchanged simulation timestamp");
  for (let i = 0; i < 20; i++) draw(1001, 80 + i);
  assert.equal(c.runtime.fishSwimFrameGeometryCache.get(fish).entries.length, 8);
});

module.exports = { swimContext, swimCoordinates, parsedFiles };
