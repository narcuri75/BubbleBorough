"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const v26Source = read("public/app-src/rendering/fish-turn-v26.js");
const rendererSource = read("public/app-src/rendering/fish-and-effects.js");
const mealsSource = read("public/app-src/fish/meals-and-needs.js");
const turnSource = read("public/app-src/rendering/fish-motion-and-floor.js");
const debugSource = read("public/app-src/debug/tools.js");
const bootstrapSource = read("public/app-src/00-bootstrap.js");
const predatorMotionSource = read("public/app-src/fish/predators-and-motion.js");
const draggingSource = read("public/app-src/decor/placement-and-dragging.js");
const boroughSource = read("public/app-src/borough/living-borough.js");
const appearanceSource = read("public/app-src/fish/undead-and-appearance.js");
const gravelSchoolingSource = read("public/app-src/fish/gravel-and-schooling.js");
const diseaseSource = read("public/app-src/fish/needs-disease-and-behavior.js");
const contract = read("docs/fish-turn-movement-contract.md");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function makeRgbaFromMask(mask) {
  const rgba = new Uint8Array(mask.length * 4);
  mask.forEach((value, index) => {
    rgba[index * 4] = 180;
    rgba[index * 4 + 1] = 120;
    rgba[index * 4 + 2] = 80;
    rgba[index * 4 + 3] = value ? 255 : 0;
  });
  return rgba;
}

const mathContext = {
  Float32Array,
  Uint16Array,
  Uint8Array,
  Math,
  Number,
  Array,
  FISH_TURN_V26_MESH_COLUMNS: 96,
  FISH_TURN_V26_MESH_ROWS: 48,
  FISH_TURN_V26_ALPHA_CUTOFF: 7,
  FISH_TURN_V26_VOLUME_LAYERS: 5,
  FISH_TURN_V26_INTERIOR_ALPHA: 0.16,
  FISH_TURN_V26_THICKNESS: 43,
  FISH_TURN_V26_EDGE_ON_THICKNESS_BOOST: 1.52,
  FISH_TURN_V26_FACE_HEAD_THICKNESS: 200,
  FISH_TURN_V26_EDGE_CLOSURE: 100,
  FISH_TURN_V26_EDGE_REACH: 26,
  FISH_TURN_V26_EDGE_ROUNDNESS: 68,
  FISH_TURN_V26_END_THINNING: 100,
  FISH_TURN_V26_MID_BODY_FULLNESS: 100,
  FISH_TURN_V26_CROSS_SECTION: 100,
  FISH_TURN_V26_RENDER_PADDING_X: 2.75,
  FISH_TURN_V26_RENDER_PADDING_Y: 3.5,
  FISH_TURN_V26_CONTINUITY_ENTRY_PROGRESS: 0.14,
  FISH_TURN_V26_CONTINUITY_EXIT_PROGRESS: 0.82,
  FISH_TURN_V26_Z_AXIS_BODY_FLEX: 92,
  FISH_TURN_V26_TAIL_FOLLOW_THROUGH: 48,
  FISH_TURN_V26_SPINE_EPSILON: 0.010,
  FISH_TURN_V26_FIN_DISTANCE: 18,
  FISH_TURN_V26_FIN_FRONT_ATTACHMENT_DISTANCE: 34,
  FISH_TURN_V26_FIN_TAPER: 72,
  FISH_TURN_V26_DEFAULT_STYLE: "head-led",
  FISH_TURN_V26_TRAJECTORY_UNIT_SCALE: 210,
  FISH_TURN_V26_MAX_MODEL_SCALE: 2.2,
  FISH_TURN_V26_RENDER_MAX_DIM: 1024,
  FISH_TURN_V26_FOV_DEGREES: 42,
  FISH_TURN_V26_CAMERA_Z: -5.2,
  FISH_TURN_V26_FULL_QUALITY_MAX_SIMULTANEOUS: 8,
  FISH_TURN_V26_REDUCED_QUALITY_MAX_SIMULTANEOUS: 16,
  FISH_TURN_V26_REDUCED_VOLUME_LAYERS: 3,
  FISH_TURN_V26_STRESS_VOLUME_LAYERS: 2,
  FISH_SWIM_ANIMATION: { sourceOrientation: "right-facing" },
  clamp: (value, min, max) => Math.max(min, Math.min(max, value))
};
mathContext.buildFishTurnV26MeshData = vm.runInNewContext(
  `(${extractFunction(v26Source, "buildFishTurnV26MeshData")})`,
  mathContext
);
mathContext.buildFishTurnV26BinaryMask = vm.runInNewContext(
  `(${extractFunction(v26Source, "buildFishTurnV26BinaryMask")})`,
  mathContext
);
mathContext.buildFishTurnV26DistanceField = vm.runInNewContext(
  `(${extractFunction(v26Source, "buildFishTurnV26DistanceField")})`,
  mathContext
);
mathContext.buildFishTurnV26ColumnMax = vm.runInNewContext(
  `(${extractFunction(v26Source, "buildFishTurnV26ColumnMax")})`,
  mathContext
);
mathContext.sampleFishTurnV26ScalarFieldBilinear = vm.runInNewContext(
  `(${extractFunction(v26Source, "sampleFishTurnV26ScalarFieldBilinear")})`,
  mathContext
);
mathContext.sampleFishTurnV26ColumnMax = vm.runInNewContext(
  `(${extractFunction(v26Source, "sampleFishTurnV26ColumnMax")})`,
  mathContext
);
mathContext.buildFishTurnV26VertexShapeData = vm.runInNewContext(
  `(${extractFunction(v26Source, "buildFishTurnV26VertexShapeData")})`,
  mathContext
);
mathContext.getFishTurnV26LayerCoordinates = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26LayerCoordinates")})`,
  mathContext
);
mathContext.getFishTurnV26BodyRenderPasses = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26BodyRenderPasses")})`,
  mathContext
);
mathContext.getFishTurnV26SourceDirection = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26SourceDirection")})`,
  mathContext
);
mathContext.normalizeFishTurnV26Style = vm.runInNewContext(
  `(${extractFunction(v26Source, "normalizeFishTurnV26Style")})`,
  mathContext
);
mathContext.easeFishTurnV26CubicInOut = vm.runInNewContext(
  `(${extractFunction(v26Source, "easeFishTurnV26CubicInOut")})`,
  mathContext
);
mathContext.easeFishTurnV26Sine = vm.runInNewContext(
  `(${extractFunction(v26Source, "easeFishTurnV26Sine")})`,
  mathContext
);
mathContext.easeFishTurnV26Continuity = vm.runInNewContext(
  `(${extractFunction(v26Source, "easeFishTurnV26Continuity")})`,
  mathContext
);
mathContext.createFishTurnV26MotionTimingProfile = vm.runInNewContext(
  `(${extractFunction(v26Source, "createFishTurnV26MotionTimingProfile")})`,
  mathContext
);
mathContext.getFishTurnV26MotionTimingProfile = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26MotionTimingProfile")})`,
  mathContext
);
mathContext.getFishTurnV26TimedProgress = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26TimedProgress")})`,
  mathContext
);
mathContext.getFishTurnV26VisualProgress = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26VisualProgress")})`,
  mathContext
);
mathContext.getFishTurnV26ApparentThicknessScale = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26ApparentThicknessScale")})`,
  mathContext
);
mathContext.getFishHorizontalTurnState = (fish, now) => ({
  active: Boolean(fish?.turnStartedAt) && Number(fish?.turnDurationMs) > 0,
  progress: Math.max(0, Math.min(1, (now - fish.turnStartedAt) / fish.turnDurationMs)),
  fromDirection: Number(fish?.turnFromDirection) < 0 ? -1 : 1,
  toDirection: Number(fish?.turnToDirection) < 0 ? -1 : 1
});
mathContext.getFishTurnV26VisualContinuity = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26VisualContinuity")})`,
  mathContext
);
mathContext.getFishTurnV26StyleDefinition = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26StyleDefinition")})`,
  mathContext
);
mathContext.computeFishTurnV26StyleTransform = vm.runInNewContext(
  `(${extractFunction(v26Source, "computeFishTurnV26StyleTransform")})`,
  mathContext
);
mathContext.computeFishTurnV26SpinePoint = vm.runInNewContext(
  `(${extractFunction(v26Source, "computeFishTurnV26SpinePoint")})`,
  mathContext
);
mathContext.computeFishTurnV26SpineFrame = vm.runInNewContext(
  `(${extractFunction(v26Source, "computeFishTurnV26SpineFrame")})`,
  mathContext
);
mathContext.getFishTurnV26ModelScale = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26ModelScale")})`,
  mathContext
);
mathContext.getFishTurnV26ThicknessShapeAtUv = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26ThicknessShapeAtUv")})`,
  mathContext
);
mathContext.projectFishTurnV26UvPoint = vm.runInNewContext(
  `(${extractFunction(v26Source, "projectFishTurnV26UvPoint")})`,
  mathContext
);
mathContext.getFishTurnV26CompanionFinAssetPath = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26CompanionFinAssetPath")})`,
  mathContext
);
mathContext.computeFishTurnV26FinGap = vm.runInNewContext(
  `(${extractFunction(v26Source, "computeFishTurnV26FinGap")})`,
  mathContext
);
mathContext.getFishTurnV26FinRenderSides = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26FinRenderSides")})`,
  mathContext
);
mathContext.getFishTurnV26VolumeLayerCountForActiveTurns = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26VolumeLayerCountForActiveTurns")})`,
  mathContext
);
mathContext.getFishTurnV26StressBudget = vm.runInNewContext(
  `(${extractFunction(v26Source, "getFishTurnV26StressBudget")})`,
  mathContext
);

test("v26 retains the approved 96 x 48 continuous UV mesh", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_MESH_COLUMNS = 96;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_MESH_ROWS = 48;/);
  const mesh = mathContext.buildFishTurnV26MeshData();
  assert.equal(mesh.columns, 96);
  assert.equal(mesh.rows, 48);
  assert.equal(mesh.vertexCount, 97 * 49);
  assert.equal(mesh.indexCount, 96 * 48 * 6);
  assert.deepEqual(Array.from(mesh.uv.slice(0, 2)), [0, 0]);
  assert.deepEqual(Array.from(mesh.uv.slice(-2)), [1, 1]);
  assert.deepEqual(Array.from(mesh.indices.slice(0, 6)), [0, 97, 1, 1, 97, 98]);
});

test("universal complex turning ignores legacy species and per-fish simple defaults", () => {
  const context = {
    String,
    Number,
    getSpeciesForFish: () => ({ turnAnimation: "simple", type: "tetra" }),
    areSimpleTurnAnimationsForced: () => false
  };
  const getConfigured = vm.runInNewContext(`(${extractFunction(mealsSource, "getConfiguredFishTurnAnimationMode")})`, context);
  context.getConfiguredFishTurnAnimationMode = getConfigured;
  const getMode = vm.runInNewContext(`(${extractFunction(mealsSource, "getFishTurnAnimationMode")})`, context);

  assert.equal(getConfigured({ turnAnimation: "simple", type: "tetra" }), "complex");
  assert.equal(getMode({ turnAnimationPreference: "simple" }, { turnAnimation: "simple", type: "tetra" }), "complex");

  context.areSimpleTurnAnimationsForced = () => true;
  const getFallbackMode = vm.runInNewContext(`(${extractFunction(mealsSource, "getFishTurnAnimationMode")})`, context);
  assert.equal(getFallbackMode({}, { turnAnimation: "complex", type: "whale" }), "simple");
});

test("phase 15 promotes v26 to the production complex renderer", () => {
  assert.match(v26Source, /function getFishTurnRendererBackend\(fish, species = getSpeciesForFish\(fish\)\)/);
  assert.match(v26Source, /if \(animationMode !== "complex"\) \{\s*return "simple";/);
  assert.match(v26Source, /const configured = normalizeFishTurnRendererBackend\(configuredRaw, "v26"\);/);
  assert.match(v26Source, /return configured === "simple" \? "simple" : "v26";/);
  assert.match(v26Source, /normalized === "legacy-complex"[\s\S]*return "v26";/);
  assert.match(contract, /v26 is the production complex-turn renderer/i);
});

test("phase 15 keeps one v26 complex-turn eligibility contract", () => {
  assert.match(v26Source, /function isFishComplexTurnRendererEligible\(/);
  assert.match(v26Source, /pose\.isDead/);
  assert.match(v26Source, /suckerViewTransition/);
  assert.match(v26Source, /effectiveBehavior === "sucker" && !suckerFreeSwimming/);
  assert.match(v26Source, /if \(!turnState\.active \|\| !turnState\.reversing\)/);
  assert.match(v26Source, /getFishTurnRendererBackend\(fish, species\) === "v26"/);
  assert.doesNotMatch(rendererSource, /shouldUseFishTurnRigForSprite|drawFishTurnaroundRig/);
});

test("phase 4 installs the approved body-volume defaults", () => {
  const expected = [
    ["FISH_TURN_V26_ALPHA_CUTOFF", "7"],
    ["FISH_TURN_V26_PROCESSING_MAX_DIM", "512"],
    ["FISH_TURN_V26_VOLUME_LAYERS", "5"],
    ["FISH_TURN_V26_THICKNESS", "43"],
    ["FISH_TURN_V26_FACE_HEAD_THICKNESS", "200"],
    ["FISH_TURN_V26_EDGE_CLOSURE", "100"],
    ["FISH_TURN_V26_EDGE_REACH", "26"],
    ["FISH_TURN_V26_EDGE_ROUNDNESS", "68"],
    ["FISH_TURN_V26_END_THINNING", "100"],
    ["FISH_TURN_V26_MID_BODY_FULLNESS", "100"],
    ["FISH_TURN_V26_CROSS_SECTION", "100"],
    ["FISH_TURN_V26_FOV_DEGREES", "42"],
    ["FISH_TURN_V26_CAMERA_Z", "-5.2"]
  ];
  for (const [name, value] of expected) {
    assert.match(bootstrapSource, new RegExp(`const ${name} = ${value.replace(".", "\\.")};`));
  }
});

test("binary mask uses alpha only and the approved alpha cutoff", () => {
  const rgba = new Uint8Array([
    255, 255, 255, 0,
    0, 0, 0, 7,
    10, 200, 40, 8,
    255, 0, 255, 255
  ]);
  const mask = mathContext.buildFishTurnV26BinaryMask(rgba, 4, 1, 7);
  assert.deepEqual(Array.from(mask), [0, 0, 1, 1]);
});

test("8-neighbor chamfer distance field closes at the real alpha boundary", () => {
  const width = 7;
  const height = 7;
  const opaqueMask = new Uint8Array(width * height).fill(1);
  const distance = mathContext.buildFishTurnV26DistanceField(opaqueMask, width, height);
  assert.equal(distance[0], 0);
  assert.equal(distance[3 * width], 0);
  assert.equal(distance[1 * width + 1], 1);
  assert.equal(distance[2 * width + 2], 2);
  assert.equal(distance[3 * width + 3], 3);

  const holeMask = new Uint8Array(width * height).fill(1);
  holeMask[3 * width + 3] = 0;
  const holeDistance = mathContext.buildFishTurnV26DistanceField(holeMask, width, height);
  assert.equal(holeDistance[3 * width + 3], 0);
  assert.equal(holeDistance[3 * width + 2], 0, "opaque neighbor touching transparent hole is a boundary");
});

test("per-column maxima and vertex local profile use the approved column normalization", () => {
  const width = 7;
  const height = 7;
  const mask = new Uint8Array(width * height).fill(1);
  const distance = mathContext.buildFishTurnV26DistanceField(mask, width, height);
  const columnMax = mathContext.buildFishTurnV26ColumnMax(distance, width, height);
  assert.ok(Math.abs(columnMax[0] - 0.0001) < 0.000001);
  assert.equal(columnMax[1], 1);
  assert.equal(columnMax[2], 2);
  assert.equal(columnMax[3], 3);

  const mesh = mathContext.buildFishTurnV26MeshData(2, 2);
  const shape = mathContext.buildFishTurnV26VertexShapeData(distance, columnMax, width, height, mesh);
  const centerVertex = 4;
  assert.equal(shape.bodyDistance[centerVertex], 3);
  assert.equal(shape.bodyLocal[centerVertex], 1);
  assert.equal(shape.bodyDistance[0], 0);
  assert.equal(shape.bodyLocal[0], 0);
});

test("preprocessing stays full-canvas, caps at 512, and caches asset-level shape data", () => {
  assert.match(v26Source, /Math\.min\(1, FISH_TURN_V26_PROCESSING_MAX_DIM \/ Math\.max\(imageWidth, imageHeight\)\)/);
  assert.match(v26Source, /context\.drawImage\(image, 0, 0, width, height\);/);
  assert.match(v26Source, /runtime\.fishTurnV26BodyShapeCache = new Map\(\);/);
  assert.match(v26Source, /if \(cache\.has\(cacheKey\)\) \{\s*return cache\.get\(cacheKey\);/);
  assert.doesNotMatch(v26Source, /getImageData\([^)]*alphaBounds/i);
});

test("volume shader uses exact v26 edge, cross-section, end-thinning, and thickness equations", () => {
  assert.match(v26Source, /float edge01 = clamp\(a_bodyDist \/ max\(u_edgeReach, 0\.001\), 0\.0, 1\.0\);/);
  assert.match(v26Source, /float edgePower = mix\(2\.6, 0\.42, u_edgeRoundness\);/);
  assert.match(v26Source, /float edgeShape = mix\(1\.0, roundedEdge, u_edgeClosure\);/);
  assert.match(v26Source, /float localPower = mix\(1\.55, 0\.50, u_crossSection\);/);
  assert.match(v26Source, /float crossShape = pow\(clamp\(a_bodyLocal, 0\.0, 1\.0\), localPower\);/);
  assert.match(v26Source, /float lengthShape = pow\(center, mix\(1\.95, 0\.75, u_midBodyFullness\)\);/);
  assert.match(v26Source, /float bodyShape = mix\(1\.0, lengthShape, u_endThinning\);/);
  assert.match(v26Source, /float faceMask = smoothstep\(0\.10, 0\.90, h\);/);
  assert.match(v26Source, /float faceBoost = 1\.0 \+ 1\.25 \* u_faceThickness \* faceMask;/);
  assert.match(v26Source, /bodyShape = min\(bodyShape \* faceBoost, 1\.35\);/);
  assert.match(v26Source, /float thicknessShape = edgeShape \* crossShape \* bodyShape;/);
  assert.match(v26Source, /float depth = u_layer \* u_thickness \* thicknessShape;/);
  assert.match(
    v26Source,
    /\(FISH_TURN_V26_THICKNESS \/ 450\) \* getFishTurnV26ApparentThicknessScale\(turnProgress\)/
  );
});

test("phase 2 keeps edge-on v26 turns visibly thick without changing endpoint scale", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_EDGE_ON_THICKNESS_BOOST = 1\.52;/);
  assert.equal(mathContext.getFishTurnV26ApparentThicknessScale(0), 1);
  assert.equal(mathContext.getFishTurnV26ApparentThicknessScale(1), 1);
  assert.ok(
    mathContext.getFishTurnV26ApparentThicknessScale(0.5) >= 1.5,
    "mid-turn thickness should receive a meaningful edge-on boost"
  );
  assert.match(
    extractFunction(v26Source, "projectFishTurnV26UvPoint"),
    /getFishTurnV26ApparentThicknessScale\(turnProgress\)/
  );
});

test("phase 2 latches subtle per-turn acceleration, deceleration, and midpoint variation", () => {
  const samples = [0, 0.5, 1];
  const profile = mathContext.createFishTurnV26MotionTimingProfile(() => samples.shift());
  assert.ok(profile.midpoint >= 0.465 && profile.midpoint <= 0.535);
  assert.ok(profile.entryPower >= 0.90 && profile.entryPower <= 1.12);
  assert.ok(profile.exitPower >= 0.90 && profile.exitPower <= 1.12);

  const fish = { turnV26MotionTiming: { midpoint: 0.535, entryPower: 1.12, exitPower: 0.90 } };
  assert.equal(mathContext.getFishTurnV26TimedProgress(fish, 0), 0);
  assert.equal(mathContext.getFishTurnV26TimedProgress(fish, 1), 1);
  assert.ok(
    mathContext.getFishTurnV26TimedProgress(fish, 0.5) < 0.5,
    "later midpoint should delay the visual halfway pose"
  );
  assert.match(v26Source, /fish\.turnV26MotionTiming = createFishTurnV26MotionTimingProfile\(\);/);
  assert.match(v26Source, /fish\.turnV26MotionTiming = null;/);
});

test("phase 22 gives v26 a capped head-only depth boost and mirrored depth hemispheres", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_THICKNESS = 43;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_FACE_HEAD_THICKNESS = 200;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_TURN_DEPTH_MODE = "both";/);
  assert.match(v26Source, /function chooseFishTurnV26DepthSign\(fish\)/);
  assert.match(v26Source, /const turnDepthSign = getFishTurnV26DepthSign\(fish\);/);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_faceThickness, FISH_TURN_V26_FACE_HEAD_THICKNESS \/ 100\);/);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_turnDepthSign, turnDepthSign\);/);

  const away = mathContext.computeFishTurnV26StyleTransform("head-led", 0.5, 1, 1);
  const toward = mathContext.computeFishTurnV26StyleTransform("head-led", 0.5, 1, -1);
  assert.equal(away.motionX, toward.motionX, "depth side must not change horizontal trajectory");
  assert.equal(away.motionY, toward.motionY, "depth side must not change vertical trajectory");
  assert.equal(away.motionZ, -toward.motionZ, "depth side mirrors temporary visual Z motion");
  assert.equal(away.rotationYDegrees, -toward.rotationYDegrees, "depth side mirrors visual yaw");

  const awaySpine = mathContext.computeFishTurnV26SpinePoint(0.25, 0.5, 1, 1, 0, 1, 1, 1);
  const towardSpine = mathContext.computeFishTurnV26SpinePoint(0.25, 0.5, 1, 1, 0, 1, 1, -1);
  assert.ok(Math.abs(awaySpine.z + towardSpine.z) < 1e-9, "depth side mirrors spine curvature and tail wave");

  const width = 9;
  const mask = new Uint8Array(width * width).fill(1);
  const distanceField = mathContext.buildFishTurnV26DistanceField(mask, width, width);
  const columnMax = mathContext.buildFishTurnV26ColumnMax(distanceField, width, width);
  const shape = { distanceField, columnMax, processingWidth: width, processingHeight: width };
  const tail = mathContext.getFishTurnV26ThicknessShapeAtUv(shape, 0.12, 0.5, 1);
  const face = mathContext.getFishTurnV26ThicknessShapeAtUv(shape, 0.88, 0.5, 1);
  assert.ok(face.faceMask > tail.faceMask, "head boost is limited to the face end");
  assert.ok(face.bodyShape <= 1.35, "head boost remains capped before edge closure");
});

test("five-layer pass keeps bright outer skins and reduced-opacity shaded interiors", () => {
  assert.deepEqual(Array.from(mathContext.getFishTurnV26LayerCoordinates(5)), [-1, -0.5, 0, 0.5, 1]);
  const forward = mathContext.getFishTurnV26BodyRenderPasses(0, 5);
  assert.equal(forward.length, 5);
  assert.equal(forward[0].layer, -1);
  assert.equal(forward.at(-1).layer, 1);
  assert.equal(forward[0].alpha, 1);
  assert.equal(forward.at(-1).shade, 1);
  assert.equal(forward[1].alpha, 0.16);
  assert.equal(forward[2].shade, 0.9);
  assert.equal(forward[2].depthWrite, false);

  const reversed = mathContext.getFishTurnV26BodyRenderPasses(Math.PI, 5);
  assert.equal(reversed[0].layer, 1);
  assert.equal(reversed.at(-1).layer, -1);
});

test("fragment shader applies approved edge feathering and preserves outer source brightness", () => {
  assert.match(v26Source, /float edgeFeather = smoothstep\(0\.02, 0\.22, c\.a\);/);
  assert.match(v26Source, /if \(edgeFeather < 0\.01\) discard;/);
  assert.match(v26Source, /float finalAlpha = c\.a \* u_layerAlpha \* edgeFeather;/);
  assert.match(v26Source, /\{ layer: farSide, alpha: 1, shade: 1, depthWrite: true, outer: true \}/);
  assert.match(v26Source, /\{ layer: nearSide, alpha: 1, shade: 1, depthWrite: true, outer: true \}/);
});

test("phase 5 installs the approved continuous X/Z spine and tail-follow defaults", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_Z_AXIS_BODY_FLEX = 92;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_TAIL_FOLLOW_THROUGH = 48;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_SPINE_EPSILON = 0\.010;/);
  assert.match(v26Source, /float tailWeight = \(1\.0 - h\) \* 0\.5;/);
  assert.match(v26Source, /float B = sin\(FISH_TURN_PI \* t\);/);
  assert.match(v26Source, /float A = -1\.95 \* u_bodyFlex \* B \* u_bendScale \* u_sourceDirection \* u_turnDepthSign;/);
  assert.match(v26Source, /float xHead =|float xHead;/);
  assert.match(v26Source, /zArc = 2\.0 \* \(1\.0 - cos\(halfA \* h\)\) \/ signedA;/);
  assert.match(v26Source, /zArc \*= 1\.0 \+ u_bias \* h;/);
  assert.match(v26Source, /0\.165[\s\S]*u_tailFlex[\s\S]*u_waveScale[\s\S]*h \* 0\.92 - t \* u_waveSpeed/);
  assert.match(v26Source, /vec2 localNormal = vec2\(-tangent\.y, tangent\.x\);/);
  assert.match(v26Source, /vec2 surface = spinePosition \+ localNormal \* depth;/);
});

test("phase 5 spine resolves exactly back to the source axis at both turn endpoints", () => {
  for (const direction of [-1, 1]) {
    for (const sourceX of [-1, -0.5, 0, 0.5, 1]) {
      for (const t of [0, 1]) {
        const point = mathContext.computeFishTurnV26SpinePoint(sourceX, t, direction);
        assert.ok(Math.abs(point.x - sourceX) < 1e-9, `x should hand off cleanly at t=${t}`);
        assert.ok(Math.abs(point.z) < 1e-9, `z should hand off cleanly at t=${t}`);
        assert.ok(Math.abs(point.wave) < 1e-9, `tail wave should be zero at t=${t}`);
      }
    }
  }
});

test("phase 5 midpoint uses the approved negative bend and a tail-weighted follow-through", () => {
  const head = mathContext.computeFishTurnV26SpinePoint(1, 0.5, 1);
  const tail = mathContext.computeFishTurnV26SpinePoint(-1, 0.5, 1);
  const middle = mathContext.computeFishTurnV26SpinePoint(0, 0.5, 1);
  assert.ok(head.bendAmount < 0, "right-facing source uses the intentional negative bend direction");
  assert.equal(head.bendEnvelope, 1);
  assert.ok(Math.abs(head.wave) < 1e-12, "head has zero tail weight");
  assert.ok(Math.abs(tail.wave) > 0.01, "tail receives follow-through");
  assert.ok(Math.abs(middle.z) > 0.01, "mid-body is visibly displaced through visual Z");
});

test("phase 5 local normal stays perpendicular to the continuous spine tangent", () => {
  for (const sourceX of [-0.8, -0.25, 0.2, 0.75]) {
    const frame = mathContext.computeFishTurnV26SpineFrame(sourceX, 0.5, 1);
    const tangentLength = Math.hypot(frame.tangent.x, frame.tangent.z);
    const normalLength = Math.hypot(frame.normal.x, frame.normal.z);
    const dot = frame.tangent.x * frame.normal.x + frame.tangent.z * frame.normal.z;
    assert.ok(Math.abs(tangentLength - 1) < 1e-9);
    assert.ok(Math.abs(normalLength - 1) < 1e-9);
    assert.ok(Math.abs(dot) < 1e-9);
  }
});

test("phase 6 installs all four approved v26 style profiles", () => {
  const banked = mathContext.getFishTurnV26StyleDefinition("banked-flex");
  const tail = mathContext.getFishTurnV26StyleDefinition("tail-loaded-c-turn");
  const head = mathContext.getFishTurnV26StyleDefinition("head-led");
  const wide = mathContext.getFishTurnV26StyleDefinition("wide-fluid-u-turn");

  assert.deepEqual(
    [banked.bendScale, banked.bias, banked.waveScale, banked.waveSpeed, banked.yawEase],
    [1.05, 0, 0.36, 1.45, "cubic"]
  );
  assert.deepEqual(
    [tail.bendScale, tail.bias, tail.waveScale, tail.waveSpeed, tail.yawEase],
    [1.22, -0.22, 0.62, 1.85, "sine"]
  );
  assert.deepEqual(
    [head.bendScale, head.bias, head.waveScale, head.waveSpeed, head.yawEase],
    [1.10, 0.22, 0.28, 1.15, "sine"]
  );
  assert.deepEqual(
    [wide.bendScale, wide.bias, wide.waveScale, wide.waveSpeed, wide.yawEase],
    [1.05, 0, 0.36, 1.45, "sine"]
  );
  assert.equal(banked.testerId, 2);
  assert.equal(tail.testerId, 3);
  assert.equal(head.testerId, 4);
  assert.equal(wide.testerId, 9);
});

test("phase 6 style aliases preserve the tester IDs and production names", () => {
  assert.equal(mathContext.normalizeFishTurnV26Style("#2"), "banked-flex");
  assert.equal(mathContext.normalizeFishTurnV26Style("tester 3"), "tail-loaded-c-turn");
  assert.equal(mathContext.normalizeFishTurnV26Style("Head Led Turn"), "head-led");
  assert.equal(mathContext.normalizeFishTurnV26Style("wide u turn"), "wide-fluid-u-turn");
});

test("phase 6 turn transforms reproduce the approved trajectories at midpoint", () => {
  const banked = mathContext.computeFishTurnV26StyleTransform("banked-flex", 0.5, 1);
  assert.ok(Math.abs(banked.motionX - 35) < 1e-9);
  assert.ok(Math.abs(banked.motionY + 20) < 1e-9);
  assert.ok(Math.abs(banked.motionZ - 0.10) < 1e-9);
  assert.ok(Math.abs(banked.rotationXDegrees + 6) < 1e-9);
  assert.ok(Math.abs(banked.rotationYDegrees - 90) < 1e-9);
  assert.ok(Math.abs(banked.rotationZDegrees) < 1e-9);

  const tail = mathContext.computeFishTurnV26StyleTransform("tail-loaded-c-turn", 0.5, 1);
  assert.ok(Math.abs(tail.motionX - 55) < 1e-9);
  assert.ok(Math.abs(tail.motionY + 12) < 1e-9);
  assert.ok(Math.abs(tail.motionZ - 0.12) < 1e-9);
  assert.ok(Math.abs(tail.rotationYDegrees - 90) < 1e-9);
  assert.ok(Math.abs(tail.rotationZDegrees - 10) < 1e-9);

  const head = mathContext.computeFishTurnV26StyleTransform("head-led", 0.5, 1);
  assert.ok(Math.abs(head.motionX + 35) < 1e-9);
  assert.ok(Math.abs(head.motionY - 10) < 1e-9);
  assert.ok(Math.abs(head.motionZ - 0.08) < 1e-9);
  assert.ok(Math.abs(head.rotationXDegrees - 3) < 1e-9);
  assert.ok(Math.abs(head.rotationYDegrees - 90) < 1e-9);
  assert.ok(Math.abs(head.rotationZDegrees + 8) < 1e-9);

  const wide = mathContext.computeFishTurnV26StyleTransform("wide-fluid-u-turn", 0.5, 1);
  assert.ok(Math.abs(wide.motionX - 150) < 1e-9);
  assert.ok(Math.abs(wide.motionY + 68) < 1e-9);
  assert.ok(Math.abs(wide.motionZ - 0.18) < 1e-9);
  assert.ok(Math.abs(wide.rotationXDegrees + 6) < 1e-9);
  assert.ok(Math.abs(wide.rotationYDegrees - 90) < 1e-9);
  assert.ok(Math.abs(wide.rotationZDegrees) < 1e-9);
});

test("phase 6 trajectory units and source orientation mirror exactly", () => {
  const right = mathContext.computeFishTurnV26StyleTransform("wide-fluid-u-turn", 0.5, 1);
  const left = mathContext.computeFishTurnV26StyleTransform("wide-fluid-u-turn", 0.5, -1);
  assert.ok(Math.abs(right.translationX - 150 / 210) < 1e-12);
  assert.ok(Math.abs(right.translationY - 68 / 210) < 1e-12);
  assert.ok(Math.abs(right.translationZ - 0.18) < 1e-12);
  assert.ok(Math.abs(left.motionX + right.motionX) < 1e-9);
  assert.ok(Math.abs(left.rotationYDegrees + right.rotationYDegrees) < 1e-9);
  assert.ok(Math.abs(left.rotationZDegrees + right.rotationZDegrees) < 1e-9);
  assert.equal(left.motionY, right.motionY);
  assert.equal(left.motionZ, right.motionZ);
});

test("phase 6 all four styles begin and finish at the same render-space origin", () => {
  for (const style of ["banked-flex", "tail-loaded-c-turn", "head-led", "wide-fluid-u-turn"]) {
    const start = mathContext.computeFishTurnV26StyleTransform(style, 0, 1);
    const end = mathContext.computeFishTurnV26StyleTransform(style, 1, 1);
    for (const transform of [start, end]) {
      assert.ok(Math.abs(transform.translationX) < 1e-9);
      assert.ok(Math.abs(transform.translationY) < 1e-9);
      assert.ok(Math.abs(transform.translationZ) < 1e-9);
      assert.ok(Math.abs(transform.rotationXDegrees) < 1e-9);
      assert.ok(Math.abs(transform.rotationZDegrees) < 1e-9);
    }
    assert.ok(Math.abs(start.rotationYDegrees) < 1e-9);
    assert.ok(Math.abs(end.rotationYDegrees - 180) < 1e-9);
  }
});

test("phase 1 gives the complex turn sole visual ownership without a fade seam", () => {
  const fish = {
    turnStartedAt: 1000,
    turnDurationMs: 650,
    turnFromDirection: 1,
    turnToDirection: -1,
    turnV26EntryTilt: 0.31
  };
  const atStart = mathContext.getFishTurnV26VisualContinuity(fish, -0.28, 1000);
  assert.equal(atStart.meshAlpha, 1);
  assert.equal(atStart.spriteAlpha, 0);
  assert.equal(atStart.spriteDirection, 1);
  assert.ok(Math.abs(atStart.tilt - 0.31) < 1e-12);

  const middle = mathContext.getFishTurnV26VisualContinuity(fish, -0.28, 1325);
  assert.equal(middle.meshAlpha, 1);
  assert.equal(middle.spriteAlpha, 0);

  const nearEnd = mathContext.getFishTurnV26VisualContinuity(fish, -0.28, 1600);
  assert.equal(nearEnd.meshAlpha, 1);
  assert.equal(nearEnd.spriteAlpha, 0);
  assert.equal(nearEnd.spriteDirection, -1);
  assert.ok(nearEnd.tilt < 0.31 && nearEnd.tilt > -0.28);

  const atEnd = mathContext.getFishTurnV26VisualContinuity(fish, -0.28, 1650);
  assert.equal(atEnd.meshAlpha, 0);
  assert.equal(atEnd.spriteAlpha, 1);
  assert.equal(atEnd.spriteDirection, -1);
  assert.ok(Math.abs(atEnd.tilt + 0.28) < 1e-12);
});

test("phase 1 continuity is wired through the v26 session and renderer overlap", () => {
  assert.match(v26Source, /fish\.turnV26EntryTilt = Number\.isFinite\(Number\(previousVisualPose\?\.tilt\)\)/);
  assert.match(v26Source, /Number\.isFinite\(Number\(fish\.swimTilt\)\) \? Number\(fish\.swimTilt\) : 0/);
  assert.match(v26Source, /function getFishTurnV26VisualContinuity\(/);
  assert.match(v26Source, /context\.globalAlpha \*= Number\.isFinite\(requestedAlpha\)/);
  assert.match(rendererSource, /const v26VisualContinuity = v26TurnRendererActive/);
  assert.match(rendererSource, /tankContext\.rotate\(v26VisualContinuity\?\.tilt \?\? pose\.tilt\)/);
  assert.match(rendererSource, /alpha: v26VisualContinuity\?\.meshAlpha \?\? 1/);
  assert.match(rendererSource, /tankContext\.scale\(v26VisualContinuity\.spriteDirection, 1\)/);
});

test("phase 2 caustics receive the transformed v26 canvas rather than its flat source rectangle", () => {
  const waterSource = read("public/app-src/rendering/tank-and-water.js");
  assert.match(v26Source, /onRenderedVolumeCanvas\(\{[\s\S]*canvas: volumeCanvas/);
  assert.match(rendererSource, /onRenderedVolumeCanvas: \(\{ canvas, drawX, drawY, drawWidth, drawHeight, alpha \}\) => \{/);
  assert.match(rendererSource, /markLightweightCausticImage\(tankContext, canvas, drawX, drawY, drawWidth, drawHeight, alpha\)/);
  assert.match(waterSource, /function markLightweightCausticImage\(sourceContext, image, x, y, width, height, alpha = 1\)/);
  assert.match(waterSource, /context\.globalAlpha = clamp\(Number\(alpha\) \|\| 0, 0, 1\);/);
});

test("phase 6 shader applies the exact approved model transform order", () => {
  assert.match(v26Source, /Translation \* RotationZ \* RotationY \* RotationX \* Scale/);
  const scaleAt = v26Source.indexOf("position *= u_modelScale;");
  const rotateXAt = v26Source.indexOf("float cosX = cos(u_rotationX);");
  const rotateYAt = v26Source.indexOf("float cosY = cos(u_rotationY);");
  const rotateZAt = v26Source.indexOf("float cosZ = cos(u_rotationZ);");
  const translateAt = v26Source.indexOf("position += vec3(u_translationX, u_translationY, u_translationZ);");
  assert.ok(scaleAt < rotateXAt && rotateXAt < rotateYAt && rotateYAt < rotateZAt && rotateZAt < translateAt);
});

test("phase 6 retains actual perspective and pads the temporary render target for spatial trajectories", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_TRAJECTORY_UNIT_SCALE = 210;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_RENDER_PADDING_X = 2\.75;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_RENDER_PADDING_Y = 3\.5;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_RENDER_MAX_DIM = 1024;/);
  assert.match(v26Source, /const fovRadians = FISH_TURN_V26_FOV_DEGREES \* Math\.PI \/ 180;/);
  assert.match(v26Source, /position\.z \+= u_cameraZ;/);
  assert.match(v26Source, /float f = 1\.0 \/ tan\(u_fovRadians \* 0\.5\);/);
  assert.match(v26Source, /float clipW = -position\.z;/);
  assert.match(v26Source, /paddedDrawWidth = drawWidth \* FISH_TURN_V26_RENDER_PADDING_X/);
  assert.match(v26Source, /paddedDrawHeight = drawHeight \* FISH_TURN_V26_RENDER_PADDING_Y/);
});

test("phase 6 camera-safe model scaling preserves normal fish while protecting long fish", () => {
  const ordinary = mathContext.getFishTurnV26ModelScale(1);
  assert.ok(Math.abs(ordinary.modelScale - ordinary.uncappedModelScale) < 1e-12);
  assert.equal(ordinary.projectionCompensation, 1);

  const veryLong = mathContext.getFishTurnV26ModelScale(5.333);
  assert.equal(veryLong.modelScale, 2.2);
  assert.ok(veryLong.uncappedModelScale > Math.abs(mathContext.FISH_TURN_V26_CAMERA_Z));
  assert.ok(veryLong.projectionCompensation > 0 && veryLong.projectionCompensation < 0.25);
  assert.ok(
    veryLong.modelScale + 0.3 * veryLong.modelScale + 0.18 < Math.abs(mathContext.FISH_TURN_V26_CAMERA_Z),
    "capped long-fish geometry keeps generous body flex and forward Z motion in front of the camera"
  );
  assert.match(v26Source, /position\.x = \(position\.x - u_translationX\) \/ projectionCompensation \+ u_translationX;/);
  assert.match(v26Source, /position\.y = \(position\.y - u_translationY\) \/ projectionCompensation \+ u_translationY;/);
});

test("phase 6 style selection remains visual-only and does not write gameplay movement", () => {
  assert.match(v26Source, /function getFishTurnV26Style\(fish\)/);
  assert.match(v26Source, /fish\?\.turnV26Style \|\| fish\?\.turnStyle/);
  assert.doesNotMatch(v26Source, /\.xNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.yNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.targetXNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.targetYNorm\s*=/);
});

test("drawFish uses the base fish source art for v26 body geometry and depth-treated layer art for color", () => {
  assert.match(rendererSource, /drawFishTurnV26VolumeMesh\(\s*tankContext,\s*depthRenderImage,\s*image,/);
  assert.match(v26Source, /renderFishTurnV26VolumeCanvas\(textureImage, shapeImage, fish, now = Date\.now\(\), options = \{\}\)/);
  assert.match(v26Source, /preprocessFishTurnV26BodyShape\(shapeImage, renderer\.mesh\)/);
  assert.doesNotMatch(v26Source, /\.xNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.yNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.tankLayer\s*=/);
  assert.doesNotMatch(v26Source, /\.tankSubLayer\s*=/);
  assert.doesNotMatch(v26Source, /\.targetXNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.targetYNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.swimSpeed\s*=/);
});

test("phase 15 v26 failure preserves the live sprite without reviving simple turns", () => {
  assert.match(rendererSource, /if \(!renderedByV26\) \{[\s\S]*Keep the live sprite visible until/);
  assert.doesNotMatch(rendererSource, /if \(!renderedByV26\) \{[\s\S]*markFishTurnRendererFallback\(fish, "simple"\);/);
  assert.match(v26Source, /console\.warn\("Fish Turn v26 volume renderer failed; using the lightweight turn fallback\.", error\);/);
  assert.doesNotMatch(rendererSource, /drawFishTurnaroundRig/);
  assert.doesNotMatch(contract, /lightweight sprite turn is the emergency fallback/i);
});

test("phase 7 latches renderer backend and v26 style for the whole turn session", () => {
  const runtime = {
    fishTurnRendererBackendOverride: "v26",
    fishTurnV26StyleOverride: "wide-fluid-u-turn"
  };
  const context = {
    runtime,
    Date,
    Number,
    String,
    getSpeciesForFish: () => ({}),
    getFishTurnAnimationMode: (fish) => fish?.turnAnimationMode || "complex",
    beginFishTurnV26FinOverlaySession: () => false,
    clearFishTurnV26FinOverlaySession: () => {},
    createFishTurnV26MotionTimingProfile: () => ({ midpoint: 0.5, entryPower: 1, exitPower: 1 }),
    FISH_TURN_V26_DEFAULT_STYLE: "head-led",
    FISH_TURN_V26_TURN_DEPTH_MODE: "both",
    Math
  };
  context.normalizeFishTurnRendererBackend = vm.runInNewContext(`(${extractFunction(v26Source, "normalizeFishTurnRendererBackend")})`, context);
  context.getFishTurnRendererBackendOverride = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnRendererBackendOverride")})`, context);
  context.normalizeFishTurnV26Style = vm.runInNewContext(`(${extractFunction(v26Source, "normalizeFishTurnV26Style")})`, context);
  context.resolveFishTurnV26Style = vm.runInNewContext(`(${extractFunction(v26Source, "resolveFishTurnV26Style")})`, context);
  context.resolveFishTurnRendererBackend = vm.runInNewContext(`(${extractFunction(v26Source, "resolveFishTurnRendererBackend")})`, context);
  context.isFishTurnRendererSessionCurrent = vm.runInNewContext(`(${extractFunction(v26Source, "isFishTurnRendererSessionCurrent")})`, context);
  context.getFishTurnV26TurnDepthMode = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnV26TurnDepthMode")})`, context);
  context.chooseFishTurnV26DepthSign = vm.runInNewContext(`(${extractFunction(v26Source, "chooseFishTurnV26DepthSign")})`, context);
  context.beginFishTurnRendererSession = vm.runInNewContext(`(${extractFunction(v26Source, "beginFishTurnRendererSession")})`, context);
  context.getFishTurnRendererBackend = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnRendererBackend")})`, context);
  context.getFishTurnV26Style = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnV26Style")})`, context);
  context.markFishTurnRendererFallback = vm.runInNewContext(`(${extractFunction(v26Source, "markFishTurnRendererFallback")})`, context);

  const fish = { turnStartedAt: 1000, turnDurationMs: 900, turnAnimationMode: "complex" };
  assert.equal(context.beginFishTurnRendererSession(fish, {}, 1000), "v26");
  assert.equal(fish.turnRendererBackend, "v26");
  assert.equal(fish.turnRendererStartedAt, 1000);
  assert.equal(fish.turnV26StyleActive, "wide-fluid-u-turn");
  assert.ok(Math.abs(fish.turnV26ActiveDepthSign) === 1, "a v26 session latches one depth hemisphere");
  assert.equal(fish.turnV26LastDepthSign, fish.turnV26ActiveDepthSign);
  assert.equal(context.getFishTurnRendererBackend(fish, {}), "v26");
  assert.equal(context.getFishTurnV26Style(fish), "wide-fluid-u-turn");

  runtime.fishTurnRendererBackendOverride = "simple";
  runtime.fishTurnV26StyleOverride = "head-led";
  assert.equal(context.getFishTurnRendererBackend(fish, {}), "v26", "backend override cannot swap an active session");
  assert.equal(context.getFishTurnV26Style(fish), "wide-fluid-u-turn", "style override cannot swap an active session");

  assert.equal(context.markFishTurnRendererFallback(fish, "simple"), true);
  assert.equal(context.getFishTurnRendererBackend(fish, {}), "simple", "v26 failure is sticky for the current turn");
});

test("phase 7 renderer session is keyed to the active turn start and cannot leak into a later turn", () => {
  assert.match(v26Source, /function isFishTurnRendererSessionCurrent\(fish\)/);
  assert.match(v26Source, /rendererStartedAt === turnStartedAt/);
  assert.match(v26Source, /function beginFishTurnRendererSession\([\s\S]*animationModeOverride = null/);
  assert.match(v26Source, /fish\.turnRendererStartedAt = startedAt;/);
  assert.match(v26Source, /function clearFishTurnRendererSession\(fish\)/);
  assert.match(contract, /renderer and style configuration are intentionally resolved only at session start/i);
});


test("phase 24 production complex turns scale the 650 ms baseline while lightweight turns keep simple timing", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_DURATION_MS = 650;/);
  assert.match(mealsSource, /function getComplexFishTurnDurationMs\(fish, species, rendererBackend = null\)/);
  assert.match(mealsSource, /const normalizedBackend = normalizeFishTurnRendererBackend\(rendererBackend, "v26"\);/);
  assert.match(mealsSource, /if \(normalizedBackend === "simple"\) \{\s*return getSimpleFishTurnDurationMs\(fish, species\);/);
  assert.match(mealsSource, /FISH_TURN_V26_DURATION_MS \* turnDurationScale/);
  assert.match(mealsSource, /const variation = 0\.9 \+ Math\.random\(\) \* 0\.2/);

  const context = {
    FISH_TURN_V26_DURATION_MS: 650,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    normalizeFishTurnRendererBackend: (value, fallback = "v26") => String(value || fallback).toLowerCase() === "simple" ? "simple" : "v26",
    getSimpleFishTurnDurationMs: () => 185,
    getFishLocomotionProfile: () => ({ turnDurationScale: 1 }),
    normalizeFishSpeed: (species, value) => Number(value) || 0.05,
    getFishVisualSize: () => 0,
    Date,
    Math
  };
  const getComplexDuration = vm.runInNewContext(
    `(${extractFunction(mealsSource, "getComplexFishTurnDurationMs")})`,
    context
  );

  const v26Duration = getComplexDuration({ swimSpeed: 0.05 }, { speedMin: 0.02, speedMax: 0.08 }, "v26");
  assert.ok(v26Duration >= 420 && v26Duration <= 1120);
  assert.equal(getComplexDuration({}, { type: "whale" }, "simple"), 185);
});

test("phase 8 latches renderer ownership before choosing the active turn duration", () => {
  const setDirectionSource = extractFunction(turnSource, "setFishDirection");
  const sessionAt = setDirectionSource.indexOf("const turnRendererBackend = beginFishTurnRendererSession(");
  const durationAt = setDirectionSource.indexOf("fish.turnDurationMs = getFishTurnDurationMs(");
  assert.ok(sessionAt >= 0 && durationAt > sessionAt, "renderer backend must be latched before duration is selected");
  assert.match(setDirectionSource, /fish\.turnAnimationMode\s*\n?\s*\);/);
  assert.match(setDirectionSource, /turnRendererBackend\s*\n?\s*\);/);
  assert.match(v26Source, /function resolveFishTurnRendererBackend\([\s\S]*animationModeOverride = null/);
  assert.match(v26Source, /const animationMode = \["simple", "complex"\]\.includes\(normalizedOverride\)/);
});

test("phase 8 keeps a v26 fallback on the original 650 ms clock instead of retiming mid-turn", () => {
  const fallbackSource = extractFunction(v26Source, "markFishTurnRendererFallback");
  assert.doesNotMatch(fallbackSource, /turnDurationMs\s*=/);
  assert.match(fallbackSource, /fish\.turnRendererFallbackBackend = fallback;/);
  assert.match(contract, /fallback does not rewrite `turnDurationMs`/i);
});


test("phase 8 debug turn preview resolves the same renderer-specific duration as a live turn", () => {
  assert.match(debugSource, /function getDebugFishBehaviorPreviewTurnDurationMs\(fish, species\)/);
  assert.match(debugSource, /resolveFishTurnRendererBackend\(fish, species, animationMode\)/);
  assert.match(debugSource, /getFishTurnDurationMs\(fish, species, animationMode, rendererBackend\)/);
  assert.match(debugSource, /getDebugFishBehaviorPreviewTurnDurationMs\(fish, species\)/);
  assert.doesNotMatch(debugSource, /Number\(fish\?\.debugPreviewTurnDurationMs\) \|\| getFishTurnDurationMs/);
});

test("phase 9 centralizes behavior-aware v26 style selection without gameplay writes", () => {
  assert.match(v26Source, /function getFishTurnV26BehaviorContext\(/);
  assert.match(v26Source, /function selectFishTurnV26StyleForContext\(/);
  assert.match(v26Source, /precisionInteraction/);
  assert.match(v26Source, /schoolFollowing/);
  assert.match(v26Source, /collisionAvoidanceActive/);
  assert.match(v26Source, /relaxedCruise/);
  assert.doesNotMatch(v26Source, /\.xNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.yNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.targetXNorm\s*=/);
  assert.doesNotMatch(v26Source, /\.targetYNorm\s*=/);
});

test("phase 9 style policy keeps precision and coordinated movement compact", () => {
  const runtime = {
    fishActionSteeringByFishId: new Map(),
    debugBehaviorSteeringByFishId: new Map(),
    fishBreedingSequence: null,
    debugBreedingSequence: null
  };
  const context = {
    runtime,
    Map,
    Math,
    Date,
    Number,
    String,
    FISH_GRAVEL_DIG_ACTIVITY: "gravel-dig",
    FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel-play",
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    getSpeciesForFish: () => ({ speedMin: 0.2, speedMax: 0.6 }),
    getFishActionQueueState: () => null,
    getActiveFishCollisionAvoidance: () => null
  };
  context.getFishTurnV26BehaviorContext = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnV26BehaviorContext")})`, context);
  const select = vm.runInNewContext(`(${extractFunction(v26Source, "selectFishTurnV26StyleForContext")})`, context);
  const species = { speedMin: 0.2, speedMax: 0.6 };
  const base = {
    id: "fish-1",
    activity: "roam",
    xNorm: 0.5,
    yNorm: 0.5,
    targetXNorm: 0.75,
    targetYNorm: 0.5,
    swimSpeed: 0.4
  };

  assert.equal(select({ ...base, panicUntil: 5000 }, species, 1000, 0.5), "tail-loaded-c-turn");
  assert.equal(select({ ...base, activity: "feeding" }, species, 1000, 0.5), "head-led");
  assert.equal(select({ ...base, activity: "feeding", xNorm: 0.05, targetXNorm: 0.25 }, species, 1000, 0.5), "banked-flex");
  assert.equal(select({ ...base, schoolRole: "follower", followUntil: 5000 }, species, 1000, 0.5), "head-led");

  context.getActiveFishCollisionAvoidance = () => ({ reason: "fish" });
  assert.equal(select(base, species, 1000, 0.5), "banked-flex");
});

test("phase 9 reserves Wide Fluid U-turn primarily for roomy relaxed cruising", () => {
  const runtime = {
    fishActionSteeringByFishId: new Map(),
    debugBehaviorSteeringByFishId: new Map(),
    fishBreedingSequence: null,
    debugBreedingSequence: null
  };
  const context = {
    runtime,
    Map,
    Math,
    Date,
    Number,
    String,
    FISH_GRAVEL_DIG_ACTIVITY: "gravel-dig",
    FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel-play",
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    getSpeciesForFish: () => ({ speedMin: 0.2, speedMax: 0.6 }),
    getFishActionQueueState: () => null,
    getActiveFishCollisionAvoidance: () => null
  };
  context.getFishTurnV26BehaviorContext = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnV26BehaviorContext")})`, context);
  const select = vm.runInNewContext(`(${extractFunction(v26Source, "selectFishTurnV26StyleForContext")})`, context);
  const species = { speedMin: 0.2, speedMax: 0.6 };
  const cruise = {
    id: "cruiser",
    activity: "roam",
    behaviorIntent: { type: "open-water cruise", cause: "performance", expiresAt: 9000 },
    xNorm: 0.5,
    yNorm: 0.5,
    targetXNorm: 0.78,
    targetYNorm: 0.52,
    swimSpeed: 0.4
  };

  assert.equal(select(cruise, species, 1000, 0.25), "wide-fluid-u-turn");
  assert.equal(select(cruise, species, 1000, 0.9), "head-led", "relaxed cruising keeps some natural variation");

  const fastCruise = { ...cruise, behaviorIntent: null, swimSpeed: 0.58 };
  assert.equal(select(fastCruise, species, 1000, 0.25), "tail-loaded-c-turn");
  assert.equal(select(fastCruise, species, 1000, 0.9), "head-led");
});

test("phase 9 explicit style controls still outrank contextual selection", () => {
  const runtime = {
    fishTurnV26StyleOverride: "wide-fluid-u-turn",
    fishActionSteeringByFishId: new Map(),
    debugBehaviorSteeringByFishId: new Map(),
    fishBreedingSequence: null,
    debugBreedingSequence: null
  };
  const context = {
    runtime,
    Map,
    Math,
    Date,
    Number,
    String,
    FISH_TURN_V26_DEFAULT_STYLE: "head-led",
    FISH_GRAVEL_DIG_ACTIVITY: "gravel-dig",
    FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel-play",
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    getSpeciesForFish: () => ({ speedMin: 0.2, speedMax: 0.6 }),
    getFishActionQueueState: () => null,
    getActiveFishCollisionAvoidance: () => null
  };
  context.normalizeFishTurnV26Style = vm.runInNewContext(`(${extractFunction(v26Source, "normalizeFishTurnV26Style")})`, context);
  context.getFishTurnV26BehaviorContext = vm.runInNewContext(`(${extractFunction(v26Source, "getFishTurnV26BehaviorContext")})`, context);
  context.selectFishTurnV26StyleForContext = vm.runInNewContext(`(${extractFunction(v26Source, "selectFishTurnV26StyleForContext")})`, context);
  const resolve = vm.runInNewContext(`(${extractFunction(v26Source, "resolveFishTurnV26Style")})`, context);
  const species = { speedMin: 0.2, speedMax: 0.6 };
  const panicFish = { id: "panic", activity: "roam", panicUntil: 9000, xNorm: 0.5, yNorm: 0.5, targetXNorm: 0.8, targetYNorm: 0.5 };

  assert.equal(resolve(panicFish, species, 1000), "wide-fluid-u-turn", "global development override wins");
  runtime.fishTurnV26StyleOverride = "";
  assert.equal(resolve({ ...panicFish, turnV26Style: "banked-flex" }, species, 1000), "banked-flex", "explicit fish style wins");
  assert.equal(resolve(panicFish, { ...species, turnV26Style: "head-led" }, 1000), "head-led", "explicit species style wins");
  assert.equal(resolve(panicFish, species, 1000), "tail-loaded-c-turn", "context is used only when no explicit style exists");
});

test("phase 9 behavior modules do not hardcode v26 renderer style identifiers", () => {
  const behaviorFiles = [
    "public/app-src/fish/feeding-and-medicine.js",
    "public/app-src/fish/gravel-and-schooling.js",
    "public/app-src/fish/cave-navigation.js",
    "public/app-src/fish/caves-and-collision.js",
    "public/app-src/fish/actions.js",
    "public/app-src/fish/predators-and-motion.js",
    "public/app-src/fish/lifecycle-and-breeding.js"
  ];
  for (const file of behaviorFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /wide-fluid-u-turn|tail-loaded-c-turn|banked-flex|head-led/, `${file} must stay renderer-agnostic`);
  }
});

test("phase 9 documentation preserves simulation authority", () => {
  assert.match(contract, /Phase 9 context-aware v26 style selection/);
  assert.match(contract, /Individual feeding, schooling, cave, gravel, breeding, predator, action, and collision systems do not hardcode renderer style names/i);
  assert.match(contract, /Context is sampled only when the renderer session begins/i);
  assert.match(contract, /Wide Fluid U-turn[^\n]*relaxed open-water cruising/i);
  assert.match(contract, /does not:[\s\S]*move `xNorm`, `yNorm`, tank depth, collision geometry/i);
});


test("phase 10 centralizes v26 special movement-owner eligibility", () => {
  assert.match(v26Source, /function getFishV26SpecialMovementOwner\(/);
  assert.match(v26Source, /function canUseFishV26TurnRenderer\(/);
  assert.match(v26Source, /runtime\?\.fishDragState\?\.fishId === fish\.id/);
  assert.match(v26Source, /pendingTravel\.mode === "tube" \? "tube-travel" : "borough-travel"/);
  assert.match(v26Source, /getFishEntryProgress\(fish, now\) !== null/);
  assert.match(v26Source, /isPufferPuffVisualActive\(fish, now\)/);
  assert.match(v26Source, /return "sucker-view-transition"/);
  assert.match(v26Source, /return "sucker-attached"/);
  assert.match(v26Source, /canUseFishV26TurnRenderer\(fish, species, now/);

  const gateSource = extractFunction(v26Source, "getFishV26SpecialMovementOwner");
  assert.doesNotMatch(gateSource, /\.xNorm\s*=/);
  assert.doesNotMatch(gateSource, /\.yNorm\s*=/);
  assert.doesNotMatch(gateSource, /\.targetXNorm\s*=/);
  assert.doesNotMatch(gateSource, /\.targetYNorm\s*=/);
});

test("phase 10 special-owner gate blocks pose owners but allows free-swimming suckers", () => {
  const runtime = {
    fishDragState: null,
    pendingNeighborhoodTravel: new Map()
  };
  let dead = false;
  let entry = null;
  let puff = false;
  let suckerTransition = null;
  let suckerFree = false;
  const context = {
    runtime,
    Object,
    Date,
    getSpeciesForFish: () => ({ behavior: "steady" }),
    isFishDead: () => dead,
    getFishEntryProgress: () => entry,
    isPufferPuffVisualActive: () => puff,
    getEffectiveFishBehavior: (_fish, species) => species.behavior,
    getSuckerFishViewTransitionState: () => suckerTransition,
    isSuckerFishFreeSwimming: () => suckerFree
  };
  const getOwner = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishV26SpecialMovementOwner")})`,
    context
  );
  const fish = { id: "fish-1" };
  const steady = { behavior: "steady" };
  const sucker = { behavior: "sucker" };

  assert.equal(getOwner(fish, steady, 1000), null);
  runtime.fishDragState = { fishId: fish.id };
  assert.equal(getOwner(fish, steady, 1000), "drag");
  runtime.fishDragState = null;

  runtime.pendingNeighborhoodTravel.set(fish.id, { mode: "edge" });
  assert.equal(getOwner(fish, steady, 1000), "borough-travel");
  runtime.pendingNeighborhoodTravel.set(fish.id, { mode: "tube" });
  assert.equal(getOwner(fish, steady, 1000), "tube-travel");
  runtime.pendingNeighborhoodTravel.clear();

  entry = 0.35;
  assert.equal(getOwner(fish, steady, 1000), "tank-entry");
  entry = null;
  puff = true;
  assert.equal(getOwner(fish, steady, 1000), "puffer-puff");
  puff = false;

  suckerFree = false;
  assert.equal(getOwner(fish, sucker, 1000), "sucker-attached");
  suckerFree = true;
  assert.equal(getOwner(fish, sucker, 1000), null, "free-swimming Otocinclus may use v26");
  suckerTransition = { progress: 0.4 };
  assert.equal(getOwner(fish, sucker, 1000), "sucker-view-transition");
  suckerTransition = null;

  dead = true;
  assert.equal(getOwner(fish, steady, 1000), "dead");
});

test("phase 10 special-owner cancellation preserves the rendered side and never moves gameplay coordinates", () => {
  const runtime = {};
  const context = {
    runtime,
    Math,
    Number,
    Date,
    getSpeciesForFish: () => ({ behavior: "steady" }),
    getFishHorizontalTurnState: () => ({ active: true }),
    isFishTurnRendererSessionCurrent: () => true,
    ensureFishTurnRendererSession: () => "v26",
    normalizeFishTurnRendererBackend: (value) => String(value || ""),
    getFishFacingDirection: (fish) => Number(fish.displayDirection) < 0 ? -1 : 1,
    clearFishTurnRendererSession: (fish) => {
      fish.turnRendererBackend = null;
      fish.turnRendererFallbackBackend = null;
      fish.turnRendererStartedAt = 0;
      fish.turnV26StyleActive = null;
      fish.turnV26StyleStartedAt = 0;
    }
  };
  const cancel = vm.runInNewContext(
    `(${extractFunction(turnSource, "cancelFishV26TurnForSpecialMovementOwner")})`,
    context
  );
  const fish = {
    id: "fish-1",
    xNorm: 0.42,
    yNorm: 0.58,
    targetXNorm: 0.18,
    targetYNorm: 0.62,
    direction: -1,
    displayDirection: 1,
    turnStartedAt: 900,
    turnDurationMs: 650,
    turnRendererBackend: "v26",
    turnRendererStartedAt: 900,
    turnRendererFallbackBackend: "simple",
    turnFromDirection: 1,
    turnToDirection: -1,
    traversalTurnState: "reversing"
  };
  const before = {
    xNorm: fish.xNorm,
    yNorm: fish.yNorm,
    targetXNorm: fish.targetXNorm,
    targetYNorm: fish.targetYNorm
  };

  assert.equal(cancel(fish, { behavior: "steady" }, 1100, "drag"), true);
  assert.equal(fish.direction, 1, "cancelled v26 turn preserves the side actually on screen");
  assert.equal(fish.displayDirection, 1);
  assert.equal(fish.turnStartedAt, null);
  assert.equal(fish.turnDurationMs, 0);
  assert.equal(fish.turnRendererBackend, null);
  assert.equal(fish.traversalTurnState, "idle");
  assert.deepEqual(
    { xNorm: fish.xNorm, yNorm: fish.yNorm, targetXNorm: fish.targetXNorm, targetYNorm: fish.targetYNorm },
    before,
    "special-owner cancellation cannot move the fish or rewrite its target"
  );
});

test("phase 15 leaves simple-origin turns untouched by the v26 special-owner cancellation path", () => {
  const context = {
    runtime: {},
    Math,
    Number,
    Date,
    getSpeciesForFish: () => ({ behavior: "steady" }),
    getFishHorizontalTurnState: () => ({ active: true }),
    isFishTurnRendererSessionCurrent: () => true,
    ensureFishTurnRendererSession: () => "simple",
    normalizeFishTurnRendererBackend: (value) => String(value || ""),
    getFishFacingDirection: () => 1,
    clearFishTurnRendererSession: () => { throw new Error("simple session must not be cleared"); }
  };
  const cancel = vm.runInNewContext(
    `(${extractFunction(turnSource, "cancelFishV26TurnForSpecialMovementOwner")})`,
    context
  );
  const fish = {
    direction: -1,
    displayDirection: 1,
    turnStartedAt: 900,
    turnDurationMs: 185,
    turnRendererBackend: "simple",
    turnRendererStartedAt: 900
  };
  assert.equal(cancel(fish, { behavior: "steady" }, 1100, "drag"), false);
  assert.equal(fish.turnStartedAt, 900);
  assert.equal(fish.direction, -1);
});

test("phase 10 reconciles special owners before early-return movement branches and immediate renders", () => {
  assert.match(predatorMotionSource, /reconcileFishV26TurnWithSpecialMovementOwner\(fish, species, now\);[\s\S]*if \(!fishDead && fish\.id === activelyDraggedFishId\)/);
  assert.match(draggingSource, /function beginFishDrag\([\s\S]*cancelFishV26TurnForSpecialMovementOwner\(fish, species, now, "drag"\);/);
  assert.match(boroughSource, /function beginBoroughEdgeTravel\([\s\S]*cancelFishV26TurnForSpecialMovementOwner\(fish, getSpeciesForFish\(fish\), now, "borough-travel"\);/);
  assert.match(boroughSource, /function beginBoroughTubeTravel\([\s\S]*cancelFishV26TurnForSpecialMovementOwner\(fish, getSpeciesForFish\(fish\), now, "tube-travel"\);/);
  assert.match(appearanceSource, /function startSuckerFishViewTransition\([\s\S]*cancelFishV26TurnForSpecialMovementOwner\(fish, getSpeciesForFish\(fish\), now, "sucker-view-transition"\);/);
  assert.match(rendererSource, /shouldUseFishTurnV26RendererForSprite\([\s\S]*suckerViewTransition,[\s\S]*now,[\s\S]*pendingTravel/);
});

test("phase 11 v26 UV projection reproduces endpoint sprite placement without touching gameplay pose", () => {
  const base = {
    u: 0.75,
    v: 0.5,
    fishAspect: 2,
    sourceDirection: 1,
    layer: 0,
    thicknessShape: 0,
    styleValue: "head-led",
    drawX: -100,
    drawWidth: 200,
    drawHeight: 100
  };
  const startRight = mathContext.projectFishTurnV26UvPoint({ ...base, turnProgress: 0, facingDirection: 1 });
  const endRight = mathContext.projectFishTurnV26UvPoint({ ...base, turnProgress: 1, facingDirection: 1 });
  const startLeft = mathContext.projectFishTurnV26UvPoint({ ...base, turnProgress: 0, facingDirection: -1 });
  const endLeft = mathContext.projectFishTurnV26UvPoint({ ...base, turnProgress: 1, facingDirection: -1 });

  assert.ok(Math.abs(startRight.x - 50) < 0.001, `right-facing start should match flat UV position, got ${startRight.x}`);
  assert.ok(Math.abs(startRight.y) < 0.001);
  assert.ok(Math.abs(endRight.x + 50) < 0.001, `terminal mesh should place the same source UV on the opposite side, got ${endRight.x}`);
  assert.ok(Math.abs(startLeft.x + 50) < 0.001);
  assert.ok(Math.abs(endLeft.x - 50) < 0.001);

  const projector = extractFunction(v26Source, "projectFishTurnV26UvPoint");
  assert.doesNotMatch(projector, /\.xNorm\s*=/);
  assert.doesNotMatch(projector, /\.yNorm\s*=/);
  assert.doesNotMatch(projector, /\.targetXNorm\s*=/);
  assert.doesNotMatch(projector, /\.targetYNorm\s*=/);
});

test("phase 11 visual anchors use the same alpha-aware body thickness as the v26 mesh", () => {
  const width = 7;
  const height = 7;
  const mask = new Uint8Array(width * height).fill(1);
  const distanceField = mathContext.buildFishTurnV26DistanceField(mask, width, height);
  const columnMax = mathContext.buildFishTurnV26ColumnMax(distanceField, width, height);
  const shape = { distanceField, columnMax, processingWidth: width, processingHeight: height };
  const boundary = mathContext.getFishTurnV26ThicknessShapeAtUv(shape, 0, 0.5, 1);
  const center = mathContext.getFishTurnV26ThicknessShapeAtUv(shape, 0.5, 0.5, 1);

  assert.equal(boundary.thicknessShape, 0, "real alpha boundary must collapse visual anchor surface depth");
  assert.ok(center.thicknessShape > boundary.thicknessShape, "body interior must project farther from the center surface than the alpha boundary");
  assert.ok(center.thicknessShape > 0, "body interior must retain non-zero faux thickness");
  assert.match(v26Source, /const nearSide = Math\.cos\(styleTransform\.rotationY\) >= 0 \? 1 : -1;/);
  assert.match(v26Source, /const layer = requestedSurface === "center" \? 0 : nearSide;/);
});

test("phase 11 keeps gravel targeting authoritative while only the carried pebble uses a v26 visual mouth", () => {
  const gameplayMouth = extractFunction(gravelSchoolingSource, "getFishGravelPebbleMouthPoint");
  const targetSolver = extractFunction(gravelSchoolingSource, "getFishTargetNormForMouthPoint");
  assert.doesNotMatch(gameplayMouth, /V26|VisualUv|projectFishTurn/i);
  assert.doesNotMatch(targetSolver, /V26|VisualUv|projectFishTurn/i);

  const heldPebble = extractFunction(rendererSource, "drawFishHeldGravelPebble");
  assert.match(heldPebble, /getFishV26VisualUvLocalPoint\(/);
  assert.match(heldPebble, /const mouth = v26Mouth \|\| getFishGravelPebbleMouthLocalPoint/);
});

test("phase 11 external visual attachments follow v26 but preserve their normal fallback", () => {
  const birthdayPose = extractFunction(boroughSource, "getFishBirthdayHatWorldPose");
  assert.match(birthdayPose, /getFishV26VisualUvWorldFrame\(/);
  assert.match(birthdayPose, /if \(v26Anchor\)/);
  assert.match(birthdayPose, /const bodyScaleX = pose\.bodyScaleX \|\| 1;/, "flat-sprite birthday-hat fallback remains present");

  const diseaseMouth = extractFunction(diseaseSource, "getFishDiseaseBubbleMouthPoint");
  assert.match(diseaseMouth, /getFishV26VisualUvWorldFrame\(/);
  assert.match(diseaseMouth, /getFishFrontMouthOffsetAtPose\(/, "non-v26 bubble source retains the old mouth path");
  assert.match(diseaseMouth, /getFishDisplayWidth\(fish, species, now\)/, "v26 bubble source resolves actual rendered fish size even outside the draw loop");
});

test("phase 11 body-aligned symptom artwork uses the body shape mesh rather than becoming independent geometry", () => {
  assert.match(rendererSource, /drawFishTurnV26VolumeMesh\(\s*tankContext,\s*depthRenderImage,\s*image,\s*fishDrawX,/s);
  assert.match(rendererSource, /const symptomOverlay = getFishSymptomOverlayCanvas[\s\S]*drawFishSpriteLayer\([\s\S]*symptomOverlay/);
  assert.doesNotMatch(rendererSource, /drawFishTurnV26VolumeMesh\([\s\S]{0,180}symptomOverlay,[\s\S]{0,80}symptomOverlay/);
});

test("phase 11 documentation makes visual projection explicitly non-authoritative", () => {
  assert.match(contract, /Phase 11 gameplay anchors and v26 visual attachments/);
  assert.match(contract, /gameplay mouth, collision, target, feeding, gravel, cave, breeding, and schooling calculations remain 2D and authoritative/i);
  assert.match(contract, /UV.*render-only projection/i);
  assert.match(contract, /carried gravel pebble/i);
  assert.match(contract, /birthday hat/i);
  assert.match(contract, /disease and mood bubble emission/i);
});

test("phase 11 resolves pending travel before v26 special-owner eligibility is evaluated", () => {
  const drawFishStart = rendererSource.indexOf("function drawFish(");
  assert.ok(drawFishStart >= 0, "drawFish must exist");
  const drawFishSource = rendererSource.slice(drawFishStart);
  const declarationIndex = drawFishSource.indexOf("const pendingTravel = record.pendingTravel;");
  const eligibilityIndex = drawFishSource.indexOf("shouldUseFishTurnV26RendererForSprite(");
  assert.ok(declarationIndex >= 0, "drawFish must resolve the current travel owner");
  assert.ok(eligibilityIndex > declarationIndex, "pendingTravel must exist before the v26 owner gate reads it");
});


test("phase 12 installs exact optional fin defaults and companion naming", () => {
  assert.match(bootstrapSource, /const FISH_TURN_V26_FIN_DISTANCE = 18;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_FIN_FRONT_ATTACHMENT_DISTANCE = 34;/);
  assert.match(bootstrapSource, /const FISH_TURN_V26_FIN_TAPER = 72;/);
  assert.equal(
    mathContext.getFishTurnV26CompanionFinAssetPath("/assets/fish/betta_double_tail.png"),
    "/assets/fish/betta_double_tail_fin.png"
  );
  assert.equal(
    mathContext.getFishTurnV26CompanionFinAssetPath("assets/fish/betta_double_tail.webp?v=abc"),
    "assets/fish/betta_double_tail_fin.webp?v=abc"
  );
  assert.equal(mathContext.getFishTurnV26CompanionFinAssetPath("data:image/png;base64,abc"), null);
  assert.match(v26Source, /fish\?\.finOverlayAsset/);
  assert.match(v26Source, /species\?\.finAsset/);
});

test("fin overlay is turn-latched, defaults off, and never appears halfway through a turn", () => {
  assert.match(v26Source, /fish\.turnV26FinOverlayEnabled = false;/);
  assert.match(v26Source, /beginFishTurnV26FinOverlaySession\(fish, species, startedAt, now\)/);
  assert.match(v26Source, /fish\.turnV26FinOverlayStartedAt = Number\(startedAt\) \|\| 0;/);
  assert.match(v26Source, /if \(!ready\) return false;/);
  assert.match(v26Source, /Number\(fish\.turnV26FinOverlayStartedAt\) !== Number\(fish\.turnStartedAt\)/);
  assert.doesNotMatch(v26Source, /turnV26FinOverlayEnabled\s*=\s*true[\s\S]{0,250}loadFishTurnV26FinAssetCandidate/);
});

test("inferred fin discovery checks the asset manifest before attempting a load", () => {
  assert.match(v26Source, /if \(!candidate\.explicit\) \{\s*const exists = await fishTurnV26ManifestContainsFinAsset\(candidate\.path\);/);
  assert.match(v26Source, /if \(!exists\) \{\s*state\.status = "absent";/);
  assert.match(v26Source, /maxAttempts: 1/);
  assert.match(v26Source, /runtime\.fishTurnV26FinDiscoveryCache = new Map\(\);/);
});

test("fin dimensions must exactly match the body canvas and are never resized", () => {
  assert.match(v26Source, /finWidth === bodyWidth && finHeight === bodyHeight/);
  assert.match(v26Source, /ignored fin overlay with mismatched dimensions/);
  assert.doesNotMatch(v26Source, /resize.*fin/i);
  assert.doesNotMatch(v26Source, /stretch.*fin/i);
});

test("fin preprocessing has its own cached alpha-derived distance field and column maxima", () => {
  assert.match(v26Source, /runtime\.fishTurnV26FinShapeCache = new Map\(\);/);
  assert.match(v26Source, /const finDistanceField = buildFishTurnV26DistanceField\(mask, width, height\);/);
  assert.match(v26Source, /const finColMax = buildFishTurnV26ColumnMax\(finDistanceField, width, height\);/);
  assert.match(v26Source, /finLocal: vertexShape\.bodyLocal/);
});

test("exact v26 fin gap math keeps front attached and tapers at the fin silhouette", () => {
  assert.equal(mathContext.computeFishTurnV26FinGap(0, 0), 0);
  const centerGap = mathContext.computeFishTurnV26FinGap(1, 0);
  assert.ok(centerGap > 0);
  const headGap = mathContext.computeFishTurnV26FinGap(1, 1);
  assert.ok(headGap < centerGap * 0.01, "headward attachment should collapse extra separation");
  const zeroDistance = mathContext.computeFishTurnV26FinGap(1, 0, 0, 34, 72);
  assert.equal(zeroDistance, 0);
  assert.match(v26Source, /float finPower = mix\(0\.55, 2\.40, u_finTaper\);/);
  assert.match(v26Source, /float finProfile = pow\(clamp\(a_finLocal, 0\.0, 1\.0\), finPower\);/);
  assert.match(v26Source, /depth \+= u_finSideSign \* finGap;/);
});

test("fin near and far sides swap with yaw and render around the body", () => {
  assert.equal(mathContext.getFishTurnV26FinRenderSides(0).nearSide, 1);
  assert.equal(mathContext.getFishTurnV26FinRenderSides(0).farSide, -1);
  assert.equal(mathContext.getFishTurnV26FinRenderSides(Math.PI).nearSide, -1);
  assert.equal(mathContext.getFishTurnV26FinRenderSides(Math.PI).farSide, 1);
  const farIndex = v26Source.indexOf("drawFinPass(finSides.farSide)");
  const bodyIndex = v26Source.indexOf("for (const pass of getFishTurnV26BodyRenderPasses");
  const nearIndex = v26Source.indexOf("drawFinPass(finSides.nearSide)");
  assert.ok(farIndex >= 0 && bodyIndex > farIndex && nearIndex > bodyIndex);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_layerAlpha, 1\);/);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_rgbMultiplier, 1\);/);
});

test("only the actual base fish pass can inject the optional fin overlay", () => {
  assert.match(rendererSource, /includeFinOverlay: layerMotion\?\.v26FinBasePass === true/);
  assert.match(rendererSource, /\{ v26FinBasePass: true \}/);
  assert.doesNotMatch(rendererSource, /symptomOverlay[\s\S]{0,180}v26FinBasePass: true/);
});


test("phase 15 simultaneous-turn budget sheds interior layers before mesh detail", () => {
  assert.equal(mathContext.getFishTurnV26VolumeLayerCountForActiveTurns(0), 5);
  assert.equal(mathContext.getFishTurnV26VolumeLayerCountForActiveTurns(8), 5);
  assert.equal(mathContext.getFishTurnV26VolumeLayerCountForActiveTurns(9), 3);
  assert.equal(mathContext.getFishTurnV26VolumeLayerCountForActiveTurns(16), 3);
  assert.equal(mathContext.getFishTurnV26VolumeLayerCountForActiveTurns(17), 2);
  assert.equal(mathContext.getFishTurnV26VolumeLayerCountForActiveTurns(80), 2);

  const normal = mathContext.getFishTurnV26StressBudget(8, true);
  assert.equal(normal.trianglesPerPass, 9216);
  assert.equal(normal.passesPerFish, 7);
  assert.equal(normal.trianglesPerFrame, 516096);

  const reduced = mathContext.getFishTurnV26StressBudget(9, true);
  assert.equal(reduced.volumeLayers, 3);
  assert.equal(reduced.passesPerFish, 5);
  assert.equal(reduced.trianglesPerFrame, 414720);

  const stress = mathContext.getFishTurnV26StressBudget(17, true);
  assert.equal(stress.volumeLayers, 2);
  assert.equal(stress.passesPerFish, 4);
  assert.equal(stress.trianglesPerFrame, 626688);
  assert.match(contract, /reduce translucent interior layers first/i);
});

test("phase 17 uploads upright body/fin textures once per renderer cache", () => {
  let createCount = 0;
  let uploadCount = 0;
  const pixelStoreCalls = [];
  const gl = {
    TEXTURE_2D: 3553,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    LINEAR: 9729,
    UNPACK_FLIP_Y_WEBGL: 37440,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    createTexture: () => ({ id: ++createCount }),
    bindTexture() {},
    texParameteri() {},
    pixelStorei(pname, value) { pixelStoreCalls.push([pname, value]); },
    texImage2D() { uploadCount += 1; },
    deleteTexture() {}
  };
  const context = {
    runtime: {}, Map, WeakMap, String, Number, Math
  };
  context.getFishTurnV26ImageCacheIdentity = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26ImageCacheIdentity")})`,
    context
  );
  context.getFishTurnV26GpuTexture = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26GpuTexture")})`,
    context
  );
  const renderer = { gl, bodyGpuTextures: new Map(), finGpuTextures: new Map() };
  const image = { src: "assets/fish/test.webp", width: 512, height: 512 };
  const body1 = context.getFishTurnV26GpuTexture(renderer, image, "body");
  const body2 = context.getFishTurnV26GpuTexture(renderer, image, "body");
  assert.equal(body1, body2);
  assert.equal(createCount, 1);
  assert.equal(uploadCount, 1);
  const fin = context.getFishTurnV26GpuTexture(renderer, image, "fin");
  assert.notEqual(fin, body1, "body and fin texture caches stay independent");
  assert.equal(createCount, 2);
  assert.equal(uploadCount, 2);

  const yFlipCalls = pixelStoreCalls.filter(([pname]) => pname === gl.UNPACK_FLIP_Y_WEBGL);
  assert.deepEqual(
    yFlipCalls,
    [[gl.UNPACK_FLIP_Y_WEBGL, false], [gl.UNPACK_FLIP_Y_WEBGL, false]],
    "v26 UV v=0 is the source-image top, so body and fin uploads must not flip Y"
  );
});
test("phase 17 source never vertically flips v26 DOM textures", () => {
  assert.match(v26Source, /pixelStorei\(gl\.UNPACK_FLIP_Y_WEBGL, false\)/);
  assert.doesNotMatch(v26Source, /pixelStorei\(gl\.UNPACK_FLIP_Y_WEBGL, true\)/);
});


test("phase 15 renderer disposal releases cached GPU resources and supports recreation", () => {
  const deleted = { buffers: [], textures: [], programs: [] };
  const gl = {
    deleteBuffer: value => deleted.buffers.push(value),
    deleteTexture: value => deleted.textures.push(value),
    deleteProgram: value => deleted.programs.push(value)
  };
  const context = { runtime: {}, Boolean };
  context.disposeFishTurnV26RendererState = vm.runInNewContext(
    `(${extractFunction(v26Source, "disposeFishTurnV26RendererState")})`,
    context
  );
  const renderer = {
    gl,
    bodyGpuBuffers: new Map([["body", { distanceBuffer: "bd", localBuffer: "bl" }]]),
    finGpuBuffers: new Map([["fin", "fb"]]),
    bodyGpuTextures: new Map([["body", "bt"]]),
    finGpuTextures: new Map([["fin", "ft"]]),
    uvBuffer: "uv",
    indexBuffer: "ix",
    program: "program",
    failed: false
  };
  context.runtime.fishTurnV26RendererState = renderer;
  assert.equal(context.disposeFishTurnV26RendererState(renderer, false), true);
  assert.deepEqual(deleted.buffers.sort(), ["bd", "bl", "fb", "ix", "uv"].sort());
  assert.deepEqual(deleted.textures.sort(), ["bt", "ft"].sort());
  assert.deepEqual(deleted.programs, ["program"]);
  assert.equal(renderer.bodyGpuBuffers.size, 0);
  assert.equal(renderer.finGpuBuffers.size, 0);
  assert.equal(renderer.bodyGpuTextures.size, 0);
  assert.equal(renderer.finGpuTextures.size, 0);
  assert.equal(context.runtime.fishTurnV26RendererState, null);

  const failedRenderer = { ...renderer, gl, bodyGpuBuffers: new Map(), finGpuBuffers: new Map(), bodyGpuTextures: new Map(), finGpuTextures: new Map() };
  context.runtime.fishTurnV26RendererState = failedRenderer;
  context.disposeFishTurnV26RendererState(failedRenderer, true);
  assert.equal(failedRenderer.failed, true);
  assert.equal(context.runtime.fishTurnV26RendererState.failed, true);
  assert.match(v26Source, /webglcontextlost[\s\S]*disposeFishTurnV26RendererState\(renderer, true\)/);
  assert.match(v26Source, /webglcontextrestored[\s\S]*runtime\.fishTurnV26RendererState = null/);
});

test("phase 15 body and fin GPU textures are asset-cached and fin resources remain lazy", () => {
  assert.match(v26Source, /bodyGpuTextures: new Map\(\)/);
  assert.match(v26Source, /finGpuTextures: new Map\(\)/);
  assert.match(v26Source, /function getFishTurnV26GpuTexture\(renderer, image, kind = "body"\)/);
  assert.match(v26Source, /if \(cache\.has\(cacheKey\)\) \{\s*return cache\.get\(cacheKey\);/);
  assert.match(v26Source, /const finTexture = finOverlay \? getFishTurnV26GpuTexture\(renderer, finOverlay\.image, "fin"\) : null;/);
  assert.match(v26Source, /if \(options\?\.includeFinOverlay === true\) \{/);
  assert.match(v26Source, /if \(finOverlay\) \{\s*finShape = preprocessFishTurnV26FinShape/);
  assert.doesNotMatch(v26Source, /finTexture: null/);
});

test("fin controls keep approved defaults while permitting explicit per-fish or species tuning", () => {
  assert.match(v26Source, /function getFishTurnV26FinSettings\(fish, species = getSpeciesForFish\(fish\)\)/);
  assert.match(v26Source, /fish\?\.finDistance \?\? species\?\.finDistance/);
  assert.match(v26Source, /fish\?\.finTapering \?\? fish\?\.finTaper/);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_finGap, finSettings\.distance \/ 450\);/);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_finAttach, finSettings\.frontAttachmentDistance \/ 100\);/);
  assert.match(v26Source, /gl\.uniform1f\(uniforms\.u_finTaper, finSettings\.taper \/ 100\);/);
});

test("a ready exact-size fin latches on, while an unavailable fin remains off for the whole turn", () => {
  const makeContext = (images) => {
    const context = {
      runtime: { images: new Map(images), fishTurnV26FinDiscoveryCache: new Map() },
      Date,
      Number,
      String,
      Math,
      Map,
      Set,
      console: { warn: () => {} },
      getSpeciesForFish: () => ({}),
      getFishDisplayAssetPath: () => "assets/fish/test.png",
      getSpriteAssetFrame: () => null,
      isUsableRuntimeImage: (image) => Boolean(image && image.width > 0 && image.height > 0),
      loadFishTurnV26FinAssetCandidate: () => Promise.resolve(null),
      isFishTurnRendererSessionCurrent: () => true
    };
    for (const name of [
      "getFishTurnV26FinDiscoveryCache",
      "getFishTurnV26FinDimensionWarningSet",
      "getFishTurnV26CompanionFinAssetPath",
      "getFishTurnV26ExplicitFinAssetPath",
      "getFishTurnV26SpriteFrameSpec",
      "getFishTurnV26FinCandidateCacheKey",
      "cropFishTurnV26FinSpriteFrame",
      "resolveFishTurnV26FinAssetCandidate",
      "requestFishTurnV26FinAssetCandidate",
      "validateFishTurnV26FinImageDimensions",
      "getReadyFishTurnV26FinOverlay",
      "clearFishTurnV26FinOverlaySession",
      "beginFishTurnV26FinOverlaySession",
      "getFishTurnV26LatchedFinOverlay"
    ]) {
      context[name] = vm.runInNewContext(`(${extractFunction(v26Source, name)})`, context);
    }
    return context;
  };

  const body = { width: 512, height: 256 };
  const fin = { width: 512, height: 256 };
  const ready = makeContext([
    ["assets/fish/test.png", body],
    ["assets/fish/test_fin.png", fin]
  ]);
  const fish = { turnStartedAt: 1000 };
  assert.equal(ready.beginFishTurnV26FinOverlaySession(fish, {}, 1000, 1000), true);
  assert.equal(fish.turnV26FinOverlayEnabled, true);
  assert.equal(fish.turnV26FinOverlayPath, "assets/fish/test_fin.png");
  assert.equal(ready.getFishTurnV26LatchedFinOverlay(fish, body).image, fin);

  const absent = makeContext([["assets/fish/test.png", body]]);
  const fishWithoutFin = { turnStartedAt: 2000 };
  assert.equal(absent.beginFishTurnV26FinOverlaySession(fishWithoutFin, {}, 2000, 2000), false);
  assert.equal(fishWithoutFin.turnV26FinOverlayEnabled, false);
  absent.runtime.images.set("assets/fish/test_fin.png", fin);
  assert.equal(
    absent.getFishTurnV26LatchedFinOverlay(fishWithoutFin, body),
    null,
    "a fin that finishes loading mid-turn must wait until the next turn session"
  );
});


test("phase 14 sprite-sheet fin discovery uses the body atlas frame coordinates", () => {
  const context = {
    Date,
    String,
    Number,
    Math,
    getSpeciesForFish: () => ({}),
    getFishDisplayAssetPath: () => "/assets/fish/tetra_neon-blue.png",
    getSpriteAssetFrame: (path) => path === "/assets/fish/tetra_neon-blue.png" ? {
      name: "tetra_neon-blue.png",
      rect: [0, 0, 512, 512],
      sheet: { path: "assets/fish/tetra-neon__genetics-enhanced.webp" }
    } : null
  };
  context.getFishTurnV26CompanionFinAssetPath = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26CompanionFinAssetPath")})`, context
  );
  context.getFishTurnV26ExplicitFinAssetPath = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26ExplicitFinAssetPath")})`, context
  );
  context.getFishTurnV26SpriteFrameSpec = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26SpriteFrameSpec")})`, context
  );
  context.getFishTurnV26FinCandidateCacheKey = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26FinCandidateCacheKey")})`, context
  );
  context.resolveFishTurnV26FinAssetCandidate = vm.runInNewContext(
    `(${extractFunction(v26Source, "resolveFishTurnV26FinAssetCandidate")})`, context
  );
  const candidate = context.resolveFishTurnV26FinAssetCandidate({}, {}, "/assets/fish/tetra_neon-blue.png");
  assert.equal(candidate.path, "assets/fish/tetra-neon__genetics-enhanced_fin.webp");
  assert.deepEqual(Array.from(candidate.spriteFrame.rect), [0, 0, 512, 512]);
  assert.equal(candidate.spriteFrame.name, "tetra_neon-blue.png");
  assert.match(context.getFishTurnV26FinCandidateCacheKey(candidate), /tetra_neon-blue\.png/);

  context.getSpriteAssetFrame = () => ({
    name: "tetra_neon-green.png",
    rect: [512, 0, 512, 512],
    sheet: { path: "assets/fish/tetra-neon__genetics-enhanced.webp" }
  });
  const green = context.resolveFishTurnV26FinAssetCandidate({}, {}, "/assets/fish/tetra_neon-green.png");
  assert.notEqual(
    context.getFishTurnV26FinCandidateCacheKey(candidate),
    context.getFishTurnV26FinCandidateCacheKey(green),
    "each atlas frame needs its own cropped fin cache entry"
  );
});

test("phase 14 real neon tetra fin atlas matches the body atlas and shared JSON frame grid", async () => {
  const bodyPath = path.join(root, "assets/fish/tetra-neon__genetics-enhanced.webp");
  const finPath = path.join(root, "assets/fish/tetra-neon__genetics-enhanced_fin.webp");
  const metadataPath = path.join(root, "assets/fish/tetra-neon__genetics-enhanced.json");
  const manifestPath = path.join(root, "assets/asset-manifest.json");
  assert.ok(fs.existsSync(finPath), "the real neon tetra _fin atlas must ship with the patch");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.ok(
    manifest.fish.some((entry) => String(entry.path || "").startsWith("assets/fish/tetra-neon__genetics-enhanced_fin.webp?v=")),
    "the fin atlas must be discoverable through the production asset manifest"
  );

  const [bodyMeta, finMeta] = await Promise.all([sharp(bodyPath).metadata(), sharp(finPath).metadata()]);
  assert.equal(finMeta.width, bodyMeta.width);
  assert.equal(finMeta.height, bodyMeta.height);
  assert.equal(finMeta.width, 1536);
  assert.equal(finMeta.height, 1024);

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const sprites = metadata.layers?.[0]?.sprites || [];
  assert.equal(metadata.columns, 3);
  assert.equal(sprites.length, 6);
  const cellWidth = Math.max(...sprites.map((sprite) => Number(sprite.width) || 0));
  const cellHeight = Math.max(...sprites.map((sprite) => Number(sprite.height) || 0));
  assert.equal(cellWidth, 512);
  assert.equal(cellHeight, 512);

  for (let index = 0; index < sprites.length; index += 1) {
    const sprite = sprites[index];
    const left = (index % metadata.columns) * cellWidth + (Number(sprite.x) || 0);
    const top = Math.floor(index / metadata.columns) * cellHeight + (Number(sprite.y) || 0);
    const width = Number(sprite.width) || 0;
    const height = Number(sprite.height) || 0;
    const { data, info } = await sharp(finPath)
      .extract({ left, top, width, height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let opaquePixels = 0;
    for (let offset = 3; offset < data.length; offset += info.channels) {
      if (data[offset] > 7) opaquePixels += 1;
    }
    assert.ok(opaquePixels > 500, `${sprite.name} fin crop should contain visible fin pixels`);
    assert.ok(opaquePixels < width * height * 0.05, `${sprite.name} fin crop should remain a sparse fin-only overlay`);
  }
});


test("phase 14 sprite-frame crop uses the exact original atlas rectangle", () => {
  const drawCalls = [];
  const context2d = {
    clearRect: (...args) => drawCalls.push(["clearRect", ...args]),
    drawImage: (...args) => drawCalls.push(["drawImage", ...args])
  };
  const document = {
    createElement: (name) => {
      assert.equal(name, "canvas");
      return {
        width: 0,
        height: 0,
        complete: false,
        getContext: (kind) => kind === "2d" ? context2d : null
      };
    }
  };
  const context = { document, Number, Math, Array };
  const crop = vm.runInNewContext(
    `(${extractFunction(v26Source, "cropFishTurnV26FinSpriteFrame")})`,
    context
  );
  const sheet = { naturalWidth: 1536, naturalHeight: 1024 };
  const result = crop(sheet, {
    name: "tetra_neon-green.png",
    rect: [512, 0, 512, 512],
    sheetPath: "assets/fish/tetra-neon__genetics-enhanced.webp"
  });
  assert.equal(result.width, 512);
  assert.equal(result.height, 512);
  assert.equal(result.complete, true);
  assert.deepEqual(drawCalls.at(-1).slice(1), [sheet, 512, 0, 512, 512, 0, 0, 512, 512]);
});

test("phase 14 v26 remains read-only with respect to authoritative gameplay pose", () => {
  for (const field of [
    "xNorm", "yNorm", "targetXNorm", "targetYNorm", "tankLayer", "tankSubLayer", "direction", "displayDirection"
  ]) {
    assert.doesNotMatch(
      v26Source,
      new RegExp(`fish\.${field}\s*=`),
      `v26 must not assign authoritative fish.${field}`
    );
  }
  assert.match(contract, /Phase 14 real fin-atlas validation and gameplay interaction regression/);
  assert.match(contract, /No second fin JSON is required/);
  assert.match(contract, /same `x`, `y`, `width`, and `height` frame rectangle/);
  assert.match(contract, /Feeding, gravel digging and pebble pickup, cave traversal, breeding, panic, predator pursuit\/escape, tube travel/);
  assert.match(contract, /does not promote v26 to the production default/i);
});

test("phase 24 schooling follows delayed leader path history instead of mirroring renderer yaw", () => {
  assert.match(gravelSchoolingSource, /function recordFishSchoolLeaderPathHistory\(/);
  assert.match(gravelSchoolingSource, /function getFishSchoolLeaderHistoricalPose\(/);
  assert.match(gravelSchoolingSource, /const historicalPose = getFishSchoolLeaderHistoricalPose\(fish, leader, now\);/);
  assert.match(gravelSchoolingSource, /pathDelayMs: Number\(historicalPose\?\.delayMs\) \|\| 0/);
  assert.match(gravelSchoolingSource, /toleranceXNorm: formation\.toleranceXNorm/);
  assert.match(bootstrapSource, /const SCHOOL_PATH_HISTORY_MS = 3600/);
  assert.match(bootstrapSource, /const SCHOOL_PATH_DELAY_BASE_MS = 140/);
  assert.match(bootstrapSource, /const SCHOOL_FORMATION_MANEUVER_LOCK_MS = 1200/);

  let active = true;
  const context = {
    Date,
    Number,
    getFishFacingDirection: fish => Number(fish.displayDirection) < 0 ? -1 : 1,
    getFishHorizontalTurnState: () => ({
      active,
      reversing: active,
      fromDirection: 1,
      toDirection: -1
    })
  };
  const getDirection = vm.runInNewContext(
    `(${extractFunction(gravelSchoolingSource, "getFishSchoolLeaderFormationDirection")})`,
    context
  );
  const leader = { displayDirection: -1 };
  assert.equal(getDirection(leader, 1200), 1, "the source-side direction remains available for legacy formation consumers during an active turn");
  active = false;
  assert.equal(getDirection(leader, 1900), -1, "completed turn exposes the final displayed side");
});

test("phase 13 active school leaders cannot visually leave followers with a Wide Fluid U-turn", () => {
  const runtime = {
    fishTurnV26StyleOverride: "",
    fishActionSteeringByFishId: new Map(),
    debugBehaviorSteeringByFishId: new Map(),
    fishBreedingSequence: null,
    debugBreedingSequence: null
  };
  let followers = [];
  const context = {
    runtime,
    Map,
    Math,
    Date,
    Number,
    String,
    FISH_GRAVEL_DIG_ACTIVITY: "gravel-dig",
    FISH_GRAVEL_PEBBLE_ACTIVITY: "gravel-play",
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    getSpeciesForFish: () => ({ speedMin: 0.2, speedMax: 0.6 }),
    getFishActionQueueState: () => null,
    getActiveFishCollisionAvoidance: () => null,
    getFishSchoolActiveFollowers: () => followers
  };
  context.getFishTurnV26BehaviorContext = vm.runInNewContext(
    `(${extractFunction(v26Source, "getFishTurnV26BehaviorContext")})`,
    context
  );
  const select = vm.runInNewContext(
    `(${extractFunction(v26Source, "selectFishTurnV26StyleForContext")})`,
    context
  );
  const species = { speedMin: 0.2, speedMax: 0.6 };
  const leader = {
    id: "leader",
    activity: "roam",
    behaviorIntent: { type: "open-water cruise", cause: "school leader", expiresAt: 9000 },
    xNorm: 0.5,
    yNorm: 0.5,
    targetXNorm: 0.78,
    targetYNorm: 0.52,
    swimSpeed: 0.4
  };

  followers = [];
  assert.equal(select(leader, species, 1000, 0.25), "wide-fluid-u-turn", "independent relaxed cruiser may still use the wide style");
  followers = [{ id: "follower-1" }, { id: "follower-2" }];
  assert.equal(select(leader, species, 1000, 0.25), "head-led", "school leader stays visually close to its authoritative group position");

  leader.xNorm = 0.06;
  leader.targetXNorm = 0.2;
  assert.equal(select(leader, species, 1000, 0.25), "banked-flex", "constrained school leader uses the compact banked turn");
});

test("phase 13 preserves school anti-oscillation, rejoin, and collision-recovery contracts", () => {
  assert.match(gravelSchoolingSource, /SCHOOL_REJOIN_DISTANCE_NORM/);
  assert.match(gravelSchoolingSource, /SCHOOL_REJOIN_SETTLE_DISTANCE_NORM/);
  assert.match(gravelSchoolingSource, /fish\.schoolState === "rejoining" && species\.speedMode === "dynamic"/);
  assert.match(gravelSchoolingSource, /leaderSpeed \* 1\.2/);
  assert.match(gravelSchoolingSource, /SAME_SPECIES_SCHOOL_TARGET_RESPONSE_PER_SEC/);
  assert.match(gravelSchoolingSource, /SAME_SPECIES_SCHOOL_TARGET_MAX_STEP_X_NORM/);
  assert.match(gravelSchoolingSource, /SAME_SPECIES_SCHOOL_TARGET_MAX_STEP_Y_NORM/);
  assert.match(gravelSchoolingSource, /function deferFishSchoolFollowForRecovery/);
  assert.match(predatorMotionSource, /socialTurnCommitActive/);
  assert.match(predatorMotionSource, /fish\.socialTurnCommitUntil = now \+ SOCIAL_FORMATION_TURN_COMMIT_MS/);
  assert.match(predatorMotionSource, /Do not let a newly crossed formation endpoint command an immediate[\s\S]*counter-turn/);
  assert.match(predatorMotionSource, /requestedHorizontalDirection !== renderedFacingDirection[\s\S]*setFishDirection\(fish, requestedHorizontalDirection, species, now\)/);
});

test("phase 13 documentation keeps schooling simulation authoritative", () => {
  assert.match(contract, /Phase 13 schooling-specific v26 integration/);
  assert.match(contract, /v26 edge-on midpoint is invisible to schooling/i);
  assert.match(contract, /School leaders use school-safe v26 styles/i);
  assert.match(contract, /Wide Fluid U-turn is excluded for the whole active school/i);
  assert.match(contract, /does not:[\s\S]*make v26 yaw authoritative for school facing/i);
  assert.match(contract, /change schooling speed\/catch-up equations/i);
});
