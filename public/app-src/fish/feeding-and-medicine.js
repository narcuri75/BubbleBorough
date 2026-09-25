// Source fragment: fish/feeding-and-medicine.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function canFishEatFoodPellet(fish, foodKey = "basic", now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return false;
  }

  if (foodKey === "halloweenCandy") return !hasActiveCandyBoost(fish, now);
  const spawningFood = String(foodKey || "") === "frisky";
  if (spawningFood) {
    return canFoodSatisfyFishMeal(fish, foodKey)
      && (Number(fish.satiatedUntil) || 0) <= now
      && !getFishFoodRefusalReason(fish, foodKey, now);
  }
  const optionalDetritusSnack = typeof isDetritusFish === "function"
    && isDetritusFish(fish)
    && String(foodKey || "") === "algaeWafers";
  if (optionalDetritusSnack) {
    return (Number(fish.satiatedUntil) || 0) <= now;
  }
  if (isProteusZombieFish(fish)) {
    return false;
  }

  const hunger = getFishNeedValue(fish, "hunger", now);
  const visiblyHungry = hunger <= FISH_HUNGER_LOW_THRESHOLD;

  // Refusal is no longer a random comfort/personality roll or a cooldown gate.
  // A fish can target food again as soon as the real blocker (panic, immediate
  // fear, or severe sickness) has cleared. foodRefusalUntil remains useful as
  // behavior/history telemetry, but it does not itself prevent eating.
  if ((Number(fish.satiatedUntil) || 0) > now && !visiblyHungry) {
    return false;
  }
  if (hunger >= FISH_WILLING_TO_EAT_HUNGER_MAX) {
    return false;
  }
  if (!canFoodSatisfyFishMeal(fish, foodKey)) {
    return false;
  }
  if (getFishFoodRefusalReason(fish, foodKey, now)) {
    return false;
  }

  return true;
}

function getFoodPelletSettledAgeMs(pellet, now = Date.now()) {
  if (!pellet?.settled) {
    return 0;
  }

  return Math.max(0, now - (Number.isFinite(Number(pellet.settledAt)) ? Number(pellet.settledAt) : now));
}

function canFishTargetFoodPellet(fish, pellet, now = Date.now()) {
  if (!pellet || !canFishEatFoodPellet(fish, pellet.foodKey, now)) {
    return false;
  }

  if (fish?.speciesId === "pilot-fish" && pellet.foodKey === "chum") {
    if (!pellet.settled) return false;
    const scrapAgeMs = getFoodPelletSettledAgeMs(pellet, now);
    if (scrapAgeMs < 2500 || scrapAgeMs > FOOD_PELLET_SETTLED_STALE_TARGET_MS) return false;
  }

  if (!pellet.settled) {
    return true;
  }

  const settledAgeMs = getFoodPelletSettledAgeMs(pellet, now);
  if (settledAgeMs <= FOOD_PELLET_SETTLED_OPEN_TARGET_MS) {
    return true;
  }

  if (settledAgeMs > FOOD_PELLET_SETTLED_STALE_TARGET_MS) {
    return false;
  }

  return Math.hypot((fish.xNorm || 0.5) - pellet.xNorm, (fish.yNorm || 0.5) - pellet.yNorm) <= FOOD_PELLET_SETTLED_NEARBY_TARGET_RADIUS_NORM;
}

function ensureMealHistoryEntry(slotKey, now = Date.now(), tank = getCurrentTank()) {
  if (!slotKey) {
    return null;
  }

  if (!state.mealHistory || typeof state.mealHistory !== "object") {
    state.mealHistory = {};
  }

  const existing = getMealHistoryEntry(slotKey, tank);
  if (existing) {
    existing.fedAt = Math.max(Number(existing.fedAt) || 0, now);
    existing.offeredAt = Math.max(0, Number(existing.offeredAt) || 0);
    existing.coinsEarned = Math.max(0, Number(existing.coinsEarned) || 0);
    existing.fishIds = Array.isArray(existing.fishIds) ? [...new Set(existing.fishIds.map((value) => String(value)))] : [];
    existing.offeredFishIds = Array.isArray(existing.offeredFishIds) ? [...new Set(existing.offeredFishIds.map((value) => String(value)))] : [];
    return existing;
  }

  state.mealHistory[slotKey] = {
    fedAt: now,
    offeredAt: 0,
    coinsEarned: 0,
    fishIds: [],
    offeredFishIds: []
  };
  return state.mealHistory[slotKey];
}

function recordFishMealCredit(fish, now = Date.now(), tank = getCurrentTank()) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    return 0;
  }
  if (!fish || isMealFreeFish(fish)) {
    return 0;
  }

  recordFishDailyMealIndicator(fish, now, tank);
  const entry = ensureMealHistoryEntry(`feeding-care-${getLocalDayKey(now)}`, now, tank);
  if (!entry) {
    return 0;
  }
  const fedFishIds = new Set(entry.fishIds);
  if (fedFishIds.has(fish.id)) {
    return 0;
  }

  fedFishIds.add(fish.id);
  entry.fishIds = [...fedFishIds];
  entry.fedAt = Math.max(Number(entry.fedAt) || 0, now);
  fish.lastAteAt = now;
  const remainingMealCoins = Math.max(0, FISH_DAILY_FEEDING_CARE_COIN_CAP - (Math.max(0, Number(entry.coinsEarned) || 0)));
  const mealCoins = Math.min(remainingMealCoins, Math.max(0, Number(getSpeciesForFish(fish)?.mealCoins) || 0));
  entry.coinsEarned = Math.max(0, Number(entry.coinsEarned) || 0) + mealCoins;
  state.coins = Math.min(MAX_WALLET_COINS, state.coins + mealCoins);
  const fishLabel = String(fish.name || getSpeciesForFish(fish)?.name || "Fish");
  recordWalletTransaction({
    amount: mealCoins,
    allowZero: true,
    direction: mealCoins > 0 ? "credit" : "neutral",
    now,
    place: getTankLabel(tank),
    label: mealCoins > 0 ? `Fed ${fishLabel}` : `Fed ${fishLabel} (no coin reward)`
  });
  return mealCoins;
}

function getDailyMealIndicatorSlots(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const dayKey = getLocalDayKey(timestamp);
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  const nextMidnight = new Date(midnight);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  return [
    { key: `daily-feeding-${dayKey}-am`, label: "AM", start: midnight.getTime(), end: noon.getTime() },
    { key: `daily-feeding-${dayKey}-pm`, label: "PM", start: noon.getTime(), end: nextMidnight.getTime() }
  ];
}

function getDailyMealIndicatorSlot(timestamp = Date.now()) {
  const slots = getDailyMealIndicatorSlots(timestamp);
  return new Date(timestamp).getHours() < 12 ? slots[0] : slots[1];
}

function recordFishDailyMealIndicator(fish, now = Date.now(), tank = getCurrentTank()) {
  if (!fish || isMealFreeFish(fish)) {
    return false;
  }
  const slot = getDailyMealIndicatorSlot(now);
  const entry = ensureMealHistoryEntry(slot.key, now, tank);
  if (!entry) {
    return false;
  }
  const fedFishIds = new Set(Array.isArray(entry.fishIds) ? entry.fishIds : []);
  const beforeSize = fedFishIds.size;
  fedFishIds.add(fish.id);
  entry.fishIds = [...fedFishIds];
  entry.fedAt = Math.max(Number(entry.fedAt) || 0, now);
  return fedFishIds.size !== beforeSize;
}

function getFishDailyMealIndicatorState(fish, now = Date.now(), tank = getCurrentTank()) {
  const [amSlot, pmSlot] = getDailyMealIndicatorSlots(now);
  return {
    am: hasFishEatenInSlot(fish, amSlot, tank),
    pm: hasFishEatenInSlot(fish, pmSlot, tank)
  };
}

function getDailyFeedingCareStatus(tank = getCurrentTank(), now = Date.now()) {
  const livingFish = (tank?.fish || [])
    .filter((fish) => fish && !isFishDead(fish) && !isMealFreeFish(fish));
  const entry = getMealHistoryEntry(`feeding-care-${getLocalDayKey(now)}`, tank);
  const rewardedFishIds = new Set(Array.isArray(entry?.fishIds) ? entry.fishIds : []);
  const earned = clamp(Math.max(0, Number(entry?.coinsEarned) || 0), 0, FISH_DAILY_FEEDING_CARE_COIN_CAP);
  const remainingCap = Math.max(0, FISH_DAILY_FEEDING_CARE_COIN_CAP - earned);
  const available = livingFish
    .filter((fish) => !rewardedFishIds.has(fish.id))
    .reduce((total, fish) => total + Math.max(0, Number(getSpeciesForFish(fish)?.mealCoins) || 0), 0);
  return {
    earned,
    remainingCap,
    eligibleCoins: Math.min(remainingCap, available),
    eligibleFish: livingFish.filter((fish) => !rewardedFishIds.has(fish.id)).length
  };
}

function hasFishEatenInSlot(fish, slotOrKey, tank = getCurrentTank()) {
  if (!fish || isMealFreeFish(fish)) {
    return true;
  }

  const slotKey = typeof slotOrKey === "string" ? slotOrKey : slotOrKey?.key;
  if (!slotKey) {
    return false;
  }

  const entry = getMealHistoryEntry(slotKey, tank);
  if (!entry || !Array.isArray(entry.fishIds)) {
    return false;
  }

  return entry.fishIds.includes(fish.id);
}

function scheduleFishPoop(fish, now = Date.now(), tank = getCurrentTank()) {
  if (!fish || isFishDead(fish) || !tank) {
    return;
  }

  if (!Array.isArray(tank.pendingPoops)) {
    tank.pendingPoops = [];
  }

  const dueAt = now + HOUR_MS + Math.random() * (2 * HOUR_MS);
  fish.nextWasteAt = dueAt;
  tank.pendingPoops.push({
    id: createId("poop"),
    fishId: fish.id,
    dueAt
  });
}

function assignPelletToFish(fish, pellet, now = Date.now()) {
  if (!fish || !pellet) {
    return false;
  }

  // Food pursuit outranks autonomous passive actions. Rest, sleep, hide, and
  // similar autonomous work must not steal movement back from a hungry fish.
  // Explicit user-queued actions are preserved.
  const actionQueue = getFishActionQueueState(fish.id);
  if (actionQueue) {
    const activeAction = actionQueue.active;
    if (
      activeAction
      && activeAction.autonomous === true
      && activeAction.action !== "eat"
      && activeAction.interruptible !== false
    ) {
      finishFishActionQueueItem(fish, activeAction, now, { cancelled: true });
      actionQueue.active = null;
      actionQueue.restUntil = 0;
    }
    actionQueue.items = actionQueue.items.filter((item) => item?.autonomous !== true || item.action === "eat");
    trimFishActionQueue(fish.id);
  }

  pellet.targetFishId = fish.id;
  clearFishSchoolFollowState(fish);
  fish.activity = "feeding";
  fish.feedingPelletId = pellet.id;
  fish.targetAt = now + 4 * 60 * 1000;
  fish.targetXNorm = pellet.xNorm;
  fish.targetYNorm = pellet.yNorm;
  recordFishFeedingMemory(fish, pellet, now);
  if (["greedy", "routine-loving", "curious"].includes(getFishPersonality(fish))) {
    setFishBehaviorIntent(fish, pellet.dropStartXNorm != null ? "feeder memory" : "feeding memory", getFishPersonality(fish), now, {
      durationMs: 20 * 1000
    });
  }
  return true;
}

function assignFloatingPelletsToHungryFish(now = Date.now()) {
  let changed = false;

  for (const pellet of state.floatingPellets) {
    updatePelletSettledState(pellet, now);
    const currentTarget = pellet.targetFishId
      ? state.fish.find((fish) => fish.id === pellet.targetFishId)
      : null;
    if (currentTarget && canFishTargetFoodPellet(currentTarget, pellet, now)) {
      continue;
    }

    if (currentTarget?.feedingPelletId === pellet.id) {
      currentTarget.feedingPelletId = null;
      if (!isFishDead(currentTarget)) {
        currentTarget.activity = "roam";
        currentTarget.targetAt = now + 1200 + Math.random() * 1800;
      }
    }
    pellet.targetFishId = "";

    const candidates = state.fish
      .filter((fish) => canFishTargetFoodPellet(fish, pellet, now) && !fish.feedingPelletId)
      .sort((left, right) => (
        getFishNeedValue(left, "hunger", now) - getFishNeedValue(right, "hunger", now)
        || Math.hypot((left.xNorm || 0) - pellet.xNorm, (left.yNorm || 0) - pellet.yNorm)
        - Math.hypot((right.xNorm || 0) - pellet.xNorm, (right.yNorm || 0) - pellet.yNorm)
      ));
    if (candidates.length) {
      assignPelletToFish(candidates[0], pellet, now);
      changed = true;
    }
  }

  return changed;
}

function updatePelletSettledState(pellet, now = Date.now()) {
  if (!pellet) {
    return false;
  }

  const floorYNorm = getPelletFloorYNormAtX(pellet.xNorm);
  if (pellet.surfaceFloating) {
    const surfaceYNorm = clamp(WATER_SURFACE_Y / TANK_HEIGHT + 0.035, 0.09, 0.24);
    if (Math.abs((Number(pellet.yNorm) || surfaceYNorm) - surfaceYNorm) > 0.0004) {
      pellet.yNorm = surfaceYNorm;
      return true;
    }
    return false;
  }
  pellet.floorYNorm = floorYNorm;
  let changed = false;
  const previousYNorm = Number(pellet.yNorm) || floorYNorm;

  if (pellet.settled) {
    if (Math.abs(previousYNorm - floorYNorm) > 0.0004) {
      pellet.yNorm = floorYNorm;
      return true;
    }
    return false;
  }

  const startYNorm = clamp(
    Number.isFinite(Number(pellet.startYNorm)) ? Number(pellet.startYNorm) : Number(pellet.yNorm) || WATER_SURFACE_Y / TANK_HEIGHT + 0.08,
    0.09,
    floorYNorm
  );
  pellet.startYNorm = startYNorm;
  const algaeWaferDrop = pellet.foodKey === "algaeWafers";
  const sinkDuration = Math.max(1000, Number(pellet.sinkDurationMs) || (algaeWaferDrop ? ALGAE_WAFER_SINK_DURATION_MS : FOOD_PELLET_SINK_DURATION_MS));
  const progress = clamp((now - pellet.createdAt) / sinkDuration, 0, 1);
  if (progress >= 1 || (Number(pellet.yNorm) || 0) >= floorYNorm - 0.002) {
    pellet.settled = true;
    pellet.settledAt = Number.isFinite(Number(pellet.settledAt)) ? Number(pellet.settledAt) : now;
    pellet.yNorm = floorYNorm;
    pellet.targetFishId = "";
    return true;
  }

  const easedProgress = progress;
  const nextYNorm = clamp(startYNorm + (floorYNorm - startYNorm) * easedProgress, 0.09, floorYNorm);
  if (Math.abs(previousYNorm - nextYNorm) > 0.0004) {
    pellet.yNorm = nextYNorm;
    changed = true;
  }

  return changed;
}

function releasePelletsTargetingFishIds(fishIds) {
  const ids = fishIds instanceof Set
    ? fishIds
    : new Set([fishIds].flat().filter((value) => typeof value === "string" && value));
  if (!ids.size || !state?.floatingPellets) {
    return false;
  }

  let changed = false;
  for (const pellet of state.floatingPellets) {
    if (ids.has(pellet.targetFishId)) {
      pellet.targetFishId = "";
      changed = true;
    }
  }
  return changed;
}

function createDroppedFoodPellet(foodKey, xNorm, yNorm, now = Date.now(), options = {}) {
  const food = getFoodMeta(foodKey);
  const dropStyle = getFoodDropStyle(food);
  const pelletLikeDrop = dropStyle !== "sprite" || isPelletSizedFoodSprite(food);
  const spread = Number.isFinite(Number(options.spreadNorm))
    ? Math.max(0, Number(options.spreadNorm))
    : FOOD_DROP_SPREAD_NORM;
  const hasCustomDropStart = options.dropStartXNorm != null
    && options.dropStartYNorm != null
    && Number.isFinite(Number(options.dropStartXNorm))
    && Number.isFinite(Number(options.dropStartYNorm));
  const dropXNorm = clamp(Number(xNorm) + randomBetween(-spread, spread), 0.08, 0.92);
  // A hand-fed click chooses the horizontal spot, not an underwater launch
  // point. Food enters at the surface and then follows its own sink/float
  // behavior; only equipment drops provide an explicit start position.
  const surfaceYNorm = WATER_SURFACE_Y / TANK_HEIGHT + (food.surfaceFloating ? 0.035 : 0.055);
  const dropYNorm = hasCustomDropStart
    ? clamp(Number(yNorm), 0.09, 0.9)
    : clamp(surfaceYNorm, 0.09, 0.24);
  return sanitizePellet({
    id: createId("pellet"),
    foodKey,
    spritePath: resolveStoredFoodDropSpritePath(food),
    targetFishId: "",
    xNorm: dropXNorm,
    yNorm: dropYNorm,
    startYNorm: dropYNorm,
    sway: Math.random(),
    rotation: pelletLikeDrop ? randomBetween(-0.22, 0.22) : randomBetween(-0.95, 0.95),
    scale: pelletLikeDrop ? randomBetween(0.94, 1.08) : randomBetween(0.92, 1.18),
    surfaceFloating: Boolean(food.surfaceFloating),
    sinkDurationMs: food.id === "algaeWafers"
      ? ALGAE_WAFER_SINK_DURATION_MS * randomBetween(0.92, 1.08)
      : FOOD_PELLET_SINK_DURATION_MS * randomBetween(0.85, 1.2),
    dropStartXNorm: hasCustomDropStart ? Number(options.dropStartXNorm) : null,
    dropStartYNorm: hasCustomDropStart ? Number(options.dropStartYNorm) : null,
    dropDurationMs: hasCustomDropStart ? Number(options.dropDurationMs) || AUTO_DISPENSER_DROP_DURATION_MS : null,
    createdAt: now,
    expiresAt: now + (food.surfaceFloating ? SURFACE_FOOD_LIFETIME_MS : FOOD_PELLET_SETTLED_LIFETIME_MS)
  });
}

function createAutoDispenserStoredPellet(foodKey) {
  const foodMeta = getFoodMeta(foodKey);
  if (!foodMeta || !isFoodAllowedInAutoDispenser(foodMeta)) {
    return null;
  }

  return sanitizeDispenserStoredPellet({
    id: createId("dispenser-pellet"),
    foodKey: foodMeta.id,
    spritePath: resolveStoredFoodDropSpritePath(foodMeta)
  });
}

function createAutoDispenserDroppedPellet(storedPellet, now = Date.now()) {
  if (!storedPellet) {
    return null;
  }

  const layout = getAutoDispenserLayout();
  const food = getFoodMeta(storedPellet.foodKey);
  const dropStyle = getFoodDropStyle(food);
  const pelletLikeDrop = dropStyle !== "sprite" || isPelletSizedFoodSprite(food);
  const dispenserScale = layout.scale || getViewportStableAssetScale();
  const nozzleXNorm = clamp((layout.nozzle.x + AUTO_DISPENSER_DROP_X_OFFSET_PX * dispenserScale) / TANK_WIDTH, 0.08, 0.92);
  const nozzleYNorm = clamp(layout.nozzle.y / TANK_HEIGHT, 0.02, AUTO_DISPENSER_PELLET_MAX_Y_NORM);
  const targetXNorm = clamp(
    nozzleXNorm + randomBetween(-AUTO_DISPENSER_DROP_DRIFT_PX, AUTO_DISPENSER_DROP_DRIFT_PX) * dispenserScale / TANK_WIDTH,
    0.08,
    0.92
  );
  const targetYNorm = clamp(
    (layout.nozzle.y + AUTO_DISPENSER_DROP_DISTANCE_PX * dispenserScale) / TANK_HEIGHT,
    nozzleYNorm + 0.035,
    0.48
  );
  const pellet = sanitizePellet({
    id: createId("pellet"),
    foodKey: storedPellet.foodKey,
    spritePath: resolveStoredFoodDropSpritePath(food, storedPellet.spritePath),
    targetFishId: "",
    xNorm: targetXNorm,
    yNorm: targetYNorm,
    startYNorm: targetYNorm,
    sway: Math.random(),
    rotation: pelletLikeDrop ? randomBetween(-0.22, 0.22) : randomBetween(-0.95, 0.95),
    scale: pelletLikeDrop ? randomBetween(0.94, 1.08) : randomBetween(0.92, 1.18),
    sinkDurationMs: food.id === "algaeWafers"
      ? ALGAE_WAFER_SINK_DURATION_MS * randomBetween(0.92, 1.08)
      : FOOD_PELLET_SINK_DURATION_MS * randomBetween(0.85, 1.2),
    dropStartXNorm: nozzleXNorm,
    dropStartYNorm: nozzleYNorm,
    dropDurationMs: AUTO_DISPENSER_DROP_DURATION_MS,
    createdAt: now,
    expiresAt: now + 10 * MINUTE_MS
  });
  if (pellet && storedPellet.spritePath) {
    pellet.spritePath = resolveStoredFoodDropSpritePath(food, storedPellet.spritePath);
  }
  return pellet;
}

function setAutoDispenserMealPortion(nextAmount, now = Date.now(), options = {}) {
  if (!hasAutoDispenserInstalled()) {
    return false;
  }

  const dispenser = state.autoDispenser;
  const clampedAmount = clamp(
    Math.round(Number(nextAmount) || 0),
    AUTO_DISPENSER_PORTION_MIN,
    AUTO_DISPENSER_PORTION_MAX
  );
  if (dispenser.mealPortion === clampedAmount) {
    return false;
  }

  dispenser.mealPortion = clampedAmount;
  if (clampedAmount <= 0) {
    dispenser.refillAlert = false;
  }

  saveState();
  renderUi(now);
  if (options.toast !== false) {
    showToast(`Dispenser manual release set to ${String(clampedAmount).padStart(2, "0")}.`);
  }
  return true;
}

function adjustAutoDispenserMealPortion(delta, now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    return false;
  }

  return setAutoDispenserMealPortion((state.autoDispenser?.mealPortion || 0) + delta, now, { toast: false });
}

function getFoodCompatibleFishInTank(foodKey, tank = getCurrentTank()) {
  const fish = Array.isArray(tank?.fish) ? tank.fish : [];
  return fish.filter((entry) => entry && !isFishDead(entry) && canFoodSatisfyFishMeal(entry, foodKey));
}

function getFoodCompatibleFishAcrossTanks(foodKey, tanks = [getCurrentTank()]) {
  return (Array.isArray(tanks) ? tanks : [])
    .filter(Boolean)
    .flatMap((tank) => getFoodCompatibleFishInTank(foodKey, tank));
}

function getFoodIncompatibilityMessage(food) {
  const name = food?.name || "That food";
  if (food?.id === "frisky") return "No breeding-ready adult fish in this tank can use Spawning Food.";
  return `No fish in this tank can eat ${name}.`;
}

function loadSelectedFoodIntoAutoDispenser(now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    return false;
  }

  const dispenser = state.autoDispenser;
  const foodKey = runtime.feedingModeFoodKey;
  const food = getFoodMeta(foodKey);
  if (!food) {
    showToast("Select a food from the tray first.");
    return true;
  }

  if (!isFoodAllowedInAutoDispenser(food)) {
    showToast(`${food.name} is too fine for the dispenser. Drop it by hand.`);
    return true;
  }

  const quantity = Math.max(0, Math.floor(Number(state.foodInventory?.[food.id]) || 0));
  if (quantity <= 0) {
    runtime.feedingModeFoodKey = "";
    renderUi(now);
    showToast("That food is out of stock.");
    return true;
  }

  const connectedTanks = typeof getConnectedFoodTanks === "function"
    ? getConnectedFoodTanks(getCurrentTank())
    : [getCurrentTank()];
  if (food.id !== "halloweenCandy" && !getFoodCompatibleFishAcrossTanks(food.id, connectedTanks).length) {
    showToast(getFoodIncompatibilityMessage(food));
    return true;
  }

  const loadedBefore = getAutoDispenserLoadedCount(dispenser);
  const spaceRemaining = Math.max(0, AUTO_DISPENSER_MAX_PELLETS - loadedBefore);
  if (spaceRemaining <= 0) {
    showToast("The dispenser is already full.");
    return true;
  }

  const loadCount = Math.min(quantity, spaceRemaining);
  const storedPellets = [];
  for (let index = 0; index < loadCount; index += 1) {
    const storedPellet = createAutoDispenserStoredPellet(food.id);
    if (storedPellet) {
      storedPellets.push(storedPellet);
    }
  }

  if (!storedPellets.length) {
    showToast("That food cannot be loaded right now.");
    return true;
  }

  state.foodInventory[food.id] = quantity - storedPellets.length;
  dispenser.storedPellets.push(...storedPellets);
  dispenser.refillAlert = false;

  if (state.foodInventory[food.id] <= 0) {
    runtime.feedingModeFoodKey = "";
  }

  saveState();
  renderUi(now);
  const loadedCount = getAutoDispenserLoadedCount(dispenser);
  const remaining = Math.max(0, Math.floor(Number(state.foodInventory?.[food.id]) || 0));
  const remainderText = remaining > 0 && loadedCount >= AUTO_DISPENSER_MAX_PELLETS
    ? ` ${remaining} left in stock.`
    : "";
  showToast(`${storedPellets.length} ${food.name} ${pluralize("pellet", storedPellets.length)} loaded. ${loadedCount}/${AUTO_DISPENSER_MAX_PELLETS} pellets stored.${remainderText}`);
  return true;
}

function returnAutoDispenserPelletsToInventory(now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    closeUtilityOverlay();
    return false;
  }

  const dispenser = state.autoDispenser;
  const pellets = Array.isArray(dispenser?.storedPellets) ? [...dispenser.storedPellets] : [];
  if (!pellets.length) {
    closeUtilityOverlay();
    showToast("The dispenser is already empty.");
    return false;
  }

  const returnedCounts = new Map();
  for (const pellet of pellets) {
    const foodKey = typeof pellet?.foodKey === "string" ? pellet.foodKey : "";
    const foodMeta = getFoodMeta(foodKey);
    if (!foodMeta) {
      continue;
    }

    state.foodInventory[foodMeta.id] = Math.max(0, Number(state.foodInventory?.[foodMeta.id]) || 0) + 1;
    returnedCounts.set(foodMeta.id, (returnedCounts.get(foodMeta.id) || 0) + 1);
  }

  dispenser.storedPellets = [];
  dispenser.refillAlert = false;
  closeUtilityOverlay();
  const summary = [...returnedCounts.entries()]
    .map(([foodKey, count]) => `${count} ${getFoodMeta(foodKey)?.name || foodKey}`)
    .join(", ");
  pushEvent(`Returned ${pellets.length} dispenser pellet${pellets.length === 1 ? "" : "s"} to inventory.${summary ? ` (${summary})` : ""}`, now);
  saveState();
  renderUi(now);
  showToast(`${pellets.length} pellet${pellets.length === 1 ? "" : "s"} returned to inventory.`);
  return true;
}

function applyFoodBuff(foodKey, now = Date.now(), tank = getCurrentTank()) {
  if (!tank) {
    return;
  }

  if (!tank.foodBuffs || typeof tank.foodBuffs !== "object") {
    tank.foodBuffs = {
      upgradedUntil: 0,
      friskyUntil: 0
    };
  }

  if (foodKey === "frisky") tank.foodBuffs.friskyUntil = 0;
}

function applyFishMealWindowFoodIntake(fish, now = Date.now(), options = {}) {
  const slot = getCurrentMealSlot(now);
  if (!fish) {
    return {
      slot,
      previousCount: 0,
      nextCount: 0,
      damageUnits: 0
    };
  }

  const amount = clamp(Math.max(1, Math.round(Number(options.amount) || 1)), 1, 999);
  if (fish.lastMealSlotKey !== slot.key) {
    fish.lastMealSlotKey = slot.key;
    fish.mealSlotFoodCount = 0;
  }

  const previousCount = clamp(Math.max(0, Number(fish.mealSlotFoodCount) || 0), 0, 999);
  const nextCount = clamp(previousCount + amount, 0, 999);
  fish.mealSlotFoodCount = nextCount;

  if (options.satiate !== false) {
    fish.satiatedUntil = Math.max(Number(fish.satiatedUntil) || 0, now + FISH_SATIATED_MS);
  }

  const canOverfeed = options.allowOverfeed !== false && canFishOverfeed(fish);
  const countBasedOverfeed = options.countBasedOverfeed === true;
  const repeatedWhileFull = options.wasAlreadyFull === true && previousCount >= 2;
  const previousExtraCount = countBasedOverfeed && canOverfeed ? Math.max(0, previousCount - 1) : 0;
  const nextExtraCount = countBasedOverfeed && canOverfeed ? Math.max(0, nextCount - 1) : 0;
  const countBasedDamage = Math.max(0, nextExtraCount - previousExtraCount);
  const damageUnits = canOverfeed ? Math.max(countBasedDamage, repeatedWhileFull ? 1 : 0) : 0;
  if (damageUnits > 0) {
    fish.healthUnits = Math.max(0, Number(fish.healthUnits) - damageUnits);
  }

  return {
    slot,
    previousCount,
    nextCount,
    damageUnits
  };
}

function applyFoodPelletToFish(fish, pellet, now = Date.now(), options = {}) {
  if (!fish || !pellet || isFishDead(fish)) {
    return null;
  }
  if (isProteusZombieFish(fish)) {
    return { foodKey: pellet.foodKey || "basic", mealCoins: 0, damageUnits: 0, died: false, refused: true, refusalReason: "Z-01 does not eat" };
  }

  const targetTank = options.tank || getCurrentTank();
  const species = getSpeciesForFish(fish);
  const foodKey = pellet.foodKey || "basic";
  if (foodKey === "halloweenCandy") {
    fish.candyBoostUntil = now + DAY_MS;
    fish.healthUnits = getFishMaxHealthUnits(fish);
    fish.needs = Object.fromEntries(FISH_NEED_KEYS.map(key => [key, 100]));
    fish.needsUpdatedAt = now;
    fish.lastAteAt = now;
    fish.foodRefusalUntil = 0;
    fish.missedMealsInRow = 0;
    fish.comfortDamageProgressMs = 0;
    if (options.announce !== false) pushEvent(
      fish.name + " enjoyed Halloween candy! All stats are full for 24 hours.", now, targetTank);
    return { foodKey, mealCoins: 0, damageUnits: 0, died: false };
  }
  const forcedRefusal = typeof pellet.diseaseRefusalFishId === "string" && pellet.diseaseRefusalFishId === fish.id;
  const refusalReason = options.allowRefusal === false
    ? ""
    : forcedRefusal
      ? "severe sickness"
      : getFishFoodRefusalReason(fish, foodKey, now);
  if (refusalReason) {
    handleFishRefuseFoodPellet(fish, pellet, now, refusalReason);
    return {
      foodKey,
      mealCoins: 0,
      damageUnits: 0,
      died: false,
      refused: true,
      refusalReason
    };
  }

  if (typeof isDetritusFish === "function" && isDetritusFish(fish) && String(foodKey || "") === "algaeWafers") {
    fish.lastAteAt = now;
    fish.satiatedUntil = now + FISH_SATIATED_MS;
    fish.foodRefusalUntil = 0;
    adjustFishNeed(fish, "comfort", 2, now);
    adjustFishNeed(fish, "stimulation", 3, now);
    fish.needsUpdatedAt = now;
    if (options.announce !== false) {
      pushEvent(`${fish.name} grazed on an algae wafer.`, now, targetTank);
    }
    return { foodKey, mealCoins: 0, damageUnits: 0, died: false, optionalFeeding: true };
  }

  if (isProteusZombieFish(fish)) {
    fish.lastAteAt = now;
    fish.satiatedUntil = now + PROTEUS_ZOMBIE_FEEDING_CALM_MS;
    fish.foodRefusalUntil = 0;
    fish.zombieAggressionTargetId = "";
    fish.zombieAggressionUntil = 0;
    fish.zombieAggressionNextBiteAt = 0;
    fish.zombieAggressionNextAt = Math.max(
      Number(fish.zombieAggressionNextAt) || 0,
      now + PROTEUS_ZOMBIE_FEEDING_CALM_MS
    );
    fish.needs = sanitizeFishNeeds(fish.needs, fish, now);
    fish.needs.hunger = 100;
    fish.needs.comfort = 100;
    fish.needsUpdatedAt = now;
    scheduleFishPoop(fish, now, targetTank);
    if (options.announce !== false) {
      pushEvent(`${fish.name} ate despite having no measurable nutritional requirement.`, now, targetTank);
    }
    return { foodKey, mealCoins: 0, damageUnits: 0, died: false, optionalFeeding: true };
  }

  const mealCoins = recordFishMealCredit(fish, now, targetTank);
  const previousHunger = getFishNeedValue(fish, "hunger", now);
  const mealHungerGain = foodKey === "chum" ? FISH_CHUM_MEAL_HUNGER_GAIN : FISH_BASIC_MEAL_HUNGER_GAIN;
  const mealHungerFloor = foodKey === "chum" ? FISH_CHUM_MEAL_HUNGER_FLOOR : FISH_BASIC_MEAL_HUNGER_FLOOR;
  setFishNeedValue(fish, "hunger", Math.max(previousHunger + mealHungerGain, mealHungerFloor), now);
  adjustFishNeed(fish, "energy", 3, now);
  adjustFishNeed(fish, "comfort", previousHunger <= FISH_HUNGER_LOW_THRESHOLD ? 5 : 1, now);
  adjustFishNeed(fish, "stimulation", 2, now);
  fish.needsUpdatedAt = now;
  scheduleFishPoop(fish, now, targetTank);
  if (foodKey === "frisky" && typeof activateFishBreedingFromSpawningFood === "function") {
    activateFishBreedingFromSpawningFood(fish, now);
  }
  applyFoodBuff(foodKey, now, targetTank);
  const intake = applyFishMealWindowFoodIntake(fish, now, {
    wasAlreadyFull: previousHunger >= FISH_OVERFEED_HUNGER_THRESHOLD
  });
  const announce = options.announce !== false;
  const died = intake.damageUnits > 0 && fish.healthUnits <= 0;

  if (intake.damageUnits > 0) {
    if (announce) {
      pushEvent(
        `${fish.name} was overfed during the ${intake.slot.label.toLowerCase()} meal and lost ${intake.damageUnits} half-heart ${pluralize("step", intake.damageUnits)}.`,
        now,
        targetTank
      );
    }
    if (died) {
      markFishAsDead(fish, now, `${fish.name} died after being overfed.`);
    }
  } else if (announce && mealCoins > 0) {
    pushEvent(`${fish.name} ate and earned ${mealCoins} ${pluralize("coin", mealCoins)}.`, now, targetTank);
  } else if (announce && species) {
    pushEvent(`${fish.name} ate some ${foodKey === "chum" ? "chum" : species.name.includes("Fish") ? "food" : foodKey}.`, now, targetTank);
  }

  return {
    foodKey,
    mealCoins,
    damageUnits: intake.damageUnits,
    died
  };
}

function handleFishEatFoodPellet(fish, pellet, now = Date.now()) {
  return applyFoodPelletToFish(fish, pellet, now, { announce: true });
}

function consumeOffscreenFishFoodPellet(fish, pelletId, targetTank, now = Date.now()) {
  const pellet = targetTank.floatingPellets.find((entry) => entry.id === pelletId);
  if (!pellet || pellet.expiresAt <= now || fish.caveState || isFishDead(fish)
    || fish.feedingPelletId !== pellet.id || !canFishTargetFoodPellet(fish, pellet, now)) return false;

  const forcedRefusal = pellet.diseaseRefusalFishId === fish.id;
  const refusalReason = forcedRefusal
    ? "severe sickness"
    : getFishFoodRefusalReason(fish, pellet.foodKey, now);
  if (refusalReason) {
    return handleFishRefuseFoodPellet(fish, pellet, now, refusalReason);
  }
  const result = applyFoodPelletToFish(fish, pellet, now, { tank: targetTank, announce: true });
  if (!result || result.refused) return Boolean(result?.refused);
  targetTank.floatingPellets = targetTank.floatingPellets.filter((entry) => entry.id !== pellet.id);
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  if (!isFishDead(fish)) {
    fish.activity = "roam";
    fish.targetAt = now + 1200;
  }
  return true;
}

function getConnectedFoodTanks(startTank) {
  if (!startTank) return [];
  return getAllTanks().filter((tank) => (
    tank.id === startTank.id
    || findAquariumSectionRoute(tank, startTank)
    || findAquariumSectionRoute(startTank, tank)
    || getTransitTubeJourney(tank, startTank)
    || getTransitTubeJourney(startTank, tank)
  ));
}

function allocateAutoDispenserPellets(total, dispensers) {
  const allocations = dispensers.map(() => 0);
  let remaining = Math.max(0, Math.floor(total));
  while (remaining > 0) {
    const available = dispensers
      .map((dispenser, index) => ({ dispenser, index, room: Math.max(0, getAutoDispenserLoadedCount(dispenser) - allocations[index]) }))
      .filter((entry) => entry.room > 0);
    if (!available.length) break;
    const base = Math.floor(remaining / available.length);
    const remainder = remaining % available.length;
    let assigned = 0;
    available.forEach((entry, order) => {
      const amount = Math.min(entry.room, Math.max(1, base) + (order >= available.length - remainder ? 1 : 0));
      allocations[entry.index] += amount;
      assigned += amount;
    });
    if (!assigned) break;
    remaining -= assigned;
  }
  return allocations;
}

function processSmartAutoFeeder(now = Date.now(), options = {}) {
  const targetTank = options.tank || getCurrentTank();
  if (!targetTank || isTankCareAutomationPaused()) return false;

  const slot = getCurrentMealSlot(now);
  if (!slot || now < slot.start || now >= slot.end) return false;

  const connectedTanks = getConnectedFoodTanks(targetTank);
  const feederEntries = connectedTanks
    .filter((tank) => tank.autoDispenser?.installed)
    .map((tank) => ({ tank, dispenser: tank.autoDispenser }));
  if (!feederEntries.length) return false;

  // syncCurrentTankState visits every tank. One stable owner coordinates a
  // connected feeder network, while per-fish timestamps prevent duplicate
  // releases after reloads, tab changes, or repeated simulation ticks.
  const owner = feederEntries.slice().sort((a, b) => String(a.tank.id).localeCompare(String(b.tank.id)))[0];
  if (owner.tank.id !== targetTank.id) return false;

  let changed = false;
  const fishEntries = connectedTanks.flatMap((tank) => (
    getMealEligibleFishForSlot(slot, tank, now).map((fish) => ({ fish, tank }))
  ));
  if (!fishEntries.length) {
    for (const { dispenser } of feederEntries) {
      if (dispenser.lastDispensedSlotKey !== slot.key) {
        dispenser.lastDispensedSlotKey = slot.key;
        changed = true;
      }
    }
    return changed;
  }

  const hasAlreadyEaten = (fish) => (
    fish.lastMealSlotKey === slot.key
    && Math.max(0, Number(fish.mealSlotFoodCount) || 0) > 0
  );
  const hasAlreadyReleased = (fish) => feederEntries.some(({ dispenser }) => (
    Math.max(0, Number(dispenser.smartDispensedAtByFishId?.[fish.id]) || 0) >= slot.start
  ));
  const pendingFishEntries = fishEntries.filter(({ fish }) => !hasAlreadyEaten(fish) && !hasAlreadyReleased(fish));

  let released = 0;
  const releasedByFeeder = new Map();
  for (const entry of pendingFishEntries) {
    const { fish, tank: fishTank } = entry;
    const orderedFeeders = feederEntries.slice().sort((left, right) => {
      const leftLocal = left.tank.id === fishTank.id ? 0 : 1;
      const rightLocal = right.tank.id === fishTank.id ? 0 : 1;
      return leftLocal - rightLocal || String(left.tank.id).localeCompare(String(right.tank.id));
    });

    let selected = null;
    for (const feederEntry of orderedFeeders) {
      const storedPellets = Array.isArray(feederEntry.dispenser.storedPellets)
        ? feederEntry.dispenser.storedPellets
        : [];
      const pelletIndex = storedPellets.findIndex((storedPellet) => (
        storedPellet?.foodKey !== "halloweenCandy"
        && canFoodSatisfyFishMeal(fish, storedPellet?.foodKey)
        && canFishEatFoodPellet(fish, storedPellet?.foodKey, now)
      ));
      if (pelletIndex >= 0) {
        selected = { ...feederEntry, pelletIndex };
        break;
      }
    }
    if (!selected) continue;

    const [storedPellet] = selected.dispenser.storedPellets.splice(selected.pelletIndex, 1);
    const floatingPellet = withActiveTank(selected.tank.id, () => createAutoDispenserDroppedPellet(storedPellet, now));
    if (!floatingPellet) continue;

    floatingPellet.targetFishId = fish.id;
    selected.tank.floatingPellets.push(floatingPellet);
    selected.dispenser.smartDispensedAtByFishId ||= {};
    selected.dispenser.smartDispensedAtByFishId[fish.id] = now;
    selected.dispenser.lastSmartDispensedAt = now;
    selected.dispenser.refillAlert = getAutoDispenserLoadedCount(selected.dispenser) <= 0;
    releasedByFeeder.set(selected.dispenser, (releasedByFeeder.get(selected.dispenser) || 0) + 1);
    released += 1;
    changed = true;

    if (fishTank.id === selected.tank.id) {
      withActiveTank(selected.tank.id, () => assignPelletToFish(fish, floatingPellet, now));
    } else {
      runtime.foodTravelDestinations.set(fish.id, selected.tank.id);
      fish.lastNeighborhoodMoveAt = Math.min(Number(fish.lastNeighborhoodMoveAt) || 0, now - 25 * 1000);
    }
  }

  for (const { dispenser } of feederEntries) {
    const empty = getAutoDispenserLoadedCount(dispenser) <= 0;
    if (dispenser.refillAlert !== empty) {
      dispenser.refillAlert = empty;
      changed = true;
    }
  }

  const unresolved = fishEntries.filter(({ fish }) => !hasAlreadyEaten(fish) && !hasAlreadyReleased(fish));
  if (!unresolved.length) {
    for (const { dispenser } of feederEntries) {
      if (dispenser.lastDispensedSlotKey !== slot.key) {
        dispenser.lastDispensedSlotKey = slot.key;
        changed = true;
      }
    }
  } else {
    const storedPellets = feederEntries.flatMap(({ dispenser }) => Array.isArray(dispenser.storedPellets) ? dispenser.storedPellets : []);
    const loadedCount = storedPellets.length;
    const anyDietMatch = unresolved.some(({ fish }) => storedPellets.some((pellet) => (
      pellet?.foodKey !== "halloweenCandy" && canFoodSatisfyFishMeal(fish, pellet?.foodKey)
    )));

    if (loadedCount <= 0 && owner.dispenser.lastEmptyAlertSlotKey !== slot.key) {
      owner.dispenser.lastEmptyAlertSlotKey = slot.key;
      owner.dispenser.refillAlert = true;
      pushEvent(`The auto feeder is empty and could not finish the ${slot.label.toLowerCase()} feeding.`, now, owner.tank, { type: "equipment" });
      if (owner.tank.id === getCurrentTank()?.id) showToast("Auto feeder empty. Refill it to resume scheduled feeding.");
      changed = true;
    } else if (loadedCount > 0 && !anyDietMatch && owner.dispenser.lastFoodMismatchAlertSlotKey !== slot.key) {
      owner.dispenser.lastFoodMismatchAlertSlotKey = slot.key;
      pushEvent(`The auto feeder has food, but none of it matches the remaining fish diets for the ${slot.label.toLowerCase()} feeding.`, now, owner.tank, { type: "equipment" });
      if (owner.tank.id === getCurrentTank()?.id) showToast("Auto feeder needs a compatible food for the remaining fish.");
      changed = true;
    }
  }

  connectedTanks.forEach((tank) => withActiveTank(tank.id, () => assignFloatingPelletsToHungryFish(now)));
  if (released > 0) {
    playDispenserSoundEffect();
    pushEvent(`The auto feeder dispensed ${released} diet-matched pellet${released === 1 ? "" : "s"} for the ${slot.label.toLowerCase()} feeding.`, now, targetTank, { type: "food" });
  }
  return changed;
}

function dropSelectedFoodAtPoint(point, now = Date.now(), options = {}) {
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_FEED_FISH)) {
    setTutorialStage(TUTORIAL_STAGE_FEED_FISH_DONE, { now });
    saveState();
    renderUi(now);
    return { ok: false, previewOnly: true };
  }

  const foodKey = runtime.feedingModeFoodKey;
  const food = getFoodMeta(foodKey);
  if (!food || !point) {
    return { ok: false, reason: "missing-food-or-point" };
  }

  const quantity = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
  if (quantity <= 0) {
    runtime.feedingModeFoodKey = "";
    renderUi(now);
    showToast("That food is out of stock.");
    return { ok: false, reason: "out-of-stock", foodId: food.id };
  }

  if (food.id !== "halloweenCandy" && !getFoodCompatibleFishInTank(food.id, getCurrentTank()).length) {
    showToast(getFoodIncompatibilityMessage(food));
    return { ok: false, reason: "incompatible-food", foodId: food.id };
  }

  state.foodInventory[food.id] = quantity - 1;
  const dropCount = Math.max(1, Math.floor(Number(food.piecesPerDrop) || 1));
  const createdPellets = [];
  for (let index = 0; index < dropCount; index += 1) {
    const pellet = createDroppedFoodPellet(food.id, point.x / TANK_WIDTH, point.y / TANK_HEIGHT, now, { pieceIndex: index, pieceCount: dropCount });
    if (pellet) {
      createdPellets.push(pellet);
    }
  }
  if (createdPellets.length) {
    state.floatingPellets.push(...createdPellets);
    assignFloatingPelletsToHungryFish(now);
    stageHungryFishTravelToFoodTank(getCurrentTank(), now);
  }
  playDropSoundEffect();

  if (state.foodInventory[food.id] <= 0) {
    runtime.feedingModeFoodKey = "";
  }

  const shouldExitFoodToolAfterDrop = isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_FEED_FISH);
  if (options.closeTrayAfterDrop === true || shouldExitFoodToolAfterDrop) {
    runtime.foodTrayOpen = false;
  }
  if (shouldExitFoodToolAfterDrop) {
    runtime.feedingModeFoodKey = "";
    runtime.toolModeSource = null;
  }

  let tutorialChanged = false;
  if (shouldExitFoodToolAfterDrop) {
    tutorialChanged = setTutorialStage(TUTORIAL_STAGE_FEED_FISH_DONE, { now }) || tutorialChanged;
  }

  saveState();
  renderUi(now);
  return {
    ok: true,
    foodId: food.id,
    pelletId: createdPellets[0]?.id || "",
    tutorialChanged
  };
}

function stageHungryFishTravelToFoodTank(foodTank = getCurrentTank(), now = Date.now()) {
  if (!foodTank || getAllTanks().length < 2) {
    return 0;
  }
  let stagedCount = 0;
  for (const tank of getAllTanks()) {
    if (tank.id === foodTank.id) {
      continue;
    }
    for (const fish of getHungryFishByNeeds(tank, now, FISH_HUNGER_LOW_THRESHOLD)) {
      if (!fish || isFishDead(fish)) {
        continue;
      }
      const route = findAquariumSectionRoute(tank, foodTank);
      const tubeJourney = getTransitTubeJourney(tank, foodTank);
      if (!route && !tubeJourney) {
        continue;
      }
      runtime.foodTravelDestinations.set(fish.id, foodTank.id);
      fish.lastNeighborhoodMoveAt = Math.min(Number(fish.lastNeighborhoodMoveAt) || 0, now - 25 * 1000);
      stagedCount += 1;
    }
  }
  return stagedCount;
}

function getNextDayStartTimestamp(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function hasActiveTankMedicineEffect(effectType, now = Date.now(), targetTank = typeof getCurrentTank === "function" ? getCurrentTank() : null) {
  const effects = Array.isArray(targetTank?.medicineEffects)
    ? targetTank.medicineEffects
    : (Array.isArray(state?.medicineEffects) ? state.medicineEffects : []);
  return effects.some((effect) => effect?.type === effectType && (effect.endsAt || 0) > now);
}

function addMedicineVisualEffect(medicine, point, now = Date.now(), durationMs = MEDICINE_VISUAL_DURATION_MS) {
  if (!medicine || !point) return;
  state.medicineClouds.push({
    id: createId("med-cloud"),
    color: medicine.color,
    xNorm: clamp(point.x / TANK_WIDTH, 0.12, 0.88),
    yNorm: clamp(point.y / TANK_HEIGHT, 0.16, 0.76),
    startedAt: now,
    endsAt: now + MEDICINE_CLOUD_DURATION_MS
  });
  state.medicineWaterTint = {
    color: medicine.color,
    startedAt: now,
    endsAt: now + durationMs
  };
}

function consumeSelectedMedicineDose(medicine) {
  const quantity = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
  if (quantity <= 0) return false;
  state.medicineInventory[medicine.id] = quantity - 1;
  if (state.medicineInventory[medicine.id] <= 0) runtime.medicineModeKey = "";
  return true;
}

function applyTargetedMedicineToFish(medicine, fish, now = Date.now()) {
  if (!medicine || !fish) return { ok: false, message: "Click a fish to treat." };
  if (isFishDead(fish)) return { ok: false, message: "Medicine cannot be used on a dead fish." };
  const condition = typeof getFishPrimaryCondition === "function" ? getFishPrimaryCondition(fish, now) : String(fish.condition || "healthy");

  if (medicine.id === "firstAid") {
    if (condition !== "injured") return { ok: false, message: "This fish does not have an injury." };
    fish.injuryRecoveryStartHealthUnits = Math.max(1, Number(fish.healthUnits) || 1);
    fish.injuryRecoveryProgressMs = 1;
    fish.injuryRecoveryLastAt = now;
    if (typeof syncFishPrimaryCondition === "function") syncFishPrimaryCondition(fish, now);
    return { ok: true, message: `${fish.name} is recovering from its injury.` };
  }

  if (medicine.id === "antiParasite") {
    if (condition !== "parasites") return { ok: false, message: "This fish does not have parasites." };
    fish.diseaseState = DISEASE_STATE_RECOVERING;
    fish.diseaseRecoveryProgressMs = 1;
    fish.diseaseLastProgressAt = now;
    fish.diseaseTreatedUntil = now + 1;
    fish.diseaseRequiresTreatment = false;
    if (typeof syncFishPrimaryCondition === "function") syncFishPrimaryCondition(fish, now);
    return { ok: true, message: `${fish.name}'s parasites were treated. Recovery will take about 24 hours.` };
  }

  if (medicine.id === "infectionTreatment") {
    if (condition !== "infection") return { ok: false, message: "This fish does not have an infection." };
    fish.diseaseState = DISEASE_STATE_RECOVERING;
    fish.diseaseRecoveryProgressMs = 1;
    fish.diseaseLastProgressAt = now;
    fish.diseaseTreatedUntil = now + 1;
    fish.diseaseRequiresTreatment = false;
    if (typeof syncFishPrimaryCondition === "function") syncFishPrimaryCondition(fish, now);
    return { ok: true, message: `${fish.name}'s infection was treated. Recovery will take about 24 hours.` };
  }

  if (medicine.id === "waterStress") {
    const mismatch = typeof isFishWaterTypeMismatch === "function" && isFishWaterTypeMismatch(fish);
    if (mismatch) return { ok: false, message: "Correct this fish's water type before treating Osmotic Stress." };
    if (!(Number(fish.osmoticStressProgressMs) > 0)) {
      return { ok: false, message: "This fish is not recovering from Osmotic Stress." };
    }
    if (!(Number(fish.osmoticRecoveryProgressMs) > 0)) {
      fish.osmoticRecoveryProgressMs = 1;
      fish.osmoticRecoveryLastAt = now;
    }
    fish.waterStressBoostUntil = Math.max(Number(fish.waterStressBoostUntil) || 0, now + WATER_STRESS_BOOST_DURATION_MS);
    return { ok: true, message: `${fish.name}'s Osmotic Stress recovery is boosted for 6 hours.` };
  }

  return { ok: false, message: "That medicine cannot be used on this fish." };
}

function applySelectedMedicineAtPoint(point, now = Date.now()) {
  const medicineKey = runtime.medicineModeKey;
  const medicine = getMedicineMeta(medicineKey);
  if (!medicine || !point) return false;

  const quantity = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
  if (quantity <= 0) {
    runtime.medicineModeKey = "";
    renderUi(now);
    showToast("That medicine is out of stock.");
    return true;
  }
  if (!shouldShowMedicineInStore(medicine)) {
    runtime.medicineModeKey = "";
    renderUi(now);
    showToast("That medicine is not currently available.");
    return true;
  }

  if (medicine.id === "betaBlocker") {
    const livingFish = getLivingTankFish();
    if (!livingFish.length) {
      showToast("There are no fish in this tank to calm.");
      return true;
    }
    if (!consumeSelectedMedicineDose(medicine)) return true;
    for (const fish of livingFish) {
      fish.calmedUntil = Math.max(Number(fish.calmedUntil) || 0, now + CALMING_EFFECT_DURATION_MS);
      fish.panicUntil = 0;
      fish.bettaRivalTargetId = "";
      fish.bettaRivalDisplayUntil = 0;
      fish.bettaRivalChaseUntil = 0;
      fish.bettaRivalRole = "";
      fish.bettaRivalNipAt = 0;
      fish.bettaRivalNippedTargetId = "";
    }
    addMedicineVisualEffect(medicine, point, now, CALMING_EFFECT_DURATION_MS);
    state.medicineEffects.push({ id: createId("med-effect"), type: medicine.id, startedAt: now, endsAt: now + CALMING_EFFECT_DURATION_MS, resolvedAt: null });
    playDropSoundEffect();
    pushEvent(`${medicine.name} calmed the fish in ${getTankLabel(getCurrentTank())}.`, now);
    saveState();
    renderUi(now);
    showToast("The tank is calm for 10 minutes.");
    return true;
  }

  const fish = typeof findFishAtPoint === "function" ? findFishAtPoint(point.x, point.y, now) : null;
  if (!fish) {
    showToast("Click a fish to treat.");
    return true;
  }
  const result = applyTargetedMedicineToFish(medicine, fish, now);
  if (!result.ok) {
    showToast(result.message || "That medicine is not appropriate for this fish.");
    renderUi(now);
    return true;
  }

  if (!consumeSelectedMedicineDose(medicine)) return true;
  addMedicineVisualEffect(medicine, point, now);
  playDropSoundEffect();
  pushEvent(`${medicine.name} was used on ${fish.name}.`, now, getCurrentTank(), { type: "illness", fishId: fish.id, recapEligible: false });
  saveState();
  renderUi(now);
  showToast(result.message);
  return true;
}

function processTankMedicineEffects(now = Date.now()) {
  if (!Array.isArray(state?.medicineEffects)) return false;
  const before = state.medicineEffects.length;
  state.medicineEffects = state.medicineEffects.filter((effect) => effect && (Number(effect.endsAt) || 0) > now);
  return state.medicineEffects.length !== before;
}
