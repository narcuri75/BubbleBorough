// Source fragment: fish/meals-and-needs.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getTankDirtiness(now) {
  const cleanDirtiness = getBaseTankDirtiness(now);
  if (!runtime.cleaningTransition) {
    return cleanDirtiness;
  }

  const progress = clamp((now - runtime.cleaningTransition.startedAt) / CLEAN_FADE_MS, 0, 1);
  const eased = 1 - (1 - progress) * (1 - progress);
  return clamp(
    runtime.cleaningTransition.fromDirtiness + (cleanDirtiness - runtime.cleaningTransition.fromDirtiness) * eased,
    0,
    1
  );
}

function getBaseTankDirtiness(now) {
  if (isTutorialTankDirtinessLocked()) {
    return 0;
  }
  return clamp((now - state.lastCleanedAt) / getFilterMaxDirtyDurationMs(), 0, 1);
}

function getFilterProfile(filterKey = state?.selectedFilterAsset) {
  const currentTank = getCurrentTank();
  if (!tankSupportsFilters(currentTank)) {
    return {
      cleanDays: Math.max(1.2, Number(getTankTypeMeta(currentTank?.tankTypeId).baseCleanDays) || FILTERLESS_BASE_TANK_DIRTY_DAYS),
      comfortBoost: 0,
      cost: 0,
      flow: 0.9,
      purchasable: false,
      tier: -1
    };
  }

  const fallbackFilterKey = getDefaultFilterKey();
  const filter = runtime.filterMap.get(filterKey || fallbackFilterKey) || runtime.filterMap.get(fallbackFilterKey) || {};
  return {
    cleanDays: Math.max(BASE_TANK_DIRTY_DAYS, Number(filter.cleanDays) || BASE_TANK_DIRTY_DAYS),
    comfortBoost: clamp(Number(filter.comfortBoost) || 0, 0, 0.25),
    cost: Math.max(0, Math.floor(Number(filter.cost) || 0)),
    flow: clamp(Number(filter.flow) || 1, 0.8, 1.3),
    purchasable: Boolean(filter.purchasable),
    tier: Math.max(0, Math.floor(Number(filter.tier) || 0))
  };
}

function normalizeFishSpeed(species, explicitValue) {
  if (Number.isFinite(explicitValue)) {
    return clamp(explicitValue, species.speedMin, species.speedMax);
  }

  if (species.speedMode === "dynamic") {
    return clamp(species.speedMin + Math.random() * (species.speedMax - species.speedMin), species.speedMin, species.speedMax);
  }

  return species.speedMin;
}

function getFishTurnDurationMs(fish, species) {
  if (!fish || !species) {
    return FISH_TURN_MIN_MS + Math.random() * (FISH_TURN_MAX_MS - FISH_TURN_MIN_MS);
  }

  const speedMin = Math.max(0.00001, Number(species.speedMin) || 0.00001);
  const speedMax = Math.max(speedMin, Number(species.speedMax) || speedMin);
  const currentSpeed = normalizeFishSpeed(species, Number(fish.swimSpeed));
  const speedBlend = speedMax <= speedMin
    ? 0.5
    : clamp((currentSpeed - speedMin) / Math.max(0.00001, speedMax - speedMin), 0, 1);
  const slowBias = 1 - speedBlend;
  const minMs = FISH_TURN_MIN_MS + slowBias * 55;
  const maxMs = FISH_TURN_MAX_MS + slowBias * 130;
  return minMs + Math.random() * Math.max(1, maxMs - minMs);
}

function formatSwimStyle(swimStyle) {
  switch (swimStyle) {
    case "peaceful":
      return "peaceful and slow";
    case "sporadic":
      return "sporadic and quick";
    default:
      return "steady";
  }
}

function getCurrentMealSlot(timestamp) {
  const date = new Date(timestamp);
  const morning = date.getHours() < 12;
  const start = new Date(date);
  start.setHours(morning ? 0 : 12, 0, 0, 0);
  return buildMealSlot(start);
}

function getTodaysMealSlots(timestamp) {
  const date = new Date(timestamp);
  const morning = new Date(date);
  morning.setHours(0, 0, 0, 0);
  const evening = new Date(date);
  evening.setHours(12, 0, 0, 0);
  return [buildMealSlot(morning), buildMealSlot(evening)];
}

function buildMealSlot(startDate) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setHours(end.getHours() + 12, 0, 0, 0);
  const part = start.getHours() < 12 ? "Morning" : "Evening";
  return {
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}-${part.toLowerCase()}`,
    label: part,
    start: start.getTime(),
    end: end.getTime()
  };
}

function getCompletedMealSlots(startTs, endTs) {
  const slots = [];
  let boundary = getNextMealBoundary(startTs);
  while (boundary.getTime() <= endTs) {
    const slotStart = new Date(boundary);
    slotStart.setHours(slotStart.getHours() - 12, 0, 0, 0);
    slots.push(buildMealSlot(slotStart));
    boundary = new Date(boundary);
    boundary.setHours(boundary.getHours() + 12, 0, 0, 0);
  }
  return slots;
}

function getNextMealBoundary(timestamp) {
  const date = new Date(timestamp);
  const boundary = new Date(date);

  if (date.getHours() < 12 || (date.getHours() === 12 && (date.getMinutes() > 0 || date.getSeconds() > 0 || date.getMilliseconds() > 0))) {
    boundary.setHours(12, 0, 0, 0);
    if (boundary.getTime() <= timestamp) {
      boundary.setDate(boundary.getDate() + 1);
      boundary.setHours(0, 0, 0, 0);
    }
  } else {
    boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(0, 0, 0, 0);
  }

  return boundary;
}

function getTankPoint(event, options = {}) {
  const rect = dom.tankStage.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  runtime.pointerStagePx = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  const offsetX = Number(runtime.stageRenderOffsetX) || 0;
  const offsetY = Number(runtime.stageRenderOffsetY) || 0;
  const canvasX = (event.clientX - rect.left) * dpr;
  const canvasY = (event.clientY - rect.top) * dpr;
  const rawPoint = {
    x: (canvasX - offsetX) / scale,
    y: (canvasY - offsetY) / scale
  };
  if (options.variant === "glass") {
    if (
      rawPoint.x < 0
      || rawPoint.x > TANK_WIDTH
      || rawPoint.y < 0
      || rawPoint.y > TANK_HEIGHT
    ) {
      return null;
    }

    const constrainedGlassPoint = constrainPointToTankShell(rawPoint.x, rawPoint.y, { variant: "outer" });
    return {
      x: constrainedGlassPoint.x,
      y: constrainedGlassPoint.y
    };
  }

  const constrainedPoint = constrainPointToTankShell(rawPoint.x, rawPoint.y, { variant: "inner" });
  const dragging = Boolean(runtime.dragState || runtime.decorResizeState || runtime.fishDragState || runtime.eggDragState || runtime.pebbleDragState);
  if (!constrainedPoint.inside && !dragging) {
    return null;
  }
  return {
    x: constrainedPoint.x,
    y: constrainedPoint.y
  };
}

function getPelletPose(pellet, now) {
  updatePelletSettledState(pellet, now);
  const hasCustomDropStart = Number.isFinite(Number(pellet?.dropStartXNorm))
    && Number.isFinite(Number(pellet?.dropStartYNorm));
  const dropDurationMs = hasCustomDropStart
    ? clamp(Number(pellet.dropDurationMs) || AUTO_DISPENSER_DROP_DURATION_MS, 120, 3000)
    : 900;
  const dropProgress = clamp((now - pellet.createdAt) / dropDurationMs, 0, 1);
  const easedDrop = 1 - (1 - dropProgress) * (1 - dropProgress);
  const stableScale = getViewportStableAssetScale();
  const floorYNorm = clamp(
    Number.isFinite(Number(pellet.floorYNorm))
      ? Number(pellet.floorYNorm)
      : getPelletFloorYNormAtX(pellet.xNorm),
    0.18,
    0.96
  );
  if (pellet.settled) {
    return {
      xNorm: clamp(Number(pellet.xNorm) || 0.5, 0.08, 0.92),
      yNorm: getPelletFloorYNormAtX(pellet.xNorm)
    };
  }
  const floatingXNorm = clamp(
    pellet.xNorm + (Math.sin(now / 780 + pellet.sway * Math.PI * 2) * 5.5 * stableScale) / TANK_WIDTH,
    0.08,
    0.92
  );
  const startYNorm = clamp(
    Number.isFinite(Number(pellet.startYNorm)) ? Number(pellet.startYNorm) : Number(pellet.yNorm) || WATER_SURFACE_Y / TANK_HEIGHT + 0.08,
    0.09,
    floorYNorm
  );
  const sinkDuration = Math.max(1000, Number(pellet.sinkDurationMs) || FOOD_PELLET_SINK_DURATION_MS);
  const sinkProgress = clamp((now - pellet.createdAt) / sinkDuration, 0, 1);
  const easedSink = sinkProgress;
  const bobY = Math.sin(now / 980 + pellet.sway * 12) * 1.2 * stableScale / TANK_HEIGHT;
  const floatingY = clamp(startYNorm + (floorYNorm - startYNorm) * easedSink + bobY, 0.09, floorYNorm);
  if (hasCustomDropStart) {
    const startXNorm = clamp(Number(pellet.dropStartXNorm), 0.08, 0.92);
    const dropStartYNorm = clamp(Number(pellet.dropStartYNorm), 0.02, AUTO_DISPENSER_PELLET_MAX_Y_NORM);
    return {
      xNorm: clamp(startXNorm + (floatingXNorm - startXNorm) * easedDrop, 0.08, 0.92),
      yNorm: clamp(
        dropStartYNorm + (floatingY - dropStartYNorm) * easedDrop,
        0.02,
        floorYNorm
      )
    };
  }
  return {
    xNorm: floatingXNorm,
    yNorm: floatingY
  };
}

function getPelletHitBounds(pellet, now = Date.now()) {
  if (!pellet) {
    return null;
  }

  const pose = getPelletPose(pellet, now);
  const x = pose.xNorm * TANK_WIDTH;
  const y = pose.yNorm * TANK_HEIGHT;
  const stableScale = getViewportStableAssetScale();
  const scale = clamp(Number(pellet.scale) || 1, 0.75, 1.4) * stableScale;
  const appearance = getFoodDropAppearance(pellet.foodKey, pellet);
  if (appearance.dropStyle === "sprite") {
    const image = appearance.spritePath ? runtime.images.get(appearance.spritePath) : null;
    const fitScale = image
      ? Math.min((24 * scale) / Math.max(1, image.width), (24 * scale) / Math.max(1, image.height))
      : 1;
    const width = image ? Math.max(10 * stableScale, image.width * fitScale) : 18 * scale;
    const height = image ? Math.max(10 * stableScale, image.height * fitScale) : 14 * scale;
    return {
      pellet,
      x,
      y,
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      bottom: y + height / 2
    };
  }

  const width = 11.6 * scale;
  const height = 6.6 * scale;
  return {
    pellet,
    x,
    y,
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2
  };
}

function rgbaString({ r, g, b }, alpha = 1) {
  return `rgba(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function getBubbleOrbPalette(color = DEFAULT_BUBBLER_BUBBLE_COLOR, options = {}) {
  const normalizedColor = normalizeHexColor(color) || DEFAULT_BUBBLER_BUBBLE_COLOR;
  const baseRgb = hexToRgb(normalizedColor) || hexToRgb(DEFAULT_BUBBLER_BUBBLE_COLOR);
  const colorize = normalizeDecorColorizeSetting(options.colorize);
  const fillOpacity = clamp(
    Number.isFinite(Number(options.fillOpacity)) ? Number(options.fillOpacity) : DEFAULT_BUBBLER_FILL_OPACITY,
    0,
    1
  );
  const fillColor = colorize ? mixColors(normalizedColor, "#FFFFFF", 0.04) : mixColors(normalizedColor, "#FFFFFF", 0.18);
  const fillRgb = hexToRgb(fillColor) || baseRgb;
  const strokeRgb = hexToRgb(mixColors(normalizedColor, "#FFFFFF", colorize ? 0.12 : 0.34)) || baseRgb;
  const highlightRgb = hexToRgb(mixColors(normalizedColor, "#FFF8EE", colorize ? 0.34 : 0.58)) || strokeRgb;
  const glowRgb = hexToRgb(mixColors(normalizedColor, "#000000", colorize ? 0.02 : 0.08)) || baseRgb;
  return {
    tint: rgbaString(baseRgb, 0.98),
    glow: rgbaString(glowRgb, colorize ? 0.2 : 0.16),
    fill: rgbaString(fillRgb, colorize ? clamp(fillOpacity + 0.08, 0, 1) : fillOpacity),
    stroke: rgbaString(strokeRgb, colorize ? 0.92 : 0.86),
    highlight: rgbaString(highlightRgb, colorize ? 0.28 : 0.34)
  };
}

function getOptionalBubbleOrbSprite() {
  return runtime.images.get(resolveAppUrl(OPTIONAL_BUBBLE_ORB_ASSET_PATH)) || null;
}

function getTintedBubbleOrbSprite(palette) {
  const sprite = getOptionalBubbleOrbSprite();
  if (!sprite?.width || !sprite?.height) {
    return null;
  }

  const cacheKey = [
    palette?.tint || "",
    palette?.stroke || "",
    palette?.highlight || ""
  ].join("|");
  const cached = runtime.bubbleOrbTintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sprite, 0, 0, canvas.width, canvas.height);

  const tintColor = palette?.tint || palette?.stroke || palette?.fill || null;
  if (tintColor) {
    context.save();
    context.globalCompositeOperation = "source-in";
    context.fillStyle = tintColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  if (palette?.stroke) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.18;
    context.fillStyle = palette.stroke;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  // Bring back a small amount of the source sprite so the result still reads as glass.
  context.save();
  context.globalCompositeOperation = "screen";
  context.globalAlpha = 0.1;
  context.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  context.restore();

  if (palette?.highlight) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.12;
    context.fillStyle = palette.highlight;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  // Re-apply the source sprite alpha so tint passes cannot leak into the transparent bounds.
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  context.restore();

  runtime.bubbleOrbTintCache.set(cacheKey, canvas);
  return canvas;
}

function drawBubbleOrbInteriorFillToContext(context, x, y, radius, stretch, fillStyle, insetScale = 1) {
  if (!fillStyle) {
    return;
  }

  const innerRadius = Math.max(0, radius * insetScale);
  if (innerRadius <= 0) {
    return;
  }

  context.beginPath();
  context.ellipse(x, y, innerRadius * stretch, innerRadius, 0, 0, Math.PI * 2);
  context.fillStyle = fillStyle;
  context.fill();
}

function drawMalformedBubbleSpriteToContext(context, sprite, x, y, drawWidth, drawHeight, options = {}) {
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 1;
  const rand = mulberry32(seed >>> 0);
  const amount = clamp(
    Number.isFinite(Number(options.amount)) ? Number(options.amount) : randomBetweenWith(rand, 0.035, 0.11),
    0,
    0.32
  );
  if (amount <= 0.001) {
    return false;
  }

  const deformationSpeed = clamp(
    Number.isFinite(Number(options.speed)) ? Number(options.speed) : DEFAULT_BUBBLER_MALFORMED_SPEED,
    MIN_BUBBLER_MALFORMED_SPEED,
    MAX_BUBBLER_MALFORMED_SPEED
  );
  const turbulence = clamp((deformationSpeed - 0.8) / (MAX_BUBBLER_MALFORMED_SPEED - 0.8), 0, 1);
  const pointCount = turbulence > 0.5 ? 30 : 24;
  const phase = Number.isFinite(Number(options.phase)) ? Number(options.phase) : randomBetweenWith(rand, 0, Math.PI * 2);
  const rotation = Number.isFinite(Number(options.rotation))
    ? Number(options.rotation)
    : randomBetweenWith(rand, -0.12, 0.12);
  const palette = options.palette || {};
  const stableScale = clamp(Number(options.stableScale) || getViewportStableAssetScale(), 0.25, 6);
  const phaseA = randomBetweenWith(rand, 0, Math.PI * 2);
  const phaseB = randomBetweenWith(rand, 0, Math.PI * 2);
  const phaseC = randomBetweenWith(rand, 0, Math.PI * 2);
  const pinchAngle = randomBetweenWith(rand, 0, Math.PI * 2) + Math.sin(phase * 0.7 + phaseA) * (0.18 + turbulence * 0.48);
  const pinchStrength = randomBetweenWith(rand, 0.18, 0.55) * amount;
  const skew = (randomBetweenWith(rand, -0.12, 0.12) + Math.sin(phase * 0.9 + phaseB) * 0.22 * turbulence) * amount;
  const widthScale = randomBetweenWith(rand, 0.92, 1.12) + Math.sin(phase * 0.62 + phaseA) * amount * 0.32;
  const heightScale = randomBetweenWith(rand, 0.9, 1.1) + Math.cos(phase * 0.58 + phaseB) * amount * 0.28;
  const halfWidth = drawWidth * 0.5 * widthScale;
  const halfHeight = drawHeight * 0.5 * heightScale;
  const angleDistance = (left, right) => Math.atan2(Math.sin(left - right), Math.cos(left - right));
  const points = [];

  for (let index = 0; index < pointCount; index += 1) {
    const theta = (index / pointCount) * Math.PI * 2;
    const pinch = Math.exp(-Math.pow(angleDistance(theta, pinchAngle) / 0.72, 2)) * pinchStrength;
    const wobble = 1
      + Math.sin(theta * 2 + phase + phaseA) * amount * 0.45
      + Math.sin(theta * 3 - phase * 1.15 + phaseB) * amount * 0.32
      + Math.sin(theta * 5 + phase * 1.7 + phaseC) * amount * (0.12 + turbulence * 0.18)
      + Math.sin(theta * 8 - phase * 2.8 + phaseA * 0.4) * amount * turbulence * 0.16
      - pinch;
    points.push({
      x: Math.cos(theta) * halfWidth * wobble + Math.sin(theta) * halfWidth * skew,
      y: Math.sin(theta) * halfHeight * (1 + (wobble - 1) * 0.72)
    });
  }

  const tracePath = () => {
    const first = points[0];
    const last = points[points.length - 1];
    context.beginPath();
    context.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    context.closePath();
  };

  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  tracePath();
  if (palette.fill) {
    context.fillStyle = palette.fill;
    context.fill();
  }

  tracePath();
  context.lineWidth = Math.max(0.8 * stableScale, Math.min(drawWidth, drawHeight) * 0.052);
  context.strokeStyle = palette.stroke || "rgba(240, 250, 255, 0.7)";
  context.stroke();
  context.save();
  tracePath();
  context.clip();
  context.globalCompositeOperation = "screen";
  context.globalAlpha = 0.18 + turbulence * 0.1;
  context.strokeStyle = palette.highlight || "rgba(250, 253, 255, 0.4)";
  context.lineWidth = Math.max(0.45 * stableScale, Math.min(drawWidth, drawHeight) * 0.022);
  context.beginPath();
  context.arc(-halfWidth * 0.16, -halfHeight * 0.1, Math.max(1, Math.min(halfWidth, halfHeight) * 0.62), Math.PI * 1.08, Math.PI * 1.78);
  context.stroke();
  context.restore();
  if (palette.highlight) {
    context.save();
    tracePath();
    context.clip();
    context.globalCompositeOperation = "screen";
    context.fillStyle = palette.highlight;
    context.beginPath();
    context.ellipse(-halfWidth * 0.25, -halfHeight * 0.34, halfWidth * 0.16, halfHeight * 0.08, -0.35, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
  return true;
}

function drawBubbleOrbToContext(context, x, y, radius, alpha, stretch = 1, palette = null, stableScale = getViewportStableAssetScale(), options = {}) {
  const drawRadius = radius * stableScale;
  const resolvedPalette = palette || {
    tint: "rgba(255, 255, 255, 0.98)",
    glow: "rgba(220, 240, 255, 0.080)",
    fill: "rgba(255, 255, 255, 0.16)",
    stroke: "rgba(240, 250, 255, 0.700)",
    highlight: "rgba(250, 253, 255, 0.400)"
  };
  const bubbleGlowEnabled = !isUvLightActive() || UV_LIGHT_BUBBLE_GLOW_ENABLED;
  const bubbleSprite = getTintedBubbleOrbSprite(resolvedPalette);
  context.save();
  context.globalAlpha = alpha;
  if (!bubbleSprite && bubbleGlowEnabled && resolvedPalette.glow) {
    context.beginPath();
    context.ellipse(x, y, drawRadius * stretch * 1.45, drawRadius * 1.45, 0, 0, Math.PI * 2);
    context.fillStyle = resolvedPalette.glow;
    context.fill();
  }
  if (bubbleSprite) {
    const drawWidth = Math.max(2 * stableScale, drawRadius * stretch * 2.3);
    const drawHeight = Math.max(2 * stableScale, drawRadius * 2.3);
    if (options.malform && drawMalformedBubbleSpriteToContext(context, bubbleSprite, x, y, drawWidth, drawHeight, {
      ...options.malform,
      palette: resolvedPalette,
      stableScale,
      speed: options.malform.speed
    })) {
      context.restore();
      return;
    }
    drawBubbleOrbInteriorFillToContext(context, x, y, drawRadius, stretch, resolvedPalette.fill, 0.82);
    {
      context.drawImage(bubbleSprite, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    }
    context.restore();
    return;
  }
  context.beginPath();
  context.ellipse(x, y, drawRadius * stretch, drawRadius, 0, 0, Math.PI * 2);
  drawBubbleOrbInteriorFillToContext(context, x, y, drawRadius, stretch, resolvedPalette.fill);
  context.lineWidth = Math.max(stableScale, drawRadius * 0.18);
  context.strokeStyle = resolvedPalette.stroke;
  context.stroke();
  context.fillStyle = resolvedPalette.highlight;
  context.beginPath();
  context.ellipse(x - drawRadius * 0.3, y - drawRadius * 0.32, drawRadius * 0.2, drawRadius * 0.16, -0.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBubbleOrb(x, y, radius, alpha, stretch = 1, palette = null) {
  drawBubbleOrbToContext(tankContext, x, y, radius, alpha, stretch, palette);
}

function drawBubblePopBurstToContext(context, x, y, radius, alpha, palette, stableScale, seed, popProgress, options = {}) {
  const progress = clamp(Number(popProgress) || 0, 0, 1);
  if (progress <= 0 || alpha <= 0.008 || radius <= 0) {
    return;
  }

  const count = Math.max(1, Math.floor(Number(options.count) || BUBBLER_POP_MICRO_BUBBLE_COUNT));
  const burstEase = 1 - Math.pow(1 - progress, 3);
  const baseSeed = Number.isFinite(Number(seed)) ? Number(seed) : 1;
  const burstScale = Number.isFinite(Number(options.burstScale)) ? Number(options.burstScale) : 1;
  const surfaceY = Number.isFinite(Number(options.surfaceY)) ? Number(options.surfaceY) : null;
  for (let microIndex = 0; microIndex < count; microIndex += 1) {
    const microRand = mulberry32((baseSeed ^ (0x68bc21eb + microIndex * 0x45d9f3b)) >>> 0);
    const angle = (microIndex / count) * Math.PI * 2 + randomBetweenWith(microRand, -0.34, 0.34);
    const burstDistance = randomBetweenWith(microRand, 4.5, 14) * stableScale * Math.max(0.28, burstEase) * burstScale;
    const microAlpha = clamp(
      alpha * Math.pow(1 - progress, 1.25) * randomBetweenWith(microRand, 0.5, 0.95),
      0,
      1
    );
    if (microAlpha <= 0.008) {
      continue;
    }

    const microRadius = clamp(radius * randomBetweenWith(microRand, 0.13, 0.26) * (1 - progress * 0.42), 0.22, 2.4);
    const microX = x + Math.cos(angle) * burstDistance;
    const rawMicroY = y + Math.sin(angle) * burstDistance - burstEase * randomBetweenWith(microRand, 1, 5) * stableScale;
    const microY = surfaceY === null
      ? rawMicroY
      : Math.max(rawMicroY, surfaceY + microRadius * stableScale);

    drawBubbleOrbToContext(
      context,
      microX,
      microY,
      microRadius,
      microAlpha,
      randomBetweenWith(microRand, 0.88, 1.14),
      palette,
      stableScale
    );
  }
}

function getBubblerSpoutSourceOffsetRatio(imagePath, spout) {
  const cacheKey = `${imagePath}|${spout.horizontalLocation ?? ""}|${spout.horizontalOffsetPx ?? ""}`;
  const cached = runtime.bubblerSpoutOriginCache.get(cacheKey);
  if (Number.isFinite(cached)) {
    return cached;
  }

  const mask = getImageAlphaMask(imagePath);
  if (!mask?.width || !mask?.height) {
    runtime.bubblerSpoutOriginCache.set(cacheKey, 0.18);
    return 0.18;
  }

  const sampleX = Number.isFinite(spout.horizontalOffsetPx)
    ? clamp(Math.round(spout.horizontalOffsetPx), 0, mask.width - 1)
    : clamp(Math.round((spout.horizontalLocation ?? 0.5) * (mask.width - 1)), 0, mask.width - 1);
  let offsetRatio = 0.18;

  for (let y = 0; y < mask.height; y += 1) {
    const alpha = mask.alpha[(y * mask.width + sampleX) * 4 + 3];
    if (alpha >= ALPHA_HIT_THRESHOLD) {
      offsetRatio = clamp((y + 1) / mask.height, 0.02, 0.95);
      break;
    }
  }

  runtime.bubblerSpoutOriginCache.set(cacheKey, offsetRatio);
  return offsetRatio;
}

function getBubblerSpoutHorizontalLocation(spout, image = null) {
  const imageWidth = Math.max(1, Number(image?.width) || 0);
  return Number.isFinite(Number(spout?.horizontalLocation))
    ? clamp(Number(spout.horizontalLocation), 0, 1)
    : Number.isFinite(Number(spout?.horizontalOffsetPx)) && imageWidth > 0
      ? clamp(Number(spout.horizontalOffsetPx) / imageWidth, 0, 1)
      : 0.5;
}

function getBubblerDirectionVector(direction) {
  switch (normalizeBubblerDirection(direction)) {
    case "left":
      return { x: -1, y: -0.08 };
    case "right":
      return { x: 1, y: -0.08 };
    case "down":
      return { x: 0, y: 1 };
    case "up":
    default:
      return { x: 0, y: -1 };
  }
}

function drawDecorBubblerEffectToContext(context, item, decor, image, now = Date.now(), options = {}) {
  const bubbler = getPlacedDecorBubblerMeta(item, decor);
  if (!item || !decor || !image || !bubbler?.spouts?.length) {
    return;
  }

  const alphaScale = clamp(Number.isFinite(Number(options.alphaScale)) ? Number(options.alphaScale) : 1, 0, 1);
  const stableScale = clamp(Number.isFinite(Number(options.stableScale)) ? Number(options.stableScale) : getViewportStableAssetScale(), 0.25, 6);
  const width = Number.isFinite(Number(options.width)) ? Number(options.width) : getDecorDisplayWidth(decor, item);
  const height = Number.isFinite(Number(options.height)) ? Number(options.height) : width * (image.height / image.width);
  const drawX = Number.isFinite(Number(options.drawX)) ? Number(options.drawX) : (item.xNorm * TANK_WIDTH - width / 2);
  const drawY = Number.isFinite(Number(options.drawY)) ? Number(options.drawY) : (item.yNorm * TANK_HEIGHT - height);
  const waterSurfaceY = Number.isFinite(Number(options.waterSurfaceY)) ? Number(options.waterSurfaceY) : WATER_SURFACE_Y;

  bubbler.spouts.forEach((spout, spoutIndex) => {
    const spoutBubbleColors = Array.isArray(spout.bubbleColors) && spout.bubbleColors.length
      ? spout.bubbleColors
      : [spout.bubbleColor || DEFAULT_BUBBLER_BUBBLE_COLOR];
    const intensity = clamp(Number(spout.intensity) || DEFAULT_BUBBLER_INTENSITY, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY);
    const bubbleOpacity = clamp(Number(spout.bubbleOpacity) || DEFAULT_BUBBLER_BUBBLE_OPACITY, MIN_CUSTOM_BUBBLER_OPACITY, MAX_CUSTOM_BUBBLER_OPACITY);
    const bubbleSize = clamp(Number(spout.bubbleSize) || DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE, MIN_CUSTOM_BUBBLER_BUBBLE_SIZE, MAX_CUSTOM_BUBBLER_BUBBLE_SIZE);
    const bubbleFillOpacity = clamp(Number.isFinite(Number(spout.bubbleFillOpacity)) ? Number(spout.bubbleFillOpacity) : DEFAULT_BUBBLER_FILL_OPACITY, 0, 1);
    const bubbleColorize = normalizeDecorColorizeSetting(spout.bubbleColorize);
    const bubblePopEnabled = Boolean(spout.bubblePopEnabled);
    const bubbleMalformed = Boolean(spout.bubbleMalformed);
    const bubbleMalformedIntensity = clamp(
      Number.isFinite(Number(spout.bubbleMalformedIntensity)) ? Number(spout.bubbleMalformedIntensity) : DEFAULT_BUBBLER_MALFORMED_INTENSITY,
      MIN_BUBBLER_MALFORMED_INTENSITY,
      MAX_BUBBLER_MALFORMED_INTENSITY
    );
    const bubbleMalformedSpeed = clamp(
      Number.isFinite(Number(spout.bubbleMalformedSpeed)) ? Number(spout.bubbleMalformedSpeed) : DEFAULT_BUBBLER_MALFORMED_SPEED,
      MIN_BUBBLER_MALFORMED_SPEED,
      MAX_BUBBLER_MALFORMED_SPEED
    );
    const spoutPalettes = spoutBubbleColors.map((color) => getBubbleOrbPalette(
      resolveDecorColorSettingForRender(color, now, DEFAULT_BUBBLER_BUBBLE_COLOR),
      {
        fillOpacity: bubbleFillOpacity,
        colorize: bubbleColorize
      }
    ));
    const speed = clamp(Number(spout.speed) || DEFAULT_BUBBLER_SPEED, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED);
    const direction = normalizeBubblerDirection(spout.direction);
    const isStraightUpStream = direction === "up";
    const sourceLocation = getBubblerSpoutHorizontalLocation(spout, image);
    const renderedSourceLocation = resolveDecorHorizontalUnit(item, sourceLocation);
    const sourceX = drawX + width * renderedSourceLocation;
    const sourceYOffsetRatio = getBubblerSpoutSourceOffsetRatio(
      decor.path,
      {
        horizontalLocation: sourceLocation,
        horizontalOffsetPx: null
      }
    );
    const sourceY = drawY + height * sourceYOffsetRatio + Math.max(2 * stableScale, item.scale * 2 * stableScale);
    const spoutWidthPx = Math.max(0, spout.spread * item.scale * stableScale);
    const fadeDistancePx = Math.max(24 * stableScale, spout.fadeDistance * stableScale);
    const cadenceMs = getBubblerCadenceFromIntensity(intensity);
    const travelDurationMs = getBubblerTravelDurationFromSpeed(speed);
    const totalBubbleCount = clamp(
      Math.ceil(travelDurationMs / cadenceMs) + 2 + Math.round(spoutWidthPx / 80),
      1,
      getMaxVisibleBubblerBubblesPerSpout()
    );
    const wobblePx = Math.min(2.1, 0.55 + intensity * 0.06) * stableScale;
    const waterlineStopY = waterSurfaceY + Math.max(2 * stableScale, 2);
    const availableTravelPx = Math.max(24, sourceY - waterlineStopY);
    const renderedBubbles = [];
    const streamSeed = hashStringToUint32(`${item.id}|${item.decorKey}|${spoutIndex}|stream`);
    const streamRand = mulberry32(streamSeed ^ 0x9e3779b9);
    const streamTimeMs = now + randomBetweenWith(streamRand, 0, cadenceMs);
    const latestEmissionCycle = Math.floor(streamTimeMs / cadenceMs);

    for (let slotIndex = 0; slotIndex < totalBubbleCount; slotIndex += 1) {
      const emissionCycle = latestEmissionCycle - slotIndex;
      const emissionSeed = hashStringToUint32(
        `${item.id}|${item.decorKey}|${spoutIndex}|${emissionCycle}`
      );
      const emissionRand = mulberry32(emissionSeed ^ 0x5f3759df);
      const colorRand = mulberry32(emissionSeed ^ 0x85ebca6b);
      const depthRand = mulberry32(emissionSeed ^ 0x9e3779b9);
      const motionRand = mulberry32(emissionSeed ^ 0x27d4eb2d);
      const originRand = mulberry32(emissionSeed ^ 0x165667b1);
      const jitterRatio = clamp((intensity - MIN_CUSTOM_BUBBLER_AMOUNT) / 8, 0, 0.14);
      const emittedAtMs = emissionCycle * cadenceMs + randomBetweenWith(motionRand, -jitterRatio, jitterRatio) * cadenceMs;
      const ageMs = streamTimeMs - emittedAtMs;
      if (ageMs < 0 || ageMs > travelDurationMs) {
        continue;
      }

      const phase = clamp(ageMs / travelDurationMs, 0, 1);
      const riseProgress = Math.pow(phase, isStraightUpStream ? 0.82 : 0.94);
      const slotWobbleCadenceMs = Math.max(
        620,
        travelDurationMs * randomBetweenWith(motionRand, 0.08, 0.2)
      );
      const slotWobblePx = wobblePx * randomBetweenWith(motionRand, 0.45, 1.15);
      const wobblePhase = randomBetweenWith(motionRand, 0, Math.PI * 2);
      const wobbleCadenceOffsetMs = randomBetweenWith(motionRand, 0, 120);
      const palette = spoutPalettes[
        clamp(Math.floor(randomBetweenWith(colorRand, 0, 1) * spoutPalettes.length), 0, spoutPalettes.length - 1)
      ] || spoutPalettes[0] || getBubbleOrbPalette(DEFAULT_BUBBLER_BUBBLE_COLOR);
      const depth = Math.pow(randomBetweenWith(depthRand, 0, 1), 0.88);
      const depthScale = 0.72 + depth * 0.52;
      const depthAlphaScale = 0.48 + depth * 0.74;
      const depthWobblePx = slotWobblePx * (0.58 + depth * 0.62);
      const originBias = (randomBetweenWith(originRand, -1, 1) + randomBetweenWith(originRand, -1, 1)) * 0.5;
      const spawnOffsetX = originBias * spoutWidthPx * 0.5;
      const trajectoryDriftPx = randomBetweenWith(motionRand, -1, 1) * Math.min(5.5 * stableScale, Math.max(1.2 * stableScale, spoutWidthPx * 0.035));
      const sway = Math.sin(
        now / (slotWobbleCadenceMs + wobbleCadenceOffsetMs) + wobblePhase + spoutIndex * 0.9
      ) * depthWobblePx
        + Math.sin(phase * 10.2 + wobblePhase * 0.47) * depthWobblePx * 0.28;
      const reachesWaterline = fadeDistancePx >= availableTravelPx - 1 * stableScale;
      const travelPx = reachesWaterline
        ? availableTravelPx
        : Math.min(
          fadeDistancePx * randomBetweenWith(emissionRand, 0.88, 1.06),
          availableTravelPx
        );
      // Straight-up streams should lift immediately so they do not appear to pool at the spout.
      const turnRatio = isStraightUpStream ? 0 : clamp(0.16 + speed * 0.1, 0.2, 0.56);
      const turnProgress = isStraightUpStream
        ? 0
        : clamp(riseProgress / Math.max(0.0001, turnRatio), 0, 1);
      const upwardProgress = isStraightUpStream
        ? riseProgress
        : Math.pow(
          clamp((riseProgress - turnRatio) / Math.max(0.0001, 1 - turnRatio), 0, 1),
          0.86
        );
      const turnDistancePx = isStraightUpStream
        ? 0
        : Math.min(
          travelPx * turnRatio,
          (20 + speed * 26) * stableScale
        );
      const directionVector = getBubblerDirectionVector(direction);
      const directionEase = isStraightUpStream ? 0 : Math.sin(turnProgress * Math.PI * 0.5);
      const directionalX = directionVector.x * turnDistancePx * directionEase;
      const directionalY = directionVector.y * turnDistancePx * directionEase;
      const upwardTravelPx = upwardProgress * (
        isStraightUpStream
          ? travelPx
          : (travelPx + Math.max(0, directionalY))
      );
      const x = sourceX + spawnOffsetX + directionalX + trajectoryDriftPx * riseProgress + sway * (0.5 + upwardProgress * 0.34);
      const y = sourceY + directionalY - upwardTravelPx;

      const spawnFade = phase < 0.08 ? phase / 0.08 : 1;
      const fadeWindowPx = clamp(travelPx * 0.34, 26 * stableScale, 110 * stableScale);
      const fadeStartProgress = clamp(1 - fadeWindowPx / Math.max(1, travelPx), 0.35, 0.92);
      const distanceFade = riseProgress <= fadeStartProgress
        ? 1
        : Math.pow(clamp(1 - (riseProgress - fadeStartProgress) / Math.max(0.0001, 1 - fadeStartProgress), 0, 1), 1.8);
      const shouldPop = bubblePopEnabled || reachesWaterline;
      const popDurationMs = clamp(cadenceMs * 0.56, reachesWaterline ? 180 : 280, reachesWaterline ? 460 : 620);
      const popStartAgeMs = Math.max(0, travelDurationMs - popDurationMs);
      const popProgress = shouldPop
        ? clamp((ageMs - popStartAgeMs) / Math.max(1, popDurationMs), 0, 1)
        : 0;
      const effectiveDistanceFade = shouldPop ? 1 : distanceFade;
      const alpha = clamp(
        (0.16 + intensity * 0.018) * effectiveDistanceFade * spawnFade * alphaScale * bubbleOpacity * depthAlphaScale,
        0,
        1
      );
      if (alpha <= 0.008) {
        continue;
      }

      const sizeBias = Math.pow(randomBetweenWith(emissionRand, 0, 1), 1.45);
      const occasionalLargeBubble = randomBetweenWith(emissionRand, 0, 1) > 0.9 ? 1.18 : 1;
      const radiusMin = (0.95 + intensity * 0.03) * bubbleSize;
      const radiusMax = (1.65 + intensity * 0.08 + Math.min(0.8, spoutWidthPx * 0.02)) * bubbleSize;
      const radius = clamp(
        (radiusMin + (radiusMax - radiusMin) * sizeBias) * occasionalLargeBubble,
        0.45,
        24
      );
      const fadeScale = 0.72 + effectiveDistanceFade * 0.28;
      const fadedRadius = radius * fadeScale * depthScale;
      const ySurfaceLimit = waterlineStopY + fadedRadius * stableScale;
      const drawY = reachesWaterline
        ? Math.max(y, ySurfaceLimit)
        : y;
      const stretch = 1
        + riseProgress * 0.2
        + Math.min(0.34, intensity * 0.015)
        + depth * 0.06
        + randomBetweenWith(emissionRand, -0.04, 0.06);
      const malformRand = mulberry32(emissionSeed ^ 0xa24baed5);
      const malformRoll = randomBetweenWith(malformRand, 0, 1);
      const malformChance = clamp(0.12 + fadedRadius * 0.038 + bubbleMalformedIntensity * 0.18, 0.16, 0.76);
      const malform = bubbleMalformed && malformRoll <= malformChance
        ? {
          seed: emissionSeed ^ 0x7f4a7c15,
          amount: (randomBetweenWith(malformRand, 0.018, 0.13) + Math.min(0.055, fadedRadius * 0.0035)) * bubbleMalformedIntensity,
          phase: now / (randomBetweenWith(mulberry32(emissionSeed ^ 0x94d049bb), 320, 2600) / bubbleMalformedSpeed) + randomBetweenWith(mulberry32(emissionSeed ^ 0x632be59b), 0, Math.PI * 2),
          rotation: randomBetweenWith(mulberry32(emissionSeed ^ 0x51ed270b), -0.16, 0.16) + Math.sin(now / (900 / bubbleMalformedSpeed) + emissionSeed) * 0.08 * clamp((bubbleMalformedSpeed - 0.8) / 2.2, 0, 1),
          speed: bubbleMalformedSpeed
        }
        : null;
      const parentAlpha = bubblePopEnabled
        ? (popProgress > 0 ? 0 : alpha)
        : alpha;
      if (parentAlpha > 0.008) {
        renderedBubbles.push({
          depth,
          x,
          y: drawY,
          radius: fadedRadius,
          alpha: parentAlpha,
          stretch,
          palette,
          malform
        });
      }

      if (shouldPop && popProgress > 0) {
        const burstEase = 1 - Math.pow(1 - popProgress, 3);
        for (let microIndex = 0; microIndex < BUBBLER_POP_MICRO_BUBBLE_COUNT; microIndex += 1) {
          const microRand = mulberry32(emissionSeed ^ (0x68bc21eb + microIndex * 0x45d9f3b));
          const angle = (microIndex / BUBBLER_POP_MICRO_BUBBLE_COUNT) * Math.PI * 2
            + randomBetweenWith(microRand, -0.34, 0.34);
          const burstDistance = randomBetweenWith(microRand, 4.5, 14) * stableScale * Math.max(0.28, burstEase) * (0.78 + bubbleSize * 0.08);
          const microAlpha = clamp(
            alpha * Math.pow(1 - popProgress, 1.25) * randomBetweenWith(microRand, 0.5, 0.95),
            0,
            1
          );
          if (microAlpha <= 0.008) {
            continue;
          }

          const microRadius = clamp(fadedRadius * randomBetweenWith(microRand, 0.13, 0.26) * (1 - popProgress * 0.42), 0.22, 2.4);
          const rawMicroY = drawY + Math.sin(angle) * burstDistance - burstEase * randomBetweenWith(microRand, 1, 5) * stableScale;
          renderedBubbles.push({
            depth: depth + microIndex * 0.0001,
            x: x + Math.cos(angle) * burstDistance,
            y: reachesWaterline
              ? Math.max(rawMicroY, waterlineStopY + microRadius * stableScale)
              : rawMicroY,
            radius: microRadius,
            alpha: microAlpha,
            stretch: randomBetweenWith(microRand, 0.88, 1.14),
            palette,
            malform: null
          });
        }
      }
    }

    renderedBubbles
      .sort((left, right) => left.depth - right.depth || left.y - right.y)
      .forEach((bubble) => {
        drawBubbleOrbToContext(context, bubble.x, bubble.y, bubble.radius, bubble.alpha, bubble.stretch, bubble.palette, stableScale, {
          malform: bubble.malform
        });
      });
  });
}

function drawDecorBubblerEffect(item, decor, image, now = Date.now(), options = {}) {
  drawDecorBubblerEffectToContext(tankContext, item, decor, image, now, options);
}

function drawTransitTubeBursts(now = Date.now()) {
  runtime.transitTubeBursts = (runtime.transitTubeBursts || []).filter((burst) => burst.endsAt > now);
  const tank = getCurrentTank();
  if (!tank || !runtime.transitTubeBursts.length) {
    return;
  }
  for (const burst of runtime.transitTubeBursts.filter((entry) => entry.tankId === tank.id)) {
    const item = (tank.placedDecor || []).find((entry) => entry.id === burst.decorId);
    const decor = item ? runtime.decorMap.get(item.decorKey) : null;
    const image = decor ? runtime.images.get(decor.path) : null;
    if (!item || !decor || !image) {
      continue;
    }
    const progress = clamp((now - burst.startedAt) / Math.max(1, burst.endsAt - burst.startedAt), 0, 1);
    const envelope = Math.sin(progress * Math.PI);
    const dynamicDecor = {
      ...decor,
      bubbler: {
        spoutQty: 1,
        spouts: [{
          horizontalLocation: 0.5,
          intensity: 10,
          speed: 1.8,
          spread: burst.mode === "enter" ? 18 : 52,
          fadeDistance: burst.mode === "enter" ? 95 : 210,
          direction: burst.mode === "enter" ? "down" : "up",
          bubbleColor: "#76efff",
          bubbleOpacity: 3,
          bubbleSize: burst.mode === "enter" ? 0.75 : 1.15,
          bubblePopEnabled: burst.mode === "exit"
        }]
      }
    };
    drawDecorBubblerEffectToContext(tankContext, item, dynamicDecor, image, now, { alphaScale: envelope });
  }
}

function drawDecorBubbleStreams(now) {
  if (!state.placedDecor.length) {
    return;
  }

  const stableScale = getViewportStableAssetScale();
  for (const item of state.placedDecor) {
    if (isBubblerDecorKey(item.decorKey)) {
      continue;
    }

    const decor = runtime.decorMap.get(item.decorKey);
    const image = decor ? runtime.images.get(decor.path) : null;
    if (!decor || !image) {
      continue;
    }

    const intensity = getDecorBubbleIntensity(item.decorKey);
    if (intensity <= 0) {
      continue;
    }

    const width = getDecorDisplayWidth(decor, item);
    const height = width * (image.height / image.width);
    const sourceX = item.xNorm * TANK_WIDTH;
    const sourceY = item.yNorm * TANK_HEIGHT - height * 0.2;
    const streamCount = intensity >= 1.3 ? 2 : 1;

    for (let streamIndex = 0; streamIndex < streamCount; streamIndex += 1) {
      const laneOffset = (streamIndex - (streamCount - 1) / 2) * (12 * stableScale + width * 0.03);
      const bubbleCount = 2 + Math.round(intensity);
      for (let bubbleIndex = 0; bubbleIndex < bubbleCount; bubbleIndex += 1) {
        const cycle = (now / 1000) * (0.055 + bubbleIndex * 0.008 + streamIndex * 0.006) + item.xNorm * 7 + bubbleIndex * 0.19;
        const progress = cycle % 1;
        const x = sourceX + laneOffset + Math.sin(cycle * 8) * (3.2 + bubbleIndex * 0.9) * stableScale;
        const y = sourceY - progress * (70 + bubbleIndex * 28 + intensity * 12) * stableScale;
        if (y <= WATER_SURFACE_Y + 6) {
          continue;
        }

        const radius = 1.8 + bubbleIndex * 0.7;
        drawBubbleOrb(x, y, radius, 0.14 + bubbleIndex * 0.05, 1);
      }
    }
  }
}

function getDecorBubbleIntensity(decorKey) {
  const key = decorKey.toLowerCase();
  if (/(coral|seaweed|grass|moss|anubias|bloom|bunch)/.test(key)) {
    return 1.45;
  }
  if (/(castle|cave|terracotta|pagoda|bridge|arch)/.test(key)) {
    return 1.05;
  }
  if (/(rock|driftwood|chest|shell)/.test(key)) {
    return 0.6;
  }
  return 0.35;
}

function getBubbleSpriteByIndex(index) {
  const overrideSprite = getOptionalBubbleOrbSprite();
  if (overrideSprite) {
    return overrideSprite;
  }

  if (!runtime.bubbleCatalog.length) {
    return null;
  }

  const item = runtime.bubbleCatalog[index % runtime.bubbleCatalog.length];
  return item ? runtime.images.get(item.path) : null;
}

function getPoopPose(poop, now = Date.now()) {
  if (!poop) {
    return null;
  }

  const poopSprite = runtime.images.get(poop.asset || resolveAppUrl(POOP_ASSET_PATH));
  if (!poopSprite) {
    return null;
  }

  const sinkProgress = clamp((now - poop.createdAt) / POOP_FALL_MS, 0, 1);
  const x = poop.xNorm * TANK_WIDTH + Math.sin(now / 520 + poop.xNorm * 11) * (1 - sinkProgress) * 6;
  const width = POOP_DRAW_WIDTH_PX;
  const height = width * (poopSprite.height / Math.max(1, poopSprite.width));
  const targetYNorm = Number.isFinite(Number(poop.tankLayer))
    ? getPoopLayerTargetYNorm(poop, poopSprite, width)
    : (Number.isFinite(Number(poop.yNorm)) ? Number(poop.yNorm) : getPoopFloorYNormAtXNorm(poop.xNorm));
  const startYNorm = Math.min(
    clamp(Number(poop.startYNorm) || 0.54, 0.14, 0.82),
    Math.max(0.14, targetYNorm - 0.012)
  );
  const y = (startYNorm + (targetYNorm - startYNorm) * sinkProgress) * TANK_HEIGHT;
  const wobble = Math.sin(now / 720 + poop.xNorm * 17) * (1 - sinkProgress) * 0.12;

  return {
    x,
    y,
    wobble,
    width,
    height,
    sprite: poopSprite,
    left: x - width / 2,
    right: x + width / 2,
    top: y + 4 - height * 0.88,
    bottom: y + 4 + height * 0.12
  };
}

function findFloatingPelletAtPoint(x, y, now = Date.now()) {
  const pellets = [...state.floatingPellets].reverse();
  for (const pellet of pellets) {
    const bounds = getPelletHitBounds(pellet, now);
    if (!bounds) {
      continue;
    }

    const padding = pellet.foodKey === "chum" ? 7 : 5;
    if (
      x >= bounds.left - padding
      && x <= bounds.right + padding
      && y >= bounds.top - padding
      && y <= bounds.bottom + padding
    ) {
      return pellet;
    }
  }

  return null;
}

function findPoopAtPoint(x, y, now = Date.now()) {
  const poops = [...state.poops].reverse();
  for (const poop of poops) {
    const pose = getPoopPose(poop, now);
    if (!pose) {
      continue;
    }

    const padding = 6;
    if (
      x >= pose.left - padding
      && x <= pose.right + padding
      && y >= pose.top - padding
      && y <= pose.bottom + padding
    ) {
      return poop;
    }
  }

  return null;
}

function getAutoDispenserLayout() {
  const dispenserScale = getViewportStableObjectScale("hardware") * AUTO_DISPENSER_VIEWPORT_SIZE_MULTIPLIER;
  const width = AUTO_DISPENSER_DRAW_WIDTH * dispenserScale;
  const height = AUTO_DISPENSER_DRAW_HEIGHT * dispenserScale;
  const visibleBounds = getVisibleTankVirtualBounds();
  const x = TANK_WIDTH * 0.5 - width / 2;
  const y = visibleBounds.top - getViewportPxAsTankVirtual(AUTO_DISPENSER_TOP_MOUNT_OVERHANG_PX);
  const screenWidth = width * 0.12;
  const screenHeight = height * 0.2;
  const screenLeft = x + width * 0.72;
  const screenTop = y + height * 0.23;
  const buttonSize = height * 0.18;
  const buttonTop = screenTop + (screenHeight - buttonSize) / 2;
  const resetWidth = width * 0.085;
  const playWidth = width * 0.095;
  const lowerButtonGap = width * 0.012;
  const lowerButtonsWidth = resetWidth + lowerButtonGap + playWidth;
  const resetHeight = height * 0.13;
  const resetLeft = screenLeft + (screenWidth - lowerButtonsWidth) / 2;
  const resetTop = screenTop + screenHeight + height * 0.022;
  const playLeft = resetLeft + resetWidth + lowerButtonGap;

  return {
    x,
    y,
    scale: dispenserScale,
    width,
    height,
    bodyBounds: {
      left: x,
      right: x + width,
      top: y,
      bottom: y + height
    },
    hopperBounds: {
      left: x + width * 0.085,
      right: x + width * 0.53,
      top: y + height * 0.225,
      bottom: y + height * 0.515
    },
    screenBounds: {
      left: screenLeft,
      right: screenLeft + screenWidth,
      top: screenTop,
      bottom: screenTop + screenHeight
    },
    minusBounds: {
      left: screenLeft - buttonSize - width * 0.018,
      right: screenLeft - width * 0.018,
      top: buttonTop,
      bottom: buttonTop + buttonSize
    },
    plusBounds: {
      left: screenLeft + screenWidth + width * 0.018,
      right: screenLeft + screenWidth + width * 0.018 + buttonSize,
      top: buttonTop,
      bottom: buttonTop + buttonSize
    },
    resetBounds: {
      left: resetLeft,
      right: resetLeft + resetWidth,
      top: resetTop,
      bottom: resetTop + resetHeight
    },
    playBounds: {
      left: playLeft,
      right: playLeft + playWidth,
      top: resetTop,
      bottom: resetTop + resetHeight
    },
    nozzle: {
      x: x + width * 0.5,
      y: y + height * 0.77
    }
  };
}

function pointInSimpleBounds(x, y, bounds) {
  return Boolean(
    bounds
    && x >= bounds.left
    && x <= bounds.right
    && y >= bounds.top
    && y <= bounds.bottom
  );
}

function expandBoundsAroundCenter(bounds, scale = 1) {
  if (!bounds || !Number.isFinite(Number(scale)) || scale <= 1) {
    return bounds || null;
  }

  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const halfWidth = ((bounds.right - bounds.left) * scale) / 2;
  const halfHeight = ((bounds.bottom - bounds.top) * scale) / 2;
  return {
    left: centerX - halfWidth,
    right: centerX + halfWidth,
    top: centerY - halfHeight,
    bottom: centerY + halfHeight
  };
}

function getAutoDispenserHitTarget(x, y) {
  if (!hasAutoDispenserInstalled()) {
    return "";
  }

  const layout = getAutoDispenserLayout();
  if (!pointInSimpleBounds(x, y, layout.bodyBounds)) {
    return "";
  }
  if (pointInSimpleBounds(x, y, layout.minusBounds)) {
    return "minus";
  }
  if (pointInSimpleBounds(x, y, layout.plusBounds)) {
    return "plus";
  }
  if (pointInSimpleBounds(x, y, layout.resetBounds)) {
    return "reset";
  }
  if (pointInSimpleBounds(x, y, layout.playBounds)) {
    return "play";
  }
  return "body";
}

function handleAutoDispenserInteractionAtPoint(point, now = Date.now()) {
  if (!point || !hasAutoDispenserInstalled()) {
    return false;
  }

  const hitTarget = getAutoDispenserHitTarget(point.x, point.y);
  if (!hitTarget) {
    return false;
  }

  if (hitTarget === "minus") {
    adjustAutoDispenserMealPortion(-1, now);
    return true;
  }

  if (hitTarget === "plus") {
    adjustAutoDispenserMealPortion(1, now);
    return true;
  }

  if (hitTarget === "reset") {
    openAutoDispenserResetConfirmation();
    return true;
  }

  if (hitTarget === "play") {
    dispenseAutoDispenserNow(now);
    return true;
  }

  if (runtime.medicineModeKey) {
    showToast("Only food can be loaded into the pellet dispenser.");
    return true;
  }

  return loadSelectedFoodIntoAutoDispenser(now);
}

function scoopTankItemAtPoint(x, y, now = Date.now()) {
  const pellet = findFloatingPelletAtPoint(x, y, now);
  if (pellet) {
    state.floatingPellets = state.floatingPellets.filter((entry) => entry.id !== pellet.id);
    runtime.chumBloodCloudAtByPelletId?.delete?.(pellet.id);
    for (const fish of state.fish) {
      if (fish.feedingPelletId === pellet.id) {
        fish.feedingPelletId = null;
      }
    }
    assignFloatingPelletsToHungryFish(now);
    return {
      kind: "food",
      label: pellet.foodKey === "chum" ? "Chum scooped out." : "Soggy food scooped out."
    };
  }

  const poop = findPoopAtPoint(x, y, now);
  if (poop) {
    state.poops = state.poops.filter((entry) => entry.id !== poop.id);
    return {
      kind: "poop",
      label: "Waste scooped out."
    };
  }

  const fish = findFishAtPoint(x, y, now);
  if (fish) {
    if (storeFish(fish.id, { allowDead: true })) {
      playFishSplashSoundEffect();
    }
    return {
      kind: "fish",
      label: ""
    };
  }

  return null;
}

function handleScoopAtPoint(point, now = Date.now()) {
  if (!point) {
    return false;
  }

  const scoopResult = scoopTankItemAtPoint(point.x, point.y, now);
  if (!scoopResult) {
    return false;
  }

  if (scoopResult.label) {
    saveState();
    renderUi(now);
    showToast(scoopResult.label);
  }

  return true;
}

function findFishEggAtPoint(x, y, now = Date.now()) {
  if (!Array.isArray(state.fishEggs) || !state.fishEggs.length) {
    return null;
  }

  const candidates = state.fishEggs
    .map((egg, index) => ({ egg, index }))
    .filter(({ egg }) => egg && !egg.hatchedAt)
    .sort((left, right) => {
      const layerDelta = getFishEggTankLayer(right.egg) - getFishEggTankLayer(left.egg);
      return layerDelta || right.index - left.index;
    });

  for (const { egg } of candidates) {
    const pose = getFishEggPose(egg, now);
    if (!pose || pose.alpha <= 0.01) {
      continue;
    }

    const padding = 9;
    if (
      x >= pose.x - pose.width / 2 - padding
      && x <= pose.x + pose.width / 2 + padding
      && y >= pose.y - pose.height * 0.9 - padding
      && y <= pose.y + pose.height * 0.16 + padding
    ) {
      return egg;
    }
  }

  return null;
}

function findFishAtPoint(x, y, now) {
  const sortedFish = [...state.fish].sort((left, right) => {
    if (getFishTankLayer(left) !== getFishTankLayer(right)) {
      return getFishTankLayer(left) - getFishTankLayer(right);
    }
    return right.yNorm - left.yNorm;
  });
  for (const fish of sortedFish) {
    const species = getSpeciesForFish(fish);
    const descriptor = species ? getFishShapeDescriptor(fish, species, now) : null;
    if (descriptor && pointHitsShapeDescriptor(descriptor, x, y)) {
      return fish;
    }
  }

  return null;
}

function getUndeadComfortPenalty(fish) {
  if (!fish || isUndeadFish(fish) || !isGoreEnabled()) {
    return 0;
  }

  const undeadNeighbors = state.fish.filter((otherFish) => (
    otherFish
    && otherFish.id !== fish.id
    && !isFishDead(otherFish)
    && isUndeadFish(otherFish)
  )).length;
  return clamp(undeadNeighbors * UNDEAD_COMFORT_PENALTY, 0, MAX_UNDEAD_COMFORT_PENALTY);
}

function updateComfortHistoryEvents(now = Date.now()) {
  let changed = false;
  const dayKey = getLocalDayKey(now);
  for (const fish of getLivingTankFish()) {
    const comfort = getFishComfort(fish, now);
    if (comfort.value <= 0.4) {
      if (!Number.isFinite(Number(fish.veryLowComfortStartedAt)) || Number(fish.veryLowComfortStartedAt) <= 0) {
        fish.veryLowComfortStartedAt = now;
        changed = true;
      } else if (
        now - Number(fish.veryLowComfortStartedAt) >= COMFORT_VERY_LOW_EVENT_MS
        && fish.veryLowComfortEventDayKey !== dayKey
      ) {
        fish.veryLowComfortEventDayKey = dayKey;
        pushEvent(`${fish.name} is very uncomfortable.`, now, getCurrentTank(), { score: -1, type: "comfort", fishId: fish.id });
        changed = true;
      }
    } else if (Number(fish.veryLowComfortStartedAt) > 0) {
      fish.veryLowComfortStartedAt = 0;
      changed = true;
    }
  }
  return changed;
}

function getFishComfort(fish, now) {
  if (isFishDead(fish)) {
    return { value: 0, label: "Deceased" };
  }

  if (hasActiveTankMedicineEffect("betaBlocker", now)) {
    return { value: 1, label: "Calm" };
  }

  if (isUndeadFish(fish) && isGoreEnabled()) {
    return { value: 1, label: "Undead" };
  }

  const dirtiness = getTankDirtiness(now);
  if (hasExposedDeadTankFish(now) || dirtiness >= CRITICAL_TANK_DIRTINESS) {
    return { value: 0, label: "Critical" };
  }

  const cleanliness = clamp(1 - dirtiness, 0, 1);
  const cleanlinessPoints = cleanliness >= 0.9
    ? COMFORT_COMPONENTS.cleanliness
    : (cleanliness / 0.9) * COMFORT_COMPONENTS.cleanliness;
  const lastAteAt = Number(fish.lastAteAt) || 0;
  const hasRecentMeal = lastAteAt > 0 && now - lastAteAt <= COMFORT_MEAL_WINDOW_MS;
  const hungerValue = Number.isFinite(Number(fish?.needs?.hunger)) ? clamp(Number(fish.needs.hunger), 0, 100) : FISH_NEED_DEFAULTS.hunger;
  const mealSatisfied = isMealFreeFish(fish) || hasRecentMeal || hungerValue >= 45;
  const mealPoints = mealSatisfied ? COMFORT_COMPONENTS.meal : 0;
  const mealBoost = lastAteAt > 0 && now - lastAteAt <= COMFORT_MEALTIME_BOOST_MS
    ? COMFORT_COMPONENTS.mealBoost
    : 0;
  const needsStatus = getFishNeedsStatus(fish, getCurrentTank(), now);
  const needsPoints = needsStatus.reduce((total, need) => total + (need.met ? COMFORT_COMPONENTS.needs / Math.max(1, needsStatus.length) : 0), 0);
  const healthPoints = getFishHealthRatio(fish) * COMFORT_COMPONENTS.health;
  const spacePoints = getTankSpaceComfortPoints(getCurrentTank());
  const activeConflicts = getFishConflictStatus(fish, getCurrentTank(), now).filter((conflict) => conflict.active);
  const conflictPenalty = Math.min(COMFORT_COMPONENTS.maxConflictPenalty, activeConflicts.length * COMFORT_COMPONENTS.conflictPenalty);
  const undeadPenalty = getUndeadComfortPenalty(fish);
  const glassTapStressPenalty = getFishGlassTapStressPenalty(fish, now);
  const diseasePenalty = getFishDiseaseComfortPenalty(fish, now);
  const comfortValue = clamp(
    (
      cleanlinessPoints
      + mealPoints
      + needsPoints
      + healthPoints
      + spacePoints
      + mealBoost
      - conflictPenalty
    ) / 100
    - undeadPenalty
    - glassTapStressPenalty
    - diseasePenalty,
    0,
    1
  );
  const label = comfortValue >= 0.95
    ? "Sparkling"
    : comfortValue >= 0.84
    ? "Cozy"
    : comfortValue >= 0.65
      ? "Content"
      : comfortValue >= 0.41
        ? "Uneasy"
        : comfortValue >= 0.16
          ? "Stressed"
          : "Panicked";
  return { value: comfortValue, label };
}

function getFishNeedValue(fish, needKey, now = Date.now()) {
  fish.needs = sanitizeFishNeeds(fish?.needs, fish, now);
  return clamp(Number(fish.needs[needKey]) || 0, 0, 100);
}

function setFishNeedValue(fish, needKey, value, now = Date.now()) {
  if (!fish || !FISH_NEED_KEYS.includes(needKey)) {
    return false;
  }
  fish.needs = sanitizeFishNeeds(fish.needs, fish, now);
  const previous = fish.needs[needKey];
  fish.needs[needKey] = clamp(Number(value) || 0, 0, 100);
  return Math.abs(previous - fish.needs[needKey]) > 0.001;
}

function adjustFishNeed(fish, needKey, delta, now = Date.now()) {
  return setFishNeedValue(fish, needKey, getFishNeedValue(fish, needKey, now) + Number(delta || 0), now);
}

function getFishNeedsSnapshot(fish, now = Date.now()) {
  const needs = sanitizeFishNeeds(fish?.needs, fish, now);
  const mood = getFishNeedsMood(needs);
  return { needs, mood };
}

function getFishHungerLabel(fish, now = Date.now()) {
  return getFishNeedLabel("hunger", getFishNeedValue(fish, "hunger", now));
}

function isFishHungryByNeeds(fish, now = Date.now(), threshold = FISH_HUNGER_LOW_THRESHOLD) {
  if (!fish || isFishDead(fish) || isMealFreeFish(fish)) {
    return false;
  }
  return getFishNeedValue(fish, "hunger", now) <= threshold;
}

function getHungryFishByNeeds(tank = getCurrentTank(), now = Date.now(), threshold = FISH_HUNGER_LOW_THRESHOLD) {
  return (tank?.fish || state.fish || []).filter((fish) => isFishHungryByNeeds(fish, now, threshold));
}

function getPersonalityNeedModifier(fish, needKey) {
  const personality = getFishPersonality(fish);
  const modifiers = {
    hunger: { greedy: 1.28, energetic: 1.2, bold: 1.08, lazy: 0.82, gentle: 0.92, nightActive: 0.95 },
    energy: { energetic: 1.18, nervous: 1.18, lazy: 0.78, chill: 0.85, slowGraceful: 0.82 },
    social: { social: 1.35, follower: 1.25, shy: 0.72, standoffish: 0.65, territorial: 0.7 },
    stimulation: { curious: 1.35, explorer: 1.25, playful: 1.35, lazy: 0.75, routineLoving: 0.78 },
    comfort: { nervous: 1.3, sensitive: 1.25, shy: 1.18, bold: 0.82, chill: 0.78 },
    hygiene: { sensitive: 1.3, fancy: 1.25, hardy: 0.75, cleaner: 0.82 },
    environment: { homebody: 1.2, territorial: 1.18, explorer: 1.08, chill: 0.86 }
  };
  const normalized = personality.replace(/-/g, "");
  return modifiers[needKey]?.[personality] || modifiers[needKey]?.[normalized] || 1;
}

function getFishEnvironmentNeedTarget(fish, now = Date.now()) {
  const needsStatus = getFishNeedsStatus(fish, getCurrentTank(), now);
  const metRatio = needsStatus.length ? needsStatus.filter((need) => need.met).length / needsStatus.length : 0.75;
  const conflicts = getFishConflictStatus(fish, getCurrentTank(), now).filter((conflict) => conflict.active).length;
  const decorCount = Array.isArray(state.placedDecor) ? state.placedDecor.length : 0;
  const livingCount = getLivingTankFish().length;
  const decorBalance = clamp(100 - Math.abs(decorCount - Math.max(3, livingCount * 1.2)) * 5, 40, 100);
  return clamp(35 + metRatio * 45 + decorBalance * 0.2 - conflicts * 12, 0, 100);
}

function getFishSocialNeedTarget(fish) {
  const living = getLivingTankFish().filter((otherFish) => otherFish.id !== fish?.id && !isFishDead(otherFish));
  if (!living.length) {
    return ["shy", "standoffish", "territorial"].includes(getFishPersonality(fish)) ? 62 : 34;
  }
  const relationships = sanitizeFishRelationships(fish.relationships);
  let score = 48;
  for (const otherFish of living) {
    const relation = relationships[otherFish.id]?.kind || getRelationshipKindForFish(fish, otherFish);
    score += relation === "friend" ? 10 : relation === "neutral" ? 4 : relation === "dislike" ? -6 : -10;
  }
  return clamp(score, 10, 100);
}

function calculateFishNeedDeltas(fish, now = Date.now(), elapsedMs = 0) {
  const species = getSpeciesForFish(fish);
  if (!fish || !species || isFishDead(fish) || isUndeadFish(fish)) {
    return null;
  }
  const hours = Math.max(0, elapsedMs) / HOUR_MS;
  const activeQueueItem = getActiveFishActionQueueItem(fish, now);
  const dirtiness = getTankDirtiness(now);
  const comfortTarget = getFishComfort(fish, now).value * 100;
  const hygieneTarget = clamp((1 - dirtiness * getPersonalityNeedModifier(fish, "hygiene")) * 100, 0, 100);
  const environmentTarget = getFishEnvironmentNeedTarget(fish, now);
  const socialTarget = getFishSocialNeedTarget(fish);
  const deltas = {
    hunger: -hours * 5.2 * getPersonalityNeedModifier(fish, "hunger"),
    energy: -hours * 3.7 * getPersonalityNeedModifier(fish, "energy"),
    social: (socialTarget - getFishNeedValue(fish, "social", now)) * Math.min(1, hours * 0.18) - hours * 1.4 * getPersonalityNeedModifier(fish, "social"),
    comfort: (comfortTarget - getFishNeedValue(fish, "comfort", now)) * Math.min(1, hours * 0.45),
    hygiene: (hygieneTarget - getFishNeedValue(fish, "hygiene", now)) * Math.min(1, hours * 0.38),
    environment: (environmentTarget - getFishNeedValue(fish, "environment", now)) * Math.min(1, hours * 0.22),
    stimulation: -hours * 4.4 * getPersonalityNeedModifier(fish, "stimulation")
  };

  if (fish.activity === "feeding") {
    deltas.energy -= hours * 2;
    deltas.stimulation += hours * 2;
  }
  if (fish.activity === "roam" || fish.activity === "feeding" || fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY || fish.activity === FISH_GRAVEL_DIG_ACTIVITY) {
    const motionCost = clamp(Number(fish.motionLevel) || 0.2, 0.08, 1) * (fish.activity === "roam" ? 1.5 : 3.2);
    deltas.energy -= hours * motionCost;
  }
  if (activeQueueItem) {
    switch (activeQueueItem.action) {
      case "zoomies":
        deltas.energy -= hours * 18;
        deltas.hunger -= hours * 7;
        deltas.stimulation += hours * 22;
        break;
      case "sleep":
      case "rest":
        deltas.energy += hours * 28;
        deltas.comfort += hours * 8;
        deltas.stimulation -= hours * 1.5;
        break;
      case "hide":
        deltas.energy += hours * 8;
        deltas.comfort += hours * 12;
        break;
      case "hangout":
      case "greet":
        deltas.social += hours * 18;
        deltas.stimulation += hours * 6;
        break;
      case "inspect":
      case "play":
        deltas.stimulation += hours * 14;
        deltas.energy -= hours * 4;
        break;
      case "pebble":
        deltas.environment += hours * 18;
        deltas.stimulation += hours * 10;
        deltas.energy -= hours * 6;
        break;
      case "dig":
        deltas.environment += hours * 20;
        deltas.stimulation += hours * 7;
        deltas.energy -= hours * 7;
        break;
      case "waitfood":
        deltas.comfort += hours * 3;
        deltas.stimulation += hours * 2;
        break;
      case "avoid":
        deltas.comfort += hours * 12;
        deltas.energy -= hours * 2;
        break;
      case "breed":
        deltas.energy -= hours * 8;
        deltas.social += hours * 6;
        break;
      default:
        break;
    }
  }
  return deltas;
}

function updateFishNeeds(now = Date.now()) {
  let changed = false;
  for (const fish of getLivingTankFish()) {
    if (isUndeadFish(fish)) {
      continue;
    }
    fish.needs = sanitizeFishNeeds(fish.needs, fish, now);
    const previousUpdatedAt = Number.isFinite(Number(fish.needsUpdatedAt)) ? Number(fish.needsUpdatedAt) : now;
    const elapsedMs = clamp(now - previousUpdatedAt, 0, FISH_NEEDS_MAX_OFFLINE_MS);
    if (elapsedMs <= 0) {
      continue;
    }
    const deltas = calculateFishNeedDeltas(fish, now, elapsedMs);
    if (!deltas) {
      continue;
    }
    for (const key of FISH_NEED_KEYS) {
      changed = setFishNeedValue(fish, key, fish.needs[key] + (Number(deltas[key]) || 0), now) || changed;
    }
    fish.needsUpdatedAt = now;
    if (fish.needs.hunger <= FISH_HUNGER_CRITICAL_THRESHOLD) {
      maybeRecordFishNeedEvent(fish, "starving", `${fish.name} is starving.`, now, 2 * HOUR_MS);
      fish.lastNeedEventAtByType = sanitizeFishNeedEventMap(fish.lastNeedEventAtByType);
      if (now - (Number(fish.lastNeedEventAtByType["starve-damage"]) || 0) >= 2 * HOUR_MS) {
        fish.lastNeedEventAtByType["starve-damage"] = now;
        fish.healthUnits = Math.max(0, Number(fish.healthUnits) - 1);
        if (fish.healthUnits <= 0) {
          markFishAsDead(fish, now, `${fish.name} died from starvation.`);
        } else {
          pushEvent(`${fish.name} lost a half-heart from starvation.`, now, getCurrentTank(), { score: -2, type: "need", fishId: fish.id });
        }
        changed = true;
      }
    }
    if (fish.needs.energy <= FISH_ENERGY_CRITICAL_THRESHOLD) {
      maybeRecordFishNeedEvent(fish, "exhausted", `${fish.name} is exhausted.`, now, 2 * HOUR_MS);
    }
  }
  return changed;
}

function maybeRecordFishNeedEvent(fish, key, message, now = Date.now(), cooldownMs = HOUR_MS) {
  if (!fish || !key || !message) {
    return false;
  }
  fish.lastNeedEventAtByType = sanitizeFishNeedEventMap(fish.lastNeedEventAtByType);
  if (now - (Number(fish.lastNeedEventAtByType[key]) || 0) < cooldownMs) {
    return false;
  }
  fish.lastNeedEventAtByType[key] = now;
  pushEvent(message, now, getCurrentTank(), { score: -1, type: "need", fishId: fish.id });
  return true;
}

function formatFishAge(acquiredAt, now = Date.now()) {
  const diff = Math.max(0, now - acquiredAt);
  const days = Math.floor(diff / DAY_MS);
  if (days >= 1) {
    const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  const hours = Math.floor(diff / HOUR_MS);
  if (hours >= 1) {
    const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const minutes = Math.floor(diff / MINUTE_MS);
  if (minutes >= 1) {
    return `${minutes}m`;
  }

  return `${Math.floor(diff / 1000)}s`;
}
