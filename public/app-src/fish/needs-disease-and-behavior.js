// Source fragment: fish/needs-disease-and-behavior.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function resolveDecorBaseScale(decorKey) {
  const rawScale = Number(runtime.decorMap.get(decorKey)?.defaultScale) || DEFAULT_DECOR_SCALE;
  return clamp(rawScale, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
}

function resolveFishBaseScale(speciesId) {
  const rawScale = Number(runtime.fishMap.get(speciesId)?.defaultScale) || DEFAULT_FISH_SCALE;
  return clamp(rawScale, FISH_SCALE_MIN, FISH_SCALE_MAX);
}

function getDecorScaleDefault(decorKey) {
  const storedScale = Number(state?.decorScaleDefaults?.[decorKey]);
  return clamp(Number.isFinite(storedScale) ? storedScale : resolveDecorBaseScale(decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
}

function getFishScaleDefault(speciesId) {
  const storedScale = Number(state?.fishScaleDefaults?.[speciesId]);
  return clamp(Number.isFinite(storedScale) ? storedScale : resolveFishBaseScale(speciesId), FISH_SCALE_MIN, FISH_SCALE_MAX);
}

function getFishAssetVariants(species) {
  if (!species) {
    return [];
  }

  const variants = Array.isArray(species.assetVariants)
    ? species.assetVariants.filter((value) => typeof value === "string" && value.trim())
    : [];
  return variants.length
    ? variants
    : (typeof species.asset === "string" && species.asset ? [species.asset] : []);
}

function getBaseSpeciesForFish(fish) {
  return fish ? runtime.fishMap.get(fish.speciesId) || null : null;
}

function getFishBehaviorProfileSpecies(fish) {
  const profileId = typeof fish?.behaviorSpeciesId === "string" ? fish.behaviorSpeciesId.trim() : "";
  if (!profileId || profileId === fish?.speciesId) {
    return null;
  }

  const profile = runtime.fishMap.get(profileId);
  if (!profile || profile.customUploadProduct || isCustomFishShopKey(profile.id)) {
    return null;
  }
  return profile;
}

function sanitizeFishBehaviorSpeciesId(value, baseSpeciesId = "") {
  const profileId = typeof value === "string" ? value.trim() : "";
  if (!profileId || profileId === baseSpeciesId) {
    return "";
  }
  const profile = runtime.fishMap.get(profileId);
  return profile && !profile.customUploadProduct && !isCustomFishShopKey(profile.id)
    ? profile.id
    : "";
}

function normalizeLightsOutOverride(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return LIGHTS_OUT_OVERRIDES.includes(normalized) ? normalized : LIGHTS_OUT_OVERRIDE_AUTO;
}

function normalizeBehaviorPersonality(value) {
  const normalized = typeof value === "string"
    ? value.trim().toLowerCase().replace(/[_\s]+/g, "-")
    : "";
  return BEHAVIOR_PERSONALITIES.includes(normalized) ? normalized : "";
}

function getFishBehaviorProfile(speciesOrFish) {
  const species = speciesOrFish?.speciesId
    ? (getSpeciesForFish(speciesOrFish) || getBaseSpeciesForFish(speciesOrFish))
    : speciesOrFish;
  const speciesId = typeof species?.id === "string" ? species.id : (typeof speciesOrFish?.speciesId === "string" ? speciesOrFish.speciesId : "");
  const profile = FISH_BEHAVIOR_PROFILES[speciesId] || null;
  const behavior = species?.behavior || "";
  const fallbackGroup = behavior === "sucker"
    ? "bottom-cleaner"
    : behavior === "piranha"
      ? "special-predator"
      : "open-water-cruiser";
  const group = profile?.group || fallbackGroup;
  const groupPersonalities = FISH_BEHAVIOR_GROUP_VARIATIONS[group] || FISH_BEHAVIOR_GROUP_VARIATIONS["open-water-cruiser"];
  return {
    group,
    personalities: Array.isArray(profile?.personalities) && profile.personalities.length
      ? profile.personalities
      : groupPersonalities,
    rare: Array.isArray(profile?.rare) && profile.rare.length
      ? profile.rare
      : BEHAVIOR_PERSONALITIES.filter((trait) => !groupPersonalities.includes(trait)).slice(0, 5),
    slowGraceful: Boolean(profile?.slowGraceful),
    nightActive: Boolean(profile?.nightActive),
    detritusDiet: Boolean(profile?.detritusDiet) || species?.diet === "detritus",
    predatorDiet: Boolean(profile?.predatorDiet) || behavior === "piranha"
  };
}

function pickFishPersonality(speciesOrFish) {
  const profile = getFishBehaviorProfile(speciesOrFish);
  const roll = Math.random();
  if (roll < 0.7) {
    return {
      personality: profile.personalities[Math.floor(Math.random() * profile.personalities.length)] || "curious",
      rarity: PERSONALITY_RARITY_TYPE
    };
  }
  if (roll < 0.9) {
    const variationPool = FISH_BEHAVIOR_GROUP_VARIATIONS[profile.group] || profile.personalities;
    return {
      personality: variationPool[Math.floor(Math.random() * variationPool.length)] || "curious",
      rarity: PERSONALITY_RARITY_VARIATION
    };
  }
  return {
    personality: profile.rare[Math.floor(Math.random() * profile.rare.length)] || "curious",
    rarity: PERSONALITY_RARITY_ODDBALL
  };
}

function sanitizePersonalityRarity(value) {
  return [PERSONALITY_RARITY_TYPE, PERSONALITY_RARITY_VARIATION, PERSONALITY_RARITY_ODDBALL].includes(value)
    ? value
    : PERSONALITY_RARITY_TYPE;
}

function sanitizeFeedingMemory(value, now = Date.now()) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const xNorm = Number(source.lastFoodXNorm);
  const yNorm = Number(source.lastFoodYNorm);
  const feederXNorm = Number(source.feederXNorm);
  const feederYNorm = Number(source.feederYNorm);
  return {
    lastFoodXNorm: Number.isFinite(xNorm) ? clamp(xNorm, 0.08, 0.92) : null,
    lastFoodYNorm: Number.isFinite(yNorm) ? clamp(yNorm, 0.08, 0.9) : null,
    lastFoodAt: Number.isFinite(Number(source.lastFoodAt)) ? Math.max(0, Number(source.lastFoodAt)) : 0,
    feederXNorm: Number.isFinite(feederXNorm) ? clamp(feederXNorm, 0.08, 0.92) : null,
    feederYNorm: Number.isFinite(feederYNorm) ? clamp(feederYNorm, 0.02, 0.42) : null,
    feederSeenAt: Number.isFinite(Number(source.feederSeenAt)) ? Math.max(0, Number(source.feederSeenAt)) : 0,
    crowdedFishIds: Array.isArray(source.crowdedFishIds)
      ? [...new Set(source.crowdedFishIds.map((fishId) => String(fishId || "")).filter(Boolean))].slice(0, 6)
      : [],
    updatedAt: Number.isFinite(Number(source.updatedAt)) ? Math.max(0, Number(source.updatedAt)) : now
  };
}

function sanitizeFavoriteSpot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const xNorm = Number(value.xNorm);
  const yNorm = Number(value.yNorm);
  if (!Number.isFinite(xNorm) || !Number.isFinite(yNorm)) {
    return null;
  }

  return {
    xNorm: clamp(xNorm, 0.08, 0.92),
    yNorm: clamp(yNorm, 0.14, 0.9),
    decorId: typeof value.decorId === "string" ? value.decorId : "",
    zoneType: typeof value.zoneType === "string" ? value.zoneType : "",
    assignedAt: Number.isFinite(Number(value.assignedAt)) ? Math.max(0, Number(value.assignedAt)) : 0
  };
}

function createDefaultBehaviorDiseaseSnapshot(now = Date.now()) {
  return {
    type: DISEASE_TYPE_GENERIC,
    stage: DISEASE_STATE_NONE,
    exposure: 0,
    startedAt: 0,
    stageStartedAt: 0,
    nextStageCheckAt: now + randomBetween(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS),
    nextSpreadCheckAt: now + randomBetween(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS),
    nextSymptomAt: now + randomBetween(DISEASE_SYMPTOM_CHECK_MIN_MS, DISEASE_SYMPTOM_CHECK_MAX_MS),
    lastBubbleAt: 0,
    lastDamageAt: 0,
    treatedAt: 0,
    recoveredAt: 0
  };
}

function sanitizeBehaviorDiseaseSnapshot(value, now = Date.now()) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const fallback = createDefaultBehaviorDiseaseSnapshot(now);
  const stage = DISEASE_STATES.includes(source.stage) ? source.stage : DISEASE_STATE_NONE;
  return {
    type: typeof source.type === "string" && source.type ? source.type : DISEASE_TYPE_GENERIC,
    stage,
    exposure: clamp(Number(source.exposure) || 0, 0, DISEASE_EXPOSURE_MAX),
    startedAt: Number.isFinite(Number(source.startedAt)) ? Math.max(0, Number(source.startedAt)) : 0,
    stageStartedAt: Number.isFinite(Number(source.stageStartedAt)) ? Math.max(0, Number(source.stageStartedAt)) : 0,
    nextStageCheckAt: Number.isFinite(Number(source.nextStageCheckAt)) ? Math.max(0, Number(source.nextStageCheckAt)) : fallback.nextStageCheckAt,
    nextSpreadCheckAt: Number.isFinite(Number(source.nextSpreadCheckAt)) ? Math.max(0, Number(source.nextSpreadCheckAt)) : fallback.nextSpreadCheckAt,
    nextSymptomAt: Number.isFinite(Number(source.nextSymptomAt)) ? Math.max(0, Number(source.nextSymptomAt)) : fallback.nextSymptomAt,
    lastBubbleAt: Number.isFinite(Number(source.lastBubbleAt)) ? Math.max(0, Number(source.lastBubbleAt)) : 0,
    lastDamageAt: Number.isFinite(Number(source.lastDamageAt)) ? Math.max(0, Number(source.lastDamageAt)) : 0,
    treatedAt: Number.isFinite(Number(source.treatedAt)) ? Math.max(0, Number(source.treatedAt)) : 0,
    recoveredAt: Number.isFinite(Number(source.recoveredAt)) ? Math.max(0, Number(source.recoveredAt)) : 0
  };
}

function sanitizeBehaviorSignals(value, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value)
    .map(([type, signal]) => {
      if (!signal || typeof signal !== "object") {
        return null;
      }
      const expiresAt = Number.isFinite(Number(signal.expiresAt)) ? Number(signal.expiresAt) : 0;
      if (expiresAt && expiresAt <= now) {
        return null;
      }
      const key = String(type || "").trim();
      if (!key) {
        return null;
      }
      return [key, {
        type: key,
        taskText: typeof signal.taskText === "string" ? signal.taskText : "",
        debugText: typeof signal.debugText === "string" ? signal.debugText : "",
        firstSeenAt: Number.isFinite(Number(signal.firstSeenAt)) ? Number(signal.firstSeenAt) : now,
        lastSeenAt: Number.isFinite(Number(signal.lastSeenAt)) ? Number(signal.lastSeenAt) : now,
        expiresAt: expiresAt || now + BEHAVIOR_SIGNAL_EXPIRY_MS,
        cooldownUntil: Number.isFinite(Number(signal.cooldownUntil)) ? Number(signal.cooldownUntil) : 0
      }];
    })
    .filter(Boolean)
    .slice(-DISEASE_SIGNAL_HISTORY_LIMIT));
}

function sanitizeFishRelationships(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value)
    .map(([fishId, relation]) => {
      const otherId = String(fishId || "").trim();
      if (!otherId || !relation || typeof relation !== "object") {
        return null;
      }
      const kind = ["friend", "neutral", "dislike", "fear", "rival"].includes(relation.kind)
        ? relation.kind
        : "neutral";
      return [otherId, {
        kind,
        score: clamp(Number(relation.score) || 0, -100, 100),
        updatedAt: Number.isFinite(Number(relation.updatedAt)) ? Math.max(0, Number(relation.updatedAt)) : 0
      }];
    })
    .filter(Boolean));
}

function getNeedStateLabel(value, labels = {}) {
  const score = clamp(Number(value) || 0, 0, 100);
  if (score >= 80) {
    return labels.excellent || "Excellent";
  }
  if (score >= 60) {
    return labels.good || "Good";
  }
  if (score >= 40) {
    return labels.okay || "Okay";
  }
  if (score >= 20) {
    return labels.low || "Low";
  }
  return labels.critical || "Critical";
}

function getFishNeedLabel(needKey, value) {
  switch (needKey) {
    case "hunger":
      return getNeedStateLabel(value, { excellent: "Full", good: "Peckish", okay: "Hungry", low: "Very Hungry", critical: "Starving" });
    case "energy":
      return getNeedStateLabel(value, { excellent: "Energized", good: "Awake", okay: "Tired", low: "Very Tired", critical: "Exhausted" });
    case "social":
      return getNeedStateLabel(value, { excellent: "Socialized", good: "Content", okay: "Lonely", low: "Very Lonely", critical: "Isolated" });
    case "comfort":
      return getNeedStateLabel(value, { excellent: "Cozy", good: "Fine", okay: "Uneasy", low: "Stressed", critical: "Panicked" });
    case "hygiene":
      return getNeedStateLabel(value, { excellent: "Clean", good: "Fine", okay: "Grimy", low: "Filthy", critical: "Toxic" });
    case "environment":
      return getNeedStateLabel(value, { excellent: "Great Vibes", good: "Decent", okay: "Bad Vibes", low: "Miserable", critical: "Awful" });
    case "stimulation":
      return getNeedStateLabel(value, { excellent: "Engaged", good: "Interested", okay: "Bored", low: "Restless", critical: "Desperate" });
    default:
      return getNeedStateLabel(value);
  }
}

function getFishNeedsMood(needs) {
  const safeNeeds = sanitizeFishNeeds(needs);
  const score = FISH_NEED_KEYS.reduce((total, key) => total + safeNeeds[key] * (FISH_NEED_MOOD_WEIGHTS[key] || 0), 0);
  const label = score >= 85
    ? "Thriving"
    : score >= 70
      ? "Good Vibes"
      : score >= 50
        ? "Fine"
        : score >= 35
          ? "Uneasy"
          : score >= 20
            ? "Stressed"
            : "Miserable";
  return { value: clamp(score, 0, 100), label };
}

function getDerivedFishNeedDefaults(fish, now = Date.now()) {
  const defaults = { ...FISH_NEED_DEFAULTS };
  const lastAteAt = Number(fish?.lastAteAt) || 0;
  if (lastAteAt > 0) {
    const hoursSinceFood = Math.max(0, now - lastAteAt) / HOUR_MS;
    defaults.hunger = clamp(96 - hoursSinceFood * 7.5, 22, 96);
  }
  if (fish && !isFishDead(fish)) {
    const currentTank = getCurrentTank();
    if (!currentTank) {
      return defaults;
    }
    const dirtiness = Number.isFinite(Number(state?.lastCleanedAt)) ? getTankDirtiness(now) : 0;
    defaults.hygiene = clamp((1 - dirtiness) * 100, 5, 100);
    defaults.comfort = clamp(getFishComfort(fish, now).value * 100, 0, 100);
    const needsStatus = getFishNeedsStatus(fish, currentTank, now);
    const metRatio = needsStatus.length
      ? needsStatus.filter((need) => need.met).length / needsStatus.length
      : 0.75;
    defaults.environment = clamp(45 + metRatio * 55 - getFishConflictStatus(fish, currentTank, now).filter((conflict) => conflict.active).length * 12, 0, 100);
  }
  return defaults;
}

function sanitizeFishNeeds(value, fish = null, now = Date.now()) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const defaults = fish ? getDerivedFishNeedDefaults(fish, now) : FISH_NEED_DEFAULTS;
  return Object.fromEntries(FISH_NEED_KEYS.map((key) => [
    key,
    clamp(Number.isFinite(Number(source[key])) ? Number(source[key]) : defaults[key], 0, 100)
  ]));
}

function sanitizeFishNeedEventMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value)
    .map(([key, timestamp]) => {
      const safeKey = String(key || "").trim();
      const safeTimestamp = Number(timestamp);
      return safeKey && Number.isFinite(safeTimestamp) ? [safeKey, Math.max(0, safeTimestamp)] : null;
    })
    .filter(Boolean));
}

function sanitizeBehaviorIntent(value, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const expiresAt = Number.isFinite(Number(value.expiresAt)) ? Number(value.expiresAt) : 0;
  if (expiresAt && expiresAt <= now) {
    return null;
  }
  const type = typeof value.type === "string" ? value.type.trim() : "";
  if (!type) {
    return null;
  }
  return {
    type,
    cause: typeof value.cause === "string" ? value.cause.trim() : "",
    targetId: typeof value.targetId === "string" ? value.targetId.trim() : "",
    targetName: typeof value.targetName === "string" ? value.targetName.trim() : "",
    startedAt: Number.isFinite(Number(value.startedAt)) ? Math.max(0, Number(value.startedAt)) : now,
    expiresAt: expiresAt || now + BEHAVIOR_INTENT_LINGER_MS
  };
}

function sanitizeFishHueShift(value) {
  return clamp(Math.round(Number(value) || 0), FISH_HUE_SHIFT_MIN, FISH_HUE_SHIFT_MAX);
}

function sanitizeFishSaturation(value) {
  return clamp(Math.round(Number(value) || 100), FISH_SATURATION_MIN, FISH_SATURATION_MAX);
}

function sanitizeFishBrightness(value) {
  return clamp(Math.round(Number(value) || 100), FISH_BRIGHTNESS_MIN, FISH_BRIGHTNESS_MAX);
}

function getFishColorSetting(fish) {
  return normalizeDecorColorSetting(fish?.fishColor ?? fish?.colorSetting ?? "");
}

function getFishColorizeSetting(fish) {
  return normalizeDecorColorizeSetting(fish?.fishColorize ?? false);
}

function getFishColorCycleFilter(fish, now = Date.now()) {
  const color = getFishColorSetting(fish);
  if (!isDecorRgbColorSetting(color)) {
    return "none";
  }

  return getFishColorizeSetting(fish)
    ? getDecorRgbColorizeFilter(now)
    : getDecorRgbCycleFilter(now);
}

function getFishTintedImage(imagePath, sourceImage, fish) {
  const color = getFishColorSetting(fish);
  if (!color || isDecorRgbColorSetting(color)) {
    return sourceImage;
  }

  return getTintedCaveLayerImage(imagePath, color, {
    colorize: getFishColorizeSetting(fish)
  }) || sourceImage;
}

function getFishCanvasFilter(fish, healthRatio = 1, now = Date.now()) {
  const filters = [];
  const grayscalePercent = Math.round((1 - clamp(Number(healthRatio) || 0, 0, 1)) * 100);
  const colorCycleFilter = getFishColorCycleFilter(fish, now);
  const diseaseSaturationPercent = getFishDiseaseSaturationPercent(fish, now);
  const diseaseBrightnessPercent = getFishDiseaseBrightnessPercent(fish, now);

  if (colorCycleFilter !== "none") {
    filters.push(colorCycleFilter);
  }
  if (diseaseSaturationPercent < 100 || diseaseBrightnessPercent < 100) {
    filters.push(`saturate(${diseaseSaturationPercent}%) brightness(${diseaseBrightnessPercent}%)`);
  }
  if (!isFishDead(fish) && isTankLightsOut(now)) {
    filters.push(isNightActiveFish(fish) ? "brightness(108%) saturate(96%)" : "brightness(84%) saturate(82%)");
  }
  if (grayscalePercent > 0) {
    filters.push(`grayscale(${grayscalePercent}%)`);
  }
  if (!isFishDead(fish)) {
    const comfortValue = getFishComfort(fish, now).value;
    if (comfortValue <= 0.4) {
      filters.push("brightness(72%) saturate(68%) drop-shadow(0 0 10px rgba(0, 0, 0, 0.62))");
    }
  }

  return filters.length ? filters.join(" ") : "none";
}

function sanitizeDiseaseState(value) {
  const stateId = typeof value === "string" ? value.trim() : "";
  return DISEASE_STATES.includes(stateId) ? stateId : DISEASE_STATE_NONE;
}

function sanitizeDiseaseSignalMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, timestamp]) => DISEASE_SIGNAL_TYPES.includes(key) && Number.isFinite(Number(timestamp)))
      .map(([key, timestamp]) => [key, Math.max(0, Number(timestamp))])
      .sort((left, right) => right[1] - left[1])
      .slice(0, DISEASE_SIGNAL_HISTORY_LIMIT)
  );
}

function randomDelay(minMs, maxMs) {
  return Math.max(0, Number(minMs) || 0) + Math.random() * Math.max(0, (Number(maxMs) || 0) - (Number(minMs) || 0));
}

function hasIllnessUnlocked(targetState = state) {
  return Boolean(targetState?.dailyBonus?.milestones?.["stable-tank"]);
}

function isActiveDiseaseState(stateId) {
  return [
    DISEASE_STATE_CARRIER,
    DISEASE_STATE_INCUBATING,
    DISEASE_STATE_EARLY,
    DISEASE_STATE_VISIBLE,
    DISEASE_STATE_SEVERE,
    DISEASE_STATE_RECOVERING
  ].includes(sanitizeDiseaseState(stateId));
}

function hasActiveFishDisease(fish) {
  return Boolean(fish && isActiveDiseaseState(fish.diseaseState));
}

function isFishDiseaseVisible(fish) {
  return [
    DISEASE_STATE_EARLY,
    DISEASE_STATE_VISIBLE,
    DISEASE_STATE_SEVERE,
    DISEASE_STATE_RECOVERING
  ].includes(sanitizeDiseaseState(fish?.diseaseState));
}

function isFishDiseaseContagious(fish) {
  return [
    DISEASE_STATE_CARRIER,
    DISEASE_STATE_INCUBATING,
    DISEASE_STATE_EARLY,
    DISEASE_STATE_VISIBLE,
    DISEASE_STATE_SEVERE,
    DISEASE_STATE_RECOVERING
  ].includes(sanitizeDiseaseState(fish?.diseaseState));
}

function isFishDiseaseAvoidanceSource(fish) {
  return [
    DISEASE_STATE_VISIBLE,
    DISEASE_STATE_SEVERE
  ].includes(sanitizeDiseaseState(fish?.diseaseState));
}

function getDiseaseStateFromProgress(progressMs) {
  const progress = Math.max(0, Number(progressMs) || 0);
  if (progress < DISEASE_CARRIER_MS) {
    return DISEASE_STATE_CARRIER;
  }
  if (progress < DISEASE_INCUBATING_MS) {
    return DISEASE_STATE_INCUBATING;
  }
  if (progress < DISEASE_EARLY_MS) {
    return DISEASE_STATE_EARLY;
  }
  if (progress < DISEASE_VISIBLE_MS) {
    return DISEASE_STATE_VISIBLE;
  }
  return DISEASE_STATE_SEVERE;
}

function getDebugDiseaseProgressForStage(stateId) {
  switch (sanitizeDiseaseState(stateId)) {
    case DISEASE_STATE_CARRIER:
      return 0;
    case DISEASE_STATE_INCUBATING:
      return DISEASE_CARRIER_MS;
    case DISEASE_STATE_EARLY:
      return DISEASE_INCUBATING_MS;
    case DISEASE_STATE_VISIBLE:
      return DISEASE_EARLY_MS;
    case DISEASE_STATE_SEVERE:
    case DISEASE_STATE_RECOVERING:
      return DISEASE_VISIBLE_MS;
    default:
      return 0;
  }
}

function resetFishDiseaseFields(fish, stateId = DISEASE_STATE_NONE, now = Date.now()) {
  if (!fish) {
    return false;
  }

  const previous = [
    fish.diseaseState,
    fish.diseaseType,
    fish.diseaseInfectedAt,
    fish.diseaseProgressMs,
    fish.diseaseLastProgressAt,
    fish.diseaseExposureLevel,
    fish.diseaseRecoveryProgressMs,
    fish.diseaseTreatedUntil,
    fish.diseaseLastDamageAt,
    fish.diseaseSource,
    fish.temporaryImmunityUntil,
    fish.nextDiseaseCheckAt,
    fish.nextDiseaseSpreadCheckAt,
    fish.nextSymptomCheckAt,
    fish.nextGreenBubbleAt
  ].join("|");

  fish.diseaseState = sanitizeDiseaseState(stateId);
  fish.diseaseType = "";
  fish.diseaseInfectedAt = 0;
  fish.diseaseProgressMs = 0;
  fish.diseaseLastProgressAt = 0;
  fish.diseaseExposureLevel = 0;
  fish.diseaseRecoveryProgressMs = 0;
  fish.diseaseTreatedUntil = 0;
  fish.diseaseLastDamageAt = 0;
  fish.diseaseSource = "";
  fish.temporaryImmunityUntil = 0;
  fish.nextDiseaseCheckAt = now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS);
  fish.nextDiseaseSpreadCheckAt = now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS);
  fish.nextSymptomCheckAt = now + randomDelay(DISEASE_SYMPTOM_CHECK_MIN_MS, DISEASE_SYMPTOM_CHECK_MAX_MS);
  fish.nextGreenBubbleAt = 0;
  fish.lastIllnessSignalAtByType = sanitizeDiseaseSignalMap(fish.lastIllnessSignalAtByType);

  if (fish.diseaseState === DISEASE_STATE_IMMUNE) {
    fish.temporaryImmunityUntil = now + randomBetween(DISEASE_TEMPORARY_IMMUNITY_MIN_MS, DISEASE_TEMPORARY_IMMUNITY_MAX_MS);
  }

  const current = [
    fish.diseaseState,
    fish.diseaseType,
    fish.diseaseInfectedAt,
    fish.diseaseProgressMs,
    fish.diseaseLastProgressAt,
    fish.diseaseExposureLevel,
    fish.diseaseRecoveryProgressMs,
    fish.diseaseTreatedUntil,
    fish.diseaseLastDamageAt,
    fish.diseaseSource,
    fish.temporaryImmunityUntil,
    fish.nextDiseaseCheckAt,
    fish.nextDiseaseSpreadCheckAt,
    fish.nextSymptomCheckAt,
    fish.nextGreenBubbleAt
  ].join("|");
  return previous !== current;
}

function infectFishWithDisease(fish, source = "conditions", now = Date.now(), initialState = DISEASE_STATE_INCUBATING) {
  if (
    !fish
    || !hasIllnessUnlocked()
    || isFishDead(fish)
    || isUndeadFish(fish)
    || hasActiveFishDisease(fish)
    || sanitizeDiseaseState(fish.diseaseState) === DISEASE_STATE_IMMUNE
    || (Number(fish.temporaryImmunityUntil) || 0) > now
  ) {
    return false;
  }

  const stateId = sanitizeDiseaseState(initialState);
  fish.diseaseState = stateId === DISEASE_STATE_NONE || stateId === DISEASE_STATE_IMMUNE
    ? DISEASE_STATE_INCUBATING
    : stateId;
  fish.diseaseType = DISEASE_TYPE_GENERIC;
  fish.diseaseInfectedAt = now;
  fish.diseaseProgressMs = fish.diseaseState === DISEASE_STATE_CARRIER ? 0 : DISEASE_CARRIER_MS;
  fish.diseaseLastProgressAt = now;
  fish.diseaseExposureLevel = 0;
  fish.diseaseRecoveryProgressMs = 0;
  fish.diseaseTreatedUntil = 0;
  fish.temporaryImmunityUntil = 0;
  fish.nextDiseaseCheckAt = now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS);
  fish.nextDiseaseSpreadCheckAt = now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS);
  fish.nextSymptomCheckAt = now + randomDelay(DISEASE_SYMPTOM_CHECK_MIN_MS, DISEASE_SYMPTOM_CHECK_MAX_MS);
  fish.nextGreenBubbleAt = getNextGreenBubbleAtForDisease(fish, now);
  fish.lastIllnessRiskDayKey = typeof fish.lastIllnessRiskDayKey === "string" ? fish.lastIllnessRiskDayKey : "";
  fish.lastIllnessSignalAtByType = sanitizeDiseaseSignalMap(fish.lastIllnessSignalAtByType);
  fish.diseaseLastDamageAt = now;
  fish.diseaseSource = String(source || "conditions");
  return true;
}

function getDiseaseTankCleanliness(now = Date.now()) {
  return clamp(1 - getBaseTankDirtiness(now), 0, 1);
}

function getTankLivingFishLoad(targetTank = getCurrentTank()) {
  return (Array.isArray(targetTank?.fish) ? targetTank.fish : []).filter((fish) => fish && !isFishDead(fish)).length;
}

function isTankCrowdedForDisease(targetTank = getCurrentTank()) {
  return getTankLivingFishLoad(targetTank) > DISEASE_CROWDED_LOAD_THRESHOLD;
}

function getAverageLivingTankComfort(now = Date.now(), targetTank = getCurrentTank()) {
  const livingFish = (Array.isArray(targetTank?.fish) ? targetTank.fish : []).filter((fish) => fish && !isFishDead(fish));
  if (!livingFish.length) {
    return 1;
  }

  return livingFish.reduce((total, fish) => total + getFishComfort(fish, now).value, 0) / livingFish.length;
}

function getNewFishDiseaseCarrierChance(now = Date.now()) {
  if (!hasIllnessUnlocked()) {
    return 0;
  }

  const cleanliness = getDiseaseTankCleanliness(now);
  let chance = cleanliness < DISEASE_LOW_CLEANLINESS_THRESHOLD
    ? randomBetween(DISEASE_NEW_FISH_DIRTY_MIN_CHANCE, DISEASE_NEW_FISH_DIRTY_MAX_CHANCE)
    : DISEASE_NEW_FISH_CLEAN_CHANCE;
  if (isTankCrowdedForDisease()) {
    chance += randomBetween(DISEASE_NEW_FISH_CROWDED_MIN_BONUS, DISEASE_NEW_FISH_CROWDED_MAX_BONUS);
  }
  if (getAverageLivingTankComfort(now) < DISEASE_LOW_COMFORT_THRESHOLD) {
    chance += randomBetween(DISEASE_NEW_FISH_LOW_COMFORT_MIN_BONUS, DISEASE_NEW_FISH_LOW_COMFORT_MAX_BONUS);
  }
  return clamp(chance, 0, 0.28);
}

function maybeSeedNewFishDiseaseCarrier(fish, now = Date.now()) {
  if (!fish || !hasIllnessUnlocked() || isUndeadFish(fish)) {
    return false;
  }
  return Math.random() < getNewFishDiseaseCarrierChance(now)
    ? infectFishWithDisease(fish, "new-fish", now, DISEASE_STATE_CARRIER)
    : false;
}

function getDailyFishDiseaseChance(fish, now = Date.now()) {
  if (!fish || !hasIllnessUnlocked() || hasActiveFishDisease(fish) || isFishDead(fish) || isUndeadFish(fish)) {
    return 0;
  }

  if ((Number(fish.temporaryImmunityUntil) || 0) > now) {
    return DISEASE_BASE_DAILY_CHANCE * 0.12;
  }

  const cleanliness = getDiseaseTankCleanliness(now);
  const comfort = getFishComfort(fish, now).value;
  let chance = DISEASE_BASE_DAILY_CHANCE;
  if (cleanliness < DISEASE_LOW_CLEANLINESS_THRESHOLD) {
    chance += DISEASE_LOW_CLEANLINESS_CHANCE;
  }
  if (cleanliness < DISEASE_CRITICAL_CLEANLINESS_THRESHOLD) {
    chance += DISEASE_CRITICAL_CLEANLINESS_CHANCE;
  }
  if (comfort < DISEASE_LOW_COMFORT_THRESHOLD) {
    chance += DISEASE_LOW_COMFORT_CHANCE;
  }
  if (isTankCrowdedForDisease()) {
    chance += DISEASE_CROWDED_CHANCE;
  }
  return clamp(chance, 0, 0.08);
}

function getDiseaseStageSpreadMultiplier(stateId) {
  switch (sanitizeDiseaseState(stateId)) {
    case DISEASE_STATE_CARRIER:
      return 0.08;
    case DISEASE_STATE_INCUBATING:
      return 0.3;
    case DISEASE_STATE_EARLY:
      return 0.8;
    case DISEASE_STATE_VISIBLE:
      return 1.8;
    case DISEASE_STATE_SEVERE:
      return 3;
    case DISEASE_STATE_RECOVERING:
      return 0.25;
    default:
      return 0;
  }
}

function getDiseaseSpreadCheckExposureCap(stateId) {
  const cap = DISEASE_SPREAD_CHECK_EXPOSURE_CAPS[sanitizeDiseaseState(stateId)];
  return Number.isFinite(Number(cap)) && Number(cap) > 0
    ? Number(cap)
    : DISEASE_EXPOSURE_MAX;
}

function getDiseaseCleanlinessMultiplier(cleanliness) {
  const value = clamp(Number(cleanliness) || 0, 0, 1) * 100;
  if (value >= 80) {
    return 0.4;
  }
  if (value >= 60) {
    return 0.8;
  }
  if (value >= 40) {
    return 1.2;
  }
  if (value >= 20) {
    return 1.7;
  }
  return 2.5;
}

function getDiseaseComfortMultiplier(comfort) {
  const value = clamp(Number(comfort) || 0, 0, 1) * 100;
  if (value >= 70) {
    return 0.6;
  }
  if (value >= 41) {
    return 1;
  }
  if (value >= 21) {
    return 1.5;
  }
  return 2;
}

function getDiseaseExposureRadiusNorm(sourceFish) {
  const radiusPx = isTankCrowdedForDisease()
    ? DISEASE_PROXIMITY_CROWDED_PX
    : getFishVisualSize(sourceFish) <= 140
      ? DISEASE_PROXIMITY_SMALL_PX
      : DISEASE_PROXIMITY_NORMAL_PX;
  return radiusPx / Math.max(TANK_WIDTH, TANK_HEIGHT);
}

function getDiseaseVisibleAvoidanceRadiusNorm(sourceFish, targetFish) {
  const exposureRadius = getDiseaseExposureRadiusNorm(sourceFish);
  const visualFootprintNorm = (
    (getFishVisualSize(sourceFish) || 0)
    + (getFishVisualSize(targetFish) || 0)
  ) * 0.52 / Math.max(TANK_WIDTH, TANK_HEIGHT);
  return clamp(
    Math.max(exposureRadius * 2.6, visualFootprintNorm + 0.18, DISEASE_VISIBLE_AVOIDANCE_MIN_RADIUS_NORM),
    exposureRadius,
    DISEASE_VISIBLE_AVOIDANCE_MAX_RADIUS_NORM
  );
}

function getFishDiseaseComfortPenalty(fish, now = Date.now()) {
  switch (sanitizeDiseaseState(fish?.diseaseState)) {
    case DISEASE_STATE_EARLY:
      return 0.08;
    case DISEASE_STATE_VISIBLE:
      return 0.2;
    case DISEASE_STATE_SEVERE:
      return 0.38;
    case DISEASE_STATE_RECOVERING:
      return 0.1 * (1 - getFishDiseaseRecoveryRatio(fish));
    default:
      return 0;
  }
}

function getFishDiseaseRecoveryRatio(fish) {
  return clamp((Number(fish?.diseaseRecoveryProgressMs) || 0) / DISEASE_RECOVERY_REQUIRED_MS, 0, 1);
}

function getFishDiseaseSpeedMultiplier(fish, now = Date.now()) {
  switch (sanitizeDiseaseState(fish?.diseaseState)) {
    case DISEASE_STATE_INCUBATING:
      return 0.95;
    case DISEASE_STATE_EARLY:
      return 0.86;
    case DISEASE_STATE_VISIBLE:
      return 0.68;
    case DISEASE_STATE_SEVERE:
      return 0.46;
    case DISEASE_STATE_RECOVERING:
      return 0.78 + getFishDiseaseRecoveryRatio(fish) * 0.2;
    default:
      return 1;
  }
}

function getFishDiseaseSaturationPercent(fish, now = Date.now()) {
  switch (sanitizeDiseaseState(fish?.diseaseState)) {
    case DISEASE_STATE_EARLY:
      return 88;
    case DISEASE_STATE_VISIBLE:
      return 74;
    case DISEASE_STATE_SEVERE:
      return 56;
    case DISEASE_STATE_RECOVERING:
      return Math.round(82 + getFishDiseaseRecoveryRatio(fish) * 18);
    default:
      return 100;
  }
}

function getFishDiseaseBrightnessPercent(fish, now = Date.now()) {
  switch (sanitizeDiseaseState(fish?.diseaseState)) {
    case DISEASE_STATE_VISIBLE:
      return 92;
    case DISEASE_STATE_SEVERE:
      return 78;
    case DISEASE_STATE_RECOVERING:
      return Math.round(88 + getFishDiseaseRecoveryRatio(fish) * 12);
    default:
      return 100;
  }
}

function getFishDiseaseFoodRefusalChance(fish, now = Date.now()) {
  let chance = 0;
  switch (sanitizeDiseaseState(fish?.diseaseState)) {
    case DISEASE_STATE_INCUBATING:
      chance = 0.04;
      break;
    case DISEASE_STATE_EARLY:
      chance = 0.16;
      break;
    case DISEASE_STATE_VISIBLE:
      chance = 0.45;
      break;
    case DISEASE_STATE_SEVERE:
      chance = 0.82;
      break;
    case DISEASE_STATE_RECOVERING:
      chance = 0.28 * (1 - getFishDiseaseRecoveryRatio(fish));
      break;
    default:
      chance = 0;
  }

  if (getFishComfort(fish, now).value <= DISEASE_LOW_COMFORT_THRESHOLD) {
    chance += 0.1;
  }
  return clamp(chance, 0, 0.95);
}

function recordDiseaseSignal(fish, signalType, now = Date.now()) {
  if (!fish || !DISEASE_SIGNAL_TYPES.includes(signalType)) {
    return false;
  }

  const signals = sanitizeDiseaseSignalMap(fish.lastIllnessSignalAtByType);
  const previousAt = Number(signals[signalType]) || 0;
  if (previousAt && now - previousAt < DISEASE_TASK_COOLDOWN_MS) {
    return false;
  }

  signals[signalType] = now;
  fish.lastIllnessSignalAtByType = sanitizeDiseaseSignalMap(signals);
  pushDiseaseSignalHistoryEvent(fish, signalType, now);
  return true;
}

function forceDiseaseSignalForDebug(fish, signalType, now = Date.now()) {
  if (!fish || !DISEASE_SIGNAL_TYPES.includes(signalType)) {
    return false;
  }

  const signals = sanitizeDiseaseSignalMap(fish.lastIllnessSignalAtByType);
  signals[signalType] = now;
  fish.lastIllnessSignalAtByType = sanitizeDiseaseSignalMap(signals);
  return true;
}

function getRecentDiseaseSignals(fish, now = Date.now()) {
  const signals = sanitizeDiseaseSignalMap(fish?.lastIllnessSignalAtByType);
  const cutoff = now - 12 * MINUTE_MS;
  return Object.entries(signals)
    .filter(([, timestamp]) => Number(timestamp) >= cutoff)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .map(([type]) => type);
}

function getDiseaseSignalHistoryEventText(signalType, fish, species) {
  const displayName = fish?.name || "A fish";
  const speciesName = species ? getFishDisplaySpeciesName(fish, species) : "fish";
  switch (signalType) {
    case "looking_under_weather":
      return `${displayName} looks off-color.`;
    case "green_bubbles":
      return `${displayName} is producing strange green bubbles.`;
    case "food_refused":
      return `${displayName} approached food but did not eat.`;
    case "missed_feeding":
      return `${displayName} stopped joining feeding time.`;
    case "hiding_more_than_usual":
    case "sick_isolation":
      return `${displayName} has been hiding more than usual.`;
    case "avoiding_group":
      return `${displayName} is avoiding the group.`;
    case "surface_hover":
      return `${displayName} is staying near the surface.`;
    case "bottom_sit":
      return `${displayName} is sitting low in the tank.`;
    case "slow_drift":
      return `${displayName} is drifting more weakly than usual.`;
    case "stopped_grazing":
      return "A cleanup fish has stopped grazing.";
    case "stopped_digging":
      return `${displayName} has stopped exploring the bottom.`;
    case "stopped_hunting":
      return `${displayName} has stopped hunting.`;
    case "night_active_still":
      return `${displayName} has been unusually still at night.`;
    case "odd_sleep_spot":
      return `${displayName} is resting somewhere unusual.`;
    case "lingering_near_bubbler":
      return `${displayName} is lingering near a bubbler.`;
    default:
      return `${displayName} is not following its usual routine.`;
  }
}

function pushDiseaseSignalHistoryEvent(fish, signalType, now = Date.now()) {
  if (!fish || !DISEASE_SIGNAL_TYPES.includes(signalType)) {
    return false;
  }

  const eventText = getDiseaseSignalHistoryEventText(signalType, fish, getSpeciesForFish(fish));
  if (!eventText) {
    return false;
  }

  pushEvent(eventText, now, getCurrentTank(), {
    type: hasActiveFishDisease(fish) ? "illness" : "behavior",
    fishId: fish.id,
    recapEligible: false
  });
  return true;
}

function shouldFishRefuseFoodForDisease(fish, foodKey = "basic", now = Date.now()) {
  if (!fish || isFishDead(fish) || isMealFreeFish(fish) || isUndeadFish(fish)) {
    return false;
  }
  if (!canFoodSatisfyFishMeal(fish, foodKey)) {
    return false;
  }
  return Math.random() < getFishDiseaseFoodRefusalChance(fish, now);
}

function getNextGreenBubbleAtForDisease(fish, now = Date.now()) {
  switch (sanitizeDiseaseState(fish?.diseaseState)) {
    case DISEASE_STATE_EARLY:
      return now + randomBetween(30 * 1000, 60 * 1000);
    case DISEASE_STATE_VISIBLE:
      return now + randomBetween(10 * 1000, 25 * 1000);
    case DISEASE_STATE_SEVERE:
      return now + randomBetween(4 * 1000, 10 * 1000);
    case DISEASE_STATE_RECOVERING:
      return now + randomBetween(15 * 1000, 30 * 1000 + getFishDiseaseRecoveryRatio(fish) * 30 * 1000);
    default:
      return 0;
  }
}

function shouldDrawDiseaseGreenBubble(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return false;
  }
  const stateId = sanitizeDiseaseState(fish.diseaseState);
  if ([DISEASE_STATE_VISIBLE, DISEASE_STATE_SEVERE, DISEASE_STATE_RECOVERING].includes(stateId)) {
    return true;
  }
  return stateId === DISEASE_STATE_EARLY
    && Number(fish.nextGreenBubbleAt) > 0
    && now >= Number(fish.nextGreenBubbleAt) - DISEASE_GREEN_BUBBLE_CADENCE_MS;
}

function getFishDiseaseBubbleMouthPoint(fish, species, pose, width, height, now = Date.now()) {
  const stableScale = getViewportStableAssetScale();
  const direction = pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1);
  const mouthOffset = getFishFrontMouthOffsetAtPose(
    fish,
    species,
    width,
    height,
    pose,
    now,
    2.8 * stableScale
  );
  return {
    x: pose.x + mouthOffset.x,
    y: pose.y + mouthOffset.y,
    direction,
    stableScale
  };
}

function clearDiseaseGreenBubbleStream(fish) {
  if (fish?.id) {
    runtime.diseaseGreenBubblesByFishId.delete(fish.id);
  }
}

function getDiseaseGreenBubbleStream(fish, now = Date.now()) {
  if (!fish?.id) {
    return null;
  }

  let stream = runtime.diseaseGreenBubblesByFishId.get(fish.id);
  if (!stream) {
    stream = {
      lastEmissionAt: now - DISEASE_GREEN_BUBBLE_CADENCE_MS,
      bubbles: []
    };
    runtime.diseaseGreenBubblesByFishId.set(fish.id, stream);
  }
  return stream;
}

function emitDiseaseGreenBubble(fish, mouth, stream, emissionAt, now = Date.now()) {
  const seed = hashStringToUint32(`${fish.id}|disease-green-bubble|${Math.floor(emissionAt / DISEASE_GREEN_BUBBLE_CADENCE_MS)}`);
  const rand = mulberry32(seed ^ 0x87c2f40d);
  const stateId = sanitizeDiseaseState(fish.diseaseState);
  const severeScale = stateId === DISEASE_STATE_SEVERE ? 1.22 : 1;
  stream.bubbles.push({
    createdAt: emissionAt,
    sourceX: mouth.x + mouth.direction * randomBetweenWith(rand, 0, 2.5) * mouth.stableScale,
    sourceY: mouth.y + randomBetweenWith(rand, -2.2, 2.4) * mouth.stableScale,
    seed,
    radius: randomBetweenWith(rand, 2.9, 4.7) * randomBetweenWith(rand, 1, 1.1) * severeScale,
    stretch: randomBetweenWith(rand, 0.88, 1.16),
    driftX: randomBetweenWith(rand, -12, 12) * mouth.stableScale,
    wobble: randomBetweenWith(rand, 1.2, 3.8) * mouth.stableScale,
    wobblePhase: randomBetweenWith(rand, 0, Math.PI * 2),
    layerBias: randomBetweenWith(rand, 0, 1)
  });
}

function syncDiseaseGreenBubbleStream(fish, species, pose, width, height, now = Date.now()) {
  if (!shouldDrawDiseaseGreenBubble(fish, now)) {
    clearDiseaseGreenBubbleStream(fish);
    return null;
  }

  const mouth = getFishDiseaseBubbleMouthPoint(fish, species, pose, width, height, now);
  const stream = getDiseaseGreenBubbleStream(fish, now);
  if (!stream) {
    return null;
  }

  if (now - Number(stream.lastEmissionAt || 0) > MAX_BUBBLER_TRAVEL_DURATION_MS + DISEASE_GREEN_BUBBLE_CADENCE_MS) {
    stream.lastEmissionAt = now - DISEASE_GREEN_BUBBLE_CADENCE_MS;
    stream.bubbles = [];
  }

  const latestAllowedEmissionAt = now;
  let guard = 0;
  while (
    stream.lastEmissionAt + DISEASE_GREEN_BUBBLE_CADENCE_MS <= latestAllowedEmissionAt
    && guard < DISEASE_GREEN_BUBBLE_MAX_PER_FISH
  ) {
    stream.lastEmissionAt += DISEASE_GREEN_BUBBLE_CADENCE_MS;
    emitDiseaseGreenBubble(fish, mouth, stream, stream.lastEmissionAt, now);
    guard += 1;
  }
  return stream;
}

function drawFishDiseaseBubbles(fish, species, pose, width, height, now = Date.now()) {
  const stream = syncDiseaseGreenBubbleStream(fish, species, pose, width, height, now);
  if (!stream?.bubbles?.length) {
    return;
  }

  const stableScale = getViewportStableAssetScale();
  const palette = getBubbleOrbPalette(DISEASE_GREEN_BUBBLE_COLOR, {
    fillOpacity: 0.4,
    colorize: true
  });
  const waterlineStopY = WATER_SURFACE_Y + Math.max(2 * stableScale, 2);
  const nextBubbles = [];
  const renderedBubbles = [];
  for (const bubble of stream.bubbles) {
    const ageMs = now - Number(bubble.createdAt);
    if (ageMs < 0) {
      nextBubbles.push(bubble);
      continue;
    }

    const radius = Number(bubble.radius) || 3.4;
    const availableTravelPx = Math.max(10 * stableScale, Number(bubble.sourceY) - waterlineStopY);
    const travelDurationMs = clamp(
      availableTravelPx * 27,
      DISEASE_GREEN_BUBBLE_MIN_TRAVEL_MS,
      MAX_BUBBLER_TRAVEL_DURATION_MS
    );
    const popProgress = clamp((ageMs - travelDurationMs) / DISEASE_GREEN_BUBBLE_POP_MS, 0, 1);
    if (ageMs > travelDurationMs + DISEASE_GREEN_BUBBLE_POP_MS) {
      continue;
    }

    nextBubbles.push(bubble);
    const travelProgress = clamp(ageMs / travelDurationMs, 0, 1);
    const spawnFade = clamp(ageMs / 280, 0, 1);
    const x = Number(bubble.sourceX)
      + Number(bubble.driftX) * travelProgress
      + Math.sin(now / 2200 + Number(bubble.wobblePhase)) * Number(bubble.wobble) * (0.28 + travelProgress * 0.72);
    const rawY = Number(bubble.sourceY) - availableTravelPx * travelProgress;
    const y = Math.max(rawY, waterlineStopY + radius * stableScale);
    const alpha = clamp(spawnFade * (popProgress > 0 ? 1 - popProgress : 1), 0, 1);
    if (alpha <= 0.008 && popProgress <= 0) {
      continue;
    }

    const malform = popProgress > 0
      ? null
      : {
        seed: bubble.seed ^ 0x7f4a7c15,
        amount: 0.32,
        phase: now / 5200 + Number(bubble.wobblePhase),
        rotation: Math.sin(now / 6800 + Number(bubble.seed)) * 0.08,
        speed: 0.5
      };
    renderedBubbles.push({
      depth: Number(bubble.layerBias) || 0,
      x,
      y,
      radius,
      alpha,
      stretch: Number(bubble.stretch) || 1,
      malform,
      popProgress,
      seed: bubble.seed
    });
  }

  stream.bubbles = nextBubbles.slice(-DISEASE_GREEN_BUBBLE_MAX_PER_FISH);
  renderedBubbles
    .sort((left, right) => left.depth - right.depth || left.y - right.y)
    .forEach((bubble) => {
      if (bubble.popProgress > 0) {
        drawBubblePopBurstToContext(
          tankContext,
          bubble.x,
          bubble.y,
          bubble.radius,
          bubble.alpha,
          palette,
          stableScale,
          bubble.seed,
          bubble.popProgress,
          {
            count: BUBBLER_POP_MICRO_BUBBLE_COUNT,
            burstScale: 1.05,
            surfaceY: waterlineStopY
          }
        );
        return;
      }
      drawBubbleOrbToContext(tankContext, bubble.x, bubble.y, bubble.radius, bubble.alpha, bubble.stretch, palette, stableScale, {
        malform: bubble.malform
      });
    });
  if (!stream.bubbles.length) {
    runtime.diseaseGreenBubblesByFishId.delete(fish.id);
  }
}

function processDiseaseDailyRisk(fish, now = Date.now()) {
  const dayKey = getLocalDayKey(now);
  if (!fish || !hasIllnessUnlocked() || fish.lastIllnessRiskDayKey === dayKey) {
    return false;
  }

  fish.lastIllnessRiskDayKey = dayKey;
  const chance = getDailyFishDiseaseChance(fish, now);
  if (chance <= 0 || Math.random() >= chance) {
    return true;
  }

  return infectFishWithDisease(fish, "conditions", now, DISEASE_STATE_INCUBATING) || true;
}

function applyFirstAidDiseaseSlowdown(now = Date.now()) {
  let changed = false;
  for (const fish of getLivingTankFish()) {
    if (!hasActiveFishDisease(fish)) {
      continue;
    }
    const nextTreatedUntil = Math.max(Number(fish.diseaseTreatedUntil) || 0, now + DISEASE_TREATMENT_SLOW_MS);
    if (fish.diseaseTreatedUntil !== nextTreatedUntil) {
      fish.diseaseTreatedUntil = nextTreatedUntil;
      changed = true;
    }
  }
  return changed;
}

function processFishDisease(now = Date.now()) {
  if (!state?.fish?.length) {
    return false;
  }

  let changed = false;
  const previousSimulatedAt = Math.min(now, Number(state.lastSimulatedAt) || now);
  const cleanliness = getDiseaseTankCleanliness(now);

  for (const fish of state.fish) {
    if (!fish || isFishDead(fish) || isUndeadFish(fish)) {
      if (hasActiveFishDisease(fish)) {
        changed = resetFishDiseaseFields(fish, DISEASE_STATE_NONE, now) || changed;
      }
      continue;
    }

    let stateId = sanitizeDiseaseState(fish.diseaseState);
    if (stateId === DISEASE_STATE_IMMUNE) {
      if ((Number(fish.temporaryImmunityUntil) || 0) <= now) {
        changed = resetFishDiseaseFields(fish, DISEASE_STATE_NONE, now) || changed;
      }
      continue;
    }

    if (!hasActiveFishDisease(fish)) {
      if (now >= (Number(fish.nextDiseaseCheckAt) || 0)) {
        fish.diseaseExposureLevel = Math.max(0, (Number(fish.diseaseExposureLevel) || 0) - (cleanliness >= 0.8 ? DISEASE_EXPOSURE_DECAY_CLEAN : DISEASE_EXPOSURE_DECAY_DIRTY));
        changed = processDiseaseDailyRisk(fish, now) || changed;
        fish.nextDiseaseCheckAt = now + randomDelay(DISEASE_EXPOSURE_DECAY_MIN_MS, DISEASE_EXPOSURE_DECAY_MAX_MS);
      }
      continue;
    }

    if (now >= (Number(fish.nextDiseaseCheckAt) || 0)) {
      const diseaseElapsedMs = clamp(now - (Number(fish.diseaseLastProgressAt) || previousSimulatedAt), 0, DAY_MS);
      fish.diseaseLastProgressAt = now;
      fish.nextDiseaseCheckAt = now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS);

      const treated = (Number(fish.diseaseTreatedUntil) || 0) > now;
      const comfort = getFishComfort(fish, now).value;
      const goodConditions = cleanliness >= DISEASE_LOW_CLEANLINESS_THRESHOLD && comfort > DISEASE_LOW_COMFORT_THRESHOLD;
      const progressRate = treated ? DISEASE_TREATED_MULTIPLIER : 1;
      if (stateId !== DISEASE_STATE_RECOVERING) {
        fish.diseaseProgressMs = Math.max(0, Number(fish.diseaseProgressMs) || 0) + diseaseElapsedMs * progressRate;
      }

      if (goodConditions) {
        fish.diseaseRecoveryProgressMs = Math.min(
          DISEASE_RECOVERY_REQUIRED_MS,
          (Number(fish.diseaseRecoveryProgressMs) || 0) + diseaseElapsedMs * (treated ? DISEASE_RECOVERY_TREATED_MULTIPLIER : 1)
        );
      } else {
        fish.diseaseRecoveryProgressMs = Math.max(0, (Number(fish.diseaseRecoveryProgressMs) || 0) - diseaseElapsedMs * 0.45);
      }

      if (fish.diseaseRecoveryProgressMs >= DISEASE_RECOVERY_REQUIRED_MS) {
        changed = resetFishDiseaseFields(fish, DISEASE_STATE_IMMUNE, now) || changed;
        recordDiseaseSignal(fish, "sick_isolation", now);
        continue;
      }

      const nextState = fish.diseaseRecoveryProgressMs >= DISEASE_RECOVERING_ENTRY_MS
        ? DISEASE_STATE_RECOVERING
        : getDiseaseStateFromProgress(fish.diseaseProgressMs);
      if (fish.diseaseState !== nextState) {
        fish.diseaseState = nextState;
        if (nextState === DISEASE_STATE_VISIBLE) {
          recordDiseaseSignal(fish, "looking_under_weather", now);
        }
        changed = true;
      }
      stateId = nextState;

      if (stateId === DISEASE_STATE_SEVERE) {
        const lastDamageAt = Number(fish.diseaseLastDamageAt) || Number(fish.diseaseInfectedAt) || now;
        if (now - lastDamageAt >= DISEASE_HEALTH_DAMAGE_INTERVAL_MS) {
          const result = applyFishDamage(fish, DISEASE_HEALTH_DAMAGE_UNITS, now, null, `${fish.name} died after a long decline.`);
          fish.diseaseLastDamageAt = now;
          changed = result.changed || changed;
        }
      }
    }

    if (now >= (Number(fish.nextSymptomCheckAt) || 0)) {
      changed = updateFishDiseaseSignals(fish, now) || changed;
      fish.nextSymptomCheckAt = now + randomDelay(DISEASE_SYMPTOM_CHECK_MIN_MS, DISEASE_SYMPTOM_CHECK_MAX_MS);
    }

    if (isFishDiseaseVisible(fish) && (!Number(fish.nextGreenBubbleAt) || now >= Number(fish.nextGreenBubbleAt) + 2000)) {
      fish.nextGreenBubbleAt = getNextGreenBubbleAtForDisease(fish, now);
      changed = true;
    }
  }

  changed = processFishDiseaseExposure(now) || changed;
  return changed;
}

function updateFishDiseaseSignals(fish, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  if (!species || !isFishDiseaseVisible(fish)) {
    return false;
  }

  const stateId = sanitizeDiseaseState(fish.diseaseState);
  const behavior = getEffectiveFishBehavior(fish, species);
  const signals = [];
  const allowSlowSignal = !isSlowGracefulFish(species);
  if (stateId === DISEASE_STATE_EARLY) {
    signals.push("hiding_more_than_usual");
    if (allowSlowSignal) {
      signals.push("slow_drift");
    }
  } else if (stateId === DISEASE_STATE_VISIBLE) {
    signals.push("looking_under_weather", "green_bubbles", "food_refused", "avoiding_group", "surface_hover", "hiding_more_than_usual");
  } else if (stateId === DISEASE_STATE_SEVERE) {
    signals.push("looking_under_weather", "green_bubbles", "surface_hover", "bottom_sit", "food_refused");
    if (allowSlowSignal) {
      signals.push("slow_drift");
    }
  } else if (stateId === DISEASE_STATE_RECOVERING) {
    signals.push("green_bubbles", "sick_isolation");
  }

  if (behavior === "sucker") {
    signals.push("stopped_grazing");
  } else if (behavior === "piranha") {
    signals.push("stopped_hunting");
  } else if (species.id === "loach") {
    signals.push("stopped_digging");
  } else if (isSocialDiseaseFish(species)) {
    signals.push("avoiding_group");
  }

  const picked = signals[Math.floor(Math.random() * signals.length)];
  return recordDiseaseSignal(fish, picked, now);
}

function isSocialDiseaseFish(speciesOrFish) {
  const species = speciesOrFish?.speciesId ? getSpeciesForFish(speciesOrFish) : speciesOrFish;
  return ["guppy", "cherry-barb", "neon-tetra", "livebearer", "molly", "clownfish", "rainbowfish"].includes(species?.id);
}

function processFishDiseaseExposure(now = Date.now()) {
  if (!hasIllnessUnlocked()) {
    return false;
  }

  let changed = false;
  const contagiousFish = state.fish.filter((fish) => (
    fish
    && !isFishDead(fish)
    && isFishDiseaseContagious(fish)
    && now >= (Number(fish.nextDiseaseSpreadCheckAt) || 0)
  ));
  if (!contagiousFish.length) {
    return false;
  }

  const cleanliness = getDiseaseTankCleanliness(now);
  for (const sourceFish of contagiousFish) {
    sourceFish.nextDiseaseSpreadCheckAt = now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS);
    const stageMultiplier = getDiseaseStageSpreadMultiplier(sourceFish.diseaseState);
    if (stageMultiplier <= 0) {
      continue;
    }

    const sourceTreatedMultiplier = (Number(sourceFish.diseaseTreatedUntil) || 0) > now ? DISEASE_TREATED_MULTIPLIER : 1;
    const radiusNorm = getDiseaseExposureRadiusNorm(sourceFish);
    for (const targetFish of state.fish) {
      if (
        !targetFish
        || targetFish.id === sourceFish.id
        || isFishDead(targetFish)
        || isUndeadFish(targetFish)
        || hasActiveFishDisease(targetFish)
      ) {
        continue;
      }

      const distanceNorm = Math.hypot((sourceFish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (sourceFish.yNorm || 0.5) - (targetFish.yNorm || 0.5));
      if (distanceNorm > radiusNorm) {
        continue;
      }

      const comfortMultiplier = getDiseaseComfortMultiplier(getFishComfort(targetFish, now).value);
      const proximityMultiplier = 1 + (1 - clamp(distanceNorm / Math.max(0.0001, radiusNorm), 0, 1));
      const sharedFeedingMultiplier = sourceFish.activity === "feeding" && targetFish.activity === "feeding"
        ? DISEASE_FEEDING_EXPOSURE_MULTIPLIER
        : 1;
      const sharedHideMultiplier = sourceFish.hangoutDecorId && sourceFish.hangoutDecorId === targetFish.hangoutDecorId
        ? DISEASE_SHARED_HIDE_EXPOSURE_MULTIPLIER
        : 1;
      const immunityMultiplier = (Number(targetFish.temporaryImmunityUntil) || 0) > now ? 0.15 : 1;
      const rawExposureGain = DISEASE_SPREAD_BASE_GAIN
        * stageMultiplier
        * sourceTreatedMultiplier
        * getDiseaseCleanlinessMultiplier(cleanliness)
        * comfortMultiplier
        * proximityMultiplier
        * sharedFeedingMultiplier
        * sharedHideMultiplier
        * immunityMultiplier;
      const exposureGain = Math.min(
        rawExposureGain,
        getDiseaseSpreadCheckExposureCap(sourceFish.diseaseState)
      );
      targetFish.diseaseExposureLevel = clamp((Number(targetFish.diseaseExposureLevel) || 0) + exposureGain, 0, DISEASE_EXPOSURE_MAX);
      changed = true;

      if (targetFish.diseaseExposureLevel >= DISEASE_EXPOSURE_MAX && infectFishWithDisease(targetFish, "exposure", now, DISEASE_STATE_INCUBATING)) {
        recordDiseaseSignal(sourceFish, "avoiding_group", now);
      }
    }
  }
  return changed;
}

function pickDiseaseBehaviorTarget(fish, species, now = Date.now()) {
  const stateId = sanitizeDiseaseState(fish?.diseaseState);
  if (
    !fish
    || !species
    || ![DISEASE_STATE_INCUBATING, DISEASE_STATE_EARLY, DISEASE_STATE_VISIBLE, DISEASE_STATE_SEVERE, DISEASE_STATE_RECOVERING].includes(stateId)
    || isFishDead(fish)
  ) {
    return null;
  }

  const behavior = getEffectiveFishBehavior(fish, species);
  const severe = stateId === DISEASE_STATE_SEVERE;
  const visible = stateId === DISEASE_STATE_VISIBLE || severe;
  const chance = stateId === DISEASE_STATE_INCUBATING ? 0.12 : stateId === DISEASE_STATE_EARLY ? 0.24 : stateId === DISEASE_STATE_RECOVERING ? 0.28 : severe ? 0.78 : 0.56;
  if (Math.random() > chance) {
    return null;
  }

  const base = {
    targetAt: now + randomBetween(5000, severe ? 16000 : 11000),
    targetLayer: getFishTankLayer(fish),
    speed: normalizeFishSpeed(species, randomBetween(species.speedMin, Math.max(species.speedMin, species.speedMax * (severe ? 0.45 : 0.72)))),
    signal: "slow_drift"
  };

  if (behavior === "sucker") {
    return {
      ...base,
      xNorm: clamp(fish.xNorm + randomBetween(-0.08, 0.08), 0.16, 0.84),
      yNorm: clamp(randomBetween(0.34, 0.62), 0.2, 0.72),
      targetLayer: TANK_DEPTH_LAYERS,
      signal: "stopped_grazing"
    };
  }

  if (behavior === "piranha") {
    return {
      ...base,
      xNorm: clamp(fish.xNorm + randomBetween(-0.18, 0.18), 0.1, 0.9),
      yNorm: severe ? randomBetween(0.18, 0.32) : randomBetween(0.3, 0.62),
      signal: "stopped_hunting"
    };
  }

  if (severe && Math.random() < 0.48) {
    return {
      ...base,
      xNorm: clamp(fish.xNorm + randomBetween(-0.08, 0.08), 0.1, 0.9),
      yNorm: Math.random() < 0.58 ? randomBetween(0.16, 0.28) : randomBetween(0.72, 0.82),
      signal: Math.random() < 0.58 ? "surface_hover" : "bottom_sit"
    };
  }

  const hideout = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["hide", "plant", "hardscape", "spooky", "bubbler"],
    chanceMultiplier: visible ? 2.4 : 1.5,
    lingerMultiplier: visible ? 2.4 : 1.45,
    occupancyLimit: 1,
    preferBackLayer: true
  });
  if (hideout) {
    return {
      ...base,
      xNorm: hideout.xNorm,
      yNorm: hideout.yNorm,
      targetAt: now + hideout.lingerMs,
      targetLayer: hideout.targetLayer,
      hangoutDecorId: hideout.decorId,
      hangoutZoneType: hideout.zoneType,
      signal: hideout.zoneType === "bubbler" ? "lingering_near_bubbler" : "hiding_more_than_usual"
    };
  }

  return {
    ...base,
    xNorm: clamp(fish.xNorm + randomBetween(-0.16, 0.16), 0.1, 0.9),
    yNorm: visible ? randomBetween(0.18, 0.74) : randomBetween(0.24, 0.72),
    signal: isSocialDiseaseFish(species) ? "avoiding_group" : "slow_drift"
  };
}

function applyDiseaseBehaviorTarget(fish, species, target, now = Date.now()) {
  if (!fish || !species || !target) {
    return false;
  }

  clearFishSchoolFollowState(fish);
  if (fish.caveState) {
    return false;
  }
  fish.activity = "roam";
  fish.feedingPelletId = null;
  releasePelletsTargetingFishIds(fish.id);
  fish.targetXNorm = clamp(target.xNorm, 0.08, 0.92);
  fish.targetYNorm = clamp(target.yNorm, 0.14, 0.84);
  fish.targetAt = target.targetAt || now + randomBetween(2500, 6500);
  fish.hangoutDecorId = target.hangoutDecorId || null;
  fish.hangoutZoneType = target.hangoutZoneType || null;
  setFishDesiredTankLayer(fish, Number.isFinite(Number(target.targetLayer)) ? clampTankLayer(Number(target.targetLayer)) : getFishTankLayer(fish));
  fish.swimSpeed = target.speed || normalizeFishSpeed(species);
  recordDiseaseSignal(fish, target.signal || "slow_drift", now);
  return true;
}

function getNearestContagiousDiseaseFish(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return null;
  }

  return state.fish
    .filter((otherFish) => (
      otherFish
      && otherFish.id !== fish.id
      && !isFishDead(otherFish)
      && isFishDiseaseAvoidanceSource(otherFish)
      && isFishDiseaseContagious(otherFish)
    ))
    .map((otherFish) => ({
      fish: otherFish,
      distanceNorm: Math.hypot((otherFish.xNorm || 0.5) - (fish.xNorm || 0.5), (otherFish.yNorm || 0.5) - (fish.yNorm || 0.5))
    }))
    .sort((left, right) => left.distanceNorm - right.distanceNorm)[0] || null;
}

function hasVisibleDiseaseAvoidanceSource(now = Date.now()) {
  return Array.isArray(state?.fish) && state.fish.some((fish) => (
    fish
    && !isFishDead(fish)
    && isFishDiseaseAvoidanceSource(fish)
    && isFishDiseaseContagious(fish)
  ));
}

function applyDiseaseAvoidanceTarget(fish, species, now = Date.now()) {
  if (!fish || !species || isFishDead(fish) || fish.activity !== "roam" || fish.caveState) {
    return false;
  }

  const nearest = getNearestContagiousDiseaseFish(fish, now);
  const avoidanceRadius = nearest ? getDiseaseVisibleAvoidanceRadiusNorm(nearest.fish, fish) : 0;
  if (!nearest || nearest.distanceNorm > avoidanceRadius) {
    return false;
  }

  const urgency = 1 - clamp(nearest.distanceNorm / Math.max(0.0001, avoidanceRadius), 0, 1);
  const retreatNorm = clamp(
    avoidanceRadius * randomBetween(0.72 + urgency * 0.22, 1.02 + urgency * 0.18),
    DISEASE_VISIBLE_AVOIDANCE_RETREAT_MIN_NORM,
    DISEASE_VISIBLE_AVOIDANCE_RETREAT_MAX_NORM
  );
  const escape = getAvoidanceEscapeTarget(fish, species, nearest.fish, {
    retreatNorm,
    verticalScale: randomBetween(0.58, 0.86),
    cornerThreatRadius: avoidanceRadius,
    targetLayer: getFishTankLayer(fish)
  });
  clearFishSchoolFollowState(fish);
  fish.targetXNorm = escape?.xNorm ?? fish.xNorm;
  fish.targetYNorm = escape?.yNorm ?? fish.yNorm;
  fish.targetAt = now + (escape?.cornerEscape ? randomBetween(520, 1100) : randomBetween(900, 1800));
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  if (escape?.targetLayer) {
    setFishDesiredTankLayer(fish, escape.targetLayer);
  }
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, randomBetween(Math.max(species.speedMin, species.speedMax * 0.84), species.speedMax));
  }
  recordDiseaseSignal(nearest.fish, "avoiding_group", now);
  return true;
}

function maybeApplyDiseaseAvoidanceReaction(fish, species, now = Date.now()) {
  if (!fish || !species || fish.activity !== "roam" || fish.caveState || isFishDead(fish) || isUndeadFish(fish)) {
    return false;
  }
  if (!hasVisibleDiseaseAvoidanceSource(now)) {
    return false;
  }
  if (Number(fish.behaviorNextThinkAt) > now) {
    return false;
  }

  fish.behaviorNextThinkAt = now + randomDelay(DISEASE_AVOIDANCE_CHECK_MIN_MS, DISEASE_AVOIDANCE_CHECK_MAX_MS);
  if (!applyDiseaseAvoidanceTarget(fish, species, now)) {
    return false;
  }

  setFishBehaviorIntent(fish, "avoid", "visible symptoms nearby", now, { durationMs: BEHAVIOR_INTENT_LINGER_MS });
  return true;
}

function getLightsOutOverride(targetTank = getCurrentTank()) {
  return normalizeLightsOutOverride(targetTank?.lightsOutOverride);
}

function isTankLightsOut(now = Date.now(), targetTank = getCurrentTank()) {
  const override = getLightsOutOverride(targetTank);
  if (override === LIGHTS_OUT_OVERRIDE_ON) {
    return true;
  }
  if (override === LIGHTS_OUT_OVERRIDE_OFF) {
    return false;
  }
  return isCaveNightWindow(now);
}

function isNightActiveFish(fishOrSpecies) {
  const profile = getFishBehaviorProfile(fishOrSpecies);
  const personality = normalizeBehaviorPersonality(fishOrSpecies?.personality);
  return profile.nightActive || personality === "night-active";
}

function isSlowGracefulFish(fishOrSpecies) {
  return getFishBehaviorProfile(fishOrSpecies).slowGraceful;
}

function getFishPersonality(fish) {
  return normalizeBehaviorPersonality(fish?.personality) || "curious";
}

function setFishBehaviorIntent(fish, type, cause = "", now = Date.now(), options = {}) {
  if (!fish || !type) {
    return false;
  }
  fish.behaviorIntent = {
    type: String(type),
    cause: String(cause || ""),
    targetId: typeof options.targetId === "string" ? options.targetId : "",
    targetName: typeof options.targetName === "string" ? options.targetName : "",
    startedAt: now,
    expiresAt: now + Math.max(1000, Number(options.durationMs) || BEHAVIOR_INTENT_LINGER_MS)
  };
  return true;
}

function clearExpiredFishBehaviorIntent(fish, now = Date.now()) {
  if (fish?.behaviorIntent?.expiresAt && fish.behaviorIntent.expiresAt <= now) {
    fish.behaviorIntent = null;
    return true;
  }
  return false;
}

function getFishBehaviorIntent(fish, now = Date.now()) {
  clearExpiredFishBehaviorIntent(fish, now);
  return fish?.behaviorIntent || null;
}

function getBehaviorHistoryEventText(signalType, fish, options = {}) {
  const name = fish?.name || "A fish";
  const targetName = typeof options.targetName === "string" ? options.targetName.trim() : "";
  switch (signalType) {
    case "food_refused":
      return `${name} approached food but did not eat.`;
    case "hiding_more_than_usual":
      return `${name} is hiding more than usual.`;
    case "avoid_specific_fish":
      return targetName
        ? `${name} is keeping distance from ${targetName}.`
        : `${name} is avoiding another fish.`;
    case "guard_territory":
      return `${name} is guarding a favorite area.`;
    case "follow_friend":
      return targetName
        ? `${name} and ${targetName} are swimming together more than usual.`
        : "Two fish are swimming together more than usual.";
    case "inspect_lure":
      return `${name} keeps inspecting a lure.`;
    case "night_sleep":
      return `${name} settled into a sleep spot after lights out.`;
    case "night_forage":
      return `${name} is moving after lights out.`;
    case "night_active_still":
      return `${name} has been unusually still at night.`;
    case "odd_sleep_spot":
      return `${name} is sleeping somewhere unusual.`;
    case "lingering_near_bubbler":
      return `${name} is lingering near the bubbler.`;
    case "digging_hardscape":
      return `${name} keeps returning to the same gravel spot.`;
    case "grazing_hardscape":
      return `${name} has been grazing hardscape.`;
    default:
      return `${name} has stopped following its usual routine.`;
  }
}

function pushFishBehaviorSignalHistoryEvent(fish, signalType, now = Date.now(), options = {}) {
  if (!fish || !signalType || DISEASE_SIGNAL_TYPES.includes(signalType)) {
    return false;
  }

  const eventText = typeof options.eventText === "string" && options.eventText.trim()
    ? options.eventText.trim()
    : getBehaviorHistoryEventText(signalType, fish, options);
  if (!eventText) {
    return false;
  }

  pushEvent(eventText, now, getCurrentTank(), {
    type: "behavior",
    fishId: fish.id,
    placedDecorId: typeof options.placedDecorId === "string" ? options.placedDecorId : "",
    recapEligible: false
  });
  return true;
}

function recordFishBehaviorSignal(fish, signalType, now = Date.now(), options = {}) {
  if (!fish || !signalType) {
    return false;
  }
  const signals = sanitizeBehaviorSignals(fish.behaviorSignals, now);
  const previous = signals[signalType];
  if (previous?.cooldownUntil && previous.cooldownUntil > now) {
    fish.behaviorSignals = signals;
    return false;
  }
  signals[signalType] = {
    type: signalType,
    taskText: typeof options.taskText === "string" && options.taskText
      ? options.taskText
      : getBehaviorHistoryEventText(signalType, fish, options),
    debugText: typeof options.debugText === "string" ? options.debugText : "",
    firstSeenAt: previous?.firstSeenAt || now,
    lastSeenAt: now,
    expiresAt: now + Math.max(1000, Number(options.expiryMs) || BEHAVIOR_SIGNAL_EXPIRY_MS),
    cooldownUntil: now + Math.max(1000, Number(options.cooldownMs) || BEHAVIOR_SIGNAL_COOLDOWN_MS)
  };
  fish.behaviorSignals = signals;
  if (DISEASE_SIGNAL_TYPES.includes(signalType)) {
    recordDiseaseSignal(fish, signalType, now);
  } else {
    pushFishBehaviorSignalHistoryEvent(fish, signalType, now, options);
  }
  return true;
}

function pruneFishBehaviorState(fish, now = Date.now()) {
  if (!fish) {
    return false;
  }
  const previousSignals = JSON.stringify(fish.behaviorSignals || {});
  fish.behaviorSignals = sanitizeBehaviorSignals(fish.behaviorSignals, now);
  const intentChanged = clearExpiredFishBehaviorIntent(fish, now);
  return intentChanged || previousSignals !== JSON.stringify(fish.behaviorSignals || {});
}

function getRelationshipKindForFish(fish, otherFish) {
  if (!fish || !otherFish || fish.id === otherFish.id) {
    return "neutral";
  }
  if (isPiranhaSpecies(otherFish) || isZombieFish(otherFish) || isSkeletonFish(otherFish)) {
    return "fear";
  }
  const personality = getFishPersonality(fish);
  const otherPersonality = getFishPersonality(otherFish);
  const species = getSpeciesForFish(fish);
  const otherSpecies = getSpeciesForFish(otherFish);
  if (personality === "social" || personality === "follower" || getFishBehaviorProfile(species).group === "small-social") {
    if (species?.id === otherSpecies?.id || getFishBehaviorProfile(otherSpecies).group === "small-social") {
      return "friend";
    }
  }
  if (personality === "territorial" || otherPersonality === "territorial") {
    return species?.id === otherSpecies?.id ? "rival" : "dislike";
  }
  if (personality === "standoffish" || otherPersonality === "standoffish") {
    return "dislike";
  }
  return "neutral";
}

function ensureFishRelationships(now = Date.now()) {
  if (!state?.fish?.length) {
    return false;
  }
  let changed = false;
  const livingIds = new Set(state.fish.filter((fish) => fish && !isFishDead(fish)).map((fish) => fish.id));
  for (const fish of state.fish) {
    if (!fish || isFishDead(fish)) {
      continue;
    }
    if (Number(fish.relationshipNextCheckAt) > now) {
      continue;
    }
    const nextRelationships = sanitizeFishRelationships(fish.relationships);
    for (const key of Object.keys(nextRelationships)) {
      if (!livingIds.has(key)) {
        delete nextRelationships[key];
        changed = true;
      }
    }
    for (const otherFish of state.fish) {
      if (!otherFish || otherFish.id === fish.id || isFishDead(otherFish)) {
        continue;
      }
      if (!nextRelationships[otherFish.id]) {
        const kind = getRelationshipKindForFish(fish, otherFish);
        const score = kind === "friend" ? randomBetween(34, 78)
          : kind === "fear" ? randomBetween(-95, -62)
            : kind === "rival" ? randomBetween(-70, -34)
              : kind === "dislike" ? randomBetween(-48, -18)
                : randomBetween(-10, 18);
        nextRelationships[otherFish.id] = { kind, score, updatedAt: now };
        changed = true;
      }
    }
    fish.relationships = nextRelationships;
    fish.relationshipNextCheckAt = now + BEHAVIOR_RELATIONSHIP_CHECK_MS + Math.random() * BEHAVIOR_RELATIONSHIP_CHECK_MS;
  }
  return changed;
}

function processFishBehaviorState(now = Date.now()) {
  if (!state?.fish?.length) {
    return false;
  }
  let changed = ensureFishRelationships(now);
  for (const fish of state.fish) {
    changed = pruneFishBehaviorState(fish, now) || changed;
  }
  return changed;
}

function applyBehaviorTarget(fish, species, target, now = Date.now()) {
  if (!fish || !species || !target || fish.caveState) {
    return false;
  }
  clearFishSchoolFollowState(fish);
  fish.targetXNorm = clamp(target.xNorm, 0.08, 0.92);
  fish.targetYNorm = clamp(target.yNorm, 0.14, 0.84);
  fish.targetAt = target.targetAt || now + randomBetween(species.targetMinMs, species.targetMaxMs);
  fish.hangoutDecorId = target.hangoutDecorId || target.decorId || null;
  fish.hangoutZoneType = target.hangoutZoneType || target.zoneType || null;
  if (Number.isFinite(Number(target.targetLayer))) {
    setFishDesiredTankLayer(fish, clampTankLayer(Number(target.targetLayer)));
  }
  if (target.speed) {
    fish.swimSpeed = target.speed;
  } else if (species.speedMode === "dynamic" || target.slow) {
    fish.swimSpeed = normalizeFishSpeed(species, target.slow ? randomBetween(species.speedMin, Math.max(species.speedMin, species.speedMax * 0.72)) : undefined);
  }
  if (target.intentType) {
    setFishBehaviorIntent(fish, target.intentType, target.intentCause || "", now, {
      targetId: target.intentTargetId || target.hangoutDecorId || target.decorId || "",
      targetName: target.intentTargetName || ""
    });
  }
  if (target.signalType) {
    recordFishBehaviorSignal(fish, target.signalType, now, {
      debugText: target.debugText || "",
      taskText: target.taskText || "",
      eventText: target.eventText || "",
      targetName: target.intentTargetName || target.targetName || "",
      placedDecorId: target.hangoutDecorId || target.decorId || ""
    });
  }
  if ((fish.personality === "homebody" || fish.personality === "territorial") && (target.hangoutDecorId || target.decorId)) {
    fish.favoriteSpot = {
      xNorm: fish.targetXNorm,
      yNorm: fish.targetYNorm,
      decorId: target.hangoutDecorId || target.decorId || "",
      zoneType: target.hangoutZoneType || target.zoneType || "",
      assignedAt: now
    };
  }
  return true;
}

function getAvoidanceEscapeTarget(fish, species, threatFish, options = {}) {
  if (!fish || !species || !threatFish) {
    return null;
  }
  const currentX = clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92);
  const currentY = clamp(Number(fish.yNorm) || 0.5, 0.14, 0.8);
  const threatX = clamp(Number(threatFish.xNorm) || 0.5, 0.08, 0.92);
  const threatY = clamp(Number(threatFish.yNorm) || 0.5, 0.14, 0.8);
  let awayX = currentX - threatX;
  let awayY = currentY - threatY;
  let distance = Math.hypot(awayX, awayY);
  if (distance < 0.0001) {
    awayX = currentX >= threatX ? 1 : -1;
    awayY = 0;
    distance = 1;
  }

  const retreatNorm = clamp(Number(options.retreatNorm) || 0.22, 0.04, 0.62);
  const verticalScale = clamp(Number(options.verticalScale) || 0.72, 0.2, 1.15);
  const minYNorm = clamp(Number.isFinite(Number(options.minYNorm)) ? Number(options.minYNorm) : 0.14, 0.08, 0.8);
  const maxYNorm = clamp(Number.isFinite(Number(options.maxYNorm)) ? Number(options.maxYNorm) : 0.8, minYNorm, 0.86);
  const targetLayer = Number.isFinite(Number(options.targetLayer))
    ? clampTankLayer(Number(options.targetLayer))
    : getFishTankLayer(fish);

  let rawX = currentX + (awayX / distance) * retreatNorm;
  let rawY = currentY + (awayY / distance) * retreatNorm * verticalScale;
  const nearLeft = currentX <= 0.145;
  const nearRight = currentX >= 0.855;
  const nearTop = currentY <= 0.22;
  const nearBottom = currentY >= 0.71;
  const inCorner = (nearLeft || nearRight) && (nearTop || nearBottom);
  const clippedByWall = rawX < 0.08 || rawX > 0.92 || rawY < minYNorm || rawY > maxYNorm;
  const cornerThreatRadius = clamp(Number(options.cornerThreatRadius) || 0.32, 0.08, 0.7);
  let cornerEscape = false;

  if ((inCorner || clippedByWall) && distance <= cornerThreatRadius) {
    const inwardX = nearLeft ? 1 : nearRight ? -1 : (awayX >= 0 ? 1 : -1);
    const inwardY = nearTop ? 1 : nearBottom ? -1 : (awayY >= 0 ? 1 : -1);
    rawX = currentX + inwardX * retreatNorm * randomBetween(0.82, 1.08);
    rawY = currentY + inwardY * retreatNorm * verticalScale * randomBetween(0.58, 0.86);
    if (nearLeft) {
      rawX = Math.max(rawX, Math.min(0.34, currentX + 0.2));
    } else if (nearRight) {
      rawX = Math.min(rawX, Math.max(0.66, currentX - 0.2));
    }
    if (nearTop) {
      rawY = Math.max(rawY, Math.min(0.36, currentY + 0.16));
    } else if (nearBottom) {
      rawY = Math.min(rawY, Math.max(0.56, currentY - 0.16));
    }
    cornerEscape = true;
  }

  return {
    xNorm: clamp(rawX, 0.08, 0.92),
    yNorm: clampFishYNormToLayer(rawY, fish, species, targetLayer, {
      minYNorm,
      maxYNorm
    }),
    targetLayer,
    cornerEscape
  };
}

function pickRelationshipBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  const relationships = sanitizeFishRelationships(fish?.relationships);
  if (!Object.keys(relationships).length) {
    return null;
  }
  const personality = getFishPersonality(fish);
  const nearby = state.fish
    .filter((otherFish) => otherFish && otherFish.id !== fish.id && !isFishDead(otherFish))
    .map((otherFish) => ({
      fish: otherFish,
      relation: relationships[otherFish.id],
      distance: Math.hypot((fish.xNorm || 0.5) - (otherFish.xNorm || 0.5), (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5))
    }))
    .filter((entry) => entry.relation)
    .sort((left, right) => left.distance - right.distance);
  const threat = nearby.find((entry) => ["fear", "dislike", "rival"].includes(entry.relation.kind) && entry.distance <= 0.34);
  if (threat) {
    const escape = getAvoidanceEscapeTarget(fish, species, threat.fish, {
      retreatNorm: randomBetween(0.18, 0.32),
      verticalScale: randomBetween(0.62, 0.86),
      cornerThreatRadius: 0.38
    });
    return {
      xNorm: escape?.xNorm ?? fish.xNorm,
      yNorm: escape?.yNorm ?? fish.yNorm,
      targetLayer: escape?.targetLayer ?? getFishTankLayer(fish),
      targetAt: now + (escape?.cornerEscape ? randomBetween(900, 1900) : randomBetween(2200, 5000)),
      intentType: threat.relation.kind === "fear" ? "avoid" : "space",
      intentCause: `${threat.relation.kind} ${threat.fish.name}`,
      intentTargetId: threat.fish.id,
      intentTargetName: threat.fish.name,
      signalType: "avoid_specific_fish",
      debugText: `avoid ${threat.fish.name} | ${threat.relation.kind}`
    };
  }
  if (options.onlyThreat) {
    return null;
  }
  if (["social", "follower"].includes(personality) || getFishBehaviorProfile(species).group === "small-social") {
    const friend = nearby.find((entry) => entry.relation.kind === "friend" && entry.distance <= 0.42);
    if (friend && Math.random() < 0.55) {
      return {
        xNorm: clamp(friend.fish.xNorm + randomBetween(-0.05, 0.05), 0.08, 0.92),
        yNorm: clamp(friend.fish.yNorm + randomBetween(-0.04, 0.04), 0.14, 0.8),
        targetLayer: getFishTankLayer(friend.fish),
        targetAt: now + randomBetween(3200, 7200),
        intentType: "follow",
        intentCause: "friend",
        intentTargetId: friend.fish.id,
        intentTargetName: friend.fish.name,
        signalType: "follow_friend",
        debugText: `follow ${friend.fish.name} | friend`
      };
    }
  }
  return null;
}

function pickNightBehaviorTarget(fish, species, now = Date.now()) {
  if (!isTankLightsOut(now)) {
    return null;
  }
  const personality = getFishPersonality(fish);
  const nightActive = isNightActiveFish(fish);
  if (nightActive) {
    const forage = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hardscape", "plant", "hide"],
      chanceMultiplier: 1.9,
      lingerMultiplier: 0.9,
      preferBackLayer: false
    });
    if (forage) {
      return {
        ...forage,
        intentType: "night forage",
        intentCause: "night-active",
        signalType: "night_forage",
        debugText: "night forage | night-active"
      };
    }
    return {
      xNorm: randomSwimX(),
      yNorm: randomBetween(0.56, 0.82),
      targetLayer: clampTankLayer(Math.max(1, getFishTankLayer(fish))),
      targetAt: now + randomBetween(3600, 7600),
      intentType: "night forage",
      intentCause: "night-active",
      signalType: "night_forage",
      debugText: "night forage | night-active"
    };
  }

  const assignedResidence = getAssignedResidenceTarget(fish, species, now);
  if (assignedResidence) {
    return assignedResidence;
  }

  const homeSpot = fish.favoriteSpot && ["homebody", "routine-loving"].includes(personality)
    ? fish.favoriteSpot
    : null;
  if (homeSpot && Math.random() < 0.65) {
    return {
      xNorm: homeSpot.xNorm,
      yNorm: homeSpot.yNorm,
      targetLayer: getFishTankLayer(fish),
      targetAt: now + randomBetween(8000, 18000),
      intentType: "night sleep",
      intentCause: "favorite spot",
      signalType: "night_sleep",
      debugText: "night sleep | lights out"
    };
  }
  const cover = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["plant", "hide", "hardscape", "spooky"],
    chanceMultiplier: ["shy", "sensitive", "homebody"].includes(personality) ? 2.2 : 1.2,
    lingerMultiplier: 2.3,
    preferBackLayer: true
  });
  if (cover) {
    return {
      ...cover,
      intentType: "night sleep",
      intentCause: "lights out",
      signalType: "night_sleep",
      debugText: "night sleep | lights out",
      slow: true
    };
  }
  if (Math.random() < 0.2) {
    return {
      xNorm: clamp(fish.xNorm + randomBetween(-0.05, 0.05), 0.08, 0.92),
      yNorm: clamp(fish.yNorm + randomBetween(-0.03, 0.03), 0.18, 0.78),
      targetLayer: getFishTankLayer(fish),
      targetAt: now + randomBetween(8000, 16000),
      intentType: "night sleep",
      intentCause: "exposed",
      signalType: "odd_sleep_spot",
      debugText: "night sleep | exposed"
    };
  }
  return null;
}

function pickFeedingMemoryBehaviorTarget(fish, species, now = Date.now()) {
  if (!fish || !species || isMealFreeFish(fish) || !canFoodSatisfyFishMeal(fish, "basic")) {
    return null;
  }
  const personality = getFishPersonality(fish);
  if (!["greedy", "routine-loving", "curious", "social"].includes(personality)) {
    return null;
  }
  const slot = getCurrentMealSlot(now);
  if (hasFishEatenInSlot(fish, slot)) {
    return null;
  }
  const memory = sanitizeFeedingMemory(fish.feedingMemory, now);
  const nextBoundary = getNextMealBoundary(now).getTime();
  const nearMealTime = nextBoundary - now <= 20 * MINUTE_MS || now - slot.start <= 20 * MINUTE_MS;
  const activeFood = state.floatingPellets?.some((pellet) => pellet && canFishTargetFoodPellet(fish, pellet, now));
  if (!nearMealTime && !activeFood) {
    return null;
  }
  const xNorm = Number.isFinite(Number(memory.feederXNorm))
    ? memory.feederXNorm
    : memory.lastFoodXNorm;
  const yNorm = Number.isFinite(Number(memory.feederYNorm))
    ? clamp(memory.feederYNorm + 0.08, 0.14, 0.42)
    : memory.lastFoodYNorm;
  if (!Number.isFinite(Number(xNorm)) || !Number.isFinite(Number(yNorm))) {
    return null;
  }
  const chance = personality === "routine-loving" ? 0.72 : personality === "greedy" ? 0.62 : 0.38;
  if (Math.random() > chance) {
    return null;
  }
  return {
    xNorm: clamp(Number(xNorm) + randomBetween(-0.035, 0.035), 0.08, 0.92),
    yNorm: clamp(Number(yNorm) + randomBetween(-0.025, 0.025), 0.14, 0.54),
    targetLayer: clampTankLayer(Math.min(getFishTankLayer(fish), 2)),
    targetAt: now + randomBetween(3200, 8200),
    intentType: memory.feederSeenAt ? "feeder memory" : "feeding memory",
    intentCause: personality,
    debugText: `${memory.feederSeenAt ? "inspect feeder" : "feeding spot"} | ${personality}`
  };
}

function pickPersonalityDecorBehaviorTarget(fish, species, now = Date.now()) {
  const personality = getFishPersonality(fish);
  const comfort = getFishComfort(fish, now).value;
  const group = getFishBehaviorProfile(species).group;
  if ((comfort <= 0.4 || ["shy", "sensitive", "nervous"].includes(personality)) && Math.random() < 0.68) {
    const cover = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["plant", "hide", "spooky"],
      chanceMultiplier: 2.1,
      lingerMultiplier: comfort <= 0.4 ? 2.6 : 1.5,
      preferBackLayer: true
    });
    if (cover) {
      return {
        ...cover,
        intentType: "hide plant",
        intentCause: `${personality}${comfort <= 0.4 ? " + stressed" : ""}`,
        signalType: "hiding_more_than_usual",
        debugText: `hide ${cover.zoneType} | ${personality}${comfort <= 0.4 ? " + stressed" : ""}`,
        slow: true
      };
    }
  }
  if (["curious", "hunter"].includes(personality) && Math.random() < 0.54) {
    const inspect = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: personality === "hunter" ? ["lure", "spooky"] : ["lure", "bubbler", "spooky"],
      chanceMultiplier: 1.75,
      lingerMultiplier: 0.9,
      occupancyLimit: 1
    });
    if (inspect) {
      return {
        ...inspect,
        intentType: inspect.zoneType === "lure" ? "inspect lure" : `inspect ${inspect.zoneType}`,
        intentCause: personality,
        signalType: inspect.zoneType === "lure" ? "inspect_lure" : (inspect.zoneType === "bubbler" ? "lingering_near_bubbler" : ""),
        debugText: `inspect ${inspect.zoneType} | ${personality}`
      };
    }
  }
  if (["territorial", "homebody"].includes(personality) && Math.random() < 0.58) {
    const territory = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hardscape", "hide"],
      chanceMultiplier: 1.8,
      lingerMultiplier: personality === "territorial" ? 1.9 : 1.35,
      occupancyLimit: personality === "territorial" ? 1 : undefined
    });
    if (territory) {
      return {
        ...territory,
        intentType: personality === "territorial" ? "guard cave" : "home spot",
        intentCause: personality,
        signalType: personality === "territorial" ? "guard_territory" : "",
        debugText: `${personality === "territorial" ? "guard" : "return"} ${territory.zoneType} | ${personality}`
      };
    }
  }
  if ((personality === "digger" || group === "bottom-cleaner") && Math.random() < 0.62) {
    const dig = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hardscape"],
      chanceMultiplier: 1.9,
      lingerMultiplier: 1.1
    });
    if (dig) {
      return {
        ...dig,
        yNorm: clamp(Math.max(dig.yNorm, 0.64), 0.54, 0.88),
        targetLayer: clampTankLayer(Math.max(dig.targetLayer, TANK_DEPTH_LAYERS - 1)),
        intentType: personality === "cleaner" ? "graze hardscape" : "dig under hardscape",
        intentCause: `${personality} + hardscape`,
        signalType: personality === "cleaner" ? "grazing_hardscape" : "digging_hardscape",
        debugText: `${personality === "cleaner" ? "graze" : "dig under"} hardscape | ${personality}`
      };
    }
  }
  return null;
}

function applyFishBehaviorIntentLayer(fish, species, now = Date.now()) {
  if (!fish || !species || fish.activity !== "roam" || fish.caveState || isFishDead(fish) || isUndeadFish(fish)) {
    return false;
  }
  if (applyDiseaseAvoidanceTarget(fish, species, now)) {
    setFishBehaviorIntent(fish, "avoid", "visible symptoms nearby", now);
    return true;
  }
  const diseaseTarget = pickDiseaseBehaviorTarget(fish, species, now);
  if (diseaseTarget && applyDiseaseBehaviorTarget(fish, species, diseaseTarget, now)) {
    setFishBehaviorIntent(fish, "disease isolate", sanitizeDiseaseState(fish.diseaseState), now);
    return true;
  }
  const effectiveBehavior = getEffectiveFishBehavior(fish, species);
  if (["sucker", "piranha"].includes(effectiveBehavior)) {
    if (isTankLightsOut(now) && isNightActiveFish(fish)) {
      setFishBehaviorIntent(fish, "night forage", "night-active", now);
      recordFishBehaviorSignal(fish, "night_forage", now, { debugText: "night forage | night-active" });
    }
    return false;
  }
  const threatTarget = pickRelationshipBehaviorTarget(fish, species, now, { onlyThreat: true });
  if (threatTarget && applyBehaviorTarget(fish, species, threatTarget, now)) {
    return true;
  }
  const nightTarget = pickNightBehaviorTarget(fish, species, now);
  if (nightTarget && applyBehaviorTarget(fish, species, nightTarget, now)) {
    return true;
  }
  const feedingMemoryTarget = pickFeedingMemoryBehaviorTarget(fish, species, now);
  if (feedingMemoryTarget && applyBehaviorTarget(fish, species, feedingMemoryTarget, now)) {
    return true;
  }
  const relationshipTarget = pickRelationshipBehaviorTarget(fish, species, now);
  if (relationshipTarget && applyBehaviorTarget(fish, species, relationshipTarget, now)) {
    return true;
  }
  const decorTarget = pickPersonalityDecorBehaviorTarget(fish, species, now);
  if (decorTarget && applyBehaviorTarget(fish, species, decorTarget, now)) {
    return true;
  }
  return false;
}

function recordFishFeedingMemory(fish, pellet, now = Date.now()) {
  if (!fish || !pellet) {
    return false;
  }
  const memory = sanitizeFeedingMemory(fish.feedingMemory, now);
  memory.lastFoodXNorm = clamp(Number(pellet.xNorm) || fish.xNorm || 0.5, 0.08, 0.92);
  memory.lastFoodYNorm = clamp(Number(pellet.yNorm) || fish.yNorm || 0.3, 0.08, 0.9);
  memory.lastFoodAt = now;
  memory.updatedAt = now;
  const dispenserLayout = pellet.dropStartXNorm != null || pellet.dropStartYNorm != null
    ? getAutoDispenserLayout()
    : null;
  if (dispenserLayout) {
    memory.feederXNorm = clamp((dispenserLayout.nozzle.x || 0) / TANK_WIDTH, 0.08, 0.92);
    memory.feederYNorm = clamp((dispenserLayout.nozzle.y || 0) / TANK_HEIGHT, 0.02, 0.42);
    memory.feederSeenAt = now;
  }
  memory.crowdedFishIds = state.fish
    .filter((otherFish) => otherFish && otherFish.id !== fish.id && !isFishDead(otherFish))
    .filter((otherFish) => Math.hypot((otherFish.xNorm || 0.5) - memory.lastFoodXNorm, (otherFish.yNorm || 0.5) - memory.lastFoodYNorm) <= 0.18)
    .map((otherFish) => otherFish.id)
    .slice(0, 6);
  fish.feedingMemory = memory;
  return true;
}

function shouldFishRefuseFoodForComfort(fish, foodKey = "basic", now = Date.now()) {
  if (!fish || isMealFreeFish(fish) || isUndeadFish(fish)) {
    return false;
  }
  if (Number(fish.foodRefusalUntil) > now) {
    return true;
  }
  const comfortValue = getFishComfort(fish, now).value;
  let eatChance = comfortValue <= 0.2
    ? 0.05
    : comfortValue <= 0.4
      ? randomBetween(0.15, 0.3)
      : comfortValue <= 0.6
        ? randomBetween(0.5, 0.7)
        : randomBetween(0.8, 1);
  if (getFishPersonality(fish) === "greedy") {
    eatChance = Math.min(0.98, eatChance + 0.16);
  } else if (["sensitive", "shy", "nervous"].includes(getFishPersonality(fish))) {
    eatChance = Math.max(0.02, eatChance - 0.12);
  }
  if (shouldFishRefuseFoodForDisease(fish, foodKey, now)) {
    eatChance = Math.min(eatChance, 0.25);
  }
  return Math.random() > eatChance;
}

function handleFishRefuseFoodPellet(fish, pellet, now = Date.now()) {
  if (!fish || !pellet) {
    return false;
  }
  const diseaseState = sanitizeDiseaseState(fish.diseaseState);
  const comfortPercent = Math.round(getFishComfort(fish, now).value * 100);
  const refusalReason = diseaseState !== DISEASE_STATE_NONE
    ? `${diseaseState} symptoms + comfort ${comfortPercent}%`
    : `comfort ${comfortPercent}%`;
  recordFishFeedingMemory(fish, pellet, now);
  recordFishBehaviorSignal(fish, "food_refused", now, {
    debugText: `refuse food | ${refusalReason}`
  });
  recordDiseaseSignal(fish, "food_refused", now);
  setFishBehaviorIntent(fish, "refuse food", refusalReason, now, { durationMs: FOOD_REFUSAL_RETARGET_MS });
  fish.foodRefusalUntil = now + FOOD_REFUSAL_RETARGET_MS;
  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  if (pellet.targetFishId === fish.id) {
    pellet.targetFishId = "";
  }
  const awayX = (fish.xNorm || 0.5) >= (pellet.xNorm || 0.5) ? 1 : -1;
  fish.targetXNorm = clamp((fish.xNorm || 0.5) + awayX * randomBetween(0.08, 0.18), 0.08, 0.92);
  fish.targetYNorm = clamp((fish.yNorm || 0.5) + randomBetween(-0.08, 0.08), 0.14, 0.8);
  fish.targetAt = now + randomBetween(2200, 5200);
  fish.swimSpeed = normalizeFishSpeed(getSpeciesForFish(fish));
  return true;
}

function getUvGlowSourceKey(sourceImage) {
  const directSource = sourceImage?.currentSrc || sourceImage?.src || "";
  if (directSource) {
    return directSource;
  }

  if (!sourceImage) {
    return "";
  }

  if (!sourceImage.__bbUvGlowSourceKey) {
    const key = `generated-uv-source-${runtime.uvGlowSourceId += 1}`;
    try {
      Object.defineProperty(sourceImage, "__bbUvGlowSourceKey", {
        value: key,
        enumerable: false
      });
    } catch (error) {
      sourceImage.__bbUvGlowSourceKey = key;
    }
  }
  return sourceImage.__bbUvGlowSourceKey;
}

function isUvLightLowCostMode() {
  return getUvLightRenderQuality() === UV_LIGHT_RENDER_QUALITY_LOW;
}

function isUvLightGravelGlowEnabled() {
  return getUvLightRenderQuality() === UV_LIGHT_RENDER_QUALITY_HIGH && UV_LIGHT_GRAVEL_GLOW_HIGH_ENABLED;
}
