// Source fragment: fish/caves-and-collision.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function pickCaveEntryBehavior(species, fish, now = Date.now()) {
  if (
    !fish ||
    species?.behavior === "sucker" ||
    species?.caveEnabled === false ||
    (Number.isFinite(fish.caveTriggerCooldownUntil) && now < fish.caveTriggerCooldownUntil)
  ) {
    return null;
  }

  const assignedCaveId = isTankLightsOut(now) ? getFishResidenceDecorId(fish) : null;
  const assignedCave = assignedCaveId
    ? state.placedDecor.find((item) => item.id === assignedCaveId && isCaveDecorKey(item.decorKey))
    : null;
  if (!assignedCave && Math.random() > getCaveBehaviorChance(species, now)) {
    return null;
  }

  const candidates = collectCaveBehaviorPlansForFish(fish, now).filter((plan) => {
    const item = state.placedDecor.find((entry) => entry.id === plan.decorId);
    return !item
      || getFishResidenceDecorId(fish) === plan.decorId
      || getResidenceReservationCount(plan.decorId, fish) < getDecorResidenceCapacity(item);
  });
  if (!candidates.length) {
    return null;
  }

  return (assignedCave ? candidates.find((plan) => plan.decorId === assignedCave.id) : null) || candidates[0];
}

function setFishTargetToCaveNode(fish, node, now = Date.now(), extraMs = 1800) {
  if (!fish || !node) {
    return false;
  }

  fish.targetXNorm = clamp(node.xNorm, 0.08, 0.92);
  fish.targetYNorm = clamp(node.yNorm, 0.14, 0.8);
  fish.targetAt = now + extraMs + Math.hypot(fish.xNorm - fish.targetXNorm, fish.yNorm - fish.targetYNorm) * 18000;
  return true;
}

function getDebugCaveSeatSequence(item, fish, species, now = Date.now(), anchorPoint = null) {
  if (!item || !fish || !species) {
    return [];
  }

  const origin = anchorPoint || {
    xNorm: fish.xNorm,
    yNorm: fish.yNorm
  };

  return getCaveSeatRegions(item)
    .filter((seat) => !isCaveSeatOccupied(item.id, seat.id, fish.id))
    .filter((seat) => doesFishFitCaveRegionSize(seat, fish, species, 0.45))
    .map((seat) => {
      const fallbackDirection = Math.abs(seat.xNorm - origin.xNorm) > 0.001
        ? (seat.xNorm >= origin.xNorm ? 1 : -1)
        : (fish.direction || 1);
      const direction = getCaveSeatFacingDirection(seat, fallbackDirection);
      const idlePoint = pickCaveSeatIdleTarget(item, seat, fish, species, now, direction) || {
        xNorm: seat.xNorm,
        yNorm: seat.yNorm
      };
      if (!doesFishFitAtCavePoint(item, fish, species, now, idlePoint, direction, CAVE_PLAN_SAMPLE_STEP_PX)) {
        return null;
      }

      return {
        id: seat.id,
        distance: Math.hypot(idlePoint.xNorm - origin.xNorm, idlePoint.yNorm - origin.yNorm),
        xNorm: idlePoint.xNorm,
        yNorm: idlePoint.yNorm
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (Math.abs(left.distance - right.distance) > 0.0005) {
        return left.distance - right.distance;
      }

      if (Math.abs(left.yNorm - right.yNorm) > 0.0005) {
        return left.yNorm - right.yNorm;
      }

      return left.xNorm - right.xNorm;
    })
    .map((seat) => seat.id);
}

function findClosestCaveNavCandidate(nav, point, fish, species, now, fitCache, radiusPx = 96) {
  if (!nav || !point || !fish || !species) {
    return null;
  }

  const worldX = Number.isFinite(Number(point.x))
    ? Number(point.x)
    : (Number.isFinite(Number(point.xNorm)) ? Number(point.xNorm) * TANK_WIDTH : Number.NaN);
  const worldY = Number.isFinite(Number(point.y))
    ? Number(point.y)
    : (Number.isFinite(Number(point.yNorm)) ? Number(point.yNorm) * TANK_HEIGHT : Number.NaN);

  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
    return null;
  }

  return collectCaveNavCandidatesNearWorldPoint(nav, worldX, worldY, radiusPx, (index, candidatePoint, distancePx) => {
    if (!canFishOccupyCaveNavIndex(nav, index, fish, species, now, fitCache)) {
      return false;
    }

    return distancePx;
  })[0] || null;
}

function buildCaveInteriorRouteNodes(item, fish, species, fromPoint, toPoint, now = Date.now()) {
  if (!item || !fish || !species || !fromPoint || !toPoint) {
    return null;
  }

  const startPoint = {
    xNorm: clamp(fromPoint.xNorm, 0.08, 0.92),
    yNorm: clamp(fromPoint.yNorm, 0.14, 0.8)
  };
  const endPoint = {
    xNorm: clamp(toPoint.xNorm, 0.08, 0.92),
    yNorm: clamp(toPoint.yNorm, 0.14, 0.8)
  };

  if (pathStaysInsideCave(item, fish, species, now, startPoint, endPoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
    return [endPoint];
  }

  const nav = getCaveNavigationData(item);
  if (!nav) {
    return null;
  }

  const fitCache = new Int8Array(nav.cols * nav.rows);
  fitCache.fill(-1);
  const scanRadius = Math.max(CAVE_PORTAL_SCAN_RADIUS_PX * 6, 96);
  const startCandidate = findClosestCaveNavCandidate(nav, startPoint, fish, species, now, fitCache, scanRadius);
  if (!startCandidate) {
    return null;
  }

  const reachable = buildReachableCaveRegion(nav, startCandidate.index, fish, species, now, fitCache);
  if (!reachable) {
    return null;
  }

  const endCandidate = collectCaveNavCandidatesNearWorldPoint(
    nav,
    endPoint.xNorm * TANK_WIDTH,
    endPoint.yNorm * TANK_HEIGHT,
    scanRadius,
    (index, candidatePoint, distancePx) => {
      if (!reachable.visited[index] || !canFishOccupyCaveNavIndex(nav, index, fish, species, now, fitCache)) {
        return false;
      }

      return distancePx;
    }
  )[0] || null;
  if (!endCandidate) {
    return null;
  }

  const pathIndices = buildCavePathIndices(reachable.parents, startCandidate.index, endCandidate.index);
  if (!pathIndices.length) {
    return null;
  }

  let nodes = compressCavePathNodes(
    pathIndices.map((index) => {
      const col = index % nav.cols;
      const row = Math.floor(index / nav.cols);
      return getCaveNavCellCenter(nav, col, row);
    })
  );
  if (!nodes.length) {
    nodes = [{ ...endCandidate.point }];
  }

  while (
    nodes.length > 1 &&
    Math.hypot(nodes[0].xNorm - startPoint.xNorm, nodes[0].yNorm - startPoint.yNorm) <= 0.012
  ) {
    nodes.shift();
  }

  const lastNode = nodes[nodes.length - 1];
  if (!lastNode) {
    return null;
  }

  if (
    Math.hypot(lastNode.xNorm - endPoint.xNorm, lastNode.yNorm - endPoint.yNorm) > 0.006 &&
    pathStaysInsideCave(item, fish, species, now, lastNode, endPoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)
  ) {
    nodes.push(endPoint);
  } else if (Math.hypot(lastNode.xNorm - endPoint.xNorm, lastNode.yNorm - endPoint.yNorm) <= 0.006) {
    nodes[nodes.length - 1] = endPoint;
  }

  return nodes;
}

function clearDebugCavePathState(plan) {
  if (!plan) {
    return;
  }

  plan.debugPathNodes = [];
  plan.debugPathIndex = null;
}

function appendUniqueDebugCaveNodes(targetNodes, nodes) {
  if (!Array.isArray(targetNodes) || !Array.isArray(nodes)) {
    return targetNodes;
  }

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    const nextNode = {
      xNorm: clamp(node.xNorm, 0.08, 0.92),
      yNorm: clamp(node.yNorm, 0.14, 0.8)
    };
    const previousNode = targetNodes[targetNodes.length - 1] || null;
    if (previousNode && Math.hypot(previousNode.xNorm - nextNode.xNorm, previousNode.yNorm - nextNode.yNorm) <= 0.003) {
      continue;
    }

    targetNodes.push(nextNode);
  }

  return targetNodes;
}

function buildCheapDebugCaveSegmentNodes(item, fish, species, fromPoint, toPoint, now = Date.now(), viaPoint = null) {
  if (!item || !fish || !species || !fromPoint || !toPoint) {
    return [];
  }

  const startPoint = {
    xNorm: clamp(fromPoint.xNorm, 0.08, 0.92),
    yNorm: clamp(fromPoint.yNorm, 0.14, 0.8)
  };
  const endPoint = {
    xNorm: clamp(toPoint.xNorm, 0.08, 0.92),
    yNorm: clamp(toPoint.yNorm, 0.14, 0.8)
  };

  if (Math.hypot(startPoint.xNorm - endPoint.xNorm, startPoint.yNorm - endPoint.yNorm) <= 0.0035) {
    return [endPoint];
  }

  if (pathStaysInsideCave(item, fish, species, now, startPoint, endPoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
    return [endPoint];
  }

  const normalizedViaPoint = viaPoint
    ? {
      xNorm: clamp(viaPoint.xNorm, 0.08, 0.92),
      yNorm: clamp(viaPoint.yNorm, 0.14, 0.8)
    }
    : null;
  if (
    normalizedViaPoint &&
    Math.hypot(startPoint.xNorm - normalizedViaPoint.xNorm, startPoint.yNorm - normalizedViaPoint.yNorm) > 0.004 &&
    Math.hypot(normalizedViaPoint.xNorm - endPoint.xNorm, normalizedViaPoint.yNorm - endPoint.yNorm) > 0.004 &&
    pathStaysInsideCave(item, fish, species, now, startPoint, normalizedViaPoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX) &&
    pathStaysInsideCave(item, fish, species, now, normalizedViaPoint, endPoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)
  ) {
    return [normalizedViaPoint, endPoint];
  }

  const fallbackNodes = buildDebugFallbackCavePathNodes(item, startPoint, endPoint);
  if (!fallbackNodes.length) {
    return [];
  }

  const validatedNodes = [];
  let previousPoint = startPoint;
  for (const node of fallbackNodes) {
    const normalizedNode = {
      xNorm: clamp(node.xNorm, 0.08, 0.92),
      yNorm: clamp(node.yNorm, 0.14, 0.8)
    };
    if (Math.hypot(previousPoint.xNorm - normalizedNode.xNorm, previousPoint.yNorm - normalizedNode.yNorm) <= 0.0035) {
      continue;
    }

    if (!pathStaysInsideCave(item, fish, species, now, previousPoint, normalizedNode, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
      return [];
    }

    validatedNodes.push(normalizedNode);
    previousPoint = normalizedNode;
  }

  return validatedNodes;
}

function collectCheapDebugCaveRoamCandidates(item, fish, species, plan, seatRegions, now = Date.now()) {
  if (!item || !fish || !species || !plan) {
    return [];
  }

  const profile = getCaveBehaviorProfileForItem(item);
  const seen = new Set();
  const candidates = [];
  const interiorCenter = plan.inside || plan.mouth || {
    xNorm: fish.xNorm,
    yNorm: fish.yNorm
  };
  const seatList = Array.isArray(seatRegions) ? seatRegions : [];
  const addCandidate = (point, weight = 0) => {
    if (!point || !Number.isFinite(point.xNorm) || !Number.isFinite(point.yNorm)) {
      return;
    }

    const candidatePoint = {
      xNorm: clamp(point.xNorm, 0.08, 0.92),
      yNorm: clamp(point.yNorm, 0.14, 0.8)
    };
    const cacheKey = `${candidatePoint.xNorm.toFixed(4)}|${candidatePoint.yNorm.toFixed(4)}`;
    if (seen.has(cacheKey)) {
      return;
    }
    seen.add(cacheKey);

    const candidateDirection = Math.abs(candidatePoint.xNorm - interiorCenter.xNorm) > 0.001
      ? (candidatePoint.xNorm >= interiorCenter.xNorm ? 1 : -1)
      : (fish.direction || 1);
    if (!doesFishFitAtCavePoint(item, fish, species, now, candidatePoint, candidateDirection, CAVE_PLAN_SAMPLE_STEP_PX)) {
      return;
    }

    const distanceFromSeat = seatList.length
      ? seatList.reduce((bestDistance, seat) => Math.min(bestDistance, Math.hypot(candidatePoint.xNorm - seat.xNorm, candidatePoint.yNorm - seat.yNorm)), Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    if (distanceFromSeat < 0.018) {
      return;
    }

    const distanceFromCenter = Math.hypot(candidatePoint.xNorm - interiorCenter.xNorm, candidatePoint.yNorm - interiorCenter.yNorm);
    if (distanceFromCenter < 0.012) {
      return;
    }

    candidates.push({
      point: candidatePoint,
      score: distanceFromCenter + weight + Math.random() * 0.002
    });
  };

  if (Array.isArray(profile?.interiorZones)) {
    for (const zone of profile.interiorZones) {
      addCandidate(mapDecorLocalPointToTankNorm(item, (zone.xMin + zone.xMax) / 2, (zone.yMin + zone.yMax) / 2), 0.05);
      addCandidate(mapDecorLocalPointToTankNorm(item, zone.xMin + (zone.xMax - zone.xMin) * 0.22, (zone.yMin + zone.yMax) / 2), 0.03);
      addCandidate(mapDecorLocalPointToTankNorm(item, zone.xMin + (zone.xMax - zone.xMin) * 0.78, (zone.yMin + zone.yMax) / 2), 0.03);
    }
  }

  for (const slot of getCaveInsideSlots(profile)) {
    addCandidate(mapDecorLocalPointToTankNorm(item, slot.x, slot.y), 0.04);
  }

  const interiorDescriptor = getCaveInteriorContainmentDescriptor(item);
  if (interiorDescriptor?.bounds) {
    const spanXNorm = clamp(((interiorDescriptor.bounds.right - interiorDescriptor.bounds.left) / TANK_WIDTH) * 0.18, 0.014, 0.06);
    const spanYNorm = clamp(((interiorDescriptor.bounds.bottom - interiorDescriptor.bounds.top) / TANK_HEIGHT) * 0.16, 0.012, 0.045);
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 0.8],
      [-0.65, -0.55],
      [0.65, -0.55]
    ];
    for (const [offsetX, offsetY] of offsets) {
      addCandidate({
        xNorm: interiorCenter.xNorm + spanXNorm * offsetX,
        yNorm: interiorCenter.yNorm + spanYNorm * offsetY
      }, 0.02);
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  const selectedPoints = [];
  for (const candidate of candidates) {
    if (selectedPoints.some((point) => Math.hypot(point.xNorm - candidate.point.xNorm, point.yNorm - candidate.point.yNorm) < 0.015)) {
      continue;
    }

    selectedPoints.push(candidate.point);
    if (selectedPoints.length >= 3) {
      break;
    }
  }

  return selectedPoints;
}

function ensureDebugCaveSequencePrepared(fish, species, decorItem, plan, mouthNode, now = Date.now()) {
  if (!fish || !species || !decorItem || !plan) {
    return false;
  }

  if (plan.debugPrepared) {
    return true;
  }

  const seatRegions = getCaveSeatRegions(decorItem);
  if (!Array.isArray(plan.debugSeatOrder)) {
    plan.debugSeatOrder = getDebugCaveSeatSequence(decorItem, fish, species, now, plan.inside || mouthNode);
  }

  const interiorCenter = plan.inside || mouthNode || {
    xNorm: fish.xNorm,
    yNorm: fish.yNorm
  };
  const roamPathNodes = [];
  let anchorPoint = interiorCenter;
  for (const roamPoint of collectCheapDebugCaveRoamCandidates(decorItem, fish, species, plan, seatRegions, now)) {
    const segmentNodes = buildCheapDebugCaveSegmentNodes(decorItem, fish, species, anchorPoint, roamPoint, now, interiorCenter);
    if (!segmentNodes.length) {
      continue;
    }

    appendUniqueDebugCaveNodes(roamPathNodes, segmentNodes);
    anchorPoint = roamPathNodes[roamPathNodes.length - 1] || anchorPoint;
  }

  if (!roamPathNodes.length && interiorCenter) {
    roamPathNodes.push({
      xNorm: clamp(interiorCenter.xNorm, 0.08, 0.92),
      yNorm: clamp(interiorCenter.yNorm, 0.14, 0.8)
    });
  }

  const seatSteps = [];
  for (const seatId of plan.debugSeatOrder) {
    const seatRegion = findRegionById(seatRegions, seatId);
    if (!seatRegion || !doesFishFitCaveRegionSize(seatRegion, fish, species, 0.45)) {
      continue;
    }

    const seatDirection = Math.abs(seatRegion.xNorm - anchorPoint.xNorm) > 0.001
      ? (seatRegion.xNorm >= anchorPoint.xNorm ? 1 : -1)
      : (fish.direction || 1);
    const configuredSeatDirection = getCaveSeatFacingDirection(seatRegion, seatDirection);
    const seatPoint = pickCaveSeatIdleTarget(decorItem, seatRegion, fish, species, now, configuredSeatDirection) || {
      xNorm: seatRegion.xNorm,
      yNorm: seatRegion.yNorm
    };
    if (!doesFishFitAtCavePoint(decorItem, fish, species, now, seatPoint, configuredSeatDirection, CAVE_PLAN_SAMPLE_STEP_PX)) {
      continue;
    }

    const pathNodes = buildCheapDebugCaveSegmentNodes(decorItem, fish, species, anchorPoint, seatPoint, now, interiorCenter);
    seatSteps.push({
      id: seatRegion.id,
      direction: configuredSeatDirection,
      point: {
        xNorm: clamp(seatPoint.xNorm, 0.08, 0.92),
        yNorm: clamp(seatPoint.yNorm, 0.14, 0.8)
      },
      pathNodes: pathNodes.length ? pathNodes : [{
        xNorm: clamp(seatPoint.xNorm, 0.08, 0.92),
        yNorm: clamp(seatPoint.yNorm, 0.14, 0.8)
      }]
    });
    anchorPoint = seatSteps[seatSteps.length - 1].point;
  }

  plan.debugPrepared = true;
  plan.debugRoamStarted = false;
  plan.debugRoamPathNodes = roamPathNodes;
  plan.debugSeatSteps = seatSteps;
  return true;
}

function startDebugCavePath(fish, plan, nodes, now = Date.now(), extraMs = 900) {
  clearDebugCavePathState(plan);
  if (!fish || !plan || !Array.isArray(nodes) || !nodes.length) {
    return false;
  }

  plan.debugPathNodes = nodes.map((node) => ({
    xNorm: clamp(node.xNorm, 0.08, 0.92),
    yNorm: clamp(node.yNorm, 0.14, 0.8)
  }));
  plan.debugPathIndex = 0;
  return setFishTargetToCaveNode(fish, plan.debugPathNodes[0], now, extraMs);
}

function advanceDebugCavePath(fish, plan, now = Date.now(), extraMs = 900) {
  const nodes = Array.isArray(plan?.debugPathNodes) ? plan.debugPathNodes : [];
  if (!fish || !plan || !nodes.length) {
    return false;
  }

  const nodeIndex = Number.isFinite(plan.debugPathIndex)
    ? clamp(Math.floor(plan.debugPathIndex), 0, nodes.length - 1)
    : 0;
  const node = nodes[nodeIndex];
  if (!node) {
    clearDebugCavePathState(plan);
    return false;
  }

  if (
    !Number.isFinite(fish.targetXNorm) ||
    !Number.isFinite(fish.targetYNorm) ||
    Math.hypot(fish.targetXNorm - node.xNorm, fish.targetYNorm - node.yNorm) > 0.0005
  ) {
    setFishTargetToCaveNode(fish, node, now, extraMs);
  }

  if (Math.hypot(fish.xNorm - node.xNorm, fish.yNorm - node.yNorm) > CAVE_GENERAL_REACHED_DISTANCE_NORM) {
    return true;
  }

  const nextIndex = nodeIndex + 1;
  if (nextIndex < nodes.length) {
    plan.debugPathIndex = nextIndex;
    setFishTargetToCaveNode(fish, nodes[nextIndex], now, extraMs);
    return true;
  }

  clearDebugCavePathState(plan);
  return false;
}

function beginFishDebugCaveExit(fish, plan, mouthNode, now = Date.now()) {
  if (!fish || !plan || !mouthNode) {
    return false;
  }

  clearDebugCavePathState(plan);
  plan.debugPhase = "exit";
  plan.debugSeatId = null;
  plan.debugSeatPoint = null;
  plan.debugSeatDirection = null;
  plan.debugSeatHoldUntil = null;
  fish.caveSeatId = null;
  fish.caveState = "exit";
  fish.cavePathIndex = 0;
  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;
  setFishDesiredTankLayer(fish, getFishActiveCaveInsideLayer(fish, TANK_DEPTH_LAYERS));

  if (!setFishTargetToCaveNode(fish, plan.exitPathNodes[0] || mouthNode, now, 1300)) {
    abortFishCaveBehavior(fish, now, true);
    return false;
  }

  return true;
}

function updateDebugFishCaveInsideBehavior(fish, species, decorItem, plan, mouthNode, now = Date.now()) {
  if (!fish || !species || !decorItem || !plan || !mouthNode) {
    return false;
  }

  ensureDebugCaveSequencePrepared(fish, species, decorItem, plan, mouthNode, now);
  if (!Number.isFinite(plan.debugRoamUntil)) {
    plan.debugRoamUntil = now + CAVE_DEBUG_TEST_ROAM_MS;
  }
  if (!Number.isFinite(plan.debugSeatIndex)) {
    plan.debugSeatIndex = 0;
  }
  if (!plan.debugPhase) {
    plan.debugPhase = "roam";
  }

  fish.caveInsideUntil = Math.max(
    Number(fish.caveInsideUntil) || 0,
    plan.debugRoamUntil + plan.debugSeatOrder.length * CAVE_DEBUG_TEST_SEAT_MS + 1200
  );
  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;

  if (plan.debugPhase === "roam") {
    fish.caveSeatId = null;

    if (now >= plan.debugRoamUntil) {
      clearDebugCavePathState(plan);
      plan.debugPhase = "seat-move";
    } else {
      if (!plan.debugRoamStarted) {
        plan.debugRoamStarted = true;
        if (Array.isArray(plan.debugRoamPathNodes) && plan.debugRoamPathNodes.length) {
          startDebugCavePath(fish, plan, plan.debugRoamPathNodes, now, 850);
        }
      }

      if (advanceDebugCavePath(fish, plan, now, 850)) {
        return true;
      }

      if (plan.inside) {
        const holdPoint = Array.isArray(plan.debugRoamPathNodes) && plan.debugRoamPathNodes.length
          ? plan.debugRoamPathNodes[plan.debugRoamPathNodes.length - 1]
          : plan.inside;
        fish.targetXNorm = holdPoint.xNorm;
        fish.targetYNorm = holdPoint.yNorm;
        fish.targetAt = Math.min(plan.debugRoamUntil, now + 900);
      }
      return true;
    }
  }

  if (plan.debugPhase === "seat-hold") {
    const holdPoint = plan.debugSeatPoint || plan.inside || mouthNode;
    if (holdPoint) {
      fish.targetXNorm = holdPoint.xNorm;
      fish.targetYNorm = holdPoint.yNorm;
    }
    if (Number.isFinite(Number(plan.debugSeatDirection))) {
      setFishDirection(fish, normalizeCaveSeatFacing(plan.debugSeatDirection), species, now);
    }
    fish.targetAt = Math.max(Number(plan.debugSeatHoldUntil) || 0, now + 200);
    if (Number.isFinite(plan.debugSeatHoldUntil) && now < plan.debugSeatHoldUntil) {
      return true;
    }

    plan.debugSeatIndex += 1;
    plan.debugSeatId = null;
    plan.debugSeatPoint = null;
    plan.debugSeatDirection = null;
    plan.debugSeatHoldUntil = null;
    fish.caveSeatId = null;
    plan.debugPhase = "seat-move";
  }

  if (plan.debugPhase === "seat-move") {
    const seatSteps = Array.isArray(plan.debugSeatSteps) ? plan.debugSeatSteps : [];
    let activeSeatStep = seatSteps[plan.debugSeatIndex] || null;
    while (activeSeatStep && isCaveSeatOccupied(plan.decorId, activeSeatStep.id, fish.id)) {
      plan.debugSeatIndex += 1;
      plan.debugSeatId = null;
      plan.debugSeatPoint = null;
      plan.debugSeatDirection = null;
      fish.caveSeatId = null;
      activeSeatStep = seatSteps[plan.debugSeatIndex] || null;
    }
    if (!activeSeatStep) {
      return beginFishDebugCaveExit(fish, plan, mouthNode, now);
    }

    if (plan.debugSeatId !== activeSeatStep.id) {
      plan.debugSeatId = activeSeatStep.id;
      plan.debugSeatPoint = activeSeatStep.point;
      plan.debugSeatDirection = normalizeCaveSeatFacing(activeSeatStep.direction, fish.direction || 1);
      fish.caveSeatId = activeSeatStep.id;
      startDebugCavePath(fish, plan, activeSeatStep.pathNodes, now, 850);
    } else if (advanceDebugCavePath(fish, plan, now, 850)) {
      return true;
    }

    const seatReached = Boolean(
      plan.debugSeatPoint &&
      Math.hypot(fish.xNorm - plan.debugSeatPoint.xNorm, fish.yNorm - plan.debugSeatPoint.yNorm) <= CAVE_DEBUG_TEST_SEAT_SETTLE_DISTANCE_NORM
    );
    if (seatReached) {
      plan.debugPhase = "seat-hold";
      plan.debugSeatHoldUntil = now + CAVE_DEBUG_TEST_SEAT_MS;
      if (plan.debugSeatPoint) {
        fish.targetXNorm = plan.debugSeatPoint.xNorm;
        fish.targetYNorm = plan.debugSeatPoint.yNorm;
      }
      if (Number.isFinite(Number(plan.debugSeatDirection))) {
        setFishDirection(fish, normalizeCaveSeatFacing(plan.debugSeatDirection), species, now);
      }
      fish.targetAt = plan.debugSeatHoldUntil;
      return true;
    }

    if (plan.debugSeatPoint) {
      fish.targetXNorm = plan.debugSeatPoint.xNorm;
      fish.targetYNorm = plan.debugSeatPoint.yNorm;
      fish.targetAt = now + 900;
      return true;
    }

    plan.debugSeatIndex += 1;
    plan.debugSeatId = null;
    plan.debugSeatPoint = null;
    plan.debugSeatDirection = null;
    fish.caveSeatId = null;
    return true;
  }

  return beginFishDebugCaveExit(fish, plan, mouthNode, now);
}

function clearNormalCavePathState(plan) {
  if (!plan) {
    return;
  }

  plan.normalPathNodes = [];
  plan.normalPathIndex = null;
}

function buildNormalCaveInsideTravelNodes(item, fish, species, fromPoint, toPoint, now = Date.now(), viaPoint = null) {
  if (!item || !fish || !species || !fromPoint || !toPoint) {
    return [];
  }

  const routeNodes = buildCaveInteriorRouteNodes(item, fish, species, fromPoint, toPoint, now);
  if (Array.isArray(routeNodes) && routeNodes.length) {
    return routeNodes;
  }

  return buildCheapDebugCaveSegmentNodes(item, fish, species, fromPoint, toPoint, now, viaPoint);
}

function pickNormalCaveRoamAssignment(item, fish, species, plan, mouthNode, now = Date.now()) {
  if (!item || !fish || !species || !plan) {
    return null;
  }

  const origin = {
    xNorm: clamp(fish.xNorm, 0.08, 0.92),
    yNorm: clamp(fish.yNorm, 0.14, 0.8)
  };
  const interiorAnchor = plan.inside || mouthNode || origin;
  const seatRegions = getCaveSeatRegions(item);
  const candidates = collectCheapDebugCaveRoamCandidates(item, fish, species, plan, seatRegions, now);
  const lastRoamTarget = plan.normalLastRoamTarget || null;
  const pickCandidatePool = (excludeLastTarget = true) => candidates.filter((point) => (
    Math.hypot(point.xNorm - origin.xNorm, point.yNorm - origin.yNorm) > 0.012
    && (!excludeLastTarget || !lastRoamTarget || Math.hypot(point.xNorm - lastRoamTarget.xNorm, point.yNorm - lastRoamTarget.yNorm) > 0.014)
  ));
  let pool = pickCandidatePool(true);
  if (!pool.length) {
    pool = pickCandidatePool(false);
  }
  if (!pool.length && interiorAnchor) {
    pool = [interiorAnchor];
  }
  if (!pool.length) {
    return null;
  }

  const targetPoint = pool[Math.floor(Math.random() * Math.min(pool.length, 3))];
  if (!targetPoint) {
    return null;
  }

  const pathNodes = buildNormalCaveInsideTravelNodes(item, fish, species, origin, targetPoint, now, interiorAnchor);
  if (!pathNodes.length && Math.hypot(targetPoint.xNorm - origin.xNorm, targetPoint.yNorm - origin.yNorm) > 0.012) {
    return null;
  }

  return {
    point: {
      xNorm: clamp(targetPoint.xNorm, 0.08, 0.92),
      yNorm: clamp(targetPoint.yNorm, 0.14, 0.8)
    },
    pathNodes
  };
}

function startNormalCavePath(fish, plan, nodes, now = Date.now(), extraMs = 900) {
  clearNormalCavePathState(plan);
  if (!fish || !plan || !Array.isArray(nodes) || !nodes.length) {
    return false;
  }

  plan.normalPathNodes = nodes.map((node) => ({
    xNorm: clamp(node.xNorm, 0.08, 0.92),
    yNorm: clamp(node.yNorm, 0.14, 0.8)
  }));
  plan.normalPathIndex = 0;
  return setFishTargetToCaveNode(fish, plan.normalPathNodes[0], now, extraMs);
}

function advanceNormalCavePath(fish, plan, now = Date.now(), extraMs = 900) {
  const nodes = Array.isArray(plan?.normalPathNodes) ? plan.normalPathNodes : [];
  if (!fish || !plan || !nodes.length) {
    return false;
  }

  const nodeIndex = Number.isFinite(plan.normalPathIndex)
    ? clamp(Math.floor(plan.normalPathIndex), 0, nodes.length - 1)
    : 0;
  const node = nodes[nodeIndex];
  if (!node) {
    clearNormalCavePathState(plan);
    return false;
  }

  if (
    !Number.isFinite(fish.targetXNorm) ||
    !Number.isFinite(fish.targetYNorm) ||
    Math.hypot(fish.targetXNorm - node.xNorm, fish.targetYNorm - node.yNorm) > 0.0005
  ) {
    setFishTargetToCaveNode(fish, node, now, extraMs);
  }

  if (Math.hypot(fish.xNorm - node.xNorm, fish.yNorm - node.yNorm) > CAVE_GENERAL_REACHED_DISTANCE_NORM) {
    return true;
  }

  const nextIndex = nodeIndex + 1;
  if (nextIndex < nodes.length) {
    plan.normalPathIndex = nextIndex;
    setFishTargetToCaveNode(fish, nodes[nextIndex], now, extraMs);
    return true;
  }

  clearNormalCavePathState(plan);
  return false;
}

function beginFishNormalCaveExit(fish, plan, mouthNode, now = Date.now()) {
  if (!fish || !plan || !mouthNode) {
    return false;
  }

  clearNormalCavePathState(plan);
  plan.normalInsideMode = null;
  plan.normalTargetPoint = null;
  plan.normalSeatPoint = null;
  plan.normalSeatDirection = null;
  plan.normalSeatHoldUntil = null;
  plan.seatId = null;
  fish.caveSeatId = null;
  fish.caveState = "exit";
  fish.cavePathIndex = 0;
  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;
  setFishDesiredTankLayer(fish, getFishActiveCaveInsideLayer(fish, TANK_DEPTH_LAYERS));

  if (!setFishTargetToCaveNode(fish, plan.exitPathNodes[0] || mouthNode, now, 1300)) {
    abortFishCaveBehavior(fish, now, true);
    return false;
  }

  return true;
}

function updateNormalFishCaveInsideBehavior(fish, species, decorItem, plan, mouthNode, now = Date.now()) {
  if (!fish || !species || !decorItem || !plan || !mouthNode) {
    return false;
  }

  const currentPoint = {
    xNorm: clamp(fish.xNorm, 0.08, 0.92),
    yNorm: clamp(fish.yNorm, 0.14, 0.8)
  };
  const interiorAnchor = plan.inside || mouthNode || currentPoint;
  const setInsideTarget = (point) => {
    if (!point) {
      return;
    }

    const normalizedPoint = {
      xNorm: clamp(point.xNorm, 0.08, 0.92),
      yNorm: clamp(point.yNorm, 0.14, 0.8)
    };
    plan.normalTargetPoint = normalizedPoint;
    fish.caveInsideXNorm = normalizedPoint.xNorm;
    fish.caveInsideYNorm = normalizedPoint.yNorm;
  };
  const clearSeatReservation = () => {
    plan.seatId = null;
    plan.normalSeatPoint = null;
    plan.normalSeatDirection = null;
    plan.normalSeatHoldUntil = null;
    fish.caveSeatId = null;
  };
  const configuredPoints = Boolean(plan.configuredPoints);
  const tryConfiguredSeatReplacement = () => {
    if (!configuredPoints) {
      return false;
    }

    const replacementSeat = pickAvailableCaveSeatAssignment(decorItem, fish, species, now, currentPoint);
    return replacementSeat ? beginSeatMove(replacementSeat) : false;
  };
  const beginRoam = () => {
    if (configuredPoints) {
      return beginFishNormalCaveExit(fish, plan, mouthNode, now);
    }

    clearSeatReservation();
    const roamAssignment = pickNormalCaveRoamAssignment(decorItem, fish, species, plan, mouthNode, now);
    if (!roamAssignment?.point) {
      return beginFishNormalCaveExit(fish, plan, mouthNode, now);
    }

    plan.normalInsideMode = "roam";
    plan.normalLastRoamTarget = roamAssignment.point;
    setInsideTarget(roamAssignment.point);
    if (!startNormalCavePath(fish, plan, roamAssignment.pathNodes, now, 900) && plan.normalTargetPoint) {
      setFishTargetToCaveNode(fish, plan.normalTargetPoint, now, 900);
    }
    return true;
  };
  const beginSeatMove = (seatAssignment) => {
    if (!seatAssignment?.seatId || !seatAssignment?.point) {
      return beginRoam();
    }

    const pathNodes = buildNormalCaveInsideTravelNodes(
      decorItem,
      fish,
      species,
      currentPoint,
      seatAssignment.point,
      now,
      interiorAnchor
    );
    if (!pathNodes.length && Math.hypot(currentPoint.xNorm - seatAssignment.point.xNorm, currentPoint.yNorm - seatAssignment.point.yNorm) > 0.012) {
      return beginRoam();
    }

    plan.normalInsideMode = "seat-move";
    plan.seatId = seatAssignment.seatId;
    plan.normalSeatPoint = {
      xNorm: clamp(seatAssignment.point.xNorm, 0.08, 0.92),
      yNorm: clamp(seatAssignment.point.yNorm, 0.14, 0.8)
    };
    plan.normalSeatDirection = Number.isFinite(Number(seatAssignment.direction))
      ? normalizeCaveSeatFacing(seatAssignment.direction)
      : getCaveSeatFacingDirection(seatAssignment.seatRegion, fish.direction || 1);
    plan.normalSeatHoldUntil = null;
    fish.caveSeatId = null;
    setInsideTarget(plan.normalSeatPoint);
    if (!startNormalCavePath(fish, plan, pathNodes, now, 900) && plan.normalSeatPoint) {
      setFishTargetToCaveNode(fish, plan.normalSeatPoint, now, 900);
    }
    return true;
  };
  const chooseNextAction = () => {
    if (configuredPoints) {
      const canLeaveCave = now >= (fish.caveTriggerCooldownUntil || 0);
      if (plan.normalHasRoamed) {
        return canLeaveCave
          ? beginFishNormalCaveExit(fish, plan, mouthNode, now)
          : true;
      }

      const seatAssignment = pickAvailableCaveSeatAssignment(decorItem, fish, species, now, currentPoint);
      if (seatAssignment) {
        plan.normalHasRoamed = true;
        return beginSeatMove(seatAssignment);
      }

      return canLeaveCave
        ? beginFishNormalCaveExit(fish, plan, mouthNode, now)
        : true;
    }

    if (!plan.normalHasRoamed) {
      plan.normalHasRoamed = true;
      return beginRoam();
    }

    const seatAssignment = pickAvailableCaveSeatAssignment(decorItem, fish, species, now, currentPoint);
    const sitChance = isCaveNightWindow(now) ? CAVE_NORMAL_ROAM_SIT_CHANCE_NIGHT : CAVE_NORMAL_ROAM_SIT_CHANCE_DAY;
    const leaveChance = isCaveNightWindow(now) ? CAVE_NORMAL_ROAM_LEAVE_CHANCE_NIGHT : CAVE_NORMAL_ROAM_LEAVE_CHANCE_DAY;
    const canLeaveCave = now >= (fish.caveTriggerCooldownUntil || 0);
    const roll = Math.random();

    if (roll < leaveChance) {
      return canLeaveCave
        ? beginFishNormalCaveExit(fish, plan, mouthNode, now)
        : beginRoam();
    }

    if (roll < leaveChance + sitChance && seatAssignment) {
      return beginSeatMove(seatAssignment);
    }

    return beginRoam();
  };

  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;

  if (plan.normalInsideMode === "seat-hold") {
    if (plan.seatId && isCaveSeatOccupied(plan.decorId, plan.seatId, fish.id)) {
      clearNormalCavePathState(plan);
      clearSeatReservation();
      plan.normalInsideMode = null;
      if (tryConfiguredSeatReplacement()) {
        return true;
      }
      return chooseNextAction();
    }

    if (!plan.seatId || !plan.normalSeatPoint) {
      clearNormalCavePathState(plan);
      clearSeatReservation();
      plan.normalInsideMode = null;
      if (tryConfiguredSeatReplacement()) {
        return true;
      }
      return chooseNextAction();
    }

    fish.caveSeatId = plan.seatId;
    setInsideTarget(plan.normalSeatPoint);
    if (Number.isFinite(Number(plan.normalSeatDirection))) {
      setFishDirection(fish, normalizeCaveSeatFacing(plan.normalSeatDirection), species, now);
    } else {
      applyFishCaveSeatFacingById(fish, species, decorItem, plan.seatId, now, fish.direction || 1);
    }
    fish.targetXNorm = plan.normalSeatPoint.xNorm;
    fish.targetYNorm = plan.normalSeatPoint.yNorm;
    fish.targetAt = Math.max(Number(plan.normalSeatHoldUntil) || 0, now + 250);
    if (Number.isFinite(plan.normalSeatHoldUntil) && now < plan.normalSeatHoldUntil) {
      return true;
    }

    if (configuredPoints) {
      const configuredReleaseAt = Math.max(Number(fish.caveTriggerCooldownUntil) || 0, now + 250);
      if (now < configuredReleaseAt) {
        plan.normalSeatHoldUntil = configuredReleaseAt;
        fish.targetAt = configuredReleaseAt;
        return true;
      }
    }

    clearSeatReservation();
    plan.normalInsideMode = null;
    return chooseNextAction();
  }

  if (plan.normalInsideMode === "seat-move") {
    if (!plan.seatId || !plan.normalSeatPoint) {
      clearNormalCavePathState(plan);
      clearSeatReservation();
      plan.normalInsideMode = null;
      if (tryConfiguredSeatReplacement()) {
        return true;
      }
      return chooseNextAction();
    }

    if (isCaveSeatOccupied(plan.decorId, plan.seatId, fish.id)) {
      clearNormalCavePathState(plan);
      clearSeatReservation();
      plan.normalInsideMode = null;
      if (tryConfiguredSeatReplacement()) {
        return true;
      }
      return chooseNextAction();
    }

    if (advanceNormalCavePath(fish, plan, now, 900)) {
      return true;
    }

    fish.targetXNorm = plan.normalSeatPoint.xNorm;
    fish.targetYNorm = plan.normalSeatPoint.yNorm;
    fish.targetAt = now + 900;
    if (Math.hypot(fish.xNorm - plan.normalSeatPoint.xNorm, fish.yNorm - plan.normalSeatPoint.yNorm) > CAVE_NORMAL_SEAT_SETTLE_DISTANCE_NORM) {
      return true;
    }

    fish.caveSeatId = plan.seatId;
    if (Number.isFinite(Number(plan.normalSeatDirection))) {
      setFishDirection(fish, normalizeCaveSeatFacing(plan.normalSeatDirection), species, now);
    } else {
      applyFishCaveSeatFacingById(fish, species, decorItem, plan.seatId, now, fish.direction || 1);
    }
    plan.normalSeatHoldUntil = now + randomBetween(CAVE_NORMAL_SEAT_HOLD_MIN_MS, CAVE_NORMAL_SEAT_HOLD_MAX_MS);
    plan.normalInsideMode = "seat-hold";
    fish.targetAt = plan.normalSeatHoldUntil;
    return true;
  }

  if (plan.normalInsideMode === "roam") {
    clearSeatReservation();
    if (advanceNormalCavePath(fish, plan, now, 900)) {
      return true;
    }

    if (plan.normalTargetPoint) {
      fish.targetXNorm = plan.normalTargetPoint.xNorm;
      fish.targetYNorm = plan.normalTargetPoint.yNorm;
      fish.targetAt = now + 800;
      if (Math.hypot(fish.xNorm - plan.normalTargetPoint.xNorm, fish.yNorm - plan.normalTargetPoint.yNorm) > CAVE_GENERAL_REACHED_DISTANCE_NORM) {
        return true;
      }
    }

    plan.normalInsideMode = null;
    plan.normalTargetPoint = null;
    return chooseNextAction();
  }

  clearNormalCavePathState(plan);
  clearSeatReservation();
  plan.normalInsideMode = null;
  return chooseNextAction();
}

function beginFishCaveBehavior(fish, plan, now = Date.now()) {
  if (!fish || !plan) {
    return false;
  }

  const debugTestLoop = isDebugCaveTestFish(fish);
  const debugForced = debugTestLoop || plan.debugForced === true;
  const decorItem = getCaveBehaviorDecorById(plan.decorId);
  const species = getSpeciesForFish(fish);
  const debugSeatOrder = debugTestLoop && decorItem && species
    ? getDebugCaveSeatSequence(decorItem, fish, species, now, plan.inside || plan.mouth || plan.approach)
    : [];

  runtime.activeFishCavePlans.set(fish.id, {
    decorId: plan.decorId,
    portalId: plan.portalId,
    triggerId: plan.triggerId || plan.portalId,
    seatId: plan.seatId || plan.slotId || null,
    seatDirection: Number.isFinite(Number(plan.seatDirection))
      ? normalizeCaveSeatFacing(plan.seatDirection)
      : null,
    configuredPoints: plan.configuredPoints === true,
    debugForced,
    frontLayer: clampTankLayer(plan.frontLayer),
    backLayer: clampTankLayer(plan.backLayer),
    approach: { ...plan.approach },
    mouth: { ...plan.mouth },
    inside: { ...plan.inside },
    entryPathNodes: Array.isArray(plan.entryPathNodes) ? plan.entryPathNodes.map((node) => ({ ...node })) : [],
    exitPathNodes: Array.isArray(plan.exitPathNodes) ? plan.exitPathNodes.map((node) => ({ ...node })) : [],
    debugTestLoop,
    debugPhase: debugTestLoop ? "roam" : null,
    debugRoamUntil: debugTestLoop ? now + CAVE_DEBUG_TEST_ROAM_MS : null,
    debugPrepared: false,
    debugRoamStarted: false,
    debugRoamPathNodes: [],
    debugSeatSteps: [],
    debugPathNodes: [],
    debugPathIndex: null,
    debugLastRoamTarget: null,
    debugSeatOrder,
    debugSeatIndex: 0,
    debugSeatId: null,
    debugSeatPoint: null,
    debugSeatDirection: null,
    debugSeatHoldUntil: null,
    normalInsideMode: null,
    normalPathNodes: [],
    normalPathIndex: null,
    normalTargetPoint: null,
    normalSeatPoint: plan.configuredPoints && plan.inside ? { ...plan.inside } : null,
    normalSeatDirection: Number.isFinite(Number(plan.seatDirection))
      ? normalizeCaveSeatFacing(plan.seatDirection)
      : null,
    normalSeatHoldUntil: null,
    normalLastRoamTarget: null,
    normalHasRoamed: plan.configuredPoints === true
  });
  fish.caveState = "approach";
  fish.caveDecorId = plan.decorId;
  fish.cavePortalId = plan.portalId;
  fish.caveTriggerId = plan.triggerId || plan.portalId || null;
  fish.caveSeatId = null;
  fish.caveFrontLayer = clampTankLayer(plan.frontLayer);
  fish.caveBackLayer = clampTankLayer(plan.backLayer);
  fish.caveApproachXNorm = plan.approach.xNorm;
  fish.caveApproachYNorm = plan.approach.yNorm;
  fish.caveEntryXNorm = plan.mouth.xNorm;
  fish.caveEntryYNorm = plan.mouth.yNorm;
  fish.caveInsideXNorm = plan.inside.xNorm;
  fish.caveInsideYNorm = plan.inside.yNorm;
  fish.caveInsideUntil = now + Math.max(
    Number(plan.lingerMs) || 0,
    debugTestLoop ? CAVE_DEBUG_TEST_ROAM_MS + debugSeatOrder.length * CAVE_DEBUG_TEST_SEAT_MS + 1200 : 0
  );
  fish.cavePathIndex = null;
  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;
  fish.hangoutDecorId = plan.decorId;
  fish.targetXNorm = plan.approach.xNorm;
  fish.targetYNorm = plan.approach.yNorm;
  fish.targetAt = now + 2200 + Math.hypot(fish.xNorm - plan.approach.xNorm, fish.yNorm - plan.approach.yNorm) * 18000;
  setFishTankLayers(fish, plan.frontLayer, plan.frontLayer);

  if (debugTestLoop) {
    const activePlan = runtime.activeFishCavePlans.get(fish.id) || null;
    if (activePlan && decorItem && species) {
      ensureDebugCaveSequencePrepared(fish, species, decorItem, activePlan, activePlan.mouth, now);
    }
  }

  return true;
}

function abortFishCaveBehavior(fish, now = Date.now(), blockCurrentDecor = false) {
  if (!fish) {
    return;
  }

  const priorState = fish.caveState;
  const wasInsideCave = ["enter", "inside", "exit", "depart"].includes(priorState);
  const fallbackFrontLayer = clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER);
  const fallbackXNorm = clamp(
    Number.isFinite(fish.caveApproachXNorm)
      ? fish.caveApproachXNorm
      : fish.xNorm,
    0.08,
    0.92
  );
  const fallbackYNorm = clamp(
    Number.isFinite(fish.caveApproachYNorm)
      ? fish.caveApproachYNorm
      : fish.yNorm,
    0.14,
    0.8
  );

  if (blockCurrentDecor && fish.caveDecorId) {
    fish.blockedDecorId = fish.caveDecorId;
    fish.blockedDecorUntil = now + 4200;
  }

  clearFishCaveBehavior(fish);
  fish.hangoutDecorId = null;

  if (wasInsideCave) {
    setFishTankLayers(fish, fallbackFrontLayer, fallbackFrontLayer);
    setFishDesiredTankLayer(fish, fallbackFrontLayer);
    fish.targetXNorm = fallbackXNorm;
    fish.targetYNorm = fallbackYNorm;
    fish.targetAt = now + 1200 + Math.hypot(fish.xNorm - fallbackXNorm, fish.yNorm - fallbackYNorm) * 14000;
  }
}

function isFishWithinCaveCenterTarget(fish) {
  const seatRegion = getActiveFishCaveSeatRegion(fish);
  if (seatRegion) {
    return isFishWithinRegionBounds(fish, seatRegion, 10);
  }

  if (!fish || !Number.isFinite(fish.caveInsideXNorm) || !Number.isFinite(fish.caveInsideYNorm)) {
    return false;
  }

  const toleranceX = (CAVE_CENTER_TARGET_SIZE_PX / 2) / TANK_WIDTH;
  const toleranceY = (CAVE_CENTER_TARGET_SIZE_PX / 2) / TANK_HEIGHT;
  return (
    Math.abs(fish.xNorm - fish.caveInsideXNorm) <= toleranceX &&
    Math.abs(fish.yNorm - fish.caveInsideYNorm) <= toleranceY
  );
}

function isFishSettledInActiveCaveInterior(fish) {
  if (!fish || fish.caveState !== "inside") {
    return false;
  }

  const seatRegion = getActiveFishCaveSeatRegion(fish);
  if (seatRegion) {
    return isFishWithinRegionBounds(fish, seatRegion, 18);
  }

  return isFishWithinCaveCenterTarget(fish);
}

function fishShapeLeavesActiveCaveInterior(fish, species, now, xNorm, yNorm) {
  if (!fish?.caveState || !["enter", "inside", "exit", "depart"].includes(fish.caveState) || !fish.caveDecorId || !species) {
    return false;
  }

  const plan = getActiveFishCavePlan(fish);
  if (!plan) {
    return true;
  }

  const decor = getCaveBehaviorDecorById(plan.decorId);
  if (!decor) {
    return false;
  }

  const direction = Math.abs(xNorm - fish.xNorm) > 0.001
    ? (xNorm >= fish.xNorm ? 1 : -1)
    : (fish.direction || 1);
  const pose = getFishCollisionPose(fish, species, now, xNorm, yNorm, direction);
  const fishDescriptor = getFishShapeDescriptor(fish, species, now, pose);
  if (!fishDescriptor) {
    return true;
  }

  if (fish.caveState === "enter") {
    return false;
  }

  const interiorDescriptor = getCaveInteriorContainmentDescriptor(decor);
  if (interiorDescriptor && !shapeContainedByMaskStrict(interiorDescriptor, fishDescriptor, CAVE_STRICT_SAMPLE_STEP_PX)) {
    return true;
  }

  const barrierDescriptor = getCaveBarrierDescriptor(decor);
  if (barrierDescriptor && shapesOverlapByMaskStrict(fishDescriptor, barrierDescriptor, CAVE_STRICT_SAMPLE_STEP_PX)) {
    return true;
  }

  return false;
}

function forceFishToCaveFrontLayer(fish, species, now = Date.now()) {
  if (!fish || !species) {
    return false;
  }

  const plan = getActiveFishCavePlan(fish);
  const frontLayer = clampTankLayer(fish.caveFrontLayer || plan?.frontLayer || 2);
  const fallbackXNorm = clamp(
    Number.isFinite(fish.caveApproachXNorm)
      ? fish.caveApproachXNorm
      : (plan?.approach?.xNorm ?? fish.xNorm),
    0.08,
    0.92
  );
  const fallbackYNorm = clamp(
    Number.isFinite(fish.caveApproachYNorm)
      ? fish.caveApproachYNorm
      : (plan?.approach?.yNorm ?? fish.yNorm),
    0.14,
    0.8
  );

  abortFishCaveBehavior(fish, now, true);
  setFishTankLayers(fish, frontLayer, frontLayer);
  setFishDesiredTankLayer(fish, frontLayer);
  fish.targetXNorm = fallbackXNorm;
  fish.targetYNorm = fallbackYNorm;
  fish.targetAt = now + 1400 + Math.hypot(fish.xNorm - fallbackXNorm, fish.yNorm - fallbackYNorm) * 14000;
  fish.hangoutDecorId = null;

  if (Math.abs(fallbackXNorm - fish.xNorm) > 0.001) {
    setFishDirection(fish, fallbackXNorm >= fish.xNorm ? 1 : -1, species, now);
  }

  return true;
}

function retargetFishToSafeCaveInteriorPoint(fish, species, point, now = Date.now(), stateOverride = "enter") {
  if (!fish || !species || !point) {
    return false;
  }

  if (stateOverride) {
    fish.caveState = stateOverride;
  }
  const backLayer = getFishActiveCaveInsideLayer(fish, DEFAULT_TANK_LAYER);
  fish.cavePathIndex = null;
  fish.caveIdleTargetXNorm = null;
  fish.caveIdleTargetYNorm = null;
  fish.caveIdleTargetAt = null;
  fish.targetXNorm = clamp(point.xNorm, 0.08, 0.92);
  fish.targetYNorm = clamp(point.yNorm, 0.14, 0.8);
  fish.targetAt = now + 900 + Math.hypot(fish.xNorm - fish.targetXNorm, fish.yNorm - fish.targetYNorm) * 14000;
  setFishTankLayers(fish, backLayer, backLayer);
  setFishDesiredTankLayer(fish, backLayer);

  if (Math.abs(fish.targetXNorm - fish.xNorm) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
    setFishDirection(fish, fish.targetXNorm >= fish.xNorm ? 1 : -1, species, now);
  }

  return true;
}

function enforceActiveCaveMaskRule(fish, species, now = Date.now()) {
  if (!fish?.caveState || !species || species.behavior === "sucker") {
    return false;
  }

  const activePlan = getActiveFishCavePlan(fish);
  if (activePlan?.debugForced && isDebugCaveTestFish(fish)) {
    return false;
  }

  if (!["enter", "inside", "exit", "depart"].includes(fish.caveState)) {
    return false;
  }

  if (!fishShapeLeavesActiveCaveInterior(fish, species, now, fish.xNorm, fish.yNorm)) {
    return false;
  }

  const decor = getCaveBehaviorDecorById(fish.caveDecorId);
  if (decor && fish.caveState === "inside") {
    if (isFishSettledInActiveCaveInterior(fish)) {
      return false;
    }

    const seatRegion = getActiveFishCaveSeatRegion(fish);
    const seatDirection = seatRegion ? getCaveSeatFacingDirection(seatRegion, fish.direction || 1) : null;
    const activeSeatPoint = activePlan?.normalSeatPoint
      ? {
        xNorm: clamp(activePlan.normalSeatPoint.xNorm, 0.08, 0.92),
        yNorm: clamp(activePlan.normalSeatPoint.yNorm, 0.14, 0.8)
      }
      : null;
    const settlePoint = activeSeatPoint
      || (
        seatRegion
          ? (
            hasPlacedCaveSettings(decor)
              ? {
                xNorm: clamp(seatRegion.xNorm, 0.08, 0.92),
                yNorm: clamp(seatRegion.yNorm, 0.14, 0.8)
              }
              : (
                pickCaveSeatIdleTarget(decor, seatRegion, fish, species, now, seatDirection) || {
                  xNorm: clamp(seatRegion.xNorm, 0.08, 0.92),
                  yNorm: clamp(seatRegion.yNorm, 0.14, 0.8)
                }
              )
          )
          : null
      )
      || (
        Number.isFinite(fish.caveInsideXNorm) && Number.isFinite(fish.caveInsideYNorm)
          ? { xNorm: fish.caveInsideXNorm, yNorm: fish.caveInsideYNorm }
          : null
      );

    if (settlePoint) {
      if (Math.hypot(fish.xNorm - settlePoint.xNorm, fish.yNorm - settlePoint.yNorm) <= CAVE_GENERAL_REACHED_DISTANCE_NORM) {
        return false;
      }

      if (seatRegion && Number.isFinite(Number(seatDirection))) {
        setFishDirection(fish, normalizeCaveSeatFacing(seatDirection), species, now);
      }
      return retargetFishToSafeCaveInteriorPoint(fish, species, settlePoint, now, "inside");
    }
  }

  return forceFishToCaveFrontLayer(fish, species, now);
}

function updateFishCaveBehavior(fish, species, now = Date.now()) {
  if (!fish?.caveState || !fish.caveDecorId || species?.behavior === "sucker" || fish.activity !== "roam") {
    return false;
  }

  const plan = getActiveFishCavePlan(fish);
  if (!plan || plan.decorId !== fish.caveDecorId) {
    abortFishCaveBehavior(fish, now, false);
    return false;
  }

  const decorItem = getCaveBehaviorDecorById(plan.decorId);
  if (!decorItem) {
    abortFishCaveBehavior(fish, now, false);
    return false;
  }
  const debugForcedPlan = Boolean(plan.debugForced) && isDebugCaveTestFish(fish);
  const debugTestLoop = Boolean(plan.debugTestLoop) && isDebugCaveTestFish(fish);

  const triggerRegion = getActiveFishCaveTriggerRegion(fish);
  let seatRegion = getActiveFishCaveSeatRegion(fish);
  const mouthNode = triggerRegion || plan.mouth;
  let insideNode = seatRegion || plan.inside;
  const distanceToTarget = Math.hypot(fish.targetXNorm - fish.xNorm, fish.targetYNorm - fish.yNorm);
  const distanceToMouth = mouthNode
    ? Math.hypot(fish.xNorm - mouthNode.xNorm, fish.yNorm - mouthNode.yNorm)
    : Number.POSITIVE_INFINITY;
  const reachedTarget = distanceToTarget <= CAVE_GENERAL_REACHED_DISTANCE_NORM;
  const reachedMouth = distanceToTarget <= CAVE_MOUTH_REACHED_DISTANCE_NORM;
  const reachedTrigger = triggerRegion ? isFishWithinRegionBounds(fish, triggerRegion, 8) : reachedMouth;
  const stalledAtTrigger = (
    Number.isFinite(fish.targetAt) &&
    now >= fish.targetAt + CAVE_TRIGGER_STALL_FORCE_MS &&
    distanceToMouth <= CAVE_TRIGGER_STALL_FORCE_DISTANCE_NORM
  );

  if (fish.caveState === "approach") {
    fish.hangoutDecorId = fish.caveDecorId;
    setFishTankLayers(
      fish,
      clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
      clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
    );
    if (reachedTarget) {
      fish.caveState = "align";
      fish.cavePathIndex = null;
      setFishTankLayers(
        fish,
        clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
        clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
      );
      if (!setFishTargetToCaveNode(fish, mouthNode, now, 1200)) {
        abortFishCaveBehavior(fish, now, true);
        return false;
      }
      return true;
    }

    return true;
  }

  if (fish.caveState === "align") {
    fish.hangoutDecorId = fish.caveDecorId;
    setFishTankLayers(
      fish,
      clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
      clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
    );
    if (reachedTrigger || stalledAtTrigger) {
      fish.xNorm = clamp(mouthNode.xNorm, 0.08, 0.92);
      fish.yNorm = clamp(mouthNode.yNorm, 0.14, 0.8);
      fish.targetXNorm = fish.xNorm;
      fish.targetYNorm = fish.yNorm;
      const mouthPose = getFishCollisionPose(fish, species, now, fish.xNorm, fish.yNorm, fish.direction || 1);
      if (!debugForcedPlan && !stalledAtTrigger && !canFishChangeToLayer(fish, species, now, clampTankLayer(fish.caveBackLayer || DEFAULT_TANK_LAYER), mouthPose)) {
        setFishTankLayers(
          fish,
          clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
          clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
        );
        setFishDesiredTankLayer(fish, clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER));
        fish.targetAt = now + 900;
        return true;
      }
      fish.caveTriggerCooldownUntil = now + CAVE_TRIGGER_COOLDOWN_MS;
      fish.caveIdleTargetXNorm = null;
      fish.caveIdleTargetYNorm = null;
      fish.caveIdleTargetAt = null;
      fish.caveState = "enter";
      const interiorLayer = getFishActiveCaveInsideLayer(fish, DEFAULT_TANK_LAYER);
      setFishTankLayers(fish, interiorLayer, interiorLayer);
      fish.cavePathIndex = 0;

      if (!setFishTargetToCaveNode(fish, plan.entryPathNodes[0] || insideNode, now, 1200)) {
        abortFishCaveBehavior(fish, now, true);
        return false;
      }
      return true;
    }

    return true;
  }

  if (fish.caveState === "enter") {
    fish.hangoutDecorId = fish.caveDecorId;
    const interiorLayer = getFishActiveCaveInsideLayer(fish, TANK_DEPTH_LAYERS);
    setFishTankLayers(
      fish,
      interiorLayer,
      interiorLayer
    );
    if (reachedTarget) {
      const nextIndex = (Number.isFinite(fish.cavePathIndex) ? fish.cavePathIndex : 0) + 1;
      if (nextIndex < plan.entryPathNodes.length) {
        fish.cavePathIndex = nextIndex;
        setFishTargetToCaveNode(fish, plan.entryPathNodes[nextIndex], now, 1300);
        return true;
      }

      fish.caveState = "inside";
      fish.cavePathIndex = null;
      const hasEntrySeat = Boolean(plan.seatId && plan.inside);
      const shouldHoldEntrySeat = plan.configuredPoints || hasEntrySeat;
      if (!shouldHoldEntrySeat) {
        plan.seatId = null;
      }
      plan.normalInsideMode = hasEntrySeat ? "seat-hold" : null;
      plan.normalTargetPoint = null;
      plan.normalSeatPoint = shouldHoldEntrySeat && plan.inside ? { ...plan.inside } : null;
      plan.normalSeatHoldUntil = hasEntrySeat
        ? Math.max(Number(fish.caveInsideUntil) || 0, now + randomBetween(CAVE_NORMAL_SEAT_HOLD_MIN_MS, CAVE_NORMAL_SEAT_HOLD_MAX_MS))
        : null;
      plan.normalLastRoamTarget = null;
      plan.normalHasRoamed = shouldHoldEntrySeat;
      clearNormalCavePathState(plan);
      fish.caveSeatId = shouldHoldEntrySeat ? (plan.seatId || null) : null;
      fish.caveInsideUntil = Math.max(Number(fish.caveInsideUntil) || 0, now + CAVE_TRIGGER_COOLDOWN_MS);
      fish.caveIdleTargetXNorm = null;
      fish.caveIdleTargetYNorm = null;
      fish.caveIdleTargetAt = null;
      fish.targetXNorm = fish.xNorm;
      fish.targetYNorm = fish.yNorm;
      fish.targetAt = Math.max(fish.caveInsideUntil || 0, now + 1200);
      if (Number.isFinite(Number(plan.seatDirection))) {
        setFishDirection(fish, normalizeCaveSeatFacing(plan.seatDirection), species, now);
      } else if (fish.caveSeatId) {
        applyFishCaveSeatFacingById(fish, species, decorItem, fish.caveSeatId, now, fish.direction || 1);
      }
      setFishDesiredTankLayer(fish, getFishActiveCaveInsideLayer(fish, TANK_DEPTH_LAYERS));
      return true;
    }

    return true;
  }

  if (fish.caveState === "inside") {
    const insideLayer = getFishActiveCaveInsideLayer(fish, TANK_DEPTH_LAYERS);
    fish.hangoutDecorId = fish.caveDecorId;
    setFishTankLayers(
      fish,
      insideLayer,
      insideLayer
    );
    if (debugTestLoop) {
      return updateDebugFishCaveInsideBehavior(fish, species, decorItem, plan, mouthNode, now);
    }
    return updateNormalFishCaveInsideBehavior(fish, species, decorItem, plan, mouthNode, now);
  }

  if (fish.caveState === "exit") {
    fish.hangoutDecorId = fish.caveDecorId;
    const interiorLayer = getFishActiveCaveInsideLayer(fish, TANK_DEPTH_LAYERS);
    setFishTankLayers(
      fish,
      interiorLayer,
      interiorLayer
    );
    if (reachedTrigger || reachedTarget || stalledAtTrigger) {
      const nextIndex = (Number.isFinite(fish.cavePathIndex) ? fish.cavePathIndex : 0) + 1;
      if (nextIndex < plan.exitPathNodes.length) {
        fish.cavePathIndex = nextIndex;
        setFishTargetToCaveNode(fish, plan.exitPathNodes[nextIndex], now, 1300);
        return true;
      }

      fish.xNorm = clamp(mouthNode.xNorm, 0.08, 0.92);
      fish.yNorm = clamp(mouthNode.yNorm, 0.14, 0.8);
      fish.targetXNorm = fish.xNorm;
      fish.targetYNorm = fish.yNorm;
      const mouthPose = getFishCollisionPose(fish, species, now, fish.xNorm, fish.yNorm, fish.direction || 1);
      if (!debugForcedPlan && !stalledAtTrigger && !canFishChangeToLayer(fish, species, now, clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER), mouthPose)) {
        fish.targetAt = now + 900;
        return true;
      }
      fish.caveState = "leave";
      fish.cavePathIndex = null;
      fish.caveTriggerCooldownUntil = now + CAVE_TRIGGER_COOLDOWN_MS;
      fish.targetXNorm = fish.caveApproachXNorm;
      fish.targetYNorm = fish.caveApproachYNorm;
      fish.targetAt = now + 5000;
      setFishTankLayers(
        fish,
        clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
        clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
      );
      return true;
    }

    return true;
  }

  if (fish.caveState === "depart") {
    fish.hangoutDecorId = fish.caveDecorId;
    const interiorLayer = getFishActiveCaveInsideLayer(fish, DEFAULT_TANK_LAYER);
    setFishTankLayers(
      fish,
      interiorLayer,
      interiorLayer
    );
    if (reachedMouth) {
      fish.xNorm = clamp(plan.mouth.xNorm, 0.08, 0.92);
      fish.yNorm = clamp(plan.mouth.yNorm, 0.14, 0.8);
      fish.targetXNorm = fish.xNorm;
      fish.targetYNorm = fish.yNorm;
      fish.caveState = "leave";
      fish.targetXNorm = fish.caveApproachXNorm;
      fish.targetYNorm = fish.caveApproachYNorm;
      fish.targetAt = now + 5000;
      setFishTankLayers(
        fish,
        clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
        clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
      );
      return true;
    }

    return true;
  }

  if (fish.caveState === "leave") {
    fish.hangoutDecorId = fish.caveDecorId;
    setFishTankLayers(
      fish,
      clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER),
      clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
    );
    if (reachedTarget || now > fish.targetAt + 2400) {
      fish.caveTriggerCooldownUntil = Math.max(
        Number(fish.caveTriggerCooldownUntil) || 0,
        now + CAVE_POST_EXIT_COOLDOWN_MS
      );
      abortFishCaveBehavior(fish, now, false);
      fish.targetAt = now;
      return false;
    }

    return true;
  }

  abortFishCaveBehavior(fish, now, false);
  return false;
}

function getCaveBarrierDescriptor(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return null;
  }

  const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));
  const descriptor = getCaveShellDescriptor(item);
  if (!descriptor) {
    return null;
  }

  return {
    ...descriptor,
    decorId: item.id,
    frontLayer: span.front,
    barrierLayer: span.back,
    backLayer: span.back,
    minLayer: span.front,
    maxLayer: span.back
  };
}

function getFishCollisionPose(fish, species, now, xNorm, yNorm, directionOverride = null) {
  const pose = getFishPose(fish, species, now);
  const followFacingDirection = directionOverride == null
    ? getFishSchoolFollowFacingDirection(fish, species, now)
    : null;
  const direction = directionOverride == null
    ? (
      followFacingDirection
      ?? (Math.abs(fish.targetXNorm - fish.xNorm) > 0.0001 ? (fish.targetXNorm >= fish.xNorm ? 1 : -1) : (fish.direction || 1))
    )
    : directionOverride;

  return {
    ...pose,
    x: xNorm * TANK_WIDTH,
    y: yNorm * TANK_HEIGHT,
    direction,
    facingScaleX: direction < 0 ? -1 : 1
  };
}

function getFishFootprintBoundsAtPose(fish, species, now, pose) {
  const image = runtime.images.get(getFishDisplayAssetPath(fish, species, now) || species?.asset);
  if (!fish || !species || !pose || !image) {
    return null;
  }

  const width = getFishDisplayWidth(fish, species, now);
  const height = width * (image.height / image.width);
  const centerX = pose.x + (pose.swayX || 0);
  const centerY = pose.y;
  const radiusX = width * 0.38;
  const radiusY = height * 0.32;

  return {
    left: centerX - radiusX,
    right: centerX + radiusX,
    top: centerY - radiusY,
    bottom: centerY + radiusY
  };
}

function getCaveCollisionFrameCandidates(testLayer, now = Date.now()) {
  const layer = clampTankLayer(testLayer);
  const placedDecor = Array.isArray(state?.placedDecor) ? state.placedDecor : [];
  const frameKey = Number(runtime.lastAnimationUpdateAt) || Number(now) || Date.now();
  const activeTankId = state?.activeTankId || "";
  let cache = runtime.caveCollisionFrameCache;

  if (
    !cache
    || cache.frameKey !== frameKey
    || cache.activeTankId !== activeTankId
    || cache.placedDecor !== placedDecor
    || cache.placedDecorLength !== placedDecor.length
  ) {
    const candidatesByLayer = Array.from({ length: TANK_DEPTH_LAYERS + 1 }, () => []);
    for (const item of placedDecor) {
      if (!item || !isCaveDecorKey(item.decorKey)) {
        continue;
      }
      const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));
      const layers = span.front === span.back ? [span.front] : [span.front, span.back];
      for (const candidateLayer of layers) {
        const normalizedLayer = clampTankLayer(candidateLayer);
        if (normalizedLayer < 3) {
          continue;
        }
        const descriptor = getCaveBlockingDescriptorForLayer(item, normalizedLayer);
        if (!descriptor) {
          continue;
        }
        candidatesByLayer[normalizedLayer].push({ item, span, descriptor });
      }
    }
    cache = {
      frameKey,
      activeTankId,
      placedDecor,
      placedDecorLength: placedDecor.length,
      candidatesByLayer
    };
    runtime.caveCollisionFrameCache = cache;
  }

  return cache.candidatesByLayer[layer] || [];
}

function findBlockingCaveForFishPose(fish, species, now, pose, layerOverride = null) {
  if (!fish || !species || species.behavior === "sucker") {
    return null;
  }

  const testLayer = clampTankLayer(layerOverride ?? getFishTankLayer(fish));
  if (testLayer < 3) {
    return null;
  }

  const profileStartedAt = runtime.debugFrameProfilerEnabled ? performance.now() : 0;
  const fishDescriptor = getFishShapeDescriptor(fish, species, now, pose);
  if (!fishDescriptor) {
    if (runtime.debugFrameProfilerEnabled) {
      endDebugFrameProfilerSection("caveCollision", profileStartedAt);
    }
    return null;
  }

  const candidates = getCaveCollisionFrameCandidates(testLayer, now);
  if (runtime.debugFrameProfilerEnabled) {
    incrementDebugFrameProfilerCounter("caveCandidates", candidates.length);
  }
  for (const candidate of candidates) {
    const { item, span, descriptor } = candidate;
    if (isFishUsingOwnCavePath(fish, item)) {
      continue;
    }

    if (!boundsIntersect(fishDescriptor.bounds, descriptor.bounds)) {
      continue;
    }

    if (runtime.debugFrameProfilerEnabled) {
      incrementDebugFrameProfilerCounter("caveStrictChecks", 1);
    }
    if (shapesOverlapByMaskStrict(fishDescriptor, descriptor, CAVE_STRICT_SAMPLE_STEP_PX)) {
      if (runtime.debugFrameProfilerEnabled) {
        endDebugFrameProfilerSection("caveCollision", profileStartedAt);
      }
      return { item, span, descriptor };
    }
  }

  if (runtime.debugFrameProfilerEnabled) {
    endDebugFrameProfilerSection("caveCollision", profileStartedAt);
  }
  return null;
}

function pushFishOutOfBlockingCave(fish, species, now) {
  if (!fish || !species || fish.caveState) {
    return false;
  }

  const pose = getFishPose(fish, species, now);
  const blocking = findBlockingCaveForFishPose(fish, species, now, pose);
  if (!blocking) {
    return false;
  }

  const fishX = fish.xNorm * TANK_WIDTH;
  const fishY = fish.yNorm * TANK_HEIGHT;
  const footprint = blocking.descriptor?.bounds;
  if (!footprint) {
    return false;
  }
  const leftEscapePx = Math.abs(fishX - footprint.left);
  const rightEscapePx = Math.abs(footprint.right - fishX);
  const escapeLeft = leftEscapePx <= rightEscapePx;
  const targetX = escapeLeft ? footprint.left - 36 : footprint.right + 36;
  const targetY = Math.min(footprint.bottom + 18, TANK_HEIGHT * 0.79);

  const safeFrontLayer = Math.max(1, clampTankLayer((blocking.span?.front || 3) - 1));
  setFishTankLayers(fish, safeFrontLayer, safeFrontLayer);
  fish.targetXNorm = clamp(targetX / TANK_WIDTH, 0.08, 0.92);
  fish.targetYNorm = clamp(targetY / TANK_HEIGHT, 0.14, 0.8);
  fish.targetAt = now + 1800 + Math.hypot(fish.xNorm - fish.targetXNorm, fish.yNorm - fish.targetYNorm) * 14000;
  fish.hangoutDecorId = null;
  fish.blockedDecorId = blocking.item.id;
  fish.blockedDecorUntil = now + 5200;
  if (Math.abs(fish.targetXNorm - fish.xNorm) > 0.002) {
    setFishDirection(fish, fish.targetXNorm >= fish.xNorm ? 1 : -1, species, now);
  }
  return true;
}

function isDraggedFishBlockedByCaveAtLayer(fish, species, now, xNorm, yNorm, layer, direction) {
  const pose = getFishCollisionPose(fish, species, now, xNorm, yNorm, direction);
  return Boolean(findBlockingCaveForFishPose(fish, species, now, pose, layer));
}

function resolveDraggedFishCaveSegment(fish, species, targetXNorm, targetYNorm, now, layer) {
  const startXNorm = fish.xNorm;
  const startYNorm = fish.yNorm;
  const resolvedTargetXNorm = clamp(targetXNorm, 0.08, 0.92);
  const resolvedTargetYNorm = clampFishYNormToLayer(targetYNorm, fish, species, layer, { minYNorm: 0.14, maxYNorm: 0.8 });
  const dx = resolvedTargetXNorm - startXNorm;
  const dy = resolvedTargetYNorm - startYNorm;
  const distancePx = Math.hypot(dx * TANK_WIDTH, dy * TANK_HEIGHT);
  const direction = Math.abs(dx) > 0.0001
    ? (dx >= 0 ? 1 : -1)
    : (fish.direction || 1);
  const startBlocked = isDraggedFishBlockedByCaveAtLayer(
    fish,
    species,
    now,
    startXNorm,
    startYNorm,
    layer,
    direction
  );

  if (distancePx < 0.001) {
    return {
      xNorm: startBlocked ? startXNorm : resolvedTargetXNorm,
      yNorm: startBlocked ? startYNorm : resolvedTargetYNorm,
      blocked: startBlocked
    };
  }

  const samples = Math.max(1, Math.ceil(distancePx / 4));
  let lastSafe = startBlocked ? null : { xNorm: startXNorm, yNorm: startYNorm };
  let crossedBlockedSpace = false;

  for (let index = 1; index <= samples; index += 1) {
    const t = index / samples;
    const sampleXNorm = startXNorm + dx * t;
    const sampleYNorm = startYNorm + dy * t;
    const sampleBlocked = isDraggedFishBlockedByCaveAtLayer(
      fish,
      species,
      now,
      sampleXNorm,
      sampleYNorm,
      layer,
      direction
    );

    if (sampleBlocked) {
      crossedBlockedSpace = true;
      if (lastSafe) {
        return {
          ...lastSafe,
          blocked: true
        };
      }
      continue;
    }

    if (crossedBlockedSpace && lastSafe) {
      return {
        ...lastSafe,
        blocked: true
      };
    }

    if (startBlocked) {
      return {
        xNorm: sampleXNorm,
        yNorm: sampleYNorm,
        blocked: false
      };
    }

    lastSafe = { xNorm: sampleXNorm, yNorm: sampleYNorm };
  }

  return {
    xNorm: startBlocked ? startXNorm : resolvedTargetXNorm,
    yNorm: startBlocked ? startYNorm : resolvedTargetYNorm,
    blocked: startBlocked
  };
}

function resolveDraggedFishCaveCollision(fish, species, targetXNorm, targetYNorm, now = Date.now()) {
  if (!fish || !species || species.behavior === "sucker") {
    return {
      xNorm: targetXNorm,
      yNorm: targetYNorm,
      blocked: false
    };
  }

  const layer = getFishTankLayer(fish);
  if (layer < 3) {
    return {
      xNorm: targetXNorm,
      yNorm: targetYNorm,
      blocked: false
    };
  }

  const direct = resolveDraggedFishCaveSegment(fish, species, targetXNorm, targetYNorm, now, layer);
  if (!direct.blocked) {
    return direct;
  }

  const candidates = [
    direct,
    resolveDraggedFishCaveSegment(fish, species, targetXNorm, fish.yNorm, now, layer),
    resolveDraggedFishCaveSegment(fish, species, fish.xNorm, targetYNorm, now, layer)
  ];

  return candidates.reduce((best, candidate) => {
    const bestScore = Math.hypot((best.xNorm - targetXNorm) * TANK_WIDTH, (best.yNorm - targetYNorm) * TANK_HEIGHT);
    const candidateScore = Math.hypot((candidate.xNorm - targetXNorm) * TANK_WIDTH, (candidate.yNorm - targetYNorm) * TANK_HEIGHT);
    return candidateScore < bestScore ? candidate : best;
  }, direct);
}

function resolveFishCaveCollision(fish, nextXNorm, nextYNorm, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  if (!species || species.behavior === "sucker") {
    return {
      xNorm: nextXNorm,
      yNorm: nextYNorm,
      blocked: false
    };
  }

  const currentLayer = getFishTankLayer(fish);
  const effectiveLayer = currentLayer;
  const startXNorm = fish.xNorm;
  const startYNorm = fish.yNorm;
  let resolvedXNorm = clampFishXNormToMobileViewport(nextXNorm, fish, species, now);
  let resolvedYNorm = clamp(nextYNorm, 0.14, 0.8);

  if (effectiveLayer < 3) {
    return {
      xNorm: resolvedXNorm,
      yNorm: resolvedYNorm,
      blocked: false
    };
  }

  const nextPose = getFishCollisionPose(
    fish,
    species,
    now,
    resolvedXNorm,
    resolvedYNorm,
    Math.abs(resolvedXNorm - startXNorm) > 0.0001
      ? (resolvedXNorm >= startXNorm ? 1 : -1)
      : (fish.direction || 1)
  );
  const blockingCave = findBlockingCaveForFishPose(fish, species, now, nextPose, effectiveLayer);
  if (!blockingCave) {
    return {
      xNorm: resolvedXNorm,
      yNorm: resolvedYNorm,
      blocked: false,
      blockingCave: null
    };
  }

  const pendingTubeTravel = runtime.pendingNeighborhoodTravel.get(fish.id);
  if (pendingTubeTravel?.mode === "tube" && blockingCave.item?.id === pendingTubeTravel.sourceTubeId) {
    return {
      xNorm: resolvedXNorm,
      yNorm: resolvedYNorm,
      blocked: false,
      blockingCave: null
    };
  }

  const activePlan = fish.caveState ? getActiveFishCavePlan(fish) : null;
  if (
    activePlan?.debugForced &&
    isDebugCaveTestFish(fish) &&
    blockingCave.item?.id === fish.caveDecorId
  ) {
    return {
      xNorm: resolvedXNorm,
      yNorm: resolvedYNorm,
      blocked: false,
      blockingCave: null
    };
  }

  if (!fish.caveState) {
    return {
      xNorm: startXNorm,
      yNorm: startYNorm,
      blocked: true,
      blockingCave
    };
  }

  return {
    xNorm: startXNorm,
    yNorm: startYNorm,
    blocked: true,
    blockingCave
  };
}

function getFishShapeDescriptor(fish, species, now, poseOverride = null) {
  const fishAsset = getFishDisplayAssetPath(fish, species, now) || species?.asset;
  const image = runtime.images.get(fishAsset);
  const mask = fishAsset ? getImageAlphaMask(fishAsset) : null;
  if (!species || !image || !mask) {
    return null;
  }

  const pose = poseOverride || getFishPose(fish, species, now);
  const width = getFishDisplayWidth(fish, species, now);
  const height = width * (image.height / image.width);
  const centerX = pose.x + pose.swayX;
  const centerY = pose.y;
  const facingScaleX = pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1);
  const bodyScaleX = pose.bodyScaleX || 1;
  const bodyScaleY = pose.bodyScaleY || 1;
  const tilt = pose.tilt || 0;
  const drawX = -width / 2 + pose.wiggle * width * 0.018;
  const drawY = -height / 2;
  const useSuckerFacePivot = (
    SUCKER_FISH_FACE_PIVOT_ENABLED
    && !pose.isDead
    && getEffectiveFishBehavior(fish, species) === "sucker"
  );
  const suckerFacePivotX = useSuckerFacePivot
    ? drawX + width * SUCKER_FISH_FACE_PIVOT_X
    : 0;
  const suckerFacePivotY = useSuckerFacePivot
    ? drawY + height * SUCKER_FISH_FACE_PIVOT_Y
    : 0;
  const cos = Math.cos(-tilt);
  const sin = Math.sin(-tilt);
  const worldCos = Math.cos(tilt);
  const worldSin = Math.sin(tilt);
  const localToWorld = (localX, localY) => {
    const sx = localX * bodyScaleX;
    const sy = localY * bodyScaleY;
    const pivotedX = useSuckerFacePivot ? sx - suckerFacePivotX : sx;
    const pivotedY = useSuckerFacePivot ? sy - suckerFacePivotY : sy;
    const rx = pivotedX * worldCos - pivotedY * worldSin;
    const ry = pivotedX * worldSin + pivotedY * worldCos;
    const transformedX = useSuckerFacePivot ? rx + suckerFacePivotX : rx;
    const transformedY = useSuckerFacePivot ? ry + suckerFacePivotY : ry;
    return {
      x: centerX + transformedX * facingScaleX,
      y: centerY + transformedY
    };
  };
  const corners = [
    localToWorld(drawX, drawY),
    localToWorld(drawX + width, drawY),
    localToWorld(drawX + width, drawY + height),
    localToWorld(drawX, drawY + height)
  ];

  return {
    mask,
    bounds: {
      left: Math.min(...corners.map((corner) => corner.x)),
      right: Math.max(...corners.map((corner) => corner.x)),
      top: Math.min(...corners.map((corner) => corner.y)),
      bottom: Math.max(...corners.map((corner) => corner.y))
    },
    worldToUv(worldX, worldY) {
      let localX = worldX - centerX;
      let localY = worldY - centerY;
      localX /= Math.abs(facingScaleX) < 0.0001 ? 1 : facingScaleX;
      const pivotedX = useSuckerFacePivot ? localX - suckerFacePivotX : localX;
      const pivotedY = useSuckerFacePivot ? localY - suckerFacePivotY : localY;
      const rotatedX = pivotedX * cos - pivotedY * sin;
      const rotatedY = pivotedX * sin + pivotedY * cos;
      const unpivotedX = useSuckerFacePivot ? rotatedX + suckerFacePivotX : rotatedX;
      const unpivotedY = useSuckerFacePivot ? rotatedY + suckerFacePivotY : rotatedY;
      localX = unpivotedX / (Math.abs(bodyScaleX) < 0.0001 ? 1 : bodyScaleX);
      localY = unpivotedY / (Math.abs(bodyScaleY) < 0.0001 ? 1 : bodyScaleY);
      return {
        u: (localX - drawX) / width,
        v: (localY - drawY) / height
      };
    }
  };
}

function getOverlappingDecorForFish(fish, species, now, poseOverride = null, options = null) {
  const fishDescriptor = getFishShapeDescriptor(fish, species, now, poseOverride);
  if (!fishDescriptor) {
    return [];
  }

  const minLayer = Number.isFinite(options?.minLayer) ? clampTankLayer(options.minLayer) : 1;
  const maxLayer = Number.isFinite(options?.maxLayer) ? clampTankLayer(options.maxLayer) : TANK_DEPTH_LAYERS;
  const overlaps = [];
  for (const item of state.placedDecor) {
    const itemLayer = getDecorTankLayer(item);
    if (itemLayer < minLayer || itemLayer > maxLayer) {
      continue;
    }

    const opaqueBounds = getPlacedDecorOpaqueBounds(item);
    if (opaqueBounds && !boundsIntersect(fishDescriptor.bounds, opaqueBounds)) {
      continue;
    }

    const decorDescriptor = getDecorShapeDescriptor(item);
    if (!decorDescriptor || !shapesOverlapByMask(fishDescriptor, decorDescriptor, 10)) {
      continue;
    }

    overlaps.push({
      item,
      layer: itemLayer,
      descriptor: decorDescriptor
    });
  }

  return overlaps;
}

function getOverlappingFishForLayerChange(fish, species, now, poseOverride = null, options = null) {
  const fishDescriptor = getFishShapeDescriptor(fish, species, now, poseOverride);
  if (!fishDescriptor) {
    return [];
  }

  const minLayer = Number.isFinite(options?.minLayer) ? clampTankLayer(options.minLayer) : 1;
  const maxLayer = Number.isFinite(options?.maxLayer) ? clampTankLayer(options.maxLayer) : TANK_DEPTH_LAYERS;
  const overlaps = [];

  for (const otherFish of state.fish) {
    if (!otherFish || otherFish.id === fish.id || isFishDead(otherFish)) {
      continue;
    }

    const otherLayer = getFishTankLayer(otherFish);
    if (otherLayer < minLayer || otherLayer > maxLayer) {
      continue;
    }

    const otherSpecies = runtime.fishMap.get(otherFish.speciesId);
    if (!otherSpecies) {
      continue;
    }

    const otherPose = getFishPose(otherFish, otherSpecies, now);
    const otherBounds = getFishOcclusionBounds(otherFish, otherSpecies, otherPose);
    if (otherBounds && !boundsIntersect(fishDescriptor.bounds, otherBounds)) {
      continue;
    }

    const otherDescriptor = getFishShapeDescriptor(otherFish, otherSpecies, now, otherPose);
    if (!otherDescriptor || !shapesOverlapByMask(fishDescriptor, otherDescriptor, 10)) {
      continue;
    }

    overlaps.push({
      fish: otherFish,
      layer: otherLayer,
      descriptor: otherDescriptor
    });
  }

  return overlaps;
}

function canFishChangeToLayer(fish, species, now, desiredLayer, poseOverride = null) {
  const currentLayer = getFishTankLayer(fish);
  const targetLayer = clampTankLayer(desiredLayer);
  if (targetLayer === currentLayer) {
    return true;
  }

  const pose = poseOverride || getFishPose(fish, species, now);
  if (findBlockingCaveForFishPose(fish, species, now, pose, targetLayer)) {
    return false;
  }

  const minLayer = Math.min(currentLayer, targetLayer);
  const maxLayer = Math.max(currentLayer, targetLayer);
  const decorOverlaps = getOverlappingDecorForFish(fish, species, now, pose, {
    minLayer,
    maxLayer
  });
  const fishOverlaps = getOverlappingFishForLayerChange(fish, species, now, pose, {
    minLayer,
    maxLayer
  });

  if (targetLayer > currentLayer) {
    return !decorOverlaps.some(({ layer }) => layer >= currentLayer && layer <= targetLayer) &&
      !fishOverlaps.some(({ layer }) => layer >= currentLayer && layer <= targetLayer);
  }

  return !decorOverlaps.some(({ layer }) => layer <= currentLayer && layer >= targetLayer) &&
    !fishOverlaps.some(({ layer }) => layer <= currentLayer && layer >= targetLayer);
}

function syncFishDrawLayer(fish, species, now) {
  if (getEffectiveFishBehavior(fish, species) === "sucker") {
    const glassLayer = getSuckerFishGlassLayer(fish);
    setFishTankLayers(fish, glassLayer, glassLayer);
    return;
  }

  if (fish.caveState) {
    const lockedLayer = ["approach", "align", "leave"].includes(fish.caveState)
      ? clampTankLayer(fish.caveFrontLayer || DEFAULT_TANK_LAYER)
      : getFishActiveCaveInsideLayer(fish, DEFAULT_TANK_LAYER);
    setFishTankLayers(fish, lockedLayer, lockedLayer);
    return;
  }

  const currentLayer = getFishTankLayer(fish);
  const desiredLayer = getDesiredFishTankLayer(fish);
  setFishTankLayers(fish, currentLayer, desiredLayer);
  if (desiredLayer === currentLayer) {
    return;
  }

  const pose = getFishPose(fish, species, now);
  if (canFishChangeToLayer(fish, species, now, desiredLayer, pose)) {
    setFishTankLayers(fish, desiredLayer, desiredLayer);
  }
}

function getFishOcclusionBounds(fish, species, pose) {
  const image = runtime.images.get(getFishDisplayAssetPath(fish, species) || species.asset);
  const width = getFishDisplayWidth(fish, species);
  const height = width * (image ? image.height / image.width : 0.65);
  const bodyWidth = width * 0.52;
  const bodyHeight = height * 0.36;

  return {
    left: pose.x - bodyWidth / 2,
    right: pose.x + bodyWidth / 2,
    top: pose.y - bodyHeight / 2,
    bottom: pose.y + bodyHeight / 2
  };
}

function boundsIntersect(leftBounds, rightBounds) {
  return !(
    leftBounds.right <= rightBounds.left ||
    leftBounds.left >= rightBounds.right ||
    leftBounds.bottom <= rightBounds.top ||
    leftBounds.top >= rightBounds.bottom
  );
}
