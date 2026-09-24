// Source fragment: fish/actions.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.


function markFishActionStateDirty(now = Date.now()) {
  requestDeferredStateSave();
  if (!runtime.debugFishActionIndicatorsEnabled) {
    return;
  }
  renderFishActionFlyout(now);
  renderFishActionQueueDock(now);
}

function getFishActionConfig(action) {
  return {
    eat: { actionId: "eat", label: "Eat", displayName: "Eat", category: "Needs", targetType: "food", title: "Send this fish to food", durationMs: FISH_ACTION_EAT_DURATION_MS, energyCost: 1, hungerCost: 0, effects: { comfort: 4 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 80 },
    waitfood: { actionId: "waitfood", label: "Wait for Food", displayName: "Wait for Food", category: "Needs", targetType: "dispenser", title: "Wait near a food service", durationMs: FISH_ACTION_WAIT_FOOD_DURATION_MS, energyCost: 0, hungerCost: 0, effects: { comfort: 2 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 72 },
    rest: { actionId: "rest", label: "Rest", displayName: "Rest", category: "Needs", targetType: "self", title: "Hover quietly and recover energy", durationMs: FISH_ACTION_REST_DURATION_MS, energyCost: 0, hungerCost: 0, effects: { energy: 6, comfort: 4 }, queueable: true, canFail: false, interruptible: true, autonomousAllowed: true, priority: 70 },
    sleep: { actionId: "sleep", label: "Sleep", displayName: "Sleep", category: "Needs", targetType: "decor", title: "Settle into a sleep spot", durationMs: FISH_ACTION_SLEEP_DURATION_MS, energyCost: 0, hungerCost: 0, effects: { energy: 8, comfort: 8, stimulation: -2 }, queueable: true, canFail: false, interruptible: true, autonomousAllowed: true, priority: 76 },
    zoomies: { actionId: "zoomies", label: "Zoomies", displayName: "Zoomies", category: "Behavior", targetType: "position", title: "Do a quick burst around the tank", durationMs: FISH_ACTION_ZOOMIES_DURATION_MS, energyCost: 5, hungerCost: 1, effects: { stimulation: 18, social: 2 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 35 },
    greet: { actionId: "greet", label: "Greet", displayName: "Greet", category: "Social", targetType: "fish", title: "Greet another fish", durationMs: FISH_ACTION_GREET_DURATION_MS, energyCost: 1, hungerCost: 0, effects: { social: 12, comfort: 2, stimulation: 2 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 52 },
    hangout: { actionId: "hangout", label: "Hang Out", displayName: "Hang Out", category: "Social", targetType: "fish", title: "Swim with another fish", durationMs: FISH_ACTION_FOLLOW_DURATION_MS, energyCost: 2, hungerCost: 1, effects: { social: 20, comfort: 4, stimulation: 4 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: false, priority: 50 },
    play: { actionId: "play", label: "Play", displayName: "Play", category: "Explore", targetType: "decor", title: "Play around the tank", durationMs: FISH_ACTION_PLAY_DURATION_MS, energyCost: 3, hungerCost: 1, effects: { stimulation: 22, social: 3 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 42 },
    pebble: { actionId: "pebble", label: "Find Pebble", displayName: "Find Pebble", category: "Explore", targetType: "gravel", title: "Pick up and toss a gravel pebble", durationMs: FISH_ACTION_PEBBLE_DURATION_MS, energyCost: 2, hungerCost: 0, effects: { environment: 12, stimulation: 8 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: false, priority: 36 },
    dig: { actionId: "dig", label: "Dig", displayName: "Dig", category: "Explore", targetType: "gravel", title: "Dig around in the gravel", durationMs: FISH_ACTION_DIG_DURATION_MS, energyCost: 2, hungerCost: 0, effects: { environment: 14, stimulation: 5 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: false, priority: 37 },
    avoid: { actionId: "avoid", label: "Avoid", displayName: "Avoid", category: "Social", targetType: "fish", title: "Move away from a stressful fish", durationMs: FISH_ACTION_AVOID_DURATION_MS, energyCost: 1, hungerCost: 0, effects: { comfort: 10 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 74 },
    breed: { actionId: "breed", label: "Mate", displayName: "Mate", category: "Social", targetType: "fish", title: "Try to mate with a ready same-species fish", durationMs: FISH_ACTION_MATE_DURATION_MS, energyCost: 5, hungerCost: 2, effects: { social: 6, stimulation: 6 }, queueable: true, canFail: true, interruptible: false, autonomousAllowed: false, priority: 45 },
    hide: { actionId: "hide", label: "Hide", displayName: "Hide", category: "Comfort", targetType: "decor", title: "Hide near cover", durationMs: FISH_ACTION_HIDE_DURATION_MS, energyCost: 0, hungerCost: 0, effects: { comfort: 16, energy: 6 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 78 },
    inspect: { actionId: "inspect", label: "Inspect", displayName: "Inspect", category: "Decor", targetType: "decor", title: "Inspect an interesting tank object", durationMs: FISH_ACTION_INSPECT_DURATION_MS, energyCost: 1, hungerCost: 0, effects: { stimulation: 16, environment: 4 }, queueable: true, canFail: true, interruptible: true, autonomousAllowed: true, priority: 38 },
    clear: { actionId: "clear", label: "Clear", displayName: "Clear", category: "Special", targetType: "self", title: "Cancel queued actions and return to autonomy", durationMs: 0, queueable: false, canFail: false, interruptible: false, autonomousAllowed: false, priority: 0 }
  }[action] || null;
}

function getFishActionMenuCategories() {
  return [
    { id: "food", label: "Food", actions: ["eat"] },
    { id: "rest", label: "Rest", actions: ["rest", "sleep", "hide"] },
    { id: "social", label: "Social", actions: ["greet", "hangout", "avoid", "breed"] },
    { id: "explore", label: "Explore", actions: ["inspect", "dig", "pebble"] },
    { id: "play", label: "Play", actions: ["zoomies", "play"] },
    { id: "system", label: "Manage", actions: ["clear"] }
  ];
}

function getFishActionMenuCategory(categoryId) {
  return getFishActionMenuCategories().find((category) => category.id === categoryId) || null;
}

function getFishActionCategoryLabel(category) {
  return category?.label ? `${category.label} >` : "";
}

function getFishActionEffectTags(action) {
  const config = getFishActionConfig(action);
  if (!config) {
    return [];
  }
  const tags = [];
  const effectLabels = {
    hunger: "Hu",
    energy: "En",
    social: "So",
    comfort: "Co",
    hygiene: "Hy",
    environment: "Ev",
    stimulation: "Fun"
  };
  for (const [needKey, delta] of Object.entries(config.effects || {})) {
    const amount = Number(delta) || 0;
    const label = effectLabels[needKey] || needKey.slice(0, 2);
    if (amount > 0) {
      tags.push({ text: `+${label}`, tone: "gain" });
    } else if (amount < 0) {
      tags.push({ text: `-${label}`, tone: "cost" });
    }
  }
  if ((Number(config.energyCost) || 0) > 0) {
    tags.push({ text: "-En", tone: "cost" });
  }
  if ((Number(config.hungerCost) || 0) > 0) {
    tags.push({ text: "-Hu", tone: "cost" });
  }
  return tags.slice(0, 3);
}

function getAvailableFishActionsForCategory(categoryId, fish, now = Date.now()) {
  const category = getFishActionMenuCategory(categoryId);
  if (!category) {
    return [];
  }
  return category.actions.filter((action) => {
    const config = getFishActionConfig(action);
    const availability = getFishActionAvailability(action, fish, now);
    return Boolean(config && availability.enabled);
  });
}

function getFishActionQueueState(fishId, options = {}) {
  if (!fishId) {
    return null;
  }
  let queue = runtime.fishActionQueuesByFishId.get(fishId) || null;
  if (!queue && options.create === true) {
    queue = { active: null, items: [], restUntil: 0 };
    runtime.fishActionQueuesByFishId.set(fishId, queue);
  }
  return queue;
}

function getFishActionQueueItems(fishId) {
  const queue = getFishActionQueueState(fishId);
  if (!queue) {
    return [];
  }
  const now = Date.now();
  const restUntil = Number(queue.restUntil) || 0;
  return [
    ...(queue.active ? [{ ...queue.active, active: true }] : []),
    ...(!queue.active && restUntil > now && (queue.items || []).length > 0
      ? [{ id: `rest-${fishId}`, action: "rest", label: "Pause", durationMs: restUntil - now, endsAt: restUntil, active: true, rest: true }]
      : []),
    ...(queue.items || []).map((item) => ({ ...item, active: false }))
  ];
}

function formatFishActionRemaining(ms) {
  const seconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getFishActionRemainingRatio(item, now = Date.now()) {
  if (!item) {
    return 0;
  }
  if (item.cancelling) {
    const startedAt = Number(item.cancelledAt) || now;
    const endsAt = Number(item.cancelEndsAt) || startedAt;
    return clamp((endsAt - now) / Math.max(1, endsAt - startedAt), 0, 1);
  }
  if (item.active && Number.isFinite(Number(item.startedAt)) && Number.isFinite(Number(item.endsAt))) {
    return clamp((Number(item.endsAt) - now) / Math.max(1, Number(item.durationMs) || Number(item.endsAt) - Number(item.startedAt)), 0, 1);
  }
  return 1;
}

function getFishActionPhaseLabel(item) {
  if (!item) {
    return "";
  }
  if (item.cancelling) {
    return "Cancelling";
  }
  if (item.rest) {
    return "Starting soon";
  }
  return typeof item.phase === "string" ? item.phase : "";
}

function setFishActionPhase(item, phase, now = Date.now(), phaseEndsAt = 0) {
  if (!item) {
    return;
  }
  item.phase = phase;
  item.phaseStartedAt = now;
  item.phaseEndsAt = Number(phaseEndsAt) || 0;
}

function trimFishActionQueue(fishId) {
  const queue = getFishActionQueueState(fishId);
  if (!queue) {
    return;
  }
  queue.items = (queue.items || []).filter(Boolean);
  if (!queue.active && queue.items.length <= 0) {
    runtime.fishActionQueuesByFishId.delete(fishId);
    runtime.fishActionQueueCollapsedFishIds.delete(fishId);
  }
}

function getFishActionQueueRestUntil(fishId) {
  const queue = getFishActionQueueState(fishId);
  return Number(queue?.restUntil) || 0;
}

function getActiveFishActionQueueItem(fish, now = Date.now()) {
  if (!fish?.id) {
    return null;
  }
  const restUntil = getFishActionQueueRestUntil(fish.id);
  if (restUntil > now) {
    return {
      id: `rest-${fish.id}`,
      action: "rest",
      label: "Pause",
      durationMs: restUntil - now,
      endsAt: restUntil,
      active: true,
      rest: true
    };
  }
  const active = getFishActionQueueState(fish.id)?.active || null;
  if (!active) {
    const cancellingQueuedItem = (getFishActionQueueState(fish.id)?.items || [])
      .find((item) => item?.cancelling && Number(item.cancelEndsAt) > now);
    return cancellingQueuedItem
      ? { ...cancellingQueuedItem, active: true }
      : null;
  }
  if (Number(active.endsAt) <= now) {
    return null;
  }
  return active;
}

function getActiveFishBreedingSequenceFish() {
  const sequence = runtime.fishBreedingSequence;
  if (!sequence) {
    return null;
  }

  const leftFish = getFishByIdFast(sequence.leftFishId);
  const rightFish = getFishByIdFast(sequence.rightFishId);
  if (
    !leftFish
    || !rightFish
    || leftFish.speciesId !== rightFish.speciesId
    || isFishDead(leftFish)
    || isFishDead(rightFish)
  ) {
    clearFishBreedingSequence();
    return null;
  }

  return { sequence, leftFish, rightFish };
}

function clearFishBreedingSequence() {
  runtime.fishBreedingSequence = null;
}

function updateFishBreedingSequence(now = Date.now()) {
  const activeSequence = getActiveFishBreedingSequenceFish();
  if (!activeSequence) {
    return null;
  }

  const { sequence, leftFish, rightFish } = activeSequence;
  if (!Number.isFinite(sequence.cuddleStartedAt)) {
    const leftTarget = getDebugBreedingTarget(sequence, "left");
    const rightTarget = getDebugBreedingTarget(sequence, "right");
    if (hasFishReachedNormTarget(leftFish, leftTarget) && hasFishReachedNormTarget(rightFish, rightTarget)) {
      sequence.cuddleStartedAt = now;
      sequence.cuddleEndsAt = now + FISH_ACTION_BREED_HOLD_MS;
      setFishBehaviorIntent(leftFish, "mate", rightFish.name || "partner", now, { durationMs: FISH_ACTION_BREED_HOLD_MS + 4000 });
      setFishBehaviorIntent(rightFish, "mate", leftFish.name || "partner", now, { durationMs: FISH_ACTION_BREED_HOLD_MS + 4000 });
    }
    return activeSequence;
  }

  if (now < sequence.cuddleEndsAt) {
    return activeSequence;
  }

  const species = runtime.fishMap.get(sequence.speciesId);
  if (typeof canTankReserveBreedingOffspring === "function" && !canTankReserveBreedingOffspring(sequence.speciesId, getCurrentTank())) {
    clearFishBreedingSequence();
    markFishActionStateDirty(now);
    showToast("The spawning attempt ended because the tank no longer has enough capacity.");
    return null;
  }
  const result = typeof completeFishLifetimeSpawn === "function"
    ? completeFishLifetimeSpawn([leftFish, rightFish], now, {
        xNorm: sequence.anchorXNorm,
        yNorm: sequence.anchorYNorm,
        tankLayer: sequence.eggLayer,
        tank: getCurrentTank()
      })
    : null;
  if (result) {
    leftFish.targetAt = now;
    rightFish.targetAt = now;
    clearFishBreedingSequence();
    markFishActionStateDirty(now);
    showToast(`${leftFish.name} and ${rightFish.name} successfully spawned.`);
    return null;
  }

  clearFishBreedingSequence();
  return null;
}

function isFishInActiveUserBreedingSequence(fish) {
  const sequence = runtime.fishBreedingSequence;
  return Boolean(fish?.id && sequence && (fish.id === sequence.leftFishId || fish.id === sequence.rightFishId));
}

function getActiveFishActionSteering(fish, now = Date.now()) {
  if (!fish?.id || !runtime.fishActionSteeringByFishId) {
    return null;
  }
  const steering = runtime.fishActionSteeringByFishId.get(fish.id);
  if (!steering) {
    return null;
  }
  if ((Number(steering.expiresAt) || 0) <= now || isFishInActiveUserBreedingSequence(fish)) {
    runtime.fishActionSteeringByFishId.delete(fish.id);
    return null;
  }
  return steering;
}

function setFishActionSteering(fish, steering, now = Date.now()) {
  if (!fish?.id || !steering?.type) {
    return false;
  }
  const durationMs = Math.max(1000, Number(steering.durationMs) || 12 * 1000);
  runtime.fishActionSteeringByFishId.set(fish.id, {
    ...steering,
    type: String(steering.type),
    startedAt: now,
    expiresAt: now + durationMs,
    nextRefreshAt: 0,
    retargets: 0
  });
  return true;
}

function clearFishActionSteering(fish) {
  if (fish?.id) {
    runtime.fishActionSteeringByFishId.delete(fish.id);
  }
}

function prepareFishForUserAction(fish, species, now = Date.now(), options = {}) {
  if (!fish || !species) {
    return false;
  }
  clearFishActionSteering(fish);
  clearDebugBehaviorSteering(fish);
  clearFishSchoolFollowState(fish);
  clearForcedGravelDigPrompt(fish);
  if (fish.caveState && options.allowActiveCave !== true) {
    abortFishCaveBehavior(fish, now, false);
  }
  if (options.keepFeeding !== true) {
    releasePelletsTargetingFishIds(fish.id);
    fish.activity = "roam";
    fish.feedingPelletId = null;
  }
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species);
  }
  return true;
}

function findExistingFishActionFoodPellet(fish, now = Date.now()) {
  return (state.floatingPellets || [])
    .filter((pellet) => pellet && canFishTargetFoodPellet(fish, pellet, now))
    .sort((left, right) => (
      Math.hypot((left.xNorm || 0) - (fish.xNorm || 0.5), (left.yNorm || 0) - (fish.yNorm || 0.5))
      - Math.hypot((right.xNorm || 0) - (fish.xNorm || 0.5), (right.yNorm || 0) - (fish.yNorm || 0.5))
    ))[0] || null;
}

function canCreateFishActionMealPellet(fish, now = Date.now()) {
  return Boolean(
    fish
    && !isMealFreeFish(fish)
    && getFishNeedValue(fish, "hunger", now) < 92
    && getFishActionMealFoodKey(fish, now)
  );
}

function getFishActionMealFoodKey(fish, now = Date.now()) {
  const keys = [...new Set([runtime.feedingModeFoodKey, ...Object.keys(state.foodInventory || {})])];
  return keys.find(key => key && Number(state.foodInventory?.[key]) >= 1
    && getFoodMeta(key) && canFoodSatisfyFishMeal(fish, key) && canFishEatFoodPellet(fish, key, now)) || "";
}

function createFishActionMealPellet(fish, now = Date.now()) {
  if (!canCreateFishActionMealPellet(fish, now)) {
    return null;
  }
  const foodKey = getFishActionMealFoodKey(fish, now);
  const pellet = sanitizePellet({
    id: createId("fish-action-pellet"),
    foodKey,
    targetFishId: fish.id,
    xNorm: clamp((fish.xNorm || 0.5) + (fish.direction || 1) * 0.075, 0.12, 0.88),
    yNorm: clamp(WATER_SURFACE_Y / TANK_HEIGHT + 0.13 + Math.random() * 0.06, 0.24, 0.4),
    sway: Math.random(),
    sinkDurationMs: foodKey === "algaeWafers"
      ? ALGAE_WAFER_SINK_DURATION_MS * randomBetween(0.92, 1.08)
      : FOOD_PELLET_SINK_DURATION_MS * randomBetween(0.85, 1.2),
    createdAt: now,
    expiresAt: now + FOOD_PELLET_SETTLED_LIFETIME_MS
  });
  if (!pellet) {
    return null;
  }
  state.foodInventory[foodKey] -= 1;
  state.floatingPellets.push(pellet);
  const mealEntry = ensureMealHistoryEntry(`feeding-care-${getLocalDayKey(now)}`, now);
  if (mealEntry) {
    mealEntry.offeredAt = Math.max(Number(mealEntry.offeredAt) || 0, now);
    mealEntry.offeredFishIds = [...new Set([...(mealEntry.offeredFishIds || []), fish.id])];
  }
  return pellet;
}

function getFishActionPartners(fish, options = {}) {
  if (!fish) {
    return [];
  }
  const sameSpeciesOnly = options.sameSpeciesOnly === true;
  const requireBreedReady = options.requireBreedReady === true;
  const requireSocialCompatibility = options.requireSocialCompatibility === true;
  const preferNegative = options.preferNegative === true;
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const relationships = sanitizeFishRelationships(fish.relationships);
  return state.fish
    .filter((otherFish) => (
      otherFish
      && otherFish.id !== fish.id
      && !isFishDead(otherFish)
      && !getManagedFishById(otherFish.id)?.inStorage
      && runtime.fishDragState?.fishId !== otherFish.id
      && (!sameSpeciesOnly || otherFish.speciesId === fish.speciesId)
      && (!requireSocialCompatibility || typeof canFishBuildFriendship !== "function" || canFishBuildFriendship(fish, otherFish, now, { passive: false }))
      && (!requireBreedReady || (typeof isFishBreedingEligible === "function"
        ? isFishBreedingEligible(otherFish, now, getCurrentTank(), { requireReady: true, requireCapacity: false })
        : (isFishAdult(otherFish, now) && (Number(otherFish.breedCooldownUntil) || 0) <= now)))
    ))
    .map((otherFish) => {
      const relation = relationships[otherFish.id]?.kind || getRelationshipKindForFish(fish, otherFish);
      const bondedPartner = fish.pairBondPartnerId === otherFish.id;
      const relationScore = preferNegative
        ? (relation === "enemy" ? 0 : relation === "dislike" ? 1 : relation === "neutral" ? 3 : 5)
        : bondedPartner
          ? -2
          : (relation === "friend" ? 0 : relation === "neutral" ? 1 : relation === "dislike" ? 3 : 5);
      return {
        fish: otherFish,
        relationScore,
        distance: Math.hypot((fish.xNorm || 0.5) - (otherFish.xNorm || 0.5), (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5))
      };
    })
    .sort((left, right) => left.relationScore - right.relationScore || left.distance - right.distance)
    .map((entry) => entry.fish);
}

function getFishActionPartner(fish, options = {}) {
  return getFishActionPartners(fish, options)[0] || null;
}

function getFishActionTargetPartner(fish, targetFishId, options = {}) {
  if (!targetFishId) {
    return getFishActionPartner(fish, options);
  }
  return getFishActionPartners(fish, options).find((otherFish) => otherFish?.id === targetFishId) || null;
}

function getRelationshipFallbackScore(kind) {
  switch (kind) {
    case "friend":
      return 68;
    case "fear":
      return -80;
    case "rival":
      return -56;
    case "dislike":
      return -34;
    case "neutral":
    default:
      return 0;
  }
}

function getFishRelationshipScoreForTarget(fish, otherFish) {
  if (!fish || !otherFish || fish.id === otherFish.id) {
    return 0;
  }
  const relationships = sanitizeFishRelationships(fish.relationships);
  const relationship = relationships[otherFish.id] || null;
  if (relationship && Number.isFinite(Number(relationship.score))) {
    return clamp(Number(relationship.score), -100, 100);
  }
  return getRelationshipFallbackScore(getRelationshipKindForFish(fish, otherFish));
}

function getFishRelationshipRatingForTarget(fish, otherFish) {
  const score = getFishRelationshipScoreForTarget(fish, otherFish);
  return clamp(Math.round(((score + 100) / 200) * 9 + 1), 1, 10);
}

function getFishMateChanceForTarget(fish, otherFish) {
  const rating = getFishRelationshipRatingForTarget(fish, otherFish);
  return {
    rating,
    chancePercent: rating < 5 ? 0 : clamp(rating * 10, 50, 100)
  };
}

function isFishActionTargeted(action) {
  return ["greet", "hangout", "avoid", "breed"].includes(action);
}

function getFishActionTargetOptions(action, fish, now = Date.now()) {
  if (!isFishActionTargeted(action)) {
    return [];
  }
  const partners = getFishActionPartners(fish, {
    now,
    preferNegative: action === "avoid",
    sameSpeciesOnly: action === "breed",
    requireBreedReady: action === "breed"
  });
  if (["greet", "hangout"].includes(action) && typeof canFishBuildFriendship === "function") {
    return partners.filter((otherFish) => canFishBuildFriendship(fish, otherFish, now, { passive: false }));
  }
  return partners;
}

function showFishActionUnavailableToast(availability) {
  const message = (availability?.title || "That action is not available.").replace(/^.*?:\s*/, "");
  if (message.toLowerCase() === "needs food first") {
    return false;
  }
  showToast(message);
  return true;
}

function getFishActionAvailability(action, fish, now = Date.now()) {
  const config = getFishActionConfig(action);
  const baseTitle = config?.title || "Fish action";
  const species = getSpeciesForFish(fish);
  const managed = getManagedFishById(fish?.id);
  if (!config || !fish || !species || !managed || managed.inStorage || isFishDead(fish)) {
    return { enabled: false, title: `${baseTitle}: select a living fish in the tank` };
  }
  if (isProteusZombieFish(fish) && ["eat", "waitfood", "rest", "sleep", "zoomies", "play", "pebble", "dig", "hide", "inspect", "avoid"].includes(action)) {
    return { enabled: false, title: `${baseTitle}: Z-01 does not express this behavior` };
  }
  if (runtime.fishDragState?.fishId === fish.id || (fish.caveState && action !== "dig")) {
    return { enabled: false, title: `${baseTitle}: release this fish first` };
  }
  if (isFishInActiveUserBreedingSequence(fish) && action !== "clear") {
    return { enabled: false, title: `${baseTitle}: this fish is mating` };
  }
  if (action !== "clear" && getFishNeedValue(fish, "hunger", now) <= FISH_HUNGER_CRITICAL_THRESHOLD && action !== "eat" && action !== "waitfood") {
    return { enabled: false, title: `${baseTitle}: needs food first` };
  }
  const currentMood = typeof getFishDisposition === "function" ? getFishDisposition(fish, now).mood : "Happy";
  if (
    action !== "clear"
    && typeof isFishMoodActionHardBlocked === "function"
    && isFishMoodActionHardBlocked(currentMood, action)
  ) {
    return { enabled: false, title: `${baseTitle}: ${currentMood.toLowerCase()} fish will not do that right now` };
  }

  switch (action) {
    case "eat":
      return findExistingFishActionFoodPellet(fish, now) || canCreateFishActionMealPellet(fish, now)
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: no valid food is available` };
    case "waitfood":
      return hasAutoDispenserInstalled()
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: add the pellet dispenser first` };
    case "rest":
      return { enabled: true, title: baseTitle };
    case "sleep":
    case "hide":
      return hasDebugDecorHangoutZone(["plant", "hide", "hardscape", "spooky"])
        ? { enabled: true, title: baseTitle }
        : { enabled: action === "sleep", title: action === "sleep" ? `${baseTitle}: no cover, using a quiet spot` : `${baseTitle}: add plants, caves, or hardscape` };
    case "hangout":
    case "greet":
      return getFishActionPartner(fish, { requireSocialCompatibility: true, now })
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: add another compatible living fish` };
    case "play":
      return hasDebugDecorHangoutZone(["lure", "bubbler", "spooky", "hardscape", "plant"])
        ? { enabled: true, title: baseTitle }
        : { enabled: true, title: `${baseTitle}: free play` };
    case "pebble":
      return isFishEligibleForGravelPebbleAction(fish, species, now, { requireRoaming: false })
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: needs visible gravel pebble assets and an available fish` };
    case "dig":
      return isFishEligibleForGravelDigPrompt(fish, species, now)
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: this fish cannot dig right now` };
    case "avoid":
      return getFishActionPartner(fish, { preferNegative: true, now })
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: no threatening tankmate to avoid` };
    case "breed":
      return getFishActionPartner(fish, { sameSpeciesOnly: true, requireBreedReady: true, now }) && (typeof isFishBreedingEligible !== "function" || isFishBreedingEligible(fish, now, getCurrentTank(), { requireReady: true, requireCapacity: true }))
        ? { enabled: true, title: baseTitle }
        : { enabled: false, title: `${baseTitle}: needs two ready adult fish of the same species` };
    case "inspect":
      return hasDebugDecorHangoutZone(["lure", "bubbler", "spooky", "hardscape", "plant", "hide"])
        ? { enabled: true, title: baseTitle }
        : { enabled: true, title: `${baseTitle}: explore the open tank` };
    default:
      return { enabled: true, title: baseTitle };
  }
}

function updateFishActionSteering(fish, species, now = Date.now()) {
  const steering = getActiveFishActionSteering(fish, now);
  if (!steering || !fish || !species || isFishDead(fish) || fish.caveState || fish.activity !== "roam") {
    return false;
  }
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }

  if (steering.type === "follow") {
    const targetFish = getFishByIdFast(steering.targetFishId);
    if (!targetFish || isFishDead(targetFish)) {
      clearFishActionSteering(fish);
      return false;
    }
    const distance = Math.hypot((fish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (fish.yNorm || 0.5) - (targetFish.yNorm || 0.5));
    const side = (Number(fish.phase) || 0.5) > 0.5 ? 1 : -1;
    fish.targetXNorm = clamp((targetFish.xNorm || 0.5) - getFishFacingDirection(targetFish) * 0.045 + side * 0.018, 0.08, 0.92);
    fish.targetYNorm = clampFishYNormToLayer((targetFish.yNorm || 0.5) + Math.sin(now / 900 + fish.phase * Math.PI) * 0.028, fish, species, getFishTankLayer(targetFish), { minYNorm: 0.14, maxYNorm: 0.8 });
    fish.targetAt = now + 620;
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    setFishDesiredTankLayer(fish, getFishTankLayer(targetFish));
    steering.distanceNorm = distance;
    steering.leaderSwimSpeed = Number(targetFish.swimSpeed) || 0;
    steering.leaderMoving = Math.hypot((targetFish.targetXNorm || targetFish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (targetFish.targetYNorm || targetFish.yNorm || 0.5) - (targetFish.yNorm || 0.5)) > 0.002;
    steering.nextRefreshAt = now + FISH_ACTION_STEER_REFRESH_MS;
    setFishBehaviorIntent(fish, "hang out", targetFish.name || "friend", now, { targetId: targetFish.id, targetName: targetFish.name || "", durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  if (steering.type === "waitfood") {
    const focusXNorm = clamp(Number(steering.xNorm) || 0.5, 0.08, 0.92);
    const focusYNorm = clamp(Number(steering.yNorm) || 0.22, 0.1, 0.5);
    fish.targetXNorm = focusXNorm;
    fish.targetYNorm = clampFishYNormToLayer(focusYNorm + 0.08, fish, species, clampTankLayer(Math.min(getFishTankLayer(fish), 2)), { minYNorm: 0.14, maxYNorm: 0.62 });
    fish.targetAt = now + 840;
    setFishDesiredTankLayer(fish, clampTankLayer(Math.min(getFishTankLayer(fish), 2)));
    if (Math.abs(focusXNorm - (fish.xNorm || 0.5)) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
      setFishDirection(fish, focusXNorm >= (fish.xNorm || 0.5) ? 1 : -1, species, now);
    }
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * 0.24);
    }
    steering.nextRefreshAt = now + FISH_ACTION_STEER_REFRESH_MS;
    setFishBehaviorIntent(fish, "wait for food", "food dispenser", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  if (steering.type === "inspect") {
    const focusXNorm = clamp(Number(steering.xNorm) || fish.xNorm || 0.5, 0.08, 0.92);
    const focusYNorm = clamp(Number(steering.yNorm) || fish.yNorm || 0.5, 0.12, 0.84);
    const side = (fish.xNorm || 0.5) <= focusXNorm ? -1 : 1;
    fish.targetXNorm = clamp(focusXNorm + side * 0.06, 0.08, 0.92);
    // Keep the inspect/hangout anchor fixed. The old code sampled a sine wave
    // only when steering refreshed (every 260 ms), so a fish resting by decor
    // was given a new vertical target in visible steps. Any idle bob belongs in
    // the render pose, which updates every animation frame.
    fish.targetYNorm = clampFishYNormToLayer(focusYNorm, fish, species, steering.targetLayer || getFishTankLayer(fish), { minYNorm: 0.14, maxYNorm: 0.82 });
    fish.targetAt = now + 720;
    fish.hangoutDecorId = steering.decorId || null;
    fish.hangoutZoneType = steering.zoneType || "inspect";
    setFishDesiredTankLayer(fish, steering.targetLayer || getFishTankLayer(fish));
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * 0.55);
    }
    steering.nextRefreshAt = now + FISH_ACTION_STEER_REFRESH_MS;
    setFishBehaviorIntent(fish, "inspect", steering.zoneType || "decor", now, { targetId: steering.decorId || "", durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  if (steering.type === "zoomies") {
    if (now >= Number(fish.targetAt || 0) || Math.hypot((fish.targetXNorm || 0.5) - (fish.xNorm || 0.5), (fish.targetYNorm || 0.5) - (fish.yNorm || 0.5)) <= 0.035) {
      steering.retargets = (Number(steering.retargets) || 0) + 1;
      fish.targetXNorm = randomSwimX();
      fish.targetYNorm = randomSwimY(getFishTankLayer(fish), fish, species);
      fish.targetAt = now + randomBetween(520, 1100);
      setFishDesiredTankLayer(fish, getFishTankLayer(fish));
      if (species.speedMode === "dynamic") {
        fish.swimSpeed = normalizeFishSpeed(species, species.speedMax);
      }
    }
    steering.nextRefreshAt = now + FISH_ACTION_STEER_REFRESH_MS;
    setFishBehaviorIntent(fish, "zoomies", "playful", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  return false;
}

function pickQueuedFishExploreTarget(fish, species, item, now = Date.now()) {
  const allowedZoneTypes = ["lure", "bubbler", "spooky", "hardscape", "plant", "hide"];
  const visited = new Set(Array.isArray(item?.visitedDecorIds) ? item.visitedDecorIds : []);
  let target = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes,
      force: true,
      ignoreOccupancy: true,
      occupancyLimit: 1,
      lingerMultiplier: 0.65
    });
    if (!candidate) {
      break;
    }
    if (!visited.has(candidate.decorId)) {
      target = candidate;
      break;
    }
  }

  if (!target) {
    item.visitedDecorIds = [];
    target = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes,
      force: true,
      ignoreOccupancy: true,
      occupancyLimit: 1,
      lingerMultiplier: 0.65
    });
  }

  if (target) {
    item.visitedDecorIds = [...new Set([...(item.visitedDecorIds || []), target.decorId].filter(Boolean))];
    return target;
  }

  const openTankWaypoints = [
    { xNorm: 0.16, yNorm: 0.68 },
    { xNorm: 0.28, yNorm: 0.3 },
    { xNorm: 0.5, yNorm: 0.52 },
    { xNorm: 0.72, yNorm: 0.28 },
    { xNorm: 0.84, yNorm: 0.66 }
  ];
  const waypointIndex = Math.max(0, Number(item?.exploreWaypointIndex) || 0) % openTankWaypoints.length;
  item.exploreWaypointIndex = waypointIndex + 1;
  const waypoint = openTankWaypoints[waypointIndex];
  return {
    ...waypoint,
    targetLayer: getFishTankLayer(fish),
    decorId: "",
    zoneType: waypoint.yNorm < 0.4 ? "surface" : (waypoint.yNorm > 0.62 ? "tank floor" : "open water"),
    lingerMs: 3200
  };
}

function beginQueuedFishExploreCycle(fish, species, item, now = Date.now()) {
  const target = pickQueuedFishExploreTarget(fish, species, item, now);
  if (!target) {
    return false;
  }
  const cycleDurationMs = randomBetween(8500, 12000);
  item.cycleCount = (Number(item.cycleCount) || 0) + 1;
  item.nextCycleAt = Math.min(Number(item.endsAt) || now + cycleDurationMs, now + cycleDurationMs);
  item.currentTargetId = target.decorId || "";
  item.currentTargetLabel = target.zoneType || "tank";
  setFishActionPhase(item, "Traveling", now, now + Math.max(2600, cycleDurationMs - 3800));
  applyBehaviorTarget(fish, species, {
    ...target,
    targetAt: item.nextCycleAt,
    intentType: "explore",
    intentCause: target.zoneType || "tank",
    signalType: target.zoneType === "lure" ? "inspect_lure" : (target.zoneType === "bubbler" ? "lingering_near_bubbler" : ""),
    debugText: `explore | ${target.zoneType || "tank"}`
  }, now);
  const decor = state.placedDecor.find((entry) => entry?.id === target.decorId) || null;
  setFishActionSteering(fish, {
    type: "inspect",
    decorId: target.decorId || "",
    zoneType: target.zoneType || "tank",
    xNorm: decor?.xNorm ?? target.xNorm,
    yNorm: decor?.yNorm ?? target.yNorm,
    targetLayer: target.targetLayer,
    durationMs: Math.max(1000, item.nextCycleAt - now)
  }, now);
  updateFishActionSteering(fish, species, now);
  return true;
}

function updateQueuedFishExploreAction(fish, species, item, now = Date.now()) {
  if (now >= Number(item.nextCycleAt || 0)) {
    beginQueuedFishExploreCycle(fish, species, item, now);
  } else if (item.phase === "Traveling") {
    const steering = getActiveFishActionSteering(fish, now);
    const targetDistance = steering
      ? Math.hypot((Number(fish.xNorm) || 0.5) - (Number(steering.xNorm) || 0.5), (Number(fish.yNorm) || 0.5) - (Number(steering.yNorm) || 0.5))
      : Infinity;
    if (targetDistance <= 0.105 || now >= Number(item.phaseEndsAt || 0)) {
      setFishActionPhase(item, `Inspecting ${item.currentTargetLabel || "tank"}`, now, item.nextCycleAt);
    }
  }
  return updateFishActionSteering(fish, species, now) || true;
}

function beginQueuedFishDigCycle(fish, species, item, now = Date.now()) {
  const remainingMs = Math.max(1000, (Number(item.endsAt) || now + 10000) - now);
  const started = startFishGravelDigAction(fish, species, now, { durationMs: Math.min(10500, remainingMs) });
  if (!started) {
    item.nextCycleAt = now + 1200;
    setFishActionPhase(item, "Finding a dig spot", now, item.nextCycleAt);
    return false;
  }
  item.cycleActive = true;
  item.cycleCount = (Number(item.cycleCount) || 0) + 1;
  item.nextCycleAt = 0;
  setFishActionPhase(item, "Traveling to gravel", now, now + 5200);
  return true;
}

function updateQueuedFishDigAction(fish, species, item, now = Date.now()) {
  const prompt = getForcedGravelDigPrompt(fish, now);
  if (prompt) {
    const distance = Math.hypot((Number(fish.xNorm) || 0.5) - (Number(prompt.targetXNorm) || 0.5), (Number(fish.yNorm) || 0.5) - (Number(prompt.targetYNorm) || 0.5));
    if (distance <= 0.055 && item.phase !== "Digging") {
      setFishActionPhase(item, "Digging", now, Number(prompt.until) || 0);
    }
    return true;
  }
  if (item.cycleActive) {
    item.cycleActive = false;
    item.nextCycleAt = now + randomBetween(1200, 2200);
    setFishActionPhase(item, "Choosing another spot", now, item.nextCycleAt);
  }
  if (now >= Number(item.nextCycleAt || 0)) {
    beginQueuedFishDigCycle(fish, species, item, now);
  }
  return true;
}

function beginQueuedFishPebbleCycle(fish, species, item, now = Date.now()) {
  const remainingMs = Math.max(1000, (Number(item.endsAt) || now + 10000) - now);
  const started = startFishGravelPebbleAction(fish, species, now, { force: true, durationMs: Math.min(11000, remainingMs) });
  if (!started) {
    item.nextCycleAt = now + 1200;
    setFishActionPhase(item, "Searching for a pebble", now, item.nextCycleAt);
    return false;
  }
  const action = getFishGravelPebbleAction(fish);
  if (action && item.pebbleRewardRolled) {
    action.coinFindRolled = true;
  }
  item.cycleActive = true;
  item.cycleCount = (Number(item.cycleCount) || 0) + 1;
  item.nextCycleAt = 0;
  setFishActionPhase(item, "Searching for a pebble", now, now + 5200);
  return true;
}

function updateQueuedFishPebbleAction(fish, species, item, now = Date.now()) {
  const action = getFishGravelPebbleAction(fish);
  if (action) {
    if (action.coinFindRolled) {
      item.pebbleRewardRolled = true;
    }
    const phase = action.stage === "carry" ? "Carrying pebble" : "Searching for a pebble";
    if (item.phase !== phase) {
      setFishActionPhase(item, phase, now);
    }
    return true;
  }
  if (item.cycleActive) {
    item.cycleActive = false;
    item.nextCycleAt = now + randomBetween(900, 1800);
    setFishActionPhase(item, "Finding another pebble", now, item.nextCycleAt);
  }
  if (now >= Number(item.nextCycleAt || 0)) {
    beginQueuedFishPebbleCycle(fish, species, item, now);
  }
  return true;
}

function updateQueuedFishActionControl(fish, species, now = Date.now()) {
  const active = getActiveFishActionQueueItem(fish, now);
  if (!active || !fish || !species || isFishDead(fish) || fish.caveState) {
    return false;
  }

  // Feeding outranks autonomous passive behavior. Once food has been assigned,
  // an old Rest/Sleep/Hide/etc. action must not clear the pellet target or stop
  // the fish on the next frame.
  if (
    fish.activity === "feeding"
    && fish.feedingPelletId
    && active.autonomous === true
    && active.action !== "eat"
  ) {
    return false;
  }

  if (active.cancelling) {
    fish.activity = "roam";
    fish.feedingPelletId = null;
    fish.targetXNorm = clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92);
    fish.targetYNorm = clampFishYNormToLayer(Number(fish.yNorm) || 0.5, fish, species, getFishTankLayer(fish), { minYNorm: 0.14, maxYNorm: 0.84 });
    fish.targetAt = now + 700;
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species, species.speedMin);
    }
    setFishBehaviorIntent(fish, "cancel", active.label || "action", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  if (active.action === "inspect") {
    return updateQueuedFishExploreAction(fish, species, active, now);
  }

  if (active.action === "play" && active.playUsesExplore) {
    return updateQueuedFishExploreAction(fish, species, active, now);
  }

  if (active.action === "dig") {
    return updateQueuedFishDigAction(fish, species, active, now);
  }

  if (active.action === "pebble") {
    return updateQueuedFishPebbleAction(fish, species, active, now);
  }

  if (active.action === "rest") {
    fish.activity = "roam";
    fish.feedingPelletId = null;
    fish.targetXNorm = clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92);
    fish.targetYNorm = clampFishYNormToLayer(Number(fish.yNorm) || 0.5, fish, species, getFishTankLayer(fish), { minYNorm: 0.14, maxYNorm: 0.84 });
    fish.targetAt = now + 700;
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species, species.speedMin);
    }
    setFishBehaviorIntent(fish, "rest", "queued action", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  if (active.action === "eat") {
    if (fish.activity === "feeding" && fish.feedingPelletId) {
      setFishBehaviorIntent(fish, "eat", "food", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
      return true;
    }
    fish.activity = "roam";
    fish.targetXNorm = clamp(Number(fish.targetXNorm) || Number(fish.xNorm) || 0.5, 0.08, 0.92);
    fish.targetYNorm = clampFishYNormToLayer(Number(fish.targetYNorm) || Number(fish.yNorm) || 0.5, fish, species, getFishTankLayer(fish), { minYNorm: 0.14, maxYNorm: 0.82 });
    fish.targetAt = Math.max(Number(fish.targetAt) || 0, now + 700);
    setFishBehaviorIntent(fish, "eat", "satisfied", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  if (active.action === "sleep" || active.action === "hide") {
    fish.activity = "roam";
    fish.targetAt = Math.max(Number(fish.targetAt) || 0, now + 900);
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species, species.speedMin);
    }
    setFishBehaviorIntent(
      fish,
      active.action === "sleep" ? "sleep" : "hide",
      fish.hangoutZoneType || (active.action === "sleep" ? "quiet spot" : "cover"),
      now,
      { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 }
    );
    return true;
  }

  if (active.action === "breed") {
    setFishBehaviorIntent(fish, "mate", "partner", now, { durationMs: FISH_ACTION_STEER_REFRESH_MS * 5 });
    return true;
  }

  return updateFishActionSteering(fish, species, now) || Boolean(active);
}

function triggerFishActionEat(fish, species, now = Date.now()) {
  const pellet = findExistingFishActionFoodPellet(fish, now) || createFishActionMealPellet(fish, now);
  if (!pellet) {
    showFishRoutineToast(fish, "No valid food is available for this fish.");
    return false;
  }
  prepareFishForUserAction(fish, species, now, { keepFeeding: true });
  assignPelletToFish(fish, pellet, now);
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} was sent to eat.`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is going for food.`);
  return true;
}

function triggerFishActionRest(fish, species, now = Date.now()) {
  const durationMs = getFishActionConfig("rest")?.durationMs || FISH_ACTION_REST_DURATION_MS;
  prepareFishForUserAction(fish, species, now);
  fish.targetXNorm = clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92);
  fish.targetYNorm = clampFishYNormToLayer(Number(fish.yNorm) || 0.5, fish, species, getFishTankLayer(fish), { minYNorm: 0.14, maxYNorm: 0.84 });
  fish.targetAt = now + durationMs;
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin);
  }
  setFishBehaviorIntent(fish, "rest", "quiet", now, { durationMs });
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is resting.`);
  return true;
}

function triggerFishActionWaitFood(fish, species, now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    showFishRoutineToast(fish, "Add the pellet dispenser first.");
    return false;
  }
  prepareFishForUserAction(fish, species, now);
  const layout = getAutoDispenserLayout();
  const xNorm = clamp((layout.nozzle.x || TANK_WIDTH * 0.5) / TANK_WIDTH, 0.08, 0.92);
  const yNorm = clamp((layout.nozzle.y || TANK_HEIGHT * 0.2) / TANK_HEIGHT, 0.08, 0.42);
  fish.feedingMemory = sanitizeFeedingMemory({
    ...fish.feedingMemory,
    feederXNorm: xNorm,
    feederYNorm: yNorm,
    feederSeenAt: now,
    updatedAt: now
  }, now);
  setFishActionSteering(fish, { type: "waitfood", xNorm, yNorm, durationMs: getFishActionConfig("waitfood")?.durationMs || FISH_ACTION_WAIT_FOOD_DURATION_MS }, now);
  updateFishActionSteering(fish, species, now);
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} is waiting by the food dispenser.`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is waiting by the dispenser.`);
  return true;
}

function triggerFishActionSleep(fish, species, now = Date.now()) {
  prepareFishForUserAction(fish, species, now);
  const cover = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["plant", "hide", "hardscape", "spooky"],
    force: true,
    ignoreOccupancy: true,
    lingerMultiplier: 2.5,
    preferBackLayer: true
  }) || {
    xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.05, 0.05), 0.08, 0.92),
    yNorm: clamp((fish.yNorm || 0.5) + randomBetween(-0.04, 0.04), 0.18, 0.78),
    targetLayer: getFishTankLayer(fish),
    targetAt: now + FISH_ACTION_SLEEP_DURATION_MS
  };
  applyBehaviorTarget(fish, species, {
    ...cover,
    targetAt: now + FISH_ACTION_SLEEP_DURATION_MS,
    intentType: "sleep",
    intentCause: cover.zoneType || "quiet spot",
    signalType: cover.zoneType ? "night_sleep" : "",
    debugText: `sleep | ${cover.zoneType || "quiet spot"}`,
    slow: true
  }, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is settling down.`);
  return true;
}

function triggerFishActionZoomies(fish, species, now = Date.now()) {
  prepareFishForUserAction(fish, species, now);
  setFishActionSteering(fish, { type: "zoomies", durationMs: FISH_ACTION_ZOOMIES_DURATION_MS }, now);
  updateFishActionSteering(fish, species, now);
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} got the zoomies.`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} has the zoomies.`);
  return true;
}

function triggerFishActionHangout(fish, species, now = Date.now(), item = null) {
  const partner = getFishActionTargetPartner(fish, item?.targetId || "", { now, requireSocialCompatibility: true });
  if (!partner) {
    showFishRoutineToast(fish, "Add another compatible living fish first.");
    return false;
  }
  if (typeof canFishBuildFriendship === "function" && !canFishBuildFriendship(fish, partner, now, { passive: false })) {
    showFishRoutineToast(fish, `${fish.name} does not feel safe hanging out with ${partner.name}.`);
    return false;
  }
  prepareFishForUserAction(fish, species, now);
  if (typeof reinforceFishFriendshipPair === "function") {
    reinforceFishFriendshipPair(fish, partner, 4, now, { source: "hangout" });
  }
  setFishActionSteering(fish, {
    type: "follow",
    targetFishId: partner.id,
    targetName: partner.name || "",
    durationMs: FISH_ACTION_FOLLOW_DURATION_MS
  }, now);
  updateFishActionSteering(fish, species, now);
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} went to hang out with ${partner.name}.`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is hanging out with ${partner.name}.`);
  return true;
}

function triggerFishActionGreet(fish, species, now = Date.now(), item = null) {
  const partner = getFishActionTargetPartner(fish, item?.targetId || "", { now });
  if (!partner) {
    showFishRoutineToast(fish, "Add another living fish first.");
    return false;
  }
  const started = triggerFishActionHangout(fish, species, now, item);
  if (started) {
    if (typeof reinforceFishFriendshipPair === "function") {
      reinforceFishFriendshipPair(fish, partner, 2, now, { source: "greet" });
    }
    setFishBehaviorIntent(fish, "greet", partner.name || "friend", now, { targetId: partner.id, targetName: partner.name || "", durationMs: getFishActionConfig("greet")?.durationMs || FISH_ACTION_GREET_DURATION_MS });
  }
  return started;
}

function triggerFishActionPlay(fish, species, now = Date.now(), item = null) {
  if (hasDebugDecorHangoutZone(["lure", "bubbler", "spooky", "hardscape", "plant"])) {
    const started = triggerFishActionInspect(fish, species, now, item);
    if (started) {
      if (item) item.playUsesExplore = true;
      const durationMs = getFishActionConfig("play")?.durationMs || FISH_ACTION_PLAY_DURATION_MS;
      const steering = runtime.fishActionSteeringByFishId.get(fish.id);
      if (steering) {
        steering.durationMs = durationMs;
        steering.expiresAt = now + durationMs;
      }
      fish.targetAt = Math.max(Number(fish.targetAt) || 0, now + durationMs);
      setFishBehaviorIntent(fish, "play", "decor", now, { durationMs });
      showFishRoutineToast(fish, `${fish.name} is playing.`);
    }
    return started;
  }
  const started = triggerFishActionZoomies(fish, species, now);
  if (started) {
    setFishActionPhase(item, "Zooming", now, Number(item?.endsAt) || now + FISH_ACTION_PLAY_DURATION_MS);
  }
  return started;
}

function triggerFishActionPebble(fish, species, now = Date.now(), item = null) {
  prepareFishForUserAction(fish, species, now);
  if (!beginQueuedFishPebbleCycle(fish, species, item, now)) {
    showFishRoutineToast(fish, "This fish cannot pick a pebble right now.");
    return false;
  }
  setFishBehaviorIntent(fish, "pebble", "gravel", now, { durationMs: getFishActionConfig("pebble")?.durationMs || FISH_ACTION_PEBBLE_DURATION_MS });
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} went pebble picking.`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is picking a pebble.`);
  return true;
}

function triggerFishActionDig(fish, species, now = Date.now(), item = null) {
  const durationMs = getFishActionConfig("dig")?.durationMs || FISH_ACTION_DIG_DURATION_MS;
  prepareFishForUserAction(fish, species, now);
  if (!beginQueuedFishDigCycle(fish, species, item, now)) {
    showFishRoutineToast(fish, "This fish cannot dig right now.");
    return false;
  }
  setFishBehaviorIntent(fish, "dig", "gravel", now, { durationMs });
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} went digging in the gravel.`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is digging.`);
  return true;
}

function triggerFishActionAvoid(fish, species, now = Date.now(), item = null) {
  const partner = getFishActionTargetPartner(fish, item?.targetId || "", { now, preferNegative: true });
  if (!partner) {
    showFishRoutineToast(fish, "Add another living fish first.");
    return false;
  }
  prepareFishForUserAction(fish, species, now);
  const awayX = clamp((fish.xNorm || 0.5) + Math.sign((fish.xNorm || 0.5) - (partner.xNorm || 0.5) || 1) * 0.18, 0.08, 0.92);
  const awayY = clampFishYNormToLayer((fish.yNorm || 0.5) + randomBetween(-0.06, 0.06), fish, species, getFishTankLayer(fish), { minYNorm: 0.14, maxYNorm: 0.84 });
  fish.targetXNorm = awayX;
  fish.targetYNorm = awayY;
  fish.targetAt = now + (getFishActionConfig("avoid")?.durationMs || FISH_ACTION_AVOID_DURATION_MS);
  setFishBehaviorIntent(fish, "avoid", partner.name || "fish", now, { targetId: partner.id, targetName: partner.name || "", durationMs: getFishActionConfig("avoid")?.durationMs || FISH_ACTION_AVOID_DURATION_MS });
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is taking space.`);
  return true;
}

function triggerFishActionBreed(fish, species, now = Date.now(), item = null) {
  if (typeof isFishBreedingEligible === "function"
    ? !isFishBreedingEligible(fish, now, getCurrentTank(), { requireReady: true, requireCapacity: true })
    : !isFishAdult(fish, now)) {
    showFishRoutineToast(fish, `${fish.name} is not breeding-ready.`);
    return false;
  }
  const partner = getFishActionTargetPartner(fish, item?.targetId || "", { sameSpeciesOnly: true, requireBreedReady: true, now });
  if (!partner) {
    showFishRoutineToast(fish, "This fish needs a breeding-ready adult partner of the same species.");
    return false;
  }
  if (typeof canTankReserveBreedingOffspring === "function" && !canTankReserveBreedingOffspring(fish.speciesId, getCurrentTank())) {
    showFishRoutineToast(fish, "This tank does not have enough capacity for offspring.");
    return false;
  }
  const chancePercent = Math.round(BREEDING_ATTEMPT_SUCCESS_CHANCE * 100);
  if (Math.random() >= BREEDING_ATTEMPT_SUCCESS_CHANCE) {
    setFishBehaviorIntent(fish, "mate fizzled", partner.name || "partner", now, { targetId: partner.id, targetName: partner.name || "", durationMs: 6000 });
    pushEvent(`${fish.name} and ${partner.name} attempted to spawn, but it did not take.`, now);
    markFishActionStateDirty(now);
    showFishRoutineToast(fish, `${fish.name} and ${partner.name} did not spawn this time. Readiness remains active.`);
    return false;
  }
  if (typeof reinforceFishFriendshipPair === "function") {
    reinforceFishFriendshipPair(fish, partner, 5, now, { source: "successful courtship" });
  }
  const parents = [fish, partner].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const [leftFish, rightFish] = parents;
  const targetLayer = getBreedingEventTankLayer(species);
  const eggLayer = getBreedingEggTankLayer(species, targetLayer);
  const anchorXNorm = clamp((leftFish.xNorm + rightFish.xNorm) / 2 + randomBetween(-0.02, 0.02), 0.18, 0.82);
  const anchorYNorm = clampBreedingAnchorYNorm(
    (leftFish.yNorm + rightFish.yNorm) / 2 + randomBetween(-0.018, 0.018),
    parents,
    species,
    targetLayer,
    { minYNorm: 0.2, maxYNorm: 0.72 }
  );
  const spacingNorm = clamp(
    (getFishVisualSize(leftFish, species, now) + getFishVisualSize(rightFish, species, now)) / TANK_WIDTH * 0.1,
    0.018,
    0.042
  );

  runtime.fishBreedingSequence = {
    id: createId("fish-action-breed"),
    speciesId: fish.speciesId,
    leftFishId: leftFish.id,
    rightFishId: rightFish.id,
    anchorXNorm,
    anchorYNorm,
    spacingNorm,
    targetLayer,
    eggLayer,
    startedAt: now,
    cuddleStartedAt: null,
    cuddleEndsAt: null
  };
  for (const parent of parents) {
    prepareFishForUserAction(parent, getSpeciesForFish(parent), now);
    parent.targetAt = now;
    setFishBehaviorIntent(parent, "mate", parent.id === fish.id ? (partner.name || "partner") : (fish.name || "partner"), now, { durationMs: FISH_ACTION_BREED_HOLD_MS + 30000 });
  }
  if (!getFishActionQueueState(fish.id)?.active?.autonomous) pushEvent(`${fish.name} and ${partner.name} began a spawning attempt (${chancePercent}% success chance).`, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} and ${partner.name} are mating.`);
  return true;
}

function triggerFishActionHide(fish, species, now = Date.now()) {
  const cover = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["plant", "hide", "spooky"],
    force: true,
    ignoreOccupancy: true,
    lingerMultiplier: 2.4,
    preferBackLayer: true
  });
  if (!cover) {
    showFishRoutineToast(fish, "Add plants, caves, or spooky decor first.");
    return false;
  }
  prepareFishForUserAction(fish, species, now);
  applyBehaviorTarget(fish, species, {
    ...cover,
    targetAt: now + (getFishActionConfig("hide")?.durationMs || FISH_ACTION_HIDE_DURATION_MS),
    intentType: "hide",
    intentCause: cover.zoneType || "cover",
    signalType: "hiding_more_than_usual",
    debugText: `hide | ${cover.zoneType || "cover"}`,
    slow: true
  }, now);
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is hiding.`);
  return true;
}

function triggerFishActionInspect(fish, species, now = Date.now(), item = null) {
  prepareFishForUserAction(fish, species, now);
  if (!beginQueuedFishExploreCycle(fish, species, item, now)) {
    return false;
  }
  markFishActionStateDirty(now);
  showFishRoutineToast(fish, `${fish.name} is exploring the tank.`);
  return true;
}

function clearFishUserAction(fish, now = Date.now()) {
  if (!fish) {
    return false;
  }
  runtime.fishActionQueuesByFishId.delete(fish.id);
  clearFishActionSteering(fish);
  if (isFishInActiveUserBreedingSequence(fish)) {
    clearFishBreedingSequence();
  }
  fish.behaviorIntent = null;
  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.targetAt = now;
  releasePelletsTargetingFishIds(fish.id);
  if (runtime.selectedFishId === fish.id) {
    runtime.selectedFishId = null;
    runtime.fishInspectorSettingsOpen = false;
  }
  if (runtime.selectedFishStatusFishId === fish.id) {
    runtime.selectedFishStatusFishId = null;
  }
  closeFishActionMenu();
  saveState();
  renderUi(now);
  showToast(`${fish.name} is back to doing fish stuff.`);
  return true;
}

function startFishActionQueueItem(fish, item, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const action = item?.action || "";
  const config = getFishActionConfig(action);
  const availability = getFishActionAvailability(action, fish, now);
  if (!fish || !species || !availability.enabled) {
    if (!item?.autonomous) showFishActionUnavailableToast(availability);
    return false;
  }

  let started = false;
  switch (action) {
    case "eat":
      started = triggerFishActionEat(fish, species, now);
      break;
    case "waitfood":
      started = triggerFishActionWaitFood(fish, species, now);
      break;
    case "rest":
      started = triggerFishActionRest(fish, species, now);
      break;
    case "sleep":
      started = triggerFishActionSleep(fish, species, now);
      break;
    case "zoomies":
      started = triggerFishActionZoomies(fish, species, now);
      break;
    case "hangout":
      started = triggerFishActionHangout(fish, species, now, item);
      break;
    case "greet":
      started = triggerFishActionGreet(fish, species, now, item);
      break;
    case "play":
      started = triggerFishActionPlay(fish, species, now, item);
      break;
    case "pebble":
      started = triggerFishActionPebble(fish, species, now, item);
      break;
    case "dig":
      started = triggerFishActionDig(fish, species, now, item);
      break;
    case "avoid":
      started = triggerFishActionAvoid(fish, species, now, item);
      break;
    case "breed":
      started = triggerFishActionBreed(fish, species, now, item);
      break;
    case "hide":
      started = triggerFishActionHide(fish, species, now);
      break;
    case "inspect":
      started = triggerFishActionInspect(fish, species, now, item);
      break;
    default:
      showToast("Unknown fish action.");
      return false;
  }

  return started;
}

function finishFishActionQueueItem(fish, item, now = Date.now(), options = {}) {
  if (!fish || !item) {
    return;
  }
  // Completing a routine does not fill meters or change the feeding clock.
  if (item.action === "breed" && isFishInActiveUserBreedingSequence(fish)) {
    clearFishBreedingSequence();
  }
  if (item.action === "eat") {
    fish.feedingPelletId = null;
    releasePelletsTargetingFishIds(fish.id);
  }
  if (item.action === "pebble") {
    clearFishGravelPebbleAction(fish, getSpeciesForFish(fish), now, { resetTarget: false });
  }
  if (item.action === "dig") {
    clearForcedGravelDigPrompt(fish);
  }
  if (item.action !== "eat" && !isFishInActiveUserBreedingSequence(fish)) {
    clearFishActionSteering(fish);
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    fish.targetAt = now;
  }
  fish.behaviorIntent = null;
  requestDeferredStateSave();
  if (runtime.debugFishActionIndicatorsEnabled) {
    renderFishActionQueueDock(now);
  }
  if (options.cancelled === true && options.silent !== true && !item.autonomous) {
    showToast(`${item.label || getFishActionConfig(item.action)?.label || "Action"} cancelled for ${fish.name}.`);
  }
}

function promoteNextFishActionQueueItem(fishId, now = Date.now()) {
  const queue = getFishActionQueueState(fishId);
  if (!queue || queue.active) {
    return false;
  }
  if ((Number(queue.restUntil) || 0) > now) {
    return false;
  }
  queue.restUntil = 0;
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  if (!fish || managed.inStorage || isFishDead(fish)) {
    runtime.fishActionQueuesByFishId.delete(fishId);
    return false;
  }
  if (Number.isFinite(fish.panicUntil) && now < fish.panicUntil) {
    // Immediate reactions such as a glass tap temporarily outrank queued
    // autonomous/user actions. Leave the item queued and start it once the
    // panic window has finished instead of overwriting the escape target.
    queue.restUntil = Math.max(Number(queue.restUntil) || 0, fish.panicUntil);
    return false;
  }

  while (!queue.active && queue.items.length > 0) {
    const item = queue.items.shift();
    if (item?.cancelling) {
      if (now < Number(item.cancelEndsAt || 0)) {
        queue.items.unshift(item);
        return false;
      }
      continue;
    }
    const durationMs = Math.max(1000, Number(item.durationMs) || Number(getFishActionConfig(item.action)?.durationMs) || 12 * 1000);
    item.startedAt = now;
    item.endsAt = now + durationMs;
    item.durationMs = durationMs;
    queue.active = item;
    if (startFishActionQueueItem(fish, item, now)) {
      return true;
    }
    queue.active = null;
  }

  trimFishActionQueue(fishId);
  if (runtime.debugFishActionIndicatorsEnabled) {
    renderFishActionQueueDock(now);
  }
  return false;
}

function pruneFishActionQueueItemsInPlace(queue, now = Date.now()) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
    const item = items[readIndex];
    if (item?.cancelling && now >= Number(item.cancelEndsAt || 0)) {
      continue;
    }
    items[writeIndex] = item;
    writeIndex += 1;
  }
  if (writeIndex < items.length) {
    items.length = writeIndex;
  }
  if (queue) {
    queue.items = items;
  }
  return items;
}

function processFishActionQueues(now = Date.now()) {
  for (const [fishId, queue] of runtime.fishActionQueuesByFishId) {
    const fish = getFishByIdFast(fishId);
    if (!fish || isFishDead(fish)) {
      runtime.fishActionQueuesByFishId.delete(fishId);
      runtime.fishActionQueueCollapsedFishIds.delete(fishId);
      continue;
    }
    pruneFishActionQueueItemsInPlace(queue, now);
    if (queue.active?.cancelling && now >= Number(queue.active.cancelEndsAt || 0)) {
      queue.active = null;
      queue.restUntil = 0;
    } else if (queue.active && now >= Number(queue.active.endsAt || 0)) {
      finishFishActionQueueItem(fish, queue.active, now);
      queue.active = null;
      queue.restUntil = queue.items.length > 0 ? now + FISH_ACTION_QUEUE_REST_MS : 0;
    }
    if (!queue.active && (Number(queue.restUntil) || 0) <= now) {
      queue.restUntil = 0;
      promoteNextFishActionQueueItem(fishId, now);
    }
    trimFishActionQueue(fishId);
  }
}

function enqueueFishAction(action, fishId = runtime.fishActionMenuFishId || runtime.selectedFishId, now = Date.now(), options = {}) {
  const config = getFishActionConfig(action);
  if (!config) {
    showToast("Unknown fish action.");
    return false;
  }

  syncState(now);
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  const species = getSpeciesForFish(fish);
  if (!fish || !species || managed.inStorage || isFishDead(fish)) {
    showToast("Select a living fish in the tank first.");
    return false;
  }

  if (action === "clear") {
    clearFishUserAction(fish, now);
    closeFishActionMenu({ keepTarget: true });
    return true;
  }

  const availability = getFishActionAvailability(action, fish, now);
  if (!availability.enabled || config.queueable === false) {
    showFishActionUnavailableToast(availability);
    if (runtime.debugFishActionIndicatorsEnabled) {
      renderFishActionFlyout(now);
      renderFishActionQueueDock(now);
    }
    return false;
  }

  const queue = getFishActionQueueState(fish.id, { create: true });
  const queuedCount = (queue.active ? 1 : 0) + queue.items.length;
  if (queuedCount >= 6) {
    showToast(`${fish.name} has enough queued actions.`);
    return false;
  }

  const item = createFishActionQueueItem(action, config, now, {
    autonomous: false,
    targetFishId: options.targetFishId || ""
  });
  if (!item) {
    showToast("Unknown fish action.");
    return false;
  }
  queue.items.push(item);
  const started = queue.active ? false : promoteNextFishActionQueueItem(fish.id, now);
  if (!started) {
    showToast(`${config.label} queued for ${fish.name}.`);
    if (runtime.debugFishActionIndicatorsEnabled) {
      renderFishActionFlyout(now);
      renderFishActionQueueDock(now);
    }
  }
  closeFishActionMenu({ keepTarget: true });
  return true;
}

function createFishActionQueueItem(action, config = getFishActionConfig(action), now = Date.now(), options = {}) {
  if (!config) {
    return null;
  }
  return {
    id: createId("fish-action-queue"),
    actionId: config.actionId || action,
    action,
    displayName: config.displayName || config.label,
    label: config.label,
    category: config.category || "Behavior",
    targetType: config.targetType || "self",
    targetId: typeof options.targetFishId === "string" ? options.targetFishId : "",
    targetPosition: null,
    durationMs: Math.max(1000, Number(config.durationMs) || 12 * 1000),
    energyCost: Math.max(0, Number(config.energyCost) || 0),
    hungerCost: Math.max(0, Number(config.hungerCost) || 0),
    effects: { ...(config.effects || {}) },
    requirements: { ...(config.requirements || {}) },
    canFail: config.canFail !== false,
    interruptible: config.interruptible !== false,
    autonomousAllowed: config.autonomousAllowed === true,
    priority: Number(config.priority) || 0,
    autonomous: options.autonomous === true,
    queuedAt: now,
    startedAt: null,
    endsAt: null
  };
}

function cancelFishQueuedAction(fishId, itemId, now = Date.now()) {
  const queue = getFishActionQueueState(fishId);
  if (!queue || !itemId) {
    return false;
  }
  const fish = getFishByIdFast(fishId);
  if (queue.active?.id === itemId) {
    if (queue.active.cancelling) {
      return false;
    }
    finishFishActionQueueItem(fish, queue.active, now, { cancelled: true });
    queue.active.cancelling = true;
    queue.active.cancelledAt = now;
    queue.active.cancelEndsAt = now + FISH_ACTION_QUEUE_REST_MS;
    queue.active.endsAt = queue.active.cancelEndsAt;
    queue.restUntil = 0;
    trimFishActionQueue(fishId);
    if (runtime.debugFishActionIndicatorsEnabled) {
      renderFishActionQueueDock(now);
    }
    return true;
  }
  const index = queue.items.findIndex((item) => item?.id === itemId);
  if (index >= 0) {
    const item = queue.items[index];
    if (item.cancelling) {
      return false;
    }
    item.cancelling = true;
    item.cancelledAt = now;
    item.cancelEndsAt = now + FISH_ACTION_QUEUE_REST_MS;
    showToast(`${item.label || "Action"} cancelled for ${fish?.name || "fish"}.`);
    trimFishActionQueue(fishId);
    if (runtime.debugFishActionIndicatorsEnabled) {
      renderFishActionQueueDock(now);
    }
    return true;
  }
  return false;
}

function isFishMoodActionHardBlocked(mood, action) {
  const key = action || "idle";
  const blocks = {
    Happy: new Set(["avoid"]),
    Cozy: new Set(["zoomies", "avoid"]),
    Playful: new Set(["sleep", "avoid"]),
    Hyper: new Set(["rest", "sleep", "hide"]),
    Curious: new Set(["avoid"]),
    Social: new Set(["avoid"]),
    Hungry: new Set(["sleep", "play", "zoomies", "pebble"]),
    Sleepy: new Set(["play", "zoomies", "pebble", "dig", "breed"]),
    Lonely: new Set(["breed"]),
    Sad: new Set(["play", "zoomies", "breed"]),
    Uneasy: new Set(),
    Stressed: new Set(["play", "zoomies", "breed"]),
    Scared: new Set(["rest", "sleep", "play", "zoomies", "breed"]),
    Hostile: new Set(),
    Sick: new Set(["play", "zoomies", "pebble", "dig", "breed"]),
    Panicked: new Set(["idle", "inspect", "rest", "sleep", "play", "zoomies", "greet", "hangout", "pebble", "dig", "breed"])
  };
  return blocks[mood]?.has(key) === true;
}

function getFishMoodActionMultiplier(mood, action) {
  const key = action || "idle";
  if (typeof isFishMoodActionHardBlocked === "function" && isFishMoodActionHardBlocked(mood, key)) {
    return 0;
  }
  const tables = {
    Happy: { idle: 1, inspect: 1.35, rest: 0.85, sleep: 0.7, play: 1.3, zoomies: 1.2, greet: 1.3, hangout: 1.35, pebble: 1.15, dig: 1.1, hide: 0.7, avoid: 0.55 },
    Cozy: { idle: 1.35, inspect: 0.75, rest: 2.5, sleep: 2.3, play: 0.4, zoomies: 0.18, greet: 0.85, hangout: 1.15, pebble: 0.35, dig: 0.55, hide: 2.5, avoid: 0.65 },
    Playful: { idle: 0.55, inspect: 1.45, rest: 0.45, sleep: 0.25, play: 3.4, zoomies: 3, greet: 1.45, hangout: 1.5, pebble: 2.5, dig: 1.35, hide: 0.55, avoid: 0.45 },
    Hyper: { idle: 0.35, inspect: 1.35, rest: 0.2, sleep: 0.1, play: 2.4, zoomies: 4.2, greet: 1.2, hangout: 1.15, pebble: 1.55, dig: 1.25, hide: 0.25, avoid: 0.5 },
    Curious: { idle: 0.7, inspect: 3.3, rest: 0.65, sleep: 0.5, play: 1.5, zoomies: 0.9, greet: 1.15, hangout: 1, pebble: 1.65, dig: 1.9, hide: 0.75, avoid: 0.7 },
    Social: { idle: 0.65, inspect: 0.95, rest: 0.8, sleep: 0.65, play: 1.55, zoomies: 1.05, greet: 3.5, hangout: 3.7, pebble: 0.95, dig: 0.8, hide: 0.55, avoid: 0.35 },
    Hungry: { idle: 0.55, inspect: 1.65, rest: 0.4, sleep: 0.25, play: 0.35, zoomies: 0.3, greet: 0.7, hangout: 0.7, pebble: 0.5, dig: 0.8, hide: 0.55, avoid: 0.7 },
    Sleepy: { idle: 1.25, inspect: 0.35, rest: 3.4, sleep: 3.8, play: 0.18, zoomies: 0.1, greet: 0.65, hangout: 1.05, pebble: 0.2, dig: 0.25, hide: 1.9, avoid: 0.7 },
    Lonely: { idle: 1.05, inspect: 1.35, rest: 1, sleep: 0.8, play: 0.6, zoomies: 0.45, greet: 2.8, hangout: 3, pebble: 0.65, dig: 0.8, hide: 1.2, avoid: 0.7 },
    Sad: { idle: 1.8, inspect: 0.7, rest: 2.2, sleep: 1.5, play: 0.25, zoomies: 0.15, greet: 0.75, hangout: 0.95, pebble: 0.25, dig: 0.45, hide: 1.7, avoid: 0.9 },
    Uneasy: { idle: 1.15, inspect: 1.2, rest: 1.25, sleep: 0.9, play: 0.7, zoomies: 0.55, greet: 0.8, hangout: 0.85, pebble: 0.65, dig: 0.75, hide: 1.6, avoid: 1.7 },
    Stressed: { idle: 1.15, inspect: 0.7, rest: 1.55, sleep: 1.1, play: 0.22, zoomies: 0.2, greet: 0.55, hangout: 0.65, pebble: 0.35, dig: 0.6, hide: 3, avoid: 3.1 },
    Scared: { idle: 0.7, inspect: 0.4, rest: 0.9, sleep: 0.35, play: 0.08, zoomies: 0.08, greet: 0.3, hangout: 0.55, pebble: 0.12, dig: 0.25, hide: 4.2, avoid: 4.5 },
    Hostile: { idle: 0.65, inspect: 1.25, rest: 0.5, sleep: 0.3, play: 0.45, zoomies: 1.1, greet: 0.18, hangout: 0.15, pebble: 0.45, dig: 0.65, hide: 0.3, avoid: 0.45 },
    Sick: { idle: 1.35, inspect: 0.3, rest: 3.7, sleep: 2.8, play: 0.1, zoomies: 0.05, greet: 0.45, hangout: 0.55, pebble: 0.12, dig: 0.2, hide: 2.6, avoid: 1.15 },
    Panicked: { idle: 0.25, inspect: 0.08, rest: 0.25, sleep: 0.08, play: 0.03, zoomies: 0.04, greet: 0.05, hangout: 0.08, pebble: 0.03, dig: 0.06, hide: 4.8, avoid: 5 }
  };
  return Math.max(0, Number(tables[mood]?.[key]) || 1);
}

function getFishAutonomousActionWeights(fish, now = Date.now()) {
  const personality = getFishPersonality(fish);
  const mood = typeof getFishDisposition === "function" ? getFishDisposition(fish, now).mood : "Happy";
  const weights = {
    "": 2,
    inspect: 1,
    rest: 1,
    sleep: 0.2,
    play: 0.18,
    zoomies: 0.08,
    greet: 0,
    hangout: 0,
    pebble: 0.06,
    dig: 0.06,
    hide: 0.12,
    avoid: 0.04
  };

  if (["curious", "explorer", "hunter"].includes(personality)) {
    weights.inspect += 2;
    weights.play += 1;
  }
  if (["playful", "energetic", "bold"].includes(personality)) {
    weights.play += 1;
    weights.zoomies += 1;
    weights.pebble += 1;
  }
  if (["lazy", "chill", "slow-graceful"].includes(personality)) {
    weights.rest += 2;
    weights[""] += 1;
  }
  if (typeof isFishElderly === "function" && isFishElderly(fish, now)) {
    weights.rest += FISH_ELDERLY_REST_WEIGHT_BONUS;
    weights.sleep += 1.35;
    weights[""] += 0.9;
    weights.play *= 0.45;
    weights.zoomies *= 0.2;
  }
  if (["homebody", "routine-loving", "shy", "nervous"].includes(personality)) {
    weights.hide += 2;
  }
  if (["digger", "cleaner"].includes(personality)) {
    weights.dig += 1;
    weights.pebble += 1;
  }

  const friendlyPartner = getFishActionPartner(fish, { requireSocialCompatibility: true, now });
  const friendlyRelation = friendlyPartner
    ? (fish.relationships?.[friendlyPartner.id]?.kind || getRelationshipKindForFish(fish, friendlyPartner))
    : "";
  if (["friend", "neutral"].includes(friendlyRelation)) {
    weights.greet = 0.18;
    weights.hangout = 0.14;
    const relationshipScore = friendlyPartner && typeof getFishRelationshipScoreForTarget === "function"
      ? getFishRelationshipScoreForTarget(fish, friendlyPartner)
      : 0;
    if (friendlyRelation === "friend") {
      weights.greet += clamp(relationshipScore / 100, 0, 1) * 0.55;
      weights.hangout += clamp(relationshipScore / 100, 0, 1) * 0.8;
    }
    if (fish.pairBondPartnerId === friendlyPartner?.id) {
      weights.greet += 1.4;
      weights.hangout += 2.4;
    }
    if (["social", "follower", "gentle"].includes(personality)) {
      weights.hangout += 2;
      weights.greet += 1;
    }
    if (mood === "Lonely") {
      // Lonely fish can seek safe company even when that company does not
      // biologically satisfy an own-kind requirement.
      weights.hangout += 1.2;
      weights.greet += 0.8;
    }
  }

  const negativePartner = getFishActionPartner(fish, { preferNegative: true, now });
  const negativeRelation = negativePartner
    ? (fish.relationships?.[negativePartner.id]?.kind || getRelationshipKindForFish(fish, negativePartner))
    : "";
  if (["dislike", "fear", "rival", "enemy"].includes(negativeRelation)) {
    // Phase 7: avoidance must have a real target/cause. Environmental stress
    // alone cannot make a fish randomly flee a harmless tankmate.
    weights.avoid += 0.9;
  } else {
    weights.avoid = 0;
  }

  for (const action of Object.keys(weights)) {
    weights[action] = Math.max(0, weights[action] * getFishMoodActionMultiplier(mood, action));
  }
  return { mood, weights };
}

function pickWeightedFishAutonomousAction(weightEntries) {
  const entries = (Array.isArray(weightEntries) ? weightEntries : [])
    .filter((entry) => entry && Number(entry.weight) > 0);
  const total = entries.reduce((sum, entry) => sum + Number(entry.weight), 0);
  if (!(total > 0)) return "";
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= Number(entry.weight);
    if (roll <= 0) return entry.action || "";
  }
  return entries[entries.length - 1]?.action || "";
}

function pickAutonomousFishAction(fish, now = Date.now(), options = {}) {
  const needs = sanitizeFishNeeds(fish.needs, fish, now);
  if (!isMealFreeFish(fish) && needs.hunger <= FISH_HUNGER_LOW_THRESHOLD) {
    if (findExistingFishActionFoodPellet(fish, now)) return "eat";
    if (getFishActionAvailability("waitfood", fish, now).enabled) return "waitfood";
  }
  if (options.emergency) return "";

  // Keep this long-standing entry point safe in isolated debug/test contexts
  // that intentionally load only pickAutonomousFishAction. The real bundle
  // always has the Phase 6 weighting helpers available.
  if (typeof getFishAutonomousActionWeights !== "function" || typeof pickWeightedFishAutonomousAction !== "function") {
    const personality = getFishPersonality(fish);
    const choices = ["", "", "inspect", "rest"];
    if (["curious", "explorer", "hunter"].includes(personality)) choices.push("inspect", "inspect", "play");
    if (["playful", "energetic", "bold"].includes(personality)) choices.push("play", "zoomies", "pebble");
    if (["lazy", "chill", "slow-graceful"].includes(personality)) choices.push("rest", "rest", "");
    if (["homebody", "routine-loving", "shy", "nervous"].includes(personality)) choices.push("hide", "hide");
    if (["digger", "cleaner"].includes(personality)) choices.push("dig", "pebble");
    if (["social", "follower", "gentle"].includes(personality)) {
      const partner = getFishActionPartner(fish);
      const relation = partner && (fish.relationships?.[partner.id]?.kind || getRelationshipKindForFish(fish, partner));
      if (["friend", "neutral"].includes(relation)) choices.push("hangout", "hangout", "greet");
    }
    const availableLegacy = choices.filter(action => !action || getFishActionAvailability(action, fish, now).enabled);
    return availableLegacy[Math.floor(Math.random() * availableLegacy.length)] || "";
  }

  const weighted = getFishAutonomousActionWeights(fish, now);
  const available = Object.entries(weighted.weights)
    .map(([action, weight]) => ({ action, weight }))
    .filter((entry) => !entry.action || getFishActionAvailability(entry.action, fish, now).enabled);
  return pickWeightedFishAutonomousAction(available);
}

function processFishNeedsAutonomy(now = Date.now()) {
  let changed = false;
  const nextDecisions = runtime.fishRoutineNextAtById || (runtime.fishRoutineNextAtById = new Map());
  const living = getLivingTankFish();
  const livingIds = new Set(living.map(fish => fish.id));
  for (const id of nextDecisions.keys()) if (!livingIds.has(id)) nextDecisions.delete(id);
  for (const fish of living) {
    if (runtime.fishDragState?.fishId === fish.id || fish.caveState || fish.activity !== "roam"
      || Number(fish.panicUntil) > now || runtime.debugAutonomyPausedFishIds?.has?.(fish.id)) continue;
    const queue = getFishActionQueueState(fish.id);
    // Feeding interrupts passive routines through the existing feeding system.
    // Never repeatedly cancel an active behavior while waiting for a meal.
    if (queue?.active || queue?.items.length || Number(queue?.restUntil) > now) continue;
    if (!nextDecisions.has(fish.id)) {
      nextDecisions.set(fish.id, now + randomBetween(5, 25) * 1000);
      continue;
    }
    if (nextDecisions.get(fish.id) > now) continue;
    nextDecisions.set(fish.id, now + randomBetween(35, 85) * 1000);
    const action = pickAutonomousFishAction(fish, now, {
      emergency: !isMealFreeFish(fish) && getFishNeedValue(fish, "hunger", now) <= FISH_HUNGER_CRITICAL_THRESHOLD
    });
    if (!action || !getFishActionAvailability(action, fish, now).enabled) continue;
    const item = createFishActionQueueItem(action, getFishActionConfig(action), now, { autonomous: true });
    if (!item) continue;
    getFishActionQueueState(fish.id, { create: true }).items.push(item);
    changed = promoteNextFishActionQueueItem(fish.id, now) || changed;
  }
  return changed;
}

function showFishRoutineToast(fish, message) {
  if (getFishActionQueueState(fish?.id)?.active?.autonomous) return;
  showToast(message);
}

function offerFishInteraction(interaction, fishId, now = Date.now()) {
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish;
  if (!fish || managed.inStorage || isFishDead(fish)) return false;
  const queue = getFishActionQueueState(fishId);
  if (queue?.active && (!queue.active.autonomous || queue.active.interruptible === false)) {
    showToast(fish.name + " is busy for a moment.");
    return false;
  }
  let action = interaction === "treat" ? "eat" : "play";
  if (interaction !== "treat" && interaction !== "play") return false;
  if (interaction === "play") {
    const personality = getFishPersonality(fish);
    if (["sleep", "rest", "hide"].includes(queue?.active?.action)
      || (["shy", "lazy", "standoffish"].includes(personality) && Math.random() < 0.35)) {
      showToast(fish.name + " is enjoying a quiet moment. Try again later.");
      return false;
    }
    if (["energetic", "bold", "playful"].includes(personality)) action = "zoomies";
    else if (["curious", "explorer"].includes(personality)) action = "inspect";
  }
  const availability = getFishActionAvailability(action, fish, now);
  if (!availability.enabled) {
    showToast(interaction === "treat"
      ? isMealFreeFish(fish) ? fish.name + " finds their own food in the tank."
        : getFishNeedValue(fish, "hunger", now) >= 92 ? fish.name + " is full and content."
        : "Add suitable food from the food tray first."
      : fish.name + " isn't ready to play just now.");
    return false;
  }
  if (queue?.active) {
    finishFishActionQueueItem(fish, queue.active, now, { cancelled: true, silent: true });
    queue.active = null;
  }
  const targetQueue = getFishActionQueueState(fishId, { create: true });
  targetQueue.items = [];
  targetQueue.restUntil = 0;
  targetQueue.items.push(createFishActionQueueItem(action, getFishActionConfig(action), now));
  return promoteNextFishActionQueueItem(fishId, now);
}

function triggerFishAction(action, fishId = runtime.fishActionMenuFishId || runtime.selectedFishId, options = {}) {
  return enqueueFishAction(action, fishId, Date.now(), options);
}

function handleFishActionButtonClick(action) {
  if (isFishActionTargeted(action)) {
    openFishActionTargetMenu(action);
    return;
  }
  closeFishActionTargetMenu();
  triggerFishAction(action);
}
