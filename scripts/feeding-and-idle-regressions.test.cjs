const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const bootstrap = read('public/app-src/00-bootstrap.js');
const feeding = read('public/app-src/fish/feeding-and-medicine.js');
const meals = read('public/app-src/fish/meals-and-needs.js');
const motion = read('public/app-src/fish/predators-and-motion.js');
const actions = read('public/app-src/fish/actions.js');
const debugTools = read('public/app-src/debug/tools.js');
const simulation = read('public/app-src/tank/simulation.js');
const renderer = read('public/app-src/rendering/fish-and-effects.js');

test('feeding preserves each fish depth layer instead of pulling fish to layers 1 or 2', () => {
  assert.doesNotMatch(motion, /pellet\.settled \? TANK_DEPTH_LAYERS : clampTankLayer\(Math\.min\(getFishTankLayer\(fish\), 2\)\)/);
  assert.match(motion, /effectiveBehavior === "sucker"[\s\S]*getSuckerFishGlassLayer\(fish\)[\s\S]*: getFishTankLayer\(fish\)/);
  assert.doesNotMatch(actions, /waitfood[\s\S]{0,700}Math\.min\(getFishTankLayer\(fish\), 2\)/);
  assert.doesNotMatch(debugTools, /anticipate-food[\s\S]{0,1600}Math\.min\(getFishTankLayer\(fish\), 2\)/);
});

test('hand-fed floating food gets a real above-water entry and then resumes surface bobbing', () => {
  assert.match(feeding, /const handSurfaceDrop = Boolean\(food\.surfaceFloating \|\| food\.id === "fishFlakes"\) && !hasCustomDropStart/);
  assert.match(feeding, /WATER_SURFACE_Y - randomBetween\(40, 90\)/);
  assert.match(feeding, /randomBetween\(450, 850\)/);
  assert.match(feeding, /const entryStartXNorm = handSurfaceDrop[\s\S]*\? dropXNorm/);
  assert.match(feeding, /dropStartXNorm: entryStartXNorm/);
  assert.match(feeding, /dropStartYNorm: entryStartYNorm/);
  assert.match(meals, /hasCustomDropStart && dropProgress < 1 && \(pellet\.surfaceFloating \|\| pellet\.foodKey === "fishFlakes"\)/);
  assert.match(meals, /const airFall = clamp\(dropProgress \/ 0\.68/);
  assert.match(meals, /const waterSettle = clamp\(\(dropProgress - 0\.68\) \/ 0\.32/);
  assert.match(meals, /WATER_SURFACE_Y \/ TANK_HEIGHT \+ 0\.012 \+ Math\.sin/);
});

test('surface floating food is not snapped to the waterline while its entry animation is active', () => {
  assert.match(feeding, /const entryActive = hasDropEntry && now < Number\(pellet\.createdAt\) \+ dropDurationMs/);
  assert.match(feeding, /if \(entryActive\) \{\s*return false;\s*\}/);
});

test('pellets remain independent consumables and eating removes only the reached pellet', () => {
  assert.match(motion, /state\.floatingPellets = state\.floatingPellets\.filter\(\(entry\) => entry\.id !== pellet\.id\)/);
  assert.match(motion, /assignFloatingPelletsToHungryFish\(now\)/);
  assert.match(feeding, /for \(const pellet of state\.floatingPellets\)/);
});


test('surface flakes can be eaten at the fish highest legal Y without exact vertical overlap', () => {
  assert.match(motion, /const surfaceFoodTarget = Boolean\(pellet\.surfaceFloating \|\| pellet\.foodKey === "fishFlakes"\)/);
  assert.match(motion, /clampFishYNormToLayer\([\s\S]*mouthChaseTarget\.yNorm[\s\S]*getFishTankLayer\(fish\)/);
  assert.match(motion, /const surfaceSwimRange = surfaceFood[\s\S]*getLayerSwimYRange\(getFishTankLayer\(fish\), fish, species/);
  assert.match(motion, /fishAtHighestLegalSurfaceReach/);
  assert.match(motion, /surfaceHorizontalReachPx/);
  assert.match(motion, /const mouthReachedPellet = normalMouthReachedPellet \|\| surfaceMouthReachedPellet/);
});

test('expired or invalid feeding targets stop pulling fish toward the old surface target', () => {
  assert.match(simulation, /fish\.targetXNorm = fish\.xNorm;\s*fish\.targetYNorm = fish\.yNorm;\s*fish\.targetAt = now;/);
  assert.match(motion, /fish\.feedingPelletId = null;\s*fish\.targetXNorm = fish\.xNorm;\s*fish\.targetYNorm = fish\.yNorm;\s*fish\.targetAt = now;/);
});


test('hand-fed surface food falls vertically instead of flying in from a side', () => {
  assert.match(feeding, /const entryStartXNorm = handSurfaceDrop[\s\S]*\? dropXNorm/);
  assert.match(meals, /xNorm: startXNorm,[\s\S]*yNorm: startYNorm \+ \(targetYNorm - startYNorm\) \* entryProgress/);
  assert.doesNotMatch(meals, /dropProgress \* Math\.PI \* 1\.35/);
});

test('idle tail keeps a tiny stationary floor without replacing the original swim movement driver', () => {
  assert.match(bootstrap, /stationaryIntensityFloor:\s*0\.04/);
  assert.match(bootstrap, /stationaryFrequencyFloor:\s*0\.08/);
  assert.doesNotMatch(bootstrap, /fishSwimMovementSamples:\s*new Map\(\)/);
  assert.match(renderer, /function getFishSwimMovementFactor\(fish\)/);
  assert.match(renderer, /const motionFactor = clamp\(\(\(Number\(fish\.motionLevel\) \|\| 0\.04\) - 0\.03\) \/ 0\.75, 0, 1\)/);
  assert.match(renderer, /const distanceFactor = clamp\(targetDistance \/ 0\.07, 0, 1\)/);
  assert.match(renderer, /return Math\.max\(motionFactor, distanceFactor\)/);
  assert.match(renderer, /const physicallyMoving = targetDistance > 0\.008 \|\| \(Number\(fish\?\.motionLevel\) \|\| 0\) > 0\.14/);
});
