// Source fragment: fish/undead-and-appearance.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function mergeFishBehaviorProfile(baseSpecies, profileSpecies) {
  if (!baseSpecies || !profileSpecies) {
    return baseSpecies || null;
  }

  const merged = {
    ...baseSpecies,
    cycleSeconds: profileSpecies.cycleSeconds,
    bobSpeed: profileSpecies.bobSpeed,
    swimStyle: profileSpecies.swimStyle,
    speedMode: profileSpecies.speedMode,
    speedMin: profileSpecies.speedMin,
    speedMax: profileSpecies.speedMax,
    targetMinMs: profileSpecies.targetMinMs,
    targetMaxMs: profileSpecies.targetMaxMs,
    behavior: profileSpecies.behavior,
    diet: profileSpecies.diet,
    cleanupMinMs: profileSpecies.cleanupMinMs,
    cleanupMaxMs: profileSpecies.cleanupMaxMs,
    cleanupStrength: profileSpecies.cleanupStrength,
    poopCleanupChance: profileSpecies.poopCleanupChance,
    shadowScale: profileSpecies.shadowScale,
    caveEnabled: profileSpecies.caveEnabled,
    behaviorProfileSpeciesId: profileSpecies.id,
    behaviorProfileName: profileSpecies.name
  };
  if (baseSpecies.customAsset) {
    merged.swimStyle = baseSpecies.swimStyle;
    merged.speedMode = baseSpecies.speedMode;
    merged.speedMin = baseSpecies.speedMin;
    merged.speedMax = baseSpecies.speedMax;
    merged.targetMinMs = baseSpecies.targetMinMs;
    merged.targetMaxMs = baseSpecies.targetMaxMs;
    merged.diet = baseSpecies.diet;
    merged.chumOnly = baseSpecies.chumOnly;
    merged.activityRegulation = baseSpecies.activityRegulation;
    merged.swimZone = baseSpecies.swimZone;
    merged.socialAffinity = baseSpecies.socialAffinity;
    merged.behaviorSpeciesId = profileSpecies.id;
  }
  return merged;
}

function getSpeciesForFish(fish) {
  const baseSpecies = getBaseSpeciesForFish(fish);
  const profileSpecies = getFishBehaviorProfileSpecies(fish);
  if (!baseSpecies || !profileSpecies) {
    return baseSpecies || null;
  }

  const cacheKey = `${baseSpecies.id || ""}|${profileSpecies.id || ""}`;
  const cache = runtime.fishSpeciesMergeCache;
  const cached = cache?.get(cacheKey);
  if (cached?.baseSpecies === baseSpecies && cached?.profileSpecies === profileSpecies) {
    return cached.mergedSpecies;
  }

  const mergedSpecies = mergeFishBehaviorProfile(baseSpecies, profileSpecies);
  cache?.set(cacheKey, { baseSpecies, profileSpecies, mergedSpecies });
  return mergedSpecies;
}

function isCatalogUndeadShopSpecies(species) {
  return Boolean(isZombieSkeletonModeAvailable() && isZombieSkeletonCatalogSpecies(species));
}

function getUndeadTemplateStageForSpecies(species) {
  return isCatalogUndeadShopSpecies(species) ? species.undeadType : null;
}

function getUndeadTemplateFishSpeciesCandidates(stage) {
  if (!["zombie", "skeleton"].includes(stage)) {
    return [];
  }

  return runtime.fishCatalog.filter((entry) => (
    entry
    && !isUndeadSpecies(entry)
    && getFishDeathAssetCandidates(entry, stage).some((path) => runtime.images.has(path))
  ));
}

function pickRandomUndeadTemplateSpeciesId(stage, candidates = getUndeadTemplateFishSpeciesCandidates(stage)) {
  const pool = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!pool.length) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)]?.id || null;
}

function getStoredFishUndeadTemplateSpecies(fish, species = getSpeciesForFish(fish)) {
  const stage = getUndeadTemplateStageForSpecies(species);
  if (!stage) {
    return null;
  }

  const templateSpeciesId = typeof fish?.undeadTemplateSpeciesId === "string"
    ? fish.undeadTemplateSpeciesId.trim()
    : "";
  const templateSpecies = templateSpeciesId ? runtime.fishMap.get(templateSpeciesId) : null;
  if (!templateSpecies || isUndeadSpecies(templateSpecies)) {
    return null;
  }

  if (!runtime.images.size) {
    return templateSpecies;
  }

  return getFishDeathAssetCandidates(templateSpecies, stage).some((path) => runtime.images.has(path))
    ? templateSpecies
    : null;
}

function getStableUndeadTemplateSpecies(
  fish,
  species = getSpeciesForFish(fish),
  candidates = getUndeadTemplateFishSpeciesCandidates(getUndeadTemplateStageForSpecies(species))
) {
  const stage = getUndeadTemplateStageForSpecies(species);
  const pool = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!stage || !pool.length) {
    return null;
  }

  const seed = hashStringToUint32(`${fish?.id || ""}|${fish?.speciesId || ""}|undead-template|${stage}`);
  return pool[seed % pool.length] || pool[0] || null;
}

function getFishUndeadTemplateSpecies(fish, species = getSpeciesForFish(fish)) {
  const storedSpecies = getStoredFishUndeadTemplateSpecies(fish, species);
  if (storedSpecies) {
    return storedSpecies;
  }

  return getStableUndeadTemplateSpecies(fish, species);
}

function getFishDisplaySourceSpecies(fish, species = getSpeciesForFish(fish)) {
  return getFishUndeadTemplateSpecies(fish, species) || species || null;
}

function getFishDisplayScaleForSpecies(species = null) {
  return getViewportStableObjectScale("fish") * getAquariumPhysicalAssetScale("fish");
}

function getFishVisualCatalogWidth(species = null) {
  return clamp(
    Number(species?.displayWidth) || Number(species?.width) || FISH_CATALOG_WIDTH_MIN,
    FISH_CATALOG_WIDTH_MIN,
    FISH_CATALOG_WIDTH_MAX
  );
}

function getFishLayerDepthScaleForLayer(layer) {
  return 1 + Math.max(0, TANK_DEPTH_LAYERS - clampTankLayer(layer)) * FISH_LAYER_DEPTH_SCALE_STEP;
}

function getFishLayerDepthScaleMultiplier(fish, now = Date.now()) {
  if (!fish) {
    return 1;
  }

  const targetScale = getFishLayerDepthScaleForLayer(getFishTankLayer(fish));
  const transition = fish.id ? runtime.fishLayerDepthScaleTransitions.get(fish.id) : null;
  if (!transition) {
    return targetScale;
  }

  const progress = clamp((now - transition.startedAt) / Math.max(1, transition.durationMs), 0, 1);
  if (progress >= 1 || Math.abs(targetScale - transition.toScale) > 0.0001) {
    runtime.fishLayerDepthScaleTransitions.delete(fish.id);
    return targetScale;
  }

  const eased = 1 - Math.pow(1 - progress, 3);
  return transition.fromScale + (transition.toScale - transition.fromScale) * eased;
}

function getSuckerFishFrontGlassAssetPath(species, fish = null) {
  if (fish) {
    const selected = getFishAssetPath(fish, species);
    const directional = getFishDirectionalSpritePath(selected, "bottom");
    if (directional) return directional;
    if (selected && selected !== species?.asset) return null;
  }
  const assetPath = SUCKER_FISH_FRONT_GLASS_ASSET_BY_SPECIES[species?.id || ""];
  return assetPath ? resolveAppUrl(assetPath) : null;
}

function getSuckerFishFreeSwimAssetPath(species, fish = null) {
  if (fish) {
    const selected = getFishAssetPath(fish, species);
    const directional = getFishDirectionalSpritePath(selected, "side");
    if (directional) return directional;
    if (selected && selected !== species?.asset) return null;
  }
  const assetPath = SUCKER_FISH_FREE_SWIM_ASSET_BY_SPECIES[species?.id || ""];
  return assetPath ? resolveAppUrl(assetPath) : null;
}

function canSuckerFishFreeSwim(species) {
  return Boolean(species?.behavior === "sucker" && getSuckerFishFreeSwimAssetPath(species));
}

function isSuckerFishFreeSwimming(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  return Boolean(
    fish
    && canSuckerFishFreeSwim(species)
    && Number.isFinite(Number(fish.suckerFreeSwimUntil))
    && Number(fish.suckerFreeSwimUntil) > now
  );
}

function getSuckerFishGlassViewForLayer(layer) {
  return normalizeSuckerFishGlassLayer(layer) === SUCKER_FISH_FRONT_GLASS_LAYER ? "front" : "back";
}

function clearSuckerFishViewTransition(fish) {
  if (!fish) return;
  delete fish.suckerViewTransitionStartedAt;
  delete fish.suckerViewTransitionDurationMs;
  delete fish.suckerViewTransitionFrom;
  delete fish.suckerViewTransitionTo;
  delete fish.suckerViewTransitionFlip;
}

function startSuckerFishViewTransition(fish, fromView, toView, flipDirection = "down", now = Date.now()) {
  if (!fish) return false;
  const normalizedFrom = ["back", "front", "swim"].includes(fromView) ? fromView : "back";
  const normalizedTo = ["back", "front", "swim"].includes(toView) ? toView : normalizedFrom;
  if (normalizedFrom === normalizedTo) {
    clearSuckerFishViewTransition(fish);
    return false;
  }
  fish.suckerViewTransitionStartedAt = now;
  fish.suckerViewTransitionDurationMs = SUCKER_FISH_VIEW_TRANSITION_DURATION_MS;
  fish.suckerViewTransitionFrom = normalizedFrom;
  fish.suckerViewTransitionTo = normalizedTo;
  fish.suckerViewTransitionFlip = flipDirection === "up" ? "up" : "down";
  return true;
}

function getSuckerFishViewTransitionState(fish, now = Date.now()) {
  if (!fish || !Number.isFinite(Number(fish.suckerViewTransitionStartedAt))) {
    return null;
  }
  const durationMs = Math.max(1, Number(fish.suckerViewTransitionDurationMs) || SUCKER_FISH_VIEW_TRANSITION_DURATION_MS);
  const progress = clamp((now - Number(fish.suckerViewTransitionStartedAt)) / durationMs, 0, 1);
  if (progress >= 1) {
    clearSuckerFishViewTransition(fish);
    return null;
  }
  const fromView = ["back", "front", "swim"].includes(fish.suckerViewTransitionFrom)
    ? fish.suckerViewTransitionFrom
    : "back";
  const toView = ["back", "front", "swim"].includes(fish.suckerViewTransitionTo)
    ? fish.suckerViewTransitionTo
    : fromView;
  const easedProgress = progress * progress * (3 - 2 * progress);
  return {
    progress,
    easedProgress,
    fromView,
    toView,
    currentView: progress < 0.5 ? fromView : toView,
    flipDirection: fish.suckerViewTransitionFlip === "up" ? "up" : "down",
    fromScaleY: Math.max(
      SUCKER_FISH_VIEW_TRANSITION_MIN_SCALE_Y,
      Math.cos(easedProgress * Math.PI * 0.5)
    ),
    toScaleY: Math.max(
      SUCKER_FISH_VIEW_TRANSITION_MIN_SCALE_Y,
      Math.sin(easedProgress * Math.PI * 0.5)
    ),
    fromAlpha: clamp(1 - easedProgress, 0, 1),
    toAlpha: clamp(easedProgress, 0, 1)
  };
}

function getSuckerFishViewAssetPath(species, fish, view) {
  if (!species) return null;
  if (view === "swim") {
    return getSuckerFishFreeSwimAssetPath(species, fish);
  }
  if (view === "front") {
    return getSuckerFishFrontGlassAssetPath(species, fish);
  }
  return getFishAssetPath(fish, species) || species.asset || species.fallbackAsset || null;
}

function getFishDisplayWidth(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const widthSpecies = getFishDisplaySourceSpecies(fish, species) || species;
  const baseWidth = !widthSpecies
    ? (runtime.fishSizeRange?.min || FISH_CATALOG_WIDTH_MIN)
      * getFishDisplayScaleForSpecies()
      * getFishLayerDepthScaleMultiplier(fish, now)
      * getMobileViewportObjectScaleMultiplier("fish")
    : getFishVisualCatalogWidth(widthSpecies)
      * getFishEffectiveScale(fish, species, now)
      * getFishDisplayScaleForSpecies(widthSpecies)
      * getFishLayerDepthScaleMultiplier(fish, now)
      * getMobileViewportObjectScaleMultiplier("fish");

  if (species?.id === "pufferfish" && isPufferInflatedActive(fish, now)) {
    return baseWidth * 2;
  }
  if (species?.id === "pufferfish" && isPufferDeflatingActive(fish, now)) {
    const deflationProgress = getPufferDeflationProgress(fish, now);
    return baseWidth * (2 - deflationProgress);
  }
  return baseWidth;
}

function getFishAppearanceVariantSeed(fish, species = getSpeciesForFish(fish)) {
  const key = `${fish?.id || ""}|${fish?.name || ""}|${species?.id || ""}`;
  return hashStringToUint32(key);
}

function hashStringToUint32(key = "") {
  let hash = 0;
  for (const character of String(key || "")) {
    hash = ((hash * 33) + character.charCodeAt(0)) >>> 0;
  }
  return hash >>> 0;
}

function normalizeFishAppearanceVariantIndex(value, species, fallbackFish = null) {
  const variants = getFishAssetVariants(species);
  if (variants.length <= 1) {
    return 0;
  }

  const fallbackIndex = fallbackFish
    ? getFishAppearanceVariantSeed(fallbackFish, species) % variants.length
    : 0;
  const rawIndex = Number.isFinite(Number(value))
    ? Math.floor(Number(value))
    : fallbackIndex;
  return ((rawIndex % variants.length) + variants.length) % variants.length;
}

function getFishAssetPath(fish, species = getSpeciesForFish(fish)) {
  const variants = getFishAssetVariants(species);
  if (!variants.length) {
    return species?.asset || species?.fallbackAsset || null;
  }

  const purchasedAssetKey = getFishAppearanceVariantKey(fish?.appearanceAssetPath);
  const purchasedAsset = variants.find((path) => getFishAppearanceVariantKey(path) === purchasedAssetKey);
  if (purchasedAsset) return purchasedAsset;

  const chosen = variants.find((path) => getFishAppearanceVariantKey(path) === fish?.appearanceVariantKey);
  if (chosen) return chosen;

  return variants[normalizeFishAppearanceVariantIndex(fish?.appearanceVariant, species, fish)] || variants[0] || species?.fallbackAsset || species?.asset || null;
}

function getPufferInflatedAssetPathForBaseAsset(baseAsset) {
  if (typeof baseAsset !== "string" || !baseAsset.trim()) {
    return null;
  }

  // Current puffer atlases use descriptive frame names such as
  // puffer_amazon.png.  Keep the state suffix adjacent to that frame name.
  // The older pufferfish[_N] form remains supported for saved legacy fish.
  return baseAsset.replace(
    /(puffer(?:fish)?(?:_[a-z0-9]+)*?)(?:_inflated)?(\.[^./\?]+)(\?.*)?$/i,
    (_match, stem, extension, query = "") => `${stem}_inflated${extension}${query}`
  );
}

function getPufferInflatedDisplayAssetPath(fish, species = getSpeciesForFish(fish)) {
  if (!fish || species?.id !== "pufferfish") {
    return null;
  }

  const baseAsset = getFishAssetPath(fish, species) || species.asset || species.fallbackAsset || null;
  return getPufferInflatedAssetPathForBaseAsset(baseAsset);
}

function appendAssetSuffix(path, suffix) {
  if (typeof path !== "string" || !path.trim() || typeof suffix !== "string" || !suffix.trim()) {
    return null;
  }

  const trimmed = path.trim();
  const queryIndex = trimmed.indexOf("?");
  const basePath = queryIndex === -1 ? trimmed : trimmed.slice(0, queryIndex);
  const suffixQuery = queryIndex === -1 ? "" : trimmed.slice(queryIndex);
  if (!/\.[^./\\]+$/.test(basePath)) {
    return null;
  }

  return `${basePath.replace(/(\.[^./\\]+)$/, `${suffix}$1`)}${suffixQuery}`;
}

function deriveFishStageAssetFile(assetFile, stage) {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  if (typeof assetFile !== "string" || !assetFile.trim() || !["zombie", "skeleton"].includes(normalizedStage)) {
    return null;
  }

  const trimmed = assetFile.trim();
  const queryIndex = trimmed.indexOf("?");
  const basePath = queryIndex === -1 ? trimmed : trimmed.slice(0, queryIndex);
  const suffixQuery = queryIndex === -1 ? "" : trimmed.slice(queryIndex);
  const match = basePath.match(/^(.*?)(?:_(zombie|skeleton))?(\.[^./\\]+)$/i);
  if (!match) {
    return appendAssetSuffix(trimmed, `_${normalizedStage}`);
  }

  const [, stem, , extension] = match;
  return `${stem}_${normalizedStage}${extension}${suffixQuery}`;
}

function getFishDeathAssetCandidates(species, stage) {
  if (!ZOMBIE_SKELETON_BEHAVIOR_ENABLED || !species || !isZombieSkeletonStage(stage)) {
    return [];
  }

  const explicitCandidates = stage === "zombie"
    ? species.zombieAssetVariants
    : species.skeletonAssetVariants;

  return Array.isArray(explicitCandidates)
    ? explicitCandidates.filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index)
    : [];
}

function getBorrowedFishDeathAssetPool(stage, species = null) {
  const excludedPaths = new Set(getFishDeathAssetCandidates(species, stage));
  return runtime.fishCatalog
    .flatMap((entry) => getFishDeathAssetCandidates(entry, stage))
    .filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index && !excludedPaths.has(path));
}

function getStableBorrowedFishDeathAssetPath(fish, stage, pool = []) {
  const candidates = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!candidates.length) {
    return null;
  }

  const seed = hashStringToUint32(`${fish?.id || ""}|${fish?.speciesId || ""}|${stage}`);
  return candidates[seed % candidates.length] || candidates[0] || null;
}

function getFishDeathAssetPath(fish, species = getSpeciesForFish(fish), stage) {
  if (!species || !["zombie", "skeleton"].includes(stage)) {
    return null;
  }

  const ownCandidates = getFishDeathAssetCandidates(species, stage);
  const ownLoadedCandidate = ownCandidates.find((path) => runtime.images.has(path));
  if (ownLoadedCandidate) {
    return ownLoadedCandidate;
  }

  const borrowedPool = getBorrowedFishDeathAssetPool(stage, species);
  const loadedBorrowedPool = borrowedPool.filter((path) => runtime.images.has(path));
  const borrowedCandidate = getStableBorrowedFishDeathAssetPath(
    fish,
    stage,
    loadedBorrowedPool.length ? loadedBorrowedPool : borrowedPool
  );
  if (borrowedCandidate) {
    return borrowedCandidate;
  }

  return ownCandidates[0] || null;
}

function getFishZombieVariantAssetPath(fish, species = getSpeciesForFish(fish)) {
  return getFishDeathAssetPath(fish, species, "zombie")
    || getFishAssetPath(fish, species)
    || species?.fallbackAsset
    || species?.asset
    || null;
}

function getFishDecayStage(fish, now = Date.now()) {
  if (!isFishDead(fish)) {
    return null;
  }

  if (!isGoreEnabled() || !isZombieSkeletonModeAvailable()) {
    return null;
  }

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    const elapsed = Math.max(0, now - Number(fish.piranhaConsumptionStartedAt || now));
    if (elapsed >= PIRANHA_CONSUMPTION_SKELETON_MS) {
      return "skeleton";
    }
    if (elapsed >= PIRANHA_CONSUMPTION_ZOMBIE_MS) {
      return "zombie";
    }
    return "fresh";
  }

  const deadAt = Number.isFinite(Number(fish?.deadAt)) ? Number(fish.deadAt) : now;
  const elapsed = Math.max(0, now - deadAt);
  if (elapsed >= FISH_DECAY_SKELETON_MS) {
    return "skeleton";
  }
  if (elapsed >= FISH_DECAY_ZOMBIE_MS) {
    return "zombie";
  }
  return "fresh";
}

function getFishDisplayAssetPath(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!species) {
    return null;
  }

  const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
  const selectedAlternate = Boolean(fish?.appearanceVariantKey && fish.appearanceVariantKey !== getFishAppearanceVariantKey(displaySpecies.asset));
  const selectedFishAsset = getFishAssetPath(fish, displaySpecies);
  const livingSucker = !isFishDead(fish) && species?.behavior === "sucker";
  const suckerTransition = livingSucker ? getSuckerFishViewTransitionState(fish, now) : null;
  const stableSuckerView = livingSucker
    ? (isSuckerFishFreeSwimming(fish, species, now)
      ? "swim"
      : (typeof isFrontGlassSuckerFish === "function" && isFrontGlassSuckerFish(fish, species, now) ? "front" : "back"))
    : null;
  const suckerView = suckerTransition?.currentView || stableSuckerView;
  const suckerViewAsset = suckerView
    ? (getSuckerFishViewAssetPath(displaySpecies, fish, suckerView) || getSuckerFishViewAssetPath(species, fish, suckerView))
    : null;
  const undeadBaseStage = isZombieSkeletonModeAvailable() && isViolenceAndGoreEnabled() ? getUndeadTemplateStageForSpecies(species) : null;
  const preferredBaseAsset = suckerViewAsset || (isZombieVariantFish(fish)
    ? getFishZombieVariantAssetPath(fish, displaySpecies)
    : undeadBaseStage
      ? (
        getFishDeathAssetPath(fish, displaySpecies, undeadBaseStage)
        || getFishAssetPath(fish, displaySpecies)
        || displaySpecies.asset
        || displaySpecies.fallbackAsset
        || species.asset
        || species.fallbackAsset
        || null
      )
      : (getFishAssetPath(fish, displaySpecies) || displaySpecies.asset || displaySpecies.fallbackAsset || species.asset || species.fallbackAsset || null));
  const baseAsset = selectedAlternate && selectedFishAsset
    ? (suckerViewAsset || selectedFishAsset)
    : [
      preferredBaseAsset,
      displaySpecies.fallbackAsset,
      displaySpecies.asset,
      species.fallbackAsset,
      species.asset
    ].find((path) => path && runtime.images.has(path)) || preferredBaseAsset;
  const pufferPuffVisualActive = species?.id === "pufferfish" && isPufferPuffVisualActive(fish, now);
  const liveDisplayAsset = pufferPuffVisualActive
    ? (
      getPufferInflatedDisplayAssetPath(fish, displaySpecies)
      || getPufferInflatedDisplayAssetPath(fish, species)
      || baseAsset
    )
    : baseAsset;
  const stage = isGoreEnabled() ? getFishDecayStage(fish, now) : null;
  if (
    !stage
    || stage === "fresh"
    || (stage === "zombie" && isZombieVariantFish(fish))
    || (undeadBaseStage && stage === undeadBaseStage)
  ) {
    return liveDisplayAsset;
  }

  return getFishDeathAssetPath(fish, displaySpecies, stage) || liveDisplayAsset;
}

function getFishCatalogAssetPath(species) {
  if (!species) {
    return null;
  }
  if (species.storeAsset) {
    return species.storeAsset;
  }

  return [
    ...getFishAssetVariants(species),
    species.fallbackAsset,
    species.asset
  ].find((path) => path && runtime.images.has(path)) || species.asset || species.fallbackAsset || null;
}

function getFishCorpseDisplayState(fish, now = Date.now()) {
  if (!isFishDead(fish)) {
    return null;
  }

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    return "devoured";
  }

  if (!isGoreEnabled()) {
    return "deceased";
  }

  return getFishDecayStage(fish, now) || "fresh";
}

function getFishCorpseStateLabel(fish, now = Date.now()) {
  const stateLabel = getFishCorpseDisplayState(fish, now);
  if (stateLabel === "devoured") {
    return "Being devoured";
  }
  if (hasPendingZombieRevival(fish)) {
    return "Deceased";
  }
  if (stateLabel === "deceased") {
    return "Deceased";
  }
  if (stateLabel === "skeleton") {
    return "Remains";
  }
  if (stateLabel === "zombie") {
    return "Decaying corpse";
  }
  if (stateLabel === "fresh") {
    return "Fresh corpse";
  }
  return "Deceased";
}

function getFishAdultScale(fish, species = getSpeciesForFish(fish)) {
  if (!fish) {
    return DEFAULT_FISH_SCALE;
  }

  const speciesId = fish.speciesId || species?.id;
  const baseScale = Number.isFinite(Number(fish.scale))
    ? Number(fish.scale)
    : getFishScaleDefault(speciesId);
  return clamp(baseScale, FISH_SCALE_MIN, FISH_SCALE_MAX);
}

function getFishGrowthProgress(fish, now = Date.now()) {
  if (typeof getPeacefulModeSimulationNow === "function") now = getPeacefulModeSimulationNow(now);
  if (typeof getFishStorageSimulationNow === "function") now = getFishStorageSimulationNow(fish, now);
  if (
    !fish
    || !Number.isFinite(Number(fish.growthStartedAt))
    || !Number.isFinite(Number(fish.growthEndsAt))
    || Number(fish.growthEndsAt) <= Number(fish.growthStartedAt)
  ) {
    return 1;
  }

  return clamp(
    (now - Number(fish.growthStartedAt)) / Math.max(1, Number(fish.growthEndsAt) - Number(fish.growthStartedAt)),
    0,
    1
  );
}

function getFishGrowthScaleMultiplier(fish, now = Date.now()) {
  const progress = getFishGrowthProgress(fish, now);
  return BABY_FISH_SCALE_MULTIPLIER + (1 - BABY_FISH_SCALE_MULTIPLIER) * progress;
}

function getFishEffectiveScale(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  return getFishAdultScale(fish, species) * getFishGrowthScaleMultiplier(fish, now);
}

function isFishJuvenile(fish, now = Date.now()) {
  return getFishGrowthProgress(fish, now) < 1;
}

function isFishAdult(fish, now = Date.now()) {
  return !isFishJuvenile(fish, now);
}

function hasFishBeenInTankLongEnoughToBreed(fish, now = Date.now()) {
  return Number.isFinite(Number(fish?.tankAddedAt))
    && now - Number(fish.tankAddedAt) >= BREEDING_MIN_TANK_TIME_MS;
}

function isDetritusFish(target) {
  if (target?.speciesId && isUndeadFish(target)) {
    return false;
  }
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return species?.diet === "detritus";
}

function isBrineShrimpSpecies(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return species?.id === "brine-shrimp" || species?.behavior === "shrimp";
}

function isMealFreeFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  if (
    isPiranhaSpecies(target)
    || isZombieFish(target)
    || (isZombieSkeletonModeAvailable() && (species?.id === "zombie-fish" || target?.speciesId === "zombie-fish"))
  ) {
    return false;
  }
  if (isZombieVariantFish(target)) {
    return false;
  }
  return species?.diet === "detritus" || species?.diet === "none";
}

function isZombieVariantFish(target) {
  return Boolean(target?.speciesId && target.zombieVariant && isZombieSkeletonModeAvailable() && isGoreEnabled());
}

function isZombieFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return Boolean(isZombieVariantFish(target) || (isZombieModeEnabled() && species?.undeadType === "zombie"));
}

function isSkeletonFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return Boolean(isZombieModeEnabled() && species?.undeadType === "skeleton");
}

function isUndeadSpecies(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return Boolean(isZombieSkeletonUndeadType(species?.undeadType));
}

function isUndeadFish(target) {
  return isZombieFish(target) || isSkeletonFish(target);
}

function hasDefinedFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function hasZombieBiteInfection(fish) {
  return Boolean(
    fish
    && !isFishDead(fish)
    && hasDefinedFiniteNumber(fish.zombieBiteStartedAt)
  );
}

function hasPendingZombieRevival(fish) {
  return Boolean(
    fish
    && isFishDead(fish)
    && hasDefinedFiniteNumber(fish.zombieReviveAt)
  );
}

function usesZombieHunterBehavior(target) {
  return usesZombieSkeletonHunterBehavior({
    enabled: isZombieModeEnabled(),
    target,
    isZombieFish
  });
}

function getEffectiveFishBehavior(target) {
  const fish = target?.speciesId ? target : null;
  const species = fish ? getSpeciesForFish(fish) : target;
  if (!species) {
    return null;
  }

  const zombieSkeletonBehavior = getZombieSkeletonEffectiveBehavior({
    enabled: isZombieModeEnabled(),
    fish,
    species,
    isZombieVariantFish
  });
  if (zombieSkeletonBehavior) {
    return zombieSkeletonBehavior;
  }
  if (fish && isSuckerFishFreeSwimming(fish, species)) {
    return "steady";
  }
  return species.behavior || "steady";
}

function getFishDisplaySpeciesName(fish, species = getSpeciesForFish(fish)) {
  if (!species) {
    return "Fish";
  }

  const displaySpecies = getFishDisplaySourceSpecies(fish, species);
  if (isZombieVariantFish(fish)) {
    return displaySpecies?.name || species.name;
  }
  if (isCatalogUndeadShopSpecies(species) && displaySpecies && displaySpecies.id !== species.id) {
    if (!isViolenceAndGoreEnabled()) {
      return displaySpecies.name;
    }
    return displaySpecies.name;
  }
  return species.name;
}

function getFishInspectorSpeciesLabel(fish, species = getSpeciesForFish(fish)) {
  const label = getFishDisplaySpeciesName(fish, species);
  return species?.caveEnabled === true ? `${label} (cave)` : label;
}

function isPiranhaSpecies(target) {
  if (target?.speciesId && isUndeadFish(target)) {
    return false;
  }
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return species?.behavior === "piranha";
}

function fishNeedsMealWindow(target) {
  return !isMealFreeFish(target);
}

function getMealHistoryEntry(slotKey, tank = getCurrentTank()) {
  if (!slotKey) {
    return null;
  }

  const entry = state.mealHistory?.[slotKey];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return entry;
}

function getMealFedFishIds(slotKey, tank = getCurrentTank()) {
  const entry = getMealHistoryEntry(slotKey, tank);
  return new Set(Array.isArray(entry?.fishIds) ? entry.fishIds : []);
}

function getMealEligibleFishForSlot(slot, tank = getCurrentTank()) {
  if (!slot || !tank) {
    return [];
  }

  const currentSlotKey = getCurrentMealSlot(Date.now()).key;
  return tank.fish.filter((fish) => (
    fish
    && !isFishDead(fish)
    && fishNeedsMealWindow(fish)
    && (slot.key === currentSlotKey || fish.acquiredAt <= slot.start)
  ));
}

function isMealSlotServed(slot, tank = getCurrentTank()) {
  const eligibleFish = getMealEligibleFishForSlot(slot, tank);
  if (!eligibleFish.length) {
    return false;
  }

  const fedIds = getMealFedFishIds(slot.key, tank);
  return eligibleFish.every((fish) => fedIds.has(fish.id));
}

function normalizeHexColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return null;
}

function hexToRgb(color) {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);
  let hue;
  switch (max) {
    case red:
      hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
      break;
    case green:
      hue = ((blue - red) / delta + 2) / 6;
      break;
    default:
      hue = ((red - green) / delta + 4) / 6;
      break;
  }

  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }) {
  const hue = ((h % 1) + 1) % 1;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  if (saturation === 0) {
    const channel = Math.round(lightness * 255);
    return { r: channel, g: channel, b: channel };
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hueToChannel = (offset) => {
    let t = hue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return {
    r: Math.round(hueToChannel(1 / 3) * 255),
    g: Math.round(hueToChannel(0) * 255),
    b: Math.round(hueToChannel(-1 / 3) * 255)
  };
}
