// Source fragment: fish/decor-behavior.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getDecorFishBehaviorMeta(itemOrKey) {
  const decorKey = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey;
  if (!decorKey) {
    return null;
  }

  return runtime.decorMap.get(decorKey)?.fishBehavior
    || runtime.decorMeta[decorKey]?.fishBehavior
    || null;
}

function isSpookyDecorItem(itemOrKey) {
  const decorKey = String(typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey || "").toLowerCase();
  const meta = getDecorFishBehaviorMeta(itemOrKey);
  return Boolean(
    Array.isArray(meta?.hangoutTypes) && meta.hangoutTypes.includes("spooky")
  ) || /(effigy|spooky|gorebag|swamp-moss|fish-head)/.test(decorKey);
}

function getFishResidenceDecorId(fish) {
  return typeof fish?.residenceDecorId === "string" && fish.residenceDecorId
    ? fish.residenceDecorId
    : null;
}

function getTankContainingFish(fishId, targetState = state) {
  return getAllTanks(targetState).find((tank) => (
    Array.isArray(tank?.fish) && tank.fish.some((fish) => fish?.id === fishId)
  )) || null;
}

function getTankContainingDecor(decorId, targetState = state) {
  return getAllTanks(targetState).find((tank) => (
    Array.isArray(tank?.placedDecor) && tank.placedDecor.some((item) => item?.id === decorId)
  )) || null;
}

function getDecorResidents(decorId, targetState = state) {
  if (!decorId) {
    return [];
  }
  return getAllTankFish(targetState).filter((fish) => (
    fish && !isFishDead(fish) && getFishResidenceDecorId(fish) === decorId
  ));
}

function getDecorResidenceCapacity(itemOrKey) {
  const meta = getDecorFishBehaviorMeta(itemOrKey);
  return Number.isFinite(Number(meta?.occupancyLimit))
    ? Math.max(1, Math.floor(Number(meta.occupancyLimit)))
    : 1;
}

function isDecorResidenceEligible(itemOrKey) {
  const decorKey = String(typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey || "").toLowerCase();
  if (!decorKey) {
    return false;
  }
  const meta = getDecorFishBehaviorMeta(itemOrKey);
  const hangoutTypes = Array.isArray(meta?.hangoutTypes) ? meta.hangoutTypes : [];
  const services = Array.isArray(meta?.serviceTypes) ? meta.serviceTypes : [];
  return isCaveDecorKey(decorKey)
    || services.includes("home")
    || hangoutTypes.some((type) => type === "hide" || type === "plant")
    || /(grass|seaweed|moss|plant|anubias|coral|hide)/.test(decorKey);
}

function getResidenceReservationCount(decorId, requestingFish = null) {
  return getDecorResidents(decorId).filter((fish) => fish.id !== requestingFish?.id).length;
}

function clearDecorResidenceAssignments(decorId, options = {}) {
  if (!decorId) {
    return 0;
  }
  let cleared = 0;
  for (const fish of getAllTankFish()) {
    if (getFishResidenceDecorId(fish) !== decorId) {
      continue;
    }
    fish.residenceDecorId = null;
    if (fish.favoriteSpot?.decorId === decorId) {
      fish.favoriteSpot = null;
    }
    cleared += 1;
  }
  if (cleared && options.save !== false) {
    saveState();
  }
  return cleared;
}

function getAssignedResidenceTarget(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const residenceDecorId = getFishResidenceDecorId(fish);
  if (!residenceDecorId || !state.placedDecor.some((item) => item.id === residenceDecorId)) {
    return null;
  }
  const zone = getCachedDecorHangoutZones().find((entry) => (
    entry.decorId === residenceDecorId && ["hide", "plant", "hardscape"].includes(entry.type)
  ));
  if (zone) {
    const targetLayer = clampTankLayer(zone.targetLayerMax);
    return {
      xNorm: clamp(randomBetween(zone.xMin, zone.xMax), 0.08, 0.92),
      yNorm: clampFishYNormToLayer(randomBetween(zone.yMin, zone.yMax), fish, species, targetLayer, {
        minYNorm: 0.16,
        maxYNorm: 0.8
      }),
      targetLayer,
      targetAt: now + randomBetween(12000, 24000),
      decorId: residenceDecorId,
      zoneType: zone.type,
      intentType: "night sleep",
      intentCause: "assigned residence",
      signalType: "night_sleep",
      debugText: "night sleep | assigned residence",
      slow: true
    };
  }

  const item = state.placedDecor.find((entry) => entry.id === residenceDecorId);
  if (!item) {
    return null;
  }
  if (isCaveDecorKey(item.decorKey)) {
    return null;
  }
  return {
    xNorm: clamp(Number(item.xNorm) || 0.5, 0.08, 0.92),
    yNorm: clamp((Number(item.yNorm) || 0.72) - 0.12, 0.16, 0.78),
    targetLayer: clampTankLayer(Math.min(TANK_DEPTH_LAYERS, getDecorTankLayer(item) + 1)),
    targetAt: now + randomBetween(12000, 24000),
    decorId: residenceDecorId,
    zoneType: "home",
    intentType: "night sleep",
    intentCause: "assigned residence",
    signalType: "night_sleep",
    debugText: "night sleep | assigned residence",
    slow: true
  };
}

function getDecorHangoutOccupancyGroup(fish, species = getSpeciesForFish(fish)) {
  return "fish";
}

function getDecorHangoutOccupancy(zone, requestingFish = null, group = "fish") {
  if (!zone?.decorId || !state?.fish?.length) {
    return 0;
  }

  return state.fish.filter((otherFish) => {
    if (
      !otherFish
      || otherFish.id === requestingFish?.id
      || isFishDead(otherFish)
      || otherFish.activity !== "roam"
      || otherFish.caveState
      || otherFish.hangoutDecorId !== zone.decorId
    ) {
      return false;
    }

    const otherZoneType = typeof otherFish.hangoutZoneType === "string" ? otherFish.hangoutZoneType : "";
    return !otherZoneType || otherZoneType === zone.type;
  }).length;
}

function getDecorHangoutLimit(zone, group, options = {}) {
  if (Number.isFinite(Number(options.occupancyLimit))) {
    return Math.max(1, Math.floor(Number(options.occupancyLimit)));
  }

  if (Number.isFinite(Number(zone?.occupancyLimit))) {
    return Math.max(1, Math.floor(Number(zone.occupancyLimit)));
  }

  return DECOR_HANGOUT_DEFAULT_OCCUPANCY_LIMIT;
}

function pickDecorHangoutTarget(species, fish = null, now = Date.now(), options = {}) {
  const chanceByStyle = {
    peaceful: 0.62,
    steady: 0.46,
    sporadic: 0.34
  };
  const chanceMultiplier = Number.isFinite(Number(options.chanceMultiplier)) ? Number(options.chanceMultiplier) : 1;

  if (
    !state.placedDecor.length
    || (!options.force && Math.random() > clamp((chanceByStyle[species.swimStyle] || 0.4) * chanceMultiplier, 0, 1))
  ) {
    return null;
  }

  const allowedZoneTypes = normalizeStringList(options.allowedZoneTypes)
    .map((type) => type.toLowerCase().replace(/[-_\s]+/g, "-"));
  const occupancyGroup = typeof options.occupancyGroup === "string"
    ? options.occupancyGroup
    : getDecorHangoutOccupancyGroup(fish, species);
  const zones = getCachedDecorHangoutZones().filter((zone) => {
    if (allowedZoneTypes.length && !allowedZoneTypes.includes(zone.type)) {
      return false;
    }

    if (!fish) {
      return true;
    }

    const residenceItem = state.placedDecor.find((item) => item.id === zone.decorId);
    if (
      residenceItem
      && isDecorResidenceEligible(residenceItem)
      && getFishResidenceDecorId(fish) !== zone.decorId
      && getResidenceReservationCount(zone.decorId, fish) >= getDecorResidenceCapacity(residenceItem)
    ) {
      return false;
    }

    if (
      fish.blockedDecorId &&
      zone.decorId === fish.blockedDecorId &&
      Number.isFinite(fish.blockedDecorUntil) &&
      now < fish.blockedDecorUntil
    ) {
      return false;
    }

    if (!options.ignoreOccupancy) {
      const limit = getDecorHangoutLimit(zone, occupancyGroup, options);
      if (getDecorHangoutOccupancy(zone, fish, occupancyGroup) >= limit) {
        return false;
      }
    }

    return true;
  });

  if (!zones.length) {
    return null;
  }

  const zone = zones[Math.floor(Math.random() * zones.length)];
  const targetLayer = options.preferBackLayer
    ? clampTankLayer(zone.targetLayerMax)
    : clampTankLayer(zone.targetLayerMin + Math.floor(Math.random() * (zone.targetLayerMax - zone.targetLayerMin + 1)));
  const lingerMultiplier = Number.isFinite(Number(options.lingerMultiplier)) ? Number(options.lingerMultiplier) : 1;
  const targetYNorm = clampFishYNormToLayer(randomBetween(zone.yMin, zone.yMax), fish, species, targetLayer, {
    minYNorm: 0.16,
    maxYNorm: 0.8
  });
  return {
    xNorm: clamp(randomBetween(zone.xMin, zone.xMax), 0.08, 0.92),
    yNorm: targetYNorm,
    targetLayer,
    decorId: zone.decorId,
    zoneType: zone.type,
    lingerMs: (zone.lingerMinMs + Math.random() * (zone.lingerMaxMs - zone.lingerMinMs)) * lingerMultiplier
  };
}

function getDecorHangoutZonesCacheKey() {
  if (!state?.placedDecor?.length) {
    return "none";
  }

  return state.placedDecor
    .map((item) => [
      item.id,
      item.decorKey,
      Number(item.xNorm).toFixed(4),
      Number(item.yNorm).toFixed(4),
      Number(item.scale).toFixed(4),
      getDecorTankLayer(item)
    ].join("|"))
    .join("::");
}

function getCachedDecorHangoutZones() {
  const cacheKey = getDecorHangoutZonesCacheKey();
  if (runtime.decorHangoutZonesKey === cacheKey && Array.isArray(runtime.decorHangoutZones)) {
    return runtime.decorHangoutZones;
  }

  const zones = buildDecorHangoutZones();
  runtime.decorHangoutZonesKey = cacheKey;
  runtime.decorHangoutZones = zones;
  return zones;
}

function buildDecorHangoutZones() {
  const zones = [];

  for (const item of state.placedDecor) {
    const bounds = getPlacedDecorBounds(item);
    if (!bounds) {
      continue;
    }

    const key = item.decorKey.toLowerCase();
    const fishBehavior = getDecorFishBehaviorMeta(item);
    const explicitHangoutTypes = (Array.isArray(fishBehavior?.hangoutTypes)
      ? fishBehavior.hangoutTypes
      : []);
    if (isCaveDecorKey(key) && !explicitHangoutTypes.length) {
      continue;
    }
    const decorLayer = getDecorTankLayer(item);
    const behindLayer = clampTankLayer(Math.min(TANK_DEPTH_LAYERS, decorLayer + 1));
    const widthNorm = (bounds.right - bounds.left) / TANK_WIDTH;
    const heightNorm = (bounds.bottom - bounds.top) / TANK_HEIGHT;
    const addZone = (type, config) => {
      zones.push({
        decorId: item.id,
        type,
        occupancyLimit: Number.isFinite(Number(fishBehavior?.occupancyLimit))
          ? Math.max(1, Math.floor(Number(fishBehavior.occupancyLimit)))
          : null,
        ...config
      });
    };
    const addTypedZone = (type) => {
      if (type === "hide") {
        addZone("hide", {
          targetLayerMin: behindLayer,
          targetLayerMax: behindLayer,
          xMin: item.xNorm - widthNorm * 0.14,
          xMax: item.xNorm + widthNorm * 0.14,
          yMin: item.yNorm - heightNorm * 0.32,
          yMax: item.yNorm - heightNorm * 0.12,
          lingerMinMs: 6000,
          lingerMaxMs: 11000
        });
        return;
      }

      if (type === "plant") {
        addZone("plant", {
          targetLayerMin: behindLayer,
          targetLayerMax: behindLayer,
          xMin: item.xNorm - widthNorm * 0.2,
          xMax: item.xNorm + widthNorm * 0.2,
          yMin: item.yNorm - heightNorm * 0.5,
          yMax: item.yNorm - heightNorm * 0.16,
          lingerMinMs: 5000,
          lingerMaxMs: 9000
        });
        return;
      }

      if (type === "hardscape") {
        addZone("hardscape", {
          targetLayerMin: decorLayer,
          targetLayerMax: behindLayer,
          xMin: item.xNorm - widthNorm * 0.24,
          xMax: item.xNorm + widthNorm * 0.24,
          yMin: item.yNorm - heightNorm * 0.46,
          yMax: item.yNorm - heightNorm * 0.12,
          lingerMinMs: 4600,
          lingerMaxMs: 8200
        });
        return;
      }

      if (type === "lure") {
        addZone("lure", {
          targetLayerMin: decorLayer,
          targetLayerMax: behindLayer,
          xMin: item.xNorm - widthNorm * 0.28,
          xMax: item.xNorm + widthNorm * 0.28,
          yMin: item.yNorm - heightNorm * 0.28,
          yMax: item.yNorm + heightNorm * 0.12,
          lingerMinMs: 3200,
          lingerMaxMs: 6800
        });
        return;
      }

      if (type === "bubbler") {
        addZone("bubbler", {
          targetLayerMin: decorLayer,
          targetLayerMax: behindLayer,
          xMin: item.xNorm - widthNorm * 0.22,
          xMax: item.xNorm + widthNorm * 0.22,
          yMin: item.yNorm - heightNorm * 0.95,
          yMax: item.yNorm - heightNorm * 0.28,
          lingerMinMs: 3500,
          lingerMaxMs: 7000
        });
        return;
      }

      if (type === "spooky") {
        addZone("spooky", {
          targetLayerMin: decorLayer,
          targetLayerMax: behindLayer,
          xMin: item.xNorm - widthNorm * 0.2,
          xMax: item.xNorm + widthNorm * 0.2,
          yMin: item.yNorm - heightNorm * 0.45,
          yMax: item.yNorm - heightNorm * 0.1,
          lingerMinMs: 5000,
          lingerMaxMs: 9500
        });
      }
    };

    if (explicitHangoutTypes.length || fishBehavior?.explicitHangout) {
      for (const type of explicitHangoutTypes) {
        addTypedZone(type);
      }
      continue;
    }

    if (/(castle|terracotta|bridge|arch|hide|pagoda)/.test(key)) {
      addTypedZone("hide");
    }

    if (/(coral|seaweed|grass|anubias|moss|bloom|bunch)/.test(key)) {
      addTypedZone("plant");
    }

    if (isBubblerDecorKey(item.decorKey)) {
      addTypedZone("bubbler");
    }

    if (/(driftwood|root|shell|chest|rock)/.test(key)) {
      addTypedZone("hardscape");
    }
  }

  return zones;
}

function getDecorBoroughServiceTypes(itemOrKey) {
  const meta = getDecorFishBehaviorMeta(itemOrKey);
  return Array.isArray(meta?.serviceTypes) ? meta.serviceTypes : [];
}

function getBoroughSectionServiceTypes(tank = getCurrentTank()) {
  const types = new Set();
  for (const item of Array.isArray(tank?.placedDecor) ? tank.placedDecor : []) {
    for (const type of getDecorBoroughServiceTypes(item)) {
      types.add(type);
    }
  }
  return [...types];
}

function getBoroughServiceLabel(serviceType) {
  return ({
    food: "Food",
    home: "Homes",
    clinic: "Clinic",
    social: "Social",
    rest: "Rest",
    nursery: "Nursery"
  })[serviceType] || titleFromFile(serviceType);
}

function getBoroughSectionServiceCandidates(tank, serviceType) {
  return (Array.isArray(tank?.placedDecor) ? tank.placedDecor : [])
    .filter((item) => getDecorBoroughServiceTypes(item).includes(serviceType));
}

function getDecorServiceSummary(decorOrKey) {
  const types = getDecorBoroughServiceTypes(decorOrKey);
  if (!types.length) {
    return "";
  }
  return `Borough service: ${types.map(getBoroughServiceLabel).join(", ")}.`;
}

function getFishNeededBoroughServiceType(fish, tank = getCurrentTank(), now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return "";
  }
  if (hasActiveFishDisease(fish) || fish.healthUnits < getFishMaxHealthUnits(fish)) {
    return "clinic";
  }
  if (getFishNeedValue(fish, "hunger", now) <= FISH_HUNGER_LOW_THRESHOLD && !isMealFreeFish(fish)) {
    return "food";
  }
  if (getFishNeedValue(fish, "energy", now) <= FISH_ENERGY_LOW_THRESHOLD) {
    return "rest";
  }
  if (getFishNeedValue(fish, "comfort", now) <= 42) {
    return "home";
  }
  if (getFishNeedValue(fish, "social", now) <= 38) {
    return "social";
  }
  return "";
}

function applyBoroughStructureService(fish, serviceType, targetTank, now = Date.now()) {
  if (!fish || !serviceType || !targetTank) {
    return false;
  }
  const serviceTargetId = fish.boroughServiceTargetDecorId;
  const serviceTarget = serviceTargetId ? (targetTank.placedDecor || []).find((item) => item.id === serviceTargetId) : null;
  switch (serviceType) {
    case "food":
      adjustFishNeed(fish, "hunger", 46, now);
      adjustFishNeed(fish, "energy", 5, now);
      fish.lastAteAt = now;
      if (!isBrineShrimpSpecies(fish)) {
        scheduleFishPoop(fish, now, targetTank);
      }
      break;
    case "clinic":
      fish.healthUnits = Math.min(getFishMaxHealthUnits(fish), fish.healthUnits + 1);
      fish.diseaseTreatedUntil = Math.max(Number(fish.diseaseTreatedUntil) || 0, now + 6 * HOUR_MS);
      adjustFishNeed(fish, "comfort", 12, now);
      break;
    case "home":
      adjustFishNeed(fish, "comfort", 24, now);
      adjustFishNeed(fish, "energy", 12, now);
      break;
    case "social":
      adjustFishNeed(fish, "social", 26, now);
      adjustFishNeed(fish, "stimulation", 12, now);
      break;
    case "rest":
      adjustFishNeed(fish, "energy", 34, now);
      adjustFishNeed(fish, "comfort", 14, now);
      break;
    case "nursery":
      targetTank.foodBuffs = targetTank.foodBuffs || { upgradedUntil: 0, friskyUntil: 0 };
      targetTank.foodBuffs.friskyUntil = Math.max(Number(targetTank.foodBuffs.friskyUntil) || 0, now + 20 * MINUTE_MS);
      adjustFishNeed(fish, "social", 10, now);
      adjustFishNeed(fish, "comfort", 10, now);
      processFishBreedingForSlot({ start: now, end: now, label: "Nursery visit" });
      break;
    default:
      return false;
  }
  fish.lastBoroughServiceAtByType = sanitizeFishNeedEventMap(fish.lastBoroughServiceAtByType);
  fish.lastBoroughServiceAtByType[serviceType] = now;
  fish.boroughServiceTargetDecorId = null;
  fish.boroughServiceType = "";
  fish.boroughServiceStartedAt = 0;
  setFishBehaviorIntent(fish, "use service", getBoroughServiceLabel(serviceType), now, { durationMs: 20 * 1000 });
  const serviceName = serviceTarget
    ? (runtime.decorMap.get(serviceTarget.decorKey)?.name || getBoroughServiceLabel(serviceType))
    : getBoroughServiceLabel(serviceType);
  pushEvent(`${fish.name} visited ${serviceName}.`, now, targetTank, {
    type: serviceType === "home" ? "residence" : "service",
    fishId: fish.id,
    placedDecorId: serviceTargetId,
    serviceType,
    detail: `Completed ${getBoroughServiceLabel(serviceType).toLowerCase()} visit`
  });
  return true;
}

function processBoroughStructureServices(now = Date.now(), targetTank = getCurrentTank()) {
  if (!targetTank?.fish?.length || !targetTank?.placedDecor?.length) {
    return false;
  }
  let changed = false;
  for (const fish of targetTank.fish) {
    if (!fish || isFishDead(fish) || fish.activity !== "roam" || fish.caveState) {
      continue;
    }
    let serviceType = getFishNeededBoroughServiceType(fish, targetTank, now);
    if (!serviceType && getBoroughSectionServiceTypes(targetTank).includes("nursery") && Math.random() < 0.002) {
      serviceType = "nursery";
    }
    const lastUsedAt = Number(fish.lastBoroughServiceAtByType?.[serviceType]) || 0;
    if (!serviceType || now - lastUsedAt < 4 * MINUTE_MS) {
      continue;
    }
    const candidates = getBoroughSectionServiceCandidates(targetTank, serviceType);
    if (!candidates.length) {
      if (fish.boroughServiceType === serviceType) {
        fish.boroughServiceTargetDecorId = null;
        fish.boroughServiceType = "";
      }
      continue;
    }
    let structure = candidates.find((item) => item.id === fish.boroughServiceTargetDecorId);
    if (!structure) {
      structure = candidates[Math.floor(Math.random() * candidates.length)];
      fish.boroughServiceTargetDecorId = structure.id;
      fish.boroughServiceType = serviceType;
      fish.boroughServiceStartedAt = now;
      changed = true;
    }
    const targetX = clamp(Number(structure.xNorm) || 0.5, 0.08, 0.92);
    const targetY = clamp((Number(structure.yNorm) || 0.72) - 0.08, 0.16, 0.78);
    fish.targetXNorm = targetX;
    fish.targetYNorm = targetY;
    fish.targetAt = now + 25 * 1000;
    setFishBehaviorIntent(fish, "visit", getBoroughServiceLabel(serviceType), now, { durationMs: 30 * 1000 });
    if (Math.hypot(fish.xNorm - targetX, fish.yNorm - targetY) <= 0.075) {
      changed = applyBoroughStructureService(fish, serviceType, targetTank, now) || changed;
    }
  }
  return changed;
}

function getCoarseFishActivityPosition(fish, now = Date.now()) {
  const activity = fish?.coarseActivity;
  if (!activity || !Number.isFinite(activity.startedAt) || !Number.isFinite(activity.endsAt)) {
    return {
      xNorm: clamp(Number(fish?.xNorm) || 0.5, 0.08, 0.92),
      yNorm: clamp(Number(fish?.yNorm) || 0.5, 0.14, 0.8),
      progress: 1
    };
  }
  const duration = Math.max(1, activity.endsAt - activity.startedAt);
  const progress = clamp((now - activity.startedAt) / duration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return {
    xNorm: activity.fromXNorm + (activity.toXNorm - activity.fromXNorm) * eased,
    yNorm: activity.fromYNorm + (activity.toYNorm - activity.fromYNorm) * eased,
    progress
  };
}

function createCoarseFishActivity(fish, targetTank, now = Date.now()) {
  const fromXNorm = clamp(Number(fish?.xNorm) || 0.5, 0.08, 0.92);
  const fromYNorm = clamp(Number(fish?.yNorm) || 0.5, 0.14, 0.8);
  let type = "wander";
  let label = "Swimming around the neighborhood";
  let serviceType = getFishNeededBoroughServiceType(fish, targetTank, now);
  let targetDecorId = null;
  let toXNorm = randomSwimX();
  let toYNorm = randomSwimY();

  if (!serviceType && getBoroughSectionServiceTypes(targetTank).includes("nursery") && Math.random() < 0.004) {
    serviceType = "nursery";
  }
  const lastUsedAt = Number(fish?.lastBoroughServiceAtByType?.[serviceType]) || 0;
  const candidates = serviceType && now - lastUsedAt >= 4 * MINUTE_MS
    ? getBoroughSectionServiceCandidates(targetTank, serviceType)
    : [];
  if (candidates.length) {
    const structure = candidates[Math.floor(Math.random() * candidates.length)];
    type = "service";
    label = `Visiting ${getBoroughServiceLabel(serviceType)}`;
    targetDecorId = structure.id;
    toXNorm = clamp(Number(structure.xNorm) || 0.5, 0.08, 0.92);
    toYNorm = clamp((Number(structure.yNorm) || 0.72) - 0.08, 0.16, 0.78);
  } else if (getFishNeedValue(fish, "energy", now) <= 48) {
    type = "rest";
    const residence = targetTank?.placedDecor?.find((item) => item.id === getFishResidenceDecorId(fish));
    if (residence) {
      const residenceName = runtime.decorMap.get(residence.decorKey)?.name || "home";
      label = `Sleeping at ${residenceName}`;
      targetDecorId = residence.id;
      toXNorm = clamp(Number(residence.xNorm) || 0.5, 0.08, 0.92);
      toYNorm = clamp((Number(residence.yNorm) || 0.72) - 0.12, 0.14, 0.8);
    } else {
      label = "Resting quietly";
      toXNorm = clamp(fromXNorm + (Math.random() - 0.5) * 0.18, 0.08, 0.92);
      toYNorm = clamp(0.62 + Math.random() * 0.14, 0.14, 0.8);
    }
  } else if (getFishNeedValue(fish, "social", now) <= 52) {
    type = "social";
    label = "Socializing nearby";
    toXNorm = clamp(0.4 + Math.random() * 0.2, 0.08, 0.92);
    toYNorm = clamp(0.35 + Math.random() * 0.24, 0.14, 0.8);
  }

  const distance = Math.hypot(toXNorm - fromXNorm, toYNorm - fromYNorm);
  const durationMs = clamp(14 * 1000 + distance * 42 * 1000 + Math.random() * 14 * 1000, 14 * 1000, 55 * 1000);
  return {
    type,
    label,
    serviceType: serviceType || "",
    targetDecorId,
    startedAt: now,
    endsAt: now + durationMs,
    fromXNorm,
    fromYNorm,
    toXNorm,
    toYNorm
  };
}

function advanceCoarseFishActivities(now = Date.now(), targetTank = getCurrentTank()) {
  if (!targetTank?.fish?.length) {
    return false;
  }
  let changed = false;
  for (const fish of targetTank.fish) {
    if (!fish || isFishDead(fish) || fish.caveState) {
      continue;
    }
    let activity = fish.coarseActivity;
    if (activity) {
      const position = getCoarseFishActivityPosition(fish, now);
      fish.xNorm = clamp(position.xNorm, 0.08, 0.92);
      fish.yNorm = clamp(position.yNorm, 0.14, 0.8);
      fish.direction = activity.toXNorm < activity.fromXNorm ? -1 : 1;
      if (position.progress >= 1) {
        fish.targetXNorm = fish.xNorm;
        fish.targetYNorm = fish.yNorm;
        if (activity.type === "service" && activity.serviceType) {
          changed = applyBoroughStructureService(fish, activity.serviceType, targetTank, activity.endsAt) || changed;
        }
        fish.coarseActivity = null;
        activity = null;
        changed = true;
      }
    }
    if (!activity) {
      fish.coarseActivity = createCoarseFishActivity(fish, targetTank, now);
      setFishBehaviorIntent(fish, "offscreen", fish.coarseActivity.label, now, { durationMs: fish.coarseActivity.endsAt - now });
      changed = true;
    }
    fish.lastCoarseSimulatedAt = now;
  }
  return changed;
}

function materializeCoarseFishActivities(targetTank = getCurrentTank(), now = Date.now()) {
  if (!targetTank?.fish?.length) {
    return false;
  }
  let changed = false;
  for (const fish of targetTank.fish) {
    if (!fish?.coarseActivity) {
      continue;
    }
    const position = getCoarseFishActivityPosition(fish, now);
    fish.xNorm = clamp(position.xNorm, 0.08, 0.92);
    fish.yNorm = clamp(position.yNorm, 0.14, 0.8);
    fish.targetXNorm = fish.xNorm;
    fish.targetYNorm = fish.yNorm;
    fish.targetAt = now + 900 + Math.random() * 1600;
    fish.coarseActivity = null;
    fish.lastCoarseSimulatedAt = now;
    changed = true;
  }
  return changed;
}
