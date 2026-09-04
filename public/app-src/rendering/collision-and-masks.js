// Source fragment: rendering/collision-and-masks.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getPlacedMaskRegions(item, imagePath, options = undefined) {
  if (!item || !imagePath) {
    return [];
  }

  return getMaskRegions(imagePath, options)
    .map((region) => mapMaskRegionToTank(item, imagePath, region))
    .filter(Boolean);
}

function annotateSeatMarkerRegion(region, minRadiusPx = CAVE_SEAT_MARKER_EXPAND_RADIUS_PX) {
  if (!region) {
    return null;
  }

  if (region.widthPx > CAVE_SEAT_MARKER_MAX_SIZE_PX && region.heightPx > CAVE_SEAT_MARKER_MAX_SIZE_PX) {
    return region;
  }

  const radiusX = Math.max(minRadiusPx, region.widthPx / 2);
  const radiusY = Math.max(minRadiusPx, region.heightPx / 2);
  return {
    ...region,
    fitWidthPx: radiusX * 2,
    fitHeightPx: radiusY * 2,
    fitAreaPx: Math.max(region.areaPx, Math.PI * radiusX * radiusY),
    markerRegion: {
      left: region.left,
      right: region.right,
      top: region.top,
      bottom: region.bottom,
      widthPx: region.widthPx,
      heightPx: region.heightPx,
      areaPx: region.areaPx
    }
  };
}

function getPseudoRegionAtPoint(item, localX, localY, id, radiusPx = 26) {
  const point = mapDecorLocalPointToTankNorm(item, localX, localY);
  if (!point) {
    return null;
  }

  const worldX = point.xNorm * TANK_WIDTH;
  const worldY = point.yNorm * TANK_HEIGHT;
  return {
    id,
    x: worldX,
    y: worldY,
    xNorm: point.xNorm,
    yNorm: point.yNorm,
    left: worldX - radiusPx,
    right: worldX + radiusPx,
    top: worldY - radiusPx,
    bottom: worldY + radiusPx,
    widthPx: radiusPx * 2,
    heightPx: radiusPx * 2,
    areaPx: radiusPx * radiusPx * Math.PI
  };
}

function getDerivedCaveTriggerRegions(item, decor) {
  if (!item || !decor?.path || !decor?.bgPath) {
    return [];
  }

  const triggerMask = getDerivedCaveTriggerMask(decor);
  if (!triggerMask) {
    return [];
  }

  const cacheSeed = `cave-trigger:${decor.path}|${decor.bgPath}`;
  const derivedRegions = getMaskRegionsFromAlphaMask(
    triggerMask,
    { minAreaPx: CAVE_DERIVED_TRIGGER_MIN_AREA_PX },
    cacheSeed
  )
    .map((region) => mapMaskRegionToTank(item, decor.bgPath || decor.path, region))
    .filter(Boolean);
  if (!derivedRegions.length) {
    return [];
  }

  const explicitPortals = getExplicitCaveBehaviorPortals(item.decorKey);
  if (!explicitPortals.length) {
    return derivedRegions;
  }

  const unmatchedRegions = [...derivedRegions];
  const matchedRegions = [];
  for (let index = 0; index < explicitPortals.length; index += 1) {
    const portal = explicitPortals[index];
    const mouthPoint = mapDecorLocalPointToTankNorm(item, portal.mouthX, portal.mouthY);
    if (!mouthPoint) {
      continue;
    }

    let bestRegionIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let regionIndex = 0; regionIndex < unmatchedRegions.length; regionIndex += 1) {
      const region = unmatchedRegions[regionIndex];
      const distanceNorm = Math.hypot(region.xNorm - mouthPoint.xNorm, region.yNorm - mouthPoint.yNorm);
      if (distanceNorm < bestDistance) {
        bestDistance = distanceNorm;
        bestRegionIndex = regionIndex;
      }
    }

    if (bestRegionIndex >= 0) {
      const region = unmatchedRegions.splice(bestRegionIndex, 1)[0];
      matchedRegions.push({
        ...region,
        id: portal.id || region.id
      });
      continue;
    }

    const fallbackRegion = getPseudoRegionAtPoint(item, portal.mouthX, portal.mouthY, portal.id || `trigger-${index + 1}`);
    if (fallbackRegion) {
      matchedRegions.push(fallbackRegion);
    }
  }

  return matchedRegions.length ? matchedRegions : derivedRegions;
}

function getCaveTriggerRegions(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return [];
  }

  const decor = runtime.decorMap.get(item.decorKey);
  if (!decor) {
    return [];
  }

  const placedProfile = buildCaveBehaviorProfileFromPlacedSettings(item);
  if (placedProfile?.portals?.length) {
    return placedProfile.portals
      .map((portal, index) => getPseudoRegionAtPoint(item, portal.mouthX, portal.mouthY, portal.id || `trigger-${index + 1}`, 36))
      .filter(Boolean);
  }

  if (decor.triggerPath) {
    return getPlacedMaskRegions(item, decor.triggerPath);
  }

  const derivedRegions = getDerivedCaveTriggerRegions(item, decor);
  if (derivedRegions.length) {
    return derivedRegions;
  }

  const profile = getCaveBehaviorProfileForItem(item);
  if (!profile?.portals?.length) {
    return [];
  }

  return profile.portals
    .map((portal, index) => getPseudoRegionAtPoint(item, portal.mouthX, portal.mouthY, portal.id || `trigger-${index + 1}`))
    .filter(Boolean);
}

function getCaveSeatRegions(item) {
  if (!item || !isCaveDecorKey(item.decorKey)) {
    return [];
  }

  const decor = runtime.decorMap.get(item.decorKey);
  if (!decor) {
    return [];
  }

  const placedProfile = buildCaveBehaviorProfileFromPlacedSettings(item);
  if (placedProfile?.insideSlots?.length) {
    return placedProfile.insideSlots
      .map((slot, index) => {
        const region = getPseudoRegionAtPoint(item, slot.x, slot.y, slot.id || `seat-${index + 1}`, 44);
        return region
          ? {
            ...region,
            facing: normalizeCaveSeatFacing(slot.facing ?? slot.direction),
            portalIds: getCaveSeatPortalIds(slot)
          }
          : null;
      })
      .filter(Boolean);
  }

  if (decor.seatsPath) {
    return getPlacedMaskRegions(item, decor.seatsPath)
      .map((region) => annotateSeatMarkerRegion(region))
      .filter(Boolean);
  }

  const profile = getCaveBehaviorProfileForItem(item);
  if (!profile?.insideSlots?.length) {
    return [];
  }

  return profile.insideSlots
    .map((slot, index) => {
      const region = getPseudoRegionAtPoint(item, slot.x, slot.y, slot.id || `seat-${index + 1}`, 22);
      return region
        ? {
          ...region,
          portalIds: getCaveSeatPortalIds(slot),
          ...(slot.facing !== undefined || slot.direction !== undefined || slot.seatFacing !== undefined
            ? { facing: normalizeCaveSeatFacing(slot.facing ?? slot.direction ?? slot.seatFacing) }
            : {})
        }
        : null;
    })
    .filter(Boolean);
}

function findRegionById(regions, regionId) {
  if (!Array.isArray(regions) || !regionId) {
    return null;
  }

  return regions.find((region) => region.id === regionId) || null;
}

function getCaveSeatFacingDirection(seat, fallback = 1) {
  return normalizeCaveSeatFacing(seat?.facing ?? seat?.direction ?? seat?.seatFacing, fallback);
}

function getCaveSeatPortalIds(seat) {
  return Array.isArray(seat?.portalIds)
    ? seat.portalIds.map((value) => String(value).trim()).filter(Boolean)
    : [];
}

function getFishBodySizePx(fish, species) {
  if (!fish || !species) {
    return null;
  }

  const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
  const assetPath = getFishAssetPath(fish, displaySpecies)
    || displaySpecies.asset
    || displaySpecies.fallbackAsset
    || species.asset
    || species.fallbackAsset;
  const image = runtime.images.get(assetPath);
  if (!image?.width || !image?.height) {
    return null;
  }

  const catalogWidth = Number.isFinite(Number(displaySpecies.width))
    ? Number(displaySpecies.width)
    : (Number.isFinite(Number(species.width)) ? Number(species.width) : FISH_CATALOG_WIDTH_MIN);
  const width = catalogWidth * getFishAdultScale(fish, species) * getFishDisplayScaleForSpecies(displaySpecies);
  const height = width * (image.height / image.width);
  return {
    width,
    height,
    bodyWidth: width * 0.54,
    bodyHeight: height * 0.5,
    bodyThickness: Math.min(width * 0.5, height * 0.68)
  };
}

function doesFishFitCaveRegionSize(region, fish, species, multiplier = 1) {
  if (!region || !fish || !species) {
    return false;
  }

  if (species.caveEnabled === false) {
    return false;
  }

  const bodySize = getFishBodySizePx(fish, species);
  if (!bodySize) {
    return true;
  }

  const regionWidthPx = Number.isFinite(Number(region.fitWidthPx)) ? Number(region.fitWidthPx) : region.widthPx;
  const regionHeightPx = Number.isFinite(Number(region.fitHeightPx)) ? Number(region.fitHeightPx) : region.heightPx;
  return (
    regionWidthPx >= bodySize.bodyWidth * multiplier &&
    regionHeightPx >= bodySize.bodyHeight * multiplier
  );
}

function isFishWithinRegionBounds(fish, region, paddingPx = 6) {
  if (!fish || !region) {
    return false;
  }

  const x = fish.xNorm * TANK_WIDTH;
  const y = fish.yNorm * TANK_HEIGHT;
  const halfWidth = (Number.isFinite(Number(region.fitWidthPx)) ? Number(region.fitWidthPx) : region.widthPx) / 2;
  const halfHeight = (Number.isFinite(Number(region.fitHeightPx)) ? Number(region.fitHeightPx) : region.heightPx) / 2;
  const left = Number.isFinite(Number(region.fitWidthPx)) ? region.x - halfWidth : region.left;
  const right = Number.isFinite(Number(region.fitWidthPx)) ? region.x + halfWidth : region.right;
  const top = Number.isFinite(Number(region.fitHeightPx)) ? region.y - halfHeight : region.top;
  const bottom = Number.isFinite(Number(region.fitHeightPx)) ? region.y + halfHeight : region.bottom;
  return (
    x >= left - paddingPx &&
    x <= right + paddingPx &&
    y >= top - paddingPx &&
    y <= bottom + paddingPx
  );
}

function isCaveSeatOccupied(decorId, seatId, excludingFishId = null) {
  if (!decorId || !seatId) {
    return false;
  }

  const decor = getCaveBehaviorDecorById(decorId);
  const seatRegions = decor ? getCaveSeatRegions(decor) : [];
  const seatRegion = findRegionById(seatRegions, seatId);
  const getSeatRadiusNorm = (region) => ({
    x: region
      ? Math.max(
        0.006,
        ((Number.isFinite(Number(region.fitWidthPx)) ? Number(region.fitWidthPx) : region.widthPx) / TANK_WIDTH) * 0.42
      )
      : 0.006,
    y: region
      ? Math.max(
        0.006,
        ((Number.isFinite(Number(region.fitHeightPx)) ? Number(region.fitHeightPx) : region.heightPx) / TANK_HEIGHT) * 0.42
      )
      : 0.006
  });
  const seatRadius = getSeatRadiusNorm(seatRegion);
  const pointsOverlapSeat = (point, otherRadius = null) => {
    if (!seatRegion || !point) {
      return false;
    }

    const compareRadius = otherRadius || seatRadius;
    return (
      Math.abs(point.xNorm - seatRegion.xNorm) <= seatRadius.x + compareRadius.x &&
      Math.abs(point.yNorm - seatRegion.yNorm) <= seatRadius.y + compareRadius.y
    );
  };

  return state.fish.some((fish) => (
    fish.id !== excludingFishId &&
    !isFishDead(fish) &&
    fish.caveDecorId === decorId &&
    (
      (
        getReservedFishCaveSeatId(fish) === seatId &&
        ["approach", "align", "enter", "inside", "exit", "depart", "leave"].includes(fish.caveState)
      ) ||
      (
        (() => {
          if (!seatRegion || !["approach", "align", "enter", "inside", "exit", "depart", "leave"].includes(fish.caveState)) {
            return false;
          }

          const reservedSeatId = getReservedFishCaveSeatId(fish);
          const reservedSeatRegion = reservedSeatId ? findRegionById(seatRegions, reservedSeatId) : null;
          const reservedSeatRadius = getSeatRadiusNorm(reservedSeatRegion);
          if (reservedSeatRegion && pointsOverlapSeat(reservedSeatRegion, reservedSeatRadius)) {
            return true;
          }

          const activePlan = getActiveFishCavePlan(fish);
          const reservedPoint = activePlan?.normalSeatPoint
            ? {
              xNorm: clamp(activePlan.normalSeatPoint.xNorm, 0.08, 0.92),
              yNorm: clamp(activePlan.normalSeatPoint.yNorm, 0.14, 0.8)
            }
            : (
              Number.isFinite(fish.caveInsideXNorm) && Number.isFinite(fish.caveInsideYNorm)
                ? {
                  xNorm: clamp(fish.caveInsideXNorm, 0.08, 0.92),
                  yNorm: clamp(fish.caveInsideYNorm, 0.14, 0.8)
                }
                : null
            );
          return pointsOverlapSeat(reservedPoint, reservedSeatRegion ? reservedSeatRadius : null);
        })()
      ) ||
      (
        seatRegion &&
        ["inside", "exit", "depart"].includes(fish.caveState) &&
        pointsOverlapSeat({ xNorm: fish.xNorm, yNorm: fish.yNorm })
      )
    )
  ));
}

function pickCaveSeatIdleTarget(item, seatRegion, fish, species, now = Date.now(), directionOverride = null) {
  if (!item || !seatRegion || !fish || !species) {
    return null;
  }

  const direction = directionOverride == null ? (fish.direction || 1) : (directionOverride < 0 ? -1 : 1);
  const centerPoint = {
    xNorm: clamp(seatRegion.xNorm, 0.08, 0.92),
    yNorm: clamp(seatRegion.yNorm, 0.14, 0.8)
  };
  if (hasPlacedCaveSettings(item)) {
    return doesFishFitAtCavePoint(item, fish, species, now, centerPoint, direction)
      ? centerPoint
      : null;
  }

  const effectiveWidthPx = Number.isFinite(Number(seatRegion.fitWidthPx)) ? Number(seatRegion.fitWidthPx) : seatRegion.widthPx;
  const effectiveHeightPx = Number.isFinite(Number(seatRegion.fitHeightPx)) ? Number(seatRegion.fitHeightPx) : seatRegion.heightPx;
  const maxOffsetX = Math.min(0.03, Math.max(0.003, (effectiveWidthPx / TANK_WIDTH) * 0.42));
  const maxOffsetY = Math.min(0.024, Math.max(0.003, (effectiveHeightPx / TANK_HEIGHT) * 0.42));
  const sampledOffsets = [
    [0, 0],
    [-0.3, 0],
    [0.3, 0],
    [0, -0.3],
    [0, 0.3],
    [-0.48, -0.2],
    [0.48, -0.2],
    [-0.48, 0.2],
    [0.48, 0.2],
    [-0.68, 0],
    [0.68, 0],
    [0, -0.5]
  ];
  const seen = new Set();
  let bestPoint = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const considerPoint = (point) => {
    if (!point) {
      return;
    }

    const cacheKey = `${point.xNorm.toFixed(4)}|${point.yNorm.toFixed(4)}`;
    if (seen.has(cacheKey)) {
      return;
    }
    seen.add(cacheKey);

    if (!doesFishFitAtCavePoint(item, fish, species, now, point, direction)) {
      return;
    }

    const score = Math.hypot(point.xNorm - seatRegion.xNorm, point.yNorm - seatRegion.yNorm);
    if (score < bestScore) {
      bestPoint = point;
      bestScore = score;
    }
  };

  for (const [offsetX, offsetY] of sampledOffsets) {
    considerPoint({
      xNorm: clamp(seatRegion.xNorm + maxOffsetX * offsetX, 0.08, 0.92),
      yNorm: clamp(seatRegion.yNorm + maxOffsetY * offsetY, 0.14, 0.8)
    });
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    considerPoint({
      xNorm: clamp(seatRegion.xNorm + randomBetween(-maxOffsetX, maxOffsetX), 0.08, 0.92),
      yNorm: clamp(seatRegion.yNorm + randomBetween(-maxOffsetY, maxOffsetY), 0.14, 0.8)
    });
  }

  return bestPoint;
}

function pickAvailableCaveSeatAssignment(item, fish, species, now = Date.now(), anchorPoint = null) {
  if (!item || !fish || !species) {
    return null;
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
      const point = pickCaveSeatIdleTarget(item, seat, fish, species, now, direction);
      if (!point || !doesFishFitAtCavePoint(item, fish, species, now, point, direction, CAVE_PLAN_SAMPLE_STEP_PX)) {
        return null;
      }

      return {
        seatId: seat.id,
        seatRegion: seat,
        direction,
        point,
        distance: Math.hypot(point.xNorm - origin.xNorm, point.yNorm - origin.yNorm)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distance - right.distance)[0] || null;
}

function findCaveInteriorEntryPoint(item, triggerRegion, insidePoint, fish, species, now = Date.now(), directionOverride = null) {
  if (!item || !triggerRegion || !insidePoint || !fish || !species) {
    return null;
  }

  const direction = directionOverride == null ? (fish.direction || 1) : (directionOverride < 0 ? -1 : 1);
  const triggerPoint = {
    xNorm: triggerRegion.xNorm,
    yNorm: triggerRegion.yNorm
  };

  if (doesFishFitAtCavePoint(item, fish, species, now, triggerPoint, direction, CAVE_PLAN_SAMPLE_STEP_PX)) {
    return triggerPoint;
  }

  const steps = 20;
  let firstValidPoint = null;

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const point = {
      xNorm: triggerPoint.xNorm + (insidePoint.xNorm - triggerPoint.xNorm) * t,
      yNorm: triggerPoint.yNorm + (insidePoint.yNorm - triggerPoint.yNorm) * t
    };
    if (!doesFishFitAtCavePoint(item, fish, species, now, point, direction, CAVE_PLAN_SAMPLE_STEP_PX)) {
      continue;
    }
    firstValidPoint = point;
    break;
  }

  return firstValidPoint;
}

function buildTriggerSeatEntryNodes(item, triggerRegion, seatRegion, fish, species, now = Date.now(), directionOverride = null) {
  if (!item || !triggerRegion || !seatRegion || !fish || !species) {
    return null;
  }

  const fallbackDirection = directionOverride == null ? (fish.direction || 1) : (directionOverride < 0 ? -1 : 1);
  const direction = getCaveSeatFacingDirection(seatRegion, fallbackDirection);
  const seatPoint = pickCaveSeatIdleTarget(item, seatRegion, fish, species, now, direction);
  if (!seatPoint) {
    return null;
  }

  const entryPoint = findCaveInteriorEntryPoint(item, triggerRegion, seatPoint, fish, species, now, direction);
  if (!entryPoint) {
    return null;
  }

  const entryPathNodes = [entryPoint];
  let previousPoint = entryPoint;
  for (const t of [0.45, 0.72]) {
    const point = {
      xNorm: entryPoint.xNorm + (seatPoint.xNorm - entryPoint.xNorm) * t,
      yNorm: entryPoint.yNorm + (seatPoint.yNorm - entryPoint.yNorm) * t
    };
    if (!doesFishFitAtCavePoint(item, fish, species, now, point, direction, CAVE_PLAN_SAMPLE_STEP_PX)) {
      continue;
    }
    if (!pathStaysInsideCave(item, fish, species, now, previousPoint, point, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
      continue;
    }
    entryPathNodes.push(point);
    previousPoint = point;
  }

  if (!pathStaysInsideCave(item, fish, species, now, previousPoint, seatPoint, CAVE_PLAN_SAMPLE_STEP_PX, CAVE_PLAN_SEGMENT_STEP_PX)) {
    return null;
  }

  return {
    direction,
    inside: seatPoint,
    entryPathNodes,
    exitPathNodes: entryPathNodes.slice().reverse()
  };
}

function sampleAlphaMask(mask, u, v, threshold = ALPHA_HIT_THRESHOLD) {
  if (!mask || !Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) {
    return false;
  }

  const pixelX = clamp(Math.floor(u * (mask.width - 1)), 0, mask.width - 1);
  const pixelY = clamp(Math.floor(v * (mask.height - 1)), 0, mask.height - 1);
  const bounds = mask.bounds;
  if (
    pixelX < bounds.minX ||
    pixelX > bounds.maxX ||
    pixelY < bounds.minY ||
    pixelY > bounds.maxY
  ) {
    return false;
  }

  return mask.alpha[(pixelY * mask.width + pixelX) * 4 + 3] >= threshold;
}

function sampleMaskGrid(mask, u, v) {
  if (!mask || !Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) {
    return false;
  }

  const gridX = clamp(Math.floor(u * mask.gridWidth), 0, mask.gridWidth - 1);
  const gridY = clamp(Math.floor(v * mask.gridHeight), 0, mask.gridHeight - 1);
  return mask.grid[gridY * mask.gridWidth + gridX] === 1;
}

function pointHitsShapeDescriptor(descriptor, x, y, threshold = ALPHA_HIT_THRESHOLD) {
  if (!descriptor || !descriptor.bounds) {
    return false;
  }

  const { bounds } = descriptor;
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
    return false;
  }

  const uv = descriptor.worldToUv(x, y);
  if (!uv) {
    return false;
  }

  return sampleAlphaMask(descriptor.mask, uv.u, uv.v, threshold);
}

function shapesOverlapByMask(leftDescriptor, rightDescriptor, sampleSpacingPx = 10) {
  if (!leftDescriptor || !rightDescriptor || !leftDescriptor.bounds || !rightDescriptor.bounds) {
    return false;
  }

  if (!boundsIntersect(leftDescriptor.bounds, rightDescriptor.bounds)) {
    return false;
  }

  const overlapLeft = Math.max(leftDescriptor.bounds.left, rightDescriptor.bounds.left);
  const overlapRight = Math.min(leftDescriptor.bounds.right, rightDescriptor.bounds.right);
  const overlapTop = Math.max(leftDescriptor.bounds.top, rightDescriptor.bounds.top);
  const overlapBottom = Math.min(leftDescriptor.bounds.bottom, rightDescriptor.bounds.bottom);
  const width = overlapRight - overlapLeft;
  const height = overlapBottom - overlapTop;
  if (width <= 0 || height <= 0) {
    return false;
  }

  const step = Math.max(4, Math.min(sampleSpacingPx, Math.max(width, height) / 2));
  for (let y = overlapTop + step * 0.5; y < overlapBottom; y += step) {
    for (let x = overlapLeft + step * 0.5; x < overlapRight; x += step) {
      const leftUv = leftDescriptor.worldToUv(x, y);
      const rightUv = rightDescriptor.worldToUv(x, y);
      if (!leftUv || !rightUv) {
        continue;
      }

      if (!sampleMaskGrid(leftDescriptor.mask, leftUv.u, leftUv.v) || !sampleMaskGrid(rightDescriptor.mask, rightUv.u, rightUv.v)) {
        continue;
      }

      if (
        sampleAlphaMask(leftDescriptor.mask, leftUv.u, leftUv.v, ALPHA_COLLISION_THRESHOLD) &&
        sampleAlphaMask(rightDescriptor.mask, rightUv.u, rightUv.v, ALPHA_COLLISION_THRESHOLD)
      ) {
        return true;
      }
    }
  }

  return false;
}

function shapesOverlapByMaskStrict(leftDescriptor, rightDescriptor, sampleSpacingPx = CAVE_STRICT_SAMPLE_STEP_PX) {
  if (!leftDescriptor || !rightDescriptor || !leftDescriptor.bounds || !rightDescriptor.bounds) {
    return false;
  }

  if (!boundsIntersect(leftDescriptor.bounds, rightDescriptor.bounds)) {
    return false;
  }

  const overlapLeft = Math.max(leftDescriptor.bounds.left, rightDescriptor.bounds.left);
  const overlapRight = Math.min(leftDescriptor.bounds.right, rightDescriptor.bounds.right);
  const overlapTop = Math.max(leftDescriptor.bounds.top, rightDescriptor.bounds.top);
  const overlapBottom = Math.min(leftDescriptor.bounds.bottom, rightDescriptor.bounds.bottom);
  if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
    return false;
  }

  const step = Math.max(1, sampleSpacingPx);
  for (let y = overlapTop; y <= overlapBottom; y += step) {
    for (let x = overlapLeft; x <= overlapRight; x += step) {
      const leftUv = leftDescriptor.worldToUv(x, y);
      const rightUv = rightDescriptor.worldToUv(x, y);
      if (!leftUv || !rightUv) {
        continue;
      }

      if (
        sampleAlphaMask(leftDescriptor.mask, leftUv.u, leftUv.v, ALPHA_COLLISION_THRESHOLD) &&
        sampleAlphaMask(rightDescriptor.mask, rightUv.u, rightUv.v, ALPHA_COLLISION_THRESHOLD)
      ) {
        return true;
      }
    }
  }

  return false;
}

function shapeContainedByMaskStrict(containerDescriptor, innerDescriptor, sampleSpacingPx = CAVE_STRICT_SAMPLE_STEP_PX) {
  if (!containerDescriptor || !innerDescriptor || !containerDescriptor.bounds || !innerDescriptor.bounds) {
    return false;
  }

  if (
    innerDescriptor.bounds.left < containerDescriptor.bounds.left ||
    innerDescriptor.bounds.right > containerDescriptor.bounds.right ||
    innerDescriptor.bounds.top < containerDescriptor.bounds.top ||
    innerDescriptor.bounds.bottom > containerDescriptor.bounds.bottom
  ) {
    return false;
  }

  const step = Math.max(1, sampleSpacingPx);
  let sampledSolidPixel = false;

  for (let y = innerDescriptor.bounds.top; y <= innerDescriptor.bounds.bottom; y += step) {
    for (let x = innerDescriptor.bounds.left; x <= innerDescriptor.bounds.right; x += step) {
      const innerUv = innerDescriptor.worldToUv(x, y);
      if (!innerUv) {
        continue;
      }

      if (!sampleAlphaMask(innerDescriptor.mask, innerUv.u, innerUv.v, ALPHA_COLLISION_THRESHOLD)) {
        continue;
      }

      sampledSolidPixel = true;
      const containerUv = containerDescriptor.worldToUv(x, y);
      if (!containerUv) {
        return false;
      }

      if (!sampleAlphaMask(containerDescriptor.mask, containerUv.u, containerUv.v, ALPHA_COLLISION_THRESHOLD)) {
        return false;
      }
    }
  }

  return sampledSolidPixel;
}

function createDecorShapeDescriptorFromMask(item, decor, imagePath, mask) {
  const image = runtime.images.get(imagePath);
  if (!image || !mask) {
    return null;
  }

  const width = getDecorDisplayWidth(decor, item);
  const height = width * (image.height / image.width);
  const x = item.xNorm * TANK_WIDTH;
  const y = item.yNorm * TANK_HEIGHT;
  const left = x - width / 2;
  const top = y - height;

  return {
    mask,
    bounds: {
      left,
      right: left + width,
      top,
      bottom: top + height
    },
    worldToUv(worldX, worldY) {
      const rawU = (worldX - left) / width;
      return {
        u: isDecorHorizontallyFlipped(item) ? 1 - rawU : rawU,
        v: resolveDecorVerticalUnit(item, (worldY - top) / height)
      };
    }
  };
}

function tick() {
  if (isWallpaperEnginePauseActive()) {
    return;
  }

  const profileStartedAt = runtime.debugFrameProfilerEnabled ? performance.now() : 0;
  const now = advanceDebugSimulationClock(Date.now());
  const tutorialChanged = syncTutorialFlow(now);
  const changed = syncState(now) || runtime.gravelStateDirty || runtime.tankStateDirty || tutorialChanged;
  renderTickUi(now, { stateChanged: false });
  if (changed) {
    scheduleDeferredTickUiRefresh(now);
    requestDeferredStateSave();
    runtime.gravelStateDirty = false;
    runtime.tankStateDirty = false;
  }
  if (runtime.debugFrameProfilerEnabled) {
    runtime.frameProfilerLastTickMs = Math.max(0, performance.now() - profileStartedAt);
  }
}
