// Source fragment: core/settings-and-persistence.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function sanitizeGravelPalette(palette) {
  const fallback = getDefaultGravelPalette();
  const candidate = Array.isArray(palette) ? palette.slice(0, 3).map((value) => normalizeHexColor(value)) : [];
  return Array.from({ length: 3 }, (_, index) => candidate[index] || fallback[index]);
}

function getActiveGravelPalette() {
  return sanitizeGravelPalette(state?.gravelPalette);
}

function getActiveGravelEffectPalette(now = Date.now()) {
  return hasReadyCustomGravelLayers()
    ? getResolvedCustomGravelLayerColors(now)
    : getActiveGravelPalette();
}

function sanitizeCustomGravelLayerColors(colors) {
  const fallback = getDefaultCustomGravelLayerColors();
  const candidate = Array.isArray(colors)
    ? colors.slice(0, CUSTOM_GRAVEL_LAYER_COUNT).map((value) => normalizeHexColor(value))
    : [];
  return Array.from({ length: CUSTOM_GRAVEL_LAYER_COUNT }, (_, index) => candidate[index] || fallback[index]);
}

function getActiveCustomGravelLayerColors() {
  return sanitizeCustomGravelLayerColors(state?.customGravelLayerColors);
}

function sanitizeCustomGravelLayerColorizeSettings(settings) {
  const fallback = getDefaultCustomGravelLayerColorizeSettings();
  const candidate = Array.isArray(settings)
    ? settings.slice(0, CUSTOM_GRAVEL_LAYER_COUNT).map((value) => normalizeDecorColorizeSetting(value))
    : [];
  return Array.from(
    { length: CUSTOM_GRAVEL_LAYER_COUNT },
    (_, index) => (typeof candidate[index] === "boolean" ? candidate[index] : fallback[index])
  );
}

function getActiveCustomGravelLayerColorizeSettings() {
  return sanitizeCustomGravelLayerColorizeSettings(state?.customGravelLayerColorize);
}

function getResolvedCustomGravelLayerColors() {
  return getActiveCustomGravelLayerColors();
}

function getCustomGravelColorChoices() {
  return CUSTOM_GRAVEL_COLOR_OPTIONS.map((choice) => ({
    ...choice,
    color: normalizeHexColor(choice.color) || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR
  }));
}

function formatDecorScale(scale) {
  return `${Math.round(clamp(scale, DECOR_SCALE_MIN, DECOR_SCALE_MAX) * 100)}%`;
}

function formatFishScale(scale) {
  return `${Math.round(clamp(scale, FISH_SCALE_MIN, FISH_SCALE_MAX) * 100)}%`;
}

function setMarkupIfChanged(cacheKey, element, markup) {
  if (!element) {
    return;
  }

  if (runtime.renderedMarkup[cacheKey] === markup) {
    return;
  }

  const scrollTop = element.scrollTop;
  element.innerHTML = markup;
  runtime.renderedMarkup[cacheKey] = markup;
  if (element.scrollHeight > element.clientHeight) {
    element.scrollTop = scrollTop;
  }
}

function setTextIfChanged(element, text) {
  if (!element) {
    return;
  }

  const nextText = String(text ?? "");
  if (element.textContent !== nextText) {
    element.textContent = nextText;
  }
}

function shouldRebuildRenderSection(sectionKey, dataKey) {
  if (runtime.renderedDataKeys[sectionKey] === dataKey) {
    return false;
  }

  runtime.renderedDataKeys[sectionKey] = dataKey;
  return true;
}

function loadState() {
  const desktopState = getDesktopSaveCandidateState();
  if (desktopState) {
    return desktopState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function sanitizeContentSettings(rawSettings) {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const hasCombinedSetting = Object.prototype.hasOwnProperty.call(source, "violenceAndGoreEnabled");
  const hasLegacyViolenceSetting = Object.prototype.hasOwnProperty.call(source, "violenceEnabled");
  const hasLegacyGoreSetting = Object.prototype.hasOwnProperty.call(source, "goreEnabled");
  return {
    violenceAndGoreEnabled: hasCombinedSetting
      ? source.violenceAndGoreEnabled !== false
      : (hasLegacyViolenceSetting || hasLegacyGoreSetting)
        ? (source.violenceEnabled !== false && source.goreEnabled !== false)
        : DEFAULT_CONTENT_SETTINGS.violenceAndGoreEnabled !== false
  };
}

function normalizeToolbarPosition(value) {
  switch (String(value || "").trim()) {
    case "right-center":
    case "bottom-center":
    case "left-center":
      return String(value).trim();
    default:
      return getDefaultToolbarPosition();
  }
}

function normalizeDisplayPosition(value) {
  switch (String(value || "").trim()) {
    case "top-left":
    case "bottom-left":
    case "top-right":
    case "bottom-right":
      return String(value).trim();
    default:
      return DEFAULT_UI_SETTINGS.displayPosition;
  }
}

function normalizeUvLightRenderQuality(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UV_LIGHT_RENDER_QUALITY_OPTIONS.includes(normalized)
    ? normalized
    : DEFAULT_UV_LIGHT_RENDER_QUALITY;
}

function sanitizeUiSettings(rawSettings) {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  return {
    toolbarPosition: normalizeToolbarPosition(source.toolbarPosition),
    displayPosition: normalizeDisplayPosition(source.displayPosition),
    toolbarCollapsed: source.toolbarCollapsed === true,
    displayCollapsed: source.displayCollapsed === true,
    careTaskPaneOpen: source.careTaskPaneOpen === true,
    soundMuted: source.soundMuted === true,
    uiSoundsMuted: source.uiSoundsMuted === true,
    tankMouseInputLocked: isTankMouseLockFeatureEnabled() && source.tankMouseInputLocked === true,
    ambientBubblesEnabled: source.ambientBubblesEnabled !== false,
    waterParticlesEnabled: source.waterParticlesEnabled !== false,
    uvLightQuality: normalizeUvLightRenderQuality(source.uvLightQuality),
    halloweenMode: normalizeHalloweenMode(source.halloweenMode)
  };
}

function getUiSettings() {
  return sanitizeUiSettings(state?.uiSettings);
}

function areAmbientBubblesEnabled() {
  return getUiSettings().ambientBubblesEnabled;
}

function areWaterParticlesEnabled() {
  return getUiSettings().waterParticlesEnabled;
}

function getUvLightRenderQuality() {
  return getUiSettings().uvLightQuality;
}

function normalizeWallpaperEngineBooleanPropertyValue(propertyValue) {
  const value = propertyValue && typeof propertyValue === "object" && "value" in propertyValue
    ? propertyValue.value
    : propertyValue;
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "off", "no"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function normalizeWallpaperEngineFpsPropertyValue(propertyValue) {
  const value = propertyValue && typeof propertyValue === "object" && "value" in propertyValue
    ? propertyValue.value
    : propertyValue;
  const numericValue = typeof value === "string"
    ? Number(value)
    : value;
  return Number.isFinite(numericValue)
    ? Math.max(0, Math.round(Number(numericValue)))
    : null;
}

function normalizeWallpaperEnginePauseStateValue(value) {
  const normalizedBoolean = normalizeWallpaperEngineBooleanPropertyValue(value);
  if (normalizedBoolean !== null) {
    return normalizedBoolean;
  }

  return value === true;
}

function getWallpaperEngineBooleanProperty(properties, keys) {
  if (!properties || typeof properties !== "object") {
    return null;
  }

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      continue;
    }
    const normalized = normalizeWallpaperEngineBooleanPropertyValue(properties[key]);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function syncWallpaperEngineGeneralPropertiesToRuntime() {
  if (!runtimeInitialized) {
    return false;
  }

  const nextFps = Math.max(0, Math.round(Number(wallpaperEngineGeneralPropertyState.fps) || 0));
  if (runtime.wallpaperEngineFpsLimit === nextFps) {
    return false;
  }

  runtime.wallpaperEngineFpsLimit = nextFps;
  runtime.wallpaperEngineFpsCarrySeconds = 0;
  runtime.lastAnimationFrameAt = 0;
  runtime.lastAnimationUpdateAt = 0;
  return true;
}

function applyWallpaperEngineGeneralProperties(properties) {
  if (!properties || typeof properties !== "object" || !Object.prototype.hasOwnProperty.call(properties, "fps")) {
    return false;
  }

  const fps = normalizeWallpaperEngineFpsPropertyValue(properties.fps);
  if (fps === null) {
    return false;
  }

  wallpaperEngineGeneralPropertyState.fps = fps;
  return syncWallpaperEngineGeneralPropertiesToRuntime();
}

function syncWallpaperEnginePauseStateToRuntime() {
  if (!runtimeInitialized) {
    return false;
  }

  const nextPaused = wallpaperEnginePlaybackState.paused === true;
  if (runtime.wallpaperEnginePaused === nextPaused) {
    return false;
  }

  runtime.wallpaperEnginePaused = nextPaused;
  runtime.wallpaperEngineFpsCarrySeconds = 0;
  runtime.lastAnimationFrameAt = 0;
  runtime.lastAnimationUpdateAt = 0;
  if (isWallpaperEnginePauseActive()) {
    stopAmbienceAudioFade();
    stopActiveSoundEffects();
  }
  syncAmbienceAudio();
  return true;
}

function applyWallpaperEnginePauseState(isPaused) {
  const nextPaused = normalizeWallpaperEnginePauseStateValue(isPaused);
  if (wallpaperEnginePlaybackState.paused === nextPaused) {
    return false;
  }

  wallpaperEnginePlaybackState.paused = nextPaused;
  return syncWallpaperEnginePauseStateToRuntime();
}

function isWallpaperEnginePauseActive() {
  if (!runtime.wallpaperEnginePaused) {
    return false;
  }

  if (typeof document === "undefined") {
    return runtime.wallpaperEnginePaused;
  }

  return document.visibilityState === "hidden";
}

function applyPendingWallpaperEngineUserProperties(options = {}) {
  if (typeof wallpaperEngineUserPropertyState.soundMuted !== "boolean") {
    return false;
  }

  return setSoundMuted(wallpaperEngineUserPropertyState.soundMuted, {
    save: options.save !== false,
    render: options.render !== false,
    showToast: options.showToast !== false
  });
}

function applyWallpaperEngineUserProperties(properties) {
  const soundMuted = getWallpaperEngineBooleanProperty(properties, WALLPAPER_ENGINE_SOUND_MUTE_PROPERTY_KEYS);
  if (soundMuted === null) {
    return false;
  }

  wallpaperEngineUserPropertyState.soundMuted = soundMuted;
  if (!state) {
    return true;
  }

  return applyPendingWallpaperEngineUserProperties({
    save: true,
    render: true,
    showToast: false
  });
}

function isTankMouseInputLocked() {
  return isTankMouseLockFeatureEnabled() && getUiSettings().tankMouseInputLocked === true;
}

function isWallpaperEngineInputAssistEnabled() {
  return isWallpaperEngineModeEnabled();
}

function getWallpaperKeyboardNameInput(target) {
  const element = target instanceof Element ? target : null;
  const input = element?.closest?.("[data-wallpaper-keyboard-input]");
  return input instanceof HTMLInputElement ? input : null;
}

function getContentSettings() {
  return sanitizeContentSettings(state?.contentSettings);
}

function isViolenceAndGoreEnabled() {
  return getContentSettings().violenceAndGoreEnabled;
}

function isViolenceEnabled() {
  return isViolenceAndGoreEnabled();
}

function isGoreEnabled() {
  return isViolenceAndGoreEnabled();
}

function isZombieSkeletonModeAvailable() {
  return ZOMBIE_SKELETON_BEHAVIOR_ENABLED;
}

function isZombieModeEnabled() {
  return isZombieSkeletonModeAvailable() && isViolenceAndGoreEnabled();
}

function getAssetFileName(value = "") {
  return String(value || "")
    .replace(/\?.*$/, "")
    .split(/[\\/]/)
    .pop()
    .trim()
    .toLowerCase();
}

function isZombieSkeletonAssetPath(value = "") {
  const normalizedPath = String(value || "").replaceAll("\\", "/").replace(/\?.*$/, "").toLowerCase();
  const fileName = getAssetFileName(normalizedPath);
  return normalizedPath.includes("/zombie_skeleton_fish/")
    || /_(zombie|skeleton)\.[^.]+$/i.test(fileName);
}

function isGoreOnlyAssetPath(value = "") {
  const fileName = getAssetFileName(value);
  return FILTERED_GORE_DECOR_KEYS.has(fileName)
    || fileName === "zombie-virus-antidote-drops.png";
}

function shouldPreloadAssetForCurrentContentSettings(path) {
  if (!path) {
    return false;
  }
  if (isZombieSkeletonAssetPath(path)) {
    // Halloween only borrows the seasonal artwork; it never enables the
    // separate undead gameplay system.  Seasonal images therefore need to be
    // available even when that gameplay feature remains disabled.
    return isHalloweenModeActive() || isZombieSkeletonModeAvailable();
  }
  if (getAssetFileName(path) === "zombie-virus-antidote-drops.png") {
    return isZombieSkeletonModeAvailable() && isViolenceAndGoreEnabled();
  }
  if (isGoreOnlyAssetPath(path)) {
    return isViolenceAndGoreEnabled();
  }
  return true;
}

function filterPreloadPathsForCurrentContentSettings(paths) {
  return (Array.isArray(paths) ? paths : []).filter(shouldPreloadAssetForCurrentContentSettings);
}

function isContentGatedAssetPath(path) {
  return isZombieSkeletonAssetPath(path) || isGoreOnlyAssetPath(path);
}

function getContentGatedPreloadPaths() {
  const paths = [
    ...runtime.decorCatalog.flatMap((item) => [
      item.path,
      item.thumbnailPath,
      item.bgPath,
      item.midPath,
      item.maskPath,
      item.triggerPath,
      item.seatsPath,
      ...(Array.isArray(item.caveColorLayers)
        ? item.caveColorLayers.flatMap((layer) => [
          ...(Array.isArray(layer.paths) ? layer.paths : [layer.path]),
          ...(Array.isArray(layer.legacyPaths) ? layer.legacyPaths : [])
        ])
        : [])
    ].filter(Boolean)),
    ...(isZombieSkeletonModeAvailable()
      ? runtime.fishCatalog.flatMap((fish) => [
        ...getFishDeathAssetCandidates(fish, "zombie"),
        ...getFishDeathAssetCandidates(fish, "skeleton")
      ])
      : []),
    getMedicineCatalogEntries().antidote?.image
      ? resolveFoodAndMedAssetPath(getMedicineCatalogEntries().antidote.image)
      : ""
  ];

  return filterPreloadPathsForCurrentContentSettings(paths.filter(isContentGatedAssetPath));
}

async function preloadContentGatedAssetsForCurrentSettings() {
  if (!state || !isViolenceAndGoreEnabled()) {
    return;
  }
  await preloadImages(getContentGatedPreloadPaths());
}

function shouldPersistReconciledState(rawState) {
  const incoming = rawState && typeof rawState === "object" ? rawState : {};
  const incomingVersion = Number.isFinite(incoming.version) ? incoming.version : 0;
  const incomingHealthModelVersion = Number.isFinite(incoming.healthModelVersion) ? incoming.healthModelVersion : 1;
  return incomingVersion !== STATE_VERSION || incomingHealthModelVersion < HEALTH_MODEL_VERSION;
}

function tankSupportsFilters(target = getCurrentTank()) {
  return ENABLE_FILTER && getTankTypeMeta(target?.tankTypeId)?.supportsFilters !== false;
}

function getTankDefaultFilterSelection(target = getCurrentTank()) {
  return tankSupportsFilters(target) ? getDefaultFilterKey() : null;
}

function getSpeciesWaterType(speciesOrFish) {
  const species = speciesOrFish?.speciesId ? getSpeciesForFish(speciesOrFish) : speciesOrFish;
  if (!species) {
    return "freshwater";
  }

  if (species.waterType) {
    return normalizeWaterType(species.waterType);
  }

  return inferWaterTypeFromTheme(species.theme, "freshwater");
}

function canDecorLiveInCurrentTank(decorOrKey, tank = getCurrentTank()) {
  return true;
}

function buildDefaultDailyBonusState() {
  return {
    available: false,
    summary: null,
    lastQualifiedDayKey: null,
    lastClaimedDayKey: null,
    lastEvaluatedDayKey: null,
    summariesByTankId: {},
    lastEvaluatedByTankId: {},
    claimedByTankDay: {},
    recapHistory: [],
    milestones: {}
  };
}

function sanitizeDailyBonusState(rawState) {
  const source = rawState && typeof rawState === "object" ? rawState : {};
  const sanitizeSummary = (summary) => summary && typeof summary === "object"
    ? {
      ...summary,
      dayKey: typeof summary.dayKey === "string" ? summary.dayKey : "",
      tankId: typeof summary.tankId === "string" ? summary.tankId : "",
      scoreModel: typeof summary.scoreModel === "string" ? summary.scoreModel : "",
      rawScore: Math.round(Number(summary.rawScore ?? summary.score) || 0),
      score: Math.round(Number(summary.score) || 0),
      reward: clamp(Math.floor(Number(summary.reward) || 0), 0, DAILY_RECAP_REWARD_CAP),
      narrative: typeof summary.narrative === "string" ? summary.narrative.slice(0, 600) : "",
      rows: Array.isArray(summary.rows) ? summary.rows.map((row) => ({
        text: typeof row?.text === "string" ? row.text : "",
        score: clamp(Math.round(Number(row?.score) || 0), -1, 1),
        type: typeof row?.type === "string" ? row.type : "event",
        time: Number.isFinite(Number(row?.time)) ? Number(row.time) : 0
      })).filter((row) => row.text) : []
    }
    : null;
  const combineSummariesForDay = (summaries, dayKey) => {
    const unique = [];
    const seen = new Set();
    for (const summary of summaries.filter((entry) => entry?.dayKey === dayKey)) {
      const key = `${summary.tankId || ""}:${summary.dayKey}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(summary);
    }
    const existingBorough = unique.find((summary) => summary.scope === BOROUGH_DAILY_RECAP_ID || summary.tankId === BOROUGH_DAILY_RECAP_ID);
    if (existingBorough) {
      const rawScore = existingBorough.scoreModel === BOROUGH_RECAP_SCORE_MODEL
        ? Number(existingBorough.rawScore) || 0
        : (existingBorough.rows || []).reduce((total, row) => total + (Number(row.score) || 0), 0);
      const score = existingBorough.scoreModel === BOROUGH_RECAP_SCORE_MODEL
        ? Number(existingBorough.score) || 0
        : normalizeBoroughRecapScore(rawScore, existingBorough.fishCount, existingBorough.tankCount);
      return {
        ...existingBorough,
        scope: BOROUGH_DAILY_RECAP_ID,
        tankId: BOROUGH_DAILY_RECAP_ID,
        tankName: "Bubble Borough",
        scoreModel: BOROUGH_RECAP_SCORE_MODEL,
        rawScore,
        score,
        reward: clamp(Math.max(0, score), 0, DAILY_RECAP_REWARD_CAP),
        overall: score >= 8 ? "Great day!" : score >= 5 ? "Good day!" : score >= 1 ? "Pretty good day!" : score === 0 ? "Quiet day." : "Rough day."
      };
    }
    const fishCount = unique.reduce((total, summary) => total + (Number(summary.fishCount) || 0), 0);
    const rows = unique.flatMap((summary) => (summary.rows || []).map((row) => ({
      ...row,
      text: `${summary.tankName || "Tank"}: ${row.text}`
    })));
    const rawScore = rows.reduce((total, row) => total + (Number(row.score) || 0), 0);
    const score = normalizeBoroughRecapScore(rawScore, fishCount, unique.length);
    return {
      scope: BOROUGH_DAILY_RECAP_ID,
      tankId: BOROUGH_DAILY_RECAP_ID,
      tankName: "Bubble Borough",
      tankCount: unique.length,
      dayKey,
      generatedAt: Math.max(...unique.map((summary) => Number(summary.generatedAt) || 0), 0),
      rows,
      scoreModel: BOROUGH_RECAP_SCORE_MODEL,
      rawScore,
      score,
      reward: clamp(Math.max(0, score), 0, DAILY_RECAP_REWARD_CAP),
      mealsFed: unique.reduce((total, summary) => total + (Number(summary.mealsFed) || 0), 0),
      averageComfort: fishCount
        ? Math.round(unique.reduce((total, summary) => total + ((Number(summary.averageComfort) || 0) * (Number(summary.fishCount) || 0)), 0) / fishCount)
        : 0,
      cleanPercent: unique.length
        ? Math.round(unique.reduce((total, summary) => total + (Number(summary.cleanPercent) || 0), 0) / unique.length)
        : 0,
      allMealsSatisfied: fishCount > 0 && unique.filter((summary) => Number(summary.fishCount) > 0).every((summary) => summary.allMealsSatisfied === true),
      hasNegativeEvents: rows.some((row) => Number(row.score) < 0),
      hasAttackOrDeath: unique.some((summary) => summary.hasAttackOrDeath === true),
      hasGlassTapStress: unique.some((summary) => summary.hasGlassTapStress === true),
      hasSparklingComfort: unique.some((summary) => summary.hasSparklingComfort === true),
      fishCount,
      decorCount: unique.reduce((total, summary) => total + (Number(summary.decorCount) || 0), 0),
      narrative: "A single daily recap covering every tank in Bubble Borough.",
      overall: score >= 8 ? "Great day!" : score >= 5 ? "Good day!" : score >= 1 ? "Pretty good day!" : score === 0 ? "Quiet day." : "Rough day."
    };
  };
  const summariesByTankId = {};
  const rawSummaries = source.summariesByTankId && typeof source.summariesByTankId === "object" ? source.summariesByTankId : {};
  for (const [tankId, summary] of Object.entries(rawSummaries)) {
    const sanitizedSummary = sanitizeSummary(summary);
    if (sanitizedSummary) {
      summariesByTankId[String(tankId)] = sanitizedSummary;
    }
  }
  const lastEvaluatedByTankId = source.lastEvaluatedByTankId && typeof source.lastEvaluatedByTankId === "object"
    ? Object.fromEntries(Object.entries(source.lastEvaluatedByTankId).map(([key, value]) => [String(key), String(value || "")]).filter(([, value]) => value))
    : {};
  const claimedByTankDay = source.claimedByTankDay && typeof source.claimedByTankDay === "object"
    ? Object.fromEntries(Object.entries(source.claimedByTankDay).map(([key, value]) => [String(key), Boolean(value)]))
    : {};
  const rawHistory = Array.isArray(source.recapHistory)
    ? source.recapHistory.map(sanitizeSummary).filter(Boolean)
    : [];
  const recapHistory = [...new Set(rawHistory.map((summary) => summary.dayKey).filter(Boolean))]
    .map((dayKey) => combineSummariesForDay(rawHistory, dayKey))
    .filter(Boolean)
    .sort((left, right) => (Number(right.generatedAt) || 0) - (Number(left.generatedAt) || 0))
    .slice(0, DAILY_RECAP_HISTORY_LIMIT);
  const milestones = source.milestones && typeof source.milestones === "object"
    ? Object.fromEntries(Object.entries(source.milestones).map(([key, value]) => [String(key), Boolean(value)]))
    : {};
  const legacySummary = sanitizeSummary(source.summary);
  const pendingCandidates = [...Object.values(summariesByTankId), legacySummary].filter(Boolean);
  const latestPendingDayKey = pendingCandidates.map((summary) => summary.dayKey).filter(Boolean).sort().at(-1) || "";
  const boroughSummary = latestPendingDayKey ? combineSummariesForDay(pendingCandidates, latestPendingDayKey) : null;
  const boroughSummaries = boroughSummary ? { [BOROUGH_DAILY_RECAP_ID]: boroughSummary } : {};
  return {
    available: Boolean(boroughSummary && !claimedByTankDay[`${BOROUGH_DAILY_RECAP_ID}:${boroughSummary.dayKey}`]),
    summary: boroughSummary,
    lastQualifiedDayKey: typeof source.lastQualifiedDayKey === "string" ? source.lastQualifiedDayKey : null,
    lastClaimedDayKey: typeof source.lastClaimedDayKey === "string" ? source.lastClaimedDayKey : null,
    lastEvaluatedDayKey: typeof source.lastEvaluatedDayKey === "string" ? source.lastEvaluatedDayKey : null,
    summariesByTankId: boroughSummaries,
    lastEvaluatedByTankId,
    claimedByTankDay,
    recapHistory,
    milestones
  };
}

function sanitizeOwnedFilterInventory(rawInventory, fallbackSelectedKey = null) {
  const counts = {};
  const sourceObject = rawInventory && typeof rawInventory === "object" && !Array.isArray(rawInventory) ? rawInventory : null;
  const sourceArray = Array.isArray(rawInventory) ? rawInventory : Array.isArray(rawInventory?.filters) ? rawInventory.filters : null;

  if (sourceObject) {
    for (const [key, value] of Object.entries(sourceObject)) {
      if (!runtime.filterMap.has(key) || key === getDefaultFilterKey()) {
        continue;
      }
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (count > 0) {
        counts[key] = count;
      }
    }
  }

  if (sourceArray) {
    for (const key of sourceArray) {
      if (!runtime.filterMap.has(key) || key === getDefaultFilterKey()) {
        continue;
      }
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  if (runtime.filterMap.has(fallbackSelectedKey) && fallbackSelectedKey !== getDefaultFilterKey()) {
    counts[fallbackSelectedKey] = Math.max(1, counts[fallbackSelectedKey] || 0);
  }

  return counts;
}

function sanitizeOwnedBackgroundInventory(rawInventory, fallbackSelectedKeys = []) {
  const counts = {};
  const sourceObject = rawInventory && typeof rawInventory === "object" && !Array.isArray(rawInventory) ? rawInventory : null;
  const sourceArray = Array.isArray(rawInventory)
    ? rawInventory
    : Array.isArray(rawInventory?.backgrounds)
      ? rawInventory.backgrounds
      : null;

  if (sourceObject) {
    for (const [key, value] of Object.entries(sourceObject)) {
      if (!runtime.backgroundMap.has(key)) {
        continue;
      }
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (count > 0) {
        counts[key] = 1;
      }
    }
  }

  if (sourceArray) {
    for (const key of sourceArray) {
      if (!runtime.backgroundMap.has(key)) {
        continue;
      }
      counts[key] = 1;
    }
  }

  for (const key of DEFAULT_OWNED_BACKGROUND_KEYS) {
    if (runtime.backgroundMap.has(key)) {
      counts[key] = 1;
    }
  }

  for (const key of fallbackSelectedKeys) {
    if (runtime.backgroundMap.has(key)) {
      counts[key] = 1;
    }
  }

  return counts;
}

function sanitizeTankStateSnapshot(rawTank, options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const legacyHealthModel = Boolean(options.legacyHealthModel);
  const sanitizeFishEntry = (fish) => sanitizeFish(fish, { legacyHealthModel });
  const incomingTank = rawTank && typeof rawTank === "object" ? rawTank : {};
  const typeId = getTankTypeMeta("rectangular").id;
  const selectedFilterAsset = tankSupportsFilters({ tankTypeId: typeId }) && runtime.filterMap.has(incomingTank.selectedFilterAsset)
    ? incomingTank.selectedFilterAsset
    : getTankDefaultFilterSelection({ tankTypeId: typeId });
  const localBackgroundImageDataUrl = typeof incomingTank.localBackgroundImageDataUrl === "string"
    ? incomingTank.localBackgroundImageDataUrl
    : "";
  const localBackgroundImageRefId = sanitizeCustomImageRefId(incomingTank.localBackgroundImageRefId);
  const requestedBackgroundKey = runtime.backgroundMap.has(incomingTank.selectedBackground)
    ? incomingTank.selectedBackground
    : getCatalogDefaultKey(runtime.backgroundCatalog, DEFAULT_BACKGROUND_ASSET_KEY);
  const selectedBackground = isLocalImageBackgroundKey(requestedBackgroundKey) && !localBackgroundImageDataUrl && !localBackgroundImageRefId
    ? getCatalogDefaultKey(runtime.backgroundCatalog, DEFAULT_BACKGROUND_ASSET_KEY)
    : requestedBackgroundKey;

  return createTankState({
    id: incomingTank.id || createId("tank"),
    now,
    name: incomingTank.name,
    gridX: incomingTank.gridX,
    gridY: incomingTank.gridY,
    tankTypeId: typeId,
    waterType: "freshwater",
    setupPending: false,
    fish: Array.isArray(incomingTank.fish) ? incomingTank.fish.map(sanitizeFishEntry).filter(Boolean) : [],
    feedHistory: sanitizeHistory(incomingTank.feedHistory),
    pendingPoops: Array.isArray(incomingTank.pendingPoops) ? incomingTank.pendingPoops.map(sanitizePoop).filter(Boolean) : [],
    poops: Array.isArray(incomingTank.poops) ? incomingTank.poops.map(sanitizePoop).filter(Boolean) : [],
    fishEggs: Array.isArray(incomingTank.fishEggs) ? incomingTank.fishEggs.map(sanitizeFishEgg).filter(Boolean) : [],
    placedDecor: Array.isArray(incomingTank.placedDecor) ? incomingTank.placedDecor.map(sanitizePlacedDecor).filter(Boolean) : [],
    freeDecorPlacement: incomingTank.freeDecorPlacement === true,
    customGravelEnabled: true,
    customGravelLayerColors: sanitizeCustomGravelLayerColors(incomingTank.customGravelLayerColors),
    customGravelLayerColorize: sanitizeCustomGravelLayerColorizeSettings(incomingTank.customGravelLayerColorize),
    gravelPalette: sanitizeGravelPalette(incomingTank.gravelPalette),
    gravelSeed: Number.isFinite(incomingTank.gravelSeed) ? Math.abs(Math.floor(incomingTank.gravelSeed)) : undefined,
    floatingPellets: Array.isArray(incomingTank.floatingPellets) ? incomingTank.floatingPellets.map(sanitizePellet).filter(Boolean) : [],
    selectedBackground,
    customBackgroundMode: normalizeCustomBackgroundMode(incomingTank.customBackgroundMode),
    solidBackgroundColor: normalizeHexColor(incomingTank.solidBackgroundColor) || DEFAULT_SOLID_BACKGROUND_COLOR,
    gradientBackgroundStartColor: normalizeHexColor(incomingTank.gradientBackgroundStartColor) || DEFAULT_GRADIENT_BACKGROUND_START_COLOR,
    gradientBackgroundEndColor: normalizeHexColor(incomingTank.gradientBackgroundEndColor) || DEFAULT_GRADIENT_BACKGROUND_END_COLOR,
    animatedBackgroundSurfaceBloomColor: incomingTank.animatedBackgroundSurfaceBloomColor,
    animatedBackgroundShadowBloomColor: incomingTank.animatedBackgroundShadowBloomColor,
    animatedBackgroundTopColor: incomingTank.animatedBackgroundTopColor,
    animatedBackgroundMidColor: incomingTank.animatedBackgroundMidColor,
    animatedBackgroundBottomColor: incomingTank.animatedBackgroundBottomColor,
    animatedBackgroundAbyssColor: incomingTank.animatedBackgroundAbyssColor,
    animatedBackgroundHighlightColor: incomingTank.animatedBackgroundHighlightColor,
    animatedBackgroundDriftColorA: incomingTank.animatedBackgroundDriftColorA,
    animatedBackgroundDriftColorB: incomingTank.animatedBackgroundDriftColorB,
    animatedBackgroundDriftColorC: incomingTank.animatedBackgroundDriftColorC,
    localBackgroundImageDataUrl,
    localBackgroundImageRefId,
    selectedTankAsset: runtime.tankMap.has(incomingTank.selectedTankAsset) ? incomingTank.selectedTankAsset : null,
    selectedFilterAsset,
    autoDispenser: createDefaultAutoDispenserState(incomingTank.autoDispenser),
    uvLightInstalled: false,
    uvLightEnabled: false,
    lightsOutOverride: normalizeLightsOutOverride(incomingTank.lightsOutOverride),
    selectedBubbleAsset: runtime.bubbleMap.has(incomingTank.selectedBubbleAsset)
      ? incomingTank.selectedBubbleAsset
      : (runtime.bubbleCatalog[0]?.key || null),
    lastCleanedAt: Number.isFinite(incomingTank.lastCleanedAt) ? incomingTank.lastCleanedAt : now,
    lastSimulatedAt: Number.isFinite(incomingTank.lastSimulatedAt) ? incomingTank.lastSimulatedAt : now,
    events: Array.isArray(incomingTank.events)
      ? incomingTank.events.map(sanitizeEvent).filter(Boolean).slice(0, MAX_TANK_EVENT_HISTORY)
      : [],
    lastCorpseSicknessAt: Number.isFinite(Number(incomingTank.lastCorpseSicknessAt)) ? Number(incomingTank.lastCorpseSicknessAt) : null,
    lastGravelCoinFoundAt: Number.isFinite(Number(incomingTank.lastGravelCoinFoundAt)) ? Number(incomingTank.lastGravelCoinFoundAt) : 0,
    foodBuffs: incomingTank.foodBuffs,
    medicineEffects: Array.isArray(incomingTank.medicineEffects) ? incomingTank.medicineEffects : [],
    medicineClouds: Array.isArray(incomingTank.medicineClouds) ? incomingTank.medicineClouds : [],
    medicineWaterTint: incomingTank.medicineWaterTint && typeof incomingTank.medicineWaterTint === "object"
      ? incomingTank.medicineWaterTint
      : null
  });
}

function buildLegacyTankFromIncoming(incoming, options = {}) {
  return sanitizeTankStateSnapshot({
    id: createId("tank"),
    name: incoming?.name,
    tankTypeId: "rectangular",
    waterType: "freshwater",
    setupPending: false,
    fish: incoming?.fish,
    feedHistory: incoming?.feedHistory,
    pendingPoops: incoming?.pendingPoops,
    poops: incoming?.poops,
    fishEggs: incoming?.fishEggs,
    placedDecor: incoming?.placedDecor,
    customGravelEnabled: true,
    customGravelLayerColors: incoming?.customGravelLayerColors,
    customGravelLayerColorize: incoming?.customGravelLayerColorize,
    gravelPalette: incoming?.gravelPalette,
    gravelSeed: incoming?.gravelSeed,
    floatingPellets: incoming?.floatingPellets,
    selectedBackground: incoming?.selectedBackground,
    customBackgroundMode: incoming?.customBackgroundMode,
    solidBackgroundColor: incoming?.solidBackgroundColor,
    gradientBackgroundStartColor: incoming?.gradientBackgroundStartColor,
    gradientBackgroundEndColor: incoming?.gradientBackgroundEndColor,
    animatedBackgroundSurfaceBloomColor: incoming?.animatedBackgroundSurfaceBloomColor,
    animatedBackgroundShadowBloomColor: incoming?.animatedBackgroundShadowBloomColor,
    animatedBackgroundTopColor: incoming?.animatedBackgroundTopColor,
    animatedBackgroundMidColor: incoming?.animatedBackgroundMidColor,
    animatedBackgroundBottomColor: incoming?.animatedBackgroundBottomColor,
    animatedBackgroundAbyssColor: incoming?.animatedBackgroundAbyssColor,
    animatedBackgroundHighlightColor: incoming?.animatedBackgroundHighlightColor,
    animatedBackgroundDriftColorA: incoming?.animatedBackgroundDriftColorA,
    animatedBackgroundDriftColorB: incoming?.animatedBackgroundDriftColorB,
    animatedBackgroundDriftColorC: incoming?.animatedBackgroundDriftColorC,
    localBackgroundImageDataUrl: incoming?.localBackgroundImageDataUrl,
    localBackgroundImageRefId: incoming?.localBackgroundImageRefId,
    selectedTankAsset: incoming?.selectedTankAsset,
    selectedFilterAsset: incoming?.selectedFilterAsset ?? getTankDefaultFilterSelection({ tankTypeId: incoming?.tankTypeId }),
    autoDispenser: incoming?.autoDispenser,
    uvLightInstalled: incoming?.uvLightInstalled,
    uvLightEnabled: incoming?.uvLightEnabled,
    selectedBubbleAsset: incoming?.selectedBubbleAsset,
    lastCleanedAt: incoming?.lastCleanedAt,
    lastSimulatedAt: incoming?.lastSimulatedAt,
    lastCorpseSicknessAt: incoming?.lastCorpseSicknessAt,
    lastGravelCoinFoundAt: incoming?.lastGravelCoinFoundAt,
    events: incoming?.events
  }, options);
}

function normalizeTankFilterAssignments(targetState) {
  const available = { ...(targetState?.ownedFilterInventory || {}) };

  for (const tank of getAllTanks(targetState)) {
    if (!tankSupportsFilters(tank)) {
      tank.selectedFilterAsset = null;
      continue;
    }

    const filterKey = tank.selectedFilterAsset;
    if (!filterKey || filterKey === getDefaultFilterKey()) {
      tank.selectedFilterAsset = getTankDefaultFilterSelection(tank);
      continue;
    }

    if (!runtime.filterMap.has(filterKey)) {
      tank.selectedFilterAsset = getTankDefaultFilterSelection(tank);
      continue;
    }

    const remaining = Math.max(0, Math.floor(Number(available[filterKey]) || 0));
    if (remaining <= 0) {
      tank.selectedFilterAsset = getTankDefaultFilterSelection(tank);
      continue;
    }

    available[filterKey] = remaining - 1;
  }
}

function matchesLegacyDefaultStarterTankAppearance(tank, index, defaultFilterKey = getDefaultFilterKey()) {
  if (!tank) {
    return false;
  }

  const defaultBackgroundKey = getCatalogDefaultKey(runtime.backgroundCatalog, DEFAULT_TANK_BACKGROUND_ASSET_KEY);
  const layerColors = sanitizeCustomGravelLayerColors(tank.customGravelLayerColors);
  const matchesLegacyColors = layerColors.length === LEGACY_DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS.length
    && layerColors.every((color, layerIndex) => color === LEGACY_DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS[layerIndex]);
  const matchesCurrentDefaultColors = layerColors.length === DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS.length
    && layerColors.every((color, layerIndex) => color === DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS[layerIndex]);
  return sanitizeTankName(tank.name, buildDefaultTankName(index)) === buildDefaultTankName(index)
    && Array.isArray(tank.fish) && tank.fish.length === 0
    && Array.isArray(tank.placedDecor) && tank.placedDecor.length === 0
    && Array.isArray(tank.pendingPoops) && tank.pendingPoops.length === 0
    && Array.isArray(tank.poops) && tank.poops.length === 0
    && Array.isArray(tank.fishEggs) && tank.fishEggs.length === 0
    && Array.isArray(tank.floatingPellets) && tank.floatingPellets.length === 0
    && Object.keys(tank.feedHistory || {}).length === 0
    && !tank.selectedTankAsset
    && tank.selectedFilterAsset === defaultFilterKey
    && !tank.uvLightInstalled
    && tank.selectedBackground === defaultBackgroundKey
    && normalizeCustomBackgroundMode(tank.customBackgroundMode) === CUSTOM_BACKGROUND_MODE_SOLID
    && (matchesLegacyColors || matchesCurrentDefaultColors);
}

function applyDefaultStarterTankAppearance(tank) {
  if (!tank) {
    return false;
  }

  const nextBackgroundKey = getCatalogDefaultKey(runtime.backgroundCatalog, DEFAULT_TANK_BACKGROUND_ASSET_KEY);
  const nextLayerColors = getDefaultCustomGravelLayerColors();
  const nextLayerColorize = getDefaultCustomGravelLayerColorizeSettings();
  const changed = tank.selectedBackground !== nextBackgroundKey
    || normalizeCustomBackgroundMode(tank.customBackgroundMode) !== DEFAULT_TANK_CUSTOM_BACKGROUND_MODE
    || tank.customGravelEnabled !== true
    || tank.customGravelLayerColors.length !== nextLayerColors.length
    || nextLayerColors.some((color, index) => tank.customGravelLayerColors[index] !== color)
    || tank.customGravelLayerColorize.length !== nextLayerColorize.length
    || nextLayerColorize.some((enabled, index) => tank.customGravelLayerColorize[index] !== enabled);
  if (!changed) {
    return false;
  }

  tank.selectedBackground = nextBackgroundKey;
  tank.customBackgroundMode = DEFAULT_TANK_CUSTOM_BACKGROUND_MODE;
  tank.customGravelEnabled = true;
  tank.customGravelLayerColors = nextLayerColors;
  tank.customGravelLayerColorize = nextLayerColorize;
  return true;
}

function mergeUniversalMealHistories(...histories) {
  const merged = {};
  for (const history of histories) {
    for (const [slotKey, entry] of Object.entries(sanitizeHistory(history))) {
      const existing = merged[slotKey] || { fedAt: 0, offeredAt: 0, coinsEarned: 0, fishIds: [], offeredFishIds: [] };
      merged[slotKey] = {
        fedAt: Math.max(existing.fedAt, entry.fedAt),
        offeredAt: Math.max(existing.offeredAt, entry.offeredAt),
        coinsEarned: Math.min(FISH_DAILY_FEEDING_CARE_COIN_CAP, existing.coinsEarned + entry.coinsEarned),
        fishIds: [...new Set([...existing.fishIds, ...entry.fishIds])],
        offeredFishIds: [...new Set([...existing.offeredFishIds, ...entry.offeredFishIds])]
      };
    }
  }
  return merged;
}

function sanitizeBoroughEventHistory(rawEvents, fallbackTanks = []) {
  const source = Array.isArray(rawEvents) && rawEvents.length
    ? rawEvents
    : fallbackTanks.flatMap((tank) => (tank.events || []).map((event) => ({ ...event, tankId: tank.id, tankName: getTankLabel(tank) })));
  return source.map((entry) => {
    const event = sanitizeEvent(entry);
    return event ? {
      ...event,
      tankId: typeof entry.tankId === "string" ? entry.tankId : "",
      tankName: typeof entry.tankName === "string" ? entry.tankName.slice(0, 80) : ""
    } : null;
  }).filter(Boolean).sort((left, right) => Number(right.time) - Number(left.time)).slice(0, MAX_BOROUGH_EVENT_HISTORY);
}

function reconcileState(rawState) {
  const now = Date.now();
  const base = {
    version: STATE_VERSION,
    healthModelVersion: HEALTH_MODEL_VERSION,
    coins: STARTING_COINS,
    lifetimeDeaths: 0,
    mealHistory: {},
    lastGravelCoinFoundAt: 0,
    unlockedFishSpecies: [],
    unlockedDecorKeys: [],
    storedFish: [],
    decorInventory: {},
    customDecorAssets: {},
    customFishAssets: {},
    decorScaleDefaults: {},
    fishScaleDefaults: {},
    tanks: [createTankState({ now, name: buildDefaultTankName(0) })],
    activeTankId: null,
    ownedBackgroundInventory: sanitizeOwnedBackgroundInventory(null),
    ownedFilterInventory: {},
    uvLightOwned: false,
    foodInventory: getDefaultFoodInventory(),
    medicineInventory: getDefaultMedicineInventory(),
    dailyBonus: buildDefaultDailyBonusState(),
    notificationCenter: buildDefaultNotificationCenterState(),
    tutorial: buildDefaultTutorialState(),
    uiSettings: sanitizeUiSettings(null),
    contentSettings: sanitizeContentSettings(null),
    boroughTravelWalls: {},
    boroughHappenings: [],
    boroughEvents: [],
    memorialHistory: [],
    events: []
  };

  const incoming = rawState && typeof rawState === "object" ? rawState : {};
  const incomingVersion = Number.isFinite(incoming.version) ? incoming.version : 0;
  const incomingHealthModelVersion = Number.isFinite(incoming.healthModelVersion) ? incoming.healthModelVersion : 1;
  const legacyHealthModel = incomingHealthModelVersion < LEGACY_HEALTH_SCALE_MODEL_VERSION;
  const incomingCustomDecorAssets = sanitizeCustomDecorAssets(incoming.customDecorAssets);
  syncRuntimeCustomDecorAssetsFromState({ customDecorAssets: incomingCustomDecorAssets });
  const incomingCustomFishAssets = sanitizeCustomFishAssets(incoming.customFishAssets);
  syncRuntimeCustomFishAssetsFromState({ customFishAssets: incomingCustomFishAssets });
  const sanitizeFishEntry = (fish) => sanitizeFish(fish, { legacyHealthModel });
  const incomingHasTanks = Array.isArray(incoming.tanks) && incoming.tanks.length > 0;
  const tanks = incomingHasTanks
    ? incoming.tanks.map((tank) => sanitizeTankStateSnapshot(tank, { now, legacyHealthModel })).filter(Boolean)
    : [buildLegacyTankFromIncoming(incoming, { now, legacyHealthModel })];
  normalizeAquariumSectionGrid(tanks);

  const nextState = {
    ...base,
    coins: Number.isFinite(incoming.coins) ? clamp(Math.floor(incoming.coins), 0, MAX_WALLET_COINS) : base.coins,
    lifetimeDeaths: Number.isFinite(incoming.lifetimeDeaths) ? Math.max(0, Math.floor(incoming.lifetimeDeaths)) : base.lifetimeDeaths,
    mealHistory: mergeUniversalMealHistories(incoming.mealHistory, ...tanks.map((tank) => tank.feedHistory)),
    lastGravelCoinFoundAt: Math.max(
      Number(incoming.lastGravelCoinFoundAt) || 0,
      ...tanks.map((tank) => Number(tank.lastGravelCoinFoundAt) || 0)
    ),
    unlockedFishSpecies: sanitizeUnlockedFishSpecies(incoming.unlockedFishSpecies),
    unlockedDecorKeys: sanitizeUnlockedDecorKeys(incoming.unlockedDecorKeys),
    storedFish: Array.isArray(incoming.storedFish) ? incoming.storedFish.map(sanitizeFishEntry).filter(Boolean) : [],
    decorInventory: sanitizeDecorInventory(incoming.decorInventory),
    customDecorAssets: incomingCustomDecorAssets,
    customFishAssets: incomingCustomFishAssets,
    decorScaleDefaults: sanitizeDecorScaleDefaults(incoming.decorScaleDefaults),
    fishScaleDefaults: sanitizeFishScaleDefaults(incoming.fishScaleDefaults),
    tanks,
    activeTankId: typeof incoming.activeTankId === "string" && tanks.some((tank) => tank.id === incoming.activeTankId)
      ? incoming.activeTankId
      : (tanks[0]?.id || null),
    ownedBackgroundInventory: sanitizeOwnedBackgroundInventory(
      incoming.ownedBackgroundInventory ?? incoming.ownedBackgrounds,
      tanks.map((tank) => tank.selectedBackground)
    ),
    ownedFilterInventory: sanitizeOwnedFilterInventory(
      incoming.ownedFilterInventory ?? incoming.ownedFilterAssets,
      incoming.selectedFilterAsset
    ),
    uvLightOwned: ENABLE_UV_LIGHT && Boolean(
      incoming.uvLightOwned
      || incoming.ownedUvLight
      || incoming.uvLightInstalled
      || tanks.some((tank) => tank.uvLightInstalled)
    ),
    foodInventory: Object.fromEntries(getFoodCatalog().map((food) => [
      food.id,
      Math.max(0, Number(sanitizeInventory(incoming.foodInventory)[food.id]) || 0)
    ])),
    medicineInventory: {
      ...getDefaultMedicineInventory(),
      ...sanitizeInventory(incoming.medicineInventory)
    },
    dailyBonus: sanitizeDailyBonusState(incoming.dailyBonus),
    notificationCenter: sanitizeNotificationCenterState(incoming.notificationCenter),
    tutorial: buildDefaultTutorialState(),
    healthModelVersion: HEALTH_MODEL_VERSION,
    uiSettings: sanitizeUiSettings(incoming.uiSettings),
    contentSettings: sanitizeContentSettings(incoming.contentSettings),
    boroughTravelWalls: incoming.boroughTravelWalls && typeof incoming.boroughTravelWalls === "object"
      ? Object.fromEntries(Object.entries(incoming.boroughTravelWalls).filter(([, blocked]) => blocked === true))
      : {},
    boroughHappenings: sanitizeBoroughHappenings(incoming.boroughHappenings),
    boroughEvents: sanitizeBoroughEventHistory(incoming.boroughEvents, tanks),
    memorialHistory: sanitizeMemorialHistory(incoming.memorialHistory),
    version: STATE_VERSION
  };

  if (Number.isFinite(Number(incoming.lastCorpseSicknessAt)) && !tanks.some((tank) => Number.isFinite(Number(tank.lastCorpseSicknessAt)))) {
    const legacyTank = tanks.find((tank) => tank.id === incoming.activeTankId) || tanks[0];
    if (legacyTank) {
      legacyTank.lastCorpseSicknessAt = Number(incoming.lastCorpseSicknessAt);
    }
  }

  normalizeTankFilterAssignments(nextState);
  assignFallbackTankNames(nextState);
  installTankStateAccessors(nextState);

  for (const tank of nextState.tanks) {
    if (!nextState.uvLightOwned || !tank.uvLightInstalled) {
      tank.uvLightInstalled = false;
      tank.uvLightEnabled = false;
    } else {
      tank.uvLightEnabled = tank.uvLightEnabled !== false;
    }
  }

  for (const tank of nextState.tanks) {
    tank.customGravelEnabled = true;
  }

  const hasStartedPlaying = getAllTankFish(nextState).length
    || nextState.storedFish.length
    || getAllPlacedDecor(nextState).length
    || Object.keys(nextState.decorInventory).length
    || nextState.tanks.some((tank) => (
      Object.keys(tank.feedHistory || {}).length
      || tank.pendingPoops.length
      || tank.poops.length
      || tank.selectedFilterAsset && tank.selectedFilterAsset !== getDefaultFilterKey()
      || tank.uvLightInstalled
    ))
    || Object.keys(nextState.ownedBackgroundInventory).some((key) => !DEFAULT_OWNED_BACKGROUND_KEYS.includes(key))
    || Object.values(nextState.ownedFilterInventory).some((count) => count > 0)
    || nextState.uvLightOwned
    || Object.values(nextState.foodInventory).some((count) => count > 0)
    || Object.values(nextState.medicineInventory).some((count) => count > 0);
  if (!hasStartedPlaying && nextState.coins < STARTING_COINS) {
    nextState.coins = STARTING_COINS;
  }

  nextState.tutorial = sanitizeTutorialState(incoming.tutorial, {
    defaultCompleted: Boolean(rawState && typeof rawState === "object" && !Array.isArray(rawState)) || Boolean(hasStartedPlaying)
  });

  if (incomingVersion < 9) {
    for (const tank of nextState.tanks) {
      tank.placedDecor = tank.placedDecor.map((item) => ({
        ...item,
        scale: clamp(item.scale * 1.5, DECOR_SCALE_MIN, DECOR_SCALE_MAX)
      }));
    }
    if (!Number.isFinite(incoming.lifetimeDeaths)) {
      nextState.lifetimeDeaths = getAllTankFish(nextState).filter((fish) => isFishDead(fish)).length
        + nextState.storedFish.filter((fish) => isFishDead(fish)).length;
    }
  }

  if (incomingVersion >= 10 && incomingHealthModelVersion < LEGACY_HEALTH_SCALE_MODEL_VERSION) {
    for (const tank of nextState.tanks) {
      tank.placedDecor = tank.placedDecor.map((item) => ({
        ...item,
        scale: clamp(item.scale / 1.5, DECOR_SCALE_MIN, DECOR_SCALE_MAX)
      }));
    }
    nextState.decorScaleDefaults = Object.fromEntries(
      Object.entries(nextState.decorScaleDefaults).map(([key, value]) => [
        key,
        clamp(Number(value) / 1.5, DECOR_SCALE_MIN, DECOR_SCALE_MAX)
      ])
    );
  }

  if (incomingHealthModelVersion < HEALTH_MODEL_VERSION) {
    for (const tank of nextState.tanks) {
      tank.fish = tank.fish.map((fish) => rebalanceFishHealthForCurrentModel(fish));
    }
    nextState.storedFish = nextState.storedFish.map((fish) => rebalanceFishHealthForCurrentModel(fish));
  }

  if (incomingVersion < 36) {
    const defaultFilterKey = getDefaultFilterKey();
    nextState.tanks.forEach((tank, index) => {
      // Refresh untouched starter tanks that still match the old or partially-updated visual defaults.
      if (matchesLegacyDefaultStarterTankAppearance(tank, index, defaultFilterKey)) {
        applyDefaultStarterTankAppearance(tank);
      }
    });
  }

  const corpseCount = getAllTankFish(nextState).filter((fish) => isFishDead(fish)).length
    + nextState.storedFish.filter((fish) => isFishDead(fish)).length;

  if (!Number.isFinite(incoming.lifetimeDeaths) || nextState.lifetimeDeaths < corpseCount) {
    nextState.lifetimeDeaths = corpseCount;
  }

  nextState.unlockedFishSpecies = sanitizeUnlockedFishSpecies([
    ...nextState.unlockedFishSpecies,
    ...[...getAllTankFish(nextState), ...nextState.storedFish]
      .map((fish) => fish?.speciesId)
      .filter((speciesId) => runtime.fishMap.get(speciesId)?.unlockRequirement)
  ]);
  nextState.unlockedDecorKeys = sanitizeUnlockedDecorKeys([
    ...nextState.unlockedDecorKeys,
    ...Object.keys(nextState.decorInventory || {}),
    ...getAllPlacedDecor(nextState).map((decor) => decor?.decorKey),
    ...(Object.keys(nextState.customDecorAssets || {}).length ? [CUSTOM_DECOR_SHOP_KEY, CUSTOM_HIDE_SHOP_KEY] : [])
  ]);
  delete nextState.foodInventory.upgraded;

  if (!nextState.tanks.some((tank) => tank.events.length)) {
    nextState.tanks[0].events = [
      {
        id: createId("event"),
        time: now,
        text: "Welcome to Bubble Borough. Buy your first fish, and don't forget the food."
      }
    ];
  }

  normalizeTankFilterAssignments(nextState);
  pruneState(now, nextState);
  installTankStateAccessors(nextState);
  return nextState;
}

function isLikelySaveStateObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return [
    "version",
    "coins",
    "fish",
    "storedFish",
    "placedDecor",
    "decorInventory",
    "feedHistory"
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function extractImportedSaveState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("That save file is not valid.");
  }

  if (payload.format === SAVE_FILE_FORMAT) {
    if (!payload.state || typeof payload.state !== "object" || Array.isArray(payload.state)) {
      throw new Error("That save file is missing aquarium data.");
    }
    return payload.state;
  }

  if (isLikelySaveStateObject(payload)) {
    return payload;
  }

  throw new Error("That file is not a Bubble Borough save.");
}

function createSaveExportFilename(timestamp = Date.now()) {
  const exportedAt = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `bubble-borough-save-${exportedAt.getFullYear()}-${pad(exportedAt.getMonth() + 1)}-${pad(exportedAt.getDate())}-${pad(exportedAt.getHours())}${pad(exportedAt.getMinutes())}${pad(exportedAt.getSeconds())}.json`;
}

function downloadTextFile(contents, filename, type = "application/json") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function formatExportByteCount(bytes) {
  const count = Math.max(0, Number(bytes) || 0);
  if (count < 1024) {
    return `${count} B`;
  }
  if (count < 1024 * 1024) {
    return `${(count / 1024).toFixed(1)} KB`;
  }
  return `${(count / (1024 * 1024)).toFixed(1)} MB`;
}

function getTextByteCount(text) {
  const value = String(text || "");
  try {
    if (typeof TextEncoder === "function") {
      return new TextEncoder().encode(value).length;
    }
  } catch (error) {
    console.warn("TextEncoder byte count failed.", error);
  }

  try {
    if (typeof Blob === "function") {
      return new Blob([value]).size;
    }
  } catch (error) {
    console.warn("Blob byte count failed.", error);
  }

  return value.length;
}

function normalizeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function getHardwareAccelerationDismissed() {
  try {
    return localStorage.getItem(HARDWARE_ACCELERATION_NOTICE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissHardwareAccelerationNotice() {
  try {
    localStorage.setItem(HARDWARE_ACCELERATION_NOTICE_DISMISSED_KEY, "1");
  } catch { }
}

function acknowledgeHardwareAccelerationNotice(options = {}) {
  const shouldDismiss = options.dismiss === true
    || Boolean(dom.utilityOverlay?.querySelector?.("[data-hardware-acceleration-dont-show]")?.checked);
  if (shouldDismiss) {
    dismissHardwareAccelerationNotice();
  }
  closeUtilityOverlay();
  showLoadingOverlayReadyState();
}

function isHardwareAccelerationNoticeBlockingStart() {
  return runtime.utilityOverlayOpen === true && runtime.utilityOverlayMode === "hardware-acceleration";
}

function getWebGlRendererLabel(gl) {
  if (!gl || typeof gl.getParameter !== "function") {
    return "";
  }

  try {
    const debugInfo = gl.getExtension?.("WEBGL_debug_renderer_info");
    if (debugInfo?.UNMASKED_RENDERER_WEBGL) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer) {
        return String(renderer);
      }
    }
  } catch { }

  try {
    const renderer = gl.getParameter(gl.RENDERER);
    return renderer ? String(renderer) : "";
  } catch {
    return "";
  }
}

function detectHardwareAccelerationIssue() {
  if (!shouldShowHardwareAccelerationNotice() || typeof document === "undefined") {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      return {
        reason: "webgl-unavailable",
        renderer: ""
      };
    }

    const renderer = getWebGlRendererLabel(gl).trim();
    if (renderer && SOFTWARE_RENDERER_PATTERNS.some((pattern) => pattern.test(renderer))) {
      return {
        reason: "software-renderer",
        renderer
      };
    }
  } catch (error) {
    console.warn("Hardware acceleration detection failed.", error);
  }

  return null;
}

function maybeShowHardwareAccelerationNotice() {
  if (!shouldShowHardwareAccelerationNotice() || runtime.utilityOverlayOpen || getHardwareAccelerationDismissed()) {
    return;
  }

  runtime.hardwareAccelerationIssue = detectHardwareAccelerationIssue() || {
    reason: "first-visit",
    renderer: ""
  };
  openUtilityOverlay("hardware-acceleration");
}

function promptExternalLink(url, label = "") {
  const normalizedUrl = normalizeExternalUrl(url);
  if (!normalizedUrl) {
    showToast("That link cannot be opened.");
    return;
  }

  runtime.pendingExternalLink = {
    url: normalizedUrl,
    label: String(label || "").trim().replace(/\s+/g, " ").slice(0, 60)
  };
  openUtilityOverlay("external-link");
}

function getPendingExternalLink() {
  const url = normalizeExternalUrl(runtime.pendingExternalLink?.url);
  if (!url) {
    return null;
  }
  return {
    url,
    label: runtime.pendingExternalLink?.label || new URL(url).hostname
  };
}

function tryWallpaperEngineExternalOpen(url) {
  const candidates = [
    window.wallpaperOpenUrl,
    window.wallpaperOpenURL,
    window.wallpaperOpenExternalUrl,
    window.wallpaperOpenExternalURL,
    window.wallpaperOpenExternal,
    window.wallpaperOpenLink,
    window.wallpaper?.openUrl,
    window.wallpaper?.openURL,
    window.wallpaper?.openExternalUrl,
    window.wallpaper?.openExternalURL,
    window.wallpaper?.openExternal,
    window.wallpaper?.openLink
  ].filter((candidate) => typeof candidate === "function");

  for (const openExternal of candidates) {
    try {
      openExternal(url);
      return true;
    } catch (error) {
      console.warn("External link opener failed.", error);
    }
  }

  return false;
}

function tryBrowserExternalOpen(url) {
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      return false;
    }
    try {
      opened.opener = null;
    } catch { }
    return true;
  } catch (error) {
    console.warn("Browser external link opener failed.", error);
    return false;
  }
}

function openPendingExternalLink() {
  const link = getPendingExternalLink();
  if (!link) {
    showToast("That link is no longer available.");
    closeUtilityOverlay();
    return;
  }

  const opened = tryWallpaperEngineExternalOpen(link.url) || tryBrowserExternalOpen(link.url);
  if (opened) {
    showToast("Opening link.");
    closeUtilityOverlay();
    return;
  }

  showToast("The link was blocked. Copy it instead.");
}

async function copyPendingExternalLink() {
  const link = getPendingExternalLink();
  if (!link) {
    showToast("That link is no longer available.");
    closeUtilityOverlay();
    return;
  }

  const copied = await copyTextToClipboard(link.url);
  showToast(copied ? "Link copied." : "Could not copy link.");
}

async function createSaveExportData(timestamp = Date.now()) {
  const exportState = await createPortableExportState(state);
  const payload = {
    format: SAVE_FILE_FORMAT,
    exportVersion: SAVE_FILE_EXPORT_VERSION,
    exportedAt: timestamp,
    state: exportState
  };
  const contents = JSON.stringify(payload, null, 2);
  return {
    filename: createSaveExportFilename(timestamp),
    contents,
    sizeLabel: formatExportByteCount(getTextByteCount(contents))
  };
}

async function getCurrentSaveExportData() {
  if (runtime.pendingSaveExport?.contents) {
    return runtime.pendingSaveExport;
  }
  if (!state) {
    return null;
  }
  runtime.pendingSaveExport = await createSaveExportData();
  return runtime.pendingSaveExport;
}

async function retrySaveExportDownload() {
  let exportData = null;
  try {
    exportData = await getCurrentSaveExportData();
  } catch (error) {
    console.error(error);
    showToast(error?.message || "Could not prepare save data.");
    return;
  }
  if (!exportData) {
    showToast("No aquarium data is loaded yet.");
    return;
  }

  try {
    downloadTextFile(exportData.contents, exportData.filename);
    showToast("Save file download started.");
  } catch (error) {
    console.error(error);
    showToast("The download was blocked. Use Copy instead.");
  }
}

function selectSaveExportText() {
  const textarea = dom.utilityOverlayBody?.querySelector("[data-save-export-text]");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    return false;
  }
  textarea.focus();
  textarea.select();
  return true;
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.warn("Clipboard API copy failed.", error);
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    console.warn("Fallback clipboard copy failed.", error);
  }
  textarea.remove();
  return copied;
}

async function copyCurrentSaveExportData() {
  let exportData = null;
  try {
    exportData = await getCurrentSaveExportData();
  } catch (error) {
    console.error(error);
    showToast(error?.message || "Could not prepare save data.");
    return;
  }
  if (!exportData) {
    showToast("No aquarium data is loaded yet.");
    return;
  }

  const copied = await copyTextToClipboard(exportData.contents);
  if (copied) {
    showToast("Save data copied.");
    return;
  }

  if (selectSaveExportText()) {
    showToast("Save data selected. Press Ctrl+C to copy.");
  } else {
    showToast("Could not copy save data.");
  }
}

function resetTransientAquariumUiState() {
  clearEditDecorTrayLongPress();
  closeEditDecorTrayContextMenu({ render: false });
  clearEditFishTrayLongPress();
  closeEditFishTrayContextMenu({ render: false });
  clearPrimaryToolModes();
  resetToastState();
  runtime.guidanceHintOwner = "";
  resetCompetingOverlayState({ reason: "transient-reset", resetStoreTab: true });
  runtime.tutorialDismissedFeaturePopup = "";
  runtime.tutorialDisplayCollapsed = false;
  runtime.selectedFishId = null;
  resetTankInteractionRuntimeState({
    clearLastTankPoint: true,
    clearGlassTap: true
  });
  runtime.splashBursts = [];
  runtime.fallingGravelPebbles = [];
  runtime.fishShadowPlaneCache.clear();
  runtime.fishGravelPebbleActions.clear();
  runtime.fishPebbleTosses = [];
  runtime.forcedGravelDigUntilByFishId.clear();
  runtime.gravelDigBursts = [];
  runtime.sedimentClouds = [];
  runtime.effectClouds = [];
  runtime.coinGlints = [];
  runtime.waterParticles = [];
  runtime.waterParticleTankId = null;
  runtime.waterEffectFishSamples.clear();
  runtime.bloodWaterTint = 0;
  runtime.activeFishCavePlans.clear();
  runtime.bettaPassLocks.clear();
  runtime.debugBreedingSequence = null;
  runtime.decorPlacementLayer = DEFAULT_TANK_LAYER;
  runtime.activeGravelPaletteSlot = 0;
  runtime.decorHangoutZonesKey = "";
  runtime.decorHangoutZones = [];
  runtime.renderedMarkup = Object.create(null);
  runtime.renderedDataKeys = Object.create(null);
  runtime.gravelStateDirty = true;

  clearScrubProgress();
  runtime.cleaningTransition = null;
  renderToolCursor();
}

async function applyImportedSaveData(rawState) {
  resetTransientAquariumUiState();
  const now = Date.now();
  state = reconcileState(rawState);
  const customImagesChanged = await hydrateCustomImagesFromStorage(state);
  applyPendingWallpaperEngineUserProperties({
    save: false,
    render: false,
    showToast: false
  });
  syncRuntimeCustomFishAssetsFromState(state);
  syncRuntimeCustomDecorAssetsFromState(state);
  restoreTutorialRuntimeState(now);
  void preloadImages([
    ...getAllTanks().map((tank) => getLocalBackgroundImageDataUrl(tank)).filter(Boolean),
    ...getCustomDecorCatalogEntries(state).flatMap((item) => [item.path, item.bgPath].filter(Boolean)),
    ...getCustomFishCatalogEntries(state).map((item) => item.asset)
  ]).then(() => renderUi(Date.now()));
  applyContentSettingsEffects(now);
  const decorPlacementChanged = normalizePlacedDecorState();
  const stateChanged = syncState(now);
  if (customImagesChanged || decorPlacementChanged || stateChanged) {
    runtime.gravelStateDirty = true;
  }
  saveState();
  renderUi(now);
  syncAmbienceAudio();
}

async function exportSaveData(options = {}) {
  if (!state) {
    if (options.showToast !== false) {
      showToast("No aquarium data is loaded yet.");
    }
    return false;
  }

  const shouldOpenOverlay = options.openOverlay !== false;
  const shouldShowToast = options.showToast !== false;
  try {
    runtime.pendingSaveExport = null;
    runtime.pendingSaveExport = await createSaveExportData(Date.now());
    downloadTextFile(runtime.pendingSaveExport.contents, runtime.pendingSaveExport.filename);
    if (shouldOpenOverlay) {
      openUtilityOverlay("save-export");
    }
    if (shouldShowToast) {
      showToast("Save export ready.");
    }
    return true;
  } catch (error) {
    console.error(error);
    if (runtime.pendingSaveExport?.contents) {
      if (shouldOpenOverlay) {
        openUtilityOverlay("save-export");
      }
      if (shouldShowToast) {
        showToast("Download blocked. Save export is ready to copy.");
      }
      return true;
    }

    if (shouldShowToast) {
      showToast(error?.message || "Could not export save data.");
    }
    return false;
  }
}

async function prepareResetProgressSaveExport() {
  if (!state) {
    showToast("No aquarium data is loaded yet.");
    return;
  }

  try {
    runtime.pendingSaveExport = null;
    runtime.pendingSaveExport = await createSaveExportData(Date.now());
    downloadTextFile(runtime.pendingSaveExport.contents, runtime.pendingSaveExport.filename);
    openUtilityOverlay("reset-progress-save-export");
    showToast("Save export ready.");
  } catch (error) {
    console.error(error);
    if (runtime.pendingSaveExport?.contents) {
      openUtilityOverlay("reset-progress-save-export");
      showToast("Download blocked. Save export is ready to copy.");
    } else {
      showToast(error?.message || "Could not export save data.");
    }
  }
}

function openImportDataPicker() {
  const input = dom.importDataInput;
  if (!(input instanceof HTMLInputElement)) {
    showToast("Import picker unavailable.");
    return;
  }
  input.value = "";
  input.click();
}

function openLocalBackgroundPicker() {
  dom.localBackgroundInput?.click();
}

function openLocalDecorPicker() {
  openCustomAssetPicker("decor");
}
