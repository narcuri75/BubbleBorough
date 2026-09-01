// Source fragment: store/purchases.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function buyFood(foodKey) {
  const food = getFoodMeta(foodKey);
  if (!food) {
    return;
  }

  if (!shouldShowFoodInStore(food) || food.id === "upgraded") {
    showToast("That food is no longer available.");
    return;
  }

  if (state.coins < food.cost) {
    showToast("Not enough coins for that food bottle.");
    return;
  }

  state.coins -= food.cost;
  state.foodInventory[food.id] = Math.max(0, Number(state.foodInventory?.[food.id]) || 0) + food.bottlePellets;
  pushEvent(`Bought ${food.name} (${food.bottlePellets} pellets).`, Date.now());
  saveState();
  playPurchaseSoundEffect();
  renderUi(Date.now());
  showToast(`${food.name} stocked. +${food.bottlePellets} pellets.`);
}

function buyMedicine(medicineKey) {
  const medicine = getMedicineMeta(medicineKey);
  if (!medicine) {
    return;
  }

  if (!shouldShowMedicineInStore(medicine)) {
    showToast("Enable Violence & Gore to buy The Cure.");
    return;
  }

  if (state.coins < medicine.cost) {
    showToast("Not enough coins for that medicine bottle.");
    return;
  }

  state.coins -= medicine.cost;
  state.medicineInventory[medicine.id] = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0) + medicine.bottleDrops;
  pushEvent(`Bought ${medicine.name} (${medicine.bottleDrops} drops).`, Date.now());
  saveState();
  playPurchaseSoundEffect();
  renderUi(Date.now());
  showToast(`${medicine.name} stocked. +${medicine.bottleDrops} drops.`);
}

function selectFoodMode(foodKey, options = {}) {
  const food = getFoodMeta(foodKey);
  if (!food) {
    return { ok: false, reason: "missing-food" };
  }
  if (!shouldShowFoodInStore(food) || food.id === "upgraded") {
    showToast("That food is no longer available.");
    return { ok: false, reason: "food-locked", foodId: food.id };
  }

  const quantity = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
  if (quantity <= 0) {
    showToast("Buy that food first.");
    return { ok: false, reason: "out-of-stock", foodId: food.id };
  }

  runtime.foodTrayOpen = true;
  runtime.medicineTrayOpen = false;
  runtime.medicineModeKey = "";
  runtime.feedingModeFoodKey = runtime.feedingModeFoodKey === food.id ? "" : food.id;
  renderUi(Date.now());
  showToast(
    runtime.feedingModeFoodKey
      ? `${food.name} selected. Click inside the tank to drop one piece.`
      : "Feeding mode cleared."
  );
  return {
    ok: true,
    foodId: food.id,
    selected: runtime.feedingModeFoodKey === food.id,
    closeAfterDrop: options.closeAfterDrop === true
  };
}

function selectMedicineMode(medicineKey) {
  const medicine = getMedicineMeta(medicineKey);
  if (!medicine) {
    return;
  }

  if (!shouldShowMedicineInStore(medicine)) {
    runtime.medicineModeKey = "";
    renderUi(Date.now());
    showToast("Enable Violence & Gore to use The Cure.");
    return;
  }

  const quantity = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
  if (quantity <= 0) {
    showToast("Buy that medicine first.");
    return;
  }

  runtime.medicineTrayOpen = true;
  runtime.foodTrayOpen = false;
  runtime.feedingModeFoodKey = "";
  runtime.medicineModeKey = runtime.medicineModeKey === medicine.id ? "" : medicine.id;
  renderUi(Date.now());
  showToast(
    runtime.medicineModeKey
      ? `${medicine.name} selected. Click inside the tank to dose the whole tank.`
      : "Medicine mode cleared."
  );
}

function buyFish(speciesId, options = {}) {
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_ADOPT_FISH)) {
    closeStoreOverlay({ force: true });
    setTutorialStage(TUTORIAL_STAGE_ADOPT_FISH_DONE, { now: Date.now() });
    saveState();
    renderUi(Date.now());
    return { ok: true, previewOnly: true };
  }

  if (isCustomFishShopKey(speciesId)) {
    openLocalFishPicker();
    return { ok: false, reason: "custom-upload" };
  }

  const species = runtime.fishMap.get(speciesId);
  if (!species) {
    return { ok: false, reason: "missing-species" };
  }

  if (isUndeadSpecies(species) && !isViolenceAndGoreEnabled()) {
    showToast("Enable Violence & Gore to buy undead fish.");
    return { ok: false, reason: "content-locked" };
  }

  if (!isFishSpeciesShopUnlocked(species)) {
    showToast(`${species.name} has not been unlocked yet.`);
    return { ok: false, reason: "species-locked" };
  }

  const purchaseCost = getFishPurchaseCost(speciesId);
  if (state.coins < purchaseCost) {
    showToast(`You need ${purchaseCost} ${pluralize("coin", purchaseCost)} for a ${species.name}.`);
    return { ok: false, reason: "insufficient-coins" };
  }

  const now = Date.now();
  const tutorialPurchase = isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_ADOPT_FISH);
  const entryStartedAt = options.closeOverlayFirst === true
    ? now + TUTORIAL_STORE_CLOSE_DELAY_MS
    : now;
  state.coins -= purchaseCost;
  const fish = createFishRecord(speciesId, {
    now,
    entryStartedAt,
    entryDurationMs: FISH_ENTRY_DURATION_MS,
    entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
  });
  addFishToTank(fish, now);
  maybeSeedNewFishDiseaseCarrier(fish, now);

  if (!isMealFreeFish(fish) && canFoodSatisfyFishMeal(fish, "basic")) {
    setFishNeedValue(fish, "hunger", 82, now);
    fish.lastAteAt = now;
  }

  pushEvent(`${fish.name} the ${getFishDisplaySpeciesName(fish, species)} splashed into the tank.`, fish.acquiredAt);
  let tutorialChanged = false;
  if (tutorialPurchase) {
    closeStoreOverlay({ force: true });
    tutorialChanged = setTutorialStage(TUTORIAL_STAGE_ADOPT_FISH_DONE, {
      now,
      fishId: fish.id
    }) || tutorialChanged;
  }
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast(`${fish.name} joined the aquarium.`);
  return {
    ok: true,
    fish,
    species,
    tutorialChanged
  };
}

function buyAnotherCustomFish(fishId) {
  const managed = getManagedFishById(fishId);
  const sourceFish = managed?.fish || null;
  if (!sourceFish || !isCustomFishAssetKey(sourceFish.speciesId)) {
    showToast("Choose a custom fish first.");
    return;
  }

  const species = runtime.fishMap.get(sourceFish.speciesId);
  if (!species) {
    showToast("That custom fish is no longer available.");
    return;
  }

  const purchaseCost = getFishPurchaseCost(sourceFish.speciesId);
  if (state.coins < purchaseCost) {
    showToast(`You need ${purchaseCost} ${pluralize("coin", purchaseCost)} for another ${species.name}.`);
    return;
  }

  const now = Date.now();
  const sourceLayer = getFishTankLayer(sourceFish);
  const tankLayer = managed.inStorage || isFishDead(sourceFish)
    ? (species.behavior === "sucker" ? SUCKER_FISH_BACK_GLASS_LAYER : clampTankLayer(1 + Math.floor(Math.random() * TANK_DEPTH_LAYERS)))
    : sourceLayer;
  const xNorm = managed.inStorage || isFishDead(sourceFish)
    ? randomSwimX()
    : clamp(sourceFish.xNorm + randomBetween(-0.05, 0.05), 0.08, 0.92);
  const yNorm = managed.inStorage || isFishDead(sourceFish)
    ? randomSwimY(tankLayer, sourceFish, species)
    : clamp(sourceFish.yNorm + randomBetween(-0.035, 0.035), 0.14, 0.8);
  const fish = createFishRecord(sourceFish.speciesId, {
    now,
    xNorm,
    yNorm,
    targetXNorm: randomSwimX(),
    targetYNorm: randomSwimY(tankLayer, sourceFish, species),
    tankLayer,
    desiredTankLayer: tankLayer,
    scale: sourceFish.scale,
    entryStartedAt: now,
    entryDurationMs: FISH_ENTRY_DURATION_MS,
    entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
  });
  if (!fish) {
    showToast("Could not add another custom fish to the tank.");
    return;
  }

  state.coins -= purchaseCost;
  addFishToTank(fish, now);
  maybeSeedNewFishDiseaseCarrier(fish, now);

  if (!isMealFreeFish(fish) && canFoodSatisfyFishMeal(fish, "basic")) {
    setFishNeedValue(fish, "hunger", 82, now);
    fish.lastAteAt = now;
  }

  pushEvent(`${fish.name} the ${getFishDisplaySpeciesName(fish, species)} splashed into the tank.`, fish.acquiredAt);
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast(`Another ${species.name} joined the aquarium.`);
}

function buyAnotherFishFromSource(fishId) {
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  if (!fish) {
    return false;
  }

  if (isCustomFishAssetKey(fish.speciesId)) {
    buyAnotherCustomFish(fish.id);
    return true;
  }

  buyFish(fish.speciesId);
  return true;
}

function getPendingFishActionDetails(expectedType) {
  const action = runtime.pendingFishAction;
  if (!action || action.type !== expectedType) {
    return null;
  }

  const fishId = String(action.fishId || "");
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  if (!fish) {
    return null;
  }

  const species = getSpeciesForFish(fish);
  const baseSpecies = getBaseSpeciesForFish(fish) || species;
  if (!species || !baseSpecies) {
    return null;
  }

  return {
    fishId,
    fish,
    species,
    baseSpecies,
    inStorage: managed.inStorage === true
  };
}

function getPendingFishBuyAnotherDetails() {
  const details = getPendingFishActionDetails("buy-another");
  if (!details) {
    return null;
  }

  const cost = getFishPurchaseCost(details.fish.speciesId);
  const customFish = isCustomFishAssetKey(details.fish.speciesId);
  const goreLocked = isUndeadSpecies(details.species) && !isViolenceAndGoreEnabled();
  const unlocked = customFish || isFishSpeciesShopUnlocked(details.baseSpecies);
  return {
    ...details,
    cost,
    customFish,
    goreLocked,
    unlocked,
    canAfford: state.coins >= cost,
    canBuy: unlocked && !goreLocked
  };
}

function getPendingFishSellDetails() {
  const details = getPendingFishActionDetails("sell");
  if (!details) {
    return null;
  }

  const dead = isFishDead(details.fish);
  const juvenile = !dead && isFishJuvenile(details.fish);
  return {
    ...details,
    dead,
    juvenile,
    resaleValue: getResaleValue(details.baseSpecies?.cost || details.species?.cost || 0),
    canSell: !dead && !juvenile
  };
}

function openFishBuyAnotherConfirmation(fishId) {
  runtime.pendingFishAction = {
    type: "buy-another",
    fishId: String(fishId || "")
  };
  const details = getPendingFishBuyAnotherDetails();
  if (!details) {
    runtime.pendingFishAction = null;
    showToast("Choose a fish first.");
    return;
  }

  if (details.goreLocked) {
    runtime.pendingFishAction = null;
    showToast("Enable Violence & Gore to buy undead fish.");
    return;
  }

  if (!details.unlocked) {
    runtime.pendingFishAction = null;
    showToast(`${details.baseSpecies.name} has not been unlocked yet.`);
    return;
  }

  if (!details.canAfford) {
    runtime.pendingFishAction = null;
    showToast(`You need ${details.cost} ${pluralize("coin", details.cost)} for another ${details.baseSpecies.name}.`);
    return;
  }

  openFishActionConfirmation({
    type: "buy-another",
    fishId: details.fishId
  });
}

function openFishSellConfirmation(fishId) {
  runtime.pendingFishAction = {
    type: "sell",
    fishId: String(fishId || "")
  };
  const details = getPendingFishSellDetails();
  if (!details) {
    runtime.pendingFishAction = null;
    showToast("Choose a fish first.");
    return;
  }

  if (details.dead) {
    runtime.pendingFishAction = null;
    showToast("Dead fish cannot be sold.");
    return;
  }

  if (details.juvenile) {
    runtime.pendingFishAction = null;
    showToast("Baby fish need time to grow before they can be sold.");
    return;
  }

  openFishActionConfirmation({
    type: "sell",
    fishId: details.fishId
  });
}

function confirmFishBuyAnother() {
  const details = getPendingFishBuyAnotherDetails();
  if (!details) {
    showToast("That fish is no longer available.");
    closeUtilityOverlay();
    return;
  }

  if (!details.canBuy) {
    showToast(details.goreLocked
      ? "Enable Violence & Gore to buy undead fish."
      : `${details.baseSpecies.name} has not been unlocked yet.`);
    closeUtilityOverlay();
    return;
  }

  if (!details.canAfford) {
    showToast(`You need ${details.cost} ${pluralize("coin", details.cost)} for another ${details.baseSpecies.name}.`);
    closeUtilityOverlay();
    return;
  }

  buyAnotherFishFromSource(details.fishId);
  closeUtilityOverlay();
}

function confirmFishSell() {
  const details = getPendingFishSellDetails();
  if (!details) {
    showToast("That fish is no longer available.");
    closeUtilityOverlay();
    return;
  }

  if (!details.canSell) {
    showToast(details.dead
      ? "Dead fish cannot be sold."
      : "Baby fish need time to grow before they can be sold.");
    closeUtilityOverlay();
    return;
  }

  sellFish(details.fishId);
  closeUtilityOverlay();
}

function getDecorPurchaseCost(decorKey) {
  const decor = runtime.decorMap.get(decorKey);
  return Math.max(0, Math.floor(Number(decor?.cost) || 0));
}

function buyDecor(decorKey, options = {}) {
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    closeStoreOverlay({ force: true });
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION_DONE, {
      now: Date.now(),
      decorKey: String(decorKey || "")
    });
    saveState();
    renderUi(Date.now());
    return { ok: true, previewOnly: true };
  }

  const decor = runtime.decorMap.get(decorKey);
  if (!decor) {
    return { ok: false, reason: "missing-decor" };
  }

  if (!isDecorShopUnlocked(decor)) {
    showToast(`${decor.name} unlocks at ${getDecorUnlockRequirementLabel(decor)}.`);
    return { ok: false, reason: "decor-locked" };
  }

  if (isCustomDecorShopKey(decorKey)) {
    openLocalDecorPicker();
    return { ok: false, reason: "custom-upload" };
  }
  if (isCustomHideShopKey(decorKey)) {
    openCustomHideCreationOverlay();
    return { ok: false, reason: "custom-hide" };
  }

  if (!canUseDecorWithCurrentContentSettings(decor)) {
    showToast("Enable Violence & Gore to buy that decor.");
    return { ok: false, reason: "content-locked" };
  }

  if (state.coins < decor.cost) {
    showToast(`You need ${decor.cost} coins for ${decor.name}.`);
    return { ok: false, reason: "insufficient-coins" };
  }

  const now = Date.now();
  const tutorialPurchase = isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION);
  state.coins -= decor.cost;
  state.decorInventory[decorKey] = (state.decorInventory[decorKey] || 0) + 1;
  pushEvent(`Bought ${decor.name}.`, now, getCurrentTank(), {
    type: "decor",
    decorKey
  });
  if (tutorialPurchase || options.closeOverlayFirst === true) {
    closeStoreOverlay({ force: true });
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION, {
      now,
      decorKey
    });
  }
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast(`${decor.name} is waiting in storage.`);
  return {
    ok: true,
    decor,
    tutorialChanged: tutorialPurchase
  };
}

function buyAnotherDecor(decorKey) {
  const key = String(decorKey || "");
  const decor = runtime.decorMap.get(key);
  if (!decor) {
    showToast("That decor is no longer available.");
    return;
  }

  if (!canUseDecorWithCurrentContentSettings(key)) {
    showToast("Enable Violence & Gore to buy that decor.");
    return;
  }

  if (!isDecorShopUnlocked(key)) {
    showToast(`${decor.name} unlocks at ${getDecorUnlockRequirementLabel(key)}.`);
    return;
  }

  const cost = getDecorPurchaseCost(key);
  if (state.coins < cost) {
    showToast(`You need ${cost} ${pluralize("coin", cost)} for another ${decor.name}.`);
    return;
  }

  state.coins -= cost;
  state.decorInventory[key] = (state.decorInventory[key] || 0) + 1;
  const now = Date.now();
  pushEvent(`Bought another ${decor.name}.`, now, getCurrentTank(), {
    type: "decor",
    decorKey: key
  });
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast(`Another ${decor.name} is waiting in storage.`);
}

function getPendingDecorBuyAnotherDetails() {
  const action = runtime.pendingDecorAction;
  if (!action || action.type !== "buy-another") {
    return null;
  }

  const decorKey = String(action.decorKey || "");
  const decor = runtime.decorMap.get(decorKey);
  if (!decor) {
    return null;
  }

  const cost = getDecorPurchaseCost(decorKey);
  return {
    decorKey,
    decor,
    cost,
    canAfford: state.coins >= cost
  };
}

function getPendingDecorSellDetails() {
  const action = runtime.pendingDecorAction;
  if (!action || action.type !== "sell") {
    return null;
  }

  const placedId = String(action.placedId || "");
  const item = getPlacedDecorById(placedId);
  if (!item) {
    return null;
  }

  const decor = runtime.decorMap.get(item.decorKey) || {
    name: titleFromFile(item.decorKey),
    cost: 0
  };
  return {
    placedId,
    item,
    decor,
    resaleValue: getResaleValue(decor.cost || 0),
    grouped: isPlacedDecorGrouped(item)
  };
}

function openDecorBuyAnotherConfirmation(decorKey) {
  const key = String(decorKey || "");
  const decor = runtime.decorMap.get(key);
  if (!decor) {
    showToast("That decor is no longer available.");
    return;
  }

  if (!canUseDecorWithCurrentContentSettings(key)) {
    showToast("Enable Violence & Gore to buy that decor.");
    return;
  }

  const cost = getDecorPurchaseCost(key);
  if (state.coins < cost) {
    showToast(`You need ${cost} ${pluralize("coin", cost)} for another ${decor.name}.`);
    return;
  }

  openDecorActionConfirmation({
    type: "buy-another",
    decorKey: key
  });
}

function openDecorSellConfirmation(placedId) {
  const item = getPlacedDecorById(placedId);
  if (!item) {
    showToast("Select decor first.");
    return;
  }

  if (isPlacedDecorGrouped(item)) {
    showToast("Ungroup that decor before selling it.");
    return;
  }

  openDecorActionConfirmation({
    type: "sell",
    placedId: item.id
  });
}

function confirmDecorBuyAnother() {
  const details = getPendingDecorBuyAnotherDetails();
  if (!details) {
    showToast("That decor is no longer available.");
    closeUtilityOverlay();
    return;
  }

  if (!details.canAfford) {
    showToast(`You need ${details.cost} ${pluralize("coin", details.cost)} for another ${details.decor.name}.`);
    closeUtilityOverlay();
    return;
  }

  buyAnotherDecor(details.decorKey);
  closeUtilityOverlay();
}

function confirmDecorSell() {
  const details = getPendingDecorSellDetails();
  if (!details) {
    showToast("That decor is no longer in the tank.");
    closeUtilityOverlay();
    return;
  }

  if (details.grouped) {
    showToast("Ungroup that decor before selling it.");
    closeUtilityOverlay();
    return;
  }

  sellPlacedDecor(details.placedId);
  closeUtilityOverlay();
}

function buyBackground(backgroundKey) {
  const background = runtime.backgroundMap.get(backgroundKey);
  if (!background) {
    return;
  }

  if (isBackgroundOwned(backgroundKey)) {
    selectBackground(backgroundKey);
    return;
  }

  if (state.coins < background.cost) {
    showToast(`You need ${background.cost} ${pluralize("coin", background.cost)} for ${background.name}.`);
    return;
  }

  const now = Date.now();
  state.coins -= background.cost;
  state.ownedBackgroundInventory[backgroundKey] = 1;
  state.selectedBackground = backgroundKey;
  pushEvent(`Unlocked the ${background.name} background.`, now);
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast(`${background.name} unlocked and applied.`);
}

function buyFilter(filterKey) {
  const filter = runtime.filterMap.get(filterKey);
  if (!filter || !filter.purchasable) {
    return;
  }

  if (state.coins < filter.cost) {
    showToast(`You need ${filter.cost} ${pluralize("coin", filter.cost)} for the ${filter.name}.`);
    return;
  }

  const now = Date.now();
  state.coins -= filter.cost;
  state.ownedFilterInventory[filterKey] = (state.ownedFilterInventory[filterKey] || 0) + 1;
  if (tankSupportsFilters(getCurrentTank()) && getAvailableFilterCount(filterKey) > 0) {
    preserveTankDirtinessThroughChange(now, () => {
      state.selectedFilterAsset = filterKey;
    });
    pushEvent(`Bought and equipped the ${filter.name}.`, now);
    showToast(`${filter.name} installed.`);
  } else {
    pushEvent(`Bought ${filter.name}.`, now);
    showToast(`${filter.name} added to tank storage.`);
  }
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
}

function buyAutoDispenser() {
  if (hasAutoDispenserInstalled()) {
    showToast("This tank already has a pellet dispenser installed.");
    return;
  }

  if (state.coins < AUTO_DISPENSER_COST) {
    showToast(`You need ${AUTO_DISPENSER_COST} ${pluralize("coin", AUTO_DISPENSER_COST)} for the pellet dispenser.`);
    return;
  }

  const now = Date.now();
  state.coins -= AUTO_DISPENSER_COST;
  state.autoDispenser = createDefaultAutoDispenserState({
    ...state.autoDispenser,
    installed: true
  });
  pushEvent("Installed an automatic pellet dispenser above the waterline.", now);
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast("Pellet dispenser installed.");
}

function buyUvLight() {
  if (!isUvLightFeatureEnabled()) {
    showToast("UV light is disabled.");
    return;
  }

  if (isUvLightOwned()) {
    showToast("You already own a UV light.");
    return;
  }

  if (state.coins < UV_LIGHT_COST) {
    showToast(`You need ${UV_LIGHT_COST} ${pluralize("coin", UV_LIGHT_COST)} for the UV light.`);
    return;
  }

  const now = Date.now();
  state.coins -= UV_LIGHT_COST;
  state.uvLightOwned = true;
  state.uvLightInstalled = true;
  state.uvLightEnabled = true;
  pushEvent("Installed a UV light for blacklight glow.", now);
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  showToast("UV light installed and switched on.");
}

function sellFilter(filterKey) {
  const filter = runtime.filterMap.get(filterKey);
  if (!filter || !filter.purchasable) {
    return;
  }

  const ownedCount = Math.max(0, Math.floor(Number(state?.ownedFilterInventory?.[filterKey]) || 0));
  const unusedCount = getUnusedFilterCount(filterKey);
  if (ownedCount <= 0 || unusedCount <= 0) {
    showToast("Only unused filters can be sold.");
    return;
  }

  const resaleValue = getResaleValue(filter.cost);
  const now = Date.now();
  const nextCount = Math.max(0, ownedCount - 1);
  if (nextCount > 0) {
    state.ownedFilterInventory[filterKey] = nextCount;
  } else {
    delete state.ownedFilterInventory[filterKey];
  }
  state.coins += resaleValue;
  pushEvent(`Sold ${filter.name} for ${resaleValue} ${pluralize("coin", resaleValue)}.`, now);
  showToast(`${filter.name} sold.`);
  saveState();
  playCoinSoundEffect();
  renderUi(now);
}
