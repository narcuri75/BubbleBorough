// Source fragment: fish/gravel-and-schooling.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getForcedGravelDigPrompt(fish, now = Date.now()) {
  if (!fish?.id || !runtime.forcedGravelDigUntilByFishId.has(fish.id)) {
    return null;
  }

  const prompt = runtime.forcedGravelDigUntilByFishId.get(fish.id);
  const until = typeof prompt === "object" && prompt
    ? Number(prompt.until)
    : Number(prompt);
  if (!Number.isFinite(until) || now > until) {
    runtime.forcedGravelDigUntilByFishId.delete(fish.id);
    return null;
  }

  return typeof prompt === "object" && prompt ? prompt : { until };
}

function clearForcedGravelDigPrompt(fish) {
  if (fish?.id) {
    runtime.forcedGravelDigUntilByFishId.delete(fish.id);
  }
  if (fish?.activity === FISH_GRAVEL_DIG_ACTIVITY) {
    fish.activity = "roam";
  }
}

function isFishSpeciesEligibleForGravelPebble(species) {
  return Boolean(species) && species.behavior !== "sucker";
}

function isFishEligibleForGravelPebbleAction(fish, species, now = Date.now(), options = {}) {
  if (!canUseFishGravelPebblePlay() || !fish || !isFishSpeciesEligibleForGravelPebble(species) || isFishDead(fish)) {
    return false;
  }

  if (!(state?.fish || []).some((entry) => entry.id === fish.id)) {
    return false;
  }

  if (runtime.fishDragState?.fishId === fish.id) {
    return false;
  }

  if (options.requireRoaming !== false && fish.activity !== "roam") {
    return false;
  }

  const activeBreedingRuntimeSequence = runtime.fishBreedingSequence || runtime.debugBreedingSequence;
  if (activeBreedingRuntimeSequence) {
    const breedingFishIds = new Set([
      activeBreedingRuntimeSequence.leftFishId,
      activeBreedingRuntimeSequence.rightFishId
    ].filter(Boolean));
    if (breedingFishIds.has(fish.id)) {
      return false;
    }
  }

  if (Number.isFinite(fish.wallAvoidUntil) && now < fish.wallAvoidUntil) {
    return false;
  }

  return true;
}

function countActiveFishGravelPebbleActions(excludeFishId = null) {
  pruneFishGravelPebbleRuntimeState();
  let count = 0;
  for (const fishId of runtime.fishGravelPebbleActions.keys()) {
    if (excludeFishId && fishId === excludeFishId) {
      continue;
    }
    count += 1;
  }
  return count;
}

function hasFishGravelPebbleCandidate(now = Date.now()) {
  pruneFishGravelPebbleRuntimeState(now);
  return (state?.fish || []).some((fish) => {
    const species = getSpeciesForFish(fish);
    return isFishEligibleForGravelPebbleAction(fish, species, now);
  });
}

function pickFishGravelPebbleDebugCandidate(now = Date.now()) {
  pruneFishGravelPebbleRuntimeState(now);
  const selectedFish = state?.fish?.find((fish) => fish.id === runtime.selectedFishId) || null;
  const selectedSpecies = getSpeciesForFish(selectedFish);
  if (isFishEligibleForGravelPebbleAction(selectedFish, selectedSpecies, now)) {
    return selectedFish;
  }

  const candidates = (state?.fish || []).filter((fish) => {
    const species = getSpeciesForFish(fish);
    return isFishEligibleForGravelPebbleAction(fish, species, now);
  });
  if (!candidates.length) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];
}

function isFishEligibleForGravelDigPrompt(fish, species, now = Date.now()) {
  if (!fish || !isFishSpeciesEligibleForGravelPebble(species) || isFishDead(fish)) {
    return false;
  }

  if (!(state?.fish || []).some((entry) => entry.id === fish.id)) {
    return false;
  }

  if (runtime.fishDragState?.fishId === fish.id) {
    return false;
  }

  const activeBreedingRuntimeSequence = runtime.fishBreedingSequence || runtime.debugBreedingSequence;
  if (activeBreedingRuntimeSequence) {
    const breedingFishIds = new Set([
      activeBreedingRuntimeSequence.leftFishId,
      activeBreedingRuntimeSequence.rightFishId
    ].filter(Boolean));
    if (breedingFishIds.has(fish.id)) {
      return false;
    }
  }

  return true;
}

function hasFishGravelDigCandidate(now = Date.now()) {
  pruneFishGravelPebbleRuntimeState(now);
  return (state?.fish || []).some((fish) => isFishEligibleForGravelDigPrompt(fish, getSpeciesForFish(fish), now));
}

function pickFishGravelDigDebugCandidate(now = Date.now()) {
  pruneFishGravelPebbleRuntimeState(now);
  const candidates = (state?.fish || []).filter((fish) => isFishEligibleForGravelDigPrompt(fish, getSpeciesForFish(fish), now));
  if (!candidates.length) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];
}

function getFishGravelPebbleAction(fish) {
  return fish?.id ? runtime.fishGravelPebbleActions.get(fish.id) || null : null;
}

function getFishGravelPebbleFrontAnchor(mask) {
  if (!mask?.alpha?.length || !mask.width || !mask.height) {
    return null;
  }

  if (mask.fishGravelPebbleFrontAnchor) {
    return mask.fishGravelPebbleFrontAnchor;
  }

  const bounds = mask.bounds || {
    minX: 0,
    minY: 0,
    maxX: mask.width - 1,
    maxY: mask.height - 1
  };
  const frontX = clamp(Math.floor(bounds.maxX), 0, mask.width - 1);
  const scanWidth = Math.max(2, Math.round(mask.width * FISH_GRAVEL_PEBBLE_FRONT_SCAN_RATIO));
  const scanStartX = Math.max(Math.floor(bounds.minX), frontX - scanWidth);
  const scanSpan = Math.max(1, frontX - scanStartX);
  const minY = clamp(Math.floor(bounds.minY), 0, mask.height - 1);
  const maxY = clamp(Math.ceil(bounds.maxY), minY, mask.height - 1);
  let weightedY = 0;
  let totalWeight = 0;

  for (let y = minY; y <= maxY; y += 1) {
    let rowFrontX = -1;
    for (let x = frontX; x >= scanStartX; x -= 1) {
      const alpha = mask.alpha[(y * mask.width + x) * 4 + 3];
      if (alpha >= ALPHA_HIT_THRESHOLD) {
        rowFrontX = x;
        break;
      }
    }

    if (rowFrontX < 0) {
      continue;
    }

    const forwardness = clamp((rowFrontX - scanStartX) / scanSpan, 0, 1);
    const weight = 0.08 + Math.pow(forwardness, 4);
    weightedY += y * weight;
    totalWeight += weight;
  }

  const anchor = {
    u: clamp(frontX / Math.max(1, mask.width - 1), 0, 1),
    v: clamp((totalWeight > 0 ? weightedY / totalWeight : (bounds.minY + bounds.maxY) * 0.5) / Math.max(1, mask.height - 1), 0, 1)
  };
  mask.fishGravelPebbleFrontAnchor = anchor;
  return anchor;
}

function getFishGravelPebbleMouthLocalPoint(fish, species, width, height, pose, now = Date.now()) {
  const fishAsset = getFishDisplayAssetPath(fish, species, now) || species?.asset;
  const mask = fishAsset ? getImageAlphaMask(fishAsset) : null;
  const anchor = getFishGravelPebbleFrontAnchor(mask);
  const wiggleX = (pose?.wiggle || 0) * width * 0.018;
  if (anchor) {
    return {
      x: -width / 2 + wiggleX + anchor.u * width,
      y: -height / 2 + anchor.v * height
    };
  }

  return {
    x: width * 0.48 + wiggleX,
    y: -height * 0.02
  };
}

function getFishFrontMouthOffsetAtPose(fish, species, width, height, pose, now = Date.now(), localForwardOffsetPx = 0) {
  const localPoint = getFishGravelPebbleMouthLocalPoint(fish, species, width, height, pose, now);
  localPoint.x += Number.isFinite(localForwardOffsetPx) ? localForwardOffsetPx : 0;
  const bodyScaleX = pose.bodyScaleX || 1;
  const bodyScaleY = pose.bodyScaleY || 1;
  const tilt = pose.tilt || 0;
  const facingScaleX = pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1);
  const scaledX = bodyScaleX * localPoint.x;
  const scaledY = bodyScaleY * localPoint.y;
  const useSuckerFacePivot = (
    SUCKER_FISH_FACE_PIVOT_ENABLED
    && !pose.isDead
    && getEffectiveFishBehavior(fish, species) === "sucker"
  );
  const drawX = -width / 2 + (pose.wiggle || 0) * width * 0.018;
  const drawY = -height / 2;
  const pivotX = useSuckerFacePivot ? drawX + width * SUCKER_FISH_FACE_PIVOT_X : 0;
  const pivotY = useSuckerFacePivot ? drawY + height * SUCKER_FISH_FACE_PIVOT_Y : 0;
  const pivotedX = useSuckerFacePivot ? scaledX - pivotX : scaledX;
  const pivotedY = useSuckerFacePivot ? scaledY - pivotY : scaledY;
  const rotatedX = Math.cos(tilt) * pivotedX - Math.sin(tilt) * pivotedY;
  const rotatedY = Math.sin(tilt) * pivotedX + Math.cos(tilt) * pivotedY;
  const transformedX = useSuckerFacePivot ? rotatedX + pivotX : rotatedX;
  const transformedY = useSuckerFacePivot ? rotatedY + pivotY : rotatedY;
  return {
    x: (pose.swayX || 0) + facingScaleX * transformedX,
    y: transformedY
  };
}

function getFishGravelPebbleMouthPoint(fish, species, now = Date.now(), localForwardOffsetPx = 0) {
  if (!fish || !species) {
    return null;
  }

  const image = runtime.images.get(getFishDisplayAssetPath(fish, species) || species.asset);
  if (!image) {
    return null;
  }

  const pose = getFishPose(fish, species, now);
  const width = getFishDisplayWidth(fish, species, now);
  const height = width * (image.height / image.width);
  const mouthOffset = getFishFrontMouthOffsetAtPose(
    fish,
    species,
    width,
    height,
    pose,
    now,
    localForwardOffsetPx
  );
  return {
    x: pose.x + mouthOffset.x,
    y: pose.y + mouthOffset.y
  };
}

function getFishTargetNormForMouthPoint(fish, species, targetX, targetY, now = Date.now(), options = {}) {
  if (
    !fish
    || !species
    || !Number.isFinite(Number(targetX))
    || !Number.isFinite(Number(targetY))
  ) {
    return null;
  }

  const image = runtime.images.get(getFishDisplayAssetPath(fish, species, now) || species.asset);
  if (!image) {
    return null;
  }

  const direction = Number.isFinite(Number(options.direction))
    ? (Number(options.direction) < 0 ? -1 : 1)
    : (Number(targetX) >= fish.xNorm * TANK_WIDTH ? 1 : -1);
  const pose = getFishCollisionPose(fish, species, now, fish.xNorm, fish.yNorm, direction);
  const width = getFishDisplayWidth(fish, species, now);
  const height = width * (image.height / image.width);
  const mouthOffset = getFishFrontMouthOffsetAtPose(
    fish,
    species,
    width,
    height,
    pose,
    now,
    options.localForwardOffsetPx
  );
  const minYNorm = clamp(Number.isFinite(Number(options.minYNorm)) ? Number(options.minYNorm) : 0.14, 0.08, 0.96);
  const maxYNorm = clamp(
    Number.isFinite(Number(options.maxYNorm)) ? Number(options.maxYNorm) : 0.8,
    minYNorm,
    0.96
  );
  return {
    xNorm: clamp((Number(targetX) - mouthOffset.x) / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp((Number(targetY) - mouthOffset.y) / TANK_HEIGHT, minYNorm, maxYNorm),
    direction
  };
}

function clearFishGravelPebbleAction(fish, species, now = Date.now(), options = {}) {
  if (fish?.id) {
    runtime.fishGravelPebbleActions.delete(fish.id);
  }

  if (!fish || fish.activity !== FISH_GRAVEL_PEBBLE_ACTIVITY) {
    return;
  }

  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  if (options.resetTarget === false) {
    return;
  }

  fish.targetXNorm = clamp(fish.xNorm + randomBetween(-0.12, 0.12), 0.08, 0.92);
  fish.targetYNorm = clamp(fish.yNorm + randomBetween(-0.06, 0.03), 0.2, 0.76);
  fish.targetAt = now + 900 + Math.random() * 1100;
  if (species) {
    fish.swimSpeed = normalizeFishSpeed(species);
  }
}

function clearAllFishGravelPebbleActions(now = Date.now()) {
  for (const fish of state?.fish || []) {
    clearFishGravelPebbleAction(fish, getSpeciesForFish(fish), now);
  }
  runtime.fishGravelPebbleActions.clear();
}

function createFishGravelPebbleAction(fish, species, now = Date.now()) {
  const pebbleAssets = getCustomGravelLoosePebbleAssets();
  if (!pebbleAssets.length) {
    return null;
  }

  const colors = getResolvedCustomGravelLayerColors(now);
  const colorizeSettings = getActiveCustomGravelLayerColorizeSettings();
  const pebbleAsset = pebbleAssets[Math.floor(Math.random() * pebbleAssets.length)] || pebbleAssets[0];
  const colorIndex = Math.floor(Math.random() * colors.length);
  const color = colors[colorIndex] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
  const pickupXNorm = clamp(fish.xNorm + randomBetween(-0.12, 0.12), 0.1, 0.9);
  const pickupX = pickupXNorm * TANK_WIDTH;
  const pickupSurfaceY = getTankFloorMaskSurfaceYAtX(pickupX);
  const pickupYNorm = clamp(
    (pickupSurfaceY - randomBetween(FISH_GRAVEL_PEBBLE_PICKUP_Y_OFFSET_MIN_PX, FISH_GRAVEL_PEBBLE_PICKUP_Y_OFFSET_MAX_PX)) / TANK_HEIGHT,
    0.24,
    0.78
  );
  const carryTargetXNorm = clamp(pickupXNorm + randomBetween(-0.1, 0.1), 0.12, 0.88);
  const carryTargetYNorm = clamp(
    pickupYNorm - randomBetween(FISH_GRAVEL_PEBBLE_CARRY_RISE_MIN_NORM, FISH_GRAVEL_PEBBLE_CARRY_RISE_MAX_NORM),
    0.16,
    0.68
  );

  return {
    stage: "dive",
    assetPath: pebbleAsset.path,
    color,
    colorize: colorizeSettings[colorIndex] === true,
    holdSizePx: randomBetween(FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX, FISH_GRAVEL_PEBBLE_HOLD_SIZE_MAX_PX),
    pickupXNorm,
    pickupYNorm,
    carryTargetXNorm,
    carryTargetYNorm,
    startedAt: now
  };
}

function startFishGravelPebbleAction(fish, species, now = Date.now(), options = {}) {
  if (!isFishEligibleForGravelPebbleAction(fish, species, now)) {
    return false;
  }

  if (!options.force && countActiveFishGravelPebbleActions(fish.id) >= MAX_ACTIVE_FISH_GRAVEL_PEBBLE_ACTIONS) {
    return false;
  }

  const action = createFishGravelPebbleAction(fish, species, now);
  if (!action) {
    return false;
  }

  runtime.fishGravelPebbleActions.set(fish.id, action);
  fish.activity = FISH_GRAVEL_PEBBLE_ACTIVITY;
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  clearFishSchoolFollowState(fish);
  fish.targetXNorm = action.pickupXNorm;
  fish.targetYNorm = action.pickupYNorm;
  fish.targetAt = now + Math.max(5200, Number(options.durationMs) || 0);
  fish.swimSpeed = normalizeFishSpeed(
    species,
    randomBetween(Math.max(species.speedMin, species.speedMax * 0.72), species.speedMax)
  );
  setFishDesiredTankLayer(fish, getFishTankLayer(fish));
  if (Math.abs(fish.targetXNorm - fish.xNorm) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
    setFishDirection(fish, fish.targetXNorm >= fish.xNorm ? 1 : -1, species, now);
  }
  return true;
}

function maybeStartFishGravelPebbleAction(fish, species, now, deltaSeconds) {
  if (!isFishEligibleForGravelPebbleAction(fish, species, now) || countActiveFishGravelPebbleActions(fish.id) >= MAX_ACTIVE_FISH_GRAVEL_PEBBLE_ACTIONS) {
    return false;
  }

  const styleMultiplier = species.swimStyle === "sporadic"
    ? 1.2
    : species.swimStyle === "peaceful"
      ? 0.82
      : 1;
  const chance = deltaSeconds * FISH_GRAVEL_PEBBLE_CHANCE_PER_SECOND * styleMultiplier;
  if (Math.random() >= chance) {
    return false;
  }

  return startFishGravelPebbleAction(fish, species, now);
}

function startFishGravelDigAction(fish, species, now = Date.now(), options = {}) {
  if (!isFishEligibleForGravelDigPrompt(fish, species, now)) {
    return false;
  }

  clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
  if (fish.caveState) {
    abortFishCaveBehavior(fish, now, false);
  }
  fish.activity = "roam";
  fish.feedingPelletId = null;
  releasePelletsTargetingFishIds(fish.id);
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  clearFishSchoolFollowState(fish);

  const currentX = fish.xNorm * TANK_WIDTH;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const digX = clamp(
    currentX + direction * randomBetween(38, 104),
    GLASS_MARGIN_X + 18,
    TANK_WIDTH - GLASS_MARGIN_X - 18
  );
  const digLayer = getFishTankLayer(fish);
  const digY = getTankLayerBottomBoundaryY(digLayer);
  const fishWidth = getFishDisplayWidth(fish, species, now);
  const digDirection = digX >= currentX ? 1 : -1;
  const fallbackTargetXNorm = clamp((digX - digDirection * fishWidth * 0.28) / TANK_WIDTH, 0.08, 0.92);
  const fallbackTargetYNorm = clamp((digY - fishWidth * 0.34) / TANK_HEIGHT, 0.24, 0.96);
  fish.targetXNorm = fallbackTargetXNorm;
  fish.targetYNorm = fallbackTargetYNorm;
  fish.activity = FISH_GRAVEL_DIG_ACTIVITY;
  const durationMs = Math.max(1000, Number(options.durationMs) || FORCED_GRAVEL_DIG_TIMEOUT_MS);
  fish.targetAt = now + durationMs;
  fish.nextGravelDisturbAt = 0;
  fish.nextGravelDigAt = 0;
  const digPrompt = {
    startedAt: now,
    until: now + durationMs,
    targetXNorm: fish.targetXNorm,
    targetYNorm: fish.targetYNorm,
    impactX: digX,
    tankLayer: digLayer,
    direction: digDirection
  };
  runtime.forcedGravelDigUntilByFishId.set(fish.id, digPrompt);
  setFishDesiredTankLayer(fish, digLayer);
  const mouthTarget = getFishGravelDigMouthTarget(fish, species, digX, digY, digDirection, now);
  if (mouthTarget) {
    digPrompt.targetXNorm = mouthTarget.xNorm;
    digPrompt.targetYNorm = mouthTarget.yNorm;
    fish.targetXNorm = mouthTarget.xNorm;
    fish.targetYNorm = mouthTarget.yNorm;
  }
  fish.swimSpeed = normalizeFishSpeed(
    species,
    randomBetween(Math.max(species.speedMin, species.speedMax * 0.74), species.speedMax)
  );
  if (Math.abs(fish.targetXNorm - fish.xNorm) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
    setFishDirection(fish, digDirection, species, now);
  }
  return true;
}

function getFishPebbleTossLayerLandingY(tossOrLayer, holdSizePx = FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX) {
  const layer = typeof tossOrLayer === "object"
    ? tossOrLayer.endLayer
    : tossOrLayer;
  const offsetPx = typeof tossOrLayer === "object" && Number.isFinite(Number(tossOrLayer.endYOffsetPx))
    ? Number(tossOrLayer.endYOffsetPx)
    : 0;
  const normalizedLayer = clampTankLayer(layer);
  const stableScale = getViewportStableAssetScale();
  const size = (Number.isFinite(Number(holdSizePx)) ? Number(holdSizePx) : FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX) * stableScale;
  if (typeof tossOrLayer === "object" && Number.isFinite(Number(tossOrLayer.endX))) {
    return clamp(
      getTankFloorSurfaceYAtX(Number(tossOrLayer.endX)) - size * 0.46 + offsetPx,
      WATER_SURFACE_Y + 24,
      TANK_HEIGHT - GLASS_MARGIN_BOTTOM - size * 0.5
    );
  }

  return clamp(
    getTankLayerBottomBoundaryY(normalizedLayer) - size * 0.5 + offsetPx,
    WATER_SURFACE_Y + 24,
    TANK_HEIGHT - GLASS_MARGIN_BOTTOM - size * 0.5
  );
}

function spawnFishGravelPebbleToss(fish, species, action, now = Date.now()) {
  if (!fish || !species || !action?.assetPath || !action?.color) {
    return;
  }

  if (runtime.fishPebbleTosses.length >= MAX_ACTIVE_FISH_GRAVEL_PEBBLE_TOSSES) {
    runtime.fishPebbleTosses.shift();
  }

  const sprite = getCustomGravelPebbleSpriteByPath(action.assetPath, action.color, { colorize: action.colorize });
  const aspect = sprite?.width && sprite?.height ? sprite.width / Math.max(1, sprite.height) : 1;
  const size = (Number.isFinite(action.holdSizePx) ? action.holdSizePx : FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX) * getViewportStableAssetScale();
  const drawWidth = aspect >= 1 ? size : size * aspect;
  const mouthPoint = getFishGravelPebbleMouthPoint(
    fish,
    species,
    now,
    drawWidth * (0.5 - FISH_GRAVEL_PEBBLE_MOUTH_OVERLAP_RATIO)
  );
  if (!mouthPoint) {
    return;
  }

  const landingX = clamp(mouthPoint.x + randomBetween(-56, 56), GLASS_MARGIN_X + 10, TANK_WIDTH - GLASS_MARGIN_X - 10);
  const landingLayer = getFishTankLayer(fish);
  const landingYOffsetPx = randomBetween(-2, 3);
  const landingY = getFishPebbleTossLayerLandingY({
    endLayer: landingLayer,
    endX: landingX,
    endYOffsetPx: landingYOffsetPx
  }, action.holdSizePx);
  runtime.fishPebbleTosses.push({
    id: createId("fish-gravel-pebble"),
    fishId: fish.id,
    assetPath: action.assetPath,
    color: action.color,
    colorize: action.colorize === true,
    sizePx: action.holdSizePx,
    startX: mouthPoint.x,
    startY: mouthPoint.y,
    endX: landingX,
    endY: landingY,
    endLayer: landingLayer,
    endYOffsetPx: landingYOffsetPx,
    sway: Math.random(),
    driftAmplitudePx: randomBetween(12, 24),
    arcLiftPx: randomBetween(18, 34),
    rotation: randomBetween(-Math.PI, Math.PI),
    spin: randomBetween(-0.85, 0.85),
    startedAt: now,
    durationMs: 2800 + Math.hypot(landingX - mouthPoint.x, landingY - mouthPoint.y) * 2.2
  });
}

function getSedimentStrength(now = Date.now(), multiplier = 1) {
  const dirtiness = getTankDirtiness(now);
  return clamp((0.28 + dirtiness * 0.92) * multiplier, 0.18, 1.25);
}

function spawnSedimentCloud(x, y, options = {}) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
    return;
  }

  if (runtime.sedimentClouds.length >= MAX_SEDIMENT_CLOUDS) {
    runtime.sedimentClouds.shift();
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const strength = clamp(Number.isFinite(Number(options.strength)) ? Number(options.strength) : getSedimentStrength(now), 0.12, 1.4);
  runtime.sedimentClouds.push({
    id: createId("sediment"),
    x: clamp(Number(x), GLASS_MARGIN_X, TANK_WIDTH - GLASS_MARGIN_X),
    y: clamp(Number(y), WATER_SURFACE_Y + 20, TANK_HEIGHT - GLASS_MARGIN_BOTTOM),
    startedAt: now,
    durationMs: Number.isFinite(Number(options.durationMs))
      ? Number(options.durationMs)
      : randomBetween(SEDIMENT_CLOUD_DURATION_MIN_MS, SEDIMENT_CLOUD_DURATION_MAX_MS),
    seed: Math.random(),
    baseRadius: Number.isFinite(Number(options.baseRadius)) ? Number(options.baseRadius) : randomBetween(14, 28),
    strength,
    driftX: Number.isFinite(Number(options.driftX)) ? Number(options.driftX) : randomBetween(-7, 7),
    driftY: Number.isFinite(Number(options.driftY)) ? Number(options.driftY) : randomBetween(-10, -3)
  });
}

function spawnGravelCloudEffectAtPoint(x, y, options = {}) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
    return;
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const intensity = clamp(Number.isFinite(Number(options.intensity)) ? Number(options.intensity) : 1, 0.12, 1.8);
  const cloudX = clamp(Number(x), GLASS_MARGIN_X, TANK_WIDTH - GLASS_MARGIN_X);
  const cloudY = clamp(Number(y), WATER_SURFACE_Y + 20, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);

  spawnEffectCloudAtPoint(cloudX, cloudY, {
    preset: "gravelDust",
    intensity,
    layer: EFFECT_CLOUD_LAYER_FLOOR,
    countBase: Number.isFinite(Number(options.countBase)) ? Number(options.countBase) : undefined,
    countScale: Number.isFinite(Number(options.countScale)) ? Number(options.countScale) : undefined,
    spreadNorm: Number.isFinite(Number(options.spreadNorm)) ? Number(options.spreadNorm) : undefined
  });

  if (options.sediment !== false) {
    spawnSedimentCloud(cloudX, cloudY, {
      now,
      strength: Number.isFinite(Number(options.sedimentStrength))
        ? Number(options.sedimentStrength)
        : getSedimentStrength(now, 0.74 + intensity * 0.28),
      baseRadius: Number.isFinite(Number(options.baseRadius)) ? Number(options.baseRadius) : 18 + intensity * 8,
      driftX: Number.isFinite(Number(options.driftX)) ? Number(options.driftX) : randomBetween(-6, 6),
      driftY: Number.isFinite(Number(options.driftY)) ? Number(options.driftY) : randomBetween(-10, -3),
      durationMs: Number.isFinite(Number(options.durationMs)) ? Number(options.durationMs) : undefined
    });
  }
}

function spawnGravelLandingEffects(x, y, options = {}) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
    return;
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const intensity = clamp(Number.isFinite(Number(options.intensity)) ? Number(options.intensity) : 0.82, 0.2, 1.5);
  const impactX = clamp(Number(x), GLASS_MARGIN_X + 8, TANK_WIDTH - GLASS_MARGIN_X - 8);
  const impactY = clamp(Number(y), WATER_SURFACE_Y + 24, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);

  applyLocalGravelDisturbance(impactX, impactY, {
    radiusPx: Number.isFinite(Number(options.radiusPx)) ? Number(options.radiusPx) : 32 + intensity * 18,
    force: Number.isFinite(Number(options.force)) ? Number(options.force) : 0.22 + intensity * 0.18
  });
  spawnGravelCloudEffectAtPoint(impactX, impactY - 3, {
    now,
    intensity,
    sedimentStrength: getSedimentStrength(now, 0.72 + intensity * 0.26),
    baseRadius: 16 + intensity * 7,
    driftX: randomBetween(-5, 5),
    driftY: randomBetween(-9, -3)
  });
  spawnGravelDigBurst(impactX, impactY - 2, {
    now,
    intensity: clamp(intensity * 0.64, 0.38, 0.96),
    direction: Number.isFinite(Number(options.direction))
      ? Number(options.direction)
      : (Math.random() < 0.5 ? -1 : 1)
  });
}

function spawnGravelDigBurst(originX, originY, options = {}) {
  if (!Number.isFinite(Number(originX)) || !Number.isFinite(Number(originY))) {
    return;
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const intensity = clamp(Number.isFinite(Number(options.intensity)) ? Number(options.intensity) : 1, 0.2, 1.8);
  const count = clamp(
    Number.isFinite(Number(options.count))
      ? Math.round(Number(options.count))
      : Math.round(randomBetween(GRAVEL_DIG_BURST_PEBBLE_MIN, GRAVEL_DIG_BURST_PEBBLE_MAX) * intensity),
    GRAVEL_DIG_BURST_PEBBLE_MIN,
    GRAVEL_DIG_BURST_PEBBLE_MAX + 10
  );
  const direction = Number(options.direction) < 0 ? -1 : 1;
  const palette = getActiveGravelEffectPalette(now);
  const pebbleAssets = getCustomGravelLoosePebbleAssets();
  const spriteCount = Math.max(1, pebbleAssets.length || runtime.gravelCatalog.length || 1);
  const baseX = clamp(Number(originX), GLASS_MARGIN_X + 8, TANK_WIDTH - GLASS_MARGIN_X - 8);
  const baseY = clamp(Number(originY), WATER_SURFACE_Y + 24, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);
  const scatterPx = Number.isFinite(Number(options.scatterPx)) ? Math.max(8, Number(options.scatterPx)) : 20;
  const liftMinPx = Number.isFinite(Number(options.liftMinPx)) ? Math.max(4, Number(options.liftMinPx)) : 7;
  const liftMaxPx = Number.isFinite(Number(options.liftMaxPx)) ? Math.max(liftMinPx, Number(options.liftMaxPx)) : 24;
  const settleSurfaceY = Number.isFinite(Number(options.surfaceY))
    ? clamp(Number(options.surfaceY), WATER_SURFACE_Y + 24, TANK_HEIGHT - GLASS_MARGIN_BOTTOM)
    : null;
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const scatterX = randomBetween(-scatterPx, scatterPx) + direction * randomBetween(-4, scatterPx * 0.7);
    const endX = clamp(baseX + scatterX, GLASS_MARGIN_X + 8, TANK_WIDTH - GLASS_MARGIN_X - 8);
    const endY = (settleSurfaceY ?? getTankFloorSurfaceYAtX(endX)) - randomBetween(0, 4);
    const colorIndex = Math.floor(Math.random() * Math.max(1, palette.length));
    const customAsset = pebbleAssets.length
      ? (pebbleAssets[Math.floor(Math.random() * pebbleAssets.length)] || pebbleAssets[0])
      : null;
    particles.push({
      startX: clamp(baseX + randomBetween(-8, 8), GLASS_MARGIN_X + 8, TANK_WIDTH - GLASS_MARGIN_X - 8),
      startY: baseY + randomBetween(-2, 5),
      endX,
      endY,
      liftPx: randomBetween(liftMinPx, liftMaxPx) * Math.sqrt(intensity),
      sway: Math.random(),
      delay: randomBetween(0, 0.18),
      sizePx: randomBetween(FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX, FISH_GRAVEL_PEBBLE_HOLD_SIZE_MAX_PX),
      rotation: randomBetween(-Math.PI, Math.PI),
      spin: randomBetween(-1.6, 1.6),
      spriteIndex: Math.floor(Math.random() * spriteCount),
      assetPath: customAsset?.path || "",
      color: palette[colorIndex] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR,
      colorize: true,
      variantIndex: Math.floor(Math.random() * GRAVEL_VARIANT_BUCKETS),
      stretchY: randomBetween(0.82, 1.18),
      alpha: randomBetween(0.78, 0.96)
    });
  }

  if (runtime.gravelDigBursts.length >= MAX_GRAVEL_DIG_BURSTS) {
    runtime.gravelDigBursts.shift();
  }

  runtime.gravelDigBursts.push({
    id: createId("gravel-dig"),
    startedAt: now,
    durationMs: randomBetween(GRAVEL_DIG_BURST_DURATION_MIN_MS, GRAVEL_DIG_BURST_DURATION_MAX_MS),
    particles
  });
}

function updateGravelDigBursts(now = Date.now()) {
  runtime.gravelDigBursts = (runtime.gravelDigBursts || []).filter((burst) => (
    burst && (Number(burst.startedAt) || 0) + (Number(burst.durationMs) || 0) > now
  ));
}

function spawnCoinGlint(x, y, now = Date.now()) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
    return;
  }

  runtime.coinGlints.push({
    id: createId("coin-glint"),
    x: clamp(Number(x), GLASS_MARGIN_X + 12, TANK_WIDTH - GLASS_MARGIN_X - 12),
    y: clamp(Number(y), WATER_SURFACE_Y + 20, TANK_HEIGHT - GLASS_MARGIN_BOTTOM - 8),
    startedAt: now,
    durationMs: GRAVEL_COIN_GLINT_DURATION_MS,
    seed: Math.random()
  });
  if (runtime.coinGlints.length > 8) {
    runtime.coinGlints.shift();
  }
}

function attemptGravelCoinFind(fish, action, now = Date.now()) {
  if (!fish || !action || action.coinFindRolled) {
    return false;
  }

  action.coinFindRolled = true;
  const lastFoundAt = Number(state.lastGravelCoinFoundAt) || 0;
  if (now - lastFoundAt < GRAVEL_COIN_FIND_COOLDOWN_MS || Math.random() >= GRAVEL_COIN_FIND_CHANCE) {
    return false;
  }

  state.coins += 1;
  state.lastGravelCoinFoundAt = now;
  pushEvent(`${fish.name || "A fish"} found a coin in the gravel.`, now);
  spawnCoinGlint(action.pickupXNorm * TANK_WIDTH, action.pickupYNorm * TANK_HEIGHT - 8, now);
  saveState();
  renderUi(now, { full: false });
  return true;
}

function updateFishGravelPebbleAction(fish, species, now = Date.now()) {
  const action = getFishGravelPebbleAction(fish);
  if (!action) {
    if (fish?.activity === FISH_GRAVEL_PEBBLE_ACTIVITY) {
      clearFishGravelPebbleAction(fish, species, now);
    }
    return false;
  }

  if (!canUseFishGravelPebblePlay() || !isFishSpeciesEligibleForGravelPebble(species) || isFishDead(fish)) {
    clearFishGravelPebbleAction(fish, species, now);
    return false;
  }

  if (now - action.startedAt > 12000) {
    clearFishGravelPebbleAction(fish, species, now);
    return false;
  }

  fish.activity = FISH_GRAVEL_PEBBLE_ACTIVITY;
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;

  if (action.stage === "dive") {
    fish.targetXNorm = action.pickupXNorm;
    fish.targetYNorm = action.pickupYNorm;
    fish.targetAt = now + 2600;
    if (Math.hypot(fish.xNorm - action.pickupXNorm, fish.yNorm - action.pickupYNorm) <= FISH_GRAVEL_PEBBLE_PICKUP_REACHED_DISTANCE_NORM) {
      if (!action.pickupEffectsSpawned) {
        const pickupX = action.pickupXNorm * TANK_WIDTH;
        const pickupY = action.pickupYNorm * TANK_HEIGHT;
        spawnGravelCloudEffectAtPoint(pickupX, pickupY + 8, {
          now,
          intensity: 1.05,
          sedimentStrength: getSedimentStrength(now, 1.18),
          baseRadius: 22,
          driftX: randomBetween(-5, 5),
          driftY: randomBetween(-8, -2)
        });
        spawnGravelDigBurst(pickupX, pickupY + 6, {
          now,
          intensity: 0.58,
          direction: getFishFacingDirection(fish)
        });
        attemptGravelCoinFind(fish, action, now);
        action.pickupEffectsSpawned = true;
      }
      action.stage = "carry";
      fish.targetXNorm = action.carryTargetXNorm;
      fish.targetYNorm = action.carryTargetYNorm;
      fish.targetAt = now + 3000;
    }
  } else if (action.stage === "carry") {
    fish.targetXNorm = action.carryTargetXNorm;
    fish.targetYNorm = action.carryTargetYNorm;
    fish.targetAt = now + 2400;
    if (Math.hypot(fish.xNorm - action.carryTargetXNorm, fish.yNorm - action.carryTargetYNorm) <= FISH_GRAVEL_PEBBLE_SPIT_REACHED_DISTANCE_NORM) {
      spawnFishGravelPebbleToss(fish, species, action, now);
      clearFishGravelPebbleAction(fish, species, now);
      return false;
    }
  } else {
    clearFishGravelPebbleAction(fish, species, now);
    return false;
  }

  if (Math.abs(fish.targetXNorm - fish.xNorm) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
    setFishDirection(fish, fish.targetXNorm >= fish.xNorm ? 1 : -1, species, now);
  }

  return true;
}

function updateFishPebbleTosses(now = Date.now()) {
  pruneFishGravelPebbleRuntimeState(now);
  if (!runtime.fishPebbleTosses?.length) {
    return;
  }

  runtime.fishPebbleTosses = runtime.fishPebbleTosses.filter((toss) => {
    if (!toss?.assetPath || !toss?.color) {
      return false;
    }

    if (now < toss.startedAt + toss.durationMs) {
      return true;
    }

    const endY = Number.isFinite(Number(toss.endLayer))
      ? getFishPebbleTossLayerLandingY(toss, toss.sizePx)
      : toss.endY;
    spawnGravelLandingEffects(toss.endX, endY, {
      now,
      intensity: 0.72,
      radiusPx: 38,
      force: 0.28
    });
    return false;
  });
}

function updateSedimentClouds(now = Date.now()) {
  runtime.sedimentClouds = runtime.sedimentClouds.filter((cloud) => (
    cloud && (Number(cloud.startedAt) || 0) + (Number(cloud.durationMs) || 0) > now
  ));
}

function updateCoinGlints(now = Date.now()) {
  runtime.coinGlints = runtime.coinGlints.filter((glint) => (
    glint && (Number(glint.startedAt) || 0) + (Number(glint.durationMs) || 0) > now
  ));
}

function updateFishSedimentWakes(now = Date.now()) {
  const activeFishIds = new Set();
  for (const fish of state?.fish || []) {
    if (!fish?.id) {
      continue;
    }
    activeFishIds.add(fish.id);
    const species = getSpeciesForFish(fish);
    if (!species || isFishDead(fish)) {
      runtime.waterEffectFishSamples.delete(fish.id);
      continue;
    }

    const pose = getFishPose(fish, species, now);
    const width = getFishDisplayWidth(fish, species, now);
    const floorY = getTankFloorMaskSurfaceYAtX(pose.x);
    const bellyY = pose.y + width * 0.22;
    const sample = runtime.waterEffectFishSamples.get(fish.id);
    const elapsedSeconds = sample ? Math.max(0.016, (now - sample.at) / 1000) : 0.016;
    const dx = sample ? pose.x - sample.x : 0;
    const dy = sample ? pose.y - sample.y : 0;
    const vx = dx / elapsedSeconds;
    const vy = dy / elapsedSeconds;
    const speed = Math.hypot(vx, vy);
    if (sample) {
      const nearGravel = floorY - bellyY < Math.max(30, width * 0.28) && floorY - bellyY > -18;
      const leavingGravel = dy < -1.5 || Math.hypot(dx, dy) > 9;
      if (
        nearGravel
        && leavingGravel
        && speed >= SEDIMENT_WAKE_MIN_SPEED_PX_PER_SECOND
        && now - (sample.lastWakeAt || 0) >= SEDIMENT_WAKE_COOLDOWN_MS
      ) {
        spawnSedimentCloud(sample.x + dx * 0.22, floorY - 4, {
          now,
          strength: getSedimentStrength(now, clamp(speed / 190, 0.7, 1.35)),
          baseRadius: clamp(width * 0.17, 15, 34),
          driftX: clamp(-dx * 0.12, -14, 14),
          driftY: randomBetween(-10, -4)
        });
        sample.lastWakeAt = now;
      }
    }

    runtime.waterEffectFishSamples.set(fish.id, {
      x: pose.x,
      y: pose.y,
      at: now,
      vx,
      vy,
      speed,
      lastWakeAt: sample?.lastWakeAt || 0
    });
  }

  for (const fishId of runtime.waterEffectFishSamples.keys()) {
    if (!activeFishIds.has(fishId)) {
      runtime.waterEffectFishSamples.delete(fishId);
    }
  }
}

function updateWaterLifeEffects(now = Date.now(), deltaSeconds = 0.016) {
  updateSedimentClouds(now);
  updateGravelDigBursts(now);
  updateCoinGlints(now);
  updateFishSedimentWakes(now);
  updateWaterParticles(now, deltaSeconds);
  updateBloodWaterTint(deltaSeconds);
  updateEffectClouds(deltaSeconds);
}

function getFishPebbleTossPose(toss, now = Date.now()) {
  const progress = clamp((now - toss.startedAt) / Math.max(1, toss.durationMs), 0, 1);
  const horizontalProgress = 1 - Math.pow(1 - progress, 1.45);
  const verticalProgress = Math.pow(progress, 1.8);
  const sway = Math.sin(progress * Math.PI * 2.4 + toss.sway * Math.PI * 2) * toss.driftAmplitudePx * (0.86 - progress * 0.22);
  const flutterY = Math.sin(progress * Math.PI * 3.2 + toss.sway * Math.PI * 4) * (1 - progress) * 2.6;
  const endY = Number.isFinite(Number(toss.endLayer))
    ? getFishPebbleTossLayerLandingY(toss, toss.sizePx)
    : toss.endY;
  return {
    x: toss.startX + (toss.endX - toss.startX) * horizontalProgress + sway,
    y: toss.startY + (endY - toss.startY) * verticalProgress - Math.sin(progress * Math.PI) * toss.arcLiftPx + flutterY,
    rotation: toss.rotation + toss.spin * horizontalProgress,
    alpha: 1
  };
}

function getFishSchoolFollowLeader(fish) {
  if (!fish?.followFishId) {
    return null;
  }

  return state.fish.find((entry) => entry.id === fish.followFishId) || null;
}

function isFishEligibleSchoolLeader(leader, follower, species, now = Date.now()) {
  if (
    !leader ||
    !follower ||
    leader.id === follower.id ||
    leader.speciesId !== follower.speciesId ||
    isFishDead(leader) ||
    leader.activity !== "roam" ||
    leader.caveState ||
    leader.entryStartedAt ||
    isFishDiseaseAvoidanceSource(leader) ||
    isFishSickOrDying(leader)
  ) {
    return false;
  }

  if (Number.isFinite(leader.followUntil) && now < leader.followUntil && leader.followFishId === follower.id) {
    return false;
  }

  if (species?.behavior === "sucker") {
    return false;
  }

  return true;
}

function getFishSchoolFollowAnchor(fish, leader) {
  if (!fish || !leader) {
    return null;
  }

  const leaderDirection = getFishFacingDirection(leader);
  const spacingNorm = clamp(
    (Math.max(80, getFishVisualSize(fish)) + Math.max(80, getFishVisualSize(leader))) / TANK_WIDTH * 0.2,
    SAME_SPECIES_FOLLOW_SPACING_MIN_NORM,
    SAME_SPECIES_FOLLOW_SPACING_MAX_NORM
  );
  const leadBlend = clamp(
    Math.hypot(
      (Number(leader.targetXNorm) || leader.xNorm) - leader.xNorm,
      (Number(leader.targetYNorm) || leader.yNorm) - leader.yNorm
    ) * 2.8,
    0.12,
    0.42
  );
  const anchorXNorm = leader.xNorm + ((Number(leader.targetXNorm) || leader.xNorm) - leader.xNorm) * leadBlend;
  const anchorYNorm = leader.yNorm + ((Number(leader.targetYNorm) || leader.yNorm) - leader.yNorm) * leadBlend;
  const offsetXNorm = Number.isFinite(fish.followOffsetXNorm)
    ? Number(fish.followOffsetXNorm)
    : clamp(
      -leaderDirection * spacingNorm + randomBetween(-0.012, 0.012),
      -SAME_SPECIES_FOLLOW_SPACING_MAX_NORM,
      SAME_SPECIES_FOLLOW_SPACING_MAX_NORM
    );
  const offsetYNorm = Number.isFinite(fish.followOffsetYNorm)
    ? Number(fish.followOffsetYNorm)
    : randomBetween(-SAME_SPECIES_FOLLOW_VERTICAL_JITTER_NORM, SAME_SPECIES_FOLLOW_VERTICAL_JITTER_NORM);

  return {
    xNorm: clamp(anchorXNorm + offsetXNorm, 0.08, 0.92),
    yNorm: clamp(anchorYNorm + offsetYNorm, 0.14, 0.8),
    targetLayer: clampTankLayer(getFishTankLayer(leader)),
    offsetXNorm,
    offsetYNorm
  };
}

function getFishSchoolFollowFacingDirection(fish, species, now = Date.now(), fallbackDx = null) {
  if (
    !fish ||
    !species ||
    species.behavior === "sucker" ||
    fish.activity !== "roam" ||
    fish.caveState ||
    !Number.isFinite(fish.followUntil) ||
    now >= fish.followUntil
  ) {
    return null;
  }

  const leader = getFishSchoolFollowLeader(fish);
  if (!isFishEligibleSchoolLeader(leader, fish, species, now)) {
    return null;
  }

  const leaderDirection = getFishFacingDirection(leader);
  const targetXNorm = Number.isFinite(Number(fish.targetXNorm))
    ? Number(fish.targetXNorm)
    : fish.xNorm;
  const dx = Number.isFinite(Number(fallbackDx))
    ? Number(fallbackDx)
    : (targetXNorm - fish.xNorm);
  const spacingNorm = clamp(
    Math.abs(Number(fish.followOffsetXNorm)) || SAME_SPECIES_FOLLOW_SPACING_MIN_NORM,
    SAME_SPECIES_FOLLOW_SPACING_MIN_NORM,
    SAME_SPECIES_FOLLOW_SPACING_MAX_NORM
  );
  const reverseSlack = Math.max(
    FISH_DIRECTION_TARGET_DEADZONE_NORM * 2,
    spacingNorm * 0.45
  );
  return dx * leaderDirection >= -reverseSlack ? leaderDirection : null;
}

function updateFishSchoolFollowTarget(fish, species, now = Date.now()) {
  if (
    !fish ||
    !species ||
    species.behavior === "sucker" ||
    fish.activity !== "roam" ||
    fish.caveState ||
    !Number.isFinite(fish.followUntil) ||
    now >= fish.followUntil
  ) {
    clearFishSchoolFollowState(fish);
    return false;
  }

  const leader = getFishSchoolFollowLeader(fish);
  if (!isFishEligibleSchoolLeader(leader, fish, species, now)) {
    clearFishSchoolFollowState(fish);
    return false;
  }

  const anchor = getFishSchoolFollowAnchor(fish, leader);
  if (!anchor) {
    clearFishSchoolFollowState(fish);
    return false;
  }

  fish.targetXNorm = anchor.xNorm;
  fish.targetYNorm = anchor.yNorm;
  fish.targetAt = Math.max(now + 500, fish.followUntil);
  setFishDesiredTankLayer(fish, anchor.targetLayer);
  return true;
}

function pickSameSpeciesFollowTarget(fish, species, now = Date.now()) {
  if (
    !fish ||
    !species ||
    species.behavior === "sucker" ||
    fish.activity !== "roam" ||
    fish.caveState ||
    isFishSickOrDying(fish)
  ) {
    return null;
  }

  const nearbySchoolmates = state.fish
    .filter((otherFish) => isFishEligibleSchoolLeader(otherFish, fish, species, now))
    .map((otherFish) => ({
      fish: otherFish,
      distanceNorm: Math.hypot(otherFish.xNorm - fish.xNorm, otherFish.yNorm - fish.yNorm)
    }))
    .filter((entry) => entry.distanceNorm <= SAME_SPECIES_FOLLOW_RADIUS_NORM)
    .sort((left, right) => left.distanceNorm - right.distanceNorm);

  if (!nearbySchoolmates.length) {
    return null;
  }

  const followChance = clamp(
    SAME_SPECIES_FOLLOW_BASE_CHANCE + Math.max(0, nearbySchoolmates.length - 1) * SAME_SPECIES_FOLLOW_NEIGHBOR_BONUS,
    0,
    SAME_SPECIES_FOLLOW_MAX_CHANCE
  );
  if (Math.random() > followChance) {
    return null;
  }

  const leaderPool = nearbySchoolmates.slice(0, Math.min(4, nearbySchoolmates.length));
  const leaderIndex = Math.min(
    leaderPool.length - 1,
    Math.floor(Math.pow(Math.random(), 1.35) * leaderPool.length)
  );
  const leader = leaderPool[leaderIndex]?.fish || null;
  if (!leader) {
    return null;
  }

  const followUntil = now + randomBetween(SAME_SPECIES_FOLLOW_MIN_MS, SAME_SPECIES_FOLLOW_MAX_MS);
  fish.followFishId = leader.id;
  fish.followUntil = followUntil;
  fish.followOffsetXNorm = null;
  fish.followOffsetYNorm = null;
  const anchor = getFishSchoolFollowAnchor(fish, leader);
  if (!anchor) {
    clearFishSchoolFollowState(fish);
    return null;
  }

  fish.followOffsetXNorm = anchor.offsetXNorm;
  fish.followOffsetYNorm = anchor.offsetYNorm;

  return {
    leaderId: leader.id,
    xNorm: anchor.xNorm,
    yNorm: anchor.yNorm,
    targetLayer: anchor.targetLayer,
    lingerMs: followUntil - now
  };
}
