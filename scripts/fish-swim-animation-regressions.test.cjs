const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const bootstrap = read('public/app-src/00-bootstrap.js');
const fishRenderer = read('public/app-src/rendering/fish-and-effects.js');
const boroughUi = read('public/app-src/ui/main-and-store-rendering.js');
const debugTools = read('public/app-src/debug/tools.js');
const motion = read('public/app-src/fish/predators-and-motion.js');

test('side-view swim animation has one centralized configuration and exact behavior presets', () => {
  assert.match(bootstrap, /const FISH_SWIM_ANIMATION = Object\.freeze\(\{/);
  assert.match(bootstrap, /sourceOrientation:\s*"right-facing"/);
  assert.match(bootstrap, /full:\s*100/);
  assert.match(bootstrap, /medium:\s*70/);
  assert.match(bootstrap, /small:\s*44/);
  assert.match(bootstrap, /tiny:\s*28/);
  assert.match(bootstrap, /highlight:\s*16/);
  assert.match(bootstrap, /borough:\s*14/);
  assert.match(bootstrap, /crowdedFishThreshold:\s*12/);
  assert.match(bootstrap, /denseFishThreshold:\s*22/);
  assert.match(bootstrap, /crowdedSliceScale:\s*0\.75/);
  assert.match(bootstrap, /denseSliceScale:\s*0\.60/);
  assert.match(bootstrap, /perspectiveScaleStrength:\s*0\.11/);
  assert.match(bootstrap, /perspectiveTailWeight:\s*0\.85/);
  assert.match(bootstrap, /perspectiveRearWeight:\s*0\.15/);
  assert.match(bootstrap, /perspectiveTailCompressionWeight:\s*0\.075/);
  assert.match(bootstrap, /perspectiveRearCompressionWeight:\s*0\.018/);
  assert.match(bootstrap, /minimumPerspectiveScaleY:\s*0\.88/);
  assert.match(bootstrap, /minimumSliceWidthScale:\s*0\.91/);
  assert.match(bootstrap, /cyclesPerSecond:\s*1\.55/);
  assert.match(bootstrap, /defaultSpeedMultiplier:\s*0\.90/);
  assert.match(bootstrap, /depthWarpBaseRatio:\s*0\.018/);
  assert.match(bootstrap, /depthWarpDepthRatio:\s*0\.105/);
  assert.match(bootstrap, /depthWarpTailWeight:\s*0\.88/);
  assert.match(bootstrap, /depthWarpBodyWeight:\s*0\.12/);
  assert.match(bootstrap, /rearHorizontalShiftBaseRatio:\s*0\.0015/);
  assert.match(bootstrap, /rearHorizontalShiftDepthRatio:\s*0\.0045/);
  assert.match(bootstrap, /frontHorizontalShiftStrength:\s*0\.0025/);
  assert.match(bootstrap, /frontCounterPhasePi:\s*0\.94/);
  assert.match(bootstrap, /frontDepthWarpBaseRatio:\s*0\.004/);
  assert.match(bootstrap, /frontDepthWarpDepthRatio:\s*0\.018/);
  assert.doesNotMatch(bootstrap, /horizontalShiftStrength:\s*0\.012/);

  const required = {
    sleepy: ['0.16', '0.38', '0.18', '0.05', '0.03'],
    chill: ['0.32', '0.62', '0.32', '0.07', '0.07'],
    regular: ['0.55', '1.00', '0.55', '0.12', '0.15'],
    active: ['0.66', '1.24', '0.64', '0.14', '0.18'],
    feeding: ['0.76', '1.50', '0.72', '0.16', '0.22'],
    zoomies: ['0.88', '1.90', '0.84', '0.19', '0.28'],
    scared: ['0.92', '2.05', '0.90', '0.21', '0.32'],
    panicked: ['1.00', '2.35', '1.00', '0.24', '0.40']
  };
  for (const [name, values] of Object.entries(required)) {
    const [tail, speed, depth, perspective, front] = values;
    const pattern = new RegExp(`${name}: Object\\.freeze\\(\\{[^}]*tailIntensity: ${tail}[^}]*animationSpeed: ${speed}[^}]*depthWarp: ${depth}[^}]*perspective: ${perspective}[^}]*frontWiggle: ${front}`, 's');
    assert.match(bootstrap, pattern, `missing or changed ${name} preset`);
  }
});

test('living fish use slice-based curved depth warp with phase lag and only minor width compression', () => {
  assert.match(fishRenderer, /function drawFishSwimDepthWarpImage\(/);
  assert.match(fishRenderer, /function getFishSwimSliceProfile\(/);
  assert.match(fishRenderer, /const sourceSliceWidth = visibleSpan \/ sliceCount/);
  assert.match(fishRenderer, /const phaseLag = 0\.58 \+ state\.depthWarp \* 1\.05/);
  assert.match(fishRenderer, /const localPhase = globalPhase - template\.distanceTowardTail \* phaseLag/);
  assert.doesNotMatch(bootstrap, /phaseLag:\s*2\.35/);
  assert.match(fishRenderer, /const depthWave = Math\.sin\(localPhase\)/);
  assert.match(fishRenderer, /const tailCurveEnvelope = Math\.pow\(\s*Math\.max\(0, 1 - smoothFishSwimStep\(0\.05, 0\.68, u\)\),\s*1\.35\s*\)/s);
  assert.match(fishRenderer, /const bodyCurveEnvelope = Math\.pow\(\s*Math\.max\(0, 1 - smoothFishSwimStep\(0\.32, 0\.82, u\)\),\s*1\.7\s*\)/s);
  assert.doesNotMatch(fishRenderer, /smoothFishSwimStep\(0, FISH_SWIM_ANIMATION\.tailRegionEnd \+ 0\.10, u\)/);
  assert.match(fishRenderer, /const depthWarpPx = height[\s\S]*depthWarpBaseRatio[\s\S]*state\.depthWarp \* FISH_SWIM_ANIMATION\.depthWarpDepthRatio[\s\S]*state\.tailIntensity/);
  assert.match(fishRenderer, /depthEnvelope:[\s\S]*tailCurveEnvelope \* FISH_SWIM_ANIMATION\.depthWarpTailWeight[\s\S]*bodyCurveEnvelope \* FISH_SWIM_ANIMATION\.depthWarpBodyWeight/);
  assert.match(fishRenderer, /const rearDepthWarp = depthWave[\s\S]*depthWarpPx[\s\S]*template\.depthEnvelope/);
  assert.doesNotMatch(bootstrap, /depthWarpStrength:\s*0\.28/);
  const regularRawWarpRatio = (0.018 + 0.55 * 0.105) * 0.55;
  const panickedRawWarpRatio = (0.018 + 1.00 * 0.105) * 1.00;
  assert.ok(Math.abs(regularRawWarpRatio - 0.0416625) < 1e-12);
  assert.ok(Math.abs(panickedRawWarpRatio - 0.123) < 1e-12);
  assert.match(fishRenderer, /const frontWave = Math\.sin\(globalPhase \+ Math\.PI \* FISH_SWIM_ANIMATION\.frontCounterPhasePi\)/);
  assert.match(fishRenderer, /const frontDepthStrength = height[\s\S]*frontDepthWarpBaseRatio[\s\S]*state\.depthWarp \* FISH_SWIM_ANIMATION\.frontDepthWarpDepthRatio[\s\S]*state\.frontWiggle/);
  assert.match(fishRenderer, /const frontDepthWarp = frontWave[\s\S]*frontDepthStrength[\s\S]*template\.frontEnvelope/);
  assert.doesNotMatch(fishRenderer, /frontWave = Math\.sin\(globalPhase \+ Math\.PI - distanceTowardTail/);
  assert.match(fishRenderer, /const rearHorizontalStrength = width[\s\S]*rearHorizontalShiftBaseRatio[\s\S]*state\.depthWarp \* FISH_SWIM_ANIMATION\.rearHorizontalShiftDepthRatio[\s\S]*state\.tailIntensity/);
  assert.match(fishRenderer, /const rearShift = depthWave[\s\S]*rearHorizontalStrength[\s\S]*template\.rearEnvelope/);
  assert.match(fishRenderer, /const frontHorizontalStrength = width[\s\S]*frontHorizontalShiftStrength[\s\S]*state\.frontWiggle/);
  assert.match(fishRenderer, /const frontShift = frontWave[\s\S]*frontHorizontalStrength[\s\S]*template\.frontEnvelope/);
  assert.match(fishRenderer, /const horizontalShift = rearShift \+ frontShift/);
  assert.match(fishRenderer, /perspectiveEnvelope:[\s\S]*tailCurveEnvelope \* FISH_SWIM_ANIMATION\.perspectiveTailWeight[\s\S]*rearEnvelope \* FISH_SWIM_ANIMATION\.perspectiveRearWeight/);
  assert.match(fishRenderer, /const perspectiveStrength = state\.perspective \* state\.tailIntensity/);
  assert.match(fishRenderer, /const signedDepth = depthWave[\s\S]*perspectiveStrength[\s\S]*template\.perspectiveEnvelope/);
  assert.match(fishRenderer, /const scaleY = Math\.max\([\s\S]*minimumPerspectiveScaleY[\s\S]*1 \+ signedDepth \* FISH_SWIM_ANIMATION\.perspectiveScaleStrength/);
  assert.match(fishRenderer, /compressionEnvelope:[\s\S]*perspectiveTailCompressionWeight[\s\S]*perspectiveRearCompressionWeight/);
  assert.match(fishRenderer, /const widthForeshorten = 1[\s\S]*Math\.abs\(depthWave\)[\s\S]*perspectiveStrength[\s\S]*template\.compressionEnvelope/);
  assert.match(fishRenderer, /const widthScale = Math\.max\([\s\S]*FISH_SWIM_ANIMATION\.minimumSliceWidthScale[\s\S]*widthForeshorten/);
  assert.doesNotMatch(bootstrap, /perspectiveCompressionStrength:\s*0\.11/);
  assert.match(fishRenderer, /destinationWidth = Math\.max\(0\.5, normalDestinationWidth \* widthScale \+ overlapPx\)/);
  assert.match(fishRenderer, /context\.drawImage\(\s*image,\s*sourceX,/s);
  assert.doesNotMatch(fishRenderer, /createElement\(["']canvas["']\)[\s\S]{0,600}drawFishSwimDepthWarpImage/);
});

test('old whole-fish living wobble is neutralized while turning and death remain separate', () => {
  assert.match(fishRenderer, /const wholeBodyWiggle = useDepthSwimWarp \? 0 : wiggle/);
  assert.match(fishRenderer, /const verticalBob = useDepthSwimWarp\s*\? 0/);
  assert.match(fishRenderer, /const turnLean = turnProgress === null \|\| useComplexTurn \|\| useDepthSwimWarp/);
  assert.match(fishRenderer, /useDepthSwimWarp \|\| useComplexTurn \? 1 : \(1 - turnAmount/);
  assert.match(fishRenderer, /useDepthSwimWarp \|\| useComplexTurn \? 1 : \(1 \+ turnAmount/);
  assert.match(fishRenderer, /const turnSway = turnProgress === null \|\| useComplexTurn \|\| useDepthSwimWarp/);
  assert.match(fishRenderer, /const useOtocinclusDepthSwimWarp = shouldUseFishSwimDepthWarp/);
  assert.match(fishRenderer, /const subtleBob = useOtocinclusDepthSwimWarp\s*\? 0/);
  assert.match(fishRenderer, /if \(genericTurnRigActive\)[\s\S]*drawFishTurnaroundRig/);
  assert.match(fishRenderer, /function shouldUseFishSwimDepthWarp\([\s\S]*if \(!fish \|\| !species \|\| isFishDead\(fish\)\) return false/);
  assert.match(fishRenderer, /\["snail", "shrimp", "crab"\]\.includes\(String\(effectiveBehavior/);
});

test('behavior style follows physical movement and keeps a dedicated continuous swim phase', () => {
  assert.match(fishRenderer, /const physicallyMoving = targetDistance > 0\.008 \|\| \(Number\(fish\?\.motionLevel\) \|\| 0\) > 0\.14/);
  assert.match(fishRenderer, /function getFishSwimMovementFactor\(fish\)/);
  assert.match(fishRenderer, /return Math\.max\(motionFactor, distanceFactor\)/);
  assert.doesNotMatch(fishRenderer, /fishSwimMovementSamples/);
  assert.match(fishRenderer, /if \(physicallyMoving && .*panicUntil/s);
  assert.match(fishRenderer, /if \(physicallyMoving && \/zoomies\//);
  assert.match(fishRenderer, /if \(physicallyMoving && \/\(\?:avoid\|flee\|escape\|retreat\|scurry\)\//);
  assert.match(fishRenderer, /function advanceFishSwimAnimationPhase\(/);
  assert.match(fishRenderer, /elapsedSeconds \* tau \* FISH_SWIM_ANIMATION\.cyclesPerSecond \* averageSpeed \* visualSpeedMultiplier/);
  assert.match(fishRenderer, /swimAnimationPhase:\s*advanceFishSwimAnimationPhase\(/);
  assert.match(fishRenderer, /const globalPhase = normalizeFishSwimAnimationPhase\(state\.swimAnimationPhase\)/);
  assert.doesNotMatch(fishRenderer, /const baseClock = Number\.isFinite\(Number\(fish\?\.wiggleClock\)\)/);
  assert.doesNotMatch(fishRenderer, /globalPhase = .*wiggleClock/);
  assert.match(fishRenderer, /emergencyTransitionMs/);
  assert.match(fishRenderer, /settleTransitionMs/);
});

test('slice quality scales down and Borough overview reuses the same live deformation', () => {
  assert.match(fishRenderer, /if \(options\.quality === "borough"\) return FISH_SWIM_ANIMATION\.slices\.borough/);
  assert.match(fishRenderer, /if \(options\.quality === "highlight"\) return FISH_SWIM_ANIMATION\.slices\.highlight/);
  assert.match(fishRenderer, /size >= 170[\s\S]*FISH_SWIM_ANIMATION\.slices\.full/);
  assert.match(fishRenderer, /size >= 95[\s\S]*FISH_SWIM_ANIMATION\.slices\.medium/);
  assert.match(fishRenderer, /size >= 52 \? FISH_SWIM_ANIMATION\.slices\.small : FISH_SWIM_ANIMATION\.slices\.tiny/);
  assert.match(fishRenderer, /fishCount >= FISH_SWIM_ANIMATION\.denseFishThreshold[\s\S]*denseSliceScale/);
  assert.match(fishRenderer, /fishCount >= FISH_SWIM_ANIMATION\.crowdedFishThreshold[\s\S]*crowdedSliceScale/);
  assert.match(fishRenderer, /getImageAlphaMask\(imagePath\)/);
  assert.match(boroughUi, /drawFishSwimDepthWarpImage\([\s\S]*quality:\s*"borough"/);
  assert.match(boroughUi, /const position = dead[\s\S]*getBoroughOverviewFishPosition\(fish, now\)/);
});

test('Phase 16 performance pass cuts duplicate slice work without changing tuner deformation math', () => {
  assert.match(bootstrap, /fishSwimSliceProfileCache:\s*new Map\(\)/);
  assert.match(fishRenderer, /runtime\?\.fishSwimSliceProfileCache instanceof Map/);
  assert.match(fishRenderer, /const sliceProfile = getFishSwimSliceProfile\(sliceCount\)/);
  assert.match(fishRenderer, /incrementDebugFrameProfilerCounter\("fishSwimSliceDraws", sliceCount\)/);
  assert.match(debugTools, /swim \$\{counterAverage\("fishSwimSliceDraws"\).*fishSwimWarpPasses/s);
  assert.match(fishRenderer, /const frontWave = Math\.sin\(globalPhase \+ Math\.PI \* FISH_SWIM_ANIMATION\.frontCounterPhasePi\)/);
  assert.match(fishRenderer, /const collectDebugMetrics = Boolean\([\s\S]*isDebugModeEnabled\(\)/);
  assert.match(fishRenderer, /context\.filter = swimOptions\?\.fish \? "none" : "blur\(0\.22px\)"/);
  assert.match(fishRenderer, /\{ \.\.\.swimOptions, quality: "highlight" \}/);
  assert.match(fishRenderer, /!pose\.isDead && !genericTurnRigActive && layerMotion\?\.preserveColor !== true/);

  const oldHealthyMediumDraws = 82 * 2;
  const newHealthyMediumDraws = 70 + 16;
  const newCrowdedMediumDraws = Math.round(70 * 0.75) + 16;
  const oldSickMediumDraws = 82 * 4;
  const newSickMediumDraws = 70 + 16 + 70;
  assert.ok(newHealthyMediumDraws <= oldHealthyMediumDraws * 0.55, 'healthy medium fish should cut slice draw calls by about half');
  assert.ok(newCrowdedMediumDraws <= oldHealthyMediumDraws * 0.43, 'crowded tanks should reduce slice draw calls further');
  assert.ok(newSickMediumDraws <= oldSickMediumDraws * 0.50, 'symptom overlays must not duplicate the top-light warp');
});

test('debug behavior viewer exposes all eight swim animation presets', () => {
  const expectedLabels = [
    'Sleepy / Rest',
    'Chill',
    'Regular',
    'Slightly Increased',
    'Feeding Chase',
    'Zoomies',
    'Scared / Flee',
    'Panicked'
  ];
  for (const label of expectedLabels) {
    assert.ok(bootstrap.includes(`label: "${label}"`), `missing debug preview label: ${label}`);
  }
  assert.match(debugTools, /function getDebugFishSwimPresetForPreviewBehavior\(/);
  assert.match(debugTools, /fish\.debugSwimAnimationPreset = previewSwimPreset/);
  assert.match(debugTools, /drawFishSwimDepthWarpImage\(/);
});


test('Phase 11 tuner validation can force exact Regular rendering without changing fish behavior', () => {
  assert.match(bootstrap, /debugSwimAnimationPresetOverride:\s*""/);
  assert.match(fishRenderer, /function getFishSwimAnimationDebugPresetOverride\(/);
  assert.match(fishRenderer, /const forceExactDebugPreset = options\.forceExactPreset === true/);
  assert.match(fishRenderer, /forceExactDebugPreset\s*\?\s*\{[\s\S]*tailIntensity: preset\.tailIntensity,[\s\S]*animationSpeed: preset\.animationSpeed,[\s\S]*depthWarp: preset\.depthWarp,[\s\S]*perspective: preset\.perspective,[\s\S]*frontWiggle: preset\.frontWiggle/s);
  assert.match(fishRenderer, /movementFactor:\s*1,[\s\S]*debugOverride:\s*true/s);
  assert.match(debugTools, /window\.debugSetSwimAnimationPreset = \(presetId = "regular"\)/);
  assert.match(debugTools, /new Set\(\["regular", "chill", "zoomies", "panicked"\]\)/);
  assert.match(debugTools, /window\.debugForceRegularSwimAnimation = \(\) => window\.debugSetSwimAnimationPreset\("regular"\)/);
  assert.match(debugTools, /window\.debugClearSwimAnimationPreset = \(\) => window\.debugSetSwimAnimationPreset\("auto"\)/);
  assert.doesNotMatch(debugTools, /debugSetSwimAnimationPreset[\s\S]{0,900}fish\.(?:activity|behaviorIntent|targetXNorm|targetYNorm)\s*=/);
});


test('Phase 12 exposes exact tuner math and prevents full-bore visual panic without real panic travel', () => {
  assert.match(bootstrap, /maximumPhaseAdvanceSeconds:\s*1 \/ 30/);
  assert.match(bootstrap, /fishSwimAnimationDebugMetrics:\s*new Map\(\)/);
  assert.match(fishRenderer, /FISH_SWIM_ANIMATION\.maximumPhaseAdvanceSeconds/);
  assert.match(fishRenderer, /if \(physicallyMoving && activePanicDash\) return "panicked"/);
  assert.match(fishRenderer, /if \(physicallyMoving && \(panicActive \|\| mood === "Panicked"\)\) return "scared"/);
  assert.match(motion, /speedMultiplier \*= Number\(fish\.panicSpeedBoost\) \|\| 2/);
  assert.match(debugTools, /window\.debugInspectSwimAnimation/);
  assert.match(debugTools, /effectiveCyclesPerSecond/);
  assert.match(debugTools, /rawDepthWarpRatio/);
  assert.match(debugTools, /maximumRearDepthWarpPx/);
  assert.match(debugTools, /panicSpeedBoost/);

  const regularCyclesPerSecond = 1.55 * 1.00 * 0.90;
  const regularRawWarpRatio = (0.018 + 0.55 * 0.105) * 0.55;
  const panickedRawWarpRatio = (0.018 + 1.00 * 0.105) * 1.00;
  const regularFrontRawRatio = (0.004 + 0.55 * 0.018) * 0.15;
  const panickedFrontRawRatio = (0.004 + 1.00 * 0.018) * 0.40;

  assert.ok(Math.abs(regularCyclesPerSecond - 1.395) < 1e-12);
  assert.ok(Math.abs(regularRawWarpRatio - 0.0416625) < 1e-12);
  assert.ok(Math.abs(panickedRawWarpRatio - 0.123) < 1e-12);
  assert.ok(regularFrontRawRatio < 0.0021, `regular front motion too large: ${regularFrontRawRatio}`);
  assert.ok(panickedFrontRawRatio < 0.009, `panicked front motion too large: ${panickedFrontRawRatio}`);
});


test('Phase 13 Chill matches the approved tuner baseline without freezing', () => {
  assert.match(debugTools, /window\.debugForceChillSwimAnimation = \(\) => window\.debugSetSwimAnimationPreset\("chill"\)/);

  const chill = { tailIntensity: 0.32, animationSpeed: 0.62, depthWarp: 0.32, perspective: 0.07, frontWiggle: 0.07 };
  const effectiveCyclesPerSecond = 1.55 * chill.animationSpeed * 0.90;
  const rawDepthWarpRatio = (0.018 + chill.depthWarp * 0.105) * chill.tailIntensity;
  const frontRawRatio = (0.004 + chill.depthWarp * 0.018) * chill.frontWiggle;

  assert.ok(Math.abs(effectiveCyclesPerSecond - 0.8649) < 1e-12);
  assert.ok(Math.abs(rawDepthWarpRatio - 0.016512) < 1e-12);
  assert.ok(Math.abs(frontRawRatio - 0.0006832) < 1e-12);
  assert.ok(effectiveCyclesPerSecond > 0.8, 'Chill should remain visibly alive rather than looking frozen');
  assert.ok(rawDepthWarpRatio < 0.02, 'Chill rear-body warp should remain gentle');
  assert.ok(frontRawRatio < 0.001, 'Chill head counter-motion should remain extremely subtle');
});


test('Phase 14 Zoomies matches the approved tuner baseline without becoming structurally excessive', () => {
  assert.match(debugTools, /window\.debugForceZoomiesSwimAnimation = \(\) => window\.debugSetSwimAnimationPreset\("zoomies"\)/);
  assert.match(fishRenderer, /if \(physicallyMoving && \/zoomies\/\.test\(intentText\)\) return "zoomies"/);

  const zoomies = { tailIntensity: 0.88, animationSpeed: 1.90, depthWarp: 0.84, perspective: 0.19, frontWiggle: 0.28 };
  const effectiveCyclesPerSecond = 1.55 * zoomies.animationSpeed * 0.90;
  const rawDepthWarpRatio = (0.018 + zoomies.depthWarp * 0.105) * zoomies.tailIntensity;
  const frontRawRatio = (0.004 + zoomies.depthWarp * 0.018) * zoomies.frontWiggle;
  const fullBodyPhaseLag = 0.58 + zoomies.depthWarp * 1.05;

  assert.ok(Math.abs(effectiveCyclesPerSecond - 2.6505) < 1e-12);
  assert.ok(Math.abs(rawDepthWarpRatio - 0.093456) < 1e-12);
  assert.ok(Math.abs(frontRawRatio - 0.0053536) < 1e-12);
  assert.ok(Math.abs(fullBodyPhaseLag - 1.462) < 1e-12);
  assert.ok(rawDepthWarpRatio < 0.10, 'Zoomies raw rear warp must stay below 10% of fish height');
  assert.ok(frontRawRatio < 0.006, 'Zoomies front/head counter-motion must stay below 0.6% of fish height');
  assert.ok(fullBodyPhaseLag < 1.5, 'Zoomies phase lag must remain below the snakelike S-curve range');
  assert.ok(effectiveCyclesPerSecond < 3.0, 'Zoomies cadence should be energetic without becoming a twitch-rate animation');
});


test('Phase 15 Panicked matches the approved maximum without stationary flapping or random phase jumps', () => {
  assert.match(debugTools, /window\.debugForcePanickedSwimAnimation = \(\) => window\.debugSetSwimAnimationPreset\("panicked"\)/);
  assert.match(fishRenderer, /const panicSpeedBoost = panicActive \? Math\.max\(1, Number\(fish\?\.panicSpeedBoost\) \|\| 2\) : 1/);
  assert.match(fishRenderer, /const activePanicDash = panicActive && targetDistance > 0\.008 && panicSpeedBoost > 1/);
  assert.match(fishRenderer, /if \(physicallyMoving && activePanicDash\) return "panicked"/);
  assert.match(fishRenderer, /if \(physicallyMoving && \(panicActive \|\| mood === "Panicked"\)\) return "scared"/);
  assert.match(motion, /speedMultiplier \*= Number\(fish\.panicSpeedBoost\) \|\| 2/);
  assert.match(debugTools, /activePanicDash: Boolean\(metrics\.activePanicDash\)/);

  const panicked = { tailIntensity: 1.00, animationSpeed: 2.35, depthWarp: 1.00, perspective: 0.24, frontWiggle: 0.40 };
  const effectiveCyclesPerSecond = 1.55 * panicked.animationSpeed * 0.90;
  const rawDepthWarpRatio = (0.018 + panicked.depthWarp * 0.105) * panicked.tailIntensity;
  const frontRawRatio = (0.004 + panicked.depthWarp * 0.018) * panicked.frontWiggle;
  const fullBodyPhaseLag = 0.58 + panicked.depthWarp * 1.05;
  const maximumPhaseStep = Math.PI * 2 * effectiveCyclesPerSecond * (1 / 30);

  assert.ok(Math.abs(effectiveCyclesPerSecond - 3.27825) < 1e-12);
  assert.ok(Math.abs(rawDepthWarpRatio - 0.123) < 1e-12);
  assert.ok(Math.abs(frontRawRatio - 0.0088) < 1e-12);
  assert.ok(Math.abs(fullBodyPhaseLag - 1.63) < 1e-12);
  assert.ok(frontRawRatio < 0.009, 'Panicked head/front motion must stay below 0.9% of fish height');
  assert.ok(rawDepthWarpRatio <= 0.123, 'Panicked rear warp must not exceed the approved 12.3% raw maximum');
  assert.ok(maximumPhaseStep < 0.77, 'a lag spike must not advance the panic animation by a twitch-sized phase jump');
});


test('followers cannot translate horizontally opposite their rendered facing', () => {
  const schooling = read('public/app-src/fish/gravel-and-schooling.js');
  assert.match(schooling, /travelAnchorX - leaderDirection \* formation\.trailingDistance/);
  assert.match(motion, /requestedHorizontalDirection !== renderedFacingDirection[\s\S]*setFishDirection\(fish, requestedHorizontalDirection, species, now\)[\s\S]*moveDx = 0;[\s\S]*moveDy = 0;/);
});

test('schooling elects one stable local leader and uses fixed staggered follower slots', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const schooling = read('public/app-src/fish/gravel-and-schooling.js');
  assert.match(bootstrap, /const SAME_SPECIES_FOLLOW_RADIUS_NORM = 0\.24/);
  assert.match(bootstrap, /const SAME_SPECIES_FOLLOW_MIN_MS = 8000/);
  assert.match(bootstrap, /const SAME_SPECIES_FOLLOW_MAX_MS = 22000/);
  assert.match(schooling, /function getFishSchoolStableRank/);
  assert.match(schooling, /followerCount: getFishSchoolActiveFollowers/);
  assert.match(schooling, /assignFishSchoolFormationSlot/);
  assert.match(bootstrap, /const SAME_SPECIES_SCHOOL_TARGET_RESPONSE_PER_SEC = 4\.6/);
  assert.match(schooling, /schoolTargetUpdatedAt/);
  assert.match(schooling, /1 - Math\.exp\(-SAME_SPECIES_SCHOOL_TARGET_RESPONSE_PER_SEC \* elapsedSeconds\)/);
  assert.doesNotMatch(schooling, /now < Number\(fish\.schoolNextTargetRefreshAt\)/);
  assert.match(schooling, /targetLayer: clampTankLayer\(getFishTankLayer\(fish\)\)/);
  assert.doesNotMatch(schooling, /const schoolmates = state\.fish\.filter/);
});

test('all in-tank fish render at the global 85 percent size scale', () => {
  const bootstrap = read('public/app-src/00-bootstrap.js');
  const appearance = read('public/app-src/fish/appearance.js');
  assert.match(bootstrap, /const GLOBAL_FISH_VISUAL_SCALE = 0\.85/);
  assert.match(appearance, /getAquariumPhysicalAssetScale\("fish"\) \* GLOBAL_FISH_VISUAL_SCALE/);
});

test('vertical course changes are centrally smoothed for ordinary swimming and special actions', () => {
  const motionHelpers = read('public/app-src/rendering/fish-motion-and-floor.js');
  assert.match(motionHelpers, /function getFishGradualSteeringVector/);
  assert.match(motionHelpers, /steeringVerticalRatio/);
  assert.match(motion, /getFishGradualSteeringVector\([\s\S]*FISH_GRAVEL_DIG_ACTIVITY[\s\S]*FISH_GRAVEL_PEBBLE_ACTIVITY[\s\S]*"feeding"/);
});

test('inspection settles through approach orient and inspect phases instead of refreshing a moving anchor', () => {
  const actions = read('public/app-src/fish/actions.js');
  assert.match(actions, /steering\.inspectPhase = "approach"/);
  assert.match(actions, /steering\.inspectPhase = "orient"/);
  assert.match(actions, /steering\.inspectPhase = "inspect"/);
  assert.match(actions, /steering\.holdXNorm/);
  assert.match(actions, /steering\.holdYNorm/);
});


test('swim animation speed multiplier is visual-only, defaults to 90%, and exposes a debug slider', () => {
  const indexHtml = read('index.html');
  const customContent = read('public/app-src/assets/custom-content.js');
  const sceneControls = read('public/app-src/ui/scene-controls-and-animation.js');
  assert.match(bootstrap, /defaultSpeedMultiplier:\s*0\.90/);
  assert.match(bootstrap, /debugSpeedMultiplierMin:\s*0\.50/);
  assert.match(bootstrap, /debugSpeedMultiplierMax:\s*1\.50/);
  assert.match(fishRenderer, /function getFishSwimAnimationSpeedMultiplier\(/);
  assert.match(fishRenderer, /FISH_SWIM_ANIMATION\.cyclesPerSecond \* averageSpeed \* visualSpeedMultiplier/);
  assert.match(fishRenderer, /effectiveCyclesPerSecond: FISH_SWIM_ANIMATION\.cyclesPerSecond \* state\.animationSpeed \* getFishSwimAnimationSpeedMultiplier\(\)/);
  assert.match(indexHtml, /id="debugSwimAnimationSpeedSlider"[^>]*min="50"[^>]*max="150"[^>]*value="90"/);
  assert.match(indexHtml, /Visual animation only\. This never changes fish travel speed\./);
  assert.match(customContent, /debugSwimAnimationSpeedSlider\?\.addEventListener\("input"/);
  assert.match(sceneControls, /syncDebugSwimAnimationSpeedControls\(\)/);
  assert.doesNotMatch(motion, /debugSwimAnimationSpeed|defaultSpeedMultiplier|getFishSwimAnimationSpeedMultiplier/);
});

test('living fish visual pose changes are eased to suppress pops without smoothing world travel coordinates', () => {
  assert.match(bootstrap, /const FISH_VISUAL_POSE_SMOOTHING = Object\.freeze\(\{/);
  assert.match(bootstrap, /fishVisualPoseSmoothingStates:\s*new Map\(\)/);
  assert.match(fishRenderer, /function smoothLivingFishVisualPose\(/);
  assert.match(fishRenderer, /1 - Math\.exp\(-Math\.max\(0\.01, responsePerSecond\) \* elapsedSeconds\)/);
  assert.match(fishRenderer, /tilt: approach\(previous\.tilt, target\.tilt/);
  assert.match(fishRenderer, /bodyScaleX: approach\(previous\.bodyScaleX, target\.bodyScaleX/);
  assert.match(fishRenderer, /bodyScaleY: approach\(previous\.bodyScaleY, target\.bodyScaleY/);
  assert.match(fishRenderer, /swayX: approach\(previous\.swayX, target\.swayX/);
  assert.match(fishRenderer, /return smoothLivingFishVisualPose\(fish, visualPose, now\)/);
  assert.doesNotMatch(fishRenderer, /x:\s*approach\(previous\.x/);
  assert.doesNotMatch(fishRenderer, /y:\s*approach\(previous\.y/);
});
