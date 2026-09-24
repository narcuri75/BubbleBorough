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

  // Store virtualization temporarily moves product cards into a viewport
  // slice. If that slice is later discarded while changing aisles, the cached
  // markup text is still current but its source element is empty. Treat that
  // as a cache miss so switching tabs never leaves a blank catalogue.
  const expectedStoreCards = typeof markup === "string" && markup.includes("shop-card");
  const lostStoreCards = expectedStoreCards && !element.querySelector(".shop-card");
  if (runtime.renderedMarkup[cacheKey] === markup && !lostStoreCards) {
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

function sanitizeAccountProfile(rawProfile) {
  const source = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const username = typeof source.username === "string"
    ? source.username.trim().replace(/\s+/g, " ").slice(0, 20)
    : "";
  const userId = typeof source.userId === "string" ? source.userId.trim().slice(0, 80) : "";
  return { username, userId };
}

function sanitizeBubbleBodegaRescueOffer(rawOffer) {
  const source = rawOffer && typeof rawOffer === "object" ? rawOffer : {};
  const timestamp = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return {
    cycle: Number.isFinite(Number(source.cycle)) ? Math.max(0, Math.floor(Number(source.cycle))) : 0,
    eligibilityActive: source.eligibilityActive === true,
    issuedAt: timestamp(source.issuedAt),
    activatedAt: timestamp(source.activatedAt),
    foodClaimedAt: timestamp(source.foodClaimedAt),
    goldfishClaimedAt: timestamp(source.goldfishClaimedAt)
  };
}

function sanitizePurchaseHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory.map((rawOrder) => {
    if (!rawOrder || typeof rawOrder !== "object") return null;
    const placedAt = Number.isFinite(Number(rawOrder.placedAt)) ? Number(rawOrder.placedAt) : Date.now();
    const items = Array.isArray(rawOrder.items) ? rawOrder.items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== "object") return null;
      const name = typeof rawItem.name === "string" ? rawItem.name.trim().slice(0, 120) : "Store item";
      const category = typeof rawItem.category === "string" ? rawItem.category.trim().slice(0, 32) : "";
      const image = typeof rawItem.image === "string" && rawItem.image.trim() ? rawItem.image.trim().slice(0, 600) : "assets/web/bodega/Store_Logo.png";
      const seller = typeof rawItem.seller === "string" ? rawItem.seller.trim().slice(0, 120) : "";
      return {
        key: typeof rawItem.key === "string" ? rawItem.key.slice(0, 180) : "",
        name: name || "Store item",
        category,
        image,
        seller,
        cost: clamp(Math.floor(Math.max(0, Number(rawItem.cost) || 0)), 0, MAX_WALLET_COINS),
        quantity: clamp(Math.floor(Math.max(1, Number(rawItem.quantity) || 1)), 1, 999)
      };
    }).filter(Boolean).slice(0, 100) : [];
    if (!items.length) return null;
    const proteusStatus = ["design-required", "specimen-configured", "fulfillment-complete"].includes(rawOrder.proteusStatus)
      ? rawOrder.proteusStatus
      : "";
    return {
      id: typeof rawOrder.id === "string" ? rawOrder.id.slice(0, 80) : createId("order"),
      placedAt,
      total: items.reduce((sum, item) => sum + item.cost * item.quantity, 0),
      items,
      ...(proteusStatus ? {
        proteusStatus,
        proteusConfiguredAt: Number.isFinite(Number(rawOrder.proteusConfiguredAt)) ? Math.max(0, Number(rawOrder.proteusConfiguredAt)) : 0,
        proteusFulfilledAt: Number.isFinite(Number(rawOrder.proteusFulfilledAt)) ? Math.max(0, Number(rawOrder.proteusFulfilledAt)) : 0
      } : {})
    };
  }).filter(Boolean).sort((left, right) => right.placedAt - left.placedAt).slice(0, 250);
}

function sanitizeWebSurfMailStates(rawStates) {
  const source = rawStates && typeof rawStates === "object" && !Array.isArray(rawStates) ? rawStates : {};
  const entries = Object.entries(source);
  return Object.fromEntries(entries.map(([rawId, rawEntry]) => {
    const id = String(rawId || "").trim().slice(0, 180);
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    return [id, {
      status: Number(entry.status) === 0 ? 0 : 1,
      starred: entry.starred === true || Number(entry.starred) === 1 ? 1 : 0,
      trashed: entry.trashed === true || Number(entry.trashed) === 1 ? 1 : 0
    }];
  }).filter(([id]) => id));
}

function sanitizeWebSurfSenderStates(rawStates) {
  const source = rawStates && typeof rawStates === "object" && !Array.isArray(rawStates) ? rawStates : {};
  const entries = Object.entries(source);
  return Object.fromEntries(entries.map(([rawId, rawEntry]) => {
    const id = String(rawId || "").trim().slice(0, 120);
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    return [id, {
      sender: typeof entry.sender === "string" ? entry.sender.trim().slice(0, 120) : "",
      status: Number(entry.status) === 0 ? 0 : 1
    }];
  }).filter(([id]) => id));
}

function sanitizeWebSurfSentEmails(rawEmails) {
  if (!Array.isArray(rawEmails)) return [];
  return rawEmails.map((rawEmail) => {
    if (!rawEmail || typeof rawEmail !== "object") return null;
    const id = typeof rawEmail.id === "string" && rawEmail.id.trim()
      ? rawEmail.id.trim().slice(0, 180)
      : createId("mail");
    const sender = typeof rawEmail.sender === "string" && rawEmail.sender.trim()
      ? rawEmail.sender.trim().slice(0, 120)
      : "-FIN";
    const senderId = typeof rawEmail.senderId === "string" ? rawEmail.senderId.trim().slice(0, 120) : "";
    const templateId = typeof rawEmail.templateId === "string" ? rawEmail.templateId.trim().slice(0, 120) : "";
    const subject = typeof rawEmail.subject === "string" ? rawEmail.subject.slice(0, 180) : "";
    const preview = typeof rawEmail.preview === "string" ? rawEmail.preview.slice(0, 320) : "";
    const destination = typeof rawEmail.destination === "string" ? rawEmail.destination.slice(0, 80) : "";
    const icon = typeof rawEmail.icon === "string" ? rawEmail.icon.slice(0, 400) : "assets/icons/WebSurf_icon.png";
    const time = Number.isFinite(Number(rawEmail.time)) ? Math.max(0, Number(rawEmail.time)) : Date.now();
    const data = rawEmail.data && typeof rawEmail.data === "object" && !Array.isArray(rawEmail.data)
      ? {
        orderId: typeof rawEmail.data.orderId === "string" ? rawEmail.data.orderId.slice(0, 100) : "",
        speciesId: typeof rawEmail.data.speciesId === "string" ? rawEmail.data.speciesId.slice(0, 100) : "",
        fishId: typeof rawEmail.data.fishId === "string" ? rawEmail.data.fishId.slice(0, 100) : "",
        specimenName: typeof rawEmail.data.specimenName === "string" ? rawEmail.data.specimenName.slice(0, 80) : "",
        specimenId: typeof rawEmail.data.specimenId === "string" && /^PB-CS-\d{5}$/.test(rawEmail.data.specimenId.trim()) ? rawEmail.data.specimenId.trim() : "",
        cost: Math.max(0, Math.floor(Number(rawEmail.data.cost) || 0)),
        deliveryStatus: typeof rawEmail.data.deliveryStatus === "string" ? rawEmail.data.deliveryStatus.slice(0, 40) : ""
      }
      : {};
    return { id, sender, senderId, templateId, subject, preview, destination, icon, time, data };
  }).filter(Boolean).sort((left, right) => Number(right.time) - Number(left.time));
}

function sanitizeProteusCorpseDonationDigests(rawDigests) {
  if (!Array.isArray(rawDigests)) return [];
  const seenDigestIds = new Set();
  const seenFishIds = new Set();
  return rawDigests.map((rawDigest) => {
    if (!rawDigest || typeof rawDigest !== "object") return null;
    const scheduledAt = Number.isFinite(Number(rawDigest.scheduledAt)) ? Math.max(0, Number(rawDigest.scheduledAt)) : 0;
    if (!scheduledAt) return null;
    const id = typeof rawDigest.id === "string" && rawDigest.id.trim()
      ? rawDigest.id.trim().slice(0, 180)
      : `proteus-corpse-donation-${Math.floor(scheduledAt)}`;
    if (seenDigestIds.has(id)) return null;
    seenDigestIds.add(id);
    const fish = (Array.isArray(rawDigest.fish) ? rawDigest.fish : []).map((rawFish) => {
      if (!rawFish || typeof rawFish !== "object") return null;
      const fishId = typeof rawFish.fishId === "string" ? rawFish.fishId.trim().slice(0, 100) : "";
      if (!fishId || seenFishIds.has(fishId)) return null;
      seenFishIds.add(fishId);
      return {
        fishId,
        fishName: typeof rawFish.fishName === "string" && rawFish.fishName.trim() ? rawFish.fishName.trim().slice(0, 80) : "Unnamed specimen",
        speciesId: typeof rawFish.speciesId === "string" ? rawFish.speciesId.trim().slice(0, 100) : "",
        speciesName: typeof rawFish.speciesName === "string" && rawFish.speciesName.trim() ? rawFish.speciesName.trim().slice(0, 100) : "Unclassified aquatic specimen",
        diedAt: Number.isFinite(Number(rawFish.diedAt)) ? Math.max(0, Number(rawFish.diedAt)) : 0,
        donatedAt: Number.isFinite(Number(rawFish.donatedAt)) ? Math.max(0, Number(rawFish.donatedAt)) : scheduledAt,
        source: typeof rawFish.source === "string" ? rawFish.source.trim().slice(0, 40) : "removal"
      };
    }).filter(Boolean).slice(0, 100);
    if (!fish.length) return null;
    return {
      id,
      scheduledAt,
      createdAt: Number.isFinite(Number(rawDigest.createdAt)) ? Math.max(0, Number(rawDigest.createdAt)) : Math.min(...fish.map((entry) => entry.donatedAt || scheduledAt)),
      fish
    };
  }).filter(Boolean).sort((left, right) => Number(right.scheduledAt) - Number(left.scheduledAt)).slice(0, 180);
}

function getAccountUsernameForUser(userId = "") {
  const profile = sanitizeAccountProfile(state?.accountProfile);
  const expectedUserId = String(userId || "").trim();
  if (profile.username && (!expectedUserId || profile.userId === expectedUserId)) return profile.username;
  const options = ["Buddy", "Guy", "Feller", "Friend", "Pal", "Dude"];
  const source = expectedUserId || "Bubble Borough";
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return options[(hash >>> 0) % options.length];
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
        : DEFAULT_CONTENT_SETTINGS.violenceAndGoreEnabled !== false,
    trypophobiaEnabled: source.trypophobiaEnabled === true
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

function normalizeToolbarTileColor(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized;
  }
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized.slice(1).split("").map((character) => character.repeat(2)).join("")}`;
  }
  return DEFAULT_UI_SETTINGS.toolbarTileColor;
}

function normalizeWebSurfThemeMode(value, legacyDarkMode = undefined) {
  if (typeof value === "boolean") {
    return value ? WEBSURF_THEME_MODE_YES : WEBSURF_THEME_MODE_NO;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (WEBSURF_THEME_MODES.includes(normalized)) {
    return normalized;
  }
  if (typeof legacyDarkMode === "boolean") {
    return legacyDarkMode ? WEBSURF_THEME_MODE_YES : WEBSURF_THEME_MODE_NO;
  }
  return WEBSURF_THEME_MODE_AUTO;
}

function normalizeSettingsVolume(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return clamp(Number(fallback) || 0, 0, 1);
  }
  return clamp(numeric, 0, 1);
}

function normalizeDepthEffectLevel(value, legacyEnabled = undefined) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return clamp(Math.round(numeric), DEPTH_EFFECT_LEVEL_MIN, DEPTH_EFFECT_LEVEL_MAX);
  }
  // Migrate saves created before the 0-4 depth intensity control existed.
  if (legacyEnabled === false) {
    return DEPTH_EFFECT_LEVEL_MIN;
  }
  return DEPTH_EFFECT_LEVEL_DEFAULT;
}

function getSavedDepthEffectLevelPreference() {
  try {
    const raw = localStorage.getItem(DEPTH_EFFECT_LEVEL_PREFERENCE_KEY);
    if (raw === null || raw === "") {
      return null;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return normalizeDepthEffectLevel(numeric);
  } catch {
    return null;
  }
}

function saveDepthEffectLevelPreference(value) {
  const depthEffectLevel = normalizeDepthEffectLevel(value);
  try {
    localStorage.setItem(DEPTH_EFFECT_LEVEL_PREFERENCE_KEY, String(depthEffectLevel));
  } catch {
    // The normal save state still carries this setting if localStorage is unavailable.
  }
  return depthEffectLevel;
}

function sanitizeUiSettings(rawSettings) {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const hasTankAmbienceVolume = Object.prototype.hasOwnProperty.call(source, "tankAmbienceVolume");
  const hasSfxVolume = Object.prototype.hasOwnProperty.call(source, "sfxVolume");
  const hasUiSoundVolume = Object.prototype.hasOwnProperty.call(source, "uiSoundVolume");
  const hasAnyCategoryVolume = hasTankAmbienceVolume || hasSfxVolume || hasUiSoundVolume;
  const migrateLegacyAllMute = !hasAnyCategoryVolume && source.soundMuted === true;
  const migrateLegacyUiMute = !hasUiSoundVolume && source.uiSoundsMuted === true;
  return {
    toolbarPosition: DEFAULT_UI_SETTINGS.toolbarPosition,
    toolbarTileColor: normalizeToolbarTileColor(source.toolbarTileColor),
    webSurfThemeMode: normalizeWebSurfThemeMode(
      source.webSurfThemeMode,
      typeof source.webSurfDarkModeEnabled === "boolean"
        ? source.webSurfDarkModeEnabled
        : (typeof source.webSurfDarkMode === "boolean" ? source.webSurfDarkMode : undefined)
    ),
    displayPosition: DEFAULT_UI_SETTINGS.displayPosition,
    toolbarCollapsed: source.toolbarCollapsed === true,
    displayCollapsed: source.displayCollapsed === true,
    careTaskPaneOpen: false,
    soundMuted: migrateLegacyAllMute ? false : source.soundMuted === true,
    uiSoundsMuted: (migrateLegacyAllMute || migrateLegacyUiMute) ? false : source.uiSoundsMuted === true,
    tankAmbienceVolume: migrateLegacyAllMute
      ? 0
      : normalizeSettingsVolume(source.tankAmbienceVolume, DEFAULT_UI_SETTINGS.tankAmbienceVolume),
    sfxVolume: migrateLegacyAllMute
      ? 0
      : normalizeSettingsVolume(source.sfxVolume, DEFAULT_UI_SETTINGS.sfxVolume),
    uiSoundVolume: (migrateLegacyAllMute || migrateLegacyUiMute)
      ? 0
      : normalizeSettingsVolume(source.uiSoundVolume, DEFAULT_UI_SETTINGS.uiSoundVolume),
    gravelShadowIntensity: normalizeSettingsVolume(source.gravelShadowIntensity, DEFAULT_UI_SETTINGS.gravelShadowIntensity),
    tankMouseInputLocked: isTankMouseLockFeatureEnabled() && source.tankMouseInputLocked === true,
    layoutRatioLockEnabled: source.layoutRatioLockEnabled !== false,
    layoutRatioLockWidth: Math.max(0, Math.round(Number(source.layoutRatioLockWidth) || 0)),
    layoutRatioLockHeight: Math.max(0, Math.round(Number(source.layoutRatioLockHeight) || 0)),
    ambientBubblesEnabled: source.ambientBubblesEnabled !== false,
    waterParticlesEnabled: source.waterParticlesEnabled !== false,
    causticLightingEnabled: CAUSTIC_LIGHTING_SETTING_ENABLED && source.causticLightingEnabled !== false,
    decorShadowsEnabled: DECOR_SHADOWS_SETTING_ENABLED && source.decorShadowsEnabled !== false,
    depthEffectLevel: getSavedDepthEffectLevelPreference() ?? normalizeDepthEffectLevel(source.depthEffectLevel, source.depthEffectsEnabled),
    backgroundDepthHazeEnabled: source.backgroundDepthHazeEnabled !== false,
    simpleTurnAnimationsOnly: true,
    halloweenMode: "automatic",
    editOverlayMode: ["fish", "decor", "equipment", "tank", "background", "gravel"].includes(String(source.editOverlayMode || "").trim())
      ? (String(source.editOverlayMode).trim() === "tank" ? "background" : String(source.editOverlayMode).trim())
      : DEFAULT_UI_SETTINGS.editOverlayMode
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

function isCausticLightingEnabled() {
  return CAUSTIC_LIGHTING_SETTING_ENABLED && getUiSettings().causticLightingEnabled;
}

function areDecorShadowsEnabled() {
  return DECOR_SHADOWS_SETTING_ENABLED && getUiSettings().decorShadowsEnabled;
}

function areSimpleTurnAnimationsForced() {
  return getUiSettings().simpleTurnAnimationsOnly === true;
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

function sanitizePeacefulModeState(rawState) {
  const source = rawState && typeof rawState === "object" ? rawState : {};
  const tankSnapshots = source.tankSnapshots && typeof source.tankSnapshots === "object" && !Array.isArray(source.tankSnapshots)
    ? source.tankSnapshots
    : {};
  const fishSnapshots = source.fishSnapshots && typeof source.fishSnapshots === "object" && !Array.isArray(source.fishSnapshots)
    ? source.fishSnapshots
    : {};
  return {
    enabled: source.enabled === true,
    startedAt: Number.isFinite(Number(source.startedAt)) ? Math.max(0, Number(source.startedAt)) : 0,
    tankSnapshots,
    fishSnapshots
  };
}

function getPeacefulModeState(targetState = state) {
  return sanitizePeacefulModeState(targetState?.peacefulMode);
}

function isPeacefulModeEnabled(targetState = state) {
  return getPeacefulModeState(targetState).enabled;
}

function getPeacefulModeSimulationNow(now = Date.now()) {
  const mode = getPeacefulModeState();
  return mode.enabled && mode.startedAt > 0 ? Math.min(now, mode.startedAt) : now;
}

function getPeacefulModeTankSnapshot(tank, now = Date.now()) {
  if (!tank) return null;
  const fishList = (Array.isArray(tank.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
  const deadFishList = (Array.isArray(tank.fish) ? tank.fish : []).filter((fish) => fish && isFishDead(fish));
  const duration = getTankMaxDirtyDurationMs(fishList, tank, deadFishList);
  const lastCleanedAt = Number(tank.lastCleanedAt) || now;
  return {
    dirtiness: clamp((now - lastCleanedAt) / Math.max(1, duration), 0, 1),
    poops: Array.isArray(tank.poops) ? tank.poops.map((poop) => ({ ...poop })) : [],
    pendingPoops: Array.isArray(tank.pendingPoops) ? tank.pendingPoops.map((poop) => ({ ...poop })) : [],
    lastSimulatedAt: Number.isFinite(Number(tank.lastSimulatedAt)) ? Number(tank.lastSimulatedAt) : now,
    createdAt: Number.isFinite(Number(tank.createdAt)) ? Number(tank.createdAt) : null
  };
}

function getPeacefulModeFishSnapshot(fish) {
  if (!fish) return null;
  const timerKeys = [
    "acquiredAt", "tankAddedAt", "growthStartedAt", "growthEndsAt",
    "diseaseLastProgressAt", "nextDiseaseCheckAt", "nextSymptomCheckAt", "nextDiseaseSpreadCheckAt",
    "diseaseTreatedUntil", "temporaryImmunityUntil", "nextGreenBubbleAt",
    "nextWasteAt", "lastNeighborhoodMoveAt", "lastAteAt", "breedCooldownUntil"
  ];
  const timers = {};
  for (const key of timerKeys) {
    if (Number.isFinite(Number(fish[key]))) timers[key] = Number(fish[key]);
  }
  return {
    needs: fish.needs && typeof fish.needs === "object" ? { ...fish.needs } : null,
    healthUnits: Number.isFinite(Number(fish.healthUnits)) ? Number(fish.healthUnits) : null,
    needsUpdatedAt: Number.isFinite(Number(fish.needsUpdatedAt)) ? Number(fish.needsUpdatedAt) : null,
    comfortDamageProgressMs: Math.max(0, Number(fish.comfortDamageProgressMs) || 0),
    timers
  };
}

function capturePeacefulModeSnapshots(now = Date.now()) {
  const tankSnapshots = {};
  const fishSnapshots = {};
  for (const tank of getAllTanks(state)) {
    if (!tank?.id) continue;
    tankSnapshots[tank.id] = getPeacefulModeTankSnapshot(tank, now);
    for (const fish of Array.isArray(tank.fish) ? tank.fish : []) {
      if (fish?.id) fishSnapshots[fish.id] = getPeacefulModeFishSnapshot(fish);
    }
  }
  for (const fish of Array.isArray(state?.storedFish) ? state.storedFish : []) {
    if (fish?.id && !fishSnapshots[fish.id]) fishSnapshots[fish.id] = getPeacefulModeFishSnapshot(fish);
  }
  return { tankSnapshots, fishSnapshots };
}

function ensurePeacefulModeSnapshots(now = Date.now()) {
  if (!state || !isPeacefulModeEnabled()) return false;
  const mode = getPeacefulModeState();
  if (mode.startedAt > 0 && Object.keys(mode.tankSnapshots).length) return false;
  const snapshots = capturePeacefulModeSnapshots(now);
  state.peacefulMode = {
    enabled: true,
    startedAt: mode.startedAt > 0 ? mode.startedAt : now,
    ...snapshots
  };
  return true;
}

function enforcePeacefulModeState(now = Date.now()) {
  if (!state || !isPeacefulModeEnabled()) return false;
  ensurePeacefulModeSnapshots(now);
  let changed = false;
  const fullNeeds = Object.fromEntries(FISH_NEED_KEYS.map((key) => [key, 100]));
  for (const tank of getAllTanks(state)) {
    if (Array.isArray(tank.poops) && tank.poops.length) {
      tank.poops = [];
      changed = true;
    }
    if (Array.isArray(tank.pendingPoops) && tank.pendingPoops.length) {
      tank.pendingPoops = [];
      changed = true;
    }
    tank.lastSimulatedAt = now;
    for (const fish of Array.isArray(tank.fish) ? tank.fish : []) {
      if (!fish || isFishDead(fish)) continue;
      const maxHealth = getFishMaxHealthUnits(fish);
      if (Number(fish.healthUnits) !== maxHealth) {
        fish.healthUnits = maxHealth;
        changed = true;
      }
      const currentNeeds = sanitizeFishNeeds(fish.needs, fish, now);
      if (FISH_NEED_KEYS.some((key) => currentNeeds[key] !== 100)) changed = true;
      fish.needs = { ...fullNeeds };
      fish.needsUpdatedAt = now;
      fish.comfortDamageProgressMs = 0;
      clearPiranhaAttackState(fish);
    }
  }
  for (const fish of Array.isArray(state.storedFish) ? state.storedFish : []) {
    if (!fish || isFishDead(fish)) continue;
    const maxHealth = getFishMaxHealthUnits(fish);
    if (Number(fish.healthUnits) !== maxHealth) {
      fish.healthUnits = maxHealth;
      changed = true;
    }
    fish.needs = { ...fullNeeds };
    fish.needsUpdatedAt = now;
    fish.comfortDamageProgressMs = 0;
    clearPiranhaAttackState(fish);
  }
  clearBloodEffectClouds();
  runtime.bloodWaterTint = 0;
  runtime.bettaPassLocks.clear();
  return changed;
}

function restorePeacefulModeState(now = Date.now()) {
  if (!state) return false;
  const mode = getPeacefulModeState();
  const pauseDuration = mode.startedAt > 0 ? Math.max(0, now - mode.startedAt) : 0;
  state.peacefulMode = { enabled: false, startedAt: 0, tankSnapshots: {}, fishSnapshots: {} };
  let changed = false;
  for (const tank of getAllTanks(state)) {
    const snapshot = tank?.id ? mode.tankSnapshots[tank.id] : null;
    const fishList = (Array.isArray(tank?.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
    const deadFishList = (Array.isArray(tank?.fish) ? tank.fish : []).filter((fish) => fish && isFishDead(fish));
    const duration = getTankMaxDirtyDurationMs(fishList, tank, deadFishList);
    if (snapshot) {
      tank.lastCleanedAt = now - clamp(Number(snapshot.dirtiness) || 0, 0, 1) * Math.max(1, duration);
      if (Number.isFinite(Number(snapshot.createdAt))) tank.createdAt = Number(snapshot.createdAt) + pauseDuration;
      tank.poops = Array.isArray(snapshot.poops) ? snapshot.poops.map((poop) => ({ ...poop })) : [];
      const livingIds = new Set((tank.fish || []).filter((fish) => fish && !isFishDead(fish)).map((fish) => fish.id));
      tank.pendingPoops = Array.isArray(snapshot.pendingPoops)
        ? snapshot.pendingPoops.filter((poop) => !poop?.fishId || livingIds.has(poop.fishId)).map((poop) => ({ ...poop }))
        : [];
    } else {
      tank.lastCleanedAt = now;
      tank.poops = [];
      tank.pendingPoops = [];
      if (Number.isFinite(Number(tank.createdAt)) && Number(tank.createdAt) >= mode.startedAt) tank.createdAt = now;
    }
    tank.lastSimulatedAt = now;
    for (const egg of Array.isArray(tank.fishEggs) ? tank.fishEggs : []) {
      if (!egg) continue;
      for (const key of ["createdAt", "hatchAt", "hatchedAt", "shellExpiresAt", "releasedAt"]) {
        if (Number.isFinite(Number(egg[key])) && Number(egg[key]) > 0) egg[key] = Number(egg[key]) + pauseDuration;
      }
    }
    for (const spawn of Array.isArray(tank.pendingBreedingEvents) ? tank.pendingBreedingEvents : []) {
      if (!spawn) continue;
      for (const key of ["createdAt", "resolutionAt"]) {
        if (Number.isFinite(Number(spawn[key])) && Number(spawn[key]) > 0) spawn[key] = Number(spawn[key]) + pauseDuration;
      }
    }
    for (const event of Array.isArray(tank.events) ? tank.events : []) {
      if (!event || event.progressionEligible === false) continue;
      const progressionTime = Number.isFinite(Number(event.progressionTime)) ? Number(event.progressionTime) : Number(event.time);
      if (Number.isFinite(progressionTime)) event.progressionTime = progressionTime + pauseDuration;
    }
  }
  for (const event of Array.isArray(state.boroughEvents) ? state.boroughEvents : []) {
    if (!event || event.progressionEligible === false) continue;
    const progressionTime = Number.isFinite(Number(event.progressionTime)) ? Number(event.progressionTime) : Number(event.time);
    if (Number.isFinite(progressionTime)) event.progressionTime = progressionTime + pauseDuration;
  }
  const allFish = [...getAllTankFish(state), ...(Array.isArray(state.storedFish) ? state.storedFish : [])];
  for (const fish of allFish) {
    if (!fish?.id || isFishDead(fish)) continue;
    const snapshot = mode.fishSnapshots[fish.id];
    if (snapshot) {
      fish.needs = snapshot.needs ? sanitizeFishNeeds(snapshot.needs, fish, now) : sanitizeFishNeeds(null, fish, now);
      if (Number.isFinite(Number(snapshot.healthUnits))) fish.healthUnits = clamp(Number(snapshot.healthUnits), 0, getFishMaxHealthUnits(fish));
      fish.needsUpdatedAt = now;
      fish.comfortDamageProgressMs = Math.max(0, Number(snapshot.comfortDamageProgressMs) || 0);
      for (const [key, value] of Object.entries(snapshot.timers || {})) {
        if (Number.isFinite(Number(value))) fish[key] = Number(value) + pauseDuration;
      }
    } else {
      fish.needs = sanitizeFishNeeds(null, fish, now);
      fish.needsUpdatedAt = now;
      fish.healthUnits = getFishMaxHealthUnits(fish);
      fish.comfortDamageProgressMs = 0;
      fish.acquiredAt = now;
      if (Number.isFinite(Number(fish.tankAddedAt))) fish.tankAddedAt = now;
      if (Number.isFinite(Number(fish.growthStartedAt)) && Number.isFinite(Number(fish.growthEndsAt))) {
        const growthDuration = Math.max(1, Number(fish.growthEndsAt) - Number(fish.growthStartedAt));
        fish.growthStartedAt = now;
        fish.growthEndsAt = now + growthDuration;
      }
    }
  }

  if (state.dailyBonus) {
    state.dailyBonus.lastEvaluatedDayKey = getPreviousLocalDayKey(now);
  }
  changed = true;
  return changed;
}

function setPeacefulModeEnabled(enabled = true) {
  if (!state) return false;
  const nextEnabled = enabled === true;
  if (isPeacefulModeEnabled() === nextEnabled) return false;
  const now = Date.now();
  if (nextEnabled) {
    const snapshots = capturePeacefulModeSnapshots(now);
    state.peacefulMode = { enabled: true, startedAt: now, ...snapshots };
    enforcePeacefulModeState(now);
    showToast("Peaceful Mode enabled. Income and progression are paused.");
  } else {
    restorePeacefulModeState(now);
    showToast("Peaceful Mode disabled. Normal simulation and progression resumed.");
  }
  saveState();
  renderUi(now);
  return true;
}

function getContentSettings() {
  return sanitizeContentSettings(state?.contentSettings);
}

function isViolenceAndGoreEnabled() {
  return getContentSettings().violenceAndGoreEnabled;
}

function isTrypophobiaEnabled() {
  return getContentSettings().trypophobiaEnabled === true;
}

function isViolenceEnabled() {
  return !isPeacefulModeEnabled() && isViolenceAndGoreEnabled();
}

function isGoreEnabled() {
  return !isPeacefulModeEnabled() && isViolenceAndGoreEnabled();
}

function getAssetFileName(value = "") {
  return String(value || "")
    .replace(/\?.*$/, "")
    .split(/[\\/]/)
    .pop()
    .trim()
    .toLowerCase();
}

function isGoreOnlyAssetPath(value = "") {
  return FILTERED_GORE_DECOR_KEYS.has(getAssetFileName(value));
}

function shouldPreloadAssetForCurrentContentSettings(path) {
  if (!path) return false;
  return !isGoreOnlyAssetPath(path) || isViolenceAndGoreEnabled();
}

function filterPreloadPathsForCurrentContentSettings(paths) {
  return (Array.isArray(paths) ? paths : []).filter(shouldPreloadAssetForCurrentContentSettings);
}

function isContentGatedAssetPath(path) {
  return isGoreOnlyAssetPath(path);
}

function getContentGatedPreloadPaths() {
  return filterPreloadPathsForCurrentContentSettings(getPlacedDecorPreloadPaths().filter(isContentGatedAssetPath));
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
  const welcomeMailCurrent = Number(incoming.webSurfWelcomeVersion) >= 1
    && Number.isFinite(Number(incoming.webSurfWelcomeSentAt))
    && Number(incoming.webSurfWelcomeSentAt) > 0;
  return incomingVersion !== STATE_VERSION || incomingHealthModelVersion < HEALTH_MODEL_VERSION || !welcomeMailCurrent;
}

// Keep save migrations small, explicit, and non-mutating. New simulation
// systems should add one-time shape conversions here, while sanitizers remain
// the source of truth for malformed or incomplete values.
function migrateSaveSchema(rawState) {
  const source = rawState && typeof rawState === "object" && !Array.isArray(rawState) ? rawState : {};
  const incomingVersion = Number.isFinite(Number(source.version)) ? Number(source.version) : 0;
  let migrated = source;

  // v51 establishes water type as a durable tank attribute. Earlier saves
  // could contain the value, but restore code replaced it with freshwater.
  // Normalize historical aliases without mutating the source snapshot.
  if (incomingVersion < 51 && Array.isArray(source.tanks)) {
    migrated = {
      ...source,
      tanks: source.tanks.map((tank) => {
        if (!tank || typeof tank !== "object" || Array.isArray(tank)) return tank;
        return { ...tank, waterType: normalizeWaterType(tank.waterType, "freshwater") };
      })
    };
  }

  // v52 establishes the durable biological/population schema. Detailed fish
  // defaults are resolved by sanitizeFish so species metadata remains the
  // single source of truth, while tank capacity gets a safe persisted shape.
  if (incomingVersion < 52 && Array.isArray(migrated.tanks)) {
    migrated = {
      ...migrated,
      tanks: migrated.tanks.map((tank) => {
        if (!tank || typeof tank !== "object" || Array.isArray(tank)) return tank;
        return {
          ...tank,
          populationCapacity: clamp(Number(tank.populationCapacity) || 20, 1, 100),
          populationUsage: Math.max(0, Number(tank.populationUsage) || 0)
        };
      })
    };
  }

  // v53 makes Storage a durable suspended simulation state. Older stored fish
  // are explicitly marked frozen; sanitizeFish supplies a safe storedAt value
  // when legacy saves do not have one yet.
  if (incomingVersion < 53 && Array.isArray(migrated.storedFish)) {
    migrated = {
      ...migrated,
      storedFish: migrated.storedFish.map((fish) => (
        fish && typeof fish === "object" && !Array.isArray(fish)
          ? { ...fish, storageState: "stored", storageFrozen: true }
          : fish
      ))
    };
  }

  // v54 introduces functional active/inactive state for living decor. The
  // compatibility value itself is resolved after runtime decor metadata has
  // loaded, so migration preserves any explicit state and sanitizers provide
  // the boolean shape.
  if (incomingVersion < 54 && Array.isArray(migrated.tanks)) {
    migrated = {
      ...migrated,
      tanks: migrated.tanks.map((tank) => {
        if (!tank || typeof tank !== "object" || Array.isArray(tank)) return tank;
        return {
          ...tank,
          placedDecor: Array.isArray(tank.placedDecor)
            ? tank.placedDecor.map((item) => (
                item && typeof item === "object" && !Array.isArray(item)
                  ? { ...item, active: item.active !== false }
                  : item
              ))
            : tank.placedDecor
        };
      })
    };
  }


  // v55 separates Osmotic Stress from contagious disease and adds durable
  // condition/recovery timers used by targeted medicine and Storage pausing.
  if (incomingVersion < 55) {
    const migrateFishCondition = (fish) => {
      if (!fish || typeof fish !== "object" || Array.isArray(fish)) return fish;
      if (fish.diseaseSource !== "salinity-mismatch") return fish;
      const stressProgress = Math.max(1, Number(fish.diseaseProgressMs) || 0);
      return {
        ...fish,
        condition: "osmotic-stress",
        osmoticStressStartedAt: Math.max(0, Number(fish.diseaseInfectedAt) || 0),
        osmoticStressProgressMs: stressProgress,
        osmoticStressLastProgressAt: Math.max(0, Number(fish.diseaseLastProgressAt) || 0),
        osmoticStressLastDamageAt: Math.max(0, Number(fish.diseaseLastDamageAt) || 0),
        diseaseState: "none",
        diseaseType: "",
        diseaseInfectedAt: 0,
        diseaseProgressMs: 0,
        diseaseLastProgressAt: 0,
        diseaseExposureLevel: 0,
        diseaseRecoveryProgressMs: 0,
        diseaseTreatedUntil: 0,
        diseaseLastDamageAt: 0,
        diseaseSource: "",
        diseaseRequiresTreatment: false
      };
    };
    migrated = {
      ...migrated,
      tanks: Array.isArray(migrated.tanks)
        ? migrated.tanks.map((tank) => tank && typeof tank === "object" && !Array.isArray(tank)
          ? { ...tank, fish: Array.isArray(tank.fish) ? tank.fish.map(migrateFishCondition) : tank.fish }
          : tank)
        : migrated.tanks,
      storedFish: Array.isArray(migrated.storedFish) ? migrated.storedFish.map(migrateFishCondition) : migrated.storedFish
    };
  }

  // v56 activates lifespan aging. Fish without the new derived stage marker are
  // left with their existing birthAt when present; sanitizeFish assigns a safe
  // adult starting age for legacy records that never had biological age data.
  // The notification timestamp prevents an elderly fish from announcing the
  // same transition more than once after save/load.
  if (incomingVersion < 56) {
    const migrateFishAging = (fish) => (
      fish && typeof fish === "object" && !Array.isArray(fish)
        ? { ...fish, elderlyNotifiedAt: Math.max(0, Number(fish.elderlyNotifiedAt) || 0) }
        : fish
    );
    migrated = {
      ...migrated,
      tanks: Array.isArray(migrated.tanks)
        ? migrated.tanks.map((tank) => tank && typeof tank === "object" && !Array.isArray(tank)
          ? { ...tank, fish: Array.isArray(tank.fish) ? tank.fish.map(migrateFishAging) : tank.fish }
          : tank)
        : migrated.tanks,
      storedFish: Array.isArray(migrated.storedFish) ? migrated.storedFish.map(migrateFishAging) : migrated.storedFish
    };
  }

  // v57 makes Spawning Food readiness individual and stores a durable
  // pending spawn record after each fish's single successful lifetime spawn.
  if (incomingVersion < 57 && Array.isArray(migrated.tanks)) {
    migrated = {
      ...migrated,
      tanks: migrated.tanks.map((tank) => {
        if (!tank || typeof tank !== "object" || Array.isArray(tank)) return tank;
        return {
          ...tank,
          pendingBreedingEvents: Array.isArray(tank.pendingBreedingEvents) ? tank.pendingBreedingEvents : [],
          fish: Array.isArray(tank.fish)
            ? tank.fish.map((fish) => fish && typeof fish === "object" && !Array.isArray(fish)
              ? {
                  ...fish,
                  breedingReadyUntil: Number.isFinite(Number(fish.breedingReadyUntil)) ? Number(fish.breedingReadyUntil) : 0,
                  spawningFoodUntil: Number.isFinite(Number(fish.spawningFoodUntil)) ? Number(fish.spawningFoodUntil) : 0
                }
              : fish)
            : tank.fish
        };
      })
    };
  }

  // v58 turns pending lifetime spawns into capacity-reserved egg clusters or
  // delayed live births, and stores clutch lineage/inheritance on eggs.
  if (incomingVersion < 58 && Array.isArray(migrated.tanks)) {
    migrated = {
      ...migrated,
      tanks: migrated.tanks.map((tank) => {
        if (!tank || typeof tank !== "object" || Array.isArray(tank)) return tank;
        return {
          ...tank,
          pendingBreedingEvents: Array.isArray(tank.pendingBreedingEvents)
            ? tank.pendingBreedingEvents.map((event) => event && typeof event === "object" && !Array.isArray(event)
              ? { ...event, plannedClutchSize: Math.max(1, Math.floor(Number(event.plannedClutchSize) || 1)) }
              : event)
            : [],
          fishEggs: Array.isArray(tank.fishEggs)
            ? tank.fishEggs.map((egg) => egg && typeof egg === "object" && !Array.isArray(egg)
              ? { ...egg, clutchSize: Math.max(1, Math.floor(Number(egg.clutchSize) || 1)) }
              : egg)
            : []
        };
      })
    };
  }

  // v59 adds a hidden permanent creature-removal ledger. It is intentionally
  // not rendered yet; future UI can consume these normalized records.
  if (incomingVersion < 59) {
    migrated = {
      ...migrated,
      removalHistory: Array.isArray(migrated.removalHistory) ? migrated.removalHistory : []
    };
  }

  // v62 retires the automatic "new-fish carrier" roll. Arrivals are now
  // healthy and unfed; keep only explicitly scripted sources (for example,
  // Davy Jones) or illness acquired through the tank simulation. Clear the
  // artificial arrival illness and its matching pre-fed fields in old saves.
  if (incomingVersion < 62) {
    const clearRetiredArrivalState = (fish) => {
      if (!fish || typeof fish !== "object" || Array.isArray(fish) || fish.diseaseSource !== "new-fish") return fish;
      return {
        ...fish,
        needs: null,
        lastAteAt: 0,
        satiatedUntil: 0,
        lastMealSlotKey: "",
        mealSlotFoodCount: 0,
        diseaseState: "none",
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
        nextGreenBubbleAt: 0
      };
    };
    migrated = {
      ...migrated,
      tanks: Array.isArray(migrated.tanks)
        ? migrated.tanks.map((tank) => tank && typeof tank === "object" && !Array.isArray(tank)
          ? { ...tank, fish: Array.isArray(tank.fish) ? tank.fish.map(clearRetiredArrivalState) : tank.fish }
          : tank)
        : migrated.tanks,
      storedFish: Array.isArray(migrated.storedFish) ? migrated.storedFish.map(clearRetiredArrivalState) : migrated.storedFish
    };
  }

  return migrated;
}


function sanitizeCreatureRemovalHistory(entries) {
  if (!Array.isArray(entries)) return [];
  const seenFishIds = new Set();
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const fishId = String(entry.fishId || "").trim().slice(0, 100);
      if (!fishId || seenFishIds.has(fishId)) return null;
      seenFishIds.add(fishId);
      const name = String(entry.name || "Unnamed").trim().slice(0, 80) || "Unnamed";
      const speciesId = String(entry.speciesId || "").trim().slice(0, 100);
      const speciesName = String(entry.speciesName || "Fish").trim().slice(0, 100) || "Fish";
      const reason = String(entry.reason || "Unknown").trim().slice(0, 80) || "Unknown";
      const ageDays = Math.max(0, Math.floor(Number(entry.ageDays) || 0));
      const removedAt = Math.max(0, Number(entry.removedAt) || 0);
      const rehomeValue = Math.max(0, Math.floor(Number(entry.rehomeValue) || 0));
      const source = String(entry.source || "removal").trim().slice(0, 40) || "removal";
      const summary = String(entry.summary || `${name} - ${speciesName} - ${ageDays} days - ${reason}`).trim().slice(0, 260);
      return {
        id: String(entry.id || `removed-${fishId}-${removedAt}`).trim().slice(0, 140),
        fishId,
        name,
        speciesId,
        speciesName,
        ageDays,
        reason,
        removedAt,
        source,
        rehomeValue,
        summary
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.removedAt - left.removedAt)
    .slice(0, MAX_CREATURE_REMOVAL_HISTORY);
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
  const sanitizeFishEntry = (fish) => sanitizeFish(fish, { legacyHealthModel, now, storageState: "tank" });
  const incomingTank = rawTank && typeof rawTank === "object" ? rawTank : {};
  const typeId = getTankTypeMeta("rectangular").id;
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
    waterType: normalizeWaterType(incomingTank.waterType, "freshwater"),
    populationCapacity: clamp(Number(incomingTank.populationCapacity) || 20, 1, 100),
    populationUsage: Math.max(0, Number(incomingTank.populationUsage) || 0),
    setupPending: incomingTank.setupPending === true,
    fish: Array.isArray(incomingTank.fish) ? incomingTank.fish.map((fish) => sanitizeFish(fish, { legacyHealthModel, now, storageState: "tank" })).filter(Boolean) : [],
    feedHistory: sanitizeHistory(incomingTank.feedHistory),
    pendingPoops: Array.isArray(incomingTank.pendingPoops) ? incomingTank.pendingPoops.map(sanitizePoop).filter(Boolean) : [],
    poops: Array.isArray(incomingTank.poops) ? incomingTank.poops.map(sanitizePoop).filter(Boolean) : [],
    fishEggs: Array.isArray(incomingTank.fishEggs) ? incomingTank.fishEggs.map(sanitizeFishEgg).filter(Boolean) : [],
    pendingBreedingEvents: Array.isArray(incomingTank.pendingBreedingEvents) ? incomingTank.pendingBreedingEvents.map(sanitizePendingBreedingEvent).filter(Boolean) : [],
    placedDecor: Array.isArray(incomingTank.placedDecor) ? incomingTank.placedDecor.map(sanitizePlacedDecor).filter(Boolean) : [],
    freeDecorPlacement: incomingTank.freeDecorPlacement === true,
    customGravelEnabled: true,
    customGravelLayerColors: sanitizeCustomGravelLayerColors(incomingTank.customGravelLayerColors),
    customGravelLayerColorize: sanitizeCustomGravelLayerColorizeSettings(incomingTank.customGravelLayerColorize),
    substrateStyle: normalizeSubstrateStyle(incomingTank.substrateStyle, "custom"),
    gravelPalette: sanitizeGravelPalette(incomingTank.gravelPalette),
    gravelSeed: Number.isFinite(incomingTank.gravelSeed) ? Math.abs(Math.floor(incomingTank.gravelSeed)) : undefined,
    gravelHillSeed: Number.isFinite(incomingTank.gravelHillSeed) ? Math.abs(Math.floor(incomingTank.gravelHillSeed)) : undefined,
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
    autoDispenser: createDefaultAutoDispenserState(incomingTank.autoDispenser),
    selectedBubbleAsset: runtime.bubbleMap.has(incomingTank.selectedBubbleAsset)
      ? incomingTank.selectedBubbleAsset
      : (runtime.bubbleCatalog[0]?.key || null),
    lastCleanedAt: Number.isFinite(incomingTank.lastCleanedAt) ? incomingTank.lastCleanedAt : now,
    cleaningIncomeDayKey: typeof incomingTank.cleaningIncomeDayKey === "string" ? incomingTank.cleaningIncomeDayKey : "",
    cleaningIncomeCredit: Number(incomingTank.cleaningIncomeCredit) || 0,
    cleaningIncomeCoinsEarned: Number(incomingTank.cleaningIncomeCoinsEarned) || 0,
    otocinclusCoinFindDayKey: typeof incomingTank.otocinclusCoinFindDayKey === "string" ? incomingTank.otocinclusCoinFindDayKey : "",
    otocinclusCoinsFoundToday: clamp(
      Math.floor(Number(incomingTank.otocinclusCoinsFoundToday) || 0),
      0,
      OTOCINCLUS_DAILY_COIN_FIND_CAP
    ),
    otocinclusCoinFindLastAttemptAt: Number.isFinite(Number(incomingTank.otocinclusCoinFindLastAttemptAt))
      ? Number(incomingTank.otocinclusCoinFindLastAttemptAt)
      : 0,
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
    setupPending: options.setupPending === true,
    fish: incoming?.fish,
    feedHistory: incoming?.feedHistory,
    pendingPoops: incoming?.pendingPoops,
    poops: incoming?.poops,
    fishEggs: incoming?.fishEggs,
    pendingBreedingEvents: incoming?.pendingBreedingEvents,
    placedDecor: incoming?.placedDecor,
    customGravelEnabled: true,
    customGravelLayerColors: incoming?.customGravelLayerColors,
    customGravelLayerColorize: incoming?.customGravelLayerColorize,
    substrateStyle: incoming?.substrateStyle || "custom",
    gravelPalette: incoming?.gravelPalette,
    gravelSeed: incoming?.gravelSeed,
    gravelHillSeed: incoming?.gravelHillSeed,
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
    autoDispenser: incoming?.autoDispenser,
    selectedBubbleAsset: incoming?.selectedBubbleAsset,
    lastCleanedAt: incoming?.lastCleanedAt,
    cleaningIncomeDayKey: incoming?.cleaningIncomeDayKey,
    cleaningIncomeCredit: incoming?.cleaningIncomeCredit,
    cleaningIncomeCoinsEarned: incoming?.cleaningIncomeCoinsEarned,
    otocinclusCoinFindDayKey: incoming?.otocinclusCoinFindDayKey,
    otocinclusCoinsFoundToday: incoming?.otocinclusCoinsFoundToday,
    otocinclusCoinFindLastAttemptAt: incoming?.otocinclusCoinFindLastAttemptAt,
    lastSimulatedAt: incoming?.lastSimulatedAt,
    lastCorpseSicknessAt: incoming?.lastCorpseSicknessAt,
    lastGravelCoinFoundAt: incoming?.lastGravelCoinFoundAt,
    events: incoming?.events
  }, options);
}


function matchesLegacyDefaultStarterTankAppearance(tank, index) {
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

function countUniqueProteusCorpseDonations(rawDigests) {
  const fishIds = new Set();
  for (const digest of sanitizeProteusCorpseDonationDigests(rawDigests)) {
    for (const fish of digest.fish || []) {
      if (fish?.fishId) fishIds.add(fish.fishId);
    }
  }
  return fishIds.size;
}

function reconcileState(rawState) {
  const now = Date.now();
  const isBrandNewGame = !rawState || typeof rawState !== "object";
  const incoming = migrateSaveSchema(rawState);
  const base = {
    version: STATE_VERSION,
    healthModelVersion: HEALTH_MODEL_VERSION,
    gameCreatedAt: now,
    webSurfWelcomeVersion: 1,
    webSurfWelcomeSentAt: now,
    proteusDiscovered: false,
    proteusDiscoveredAt: 0,
    coins: STARTING_COINS,
    walletTransactions: [],
    lifetimeDeaths: 0,
    accountProfile: sanitizeAccountProfile(null),
    purchaseHistory: [],
    webSurfMailStates: {},
    webSurfSenderStates: {},
    webSurfSentEmails: [],
    proteusCorpseDonationDigests: [],
    proteusCorpseDonationCount: 0,
    proteusZombieFishUnlockedAt: 0,
    proteusZombieFishOfferAt: 0,
    proteusZombieFishAuthenticatedAt: 0,
    proteusZombieFishClaimedAt: 0,
    engineeredSpecimenDesignCredits: 0,
    engineeredSpecimenDesignOrderIds: [],
    engineeredSpecimenCompletedOrderIds: [],
    engineeredSpecimenDesignStartedOrderIds: [],
    bubbleBodegaRescueOffer: sanitizeBubbleBodegaRescueOffer(null),
    davyJonesLockerUnlocked: false,
    davyJonesLockerUnlockedAt: 0,
    mealHistory: {},
    lastGravelCoinFoundAt: 0,
    unlockedFishSpecies: [],
    unlockedDecorKeys: [],
    storedFish: [],
    decorInventory: {},
    savedDecorLayouts: [],
    customDecorAssets: {},
    customFishAssets: {},
    customBackgroundAssets: {},
    decorScaleDefaults: {},
    fishScaleDefaults: {},
    tanks: [createTankState({ now, name: buildDefaultTankName(0) })],
    machinery: [],
    storedSubmarine: null,
    storedSubmarines: [],
    submarineOwned: false,
    storedBoat: null,
    storedBoats: [],
    boatOwned: false,
    activeTankId: null,
    ownedBackgroundInventory: sanitizeOwnedBackgroundInventory(null),
    ownedSubstrateInventory: sanitizeOwnedSubstrateInventory(null),
    foodInventory: getDefaultFoodInventory(),
    medicineInventory: getDefaultMedicineInventory(),
    waterTreatmentInventory: { freshwater: 0, saltwater: 0 },
    dailyBonus: buildDefaultDailyBonusState(),
    notificationCenter: buildDefaultNotificationCenterState(),
    tutorial: buildDefaultTutorialState(),
    peacefulMode: sanitizePeacefulModeState(null),
    uiSettings: sanitizeUiSettings(null),
    contentSettings: sanitizeContentSettings(null),
    boroughTravelWalls: {},
    boroughHappenings: [],
    boroughEvents: [],
    memorialHistory: [],
    removalHistory: [],
    events: []
  };

  const incomingVersion = Number.isFinite(incoming.version) ? incoming.version : 0;
  const incomingHealthModelVersion = Number.isFinite(incoming.healthModelVersion) ? incoming.healthModelVersion : 1;
  const legacyHealthModel = incomingHealthModelVersion < LEGACY_HEALTH_SCALE_MODEL_VERSION;
  const incomingCustomDecorAssets = sanitizeCustomDecorAssets(incoming.customDecorAssets);
  syncRuntimeCustomDecorAssetsFromState({ customDecorAssets: incomingCustomDecorAssets });
  const incomingCustomFishAssets = sanitizeCustomFishAssets(incoming.customFishAssets);
  syncRuntimeCustomFishAssetsFromState({ customFishAssets: incomingCustomFishAssets });
  const incomingCustomBackgroundAssets = sanitizeCustomBackgroundAssets(incoming.customBackgroundAssets);
  syncRuntimeCustomBackgroundAssetsFromState({ customBackgroundAssets: incomingCustomBackgroundAssets });
  const sanitizeFishEntry = (fish) => sanitizeFish(fish, { legacyHealthModel });
  const incomingHasTanks = Array.isArray(incoming.tanks) && incoming.tanks.length > 0;
  const tanks = incomingHasTanks
    ? incoming.tanks.map((tank) => sanitizeTankStateSnapshot(tank, { now, legacyHealthModel })).filter(Boolean)
    : [buildLegacyTankFromIncoming(incoming, { now, legacyHealthModel, setupPending: isBrandNewGame })];
  normalizeAquariumSectionGrid(tanks);
  const machinery = sanitizeMachineryState(incoming.machinery, tanks, now);
  const storedSubmarines = (Array.isArray(incoming.storedSubmarines)
    ? incoming.storedSubmarines
    : [incoming.storedSubmarine]
  ).map((item) => sanitizeStoredSubmarineState(item, now)).filter(Boolean);
  const storedBoats = (Array.isArray(incoming.storedBoats)
    ? incoming.storedBoats
    : [incoming.storedBoat]
  ).map((item) => sanitizeStoredBoatState(item, now)).filter(Boolean);
  const storedSubmarine = storedSubmarines[0] || null;
  const storedBoat = storedBoats[0] || null;

  const nextState = {
    ...base,
    gameCreatedAt: Number.isFinite(Number(incoming.gameCreatedAt))
      ? Math.max(0, Number(incoming.gameCreatedAt))
      : (isBrandNewGame ? base.gameCreatedAt : 0),
    webSurfWelcomeVersion: 1,
    webSurfWelcomeSentAt: Number(incoming.webSurfWelcomeVersion) >= 1
      && Number.isFinite(Number(incoming.webSurfWelcomeSentAt))
      && Number(incoming.webSurfWelcomeSentAt) > 0
      ? Number(incoming.webSurfWelcomeSentAt)
      : now,
    proteusDiscovered: incoming.proteusDiscovered === true,
    proteusDiscoveredAt: incoming.proteusDiscovered === true && Number.isFinite(Number(incoming.proteusDiscoveredAt))
      ? Math.max(0, Number(incoming.proteusDiscoveredAt))
      : 0,
    coins: Number.isFinite(incoming.coins) ? clamp(Math.floor(incoming.coins), 0, MAX_WALLET_COINS) : base.coins,
    walletTransactions: Array.isArray(incoming.walletTransactions)
      ? incoming.walletTransactions.map((entry) => ({
        id: typeof entry?.id === "string" ? entry.id.slice(0, 80) : createId("receipt"),
        amount: clamp(Math.floor(Math.abs(Number(entry?.amount) || 0)), 0, MAX_WALLET_COINS),
        direction: entry?.direction === "debit" ? "debit" : entry?.direction === "neutral" ? "neutral" : "credit",
        label: typeof entry?.label === "string" ? entry.label.slice(0, 180) : "Aquarium activity",
        place: typeof entry?.place === "string" ? entry.place.replace(/tankazon/ig, "BubbleBodega").slice(0, 80) : "Aquarium",
        time: Number.isFinite(Number(entry?.time)) ? Number(entry.time) : now,
        orderId: typeof entry?.orderId === "string" ? entry.orderId.slice(0, 80) : ""
      })).filter((entry) => entry.amount > 0 || entry.direction === "neutral").sort((left, right) => right.time - left.time).slice(0, 60)
      : base.walletTransactions,
    lifetimeDeaths: Number.isFinite(incoming.lifetimeDeaths) ? Math.max(0, Math.floor(incoming.lifetimeDeaths)) : base.lifetimeDeaths,
    accountProfile: sanitizeAccountProfile(incoming.accountProfile),
    purchaseHistory: sanitizePurchaseHistory(incoming.purchaseHistory),
    webSurfMailStates: sanitizeWebSurfMailStates(incoming.webSurfMailStates),
    webSurfSenderStates: sanitizeWebSurfSenderStates(incoming.webSurfSenderStates),
    webSurfSentEmails: sanitizeWebSurfSentEmails(incoming.webSurfSentEmails),
    proteusCorpseDonationDigests: sanitizeProteusCorpseDonationDigests(incoming.proteusCorpseDonationDigests),
    proteusCorpseDonationCount: Math.max(
      0,
      Math.floor(
        Number.isFinite(Number(incoming.proteusCorpseDonationCount))
          ? Number(incoming.proteusCorpseDonationCount)
          : countUniqueProteusCorpseDonations(incoming.proteusCorpseDonationDigests)
      )
    ),
    proteusZombieFishUnlockedAt: Number.isFinite(Number(incoming.proteusZombieFishUnlockedAt))
      ? Math.max(0, Number(incoming.proteusZombieFishUnlockedAt))
      : 0,
    proteusZombieFishOfferAt: Number.isFinite(Number(incoming.proteusZombieFishOfferAt))
      ? Math.max(0, Number(incoming.proteusZombieFishOfferAt))
      : 0,
    proteusZombieFishAuthenticatedAt: Number.isFinite(Number(incoming.proteusZombieFishAuthenticatedAt))
      ? Math.max(0, Number(incoming.proteusZombieFishAuthenticatedAt))
      : 0,
    proteusZombieFishClaimedAt: Number.isFinite(Number(incoming.proteusZombieFishClaimedAt))
      ? Math.max(0, Number(incoming.proteusZombieFishClaimedAt))
      : 0,
    engineeredSpecimenDesignCredits: Math.max(0, Math.floor(Number(incoming.engineeredSpecimenDesignCredits) || 0)),
    engineeredSpecimenDesignOrderIds: Array.isArray(incoming.engineeredSpecimenDesignOrderIds)
      ? incoming.engineeredSpecimenDesignOrderIds.filter((id) => typeof id === "string").slice(0, 20)
      : [],
    engineeredSpecimenCompletedOrderIds: Array.isArray(incoming.engineeredSpecimenCompletedOrderIds)
      ? incoming.engineeredSpecimenCompletedOrderIds.filter((id) => typeof id === "string").slice(0, 20)
      : [],
    engineeredSpecimenDesignStartedOrderIds: Array.isArray(incoming.engineeredSpecimenDesignStartedOrderIds)
      ? incoming.engineeredSpecimenDesignStartedOrderIds.filter((id) => typeof id === "string").slice(0, 20)
      : [],
    bubbleBodegaRescueOffer: sanitizeBubbleBodegaRescueOffer(incoming.bubbleBodegaRescueOffer),
    davyJonesLockerUnlocked: incoming.davyJonesLockerUnlocked === true,
    davyJonesLockerUnlockedAt: Number.isFinite(Number(incoming.davyJonesLockerUnlockedAt)) ? Math.max(0, Number(incoming.davyJonesLockerUnlockedAt)) : 0,
    mealHistory: mergeUniversalMealHistories(incoming.mealHistory, ...tanks.map((tank) => tank.feedHistory)),
    lastGravelCoinFoundAt: Math.max(
      Number(incoming.lastGravelCoinFoundAt) || 0,
      ...tanks.map((tank) => Number(tank.lastGravelCoinFoundAt) || 0)
    ),
    unlockedFishSpecies: sanitizeUnlockedFishSpecies(incoming.unlockedFishSpecies),
    unlockedDecorKeys: sanitizeUnlockedDecorKeys(incoming.unlockedDecorKeys),
    storedFish: Array.isArray(incoming.storedFish)
      ? incoming.storedFish.map((fish) => sanitizeFish(fish, { legacyHealthModel, now, storageState: "stored" })).filter(Boolean)
      : [],
    decorInventory: sanitizeDecorInventory(incoming.decorInventory),
    savedDecorLayouts: sanitizeSavedDecorLayouts(incoming.savedDecorLayouts),
    customDecorAssets: incomingCustomDecorAssets,
    customFishAssets: incomingCustomFishAssets,
    customBackgroundAssets: incomingCustomBackgroundAssets,
    decorScaleDefaults: sanitizeDecorScaleDefaults(incoming.decorScaleDefaults),
    fishScaleDefaults: sanitizeFishScaleDefaults(incoming.fishScaleDefaults),
    tanks,
    machinery,
    storedSubmarine,
    storedSubmarines,
    submarineOwned: incoming.submarineOwned === true || storedSubmarines.length > 0 || machinery.some((item) => item?.type === MACHINERY_TYPE_SUBMARINE),
    storedBoat,
    storedBoats,
    boatOwned: incoming.boatOwned === true || storedBoats.length > 0 || machinery.some((item) => item?.type === MACHINERY_TYPE_BOAT),
    activeTankId: typeof incoming.activeTankId === "string" && tanks.some((tank) => tank.id === incoming.activeTankId)
      ? incoming.activeTankId
      : (tanks[0]?.id || null),
    ownedBackgroundInventory: sanitizeOwnedBackgroundInventory(
      incoming.ownedBackgroundInventory ?? incoming.ownedBackgrounds,
      tanks.map((tank) => tank.selectedBackground)
    ),
    ownedSubstrateInventory: sanitizeOwnedSubstrateInventory(
      incoming.ownedSubstrateInventory ?? incoming.ownedSubstrates,
      tanks.map((tank) => normalizeSubstrateStyle(tank.substrateStyle, "custom") === "auto"
        ? (normalizeWaterType(tank.waterType, "freshwater") === "saltwater" ? "sand" : "river-rock")
        : tank.substrateStyle)
    ),
    foodInventory: Object.fromEntries(getFoodCatalog().map((food) => [
      food.id,
      Math.max(0, Number(sanitizeInventory(incoming.foodInventory)[food.id]) || 0)
    ])),
    medicineInventory: {
      ...getDefaultMedicineInventory(),
      ...sanitizeInventory(incoming.medicineInventory)
    },
    waterTreatmentInventory: {
      freshwater: Math.max(0, Math.floor(Number(incoming.waterTreatmentInventory?.freshwater) || 0)),
      saltwater: Math.max(0, Math.floor(Number(incoming.waterTreatmentInventory?.saltwater) || 0))
    },
    dailyBonus: sanitizeDailyBonusState(incoming.dailyBonus),
    notificationCenter: sanitizeNotificationCenterState(incoming.notificationCenter),
    tutorial: buildDefaultTutorialState(),
    healthModelVersion: HEALTH_MODEL_VERSION,
    peacefulMode: sanitizePeacefulModeState(incoming.peacefulMode),
    uiSettings: sanitizeUiSettings(incoming.uiSettings),
    contentSettings: sanitizeContentSettings(incoming.contentSettings),
    boroughTravelWalls: incoming.boroughTravelWalls && typeof incoming.boroughTravelWalls === "object"
      ? Object.fromEntries(Object.entries(incoming.boroughTravelWalls).filter(([, blocked]) => blocked === true))
      : {},
    boroughHappenings: sanitizeBoroughHappenings(incoming.boroughHappenings),
    boroughEvents: sanitizeBoroughEventHistory(incoming.boroughEvents, tanks),
    memorialHistory: sanitizeMemorialHistory(incoming.memorialHistory),
    removalHistory: sanitizeCreatureRemovalHistory(incoming.removalHistory),
    version: STATE_VERSION
  };

  if (Number.isFinite(Number(incoming.lastCorpseSicknessAt)) && !tanks.some((tank) => Number.isFinite(Number(tank.lastCorpseSicknessAt)))) {
    const legacyTank = tanks.find((tank) => tank.id === incoming.activeTankId) || tanks[0];
    if (legacyTank) {
      legacyTank.lastCorpseSicknessAt = Number(incoming.lastCorpseSicknessAt);
    }
  }

  assignFallbackTankNames(nextState);
  installTankStateAccessors(nextState);

  for (const tank of nextState.tanks) {
    tank.customGravelEnabled = true;
  }

  const hasStartedPlaying = getAllTankFish(nextState).length
    || nextState.submarineOwned
    || nextState.boatOwned
    || nextState.machinery.length
    || nextState.storedFish.length
    || getAllPlacedDecor(nextState).length
    || Object.keys(nextState.decorInventory).length
    || nextState.tanks.some((tank) => (
      Object.keys(tank.feedHistory || {}).length
      || tank.pendingPoops.length
      || tank.poops.length
    ))
    || Object.keys(nextState.ownedBackgroundInventory).some((key) => !DEFAULT_OWNED_BACKGROUND_KEYS.includes(key))
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

  nextState.decorScaleDefaults = migrateLegacyHalloweenDecorScaleDefaults(nextState.decorScaleDefaults, incomingVersion);

  if (incomingHealthModelVersion < HEALTH_MODEL_VERSION) {
    for (const tank of nextState.tanks) {
      tank.fish = tank.fish.map((fish) => rebalanceFishHealthForCurrentModel(fish));
    }
    nextState.storedFish = nextState.storedFish.map((fish) => rebalanceFishHealthForCurrentModel(fish));
  }

  if (incomingVersion < 36) {
    nextState.tanks.forEach((tank, index) => {
      // Refresh untouched starter tanks that still match the old or partially-updated visual defaults.
      if (matchesLegacyDefaultStarterTankAppearance(tank, index)) {
        applyDefaultStarterTankAppearance(tank);
      }
    });
  }

  const corpseCount = getAllTankFish(nextState).filter((fish) => isFishDead(fish)).length
    + nextState.storedFish.filter((fish) => isFishDead(fish)).length;

  if (!Number.isFinite(incoming.lifetimeDeaths) || nextState.lifetimeDeaths < corpseCount) {
    nextState.lifetimeDeaths = corpseCount;
  }

  // Progression locks are purchase permissions, not ownership permissions.
  // Legacy saves used to permanently unlock a species merely because the player
  // already owned one. Strip those stale milestone unlocks and rebuild them only
  // from milestones the save has actually earned. Existing fish remain untouched.
  const milestoneFishUnlockIds = new Set(
    PROGRESSION_MILESTONES.flatMap((milestone) => milestone.unlocks || [])
  );
  const nonMilestoneFishUnlocks = nextState.unlockedFishSpecies
    .filter((speciesId) => !milestoneFishUnlockIds.has(speciesId));
  nextState.unlockedFishSpecies = sanitizeUnlockedFishSpecies([
    ...nonMilestoneFishUnlocks,
    ...PROGRESSION_MILESTONES
      .filter((milestone) => nextState.dailyBonus?.milestones?.[milestone.id])
      .flatMap((milestone) => milestone.unlocks || [])
  ]);
  nextState.unlockedDecorKeys = sanitizeUnlockedDecorKeys([
    ...nextState.unlockedDecorKeys,
    ...Object.keys(nextState.decorInventory || {}),
    ...getAllPlacedDecor(nextState).map((decor) => decor?.decorKey),
    ...(Object.keys(nextState.customDecorAssets || {}).length ? [CUSTOM_DECOR_SHOP_KEY, CUSTOM_HIDE_SHOP_KEY] : [])
  ]);
  delete nextState.foodInventory.upgraded;

  if (!(Number(nextState.proteusZombieFishAuthenticatedAt) > 0) && Number(nextState.proteusZombieFishClaimedAt) > 0) {
    // Saves from the first Z-01 implementation could already own the specimen
    // before the explicit classified authentication gate existed. Preserve that access.
    nextState.proteusZombieFishAuthenticatedAt = Number(nextState.proteusZombieFishClaimedAt);
  }

  if (
    nextState.proteusCorpseDonationCount >= PROTEUS_ZOMBIE_FISH_DONATION_UNLOCK_COUNT
    && !(Number(nextState.proteusZombieFishUnlockedAt) > 0)
  ) {
    const latestDonationAt = nextState.proteusCorpseDonationDigests
      .flatMap((digest) => digest.fish || [])
      .reduce((latest, fish) => Math.max(latest, Number(fish?.donatedAt) || 0), 0);
    const unlockedAt = latestDonationAt || now;
    nextState.proteusZombieFishUnlockedAt = unlockedAt;
    nextState.proteusZombieFishOfferAt = Math.max(
      Number(nextState.proteusZombieFishOfferAt) || 0,
      getNextProteusCorpseDonationMorning(unlockedAt) + PROTEUS_ZOMBIE_FISH_AUTHORIZATION_DELAY_MS
    );
    nextState.proteusDiscovered = true;
    if (!(Number(nextState.proteusDiscoveredAt) > 0)) nextState.proteusDiscoveredAt = unlockedAt;
  }

  if (!nextState.tanks.some((tank) => tank.events.length)) {
    nextState.tanks[0].events = [
      {
        id: createId("event"),
        time: now,
        text: "Welcome to Bubble Borough. Buy your first fish, and don't forget the food."
      }
    ];
  }

  pruneState(now, nextState);
  installTankStateAccessors(nextState);
  for (const tank of nextState.tanks || []) {
    if (typeof syncTankLivingDecorActivity === "function") {
      syncTankLivingDecorActivity(tank);
    }
  }

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
  if (typeof syncDeadFishCorpsePersistenceForSave === "function") {
    syncDeadFishCorpsePersistenceForSave(timestamp);
  }
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
  await preloadImages([
    ...getPlacedDecorPreloadPaths(),
    ...getOwnedFishPreloadPaths(),
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
