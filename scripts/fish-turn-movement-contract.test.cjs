"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "public", "app-src");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const turnSource = read("public/app-src/rendering/fish-motion-and-floor.js");
const motionSource = read("public/app-src/fish/predators-and-motion.js");
const rendererSource = read("public/app-src/rendering/fish-and-effects.js");


function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const parametersStart = source.indexOf("(", start);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    if (source[index] === ")") {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parametersEnd = index;
        break;
      }
    }
  }
  assert.ok(parametersEnd >= 0, `${name} parameters should close`);
  const bodyStart = source.indexOf("{", parametersEnd);
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

function sourceFilesContaining(fragment) {
  const found = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        const source = fs.readFileSync(absolute, "utf8");
        if (source.includes(fragment)) {
          found.push(path.relative(sourceRoot, absolute).replaceAll(path.sep, "/"));
        }
      }
    }
  };
  walk(sourceRoot);
  return found.sort();
}

test("horizontal turn state has one renderer-neutral read contract", () => {
  assert.match(turnSource, /function normalizeFishHorizontalDirection\(value, fallback = 1\)/);
  assert.match(turnSource, /function getFishLogicalDirection\(fish\)/);
  assert.match(turnSource, /function getFishHorizontalTurnState\(fish, now = Date\.now\(\)\)/);
  assert.match(turnSource, /reversing:\s*active && fromDirection !== toDirection/);
  assert.match(turnSource, /terminalFrameRendered:\s*Number\(fish\?\.turnFinalFrameRenderedAt\) > 0/);
  assert.match(turnSource, /const horizontalTurn = getFishHorizontalTurnState\(fish, now\);/);
});

test("complex turns keep display facing latched until the renderer confirms its terminal frame", () => {
  assert.match(turnSource, /fish\.displayDirection = fromDirection;/);
  assert.match(turnSource, /if \(progress >= 1 && horizontalTurn\.terminalFrameRendered\)/);
  assert.match(turnSource, /fish\.displayDirection = liveDirection;/);
  assert.match(rendererSource, /markFishTurnFinalFrameRendered\(fish, now\);/);
  assert.doesNotMatch(rendererSource, /fish\.turnFinalFrameRenderedAt = now;/);
});

test("normal reversal requests latch an active destination instead of restarting the turn", () => {
  const setDirectionStart = turnSource.indexOf("function setFishDirection(");
  const nextFunctionStart = turnSource.indexOf("\nfunction ", setDirectionStart + 1);
  const setDirectionSource = turnSource.slice(setDirectionStart, nextFunctionStart);
  assert.match(setDirectionSource, /const horizontalTurn = getFishHorizontalTurnState\(fish, now\);/);
  assert.match(setDirectionSource, /if \(horizontalTurn\.active\)/);
  assert.match(setDirectionSource, /fish\.direction = horizontalTurn\.toDirection;/);
  assert.match(setDirectionSource, /fish\.turnFromDirection = currentDisplayDirection;/);
  assert.match(setDirectionSource, /fish\.turnToDirection = nextDirection;/);
});

test("movement still blocks backward translation through the renderer-neutral reversal contract", () => {
  assert.match(motionSource, /const renderedFacingDirection = canUseHorizontalFacing \? getFishFacingDirection\(fish\) : 0;/);
  assert.match(motionSource, /requestedHorizontalDirection !== renderedFacingDirection/);
  assert.match(motionSource, /setFishDirection\(fish, requestedHorizontalDirection, species, now\);/);
  assert.match(motionSource, /getFishTurnReversalTraversal\(fish, moveDx, moveDy, now\)/);
  assert.match(motionSource, /const turnLocomotionState = getFishTurnLocomotionState\(fish, now\);/);
});

test("renderer-neutral locomotion state preserves the existing hold and release curve", () => {
  const context = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    FISH_TURN_LOCOMOTION_RELEASE_PROGRESS: 0.62
  };
  context.normalizeFishHorizontalDirection = vm.runInNewContext(`(${extractFunction(turnSource, "normalizeFishHorizontalDirection")})`, context);
  context.getFishFacingDirection = vm.runInNewContext(`(${extractFunction(turnSource, "getFishFacingDirection")})`, context);
  context.getFishLogicalDirection = vm.runInNewContext(`(${extractFunction(turnSource, "getFishLogicalDirection")})`, context);
  context.getFishHorizontalTurnState = vm.runInNewContext(`(${extractFunction(turnSource, "getFishHorizontalTurnState")})`, context);
  const getLocomotion = vm.runInNewContext(`(${extractFunction(turnSource, "getFishTurnLocomotionState")})`, context);

  const stationaryTurn = {
    displayDirection: 1, direction: 1, turnStartedAt: 1000, turnDurationMs: 1000,
    turnFromDirection: 1, turnToDirection: 1, turnFinalFrameRenderedAt: 0
  };
  const early = getLocomotion(stationaryTurn, 1300);
  assert.equal(early.holdsPosition, true);
  assert.equal(early.passiveSpeedScale, 0.12);

  const late = getLocomotion(stationaryTurn, 1810);
  assert.equal(late.holdsPosition, false);
  assert.ok(late.passiveSpeedScale > 0.12 && late.passiveSpeedScale < 1);

  const reversal = { ...stationaryTurn, direction: -1, turnToDirection: -1 };
  const reversingEarly = getLocomotion(reversal, 1300);
  assert.equal(reversingEarly.reversing, true);
  assert.equal(reversingEarly.holdsPosition, false);
  assert.equal(reversingEarly.passiveSpeedScale, 0.12);
});

test("authoritative movement no longer names or depends on the legacy segmented turn renderer", () => {
  assert.doesNotMatch(motionSource, /segmentedTurnaround/);
  assert.doesNotMatch(motionSource, /getFishSpriteReversalTraversal/);
  assert.doesNotMatch(motionSource, /FISH_TURN_RIG_MOVEMENT_RELEASE_PROGRESS/);
  assert.match(turnSource, /function getFishTurnLocomotionState\(fish, now = Date\.now\(\)\)/);
  assert.match(turnSource, /releaseProgress: FISH_TURN_LOCOMOTION_RELEASE_PROGRESS/);
  assert.match(turnSource, /passiveSpeedScale: 0\.12 \+ movementBlend \* 0\.88/);
});

test("direct direction mutations remain confined to audited lifecycle/debug exceptions", () => {
  assert.deepEqual(sourceFilesContaining("fish.direction ="), [
    "debug/tools.js",
    "decor/placement-and-dragging.js",
    "fish/decor-behavior.js",
    "fish/predators-and-motion.js",
    "rendering/fish-motion-and-floor.js"
  ]);

  assert.deepEqual(sourceFilesContaining("fish.displayDirection ="), [
    "debug/tools.js",
    "decor/customization.js",
    "decor/placement-and-dragging.js",
    "fish/health.js",
    "fish/predators-and-motion.js",
    "rendering/fish-motion-and-floor.js"
  ]);
});

test("phase 1 documentation freezes gameplay pose as authoritative and excludes v26 geometry changes", () => {
  const contract = read("docs/fish-turn-movement-contract.md");
  assert.match(contract, /authoritative gameplay pose/i);
  assert.match(contract, /visual render offsets only/i);
  assert.match(contract, /`setFishDirection\(\)` remains the normal in-tank horizontal reversal gateway/i);
  assert.match(contract, /renderer must first draw its terminal frame/i);
  assert.match(contract, /Phase 1 intentionally does not:/);
  assert.match(contract, /add v26 mesh rendering/);
  assert.match(contract, /change movement release timing/);
});


test("phase 2 documentation freezes locomotion behavior while removing renderer coupling", () => {
  const contract = read("docs/fish-turn-movement-contract.md");
  assert.match(contract, /Phase 2 renderer-neutral locomotion policy/);
  assert.match(contract, /getFishTurnLocomotionState\(fish, now\)/);
  assert.match(contract, /getFishTurnReversalTraversal\(fish, requestedXNorm, requestedYNorm, now\)/);
  assert.match(contract, /current release point remains `0\.62`/);
  assert.match(contract, /authoritative locomotion no longer knows which renderer/i);
});

test("phase 7 terminal-frame acknowledgement belongs to the current turn session only", () => {
  const context = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    Date,
    Number
  };
  context.normalizeFishHorizontalDirection = vm.runInNewContext(`(${extractFunction(turnSource, "normalizeFishHorizontalDirection")})`, context);
  context.getFishFacingDirection = vm.runInNewContext(`(${extractFunction(turnSource, "getFishFacingDirection")})`, context);
  context.getFishLogicalDirection = vm.runInNewContext(`(${extractFunction(turnSource, "getFishLogicalDirection")})`, context);
  context.getFishHorizontalTurnState = vm.runInNewContext(`(${extractFunction(turnSource, "getFishHorizontalTurnState")})`, context);
  context.markFishTurnFinalFrameRendered = vm.runInNewContext(`(${extractFunction(turnSource, "markFishTurnFinalFrameRendered")})`, context);

  const fish = {
    displayDirection: 1,
    direction: -1,
    turnStartedAt: 1000,
    turnDurationMs: 650,
    turnFromDirection: 1,
    turnToDirection: -1,
    turnFinalFrameRenderedAt: 1650,
    turnFinalFrameRenderedForStartedAt: 900
  };
  assert.equal(context.getFishHorizontalTurnState(fish, 1650).terminalFrameRendered, false);
  assert.equal(context.markFishTurnFinalFrameRendered(fish, 1650), true);
  assert.equal(fish.turnFinalFrameRenderedForStartedAt, 1000);
  assert.equal(context.getFishHorizontalTurnState(fish, 1650).terminalFrameRendered, true);

  fish.turnStartedAt = 2000;
  fish.turnDurationMs = 650;
  assert.equal(context.getFishHorizontalTurnState(fish, 2650).terminalFrameRendered, false, "old terminal marker cannot complete a new turn");
});

test("phase 7 starts renderer ownership through the existing direction gateway and clears it on handoff", () => {
  const setDirectionSource = extractFunction(turnSource, "setFishDirection");
  const updateTurnSource = extractFunction(turnSource, "updateFishTurnState");
  assert.match(setDirectionSource, /fish\.turnStartedAt = now;/);
  assert.match(setDirectionSource, /beginFishTurnRendererSession\([\s\S]*fish\.turnAnimationMode[\s\S]*\);/);
  assert.match(updateTurnSource, /if \(progress >= 1 && horizontalTurn\.terminalFrameRendered\)/);
  assert.match(updateTurnSource, /clearFishTurnRendererSession\(fish\);/);
  assert.match(turnSource, /turnFinalFrameRenderedForStartedAt = turnState\.startedAt;/);
});

test("phase 7 documentation preserves movement and interaction authority", () => {
  const contract = read("docs/fish-turn-movement-contract.md");
  assert.match(contract, /Phase 7 renderer session ownership and terminal-frame handoff/);
  assert.match(contract, /Changing a development override or fish\/species preference during an active reversal does not swap/i);
  assert.match(contract, /Phase 15 retires that renderer and latches the lightweight sprite fallback instead/i);
  assert.match(contract, /terminal-frame marker from an older cancelled turn therefore cannot complete a newer reversal early/i);
  assert.match(contract, /does not:[\s\S]*change the current turn duration to `650 ms`/i);
  assert.match(contract, /move `xNorm`, `yNorm`, gameplay depth, collision, feeding, cave, gravel, breeding, or schooling anchors/i);
});


test("phase 8 reversal traversal is normalized, so the 650 ms v26 clock preserves its continuous water arc", () => {
  const context = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    FISH_TURN_TRAVERSAL_ARC_APEX_PROGRESS: 0.5,
    FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE: 0.2,
    FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE: 0.52,
    FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE: 0.2,
    FISH_TURN_TRAVERSAL_ARC_VERTICAL_RATIO: 0.26
  };
  const getReversal = vm.runInNewContext(`(${extractFunction(motionSource, "getFishTurnReversalTraversal")})`, context);
  const base = {
    turnStartedAt: 1000,
    turnFromDirection: 1,
    turnToDirection: -1,
    traversalSpeedNorm: 0.04,
    swimSpeed: 0.05
  };
  const sample = (durationMs, progress) => getReversal(
    { ...base, turnDurationMs: durationMs },
    -0.3,
    0.08,
    1000 + durationMs * progress
  );

  for (const progress of [0.1, 0.25, 0.49, 0.5, 0.75, 0.9]) {
    const v26 = sample(650, progress);
    const legacyClock = sample(1800, progress);
    assert.ok(Math.abs(v26.motionScale - legacyClock.motionScale) < 1e-12);
    assert.equal(v26.travelDirection, legacyClock.travelDirection);
  }

  assert.equal(sample(650, 0.25).travelDirection, 1, "source-facing drift remains real movement");
  assert.ok(Math.abs(sample(650, 0.5).xNorm) < 1e-9, "horizontal travel eases to zero at the normalized turn apex");
  assert.ok(Math.abs(sample(650, 0.5).yNorm) > 0.001, "the apex has an arc path rather than a stationary frame");
  assert.ok(sample(650, 0.75).motionScale > sample(650, 0.5).motionScale, "destination launch accelerates out of the reversal");
});

test("a committed reversal keeps its arc when its target jumps across the fish", () => {
  const getReversal = vm.runInNewContext(`(${extractFunction(motionSource, "getFishTurnReversalTraversal")})`, {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    FISH_TURN_TRAVERSAL_ARC_APEX_PROGRESS: 0.5,
    FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE: 0.2,
    FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE: 0.52,
    FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE: 0.2,
    FISH_TURN_TRAVERSAL_ARC_VERTICAL_RATIO: 0.26
  });
  const fish = { turnStartedAt: 1000, turnDurationMs: 650, turnFromDirection: 1, turnToDirection: -1 };
  getReversal(fish, -0.3, 0.08, 1000);
  const steady = getReversal({ ...fish }, -0.3, 0.08, 1325);
  const crossed = getReversal(fish, 0.01, -0.2, 1325);
  assert.equal(crossed.xNorm, steady.xNorm);
  assert.equal(crossed.yNorm, steady.yNorm);
  fish.turnStartedAt = 2000;
  assert.ok(getReversal(fish, 0.3, -0.2, 2325).yNorm < 0, "a new turn may choose a new arc");
});

for (const momentumOnly of [false, true]) {
  test(`obstacle anticipation detects a thin object ${momentumOnly ? "along carried momentum" : "between probe endpoints"}`, () => {
    const fish = { xNorm: 0.5, yNorm: 0.5, direction: 1, traversalSpeedNorm: 0.05,
      motionVelocityXNorm: momentumOnly ? -0.05 : 0, motionVelocityYNorm: 0 };
    const obstacleX = momentumOnly ? 0.46 : 0.54;
    let slideCalls = 0;
    const anticipate = vm.runInNewContext(`(${extractFunction(motionSource, "getFishAnticipatoryObstacleWaypoint")})`, {
      clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      FISH_OBSTACLE_LOOKAHEAD_MIN_NORM: 0.045, FISH_OBSTACLE_LOOKAHEAD_MAX_NORM: 0.11,
      FISH_OBSTACLE_WAYPOINT_MS: 900,
      getFishBoundaryAnticipationWaypoint: () => null,
      clampFishXNormToMobileViewport: x => x,
      getFishTankLayer: () => 1, getFishTankSubLayer: () => 0,
      getFishCollisionPose: (f, s, t, x, y) => ({ x, y }),
      findBlockingCaveForFishPose: () => null,
      getOverlappingDecorForFish: (f, s, t, pose) => Math.abs(pose.x - obstacleX) < 0.005
        ? [{ item: { id: "thin-ornament" } }] : [],
      isCaveDecorKey: () => false,
      findFishObstacleSlideMove: () => { slideCalls++; return { xNorm: 0.53, yNorm: 0.58 }; }
    });
    const waypoint = anticipate(fish, { behavior: "swim" }, 0.8, 0.5, 1000);
    assert.equal(waypoint?.reason, "decor");
    assert.equal(slideCalls, 1);
    anticipate(fish, { behavior: "swim" }, 0.8, 0.5, 1016);
    assert.equal(slideCalls, 1, "hold the detour instead of changing sides every frame");
  });
}

test("vertical targets preserve render facing while horizontal intent can request a turn", () => {
  const context = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    TANK_WIDTH: 1500,
    TANK_HEIGHT: 1000,
    FISH_VERTICAL_TRAVERSAL_CLEARANCE_FROM_HEIGHT: 0.18,
    FISH_VERTICAL_TRAVERSAL_MIN_LATERAL_CLEARANCE_PX: 28,
    FISH_VERTICAL_TRAVERSAL_MAX_LATERAL_CLEARANCE_PX: 64,
    getFishFacingDirection: (fish) => Number(fish?.displayDirection) < 0 ? -1 : 1
  };
  const getDirection = vm.runInNewContext(
    `(${extractFunction(turnSource, "getFishSteeringHorizontalDirection")})`,
    context
  );
  const fish = { traversalHeadingXNorm: 1, displayDirection: 1 };

  assert.equal(getDirection(fish, 0, -0.3), 1, "vertical travel does not request a left/right reversal");
  assert.equal(getDirection(fish, -0.06, -0.3), -1, "the fish turns back after gaining lateral clearance");
  assert.equal(getDirection(fish, -0.2, -0.02), -1, "ordinary horizontal travel still follows its destination");
  assert.match(motionSource, /requestedHorizontalDirection[\s\S]*getFishSteeringHorizontalDirection\(fish, moveDx, moveDy\)/);
});

test("vertical steering reaches a fully vertical heading", () => {
  const context = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    TANK_WIDTH: 1500,
    TANK_HEIGHT: 1000,
    FISH_VERTICAL_TRAVERSAL_MAX_RATIO: 1,
    FISH_VERTICAL_TRAVERSAL_CLEARANCE_FROM_HEIGHT: 0.18,
    FISH_VERTICAL_TRAVERSAL_MIN_LATERAL_CLEARANCE_PX: 28,
    FISH_VERTICAL_TRAVERSAL_MAX_LATERAL_CLEARANCE_PX: 64,
    getFishFacingDirection: (fish) => Number(fish?.displayDirection) < 0 ? -1 : 1
  };
  context.getFishSteeringHorizontalDirection = vm.runInNewContext(
    `(${extractFunction(turnSource, "getFishSteeringHorizontalDirection")})`,
    context
  );
  const getVector = vm.runInNewContext(
    `(${extractFunction(turnSource, "getFishGradualSteeringVector")})`,
    context
  );
  const fish = { traversalHeadingXNorm: 1, displayDirection: 1, steeringVerticalRatio: 0 };
  let vector = null;
  for (let frame = 0; frame < 180; frame += 1) {
    vector = getVector(fish, 0, -0.35, 1 / 60);
  }

  assert.equal(fish.steeringVerticalRatio, -1);
  assert.equal(vector.xNorm, 0);
  assert.ok(vector.yNorm < 0);
});

test("v26 latches the last rendered tilt and applies it to ordinary fish during the handoff", () => {
  const turnRendererSource = read("public/app-src/rendering/fish-turn-v26.js");
  assert.match(turnRendererSource, /previousVisualPose = runtime\?\.fishVisualPoseSmoothingStates instanceof Map/);
  assert.match(turnRendererSource, /fish\.turnV26EntryTilt = Number\.isFinite\(Number\(previousVisualPose\?\.tilt\)\)/);
  assert.match(rendererSource, /else \{\s*tankContext\.rotate\(v26VisualContinuity\?\.tilt \?\? pose\.tilt\);\s*\}/);
});

test("inspect approaches retain the decor waypoint instead of bypassing it", () => {
  assert.match(motionSource, /activeFishActionSteering\.type === "inspect"[\s\S]*activeFishActionSteering\.inspectPhase === "approach"/);
  assert.match(motionSource, /const decorApproachWaypoint = decorApproachEligible[\s\S]*getFishDecorApproachWaypoint/);
});

test("phase 8 documentation keeps visual trajectories separate from authoritative locomotion", () => {
  const contract = read("docs/fish-turn-movement-contract.md");
  assert.match(contract, /Phase 8 v26 timing and locomotion reconciliation/);
  assert.match(contract, /only a turn whose latched renderer backend is `v26` receives the approved `650 ms` duration/i);
  assert.match(contract, /does not become `fish\.xNorm` or `fish\.yNorm`/i);
  assert.match(contract, /source-facing drift -> continuous water arc -> destination-facing launch/i);
});
