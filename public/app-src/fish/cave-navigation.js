// Source fragment: fish/cave-navigation.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function formatDecorLayerSpanShort(decorKey, layer) {
  const span = getDecorLayerSpan(decorKey, layer);
  return span.min === span.max ? `${span.min}` : `${span.min}-${span.max}`;
}

function getCaveInsideLayerForItem(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return clampTankLayer(CAVE_SEAT_LOCKED_LAYER);
  }

  const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));
  return clampTankLayer(span.back || CAVE_SEAT_LOCKED_LAYER);
}

function isCaveNightWindow(timestamp = Date.now()) {
  const hours = new Date(timestamp).getHours();
  return hours >= CAVE_NIGHT_START_HOUR || hours < CAVE_NIGHT_END_HOUR;
}

function getCaveBehaviorChance(species, timestamp = Date.now()) {
  if (!species || species.behavior === "sucker" || species.caveEnabled === false) {
    return 0;
  }

  if (isCaveNightWindow(timestamp)) {
    return CAVE_NIGHT_ENTRY_CHANCE;
  }

  return CAVE_ENTRY_CHANCE_BY_STYLE[species.swimStyle] || 0.1;
}

function getCaveBehaviorProfile(decorKey = "") {
  const directMeta = runtime.decorMap.get(decorKey)?.caveBehavior || runtime.decorMeta[decorKey]?.caveBehavior;
  const key = String(decorKey || "").toLowerCase();
  const overrideEntry = Object.entries(CAVE_BEHAVIOR_OVERRIDES).find(([matchKey]) => key.includes(matchKey.toLowerCase()));
  const override = overrideEntry?.[1] || null;
  const base = {
    portals: Array.isArray(directMeta?.portals) && directMeta.portals.length
      ? directMeta.portals
      : DEFAULT_CAVE_BEHAVIOR_PROFILE.portals,
    insideSlots: Array.isArray(directMeta?.insideSlots) && directMeta.insideSlots.length
      ? directMeta.insideSlots
      : DEFAULT_CAVE_BEHAVIOR_PROFILE.insideSlots,
    interiorZones: Array.isArray(directMeta?.interiorZones) && directMeta.interiorZones.length
      ? directMeta.interiorZones
      : DEFAULT_CAVE_BEHAVIOR_PROFILE.interiorZones,
    lingerMinMs: Number.isFinite(directMeta?.lingerMinMs)
      ? directMeta.lingerMinMs
      : DEFAULT_CAVE_BEHAVIOR_PROFILE.lingerMinMs,
    lingerMaxMs: Number.isFinite(directMeta?.lingerMaxMs)
      ? directMeta.lingerMaxMs
      : DEFAULT_CAVE_BEHAVIOR_PROFILE.lingerMaxMs,
    insideLayer: clampTankLayer(
      Number.isFinite(directMeta?.insideLayer)
        ? directMeta.insideLayer
        : (
          directMeta?.insideSlots?.find?.((slot) => Number.isFinite(slot?.layer))?.layer ??
          directMeta?.portals?.find?.((portal) => Number.isFinite(portal?.insideLayer))?.insideLayer ??
          4
        )
    )
  };

  if (!override) {
    return base;
  }

  return {
    portals: Array.isArray(override.portals) && override.portals.length
      ? override.portals
      : base.portals,
    insideSlots: Array.isArray(override.insideSlots) && override.insideSlots.length
      ? override.insideSlots
      : base.insideSlots,
    interiorZones: Array.isArray(override.interiorZones) && override.interiorZones.length
      ? override.interiorZones
      : base.interiorZones,
    lingerMinMs: Number.isFinite(override.lingerMinMs)
      ? override.lingerMinMs
      : base.lingerMinMs,
    lingerMaxMs: Number.isFinite(override.lingerMaxMs)
      ? override.lingerMaxMs
      : base.lingerMaxMs,
    insideLayer: clampTankLayer(
      Number.isFinite(override.insideLayer)
        ? override.insideLayer
        : base.insideLayer
    )
  };
}

function getCaveBehaviorProfileForItem(item) {
  return buildCaveBehaviorProfileFromPlacedSettings(item) || getCaveBehaviorProfile(item?.decorKey);
}

function getCaveInsideSlots(profile) {
  if (Array.isArray(profile?.insideSlots) && profile.insideSlots.length) {
    return profile.insideSlots;
  }

  if (Array.isArray(profile?.interiorZones) && profile.interiorZones.length) {
    return profile.interiorZones.map((zone) => ({
      id: zone.id,
      x: (zone.xMin + zone.xMax) / 2,
      y: (zone.yMin + zone.yMax) / 2,
      layer: 4,
      portalIds: []
    }));
  }

  return DEFAULT_CAVE_BEHAVIOR_PROFILE.insideSlots;
}

function mapDecorLocalPointToTankNorm(item, localX, localY) {
  const bounds = getPlacedDecorBounds(item);
  if (!bounds) {
    return null;
  }

  const x = bounds.left + (bounds.right - bounds.left) * resolveDecorHorizontalUnit(item, localX);
  const y = bounds.top + (bounds.bottom - bounds.top) * resolveDecorVerticalUnit(item, localY);
  return {
    xNorm: clamp(x / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp(y / TANK_HEIGHT, 0.14, 0.8)
  };
}

function getCaveInteriorContainmentDescriptor(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  return getCaveAllowedSpaceDescriptor(item);
}

function getCaveAllowedSpaceDescriptor(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  const decor = runtime.decorMap.get(item.decorKey);
  if (!decor) {
    return null;
  }

  const mask = getDerivedCaveInteriorMask(decor);
  if (!mask) {
    return null;
  }

  return createDecorShapeDescriptorFromMask(item, decor, decor.maskPath || decor.bgPath || decor.path, mask);
}

function isPointInsideCaveInteriorDescriptor(item, point) {
  if (!point) {
    return false;
  }

  const descriptor = getCaveInteriorContainmentDescriptor(item);
  if (!descriptor) {
    return true;
  }

  const worldX = Number.isFinite(Number(point.x))
    ? Number(point.x)
    : (Number.isFinite(Number(point.xNorm)) ? Number(point.xNorm) * TANK_WIDTH : Number.NaN);
  const worldY = Number.isFinite(Number(point.y))
    ? Number(point.y)
    : (Number.isFinite(Number(point.yNorm)) ? Number(point.yNorm) * TANK_HEIGHT : Number.NaN);

  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
    return false;
  }

  return pointHitsShapeDescriptor(descriptor, worldX, worldY, ALPHA_COLLISION_THRESHOLD);
}

function getCaveFrontDescriptor(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  return getDecorShapeDescriptor(item);
}

function getCaveShellDescriptor(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  const decor = runtime.decorMap.get(item.decorKey);
  if (!decor) {
    return null;
  }

  const shellMask = getDerivedCaveShellMask(decor);
  if (!shellMask) {
    return null;
  }

  return createDecorShapeDescriptorFromMask(item, decor, decor.bgPath || decor.path || decor.maskPath, shellMask);
}

function getCaveBlockingDescriptorForLayer(item, layer) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));
  const testLayer = clampTankLayer(layer);
  if (testLayer !== span.front && testLayer !== span.back) {
    return null;
  }

  return getCaveShellDescriptor(item) || getCaveFrontDescriptor(item);
}

function isFishUsingOwnCavePath(fish, item) {
  return Boolean(
    fish &&
    item &&
    fish.caveDecorId === item.id &&
    ["approach", "align", "enter", "inside", "exit", "depart", "leave"].includes(fish.caveState)
  );
}

function doesFishFitAtCavePoint(item, fish, species, now, point, direction = null, sampleSpacingPx = CAVE_STRICT_SAMPLE_STEP_PX) {
  if (!item || !fish || !species || !point) {
    return false;
  }

  const allowedDescriptor = getCaveAllowedSpaceDescriptor(item);
  if (!allowedDescriptor) {
    return false;
  }

  const pose = getFishCollisionPose(
    fish,
    species,
    now,
    point.xNorm,
    point.yNorm,
    direction == null ? (fish.direction || 1) : direction
  );
  const fishDescriptor = getFishShapeDescriptor(fish, species, now, pose);
  if (!fishDescriptor) {
    return false;
  }

  if (!shapeContainedByMaskStrict(allowedDescriptor, fishDescriptor, sampleSpacingPx)) {
    return false;
  }

  return true;
}

function pathStaysInsideCave(
  item,
  fish,
  species,
  now,
  fromPoint,
  toPoint,
  sampleSpacingPx = CAVE_STRICT_SAMPLE_STEP_PX,
  segmentStepPx = 6
) {
  if (!item || !fish || !species || !fromPoint || !toPoint) {
    return false;
  }

  const dx = toPoint.xNorm - fromPoint.xNorm;
  const dy = toPoint.yNorm - fromPoint.yNorm;
  const distancePx = Math.hypot(dx * TANK_WIDTH, dy * TANK_HEIGHT);
  const steps = Math.max(2, Math.ceil(distancePx / Math.max(2, segmentStepPx)));
  const direction = Math.abs(dx) > 0.0001 ? (dx >= 0 ? 1 : -1) : (fish.direction || 1);

  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const samplePoint = {
      xNorm: fromPoint.xNorm + dx * t,
      yNorm: fromPoint.yNorm + dy * t
    };
    if (!doesFishFitAtCavePoint(item, fish, species, now, samplePoint, direction, sampleSpacingPx)) {
      return false;
    }
  }

  return true;
}

function portalOpeningFitsFish(item, fish, species, now, mouth, direction = null) {
  if (!item || !fish || !species || !mouth) {
    return false;
  }

  const pose = getFishCollisionPose(
    fish,
    species,
    now,
    mouth.xNorm,
    mouth.yNorm,
    direction == null ? (fish.direction || 1) : direction
  );
  const fishDescriptor = getFishShapeDescriptor(fish, species, now, pose);
  if (!fishDescriptor) {
    return false;
  }

  const frontDescriptor = getCaveFrontDescriptor(item);
  if (frontDescriptor && shapesOverlapByMaskStrict(fishDescriptor, frontDescriptor, CAVE_STRICT_SAMPLE_STEP_PX)) {
    return false;
  }

  return true;
}

function buildConfiguredCaveDockingPlan(item, fish, now = Date.now()) {
  if (!hasPlacedCaveSettings(item) || !fish) {
    return null;
  }

  const species = getSpeciesForFish(fish);
  if (!species || species.behavior === "sucker" || species.caveEnabled === false) {
    return null;
  }

  const validatedPlan = buildTriggerSeatCavePlan(item, fish, now);
  return validatedPlan
    ? {
      ...validatedPlan,
      configuredPoints: true
    }
    : null;
}

function buildTriggerSeatCavePlan(item, fish, now = Date.now()) {
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

  const currentLayer = getFishTankLayer(fish);
  const profile = getCaveBehaviorProfileForItem(item);
  const seatsCarryPortalAffinity = seatRegions.some((seat) => getCaveSeatPortalIds(seat).length);
  const candidates = [];

  for (const trigger of triggerRegions) {
    if (!doesFishFitCaveRegionSize(trigger, fish, species, 0.42)) {
      continue;
    }

    const matchedPortal = getPortalMatchForTriggerRegion(item, trigger, profile);
    const matchedPortalId = matchedPortal?.portal?.id || trigger.id;
    const approachPoint = matchedPortal?.approachPoint || {
      xNorm: trigger.xNorm,
      yNorm: trigger.yNorm
    };
    const mouthPoint = matchedPortal?.mouthPoint || {
      xNorm: trigger.xNorm,
      yNorm: trigger.yNorm
    };
    const entryDirection = Math.abs(mouthPoint.xNorm - fish.xNorm) > 0.0001
      ? (mouthPoint.xNorm >= fish.xNorm ? 1 : -1)
      : (fish.direction || 1);
    if (!portalOpeningFitsFish(item, fish, species, now, mouthPoint, entryDirection)) {
      continue;
    }

    const matchingSeats = seatRegions.filter((seat) => {
      const portalIds = getCaveSeatPortalIds(seat);
      return !portalIds.length || portalIds.includes(matchedPortalId);
    });
    const seatPool = matchingSeats.length
      ? matchingSeats
      : (seatsCarryPortalAffinity ? [] : seatRegions);
    if (!seatPool.length) {
      continue;
    }

    const availableSeats = seatPool
      .filter((seat) => !isCaveSeatOccupied(item.id, seat.id, fish.id))
      .filter((seat) => doesFishFitCaveRegionSize(seat, fish, species, 0.45))
      .sort((left, right) => {
        const leftScore = Math.hypot(left.xNorm - trigger.xNorm, left.yNorm - trigger.yNorm) - left.areaPx / 12000;
        const rightScore = Math.hypot(right.xNorm - trigger.xNorm, right.yNorm - trigger.yNorm) - right.areaPx / 12000;
        return leftScore - rightScore;
      });

    let seat = null;
    let triggerPath = null;
    for (const candidateSeat of availableSeats) {
      const seatDirection = getCaveSeatFacingDirection(candidateSeat, entryDirection);
      const candidatePath = buildTriggerSeatEntryNodes(item, trigger, candidateSeat, fish, species, now, seatDirection);
      if (!candidatePath) {
        continue;
      }

      seat = candidateSeat;
      triggerPath = candidatePath;
      break;
    }

    if (!seat || !triggerPath) {
      continue;
    }

    const distanceScore = Math.hypot(fish.xNorm - trigger.xNorm, fish.yNorm - trigger.yNorm);
    const frontLayer = clampTankLayer(
      Number.isFinite(Number(matchedPortal?.portal?.outsideLayer))
        ? Number(matchedPortal.portal.outsideLayer)
        : (CAVE_ALLOWED_OUTSIDE_LAYERS.includes(currentLayer) ? currentLayer : 2)
    );
    const backLayer = getCaveInsideLayerForItem(item);
    const layerPenalty = Math.abs(currentLayer - frontLayer) * 0.08;
    const lingerMinMs = Math.max(CAVE_TRIGGER_COOLDOWN_MS + 2000, Number.isFinite(profile?.lingerMinMs) ? profile.lingerMinMs : 12000);
    const lingerMaxMs = Math.max(lingerMinMs + 2000, Number.isFinite(profile?.lingerMaxMs) ? profile.lingerMaxMs : 22000);

    candidates.push({
      decorId: item.id,
      portalId: matchedPortal?.portal?.id || trigger.id,
      triggerId: trigger.id,
      seatId: seat.id,
      seatDirection: triggerPath.direction ?? getCaveSeatFacingDirection(seat, entryDirection),
      frontLayer,
      backLayer,
      approach: approachPoint,
      mouth: mouthPoint,
      inside: triggerPath.inside,
      entryPathNodes: triggerPath.entryPathNodes,
      exitPathNodes: triggerPath.exitPathNodes,
      lingerMs: lingerMinMs + Math.random() * Math.max(400, lingerMaxMs - lingerMinMs),
      score: distanceScore + layerPenalty
    });
  }

  candidates.sort((left, right) => left.score - right.score);
  return candidates[0] || null;
}

function buildSimpleCaveDockingPlan(item, fish, now = Date.now()) {
  const configuredPlan = buildConfiguredCaveDockingPlan(item, fish, now);
  if (configuredPlan) {
    return configuredPlan;
  }

  const triggerSeatPlan = buildTriggerSeatCavePlan(item, fish, now);
  if (triggerSeatPlan) {
    return triggerSeatPlan;
  }

  const profile = getCaveBehaviorProfileForItem(item);
  if (!profile?.portals?.length) {
    return null;
  }

  const insideSlots = getCaveInsideSlots(profile);
  if (!insideSlots.length) {
    return null;
  }

  const currentLayer = getFishTankLayer(fish);
  const species = getSpeciesForFish(fish);
  if (!species) {
    return null;
  }
  const candidates = [];

  for (const portal of profile.portals) {
    const approach = mapDecorLocalPointToTankNorm(item, portal.approachX, portal.approachY);
    const mouth = mapDecorLocalPointToTankNorm(item, portal.mouthX, portal.mouthY);
    if (!approach || !mouth) {
      continue;
    }

    const portalOutsideLayer = clampTankLayer(portal.outsideLayer || 2);
    const portalInsideLayer = getCaveInsideLayerForItem(item);
    if (!CAVE_ALLOWED_OUTSIDE_LAYERS.includes(portalOutsideLayer)) {
      continue;
    }

    const frontLayer = portalOutsideLayer;
    const backLayer = portalInsideLayer;
    const entryDirection = Math.abs(mouth.xNorm - approach.xNorm) > 0.0001
      ? (mouth.xNorm >= approach.xNorm ? 1 : -1)
      : (fish.direction || 1);
    if (!portalOpeningFitsFish(item, fish, species, now, mouth, entryDirection)) {
      continue;
    }

    const matchingSlots = insideSlots.filter((slot) => !slot.portalIds?.length || slot.portalIds.includes(portal.id));
    const slotPool = matchingSlots.length ? matchingSlots : insideSlots;

    for (const slot of slotPool) {
      const inside = mapDecorLocalPointToTankNorm(item, slot.x, slot.y);
      const slotLayer = clampTankLayer(slot.layer || portalInsideLayer);
      const seatDirection = getCaveSeatFacingDirection(slot, entryDirection);
      if (!inside) {
        continue;
      }
      if (!isPointInsideCaveInteriorDescriptor(item, inside) || !doesFishFitAtCavePoint(item, fish, species, now, inside, seatDirection, CAVE_PLAN_SAMPLE_STEP_PX)) {
        continue;
      }

      const rawEntryPathNodes = Array.isArray(portal.path)
        ? portal.path
          .map((node) => mapDecorLocalPointToTankNorm(item, node.x, node.y))
          .filter(Boolean)
        : [];
      const entryPathNodes = [];
      let previousInsidePoint = null;
      let validInsideRoute = true;

      for (const node of [...rawEntryPathNodes, inside]) {
        if (!isPointInsideCaveInteriorDescriptor(item, node) || !doesFishFitAtCavePoint(item, fish, species, now, node, entryDirection, CAVE_PLAN_SAMPLE_STEP_PX)) {
          validInsideRoute = false;
          break;
        }

        if (previousInsidePoint && !pathStaysInsideCave(item, fish, species, now, previousInsidePoint, node, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
          validInsideRoute = false;
          break;
        }

        if (node !== inside) {
          entryPathNodes.push(node);
        }
        previousInsidePoint = node;
      }

      const firstInsidePoint = entryPathNodes[0] || inside;
      if (!validInsideRoute || !pathStaysInsideCave(item, fish, species, now, mouth, firstInsidePoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
        continue;
      }

      const exitPathNodes = entryPathNodes.slice().reverse();
      const distanceScore = Math.hypot(fish.xNorm - approach.xNorm, fish.yNorm - approach.yNorm);
      const layerPenalty = Math.abs(currentLayer - frontLayer) * 0.08;

      candidates.push({
        decorId: item.id,
        portalId: portal.id,
        seatId: slot.id,
        slotId: slot.id,
        seatDirection,
        frontLayer,
        backLayer: slotLayer,
        approach,
        mouth,
        inside,
        entryPathNodes,
        exitPathNodes,
        lingerMs: profile.lingerMinMs + Math.random() * Math.max(200, profile.lingerMaxMs - profile.lingerMinMs),
        score: distanceScore + layerPenalty
      });
    }
  }

  candidates.sort((left, right) => left.score - right.score);
  return candidates[0] || null;
}

function collectCaveBehaviorPlansForFish(fish, now = Date.now(), options = {}) {
  if (!fish) {
    return [];
  }

  const ignoreBlockedDecor = options.ignoreBlockedDecor === true;
  const plans = state.placedDecor
    .filter((item) => isCaveDecorKey(item.decorKey))
    .filter((item) => !(
      !ignoreBlockedDecor &&
      fish.blockedDecorId &&
      item.id === fish.blockedDecorId &&
      Number.isFinite(fish.blockedDecorUntil) &&
      now < fish.blockedDecorUntil
    ))
    .map((item) => buildSimpleCaveDockingPlan(item, fish, now))
    .filter(Boolean)
    .sort((left, right) => left.score - right.score);

  return plans.slice(0, MAX_VALID_CAVE_PLANS_PER_EVAL);
}

function clearFishCaveBehavior(fish) {
  if (!fish) {
    return;
  }

  runtime.activeFishCavePlans.delete(fish.id);
  fish.caveState = null;
  fish.caveDecorId = null;
  fish.cavePortalId = null;
  fish.caveTriggerId = null;
  fish.caveSeatId = null;
  fish.caveFrontLayer = null;
  fish.caveBackLayer = null;
  fish.caveApproachXNorm = null;
  fish.caveApproachYNorm = null;
  fish.caveEntryXNorm = null;
  fish.caveEntryYNorm = null;
  fish.caveInsideXNorm = null;
  fish.caveInsideYNorm = null;
  fish.caveInsideUntil = null;
  fish.cavePathIndex = null;
  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;
}

function getCaveBehaviorDecorById(decorId) {
  if (!decorId) {
    return null;
  }

  return state.placedDecor.find((item) => item.id === decorId) || null;
}

function getActiveFishCavePlan(fish) {
  if (!fish) {
    return null;
  }

  return runtime.activeFishCavePlans.get(fish.id) || null;
}

function getActiveFishCaveTriggerRegion(fish) {
  if (!fish?.caveDecorId) {
    return null;
  }

  const decor = getCaveBehaviorDecorById(fish.caveDecorId);
  if (!decor) {
    return null;
  }

  return findRegionById(getCaveTriggerRegions(decor), fish.caveTriggerId || fish.cavePortalId);
}

function getActiveFishCaveSeatRegion(fish) {
  if (!fish?.caveDecorId || fish.caveState !== "inside" || !fish?.caveSeatId) {
    return null;
  }

  const decor = getCaveBehaviorDecorById(fish.caveDecorId);
  if (!decor) {
    return null;
  }

  return findRegionById(getCaveSeatRegions(decor), fish.caveSeatId);
}

function applyFishCaveSeatFacing(fish, species, seatRegion, now = Date.now(), fallback = 1) {
  if (!fish || !species || species.behavior === "sucker" || !seatRegion) {
    return false;
  }

  setFishDirection(fish, getCaveSeatFacingDirection(seatRegion, fallback), species, now);
  return true;
}

function applyFishCaveSeatFacingById(fish, species, decorItem, seatId, now = Date.now(), fallback = 1) {
  if (!decorItem || !seatId) {
    return false;
  }

  const seatRegion = findRegionById(getCaveSeatRegions(decorItem), seatId);
  return applyFishCaveSeatFacing(fish, species, seatRegion, now, fallback);
}

function getReservedFishCaveSeatId(fish) {
  if (!fish?.id || !fish?.caveDecorId || !fish?.caveState) {
    return null;
  }

  const activePlan = runtime.activeFishCavePlans.get(fish.id) || null;
  if (activePlan?.debugTestLoop) {
    return activePlan.debugSeatId || null;
  }

  return activePlan?.seatId || activePlan?.slotId || fish.caveSeatId || null;
}

function getFishActiveCaveInsideLayer(fish, fallbackLayer = DEFAULT_TANK_LAYER) {
  const baseLayer = clampTankLayer(
    Number.isFinite(Number(fish?.caveBackLayer))
      ? Number(fish.caveBackLayer)
      : fallbackLayer
  );
  if (!fish || !["enter", "inside", "exit", "depart"].includes(fish.caveState)) {
    return baseLayer;
  }

  if (fish.caveState === "inside" && fish.caveSeatId) {
    return clampTankLayer(CAVE_SEAT_LOCKED_LAYER);
  }

  return baseLayer;
}

function getPortalMatchForTriggerRegion(item, triggerRegion, profile) {
  if (!item || !triggerRegion || !Array.isArray(profile?.portals) || !profile.portals.length) {
    return null;
  }

  const exactPortal = triggerRegion.id
    ? profile.portals.find((portal) => portal?.id === triggerRegion.id) || null
    : null;
  if (exactPortal) {
    const mouthPoint = mapDecorLocalPointToTankNorm(item, exactPortal.mouthX, exactPortal.mouthY);
    if (mouthPoint) {
      return {
        portal: exactPortal,
        mouthPoint,
        approachPoint: mapDecorLocalPointToTankNorm(item, exactPortal.approachX, exactPortal.approachY)
      };
    }
  }

  let bestMatch = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const portal of profile.portals) {
    const mouthPoint = mapDecorLocalPointToTankNorm(item, portal.mouthX, portal.mouthY);
    if (!mouthPoint) {
      continue;
    }

    const distanceNorm = Math.hypot(triggerRegion.xNorm - mouthPoint.xNorm, triggerRegion.yNorm - mouthPoint.yNorm);
    if (distanceNorm < bestDistance) {
      bestDistance = distanceNorm;
      bestMatch = {
        portal,
        mouthPoint,
        approachPoint: mapDecorLocalPointToTankNorm(item, portal.approachX, portal.approachY)
      };
    }
  }

  return bestMatch;
}

function getExplicitCaveBehaviorPortals(decorKey = "") {
  const directMeta = runtime.decorMap.get(decorKey)?.caveBehavior || runtime.decorMeta[decorKey]?.caveBehavior || null;
  const key = String(decorKey || "").toLowerCase();
  const overrideEntry = Object.entries(CAVE_BEHAVIOR_OVERRIDES).find(([matchKey]) => key.includes(matchKey.toLowerCase()));
  const override = overrideEntry?.[1] || null;
  if (Array.isArray(override?.portals) && override.portals.length) {
    return override.portals;
  }
  if (Array.isArray(directMeta?.portals) && directMeta.portals.length) {
    return directMeta.portals;
  }

  return [];
}

function buildCaveNavigationCacheKey(item, frontDescriptor, barrierDescriptor) {
  const frontBounds = frontDescriptor?.bounds;
  const barrierBounds = barrierDescriptor?.bounds;
  return [
    item.id,
    item.decorKey,
    item.scale?.toFixed?.(4) ?? item.scale,
    item.xNorm?.toFixed?.(5) ?? item.xNorm,
    item.yNorm?.toFixed?.(5) ?? item.yNorm,
    getDecorTankLayer(item),
    isDecorHorizontallyFlipped(item) ? "flip-x" : "normal-x",
    isDecorVerticallyFlipped(item) ? "flip-y" : "normal-y",
    frontBounds ? [frontBounds.left, frontBounds.top, frontBounds.right, frontBounds.bottom].map((value) => Math.round(value)).join(",") : "front",
    barrierBounds ? [barrierBounds.left, barrierBounds.top, barrierBounds.right, barrierBounds.bottom].map((value) => Math.round(value)).join(",") : "barrier"
  ].join("|");
}

function getCaveNavigationData(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  const frontDescriptor = getDecorShapeDescriptor(item);
  const barrierDescriptor = getCaveBarrierDescriptor(item);
  if (!frontDescriptor || !barrierDescriptor) {
    return null;
  }

  const cacheKey = buildCaveNavigationCacheKey(item, frontDescriptor, barrierDescriptor);
  const cached = runtime.caveNavCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rect = {
    left: Math.floor(Math.min(frontDescriptor.bounds.left, barrierDescriptor.bounds.left)),
    right: Math.ceil(Math.max(frontDescriptor.bounds.right, barrierDescriptor.bounds.right)),
    top: Math.floor(Math.min(frontDescriptor.bounds.top, barrierDescriptor.bounds.top)),
    bottom: Math.ceil(Math.max(frontDescriptor.bounds.bottom, barrierDescriptor.bounds.bottom))
  };
  const widthPx = Math.max(24, rect.right - rect.left);
  const heightPx = Math.max(24, rect.bottom - rect.top);
  const cellSize = Math.max(2, Math.ceil(Math.max(widthPx, heightPx) / CAVE_NAV_MAX_SIZE));
  const cols = Math.max(12, Math.ceil(widthPx / cellSize));
  const rows = Math.max(12, Math.ceil(heightPx / cellSize));
  const total = cols * rows;
  const frontSolid = new Uint8Array(total);
  const midSolid = new Uint8Array(total);
  const mouthOpen = new Uint8Array(total);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const worldX = rect.left + (col + 0.5) * cellSize;
      const worldY = rect.top + (row + 0.5) * cellSize;
      const hitsFront = pointHitsShapeDescriptor(frontDescriptor, worldX, worldY, ALPHA_COLLISION_THRESHOLD);
      const hitsMid = pointHitsShapeDescriptor(barrierDescriptor, worldX, worldY, ALPHA_COLLISION_THRESHOLD);
      frontSolid[index] = hitsFront ? 1 : 0;
      midSolid[index] = hitsMid ? 1 : 0;
      mouthOpen[index] = hitsMid && !hitsFront ? 1 : 0;
    }
  }

  const nav = {
    key: cacheKey,
    itemId: item.id,
    rect,
    cellSize,
    cols,
    rows,
    frontDescriptor,
    barrierDescriptor,
    frontSolid,
    midSolid,
    mouthOpen
  };

  runtime.caveNavCache.set(cacheKey, nav);
  return nav;
}

function getCaveNavIndex(nav, col, row) {
  return row * nav.cols + col;
}

function isCaveNavCellInBounds(nav, col, row) {
  return Boolean(nav && col >= 0 && row >= 0 && col < nav.cols && row < nav.rows);
}

function getCaveNavCellCenter(nav, col, row) {
  const x = nav.rect.left + (col + 0.5) * nav.cellSize;
  const y = nav.rect.top + (row + 0.5) * nav.cellSize;
  return {
    x,
    y,
    xNorm: clamp(x / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp(y / TANK_HEIGHT, 0.14, 0.8)
  };
}

function getCaveNavCellFromWorldPoint(nav, x, y) {
  if (!nav || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const col = Math.floor((x - nav.rect.left) / nav.cellSize);
  const row = Math.floor((y - nav.rect.top) / nav.cellSize);
  if (!isCaveNavCellInBounds(nav, col, row)) {
    return null;
  }

  return {
    col,
    row,
    index: getCaveNavIndex(nav, col, row)
  };
}

function collectCaveNavCandidatesNearWorldPoint(nav, x, y, radiusPx, predicate) {
  const center = getCaveNavCellFromWorldPoint(nav, x, y);
  if (!center) {
    return [];
  }

  const radiusCells = Math.max(1, Math.ceil(radiusPx / nav.cellSize));
  const candidates = [];

  for (let row = center.row - radiusCells; row <= center.row + radiusCells; row += 1) {
    for (let col = center.col - radiusCells; col <= center.col + radiusCells; col += 1) {
      if (!isCaveNavCellInBounds(nav, col, row)) {
        continue;
      }

      const point = getCaveNavCellCenter(nav, col, row);
      const distancePx = Math.hypot(point.x - x, point.y - y);
      if (distancePx > radiusPx) {
        continue;
      }

      const index = getCaveNavIndex(nav, col, row);
      const result = predicate(index, point, distancePx, col, row);
      if (result === false || result == null) {
        continue;
      }

      candidates.push({
        index,
        point,
        score: typeof result === "number" ? result : distancePx
      });
    }
  }

  candidates.sort((left, right) => left.score - right.score);
  return candidates;
}

function getFishDescriptorAtPoint(fish, species, now, xNorm, yNorm, directionOverride = null) {
  const pose = getFishCollisionPose(fish, species, now, xNorm, yNorm, directionOverride);
  return getFishShapeDescriptor(fish, species, now, pose);
}

function canFishOccupyCavePoint(nav, fish, species, now, xNorm, yNorm) {
  if (!nav || !fish || !species) {
    return false;
  }

  const direction = Math.abs(xNorm - fish.xNorm) > 0.001
    ? (xNorm >= fish.xNorm ? 1 : -1)
    : (fish.direction || 1);
  const fishDescriptor = getFishDescriptorAtPoint(fish, species, now, xNorm, yNorm, direction);
  if (!fishDescriptor) {
    return false;
  }

  return shapeContainedByMaskStrict(nav.barrierDescriptor, fishDescriptor, CAVE_STRICT_SAMPLE_STEP_PX);
}

function canFishOccupyCaveNavIndex(nav, index, fish, species, now, fitCache) {
  if (!nav?.midSolid?.[index]) {
    return false;
  }

  if (fitCache && fitCache[index] !== -1) {
    return fitCache[index] === 1;
  }

  const col = index % nav.cols;
  const row = Math.floor(index / nav.cols);
  const point = getCaveNavCellCenter(nav, col, row);
  const fits = canFishOccupyCavePoint(nav, fish, species, now, point.xNorm, point.yNorm);

  if (fitCache) {
    fitCache[index] = fits ? 1 : 0;
  }

  return fits;
}

function buildReachableCaveRegion(nav, mouthIndex, fish, species, now, fitCache) {
  const total = nav.cols * nav.rows;
  const visited = new Uint8Array(total);
  const parents = new Int32Array(total);
  parents.fill(-1);

  if (!canFishOccupyCaveNavIndex(nav, mouthIndex, fish, species, now, fitCache)) {
    return null;
  }

  const queue = [mouthIndex];
  visited[mouthIndex] = 1;

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const col = index % nav.cols;
    const row = Math.floor(index / nav.cols);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const nextCol = col + colOffset;
        const nextRow = row + rowOffset;
        if (!isCaveNavCellInBounds(nav, nextCol, nextRow)) {
          continue;
        }

        const nextIndex = getCaveNavIndex(nav, nextCol, nextRow);
        if (visited[nextIndex]) {
          continue;
        }

        if (rowOffset !== 0 && colOffset !== 0) {
          const sideIndexA = getCaveNavIndex(nav, nextCol, row);
          const sideIndexB = getCaveNavIndex(nav, col, nextRow);
          if (
            !canFishOccupyCaveNavIndex(nav, sideIndexA, fish, species, now, fitCache) ||
            !canFishOccupyCaveNavIndex(nav, sideIndexB, fish, species, now, fitCache)
          ) {
            continue;
          }
        }

        if (!canFishOccupyCaveNavIndex(nav, nextIndex, fish, species, now, fitCache)) {
          continue;
        }

        visited[nextIndex] = 1;
        parents[nextIndex] = index;
        queue.push(nextIndex);
      }
    }
  }

  return {
    visited,
    parents
  };
}

function buildCavePathIndices(parents, startIndex, endIndex) {
  const path = [];
  let index = endIndex;

  while (index !== -1) {
    path.push(index);
    if (index === startIndex) {
      break;
    }
    index = parents[index];
  }

  if (!path.length || path[path.length - 1] !== startIndex) {
    return [];
  }

  return path.reverse();
}

function compressCavePathNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length <= 2) {
    return Array.isArray(nodes) ? nodes : [];
  }

  const compressed = [nodes[0]];
  let lastKept = nodes[0];

  for (let index = 1; index < nodes.length - 1; index += 1) {
    const node = nodes[index];
    if (Math.hypot(node.x - lastKept.x, node.y - lastKept.y) >= CAVE_PATH_NODE_STEP) {
      compressed.push(node);
      lastKept = node;
    }
  }

  compressed.push(nodes[nodes.length - 1]);
  return compressed.map((node) => ({
    xNorm: clamp(node.x / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp(node.y / TANK_HEIGHT, 0.14, 0.8)
  }));
}

function sanitizeGravelPebble(pebble) {
  if (!pebble) {
    return null;
  }

  const colorIndex = clamp(Math.floor(Number(pebble.colorIndex) || 0), 0, 2);
  const spriteCount = Math.max(1, runtime.gravelCatalog.length || 1);
  return {
    id: String(pebble.id || createId("gravel")),
    xNorm: clamp(Number(pebble.xNorm) || randomBetween(0.08, 0.92), 0.08, 0.92),
    yNorm: clamp(Number(pebble.yNorm) || 0.88, 0.2, 0.98),
    size: clamp(Number(pebble.size) || randomBetween(GRAVEL_PEBBLE_SIZE_MIN, GRAVEL_PEBBLE_SIZE_MAX), GRAVEL_PEBBLE_SIZE_MIN, GRAVEL_PEBBLE_SIZE_MAX + 4),
    rotation: Number.isFinite(Number(pebble.rotation)) ? Number(pebble.rotation) : randomBetween(-Math.PI, Math.PI),
    spriteIndex: ((Math.floor(Number(pebble.spriteIndex) || 0) % spriteCount) + spriteCount) % spriteCount,
    colorIndex,
    variantIndex: clamp(Math.floor(Number(pebble.variantIndex) || 0), 0, GRAVEL_VARIANT_BUCKETS - 1),
    alpha: clamp(Number(pebble.alpha) || randomBetween(0.88, 1), 0.6, 1),
    stretchY: clamp(Number(pebble.stretchY) || randomBetween(0.86, 1.18), 0.72, 1.32),
    surfaceKind: pebble.surfaceKind === "decor" ? "decor" : "floor",
    decorId: typeof pebble.decorId === "string" ? pebble.decorId : null,
    anchorRatio: clamp(Number(pebble.anchorRatio) || 0.5, 0.05, 0.95),
    liftPx: clamp(Number(pebble.liftPx) || 0, 0, GRAVEL_LIVE_LAYER_DEPTH_PX)
  };
}

function reconcileLooseGravelPebbles(pebbles, placedDecor = state?.placedDecor || []) {
  if (!Array.isArray(pebbles)) {
    return [];
  }

  const nextPebbles = [];
  const seen = new Set();
  for (const rawPebble of pebbles) {
    const pebble = sanitizeGravelPebble(rawPebble);
    if (!pebble || seen.has(pebble.id)) {
      continue;
    }
    seen.add(pebble.id);

    if (pebble.surfaceKind === "decor") {
      const decorItem = placedDecor.find((item) => item.id === pebble.decorId);
      const surface = decorItem ? getDecorPebbleSurfacePose(decorItem, pebble.anchorRatio, pebble.liftPx) : null;
      if (surface) {
        pebble.xNorm = clamp(surface.x / TANK_WIDTH, 0.08, 0.92);
        pebble.yNorm = clamp(surface.y / TANK_HEIGHT, 0.2, 0.98);
        pebble.anchorRatio = surface.anchorRatio;
        pebble.liftPx = surface.liftPx;
      } else {
        pebble.surfaceKind = "floor";
        pebble.decorId = null;
        pebble.liftPx = clamp(pebble.liftPx, 0, GRAVEL_LIVE_LAYER_DEPTH_PX);
        const floorSurfaceY = getTankFloorSurfaceYAtX(pebble.xNorm * TANK_WIDTH);
        pebble.yNorm = clamp((floorSurfaceY + pebble.liftPx) / TANK_HEIGHT, 0.2, 0.98);
      }
    } else {
      pebble.surfaceKind = "floor";
      pebble.decorId = null;
      pebble.liftPx = clamp(
        Number.isFinite(Number(pebble.liftPx))
          ? Number(pebble.liftPx)
          : pebble.yNorm * TANK_HEIGHT - getTankFloorSurfaceYAtX(pebble.xNorm * TANK_WIDTH),
        0,
        GRAVEL_LIVE_LAYER_DEPTH_PX
      );
      const floorSurfaceY = getTankFloorSurfaceYAtX(pebble.xNorm * TANK_WIDTH);
      pebble.yNorm = clamp((floorSurfaceY + pebble.liftPx) / TANK_HEIGHT, 0.2, 0.98);
    }

    nextPebbles.push(pebble);
  }

  return nextPebbles;
}

function getDecorPebbleProfile(decorKey = "") {
  const key = decorKey.toLowerCase();
  if (/(castle|cave|terracotta|bridge|arch|hide|pagoda)/.test(key)) {
    return { insetRatio: 0.16, baseHeightRatio: 0.13, maxLiftPx: 16 };
  }
  if (/(rock|shell|driftwood|root|chest)/.test(key)) {
    return { insetRatio: 0.18, baseHeightRatio: 0.1, maxLiftPx: 13 };
  }
  if (/(coral|seaweed|grass|anubias|moss|bloom|bunch)/.test(key)) {
    return { insetRatio: 0.22, baseHeightRatio: 0.075, maxLiftPx: 10 };
  }
  return { insetRatio: 0.18, baseHeightRatio: 0.09, maxLiftPx: 12 };
}

function getDecorPebbleSurfacePose(item, anchorRatio = 0.5, desiredLiftPx = 0) {
  const bounds = getPlacedDecorBounds(item);
  if (!bounds) {
    return null;
  }

  const profile = getDecorPebbleProfile(item.decorKey);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const clampedRatio = clamp(anchorRatio, profile.insetRatio, 1 - profile.insetRatio);
  const x = bounds.left + width * clampedRatio;
  const baseHeightPx = clamp(height * profile.baseHeightRatio, 8, 24);
  const liftPx = clamp(desiredLiftPx, 0, profile.maxLiftPx);
  return {
    x,
    y: bounds.bottom - baseHeightPx + liftPx,
    anchorRatio: clampedRatio,
    liftPx,
    maxLiftPx: profile.maxLiftPx
  };
}

function getLooseGravelFloorPose(xNorm, desiredLiftPx = 0) {
  const clampedXNorm = clamp(xNorm, 0.08, 0.92);
  const x = clampedXNorm * TANK_WIDTH;
  const floorSurfaceY = getTankFloorSurfaceYAtX(x);
  const liftPx = clamp(desiredLiftPx, 0, GRAVEL_LIVE_LAYER_DEPTH_PX);
  const embeddedY = floorSurfaceY + GRAVEL_SURFACE_EMBED_PX + liftPx * 0.58;
  return {
    x,
    y: embeddedY,
    xNorm: clampedXNorm,
    yNorm: clamp(embeddedY / TANK_HEIGHT, 0.2, 0.98),
    surfaceY: floorSurfaceY,
    liftPx
  };
}

function resolveLiveGravelPebblePose(pebble) {
  if (!pebble) {
    return null;
  }

  if (pebble.surfaceKind === "decor" && pebble.decorId) {
    const decorItem = state.placedDecor.find((item) => item.id === pebble.decorId);
    const decorPose = decorItem ? getDecorPebbleSurfacePose(decorItem, pebble.anchorRatio, pebble.liftPx) : null;
    if (decorPose) {
      return { x: decorPose.x, y: decorPose.y };
    }
  }

  const floorPose = getLooseGravelFloorPose(pebble.xNorm, pebble.liftPx);
  return { x: floorPose.x, y: floorPose.y };
}

function getPebbleDropTarget(x, startY) {
  const floorPose = getLooseGravelFloorPose(x / TANK_WIDTH, randomBetween(0, GRAVEL_LIVE_LAYER_DEPTH_PX * 0.68));
  let bestTarget = {
    surfaceKind: "floor",
    decorId: null,
    anchorRatio: 0.5,
    x: floorPose.x,
    y: floorPose.y,
    xNorm: floorPose.xNorm,
    yNorm: floorPose.yNorm,
    liftPx: floorPose.liftPx
  };

  for (const item of state.placedDecor) {
    const bounds = getPlacedDecorBounds(item);
    if (!bounds) {
      continue;
    }

    const profile = getDecorPebbleProfile(item.decorKey);
    const width = bounds.right - bounds.left;
    const leftLimit = bounds.left + width * profile.insetRatio;
    const rightLimit = bounds.right - width * profile.insetRatio;
    if (x < leftLimit || x > rightLimit) {
      continue;
    }

    const candidate = getDecorPebbleSurfacePose(item, (x - bounds.left) / width, randomBetween(0, profile.maxLiftPx * 0.6));
    if (!candidate) {
      continue;
    }

    if (candidate.y + 2 < startY || candidate.y > floorPose.y + 3) {
      continue;
    }

    if (candidate.y < bestTarget.y) {
      bestTarget = {
        surfaceKind: "decor",
        decorId: item.id,
        anchorRatio: candidate.anchorRatio,
        x: candidate.x,
        y: candidate.y,
        xNorm: clamp(candidate.x / TANK_WIDTH, 0.08, 0.92),
        yNorm: clamp(candidate.y / TANK_HEIGHT, 0.2, 0.98),
        liftPx: candidate.liftPx
      };
    }
  }

  return bestTarget;
}

function findLiveGravelPebbleAtPoint(x, y) {
  const draggedId = runtime.pebbleDragState?.existingId || null;
  const candidates = [...state.gravelLivePebbles]
    .filter((pebble) => pebble.id !== draggedId)
    .map((pebble) => ({ pebble, descriptor: getPebbleShapeDescriptor(pebble) }))
    .filter((entry) => Boolean(entry.descriptor))
    .sort((left, right) => right.descriptor.pose.y - left.descriptor.pose.y);

  for (const { pebble, descriptor } of candidates) {
    if (pointHitsShapeDescriptor(descriptor, x, y)) {
      return pebble;
    }
  }

  return null;
}

function isPointNearGravelBed(x, y) {
  const floorSurfaceY = getTankFloorSurfaceYAtX(x);
  return y >= floorSurfaceY - GRAVEL_PULL_ZONE_PX && y <= TANK_HEIGHT - GLASS_MARGIN_BOTTOM + 2;
}

function createLoosePebbleFromBed(x, y) {
  return sanitizeGravelPebble({
    id: createId("gravel"),
    xNorm: clamp(x / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp(y / TANK_HEIGHT, 0.12, 0.98),
    size: randomBetween(GRAVEL_PEBBLE_SIZE_MIN, GRAVEL_PEBBLE_SIZE_MAX + 1.5),
    rotation: randomBetween(-Math.PI, Math.PI),
    spriteIndex: Math.floor(Math.random() * Math.max(1, runtime.gravelCatalog.length || 1)),
    colorIndex: Math.floor(Math.random() * 3),
    variantIndex: Math.floor(Math.random() * GRAVEL_VARIANT_BUCKETS),
    alpha: randomBetween(0.9, 1),
    stretchY: randomBetween(0.84, 1.2),
    surfaceKind: "floor",
    decorId: null,
    anchorRatio: 0.5,
    liftPx: randomBetween(0, GRAVEL_LIVE_LAYER_DEPTH_PX * 0.28)
  });
}

function beginGravelPebbleDrag(pebble, point, pointerId, options = {}) {
  if (!pebble) {
    return;
  }

  const pose = options.existing ? resolveLiveGravelPebblePose(pebble) : {
    x: pebble.xNorm * TANK_WIDTH,
    y: pebble.yNorm * TANK_HEIGHT
  };
  const dragPebble = sanitizeGravelPebble({
    ...pebble,
    xNorm: clamp((pose?.x ?? point.x) / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp((pose?.y ?? point.y) / TANK_HEIGHT, 0.12, 0.98),
    surfaceKind: "floor",
    decorId: null
  });

  runtime.pointerDown = true;
  runtime.suppressNextTankClick = true;
  runtime.pebbleDragState = {
    existingId: options.existing ? pebble.id : null,
    pebble: dragPebble,
    offsetXNorm: dragPebble.xNorm - point.x / TANK_WIDTH,
    offsetYNorm: dragPebble.yNorm - point.y / TANK_HEIGHT,
    moved: false
  };

  try {
    dom.tankStage.setPointerCapture(pointerId);
    rememberTankPointerCapture(pointerId);
  } catch (error) {
    console.debug("Pointer capture skipped.", error);
  }

  applyLocalGravelDisturbance(point.x, point.y, {
    radiusPx: options.existing ? 34 : 72,
    force: options.existing ? 0.24 : 0.78
  });
  const now = Date.now();
  spawnGravelCloudEffectAtPoint(point.x, point.y, {
    now,
    intensity: options.existing ? 0.46 : 0.9,
    sedimentStrength: getSedimentStrength(now, options.existing ? 0.55 : 0.9),
    baseRadius: options.existing ? 15 : 24,
    driftX: randomBetween(-4, 4),
    driftY: randomBetween(-8, -2)
  });
  updateDraggedGravelPebble(point);
  renderUi(now);
}

function updateDraggedGravelPebble(point) {
  const drag = runtime.pebbleDragState;
  if (!drag || !point) {
    return;
  }

  const nextXNorm = clamp(point.x / TANK_WIDTH + drag.offsetXNorm, 0.08, 0.92);
  const nextYNorm = clamp(point.y / TANK_HEIGHT + drag.offsetYNorm, 0.1, 0.96);
  const movedDistance = Math.hypot((drag.pebble.xNorm - nextXNorm) * TANK_WIDTH, (drag.pebble.yNorm - nextYNorm) * TANK_HEIGHT);
  if (movedDistance >= 3) {
    drag.moved = true;
    runtime.suppressNextTankClick = true;
  }

  drag.pebble.xNorm = nextXNorm;
  drag.pebble.yNorm = nextYNorm;
  drag.pebble.surfaceKind = "floor";
  drag.pebble.decorId = null;
}

function finalizeGravelPebbleDrag() {
  const drag = runtime.pebbleDragState;
  if (!drag) {
    return;
  }

  runtime.pebbleDragState = null;
  const now = Date.now();
  if (!drag.moved && drag.existingId) {
    renderUi(now);
    return;
  }

  const startX = drag.pebble.xNorm * TANK_WIDTH;
  const target = getPebbleDropTarget(startX, drag.pebble.yNorm * TANK_HEIGHT);
  const startY = Math.min(drag.pebble.yNorm * TANK_HEIGHT, target.y - 8);
  const landingPebble = sanitizeGravelPebble({
    ...drag.pebble,
    xNorm: target.xNorm,
    yNorm: target.yNorm,
    surfaceKind: target.surfaceKind,
    decorId: target.decorId,
    anchorRatio: target.anchorRatio,
    liftPx: target.liftPx
  });

  if (drag.existingId) {
    state.gravelLivePebbles = state.gravelLivePebbles.filter((pebble) => pebble.id !== drag.existingId);
  }

  runtime.fallingGravelPebbles.push({
    id: createId("gravel-fall"),
    pebble: landingPebble,
    startX,
    startY,
    endX: target.x,
    endY: target.y,
    driftX: randomBetween(-12, 12),
    sway: Math.random(),
    startedAt: now,
    durationMs: 1100 + Math.hypot(target.x - startX, target.y - startY) * 2.8
  });

  applyLocalGravelDisturbance(target.x, target.y, {
    radiusPx: 42,
    force: 0.36
  });
  markGravelStateDirty();

  renderUi(now);
}

function getFallingGravelPebblePose(falling, now) {
  const progress = clamp((now - falling.startedAt) / Math.max(1, falling.durationMs), 0, 1);
  const eased = 1 - Math.pow(1 - progress, 2.1);
  const sway = Math.sin(progress * Math.PI * 2 + falling.sway * Math.PI * 2) * (1 - progress) * 5;
  return {
    x: falling.startX + (falling.endX - falling.startX) * eased + falling.driftX * (1 - progress) * 0.16 + sway,
    y: falling.startY + (falling.endY - falling.startY) * eased
  };
}
