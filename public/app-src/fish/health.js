// Source fragment: fish/health.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function isFishDead(fish) {
  return !fish || fish.healthUnits <= 0;
}

function isFishBeingConsumedByPiranhas(fish, now = Date.now()) {
  return Boolean(
    fish
    && isFishDead(fish)
    && hasDefinedFiniteNumber(fish.piranhaConsumptionStartedAt)
    && hasDefinedFiniteNumber(fish.piranhaConsumptionEndsAt)
    && now < Number(fish.piranhaConsumptionEndsAt)
  );
}

function getCompletedPiranhaConsumedFish(now = Date.now()) {
  return state.fish.filter((fish) => (
    fish
    && isFishDead(fish)
    && hasDefinedFiniteNumber(fish.piranhaConsumptionEndsAt)
    && now >= Number(fish.piranhaConsumptionEndsAt)
  ));
}

function finalizePiranhaConsumedFish(fishList, now = Date.now(), options = {}) {
  const consumedFish = (Array.isArray(fishList) ? fishList : [])
    .filter((fish, index, list) => (
      fish
      && state.fish.some((entry) => entry.id === fish.id)
      && list.findIndex((other) => other?.id === fish.id) === index
    ));
  if (!consumedFish.length) {
    return false;
  }

  const overfedPiranhas = [];
  let piranhaMealCoins = 0;
  for (const piranha of getLivingPiranhaFish()) {
    piranha.lastAteAt = now;
    piranhaMealCoins += recordFishMealCredit(piranha, now);
    const intake = applyFishMealWindowFoodIntake(piranha, now, { satiate: false, countBasedOverfeed: true });
    if (intake.damageUnits > 0) {
      overfedPiranhas.push({ fish: piranha, damageUnits: intake.damageUnits, slot: intake.slot });
      if (piranha.healthUnits <= 0) {
        markFishAsDead(piranha, now, `${piranha.name} died after gorging on too many fish.`);
      }
    }
  }

  const consumedIds = new Set(consumedFish.map((fish) => fish.id));
  state.fish = state.fish.filter((fish) => !consumedIds.has(fish.id));
  state.pendingPoops = state.pendingPoops.filter((poop) => !consumedIds.has(poop.fishId));
  releasePelletsTargetingFishIds(consumedIds);

  if (runtime.selectedFishId && consumedIds.has(runtime.selectedFishId)) {
    runtime.selectedFishId = null;
  }

  if (runtime.debugForcedCaveFishId && consumedIds.has(runtime.debugForcedCaveFishId)) {
    clearDebugCaveTestSelection();
  }

  if (!hasExposedDeadTankFish()) {
    state.lastCorpseSicknessAt = null;
    if (getBaseTankDirtiness(now) < CRITICAL_TANK_DIRTINESS) {
      resetLivingFishComfortDamageProgress();
    }
  }

  const consumedMessage = consumedFish.length === 1
    ? `${consumedFish[0].name} was completely devoured by piranhas.`
    : `${consumedFish.length} fish were completely devoured by piranhas.`;
  pushEvent(piranhaMealCoins > 0 ? `${consumedMessage} Piranhas earned ${piranhaMealCoins} ${pluralize("coin", piranhaMealCoins)}.` : consumedMessage, now);

  if (overfedPiranhas.length) {
    const totalDamageUnits = overfedPiranhas.reduce((total, entry) => total + entry.damageUnits, 0);
    const slotLabel = overfedPiranhas[0].slot.label.toLowerCase();
    pushEvent(
      overfedPiranhas.length === 1
        ? `${overfedPiranhas[0].fish.name} gorged itself during the ${slotLabel} meal and lost ${overfedPiranhas[0].damageUnits} half-heart ${pluralize("step", overfedPiranhas[0].damageUnits)}.`
        : `${overfedPiranhas.length} piranhas gorged themselves during the ${slotLabel} meal and lost ${totalDamageUnits} half-heart ${pluralize("step", totalDamageUnits)}.`,
      now
    );
  }

  if (options.immediate) {
    saveState();
    renderUi(now);
  }

  return true;
}

function getLivingTankFish() {
  return state.fish.filter((fish) => !isFishDead(fish));
}

function getExposedDeadTankFish(now = Date.now()) {
  return state.fish.filter((fish) => isFishDead(fish) && !isFishBeingConsumedByPiranhas(fish, now));
}

function hasExposedDeadTankFish(now = Date.now()) {
  return getExposedDeadTankFish(now).length > 0;
}

function getLivingPiranhaFish() {
  return state.fish.filter((fish) => !isFishDead(fish) && isPiranhaSpecies(fish));
}

function getLivingZombieHunters() {
  return state.fish.filter((fish) => !isFishDead(fish) && usesZombieHunterBehavior(fish));
}

function getLivingZombieHunterIds() {
  return new Set(getLivingZombieHunters().map((fish) => fish.id));
}

function hasValidZombieBiteSource(fish, zombieHunterIds = getLivingZombieHunterIds()) {
  if (!fish) {
    return false;
  }

  const attackerId = typeof fish.zombieBiteAttackerId === "string" && fish.zombieBiteAttackerId.trim()
    ? fish.zombieBiteAttackerId.trim()
    : null;
  return Boolean(attackerId && zombieHunterIds.has(attackerId));
}

function hasPiranhaContext() {
  return PIRANHA_BEHAVIOR_ENABLED && getLivingPiranhaFish().length > 0;
}

function isFishSickOrDying(fish) {
  return Boolean(fish && !isFishDead(fish) && fish.healthUnits <= getFishSickHealthUnitsThreshold(fish));
}

function isFishCriticallyLowHealth(fish) {
  return Boolean(
    fish
    && !isFishDead(fish)
    && hasDefinedFiniteNumber(fish.healthUnits)
    && Number(fish.healthUnits) <= LOW_HEALTH_PANIC_HEALTH_UNITS
  );
}

function getFishVisualSize(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!species) {
    return (runtime.fishSizeRange?.min || FISH_CATALOG_WIDTH_MIN) * getFishDisplayScaleForSpecies();
  }

  return getFishDisplayWidth(fish, species, now);
}

function getFishSizeRatio(fish, species = getSpeciesForFish(fish)) {
  const sizeRange = runtime.fishSizeRange || buildFishSizeRange();
  const widthSpecies = getFishDisplaySourceSpecies(fish, species) || species;
  const rangeDisplayScale = getFishDisplayScaleForSpecies(widthSpecies);
  const minSize = (Number(sizeRange.min) || FISH_CATALOG_WIDTH_MIN) * rangeDisplayScale;
  const maxSize = (Number(sizeRange.max) || FISH_CATALOG_WIDTH_MAX) * rangeDisplayScale;
  if (maxSize <= minSize) {
    return 0;
  }

  return clamp((getFishVisualSize(fish, species) - minSize) / (maxSize - minSize), 0, 1);
}

function getFishHealthSizeRatio(species) {
  if (!species) {
    return 0;
  }

  const sizeRange = runtime.fishSizeRange || buildFishSizeRange();
  const minSize = Number(sizeRange.min) || FISH_CATALOG_WIDTH_MIN;
  const maxSize = Number(sizeRange.max) || FISH_CATALOG_WIDTH_MAX;
  if (maxSize <= minSize) {
    return 0;
  }

  const speciesWidth = clamp(Number(species.width) || minSize, minSize, maxSize);
  return clamp((speciesWidth - minSize) / (maxSize - minSize), 0, 1);
}

function getSpeciesMaxHealthUnits(species) {
  if (!species) {
    return MIN_FISH_HEARTS * 2;
  }

  const explicitHeartCount = Number(species.heartCount ?? species.hearts);
  if (Number.isFinite(explicitHeartCount)) {
    return clamp(Math.round(explicitHeartCount), MIN_FISH_HEARTS, MAX_FISH_HEARTS) * 2;
  }

  const sizeHearts = MIN_FISH_HEARTS + Math.round(
    getFishHealthSizeRatio(species) * (FISH_HEALTH_SIZE_BASE_MAX_HEARTS - MIN_FISH_HEARTS)
  );
  const cost = Math.max(1, Math.floor(Number(species.cost) || 1));
  const costBonus = (cost >= PREMIUM_FISH_HEART_COST_THRESHOLD ? PREMIUM_FISH_HEART_BONUS : 0)
    + (cost >= ULTRA_PREMIUM_FISH_HEART_COST_THRESHOLD ? ULTRA_PREMIUM_FISH_HEART_BONUS : 0);
  const hearts = clamp(sizeHearts + costBonus, MIN_FISH_HEARTS, MAX_FISH_HEARTS);
  return hearts * 2;
}

function getFishMaxHealthUnits(fish, species = getSpeciesForFish(fish)) {
  return getSpeciesMaxHealthUnits(species);
}

function getFishHealthRatio(fish, species = getSpeciesForFish(fish)) {
  return clamp((Number(fish?.healthUnits) || 0) / Math.max(1, getFishMaxHealthUnits(fish, species)), 0, 1);
}

function getFishSickHealthUnitsThreshold(fish, species = getSpeciesForFish(fish)) {
  return Math.max(1, Math.ceil(getFishMaxHealthUnits(fish, species) * SICK_FISH_HEALTH_RATIO_THRESHOLD));
}

function scaleLegacyFishHealthUnits(rawUnits, maxHealthUnits) {
  const legacyUnits = clamp(Math.round(Number(rawUnits) || 0), 0, LEGACY_MAX_HEALTH_UNITS);
  if (legacyUnits <= 0) {
    return 0;
  }

  if (legacyUnits >= LEGACY_MAX_HEALTH_UNITS) {
    return maxHealthUnits;
  }

  return clamp(Math.round((legacyUnits / LEGACY_MAX_HEALTH_UNITS) * maxHealthUnits), 1, maxHealthUnits);
}

function rebalanceFishHealthForCurrentModel(fish, species = getSpeciesForFish(fish)) {
  if (!fish || isFishDead(fish)) {
    return fish;
  }

  const maxHealthUnits = getFishMaxHealthUnits(fish, species);
  return {
    ...fish,
    healthUnits: clamp((Math.round(Number(fish.healthUnits) || 0) + 1), 1, maxHealthUnits),
    missedMealsInRow: 0
  };
}

function getFishDirtinessBonus(fish, species = getSpeciesForFish(fish)) {
  const sizeRatio = getFishSizeRatio(fish, species);
  return FISH_DIRTINESS_BONUS_MIN + sizeRatio * (FISH_DIRTINESS_BONUS_MAX - FISH_DIRTINESS_BONUS_MIN);
}

function getDeadFishDirtinessBonus(deadFishList = getExposedDeadTankFish()) {
  const deadFish = Array.isArray(deadFishList) ? deadFishList.filter((fish) => fish && isFishDead(fish)) : [];
  return deadFish.length * DEAD_FISH_DIRTINESS_BONUS;
}

function getTankFishDirtinessMultiplier(fishList = getLivingTankFish(), deadFishList = getExposedDeadTankFish()) {
  const activeFish = Array.isArray(fishList) ? fishList.filter((fish) => fish && !isFishDead(fish)) : [];
  return Math.max(0.65, 1
    + activeFish.reduce((total, fish) => total + getFishDirtinessBonus(fish), 0)
    + getDeadFishDirtinessBonus(deadFishList));
}

function getFilterMaxDirtyDurationMs(filterKey = state?.selectedFilterAsset, fishList = getLivingTankFish()) {
  const filterProfile = getFilterProfile(filterKey);
  const activeFish = Array.isArray(fishList) ? fishList.filter((fish) => fish && !isFishDead(fish)) : [];
  const suckerFishCount = activeFish.filter((fish) => getSpeciesForFish(fish)?.behavior === "sucker").length;
  const suckerCleanDurationBonus = Math.min(
    SUCKER_FISH_CLEAN_DURATION_BONUS_CAP,
    suckerFishCount * SUCKER_FISH_CLEAN_DURATION_BONUS
  );
  return filterProfile.cleanDays * DAY_MS * (1 + suckerCleanDurationBonus) / Math.max(1, getTankFishDirtinessMultiplier(activeFish));
}

function getFishCriticalHealthTickMs(fish, species = getSpeciesForFish(fish)) {
  return CRITICAL_COMFORT_HEALTH_TICK_MS;
}

function resetLivingFishComfortDamageProgress() {
  let changed = false;
  for (const fish of getLivingTankFish()) {
    if ((Number(fish.comfortDamageProgressMs) || 0) > 0) {
      fish.comfortDamageProgressMs = 0;
      changed = true;
    }
  }
  return changed;
}

function rebaseTankDirtiness(now, dirtiness = getBaseTankDirtiness(now)) {
  state.lastCleanedAt = now - clamp(dirtiness, 0, 1) * getFilterMaxDirtyDurationMs(state.selectedFilterAsset, getLivingTankFish());
}

function preserveTankDirtinessThroughChange(now, applyChange) {
  const currentDirtiness = getBaseTankDirtiness(now);
  applyChange();
  rebaseTankDirtiness(now, currentDirtiness);
}

function getPoopFloorYNormAtXNorm(xNorm) {
  return clamp((getTankFloorSurfaceYAtX(clamp(xNorm, 0.08, 0.92) * TANK_WIDTH) + 4) / TANK_HEIGHT, 0.8, 0.96);
}

function getPoopTankLayer(poop) {
  return Number.isFinite(Number(poop?.tankLayer))
    ? clampTankLayer(poop.tankLayer)
    : 1;
}

function getPoopLayerTargetAnchorY(poop, sprite = null, width = POOP_DRAW_WIDTH_PX) {
  const layer = getPoopTankLayer(poop);
  const height = sprite?.width
    ? width * (sprite.height / Math.max(1, sprite.width))
    : width * 0.5;
  return clamp(
    getTankLayerBottomBoundaryY(layer) - 4 - height * 0.12,
    WATER_SURFACE_Y + 24,
    TANK_HEIGHT - GLASS_MARGIN_BOTTOM - 6
  );
}

function getPoopLayerTargetYNorm(poop, sprite = null, width = POOP_DRAW_WIDTH_PX) {
  return getPoopLayerTargetAnchorY(poop, sprite, width) / TANK_HEIGHT;
}

function createPoopRecord({ fishId = "", createdAt = Date.now(), xNorm = 0.5, startYNorm = 0.54, tankLayer = 1 } = {}) {
  const clampedXNorm = clamp(xNorm, 0.08, 0.92);
  const clampedLayer = clampTankLayer(tankLayer);
  const targetYNorm = getPoopLayerTargetYNorm({ tankLayer: clampedLayer, xNorm: clampedXNorm });
  return {
    id: createId("poop"),
    fishId,
    createdAt,
    xNorm: clampedXNorm,
    tankLayer: clampedLayer,
    yNorm: targetYNorm,
    startYNorm: Math.min(clamp(startYNorm, 0.14, 0.82), Math.max(0.14, targetYNorm - 0.012)),
    asset: resolveAppUrl(POOP_ASSET_PATH)
  };
}

function getNearestDeadFish(fish) {
  const deadFish = getExposedDeadTankFish();
  if (!deadFish.length) {
    return null;
  }

  let nearest = null;
  for (const corpse of deadFish) {
    if (!corpse || corpse.id === fish.id) {
      continue;
    }

    const distanceNorm = Math.hypot((corpse.xNorm || 0) - fish.xNorm, (corpse.yNorm || 0) - fish.yNorm);
    if (!nearest || distanceNorm < nearest.distanceNorm) {
      nearest = { fish: corpse, distanceNorm };
    }
  }

  return nearest;
}

function pickDeadFishVigilTarget(fish, species, now) {
  const nearest = getNearestDeadFish(fish);
  if (
    !nearest
    || nearest.distanceNorm > CORPSE_VIGIL_TRIGGER_RANGE_NORM
    || isUndeadFish(fish)
    || isPiranhaSpecies(fish)
    || hasZombieBiteInfection(fish)
  ) {
    return null;
  }

  const orbitSeed = clamp(Number(fish.phase) || 0.5, 0, 1);
  const ringRadius = 0.05 + orbitSeed * 0.06;
  const orbitAngle = orbitSeed * Math.PI * 2;
  return {
    xNorm: clamp(nearest.fish.xNorm + Math.cos(orbitAngle) * ringRadius, 0.08, 0.92),
    yNorm: clamp(
      nearest.fish.yNorm + 0.02 + Math.abs(Math.sin(orbitAngle)) * Math.min(0.06, ringRadius * 0.9),
      0.14,
      0.8
    ),
    lingerMs: 1200 + Math.random() * 1800,
    targetLayer: clampTankLayer(Math.min(2, Math.max(1, getFishTankLayer(fish))))
  };
}

function clearFishSchoolFollowState(fish) {
  if (!fish) {
    return;
  }

  fish.followFishId = null;
  fish.followUntil = null;
  fish.followOffsetXNorm = null;
  fish.followOffsetYNorm = null;
}

function pruneFishGravelPebbleRuntimeState(now = Date.now()) {
  const activeFishIds = new Set((state?.fish || []).map((fish) => fish.id));
  for (const [fishId] of runtime.fishGravelPebbleActions) {
    if (!activeFishIds.has(fishId)) {
      runtime.fishGravelPebbleActions.delete(fishId);
    }
  }
  for (const [fishId, prompt] of runtime.forcedGravelDigUntilByFishId) {
    const until = typeof prompt === "object" && prompt
      ? Number(prompt.until)
      : Number(prompt);
    if (!activeFishIds.has(fishId) || !Number.isFinite(until) || until < now) {
      runtime.forcedGravelDigUntilByFishId.delete(fishId);
    }
  }
}

function markFishAsDead(fish, now = Date.now(), reasonText = null) {
  if (!fish) {
    return false;
  }

  const alreadyDead = fish.activity === "dead" || isFishDead(fish);
  if (
    !alreadyDead
    && isFishProtectedFromPredators(fish, now)
    && typeof reasonText === "string"
    && /zombie bite|piranhas?/i.test(reasonText)
  ) {
    scrubProtectedFishPredatorState(fish, now);
    return false;
  }

  const shouldRebase = !alreadyDead && state.fish.some((entry) => entry.id === fish.id);
  const previousDirtiness = shouldRebase ? getBaseTankDirtiness(now) : null;
  fish.deadAt = alreadyDead && Number.isFinite(fish.deadAt) ? fish.deadAt : now;
  fish.decayStage = "fresh";
  fish.zombieBiteStartedAt = null;
  fish.zombieBiteLastBloodAt = null;
  fish.zombieBiteAttackerId = null;
  fish.zombieReviveAt = null;
  fish.zombieReviveSourceId = null;
  fish.piranhaAttackStartedAt = null;
  fish.piranhaLastDamageAt = null;
  fish.piranhaConsumptionStartedAt = null;
  fish.piranhaConsumptionEndsAt = null;
  fish.piranhaLastBloodAt = null;
  fish.healthUnits = 0;
  fish.fedStreak = 0;
  fish.comfortDamageProgressMs = 0;
  clearFishSchoolFollowState(fish);

  const pelletId = fish.feedingPelletId;
  const species = getSpeciesForFish(fish);
  if (!alreadyDead) {
    recordFishMemorial(fish, getCurrentTank(), reasonText || `${fish.name} died.`, now);
    clearFishReferencesAfterDeath(fish.id);
  }
  if (runtime.debugForcedCaveFishId === fish.id) {
    clearDebugCaveTestSelection();
  }
  fish.activity = "dead";
  fish.feedingPelletId = null;
  clearFishCaveBehavior(fish);
  setFishTankLayers(fish, species?.behavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish), species?.behavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish));
  fish.hangoutDecorId = null;
  fish.residenceDecorId = null;
  fish.entryStartedAt = null;
  fish.entryDurationMs = 0;
  fish.entryFromYNorm = null;
  fish.entrySplashTriggered = false;
  fish.turnStartedAt = null;
  fish.turnDurationMs = 0;
  fish.displayDirection = Number(fish.direction) < 0 ? -1 : 1;
  fish.displayAngle = fish.displayDirection < 0 ? Math.PI : 0;
  fish.turnFromDirection = fish.displayDirection;
  fish.turnToDirection = fish.displayDirection;
  fish.turnFromAngle = fish.displayAngle;
  fish.turnToAngle = fish.displayAngle;
  fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
  state.pendingPoops = state.pendingPoops.filter((poop) => poop.fishId !== fish.id);
  state.floatingPellets = state.floatingPellets.filter((pellet) => pellet.id !== pelletId);
  for (const pellet of state.floatingPellets) {
    if (pellet.targetFishId === fish.id) {
      pellet.targetFishId = "";
    }
  }

  if (!alreadyDead && reasonText) {
    state.lifetimeDeaths = Math.max(0, (Number(state.lifetimeDeaths) || 0) + 1);
    pushEvent(reasonText, now, getCurrentTank(), { type: "death", fishId: fish.id, score: -1 });
  }

  if (shouldRebase) {
    rebaseTankDirtiness(now, previousDirtiness);
  }

  saveState();
  return !alreadyDead;
}

function applyFishDamage(fish, amount = 1, now = Date.now(), injuryText = null, deathText = null) {
  if (!fish || isFishDead(fish)) {
    return { changed: false, dead: true };
  }

  const damageUnits = Math.max(1, Math.round(Number(amount) || 1));
  fish.healthUnits = Math.max(0, fish.healthUnits - damageUnits);
  fish.fedStreak = 0;

  if (fish.healthUnits <= 0) {
    markFishAsDead(fish, now, deathText || `${fish.name} died.`);
    return { changed: true, dead: true };
  }

  if (injuryText) {
    pushEvent(injuryText, now);
  }
  return { changed: true, dead: false };
}
