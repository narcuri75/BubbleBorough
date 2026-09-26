// Source fragment: fish/lifecycle-and-breeding.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getResaleValue(cost) {
  const price = Math.max(0, Math.floor(Number(cost) || 0));

  if (price <= 0) {
    return 0;
  }

  if (price === 1) {
    return 1;
  }

  return Math.max(1, Math.floor(price * 0.5));
}

function getFishOriginalPurchasePrice(fish, species = getSpeciesForFish(fish)) {
  if (!fish) return 0;
  if (Number.isFinite(Number(fish.purchasePrice))) {
    return Math.max(0, Math.floor(Number(fish.purchasePrice)));
  }
  return Math.max(0, Math.floor(Number(species?.cost) || 0));
}

function getFishRehomeValue(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) return 0;
  const species = getSpeciesForFish(fish);
  const originalPrice = getFishOriginalPurchasePrice(fish, species);
  if (originalPrice <= 0) return 0;
  return getResaleValue(originalPrice);
}

function recordCreatureRemovalHistory(fish, reason = "Unknown", now = Date.now(), options = {}) {
  if (!state || !fish) return null;
  const fishId = String(fish.id || "").trim();
  if (!fishId) return null;
  state.removalHistory = sanitizeCreatureRemovalHistory(state.removalHistory);
  const existing = state.removalHistory.find((entry) => entry.fishId === fishId);
  if (existing) return existing;
  const species = getSpeciesForFish(fish);
  const speciesName = String(
    typeof getFishDisplaySpeciesName === "function"
      ? getFishDisplaySpeciesName(fish, species)
      : (species?.name || fish.speciesId || "Fish")
  ).trim().slice(0, 100) || "Fish";
  const ageDays = Math.max(0, Math.floor(getFishAgeMs(fish, now) / DAY_MS));
  const normalizedReason = String(reason || fish.deathCause || "Unknown").trim().slice(0, 80) || "Unknown";
  const name = String(fish.name || "Unnamed").trim().slice(0, 80) || "Unnamed";
  const removedAt = Number.isFinite(Number(now)) ? Math.max(0, Number(now)) : Date.now();
  const record = {
    id: `removed-${fishId}-${removedAt}`,
    fishId,
    name,
    speciesId: String(fish.speciesId || "").trim().slice(0, 100),
    speciesName,
    ageDays,
    reason: normalizedReason,
    removedAt,
    source: String(options.source || "removal").trim().slice(0, 40) || "removal",
    rehomeValue: Math.max(0, Math.floor(Number(options.rehomeValue) || 0)),
    summary: `${name} - ${speciesName} - ${ageDays} days - ${normalizedReason}`
  };
  state.removalHistory.unshift(record);
  state.removalHistory = sanitizeCreatureRemovalHistory(state.removalHistory);
  return record;
}

function createFishRecord(speciesId, options = {}) {
  const species = runtime.fishMap.get(speciesId);
  if (!species) {
    return null;
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const fishId = String(options.id || createId("fish"));
  const xNorm = clamp(Number.isFinite(Number(options.xNorm)) ? Number(options.xNorm) : randomSwimX(), 0.08, 0.92);
  const yNorm = clamp(
    Number.isFinite(Number(options.yNorm))
      ? Number(options.yNorm)
      : (["shrimp", "snail"].includes(species.behavior) ? randomBetween(species.behavior === "snail" ? 0.77 : 0.68, 0.79) : randomSwimY()),
    0.14,
    0.8
  );
  const targetXNorm = clamp(Number.isFinite(Number(options.targetXNorm)) ? Number(options.targetXNorm) : randomSwimX(), 0.08, 0.92);
  const targetYNorm = clamp(
    Number.isFinite(Number(options.targetYNorm))
      ? Number(options.targetYNorm)
      : (["shrimp", "snail"].includes(species.behavior) ? randomBetween(species.behavior === "snail" ? 0.77 : 0.7, 0.8) : randomSwimY()),
    0.14,
    0.8
  );
  const initialPosition = constrainNormalizedPointToTankShell(xNorm, yNorm, { variant: "inner" });
  const initialTarget = constrainNormalizedPointToTankShell(targetXNorm, targetYNorm, { variant: "inner" });
  const direction = Number.isFinite(Number(options.direction))
    ? (Number(options.direction) < 0 ? -1 : 1)
    : (Math.random() > 0.5 ? 1 : -1);
  const tankLayer = species.behavior === "sucker"
    ? normalizeSuckerFishGlassLayer(
      Number.isFinite(Number(options.tankLayer))
        ? Number(options.tankLayer)
        : SUCKER_FISH_BACK_GLASS_LAYER
    )
    : clampTankLayer(
        Number.isFinite(Number(options.tankLayer))
          ? Number(options.tankLayer)
          : (1 + Math.floor(Math.random() * TANK_DEPTH_LAYERS))
      );
  const desiredTankLayer = species.behavior === "sucker"
    ? normalizeSuckerFishGlassLayer(
      Number.isFinite(Number(options.desiredTankLayer))
        ? Number(options.desiredTankLayer)
        : tankLayer
    )
    : clampTankLayer(
        Number.isFinite(Number(options.desiredTankLayer))
          ? Number(options.desiredTankLayer)
          : DEFAULT_TANK_LAYER
      );
  const tankSubLayer = clampTankSubLayer(
    Number.isFinite(Number(options.tankSubLayer))
      ? Number(options.tankSubLayer)
      : (species.behavior === "sucker" ? DEFAULT_TANK_SUBLAYER : 1 + Math.floor(Math.random() * TANK_DEPTH_SUBLAYERS))
  );
  const desiredTankSubLayer = clampTankSubLayer(
    Number.isFinite(Number(options.desiredTankSubLayer))
      ? Number(options.desiredTankSubLayer)
      : tankSubLayer
  );
  const scaleSpeciesId = speciesId;
  const scale = clamp(
    Number.isFinite(Number(options.scale)) ? Number(options.scale) : getFishScaleDefault(scaleSpeciesId),
    FISH_SCALE_MIN,
    FISH_SCALE_MAX
  );
  const takenNames = [
    ...getAllTankFish(state),
    ...(state?.storedFish || [])
  ]
    .map((fish) => fish?.name)
    .filter((name) => typeof name === "string" && name.trim());
  const growthStartedAt = Number.isFinite(Number(options.growthStartedAt))
    ? Number(options.growthStartedAt)
    : (options.juvenile ? now : null);
  const growthEndsAt = Number.isFinite(Number(options.growthEndsAt))
    ? Number(options.growthEndsAt)
    : (options.juvenile ? now + BABY_FISH_GROWTH_DURATION_MS : null);
  const appearanceVariant = normalizeFishAppearanceVariantIndex(options.appearanceVariant, species, {
    id: fishId,
    name: options.name,
    speciesId
  });
  const behaviorSpeciesId = sanitizeFishBehaviorSpeciesId(
    options.behaviorSpeciesId || (species.customAsset ? (species.behaviorSpeciesId || species.behaviorProfileId) : ""),
    speciesId
  );
  const lifespanMultiplier = clamp(Number(options.lifespanMultiplier) || getStableFishLifespanMultiplier(fishId), 0.9, 1.1);
  const lifespanDays = getFishFoundationLifespanDays(species);
  const safeAdultAgeDays = clamp(Math.round(lifespanDays * 0.2), 2, Math.max(2, Math.floor(lifespanDays * 0.3)));
  const birthAt = Number.isFinite(Number(options.birthAt))
    ? Math.min(now, Number(options.birthAt))
    : (options.juvenile ? now : now - safeAdultAgeDays * DAY_MS);
  const parentIds = Array.isArray(options.parentIds) ? options.parentIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 2) : [];
  const generation = Number.isFinite(Number(options.generation))
    ? Math.max(0, Math.min(999, Math.floor(Number(options.generation))))
    : (parentIds.length ? 1 : 0);
  const spawnUsed = options.spawnUsed === true;
  const personalityPick = pickFishPersonality(runtime.fishMap.get(behaviorSpeciesId) || species);
  const fish = {
    id: fishId,
    speciesId,
    name: typeof options.name === "string" && options.name.trim()
      ? options.name.trim()
      : buildFishName(speciesId, takenNames),
    acquiredAt: now,
    purchasePrice: Math.max(0, Math.floor(Number.isFinite(Number(options.purchasePrice)) ? Number(options.purchasePrice) : (Number(species.cost) || 0))),
    careXp: Math.max(0, Math.floor(Number(options.careXp) || 0)),
    careLevel: clamp(Math.floor(Number(options.careLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX),
    variantUnlockCareLevel: clamp(Math.floor(Number(options.variantUnlockCareLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX),
    lastCareXpDayKey: typeof options.lastCareXpDayKey === "string" ? options.lastCareXpDayKey : "",
    birthAt,
    lifespanMultiplier,
    lifeStage: options.juvenile ? "juvenile" : "adult",
    elderlyNotifiedAt: 0,
    breedingAvailable: !spawnUsed && species.canBreed !== false && options.breedingAvailable !== false,
    spawnUsed,
    breedingReadyUntil: Number.isFinite(Number(options.breedingReadyUntil)) ? Math.max(0, Number(options.breedingReadyUntil)) : 0,
    spawningFoodUntil: Number.isFinite(Number(options.spawningFoodUntil)) ? Math.max(0, Number(options.spawningFoodUntil)) : 0,
    generation,
    visualVariant: appearanceVariant,
    storageState: options.storageState === "stored" ? "stored" : "tank",
    condition: sanitizeFishFoundationCondition(options.condition),
    cleanupAnimal: species.cleanupAnimal === true,
    capacityCost: clamp(Number(species.capacityCost) || 1, 0.1, 8),
    tankAddedAt: Number.isFinite(Number(options.tankAddedAt)) ? Number(options.tankAddedAt) : now,
    lifeState: "alive",
    deadAt: null,
    deathCause: "",
    decayStage: null,
    piranhaConsumptionStartedAt: null,
    piranhaConsumptionEndsAt: null,
    piranhaLastBloodAt: null,
    piranhaAttackStartedAt: null,
    piranhaLastDamageAt: null,
    sharkLastAttackAt: Number.isFinite(Number(options.sharkLastAttackAt)) ? Number(options.sharkLastAttackAt) : 0,
    breedCooldownUntil: Number.isFinite(Number(options.breedCooldownUntil)) ? Number(options.breedCooldownUntil) : 0,
    healthUnits: clamp(
      Number.isFinite(Number(options.healthUnits)) ? Number(options.healthUnits) : getSpeciesMaxHealthUnits(species),
      0,
      getSpeciesMaxHealthUnits(species)
    ),
    injuryDisplaySide: options.injuryDisplaySide === "left" || options.injuryDisplaySide === "right"
      ? options.injuryDisplaySide
      : null,
    fedStreak: 0,
    missedMealsInRow: 0,
    lastAteAt: 0,
    zombieAggressionTargetId: "",
    zombieAggressionUntil: 0,
    zombieAggressionNextAt: isProteusZombieFish(species)
      ? now + randomBetween(PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MIN_MS, PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MAX_MS)
      : 0,
    zombieAggressionNextBiteAt: 0,
    zombieRegenerateAt: 0,
    zombieLastRegeneratedAt: 0,
    satiatedUntil: 0,
    personality: normalizeBehaviorPersonality(options.personality) || personalityPick.personality,
    personalityRarity: normalizeBehaviorPersonality(options.personality)
      ? sanitizePersonalityRarity(options.personalityRarity)
      : personalityPick.rarity,
    relationships: sanitizeFishRelationships(options.relationships),
    feedingMemory: sanitizeFeedingMemory(options.feedingMemory, now),
    favoriteSpot: sanitizeFavoriteSpot(options.favoriteSpot),
    residenceDecorId: typeof options.residenceDecorId === "string" && options.residenceDecorId ? options.residenceDecorId : null,
    parentNames: Array.isArray(options.parentNames) ? options.parentNames.map((name) => String(name).slice(0, 40)).slice(0, 2) : [],
    parentIds,
    celebratedAgeMilestones: [],
    visitedNeighborhoodIds: getCurrentTank()?.id ? [getCurrentTank().id] : [],
    needs: sanitizeFishNeeds(options.needs, null, now),
    needsUpdatedAt: now,
    lastNeedEventAtByType: sanitizeFishNeedEventMap(options.lastNeedEventAtByType),
    nextWasteAt: Number.isFinite(Number(options.nextWasteAt)) ? Math.max(0, Number(options.nextWasteAt)) : 0,
    disease: sanitizeBehaviorDiseaseSnapshot(options.disease, now),
    behaviorSignals: sanitizeBehaviorSignals(options.behaviorSignals, now),
    behaviorIntent: sanitizeBehaviorIntent(options.behaviorIntent, now),
    foodRefusalUntil: 0,
    behaviorNextThinkAt: 0,
    relationshipNextCheckAt: 0,
    pairBondPartnerId: typeof options.pairBondPartnerId === "string" ? options.pairBondPartnerId : "",
    pairBondPartnerName: typeof options.pairBondPartnerName === "string" ? options.pairBondPartnerName.slice(0, 40) : "",
    pairBondedAt: Number.isFinite(Number(options.pairBondedAt)) ? Math.max(0, Number(options.pairBondedAt)) : 0,
    pairBondLostAt: Number.isFinite(Number(options.pairBondLostAt)) ? Math.max(0, Number(options.pairBondLostAt)) : 0,
    pairBondMourningUntil: Number.isFinite(Number(options.pairBondMourningUntil)) ? Math.max(0, Number(options.pairBondMourningUntil)) : 0,
    veryLowComfortStartedAt: 0,
    veryLowComfortEventDayKey: "",
    diseaseState: DISEASE_STATE_NONE,
    diseaseType: "",
    diseaseInfectedAt: 0,
    diseaseProgressMs: 0,
    diseaseLastProgressAt: 0,
    diseaseExposureLevel: 0,
    diseaseRecoveryProgressMs: 0,
    diseaseTreatedUntil: 0,
    diseaseLastDamageAt: 0,
    diseaseSource: "",
    diseaseRequiresTreatment: false,
    temporaryImmunityUntil: 0,
    nextDiseaseCheckAt: now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS),
    nextDiseaseSpreadCheckAt: now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS),
    nextSymptomCheckAt: now + randomDelay(DISEASE_SYMPTOM_CHECK_MIN_MS, DISEASE_SYMPTOM_CHECK_MAX_MS),
    nextGreenBubbleAt: 0,
    pufferInflatedAt: 0,
    pufferInflatedUntil: 0,
    pufferWobbleUntil: 0,
    pufferRiseUntil: 0,
    pufferCooldownUntil: 0,
    pufferGlassStressUntil: 0,
    pufferInflatedSwimSpeed: 0,
    pufferDriftPhase: Math.random() * Math.PI * 2,
    lastIllnessRiskDayKey: "",
    lastIllnessSignalAtByType: {},
    xNorm: initialPosition.xNorm,
    yNorm: initialPosition.yNorm,
    targetXNorm: initialTarget.xNorm,
    targetYNorm: initialTarget.yNorm,
    targetAt: Number.isFinite(Number(options.targetAt))
      ? Number(options.targetAt)
      : now + species.targetMinMs + Math.random() * Math.max(200, species.targetMaxMs - species.targetMinMs),
    direction,
    swimSpeed: normalizeFishSpeed(species, Number(options.swimSpeed)),
    phase: Math.random(),
    motionLevel: 0.2,
    wiggleClock: Math.random() * Math.PI * 2,
    appearanceVariant,
    appearanceVariantKey: typeof options.appearanceVariantKey === "string" ? options.appearanceVariantKey : null,
    appearanceAssetPath: typeof options.appearanceAssetPath === "string" ? options.appearanceAssetPath : null,
    scale,
    behaviorSpeciesId,
    turnAnimationPreference: ["simple", "complex"].includes(String(options.turnAnimationPreference || "").trim().toLowerCase())
      ? String(options.turnAnimationPreference).trim().toLowerCase()
      : "",
    fishColor: normalizeDecorColorSetting(options.fishColor ?? options.colorSetting ?? ""),
    fishColorize: normalizeDecorColorizeSetting(options.fishColorize ?? false),
    hueShift: sanitizeFishHueShift(options.hueShift),
    saturation: sanitizeFishSaturation(options.saturation),
    brightness: sanitizeFishBrightness(options.brightness),
    growthStartedAt,
    growthEndsAt,
    activity: "roam",
    feedingPelletId: null,
    comfortDamageProgressMs: 0,
    lastMealSlotKey: "",
    mealSlotFoodCount: 0,
    tankLayer,
    desiredTankLayer,
    tankSubLayer,
    desiredTankSubLayer,
    drawLayer: tankLayerToLegacy(tankLayer),
    desiredDrawLayer: tankLayerToLegacy(desiredTankLayer),
    hangoutDecorId: null,
    hangoutZoneType: null,
    nextDetritusSnackAt: Number.isFinite(Number(species.cleanupMinMs)) ? now + Number(species.cleanupMinMs) : 0,
    displayDirection: direction,
    displayAngle: direction < 0 ? Math.PI : 0,
    swimTilt: 0,
    turnStartedAt: null,
    turnDurationMs: 0,
    turnFinalFrameRenderedAt: 0,
    turnFromDirection: direction,
    turnToDirection: direction,
    turnFromAngle: direction < 0 ? Math.PI : 0,
    turnToAngle: direction < 0 ? Math.PI : 0,
    turnSpinDirection: direction < 0 ? 1 : -1,
    caveState: null,
    caveDecorId: null,
    cavePortalId: null,
    caveTriggerId: null,
    caveSeatId: null,
    caveFrontLayer: null,
    caveBackLayer: null,
    caveReturnSubLayer: null,
    caveApproachXNorm: null,
    caveApproachYNorm: null,
    caveEntryXNorm: null,
    caveEntryYNorm: null,
    caveInsideXNorm: null,
    caveInsideYNorm: null,
    caveInsideUntil: null,
    caveTriggerCooldownUntil: null,
    cavePathIndex: null,
    caveIdleTargetXNorm: null,
    caveIdleTargetYNorm: null,
    caveIdleTargetAt: null,
    entryStartedAt: Number.isFinite(Number(options.entryStartedAt)) ? Number(options.entryStartedAt) : null,
    entryDurationMs: Number.isFinite(Number(options.entryDurationMs)) ? Number(options.entryDurationMs) : 0,
    entryFromYNorm: Number.isFinite(Number(options.entryFromYNorm)) ? clamp(Number(options.entryFromYNorm), 0.02, 0.18) : null,
    entrySplashTriggered: false
  };
  setFishTankLayers(fish, tankLayer, desiredTankLayer);
  setFishTankSublayers(fish, tankSubLayer, desiredTankSubLayer);
  const layerPosition = clampFishPlacement(fish.xNorm, fish.yNorm, species, {
    fish,
    layer: tankLayer
  });
  const layerTarget = clampFishPlacement(fish.targetXNorm, fish.targetYNorm, species, {
    fish,
    layer: desiredTankLayer
  });
  fish.xNorm = layerPosition.xNorm;
  fish.yNorm = layerPosition.yNorm;
  fish.targetXNorm = layerTarget.xNorm;
  fish.targetYNorm = layerTarget.yNorm;
  return fish;
}

function getFishStorageSimulationNow(fish, now = Date.now()) {
  if (fish?.storageState === "stored" && Number.isFinite(Number(fish.storedAt))) {
    return Math.min(now, Number(fish.storedAt));
  }
  return now;
}

function clearFishTemporaryBreedingActivation(fish) {
  if (!fish) return false;
  let changed = false;
  for (const key of ["breedingReadyUntil", "spawningFoodUntil", "spawnFoodUntil", "friskyUntil"]) {
    if ((Number(fish[key]) || 0) !== 0) {
      fish[key] = 0;
      changed = true;
    }
  }
  return changed;
}

function prepareFishForStorageState(fish, now = Date.now(), options = {}) {
  if (!fish) return null;
  fish.storageState = "stored";
  fish.storageFrozen = true;
  fish.storageMoodTone = typeof options.moodTone === "string" ? options.moodTone : String(fish.storageMoodTone || "");
  fish.storedAt = Number.isFinite(Number(options.storedAt)) ? Number(options.storedAt) : now;
  fish.frozenMealSlotKey = typeof options.mealSlotKey === "string"
    ? options.mealSlotKey
    : (typeof getCurrentMealSlot === "function" ? (getCurrentMealSlot(now)?.key || "") : "");
  fish.frozenLastSimulatedAt = now;
  fish.needsUpdatedAt = now;
  if ((Number(fish.diseaseLastProgressAt) || 0) > 0) fish.diseaseLastProgressAt = now;
  if ((Number(fish.injuryRecoveryProgressMs) || 0) > 0) fish.injuryRecoveryLastAt = now;
  if ((Number(fish.osmoticStressProgressMs) || 0) > 0) fish.osmoticStressLastProgressAt = now;
  if ((Number(fish.osmoticRecoveryProgressMs) || 0) > 0) fish.osmoticRecoveryLastAt = now;
  clearFishTemporaryBreedingActivation(fish);
  return fish;
}

function shiftFishStoragePausedTimestamp(fish, key, pauseMs) {
  if (!fish || pauseMs <= 0 || !Number.isFinite(Number(fish[key])) || Number(fish[key]) <= 0) return false;
  fish[key] = Number(fish[key]) + pauseMs;
  return true;
}

function resumeFishFromStorageState(fish, now = Date.now()) {
  if (!fish) return 0;
  const storedAt = Number.isFinite(Number(fish.storedAt)) ? Number(fish.storedAt) : now;
  const pauseMs = Math.max(0, now - storedAt);
  for (const key of [
    "birthAt", "tankAddedAt", "growthStartedAt", "growthEndsAt", "lastAteAt", "satiatedUntil",
    "breedCooldownUntil", "diseaseInfectedAt", "diseaseTreatedUntil", "temporaryImmunityUntil",
    "nextDiseaseCheckAt", "nextDiseaseSpreadCheckAt", "nextSymptomCheckAt", "nextGreenBubbleAt",
    "foodRefusalUntil", "nextWasteAt", "nextDetritusSnackAt", "lastNeighborhoodMoveAt",
    "pairBondMourningUntil", "calmedUntil", "waterStressBoostUntil"
  ]) {
    shiftFishStoragePausedTimestamp(fish, key, pauseMs);
  }
  fish.needsUpdatedAt = now;
  if ((Number(fish.diseaseLastProgressAt) || 0) > 0) fish.diseaseLastProgressAt = now;
  if ((Number(fish.injuryRecoveryProgressMs) || 0) > 0) fish.injuryRecoveryLastAt = now;
  if ((Number(fish.osmoticStressProgressMs) || 0) > 0) fish.osmoticStressLastProgressAt = now;
  if ((Number(fish.osmoticRecoveryProgressMs) || 0) > 0) fish.osmoticRecoveryLastAt = now;
  fish.lastCoarseSimulatedAt = now;
  fish.storageState = "tank";
  fish.storageFrozen = false;
  fish.storedAt = null;
  fish.frozenMealSlotKey = "";
  fish.frozenLastSimulatedAt = now;
  clearFishTemporaryBreedingActivation(fish);
  return pauseMs;
}

function addFishDirectlyToStorage(fish, now = Date.now(), options = {}) {
  if (!fish) return null;
  state.storedFish ||= [];
  if (state.storedFish.some((entry) => entry?.id === fish.id)) return fish;
  prepareFishForStorageState(fish, now, options);
  state.storedFish.push(fish);
  return fish;
}

function addFishToTank(fish, now = Date.now(), options = {}) {
  if (!fish) {
    return null;
  }

  const targetTank = options.tank || getCurrentTank();
  if (!targetTank) return null;
  const onFull = options.onFull === "reject" ? "reject" : "storage";
  if (!canTankAcceptFish(fish, targetTank)) {
    if (onFull === "reject") return null;
    addFishDirectlyToStorage(fish, now, { moodTone: options.storageMoodTone || "good" });
    syncTankPopulationUsageField(targetTank);
    return fish;
  }

  resetLivingFishPredatorState(fish, now);
  fish.storageState = "tank";
  fish.storageFrozen = false;
  fish.storedAt = null;
  fish.frozenMealSlotKey = "";
  fish.frozenLastSimulatedAt = now;

  withActiveTank(targetTank.id, () => {
    preserveTankDirtinessThroughChange(now, () => {
      targetTank.fish.push(fish);
    });
  });
  syncTankPopulationUsageField(targetTank);
  return fish;
}

function processCurrentTankFishAging(now = Date.now()) {
  if (!Array.isArray(state?.fish) || (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return false;
  let changed = false;
  for (const fish of [...state.fish]) {
    if (!fish || isFishDead(fish)) continue;
    const stage = getFishLifeStage(fish, now);
    if (fish.lifeStage !== stage) {
      fish.lifeStage = stage;
      changed = true;
    }
    if (stage === "elderly" && !(Number(fish.elderlyNotifiedAt) > 0)) {
      fish.elderlyNotifiedAt = now;
      pushEvent(`${fish.name} has become elderly.`, now, getCurrentTank(), { type: "aging", fishId: fish.id, score: 0, recapEligible: false });
      changed = true;
    }
    if (getFishAgeMs(fish, now) >= getFishLifespanMs(fish)) {
      fish.lifeStage = "elderly";
      const died = markFishAsDead(fish, now, `${fish.name} died of old age.`, { force: true, cause: "Old Age" });
      changed = died || changed;
    } else if (typeof syncFishPrimaryCondition === "function") {
      changed = syncFishPrimaryCondition(fish, now, { notify: false }) || changed;
    }
  }
  return changed;
}

function getBreedingTankContext(tank = null) {
  if (tank) return tank;
  return typeof getCurrentTank === "function" ? getCurrentTank() : null;
}

function hasFishActiveSpawningFood(fish, now = Date.now()) {
  if (!fish) return false;
  return Math.max(Number(fish.breedingReadyUntil) || 0, Number(fish.spawningFoodUntil) || 0) > now;
}

function activateFishBreedingFromSpawningFood(fish, now = Date.now()) {
  if (!fish || !isFishBreedingEligible(fish, now, getBreedingTankContext(), { requireReady: false, requireCapacity: false })) return false;
  const until = now + BREEDING_FOOD_BOOST_MS;
  fish.breedingReadyUntil = Math.max(Number(fish.breedingReadyUntil) || 0, until);
  fish.spawningFoodUntil = Math.max(Number(fish.spawningFoodUntil) || 0, until);
  fish.breedingAvailable = fish.spawnUsed !== true;
  return true;
}

function getPendingBreedingReservedCapacity(tank = null) {
  tank = getBreedingTankContext(tank);
  return Math.round(((Array.isArray(tank?.pendingBreedingEvents) ? tank.pendingBreedingEvents : [])
    .filter((event) => event?.status === "pending")
    .reduce((total, event) => total + clamp(Number(event.reservedCapacity) || 0, 0, 8), 0)) * 100) / 100;
}

function getBreedingOffspringCapacityCost(speciesId) {
  const species = runtime.fishMap.get(speciesId);
  return clamp(Number(species?.capacityCost) || 1, 0.1, 8);
}

function canTankReserveBreedingOffspring(speciesId, tank = null) {
  tank = getBreedingTankContext(tank);
  if (!tank || !runtime.fishMap.has(speciesId)) return false;
  const available = typeof getTankAvailablePopulationCapacity === "function"
    ? getTankAvailablePopulationCapacity(tank)
    : Math.max(0,
      (Number(tank.populationCapacity) || 20)
      - (Number(tank.populationUsage) || 0)
      - getPendingBreedingReservedCapacity(tank)
    );
  return available + 0.0001 >= getBreedingOffspringCapacityCost(speciesId);
}

function getSpeciesBreedingClutchRange(species) {
  if (!species) return { min: 1, max: 1 };
  const speciesId = String(species.id || "").toLowerCase();
  const capacityCost = clamp(Number(species.capacityCost) || 1, 0.1, 8);
  if (capacityCost >= 3 || /(?:orca|shark|proteus)/.test(speciesId)) return { min: 1, max: 1 };
  if (capacityCost >= 1.5) return { min: 1, max: 2 };
  return { min: 1, max: 3 };
}

function rollBreedingClutchSize(species) {
  const range = getSpeciesBreedingClutchRange(species);
  return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

function getBreedingOffspringGeneration(parentGenerations = []) {
  const highestParentGeneration = (Array.isArray(parentGenerations) ? parentGenerations : [])
    .reduce((highest, value) => Math.max(highest, Math.max(0, Math.floor(Number(value) || 0))), 0);
  return Math.min(999, highestParentGeneration + 1);
}

function getInheritedAppearanceVariant(parentVariants, species, index = 0) {
  const variants = typeof getFishAssetVariants === "function" ? getFishAssetVariants(species) : [];
  const variantCount = Math.max(1, variants.length);
  const valid = (Array.isArray(parentVariants) ? parentVariants : [])
    .map((value) => clamp(Math.floor(Number(value) || 0), 0, variantCount - 1))
    .slice(0, 2);
  if (!valid.length) return 0;
  if (valid.length === 1 || valid[0] === valid[1]) return valid[0];
  return valid[Math.abs(Math.floor(Number(index) || 0)) % valid.length];
}

function getBreedingParentAppearanceKeys(parents, species) {
  if (!species) return [];
  const variants = typeof getFishAssetVariants === "function" ? getFishAssetVariants(species) : [];
  const keys = [];
  for (const fish of (Array.isArray(parents) ? parents : []).filter(Boolean).slice(0, 2)) {
    let path = "";
    if (typeof getFishAssetPath === "function") {
      path = getFishAssetPath(fish, species) || "";
    }
    let key = typeof getFishAppearanceVariantKey === "function"
      ? getFishAppearanceVariantKey(path || fish.appearanceAssetPath || fish.appearanceVariantKey || "")
      : String(path || fish.appearanceAssetPath || fish.appearanceVariantKey || "").split(/[?#]/)[0].split("/").pop();
    if (!key && variants.length) {
      const index = clamp(
        Math.floor(Number(fish.appearanceVariant ?? fish.visualVariant) || 0),
        0,
        Math.max(0, variants.length - 1)
      );
      key = typeof getFishAppearanceVariantKey === "function"
        ? getFishAppearanceVariantKey(variants[index] || variants[0] || species.asset || "")
        : String(variants[index] || variants[0] || species.asset || "").split(/[?#]/)[0].split("/").pop();
    }
    keys.push(key || "");
  }
  return keys;
}

function getBreedingAllowedAppearanceEntries(species, options = {}) {
  if (!species) return [];
  const allVariants = typeof getFishAssetVariants === "function" ? getFishAssetVariants(species) : [];
  if (!allVariants.length && typeof species.asset === "string" && species.asset) allVariants.push(species.asset);
  const progressionEnabled = typeof isFishSpeciesCareProgressionEligible === "function"
    ? isFishSpeciesCareProgressionEligible(species)
    : false;
  const cosmeticVariants = progressionEnabled && typeof getFishProgressionAppearanceVariants === "function"
    ? getFishProgressionAppearanceVariants(species)
    : allVariants;
  const keyFor = (path) => typeof getFishAppearanceVariantKey === "function"
    ? getFishAppearanceVariantKey(path)
    : String(path || "").split(/[?#]/)[0].split("/").pop();
  const authoredByKey = new Map();
  cosmeticVariants.forEach((path) => {
    const key = keyFor(path);
    if (key && !authoredByKey.has(key)) authoredByKey.set(key, path);
  });

  if (!progressionEnabled) {
    return [...authoredByKey.entries()].map(([key, path]) => ({
      key, path, index: Math.max(0, allVariants.indexOf(path))
    }));
  }

  const allowedKeys = new Set();
  const parentKeys = Array.isArray(options.parentVariantKeys) ? options.parentVariantKeys : [];
  for (const rawKey of parentKeys) {
    const key = keyFor(rawKey);
    if (key && authoredByKey.has(key)) allowedKeys.add(key);
  }

  if (options.includeUnlocked !== false) {
    for (const key of authoredByKey.keys()) {
      const unlocked = typeof isFishAppearanceVariantUnlocked === "function"
        ? isFishAppearanceVariantUnlocked(species, key, { allowDebugBypass: false })
        : key === keyFor(species.asset);
      if (unlocked) allowedKeys.add(key);
    }
  }

  if (!allowedKeys.size) {
    const baseKey = typeof getFishBaseAppearanceVariantKey === "function"
      ? getFishBaseAppearanceVariantKey(species)
      : keyFor(species.asset);
    if (baseKey && authoredByKey.has(baseKey)) allowedKeys.add(baseKey);
  }

  return cosmeticVariants
    .map((path) => ({ key: keyFor(path), path, index: Math.max(0, allVariants.indexOf(path)) }))
    .filter((entry) => entry.key && allowedKeys.has(entry.key));
}

function normalizeBreedingOffspringAppearances(species, variants, variantKeys, count = 1, options = {}) {
  const safeCount = Math.max(1, Math.min(3, Math.floor(Number(count) || 1)));
  const allVariants = typeof getFishAssetVariants === "function" ? getFishAssetVariants(species) : [];
  const allowed = getBreedingAllowedAppearanceEntries(species, options);
  const keyFor = (path) => typeof getFishAppearanceVariantKey === "function"
    ? getFishAppearanceVariantKey(path)
    : String(path || "").split(/[?#]/)[0].split("/").pop();
  const allowedByKey = new Map(allowed.map((entry) => [entry.key, entry]));
  const fallback = allowed.find((entry) => entry.key === keyFor(species?.asset)) || allowed[0] || {
    key: keyFor(species?.asset || allVariants[0] || ""),
    path: species?.asset || allVariants[0] || "",
    index: Math.max(0, allVariants.indexOf(species?.asset || allVariants[0]))
  };
  const safeVariants = [];
  const safeKeys = [];
  for (let index = 0; index < safeCount; index += 1) {
    const requestedKey = keyFor(Array.isArray(variantKeys) ? variantKeys[index] : "");
    const requestedIndex = clamp(
      Math.floor(Number(Array.isArray(variants) ? variants[index] : 0) || 0),
      0,
      Math.max(0, allVariants.length - 1)
    );
    const indexKey = keyFor(allVariants[requestedIndex] || "");
    const selected = allowedByKey.get(requestedKey) || allowedByKey.get(indexKey) || fallback;
    safeVariants.push(Math.max(0, Number.isFinite(Number(selected?.index)) ? Math.floor(Number(selected.index)) : 0));
    safeKeys.push(String(selected?.key || ""));
  }
  return { variants: safeVariants, variantKeys: safeKeys };
}

function isFishBreedingEligible(fish, now = Date.now(), tank = null, options = {}) {
  tank = getBreedingTankContext(tank);
  if (!fish || isFishDead(fish) || fish.storageState === "stored") return false;
  const species = getSpeciesForFish(fish);
  if (!species || species.canBreed === false || fish.spawnUsed === true || fish.breedingAvailable === false) return false;
  if (!isFishAdult(fish, now) || (typeof isFishElderly === "function" && isFishElderly(fish, now))) return false;
  if (typeof getFishPrimaryCondition === "function" && getFishPrimaryCondition(fish, now) !== "healthy") return false;
  if (tank && typeof isFishCompatibleWithWaterType === "function" && !isFishCompatibleWithWaterType(species, tank.waterType)) return false;
  if (options.requireReady !== false && !hasFishActiveSpawningFood(fish, now)) return false;
  if (options.requireCapacity === true && !canTankReserveBreedingOffspring(fish.speciesId, tank)) return false;
  return true;
}

function getFishBreedingStatus(fish, now = Date.now(), tank = null) {
  tank = getBreedingTankContext(tank);
  if (!fish || isFishDead(fish)) return "Unavailable";
  if (fish.spawnUsed === true) return "Complete";
  if (!isFishBreedingEligible(fish, now, tank, { requireReady: false, requireCapacity: false })) return "Unavailable";
  return hasFishActiveSpawningFood(fish, now) ? "Ready" : "Available";
}

function getBreedableFishGroups(now = Date.now(), options = {}) {
  const groups = new Map();
  const requireReady = options.requireReady !== false;
  const requireCapacity = options.requireCapacity === true;
  const excludeDebugPair = options.excludeDebugPair !== false;
  const debugSequence = runtime.debugBreedingSequence;
  const debugFishIds = debugSequence ? new Set([debugSequence.leftFishId, debugSequence.rightFishId].filter(Boolean)) : null;
  const tank = getBreedingTankContext(options.tank);
  for (const fish of state.fish) {
    if (!isFishBreedingEligible(fish, now, tank, { requireReady, requireCapacity })) continue;
    if (isProteusZombieFish(fish)) continue;
    if (excludeDebugPair && debugFishIds?.has(fish.id)) continue;
    const bucket = groups.get(fish.speciesId) || [];
    bucket.push(fish);
    groups.set(fish.speciesId, bucket);
  }
  return [...groups.entries()].filter(([, fishList]) => fishList.length >= 2);
}

function createPendingBreedingEvent(parents, now = Date.now(), options = {}) {
  const pair = Array.isArray(parents) ? parents.filter(Boolean).slice(0, 2) : [];
  if (pair.length < 2 || pair[0].speciesId !== pair[1].speciesId) return null;
  const tank = getBreedingTankContext(options.tank);
  if (!tank || !canTankReserveBreedingOffspring(pair[0].speciesId, tank)) return null;
  const species = runtime.fishMap.get(pair[0].speciesId);
  if (!species) return null;
  const capacityCost = getBreedingOffspringCapacityCost(pair[0].speciesId);
  const availableCapacity = typeof getTankAvailablePopulationCapacity === "function"
    ? getTankAvailablePopulationCapacity(tank)
    : Math.max(0, (Number(tank.populationCapacity) || 20) - (Number(tank.populationUsage) || 0) - getPendingBreedingReservedCapacity(tank));
  const maximumByCapacity = Math.max(0, Math.floor((availableCapacity + 0.0001) / capacityCost));
  if (maximumByCapacity < 1) return null;
  const desiredClutchSize = rollBreedingClutchSize(species);
  const plannedClutchSize = Math.max(1, Math.min(desiredClutchSize, maximumByCapacity));
  const speciesVariants = typeof getFishAssetVariants === "function" ? getFishAssetVariants(species) : [];
  const parentVariantKeys = typeof getBreedingParentAppearanceKeys === "function"
    ? getBreedingParentAppearanceKeys(pair, species)
    : pair.map((fish) => typeof fish.appearanceVariantKey === "string" ? fish.appearanceVariantKey : "");
  const parentVariants = pair.map((fish, index) => {
    const key = parentVariantKeys[index] || "";
    const keyedIndex = key && typeof getFishAppearanceVariantKey === "function"
      ? speciesVariants.findIndex((path) => getFishAppearanceVariantKey(path) === getFishAppearanceVariantKey(key))
      : -1;
    if (keyedIndex >= 0) return keyedIndex;
    return clamp(Math.floor(Number(fish.appearanceVariant ?? fish.visualVariant) || 0), 0, Math.max(0, speciesVariants.length - 1));
  });
  const parentGenerations = pair.map((fish) => Math.max(0, Math.floor(Number(fish.generation) || 0)));
  const offspringGeneration = getBreedingOffspringGeneration(parentGenerations);
  const offspringVariants = Array.from({ length: plannedClutchSize }, () =>
    getInheritedAppearanceVariant(parentVariants, species, Math.floor(Math.random() * 2))
  );
  const offspringVariantKeys = offspringVariants.map((variantIndex) => {
    const path = speciesVariants[variantIndex] || speciesVariants[0] || species.asset || "";
    return typeof getFishAppearanceVariantKey === "function" ? getFishAppearanceVariantKey(path) : "";
  });
  const event = sanitizePendingBreedingEvent({
    id: createId("spawn"),
    speciesId: pair[0].speciesId,
    parentIds: pair.map((fish) => fish.id),
    parentNames: pair.map((fish) => fish.name),
    parentVariants,
    parentVariantKeys,
    parentGenerations,
    offspringGeneration,
    offspringVariants,
    offspringVariantKeys,
    plannedClutchSize,
    deliveryMethod: species.liveBirth === true ? "live" : "egg",
    createdAt: now,
    resolutionAt: species.liveBirth === true ? now + LIVE_BIRTH_GESTATION_MS : now,
    xNorm: Number.isFinite(Number(options.xNorm)) ? Number(options.xNorm) : (Number(pair[0].xNorm) + Number(pair[1].xNorm)) / 2,
    yNorm: Number.isFinite(Number(options.yNorm)) ? Number(options.yNorm) : (Number(pair[0].yNorm) + Number(pair[1].yNorm)) / 2,
    tankLayer: Number.isFinite(Number(options.tankLayer)) ? Number(options.tankLayer) : getBreedingEventTankLayer(species),
    reservedCapacity: Math.round(plannedClutchSize * capacityCost * 100) / 100,
    status: "pending"
  });
  if (!event) return null;
  tank.pendingBreedingEvents ||= [];
  tank.pendingBreedingEvents.push(event);
  return event;
}

function completeFishLifetimeSpawn(parents, now = Date.now(), options = {}) {
  const pair = Array.isArray(parents) ? parents.filter(Boolean).slice(0, 2) : [];
  if (pair.length < 2 || pair[0].speciesId !== pair[1].speciesId) return null;
  const tank = getBreedingTankContext(options.tank);
  if (!pair.every((fish) => isFishBreedingEligible(fish, now, tank, { requireReady: true, requireCapacity: false }))) return null;
  const pendingEvent = createPendingBreedingEvent(pair, now, options);
  if (!pendingEvent) return null;
  for (const fish of pair) {
    fish.spawnUsed = true;
    fish.breedingAvailable = false;
    fish.breedingReadyUntil = 0;
    fish.spawningFoodUntil = 0;
    fish.breedCooldownUntil = 0;
  }
  const species = runtime.fishMap.get(pair[0].speciesId);
  pushEvent(`${pair[0].name} and ${pair[1].name} successfully spawned.`, now, tank, { type: "birth", fishId: pair[0].id, score: 1 });
  return { kind: "pending", event: pendingEvent, species, parentNames: pendingEvent.parentNames, parentIds: pendingEvent.parentIds };
}

function pickRandomItems(items, count = 1) {
  const pool = Array.isArray(items) ? [...items] : [];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, Math.max(0, Math.min(pool.length, Math.floor(count))));
}

function createBabyFishFromSpecies(speciesId, now = Date.now(), options = {}) {
  const species = runtime.fishMap.get(speciesId);
  if (!species) {
    return null;
  }

  const anchorXNorm = clamp(Number.isFinite(Number(options.anchorXNorm)) ? Number(options.anchorXNorm) : randomSwimX(), 0.12, 0.88);
  const anchorYNorm = clamp(Number.isFinite(Number(options.anchorYNorm)) ? Number(options.anchorYNorm) : randomSwimY(), 0.18, 0.76);
  const tankLayer = species.behavior === "sucker"
    ? SUCKER_FISH_BACK_GLASS_LAYER
    : clampTankLayer(Number.isFinite(Number(options.tankLayer)) ? Number(options.tankLayer) : DEFAULT_TANK_LAYER);
  return createFishRecord(speciesId, {
    now,
    juvenile: true,
    tankLayer,
    desiredTankLayer: tankLayer,
    xNorm: clamp(anchorXNorm + randomBetween(-0.014, 0.014), 0.08, 0.92),
    yNorm: clamp(anchorYNorm + randomBetween(-0.012, 0.012), 0.14, 0.8),
    targetXNorm: clamp(anchorXNorm + randomBetween(-0.05, 0.05), 0.08, 0.92),
    targetYNorm: clamp(anchorYNorm + randomBetween(-0.04, 0.04), 0.14, 0.8),
    appearanceVariant: Number.isFinite(Number(options.appearanceVariant)) ? Number(options.appearanceVariant) : undefined,
    appearanceVariantKey: typeof options.appearanceVariantKey === "string" ? options.appearanceVariantKey : null,
    parentNames: Array.isArray(options.parentNames) ? options.parentNames : [],
    parentIds: Array.isArray(options.parentIds) ? options.parentIds : [],
    generation: Number.isFinite(Number(options.generation)) ? Number(options.generation) : undefined,
    fishColor: normalizeDecorColorSetting(options.fishColor ?? ""),
    fishColorize: normalizeDecorColorizeSetting(options.fishColorize ?? false)
  });
}

function spawnBreedingOffspring(speciesId, now = Date.now(), options = {}) {
  const species = runtime.fishMap.get(speciesId);
  if (!species) return null;
  const parentNames = Array.isArray(options.parentNames)
    ? options.parentNames.map((name) => sanitizeTankName(name, "")).filter(Boolean).slice(0, 2)
    : [];
  const parentIds = Array.isArray(options.parentIds)
    ? options.parentIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 2)
    : [];
  const tankLayer = species.behavior === "sucker"
    ? SUCKER_FISH_BACK_GLASS_LAYER
    : clampTankLayer(Number.isFinite(Number(options.tankLayer)) ? Number(options.tankLayer) : DEFAULT_TANK_LAYER);

  if (species.liveBirth === true) {
    const allFish = typeof getAllTankFish === "function"
      ? getAllTankFish(state)
      : (Array.isArray(state?.fish) ? state.fish : []);
    const parents = parentIds.map((id) => allFish.find((fish) => fish?.id === id)).filter(Boolean);
    const parentVariantKeys = typeof getBreedingParentAppearanceKeys === "function"
      ? getBreedingParentAppearanceKeys(parents, species)
      : [];
    const allowedVariants = typeof getBreedingAllowedAppearanceEntries === "function"
      ? getBreedingAllowedAppearanceEntries(species, { parentVariantKeys, includeUnlocked: true })
      : (typeof getFishAssetVariants === "function" ? getFishAssetVariants(species).map((path, index) => ({ path, index, key: getFishAppearanceVariantKey(path) })) : []);
    const selected = allowedVariants.length
      ? allowedVariants[Math.floor(Math.random() * allowedVariants.length)]
      : { index: 0, key: typeof getFishAppearanceVariantKey === "function" ? getFishAppearanceVariantKey(species.asset || "") : "" };
    const baby = createBabyFishFromSpecies(speciesId, now, {
      anchorXNorm: options.xNorm,
      anchorYNorm: options.yNorm,
      tankLayer,
      appearanceVariant: selected.index,
      appearanceVariantKey: selected.key || null,
      parentNames,
      parentIds,
      fishColor: options.fishColor,
      fishColorize: options.fishColorize
    });
    if (!baby) return null;
    if (!addFishToTank(baby, now, { onFull: "reject" })) {
      return { kind: "blocked", reason: "capacity", baby: null, species, parentNames, parentIds };
    }
    return { kind: "live", baby, species, parentNames, parentIds };
  }

  const eggSpawnOptions = {
    xNorm: options.xNorm,
    yNorm: options.yNorm,
    parentNames,
    parentIds,
    tankLayer,
    fishColor: options.fishColor,
    fishColorize: options.fishColorize
  };
  if (species.breedingMethod === "egg-scatterer") {
    eggSpawnOptions.yNorm = randomBetween(0.72, 0.84);
  } else if (species.breedingMethod === "floating-egg-mass") {
    eggSpawnOptions.yNorm = randomBetween(0.2, 0.36);
    eggSpawnOptions.startYNorm = eggSpawnOptions.yNorm;
  }
  const egg = createFishEggRecord(speciesId, now, eggSpawnOptions);
  if (!egg) return null;
  addFishEggToTank(egg);
  return { kind: "egg", egg, species, parentNames, parentIds };
}

function getBreedingOffspringMessage(result) {
  if (!result) return "";
  const parents = result.parentNames || [];
  const parentLabel = parents.length >= 2 ? `${parents[0]} and ${parents[1]}` : "a breeding pair";
  return result.kind === "live"
    ? `${result.baby?.name || "A baby fish"} the ${result.species?.name || "fish"} was born after ${parentLabel} paired up.`
    : `An egg appeared after ${parentLabel} paired up.`;
}

function getAvailableFishInheritanceColors() {
  return getCustomGravelColorChoices()
    .map((choice) => normalizeHexColor(choice.color))
    .filter((color, index, colors) => color && colors.indexOf(color) === index);
}

function getColorDistanceSquared(colorA, colorB) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) {
    return Number.POSITIVE_INFINITY;
  }

  const redMean = (rgbA.r + rgbB.r) / 2;
  const redDelta = rgbA.r - rgbB.r;
  const greenDelta = rgbA.g - rgbB.g;
  const blueDelta = rgbA.b - rgbB.b;
  return ((512 + redMean) * redDelta * redDelta) / 256
    + 4 * greenDelta * greenDelta
    + ((767 - redMean) * blueDelta * blueDelta) / 256;
}

function snapFishInheritanceColorToAvailable(color) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return "";
  }

  const availableColors = getAvailableFishInheritanceColors();
  if (!availableColors.length) {
    return "";
  }
  if (availableColors.includes(normalizedColor)) {
    return normalizedColor;
  }

  return availableColors
    .map((availableColor) => ({
      color: availableColor,
      distance: getColorDistanceSquared(normalizedColor, availableColor)
    }))
    .sort((left, right) => left.distance - right.distance || left.color.localeCompare(right.color))[0]?.color || "";
}

function getFishBreedingColor(fish, now = Date.now()) {
  const color = getFishColorSetting(fish);
  if (!color) {
    return null;
  }

  return snapFishInheritanceColorToAvailable(
    isDecorRgbColorSetting(color)
      ? getDecorRgbCycleColor(now)
      : color
  );
}

function getBreedingEggColorInheritance(parents = [], now = Date.now()) {
  const coloredParents = parents
    .map((fish) => ({
      color: getFishBreedingColor(fish, now),
      colorize: getFishColorizeSetting(fish)
    }))
    .filter((entry) => entry.color);

  if (coloredParents.length >= 2) {
    const mixedColor = mixColors(coloredParents[0].color, coloredParents[1].color, 0.5);
    return {
      fishColor: snapFishInheritanceColorToAvailable(mixedColor),
      fishColorize: coloredParents.some((entry) => entry.colorize)
    };
  }

  if (coloredParents.length === 1 && Math.random() < 0.5) {
    return {
      fishColor: coloredParents[0].color,
      fishColorize: coloredParents[0].colorize
    };
  }

  return {
    fishColor: "",
    fishColorize: false
  };
}

function getFishEggTargetYNorm(xNorm, tankLayer = DEFAULT_TANK_LAYER) {
  return clamp(
    getPoopLayerTargetYNorm(
      {
        xNorm: clamp(xNorm, 0.08, 0.92),
        tankLayer: clampTankLayer(tankLayer)
      },
      null,
      FISH_EGG_DRAW_WIDTH_MAX_PX
    ),
    0.22,
    0.96
  );
}

function createFishEggRecord(speciesId, now = Date.now(), options = {}) {
  const species = runtime.fishMap.get(speciesId);
  if (!species) {
    return null;
  }

  const xNorm = clamp(Number.isFinite(Number(options.xNorm)) ? Number(options.xNorm) : randomSwimX(), 0.08, 0.92);
  const tankLayer = species.behavior === "sucker"
    ? SUCKER_FISH_BACK_GLASS_LAYER
    : clampTankLayer(Number.isFinite(Number(options.tankLayer)) ? Number(options.tankLayer) : DEFAULT_TANK_LAYER);
  const floatingEggMass = species.breedingMethod === "floating-egg-mass";
  const targetYNorm = floatingEggMass
    ? clamp(Number(options.yNorm) || randomBetween(0.2, 0.36), 0.16, 0.46)
    : getFishEggTargetYNorm(xNorm, tankLayer);
  const startYNorm = floatingEggMass
    ? targetYNorm
    : clamp(
      Number.isFinite(Number(options.startYNorm)) ? Number(options.startYNorm) : (Number(options.yNorm) || targetYNorm - 0.18),
      0.14,
      Math.max(0.16, targetYNorm - 0.01)
    );
  const parentNames = Array.isArray(options.parentNames)
    ? options.parentNames.map((name) => sanitizeTankName(name, "")).filter(Boolean).slice(0, 2)
    : [];
  const parentIds = Array.isArray(options.parentIds)
    ? options.parentIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 2)
    : [];
  const parentVariantKeys = Array.isArray(options.parentVariantKeys)
    ? options.parentVariantKeys.map((value) => String(value || "")).filter(Boolean).slice(0, 2)
    : [];
  const fishColor = snapFishInheritanceColorToAvailable(options.fishColor ?? "");

  const clutchSize = Math.max(1, Math.min(3, Math.floor(Number(options.clutchSize) || 1)));
  const offspringGeneration = Math.max(0, Math.min(999, Math.floor(Number(options.offspringGeneration) || (parentIds.length ? 1 : 0))));
  const offspringVariants = Array.isArray(options.offspringVariants)
    ? options.offspringVariants.slice(0, clutchSize).map((value) => Math.max(0, Math.floor(Number(value) || 0)))
    : [];
  const offspringVariantKeys = Array.isArray(options.offspringVariantKeys)
    ? options.offspringVariantKeys.slice(0, clutchSize).map((value) => String(value || ""))
    : [];
  const reservedCapacity = Math.max(0, Number(options.reservedCapacity) || clutchSize * getBreedingOffspringCapacityCost(speciesId));

  return {
    id: createId("egg"),
    speciesId,
    parentNames,
    parentIds,
    parentVariantKeys,
    clutchSize,
    offspringGeneration,
    offspringVariants,
    offspringVariantKeys,
    reservedCapacity: Math.round(reservedCapacity * 100) / 100,
    createdAt: now,
    hatchAt: now + FISH_EGG_INCUBATION_MS,
    hatchedAt: null,
    shellExpiresAt: null,
    releasedAt: null,
    fishColor,
    fishColorize: fishColor ? normalizeDecorColorizeSetting(options.fishColorize ?? false) : false,
    xNorm,
    startYNorm,
    yNorm: targetYNorm,
    tankLayer,
    buoyancy: floatingEggMass ? "floating" : "sinking"
  };
}

function addFishEggToTank(egg) {
  if (!egg) {
    return null;
  }

  if (!Array.isArray(state.fishEggs)) {
    state.fishEggs = [];
  }
  state.fishEggs.push(egg);
  return egg;
}

function resolvePendingBreedingEvent(event, now = Date.now(), tank = getBreedingTankContext()) {
  if (!event || event.status !== "pending" || !tank) return false;
  const species = runtime.fishMap.get(event.speciesId);
  if (!species) return false;
  const resolutionAt = Number.isFinite(Number(event.resolutionAt)) ? Number(event.resolutionAt) : Number(event.createdAt) || now;
  if (resolutionAt > now) return false;

  const clutchSize = Math.max(1, Math.min(3, Math.floor(Number(event.plannedClutchSize) || 1)));
  const generation = Math.max(0, Math.min(999, Math.floor(Number(event.offspringGeneration) || getBreedingOffspringGeneration(event.parentGenerations))));
  let offspringVariants = Array.isArray(event.offspringVariants)
    ? event.offspringVariants.slice(0, clutchSize)
    : Array.from({ length: clutchSize }, (_, index) => getInheritedAppearanceVariant(event.parentVariants, species, index));
  let offspringVariantKeys = Array.isArray(event.offspringVariantKeys) ? event.offspringVariantKeys.slice(0, clutchSize) : [];
  if (typeof normalizeBreedingOffspringAppearances === "function") {
    const safe = normalizeBreedingOffspringAppearances(species, offspringVariants, offspringVariantKeys, clutchSize, {
      parentVariantKeys: event.parentVariantKeys,
      includeUnlocked: !Array.isArray(event.parentVariantKeys) || event.parentVariantKeys.length === 0
    });
    offspringVariants = safe.variants;
    offspringVariantKeys = safe.variantKeys;
  }

  event.status = "resolving";
  if (event.deliveryMethod !== "live" && species.liveBirth !== true) {
    const egg = createFishEggRecord(event.speciesId, resolutionAt, {
      xNorm: event.xNorm,
      yNorm: event.yNorm,
      parentNames: event.parentNames,
      parentIds: event.parentIds,
      parentVariantKeys: event.parentVariantKeys,
      tankLayer: getBreedingEggTankLayer(species, event.tankLayer),
      clutchSize,
      offspringGeneration: generation,
      offspringVariants,
      offspringVariantKeys,
      reservedCapacity: event.reservedCapacity
    });
    if (!egg) {
      event.status = "pending";
      return false;
    }
    if (species.breedingMethod === "egg-scatterer") {
      egg.yNorm = getFishEggTargetYNorm(egg.xNorm, egg.tankLayer);
      egg.startYNorm = clamp(Number(event.yNorm) || egg.startYNorm, 0.14, Math.max(0.16, egg.yNorm - 0.01));
    }
    addFishEggToTank(egg);
    tank.pendingBreedingEvents = (tank.pendingBreedingEvents || []).filter((entry) => entry !== event && entry?.id !== event.id);
    return true;
  }

  const babies = [];
  for (let index = 0; index < clutchSize; index += 1) {
    const baby = createBabyFishFromSpecies(event.speciesId, resolutionAt, {
      anchorXNorm: event.xNorm,
      anchorYNorm: event.yNorm,
      tankLayer: event.tankLayer,
      appearanceVariant: Number.isFinite(Number(offspringVariants[index])) ? Number(offspringVariants[index]) : 0,
      appearanceVariantKey: offspringVariantKeys[index] || null,
      parentNames: event.parentNames,
      parentIds: event.parentIds,
      generation
    });
    if (!baby || !addFishToTank(baby, resolutionAt, { onFull: "reject", tank })) break;
    babies.push(baby);
  }

  if (!babies.length) {
    event.status = "pending";
    return false;
  }

  tank.pendingBreedingEvents = (tank.pendingBreedingEvents || []).filter((entry) => entry !== event && entry?.id !== event.id);
  const birthMessage = babies.length === 1
    ? `${babies[0].name || "A juvenile fish"} the ${species.name || "fish"} was born.`
    : `${babies.length} juvenile ${species.name || "fish"} were born.`;
  pushEvent(birthMessage, resolutionAt, tank, { type: "birth", fishId: babies[0]?.id || "", score: babies.length });
  if (now - resolutionAt < 5 * MINUTE_MS) showToast(birthMessage);
  return true;
}

function processPendingBreedingEvents(now = Date.now()) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return false;
  const tank = getBreedingTankContext();
  if (!tank || !Array.isArray(tank.pendingBreedingEvents) || !tank.pendingBreedingEvents.length) return false;
  let changed = false;
  for (const event of [...tank.pendingBreedingEvents]) {
    if (event?.status !== "pending") continue;
    const dueAt = Number.isFinite(Number(event.resolutionAt)) ? Number(event.resolutionAt) : Number(event.createdAt) || 0;
    if (dueAt <= now) changed = resolvePendingBreedingEvent(event, now, tank) || changed;
  }
  return changed;
}

function hatchFishEgg(egg, now = Date.now()) {
  if (!egg || egg.hatchedAt) {
    return false;
  }

  const species = runtime.fishMap.get(egg.speciesId);
  if (!species) {
    return false;
  }

  const hatchAt = Number.isFinite(Number(egg.hatchAt)) ? Number(egg.hatchAt) : now;
  const clutchSize = Math.max(1, Math.min(3, Math.floor(Number(egg.clutchSize) || 1)));
  let variants = Array.isArray(egg.offspringVariants) ? egg.offspringVariants : [];
  let variantKeys = Array.isArray(egg.offspringVariantKeys) ? egg.offspringVariantKeys : [];
  if (typeof normalizeBreedingOffspringAppearances === "function") {
    const safe = normalizeBreedingOffspringAppearances(species, variants, variantKeys, clutchSize, {
      parentVariantKeys: egg.parentVariantKeys,
      includeUnlocked: !Array.isArray(egg.parentVariantKeys) || egg.parentVariantKeys.length === 0
    });
    variants = safe.variants;
    variantKeys = safe.variantKeys;
  }
  const generation = Math.max(0, Math.min(999, Math.floor(Number(egg.offspringGeneration) || (egg.parentIds?.length ? 1 : 0))));
  const originalReservedCapacity = Math.max(0, Number(egg.reservedCapacity) || clutchSize * getBreedingOffspringCapacityCost(egg.speciesId));
  egg.reservedCapacity = 0;

  const babies = [];
  for (let index = 0; index < clutchSize; index += 1) {
    const baby = createBabyFishFromSpecies(egg.speciesId, hatchAt, {
      anchorXNorm: egg.xNorm,
      anchorYNorm: clamp((Number(egg.yNorm) || 0.72) - 0.08, 0.18, 0.76),
      tankLayer: egg.tankLayer,
      appearanceVariant: Number.isFinite(Number(variants[index])) ? Number(variants[index]) : 0,
      appearanceVariantKey: variantKeys[index] || null,
      fishColor: snapFishInheritanceColorToAvailable(egg.fishColor),
      fishColorize: egg.fishColorize,
      parentNames: egg.parentNames,
      parentIds: egg.parentIds,
      generation
    });
    if (!baby || !addFishToTank(baby, hatchAt, { onFull: "reject" })) break;
    babies.push(baby);
  }

  if (!babies.length) {
    egg.reservedCapacity = originalReservedCapacity;
    return false;
  }

  egg.hatchedAt = hatchAt;
  egg.hatchedCount = babies.length;
  egg.reservedCapacity = 0;
  egg.shellExpiresAt = hatchAt + FISH_EGG_SHELL_LINGER_MS;
  if (now - hatchAt < FISH_EGG_SHELL_LINGER_MS) {
    spawnSedimentCloud((Number(egg.xNorm) || 0.5) * TANK_WIDTH, (Number(egg.yNorm) || 0.74) * TANK_HEIGHT, {
      now,
      strength: getSedimentStrength(now, 0.62),
      baseRadius: 16,
      driftY: -12
    });
  }
  const hatchMessage = babies.length === 1
    ? `${babies[0].name || "A baby fish"} the ${species.name || "fish"} has just hatched and is exploring the aquarium.`
    : `${babies.length} juvenile ${species.name || "fish"} have hatched and are exploring the aquarium.`;
  pushEvent(hatchMessage, hatchAt, getCurrentTank(), { type: "birth", fishId: babies[0]?.id || "", score: babies.length });
  if (now - hatchAt < FISH_EGG_SHELL_LINGER_MS) {
    showToast(hatchMessage);
  }
  return true;
}

function processFishEggs(now = Date.now()) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return false;
  if (!Array.isArray(state.fishEggs) || !state.fishEggs.length) {
    return false;
  }

  let changed = false;
  for (const egg of state.fishEggs) {
    if (!egg?.hatchedAt && (Number(egg.hatchAt) || 0) <= now) {
      changed = hatchFishEgg(egg, now) || changed;
    }
  }

  const beforeCount = state.fishEggs.length;
  state.fishEggs = state.fishEggs.filter((egg) => !egg?.hatchedAt || (Number(egg.shellExpiresAt) || 0) > now);
  return changed || state.fishEggs.length !== beforeCount;
}

function getBreedingEventTankLayer(species) {
  return species?.behavior === "sucker" ? SUCKER_FISH_BACK_GLASS_LAYER : BREEDING_EVENT_TANK_LAYER;
}

function getBreedingEggTankLayer(species, parentLayer = getBreedingEventTankLayer(species)) {
  return species?.behavior === "sucker"
    ? SUCKER_FISH_BACK_GLASS_LAYER
    : clampTankLayer(Math.min(TANK_DEPTH_LAYERS, clampTankLayer(parentLayer) + 1));
}

function clampBreedingAnchorYNorm(yNorm, parents = [], species = null, targetLayer = BREEDING_EVENT_TANK_LAYER, options = {}) {
  const requestedMinYNorm = Number.isFinite(Number(options.minYNorm)) ? Number(options.minYNorm) : 0.18;
  const requestedMaxYNorm = Number.isFinite(Number(options.maxYNorm)) ? Number(options.maxYNorm) : 0.76;
  let minYNorm = requestedMinYNorm;
  let maxYNorm = requestedMaxYNorm;

  for (const fish of parents) {
    if (!fish) {
      continue;
    }

    const range = getLayerSwimYRange(targetLayer, fish, species || getSpeciesForFish(fish), {
      minYNorm: requestedMinYNorm,
      maxYNorm: requestedMaxYNorm
    });
    minYNorm = Math.max(minYNorm, range.min);
    maxYNorm = Math.min(maxYNorm, range.max);
  }

  if (maxYNorm < minYNorm) {
    return clamp(yNorm, requestedMinYNorm, requestedMaxYNorm);
  }

  return clamp(yNorm, minYNorm, maxYNorm);
}

function processFishBreedingForSlot(slot) {
  const now = Number(slot?.end) || Date.now();
  const breedingGroups = getBreedableFishGroups(now, { requireReady: true, requireCapacity: true });
  if (!breedingGroups.length) return false;
  for (const [speciesId, eligibleFish] of breedingGroups) {
    if (!canTankReserveBreedingOffspring(speciesId, getBreedingTankContext())) continue;
    const parents = pickRandomItems(eligibleFish, 2);
    if (parents.length < 2 || Math.random() >= BREEDING_ATTEMPT_SUCCESS_CHANCE) continue;
    const result = completeFishLifetimeSpawn(parents, now, { tank: getBreedingTankContext() });
    if (!result) continue;
    showToast(`${parents[0].name} and ${parents[1].name} successfully spawned.`);
    return true;
  }
  return false;
}

function hasDebugBreedingPairCandidate(now = Date.now()) {
  return getBreedableFishGroups(now, { requireReady: false }).length > 0;
}

function clearDebugBreedingSequence() {
  runtime.debugBreedingSequence = null;
}

function getActiveDebugBreedingSequenceFish() {
  const sequence = runtime.debugBreedingSequence;
  if (!sequence) {
    return null;
  }

  const leftFish = state.fish.find((fish) => fish.id === sequence.leftFishId) || null;
  const rightFish = state.fish.find((fish) => fish.id === sequence.rightFishId) || null;
  if (
    !leftFish
    || !rightFish
    || leftFish.speciesId !== rightFish.speciesId
    || isFishDead(leftFish)
    || isFishDead(rightFish)
  ) {
    clearDebugBreedingSequence();
    return null;
  }

  return { sequence, leftFish, rightFish };
}

function getDebugBreedingTarget(sequence, role) {
  const direction = role === "left" ? -1 : 1;
  return {
    xNorm: clamp(sequence.anchorXNorm + direction * sequence.spacingNorm, 0.08, 0.92),
    yNorm: clamp(sequence.anchorYNorm, 0.14, 0.8)
  };
}

function hasFishReachedNormTarget(fish, target) {
  if (!fish || !target) {
    return false;
  }

  return Math.hypot((fish.xNorm || 0) - target.xNorm, (fish.yNorm || 0) - target.yNorm) <= DEBUG_BREEDING_REACHED_DISTANCE_NORM;
}

function updateDebugBreedingSequence(now) {
  const activeSequence = getActiveDebugBreedingSequenceFish();
  if (!activeSequence) {
    return null;
  }

  const { sequence, leftFish, rightFish } = activeSequence;
  if (!Number.isFinite(sequence.cuddleStartedAt)) {
    const leftTarget = getDebugBreedingTarget(sequence, "left");
    const rightTarget = getDebugBreedingTarget(sequence, "right");
    if (hasFishReachedNormTarget(leftFish, leftTarget) && hasFishReachedNormTarget(rightFish, rightTarget)) {
      sequence.cuddleStartedAt = now;
      sequence.cuddleEndsAt = now + DEBUG_BREEDING_HOLD_MS;
    }
    return activeSequence;
  }

  if (now < sequence.cuddleEndsAt) {
    return activeSequence;
  }

  const species = runtime.fishMap.get(sequence.speciesId);
  const colorInheritance = getBreedingEggColorInheritance([leftFish, rightFish], now);
  const eggLayer = Number.isFinite(Number(sequence.eggLayer))
    ? clampTankLayer(sequence.eggLayer)
    : getBreedingEggTankLayer(species, sequence.targetLayer);
  const offspring = spawnBreedingOffspring(sequence.speciesId, now, {
    xNorm: sequence.anchorXNorm,
    yNorm: sequence.anchorYNorm,
    parentNames: [leftFish.name, rightFish.name],
    parentIds: [leftFish.id, rightFish.id],
    tankLayer: eggLayer,
    fishColor: colorInheritance.fishColor,
    fishColorize: colorInheritance.fishColorize
  });
  if (offspring) {
    const cooldownUntil = now + BREEDING_COOLDOWN_MS;
    leftFish.breedCooldownUntil = cooldownUntil;
    rightFish.breedCooldownUntil = cooldownUntil;
    leftFish.targetAt = now;
    rightFish.targetAt = now;
    pushEvent(getBreedingOffspringMessage(offspring), now, getCurrentTank(), { type: "birth", fishId: offspring.baby?.id || "", score: 1 });
    clearDebugBreedingSequence();
    saveState();
    renderUi(now);
    showToast(offspring.kind === "live" ? `${offspring.baby?.name || "A baby fish"} was born.` : `${species?.name || "Fish"} egg settled into the gravel.`);
    return null;
  }

  clearDebugBreedingSequence();
  return null;
}

function setFishBreedingTarget(fish, species, sequence, role, now) {
  const target = getDebugBreedingTarget(sequence, role);
  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  clearFishSchoolFollowState(fish);
  fish.targetXNorm = target.xNorm;
  fish.targetYNorm = target.yNorm;
  fish.targetAt = Math.max(now + 500, Number(sequence.cuddleEndsAt) || (now + 1800));
  setFishTankLayers(fish, sequence.targetLayer, sequence.targetLayer);
  if (Number.isFinite(sequence.cuddleStartedAt)) {
    setFishDirection(fish, role === "left" ? 1 : -1, species, now);
  } else if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(
      species,
      randomBetween(
        Math.max(species.speedMin, species.speedMax * 0.74),
        species.speedMax
      )
    );
  }
}

function triggerDebugBabySequence() {
  const now = Date.now();
  syncState(now);

  if (runtime.debugBreedingSequence) {
    showToast("A baby sequence is already running.");
    return;
  }

  const groups = getBreedableFishGroups(now, { requireReady: false });
  if (!groups.length) {
    showToast("You need two grown fish of the same species in the tank.");
    return;
  }

  const [speciesId, candidates] = groups[Math.floor(Math.random() * groups.length)];
  const parents = pickRandomItems(candidates, 2);
  if (parents.length < 2) {
    showToast("A same-species pair could not be lined up right now.");
    return;
  }

  const species = runtime.fishMap.get(speciesId);
  const [leftFish, rightFish] = parents;
  const targetLayer = getBreedingEventTankLayer(species);
  const eggLayer = getBreedingEggTankLayer(species, targetLayer);
  const anchorXNorm = clamp((leftFish.xNorm + rightFish.xNorm) / 2 + randomBetween(-0.02, 0.02), 0.18, 0.82);
  const anchorYNorm = clampBreedingAnchorYNorm(
    (leftFish.yNorm + rightFish.yNorm) / 2 + randomBetween(-0.018, 0.018),
    parents,
    species,
    targetLayer,
    { minYNorm: 0.2, maxYNorm: 0.72 }
  );
  const spacingNorm = clamp(
    (getFishVisualSize(leftFish, species, now) + getFishVisualSize(rightFish, species, now)) / TANK_WIDTH * 0.1,
    0.018,
    0.042
  );

  runtime.debugBreedingSequence = {
    id: createId("breed-seq"),
    speciesId,
    leftFishId: leftFish.id,
    rightFishId: rightFish.id,
    anchorXNorm,
    anchorYNorm,
    spacingNorm,
    targetLayer,
    eggLayer,
    startedAt: now,
    cuddleStartedAt: null,
    cuddleEndsAt: null
  };

  releasePelletsTargetingFishIds([leftFish.id, rightFish.id]);
  for (const fish of parents) {
    if (fish.caveState) {
      abortFishCaveBehavior(fish, now, false);
    }
    clearFishSchoolFollowState(fish);
    fish.activity = "roam";
    fish.feedingPelletId = null;
    fish.hangoutDecorId = null;
    fish.targetAt = now;
  }

  saveState();
  renderUi(now);
  showToast(`${species?.name || "Fish"} pair test started.`);
}
