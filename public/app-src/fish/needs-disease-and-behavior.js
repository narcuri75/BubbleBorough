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

function getFishAppearanceVariantKey(path) {
  return typeof path === "string" ? path.split(/[?#]/)[0].split("/").pop() : "";
}

function getFishStoreVariants(species) {
  return getFishAssetVariants(species).map((path, index) => ({
    key: getFishAppearanceVariantKey(path),
    image: species?.behavior === "sucker" ? (getFishDirectionalSpritePath(path, "side") || path) : path,
    label: index === 0 ? "Main" : `Variant ${path.match(/_([1-5])\.[^./?]+(?:[?#].*)?$/)?.[1] || index}`
  }));
}

async function discoverFishAppearanceVariants(catalog, availableAssets = null) {
  const availableKeys = Array.isArray(availableAssets) ? new Set(availableAssets.map((asset) => asset.key.toLowerCase())) : null;
  await Promise.all(catalog.map(async (species) => {
    const base = species.asset;
    if (!base || /^(data:|blob:)/i.test(base)) return;
    const match = base.match(/^(.*)(\.[^./?#]+)([?#].*)?$/);
    if (!match) return;
    const existing = getFishAssetVariants(species);
    const existingKeys = new Set(existing.map((path) => getFishAppearanceVariantKey(path)));
    const discovered = await Promise.all([1, 2, 3, 4, 5].map(async (number) => {
      const path = `${match[1]}_${number}${match[2]}${match[3] || ""}`;
      // Catalog URLs can have a cache query while the probed URL does not.
      // They are the same appearance, so compare filenames rather than raw
      // URLs and never add a second thumbnail for it.
      if (existingKeys.has(getFishAppearanceVariantKey(path))) return null;
      if (getSpriteAssetFrame(path)) return path;
      if (availableKeys && !availableKeys.has(getFishAppearanceVariantKey(path).toLowerCase())) return null;
      return new Promise((resolve) => {
        const image = new Image();
        const finish = (loaded) => {
          clearTimeout(timeout);
          image.onload = image.onerror = null;
          if (loaded) runtime.images.set(path, image);
          resolve(loaded ? path : null);
        };
        const timeout = setTimeout(() => finish(false), 2500);
        image.onload = () => finish(image.naturalWidth > 0);
        image.onerror = () => finish(false);
        image.src = path;
      });
    }));
    // Append to preserve numeric indices in existing saves; new purchases also
    // save a stable filename key. Dedupe cache-busted and plain URLs together.
    const seenKeys = new Set();
    species.assetVariants = [base, ...existing, ...discovered.filter(Boolean)].filter((path) => {
      const key = getFishAppearanceVariantKey(path);
      if (!key || seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
  }));
}

function getBaseSpeciesForFish(fish) {
  return fish ? runtime.fishMap.get(fish.speciesId) || null : null;
}

function rebuildFishFrameLookup() {
  const fishList = Array.isArray(state?.fish) ? state.fish : [];
  const lookup = runtime.fishFrameLookupById || new Map();
  lookup.clear();
  for (const fish of fishList) {
    if (fish?.id) {
      lookup.set(fish.id, fish);
    }
  }
  runtime.fishFrameLookupById = lookup;
  runtime.fishFrameLookupSource = fishList;
  runtime.fishFrameLookupLength = fishList.length;
  return lookup;
}

function getFishByIdFast(fishId) {
  if (!fishId) {
    return null;
  }
  const fishList = Array.isArray(state?.fish) ? state.fish : [];
  if (
    runtime.fishFrameLookupSource !== fishList
    || runtime.fishFrameLookupLength !== fishList.length
  ) {
    rebuildFishFrameLookup();
  }
  return runtime.fishFrameLookupById.get(fishId) || null;
}

function getFishBehaviorProfileSpecies(fishOrSpecies) {
  const baseSpecies = fishOrSpecies?.speciesId
    ? getBaseSpeciesForFish(fishOrSpecies)
    : fishOrSpecies;
  const profileId = [
    fishOrSpecies?.behaviorSpeciesId,
    baseSpecies?.behaviorSpeciesId,
    baseSpecies?.behaviorProfileSpeciesId,
    baseSpecies?.behaviorProfileId
  ].find((value) => typeof value === "string" && value.trim())?.trim() || "";
  const baseSpeciesId = fishOrSpecies?.speciesId || baseSpecies?.id || "";
  if (!profileId || profileId === baseSpeciesId) {
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

function normalizeBehaviorPersonality(value) {
  const normalized = typeof value === "string"
    ? value.trim().toLowerCase().replace(/[_\s]+/g, "-")
    : "";
  return BEHAVIOR_PERSONALITIES.includes(normalized) ? normalized : "";
}

function getFishBehaviorProfile(speciesOrFish) {
  const species = getFishBehaviorProfileSpecies(speciesOrFish)
    || (speciesOrFish?.speciesId
      ? (getSpeciesForFish(speciesOrFish) || getBaseSpeciesForFish(speciesOrFish))
      : speciesOrFish);
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
    predatorDiet: Boolean(profile?.predatorDiet) || behavior === "piranha",
    desperationPredator: Boolean(profile?.desperationPredator)
  };
}

function isPredatoryFishSpecies(speciesOrFish) {
  return getFishBehaviorProfile(speciesOrFish).predatorDiet === true;
}

function isLargePredatoryFishSpecies(speciesOrFish) {
  const profile = getFishBehaviorProfile(speciesOrFish);
  return profile.desperationPredator === true || profile.group === "shark-cruiser" || profile.group === "orca-pod";
}

function getFishLocomotionProfile(speciesOrFish) {
  const baseSpecies = speciesOrFish?.speciesId
    ? (getBaseSpeciesForFish(speciesOrFish) || getSpeciesForFish(speciesOrFish))
    : speciesOrFish;
  const profileSpecies = getFishBehaviorProfileSpecies(speciesOrFish);
  const speciesId = profileSpecies?.id || baseSpecies?.id || speciesOrFish?.speciesId || "";
  const inherited = FISH_LOCOMOTION_PROFILES[speciesId] || FISH_LOCOMOTION_PROFILE_DEFAULT;
  if (!baseSpecies?.customAsset) return inherited;

  const swimZone = normalizeCustomFishSwimZone(baseSpecies.swimZone);
  const socialAffinity = normalizeCustomFishSocialAffinity(baseSpecies.socialAffinity);
  if (!swimZone && socialAffinity === "adaptive") return inherited;

  const cache = runtime.customFishLocomotionProfileCache || (runtime.customFishLocomotionProfileCache = new WeakMap());
  const cached = cache.get(baseSpecies);
  if (
    cached?.inherited === inherited
    && cached.swimZone === swimZone
    && cached.socialAffinity === socialAffinity
  ) {
    return cached.profile;
  }

  const overrides = {};
  if (swimZone === "full") {
    overrides.preferredY = 0.5;
    overrides.verticalSpread = 0.86;
  } else if (swimZone === "upper") {
    overrides.preferredY = 0.25;
    overrides.verticalSpread = 0.48;
  } else if (swimZone === "midwater") {
    overrides.preferredY = 0.5;
    overrides.verticalSpread = 0.56;
  } else if (swimZone === "lower") {
    overrides.preferredY = 0.72;
    overrides.verticalSpread = 0.46;
  }
  if (socialAffinity === "independent") {
    overrides.schoolStrength = 0;
  } else if (socialAffinity === "schooling") {
    overrides.schoolStrength = Math.max(Number(inherited.schoolStrength) || 0, 0.74);
  }

  const profile = Object.freeze({ ...inherited, ...overrides });
  cache.set(baseSpecies, { inherited, swimZone, socialAffinity, profile });
  return profile;
}

function getFishSchoolingStrength(fish, species = getSpeciesForFish(fish)) {
  const profile = getFishLocomotionProfile(fish || species);
  const personality = getFishPersonality(fish);
  let personalityScale = 1;
  if (personality === "social" || personality === "follower") {
    personalityScale = 1.16;
  } else if (personality === "standoffish" || personality === "territorial") {
    personalityScale = 0.62;
  } else if (personality === "shy" || personality === "nervous") {
    personalityScale = 1.06;
  }
  return clamp(profile.schoolStrength * personalityScale, 0, 1);
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
  const score = safeNeeds.hunger * 0.35 + safeNeeds.comfort * 0.3
    + safeNeeds.hygiene * 0.2 + safeNeeds.environment * 0.15;
  return { value: clamp(score, 0, 100), label: "Content" };
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
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) && fish && !isFishDead(fish)) return Object.fromEntries(FISH_NEED_KEYS.map(key => [key, 100]));
  if (hasActiveCandyBoost(fish, now)) return Object.fromEntries(FISH_NEED_KEYS.map(key => [key, 100]));
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const defaults = fish ? getDerivedFishNeedDefaults(fish, now) : FISH_NEED_DEFAULTS;
  // Keep the old save shape, but retire the three daily maintenance meters.
  // Habitat values reflect the tank immediately, rather than action bonuses.
  return Object.fromEntries(FISH_NEED_KEYS.map((key) => [key,
    ["energy", "social", "stimulation"].includes(key) ? 80
      : fish && ["comfort", "hygiene", "environment"].includes(key) ? defaults[key]
      : clamp(Number.isFinite(Number(source[key])) ? Number(source[key]) : defaults[key], 0, 100)
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
  const color = isHalloweenModeActive()
    ? "#37ae9e"
    : getFishColorSetting(fish);
  if (!color || isDecorRgbColorSetting(color)) {
    return sourceImage;
  }

  return getTintedCaveLayerImage(imagePath, color, {
    colorize: isHalloweenModeActive() || getFishColorizeSetting(fish)
  }) || sourceImage;
}

function getDavyMutationCanvasFilter(fish, now = Date.now(), comfortValueOverride = null) {
  if (!fish || isFishDead(fish)) return "none";
  const species = getSpeciesForFish(fish);
  const behaviorKey = getDavyMutationBehaviorKey(species);
  if (!behaviorKey) return "none";
  const comfortValue = Number.isFinite(Number(comfortValueOverride))
    ? Number(comfortValueOverride)
    : getFishComfort(fish, now).value;
  const stressed = comfortValue <= 0.45 || (Number(fish.panicUntil) || 0) > now;
  const feeding = fish.activity === "feeding";

  if (behaviorKey === "barracuda") {
    const amplitude = feeding || stressed ? 18 : 8;
    const hue = Math.round(Math.sin(now / 1700 + (Number(fish.phase) || 0) * 5) * amplitude);
    const saturation = feeding || stressed ? 132 : 112;
    const brightness = feeding || stressed ? 108 : 101;
    return `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%)`;
  }

  if (behaviorKey === "siren-pike") {
    const pulse = (Math.sin(now / 620 + (Number(fish.phase) || 0) * 4) + 1) * 0.5;
    const brightness = Math.round(101 + pulse * (feeding || stressed ? 11 : 5));
    const saturation = Math.round(106 + pulse * 12);
    return `brightness(${brightness}%) saturate(${saturation}%)`;
  }

  if (behaviorKey === "glass-spitter") {
    const pulse = (Math.sin(now / 430 + (Number(fish.phase) || 0) * 6) + 1) * 0.5;
    const brightness = Math.round(101 + pulse * (feeding || stressed ? 10 : 5));
    const saturation = Math.round(104 + pulse * (feeding || stressed ? 20 : 10));
    return `brightness(${brightness}%) saturate(${saturation}%)`;
  }

  if (behaviorKey === "cherub") {
    const pulse = (Math.sin(now / 700 + (Number(fish.phase) || 0) * 3) + 1) * 0.5;
    const brightness = Math.round(100 + pulse * (feeding || stressed ? 9 : 3));
    return `brightness(${brightness}%) saturate(${feeding || stressed ? 116 : 105}%)`;
  }

  if (behaviorKey === "hyperfin") {
    const pulse = (Math.sin(now / 480 + (Number(fish.phase) || 0) * 7) + 1) * 0.5;
    const accelerated = (Number(fish.davyFoodBurstUntil) || 0) > now || (Number(fish.davyCircuitUntil) || 0) > now || (Number(fish.davyPatrolBurstUntil) || 0) > now;
    const brightness = Math.round(101 + pulse * (accelerated || feeding || stressed ? 10 : 4));
    const saturation = Math.round((accelerated || feeding || stressed ? 114 : 104) + pulse * (accelerated ? 8 : 4));
    return `brightness(${brightness}%) saturate(${saturation}%)`;
  }

  return "none";
}

function getFishCanvasFilter(fish, healthRatio = 1, now = Date.now(), comfortValueOverride = null) {
  const filters = [];
  const grayscalePercent = Math.round((1 - clamp(Number(healthRatio) || 0, 0, 1)) * 100);
  const colorCycleFilter = getFishColorCycleFilter(fish, now);
  const diseaseSaturationPercent = getFishDiseaseSaturationPercent(fish, now);
  const diseaseBrightnessPercent = getFishDiseaseBrightnessPercent(fish, now);
  const davyMutationFilter = getDavyMutationCanvasFilter(fish, now, comfortValueOverride);

  if (colorCycleFilter !== "none") {
    filters.push(colorCycleFilter);
  }
  if (davyMutationFilter !== "none") {
    filters.push(davyMutationFilter);
  }
  if (diseaseSaturationPercent < 100 || diseaseBrightnessPercent < 100) {
    filters.push(`saturate(${diseaseSaturationPercent}%) brightness(${diseaseBrightnessPercent}%)`);
  }
  if (grayscalePercent > 0) {
    filters.push(`grayscale(${grayscalePercent}%)`);
  }
  if (!isFishDead(fish)) {
    const hasComfortOverride = comfortValueOverride !== null
      && comfortValueOverride !== undefined
      && Number.isFinite(Number(comfortValueOverride));
    const comfortValue = hasComfortOverride
      ? Number(comfortValueOverride)
      : getFishComfort(fish, now).value;
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
  if (fish && !isFishDead(fish) && typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    return false;
  }
  return Boolean(fish && isActiveDiseaseState(fish.diseaseState));
}

function isFishDiseaseVisible(fish) {
  if (fish && !isFishDead(fish) && typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    return false;
  }
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
    fish.diseaseRequiresTreatment,
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
  fish.diseaseRequiresTreatment = false;
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
    fish.diseaseRequiresTreatment,
    fish.temporaryImmunityUntil,
    fish.nextDiseaseCheckAt,
    fish.nextDiseaseSpreadCheckAt,
    fish.nextSymptomCheckAt,
    fish.nextGreenBubbleAt
  ].join("|");
  return previous !== current;
}

function infectFishWithDisease(fish, source = "conditions", now = Date.now(), initialState = DISEASE_STATE_INCUBATING, options = {}) {
  if (
    !fish
    || (!hasIllnessUnlocked() && options.bypassUnlock !== true)
    || isFishDead(fish)
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
  fish.diseaseType = options.type === DISEASE_TYPE_VIRAL ? DISEASE_TYPE_VIRAL : DISEASE_TYPE_GENERIC;
  fish.diseaseInfectedAt = now;
  fish.diseaseProgressMs = getDebugDiseaseProgressForStage(fish.diseaseState);
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
  fish.diseaseRequiresTreatment = options.requiresTreatment === true;
  return true;
}

function maybeSeedDavyJonesViralIllness(fish, now = Date.now()) {
  if (!fish || isFishDead(fish) || Math.random() >= DAVY_JONES_VIRAL_PURCHASE_CHANCE) {
    return false;
  }
  const infected = infectFishWithDisease(
    fish,
    "davy-jones-locker",
    now,
    DISEASE_STATE_VISIBLE,
    { type: DISEASE_TYPE_VIRAL, requiresTreatment: true, bypassUnlock: true }
  );
  if (infected) {
    pushEvent(`${fish.name} arrived showing signs of a viral illness. Treatment is required for recovery.`, now, getCurrentTank(), {
      type: "illness",
      fishId: fish.id,
      recapEligible: false
    });
  }
  return infected;
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
  if (!fish || !hasIllnessUnlocked()) {
    return false;
  }
  return Math.random() < getNewFishDiseaseCarrierChance(now)
    ? infectFishWithDisease(fish, "new-fish", now, DISEASE_STATE_CARRIER)
    : false;
}

function getDailyFishDiseaseChance(fish, now = Date.now()) {
  if (!fish || !hasIllnessUnlocked() || hasActiveFishDisease(fish) || isFishDead(fish)) {
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
  if (foodKey === "halloweenCandy" || hasActiveCandyBoost(fish, now)) return false;
  if (!fish || isFishDead(fish) || isMealFreeFish(fish)) {
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

function drawFishPufferBubbleBurst(fish, species, pose, width, height, now = Date.now()) {
  if (!isPufferfishSpecies(species) || !Array.isArray(fish?.pufferInflationBubbles) || !fish.pufferInflationBubbles.length) {
    return;
  }

  const stableScale = getViewportStableAssetScale();
  const palette = getBubbleOrbPalette(DEFAULT_BUBBLER_BUBBLE_COLOR, {
    fillOpacity: 0.26,
    colorize: true
  });
  const waterlineStopY = WATER_SURFACE_Y + Math.max(2 * stableScale, 2);
  const nextBubbles = [];
  const renderedBubbles = [];
  for (const bubble of fish.pufferInflationBubbles) {
    const ageMs = now - Number(bubble.createdAt);
    if (ageMs < 0) {
      nextBubbles.push(bubble);
      continue;
    }

    const radius = Number(bubble.radius) || 3.2;
    const availableTravelPx = Math.max(14 * stableScale, Number(bubble.sourceY) - waterlineStopY);
    const travelDurationMs = clamp(availableTravelPx * 20, 850, 2400);
    const popProgress = clamp((ageMs - travelDurationMs) / 150, 0, 1);
    if (ageMs > travelDurationMs + 150) {
      continue;
    }

    nextBubbles.push(bubble);
    const travelProgress = clamp(ageMs / travelDurationMs, 0, 1);
    const spawnFade = clamp(ageMs / 180, 0, 1);
    const x = Number(bubble.sourceX)
      + Number(bubble.driftX) * travelProgress
      + Math.sin(now / 1700 + Number(bubble.wobblePhase)) * Number(bubble.wobble) * (0.3 + travelProgress * 0.7);
    const y = Math.max(
      Number(bubble.sourceY) - availableTravelPx * travelProgress,
      waterlineStopY + radius * stableScale
    );
    const alpha = clamp(spawnFade * (popProgress > 0 ? 1 - popProgress : 1), 0, 1);
    if (alpha <= 0.008 && popProgress <= 0) {
      continue;
    }

    renderedBubbles.push({
      x,
      y,
      radius,
      alpha,
      stretch: Number(bubble.stretch) || 1,
      popProgress,
      seed: bubble.seed,
      malform: popProgress > 0
        ? null
        : {
          seed: bubble.seed ^ 0x51f0ea1d,
          amount: 0.2,
          phase: now / 3800 + Number(bubble.wobblePhase),
          rotation: Math.sin(now / 5400 + Number(bubble.seed)) * 0.06,
          speed: 0.45
        }
    });
  }

  fish.pufferInflationBubbles = nextBubbles.slice(-getPufferInflationBubbleCountMax());
  renderedBubbles.forEach((bubble) => {
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
          count: Math.max(5, BUBBLER_POP_MICRO_BUBBLE_COUNT - 1),
          burstScale: 1,
          surfaceY: waterlineStopY
        }
      );
      return;
    }

    drawBubbleOrbToContext(tankContext, bubble.x, bubble.y, bubble.radius, bubble.alpha, bubble.stretch, palette, stableScale, {
      malform: bubble.malform
    });
  });
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
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return false;
  if (!state?.fish?.length) {
    return false;
  }

  let changed = false;
  const previousSimulatedAt = Math.min(now, Number(state.lastSimulatedAt) || now);
  const cleanliness = getDiseaseTankCleanliness(now);

  for (const fish of state.fish) {
    if (!fish || isFishDead(fish)) {
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

      const treatmentRequired = fish.diseaseRequiresTreatment === true;
      const treatmentReceived = (Number(fish.diseaseTreatedUntil) || 0) > 0;
      if (goodConditions && (!treatmentRequired || treatmentReceived)) {
        fish.diseaseRecoveryProgressMs = Math.min(
          DISEASE_RECOVERY_REQUIRED_MS,
          (Number(fish.diseaseRecoveryProgressMs) || 0) + diseaseElapsedMs * (treated ? DISEASE_RECOVERY_TREATED_MULTIPLIER : 1)
        );
      } else if (!goodConditions) {
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
  if (!fish || !species || fish.activity !== "roam" || fish.caveState || isFishDead(fish)) {
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
      return `${name} settled into a sleep spot for the night.`;
    case "night_forage":
      return `${name} is moving around at night.`;
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
  if (isPiranhaSpecies(otherFish)) {
    return "fear";
  }
  const personality = getFishPersonality(fish);
  const otherPersonality = getFishPersonality(otherFish);
  const species = getSpeciesForFish(fish);
  const otherSpecies = getSpeciesForFish(otherFish);
  if (
    species?.id === "pilot-fish"
    && ["bull-shark", "great-white-shark", "hammerhead-shark", "orca"].includes(otherSpecies?.id)
  ) {
    return "friend";
  }
  if (
    otherSpecies?.id !== species?.id
    && getSpeciesConflictTags(species).includes("aggressive_predator")
    && isPredatoryFishSpecies(otherFish)
  ) {
    return "fear";
  }
  if (species?.id === "betta" && otherSpecies?.id === "betta") {
    return "rival";
  }
  const dislikedTypes = normalizeStringList(species?.dislikedTypes).map((value) => value.toLowerCase().replace(/[_\s]+/g, "-"));
  if (dislikedTypes.length) {
    const otherTypeCandidates = new Set([
      String(otherSpecies?.id || "").toLowerCase(),
      String(otherSpecies?.behavior || "").toLowerCase(),
      String(getFishBehaviorProfile(otherSpecies).group || "").toLowerCase()
    ].filter(Boolean));
    if (dislikedTypes.some((value) => otherTypeCandidates.has(value))) {
      return "dislike";
    }
  }
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
    const intentDurationMs = Math.max(1200, Math.min(18000, (Number(fish.targetAt) || now + 4000) - now + 900));
    setFishBehaviorIntent(fish, target.intentType, target.intentCause || "", now, {
      targetId: target.intentTargetId || target.hangoutDecorId || target.decorId || "",
      targetName: target.intentTargetName || "",
      durationMs: intentDurationMs
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


function getBettaRivalDispositionScore(fish) {
  const personality = getFishPersonality(fish);
  const bonuses = {
    territorial: 0.34,
    standoffish: 0.2,
    bold: 0.18,
    hunter: 0.16,
    display: 0.12,
    curious: 0.04,
    greedy: 0.03,
    sensitive: -0.12,
    shy: -0.2,
    gentle: -0.22,
    nervous: -0.16
  };
  return clamp(0.5 + (Number(bonuses[personality]) || 0), 0.12, 0.92);
}

function isBettaRivalPair(fish, otherFish) {
  if (!fish || !otherFish || fish.id === otherFish.id || isFishDead(fish) || isFishDead(otherFish)) {
    return false;
  }
  return getSpeciesForFish(fish)?.id === "betta" && getSpeciesForFish(otherFish)?.id === "betta";
}

function getBettaRivalCandidate(fish, relationships, nearbyAll, now = Date.now()) {
  if (!fish || getSpeciesForFish(fish)?.id !== "betta") {
    return null;
  }
  const activeTargetId = typeof fish.bettaRivalTargetId === "string" ? fish.bettaRivalTargetId : "";
  if (activeTargetId) {
    const activeTarget = state.fish.find((entry) => entry?.id === activeTargetId && isBettaRivalPair(fish, entry)) || null;
    if (activeTarget && getTankContainingFish(activeTarget.id)?.id === getTankContainingFish(fish.id)?.id) {
      return {
        fish: activeTarget,
        relation: relationships[activeTarget.id] || { kind: "rival", score: -50, updatedAt: now },
        distance: Math.hypot((fish.xNorm || 0.5) - (activeTarget.xNorm || 0.5), (fish.yNorm || 0.5) - (activeTarget.yNorm || 0.5))
      };
    }
    fish.bettaRivalTargetId = "";
  }

  return (nearbyAll || []).find((entry) => (
    entry?.fish
    && isBettaRivalPair(fish, entry.fish)
    && entry.relation?.kind === "rival"
    && entry.distance <= 0.42
    && (!entry.fish.bettaRivalTargetId || entry.fish.bettaRivalTargetId === fish.id)
  )) || null;
}

function setBettaRivalDisplayPair(fish, rival, now = Date.now()) {
  if (!isBettaRivalPair(fish, rival)) {
    return false;
  }
  const until = now + randomBetween(3200, 5600);
  for (const participant of [fish, rival]) {
    participant.bettaRivalTargetId = participant.id === fish.id ? rival.id : fish.id;
    participant.bettaRivalDisplayUntil = until;
    participant.bettaRivalChaseUntil = 0;
    participant.bettaRivalRole = "display";
    participant.bettaRivalNipAt = 0;
    participant.bettaRivalNippedTargetId = "";
    participant.targetAt = Math.min(Number(participant.targetAt) || now, now + 220);
  }
  setFishBehaviorIntent(rival, "betta display", fish.name || "rival Betta", now, {
    targetId: fish.id,
    targetName: fish.name || "",
    durationMs: until - now
  });
  return true;
}

function chooseBettaRivalAggressor(fish, rival) {
  const fishScore = getBettaRivalDispositionScore(fish) + Math.random() * 0.18;
  const rivalScore = getBettaRivalDispositionScore(rival) + Math.random() * 0.18;
  return fishScore >= rivalScore ? fish : rival;
}

function resolveBettaRivalEncounter(aggressor, loser, now = Date.now(), options = {}) {
  if (
    !aggressor
    || !loser
    || aggressor.id === loser.id
    || getSpeciesForFish(aggressor)?.id !== "betta"
    || getSpeciesForFish(loser)?.id !== "betta"
  ) {
    return false;
  }
  const nipped = options.nipped === true;
  const loserDead = isFishDead(loser);
  const cooldownUntil = now + randomBetween(nipped ? 22000 : 14000, nipped ? 36000 : 26000);
  aggressor.bettaRivalDisplayUntil = 0;
  aggressor.bettaRivalChaseUntil = 0;
  aggressor.bettaRivalRole = "";
  aggressor.bettaRivalNipAt = 0;
  aggressor.bettaRivalNippedTargetId = nipped ? loser.id : "";
  aggressor.bettaRivalCooldownUntil = cooldownUntil;
  aggressor.bettaRivalTargetId = "";
  aggressor.targetAt = now;

  loser.bettaRivalDisplayUntil = 0;
  loser.bettaRivalChaseUntil = 0;
  loser.bettaRivalRole = "";
  loser.bettaRivalNipAt = 0;
  loser.bettaRivalNippedTargetId = "";
  loser.bettaRivalTargetId = "";
  loser.targetAt = now;

  if (!loserDead) {
    loser.bettaRivalYieldUntil = now + randomBetween(nipped ? 11000 : 6500, nipped ? 18000 : 11000);
    loser.bettaRivalCooldownUntil = cooldownUntil;
    loser.bettaRivalTargetId = aggressor.id;
    reinforceFishAvoidanceRelationship(loser, aggressor, now, { severity: nipped ? 0.46 : 0.2 });
  } else {
    loser.bettaRivalYieldUntil = 0;
    loser.bettaRivalCooldownUntil = 0;
  }

  setFishBehaviorIntent(aggressor, "betta confrontation", loserDead ? "rival defeated" : "rival yielded", now, {
    targetId: loser.id,
    targetName: loser.name || "",
    durationMs: 2200
  });
  if (!loserDead) {
    setFishBehaviorIntent(loser, "betta yield", aggressor.name || "rival Betta", now, {
      targetId: aggressor.id,
      targetName: aggressor.name || "",
      durationMs: Math.max(1800, loser.bettaRivalYieldUntil - now)
    });
  }
  return true;
}

function startBettaRivalChase(fish, rival, now = Date.now()) {
  if (!isBettaRivalPair(fish, rival)) {
    return false;
  }
  const aggressor = chooseBettaRivalAggressor(fish, rival);
  const loser = aggressor.id === fish.id ? rival : fish;
  const chaseUntil = now + randomBetween(2400, 4300);
  aggressor.bettaRivalTargetId = loser.id;
  aggressor.bettaRivalDisplayUntil = 0;
  aggressor.bettaRivalChaseUntil = chaseUntil;
  aggressor.bettaRivalRole = "aggressor";
  aggressor.bettaRivalNipAt = now + randomBetween(650, 1450);
  aggressor.bettaRivalNippedTargetId = "";
  aggressor.targetAt = now;

  loser.bettaRivalTargetId = aggressor.id;
  loser.bettaRivalDisplayUntil = 0;
  loser.bettaRivalChaseUntil = chaseUntil;
  loser.bettaRivalRole = "flee";
  loser.targetAt = now;
  return true;
}

function getBettaRivalDisplayTarget(fish, species, rival, now = Date.now()) {
  const side = (fish.xNorm || 0.5) <= (rival.xNorm || 0.5) ? -1 : 1;
  const offset = 0.055;
  const targetLayer = getFishTankLayer(rival);
  return {
    xNorm: clamp((rival.xNorm || 0.5) + side * offset, 0.08, 0.92),
    yNorm: clampFishYNormToLayer((rival.yNorm || 0.5) + Math.sin(now / 520 + (fish.phase || 0) * Math.PI * 2) * 0.012, fish, species, targetLayer, { minYNorm: 0.14, maxYNorm: 0.82 }),
    targetLayer,
    targetAt: now + randomBetween(420, 720),
    intentType: "betta display",
    intentCause: `rival ${rival.name || "Betta"}`,
    intentTargetId: rival.id,
    intentTargetName: rival.name || "Betta",
    slow: true
  };
}

function pickBettaRivalBehaviorTarget(fish, species, relationships, nearbyAll, now = Date.now(), options = {}) {
  if (species?.id !== "betta" || !fish || isFishDead(fish)) {
    return null;
  }
  const candidate = getBettaRivalCandidate(fish, relationships, nearbyAll, now);
  if (!candidate?.fish) {
    fish.bettaRivalTargetId = "";
    fish.bettaRivalDisplayUntil = 0;
    fish.bettaRivalChaseUntil = 0;
    fish.bettaRivalRole = "";
    return null;
  }
  const rival = candidate.fish;
  const distance = candidate.distance;

  if ((Number(fish.bettaRivalYieldUntil) || 0) > now) {
    const escape = getAvoidanceEscapeTarget(fish, species, rival, {
      retreatNorm: randomBetween(0.18, 0.27),
      verticalScale: 0.7,
      cornerThreatRadius: 0.4
    });
    return {
      xNorm: escape?.xNorm ?? fish.xNorm,
      yNorm: escape?.yNorm ?? fish.yNorm,
      targetLayer: escape?.targetLayer ?? getFishTankLayer(fish),
      targetAt: now + randomBetween(650, 1150),
      intentType: "betta yield",
      intentCause: rival.name || "rival Betta",
      intentTargetId: rival.id,
      intentTargetName: rival.name || "Betta"
    };
  }

  if ((Number(fish.bettaRivalChaseUntil) || 0) > now) {
    if (fish.bettaRivalRole === "flee") {
      const escape = getAvoidanceEscapeTarget(fish, species, rival, {
        retreatNorm: randomBetween(0.16, 0.25),
        verticalScale: 0.76,
        cornerThreatRadius: 0.42
      });
      return {
        xNorm: escape?.xNorm ?? fish.xNorm,
        yNorm: escape?.yNorm ?? fish.yNorm,
        targetLayer: escape?.targetLayer ?? getFishTankLayer(fish),
        targetAt: now + randomBetween(460, 760),
        intentType: "betta confrontation",
        intentCause: `chased by ${rival.name || "rival"}`,
        intentTargetId: rival.id,
        intentTargetName: rival.name || "Betta"
      };
    }
    return {
      xNorm: clamp((rival.xNorm || 0.5) + randomBetween(-0.018, 0.018), 0.08, 0.92),
      yNorm: clamp((rival.yNorm || 0.5) + randomBetween(-0.012, 0.012), 0.14, 0.82),
      targetLayer: getFishTankLayer(rival),
      targetAt: now + randomBetween(380, 650),
      intentType: "betta confrontation",
      intentCause: `chasing ${rival.name || "rival"}`,
      intentTargetId: rival.id,
      intentTargetName: rival.name || "Betta"
    };
  }

  if ((Number(fish.bettaRivalDisplayUntil) || 0) > now) {
    return getBettaRivalDisplayTarget(fish, species, rival, now);
  }

  if ((Number(fish.bettaRivalDisplayUntil) || 0) > 0 && (Number(fish.bettaRivalDisplayUntil) || 0) <= now) {
    const aggression = Math.max(getBettaRivalDispositionScore(fish), getBettaRivalDispositionScore(rival));
    const escalateChance = clamp(0.12 + aggression * 0.28, 0.12, 0.38);
    if (isViolenceEnabled() && Math.random() < escalateChance) {
      startBettaRivalChase(fish, rival, now);
      return pickBettaRivalBehaviorTarget(fish, species, relationships, nearbyAll, now, options);
    }
    const aggressor = chooseBettaRivalAggressor(fish, rival);
    const loser = aggressor.id === fish.id ? rival : fish;
    resolveBettaRivalEncounter(aggressor, loser, now, { nipped: false });
    return loser.id === fish.id
      ? pickBettaRivalBehaviorTarget(fish, species, relationships, nearbyAll, now, options)
      : null;
  }

  if ((Number(fish.bettaRivalCooldownUntil) || 0) > now) {
    return null;
  }

  const shouldBegin = options.force === true || distance <= 0.16 || (distance <= 0.34 && Math.random() < 0.32);
  if (!shouldBegin) {
    return null;
  }

  fish.bettaRivalTargetId = rival.id;
  rival.bettaRivalTargetId = fish.id;
  if (distance > 0.115) {
    const side = (fish.xNorm || 0.5) <= (rival.xNorm || 0.5) ? -1 : 1;
    return {
      xNorm: clamp((rival.xNorm || 0.5) + side * 0.085, 0.08, 0.92),
      yNorm: clamp((rival.yNorm || 0.5) + randomBetween(-0.018, 0.018), 0.14, 0.82),
      targetLayer: getFishTankLayer(rival),
      targetAt: now + randomBetween(700, 1100),
      intentType: "betta confrontation",
      intentCause: `approaching rival ${rival.name || "Betta"}`,
      intentTargetId: rival.id,
      intentTargetName: rival.name || "Betta"
    };
  }

  setBettaRivalDisplayPair(fish, rival, now);
  return getBettaRivalDisplayTarget(fish, species, rival, now);
}

function pickRelationshipBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  const relationships = sanitizeFishRelationships(fish?.relationships);
  if (!fish || !species) {
    return null;
  }
  const personality = getFishPersonality(fish);
  const nearbyAll = state.fish
    .filter((otherFish) => otherFish && otherFish.id !== fish.id && !isFishDead(otherFish))
    .map((otherFish) => ({
      fish: otherFish,
      relation: relationships[otherFish.id],
      distance: Math.hypot((fish.xNorm || 0.5) - (otherFish.xNorm || 0.5), (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5))
    }))
    .sort((left, right) => left.distance - right.distance);
  const nearby = nearbyAll.filter((entry) => entry.relation);
  const bettaRivalTarget = pickBettaRivalBehaviorTarget(fish, species, relationships, nearbyAll, now, options);
  if (bettaRivalTarget) {
    return bettaRivalTarget;
  }
  const threat = nearby.find((entry) => (
    ["fear", "dislike", "rival"].includes(entry.relation.kind)
    && entry.distance <= 0.34
    && !(species?.id === "betta" && getSpeciesForFish(entry.fish)?.id === "betta" && entry.relation.kind === "rival")
  ));
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
  // "Large fish" is a spatial comfort issue, so the affected fish should
  // react when a large body gets within roughly one combined body length,
  // even if the two fish do not have a relationship record yet.
  const avoidsLargeFish = getSpeciesConflictTags(species).includes("large_fish");
  const nearbyLargeFish = avoidsLargeFish
    ? nearbyAll.find((entry) => {
      const otherSpecies = getSpeciesForFish(entry.fish);
      if ((Number(otherSpecies?.width) || 0) < 220) return false;
      const bodyLengthNorm = (getFishDisplayWidth(fish, species, now) + getFishDisplayWidth(entry.fish, otherSpecies, now)) * 0.55 / TANK_WIDTH;
      return entry.distance <= clamp(bodyLengthNorm, 0.07, 0.22);
    })
    : null;
  if (nearbyLargeFish) {
    const refuge = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hide", "plant"],
      chanceMultiplier: 2.2,
      lingerMultiplier: 1.35,
      preferBackLayer: true
    });
    if (refuge) {
      return {
        ...refuge,
        intentType: "hide",
        intentCause: `large fish ${nearbyLargeFish.fish.name}`,
        intentTargetId: nearbyLargeFish.fish.id,
        intentTargetName: nearbyLargeFish.fish.name,
        signalType: "avoid_large_fish",
        debugText: `hide from ${nearbyLargeFish.fish.name}`
      };
    }
    const escape = getAvoidanceEscapeTarget(fish, species, nearbyLargeFish.fish, { retreatNorm: randomBetween(0.14, 0.22), verticalScale: 0.72 });
    return {
      xNorm: escape?.xNorm ?? fish.xNorm,
      yNorm: escape?.yNorm ?? fish.yNorm,
      targetLayer: escape?.targetLayer ?? getFishTankLayer(fish),
      targetAt: now + randomBetween(1800, 3400),
      intentType: "avoid",
      intentCause: `large fish ${nearbyLargeFish.fish.name}`,
      intentTargetId: nearbyLargeFish.fish.id,
      intentTargetName: nearbyLargeFish.fish.name,
      signalType: "avoid_large_fish",
      debugText: `avoid ${nearbyLargeFish.fish.name} | large fish`
    };
  }
  if (options.onlyThreat) {
    return null;
  }
  if (species?.id === "pilot-fish" || ["social", "follower"].includes(personality) || getFishBehaviorProfile(species).group === "small-social") {
    const friend = nearby.find((entry) => entry.relation.kind === "friend" && entry.distance <= 0.42);
    // Social fish still occasionally swim near a friend, but this is a
    // background behavior. A high chance here made unrelated fish repeatedly
    // shadow one another instead of exploring the tank.
    if (friend && Math.random() < 0.045) {
      return {
        xNorm: clamp(friend.fish.xNorm + randomBetween(-0.1, 0.1), 0.08, 0.92),
        yNorm: clamp(friend.fish.yNorm + randomBetween(-0.075, 0.075), 0.14, 0.8),
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

function reinforceFishAvoidanceRelationship(observer, aggressor, now = Date.now(), options = {}) {
  if (!observer || !aggressor || observer.id === aggressor.id || isFishDead(observer) || isFishDead(aggressor)) {
    return false;
  }
  const relationships = sanitizeFishRelationships(observer.relationships);
  const previous = relationships[aggressor.id] || { kind: "neutral", score: 0, updatedAt: now };
  const severity = clamp(Number(options.severity) || 0.25, 0.05, 1);
  const scoreDrop = 10 + severity * 34;
  const nextScore = clamp((Number(previous.score) || 0) - scoreDrop, -100, 100);
  const observerSpecies = getSpeciesForFish(observer);
  const aggressorSpecies = getSpeciesForFish(aggressor);
  const sameBetta = observerSpecies?.id === "betta" && aggressorSpecies?.id === "betta";
  const nextKind = sameBetta
    ? "rival"
    : nextScore <= -55
      ? "fear"
      : "dislike";
  relationships[aggressor.id] = { kind: nextKind, score: nextScore, updatedAt: now };
  observer.relationships = relationships;
  observer.relationshipNextCheckAt = Math.max(Number(observer.relationshipNextCheckAt) || 0, now + BEHAVIOR_RELATIONSHIP_CHECK_MS);
  return true;
}

function teachNearbyFishFromAggression(victim, aggressor, now = Date.now(), severity = 0.35) {
  if (!victim || !aggressor) return false;
  let changed = reinforceFishAvoidanceRelationship(victim, aggressor, now, { severity });
  const homeTank = getTankContainingFish(victim.id);
  for (const witness of state.fish || []) {
    if (!witness || witness.id === victim.id || witness.id === aggressor.id || isFishDead(witness)) continue;
    if (getTankContainingFish(witness.id)?.id !== homeTank?.id) continue;
    const distance = Math.hypot((witness.xNorm || 0.5) - (victim.xNorm || 0.5), (witness.yNorm || 0.5) - (victim.yNorm || 0.5));
    if (distance > 0.24) continue;
    changed = reinforceFishAvoidanceRelationship(witness, aggressor, now, { severity: severity * 0.45 }) || changed;
  }
  return changed;
}

function getBehaviorDecorCandidates(pattern) {
  const matcher = pattern instanceof RegExp ? pattern : /$^/;
  return (state.placedDecor || []).filter((item) => matcher.test(String(item?.decorKey || "").toLowerCase()));
}

function pickKoiSubstrateForageBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "koi") return null;
  if (options.force !== true && Math.random() > 0.22) return null;

  const nearbyNaturalDecor = getBehaviorDecorCandidates(/plant|moss|wood|root|rock|stone|driftwood/);
  const decor = nearbyNaturalDecor.length && Math.random() < 0.42
    ? nearbyNaturalDecor[Math.floor(Math.random() * nearbyNaturalDecor.length)]
    : null;
  if (decor) {
    return {
      xNorm: clamp((Number(decor.xNorm) || 0.5) + randomBetween(-0.08, 0.08), 0.1, 0.9),
      yNorm: clamp(Math.max(Number(decor.yNorm) || 0.76, randomBetween(0.78, 0.88)), 0.68, 0.9),
      targetLayer: getDecorTankLayer(decor),
      targetAt: now + randomBetween(1500, 2800),
      hangoutDecorId: decor.id,
      zoneType: "hardscape",
      intentType: "forage substrate",
      intentCause: "bottom foraging",
      slow: true
    };
  }

  return {
    xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.2, 0.2), 0.1, 0.9),
    yNorm: clampFishYNormToLayer(randomBetween(0.82, 0.9), fish, species, TANK_DEPTH_LAYERS, { minYNorm: 0.76, maxYNorm: 0.92 }),
    targetLayer: TANK_DEPTH_LAYERS,
    targetAt: now + randomBetween(1400, 2600),
    intentType: "forage substrate",
    intentCause: "bottom foraging",
    slow: true
  };
}

function pickLionfishShelterBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "lionfish") return null;
  if (options.force !== true && Math.random() > 0.48) return null;

  const shelter = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["hide", "hardscape", "plant"],
    chanceMultiplier: 2.4,
    lingerMultiplier: 1.75,
    occupancyLimit: 1,
    preferBackLayer: true,
    force: options.force === true
  });
  if (!shelter) return null;
  return {
    ...shelter,
    targetAt: now + Math.max(2800, Number(shelter.lingerMs) || 0),
    intentType: "shelter hover",
    intentCause: "ambush cover",
    slow: true
  };
}

function pickYellowTangGrazeBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "yellow-tang") return null;
  let decor = null;
  if ((Number(fish.yellowTangGrazeUntil) || 0) > now && fish.yellowTangGrazeDecorId) {
    decor = (state.placedDecor || []).find((item) => item.id === fish.yellowTangGrazeDecorId) || null;
  }
  if (!decor && options.force !== true && Math.random() > 0.34) return null;
  if (!decor) {
    const candidates = getBehaviorDecorCandidates(/seaweed|kelp|algae|moss|anub|plant|driftwood/);
    decor = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    fish.yellowTangGrazeUntil = now + randomBetween(5200, 9800);
    fish.yellowTangGrazeDecorId = decor?.id || "";
    fish.yellowTangGrazePhase = Math.random() * Math.PI * 2;
  }

  if ((Number(fish.yellowTangLastCleanAt) || 0) + 15000 <= now && !isTutorialTankDirtinessLocked()) {
    const dirtiness = getBaseTankDirtiness(now);
    if (dirtiness > 0.001) {
      rebaseTankDirtiness(now, Math.max(0, dirtiness - 0.0025));
      fish.yellowTangLastCleanAt = now;
      runtime.tankStateDirty = true;
    }
  }

  if (decor) {
    const phase = Number(fish.yellowTangGrazePhase) || 0;
    fish.yellowTangGrazePhase = phase + randomBetween(0.8, 1.35);
    const radius = randomBetween(0.035, 0.075);
    return {
      xNorm: clamp((Number(decor.xNorm) || 0.5) + Math.cos(fish.yellowTangGrazePhase) * radius, 0.08, 0.92),
      yNorm: clamp((Number(decor.yNorm) || 0.58) + Math.sin(fish.yellowTangGrazePhase) * radius * 0.65, 0.2, 0.84),
      targetLayer: getDecorTankLayer(decor),
      targetAt: now + randomBetween(900, 1700),
      hangoutDecorId: decor.id,
      zoneType: "plant",
      intentType: "graze seaweed",
      intentCause: "algae browsing",
      slow: true
    };
  }

  fish.yellowTangGrazeUntil = now + randomBetween(3600, 6800);
  const xNorm = clamp((fish.xNorm || 0.5) + randomBetween(-0.14, 0.14), 0.1, 0.9);
  return {
    xNorm,
    yNorm: clampFishYNormToLayer(randomBetween(0.8, 0.9), fish, species, TANK_DEPTH_LAYERS, { minYNorm: 0.72, maxYNorm: 0.92 }),
    targetLayer: TANK_DEPTH_LAYERS,
    targetAt: now + randomBetween(900, 1600),
    intentType: "graze gravel",
    intentCause: "algae browsing",
    slow: true
  };
}

function pickMollyGrazeBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "molly" || (options.force !== true && Math.random() > 0.12)) return null;
  const plants = getBehaviorDecorCandidates(/seaweed|kelp|algae|moss|plant/);
  const decor = plants.length ? plants[Math.floor(Math.random() * plants.length)] : null;
  if (decor) {
    return {
      xNorm: clamp((Number(decor.xNorm) || 0.5) + randomBetween(-0.055, 0.055), 0.08, 0.92),
      yNorm: clamp((Number(decor.yNorm) || 0.58) + randomBetween(-0.04, 0.05), 0.18, 0.84),
      targetLayer: getDecorTankLayer(decor),
      targetAt: now + randomBetween(1200, 2400),
      hangoutDecorId: decor.id,
      zoneType: "plant",
      intentType: "social graze",
      intentCause: "opportunistic grazing",
      slow: true
    };
  }
  return {
    xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.12, 0.12), 0.08, 0.92),
    yNorm: randomBetween(0.72, 0.86),
    targetLayer: TANK_DEPTH_LAYERS,
    targetAt: now + randomBetween(1000, 1900),
    intentType: "social graze",
    intentCause: "opportunistic grazing",
    slow: true
  };
}

function pickSunfishSurfaceBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "sunfish") return null;
  if ((Number(fish.sunfishSurfaceVisitUntil) || 0) <= now) {
    fish.sunfishSurfaceVisitUntil = 0;
    if (options.force !== true && Math.random() > 0.2) return null;
    fish.sunfishSurfaceVisitUntil = now + randomBetween(7000, 13000);
    fish.sunfishSurfaceVisitXNorm = clamp((fish.xNorm || 0.5) + randomBetween(-0.12, 0.12), 0.16, 0.84);
  }
  return {
    xNorm: Number(fish.sunfishSurfaceVisitXNorm) || fish.xNorm,
    yNorm: randomBetween(0.16, 0.21),
    targetLayer: clampTankLayer(Math.min(getFishTankLayer(fish), 2)),
    targetAt: Math.min(Number(fish.sunfishSurfaceVisitUntil) || now + 5000, now + 5000),
    intentType: "surface visit",
    intentCause: "surface excursion",
    slow: true
  };
}

function pickSeahorsePerchBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "seahorse") return null;
  let decor = null;
  if ((Number(fish.seahorsePerchUntil) || 0) > now && fish.seahorsePerchDecorId) {
    decor = (state.placedDecor || []).find((item) => item.id === fish.seahorsePerchDecorId) || null;
  }
  if (!decor) {
    fish.seahorsePerchUntil = 0;
    fish.seahorsePerchDecorId = "";
    fish.seahorsePerchXNorm = null;
    fish.seahorsePerchYNorm = null;
    if (options.force !== true && Math.random() > 0.24) return null;
    const candidates = getBehaviorDecorCandidates(/seaweed|kelp|plant|moss|coral|driftwood|root/);
    if (!candidates.length) return null;
    decor = candidates[Math.floor(Math.random() * candidates.length)];
    fish.seahorsePerchDecorId = decor.id;
    fish.seahorsePerchUntil = now + randomBetween(8500, 16000);
    const side = (fish.xNorm || 0.5) < (Number(decor.xNorm) || 0.5) ? -1 : 1;
    fish.seahorsePerchXNorm = clamp((Number(decor.xNorm) || 0.5) + side * randomBetween(0.018, 0.038), 0.08, 0.92);
    fish.seahorsePerchYNorm = clamp((Number(decor.yNorm) || 0.55) + randomBetween(-0.025, 0.035), 0.2, 0.82);
  }
  if (!Number.isFinite(Number(fish.seahorsePerchXNorm)) || !Number.isFinite(Number(fish.seahorsePerchYNorm))) {
    const side = (fish.xNorm || 0.5) < (Number(decor.xNorm) || 0.5) ? -1 : 1;
    fish.seahorsePerchXNorm = clamp((Number(decor.xNorm) || 0.5) + side * 0.028, 0.08, 0.92);
    fish.seahorsePerchYNorm = clamp(Number(decor.yNorm) || 0.55, 0.2, 0.82);
  }
  return {
    xNorm: fish.seahorsePerchXNorm,
    yNorm: fish.seahorsePerchYNorm,
    targetLayer: getDecorTankLayer(decor),
    targetAt: Math.min(Number(fish.seahorsePerchUntil) || now + 6000, now + 6000),
    hangoutDecorId: decor.id,
    zoneType: "perch",
    intentType: "perched",
    intentCause: "perch anchoring",
    slow: true
  };
}

function pickPencilfishSparBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "pencilfish") return null;
  let partner = fish.pencilSparPartnerId
    ? state.fish.find((entry) => entry?.id === fish.pencilSparPartnerId && !isFishDead(entry))
    : null;
  if (!partner || (Number(fish.pencilSparUntil) || 0) <= now) {
    fish.pencilSparPartnerId = "";
    fish.pencilSparUntil = 0;
    if (options.force !== true && Math.random() > 0.14) return null;
    const tankId = getTankContainingFish(fish.id)?.id;
    const candidates = state.fish.filter((entry) => (
      entry && entry.id !== fish.id && !isFishDead(entry) && entry.speciesId === "pencilfish"
      && getTankContainingFish(entry.id)?.id === tankId
      && (Number(entry.pencilSparUntil) || 0) <= now
    ));
    if (!candidates.length) return null;
    partner = candidates[Math.floor(Math.random() * candidates.length)];
    const until = now + randomBetween(4200, 7200);
    fish.pencilSparPartnerId = partner.id;
    fish.pencilSparUntil = until;
    partner.pencilSparPartnerId = fish.id;
    partner.pencilSparUntil = until;
    setFishBehaviorIntent(partner, "harmless spar", fish.name || "Pencilfish", now, { targetId: fish.id, targetName: fish.name || "", durationMs: until - now });
  }
  const side = String(fish.id).localeCompare(String(partner.id)) < 0 ? -1 : 1;
  const midX = ((fish.xNorm || 0.5) + (partner.xNorm || 0.5)) / 2;
  const midY = ((fish.yNorm || 0.35) + (partner.yNorm || 0.35)) / 2;
  return {
    xNorm: clamp(midX + side * randomBetween(0.028, 0.05), 0.08, 0.92),
    yNorm: clamp(midY + randomBetween(-0.025, 0.025), 0.16, 0.48),
    targetLayer: getFishTankLayer(partner),
    targetAt: Math.min(Number(fish.pencilSparUntil) || now + 900, now + randomBetween(550, 900)),
    intentType: "harmless spar",
    intentCause: "display sparring",
    intentTargetId: partner.id,
    intentTargetName: partner.name || "Pencilfish",
    speed: normalizeFishSpeed(species, randomBetween(species.speedMin, Math.max(species.speedMin, species.speedMax * 0.82)))
  };
}

function pickAngelfishTerritoryBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "angelfish" || !isFishAdult(fish, now)) return null;
  const homeId = getFishResidenceDecorId(fish);
  const home = homeId ? (state.placedDecor || []).find((item) => item.id === homeId) : null;
  if (!home) return null;
  const homeX = Number(home.xNorm) || 0.5;
  const homeY = Number(home.yNorm) || 0.55;
  const intruder = state.fish
    .filter((entry) => entry && entry.id !== fish.id && !isFishDead(entry))
    .map((entry) => ({ fish: entry, distance: Math.hypot((entry.xNorm || 0.5) - homeX, (entry.yNorm || 0.5) - homeY) }))
    .filter((entry) => entry.distance <= 0.22)
    .sort((a,b) => a.distance-b.distance)[0]?.fish || null;
  if (intruder) {
    reinforceFishAvoidanceRelationship(intruder, fish, now, { severity: 0.16 });
    fish.territoryTargetFishId = intruder.id;
    fish.territoryTargetUntil = now + 4200;
    return {
      xNorm: clamp((intruder.xNorm || 0.5) + (homeX - (intruder.xNorm || 0.5)) * 0.28, 0.08, 0.92),
      yNorm: clamp((intruder.yNorm || 0.5) + (homeY - (intruder.yNorm || 0.5)) * 0.28, 0.14, 0.82),
      targetLayer: getFishTankLayer(intruder),
      targetAt: now + randomBetween(650, 1200),
      intentType: "territorial warning",
      intentCause: "adult home territory",
      intentTargetId: intruder.id,
      intentTargetName: intruder.name || "intruder"
    };
  }
  if (options.force !== true && Math.random() > 0.42) return null;
  return {
    xNorm: clamp(homeX + randomBetween(-0.06, 0.06), 0.08, 0.92),
    yNorm: clamp(homeY + randomBetween(-0.045, 0.045), 0.16, 0.82),
    targetLayer: getDecorTankLayer(home),
    targetAt: now + randomBetween(2200, 4800),
    hangoutDecorId: home.id,
    zoneType: "territory",
    intentType: "guard home",
    intentCause: "adult angelfish territory",
    slow: true
  };
}

function getBlueRamGuardedEgg(fish) {
  if (!fish || fish.speciesId !== "blue-ram") return null;
  return (state.fishEggs || []).find((egg) => {
    if (!egg || egg.hatchedAt || egg.speciesId !== "blue-ram") return false;
    const parentIds = Array.isArray(egg.parentIds) ? egg.parentIds : [];
    if (parentIds.length) {
      return parentIds.includes(fish.id);
    }
    // Legacy eggs created before parent IDs were saved can still fall back to
    // display names. All newly created eggs use stable IDs.
    return Array.isArray(egg.parentNames) && egg.parentNames.includes(fish.name);
  }) || null;
}

function pickBlueRamTerritoryBehaviorTarget(fish, species, now = Date.now()) {
  if (species?.id !== "blue-ram" || !isFishAdult(fish, now)) return null;
  const egg = getBlueRamGuardedEgg(fish);
  const frisky = (Number(state.foodBuffs?.friskyUntil) || 0) > now;
  const centerX = egg ? Number(egg.xNorm) || 0.5 : fish.xNorm || 0.5;
  const centerY = egg ? Number(egg.yNorm) || 0.72 : fish.yNorm || 0.5;
  let intruders = state.fish.filter((entry) => entry && entry.id !== fish.id && !isFishDead(entry));
  if (egg) {
    intruders = intruders.filter((entry) => Math.hypot((entry.xNorm || 0.5) - centerX, (entry.yNorm || 0.5) - centerY) <= 0.2);
  } else if (frisky) {
    intruders = intruders.filter((entry) => entry.speciesId !== "blue-ram" && Math.hypot((entry.xNorm || 0.5) - centerX, (entry.yNorm || 0.5) - centerY) <= 0.36);
  } else {
    return null;
  }
  const intruder = intruders.sort((a,b) => Math.hypot((a.xNorm||0.5)-centerX,(a.yNorm||0.5)-centerY)-Math.hypot((b.xNorm||0.5)-centerX,(b.yNorm||0.5)-centerY))[0] || null;
  if (intruder) {
    reinforceFishAvoidanceRelationship(intruder, fish, now, { severity: egg ? 0.2 : 0.12 });
    fish.territoryTargetFishId = intruder.id;
    fish.territoryTargetUntil = now + 3800;
    return {
      xNorm: clamp((intruder.xNorm || 0.5) + (centerX - (intruder.xNorm || 0.5)) * 0.18, 0.08, 0.92),
      yNorm: clamp((intruder.yNorm || 0.5) + (centerY - (intruder.yNorm || 0.5)) * 0.18, 0.14, 0.86),
      targetLayer: getFishTankLayer(intruder),
      targetAt: now + randomBetween(600, 1100),
      intentType: egg ? "guard egg" : "breeding aggression",
      intentCause: egg ? "egg territory" : "frisky food",
      intentTargetId: intruder.id,
      intentTargetName: intruder.name || "intruder"
    };
  }
  if (egg) {
    return {
      xNorm: clamp(centerX + randomBetween(-0.055, 0.055), 0.08, 0.92),
      yNorm: clamp(centerY - randomBetween(0.035, 0.075), 0.18, 0.86),
      targetLayer: clampTankLayer(Number(egg.tankLayer) || getFishTankLayer(fish)),
      targetAt: now + randomBetween(1800, 3600),
      intentType: "guard egg",
      intentCause: "egg territory",
      slow: true
    };
  }
  return null;
}

function pickSurfaceAmbushBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "wonder-killifish" || (options.force !== true && Math.random() > 0.3)) return null;
  return {
    xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.12, 0.12), 0.1, 0.9),
    yNorm: randomBetween(0.14, 0.2),
    targetLayer: clampTankLayer(Math.min(getFishTankLayer(fish), 2)),
    targetAt: now + randomBetween(2200, 4800),
    intentType: "surface ambush",
    intentCause: "surface ambush",
    slow: true
  };
}

function pickPilotCompanionBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  if (species?.id !== "pilot-fish" || (options.force !== true && Math.random() > 0.2)) return null;
  const companions = state.fish.filter((entry) => entry && !isFishDead(entry) && ["bull-shark", "great-white-shark", "hammerhead-shark", "orca"].includes(entry.speciesId));
  if (!companions.length) return null;
  const companion = companions.sort((a,b) => Math.hypot((a.xNorm||0.5)-(fish.xNorm||0.5),(a.yNorm||0.5)-(fish.yNorm||0.5))-Math.hypot((b.xNorm||0.5)-(fish.xNorm||0.5),(b.yNorm||0.5)-(fish.yNorm||0.5)))[0];
  return {
    xNorm: clamp((companion.xNorm || 0.5) + randomBetween(-0.08, 0.08), 0.08, 0.92),
    yNorm: clamp((companion.yNorm || 0.5) + randomBetween(-0.05, 0.05), 0.14, 0.82),
    targetLayer: getFishTankLayer(companion),
    targetAt: now + randomBetween(2600, 5200),
    intentType: "pilot escort",
    intentCause: "large-animal association",
    intentTargetId: companion.id,
    intentTargetName: companion.name || "large companion"
  };
}

function getFishSignatureBehaviorFacingDirection(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!fish || !species || isFishDead(fish) || fish.caveState || fish.activity !== "roam") {
    return null;
  }
  if (species.id === "yellow-tang" && (Number(fish.yellowTangGrazeUntil) || 0) > now && fish.yellowTangGrazeDecorId) {
    const decor = (state.placedDecor || []).find((item) => item?.id === fish.yellowTangGrazeDecorId) || null;
    if (decor) {
      const distance = Math.hypot((fish.xNorm || 0.5) - (Number(decor.xNorm) || 0.5), (fish.yNorm || 0.5) - (Number(decor.yNorm) || 0.5));
      if (distance <= 0.12) {
        return (Number(decor.xNorm) || 0.5) >= (fish.xNorm || 0.5) ? 1 : -1;
      }
    }
  }
  if (species.id === "betta" && (Number(fish.bettaRivalDisplayUntil) || 0) > now && fish.bettaRivalTargetId) {
    const rival = state.fish.find((entry) => entry?.id === fish.bettaRivalTargetId && !isFishDead(entry)) || null;
    if (rival) {
      return (rival.xNorm || 0.5) >= (fish.xNorm || 0.5) ? 1 : -1;
    }
  }
  if (species.id === "pencilfish" && (Number(fish.pencilSparUntil) || 0) > now && fish.pencilSparPartnerId) {
    const partner = state.fish.find((entry) => entry?.id === fish.pencilSparPartnerId && !isFishDead(entry)) || null;
    if (partner) {
      return (partner.xNorm || 0.5) >= (fish.xNorm || 0.5) ? 1 : -1;
    }
  }
  return null;
}

function getFishSignatureBehaviorKey(speciesOrFish) {
  const species = speciesOrFish?.speciesId ? getSpeciesForFish(speciesOrFish) : speciesOrFish;
  switch (species?.id) {
    case "yellow-tang": return "algae-browse";
    case "molly": return "opportunistic-graze";
    case "sunfish": return "surface-visit";
    case "seahorse": return "perch";
    case "pencilfish": return "spar";
    case "angelfish": return "home-territory";
    case "blue-ram": return "breeding-territory";
    case "wonder-killifish": return "surface-ambush";
    case "pilot-fish": return "large-animal-association";
    case "betta": return "rival-display";
    case "koi": return "substrate-forage";
    case "lionfish": return "shelter-ambush";
    default: return "";
  }
}

function pickSpeciesSignatureBehaviorTarget(fish, species, now = Date.now(), options = {}) {
  switch (getFishSignatureBehaviorKey(species)) {
    case "algae-browse":
      return pickYellowTangGrazeBehaviorTarget(fish, species, now, options);
    case "opportunistic-graze":
      return pickMollyGrazeBehaviorTarget(fish, species, now, options);
    case "surface-visit":
      return pickSunfishSurfaceBehaviorTarget(fish, species, now, options);
    case "perch":
      return pickSeahorsePerchBehaviorTarget(fish, species, now, options);
    case "spar":
      return pickPencilfishSparBehaviorTarget(fish, species, now, options);
    case "home-territory":
      return pickAngelfishTerritoryBehaviorTarget(fish, species, now, options);
    case "breeding-territory":
      return pickBlueRamTerritoryBehaviorTarget(fish, species, now);
    case "surface-ambush":
      return pickSurfaceAmbushBehaviorTarget(fish, species, now, options);
    case "large-animal-association":
      return pickPilotCompanionBehaviorTarget(fish, species, now, options);
    case "substrate-forage":
      return pickKoiSubstrateForageBehaviorTarget(fish, species, now, options);
    case "shelter-ambush":
      return pickLionfishShelterBehaviorTarget(fish, species, now, options);
    default:
      return null;
  }
}

function pickMovementPatternBehaviorTarget(fish, species, now = Date.now()) {
  // Kept as a compatibility entry point. Signature behaviors are selected by
  // species capability now, while movementPattern is reserved for locomotion.
  return pickSpeciesSignatureBehaviorTarget(fish, species, now);
}

function applyFishBehaviorIntentLayer(fish, species, now = Date.now()) {
  if (!fish || !species || fish.activity !== "roam" || fish.caveState || isFishDead(fish)) {
    return false;
  }
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    fish.behaviorIntent = null;
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
    return false;
  }
  const threatTarget = pickRelationshipBehaviorTarget(fish, species, now, { onlyThreat: true });
  if (threatTarget && applyBehaviorTarget(fish, species, threatTarget, now)) {
    return true;
  }
  const movementPatternTarget = pickMovementPatternBehaviorTarget(fish, species, now);
  if (movementPatternTarget && applyBehaviorTarget(fish, species, movementPatternTarget, now)) {
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
  if (foodKey === "halloweenCandy" || hasActiveCandyBoost(fish, now)) return false;
  if (!fish || isMealFreeFish(fish)) {
    return false;
  }

  const hunger = getFishNeedValue(fish, "hunger", now);
  // A critically hungry fish must not get trapped in a refusal loop. Once the
  // hunger meter reaches the critical range, comfort-based pickiness and an old
  // refusal cooldown no longer block eating compatible food.
  if (hunger <= FISH_HUNGER_CRITICAL_THRESHOLD) {
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
  const playerReason = diseaseState !== DISEASE_STATE_NONE
    ? "it feels unwell"
    : comfortPercent <= 40
      ? "it is too stressed"
      : "it is not ready to eat yet";
  fish.lastNeedEventAtByType = sanitizeFishNeedEventMap(fish.lastNeedEventAtByType);
  if (now - (Number(fish.lastNeedEventAtByType["food-refused-player"]) || 0) >= 5 * MINUTE_MS) {
    fish.lastNeedEventAtByType["food-refused-player"] = now;
    pushEvent(`${fish.name} refused food because ${playerReason}.`, now, getCurrentTank(), {
      type: "food",
      fishId: fish.id,
      score: 0,
      recapEligible: false
    });
  }
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

function getRuntimeImageSourceKey(sourceImage) {
  const directSource = sourceImage?.currentSrc || sourceImage?.src || "";
  if (directSource) {
    return directSource;
  }

  if (!sourceImage) {
    return "";
  }

  if (!sourceImage.__bbRuntimeImageSourceKey) {
    const key = `generated-image-source-${runtime.imageSourceId += 1}`;
    try {
      Object.defineProperty(sourceImage, "__bbRuntimeImageSourceKey", {
        value: key,
        enumerable: false
      });
    } catch (error) {
      sourceImage.__bbRuntimeImageSourceKey = key;
    }
  }
  return sourceImage.__bbRuntimeImageSourceKey;
}
