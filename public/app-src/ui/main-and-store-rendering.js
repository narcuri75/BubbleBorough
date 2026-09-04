// Source fragment: ui/main-and-store-rendering.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderUi(now, options = {}) {
  const profileStartedAt = runtime.debugFrameProfilerEnabled ? performance.now() : 0;
  state.coins = clamp(Math.floor(Number(state.coins) || 0), 0, MAX_WALLET_COINS);
  const full = options.full !== false;
  if (full) {
    cancelDeferredTickUiRefresh();
  }
  syncHalloweenPresentation(now);
  syncTutorialFlow(now);
  reconcileTutorialTransientUi();
  reconcileGuidanceState();
  getSelectedPlacedDecor();
  renderTheme();
  renderAnimatedBackgroundLayer();
  renderToolbarPosition();
  renderSidebar();
  renderTabs();
  renderTankNavigation();
  renderAquariumOverview();
  renderHeader(now);
  renderMealTrack(now);
  renderSummary(now);
  renderEvents();
  renderStoreOverlay();
  renderUtilityOverlay();
  renderSettingsOverlay();
  renderEquipmentOverlay();
  renderIntroTutorial();
  renderEditQuickRef();
  renderEditDecorTray();
  renderEditFishTray();
  renderEditEquipmentTray();
  renderEditTankTray();
  renderFoodTray();
  renderMedicineTray();
  renderFishActionFlyout(now);
  renderFishActionSubmenu(now);
  renderFishActionTargetMenu(now);
  if (runtime.debugFishActionIndicatorsEnabled) {
    renderFishActionQueueDock(now);
  }
  renderSelectedFishNeedsPanel(now);
  renderFishInspector(now);
  renderSubmarineManager();
  syncTankStageTouchScrollState();
  renderControls(now);
  renderTutorialGuidance();
  renderCareTaskPane(now);
  if (full) {
    renderTankManagement();
    renderFoodShop();
    renderPharmacyShop();
    renderFishShop();
    renderFishList(now);
    renderDecorShop();
    renderEquipmentShop();
    renderDecorInventory();
    renderPlacedDecor();
    renderBackgrounds();
    renderSolidBackgroundControls();
    renderFilterAssets();
    renderCustomGravelControls();
    renderCollapsibleSections();
  }
  positionTransientMessages();
  if (runtime.debugFrameProfilerEnabled) {
    const durationMs = Math.max(0, performance.now() - profileStartedAt);
    runtime.frameProfilerLastUiRenderMs = durationMs;
    recordDebugFrameProfilerDuration("uiRender", durationMs);
  }
}

function shouldAllowTankStageTouchScroll() {
  const fishInspectorOpen = Boolean(runtime.selectedFishId && dom.fishInspector && !dom.fishInspector.hidden);
  const submarineManagerOpen = Boolean(runtime.selectedMachineryId);
  return Boolean(
    runtime.storeOverlayOpen
    || runtime.utilityOverlayOpen
    || runtime.settingsOverlayOpen
    || runtime.equipmentOverlayOpen
    || runtime.equipmentEditMode
    || runtime.tankEditMode
    || !runtime.sidebarCollapsed
    || runtime.foodTrayOpen
    || runtime.medicineTrayOpen
    || fishInspectorOpen
    || submarineManagerOpen
  );
}

function syncTankStageTouchScrollState() {
  dom.tankStage?.classList.toggle("allow-touch-scroll", shouldAllowTankStageTouchScroll());
}

function renderTheme() {
  document.documentElement.dataset.theme = DEFAULT_THEME;
}

function renderAnimatedBackgroundLayer(target = getCurrentTank()) {
  const layer = dom.tankStageBackground;
  if (!(layer instanceof HTMLElement)) {
    return;
  }

  const enabled = isAnimatedBackgroundEnabled(target);
  layer.classList.toggle("is-active", enabled);
  layer.toggleAttribute("hidden", !enabled);

  if (!enabled) {
    layer.removeAttribute("style");
    return;
  }

  const styleText = `${getAnimatedBackgroundCssDeclarations(target).join(";")};`;
  if (layer.getAttribute("style") !== styleText) {
    layer.setAttribute("style", styleText);
  }
}

function renderToolbarPosition() {
  const uiSettings = getUiSettings();
  const tutorialUi = getTutorialUiState();
  const toolbarPosition = tutorialUi?.forceToolbarPosition || uiSettings.toolbarPosition;
  const displayPosition = uiSettings.displayPosition;
  const toolbarCollapsed = tutorialUi ? false : uiSettings.toolbarCollapsed;
  const displayCollapsed = getEffectiveDisplayCollapsed(uiSettings, tutorialUi);
  document.documentElement.dataset.toolbarPosition = toolbarPosition;
  document.documentElement.dataset.displayPosition = displayPosition;
  document.documentElement.dataset.toolbarCollapsed = toolbarCollapsed ? "true" : "false";
  document.documentElement.dataset.displayCollapsed = displayCollapsed ? "true" : "false";
  if (dom.tankBottomDock) {
    dom.tankBottomDock.dataset.toolbarPosition = toolbarPosition;
    dom.tankBottomDock.classList.toggle("is-toolbar-collapsed", toolbarCollapsed);
    dom.tankBottomDock.setAttribute("aria-expanded", String(!toolbarCollapsed));
  }
  if (dom.tankDisplay) {
    dom.tankDisplay.hidden = !DIGITAL_DISPLAY_ENABLED;
    dom.tankDisplay.dataset.displayPosition = displayPosition;
    dom.tankDisplay.classList.toggle("is-display-collapsed", displayCollapsed);
    dom.tankDisplay.setAttribute("aria-expanded", String(!displayCollapsed));
  }
  if (dom.utilityOverlay) {
    dom.utilityOverlay.dataset.utilityMode = runtime.utilityOverlayMode || "";
  }
  document.documentElement.dataset.hardwareAccelerationNoticeOpen = isHardwareAccelerationNoticeBlockingStart() ? "true" : "false";
}

function renderSidebar() {
  if (dom.tankSidebar) {
    dom.tankSidebar.hidden = true;
    dom.tankSidebar.classList.add("is-collapsed");
  }
  if (dom.toggleSidebar) {
    dom.toggleSidebar.hidden = true;
    dom.toggleSidebar.textContent = ">";
    dom.toggleSidebar.setAttribute("aria-expanded", "false");
    dom.toggleSidebar.setAttribute("aria-label", "Show sidebar");
  }
}

function renderTabs() {
  for (const button of dom.tabButtons) {
    button.classList.toggle("active", button.dataset.tab === runtime.activeTab);
  }

  for (const panel of dom.tabPanels) {
    panel.classList.toggle("active", panel.dataset.panel === runtime.activeTab);
  }
}

function triggerCoinGainGlow() {
  const wallet = dom.toolbarWallet;
  if (!wallet) {
    return;
  }
  if (runtime.coinGainGlowTimeoutId) {
    window.clearTimeout(runtime.coinGainGlowTimeoutId);
  }
  wallet.classList.remove("is-gaining-coins");
  void wallet.offsetWidth;
  wallet.classList.add("is-gaining-coins");
  runtime.coinGainGlowTimeoutId = window.setTimeout(() => {
    wallet.classList.remove("is-gaining-coins");
    runtime.coinGainGlowTimeoutId = 0;
  }, 1050);
}

function renderHeader(now) {
  const dirtiness = getTankDirtiness(now);
  const cleanliness = Math.max(0, Math.round((1 - dirtiness) * 100));
  const hungryCount = getHungryFishByNeeds(getCurrentTank(), now, FISH_HUNGER_LOW_THRESHOLD).length;
  const starvingCount = getHungryFishByNeeds(getCurrentTank(), now, FISH_HUNGER_CRITICAL_THRESHOLD).length;

  const renderedCoinCount = runtime.lastRenderedCoinCount;
  if (Number.isFinite(renderedCoinCount) && state.coins > renderedCoinCount) {
    triggerCoinGainGlow();
  }
  runtime.lastRenderedCoinCount = state.coins;
  setTextIfChanged(dom.coinCount, formatLcdNumber(state.coins));
  setTextIfChanged(dom.toolbarCoinCount, String(state.coins));
  dom.toolbarWallet?.classList.toggle("is-full", state.coins >= MAX_WALLET_COINS);
  setTextIfChanged(dom.cleanlinessLabel, `${cleanliness}%`);
  setTextIfChanged(dom.mealWindowLabel, starvingCount > 0 ? `${starvingCount}! / ${hungryCount}` : String(hungryCount));

  if (dom.nextMealCountdownMirror) {
    setTextIfChanged(dom.nextMealCountdownMirror, hungryCount > 0 ? `${hungryCount} hungry` : "All fish fed");
  }
}

function renderMealTrack(now) {
  setMarkupIfChanged("meal-track", dom.mealTrack, buildMealTrackMarkup(now));
}

function buildMealTrackMarkup(now) {
  const hungryFish = getHungryFishByNeeds(getCurrentTank(), now, FISH_HUNGER_LOW_THRESHOLD);
  const starvingFish = getHungryFishByNeeds(getCurrentTank(), now, FISH_HUNGER_CRITICAL_THRESHOLD);
  return `
    <div class="meal-line">
      <span class="meal-line-label">Hungry:</span>
      <strong class="meal-line-status" title="${hungryFish.length} hungry">${hungryFish.length}</strong>
    </div>
    <div class="meal-line">
      <span class="meal-line-label">Starving:</span>
      <strong class="meal-line-status" title="${starvingFish.length} starving">${starvingFish.length}</strong>
    </div>
  `;
}

function renderSummary(now) {
  setMarkupIfChanged("summary-grid", dom.summaryGrid, buildSummaryMarkup(now));
}

function buildSummaryMarkup(now) {
  const dirtiness = getTankDirtiness(now);
  const coinsPerMeal = getLivingTankFish().reduce((total, fish) => (
    total + (isMealFreeFish(fish) ? 0 : (getSpeciesForFish(fish)?.mealCoins || 0))
  ), 0);
  const lowHealthCount = state.fish.filter((fish) => !isFishDead(fish) && fish.healthUnits < getFishMaxHealthUnits(fish)).length;
  const grimeLoad = Math.round((getTankFishDirtinessMultiplier() - 1) * 100);
  const maxDirtyIn = formatDuration(getFilterMaxDirtyDurationMs());

  const rows = [
    { label: "Fish in Tank", value: state.fish.filter((fish) => !isFishDead(fish)).length },
    { label: "Feeding Care Coins", value: coinsPerMeal },
    { label: "Current Grime", value: `${Math.round(dirtiness * 100)}%` },
    { label: "Waste on floor", value: state.poops.length },
    { label: "Tank Grime Load", value: `+${grimeLoad}%` },
    { label: "Max Grime In", value: maxDirtyIn },
    { label: "Fish Injured/Healing", value: lowHealthCount },
    { label: "Deaths in Care", value: state.lifetimeDeaths }
  ];

  return rows
    .map(
      (row) => `
        <div class="summary-row">
          <span>${row.label}</span>
          <strong>${row.value}</strong>
        </div>
      `
    )
    .join("");
}

function renderEvents() {
  setMarkupIfChanged("event-feed", dom.eventFeed, buildEventsMarkup());
}

function buildEventsMarkup() {
  return state.events.length
    ? state.events
      .map(
        (event) => `
            <div class="event-line">
              <strong>${timeAgo(event.time)}</strong>
              <div>${event.text}</div>
            </div>
          `
      )
      .join("")
    : `<div class="empty-state">Nothing has happened yet.</div>`;
}

function formatFishShopMetric(kind, count, options = {}) {
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  if (safeCount <= 0) {
    return options.emptyLabel || "None";
  }

  if (kind === "coin") {
    return `+${safeCount} feeding care`;
  }

  return `${safeCount} ${pluralize("heart", safeCount)}`;
}

function formatFishShopBehavior(species) {
  if (!species) {
    return "Steady";
  }

  if (isCustomFishShopKey(species.id)) {
    return "Choose behavior";
  }

  if (isPiranhaSpecies(species)) {
    return "Swarm predator";
  }

  if (isUndeadSpecies(species)) {
    return "Undead aggressor";
  }

  if (species.behavior === "sucker") {
    return "Back-glass grazer";
  }

  if (species.diet === "detritus") {
    return "Detritus grazer";
  }

  if (species.diet === "none") {
    return "Doesn't take pellets";
  }

  return formatSwimStyle(species.swimStyle)
    .replace(/^./, (letter) => letter.toUpperCase());
}

function renderFishShop() {
  const tutorialRestriction = getTutorialStoreRestriction("fish");
  const searchQuery = tutorialRestriction ? "" : getStoreSearchQuery("fish");
  const fishFilter = tutorialRestriction ? "all" : normalizeFishStoreFilterKey(runtime.storeFilters?.fish);
  const filteredCatalog = getFishShopCatalog()
    .filter((fish) => matchesFishStoreFilter(fish, fishFilter))
    .filter((fish) => {
      if (!tutorialRestriction) {
        return true;
      }
      if (tutorialRestriction.hideCustom && (isCustomFishShopKey(fish.id) || isCustomFishAssetKey(fish.id))) {
        return false;
      }
      return getFishPurchaseCost(fish.id) <= tutorialRestriction.maxCost;
    });
  const allCatalog = sortCatalogEntries(filteredCatalog, runtime.storeSorts.fish);
  const catalog = allCatalog.filter((fish) => matchesShopSearchQuery(getFishShopSearchHaystack(fish), searchQuery));
  const tutorialPreviewOnly = tutorialRestriction?.previewOnly === true;
  if (!allCatalog.length) {
    setMarkupIfChanged(
      "fish-shop",
      dom.fishShop,
      `
        ${renderShopToolbar("fish", 0, 0)}
        <div class="empty-state">No ${fishFilter === "cave" ? "cave fish" : "fish"} are available in the shop right now.</div>
      `
    );
    return;
  }

  if (!catalog.length) {
    setMarkupIfChanged(
      "fish-shop",
      dom.fishShop,
      `
        ${renderShopToolbar("fish", 0, allCatalog.length)}
        <div class="empty-state">No ${fishFilter === "cave" ? "cave fish" : "fish"} match "${escapeHtml(searchQuery.trim())}".</div>
      `
    );
    return;
  }

  const cardsMarkup = catalog
    .map((fish) => {
      const isCustomUploadProduct = isCustomFishShopKey(fish.id);
      const progressLocked = !isCustomUploadProduct && !isFishSpeciesProgressUnlocked(fish);
      const locked = !isCustomUploadProduct && !isFishSpeciesShopUnlocked(fish);
      const debugUnlocked = progressLocked && !locked;
      const purchaseCost = getFishPurchaseCost(fish.id);
      const affordable = !locked && !tutorialPreviewOnly && state.coins >= purchaseCost;
      const maxHealthUnits = getSpeciesMaxHealthUnits(fish);
      const heartCount = Math.ceil(maxHealthUnits / 2);
      const healthDisplay = isCustomUploadProduct
        ? "Behavior-based"
        : formatFishShopMetric("heart", heartCount);
      const coinsDisplay = isCustomUploadProduct
        ? "Behavior-based"
        : isMealFreeFish(fish)
          ? "None"
          : formatFishShopMetric("coin", fish.mealCoins);
      const dirtinessLoadPercent = isCustomUploadProduct
        ? null
        : Math.round(getFishDirtinessBonus({ scale: getFishScaleDefault(fish.id) }, fish) * 100);
      const fishAsset = getFishCatalogAssetPath(fish) || fish.asset;
      const needChips = renderNeutralComfortTagChips(getSpeciesNeedTags(fish));
      const conflictChips = renderNeutralComfortTagChips(getSpeciesConflictTags(fish));
      const lockedRequirementLabel = getUnlockRequirementLabel(fish.unlockRequirement);
      const unlockLabel = locked
        ? lockedRequirementLabel
        : debugUnlocked
          ? `Debug unlocked (${lockedRequirementLabel})`
          : "Unlocked";
      return `
        <article class="shop-card ${locked ? "is-locked" : ""}">
          <img class="shop-thumb ${locked ? "is-locked" : ""}" src="${fishAsset}" alt="${fish.name}" />
          <div class="shop-meta shop-card-main">
            <div>
              <strong>${fish.name}</strong>
              ${renderFishShopThemePill(fish.theme)}
            </div>
            <div class="shop-stat-list">
              <div class="shop-stat-row"><span class="shop-stat-label">Unlock:</span><span class="shop-stat-value">${escapeHtml(unlockLabel)}</span></div>
              <div class="shop-stat-row"><span class="shop-stat-label">Health:</span><span class="shop-stat-value">${healthDisplay}</span></div>
              <div class="shop-stat-row"><span class="shop-stat-label">Feeding Care:</span><span class="shop-stat-value">${coinsDisplay}</span></div>
              <div class="shop-stat-row"><span class="shop-stat-label">Grime Multiplier:</span><span class="shop-stat-value">${isCustomUploadProduct ? "Size-based" : `+${dirtinessLoadPercent}%`}</span></div>
              <div class="shop-stat-row"><span class="shop-stat-label">Behavior:</span><span class="shop-stat-value">${formatFishShopBehavior(fish)}</span></div>
            </div>
            <div class="shop-comfort-profile">
              <div><span>Needs</span><div class="inspector-chip-row">${needChips}</div></div>
              <div><span>Conflicts</span><div class="inspector-chip-row">${conflictChips}</div></div>
            </div>
          </div>
          <div class="shop-meta">
            <span class="price-tag">${purchaseCost === 0 ? "Free" : `${purchaseCost} ${pluralize("coin", purchaseCost)}`}</span>
            <button class="buy-button" data-buy-fish="${fish.id}" ${(affordable || tutorialPreviewOnly) ? "" : "disabled"} ${tutorialPreviewOnly ? "disabled" : ""}>
              ${locked ? "Locked" : tutorialPreviewOnly ? "Preview Only" : isCustomUploadProduct ? "Choose Image" : "Buy Fish"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  setMarkupIfChanged(
    "fish-shop",
    dom.fishShop,
    `${renderShopToolbar("fish", catalog.length, allCatalog.length)}${cardsMarkup}`
  );
}

function renderStoreOverlay() {
  const allowedTabs = getTutorialAllowedStoreTabs();
  if (runtime.storeOverlayOpen && allowedTabs && !allowedTabs.has(runtime.storeTab)) {
    runtime.storeTab = getTutorialPreferredStoreTab() || [...allowedTabs][0] || runtime.storeTab;
  }
  const showingFood = runtime.storeTab === "food";
  const showingPharmacy = runtime.storeTab === "pharmacy";
  const showingFish = runtime.storeTab === "fish";
  const showingDecor = runtime.storeTab === "decor";
  const showingEquipment = runtime.storeTab === "equipment";

  dom.storeOverlay.hidden = !runtime.storeOverlayOpen;
  dom.storeOverlay.classList.toggle("is-open", runtime.storeOverlayOpen);

  dom.storeFoodTab?.classList.toggle("is-active", showingFood);
  dom.storePharmacyTab?.classList.toggle("is-active", showingPharmacy);
  dom.storeFishTab.classList.toggle("is-active", showingFish);
  dom.storeDecorTab.classList.toggle("is-active", showingDecor);
  dom.storeEquipmentTab?.classList.toggle("is-active", showingEquipment);
  dom.storeFoodTab?.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("food"));
  dom.storePharmacyTab?.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("pharmacy"));
  dom.storeFishTab.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("fish"));
  dom.storeDecorTab.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("decor"));
  dom.storeEquipmentTab?.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("equipment"));

  dom.storeFoodTab?.setAttribute("aria-selected", String(showingFood));
  dom.storePharmacyTab?.setAttribute("aria-selected", String(showingPharmacy));
  dom.storeFishTab.setAttribute("aria-selected", String(showingFish));
  dom.storeDecorTab.setAttribute("aria-selected", String(showingDecor));
  dom.storeEquipmentTab?.setAttribute("aria-selected", String(showingEquipment));

  if (dom.storeCoinCounter) {
    const currentCoins = formatStoreCoinCounterValue(state.coins);
    dom.storeCoinCounter.innerHTML = `
      ${buildCoinIconMarkup("store-coin-icon store-coin-counter-icon", { decorative: true })}
      <span class="store-coin-counter-value">${escapeHtml(currentCoins)}</span>
    `;
    dom.storeCoinCounter.setAttribute("aria-label", `Current coins: ${currentCoins}`);
  }

  if (dom.foodShop) {
    dom.foodShop.hidden = !runtime.storeOverlayOpen || !showingFood;
  }
  if (dom.pharmacyShop) {
    dom.pharmacyShop.hidden = !runtime.storeOverlayOpen || !showingPharmacy;
  }
  dom.fishShop.hidden = !runtime.storeOverlayOpen || !showingFish;
  dom.decorShop.hidden = !runtime.storeOverlayOpen || !showingDecor;
  if (dom.equipmentShop) {
    dom.equipmentShop.hidden = !runtime.storeOverlayOpen || !showingEquipment;
  }
  syncWallpaperEngineStoreScrollControls();
}

function renderTankNavigation() {
  const tanks = getAllTanks();
  const visible = false;
  if (dom.prevTankButton) {
    dom.prevTankButton.hidden = !visible;
  }
  if (dom.nextTankButton) {
    dom.nextTankButton.hidden = !visible;
  }
  if (dom.dailyBonusBell) {
    syncNotificationBellPresentation();
  }
}

function openAquariumOverview() {
  clearPrimaryToolModes();
  runtime.boroughOverviewOpen = true;
  runtime.aquariumExpansionMode = true;
  runtime.boroughOverviewFishRenderedAt = 0;
  renderAquariumOverview();
}

function closeAquariumOverview() {
  materializeCoarseFishActivities(getCurrentTank(), Date.now());
  runtime.boroughOverviewOpen = false;
  runtime.aquariumExpansionMode = false;
  renderAquariumOverview();
}

function toggleAquariumOverview() {
  if (runtime.boroughOverviewOpen) {
    closeAquariumOverview();
  } else {
    openAquariumOverview();
  }
}

function getBoroughSnapshotSignature(tank) {
  return JSON.stringify({
    tankTypeId: tank?.tankTypeId,
    selectedBackground: tank?.selectedBackground,
    customBackgroundMode: tank?.customBackgroundMode,
    solidBackgroundColor: tank?.solidBackgroundColor,
    gradientBackgroundStartColor: tank?.gradientBackgroundStartColor,
    gradientBackgroundEndColor: tank?.gradientBackgroundEndColor,
    animatedBackgroundColors: getActiveAnimatedBackgroundColors(tank),
    localBackgroundImageDataUrl: tank?.localBackgroundImageDataUrl,
    localBackgroundImageRefId: tank?.localBackgroundImageRefId,
    customGravelEnabled: tank?.customGravelEnabled,
    customGravelLayerColors: tank?.customGravelLayerColors,
    customGravelLayerColorize: tank?.customGravelLayerColorize,
    gravelPalette: tank?.gravelPalette,
    gravelSeed: tank?.gravelSeed,
    gravelLivePebbles: tank?.gravelLivePebbles,
    poops: tank?.poops,
    lastCleanedAt: tank?.lastCleanedAt,
    selectedTankAsset: tank?.selectedTankAsset,
    selectedFilterAsset: tank?.selectedFilterAsset,
    placedDecor: (tank?.placedDecor || []).map((item) => [
      item.id, item.decorKey, item.xNorm, item.yNorm, item.scale, item.tankLayer, item.flipped, item.flippedY,
      item.decorSettings, item.caveColorSettings
    ])
  });
}

function paintBoroughSnapshotBackground(context, tank, width, height) {
  context.fillStyle = "#061521";
  context.fillRect(0, 0, width, height);
  if (!isAnimatedBackgroundEnabled(tank)) {
    return;
  }
  const colors = getActiveAnimatedBackgroundColors(tank);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, colors.surface);
  gradient.addColorStop(0.38, colors.mid);
  gradient.addColorStop(0.7, colors.deep);
  gradient.addColorStop(1, colors.abyss);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const surfaceRgb = hexToRgb(colors.surfaceBloom);
  const shadowRgb = hexToRgb(colors.shadowBloom);
  if (surfaceRgb) {
    const bloom = context.createRadialGradient(width * 0.3, height * 0.2, 0, width * 0.3, height * 0.2, Math.max(width, height) * 0.5);
    bloom.addColorStop(0, `rgba(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}, 0.35)`);
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = bloom;
    context.fillRect(0, 0, width, height);
  }
  if (shadowRgb) {
    const shadow = context.createRadialGradient(width * 0.7, height * 0.8, 0, width * 0.7, height * 0.8, Math.max(width, height) * 0.58);
    shadow.addColorStop(0, `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, 0.45)`);
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = shadow;
    context.fillRect(0, 0, width, height);
  }
}

function getBoroughSnapshot(tank, now = Date.now()) {
  const signature = getBoroughSnapshotSignature(tank);
  const cached = runtime.boroughOverviewSnapshotCache.get(tank.id);
  const refreshMs = Math.max(250, Number(runtime.boroughOverviewSnapshotFrameMs) || 1500);
  const cacheIsFresh = now - Number(cached?.capturedAt || 0) < refreshMs;
  if (cached?.canvas && (runtime.debugSnapshotCacheFrozen || (cached.signature === signature && cacheIsFresh))) {
    return { ...cached, changed: false };
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 216;
  const previousFish = tank.fish;
  withActiveTank(tank.id, () => {
    tank.fish = [];
    try {
      renderTank(now);
      const context = canvas.getContext("2d", { alpha: false });
      paintBoroughSnapshotBackground(context, tank, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low";
      context.drawImage(dom.tankCanvas, 0, 0, canvas.width, canvas.height);
      context.drawImage(dom.grimeCanvas, 0, 0, canvas.width, canvas.height);
      context.drawImage(dom.glassCanvas, 0, 0, canvas.width, canvas.height);
    } finally {
      tank.fish = previousFish;
    }
  });
  const entry = { signature, canvas, capturedAt: now, changed: true };
  runtime.boroughOverviewSnapshotCache.set(tank.id, entry);
  return entry;
}

function paintBoroughSnapshots(tanks, now = Date.now(), options = {}) {
  const refreshMs = Math.max(250, Number(runtime.boroughOverviewSnapshotFrameMs) || 1500);
  if (options.force !== true && now - Number(runtime.boroughOverviewSnapshotRenderedAt || 0) < refreshMs) {
    return false;
  }
  runtime.boroughOverviewSnapshotRenderedAt = now;
  let renderedTank = false;
  for (const tank of tanks) {
    const snapshot = getBoroughSnapshot(tank, now);
    renderedTank = renderedTank || snapshot.changed;
    const target = dom.boroughGrid.querySelector(`canvas[data-borough-snapshot-tank-id="${CSS.escape(tank.id)}"]`);
    const context = target?.getContext?.("2d", { alpha: false });
    if (!target || !context) {
      continue;
    }
    const width = Math.max(1, Math.round(target.clientWidth * Math.min(1.25, window.devicePixelRatio || 1)));
    const height = Math.max(1, Math.round(target.clientHeight * Math.min(1.25, window.devicePixelRatio || 1)));
    if (target.width !== width || target.height !== height) {
      target.width = width;
      target.height = height;
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "low";
    context.drawImage(snapshot.canvas, 0, 0, width, height);
  }
  if (renderedTank) {
    renderTank(now);
  }
  return renderedTank;
}

function getBoroughOverviewSummary(now = Date.now()) {
  const tanks = getAllTanks();
  const livingFish = getAllTankFish(state).filter((fish) => fish && !isFishDead(fish));
  const hungryFish = tanks.reduce((total, tank) => total + getHungryFishByNeeds(tank, now, FISH_HUNGER_LOW_THRESHOLD).length, 0);
  const sickFish = livingFish.filter((fish) => isFishDiseaseVisible(fish) && hasActiveFishDisease(fish)).length;
  const averageCleanliness = tanks.length
    ? Math.round(tanks.reduce((total, tank) => total + getTankCleanlinessPercentForMilestones(tank, now), 0) / tanks.length)
    : 100;
  const tasks = buildUniversalManagementCareQueue(now);
  const activeTaskCount = tasks.filter((task) => getCareTaskId(task) !== "all-clear").length;
  return { tanks, livingFish, hungryFish, sickFish, averageCleanliness, tasks, activeTaskCount };
}

function buildBoroughOverviewCareTaskRow(task = {}) {
  const action = getManagementCareTaskAction(task);
  const tagName = action ? "button" : "article";
  const attributes = action
    ? ` type="button" data-borough-care-action="${escapeHtml(action)}" data-borough-care-tank-id="${escapeHtml(task.tankId || "")}" data-borough-care-fish-id="${escapeHtml(task.fishId || "")}"`
    : "";
  return `<${tagName} class="borough-overview-task management-tone-${escapeHtml(task.tone || "neutral")}"${attributes}><span>${escapeHtml(task.badge || "Task")}</span><strong>${escapeHtml(task.label || "")}</strong><small>${escapeHtml(task.value || "")}</small></${tagName}>`;
}

function buildBoroughOverviewBoroughPanel(now = Date.now()) {
  const summary = getBoroughOverviewSummary(now);
  return `
    <section class="borough-info-section">
      <div class="compact-heading"><h3>Borough Care</h3><p>${summary.activeTaskCount ? `${summary.activeTaskCount} active ${pluralize("task", summary.activeTaskCount)} across all neighborhoods.` : "Everything is on track across the borough."}</p></div>
      <div class="borough-overview-task-list">${summary.tasks.slice(0, 6).map(buildBoroughOverviewCareTaskRow).join("")}</div>
      <button class="small-button alt" type="button" data-toggle-care-task-pane>${getUiSettings().careTaskPaneOpen === true ? "Hide Pinned Tasks" : "Pin Universal Tasks"}</button>
    </section>
    <section class="borough-info-section">
      <div class="compact-heading"><h3>Borough Happenings</h3><p>Recent moments from every neighborhood.</p></div>
      ${buildBoroughHappeningsFeedMarkup(3)}
    </section>
    <section class="borough-info-section">
      <div class="compact-heading"><h3>Records</h3></div>
      <div class="borough-overview-record-grid">
        <button type="button" data-borough-info-view="milestones"><strong>Milestones</strong><span>Goals, progress, and rewards</span></button>
        <button type="button" data-borough-info-view="history"><strong>History</strong><span>Events across the borough</span></button>
      </div>
    </section>`;
}

function buildBoroughOverviewNeighborhoodPanel(tank, now = Date.now()) {
  if (!tank) {
    return `<div class="empty-state">Choose a neighborhood to inspect.</div>`;
  }
  return withActiveTank(tank.id, () => {
    const stats = getManagementHubStats(now);
    const status = getManagementTankStatus(stats);
    const tasks = buildManagementCareQueue(stats);
    const services = getBoroughSectionServiceTypes(tank);
    const serviceLabel = services.length ? services.map((type) => getBoroughServiceLabel(type)).join(", ") : "None yet";
    const healthValue = stats.deadFish > 0 ? `${stats.deadFish} lost` : stats.injuredFish > 0 ? `${stats.injuredFish} healing` : stats.livingFish ? "Stable" : "No fish";
    return `
      <section class="borough-info-section borough-neighborhood-summary">
        <div class="borough-neighborhood-heading"><div><span>Neighborhood</span><h3>${escapeHtml(getTankLabel(tank))}</h3></div><span class="management-status-pill management-tone-${escapeHtml(status.tone)}">${escapeHtml(status.label)}</span></div>
        <div class="borough-neighborhood-meta"><span>${stats.livingFish} fish</span><span>${stats.placedDecor} decor</span><span>Services: ${escapeHtml(serviceLabel)}</span></div>
        <div class="borough-neighborhood-actions">
          <button class="small-button" type="button" data-visit-section="${escapeHtml(tank.id)}">Visit Tank</button>
          <button class="small-button alt" type="button" data-borough-edit-tank="${escapeHtml(tank.id)}">Edit Tank</button>
        </div>
      </section>
      <section class="borough-info-section">
        <div class="compact-heading"><h3>Care Snapshot</h3><p>${escapeHtml(status.note)}</p></div>
        <div class="borough-care-stat-grid">
          <article><span>Hunger</span><strong>${escapeHtml(stats.mealStatus)}</strong></article>
          <article><span>Health</span><strong>${escapeHtml(healthValue)}</strong></article>
          <article><span>Clean</span><strong>${stats.cleanPercent}%</strong></article>
          <article><span>Waste</span><strong>${stats.wasteCount || stats.pendingWasteCount || 0}</strong></article>
        </div>
        <div class="borough-overview-task-list">${tasks.slice(0, 4).map((task) => buildBoroughOverviewCareTaskRow({ ...task, tankId: tank.id })).join("")}</div>
      </section>
      <section class="borough-info-section">
        <div class="borough-overview-record-grid">
          <button type="button" data-borough-info-view="fish"><strong>Fish (${stats.livingFish})</strong><span>Inspect and manage fish</span></button>
          <button type="button" data-borough-info-view="decor"><strong>Decor (${stats.placedDecor})</strong><span>Inspect placed decor</span></button>
        </div>
      </section>`;
  });
}

function renderBoroughOverviewInfoPanel(now = Date.now()) {
  if (!dom.boroughOverviewInfoBody) {
    return;
  }
  const tanks = getAllTanks();
  const selectedTank = getTankById(runtime.boroughOverviewInfoTankId) || getCurrentTank() || tanks[0] || null;
  runtime.boroughOverviewInfoTankId = selectedTank?.id || null;
  const tab = runtime.boroughOverviewInfoTab === "tank" ? "tank" : "borough";
  const view = String(runtime.boroughOverviewInfoView || "overview");
  dom.boroughOverviewInfo?.querySelectorAll?.("[data-borough-info-tab]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.boroughInfoTab === tab));
  });
  let markup;
  if (view === "history") {
    markup = buildTankManagementHistoryBrowser();
  } else if (view === "milestones") {
    markup = buildTankManagementMilestonesBrowser(now);
  } else if (view === "fish" && selectedTank) {
    markup = withActiveTank(selectedTank.id, () => buildTankManagementFishBrowser(now));
  } else if (view === "decor" && selectedTank) {
    markup = withActiveTank(selectedTank.id, () => buildTankManagementDecorBrowser());
  } else {
    runtime.boroughOverviewInfoView = "overview";
    markup = tab === "tank" ? buildBoroughOverviewNeighborhoodPanel(selectedTank, now) : buildBoroughOverviewBoroughPanel(now);
  }
  setMarkupIfChanged("borough-overview-info", dom.boroughOverviewInfoBody, markup);
}

function renderAquariumOverview() {
  if (!dom.boroughOverview || !dom.boroughGrid) {
    return;
  }
  const open = Boolean(runtime.boroughOverviewOpen);
  dom.boroughOverview.hidden = !open;
  dom.overviewButton?.setAttribute("aria-pressed", String(open));
  if (!open) {
    return;
  }
  const tanks = getAllTanks();
  const expansionSpaces = getValidAquariumExpansionSpaces();
  const editMode = runtime.boroughOverviewEditMode === true;
  const syntheticCount = isDebugModeEnabled() ? Math.max(0, Number(runtime.debugOverviewSyntheticCount) || 0) : 0;
  const syntheticColumns = Math.max(1, Math.ceil(Math.sqrt(syntheticCount)));
  let cells = syntheticCount > 0
    ? Array.from({ length: syntheticCount }, (_, index) => ({ id: `debug-preview-${index}`, gridX: index % syntheticColumns, gridY: Math.floor(index / syntheticColumns), cellType: "debug-preview", debugIndex: index + 1 }))
    : tanks.map((tank) => ({ ...tank, cellType: "section" }));
  if (!syntheticCount && editMode) {
    const occupied = new Set(cells.map((cell) => `${cell.gridX}:${cell.gridY}`));
    const tankXs = tanks.map((tank) => tank.gridX);
    const tankYs = tanks.map((tank) => tank.gridY);
    const minTankX = Math.min(...tankXs) - 1;
    const maxTankX = Math.max(...tankXs) + 1;
    const minTankY = Math.min(...tankYs) - 1;
    const maxTankY = Math.max(...tankYs) + 1;
    for (let gridY = minTankY; gridY <= maxTankY; gridY += 1) {
      for (let gridX = minTankX; gridX <= maxTankX; gridX += 1) {
        if (!occupied.has(`${gridX}:${gridY}`)) cells.push({ gridX, gridY, cellType: "drop" });
      }
    }
  }
  const minX = Math.min(...cells.map((cell) => cell.gridX));
  const maxX = Math.max(...cells.map((cell) => cell.gridX));
  const minY = Math.min(...cells.map((cell) => cell.gridY));
  const maxY = Math.max(...cells.map((cell) => cell.gridY));
  const columnCount = maxX - minX + 1;
  const rowCount = maxY - minY + 1;
  const expansionCost = getAquariumExpansionCost();
  const overviewSummary = getBoroughOverviewSummary(Date.now());
  dom.boroughGrid.style.setProperty("--borough-columns", String(columnCount));
  dom.boroughGrid.style.setProperty("--borough-rows", String(rowCount));
  dom.boroughGrid.classList.toggle("is-editing", editMode);
  dom.boroughOverview?.querySelector(".borough-overview-body")?.classList.toggle("is-editing", editMode);
  if (dom.boroughOverviewInfo) dom.boroughOverviewInfo.hidden = editMode;
  dom.toggleBoroughEditMode?.setAttribute("aria-pressed", String(editMode));
  if (dom.toggleBoroughEditMode) dom.toggleBoroughEditMode.querySelector("small").textContent = editMode ? "Done" : "Edit";
  if (dom.addBoroughTankButton) {
    dom.addBoroughTankButton.hidden = !editMode;
    dom.addBoroughTankButton.disabled = state.coins < expansionCost;
    dom.addBoroughTankButton.querySelector("small").textContent = `Add Tank · ${expansionCost} coins`;
  }
  const layoutOverride = isDebugModeEnabled() ? String(runtime.debugOverviewLayoutMode || "auto") : "auto";
  dom.boroughGrid.classList.toggle("is-compact", layoutOverride === "compact" || layoutOverride === "micro" || (layoutOverride === "auto" && Math.max(columnCount, rowCount) >= 6));
  dom.boroughGrid.classList.toggle("is-micro", layoutOverride === "micro" || (layoutOverride === "auto" && Math.max(columnCount, rowCount) >= 10));
  dom.boroughOverviewTitle.textContent = "Borough Overview";
  const latestHappening = sanitizeBoroughHappenings(state.boroughHappenings)[0];
  dom.boroughOverviewHint.textContent = editMode
    ? `Drag neighborhoods onto the grid to rearrange them. Add a tank for ${expansionCost} coins.`
    : latestHappening
      ? `${latestHappening.text} · Click a tank to visit or use its info button.`
      : "Click a tank to visit or use its info button for neighborhood details.";
  if (dom.boroughOverviewStatus) {
    setMarkupIfChanged("borough-overview-status", dom.boroughOverviewStatus, `
      <span><strong>${overviewSummary.tanks.length}</strong> ${pluralize("neighborhood", overviewSummary.tanks.length)}</span>
      <span><strong>${overviewSummary.livingFish.length}</strong> fish</span>
      <span><strong>${overviewSummary.averageCleanliness}%</strong> average clean</span>
      <span class="${overviewSummary.activeTaskCount ? "has-alert" : ""}"><strong>${overviewSummary.activeTaskCount}</strong> active ${pluralize("task", overviewSummary.activeTaskCount)}</span>
    `);
  }
  const markup = cells.map((cell) => {
    const column = cell.gridX - minX + 1;
    const row = cell.gridY - minY + 1;
    if (cell.cellType === "debug-preview") {
      return `<article class="borough-grid-cell borough-section-cell borough-debug-preview-cell" role="gridcell" style="grid-column:${column};grid-row:${row}"><span class="borough-debug-preview-water"><i></i><i></i><i></i></span><span class="borough-cell-copy"><span class="borough-cell-name"><strong>Preview ${cell.debugIndex}</strong></span><span>Debug-only section</span><span class="borough-cell-identity">Mixed Neighborhood</span></span></article>`;
    }
    if (cell.cellType === "drop") {
      return `<div class="borough-drop-cell" role="gridcell" style="grid-column:${column};grid-row:${row}" data-borough-drop-grid-x="${cell.gridX}" data-borough-drop-grid-y="${cell.gridY}" aria-label="Move tank here"></div>`;
    }
    const active = cell.id === state.activeTankId;
    const fishCount = Array.isArray(cell.fish) ? cell.fish.filter((fish) => !isFishDead(fish)).length : 0;
    const serviceSummary = getNeighborhoodServiceSummary(cell);
    const identity = calculateNeighborhoodIdentity(cell);
    const serviceParts = [
      `Homes ${serviceSummary.homes.occupied}/${serviceSummary.homes.capacity}`,
      `Food ${serviceSummary.food ? "✓" : "—"}`,
      `Clinic ${serviceSummary.clinic ? "✓" : "—"}`,
      `Social ${serviceSummary.social ? "✓" : "—"}`,
      `Nursery ${serviceSummary.nursery ? "✓" : "—"}`
    ];
    const serviceMarkup = `<span class="borough-cell-services">${serviceParts.join(" · ")}</span>`;
    const editing = runtime.editingTankNameId === cell.id;
    const resaleValue = getTankResaleValue(cell);
    const canSell = tanks.length > 1 && isTankEmpty(cell);
    const sellTitle = tanks.length <= 1
      ? "You need to keep at least one tank"
      : !isTankEmpty(cell)
        ? "Move all fish and decor out before selling this tank"
        : `Sell ${getTankLabel(cell)} for ${resaleValue} coins`;
    const rightNeighbor = getAquariumSectionAt(cell.gridX + 1, cell.gridY);
    const wallBlocked = rightNeighbor ? isBoroughTravelWallBlocked(cell, rightNeighbor) : false;
    const wallMarkup = rightNeighbor
      ? `<button class="borough-travel-wall${wallBlocked ? " is-blocked" : ""}" type="button" data-toggle-travel-wall="${escapeHtml(cell.id)}" data-toggle-travel-wall-neighbor="${escapeHtml(rightNeighbor.id)}" aria-pressed="${wallBlocked}" aria-label="${wallBlocked ? "Allow" : "Block"} swimming between ${escapeHtml(getTankLabel(cell))} and ${escapeHtml(getTankLabel(rightNeighbor))}" title="${wallBlocked ? "Open" : "Close"} fish travel between these tanks">|</button>`
      : "";
    const nameMarkup = editing
      ? `<span class="borough-name-editor"><input type="text" maxlength="36" value="${escapeHtml(runtime.editingTankNameValue)}" data-borough-name-input="${escapeHtml(cell.id)}" aria-label="Neighborhood name"><button type="button" data-save-borough-name="${escapeHtml(cell.id)}">Save</button><button type="button" data-cancel-borough-name>Cancel</button></span>`
      : `<strong>${escapeHtml(getTankLabel(cell))}</strong>${editMode ? `<button class="borough-rename-button" type="button" data-rename-borough="${escapeHtml(cell.id)}" aria-label="Rename ${escapeHtml(getTankLabel(cell))}">&#9998;</button><button class="borough-sell-button" type="button" data-sell-borough-tank="${escapeHtml(cell.id)}" ${canSell ? "" : "disabled"} aria-label="Sell ${escapeHtml(getTankLabel(cell))} for ${resaleValue} coins" title="${escapeHtml(sellTitle)}"><span aria-hidden="true">&#128465;</span><small>${resaleValue}</small></button>` : `<button class="borough-info-button" type="button" data-borough-tank-info="${escapeHtml(cell.id)}" aria-label="View information for ${escapeHtml(getTankLabel(cell))}">i</button>`}`;
    const infoSelected = runtime.boroughOverviewInfoTab === "tank" && runtime.boroughOverviewInfoTankId === cell.id;
    return `<article class="borough-grid-cell borough-section-cell${active ? " is-active" : ""}${infoSelected ? " is-info-selected" : ""}" role="gridcell" draggable="false" style="grid-column:${column};grid-row:${row}" data-borough-section="${escapeHtml(cell.id)}" data-borough-grid-x="${cell.gridX}" data-borough-grid-y="${cell.gridY}"><span class="borough-preview-shell"><button class="borough-section-preview" type="button" data-visit-section="${escapeHtml(cell.id)}" aria-label="Visit ${escapeHtml(getTankLabel(cell))}"><canvas class="borough-cell-snapshot-canvas" data-borough-snapshot-tank-id="${escapeHtml(cell.id)}" aria-hidden="true"></canvas><canvas class="borough-cell-fish-canvas" data-borough-fish-tank-id="${escapeHtml(cell.id)}" aria-hidden="true"></canvas></button>${wallMarkup}</span><span class="borough-cell-copy"><span class="borough-cell-name">${nameMarkup}</span><span class="borough-cell-stats">${fishCount} fish · ${escapeHtml(identity.label)}</span>${serviceMarkup}</span></article>`;
  }).join("");
  setMarkupIfChanged("borough-grid", dom.boroughGrid, markup);
  if (!syntheticCount) {
    paintBoroughSnapshots(tanks, Date.now(), { force: true });
  }
  runtime.boroughOverviewFishRenderedAt = 0;
  if (!syntheticCount) {
    renderBoroughOverviewFish(Date.now(), { force: true });
  }
  renderBoroughOverviewInfoPanel(Date.now());
}

function getBoroughOverviewFishColor(fish) {
  const configuredColor = getFishColorSetting(fish);
  if (/^#[0-9a-f]{6}$/i.test(configuredColor)) {
    return configuredColor;
  }
  const source = String(fish?.speciesId || fish?.id || "fish");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue} 78% 67%)`;
}

function getBoroughOverviewFishPosition(fish, now = Date.now()) {
  const key = String(fish?.id || "");
  const sampleMs = Math.max(500, Number(runtime.boroughOverviewFishSampleMs) || 2000);
  const sampled = getCoarseFishActivityPosition(fish, now);
  let proxy = runtime.boroughOverviewFishProxies.get(key);
  if (!proxy) {
    proxy = { fromX: sampled.xNorm, fromY: sampled.yNorm, toX: sampled.xNorm, toY: sampled.yNorm, sampledAt: now, direction: 1 };
  } else if (now - proxy.sampledAt >= sampleMs) {
    const progress = clamp((now - proxy.sampledAt) / sampleMs, 0, 1);
    const currentX = proxy.fromX + (proxy.toX - proxy.fromX) * progress;
    const currentY = proxy.fromY + (proxy.toY - proxy.fromY) * progress;
    proxy = { fromX: currentX, fromY: currentY, toX: sampled.xNorm, toY: sampled.yNorm, sampledAt: now, direction: sampled.xNorm < currentX ? -1 : 1 };
  }
  runtime.boroughOverviewFishProxies.set(key, proxy);
  const progress = runtime.debugOverviewInterpolationDisabled ? 1 : clamp((now - proxy.sampledAt) / sampleMs, 0, 1);
  return { xNorm: proxy.fromX + (proxy.toX - proxy.fromX) * progress, yNorm: proxy.fromY + (proxy.toY - proxy.fromY) * progress, direction: proxy.direction };
}

function renderBoroughOverviewFish(now = Date.now(), options = {}) {
  if (!runtime.boroughOverviewOpen || !dom.boroughGrid) {
    return false;
  }
  const force = options.force === true;
  const debugFps = Number(runtime.debugOverviewFishFps);
  const frameMs = Number.isFinite(debugFps) && debugFps > 0
    ? Math.max(16, 1000 / debugFps)
    : Math.max(50, Number(runtime.boroughOverviewFishFrameMs) || (1000 / 12));
  if (!force && now - (Number(runtime.boroughOverviewFishRenderedAt) || 0) < frameMs) {
    return false;
  }
  runtime.boroughOverviewFishRenderedAt = now;
  const pixelRatio = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
  const canvases = dom.boroughGrid.querySelectorAll("canvas[data-borough-fish-tank-id]");
  for (const canvas of canvases) {
    const tank = getTankById(canvas.dataset.boroughFishTankId || "");
    const width = Math.max(1, Math.round(canvas.clientWidth));
    const height = Math.max(1, Math.round(canvas.clientHeight));
    const renderWidth = Math.max(1, Math.round(width * pixelRatio));
    const renderHeight = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      continue;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const fishList = Array.isArray(tank?.fish) ? tank.fish.filter((fish) => !isFishDead(fish)) : [];
    const fishSize = clamp(Math.min(width, height) * (fishList.length > 35 ? 0.035 : 0.055), 3, 14);
    for (const fish of fishList) {
      const position = getBoroughOverviewFishPosition(fish, now);
      const x = 5 + position.xNorm * Math.max(1, width - 10);
      const y = 5 + position.yNorm * Math.max(1, height - 10);
      const direction = position.direction < 0 ? -1 : 1;
      context.save();
      context.translate(x, y);
      context.scale(direction, 1);
      context.globalAlpha = 0.9;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low";
      const species = getSpeciesForFish(fish);
      const imagePath = getFishDisplayAssetPath(fish, species, now);
      const image = imagePath ? runtime.images.get(imagePath) : null;
      if (image?.complete && image.naturalWidth) {
        const aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
        context.drawImage(image, -fishSize * aspect, -fishSize, fishSize * aspect * 2, fishSize * 2);
      } else {
        context.fillStyle = getBoroughOverviewFishColor(fish);
        context.beginPath();
        context.ellipse(0, 0, fishSize * 1.45, fishSize * 0.72, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
    drawBoroughOverviewStructureActivity(context, tank, width, height, now);
  }
  return true;
}

function visitAquariumSection(tankId) {
  const changed = setActiveTank(tankId, { announce: true });
  closeAquariumOverview();
  return changed;
}

function moveCameraToAdjacentSection(dx, dy, options = {}) {
  const current = getCurrentTank();
  if (!current) {
    return false;
  }
  const target = getAquariumSectionAt(current.gridX + dx, current.gridY + dy);
  return target ? setActiveTank(target.id, options) : false;
}

function getFoodAndMedArt(kind, id) {
  const section = kind === "medicine" ? "medicine" : "food";
  const catalog = runtime.foodAndMedCatalog?.items?.[section] || {};
  const entry = catalog[id] || {};
  const fallbackPath = runtime.foodAndMedCatalog?.fallbackImage || resolveFoodAndMedAssetPath(FOOD_AND_MEDS_FALLBACK_IMAGE_NAME);
  const imagePath = entry.image
    ? resolveFoodAndMedAssetPath(entry.image)
    : fallbackPath;
  return {
    imagePath,
    fallbackPath
  };
}

function renderFoodAndMedImage(kind, id, alt, className = "shop-thumb") {
  const { imagePath, fallbackPath } = getFoodAndMedArt(kind, id);
  return `<img class="${className}" src="${imagePath}" alt="${alt}" onerror="this.onerror=null;this.src='${fallbackPath}'" />`;
}

function renderTankProductImage(tankTypeId, alt, className = "shop-thumb") {
  const imagePath = getTankProductImagePath(tankTypeId);
  const fallbackPath = getTankProductImageFallback(tankTypeId);
  return `<img class="${className}" src="${imagePath}" alt="${alt}" onerror="this.onerror=null;this.src='${fallbackPath}'" />`;
}

function getCustomBackgroundPreviewClasses(baseClassName = "background-thumb", target = getCurrentTank()) {
  const classes = [baseClassName, "background-custom-preview"];
  if (isAnimatedBackgroundEnabled(target)) {
    classes.push("background-underwater-preview");
  }
  return classes.join(" ");
}

function renderCustomBackgroundPreview(target = getCurrentTank(), className = "background-thumb", label = "Custom Background") {
  return `<div class="${getCustomBackgroundPreviewClasses(className, target)}" aria-label="${escapeHtml(label)}" style="${getCustomBackgroundPreviewStyle(target)}"></div>`;
}

function renderCustomBackgroundPreviewSwatch(target = getCurrentTank(), className = "background-fill-preview background-solid-toggle-preview") {
  const classes = className.split(/\s+/).filter(Boolean);
  classes.push("background-fill-preview");
  if (isAnimatedBackgroundEnabled(target)) {
    classes.push("background-underwater-preview");
  }
  return `<span class="${[...new Set(classes)].join(" ")}" style="${getCustomBackgroundPreviewStyle(target)}"></span>`;
}

function renderBackgroundPreview(background, className = "background-thumb") {
  if (!background) {
    return "";
  }

  if (isCustomBackgroundKey(background.key)) {
    return renderCustomBackgroundPreview(getCurrentTank(), className, background.name);
  }

  if (isLocalImageBackgroundKey(background.key)) {
    const dataUrl = getLocalBackgroundImageDataUrl();
    return dataUrl
      ? `<img class="${className}" src="${dataUrl}" alt="${escapeHtml(background.name)}" />`
      : "";
  }

  return `<img class="${className}" src="${background.path}" alt="${escapeHtml(background.name)}" />`;
}

function renderFoodShop() {
  if (!dom.foodShop) {
    return;
  }

  const catalog = getFoodCatalog().filter((food) => shouldShowFoodInStore(food));
  const cardsMarkup = catalog.map((food) => {
    const affordable = state.coins >= food.cost;
    const count = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
    return `
      <article class="shop-card">
        ${renderFoodAndMedImage("food", food.id, food.name)}
        <div class="shop-meta shop-card-main">
          <div>
            <strong>${food.name}</strong>
            <div class="fish-meta">${food.description}</div>
          </div>
          <div class="fish-meta">${count} pellet${count === 1 ? "" : "s"} owned</div>
        </div>
        <div class="shop-meta">
          <span class="price-tag">${food.cost} ${pluralize("coin", food.cost)}</span>
          <button class="buy-button" data-buy-food="${food.id}" ${affordable ? "" : "disabled"}>
            Buy Bottle (+${food.bottlePellets})
          </button>
        </div>
      </article>
    `;
  }).join("");

  setMarkupIfChanged("food-shop", dom.foodShop, cardsMarkup || `<div class="empty-state">No food is available right now.</div>`);
}

function renderPharmacyShop() {
  if (!dom.pharmacyShop) {
    return;
  }

  const catalog = getMedicineCatalog().filter((medicine) => shouldShowMedicineInStore(medicine));
  const cardsMarkup = catalog.map((medicine) => {
    const affordable = state.coins >= medicine.cost;
    const count = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
    return `
      <article class="shop-card">
        ${renderFoodAndMedImage("medicine", medicine.id, medicine.name)}
        <div class="shop-meta shop-card-main">
          <div>
            <strong>${medicine.name}</strong>
            <div class="fish-meta">${medicine.description}</div>
          </div>
          <div class="fish-meta">${count} drop${count === 1 ? "" : "s"} owned</div>
        </div>
        <div class="shop-meta">
          <span class="price-tag">${medicine.cost} ${pluralize("coin", medicine.cost)}</span>
          <button class="buy-button" data-buy-medicine="${medicine.id}" ${affordable ? "" : "disabled"}>
            Buy Bottle (+${medicine.bottleDrops})
          </button>
        </div>
      </article>
    `;
  }).join("");

  setMarkupIfChanged("pharmacy-shop", dom.pharmacyShop, cardsMarkup || `<div class="empty-state">No medicine is available right now.</div>`);
}
