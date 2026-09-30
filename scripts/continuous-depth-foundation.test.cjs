const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const LAYOUT_PATH = path.join(ROOT, 'public/app-src/decor/layout-and-layers.js');
const PERSISTENCE_PATH = path.join(ROOT, 'public/app-src/core/settings-and-persistence.js');
const CAVES_PATH = path.join(ROOT, 'public/app-src/fish/caves-and-collision.js');
const SCHOOLING_PATH = path.join(ROOT, 'public/app-src/fish/gravel-and-schooling.js');
const FISH_RENDER_PATH = path.join(ROOT, 'public/app-src/rendering/fish-and-effects.js');
const BEHAVIOR_PATH = path.join(ROOT, 'public/app-src/fish/needs-disease-and-behavior.js');
const PREDATOR_PATH = path.join(ROOT, 'public/app-src/fish/predators-and-motion.js');
const FISH_MOTION_PATH = path.join(ROOT, 'public/app-src/rendering/fish-motion-and-floor.js');
const BOOTSTRAP_PATH = path.join(ROOT, 'public/app-src/00-bootstrap.js');

const bootstrap = fs.readFileSync(BOOTSTRAP_PATH, 'utf8');
const layout = fs.readFileSync(LAYOUT_PATH, 'utf8');
const persistence = fs.readFileSync(PERSISTENCE_PATH, 'utf8');
const caves = fs.readFileSync(CAVES_PATH, 'utf8');
const schooling = fs.readFileSync(SCHOOLING_PATH, 'utf8');
const fishRendering = fs.readFileSync(FISH_RENDER_PATH, 'utf8');
const behavior = fs.readFileSync(BEHAVIOR_PATH, 'utf8');
const predators = fs.readFileSync(PREDATOR_PATH, 'utf8');
const fishMotion = fs.readFileSync(FISH_MOTION_PATH, 'utf8');
const motionBootstrap = bootstrap;

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let parameterEnd = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    if (source[index] === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parameterEnd = index;
        break;
      }
    }
  }
  assert.ok(parameterEnd >= 0, `${name} should have balanced parameters`);
  const bodyStart = source.indexOf('{', parameterEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createDepthHelpers() {
  const context = {
    clamp,
    DEFAULT_TANK_LAYER: 3,
    DEFAULT_TANK_SUBLAYER: 2,
    TANK_DEPTH_LAYERS: 5,
    TANK_DEPTH_SUBLAYERS: 3,
    TANK_DEPTH_POSITIONS: 15,
    TANK_DEPTH_REAR_USABLE_Z: 0.05,
    TANK_DEPTH_FRONT_USABLE_Z: 0.95,
    DEFAULT_DECOR_DEPTH_RADIUS: 0.04,
    DEFAULT_FISH_DEPTH_RADIUS: 0.025
  };
  for (const name of [
    'clampTankLayer',
    'clampTankSubLayer',
    'getTankDepthPositionIndex',
    'getTankDepthPositionFromIndex',
    'sanitizeTankDepthZ',
    'sanitizeTankDepthRadius',
    'getTankDepthBucket',
    'getTankDepthVolume',
    'doTankDepthVolumesOverlap',
    'getTankDepthZFromLegacyPosition'
  ]) {
    context[name] = vm.runInNewContext(`(${extractFunction(layout, name)})`, context);
  }
  return context;
}

test('Phase 1 maps legacy front-to-rear positions into normalized rear-to-front Z', () => {
  const depth = createDepthHelpers();
  assert.equal(depth.getTankDepthZFromLegacyPosition(1, 1), 0.95);
  assert.equal(depth.getTankDepthZFromLegacyPosition(5, 3), 0.05);
  assert.ok(
    depth.getTankDepthZFromLegacyPosition(2, 2) > depth.getTankDepthZFromLegacyPosition(4, 2),
    'legacy front positions should remain closer to the viewer'
  );
});

test('Phase 1 migrates tank decor, tank fish, and stored fish exactly once', () => {
  const depth = createDepthHelpers();
  const migrate = vm.runInNewContext(`(${extractFunction(persistence, 'migrateSaveSchema')})`, depth);
  const legacy = {
    version: 65,
    tanks: [{
      fish: [{ id: 'front', tankLayer: 1, tankSubLayer: 1, desiredTankLayer: 5, desiredTankSubLayer: 3 }],
      placedDecor: [{ id: 'rear-rock', tankLayer: 5 }]
    }],
    storedFish: [{ id: 'mid', tankLayer: 3, tankSubLayer: 2, z: 0.63 }]
  };

  const migrated = migrate(legacy);
  const fish = migrated.tanks[0].fish[0];
  const decor = migrated.tanks[0].placedDecor[0];
  assert.equal(fish.z, 0.95);
  assert.equal(fish.desiredZ, 0.05);
  assert.equal(decor.z, depth.getTankDepthZFromLegacyPosition(5, 2));
  assert.equal(migrated.storedFish[0].z, 0.63, 'a valid existing Z value is preserved');
  assert.equal(fish.depthRadius, 0.025);
  assert.equal(decor.depthRadius, 0.04);

  const currentSave = { ...migrated, version: 66 };
  const current = migrate(currentSave);
  assert.equal(current, currentSave, 'current saves do not receive a second migration pass');
});

test('Phase 1 persists the continuous-depth schema and leaves legacy fields available', () => {
  assert.match(bootstrap, /const STATE_VERSION = 66;/);
  assert.match(persistence, /if \(incomingVersion < 66\)/);
  assert.match(layout, /z,\n    desiredZ,\n    depthRadius:/);
  assert.match(layout, /tankLayer: clampTankLayer/);
});

test('Phase 4 uses bounded continuous depth volumes and broad-phase buckets', () => {
  const depth = createDepthHelpers();
  assert.equal(depth.getTankDepthBucket(0.05), 0);
  assert.equal(depth.getTankDepthBucket(0.95), 9);
  assert.equal(depth.getTankDepthBucket(0.5), 5);
  const boundedVolume = depth.getTankDepthVolume(0.07, 0.04);
  assert.equal(boundedVolume.min, 0.05, 'depth volumes stay inside the usable tank bounds');
  assert.ok(Math.abs(boundedVolume.max - 0.11) < 0.000001, 'depth volumes preserve their requested extent');
  assert.equal(depth.doTankDepthVolumesOverlap(0.5, 0.04, 0.56, 0.025), true);
  assert.equal(depth.doTankDepthVolumesOverlap(0.5, 0.04, 0.57, 0.025), false);
});

test('Phase 4 scales decor collision depth volume with visual size', () => {
  const depth = createDepthHelpers();
  const getRadius = vm.runInNewContext(`(${extractFunction(layout, 'getPlacedDecorDepthRadius')})`, depth);
  assert.equal(getRadius({ scale: 1, depthRadius: 0.04 }), 0.04);
  assert.equal(getRadius({ scale: 2, depthRadius: 0.04 }), 0.08);
  assert.equal(getRadius({ scale: 2, depthRadius: 0.12 }), 0.12);
});

test('Phase 3 gives ordinary fish stable, non-layer depth target offsets', () => {
  const getOffset = vm.runInNewContext(`(${extractFunction(layout, 'getFishContinuousDepthOffset')})`);
  const first = getOffset({ id: 'fish-alpha' });
  assert.equal(first, getOffset({ id: 'fish-alpha' }), 'an individual fish keeps its depth preference');
  assert.notEqual(first, getOffset({ id: 'fish-beta' }), 'fish are not forced to share one exact depth');
  assert.ok(first >= -0.025 && first <= 0.025, 'offset stays visually subtle');
});

test('Phase 5 maps cave front, interior, and rear regions onto ordered Z anchors', () => {
  const depth = createDepthHelpers();
  depth.TANK_SUBLAYER_FRONT = 1;
  depth.TANK_SUBLAYER_MIDDLE = 2;
  depth.TANK_SUBLAYER_BACK = 3;
  const getRegions = vm.runInNewContext(`(${extractFunction(caves, 'getCaveDepthRegions')})`, depth);
  const regions = getRegions({ frontLayer: 2, backLayer: 4 });
  assert.ok(regions.front > regions.interior, 'cave entrance remains closer than its interior');
  assert.ok(regions.interior > regions.rear, 'cave interior retains rear volume behind its entry');
  assert.ok(regions.rear >= 0.05 && regions.front <= 0.95, 'cave regions remain inside tank depth bounds');
});

test('Phase 6 gives school depth slots restrained continuous formation offsets', () => {
  const context = { assignFishSchoolFormationDepthSlot: fish => fish.slot };
  const getOffset = vm.runInNewContext(`(${extractFunction(schooling, 'getFishSchoolFormationDepthOffset')})`, context);
  assert.equal(getOffset({ slot: 0 }, {}, 0), 0);
  assert.equal(getOffset({ slot: 1 }, {}, 0), -0.024);
  assert.equal(getOffset({ slot: 2 }, {}, 0), 0.024);
  assert.ok(Math.abs(getOffset({ slot: 8 }, {}, 0)) <= 0.024, 'formation depth stays shallow');
});

test('Phase 7 cave occlusion uses a stable continuous-depth threshold', () => {
  const runtime = { caveRenderOcclusionByFishId: new Map() };
  const context = {
    runtime,
    getFishCaveDepthRegion: (_fish, region) => region === 'front' ? 0.8 : 0.4,
    getFishTankDepthZ: fish => fish.z
  };
  const isInside = vm.runInNewContext(`(${extractFunction(fishRendering, 'isFishInCaveRenderSublayer')})`, context);
  const fish = { id: 'cave-fish', caveDecorId: 'cave', caveState: 'enter', z: 0.59 };
  assert.equal(isInside(fish), false, 'fish remains in front until it clearly crosses the opening threshold');
  fish.z = 0.58;
  assert.equal(isInside(fish), true);
  fish.z = 0.605;
  assert.equal(isInside(fish), true, 'hysteresis avoids flicker near the threshold');
  fish.z = 0.62;
  assert.equal(isInside(fish), false);
});

test('Phase 7 treats normalized Z as the fish depth authority', () => {
  const depth = createDepthHelpers();
  depth.getFishTankLayer = () => 5;
  depth.getFishTankSubLayer = () => 3;
  const getFishDepthZ = vm.runInNewContext(`(${extractFunction(layout, 'getFishTankDepthZ')})`, depth);
  assert.equal(getFishDepthZ({ z: 0.71, id: 'continuous-fish' }), 0.71);
  assert.doesNotMatch(extractFunction(layout, 'getFishTankDepthZ'), /fishLayerTravelStepTransitions/);
});

test('Phase 7 deduplicates decor candidates from overlapping depth buckets', () => {
  const depth = createDepthHelpers();
  const counters = Object.create(null);
  depth.runtime = { debugFrameProfilerEnabled: true };
  depth.incrementDebugFrameProfilerCounter = (name, amount = 1) => {
    counters[name] = (counters[name] || 0) + amount;
  };
  const shared = { id: 'wide-rock' };
  depth.getPlacedDecorDepthBuckets = () => [[shared], [shared], []];
  const nearby = vm.runInNewContext(`(${extractFunction(caves, 'getNearbyPlacedDecorByDepth')})`, depth);
  const candidates = nearby(0.35, 0.3);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, shared.id);
  assert.equal(counters.depthBucketQueries, 1);
  assert.equal(counters.depthBucketCandidates, 1);
});

test('Phase 8 applies relational behavior targets through continuous depth', () => {
  for (const name of ['applyBehaviorTarget', 'applyDiseaseBehaviorTarget']) {
    const source = extractFunction(behavior, name);
    assert.match(source, /target\.targetZ/);
    assert.match(source, /setFishDesiredTankDepth/);
  }
  assert.match(predators, /setFishDesiredTankDepth\(fish, getFishTankDepthZ\(siren\.fish\)\)/);
  assert.match(predators, /setFishDesiredTankDepth\(fish, getFishTankDepthZ\(companion\.fish\)\)/);
  assert.match(predators, /setFishDesiredTankDepth\(fish, getFishTankDepthZ\(partner\)\)/);
});

test('Motion stabilization eases passive target changes without delaying urgent movement', () => {
  const context = {
    clamp,
    FISH_PASSIVE_TARGET_RESPONSE_PER_SEC: 4.2,
    FISH_PASSIVE_TARGET_MAX_STEP_NORM: 0.026
  };
  const stabilize = vm.runInNewContext(`(${extractFunction(predators, 'stabilizeFishPassiveMotionTarget')})`, context);
  const fish = { activity: 'roam', xNorm: 0.2, yNorm: 0.4, targetXNorm: 0.2, targetYNorm: 0.4 };
  stabilize(fish, 1000, 0.016);
  fish.targetXNorm = 0.8;
  const steering = stabilize(fish, 1100, 0.1);
  assert.ok(steering.xNorm > 0.2 && steering.xNorm < 0.8, 'passive target changes are filtered');
  assert.equal(fish.targetXNorm, 0.8, 'filtering does not overwrite the behavioral destination');
  stabilize(fish, 1200, 0.1, { urgent: true });
  assert.equal(fish.motionTargetXNorm, null, 'urgent movement clears the passive filter state');
  assert.match(motionBootstrap, /const SCHOOL_FORMATION_MIN_SEPARATION_NORM = 0\.052;/);
});

test('Passive target smoothing converges without replacing the behavioral destination', () => {
  const context = {
    clamp,
    FISH_PASSIVE_TARGET_RESPONSE_PER_SEC: 4.2,
    FISH_PASSIVE_TARGET_MAX_STEP_NORM: 0.026
  };
  const stabilize = vm.runInNewContext(`(${extractFunction(predators, 'stabilizeFishPassiveMotionTarget')})`, context);
  const fish = { activity: 'roam', xNorm: 0.2, yNorm: 0.4, targetXNorm: 0.8, targetYNorm: 0.4 };
  let steering = stabilize(fish, 1000, 0.1);
  assert.equal(fish.targetXNorm, 0.8, 'the raw destination stays intact after filtering');
  for (let tick = 1; tick <= 24; tick += 1) steering = stabilize(fish, 1000 + tick * 100, 0.1);
  assert.ok(steering.xNorm > 0.7, 'successive filtered targets converge on the unchanged destination');
  assert.equal(fish.targetXNorm, 0.8);
});

test('Passive swimming preserves momentum while braking instead of snapping onto targets', () => {
  const context = {
    clamp,
    FISH_PASSIVE_VELOCITY_RESPONSE_PER_SEC: 2.65,
    FISH_PASSIVE_BRAKE_DISTANCE_NORM: 0.12,
    FISH_PASSIVE_ARRIVAL_EPSILON_NORM: 0.0012
  };
  const integrate = vm.runInNewContext(`(${extractFunction(predators, 'integrateFishPassiveMotion')})`, context);
  const fish = { motionVelocityXNorm: 0.05, motionVelocityYNorm: 0 };
  const step = integrate(fish, 0.003, 0, 0.06, 0.1);
  assert.ok(step.distance > 0, 'a moving fish should coast into its braking zone');
  assert.ok(step.distance <= 0.003, 'passive motion must not overshoot its target');
  assert.ok(fish.motionVelocityXNorm > 0, 'braking keeps residual momentum for the next frame');
});

test('Passive swimming settles at an aim point without a forced minimum step', () => {
  const context = {
    clamp,
    FISH_PASSIVE_VELOCITY_RESPONSE_PER_SEC: 2.65,
    FISH_PASSIVE_BRAKE_DISTANCE_NORM: 0.12,
    FISH_PASSIVE_ARRIVAL_EPSILON_NORM: 0.0012
  };
  const integrate = vm.runInNewContext(`(${extractFunction(predators, 'integrateFishPassiveMotion')})`, context);
  const fish = { motionVelocityXNorm: 0.04, motionVelocityYNorm: 0 };
  const step = integrate(fish, 0, 0, 0.06, 0.1);
  assert.equal(step.distance, 0, 'an arrived fish does not jitter through its aim point');
  assert.ok(fish.motionVelocityXNorm < 0.04, 'arrival dissipates residual momentum');
});

test('Traversal heading changes only when a fish actually travels', () => {
  const context = {
    clamp,
    FISH_TRAVERSAL_HEADING_MIN_SPEED_NORM: 0.0025,
    FISH_TRAVERSAL_MAX_VELOCITY_NORM: 0.42
  };
  const sync = vm.runInNewContext(`(${extractFunction(predators, 'syncFishTraversalStateFromMove')})`, context);
  const fish = {
    xNorm: 0.5,
    yNorm: 0.4,
    targetXNorm: 0.3,
    targetYNorm: 0.6,
    traversalHeadingXNorm: 1,
    traversalHeadingYNorm: 0,
    traversalSpeedNorm: 0,
    traversalTurnState: 'idle'
  };
  sync(fish, 0.5, 0.4, 1000, 0.1);
  assert.equal(fish.traversalHeadingXNorm, 1, 'an idle target change cannot rotate actual heading');
  assert.equal(fish.traversalHeadingYNorm, 0, 'an idle target change cannot add vertical heading');
  assert.equal(fish.traversalState, 'idle');
  assert.ok(fish.traversalDesiredHeadingXNorm < 0, 'desired heading may update while actual heading stays put');

  fish.xNorm = 0.51;
  fish.yNorm = 0.405;
  sync(fish, 0.5, 0.4, 1100, 0.1);
  assert.equal(fish.traversalState, 'swimming');
  assert.ok(fish.traversalHeadingXNorm > 0, 'actual movement establishes a physical heading');
  assert.ok(fish.traversalHeadingYNorm > 0, 'vertical heading derives from accepted vertical movement');
});

test('Vertical traversal always retains forward travel from physical heading', () => {
  const context = {
    clamp,
    TANK_WIDTH: 1000,
    TANK_HEIGHT: 600,
    FISH_VERTICAL_TRAVERSAL_MAX_RATIO: 0.62,
    FISH_VERTICAL_TRAVERSAL_CLEARANCE_FROM_HEIGHT: 0.4,
    FISH_VERTICAL_TRAVERSAL_MIN_LATERAL_CLEARANCE_PX: 18,
    FISH_VERTICAL_TRAVERSAL_MAX_LATERAL_CLEARANCE_PX: 80,
    getFishFacingDirection: () => -1
  };
  context.getFishSteeringHorizontalDirection = vm.runInNewContext(`(${extractFunction(fishMotion, 'getFishSteeringHorizontalDirection')})`, context);
  const steer = vm.runInNewContext(`(${extractFunction(fishMotion, 'getFishGradualSteeringVector')})`, context);
  const fish = { traversalHeadingXNorm: 1, steeringVerticalRatio: 0 };
  const vector = steer(fish, 0, -0.4, 0.1);
  const horizontalPx = Math.abs(vector.xNorm) * context.TANK_WIDTH;
  const verticalPx = Math.abs(vector.yNorm) * context.TANK_HEIGHT;
  const verticalRatio = verticalPx / Math.hypot(horizontalPx, verticalPx);
  assert.ok(vector.xNorm > 0, 'a vertical target continues along the actual forward heading');
  assert.ok(horizontalPx > 0, 'a climb or dive has real forward displacement');
  assert.ok(verticalRatio <= context.FISH_VERTICAL_TRAVERSAL_MAX_RATIO + 0.000001, 'vertical travel stays in a shallow swim arc');
});

test('Decor investigation receives a committed forward approach instead of a vertical climb', () => {
  const context = {
    clamp,
    Math,
    Number,
    FISH_DECOR_APPROACH_MIN_DISTANCE_NORM: 0.065,
    FISH_DECOR_APPROACH_MIN_HORIZONTAL_LEAD_NORM: 0.085,
    FISH_DECOR_APPROACH_MAX_HORIZONTAL_LEAD_NORM: 0.16,
    FISH_DECOR_APPROACH_MAX_VERTICAL_RATIO: 0.48,
    FISH_DECOR_APPROACH_WAYPOINT_REACH_NORM: 0.024,
    FISH_DECOR_APPROACH_WAYPOINT_MS: 1100
  };
  context.clearFishDecorApproachWaypoint = vm.runInNewContext(
    `(${extractFunction(predators, 'clearFishDecorApproachWaypoint')})`,
    context
  );
  const getApproach = vm.runInNewContext(
    `(${extractFunction(predators, 'getFishDecorApproachWaypoint')})`,
    context
  );
  const fish = {
    xNorm: 0.5,
    yNorm: 0.58,
    direction: 1,
    traversalHeadingXNorm: 1,
    hangoutDecorId: 'anubias'
  };
  const waypoint = getApproach(fish, 0.5, 0.24, 1000);
  assert.ok(waypoint, 'a decor directly above receives an approach waypoint');
  assert.equal(waypoint.reason, 'decor-approach');
  assert.ok(waypoint.xNorm > fish.xNorm, 'the initial approach continues forward');
  assert.ok(Math.abs(waypoint.yNorm - fish.yNorm) <= Math.abs(waypoint.xNorm - fish.xNorm) * 0.48 + 0.000001);
  const stable = getApproach(fish, 0.5, 0.24, 1050);
  assert.deepEqual(stable, waypoint, 'the approach is latched instead of being rebuilt every frame');
});

test('Decor approach yields to normal local arrival and clears when no decor owns the target', () => {
  const context = {
    clamp,
    Math,
    Number,
    FISH_DECOR_APPROACH_MIN_DISTANCE_NORM: 0.065,
    FISH_DECOR_APPROACH_MIN_HORIZONTAL_LEAD_NORM: 0.085,
    FISH_DECOR_APPROACH_MAX_HORIZONTAL_LEAD_NORM: 0.16,
    FISH_DECOR_APPROACH_MAX_VERTICAL_RATIO: 0.48,
    FISH_DECOR_APPROACH_WAYPOINT_REACH_NORM: 0.024,
    FISH_DECOR_APPROACH_WAYPOINT_MS: 1100
  };
  context.clearFishDecorApproachWaypoint = vm.runInNewContext(
    `(${extractFunction(predators, 'clearFishDecorApproachWaypoint')})`,
    context
  );
  const getApproach = vm.runInNewContext(
    `(${extractFunction(predators, 'getFishDecorApproachWaypoint')})`,
    context
  );
  const fish = {
    xNorm: 0.5,
    yNorm: 0.3,
    direction: 1,
    traversalHeadingXNorm: 1,
    hangoutDecorId: 'anubias'
  };
  assert.equal(getApproach(fish, 0.54, 0.33, 1000), null, 'a nearby decor target keeps its precise local arrival');
  fish.traversalDecorApproachWaypointXNorm = 0.62;
  fish.traversalDecorApproachWaypointYNorm = 0.34;
  fish.traversalDecorApproachUntil = 2000;
  fish.hangoutDecorId = null;
  assert.equal(getApproach(fish, 0.54, 0.33, 1100), null);
  assert.equal(fish.traversalDecorApproachWaypointXNorm, null);
});

test('Turn reversal traversal follows a continuous water arc rather than stopping and switching direction', () => {
  const context = {
    clamp,
    FISH_TURN_TRAVERSAL_ARC_APEX_PROGRESS: 0.5,
    FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE: 0.2,
    FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE: 0.52,
    FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE: 0.2,
    FISH_TURN_TRAVERSAL_ARC_VERTICAL_RATIO: 0.26
  };
  const getReversal = vm.runInNewContext(`(${extractFunction(predators, 'getFishTurnReversalTraversal')})`, context);
  const fish = {
    turnStartedAt: 1000,
    turnDurationMs: 1000,
    turnFromDirection: 1,
    turnToDirection: -1,
    traversalSpeedNorm: 0.04,
    swimSpeed: 0.05
  };
  const drift = getReversal(fish, -0.3, 0.08, 1100);
  assert.ok(drift.xNorm > 0, 'the first half of a reversal keeps the source-facing drift');
  assert.ok(drift.motionScale > 0, 'a reversal remains real traversal, not an in-place flip');
  const apex = getReversal(fish, -0.3, 0, 1500);
  assert.ok(Math.abs(apex.xNorm) < 1e-9, 'horizontal momentum eases through zero at the turn apex');
  assert.ok(Math.abs(apex.yNorm) > 0.001, 'the apex carries a water arc instead of a dead stop');
  const launch = getReversal(fish, -0.3, 0.08, 1800);
  assert.ok(launch.xNorm < 0, 'after the flip, travel commits toward the destination side');
  assert.ok(launch.motionScale > drift.motionScale, 'the new direction accelerates out of the flip');
});

test('A completed turnaround commits to forward travel before another ordinary reversal', () => {
  const motionSource = fishMotion;
  const context = {
    Math,
    Number,
    FISH_TURNAROUND_COOLDOWN_MS: 850,
    FISH_TURNAROUND_COOLDOWN_MAX_MS: 1700,
    FISH_TURNAROUND_MIN_POST_TURN_TRAVEL_NORM: 0.045
  };
  context.normalizeFishHorizontalDirection = (value, fallback = 1) => Number(value || fallback) < 0 ? -1 : 1;
  context.getFishFacingDirection = fish => Number(fish?.displayDirection) < 0 ? -1 : 1;
  const begin = vm.runInNewContext(`(${extractFunction(motionSource, 'beginFishTurnaroundCooldown')})`, context);
  const getState = vm.runInNewContext(`(${extractFunction(motionSource, 'getFishTurnaroundCooldownState')})`, context);
  const fish = { xNorm: 0.5, yNorm: 0.5, displayDirection: -1 };
  begin(fish, -1, 1000);
  const early = getState(fish, 1200);
  assert.equal(early.active, true);
  assert.equal(early.direction, -1);
  fish.xNorm = 0.55;
  const released = getState(fish, 1900);
  assert.equal(released.active, false, 'enough forward travel releases the normal reversal gate');
});

test('Turnaround cooldown routes a shallow forward continuation and keeps urgent movement exempt', () => {
  const source = extractFunction(predators, 'updateFishMotion');
  assert.match(source, /const turnaroundCooldownBypass = Boolean\(obstacleWaypoint\)\s*\|\| panicOwnsMovement/);
  assert.match(source, /\|\| zombieAggressionOwnsMovement/);
  assert.match(source, /\|\| Boolean\(getActiveFishCollisionAvoidance\(fish, now\)\)/);
  assert.match(source, /moveDx = turnaroundCooldown\.direction \* forwardMagnitude;/);
  assert.match(source, /FISH_TURNAROUND_COOLDOWN_MAX_VERTICAL_RATIO/);
  assert.match(source, /&& !turnaroundCooldown\.active/);
});

test('Traversal target commitment rejects opposite target churn during a turn', () => {
  const context = {
    clamp,
    FISH_DIRECTION_TARGET_DEADZONE_NORM: 0.006,
    FISH_TRAVERSAL_TARGET_RESPONSE_PER_SEC: 3.4,
    FISH_TRAVERSAL_TARGET_MAX_STEP_NORM: 0.032
  };
  const stabilize = vm.runInNewContext(`(${extractFunction(predators, 'stabilizeFishTraversalTarget')})`, context);
  const fish = {
    activity: 'roam',
    xNorm: 0.5,
    yNorm: 0.5,
    targetXNorm: 0.82,
    targetYNorm: 0.46,
    traversalSteeringTargetXNorm: 0.28,
    traversalSteeringTargetYNorm: 0.52,
    traversalCommittedDirection: -1,
    traversalTurnCommittedUntil: 1800
  };
  const held = stabilize(fish, 1200, 0.1);
  assert.equal(held.xNorm, 0.28, 'an opposite target cannot restart a committed reversal');
  assert.equal(held.yNorm, 0.52);
  const released = stabilize(fish, 1900, 0.1);
  assert.ok(released.xNorm > held.xNorm, 'the target smoothly resumes after the short commitment');
});

test('Boundary anticipation chooses a detour before a fish reaches the tank edge', () => {
  const context = {
    clamp,
    FISH_BOUNDARY_ANTICIPATION_INSET_NORM: 0.05
  };
  const getWaypoint = vm.runInNewContext(`(${extractFunction(predators, 'getFishBoundaryAnticipationWaypoint')})`, context);
  const fish = { xNorm: 0.875, yNorm: 0.42 };
  const waypoint = getWaypoint(fish, 0.92, 0.42);
  assert.equal(waypoint.reason, 'right-wall');
  assert.ok(waypoint.xNorm > fish.xNorm, 'the detour retains a small amount of forward travel');
  assert.notEqual(waypoint.yNorm, fish.yNorm, 'the detour begins curving before the collision boundary');
});

test('Cruise waypoints carry a roaming fish through an aim point instead of stopping on it', () => {
  const context = {
    clamp,
    getFishTraversalCruiseProfile: () => ({ enabled: true, waypointScale: 1 }),
    FISH_CRUISE_WAYPOINT_MIN_DISTANCE_NORM: 0.07,
    FISH_CRUISE_WAYPOINT_EXTENSION_NORM: 0.085,
    FISH_CRUISE_WAYPOINT_REACH_NORM: 0.028,
    FISH_CRUISE_WAYPOINT_MS: 1150
  };
  const getWaypoint = vm.runInNewContext(`(${extractFunction(predators, 'getFishCruiseContinuationWaypoint')})`, context);
  const fish = {
    xNorm: 0.5,
    yNorm: 0.46,
    direction: 1,
    traversalHeadingXNorm: 1,
    traversalHeadingYNorm: 0
  };
  const first = getWaypoint(fish, { behavior: 'fish' }, 0.54, 0.46, 1000);
  assert.ok(first.xNorm > 0.54, 'the first cruise point sits beyond the nearby aim point');
  fish.xNorm = first.xNorm - 0.012;
  const next = getWaypoint(fish, { behavior: 'fish' }, 0.54, 0.46, 1200);
  assert.ok(next.xNorm > fish.xNorm, 'passing the aim point continues along physical heading instead of reversing');
  assert.equal(next.reason, 'cruise-chain');
});

test('Cruise waypoints turn away from all tank boundaries instead of pinning to an edge', () => {
  const context = {
    clamp,
    getFishTraversalCruiseProfile: () => ({ enabled: true, waypointScale: 1 }),
    FISH_CRUISE_WAYPOINT_MIN_DISTANCE_NORM: 0.07,
    FISH_CRUISE_WAYPOINT_EXTENSION_NORM: 0.085,
    FISH_CRUISE_WAYPOINT_REACH_NORM: 0.028,
    FISH_CRUISE_WAYPOINT_MS: 1150
  };
  const getWaypoint = vm.runInNewContext(`(${extractFunction(predators, 'getFishCruiseContinuationWaypoint')})`, context);
  const cases = [
    { fish: { xNorm: 0.91, yNorm: 0.4 }, target: [0.92, 0.4], inward: point => point.xNorm < 0.91 && point.yNorm !== 0.4 },
    { fish: { xNorm: 0.09, yNorm: 0.6 }, target: [0.08, 0.6], inward: point => point.xNorm > 0.09 && point.yNorm !== 0.6 },
    { fish: { xNorm: 0.4, yNorm: 0.15 }, target: [0.4, 0.14], inward: point => point.yNorm > 0.15 && point.xNorm !== 0.4 },
    { fish: { xNorm: 0.6, yNorm: 0.79 }, target: [0.6, 0.8], inward: point => point.yNorm < 0.79 && point.xNorm !== 0.6 }
  ];
  for (const entry of cases) {
    const fish = { ...entry.fish, direction: 1, traversalHeadingXNorm: 1, traversalHeadingYNorm: 0 };
    const point = getWaypoint(fish, { behavior: 'fish' }, entry.target[0], entry.target[1], 1000);
    assert.equal(point.reason, 'cruise-boundary');
    assert.ok(entry.inward(point), 'the boundary point should retain a route back into the tank');
  }
});

test('Traversal tuning distinguishes cruising fish from intentional hoverers and crawlers', () => {
  const context = {
    clamp,
    getFishLocomotionProfile: fish => fish.profile,
    FISH_CRUISE_ENDPOINT_PATTERNS: new Set([
      'attached-grazer', 'bottom-stop-go', 'bottom-graze', 'cave-hover-dart',
      'deliberate-hover', 'group-hover', 'home-hover', 'perch-dart',
      'precision-hover', 'substrate-crawl', 'surface-ambush', 'vertical-hover'
    ])
  };
  const getProfile = vm.runInNewContext(`(${extractFunction(predators, 'getFishTraversalCruiseProfile')})`, context);
  const cruiser = getProfile({ profile: { movementPattern: 'wide-cruise', cruiseWaypointScale: 1 } }, { behavior: 'fish' });
  const hoverer = getProfile({ profile: { movementPattern: 'precision-hover' } }, { behavior: 'fish' });
  const crawler = getProfile({ profile: { movementPattern: 'open-water-cruise' } }, { behavior: 'snail' });
  assert.equal(cruiser.enabled, true);
  assert.ok(cruiser.waypointScale >= 1.14, 'open-water cruisers retain a longer forward flow');
  assert.equal(hoverer.enabled, false, 'precision hoverers keep intentional arrival points');
  assert.equal(crawler.enabled, false, 'substrate crawlers do not inherit swim-through routes');
});

test('Ordinary roaming chooses a continuous desired depth while retaining compatibility layers', () => {
  const source = extractFunction(predators, 'assignSpeciesRoamTarget');
  assert.match(source, /setFishDesiredTankDepth\(fish, targetRoamDepthZ\)/);
  assert.match(source, /randomBetween\(-0\.072, 0\.072\)/);
  assert.doesNotMatch(source, /setFishDesiredTankLayer\(fish, targetLayer\)/);
  assert.match(motionBootstrap, /const FISH_CRUISE_ENDPOINT_PATTERNS = new Set\(\[/);
  assert.doesNotMatch(motionBootstrap, /FISH_PASSIVE_TARGET_DEADZONE_NORM/);
});

test('Cruise continuation clears stale route state when an intentional endpoint takes ownership', () => {
  const context = {
    clamp,
    getFishTraversalCruiseProfile: () => ({ enabled: false, waypointScale: 1 }),
    clearFishCruiseWaypoint: fish => {
      fish.traversalCruiseWaypointXNorm = null;
      fish.traversalCruiseWaypointYNorm = null;
      fish.traversalCruiseSourceTargetXNorm = null;
      fish.traversalCruiseSourceTargetYNorm = null;
      fish.traversalCruiseUntil = 0;
    }
  };
  const getWaypoint = vm.runInNewContext(`(${extractFunction(predators, 'getFishCruiseContinuationWaypoint')})`, context);
  const fish = {
    xNorm: 0.5,
    yNorm: 0.46,
    traversalCruiseWaypointXNorm: 0.7,
    traversalCruiseWaypointYNorm: 0.46,
    traversalCruiseSourceTargetXNorm: 0.62,
    traversalCruiseSourceTargetYNorm: 0.46,
    traversalCruiseUntil: 4000
  };
  assert.equal(getWaypoint(fish, { behavior: 'fish' }, 0.52, 0.46, 1000), null);
  assert.equal(fish.traversalCruiseWaypointXNorm, null);
  assert.equal(fish.traversalCruiseUntil, 0);
});

test('Traversal routing gives obstacle avoidance priority over a cruise waypoint', () => {
  const source = extractFunction(predators, 'updateFishMotion');
  assert.match(source, /const decorApproachWaypoint = decorApproachEligible/);
  assert.match(source, /const intendedTraversalTarget = decorApproachWaypoint \|\| cruiseWaypoint \|\| traversalTarget;/);
  assert.match(source, /getFishAnticipatoryObstacleWaypoint\(fish, species, intendedTraversalTarget\.xNorm, intendedTraversalTarget\.yNorm, now\)/);
  assert.match(source, /const steeringTargetXNorm = obstacleWaypoint\?\.xNorm \?\? intendedTraversalTarget\.xNorm;/);
});

test('Traversal save state clamps route waypoints and drops malformed legacy values', () => {
  const context = {
    clamp,
    FISH_TRAVERSAL_MAX_VELOCITY_NORM: 0.42,
    FISH_TRAVERSAL_HEADING_MIN_SPEED_NORM: 0.0025
  };
  const sanitize = vm.runInNewContext(`(${extractFunction(layout, 'sanitizeFishTraversalState')})`, context);
  const state = sanitize({
    traversalCruiseWaypointXNorm: 4,
    traversalCruiseWaypointYNorm: -2,
    traversalCruiseSourceTargetXNorm: 'bad',
    traversalCruiseSourceTargetYNorm: 0.5,
    traversalCruiseUntil: -90
  }, { displayDirection: -1, xNorm: 0.4, yNorm: 0.5, targetXNorm: 0.6, targetYNorm: 0.5, now: 1234 });
  assert.equal(state.traversalCruiseWaypointXNorm, 0.92);
  assert.equal(state.traversalCruiseWaypointYNorm, 0.14);
  assert.equal(state.traversalCruiseSourceTargetXNorm, null);
  assert.equal(state.traversalCruiseSourceTargetYNorm, 0.5);
  assert.equal(state.traversalCruiseUntil, 0);
});

test('Phase 2 gives decor a restrained rear-to-front visual depth scale', () => {
  const depth = createDepthHelpers();
  const getScale = vm.runInNewContext(`(${extractFunction(fs.readFileSync(path.join(ROOT, 'public/app-src/rendering/decor.js'), 'utf8'), 'getDecorDepthScaleForZ')})`, depth);
  assert.equal(getScale(0.05), 0.94);
  assert.equal(getScale(0.95), 1);
  assert.ok(getScale(0.5) > 0.94 && getScale(0.5) < 1);
});
