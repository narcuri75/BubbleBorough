// Source fragment: store/purchases.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getInsufficientFundsMessage() {
  return "Payment method declined. Insufficient Funds.";
}

function setStorePurchaseSoundBatch(active = false) {
  runtime.storePurchaseSoundBatch = active === true;
}

function recordBubbleBodegaOrder(rawItems) {
  if (!state) return null;
  const items = sanitizePurchaseHistory([{ id: createId("order"), placedAt: Date.now(), items: rawItems }])[0]?.items || [];
  if (!items.length) return null;
  const order = {
    id: createId("order"),
    placedAt: Date.now(),
    total: items.reduce((sum, item) => sum + item.cost * item.quantity, 0),
    items
  };
  const engineeredSpecimen = typeof isEngineeredAquaticSpecimenOrder === "function"
    && isEngineeredAquaticSpecimenOrder(order);
  if (engineeredSpecimen) {
    order.proteusStatus = "design-required";
    order.proteusConfiguredAt = 0;
    order.proteusFulfilledAt = 0;
  }
  if (!Array.isArray(state.purchaseHistory)) state.purchaseHistory = [];
  state.purchaseHistory.unshift(order);
  state.purchaseHistory = sanitizePurchaseHistory(state.purchaseHistory);
  if (engineeredSpecimen) {
    if (!Array.isArray(state.engineeredSpecimenDesignOrderIds)) state.engineeredSpecimenDesignOrderIds = [];
    state.engineeredSpecimenDesignOrderIds = [...new Set([order.id, ...state.engineeredSpecimenDesignOrderIds])].slice(0, 20);
  }
  const remainingCosts = new Map();
  for (const item of items) {
    const cost = Math.max(0, Math.floor(Number(item.cost) || 0));
    remainingCosts.set(cost, (remainingCosts.get(cost) || 0) + Math.max(1, Math.floor(Number(item.quantity) || 1)));
  }
  for (const entry of state.walletTransactions || []) {
    const cost = Math.max(0, Math.floor(Number(entry.amount) || 0));
    if (
      entry.direction !== "debit"
      || entry.orderId
      || !/bubblebodega/i.test(String(entry.place || ""))
      || Math.abs(order.placedAt - (Number(entry.time) || 0)) > 15000
      || !(remainingCosts.get(cost) > 0)
    ) continue;
    entry.orderId = order.id;
    remainingCosts.set(cost, remainingCosts.get(cost) - 1);
  }
  saveState();
  return order;
}

function buyEngineeredAquaticSpecimen() {
  const purchaseCost = CUSTOM_FISH_COST;
  return performCoinTransaction({
    amount: purchaseCost,
    insufficientMessage: getInsufficientFundsMessage(),
    event: { type: "purchase", tone: "positive", text: "Engineered Aquatic Specimen order placed." },
    toast: "Engineered Aquatic Specimen order placed. Check WebSurf for your Proteus design link."
  });
}


function getProteusSaveDiscovery() {
  return {
    discovered: state?.proteusDiscovered === true,
    discoveredAt: Math.max(0, Number(state?.proteusDiscoveredAt) || 0)
  };
}

function markProteusDiscoveredInSave(now = Date.now()) {
  if (!state) return false;
  const timestamp = Math.max(1, Number(now) || Date.now());
  const changed = state.proteusDiscovered !== true || !(Number(state.proteusDiscoveredAt) > 0);
  state.proteusDiscovered = true;
  if (!(Number(state.proteusDiscoveredAt) > 0)) state.proteusDiscoveredAt = timestamp;
  if (changed) {
    pushEvent("Proteus Biodyne was added to WebSurf bookmarks.", timestamp);
    saveState();
  }
  return true;
}

function generateProteusSpecimenId() {
  const used = new Set();
  for (const asset of Object.values(state?.customFishAssets || {})) {
    const id = typeof asset?.proteusSpecimenId === "string" ? asset.proteusSpecimenId.trim() : "";
    if (/^PB-CS-\d{5}$/.test(id)) used.add(id);
  }
  for (const fish of [...(state?.fish || []), ...(state?.storedFish || [])]) {
    const id = typeof fish?.proteusSpecimenId === "string" ? fish.proteusSpecimenId.trim() : "";
    if (/^PB-CS-\d{5}$/.test(id)) used.add(id);
  }
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const numeric = Math.floor(Math.random() * 100000);
    const id = `PB-CS-${String(numeric).padStart(5, "0")}`;
    if (!used.has(id)) return id;
  }
  const fallback = Math.floor(Date.now() % 100000);
  return `PB-CS-${String(fallback).padStart(5, "0")}`;
}

function getEngineeredAquaticSpecimenOrder(orderId = "") {
  const id = String(orderId || "").trim();
  if (!id) return null;
  const order = (state?.purchaseHistory || []).find((entry) => String(entry?.id || "") === id) || null;
  return order && (typeof isEngineeredAquaticSpecimenOrder !== "function" || isEngineeredAquaticSpecimenOrder(order))
    ? order
    : null;
}

function getEngineeredAquaticSpecimenOrderStatus(orderId = "") {
  const id = String(orderId || "").trim();
  const order = getEngineeredAquaticSpecimenOrder(id);
  if (!order) return "";
  if ((state?.engineeredSpecimenCompletedOrderIds || []).includes(id)) return "fulfillment-complete";
  if (["design-required", "specimen-configured", "fulfillment-complete"].includes(order.proteusStatus)) {
    return order.proteusStatus;
  }
  if ((state?.engineeredSpecimenDesignStartedOrderIds || []).includes(id)) return "specimen-configured";
  return "design-required";
}

function setEngineeredAquaticSpecimenOrderStatus(orderId, status, now = Date.now()) {
  const id = String(orderId || "").trim();
  const order = getEngineeredAquaticSpecimenOrder(id);
  if (!order || !["design-required", "specimen-configured", "fulfillment-complete"].includes(status)) return false;
  order.proteusStatus = status;
  order.proteusConfiguredAt = status === "specimen-configured"
    ? Math.max(0, Number(now) || Date.now())
    : status === "design-required" ? 0 : Math.max(0, Number(order.proteusConfiguredAt) || Number(now) || Date.now());
  order.proteusFulfilledAt = status === "fulfillment-complete" ? Math.max(0, Number(now) || Date.now()) : 0;
  if (!Array.isArray(state.engineeredSpecimenDesignOrderIds)) state.engineeredSpecimenDesignOrderIds = [];
  if (!Array.isArray(state.engineeredSpecimenDesignStartedOrderIds)) state.engineeredSpecimenDesignStartedOrderIds = [];
  if (!Array.isArray(state.engineeredSpecimenCompletedOrderIds)) state.engineeredSpecimenCompletedOrderIds = [];
  state.engineeredSpecimenDesignOrderIds = status === "fulfillment-complete"
    ? state.engineeredSpecimenDesignOrderIds.filter((entry) => entry !== id)
    : [...new Set([id, ...state.engineeredSpecimenDesignOrderIds])].slice(0, 20);
  state.engineeredSpecimenDesignStartedOrderIds = status === "specimen-configured"
    ? [...new Set([id, ...state.engineeredSpecimenDesignStartedOrderIds])].slice(0, 20)
    : state.engineeredSpecimenDesignStartedOrderIds.filter((entry) => entry !== id);
  state.engineeredSpecimenCompletedOrderIds = status === "fulfillment-complete"
    ? [...new Set([id, ...state.engineeredSpecimenCompletedOrderIds])].slice(0, 20)
    : state.engineeredSpecimenCompletedOrderIds.filter((entry) => entry !== id);
  return true;
}

function markEngineeredAquaticSpecimenConfigured(orderId = "") {
  const id = String(orderId || "").trim();
  if (getEngineeredAquaticSpecimenOrderStatus(id) !== "design-required") return false;
  return setEngineeredAquaticSpecimenOrderStatus(id, "specimen-configured");
}

function resetEngineeredAquaticSpecimenConfiguration(orderId = "") {
  const id = String(orderId || "").trim();
  if (getEngineeredAquaticSpecimenOrderStatus(id) !== "specimen-configured") return false;
  return setEngineeredAquaticSpecimenOrderStatus(id, "design-required");
}

function markEngineeredAquaticSpecimenDesigned(orderId = "") {
  const id = String(orderId || "").trim();
  if (getEngineeredAquaticSpecimenOrderStatus(id) !== "specimen-configured") return false;
  return setEngineeredAquaticSpecimenOrderStatus(id, "fulfillment-complete");
}

function beginEngineeredAquaticSpecimenDesign(orderId = "") {
  const id = String(orderId || "").trim();
  const order = getEngineeredAquaticSpecimenOrder(id);
  if (!order || getEngineeredAquaticSpecimenOrderStatus(id) !== "design-required") return false;
  if (order.proteusStatus !== "design-required") {
    setEngineeredAquaticSpecimenOrderStatus(id, "design-required");
    saveState();
  }
  return true;
}

function getBubbleBodegaAccountData() {
  const session = runtime.cloudSession || getCloudSession();
  return {
    username: getAccountUsernameForUser(session?.user?.id || ""),
    orders: sanitizePurchaseHistory(state?.purchaseHistory)
  };
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
    time: Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now(),
    orderId: typeof options.orderId === "string" ? options.orderId.slice(0, 80) : ""
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
  if (direction === "credit" && (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    const errorMessage = "Income is disabled while Peaceful Mode is enabled.";
    showToast(errorMessage, { force: true, tone: "neutral" });
    return { ok: false, reason: "peaceful-mode-income-disabled", amount, errorMessage };
  }
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

function buyFood(foodKey, packageId = "") {
  const food = getFoodMeta(foodKey);
  const packageMeta = getFoodPackageMeta(food, packageId);
  if (!food || !packageMeta) {
    return;
  }

  if (!shouldShowFoodInStore(food) || food.id === "upgraded") {
    showToast("That food is no longer available.");
    return;
  }

  const defaultPackage = getFoodPackageOptions(food)[0] || packageMeta;
  const purchaseCost = getFoodPurchaseCost(food.id, packageMeta.id);
  const rescueOffer = food.id === "basic"
    && packageMeta.id === defaultPackage.id
    && purchaseCost === 0
    && getBubbleBodegaRescueOfferStatus().foodAvailable;
  const unitLabel = food.id === "halloweenCandy" ? "candies" : "servings";
  const purchaseLabel = `${food.name} - ${packageMeta.name}`;
  return performCoinTransaction({
    amount: purchaseCost,
    insufficientMessage: `Not enough coins for that ${packageMeta.name.toLowerCase()}.`,
    receiptLabel: `${purchaseLabel} (${packageMeta.servings} ${unitLabel})`,
    apply: () => {
      state.foodInventory[food.id] = Math.max(0, Number(state.foodInventory?.[food.id]) || 0) + packageMeta.servings;
      if (rescueOffer) markBubbleBodegaRescueItemClaimed("food");
    },
    event: { type: "purchase", tone: "positive", text: `Bought ${purchaseLabel} (${packageMeta.servings} ${unitLabel}).` },
    toast: `${purchaseLabel} stocked. +${packageMeta.servings} ${unitLabel}.`
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

  // Seasonal food can disappear from the shop after its sale window ends, but
  // anything the player already owns must remain usable from Fish Care.
  const quantity = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
  if ((quantity <= 0 && !shouldShowFoodInStore(food)) || food.id === "upgraded") {
    showToast("That food is no longer available.");
    return { ok: false, reason: "food-locked", foodId: food.id };
  }

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
  const usePrompt = medicine.id === "betaBlocker"
    ? `${medicine.name} selected. Click inside the tank to calm the whole tank.`
    : `${medicine.name} selected. Click the fish you want to treat.`;
  showToast(runtime.medicineModeKey ? usePrompt : "Medicine mode cleared.");
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
    species.antennaAsset,
    species.legAsset,
    species.storeAsset,
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
    if (!isFishSpeciesShopUnlocked(speciesId)) {
      showToast(`${getUnlockRequirementLabel(runtime.fishMap.get(speciesId)?.unlockRequirement)} milestone required.`);
      return { ok: false, reason: "locked" };
    }
    openLocalFishPicker();
    return { ok: false, reason: "custom-upload" };
  }

  const species = runtime.fishMap.get(speciesId);
  if (!species) {
    return { ok: false, reason: "missing-species" };
  }


  const debugCatalogBypass = typeof isDebugModeEnabled === "function" && isDebugModeEnabled();
  if (species.Fish_enabled === false && !debugCatalogBypass) {
    showToast(`${species.name} is temporarily unavailable.`);
    return { ok: false, reason: "species-disabled" };
  }

  if (!isFishSpeciesShopUnlocked(species)) {
    showToast(`${species.name} has not been unlocked yet.`);
    return { ok: false, reason: "species-locked" };
  }

  const purchaseCost = getFishPurchaseCost(speciesId);
  const davyMutationPurchase = species?.davyMutation === true || String(species?.id || "").startsWith("davy-");
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
    purchasePrice: purchaseCost,
    now,
    entryStartedAt,
    entryDurationMs: FISH_ENTRY_DURATION_MS,
    entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
  });
  if (!fish) {
    showToast("Could not prepare that fish.");
    return { ok: false, reason: "fish-creation-failed" };
  }
  const currentTank = typeof getCurrentTank === "function" ? getCurrentTank() : null;
  const capacityPlacement = typeof getTankPopulationFit === "function"
    ? getTankPopulationFit(fish, currentTank)
    : { fits: true };
  const requiredWaterType = typeof getFishVariantWaterType === "function"
    ? getFishVariantWaterType(species, getFishAppearanceVariantKey(variants[selectedVariant]))
    : typeof getFishStoreWaterType === "function"
      ? getFishStoreWaterType(species)
    : String(species?.waterType || "freshwater").toLowerCase() === "saltwater" ? "saltwater" : "freshwater";
  const currentWaterType = typeof normalizeWaterType === "function"
    ? normalizeWaterType(currentTank?.waterType, "freshwater")
    : String(currentTank?.waterType || "freshwater").toLowerCase() === "saltwater" ? "saltwater" : "freshwater";
  const requiredWaterLabel = typeof getStoreWaterTypeLabel === "function"
    ? getStoreWaterTypeLabel(requiredWaterType)
    : requiredWaterType === "saltwater" ? "Saltwater" : "Freshwater";
  const waterTypeMismatch = currentWaterType !== requiredWaterType;
  const purchaseGoesToStorage = waterTypeMismatch || !capacityPlacement.fits;
  const storageReason = waterTypeMismatch ? "water" : !capacityPlacement.fits ? "capacity" : "";

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
      place: davyMutationPurchase ? "Private Seller" : undefined,
      receiptLabel: davyMutationPurchase ? "Private Seller" : undefined,
      insufficientMessage: `You need ${purchaseCost} ${pluralize("coin", purchaseCost)} for a ${species.name}.`,
      apply: () => {
        fish.acquiredAt = purchaseCompletedAt;
        fish.tankAddedAt = purchaseCompletedAt;
        fish.entryStartedAt = options.closeOverlayFirst === true
          ? purchaseCompletedAt + TUTORIAL_STORE_CLOSE_DELAY_MS
          : purchaseCompletedAt;
        fish.entrySplashTriggered = false;
        if (waterTypeMismatch && typeof addFishDirectlyToStorage === "function") {
          addFishDirectlyToStorage(fish, purchaseCompletedAt, { moodTone: "good" });
          if (typeof syncTankPopulationUsageField === "function") syncTankPopulationUsageField(currentTank);
        } else {
          addFishToTank(fish, purchaseCompletedAt);
        }
        if (speciesId === "goldfish" && purchaseCost === 0 && getBubbleBodegaRescueOfferStatus().goldfishAvailable) {
          markBubbleBodegaRescueItemClaimed("goldfish", purchaseCompletedAt);
        }
        if (options.purchaseSource === "davyjoneslocker") {
          maybeSeedDavyJonesViralIllness(fish, purchaseCompletedAt);
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
        text: storageReason === "water"
          ? `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} was purchased and sent to Storage. Requires ${requiredWaterLabel}.`
          : storageReason === "capacity"
            ? `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} was purchased and sent to Storage because the tank is full.`
            : `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} splashed into the tank.`
      },
      toast: storageReason === "water"
        ? `${fish.name} was sent to Storage. Requires ${requiredWaterLabel}.`
        : storageReason === "capacity"
          ? `${fish.name} was sent to Storage. The tank is full.`
          : `${fish.name} joined the aquarium.`
    });
    if (!transaction.ok) {
      return transaction;
    }
    if (options.purchaseSource === "davyjoneslocker" && typeof queueDavyJonesFulfillmentEmail === "function") {
      queueDavyJonesFulfillmentEmail(fish, species, purchaseCompletedAt + 1);
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

function prepareProteusZombieFishForTank(fish, now = Date.now()) {
  if (!fish) return null;
  fish.needs = sanitizeFishNeeds(fish.needs, fish, now);
  fish.needs.hunger = 100;
  fish.needs.comfort = 100;
  fish.lastAteAt = 0;
  fish.missedMealsInRow = 0;
  fish.zombieAggressionNextAt = now + randomBetween(
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MIN_MS,
    PROTEUS_ZOMBIE_AGGRESSION_COOLDOWN_MAX_MS
  );
  return fish;
}

function getProteusZombieFishVariantPurchaseOptions() {
  const species = runtime?.fishMap?.get(PROTEUS_ZOMBIE_FISH_SPECIES_ID) || null;
  if (!species || !(Number(state?.proteusZombieFishClaimedAt) > 0)) return [];
  const variants = getFishAssetVariants(species);
  return variants.slice(1).map((path, index) => ({
    index: index + 1,
    path,
    key: getFishAppearanceVariantKey(path),
    label: `Z-01 Variant ${String(index + 2).padStart(2, "0")}`,
    cost: PROTEUS_ZOMBIE_FISH_VARIANT_COST
  }));
}

async function claimProteusZombieFish(now = Date.now()) {
  if (!state || !(Number(state.proteusZombieFishUnlockedAt) > 0)) {
    showToast("Z-01 has not been authorized for this account.");
    return { ok: false, reason: "not-authorized" };
  }
  if (Number(state.proteusZombieFishOfferAt) > now) {
    showToast("Proteus transfer authorization is still pending.");
    return { ok: false, reason: "offer-pending" };
  }
  if (!(Number(state.proteusZombieFishAuthenticatedAt) > 0)) {
    showToast("Authenticate through the Proteus restricted specimen portal first.");
    return { ok: false, reason: "not-authenticated" };
  }
  if (Number(state.proteusZombieFishClaimedAt) > 0) {
    showToast("The complimentary Z-01 specimen has already been released.");
    return { ok: false, reason: "already-claimed" };
  }
  const alreadyOwned = [
    ...getAllTankFish(state),
    ...(Array.isArray(state.storedFish) ? state.storedFish : [])
  ].some((fish) => fish?.speciesId === PROTEUS_ZOMBIE_FISH_SPECIES_ID);
  if (alreadyOwned) {
    state.proteusZombieFishClaimedAt = Math.max(1, Number(state.proteusZombieFishClaimedAt) || now);
    saveState();
    showToast("Z-01 is already in your custody.");
    return { ok: false, reason: "already-owned" };
  }

  const species = runtime.fishMap.get(PROTEUS_ZOMBIE_FISH_SPECIES_ID);
  if (!species) {
    showToast("Z-01 specimen profile is unavailable.");
    return { ok: false, reason: "missing-species" };
  }

  const variants = getFishAssetVariants(species);
  const baseAsset = variants[0] || getFishAssetPath({ appearanceVariant: 0 }, species);
  const fish = createFishRecord(PROTEUS_ZOMBIE_FISH_SPECIES_ID, {
    now,
    name: "Z-01",
    appearanceVariant: 0,
    appearanceVariantKey: getFishAppearanceVariantKey(baseAsset),
    appearanceAssetPath: baseAsset,
    entryStartedAt: now,
    entryDurationMs: FISH_ENTRY_DURATION_MS,
    entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
  });
  if (!fish) return { ok: false, reason: "fish-creation-failed" };

  prepareProteusZombieFishForTank(fish, now);
  addFishToTank(fish, now);
  const z01StoredForCapacity = fish.storageState === "stored";
  state.proteusZombieFishClaimedAt = now;
  markProteusDiscoveredInSave(now);
  pushEvent(z01StoredForCapacity
    ? "Proteus Biodyne transferred custody of experimental specimen Z-01 to Storage because the tank is full."
    : "Proteus Biodyne transferred custody of experimental specimen Z-01.", now, getCurrentTank(), {
    type: "fish_added",
    fishId: fish.id,
    recapEligible: false
  });
  recordWalletTransaction({
    amount: 0,
    allowZero: true,
    direction: "neutral",
    now,
    place: "Proteus Biodyne",
    label: "Z-01 complimentary specimen transfer"
  });
  saveState();
  renderUi(now);

  void ensureFishPurchaseImageReady(fish, species).then((loaded) => {
    if (loaded) return;
    requestRuntimeImageRecovery(getFishAssetPath(fish, species), {
      kind: "proteus-zombie-fish",
      id: fish.id,
      speciesId: species.id
    });
  });
  showToast(z01StoredForCapacity
    ? "Custody transfer complete. Z-01 was sent to Storage because the tank is full."
    : "Custody transfer complete. Z-01 has been introduced to the aquarium.");
  return { ok: true, fish, species };
}

async function purchaseProteusZombieFishVariant(appearanceVariantKey, now = Date.now()) {
  if (!state || !(Number(state.proteusZombieFishAuthenticatedAt) > 0)) {
    showToast("Restricted Z-01 access has not been authenticated.");
    return { ok: false, reason: "not-authenticated" };
  }
  if (!(Number(state.proteusZombieFishClaimedAt) > 0)) {
    showToast("Accept the complimentary Z-01 specimen before requesting alternate configurations.");
    return { ok: false, reason: "base-not-claimed" };
  }
  const species = runtime.fishMap.get(PROTEUS_ZOMBIE_FISH_SPECIES_ID);
  if (!species) return { ok: false, reason: "missing-species" };
  const options = getProteusZombieFishVariantPurchaseOptions();
  const selected = options.find((entry) => entry.key === String(appearanceVariantKey || ""));
  if (!selected) {
    showToast("That Z-01 configuration is not currently available.");
    return { ok: false, reason: "variant-unavailable" };
  }

  const fish = createFishRecord(PROTEUS_ZOMBIE_FISH_SPECIES_ID, {
    now,
    name: selected.label,
    appearanceVariant: selected.index,
    appearanceVariantKey: selected.key,
    appearanceAssetPath: selected.path,
    entryStartedAt: now,
    entryDurationMs: FISH_ENTRY_DURATION_MS,
    entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
  });
  if (!fish) return { ok: false, reason: "fish-creation-failed" };
  prepareProteusZombieFishForTank(fish, now);

  const transaction = performCoinTransaction({
    amount: selected.cost,
    now,
    place: "Proteus Biodyne",
    receiptLabel: `${selected.label} specimen transfer`,
    insufficientMessage: `Proteus requires ${selected.cost} ${pluralize("coin", selected.cost)} to release this configuration.`,
    apply: () => {
      addFishToTank(fish, now);
      return true;
    },
    event: {
      type: "fish_added",
      tone: "positive",
      fishId: fish.id,
      recapEligible: false,
      text: `Proteus Biodyne transferred ${selected.label}.`
    },
    toast: `${selected.label} transferred to the aquarium.`
  });
  if (!transaction.ok) return transaction;

  void ensureFishPurchaseImageReady(fish, species).then((loaded) => {
    if (loaded) return;
    requestRuntimeImageRecovery(getFishAssetPath(fish, species), {
      kind: "proteus-zombie-fish-variant",
      id: fish.id,
      speciesId: species.id
    });
  });
  return { ok: true, fish, species, variant: selected };
}

async function buyAnotherCustomFish(fishId) {
  if (!isFishSpeciesShopUnlocked(CUSTOM_FISH_SHOP_KEY)) {
    showToast(`${getUnlockRequirementLabel(runtime.fishMap.get(CUSTOM_FISH_SHOP_KEY)?.unlockRequirement)} milestone required.`);
    return { ok: false, reason: "species-locked" };
  }
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
    purchasePrice: purchaseCost,
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
  const customCapacityPlacement = typeof getTankPopulationFit === "function"
    ? getTankPopulationFit(fish, getCurrentTank())
    : { fits: true };
  const customPurchaseGoesToStorage = !customCapacityPlacement.fits;

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
      },
      event: {
        type: "fish_added",
        tone: "positive",
        fishId: fish.id,
        text: customPurchaseGoesToStorage
          ? `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} was purchased and sent to Storage because the tank is full.`
          : `${fish.name} the ${getFishDisplaySpeciesName(fish, species)} splashed into the tank.`
      },
      toast: customPurchaseGoesToStorage
        ? `Another ${species.name} was sent to Storage. The tank is full.`
        : `Another ${species.name} joined the aquarium.`
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
  const unlocked = customFish
    ? isFishSpeciesShopUnlocked(CUSTOM_FISH_SHOP_KEY)
    : isFishSpeciesShopUnlocked(details.baseSpecies);
  return {
    ...details,
    cost,
    customFish,
    unlocked,
    canAfford: state.coins >= cost,
    canBuy: unlocked
  };
}

function getPendingFishSellDetails() {
  const details = getPendingFishActionDetails("sell");
  if (!details) {
    return null;
  }

  const dead = isFishDead(details.fish);
  const proteusRestricted = isProteusZombieFish(details.fish);
  const juvenile = !dead && !proteusRestricted && isFishJuvenile(details.fish);
  return {
    ...details,
    dead,
    juvenile,
    proteusRestricted,
    resaleValue: getFishRehomeValue(details.fish),
    ageDays: Math.max(0, Math.floor(getFishAgeMs(details.fish) / DAY_MS)),
    canSell: !dead && !juvenile && !proteusRestricted
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
      ? "Enable Violence & Gore to buy this fish."
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
    validate: (details) => details?.proteusRestricted
      ? "Proteus retains ownership of Z-01. The specimen cannot be rehomed."
      : details?.dead
        ? "Dead fish cannot be rehomed."
        : details?.juvenile
        ? "Baby fish need time to grow before they can be rehomed."
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
      ? "Enable Violence & Gore to buy this fish."
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
      ? (details?.proteusRestricted
        ? "Proteus retains ownership of Z-01. The specimen cannot be rehomed."
        : details?.dead
          ? "Dead fish cannot be rehomed."
          : "Baby fish need time to grow before they can be rehomed.")
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
  const currentTank = typeof getCurrentTank === "function" ? getCurrentTank() : null;
  const activeWaterType = typeof normalizeWaterType === "function"
    ? normalizeWaterType(currentTank?.waterType, "freshwater")
    : String(currentTank?.waterType || "freshwater").toLowerCase() === "saltwater" ? "saltwater" : "freshwater";
  const waterRequirement = typeof getStoreWaterRequirementLabel === "function"
    ? getStoreWaterRequirementLabel("decor", decor, activeWaterType)
    : "";
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
    event: {
      type: "decor",
      tone: "positive",
      decorKey: resolvedDecorKey,
      text: waterRequirement ? `Bought ${decor.name}. ${waterRequirement}; stored safely.` : `Bought ${decor.name}.`
    },
    toast: waterRequirement
      ? `${decor.name} is in Storage. ${waterRequirement}.`
      : `${decor.name} is waiting in storage.`
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
    living: typeof isLivingDecorEntry === "function" && isLivingDecorEntry(decor),
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

function buySubstrate(substrateId) {
  const meta = getSubstrateMeta(substrateId);
  if (!meta) return { ok: false, reason: "missing-substrate" };
  state.ownedSubstrateInventory ||= sanitizeOwnedSubstrateInventory(null);
  if (isSubstrateOwned(meta.id)) {
    setTankSubstrateStyle(meta.id);
    return { ok: true, owned: true };
  }
  return performCoinTransaction({
    amount: meta.cost,
    receiptLabel: `Unlocked ${meta.name} substrate`,
    apply: () => {
      state.ownedSubstrateInventory[meta.id] = 1;
      const tank = getCurrentTank();
      if (tank) tank.substrateStyle = meta.id;
      runtime.gravelBedCacheKey = "";
      runtime.gravelBedCanvas = null;
      runtime.gravelCapCanvas = null;
      invalidateCustomGravelVisualCaches();
    },
    event: { type: "purchase", tone: "positive", text: `Unlocked the ${meta.name} substrate.` },
    toast: `${meta.name} unlocked and applied.`
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

  const result = performCoinTransaction({
    amount: background.cost,
    insufficientMessage: `You need ${background.cost} ${pluralize("coin", background.cost)} for ${background.name}.`,
    apply: () => {
      state.ownedBackgroundInventory[backgroundKey] = 1;
      state.selectedBackground = backgroundKey;
    },
    event: { type: "purchase", tone: "positive", text: `Unlocked the ${background.name} background.` },
    toast: `${background.name} unlocked and applied.`
  });
  if (result?.ok) {
    void ensureBackgroundImageReady(backgroundKey);
  }
  return result;
}


function buyWaterTreatmentKit(kitId) {
  const kit = WATER_TREATMENT_KITS[String(kitId || "")];
  if (!kit) return { ok: false, reason: "missing-kit" };
  return performCoinTransaction({
    amount: kit.cost,
    insufficientMessage: `You need ${kit.cost} ${pluralize("coin", kit.cost)} for ${kit.name}.`,
    apply: () => {
      state.waterTreatmentInventory ||= { freshwater: 0, saltwater: 0 };
      state.waterTreatmentInventory[kit.id] = Math.max(0, Math.floor(Number(state.waterTreatmentInventory[kit.id]) || 0)) + 1;
    },
    event: { type: "equipment", tone: "positive", text: `Purchased ${kit.name}.` },
    toast: `${kit.name} purchased.`
  });
}

function getWaterConversionIncompatibilities(tank, targetWaterType) {
  const resolvedTank = tank || getCurrentTank();
  const rawTarget = String(targetWaterType || "").trim().toLowerCase();
  const targetType = ["freshwater", "saltwater"].includes(rawTarget) ? rawTarget : "freshwater";
  if (!resolvedTank) return { fish: [], decor: [] };
  const fish = (resolvedTank.fish || []).filter((entry) => {
    if (!entry || isFishDead(entry)) return false;
    const species = getSpeciesForFish(entry);
    return species && getFishStoreWaterType(species) !== targetType;
  });
  const decor = (resolvedTank.placedDecor || []).filter((item) => {
    const key = normalizeDecorKey(item?.decorKey || "");
    const meta = runtime.decorMap?.get?.(key) || runtime.decorMeta?.[key] || null;
    return meta?.living === true && !isDecorCompatibleWithWaterType(meta, targetType);
  });
  return { fish, decor };
}

function requestWaterTypeConversion(targetWaterType) {
  const tank = getCurrentTank();
  const rawTarget = String(targetWaterType || "").trim().toLowerCase();
  const targetType = ["freshwater", "saltwater"].includes(rawTarget) ? rawTarget : "";
  const kit = WATER_TREATMENT_KITS[targetType];
  if (!tank || !kit) return { ok: false, reason: "missing-target" };
  const currentType = normalizeWaterType(tank.waterType, "freshwater");
  if (currentType === targetType) {
    runtime.pendingWaterConversionTarget = "";
    showToast(`This tank is already ${getStoreWaterTypeLabel(currentType)}.`);
    renderEditTankTray();
    return { ok: false, reason: "already-active" };
  }
  runtime.pendingWaterConversionTarget = targetType;
  renderEditTankTray();
  return { ok: true, pending: true, incompatibilities: getWaterConversionIncompatibilities(tank, targetType) };
}

function cancelWaterTypeConversion() {
  runtime.pendingWaterConversionTarget = "";
  renderEditTankTray();
  return true;
}

function confirmWaterTypeConversion(targetWaterType = runtime.pendingWaterConversionTarget) {
  const tank = getCurrentTank();
  const rawTarget = String(targetWaterType || "").trim().toLowerCase();
  const targetType = ["freshwater", "saltwater"].includes(rawTarget) ? rawTarget : "";
  const kit = WATER_TREATMENT_KITS[targetType];
  if (!kit || !tank) return { ok: false, reason: "missing-target" };
  const currentType = normalizeWaterType(tank.waterType, "freshwater");
  if (currentType === targetType) {
    runtime.pendingWaterConversionTarget = "";
    renderEditTankTray();
    return { ok: false, reason: "already-active" };
  }
  const owned = Math.max(0, Math.floor(Number(state.waterTreatmentInventory?.[kit.id]) || 0));
  if (owned <= 0) {
    showToast(`Buy a ${kit.name} first.`);
    renderEditTankTray();
    return { ok: false, reason: "not-owned" };
  }
  const before = getWaterConversionIncompatibilities(tank, targetType);
  state.waterTreatmentInventory[kit.id] = owned - 1;
  tank.waterType = targetType;
  const conversionNow = Date.now();
  if (typeof processFishConditionFramework === "function") processFishConditionFramework(conversionNow);
  const decorSync = typeof syncTankLivingDecorActivity === "function" ? syncTankLivingDecorActivity(tank) : { deactivated: [], activated: [] };
  for (const item of decorSync.deactivated || []) {
    if (typeof clearDecorResidenceAssignments === "function") clearDecorResidenceAssignments(item.id, { save: false });
  }
  runtime.decorHangoutZonesKey = "";
  runtime.pendingWaterConversionTarget = "";
  const fishCount = before.fish.length;
  const decorCount = before.decor.length;
  pushEvent(`Converted ${tank.name || "the tank"} to ${getStoreWaterTypeLabel(targetType)}.${fishCount ? ` ${fishCount} incompatible ${pluralize("fish", fishCount)} now face osmotic stress.` : ""}${decorCount ? ` ${decorCount} living ${pluralize("decoration", decorCount)} became inactive.` : ""}`, conversionNow, tank, { type: "equipment" });
  saveState();
  renderUi(conversionNow);
  renderEquipmentShop();
  renderEditTankTray();
  showToast(`${tank.name || "Tank"} is now ${getStoreWaterTypeLabel(targetType)}.`);
  return { ok: true, mismatchedFish: fishCount, inactiveDecor: decorCount };
}

function useWaterTreatmentKit(kitId) {
  const kit = WATER_TREATMENT_KITS[String(kitId || "")];
  if (!kit) return { ok: false, reason: "missing-kit" };
  openEditOverlayMode("water", { source: "store", collapseSidebar: true });
  return requestWaterTypeConversion(kit.targetWaterType);
}

function buyAutoDispenser(options = {}) {
  return performCoinTransaction({
    amount: AUTO_DISPENSER_COST,
    insufficientMessage: `You need ${AUTO_DISPENSER_COST} ${pluralize("coin", AUTO_DISPENSER_COST)} for the pellet dispenser.`,
    apply: () => {
      const existing = state.autoDispenser;
      state.autoDispenser = createDefaultAutoDispenserState({
        ...existing,
        installed: existing?.installed === true,
        stored: true,
        storedCount: Math.max(0, Math.floor(Number(existing?.storedCount) || 0)) + 1,
        appearanceVariantKey: options.appearanceVariantKey || existing?.appearanceVariantKey || ""
      });
    },
    event: { type: "equipment", tone: "positive", text: "Purchased a pellet dispenser. Deploy it from Edit > Equipment." },
    toast: "Pellet dispenser purchased. Deploy it from Edit > Equipment."
  });
}
