// Source fragment: ui/main-and-store-rendering.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderUi(now, options = {}) {
  // BubbleBodega is rendered by the page shell while gameplay lives in this ES
  // module. Publish the small, variant-aware purchase bridge once rendering
  // begins so the shell never falls back to clicking a hidden legacy card.
  if (typeof window !== "undefined" && window.buyFish !== buyFish) {
    window.buyFish = buyFish;
    // BubbleBodega's cart completes purchases through these bridges rather
    // than synthetic clicks. Synthetic clicks can be intercepted by the cart
    // shell itself, which leaves checkout looking successful but unchanged.
    window.buyFood = buyFood;
    window.buyMedicine = buyMedicine;
    window.buyWaterTreatmentKit = buyWaterTreatmentKit;
    window.buyDecor = buyDecor;
    window.buyBackground = buyBackground;
    window.buySubstrate = buySubstrate;
    window.buySubmarine = buySubmarine;
    window.buyBoat = buyBoat;
    window.buyAutoDispenser = buyAutoDispenser;
    window.showToast = showToast;
    window.setStorePurchaseSoundBatch = setStorePurchaseSoundBatch;
    window.playPurchaseSoundEffect = playPurchaseSoundEffect;
    window.recordBubbleBodegaOrder = recordBubbleBodegaOrder;
    window.buyEngineeredAquaticSpecimen = buyEngineeredAquaticSpecimen;
    window.markEngineeredAquaticSpecimenDesigned = markEngineeredAquaticSpecimenDesigned;
    window.markEngineeredAquaticSpecimenConfigured = markEngineeredAquaticSpecimenConfigured;
    window.beginEngineeredAquaticSpecimenDesign = beginEngineeredAquaticSpecimenDesign;
    window.getProteusSaveDiscovery = getProteusSaveDiscovery;
    window.markProteusDiscoveredInSave = markProteusDiscoveredInSave;
    window.showProteusDesignerPage = () => openProteusDesignerPage();
    window.getBubbleBodegaAccountData = getBubbleBodegaAccountData;
    window.activateBubbleBodegaRescueOffer = activateBubbleBodegaRescueOffer;
    window.getBubbleBodegaActiveTankFilter = () => ({
      id: String(getCurrentTank()?.id || ""),
      waterType: getActiveStoreWaterType()
    });
  }
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
  if (full) {
    renderTankManagement();
    if (runtime.storeOverlayOpen) {
      renderFoodShop();
      renderPharmacyShop();
      renderFishShop();
      renderDecorShop();
      renderEquipmentShop();
    } else {
      releaseStoreCatalogMarkup();
    }
    renderFishList(now);
    renderDecorInventory();
    renderPlacedDecor();
    renderBackgrounds();
    renderSolidBackgroundControls();
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

function releaseStoreCatalogMarkup() {
  [
    ["food-shop", dom.foodShop],
    ["pharmacy-shop", dom.pharmacyShop],
    ["fish-shop", dom.fishShop],
    ["decor-shop", dom.decorShop],
    ["equipment-shop", dom.equipmentShop]
  ].forEach(([cacheKey, element]) => setMarkupIfChanged(cacheKey, element, ""));
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
  document.documentElement.style.setProperty("--toolbar-tile-color", uiSettings.toolbarTileColor);
  document.documentElement.dataset.displayPosition = displayPosition;
  document.documentElement.dataset.toolbarCollapsed = toolbarCollapsed ? "true" : "false";
  document.documentElement.dataset.displayCollapsed = displayCollapsed ? "true" : "false";
  if (dom.tankBottomDock) {
    // Keep the toolbar in the tank's top-level stacking context so it can remain
    // usable over the borough overview and BubbleBodega. Dialogs still cover it.
    if (dom.tankStage && dom.tankBottomDock.parentElement !== dom.tankStage) {
      dom.tankStage.append(dom.tankBottomDock);
    }
    // WebSurf Settings is now an in-browser page, so it must behave like the
    // Home/Bank/Store tabs and leave the main aquarium toolbar visible and
    // usable. Only true blocking dialogs should push the toolbar behind them.
    const dialogCoversToolbar = runtime.utilityOverlayOpen
      || runtime.equipmentOverlayOpen;
    const horizontalMenuCoversToolbar = runtime.editTankMode
      || runtime.fishEditMode
      || runtime.equipmentEditMode
      || runtime.tankEditMode
      || runtime.foodTrayOpen
      || runtime.medicineTrayOpen;
    dom.tankBottomDock.dataset.toolbarPosition = toolbarPosition;
    dom.tankBottomDock.classList.toggle("is-toolbar-collapsed", toolbarCollapsed);
    dom.tankBottomDock.classList.toggle("is-behind-overlay", dialogCoversToolbar);
    dom.tankBottomDock.classList.toggle("is-behind-horizontal-menu", horizontalMenuCoversToolbar);
    dom.tankBottomDock.setAttribute("aria-expanded", String(!toolbarCollapsed));
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
  renderWalletTransactionMenu();
  setTextIfChanged(dom.cleanlinessLabel, `${cleanliness}%`);
  setTextIfChanged(dom.mealWindowLabel, starvingCount > 0 ? `${starvingCount}! / ${hungryCount}` : String(hungryCount));

  if (dom.nextMealCountdownMirror) {
    setTextIfChanged(dom.nextMealCountdownMirror, hungryCount > 0 ? `${hungryCount} hungry` : "All fish fed");
  }
}

function renderWalletTransactionMenu() {
  const menu = dom.walletTransactionMenu;
  if (!menu) return;
  const entries = Array.isArray(state.walletTransactions) ? state.walletTransactions.slice(0, 60) : [];
  menu.hidden = runtime.walletTransactionMenuOpen !== true;
  dom.toolbarWallet?.setAttribute("aria-expanded", String(runtime.walletTransactionMenuOpen === true));
  const receipts = entries.length
    ? entries.map((entry) => {
      const debit = entry.direction === "debit";
      const neutral = entry.direction === "neutral" || Number(entry.amount) <= 0;
      const time = new Date(Number(entry.time) || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const place = String(entry.place || "Aquarium").replace(/tankazon/ig, "BubbleBodega");
      const amountMarkup = neutral
        ? "•"
        : `${debit ? "−" : "+"}${Math.max(0, Number(entry.amount) || 0)} <img ${assetImageAttributes("assets/icons/coin.png")} alt="coin" />`;
      return `<article class="wallet-receipt ${neutral ? "is-neutral" : debit ? "is-debit" : "is-credit"}"><strong>${amountMarkup}</strong><span>${escapeHtml(place)} · ${escapeHtml(entry.label)}</span><time>${escapeHtml(time)}</time></article>`;
    }).join("")
    : `<p class="wallet-receipt-empty">No receipts yet.</p>`;
  setMarkupIfChanged("wallet-transactions", menu, `<header><strong>Recent receipts</strong><button type="button" data-open-bubble-bank>Open Bank</button></header><div class="wallet-receipt-list">${receipts}</div>`);
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
  const feedingCare = getDailyFeedingCareStatus(getCurrentTank(), now);
  const lowHealthCount = state.fish.filter((fish) => !isFishDead(fish) && fish.healthUnits < getFishMaxHealthUnits(fish)).length;
  const grimeLoad = Math.round((getTankFishDirtinessMultiplier() - 1) * 100);
  const maxDirtyIn = formatDuration(getTankMaxDirtyDurationMs());

  const rows = [
    { label: "Fish in Tank", value: state.fish.filter((fish) => !isFishDead(fish)).length },
    { label: "Feeding Care Eligible Today", value: `${feedingCare.eligibleCoins} / ${FISH_DAILY_FEEDING_CARE_COIN_CAP}` },
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
    return `+${safeCount} first feed/day (shared ${FISH_DAILY_FEEDING_CARE_COIN_CAP} cap)`;
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

  if (isDavyMutationSpecies(species) && species.davyBehaviorLabel) {
    return species.davyBehaviorLabel;
  }

  if (isPiranhaSpecies(species)) {
    return "Swarm predator";
  }
  if (species.behavior === "shrimp") {
    return "Bottom scavenger";
  }

  const speciesType = getFishSpeciesType(species);
  if (speciesType === "shark") {
    return "Chum-tracking shark";
  }
  if (speciesType === "whale") {
    return "Social pod hunter";
  }
  if (speciesType === "seahorse") {
    return "Upright hoverer";
  }
  if (speciesType === "cephalopod") {
    return "Shell drifter";
  }
  if (species.id === "sunfish") {
    return "Gentle drifter";
  }
  if (species.id === "koi") {
    return "Broad bottom cruiser";
  }
  if (species.id === "lionfish") {
    return "Shelter ambush hoverer";
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

function renderStoreSubcategorySection(id, title, description, cardsMarkup, headingExtra = "") {
  if (!cardsMarkup) return "";
  const headingId = `${id}Heading`;
  return `
    <section class="shop-section store-subcategory-section" data-store-subcategory="${escapeHtml(id)}" aria-labelledby="${escapeHtml(headingId)}">
      <div class="shop-section-heading ${headingExtra ? "has-heading-extra" : ""}">
        <h3 id="${escapeHtml(headingId)}">${escapeHtml(title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        ${headingExtra}
      </div>
      <div class="shop-section-cards">${cardsMarkup}</div>
    </section>
  `;
}

function getFishStoreDisplayEntries(speciesList) {
  return speciesList.flatMap((species) => {
    const variants = getBubbleBodegaFishStoreVariants(species);
    const baseWaterType = getFishStoreWaterType(species);
    const mixedWaterVariants = variants.filter((variant) => (
      normalizeWaterType(variant?.requirements?.waterType, baseWaterType) !== baseWaterType
    ));
    if (!mixedWaterVariants.length) return [species];

    const baseVariants = variants.filter((variant) => (
      normalizeWaterType(variant?.requirements?.waterType, baseWaterType) === baseWaterType
    ));
    const makeEntry = (entryVariants, waterType, name = species.name) => ({
      ...species,
      name,
      storeWaterType: waterType,
      asset: entryVariants[0]?.image || species.asset,
      assetVariants: entryVariants.map((variant) => variant.image),
      variantLabels: entryVariants.map((variant) => variant.label),
      variantRequirements: Object.fromEntries(entryVariants.map((variant) => [variant.key, variant.requirements || species.careRequirements]))
    });
    return [
      ...(baseVariants.length ? [makeEntry(baseVariants, baseWaterType)] : []),
      // Keep each water habitat as one family tile. The saltwater puffer and
      // angelfish variants belong together, just as their freshwater siblings
      // do, but never share the same selector across water types.
      ...[...new Set(mixedWaterVariants.map((variant) => normalizeWaterType(variant.requirements?.waterType, baseWaterType)))].map((waterType) => (
        makeEntry(
          mixedWaterVariants.filter((variant) => normalizeWaterType(variant.requirements?.waterType, baseWaterType) === waterType),
          waterType
        )
      ))
    ];
  });
}

/* One thumbnail implementation for every BubbleBodega fish surface. Keeping
   shrimp layered here is important: a flat fallback loses their legs/feelers. */
function renderFishStoreThumbnail(fish, asset, locked = false) {
  const classes = `shop-thumb${locked ? " is-locked" : ""}`;
  if (fish?.behavior === "shrimp" && fish.asset && fish.antennaAsset && fish.legAsset) {
    return `<div class="${classes} layered-shrimp-thumb" role="img" aria-label="${escapeHtml(fish.name)}"><img class="layered-shrimp-thumb-legs" ${assetImageAttributes(fish.legAsset)} alt="" /><img class="layered-shrimp-thumb-body" ${assetImageAttributes(fish.asset)} alt="" /><img class="layered-shrimp-thumb-antennae" ${assetImageAttributes(fish.antennaAsset)} alt="" /></div>`;
  }
  return `<img class="${classes}" ${assetImageAttributes(asset)} alt="${escapeHtml(fish.name)}" />`;
}

function renderFishStoreCard(fish, { activeWaterType = (typeof getActiveStoreWaterType === "function" ? getActiveStoreWaterType() : "freshwater"), tutorialPreviewOnly = false } = {}) {
  const isCustomUploadProduct = isCustomFishShopKey(fish.id);
  const progressLocked = !isFishSpeciesProgressUnlocked(fish);
  const locked = !isFishSpeciesShopUnlocked(fish);
  const debugUnlocked = progressLocked && !locked;
  const purchaseCost = getFishPurchaseCost(fish.id);
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
  const bubbleBodegaVariants = getBubbleBodegaFishStoreVariants(fish);
  const fishAsset = bubbleBodegaVariants[0]?.image || getFishCatalogAssetPath(fish) || fish.asset;
  const isDavyMutation = isDavyMutationSpecies(fish);
  const needChips = renderNeutralComfortTagChips(getSpeciesNeedTags(fish));
  const conflictChips = renderNeutralComfortTagChips(getSpeciesConflictTags(fish));
  const lockedRequirementLabel = getUnlockRequirementLabel(fish.unlockRequirement);
  const unlockLabel = locked
    ? lockedRequirementLabel
    : debugUnlocked
      ? `Debug unlocked (${lockedRequirementLabel})`
      : "Unlocked";
  const behaviorWarning = isPiranhaSpecies(fish)
    ? "Warning: attacks and can kill tankmates when aggressive behavior is enabled."
    : "";
  const waterRequirement = typeof getStoreWaterRequirementLabel === "function" ? getStoreWaterRequirementLabel("fish", fish, activeWaterType) : "";
  return `
    <article class="shop-card ${locked ? "is-locked" : ""} ${isDavyMutation ? "is-davy-mutation" : ""}" ${renderStoreFacetAttributes("fish", fish)}>
      ${renderFishStoreThumbnail(fish, fishAsset, locked)}
      <div class="shop-meta shop-card-main">
        <div>
          <strong>${escapeHtml(fish.name)}</strong>
          ${renderFishShopGeneticsPill(fish.genetics)}
          ${[fish.description, ...(Array.isArray(fish.aboutParagraphs) ? fish.aboutParagraphs : [])]
            .filter((paragraph) => typeof paragraph === "string" && paragraph.trim())
            .map((paragraph) => `<div class="fish-meta">${escapeHtml(paragraph)}</div>`)
            .join("")}
          ${fish.aboutAttribution ? `<div class="shop-about-attribution">${escapeHtml(fish.aboutAttribution)}</div>` : ""}
          ${fish.aboutTagline ? `<div class="shop-about-tagline">${escapeHtml(fish.aboutTagline)}</div>` : ""}
          ${behaviorWarning ? `<div class="shop-behavior-warning">${escapeHtml(behaviorWarning)}</div>` : ""}
          ${waterRequirement ? `<div class="shop-water-requirement">${escapeHtml(waterRequirement)}</div>` : ""}
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
        <button class="buy-button" data-buy-fish="${fish.id}" data-list-price="${fish.cost}" data-fish-variants="${escapeHtml(JSON.stringify(bubbleBodegaVariants))}" ${isDavyMutation && fish.storeBackgroundImage ? `data-shop-bg-image="${escapeHtml(fish.storeBackgroundImage)}"` : ""} ${(locked || tutorialPreviewOnly) ? "disabled" : ""}>
          ${locked ? "Locked" : tutorialPreviewOnly ? "Preview Only" : isCustomUploadProduct ? "Choose Image" : "Buy Fish"}
        </button>
      </div>
    </article>
  `;
}

function renderFishShop() {
  const tutorialRestriction = getTutorialStoreRestriction("fish");
  const searchQuery = tutorialRestriction ? "" : getStoreSearchQuery("fish");
  const fishFilter = tutorialRestriction ? "all" : normalizeFishStoreFilterKey(runtime.storeFilters?.fish);
  const activeWaterType = typeof getActiveStoreWaterType === "function" ? getActiveStoreWaterType() : "freshwater";
  const sourceCatalog = getFishShopCatalog();
  const otherSourceCatalog = getOtherAquariumCreatureShopCatalog();
  const filterEntry = (fish) => {
    if (!matchesFishStoreFilter(fish, fishFilter)) return false;
    if (!tutorialRestriction) return true;
    if (tutorialRestriction.hideCustom && (isCustomFishShopKey(fish.id) || isCustomFishAssetKey(fish.id))) return false;
    return getFishPurchaseCost(fish.id) <= tutorialRestriction.maxCost;
  };
  const requestedSort = normalizeStoreSortKey(runtime.storeSorts.fish);
  const sortedCatalog = sortCatalogEntries(sourceCatalog.filter(filterEntry), requestedSort === "theme" ? "cost" : requestedSort);
  const sortedOtherCatalog = sortCatalogEntries(otherSourceCatalog.filter(filterEntry), requestedSort === "theme" ? "cost" : requestedSort);
  const dailyMutationOffer = getDavyMutationDailyOffer();
  const dailyMutationIndex = dailyMutationOffer ? sortedCatalog.findIndex((fish) => fish.id === dailyMutationOffer.species.id) : -1;
  const allCatalog = dailyMutationIndex > 0
    ? [sortedCatalog[dailyMutationIndex], ...sortedCatalog.filter((_, index) => index !== dailyMutationIndex)]
    : sortedCatalog;
  const catalog = getFishStoreDisplayEntries(allCatalog)
    .filter((fish) => matchesShopSearchQuery(getFishShopSearchHaystack(fish), searchQuery));
  const otherCatalog = sortedOtherCatalog.filter((animal) => matchesShopSearchQuery(getFishShopSearchHaystack(animal), searchQuery));
  const tutorialPreviewOnly = tutorialRestriction?.previewOnly === true;
  const totalSourceCount = sourceCatalog.length + otherSourceCatalog.length;
  const totalFilteredCount = allCatalog.length + sortedOtherCatalog.length;
  const totalVisibleCount = catalog.length + otherCatalog.length;

  if (!totalFilteredCount) {
    setMarkupIfChanged(
      "fish-shop",
      dom.fishShop,
      `
        ${renderShopToolbar("fish", 0, 0)}
        <div class="empty-state">No ${fishFilter === "cave" ? "cave fish" : "aquarium creatures"} are available in the shop right now.</div>
      `
    );
    return;
  }

  if (!totalVisibleCount) {
    setMarkupIfChanged(
      "fish-shop",
      dom.fishShop,
      `
        ${renderShopToolbar("fish", 0, totalFilteredCount)}
        <div class="empty-state">No ${fishFilter === "cave" ? "cave fish" : "aquarium creatures"} match "${escapeHtml(searchQuery.trim())}".</div>
      `
    );
    return;
  }

  const renderFishCard = (fish) => renderFishStoreCard(fish, { activeWaterType, tutorialPreviewOnly });

  const renderOtherCard = (animal) => {
    const locked = !isFishSpeciesShopUnlocked(animal);
    const progressLocked = !isFishSpeciesProgressUnlocked(animal);
    const debugUnlocked = progressLocked && !locked;
    const purchaseCost = getFishPurchaseCost(animal.id);
    const variants = getBubbleBodegaFishStoreVariants(animal);
    const animalAsset = variants[0]?.image || getFishCatalogAssetPath(animal) || animal.asset;
    const unlockRequirement = getUnlockRequirementLabel(animal.unlockRequirement);
    const unlockLabel = locked ? unlockRequirement : debugUnlocked ? `Debug unlocked (${unlockRequirement})` : "Unlocked";
    const cleanupFloor = Math.round(clamp(Number(animal.cleanupFloor) || CLEANUP_CREW_DIRTINESS_FLOOR, 0, 1) * 100);
    const cleanupIntervalMin = Math.max(1, Math.round(Number(animal.cleanupMinMs) / MINUTE_MS));
    const cleanupIntervalMax = Math.max(cleanupIntervalMin, Math.round(Number(animal.cleanupMaxMs) / MINUTE_MS));
    const waterRequirement = getStoreWaterRequirementLabel("fish", animal, activeWaterType);
    return `
      <article class="shop-card" ${renderStoreFacetAttributes("fish", animal)}>
        ${renderFishStoreThumbnail(animal, animalAsset, locked)}
        <div class="shop-meta shop-card-main">
          <div>
            <strong>${escapeHtml(animal.name)}</strong>
            <div class="fish-meta">${escapeHtml(animal.description || "A small aquarium creature.")}</div>
            ${waterRequirement ? `<div class="shop-water-requirement">${escapeHtml(waterRequirement)}</div>` : ""}
          </div>
          <div class="shop-stat-list">
            <div class="shop-stat-row"><span class="shop-stat-label">Unlock:</span><span class="shop-stat-value">${escapeHtml(unlockLabel)}</span></div>
            <div class="shop-stat-row"><span class="shop-stat-label">Water:</span><span class="shop-stat-value">${escapeHtml(getFishStoreWaterTypeLabel(animal))}</span></div>
            <div class="shop-stat-row"><span class="shop-stat-label">Cleanup:</span><span class="shop-stat-value">Every ${cleanupIntervalMin}-${cleanupIntervalMax} min</span></div>
            <div class="shop-stat-row"><span class="shop-stat-label">Cleanup limit:</span><span class="shop-stat-value">Stops passive grime cleanup near ${cleanupFloor}%</span></div>
            <div class="shop-stat-row"><span class="shop-stat-label">Capacity:</span><span class="shop-stat-value">${Number(animal.capacityCost).toFixed(Number(animal.capacityCost) % 1 ? 2 : 0)}</span></div>
          </div>
        </div>
        <div class="shop-meta">
          <span class="price-tag">${purchaseCost} ${pluralize("coin", purchaseCost)}</span>
          <button class="buy-button" data-buy-fish="${animal.id}" data-list-price="${animal.cost}" data-fish-variants="${escapeHtml(JSON.stringify(variants))}" ${(locked || tutorialPreviewOnly) ? "disabled" : ""}>${locked ? "Locked" : tutorialPreviewOnly ? "Preview Only" : "Buy Creature"}</button>
        </div>
      </article>`;
  };

  const freshwaterMarkup = catalog.filter((fish) => getFishStoreWaterType(fish) === "freshwater").map(renderFishCard).join("");
  const saltwaterMarkup = catalog.filter((fish) => getFishStoreWaterType(fish) === "saltwater").map(renderFishCard).join("");
  const otherMarkup = otherCatalog.map(renderOtherCard).join("");
  const cardsMarkup = [
    renderStoreSubcategorySection("fish-freshwater", "Fresh Water", "Fish suited to freshwater aquariums.", freshwaterMarkup),
    renderStoreSubcategorySection("fish-saltwater", "Salt Water", "Marine fish suited to saltwater aquariums.", saltwaterMarkup),
    renderStoreSubcategorySection("fish-other", "Other", "Shrimp, snails, and other aquarium creatures.", otherMarkup)
  ].join("");

  setMarkupIfChanged(
    "fish-shop",
    dom.fishShop,
    `${renderShopToolbar("fish", totalVisibleCount, totalSourceCount)}${cardsMarkup}`
  );
}

function renderDavyJonesLockerSpecimenStage(species, variant, options = {}) {
  const className = options.className ? ` ${options.className}` : "";
  return `<div class="davy-locker-photo-stage${className}"><img ${assetImageAttributes(variant.image)} alt="${escapeHtml(species.name)}" /></div>`;
}

function renderDavyJonesLockerVariantButtons(species, variants, selected) {
  return `<div class="davy-locker-variants" aria-label="Available variants">${variants.map((variant, index) => `<button type="button" data-davy-select-variant="${escapeHtml(variant.key)}" data-davy-species-id="${escapeHtml(species.id)}" aria-pressed="${variant.key === selected.key}"><img ${assetImageAttributes(variant.image)} alt="Variant ${index + 1}" /></button>`).join("")}</div>`;
}

function renderDavyJonesLockerItemPage(species) {
  const variants = getFishStoreVariants(species);
  if (!variants.length) return `<div class="davy-locker-empty">SPECIMEN DATA UNAVAILABLE</div>`;
  runtime.davyLockerVariantSelections ||= {};
  const selectedKey = variants.some((variant) => variant.key === runtime.davyLockerVariantSelections[species.id])
    ? runtime.davyLockerVariantSelections[species.id]
    : variants[0].key;
  const selected = variants.find((variant) => variant.key === selectedKey) || variants[0];
  runtime.davyLockerVariantSelections[species.id] = selected.key;
  const traits = Array.isArray(species.davyTraits) ? species.davyTraits.filter(Boolean) : [];
  return `<section class="davy-locker-item-page" data-davy-item-species="${escapeHtml(species.id)}">
    <button type="button" class="davy-locker-back" data-davy-back-to-catalogue>&lt; CATALOGUE</button>
    <div class="davy-locker-item-layout">
      <div class="davy-locker-item-visual">
        ${renderDavyJonesLockerSpecimenStage(species, selected, { className: "is-item-page" })}
        ${renderDavyJonesLockerVariantButtons(species, variants, selected)}
      </div>
      <div class="davy-locker-item-copy">
        <span class="davy-locker-record-label">SPECIMEN RECORD</span>
        <h2>${escapeHtml(species.name)}</h2>
        <dl class="davy-locker-record-grid">
          <div><dt>Origin</dt><dd>REDACTED</dd></div>
          <div><dt>Status</dt><dd>LIVE</dd></div>
          <div><dt>Classification</dt><dd>EXPERIMENTAL HYBRID</dd></div>
          <div><dt>Documentation</dt><dd>NONE</dd></div>
        </dl>
        <section class="davy-locker-record-section">
          <h3>Description</h3>
          <p>${escapeHtml(species.description || "No description available.")}</p>
        </section>
        <section class="davy-locker-record-section">
          <h3>Behavior</h3>
          <p>${escapeHtml(species.davyBehaviorSummary || species.davyBehaviorLabel || "Behavior data unavailable.")}</p>
        </section>
        ${species.davySwimStyleSummary ? `<section class="davy-locker-record-section"><h3>Swim Style</h3><p>${escapeHtml(species.davySwimStyleSummary)}</p></section>` : ""}
        ${species.davyDietSummary ? `<section class="davy-locker-record-section"><h3>Diet</h3><p>${escapeHtml(species.davyDietSummary)}</p></section>` : ""}
        ${species.davyTemperamentSummary ? `<section class="davy-locker-record-section"><h3>Temperament</h3><p>${escapeHtml(species.davyTemperamentSummary)}</p></section>` : ""}
        ${traits.length ? `<section class="davy-locker-record-section"><h3>Observed Traits</h3><ul>${traits.map((trait) => `<li>${escapeHtml(trait)}</li>`).join("")}</ul></section>` : ""}
        <footer class="davy-locker-item-purchase">
          <span>${species.cost} coins</span>
          <button type="button" data-davy-buy-fish="${escapeHtml(species.id)}" data-davy-variant-key="${escapeHtml(selected.key)}">ACQUIRE</button>
        </footer>
      </div>
    </div>
  </section>`;
}

function renderDavyJonesLockerInventory() {
  const container = dom.davyJonesLockerPage?.querySelector?.("[data-davy-inventory]");
  if (!container) return;
  const mutations = (runtime.fishCatalog || [])
    .filter((species) => isDavyMutationSpecies(species))
    .sort((left, right) => (Number(left?.cost) || 0) - (Number(right?.cost) || 0));
  runtime.davyLockerVariantSelections ||= {};

  const openSpecies = runtime.davyLockerItemSpeciesId
    ? mutations.find((species) => species.id === runtime.davyLockerItemSpeciesId)
    : null;
  if (openSpecies) {
    setMarkupIfChanged("davy-locker-inventory", container, renderDavyJonesLockerItemPage(openSpecies));
    return;
  }

  const markup = mutations.map((species) => {
    const variants = getFishStoreVariants(species);
    if (!variants.length) return "";
    const selectedKey = variants.some((variant) => variant.key === runtime.davyLockerVariantSelections[species.id])
      ? runtime.davyLockerVariantSelections[species.id]
      : variants[0].key;
    const selected = variants.find((variant) => variant.key === selectedKey) || variants[0];
    runtime.davyLockerVariantSelections[species.id] = selected.key;
    return `<article class="davy-locker-card" data-davy-species="${escapeHtml(species.id)}">
      <button type="button" class="davy-locker-photo davy-locker-photo-button" data-davy-open-item="${escapeHtml(species.id)}" aria-label="Open ${escapeHtml(species.name)} specimen record">${renderDavyJonesLockerSpecimenStage(species, selected)}</button>
      <div class="davy-locker-copy"><span>UNLISTED SPECIMEN</span><button type="button" class="davy-locker-name-button" data-davy-open-item="${escapeHtml(species.id)}">${escapeHtml(species.name)}</button><small>origin: REDACTED</small></div>
      ${renderDavyJonesLockerVariantButtons(species, variants, selected)}
      <footer><span>${species.cost} coins</span><button type="button" data-davy-buy-fish="${escapeHtml(species.id)}" data-davy-variant-key="${escapeHtml(selected.key)}">ACQUIRE</button></footer>
    </article>`;
  }).join("");
  setMarkupIfChanged("davy-locker-inventory", container, markup || `<div class="davy-locker-empty">NO INVENTORY</div>`);
}

async function handleDavyJonesLockerPageClick(event) {
  const backButton = event.target instanceof Element ? event.target.closest("[data-davy-back-to-catalogue]") : null;
  if (backButton) {
    runtime.davyLockerItemSpeciesId = "";
    renderDavyJonesLockerInventory();
    return;
  }

  const openItemButton = event.target instanceof Element ? event.target.closest("[data-davy-open-item]") : null;
  if (openItemButton) {
    runtime.davyLockerItemSpeciesId = openItemButton.dataset.davyOpenItem || "";
    renderDavyJonesLockerInventory();
    dom.davyJonesLockerPage?.scrollTo?.({ top: 0, behavior: "smooth" });
    return;
  }

  const variantButton = event.target instanceof Element ? event.target.closest("[data-davy-select-variant]") : null;
  if (variantButton) {
    const speciesId = variantButton.dataset.davySpeciesId || "";
    const variantKey = variantButton.dataset.davySelectVariant || "";
    runtime.davyLockerVariantSelections ||= {};
    runtime.davyLockerVariantSelections[speciesId] = variantKey;
    renderDavyJonesLockerInventory();
    return;
  }
  const buyButton = event.target instanceof Element ? event.target.closest("[data-davy-buy-fish]") : null;
  if (!buyButton || buyButton.disabled) return;
  buyButton.disabled = true;
  const result = await buyFish(buyButton.dataset.davyBuyFish || "", {
    appearanceVariantKey: buyButton.dataset.davyVariantKey || "",
    purchaseSource: "davyjoneslocker"
  });
  if (!result?.ok) buyButton.disabled = false;
  renderDavyJonesLockerInventory();
}

function renderStoreOverlay() {
  syncWebSurfThemePresentation();
  const showingHome = runtime.webHomeOpen === true;
  const showingBank = runtime.bubbleBankOpen === true;
  const showingLocker = runtime.davyJonesLockerOpen === true;
  const showingDesigner = runtime.proteusDesignerOpen === true;
  const showingSettings = runtime.settingsOverlayOpen === true;
  const showingBodegaHome = runtime.bubbleBodegaHomeOpen === true
    && !showingHome && !showingBank && !showingLocker && !showingDesigner && !showingSettings;
  const davyLockerTab = dom.storeOverlay?.querySelector('.webpage-tab[data-webpage-destination="locker"]');
  if (davyLockerTab) davyLockerTab.hidden = runtime.davyJonesLockerTabOpen !== true;
  if (dom.webSurfSettingsTab) dom.webSurfSettingsTab.hidden = runtime.webSurfSettingsTabOpen !== true;
  ensureWebSurfSettingsPageMounted();
  const allowedTabs = getTutorialAllowedStoreTabs();
  if (runtime.storeOverlayOpen && !showingBank && !showingDesigner && !showingSettings && allowedTabs && !allowedTabs.has(runtime.storeTab)) {
    runtime.storeTab = getTutorialPreferredStoreTab() || [...allowedTabs][0] || runtime.storeTab;
  }
  const showingFood = runtime.storeTab === "food";
  const showingPharmacy = runtime.storeTab === "pharmacy";
  const showingFish = runtime.storeTab === "fish";
  const showingDecor = runtime.storeTab === "decor";
  const showingEquipment = runtime.storeTab === "equipment";
  const bubbleBodegaSearchView = window.getBubbleBodegaSearchView?.();
  const searchOwnsBubbleBodegaCatalog = Boolean(
    runtime.storeOverlayOpen
    && !showingHome
    && !showingBodegaHome
    && !showingBank
    && !showingLocker
    && !showingDesigner
    && !showingSettings
    && (bubbleBodegaSearchView?.active === true || bubbleBodegaSearchView?.allCategories === true)
  );
  const categoryTabOwnsBubbleBodegaCatalog = bubbleBodegaSearchView?.allCategories !== true;
  // Home is a destination inside the store, not a category. Keep the last
  // browsed category in runtime.storeTab for when the shopper leaves Home, but
  // never expose it as selected in the store chrome.
  const categoryTabOwnsHomeCatalog = categoryTabOwnsBubbleBodegaCatalog && !showingBodegaHome;
  const foodTabSelected = categoryTabOwnsHomeCatalog && showingFood;
  const pharmacyTabSelected = categoryTabOwnsHomeCatalog && showingPharmacy;
  const fishTabSelected = categoryTabOwnsHomeCatalog && showingFish;
  const decorTabSelected = categoryTabOwnsHomeCatalog && showingDecor;
  const equipmentTabSelected = categoryTabOwnsHomeCatalog && showingEquipment;

  dom.storeOverlay.hidden = !runtime.storeOverlayOpen;
  dom.storeOverlay.classList.toggle("is-open", runtime.storeOverlayOpen);
  dom.storeOverlay.classList.toggle("is-web-home-open", runtime.storeOverlayOpen && showingHome);
  dom.storeOverlay.classList.toggle("is-bubblebodega-home-open", runtime.storeOverlayOpen && showingBodegaHome);
  dom.storeOverlay.classList.toggle("is-bubble-bank-open", runtime.storeOverlayOpen && showingBank);
  dom.storeOverlay.classList.toggle("is-davy-jones-locker-open", runtime.storeOverlayOpen && showingLocker);
  dom.storeOverlay.classList.toggle("is-proteus-designer-open", runtime.storeOverlayOpen && showingDesigner);
  dom.storeOverlay.classList.toggle("is-web-settings-open", runtime.storeOverlayOpen && showingSettings);
  dom.storeOverlay.setAttribute("aria-label", showingSettings ? "Bubble Borough Settings" : showingDesigner ? "Proteus Biodyne Specimen Designer" : showingHome ? "Browser Home" : showingBodegaHome ? "BubbleBodega Home" : showingBank ? "Bubble Borough Bank" : showingLocker ? "Davy Jones' Locker" : "BubbleBodega Store");
  if (dom.webHomePage) {
    dom.webHomePage.hidden = !runtime.storeOverlayOpen || !showingHome;
    syncWebSurfUnreadBadge();
    if (runtime.storeOverlayOpen && showingHome) {
      setMarkupIfChanged("websurf-home-page", dom.webHomePage, renderWebSurfHomePage());
      window.syncProteusDiscovery?.();
    }
  }
  if (dom.bubbleBodegaHomePage) {
    dom.bubbleBodegaHomePage.hidden = !runtime.storeOverlayOpen || !showingBodegaHome;
    if (runtime.storeOverlayOpen && showingBodegaHome) {
      setMarkupIfChanged("bubblebodega-home-page", dom.bubbleBodegaHomePage, renderBubbleBodegaHomePage());
      window.dispatchEvent(new CustomEvent("bubbleborough:bodega-home-state", { detail: { open: true } }));
    }
  }
  if (dom.bubbleBankPage) {
    dom.bubbleBankPage.hidden = !runtime.storeOverlayOpen || !showingBank;
    if (runtime.storeOverlayOpen && showingBank) {
      setMarkupIfChanged("bubble-bank-page", dom.bubbleBankPage, renderBubbleBankPage());
    }
  }
  if (dom.davyJonesLockerPage) {
    dom.davyJonesLockerPage.hidden = !runtime.storeOverlayOpen || !showingLocker;
    if (runtime.storeOverlayOpen && showingLocker) renderDavyJonesLockerInventory();
  }
  const designerRoute = document.getElementById("proteusDesignerRoute");
  if (designerRoute) {
    designerRoute.hidden = !runtime.storeOverlayOpen || !showingDesigner;
    if (runtime.storeOverlayOpen && showingDesigner) {
      dom.storeOverlay.classList.remove("proteus-biodyne-open");
      const proteusPage = document.getElementById("proteusBiodynePage");
      if (proteusPage) proteusPage.hidden = true;
      renderProteusDesignerPage();
    }
  }

  dom.storeFoodTab?.classList.toggle("is-active", foodTabSelected);
  dom.storePharmacyTab?.classList.toggle("is-active", pharmacyTabSelected);
  dom.storeFishTab.classList.toggle("is-active", fishTabSelected);
  dom.storeDecorTab.classList.toggle("is-active", decorTabSelected);
  dom.storeEquipmentTab?.classList.toggle("is-active", equipmentTabSelected);
  dom.storeFoodTab?.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("food"));
  dom.storePharmacyTab?.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("pharmacy"));
  dom.storeFishTab.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("fish"));
  dom.storeDecorTab.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("decor"));
  dom.storeEquipmentTab?.classList.toggle("is-tutorial-hidden", Boolean(allowedTabs) && !allowedTabs.has("equipment"));

  dom.storeFoodTab?.setAttribute("aria-selected", String(foodTabSelected));
  dom.storePharmacyTab?.setAttribute("aria-selected", String(pharmacyTabSelected));
  dom.storeFishTab.setAttribute("aria-selected", String(fishTabSelected));
  dom.storeDecorTab.setAttribute("aria-selected", String(decorTabSelected));
  dom.storeEquipmentTab?.setAttribute("aria-selected", String(equipmentTabSelected));

  // The BubbleBodega shell owns its catalogue filtering. Keep it in lockstep with
  // gameplay changes such as a tutorial advancing from Fish to Decor; merely
  // changing the selected tab otherwise leaves the old catalogue on screen.
  if (!searchOwnsBubbleBodegaCatalog && runtime.storeOverlayOpen && !showingHome && !showingBodegaHome && !showingBank && !showingLocker && !showingDesigner && !showingSettings && dom.storeOverlay.dataset.tankazonCategory !== runtime.storeTab) {
    dom.storeOverlay.dataset.tankazonCategory = runtime.storeTab;
    window.dispatchEvent(new CustomEvent("bubbleborough:store-tab", {
      detail: { category: runtime.storeTab }
    }));
  }

  if (dom.storeCoinCounter) {
    const currentCoins = formatStoreCoinCounterValue(state.coins);
    dom.storeCoinCounter.innerHTML = `
      ${buildCoinIconMarkup("store-coin-icon store-coin-counter-icon", { decorative: true })}
      <span class="store-coin-counter-value">${escapeHtml(currentCoins)}</span>
    `;
    dom.storeCoinCounter.setAttribute("aria-label", `Current coins: ${currentCoins}`);
  }

  if (!searchOwnsBubbleBodegaCatalog) {
    if (dom.foodShop) {
      dom.foodShop.hidden = !runtime.storeOverlayOpen || showingHome || showingBodegaHome || showingBank || showingLocker || showingDesigner || showingSettings || !showingFood;
    }
    if (dom.pharmacyShop) {
      dom.pharmacyShop.hidden = !runtime.storeOverlayOpen || showingHome || showingBodegaHome || showingBank || showingLocker || showingDesigner || showingSettings || !showingPharmacy;
    }
    dom.fishShop.hidden = !runtime.storeOverlayOpen || showingHome || showingBodegaHome || showingBank || showingLocker || showingDesigner || showingSettings || !showingFish;
    dom.decorShop.hidden = !runtime.storeOverlayOpen || showingHome || showingBodegaHome || showingBank || showingLocker || showingDesigner || showingSettings || !showingDecor;
    if (dom.equipmentShop) {
      dom.equipmentShop.hidden = !runtime.storeOverlayOpen || showingHome || showingBodegaHome || showingBank || showingLocker || showingDesigner || showingSettings || !showingEquipment;
    }
  }
  const showingProteus = dom.storeOverlay.classList.contains("proteus-biodyne-open");
  const fallbackStandardWebPage = showingProteus ? "proteus" : showingHome ? "home" : showingBank ? "bank" : "store";
  const activeStandardWebPage = showingLocker ? "locker" : fallbackStandardWebPage;
  const activeWebPage = showingSettings ? "settings" : showingDesigner ? "designer" : activeStandardWebPage;
  window.syncWebPageTabs?.(activeWebPage);
  if (!runtime.storeOverlayOpen) window.resetOptionalWebPageTabs?.();
  syncWallpaperEngineStoreScrollControls();
  window.requestAnimationFrame(() => {
    syncWebSurfSiteChrome(activeStandardWebPage);
    // WebSurf can switch back to BubbleBodega while the outer store overlay is
    // already open (for example from Home or BB Bank). In that path the
    // BubbleBodega hidden-attribute observer never fires. Its virtual catalogue
    // may therefore have measured a zero-height viewport while hidden and kept
    // an empty mounted slice until the shopper scrolls or changes categories.
    // Reconcile virtualization after the store route is visible so opening the
    // Bodega always paints products immediately.
    if (activeStandardWebPage === "store" && runtime.storeOverlayOpen && !showingBodegaHome && !showingSettings && !showingDesigner) {
      window.refreshBubbleBodegaVirtualCatalog?.({ sync: true });
      window.requestAnimationFrame(() => window.refreshBubbleBodegaVirtualCatalog?.({ sync: true }));
    }
  });
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
  closeStoreBeforePrimaryViewChange();
  clearPrimaryToolModes();
  runtime.boroughOverviewOpen = true;
  runtime.aquariumExpansionMode = true;
  runtime.boroughOverviewFishRenderedAt = 0;
  renderAquariumOverview();
}

function finishBoroughOverviewEditing() {
  const wasEditing = runtime.boroughOverviewEditMode === true;
  runtime.boroughOverviewEditMode = false;
  runtime.boroughOverviewDraggedTankId = null;
  runtime.boroughOverviewDragPointerId = null;
  runtime.editingTankNameId = null;
  runtime.editingTankNameValue = "";
  dom.boroughGrid?.querySelectorAll(".is-dragging, .is-drop-target").forEach((element) => {
    element.classList.remove("is-dragging", "is-drop-target");
    element.setAttribute("aria-grabbed", "false");
  });
  return wasEditing;
}

function closeAquariumOverview() {
  finishBoroughOverviewEditing();
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
  const tankId = String(tank?.id || "");
  const machinery = tankId && typeof getMachineryForTank === "function"
    ? getMachineryForTank(tankId)
    : [];
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
    gravelHillSeed: tank?.gravelHillSeed,
    gravelLivePebbles: tank?.gravelLivePebbles,
    poops: tank?.poops,
    lastCleanedAt: tank?.lastCleanedAt,
    selectedTankAsset: tank?.selectedTankAsset,
    fish: (tank?.fish || []).map((fish) => [
      fish.id, fish.speciesId, fish.scale, fish.tankLayer, fish.appearanceVariantKey, fish.deadAt, fish.isDead
    ]),
    machinery: machinery.map((item) => [
      item.id, item.type, item.scale, item.tankLayer,
      item.appearanceVariantKey, item.machineryColor, item.machineryColorize
    ]),
    placedDecor: (tank?.placedDecor || []).map((item) => [
      item.id, item.decorKey, item.xNorm, item.yNorm, item.scale, item.tankLayer, item.flipped, item.flippedY,
      item.decorSettings, item.caveColorSettings
    ])
  });
}

function invalidateBoroughOverviewSnapshot(tankOrId = getCurrentTank()) {
  const tankId = typeof tankOrId === "string" ? tankOrId : String(tankOrId?.id || "");
  if (!tankId || !runtime?.boroughOverviewSnapshotCache) return false;
  runtime.boroughOverviewSnapshotCache.delete(tankId);
  const queue = Array.isArray(runtime.boroughOverviewSnapshotQueue) ? runtime.boroughOverviewSnapshotQueue : [];
  runtime.boroughOverviewSnapshotQueue = [tankId, ...queue.filter((queuedId) => queuedId !== tankId)];
  runtime.boroughOverviewSnapshotRenderedAt = 0;
  runtime.boroughOverviewFishRenderedAt = 0;
  return true;
}

function pruneStaleBoroughOverviewSnapshots(tanks = getAllTanks()) {
  if (runtime.debugSnapshotCacheFrozen || !runtime?.boroughOverviewSnapshotCache) return 0;
  const staleIds = [];
  for (const tank of tanks) {
    const cached = runtime.boroughOverviewSnapshotCache.get(tank.id);
    if (cached?.canvas && cached.signature !== getBoroughSnapshotSignature(tank)) {
      runtime.boroughOverviewSnapshotCache.delete(tank.id);
      staleIds.push(tank.id);
    }
  }
  if (staleIds.length) {
    const staleSet = new Set(staleIds);
    const queue = Array.isArray(runtime.boroughOverviewSnapshotQueue) ? runtime.boroughOverviewSnapshotQueue : [];
    runtime.boroughOverviewSnapshotQueue = [...staleIds, ...queue.filter((tankId) => !staleSet.has(tankId))];
    runtime.boroughOverviewSnapshotRenderedAt = 0;
    runtime.boroughOverviewFishRenderedAt = 0;
  }
  return staleIds.length;
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
  const previousCleaningTransition = runtime.cleaningTransition;
  withActiveTank(tank.id, () => {
    tank.fish = [];
    runtime.cleaningTransition = null;
    try {
      renderTank(now);
      const context = canvas.getContext("2d", { alpha: false });
      paintBoroughSnapshotBackground(context, tank, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low";
      context.drawImage(dom.tankCanvas, 0, 0, canvas.width, canvas.height);
      // The live grime canvas is kept at full-strength pixels and faded with CSS opacity.
      // Canvas-to-canvas snapshots do not inherit that CSS opacity, so apply the same
      // visible dirtiness here or clean tanks appear permanently filthy in Overview.
      const snapshotGrimeOpacity = getVisibleGrimeDirtiness(getTankDirtiness(now));
      if (snapshotGrimeOpacity > 0.002) {
        context.save();
        context.globalAlpha = snapshotGrimeOpacity;
        context.drawImage(dom.grimeCanvas, 0, 0, canvas.width, canvas.height);
        context.restore();
      }
      context.drawImage(dom.glassCanvas, 0, 0, canvas.width, canvas.height);
    } finally {
      tank.fish = previousFish;
      runtime.cleaningTransition = previousCleaningTransition;
    }
  });
  const entry = { signature, canvas, capturedAt: now, changed: true };
  runtime.boroughOverviewSnapshotCache.set(tank.id, entry);
  return entry;
}

function paintBoroughSnapshots(tanks, now = Date.now(), options = {}) {
  const captureAll = options.captureAll === true;
  let renderedTank = false;
  for (const tank of tanks) {
    const snapshot = captureAll
      ? getBoroughSnapshot(tank, now)
      : runtime.boroughOverviewSnapshotCache.get(tank.id);
    if (!snapshot?.canvas) continue;
    renderedTank = renderedTank || Boolean(snapshot.changed);
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
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "low";
    context.drawImage(snapshot.canvas, 0, 0, width, height);
    target.classList.add("is-ready");
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
  return { tanks, livingFish, hungryFish, sickFish, averageCleanliness };
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
  return `
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
  pruneStaleBoroughOverviewSnapshots(tanks);
  const expansionSpaces = getValidAquariumExpansionSpaces();
  const editMode = runtime.boroughOverviewEditMode === true;
  const syntheticCount = isDebugModeEnabled() ? Math.max(0, Number(runtime.debugOverviewSyntheticCount) || 0) : 0;
  const syntheticColumns = Math.max(1, Math.ceil(Math.sqrt(syntheticCount)));
  let cells = syntheticCount > 0
    ? Array.from({ length: syntheticCount }, (_, index) => ({ id: `debug-preview-${index}`, gridX: index % syntheticColumns, gridY: Math.floor(index / syntheticColumns), cellType: "debug-preview", debugIndex: index + 1 }))
    : tanks.map((tank) => ({ ...tank, cellType: "section" }));
  let editFrame = null;
  if (!syntheticCount && editMode) {
    const occupied = new Set(cells.map((cell) => `${cell.gridX}:${cell.gridY}`));
    const tankXs = tanks.map((tank) => tank.gridX);
    const tankYs = tanks.map((tank) => tank.gridY);
    const occupiedMinX = Math.min(...tankXs);
    const occupiedMaxX = Math.max(...tankXs);
    const occupiedMinY = Math.min(...tankYs);
    const occupiedMaxY = Math.max(...tankYs);
    const expansionTarget = expansionSpaces[0] || null;

    let frameMinX = Math.min(occupiedMinX, Number.isInteger(expansionTarget?.gridX) ? expansionTarget.gridX : occupiedMinX);
    let frameMaxX = Math.max(occupiedMaxX, Number.isInteger(expansionTarget?.gridX) ? expansionTarget.gridX : occupiedMaxX);
    let frameMinY = Math.min(occupiedMinY, Number.isInteger(expansionTarget?.gridY) ? expansionTarget.gridY : occupiedMinY);
    let frameMaxY = Math.max(occupiedMaxY, Number.isInteger(expansionTarget?.gridY) ? expansionTarget.gridY : occupiedMaxY);

    while (frameMaxX - frameMinX + 1 < 5) frameMaxX += 1;
    while (frameMaxY - frameMinY + 1 < 3) frameMaxY += 1;
    if (frameMaxX - frameMinX + 1 > 5) frameMinX = frameMaxX - 4;
    if (frameMaxY - frameMinY + 1 > 3) frameMinY = frameMaxY - 2;
    editFrame = { minX: frameMinX, maxX: frameMinX + 4, minY: frameMinY, maxY: frameMinY + 2 };

    for (let gridY = editFrame.minY; gridY <= editFrame.maxY; gridY += 1) {
      for (let gridX = editFrame.minX; gridX <= editFrame.maxX; gridX += 1) {
        if (!occupied.has(`${gridX}:${gridY}`) && tanks.some((moving) => fitsBoroughTankGrid(tanks.map((tank) => tank.id === moving.id ? { gridX, gridY } : tank)))) {
          cells.push({ gridX, gridY, cellType: "drop" });
        }
      }
    }
  }
  const minX = editFrame?.minX ?? Math.min(...cells.map((cell) => cell.gridX));
  const maxX = editFrame?.maxX ?? Math.max(...cells.map((cell) => cell.gridX));
  const minY = editFrame?.minY ?? Math.min(...cells.map((cell) => cell.gridY));
  const maxY = editFrame?.maxY ?? Math.max(...cells.map((cell) => cell.gridY));
  const columnCount = Math.min(5, maxX - minX + 1);
  const rowCount = Math.min(3, maxY - minY + 1);
  const expansionCost = getAquariumExpansionCost();
  const overviewSummary = getBoroughOverviewSummary(Date.now());
  dom.boroughGrid.style.setProperty("--borough-columns", String(columnCount));
  dom.boroughGrid.style.setProperty("--borough-rows", String(rowCount));
  dom.boroughGrid.classList.toggle("is-editing", editMode);
  dom.boroughOverview?.querySelector(".borough-overview-body")?.classList.toggle("is-editing", editMode);
  if (dom.boroughOverviewInfo) dom.boroughOverviewInfo.hidden = true;
  dom.toggleBoroughEditMode?.setAttribute("aria-pressed", String(editMode));
  if (dom.toggleBoroughEditMode) dom.toggleBoroughEditMode.querySelector("small").textContent = editMode ? "Done" : "Edit";
  if (dom.addBoroughTankButton) {
    dom.addBoroughTankButton.hidden = !editMode;
    dom.addBoroughTankButton.disabled = !expansionSpaces.length || state.coins < expansionCost;
    dom.addBoroughTankButton.querySelector("small").textContent = expansionSpaces.length ? `Add Tank · ${expansionCost} coins` : "Borough full · 15 tanks max";
  }
  const layoutOverride = isDebugModeEnabled() ? String(runtime.debugOverviewLayoutMode || "auto") : "auto";
  dom.boroughGrid.classList.toggle("is-compact", layoutOverride === "compact" || layoutOverride === "micro" || (layoutOverride === "auto" && Math.max(columnCount, rowCount) >= 6));
  dom.boroughGrid.classList.toggle("is-micro", layoutOverride === "micro" || (layoutOverride === "auto" && Math.max(columnCount, rowCount) >= 10));
  dom.boroughOverviewTitle.textContent = "Borough Overview";
  dom.boroughOverviewHint.textContent = editMode
    ? "Drag tanks to rearrange them. Maximum 3 rows × 5 columns (15 tanks)."
    : "Click a tank to visit. Use Edit to expand or rearrange your borough.";
  if (dom.boroughOverviewStatus) {
    setMarkupIfChanged("borough-overview-status", dom.boroughOverviewStatus, `
      <span><strong>${overviewSummary.tanks.length} / 15</strong> tanks</span>
      <span><strong>${overviewSummary.livingFish.length}</strong> fish</span>
      <span><strong>${overviewSummary.averageCleanliness}%</strong> average clean</span>
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
    const canSell = tanks.length > 1;
    const sellTitle = tanks.length <= 1
      ? "You need to keep at least one tank"
      : `Sell ${getTankLabel(cell)} for ${resaleValue} coins. Fish, decor, and equipment will return to storage.`;
    const rightNeighbor = getAquariumSectionAt(cell.gridX + 1, cell.gridY);
    const wallBlocked = rightNeighbor ? isBoroughTravelWallBlocked(cell, rightNeighbor) : false;
    const wallMarkup = rightNeighbor
      ? `<button class="borough-travel-wall${wallBlocked ? " is-blocked" : ""}" type="button" data-toggle-travel-wall="${escapeHtml(cell.id)}" data-toggle-travel-wall-neighbor="${escapeHtml(rightNeighbor.id)}" aria-pressed="${wallBlocked}" aria-label="${wallBlocked ? "Allow" : "Block"} swimming between ${escapeHtml(getTankLabel(cell))} and ${escapeHtml(getTankLabel(rightNeighbor))}" title="${wallBlocked ? "Open" : "Close"} fish travel between these tanks">|</button>`
      : "";
    const nameMarkup = editing
      ? `<span class="borough-name-editor"><input type="text" maxlength="36" value="${escapeHtml(runtime.editingTankNameValue)}" data-borough-name-input="${escapeHtml(cell.id)}" aria-label="Neighborhood name"><button type="button" data-save-borough-name="${escapeHtml(cell.id)}">Save</button><button type="button" data-cancel-borough-name>Cancel</button></span>`
      : `<strong>${escapeHtml(getTankLabel(cell))}</strong>${editMode ? `<button class="borough-rename-button" type="button" data-rename-borough="${escapeHtml(cell.id)}" aria-label="Rename ${escapeHtml(getTankLabel(cell))}">&#9998;</button><button class="borough-sell-button" type="button" data-sell-borough-tank="${escapeHtml(cell.id)}" ${canSell ? "" : "disabled"} aria-label="Sell ${escapeHtml(getTankLabel(cell))} for ${resaleValue} coins" title="${escapeHtml(sellTitle)}"><span aria-hidden="true">&#128465;</span><small>${resaleValue}</small></button>` : ""}`;
    const infoSelected = false;
    return `<article class="borough-grid-cell borough-section-cell${active ? " is-active" : ""}${infoSelected ? " is-info-selected" : ""}" role="gridcell" draggable="false" style="grid-column:${column};grid-row:${row}" data-borough-section="${escapeHtml(cell.id)}" data-borough-grid-x="${cell.gridX}" data-borough-grid-y="${cell.gridY}"><span class="borough-preview-shell"><button class="borough-section-preview" type="button" data-visit-section="${escapeHtml(cell.id)}" aria-label="Visit ${escapeHtml(getTankLabel(cell))}"><canvas class="borough-cell-snapshot-canvas" data-borough-snapshot-tank-id="${escapeHtml(cell.id)}" aria-hidden="true"></canvas><canvas class="borough-cell-fish-canvas" data-borough-fish-tank-id="${escapeHtml(cell.id)}" aria-hidden="true"></canvas></button>${wallMarkup}</span><span class="borough-cell-copy"><span class="borough-cell-name">${nameMarkup}</span><span class="borough-cell-stats">${fishCount} fish · ${escapeHtml(identity.label)}</span>${serviceMarkup}</span></article>`;
  }).join("");
  setMarkupIfChanged("borough-grid", dom.boroughGrid, markup);
  if (!syntheticCount) {
    // Capture fresh static tank snapshots exactly when Overview opens or is rebuilt.
    // After that, the background image stays still while only the overview fish layer animates.
    paintBoroughSnapshots(tanks, Date.now(), { captureAll: true });
  }
  runtime.boroughOverviewFishRenderedAt = 0;
  if (!syntheticCount) {
    renderBoroughOverviewFish(Date.now(), { force: true });
  }
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

function getBoroughOverviewDeadFishPosition(fish, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const corpseRender = typeof getDeadFishCorpseRenderState === "function"
    ? getDeadFishCorpseRenderState(fish, now, species)
    : null;
  const renderOffsetXNorm = Number.isFinite(Number(corpseRender?.renderOffsetXNorm))
    ? Number(corpseRender.renderOffsetXNorm)
    : 0;
  const renderOffsetYNorm = Number.isFinite(Number(corpseRender?.renderOffsetYNorm))
    ? Number(corpseRender.renderOffsetYNorm)
    : 0;

  // Phase 19: the Borough renderer consumes the exact same normalized corpse
  // render offsets as the full aquarium. The fish's authoritative coordinates,
  // depth, corpse stage, and movement state remain untouched during the swap.
  return {
    xNorm: clamp((Number(fish?.xNorm) || 0.5) + renderOffsetXNorm, 0.02, 0.98),
    yNorm: clamp((Number(fish?.yNorm) || 0.5) + renderOffsetYNorm, 0.02, 0.98),
    direction: getFishFacingDirection(fish),
    tilt: Number.isFinite(Number(corpseRender?.tilt)) ? Number(corpseRender.tilt) : Math.PI,
    stage: corpseRender?.stage || fish?.corpseStage || "surface",
    tankLayer: typeof getFishTankLayer === "function" ? getFishTankLayer(fish) : fish?.tankLayer,
    tankSubLayer: typeof getFishTankSubLayer === "function" ? getFishTankSubLayer(fish) : fish?.tankSubLayer,
    isDead: true
  };
}

function getBoroughOverviewFishRenderImage(fish, species, now = Date.now()) {
  const imagePath = getFishDisplayAssetPath(fish, species, now);
  if (!imagePath) return { imagePath: null, image: null, usingSmallFish: false };
  const smallImage = typeof getBoroughOverviewSmallFishImage === "function"
    ? getBoroughOverviewSmallFishImage(imagePath)
    : null;
  if (smallImage) return { imagePath, image: smallImage, usingSmallFish: true };
  const fallback = runtime.images.get(imagePath) || null;
  if (!fallback && typeof requestRuntimeImageRecovery === "function") {
    requestRuntimeImageRecovery(imagePath, { kind: "borough-fish", id: fish?.id, speciesId: species?.id });
  }
  return { imagePath, image: fallback, usingSmallFish: false };
}

function renderBoroughOverviewFish(now = Date.now(), options = {}) {
  if (!runtime.boroughOverviewOpen || !dom.boroughGrid) {
    return false;
  }
  const force = options.force === true;
  if (!force && now - (Number(runtime.boroughOverviewFishRenderedAt) || 0) < BOROUGH_OVERVIEW_FISH_FRAME_MS) {
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
    const fishList = Array.isArray(tank?.fish) ? tank.fish : [];
    const fishSize = clamp(Math.min(width, height) * (fishList.length > 35 ? 0.035 : 0.055), 3, 14);
    for (const fish of fishList) {
      const dead = isFishDead(fish);
      const position = dead
        ? getBoroughOverviewDeadFishPosition(fish, now)
        : getBoroughOverviewFishPosition(fish, now);
      const x = 5 + position.xNorm * Math.max(1, width - 10);
      const y = 5 + position.yNorm * Math.max(1, height - 10);
      const direction = position.direction < 0 ? -1 : 1;
      context.save();
      context.translate(x, y);
      context.scale(direction, 1);
      if (dead) context.rotate(Number(position.tilt) || Math.PI);
      const depthLayer = getFishTankLayer(fish);
      context.globalAlpha = 0.9 * getTankDepthObjectAlpha(depthLayer);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low";
      const species = getSpeciesForFish(fish);
      if (dead) {
        // Phase 20: the Borough fallback and compact-sprite paths use the same
        // corpse wash as the full aquarium. This prevents a missing miniature
        // asset from turning a corpse back into a bright living-colored marker.
        context.filter = getFishCanvasFilter(fish, getFishHealthRatio(fish, species), now);
      }
      const renderAsset = getBoroughOverviewFishRenderImage(fish, species, now);
      const image = renderAsset.image;
      if (image?.complete && image.naturalWidth) {
        const depthImage = getTankDepthTreatedImage(image, depthLayer) || image;
        const aspect = depthImage.width / Math.max(1, depthImage.height);
        const fishDrawX = -fishSize * aspect;
        const drawWidth = fishSize * aspect * 2;
        const drawHeight = fishSize * 2;
        context.drawImage(depthImage, fishDrawX, -fishSize, drawWidth, drawHeight);
        context.filter = "none";
        if (dead && typeof drawDeadFishEyeTreatment === "function") {
          // The optional eye detector uses normalized coordinates from the
          // original fish art, so it can be reused on the compact atlas crop.
          drawDeadFishEyeTreatment(context, fish, renderAsset.imagePath, fishDrawX, drawWidth, drawHeight, now);
        }
      } else {
        context.fillStyle = getBoroughOverviewFishColor(fish);
        context.globalAlpha *= dead ? 0.55 : 1;
        context.beginPath();
        context.ellipse(0, 0, fishSize * 1.45, fishSize * 0.72, 0, 0, Math.PI * 2);
        context.fill();
        context.filter = "none";
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

function renderFoodAndMedImage(kind, id, alt, className = "shop-thumb", imageOverride = "") {
  const { imagePath, fallbackPath } = getFoodAndMedArt(kind, id);
  const resolvedImagePath = imageOverride
    ? resolveFoodAndMedAssetPath(imageOverride)
    : imagePath;
  return `<img class="${className}" ${assetImageAttributes(resolvedImagePath)} alt="${alt}" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','${fallbackPath}')" />`;
}

function renderFoodBodegaThumbnail(food, packageMeta, alt = "") {
  const servings = Math.max(0, Math.floor(Number(packageMeta?.servings) || 0));
  const label = alt || food?.name || "Food";
  return `
    <div class="shop-food-thumb-wrap" data-food-id="${escapeHtml(food?.id || "")}" data-food-package="${escapeHtml(packageMeta?.id || "")}" data-food-qty="${servings}">
      ${renderFoodAndMedImage("food", food?.id || "", label, "shop-thumb", packageMeta?.image || "")}
      <span class="shop-food-qty-badge" aria-label="Quantity ${servings}">Qty ${servings}</span>
    </div>
  `;
}

function renderTankProductImage(tankTypeId, alt, className = "shop-thumb") {
  const imagePath = getTankProductImagePath(tankTypeId);
  const fallbackPath = getTankProductImageFallback(tankTypeId);
  return `<img class="${className}" ${assetImageAttributes(imagePath)} alt="${alt}" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','${fallbackPath}')" />`;
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
      ? `<img class="${className}" ${assetImageAttributes(dataUrl)} alt="${escapeHtml(background.name)}" />`
      : "";
  }

  return `<img class="${className}" ${assetImageAttributes(background.path)} alt="${escapeHtml(background.name)}" />`;
}

function renderFoodStoreCard(food, packageMeta) {
  const count = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
  const purchaseCost = getFoodPurchaseCost(food.id, packageMeta.id);
  const productName = getFoodPackageOptions(food).length > 1 ? `${food.name} - ${packageMeta.name}` : food.name;
  const ownedUnit = food.id === "halloweenCandy" ? "candies" : "servings";
  const buyLabel = food.id === "halloweenCandy" ? "Buy Pile"
    : packageMeta.name.startsWith("Large") ? "Buy Bucket" : `Buy ${packageMeta.name}`;
  return `
    <article class="shop-card" data-food-package-card="${escapeHtml(packageMeta.id)}" ${renderStoreFacetAttributes("food", food)}>
      ${renderFoodBodegaThumbnail(food, packageMeta, productName)}
      <div class="shop-meta shop-card-main">
        <div>
          <strong>${escapeHtml(productName)}</strong>
          <div class="fish-meta">${escapeHtml(packageMeta.description || food.description)}</div>
          <div class="fish-meta">${packageMeta.servings} ${ownedUnit} per purchase</div>
        </div>
        <div class="fish-meta">${count} ${ownedUnit} owned</div>
      </div>
      <div class="shop-meta">
        <span class="price-tag">${purchaseCost === 0 ? "Free" : `${purchaseCost} ${pluralize("coin", purchaseCost)}`}</span>
        <button class="buy-button" data-buy-food="${escapeHtml(food.id)}" data-food-package="${escapeHtml(packageMeta.id)}" data-food-servings="${packageMeta.servings}" data-list-price="${packageMeta.cost}">
          ${escapeHtml(buyLabel)} (+${packageMeta.servings})
        </button>
      </div>
    </article>`;
}

function renderFoodShop() {
  if (!dom.foodShop) {
    return;
  }

  const allCatalog = getFoodCatalog().filter((food) => shouldShowFoodInStore(food));
  const inTankEnabled = typeof isFoodInTankFilterEnabled === "function" ? isFoodInTankFilterEnabled() : true;
  const activeTank = getCurrentTank();
  const livingCreatures = typeof getActiveTankFeedingCreatures === "function" ? getActiveTankFeedingCreatures(activeTank) : [];
  const catalog = inTankEnabled && livingCreatures.length
    ? allCatalog.filter((food) => isFoodRelevantToActiveTank(food, activeTank))
    : allCatalog;
  const productCards = catalog.flatMap((food) => getFoodPackageOptions(food).map((packageMeta) => ({
    use: getFoodStoreUse(food),
    markup: renderFoodStoreCard(food, packageMeta)
  })));
  const foodSections = [
    ["basic", "Everyday food for general feeding."],
    ["carnivore", "Meat-forward food for carnivorous fish and protein-loving omnivores."],
    ["bottom", "Sinking food for algae grazers and bottom-feeding scavengers."],
    ["predator", "Strong-scented food for sharks and other predators."],
    ["special", "Purpose-made food for breeding, events, and special care."]
  ].map(([use, description]) => renderStoreSubcategorySection(
    `food-${use}`,
    getFoodStoreUseLabel(use),
    description,
    productCards.filter((card) => card.use === use).map((card) => card.markup).join("")
  )).join("");

  const filterSummary = inTankEnabled
    ? (typeof getActiveTankFoodFilterSummary === "function" ? getActiveTankFoodFilterSummary(activeTank) : "Showing food for the current tank.")
    : "In Tank filter is off. Showing the full food catalog.";
  const filterToolbar = `
    <div class="shop-toolbar shop-food-toolbar">
      <h3 class="shop-toolbar-title">Food</h3>
      <div class="fish-meta shop-toolbar-summary">${escapeHtml(filterSummary)}</div>
      <div class="shop-toolbar-controls">
        <label class="shop-water-filter-control">
          <span>Filter</span>
          <span class="shop-water-filter-toggle">
            <input type="checkbox" data-food-in-tank-filter ${inTankEnabled ? "checked" : ""} />
            <strong>In Tank</strong>
          </span>
        </label>
      </div>
    </div>
  `;
  const emptyMessage = inTankEnabled && livingCreatures.length
    ? `<div class="empty-state">No stocked food matches the living creatures in this tank. Turn off <strong>In Tank</strong> to browse all food.</div>`
    : `<div class="empty-state">No food is available right now.</div>`;
  setMarkupIfChanged("food-shop", dom.foodShop, `${filterToolbar}${foodSections || emptyMessage}`);
}

function renderPharmacyStoreCard(medicine) {
  const count = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
  return `
    <article class="shop-card" ${renderStoreFacetAttributes("pharmacy", medicine)}>
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
        <button class="buy-button" data-buy-medicine="${medicine.id}">
          Buy Bottle (+${medicine.bottleDrops})
        </button>
      </div>
    </article>
  `;
}

function renderPharmacyShop() {
  if (!dom.pharmacyShop) return;
  const catalog = getMedicineCatalog().filter((medicine) => shouldShowMedicineInStore(medicine));
  const cardsMarkup = catalog.map(renderPharmacyStoreCard).join("");

  setMarkupIfChanged("pharmacy-shop", dom.pharmacyShop, cardsMarkup || `<div class="empty-state">No medicine is available right now.</div>`);
}
