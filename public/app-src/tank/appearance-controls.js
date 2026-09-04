// Source fragment: tank/appearance-controls.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function updateTankAppearance(options = {}) {
  const changes = options.changes && typeof options.changes === "object" ? options.changes : {};
  const changedEntries = Object.entries(changes).filter(([key, value]) => !Object.is(state[key], value));
  if (!changedEntries.length && options.force !== true) {
    return false;
  }
  for (const [key, value] of changedEntries) {
    state[key] = value;
  }
  options.apply?.();
  completeGameAction({
    now: options.now,
    event: options.event,
    toast: options.toast,
    sound: options.sound,
    save: options.save,
    render: options.render,
    full: options.full
  });
  return true;
}

function copyTankAppearanceScheme(kind) {
  const tank = getCurrentTank();
  if (!tank) {
    return false;
  }
  runtime.tankAppearanceClipboard ||= { background: null, gravel: null };
  if (kind === "gravel") {
    runtime.tankAppearanceClipboard.gravel = {
      customGravelLayerColors: [...getActiveCustomGravelLayerColors()]
    };
    showToast("Gravel color scheme copied.");
    return true;
  }
  runtime.tankAppearanceClipboard.background = {
    selectedBackground: tank.selectedBackground
  };
  showToast("Wallpaper scheme copied.");
  return true;
}

function pasteTankAppearanceScheme(kind) {
  const clipboard = runtime.tankAppearanceClipboard?.[kind];
  if (!clipboard) {
    showToast(`Copy a ${kind === "gravel" ? "gravel color" : "wallpaper"} scheme first.`);
    return false;
  }
  const changes = kind === "gravel"
    ? {
        customGravelLayerColors: sanitizeCustomGravelLayerColors(clipboard.customGravelLayerColors)
      }
    : { ...clipboard };
  return updateTankAppearance({
    changes,
    toast: kind === "gravel" ? "Gravel color scheme pasted." : "Wallpaper scheme pasted.",
    full: true
  });
}

function setCustomGravelLayerColor(layerIndex, color, options = {}) {
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
  return updateTankAppearance({
    changes: { customGravelLayerColors: nextColors },
    save: options.save,
    render: options.render,
    full: options.full
  });
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
  return updateTankAppearance({
    changes: {
      customGravelLayerColors: getActiveCustomGravelLayerColors(),
      customGravelLayerColorize: nextSettings
    }
  });
}

function setSolidBackgroundColor(color, options = {}) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return;
  }

  if (state.solidBackgroundColor === normalizedColor) {
    return;
  }

  return updateTankAppearance({
    changes: { solidBackgroundColor: normalizedColor },
    save: options.save,
    render: options.render,
    full: options.full
  });
}

function setGradientBackgroundColor(role, color, options = {}) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return;
  }

  const key = role === "end" ? "gradientBackgroundEndColor" : "gradientBackgroundStartColor";
  if (state[key] === normalizedColor) {
    return;
  }

  return updateTankAppearance({
    changes: { [key]: normalizedColor },
    save: options.save,
    render: options.render,
    full: options.full
  });
}

function setAnimatedBackgroundColor(role, color, options = {}) {
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

  return updateTankAppearance({
    changes: { [key]: normalizedColor },
    save: options.save,
    render: options.render,
    full: options.full
  });
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

  return updateTankAppearance({
    changes: {
      animatedBackgroundTopColor: nextDefaults.surface,
      animatedBackgroundMidColor: nextDefaults.mid,
      animatedBackgroundBottomColor: nextDefaults.deep,
      animatedBackgroundSurfaceBloomColor: nextDefaults.surfaceBloom,
      animatedBackgroundShadowBloomColor: nextDefaults.shadowBloom,
      animatedBackgroundAbyssColor: nextDefaults.abyss,
      animatedBackgroundHighlightColor: nextDefaults.highlight,
      animatedBackgroundDriftColorA: nextDefaults.driftA,
      animatedBackgroundDriftColorB: nextDefaults.driftB,
      animatedBackgroundDriftColorC: nextDefaults.driftC
    }
  });
}

function enableCustomBackgroundMode(mode) {
  const nextMode = normalizeCustomBackgroundMode(mode);
  const alreadyEnabled = isCustomBackgroundEnabled();
  if (alreadyEnabled && state.customBackgroundMode === nextMode) {
    return;
  }

  return updateTankAppearance({
    changes: {
      customBackgroundMode: nextMode,
      selectedBackground: NONE_BACKGROUND_ASSET_KEY
    }
  });
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

  return updateTankAppearance({
    changes: { selectedBackground: backgroundKey },
    event: {
      type: "appearance",
      tone: "neutral",
      text: `Switched the tank background to ${runtime.backgroundMap.get(backgroundKey).name}.`
    }
  });
}

function selectTankAsset(tankKey) {
  if (!runtime.tankMap.has(tankKey)) {
    return;
  }

  return updateTankAppearance({
    changes: { selectedTankAsset: tankKey },
    event: {
      type: "appearance",
      tone: "neutral",
      text: `Swapped the tank shell to ${runtime.tankMap.get(tankKey).name}.`
    }
  });
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
  return completeGameAction({
    now,
    event: {
      type: "equipment",
      tone: "neutral",
      text: `Equipped ${filter.name}. At the current tank load, the tank now takes about ${formatDuration(getFilterMaxDirtyDurationMs(filterKey))} to hit maximum dirtiness.`
    }
  });
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

  return updateTankAppearance({
    changes: {
      uvLightInstalled: nextInstalled,
      uvLightEnabled: nextInstalled
    },
    event: {
      type: "equipment",
      tone: "neutral",
      text: nextInstalled ? "Added the UV light to this tank." : "Removed the UV light from this tank."
    },
    toast: nextInstalled ? "UV light added and switched on." : "UV light removed from this tank."
  });
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

  return updateTankAppearance({
    changes: { uvLightEnabled: nextEnabled },
    toast: nextEnabled ? "UV light on." : "UV light off."
  });
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
  return updateTankAppearance({
    changes: { lightsOutOverride: next },
    toast: next === LIGHTS_OUT_OVERRIDE_AUTO
      ? "Lights Out follows the tank clock."
      : next === LIGHTS_OUT_OVERRIDE_ON
        ? "Lights Out on."
        : "Lights Out off until you switch it back."
  });
}
