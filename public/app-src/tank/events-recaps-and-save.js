// Source fragment: tank/events-recaps-and-save.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function pushEvent(text, time = Date.now(), tank = getCurrentTank(), meta = {}) {
  const targetTank = tank || getCurrentTank();
  if (!targetTank) {
    return;
  }

  const score = Number(meta?.score ?? meta?.recapScore);
  const eventEntry = {
    id: createId("event"),
    time,
    text
  };
  if (Number.isFinite(score)) {
    eventEntry.score = clamp(Math.round(score), -1, 1);
  }
  if (typeof meta?.type === "string" && meta.type.trim()) {
    eventEntry.type = meta.type.trim();
  }
  if (typeof meta?.fishId === "string" && meta.fishId.trim()) {
    eventEntry.fishId = meta.fishId.trim();
  }
  if (typeof meta?.decorKey === "string" && meta.decorKey.trim()) {
    eventEntry.decorKey = normalizeDecorKey(meta.decorKey);
  }
  if (typeof meta?.placedDecorId === "string" && meta.placedDecorId.trim()) {
    eventEntry.placedDecorId = meta.placedDecorId.trim();
  }
  for (const key of ["destinationTankId", "sourceTankId", "serviceType", "travelReason", "detail"]) {
    if (typeof meta?.[key] === "string" && meta[key].trim()) {
      eventEntry[key] = meta[key].trim().slice(0, 160);
    }
  }
  if (meta?.recapEligible === false) {
    eventEntry.recapEligible = false;
  }

  const events = Array.isArray(targetTank.events) ? targetTank.events : [];
  events.unshift(eventEntry);
  targetTank.events = events.slice(0, MAX_TANK_EVENT_HISTORY);
  publishBoroughActivityEvent(eventEntry, targetTank);
}

function getLocalDayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalDayStartTimestamp(dayKeyOrTimestamp = Date.now()) {
  if (typeof dayKeyOrTimestamp === "string") {
    const [year, month, day] = dayKeyOrTimestamp.split("-").map((part) => Number(part));
    return new Date(year || 1970, Math.max(0, (month || 1) - 1), day || 1, 0, 0, 0, 0).getTime();
  }
  const date = new Date(dayKeyOrTimestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getPreviousLocalDayKey(timestamp = Date.now()) {
  return getLocalDayKey(getLocalDayStartTimestamp(timestamp) - 1);
}

function getDailyBonusClaimKey(summary, tank = getCurrentTank()) {
  const tankId = summary?.tankId || tank?.id || state.activeTankId || "";
  return tankId && summary?.dayKey ? `${tankId}:${summary.dayKey}` : "";
}

function isDailyBonusSummaryClaimed(summary, tank = getCurrentTank()) {
  const claimedKey = getDailyBonusClaimKey(summary, tank);
  return Boolean(claimedKey && state?.dailyBonus?.claimedByTankDay?.[claimedKey]);
}

function getActiveDailyBonusSummary(tank = getCurrentTank()) {
  if (!state?.dailyBonus) {
    return null;
  }
  const tankId = tank?.id || state.activeTankId || "";
  const summary = state.dailyBonus.summariesByTankId?.[tankId] || (
    state.dailyBonus.summary?.tankId === tankId || !state.dailyBonus.summary?.tankId
      ? state.dailyBonus.summary
      : null
  );
  return summary && !isDailyBonusSummaryClaimed(summary, tank) ? summary : null;
}

function syncActiveDailyBonusState() {
  if (!state?.dailyBonus) {
    return;
  }
  const summary = getActiveDailyBonusSummary();
  state.dailyBonus.summary = summary || null;
  state.dailyBonus.available = Boolean(summary);
}

function classifyEventForDailyRecap(event) {
  if (!event || event.recapEligible === false) {
    return null;
  }
  if (Number.isFinite(Number(event.score))) {
    const score = clamp(Math.round(Number(event.score)), -1, 1);
    if (score !== 0) {
      return { text: event.text, score, type: event.type || "event", time: event.time };
    }
  }
  const text = String(event.text || "");
  const lower = text.toLowerCase();
  const negativePatterns = [
    /missed .* meal/,
    /overfed|gorged/,
    /lost .*heart|lost half/,
    /died|dead fish|could not survive/,
    /attacked|nipped|bit |bite|swarmed/,
    /maximum dirtiness|filthy|critical/,
    /very uncomfortable|comfort is low|panicking/
  ];
  const positivePatterns = [
    /splashed into the tank|joined the aquarium|splash(ed)? back/,
    / ate |fed \d+ fish|meal served/,
    /earned \d+ .*coin/,
    /sparkled back to life|tank cleaned/,
    /placed |bought |installed /,
    /found a coin/,
    /recovered half a heart/,
    /egg appeared|hatched/,
    /unlocked|available in the shop|milestone/
  ];
  if (negativePatterns.some((pattern) => pattern.test(lower))) {
    return { text, score: -1, type: "negative", time: event.time };
  }
  if (positivePatterns.some((pattern) => pattern.test(lower))) {
    return { text, score: 1, type: "positive", time: event.time };
  }
  return null;
}

function buildDailyRecapSummary(tank, dayKey, now = Date.now(), options = {}) {
  if (!tank) {
    return null;
  }
  const start = getLocalDayStartTimestamp(dayKey);
  const end = start + DAY_MS;
  const cleanPercent = getTankCleanlinessPercentForMilestones(tank, now);
  const rows = (Array.isArray(tank.events) ? tank.events : [])
    .filter((event) => event && Number(event.time) >= start && Number(event.time) < end)
    .sort((left, right) => Number(left.time) - Number(right.time))
    .map((event) => classifyEventForDailyRecap(event))
    .filter(Boolean);

  const livingFish = (Array.isArray(tank.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
  const comfortValues = livingFish.map((fish) => getFishComfort(fish, now).value);
  const averageComfort = comfortValues.length
    ? Math.round((comfortValues.reduce((total, value) => total + value, 0) / comfortValues.length) * 100)
    : 0;
  if (livingFish.length && averageComfort >= 80) {
    rows.push({ text: `The tank averaged ${averageComfort}% comfort.`, score: 1, type: "comfort", time: end - 1 });
  }
  for (const fish of livingFish) {
    const comfort = getFishComfort(fish, now);
    const needsStatus = getFishNeedsStatus(fish, tank, now);
    const activeConflicts = getFishConflictStatus(fish, tank, now).filter((conflict) => conflict.active);
    if (getFishHealthRatio(fish) >= 1) {
      rows.push({ text: `${fish.name} stayed healthy.`, score: 1, type: "health", time: end - 1 });
    }
    if (needsStatus.length && needsStatus.every((need) => need.met)) {
      rows.push({ text: `${fish.name}'s comfort needs were satisfied.`, score: 1, type: "need", time: end - 1 });
    }
    if (comfort.value >= 0.95) {
      rows.push({ text: `${fish.name} reached sparkling comfort.`, score: 1, type: "comfort", time: end - 1 });
    }
    if (comfort.value < 0.4) {
      rows.push({ text: `${fish.name} averaged under 40% comfort.`, score: -1, type: "comfort", time: end - 1 });
    }
    for (const conflict of activeConflicts.slice(0, 2)) {
      rows.push({ text: `${fish.name} had an active conflict: ${conflict.label}.`, score: -1, type: "conflict", time: end - 1 });
    }
  }
  if (livingFish.length && !rows.some((row) => row.score < 0)) {
    rows.push({ text: "No critical care alerts were recorded.", score: 1, type: "care", time: end - 1 });
  }
  if (!rows.length && !options.force && !livingFish.length) {
    return null;
  }

  const score = rows.reduce((total, row) => total + row.score, 0);
  const reward = clamp(Math.max(0, score), 0, DAILY_RECAP_REWARD_CAP);
  const noStarvingFish = livingFish.length > 0 && !rows.some((row) => /starving|starvation/i.test(row.text || ""));
  const hasNegativeEvents = rows.some((row) => row.score < 0);
  const hasAttackOrDeath = rows.some((row) => /attack|bit|bite|died|death|devoured/i.test(row.text || ""));
  const hasGlassTapStress = rows.some((row) => row.type === "glass_tap_stress" || /glass tapping|startled/i.test(row.text || ""));
  const hasSparklingComfort = rows.some((row) => /sparkling comfort/i.test(row.text || ""));
  const narrative = buildDailyRecapNarrative(rows, tank);
  return {
    tankId: tank.id || "",
    tankName: getTankLabel(tank),
    dayKey,
    generatedAt: now,
    rows,
    score,
    reward,
    mealsFed: rows.filter((row) => / ate |fed \d+ fish|meal served/i.test(row.text)).length,
    averageComfort,
    cleanPercent,
    allMealsSatisfied: noStarvingFish,
    hasNegativeEvents,
    hasAttackOrDeath,
    hasGlassTapStress,
    hasSparklingComfort,
    fishCount: livingFish.length,
    decorCount: Array.isArray(tank.placedDecor) ? tank.placedDecor.length : 0,
    narrative,
    overall: score >= 12 ? "Great day!" : score >= 5 ? "Good day!" : score >= 1 ? "Pretty good day!" : score === 0 ? "Quiet day." : "Rough day."
  };
}

function storeDailyRecapSummary(summary) {
  if (!summary?.tankId || !state?.dailyBonus) {
    return false;
  }
  if (!state.dailyBonus.summariesByTankId || typeof state.dailyBonus.summariesByTankId !== "object") {
    state.dailyBonus.summariesByTankId = {};
  }
  state.dailyBonus.summariesByTankId[summary.tankId] = summary;
  state.dailyBonus.lastQualifiedDayKey = summary.dayKey;
  state.dailyBonus.lastEvaluatedDayKey = summary.dayKey;
  if (!Array.isArray(state.dailyBonus.recapHistory)) {
    state.dailyBonus.recapHistory = [];
  }
  const existingIndex = state.dailyBonus.recapHistory.findIndex((entry) => entry.tankId === summary.tankId && entry.dayKey === summary.dayKey);
  if (existingIndex >= 0) {
    state.dailyBonus.recapHistory.splice(existingIndex, 1);
  }
  state.dailyBonus.recapHistory.unshift(summary);
  state.dailyBonus.recapHistory = state.dailyBonus.recapHistory.slice(0, DAILY_RECAP_HISTORY_LIMIT);
  syncActiveDailyBonusState();
  return true;
}

function maybeGenerateDailyRecapForTank(tank, now = Date.now(), options = {}) {
  if (!tank || !state?.dailyBonus) {
    return false;
  }
  if (!state.dailyBonus.lastEvaluatedByTankId || typeof state.dailyBonus.lastEvaluatedByTankId !== "object") {
    state.dailyBonus.lastEvaluatedByTankId = {};
  }
  const force = options.force === true;
  const dayKey = force ? getLocalDayKey(now) : getPreviousLocalDayKey(now);
  const tankId = tank.id || "";
  const claimedKey = `${tankId}:${dayKey}`;
  if (!force && state.dailyBonus.lastEvaluatedByTankId[tankId] === dayKey) {
    syncActiveDailyBonusState();
    return false;
  }
  if (!force && state.dailyBonus.claimedByTankDay?.[claimedKey]) {
    state.dailyBonus.lastEvaluatedByTankId[tankId] = dayKey;
    syncActiveDailyBonusState();
    return false;
  }
  if (!force && getLocalDayKey(now) === getLocalDayKey(Number(tank.lastSimulatedAt) || now)) {
    syncActiveDailyBonusState();
    return false;
  }
  const summary = buildDailyRecapSummary(tank, dayKey, now, { force });
  state.dailyBonus.lastEvaluatedByTankId[tankId] = dayKey;
  if (!summary) {
    syncActiveDailyBonusState();
    return true;
  }
  return storeDailyRecapSummary(summary);
}

function getTankCleanlinessPercentForMilestones(tank = getCurrentTank(), now = Date.now()) {
  if (!tank) {
    return 0;
  }

  const activeTank = getCurrentTank();
  if (activeTank?.id && tank.id === activeTank.id) {
    return Math.max(0, Math.round((1 - getTankDirtiness(now)) * 100));
  }

  const fishList = (Array.isArray(tank.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
  const deadFishList = (Array.isArray(tank.fish) ? tank.fish : []).filter((fish) => fish && isFishDead(fish) && !isFishBeingConsumedByPiranhas(fish, now));
  const typeMeta = getTankTypeMeta(tank.tankTypeId);
  const baseCleanDays = tankSupportsFilters(tank)
    ? BASE_TANK_DIRTY_DAYS
    : Math.max(1.2, Number(typeMeta.baseCleanDays) || FILTERLESS_BASE_TANK_DIRTY_DAYS);
  const filter = tankSupportsFilters(tank)
    ? runtime.filterMap.get(tank.selectedFilterAsset || getDefaultFilterKey())
    : null;
  const cleanDays = filter
    ? Math.max(BASE_TANK_DIRTY_DAYS, Number(filter.cleanDays) || BASE_TANK_DIRTY_DAYS)
    : baseCleanDays;
  const duration = cleanDays * DAY_MS / Math.max(1, getTankFishDirtinessMultiplier(fishList, deadFishList));
  const dirtiness = clamp((now - (Number(tank.lastCleanedAt) || now)) / Math.max(1, duration), 0, 1);
  return Math.max(0, Math.round((1 - dirtiness) * 100));
}

function getMilestoneHistoryWithLatest(latestSummary = null) {
  const history = Array.isArray(state?.dailyBonus?.recapHistory) ? state.dailyBonus.recapHistory : [];
  if (!latestSummary?.tankId || !latestSummary?.dayKey) {
    return history;
  }

  const alreadyIncluded = history.some((summary) => (
    summary?.tankId === latestSummary.tankId
    && summary?.dayKey === latestSummary.dayKey
  ));
  return alreadyIncluded ? history : [latestSummary, ...history];
}

function getRecapRows(summary) {
  return Array.isArray(summary?.rows) ? summary.rows : [];
}

function getRecapCleanPercent(summary, now = Date.now()) {
  if (Number.isFinite(Number(summary?.cleanPercent))) {
    return clamp(Math.round(Number(summary.cleanPercent)), 0, 100);
  }

  const tank = getAllTanks(state).find((entry) => entry?.id === summary?.tankId);
  return tank ? getTankCleanlinessPercentForMilestones(tank, now) : 0;
}

function recapHasNegativeEvents(summary) {
  if (typeof summary?.hasNegativeEvents === "boolean") {
    return summary.hasNegativeEvents;
  }
  return getRecapRows(summary).some((row) => Number(row?.score) < 0);
}

function recapHasAttackOrDeath(summary) {
  if (typeof summary?.hasAttackOrDeath === "boolean") {
    return summary.hasAttackOrDeath;
  }
  return getRecapRows(summary).some((row) => /attack|bit|bite|died|death|devoured/i.test(row?.text || ""));
}

function recapHasGlassTapStress(summary) {
  if (typeof summary?.hasGlassTapStress === "boolean") {
    return summary.hasGlassTapStress;
  }
  return getRecapRows(summary).some((row) => row?.type === "glass_tap_stress" || /glass tapping|startled/i.test(row?.text || ""));
}

function recapHasSparklingComfort(summary) {
  if (typeof summary?.hasSparklingComfort === "boolean") {
    return summary.hasSparklingComfort;
  }
  return getRecapRows(summary).some((row) => /sparkling comfort/i.test(row?.text || ""));
}

function countRecentRecapStreak(history, predicate) {
  let streak = 0;
  for (const summary of Array.isArray(history) ? history : []) {
    if (!predicate(summary)) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function countEventOccurrences(events, pattern) {
  return (Array.isArray(events) ? events : []).reduce((total, event) => {
    const text = String(event?.text || "");
    if (!pattern.test(text)) {
      return total;
    }
    const count = Number(text.match(/^\s*(\d+)/)?.[1]);
    return total + Math.max(1, Number.isFinite(count) ? Math.floor(count) : 1);
  }, 0);
}

function getLatestEventTime(events, pattern) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => pattern.test(String(event?.text || "")))
    .reduce((latest, event) => Math.max(latest, Number(event?.time) || 0), 0);
}

function getMilestoneTankFishEntries() {
  return getAllTanks(state).flatMap((tank) => (
    Array.isArray(tank?.fish)
      ? tank.fish.map((fish) => ({ tank, fish })).filter((entry) => entry.fish)
      : []
  ));
}

function getCurrentMetNeedsCount(now = Date.now()) {
  return getMilestoneTankFishEntries().reduce((total, { tank, fish }) => {
    if (isFishDead(fish)) {
      return total;
    }
    return total + getFishNeedsStatus(fish, tank, now).filter((need) => need.met).length;
  }, 0);
}

function hasAllLivingFishNeedsMet(now = Date.now()) {
  const livingEntries = getMilestoneTankFishEntries().filter(({ fish }) => !isFishDead(fish));
  return livingEntries.length > 0 && livingEntries.every(({ tank, fish }) => {
    const needs = getFishNeedsStatus(fish, tank, now);
    return needs.length > 0 && needs.every((need) => need.met);
  });
}

function isCommunityMilestoneFish(fish) {
  return Boolean(fish && !isPiranhaSpecies(fish) && !isUndeadFish(fish) && fish.speciesId !== "pufferfish");
}

function hasCommunityMilestoneTank(recentAverageComfort = 0) {
  return getAllTanks(state).some((tank) => {
    const livingFish = (Array.isArray(tank?.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
    return livingFish.filter(isCommunityMilestoneFish).length >= 5
      && getTankSpaceLoad(tank) <= TANK_SPACE_FULL_LOAD
      && Number(recentAverageComfort) >= 70;
  });
}

function getHealthyTankCount() {
  return getAllTanks(state).filter((tank) => (
    Array.isArray(tank?.fish)
    && tank.fish.some((fish) => fish && !isFishDead(fish) && getFishHealthRatio(fish) >= 1)
  )).length;
}

function getMilestoneStats(latestSummary = null, now = Date.now()) {
  const history = getMilestoneHistoryWithLatest(latestSummary);
  const referenceSummary = latestSummary || history[0] || null;
  const recent = history.slice(0, 5);
  const goodRecaps = history.filter((summary) => Number(summary.score) >= 5 && Number(summary.averageComfort) >= 70).length;
  const recentAverageComfort = recent.length
    ? Math.round(recent.reduce((total, summary) => total + (Number(summary.averageComfort) || 0), 0) / recent.length)
    : (Number(referenceSummary?.averageComfort) || 0);
  const livingFish = getAllTankFish(state).filter((fish) => fish && !isFishDead(fish));
  const oldestLivingFishAgeMs = livingFish.reduce((oldest, fish) => Math.max(oldest, now - (Number(fish.acquiredAt) || now)), 0);
  const allEvents = getAllTanks(state).flatMap((tank) => Array.isArray(tank.events) ? tank.events : []);
  const latestDeath = allEvents
    .filter((event) => / died|dead fish|could not survive/i.test(event?.text || ""))
    .reduce((latest, event) => Math.max(latest, Number(event.time) || 0), 0);
  const stewardshipStartCandidates = [
    ...getAllTanks(state).map((tank) => Number(tank?.createdAt) || Number(tank?.lastSimulatedAt) || now),
    ...livingFish.map((fish) => Number(fish.acquiredAt) || now)
  ];
  const stewardshipStart = Math.min(...stewardshipStartCandidates.filter((value) => Number.isFinite(value) && value > 0), now);
  const daysSinceLastDeath = latestDeath > 0
    ? Math.floor((now - latestDeath) / DAY_MS)
    : Math.floor((now - stewardshipStart) / DAY_MS);
  const cleanRecapStreak90 = countRecentRecapStreak(history, (summary) => getRecapCleanPercent(summary, now) >= 90);
  const cleanRecapCount95 = history.filter((summary) => getRecapCleanPercent(summary, now) >= 95).length;
  const allMealsSatisfiedStreak = countRecentRecapStreak(history, (summary) => summary?.allMealsSatisfied === true);
  const comfort80Streak = countRecentRecapStreak(history, (summary) => Number(summary?.averageComfort) >= 80);
  const comfort90Streak = countRecentRecapStreak(history, (summary) => Number(summary?.averageComfort) >= 90);
  const noAttackDeathRecapStreak = countRecentRecapStreak(history, (summary) => Number(summary?.fishCount) > 0 && !recapHasAttackOrDeath(summary));
  const noGlassTapStressStreak = countRecentRecapStreak(history, (summary) => Number(summary?.fishCount) > 0 && !recapHasGlassTapStress(summary));
  const sparklingComfortEvents = history.filter((summary) => recapHasSparklingComfort(summary)).length;
  const latestNoDramaDay = Boolean(referenceSummary && Number(referenceSummary.fishCount) > 0 && !recapHasNegativeEvents(referenceSummary));
  const hasPerfectDay = history.some((summary) => Number(summary?.score) >= 8 && recapHasSparklingComfort(summary));
  const decorPlacedEventCount = countEventOccurrences(allEvents, /^Placed .+ in the aquarium\./i);
  const gravelCoinFinds = countEventOccurrences(allEvents, /found a coin in the gravel/i);
  const hatchedFishEvents = countEventOccurrences(allEvents, /has just hatched/i);
  const healingEvents = countEventOccurrences(allEvents, /recovered half a heart|medicine .* used|was used in|health reset restored/i);
  const lastHealingAt = getLatestEventTime(allEvents, /recovered half a heart|medicine .* used|was used in|health reset restored/i);
  const deathAfterLastHealing = lastHealingAt > 0 && allEvents.some((event) => (
    / died|dead fish|could not survive/i.test(event?.text || "")
    && (Number(event?.time) || 0) > lastHealingAt
  ));
  const grownBabyFishCount = [
    ...getAllTankFish(state),
    ...(Array.isArray(state.storedFish) ? state.storedFish : [])
  ].filter((fish) => (
    fish
    && !isFishDead(fish)
    && Number.isFinite(Number(fish.growthEndsAt))
    && Number(fish.growthEndsAt) <= now
  )).length;
  const noOvercrowdedTanks = getAllTanks(state).every((tank) => getTankSpaceLoad(tank) <= TANK_SPACE_FULL_LOAD);
  return {
    latestScore: Number(referenceSummary?.score) || 0,
    goodRecaps,
    recentAverageComfort,
    oldestLivingFishAgeMs,
    daysSinceLastDeath,
    hasSparklingFish: livingFish.some((fish) => getFishComfort(fish, now).value >= 0.95),
    hasSaltwaterFish: livingFish.some((fish) => getSpeciesWaterType(fish) === "saltwater"),
    hasSpookyKeeperPath: Number(state?.lifetimeDeaths) > 0
      || allEvents.some((event) => /zombie|skeleton|corpse|dead fish/i.test(event?.text || ""))
      || (state?.unlockedFishSpecies || []).some((speciesId) => speciesId === "zombie-fish" || speciesId === "skeleton-fish"),
    cleanRecapStreak90,
    cleanRecapCount95,
    allMealsSatisfiedStreak,
    comfort80Streak,
    comfort90Streak,
    sparklingComfortEvents,
    hasPerfectDay,
    latestNoDramaDay,
    noAttackDeathRecapStreak,
    noGlassTapStressStreak,
    decorPlacedCount: Math.max(getAllPlacedDecor(state).length, decorPlacedEventCount),
    metNeedsCount: getCurrentMetNeedsCount(now),
    hasAllLivingNeedsMet: hasAllLivingFishNeedsMet(now),
    hasCommunityTank: hasCommunityMilestoneTank(recentAverageComfort),
    livingFishCount: livingFish.length,
    noOvercrowdedTanks,
    hatchedFishEvents,
    grownBabyFishCount,
    gravelCoinFinds,
    healingEvents,
    hasRescueKeeper: lastHealingAt > 0 && now - lastHealingAt >= 3 * DAY_MS && !deathAfterLastHealing,
    healthyTankCount: getHealthyTankCount()
  };
}

function applyProgressMilestones(latestSummary = null, now = Date.now()) {
  if (!state?.dailyBonus) {
    return [];
  }
  if (!state.dailyBonus.milestones || typeof state.dailyBonus.milestones !== "object") {
    state.dailyBonus.milestones = {};
  }
  const stats = getMilestoneStats(latestSummary, now);
  const unlocked = [];
  for (const milestone of PROGRESSION_MILESTONES) {
    if (state.dailyBonus.milestones[milestone.id] || !milestone.isMet(stats)) {
      continue;
    }
    state.dailyBonus.milestones[milestone.id] = true;
    state.coins += milestone.reward;
    const speciesUnlocked = [];
    for (const speciesId of milestone.unlocks) {
      if (unlockFishSpecies(speciesId, now, `${runtime.fishMap.get(speciesId)?.name || titleFromFile(speciesId)} unlocked from ${milestone.label}.`)) {
        speciesUnlocked.push(speciesId);
      }
    }
    const decorUnlocked = [];
    for (const decorKey of milestone.decorUnlocks || []) {
      if (unlockDecorKey(decorKey, now, `${runtime.decorMap.get(decorKey)?.name || titleFromFile(decorKey)} unlocked from ${milestone.label}.`)) {
        decorUnlocked.push(decorKey);
      }
    }
    pushEvent(`${milestone.label} milestone reached. Earned ${milestone.reward} ${pluralize("coin", milestone.reward)}.`, now);
    unlocked.push({ ...milestone, speciesUnlocked, decorUnlocked });
  }
  return unlocked;
}

function triggerDebugDailyRecap(now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank) {
    showToast("No tank selected.");
    return false;
  }
  const changed = maybeGenerateDailyRecapForTank(tank, now, { force: true });
  syncActiveDailyBonusState();
  saveState();
  renderUi(now);
  openUtilityOverlay("daily-bonus");
  showToast(changed ? "Debug daily recap generated." : "Debug daily recap refreshed.");
  return true;
}

function saveState() {
  if (!state) {
    return;
  }

  const customDecorPruned = pruneCustomDecorAssets(state);
  const customFishPruned = pruneCustomFishAssets(state);
  if (customDecorPruned) {
    syncRuntimeCustomDecorAssetsFromState(state);
  }
  if (customFishPruned) {
    syncRuntimeCustomFishAssetsFromState(state);
  }

  try {
    if (isDesktopAppRuntime()) {
      writeDesktopSaveState(state);
      scheduleDesktopPortableBackup();
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    runtime.gravelStateDirty = false;
    runtime.tankStateDirty = false;
    runtime.saveStateWarningShown = false;
    scheduleCustomImageStorageCleanup();
  } catch (error) {
    console.error(error);
    if (!runtime.saveStateWarningShown) {
      runtime.saveStateWarningShown = true;
      showToast(isDesktopAppRuntime()
        ? "Could not write desktop save. Check that bubbleborough_data is writable."
        : "Save storage is full. Try smaller custom images or clearing old progress.");
    }
  }
}
