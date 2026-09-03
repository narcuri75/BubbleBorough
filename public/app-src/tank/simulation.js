// Source fragment: tank/simulation.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderTickUi(now, options = {}) {
  const stateChanged = Boolean(options.stateChanged);
  renderHeader(now);
  renderMealTrack(now);
  renderSelectedFishNeedsPanel(now);
  renderFishInspector(now);
  renderControls(now);
  renderIntroTutorial();
  renderTutorialGuidance();
  renderCareTaskPane(now);
  if (stateChanged) {
    renderSummary(now);
    renderEvents();
    renderStoreOverlay();
    renderVisiblePanels(now);
  }
  positionTransientMessages();
}

function renderVisiblePanels(now) {
  const showingOverviewTab = runtime.activeTab === "overview";
  const showingFishTab = runtime.activeTab === "fish" || runtime.selectedFishId !== null || runtime.fishEditMode;
  const showingDecorTab = runtime.activeTab === "decor" || runtime.editTankMode;
  const showingFoodStore = runtime.storeOverlayOpen && runtime.storeTab === "food";
  const showingPharmacyStore = runtime.storeOverlayOpen && runtime.storeTab === "pharmacy";
  const showingFishStore = runtime.storeOverlayOpen && runtime.storeTab === "fish";
  const showingDecorStore = runtime.storeOverlayOpen && runtime.storeTab === "decor";
  const showingEquipmentStore = runtime.storeOverlayOpen && runtime.storeTab === "equipment";

  if (showingOverviewTab) {
    renderTankManagement();
  }

  if (showingFoodStore) {
    renderFoodShop();
  }

  if (showingPharmacyStore) {
    renderPharmacyShop();
  }

  if (showingFishTab) {
    renderFishList(now);
  }

  if (showingFishStore) {
    renderFishShop();
  }

  if (showingDecorStore) {
    renderDecorShop();
  }

  if (showingEquipmentStore) {
    renderEquipmentShop();
  }
  if (runtime.storeOverlayOpen) {
    syncWallpaperEngineStoreScrollControls();
  }

  if (showingDecorTab) {
    renderDecorInventory();
    renderPlacedDecor();
  }

  if (runtime.equipmentOverlayOpen) {
    renderBackgrounds();
    renderSolidBackgroundControls();
    renderFilterAssets();
    renderUvLightControls();
    renderCustomGravelControls();
  }

  syncFilterFeatureVisibility();

  if (showingOverviewTab || showingFishTab || showingDecorTab) {
    renderCollapsibleSections();
  }
}

function syncCurrentTankState(now, options = {}) {
  if (!PIRANHA_BEHAVIOR_ENABLED) {
    for (const fish of state.fish) {
      fish.piranhaConsumptionStartedAt = null;
      fish.piranhaConsumptionEndsAt = null;
      fish.piranhaLastBloodAt = null;
      fish.piranhaTargetId = null;
      fish.piranhaTargetAt = null;
      fish.piranhaAttackStartedAt = null;
      fish.piranhaLastDamageAt = null;
    }
    clearBloodEffectClouds();
    runtime.bloodWaterTint = 0;
  }
  if (!state) {
    return false;
  }

  let changed = false;
  if (now < state.lastSimulatedAt) {
    state.lastSimulatedAt = now;
    changed = true;
  }

  const targetTank = getCurrentTank();
  if (isTutorialTankDirtinessLocked() && (state.poops.length || state.pendingPoops.length)) {
    // Keep the cleanup lesson deterministic until the tutorial spawns its scripted mess.
    state.poops = [];
    state.pendingPoops = [];
    changed = true;
  }
  changed = scrubImpossiblePredatorState(now) || changed;
  changed = scrubProtectedTankFishPredatorState(now) || changed;
  changed = updateFishNeeds(now) || changed;
  changed = processSmartAutoFeeder(now, { tank: targetTank }) || changed;
  const detailedSimulation = targetTank?.id === options.visibleTankId;
  if (detailedSimulation) {
    changed = materializeCoarseFishActivities(targetTank, now) || changed;
    changed = processBoroughStructureServices(now, targetTank) || changed;
    changed = processFishNeedsAutonomy(now) || changed;
  } else {
    changed = advanceCoarseFishActivities(now, targetTank) || changed;
  }

  const completedSlots = [];
  for (const slot of completedSlots) {
    const wasFed = isMealSlotServed(slot, targetTank);
    let missedCount = 0;
    let starvationDamageCount = 0;
    let starvationDamageUnits = 0;
    let recoveredCount = 0;
    let deathCount = 0;

    for (const fish of state.fish) {
      if (fish.acquiredAt > slot.start || isFishDead(fish) || !fishNeedsMealWindow(fish)) {
        continue;
      }

      if (wasFed) {
        fish.fedStreak += 1;
        fish.missedMealsInRow = 0;
        if (fish.healthUnits < getFishMaxHealthUnits(fish) && fish.fedStreak >= RECOVERY_FEED_STREAK) {
          fish.healthUnits += 1;
          fish.fedStreak = 0;
          recoveredCount += 1;
        }
      } else {
        fish.fedStreak = 0;
        fish.missedMealsInRow = Math.max(0, Number(fish.missedMealsInRow) || 0) + 1;
        missedCount += 1;

        if (fish.missedMealsInRow >= STARVATION_DAMAGE_MISSED_MEALS_THRESHOLD) {
          fish.healthUnits = Math.max(0, fish.healthUnits - 1);
          starvationDamageCount += 1;
          starvationDamageUnits += 1;
          if (fish.healthUnits <= 0 && markFishAsDead(fish, slot.end, `${fish.name} died after going unfed for too long.`)) {
            deathCount += 1;
          }
        }
      }
    }

    if (!wasFed && missedCount > 0) {
      pushEvent(`${missedCount} fish missed the ${slot.label.toLowerCase()} meal.`, slot.end);
    }

    if (!wasFed && starvationDamageCount > 0) {
      pushEvent(`${starvationDamageCount} fish went too long without food and lost ${starvationDamageUnits} half-heart ${pluralize("step", starvationDamageUnits)}.`, slot.end);
    }

    if (wasFed && recoveredCount > 0) {
      pushEvent(`${recoveredCount} fish recovered half a heart thanks to regular feeding.`, slot.end);
    }

    if (deathCount > 0) {
      pushEvent(`${deathCount} ${pluralize("fish", deathCount)} died and floated to the surface.`, slot.end);
    }

    changed = changed || missedCount > 0 || starvationDamageCount > 0 || recoveredCount > 0 || deathCount > 0;
  }

  changed = processFishEggs(now) || changed;

  const droppedPoops = [];
  state.pendingPoops = state.pendingPoops.filter((poop) => {
    if (poop.dueAt <= now) {
      const fish = state.fish.find((entry) => entry.id === poop.fishId);
      if (!fish || isFishDead(fish)) {
        return false;
      }
      state.poops.push(createPoopRecord({
        fishId: poop.fishId,
        createdAt: poop.dueAt,
        xNorm: clamp((fish?.xNorm ?? randomSwimX()) + (Math.random() - 0.5) * 0.06, 0.08, 0.92),
        startYNorm: fish ? clamp(fish.yNorm + 0.04, 0.14, 0.8) : randomSwimY(),
        tankLayer: fish ? getFishTankLayer(fish) : 1
      }));
      if (fish) {
        fish.nextWasteAt = 0;
      }
      droppedPoops.push(poop);
      return false;
    }

    return true;
  });

  if (droppedPoops.length > 0) {
    pushEvent(`${droppedPoops.length} little fishy ${pluralize("poop", droppedPoops.length)} plopped onto the tank floor.`, now);
    changed = true;
  }

  let pelletMotionChanged = false;
  for (const pellet of state.floatingPellets) {
    pelletMotionChanged = updatePelletSettledState(pellet, now) || pelletMotionChanged;
  }
  const pelletsBefore = state.floatingPellets.length;
  state.floatingPellets = state.floatingPellets.filter((pellet) => pellet.expiresAt > now);
  for (const fish of state.fish) {
    if (fish.feedingPelletId && !state.floatingPellets.some((pellet) => pellet.id === fish.feedingPelletId)) {
      fish.feedingPelletId = null;
      if (!isFishDead(fish)) {
        fish.activity = "roam";
        fish.targetAt = now + 1200 + Math.random() * 1800;
      }
    }
  }
  changed = assignFloatingPelletsToHungryFish(now) || changed;
  changed = changed || pelletMotionChanged || pelletsBefore !== state.floatingPellets.length;

  changed = processTankMedicineEffects(now) || changed;
  changed = processFishDisease(now) || changed;
  changed = processFishBehaviorState(now) || changed;
  changed = processZombieInfections(now) || changed;
  changed = processFishDecayStates(now) || changed;
  changed = processDetritusFish(now) || changed;
  changed = applyCriticalComfortHealthEffects(now) || changed;
  changed = updateComfortHistoryEvents(now) || changed;
  changed = maybeGenerateDailyRecapForTank(targetTank, now) || changed;
  changed = normalizeCurrentTankShellState() || changed;

  pruneTankState(now, getCurrentTank());
  state.lastSimulatedAt = now;
  return changed || completedSlots.length > 0;
}

function normalizeCurrentTankShellState() {
  const tank = getCurrentTank();
  if (!tank || !isBowlTank(tank)) {
    return false;
  }

  let changed = false;
  for (const fish of state.fish) {
    const species = getSpeciesForFish(fish);
    if (species && enforceFishLayerBoundary(fish, species)) {
      changed = true;
    }
    const currentTargetXNorm = Number.isFinite(Number(fish.targetXNorm)) ? Number(fish.targetXNorm) : fish.xNorm;
    const currentTargetYNorm = Number.isFinite(Number(fish.targetYNorm)) ? Number(fish.targetYNorm) : fish.yNorm;
    const position = constrainNormalizedPointToTankShell(fish.xNorm, fish.yNorm, { tank, variant: "inner" });
    const target = constrainNormalizedPointToTankShell(
      currentTargetXNorm,
      currentTargetYNorm,
      { tank, variant: "inner" }
    );
    if (Math.abs(position.xNorm - fish.xNorm) > 0.0005 || Math.abs(position.yNorm - fish.yNorm) > 0.0005) {
      fish.xNorm = position.xNorm;
      fish.yNorm = position.yNorm;
      changed = true;
    }
    if (Math.abs(target.xNorm - currentTargetXNorm) > 0.0005 || Math.abs(target.yNorm - currentTargetYNorm) > 0.0005) {
      fish.targetXNorm = target.xNorm;
      fish.targetYNorm = target.yNorm;
      changed = true;
    }
  }

  for (const pellet of state.floatingPellets) {
    const constrained = constrainNormalizedPointToTankShell(pellet.xNorm, pellet.yNorm, { tank, variant: "inner" });
    if (Math.abs(constrained.xNorm - pellet.xNorm) > 0.0005 || Math.abs(constrained.yNorm - pellet.yNorm) > 0.0005) {
      pellet.xNorm = constrained.xNorm;
      pellet.yNorm = constrained.yNorm;
      changed = true;
    }
  }

  for (const poop of state.poops) {
    const constrained = constrainNormalizedPointToTankShell(poop.xNorm, poop.yNorm, { tank, variant: "inner" });
    if (Math.abs(constrained.xNorm - poop.xNorm) > 0.0005 || Math.abs(constrained.yNorm - poop.yNorm) > 0.0005) {
      poop.xNorm = constrained.xNorm;
      poop.yNorm = constrained.yNorm;
      changed = true;
    }
  }

  return changed;
}

function syncState(now) {
  if (!state) {
    return false;
  }

  const tanks = getAllTanks(state);
  if (!tanks.length) {
    return false;
  }

  let changed = false;
  const activeTankId = state.activeTankId;
  const visibleTankId = runtime.boroughOverviewOpen ? null : activeTankId;
  for (const tank of tanks) {
    changed = withActiveTank(tank.id, () => syncCurrentTankState(now, { visibleTankId }), state) || changed;
  }
  changed = processBoroughFishTravel(now) || changed;
  changed = processFishAgeMilestones(now) || changed;
  state.activeTankId = activeTankId && tanks.some((tank) => tank.id === activeTankId)
    ? activeTankId
    : tanks[0].id;
  return changed;
}

function processBoroughFishTravel(now = Date.now()) {
  if (getAllTanks().length < 2) {
    return false;
  }
  let changed = processPendingNeighborhoodTravel(now);
  const moves = [];
  for (const source of getAllTanks()) {
    const neighbors = getAdjacentAquariumSections(source);
    for (const fish of source.fish) {
      if (!fish || isFishDead(fish) || fish.caveState || runtime.pendingNeighborhoodTravel.has(fish.id)) {
        continue;
      }
      const neededService = getFishNeededBoroughServiceType(fish, source, now);
      const foodDestination = getTankById(runtime.foodTravelDestinations.get(fish.id));
      if (foodDestination?.id === source.id) {
        runtime.foodTravelDestinations.delete(fish.id);
      }
      const foodRoute = foodDestination && foodDestination.id !== source.id
        ? findAquariumSectionRoute(source, foodDestination)
        : null;
      const serviceRoute = neededService && !getBoroughSectionServiceTypes(source).includes(neededService)
        ? findNearestBoroughServiceRoute(source, neededService)
        : null;
      const residenceTank = getTankContainingDecor(getFishResidenceDecorId(fish));
      const shouldReturnHome = residenceTank
        && residenceTank.id !== source.id
        && (isTankLightsOut(now) || getFishNeedValue(fish, "energy", now) <= 52);
      const residenceRoute = shouldReturnHome ? findAquariumSectionRoute(source, residenceTank) : null;
      const directedRoute = foodRoute || serviceRoute || residenceRoute;
      const tubeJourneyTarget = directedRoute?.tubeDestination || directedRoute?.destination;
      const tubeJourney = tubeJourneyTarget
        ? getTransitTubeJourney(source, tubeJourneyTarget)
        : foodDestination
          ? getTransitTubeJourney(source, foodDestination)
        : null;
      const minimumMoveDelay = directedRoute ? 25 * 1000 : 2 * MINUTE_MS;
      if (now - (Number(fish.lastNeighborhoodMoveAt) || fish.acquiredAt || 0) < minimumMoveDelay) {
        continue;
      }
      const destinationsWithFood = neededService === "food"
        ? neighbors.filter((tank) => (tank.floatingPellets || []).length > 0)
        : [];
      if (!serviceRoute && residenceTank?.id === source.id && isTankLightsOut(now)) {
        continue;
      }
      const shouldTravel = directedRoute || tubeJourney || destinationsWithFood.length > 0 || (neighbors.length > 0 && Math.random() < 0.02);
      if (!shouldTravel) {
        continue;
      }
      const choices = destinationsWithFood.length ? destinationsWithFood : neighbors;
      const destination = tubeJourney?.targetTank || directedRoute?.nextSection || choices[Math.floor(Math.random() * choices.length)];
      moves.push({
        fish,
        source,
        destination,
        neededService: foodDestination ? "food" : neededService,
        serviceDestination: foodDestination || serviceRoute?.destination || null,
        residenceDestination: !serviceRoute ? residenceRoute?.destination || null : null,
        tubeJourney
      });
      break;
    }
  }
  for (const move of moves) {
    if (!move.tubeJourney) {
      changed = beginBoroughEdgeTravel(move, now) || changed;
      continue;
    }
    changed = beginBoroughTubeTravel(move, now) || changed;
  }
  return changed;
}

function findAquariumSectionRoute(sourceTank, destinationTank) {
  if (!sourceTank || !destinationTank || sourceTank.id === destinationTank.id) {
    return null;
  }
  const visited = new Set([sourceTank.id]);
  const queue = getAdjacentAquariumSections(sourceTank).map((tank) => ({ tank, firstHop: tank }));
  for (const entry of queue) {
    visited.add(entry.tank.id);
  }
  while (queue.length) {
    const entry = queue.shift();
    if (entry.tank.id === destinationTank.id) {
      return { nextSection: entry.firstHop, destination: destinationTank };
    }
    for (const neighbor of getAdjacentAquariumSections(entry.tank)) {
      if (visited.has(neighbor.id)) {
        continue;
      }
      visited.add(neighbor.id);
      queue.push({ tank: neighbor, firstHop: entry.firstHop });
    }
  }
  return null;
}

function findNearestBoroughServiceRoute(sourceTank, serviceType) {
  if (!sourceTank || !serviceType) {
    return null;
  }
  const collectSwimmingComponent = (startTank) => {
    const visited = new Set([startTank.id]);
    const entries = [{ tank: startTank, firstHop: null }];
    const queue = getAdjacentAquariumSections(startTank).map((tank) => ({ tank, firstHop: tank }));
    for (const entry of queue) visited.add(entry.tank.id);
    while (queue.length) {
      const entry = queue.shift();
      entries.push(entry);
      for (const neighbor of getAdjacentAquariumSections(entry.tank)) {
        if (visited.has(neighbor.id)) continue;
        visited.add(neighbor.id);
        queue.push({ tank: neighbor, firstHop: entry.firstHop });
      }
    }
    return entries;
  };

  const localComponent = collectSwimmingComponent(sourceTank);
  const localService = localComponent.slice(1).find((entry) => getBoroughSectionServiceTypes(entry.tank).includes(serviceType));
  if (localService) {
    return { nextSection: localService.firstHop, destination: localService.tank };
  }

  // Search tube exits from every normally reachable tank. This lets a fish
  // swim along its current row to a tube, take the tube across a wall/row, and
  // then continue swimming to a service near the destination tube.
  const tanks = getAllTanks();
  for (const origin of localComponent) {
    for (const tubeTarget of tanks) {
      if (tubeTarget.id === origin.tank.id || !getTransitTubeJourney(origin.tank, tubeTarget)) continue;
      const remoteService = collectSwimmingComponent(tubeTarget)
        .find((entry) => getBoroughSectionServiceTypes(entry.tank).includes(serviceType));
      if (!remoteService) continue;
      if (origin.tank.id === sourceTank.id) {
        return {
          nextSection: null,
          destination: remoteService.tank,
          tubeDestination: tubeTarget
        };
      }
      return { nextSection: origin.firstHop, destination: remoteService.tank };
    }
  }
  return null;
}

function pruneTankState(now, targetTank = getCurrentTank()) {
  if (!targetTank) {
    return;
  }

  const validResidenceIds = new Set(getAllPlacedDecor().map((item) => item.id));
  for (const fish of targetTank.fish || []) {
    if (getFishResidenceDecorId(fish) && !validResidenceIds.has(fish.residenceDecorId)) {
      fish.residenceDecorId = null;
      if (fish.favoriteSpot?.decorId && !validResidenceIds.has(fish.favoriteSpot.decorId)) {
        fish.favoriteSpot = null;
      }
    }
    if (fish.boroughServiceTargetDecorId && !validResidenceIds.has(fish.boroughServiceTargetDecorId)) {
      clearFishBoroughServiceReservation(fish);
      if (fish.coarseActivity?.targetDecorId && !validResidenceIds.has(fish.coarseActivity.targetDecorId)) {
        fish.coarseActivity = null;
      }
    }
  }
  targetTank.pendingPoops = targetTank.pendingPoops.filter((poop) => (poop.dueAt || 0) >= now - DAY_MS);
  targetTank.poops = targetTank.poops.filter((poop) => (poop.createdAt || 0) >= targetTank.lastCleanedAt);
  targetTank.fishEggs = (targetTank.fishEggs || []).filter((egg) => !egg.hatchedAt || (egg.shellExpiresAt || 0) > now);
  targetTank.floatingPellets = targetTank.floatingPellets.filter((pellet) => pellet.expiresAt > now);
  targetTank.autoDispenser = createDefaultAutoDispenserState(targetTank.autoDispenser);
  targetTank.gravelLivePebbles = [];
  targetTank.events = targetTank.events.slice(0, MAX_TANK_EVENT_HISTORY);
  targetTank.medicineEffects = (targetTank.medicineEffects || []).filter((effect) => (effect.endsAt || 0) > now - DAY_MS);
  targetTank.medicineClouds = (targetTank.medicineClouds || []).filter((effect) => (effect.endsAt || 0) > now - 2 * MINUTE_MS);
  if (targetTank.medicineWaterTint && (targetTank.medicineWaterTint.endsAt || 0) <= now - 2 * MINUTE_MS) {
    targetTank.medicineWaterTint = null;
  }
}

function pruneCustomDecorAssets(target = state) {
  if (!target?.customDecorAssets || typeof target.customDecorAssets !== "object") {
    return false;
  }

  let changed = false;
  const usedKeys = new Set();
  for (const [key, count] of Object.entries(target.decorInventory || {})) {
    if (isCustomDecorAssetKey(key) && Math.max(0, Number(count) || 0) > 0) {
      usedKeys.add(key);
    }
  }
  for (const item of getAllPlacedDecor(target)) {
    if (isCustomDecorAssetKey(item?.decorKey)) {
      usedKeys.add(item.decorKey);
    }
  }
  for (const key of Object.keys(target.customDecorAssets)) {
    if (!usedKeys.has(key)) {
      delete target.customDecorAssets[key];
      changed = true;
    }
  }

  return changed;
}

function pruneCustomFishAssets(target = state) {
  if (!target?.customFishAssets || typeof target.customFishAssets !== "object") {
    return false;
  }

  let changed = false;
  const usedKeys = new Set();
  for (const fish of [...getAllTankFish(target), ...(Array.isArray(target.storedFish) ? target.storedFish : [])]) {
    if (isCustomFishAssetKey(fish?.speciesId)) {
      usedKeys.add(fish.speciesId);
    }
  }
  for (const key of Object.keys(target.customFishAssets)) {
    if (!usedKeys.has(key)) {
      delete target.customFishAssets[key];
      changed = true;
    }
  }

  return changed;
}

function pruneState(now, target = state) {
  if (!target) {
    return;
  }

  if (Array.isArray(target.tanks)) {
    const historyCutoff = now - 45 * DAY_MS;
    for (const [key, value] of Object.entries(target.mealHistory || {})) {
      if ((Number(value?.fedAt) || 0) < historyCutoff) {
        delete target.mealHistory[key];
      }
    }
    for (const tank of target.tanks) {
      pruneTankState(now, tank);
    }
    pruneCustomDecorAssets(target);
    pruneCustomFishAssets(target);
    return;
  }

  pruneTankState(now, target);
}

function getCriticalTankConditionStartAt(now) {
  const startCandidates = [];
  const deadFish = getExposedDeadTankFish(now);
  if (deadFish.length) {
    startCandidates.push(
      Math.min(...deadFish.map((fish) => Number.isFinite(fish.deadAt) ? fish.deadAt : now))
    );
  }

  if (!isTutorialTankDirtinessLocked()) {
    const dirtyAt = state.lastCleanedAt + getFilterMaxDirtyDurationMs();
    if (dirtyAt <= now) {
      startCandidates.push(dirtyAt);
    }
  }

  return startCandidates.length ? Math.min(...startCandidates) : null;
}

function applyCriticalComfortHealthEffects(now) {
  const livingFish = getLivingTankFish().filter((fish) => !isUndeadFish(fish) || !isGoreEnabled());
  if (!livingFish.length) {
    return false;
  }

  const criticalStart = getCriticalTankConditionStartAt(now);
  if (!Number.isFinite(criticalStart)) {
    return resetLivingFishComfortDamageProgress();
  }

  const exposureStart = Math.max(state.lastSimulatedAt || now, criticalStart);
  const exposureMs = Math.max(0, now - exposureStart);
  if (exposureMs <= 0) {
    return false;
  }

  let changed = false;
  let hurtFishCount = 0;
  let totalDamageUnits = 0;
  let deathCount = 0;
  const corpsesPresent = hasExposedDeadTankFish(now);

  for (const fish of livingFish) {
    fish.comfortDamageProgressMs = Math.max(0, Number(fish.comfortDamageProgressMs) || 0) + exposureMs;
    const damageTickMs = getFishCriticalHealthTickMs(fish);
    const damageUnits = Math.min(
      fish.healthUnits,
      Math.floor(fish.comfortDamageProgressMs / Math.max(1, damageTickMs))
    );

    if (damageUnits <= 0) {
      continue;
    }

    fish.comfortDamageProgressMs -= damageUnits * damageTickMs;
    fish.healthUnits = Math.max(0, fish.healthUnits - damageUnits);
    fish.fedStreak = 0;
    totalDamageUnits += damageUnits;
    hurtFishCount += 1;
    changed = true;

    if (fish.healthUnits <= 0 && markFishAsDead(
      fish,
      now,
      corpsesPresent
        ? `${fish.name} died after a dead fish poisoned the whole tank.`
        : `${fish.name} died after the tank stayed filthy for too long.`
    )) {
      deathCount += 1;
    }
  }

  if (hurtFishCount > 0) {
    pushEvent(
      corpsesPresent
        ? `A dead fish left in the tank made the water critical. ${hurtFishCount} ${pluralize("fish", hurtFishCount)} lost ${totalDamageUnits} half-heart ${pluralize("step", totalDamageUnits)}.`
        : `The tank sat at maximum dirtiness too long. ${hurtFishCount} ${pluralize("fish", hurtFishCount)} lost ${totalDamageUnits} half-heart ${pluralize("step", totalDamageUnits)}.`,
      now
    );
  }

  if (deathCount > 0) {
    changed = true;
  }

  return changed;
}

function processFishDecayStates(now) {
  let changed = false;
  const stageMessages = [];
  const allFish = [...state.fish, ...state.storedFish];

  for (const fish of allFish) {
    if (!isFishDead(fish)) {
      if (
        fish.decayStage !== null
        || fish.piranhaConsumptionStartedAt !== null
        || fish.piranhaConsumptionEndsAt !== null
        || fish.piranhaLastBloodAt !== null
      ) {
        fish.decayStage = null;
        fish.piranhaConsumptionStartedAt = null;
        fish.piranhaConsumptionEndsAt = null;
        fish.piranhaLastBloodAt = null;
        changed = true;
      }
      continue;
    }

    const nextStage = getFishDecayStage(fish, now);
    if (fish.decayStage !== nextStage) {
      fish.decayStage = nextStage;
      changed = true;

      if (nextStage === "zombie") {
        if (!unlockFishSpecies("zombie-fish", now, "Zombie Fish unlocked after a fish decayed into a zombie.")) {
          stageMessages.push(`${fish.name} decayed into a zombie.`);
        }
      } else if (nextStage === "skeleton") {
        if (!unlockFishSpecies("skeleton-fish", now, "Skeleton Fish unlocked after a fish decayed down to bones.")) {
          stageMessages.push(`${fish.name} decayed down to a skeleton.`);
        }
      }
    }
  }

  for (const message of stageMessages) {
    pushEvent(message, now);
  }

  if (finalizePiranhaConsumedFish(getCompletedPiranhaConsumedFish(now), now)) {
    changed = true;
  }

  return changed;
}

function processDetritusFish(now) {
  let changed = false;

  for (const fish of state.fish) {
    const species = getSpeciesForFish(fish);
    if (!species || !isDetritusFish(fish) || isFishDead(fish)) {
      continue;
    }

    if (now < (fish.nextDetritusSnackAt || 0)) {
      continue;
    }

    const stalePelletIndex = state.floatingPellets.findIndex((pellet) => (
      pellet?.settled
      && getFoodPelletSettledAgeMs(pellet, now) > FOOD_PELLET_SETTLED_STALE_TARGET_MS
      && Math.abs((pellet.xNorm || 0.5) - fish.xNorm) <= 0.18
    ));
    if (stalePelletIndex !== -1) {
      state.floatingPellets.splice(stalePelletIndex, 1);
      changed = true;
      fish.nextDetritusSnackAt = now + species.cleanupMinMs + Math.random() * Math.max(1000, species.cleanupMaxMs - species.cleanupMinMs);
      continue;
    }

    const nearbyPoopIndex = state.poops.findIndex((poop) => Math.abs((poop.xNorm || 0.5) - fish.xNorm) <= 0.18);
    const canClearNearbyPoop = nearbyPoopIndex !== -1
      && Math.random() <= (Number.isFinite(species.poopCleanupChance) ? species.poopCleanupChance : 1);
    if (canClearNearbyPoop) {
      state.poops.splice(nearbyPoopIndex, 1);
      changed = true;
    } else {
      const dirtiness = getBaseTankDirtiness(now);
      if (dirtiness > 0.03) {
        const cleanupStrength = species.cleanupStrength * (nearbyPoopIndex !== -1 ? 0.35 : 1);
        state.lastCleanedAt = Math.min(now, state.lastCleanedAt + cleanupStrength * HOUR_MS);
        changed = true;
      }
    }

    fish.nextDetritusSnackAt = now + species.cleanupMinMs + Math.random() * Math.max(1000, species.cleanupMaxMs - species.cleanupMinMs);
  }

  return changed;
}
