// Source fragment: debug/tools.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function setDebugNotificationUiEnabled(enabled) {
  runtime.debugNotificationUiEnabled = Boolean(enabled);
  syncNotificationBellPresentation();
  renderControls(Date.now());
  return runtime.debugNotificationUiEnabled;
}

function toggleDebugNotificationUi() {
  const enabled = setDebugNotificationUiEnabled(!runtime.debugNotificationUiEnabled);
  showToast(enabled ? "Notification UI enabled for debugging." : "Notification UI hidden.");
  return enabled;
}

function setDebugFishActionIndicatorsEnabled(enabled) {
  runtime.debugFishActionIndicatorsEnabled = Boolean(enabled);
  renderFishActionFlyout(Date.now());
  renderFishActionQueueDock(Date.now());
  renderControls(Date.now());
  return runtime.debugFishActionIndicatorsEnabled;
}

function toggleDebugFishActionIndicators() {
  const enabled = setDebugFishActionIndicatorsEnabled(!runtime.debugFishActionIndicatorsEnabled);
  showToast(enabled ? "Fish action indicators enabled for debugging." : "Fish action indicators hidden.");
  return enabled;
}

function resetDebugFrameProfiler() {
  runtime.frameProfilerCurrent = null;
  runtime.frameProfilerSamples = [];
  runtime.frameProfilerLongFrameCount = 0;
  runtime.frameProfilerLastOverlayAt = 0;
  runtime.frameProfilerLastSaveMs = 0;
  runtime.frameProfilerLastUiRenderMs = 0;
  runtime.frameProfilerLastTickMs = 0;
  runtime.frameProfilerLastDeferredUiMs = 0;
}

function ensureDebugFrameProfilerOverlay() {
  if (runtime.frameProfilerOverlay?.isConnected) {
    return runtime.frameProfilerOverlay;
  }
  const overlay = document.createElement("pre");
  overlay.id = "debugFrameProfilerOverlay";
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    top: "10px",
    right: "10px",
    zIndex: "2147483000",
    margin: "0",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(5, 12, 18, .86)",
    color: "rgba(238, 249, 255, .96)",
    boxShadow: "0 8px 24px rgba(0,0,0,.32)",
    font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    minWidth: "260px",
    whiteSpace: "pre",
    pointerEvents: "none"
  });
  document.body.appendChild(overlay);
  runtime.frameProfilerOverlay = overlay;
  return overlay;
}

function setDebugFrameProfilerEnabled(enabled) {
  runtime.debugFrameProfilerEnabled = Boolean(enabled);
  resetDebugFrameProfiler();
  const overlay = ensureDebugFrameProfilerOverlay();
  overlay.hidden = !runtime.debugFrameProfilerEnabled;
  if (runtime.debugFrameProfilerEnabled) {
    overlay.textContent = "FRAME PROFILER\ncollecting...";
  }
  renderControls(Date.now());
  return runtime.debugFrameProfilerEnabled;
}

function toggleDebugFrameProfiler() {
  return setDebugFrameProfilerEnabled(!runtime.debugFrameProfilerEnabled);
}

function beginDebugFrameProfile(frameTime, rafGapMs = 0) {
  if (!runtime.debugFrameProfilerEnabled) {
    runtime.frameProfilerCurrent = null;
    return null;
  }
  const sample = {
    frameTime: Number(frameTime) || 0,
    rafGapMs: Math.max(0, Number(rafGapMs) || 0),
    startedAt: performance.now(),
    workMs: 0,
    sections: Object.create(null),
    counters: Object.create(null)
  };
  runtime.frameProfilerCurrent = sample;
  return sample;
}

function recordDebugFrameProfilerDuration(name, durationMs) {
  const sample = runtime.frameProfilerCurrent;
  if (!sample || !name) {
    return;
  }
  const duration = Math.max(0, Number(durationMs) || 0);
  sample.sections[name] = (Number(sample.sections[name]) || 0) + duration;
}

function incrementDebugFrameProfilerCounter(name, amount = 1) {
  const sample = runtime.frameProfilerCurrent;
  if (!sample || !name) {
    return;
  }
  sample.counters[name] = (Number(sample.counters[name]) || 0) + (Number(amount) || 0);
}

function endDebugFrameProfilerSection(name, startedAt) {
  if (!runtime.frameProfilerCurrent || !Number.isFinite(Number(startedAt))) {
    return;
  }
  recordDebugFrameProfilerDuration(name, performance.now() - Number(startedAt));
}

function getDebugFrameProfilerAverage(samples, accessor) {
  if (!samples.length) {
    return 0;
  }
  let total = 0;
  for (const sample of samples) {
    total += Number(accessor(sample)) || 0;
  }
  return total / samples.length;
}

function updateDebugFrameProfilerOverlay(force = false) {
  if (!runtime.debugFrameProfilerEnabled) {
    if (runtime.frameProfilerOverlay) {
      runtime.frameProfilerOverlay.hidden = true;
    }
    return;
  }
  const now = performance.now();
  if (!force && now - runtime.frameProfilerLastOverlayAt < 250) {
    return;
  }
  runtime.frameProfilerLastOverlayAt = now;
  const overlay = ensureDebugFrameProfilerOverlay();
  overlay.hidden = false;
  const samples = runtime.frameProfilerSamples.slice(-60);
  if (!samples.length) {
    overlay.textContent = "FRAME PROFILER\ncollecting...";
    return;
  }
  const latest = samples[samples.length - 1];
  const avgWork = getDebugFrameProfilerAverage(samples, (sample) => sample.workMs);
  const avgGap = getDebugFrameProfilerAverage(samples, (sample) => sample.rafGapMs);
  const fps = avgGap > 0.01 ? Math.min(999, 1000 / avgGap) : 0;
  const maxWork = Math.max(...samples.map((sample) => Number(sample.workMs) || 0));
  const sectionAverage = (name) => getDebugFrameProfilerAverage(samples, (sample) => sample.sections?.[name]);
  const counterAverage = (name) => getDebugFrameProfilerAverage(samples, (sample) => sample.counters?.[name]);
  const latestSections = Object.entries(latest.sections || {}).sort((left, right) => Number(right[1]) - Number(left[1]));
  const hottest = latestSections[0] || ["none", 0];
  overlay.textContent = [
    "FRAME PROFILER",
    `FPS ${fps.toFixed(1)} | RAF ${avgGap.toFixed(1)} ms`,
    `work ${avgWork.toFixed(2)} ms avg | ${maxWork.toFixed(2)} max`,
    `motion ${sectionAverage("fishMotion").toFixed(2)} | actions ${sectionAverage("fishActions").toFixed(2)}`,
    `tank ${sectionAverage("tankRender").toFixed(2)} | fish ${sectionAverage("fishDraw").toFixed(2)} | prep ${sectionAverage("fishPrep").toFixed(2)}`,
    `caves ${sectionAverage("caveCollision").toFixed(2)} | strict ${counterAverage("caveStrictChecks").toFixed(1)}/frame`,
    `UI ${sectionAverage("uiRender").toFixed(2)} | save ${sectionAverage("saveState").toFixed(2)}`,
    `last tick ${runtime.frameProfilerLastTickMs.toFixed(2)} | deferred UI ${runtime.frameProfilerLastDeferredUiMs.toFixed(2)}`,
    `last save ${runtime.frameProfilerLastSaveMs.toFixed(2)} | last full UI ${runtime.frameProfilerLastUiRenderMs.toFixed(2)}`,
    `long frames ${runtime.frameProfilerLongFrameCount}`,
    `latest hot: ${hottest[0]} ${Number(hottest[1]).toFixed(2)} ms`
  ].join("\n");
}

function finishDebugFrameProfile() {
  const sample = runtime.frameProfilerCurrent;
  if (!sample) {
    return;
  }
  sample.workMs = Math.max(0, performance.now() - sample.startedAt);
  if (sample.workMs >= 20 || sample.rafGapMs >= 25) {
    runtime.frameProfilerLongFrameCount += 1;
  }
  runtime.frameProfilerSamples.push(sample);
  if (runtime.frameProfilerSamples.length > 240) {
    runtime.frameProfilerSamples.splice(0, runtime.frameProfilerSamples.length - 180);
  }
  runtime.frameProfilerCurrent = null;
  updateDebugFrameProfilerOverlay();
}

function toggleCleaningMode(options = {}) {
  const nextMode = !runtime.cleaningMode;
  clearPrimaryToolModes();
  const now = Date.now();
  let tutorialChanged = false;
  runtime.lastScrubPoint = null;
  resetScrubWipeSoundState();

  if (nextMode) {
    if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_CLEAN_TANK)) {
      tutorialChanged = setTutorialStage(TUTORIAL_STAGE_CLEAN_TANK_DONE, { now }) || tutorialChanged;
    } else {
      runtime.cleaningMode = true;
      runtime.toolModeSource = options.source || "toolbar";
      runtime.scrubAutoCompleteAt = getScrubCoverage() >= SCRUB_AUTO_COMPLETE_GRACE_THRESHOLD
        ? now + SCRUB_AUTO_COMPLETE_GRACE_MS
        : 0;
      if (options.collapseSidebar) {
        runtime.sidebarCollapsed = true;
      }
    }
  }

  renderToolCursor();
  if (tutorialChanged) {
    saveState();
  }
  renderUi(now);
}

function toggleScoopMode(options = {}) {
  const nextMode = !runtime.scoopMode;
  clearPrimaryToolModes();

  if (nextMode) {
    runtime.scoopMode = true;
    runtime.toolModeSource = options.source || "toolbar";
    if (options.collapseSidebar) {
      runtime.sidebarCollapsed = true;
    }
  }

  renderToolCursor();
  renderUi(Date.now());
}

function applyDebugTankDirtiness(targetBaseDirtiness, now, eventMessage, toastMessage) {
  rebaseTankDirtiness(now, targetBaseDirtiness);
  const livingFish = getLivingTankFish();
  const desiredPoopCount = livingFish.length
    ? Math.max(state.poops.length, Math.min(28, Math.ceil(livingFish.length * (1.2 + targetBaseDirtiness * 1.6))))
    : state.poops.length;

  for (let index = state.poops.length; index < desiredPoopCount; index += 1) {
    const fish = livingFish[index % livingFish.length] || null;
    const xNorm = fish
      ? clamp((fish.xNorm || 0.5) + randomBetween(-0.08, 0.08), 0.08, 0.92)
      : clamp(0.09 + (index / Math.max(1, desiredPoopCount - 1)) * 0.82 + randomBetween(-0.02, 0.02), 0.08, 0.92);
    state.poops.push(createPoopRecord({
      fishId: fish?.id || "",
      createdAt: now - randomBetween(POOP_FALL_MS * 0.6, POOP_FALL_MS + 7 * 60 * 1000),
      xNorm,
      startYNorm: fish ? clamp((fish.yNorm || 0.5) + 0.04, 0.14, 0.8) : randomSwimY(),
      tankLayer: fish ? getFishTankLayer(fish) : 1
    }));
  }

  runtime.cleaningTransition = null;
  runtime.cleaningMode = false;
  runtime.toolModeSource = null;
  runtime.pointerDown = false;
  clearScrubProgress();
  renderToolCursor();
  const nextCleanliness = Math.max(0, Math.round((1 - getBaseTankDirtiness(now)) * 100));
  pushEvent(eventMessage(nextCleanliness), now);
  saveState();
  renderUi(now);
  showToast(toastMessage(nextCleanliness));
}

function increaseTankDirtinessDebug() {
  const now = Date.now();
  syncState(now);

  const currentBaseDirtiness = getBaseTankDirtiness(now);
  if (currentBaseDirtiness >= 0.995) {
    showToast("The tank is already at maximum dirtiness.");
    return;
  }

  const targetBaseDirtiness = clamp(currentBaseDirtiness + 0.1, 0, 1);
  applyDebugTankDirtiness(
    targetBaseDirtiness,
    now,
    (nextCleanliness) => `Debug grime increased. Tank cleanliness dropped to ${nextCleanliness}%.`,
    () => "-10% cleanliness."
  );
}

function maxTankDirtinessDebug() {
  const now = Date.now();
  syncState(now);

  const currentBaseDirtiness = getBaseTankDirtiness(now);
  if (currentBaseDirtiness >= 0.995) {
    showToast("The tank is already at maximum dirtiness.");
    return;
  }

  applyDebugTankDirtiness(
    1,
    now,
    (nextCleanliness) => `Debug tank dirtiness maxed. Tank cleanliness dropped to ${nextCleanliness}%.`,
    () => "Tank dirtiness maxed."
  );
}

function addDebugCoins(amount = 10) {
  const now = Date.now();
  const coinAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!coinAmount) {
    return;
  }

  state.coins = Math.min(MAX_WALLET_COINS, state.coins + coinAmount);
  pushEvent(`Debug coins added. +${coinAmount} ${pluralize("coin", coinAmount)}.`, now);
  saveState();
  renderUi(now);
  showToast(`+${coinAmount} ${pluralize("coin", coinAmount)}.`);
}

function restoreAllFishHealthDebug() {
  const now = Date.now();
  let healedCount = 0;

  for (const fish of [...state.fish, ...state.storedFish]) {
    if (!fish || isFishDead(fish)) {
      continue;
    }

    const maxHealthUnits = getFishMaxHealthUnits(fish);
    const nextHealthUnits = clamp(maxHealthUnits, 0, maxHealthUnits);
    const nextComfortDamageProgressMs = 0;
    const nextMissedMealsInRow = 0;
    const nextFedStreak = 0;
    const changed = fish.healthUnits !== nextHealthUnits
      || (Number(fish.comfortDamageProgressMs) || 0) !== nextComfortDamageProgressMs
      || (Number(fish.missedMealsInRow) || 0) !== nextMissedMealsInRow
      || (Number(fish.fedStreak) || 0) !== nextFedStreak;

    fish.healthUnits = nextHealthUnits;
    fish.comfortDamageProgressMs = nextComfortDamageProgressMs;
    fish.missedMealsInRow = nextMissedMealsInRow;
    fish.fedStreak = nextFedStreak;

    if (changed) {
      healedCount += 1;
    }
  }

  if (!healedCount) {
    showToast("All living fish are already at full health.");
    return;
  }

  pushEvent(`Debug health reset restored ${healedCount} ${pluralize("fish", healedCount)} to full hearts.`, now);
  saveState();
  renderUi(now);
  showToast(`Full hearts restored for ${healedCount} ${pluralize("fish", healedCount)}.`);
}

function resetMealsDebug() {
  const now = Date.now();
  const slots = getTodaysMealSlots(now);
  let cleared = 0;

  for (const slot of slots) {
    if (state.mealHistory?.[slot.key]) {
      delete state.mealHistory[slot.key];
      cleared += 1;
    }
  }

  if (!cleared) {
    showToast("Today's meals are already reset.");
    return;
  }

  pushEvent("Debug meal reset cleared today's feeding record.", now);
  saveState();
  renderUi(now);
  showToast("Today's meals reset.");
}

function completeMealsDebug() {
  const now = Date.now();
  const slots = getTodaysMealSlots(now);
  let completedSlots = 0;
  let creditedFishCount = 0;

  for (const slot of slots) {
    const eligibleFish = getMealEligibleFishForSlot(slot);
    if (!eligibleFish.length) {
      continue;
    }

    const entry = ensureMealHistoryEntry(slot.key, now);
    const fedFishIds = new Set(Array.isArray(entry.fishIds) ? entry.fishIds : []);
    const beforeCount = fedFishIds.size;
    for (const fish of eligibleFish) {
      fedFishIds.add(fish.id);
      fish.lastAteAt = Math.max(Number(fish.lastAteAt) || 0, now);
    }
    entry.fishIds = [...fedFishIds];
    entry.fedAt = Math.max(Number(entry.fedAt) || 0, now);
    if (fedFishIds.size > beforeCount) {
      completedSlots += 1;
      creditedFishCount += fedFishIds.size - beforeCount;
    }
  }

  if (!completedSlots) {
    showToast("Today's meals are already complete.");
    return;
  }

  pushEvent(`Debug meal completion marked today's meals complete for ${creditedFishCount} ${pluralize("fish", creditedFishCount)}.`, now);
  saveState();
  renderUi(now);
  showToast("Today's meals completed.");
}

function dispenseAutoDispenserNow(now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    showToast("Install a pellet dispenser first.");
    return false;
  }

  const dispenser = state.autoDispenser;
  const requested = clamp(
    Math.round(Number(dispenser?.mealPortion) || 0),
    AUTO_DISPENSER_PORTION_MIN,
    AUTO_DISPENSER_PORTION_MAX
  );

  if (requested <= 0) {
    showToast("Set the pellet dispenser amount above 00 first.");
    return false;
  }

  const availableCount = getAutoDispenserLoadedCount(dispenser);
  if (availableCount <= 0) {
    dispenser.refillAlert = true;
    saveState();
    renderUi(now);
    showToast("The pellet dispenser is empty.");
    return false;
  }

  const releaseCount = Math.min(requested, availableCount);
  const releasedPellets = dispenser.storedPellets.splice(0, releaseCount);
  const floatingPellets = releasedPellets
    .map((storedPellet, index) => createAutoDispenserDroppedPellet(storedPellet, now + index * AUTO_DISPENSER_RELEASE_SPACING_MS))
    .filter(Boolean);

  if (floatingPellets.length > 0) {
    state.floatingPellets.push(...floatingPellets);
    assignFloatingPelletsToHungryFish(now);
    playDispenserSoundEffect();
    pushEvent(
      `The pellet dispenser manually released ${floatingPellets.length} pellet${floatingPellets.length === 1 ? "" : "s"}.`,
      now
    );
  }

  const ranEmpty = requested > releaseCount || (requested > 0 && getAutoDispenserLoadedCount(dispenser) <= 0);
  dispenser.refillAlert = ranEmpty;
  if (ranEmpty && releaseCount > 0) {
    pushEvent("The pellet dispenser ran empty during a manual release.", now);
  }

  saveState();
  renderUi(now);
  if (floatingPellets.length > 0) {
    showToast(`Dispenser released ${floatingPellets.length} pellet${floatingPellets.length === 1 ? "" : "s"}.`);
    return true;
  }

  showToast("The pellet dispenser could not release pellets right now.");
  return false;
}

function triggerDebugGravelPebbleTest() {
  const now = Date.now();
  if (!canUseFishGravelPebblePlay()) {
    showToast("Add gravel pebble assets to use the gravel pebble debug.");
    return;
  }

  const fish = pickFishGravelPebbleDebugCandidate(now);
  if (!fish) {
    showToast("Keep a living non-sucker fish in the tank to test gravel pebble play.");
    return;
  }

  const species = getSpeciesForFish(fish);
  if (!species) {
    return;
  }

  clearAllFishGravelPebbleActions(now);
  if (!startFishGravelPebbleAction(fish, species, now, { force: true })) {
    showToast("That fish could not start a gravel pebble test right now.");
    return;
  }

  runtime.selectedFishId = fish.id;
  pushEvent(`Debug sent ${fish.name} to toss a gravel pebble.`, now);
  renderUi(now);
  showToast(`${fish.name} is heading down to grab a pebble.`);
}

function triggerDebugGravelDigTest() {
  const now = Date.now();
  const fish = pickFishGravelDigDebugCandidate(now);
  if (!fish) {
    showToast("Keep a living non-sucker fish in the tank to test gravel digging.");
    return;
  }

  const species = getSpeciesForFish(fish);
  if (!species) {
    return;
  }

  if (!startFishGravelDigAction(fish, species, now)) {
    showToast("That fish could not start digging right now.");
    return;
  }

  runtime.selectedFishId = fish.id;
  pushEvent(`Debug sent ${fish.name} to dig in the gravel.`, now);
  renderUi(now);
  showToast(`${fish.name} is heading down to dig.`);
}

function isDebugCaveTestFish(fish) {
  return Boolean(runtime.debugNightCaveMode && fish?.id && runtime.debugForcedCaveFishId === fish.id);
}

function clearDebugCaveTestSelection() {
  runtime.debugForcedCaveFishId = null;
  runtime.debugForcedCaveDecorId = null;
}

function buildDebugFallbackCavePathNodes(item, mouthPoint, insidePoint) {
  if (!item || !mouthPoint || !insidePoint) {
    return [];
  }

  const nodes = [];
  for (const t of [0.35, 0.68, 1]) {
    const point = {
      xNorm: mouthPoint.xNorm + (insidePoint.xNorm - mouthPoint.xNorm) * t,
      yNorm: mouthPoint.yNorm + (insidePoint.yNorm - mouthPoint.yNorm) * t
    };
    if (t < 1 && !isPointInsideCaveInteriorDescriptor(item, point)) {
      continue;
    }
    nodes.push(point);
  }

  if (!nodes.length) {
    nodes.push({ ...insidePoint });
  }

  const lastNode = nodes[nodes.length - 1];
  if (Math.hypot(lastNode.xNorm - insidePoint.xNorm, lastNode.yNorm - insidePoint.yNorm) > 0.0005) {
    nodes.push({ ...insidePoint });
  }

  return nodes;
}

function buildDebugFallbackCavePlan(item, fish, now = Date.now()) {
  if (!item || !fish) {
    return null;
  }

  const species = getSpeciesForFish(fish);
  if (!species || species.behavior === "sucker" || species.caveEnabled === false) {
    return null;
  }

  const triggerRegions = getCaveTriggerRegions(item);
  const seatRegions = getCaveSeatRegions(item);
  if (!triggerRegions.length || !seatRegions.length) {
    return null;
  }

  const trigger = [...triggerRegions]
    .sort((left, right) => Math.hypot(left.xNorm - fish.xNorm, left.yNorm - fish.yNorm) - Math.hypot(right.xNorm - fish.xNorm, right.yNorm - fish.yNorm))[0];
  const seat = [...seatRegions]
    .sort((left, right) => Math.hypot(left.xNorm - trigger.xNorm, left.yNorm - trigger.yNorm) - Math.hypot(right.xNorm - trigger.xNorm, right.yNorm - trigger.yNorm))[0];
  if (!trigger || !seat) {
    return null;
  }

  const profile = getCaveBehaviorProfileForItem(item);
  const matchedPortal = Array.isArray(profile?.portals)
    ? profile.portals
      .map((portal) => {
        const mouth = mapDecorLocalPointToTankNorm(item, portal.mouthX, portal.mouthY);
        const approach = mapDecorLocalPointToTankNorm(item, portal.approachX, portal.approachY);
        if (!mouth || !approach) {
          return null;
        }

        return {
          portal,
          mouth,
          approach,
          score: Math.hypot(mouth.xNorm - trigger.xNorm, mouth.yNorm - trigger.yNorm)
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.score - right.score)[0]
    : null;

  const approach = matchedPortal?.approach || {
    xNorm: trigger.xNorm,
    yNorm: clamp(trigger.yNorm + 0.08, 0.14, 0.8)
  };
  const mouth = matchedPortal?.mouth || {
    xNorm: trigger.xNorm,
    yNorm: trigger.yNorm
  };
  const seatDirection = getCaveSeatFacingDirection(seat, fish.direction || 1);
  const inside = pickCaveSeatIdleTarget(item, seat, fish, species, now, seatDirection) || {
    xNorm: seat.xNorm,
    yNorm: seat.yNorm
  };
  const entryPathNodes = buildDebugFallbackCavePathNodes(item, mouth, inside);
  const exitPathNodes = entryPathNodes.slice().reverse();
  const currentLayer = getFishTankLayer(fish);
  const frontLayer = clampTankLayer(matchedPortal?.portal?.outsideLayer || (CAVE_ALLOWED_OUTSIDE_LAYERS.includes(currentLayer) ? currentLayer : 2));
  const backLayer = getCaveInsideLayerForItem(item);

  return {
    decorId: item.id,
    portalId: matchedPortal?.portal?.id || trigger.id,
    triggerId: trigger.id,
    seatId: seat.id,
    seatDirection,
    frontLayer,
    backLayer,
    approach,
    mouth,
    inside,
    entryPathNodes,
    exitPathNodes,
    lingerMs: Math.max(CAVE_TRIGGER_COOLDOWN_MS + 3000, Number(profile?.lingerMinMs) || 14000),
    score: Math.hypot(fish.xNorm - trigger.xNorm, fish.yNorm - trigger.yNorm),
    debugForced: true
  };
}

function collectDebugCaveTestPlansForFish(fish, now = Date.now(), options = {}) {
  const normalPlans = collectCaveBehaviorPlansForFish(fish, now, options);
  if (normalPlans.length) {
    return normalPlans;
  }

  const ignoreBlockedDecor = options.ignoreBlockedDecor === true;
  return state.placedDecor
    .filter((item) => isCaveDecorKey(item.decorKey))
    .filter((item) => !(
      !ignoreBlockedDecor &&
      fish.blockedDecorId &&
      item.id === fish.blockedDecorId &&
      Number.isFinite(fish.blockedDecorUntil) &&
      now < fish.blockedDecorUntil
    ))
    .map((item) => buildDebugFallbackCavePlan(item, fish, now))
    .filter(Boolean)
    .sort((left, right) => left.score - right.score);
}

function getDebugCaveTestAssignment(now = Date.now(), options = {}) {
  if (!runtime.debugNightCaveMode) {
    return null;
  }

  const ignoreBlockedDecor = options.ignoreBlockedDecor !== false;
  const activelyDraggedFishId = runtime.fishDragState?.fishId || null;
  const buildCandidate = (fish) => {
    if (!fish || fish.id === activelyDraggedFishId || isFishDead(fish)) {
      return null;
    }

    const species = getSpeciesForFish(fish);
    if (!species || species.behavior === "sucker" || species.caveEnabled === false) {
      return null;
    }

    let plans = collectDebugCaveTestPlansForFish(fish, now, { ignoreBlockedDecor });
    if (runtime.debugForcedCaveDecorId) {
      plans = plans.filter((plan) => plan.decorId === runtime.debugForcedCaveDecorId);
    }
    if (!plans.length) {
      return null;
    }

    return { fish, species, plans };
  };

  const currentFish = state.fish.find((fish) => fish.id === runtime.debugForcedCaveFishId);
  const currentCandidate = buildCandidate(currentFish);
  if (currentCandidate) {
    return currentCandidate;
  }

  clearDebugCaveTestSelection();

  const candidates = state.fish
    .map((fish) => buildCandidate(fish))
    .filter(Boolean);
  if (!candidates.length) {
    return null;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const chosenPlan = chosen.plans[Math.floor(Math.random() * chosen.plans.length)];
  runtime.debugForcedCaveFishId = chosen.fish.id;
  runtime.debugForcedCaveDecorId = chosenPlan.decorId;
  return {
    fish: chosen.fish,
    species: chosen.species,
    plans: chosen.plans.filter((plan) => plan.decorId === chosenPlan.decorId)
  };
}

function startDebugCaveLoopCycle(now = Date.now(), options = {}) {
  const { silentFailure = false, suppressEvent = false } = options;
  const assignment = getDebugCaveTestAssignment(now, { ignoreBlockedDecor: true });
  if (!assignment?.plans?.length) {
    if (!silentFailure) {
      showToast("Add a cave and a cave-enabled living fish to test cave behavior.");
    }
    return null;
  }

  const fish = assignment.fish;
  const plan = assignment.plans[Math.floor(Math.random() * assignment.plans.length)];
  const decor = state.placedDecor.find((item) => item.id === plan.decorId);
  const decorName = decor ? (runtime.decorMap.get(decor.decorKey)?.name || titleFromFile(decor.decorKey)) : "the cave";

  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.blockedDecorId = null;
  fish.blockedDecorUntil = null;
  fish.caveTriggerCooldownUntil = null;
  clearFishCaveBehavior(fish);
  fish.hangoutDecorId = null;
  fish.targetAt = now;
  releasePelletsTargetingFishIds(fish.id);

  if (assignment.species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(assignment.species);
  }

  beginFishCaveBehavior(fish, plan, now);
  runtime.selectedFishId = fish.id;

  if (!suppressEvent) {
    pushEvent(`Debug sent ${fish.name} to test ${decorName}.`, now);
  }

  return `${fish.name} is testing ${decorName}.`;
}

function toggleDebugNightCaveMode() {
  const now = Date.now();
  runtime.debugNightCaveMode = !runtime.debugNightCaveMode;

  if (runtime.debugNightCaveMode) {
    clearDebugCaveTestSelection();
    const immediateCaveToast = startDebugCaveLoopCycle(now, { silentFailure: true, suppressEvent: true });
    pushEvent("Debug cave test loop enabled.", now);
    showToast(immediateCaveToast || "Cave test loop enabled, but no cave test assignment was found yet.");
  } else {
    const debugFish = state.fish.find((fish) => fish.id === runtime.debugForcedCaveFishId) || null;
    clearDebugCaveTestSelection();
    if (debugFish?.caveState) {
      abortFishCaveBehavior(debugFish, now, false);
      debugFish.targetAt = now;
    }
    pushEvent("Debug cave test loop disabled.", now);
    showToast("Cave test loop disabled.");
  }

  renderUi(now);
}

function getDebugBehaviorScenarioOptions(action) {
  switch (action) {
    case "refuse-food":
      return { allowFeeding: true, requireNormalFood: true, disallowSpecial: true };
    case "anticipate-food":
      return { requireNormalFood: true, disallowSpecial: true };
    case "inspect-lure":
      return { allowPredatorSpecial: true };
    case "disease":
      return { allowSuckerSpecial: true, allowPredatorSpecial: true };
    case "night-forage":
      return { allowSuckerSpecial: true };
    case "clear":
      return { allowActiveCave: true, allowFeeding: true, allowGravelAction: true, allowUndead: true, allowSuckerSpecial: true, allowPredatorSpecial: true, allowDead: true };
    default:
      return { disallowSpecial: true };
  }
}

function getDebugBehaviorBlockReason(fish, species = getSpeciesForFish(fish), options = {}) {
  if (!fish) {
    return "Select a fish in the tank first.";
  }
  if (!species) {
    return "Selected fish has no species profile.";
  }
  if (!options.allowDead && isFishDead(fish)) {
    return "Select a living fish first.";
  }
  if (runtime.fishDragState?.fishId === fish.id) {
    return "Release the selected fish before forcing behavior.";
  }
  if (!options.allowActiveCave && fish.caveState) {
    return "That fish is using cave behavior right now.";
  }
  if (!options.allowFeeding && fish.activity === "feeding") {
    return "That fish is feeding right now.";
  }
  if (
    !options.allowGravelAction
    && (
      fish.activity === FISH_GRAVEL_DIG_ACTIVITY
      || fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY
      || getFishGravelPebbleAction(fish)
      || getForcedGravelDigPrompt(fish)
    )
  ) {
    return "That fish is already using a gravel behavior.";
  }
  if (!options.allowUndead && isUndeadFish(fish)) {
    return "Zombie and skeleton fish keep their own behavior debug path.";
  }

  const effectiveBehavior = getEffectiveFishBehavior(fish, species);
  if (
    options.disallowSpecial
    && ["sucker", "piranha", "zombie", "skeleton"].includes(effectiveBehavior)
  ) {
    return `${getDebugFishDisplayName(fish, species)} uses protected ${effectiveBehavior} behavior.`;
  }
  if (
    effectiveBehavior === "sucker"
    && !options.allowSuckerSpecial
  ) {
    return `${getDebugFishDisplayName(fish, species)} uses protected cleanup behavior.`;
  }
  if (effectiveBehavior === "piranha" && !options.allowPredatorSpecial) {
    return `${getDebugFishDisplayName(fish, species)} uses protected predator behavior.`;
  }
  if (
    options.requireNormalFood
    && (
      isMealFreeFish(fish)
      || effectiveBehavior === "piranha"
      || !canFoodSatisfyFishMeal(fish, "basic")
    )
  ) {
    return `${getDebugFishDisplayName(fish, species)} does not use normal pellet feeding.`;
  }
  return "";
}

function getSelectedDebugBehaviorFish(options = {}) {
  const fish = state?.fish?.find((entry) => entry?.id === runtime.selectedFishId) || null;
  const species = getSpeciesForFish(fish);
  return {
    fish,
    species,
    reason: getDebugBehaviorBlockReason(fish, species, options)
  };
}

function getDebugBehaviorSelectedFishOrToast(action) {
  const selection = getSelectedDebugBehaviorFish(getDebugBehaviorScenarioOptions(action));
  if (selection.reason) {
    showToast(selection.reason);
    return null;
  }
  return selection;
}

function hasDebugDecorHangoutZone(zoneTypes) {
  const allowed = new Set(normalizeStringList(zoneTypes).map((type) => type.toLowerCase().replace(/[-_\s]+/g, "-")));
  if (!allowed.size) {
    return false;
  }
  return getCachedDecorHangoutZones().some((zone) => allowed.has(zone.type));
}

function getDebugRelationshipPartner(fish) {
  if (!fish) {
    return null;
  }
  return state.fish
    .filter((otherFish) => otherFish && otherFish.id !== fish.id && !isFishDead(otherFish))
    .filter((otherFish) => runtime.fishDragState?.fishId !== otherFish.id)
    .map((otherFish) => ({
      fish: otherFish,
      distance: Math.hypot((fish.xNorm || 0.5) - (otherFish.xNorm || 0.5), (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5))
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.fish || null;
}

function setDebugFishRelationship(fish, otherFish, kind, now = Date.now()) {
  if (!fish || !otherFish || fish.id === otherFish.id) {
    return false;
  }
  const score = kind === "friend" ? 88 : kind === "fear" ? -92 : kind === "rival" ? -72 : kind === "dislike" ? -48 : 0;
  const relationships = sanitizeFishRelationships(fish.relationships);
  relationships[otherFish.id] = { kind, score, updatedAt: now };
  fish.relationships = relationships;
  fish.relationshipNextCheckAt = now + BEHAVIOR_RELATIONSHIP_CHECK_MS;
  return true;
}

function prepareFishForDebugBehavior(fish, species, now = Date.now(), options = {}) {
  const reason = getDebugBehaviorBlockReason(fish, species, options);
  if (reason) {
    showToast(reason);
    return false;
  }
  clearFishSchoolFollowState(fish);
  clearDebugBehaviorSteering(fish);
  if (!options.keepFeeding) {
    fish.activity = "roam";
    fish.feedingPelletId = null;
    releasePelletsTargetingFishIds(fish.id);
  }
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species);
  }
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  return true;
}

function finishDebugBehaviorScenario(fish, eventText, toastText, now = Date.now()) {
  runtime.selectedFishId = fish?.id || runtime.selectedFishId;
  if (eventText) {
    pushEvent(eventText, now);
  }
  saveState();
  renderUi(now);
  if (toastText) {
    showToast(toastText);
  }
}

function forceLightsOutForDebug(now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank) {
    return false;
  }
  tank.lightsOutOverride = LIGHTS_OUT_OVERRIDE_ON;
  return isTankLightsOut(now, tank);
}

function getActiveDebugBehaviorSteering(fish, now = Date.now()) {
  if (!fish?.id || !runtime.debugBehaviorSteeringByFishId) {
    return null;
  }
  const steering = runtime.debugBehaviorSteeringByFishId.get(fish.id);
  if (!steering) {
    return null;
  }
  if (!isDebugModeEnabled() || (Number(steering.expiresAt) || 0) <= now) {
    runtime.debugBehaviorSteeringByFishId.delete(fish.id);
    return null;
  }
  return steering;
}

function setDebugBehaviorSteering(fish, steering, now = Date.now()) {
  if (!fish?.id || !steering?.type) {
    return false;
  }
  const durationMs = Math.max(1000, Number(steering.durationMs) || 12 * 1000);
  runtime.debugBehaviorSteeringByFishId.set(fish.id, {
    ...steering,
    type: String(steering.type),
    startedAt: now,
    expiresAt: now + durationMs,
    nextRefreshAt: 0,
    faceDirection: Number.isFinite(Number(steering.faceDirection))
      ? (Number(steering.faceDirection) < 0 ? -1 : 1)
      : null,
    initialSide: Number.isFinite(Number(steering.initialSide))
      ? (Number(steering.initialSide) < 0 ? -1 : 1)
      : null
  });
  return true;
}

function clearDebugBehaviorSteering(fish) {
  if (fish?.id && runtime.debugBehaviorSteeringByFishId) {
    runtime.debugBehaviorSteeringByFishId.delete(fish.id);
  }
}

function getDebugBehaviorFacingDirection(fish, now = Date.now()) {
  if (!fish || fish.caveState || fish.activity !== "roam") {
    return null;
  }
  const steering = getActiveDebugBehaviorSteering(fish, now);
  if (!steering || !["inspect-lure", "anticipate-food"].includes(steering.type)) {
    return null;
  }
  return Number.isFinite(Number(steering.faceDirection))
    ? (Number(steering.faceDirection) < 0 ? -1 : 1)
    : null;
}

function isDebugBehaviorSteeringBlocked(fish, species, steering, now = Date.now()) {
  if (!fish || !species || !steering || isFishDead(fish) || fish.caveState || fish.activity !== "roam") {
    return true;
  }
  if (runtime.fishDragState?.fishId === fish.id || getFishEntryProgress(fish, now) !== null) {
    return true;
  }
  const effectiveBehavior = getEffectiveFishBehavior(fish, species);
  if (isUndeadFish(fish) && !steering.allowUndead) {
    return true;
  }
  if (effectiveBehavior === "sucker" && !steering.allowSuckerSpecial) {
    return true;
  }
  if (effectiveBehavior === "piranha" && !steering.allowPredatorSpecial) {
    return true;
  }
  return false;
}

function setDebugBehaviorSteeringIntent(fish, steering, type, cause, now = Date.now(), options = {}) {
  setFishBehaviorIntent(fish, type, cause, now, {
    targetId: options.targetId || steering.targetFishId || steering.decorId || "",
    targetName: options.targetName || steering.targetName || "",
    durationMs: options.durationMs || DEBUG_BEHAVIOR_STEER_REFRESH_MS * 5
  });
  if (options.signalType) {
    recordFishBehaviorSignal(fish, options.signalType, now, {
      debugText: options.debugText || `${type} | ${cause}`,
      cooldownMs: options.cooldownMs || BEHAVIOR_SIGNAL_COOLDOWN_MS,
      targetName: options.targetName || steering.targetName || "",
      placedDecorId: options.placedDecorId || steering.decorId || ""
    });
  }
}

function updateDebugFollowSteering(fish, species, steering, now = Date.now()) {
  const targetFish = state.fish.find((entry) => entry?.id === steering.targetFishId && !isFishDead(entry));
  if (!targetFish) {
    clearDebugBehaviorSteering(fish);
    return false;
  }
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }

  const elapsed = Math.max(0, now - (Number(steering.startedAt) || now));
  const targetDirection = getFishFacingDirection(targetFish);
  const distance = Math.hypot((fish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (fish.yNorm || 0.5) - (targetFish.yNorm || 0.5));
  const sideWobble = Math.sin(elapsed / 1100 + (fish.phase || 0) * Math.PI * 2) * 0.012;
  const verticalWobble = Math.cos(elapsed / 1350 + (fish.phase || 0) * Math.PI * 2) * 0.016;
  const leaderMoveX = (targetFish.targetXNorm || targetFish.xNorm || 0.5) - (targetFish.xNorm || 0.5);
  const leaderMoveY = (targetFish.targetYNorm || targetFish.yNorm || 0.5) - (targetFish.yNorm || 0.5);
  const leaderMoveDistance = Math.hypot(leaderMoveX, leaderMoveY);
  const leaderHeadingX = leaderMoveDistance > 0.002 ? leaderMoveX / leaderMoveDistance : targetDirection;
  const leaderHeadingY = leaderMoveDistance > 0.002 ? leaderMoveY / leaderMoveDistance : 0;
  const lookahead = leaderMoveDistance > 0.002
    ? DEBUG_BEHAVIOR_FOLLOW_LOOKAHEAD_NORM * (distance <= DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM ? 1.2 : 0.7)
    : 0;
  const trailX = (targetFish.xNorm || 0.5) - targetDirection * DEBUG_BEHAVIOR_FOLLOW_DISTANCE_NORM + sideWobble;
  const trailY = (targetFish.yNorm || 0.5) + verticalWobble;
  fish.targetXNorm = clamp(trailX + leaderHeadingX * lookahead, 0.08, 0.92);
  fish.targetYNorm = clampFishYNormToLayer(
    trailY + leaderHeadingY * lookahead,
    fish,
    species,
    getFishTankLayer(targetFish),
    { minYNorm: 0.14, maxYNorm: 0.8 }
  );
  fish.targetAt = now + 520;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  setFishDesiredTankLayer(fish, getFishTankLayer(targetFish));
  steering.distanceNorm = distance;
  steering.leaderSwimSpeed = Number(targetFish.swimSpeed) || 0;
  steering.leaderMoving = leaderMoveDistance > 0.002;
  if (species.speedMode === "dynamic") {
    const targetSpecies = getSpeciesForFish(targetFish);
    const leaderSpeed = Number(targetFish.swimSpeed) || (targetSpecies ? normalizeFishSpeed(targetSpecies) : species.speedMin);
    const catchupFactor = distance > DEBUG_BEHAVIOR_FOLLOW_CATCHUP_NORM
      ? 1.18
      : distance > DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM
        ? 1.03
        : 0.92;
    fish.swimSpeed = normalizeFishSpeed(species, leaderSpeed * catchupFactor);
  }
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "follow", "friend", now, {
    targetName: steering.targetName || getDebugFishDisplayName(targetFish),
    signalType: "follow_friend",
    debugText: `follow ${steering.targetName || getDebugFishDisplayName(targetFish)} | friend`
  });
  return true;
}

function updateDebugAvoidSteering(fish, species, steering, now = Date.now()) {
  const targetFish = state.fish.find((entry) => entry?.id === steering.targetFishId && !isFishDead(entry));
  if (!targetFish) {
    clearDebugBehaviorSteering(fish);
    return false;
  }
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }

  const distance = Math.hypot((fish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (fish.yNorm || 0.5) - (targetFish.yNorm || 0.5));
  const retreatNorm = distance <= DEBUG_BEHAVIOR_AVOID_RANGE_NORM
    ? DEBUG_BEHAVIOR_AVOID_RETREAT_NORM
    : DEBUG_BEHAVIOR_AVOID_RETREAT_NORM * 0.48;
  const escape = getAvoidanceEscapeTarget(fish, species, targetFish, {
    retreatNorm,
    verticalScale: 0.72,
    cornerThreatRadius: DEBUG_BEHAVIOR_AVOID_RANGE_NORM
  });
  fish.targetXNorm = escape?.xNorm ?? fish.xNorm;
  fish.targetYNorm = escape?.yNorm ?? fish.yNorm;
  fish.targetAt = now + (escape?.cornerEscape ? 520 : 760);
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  if (escape?.targetLayer) {
    setFishDesiredTankLayer(fish, escape.targetLayer);
  }
  if (species.speedMode === "dynamic") {
    const speedBlend = distance <= DEBUG_BEHAVIOR_AVOID_RANGE_NORM ? 0.96 : 0.68;
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * speedBlend);
  }
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "avoid", "fear", now, {
    targetName: steering.targetName || getDebugFishDisplayName(targetFish),
    signalType: "avoid_specific_fish",
    debugText: `avoid ${steering.targetName || getDebugFishDisplayName(targetFish)} | fear`
  });
  return true;
}

function updateDebugLureInspectSteering(fish, species, steering, now = Date.now()) {
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }
  const decor = state.placedDecor.find((item) => item?.id === steering.decorId) || null;
  const stableScale = getViewportStableAssetScale();
  const focusXNorm = clamp(Number.isFinite(Number(steering.focusXNorm)) ? Number(steering.focusXNorm) : (decor?.xNorm ?? fish.xNorm ?? 0.5), 0.08, 0.92);
  const focusYNorm = clamp(Number.isFinite(Number(steering.focusYNorm)) ? Number(steering.focusYNorm) : (decor?.yNorm ?? fish.yNorm ?? 0.5), 0.08, 0.84);
  const elapsed = Math.max(0, now - (Number(steering.startedAt) || now));
  const initialSide = steering.initialSide || ((fish.xNorm || 0.5) <= focusXNorm ? -1 : 1);
  const side = Math.floor(elapsed / DEBUG_BEHAVIOR_LURE_SIDE_MS) % 2 === 0 ? initialSide : -initialSide;
  const faceDirection = side < 0 ? 1 : -1;
  const mouthTargetX = focusXNorm * TANK_WIDTH + side * 9 * stableScale;
  const mouthTargetY = focusYNorm * TANK_HEIGHT + Math.sin(elapsed / 1250 + (fish.phase || 0) * Math.PI) * 7 * stableScale;
  const mouthTarget = getFishTargetNormForMouthPoint(fish, species, mouthTargetX, mouthTargetY, now, {
    direction: faceDirection,
    localForwardOffsetPx: 3 * stableScale,
    minYNorm: 0.12,
    maxYNorm: 0.84
  });
  fish.targetXNorm = mouthTarget ? mouthTarget.xNorm : clamp(focusXNorm + side * 0.065, 0.08, 0.92);
  fish.targetYNorm = mouthTarget ? mouthTarget.yNorm : clamp(focusYNorm + Math.sin(elapsed / 1250) * 0.018, 0.14, 0.8);
  fish.targetAt = now + 680;
  fish.hangoutDecorId = steering.decorId || null;
  fish.hangoutZoneType = "lure";
  setFishDesiredTankLayer(fish, Number.isFinite(Number(steering.targetLayer)) ? clampTankLayer(Number(steering.targetLayer)) : getFishTankLayer(fish));
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * 0.58);
  }
  steering.faceDirection = faceDirection;
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "inspect lure", steering.cause || "curious", now, {
    signalType: "inspect_lure",
    debugText: `inspect lure | ${steering.cause || "curious"}`
  });
  return true;
}

function updateDebugAnticipateFoodSteering(fish, species, steering, now = Date.now()) {
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }
  const focusXNorm = clamp(Number(steering.foodXNorm) || fish.xNorm || 0.5, 0.08, 0.92);
  const focusYNorm = clamp(Number(steering.foodYNorm) || 0.28, 0.08, 0.7);
  const targetYNorm = clampFishYNormToLayer(
    focusYNorm + 0.075,
    fish,
    species,
    clampTankLayer(Math.min(getFishTankLayer(fish), 2)),
    { minYNorm: 0.14, maxYNorm: 0.62 }
  );
  fish.targetXNorm = focusXNorm;
  fish.targetYNorm = targetYNorm;
  fish.targetAt = now + 920;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  setFishDesiredTankLayer(fish, clampTankLayer(Math.min(getFishTankLayer(fish), 2)));
  if (Math.abs(focusXNorm - (fish.xNorm || 0.5)) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
    steering.faceDirection = focusXNorm >= (fish.xNorm || 0.5) ? 1 : -1;
  } else if (!Number.isFinite(Number(steering.faceDirection))) {
    steering.faceDirection = fish.direction || 1;
  }
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * 0.24);
  }
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "anticipate food", "feeding memory", now, {
    durationMs: DEBUG_BEHAVIOR_STEER_REFRESH_MS * 5
  });
  return true;
}

function updateDebugBehaviorSteering(fish, species, now = Date.now()) {
  const steering = getActiveDebugBehaviorSteering(fish, now);
  if (!steering || isDebugBehaviorSteeringBlocked(fish, species, steering, now)) {
    return false;
  }
  switch (steering.type) {
    case "follow":
      return updateDebugFollowSteering(fish, species, steering, now);
    case "avoid":
      return updateDebugAvoidSteering(fish, species, steering, now);
    case "inspect-lure":
      return updateDebugLureInspectSteering(fish, species, steering, now);
    case "anticipate-food":
      return updateDebugAnticipateFoodSteering(fish, species, steering, now);
    default:
      return false;
  }
}

function getDebugAnticipateFoodTarget(fish, now = Date.now()) {
  const memory = sanitizeFeedingMemory(fish?.feedingMemory, now);
  let foodXNorm = Number.isFinite(Number(memory.feederXNorm)) ? memory.feederXNorm : memory.lastFoodXNorm;
  let foodYNorm = Number.isFinite(Number(memory.feederYNorm))
    ? clamp(memory.feederYNorm + 0.1, 0.12, 0.42)
    : memory.lastFoodYNorm;

  if (!Number.isFinite(Number(foodXNorm)) || !Number.isFinite(Number(foodYNorm))) {
    const activePellet = state.floatingPellets?.[0] || null;
    if (activePellet) {
      foodXNorm = activePellet.xNorm;
      foodYNorm = activePellet.yNorm;
    }
  }

  if ((!Number.isFinite(Number(foodXNorm)) || !Number.isFinite(Number(foodYNorm))) && hasAutoDispenserInstalled()) {
    const layout = getAutoDispenserLayout();
    foodXNorm = clamp((layout.nozzle.x || 0) / TANK_WIDTH, 0.08, 0.92);
    foodYNorm = clamp(((layout.nozzle.y || 0) + 58 * getViewportStableAssetScale()) / TANK_HEIGHT, 0.12, 0.42);
    memory.feederXNorm = foodXNorm;
    memory.feederYNorm = clamp((layout.nozzle.y || 0) / TANK_HEIGHT, 0.02, 0.42);
    memory.feederSeenAt = now;
  }

  if (!Number.isFinite(Number(foodXNorm)) || !Number.isFinite(Number(foodYNorm))) {
    foodXNorm = clamp(fish?.xNorm || 0.5, 0.08, 0.92);
    foodYNorm = clamp((fish?.yNorm || 0.35) - 0.08, 0.12, 0.52);
  }

  memory.lastFoodXNorm = clamp(Number(foodXNorm), 0.08, 0.92);
  memory.lastFoodYNorm = clamp(Number(foodYNorm), 0.08, 0.9);
  memory.lastFoodAt = memory.lastFoodAt || now;
  memory.updatedAt = now;
  if (fish) {
    fish.feedingMemory = memory;
  }
  return {
    foodXNorm: memory.lastFoodXNorm,
    foodYNorm: memory.lastFoodYNorm
  };
}

function triggerDebugBehaviorRefuseFood(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("refuse-food");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, { ...getDebugBehaviorScenarioOptions("refuse-food"), keepFeeding: true })) {
    return;
  }

  const existingPellet = (state.floatingPellets || []).find((pellet) => pellet && canFishTargetFoodPellet(fish, pellet, now));
  const pellet = existingPellet || {
    id: createId("debug-food-refusal"),
    foodKey: "basic",
    xNorm: clamp((fish.xNorm || 0.5) + (fish.direction || 1) * 0.08, 0.08, 0.92),
    yNorm: clamp((fish.yNorm || 0.5) + randomBetween(-0.04, 0.04), 0.14, 0.76),
    targetFishId: fish.id
  };
  recordFishFeedingMemory(fish, pellet, now);
  fish.activity = "roam";
  fish.targetXNorm = pellet.xNorm;
  fish.targetYNorm = pellet.yNorm;
  fish.targetAt = now + 1200;
  setFishBehaviorIntent(fish, "approach food", "debug refusal setup", now, {
    targetId: pellet.id,
    durationMs: 2600
  });
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  finishDebugBehaviorScenario(fish, `Debug set up ${fish.name} to approach food.`, `${fish.name} will approach food, then refuse it.`, now);

  window.setTimeout(() => {
    const targetFish = state?.fish?.find((entry) => entry?.id === fish.id) || null;
    const targetSpecies = getSpeciesForFish(targetFish);
    if (
      !isDebugModeEnabled()
      || getDebugBehaviorBlockReason(targetFish, targetSpecies, { ...getDebugBehaviorScenarioOptions("refuse-food"), allowFeeding: true })
    ) {
      return;
    }
    const refusalAt = Date.now();
    handleFishRefuseFoodPellet(targetFish, pellet, refusalAt);
    runtime.debugFishBehaviorSignatures.delete(targetFish.id);
    finishDebugBehaviorScenario(targetFish, `Debug made ${targetFish.name} refuse food.`, `${targetFish.name} refused the food.`, refusalAt);
  }, 1300);
}

function triggerDebugBehaviorAnticipateFood(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("anticipate-food");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("anticipate-food"))) {
    return;
  }

  const target = getDebugAnticipateFoodTarget(fish, now);
  setDebugBehaviorSteering(fish, {
    type: "anticipate-food",
    foodXNorm: target.foodXNorm,
    foodYNorm: target.foodYNorm,
    durationMs: DEBUG_BEHAVIOR_ANTICIPATE_FOOD_DURATION_MS
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} anticipate food.`, `${fish.name} is waiting under the remembered food spot.`, now);
}

function triggerDebugBehaviorHide(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("hide");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("hide"))) {
    return;
  }

  const cover = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["plant", "hide", "spooky"],
    force: true,
    ignoreOccupancy: true,
    lingerMultiplier: 2.6,
    preferBackLayer: true
  });
  if (!cover) {
    showToast("Add plants, caves, wrecks, or spooky decor to test hiding.");
    return;
  }

  applyBehaviorTarget(fish, species, {
    ...cover,
    intentType: "hide plant",
    intentCause: "shy + stressed",
    signalType: "hiding_more_than_usual",
    debugText: `hide ${cover.zoneType} | shy + stressed`,
    slow: true
  }, now);
  finishDebugBehaviorScenario(fish, `Debug sent ${fish.name} to hide near ${cover.zoneType}.`, `${fish.name} is hiding near cover.`, now);
}

function triggerDebugBehaviorInspectLure(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("inspect-lure");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("inspect-lure"))) {
    return;
  }

  const lure = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["lure"],
    force: true,
    ignoreOccupancy: true,
    occupancyLimit: 1,
    lingerMultiplier: 1
  });
  if (!lure) {
    showToast("Add a Fishing Lure or Gorbag to test lure inspection.");
    return;
  }

  const cause = getFishPersonality(fish) === "hunter" ? "hunter" : "curious";
  applyBehaviorTarget(fish, species, {
    ...lure,
    intentType: "inspect lure",
    intentCause: cause,
    signalType: "inspect_lure",
    debugText: `inspect lure | ${cause}`
  }, now);
  const lureDecor = state.placedDecor.find((item) => item?.id === lure.decorId) || null;
  setDebugBehaviorSteering(fish, {
    type: "inspect-lure",
    decorId: lure.decorId || "",
    focusXNorm: lureDecor?.xNorm ?? lure.xNorm,
    focusYNorm: lureDecor?.yNorm ?? lure.yNorm,
    targetLayer: lure.targetLayer,
    cause,
    initialSide: (fish.xNorm || 0.5) <= (lureDecor?.xNorm ?? lure.xNorm ?? 0.5) ? -1 : 1,
    durationMs: DEBUG_BEHAVIOR_LURE_INSPECT_DURATION_MS,
    allowPredatorSpecial: true
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug sent ${fish.name} to inspect a lure.`, `${fish.name} is inspecting the lure.`, now);
}

function triggerDebugBehaviorGuardCave(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("guard-cave");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("guard-cave"))) {
    return;
  }

  const territory = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["hide", "hardscape"],
    force: true,
    ignoreOccupancy: true,
    occupancyLimit: 1,
    lingerMultiplier: 2,
    preferBackLayer: false
  });
  if (!territory) {
    showToast("Add a cave, arch, rock, or hardscape decor to test guarding.");
    return;
  }

  const guardedName = territory.zoneType === "hide" ? "cave" : territory.zoneType;
  applyBehaviorTarget(fish, species, {
    ...territory,
    intentType: "guard cave",
    intentCause: "territorial",
    signalType: "guard_territory",
    debugText: `guard ${guardedName} | territorial`
  }, now);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} guard ${guardedName}.`, `${fish.name} is guarding ${guardedName}.`, now);
}

function triggerDebugBehaviorFollow(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("follow");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("follow"))) {
    return;
  }

  const otherFish = getDebugRelationshipPartner(fish);
  if (!otherFish) {
    showToast("Add another living fish to test following.");
    return;
  }

  setDebugFishRelationship(fish, otherFish, "friend", now);
  const otherName = getDebugFishDisplayName(otherFish);
  applyBehaviorTarget(fish, species, {
    xNorm: clamp((otherFish.xNorm || 0.5) + randomBetween(-0.05, 0.05), 0.08, 0.92),
    yNorm: clamp((otherFish.yNorm || 0.5) + randomBetween(-0.04, 0.04), 0.14, 0.8),
    targetLayer: getFishTankLayer(otherFish),
    targetAt: now + randomBetween(4200, 7600),
    intentType: "follow",
    intentCause: "friend",
    intentTargetId: otherFish.id,
    intentTargetName: otherName,
    signalType: "follow_friend",
    debugText: `follow ${otherName} | friend`
  }, now);
  setDebugBehaviorSteering(fish, {
    type: "follow",
    targetFishId: otherFish.id,
    targetName: otherName,
    durationMs: DEBUG_BEHAVIOR_FOLLOW_DURATION_MS
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} follow ${otherName}.`, `${fish.name} is following ${otherName}.`, now);
}

function triggerDebugBehaviorAvoid(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("avoid");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("avoid"))) {
    return;
  }

  const otherFish = getDebugRelationshipPartner(fish);
  if (!otherFish) {
    showToast("Add another living fish to test avoidance.");
    return;
  }

  setDebugFishRelationship(fish, otherFish, "fear", now);
  const otherName = getDebugFishDisplayName(otherFish);
  const awayX = (fish.xNorm || 0.5) - (otherFish.xNorm || 0.5);
  const awayY = (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5);
  const distance = Math.max(0.0001, Math.hypot(awayX, awayY));
  applyBehaviorTarget(fish, species, {
    xNorm: clamp((fish.xNorm || 0.5) + (awayX / distance) * 0.18, 0.08, 0.92),
    yNorm: clamp((fish.yNorm || 0.5) + (awayY / distance) * 0.12, 0.14, 0.8),
    targetLayer: getFishTankLayer(fish),
    targetAt: now + randomBetween(2800, 5600),
    intentType: "avoid",
    intentCause: "fear",
    intentTargetId: otherFish.id,
    intentTargetName: otherName,
    signalType: "avoid_specific_fish",
    debugText: `avoid ${otherName} | fear`
  }, now);
  setDebugBehaviorSteering(fish, {
    type: "avoid",
    targetFishId: otherFish.id,
    targetName: otherName,
    durationMs: DEBUG_BEHAVIOR_AVOID_DURATION_MS
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} avoid ${otherName}.`, `${fish.name} is avoiding ${otherName}.`, now);
}

function getDebugDiseaseBehaviorCause(stateId) {
  switch (sanitizeDiseaseState(stateId)) {
    case DISEASE_STATE_INCUBATING:
      return "incubating";
    case DISEASE_STATE_EARLY:
      return "early symptoms";
    case DISEASE_STATE_VISIBLE:
      return "visible symptoms";
    case DISEASE_STATE_SEVERE:
      return "severe symptoms";
    case DISEASE_STATE_RECOVERING:
      return "recovering";
    default:
      return "hidden carrier";
  }
}

function getNextDebugDiseaseBehaviorStage(stateId) {
  switch (sanitizeDiseaseState(stateId)) {
    case DISEASE_STATE_VISIBLE:
      return DISEASE_STATE_SEVERE;
    case DISEASE_STATE_SEVERE:
      return DISEASE_STATE_RECOVERING;
    case DISEASE_STATE_RECOVERING:
      return DISEASE_STATE_VISIBLE;
    default:
      return DISEASE_STATE_VISIBLE;
  }
}

function triggerDebugBehaviorDisease(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("disease");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("disease"))) {
    return;
  }
  const currentState = sanitizeDiseaseState(fish.diseaseState);
  const nextState = getNextDebugDiseaseBehaviorStage(currentState);
  setSelectedFishDiseaseStageForDebug(fish, nextState, now);

  const target = pickDiseaseBehaviorTarget(fish, species, now)
    || pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hide", "plant", "hardscape", "spooky", "bubbler"],
      force: true,
      ignoreOccupancy: true,
      preferBackLayer: true,
      lingerMultiplier: 2
    })
    || {
      xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.12, 0.12), 0.1, 0.9),
      yNorm: nextState === DISEASE_STATE_SEVERE ? randomBetween(0.18, 0.28) : randomBetween(0.36, 0.72),
      targetLayer: getFishTankLayer(fish),
      targetAt: now + randomBetween(5200, 11000),
      signal: nextState === DISEASE_STATE_SEVERE ? "surface_hover" : "hiding_more_than_usual"
    };
  applyDiseaseBehaviorTarget(fish, species, {
    ...target,
    hangoutDecorId: target.hangoutDecorId || target.decorId || null,
    hangoutZoneType: target.hangoutZoneType || target.zoneType || null,
    signal: target.signal || (target.zoneType === "bubbler" ? "lingering_near_bubbler" : "hiding_more_than_usual")
  }, now);

  const cause = getDebugDiseaseBehaviorCause(nextState);
  setFishBehaviorIntent(fish, "disease isolate", cause, now, { durationMs: BEHAVIOR_INTENT_LINGER_MS });
  recordFishBehaviorSignal(fish, target.signal || "hiding_more_than_usual", now, {
    debugText: `disease isolate | ${cause}`
  });
  finishDebugBehaviorScenario(fish, `Debug advanced ${fish.name} illness to ${nextState}.`, `${fish.name} disease behavior: ${nextState}.`, now);
}

function triggerDebugBehaviorNightSleep(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("night-sleep");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("night-sleep"))) {
    return;
  }
  forceLightsOutForDebug(now);

  const cover = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["plant", "hide", "hardscape", "spooky"],
    force: true,
    ignoreOccupancy: true,
    lingerMultiplier: 2.4,
    preferBackLayer: true
  }) || {
    xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.04, 0.04), 0.08, 0.92),
    yNorm: clamp((fish.yNorm || 0.5) + randomBetween(-0.03, 0.03), 0.18, 0.78),
    targetLayer: getFishTankLayer(fish),
    targetAt: now + randomBetween(9000, 16000),
    signalType: "odd_sleep_spot",
    debugText: "night sleep | exposed"
  };
  applyBehaviorTarget(fish, species, {
    ...cover,
    targetAt: cover.targetAt || now + randomBetween(9000, 18000),
    intentType: "night sleep",
    intentCause: cover.signalType === "odd_sleep_spot" ? "exposed" : "lights out",
    signalType: cover.signalType || "night_sleep",
    debugText: cover.debugText || "night sleep | lights out",
    slow: true
  }, now);
  finishDebugBehaviorScenario(fish, `Debug put ${fish.name} into Lights Out sleep.`, `${fish.name} is settling for Lights Out.`, now);
}

function triggerDebugBehaviorNightForage(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("night-forage");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("night-forage"))) {
    return;
  }
  forceLightsOutForDebug(now);

  const effectiveBehavior = getEffectiveFishBehavior(fish, species);
  if (effectiveBehavior === "sucker") {
    setFishBehaviorIntent(fish, "night forage", "night-active", now);
    recordFishBehaviorSignal(fish, "night_forage", now, { debugText: "night forage | night-active" });
    finishDebugBehaviorScenario(fish, `Debug marked ${fish.name} for night foraging.`, `${fish.name} keeps special movement while night-forage is logged.`, now);
    return;
  }

  const forage = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["hardscape", "plant", "hide"],
    force: true,
    ignoreOccupancy: true,
    lingerMultiplier: 0.9,
    preferBackLayer: false
  }) || {
    xNorm: randomSwimX(),
    yNorm: randomBetween(0.56, 0.82),
    targetLayer: clampTankLayer(Math.max(1, getFishTankLayer(fish))),
    targetAt: now + randomBetween(3600, 7600)
  };
  applyBehaviorTarget(fish, species, {
    ...forage,
    intentType: "night forage",
    intentCause: "night-active",
    signalType: "night_forage",
    debugText: "night forage | night-active"
  }, now);
  finishDebugBehaviorScenario(fish, `Debug sent ${fish.name} night foraging.`, `${fish.name} is foraging after Lights Out.`, now);
}

function triggerDebugBehaviorClear(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("clear");
  if (!selection) {
    return;
  }
  const { fish } = selection;
  fish.behaviorIntent = null;
  fish.behaviorSignals = {};
  fish.foodRefusalUntil = 0;
  clearDebugBehaviorSteering(fish);
  if (!fish.caveState && fish.activity === "roam") {
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    fish.targetAt = now;
  }
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  finishDebugBehaviorScenario(fish, `Debug cleared forced behavior for ${fish.name}.`, `${fish.name} behavior debug cleared.`, now);
}

function triggerDebugBehaviorScenario(action) {
  if (!isDebugModeEnabled()) {
    return;
  }
  switch (action) {
    case "refuse-food":
      triggerDebugBehaviorRefuseFood();
      break;
    case "anticipate-food":
      triggerDebugBehaviorAnticipateFood();
      break;
    case "hide":
      triggerDebugBehaviorHide();
      break;
    case "inspect-lure":
      triggerDebugBehaviorInspectLure();
      break;
    case "guard-cave":
      triggerDebugBehaviorGuardCave();
      break;
    case "follow":
      triggerDebugBehaviorFollow();
      break;
    case "avoid":
      triggerDebugBehaviorAvoid();
      break;
    case "disease":
      triggerDebugBehaviorDisease();
      break;
    case "night-sleep":
      triggerDebugBehaviorNightSleep();
      break;
    case "night-forage":
      triggerDebugBehaviorNightForage();
      break;
    case "clear":
      triggerDebugBehaviorClear();
      break;
    default:
      showToast("Unknown behavior debug scenario.");
  }
}

function getDebugBehaviorButtonAvailability(action, selectedFish, now = Date.now()) {
  const species = getSpeciesForFish(selectedFish);
  const config = DEBUG_BEHAVIOR_BUTTON_CONFIGS.find((entry) => entry.action === action);
  const title = config?.title || "Debug behavior";
  const reason = getDebugBehaviorBlockReason(selectedFish, species, getDebugBehaviorScenarioOptions(action));
  if (reason) {
    return { enabled: false, title: `${title}: ${reason}` };
  }

  switch (action) {
    case "hide":
      return hasDebugDecorHangoutZone(["plant", "hide", "spooky"])
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add plants, caves, wrecks, or spooky decor` };
    case "inspect-lure":
      return hasDebugDecorHangoutZone(["lure"])
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add a Fishing Lure or Gorbag` };
    case "guard-cave":
      return hasDebugDecorHangoutZone(["hide", "hardscape"])
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add a cave, arch, rock, or hardscape` };
    case "follow":
    case "avoid":
      return getDebugRelationshipPartner(selectedFish)
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add another living fish` };
    default:
      return { enabled: true, title };
  }
}

function syncDebugBehaviorLabButtons(debugMode, selectedFish, now = Date.now()) {
  for (const config of DEBUG_BEHAVIOR_BUTTON_CONFIGS) {
    const button = dom[config.domKey];
    if (!button) {
      continue;
    }
    const availability = debugMode
      ? getDebugBehaviorButtonAvailability(config.action, selectedFish, now)
      : { enabled: false, title: config.title };
    button.hidden = !debugMode;
    button.disabled = !debugMode || !availability.enabled;
    button.title = availability.title || config.title;
    button.setAttribute("aria-label", availability.title || config.title);
    button.classList.toggle(
      "is-active",
      config.action === "disease"
        && selectedFish
        && sanitizeDiseaseState(selectedFish.diseaseState) !== DISEASE_STATE_NONE
    );
  }
}

function damageSelectedFish() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    showToast("Select a fish in the tank first.");
    return;
  }

  if (managed.inStorage) {
    showToast("Take the fish out of storage before using the kill switch.");
    return;
  }

  const { fish } = managed;
  const now = Date.now();
  if (isFishDead(fish)) {
    showToast(`${fish.name} is already dead.`);
    return;
  }

  const result = applyFishDamage(
    fish,
    1,
    now,
    `${fish.name} lost half a heart.`,
    `${fish.name} died and floated to the surface.`
  );
  const toast = result.dead ? `${fish.name} died.` : `${fish.name} lost half a heart.`;

  saveState();
  renderUi(now);
  showToast(toast);
}

function getNextDebugDiseaseStage(stateId) {
  const currentState = sanitizeDiseaseState(stateId);
  const currentIndex = DEBUG_DISEASE_STAGE_ORDER.indexOf(currentState);
  if (currentIndex === -1) {
    return DISEASE_STATE_CARRIER;
  }
  return DEBUG_DISEASE_STAGE_ORDER[Math.min(currentIndex + 1, DEBUG_DISEASE_STAGE_ORDER.length - 1)];
}

function forceDebugDiseaseSignals(fish, stateId, now = Date.now()) {
  if (!fish) {
    return;
  }

  const diseaseState = sanitizeDiseaseState(stateId);
  const signalsByStage = {
    [DISEASE_STATE_INCUBATING]: ["missed_feeding"],
    [DISEASE_STATE_EARLY]: ["hiding_more_than_usual"],
    [DISEASE_STATE_VISIBLE]: ["looking_under_weather", "green_bubbles", "food_refused"],
    [DISEASE_STATE_SEVERE]: ["looking_under_weather", "green_bubbles", "surface_hover", "bottom_sit"],
    [DISEASE_STATE_RECOVERING]: ["green_bubbles", "sick_isolation"]
  };
  fish.lastIllnessSignalAtByType = {};
  for (const signalType of signalsByStage[diseaseState] || []) {
    forceDiseaseSignalForDebug(fish, signalType, now);
  }

  fish.nextSymptomCheckAt = now;
  fish.nextGreenBubbleAt = [DISEASE_STATE_VISIBLE, DISEASE_STATE_SEVERE, DISEASE_STATE_RECOVERING].includes(diseaseState)
    ? now
    : getNextGreenBubbleAtForDisease(fish, now);
  if (diseaseState !== DISEASE_STATE_NONE) {
    setFishBehaviorIntent(fish, "debug illness", diseaseState, now, { durationMs: 45 * 1000 });
  }
}

function setSelectedFishDiseaseStageForDebug(fish, stateId, now = Date.now()) {
  if (!fish) {
    return false;
  }

  const diseaseState = sanitizeDiseaseState(stateId);
  if (diseaseState === DISEASE_STATE_NONE) {
    const changed = resetFishDiseaseFields(fish, DISEASE_STATE_NONE, now);
    fish.lastIllnessSignalAtByType = {};
    fish.behaviorIntent = null;
    fish.foodRefusalUntil = 0;
    runtime.debugFishBehaviorSignatures.delete(fish.id);
    return changed;
  }

  fish.diseaseState = diseaseState;
  fish.diseaseType = DISEASE_TYPE_GENERIC;
  fish.diseaseInfectedAt = now;
  fish.diseaseProgressMs = getDebugDiseaseProgressForStage(diseaseState);
  fish.diseaseLastProgressAt = now;
  fish.diseaseExposureLevel = 0;
  fish.diseaseRecoveryProgressMs = diseaseState === DISEASE_STATE_RECOVERING ? DISEASE_RECOVERING_ENTRY_MS : 0;
  fish.diseaseTreatedUntil = 0;
  fish.diseaseLastDamageAt = now;
  fish.diseaseSource = "debug";
  fish.temporaryImmunityUntil = 0;
  fish.nextDiseaseCheckAt = now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS);
  fish.nextDiseaseSpreadCheckAt = now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS);
  fish.nextSymptomCheckAt = now;
  fish.nextGreenBubbleAt = getNextGreenBubbleAtForDisease(fish, now);
  fish.lastIllnessRiskDayKey = typeof fish.lastIllnessRiskDayKey === "string" ? fish.lastIllnessRiskDayKey : "";
  forceDebugDiseaseSignals(fish, diseaseState, now);
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  return true;
}

function infectSelectedFishDebug() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    showToast("Select a fish in the tank first.");
    return;
  }

  if (managed.inStorage) {
    showToast("Take the fish out of storage before testing illness.");
    return;
  }

  const { fish } = managed;
  const now = Date.now();
  if (isFishDead(fish)) {
    showToast(`${fish.name} is already dead.`);
    return;
  }
  if (isUndeadFish(fish)) {
    showToast(`${fish.name} cannot use the regular illness debug path.`);
    return;
  }

  const currentState = sanitizeDiseaseState(fish.diseaseState);
  const nextState = getNextDebugDiseaseStage(currentState);
  setSelectedFishDiseaseStageForDebug(fish, nextState, now);
  saveState();
  renderUi(now);
  showToast(currentState === DISEASE_STATE_SEVERE
    ? `${fish.name} is already at severe illness.`
    : `${fish.name} illness stage: ${nextState}.`);
}

function cureSelectedFishDebug() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    showToast("Select a fish in the tank first.");
    return;
  }

  if (managed.inStorage) {
    showToast("Take the fish out of storage before testing illness.");
    return;
  }

  const { fish } = managed;
  const now = Date.now();
  if (isFishDead(fish)) {
    showToast(`${fish.name} is already dead.`);
    return;
  }

  const currentState = sanitizeDiseaseState(fish.diseaseState);
  if (currentState === DISEASE_STATE_NONE && (Number(fish.diseaseExposureLevel) || 0) <= 0) {
    showToast(`${fish.name} has no active illness.`);
    return;
  }

  if (currentState === DISEASE_STATE_RECOVERING || currentState === DISEASE_STATE_IMMUNE || currentState === DISEASE_STATE_NONE) {
    setSelectedFishDiseaseStageForDebug(fish, DISEASE_STATE_NONE, now);
    saveState();
    renderUi(now);
    showToast(`${fish.name} illness cleared.`);
    return;
  }

  setSelectedFishDiseaseStageForDebug(fish, DISEASE_STATE_RECOVERING, now);
  saveState();
  renderUi(now);
  showToast(`${fish.name} is now recovering.`);
}

function resetAllProgress() {
  localStorage.removeItem(STORAGE_KEY);
  revokeAllCustomImageRuntimeUrls();
  void clearCustomImageDb();
  runtime.saveStateWarningShown = false;
  resetTransientAquariumUiState();

  state = reconcileState(null);
  applyPendingWallpaperEngineUserProperties({
    save: false,
    render: false,
    showToast: false
  });
  saveState();
  renderUi(Date.now());
  syncAmbienceAudio();
  showToast("All progress reset.");
}
