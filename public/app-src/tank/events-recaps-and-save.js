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
    progressionTime: time,
    text
  };
  if (Number.isFinite(score)) {
    eventEntry.score = clamp(Math.round(score), -1, 1);
  }
  if (typeof meta?.type === "string" && meta.type.trim()) {
    eventEntry.type = meta.type.trim();
  }
  if (["positive", "negative", "neutral"].includes(String(meta?.tone || ""))) {
    eventEntry.tone = String(meta.tone);
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
  if (meta?.recapEligible === false || (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    eventEntry.recapEligible = false;
  }
  if (meta?.progressionEligible === false || (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    eventEntry.progressionEligible = false;
  }

  const events = Array.isArray(targetTank.events) ? targetTank.events : [];
  events.unshift(eventEntry);
  targetTank.events = events.slice(0, MAX_TANK_EVENT_HISTORY);
  if (!Array.isArray(state.boroughEvents)) {
    state.boroughEvents = [];
  }
  state.boroughEvents.unshift({
    ...eventEntry,
    tankId: targetTank.id || "",
    tankName: getTankLabel(targetTank)
  });
  state.boroughEvents = state.boroughEvents.slice(0, MAX_BOROUGH_EVENT_HISTORY);
  publishBoroughActivityEvent(eventEntry, targetTank);
  return eventEntry;
}

function recordGameEvent(event, tank = getCurrentTank()) {
  if (!event) {
    return null;
  }
  if (typeof event === "string") {
    return pushEvent(event, Date.now(), tank);
  }
  const text = String(event.text || event.message || "").trim();
  if (!text) {
    return null;
  }
  return pushEvent(text, Number.isFinite(Number(event.time)) ? Number(event.time) : Date.now(), event.tank || tank, {
    ...event,
    score: event.score ?? event.recapScore
  });
}

function playGameActionSound(sound) {
  if (typeof sound === "function") {
    sound();
    return true;
  }
  if (sound === "purchase") {
    playPurchaseSoundEffect();
    return true;
  }
  if (sound === "coin") {
    playCoinSoundEffect();
    return true;
  }
  if (sound === "button") {
    playRegularButtonSoundEffect();
    return true;
  }
  return false;
}

function completeGameAction(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const events = Array.isArray(options.events) ? options.events : (options.event ? [options.event] : []);
  const recordedEvents = events.map((event) => recordGameEvent(
    typeof event === "string" ? { text: event, time: now } : { ...event, time: event?.time ?? now },
    options.tank
  )).filter(Boolean);
  if (options.save !== false) {
    saveState();
  }
  playGameActionSound(options.sound);
  if (options.render !== false) {
    renderUi(now, { full: options.render === "partial" ? false : options.full !== false });
  }
  if (typeof options.toast === "string" && options.toast) {
    showToast(options.toast, options.toastOptions || {});
  }
  return {
    ok: true,
    now,
    events: recordedEvents
  };
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
  return summary?.dayKey ? `${BOROUGH_DAILY_RECAP_ID}:${summary.dayKey}` : "";
}

function isDailyBonusSummaryClaimed(summary, tank = getCurrentTank()) {
  const claimedKey = getDailyBonusClaimKey(summary, tank);
  return Boolean(claimedKey && state?.dailyBonus?.claimedByTankDay?.[claimedKey]);
}

function getActiveDailyBonusSummary(tank = getCurrentTank()) {
  if (!state?.dailyBonus) {
    return null;
  }
  const summary = state.dailyBonus.summariesByTankId?.[BOROUGH_DAILY_RECAP_ID]
    || state.dailyBonus.summary
    || null;
  return summary && !isDailyBonusSummaryClaimed(summary, tank) ? summary : null;
}

function grantDailyRecapRewardAutomatically(summary, now = Date.now()) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return false;
  if (!state?.dailyBonus || !summary?.dayKey) {
    return false;
  }
  const claimedKey = getDailyBonusClaimKey(summary);
  if (claimedKey && state.dailyBonus.claimedByTankDay?.[claimedKey]) {
    return false;
  }

  // Daily Recaps are care/progression records, not a currency payout.
  // Keep the historical `reward` field normalized to zero for save compatibility.
  summary.reward = 0;
  if (!state.dailyBonus.claimedByTankDay || typeof state.dailyBonus.claimedByTankDay !== "object") {
    state.dailyBonus.claimedByTankDay = {};
  }
  if (claimedKey) {
    state.dailyBonus.claimedByTankDay[claimedKey] = true;
  }
  state.dailyBonus.lastClaimedDayKey = summary.dayKey || state.dailyBonus.lastQualifiedDayKey || null;

  const score = Math.round(Number(summary.score) || 0);
  pushEvent(`Daily recap completed. Score ${score > 0 ? "+" : ""}${score} recorded.`, now, getCurrentTank(), {
    type: "daily_recap",
    tone: score > 0 ? "positive" : score < 0 ? "negative" : "neutral",
    recapEligible: false
  });
  return true;
}

function syncActiveDailyBonusState() {
  if (!state?.dailyBonus) {
    return;
  }
  const pendingSummary = state.dailyBonus.summariesByTankId?.[BOROUGH_DAILY_RECAP_ID]
    || state.dailyBonus.summary
    || null;
  if (pendingSummary && !isDailyBonusSummaryClaimed(pendingSummary)) {
    grantDailyRecapRewardAutomatically(pendingSummary, Number(pendingSummary.generatedAt) || Date.now());
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
  if (event.tone === "positive" || event.tone === "negative") {
    return { text: event.text, score: event.tone === "positive" ? 1 : -1, type: event.type || "event", time: event.time };
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
  const reward = 0;
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

function isFishSpeciesCareProgressionEligible(species) {
  if (!species) return false;

  const speciesId = String(species.id || "").trim();
  const type = String(species.type || "").trim().toLowerCase();
  const behavior = String(species.behavior || "").trim().toLowerCase();

  // Care Levels / mastery belong to ordinary BubbleBodega fish, including
  // authored natural and genetics-enhanced species. Products with their own
  // specimen, mutation, upload, cleanup, or pose/layer mechanics keep those
  // existing systems instead of being folded into cosmetic progression.
  if (
    species.cleanupAnimal === true
    || species.customAsset === true
    || species.customUploadProduct === true
    || species.davyMutation === true
    || species.proteusExclusive === true
    || species.proteusZombie === true
  ) return false;

  if (["shrimp", "snail"].includes(type) || ["shrimp", "snail", "sucker"].includes(behavior)) return false;
  if (typeof isCustomFishShopKey === "function" && isCustomFishShopKey(speciesId)) return false;
  if (typeof isCustomFishAssetKey === "function" && isCustomFishAssetKey(speciesId)) return false;
  if (typeof isDavyMutationSpecies === "function" && isDavyMutationSpecies(species)) return false;
  if (typeof isProteusZombieFish === "function" && isProteusZombieFish(species)) return false;

  return true;
}

function isFishCareProgressionEligible(fish, species = getSpeciesForFish(fish)) {
  if (!fish || !species) return false;
  if (
    fish.cleanupAnimal === true
    || fish.customAsset === true
    || fish.customUploadProduct === true
    || fish.davyMutation === true
    || fish.proteusExclusive === true
    || fish.proteusZombie === true
  ) return false;
  return isFishSpeciesCareProgressionEligible(species);
}

function getFishBaseAppearanceVariantKey(species) {
  if (!species || typeof species.asset !== "string" || !species.asset.trim()) return "";
  return typeof getFishAppearanceVariantKey === "function"
    ? getFishAppearanceVariantKey(species.asset)
    : species.asset.split(/[?#]/)[0].split("/").pop();
}

function ensureFishSpeciesBaseVariantUnlocked(species, record) {
  if (!record || !isFishSpeciesCareProgressionEligible(species)) return record;
  const baseKey = getFishBaseAppearanceVariantKey(species);
  if (!baseKey) return record;
  const existing = Array.isArray(record.unlockedVariantKeys) ? record.unlockedVariantKeys : [];
  if (!existing.includes(baseKey)) {
    record.unlockedVariantKeys = [baseKey, ...existing];
  }
  return record;
}

function normalizeFishSpeciesMasteryBaseVariants() {
  if (!state || typeof runtime === "undefined" || !runtime?.fishMap?.values) return false;
  let changed = false;
  for (const species of runtime.fishMap.values()) {
    if (!isFishSpeciesCareProgressionEligible(species)) continue;
    const speciesAvailable = typeof isFishSpeciesProgressUnlocked === "function"
      ? isFishSpeciesProgressUnlocked(species)
      : (!species.unlockRequirement || (state?.unlockedFishSpecies || []).includes(species.id));
    if (!speciesAvailable) continue;
    const speciesId = String(species.id || "").trim();
    if (!speciesId) continue;
    const existed = Boolean(state?.fishSpeciesMastery?.[speciesId]);
    const before = existed
      ? JSON.stringify(state.fishSpeciesMastery[speciesId]?.unlockedVariantKeys || [])
      : "";
    const record = getFishSpeciesMasteryRecord(speciesId, { species });
    const after = JSON.stringify(record?.unlockedVariantKeys || []);
    if (!existed || before !== after) changed = true;
  }
  return changed;
}

function normalizeOwnedFishAppearanceUnlocks() {
  if (!state || typeof runtime === "undefined" || !runtime?.fishMap?.get) return false;
  const tankFish = typeof getAllTankFish === "function" ? getAllTankFish(state) : [];
  const storedFish = Array.isArray(state.storedFish) ? state.storedFish : [];
  const ownedFish = [...tankFish, ...storedFish];
  let changed = false;

  for (const fish of ownedFish) {
    const species = typeof getSpeciesForFish === "function"
      ? getSpeciesForFish(fish)
      : runtime.fishMap.get(String(fish?.speciesId || ""));
    if (!species || !isFishCareProgressionEligible(fish, species)) continue;

    const canonical = typeof resolveCanonicalFishAppearanceSelection === "function"
      ? resolveCanonicalFishAppearanceSelection(fish, species)
      : null;
    if (!canonical?.appearanceVariantKey) continue;

    if (fish.appearanceVariant !== canonical.appearanceVariant) {
      fish.appearanceVariant = canonical.appearanceVariant;
      changed = true;
    }
    if (fish.appearanceVariantKey !== canonical.appearanceVariantKey) {
      fish.appearanceVariantKey = canonical.appearanceVariantKey;
      changed = true;
    }
    if (fish.appearanceAssetPath !== canonical.appearanceAssetPath) {
      fish.appearanceAssetPath = canonical.appearanceAssetPath;
      changed = true;
    }

    const record = getFishSpeciesMasteryRecord(species.id, { species });
    if (!record) continue;
    const canonicalKey = typeof getFishAppearanceVariantKey === "function"
      ? getFishAppearanceVariantKey(canonical.appearanceVariantKey)
      : canonical.appearanceVariantKey;
    if (!canonicalKey) continue;
    if (!record.unlockedVariantKeys.includes(canonicalKey)) {
      record.unlockedVariantKeys.push(canonicalKey);
      changed = true;
    }
  }

  return changed;
}

function getFishSpeciesMasteryRecord(speciesId, options = {}) {
  const key = String(speciesId || "").trim();
  if (!key || !state) return null;
  if (!state.fishSpeciesMastery || typeof state.fishSpeciesMastery !== "object" || Array.isArray(state.fishSpeciesMastery)) {
    if (options.create === false) return null;
    state.fishSpeciesMastery = {};
  }
  let record = state.fishSpeciesMastery[key];
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    if (options.create === false) return null;
    record = {
      highestLevel: FISH_CARE_LEVEL_MIN,
      unlockedVariantKeys: [],
      masteredAt: 0,
      totalCareLevelUps: 0,
      lastVariantUnlockedAt: 0,
      collectionCompletedAt: 0
    };
    state.fishSpeciesMastery[key] = record;
  } else {
    record.highestLevel = clamp(Math.floor(Number(record.highestLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
    record.unlockedVariantKeys = [...new Set((Array.isArray(record.unlockedVariantKeys) ? record.unlockedVariantKeys : [])
      .map((keyValue) => {
        if (typeof keyValue !== "string" || !keyValue.trim()) return "";
        return typeof getFishAppearanceVariantKey === "function"
          ? getFishAppearanceVariantKey(keyValue)
          : keyValue.trim();
      })
      .filter(Boolean))];
    record.masteredAt = Math.max(0, Number(record.masteredAt) || 0);
    record.totalCareLevelUps = Math.max(0, Math.floor(Number(record.totalCareLevelUps) || 0));
    record.lastVariantUnlockedAt = Math.max(0, Number(record.lastVariantUnlockedAt) || 0);
    record.collectionCompletedAt = Math.max(0, Number(record.collectionCompletedAt) || 0);
  }
  const species = options.species
    || (typeof runtime !== "undefined" && runtime?.fishMap?.get ? runtime.fishMap.get(key) : null);
  if (typeof ensureFishSpeciesBaseVariantUnlocked === "function") {
    ensureFishSpeciesBaseVariantUnlocked(species, record);
  }
  return record;
}

function getFishLockedAppearanceVariantPool(species, record = null) {
  if (!species || !isFishSpeciesCareProgressionEligible(species)) return [];
  const mastery = record || getFishSpeciesMasteryRecord(species.id, { species });
  if (!mastery) return [];
  const baseKey = getFishBaseAppearanceVariantKey(species);
  const unlocked = new Set(Array.isArray(mastery.unlockedVariantKeys) ? mastery.unlockedVariantKeys : []);
  const seen = new Set();
  const allVariants = typeof getFishAssetVariants === "function" ? getFishAssetVariants(species) : [];
  const variants = typeof getFishProgressionAppearanceVariants === "function"
    ? getFishProgressionAppearanceVariants(species)
    : allVariants;
  const pool = [];

  variants.forEach((path) => {
    const index = Math.max(0, allVariants.indexOf(path));
    const key = typeof getFishAppearanceVariantKey === "function"
      ? getFishAppearanceVariantKey(path)
      : String(path || "").split(/[?#]/)[0].split("/").pop();
    if (!key || key === baseKey || unlocked.has(key) || seen.has(key)) return;
    seen.add(key);
    const label = String(species?.variantLabels?.[index] || "").trim()
      || (typeof getFishVariantLabelFromTileName === "function" ? getFishVariantLabelFromTileName(path, index) : "")
      || `Variant ${index + 1}`;
    pool.push({ key, path, index, label });
  });

  return pool;
}

function getFishVariantUnlockPoolStats(species, record = null) {
  const pool = getFishLockedAppearanceVariantPool(species, record);
  const lockedCount = pool.length;
  const chancePerVariant = lockedCount > 0 ? 1 / lockedCount : 0;
  return {
    lockedCount,
    chancePerVariant,
    percentPerVariant: chancePerVariant * 100
  };
}

function selectUniformFishAppearanceVariantFromLockedPool(pool, randomValue = Math.random()) {
  if (!Array.isArray(pool) || !pool.length) return null;
  const roll = Number(randomValue);
  const normalizedRoll = Number.isFinite(roll) ? clamp(roll, 0, 0.999999999999) : 0;
  return pool[Math.floor(normalizedRoll * pool.length)] || null;
}

function recordProgressionEvent(entry) {
  if (!state || !entry || typeof entry !== "object") return null;
  if (!Array.isArray(state.progressionHistory)) state.progressionHistory = [];
  const timestamp = Math.max(1, Number(entry.timestamp ?? entry.createdAt) || Date.now());
  const type = String(entry.type || "progression").trim().slice(0, 60) || "progression";
  const id = String(entry.id || (typeof createId === "function" ? createId("progression") : `progression-${type}-${timestamp}`));
  const stored = {
    ...entry,
    id,
    type,
    timestamp
  };
  state.progressionHistory.unshift(stored);
  state.progressionHistory = state.progressionHistory.slice(0, typeof PROGRESSION_HISTORY_LIMIT === "number" ? PROGRESSION_HISTORY_LIMIT : 240);
  return stored;
}

function getFishVariantUnlockNotificationCopy(unlockEvent) {
  const speciesName = String(unlockEvent?.speciesName || "Fish").trim() || "Fish";
  const variantLabel = String(unlockEvent?.variantLabel || "New Variant").trim() || "New Variant";
  return {
    title: `New ${speciesName} Variant Unlocked!`,
    detail: `${variantLabel} is now available in BubbleBodega.`
  };
}

function getFishVariantCollectionCompletionNotificationCopy(completionEvent) {
  const speciesName = String(completionEvent?.speciesName || "Fish").trim() || "Fish";
  return {
    title: `${speciesName} Variant Collection Complete!`,
    detail: `All ${speciesName} appearance variants have been discovered.`
  };
}

function recordFishLevelUpProgressionEvents(fish, species, previousLevel, newLevel, now = Date.now(), dayKey = "") {
  const crossedLevels = getFishCrossedCareLevels(previousLevel, newLevel);
  if (!fish || !species || !crossedLevels.length) return [];
  return crossedLevels.map((careLevel) => recordProgressionEvent({
    id: `fish-level-up-${fish.id || "fish"}-${careLevel}-${Math.max(1, Number(now) || Date.now())}`,
    type: "fish_level_up",
    timestamp: Math.max(1, Number(now) || Date.now()),
    dayKey: String(dayKey || (typeof getLocalDayKey === "function" ? getLocalDayKey(now) : "")),
    fishId: fish.id || "",
    fishName: fish.name || "Fish",
    speciesId: species.id || fish.speciesId || "",
    speciesName: species.name || species.id || "Fish",
    previousCareLevel: Math.max(FISH_CARE_LEVEL_MIN, careLevel - 1),
    careLevel,
    levelsGained: 1,
    title: `${fish.name || "Fish"} reached Level ${careLevel}!`,
    detail: `${species.name || species.id || "Fish"} care progression advanced to Lv. ${careLevel}.`
  })).filter(Boolean);
}

function recordFishSpeciesMasteryProgressionEvents(fish, species, masteryResult, now = Date.now(), dayKey = "") {
  const previousLevel = Math.max(FISH_CARE_LEVEL_MIN, Math.floor(Number(masteryResult?.previousHighestLevel) || FISH_CARE_LEVEL_MIN));
  const currentLevel = Math.max(previousLevel, Math.floor(Number(masteryResult?.record?.highestLevel) || previousLevel));
  if (!fish || !species || currentLevel <= previousLevel) return [];
  const events = [];
  for (let masteryLevel = previousLevel + 1; masteryLevel <= currentLevel; masteryLevel += 1) {
    const masteredNow = masteryLevel >= FISH_CARE_LEVEL_MAX && masteryResult?.record?.masteredAt > 0;
    const event = recordProgressionEvent({
      id: `species-mastery-${species.id || fish.speciesId || "species"}-${masteryLevel}-${Math.max(1, Number(now) || Date.now())}`,
      type: "species_mastery_increased",
      timestamp: Math.max(1, Number(now) || Date.now()),
      dayKey: String(dayKey || (typeof getLocalDayKey === "function" ? getLocalDayKey(now) : "")),
      fishId: fish.id || "",
      fishName: fish.name || "Fish",
      speciesId: species.id || fish.speciesId || "",
      speciesName: species.name || species.id || "Fish",
      previousMasteryLevel: masteryLevel - 1,
      masteryLevel,
      careLevel: Math.max(FISH_CARE_LEVEL_MIN, Math.floor(Number(fish.careLevel) || masteryLevel)),
      masteredNow,
      masteredAt: masteredNow ? Math.max(0, Number(masteryResult.record.masteredAt) || 0) : 0,
      title: `${species.name || species.id || "Fish"} Mastery reached Lv. ${masteryLevel}`,
      detail: masteredNow ? "Species Mastery complete." : `Species Mastery advanced to Lv. ${masteryLevel}.`
    });
    if (event) events.push(event);
  }
  return events;
}

function surfaceStandaloneFishProgressionNotification(title, detail, options = {}) {
  const tank = options.tank || (typeof getCurrentTank === "function" ? getCurrentTank() : null);
  const surfaced = typeof queueBoroughActivityNotification === "function"
    ? queueBoroughActivityNotification(title, detail, {
        force: true,
        time: Number.isFinite(Number(options.time)) ? Number(options.time) : Date.now(),
        signature: String(options.signature || `${title}|${detail}`),
        type: options.type || "fish_progression",
        tankId: tank?.id || "",
        fishId: options.fishId || "",
        durationMs: options.durationMs
      })
    : false;
  if (!surfaced && typeof showToast === "function") {
    showToast(`${title}${detail ? ` ${detail}` : ""}`, {
      force: true,
      durationMs: Math.max(2200, Number(options.durationMs) || 5200)
    });
  }
  return surfaced;
}

function recordFishVariantUnlockProgressionEvent(unlockEvent, tank = null, options = {}) {
  if (!unlockEvent || typeof unlockEvent !== "object") return null;
  const copy = getFishVariantUnlockNotificationCopy(unlockEvent);
  const stored = recordProgressionEvent({
    ...unlockEvent,
    type: "variant_unlocked",
    title: copy.title,
    detail: copy.detail
  });
  if (!stored) return null;

  if (typeof pushEvent === "function") {
    pushEvent(`${copy.title} ${copy.detail}`, stored.timestamp, tank || (typeof getCurrentTank === "function" ? getCurrentTank() : null), {
      type: "fish_variant_unlocked",
      tone: "positive",
      fishId: stored.fishId,
      recapEligible: false,
      detail: `${stored.speciesId}|${stored.variantKey}|level-${stored.careLevel}`
    });
  }
  if (options.notify !== false) {
    if (typeof surfaceStandaloneFishProgressionNotification === "function") {
      surfaceStandaloneFishProgressionNotification(copy.title, copy.detail, {
        tank,
        time: stored.timestamp,
        signature: `fish-variant:${stored.fishId}:${stored.speciesId}:${stored.variantKey}`,
        type: "fish_variant_unlocked",
        fishId: stored.fishId,
        durationMs: 5200
      });
    } else if (typeof showToast === "function") {
      showToast(`${copy.title} ${copy.detail}`, { force: true, durationMs: 5200 });
    }
  }
  return stored;
}

function recordFishVariantCollectionCompletionProgressionEvent(completionEvent, tank = null, options = {}) {
  if (!completionEvent || typeof completionEvent !== "object") return null;
  const copy = getFishVariantCollectionCompletionNotificationCopy(completionEvent);
  const stored = recordProgressionEvent({
    ...completionEvent,
    type: "variant_collection_completed",
    title: copy.title,
    detail: copy.detail
  });
  if (!stored) return null;

  if (typeof pushEvent === "function") {
    pushEvent(`${copy.title} ${copy.detail}`, stored.timestamp, tank || (typeof getCurrentTank === "function" ? getCurrentTank() : null), {
      type: "fish_variant_collection_completed",
      tone: "positive",
      fishId: stored.fishId,
      recapEligible: false,
      detail: `${stored.speciesId}|collection-complete`
    });
  }
  if (options.notify !== false) {
    if (typeof surfaceStandaloneFishProgressionNotification === "function") {
      surfaceStandaloneFishProgressionNotification(copy.title, copy.detail, {
        tank,
        time: stored.timestamp,
        signature: `fish-variant-collection:${stored.speciesId}`,
        type: "fish_variant_collection_completed",
        fishId: stored.fishId,
        durationMs: 6200
      });
    } else if (typeof showToast === "function") {
      showToast(`${copy.title} ${copy.detail}`, { force: true, durationMs: 6200 });
    }
  }
  return stored;
}

function surfaceFishCareLevelProgressionNotification(fish, species, levelResult, masteryResult, variantUnlocks = [], now = Date.now(), tank = null, dayKey = "") {
  const levelsGained = Math.max(0, Math.floor(Number(levelResult?.levelsGained) || 0));
  if (!fish || !species || levelsGained <= 0) return null;

  const previousLevel = Math.max(FISH_CARE_LEVEL_MIN, Math.floor(Number(levelResult?.oldLevel) || FISH_CARE_LEVEL_MIN));
  const newLevel = Math.max(previousLevel, Math.floor(Number(levelResult?.newLevel) || previousLevel));
  const fishName = String(fish.name || "Fish").trim() || "Fish";
  const speciesName = String(species.name || species.id || "Fish").trim() || "Fish";
  const unlocks = Array.isArray(variantUnlocks) ? variantUnlocks.filter(Boolean) : [];
  const variantLabels = unlocks.map((entry) => String(entry.variantLabel || "New Variant").trim()).filter(Boolean);
  const detailParts = [];

  if (levelsGained > 1) {
    detailParts.push(`Levels ${previousLevel + 1}-${newLevel} reached`);
  }
  if (variantLabels.length === 1) {
    detailParts.push(`New ${speciesName} Variant: ${variantLabels[0]}`);
  } else if (variantLabels.length > 1) {
    detailParts.push(`New ${speciesName} Variants: ${variantLabels.join(", ")}`);
  }
  if (masteryResult?.highestLevelIncreased === true) {
    const masteryLevel = Math.max(FISH_CARE_LEVEL_MIN, Math.floor(Number(masteryResult?.record?.highestLevel) || newLevel));
    detailParts.push(`${speciesName} Mastery reached Lv. ${masteryLevel}`);
  }
  if (unlocks.some((entry) => entry?.collectionCompleted === true)) {
    detailParts.push(`${speciesName} Variant Collection Complete!`);
  }
  if (!detailParts.length) {
    detailParts.push(`${speciesName} care progression advanced`);
  }

  const title = `${fishName} reached Level ${newLevel}!`;
  const detail = detailParts.join(" • ");
  const eventTime = Math.max(1, Number(now) || Date.now());
  const targetTank = tank || (typeof getCurrentTank === "function" ? getCurrentTank() : null);
  if (typeof pushEvent === "function") {
    pushEvent(`${title} ${detail}`, eventTime, targetTank, {
      type: "fish_care_level_up",
      tone: "positive",
      fishId: fish.id || "",
      recapEligible: false,
      detail: `${species.id || fish.speciesId || ""}|level-${newLevel}`
    });
  }
  surfaceStandaloneFishProgressionNotification(title, detail, {
    tank: targetTank,
    time: eventTime,
    signature: `fish-care-level:${fish.id || "fish"}:${newLevel}:${dayKey || ""}`,
    type: "fish_care_level_up",
    fishId: fish.id || "",
    durationMs: unlocks.some((entry) => entry?.collectionCompleted === true) ? 6200 : 5400
  });
  return { title, detail };
}

function unlockRandomFishAppearanceVariantForLevel(fish, species, careLevel, now = Date.now(), tank = null, options = {}) {
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) return null;
  if (!fish || !species || !isFishCareProgressionEligible(fish, species) || !isFishSpeciesCareProgressionEligible(species)) return null;
  const level = clamp(Math.floor(Number(careLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  if (level <= FISH_CARE_LEVEL_MIN) return null;

  const record = getFishSpeciesMasteryRecord(species.id, { species });
  const pool = getFishLockedAppearanceVariantPool(species, record);
  if (!pool.length) return null;

  const selected = selectUniformFishAppearanceVariantFromLockedPool(pool);
  if (!selected) return null;
  const chancePerVariant = 1 / pool.length;

  record.unlockedVariantKeys = [...new Set([...(Array.isArray(record.unlockedVariantKeys) ? record.unlockedVariantKeys : []), selected.key])];
  record.lastVariantUnlockedAt = Math.max(1, Number(now) || Date.now());
  const remainingLockedPool = getFishLockedAppearanceVariantPool(species, record);
  const collectionCompletedNow = remainingLockedPool.length === 0 && pool.length === 1 && record.collectionCompletedAt <= 0;
  if (collectionCompletedNow) record.collectionCompletedAt = record.lastVariantUnlockedAt;

  const unlockEvent = {
    timestamp: record.lastVariantUnlockedAt,
    dayKey: String(options?.dayKey || (typeof getLocalDayKey === "function" ? getLocalDayKey(record.lastVariantUnlockedAt) : "")),
    fishId: fish.id || "",
    fishName: fish.name || "Fish",
    speciesId: species.id || fish.speciesId || "",
    speciesName: species.name || species.id || "Fish",
    careLevel: level,
    variantKey: selected.key,
    variantLabel: selected.label,
    appearanceAssetPath: selected.path,
    lockedPoolSizeBeforeUnlock: pool.length,
    remainingLockedVariantCount: remainingLockedPool.length,
    unlockChanceBeforeUnlock: chancePerVariant,
    unlockChancePercentBeforeUnlock: chancePerVariant * 100,
    collectionCompleted: collectionCompletedNow,
    collectionCompletedAt: record.collectionCompletedAt
  };

  const progressionEvent = typeof recordFishVariantUnlockProgressionEvent === "function"
    ? recordFishVariantUnlockProgressionEvent(unlockEvent, tank, { notify: options.notify !== false })
    : null;
  let collectionCompletionEvent = null;
  if (collectionCompletedNow && typeof recordFishVariantCollectionCompletionProgressionEvent === "function") {
    collectionCompletionEvent = recordFishVariantCollectionCompletionProgressionEvent({
      timestamp: record.collectionCompletedAt,
      dayKey: unlockEvent.dayKey,
      fishId: unlockEvent.fishId,
      fishName: unlockEvent.fishName,
      speciesId: unlockEvent.speciesId,
      speciesName: unlockEvent.speciesName,
      careLevel: unlockEvent.careLevel,
      variantKey: unlockEvent.variantKey,
      variantLabel: unlockEvent.variantLabel,
      collectionCompletedAt: record.collectionCompletedAt
    }, tank, { notify: options.notify !== false });
  }

  return {
    ...(progressionEvent || unlockEvent),
    collectionCompleted: collectionCompletedNow,
    collectionCompletedAt: record.collectionCompletedAt,
    collectionCompletionEvent
  };
}

function getFishCrossedCareLevels(previousLevel, newLevel) {
  const fromLevel = clamp(Math.floor(Number(previousLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  const toLevel = clamp(Math.floor(Number(newLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  if (toLevel <= fromLevel) return [];

  // A multi-level jump is processed as the exact persisted transitions it crossed.
  // Keeping this list explicit prevents skipped or duplicate care levels and gives
  // variant discovery a fresh locked pool for every individual transition.
  return Array.from({ length: toLevel - fromLevel }, (_, index) => fromLevel + index + 1);
}

function unlockFishAppearanceVariantsForLevelIncrease(fish, species, previousLevel, newLevel, now = Date.now(), tank = null, options = {}) {
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) return [];
  if (!fish || !species || !isFishCareProgressionEligible(fish, species)) return [];
  const fromLevel = clamp(Math.floor(Number(previousLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  const processedThroughLevel = clamp(
    Math.floor(Number(fish.variantUnlockCareLevel) || fromLevel),
    FISH_CARE_LEVEL_MIN,
    FISH_CARE_LEVEL_MAX
  );
  const crossedLevels = getFishCrossedCareLevels(Math.max(fromLevel, processedThroughLevel), newLevel);
  if (!crossedLevels.length) return [];

  const unlocks = [];
  for (const reachedLevel of crossedLevels) {
    // unlockRandomFishAppearanceVariantForLevel() rebuilds the locked pool on
    // every call, so a 2 -> 4 jump resolves 2 -> 3 first, then 3 -> 4 against
    // the already-updated permanent unlock set. Mark every reached level as
    // consumed even when the species has no locked variants left.
    const unlocked = unlockRandomFishAppearanceVariantForLevel(fish, species, reachedLevel, now, tank, options);
    fish.variantUnlockCareLevel = reachedLevel;
    if (unlocked) unlocks.push(unlocked);
  }
  return unlocks;
}

function updateFishSpeciesMasteryForLevelIncrease(fish, previousLevel, newLevel, now = Date.now()) {
  const speciesId = String(fish?.speciesId || "").trim();
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    return { record: getFishSpeciesMasteryRecord(speciesId, { create: false }), highestLevelIncreased: false, masteredNow: false, levelsGained: 0 };
  }
  const crossedLevels = getFishCrossedCareLevels(previousLevel, newLevel);
  const toLevel = crossedLevels.length ? crossedLevels[crossedLevels.length - 1] : clamp(Math.floor(Number(newLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  if (!speciesId || !crossedLevels.length) {
    return { record: getFishSpeciesMasteryRecord(speciesId, { create: false }), highestLevelIncreased: false, masteredNow: false, levelsGained: 0 };
  }

  const record = getFishSpeciesMasteryRecord(speciesId);
  if (!record) return { record: null, highestLevelIncreased: false, masteredNow: false, levelsGained: 0 };
  const previousHighestLevel = record.highestLevel;
  const levelsGained = crossedLevels.length;
  record.totalCareLevelUps += levelsGained;
  if (toLevel > record.highestLevel) record.highestLevel = toLevel;
  const masteredNow = record.highestLevel >= FISH_CARE_LEVEL_MAX && record.masteredAt <= 0;
  if (masteredNow) record.masteredAt = Math.max(1, Number(now) || Date.now());
  return {
    record,
    previousHighestLevel,
    highestLevelIncreased: record.highestLevel > previousHighestLevel,
    masteredNow,
    levelsGained
  };
}

function getFishCareLevelThresholds(fishOrSpecies) {
  const lifespanDays = getFishFoundationLifespanDays(fishOrSpecies);
  const thresholds = { 1: 0 };
  let previousThreshold = 0;
  for (let level = FISH_CARE_LEVEL_MIN + 1; level <= FISH_CARE_LEVEL_MAX; level += 1) {
    const lifespanRatio = Number(FISH_CARE_LEVEL_LIFESPAN_RATIOS?.[level]) || 0;
    const lifespanBasedXp = Math.round(lifespanDays * lifespanRatio * FISH_DAILY_CARE_XP_CAP);
    const threshold = Math.max(previousThreshold + FISH_DAILY_CARE_XP_CAP, lifespanBasedXp);
    thresholds[level] = threshold;
    previousThreshold = threshold;
  }
  return thresholds;
}

function getFishCareLevelForXp(fishOrSpecies, careXp = 0) {
  const xp = Math.max(0, Math.floor(Number(careXp) || 0));
  const thresholds = getFishCareLevelThresholds(fishOrSpecies);
  let level = FISH_CARE_LEVEL_MIN;
  for (let candidate = FISH_CARE_LEVEL_MIN + 1; candidate <= FISH_CARE_LEVEL_MAX; candidate += 1) {
    if (xp < thresholds[candidate]) break;
    level = candidate;
  }
  return level;
}

function updateFishCareLevelFromXp(fish, species = getSpeciesForFish(fish)) {
  if (!fish || !species) {
    return { oldLevel: FISH_CARE_LEVEL_MIN, newLevel: FISH_CARE_LEVEL_MIN, levelsGained: 0, thresholds: null };
  }
  fish.careXp = Math.max(0, Math.floor(Number(fish.careXp) || 0));
  const oldLevel = clamp(Math.floor(Number(fish.careLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  const calculatedLevel = getFishCareLevelForXp(species, fish.careXp);
  const newLevel = Math.max(oldLevel, calculatedLevel);
  fish.careLevel = newLevel;
  return {
    oldLevel,
    newLevel,
    levelsGained: Math.max(0, newLevel - oldLevel),
    thresholds: getFishCareLevelThresholds(species)
  };
}

function getFishCareXpConditionsForRecapDay(fish, tank, dayKey, now = Date.now(), tankSummary = null) {
  const dayStart = getLocalDayStartTimestamp(dayKey);
  const mealSlots = typeof getDailyMealIndicatorSlotsForDayKey === "function"
    ? getDailyMealIndicatorSlotsForDayKey(dayKey)
    : (typeof getDailyMealIndicatorSlots === "function" ? getDailyMealIndicatorSlots(dayStart + 1) : []);
  const dayEnd = mealSlots.length
    ? Math.max(...mealSlots.map((slot) => Number(slot?.end) || dayStart))
    : dayStart + DAY_MS;
  const acquiredAt = Number.isFinite(Number(fish?.acquiredAt)) ? Number(fish.acquiredAt) : dayStart;
  const mealFree = typeof isMealFreeFish === "function" ? isMealFreeFish(fish) : false;
  let properlyFed = mealFree;

  if (!mealFree) {
    // A fish only owes meals for windows in which it actually existed. A fish
    // acquired after the AM window ends therefore owes PM only, while a fish
    // present before noon must have both AM and PM recorded for this recap day.
    const requiredSlots = mealSlots.filter((slot) => acquiredAt < Number(slot.end));
    properlyFed = requiredSlots.length > 0 && requiredSlots.every((slot) => (
      typeof hasFishEatenInSlot === "function" && hasFishEatenInSlot(fish, slot, tank)
    ));
  }

  const healthy = typeof getFishHealthRatio === "function" && getFishHealthRatio(fish) >= 1;
  // Individual fish use their own tank's recap cleanliness, never the borough average.
  const cleanPercent = Number.isFinite(Number(tankSummary?.cleanPercent))
    ? clamp(Math.round(Number(tankSummary.cleanPercent)), 0, 100)
    : getTankCleanlinessPercentForMilestones(tank, now);
  const cleanEnvironment = cleanPercent >= 80;
  const needsStatus = typeof getFishNeedsStatus === "function" ? getFishNeedsStatus(fish, tank, now) : [];
  const speciesNeedsSatisfied = Array.isArray(needsStatus) && needsStatus.every((need) => need?.met === true);
  const comfort = typeof getFishComfort === "function" ? Number(getFishComfort(fish, now, tank)?.value) : 0;
  const comfortable = Number.isFinite(comfort) && comfort >= 0.8;

  return {
    properlyFed,
    healthy,
    cleanEnvironment,
    speciesNeedsSatisfied,
    comfortable,
    cleanPercent,
    points: Math.min(FISH_DAILY_CARE_XP_CAP, [
      properlyFed,
      healthy,
      cleanEnvironment,
      speciesNeedsSatisfied,
      comfortable
    ].filter(Boolean).length)
  };
}

function processFishCareLevelIncreaseProgression(fish, species, levelResult, now = Date.now(), tank = null, dayKey = "") {
  const oldLevel = clamp(Math.floor(Number(levelResult?.oldLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  const newLevel = clamp(Math.floor(Number(levelResult?.newLevel) || oldLevel), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
  const levelsGained = Math.max(0, Math.floor(Number(levelResult?.levelsGained) || (newLevel - oldLevel)));
  const persistedLevel = clamp(Math.floor(Number(fish?.careLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);

  // Variant discovery is a consequence of a real, already-persisted Care Level
  // increase. No purchase, sale, storage move, hatch, birthday, UI render, load,
  // or recap pass with an unchanged Care Level should be able to enter this path.
  if (!fish || !species || levelsGained <= 0 || newLevel <= oldLevel || persistedLevel !== newLevel) {
    return { masteryResult: null, levelUpEvents: [], masteryEvents: [], variantUnlocks: [] };
  }

  const masteryResult = typeof updateFishSpeciesMasteryForLevelIncrease === "function"
    ? updateFishSpeciesMasteryForLevelIncrease(fish, oldLevel, newLevel, now)
    : null;
  const levelUpEvents = typeof recordFishLevelUpProgressionEvents === "function"
    ? recordFishLevelUpProgressionEvents(fish, species, oldLevel, newLevel, now, dayKey)
    : [];
  const masteryEvents = masteryResult?.highestLevelIncreased === true && typeof recordFishSpeciesMasteryProgressionEvents === "function"
    ? recordFishSpeciesMasteryProgressionEvents(fish, species, masteryResult, now, dayKey)
    : [];
  const variantUnlocks = typeof unlockFishAppearanceVariantsForLevelIncrease === "function"
    ? unlockFishAppearanceVariantsForLevelIncrease(fish, species, oldLevel, newLevel, now, tank, { dayKey, notify: false })
    : [];

  if (typeof surfaceFishCareLevelProgressionNotification === "function") {
    surfaceFishCareLevelProgressionNotification(fish, species, { ...levelResult, oldLevel, newLevel, levelsGained }, masteryResult, variantUnlocks, now, tank, dayKey);
  }

  return { masteryResult, levelUpEvents, masteryEvents, variantUnlocks };
}

function awardFishCareXpForCompletedDailyRecap(summary, now = Date.now()) {
  if (!summary?.dayKey) return [];
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) return [];

  const dayKey = summary.dayKey;
  const dayStart = getLocalDayStartTimestamp(dayKey);
  const recapMealSlots = typeof getDailyMealIndicatorSlotsForDayKey === "function"
    ? getDailyMealIndicatorSlotsForDayKey(dayKey)
    : [];
  const dayEnd = recapMealSlots.length
    ? Math.max(...recapMealSlots.map((slot) => Number(slot?.end) || dayStart))
    : dayStart + DAY_MS;
  const tankSnapshots = new Map((Array.isArray(summary.tankCareSnapshots) ? summary.tankCareSnapshots : [])
    .filter((entry) => entry?.tankId)
    .map((entry) => [entry.tankId, entry]));
  const awards = [];

  for (const tank of getAllTanks(state)) {
    const tankSummary = tankSnapshots.get(tank?.id) || null;
    for (const fish of Array.isArray(tank?.fish) ? tank.fish : []) {
      if (!fish || isFishDead(fish)) continue;
      if (fish.storageState === "stored") continue;
      const species = getSpeciesForFish(fish);
      if (!isFishCareProgressionEligible(fish, species)) continue;
      const acquiredAt = Number.isFinite(Number(fish.acquiredAt)) ? Number(fish.acquiredAt) : 0;
      if (acquiredAt >= dayEnd) continue;
      if (fish.lastCareXpDayKey === dayKey) continue;

      fish.careXp = Math.max(0, Math.floor(Number(fish.careXp) || 0));
      fish.careLevel = clamp(Math.floor(Number(fish.careLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX);
      const conditions = getFishCareXpConditionsForRecapDay(fish, tank, dayKey, now, tankSummary);
      const awardedXp = Math.min(FISH_DAILY_CARE_XP_CAP, Math.max(0, Math.floor(Number(conditions.points) || 0)));
      fish.careXp += awardedXp;
      const levelResult = updateFishCareLevelFromXp(fish, species);
      const progression = processFishCareLevelIncreaseProgression(fish, species, levelResult, now, tank, dayKey);
      const masteryResult = progression.masteryResult;
      const levelUpEvents = progression.levelUpEvents;
      const masteryEvents = progression.masteryEvents;
      const variantUnlocks = progression.variantUnlocks;
      fish.lastCareXpDayKey = dayKey;
      awards.push({
        fishId: fish.id || "",
        fishName: fish.name || "Fish",
        speciesId: fish.speciesId || "",
        previousCareLevel: levelResult.oldLevel,
        careLevel: fish.careLevel,
        levelsGained: levelResult.levelsGained,
        speciesMasteryLevel: masteryResult?.record?.highestLevel || (typeof getFishSpeciesMasteryRecord === "function"
          ? getFishSpeciesMasteryRecord(fish.speciesId, { create: false })?.highestLevel
          : FISH_CARE_LEVEL_MIN) || FISH_CARE_LEVEL_MIN,
        speciesMasteryIncreased: masteryResult?.highestLevelIncreased === true,
        speciesMasteredNow: masteryResult?.masteredNow === true,
        levelUpEvents,
        masteryEvents,
        variantUnlocks,
        awardedXp,
        conditions: {
          properlyFed: conditions.properlyFed === true,
          healthy: conditions.healthy === true,
          cleanEnvironment: conditions.cleanEnvironment === true,
          speciesNeedsSatisfied: conditions.speciesNeedsSatisfied === true,
          comfortable: conditions.comfortable === true
        }
      });
    }
  }

  summary.careXpAwards = awards;
  summary.careXpEarned = awards.reduce((total, entry) => total + entry.awardedXp, 0);
  summary.variantUnlocks = awards.flatMap((entry) => Array.isArray(entry.variantUnlocks) ? entry.variantUnlocks : []);
  summary.variantsUnlocked = summary.variantUnlocks.length;
  return awards;
}

function normalizeBoroughRecapScore(rawScore, fishCount = 0, tankCount = 0) {
  const divisor = Number(fishCount) > 0 ? Math.max(1, Number(fishCount)) : Math.max(1, Number(tankCount));
  const scaled = (Number(rawScore) || 0) / divisor;
  return scaled < 0 ? -Math.round(Math.abs(scaled)) : Math.round(scaled);
}

function buildBoroughDailyRecapSummary(dayKey, now = Date.now(), options = {}) {
  const tankSummaries = getAllTanks(state)
    .map((tank) => buildDailyRecapSummary(tank, dayKey, now, { ...options, force: true }))
    .filter(Boolean);
  const fishCount = tankSummaries.reduce((total, summary) => total + (summary.fishCount || 0), 0);
  const rows = [];
  for (const summary of tankSummaries) {
    for (const row of summary.rows || []) {
      if (row.type === "care" || (row.type === "comfort" && /^The tank averaged/i.test(row.text || ""))) {
        continue;
      }
      rows.push({ ...row, text: `${summary.tankName}: ${row.text}` });
    }
  }
  const averageComfort = fishCount
    ? Math.round(tankSummaries.reduce((total, summary) => total + ((summary.averageComfort || 0) * (summary.fishCount || 0)), 0) / fishCount)
    : 0;
  const endOfDay = getLocalDayStartTimestamp(dayKey) + DAY_MS - 1;
  if (fishCount && averageComfort >= 80) {
    rows.push({ text: `The borough averaged ${averageComfort}% comfort.`, score: 1, type: "comfort", time: endOfDay });
  }
  if (fishCount && !rows.some((row) => row.score < 0)) {
    rows.push({ text: "No critical care alerts were recorded across the borough.", score: 1, type: "care", time: endOfDay });
  }
  if (!rows.length && !options.force && !fishCount) {
    return null;
  }

  const rawScore = rows.reduce((total, row) => total + (Number(row.score) || 0), 0);
  const score = normalizeBoroughRecapScore(rawScore, fishCount, tankSummaries.length);
  const cleanPercent = tankSummaries.length
    ? Math.round(tankSummaries.reduce((total, summary) => total + (summary.cleanPercent || 0), 0) / tankSummaries.length)
    : 0;
  return {
    scope: BOROUGH_DAILY_RECAP_ID,
    tankId: BOROUGH_DAILY_RECAP_ID,
    tankName: "Bubble Borough",
    tankCount: tankSummaries.length,
    tankCareSnapshots: tankSummaries.map((summary) => ({
      tankId: summary.tankId || "",
      cleanPercent: clamp(Math.round(Number(summary.cleanPercent) || 0), 0, 100)
    })),
    dayKey,
    generatedAt: now,
    rows,
    scoreModel: BOROUGH_RECAP_SCORE_MODEL,
    rawScore,
    score,
    reward: 0,
    mealsFed: tankSummaries.reduce((total, summary) => total + (summary.mealsFed || 0), 0),
    averageComfort,
    cleanPercent,
    allMealsSatisfied: fishCount > 0 && tankSummaries.filter((summary) => summary.fishCount > 0).every((summary) => summary.allMealsSatisfied),
    hasNegativeEvents: rows.some((row) => row.score < 0),
    hasAttackOrDeath: tankSummaries.some((summary) => summary.hasAttackOrDeath),
    hasGlassTapStress: tankSummaries.some((summary) => summary.hasGlassTapStress),
    hasSparklingComfort: tankSummaries.some((summary) => summary.hasSparklingComfort),
    fishCount,
    decorCount: tankSummaries.reduce((total, summary) => total + (summary.decorCount || 0), 0),
    narrative: buildDailyRecapNarrative(rows, null),
    overall: score >= 8 ? "Great day!" : score >= 5 ? "Good day!" : score >= 1 ? "Pretty good day!" : score === 0 ? "Quiet day." : "Rough day."
  };
}

function getWeeklyReportConsumedDayKeys() {
  const consumed = new Set();
  for (const report of Array.isArray(state?.dailyBonus?.weeklyReports) ? state.dailyBonus.weeklyReports : []) {
    for (const dayKey of Array.isArray(report?.dayKeys) ? report.dayKeys : []) {
      if (dayKey) consumed.add(dayKey);
    }
  }
  return consumed;
}

function getWeeklyReportIncomeTotals(dayKeys = []) {
  const selected = new Set(dayKeys);
  const totals = { feeding: 0, cleaning: 0, randomFinds: 0 };
  for (const dayKey of selected) {
    const entry = state?.incomeHistoryByDay?.[dayKey];
    if (!entry || typeof entry !== "object") continue;
    totals.feeding += Math.max(0, Math.floor(Number(entry.feeding) || 0));
    totals.cleaning += Math.max(0, Math.floor(Number(entry.cleaning) || 0));
    totals.randomFinds += Math.max(0, Math.floor(Number(entry.randomFinds) || 0));
  }

  // Compatibility fallback for days that predate the structured daily income ledger.
  // Only fill a category when the ledger has no value for the selected report days.
  if (totals.feeding <= 0 || totals.cleaning <= 0 || totals.randomFinds <= 0) {
    const fallback = { feeding: 0, cleaning: 0, randomFinds: 0 };
    for (const entry of Array.isArray(state?.walletTransactions) ? state.walletTransactions : []) {
      if (entry?.direction !== "credit" || !selected.has(getLocalDayKey(Number(entry.time) || 0))) continue;
      const amount = Math.max(0, Math.floor(Number(entry.amount) || 0));
      const category = String(entry.category || "");
      const label = String(entry.label || "");
      if (category === "feeding" || /^Fed /i.test(label)) fallback.feeding += amount;
      else if (category === "cleaning" || /Tank cleaning/i.test(label)) fallback.cleaning += amount;
      else if (category === "random-finds" || /found a coin/i.test(label)) fallback.randomFinds += amount;
    }
    if (totals.feeding <= 0) totals.feeding = fallback.feeding;
    if (totals.cleaning <= 0) totals.cleaning = fallback.cleaning;
    if (totals.randomFinds <= 0) totals.randomFinds = fallback.randomFinds;
  }
  return totals;
}

function getWeeklyReportProgressionCounts(dayKeys = [], summaries = []) {
  const selected = new Set(dayKeys);
  let fishLevelUps = 0;
  let variantsUnlocked = 0;
  let hasStructuredFishLevelEvents = false;
  let hasStructuredVariantEvents = false;
  const history = Array.isArray(state?.progressionHistory) ? state.progressionHistory : [];
  for (const entry of history) {
    if (!entry || typeof entry !== "object") continue;
    const dayKey = typeof entry.dayKey === "string" && entry.dayKey
      ? entry.dayKey
      : getLocalDayKey(Number(entry.timestamp ?? entry.time ?? entry.createdAt) || 0);
    if (!selected.has(dayKey)) continue;
    const type = String(entry.type || entry.eventType || "").toLowerCase().replace(/_/g, "-");
    if (type === "fish-level-up" || type === "level-up") {
      hasStructuredFishLevelEvents = true;
      fishLevelUps += Math.max(1, Math.floor(Number(entry.levelsGained) || 1));
    }
    if (type === "variant-unlocked" || type === "fish-variant-unlocked") {
      hasStructuredVariantEvents = true;
      variantsUnlocked += 1;
    }
  }

  // Older recap windows can predate one or both structured event types. Fall
  // back independently so a legacy variant event never suppresses fish-level
  // counts, and vice versa. New windows use progressionHistory exclusively.
  for (const summary of Array.isArray(summaries) ? summaries : []) {
    if (!summary?.dayKey || !selected.has(summary.dayKey)) continue;
    if (!hasStructuredFishLevelEvents) {
      const awards = Array.isArray(summary.careXpAwards) ? summary.careXpAwards : [];
      fishLevelUps += awards.reduce((total, award) => total + Math.max(0, Math.floor(Number(award?.levelsGained) || 0)), 0);
    }
    if (!hasStructuredVariantEvents) {
      variantsUnlocked += Array.isArray(summary.variantUnlocks)
        ? summary.variantUnlocks.length
        : Math.max(0, Math.floor(Number(summary.variantsUnlocked) || 0));
    }
  }
  return { fishLevelUps, variantsUnlocked };
}

function getWeeklyReportBirthDeathCounts(summaries = []) {
  let births = 0;
  let deaths = 0;
  for (const summary of summaries) {
    for (const row of Array.isArray(summary?.rows) ? summary.rows : []) {
      const type = String(row?.type || "").toLowerCase();
      const text = String(row?.text || "");
      if (type === "birth" || /\bwas born\b|\bwere born\b|\bhas just hatched\b|\bhave hatched\b/i.test(text)) {
        const explicitCount = Number((text.match(/(?:^|:\s*)(\d+)\s+(?:juvenile|baby|fish)/i) || [])[1]);
        births += Number.isFinite(explicitCount) && explicitCount > 0 ? Math.floor(explicitCount) : 1;
      }
      if (type === "death" || /\bdied\b|dead fish|could not survive/i.test(text)) deaths += 1;
    }
  }
  return { births, deaths };
}

function buildWeeklyReport(summaries = [], now = Date.now()) {
  const uniqueByDay = new Map();
  for (const summary of summaries) {
    if (!summary?.dayKey || uniqueByDay.has(summary.dayKey)) continue;
    uniqueByDay.set(summary.dayKey, summary);
  }
  const selected = [...uniqueByDay.values()]
    .sort((left, right) => String(right.dayKey).localeCompare(String(left.dayKey)))
    .slice(0, WEEKLY_REPORT_RECAP_COUNT);
  if (selected.length !== WEEKLY_REPORT_RECAP_COUNT) return null;

  const dayKeys = selected.map((summary) => summary.dayKey);
  const averageRecapScore = selected.reduce((total, summary) => total + (Number(summary.score) || 0), 0) / WEEKLY_REPORT_RECAP_COUNT;
  const bestDay = selected.reduce((best, summary) => {
    if (!best || Number(summary.score) > Number(best.score)) return summary;
    if (Number(summary.score) === Number(best.score) && String(summary.dayKey) > String(best.dayKey)) return summary;
    return best;
  }, null);
  const income = getWeeklyReportIncomeTotals(dayKeys);
  const progression = getWeeklyReportProgressionCounts(dayKeys, selected);
  const lifeEvents = getWeeklyReportBirthDeathCounts(selected);
  const milestonesCompleted = (Array.isArray(state?.dailyBonus?.milestoneCompletions) ? state.dailyBonus.milestoneCompletions : [])
    .filter((entry) => dayKeys.includes(entry?.dayKey)).length;
  const weeklyReward = clamp(Math.round(averageRecapScore * WEEKLY_REPORT_REWARD_MULTIPLIER), 0, WEEKLY_REPORT_REWARD_CAP);
  const peaceful = typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled();
  return {
    id: `weekly-${[...dayKeys].sort().join("-")}`,
    generatedAt: now,
    dayKeys,
    averageRecapScore: Math.round(averageRecapScore * 10) / 10,
    feedingIncome: income.feeding,
    cleaningIncome: income.cleaning,
    randomCoinFinds: income.randomFinds,
    fishLevelUps: progression.fishLevelUps,
    variantsUnlocked: progression.variantsUnlocked,
    milestonesCompleted,
    births: lifeEvents.births,
    deaths: lifeEvents.deaths,
    bestDayKey: bestDay?.dayKey || "",
    bestDayScore: Math.round(Number(bestDay?.score) || 0),
    weeklyReward,
    rewardPaid: peaceful ? 0 : weeklyReward,
    rewardSuppressedByPeacefulMode: peaceful && weeklyReward > 0
  };
}

function maybeGenerateWeeklyReports(now = Date.now()) {
  if (!state?.dailyBonus) return [];
  if (!Array.isArray(state.dailyBonus.weeklyReports)) state.dailyBonus.weeklyReports = [];
  const generated = [];
  let consumed = getWeeklyReportConsumedDayKeys();
  const history = Array.isArray(state.dailyBonus.recapHistory) ? state.dailyBonus.recapHistory : [];

  while (true) {
    const unused = [];
    const seen = new Set();
    for (const summary of history) {
      const dayKey = String(summary?.dayKey || "");
      if (!dayKey || consumed.has(dayKey) || seen.has(dayKey)) continue;
      seen.add(dayKey);
      unused.push(summary);
    }
    unused.sort((left, right) => String(right.dayKey).localeCompare(String(left.dayKey)));
    if (unused.length < WEEKLY_REPORT_RECAP_COUNT) break;
    const report = buildWeeklyReport(unused.slice(0, WEEKLY_REPORT_RECAP_COUNT), now);
    if (!report) break;

    state.dailyBonus.weeklyReports.unshift(report);
    state.dailyBonus.weeklyReports = state.dailyBonus.weeklyReports.slice(0, WEEKLY_REPORT_HISTORY_LIMIT);
    for (const dayKey of report.dayKeys) consumed.add(dayKey);
    if (report.rewardPaid > 0) {
      state.coins = Math.min(MAX_WALLET_COINS, state.coins + report.rewardPaid);
      recordDailyIncomeCategory("awards", report.rewardPaid, now);
      recordWalletTransaction({
        amount: report.rewardPaid,
        direction: "credit",
        category: "awards",
        now,
        label: "Weekly Care Award",
        place: "Bubble Borough"
      });
    }
    pushEvent(report.rewardPaid > 0
      ? `Weekly Report completed. Earned ${report.rewardPaid} ${pluralize("coin", report.rewardPaid)}.`
      : "Weekly Report completed.", now, getCurrentTank(), { type: "weekly_report", tone: "positive", recapEligible: false });
    enqueueNotificationCenterEntry({
      type: "weekly-report",
      title: "Weekly Report ready",
      detail: report.rewardPaid > 0
        ? `Average score ${report.averageRecapScore}. Weekly Care Award: ${report.rewardPaid} coins.`
        : `Average score ${report.averageRecapScore}.`,
      createdAt: now,
      signature: report.id,
      coinReward: report.rewardPaid
    }, { surface: true, durationMs: 4800 });
    generated.push(report);
  }
  return generated;
}

function storeDailyRecapSummary(summary) {
  if (!summary?.dayKey || !state?.dailyBonus) {
    return false;
  }
  awardFishCareXpForCompletedDailyRecap(summary, summary.generatedAt || Date.now());
  summary.scope = BOROUGH_DAILY_RECAP_ID;
  summary.tankId = BOROUGH_DAILY_RECAP_ID;
  summary.tankName = "Bubble Borough";
  state.dailyBonus.summariesByTankId = { [BOROUGH_DAILY_RECAP_ID]: summary };
  state.dailyBonus.lastQualifiedDayKey = summary.dayKey;
  state.dailyBonus.lastEvaluatedDayKey = summary.dayKey;
  if (!Array.isArray(state.dailyBonus.recapHistory)) {
    state.dailyBonus.recapHistory = [];
  }
  const existingIndex = state.dailyBonus.recapHistory.findIndex((entry) => entry.dayKey === summary.dayKey && (entry.scope === BOROUGH_DAILY_RECAP_ID || entry.tankId === BOROUGH_DAILY_RECAP_ID));
  if (existingIndex >= 0) {
    state.dailyBonus.recapHistory.splice(existingIndex, 1);
  }
  state.dailyBonus.recapHistory.unshift(summary);
  state.dailyBonus.recapHistory = state.dailyBonus.recapHistory.slice(0, DAILY_RECAP_HISTORY_LIMIT);
  syncActiveDailyBonusState();
  applyProgressMilestones(summary, summary.generatedAt || Date.now());
  maybeGenerateWeeklyReports(summary.generatedAt || Date.now());
  return true;
}

function maybeGenerateDailyRecapForTank(tank, now = Date.now(), options = {}) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return false;
  if (!tank || !state?.dailyBonus) {
    return false;
  }
  const force = options.force === true;
  const dayKey = force ? getLocalDayKey(now) : getPreviousLocalDayKey(now);
  const claimedKey = `${BOROUGH_DAILY_RECAP_ID}:${dayKey}`;
  if (!force && state.dailyBonus.lastEvaluatedDayKey === dayKey) {
    syncActiveDailyBonusState();
    return false;
  }
  if (!force && state.dailyBonus.claimedByTankDay?.[claimedKey]) {
    state.dailyBonus.lastEvaluatedDayKey = dayKey;
    syncActiveDailyBonusState();
    return false;
  }
  if (!force && getLocalDayKey(now) === getLocalDayKey(Number(tank.lastSimulatedAt) || now)) {
    syncActiveDailyBonusState();
    return false;
  }
  const summary = buildBoroughDailyRecapSummary(dayKey, now, { force });
  state.dailyBonus.lastEvaluatedDayKey = dayKey;
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
  const duration = getTankMaxDirtyDurationMs(fishList, tank, deadFishList);
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
    .reduce((latest, event) => Math.max(latest, Number(event?.progressionTime ?? event?.time) || 0), 0);
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
  return Boolean(fish && !isPiranhaSpecies(fish) && fish.speciesId !== "pufferfish");
}

function hasCommunityMilestoneTank(recentAverageComfort = 0) {
  return getAllTanks(state).some((tank) => {
    const livingFish = (Array.isArray(tank?.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
    return livingFish.filter(isCommunityMilestoneFish).length >= 5
      && getTankSpaceLoad(tank) <= TANK_SPACE_FULL_LOAD
      && Number(recentAverageComfort) >= 70;
  });
}

function getConnectedTubeTankCount() {
  const tanks = getAllTanks(state);
  if (tanks.length < 3 || typeof getAllTransitTubes !== "function") {
    return 0;
  }
  const tankIds = new Set(tanks.map((tank) => String(tank?.id || "")).filter(Boolean));
  const adjacency = new Map([...tankIds].map((id) => [id, new Set()]));
  for (const entry of getAllTransitTubes()) {
    const sourceTankId = String(entry?.tank?.id || "");
    const target = getAllTransitTubes().find((candidate) => candidate?.item?.id === entry?.item?.transitTubeLinkedId);
    const targetTankId = String(target?.tank?.id || "");
    if (!sourceTankId || !targetTankId || sourceTankId === targetTankId || target?.item?.transitTubeLinkedId !== entry?.item?.id) {
      continue;
    }
    adjacency.get(sourceTankId)?.add(targetTankId);
    adjacency.get(targetTankId)?.add(sourceTankId);
  }
  let largestComponent = 0;
  const visited = new Set();
  for (const startId of tankIds) {
    if (visited.has(startId)) continue;
    const queue = [startId];
    visited.add(startId);
    let size = 0;
    while (queue.length) {
      const currentId = queue.shift();
      size += 1;
      for (const neighborId of adjacency.get(currentId) || []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    largestComponent = Math.max(largestComponent, size);
  }
  return largestComponent;
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
  const currentAndStoredFish = [
    ...getAllTankFish(state),
    ...(Array.isArray(state?.storedFish) ? state.storedFish : [])
  ].filter(Boolean);
  const memorialCareLevels = Array.isArray(state?.memorialHistory)
    ? state.memorialHistory.map((entry) => Number(entry?.careLevel) || 0)
    : [];
  const masteryRecords = state?.fishSpeciesMastery && typeof state.fishSpeciesMastery === "object"
    ? Object.values(state.fishSpeciesMastery).filter((entry) => entry && typeof entry === "object")
    : [];
  const highestFishCareLevel = Math.max(
    FISH_CARE_LEVEL_MIN,
    ...currentAndStoredFish.map((fish) => Number(fish?.careLevel) || FISH_CARE_LEVEL_MIN),
    ...memorialCareLevels,
    ...masteryRecords.map((entry) => Number(entry?.highestLevel) || FISH_CARE_LEVEL_MIN)
  );
  const masteredSpeciesCount = masteryRecords.filter((entry) => (
    (Number(entry?.highestLevel) || FISH_CARE_LEVEL_MIN) >= FISH_CARE_LEVEL_MAX
    || Number(entry?.masteredAt) > 0
  )).length;
  const hasLevel3Fish = highestFishCareLevel >= 3;
  const hasLevel4Fish = highestFishCareLevel >= 4;
  const hasMasteredSpecies = masteredSpeciesCount > 0;
  const allEvents = getAllTanks(state)
    .flatMap((tank) => Array.isArray(tank.events) ? tank.events : [])
    .filter((event) => event?.progressionEligible !== false);
  const latestDeath = allEvents
    .filter((event) => / died|dead fish|could not survive/i.test(event?.text || ""))
    .reduce((latest, event) => Math.max(latest, Number(event.progressionTime ?? event.time) || 0), 0);
  const stewardshipStartCandidates = [
    ...getAllTanks(state).map((tank) => Number(tank?.createdAt) || Number(tank?.lastSimulatedAt) || now),
    ...livingFish.map((fish) => Number(fish.acquiredAt) || now)
  ];
  const stewardshipStart = Math.min(...stewardshipStartCandidates.filter((value) => Number.isFinite(value) && value > 0), now);
  const daysSinceLastDeath = latestDeath > 0
    ? Math.floor((now - latestDeath) / DAY_MS)
    : Math.floor((now - stewardshipStart) / DAY_MS);
  const cleanRecapStreak90 = countRecentRecapStreak(history, (summary) => getRecapCleanPercent(summary, now) >= 90);
  const cleanRecapStreak95 = countRecentRecapStreak(history, (summary) => getRecapCleanPercent(summary, now) >= 95);
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
    && (Number(event?.progressionTime ?? event?.time) || 0) > lastHealingAt
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
    highestFishCareLevel,
    masteredSpeciesCount,
    hasLevel3Fish,
    hasLevel4Fish,
    hasMasteredSpecies,
    daysSinceLastDeath,
    hasSparklingFish: livingFish.some((fish) => getFishComfort(fish, now).value >= 0.95),
    cleanRecapStreak90,
    cleanRecapStreak95,
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
    connectedTubeTankCount: getConnectedTubeTankCount()
  };
}

function applyProgressMilestones(latestSummary = null, now = Date.now()) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) return [];
  if (!state?.dailyBonus || runtime.achievementEvaluationActive) {
    return [];
  }
  runtime.achievementEvaluationActive = true;
  if (!state.dailyBonus.milestones || typeof state.dailyBonus.milestones !== "object") {
    state.dailyBonus.milestones = {};
  }
  try {
    const stats = getMilestoneStats(latestSummary, now);
    const unlocked = [];
    for (const milestone of PROGRESSION_MILESTONES) {
      if (state.dailyBonus.milestones[milestone.id] || !milestone.isMet(stats)) {
        continue;
      }
      state.dailyBonus.milestones[milestone.id] = true;
      if (!Array.isArray(state.dailyBonus.milestoneCompletions)) state.dailyBonus.milestoneCompletions = [];
      state.dailyBonus.milestoneCompletions.unshift({
        milestoneId: milestone.id,
        label: milestone.label,
        dayKey: latestSummary?.dayKey || getLocalDayKey(now),
        time: now
      });
      state.dailyBonus.milestoneCompletions = state.dailyBonus.milestoneCompletions.slice(0, 200);
      if (milestone.reward > 0) {
        state.coins = Math.min(MAX_WALLET_COINS, state.coins + milestone.reward);
        recordDailyIncomeCategory("milestones", milestone.reward, now);
        recordWalletTransaction({ amount: milestone.reward, direction: "credit", category: "milestones", now, label: `${milestone.label} milestone`, place: "Bubble Borough" });
      }
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
      const unlockedItems = [
        ...speciesUnlocked.map((speciesId) => runtime.fishMap.get(speciesId)?.name || titleFromFile(speciesId)),
        ...decorUnlocked.map((decorKey) => runtime.decorMap.get(decorKey)?.name || titleFromFile(decorKey))
      ].filter(Boolean);
      const milestoneCoinCopy = milestone.reward > 0
        ? `${milestone.reward} ${pluralize("coin", milestone.reward)} awarded.`
        : "";
      const milestoneUnlockCopy = unlockedItems.length
        ? `Unlocked: ${unlockedItems.join(", ")}.`
        : "";
      const milestoneDetail = [milestoneUnlockCopy, milestoneCoinCopy].filter(Boolean).join(" ") || "Achievement recorded.";
      pushEvent(`${milestone.label} milestone reached.${milestoneCoinCopy ? ` ${milestoneCoinCopy}` : ""}`, now);
      enqueueNotificationCenterEntry({
        type: "achievement",
        title: `${milestone.label} unlocked!`,
        detail: milestoneDetail,
        createdAt: now,
        signature: `achievement:${milestone.id}`,
        achievementId: milestone.id,
        coinReward: milestone.reward,
        iconPath: getMilestoneIconPath(milestone.id),
        unlockedItems
      }, { surface: true, durationMs: 5200 });
      unlocked.push({ ...milestone, speciesUnlocked, decorUnlocked });
    }
    return unlocked;
  } finally {
    runtime.achievementEvaluationActive = false;
  }
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

function cancelDeferredStateSaveSchedule() {
  if (runtime.deferredStateSaveTimerId) {
    window.clearTimeout(runtime.deferredStateSaveTimerId);
    runtime.deferredStateSaveTimerId = 0;
  }
  if (runtime.deferredStateSaveIdleId && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(runtime.deferredStateSaveIdleId);
    runtime.deferredStateSaveIdleId = 0;
  }
}

function flushDeferredStateSave() {
  runtime.deferredStateSaveTimerId = 0;
  runtime.deferredStateSaveIdleId = 0;
  if (!runtime.deferredStateSaveDirty) {
    return false;
  }
  saveState();
  return true;
}

function requestDeferredStateSave() {
  if (!runtimeInitialized || !state) {
    return false;
  }

  runtime.deferredStateSaveDirty = true;
  if (!runtime.deferredStateSaveRequestedAt) {
    runtime.deferredStateSaveRequestedAt = Date.now();
  }
  if (runtime.deferredStateSaveTimerId || runtime.deferredStateSaveIdleId) {
    return true;
  }

  const now = Date.now();
  const sinceLastSave = runtime.lastStateSavedAt > 0
    ? now - runtime.lastStateSavedAt
    : 0;
  const delayMs = Math.max(350, DEFERRED_STATE_SAVE_MIN_INTERVAL_MS - sinceLastSave);

  runtime.deferredStateSaveTimerId = window.setTimeout(() => {
    runtime.deferredStateSaveTimerId = 0;
    if (!runtime.deferredStateSaveDirty) {
      return;
    }

    if (typeof window.requestIdleCallback === "function") {
      runtime.deferredStateSaveIdleId = window.requestIdleCallback(() => {
        flushDeferredStateSave();
      }, { timeout: 1250 });
      return;
    }

    runtime.deferredStateSaveTimerId = window.setTimeout(() => {
      flushDeferredStateSave();
    }, 500);
  }, delayMs);
  return true;
}

function saveState() {
  const profileStartedAt = runtime.debugFrameProfilerEnabled ? performance.now() : 0;
  if (!state) {
    return;
  }
  if (typeof commitDecorEditHistory === "function") commitDecorEditHistory();
  if (runtime.freshGameSaveLocked && state?.tutorial?.completed !== true) {
    return;
  }
  if (state?.tutorial?.completed === true) {
    runtime.freshGameSaveLocked = false;
  }
  state.coins = clamp(Math.floor(Number(state.coins) || 0), 0, MAX_WALLET_COINS);
  if (typeof syncTankPopulationUsageFields === "function") syncTankPopulationUsageFields(state);
  if (typeof syncDeadFishCorpsePersistenceForSave === "function") {
    syncDeadFishCorpsePersistenceForSave(Date.now());
  }

  ensureBubbleBodegaRescueOffer(Date.now());
  applyProgressMilestones(null, Date.now());
  if (typeof syncWebSurfMailPersistence === "function") syncWebSurfMailPersistence();

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
    runtime.lastStateSavedAt = Date.now();
    recordLocalSaveForCloud(runtime.lastStateSavedAt);
    scheduleCloudSave();
    runtime.gravelStateDirty = false;
    runtime.tankStateDirty = false;
    runtime.deferredStateSaveDirty = false;
    runtime.deferredStateSaveRequestedAt = 0;
    cancelDeferredStateSaveSchedule();
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
  } finally {
    if (runtime.debugFrameProfilerEnabled) {
      const durationMs = Math.max(0, performance.now() - profileStartedAt);
      runtime.frameProfilerLastSaveMs = durationMs;
      recordDebugFrameProfilerDuration("saveState", durationMs);
    }
  }
}
