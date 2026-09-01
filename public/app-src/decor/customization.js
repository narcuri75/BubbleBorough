// Source fragment: decor/customization.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function isUvLightOwned(targetState = state) {
  return Boolean(ENABLE_UV_LIGHT && targetState?.uvLightOwned);
}

function isUvLightFeatureEnabled() {
  return ENABLE_UV_LIGHT;
}

function isUvLightInstalled(targetTank = getCurrentTank()) {
  return Boolean(isUvLightFeatureEnabled() && isUvLightOwned() && targetTank?.uvLightInstalled);
}

function isUvLightActive(targetTank = getCurrentTank()) {
  return Boolean(isUvLightInstalled(targetTank) && targetTank?.uvLightEnabled !== false);
}

function createTankState(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const typeMeta = getTankTypeMeta("rectangular");
  const animatedBackgroundColors = sanitizeAnimatedBackgroundColors({
    surfaceBloom: options.animatedBackgroundSurfaceBloomColor,
    shadowBloom: options.animatedBackgroundShadowBloomColor,
    top: options.animatedBackgroundTopColor,
    mid: options.animatedBackgroundMidColor,
    bottom: options.animatedBackgroundBottomColor,
    abyss: options.animatedBackgroundAbyssColor,
    highlight: options.animatedBackgroundHighlightColor,
    driftA: options.animatedBackgroundDriftColorA,
    driftB: options.animatedBackgroundDriftColorB,
    driftC: options.animatedBackgroundDriftColorC
  });

  return {
    id: String(options.id || createId("tank")),
    name: sanitizeTankName(options.name),
    gridX: Number.isInteger(Number(options.gridX)) ? Number(options.gridX) : 0,
    gridY: Number.isInteger(Number(options.gridY)) ? Number(options.gridY) : 0,
    createdAt: Number.isFinite(Number(options.createdAt)) ? Number(options.createdAt) : now,
    tankTypeId: typeMeta.id,
    waterType: normalizeWaterType(options.waterType, typeMeta.defaultWaterType || "freshwater"),
    setupPending: false,
    fish: Array.isArray(options.fish) ? options.fish : [],
    feedHistory: options.feedHistory && typeof options.feedHistory === "object" ? options.feedHistory : {},
    pendingPoops: Array.isArray(options.pendingPoops) ? options.pendingPoops : [],
    poops: Array.isArray(options.poops) ? options.poops : [],
    fishEggs: Array.isArray(options.fishEggs) ? options.fishEggs : [],
    placedDecor: Array.isArray(options.placedDecor) ? options.placedDecor : [],
    freeDecorPlacement: options.freeDecorPlacement === true,
    customGravelEnabled: true,
    customGravelLayerColors: Array.isArray(options.customGravelLayerColors)
      ? options.customGravelLayerColors
      : getDefaultCustomGravelLayerColors(),
    customGravelLayerColorize: Array.isArray(options.customGravelLayerColorize)
      ? options.customGravelLayerColorize
      : getDefaultCustomGravelLayerColorizeSettings(),
    gravelPalette: Array.isArray(options.gravelPalette) ? options.gravelPalette : getDefaultGravelPalette(),
    gravelSeed: Number.isFinite(options.gravelSeed) ? Math.abs(Math.floor(options.gravelSeed)) : Math.floor(Math.random() * 0x7fffffff),
    gravelLivePebbles: Array.isArray(options.gravelLivePebbles) ? options.gravelLivePebbles : [],
    floatingPellets: Array.isArray(options.floatingPellets) ? options.floatingPellets : [],
    selectedBackground: options.selectedBackground ?? getCatalogDefaultKey(runtime.backgroundCatalog, DEFAULT_TANK_BACKGROUND_ASSET_KEY),
    customBackgroundMode: normalizeCustomBackgroundMode(options.customBackgroundMode ?? DEFAULT_TANK_CUSTOM_BACKGROUND_MODE),
    solidBackgroundColor: normalizeHexColor(options.solidBackgroundColor) || DEFAULT_SOLID_BACKGROUND_COLOR,
    gradientBackgroundStartColor: normalizeHexColor(options.gradientBackgroundStartColor) || DEFAULT_GRADIENT_BACKGROUND_START_COLOR,
    gradientBackgroundEndColor: normalizeHexColor(options.gradientBackgroundEndColor) || DEFAULT_GRADIENT_BACKGROUND_END_COLOR,
    animatedBackgroundSurfaceBloomColor: animatedBackgroundColors.surfaceBloom,
    animatedBackgroundShadowBloomColor: animatedBackgroundColors.shadowBloom,
    animatedBackgroundTopColor: animatedBackgroundColors.surface,
    animatedBackgroundMidColor: animatedBackgroundColors.mid,
    animatedBackgroundBottomColor: animatedBackgroundColors.deep,
    animatedBackgroundAbyssColor: animatedBackgroundColors.abyss,
    animatedBackgroundHighlightColor: animatedBackgroundColors.highlight,
    animatedBackgroundDriftColorA: animatedBackgroundColors.driftA,
    animatedBackgroundDriftColorB: animatedBackgroundColors.driftB,
    animatedBackgroundDriftColorC: animatedBackgroundColors.driftC,
    localBackgroundImageDataUrl: typeof options.localBackgroundImageDataUrl === "string" ? options.localBackgroundImageDataUrl : "",
    localBackgroundImageRefId: sanitizeCustomImageRefId(options.localBackgroundImageRefId),
    selectedTankAsset: options.selectedTankAsset ?? null,
    selectedFilterAsset: options.selectedFilterAsset ?? getTankDefaultFilterSelection({ tankTypeId: typeMeta.id }),
    autoDispenser: createDefaultAutoDispenserState(options.autoDispenser),
    uvLightInstalled: false,
    uvLightEnabled: false,
    lightsOutOverride: normalizeLightsOutOverride(options.lightsOutOverride),
    selectedBubbleAsset: options.selectedBubbleAsset ?? (runtime.bubbleCatalog[0]?.key || null),
    theme: DEFAULT_THEME,
    lastCleanedAt: Number.isFinite(options.lastCleanedAt) ? options.lastCleanedAt : now,
    lastSimulatedAt: Number.isFinite(options.lastSimulatedAt) ? options.lastSimulatedAt : now,
    events: Array.isArray(options.events) ? options.events : [],
    lastGravelCoinFoundAt: Number.isFinite(options.lastGravelCoinFoundAt) ? options.lastGravelCoinFoundAt : 0,
    foodBuffs: {
      upgradedUntil: Number.isFinite(options?.foodBuffs?.upgradedUntil) ? options.foodBuffs.upgradedUntil : 0,
      friskyUntil: Number.isFinite(options?.foodBuffs?.friskyUntil) ? options.foodBuffs.friskyUntil : 0
    },
    medicineEffects: Array.isArray(options.medicineEffects) ? options.medicineEffects : [],
    medicineClouds: Array.isArray(options.medicineClouds) ? options.medicineClouds : [],
    medicineWaterTint: options?.medicineWaterTint && typeof options.medicineWaterTint === "object"
      ? options.medicineWaterTint
      : null
  };
}

function installTankStateAccessors(targetState) {
  if (!targetState || targetState.__tankAccessorsInstalled) {
    return targetState;
  }

  Object.defineProperty(targetState, "__tankAccessorsInstalled", {
    value: true,
    enumerable: false,
    configurable: true,
    writable: true
  });

  for (const key of TANK_STATE_ACCESSOR_KEYS) {
    Object.defineProperty(targetState, key, {
      enumerable: false,
      configurable: true,
      get() {
        const tank = getCurrentTank(targetState);
        return tank ? tank[key] : undefined;
      },
      set(value) {
        const tank = getCurrentTank(targetState);
        if (tank) {
          tank[key] = value;
        }
      }
    });
  }

  return targetState;
}

function normalizeAquariumSectionGrid(tanks = getAllTanks()) {
  const occupied = new Set();
  let fallbackX = 0;
  for (const [index, tank] of tanks.entries()) {
    if (/^Aquarium\s+\d+$/i.test(String(tank?.name || "").trim())) {
      tank.name = buildDefaultTankName(index);
    }
    let x = Number.isInteger(Number(tank?.gridX)) ? Number(tank.gridX) : fallbackX;
    let y = Number.isInteger(Number(tank?.gridY)) ? Number(tank.gridY) : 0;
    while (occupied.has(`${x},${y}`)) {
      fallbackX += 1;
      x = fallbackX;
      y = 0;
    }
    tank.gridX = x;
    tank.gridY = y;
    occupied.add(`${x},${y}`);
    fallbackX = Math.max(fallbackX, x);
  }
  return tanks;
}

function getAquariumSectionAt(gridX, gridY, targetState = state) {
  return getAllTanks(targetState).find((tank) => tank.gridX === gridX && tank.gridY === gridY) || null;
}

function getAdjacentAquariumSections(tank = getCurrentTank(), targetState = state) {
  if (!tank) {
    return [];
  }
  return [[0, -1], [1, 0], [0, 1], [-1, 0]]
    .map(([dx, dy]) => getAquariumSectionAt(tank.gridX + dx, tank.gridY + dy, targetState))
    .filter(Boolean);
}

function getValidAquariumExpansionSpaces(targetState = state) {
  const spaces = new Map();
  for (const tank of getAllTanks(targetState)) {
    // New sections stay side-by-side so their open-water edges connect naturally.
    // Existing vertical layouts remain readable and traversable for save compatibility.
    for (const [dx, dy] of [[1, 0], [-1, 0]]) {
      const gridX = tank.gridX + dx;
      const gridY = tank.gridY + dy;
      if (!getAquariumSectionAt(gridX, gridY, targetState)) {
        spaces.set(`${gridX},${gridY}`, { gridX, gridY });
      }
    }
  }
  return [...spaces.values()];
}

function getAquariumExpansionCost(targetState = state) {
  const baseCost = getTankTypeMeta("rectangular").cost;
  const existingSections = Math.max(1, getAllTanks(targetState).length);
  return Math.min(325, baseCost + Math.max(0, existingSections - 1) * 20);
}

function isTransitTubeDecorKey(decorKey = "") {
  return normalizeDecorKey(decorKey) === "transit-tube.png";
}

function getAllTransitTubes(targetState = state) {
  return getAllTanks(targetState).flatMap((tank) => (tank.placedDecor || [])
    .filter((item) => isTransitTubeDecorKey(item.decorKey))
    .map((item) => ({ tank, item })));
}

function getTransitTubeDisplayName(item, tank = getTankContainingDecor(item?.id)) {
  return sanitizeTankName(item?.transitTubeName, `${getTankLabel(tank)} Tube`);
}

function updateTransitTubeName(placedId, value) {
  const entry = getAllTransitTubes().find((candidate) => candidate.item.id === placedId);
  if (!entry) {
    return false;
  }
  entry.item.transitTubeName = sanitizeTankName(value, `${getTankLabel(entry.tank)} Tube`);
  saveState();
  return true;
}

function linkTransitTubes(sourceId, targetId = "") {
  const tubes = getAllTransitTubes();
  const source = tubes.find((entry) => entry.item.id === sourceId);
  const target = tubes.find((entry) => entry.item.id === targetId);
  if (!source || (targetId && !target) || sourceId === targetId) {
    return false;
  }
  for (const entry of tubes) {
    if (entry.item.transitTubeLinkedId === sourceId || entry.item.id === sourceId) {
      delete entry.item.transitTubeLinkedId;
    }
    if (target && (entry.item.transitTubeLinkedId === targetId || entry.item.id === targetId)) {
      delete entry.item.transitTubeLinkedId;
    }
  }
  if (target) {
    source.item.transitTubeLinkedId = target.item.id;
    target.item.transitTubeLinkedId = source.item.id;
    showToast(`${getTransitTubeDisplayName(source.item, source.tank)} now connects to ${getTransitTubeDisplayName(target.item, target.tank)}.`);
  } else {
    showToast(`${getTransitTubeDisplayName(source.item, source.tank)} disconnected.`);
  }
  saveState();
  renderUi(Date.now());
  return true;
}

function getTransitTubeJourney(sourceTank, destinationTank) {
  if (!sourceTank || !destinationTank || sourceTank.id === destinationTank.id) {
    return null;
  }
  const tubes = getAllTransitTubes();
  for (const source of tubes.filter((entry) => entry.tank.id === sourceTank.id)) {
    const target = tubes.find((entry) => entry.item.id === source.item.transitTubeLinkedId);
    if (target?.tank.id === destinationTank.id && target.item.transitTubeLinkedId === source.item.id) {
      return { sourceTube: source.item, targetTube: target.item, targetTank: target.tank };
    }
  }
  return null;
}

function extendAquariumAt(gridX, gridY) {
  const x = Number(gridX);
  const y = Number(gridY);
  const valid = getValidAquariumExpansionSpaces().some((space) => space.gridX === x && space.gridY === y);
  const expansionCost = getAquariumExpansionCost();
  if (!valid || getAquariumSectionAt(x, y)) {
    showToast("That section must connect to the left or right side of a neighborhood.");
    return false;
  }
  if (state.coins < expansionCost) {
    showToast(`You need ${expansionCost} ${pluralize("coin", expansionCost)} to extend the aquarium.`);
    return false;
  }
  state.coins -= expansionCost;
  const section = createTankState({ now: Date.now(), name: getNextAvailableTankName(), gridX: x, gridY: y });
  state.tanks.push(section);
  state.activeTankId = section.id;
  runtime.aquariumExpansionMode = true;
  runtime.boroughOverviewOpen = true;
  pushEvent(`Extended Bubble Borough with ${getTankLabel(section)}.`, Date.now(), section);
  saveState();
  playPurchaseSoundEffect();
  renderUi(Date.now());
  showToast(`${getTankLabel(section)} is ready to build.`);
  return true;
}

function saveBoroughTankName(tankId, value = runtime.editingTankNameValue) {
  const tank = getTankById(tankId);
  if (!tank) {
    return false;
  }
  const nextName = sanitizeTankName(value, getTankLabel(tank));
  tank.name = nextName;
  runtime.editingTankNameId = null;
  runtime.editingTankNameValue = "";
  pushEvent(`Renamed a neighborhood to ${nextName}.`, Date.now(), tank);
  saveState();
  renderAquariumOverview();
  showToast(nextName);
  return true;
}

function swapAquariumSectionPositions(firstTankId, secondTankId) {
  const first = getTankById(firstTankId);
  const second = getTankById(secondTankId);
  if (!first || !second || first.id === second.id) {
    return false;
  }
  const firstPosition = { gridX: first.gridX, gridY: first.gridY };
  first.gridX = second.gridX;
  first.gridY = second.gridY;
  second.gridX = firstPosition.gridX;
  second.gridY = firstPosition.gridY;
  saveState();
  renderAquariumOverview();
  showToast(`Rearranged ${getTankLabel(first)} and ${getTankLabel(second)}.`);
  return true;
}

function withActiveTank(tankId, callback, targetState = state) {
  if (!targetState || typeof callback !== "function") {
    return null;
  }

  const previousTankId = targetState.activeTankId;
  targetState.activeTankId = tankId;
  try {
    return callback(getCurrentTank(targetState));
  } finally {
    targetState.activeTankId = previousTankId;
  }
}

function getTankResaleValue(tank) {
  return getResaleValue(getTankTypeMeta(tank?.tankTypeId).cost || 0);
}

function setActiveTank(tankId, options = {}) {
  const nextTank = getTankById(tankId);
  if (!nextTank) {
    return false;
  }

  if (state.activeTankId === nextTank.id) {
    return false;
  }

  clearPrimaryToolModes();
  resetCompetingOverlayState({ reason: "tank-switch" });
  runtime.selectedFishId = null;
  runtime.fishInspectorSettingsOpen = false;
  runtime.editingTankNameId = null;
  runtime.editingTankNameValue = "";
  runtime.effectClouds = [];
  runtime.bloodWaterTint = 0;
  runtime.fishShadowPlaneCache.clear();
  runtime.fishGravelPebbleActions.clear();
  runtime.fishPebbleTosses = [];
  runtime.forcedGravelDigUntilByFishId.clear();
  runtime.gravelDigBursts = [];
  materializeCoarseFishActivities(nextTank, Date.now());
  state.activeTankId = nextTank.id;
  renderUi(Date.now());
  saveState();
  if (options.announce !== false) {
    showToast(getTankLabel(nextTank));
  }
  return true;
}

function switchTankByOffset(offset) {
  const tanks = getAllTanks();
  if (tanks.length <= 1) {
    return false;
  }

  const currentIndex = Math.max(0, getCurrentTankIndex());
  const nextIndex = (currentIndex + offset + tanks.length) % tanks.length;
  return setActiveTank(tanks[nextIndex].id);
}

function beginAquariumExpansionPurchase() {
  openAquariumOverview(true);
}

function sellCurrentTank() {
  const tank = getCurrentTank();
  if (!tank) {
    return;
  }

  if (state.tanks.length <= 1) {
    showToast("You need to keep at least one tank.");
    return;
  }

  if (!isTankEmpty(tank)) {
    showToast("Only empty tanks can be sold.");
    return;
  }

  const resaleValue = getTankResaleValue(tank);
  const currentIndex = getCurrentTankIndex();
  state.tanks = state.tanks.filter((entry) => entry.id !== tank.id);
  state.coins += resaleValue;
  const fallbackTank = state.tanks[Math.max(0, currentIndex - 1)] || state.tanks[0];
  state.activeTankId = fallbackTank?.id || null;
  runtime.editingTankNameId = null;
  runtime.editingTankNameValue = "";
  pushEvent(`Sold ${getTankLabel(tank, currentIndex)} for ${resaleValue} ${pluralize("coin", resaleValue)}.`, Date.now());
  saveState();
  playCoinSoundEffect();
  renderUi(Date.now());
}

function cancelCurrentTankNameEdit() {
  runtime.editingTankNameId = null;
  runtime.editingTankNameValue = "";
  renderUi(Date.now());
}

function saveCurrentTankName() {
  const tank = getCurrentTank();
  if (!tank || runtime.editingTankNameId !== tank.id) {
    cancelCurrentTankNameEdit();
    return;
  }

  const nextName = sanitizeTankName(runtime.editingTankNameValue, getTankLabel(tank));
  tank.name = nextName;
  runtime.editingTankNameId = null;
  runtime.editingTankNameValue = "";
  pushEvent(`Renamed the current aquarium to ${nextName}.`, Date.now());
  saveState();
  renderUi(Date.now());
  showToast(nextName);
}

function isSidebarSectionCollapsed(key) {
  return Boolean(runtime.collapsedSections[key]);
}

function toggleSidebarSection(key) {
  if (!Object.prototype.hasOwnProperty.call(runtime.collapsedSections, key)) {
    return;
  }

  if (key === "fishDead" && !state.fish.some((fish) => isFishDead(fish)) && !state.storedFish.some((fish) => isFishDead(fish))) {
    return;
  }

  runtime.collapsedSections[key] = !runtime.collapsedSections[key];
  renderUi(Date.now());
}

function getUtilityOverlayModeDef(modeId) {
  const id = String(modeId || "");
  return id && Object.prototype.hasOwnProperty.call(UTILITY_OVERLAY_MODES, id)
    ? UTILITY_OVERLAY_MODES[id]
    : null;
}

function getUtilityOverlayContext(now = Date.now()) {
  return {
    now,
    tank: getCurrentTank(),
    mode: runtime.utilityOverlayMode,
    state,
    runtime
  };
}

function getCustomAssetPendingStateKey(type) {
  const assetType = String(type || "").trim();
  return assetType && Object.prototype.hasOwnProperty.call(CUSTOM_ASSET_PENDING_RUNTIME_KEYS, assetType)
    ? CUSTOM_ASSET_PENDING_RUNTIME_KEYS[assetType]
    : "";
}

function clearPendingCustomAssetUploads(options = {}) {
  const types = Array.isArray(options.types) && options.types.length
    ? options.types
    : Object.keys(CUSTOM_ASSET_PENDING_RUNTIME_KEYS);
  const preserve = new Set((Array.isArray(options.preserveTypes) ? options.preserveTypes : [])
    .map((type) => getCustomAssetPendingStateKey(type))
    .filter(Boolean));
  for (const type of types) {
    const key = getCustomAssetPendingStateKey(type);
    if (key && !preserve.has(key)) {
      runtime[key] = null;
    }
  }
}

function getOverlayPendingStateKeys() {
  return [
    "pendingDecorAction",
    ...Object.values(CUSTOM_ASSET_PENDING_RUNTIME_KEYS)
  ];
}

function clearOverlayPendingState(options = {}) {
  const preserve = new Set(Array.isArray(options.preservePendingState) ? options.preservePendingState : []);
  for (const key of getOverlayPendingStateKeys()) {
    if (!preserve.has(key)) {
      runtime[key] = null;
    }
  }
  if (options.clearExternalLink === true) {
    runtime.pendingExternalLink = null;
  }
}

function closeUtilityOverlayState(options = {}) {
  const modeId = runtime.utilityOverlayMode;
  const modeDef = getUtilityOverlayModeDef(modeId);
  if (modeDef?.onClose) {
    modeDef.onClose(getUtilityOverlayContext(options.now), {
      reason: options.reason || "close",
      nextKind: options.nextKind || "",
      nextMode: options.nextMode || ""
    });
  }
  runtime.wallpaperUtilityKeyboardOpenId = "";
  runtime.utilityOverlayOpen = false;
  runtime.utilityOverlayMode = "";
}

function resetCompetingOverlayState(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  if (runtime.utilityOverlayOpen || runtime.utilityOverlayMode) {
    closeUtilityOverlayState({
      now,
      reason: options.reason || "reset",
      nextKind: options.nextKind || "",
      nextMode: options.nextMode || ""
    });
  } else {
    runtime.utilityOverlayOpen = false;
    runtime.utilityOverlayMode = "";
  }

  runtime.storeOverlayOpen = false;
  runtime.settingsOverlayOpen = false;
  runtime.equipmentOverlayOpen = false;

  if (options.clearPendingState !== false) {
    clearOverlayPendingState({
      preservePendingState: options.preservePendingState,
      clearExternalLink: options.clearExternalLink !== false
    });
  }

  if (options.resetStoreTab === true) {
    runtime.storeTab = options.storeTab || "fish";
  }
}

function openExclusiveOverlay(kind, options = {}) {
  const overlayKind = String(kind || "").trim();
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const nextUtilityMode = overlayKind === "utility" ? String(options.mode || "") : "";
  const utilityModeDef = overlayKind === "utility" ? getUtilityOverlayModeDef(nextUtilityMode) : null;
  const preservePendingState = utilityModeDef?.preservePendingState || [];

  if (options.clearPrimaryToolModes !== false) {
    clearPrimaryToolModes();
  }
  runtime.selectedFishStatusFishId = null;
  runtime.selectedFishId = null;
  runtime.fishInspectorSettingsOpen = false;
  closeFishActionMenu();
  clearGuidanceForModeChange(`overlay:${overlayKind}`);

  resetCompetingOverlayState({
    now,
    reason: "replace",
    nextKind: overlayKind,
    nextMode: nextUtilityMode,
    preservePendingState,
    clearExternalLink: overlayKind === "utility" && !preservePendingState.includes("pendingExternalLink")
  });

  switch (overlayKind) {
    case "store": {
      const requestedTab = ["food", "pharmacy", "fish", "decor", "equipment"].includes(options.tab) ? options.tab : "food";
      const allowedTabs = getTutorialAllowedStoreTabs();
      runtime.storeOverlayOpen = true;
      runtime.storeTab = allowedTabs && !allowedTabs.has(requestedTab)
        ? (getTutorialPreferredStoreTab() || [...allowedTabs][0] || requestedTab)
        : requestedTab;
      break;
    }
    case "utility":
      runtime.utilityOverlayOpen = true;
      runtime.utilityOverlayMode = nextUtilityMode;
      utilityModeDef?.onOpen?.(getUtilityOverlayContext(now), options);
      break;
    case "settings":
      runtime.settingsOverlayOpen = true;
      break;
    case "equipment":
      runtime.equipmentOverlayOpen = true;
      break;
    default:
      break;
  }

  if (options.render !== false) {
    renderUi(now);
  }
}

function openStoreOverlay(tab = "food") {
  if (getActiveTutorial() && !getTutorialAllowedStoreTabs()) {
    showToast("Finish this task first.");
    return;
  }

  openExclusiveOverlay("store", { tab });
}

function closeStoreOverlay(options = {}) {
  const tutorialState = getActiveTutorialStageRuntime(Date.now());
  const stageStore = tutorialState?.storeConfig || null;
  if (
    options.force !== true
    && isGuidedTutorialActive()
    && stageStore?.blockCloseWithSkipConfirm === true
  ) {
    requestTutorialSkipConfirmation({
      returnTab: runtime.storeTab,
      returnStage: state.tutorial.stage
    });
    return false;
  }

  runtime.storeOverlayOpen = false;
  renderUi(Date.now());
  return true;
}

function openUtilityOverlay(mode, options = {}) {
  const nextMode = String(mode || "");
  openExclusiveOverlay("utility", {
    ...options,
    mode: nextMode
  });
}

function openAutoDispenserResetConfirmation() {
  if (!hasAutoDispenserInstalled()) {
    return;
  }

  if (getAutoDispenserLoadedCount(state.autoDispenser) <= 0) {
    showToast("The dispenser is already empty.");
    return;
  }

  openUtilityOverlay("dispenser-reset");
}

function getBubblerSettingsTarget() {
  const item = getPlacedDecorById(runtime.bubblerSettingsDecorId) || getSelectedPlacedDecor();
  return item && canConfigureDecorBubbler(item) ? item : null;
}

function openDecorSettings(placedId) {
  const item = setSelectedDecor(placedId);
  if (!item) {
    showToast("Select decor first.");
    return;
  }

  if (isCaveDecorKey(item.decorKey) && !hasPlacedCaveSettings(item)) {
    item.caveSettings = getDecorDefaultCaveSettings(item.decorKey);
    saveState();
  }

  runtime.customDecorSettingsDecorId = item.id;
  runtime.bubblerSettingsDecorId = null;
  openUtilityOverlay("decor-settings", { clearPrimaryToolModes: false });
}

function openDecorActionConfirmation(action) {
  if (!action || typeof action !== "object") {
    return;
  }

  runtime.pendingDecorAction = action;
  openUtilityOverlay(action.type === "sell" ? "decor-sell-confirm" : "decor-buy-confirm", {
    clearPrimaryToolModes: false
  });
}

function openFishActionConfirmation(action) {
  if (!action || typeof action !== "object") {
    return;
  }

  runtime.pendingFishAction = action;
  openUtilityOverlay(action.type === "sell" ? "fish-sell-confirm" : "fish-buy-confirm", {
    clearPrimaryToolModes: false
  });
}

function getDecorSettingsTarget() {
  return getPlacedDecorById(runtime.customDecorSettingsDecorId) || getSelectedPlacedDecor();
}

function getCustomDecorSettingsTarget() {
  const item = getDecorSettingsTarget();
  return item && canConfigureCustomDecor(item) ? item : null;
}

function getCustomDecorAssetForItem(item) {
  if (!item || !isCustomDecorAssetKey(item.decorKey)) {
    return null;
  }

  if (!state.customDecorAssets || typeof state.customDecorAssets !== "object") {
    state.customDecorAssets = {};
  }

  const currentAsset = state.customDecorAssets[item.decorKey];
  const asset = copyRuntimeImageSources(
    currentAsset,
    sanitizeCustomDecorAssetEntry(currentAsset, item.decorKey)
  );
  if (asset) {
    state.customDecorAssets[item.decorKey] = asset;
  }
  return asset;
}

function isDecorFloatingKey(decorKey = "") {
  return String(decorKey || "").toLowerCase().includes("floating");
}

function isDecorSeaweedKey(decorKey = "") {
  return String(decorKey || "").toLowerCase().includes("seaweed");
}

function isDecorLureKey(decorKey = "") {
  return String(decorKey || "").toLowerCase().includes("lure");
}

function getDecorMotionCapabilities(itemOrKey) {
  const decorKey = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey;
  const decor = runtime.decorMap.get(decorKey);
  const customMotionType = isCustomDecorAssetKey(decorKey)
    ? normalizeCustomDecorMotionType(decor?.motionType)
    : "";
  if (customMotionType) {
    const motionConfig = getCustomDecorMotionTypeConfig(customMotionType);
    return {
      motionType: customMotionType,
      hasBob: Boolean(motionConfig.hasBob),
      hasSway: Boolean(motionConfig.hasSway),
      isLure: false,
      isFloating: Boolean(motionConfig.hasBob),
      isSeaweed: Boolean(motionConfig.hasSway),
      label: motionConfig.label,
      summary: motionConfig.summary,
      defaultSwaySplitY: sanitizeCustomDecorMotionSplit(decor?.motionSplitY),
      defaultSwaySide: normalizeDecorSwaySide(decor?.motionSwaySide),
      defaultMotionIntensity: sanitizeCustomDecorMotionIntensity(decor?.motionIntensity)
    };
  }

  const isLure = isDecorLureKey(decorKey);
  const isFloating = isDecorFloatingKey(decorKey) || isLure;
  const isSeaweed = isDecorSeaweedKey(decorKey) || isLure;
  return {
    motionType: "",
    hasBob: isFloating,
    hasSway: isSeaweed,
    isLure,
    isFloating,
    isSeaweed,
    label: isLure
      ? "Lure"
      : isFloating && isSeaweed
        ? "Floating/Suspended Object"
        : isFloating
          ? "Floating Object"
          : isSeaweed
            ? "Seaweed"
            : "Static Object",
    summary: isLure
      ? "Bobs and sways like a suspended object."
      : isFloating && isSeaweed
        ? "Bobs gently while the selected portion sways."
        : isFloating
          ? "Bobs gently."
          : isSeaweed
            ? "Sways from the selected line."
            : "Solid and still.",
    defaultSwaySplitY: isLure ? 0.7 : isFloating && isSeaweed ? 0.25 : 0.75,
    defaultSwaySide: isLure || (isFloating && isSeaweed) ? "below" : "above",
    defaultMotionIntensity: DEFAULT_CUSTOM_DECOR_MOTION_INTENSITY
  };
}

function getPlacedDecorMotionSettings(item) {
  const capabilities = getDecorMotionCapabilities(item);
  const settings = item?.decorSettings && typeof item.decorSettings === "object"
    ? item.decorSettings
    : {};
  return {
    swayIntensity: sanitizeCustomDecorMotionIntensity(settings.swayIntensity ?? capabilities.defaultMotionIntensity),
    bobIntensity: sanitizeCustomDecorMotionIntensity(settings.bobIntensity ?? capabilities.defaultMotionIntensity),
    swaySpeed: sanitizeDecorMotionSpeed(settings.swaySpeed),
    bobSpeed: sanitizeDecorMotionSpeed(settings.bobSpeed),
    swaySplitY: sanitizeCustomDecorMotionSplit(settings.swaySplitY ?? capabilities.defaultSwaySplitY),
    swaySide: normalizeDecorSwaySide(settings.swaySide ?? capabilities.defaultSwaySide)
  };
}

function ensurePlacedDecorSettings(item) {
  if (!item) {
    return null;
  }
  if (!item.decorSettings || typeof item.decorSettings !== "object") {
    item.decorSettings = {};
  }
  return item.decorSettings;
}

function normalizeCaveEntrySide(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CAVE_ENTRY_SIDE_OPTIONS.some((option) => option.id === normalized) ? normalized : "front";
}

function normalizeCaveSeatFacing(value, fallback = 1) {
  const fallbackDirection = Number(fallback) < 0 ? -1 : 1;
  if (value === null || value === undefined || value === "") {
    return fallbackDirection;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["left", "l", "<", "-1"].includes(normalized)) {
    return -1;
  }
  if (["right", "r", ">", "1"].includes(normalized)) {
    return 1;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? (numeric < 0 ? -1 : 1) : fallbackDirection;
}

function getDefaultCaveSeatFacing(point = null, index = 0) {
  const x = Number(point?.x ?? point?.xNorm);
  if (Number.isFinite(x) && Math.abs(x - 0.5) > 0.04) {
    return x < 0.5 ? 1 : -1;
  }

  return index % 2 === 0 ? 1 : -1;
}

function getCaveEntryOutsideLayers(side) {
  switch (normalizeCaveEntrySide(side)) {
    case "back":
      return [5];
    case "both":
      return [2, 5];
    case "front":
    default:
      return [2];
  }
}

function buildDefaultCaveEntryPoint(index = 0, count = CAVE_SETTINGS_DEFAULT_ENTRIES) {
  const resolvedCount = clamp(Math.floor(Number(count) || CAVE_SETTINGS_DEFAULT_ENTRIES), CAVE_SETTINGS_MIN_ENTRIES, CAVE_SETTINGS_MAX_ENTRIES);
  if (resolvedCount <= 1) {
    return { ...CAVE_SETTINGS_DEFAULT_ENTRY };
  }

  const spread = Math.min(0.34, 0.12 + resolvedCount * 0.026);
  const t = clamp(index / Math.max(1, resolvedCount - 1), 0, 1);
  return {
    x: clamp(CAVE_SETTINGS_DEFAULT_ENTRY.x + (t - 0.5) * spread, 0.02, 0.98),
    y: CAVE_SETTINGS_DEFAULT_ENTRY.y
  };
}

function buildDefaultCaveSeatPoint(index = 0, count = CAVE_SETTINGS_DEFAULT_SEATS) {
  const resolvedCount = clamp(Math.floor(Number(count) || CAVE_SETTINGS_DEFAULT_SEATS), CAVE_SETTINGS_MIN_SEATS, CAVE_SETTINGS_MAX_SEATS);
  if (resolvedCount <= 1) {
    const point = { x: 0.5, y: 0.54 };
    return {
      ...point,
      facing: getDefaultCaveSeatFacing(point, index)
    };
  }

  const spread = Math.min(0.34, 0.12 + resolvedCount * 0.028);
  const t = resolvedCount <= 1 ? 0.5 : clamp(index / Math.max(1, resolvedCount - 1), 0, 1);
  const point = {
    x: clamp(0.5 - spread / 2 + spread * t, 0.08, 0.92),
    y: clamp(0.54 + (index % 2 === 0 ? -0.025 : 0.025), 0.08, 0.92)
  };
  return {
    ...point,
    facing: getDefaultCaveSeatFacing(point, index)
  };
}

function sanitizeCaveLocalCoordinate(value, fallback = 0.5) {
  const numeric = Number(value);
  return clamp(Number.isFinite(numeric) ? numeric : fallback, 0.02, 0.98);
}

function sanitizeCaveLocalPoint(entry, fallback = CAVE_SETTINGS_DEFAULT_ENTRY) {
  return {
    x: sanitizeCaveLocalCoordinate(entry?.x ?? entry?.xNorm, fallback.x),
    y: sanitizeCaveLocalCoordinate(entry?.y ?? entry?.yNorm, fallback.y)
  };
}

function normalizeCaveSettingsIdList(value) {
  const rawValues = Array.isArray(value)
    ? value
    : (value === null || value === undefined || value === "" ? [] : [value]);
  return [...new Set(rawValues.map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function sanitizePlacedCaveSettings(settings = null) {
  const source = settings && typeof settings === "object" ? settings : {};
  const legacyEntry = source.entry || {
    x: source.entryX ?? source.mouthX,
    y: source.entryY ?? source.mouthY
  };
  const sourceEntries = Array.isArray(source.entries) ? source.entries : [];
  const entryCount = clamp(
    Math.floor(Number(source.entryCount) || sourceEntries.length || CAVE_SETTINGS_DEFAULT_ENTRIES),
    CAVE_SETTINGS_MIN_ENTRIES,
    CAVE_SETTINGS_MAX_ENTRIES
  );
  const entries = Array.from({ length: entryCount }, (_, index) => {
    const fallback = buildDefaultCaveEntryPoint(index, entryCount);
    const sourceEntry = sourceEntries[index] && typeof sourceEntries[index] === "object"
      ? sourceEntries[index]
      : (index === 0 ? legacyEntry : null);
    return {
      id: typeof sourceEntry?.id === "string" && sourceEntry.id.trim()
        ? sourceEntry.id.trim()
        : `entry-${index + 1}`,
      side: normalizeCaveEntrySide(sourceEntry?.side ?? sourceEntry?.entrySide),
      ...sanitizeCaveLocalPoint(sourceEntry, fallback)
    };
  });
  const activeEntryIndex = clamp(
    Math.floor(Number(source.activeEntryIndex) || 0),
    0,
    Math.max(0, entryCount - 1)
  );
  const sourceSeats = Array.isArray(source.seats) ? source.seats : [];
  const seatCount = clamp(
    Math.floor(Number(source.seatCount) || sourceSeats.length || CAVE_SETTINGS_DEFAULT_SEATS),
    CAVE_SETTINGS_MIN_SEATS,
    CAVE_SETTINGS_MAX_SEATS
  );
  const seats = Array.from({ length: seatCount }, (_, index) => {
    const fallback = buildDefaultCaveSeatPoint(index, seatCount);
    const sourceSeat = sourceSeats[index] && typeof sourceSeats[index] === "object"
      ? sourceSeats[index]
      : null;
    const point = sanitizeCaveLocalPoint(sourceSeat, fallback);
    const entryIds = normalizeCaveSettingsIdList(sourceSeat?.entryIds ?? sourceSeat?.entryId);
    const portalIds = normalizeCaveSettingsIdList(sourceSeat?.portalIds ?? sourceSeat?.portalId);
    return {
      id: typeof sourceSeat?.id === "string" && sourceSeat.id.trim()
        ? sourceSeat.id.trim()
        : `seat-${index + 1}`,
      ...point,
      facing: normalizeCaveSeatFacing(
        sourceSeat?.facing ?? sourceSeat?.direction ?? sourceSeat?.seatFacing,
        fallback.facing ?? getDefaultCaveSeatFacing(point, index)
      ),
      ...(entryIds.length ? { entryIds } : {}),
      ...(portalIds.length ? { portalIds } : {})
    };
  });
  const activeSeatIndex = clamp(
    Math.floor(Number(source.activeSeatIndex) || 0),
    0,
    Math.max(0, seatCount - 1)
  );

  return {
    entry: entries[0] || { ...CAVE_SETTINGS_DEFAULT_ENTRY },
    entryCount,
    activeEntryIndex,
    entries,
    seatCount,
    activeSeatIndex,
    seats
  };
}

function getAuthoredDecorCaveSettings(decorKey = "") {
  const decor = runtime.decorMap.get(decorKey);
  const meta = runtime.decorMeta[decorKey] || null;
  const directSettings = decor?.defaultCaveSettings
    || decor?.caveSettings
    || meta?.defaultCaveSettings
    || meta?.caveSettings;
  if (directSettings && typeof directSettings === "object") {
    return sanitizePlacedCaveSettings(directSettings);
  }

  const asset = state?.customDecorAssets?.[decorKey];
  if (asset?.caveSettings && typeof asset.caveSettings === "object") {
    return sanitizePlacedCaveSettings(asset.caveSettings);
  }

  return null;
}

function hasPlacedCaveSettings(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return false;
  }

  return Boolean(
    (item.caveSettings && typeof item.caveSettings === "object")
    || getAuthoredDecorCaveSettings(item.decorKey)
  );
}

function getPlacedCaveSettings(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  const source = item.caveSettings && typeof item.caveSettings === "object"
    ? item.caveSettings
    : getAuthoredDecorCaveSettings(item.decorKey);
  return source ? sanitizePlacedCaveSettings(source) : null;
}

function ensurePlacedCaveSettings(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  item.caveSettings = sanitizePlacedCaveSettings(item.caveSettings || getDecorDefaultCaveSettings(item.decorKey));
  return item.caveSettings;
}

function getDecorDefaultCaveSettings(decorKey = "") {
  const authoredSettings = getAuthoredDecorCaveSettings(decorKey);
  if (authoredSettings) {
    return authoredSettings;
  }

  return sanitizePlacedCaveSettings();
}

function getDecorDefaultCaveColorSettings(decorKey = "") {
  const decor = runtime.decorMap.get(decorKey);
  const meta = runtime.decorMeta[decorKey] || null;
  const directSettings = decor?.defaultCaveColorSettings
    || decor?.caveColorSettings
    || meta?.defaultCaveColorSettings
    || meta?.caveColorSettings;
  if (directSettings && typeof directSettings === "object") {
    return sanitizePlacedCaveColorSettings(directSettings, decor || meta) || null;
  }

  const asset = state?.customDecorAssets?.[decorKey];
  if (asset?.caveColorSettings && typeof asset.caveColorSettings === "object") {
    return sanitizePlacedCaveColorSettings(asset.caveColorSettings, decor || buildCustomDecorCatalogEntry(asset)) || null;
  }

  return null;
}

function getDecorCaveColorLayers(decorOrKey) {
  const decor = typeof decorOrKey === "string" ? runtime.decorMap.get(decorOrKey) : decorOrKey;
  return Array.isArray(decor?.caveColorLayers)
    ? decor.caveColorLayers.filter((layer) => (
      layer?.id
      && (
        layer.path
        || (Array.isArray(layer.paths) && layer.paths.length)
        || (Array.isArray(layer.legacyPaths) && layer.legacyPaths.length)
      )
    ))
    : [];
}

function resolveDecorColorLayerPath(layer) {
  const candidates = Array.isArray(layer?.paths) && layer.paths.length ? layer.paths : [layer?.path];
  return layer?.resolvedPath || candidates.find((path) => path && runtime.images.has(path)) || layer?.path || "";
}

function getVisibleDecorColorLayers(decorOrKey) {
  const layers = getDecorCaveColorLayers(decorOrKey);
  const getLayer = (id) => layers.find((layer) => layer.id === id) || null;
  const resolveFirstPath = (paths = []) => paths.find((path) => path && runtime.images.has(path)) || "";
  const baseLayer = getLayer("color1");
  if (!baseLayer) {
    return [];
  }

  const visible = [{ ...baseLayer, resolvedPath: resolveFirstPath(baseLayer.paths) || baseLayer.path }];
  const color2Layer = getLayer("color2");
  const color3Layer = getLayer("color3");
  const newColor2Path = resolveFirstPath(color2Layer?.paths);
  const newColor3Path = resolveFirstPath(color3Layer?.paths);
  const legacyColor2Path = resolveFirstPath(color2Layer?.legacyPaths);
  const legacyColor3Path = resolveFirstPath(color3Layer?.legacyPaths);

  if (newColor3Path) {
    if (newColor2Path) {
      visible.push({ ...color2Layer, resolvedPath: newColor2Path });
    }
    visible.push({ ...color3Layer, resolvedPath: newColor3Path });
    return visible;
  }

  if (legacyColor2Path) {
    visible.push({ ...color2Layer, resolvedPath: legacyColor2Path });
    if (legacyColor3Path) {
      visible.push({ ...color3Layer, resolvedPath: legacyColor3Path });
    }
    return visible;
  }

  if (newColor2Path) {
    visible.push({ ...color2Layer, resolvedPath: newColor2Path });
  }
  return visible;
}

function hasDecorCaveColorLayers(decorOrKey) {
  return getVisibleDecorColorLayers(decorOrKey).length > 0;
}

function isDecorRgbColorSetting(value = "") {
  return String(value || "").trim().toLowerCase() === DECOR_RGB_COLOR_SETTING;
}

function normalizeDecorColorSetting(value = "") {
  return isDecorRgbColorSetting(value)
    ? DECOR_RGB_COLOR_SETTING
    : normalizeHexColor(value) || "";
}

function normalizeDecorColorSettingList(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = rawValues
    .map((entry) => normalizeDecorColorSetting(entry))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function resolveDecorColorSettingForRender(value = "", now = Date.now(), fallback = DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR) {
  return isDecorRgbColorSetting(value)
    ? getDecorRgbCycleColor(now)
    : normalizeHexColor(value) || normalizeHexColor(fallback) || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
}

function getDecorRgbCycleHue(now = Date.now()) {
  return normalizeHueUnit((Number(now) || 0) / DECOR_RGB_CYCLE_MS) * 360;
}

function getDecorRgbCycleColor(now = Date.now()) {
  const hue = normalizeHueUnit(
    Math.round(normalizeHueUnit((Number(now) || 0) / DECOR_RGB_CYCLE_MS) * DECOR_RGB_CYCLE_CACHE_STEPS)
    / DECOR_RGB_CYCLE_CACHE_STEPS
  );
  return rgbToHex(hslToRgb({
    h: hue,
    s: 0.88,
    l: 0.58
  }));
}

function getDecorRgbCycleFilter(now = Date.now()) {
  return `hue-rotate(${getDecorRgbCycleHue(now).toFixed(2)}deg) saturate(1.28)`;
}

function getDecorRgbColorizeFilter(now = Date.now()) {
  return `sepia(1) saturate(3.2) hue-rotate(${(getDecorRgbCycleHue(now) - 42).toFixed(2)}deg) saturate(1.18)`;
}

function getDecorColorizeSettingKey(layerId = "") {
  return `${String(layerId || "")}${DECOR_COLORIZE_SETTING_SUFFIX}`;
}

function normalizeDecorColorizeSetting(value = false) {
  if (value === true) {
    return true;
  }
  if (value === false || value === null || typeof value === "undefined") {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on", "colorize", "colorized"].includes(normalized);
}

function sanitizePlacedCaveColorSettings(settings = null, decorOrKey = null) {
  const layers = getDecorCaveColorLayers(decorOrKey);
  if (!layers.length || !settings || typeof settings !== "object") {
    return null;
  }

  const source = settings.colors && typeof settings.colors === "object"
    ? settings.colors
    : settings;
  const sourceColorize = settings.colorize && typeof settings.colorize === "object"
    ? settings.colorize
    : settings;
  const sanitized = {};

  for (const layer of layers) {
    const color = normalizeDecorColorSetting(source[layer.id] ?? source[layer.sourceKey] ?? "");
    if (color) {
      sanitized[layer.id] = color;
    }

    const colorize = normalizeDecorColorizeSetting(
      sourceColorize[getDecorColorizeSettingKey(layer.id)]
      ?? sourceColorize[`${layer.id}Mode`]
      ?? sourceColorize[`${layer.id}Blend`]
      ?? sourceColorize[layer.id]?.colorize
      ?? sourceColorize[layer.id]
      ?? false
    );
    if (colorize) {
      sanitized[getDecorColorizeSettingKey(layer.id)] = true;
    }
  }

  return Object.keys(sanitized).length ? sanitized : null;
}

function getPlacedCaveColorSettings(item, decor = null) {
  const resolvedDecor = decor || runtime.decorMap.get(item?.decorKey);
  const layers = getDecorCaveColorLayers(resolvedDecor);
  const sanitized = sanitizePlacedCaveColorSettings(item?.caveColorSettings, resolvedDecor) || {};
  return Object.fromEntries(layers.map((layer) => [layer.id, sanitized[layer.id] || ""]));
}

function getPlacedCaveColorizeSettings(item, decor = null) {
  const resolvedDecor = decor || runtime.decorMap.get(item?.decorKey);
  const layers = getDecorCaveColorLayers(resolvedDecor);
  const sanitized = sanitizePlacedCaveColorSettings(item?.caveColorSettings, resolvedDecor) || {};
  return Object.fromEntries(layers.map((layer) => [
    layer.id,
    sanitized[getDecorColorizeSettingKey(layer.id)] === true
  ]));
}

function buildPlacedCaveColorSettingsPayload(item, decor = null) {
  const resolvedDecor = decor || runtime.decorMap.get(item?.decorKey);
  const layers = getDecorCaveColorLayers(resolvedDecor);
  const colors = getPlacedCaveColorSettings(item, resolvedDecor);
  const colorize = getPlacedCaveColorizeSettings(item, resolvedDecor);
  const payload = {};

  for (const layer of layers) {
    if (colors[layer.id]) {
      payload[layer.id] = colors[layer.id];
    }
    if (colorize[layer.id]) {
      payload[getDecorColorizeSettingKey(layer.id)] = true;
    }
  }

  return payload;
}

function getCaveColorLayerLabel(layer, visibleLayers = null, decor = null) {
  const layers = Array.isArray(visibleLayers) ? visibleLayers : getVisibleDecorColorLayers(decor);
  if (layer?.id === "color1") {
    if (layers.length <= 1) {
      return "Color";
    }
    return "Color 1";
  }

  if (layer?.id === "color3") {
    return "Color 3";
  }

  return layer?.label || String(layer?.id || "Color Layer").replace(/^./, (letter) => letter.toUpperCase());
}

function formatCaveColorChoiceLabel(color) {
  if (isDecorRgbColorSetting(color)) {
    return "RGB";
  }

  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return "Original";
  }

  return getCustomGravelColorChoices().find((choice) => choice.color === normalized)?.label || normalized;
}

function updateCaveColorSettingsControls(item = getDecorSettingsTarget(), decorOverride = null) {
  if (!dom.utilityOverlayBody || runtime.utilityOverlayMode !== "decor-settings") {
    if (runtime.utilityOverlayMode !== "custom-hide-create") {
      return;
    }
  }

  const decor = decorOverride || (item ? runtime.decorMap.get(item.decorKey) : null);
  const layers = getVisibleDecorColorLayers(decor);
  if (!item || !decor || !layers.length) {
    return;
  }

  const settings = getPlacedCaveColorSettings(item, decor);
  const colorizeSettings = getPlacedCaveColorizeSettings(item, decor);
  for (const layer of layers) {
    const activeColor = normalizeDecorColorSetting(settings[layer.id] || "");
    dom.utilityOverlayBody.querySelectorAll("[data-cave-color-layer-value]").forEach((label) => {
      if (label.getAttribute("data-cave-color-layer-value") === layer.id) {
        label.textContent = formatCaveColorChoiceLabel(activeColor);
      }
    });
  }

  const swatches = dom.utilityOverlayBody.querySelectorAll("[data-cave-color-layer]");
  swatches.forEach((swatch) => {
    const layerId = swatch.getAttribute("data-cave-color-layer") || "";
    const swatchColor = normalizeDecorColorSetting(swatch.getAttribute("data-cave-color") || "");
    const activeColor = normalizeDecorColorSetting(settings[layerId] || "");
    const selected = activeColor ? swatchColor === activeColor : !swatchColor;
    swatch.classList.toggle("is-selected", selected);
    swatch.setAttribute("aria-pressed", String(selected));
  });

  const colorizeControls = dom.utilityOverlayBody.querySelectorAll("[data-cave-colorize-layer]");
  colorizeControls.forEach((control) => {
    if (!(control instanceof HTMLInputElement)) {
      return;
    }
    const layerId = control.getAttribute("data-cave-colorize-layer") || "";
    control.checked = colorizeSettings[layerId] === true;
  });
}

function updateSelectedCaveColorSetting(layerId, color) {
  const pendingCustomHide = runtime.utilityOverlayMode === "custom-hide-create" ? runtime.pendingCustomHideUpload : null;
  const item = pendingCustomHide ? getPendingCustomHidePreviewItem() : getDecorSettingsTarget();
  const decor = pendingCustomHide ? getPendingCustomHidePreviewDecor() : (item ? runtime.decorMap.get(item.decorKey) : null);
  const layers = getVisibleDecorColorLayers(decor);
  if (!item || !decor || !layers.some((layer) => layer.id === layerId)) {
    return;
  }

  const nextSettings = buildPlacedCaveColorSettingsPayload(item, decor);
  const normalizedColor = normalizeDecorColorSetting(color);
  if (normalizedColor) {
    nextSettings[layerId] = normalizedColor;
  } else {
    delete nextSettings[layerId];
  }

  const sanitized = sanitizePlacedCaveColorSettings(nextSettings, decor);
  if (pendingCustomHide) {
    if (sanitized) {
      pendingCustomHide.caveColorSettings = sanitized;
    } else {
      delete pendingCustomHide.caveColorSettings;
    }
    updateCaveColorSettingsControls(getPendingCustomHidePreviewItem(), getPendingCustomHidePreviewDecor());
    renderCustomHidePreview(Date.now());
    return;
  }
  if (sanitized) {
    item.caveColorSettings = sanitized;
  } else {
    delete item.caveColorSettings;
  }

  saveState();
  updateCaveColorSettingsControls(item);
  renderDecorSettingsMotionPreview(Date.now());
}

function updateSelectedCaveColorizeSetting(layerId, colorize) {
  const pendingCustomHide = runtime.utilityOverlayMode === "custom-hide-create" ? runtime.pendingCustomHideUpload : null;
  const item = pendingCustomHide ? getPendingCustomHidePreviewItem() : getDecorSettingsTarget();
  const decor = pendingCustomHide ? getPendingCustomHidePreviewDecor() : (item ? runtime.decorMap.get(item.decorKey) : null);
  const layers = getVisibleDecorColorLayers(decor);
  if (!item || !decor || !layers.some((layer) => layer.id === layerId)) {
    return;
  }

  const nextSettings = buildPlacedCaveColorSettingsPayload(item, decor);
  const settingKey = getDecorColorizeSettingKey(layerId);
  if (normalizeDecorColorizeSetting(colorize)) {
    nextSettings[settingKey] = true;
  } else {
    delete nextSettings[settingKey];
  }

  const sanitized = sanitizePlacedCaveColorSettings(nextSettings, decor);
  if (pendingCustomHide) {
    if (sanitized) {
      pendingCustomHide.caveColorSettings = sanitized;
    } else {
      delete pendingCustomHide.caveColorSettings;
    }
    updateCaveColorSettingsControls(getPendingCustomHidePreviewItem(), getPendingCustomHidePreviewDecor());
    renderCustomHidePreview(Date.now());
    return;
  }
  if (sanitized) {
    item.caveColorSettings = sanitized;
  } else {
    delete item.caveColorSettings;
  }

  saveState();
  updateCaveColorSettingsControls(item);
  renderDecorSettingsMotionPreview(Date.now());
}

function buildCaveBehaviorProfileFromPlacedSettings(item) {
  if (!hasPlacedCaveSettings(item)) {
    return null;
  }

  return buildCaveBehaviorProfileFromSettings(getPlacedCaveSettings(item));
}

function buildCaveBehaviorProfileFromSettings(settingsValue) {
  const settings = sanitizePlacedCaveSettings(settingsValue);
  const entries = Array.isArray(settings.entries) && settings.entries.length
    ? settings.entries
    : [settings.entry || CAVE_SETTINGS_DEFAULT_ENTRY];
  if (!settings?.seats?.length || !entries.length) {
    return null;
  }

  const portalsByEntryId = new Map();
  const portals = entries.flatMap((entry, index) => {
    const entryId = entry.id || `user-entry-${index + 1}`;
    const entryPortals = getCaveEntryOutsideLayers(entry.side).map((outsideLayer) => ({
      id: `${entryId}-${outsideLayer === 5 ? "back" : "front"}`,
      approachX: entry.x,
      approachY: clamp(entry.y + 0.12, 0.02, 0.98),
      mouthX: entry.x,
      mouthY: entry.y,
      outsideLayer,
      insideLayer: 4,
      side: outsideLayer === 5 ? "back" : "front",
      path: []
    }));
    portalsByEntryId.set(entryId, entryPortals.map((portal) => portal.id));
    return entryPortals;
  });
  const allPortalIds = portals.map((portal) => portal.id);
  const resolveSeatPortalIds = (seat) => {
    const explicitPortalIds = normalizeCaveSettingsIdList(seat?.portalIds)
      .filter((portalId) => allPortalIds.includes(portalId));
    if (explicitPortalIds.length) {
      return explicitPortalIds;
    }

    const explicitEntryIds = normalizeCaveSettingsIdList(seat?.entryIds);
    if (explicitEntryIds.length) {
      const mappedPortalIds = [...new Set(explicitEntryIds.flatMap((entryId) => portalsByEntryId.get(entryId) || []))];
      if (mappedPortalIds.length) {
        return mappedPortalIds;
      }
    }

    let nearestEntryIds = [];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of entries) {
      const entryId = entry.id || "";
      if (!entryId) {
        continue;
      }

      const distance = Math.hypot((seat?.x ?? 0.5) - entry.x, (seat?.y ?? 0.5) - entry.y);
      if (distance + 0.000001 < nearestDistance) {
        nearestDistance = distance;
        nearestEntryIds = [entryId];
        continue;
      }

      if (Math.abs(distance - nearestDistance) <= 0.000001) {
        nearestEntryIds.push(entryId);
      }
    }

    const derivedPortalIds = [...new Set(nearestEntryIds.flatMap((entryId) => portalsByEntryId.get(entryId) || []))];
    return derivedPortalIds.length ? derivedPortalIds : allPortalIds;
  };
  return {
    portals,
    insideSlots: settings.seats.map((seat, index) => ({
      id: seat.id || `seat-${index + 1}`,
      x: seat.x,
      y: seat.y,
      layer: 4,
      facing: normalizeCaveSeatFacing(seat.facing),
      portalIds: resolveSeatPortalIds(seat)
    })),
    interiorZones: [],
    lingerMinMs: DEFAULT_CAVE_BEHAVIOR_PROFILE.lingerMinMs,
    lingerMaxMs: DEFAULT_CAVE_BEHAVIOR_PROFILE.lingerMaxMs,
    insideLayer: 4
  };
}

function getCustomDecorMotionIntensityLabel(motionConfig) {
  if (motionConfig?.hasSway && motionConfig?.hasBob) {
    return "Sway / Bob Intensity";
  }
  if (motionConfig?.hasSway) {
    return "Sway Intensity";
  }
  return "Bobbing Intensity";
}

function formatCustomDecorSettingReadout(setting, asset) {
  switch (setting) {
    case "width":
      return `${Math.round(clamp(Number(asset?.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH))} px`;
    case "motionIntensity":
      return `${sanitizeCustomDecorMotionIntensity(asset?.motionIntensity).toFixed(2)}x`;
    default:
      return "";
  }
}

function getCustomDecorSettingControlValue(setting, asset) {
  switch (setting) {
    case "width":
      return Math.round(clamp(Number(asset?.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH));
    case "motionIntensity":
      return sanitizeCustomDecorMotionIntensity(asset?.motionIntensity);
    default:
      return "";
  }
}

function updateCustomDecorSettingsControls(asset) {
  if (!dom.utilityOverlayBody || runtime.utilityOverlayMode !== "custom-decor-settings") {
    return;
  }

  const labels = dom.utilityOverlayBody.querySelectorAll("[data-custom-decor-setting-value]");
  for (const label of labels) {
    const setting = label.getAttribute("data-custom-decor-setting-value");
    const readout = formatCustomDecorSettingReadout(setting, asset);
    if (readout) {
      label.textContent = readout;
    }
  }

  const controls = dom.utilityOverlayBody.querySelectorAll("[data-custom-decor-setting]");
  for (const control of controls) {
    const setting = control.getAttribute("data-custom-decor-setting");
    const value = getCustomDecorSettingControlValue(setting, asset);
    if ((control instanceof HTMLInputElement || control instanceof HTMLSelectElement) && document.activeElement !== control) {
      control.value = String(value);
    }
  }
}

function updateSelectedCustomDecorSetting(setting, value) {
  const item = getCustomDecorSettingsTarget();
  const asset = getCustomDecorAssetForItem(item);
  if (!item || !asset) {
    return;
  }

  switch (setting) {
    case "width":
      asset.width = clamp(
        Math.round(Number(value) || CUSTOM_DECOR_DEFAULT_WIDTH),
        CUSTOM_DECOR_MIN_WIDTH,
        CUSTOM_DECOR_MAX_WIDTH
      );
      break;
    case "motionIntensity":
      asset.motionIntensity = sanitizeCustomDecorMotionIntensity(value);
      break;
    default:
      return;
  }

  const sanitizedAsset = copyRuntimeImageSources(asset, sanitizeCustomDecorAssetEntry(asset, item.decorKey));
  if (!sanitizedAsset) {
    return;
  }

  state.customDecorAssets[item.decorKey] = sanitizedAsset;
  syncRuntimeCustomDecorAssetsFromState(state);

  if (setting === "width" && Array.isArray(state.placedDecor)) {
    for (const placedItem of state.placedDecor) {
      if (placedItem.decorKey !== item.decorKey) {
        continue;
      }
      const placement = clampDecorPlacement(placedItem.xNorm, placedItem.yNorm, { item: placedItem, applyGravity: true });
      placedItem.xNorm = placement.xNorm;
      placedItem.yNorm = placement.yNorm;
      updatePlacedDecorResizeAnchor(placedItem);
    }
  }

  saveState();
  updateCustomDecorSettingsControls(sanitizedAsset);
}

function getDecorLayerSelectValue(item) {
  return getDecorFrontLayer(item?.decorKey, item?.tankLayer ?? DEFAULT_TANK_LAYER);
}

function renderDecorLayerOptions(item) {
  const selectedLayer = getDecorLayerSelectValue(item);
  const caveLocked = isCaveDecorKey(item?.decorKey);

  return Array.from({ length: TANK_DEPTH_LAYERS }, (_, index) => {
    const layer = index + 1;
    const selected = selectedLayer === layer;
    const disabled = caveLocked && !selected;
    return `
      <option value="${layer}" ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}>
        Layer ${layer}${layer === 1 ? " (front)" : layer === TANK_DEPTH_LAYERS ? " (back)" : ""}
      </option>
    `;
  }).join("");
}

function formatDecorSettingReadout(setting, item) {
  const motionSettings = getPlacedDecorMotionSettings(item);
  switch (setting) {
    case "size":
      return formatDecorScale(Number(item?.scale) || getDecorScaleDefault(item?.decorKey));
    case "tankLayer":
      return getDecorLayerSpan(item?.decorKey, item?.tankLayer ?? DEFAULT_TANK_LAYER).label;
    case "swayIntensity":
      return `${motionSettings.swayIntensity.toFixed(2)}x`;
    case "bobIntensity":
      return `${motionSettings.bobIntensity.toFixed(2)}x`;
    case "swaySpeed":
      return `${motionSettings.swaySpeed.toFixed(2)}x`;
    case "bobSpeed":
      return `${motionSettings.bobSpeed.toFixed(2)}x`;
    case "swaySplitY":
      return `${Math.round(motionSettings.swaySplitY * 100)}%`;
    default:
      return "";
  }
}

function getDecorSettingControlValue(setting, item) {
  const motionSettings = getPlacedDecorMotionSettings(item);
  switch (setting) {
    case "size":
      return clamp(Number(item?.scale) || getDecorScaleDefault(item?.decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
    case "tankLayer":
      return getDecorLayerSelectValue(item);
    case "swayIntensity":
      return motionSettings.swayIntensity;
    case "bobIntensity":
      return motionSettings.bobIntensity;
    case "swaySpeed":
      return motionSettings.swaySpeed;
    case "bobSpeed":
      return motionSettings.bobSpeed;
    case "swaySplitY":
      return Math.round(motionSettings.swaySplitY * 100);
    case "swaySide":
      return motionSettings.swaySide;
    default:
      return "";
  }
}

function updateDecorSettingsControls(item = getDecorSettingsTarget()) {
  if (!dom.utilityOverlayBody || runtime.utilityOverlayMode !== "decor-settings" || !item) {
    return;
  }

  const labels = dom.utilityOverlayBody.querySelectorAll("[data-decor-setting-value]");
  for (const label of labels) {
    const setting = label.getAttribute("data-decor-setting-value");
    const readout = formatDecorSettingReadout(setting, item);
    if (readout) {
      label.textContent = readout;
    }
  }

  const controls = dom.utilityOverlayBody.querySelectorAll("[data-decor-setting]");
  for (const control of controls) {
    const setting = control.getAttribute("data-decor-setting");
    const value = getDecorSettingControlValue(setting, item);
    if ((control instanceof HTMLInputElement || control instanceof HTMLSelectElement) && document.activeElement !== control) {
      control.value = String(value);
    }
  }

  const motionSettings = getPlacedDecorMotionSettings(item);
  const splitLine = dom.utilityOverlayBody.querySelector("[data-decor-settings-split-line]");
  if (splitLine instanceof HTMLElement) {
    splitLine.style.top = `${(motionSettings.swaySplitY * 100).toFixed(2)}%`;
  }

  if (isCaveDecorKey(item.decorKey)) {
    updateCaveSettingsControls(item);
  }
}

function setDecorGroupScale(item, nextScale, save = false) {
  const groupItems = getDecorGroupTransformItems(item);
  if (groupItems.length <= 1) {
    return null;
  }

  const currentScale = Number(item.scale) || getDecorScaleDefault(item.decorKey);
  const clampedScale = clamp(Number(nextScale) || currentScale, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  if (Math.abs(clampedScale - currentScale) < 0.0001) {
    return clampedScale;
  }

  const factor = clampedScale / Math.max(0.0001, currentScale);
  const center = getDecorItemsCenter(groupItems);
  for (const groupItem of groupItems) {
    groupItem.scale = clamp((Number(groupItem.scale) || getDecorScaleDefault(groupItem.decorKey)) * factor, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
    groupItem.xNorm = center.xNorm + (groupItem.xNorm - center.xNorm) * factor;
    groupItem.yNorm = center.yNorm + (groupItem.yNorm - center.yNorm) * factor;
    const placement = clampDecorPlacement(groupItem.xNorm, groupItem.yNorm, { item: groupItem, applyGravity: true });
    groupItem.xNorm = placement.xNorm;
    groupItem.yNorm = placement.yNorm;
    updatePlacedDecorResizeAnchor(groupItem);
  }

  if (save) {
    saveState();
  }
  return clampedScale;
}

function setDecorGroupLayer(item, nextLayer, save = false) {
  const groupItems = getDecorGroupTransformItems(item);
  if (groupItems.length <= 1) {
    return null;
  }

  const currentPrimaryLayer = getDecorLayerSelectValue(item);
  const targetPrimaryLayer = getDecorFrontLayer(item.decorKey, nextLayer);
  const layerOffset = targetPrimaryLayer - currentPrimaryLayer;
  if (!layerOffset) {
    return currentPrimaryLayer;
  }

  let changed = false;
  let resolvedPrimaryLayer = currentPrimaryLayer;
  for (const groupItem of groupItems) {
    const currentLayer = getDecorLayerSelectValue(groupItem);
    const resolvedLayer = getDecorFrontLayer(groupItem.decorKey, currentLayer + layerOffset);
    groupItem.tankLayer = currentLayer;
    if (resolvedLayer === currentLayer) {
      continue;
    }

    groupItem.tankLayer = resolvedLayer;
    const placement = clampDecorPlacement(groupItem.xNorm, groupItem.yNorm, { item: groupItem, applyGravity: true });
    groupItem.xNorm = placement.xNorm;
    groupItem.yNorm = placement.yNorm;
    updatePlacedDecorResizeAnchor(groupItem);
    if (groupItem.id === item.id) {
      resolvedPrimaryLayer = resolvedLayer;
    }
    changed = true;
  }

  if (!changed) {
    return currentPrimaryLayer;
  }

  runtime.decorPlacementLayer = resolvedPrimaryLayer;
  if (save) {
    saveState();
  }
  return resolvedPrimaryLayer;
}

function updateSelectedDecorSetting(setting, value) {
  const item = getDecorSettingsTarget();
  if (!item) {
    return;
  }

  if (setting !== "size" && setting !== "tankLayer") {
    return;
  }

  if (setting === "tankLayer") {
    const nextLayer = getDecorFrontLayer(item.decorKey, value);
    const groupLayer = isPlacedDecorGrouped(item) ? setDecorGroupLayer(item, nextLayer, false) : null;
    if (groupLayer === null) {
      const currentLayer = getDecorLayerSelectValue(item);
      item.tankLayer = currentLayer;
      if (nextLayer !== currentLayer) {
        item.tankLayer = nextLayer;
        const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, applyGravity: true });
        item.xNorm = placement.xNorm;
        item.yNorm = placement.yNorm;
        updatePlacedDecorResizeAnchor(item);
      }
      runtime.decorPlacementLayer = getDecorLayerSelectValue(item);
    }
  } else {
    const nextScale = clamp(Number(value) || getDecorScaleDefault(item.decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
    if (isPlacedDecorGrouped(item)) {
      setDecorGroupScale(item, nextScale, false);
    } else {
      item.scale = nextScale;
      const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, applyGravity: true });
      item.xNorm = placement.xNorm;
      item.yNorm = placement.yNorm;
      updatePlacedDecorResizeAnchor(item);
    }
  }

  saveState();
  updateDecorSettingsControls(item);
}

function updateSelectedDecorMotionSetting(setting, value) {
  const item = getDecorSettingsTarget();
  if (!item) {
    return;
  }

  const capabilities = getDecorMotionCapabilities(item);
  const settings = ensurePlacedDecorSettings(item);
  if (!settings) {
    return;
  }

  switch (setting) {
    case "swayIntensity":
      if (!capabilities.hasSway) {
        return;
      }
      settings.swayIntensity = sanitizeCustomDecorMotionIntensity(value);
      break;
    case "bobIntensity":
      if (!capabilities.hasBob) {
        return;
      }
      settings.bobIntensity = sanitizeCustomDecorMotionIntensity(value);
      break;
    case "swaySpeed":
      if (!capabilities.hasSway) {
        return;
      }
      settings.swaySpeed = sanitizeDecorMotionSpeed(value);
      break;
    case "bobSpeed":
      if (!capabilities.hasBob) {
        return;
      }
      settings.bobSpeed = sanitizeDecorMotionSpeed(value);
      break;
    case "swaySplitY":
      if (!capabilities.hasSway) {
        return;
      }
      settings.swaySplitY = sanitizeCustomDecorMotionSplit(Number(value) / 100);
      break;
    case "swaySide":
      if (!capabilities.hasSway) {
        return;
      }
      settings.swaySide = normalizeDecorSwaySide(value);
      break;
    default:
      return;
  }

  saveState();
  updateDecorSettingsControls(item);
}

function formatCaveSettingPercent(value) {
  return `${Math.round(sanitizeCaveLocalCoordinate(value) * 100)}%`;
}

function getCaveSettingControlValue(setting, settings, seatIndex = null, entryIndex = null) {
  const resolved = sanitizePlacedCaveSettings(settings);
  const numericEntryIndex = Number(entryIndex);
  const resolvedEntryIndex = clamp(
    Number.isFinite(numericEntryIndex)
      ? Math.floor(numericEntryIndex)
      : Math.floor(Number(resolved.activeEntryIndex) || 0),
    0,
    Math.max(0, resolved.entries.length - 1)
  );
  const entry = resolved.entries[resolvedEntryIndex] || buildDefaultCaveEntryPoint(resolvedEntryIndex, resolved.entryCount);
  const numericSeatIndex = Number(seatIndex);
  const index = clamp(
    Number.isFinite(numericSeatIndex)
      ? Math.floor(numericSeatIndex)
      : Math.floor(Number(resolved.activeSeatIndex) || 0),
    0,
    Math.max(0, resolved.seats.length - 1)
  );
  const seat = resolved.seats[index] || buildDefaultCaveSeatPoint(index, resolved.seatCount);

  switch (setting) {
    case "entryX":
      return entry.x;
    case "entryY":
      return entry.y;
    case "entrySide":
      return normalizeCaveEntrySide(entry.side);
    case "entryCount":
      return resolved.entryCount;
    case "activeEntryIndex":
      return resolved.activeEntryIndex;
    case "seatX":
      return seat.x;
    case "seatY":
      return seat.y;
    case "seatFacing":
      return normalizeCaveSeatFacing(seat.facing);
    case "seatCount":
      return resolved.seatCount;
    case "activeSeatIndex":
      return resolved.activeSeatIndex;
    default:
      return "";
  }
}

function updateCaveSettingsPreviewMarkers(settings) {
  if (!dom.utilityOverlayBody) {
    return;
  }

  const resolved = sanitizePlacedCaveSettings(settings);
  const entryMarkers = dom.utilityOverlayBody.querySelectorAll("[data-cave-settings-entry-marker]");
  for (const marker of entryMarkers) {
    if (!(marker instanceof HTMLElement)) {
      continue;
    }

    const index = clamp(
      Math.floor(Number(marker.getAttribute("data-cave-settings-entry-marker")) || 0),
      0,
      Math.max(0, resolved.entries.length - 1)
    );
    const entry = resolved.entries[index];
    if (!entry) {
      marker.hidden = true;
      continue;
    }

    marker.hidden = false;
    marker.style.left = `${(entry.x * 100).toFixed(2)}%`;
    marker.style.top = `${(entry.y * 100).toFixed(2)}%`;
    marker.classList.toggle("is-active", index === resolved.activeEntryIndex);
  }

  const markers = dom.utilityOverlayBody.querySelectorAll("[data-cave-settings-seat-marker]");
  for (const marker of markers) {
    if (!(marker instanceof HTMLElement)) {
      continue;
    }

    const index = clamp(
      Math.floor(Number(marker.getAttribute("data-cave-settings-seat-marker")) || 0),
      0,
      Math.max(0, resolved.seats.length - 1)
    );
    const seat = resolved.seats[index];
    if (!seat) {
      marker.hidden = true;
      continue;
    }

    marker.hidden = false;
    marker.style.left = `${(seat.x * 100).toFixed(2)}%`;
    marker.style.top = `${(seat.y * 100).toFixed(2)}%`;
    marker.classList.toggle("is-active", index === resolved.activeSeatIndex);
  }
}

function updateCaveSettingsControls(item = getEditableCaveSettingsTarget()?.item) {
  if (
    !dom.utilityOverlayBody
    || (runtime.utilityOverlayMode !== "decor-settings" && runtime.utilityOverlayMode !== "custom-hide-create")
    || !item
    || !isCaveDecorKey(item.decorKey)
  ) {
    return;
  }

  const settings = getPlacedCaveSettings(item);
  if (!settings) {
    return;
  }

  const labels = dom.utilityOverlayBody.querySelectorAll("[data-cave-setting-value]");
  for (const label of labels) {
    const setting = label.getAttribute("data-cave-setting-value");
    const seatIndex = label.getAttribute("data-cave-seat-index");
    const entryIndex = label.getAttribute("data-cave-entry-index");
    const value = getCaveSettingControlValue(setting, settings, seatIndex, entryIndex);
    if (setting === "seatCount" || setting === "entryCount") {
      label.textContent = String(value);
    } else if (setting === "activeEntryIndex") {
      label.textContent = `Entry ${Number(value) + 1}`;
    } else if (setting === "activeSeatIndex") {
      label.textContent = `Seat ${Number(value) + 1}`;
    } else if (Number.isFinite(Number(value))) {
      label.textContent = formatCaveSettingPercent(value);
    }
  }

  const controls = dom.utilityOverlayBody.querySelectorAll("[data-cave-setting]");
  for (const control of controls) {
    if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLSelectElement)) {
      continue;
    }

    const setting = control.getAttribute("data-cave-setting");
    const seatIndex = control.getAttribute("data-cave-seat-index");
    const entryIndex = control.getAttribute("data-cave-entry-index");
    const value = getCaveSettingControlValue(setting, settings, seatIndex, entryIndex);
    if (document.activeElement !== control) {
      control.value = String(value);
    }
  }

  const entryCards = dom.utilityOverlayBody.querySelectorAll("[data-cave-entry-card]");
  for (const card of entryCards) {
    if (!(card instanceof HTMLElement)) {
      continue;
    }

    const index = Math.floor(Number(card.getAttribute("data-cave-entry-card")) || 0);
    card.classList.toggle("is-active", index === settings.activeEntryIndex);
  }

  const seatCards = dom.utilityOverlayBody.querySelectorAll("[data-cave-seat-card]");
  for (const card of seatCards) {
    if (!(card instanceof HTMLElement)) {
      continue;
    }

    const index = Math.floor(Number(card.getAttribute("data-cave-seat-card")) || 0);
    card.classList.toggle("is-active", index === settings.activeSeatIndex);
  }

  const seatFacingButtons = dom.utilityOverlayBody.querySelectorAll("[data-cave-seat-facing]");
  for (const button of seatFacingButtons) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }

    const index = clamp(
      Math.floor(Number(button.getAttribute("data-cave-seat-index")) || 0),
      0,
      Math.max(0, settings.seats.length - 1)
    );
    const buttonFacing = normalizeCaveSeatFacing(button.getAttribute("data-cave-seat-facing"));
    const selected = normalizeCaveSeatFacing(settings.seats[index]?.facing) === buttonFacing;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }

  updateCaveSettingsPreviewMarkers(settings);
}

function clearCaveBehaviorForDecor(decorId) {
  if (!decorId) {
    return;
  }

  runtime.caveNavCache.clear();
  for (const fish of state.fish) {
    if (fish?.caveDecorId === decorId) {
      abortFishCaveBehavior(fish, Date.now(), true);
    }
  }

  for (const [fishId, plan] of runtime.activeFishCavePlans.entries()) {
    if (plan?.decorId === decorId) {
      runtime.activeFishCavePlans.delete(fishId);
    }
  }
}

function getEditableCaveSettingsTarget() {
  if (runtime.utilityOverlayMode === "custom-hide-create") {
    const item = getPendingCustomHidePreviewItem();
    return item ? { item, settings: item.caveSettings, pending: runtime.pendingCustomHideUpload } : null;
  }

  const item = getDecorSettingsTarget();
  const settings = ensurePlacedCaveSettings(item);
  return item && settings ? { item, settings, pending: null } : null;
}

function updateSelectedCaveSetting(setting, value, seatIndexValue = null, entryIndexValue = null) {
  const target = getEditableCaveSettingsTarget();
  if (!target?.item || !target.settings) {
    return;
  }
  const { item, pending } = target;
  const settings = target.settings;

  const numericValue = Number(value);
  const rawValue = value;
  const numericEntryIndex = Number(entryIndexValue);
  const entryIndex = clamp(
    Number.isFinite(numericEntryIndex)
      ? Math.floor(numericEntryIndex)
      : Math.floor(Number(settings.activeEntryIndex) || 0),
    0,
    Math.max(0, settings.entries.length - 1)
  );
  const numericSeatIndex = Number(seatIndexValue);
  const seatIndex = clamp(
    Number.isFinite(numericSeatIndex)
      ? Math.floor(numericSeatIndex)
      : Math.floor(Number(settings.activeSeatIndex) || 0),
    0,
    Math.max(0, settings.seats.length - 1)
  );
  let needsRender = false;

  switch (setting) {
    case "entryX":
      if (!settings.entries[entryIndex]) {
        return;
      }
      settings.entries[entryIndex].x = sanitizeCaveLocalCoordinate(numericValue, settings.entries[entryIndex].x);
      settings.activeEntryIndex = entryIndex;
      runtime.caveSettingsActivePointType = "entry";
      break;
    case "entryY":
      if (!settings.entries[entryIndex]) {
        return;
      }
      settings.entries[entryIndex].y = sanitizeCaveLocalCoordinate(numericValue, settings.entries[entryIndex].y);
      settings.activeEntryIndex = entryIndex;
      runtime.caveSettingsActivePointType = "entry";
      break;
    case "entrySide":
      if (!settings.entries[entryIndex]) {
        return;
      }
      settings.entries[entryIndex].side = normalizeCaveEntrySide(rawValue);
      settings.activeEntryIndex = entryIndex;
      runtime.caveSettingsActivePointType = "entry";
      break;
    case "entryCount":
      settings.entryCount = clamp(
        Math.floor(numericValue || CAVE_SETTINGS_DEFAULT_ENTRIES),
        CAVE_SETTINGS_MIN_ENTRIES,
        CAVE_SETTINGS_MAX_ENTRIES
      );
      runtime.caveSettingsActivePointType = "entry";
      needsRender = true;
      break;
    case "activeEntryIndex":
      settings.activeEntryIndex = clamp(
        Number.isFinite(numericValue) ? Math.floor(numericValue) : 0,
        0,
        Math.max(0, settings.entries.length - 1)
      );
      runtime.caveSettingsActivePointType = "entry";
      break;
    case "seatX":
      if (!settings.seats[seatIndex]) {
        return;
      }
      settings.seats[seatIndex].x = sanitizeCaveLocalCoordinate(numericValue, settings.seats[seatIndex].x);
      settings.activeSeatIndex = seatIndex;
      runtime.caveSettingsActivePointType = "seat";
      break;
    case "seatY":
      if (!settings.seats[seatIndex]) {
        return;
      }
      settings.seats[seatIndex].y = sanitizeCaveLocalCoordinate(numericValue, settings.seats[seatIndex].y);
      settings.activeSeatIndex = seatIndex;
      runtime.caveSettingsActivePointType = "seat";
      break;
    case "seatFacing":
      if (!settings.seats[seatIndex]) {
        return;
      }
      settings.seats[seatIndex].facing = normalizeCaveSeatFacing(rawValue, settings.seats[seatIndex].facing);
      settings.activeSeatIndex = seatIndex;
      runtime.caveSettingsActivePointType = "seat";
      break;
    case "seatCount":
      settings.seatCount = clamp(
        Math.floor(numericValue || CAVE_SETTINGS_DEFAULT_SEATS),
        CAVE_SETTINGS_MIN_SEATS,
        CAVE_SETTINGS_MAX_SEATS
      );
      runtime.caveSettingsActivePointType = "seat";
      needsRender = true;
      break;
    case "activeSeatIndex":
      settings.activeSeatIndex = clamp(
        Number.isFinite(numericValue) ? Math.floor(numericValue) : 0,
        0,
        Math.max(0, settings.seats.length - 1)
      );
      runtime.caveSettingsActivePointType = "seat";
      break;
    default:
      return;
  }

  item.caveSettings = sanitizePlacedCaveSettings(settings);
  if (pending) {
    pending.caveSettings = item.caveSettings;
  } else {
    clearCaveBehaviorForDecor(item.id);
    saveState();
  }

  if (needsRender) {
    renderUi(Date.now());
    return;
  }

  updateCaveSettingsControls(item);
}

function getCaveSettingsPreviewLocalPoint(event) {
  const frame = dom.utilityOverlayBody?.querySelector("[data-decor-settings-preview-frame]");
  if (!(frame instanceof HTMLElement)) {
    return null;
  }

  const rect = frame.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  return {
    x: sanitizeCaveLocalCoordinate((event.clientX - rect.left) / rect.width, 0.5),
    y: sanitizeCaveLocalCoordinate((event.clientY - rect.top) / rect.height, 0.5)
  };
}

function applyCaveSettingsPreviewPoint(kind, indexValue, point, options = {}) {
  const editableTarget = getEditableCaveSettingsTarget();
  if (!editableTarget?.item || !editableTarget.settings || !point) {
    return false;
  }
  const { item, pending } = editableTarget;
  const settings = editableTarget.settings;

  const kindId = kind === "entry" ? "entry" : "seat";
  const index = clamp(
    Math.floor(Number(indexValue) || 0),
    0,
    Math.max(0, (kindId === "entry" ? settings.entries.length : settings.seats.length) - 1)
  );
  const target = kindId === "entry" ? settings.entries[index] : settings.seats[index];
  if (!target) {
    return false;
  }

  target.x = sanitizeCaveLocalCoordinate(point.x, target.x);
  target.y = sanitizeCaveLocalCoordinate(point.y, target.y);
  if (kindId === "entry") {
    settings.activeEntryIndex = index;
  } else {
    settings.activeSeatIndex = index;
  }
  runtime.caveSettingsActivePointType = kindId;
  item.caveSettings = sanitizePlacedCaveSettings(settings);
  if (pending) {
    pending.caveSettings = item.caveSettings;
  } else if (options.commit) {
    clearCaveBehaviorForDecor(item.id);
    saveState();
  }
  updateCaveSettingsControls(item);
  return true;
}

function getCaveSettingsPreviewPointerTarget(event) {
  const target = event.target instanceof Element ? event.target : null;
  const settings = getEditableCaveSettingsTarget()?.settings || sanitizePlacedCaveSettings();
  const entryMarker = target?.closest("[data-cave-settings-entry-marker]");
  if (entryMarker) {
    return {
      kind: "entry",
      index: Math.floor(Number(entryMarker.getAttribute("data-cave-settings-entry-marker")) || 0)
    };
  }

  const seatMarker = target?.closest("[data-cave-settings-seat-marker]");
  if (seatMarker) {
    return {
      kind: "seat",
      index: Math.floor(Number(seatMarker.getAttribute("data-cave-settings-seat-marker")) || 0)
    };
  }

  if (runtime.caveSettingsActivePointType === "entry") {
    return {
      kind: "entry",
      index: settings.activeEntryIndex || 0
    };
  }

  return {
    kind: "seat",
    index: settings.activeSeatIndex || 0
  };
}

function finishCaveSettingsPreviewDrag(event) {
  const drag = runtime.caveSettingsDrag;
  if (!drag || (event?.pointerId !== undefined && drag.pointerId !== event.pointerId)) {
    return;
  }

  const point = event ? getCaveSettingsPreviewLocalPoint(event) : null;
  if (point) {
    applyCaveSettingsPreviewPoint(drag.kind, drag.index, point, { commit: true });
  } else {
    const editableTarget = getEditableCaveSettingsTarget();
    if (editableTarget?.item && !editableTarget.pending) {
      const item = editableTarget.item;
      clearCaveBehaviorForDecor(item.id);
      saveState();
    }
  }
  runtime.caveSettingsDrag = null;
}

function formatBubblerSpeedReadout(speed) {
  const resolvedSpeed = clamp(Number(speed) || DEFAULT_BUBBLER_SPEED, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED);
  return resolvedSpeed < 1
    ? resolvedSpeed.toFixed(2)
    : resolvedSpeed.toFixed(1);
}

function formatBubblerSettingReadout(setting, settings) {
  switch (setting) {
    case "speed":
      return formatBubblerSpeedReadout(settings.speed);
    case "amount":
    case "intensity":
      return settings.amount < 1
        ? settings.amount.toFixed(1)
        : String(Math.round(settings.amount));
    case "bubbleSize":
      return `${settings.bubbleSize.toFixed(2)}x`;
    case "bubbleOpacity":
      return `${settings.bubbleOpacity.toFixed(2)}x`;
    case "width":
      return `${Math.round(settings.width)} px`;
    case "distance":
      return `${Math.round(settings.distance)} px`;
    case "bubbleColor": {
      const color = normalizeDecorColorSetting(settings.bubbleColor) || DEFAULT_BUBBLER_BUBBLE_COLOR;
      if (isDecorRgbColorSetting(color)) {
        return "RGB";
      }
      const choice = getCustomGravelColorChoices().find((entry) => entry.color === color);
      return choice?.label || color;
    }
    case "bubbleColorize":
      return settings.bubbleColorize ? "On" : "Off";
    case "bubbleFillOpacity":
      return `${Math.round(settings.bubbleFillOpacity * 100)}%`;
    case "bubblePopEnabled":
      return settings.bubblePopEnabled ? "On" : "Off";
    case "bubbleMalformed":
      return settings.bubbleMalformed ? "On" : "Off";
    case "bubbleMalformedIntensity":
      return `${settings.bubbleMalformedIntensity.toFixed(2)}x`;
    case "bubbleMalformedSpeed":
      return settings.bubbleMalformedSpeed < 1
        ? `${settings.bubbleMalformedSpeed.toFixed(2)}x`
        : `${settings.bubbleMalformedSpeed.toFixed(1)}x`;
    default:
      return "";
  }
}

function getBubblerSettingControlValue(setting, settings) {
  switch (setting) {
    case "speed":
      return settings.speed;
    case "amount":
    case "intensity":
      return settings.amount;
    case "bubbleSize":
      return settings.bubbleSize;
    case "bubbleOpacity":
      return settings.bubbleOpacity;
    case "direction":
      return settings.direction;
    case "width":
      return settings.width;
    case "distance":
      return settings.distance;
    case "bubbleColor":
      return settings.bubbleColor;
    case "bubbleColorize":
      return settings.bubbleColorize;
    case "bubbleFillOpacity":
      return settings.bubbleFillOpacity;
    case "bubblePopEnabled":
      return settings.bubblePopEnabled;
    case "bubbleMalformed":
      return settings.bubbleMalformed;
    case "bubbleMalformedIntensity":
      return settings.bubbleMalformedIntensity;
    case "bubbleMalformedSpeed":
      return settings.bubbleMalformedSpeed;
    default:
      return "";
  }
}

function updateBubblerSettingsControls(settings) {
  if (
    !dom.utilityOverlayBody
    || (runtime.utilityOverlayMode !== "bubbler-settings" && runtime.utilityOverlayMode !== "decor-settings")
  ) {
    return;
  }

  const resolvedSettings = createDefaultBubblerSettings(settings);
  const labels = dom.utilityOverlayBody.querySelectorAll("[data-bubbler-setting-value]");
  for (const label of labels) {
    const setting = label.getAttribute("data-bubbler-setting-value");
    const readout = formatBubblerSettingReadout(setting, resolvedSettings);
    if (readout) {
      label.textContent = readout;
    }
  }

  const controls = dom.utilityOverlayBody.querySelectorAll("[data-bubbler-setting]");
  for (const control of controls) {
    const setting = control.getAttribute("data-bubbler-setting");
    const value = getBubblerSettingControlValue(setting, resolvedSettings);
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = Boolean(value);
    } else if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.value = String(value);
    }
  }

  const activeColor = normalizeDecorColorSetting(resolvedSettings.bubbleColor) || DEFAULT_BUBBLER_BUBBLE_COLOR;
  const swatches = dom.utilityOverlayBody.querySelectorAll("[data-bubbler-color]");
  for (const swatch of swatches) {
    const selected = normalizeDecorColorSetting(swatch.getAttribute("data-bubbler-color")) === activeColor;
    swatch.classList.toggle("is-selected", selected);
    swatch.setAttribute("aria-pressed", selected ? "true" : "false");
  }
}

function updateSelectedBubblerSetting(setting, value) {
  const item = getBubblerSettingsTarget();
  if (!item) {
    return;
  }

  const settings = getPlacedDecorBubblerSettings(item);
  const numericValue = Number(value);
  const finiteValue = Number.isFinite(numericValue) ? numericValue : null;
  switch (setting) {
    case "speed":
      settings.speed = clamp(finiteValue ?? DEFAULT_BUBBLER_SPEED, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED);
      break;
    case "amount":
    case "intensity":
      settings.amount = clamp(finiteValue ?? DEFAULT_CUSTOM_BUBBLER_AMOUNT, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY);
      settings.intensity = settings.amount;
      break;
    case "bubbleSize":
      settings.bubbleSize = clamp(finiteValue ?? DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE, MIN_CUSTOM_BUBBLER_BUBBLE_SIZE, MAX_CUSTOM_BUBBLER_BUBBLE_SIZE);
      break;
    case "bubbleOpacity":
      settings.bubbleOpacity = clamp(finiteValue ?? DEFAULT_BUBBLER_BUBBLE_OPACITY, MIN_CUSTOM_BUBBLER_OPACITY, MAX_CUSTOM_BUBBLER_OPACITY);
      break;
    case "direction":
      settings.direction = normalizeBubblerDirection(value);
      break;
    case "width":
      settings.width = clamp(finiteValue ?? DEFAULT_BUBBLER_SPREAD_PX, MIN_CUSTOM_BUBBLER_WIDTH_PX, MAX_CUSTOM_BUBBLER_WIDTH_PX);
      settings.spread = settings.width;
      break;
    case "distance":
      settings.distance = clamp(finiteValue ?? DEFAULT_BUBBLER_FADE_DISTANCE_PX, MIN_CUSTOM_BUBBLER_DISTANCE_PX, MAX_CUSTOM_BUBBLER_DISTANCE_PX);
      settings.fadeDistance = settings.distance;
      break;
    case "bubbleColor":
      settings.bubbleColor = normalizeDecorColorSetting(value) || DEFAULT_BUBBLER_BUBBLE_COLOR;
      settings.bubbleColors = [settings.bubbleColor];
      break;
    case "bubbleColorize":
      settings.bubbleColorize = normalizeDecorColorizeSetting(value);
      break;
    case "bubbleFillOpacity":
      settings.bubbleFillOpacity = clamp(finiteValue ?? DEFAULT_BUBBLER_FILL_OPACITY, 0, 1);
      break;
    case "bubblePopEnabled":
      settings.bubblePopEnabled = Boolean(value);
      break;
    case "bubbleMalformed":
      settings.bubbleMalformed = Boolean(value);
      break;
    case "bubbleMalformedIntensity":
      settings.bubbleMalformedIntensity = clamp(finiteValue ?? DEFAULT_BUBBLER_MALFORMED_INTENSITY, MIN_BUBBLER_MALFORMED_INTENSITY, MAX_BUBBLER_MALFORMED_INTENSITY);
      break;
    case "bubbleMalformedSpeed":
      settings.bubbleMalformedSpeed = clamp(finiteValue ?? DEFAULT_BUBBLER_MALFORMED_SPEED, MIN_BUBBLER_MALFORMED_SPEED, MAX_BUBBLER_MALFORMED_SPEED);
      break;
    default:
      return;
  }

  item.bubblerSettings = createDefaultBubblerSettings(settings);
  saveState();
  updateBubblerSettingsControls(item.bubblerSettings);
}

function resetSelectedBubblerSettings() {
  const item = getBubblerSettingsTarget();
  if (!item) {
    return;
  }

  delete item.bubblerSettings;
  saveState();
  renderUi(Date.now());
  showToast("Bubbler reset.");
}

function sanitizeCustomDecorName(value, fallback = "Custom Decor") {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  if (trimmed) {
    return trimmed.slice(0, 48);
  }
  return String(fallback || "Custom Decor").replace(/\s+/g, " ").trim().slice(0, 48) || "Custom Decor";
}

function getCustomDecorMotionTypeConfig(value) {
  const motionType = String(value || "").trim().toLowerCase() === "floating-static"
    ? "floating-seaweed"
    : String(value || "").trim().toLowerCase();
  return CUSTOM_DECOR_MOTION_TYPES.find((entry) => entry.id === motionType)
    || CUSTOM_DECOR_MOTION_TYPES[0];
}

function normalizeCustomDecorMotionType(value) {
  return getCustomDecorMotionTypeConfig(value).id;
}

function customDecorMotionTypeUsesSplit(value) {
  return Boolean(getCustomDecorMotionTypeConfig(value).usesSplit);
}

function sanitizeCustomDecorMotionSplit(value) {
  return clamp(Number(value) || DEFAULT_CUSTOM_DECOR_MOTION_SPLIT_Y, 0.08, 0.92);
}

function sanitizeCustomDecorMotionIntensity(value) {
  const numeric = Number(value);
  return clamp(
    Number.isFinite(numeric) ? numeric : DEFAULT_CUSTOM_DECOR_MOTION_INTENSITY,
    MIN_CUSTOM_DECOR_MOTION_INTENSITY,
    MAX_CUSTOM_DECOR_MOTION_INTENSITY
  );
}

function sanitizeDecorMotionSpeed(value) {
  const numeric = Number(value);
  return clamp(
    Number.isFinite(numeric) ? numeric : DEFAULT_DECOR_MOTION_SPEED,
    MIN_DECOR_MOTION_SPEED,
    MAX_DECOR_MOTION_SPEED
  );
}

function normalizeDecorSwaySide(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return DECOR_SWAY_SIDE_OPTIONS.some((option) => option.id === normalized)
    ? normalized
    : DEFAULT_DECOR_SWAY_SIDE;
}

function getDecorSwaySliceProgress(t, splitY, swaySide) {
  const clampedT = clamp(Number(t) || 0, 0, 1);
  const clampedSplit = sanitizeCustomDecorMotionSplit(splitY);
  const side = normalizeDecorSwaySide(swaySide);
  if (side === "below") {
    if (clampedT < clampedSplit) {
      return 0;
    }
    return clamp((clampedT - clampedSplit) / Math.max(0.01, 1 - clampedSplit), 0, 1);
  }

  if (clampedT > clampedSplit) {
    return 0;
  }
  return clamp((clampedSplit - clampedT) / Math.max(0.01, clampedSplit), 0, 1);
}

function focusUtilityOverlayInputAfterRender(selector, afterOpen = null) {
  window.requestAnimationFrame(() => {
    const input = selector ? dom.utilityOverlayBody?.querySelector(selector) : null;
    input?.focus?.();
    input?.select?.();
    afterOpen?.();
  });
}

function openCustomAssetEditorOverlay(type, pendingValue, options = {}) {
  const assetType = String(type || "").trim();
  const overlayConfig = assetType && Object.prototype.hasOwnProperty.call(CUSTOM_ASSET_EDITOR_OVERLAY_CONFIGS, assetType)
    ? CUSTOM_ASSET_EDITOR_OVERLAY_CONFIGS[assetType]
    : null;
  if (!overlayConfig?.pendingStateKey) {
    return false;
  }

  if (Array.isArray(options.clearPendingTypes) && options.clearPendingTypes.length) {
    clearPendingCustomAssetUploads({ types: options.clearPendingTypes });
  }

  if (runtime.utilityOverlayOpen && runtime.utilityOverlayMode === overlayConfig.overlayMode) {
    runtime[overlayConfig.pendingStateKey] = pendingValue;
    renderUi(Date.now());
    focusUtilityOverlayInputAfterRender(overlayConfig.inputSelector, overlayConfig.afterOpen);
    return true;
  }

  runtime[overlayConfig.pendingStateKey] = pendingValue;
  openUtilityOverlay(overlayConfig.overlayMode, { clearPrimaryToolModes: false });
  focusUtilityOverlayInputAfterRender(overlayConfig.inputSelector, overlayConfig.afterOpen);
  return true;
}

function openCustomDecorNameOverlay(dataUrl, suggestedName = "Custom Decor", dimensions = {}) {
  const naturalWidth = Math.max(1, Math.round(Number(dimensions.width) || CUSTOM_DECOR_DEFAULT_WIDTH));
  const naturalHeight = Math.max(1, Math.round(Number(dimensions.height) || CUSTOM_DECOR_DEFAULT_WIDTH));
  openCustomAssetEditorOverlay("decor", {
    dataUrl,
    suggestedName: sanitizeCustomDecorName(suggestedName, "Custom Decor"),
    name: sanitizeCustomDecorName(suggestedName, "Custom Decor"),
    width: clamp(CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH),
    naturalWidth,
    naturalHeight,
    motionType: DEFAULT_CUSTOM_DECOR_MOTION_TYPE,
    motionSplitY: DEFAULT_CUSTOM_DECOR_MOTION_SPLIT_Y,
    motionSwaySide: DEFAULT_DECOR_SWAY_SIDE,
    motionIntensity: DEFAULT_CUSTOM_DECOR_MOTION_INTENSITY
  });
}

function updatePendingCustomDecorPreview() {
  const pending = runtime.pendingCustomDecorUpload;
  if (!pending) {
    return;
  }

  const width = clamp(Number(pending.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH);
  const splitY = sanitizeCustomDecorMotionSplit(pending.motionSplitY);
  const swaySide = normalizeDecorSwaySide(pending.motionSwaySide);
  const motionIntensity = sanitizeCustomDecorMotionIntensity(pending.motionIntensity);
  const motionType = normalizeCustomDecorMotionType(pending.motionType);
  const motionConfig = getCustomDecorMotionTypeConfig(motionType);
  const labels = dom.utilityOverlayBody?.querySelectorAll("[data-custom-decor-size-label]") || [];
  const previewFrame = dom.utilityOverlayBody?.querySelector("[data-custom-decor-preview-frame]");
  const slider = dom.utilityOverlayBody?.querySelector("[data-custom-decor-size-input]");
  const splitLabels = dom.utilityOverlayBody?.querySelectorAll("[data-custom-decor-split-label]") || [];
  const splitSlider = dom.utilityOverlayBody?.querySelector("[data-custom-decor-split-input]");
  const splitLine = dom.utilityOverlayBody?.querySelector("[data-custom-decor-split-line]");
  const typeSelect = dom.utilityOverlayBody?.querySelector("[data-custom-decor-type-select]");
  const swaySideSelect = dom.utilityOverlayBody?.querySelector("[data-custom-decor-sway-side-select]");
  const intensityLabels = dom.utilityOverlayBody?.querySelectorAll("[data-custom-decor-intensity-label]") || [];
  const intensitySlider = dom.utilityOverlayBody?.querySelector("[data-custom-decor-intensity-input]");

  for (const label of labels) {
    label.textContent = `${Math.round(width)} px`;
  }
  if (previewFrame instanceof HTMLElement) {
    previewFrame.style.width = `${Math.round(width)}px`;
    previewFrame.style.setProperty("--custom-decor-motion-split", `${(splitY * 100).toFixed(2)}%`);
    previewFrame.classList.toggle("has-sway", Boolean(motionConfig.hasSway));
    previewFrame.classList.toggle("is-bobbing", Boolean(motionConfig.hasBob));
    previewFrame.dataset.customDecorMotionType = motionType;
  }
  if (slider instanceof HTMLInputElement && Number(slider.value) !== Math.round(width)) {
    slider.value = String(Math.round(width));
  }
  for (const label of splitLabels) {
    label.textContent = `${Math.round(splitY * 100)}%`;
  }
  if (splitSlider instanceof HTMLInputElement && Number(splitSlider.value) !== Math.round(splitY * 100)) {
    splitSlider.value = String(Math.round(splitY * 100));
  }
  if (splitLine instanceof HTMLElement) {
    splitLine.style.top = `${(splitY * 100).toFixed(2)}%`;
  }
  if (swaySideSelect instanceof HTMLSelectElement && swaySideSelect.value !== swaySide) {
    swaySideSelect.value = swaySide;
  }
  if (typeSelect instanceof HTMLSelectElement && typeSelect.value !== motionType) {
    typeSelect.value = motionType;
  }
  for (const label of intensityLabels) {
    label.textContent = `${motionIntensity.toFixed(2)}x`;
  }
  if (intensitySlider instanceof HTMLInputElement && Number(intensitySlider.value) !== motionIntensity) {
    intensitySlider.value = String(motionIntensity);
  }
  renderCustomDecorMotionPreview(Date.now());
}

function renderCustomDecorMotionPreview(now = Date.now()) {
  if (runtime.utilityOverlayMode !== "custom-decor-name" || !runtime.pendingCustomDecorUpload) {
    return;
  }

  const pending = runtime.pendingCustomDecorUpload;
  const frame = dom.utilityOverlayBody?.querySelector("[data-custom-decor-preview-frame]");
  const canvas = dom.utilityOverlayBody?.querySelector("[data-custom-decor-preview-canvas]");
  const image = dom.utilityOverlayBody?.querySelector("[data-custom-decor-preview]");
  if (
    !(frame instanceof HTMLElement)
    || !(canvas instanceof HTMLCanvasElement)
    || !(image instanceof HTMLImageElement)
    || !image.complete
    || !image.naturalWidth
    || !image.naturalHeight
  ) {
    return;
  }

  const motionType = normalizeCustomDecorMotionType(pending.motionType);
  const motionConfig = getCustomDecorMotionTypeConfig(motionType);
  const width = clamp(Number(pending.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH);
  const height = width * (image.naturalHeight / Math.max(1, image.naturalWidth));
  const splitY = sanitizeCustomDecorMotionSplit(pending.motionSplitY);
  const swaySide = normalizeDecorSwaySide(pending.motionSwaySide);
  const intensity = sanitizeCustomDecorMotionIntensity(pending.motionIntensity);
  const seaweedLike = motionConfig.id === "standard-seaweed" || motionConfig.id === "floating-seaweed";
  const swayAmplitude = motionConfig.hasSway
    ? (seaweedLike ? clamp(width * 0.045, 2.4, 15) : clamp(width * 0.028, 1.8, 9)) * intensity
    : 0;
  const horizontalPad = Math.ceil(Math.max(6, swayAmplitude + (motionConfig.hasBob ? 4 : 0)));
  const verticalPad = Math.ceil(motionConfig.hasBob ? 8 : 4);
  const canvasCssWidth = Math.max(1, Math.ceil(width + horizontalPad * 2));
  const canvasCssHeight = Math.max(1, Math.ceil(height + verticalPad * 2));
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const nextWidth = Math.max(1, Math.round(canvasCssWidth * dpr));
  const nextHeight = Math.max(1, Math.round(canvasCssHeight * dpr));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  canvas.style.left = `${-horizontalPad}px`;
  canvas.style.top = `${-verticalPad}px`;
  canvas.style.width = `${canvasCssWidth}px`;
  canvas.style.height = `${canvasCssHeight}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, canvasCssWidth, canvasCssHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const phase = 0.72;
  drawCustomDecorMotionImageLayerToContext(
    context,
    image,
    horizontalPad,
    verticalPad,
    width,
    height,
    now,
    {
      customMotionType: motionType,
      customMotionSplitY: splitY,
      customMotionSwaySide: swaySide,
      customMotionIntensity: intensity,
      phase,
      bobX: motionConfig.hasBob ? Math.sin(now / 980 + phase * 0.85) * 0.8 * intensity : 0,
      bobY: motionConfig.hasBob ? Math.sin(now / 760 + phase) * 1.4 * intensity : 0
    }
  );
}

function renderDecorSettingsMotionPreview(now = Date.now()) {
  if (runtime.utilityOverlayMode !== "decor-settings" && runtime.utilityOverlayMode !== "custom-decor-settings") {
    return;
  }

  const item = getDecorSettingsTarget();
  const decor = item ? runtime.decorMap.get(item.decorKey) : null;
  const capabilities = item ? getDecorMotionCapabilities(item) : null;
  const hasBubblerPreview = item ? canConfigureDecorBubbler(item) : false;
  const hasCavePreview = item ? isCaveDecorKey(item.decorKey) : false;
  if (!item || !decor || !capabilities) {
    return;
  }

  const frame = dom.utilityOverlayBody?.querySelector("[data-decor-settings-preview-frame]");
  const canvas = dom.utilityOverlayBody?.querySelector("[data-decor-settings-preview-canvas]");
  const image = dom.utilityOverlayBody?.querySelector("[data-decor-settings-preview]");
  if (
    !(frame instanceof HTMLElement)
    || !(canvas instanceof HTMLCanvasElement)
    || !(image instanceof HTMLImageElement)
    || !image.complete
    || !image.naturalWidth
    || !image.naturalHeight
  ) {
    return;
  }

  const width = getDecorPreviewPaneWidth(decor, item);
  const height = width * (image.naturalHeight / Math.max(1, image.naturalWidth));
  const motion = getDecorMotion(item, now);
  const bubblerMeta = hasBubblerPreview ? getPlacedDecorBubblerMeta(item, decor) : null;
  const bgImage = decor.bgPath ? runtime.images.get(decor.bgPath) : null;
  const caveBgHeadroom = hasCavePreview && bgImage
    ? Math.max(0, width * (bgImage.height / Math.max(1, bgImage.width)) - height)
    : 0;
  const maxBubbleDistance = bubblerMeta?.spouts?.length
    ? Math.max(...bubblerMeta.spouts.map((spout) => Number(spout.fadeDistance) || DEFAULT_BUBBLER_FADE_DISTANCE_PX))
    : 0;
  const maxBubbleSpread = bubblerMeta?.spouts?.length
    ? Math.max(...bubblerMeta.spouts.map((spout) => Number(spout.spread) || DEFAULT_BUBBLER_SPREAD_PX))
    : 0;
  const maxBubbleSize = bubblerMeta?.spouts?.length
    ? Math.max(...bubblerMeta.spouts.map((spout) => Number(spout.bubbleSize) || DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE))
    : 0;
  const swayAmplitude = capabilities.hasSway
    ? clamp(width * 0.065 * Math.max(motion.swayIntensity, 0.2), 8, 44)
    : 8;
  const bobPad = capabilities.hasBob ? 20 * Math.max(motion.bobIntensity, 0.5) : 8;
  const bubbleSidePad = hasBubblerPreview
    ? clamp(maxBubbleSpread * 0.7 + maxBubbleSize * 6, 28, 200)
    : 0;
  const bubbleHeadroom = hasBubblerPreview
    ? clamp(maxBubbleDistance * 0.58, 72, 360)
    : 0;
  const horizontalPad = Math.ceil(Math.max(14, swayAmplitude + bobPad, bubbleSidePad));
  const verticalPad = Math.ceil(Math.max(12, bobPad + 8, bubbleHeadroom + 12, caveBgHeadroom + 12));
  const canvasCssWidth = Math.max(1, Math.ceil(width + horizontalPad * 2));
  const canvasCssHeight = Math.max(1, Math.ceil(height + verticalPad * 2));
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const nextWidth = Math.max(1, Math.round(canvasCssWidth * dpr));
  const nextHeight = Math.max(1, Math.round(canvasCssHeight * dpr));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  canvas.style.left = `${-horizontalPad}px`;
  canvas.style.top = `${-verticalPad}px`;
  canvas.style.width = `${canvasCssWidth}px`;
  canvas.style.height = `${canvasCssHeight}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, canvasCssWidth, canvasCssHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const drawX = horizontalPad;
  const drawY = verticalPad;

  if ((hasCavePreview || hasBubblerPreview) && hasDecorCaveColorLayers(decor) && bgImage) {
    drawCaveBackgroundLayerToContext(context, item, decor, now, {
      drawX,
      drawY,
      width,
      baseHeight: height,
      motion
    });
  } else if ((hasBubblerPreview || hasCavePreview) && bgImage) {
    const bgHeight = width * (bgImage.height / bgImage.width);
    drawDecorImageLayerToContext(context, bgImage, drawX, drawY + (height - bgHeight), width, bgHeight, item, now, motion);
  }
  if (hasBubblerPreview) {
    drawDecorBubblerEffectToContext(context, item, decor, image, now, {
      drawX,
      drawY,
      width,
      height,
      waterSurfaceY: 0,
      stableScale: 1
    });
  }
  if (hasDecorCaveColorLayers(decor)) {
    drawCaveColorLayersToContext(context, item, decor, now, {
      drawX,
      drawY,
      width,
      height,
      motion
    });
    return;
  }
  drawDecorImageLayerToContext(context, image, drawX, drawY, width, height, item, now, motion);
}

function updatePendingCustomDecorSize(value) {
  if (!runtime.pendingCustomDecorUpload) {
    return;
  }

  runtime.pendingCustomDecorUpload.width = clamp(
    Math.round(Number(value) || CUSTOM_DECOR_DEFAULT_WIDTH),
    CUSTOM_DECOR_MIN_WIDTH,
    CUSTOM_DECOR_MAX_WIDTH
  );
  updatePendingCustomDecorPreview();
}

function updatePendingCustomDecorMotionSplit(value) {
  if (!runtime.pendingCustomDecorUpload) {
    return;
  }

  runtime.pendingCustomDecorUpload.motionSplitY = sanitizeCustomDecorMotionSplit(Number(value) / 100);
  updatePendingCustomDecorPreview();
}

function updatePendingCustomDecorMotionIntensity(value) {
  if (!runtime.pendingCustomDecorUpload) {
    return;
  }

  runtime.pendingCustomDecorUpload.motionIntensity = sanitizeCustomDecorMotionIntensity(value);
  updatePendingCustomDecorPreview();
}

function setPendingCustomDecorSwaySide(value) {
  if (!runtime.pendingCustomDecorUpload) {
    return;
  }

  runtime.pendingCustomDecorUpload.motionSwaySide = normalizeDecorSwaySide(value);
  renderUi(Date.now());
  window.requestAnimationFrame(updatePendingCustomDecorPreview);
}

function setPendingCustomDecorMotionType(value) {
  if (!runtime.pendingCustomDecorUpload) {
    return;
  }

  runtime.pendingCustomDecorUpload.motionType = normalizeCustomDecorMotionType(value);
  renderUi(Date.now());
  window.requestAnimationFrame(updatePendingCustomDecorPreview);
}

async function savePendingCustomDecorUpload() {
  runtime.wallpaperUtilityKeyboardOpenId = "";
  syncWallpaperUtilityNameKeyboards();
  return savePendingCustomAsset("decor");
}

function buildPendingCustomHideUpload(upload = null) {
  const current = runtime.pendingCustomHideUpload && typeof runtime.pendingCustomHideUpload === "object"
    ? runtime.pendingCustomHideUpload
    : {};
  const source = upload && typeof upload === "object"
    ? { ...current, ...upload }
    : { ...current };
  const suggestedName = sanitizeCustomDecorName(
    source.suggestedName || source.frontName || current.frontName || source.name || "Custom Hide",
    "Custom Hide"
  );
  const rawName = typeof source.name === "string" ? source.name.replace(/\s+/g, " ").trim() : "";
  return {
    ...source,
    suggestedName,
    name: rawName || suggestedName,
    width: clamp(
      Math.round(Number(source.width) || CUSTOM_DECOR_DEFAULT_WIDTH),
      CUSTOM_DECOR_MIN_WIDTH,
      CUSTOM_DECOR_MAX_WIDTH
    ),
    scale: clamp(Number(source.scale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    tankLayer: getDecorFrontLayer(`${CUSTOM_HIDE_KEY_PREFIX}pending`, source.tankLayer || DEFAULT_TANK_LAYER),
    frontNaturalWidth: Math.max(1, Math.round(Number(source.frontNaturalWidth) || CUSTOM_DECOR_DEFAULT_WIDTH)),
    frontNaturalHeight: Math.max(1, Math.round(Number(source.frontNaturalHeight) || CUSTOM_DECOR_DEFAULT_WIDTH)),
    bgNaturalWidth: Math.max(1, Math.round(Number(source.bgNaturalWidth) || CUSTOM_DECOR_DEFAULT_WIDTH)),
    bgNaturalHeight: Math.max(1, Math.round(Number(source.bgNaturalHeight) || CUSTOM_DECOR_DEFAULT_WIDTH)),
    caveSettings: sanitizePlacedCaveSettings(source.caveSettings),
    caveColorSettings: sanitizePlacedCaveColorSettings(
      source.caveColorSettings,
      source.frontDataUrl
        ? {
          caveColorLayers: buildCustomDecorColorLayers({
            key: `${CUSTOM_HIDE_KEY_PREFIX}pending`,
            customType: "hide",
            path: source.frontDataUrl,
            bgPath: source.bgDataUrl || source.frontDataUrl
          })
        }
        : null
    )
  };
}

function openCustomHideCreationOverlay(upload) {
  openCustomAssetEditorOverlay("hide", buildPendingCustomHideUpload(upload), {
    clearPendingTypes: ["decor", "fish"]
  });
}

function getPendingCustomHidePreviewDecor() {
  const pending = runtime.pendingCustomHideUpload;
  if (!pending?.frontDataUrl) {
    return null;
  }

  const path = pending.frontDataUrl;
  const bgPath = pending.bgDataUrl || pending.frontDataUrl;
  const caveSettings = sanitizePlacedCaveSettings(pending.caveSettings);
  const caveColorLayers = buildCustomDecorColorLayers({
    key: `${CUSTOM_HIDE_KEY_PREFIX}pending`,
    customType: "hide",
    path,
    bgPath
  });
  return {
    key: `${CUSTOM_HIDE_KEY_PREFIX}pending`,
    path,
    bgPath,
    hasBg: true,
    hasMask: false,
    hasMid: false,
    hasTrigger: false,
    hasSeats: false,
    caveColorLayers,
    hasCaveColorLayers: caveColorLayers.length > 0,
    name: pending.name || pending.suggestedName || "Custom Hide",
    theme: "Custom",
    cost: CUSTOM_HIDE_COST,
    width: clamp(Number(pending.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH),
    defaultScale: clamp(Number(pending.scale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    customType: "hide",
    motionType: DEFAULT_CUSTOM_DECOR_MOTION_TYPE,
    motionSplitY: DEFAULT_CUSTOM_DECOR_MOTION_SPLIT_Y,
    motionSwaySide: DEFAULT_DECOR_SWAY_SIDE,
    motionIntensity: DEFAULT_CUSTOM_DECOR_MOTION_INTENSITY,
    categories: ["custom", "caves"],
    fishBehavior: {
      explicitHangout: false,
      hangoutTypes: ["hide"],
      occupancyLimit: null,
      note: ""
    },
    caveBehavior: buildCaveBehaviorProfileFromSettings(caveSettings),
    defaultCaveSettings: caveSettings,
    bubbler: null,
    customAsset: true
  };
}

function getPendingCustomHidePreviewItem() {
  const pending = runtime.pendingCustomHideUpload;
  if (!pending?.frontDataUrl || !pending?.bgDataUrl) {
    return null;
  }

  pending.caveSettings = sanitizePlacedCaveSettings(pending.caveSettings);
  return {
    id: "pending-custom-hide",
    decorKey: `${CUSTOM_HIDE_KEY_PREFIX}pending`,
    xNorm: 0.5,
    yNorm: 0.82,
    scale: clamp(Number(pending.scale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    tankLayer: getDecorFrontLayer(`${CUSTOM_HIDE_KEY_PREFIX}pending`, pending.tankLayer || DEFAULT_TANK_LAYER),
    flipped: false,
    caveSettings: pending.caveSettings,
    ...(pending.caveColorSettings ? { caveColorSettings: pending.caveColorSettings } : {})
  };
}

function updatePendingCustomHidePreview() {
  const pending = runtime.pendingCustomHideUpload;
  if (!pending) {
    return;
  }

  const scale = clamp(Number(pending.scale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  const slider = dom.utilityOverlayBody?.querySelector("[data-custom-hide-size-input]");
  const labels = dom.utilityOverlayBody?.querySelectorAll("[data-custom-hide-size-label]") || [];

  for (const label of labels) {
    label.textContent = formatDecorScale(scale);
  }
  if (slider instanceof HTMLInputElement && Number(slider.value) !== scale) {
    slider.value = String(scale);
  }

  const previewItem = getPendingCustomHidePreviewItem();
  const previewDecor = getPendingCustomHidePreviewDecor();
  if (previewItem) {
    updateCaveSettingsControls(previewItem);
  }
  if (previewItem && previewDecor) {
    updateCaveColorSettingsControls(previewItem, previewDecor);
  }
  renderCustomHidePreview(Date.now());
}
