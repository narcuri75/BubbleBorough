// Source fragment: decor/layout-and-layers.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function openLocalHideFrontPicker() {
  openCustomAssetPicker("hide", "front");
}

function openLocalHideBackgroundPicker() {
  openCustomAssetPicker("hide", "background");
}

function openLocalFishPicker() {
  openCustomAssetPicker("fish");
}

async function importSaveDataFromPicker(event) {
  const input = event?.currentTarget instanceof HTMLInputElement
    ? event.currentTarget
    : dom.importDataInput;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  try {
    const rawText = await readFileAsText(file);
    const payload = JSON.parse(rawText.replace(/^\uFEFF/, ""));
    const importedState = extractImportedSaveState(payload);
    await applyImportedSaveData(importedState);
    showToast("Save file imported.");
  } catch (error) {
    console.error(error);
    if (error instanceof SyntaxError) {
      showToast("That save file could not be read.");
    } else {
      showToast(error?.message || "Could not import save data.");
    }
  } finally {
    if (input) {
      input.value = "";
    }
  }
}

async function importLocalBackgroundFromPicker(event) {
  const input = event?.currentTarget instanceof HTMLInputElement
    ? event.currentTarget
    : dom.localBackgroundInput;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  try {
    const dataUrl = await prepareLocalBackgroundImageDataUrl(file);
    const storedImage = await storeCustomImageDataUrl(dataUrl, "local-background");
    const imageSource = storedImage.runtimeUrl || storedImage.dataUrl;
    await preloadImages([imageSource]);
    state.localBackgroundImageDataUrl = storedImage.dataUrl;
    state.localBackgroundImageRefId = storedImage.imageRefId;
    setRuntimeImageSource(getCurrentTank(), "runtimeLocalBackgroundImageUrl", imageSource);
    state.selectedBackground = CUSTOM_IMAGE_BACKGROUND_ASSET_KEY;
    saveState();
    renderUi(Date.now());
    showToast("Local background updated.");
  } catch (error) {
    console.error(error);
    showToast(error?.message || "Could not use that image.");
  } finally {
    if (input) {
      input.value = "";
    }
  }
}

async function importLocalDecorFromPicker(event) {
  await importCustomAssetFromPicker("decor", "primary", event);
}

async function importLocalHideFrontFromPicker(event) {
  await importCustomAssetFromPicker("hide", "front", event);
}

async function importLocalHideBackgroundFromPicker(event) {
  await importCustomAssetFromPicker("hide", "background", event);
}

async function importLocalFishFromPicker(event) {
  await importCustomAssetFromPicker("fish", "primary", event);
}

function sanitizeFish(fish, options = {}) {
  if (!fish || !runtime.fishMap.has(fish.speciesId)) {
    return null;
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const species = getBaseSpeciesForFish(fish);
  const legacyHealthModel = Boolean(options.legacyHealthModel);
  const maxHealthUnits = getFishMaxHealthUnits(fish, species);
  const rawHealthUnits = Number.isFinite(Number(fish.healthUnits))
    ? Math.round(Number(fish.healthUnits))
    : null;
  const spawnX = clamp(Number(fish.xNorm) || randomSwimX(), 0.08, 0.92);
  const spawnY = clamp(Number(fish.yNorm) || randomSwimY(), 0.14, 0.8);
  const swimSpeed = normalizeFishSpeed(species, Number(fish.swimSpeed));
  const displayAngle = Number.isFinite(Number(fish.displayAngle))
    ? normalizeAngle(Number(fish.displayAngle))
    : (Number(fish.direction) < 0 ? Math.PI : 0);
  const displayDirection = Number.isFinite(Number(fish.displayDirection))
    ? (Number(fish.displayDirection) < 0 ? -1 : 1)
    : (Math.cos(displayAngle) < 0 ? -1 : 1);
  const turnFromAngle = Number.isFinite(Number(fish.turnFromAngle))
    ? normalizeAngle(Number(fish.turnFromAngle))
    : displayAngle;
  const turnToAngle = Number.isFinite(Number(fish.turnToAngle))
    ? normalizeAngle(Number(fish.turnToAngle))
    : displayAngle;
  const baseTankLayer = species.behavior === "sucker"
    ? normalizeSuckerFishGlassLayer(Number.isFinite(Number(fish.tankLayer)) ? Number(fish.tankLayer) : SUCKER_FISH_BACK_GLASS_LAYER)
    : clampTankLayer(Number.isFinite(Number(fish.tankLayer)) ? Number(fish.tankLayer) : (fish.drawLayer === "back" ? 4 : DEFAULT_TANK_LAYER));
  const desiredTankLayer = species.behavior === "sucker"
    ? normalizeSuckerFishGlassLayer(Number.isFinite(Number(fish.desiredTankLayer)) ? Number(fish.desiredTankLayer) : baseTankLayer)
    : clampTankLayer(Number.isFinite(Number(fish.desiredTankLayer)) ? Number(fish.desiredTankLayer) : (fish.desiredDrawLayer === "back" ? Math.max(baseTankLayer, 4) : baseTankLayer));
  const dead = Number.isFinite(fish.deadAt) || rawHealthUnits === 0;
  const storedUndeadTemplateSpeciesId = typeof fish.undeadTemplateSpeciesId === "string"
    ? fish.undeadTemplateSpeciesId.trim()
    : "";
  const storedUndeadTemplateSpecies = storedUndeadTemplateSpeciesId
    ? runtime.fishMap.get(storedUndeadTemplateSpeciesId)
    : null;
  const pickedPersonality = pickFishPersonality(species);
  const storedPersonality = normalizeBehaviorPersonality(fish.personality);
  const storedCoarseActivity = fish.coarseActivity && typeof fish.coarseActivity === "object"
    ? fish.coarseActivity
    : null;
  const coarseActivity = storedCoarseActivity
    && Number.isFinite(Number(storedCoarseActivity.startedAt))
    && Number.isFinite(Number(storedCoarseActivity.endsAt))
    ? {
        type: ["wander", "service", "rest", "social"].includes(storedCoarseActivity.type)
          ? storedCoarseActivity.type
          : "wander",
        label: typeof storedCoarseActivity.label === "string" ? storedCoarseActivity.label.slice(0, 64) : "Swimming",
        serviceType: typeof storedCoarseActivity.serviceType === "string" ? storedCoarseActivity.serviceType : "",
        targetDecorId: typeof storedCoarseActivity.targetDecorId === "string" ? storedCoarseActivity.targetDecorId : null,
        startedAt: Math.max(0, Number(storedCoarseActivity.startedAt)),
        endsAt: Math.max(Number(storedCoarseActivity.startedAt), Number(storedCoarseActivity.endsAt)),
        fromXNorm: clamp(Number(storedCoarseActivity.fromXNorm) || spawnX, 0.08, 0.92),
        fromYNorm: clamp(Number(storedCoarseActivity.fromYNorm) || spawnY, 0.14, 0.8),
        toXNorm: clamp(Number(storedCoarseActivity.toXNorm) || spawnX, 0.08, 0.92),
        toYNorm: clamp(Number(storedCoarseActivity.toYNorm) || spawnY, 0.14, 0.8)
      }
    : null;
  return {
    id: String(fish.id || createId("fish")),
    speciesId: fish.speciesId,
    undeadTemplateSpeciesId: isCatalogUndeadShopSpecies(species)
      && storedUndeadTemplateSpecies
      && !isUndeadSpecies(storedUndeadTemplateSpecies)
      ? storedUndeadTemplateSpecies.id
      : null,
    name: typeof fish.name === "string" && fish.name.trim() ? fish.name : buildFishName(fish.speciesId, []),
    acquiredAt: Number.isFinite(fish.acquiredAt) ? fish.acquiredAt : now,
    tankAddedAt: Number.isFinite(fish.tankAddedAt) ? fish.tankAddedAt : (Number.isFinite(fish.acquiredAt) ? fish.acquiredAt : now),
    deadAt: Number.isFinite(fish.deadAt) ? fish.deadAt : null,
    zombieVariant: Boolean(fish.zombieVariant),
    // Predator combat is intentionally not resumed across reloads.
    zombieBiteStartedAt: null,
    zombieBiteLastBloodAt: null,
    zombieBiteAttackerId: null,
    zombieReviveAt: dead && hasDefinedFiniteNumber(fish.zombieReviveAt)
      ? Number(fish.zombieReviveAt)
      : null,
    zombieReviveSourceId: dead && typeof fish.zombieReviveSourceId === "string" && fish.zombieReviveSourceId.trim()
      ? fish.zombieReviveSourceId.trim()
      : null,
    decayStage: dead && ["fresh", "zombie", "skeleton"].includes(fish.decayStage) ? fish.decayStage : null,
    piranhaConsumptionStartedAt: dead && hasDefinedFiniteNumber(fish.piranhaConsumptionStartedAt)
      ? Number(fish.piranhaConsumptionStartedAt)
      : null,
    piranhaConsumptionEndsAt: dead && hasDefinedFiniteNumber(fish.piranhaConsumptionEndsAt)
      ? Number(fish.piranhaConsumptionEndsAt)
      : null,
    piranhaLastBloodAt: dead && hasDefinedFiniteNumber(fish.piranhaLastBloodAt)
      ? Number(fish.piranhaLastBloodAt)
      : null,
    piranhaAttackStartedAt: null,
    piranhaLastDamageAt: null,
    breedCooldownUntil: Number.isFinite(fish.breedCooldownUntil) ? fish.breedCooldownUntil : 0,
    healthUnits: rawHealthUnits === null
      ? maxHealthUnits
      : legacyHealthModel
        ? scaleLegacyFishHealthUnits(rawHealthUnits, maxHealthUnits)
        : clamp(rawHealthUnits, 0, maxHealthUnits),
    fedStreak: clamp(Math.round(Number(fish.fedStreak) || 0), 0, 999),
    missedMealsInRow: clamp(Math.round(Number(fish.missedMealsInRow) || 0), 0, 999),
    lastAteAt: Number.isFinite(Number(fish.lastAteAt)) ? Number(fish.lastAteAt) : 0,
    satiatedUntil: Number.isFinite(Number(fish.satiatedUntil)) ? Math.max(0, Number(fish.satiatedUntil)) : 0,
    personality: storedPersonality || pickedPersonality.personality,
    personalityRarity: storedPersonality ? sanitizePersonalityRarity(fish.personalityRarity) : pickedPersonality.rarity,
    relationships: sanitizeFishRelationships(fish.relationships),
    feedingMemory: sanitizeFeedingMemory(fish.feedingMemory, now),
    favoriteSpot: sanitizeFavoriteSpot(fish.favoriteSpot),
    residenceDecorId: typeof fish.residenceDecorId === "string" && fish.residenceDecorId ? fish.residenceDecorId : null,
    parentNames: Array.isArray(fish.parentNames) ? fish.parentNames.map((name) => String(name).slice(0, 40)).slice(0, 2) : [],
    celebratedAgeMilestones: Array.isArray(fish.celebratedAgeMilestones)
      ? fish.celebratedAgeMilestones.map((value) => Math.max(0, Math.floor(Number(value) || 0))).filter(Boolean).slice(0, 8)
      : [],
    visitedNeighborhoodIds: Array.isArray(fish.visitedNeighborhoodIds)
      ? fish.visitedNeighborhoodIds.map(String).filter(Boolean).slice(-64)
      : [],
    needs: sanitizeFishNeeds(fish.needs, fish, now),
    needsUpdatedAt: Number.isFinite(Number(fish.needsUpdatedAt)) ? Math.max(0, Number(fish.needsUpdatedAt)) : now,
    lastNeedEventAtByType: sanitizeFishNeedEventMap(fish.lastNeedEventAtByType),
    lastNeighborhoodMoveAt: Number.isFinite(Number(fish.lastNeighborhoodMoveAt)) ? Math.max(0, Number(fish.lastNeighborhoodMoveAt)) : 0,
    lastBoroughServiceAtByType: sanitizeFishNeedEventMap(fish.lastBoroughServiceAtByType),
    boroughServiceTargetDecorId: typeof fish.boroughServiceTargetDecorId === "string" ? fish.boroughServiceTargetDecorId : null,
    boroughServiceType: typeof fish.boroughServiceType === "string" ? fish.boroughServiceType : "",
    boroughServiceStartedAt: Number.isFinite(Number(fish.boroughServiceStartedAt)) ? Math.max(0, Number(fish.boroughServiceStartedAt)) : 0,
    boroughServiceSeatId: typeof fish.boroughServiceSeatId === "string" ? fish.boroughServiceSeatId : "",
    boroughServiceSeatUntil: Number.isFinite(Number(fish.boroughServiceSeatUntil)) ? Math.max(0, Number(fish.boroughServiceSeatUntil)) : 0,
    coarseActivity,
    lastCoarseSimulatedAt: Number.isFinite(Number(fish.lastCoarseSimulatedAt)) ? Math.max(0, Number(fish.lastCoarseSimulatedAt)) : 0,
    nextWasteAt: Number.isFinite(Number(fish.nextWasteAt)) ? Math.max(0, Number(fish.nextWasteAt)) : 0,
    disease: sanitizeBehaviorDiseaseSnapshot(fish.disease, now),
    behaviorSignals: sanitizeBehaviorSignals(fish.behaviorSignals, now),
    behaviorIntent: sanitizeBehaviorIntent(fish.behaviorIntent, now),
    foodRefusalUntil: Number.isFinite(Number(fish.foodRefusalUntil)) ? Math.max(0, Number(fish.foodRefusalUntil)) : 0,
    behaviorNextThinkAt: Number.isFinite(Number(fish.behaviorNextThinkAt)) ? Math.max(0, Number(fish.behaviorNextThinkAt)) : 0,
    relationshipNextCheckAt: Number.isFinite(Number(fish.relationshipNextCheckAt)) ? Math.max(0, Number(fish.relationshipNextCheckAt)) : 0,
    veryLowComfortStartedAt: Number.isFinite(Number(fish.veryLowComfortStartedAt)) ? Number(fish.veryLowComfortStartedAt) : 0,
    veryLowComfortEventDayKey: typeof fish.veryLowComfortEventDayKey === "string" ? fish.veryLowComfortEventDayKey : "",
    diseaseState: dead ? DISEASE_STATE_NONE : sanitizeDiseaseState(fish.diseaseState),
    diseaseType: typeof fish.diseaseType === "string" && fish.diseaseType.trim() ? fish.diseaseType.trim() : "",
    diseaseInfectedAt: Number.isFinite(Number(fish.diseaseInfectedAt)) ? Math.max(0, Number(fish.diseaseInfectedAt)) : 0,
    diseaseProgressMs: Math.max(0, Number(fish.diseaseProgressMs) || 0),
    diseaseLastProgressAt: Number.isFinite(Number(fish.diseaseLastProgressAt)) ? Math.max(0, Number(fish.diseaseLastProgressAt)) : 0,
    diseaseExposureLevel: clamp(Number(fish.diseaseExposureLevel) || 0, 0, DISEASE_EXPOSURE_MAX),
    diseaseRecoveryProgressMs: Math.max(0, Number(fish.diseaseRecoveryProgressMs) || 0),
    diseaseTreatedUntil: Number.isFinite(Number(fish.diseaseTreatedUntil)) ? Math.max(0, Number(fish.diseaseTreatedUntil)) : 0,
    diseaseLastDamageAt: Number.isFinite(Number(fish.diseaseLastDamageAt)) ? Math.max(0, Number(fish.diseaseLastDamageAt)) : 0,
    diseaseSource: typeof fish.diseaseSource === "string" ? fish.diseaseSource.trim() : "",
    temporaryImmunityUntil: Number.isFinite(Number(fish.temporaryImmunityUntil)) ? Math.max(0, Number(fish.temporaryImmunityUntil)) : 0,
    nextDiseaseCheckAt: Number.isFinite(Number(fish.nextDiseaseCheckAt)) ? Math.max(0, Number(fish.nextDiseaseCheckAt)) : 0,
    nextDiseaseSpreadCheckAt: Number.isFinite(Number(fish.nextDiseaseSpreadCheckAt)) ? Math.max(0, Number(fish.nextDiseaseSpreadCheckAt)) : 0,
    nextSymptomCheckAt: Number.isFinite(Number(fish.nextSymptomCheckAt)) ? Math.max(0, Number(fish.nextSymptomCheckAt)) : 0,
    nextGreenBubbleAt: Number.isFinite(Number(fish.nextGreenBubbleAt)) ? Math.max(0, Number(fish.nextGreenBubbleAt)) : 0,
    lastIllnessRiskDayKey: typeof fish.lastIllnessRiskDayKey === "string" ? fish.lastIllnessRiskDayKey : "",
    lastIllnessSignalAtByType: sanitizeDiseaseSignalMap(fish.lastIllnessSignalAtByType),
    glassTapStressEndsAt: Array.isArray(fish.glassTapStressEndsAt)
      ? fish.glassTapStressEndsAt
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((left, right) => left - right)
        .slice(-GLASS_TAP_STRESS_MAX_STACKS)
      : [],
    glassTapWindowStartedAt: Number.isFinite(Number(fish.glassTapWindowStartedAt)) ? Number(fish.glassTapWindowStartedAt) : 0,
    glassTapWindowCount: clamp(Math.floor(Number(fish.glassTapWindowCount) || 0), 0, GLASS_TAP_STRESS_TAP_THRESHOLD * GLASS_TAP_STRESS_MAX_STACKS),
    xNorm: spawnX,
    yNorm: spawnY,
    targetXNorm: clamp(Number(fish.targetXNorm) || randomSwimX(), 0.08, 0.92),
    targetYNorm: clamp(Number(fish.targetYNorm) || randomSwimY(), 0.14, 0.8),
    targetAt: Number.isFinite(fish.targetAt) ? fish.targetAt : Date.now() + species.targetMinMs + Math.random() * (species.targetMaxMs - species.targetMinMs),
    direction: Number(fish.direction) < 0 ? -1 : 1,
    swimSpeed,
    phase: clamp(Number(fish.phase) || Math.random(), 0, 1),
    motionLevel: clamp(Number(fish.motionLevel) || 0.18, 0.04, 1),
    wiggleClock: Number.isFinite(fish.wiggleClock) ? fish.wiggleClock : Math.random() * Math.PI * 2,
    appearanceVariant: normalizeFishAppearanceVariantIndex(fish.appearanceVariant, species, fish),
    scale: clamp(Number(fish.scale) || resolveFishBaseScale(fish.speciesId), FISH_SCALE_MIN, FISH_SCALE_MAX),
    behaviorSpeciesId: sanitizeFishBehaviorSpeciesId(fish.behaviorSpeciesId, fish.speciesId),
    fishColor: normalizeDecorColorSetting(fish.fishColor ?? fish.colorSetting ?? ""),
    fishColorize: normalizeDecorColorizeSetting(fish.fishColorize ?? false),
    hueShift: sanitizeFishHueShift(fish.hueShift),
    saturation: sanitizeFishSaturation(fish.saturation),
    brightness: sanitizeFishBrightness(fish.brightness),
    growthStartedAt: Number.isFinite(fish.growthStartedAt) ? fish.growthStartedAt : null,
    growthEndsAt: Number.isFinite(fish.growthEndsAt) ? fish.growthEndsAt : null,
    activity: fish.activity === "feeding"
      && species?.diet !== "detritus"
      && species?.diet !== "none"
      && !fish.zombieVariant
      ? "feeding"
      : "roam",
    feedingPelletId: typeof fish.feedingPelletId === "string" ? fish.feedingPelletId : null,
    comfortDamageProgressMs: Math.max(0, Number(fish.comfortDamageProgressMs) || 0),
    lastMealSlotKey: typeof fish.lastMealSlotKey === "string" ? fish.lastMealSlotKey : "",
    mealSlotFoodCount: clamp(Math.round(Number(fish.mealSlotFoodCount) || 0), 0, 999),
    tankLayer: baseTankLayer,
    desiredTankLayer,
    drawLayer: tankLayerToLegacy(baseTankLayer),
    desiredDrawLayer: tankLayerToLegacy(desiredTankLayer),
    hangoutDecorId: typeof fish.hangoutDecorId === "string" ? fish.hangoutDecorId : null,
    hangoutZoneType: typeof fish.hangoutZoneType === "string" ? fish.hangoutZoneType : null,
    entryStartedAt: Number.isFinite(fish.entryStartedAt) ? fish.entryStartedAt : null,
    entryDurationMs: Number.isFinite(fish.entryDurationMs) ? fish.entryDurationMs : 0,
    entryFromYNorm: Number.isFinite(fish.entryFromYNorm) ? clamp(fish.entryFromYNorm, 0.02, 0.18) : null,
    entrySplashTriggered: Boolean(fish.entrySplashTriggered),
    nextDetritusSnackAt: Number.isFinite(fish.nextDetritusSnackAt) ? fish.nextDetritusSnackAt : Date.now() + species.cleanupMinMs,
    displayDirection,
    displayAngle,
    turnStartedAt: Number.isFinite(fish.turnStartedAt) ? fish.turnStartedAt : null,
    turnDurationMs: Number.isFinite(fish.turnDurationMs) ? fish.turnDurationMs : 0,
    turnFromDirection: Number.isFinite(Number(fish.turnFromDirection))
      ? (Number(fish.turnFromDirection) < 0 ? -1 : 1)
      : displayDirection,
    turnToDirection: Number.isFinite(Number(fish.turnToDirection))
      ? (Number(fish.turnToDirection) < 0 ? -1 : 1)
      : displayDirection,
    turnFromAngle,
    turnToAngle,
    turnSpinDirection: Number.isFinite(Number(fish.turnSpinDirection))
      ? (Number(fish.turnSpinDirection) < 0 ? -1 : 1)
      : (displayDirection < 0 ? 1 : -1),
    caveState: typeof fish.caveState === "string" ? fish.caveState : null,
    caveDecorId: typeof fish.caveDecorId === "string" ? fish.caveDecorId : null,
    cavePortalId: typeof fish.cavePortalId === "string" ? fish.cavePortalId : null,
    caveTriggerId: typeof fish.caveTriggerId === "string" ? fish.caveTriggerId : null,
    caveSeatId: typeof fish.caveSeatId === "string" ? fish.caveSeatId : null,
    caveFrontLayer: Number.isFinite(Number(fish.caveFrontLayer)) ? clampTankLayer(Number(fish.caveFrontLayer)) : null,
    caveBackLayer: Number.isFinite(Number(fish.caveBackLayer)) ? clampTankLayer(Number(fish.caveBackLayer)) : null,
    caveApproachXNorm: Number.isFinite(Number(fish.caveApproachXNorm)) ? clamp(Number(fish.caveApproachXNorm), 0.08, 0.92) : null,
    caveApproachYNorm: Number.isFinite(Number(fish.caveApproachYNorm)) ? clamp(Number(fish.caveApproachYNorm), 0.14, 0.8) : null,
    caveEntryXNorm: Number.isFinite(Number(fish.caveEntryXNorm)) ? clamp(Number(fish.caveEntryXNorm), 0.08, 0.92) : null,
    caveEntryYNorm: Number.isFinite(Number(fish.caveEntryYNorm)) ? clamp(Number(fish.caveEntryYNorm), 0.14, 0.8) : null,
    caveInsideXNorm: Number.isFinite(Number(fish.caveInsideXNorm)) ? clamp(Number(fish.caveInsideXNorm), 0.08, 0.92) : null,
    caveInsideYNorm: Number.isFinite(Number(fish.caveInsideYNorm)) ? clamp(Number(fish.caveInsideYNorm), 0.14, 0.8) : null,
    caveInsideUntil: Number.isFinite(Number(fish.caveInsideUntil)) ? Number(fish.caveInsideUntil) : null,
    caveTriggerCooldownUntil: Number.isFinite(Number(fish.caveTriggerCooldownUntil)) ? Number(fish.caveTriggerCooldownUntil) : null,
    cavePathIndex: Number.isFinite(Number(fish.cavePathIndex)) ? Math.max(0, Math.floor(Number(fish.cavePathIndex))) : null,
    caveIdleTargetXNorm: Number.isFinite(Number(fish.caveIdleTargetXNorm)) ? clamp(Number(fish.caveIdleTargetXNorm), 0.08, 0.92) : null,
    caveIdleTargetYNorm: Number.isFinite(Number(fish.caveIdleTargetYNorm)) ? clamp(Number(fish.caveIdleTargetYNorm), 0.14, 0.8) : null,
    caveIdleTargetAt: Number.isFinite(Number(fish.caveIdleTargetAt)) ? Number(fish.caveIdleTargetAt) : null
  };
}

function sanitizeUnlockedFishSpecies(unlockedFishSpecies) {
  const source = Array.isArray(unlockedFishSpecies)
    ? unlockedFishSpecies
    : Array.isArray(unlockedFishSpecies?.species)
      ? unlockedFishSpecies.species
      : [];

  return source
    .map((value) => String(value || "").trim())
    .filter((value, index, entries) => value && runtime.fishMap.has(value) && entries.indexOf(value) === index);
}

function getDefaultUnlockedDecorKeys() {
  return runtime.decorCatalog
    .map((decor) => decor.key)
    .filter((key) => runtime.decorMap.has(key) && !getDecorUnlockRequirement(key));
}

function sanitizeUnlockedDecorKeys(unlockedDecorKeys) {
  const source = Array.isArray(unlockedDecorKeys)
    ? unlockedDecorKeys
    : Array.isArray(unlockedDecorKeys?.decor)
      ? unlockedDecorKeys.decor
      : [];
  const defaults = getDefaultUnlockedDecorKeys();
  return [
    ...defaults,
    ...source.map((value) => normalizeDecorKey(value))
  ].filter((value, index, entries) => value && runtime.decorMap.has(value) && entries.indexOf(value) === index);
}

function sanitizeHistory(feedHistory) {
  if (!feedHistory || typeof feedHistory !== "object") {
    return {};
  }

  const entries = Object.entries(feedHistory)
    .filter(([, value]) => value && (Number.isFinite(value.fedAt) || Number.isFinite(value.offeredAt)))
    .map(([key, value]) => [
      key,
      {
        fedAt: Number.isFinite(value.fedAt) ? value.fedAt : 0,
        offeredAt: Number.isFinite(value.offeredAt) ? Math.max(0, Number(value.offeredAt)) : 0,
        coinsEarned: Number.isFinite(value.coinsEarned) ? Math.max(0, Math.floor(value.coinsEarned)) : 0,
        fishIds: Array.isArray(value.fishIds)
          ? [...new Set(value.fishIds.map((fishId) => String(fishId || "")).filter(Boolean))]
          : [],
        offeredFishIds: Array.isArray(value.offeredFishIds)
          ? [...new Set(value.offeredFishIds.map((fishId) => String(fishId || "")).filter(Boolean))]
          : []
      }
    ]);

  return Object.fromEntries(entries);
}

function sanitizePoop(poop) {
  if (!poop || !Number.isFinite(poop.dueAt || poop.createdAt)) {
    return null;
  }

  const xNorm = clamp(Number(poop.xNorm) || 0.5, 0.06, 0.94);
  const tankLayer = Number.isFinite(Number(poop.tankLayer))
    ? clampTankLayer(poop.tankLayer)
    : undefined;
  const fallbackYNorm = tankLayer
    ? getTankLayerBottomBoundaryNorm(tankLayer)
    : getPoopFloorYNormAtXNorm(xNorm);
  const yNorm = clamp(
    Number.isFinite(Number(poop.yNorm))
      ? Number(poop.yNorm)
      : fallbackYNorm,
    0.14,
    0.98
  );

  return {
    id: String(poop.id || createId("poop")),
    fishId: String(poop.fishId || ""),
    dueAt: Number.isFinite(poop.dueAt) ? poop.dueAt : undefined,
    createdAt: Number.isFinite(poop.createdAt) ? poop.createdAt : undefined,
    xNorm,
    ...(tankLayer ? { tankLayer } : {}),
    yNorm,
    startYNorm: clamp(Number(poop.startYNorm) || 0.54, 0.18, 0.82),
    asset: resolveAppUrl(typeof poop.asset === "string" && poop.asset.trim() ? poop.asset : POOP_ASSET_PATH)
  };
}

function sanitizeFishEgg(egg) {
  if (!egg || typeof egg !== "object") {
    return null;
  }

  const speciesId = String(egg.speciesId || "").trim();
  if (!runtime.fishMap.has(speciesId)) {
    return null;
  }

  const createdAt = Number.isFinite(Number(egg.createdAt)) ? Number(egg.createdAt) : Date.now();
  const defaultHatchAt = createdAt + FISH_EGG_INCUBATION_MS;
  const hatchedAt = Number.isFinite(Number(egg.hatchedAt)) ? Number(egg.hatchedAt) : null;
  const storedHatchAt = Number.isFinite(Number(egg.hatchAt))
    ? Math.max(createdAt, Number(egg.hatchAt))
    : null;
  const hatchAt = hatchedAt
    ? (storedHatchAt || hatchedAt)
    : Math.max(storedHatchAt || defaultHatchAt, defaultHatchAt);
  const shellExpiresAt = Number.isFinite(Number(egg.shellExpiresAt))
    ? Number(egg.shellExpiresAt)
    : (hatchedAt ? hatchedAt + FISH_EGG_SHELL_LINGER_MS : null);
  const releasedAt = Number.isFinite(Number(egg.releasedAt))
    ? Math.max(createdAt, Number(egg.releasedAt))
    : null;
  const xNorm = clamp(Number(egg.xNorm) || 0.5, 0.08, 0.92);
  const tankLayer = Number.isFinite(Number(egg.tankLayer))
    ? clampTankLayer(egg.tankLayer)
    : DEFAULT_TANK_LAYER;
  const targetYNorm = clamp(
    Number.isFinite(Number(egg.yNorm))
      ? Number(egg.yNorm)
      : getPoopLayerTargetYNorm({ xNorm, tankLayer }, null, FISH_EGG_DRAW_WIDTH_MAX_PX),
    0.18,
    0.96
  );
  const startYNorm = clamp(
    Number.isFinite(Number(egg.startYNorm)) ? Number(egg.startYNorm) : Math.min(0.72, targetYNorm - 0.18),
    0.14,
    Math.max(0.16, targetYNorm)
  );
  const parentNames = Array.isArray(egg.parentNames)
    ? egg.parentNames.map((name) => sanitizeTankName(name, "")).filter(Boolean).slice(0, 2)
    : [];
  const fishColor = snapFishInheritanceColorToAvailable(egg.fishColor ?? egg.colorSetting ?? "");

  return {
    id: String(egg.id || createId("egg")),
    speciesId,
    parentNames,
    createdAt,
    hatchAt,
    hatchedAt,
    shellExpiresAt,
    releasedAt,
    fishColor,
    fishColorize: fishColor ? normalizeDecorColorizeSetting(egg.fishColorize ?? false) : false,
    xNorm,
    startYNorm,
    yNorm: targetYNorm,
    tankLayer
  };
}

function getPelletFloorYNormAtX(xNorm) {
  return clamp(
    getTankLayerBottomBoundaryNorm(TANK_DEPTH_LAYERS),
    0.18,
    0.96
  );
}

function sanitizeInventory(inventory) {
  if (!inventory || typeof inventory !== "object") {
    return {};
  }

  const nextInventory = {};
  for (const [key, value] of Object.entries(inventory)) {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    if (count > 0) {
      nextInventory[key] = count;
    }
  }

  return nextInventory;
}

function sanitizeDecorInventory(inventory) {
  if (!inventory || typeof inventory !== "object") {
    return {};
  }

  const nextInventory = {};
  for (const [key, value] of Object.entries(inventory)) {
    const decorKey = normalizeDecorKey(key);
    const count = Math.max(0, Math.floor(Number(value) || 0));
    if (decorKey && count > 0) {
      nextInventory[decorKey] = (nextInventory[decorKey] || 0) + count;
    }
  }

  return nextInventory;
}

function sanitizeDecorScaleDefaults(defaults) {
  if (!defaults || typeof defaults !== "object") {
    return {};
  }

  const nextDefaults = {};
  for (const [key, value] of Object.entries(defaults)) {
    const decorKey = normalizeDecorKey(key);
    if (!decorKey) {
      continue;
    }
    nextDefaults[decorKey] = clamp(Number(value) || resolveDecorBaseScale(decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  }
  return nextDefaults;
}

function sanitizeFishScaleDefaults(defaults) {
  if (!defaults || typeof defaults !== "object") {
    return {};
  }

  const nextDefaults = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (typeof key !== "string" || !key.trim()) {
      continue;
    }
    nextDefaults[key] = clamp(Number(value) || resolveFishBaseScale(key), FISH_SCALE_MIN, FISH_SCALE_MAX);
  }
  return nextDefaults;
}

function normalizeBubblerDirection(value) {
  const direction = String(value || "").trim().toLowerCase();
  return BUBBLER_DIRECTION_OPTIONS.some((option) => option.id === direction)
    ? direction
    : DEFAULT_CUSTOM_BUBBLER_DIRECTION;
}

function createDefaultBubblerSettings(seed = null) {
  const source = seed && typeof seed === "object" ? seed : {};
  const amount = clamp(
    Number(source.amount ?? source.intensity) || DEFAULT_CUSTOM_BUBBLER_AMOUNT,
    MIN_CUSTOM_BUBBLER_AMOUNT,
    MAX_BUBBLER_INTENSITY
  );
  const width = clamp(
    Number(source.width ?? source.spread) || DEFAULT_BUBBLER_SPREAD_PX,
    MIN_CUSTOM_BUBBLER_WIDTH_PX,
    MAX_CUSTOM_BUBBLER_WIDTH_PX
  );
  const distance = clamp(
    Number(source.distance ?? source.fadeDistance) || DEFAULT_BUBBLER_FADE_DISTANCE_PX,
    MIN_CUSTOM_BUBBLER_DISTANCE_PX,
    MAX_CUSTOM_BUBBLER_DISTANCE_PX
  );
  const bubbleColor = normalizeDecorColorSetting(source.bubbleColor ?? source.color) || DEFAULT_BUBBLER_BUBBLE_COLOR;
  const bubbleColorize = normalizeDecorColorizeSetting(
    source.bubbleColorize
    ?? source.colorize
    ?? source.bubbleColorized
    ?? source.colorized
    ?? false
  );
  const bubbleSize = clamp(
    Number(source.bubbleSize ?? source.size ?? source.radiusScale) || DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE,
    MIN_CUSTOM_BUBBLER_BUBBLE_SIZE,
    MAX_CUSTOM_BUBBLER_BUBBLE_SIZE
  );
  const bubbleOpacity = clamp(
    Number(source.bubbleOpacity ?? source.opacity ?? source.alpha) || DEFAULT_BUBBLER_BUBBLE_OPACITY,
    MIN_CUSTOM_BUBBLER_OPACITY,
    MAX_CUSTOM_BUBBLER_OPACITY
  );
  const rawFillTintEnabled = source.bubbleFillTintEnabled
    ?? source.insideTintEnabled
    ?? source.tintInside
    ?? source.fillTintEnabled;
  const bubbleFillTintEnabled = typeof rawFillTintEnabled === "boolean"
    ? rawFillTintEnabled
    : rawFillTintEnabled === "false" || rawFillTintEnabled === "0"
      ? false
      : rawFillTintEnabled === "true" || rawFillTintEnabled === "1"
        ? true
        : DEFAULT_BUBBLER_FILL_TINT_ENABLED;
  const rawBubbleFillOpacity = Number(source.bubbleFillOpacity ?? source.insideTintOpacity ?? source.fillOpacity);
  const bubbleFillOpacity = clamp(
    Number.isFinite(rawBubbleFillOpacity) ? rawBubbleFillOpacity : DEFAULT_BUBBLER_FILL_OPACITY,
    0,
    1
  );
  const bubblePopEnabled = normalizeWallpaperEngineBooleanPropertyValue(
    source.bubblePopEnabled
    ?? source.popBubbles
    ?? source.pop
  ) ?? DEFAULT_BUBBLER_POP_ENABLED;
  const bubbleMalformed = normalizeWallpaperEngineBooleanPropertyValue(
    source.bubbleMalformed
    ?? source.malformedBubbles
    ?? source.malform
  ) ?? DEFAULT_BUBBLER_MALFORMED_ENABLED;
  const bubbleMalformedIntensity = clamp(
    Number.isFinite(Number(source.bubbleMalformedIntensity))
      ? Number(source.bubbleMalformedIntensity)
      : Number.isFinite(Number(source.malformIntensity))
        ? Number(source.malformIntensity)
        : DEFAULT_BUBBLER_MALFORMED_INTENSITY,
    MIN_BUBBLER_MALFORMED_INTENSITY,
    MAX_BUBBLER_MALFORMED_INTENSITY
  );
  const bubbleMalformedSpeed = clamp(
    Number.isFinite(Number(source.bubbleMalformedSpeed))
      ? Number(source.bubbleMalformedSpeed)
      : Number.isFinite(Number(source.malformSpeed))
        ? Number(source.malformSpeed)
        : DEFAULT_BUBBLER_MALFORMED_SPEED,
    MIN_BUBBLER_MALFORMED_SPEED,
    MAX_BUBBLER_MALFORMED_SPEED
  );
  return {
    amount,
    intensity: amount,
    speed: clamp(Number(source.speed) || DEFAULT_BUBBLER_SPEED, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED),
    direction: normalizeBubblerDirection(source.direction),
    width,
    spread: width,
    distance,
    fadeDistance: distance,
    bubbleColor,
    bubbleColors: [bubbleColor],
    bubbleColorize,
    bubbleSize,
    bubbleOpacity,
    bubbleFillTintEnabled,
    bubbleFillOpacity,
    bubblePopEnabled,
    bubbleMalformed,
    bubbleMalformedIntensity,
    bubbleMalformedSpeed
  };
}

function sanitizePlacedBubblerSettings(settings) {
  return createDefaultBubblerSettings(settings);
}

function sanitizePlacedDecorMotionSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return null;
  }

  const sanitized = {};
  if (Object.prototype.hasOwnProperty.call(settings, "swayIntensity")) {
    sanitized.swayIntensity = sanitizeCustomDecorMotionIntensity(settings.swayIntensity);
  }
  if (Object.prototype.hasOwnProperty.call(settings, "bobIntensity")) {
    sanitized.bobIntensity = sanitizeCustomDecorMotionIntensity(settings.bobIntensity);
  }
  if (Object.prototype.hasOwnProperty.call(settings, "swaySpeed")) {
    sanitized.swaySpeed = sanitizeDecorMotionSpeed(settings.swaySpeed);
  }
  if (Object.prototype.hasOwnProperty.call(settings, "bobSpeed")) {
    sanitized.bobSpeed = sanitizeDecorMotionSpeed(settings.bobSpeed);
  }
  if (Object.prototype.hasOwnProperty.call(settings, "swaySplitY")) {
    sanitized.swaySplitY = sanitizeCustomDecorMotionSplit(settings.swaySplitY);
  }
  if (Object.prototype.hasOwnProperty.call(settings, "swaySide")) {
    sanitized.swaySide = normalizeDecorSwaySide(settings.swaySide);
  }
  return Object.keys(sanitized).length ? sanitized : null;
}

function normalizeDecorXAnchorMode(value) {
  return value === DECOR_X_ANCHOR_MODE_CENTER_OFFSET ? value : "";
}

function normalizeDecorYAnchorMode(value) {
  return DECOR_Y_ANCHOR_MODES.includes(value) ? value : "";
}

function sanitizeDecorWorldAnchorDistance(value, minValue = -TANK_HEIGHT * 4, maxValue = TANK_HEIGHT * 4) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, minValue, maxValue) : null;
}

function sanitizeDecorYAnchorValue(value, mode) {
  if (mode === DECOR_Y_ANCHOR_MODE_COLUMN_FRACTION) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : null;
  }
  return sanitizeDecorWorldAnchorDistance(value);
}

function getPlacedDecorDefaultYAnchorMode(item) {
  const capabilities = getDecorMotionCapabilities(item);
  return capabilities.isFloating || capabilities.isLure
    ? DECOR_Y_ANCHOR_MODE_TOP_GAP
    : DECOR_Y_ANCHOR_MODE_BOTTOM_GAP;
}

function getSanitizedPlacedDecorWorldAnchors(item) {
  const xAnchorMode = normalizeDecorXAnchorMode(item?.xAnchorMode);
  const yAnchorMode = normalizeDecorYAnchorMode(item?.yAnchorMode);
  const xCenterOffsetWorld = sanitizeDecorWorldAnchorDistance(item?.xCenterOffsetWorld, -TANK_WIDTH * 2, TANK_WIDTH * 2);
  const yAnchorValue = sanitizeDecorYAnchorValue(item?.yAnchorValue, yAnchorMode);
  if (!xAnchorMode || !yAnchorMode || xCenterOffsetWorld === null || yAnchorValue === null) {
    return null;
  }
  return {
    xAnchorMode,
    xCenterOffsetWorld,
    yAnchorMode,
    yAnchorValue
  };
}

function sanitizePlacedDecor(item) {
  if (!item || typeof item.decorKey !== "string") {
    return null;
  }

  const decorKey = normalizeDecorKey(item.decorKey);
  if (!decorKey) {
    return null;
  }

  const sanitized = {
    id: String(item.id || createId("placed")),
    decorKey,
    xNorm: clamp(Number(item.xNorm) || 0.5, 0, 1),
    yNorm: clamp(Number(item.yNorm) || 0.86, 0, 1),
    scale: clamp(Number(item.scale) || resolveDecorBaseScale(decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    tankLayer: clampTankLayer(Number(item.tankLayer) || DEFAULT_TANK_LAYER),
    flipped: item.flipped === true,
    flippedY: item.flippedY === true
  };
  if (Object.prototype.hasOwnProperty.call(item, "freePlacementEnabled")) {
    sanitized.freePlacementEnabled = item.freePlacementEnabled === true;
  }
  const groupId = normalizeDecorGroupId(item.groupId);
  if (groupId) {
    sanitized.groupId = groupId;
  }
  if (item.bubblerSettings || isCustomBubblerDecorKey(decorKey)) {
    sanitized.bubblerSettings = sanitizePlacedBubblerSettings(item.bubblerSettings);
  }
  const decorSettings = sanitizePlacedDecorMotionSettings(item.decorSettings);
  if (decorSettings) {
    sanitized.decorSettings = decorSettings;
  }
  if (isCaveDecorKey(decorKey) && item.caveSettings) {
    sanitized.caveSettings = sanitizePlacedCaveSettings(item.caveSettings);
  }
  const caveColorSettings = sanitizePlacedCaveColorSettings(item.caveColorSettings, decorKey);
  if (caveColorSettings) {
    sanitized.caveColorSettings = caveColorSettings;
  }
  const worldAnchors = getSanitizedPlacedDecorWorldAnchors(item);
  if (worldAnchors) {
    Object.assign(sanitized, worldAnchors);
  }
  if (decorKey === "transit-tube.png") {
    sanitized.transitTubeName = sanitizeTankName(item.transitTubeName, "Transit Tube");
    sanitized.transitTubeColor = normalizeDecorColorSetting(item.transitTubeColor || "");
    const linkedId = String(item.transitTubeLinkedId || "").trim();
    if (linkedId && linkedId !== sanitized.id) {
      sanitized.transitTubeLinkedId = linkedId;
    }
  }
  return sanitized;
}

function normalizePlacedDecorState(targetState = state) {
  if (!targetState || !Array.isArray(targetState.placedDecor) || !targetState.placedDecor.length || !runtime.images.size) {
    return false;
  }

  let changed = false;
  const nextPlacedDecor = targetState.placedDecor
    .map((item) => sanitizePlacedDecor(item))
    .filter(Boolean);

  if (nextPlacedDecor.length !== targetState.placedDecor.length) {
    changed = true;
  }

  const processedGroupIds = new Set();
  for (const item of nextPlacedDecor) {
    const groupId = normalizeDecorGroupId(item?.groupId);
    if (groupId) {
      if (processedGroupIds.has(groupId)) {
        continue;
      }

      const groupItems = nextPlacedDecor.filter((entry) => normalizeDecorGroupId(entry?.groupId) === groupId);
      processedGroupIds.add(groupId);
      if (groupItems.length > 1) {
        changed = syncDecorGroupToLargestResizeAnchor(groupItems, { deriveMissing: true }) || changed;
        continue;
      }
    }

    const normalizedLayer = getDecorFrontLayer(item.decorKey, item.tankLayer);
    const previousLayer = item.tankLayer;
    item.tankLayer = normalizedLayer;
    const hadResizeAnchor = hasPlacedDecorResizeAnchor(item);
    const placement = hadResizeAnchor
      ? (resolvePlacedDecorPositionFromResizeAnchor(item) || clampDecorPlacement(item.xNorm, item.yNorm, { item }))
      : clampDecorPlacement(item.xNorm, item.yNorm, { item });
    if (
      normalizedLayer !== previousLayer
      || Math.abs(placement.xNorm - item.xNorm) > 0.000001
      || Math.abs(placement.yNorm - item.yNorm) > 0.000001
    ) {
      changed = true;
    }

    item.xNorm = placement.xNorm;
    item.yNorm = placement.yNorm;
    item.tankLayer = normalizedLayer;
    if (!hadResizeAnchor) {
      changed = true;
    }
    changed = updatePlacedDecorResizeAnchor(item) || changed;
  }

  if (!changed) {
    return false;
  }

  targetState.placedDecor = nextPlacedDecor;
  if (Array.isArray(targetState.gravelLivePebbles)) {
    targetState.gravelLivePebbles = reconcileLooseGravelPebbles(targetState.gravelLivePebbles, targetState.placedDecor);
  }
  return true;
}

function clampTankLayer(layer) {
  const numericLayer = Number(layer);
  const fallbackLayer = layer === null || layer === undefined || layer === "" || !Number.isFinite(numericLayer);
  return clamp(Math.round(fallbackLayer ? DEFAULT_TANK_LAYER : numericLayer), 1, TANK_DEPTH_LAYERS);
}

function getViewportPxAsTankVirtual(px) {
  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  return (Math.max(0, Number(px) || 0) * dpr) / scale;
}

function getScenePxAsTankVirtual(px) {
  const dpr = getStageRenderDevicePixelRatio();
  const referenceScale = getEditAwareViewportStableReferenceScale();
  return (Math.max(0, Number(px) || 0) * dpr) / Math.max(0.0001, referenceScale);
}

function getTankVirtualPxAsViewportPx(px) {
  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  return ((Number.isFinite(Number(px)) ? Number(px) : 0) * scale) / dpr;
}

function tankVirtualPointToStagePx(x, y) {
  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  const offsetX = Number(runtime.stageRenderOffsetX) || 0;
  const offsetY = Number(runtime.stageRenderOffsetY) || 0;
  return {
    x: ((Number(x) || 0) * scale + offsetX) / dpr,
    y: ((Number(y) || 0) * scale + offsetY) / dpr
  };
}

function hideSelectedDecorActionButtons() {
  for (const container of [
    dom.selectedDecorActionBar,
    dom.selectedDecorScaleControls,
    dom.selectedDecorLayerControls,
    dom.selectedDecorTransformControls,
    dom.selectedDecorResizeHandles,
    dom.selectedDecorResizeIndicator
  ]) {
    if (!container) {
      continue;
    }

    container.hidden = true;
    if (container === dom.selectedDecorResizeHandles) {
      container.setAttribute("aria-hidden", "true");
    }
    container.style.left = "";
    container.style.top = "";
  }

  for (const button of [
    dom.selectedDecorBuyAnotherButton,
    dom.selectedDecorSellButton,
    dom.selectedDecorStoreButton,
    dom.selectedDecorAssignButton,
    dom.selectedDecorSettingsButton,
    dom.selectedDecorScaleUpButton,
    dom.selectedDecorScaleDownButton,
    dom.selectedDecorLayerUpButton,
    dom.selectedDecorLayerDownButton,
    dom.selectedDecorFlipHorizontalButton,
    dom.selectedDecorFlipVerticalButton
  ]) {
    if (!button) {
      continue;
    }

    button.hidden = true;
    button.style.left = "";
    button.style.top = "";
    delete button.dataset.buyAnotherDecor;
    delete button.dataset.sellDecor;
    delete button.dataset.storeDecor;
    delete button.dataset.assignResidenceDecor;
    delete button.dataset.editDecorSettings;
    delete button.dataset.resizeDecor;
    delete button.dataset.layerDecor;
    delete button.dataset.flipDecor;
  }
}

function positionSelectedDecorResizeHandles(item, bounds, stageRect, options = {}) {
  const handlesContainer = dom.selectedDecorResizeHandles;
  const indicator = dom.selectedDecorResizeIndicator;
  const handles = Array.isArray(dom.selectedDecorResizeCornerHandles) ? dom.selectedDecorResizeCornerHandles : [];
  if (!item || !bounds || !stageRect?.width || !stageRect?.height) {
    if (handlesContainer) {
      handlesContainer.hidden = true;
      handlesContainer.setAttribute("aria-hidden", "true");
    }
    if (indicator) {
      indicator.hidden = true;
    }
    return;
  }

  const stagePadding = 8;
  const handleInset = Math.max(8, Number(options.padding) || 10);
  const cornerPoints = {
    nw: { x: bounds.left - handleInset, y: bounds.top - handleInset },
    ne: { x: bounds.right + handleInset, y: bounds.top - handleInset },
    sw: { x: bounds.left - handleInset, y: bounds.bottom + handleInset },
    se: { x: bounds.right + handleInset, y: bounds.bottom + handleInset }
  };

  if (handlesContainer) {
    handlesContainer.hidden = options.showHandles === false;
    handlesContainer.setAttribute("aria-hidden", options.showHandles === false ? "true" : "false");
  }
  for (const handle of handles) {
    const corner = handle?.dataset?.selectedDecorResizeCorner;
    const virtualPoint = cornerPoints[corner];
    if (!handle || !virtualPoint || options.showHandles === false) {
      if (handle) {
        handle.hidden = true;
      }
      continue;
    }
    const point = tankVirtualPointToStagePx(virtualPoint.x, virtualPoint.y);
    handle.hidden = false;
    handle.dataset.resizeDecor = item.id;
    handle.style.left = `${clamp(Math.round(point.x), stagePadding, Math.max(stagePadding, Math.round(stageRect.width - stagePadding)))}px`;
    handle.style.top = `${clamp(Math.round(point.y), stagePadding, Math.max(stagePadding, Math.round(stageRect.height - stagePadding)))}px`;
  }

  if (!indicator) {
    return;
  }
  if (options.showIndicator !== true) {
    indicator.hidden = true;
    return;
  }

  const label = options.label || formatDecorScale(item.scale);
  const indicatorPoint = tankVirtualPointToStagePx((bounds.left + bounds.right) / 2, bounds.top - 38);
  indicator.hidden = false;
  indicator.textContent = label;
  indicator.style.left = `${clamp(Math.round(indicatorPoint.x), 42, Math.max(42, Math.round(stageRect.width - 42)))}px`;
  indicator.style.top = `${clamp(Math.round(indicatorPoint.y), 18, Math.max(18, Math.round(stageRect.height - 18)))}px`;
}

function updateSelectedDecorActionButtons() {
  const actionBar = dom.selectedDecorActionBar;
  const scaleControls = dom.selectedDecorScaleControls;
  const layerControls = dom.selectedDecorLayerControls;
  const transformControls = dom.selectedDecorTransformControls;
  const buyButton = dom.selectedDecorBuyAnotherButton;
  const sellButton = dom.selectedDecorSellButton;
  const storeButton = dom.selectedDecorStoreButton;
  const assignButton = dom.selectedDecorAssignButton;
  const settingsButton = dom.selectedDecorSettingsButton;
  const scaleUpButton = dom.selectedDecorScaleUpButton;
  const scaleDownButton = dom.selectedDecorScaleDownButton;
  const layerUpButton = dom.selectedDecorLayerUpButton;
  const layerDownButton = dom.selectedDecorLayerDownButton;
  const flipHorizontalButton = dom.selectedDecorFlipHorizontalButton;
  const flipVerticalButton = dom.selectedDecorFlipVerticalButton;
  const resizeHandles = dom.selectedDecorResizeHandles;
  const resizeIndicator = dom.selectedDecorResizeIndicator;
  if (!buyButton && !sellButton && !storeButton && !assignButton && !settingsButton && !scaleUpButton && !scaleDownButton && !layerUpButton && !layerDownButton && !flipHorizontalButton && !flipVerticalButton && !resizeHandles && !resizeIndicator) {
    return;
  }

  const selectedItems = runtime.editTankMode
    && !runtime.dragState
    && !runtime.placementMode
    && !runtime.utilityOverlayOpen
    && !runtime.storeOverlayOpen
    && !runtime.settingsOverlayOpen
    && !runtime.equipmentOverlayOpen
    ? getSelectedPlacedDecorItems()
    : [];
  const item = selectedItems.length === 1 ? selectedItems[0] : null;
  const decorKey = item?.decorKey || "";
  const decor = decorKey ? runtime.decorMap.get(decorKey) : null;
  if (!item || !decor) {
    hideSelectedDecorActionButtons();
    return;
  }

  const bounds = getPlacedDecorOpaqueBounds(item);
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  if (!bounds || !stageRect?.width || !stageRect?.height) {
    hideSelectedDecorActionButtons();
    return;
  }

  const topPadding = 12;
  const stagePadding = 10;
  const cost = getDecorPurchaseCost(decorKey);
  const resaleValue = getResaleValue(decor.cost || 0);
  const canSell = !isPlacedDecorGrouped(item);
  const canStore = !isPlacedDecorGrouped(item);
  const currentScale = clamp(Number(item.scale) || getDecorScaleDefault(item.decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  const layerValue = formatDecorLayerSpanShort(item.decorKey, getDecorTankLayer(item));
  const canLayerUp = canStepPlacedDecorLayer(item, 1);
  const canLayerDown = canStepPlacedDecorLayer(item, -1);
  const layerIsFixed = !canLayerUp && !canLayerDown;
  const sizeLabel = formatDecorScale(currentScale);
  const resizingDecor = runtime.decorResizeState?.placedId === item.id;

  if (dom.selectedDecorSizeValue) {
    dom.selectedDecorSizeValue.textContent = sizeLabel;
  }

  if (dom.selectedDecorLayerValue) {
    dom.selectedDecorLayerValue.textContent = layerValue;
  }

  if (scaleControls) {
    scaleControls.hidden = true;
  }

  if (resizingDecor) {
    if (actionBar) {
      actionBar.hidden = true;
    }
    if (layerControls) {
      layerControls.hidden = true;
    }
    if (transformControls) {
      transformControls.hidden = true;
    }
    positionSelectedDecorResizeHandles(item, bounds, stageRect, {
      showHandles: false,
      showIndicator: true,
      label: sizeLabel
    });
    return;
  }

  if (buyButton) {
    buyButton.hidden = false;
    buyButton.dataset.buyAnotherDecor = decorKey;
    buyButton.disabled = state.coins < cost;
    buyButton.textContent = "BUY";
    buyButton.title = `Buy another for ${cost} ${pluralize("coin", cost)}`;
    buyButton.setAttribute("aria-label", state.coins < cost
      ? `Need ${cost} coins to buy another ${decor.name}`
      : `Buy another ${decor.name} for ${cost} coins`);
  }

  if (sellButton) {
    sellButton.hidden = false;
    sellButton.dataset.sellDecor = item.id;
    sellButton.disabled = !canSell;
    sellButton.textContent = "SELL";
    sellButton.title = canSell ? `Sell for ${resaleValue} ${pluralize("coin", resaleValue)}` : "Ungroup before selling";
    sellButton.setAttribute("aria-label", canSell ? `Sell ${decor.name} for ${resaleValue} coins` : `Ungroup ${decor.name} before selling`);
  }

  if (storeButton) {
    storeButton.hidden = false;
    storeButton.dataset.storeDecor = item.id;
    storeButton.disabled = !canStore;
    storeButton.textContent = "PUT AWAY";
    storeButton.title = canStore ? `Store ${decor.name}` : "Ungroup before storing";
    storeButton.setAttribute("aria-label", canStore ? `Store ${decor.name}` : `Ungroup ${decor.name} before storing`);
  }

  if (assignButton) {
    const canAssignResidence = isDecorResidenceEligible(item);
    const residentCount = getDecorResidents(item.id).length;
    const residenceCapacity = getDecorResidenceCapacity(item);
    assignButton.hidden = !canAssignResidence;
    assignButton.dataset.assignResidenceDecor = item.id;
    assignButton.disabled = !canAssignResidence;
    assignButton.textContent = residentCount ? `HOME ${residentCount}/${residenceCapacity}` : "ASSIGN";
    assignButton.title = residentCount
      ? `Manage ${decor.name} residents (${residentCount}/${residenceCapacity})`
      : `Assign a fish to live at ${decor.name}`;
    assignButton.setAttribute("aria-label", assignButton.title);
  }

  if (settingsButton) {
    const canOpenSettings = canOpenDecorSettings(item);
    settingsButton.hidden = !canOpenSettings;
    settingsButton.dataset.editDecorSettings = item.id;
    settingsButton.disabled = !canOpenSettings;
    settingsButton.textContent = "(S)ETTINGS";
    settingsButton.title = `Open ${decor.name} settings`;
    settingsButton.setAttribute("aria-label", `Open ${decor.name} settings`);
  }

  if (scaleUpButton) {
    scaleUpButton.hidden = true;
    delete scaleUpButton.dataset.resizeDecor;
  }

  if (scaleDownButton) {
    scaleDownButton.hidden = true;
    delete scaleDownButton.dataset.resizeDecor;
  }

  if (layerUpButton) {
    layerUpButton.hidden = false;
    layerUpButton.dataset.layerDecor = item.id;
    layerUpButton.disabled = !canLayerUp;
    layerUpButton.title = canLayerUp
      ? `Move layer up from ${layerValue}`
      : (layerIsFixed ? `${decor.name} is fixed at layer ${layerValue}` : `${decor.name} is already at its top layer`);
    layerUpButton.setAttribute("aria-label", canLayerUp
      ? `Move ${decor.name} layer up from ${layerValue}`
      : (layerIsFixed ? `${decor.name} is fixed at layer ${layerValue}` : `${decor.name} is already at its top layer`));
  }

  if (layerDownButton) {
    layerDownButton.hidden = false;
    layerDownButton.dataset.layerDecor = item.id;
    layerDownButton.disabled = !canLayerDown;
    layerDownButton.title = canLayerDown
      ? `Move layer down from ${layerValue}`
      : (layerIsFixed ? `${decor.name} is fixed at layer ${layerValue}` : `${decor.name} is already at its bottom layer`);
    layerDownButton.setAttribute("aria-label", canLayerDown
      ? `Move ${decor.name} layer down from ${layerValue}`
      : (layerIsFixed ? `${decor.name} is fixed at layer ${layerValue}` : `${decor.name} is already at its bottom layer`));
  }

  if (flipHorizontalButton) {
    flipHorizontalButton.hidden = false;
    flipHorizontalButton.dataset.flipDecor = item.id;
    flipHorizontalButton.setAttribute("aria-pressed", String(isDecorHorizontallyFlipped(item)));
    flipHorizontalButton.title = isDecorHorizontallyFlipped(item) ? "Clear horizontal flip" : "Flip horizontally";
  }

  if (flipVerticalButton) {
    flipVerticalButton.hidden = false;
    flipVerticalButton.dataset.flipDecor = item.id;
    flipVerticalButton.setAttribute("aria-pressed", String(isDecorVerticallyFlipped(item)));
    flipVerticalButton.title = isDecorVerticallyFlipped(item) ? "Clear vertical flip" : "Flip vertically";
  }

  if (actionBar) {
    actionBar.hidden = false;
    const actionPoint = tankVirtualPointToStagePx((bounds.left + bounds.right) / 2, bounds.top - 24);
    const actionRect = actionBar.getBoundingClientRect?.() || { width: 0, height: 0 };
    const actionHalfWidth = Math.ceil((Number(actionRect.width) || 320) / 2);
    const actionHalfHeight = Math.ceil((Number(actionRect.height) || 44) / 2);
    actionBar.style.left = `${clamp(
      Math.round(actionPoint.x),
      stagePadding + actionHalfWidth,
      Math.max(stagePadding + actionHalfWidth, Math.round(stageRect.width - stagePadding - actionHalfWidth))
    )}px`;
    actionBar.style.top = `${clamp(
      Math.round(actionPoint.y),
      topPadding + actionHalfHeight,
      Math.max(topPadding + actionHalfHeight, Math.round(stageRect.height - topPadding - actionHalfHeight))
    )}px`;
  }

  if (layerControls) {
    layerControls.hidden = false;
    const layerPoint = tankVirtualPointToStagePx(bounds.right + 34, (bounds.top + bounds.bottom) / 2);
    const layerRect = layerControls.getBoundingClientRect?.() || { width: 0, height: 0 };
    const layerHalfWidth = Math.ceil((Number(layerRect.width) || 58) / 2);
    const layerHalfHeight = Math.ceil((Number(layerRect.height) || 124) / 2);
    layerControls.style.left = `${clamp(
      Math.round(layerPoint.x),
      stagePadding + layerHalfWidth,
      Math.max(stagePadding + layerHalfWidth, Math.round(stageRect.width - stagePadding - layerHalfWidth))
    )}px`;
    layerControls.style.top = `${clamp(
      Math.round(layerPoint.y),
      topPadding + layerHalfHeight,
      Math.max(topPadding + layerHalfHeight, Math.round(stageRect.height - topPadding - layerHalfHeight))
    )}px`;
  }

  if (transformControls) {
    transformControls.hidden = false;
    const transformPoint = tankVirtualPointToStagePx(bounds.left - 34, (bounds.top + bounds.bottom) / 2);
    const transformRect = transformControls.getBoundingClientRect?.() || { width: 0, height: 0 };
    const transformHalfWidth = Math.ceil((Number(transformRect.width) || 58) / 2);
    const transformHalfHeight = Math.ceil((Number(transformRect.height) || 96) / 2);
    transformControls.style.left = `${clamp(
      Math.round(transformPoint.x),
      stagePadding + transformHalfWidth,
      Math.max(stagePadding + transformHalfWidth, Math.round(stageRect.width - stagePadding - transformHalfWidth))
    )}px`;
    transformControls.style.top = `${clamp(
      Math.round(transformPoint.y),
      topPadding + transformHalfHeight,
      Math.max(topPadding + transformHalfHeight, Math.round(stageRect.height - topPadding - transformHalfHeight))
    )}px`;
  }

  positionSelectedDecorResizeHandles(item, bounds, stageRect, {
    showHandles: true,
    showIndicator: false,
    label: sizeLabel
  });
}

function getNormalCoverStageRenderMetrics() {
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const width = Number(stageRect?.width) || 0;
  const height = Number(stageRect?.height) || 0;
  if (width <= 0 || height <= 0) {
    return null;
  }

  const dpr = getStageRenderDevicePixelRatio();
  const displayWidth = Math.max(1, dom.tankCanvas?.width || Math.round(width * dpr));
  const displayHeight = Math.max(1, dom.tankCanvas?.height || Math.round(height * dpr));
  const scale = Math.max(displayWidth / TANK_WIDTH, displayHeight / TANK_HEIGHT);
  const offsetX = (displayWidth - TANK_WIDTH * scale) * 0.5;
  const offsetY = (displayHeight - TANK_HEIGHT * scale) * 0.5;
  const left = clamp((-offsetX) / scale, 0, TANK_WIDTH);
  const top = clamp((-offsetY) / scale, 0, TANK_HEIGHT);
  const right = clamp((displayWidth - offsetX) / scale, left, TANK_WIDTH);
  const bottom = clamp((displayHeight - offsetY) / scale, top, TANK_HEIGHT);

  return {
    dpr,
    displayWidth,
    displayHeight,
    scale,
    offsetX,
    offsetY,
    visibleBounds: { left, top, right, bottom }
  };
}

function getEditAwareViewportStableReferenceScale() {
  const dpr = getStageRenderDevicePixelRatio();
  const currentScale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  if ((Number(runtime.stageEditViewAmount) || 0) <= 0.001) {
    return currentScale;
  }

  return Math.max(0.0001, Number(getNormalCoverStageRenderMetrics()?.scale) || currentScale);
}

function getViewportStableAssetScale() {
  const dpr = getStageRenderDevicePixelRatio();
  const referenceScale = getEditAwareViewportStableReferenceScale();
  return (dpr / referenceScale) * getResponsiveViewportAssetScale();
}

function getViewportStableObjectScale(type = "fish") {
  const dpr = getStageRenderDevicePixelRatio();
  const referenceScale = getEditAwareViewportStableReferenceScale();
  return (dpr / referenceScale) * getResponsiveViewportObjectScale(type);
}

function getResponsiveViewportScale(minScale = 1) {
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const width = Number(stageRect?.width) || 0;
  const height = Number(stageRect?.height) || 0;
  if (!width || !height) {
    return 1;
  }

  const aspectRatio = width / height;
  const aspectNormalized = clamp(
    (aspectRatio - NARROW_STAGE_ASPECT_RATIO)
    / Math.max(0.0001, TARGET_STAGE_ASPECT_RATIO - NARROW_STAGE_ASPECT_RATIO),
    0,
    1
  );
  const widthNormalized = clamp(width / TANK_WIDTH, 0, 1);
  const responsiveness = Math.min(aspectNormalized, widthNormalized);
  return minScale + (1 - minScale) * responsiveness;
}

function getResponsiveViewportAssetScale() {
  return getResponsiveViewportScale(MIN_VIEWPORT_ASSET_SCALE);
}

function isMobilePageRuntime() {
  return typeof document !== "undefined" && document.documentElement?.dataset?.mobilePage === "true";
}

function getMobileViewportObjectScaleMultiplier(type = "fish") {
  if (!isMobilePageRuntime()) {
    return 1;
  }

  return MOBILE_VIEWPORT_OBJECT_SCALE_MULTIPLIERS[type]
    || MOBILE_VIEWPORT_OBJECT_SCALE_MULTIPLIERS.fish
    || 1;
}

function getResponsiveViewportObjectScale(type = "fish") {
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const width = Number(stageRect?.width) || 0;
  const height = Number(stageRect?.height) || 0;
  if (!width || !height) {
    return 1;
  }

  const profile = VIEWPORT_OBJECT_SCALE_PROFILES[type] || VIEWPORT_OBJECT_SCALE_PROFILES.fish;
  const viewportAreaScale = Math.sqrt((width * height) / (TANK_WIDTH * TANK_HEIGHT));
  const aspectRatio = width / height;
  const aspectComfort = clamp(
    (aspectRatio - NARROW_STAGE_ASPECT_RATIO)
    / Math.max(0.0001, TARGET_STAGE_ASPECT_RATIO - NARROW_STAGE_ASPECT_RATIO),
    0,
    1
  );
  const narrowLimit = VIEWPORT_OBJECT_NARROW_LIMIT_MIN
    + (1 - VIEWPORT_OBJECT_NARROW_LIMIT_MIN) * aspectComfort;
  const shortLimit = clamp(height / TANK_HEIGHT, VIEWPORT_OBJECT_SHORT_LIMIT_MIN, 1);
  const baseScale = clamp(
    viewportAreaScale * Math.min(narrowLimit, shortLimit),
    profile.min,
    profile.max
  );

  if (!isMobilePageRuntime()) {
    return baseScale;
  }

  return clamp(
    baseScale * getMobileViewportObjectScaleMultiplier(type),
    MOBILE_VIEWPORT_OBJECT_SCALE_MIN,
    profile.max
  );
}

function getAquariumPhysicalAssetScale(type = "fish") {
  // Keep monitor and device metrics out of asset sizing. Screen-stable sizing
  // is handled separately by the viewport scale helpers.
  return type === "decor" ? DECOR_WORLD_SIZE_MULTIPLIER : FISH_WORLD_SIZE_MULTIPLIER;
}

function getAquariumWorldMetrics() {
  const dpr = getStageRenderDevicePixelRatio();
  const editAmount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  const normalView = editAmount > 0.001 ? getNormalCoverStageRenderMetrics() : null;
  const visibleBounds = normalView?.visibleBounds || getVisibleTankVirtualBounds();
  const scale = Math.max(0.0001, Number(normalView?.scale) || Number(runtime.stageRenderScale) || dpr);
  const offsetY = Number.isFinite(Number(normalView?.offsetY))
    ? Number(normalView.offsetY)
    : (Number(runtime.stageRenderOffsetY) || 0);
  const waterlineY = clamp(
    (WATER_SURFACE_VIEWPORT_TOP_PX * dpr - offsetY) / scale,
    visibleBounds.top,
    Math.max(visibleBounds.top, visibleBounds.bottom - 36)
  );
  const floorBottomY = visibleBounds.bottom;
  const gravelHeight = clamp(
    getTargetVisibleGravelHeightVirtual(),
    24,
    Math.max(24, floorBottomY - waterlineY - 28)
  );
  const gravelTopY = floorBottomY - gravelHeight;
  const tankCenterX = (visibleBounds.left + visibleBounds.right) * 0.5;
  const layerFloorByLayer = Array.from({ length: TANK_DEPTH_LAYERS }, (_, index) => {
    const layer = index + 1;
    const gravelOffset = getTankLayerBottomGravelOffsetPx(layer);
    return clamp(gravelTopY + gravelOffset, waterlineY + 38, floorBottomY - 14);
  });
  return {
    waterlineY,
    floorBottomY,
    gravelTopY,
    gravelHeight,
    tankCenterX,
    layerFloorByLayer,
    getLayerFloorY(layer) {
      return layerFloorByLayer[clampTankLayer(layer) - 1];
    }
  };
}

function getViewportAnchoredWaterSurfaceY() {
  return getAquariumWorldMetrics().waterlineY;
}

function syncViewportAnchoredWaterSurface() {
  const nextWaterSurfaceY = getViewportAnchoredWaterSurfaceY();
  const changed = Math.abs(nextWaterSurfaceY - WATER_SURFACE_Y) > 0.01;
  WATER_SURFACE_Y = nextWaterSurfaceY;
  return changed;
}

function getDecorDisplayWidth(decor, itemOrScale = 1) {
  if (!decor) {
    return 0;
  }

  const scale = typeof itemOrScale === "number"
    ? itemOrScale
    : Number(itemOrScale?.scale);
  return decor.width
    * (Number.isFinite(scale) ? scale : 1)
    * getViewportStableObjectScale("decor")
    * getAquariumPhysicalAssetScale("decor");
}

function getDecorPreviewPaneWidth(decor, itemOrScale = 1) {
  const worldWidth = getDecorDisplayWidth(decor, itemOrScale);
  return Math.max(1, Math.round(getTankVirtualPxAsViewportPx(worldWidth)));
}

function getTankLayerBottomGravelOffsetPx(layer) {
  const normalizedLayer = clampTankLayer(layer);
  return LAYER_BOTTOM_GRAVEL_SURFACE_OFFSET_PX + (TANK_DEPTH_LAYERS - normalizedLayer) * LAYER_BOTTOM_GRAVEL_STEP_PX;
}

function getTankLayerBottomBoundaryY(layer) {
  return getAquariumWorldMetrics().getLayerFloorY(layer);
}

function getTankLayerBottomBoundaryNorm(layer) {
  return getTankLayerBottomBoundaryY(layer) / TANK_HEIGHT;
}

function hasPlacedDecorResizeAnchor(item) {
  return Boolean(
    item
    && normalizeDecorXAnchorMode(item.xAnchorMode) === DECOR_X_ANCHOR_MODE_CENTER_OFFSET
    && sanitizeDecorWorldAnchorDistance(item.xCenterOffsetWorld, -TANK_WIDTH * 2, TANK_WIDTH * 2) !== null
    && normalizeDecorYAnchorMode(item.yAnchorMode)
    && sanitizeDecorYAnchorValue(item.yAnchorValue, item.yAnchorMode) !== null
  );
}

function getPlacedDecorRelativeOpaqueBounds(item) {
  if (!item) {
    return null;
  }

  const bounds = getPlacedDecorPlacementBounds(item);
  if (!bounds) {
    return null;
  }

  const anchorX = item.xNorm * TANK_WIDTH;
  const anchorY = item.yNorm * TANK_HEIGHT;
  return {
    left: bounds.left - anchorX,
    right: bounds.right - anchorX,
    top: bounds.top - anchorY,
    bottom: bounds.bottom - anchorY
  };
}

function getPlacedDecorPlacementBounds(item) {
  const fullBounds = getPlacedDecorBounds(item);
  const opaqueBounds = getPlacedDecorOpaqueBounds(item) || fullBounds;
  if (!opaqueBounds) {
    return fullBounds;
  }
  if (!fullBounds) {
    return opaqueBounds;
  }

  return {
    left: opaqueBounds.left,
    right: opaqueBounds.right,
    top: fullBounds.top,
    // Use the visible art as the placement foot; some decor PNGs have transparent bottom padding.
    bottom: opaqueBounds.bottom
  };
}

function getPlacedDecorVisualArea(item) {
  if (!item) {
    return 0;
  }

  const bounds = getPlacedDecorOpaqueBounds(item) || getPlacedDecorBounds(item);
  if (bounds) {
    return Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
  }

  const decor = runtime.decorMap.get(item.decorKey);
  const width = decor ? getDecorDisplayWidth(decor, item) : 0;
  return width * width;
}

function getLargestDecorGroupItem(items) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .reduce((largest, item) => (
      !largest || getPlacedDecorVisualArea(item) > getPlacedDecorVisualArea(largest)
        ? item
        : largest
    ), null);
}

function getDecorGroupRootMetrics(item) {
  if (!item) {
    return null;
  }

  const bounds = getPlacedDecorPlacementBounds(item) || getPlacedDecorBounds(item);
  const anchorX = item.xNorm * TANK_WIDTH;
  const anchorY = item.yNorm * TANK_HEIGHT;
  const width = Math.max(1, bounds ? bounds.right - bounds.left : 1);
  const height = Math.max(1, bounds ? bounds.bottom - bounds.top : 1);
  return {
    anchorX,
    anchorY,
    width,
    height
  };
}

function getDecorTopOverhangLimitY(relBounds, shellBounds = getTankShellBounds()) {
  if (!relBounds) {
    return shellBounds.innerTop;
  }

  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const decorHeight = Math.max(1, relBounds.bottom - relBounds.top);
  return Math.max(
    shellBounds.innerTop,
    visibleBounds.top - decorHeight * 0.25
  );
}

function roundDecorWorldAnchorValue(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function updatePlacedDecorResizeAnchor(item) {
  if (!item || !runtime.images.size) {
    return false;
  }

  const bounds = getPlacedDecorPlacementBounds(item);
  if (!bounds) {
    return false;
  }

  const metrics = getAquariumWorldMetrics();
  const nextXAnchorMode = DECOR_X_ANCHOR_MODE_CENTER_OFFSET;
  const nextYAnchorMode = getPlacedDecorDefaultYAnchorMode(item);
  const nextXCenterOffsetWorld = roundDecorWorldAnchorValue(item.xNorm * TANK_WIDTH - metrics.tankCenterX);
  let nextYAnchorValue = 0;
  if (nextYAnchorMode === DECOR_Y_ANCHOR_MODE_TOP_GAP) {
    nextYAnchorValue = roundDecorWorldAnchorValue(bounds.top - metrics.waterlineY);
  } else if (nextYAnchorMode === DECOR_Y_ANCHOR_MODE_COLUMN_FRACTION) {
    nextYAnchorValue = roundDecorWorldAnchorValue(
      clamp(
        ((item.yNorm * TANK_HEIGHT) - metrics.waterlineY) / Math.max(1, metrics.gravelTopY - metrics.waterlineY),
        0,
        1
      )
    );
  } else {
    nextYAnchorValue = roundDecorWorldAnchorValue(getTankLayerBottomBoundaryY(getDecorTankLayer(item)) - bounds.bottom);
  }

  const previousXAnchorMode = normalizeDecorXAnchorMode(item.xAnchorMode);
  const previousYAnchorMode = normalizeDecorYAnchorMode(item.yAnchorMode);
  const previousXCenterOffsetWorld = sanitizeDecorWorldAnchorDistance(item.xCenterOffsetWorld, -TANK_WIDTH * 2, TANK_WIDTH * 2);
  const previousYAnchorValue = sanitizeDecorYAnchorValue(item.yAnchorValue, previousYAnchorMode);
  const changed = previousXAnchorMode !== nextXAnchorMode
    || previousYAnchorMode !== nextYAnchorMode
    || previousXCenterOffsetWorld === null
    || previousYAnchorValue === null
    || Math.abs(previousXCenterOffsetWorld - nextXCenterOffsetWorld) > 0.001
    || Math.abs(previousYAnchorValue - nextYAnchorValue) > 0.001;

  item.xAnchorMode = nextXAnchorMode;
  item.xCenterOffsetWorld = nextXCenterOffsetWorld;
  item.yAnchorMode = nextYAnchorMode;
  item.yAnchorValue = nextYAnchorValue;
  return changed;
}

function resolvePlacedDecorPositionFromResizeAnchor(item) {
  if (!hasPlacedDecorResizeAnchor(item)) {
    return null;
  }

  const relBounds = getPlacedDecorRelativeOpaqueBounds(item);
  if (!relBounds) {
    return null;
  }

  const metrics = getAquariumWorldMetrics();
  const xCenterOffsetWorld = sanitizeDecorWorldAnchorDistance(item.xCenterOffsetWorld, -TANK_WIDTH * 2, TANK_WIDTH * 2);
  const yAnchorMode = normalizeDecorYAnchorMode(item.yAnchorMode);
  const yAnchorValue = sanitizeDecorYAnchorValue(item.yAnchorValue, yAnchorMode);
  if (xCenterOffsetWorld === null || !yAnchorMode || yAnchorValue === null) {
    return null;
  }

  const desiredX = metrics.tankCenterX + xCenterOffsetWorld;
  let desiredY = item.yNorm * TANK_HEIGHT;
  if (yAnchorMode === DECOR_Y_ANCHOR_MODE_TOP_GAP) {
    const desiredTop = metrics.waterlineY + yAnchorValue;
    desiredY = desiredTop - relBounds.top;
  } else if (yAnchorMode === DECOR_Y_ANCHOR_MODE_COLUMN_FRACTION) {
    desiredY = metrics.waterlineY + yAnchorValue * Math.max(1, metrics.gravelTopY - metrics.waterlineY);
  } else {
    const desiredBottom = getTankLayerBottomBoundaryY(getDecorTankLayer(item)) - yAnchorValue;
    desiredY = desiredBottom - relBounds.bottom;
  }

  return clampDecorPlacement(desiredX / TANK_WIDTH, desiredY / TANK_HEIGHT, { item });
}

function resolveSharedDecorGroupDelta(records, rawDeltaX, rawDeltaY) {
  const usableRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record?.item);
  if (!usableRecords.length) {
    return { deltaX: 0, deltaY: 0 };
  }

  const shellBounds = getTankShellBounds();
  const shellRight = shellBounds.innerLeft + shellBounds.innerWidth;
  const shellBottom = shellBounds.innerTop + shellBounds.innerHeight;
  let minDeltaX = -Infinity;
  let maxDeltaX = Infinity;
  let minDeltaY = -Infinity;
  let maxDeltaY = Infinity;

  for (const record of usableRecords) {
    const item = record.item;
    const tankLayer = clampTankLayer(record.tankLayer ?? item.tankLayer ?? DEFAULT_TANK_LAYER);
    const itemXNorm = Number(item.xNorm);
    const itemYNorm = Number(item.yNorm);
    const startXNorm = Number.isFinite(Number(record.startXNorm))
      ? Number(record.startXNorm)
      : Number.isFinite(itemXNorm)
        ? itemXNorm
        : 0.5;
    const startYNorm = Number.isFinite(Number(record.startYNorm))
      ? Number(record.startYNorm)
      : Number.isFinite(itemYNorm)
        ? itemYNorm
        : 0.8;
    const startX = startXNorm * TANK_WIDTH;
    const startY = startYNorm * TANK_HEIGHT;
    const candidate = {
      ...item,
      tankLayer,
      xNorm: startXNorm,
      yNorm: startYNorm
    };
    const relBounds = getPlacedDecorRelativeOpaqueBounds(candidate);
    if (!relBounds) {
      continue;
    }

    minDeltaX = Math.max(minDeltaX, shellBounds.innerLeft - relBounds.left - startX);
    maxDeltaX = Math.min(maxDeltaX, shellRight - relBounds.right - startX);
    minDeltaY = Math.max(minDeltaY, getDecorTopOverhangLimitY(relBounds, shellBounds) - relBounds.top - startY);
    maxDeltaY = Math.min(
      maxDeltaY,
      Math.min(shellBottom, getTankLayerBottomBoundaryY(tankLayer)) - relBounds.bottom - startY
    );
  }

  return {
    deltaX: clampSharedDecorDragDelta(rawDeltaX, minDeltaX, maxDeltaX),
    deltaY: clampSharedDecorDragDelta(rawDeltaY, minDeltaY, maxDeltaY)
  };
}

function syncDecorGroupToLargestResizeAnchor(groupItems, options = {}) {
  const items = (Array.isArray(groupItems) ? groupItems : []).filter(Boolean);
  if (items.length <= 1) {
    return false;
  }

  let changed = false;
  const normalizedItems = items.map((item) => {
    const normalizedLayer = getDecorFrontLayer(item.decorKey, item.tankLayer);
    if (normalizedLayer !== item.tankLayer) {
      item.tankLayer = normalizedLayer;
      changed = true;
    }
    return {
      item,
      tankLayer: normalizedLayer
    };
  });

  const anchorItem = getLargestDecorGroupItem(items) || items[0];
  if (!anchorItem) {
    return changed;
  }
  const rootMetrics = getDecorGroupRootMetrics(anchorItem);
  if (!rootMetrics) {
    return changed;
  }

  const relativeLayouts = normalizedItems.map((record) => ({
    ...record,
    offsetXRatio: ((record.item.xNorm * TANK_WIDTH) - rootMetrics.anchorX) / rootMetrics.width,
    offsetYRatio: ((record.item.yNorm * TANK_HEIGHT) - rootMetrics.anchorY) / rootMetrics.height
  }));

  const anchorHadResizeAnchor = hasPlacedDecorResizeAnchor(anchorItem);
  if (!anchorHadResizeAnchor && options.deriveMissing) {
    changed = true;
  }

  const anchorPlacement = anchorHadResizeAnchor
    ? (resolvePlacedDecorPositionFromResizeAnchor(anchorItem) || clampDecorPlacement(anchorItem.xNorm, anchorItem.yNorm, { item: anchorItem }))
    : clampDecorPlacement(anchorItem.xNorm, anchorItem.yNorm, { item: anchorItem });
  const resolvedRootMetrics = {
    ...rootMetrics,
    anchorX: anchorPlacement.xNorm * TANK_WIDTH,
    anchorY: anchorPlacement.yNorm * TANK_HEIGHT
  };

  const desiredRecords = relativeLayouts.map((record) => {
    const desiredXNorm = record.item.id === anchorItem.id
      ? anchorPlacement.xNorm
      : clamp((resolvedRootMetrics.anchorX + record.offsetXRatio * resolvedRootMetrics.width) / TANK_WIDTH, 0, 1);
    const desiredYNorm = record.item.id === anchorItem.id
      ? anchorPlacement.yNorm
      : clamp((resolvedRootMetrics.anchorY + record.offsetYRatio * resolvedRootMetrics.height) / TANK_HEIGHT, 0, 1);
    return {
      item: record.item,
      startXNorm: desiredXNorm,
      startYNorm: desiredYNorm,
      tankLayer: record.tankLayer
    };
  });

  const { deltaX, deltaY } = resolveSharedDecorGroupDelta(desiredRecords, 0, 0);

  for (const record of desiredRecords) {
    const nextXNorm = clamp((record.startXNorm * TANK_WIDTH + deltaX) / TANK_WIDTH, 0, 1);
    const nextYNorm = clamp((record.startYNorm * TANK_HEIGHT + deltaY) / TANK_HEIGHT, 0, 1);
    if (
      Math.abs(nextXNorm - record.item.xNorm) > 0.000001
      || Math.abs(nextYNorm - record.item.yNorm) > 0.000001
    ) {
      record.item.xNorm = nextXNorm;
      record.item.yNorm = nextYNorm;
      changed = true;
    }
  }

  for (const item of items) {
    if (!hasPlacedDecorResizeAnchor(item) && options.deriveMissing) {
      changed = true;
    }
    changed = updatePlacedDecorResizeAnchor(item) || changed;
  }

  return changed;
}

function syncPlacedDecorToResizeAnchors(targetState = state, options = {}) {
  if (!targetState || !Array.isArray(targetState.placedDecor) || !targetState.placedDecor.length || !runtime.images.size) {
    return false;
  }

  let changed = false;
  const processedGroupIds = new Set();
  for (const item of targetState.placedDecor) {
    const groupId = normalizeDecorGroupId(item?.groupId);
    if (groupId) {
      if (processedGroupIds.has(groupId)) {
        continue;
      }
      const groupItems = targetState.placedDecor.filter((entry) => normalizeDecorGroupId(entry?.groupId) === groupId);
      processedGroupIds.add(groupId);
      if (groupItems.length > 1) {
        changed = syncDecorGroupToLargestResizeAnchor(groupItems, options) || changed;
        continue;
      }
    }

    const placement = hasPlacedDecorResizeAnchor(item)
      ? resolvePlacedDecorPositionFromResizeAnchor(item)
      : null;
    if (placement && (
      Math.abs(placement.xNorm - item.xNorm) > 0.000001
      || Math.abs(placement.yNorm - item.yNorm) > 0.000001
    )) {
      item.xNorm = placement.xNorm;
      item.yNorm = placement.yNorm;
      changed = true;
    }
    if (!hasPlacedDecorResizeAnchor(item) && options.deriveMissing) {
      changed = true;
    }
    changed = updatePlacedDecorResizeAnchor(item) || changed;
  }

  if (changed && Array.isArray(targetState.gravelLivePebbles)) {
    targetState.gravelLivePebbles = reconcileLooseGravelPebbles(targetState.gravelLivePebbles, targetState.placedDecor);
  }
  return changed;
}

function getFishVisualHalfHeightPx(fish, species = getSpeciesForFish(fish)) {
  if (!species) {
    return 28;
  }

  const width = getFishDisplayWidth(fish || { speciesId: species.id, scale: species.defaultScale || DEFAULT_FISH_SCALE }, species);
  const image = runtime.images.get(getFishDisplayAssetPath(fish || { speciesId: species.id }, species) || species.asset);
  const height = image?.width
    ? width * (image.height / image.width)
    : width * 0.58;
  return height * 0.5;
}

function getFishSurfaceMinYNorm(fish = null, species = getSpeciesForFish(fish), requestedMinYNorm = 0.14) {
  const fixedWaterlinePadding = 26;
  const motionHeadroom = FISH_SURFACE_MOTION_HEADROOM_PX - FISH_SURFACE_BREACH_ALLOWANCE_PX;
  const fishHeightPadding = getFishVisualHalfHeightPx(fish, species) * FISH_SURFACE_HEIGHT_GUARD_MULTIPLIER + motionHeadroom;
  return Math.max(
    Number.isFinite(Number(requestedMinYNorm)) ? Number(requestedMinYNorm) : 0.14,
    (WATER_SURFACE_Y + Math.max(fixedWaterlinePadding, fishHeightPadding)) / TANK_HEIGHT
  );
}

function getDeadFishFloatYNorm(fish = null, species = getSpeciesForFish(fish)) {
  const halfHeight = getFishVisualHalfHeightPx(fish, species);
  return Math.max(
    0.12,
    (
      WATER_SURFACE_Y
      + halfHeight
      + DEAD_FISH_SURFACE_FLOAT_INSET_PX
      + DEAD_FISH_SURFACE_BOB_ALLOWANCE_PX
    ) / TANK_HEIGHT
  );
}

function clampFishYNormToLayer(yNorm, fish = null, species = getSpeciesForFish(fish), layer = DEFAULT_TANK_LAYER, options = {}) {
  const requestedMinYNorm = Number.isFinite(Number(options.minYNorm)) ? Number(options.minYNorm) : 0.14;
  let minYNorm = getFishSurfaceMinYNorm(fish, species, requestedMinYNorm);
  const baseMaxYNorm = Number.isFinite(Number(options.maxYNorm)) ? Number(options.maxYNorm) : 0.8;
  const halfHeight = getFishVisualHalfHeightPx(fish, species);
  const layerMaxYNorm = (getTankLayerBottomBoundaryY(layer) - halfHeight) / TANK_HEIGHT;
  let maxYNorm = Math.max(minYNorm, Math.min(baseMaxYNorm, layerMaxYNorm));
  if (isMobilePageRuntime()) {
    const viewportBounds = getMobileViewportSwimBoundsNorm(fish, species);
    minYNorm = Math.max(minYNorm, viewportBounds.minY);
    maxYNorm = Math.max(minYNorm, Math.min(maxYNorm, viewportBounds.maxY));
  }
  return clamp(Number.isFinite(Number(yNorm)) ? Number(yNorm) : minYNorm, minYNorm, maxYNorm);
}

function getLayerSwimYRange(layer = DEFAULT_TANK_LAYER, fish = null, species = getSpeciesForFish(fish), options = {}) {
  const requestedMinYNorm = Number.isFinite(Number(options.minYNorm)) ? Number(options.minYNorm) : 0.14;
  let minYNorm = getFishSurfaceMinYNorm(fish, species, requestedMinYNorm);
  if (isMobilePageRuntime()) {
    minYNorm = Math.max(minYNorm, getMobileViewportSwimBoundsNorm(fish, species).minY);
  }
  const maxYNorm = clampFishYNormToLayer(
    Number.isFinite(Number(options.maxYNorm)) ? Number(options.maxYNorm) : 0.8,
    fish,
    species,
    layer,
    options
  );
  return {
    min: Math.min(minYNorm, maxYNorm),
    max: Math.max(minYNorm, maxYNorm)
  };
}

function tankLayerToLegacy(layer) {
  return clampTankLayer(layer) >= 4 ? "back" : "front";
}

function getFishTankLayer(fish) {
  if (fish?.caveState) {
    if (["approach", "align", "leave"].includes(fish.caveState)) {
      return clampTankLayer(fish.caveFrontLayer || fish.tankLayer || DEFAULT_TANK_LAYER);
    }

    return getFishActiveCaveInsideLayer(fish, fish?.tankLayer || DEFAULT_TANK_LAYER);
  }

  return clampTankLayer(fish?.tankLayer || DEFAULT_TANK_LAYER);
}

function normalizeSuckerFishGlassLayer(layer) {
  const requestedLayer = clampTankLayer(layer ?? SUCKER_FISH_BACK_GLASS_LAYER);
  return requestedLayer <= SUCKER_FISH_FRONT_GLASS_LAYER
    ? SUCKER_FISH_FRONT_GLASS_LAYER
    : SUCKER_FISH_BACK_GLASS_LAYER;
}

function getSuckerFishGlassLayer(fish) {
  const storedReturnLayer = Number(fish?.suckerFreeSwimReturnLayer);
  if (Number.isFinite(storedReturnLayer)) {
    return normalizeSuckerFishGlassLayer(storedReturnLayer);
  }
  return normalizeSuckerFishGlassLayer(fish?.tankLayer ?? fish?.desiredTankLayer ?? SUCKER_FISH_BACK_GLASS_LAYER);
}

function getDesiredSuckerFishGlassLayer(fish) {
  return normalizeSuckerFishGlassLayer(fish?.desiredTankLayer ?? fish?.tankLayer ?? SUCKER_FISH_BACK_GLASS_LAYER);
}

function isFrontGlassSuckerFish(fish, species = getSpeciesForFish(fish)) {
  return getEffectiveFishBehavior(fish, species) === "sucker"
    && getSuckerFishGlassLayer(fish) === SUCKER_FISH_FRONT_GLASS_LAYER;
}

function getSuckerFishLayerForShortcut(direction) {
  return direction < 0
    ? SUCKER_FISH_FRONT_GLASS_LAYER
    : SUCKER_FISH_BACK_GLASS_LAYER;
}

function getSuckerFishPlacementOptionsForLayer(layer) {
  return normalizeSuckerFishGlassLayer(layer) === SUCKER_FISH_FRONT_GLASS_LAYER
    ? {
      minYNorm: SUCKER_FISH_FRONT_GLASS_MIN_Y_NORM,
      maxYNorm: SUCKER_FISH_FRONT_GLASS_MAX_Y_NORM
    }
    : {
      minYNorm: SUCKER_FISH_BACK_GLASS_MIN_Y_NORM,
      maxYNorm: SUCKER_FISH_BACK_GLASS_MAX_Y_NORM
    };
}

function getSuckerFishYRange(fish, species = getSpeciesForFish(fish), layer = getSuckerFishGlassLayer(fish)) {
  return getLayerSwimYRange(layer, fish, species, getSuckerFishPlacementOptionsForLayer(layer));
}

function getDesiredFishTankLayer(fish) {
  if (fish?.caveState) {
    if (["approach", "align", "leave"].includes(fish.caveState)) {
      return clampTankLayer(fish.caveFrontLayer || fish.desiredTankLayer || fish.tankLayer || DEFAULT_TANK_LAYER);
    }

    return getFishActiveCaveInsideLayer(fish, fish?.desiredTankLayer || fish?.tankLayer || DEFAULT_TANK_LAYER);
  }

  return clampTankLayer(fish?.desiredTankLayer || fish?.tankLayer || DEFAULT_TANK_LAYER);
}

function setFishTankLayers(fish, tankLayer, desiredTankLayer = tankLayer) {
  if (!fish) {
    return;
  }

  const species = getSpeciesForFish(fish);
  const clampRegularFishLayer = (value) =>
    Math.max(1, Math.min(TANK_DEPTH_LAYERS, Math.round(Number(value) || 1)));
  const previousTankLayer = getFishTankLayer(fish);
  const now = Date.now();
  const previousVisualScale = getFishLayerDepthScaleMultiplier(fish, now);
  let nextTankLayer;
  let nextDesiredTankLayer;

  if (getEffectiveFishBehavior(fish, species) === "sucker") {
    nextTankLayer = normalizeSuckerFishGlassLayer(tankLayer);
    nextDesiredTankLayer = normalizeSuckerFishGlassLayer(desiredTankLayer);
  } else {
    nextTankLayer = clampRegularFishLayer(tankLayer);
    nextDesiredTankLayer = clampRegularFishLayer(desiredTankLayer);
  }

  fish.tankLayer = nextTankLayer;
  fish.desiredTankLayer = nextDesiredTankLayer;

  if (fish.id && nextTankLayer !== previousTankLayer) {
    const nextScale = getFishLayerDepthScaleForLayer(nextTankLayer);
    if (Math.abs(nextScale - previousVisualScale) > 0.0001) {
      runtime.fishLayerDepthScaleTransitions.set(fish.id, {
        fromScale: previousVisualScale,
        toScale: nextScale,
        startedAt: now,
        durationMs: FISH_LAYER_DEPTH_SCALE_EASE_MS
      });
    } else {
      runtime.fishLayerDepthScaleTransitions.delete(fish.id);
    }
  }

  fish.drawLayer = tankLayerToLegacy(fish.tankLayer);
  fish.desiredDrawLayer = tankLayerToLegacy(fish.desiredTankLayer);
}

function setFishDesiredTankLayer(fish, desiredTankLayer) {
  if (!fish) {
    return;
  }

  setFishTankLayers(fish, getFishTankLayer(fish), desiredTankLayer);
}

function getDecorTankLayer(item) {
  return clampTankLayer(item?.tankLayer ?? DEFAULT_TANK_LAYER);
}

function isDecorHorizontallyFlipped(item) {
  return Boolean(item?.flipped);
}

function isDecorVerticallyFlipped(item) {
  return Boolean(item?.flippedY);
}

function resolveDecorHorizontalUnit(item, unit) {
  const clampedUnit = clamp(Number.isFinite(Number(unit)) ? Number(unit) : 0.5, 0, 1);
  return isDecorHorizontallyFlipped(item) ? 1 - clampedUnit : clampedUnit;
}

function resolveDecorVerticalUnit(item, unit) {
  const clampedUnit = clamp(Number.isFinite(Number(unit)) ? Number(unit) : 0.5, 0, 1);
  return isDecorVerticallyFlipped(item) ? 1 - clampedUnit : clampedUnit;
}

function isCaveDecorKey(decorKey = "") {
  const key = String(decorKey || "").toLowerCase();
  if (/_bubbler\.[^.]+$/.test(key)) {
    return false;
  }
  if (isCustomHideAssetKey(decorKey) || runtime.decorMap.get(decorKey)?.customType === "hide") {
    return true;
  }
  return key.includes("cave") && !key.includes("_bg") && !key.includes("_mid");
}

function getDecorBubblerMeta(decorKey = "") {
  const directDecor = runtime.decorMap.get(decorKey)?.bubbler;
  if (directDecor) {
    return directDecor;
  }

  return runtime.decorMeta[decorKey]?.bubbler || null;
}

function isBubblerDecorKey(decorKey = "") {
  return Boolean(getDecorBubblerMeta(decorKey));
}

function canConfigureDecorBubbler(itemOrKey) {
  const decorKey = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey;
  return isCustomBubblerDecorKey(decorKey) || isBubblerDecorKey(decorKey);
}

function canConfigureCustomDecor(itemOrKey) {
  const decorKey = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey;
  return isCustomDecorAssetKey(decorKey);
}

function canOpenDecorSettings(itemOrTarget) {
  const item = itemOrTarget?.item || itemOrTarget;
  return Boolean(item);
}

function getPlacedDecorBubblerSettings(item) {
  if (!item || !canConfigureDecorBubbler(item)) {
    return null;
  }

  const decor = runtime.decorMap.get(item.decorKey);
  const firstSpout = decor?.bubbler?.spouts?.[0] || getDecorBubblerMeta(item.decorKey)?.spouts?.[0] || {};
  return createDefaultBubblerSettings({
    amount: item.bubblerSettings?.amount ?? firstSpout.intensity ?? DEFAULT_CUSTOM_BUBBLER_AMOUNT,
    speed: item.bubblerSettings?.speed ?? firstSpout.speed ?? DEFAULT_BUBBLER_SPEED,
    direction: item.bubblerSettings?.direction ?? firstSpout.direction ?? DEFAULT_CUSTOM_BUBBLER_DIRECTION,
    width: item.bubblerSettings?.width ?? firstSpout.spread ?? DEFAULT_BUBBLER_SPREAD_PX,
    distance: item.bubblerSettings?.distance ?? firstSpout.fadeDistance ?? DEFAULT_BUBBLER_FADE_DISTANCE_PX,
    bubbleColor: item.bubblerSettings?.bubbleColor ?? firstSpout.bubbleColor ?? DEFAULT_BUBBLER_BUBBLE_COLOR,
    bubbleColorize: item.bubblerSettings?.bubbleColorize ?? firstSpout.bubbleColorize ?? false,
    bubbleSize: item.bubblerSettings?.bubbleSize ?? firstSpout.bubbleSize ?? DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE,
    bubbleOpacity: item.bubblerSettings?.bubbleOpacity ?? firstSpout.bubbleOpacity ?? DEFAULT_BUBBLER_BUBBLE_OPACITY,
    bubbleFillTintEnabled: item.bubblerSettings?.bubbleFillTintEnabled ?? firstSpout.bubbleFillTintEnabled ?? DEFAULT_BUBBLER_FILL_TINT_ENABLED,
    bubbleFillOpacity: item.bubblerSettings?.bubbleFillOpacity ?? firstSpout.bubbleFillOpacity ?? DEFAULT_BUBBLER_FILL_OPACITY,
    bubblePopEnabled: item.bubblerSettings?.bubblePopEnabled ?? firstSpout.bubblePopEnabled ?? DEFAULT_BUBBLER_POP_ENABLED,
    bubbleMalformed: item.bubblerSettings?.bubbleMalformed ?? firstSpout.bubbleMalformed ?? DEFAULT_BUBBLER_MALFORMED_ENABLED,
    bubbleMalformedIntensity: item.bubblerSettings?.bubbleMalformedIntensity ?? firstSpout.bubbleMalformedIntensity ?? DEFAULT_BUBBLER_MALFORMED_INTENSITY,
    bubbleMalformedSpeed: item.bubblerSettings?.bubbleMalformedSpeed ?? firstSpout.bubbleMalformedSpeed ?? DEFAULT_BUBBLER_MALFORMED_SPEED
  });
}

function buildBubblerSpoutFromSettings(settings, baseSpout = null) {
  const resolved = createDefaultBubblerSettings(settings);
  return {
    ...(baseSpout || {}),
    intensity: resolved.amount,
    spread: resolved.width,
    fadeDistance: resolved.distance,
    bubbleColor: resolved.bubbleColor,
    bubbleColors: [resolved.bubbleColor],
    bubbleColorize: resolved.bubbleColorize,
    bubbleSize: resolved.bubbleSize,
    bubbleOpacity: resolved.bubbleOpacity,
    bubbleFillTintEnabled: resolved.bubbleFillTintEnabled,
    bubbleFillOpacity: resolved.bubbleFillOpacity,
    bubblePopEnabled: resolved.bubblePopEnabled,
    bubbleMalformed: resolved.bubbleMalformed,
    bubbleMalformedIntensity: resolved.bubbleMalformedIntensity,
    bubbleMalformedSpeed: resolved.bubbleMalformedSpeed,
    speed: resolved.speed,
    direction: resolved.direction
  };
}

function getPlacedDecorBubblerMeta(item, decor) {
  const baseBubbler = decor?.bubbler || getDecorBubblerMeta(item?.decorKey);
  if (!baseBubbler?.spouts?.length) {
    return null;
  }

  if (!item?.bubblerSettings) {
    return baseBubbler;
  }

  const settings = getPlacedDecorBubblerSettings(item);
  return {
    spoutQty: baseBubbler.spouts.length,
    spouts: baseBubbler.spouts.map((spout) => buildBubblerSpoutFromSettings(settings, spout))
  };
}

function getDecorFrontLayer(decorKey, layer) {
  const clamped = clampTankLayer(layer);
  if (!isCaveDecorKey(decorKey)) {
    return clamped;
  }

  return 3;
}

function getDecorLayerSpan(decorKey, layer) {
  const frontLayer = getDecorFrontLayer(decorKey, layer);

  if (isTransitTubeDecorKey(decorKey)) {
    const back = clampTankLayer(frontLayer + 1);
    return { front: frontLayer, mid: null, back, min: frontLayer, max: back, label: `Layers ${frontLayer}-${back}` };
  }
  if (!isCaveDecorKey(decorKey)) {
    return {
      front: frontLayer,
      mid: null,
      back: null,
      min: frontLayer,
      max: frontLayer,
      label: `Layer ${frontLayer}`
    };
  }

  const back = frontLayer + 1;

  return {
    front: frontLayer,
    mid: null,
    back,
    min: frontLayer,
    max: back,
    label: `Layers ${frontLayer}-${back}`
  };
}
