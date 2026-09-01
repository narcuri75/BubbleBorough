// Source fragment: tutorial/flow.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderCustomHidePreview(now = Date.now()) {
  if (runtime.utilityOverlayMode !== "custom-hide-create" || !runtime.pendingCustomHideUpload?.frontDataUrl || !runtime.pendingCustomHideUpload?.bgDataUrl) {
    return;
  }

  const pending = runtime.pendingCustomHideUpload;
  const previewItem = getPendingCustomHidePreviewItem();
  const previewDecor = getPendingCustomHidePreviewDecor();
  const shell = dom.utilityOverlayBody?.querySelector("[data-custom-hide-preview-shell]");
  const hitbox = dom.utilityOverlayBody?.querySelector("[data-custom-hide-preview-frame]");
  const canvas = dom.utilityOverlayBody?.querySelector("[data-custom-hide-preview-canvas]");
  const bgImage = dom.utilityOverlayBody?.querySelector("[data-custom-hide-bg-preview]");
  const frontImage = dom.utilityOverlayBody?.querySelector("[data-custom-hide-front-preview]");
  if (
    !previewItem
    || !previewDecor
    || !(shell instanceof HTMLElement)
    || !(hitbox instanceof HTMLElement)
    || !(canvas instanceof HTMLCanvasElement)
    || !(bgImage instanceof HTMLImageElement)
    || !(frontImage instanceof HTMLImageElement)
    || !bgImage.complete
    || !frontImage.complete
    || !bgImage.naturalWidth
    || !frontImage.naturalWidth
  ) {
    return;
  }

  const width = getDecorPreviewPaneWidth(previewDecor, previewItem);
  const frontHeight = Math.max(1, Math.round(width * (pending.frontNaturalHeight / Math.max(1, pending.frontNaturalWidth))));
  const bgHeight = Math.max(1, Math.round(width * (pending.bgNaturalHeight / Math.max(1, pending.bgNaturalWidth))));
  const shellHeight = Math.max(frontHeight, bgHeight);
  const frontDrawY = shellHeight - frontHeight;
  const bgDrawY = shellHeight - bgHeight;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const nextWidth = Math.max(1, Math.round(width * dpr));
  const nextHeight = Math.max(1, Math.round(shellHeight * dpr));
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  shell.style.width = `${width}px`;
  shell.style.height = `${shellHeight}px`;
  hitbox.style.width = `${width}px`;
  hitbox.style.height = `${frontHeight}px`;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${shellHeight}px`;

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, shellHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const settings = hasDecorCaveColorLayers(previewDecor) ? getPlacedCaveColorSettings(previewItem, previewDecor) : {};
  const colorizeSettings = hasDecorCaveColorLayers(previewDecor) ? getPlacedCaveColorizeSettings(previewItem, previewDecor) : {};
  const motion = getDecorMotion(previewItem, now);
  const colorSetting = settings.color1;
  const colorizeSetting = colorizeSettings.color1;

  drawDecorColorLayerImageToContext(
    context,
    bgImage,
    pending.bgDataUrl,
    colorSetting,
    colorizeSetting,
    0,
    bgDrawY,
    width,
    bgHeight,
    previewItem,
    now,
    motion
  );
  drawDecorColorLayerImageToContext(
    context,
    frontImage,
    pending.frontDataUrl,
    colorSetting,
    colorizeSetting,
    0,
    frontDrawY,
    width,
    frontHeight,
    previewItem,
    now,
    motion
  );
}

function updatePendingCustomHideScale(value) {
  const pending = runtime.pendingCustomHideUpload;
  if (!pending) {
    return;
  }

  pending.scale = clamp(Number(value) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  updatePendingCustomHidePreview();
}

function updatePendingCustomHideLayer(value) {
  const pending = runtime.pendingCustomHideUpload;
  if (!pending) {
    return;
  }

  pending.tankLayer = getDecorFrontLayer(`${CUSTOM_HIDE_KEY_PREFIX}pending`, value);
  updatePendingCustomHidePreview();
}

async function savePendingCustomHideUpload() {
  runtime.wallpaperUtilityKeyboardOpenId = "";
  syncWallpaperUtilityNameKeyboards();
  return savePendingCustomAsset("hide");
}

function closeUtilityOverlay() {
  runtime.wallpaperUtilityKeyboardOpenId = "";
  closeUtilityOverlayState({ now: Date.now(), reason: "close" });
  renderUi(Date.now());
}

function openTutorialFeatureOverlay(featureId, overlayKind) {
  const tutorialChanged = beginTutorialFeatureStep(featureId);
  if (tutorialChanged) {
    saveState();
  }
  openExclusiveOverlay(overlayKind);
}

function closeTutorialFeatureOverlay(featureId, runtimeKey) {
  const tutorialChanged = finishTutorialFeatureStep(featureId);
  runtime[runtimeKey] = false;
  if (tutorialChanged) {
    saveState();
  }
  renderUi(Date.now());
}

function openSettingsOverlay() {
  openTutorialFeatureOverlay(TUTORIAL_FEATURE_SETTINGS, "settings");
}

function closeSettingsOverlay() {
  closeTutorialFeatureOverlay(TUTORIAL_FEATURE_SETTINGS, "settingsOverlayOpen");
}

function openEquipmentOverlay() {
  openTutorialFeatureOverlay(TUTORIAL_FEATURE_EDIT_TANK, "equipment");
}

function closeEquipmentOverlay() {
  closeTutorialFeatureOverlay(TUTORIAL_FEATURE_EDIT_TANK, "equipmentOverlayOpen");
}

function isIntroTutorialActive() {
  return Boolean(getActiveTutorial());
}

function getDefaultToolbarPosition() {
  return isWallpaperEngineModeEnabled() ? "right-center" : "bottom-center";
}

function normalizeTutorialMode(value, fallback = TUTORIAL_MODE_GUIDED) {
  switch (String(value || "").trim()) {
    case TUTORIAL_MODE_GUIDED:
    case TUTORIAL_MODE_INFO_ONLY:
    case TUTORIAL_MODE_DISABLED:
      return String(value).trim();
    default:
      return fallback;
  }
}

function normalizeTutorialStage(value, fallback = TUTORIAL_STAGE_SPLASH) {
  const normalized = String(value || "").trim();
  return TUTORIAL_STAGE_IDS.includes(normalized) ? normalized : fallback;
}

function migrateTutorialStage(rawStage, source = {}) {
  const stage = String(rawStage || "").trim();
  if (TUTORIAL_STAGE_IDS.includes(stage)) {
    return stage;
  }

  switch (stage) {
    case "welcome":
    case "fish-store":
      return TUTORIAL_STAGE_ADOPT_FISH;
    case "fish-settle":
      return TUTORIAL_STAGE_ADOPT_FISH_DONE;
    case "fish-added":
    case "decor-store":
    case "decor-storage":
    case "decor-place-hint":
    case "decor-place-instructions":
    case "decor-place":
      return source.placedDecorId ? TUTORIAL_STAGE_PLACE_DECORATION_DONE : TUTORIAL_STAGE_PLACE_DECORATION;
    case "decor-close":
    case "decor-observe":
      return TUTORIAL_STAGE_PLACE_DECORATION_DONE;
    case "food-intro":
    case "food-feed":
      return TUTORIAL_STAGE_FEED_FISH;
    case "food-settle":
    case "tank-summary":
    case "display":
    case "features":
      return TUTORIAL_STAGE_FEED_FISH_DONE;
    case "poop-watch":
      return source.rewards?.forcedPoopTriggered === true
        ? TUTORIAL_STAGE_CLEAN_TANK
        : TUTORIAL_STAGE_FEED_FISH_DONE;
    case "clean-intro":
    case "clean":
      return TUTORIAL_STAGE_CLEAN_TANK;
    case "complete":
      return TUTORIAL_STAGE_CLEAN_TANK_DONE;
    default:
      return TUTORIAL_STAGE_SPLASH;
  }
}

function sanitizeTutorialFeatureSteps(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return [...new Set(rawValue
    .map((value) => String(value || "").trim())
    .filter((value) => TUTORIAL_FEATURE_IDS.includes(value)))];
}

function sanitizeTutorialRewards(rawValue) {
  const source = rawValue && typeof rawValue === "object" ? rawValue : {};
  return {
    basicPelletsGranted: source.basicPelletsGranted === true,
    forcedPoopTriggered: source.forcedPoopTriggered === true
  };
}

function isGuidedTutorialActive() {
  const tutorial = getActiveTutorial();
  return tutorial?.mode === TUTORIAL_MODE_GUIDED;
}

function isInfoOnlyTutorialActive() {
  const tutorial = getActiveTutorial();
  return tutorial?.mode === TUTORIAL_MODE_INFO_ONLY;
}

function isTutorialTankDirtinessLocked() {
  const tutorial = getActiveTutorial();
  return Boolean(tutorial && tutorial.rewards?.forcedPoopTriggered !== true);
}

function isTutorialStage(...stages) {
  const tutorial = getActiveTutorial();
  return Boolean(tutorial && stages.includes(tutorial.stage));
}

function getDisabledIntroTutorialState() {
  return {
    mode: TUTORIAL_MODE_DISABLED,
    stage: TUTORIAL_STAGE_COMPLETED,
    stageEnteredAt: 0,
    completed: true,
    fishId: "",
    decorKey: "",
    placedDecorId: "",
    activeFeatureStep: "",
    visitedFeatureSteps: [],
    rewards: sanitizeTutorialRewards(null)
  };
}

function buildDefaultTutorialState(overrides = {}) {
  const now = Date.now();
  const baseState = isIntroTutorialEnabled()
    ? {
      mode: TUTORIAL_MODE_GUIDED,
      stage: TUTORIAL_STAGE_SPLASH,
      stageEnteredAt: now,
      completed: false,
      fishId: "",
      decorKey: "",
      placedDecorId: "",
      activeFeatureStep: "",
      visitedFeatureSteps: [],
      rewards: sanitizeTutorialRewards(null)
    }
    : getDisabledIntroTutorialState();

  return {
    ...baseState,
    ...overrides,
    rewards: sanitizeTutorialRewards(overrides.rewards ?? baseState.rewards),
    visitedFeatureSteps: sanitizeTutorialFeatureSteps(overrides.visitedFeatureSteps ?? baseState.visitedFeatureSteps)
  };
}

function sanitizeTutorialState(rawState, options = {}) {
  if (!isIntroTutorialEnabled()) {
    return getDisabledIntroTutorialState();
  }

  const source = rawState && typeof rawState === "object" ? rawState : {};
  const defaultCompleted = Boolean(options.defaultCompleted);
  const legacyCompleted = source.introCompleted === true;
  const completed = typeof source.completed === "boolean"
    ? source.completed
    : (legacyCompleted || defaultCompleted);
  const mode = normalizeTutorialMode(source.mode, TUTORIAL_MODE_GUIDED);
  const fallbackStage = completed ? TUTORIAL_STAGE_COMPLETED : TUTORIAL_STAGE_SPLASH;
  const migratedStage = migrateTutorialStage(
    source.stage || (legacyCompleted ? TUTORIAL_STAGE_COMPLETED : TUTORIAL_STAGE_SPLASH),
    source
  );
  const stage = normalizeTutorialStage(migratedStage, fallbackStage);

  return buildDefaultTutorialState({
    mode,
    stage: completed ? TUTORIAL_STAGE_COMPLETED : stage,
    stageEnteredAt: Number.isFinite(Number(source.stageEnteredAt)) ? Number(source.stageEnteredAt) : Date.now(),
    completed,
    fishId: typeof source.fishId === "string" ? source.fishId : "",
    decorKey: typeof source.decorKey === "string" ? source.decorKey : "",
    placedDecorId: typeof source.placedDecorId === "string" ? source.placedDecorId : "",
    activeFeatureStep: "",
    visitedFeatureSteps: sanitizeTutorialFeatureSteps(source.visitedFeatureSteps),
    rewards: sanitizeTutorialRewards(source.rewards)
  });
}

function getActiveTutorial() {
  if (!isIntroTutorialEnabled() || !state?.tutorial) {
    return null;
  }

  const tutorial = state.tutorial;
  return tutorial.completed === true || tutorial.mode === TUTORIAL_MODE_DISABLED
    ? null
    : tutorial;
}

function setTutorialStage(stage, options = {}) {
  if (!state?.tutorial) {
    return false;
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const tutorial = state.tutorial;
  const nextStage = normalizeTutorialStage(stage, tutorial.stage || TUTORIAL_STAGE_SPLASH);
  let changed = false;

  if (tutorial.stage !== nextStage) {
    tutorial.stage = nextStage;
    tutorial.stageEnteredAt = now;
    changed = true;
  } else if (!Number.isFinite(Number(tutorial.stageEnteredAt))) {
    tutorial.stageEnteredAt = now;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(options, "fishId")) {
    const nextFishId = typeof options.fishId === "string" ? options.fishId : "";
    if (tutorial.fishId !== nextFishId) {
      tutorial.fishId = nextFishId;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(options, "decorKey")) {
    const nextDecorKey = typeof options.decorKey === "string" ? options.decorKey : "";
    if (tutorial.decorKey !== nextDecorKey) {
      tutorial.decorKey = nextDecorKey;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(options, "placedDecorId")) {
    const nextPlacedDecorId = typeof options.placedDecorId === "string" ? options.placedDecorId : "";
    if (tutorial.placedDecorId !== nextPlacedDecorId) {
      tutorial.placedDecorId = nextPlacedDecorId;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(options, "activeFeatureStep")) {
    const nextFeatureStep = typeof options.activeFeatureStep === "string" ? options.activeFeatureStep : "";
    if (tutorial.activeFeatureStep !== nextFeatureStep) {
      tutorial.activeFeatureStep = nextFeatureStep;
      changed = true;
    }
  }

  return changed;
}

function beginTutorialFeatureStep(featureId) {
  void featureId;
  return false;
}

function finishTutorialFeatureStep(featureId, now = Date.now()) {
  void featureId;
  void now;
  return false;
}

function getTutorialFishRecord() {
  const tutorialFishId = state?.tutorial?.fishId || "";
  return tutorialFishId
    ? state.fish.find((fish) => fish.id === tutorialFishId) || null
    : null;
}

function getTutorialFishDisplayName() {
  const fish = getTutorialFishRecord();
  return fish?.name || "Your fish";
}

function getTutorialFishTypeLabel() {
  const fish = getTutorialFishRecord();
  const species = fish ? getSpeciesForFish(fish) : null;
  return fish && species
    ? getFishDisplaySpeciesName(fish, species)
    : "starter fish";
}

function grantTutorialBasicFoodReward(now = Date.now()) {
  if (!state?.tutorial?.rewards || state.tutorial.rewards.basicPelletsGranted) {
    return false;
  }

  const currentCount = Math.max(0, Number(state.foodInventory?.[TUTORIAL_BASIC_FOOD_KEY]) || 0);
  state.foodInventory[TUTORIAL_BASIC_FOOD_KEY] = currentCount + TUTORIAL_BASIC_FOOD_REWARD_COUNT;
  state.tutorial.rewards.basicPelletsGranted = true;
  pushEvent(`The tutorial stocked ${TUTORIAL_BASIC_FOOD_REWARD_COUNT} basic pellets for a practice feeding.`, now);
  return true;
}

function forceTutorialPoopScenario(now = Date.now()) {
  if (!state?.tutorial?.rewards || state.tutorial.rewards.forcedPoopTriggered) {
    return false;
  }

  state.pendingPoops = [];
  state.poops = [];

  const fish = getTutorialFishRecord() || getLivingTankFish()[0] || null;
  if (fish) {
    state.poops.push(createPoopRecord({
      fishId: fish.id,
      createdAt: now,
      xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.012, 0.012), 0.08, 0.92),
      startYNorm: clamp((fish.yNorm || 0.4) + 0.04, 0.14, 0.8),
      tankLayer: getFishTankLayer(fish)
    }));
  }

  rebaseTankDirtiness(now, 0.8);
  runtime.cleaningTransition = null;
  runtime.cleaningMode = false;
  runtime.toolModeSource = null;
  runtime.pointerDown = false;
  clearScrubProgress();
  renderToolCursor();
  state.tutorial.rewards.forcedPoopTriggered = true;
  pushEvent(`${getTutorialFishDisplayName()} made a mess during the tutorial.`, now);
  return true;
}

function resetTutorialRuntimeOverlayState() {
  clearPrimaryToolModes();
  resetCompetingOverlayState({ reason: "tutorial-reset" });
  runtime.selectedFishId = null;
  runtime.sidebarCollapsed = true;
  resetTankInteractionRuntimeState({ clearGlassTap: true });
}

function resumeTutorialRuntimeMode(options = {}) {
  let changed = false;
  resetTutorialRuntimeOverlayState();
  if (typeof options.beforeResume === "function") {
    changed = options.beforeResume() || changed;
  }
  if (typeof options.storeTab === "string" && options.storeTab) {
    runtime.storeOverlayOpen = true;
    runtime.storeTab = options.storeTab;
  }
  if (options.editTankMode === true) {
    runtime.editTankMode = true;
  }
  if (options.foodTrayOpen === true) {
    runtime.foodTrayOpen = true;
  }
  if (options.cleaningMode === true) {
    runtime.cleaningMode = true;
  }
  if (typeof options.toolModeSource === "string" && options.toolModeSource) {
    runtime.toolModeSource = options.toolModeSource;
  }
  if (typeof options.activeTab === "string" && options.activeTab) {
    runtime.activeTab = options.activeTab;
  }
  if (Object.prototype.hasOwnProperty.call(options, "feedingModeFoodKey")) {
    runtime.feedingModeFoodKey = options.feedingModeFoodKey || "";
  }
  return changed;
}

function resumeTutorialFoodState(tutorial, now = Date.now()) {
  return resumeTutorialRuntimeMode({
    beforeResume: () => tutorial?.mode === TUTORIAL_MODE_GUIDED ? grantTutorialBasicFoodReward(now) : false,
    foodTrayOpen: true,
    toolModeSource: "toolbar",
    feedingModeFoodKey: Math.max(0, Number(state.foodInventory?.[TUTORIAL_BASIC_FOOD_KEY]) || 0) > 0
      ? TUTORIAL_BASIC_FOOD_KEY
      : ""
  });
}

function syncTutorialFlow(now = Date.now()) {
  const tutorialState = getActiveTutorialStageRuntime(now);
  if (!tutorialState) {
    return false;
  }

  const { tutorial, ctx, stageDef } = tutorialState;
  let changed = false;
  if (!Number.isFinite(Number(tutorial.stageEnteredAt))) {
    tutorial.stageEnteredAt = now;
    changed = true;
  }
  const advance = stageDef?.advance;
  if (!advance?.onSync) {
    return changed;
  }
  return advance.onSync(ctx) || changed;
}

function restoreTutorialRuntimeState(now = Date.now()) {
  const tutorialState = getActiveTutorialStageRuntime(now);
  if (!tutorialState) {
    return false;
  }
  const tutorialChanged = tutorialState.stageDef?.resume?.(tutorialState.ctx) || false;
  renderToolCursor();
  return tutorialChanged;
}

function requestTutorialSkipConfirmation(options = {}) {
  if (!getActiveTutorial()) {
    return false;
  }

  runtime.tutorialSkipReturnTab = typeof options.returnTab === "string" ? options.returnTab : "";
  runtime.tutorialSkipReturnStage = typeof options.returnStage === "string" ? options.returnStage : "";
  openUtilityOverlay("tutorial-skip-confirm");
  return true;
}

function cancelTutorialSkipConfirmation() {
  const reopenTab = runtime.tutorialSkipReturnTab;
  const reopenStage = runtime.tutorialSkipReturnStage;
  runtime.tutorialSkipReturnTab = "";
  runtime.tutorialSkipReturnStage = "";
  closeUtilityOverlay();
  if (reopenTab && isTutorialStage(reopenStage)) {
    openStoreOverlay(reopenTab);
  }
}

function finishTutorial(options = {}) {
  if (!state?.tutorial) {
    return;
  }

  const now = Date.now();
  const mode = normalizeTutorialMode(state.tutorial.mode, TUTORIAL_MODE_GUIDED);
  state.tutorial = buildDefaultTutorialState({
    ...state.tutorial,
    mode,
    stage: TUTORIAL_STAGE_COMPLETED,
    stageEnteredAt: now,
    completed: true
  });
  runtime.tutorialSkipReturnTab = "";
  runtime.tutorialSkipReturnStage = "";
  runtime.tutorialDisplayCollapsed = false;
  runtime.tutorialToolbarRevealOrder = [];
  resetCompetingOverlayState({ reason: options.skipped ? "tutorial-skip" : "tutorial-finish" });
  renderToolCursor();
  saveState();
  renderUi(now);
  if (options.skipped) {
    showToast("Tutorial skipped.");
  } else {
    showToast("Congratulations on completing the tutorial. Have fun in Bubble Borough!", { durationMs: 5200 });
  }
}

function advanceIntroTutorial(action = "continue") {
  const tutorialState = getActiveTutorialStageRuntime(Date.now());
  if (!tutorialState) {
    return;
  }

  const { tutorial, ctx, stageDef } = tutorialState;
  const now = ctx.now;
  if (action === "skip") {
    requestTutorialSkipConfirmation({
      returnTab: runtime.storeOverlayOpen ? runtime.storeTab : "",
      returnStage: tutorial.stage
    });
    return;
  }
  if (action === "confirm-skip") {
    finishTutorial({ skipped: true });
    return;
  }
  if (action === "cancel-skip") {
    cancelTutorialSkipConfirmation();
    return;
  }
  let changed = false;

  if (action === "dismiss-popup") {
    changed = stageDef?.advance?.onDismiss?.(ctx) || false;
  } else if (action === "continue") {
    changed = stageDef?.advance?.onContinue?.(ctx) || false;
  }

  if (changed) {
    saveState();
  }
  renderUi(now);
}

function rerunIntroTutorial() {
  if (!state || !isIntroTutorialEnabled()) {
    return;
  }

  state.tutorial = buildDefaultTutorialState({
    mode: TUTORIAL_MODE_INFO_ONLY,
    stage: TUTORIAL_STAGE_SPLASH,
    stageEnteredAt: Date.now(),
    completed: false,
    fishId: state.tutorial?.fishId || "",
    decorKey: state.tutorial?.decorKey || "",
    placedDecorId: state.tutorial?.placedDecorId || "",
    activeFeatureStep: "",
    visitedFeatureSteps: [],
    rewards: sanitizeTutorialRewards(null)
  });
  runtime.tutorialSkipReturnTab = "";
  runtime.tutorialSkipReturnStage = "";
  runtime.tutorialDisplayCollapsed = false;
  runtime.tutorialToolbarRevealOrder = [];
  saveState();
  closeSettingsOverlay();
}

function getTutorialPreferredStoreTab() {
  return String(getActiveTutorialStageRuntime(Date.now())?.storeConfig?.preferredTab || "");
}

function openTutorialStoreForCurrentStage() {
  const tutorialState = getActiveTutorialStageRuntime(Date.now());
  if (!tutorialState) {
    return false;
  }
  return Boolean(tutorialState.storeConfig?.open?.(tutorialState.ctx));
}

function getTutorialDecorDisplayName() {
  const decor = runtime.decorMap.get(state?.tutorial?.decorKey || "");
  return decor?.name || "decoration";
}

function rememberTankPointerCapture(pointerId) {
  runtime.capturedTankPointerId = Number.isInteger(pointerId) ? pointerId : null;
}

function releaseTankPointerCapture(pointerId = runtime.capturedTankPointerId) {
  const capturedPointerId = Number.isInteger(pointerId) ? pointerId : null;
  if (
    capturedPointerId !== null
    && dom.tankStage
    && typeof dom.tankStage.hasPointerCapture === "function"
    && dom.tankStage.hasPointerCapture(capturedPointerId)
  ) {
    try {
      dom.tankStage.releasePointerCapture(capturedPointerId);
    } catch (error) {
      console.debug("Pointer release skipped.", error);
    }
  }
  if (runtime.capturedTankPointerId === capturedPointerId) {
    runtime.capturedTankPointerId = null;
  }
}

function resetTankInteractionRuntimeState(options = {}) {
  runtime.pointerDown = false;
  runtime.pointerStagePx = null;
  runtime.lastScrubPoint = null;
  runtime.dragState = null;
  runtime.decorResizeState = null;
  runtime.fishDragState = null;
  runtime.eggDragState = null;
  runtime.pebbleDragState = null;
  if (options.clearLastTankPoint === true) {
    runtime.lastTankPoint = null;
  }
  runtime.suppressNextTankClick = options.suppressNextTankClick === true;
  runtime.suppressNextGlassTap = options.suppressNextGlassTap === true;
  if (options.resetScrubSound === true) {
    resetScrubWipeSoundState();
  }
  if (options.clearGlassTap === true) {
    clearGlassTapGesture();
  }
  releaseTankPointerCapture();
}

function cancelTutorialBlockingTankInteractions() {
  resetTankInteractionRuntimeState({
    suppressNextTankClick: true,
    suppressNextGlassTap: true,
    resetScrubSound: true
  });
  renderToolCursor();
}

function isTutorialDecorDoneStep() {
  return false;
}

function getTutorialDecorDoneToastText(prefix = "") {
  const message = "Click the Decor button on the toolbar when you are done.";
  return prefix ? `${prefix} ${message}` : message;
}

function reconcileTutorialTransientUi() {
  const tutorialState = getActiveTutorialStageRuntime(Date.now());
  if (!tutorialState) {
    runtime.tutorialDismissedFeaturePopup = "";
    hideToast({ key: TUTORIAL_TOAST_DECOR_DONE });
    return;
  }

  const { ctx, stageDef } = tutorialState;
  if (runtime.tutorialDismissedFeaturePopup) {
    runtime.tutorialDismissedFeaturePopup = "";
  }
  stageDef?.reconcile?.(ctx);
  if (stageDef?.keepDecorDoneToast !== true) {
    hideToast({ key: TUTORIAL_TOAST_DECOR_DONE });
  }
}

function getTutorialAllowedStoreTabs() {
  return getActiveTutorialStageRuntime(Date.now())?.storeConfig?.allowedTabs || null;
}

function getTutorialStoreRestriction(kind) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  return getActiveTutorialStageRuntime(Date.now())?.storeConfig?.restrictions?.[shopKind] || null;
}

function buildTutorialActionMarkup(actions) {
  return (actions || [])
    .filter((action) => action?.action !== "skip")
    .map((action) => {
      const variantClass = action.variant ? ` ${action.variant}` : "";
      return `<button class="small-button${variantClass}" type="button" data-tutorial-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`;
    })
    .join("");
}

function createTutorialUiStateConfig(options = {}) {
  const toolbarVisible = options.toolbarVisible !== false;
  const visibleButtons = new Set(Array.isArray(options.visibleButtons) ? options.visibleButtons : []);
  return {
    toolbarVisible,
    displayVisible: options.displayVisible !== false,
    pulseDisplay: options.pulseDisplay === true,
    visibleButtons,
    pulseButtons: new Set(Array.isArray(options.pulseButtons) ? options.pulseButtons : []),
    revealButtons: new Set(Array.isArray(options.revealButtons) ? options.revealButtons : []),
    pulseDecorKey: typeof options.pulseDecorKey === "string" ? options.pulseDecorKey : "",
    pulseFoodKey: typeof options.pulseFoodKey === "string" ? options.pulseFoodKey : "",
    hideToolbarTab: options.hideToolbarTab !== false,
    hideDisplayTab: typeof options.hideDisplayTab === "boolean"
      ? options.hideDisplayTab
      : options.displayVisible === false,
    forceToolbarPosition: options.forceToolbarPosition || ""
  };
}

function createTutorialToolbarConfig(allowedControls = [], blockedMessages = {}) {
  return {
    allowedControls: new Set(Array.isArray(allowedControls) ? allowedControls : []),
    blockedMessages: {
      ...TUTORIAL_TOOLBAR_BLOCK_MESSAGES,
      ...(blockedMessages || {})
    }
  };
}

function createTutorialStoreRestrictionConfig(previewOnly = false) {
  return {
    maxCost: TUTORIAL_STORE_COST_CAP,
    hideCustom: true,
    hideControls: true,
    previewOnly
  };
}

function createTutorialTimedAdvance(afterMs, nextStage, beforeAdvance = null) {
  return {
    type: "timeout",
    afterMs,
    onSync(ctx) {
      if (ctx.elapsed < afterMs) {
        return false;
      }
      let changed = false;
      if (typeof beforeAdvance === "function") {
        changed = beforeAdvance(ctx) || changed;
      }
      return ctx.setStage(nextStage) || changed;
    }
  };
}

function getTutorialFeatureStepDef(featureId) {
  const id = String(featureId || "");
  return id && Object.prototype.hasOwnProperty.call(TUTORIAL_FEATURE_STEP_DEFS, id)
    ? TUTORIAL_FEATURE_STEP_DEFS[id]
    : null;
}

function getTutorialStageDef(stageId) {
  const id = String(stageId || "");
  return id && Object.prototype.hasOwnProperty.call(TUTORIAL_STAGE_DEFS, id)
    ? TUTORIAL_STAGE_DEFS[id]
    : TUTORIAL_STAGE_DEFS[TUTORIAL_STAGE_SPLASH];
}

function getTutorialContext(now = Date.now()) {
  const tutorial = getActiveTutorial();
  const safeNow = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const elapsed = tutorial?.stageEnteredAt
    ? Math.max(0, safeNow - tutorial.stageEnteredAt)
    : 0;
  const featureStepDef = tutorial?.activeFeatureStep ? getTutorialFeatureStepDef(tutorial.activeFeatureStep) : null;
  return {
    tutorial,
    now: safeNow,
    elapsed,
    isGuided: tutorial?.mode === TUTORIAL_MODE_GUIDED,
    isInfoOnly: tutorial?.mode === TUTORIAL_MODE_INFO_ONLY,
    fishName: getTutorialFishDisplayName(),
    fishType: getTutorialFishTypeLabel(),
    decorName: getTutorialDecorDisplayName(),
    featureStepDef,
    setStage(stage, options = {}) {
      return setTutorialStage(stage, {
        now: safeNow,
        ...options
      });
    }
  };
}

function getActiveTutorialStageRuntime(now = Date.now()) {
  const tutorial = getActiveTutorial();
  if (!tutorial) {
    return null;
  }

  const ctx = getTutorialContext(now);
  const stageDef = getTutorialStageDef(tutorial.stage) || null;
  return {
    tutorial,
    ctx,
    stageDef,
    storeConfig: stageDef?.store?.(ctx) || null,
    toolbarConfig: stageDef?.toolbar?.(ctx) || null,
    popupConfig: stageDef?.popup?.(ctx) || null,
    uiConfig: stageDef?.ui?.(ctx) || null
  };
}

function createTutorialTaskPopup(taskId, completed = false) {
  const task = TUTORIAL_TASK_DEFS[taskId];
  return task
    ? {
      mode: "task",
      taskId: task.id,
      taskLabel: task.label,
      taskCompleted: completed === true
    }
    : null;
}

function getTutorialRevealButtonIds(ctx) {
  if (
    !Array.isArray(runtime.tutorialToolbarRevealOrder)
    || runtime.tutorialToolbarRevealOrder.length !== TUTORIAL_REVEAL_TOOLBAR_BUTTON_IDS.length
    || runtime.tutorialToolbarRevealOrder.some((buttonId) => !TUTORIAL_REVEAL_TOOLBAR_BUTTON_IDS.includes(buttonId))
  ) {
    const order = [...TUTORIAL_REVEAL_TOOLBAR_BUTTON_IDS];
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }
    runtime.tutorialToolbarRevealOrder = order;
  }
  const revealCount = Math.min(
    runtime.tutorialToolbarRevealOrder.length,
    Math.max(0, Math.floor(ctx.elapsed / TUTORIAL_TOOLBAR_REVEAL_STEP_MS))
  );
  return runtime.tutorialToolbarRevealOrder.slice(0, revealCount);
}

function getTutorialPopupConfig() {
  return getActiveTutorialStageRuntime(Date.now())?.popupConfig || null;
}

function getTutorialUiState() {
  return getActiveTutorialStageRuntime(Date.now())?.uiConfig || null;
}

function getEffectiveDisplayCollapsed(uiSettings = getUiSettings(), tutorialUi = getTutorialUiState()) {
  if (tutorialUi) {
    return Boolean(tutorialUi.displayVisible) && runtime.tutorialDisplayCollapsed === true;
  }
  return uiSettings.displayCollapsed === true;
}

function canUseTutorialToolbarControl(controlId) {
  const tutorialState = getActiveTutorialStageRuntime(Date.now());
  if (!tutorialState) {
    return true;
  }
  if (!TUTORIAL_TOOLBAR_CONTROL_IDS.includes(controlId)) {
    return true;
  }
  return tutorialState.toolbarConfig?.allowedControls?.has(controlId) === true;
}

function guardTutorialToolbarControl(controlId) {
  if (canUseTutorialToolbarControl(controlId)) {
    return true;
  }
  const message = getActiveTutorialStageRuntime(Date.now())?.toolbarConfig?.blockedMessages?.[controlId]
    || "Finish this task first.";
  showToast(message);
  return false;
}

function getWheelDeltaPixels(event) {
  const lineMode = typeof WheelEvent !== "undefined" ? WheelEvent.DOM_DELTA_LINE : 1;
  const pageMode = typeof WheelEvent !== "undefined" ? WheelEvent.DOM_DELTA_PAGE : 2;
  const scale = event.deltaMode === lineMode
    ? 18
    : event.deltaMode === pageMode
      ? 240
      : 1;

  return {
    x: (Number(event.deltaX) || 0) * scale,
    y: (Number(event.deltaY) || 0) * scale
  };
}

function canScrollElement(element, deltaY) {
  if (!(element instanceof Element)) {
    return false;
  }

  const maxScroll = element.scrollHeight - element.clientHeight;
  if (maxScroll <= 1) {
    return false;
  }
  if (deltaY < 0) {
    return element.scrollTop > 0;
  }
  if (deltaY > 0) {
    return element.scrollTop < maxScroll - 1;
  }
  return false;
}

function findScrollableOverlayTarget(start, root, deltaY) {
  let node = start instanceof Element ? start : null;
  while (node) {
    if (canScrollElement(node, deltaY)) {
      return node;
    }
    if (node === root) {
      break;
    }
    node = node.parentElement;
  }
  return null;
}

function handleOverlayWheelScroll(event) {
  const root = event.currentTarget instanceof Element ? event.currentTarget : null;
  if (!root || root.hidden) {
    return;
  }

  const { x, y } = getWheelDeltaPixels(event);
  const delta = Math.abs(y) >= Math.abs(x) ? y : x;
  if (!delta) {
    return;
  }

  const target = findScrollableOverlayTarget(event.target, root, delta)
    || root.querySelector(".settings-panel-body, .utility-overlay-body, .store-drawer:not([hidden]), .store-panel-body");
  if (!canScrollElement(target, delta)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  target.scrollTop = clamp(target.scrollTop + delta, 0, target.scrollHeight - target.clientHeight);
}

function getActiveStoreScroller() {
  switch (runtime.storeTab) {
    case "food":
      return dom.foodShop;
    case "pharmacy":
      return dom.pharmacyShop;
    case "fish":
      return dom.fishShop;
    case "decor":
      return dom.decorShop;
    case "equipment":
      return dom.equipmentShop;
    default:
      return null;
  }
}

function canStoreScrollerMove(scroller, direction) {
  if (!(scroller instanceof Element) || scroller.hidden) {
    return false;
  }
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  if (maxScroll <= 1) {
    return false;
  }
  return direction === "up"
    ? scroller.scrollTop > 1
    : scroller.scrollTop < maxScroll - 1;
}

function canWallpaperScrollerMove(scroller, direction) {
  if (!(scroller instanceof Element)) {
    return false;
  }
  const overflowY = window.getComputedStyle(scroller).overflowY;
  if (overflowY === "hidden" || overflowY === "clip" || overflowY === "visible") {
    return false;
  }
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  if (maxScroll <= 1) {
    return false;
  }
  return direction === "up"
    ? scroller.scrollTop > 1
    : scroller.scrollTop < maxScroll - 1;
}

function getWallpaperScrollControlMarkup(targetId, label) {
  if (!isWallpaperEngineInputAssistEnabled()) {
    return "";
  }
  const escapedTarget = escapeHtml(targetId);
  const escapedLabel = escapeHtml(label || "Panel");
  return `
    <div class="wallpaper-scroll-controls" data-wallpaper-scroll-controls="${escapedTarget}" aria-label="${escapedLabel} scroll controls">
      <button class="store-scroll-button" type="button" data-wallpaper-scroll="up" aria-label="Scroll ${escapedLabel} up">&uarr;</button>
      <button class="store-scroll-button" type="button" data-wallpaper-scroll="down" aria-label="Scroll ${escapedLabel} down">&darr;</button>
    </div>
  `;
}
