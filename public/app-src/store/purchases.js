// Source fragment: store/purchases.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getInsufficientFundsMessage() {
  return "Payment method declined. Insufficient Funds.";
}

function setStorePurchaseSoundBatch(active = false) {
  runtime.storePurchaseSoundBatch = active === true;
}

function recordWalletTransaction(options = {}) {
  const amount = Math.max(0, Math.floor(Math.abs(Number(options.amount) || 0)));
  const allowZero = options.allowZero === true || options.direction === "neutral";
  if (!state || (!allowZero && amount <= 0)) return false;
  if (!Array.isArray(state.walletTransactions)) state.walletTransactions = [];
  const direction = options.direction === "debit"
    ? "debit"
    : options.direction === "neutral" || amount <= 0
      ? "neutral"
      : "credit";
  state.walletTransactions.unshift({
    id: createId("receipt"), amount,
    direction,
    label: String(options.label || "Aquarium activity").slice(0, 180),
    place: String(options.place || "Aquarium").replace(/tankazon/ig, "BubbleBodega").slice(0, 80),
    time: Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now()
  });
  state.walletTransactions = state.walletTransactions.slice(0, 60);
  return true;
}

function resolvePurchasedDecorKey(decorKey, appearanceVariantKey = "") {
  const key = normalizeDecorKey(decorKey);
  const decor = runtime.decorMap.get(key);
  if (!decor) {
    return key;
  }
  const variants = getDecorStoreVariantEntries(decor);
  if (!variants.length) {
    return key;
  }
  const match = variants.find((entry) => entry.key === appearanceVariantKey);
  return (match || variants[0] || decor).key;
}

function performCoinTransaction(options = {}) {
  const amount = Math.max(0, Math.floor(Number(options.amount) || 0));
  const direction = options.direction === "credit" ? "credit" : "debit";
  if (direction === "debit" && state.coins < amount) {
    const errorMessage = getInsufficientFundsMessage();
    showToast(errorMessage, { force: true, tone: "error" });
    return {
      ok: false,
      reason: "insufficient-coins",
      amount,
      errorMessage
    };
  }

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const previousCoins = state.coins;
  state.coins = clamp(state.coins + (direction === "credit" ? amount : -amount), 0, MAX_WALLET_COINS);
  try {
    const applied = typeof options.apply === "function" ? options.apply(now) : true;
    if (applied === false) {
      state.coins = previousCoins;
      return { ok: false, reason: "not-applied", amount };
    }
    const event = typeof options.event === "function" ? options.event(now) : options.event;
    const toast = typeof options.toast === "function" ? options.toast(now) : options.toast;
    recordWalletTransaction({ amount, direction, now,
      place: options.place || (direction === "debit" ? "BubbleBodega" : "Aquarium"),
      label: options.receiptLabel || event?.text || toast || (direction === "debit" ? "Purchase" : "Coin award") });
    completeGameAction({
      now,
      event,
      tank: options.tank,
      toast,
      toastOptions: options.toastOptions,
      sound: options.sound === false
        ? null
        : (runtime.storePurchaseSoundBatch ? null : (options.sound || (direction === "credit" ? "coin" : "purchase"))),
      render: options.render,
      full: options.full
    });
    return { ok: true, amount, now };
  } catch (error) {
    state.coins = previousCoins;
    throw error;
  }
}

function buyFood(foodKey) {
  const food = getFoodMeta(foodKey);
  if (!food) {
    return;
  }

  if (!shouldShowFoodInStore(food) || food.id === "upgraded") {
    showToast("That food is no longer available.");
    return;
  }

  return performCoinTransaction({
    amount: food.cost,
    insufficientMessage: "Not enough coins for that food bottle.",
    apply: () => {
      state.foodInventory[food.id] = Math.max(0, Number(state.foodInventory?.[food.id]) || 0) + food.bottlePellets;
    },
    event: { type: "purchase", tone: "positive", text: `Bought ${food.name} (${food.bottlePellets} ${food.id === "halloweenCandy" ? "candies" : "pellets"}).` },
    toast: `${food.name} stocked. +${food.bottlePellets} ${food.id === "halloweenCandy" ? "candies" : "pellets"}.`
  });
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

  return performCoinTransaction({
    amount: medicine.cost,
    insufficientMessage: "Not enough coins for that medicine bottle.",
    apply: () => {
      state.medicineInventory[medicine.id] = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0) + medicine.bottleDrops;
    },
    event: { type: "purchase", tone: "positive", text: `Bought ${medicine.name} (${medicine.bottleDrops} drops).` },
    toast: `${medicine.name} stocked. +${medicine.bottleDrops} drops.`
  });
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

  runtime.foodTrayOpen = false;
  runtime.medicineTrayOpen = true;
  runtime.cleaningMode = false;
  runtime.scoopMode = false;
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
  runtime.cleaningMode = false;
  runtime.scoopMode = false;
  runtime.feedingModeFoodKey = "";
  runtime.medicineModeKey = runtime.medicineModeKey === medicine.id ? "" : medicine.id;
  renderUi(Date.now());
  showToast(
    runtime.medicineModeKey
      ? `${medicine.name} selected. Click inside the tank to dose the whole tank.`
      : "Medicine mode cleared."
  );
}

async function ensureFishPurchaseImageReady(fish, species) {
  if (!fish || !species) {
    return false;
  }

  // The chosen appearance is part of the purchased fish, not a visual preference.
  // Load it first and validate that exact path so a slow variant request can never
  // silently turn the purchase into the base appearance.
  const selectedAsset = getFishAssetPath(fish, species);
  const candidates = [
    selectedAsset,
    getFishDirectionalSpritePath(selectedAsset, "bottom"),
    getFishDirectionalSpritePath(selectedAsset, "side"),
    species.overlayAsset,
    getFishDisplayAssetPath(fish, species, Date.now()),
    species.fallbackAsset,
    species.asset
  ].filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index);
  await preloadImages(candidates, {
    maxAttempts: 3,
    timeoutMs: 8000,
    retryDelayMs: 350
  });

  return isUsableRuntimeImage(runtime.images.get(selectedAsset));
}

async function buyFish(speciesId, options = {}) {
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
    const errorMessage = getInsufficientFundsMessage();
    showToast(errorMessage, { force: true, tone: "error" });
    return { ok: false, reason: "insufficient-coins", errorMessage };
  }

  const now = Date.now();
  const tutorialPurchase = isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_ADOPT_FISH);
  const variants = getFishAssetVariants(species);
  const selectedVariant = options.appearanceVariantKey
    ? variants.findIndex((path) => getFishAppearanceVariantKey(path) === options.appearanceVariantKey)
    : Math.max(0, variants.indexOf(getFishAssetPath({ appearanceVariant: options.appearanceVariant ?? 0 }, species)));
  if (selectedVariant < 0) {
    return { ok: false, reason: "variant-unavailable", errorMessage: "That fish variant is no longer available." };
  }
  const entryStartedAt = options.closeOverlayFirst === true
    ? now + TUTORIAL_STORE_CLOSE_DELAY_MS
    : now;
  const fish = createFishRecord(speciesId, {
    appearanceVariant: selectedVariant,
    appearanceVariantKey: getFishAppearanceVariantKey(variants[selectedVariant]),
    // Persist the resolved selected asset as well as its filename key. This
    // prevents a later catalog refresh or cache query from changing a fish
    // that has already been purchased.
    appearanceAssetPath: variants[selectedVariant],
    now,
    entryStartedAt,
    entryDurationMs: FISH_ENTRY_DURATION_MS,
    entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
  });
  if (!fish) {
    showToast("Could not prepare that fish.");
    return { ok: false, reason: "fish-creation-failed" };
  }

  const pendingKey = `catalog:${speciesId}`;
  if (runtime.pendingFishPurchases.has(pendingKey)) {
    return { ok: false, reason: "purchase-pending" };
  }
  runtime.pendingFishPurchases.add(pendingKey);

  try {
    // Do not make a paid adoption wait for an independent image decode. The
    // selected asset is saved on the record and recovery keeps retrying it.
    void ensureFishPurchaseImageReady(fish, species).then((loaded) => {
      if (loaded) return;
      requestRuntimeImageRecovery(getFishAssetPath(fish, species), {
        kind: "fish-appearance",
        id: fish.id,
        speciesId
      });
    });
    const purchaseCompletedAt = Date.now();
    let tutorialChanged = false;
    const transaction = performCoinTransaction({
      amount: purchaseCost,
      now: purchaseCompletedAt,
      insufficientMessage: `You need ${purchaseCost} ${pluralize("coin", purchaseCost)} for a ${species.name}.`,
      apply: () => {
        fish.acquiredAt = purchaseCompletedAt;
        fish.tankAddedAt = purchaseCompletedAt;
        fish.entryStartedAt = options.closeOverlayFirst === true
          ? purchaseCompletedAt + TUTORIAL_STORE_CLOSE_DELAY_MS
          : purchaseCompletedAt;
        fish.entrySplashTriggered = false;
        addFishToTank(fish, purchaseCompletedAt);
        maybeSeedNewFishDiseaseCarrier(fish, purchaseCompletedAt);
        if (!isMealFreeFish(fish) && canFoodSatisfyFishMeal(fish, "basic")) {
          setFishNeedValue(fish, "hunger", 82, purchaseCompletedAt);
          fish.lastAteAt = purchaseCompletedAt;
        }
        if (tutorialPurchase) {
          closeStoreOverlay({ force: true });
          tutorialChanged = setTutorialStage(TUTORIAL_STAGE_ADOPT_FISH_DONE, {
            now: purchaseCompletedAt,
            fishId: fish.id
          }) || tutorialChanged;
        }
      },
      event: {
        type: "fish_added",
        tone: "positive",
        fishId: fish.id,
        text: `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} splashed into the tank.`
      },
      toast: `${fish.name} joined the aquarium.`
    });
    if (!transaction.ok) {
      return transaction;
    }
    return {
      ok: true,
      fish,
      species,
      tutorialChanged
    };
  } finally {
    runtime.pendingFishPurchases.delete(pendingKey);
  }
}

async function buyAnotherCustomFish(fishId) {
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
    const errorMessage = getInsufficientFundsMessage();
    showToast(errorMessage, { force: true, tone: "error" });
    return { ok: false, reason: "insufficient-coins", errorMessage };
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

  const pendingKey = `custom:${sourceFish.speciesId}`;
  if (runtime.pendingFishPurchases.has(pendingKey)) {
    return;
  }
  runtime.pendingFishPurchases.add(pendingKey);

  try {
    if (!await ensureFishPurchaseImageReady(fish, species)) {
      showToast("That custom fish's artwork could not be loaded. Please try again.");
      return;
    }
    const purchaseCompletedAt = Date.now();
    return performCoinTransaction({
      amount: purchaseCost,
      now: purchaseCompletedAt,
      insufficientMessage: `You need ${purchaseCost} ${pluralize("coin", purchaseCost)} for another ${species.name}.`,
      apply: () => {
        fish.acquiredAt = purchaseCompletedAt;
        fish.tankAddedAt = purchaseCompletedAt;
        fish.entryStartedAt = purchaseCompletedAt;
        fish.entrySplashTriggered = false;
        addFishToTank(fish, purchaseCompletedAt);
        maybeSeedNewFishDiseaseCarrier(fish, purchaseCompletedAt);
        if (!isMealFreeFish(fish) && canFoodSatisfyFishMeal(fish, "basic")) {
          setFishNeedValue(fish, "hunger", 82, purchaseCompletedAt);
          fish.lastAteAt = purchaseCompletedAt;
        }
      },
      event: {
        type: "fish_added",
        tone: "positive",
        fishId: fish.id,
        text: `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} splashed into the tank.`
      },
      toast: `Another ${species.name} joined the aquarium.`
    });
  } finally {
    runtime.pendingFishPurchases.delete(pendingKey);
  }
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

  buyFish(fish.speciesId, { appearanceVariantKey: getFishAppearanceVariantKey(getFishAssetPath(fish)) });
  return true;
}

function requestCommerceConfirmation(options = {}) {
  options.prepare?.();
  const details = options.getDetails?.() || null;
  const errorMessage = options.validate?.(details) || "";
  if (!details || errorMessage) {
    options.clear?.();
    const message = errorMessage || options.missingMessage || "That item is no longer available.";
    showToast(message, message === getInsufficientFundsMessage() ? { force: true, tone: "error" } : {});
    return false;
  }
  options.open?.(details);
  return true;
}

function confirmCommerceAction(options = {}) {
  const details = options.getDetails?.() || null;
  const errorMessage = options.validate?.(details) || "";
  if (!details || errorMessage) {
    const message = errorMessage || options.missingMessage || "That item is no longer available.";
    showToast(message, message === getInsufficientFundsMessage() ? { force: true, tone: "error" } : {});
    closeUtilityOverlay();
    return false;
  }
  options.execute?.(details);
  closeUtilityOverlay();
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
  return requestCommerceConfirmation({
    prepare: () => {
      runtime.pendingFishAction = { type: "buy-another", fishId: String(fishId || "") };
    },
    clear: () => {
      runtime.pendingFishAction = null;
    },
    getDetails: getPendingFishBuyAnotherDetails,
    missingMessage: "Choose a fish first.",
    validate: (details) => details?.goreLocked
      ? "Enable Violence & Gore to buy undead fish."
      : !details?.unlocked
        ? `${details?.baseSpecies?.name || "That fish"} has not been unlocked yet.`
        : !details?.canAfford
          ? getInsufficientFundsMessage()
          : "",
    open: (details) => openFishActionConfirmation({ type: "buy-another", fishId: details.fishId })
  });
}

function openFishSellConfirmation(fishId) {
  return requestCommerceConfirmation({
    prepare: () => {
      runtime.pendingFishAction = { type: "sell", fishId: String(fishId || "") };
    },
    clear: () => {
      runtime.pendingFishAction = null;
    },
    getDetails: getPendingFishSellDetails,
    missingMessage: "Choose a fish first.",
    validate: (details) => details?.dead
      ? "Dead fish cannot be sold."
      : details?.juvenile
        ? "Baby fish need time to grow before they can be sold."
        : "",
    open: (details) => openFishActionConfirmation({ type: "sell", fishId: details.fishId })
  });
}

function confirmFishBuyAnother() {
  return confirmCommerceAction({
    getDetails: getPendingFishBuyAnotherDetails,
    missingMessage: "That fish is no longer available.",
    validate: (details) => !details?.canBuy
      ? (details?.goreLocked
      ? "Enable Violence & Gore to buy undead fish."
      : `${details?.baseSpecies?.name || "That fish"} has not been unlocked yet.`)
      : !details?.canAfford
        ? getInsufficientFundsMessage()
        : "",
    execute: (details) => buyAnotherFishFromSource(details.fishId)
  });
}

function confirmFishSell() {
  return confirmCommerceAction({
    getDetails: getPendingFishSellDetails,
    missingMessage: "That fish is no longer available.",
    validate: (details) => !details?.canSell
      ? (details?.dead
      ? "Dead fish cannot be sold."
      : "Baby fish need time to grow before they can be sold.")
      : "",
    execute: (details) => sellFish(details.fishId)
  });
}

function getDecorPurchaseCost(decorKey) {
  const resolvedKey = typeof normalizeDecorKey === "function" ? normalizeDecorKey(decorKey) : decorKey;
  const decor = runtime.decorMap.get(resolvedKey);
  return Math.max(0, Math.floor(Number(decor?.cost) || 0));
}

function buyDecor(decorKey, options = {}) {
  const resolvedDecorKey = typeof resolvePurchasedDecorKey === "function"
    ? resolvePurchasedDecorKey(decorKey, options.appearanceVariantKey)
    : (typeof normalizeDecorKey === "function" ? normalizeDecorKey(decorKey) : decorKey);
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    closeStoreOverlay({ force: true });
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION_DONE, {
      now: Date.now(),
      decorKey: String(resolvedDecorKey || decorKey || "")
    });
    saveState();
    renderUi(Date.now());
    return { ok: true, previewOnly: true };
  }

  const decor = runtime.decorMap.get(resolvedDecorKey) || runtime.decorMap.get(decorKey);
  if (!decor) {
    return { ok: false, reason: "missing-decor" };
  }

  if (!isSeasonalDecorAvailable(decor)) {
    showToast(`${decor.name} is only available during its season.`);
    return { ok: false, reason: "out-of-season" };
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

  const now = Date.now();
  const tutorialPurchase = isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION);
  const transaction = performCoinTransaction({
    amount: decor.cost,
    now,
    insufficientMessage: `You need ${decor.cost} coins for ${decor.name}.`,
    apply: () => {
      state.decorInventory[resolvedDecorKey] = (state.decorInventory[resolvedDecorKey] || 0) + 1;
      if (tutorialPurchase || options.closeOverlayFirst === true) {
        closeStoreOverlay({ force: true });
        setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION, { now, decorKey: resolvedDecorKey });
      }
    },
    event: { type: "decor", tone: "positive", decorKey: resolvedDecorKey, text: `Bought ${decor.name}.` },
    toast: `${decor.name} is waiting in storage.`
  });
  if (!transaction.ok) {
    return transaction;
  }
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

  if (!isSeasonalDecorAvailable(decor)) {
    showToast(`${decor.name} is only available during its season.`);
    return { ok: false, reason: "out-of-season" };
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
  return performCoinTransaction({
    amount: cost,
    insufficientMessage: `You need ${cost} ${pluralize("coin", cost)} for another ${decor.name}.`,
    apply: () => {
      state.decorInventory[key] = (state.decorInventory[key] || 0) + 1;
    },
    event: {
      type: "decor",
      tone: "positive",
      decorKey: key,
      text: `Bought another ${decor.name}.`
    },
    toast: `Another ${decor.name} is waiting in storage.`
  });
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
  return requestCommerceConfirmation({
    prepare: () => {
      runtime.pendingDecorAction = { type: "buy-another", decorKey: key };
    },
    clear: () => {
      runtime.pendingDecorAction = null;
    },
    getDetails: getPendingDecorBuyAnotherDetails,
    missingMessage: "That decor is no longer available.",
    validate: (details) => !details
      ? "That decor is no longer available."
      : !canUseDecorWithCurrentContentSettings(details.decorKey)
        ? "Enable Violence & Gore to buy that decor."
        : !details.canAfford
          ? getInsufficientFundsMessage()
          : "",
    open: (details) => openDecorActionConfirmation({ type: "buy-another", decorKey: details.decorKey })
  });
}

function openDecorSellConfirmation(placedId) {
  return requestCommerceConfirmation({
    prepare: () => {
      runtime.pendingDecorAction = { type: "sell", placedId: String(placedId || "") };
    },
    clear: () => {
      runtime.pendingDecorAction = null;
    },
    getDetails: getPendingDecorSellDetails,
    missingMessage: "Select decor first.",
    validate: (details) => details?.grouped ? "Ungroup that decor before selling it." : "",
    open: (details) => openDecorActionConfirmation({ type: "sell", placedId: details.placedId })
  });
}

function confirmDecorBuyAnother() {
  return confirmCommerceAction({
    getDetails: getPendingDecorBuyAnotherDetails,
    missingMessage: "That decor is no longer available.",
    validate: (details) => !details?.canAfford
      ? getInsufficientFundsMessage()
      : "",
    execute: (details) => buyAnotherDecor(details.decorKey)
  });
}

function confirmDecorSell() {
  return confirmCommerceAction({
    getDetails: getPendingDecorSellDetails,
    missingMessage: "That decor is no longer in the tank.",
    validate: (details) => details?.grouped ? "Ungroup that decor before selling it." : "",
    execute: (details) => sellPlacedDecor(details.placedId)
  });
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

  return performCoinTransaction({
    amount: background.cost,
    insufficientMessage: `You need ${background.cost} ${pluralize("coin", background.cost)} for ${background.name}.`,
    apply: () => {
      state.ownedBackgroundInventory[backgroundKey] = 1;
      state.selectedBackground = backgroundKey;
    },
    event: { type: "purchase", tone: "positive", text: `Unlocked the ${background.name} background.` },
    toast: `${background.name} unlocked and applied.`
  });
}


function buyAutoDispenser() {
  if (hasAutoDispenserInstalled()) {
    showToast("This tank already has a pellet dispenser installed.");
    return;
  }

  return performCoinTransaction({
    amount: AUTO_DISPENSER_COST,
    insufficientMessage: `You need ${AUTO_DISPENSER_COST} ${pluralize("coin", AUTO_DISPENSER_COST)} for the pellet dispenser.`,
    apply: () => {
      state.autoDispenser = createDefaultAutoDispenserState({
        ...state.autoDispenser,
        installed: true
      });
    },
    event: { type: "equipment", tone: "positive", text: "Installed an automatic pellet dispenser above the waterline." },
    toast: "Pellet dispenser installed."
  });
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

  return performCoinTransaction({
    amount: UV_LIGHT_COST,
    insufficientMessage: `You need ${UV_LIGHT_COST} ${pluralize("coin", UV_LIGHT_COST)} for the UV light.`,
    apply: () => {
      state.uvLightOwned = true;
      state.uvLightInstalled = true;
      state.uvLightEnabled = true;
    },
    event: { type: "equipment", tone: "positive", text: "Installed a UV light for blacklight glow." },
    toast: "UV light installed and switched on."
  });
}
