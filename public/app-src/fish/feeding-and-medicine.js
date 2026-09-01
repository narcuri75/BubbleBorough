// Source fragment: fish/feeding-and-medicine.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function canFishEatFoodPellet(fish, foodKey = "basic", now = Date.now()) {
  if (
    !fish
    || isFishDead(fish)
    || (Number(fish.foodRefusalUntil) || 0) > now
  ) {
    return false;
  }
  if ((Number(fish.satiatedUntil) || 0) > now && getFishNeedValue(fish, "hunger", now) > FISH_HUNGER_LOW_THRESHOLD) {
    return false;
  }
  if (getFishNeedValue(fish, "hunger", now) >= 92) {
    return false;
  }

  return canFoodSatisfyFishMeal(fish, foodKey);
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
  if (!tank || !slotKey) {
    return null;
  }

  if (!tank.feedHistory || typeof tank.feedHistory !== "object") {
    tank.feedHistory = {};
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

  tank.feedHistory[slotKey] = {
    fedAt: now,
    offeredAt: 0,
    coinsEarned: 0,
    fishIds: [],
    offeredFishIds: []
  };
  return tank.feedHistory[slotKey];
}

function recordFishMealCredit(fish, now = Date.now(), tank = getCurrentTank()) {
  if (!fish || isMealFreeFish(fish)) {
    return 0;
  }

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
  state.coins += mealCoins;
  return mealCoins;
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
  const sinkDuration = Math.max(1000, Number(pellet.sinkDurationMs) || FOOD_PELLET_SINK_DURATION_MS);
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
  const spread = FOOD_DROP_SPREAD_NORM;
  const dropXNorm = clamp(Number(xNorm) + randomBetween(-spread, spread), 0.08, 0.92);
  const dropYNorm = clamp(Number(yNorm), WATER_SURFACE_Y / TANK_HEIGHT + 0.1, 0.72);
  return sanitizePellet({
    id: createId("pellet"),
    foodKey,
    spritePath: resolveStoredFoodDropSpritePath(food),
    targetFishId: "",
    xNorm: dropXNorm,
    yNorm: dropYNorm,
    startYNorm: dropYNorm,
    sway: Math.random(),
    rotation: dropStyle === "sprite" ? randomBetween(-0.95, 0.95) : randomBetween(-0.22, 0.22),
    scale: dropStyle === "sprite" ? randomBetween(0.92, 1.18) : randomBetween(0.94, 1.08),
    sinkDurationMs: FOOD_PELLET_SINK_DURATION_MS * randomBetween(0.85, 1.2),
    createdAt: now,
    expiresAt: now + FOOD_PELLET_SETTLED_LIFETIME_MS
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
    rotation: dropStyle === "sprite" ? randomBetween(-0.95, 0.95) : randomBetween(-0.22, 0.22),
    scale: dropStyle === "sprite" ? randomBetween(0.92, 1.18) : randomBetween(0.94, 1.08),
    sinkDurationMs: FOOD_PELLET_SINK_DURATION_MS * randomBetween(0.85, 1.2),
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

  if (isNormalMealFood(foodKey)) {
    tank.foodBuffs.friskyUntil = Math.max(Number(tank.foodBuffs?.friskyUntil) || 0, now + BREEDING_FOOD_BOOST_MS);
  }
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
  const previousExtraCount = canOverfeed ? Math.max(0, previousCount - 1) : 0;
  const nextExtraCount = canOverfeed ? Math.max(0, nextCount - 1) : 0;
  const damageUnits = Math.max(0, nextExtraCount - previousExtraCount);
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

  const targetTank = options.tank || getCurrentTank();
  const species = getSpeciesForFish(fish);
  const foodKey = pellet.foodKey || "basic";
  const forcedRefusal = typeof pellet.diseaseRefusalFishId === "string" && pellet.diseaseRefusalFishId === fish.id;
  const refusalPrechecked = typeof pellet.refusalPrecheckedFishId === "string" && pellet.refusalPrecheckedFishId === fish.id;
  if (options.allowRefusal !== false && (forcedRefusal || (!refusalPrechecked && shouldFishRefuseFoodForDisease(fish, foodKey, now)))) {
    handleFishRefuseFoodPellet(fish, pellet, now);
    return {
      foodKey,
      mealCoins: 0,
      damageUnits: 0,
      died: false,
      refused: true
    };
  }

  const mealCoins = recordFishMealCredit(fish, now, targetTank);
  const previousHunger = getFishNeedValue(fish, "hunger", now);
  adjustFishNeed(fish, "hunger", foodKey === "chum" ? 48 : 42, now);
  adjustFishNeed(fish, "energy", 4, now);
  adjustFishNeed(fish, "comfort", previousHunger <= FISH_HUNGER_LOW_THRESHOLD ? 5 : 1, now);
  adjustFishNeed(fish, "stimulation", 2, now);
  fish.needsUpdatedAt = now;
  scheduleFishPoop(fish, now, targetTank);
  applyFoodBuff(foodKey, now, targetTank);
  const intake = applyFishMealWindowFoodIntake(fish, now);
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

function processSmartAutoFeeder(now = Date.now(), options = {}) {
  return false;
  /* Legacy dispenser behavior retained below only for save compatibility.
  const targetTank = options.tank || getCurrentTank();
  const dispenser = targetTank?.autoDispenser;
  if (!dispenser?.installed) {
    return false;
  }
  dispenser.smartDispensedAtByFishId = sanitizeFishNeedEventMap(dispenser.smartDispensedAtByFishId);
  if (now - (Number(dispenser.lastSmartDispensedAt) || 0) < FISH_AUTO_FEEDER_TANK_COOLDOWN_MS) {
    return false;
  }
  const hungryFish = getHungryFishByNeeds(targetTank, now, FISH_HUNGER_LOW_THRESHOLD)
    .filter((fish) => (
      fish
      && !fish.feedingPelletId
      && now - (Number(dispenser.smartDispensedAtByFishId[fish.id]) || 0) >= FISH_AUTO_FEEDER_COOLDOWN_MS
    ))
    .sort((left, right) => getFishNeedValue(left, "hunger", now) - getFishNeedValue(right, "hunger", now));
  if (!hungryFish.length) {
    return false;
  }
  const storedPellets = Array.isArray(dispenser.storedPellets) ? dispenser.storedPellets : [];
  if (!storedPellets.length) {
    dispenser.refillAlert = true;
    const fish = hungryFish[0];
    setFishBehaviorIntent(fish, "wait for food", "auto feeder empty", now, { durationMs: 12 * 1000 });
    maybeRecordFishNeedEvent(fish, "feeder-empty", "The auto feeder is empty.", now, 30 * MINUTE_MS);
    return true;
  }

  for (const fish of hungryFish) {
    const pelletIndex = storedPellets.findIndex((storedPellet) => canFishEatFoodPellet(fish, storedPellet.foodKey, now));
    if (pelletIndex < 0) {
      setFishBehaviorIntent(fish, "wait for food", "wrong feeder food", now, { durationMs: 10 * 1000 });
      maybeRecordFishNeedEvent(fish, "feeder-wrong-food", "Food in the auto feeder does not suit a hungry fish.", now, 30 * MINUTE_MS);
      continue;
    }
    const [storedPellet] = dispenser.storedPellets.splice(pelletIndex, 1);
    const floatingPellet = createAutoDispenserDroppedPellet(storedPellet, now);
    if (!floatingPellet) {
      return false;
    }
    floatingPellet.targetFishId = fish.id;
    state.floatingPellets.push(floatingPellet);
    assignPelletToFish(fish, floatingPellet, now);
    dispenser.lastSmartDispensedAt = now;
    dispenser.smartDispensedAtByFishId[fish.id] = now;
    dispenser.refillAlert = getAutoDispenserLoadedCount(dispenser) <= 0;
    setFishBehaviorIntent(fish, "wait for food", "auto feeder", now, { durationMs: 10 * 1000 });
    pushEvent(`The auto feeder dropped food for ${fish.name}.`, now, targetTank, { type: "food", fishId: fish.id });
    playDispenserSoundEffect();
    return true;
  }

  return false; */
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

function getNextDayStartTimestamp(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function hasActiveTankMedicineEffect(effectType, now = Date.now()) {
  return state.medicineEffects.some((effect) => effect?.type === effectType && (effect.endsAt || 0) > now);
}

function applySelectedMedicineAtPoint(point, now = Date.now()) {
  const medicineKey = runtime.medicineModeKey;
  const medicine = getMedicineMeta(medicineKey);
  if (!medicine || !point) {
    return false;
  }

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
    showToast("Enable Violence & Gore to use The Cure.");
    return true;
  }

  state.medicineInventory[medicine.id] = quantity - 1;
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
    endsAt: now + MEDICINE_VISUAL_DURATION_MS
  };
  state.medicineEffects.push({
    id: createId("med-effect"),
    type: medicine.id,
    startedAt: now,
    endsAt: medicine.id === "betaBlocker" ? getNextDayStartTimestamp(now) : now + MEDICINE_HEAL_DURATION_MS,
    nextTickAt: now + MEDICINE_HEAL_INTERVAL_MS,
    resolvedAt: null
  });
  playDropSoundEffect();

  if (state.medicineInventory[medicine.id] <= 0) {
    runtime.medicineModeKey = "";
  }

  pushEvent(`${medicine.name} was used in ${getTankLabel(getCurrentTank())}.`, now);
  saveState();
  renderUi(now);
  return true;
}

function processTankMedicineEffects(now = Date.now()) {
  let changed = false;

  for (const effect of state.medicineEffects) {
    if (!effect || (effect.endsAt || 0) <= now) {
      continue;
    }

    if (effect.type === "firstAid") {
      if (!effect.diseaseSlowAppliedAt) {
        changed = applyFirstAidDiseaseSlowdown(now) || changed;
        effect.diseaseSlowAppliedAt = now;
      }
      while ((effect.nextTickAt || 0) <= now && (effect.nextTickAt || 0) < effect.endsAt) {
        for (const fish of getLivingTankFish()) {
          const maxHealth = getFishMaxHealthUnits(fish);
          if (fish.healthUnits < maxHealth) {
            fish.healthUnits = Math.min(maxHealth, fish.healthUnits + 1);
            changed = true;
          }
        }
        effect.nextTickAt += MEDICINE_HEAL_INTERVAL_MS;
      }
    } else if (effect.type === "antidote" && !effect.resolvedAt && now >= effect.startedAt + 1000) {
      for (const fish of [...state.fish]) {
        if (isZombieVariantFish(fish)) {
          fish.zombieVariant = false;
          fish.zombieBiteStartedAt = null;
          fish.zombieBiteLastBloodAt = null;
          fish.zombieBiteAttackerId = null;
          fish.zombieReviveAt = null;
          fish.zombieReviveSourceId = null;
          changed = true;
        } else if (isSkeletonFish(fish) && !isFishDead(fish)) {
          fish.healthUnits = 0;
          markFishAsDead(fish, now, `${fish.name} could not survive the antidote.`);
          changed = true;
        }
      }
      effect.resolvedAt = now;
    }
  }

  return changed;
}
