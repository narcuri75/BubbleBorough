// Source fragment: tank/appearance-controls.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function setCustomGravelLayerColor(layerIndex, color) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor || !Number.isFinite(layerIndex)) {
    return;
  }

  const nextIndex = clamp(Math.floor(layerIndex), 0, CUSTOM_GRAVEL_LAYER_COUNT - 1);
  const nextColors = getActiveCustomGravelLayerColors();
  if (nextColors[nextIndex] === normalizedColor) {
    return;
  }

  nextColors[nextIndex] = normalizedColor;
  state.customGravelLayerColors = nextColors;
  saveState();
  renderUi(Date.now());
}

function setCustomGravelLayerColorize(layerIndex, colorize) {
  if (!Number.isFinite(layerIndex)) {
    return;
  }

  const nextIndex = clamp(Math.floor(layerIndex), 0, CUSTOM_GRAVEL_LAYER_COUNT - 1);
  const nextSettings = getActiveCustomGravelLayerColorizeSettings();
  const nextColorize = normalizeDecorColorizeSetting(colorize);
  if (nextSettings[nextIndex] === nextColorize) {
    return;
  }

  nextSettings[nextIndex] = nextColorize;
  state.customGravelLayerColors = getActiveCustomGravelLayerColors();
  state.customGravelLayerColorize = nextSettings;
  saveState();
  renderUi(Date.now());
}

function setSolidBackgroundColor(color) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return;
  }

  if (state.solidBackgroundColor === normalizedColor) {
    return;
  }

  state.solidBackgroundColor = normalizedColor;
  saveState();
  renderUi(Date.now());
}

function setGradientBackgroundColor(role, color) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return;
  }

  const key = role === "end" ? "gradientBackgroundEndColor" : "gradientBackgroundStartColor";
  if (state[key] === normalizedColor) {
    return;
  }

  state[key] = normalizedColor;
  saveState();
  renderUi(Date.now());
}

function setAnimatedBackgroundColor(role, color) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return;
  }

  const key = role === "surface"
    ? "animatedBackgroundTopColor"
    : role === "surfaceBloom"
      ? "animatedBackgroundSurfaceBloomColor"
      : role === "shadowBloom"
        ? "animatedBackgroundShadowBloomColor"
        : role === "mid"
          ? "animatedBackgroundMidColor"
          : role === "deep" || role === "bottom"
            ? "animatedBackgroundBottomColor"
            : role === "abyss"
              ? "animatedBackgroundAbyssColor"
              : role === "highlight"
                ? "animatedBackgroundHighlightColor"
                : role === "driftA"
                  ? "animatedBackgroundDriftColorA"
                  : role === "driftB"
                    ? "animatedBackgroundDriftColorB"
                    : role === "driftC"
                      ? "animatedBackgroundDriftColorC"
                      : "animatedBackgroundTopColor";
  if (state[key] === normalizedColor) {
    return;
  }

  state[key] = normalizedColor;
  saveState();
  renderUi(Date.now());
}

function resetAnimatedBackgroundColors() {
  const nextDefaults = sanitizeAnimatedBackgroundColors({
    top: DEFAULT_ANIMATED_BACKGROUND_TOP_COLOR,
    mid: DEFAULT_ANIMATED_BACKGROUND_MID_COLOR,
    bottom: DEFAULT_ANIMATED_BACKGROUND_BOTTOM_COLOR,
    surfaceBloom: DEFAULT_ANIMATED_BACKGROUND_SURFACE_BLOOM_COLOR,
    shadowBloom: DEFAULT_ANIMATED_BACKGROUND_SHADOW_BLOOM_COLOR,
    abyss: DEFAULT_ANIMATED_BACKGROUND_ABYSS_COLOR,
    highlight: DEFAULT_ANIMATED_BACKGROUND_HIGHLIGHT_COLOR,
    driftA: DEFAULT_ANIMATED_BACKGROUND_DRIFT_A_COLOR,
    driftB: DEFAULT_ANIMATED_BACKGROUND_DRIFT_B_COLOR,
    driftC: DEFAULT_ANIMATED_BACKGROUND_DRIFT_C_COLOR
  });

  const changed = state.animatedBackgroundTopColor !== nextDefaults.surface
    || state.animatedBackgroundMidColor !== nextDefaults.mid
    || state.animatedBackgroundBottomColor !== nextDefaults.deep
    || state.animatedBackgroundSurfaceBloomColor !== nextDefaults.surfaceBloom
    || state.animatedBackgroundShadowBloomColor !== nextDefaults.shadowBloom
    || state.animatedBackgroundAbyssColor !== nextDefaults.abyss
    || state.animatedBackgroundHighlightColor !== nextDefaults.highlight
    || state.animatedBackgroundDriftColorA !== nextDefaults.driftA
    || state.animatedBackgroundDriftColorB !== nextDefaults.driftB
    || state.animatedBackgroundDriftColorC !== nextDefaults.driftC;
  if (!changed) {
    return;
  }

  state.animatedBackgroundTopColor = nextDefaults.surface;
  state.animatedBackgroundMidColor = nextDefaults.mid;
  state.animatedBackgroundBottomColor = nextDefaults.deep;
  state.animatedBackgroundSurfaceBloomColor = nextDefaults.surfaceBloom;
  state.animatedBackgroundShadowBloomColor = nextDefaults.shadowBloom;
  state.animatedBackgroundAbyssColor = nextDefaults.abyss;
  state.animatedBackgroundHighlightColor = nextDefaults.highlight;
  state.animatedBackgroundDriftColorA = nextDefaults.driftA;
  state.animatedBackgroundDriftColorB = nextDefaults.driftB;
  state.animatedBackgroundDriftColorC = nextDefaults.driftC;
  saveState();
  renderUi(Date.now());
}

function enableCustomBackgroundMode(mode) {
  const nextMode = normalizeCustomBackgroundMode(mode);
  const alreadyEnabled = isCustomBackgroundEnabled();
  if (alreadyEnabled && state.customBackgroundMode === nextMode) {
    return;
  }

  state.customBackgroundMode = nextMode;
  state.selectedBackground = NONE_BACKGROUND_ASSET_KEY;
  saveState();
  renderUi(Date.now());
}

function disableCustomBackground() {
  const fallbackBackgroundKey = getPreferredImageBackgroundKey();
  if (!fallbackBackgroundKey) {
    return;
  }

  selectBackground(fallbackBackgroundKey);
}

function setSolidBackgroundEnabled(enabled) {
  if (enabled) {
    enableCustomBackgroundMode(CUSTOM_BACKGROUND_MODE_SOLID);
    return;
  }

  if (isSolidBackgroundEnabled()) {
    disableCustomBackground();
  }
}

function setGradientBackgroundEnabled(enabled) {
  if (enabled) {
    enableCustomBackgroundMode(CUSTOM_BACKGROUND_MODE_GRADIENT);
    return;
  }

  if (isGradientBackgroundEnabled()) {
    disableCustomBackground();
  }
}

function setAnimatedBackgroundEnabled(enabled) {
  if (enabled) {
    enableCustomBackgroundMode(CUSTOM_BACKGROUND_MODE_ANIMATED);
    return;
  }

  if (isAnimatedBackgroundEnabled()) {
    disableCustomBackground();
  }
}

function clearLocalBackgroundImage() {
  if (!hasLocalBackgroundImage()) {
    return;
  }

  state.localBackgroundImageDataUrl = "";
  state.localBackgroundImageRefId = "";
  setRuntimeImageSource(getCurrentTank(), "runtimeLocalBackgroundImageUrl", "");
  if (isLocalImageBackgroundKey(state.selectedBackground)) {
    const fallbackBackgroundKey = getPreferredImageBackgroundKey();
    state.selectedBackground = fallbackBackgroundKey || DEFAULT_BACKGROUND_ASSET_KEY;
  }
  saveState();
  renderUi(Date.now());
}

function selectBackground(backgroundKey) {
  if (!runtime.backgroundMap.has(backgroundKey)) {
    return;
  }

  if (isLocalImageBackgroundKey(backgroundKey) && !hasLocalBackgroundImage()) {
    openLocalBackgroundPicker();
    return;
  }

  if (!isBackgroundOwned(backgroundKey)) {
    showToast("Unlock this background in the Tank shop first.");
    return;
  }

  if (state.selectedBackground === backgroundKey) {
    return;
  }

  state.selectedBackground = backgroundKey;
  pushEvent(`Switched the tank background to ${runtime.backgroundMap.get(backgroundKey).name}.`, Date.now());
  saveState();
  renderUi(Date.now());
}

function selectTankAsset(tankKey) {
  if (!runtime.tankMap.has(tankKey)) {
    return;
  }

  state.selectedTankAsset = tankKey;
  pushEvent(`Swapped the tank shell to ${runtime.tankMap.get(tankKey).name}.`, Date.now());
  saveState();
  renderUi(Date.now());
}

function selectFilterAsset(filterKey) {
  if (!runtime.filterMap.has(filterKey)) {
    return;
  }

  if (!tankSupportsFilters(getCurrentTank())) {
    showToast("This tank does not support filters.");
    return;
  }

  if (!isFilterOwned(filterKey)) {
    showToast("Buy this filter in the Tank shop first.");
    return;
  }

  if (state.selectedFilterAsset === filterKey) {
    return;
  }

  if (filterKey !== getDefaultFilterKey() && getAvailableFilterCount(filterKey) <= 0) {
    showToast("All copies of that filter are already in use.");
    return;
  }

  const now = Date.now();
  preserveTankDirtinessThroughChange(now, () => {
    state.selectedFilterAsset = filterKey;
  });
  const filter = runtime.filterMap.get(filterKey);
  pushEvent(
    `Equipped ${filter.name}. At the current tank load, the tank now takes about ${formatDuration(getFilterMaxDirtyDurationMs(filterKey))} to hit maximum dirtiness.`,
    now
  );
  saveState();
  renderUi(now);
}

function setUvLightInstalled(installed) {
  if (!isUvLightFeatureEnabled()) {
    showToast("UV light is disabled.");
    return;
  }

  if (!isUvLightOwned()) {
    showToast("Buy the UV light in the Tank shop first.");
    return;
  }

  const nextInstalled = Boolean(installed);
  if (state.uvLightInstalled === nextInstalled) {
    return;
  }

  const now = Date.now();
  state.uvLightInstalled = nextInstalled;
  state.uvLightEnabled = nextInstalled ? true : false;
  pushEvent(nextInstalled ? "Added the UV light to this tank." : "Removed the UV light from this tank.", now);
  saveState();
  renderUi(now);
  showToast(nextInstalled ? "UV light added and switched on." : "UV light removed from this tank.");
}

function toggleUvLightPower(force = null) {
  if (!isUvLightFeatureEnabled()) {
    showToast("UV light is disabled.");
    return;
  }

  if (!isUvLightInstalled()) {
    showToast("Add the UV light to this tank from Edit Tank first.");
    return;
  }

  const nextEnabled = typeof force === "boolean" ? force : !isUvLightActive();
  if (state.uvLightEnabled === nextEnabled) {
    return;
  }

  state.uvLightEnabled = nextEnabled;
  saveState();
  renderUi(Date.now());
  showToast(nextEnabled ? "UV light on." : "UV light off.");
}

function toggleLightsOutOverride() {
  const targetTank = getCurrentTank();
  if (!targetTank) {
    return;
  }
  const current = getLightsOutOverride(targetTank);
  const next = current === LIGHTS_OUT_OVERRIDE_AUTO
    ? LIGHTS_OUT_OVERRIDE_ON
    : current === LIGHTS_OUT_OVERRIDE_ON
      ? LIGHTS_OUT_OVERRIDE_OFF
      : LIGHTS_OUT_OVERRIDE_AUTO;
  targetTank.lightsOutOverride = next;
  const now = Date.now();
  saveState();
  renderUi(now);
  showToast(next === LIGHTS_OUT_OVERRIDE_AUTO
    ? "Lights Out follows the tank clock."
    : next === LIGHTS_OUT_OVERRIDE_ON
      ? "Lights Out on."
      : "Lights Out off until you switch it back.");
}
