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
  if (!canUseFishGravelPebblePlay() || !fish || isProteusZombieFish(fish) || !isFishSpeciesEligibleForGravelPebble(species) || isFishDead(fish)) {
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
  if (!fish || isProteusZombieFish(fish) || !isFishSpeciesEligibleForGravelPebble(species) || isFishDead(fish)) {
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

  // A carried pebble must be attached to the rendered fish artwork, never to
  // an estimated point in the full source rectangle (which can contain large
  // transparent margins). Defer that single visual until its decoded mask is
  // available instead of drawing it in the wrong place.
  return null;
}

function getFishFrontMouthOffsetAtPose(fish, species, width, height, pose, now = Date.now(), localForwardOffsetPx = 0) {
  const localPoint = getFishGravelPebbleMouthLocalPoint(fish, species, width, height, pose, now);
  // Non-pebble effects retain a safe provisional point while their artwork is
  // still decoding. Held pebbles call the strict helper directly and never
  // use this image-rectangle fallback.
  const resolvedPoint = localPoint || {
    x: width * 0.48 + (pose?.wiggle || 0) * width * 0.018,
    y: -height * 0.02
  };
  resolvedPoint.x += Number.isFinite(localForwardOffsetPx) ? localForwardOffsetPx : 0;
  const bodyScaleX = pose.bodyScaleX || 1;
  const bodyScaleY = pose.bodyScaleY || 1;
  const tilt = pose.tilt || 0;
  const facingScaleX = pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1);
  const scaledX = bodyScaleX * resolvedPoint.x;
  const scaledY = bodyScaleY * resolvedPoint.y;
  const useSuckerFacePivot = (
    SUCKER_FISH_FACE_PIVOT_ENABLED
    && !pose.isDead
    && getEffectiveFishBehavior(fish, species) === "sucker"
    && !isSuckerFishFreeSwimming(fish, species, now)
    && !getSuckerFishViewTransitionState(fish, now)
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
    pickupLayer: clampTankLayer(getFishTankLayer(fish)),
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
  setFishDesiredTankLayer(fish, action.pickupLayer);
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
  // Fish-play pebbles belong to the depth layer where they were picked up.
  // Their drop finishes on that layer's authored gravel/floor line, not on the
  // front-most physical substrate surface at the pebble's screen X position.
  return clamp(
    getTankLayerBottomBoundaryY(normalizedLayer) - size * 0.5 + offsetPx,
    WATER_SURFACE_Y + 24,
    TANK_HEIGHT - GLASS_MARGIN_BOTTOM - size * 0.5
  );
}

function spawnFishGravelPebbleToss(fish, species, action, now = Date.now()) {
  if (!fish || !species || !action?.assetPath || !action?.color) {
    return false;
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
    return false;
  }

  const landingX = clamp(mouthPoint.x + randomBetween(-56, 56), GLASS_MARGIN_X + 10, TANK_WIDTH - GLASS_MARGIN_X - 10);
  const landingLayer = clampTankLayer(
    Number.isFinite(Number(action.pickupLayer)) ? Number(action.pickupLayer) : getFishTankLayer(fish)
  );
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
  return true;
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
      : (Math.random() < 0.5 ? -1 : 1),
    forwardOnly: options.forwardOnly === true,
    frontOfFish: options.frontOfFish === true
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
  const forwardOnly = options.forwardOnly === true;
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const scatterX = forwardOnly
      ? direction * randomBetween(4, scatterPx)
      : randomBetween(-scatterPx, scatterPx) + direction * randomBetween(-4, scatterPx * 0.7);
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
    frontOfFish: options.frontOfFish === true,
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

function getBoroughGravelCoinFindStatus(now = Date.now()) {
  const dayKey = getLocalDayKey(now);
  if (state.gravelCoinFindDayKey !== dayKey) {
    state.gravelCoinFindDayKey = dayKey;
    state.gravelCoinsFoundToday = 0;
  }

  state.gravelCoinsFoundToday = clamp(
    Math.floor(Number(state.gravelCoinsFoundToday) || 0),
    0,
    GRAVEL_DAILY_COIN_FIND_CAP
  );
  state.lastGravelCoinFoundAt = Math.max(0, Number(state.lastGravelCoinFoundAt) || 0);

  return {
    dayKey,
    coinsFound: state.gravelCoinsFoundToday,
    cap: GRAVEL_DAILY_COIN_FIND_CAP,
    lastFoundAt: state.lastGravelCoinFoundAt
  };
}

function attemptGravelCoinFind(fish, action, now = Date.now(), options = {}) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    return false;
  }
  if (!fish || !action || action.coinFindRolled) {
    return false;
  }

  action.coinFindRolled = true;
  const status = getBoroughGravelCoinFindStatus(now);
  if (status.coinsFound >= status.cap) {
    return false;
  }

  const chanceMultiplier = Math.max(0, Number(options.chanceMultiplier) || 1);
  const coinChance = clamp(GRAVEL_COIN_FIND_CHANCE * chanceMultiplier, 0, 1);
  if (now - status.lastFoundAt < GRAVEL_COIN_FIND_COOLDOWN_MS || Math.random() >= coinChance) {
    return false;
  }

  state.gravelCoinsFoundToday = Math.min(GRAVEL_DAILY_COIN_FIND_CAP, status.coinsFound + 1);
  state.coins = Math.min(MAX_WALLET_COINS, state.coins + 1);
  recordDailyIncomeCategory("random-finds", 1, now);
  recordWalletTransaction({ amount: 1, direction: "credit", category: "random-finds", now, place: getTankLabel(), label: `${fish.name || "A fish"} found a coin` });
  state.lastGravelCoinFoundAt = now;
  pushEvent(`${fish.name || "A fish"} found a coin in the gravel.`, now);
  spawnCoinGlint(action.pickupXNorm * TANK_WIDTH, action.pickupYNorm * TANK_HEIGHT - 8, now);
  saveState();
  renderUi(now, { full: false });
  return true;
}

function getBoroughOtocinclusCoinFindStatus(now = Date.now()) {
  const dayKey = getLocalDayKey(now);
  if (state.boroughOtocinclusCoinFindDayKey !== dayKey) {
    state.boroughOtocinclusCoinFindDayKey = dayKey;
    state.boroughOtocinclusCoinsFoundToday = 0;
  }

  state.boroughOtocinclusCoinsFoundToday = clamp(
    Math.floor(Number(state.boroughOtocinclusCoinsFoundToday) || 0),
    0,
    OTOCINCLUS_DAILY_COIN_FIND_CAP
  );
  state.boroughOtocinclusCoinFindLastAttemptAt = Math.max(
    0,
    Number(state.boroughOtocinclusCoinFindLastAttemptAt) || 0
  );

  return {
    dayKey,
    coinsFound: state.boroughOtocinclusCoinsFoundToday,
    cap: OTOCINCLUS_DAILY_COIN_FIND_CAP,
    lastAttemptAt: state.boroughOtocinclusCoinFindLastAttemptAt
  };
}

// Compatibility wrapper for older callers/debug helpers. Economy state is borough-wide.
function getTankOtocinclusCoinFindStatus(tank = getCurrentTank(), now = Date.now()) {
  return getBoroughOtocinclusCoinFindStatus(now);
}

function attemptOtocinclusCoinFind(fish, point = {}, now = Date.now(), options = {}) {
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    return false;
  }

  const species = getSpeciesForFish(fish);
  if (!fish || isFishDead(fish) || species?.id !== "otocinclus" || getEffectiveFishBehavior(fish, species) !== "sucker") {
    return false;
  }

  const tank = getCurrentTank();
  const status = getBoroughOtocinclusCoinFindStatus(now);
  if (!tank || status.coinsFound >= status.cap) {
    return false;
  }

  if (now - status.lastAttemptAt < OTOCINCLUS_COIN_FIND_ATTEMPT_COOLDOWN_MS) {
    return false;
  }

  state.boroughOtocinclusCoinFindLastAttemptAt = now;

  if (Math.random() >= OTOCINCLUS_COIN_FIND_CHANCE) {
    if (typeof requestDeferredStateSave === "function") {
      requestDeferredStateSave();
    }
    return false;
  }

  state.boroughOtocinclusCoinsFoundToday = Math.min(
    OTOCINCLUS_DAILY_COIN_FIND_CAP,
    status.coinsFound + 1
  );
  state.coins = Math.min(MAX_WALLET_COINS, state.coins + 1);
  recordDailyIncomeCategory("random-finds", 1, now);

  const context = options.context === "glass" ? "cleaning the glass" : "grazing through the gravel";
  recordWalletTransaction({
    amount: 1,
    direction: "credit",
    category: "random-finds",
    now,
    place: getTankLabel(),
    label: `${fish.name || "Dwarf Sucker Catfish"} found a coin`
  });
  pushEvent(`${fish.name || "Dwarf Sucker Catfish"} found a coin while ${context}.`, now);

  const xNorm = clamp(Number(point.xNorm ?? fish.xNorm) || 0.5, 0, 1);
  const yNorm = clamp(Number(point.yNorm ?? fish.yNorm) || 0.5, 0, 1);
  spawnCoinGlint(xNorm * TANK_WIDTH, yNorm * TANK_HEIGHT - 8, now);
  playCoinSoundEffect();
  saveState();
  renderUi(now, { full: false });
  return true;
}

function isOtocinclusGravelScanner(fish, species = getSpeciesForFish(fish)) {
  return Boolean(fish && species?.id === "otocinclus" && getEffectiveFishBehavior(fish, species) === "sucker");
}

function pickOtocinclusGravelScanTarget(fish, species, now = Date.now()) {
  if (!isOtocinclusGravelScanner(fish, species)) {
    return null;
  }

  const xNorm = clamp(fish.xNorm + randomBetween(-0.2, 0.2), 0.1, 0.9);
  const targetX = xNorm * TANK_WIDTH;
  const floorY = getTankFloorMaskSurfaceYAtX(targetX);
  const sideAssetPath = getSuckerFishFreeSwimAssetPath(species, fish);
  const sideImage = sideAssetPath ? runtime.images.get(sideAssetPath) : null;
  const width = getFishDisplayWidth(fish, species, now);
  const height = width * (sideImage?.width ? sideImage.height / sideImage.width : 0.36);
  const targetYNorm = clamp((floorY - Math.max(6, height * 0.22)) / TANK_HEIGHT, 0.64, 0.94);

  return {
    xNorm,
    yNorm: targetYNorm,
    direction: xNorm >= fish.xNorm ? 1 : -1,
    floorY
  };
}

function spawnOtocinclusImmediatePebbleSpit(fish, species, now = Date.now()) {
  const pebbleAssets = getCustomGravelLoosePebbleAssets();
  if (!pebbleAssets.length || !fish || !species) {
    return false;
  }

  const colors = getResolvedCustomGravelLayerColors(now);
  const colorizeSettings = getActiveCustomGravelLayerColorizeSettings();
  const asset = pebbleAssets[Math.floor(Math.random() * pebbleAssets.length)] || pebbleAssets[0];
  const colorIndex = Math.floor(Math.random() * Math.max(1, colors.length));
  const color = colors[colorIndex] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
  const colorize = Boolean(colorizeSettings?.[colorIndex]);
  const sizePx = randomBetween(FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX * 0.72, FISH_GRAVEL_PEBBLE_HOLD_SIZE_MAX_PX * 0.86);
  const mouthPoint = getFishGravelPebbleMouthPoint(fish, species, now, sizePx * 0.18);
  if (!mouthPoint) {
    return false;
  }

  if (runtime.fishPebbleTosses.length >= MAX_ACTIVE_FISH_GRAVEL_PEBBLE_TOSSES) {
    runtime.fishPebbleTosses.shift();
  }

  const landingX = clamp(mouthPoint.x + randomBetween(-24, 24), GLASS_MARGIN_X + 10, TANK_WIDTH - GLASS_MARGIN_X - 10);
  const landingY = getTankFloorMaskSurfaceYAtX(landingX) - randomBetween(1, 4);
  runtime.fishPebbleTosses.push({
    id: createId("otocinclus-gravel-pebble"),
    fishId: fish.id,
    assetPath: asset.path,
    color,
    colorize,
    sizePx,
    startX: mouthPoint.x,
    startY: mouthPoint.y,
    endX: landingX,
    endY: landingY,
    endLayer: SUCKER_FISH_FREE_SWIM_LAYER,
    endYOffsetPx: 0,
    sway: Math.random(),
    driftAmplitudePx: randomBetween(2, 7),
    arcLiftPx: randomBetween(4, 10),
    rotation: randomBetween(-Math.PI, Math.PI),
    spin: randomBetween(-0.4, 0.4),
    startedAt: now,
    durationMs: randomBetween(OTOCINCLUS_GRAVEL_SPIT_MIN_MS, OTOCINCLUS_GRAVEL_SPIT_MAX_MS)
  });
  return true;
}

function performOtocinclusGravelScan(fish, species, now = Date.now()) {
  if (!isOtocinclusGravelScanner(fish, species)) {
    return false;
  }

  const mouthPoint = getFishGravelPebbleMouthPoint(fish, species, now);
  const scanX = mouthPoint?.x ?? fish.xNorm * TANK_WIDTH;
  const scanY = getTankFloorMaskSurfaceYAtX(scanX) - 2;
  spawnGravelCloudEffectAtPoint(scanX, scanY + 5, {
    now,
    intensity: 0.42,
    sedimentStrength: getSedimentStrength(now, 0.66),
    baseRadius: 13,
    driftX: randomBetween(-2, 2),
    driftY: randomBetween(-4, -1)
  });
  spawnGravelDigBurst(scanX, scanY + 4, {
    now,
    intensity: 0.24,
    direction: getFishFacingDirection(fish)
  });
  spawnOtocinclusImmediatePebbleSpit(fish, species, now);
  attemptOtocinclusCoinFind(fish, {
    xNorm: clamp(scanX / TANK_WIDTH, 0, 1),
    yNorm: clamp(scanY / TANK_HEIGHT, 0, 1)
  }, now, { context: "gravel" });
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
  setFishDesiredTankLayer(
    fish,
    Number.isFinite(Number(action.pickupLayer)) ? Number(action.pickupLayer) : getFishTankLayer(fish)
  );

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
      if (spawnFishGravelPebbleToss(fish, species, action, now)) {
        clearFishGravelPebbleAction(fish, species, now);
        return false;
      }
      // Keep the pebble visibly held if the release pose cannot be resolved on
      // this frame. Retry instead of clearing the action and popping the rock.
      fish.targetAt = now + 250;
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

function getFishSchoolLeaderFormationDirection(leader, now = Date.now()) {
  const visibleDirection = getFishFacingDirection(leader);
  if (!leader || typeof getFishHorizontalTurnState !== "function") {
    return visibleDirection;
  }

  const turnState = getFishHorizontalTurnState(leader, now);
  if (turnState?.active && turnState.reversing) {
    // Schooling follows the committed visible side, never renderer yaw. This
    // keeps v26's edge-on midpoint and render-space trajectory invisible to
    // formation logic, and also prevents lightweight turns from moving the
    // formation anchor before their reversal lifecycle is actually complete.
    return Number(turnState.fromDirection) < 0 ? -1 : 1;
  }
  return visibleDirection;
}

function getFishSchoolFollowLeader(fish) {
  if (!fish?.followFishId) {
    return null;
  }

  return state.fish.find((entry) => entry.id === fish.followFishId) || null;
}

function getFishSchoolingCompatibilityId(fish) {
  const socialProfile = typeof getFishSocialProfile === "function"
    ? getFishSocialProfile(fish)
    : null;
  if (
    socialProfile?.socialGroupId
    && ["school", "pod"].includes(socialProfile.socialMode)
  ) {
    return socialProfile.socialGroupId;
  }

  const species = getBaseSpeciesForFish(fish);
  if (species?.customAsset) {
    return sanitizeFishBehaviorSpeciesId(
      fish?.behaviorSpeciesId || species.behaviorSpeciesId || species.behaviorProfileId,
      fish?.speciesId
    ) || fish?.speciesId || "";
  }
  return fish?.speciesId || "";
}

function isFishEligibleSchoolLeader(leader, follower, species, now = Date.now()) {
  if (
    !leader ||
    !follower ||
    leader.id === follower.id ||
    getFishSchoolingCompatibilityId(leader) !== getFishSchoolingCompatibilityId(follower) ||
    isFishDead(leader) ||
    leader.activity !== "roam" ||
    leader.caveState ||
    leader.entryStartedAt ||
    isFishDiseaseAvoidanceSource(leader) ||
    isFishSickOrDying(leader)
  ) {
    return false;
  }

  // A formation follows one independently roaming leader. Letting followers
  // become leaders creates long queues where fast fish continually overshoot
  // a slower fish's moving anchor.
  if (Number.isFinite(leader.followUntil) && now < leader.followUntil) {
    return false;
  }
  // User/debug follow is also a formation. Treating that fish as an
  // independent school leader created follower chains with two moving
  // controllers and a perpetually shifting anchor.
  if (
    (typeof getActiveFishActionSteering === "function" && getActiveFishActionSteering(leader, now)?.type === "follow")
    || (typeof getActiveDebugBehaviorSteering === "function" && getActiveDebugBehaviorSteering(leader, now)?.type === "follow")
  ) {
    return false;
  }

  if (species?.behavior === "sucker") {
    return false;
  }

  return true;
}

function isFishSchoolLeaderAvailable(fish, leader, species, now = Date.now()) {
  if (["hangout", "debug"].includes(fish?.schoolSource)) {
    return Boolean(leader && !isFishDead(leader) && leader.activity === "roam" && !leader.caveState
      && !(leader.followFishId && Number(leader.followUntil) > now));
  }
  return isFishEligibleSchoolLeader(leader, fish, species, now);
}

function getFishSchoolFormationSubLayerPattern(leaderSubLayer) {
  const leaderLane = clampTankSubLayer(leaderSubLayer);
  if (leaderLane === TANK_SUBLAYER_FRONT) {
    return [TANK_SUBLAYER_MIDDLE, TANK_SUBLAYER_BACK, TANK_SUBLAYER_FRONT];
  }
  if (leaderLane === TANK_SUBLAYER_BACK) {
    return [TANK_SUBLAYER_MIDDLE, TANK_SUBLAYER_FRONT, TANK_SUBLAYER_BACK];
  }
  return [TANK_SUBLAYER_FRONT, TANK_SUBLAYER_BACK, TANK_SUBLAYER_MIDDLE];
}

function assignFishSchoolFormationDepthSlot(fish, leader, now = Date.now()) {
  if (!fish || !leader) {
    return 0;
  }
  const existingSlot = Number(fish.followDepthSlot);
  if (Number.isInteger(existingSlot) && existingSlot >= 0 && existingSlot < TANK_DEPTH_SUBLAYERS) {
    return existingSlot;
  }

  const slotCounts = new Array(TANK_DEPTH_SUBLAYERS).fill(0);
  for (const otherFish of state.fish) {
    if (
      !otherFish
      || otherFish.id === fish.id
      || otherFish.followFishId !== leader.id
      || !Number.isFinite(Number(otherFish.followUntil))
      || Number(otherFish.followUntil) <= now
      || isFishDead(otherFish)
    ) {
      continue;
    }
    const slot = Number(otherFish.followDepthSlot);
    if (Number.isInteger(slot) && slot >= 0 && slot < TANK_DEPTH_SUBLAYERS) {
      slotCounts[slot] += 1;
    }
  }

  let chosenSlot = 0;
  for (let slot = 1; slot < slotCounts.length; slot += 1) {
    if (slotCounts[slot] < slotCounts[chosenSlot]) {
      chosenSlot = slot;
    }
  }
  fish.followDepthSlot = chosenSlot;
  return chosenSlot;
}

function getFishSchoolFormationSubLayer(fish, leader, now = Date.now()) {
  if (!fish || !leader) {
    return DEFAULT_TANK_SUBLAYER;
  }
  const slot = assignFishSchoolFormationDepthSlot(fish, leader, now);
  const pattern = getFishSchoolFormationSubLayerPattern(getFishTankSubLayer(leader));
  return clampTankSubLayer(pattern[slot % pattern.length]);
}

function getFishSchoolFormationDepthOffset(fish, leader, now = Date.now()) {
  const slot = assignFishSchoolFormationDepthSlot(fish, leader, now);
  const offsets = [0, -0.024, 0.024];
  return offsets[slot % offsets.length];
}

function getFishSchoolActiveFollowers(leader, now = Date.now()) {
  if (!leader?.id) {
    return [];
  }
  return state.fish.filter((fish) => (
    fish
    && fish.id !== leader.id
    && fish.followFishId === leader.id
    && Number.isFinite(Number(fish.followUntil))
    && Number(fish.followUntil) > now
    && !isFishDead(fish)
  ));
}

// This is the single entry point for every social movement request.  The
// legacy follow fields remain the persisted compatibility shape, but no caller
// is allowed to calculate a follower destination on its own.
function requestFishSchoolingRelationship(fish, leader, now = Date.now(), options = {}) {
  if (!fish || !leader || fish.id === leader.id || isFishDead(fish) || isFishDead(leader)) return null;
  const followerSpecies = getSpeciesForFish(fish);
  if (!options.allowMixedSpecies && !isFishEligibleSchoolLeader(leader, fish, followerSpecies, now)) return null;
  if (leader.followFishId && Number(leader.followUntil) > now) return null;
  // A fish which already has followers is an active leader.  It may never be
  // repurposed as somebody else's follower; that is the other half of the
  // no-chain invariant (the leader check above covers the target half).
  if (getFishSchoolActiveFollowers(fish, now).length > 0) return null;
  const existingLeader = getFishSchoolFollowLeader(fish);
  if (existingLeader && existingLeader.id !== leader.id) return null;
  if (!existingLeader && getFishSchoolActiveFollowers(leader, now).length >= SCHOOL_MAX_FOLLOWERS) return null;

  const durationMs = Math.max(1000, Number(options.durationMs) || randomBetween(SAME_SPECIES_FOLLOW_MIN_MS, SAME_SPECIES_FOLLOW_MAX_MS));
  fish.followFishId = leader.id;
  fish.followUntil = Math.max(Number(fish.followUntil) || 0, now + durationMs);
  fish.followCooldownUntil = fish.followUntil + randomBetween(3500, 7000);
  fish.schoolId = leader.id;
  fish.schoolRole = "follower";
  fish.schoolSource = options.source || "schooling";
  fish.schoolState = fish.schoolState === "suspended" ? "rejoining" : (fish.schoolState || "formation");
  leader.schoolFormation = leader.schoolFormation || options.formation || "staggered";
  leader.schoolFormationUntil = Number(leader.schoolFormationUntil) || now + randomBetween(SCHOOL_FORMATION_MIN_MS, SCHOOL_FORMATION_MAX_MS);
  fish.schoolFormation = leader.schoolFormation;
  fish.schoolFormationUntil = leader.schoolFormationUntil;
  fish.schoolFormationDirection = Number(fish.schoolFormationDirection) || getFishSchoolLeaderFormationDirection(leader, now);
  fish.followDepthSlot = Number.isInteger(Number(fish.followDepthSlot)) ? fish.followDepthSlot : null;
  fish.followFormationSlot = Number.isInteger(Number(fish.followFormationSlot)) ? fish.followFormationSlot : null;
  assignFishSchoolFormationDepthSlot(fish, leader, now);
  assignFishSchoolFormationSlot(fish, leader, now);
  return fish;
}

function hasActiveFishSchoolFollowers(leader, now = Date.now()) {
  return getFishSchoolActiveFollowers(leader, now).length > 0;
}

function getFishSchoolStableRank(fish) {
  const key = String(fish?.id || fish?.name || fish?.speciesId || "fish");
  if (typeof hashStringToUint32 === "function") {
    return hashStringToUint32(key);
  }
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return hash >>> 0;
}

function assignFishSchoolFormationSlot(fish, leader, now = Date.now()) {
  const existing = Number(fish?.followFormationSlot);
  if (Number.isInteger(existing) && existing >= 0) {
    return existing;
  }

  const used = new Set();
  for (const follower of getFishSchoolActiveFollowers(leader, now)) {
    if (follower.id === fish.id) continue;
    const slot = Number(follower.followFormationSlot);
    if (Number.isInteger(slot) && slot >= 0) {
      used.add(slot);
    }
  }
  let slot = 0;
  while (used.has(slot) && slot < SCHOOL_MAX_FOLLOWERS) slot += 1;
  if (slot >= SCHOOL_MAX_FOLLOWERS) return -1;
  fish.followFormationSlot = slot;
  return slot;
}

function maybeChooseFishSchoolFormation(fish, leader, now = Date.now()) {
  if (Number(leader.schoolFormationUntil) > now && leader.schoolFormation) {
    fish.schoolFormation = leader.schoolFormation;
    fish.schoolFormationUntil = leader.schoolFormationUntil;
    return leader.schoolFormation;
  }
  const leaderDistance = Math.hypot(
    (Number(leader.targetXNorm) || leader.xNorm) - leader.xNorm,
    (Number(leader.targetYNorm) || leader.yNorm) - leader.yNorm
  );
  const depthTravel = Math.abs(getDesiredFishTankDepthIndex(leader) - getFishTankDepthIndex(leader));
  const choices = leaderDistance > 0.11
    ? ["inline", "inline", "inline", "staggered", "ladder"]
    : depthTravel > 0
      ? ["ladder", "ladder", "staggered", "compact"]
      : ["staggered", "staggered", "compact", "broad", "ladder"];
  leader.schoolFormation = choices[Math.floor(Math.random() * choices.length)];
  leader.schoolFormationUntil = now + randomBetween(SCHOOL_FORMATION_MIN_MS, SCHOOL_FORMATION_MAX_MS);
  fish.schoolFormation = leader.schoolFormation;
  fish.schoolFormationUntil = leader.schoolFormationUntil;
  return leader.schoolFormation;
}

function getFishSchoolFormationOffset(fish, leader, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const locomotionProfile = getFishLocomotionProfile(fish || species);
  const spacingScale = clamp(locomotionProfile.schoolSpacingScale, 0.68, 1.55);
  const bodySpacingNorm = clamp(
    (Math.max(60, getFishVisualSize(fish)) + Math.max(60, getFishVisualSize(leader))) / TANK_WIDTH * 0.32 * spacingScale,
    SAME_SPECIES_FOLLOW_SPACING_MIN_NORM,
    SAME_SPECIES_FOLLOW_SPACING_MAX_NORM
  );
  const slot = assignFishSchoolFormationSlot(fish, leader, now);
  const row = Math.floor(slot / 3) + 1;
  const lane = slot % 3;
  const formation = maybeChooseFishSchoolFormation(fish, leader, now);
  const trailingDistance = clamp(
    bodySpacingNorm * (0.9 + row * 0.72),
    SAME_SPECIES_FOLLOW_SPACING_MIN_NORM,
    SAME_SPECIES_FOLLOW_SPACING_MAX_NORM * 1.9
  );
  const verticalStep = clamp(
    SAME_SPECIES_FOLLOW_VERTICAL_JITTER_NORM
      * clamp(locomotionProfile.schoolVerticalJitterScale, 0.35, 1.5),
    0.018,
    0.055
  );
  let laneOffset = lane === 0 ? 0 : (lane === 1 ? -verticalStep : verticalStep);
  const rowOffset = row > 1 ? ((row % 2 === 0 ? 1 : -1) * verticalStep * 0.35) : 0;
  let distanceMultiplier = 1;
  if (formation === "inline") {
    distanceMultiplier = 1.18 + slot * 0.14;
    laneOffset *= 0.42;
  } else if (formation === "ladder") {
    distanceMultiplier = 0.8 + row * 0.12;
    laneOffset *= 0.72;
  } else if (formation === "broad") {
    distanceMultiplier = 0.72 + row * 0.1;
    laneOffset *= 1.65;
  } else if (formation === "compact") {
    distanceMultiplier = 0.68 + row * 0.08;
    laneOffset *= 0.78;
  }
  return {
    trailingDistance: trailingDistance * distanceMultiplier,
    yOffsetNorm: clamp(laneOffset + rowOffset, -0.085, 0.085)
  };
}

function getFishSchoolFollowAnchor(fish, leader, now = Date.now()) {
  if (!fish || !leader) {
    return null;
  }

  // Keep the slot on the side selected when this follow began. The leader's
  // formation-facing value is latched to the source side for the whole active
  // reversal, so v26 yaw and midpoint orientation cannot mirror follower slots.
  const currentLeaderDirection = getFishSchoolLeaderFormationDirection(leader, now);
  const storedDirection = Number(fish.schoolFormationDirection) < 0 ? -1
    : Number(fish.schoolFormationDirection) > 0 ? 1
      : currentLeaderDirection;
  // A turn is a group event: retain existing positions briefly, then let the
  // smoothed targets reform behind the new heading.  This prevents an instant
  // mirror through the leader while still allowing a completed turn to settle.
  if (currentLeaderDirection !== storedDirection) {
    fish.schoolTurnStartedAt = Number(fish.schoolTurnStartedAt) || now;
    if (now - fish.schoolTurnStartedAt >= SCHOOL_FORMATION_HEADING_SETTLE_MS) {
      fish.schoolFormationDirection = currentLeaderDirection;
      fish.schoolTurnStartedAt = null;
    }
  } else {
    fish.schoolTurnStartedAt = null;
  }
  const leaderDirection = Number(fish.schoolFormationDirection) < 0 ? -1
    : Number(fish.schoolFormationDirection) > 0 ? 1 : currentLeaderDirection;
  const formation = getFishSchoolFormationOffset(fish, leader, now);
  const leaderTargetX = Number.isFinite(Number(leader.targetXNorm)) ? Number(leader.targetXNorm) : leader.xNorm;
  const leaderTargetY = Number.isFinite(Number(leader.targetYNorm)) ? Number(leader.targetYNorm) : leader.yNorm;
  const leaderTargetDistance = Math.hypot(leaderTargetX - leader.xNorm, leaderTargetY - leader.yNorm);
  const lookAheadBlend = clamp(leaderTargetDistance * 0.7, 0, 0.14);
  const travelAnchorX = leader.xNorm + (leaderTargetX - leader.xNorm) * lookAheadBlend;
  const travelAnchorY = leader.yNorm + (leaderTargetY - leader.yNorm) * lookAheadBlend;
  const desiredXNorm = clamp(
    travelAnchorX - leaderDirection * formation.trailingDistance,
    0.08,
    0.92
  );
  const desiredYNorm = clamp(
    travelAnchorY + formation.yOffsetNorm,
    0.14,
    0.8
  );
  const depthOffsetZ = getFishSchoolFormationDepthOffset(fish, leader, now);
  const targetZ = sanitizeTankDepthZ(getDesiredFishTankDepthZ(leader) + depthOffsetZ);

  const occupiedFish = [leader, ...getFishSchoolActiveFollowers(leader, now)]
    .filter((otherFish) => otherFish?.id !== fish.id);
  const separation = SCHOOL_FORMATION_MIN_SEPARATION_NORM;
  const separationCandidates = [
    { xNorm: desiredXNorm, yNorm: desiredYNorm },
    { xNorm: desiredXNorm - leaderDirection * separation, yNorm: desiredYNorm },
    { xNorm: desiredXNorm, yNorm: desiredYNorm + separation },
    { xNorm: desiredXNorm, yNorm: desiredYNorm - separation },
    { xNorm: desiredXNorm - leaderDirection * separation * 0.72, yNorm: desiredYNorm + (formation.yOffsetNorm >= 0 ? separation * 0.72 : -separation * 0.72) }
  ].map((candidate) => ({
    xNorm: clamp(candidate.xNorm, 0.08, 0.92),
    yNorm: clamp(candidate.yNorm, 0.14, 0.8)
  }));
  const separatedAnchor = separationCandidates.reduce((best, candidate) => {
    const candidateClearance = occupiedFish.length
      ? Math.min(...occupiedFish.map((otherFish) => Math.hypot(candidate.xNorm - otherFish.xNorm, candidate.yNorm - otherFish.yNorm)))
      : Number.POSITIVE_INFINITY;
    const bestClearance = best && occupiedFish.length
      ? Math.min(...occupiedFish.map((otherFish) => Math.hypot(best.xNorm - otherFish.xNorm, best.yNorm - otherFish.yNorm)))
      : Number.NEGATIVE_INFINITY;
    return candidateClearance > bestClearance ? candidate : best;
  }, null) || { xNorm: desiredXNorm, yNorm: desiredYNorm };

  // Followers use a stable slot behind one leader. Do not steer from a live
  // centroid or from every nearby fish. Those continuously moving forces were
  // causing the school to collapse into a blob and oscillate vertically.
  return {
    xNorm: separatedAnchor.xNorm,
    yNorm: separatedAnchor.yNorm,
    // Formation depth is expressed through sublayers below. Keep each
    // follower in its current tank layer so a leader's depth maneuver cannot
    // pull the whole school across rendered tank strata in one refresh.
    targetLayer: clampTankLayer(getFishTankLayer(fish)),
    targetSubLayer: getFishSchoolFormationSubLayer(fish, leader, now),
    targetZ,
    offsetXNorm: -leaderDirection * formation.trailingDistance,
    offsetYNorm: formation.yOffsetNorm,
    offsetZ: depthOffsetZ
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
  // A leader may use a cave as an ordinary resting behavior.  Its followers
  // do not attempt to enter the same portal; they keep their relationship and
  // wait in a loose, depth-layered pocket at the entrance until it returns.
  if (leader?.caveState) {
    const slot = Math.max(0, assignFishSchoolFormationSlot(fish, leader, now));
    const side = slot % 2 === 0 ? -1 : 1;
    fish.schoolState = "suspended";
    fish.targetXNorm = clamp(
      Number(leader.caveApproachXNorm ?? leader.xNorm) + side * (0.035 + Math.floor(slot / 2) * 0.018),
      0.08,
      0.92
    );
    fish.targetYNorm = clamp(
      Number(leader.caveApproachYNorm ?? leader.yNorm) + (slot % 3 - 1) * 0.026,
      0.14,
      0.8
    );
    fish.targetAt = Math.max(now + 900, Number(leader.caveInsideUntil) || now + 900);
    setFishDesiredTankDepth(
      fish,
      getFishCaveDepthRegion(leader, "front") + getFishSchoolFormationDepthOffset(fish, leader, now)
    );
    return true;
  }
  if (!isFishSchoolLeaderAvailable(fish, leader, species, now)) {
    return null;
  }

  const leaderDirection = getFishSchoolLeaderFormationDirection(leader, now);
  const targetXNorm = Number.isFinite(Number(fish.targetXNorm))
    ? Number(fish.targetXNorm)
    : fish.xNorm;
  const dx = Number.isFinite(Number(fallbackDx))
    ? Number(fallbackDx)
    : (targetXNorm - fish.xNorm);
  // A settled follower has no horizontal travel request. Do not inherit a
  // leader's fresh direction change at rest: that was starting a turnaround
  // even though the formation target was deliberately inside its settle zone.
  if (Math.abs(dx) < SOCIAL_FORMATION_TURN_DEADZONE_NORM) {
    return null;
  }
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
    isProteusZombieFish(fish) ||
    isFishDead(fish) ||
    species.behavior === "sucker" ||
    fish.activity !== "roam" ||
    fish.caveState ||
    !Number.isFinite(fish.followUntil) ||
    now >= fish.followUntil
  ) {
    clearFishSchoolFollowState(fish);
    return false;
  }

  // Older saves predate schoolSource.  A persisted `follow` intent was created
  // by the Debug Follow control, so never reinterpret it as ambient schooling
  // after a reload.  That turns temporary debug links into long-lived follower
  // chains (and makes unrelated fish appear to pick arbitrary leaders).
  if (!fish.schoolSource && fish.behaviorIntent?.type === "follow") {
    fish.behaviorIntent = null;
    clearFishSchoolFollowState(fish);
    return false;
  }

  // Untyped non-debug relationships can be migrated as ambient schooling, but
  // only for an explicitly coordinated social group below.
  if (!fish.schoolSource) fish.schoolSource = "schooling";
  if (
    fish.schoolSource === "debug"
    && !(typeof getActiveDebugBehaviorSteering === "function" && getActiveDebugBehaviorSteering(fish, now)?.type === "follow")
  ) {
    if (fish.behaviorIntent?.type === "follow") fish.behaviorIntent = null;
    clearFishSchoolFollowState(fish);
    return false;
  }
  if (fish.schoolSource === "schooling" && !(typeof getFishSocialProfile === "function" && getFishSocialProfile(fish)?.coordinatedSchooling)) {
    clearFishSchoolFollowState(fish);
    return false;
  }

  if (Number(fish.schoolRecoveryUntil) > now) {
    return true;
  }
  if (fish.schoolRecoveryUntil) {
    fish.schoolRecoveryUntil = null;
  }

  const leader = getFishSchoolFollowLeader(fish);
  if (!isFishSchoolLeaderAvailable(fish, leader, species, now)) {
    clearFishSchoolFollowState(fish);
    return false;
  }
  if (fish.schoolSource === "schooling") {
    const compatibilityId = getFishSchoolingCompatibilityId(fish);
    const electedLeader = state.fish
      .filter((candidate) => (
        candidate
        && getFishSchoolingCompatibilityId(candidate) === compatibilityId
        && !isFishDead(candidate)
        && candidate.activity === "roam"
        && !candidate.caveState
        && !(candidate.followFishId && Number(candidate.followUntil) > now)
      ))
      .sort((left, right) => getFishSchoolStableRank(left) - getFishSchoolStableRank(right))[0];
    if (!electedLeader || electedLeader.id !== leader.id) {
      clearFishSchoolFollowState(fish);
      return false;
    }
  }

  // Changing a fish's navigation endpoint every render frame restarts its
  // arrival easing and presents as a visible brake/twitch.  Formation intent
  // is sampled at a short fixed cadence; collision and panic remain higher
  // priority and can still replace this target immediately.
  if (Number(fish.schoolNextTargetRefreshAt) > now) {
    return true;
  }

  const anchor = getFishSchoolFollowAnchor(fish, leader, now);
  if (!anchor) {
    clearFishSchoolFollowState(fish);
    return false;
  }

  const rawSlotDistance = Math.hypot(anchor.xNorm - fish.xNorm, anchor.yNorm - fish.yNorm);
  if (rawSlotDistance >= SCHOOL_REJOIN_DISTANCE_NORM) {
    fish.schoolState = "rejoining";
  } else if (fish.schoolState === "rejoining" && rawSlotDistance <= SCHOOL_REJOIN_SETTLE_DISTANCE_NORM) {
    fish.schoolState = "formation";
  } else if (!fish.schoolState || fish.schoolState === "suspended") {
    fish.schoolState = "formation";
  }
  if (fish.schoolState === "rejoining" && species.speedMode === "dynamic") {
    const leaderSpeed = Number(leader.swimSpeed) || normalizeFishSpeed(species, species.speedMin);
    fish.swimSpeed = normalizeFishSpeed(species, leaderSpeed * 1.2);
  }

  const previousTargetX = Number.isFinite(Number(fish.schoolTargetXNorm))
    ? Number(fish.schoolTargetXNorm)
    : (Number.isFinite(Number(fish.targetXNorm)) ? Number(fish.targetXNorm) : anchor.xNorm);
  const previousTargetY = Number.isFinite(Number(fish.schoolTargetYNorm))
    ? Number(fish.schoolTargetYNorm)
    : (Number.isFinite(Number(fish.targetYNorm)) ? Number(fish.targetYNorm) : anchor.yNorm);
  const previousUpdatedAt = Number.isFinite(Number(fish.schoolTargetUpdatedAt))
    ? Number(fish.schoolTargetUpdatedAt)
    : now;
  const elapsedSeconds = clamp((now - previousUpdatedAt) / 1000, 0, 0.1);
  const response = 1 - Math.exp(-SAME_SPECIES_SCHOOL_TARGET_RESPONSE_PER_SEC * elapsedSeconds);
  const desiredStepX = (anchor.xNorm - previousTargetX) * response;
  const desiredStepY = (anchor.yNorm - previousTargetY) * response;
  const nextTargetX = previousTargetX + clamp(
    desiredStepX,
    -SAME_SPECIES_SCHOOL_TARGET_MAX_STEP_X_NORM,
    SAME_SPECIES_SCHOOL_TARGET_MAX_STEP_X_NORM
  );
  const nextTargetY = previousTargetY + clamp(
    desiredStepY,
    -SAME_SPECIES_SCHOOL_TARGET_MAX_STEP_Y_NORM,
    SAME_SPECIES_SCHOOL_TARGET_MAX_STEP_Y_NORM
  );

  fish.schoolTargetXNorm = nextTargetX;
  fish.schoolTargetYNorm = nextTargetY;
  fish.schoolTargetUpdatedAt = now;
  fish.schoolNextTargetRefreshAt = now + SCHOOL_FORMATION_COMMAND_INTERVAL_MS;
  const targetShift = Math.hypot(
    nextTargetX - (Number(fish.targetXNorm) || fish.xNorm || 0.5),
    nextTargetY - (Number(fish.targetYNorm) || fish.yNorm || 0.5)
  );
  const formationError = Math.hypot(
    nextTargetX - (Number(fish.xNorm) || 0.5),
    nextTargetY - (Number(fish.yNorm) || 0.5)
  );
  // A school is a moving formation, not a sequence of exact waypoint snaps.
  // Retain a settled endpoint until the formation has visibly moved far enough
  // to justify another steering correction.
  if (
    targetShift >= SOCIAL_FORMATION_POSITION_DEADZONE_NORM
    || formationError >= SOCIAL_FORMATION_TURN_DEADZONE_NORM
  ) {
    fish.targetXNorm = nextTargetX;
    fish.targetYNorm = nextTargetY;
  }
  fish.targetAt = Math.max(now + 500, fish.followUntil);
  setFishDesiredTankDepth(fish, anchor.targetZ);
  return true;
}

function pickSameSpeciesFollowTarget(fish, species, now = Date.now()) {
  if (
    !fish ||
    !species ||
    isProteusZombieFish(fish) ||
    isFishDead(fish) ||
    species.behavior === "sucker" ||
    fish.activity !== "roam" ||
    fish.caveState ||
    isFishSickOrDying(fish)
  ) {
    return null;
  }
  if (Number.isFinite(Number(fish.followCooldownUntil)) && now < Number(fish.followCooldownUntil)) {
    return null;
  }

  const schoolingStrength = getFishSchoolingStrength(fish, species);
  const socialProfile = typeof getFishSocialProfile === "function" ? getFishSocialProfile(fish) : null;
  // Ambient schooling is reserved for species explicitly authored as a
  // coordinated school/pod.  A generic social, pair, shoal, or solitary fish
  // must never be silently enrolled just because another fish swims nearby.
  if (schoolingStrength <= 0.025 || !socialProfile?.coordinatedSchooling) {
    return null;
  }
  const locomotionProfile = getFishLocomotionProfile(fish || species);
  const followRadiusNorm = SAME_SPECIES_FOLLOW_RADIUS_NORM * (0.82 + schoolingStrength * 0.4);
  const compatibilityId = getFishSchoolingCompatibilityId(fish);

  const localCandidates = state.fish
    .filter((otherFish) => (
      otherFish
      && otherFish.id !== fish.id
      && getFishSchoolingCompatibilityId(otherFish) === compatibilityId
      && !isFishDead(otherFish)
      && otherFish.activity === "roam"
      && !otherFish.caveState
      && !otherFish.entryStartedAt
      && !isFishDiseaseAvoidanceSource(otherFish)
      && !isFishSickOrDying(otherFish)
      && !(otherFish.followFishId && Number(otherFish.followUntil) > now)
      && Math.hypot(otherFish.xNorm - fish.xNorm, otherFish.yNorm - fish.yNorm) <= followRadiusNorm
    ))
    .map((candidate) => ({
      fish: candidate,
      distanceNorm: Math.hypot(candidate.xNorm - fish.xNorm, candidate.yNorm - fish.yNorm),
      followerCount: getFishSchoolActiveFollowers(candidate, now).length,
      rank: getFishSchoolStableRank(candidate)
    }));

  // Do not build a school from a lone pair.  Requiring two other independent
  // neighbors avoids the visual "everyone follows a random fish" effect and
  // leaves ordinary social interaction to the Hang Out action.
  if (localCandidates.length < 2) {
    return null;
  }

  const baseFollowChance = SAME_SPECIES_FOLLOW_BASE_CHANCE
    + Math.max(0, localCandidates.length - 2) * SAME_SPECIES_FOLLOW_NEIGHBOR_BONUS;
  const followChance = clamp(
    baseFollowChance * (0.24 + schoolingStrength * 1.65),
    0,
    Math.min(0.11, SAME_SPECIES_FOLLOW_MAX_CHANCE)
  );
  if (Math.random() > followChance) {
    return null;
  }

  // Elect one stable leader for this compatibility group rather than letting
  // every nearby cluster nominate a different anchor.  The old local-only
  // election was the source of the random-looking follow pairs.
  const independentCompatible = state.fish
    .filter((otherFish) => (
      otherFish
      && getFishSchoolingCompatibilityId(otherFish) === compatibilityId
      && !isFishDead(otherFish)
      && otherFish.activity === "roam"
      && !otherFish.caveState
      && !otherFish.entryStartedAt
      && !isFishDiseaseAvoidanceSource(otherFish)
      && !isFishSickOrDying(otherFish)
      && !(otherFish.followFishId && Number(otherFish.followUntil) > now)
    ))
    .sort((left, right) => getFishSchoolStableRank(left) - getFishSchoolStableRank(right));
  const leader = independentCompatible[0] || null;
  if (leader && Math.hypot(leader.xNorm - fish.xNorm, leader.yNorm - fish.yNorm) > followRadiusNorm) {
    return null;
  }
  if (!leader || leader.id === fish.id || !isFishEligibleSchoolLeader(leader, fish, species, now)) {
    return null;
  }

  if (typeof reinforceFishFriendshipPair === "function") {
    reinforceFishFriendshipPair(fish, leader, 0.55, now, { source: "schooling" });
  }

  const followDurationScale = clamp(locomotionProfile.schoolDurationScale, 0.7, 2.1);
  const followDurationMs = randomBetween(
    SAME_SPECIES_FOLLOW_MIN_MS * followDurationScale,
    SAME_SPECIES_FOLLOW_MAX_MS * followDurationScale
  );
  fish.followOffsetXNorm = null;
  fish.followOffsetYNorm = null;
  fish.followDepthSlot = null;
  fish.followFormationSlot = null;
  fish.schoolNextTargetRefreshAt = 0;
  fish.schoolTargetXNorm = null;
  fish.schoolTargetYNorm = null;
  fish.schoolTargetUpdatedAt = null;
  if (!requestFishSchoolingRelationship(fish, leader, now, { source: "schooling", durationMs: followDurationMs })) {
    return null;
  }
  const anchor = getFishSchoolFollowAnchor(fish, leader, now);
  if (!anchor) {
    clearFishSchoolFollowState(fish);
    return null;
  }

  fish.followOffsetXNorm = anchor.offsetXNorm;
  fish.followOffsetYNorm = anchor.offsetYNorm;
  fish.schoolTargetXNorm = anchor.xNorm;
  fish.schoolTargetYNorm = anchor.yNorm;
  fish.schoolNextTargetRefreshAt = now;

  return {
    leaderId: leader.id,
    xNorm: anchor.xNorm,
    yNorm: anchor.yNorm,
    targetLayer: anchor.targetLayer,
    targetSubLayer: anchor.targetSubLayer,
    lingerMs: fish.followUntil - now
  };
}

function deferFishSchoolFollowForRecovery(fish, until = 0) {
  if (!fish || !Number.isFinite(Number(fish.followUntil)) || Number(fish.followUntil) <= Date.now()) {
    return false;
  }
  fish.schoolState = "suspended";
  fish.schoolRecoveryUntil = Math.max(Number(fish.schoolRecoveryUntil) || 0, Number(until) || 0);
  return true;
}
