// Source fragment: tank/cleaning-and-glass.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function queueScrubGlass(x, y) {
  runtime.pendingScrubPoint = { x, y };
  if (runtime.scrubFrameHandle) {
    return;
  }
  runtime.scrubFrameHandle = window.requestAnimationFrame(() => {
    runtime.scrubFrameHandle = 0;
    const point = runtime.pendingScrubPoint;
    runtime.pendingScrubPoint = null;
    if (runtime.cleaningMode && point) {
      scrubGlass(point.x, point.y);
    }
  });
}

function scrubGlass(x, y) {
  const previousPoint = runtime.lastScrubPoint;
  const points = [];
  if (previousPoint) {
    playScrubWipeSoundForMovement(previousPoint, { x, y });
    const strokeDistance = distance(previousPoint.x, previousPoint.y, x, y);
    const steps = Math.max(1, Math.ceil(strokeDistance / SCRUB_STROKE_STEP));
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      points.push({
        x: previousPoint.x + (x - previousPoint.x) * progress,
        y: previousPoint.y + (y - previousPoint.y) * progress
      });
    }
  } else {
    points.push({ x, y });
  }

  let changed = false;
  for (const point of points) {
    changed = markScrubStamp(point.x, point.y, { paint: false }) || changed;
  }
  runtime.lastScrubPoint = { x, y };

  if (!changed) {
    return;
  }

  recordScrubMaskStroke(previousPoint || { x, y }, { x, y }, SCRUB_BRUSH_RADIUS);

  const coverage = getScrubCoverage();
  if (coverage >= getRequiredScrubThreshold()) {
    completeCleaning();
    return;
  }
  if (coverage >= SCRUB_AUTO_COMPLETE_GRACE_THRESHOLD && !runtime.scrubAutoCompleteAt) {
    runtime.scrubAutoCompleteAt = Date.now() + SCRUB_AUTO_COMPLETE_GRACE_MS;
  }
  renderScrubProgress();
}

function isTankPointAlreadyScrubbed(x, y) {
  if (!runtime.scrubCells?.length) {
    return false;
  }

  const col = clamp(Math.floor((Number(x) || 0) / (TANK_WIDTH / SCRUB_GRID_COLS)), 0, SCRUB_GRID_COLS - 1);
  const row = clamp(Math.floor((Number(y) || 0) / (TANK_HEIGHT / SCRUB_GRID_ROWS)), 0, SCRUB_GRID_ROWS - 1);
  return Boolean(runtime.scrubCells[row * SCRUB_GRID_COLS + col]);
}

function getFrontGlassSuckerScrubPoint(fish, species, now = Date.now()) {
  const fallback = {
    x: clamp(Number(fish?.xNorm) || 0.5, 0.08, 0.92) * TANK_WIDTH,
    y: clamp(Number(fish?.yNorm) || 0.5, 0.16, 0.96) * TANK_HEIGHT
  };
  if (!fish || !species) {
    return fallback;
  }

  const image = runtime.images.get(getFishDisplayAssetPath(fish, species, now) || species.asset);
  if (!image) {
    return fallback;
  }

  const width = getFishDisplayWidth(fish, species, now);
  const mouthPoint = getFishGravelPebbleMouthPoint(
    fish,
    species,
    now,
    -width * SUCKER_FISH_FRONT_GLASS_SCRUB_MOUTH_INSET_RATIO
  );
  if (
    !mouthPoint
    || !Number.isFinite(Number(mouthPoint.x))
    || !Number.isFinite(Number(mouthPoint.y))
  ) {
    return fallback;
  }

  return {
    x: clamp(Number(mouthPoint.x), 0, TANK_WIDTH),
    y: clamp(Number(mouthPoint.y), 0, TANK_HEIGHT)
  };
}

function applyFrontGlassSuckerScrubCleaning(scrubbedCellDelta, cleanableCellCount, now = Date.now()) {
  const changedCells = Math.max(0, Math.floor(Number(scrubbedCellDelta) || 0));
  if (!state || changedCells <= 0 || isTutorialTankDirtinessLocked()) {
    return false;
  }

  const totalCleanableCells = Math.max(1, Math.floor(Number(cleanableCellCount) || getCleanableScrubCellCount({ viewportOnly: false })));
  const currentDirtiness = getBaseTankDirtiness(now);
  if (currentDirtiness <= 0) {
    return false;
  }

  const dirtinessReduction = Math.min(
    currentDirtiness,
    (changedCells / totalCleanableCells) * SUCKER_FISH_FRONT_GLASS_DIRTINESS_REDUCTION_PER_SCRUB_COVERAGE
  );
  if (dirtinessReduction <= 0) {
    return false;
  }

  rebaseTankDirtiness(now, currentDirtiness - dirtinessReduction);
  runtime.tankStateDirty = true;
  return true;
}

function scrubFrontGlassSuckerTrail(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (
    !fish
    || isFishDead(fish)
    || !isFrontGlassSuckerFish(fish, species)
    || getVisibleGrimeDirtiness(getTankDirtiness(now)) <= 0
  ) {
    return false;
  }

  const scrubPoint = getFrontGlassSuckerScrubPoint(fish, species, now);
  const x = scrubPoint.x;
  const y = scrubPoint.y;
  const lastScrubAt = Number(fish.frontGlassScrubAt) || 0;
  const timeSinceLastScrub = now - lastScrubAt;
  if (timeSinceLastScrub < SUCKER_FISH_FRONT_GLASS_SCRUB_COOLDOWN_MS) {
    return false;
  }

  const lastX = Number(fish.frontGlassScrubX);
  const lastY = Number(fish.frontGlassScrubY);
  const hasLastScrubPoint = Number.isFinite(lastX) && Number.isFinite(lastY);
  const scrubDistance = hasLastScrubPoint ? distance(lastX, lastY, x, y) : 0;
  if (hasLastScrubPoint
    && scrubDistance < SUCKER_FISH_FRONT_GLASS_SCRUB_MIN_DISTANCE_PX
    && timeSinceLastScrub < SUCKER_FISH_FRONT_GLASS_SCRUB_MAX_INTERVAL_MS
  ) {
    return false;
  }

  fish.frontGlassScrubAt = now;
  fish.frontGlassScrubX = x;
  fish.frontGlassScrubY = y;
  const points = [];
  if (hasLastScrubPoint && scrubDistance > 0) {
    const steps = Math.max(1, Math.ceil(scrubDistance / SUCKER_FISH_FRONT_GLASS_SCRUB_STROKE_STEP_PX));
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      points.push({
        x: lastX + (x - lastX) * progress,
        y: lastY + (y - lastY) * progress
      });
    }
  } else {
    points.push({ x, y });
  }

  const scrubbedBefore = runtime.scrubbedCount;
  let changed = false;
  for (const point of points) {
    changed = markScrubStamp(point.x, point.y, { radius: SUCKER_FISH_FRONT_GLASS_SCRUB_RADIUS }) || changed;
  }
  if (!changed) {
    return false;
  }

  const cleanableCellCount = getCleanableScrubCellCount({ viewportOnly: false });
  const scrubbedCellDelta = Math.max(0, runtime.scrubbedCount - scrubbedBefore);
  applyFrontGlassSuckerScrubCleaning(scrubbedCellDelta, cleanableCellCount, now);

  const coverage = runtime.cleaningMode
    ? getScrubCoverage()
    : (cleanableCellCount > 0 ? runtime.scrubbedCount / cleanableCellCount : 0);
  if (coverage >= getRequiredScrubThreshold()) {
    completeCleaning({ source: "sucker" });
    return true;
  }
  if (runtime.cleaningMode && coverage >= SCRUB_AUTO_COMPLETE_GRACE_THRESHOLD && !runtime.scrubAutoCompleteAt) {
    runtime.scrubAutoCompleteAt = now + SCRUB_AUTO_COMPLETE_GRACE_MS;
  }
  if (runtime.cleaningMode) {
    renderScrubProgress();
  }
  return true;
}

function pickFrontGlassSuckerGrimeTarget(fish, now = Date.now()) {
  if (!isFrontGlassSuckerFish(fish) || Math.random() > SUCKER_FISH_FRONT_GLASS_GRIME_TARGET_CHANCE) {
    return null;
  }

  const species = getSpeciesForFish(fish);
  const yRange = getSuckerFishYRange(fish, species, SUCKER_FISH_FRONT_GLASS_LAYER);
  const grimeMarks = Array.isArray(runtime.scene?.grimeMarks) ? runtime.scene.grimeMarks : [];
  const visibleMarkCount = Math.min(
    grimeMarks.length,
    Math.floor(getLightGrimeVisualIntensity(getTankDirtiness(now)) * grimeMarks.length)
  );
  if (!visibleMarkCount) {
    return null;
  }

  let bestTarget = null;
  const sampleCount = Math.min(visibleMarkCount, 14);
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const mark = grimeMarks[Math.floor(Math.random() * visibleMarkCount)];
    if (!mark) {
      continue;
    }

    const xNorm = clamp(Number(mark.x) || 0.5, 0.1, 0.9);
    const yNorm = clamp(Number(mark.y) || 0.5, yRange.min, yRange.max);
    const scrubbedPenalty = isTankPointAlreadyScrubbed(xNorm * TANK_WIDTH, yNorm * TANK_HEIGHT)
      ? 0.24
      : 0;
    const score = Math.hypot(xNorm - fish.xNorm, yNorm - fish.yNorm) + scrubbedPenalty + Math.random() * 0.08;
    if (!bestTarget || score < bestTarget.score) {
      bestTarget = { xNorm, yNorm, score };
    }
  }

  if (!bestTarget) {
    return null;
  }

  return clampFishPlacement(
    bestTarget.xNorm + randomBetween(-0.018, 0.018),
    bestTarget.yNorm + randomBetween(-0.024, 0.024),
    species,
    {
      fish,
      layer: SUCKER_FISH_FRONT_GLASS_LAYER
    }
  );
}

function getRequiredScrubThreshold() {
  return isWallpaperEngineModeEnabled()
    ? WALLPAPER_ENGINE_SCRUB_THRESHOLD
    : DEFAULT_SCRUB_THRESHOLD;
}

function getRequiredScrubPercent() {
  return Math.round(getRequiredScrubThreshold() * 100);
}

function isPointInsideScrubbableTankArea(x, y, target = getCurrentTank()) {
  const point = {
    x: Number(x) || 0,
    y: Number(y) || 0
  };
  if (
    point.x < 0
    || point.x > TANK_WIDTH
    || point.y < 0
    || point.y > TANK_HEIGHT
  ) {
    return false;
  }

  const shellPoints = getTankShellPointSet("outer", target);
  if (!shellPoints) {
    return true;
  }
  return pointInPolygon(point, shellPoints);
}

function markScrubStamp(x, y, options = {}) {
  const constrainedPoint = constrainPointToTankShell(x, y, { variant: "outer" });
  const scrubX = constrainedPoint.x;
  const scrubY = constrainedPoint.y;
  const target = getCurrentTank();
  if (!isPointInsideScrubbableTankArea(scrubX, scrubY, target)) {
    return false;
  }
  const brushRadius = clamp(Number(options.radius) || SCRUB_BRUSH_RADIUS, 4, SCRUB_BRUSH_RADIUS);
  const cellWidth = TANK_WIDTH / SCRUB_GRID_COLS;
  const cellHeight = TANK_HEIGHT / SCRUB_GRID_ROWS;
  const startCol = clamp(Math.floor((scrubX - brushRadius) / cellWidth), 0, SCRUB_GRID_COLS - 1);
  const endCol = clamp(Math.ceil((scrubX + brushRadius) / cellWidth), 0, SCRUB_GRID_COLS - 1);
  const startRow = clamp(Math.floor((scrubY - brushRadius) / cellHeight), 0, SCRUB_GRID_ROWS - 1);
  const endRow = clamp(Math.ceil((scrubY + brushRadius) / cellHeight), 0, SCRUB_GRID_ROWS - 1);
  const coverageBounds = runtime.cleaningMode ? getVisibleScrubBounds() : null;
  if (runtime.cleaningMode) {
    refreshScrubCoverageCache();
  }

  let changed = false;
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cellCenterX = col * cellWidth + cellWidth / 2;
      const cellCenterY = row * cellHeight + cellHeight / 2;
      if (!isPointInsideScrubbableTankArea(cellCenterX, cellCenterY, target)) {
        continue;
      }

      const index = row * SCRUB_GRID_COLS + col;
      if (!runtime.scrubCells[index] && distance(cellCenterX, cellCenterY, scrubX, scrubY) <= brushRadius) {
        runtime.scrubCells[index] = 1;
        runtime.scrubbedCount += 1;
        if (coverageBounds && isScrubCellCenterInsideVisibleBounds(cellCenterX, cellCenterY, coverageBounds)) {
          runtime.scrubbedCleanableCellCount += 1;
        }
        changed = true;
      }
    }
  }

  if (changed && options.paint !== false) {
    recordScrubMaskStroke(
      { x: scrubX, y: scrubY },
      { x: scrubX, y: scrubY },
      brushRadius * (0.92 + Math.random() * 0.1)
    );
  }
  if (changed && !runtime.cleaningMode) {
    runtime.scrubCoverageCacheKey = "";
  }

  return changed;
}

function completeCleaning(options = {}) {
  const now = Date.now();
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_CLEAN_TANK)) {
    runtime.cleaningMode = false;
    runtime.toolModeSource = null;
    runtime.pointerDown = false;
    runtime.lastScrubPoint = null;
    runtime.scrubAutoCompleteAt = 0;
    clearScrubProgress();
    renderToolCursor();
    setTutorialStage(TUTORIAL_STAGE_CLEAN_TANK_DONE, { now });
    saveState();
    renderUi(now);
    return { ok: true, previewOnly: true };
  }

  const fromDirtiness = getBaseTankDirtiness(now);
  const cleanReward =
    fromDirtiness < 0.25 ? 0 :
      fromDirtiness < 0.5 ? 1 :
        fromDirtiness < 0.7 ? 3 :
          fromDirtiness < 0.85 ? 5 :
            6;

  state.lastCleanedAt = now;
  state.poops = [];
  state.coins = Math.min(MAX_WALLET_COINS, state.coins + cleanReward);

  if (!hasExposedDeadTankFish(now)) {
    resetLivingFishComfortDamageProgress();
  }

  runtime.cleaningTransition = {
    startedAt: now,
    fadeEndsAt: now + CLEAN_FADE_MS,
    sparkleEndsAt: now + CLEAN_FADE_MS + CLEAN_SPARKLE_MS,
    fromDirtiness,
    sparkles: createCleaningSparkles()
  };
  playCleaningCompleteSoundEffect();

  runtime.cleaningMode = false;
  runtime.toolModeSource = null;
  runtime.pointerDown = false;
  runtime.lastScrubPoint = null;
  runtime.scrubAutoCompleteAt = 0;
  resetScrubWipeSoundState();
  renderToolCursor();

  pushEvent(
    cleanReward > 0
      ? `The tank sparkled back to life after a deep sponge scrub. Earned ${cleanReward} ${pluralize("coin", cleanReward)}.`
      : "The tank sparkled back to life after a deep sponge scrub.",
    now
  );

  let tutorialChanged = false;
  if (isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_CLEAN_TANK)) {
    tutorialChanged = setTutorialStage(TUTORIAL_STAGE_CLEAN_TANK_DONE, { now }) || tutorialChanged;
  }

  saveState();
  renderUi(now);
  showToast(
    cleanReward > 0
      ? `Tank cleaned. +${cleanReward} coins.`
      : "Tank cleaned. The haze is gone."
  );
  return {
    ok: true,
    cleanReward,
    tutorialChanged,
    source: options.source || "sponge"
  };
}

function clearScrubProgress() {
  runtime.scrubCells.fill(0);
  runtime.scrubbedCount = 0;
  runtime.scrubStamps = [];
  runtime.pendingScrubPoint = null;
  runtime.scrubMaskRevision += 1;
  runtime.cleanableScrubCellCount = 0;
  runtime.scrubbedCleanableCellCount = 0;
  runtime.scrubCoverageCacheKey = "";
  runtime.grimeCompositeCacheKey = "";
  runtime.lastScrubPoint = null;
  runtime.scrubAutoCompleteAt = 0;
  resetScrubWipeSoundState();
  if (scrubMaskContext) {
    scrubMaskContext.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  }
  renderScrubProgress();
}

function getScrubCoverage() {
  refreshScrubCoverageCache();
  return runtime.cleanableScrubCellCount > 0
    ? Math.min(1, runtime.scrubbedCleanableCellCount / runtime.cleanableScrubCellCount)
    : 0;
}

function getVisibleScrubBounds() {
  const bounds = getVisibleTankVirtualBounds();
  return {
    left: clamp(Number(bounds?.left) || 0, 0, TANK_WIDTH),
    top: clamp(Number(bounds?.top) || 0, 0, TANK_HEIGHT),
    right: clamp(Number(bounds?.right) || TANK_WIDTH, 0, TANK_WIDTH),
    bottom: clamp(Number(bounds?.bottom) || TANK_HEIGHT, 0, TANK_HEIGHT)
  };
}

function isScrubCellCenterInsideVisibleBounds(cellCenterX, cellCenterY, bounds = getVisibleScrubBounds()) {
  return cellCenterX >= bounds.left
    && cellCenterX <= bounds.right
    && cellCenterY >= bounds.top
    && cellCenterY <= bounds.bottom;
}

function countScrubGridCells(options = {}) {
  const cellWidth = TANK_WIDTH / SCRUB_GRID_COLS;
  const cellHeight = TANK_HEIGHT / SCRUB_GRID_ROWS;
  const target = getCurrentTank();
  const viewportOnly = options.viewportOnly !== false;
  const visibleBounds = viewportOnly ? getVisibleScrubBounds() : null;
  const scrubbedOnly = options.scrubbedOnly === true;
  let count = 0;

  for (let row = 0; row < SCRUB_GRID_ROWS; row += 1) {
    const y = row * cellHeight + cellHeight / 2;
    for (let col = 0; col < SCRUB_GRID_COLS; col += 1) {
      const x = col * cellWidth + cellWidth / 2;
      if (viewportOnly && !isScrubCellCenterInsideVisibleBounds(x, y, visibleBounds)) {
        continue;
      }
      if (isPointInsideScrubbableTankArea(x, y, target)) {
        if (scrubbedOnly && !runtime.scrubCells[row * SCRUB_GRID_COLS + col]) {
          continue;
        }
        count += 1;
      }
    }
  }

  return count;
}

function getScrubbedCleanableCellCount(options = {}) {
  return countScrubGridCells({ ...options, scrubbedOnly: true });
}

function getCleanableScrubCellCount(options = {}) {
  return countScrubGridCells(options);
}

function paintScrubMaskStamp(stamp) {
  if (!scrubMaskContext || !stamp) {
    return;
  }

  const fromX = Number(stamp.x) || 0;
  const fromY = Number(stamp.y) || 0;
  const toX = Number.isFinite(Number(stamp.toX)) ? Number(stamp.toX) : fromX;
  const toY = Number.isFinite(Number(stamp.toY)) ? Number(stamp.toY) : fromY;
  const radius = Math.max(4, Number(stamp.radius) || SCRUB_BRUSH_RADIUS);
  const drawStroke = (width, alpha) => {
    scrubMaskContext.strokeStyle = `rgba(0,0,0,${alpha})`;
    scrubMaskContext.fillStyle = `rgba(0,0,0,${alpha})`;
    scrubMaskContext.lineWidth = width;
    scrubMaskContext.lineCap = "round";
    scrubMaskContext.lineJoin = "round";
    if (Math.abs(toX - fromX) < 0.01 && Math.abs(toY - fromY) < 0.01) {
      scrubMaskContext.beginPath();
      scrubMaskContext.arc(fromX, fromY, width / 2, 0, Math.PI * 2);
      scrubMaskContext.fill();
      return;
    }
    scrubMaskContext.beginPath();
    scrubMaskContext.moveTo(fromX, fromY);
    scrubMaskContext.lineTo(toX, toY);
    scrubMaskContext.stroke();
  };

  scrubMaskContext.save();
  drawStroke(radius * 2, 0.34);
  drawStroke(radius * 1.68, 0.98);
  scrubMaskContext.restore();
}

function getScrubCoverageCacheKey() {
  const bounds = getVisibleScrubBounds();
  return [
    getCurrentTank()?.id || "tank",
    getCurrentTank()?.tankTypeId || "shell",
    Math.round(bounds.left),
    Math.round(bounds.top),
    Math.round(bounds.right),
    Math.round(bounds.bottom)
  ].join("|");
}

function refreshScrubCoverageCache() {
  const cacheKey = getScrubCoverageCacheKey();
  if (runtime.scrubCoverageCacheKey === cacheKey && runtime.cleanableScrubCellCount > 0) {
    return;
  }
  runtime.scrubCoverageCacheKey = cacheKey;
  runtime.cleanableScrubCellCount = getCleanableScrubCellCount();
  runtime.scrubbedCleanableCellCount = getScrubbedCleanableCellCount();
}

function recordScrubMaskStroke(fromPoint, toPoint, radius = SCRUB_BRUSH_RADIUS) {
  if (!fromPoint || !toPoint) {
    return;
  }
  const stamp = {
    x: Number(fromPoint.x) || 0,
    y: Number(fromPoint.y) || 0,
    toX: Number(toPoint.x) || 0,
    toY: Number(toPoint.y) || 0,
    radius: clamp(Number(radius) || SCRUB_BRUSH_RADIUS, 4, SCRUB_BRUSH_RADIUS)
  };
  runtime.scrubStamps.push(stamp);
  paintScrubMaskStamp(stamp);
  runtime.scrubMaskRevision += 1;
  runtime.grimeCompositeCacheKey = "";
  if (runtime.scrubStamps.length > SCRUB_MAX_STAMPS) {
    runtime.scrubStamps.splice(0, runtime.scrubStamps.length - SCRUB_MAX_STAMPS);
  }
}

function rebuildScrubMaskCanvas() {
  if (!scrubMaskContext) {
    return;
  }

  scrubMaskContext.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  for (const stamp of runtime.scrubStamps) {
    paintScrubMaskStamp(stamp);
  }
  runtime.grimeCompositeCacheKey = "";
}

function getGrimeBaseCacheKey(dirtiness) {
  return [
    Math.round(getVisibleGrimeDirtiness(dirtiness) * GRIME_CACHE_PRECISION),
    WATER_SURFACE_Y.toFixed(2)
  ].join("|");
}

function getVisibleGrimeDirtiness(dirtiness) {
  const normalizedDirtiness = clamp(Number(dirtiness) || 0, 0, 1);
  return clamp(
    (normalizedDirtiness - GRIME_VISUAL_START_DIRTINESS) / Math.max(0.001, 1 - GRIME_VISUAL_START_DIRTINESS),
    0,
    1
  );
}

function getLightGrimeVisualIntensity(dirtiness) {
  return Math.pow(getVisibleGrimeDirtiness(dirtiness), 1.35);
}

function getSevereGrimeVisualIntensity(dirtiness) {
  const normalizedDirtiness = getVisibleGrimeDirtiness(dirtiness);
  return clamp(
    (normalizedDirtiness - SEVERE_GRIME_VISUAL_THRESHOLD) / Math.max(0.001, 1 - SEVERE_GRIME_VISUAL_THRESHOLD),
    0,
    1
  );
}

function renderGrimeBaseCanvas(dirtiness) {
  if (!grimeBaseContext) {
    return;
  }

  grimeBaseContext.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  const visibleDirtiness = getVisibleGrimeDirtiness(dirtiness);
  if (visibleDirtiness <= 0) {
    return;
  }

  const scaledLevel = visibleDirtiness * GRIME_OVERLAY_ASSET_PATHS.length;
  const levelPosition = clamp(scaledLevel - 1, 0, GRIME_OVERLAY_ASSET_PATHS.length - 1);
  const lowerIndex = Math.floor(levelPosition);
  const upperIndex = Math.ceil(levelPosition);
  const blend = levelPosition - lowerIndex;
  const lowerAlpha = scaledLevel < 1 ? scaledLevel : 1 - blend;
  const upperAlpha = lowerIndex === upperIndex ? 0 : blend;

  drawGrimeOverlayImage(GRIME_OVERLAY_ASSET_PATHS[lowerIndex], lowerAlpha);
  if (upperAlpha > 0.001) {
    drawGrimeOverlayImage(GRIME_OVERLAY_ASSET_PATHS[upperIndex], upperAlpha);
  }
}

function drawGrimeOverlayImage(path, alpha = 1) {
  const image = runtime.images.get(path);
  if (!isUsableRuntimeImage(image) || alpha <= 0) {
    requestRuntimeImageRecovery(path, { kind: "grime", id: path });
    return;
  }

  const targetWidth = TANK_WIDTH * GRIME_OVERLAY_OVERSCAN;
  const targetHeight = TANK_HEIGHT * GRIME_OVERLAY_OVERSCAN;
  const scale = Math.max(targetWidth / image.width, targetHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  grimeBaseContext.save();
  grimeBaseContext.globalAlpha = clamp(alpha, 0, 1);
  grimeBaseContext.drawImage(
    image,
    (TANK_WIDTH - drawWidth) / 2,
    (TANK_HEIGHT - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  grimeBaseContext.restore();
}

function createCleaningSparkles() {
  const sparkleHues = [190, 204, 162, 48, 22, 320, 278];
  return Array.from({ length: 14 }, (_, index) => ({
    x: randomBetween(GLASS_MARGIN_X + 46, TANK_WIDTH - GLASS_MARGIN_X - 46),
    y: randomBetween(WATER_SURFACE_Y + 26, FLOOR_Y - 56),
    size: randomBetween(6, 15),
    delay: randomBetween(0, 0.68),
    twinkle: randomBetween(0.95, 2.1),
    hue: sparkleHues[index % sparkleHues.length] + randomBetween(-8, 8),
    rotation: randomBetween(0, Math.PI),
    glow: randomBetween(0.72, 1.22),
    diagonal: Math.random() < 0.82
  }));
}

function updateSplashBursts(now) {
  runtime.splashBursts = runtime.splashBursts.filter((burst) => now <= burst.endsAt);
}

function updateGlassTapEffects(now) {
  runtime.glassTapEffects = runtime.glassTapEffects.filter((effect) => now <= effect.endsAt);
}

function getActiveGlassTapStressEnds(fish, now = Date.now()) {
  return Array.isArray(fish?.glassTapStressEndsAt)
    ? fish.glassTapStressEndsAt
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > now)
      .sort((left, right) => left - right)
      .slice(0, GLASS_TAP_STRESS_MAX_STACKS)
    : [];
}

function getFishGlassTapStressPenalty(fish, now = Date.now()) {
  return getActiveGlassTapStressEnds(fish, now).length * GLASS_TAP_STRESS_PENALTY;
}

function hasTankGlassTapStressEventToday(tank, now = Date.now()) {
  if (!tank || !Array.isArray(tank.events)) {
    return false;
  }

  const dayStart = getLocalDayStartTimestamp(now);
  const dayEnd = dayStart + DAY_MS;
  return tank.events.some((event) => (
    event
    && event.type === "glass_tap_stress"
    && Number(event.time) >= dayStart
    && Number(event.time) < dayEnd
  ));
}

function recordGlassTapStressForFish(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return false;
  }

  if (
    !Number.isFinite(Number(fish.glassTapWindowStartedAt))
    || now - Number(fish.glassTapWindowStartedAt) > GLASS_TAP_STRESS_WINDOW_MS
  ) {
    fish.glassTapWindowStartedAt = now;
    fish.glassTapWindowCount = 0;
  }

  fish.glassTapWindowCount = Math.max(0, Math.floor(Number(fish.glassTapWindowCount) || 0)) + 1;
  if (fish.glassTapWindowCount % GLASS_TAP_STRESS_TAP_THRESHOLD !== 0) {
    return false;
  }

  const activeStressEnds = getActiveGlassTapStressEnds(fish, now);
  const nextStressEnds = [...activeStressEnds, now + GLASS_TAP_STRESS_DURATION_MS]
    .sort((left, right) => left - right)
    .slice(-GLASS_TAP_STRESS_MAX_STACKS);
  const changed = nextStressEnds.length !== activeStressEnds.length
    || nextStressEnds.some((value, index) => value !== activeStressEnds[index]);
  fish.glassTapStressEndsAt = nextStressEnds;

  const tank = getCurrentTank();
  if (tank && !hasTankGlassTapStressEventToday(tank, now)) {
    pushEvent(`${fish.name} was startled by repeated glass tapping.`, now, tank, {
      score: -1,
      type: "glass_tap_stress",
      fishId: fish.id
    });
  }

  return changed;
}

function spawnGlassTapEffect(point, now = Date.now()) {
  if (!point) {
    return;
  }

  const effect = {
    id: createId("glass-tap"),
    x: point.x,
    y: point.y,
    startedAt: now,
    endsAt: now + GLASS_TAP_EFFECT_DURATION_MS,
    angle: Math.random() * Math.PI * 2,
    tilt: randomBetween(-0.24, 0.24),
    shards: Array.from({ length: 7 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 7 + randomBetween(-0.32, 0.32),
      length: randomBetween(11, 30),
      start: randomBetween(5, 12),
      delay: randomBetween(0, 0.08)
    })),
    specks: Array.from({ length: 9 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: randomBetween(10, 38),
      radius: randomBetween(0.8, 2.1),
      delay: randomBetween(0, 0.1)
    }))
  };

  runtime.glassTapEffects.push(effect);
  if (runtime.glassTapEffects.length > GLASS_TAP_EFFECT_LIMIT) {
    runtime.glassTapEffects.splice(0, runtime.glassTapEffects.length - GLASS_TAP_EFFECT_LIMIT);
  }
  const stressChanged = scareNearbyFishFromGlassTap(point, now);
  if (stressChanged) {
    saveState();
    renderUi(now, { full: false });
  }
  playGlassTapSoundEffect();
}

function scareNearbyFishFromGlassTap(point, now = Date.now()) {
  if (!point || !Array.isArray(state?.fish) || !state.fish.length) {
    return false;
  }

  let stressChanged = false;
  for (const fish of state.fish) {
    if (
      !fish
      || isFishDead(fish)
      || fish.caveState
      || fish.entryStartedAt
      || runtime.fishDragState?.fishId === fish.id
    ) {
      continue;
    }

    const species = getSpeciesForFish(fish);
    if (!species) {
      continue;
    }

    const locomotionProfile = getFishLocomotionProfile(fish || species);
    const startleStrength = clamp(locomotionProfile.startleStrength, 0.55, 1.6);
    const startleRecoveryScale = clamp(locomotionProfile.startleRecoveryScale, 0.7, 1.5);
    const effectiveStartleRadius = GLASS_TAP_FISH_STARTLE_RADIUS_PX * clamp(0.82 + startleStrength * 0.18, 0.82, 1.12);
    const fishX = fish.xNorm * TANK_WIDTH;
    const fishY = fish.yNorm * TANK_HEIGHT;
    const dx = fishX - point.x;
    const dy = fishY - point.y;
    const distance = Math.hypot(dx, dy);
    if (distance > effectiveStartleRadius) {
      continue;
    }

    if (distance <= GLASS_TAP_STRESS_RADIUS_PX) {
      stressChanged = recordGlassTapStressForFish(fish, now) || stressChanged;
    }

    const fallbackAngle = Math.random() * Math.PI * 2;
    const nx = distance > 0.001 ? dx / distance : Math.cos(fallbackAngle);
    const ny = distance > 0.001 ? dy / distance : Math.sin(fallbackAngle);
    const proximity = 1 - clamp(distance / effectiveStartleRadius, 0, 1);
    const escapeDistance = randomBetween(
      GLASS_TAP_FISH_ESCAPE_MIN_DISTANCE_PX,
      GLASS_TAP_FISH_ESCAPE_MAX_DISTANCE_PX
    ) * (0.78 + proximity * 0.45) * clamp(0.72 + startleStrength * 0.28, 0.82, 1.18);
    const targetLayer = species.behavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish);
    const target = clampFishPlacement(
      (fishX + nx * escapeDistance) / TANK_WIDTH,
      (fishY + ny * escapeDistance * 0.72) / TANK_HEIGHT,
      species,
      {
        fish,
        layer: targetLayer
      }
    );

    if (fish.feedingPelletId) {
      const pellet = state.floatingPellets?.find((entry) => entry.id === fish.feedingPelletId);
      if (pellet?.targetFishId === fish.id) {
        pellet.targetFishId = "";
      }
    }

    clearFishSchoolFollowState(fish);
    clearFishCaveBehavior(fish);
    clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
    fish.activity = "roam";
    fish.feedingPelletId = null;
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    fish.blockedDecorId = null;
    fish.blockedDecorUntil = null;
    fish.wallAvoidUntil = now + randomBetween(420, 720) * startleRecoveryScale;
    fish.panicUntil = now
      + randomBetween(900, 1700)
      * (0.85 + proximity * 0.4)
      * startleRecoveryScale;
    fish.panicSpeedBoost = randomBetween(1.45, 2.2) * clamp(0.78 + startleStrength * 0.22, 0.86, 1.14);
    fish.targetXNorm = target.xNorm;
    fish.targetYNorm = target.yNorm;
    fish.targetAt = fish.panicUntil;
    setFishDesiredTankLayer(fish, targetLayer);

    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(
        species,
        randomBetween(Math.max(species.speedMin, species.speedMax * 0.72), species.speedMax)
      );
    }

    if (species.behavior === "sucker") {
      setSuckerFishAngle(fish, Math.atan2(target.yNorm - fish.yNorm, target.xNorm - fish.xNorm), now);
    } else if (Math.abs(target.xNorm - fish.xNorm) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
      setFishDirection(fish, target.xNorm >= fish.xNorm ? 1 : -1, species, now);
    }
  }

  return stressChanged;
}

function spawnFishReturnSplash(xNorm) {
  const x = clamp(xNorm * TANK_WIDTH, GLASS_MARGIN_X + 34, TANK_WIDTH - GLASS_MARGIN_X - 34);
  const startedAt = Date.now();
  runtime.splashBursts.push({
    id: createId("splash"),
    x,
    y: WATER_SURFACE_Y + 4,
    startedAt,
    endsAt: startedAt + 1250,
    droplets: Array.from({ length: 14 }, (_, index) => ({
      drift: randomBetween(-58, 58),
      lift: randomBetween(18, 64),
      size: randomBetween(2.4, 6.4),
      delay: index * 0.016 + randomBetween(0, 0.04),
      fall: randomBetween(12, 34)
    })),
    bubbles: Array.from({ length: 10 }, (_, index) => ({
      drift: randomBetween(-30, 30),
      rise: randomBetween(24, 82),
      radius: randomBetween(2.8, 7.4),
      delay: 0.06 + index * 0.024 + randomBetween(0, 0.05),
      wobble: randomBetween(1.2, 4.8)
    }))
  });
}

function updateCleaningTransition(now) {
  if (!runtime.cleaningTransition) {
    return;
  }

  if (now >= runtime.cleaningTransition.sparkleEndsAt) {
    runtime.cleaningTransition = null;
    clearScrubProgress();
    renderUi(now);
  }
}
