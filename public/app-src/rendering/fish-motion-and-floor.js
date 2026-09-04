// Source fragment: rendering/fish-motion-and-floor.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function randomSwimX() {
  if (isMobilePageRuntime()) {
    const bounds = getMobileViewportSwimBoundsNorm(null, null, Date.now(), {
      edgeInsetPx: MOBILE_SWIM_EDGE_INSET_PX * 2
    });
    return bounds.minX + Math.random() * Math.max(0, bounds.maxX - bounds.minX);
  }

  return 0.08 + Math.random() * 0.84;
}

function randomSwimY(layer = DEFAULT_TANK_LAYER, fish = null, species = getSpeciesForFish(fish), options = {}) {
  const range = getLayerSwimYRange(layer, fish, species, options);
  return range.min + Math.random() * Math.max(0, range.max - range.min);
}

function getFishFacingDirection(fish) {
  return Number(fish?.displayDirection) < 0 ? -1 : 1;
}

function normalizeAngle(angle) {
  let next = Number.isFinite(Number(angle)) ? Number(angle) : 0;
  while (next > Math.PI) {
    next -= Math.PI * 2;
  }
  while (next <= -Math.PI) {
    next += Math.PI * 2;
  }
  return next;
}

function getFishFacingAngle(fish) {
  return Number.isFinite(Number(fish?.displayAngle))
    ? normalizeAngle(Number(fish.displayAngle))
    : (getFishFacingDirection(fish) < 0 ? Math.PI : 0);
}

function getFishEntryProgress(fish, now = Date.now()) {
  if (
    !fish
    || !Number.isFinite(Number(fish.entryStartedAt))
    || Number(fish.entryDurationMs) <= 0
  ) {
    return null;
  }

  return clamp(
    (now - Number(fish.entryStartedAt)) / Math.max(1, Number(fish.entryDurationMs)),
    0,
    1
  );
}

function getFishEntryRightingProgress(entryProgress) {
  if (!Number.isFinite(entryProgress)) {
    return null;
  }

  return clamp(
    (entryProgress - FISH_ENTRY_SPLASH_PROGRESS)
    / Math.max(0.001, FISH_ENTRY_RIGHTING_END_PROGRESS - FISH_ENTRY_SPLASH_PROGRESS),
    0,
    1
  );
}

function getDirectedAngleDelta(fromAngle, toAngle, spinDirection = 1) {
  const start = normalizeAngle(fromAngle);
  const end = normalizeAngle(toAngle);
  const clockwiseDelta = (end - start + Math.PI * 2) % (Math.PI * 2);
  const counterClockwiseDelta = clockwiseDelta - Math.PI * 2;
  const shortestDelta = Math.abs(clockwiseDelta) <= Math.abs(counterClockwiseDelta)
    ? clockwiseDelta
    : counterClockwiseDelta;
  if (Math.abs(shortestDelta) <= Math.PI * 0.55) {
    return shortestDelta;
  }
  return spinDirection < 0 ? counterClockwiseDelta : clockwiseDelta;
}

function updateFishTurnState(fish, species, now) {
  if (species.behavior !== "sucker") {
    const liveDirection = Number(fish.direction) < 0 ? -1 : 1;
    if (!fish.turnStartedAt || fish.turnDurationMs <= 0) {
      fish.displayDirection = liveDirection;
      fish.displayAngle = liveDirection < 0 ? Math.PI : 0;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.turnFromDirection = fish.displayDirection;
      fish.turnToDirection = fish.displayDirection;
      fish.turnFromAngle = fish.displayAngle;
      fish.turnToAngle = fish.displayAngle;
      fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
      return;
    }

    const progress = clamp((now - fish.turnStartedAt) / fish.turnDurationMs, 0, 1);
    const fromDirection = Number(fish.turnFromDirection) < 0 ? -1 : 1;
    const toDirection = Number(fish.turnToDirection) < 0 ? -1 : 1;
    const visibleDirection = progress < 0.5 ? fromDirection : toDirection;
    fish.displayDirection = visibleDirection;
    fish.displayAngle = visibleDirection < 0 ? Math.PI : 0;

    if (progress >= 1) {
      fish.displayDirection = liveDirection;
      fish.displayAngle = liveDirection < 0 ? Math.PI : 0;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.turnFromDirection = fish.displayDirection;
      fish.turnToDirection = fish.displayDirection;
      fish.turnFromAngle = fish.displayAngle;
      fish.turnToAngle = fish.displayAngle;
      fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
    }
    return;
  }

  if (!fish.turnStartedAt || fish.turnDurationMs <= 0) {
    fish.displayAngle = getFishFacingAngle(fish);
    fish.displayDirection = Math.cos(fish.displayAngle) < 0 ? -1 : 1;
    return;
  }

  if (now >= fish.turnStartedAt + fish.turnDurationMs) {
    fish.displayAngle = Number.isFinite(Number(fish.turnToAngle))
      ? normalizeAngle(Number(fish.turnToAngle))
      : getFishFacingAngle(fish);
    fish.displayDirection = Math.cos(fish.displayAngle) < 0 ? -1 : 1;
    fish.turnStartedAt = null;
    fish.turnDurationMs = 0;
    fish.turnFromDirection = fish.displayDirection;
    fish.turnToDirection = fish.displayDirection;
    fish.turnFromAngle = fish.displayAngle;
    fish.turnToAngle = fish.displayAngle;
    fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
  }
}

function setSuckerFishAngle(fish, desiredAngle, now) {
  const nextAngle = normalizeAngle(desiredAngle);
  const currentAngle = getFishFacingAngle(fish);
  if (Math.abs(getDirectedAngleDelta(currentAngle, nextAngle, fish.turnSpinDirection || 1)) < 0.06) {
    fish.displayAngle = nextAngle;
    fish.displayDirection = Math.cos(nextAngle) < 0 ? -1 : 1;
    fish.direction = fish.displayDirection;
    return;
  }

  const pendingAngle = fish.turnStartedAt && fish.turnDurationMs > 0
    ? normalizeAngle(Number.isFinite(Number(fish.turnToAngle)) ? Number(fish.turnToAngle) : currentAngle)
    : currentAngle;
  if (Math.abs(getDirectedAngleDelta(pendingAngle, nextAngle, fish.turnSpinDirection || 1)) < 0.08) {
    return;
  }

  if (fish.turnStartedAt && fish.turnDurationMs > 0) {
    return;
  }

  const spinDirection = Math.random() < 0.5 ? -1 : 1;
  const turnDelta = getDirectedAngleDelta(currentAngle, nextAngle, spinDirection);
  fish.turnStartedAt = now;
  fish.turnDurationMs = 900 + Math.abs(turnDelta) * 620 + Math.random() * 420;
  fish.turnFromAngle = currentAngle;
  fish.turnToAngle = nextAngle;
  fish.turnSpinDirection = spinDirection;
  fish.turnFromDirection = Math.cos(currentAngle) < 0 ? -1 : 1;
  fish.turnToDirection = Math.cos(nextAngle) < 0 ? -1 : 1;
  fish.direction = fish.turnToDirection;
}

function setFishDirection(fish, desiredDirection, species, now) {
  const nextDirection = Number(desiredDirection) < 0 ? -1 : 1;
  if (getEffectiveFishBehavior(fish, species) !== "sucker") {
    const currentDisplayDirection = getFishFacingDirection(fish);
    const currentDisplayAngle = currentDisplayDirection < 0 ? Math.PI : 0;
    fish.direction = nextDirection;

    if (fish.turnStartedAt && fish.turnDurationMs > 0) {
      const pendingDirection = Number(fish.turnToDirection) < 0 ? -1 : 1;
      if (nextDirection === pendingDirection) {
        return;
      }

      if (nextDirection === currentDisplayDirection) {
        fish.displayDirection = nextDirection;
        fish.displayAngle = currentDisplayAngle;
        fish.turnStartedAt = null;
        fish.turnDurationMs = 0;
        fish.turnFromDirection = nextDirection;
        fish.turnToDirection = nextDirection;
        fish.turnFromAngle = currentDisplayAngle;
        fish.turnToAngle = currentDisplayAngle;
        fish.turnSpinDirection = nextDirection < 0 ? 1 : -1;
      }
      return;
    }

    if (nextDirection === currentDisplayDirection) {
      fish.displayDirection = nextDirection;
      fish.displayAngle = currentDisplayAngle;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.turnFromDirection = nextDirection;
      fish.turnToDirection = nextDirection;
      fish.turnFromAngle = currentDisplayAngle;
      fish.turnToAngle = currentDisplayAngle;
      fish.turnSpinDirection = nextDirection < 0 ? 1 : -1;
      return;
    }

    fish.displayDirection = currentDisplayDirection;
    fish.displayAngle = currentDisplayAngle;
    fish.turnStartedAt = now;
    fish.turnDurationMs = getFishTurnDurationMs(fish, species);
    fish.turnFromDirection = currentDisplayDirection;
    fish.turnToDirection = nextDirection;
    fish.turnFromAngle = currentDisplayAngle;
    fish.turnToAngle = nextDirection < 0 ? Math.PI : 0;
    fish.turnSpinDirection = Math.random() < 0.5 ? -1 : 1;
    return;
  }

  fish.direction = nextDirection;
  setSuckerFishAngle(fish, nextDirection < 0 ? Math.PI : 0, now);
}

function getActiveGravelContour() {
  if (runtime.scene?.gravelSurfaceContour?.length) {
    return runtime.scene.gravelSurfaceContour;
  }
  return runtime.scene?.substrateContour || [0, 0];
}

function getVisibleTankVirtualBounds() {
  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  const offsetX = Number(runtime.stageRenderOffsetX) || 0;
  const offsetY = Number(runtime.stageRenderOffsetY) || 0;
  const displayWidth = Math.max(1, dom.tankCanvas?.width || Math.round((dom.tankStage?.getBoundingClientRect?.().width || TANK_WIDTH) * dpr));
  const displayHeight = Math.max(1, dom.tankCanvas?.height || Math.round((dom.tankStage?.getBoundingClientRect?.().height || TANK_HEIGHT) * dpr));
  const left = clamp((-offsetX) / scale, 0, TANK_WIDTH);
  const top = clamp((-offsetY) / scale, 0, TANK_HEIGHT);
  const right = clamp((displayWidth - offsetX) / scale, left, TANK_WIDTH);
  const bottom = clamp((displayHeight - offsetY) / scale, top, TANK_HEIGHT);
  return {
    left,
    top,
    right,
    bottom
  };
}

function getSceneLayoutVisibleTankVirtualBounds() {
  if ((Number(runtime.stageEditViewAmount) || 0) > 0.001) {
    const normalView = getNormalCoverStageRenderMetrics();
    if (normalView?.visibleBounds) {
      return normalView.visibleBounds;
    }
  }
  return getVisibleTankVirtualBounds();
}

function normalizeViewportNormRange(min, max, fallbackCenter) {
  if (min <= max) {
    return {
      min,
      max
    };
  }

  const center = clamp(fallbackCenter, 0, 1);
  return {
    min: center,
    max: center
  };
}

function getMobileViewportSwimBoundsNorm(fish = null, species = getSpeciesForFish(fish), now = Date.now(), options = {}) {
  if (!isMobilePageRuntime()) {
    return {
      minX: 0.08,
      maxX: 0.92,
      minY: 0.14,
      maxY: 0.8
    };
  }

  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const imagePath = species
    ? (getFishDisplayAssetPath(fish, species, now) || species.asset)
    : null;
  const image = imagePath ? runtime.images.get(imagePath) : null;
  const width = species
    ? getFishDisplayWidth(fish || {
      speciesId: species.id,
      scale: species.defaultScale || DEFAULT_FISH_SCALE
    }, species, now)
    : 0;
  const height = image?.width && width
    ? width * (image.height / image.width)
    : width * 0.58;
  const edgeInsetPx = Number.isFinite(Number(options.edgeInsetPx))
    ? Math.max(0, Number(options.edgeInsetPx))
    : MOBILE_SWIM_EDGE_INSET_PX;
  const xInset = Math.max(edgeInsetPx, width * 0.5);
  const yInset = Math.max(edgeInsetPx, height * 0.5);
  const centerX = ((visibleBounds.left + visibleBounds.right) * 0.5) / TANK_WIDTH;
  const centerY = ((visibleBounds.top + visibleBounds.bottom) * 0.5) / TANK_HEIGHT;
  const xRange = normalizeViewportNormRange(
    clamp((visibleBounds.left + xInset) / TANK_WIDTH, 0, 1),
    clamp((visibleBounds.right - xInset) / TANK_WIDTH, 0, 1),
    centerX
  );
  const yRange = normalizeViewportNormRange(
    clamp((visibleBounds.top + yInset) / TANK_HEIGHT, 0, 1),
    clamp((visibleBounds.bottom - yInset) / TANK_HEIGHT, 0, 1),
    centerY
  );

  return {
    minX: xRange.min,
    maxX: xRange.max,
    minY: yRange.min,
    maxY: yRange.max
  };
}

function clampFishXNormToMobileViewport(xNorm, fish = null, species = getSpeciesForFish(fish), now = Date.now()) {
  const value = Number.isFinite(Number(xNorm)) ? Number(xNorm) : 0.5;
  if (!isMobilePageRuntime()) {
    return clamp(value, 0.08, 0.92);
  }

  const bounds = getMobileViewportSwimBoundsNorm(fish, species, now);
  return clamp(value, bounds.minX, bounds.maxX);
}

function clampFishToMobileViewport(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!isMobilePageRuntime() || !fish || !species) {
    return false;
  }

  const suckerBehaviorActive = getEffectiveFishBehavior(fish, species) === "sucker";
  const currentLayer = suckerBehaviorActive
    ? getSuckerFishGlassLayer(fish)
    : getFishTankLayer(fish);
  const targetLayer = suckerBehaviorActive
    ? getDesiredSuckerFishGlassLayer(fish)
    : getDesiredFishTankLayer(fish);
  const clampYNorm = (value, layer) => {
    if (fish.activity === FISH_GRAVEL_DIG_ACTIVITY) {
      const viewportBounds = getMobileViewportSwimBoundsNorm(fish, species, now);
      const minYNorm = Math.max(0.14, viewportBounds.minY);
      const maxYNorm = Math.max(minYNorm, Math.min(0.96, viewportBounds.maxY));
      return clamp(Number.isFinite(Number(value)) ? Number(value) : minYNorm, minYNorm, maxYNorm);
    }

    return clampFishYNormToLayer(value, fish, species, layer, {
      minYNorm: 0.14,
      maxYNorm: 0.8
    });
  };
  const xNorm = clampFishXNormToMobileViewport(fish.xNorm, fish, species, now);
  const yNorm = clampYNorm(fish.yNorm, currentLayer);
  const targetXNorm = clampFishXNormToMobileViewport(
    Number.isFinite(Number(fish.targetXNorm)) ? fish.targetXNorm : xNorm,
    fish,
    species,
    now
  );
  const targetYNorm = clampYNorm(
    Number.isFinite(Number(fish.targetYNorm)) ? fish.targetYNorm : yNorm,
    targetLayer
  );
  const changed = Math.abs(xNorm - fish.xNorm) > 0.000001
    || Math.abs(yNorm - fish.yNorm) > 0.000001
    || Math.abs(targetXNorm - fish.targetXNorm) > 0.000001
    || Math.abs(targetYNorm - fish.targetYNorm) > 0.000001;

  fish.xNorm = xNorm;
  fish.yNorm = yNorm;
  fish.targetXNorm = targetXNorm;
  fish.targetYNorm = targetYNorm;
  return changed;
}

function getTargetVisibleGravelHeightPx() {
  const stageRect = dom.tankStage?.getBoundingClientRect?.();
  const stageHeight = stageRect?.height || (dom.tankCanvas?.height ? dom.tankCanvas.height / getStageRenderDevicePixelRatio() : TANK_HEIGHT);
  return stageHeight * (isMobilePageRuntime() ? MOBILE_GRAVEL_VIEWPORT_HEIGHT_RATIO : GRAVEL_VIEWPORT_HEIGHT_RATIO);
}

function getTargetVisibleGravelHeightVirtual() {
  const targetHeightPx = getTargetVisibleGravelHeightPx();
  const editAmount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  if (editAmount <= 0.001) {
    return getViewportPxAsTankVirtual(targetHeightPx);
  }

  // Edit mode is a camera pullback, not a re-layout. Preserve the gravel's
  // normal-view world height and let the stage transform shrink it together
  // with every other object in the aquarium.
  const dpr = getStageRenderDevicePixelRatio();
  const normalScale = Math.max(
    0.0001,
    Number(getNormalCoverStageRenderMetrics()?.scale) || Number(runtime.stageRenderScale) || dpr
  );
  return (targetHeightPx * dpr) / normalScale;
}

function getVisibleTankFloorBottomY() {
  return getSceneLayoutVisibleTankVirtualBounds().bottom;
}

function getDynamicGravelSurfaceBaseY() {
  return Math.max(
    WATER_SURFACE_Y + 28,
    getVisibleTankFloorBottomY() - getTargetVisibleGravelHeightVirtual()
  );
}

function getGravelFloorLayoutKey() {
  return [
    WATER_SURFACE_Y.toFixed(2),
    getVisibleTankFloorBottomY().toFixed(2),
    getTargetVisibleGravelHeightVirtual().toFixed(2)
  ].join(":");
}

function getGravelSurfacePointY(point) {
  return getDynamicGravelSurfaceBaseY() + point * 11;
}

function traceTankFloorPath(context = tankContext, ridge = getActiveGravelContour()) {
  context.beginPath();
  context.moveTo(GLASS_MARGIN_X, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);
  context.lineTo(GLASS_MARGIN_X, getGravelSurfacePointY(ridge[0]));
  ridge.forEach((point, index) => {
    const x = GLASS_MARGIN_X + (index / (ridge.length - 1)) * (TANK_WIDTH - GLASS_MARGIN_X * 2);
    const y = getGravelSurfacePointY(point);
    context.lineTo(x, y);
  });
  context.lineTo(TANK_WIDTH - GLASS_MARGIN_X, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);
  context.closePath();
}

function traceTankFloorSurfaceBandPath(context = tankContext, ridge = getActiveGravelContour(), bandDepthPx = GRAVEL_SURFACE_CAP_DEPTH_PX + 7) {
  const points = ridge.map((point, index) => ({
    x: GLASS_MARGIN_X + (index / (ridge.length - 1)) * (TANK_WIDTH - GLASS_MARGIN_X * 2),
    y: getGravelSurfacePointY(point)
  }));

  context.beginPath();
  context.moveTo(points[0].x, points[0].y - 2);
  points.forEach((point) => {
    context.lineTo(point.x, point.y - 2);
  });
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    context.lineTo(point.x, point.y + bandDepthPx);
  }
  context.closePath();
}

function getTankFloorSurfaceYAtX(x) {
  const ridge = getActiveGravelContour();
  const width = TANK_WIDTH - GLASS_MARGIN_X * 2;
  const normalized = clamp((x - GLASS_MARGIN_X) / width, 0, 1) * (ridge.length - 1);
  const leftIndex = Math.floor(normalized);
  const rightIndex = Math.min(ridge.length - 1, leftIndex + 1);
  const blend = normalized - leftIndex;
  const heightPoint = ridge[leftIndex] * (1 - blend) + ridge[rightIndex] * blend;
  return getGravelSurfacePointY(heightPoint);
}

function buildGravelSurfaceContour(seed = 1) {
  const rand = mulberry32((Math.abs(Math.floor(seed || 1)) || 1) ^ 0x3c6ef35f);
  const contour = Array.from({ length: SUBSTRATE_CONTOUR_POINTS }, (_, index) => {
    const t = index / Math.max(1, SUBSTRATE_CONTOUR_POINTS - 1);
    const longWave = Math.sin(t * Math.PI * (1.12 + rand() * 0.26) + rand() * Math.PI * 2) * 0.3;
    const midWave = Math.sin(t * Math.PI * (2.45 + rand() * 0.9) + rand() * Math.PI * 2) * 0.11;
    const ripple = Math.sin(t * Math.PI * (5.4 + rand() * 1.1) + rand() * Math.PI * 2) * 0.035;
    return longWave + midWave + ripple + (rand() - 0.5) * 0.05;
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 1; index < contour.length - 1; index += 1) {
      contour[index] = contour[index - 1] * 0.24 + contour[index] * 0.52 + contour[index + 1] * 0.24;
    }
  }

  contour[0] *= 0.3;
  contour[contour.length - 1] *= 0.3;
  return contour.map((value) => clamp(value, -0.42, 0.42));
}
