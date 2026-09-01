// Source fragment: fish/lifecycle-and-breeding.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getResaleValue(cost) {
  const price = Math.max(1, Math.floor(Number(cost) || 0));

  if (price <= 1) {
    return 1;
  }

  if (price <= 3) {
    return price - 1;
  }

  return Math.max(1, Math.floor(price * 0.75));
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
      : randomSwimY(),
    0.14,
    0.8
  );
  const targetXNorm = clamp(Number.isFinite(Number(options.targetXNorm)) ? Number(options.targetXNorm) : randomSwimX(), 0.08, 0.92);
  const targetYNorm = clamp(
    Number.isFinite(Number(options.targetYNorm))
      ? Number(options.targetYNorm)
      : randomSwimY(),
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
  const undeadTemplateStage = getUndeadTemplateStageForSpecies(species);
  const requestedUndeadTemplateSpeciesId = typeof options.undeadTemplateSpeciesId === "string"
    ? options.undeadTemplateSpeciesId.trim()
    : "";
  const requestedUndeadTemplateSpecies = requestedUndeadTemplateSpeciesId
    ? runtime.fishMap.get(requestedUndeadTemplateSpeciesId)
    : null;
  const undeadTemplateSpecies = requestedUndeadTemplateSpecies && !isUndeadSpecies(requestedUndeadTemplateSpecies)
    ? requestedUndeadTemplateSpecies
    : (
      undeadTemplateStage
        ? runtime.fishMap.get(pickRandomUndeadTemplateSpeciesId(undeadTemplateStage) || "")
        : null
    );
  const scaleSpeciesId = undeadTemplateSpecies?.id || speciesId;
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
  const personalityPick = pickFishPersonality(species);
  const fish = {
    id: fishId,
    speciesId,
    undeadTemplateSpeciesId: isCatalogUndeadShopSpecies(species) ? (undeadTemplateSpecies?.id || null) : null,
    name: typeof options.name === "string" && options.name.trim()
      ? options.name.trim()
      : buildFishName(speciesId, takenNames),
    acquiredAt: now,
    tankAddedAt: Number.isFinite(Number(options.tankAddedAt)) ? Number(options.tankAddedAt) : now,
    deadAt: null,
    zombieVariant: Boolean(options.zombieVariant),
    zombieBiteStartedAt: null,
    zombieBiteLastBloodAt: null,
    zombieBiteAttackerId: null,
    zombieReviveAt: null,
    zombieReviveSourceId: null,
    decayStage: null,
    piranhaConsumptionStartedAt: null,
    piranhaConsumptionEndsAt: null,
    piranhaLastBloodAt: null,
    piranhaAttackStartedAt: null,
    piranhaLastDamageAt: null,
    breedCooldownUntil: Number.isFinite(Number(options.breedCooldownUntil)) ? Number(options.breedCooldownUntil) : 0,
    healthUnits: clamp(
      Number.isFinite(Number(options.healthUnits)) ? Number(options.healthUnits) : getSpeciesMaxHealthUnits(species),
      0,
      getSpeciesMaxHealthUnits(species)
    ),
    fedStreak: 0,
    missedMealsInRow: 0,
    lastAteAt: 0,
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
    temporaryImmunityUntil: 0,
    nextDiseaseCheckAt: now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS),
    nextDiseaseSpreadCheckAt: now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS),
    nextSymptomCheckAt: now + randomDelay(DISEASE_SYMPTOM_CHECK_MIN_MS, DISEASE_SYMPTOM_CHECK_MAX_MS),
    nextGreenBubbleAt: 0,
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
    scale,
    behaviorSpeciesId: sanitizeFishBehaviorSpeciesId(options.behaviorSpeciesId, speciesId),
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
    drawLayer: tankLayerToLegacy(tankLayer),
    desiredDrawLayer: tankLayerToLegacy(desiredTankLayer),
    hangoutDecorId: null,
    hangoutZoneType: null,
    nextDetritusSnackAt: now + species.cleanupMinMs,
    displayDirection: direction,
    displayAngle: direction < 0 ? Math.PI : 0,
    turnStartedAt: null,
    turnDurationMs: 0,
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

function addFishToTank(fish, now = Date.now()) {
  if (!fish) {
    return null;
  }

  resetLivingFishPredatorState(fish, now);

  preserveTankDirtinessThroughChange(now, () => {
    state.fish.push(fish);
  });
  return fish;
}

function getBreedableFishGroups(now = Date.now(), options = {}) {
  const groups = new Map();
  const requireReady = options.requireReady !== false;
  const excludeDebugPair = options.excludeDebugPair !== false;
  const debugSequence = runtime.debugBreedingSequence;
  const debugFishIds = debugSequence
    ? new Set([debugSequence.leftFishId, debugSequence.rightFishId].filter(Boolean))
    : null;

  for (const fish of state.fish) {
    if (!fish || isFishDead(fish) || isUndeadFish(fish) || !isFishAdult(fish, now)) {
      continue;
    }

    if (excludeDebugPair && debugFishIds?.has(fish.id)) {
      continue;
    }

    if (requireReady) {
      if (!hasFishBeenInTankLongEnoughToBreed(fish, now)) {
        continue;
      }
      if ((Number(fish.breedCooldownUntil) || 0) > now) {
        continue;
      }
    }

    const bucket = groups.get(fish.speciesId) || [];
    bucket.push(fish);
    groups.set(fish.speciesId, bucket);
  }

  return [...groups.entries()].filter(([, fishList]) => fishList.length >= 2);
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
    fishColor: normalizeDecorColorSetting(options.fishColor ?? ""),
    fishColorize: normalizeDecorColorizeSetting(options.fishColorize ?? false)
  });
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
  const targetYNorm = getFishEggTargetYNorm(xNorm, tankLayer);
  const startYNorm = clamp(
    Number.isFinite(Number(options.startYNorm)) ? Number(options.startYNorm) : (Number(options.yNorm) || targetYNorm - 0.18),
    0.14,
    Math.max(0.16, targetYNorm - 0.01)
  );
  const parentNames = Array.isArray(options.parentNames)
    ? options.parentNames.map((name) => sanitizeTankName(name, "")).filter(Boolean).slice(0, 2)
    : [];
  const fishColor = snapFishInheritanceColorToAvailable(options.fishColor ?? "");

  return {
    id: createId("egg"),
    speciesId,
    parentNames,
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
    tankLayer
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

function hatchFishEgg(egg, now = Date.now()) {
  if (!egg || egg.hatchedAt) {
    return false;
  }

  const species = runtime.fishMap.get(egg.speciesId);
  if (!species) {
    return false;
  }

  const hatchAt = Number.isFinite(Number(egg.hatchAt)) ? Number(egg.hatchAt) : now;
  const baby = createBabyFishFromSpecies(egg.speciesId, hatchAt, {
    anchorXNorm: egg.xNorm,
    anchorYNorm: clamp((Number(egg.yNorm) || 0.72) - 0.08, 0.18, 0.76),
    tankLayer: egg.tankLayer,
    fishColor: snapFishInheritanceColorToAvailable(egg.fishColor),
    fishColorize: egg.fishColorize,
    parentNames: egg.parentNames
  });
  if (!baby) {
    return false;
  }

  addFishToTank(baby, hatchAt);
  egg.hatchedAt = hatchAt;
  egg.shellExpiresAt = hatchAt + FISH_EGG_SHELL_LINGER_MS;
  if (now - hatchAt < FISH_EGG_SHELL_LINGER_MS) {
    spawnSedimentCloud((Number(egg.xNorm) || 0.5) * TANK_WIDTH, (Number(egg.yNorm) || 0.74) * TANK_HEIGHT, {
      now,
      strength: getSedimentStrength(now, 0.62),
      baseRadius: 16,
      driftY: -12
    });
  }
  const hatchMessage = `${baby.name || "A baby fish"} the ${species.name || "fish"} has just hatched and is exploring the aquarium.`;
  pushEvent(hatchMessage, hatchAt, getCurrentTank(), { type: "birth", fishId: baby.id, score: 1 });
  if (now - hatchAt < FISH_EGG_SHELL_LINGER_MS) {
    showToast(hatchMessage);
  }
  return true;
}

function processFishEggs(now = Date.now()) {
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
  const breedingGroups = getBreedableFishGroups(slot.end, { requireReady: true });
  if (!breedingGroups.length) {
    return false;
  }

  let changed = false;
  const guaranteedBreeding = (Number(state.foodBuffs?.friskyUntil) || 0) > slot.start;
  for (const [speciesId, eligibleFish] of breedingGroups) {
    const pairCount = Math.floor(eligibleFish.length / 2);
    if (pairCount < 1) {
      continue;
    }

    const spawnChance = guaranteedBreeding
      ? 1
      : clamp(
        BREEDING_BASE_CHANCE_PER_WINDOW + Math.max(0, pairCount - 1) * BREEDING_EXTRA_PAIR_BONUS_CHANCE,
        0,
        BREEDING_MAX_CHANCE_PER_WINDOW
      );
    if (Math.random() > spawnChance) {
      continue;
    }

    const parents = pickRandomItems(eligibleFish, 2);
    if (parents.length < 2) {
      continue;
    }

    const species = runtime.fishMap.get(speciesId);
    const targetLayer = getBreedingEventTankLayer(species);
    const eggLayer = getBreedingEggTankLayer(species, targetLayer);
    const anchorXNorm = clamp((parents[0].xNorm + parents[1].xNorm) / 2 + randomBetween(-0.015, 0.015), 0.12, 0.88);
    const anchorYNorm = clampBreedingAnchorYNorm(
      (parents[0].yNorm + parents[1].yNorm) / 2 + randomBetween(-0.012, 0.012),
      parents,
      species,
      targetLayer,
      { minYNorm: 0.18, maxYNorm: 0.76 }
    );
    const colorInheritance = getBreedingEggColorInheritance(parents, slot.end);
    const egg = createFishEggRecord(speciesId, slot.end, {
      xNorm: anchorXNorm,
      yNorm: anchorYNorm,
      parentNames: [parents[0].name, parents[1].name],
      tankLayer: eggLayer,
      fishColor: colorInheritance.fishColor,
      fishColorize: colorInheritance.fishColorize
    });
    if (!egg) {
      continue;
    }

    addFishEggToTank(egg);
    const cooldownUntil = slot.end + BREEDING_COOLDOWN_MS;
    for (const parent of parents) {
      parent.breedCooldownUntil = cooldownUntil;
    }

    pushEvent(`An egg appeared after ${parents[0].name} and ${parents[1].name} paired up.`, slot.end);
    changed = true;
  }

  return changed;
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
  const egg = createFishEggRecord(sequence.speciesId, now, {
    xNorm: sequence.anchorXNorm,
    yNorm: sequence.anchorYNorm,
    parentNames: [leftFish.name, rightFish.name],
    tankLayer: eggLayer,
    fishColor: colorInheritance.fishColor,
    fishColorize: colorInheritance.fishColorize
  });
  if (egg) {
    addFishEggToTank(egg);
    const cooldownUntil = now + BREEDING_COOLDOWN_MS;
    leftFish.breedCooldownUntil = cooldownUntil;
    rightFish.breedCooldownUntil = cooldownUntil;
    leftFish.targetAt = now;
    rightFish.targetAt = now;
    pushEvent(`An egg appeared after ${leftFish.name} and ${rightFish.name} paired up.`, now);
    clearDebugBreedingSequence();
    saveState();
    renderUi(now);
    showToast(`${species?.name || "Fish"} egg settled into the gravel.`);
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
