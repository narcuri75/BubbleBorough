// Source fragment: borough/living-borough.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function normalizeHalloweenMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return HALLOWEEN_MODE_OPTIONS.includes(normalized) ? normalized : HALLOWEEN_MODE_AUTOMATIC;
}

function getBoroughReferenceNow(now = Date.now()) {
  return Number.isFinite(Number(runtime?.debugSimulatedNow)) ? Number(runtime.debugSimulatedNow) : now;
}

function isHalloweenCalendarDate(now = Date.now()) {
  const date = new Date(getBoroughReferenceNow(now));
  return date.getMonth() === 9 && date.getDate() >= 1 && date.getDate() <= 31;
}

function getHalloweenModeSetting() {
  return normalizeHalloweenMode(runtime?.debugHalloweenModeOverride || state?.uiSettings?.halloweenMode);
}

function isHalloweenModeActive(now = Date.now()) {
  const mode = getHalloweenModeSetting();
  return mode === HALLOWEEN_MODE_ON || (mode === HALLOWEEN_MODE_AUTOMATIC && isHalloweenCalendarDate(now));
}

function getDeterministicHalloweenAppearance(fish) {
  const stableKey = `${fish?.id || ""}|${fish?.speciesId || ""}|bubble-borough-halloween|${runtime?.debugHalloweenRandomSalt || ""}`;
  return hashStringToUint32(stableKey) % 2 === 0 ? "skeleton" : "zombie";
}

function getFishSeasonalVisualState(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!fish || !species || isFishDead(fish)) {
    return "normal";
  }
  const debugOverride = runtime?.debugFishVisualOverrides?.get?.(fish.id);
  if (["normal", "skeleton", "zombie"].includes(debugOverride)) {
    return debugOverride;
  }
  if (!isHalloweenModeActive(now) || isCustomFishAssetKey(fish.speciesId)) {
    return "normal";
  }
  return getDeterministicHalloweenAppearance(fish);
}

function getFishSeasonalAssetPath(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const stage = getFishSeasonalVisualState(fish, species, now);
  if (stage === "normal" || !species || isCustomFishAssetKey(fish?.speciesId)) {
    return null;
  }
  const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
  const variants = stage === "skeleton" ? displaySpecies.skeletonAssetVariants : displaySpecies.zombieAssetVariants;
  const candidates = Array.isArray(variants) ? variants.filter(Boolean) : [];
  if (!candidates.length) {
    return null;
  }
  const variantIndex = hashStringToUint32(`${fish.id}|${stage}|art`) % candidates.length;
  const preferred = candidates[variantIndex] || candidates[0];
  return candidates.find((path) => path === preferred && runtime.images.has(path))
    || candidates.find((path) => runtime.images.has(path))
    || preferred;
}

function getFishSeasonalAssetCandidates(species) {
  return [
    ...(Array.isArray(species?.zombieAssetVariants) ? species.zombieAssetVariants : []),
    ...(Array.isArray(species?.skeletonAssetVariants) ? species.skeletonAssetVariants : [])
  ].filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index);
}

function preloadSeasonalFishAssets() {
  if (!runtime?.fishCatalog?.length) {
    return Promise.resolve();
  }
  const paths = runtime.fishCatalog.flatMap((species) => getFishSeasonalAssetCandidates(species));
  return preloadImages(paths).then(() => {
    runtime.boroughOverviewSnapshotCache.clear();
    renderUi(Date.now());
  });
}

function syncHalloweenPresentation(now = Date.now()) {
  const active = isHalloweenModeActive(now);
  document.documentElement.classList.toggle("halloween-mode", active);
  document.documentElement.dataset.halloweenMode = getHalloweenModeSetting();
  if (active && runtime.halloweenPresentationActive !== true) {
    runtime.halloweenPresentationActive = true;
    void preloadSeasonalFishAssets();
  } else if (!active) {
    runtime.halloweenPresentationActive = false;
  }
  return active;
}

function setHalloweenMode(value) {
  if (!state) {
    return false;
  }
  const nextMode = normalizeHalloweenMode(value);
  const current = getUiSettings();
  if (current.halloweenMode === nextMode) {
    return false;
  }
  state.uiSettings = sanitizeUiSettings({ ...current, halloweenMode: nextMode });
  runtime.boroughOverviewSnapshotCache.clear();
  runtime.boroughOverviewFishProxies.clear();
  syncHalloweenPresentation();
  saveState();
  renderUi(Date.now(), { full: false });
  showToast(`Halloween Mode: ${nextMode === "automatic" ? "Automatic" : nextMode === "on" ? "On" : "Off"}.`);
  return true;
}

function sanitizeBoroughHappening(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.text !== "string" || !entry.text.trim()) {
    return null;
  }
  return {
    id: String(entry.id || createId("happening")),
    time: Number.isFinite(Number(entry.time)) ? Math.max(0, Number(entry.time)) : Date.now(),
    text: entry.text.trim().slice(0, 220),
    type: String(entry.type || "activity").trim().slice(0, 32),
    fishId: typeof entry.fishId === "string" ? entry.fishId : null,
    tankId: typeof entry.tankId === "string" ? entry.tankId : null,
    sourceEventId: typeof entry.sourceEventId === "string" ? entry.sourceEventId : null
  };
}

function sanitizeBoroughHappenings(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map(sanitizeBoroughHappening)
    .filter(Boolean)
    .sort((left, right) => right.time - left.time)
    .slice(0, MAX_BOROUGH_HAPPENINGS);
}

function sanitizeMemorialRecord(entry) {
  if (!entry || typeof entry !== "object" || !String(entry.name || "").trim()) {
    return null;
  }
  return {
    id: String(entry.id || entry.fishId || createId("memorial")),
    fishId: String(entry.fishId || entry.id || ""),
    name: String(entry.name).trim().slice(0, 40),
    speciesId: String(entry.speciesId || ""),
    speciesName: String(entry.speciesName || "Fish").slice(0, 60),
    acquiredAt: Number.isFinite(Number(entry.acquiredAt)) ? Number(entry.acquiredAt) : null,
    deathAt: Number.isFinite(Number(entry.deathAt)) ? Number(entry.deathAt) : Date.now(),
    cause: String(entry.cause || "Unknown").slice(0, 180),
    residenceName: String(entry.residenceName || "").slice(0, 80),
    neighborhoodName: String(entry.neighborhoodName || "").slice(0, 80),
    parentNames: Array.isArray(entry.parentNames) ? entry.parentNames.map((name) => String(name).slice(0, 40)).slice(0, 2) : [],
    milestones: Array.isArray(entry.milestones) ? entry.milestones.map((value) => Math.max(0, Math.floor(Number(value) || 0))).filter(Boolean).slice(0, 8) : []
  };
}

function sanitizeMemorialHistory(entries) {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : [])
    .map(sanitizeMemorialRecord)
    .filter((entry) => entry && !seen.has(entry.fishId) && seen.add(entry.fishId))
    .sort((left, right) => right.deathAt - left.deathAt)
    .slice(0, MAX_MEMORIAL_HISTORY);
}

function recordBoroughHappening(text, meta = {}, time = Date.now()) {
  if (!state || typeof text !== "string" || !text.trim()) {
    return null;
  }
  const entry = sanitizeBoroughHappening({
    id: createId("happening"),
    time,
    text,
    type: meta.type,
    fishId: meta.fishId,
    tankId: meta.tankId,
    sourceEventId: meta.sourceEventId
  });
  if (!entry) {
    return null;
  }
  state.boroughHappenings = sanitizeBoroughHappenings(state.boroughHappenings);
  const duplicate = state.boroughHappenings.some((existing) => (
    existing.text === entry.text && Math.abs(existing.time - entry.time) < 6 * HOUR_MS
  ));
  if (duplicate) {
    return null;
  }
  state.boroughHappenings.unshift(entry);
  state.boroughHappenings = state.boroughHappenings.slice(0, MAX_BOROUGH_HAPPENINGS);
  runtime.lastBoroughHappeningAt = time;
  return entry;
}

function buildBoroughHappeningFromEvent(event, tank = getCurrentTank()) {
  if (!event || event.recapEligible === false) {
    return null;
  }
  const type = String(event.type || "").toLowerCase();
  const text = String(event.text || "").trim();
  if (!text) {
    return null;
  }
  if (["travel", "service", "residence", "birthday", "birth", "death", "recovery", "digging", "social"].includes(type)) {
    return { text, type, fishId: event.fishId || null, tankId: tank?.id || null, sourceEventId: event.id };
  }
  if (/hatched|recovered|returned home|visited|discovered|found a pebble|died|has lived in the borough/i.test(text)) {
    return { text, type: type || "activity", fishId: event.fishId || null, tankId: tank?.id || null, sourceEventId: event.id };
  }
  return null;
}

function maybeRecordBoroughHappeningFromEvent(event, tank = getCurrentTank()) {
  const source = buildBoroughHappeningFromEvent(event, tank);
  return source ? recordBoroughHappening(source.text, source, event.time) : null;
}

function getFishAgeDays(fish, now = Date.now()) {
  return Math.max(0, Math.floor((getBoroughReferenceNow(now) - (Number(fish?.acquiredAt) || getBoroughReferenceNow(now))) / DAY_MS));
}

function processFishAgeMilestones(now = Date.now()) {
  let changed = false;
  for (const tank of getAllTanks(state)) {
    for (const fish of tank.fish || []) {
      if (!fish || isFishDead(fish)) {
        continue;
      }
      const ageDays = getFishAgeDays(fish, now);
      const celebrated = Array.isArray(fish.celebratedAgeMilestones) ? fish.celebratedAgeMilestones : [];
      for (const milestone of FISH_AGE_MILESTONE_DAYS) {
        if (ageDays < milestone || celebrated.includes(milestone)) {
          continue;
        }
        celebrated.push(milestone);
        const text = `${fish.name} has lived in the borough for ${milestone} days!`;
        pushEvent(text, now, tank, { type: "birthday", fishId: fish.id, score: 1 });
        runtime.debugBirthdayHatFishIds.add(fish.id);
        window.setTimeout(() => runtime.debugBirthdayHatFishIds.delete(fish.id), 24 * 60 * 60 * 1000);
        changed = true;
      }
      fish.celebratedAgeMilestones = celebrated.sort((left, right) => left - right).slice(-8);
    }
  }
  return changed;
}

function getFishResidenceNameForHistory(fish) {
  const decorId = getFishResidenceDecorId(fish);
  const item = decorId ? getAllPlacedDecor(state).find((entry) => entry.id === decorId) : null;
  return item ? (runtime.decorMap.get(item.decorKey)?.name || titleFromFile(item.decorKey)) : "";
}

function recordFishMemorial(fish, tank = getCurrentTank(), cause = "Unknown", now = Date.now()) {
  if (!state || !fish) {
    return null;
  }
  state.memorialHistory = sanitizeMemorialHistory(state.memorialHistory);
  const existing = state.memorialHistory.find((entry) => entry.fishId === fish.id);
  if (existing) {
    return existing;
  }
  const species = getSpeciesForFish(fish);
  const record = sanitizeMemorialRecord({
    id: createId("memorial"),
    fishId: fish.id,
    name: fish.name,
    speciesId: fish.speciesId,
    speciesName: species?.name || "Fish",
    acquiredAt: fish.acquiredAt,
    deathAt: Number(fish.deadAt) || now,
    cause: String(cause || "Unknown").replace(/^.*?died\s*/i, "").trim() || "Unknown",
    residenceName: getFishResidenceNameForHistory(fish),
    neighborhoodName: getTankLabel(tank),
    parentNames: fish.parentNames,
    milestones: fish.celebratedAgeMilestones
  });
  state.memorialHistory.unshift(record);
  state.memorialHistory = state.memorialHistory.slice(0, MAX_MEMORIAL_HISTORY);
  return record;
}

function clearFishReferencesAfterDeath(fishId) {
  if (!fishId) {
    return false;
  }
  let changed = false;
  for (const fish of [...getAllTankFish(state), ...(state?.storedFish || [])]) {
    if (!fish || fish.id === fishId) {
      continue;
    }
    if (fish.relationships && Object.prototype.hasOwnProperty.call(fish.relationships, fishId)) {
      delete fish.relationships[fishId];
      changed = true;
    }
    for (const key of ["followFishId", "socialTargetFishId", "actionTargetFishId", "preferredFishId", "avoidedFishId"]) {
      if (fish[key] === fishId) {
        fish[key] = null;
        changed = true;
      }
    }
  }
  runtime.pendingNeighborhoodTravel?.delete?.(fishId);
  runtime.fishActionQueuesByFishId?.delete?.(fishId);
  runtime.fishActionSteeringByFishId?.delete?.(fishId);
  runtime.boroughOverviewFishProxies?.delete?.(fishId);
  runtime.debugFishVisualOverrides?.delete?.(fishId);
  runtime.debugBirthdayHatFishIds?.delete?.(fishId);
  runtime.debugAutonomyPausedFishIds?.delete?.(fishId);
  return changed;
}

function calculateNeighborhoodIdentity(tank = getCurrentTank()) {
  if (!tank) {
    return { id: "mixed", label: "Mixed Neighborhood", scores: {} };
  }
  const scores = { residential: 0, food: 0, healthcare: 0, social: 0, rest: 0, nursery: 0, explorer: 0 };
  for (const item of tank.placedDecor || []) {
    for (const service of getDecorBoroughServiceTypes(item)) {
      if (service === "home") scores.residential += 3;
      if (service === "food") scores.food += 3;
      if (service === "clinic") scores.healthcare += 3;
      if (service === "social") scores.social += 3;
      if (service === "rest") scores.rest += 3;
      if (service === "nursery") scores.nursery += 3;
    }
  }
  scores.residential += Math.min(4, (tank.fish || []).filter((fish) => getFishResidenceDecorId(fish)).length);
  scores.explorer += Math.min(4, (tank.events || []).filter((event) => event.type === "travel" && Date.now() - event.time < 7 * DAY_MS).length / 2);
  const ranking = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  const best = ranking[0];
  const second = ranking[1];
  if (!best || best[1] < 3 || (second && best[1] - second[1] < 2)) {
    return { id: "mixed", label: "Mixed Neighborhood", scores };
  }
  const labels = {
    residential: "Residential Neighborhood",
    food: "Food District",
    healthcare: "Healthcare District",
    social: "Social District",
    rest: "Rest District",
    nursery: "Nursery District",
    explorer: "Explorer District"
  };
  return { id: best[0], label: labels[best[0]], scores };
}

function getNeighborhoodServiceSummary(tank = getCurrentTank()) {
  const services = new Set(getBoroughSectionServiceTypes(tank));
  const residenceItems = getBoroughSectionServiceCandidates(tank, "home");
  const capacity = residenceItems.reduce((total, item) => total + getDecorResidenceCapacity(item), 0);
  const occupied = (tank?.fish || []).filter((fish) => getFishResidenceDecorId(fish)).length;
  return {
    homes: { occupied, capacity, available: capacity > occupied },
    food: services.has("food"),
    clinic: services.has("clinic"),
    social: services.has("social"),
    nursery: services.has("nursery"),
    rest: services.has("rest")
  };
}

function buildDailyRecapNarrative(rows = [], tank = null) {
  const events = Array.isArray(rows) ? rows : [];
  const neighborhood = tank ? getTankLabel(tank) : "the borough";
  const meaningful = events.filter((row) => /recovered|ill|died|hatched|egg|birthday|visited|travel|returned home|ate |hungry|clean|comfort|conflict/i.test(row.text || ""));
  const opening = events.some((row) => Number(row.score) < 0)
    ? `A complicated day in ${neighborhood}.`
    : meaningful.length
      ? `A lively day in ${neighborhood}.`
      : `A peaceful day in ${neighborhood}.`;
  const details = meaningful.slice(0, 3).map((row) => String(row.text || "").replace(/[.!]+$/, ""));
  return details.length ? `${opening} ${details.join(details.length > 1 ? "; " : "")}.` : opening;
}

function getBoroughTravelEdgeDirection(source, destination) {
  const dx = Number(destination?.gridX) - Number(source?.gridX);
  const dy = Number(destination?.gridY) - Number(source?.gridY);
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return "right";
}

function beginBoroughEdgeTravel(move, now = Date.now()) {
  const fish = move?.fish;
  if (!fish || !move.source || !move.destination || runtime.pendingNeighborhoodTravel.has(fish.id)) {
    return false;
  }
  const direction = getBoroughTravelEdgeDirection(move.source, move.destination);
  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  if (fish.caveState) abortFishCaveBehavior(fish, now, false);
  if (direction === "right") {
    fish.targetXNorm = 1.12;
  } else if (direction === "left") {
    fish.targetXNorm = -0.12;
  } else if (direction === "down") {
    fish.targetYNorm = 1.12;
  } else {
    fish.targetYNorm = -0.12;
  }
  fish.lastNeighborhoodMoveAt = now;
  setFishBehaviorIntent(fish, "travel", `heading ${direction} toward ${getTankLabel(move.destination)}`, now, { durationMs: 45 * 1000 });
  runtime.pendingNeighborhoodTravel.set(fish.id, {
    fishId: fish.id,
    sourceTankId: move.source.id,
    destinationTankId: move.destination.id,
    direction,
    startedAt: now,
    // Give an on-screen fish enough time to visibly approach the edge.  The
    // transfer remains discrete and can still complete sooner once it reaches
    // the threshold; off-screen simulation does not need continuous rendering.
    transferAfter: now + 12000,
    neededService: move.neededService || "",
    serviceDestinationId: move.serviceDestination?.id || "",
    residenceDestinationId: move.residenceDestination?.id || ""
  });
  return true;
}

function getTransitTubeTravelPoints(tube) {
  const bounds = getPlacedDecorBounds(tube);
  if (!tube || !bounds) {
    const xNorm = clamp(Number(tube?.xNorm) || 0.5, 0.05, 0.95);
    const flippedY = isDecorVerticallyFlipped(tube);
    const openingYNorm = clamp((Number(tube?.yNorm) || 0.5) + (flippedY ? 0.16 : -0.16), 0.08, 0.88);
    const travelDirection = flippedY ? -1 : 1;
    return {
      opening: { xNorm, yNorm: openingYNorm },
      inside: { xNorm, yNorm: clamp(openingYNorm + travelDirection * 0.07, 0.08, 0.92) },
      exit: { xNorm, yNorm: openingYNorm - travelDirection * 0.07 },
      below: { xNorm, yNorm: openingYNorm + travelDirection * 0.3 },
      openingRadiusPx: 34
    };
  }

  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const xNorm = clamp((bounds.left + width / 2) / TANK_WIDTH, 0.05, 0.95);
  const flippedY = isDecorVerticallyFlipped(tube);

  // The transit-tube sprite is a straight cylinder whose usable opening is at
  // the TOP of the source image. Vertical flipping moves that image-top to the
  // bottom of the placed sprite, so the entire fish transit path must flip too.
  // Source travel always runs from image-top through image-bottom and beyond.
  const openingY = flippedY
    ? bounds.bottom - height * 0.055
    : bounds.top + height * 0.055;
  const insideY = flippedY
    ? bounds.bottom - height * 0.3
    : bounds.top + height * 0.3;
  const farOutsideDistance = Math.max(55, height * 0.22);
  const farOutsideY = flippedY
    ? bounds.top - farOutsideDistance
    : bounds.bottom + farOutsideDistance;
  const openingOutsideY = flippedY
    ? bounds.bottom + farOutsideDistance
    : bounds.top - farOutsideDistance;

  return {
    opening: { xNorm, yNorm: openingY / TANK_HEIGHT },
    inside: { xNorm, yNorm: insideY / TANK_HEIGHT },
    // Destination fish travels from the far end of the tube back out through
    // the image-top opening. These points therefore reverse automatically when
    // the decor is vertically flipped.
    exit: { xNorm, yNorm: openingOutsideY / TANK_HEIGHT },
    below: { xNorm, yNorm: farOutsideY / TANK_HEIGHT },
    openingRadiusPx: clamp(width * 0.26, 26, 58)
  };
}

function isFishAtTransitTubePoint(fish, point, radiusPx = 34) {
  if (!fish || !point) {
    return false;
  }
  return Math.hypot(
    (Number(fish.xNorm) - point.xNorm) * TANK_WIDTH,
    (Number(fish.yNorm) - point.yNorm) * TANK_HEIGHT
  ) <= radiusPx;
}

function beginBoroughTubeTravel(move, now = Date.now()) {
  const fish = move?.fish;
  const sourceTube = move?.tubeJourney?.sourceTube;
  const targetTube = move?.tubeJourney?.targetTube;
  if (!fish || !move.source || !move.destination || !sourceTube || !targetTube || runtime.pendingNeighborhoodTravel.has(fish.id)) {
    return false;
  }
  const sourcePoints = getTransitTubeTravelPoints(sourceTube);
  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  if (fish.caveState) abortFishCaveBehavior(fish, now, false);
  fish.targetXNorm = sourcePoints.opening.xNorm;
  fish.targetYNorm = sourcePoints.opening.yNorm;
  fish.targetAt = now + 60 * 1000;
  fish.lastNeighborhoodMoveAt = now;
  setFishBehaviorIntent(fish, "travel", `swimming to ${getTransitTubeDisplayName(sourceTube, move.source)}`, now, { durationMs: 45 * 1000 });
  runtime.pendingNeighborhoodTravel.set(fish.id, {
    mode: "tube",
    fishId: fish.id,
    sourceTankId: move.source.id,
    destinationTankId: move.destination.id,
    sourceTubeId: sourceTube.id,
    targetTubeId: targetTube.id,
    phase: "approach",
    startedAt: now,
    approachDeadline: now + 18 * 1000,
    neededService: move.neededService || "",
    serviceDestinationId: move.serviceDestination?.id || "",
    residenceDestinationId: move.residenceDestination?.id || ""
  });
  return true;
}

function completeBoroughTubeTravel(pending, now = Date.now()) {
  const source = getTankById(pending?.sourceTankId);
  const destination = getTankById(pending?.destinationTankId);
  const sourceTube = source?.placedDecor?.find((item) => item.id === pending?.sourceTubeId);
  const targetTube = destination?.placedDecor?.find((item) => item.id === pending?.targetTubeId);
  const sourceIndex = source?.fish?.findIndex((fish) => fish.id === pending?.fishId) ?? -1;
  const fish = sourceIndex >= 0 ? source.fish[sourceIndex] : null;
  if (!fish || !destination || !sourceTube || !targetTube || destination.fish.some((entry) => entry.id === fish.id)) {
    runtime.pendingNeighborhoodTravel.delete(pending?.fishId);
    return false;
  }
  const targetPoints = getTransitTubeTravelPoints(targetTube);
  source.fish.splice(sourceIndex, 1);
  // Start inside the destination cylinder and swim upward through its open
  // rim. This mirrors the source-side descent instead of popping beside it.
  fish.xNorm = targetPoints.below.xNorm;
  fish.yNorm = targetPoints.below.yNorm;
  fish.targetXNorm = targetPoints.exit.xNorm;
  fish.targetYNorm = targetPoints.exit.yNorm;
  fish.targetAt = now + 60 * 1000;
  fish.coarseActivity = null;
  fish.lastCoarseSimulatedAt = now;
  fish.visitedNeighborhoodIds = [...new Set([...(fish.visitedNeighborhoodIds || []), destination.id])].slice(-64);
  destination.fish.push(fish);
  if (runtime.foodTravelDestinations.get(fish.id) === destination.id) {
    runtime.foodTravelDestinations.delete(fish.id);
  }
  runtime.transitTubeBursts.push(
    { tankId: destination.id, decorId: targetTube.id, mode: "exit", startedAt: now, endsAt: now + 1600 }
  );
  const serviceTank = getTankById(pending.serviceDestinationId);
  const homeTank = getTankById(pending.residenceDestinationId);
  const cause = pending.neededService && serviceTank
    ? `${getBoroughServiceLabel(pending.neededService)} in ${getTankLabel(serviceTank)}`
    : homeTank
      ? `home in ${getTankLabel(homeTank)}`
      : getTankLabel(destination);
  setFishBehaviorIntent(fish, pending.neededService || homeTank ? "travel" : "explore", `emerging from ${getTransitTubeDisplayName(targetTube, destination)}`, now, { durationMs: 18 * 1000 });
  pushEvent(`${fish.name} used a Transit Tube to ${getTankLabel(destination)}.`, now, destination, {
    type: "travel",
    fishId: fish.id,
    sourceTankId: source.id,
    destinationTankId: destination.id,
    serviceType: pending.neededService,
    travelReason: cause,
    detail: "Transit Tube journey"
  });
  pending.phase = "emerging";
  pending.destinationStartedAt = now;
  pending.emergeDeadline = now + 6500;
  return true;
}

function isFishAtBoroughTravelEdge(fish, direction) {
  if (!fish) return false;
  if (direction === "right") return Number(fish.xNorm) >= 1.08;
  if (direction === "left") return Number(fish.xNorm) <= -0.08;
  if (direction === "down") return Number(fish.yNorm) >= 1.08;
  return Number(fish.yNorm) <= -0.08;
}

function completeBoroughEdgeTravel(pending, now = Date.now()) {
  const source = getAllTanks(state).find((tank) => tank.id === pending?.sourceTankId);
  const destination = getAllTanks(state).find((tank) => tank.id === pending?.destinationTankId);
  const sourceIndex = source?.fish?.findIndex((fish) => fish.id === pending?.fishId) ?? -1;
  const fish = sourceIndex >= 0 ? source.fish[sourceIndex] : null;
  if (!fish || !destination || destination.fish.some((entry) => entry.id === fish.id)) {
    runtime.pendingNeighborhoodTravel.delete(pending?.fishId);
    return false;
  }
  source.fish.splice(sourceIndex, 1);
  const direction = pending.direction;
  if (direction === "right") {
    fish.xNorm = -0.1; fish.targetXNorm = 0.32;
  } else if (direction === "left") {
    fish.xNorm = 1.1; fish.targetXNorm = 0.68;
  } else if (direction === "down") {
    fish.yNorm = -0.1; fish.targetYNorm = 0.32;
  } else {
    fish.yNorm = 1.1; fish.targetYNorm = 0.68;
  }
  fish.coarseActivity = null;
  fish.lastCoarseSimulatedAt = now;
  fish.visitedNeighborhoodIds = [...new Set([...(fish.visitedNeighborhoodIds || []), destination.id])].slice(-64);
  destination.fish.push(fish);
  if (runtime.foodTravelDestinations.get(fish.id) === destination.id) {
    runtime.foodTravelDestinations.delete(fish.id);
  }
  runtime.boroughEdgeBursts.push(
    { tankId: source.id, direction, mode: "depart", startedAt: now, endsAt: now + 1200 },
    { tankId: destination.id, direction, mode: "arrive", startedAt: now, endsAt: now + 1400 }
  );
  const serviceTank = getAllTanks(state).find((tank) => tank.id === pending.serviceDestinationId);
  const homeTank = getAllTanks(state).find((tank) => tank.id === pending.residenceDestinationId);
  const cause = pending.neededService && serviceTank
    ? `${getBoroughServiceLabel(pending.neededService)} in ${getTankLabel(serviceTank)}`
    : homeTank
      ? `home in ${getTankLabel(homeTank)}`
      : getTankLabel(destination);
  setFishBehaviorIntent(fish, pending.neededService || homeTank ? "travel" : "explore", `arriving from ${getTankLabel(source)}`, now, { durationMs: 18 * 1000 });
  pushEvent(`${fish.name} → ${getTankLabel(destination)}`, now, destination, {
    type: homeTank ? "residence" : "travel",
    fishId: fish.id,
    sourceTankId: source.id,
    destinationTankId: destination.id,
    serviceType: pending.neededService,
    travelReason: cause,
    detail: homeTank ? "Returning home" : pending.neededService ? `Looking for ${getBoroughServiceLabel(pending.neededService).toLowerCase()}` : "Exploring"
  });
  runtime.pendingNeighborhoodTravel.delete(fish.id);
  return true;
}

function processPendingNeighborhoodTravel(now = Date.now()) {
  let changed = false;
  for (const pending of [...runtime.pendingNeighborhoodTravel.values()]) {
    const source = getAllTanks(state).find((tank) => tank.id === pending.sourceTankId);
    const destination = getTankById(pending.destinationTankId);
    const fishTank = pending.mode === "tube" && pending.phase === "emerging" ? destination : source;
    const fish = fishTank?.fish?.find((entry) => entry.id === pending.fishId);
    if (!fish || isFishDead(fish)) {
      runtime.pendingNeighborhoodTravel.delete(pending.fishId);
      continue;
    }
    if (pending.mode === "tube") {
      const sourceTube = source?.placedDecor?.find((item) => item.id === pending.sourceTubeId);
      const targetTube = destination?.placedDecor?.find((item) => item.id === pending.targetTubeId);
      if (!sourceTube || !targetTube) {
        runtime.pendingNeighborhoodTravel.delete(pending.fishId);
        continue;
      }
      const activeTube = pending.phase === "emerging" ? targetTube : sourceTube;
      const points = getTransitTubeTravelPoints(activeTube);
      const sourceIsVisible = getCurrentTank()?.id === fishTank?.id && !runtime.boroughOverviewOpen;
      if (pending.phase === "approach") {
        fish.targetXNorm = points.opening.xNorm;
        fish.targetYNorm = points.opening.yNorm;
        fish.targetAt = now + 60 * 1000;
        if (isFishAtTransitTubePoint(fish, points.opening, points.openingRadiusPx)
          || (!sourceIsVisible && now >= pending.approachDeadline)) {
          if (!sourceIsVisible && !isFishAtTransitTubePoint(fish, points.opening, points.openingRadiusPx)) {
            fish.xNorm = points.opening.xNorm;
            fish.yNorm = points.opening.yNorm;
          }
          pending.phase = "entering";
          pending.entryDeadline = now + 6500;
          fish.targetXNorm = points.below.xNorm;
          fish.targetYNorm = points.below.yNorm;
          fish.targetAt = now + 60 * 1000;
          runtime.transitTubeBursts.push({
            tankId: source.id,
            decorId: sourceTube.id,
            mode: "enter",
            startedAt: now,
            endsAt: now + 1600
          });
        }
      } else if (pending.phase === "entering") {
        fish.targetXNorm = points.below.xNorm;
        fish.targetYNorm = points.below.yNorm;
        fish.targetAt = now + 60 * 1000;
        if (isFishAtTransitTubePoint(fish, points.below, Math.max(24, points.openingRadiusPx * 0.72))
          || (!sourceIsVisible && now >= pending.entryDeadline)) {
          pending.phase = "waiting";
          pending.transferReadyAt = now + 1000;
        }
      } else if (pending.phase === "waiting") {
        fish.xNorm = points.below.xNorm;
        fish.yNorm = points.below.yNorm;
        if (now >= pending.transferReadyAt) changed = completeBoroughTubeTravel(pending, now) || changed;
      } else if (pending.phase === "emerging") {
        fish.targetXNorm = points.exit.xNorm;
        fish.targetYNorm = points.exit.yNorm;
        fish.targetAt = now + 60 * 1000;
        if (isFishAtTransitTubePoint(fish, points.exit, Math.max(20, points.openingRadiusPx * .55)) || (!sourceIsVisible && now >= pending.emergeDeadline)) {
          runtime.pendingNeighborhoodTravel.delete(fish.id);
          fish.targetXNorm = clamp(points.exit.xNorm + randomBetween(-.16, .16), .12, .88);
          fish.targetYNorm = clamp(points.exit.yNorm - .04, .14, .72);
        }
      }
    } else if (isFishAtBoroughTravelEdge(fish, pending.direction) || now >= pending.transferAfter) {
      changed = completeBoroughEdgeTravel(pending, now) || changed;
    }
  }
  runtime.boroughEdgeBursts = runtime.boroughEdgeBursts.filter((burst) => burst.endsAt > now);
  return changed;
}

function drawBoroughEdgeBursts(now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank || !runtime.boroughEdgeBursts?.length) {
    return;
  }
  const bursts = runtime.boroughEdgeBursts.filter((entry) => entry.tankId === tank.id && entry.endsAt > now);
  const portable = isPortablePerformanceModeActive();
  for (const burst of bursts) {
    const progress = clamp((now - burst.startedAt) / Math.max(1, burst.endsAt - burst.startedAt), 0, 1);
    const alpha = Math.sin(progress * Math.PI) * (portable ? 0.42 : 0.68);
    const isArrival = burst.mode === "arrive";
    const edgeDirection = isArrival
      ? ({ right: "left", left: "right", down: "up", up: "down" })[burst.direction]
      : burst.direction;
    const count = portable ? 4 : 8;
    for (let index = 0; index < count; index += 1) {
      const phase = (index + progress * 2.4) / count;
      const along = 0.34 + (index / Math.max(1, count - 1)) * 0.32;
      const inward = 10 + Math.sin(phase * Math.PI * 2) * 6;
      const x = edgeDirection === "left" ? inward : edgeDirection === "right" ? TANK_WIDTH - inward : along * TANK_WIDTH;
      const y = edgeDirection === "up" ? inward : edgeDirection === "down" ? TANK_HEIGHT - inward : along * TANK_HEIGHT;
      drawBubbleOrbToContext(tankContext, x, y, 3 + (index % 3) * 1.5, alpha, 1, null, 1);
    }
  }
}

function getBoroughStructureOccupants(item, tank = getCurrentTank()) {
  if (!item || !tank) {
    return [];
  }
  return (tank.fish || []).filter((fish) => (
    fish && !isFishDead(fish) && (
      fish.boroughServiceTargetDecorId === item.id
      || (getFishResidenceDecorId(fish) === item.id && ["rest", "sleep", "hide"].includes(String(fish.activity || fish.behaviorIntent?.action || "").toLowerCase()))
    )
  ));
}

function drawBoroughStructureActivityEffects(now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank || isPortablePerformanceModeActive() && runtime.boroughOverviewOpen) {
    return;
  }
  for (const item of tank.placedDecor || []) {
    const services = getDecorBoroughServiceTypes(item);
    if (!services.length) {
      continue;
    }
    const occupants = getBoroughStructureOccupants(item, tank);
    const residentsHome = services.includes("home") && getDecorResidents(item.id).some((fish) => {
      const dx = Number(fish.xNorm) - Number(item.xNorm);
      const dy = Number(fish.yNorm) - Number(item.yNorm);
      return Math.hypot(dx, dy) < 0.2;
    });
    if (!occupants.length && !residentsHome) {
      continue;
    }
    const x = Number(item.xNorm) * TANK_WIDTH;
    const y = Number(item.yNorm) * TANK_HEIGHT - 40;
    const pulse = 0.5 + Math.sin(now / 420 + hashStringToUint32(item.id) % 7) * 0.5;
    tankContext.save();
    tankContext.globalAlpha = (isPortablePerformanceModeActive() ? 0.22 : 0.38) + pulse * 0.12;
    if (services.includes("clinic")) {
      // Clinic activity remains functional, but no pulsing ring is drawn in the tank.
    } else if (services.includes("rest")) {
      const glow = tankContext.createRadialGradient(x, y, 2, x, y, 58);
      glow.addColorStop(0, "rgba(173,139,255,.5)");
      glow.addColorStop(1, "rgba(65,34,104,0)");
      tankContext.fillStyle = glow;
      tankContext.fillRect(x - 60, y - 60, 120, 120);
    } else if (services.includes("nursery")) {
      tankContext.fillStyle = "#ff9fcb";
      tankContext.font = "24px sans-serif";
      tankContext.fillText("♥", x - 8 + Math.sin(now / 500) * 5, y - 28 - pulse * 12);
    } else if (services.includes("food")) {
      const particleCount = isPortablePerformanceModeActive() ? 3 : 6;
      tankContext.fillStyle = "rgba(255, 205, 92, .82)";
      for (let index = 0; index < particleCount; index += 1) {
        const angle = now / 720 + index * 2.17;
        const radius = 10 + (index % 3) * 7 + pulse * 3;
        tankContext.beginPath();
        tankContext.arc(x + Math.cos(angle) * radius, y - 14 + Math.sin(angle * 1.3) * radius * 0.45, 2 + (index % 2), 0, Math.PI * 2);
        tankContext.fill();
      }
    } else {
      const bubbleCount = services.includes("social") ? Math.min(8, 2 + occupants.length * 2) : 3;
      for (let index = 0; index < bubbleCount; index += 1) {
        drawBubbleOrbToContext(tankContext, x - 24 + index * 9, y - 14 - ((now / 18 + index * 17) % 48), 3 + index % 2, 0.34, 1, null, 1);
      }
    }
    if (services.includes("home") && residentsHome) {
      tankContext.fillStyle = "rgba(255,226,132,.75)";
      tankContext.beginPath();
      tankContext.arc(x, y - 20, 5 + pulse * 2, 0, Math.PI * 2);
      tankContext.fill();
    }
    tankContext.restore();
  }
}

function buildFishIndividualityMarkup(fish, now = Date.now(), options = {}) {
  if (!fish) {
    return "";
  }
  const tank = getTankContainingFish(fish.id);
  const rows = [];
  if (tank) {
    rows.push(["Neighborhood", getTankLabel(tank)]);
  }
  const residenceId = getFishResidenceDecorId(fish);
  const residence = residenceId ? getAllPlacedDecor(state).find((item) => item.id === residenceId) : null;
  if (residence) {
    rows.push(["Lives at", runtime.decorMap.get(residence.decorKey)?.name || titleFromFile(residence.decorKey)]);
  } else if (!options.dead) {
    rows.push(["Home", "Nomadic"]);
  }
  const serviceTarget = fish.boroughServiceTargetDecorId
    ? getAllPlacedDecor(state).find((item) => item.id === fish.boroughServiceTargetDecorId)
    : null;
  if (serviceTarget) {
    rows.push(["Currently", `Visiting ${runtime.decorMap.get(serviceTarget.decorKey)?.name || getBoroughServiceLabel(fish.boroughServiceType)}`]);
  } else if (fish.behaviorIntent?.action) {
    const target = fish.behaviorIntent.target ? ` · ${fish.behaviorIntent.target}` : "";
    rows.push(["Currently", `${titleFromFile(fish.behaviorIntent.action)}${target}`]);
  } else if (fish.activity && !options.dead) {
    rows.push(["Currently", titleFromFile(fish.activity)]);
  }
  if (fish.favoriteSpot?.decorId) {
    const favorite = getAllPlacedDecor(state).find((item) => item.id === fish.favoriteSpot.decorId);
    if (favorite) {
      rows.push(["Favorite spot", runtime.decorMap.get(favorite.decorKey)?.name || titleFromFile(favorite.decorKey)]);
    }
  }
  const relationships = Object.entries(sanitizeFishRelationships(fish.relationships));
  const knownFish = new Map([...getAllTankFish(state), ...(state?.storedFish || [])].map((entry) => [entry.id, entry]));
  const liked = relationships.filter(([, relation]) => Number(relation.score) >= 25).sort((a, b) => b[1].score - a[1].score)[0];
  const disliked = relationships.filter(([, relation]) => Number(relation.score) <= -25).sort((a, b) => a[1].score - b[1].score)[0];
  if (liked && knownFish.get(liked[0])) rows.push(["Likes", knownFish.get(liked[0]).name]);
  if (disliked && knownFish.get(disliked[0])) rows.push(["Avoids", knownFish.get(disliked[0]).name]);
  const recent = getAllTanks(state).flatMap((entry) => entry.events || [])
    .filter((event) => event.fishId === fish.id && event.recapEligible !== false)
    .sort((left, right) => right.time - left.time)[0];
  if (recent) {
    rows.push(["Recent", recent.text]);
  }
  const exploredCount = Math.max(1, new Set(fish.visitedNeighborhoodIds || (tank ? [tank.id] : [])).size);
  rows.push(["Explored", `${exploredCount} ${pluralize("neighborhood", exploredCount)}`]);
  return rows.slice(0, 8).map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function buildMemorialHistoryMarkup() {
  const records = sanitizeMemorialHistory(state?.memorialHistory);
  if (!records.length) {
    return "";
  }
  const cards = records.slice(0, 12).map((record) => {
    const livedDays = record.acquiredAt ? Math.max(0, Math.floor((record.deathAt - record.acquiredAt) / DAY_MS)) : null;
    const detail = [
      record.speciesName,
      record.neighborhoodName,
      livedDays === null ? "" : `${livedDays} ${pluralize("day", livedDays)}`
    ].filter(Boolean).join(" · ");
    return `<article class="borough-memorial-card"><strong>${escapeHtml(record.name)}</strong><span>${escapeHtml(detail)}</span><small>${escapeHtml(record.cause || "Remembered by the borough")}</small></article>`;
  }).join("");
  return `<section class="borough-memorials"><div class="compact-heading"><h3>Borough Memorials</h3><p>A quiet record of fish who lived here.</p></div><div class="borough-memorial-grid">${cards}</div></section>`;
}

function buildBoroughHappeningsFeedMarkup(limit = 5) {
  const happenings = sanitizeBoroughHappenings(state?.boroughHappenings).slice(0, Math.max(1, limit));
  if (!happenings.length) {
    return `<div class="empty-state">The borough is quiet right now. Meaningful visits, discoveries, and milestones will appear here.</div>`;
  }
  return `<div class="borough-happenings-feed">${happenings.map((entry) => `<article><span>${escapeHtml(entry.text)}</span><small>${escapeHtml(formatDuration(Math.max(0, getBoroughReferenceNow() - entry.time)))} ago</small></article>`).join("")}</div>`;
}

function shouldShowFishBirthdayHat(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return false;
  }
  const ageDays = getFishAgeDays(fish, now);
  return runtime.debugBirthdayHatFishIds.has(fish.id) || FISH_AGE_MILESTONE_DAYS.includes(ageDays);
}

function getFishBirthdayHatImageAnchor(mask) {
  if (!mask?.alpha?.length || !mask.width || !mask.height) {
    return null;
  }
  if (mask.fishBirthdayHatImageAnchor) {
    return mask.fishBirthdayHatImageAnchor;
  }
  const bounds = mask.bounds || { minX: 0, minY: 0, maxX: mask.width - 1, maxY: mask.height - 1 };
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  // Stock and imported fish face right in their source image. Sample a narrow
  // band just behind the alpha-derived mouth rather than using the overall
  // image top, which is often a dorsal fin or a transparent margin.
  const centerX = clamp(Math.round(bounds.maxX - spanX * 0.17), bounds.minX, bounds.maxX);
  const radius = Math.max(2, Math.round(spanX * 0.035));
  const samples = [];
  for (let x = Math.max(bounds.minX, centerX - radius); x <= Math.min(bounds.maxX, centerX + radius); x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      if (mask.alpha[(y * mask.width + x) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
        samples.push({ x, y });
        break;
      }
    }
  }
  if (!samples.length) {
    return null;
  }
  const sortedY = samples.map((sample) => sample.y).sort((left, right) => left - right);
  const topY = sortedY[Math.floor(sortedY.length * 0.55)];
  const surfaceSamples = samples.filter((sample) => Math.abs(sample.y - topY) <= Math.max(2, mask.height * 0.025));
  const anchorX = surfaceSamples.length
    ? surfaceSamples.reduce((total, sample) => total + sample.x, 0) / surfaceSamples.length
    : centerX;
  const anchor = {
    u: clamp(anchorX / Math.max(1, mask.width - 1), 0, 1),
    v: clamp((topY + 1) / Math.max(1, mask.height - 1), 0, 1)
  };
  mask.fishBirthdayHatImageAnchor = anchor;
  return anchor;
}

function getFishBirthdayHatWorldPose(fish, pose, width, height, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const imagePath = getFishDisplayAssetPath(fish, species, now) || species?.asset;
  const mask = imagePath ? getImageAlphaMask(imagePath) : null;
  const anchor = getFishBirthdayHatImageAnchor(mask) || { u: 0.77, v: 0.18 };
  const bodyScaleX = pose.bodyScaleX || 1;
  const bodyScaleY = pose.bodyScaleY || 1;
  const tilt = pose.tilt || 0;
  const facingScaleX = pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1);
  const wiggleX = (pose.wiggle || 0) * width * 0.018;
  const localX = (-width / 2 + wiggleX + anchor.u * width) * bodyScaleX;
  const localY = (-height / 2 + anchor.v * height) * bodyScaleY;
  const useSuckerFacePivot = SUCKER_FISH_FACE_PIVOT_ENABLED
    && !pose.isDead
    && getEffectiveFishBehavior(fish, species) === "sucker";
  const drawX = -width / 2 + wiggleX;
  const pivotX = useSuckerFacePivot ? drawX + width * SUCKER_FISH_FACE_PIVOT_X : 0;
  const pivotY = useSuckerFacePivot ? -height / 2 + height * SUCKER_FISH_FACE_PIVOT_Y : 0;
  const pivotedX = useSuckerFacePivot ? localX - pivotX : localX;
  const pivotedY = useSuckerFacePivot ? localY - pivotY : localY;
  const rotatedX = Math.cos(tilt) * pivotedX - Math.sin(tilt) * pivotedY + (useSuckerFacePivot ? pivotX : 0);
  const rotatedY = Math.sin(tilt) * pivotedX + Math.cos(tilt) * pivotedY + (useSuckerFacePivot ? pivotY : 0);
  return {
    x: pose.x + pose.swayX + facingScaleX * rotatedX,
    y: pose.y + rotatedY,
    rotation: tilt * facingScaleX
  };
}

function drawFishBirthdayHat(fish, pose, width, height, now = Date.now()) {
  if (!shouldShowFishBirthdayHat(fish, now) || isPortablePerformanceModeActive()) {
    return;
  }
  const anchor = getFishBirthdayHatWorldPose(fish, pose, width, height, now);
  const stableScale = getViewportStableAssetScale();
  // Both dimensions already include the player's per-fish size setting, layer
  // depth, viewport scale, and seasonal artwork aspect ratio.
  const hatHeight = Math.max(8 * stableScale, Math.min(width * 0.24, height * 0.68));
  const hatWidth = hatHeight * 0.78;
  tankContext.save();
  // Sink the base a few rendered pixels into the first opaque head pixels so
  // antialiasing and sparse skeleton artwork cannot create a visible gap.
  tankContext.translate(anchor.x, anchor.y + Math.max(2.5 * stableScale, height * 0.018));
  tankContext.rotate(anchor.rotation + Math.sin(now / 420 + hashStringToUint32(fish.id)) * 0.025);
  tankContext.fillStyle = "#7ce7ff";
  tankContext.beginPath();
  tankContext.moveTo(0, -hatHeight);
  tankContext.lineTo(-hatWidth / 2, 0);
  tankContext.lineTo(hatWidth / 2, 0);
  tankContext.closePath();
  tankContext.fill();
  tankContext.fillStyle = "#ff83bd";
  tankContext.beginPath();
  tankContext.arc(0, -hatHeight, Math.max(3, hatWidth * 0.13), 0, Math.PI * 2);
  tankContext.fill();
  tankContext.strokeStyle = "rgba(255,255,255,.8)";
  tankContext.lineWidth = 2;
  tankContext.beginPath();
  tankContext.moveTo(-hatWidth / 2, 0);
  tankContext.lineTo(hatWidth / 2, 0);
  tankContext.stroke();
  tankContext.restore();
}

function drawBoroughOverviewStructureActivity(context, tank, width, height, now = Date.now()) {
  if (!context || !tank) {
    return;
  }
  const portable = isPortablePerformanceModeActive();
  for (const item of tank.placedDecor || []) {
    const occupants = getBoroughStructureOccupants(item, tank);
    if (!occupants.length) {
      continue;
    }
    const services = getDecorBoroughServiceTypes(item);
    const x = clamp(Number(item.xNorm) || 0.5, 0.03, 0.97) * width;
    const y = clamp(Number(item.yNorm) || 0.6, 0.06, 0.94) * height;
    const pulse = 0.5 + Math.sin(now / 430 + hashStringToUint32(item.id) % 9) * 0.5;
    const color = services.includes("clinic") ? "#9dfff1"
      : services.includes("nursery") ? "#ff9fcb"
        : services.includes("food") ? "#ffd36b"
          : services.includes("rest") ? "#c8aeff"
            : "#7ce7ff";
    context.save();
    context.globalAlpha = portable ? 0.45 : 0.68;
    context.strokeStyle = color;
    context.lineWidth = portable ? 1 : 1.5;
    context.beginPath();
    context.arc(x, y, 3 + Math.min(5, occupants.length) + pulse * 3, 0, Math.PI * 2);
    context.stroke();
    if (!portable) {
      context.fillStyle = color;
      const particleCount = Math.min(4, 1 + occupants.length);
      for (let index = 0; index < particleCount; index += 1) {
        context.beginPath();
        context.arc(x - 5 + index * 4, y - 7 - ((now / 90 + index * 5) % 8), 1.25, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
  }
}

function advanceDebugSimulationClock(realNow = Date.now()) {
  if (!isDebugModeEnabled()) {
    runtime.debugSimulatedNow = null;
    runtime.debugSimulationLastRealAt = realNow;
    return realNow;
  }
  const lastReal = Number(runtime.debugSimulationLastRealAt) || realNow;
  runtime.debugSimulationLastRealAt = realNow;
  if (runtime.debugSimulationPaused) {
    runtime.debugSimulatedNow = Number(runtime.debugSimulatedNow) || realNow;
    return runtime.debugSimulatedNow;
  }
  const scale = Math.max(1, Number(runtime.debugTimeScale) || 1);
  if (scale === 1 && !Number.isFinite(Number(runtime.debugSimulatedNow))) {
    return realNow;
  }
  runtime.debugSimulatedNow = (Number(runtime.debugSimulatedNow) || lastReal) + Math.max(0, realNow - lastReal) * scale;
  return runtime.debugSimulatedNow;
}

function getSelectedLivingBoroughDebugFish() {
  return getManagedFishById(runtime.selectedFishId || runtime.selectedFishStatusFishId)?.fish || null;
}

function buildLivingBoroughDebugFishStateMarkup(fish, now = Date.now()) {
  if (!fish) {
    return "";
  }
  const species = getSpeciesForFish(fish);
  const tank = getTankContainingFish(fish.id);
  const queue = getFishActionQueueState(fish.id);
  const pending = runtime.pendingNeighborhoodTravel.get(fish.id);
  const residence = getTankContainingDecor(getFishResidenceDecorId(fish));
  const favorite = fish.favoriteSpot?.decorId ? getAllPlacedDecor(state).find((item) => item.id === fish.favoriteSpot.decorId) : null;
  const needs = sanitizeFishNeeds(fish.needs, fish, now);
  const facts = [
    ["Species", species?.name || fish.speciesId],
    ["Position", `${Number(fish.xNorm || 0).toFixed(3)}, ${Number(fish.yNorm || 0).toFixed(3)} · layer ${getFishTankLayer(fish)}`],
    ["Action", queue?.active?.label || fish.behaviorIntent?.action || fish.activity || "swim"],
    ["Action target", queue?.active?.targetId || fish.behaviorIntent?.target || fish.actionTargetFishId || "none"],
    ["Queue", `${queue?.items?.length || 0} waiting · priority ${queue?.active?.priority || 0}${runtime.debugAutonomyPausedFishIds.has(fish.id) ? " · autonomy paused" : ""}`],
    ["Travel", pending ? `${pending.direction} → ${getTankLabel(getTankById(pending.destinationTankId))}` : `${fish.travelReason || "none"} · directed cooldown ${Math.max(0, Math.ceil(((Number(fish.lastNeighborhoodMoveAt) || 0) + 25 * 1000 - now) / 1000))}s`],
    ["Residence", residence ? getTankLabel(residence) : "unassigned"],
    ["Service", fish.boroughServiceType || fish.neededBoroughService || "none"],
    ["Relationships", `${Object.keys(sanitizeFishRelationships(fish.relationships)).length} tracked`],
    ["Favorite", favorite ? runtime.decorMap.get(favorite.decorKey)?.name || titleFromFile(favorite.decorKey) : "not tracked"],
    ["Age", `${getFishAgeDays(fish, now)} days`],
    ["Health", `${Math.max(0, Number(fish.healthUnits) || 0)}/${getFishMaxHealthUnits(fish)} · ${fish.diseaseState || fish.illnessType || "healthy"}`],
    ["Needs", Object.entries(needs).map(([key, value]) => `${key} ${Math.round(value)}`).join(" · ")],
    ["State", `stress ${Math.round(Number(fish.stress) || 0)} · feeding ${fish.feedingState || fish.activity === "eat" ? "active" : "idle"} · breeding ${fish.breedingState || "idle"}`],
    ["Personality", fish.personality || species?.swimStyle || "standard"]
  ];
  return `<div class="debug-living-inspector">${facts.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
}

function buildLivingBoroughDebugButtons(entries) {
  return entries.map(([action, label, value = ""]) => `<button class="debug-menu-button" type="button" data-debug-borough-action="${escapeHtml(action)}"${value !== "" ? ` data-debug-borough-value="${escapeHtml(value)}"` : ""}><span>${escapeHtml(label)}</span></button>`).join("");
}

function buildLivingBoroughDebugSection(title, entries, extra = "") {
  return `<div class="debug-menu-section"><h3>${escapeHtml(title)}:</h3>${extra}<div class="debug-living-controls">${buildLivingBoroughDebugButtons(entries)}</div></div>`;
}

function renderLivingBoroughDebugPanel(now = Date.now()) {
  if (!dom.debugLivingBoroughPanel) {
    return;
  }
  if (!isDebugModeEnabled()) {
    setMarkupIfChanged("debug-living-borough", dom.debugLivingBoroughPanel, "");
    return;
  }
  const fish = getSelectedLivingBoroughDebugFish();
  const tank = fish ? getTankContainingFish(fish.id) : getCurrentTank();
  const pending = fish ? runtime.pendingNeighborhoodTravel.get(fish.id) : null;
  const identity = calculateNeighborhoodIdentity(tank);
  const simulated = new Date(getBoroughReferenceNow(now)).toLocaleString();
  const status = `<div class="debug-living-status"><strong>${fish ? `Selected: ${escapeHtml(fish.name)} (${escapeHtml(fish.id)})` : "Select a fish for fish-specific controls"}</strong><span>Clock: ${escapeHtml(simulated)} · ${runtime.debugSimulationPaused ? "Paused" : `${runtime.debugTimeScale || 1}x`}</span><span>Halloween: ${isHalloweenModeActive(now) ? "Active" : "Inactive"} (${escapeHtml(getHalloweenModeSetting())})</span><span>Neighborhood: ${escapeHtml(tank ? getTankLabel(tank) : "None")} · ${escapeHtml(identity.label)}</span>${pending ? `<span>Travel: ${escapeHtml(pending.direction)} → ${escapeHtml(getTankLabel(getTankById(pending.destinationTankId)))}</span>` : ""}${runtime.debugLivingBoroughOutput ? `<span>${escapeHtml(runtime.debugLivingBoroughOutput)}</span>` : ""}</div>`;
  const needsEditor = fish ? `<div class="debug-living-needs-editor">${["hunger", "energy", "social", "comfort", "hygiene", "environment", "stimulation"].map((key) => `<label>${escapeHtml(titleFromFile(key))}<input type="number" min="0" max="100" step="1" value="${Math.round(sanitizeFishNeeds(fish.needs, fish, now)[key])}" data-debug-fish-need="${escapeHtml(key)}"></label>`).join("")}</div>` : "";
  const markup = status
    + buildLivingBoroughDebugFishStateMarkup(fish, now)
    + buildLivingBoroughDebugSection("Global Time", [["time-pause", runtime.debugSimulationPaused ? "Resume" : "Pause"], ["time-scale", "1x", "1"], ["time-scale", "5x", "5"], ["time-scale", "20x", "20"], ["time-scale", "100x", "100"], ["time-add", "+1 hour", String(HOUR_MS)], ["time-add", "+1 day", String(DAY_MS)], ["time-add", "+7 days", String(7 * DAY_MS)]])
    + buildLivingBoroughDebugSection("Seasonal", [["halloween", "Automatic", "automatic"], ["halloween", "Force On", "on"], ["halloween", "Force Off", "off"], ["fish-visual", "Fish Normal", "normal"], ["fish-visual", "Fish Skeleton", "skeleton"], ["fish-visual", "Fish Zombie", "zombie"], ["halloween-randomize", "Randomize Test Variants"], ["halloween-recalculate", "Deterministic Variants"], ["simulate-date", "October 1", "oct-1"], ["simulate-date", "October 31", "oct-31"], ["simulate-date", "November 1", "nov-1"]])
    + buildLivingBoroughDebugSection("Fish Travel", [["travel", "Force Left", "left"], ["travel", "Force Right", "right"], ["travel", "Force Up", "up"], ["travel", "Force Down", "down"], ["travel-service", "To Food", "food"], ["travel-service", "To Clinic", "clinic"], ["travel-service", "To Social", "social"], ["travel-service", "To Nursery", "nursery"], ["travel-home", "Return Home"], ["travel-random", "Random Explore"], ["travel-complete", "Complete Instantly"], ["travel-cancel", "Cancel Travel"]])
    + buildLivingBoroughDebugSection("Off-screen", [["coarse", "Wandering", "wander"], ["coarse", "Service Visit", "service"], ["coarse", "Resting", "rest"], ["coarse", "Socializing", "social"], ["coarse-materialize", "Materialize"], ["coarse-complete", "Complete Activity"], ["coarse-cancel", "Cancel Activity"]])
    + buildLivingBoroughDebugSection("Fish Inspector", [["action-complete", "Complete Action"], ["action-cancel", "Cancel Action"], ["queue-clear", "Clear Queue"], ["autonomy-force", "Force Decision"], ["autonomy-toggle", runtime.debugAutonomyPausedFishIds.has(fish?.id) ? "Resume Autonomy" : "Pause Autonomy"], ["teleport-center", "Teleport Center"], ["needs", "Needs 0", "0"], ["needs", "Needs 50", "50"], ["needs", "Needs 100", "100"], ["heal", "Heal Fully"], ["damage", "Damage Health"], ["disease", "Apply / Advance Disease"], ["cure", "Cure Disease"], ["age-add", "+1 Day Age", "1"], ["age-add", "+7 Days Age", "7"], ["age-set", "Jump 30 Days", "30"], ["age-set", "Jump 100 Days", "100"], ["age-set", "Jump 365 Days", "365"], ["birthday", "Trigger Birthday"], ["kill", "Kill Fish"], ["revive", "Revive Fish"], ["memorial", "Generate Memorial"]], needsEditor)
    + buildLivingBoroughDebugSection("Social", [["relationship", "Force Like", "friend"], ["relationship", "Force Dislike", "fear"], ["relationship", "Force Neutral", "neutral"], ["behavior", "Greet", "follow"], ["behavior", "Avoid", "avoid"], ["behavior", "Hide", "hide"], ["behavior", "Inspect", "inspect-lure"], ["behavior", "Dig", "dig"]])
    + buildLivingBoroughDebugSection("Happenings & Recap", [["happening-recent", "From Recent Event"], ["happening-ten", "Generate 10 Valid"], ["happening-clear", "Clear Happenings"], ["notification-test", "Test Cooldown"], ["recap-preview", "Preview Recap"], ["recap-generate", "Generate Recap Now"], ["simulate-days", "Simulate 7 Days", "7"], ["simulate-days", "Simulate 30 Days", "30"]])
    + buildLivingBoroughDebugSection("Structures & Residence", [["structure-info", "Selected Structure Info"], ["structure-fill", "Fill With Fish"], ["structure-empty", "Empty Structure"], ["residence-assign", "Assign Fish Here"], ["residence-unassign", "Unassign Fish"], ["residence-clear-orphans", "Clear Orphans"], ["identity", "Recalculate Identity"], ["identity-scores", "Show Identity Scores"]])
    + buildLivingBoroughDebugSection("Overview", [["overview-open", "Open Overview"], ["snapshot-rebuild", "Rebuild Snapshots"], ["snapshot-freeze", runtime.debugSnapshotCacheFrozen ? "Unfreeze Cache" : "Freeze Cache"], ["overview-layout", "Auto Layout", "auto"], ["overview-layout", "Force Normal", "normal"], ["overview-layout", "Force Compact", "compact"], ["overview-layout", "Force Micro", "micro"], ["overview-synthetic", "Real Layout", "0"], ["overview-synthetic", "Preview 1", "1"], ["overview-synthetic", "Preview 5", "5"], ["overview-synthetic", "Preview 10", "10"], ["overview-synthetic", "Preview 25", "25"], ["overview-synthetic", "Preview 50", "50"], ["overview-fps", "Fish 5 FPS", "5"], ["overview-fps", "Fish 12 FPS", "12"], ["overview-fps", "Fish 30 FPS", "30"], ["overview-interpolation", runtime.debugOverviewInterpolationDisabled ? "Enable Interpolation" : "Disable Interpolation"], ["overview-sample", "Force Position Sample"]]);
  setMarkupIfChanged("debug-living-borough", dom.debugLivingBoroughPanel, markup);
}

function forceLivingBoroughDebugTravel(fish, direction, now = Date.now()) {
  const source = getTankContainingFish(fish?.id);
  if (!fish || !source) return false;
  const delta = ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] })[direction];
  const destination = delta ? getAquariumSectionAt(source.gridX + delta[0], source.gridY + delta[1]) : null;
  return destination ? beginBoroughEdgeTravel({ fish, source, destination }, now) : false;
}

function handleLivingBoroughDebugAction(event) {
  const button = event.target instanceof Element ? event.target.closest("[data-debug-borough-action]") : null;
  if (!button || !isDebugModeEnabled()) return;
  const action = button.dataset.debugBoroughAction;
  const value = button.dataset.debugBoroughValue || "";
  const now = getBoroughReferenceNow(Date.now());
  const fish = getSelectedLivingBoroughDebugFish();
  const tank = fish ? getTankContainingFish(fish.id) : getCurrentTank();
  runtime.debugLivingBoroughOutput = "";
  if (action === "time-pause") runtime.debugSimulationPaused = !runtime.debugSimulationPaused;
  else if (action === "time-scale") { runtime.debugTimeScale = Math.max(1, Number(value) || 1); runtime.debugSimulationPaused = false; }
  else if (action === "time-add") { runtime.debugSimulatedNow = now + Number(value); syncState(runtime.debugSimulatedNow); }
  else if (action === "halloween") { runtime.debugHalloweenModeOverride = value; syncHalloweenPresentation(now); }
  else if (action === "fish-visual" && fish) runtime.debugFishVisualOverrides.set(fish.id, value);
  else if (action === "halloween-randomize") runtime.debugHalloweenRandomSalt = createId("season");
  else if (action === "halloween-recalculate") runtime.debugHalloweenRandomSalt = "";
  else if (action === "simulate-date") {
    const year = new Date().getFullYear();
    const parts = value === "oct-31" ? [9, 31] : value === "nov-1" ? [10, 1] : [9, 1];
    runtime.debugSimulatedNow = new Date(year, parts[0], parts[1], 12).getTime();
  } else if (action === "travel" && fish) runtime.debugLivingBoroughOutput = forceLivingBoroughDebugTravel(fish, value, now) ? "Travel staged." : "No connected section in that direction.";
  else if (action === "travel-service" && fish && tank) {
    const route = findNearestBoroughServiceRoute(tank, value);
    runtime.debugLivingBoroughOutput = route && beginBoroughEdgeTravel({ fish, source: tank, destination: route.nextSection, neededService: value, serviceDestination: route.destination }, now) ? "Service travel staged." : "No route to that service.";
  } else if (action === "travel-home" && fish && tank) {
    const home = getTankContainingDecor(getFishResidenceDecorId(fish));
    const route = home ? findAquariumSectionRoute(tank, home) : null;
    runtime.debugLivingBoroughOutput = route && beginBoroughEdgeTravel({ fish, source: tank, destination: route.nextSection, residenceDestination: home }, now) ? "Return-home travel staged." : "No remote residence route.";
  } else if (action === "travel-random" && fish && tank) {
    const target = getAdjacentAquariumSections(tank)[0];
    runtime.debugLivingBoroughOutput = target && beginBoroughEdgeTravel({ fish, source: tank, destination: target }, now) ? "Exploration staged." : "No adjacent section.";
  } else if (action === "travel-complete" && fish) {
    const pending = runtime.pendingNeighborhoodTravel.get(fish.id);
    if (pending) completeBoroughEdgeTravel(pending, now);
  } else if (action === "travel-cancel" && fish) runtime.pendingNeighborhoodTravel.delete(fish.id);
  else if (action === "coarse" && fish && tank) {
    const activity = createCoarseFishActivity(fish, tank, now);
    activity.type = value;
    activity.label = value === "service" ? "Visiting a borough service" : titleFromFile(value);
    fish.coarseActivity = activity;
  } else if (action === "coarse-materialize" && tank) materializeCoarseFishActivities(tank, now);
  else if (action === "coarse-complete" && fish?.coarseActivity) { fish.coarseActivity.endsAt = now; advanceCoarseFishActivities(now, tank); }
  else if (action === "coarse-cancel" && fish) fish.coarseActivity = null;
  else if (action === "action-complete" && fish) {
    const queue = getFishActionQueueState(fish.id);
    if (queue?.active) {
      finishFishActionQueueItem(fish, queue.active, now, { forced: true });
      queue.active = null;
    }
    fish.behaviorIntent = null;
    fish.activity = "swim";
  } else if (action === "action-cancel" && fish) {
    const queue = getFishActionQueueState(fish.id);
    if (queue?.active) cancelFishQueuedAction(fish.id, queue.active.id, now);
    else { fish.behaviorIntent = null; fish.activity = "swim"; }
  } else if (action === "queue-clear" && fish) {
    const queue = getFishActionQueueState(fish.id, { create: true });
    if (queue.active) finishFishActionQueueItem(fish, queue.active, now, { cancelled: true });
    queue.active = null; queue.items = []; queue.restUntil = 0;
  } else if (action === "autonomy-force" && fish) {
    runtime.debugAutonomyPausedFishIds.delete(fish.id);
    const queue = getFishActionQueueState(fish.id, { create: true });
    queue.active = null; queue.items = []; queue.restUntil = 0;
    const actionId = pickAutonomousFishAction(fish, now, { emergency: true }) || pickAutonomousFishAction(fish, now);
    const config = actionId ? getFishActionConfig(actionId) : null;
    const item = config ? createFishActionQueueItem(actionId, config, now, { autonomous: true }) : null;
    if (item) queue.items.push(item);
    runtime.debugLivingBoroughOutput = item ? `Queued autonomous ${item.label}.` : "No autonomous action was currently needed.";
  } else if (action === "autonomy-toggle" && fish) {
    if (runtime.debugAutonomyPausedFishIds.has(fish.id)) runtime.debugAutonomyPausedFishIds.delete(fish.id);
    else runtime.debugAutonomyPausedFishIds.add(fish.id);
  } else if (action === "teleport-center" && fish) {
    fish.xNorm = 0.5; fish.yNorm = 0.5; fish.targetXNorm = 0.5; fish.targetYNorm = 0.5;
  } else if (action === "needs" && fish) {
    const target = clamp(Number(value) || 0, 0, 100);
    fish.needs = Object.fromEntries(["hunger", "energy", "social", "comfort", "hygiene", "environment", "stimulation"].map((key) => [key, target]));
    fish.needsUpdatedAt = now;
  } else if (action === "heal" && fish) fish.healthUnits = getFishMaxHealthUnits(fish);
  else if (action === "damage" && fish) applyFishDamage(fish, 1, now, `${fish.name} took debug damage.`);
  else if (action === "disease" && fish) infectSelectedFishDebug();
  else if (action === "cure" && fish) cureSelectedFishDebug();
  else if (action === "age-add" && fish) fish.acquiredAt -= Number(value) * DAY_MS;
  else if (action === "age-set" && fish) fish.acquiredAt = now - Number(value) * DAY_MS;
  else if (action === "birthday" && fish && !isFishDead(fish)) { runtime.debugBirthdayHatFishIds.add(fish.id); pushEvent(`${fish.name} is celebrating a borough birthday!`, now, tank, { type: "birthday", fishId: fish.id }); }
  else if (action === "kill" && fish) markFishAsDead(fish, now, `${fish.name} died during a debug test.`);
  else if (action === "revive" && fish && isFishDead(fish)) { fish.deadAt = null; fish.activity = "swim"; fish.healthUnits = getFishMaxHealthUnits(fish); fish.decayStage = null; }
  else if (action === "memorial" && fish) recordFishMemorial(fish, tank, "Debug memorial record", now);
  else if (action === "relationship" && fish) {
    const other = getAllTankFish(state).find((entry) => entry.id !== fish.id && !isFishDead(entry));
    if (other) setDebugFishRelationship(fish, other, value, now);
  } else if (action === "behavior") {
    if (value === "dig") triggerDebugGravelDigTest(); else triggerDebugBehaviorScenario(value);
  } else if (action === "happening-recent" || action === "happening-ten") {
    const count = action === "happening-ten" ? 10 : 1;
    const recent = getAllTanks(state).flatMap((entry) => (entry.events || []).map((sourceEvent) => ({ sourceEvent, sourceTank: entry }))).filter(({ sourceEvent, sourceTank }) => buildBoroughHappeningFromEvent(sourceEvent, sourceTank));
    recent.slice(0, count).forEach(({ sourceEvent, sourceTank }) => maybeRecordBoroughHappeningFromEvent(sourceEvent, sourceTank));
    runtime.debugLivingBoroughOutput = `${Math.min(count, recent.length)} valid happenings generated from real events.`;
  } else if (action === "happening-clear") state.boroughHappenings = [];
  else if (action === "notification-test") queueBoroughActivityNotification("Borough notification test", "Cooldown and duplicate suppression active", { force: true, persist: false });
  else if (action === "recap-preview" && tank) { const recap = buildBoroughDailyRecapSummary(getLocalDayKey(now), now, { force: true }); runtime.debugLivingBoroughOutput = recap?.narrative || "No recap data."; }
  else if (action === "recap-generate" && tank) maybeGenerateDailyRecapForTank(tank, now, { force: true });
  else if (action === "simulate-days") { runtime.debugSimulatedNow = now + Number(value) * DAY_MS; syncState(runtime.debugSimulatedNow); }
  else if (action === "structure-info") {
    const item = getSelectedPlacedDecor();
    runtime.debugLivingBoroughOutput = item
      ? `${runtime.decorMap.get(item.decorKey)?.name}: ${getDecorResidents(item.id).length}/${getDecorResidenceCapacity(item)} residents; seats ${getDecorBoroughServiceSeatUsage(item)}/${getDecorBoroughServiceSeats(item).length}; services ${getDecorBoroughServiceTypes(item).join(", ") || "none"}.`
      : "Select a structure first.";
  } else if (action === "structure-fill") {
    const item = getSelectedPlacedDecor();
    if (item) getAllTankFish(state).filter((entry) => !isFishDead(entry)).slice(0, getDecorResidenceCapacity(item)).forEach((entry) => { entry.boroughServiceTargetDecorId = item.id; });
  } else if (action === "structure-empty") {
    const item = getSelectedPlacedDecor();
    if (item) getAllTankFish(state).forEach((entry) => { if (entry.boroughServiceTargetDecorId === item.id) entry.boroughServiceTargetDecorId = null; });
  } else if (action === "residence-assign" && fish) {
    const item = getSelectedPlacedDecor();
    if (item && isDecorResidenceEligible(item)) fish.residenceDecorId = item.id;
  } else if (action === "residence-unassign" && fish) fish.residenceDecorId = null;
  else if (action === "residence-clear-orphans") pruneState(now);
  else if (action === "identity" || action === "identity-scores") runtime.debugLivingBoroughOutput = JSON.stringify(calculateNeighborhoodIdentity(tank));
  else if (action === "overview-open") openAquariumOverview();
  else if (action === "snapshot-rebuild") { runtime.boroughOverviewSnapshotCache.clear(); renderAquariumOverview(); }
  else if (action === "snapshot-freeze") runtime.debugSnapshotCacheFrozen = !runtime.debugSnapshotCacheFrozen;
  else if (action === "overview-layout") { runtime.debugOverviewLayoutMode = value; if (runtime.boroughOverviewOpen) renderAquariumOverview(); }
  else if (action === "overview-synthetic") { runtime.debugOverviewSyntheticCount = Math.max(0, Number(value) || 0); if (runtime.boroughOverviewOpen) renderAquariumOverview(); }
  else if (action === "overview-fps") runtime.debugOverviewFishFps = Number(value);
  else if (action === "overview-interpolation") runtime.debugOverviewInterpolationDisabled = !runtime.debugOverviewInterpolationDisabled;
  else if (action === "overview-sample") { runtime.boroughOverviewFishProxies.clear(); renderBoroughOverviewFish(now, { force: true }); }
  syncHalloweenPresentation(now);
  saveState();
  renderUi(now, { full: false });
}

function handleLivingBoroughDebugChange(event) {
  if (!isDebugModeEnabled()) return;
  const input = event.target instanceof Element ? event.target.closest("[data-debug-fish-need]") : null;
  const fish = getSelectedLivingBoroughDebugFish();
  if (!input || !fish) return;
  const key = input.dataset.debugFishNeed;
  if (!["hunger", "energy", "social", "comfort", "hygiene", "environment", "stimulation"].includes(key)) return;
  fish.needs = sanitizeFishNeeds(fish.needs, fish, getBoroughReferenceNow());
  fish.needs[key] = clamp(Number(input.value) || 0, 0, 100);
  fish.needsUpdatedAt = getBoroughReferenceNow();
  saveState();
  renderUi(getBoroughReferenceNow(), { full: false });
}
