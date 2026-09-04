// Source fragment: rendering/decor.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function drawDecorColorLayerImageToContext(context, sourceImage, imagePath, colorSetting, colorizeSetting, drawX, drawY, width, height, item, now, motion, alpha = 1) {
  if (!sourceImage) {
    return false;
  }

  const normalizedSetting = normalizeDecorColorSetting(colorSetting);
  const colorize = normalizeDecorColorizeSetting(colorizeSetting);
  if (isDecorRgbColorSetting(normalizedSetting)) {
    if ("filter" in context) {
      context.save();
      context.filter = colorize ? getDecorRgbColorizeFilter(now) : getDecorRgbCycleFilter(now);
      drawDecorImageLayerToContext(context, sourceImage, drawX, drawY, width, height, item, now, motion, alpha);
      context.restore();
      return true;
    }

    const fallbackImage = getTintedCaveLayerImage(imagePath, getDecorRgbCycleColor(now), {
      colorize,
      sourceImage
    }) || sourceImage;
    drawDecorImageLayerToContext(context, fallbackImage, drawX, drawY, width, height, item, now, motion, alpha);
    return true;
  }

  const image = getTintedCaveLayerImage(imagePath, normalizedSetting, {
    colorize,
    sourceImage
  }) || sourceImage;
  drawDecorImageLayerToContext(context, image, drawX, drawY, width, height, item, now, motion, alpha);
  return true;
}

function getDecorWarpSliceCount(height) {
  return clamp(
    Math.round(Math.max(1, Number(height) || 1) / DECOR_WARP_SLICE_TARGET_PX),
    DECOR_WARP_MIN_SLICES,
    DECOR_WARP_MAX_SLICES
  );
}

function normalizeDecorWarpOffset(offset) {
  return {
    x: Number.isFinite(Number(offset?.x)) ? Number(offset.x) : 0,
    y: Number.isFinite(Number(offset?.y)) ? Number(offset.y) : 0
  };
}

function drawWarpedImageBandsToContext(context, image, drawX, drawY, width, height, sliceCount, getOffsetAt) {
  const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
  const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
  const sliceHeight = height / sliceCount;
  const sourceSliceHeight = sourceHeight / sliceCount;
  const overlap = Math.min(Math.max(0.35, DECOR_WARP_SLICE_OVERLAP_PX), Math.max(0.35, sliceHeight * 0.9));
  const sourceOverlap = overlap * (sourceHeight / Math.max(1, height));

  for (let i = 0; i < sliceCount; i += 1) {
    const t0 = i / sliceCount;
    const t1 = (i + 1) / sliceCount;
    const srcY = t0 * sourceHeight;
    const srcH = Math.min(sourceHeight - srcY, sourceSliceHeight + sourceOverlap);
    const topOffset = normalizeDecorWarpOffset(getOffsetAt(t0));
    const bottomOffset = normalizeDecorWarpOffset(getOffsetAt(t1));
    const slopeX = (bottomOffset.x - topOffset.x) / Math.max(1, sliceHeight);
    const destY = i * sliceHeight;

    context.save();
    context.transform(1, 0, slopeX, 1, drawX + topOffset.x, drawY + destY + topOffset.y);
    context.drawImage(
      image,
      0,
      srcY,
      sourceWidth,
      srcH,
      0,
      0,
      width,
      sliceHeight + overlap
    );
    context.restore();
  }
}

function drawDecorWarpedToContext(context, image, drawX, drawY, width, height, item, now, motion = null) {
  const resolvedMotion = motion || getDecorMotion(item, now);
  const sliceCount = getDecorWarpSliceCount(height);
  drawWarpedImageBandsToContext(
    context,
    image,
    drawX,
    drawY,
    width,
    height,
    sliceCount,
    (t) => getDecorSliceOffset(item, now, t, resolvedMotion)
  );
}

function drawDecorMotionImageToContext(context, image, drawX, drawY, width, height, item, now, resolvedMotion) {
  if (resolvedMotion.customMotionType) {
    drawCustomDecorMotionImageLayerToContext(context, image, drawX, drawY, width, height, now, resolvedMotion);
  } else if (resolvedMotion.isFloating || resolvedMotion.isSeaweed || resolvedMotion.isLure) {
    drawDecorWarpedToContext(context, image, drawX, drawY, width, height, item, now, resolvedMotion);
  } else {
    context.drawImage(image, drawX, drawY, width, height);
  }
}

function drawDecorImageLayerToContext(context, image, drawX, drawY, width, height, item, now, motion = null, alpha = 1) {
  if (!image) {
    return;
  }

  const resolvedMotion = motion || getDecorMotion(item, now);
  context.save();
  context.globalAlpha = clamp(alpha, 0, 1);
  const flipX = isDecorHorizontallyFlipped(item);
  const flipY = isDecorVerticallyFlipped(item);
  if (flipX || flipY) {
    context.translate(flipX ? drawX + width : 0, flipY ? drawY + height : 0);
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    drawX = flipX ? 0 : drawX;
    drawY = flipY ? 0 : drawY;
  }
  drawDecorMotionImageToContext(context, image, drawX, drawY, width, height, item, now, resolvedMotion);
  drawUvGlowDecorImageToContext(context, image, drawX, drawY, width, height, item, now, resolvedMotion, getDecorUvGlowIntensity(item), alpha);
  context.restore();
}

function getCustomDecorMotionOffsetAt(t, now, resolvedMotion, motionConfig, width) {
  const hasBob = Boolean(motionConfig.hasBob);
  const bobX = hasBob ? resolvedMotion.bobX : 0;
  const bobY = hasBob ? resolvedMotion.bobY : 0;
  const splitY = sanitizeCustomDecorMotionSplit(resolvedMotion.customMotionSplitY);
  const swaySide = normalizeDecorSwaySide(resolvedMotion.customMotionSwaySide);
  const swayIntensity = sanitizeCustomDecorMotionIntensity(resolvedMotion.customMotionIntensity);
  const swayProgress = getDecorSwaySliceProgress(t, splitY, swaySide);
  const seaweedLike = motionConfig.id === "standard-seaweed" || motionConfig.id === "floating-seaweed";
  const swayAmplitude = (seaweedLike
    ? clamp(width * 0.045, 2.4, 15)
    : clamp(width * 0.028, 1.8, 9)) * swayIntensity;

  if (swayProgress <= 0) {
    return hasBob ? { x: bobX, y: bobY } : { x: 0, y: 0 };
  }

  const speed = sanitizeDecorMotionSpeed(resolvedMotion.swaySpeed);
  const strength = Math.pow(swayProgress, seaweedLike ? 1.15 : 1.35);
  const phase = resolvedMotion.phase;
  const primaryWave = Math.sin((now / (seaweedLike ? 1040 : 1180)) * speed + phase + swayProgress * 2.6);
  const secondaryWave = Math.sin((now / 1680) * speed + phase * 1.33 + swayProgress * 4.1) * 0.35;
  const offsetY = motionConfig.id === "suspended-static"
    ? Math.sin((now / 1260) * speed + phase + swayProgress * 1.8) * 0.45 * swayIntensity * strength
    : 0;

  return {
    x: bobX + (primaryWave + secondaryWave) * swayAmplitude * strength,
    y: bobY + offsetY
  };
}

function drawCustomDecorMotionImageLayerToContext(context, image, drawX, drawY, width, height, now, resolvedMotion) {
  const motionConfig = getCustomDecorMotionTypeConfig(resolvedMotion.customMotionType);
  const hasBob = Boolean(motionConfig.hasBob);
  const hasSway = Boolean(motionConfig.hasSway);
  const bobX = hasBob ? resolvedMotion.bobX : 0;
  const bobY = hasBob ? resolvedMotion.bobY : 0;

  if (!hasSway) {
    context.drawImage(image, drawX + bobX, drawY + bobY, width, height);
    return;
  }

  drawWarpedImageBandsToContext(
    context,
    image,
    drawX,
    drawY,
    width,
    height,
    getDecorWarpSliceCount(height),
    (t) => getCustomDecorMotionOffsetAt(t, now, resolvedMotion, motionConfig, width)
  );
}

function getDecorSliceOffset(item, now, t, motion = null) {
  const resolvedMotion = motion || getDecorMotion(item, now);
  const motionPhase = resolvedMotion.phase;
  let offsetX = 0;
  let offsetY = 0;

  const phase = resolvedMotion.phase;
  const swayProgress = getDecorSwaySliceProgress(t, resolvedMotion.swaySplitY, resolvedMotion.swaySide);

  if (resolvedMotion.isSeaweed && !resolvedMotion.isFloating && swayProgress > 0) {
    const strength = swayProgress * swayProgress;
    offsetX += Math.sin(now / (860 / resolvedMotion.swaySpeed) + phase) * 5.5 * resolvedMotion.swayIntensity * strength;
  }

  if ((resolvedMotion.isFloating || resolvedMotion.isLure) && swayProgress > 0) {
    const strength = swayProgress * swayProgress;
    const baseAmplitude = resolvedMotion.isLure ? 1.5 : 2.4;
    offsetX += Math.sin(now / (1080 / resolvedMotion.swaySpeed) + phase * 1.15) * baseAmplitude * resolvedMotion.swayIntensity * strength;
  }

  offsetX += (resolvedMotion.isFloating || resolvedMotion.isLure) ? resolvedMotion.bobX : 0;
  offsetY += (resolvedMotion.isFloating || resolvedMotion.isLure) ? resolvedMotion.bobY : 0;
  return { x: offsetX, y: offsetY };
}

function getDecorMotion(item, now) {
  const key = String(item?.decorKey || "").toLowerCase();
  const phase = item.xNorm * 11.73 + item.yNorm * 7.19;
  const decor = runtime.decorMap.get(item?.decorKey);
  const capabilities = getDecorMotionCapabilities(item);
  const motionSettings = getPlacedDecorMotionSettings(item);
  const customMotionType = isCustomDecorAssetKey(item?.decorKey)
    ? normalizeCustomDecorMotionType(decor?.motionType)
    : "";
  const customMotionConfig = customMotionType ? getCustomDecorMotionTypeConfig(customMotionType) : null;
  const isFloating = Boolean(capabilities.hasBob);
  const isSeaweed = Boolean(capabilities.hasSway);
  const customMotionIntensity = motionSettings.swayIntensity;
  const isLure = capabilities.isLure || key.includes("lure");
  const lureBobX = isLure
    ? (Math.sin(now / (980 / motionSettings.bobSpeed) + phase * 0.85) * 2.1 + Math.sin(now / (1630 / motionSettings.bobSpeed) + phase * 1.4) * 0.7) * motionSettings.bobIntensity
    : 0;
  const lureBobY = isLure
    ? (Math.sin(now / (790 / motionSettings.bobSpeed) + phase) * 2.2 + Math.cos(now / (1280 / motionSettings.bobSpeed) + phase * 0.7) * 0.85) * motionSettings.bobIntensity
    : 0;

  return {
    isFloating,
    isSeaweed,
    isLure,
    customMotionType,
    customMotionSplitY: customMotionConfig ? motionSettings.swaySplitY : DEFAULT_CUSTOM_DECOR_MOTION_SPLIT_Y,
    customMotionSwaySide: motionSettings.swaySide,
    customMotionIntensity,
    swaySplitY: motionSettings.swaySplitY,
    swaySide: motionSettings.swaySide,
    swayIntensity: motionSettings.swayIntensity,
    bobIntensity: motionSettings.bobIntensity,
    swaySpeed: motionSettings.swaySpeed,
    bobSpeed: motionSettings.bobSpeed,
    phase,
    bobX: isLure ? lureBobX : isFloating ? Math.sin(now / (980 / motionSettings.bobSpeed) + phase * 0.85) * 0.8 * motionSettings.bobIntensity : 0,
    bobY: isLure ? lureBobY : isFloating ? Math.sin(now / (760 / motionSettings.bobSpeed) + phase) * 1.4 * motionSettings.bobIntensity : 0
  };
}

function getFishShadowLayerPlaneY(fish) {
  const layer = getFishTankLayer(fish);
  const floorY = getTankFloorSurfaceYAtX((fish?.xNorm || 0.5) * TANK_WIDTH) + 7;
  return clamp(
    getTankLayerBottomBoundaryY(layer),
    WATER_SURFACE_Y + 24,
    floorY
  );
}

function getSmoothedFishShadowPlaneY(fish, targetPlaneY, now = Date.now()) {
  if (!fish?.id || !Number.isFinite(targetPlaneY)) {
    return targetPlaneY;
  }

  const previous = runtime.fishShadowPlaneCache.get(fish.id);
  if (!previous || !Number.isFinite(previous.y) || !Number.isFinite(previous.updatedAt)) {
    runtime.fishShadowPlaneCache.set(fish.id, { y: targetPlaneY, updatedAt: now });
    return targetPlaneY;
  }

  const elapsedMs = clamp(now - previous.updatedAt, 0, 1000);
  const ease = 1 - Math.exp(-elapsedMs / FISH_SHADOW_LAYER_EASE_MS);
  const y = previous.y + (targetPlaneY - previous.y) * ease;
  runtime.fishShadowPlaneCache.set(fish.id, { y, updatedAt: now });
  return y;
}

function pruneFishShadowPlaneCache() {
  if (!runtime.fishShadowPlaneCache.size) {
    return;
  }

  const activeFishIds = new Set((state?.fish || []).map((fish) => fish?.id).filter(Boolean));
  for (const fishId of runtime.fishShadowPlaneCache.keys()) {
    if (!activeFishIds.has(fishId)) {
      runtime.fishShadowPlaneCache.delete(fishId);
    }
  }
}

function getDecorContactShadowMetrics(item) {
  const decor = runtime.decorMap.get(item?.decorKey);
  if (!decor) {
    return null;
  }

  const capabilities = getDecorMotionCapabilities(item);
  if (capabilities.isFloating || capabilities.isLure) {
    return null;
  }

  const bounds = getPlacedDecorOpaqueBounds(item);
  if (!bounds) {
    return null;
  }

  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const layerFloorY = getTankLayerBottomBoundaryY(getDecorTankLayer(item));
  const anchorY = (Number(item.yNorm) || 0) * TANK_HEIGHT;
  const groundingTolerance = clamp(width * 0.09, 18, 58);
  const groundingStrength = clamp(1 - Math.abs(layerFloorY - anchorY) / groundingTolerance, 0, 1);
  if (groundingStrength <= 0.04) {
    return null;
  }

  const aspectFootprint = clamp(width / Math.max(width, height), 0.32, 1);
  const radiusX = clamp(width * (0.255 + aspectFootprint * 0.118), 16, 226);
  const radiusY = clamp(radiusX * 0.16, 5, 30);
  const centerX = (bounds.left + bounds.right) * 0.5;
  const lightOffsetX = clamp(radiusX * 0.075, 2, 12);
  const shadowY = clamp(
    layerFloorY + 2,
    WATER_SURFACE_Y + 20,
    getVisibleTankFloorBottomY() + 8
  );

  return {
    x: centerX + lightOffsetX,
    y: shadowY,
    radiusX,
    radiusY,
    alpha: 0.30 * groundingStrength
  };
}

function drawDecorContactShadow(context, item) {
  const shadow = getDecorContactShadowMetrics(item);
  if (!shadow) {
    return;
  }

  context.save();
  context.translate(shadow.x, shadow.y);
  context.scale(shadow.radiusX, shadow.radiusY);
  const gradient = context.createRadialGradient(0, 0, 0.04, 0, 0, 1);
  gradient.addColorStop(0, `rgba(2, 7, 12, ${shadow.alpha.toFixed(3)})`);
  gradient.addColorStop(0.34, `rgba(3, 9, 15, ${(shadow.alpha * 0.86).toFixed(3)})`);
  gradient.addColorStop(0.75, `rgba(5, 12, 18, ${(shadow.alpha * 0.34).toFixed(3)})`);
  gradient.addColorStop(1, "rgba(5, 12, 18, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawGroundShadows(now) {
  tankContext.save();
  tankContext.globalCompositeOperation = "multiply";
  tankContext.beginPath();
  tankContext.rect(
    GLASS_MARGIN_X,
    WATER_SURFACE_Y,
    TANK_WIDTH - GLASS_MARGIN_X * 2,
    getVisibleTankFloorBottomY() - WATER_SURFACE_Y + 12
  );
  tankContext.clip();
  if (areDecorShadowsEnabled()) {
    for (const item of state.placedDecor) {
      drawDecorContactShadow(tankContext, item);
    }
  }
  pruneFishShadowPlaneCache();
  for (const fish of state.fish) {
    const species = getSpeciesForFish(fish);
    const image = species ? runtime.images.get(getFishDisplayAssetPath(fish, species, now) || species.asset) : null;
    if (!species || !image || getEffectiveFishBehavior(fish, species) === "sucker") {
      continue;
    }

    const pose = getFishPose(fish, species, now);
    const width = getFishDisplayWidth(fish, species, now);
    const height = width * (image.height / image.width);
    const shadowPlaneY = getSmoothedFishShadowPlaneY(fish, getFishShadowLayerPlaneY(fish), now);
    drawFishProjectedShadow(
      tankContext,
      pose.x,
      pose.y + height * 0.14,
      width,
      height,
      0.15,
      species.shadowScale || 0.28,
      shadowPlaneY
    );
  }
  tankContext.restore();
}

function drawFishProjectedShadow(context, x, objectBottomY, width, height, opacity, widthScale, planeY = null) {
  const floorY = Number.isFinite(planeY) ? planeY : getTankFloorSurfaceYAtX(x) + 7;
  const heightAboveFloor = Math.max(0, floorY - objectBottomY);
  const shadowFadeDistance = clamp(height * 3.2 + 80, 150, 360);
  const proximity = clamp(1 - heightAboveFloor / shadowFadeDistance, 0, 1);
  if (proximity <= 0.015) {
    return;
  }
  const baseWidth = width * clamp(widthScale, 0.14, 0.3) * 0.82;
  const altitudeStretch = Math.min(width * 0.035, heightAboveFloor * 0.018);
  const shadowWidth = clamp(baseWidth + altitudeStretch, 12, Math.max(26, width * 0.3));
  const shadowHeight = Math.max(5, shadowWidth * 0.14);
  const offsetX = 8 + Math.min(18, heightAboveFloor * 0.045);
  const alpha = clamp(opacity * 0.92 * Math.pow(proximity, 1.35), 0, opacity * 0.92);
  context.fillStyle = `rgba(6, 15, 24, ${alpha.toFixed(3)})`;
  context.beginPath();
  context.ellipse(x + offsetX, floorY, shadowWidth, shadowHeight, -0.08, 0, Math.PI * 2);
  context.fill();
}

function drawDecorImageLayer(image, drawX, drawY, width, height, item, now, motion = null, alpha = 1) {
  if (isTransitTubeDecorKey(item?.decorKey) && normalizeDecorColorSetting(item?.transitTubeColor || "")) {
    const decor = runtime.decorMap.get(item.decorKey);
    const imagePath = image === runtime.images.get(decor?.bgPath) ? decor.bgPath : decor?.path;
    drawDecorColorLayerImageToContext(tankContext, image, imagePath || "", item.transitTubeColor, true, drawX, drawY, width, height, item, now, motion, alpha);
    return;
  }
  if (isTankLightsOut(now) && isSpookyDecorItem(item)) {
    tankContext.save();
    tankContext.filter = "brightness(118%) saturate(112%) drop-shadow(0 0 12px rgba(118, 210, 180, 0.28))";
    drawDecorImageLayerToContext(tankContext, image, drawX, drawY, width, height, item, now, motion, alpha);
    tankContext.restore();
    return;
  }
  drawDecorImageLayerToContext(tankContext, image, drawX, drawY, width, height, item, now, motion, alpha);
}

function drawCaveBackgroundLayerToContext(context, item, decor, now, options = {}) {
  const bgImage = decor?.bgPath ? runtime.images.get(decor.bgPath) : null;
  if (!bgImage) {
    return false;
  }

  const width = Number.isFinite(Number(options.width)) ? Number(options.width) : getDecorDisplayWidth(decor, item);
  const baseImage = runtime.images.get(decor.path);
  const baseHeight = Number.isFinite(Number(options.baseHeight))
    ? Number(options.baseHeight)
    : width * ((baseImage?.height || 1) / Math.max(1, baseImage?.width || 1));
  const bgHeight = width * (bgImage.height / Math.max(1, bgImage.width));
  const drawX = Number.isFinite(Number(options.drawX)) ? Number(options.drawX) : (item.xNorm * TANK_WIDTH - width / 2);
  const drawY = Number.isFinite(Number(options.bgDrawY))
    ? Number(options.bgDrawY)
    : Number.isFinite(Number(options.drawY))
      ? Number(options.drawY) + (baseHeight - bgHeight)
      : (item.yNorm * TANK_HEIGHT - bgHeight);
  const motion = options.motion || getDecorMotion(item, now);
  const alpha = Number.isFinite(Number(options.alpha)) ? options.alpha : 1;
  const settings = hasDecorCaveColorLayers(decor) ? getPlacedCaveColorSettings(item, decor) : {};
  const colorizeSettings = hasDecorCaveColorLayers(decor) ? getPlacedCaveColorizeSettings(item, decor) : {};
  drawDecorColorLayerImageToContext(context, bgImage, decor.bgPath, settings.color1, colorizeSettings.color1, drawX, drawY, width, bgHeight, item, now, motion, alpha);
  return true;
}

function drawCaveColorLayersToContext(context, item, decor, now, options = {}) {
  const layers = getVisibleDecorColorLayers(decor);
  if (!layers.length) {
    return false;
  }

  const width = Number.isFinite(Number(options.width)) ? Number(options.width) : getDecorDisplayWidth(decor, item);
  const baseImage = runtime.images.get(decor.path);
  const height = Number.isFinite(Number(options.height))
    ? Number(options.height)
    : width * ((baseImage?.height || 1) / Math.max(1, baseImage?.width || 1));
  const drawX = Number.isFinite(Number(options.drawX)) ? Number(options.drawX) : (item.xNorm * TANK_WIDTH - width / 2);
  const drawY = Number.isFinite(Number(options.drawY)) ? Number(options.drawY) : (item.yNorm * TANK_HEIGHT - height);
  const motion = options.motion || getDecorMotion(item, now);
  const alpha = Number.isFinite(Number(options.alpha)) ? options.alpha : 1;
  const settings = getPlacedCaveColorSettings(item, decor);
  const colorizeSettings = getPlacedCaveColorizeSettings(item, decor);
  let drewLayer = false;

  for (const layer of layers) {
    const layerPath = resolveDecorColorLayerPath(layer);
    const layerImage = runtime.images.get(layerPath);
    if (!layerImage) {
      continue;
    }

    drawDecorColorLayerImageToContext(context, layerImage, layerPath, settings[layer.id], colorizeSettings[layer.id], drawX, drawY, width, height, item, now, motion, alpha);
    drewLayer = true;
  }

  return drewLayer;
}

function getDecorSameLayerRenderPriority(item) {
  return canConfigureDecorBubbler(item) ? 1 : 0;
}

function comparePlacedDecorDrawOrder(left, right) {
  const priorityDelta = getDecorSameLayerRenderPriority(left) - getDecorSameLayerRenderPriority(right);
  if (priorityDelta) {
    return priorityDelta;
  }

  return left.yNorm - right.yNorm;
}

function comparePlacedDecorHitOrder(left, right) {
  const layerDelta = getDecorTankLayer(left) - getDecorTankLayer(right);
  if (layerDelta) {
    return layerDelta;
  }

  const priorityDelta = getDecorSameLayerRenderPriority(right) - getDecorSameLayerRenderPriority(left);
  if (priorityDelta) {
    return priorityDelta;
  }

  return right.yNorm - left.yNorm;
}

function drawDecor(layer = null, now = Date.now()) {
  const sorted = [...state.placedDecor]
    .filter((item) => {
      if (layer === null) {
        return true;
      }

      const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));
      return layer >= span.min && layer <= span.max;
    })
    .sort(comparePlacedDecorDrawOrder);

  for (const item of sorted) {
    const decor = runtime.decorMap.get(item.decorKey);
    if (!decor) {
      continue;
    }

    const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));

    let imagePath = decor.path;

    if (isCaveDecorKey(item.decorKey) || isTransitTubeDecorKey(item.decorKey)) {
      if (layer === span.back && decor.bgPath) {
        imagePath = decor.bgPath;
      } else if (layer === span.front) {
        imagePath = decor.path;
      } else {
        continue;
      }
    } else if (layer !== null && layer !== span.front) {
      continue;
    }

    const image = runtime.images.get(imagePath);
    if (!image) {
      continue;
    }

    const width = getDecorDisplayWidth(decor, item);
    const height = width * (image.height / image.width);
    const x = item.xNorm * TANK_WIDTH;
    const y = item.yNorm * TANK_HEIGHT;
    const drawX = x - width / 2;
    const drawY = y - height;
    const motion = getDecorMotion(item, now);
    if (layer === span.front && decor.bubbler) {
      const bgImage = decor.bgPath ? runtime.images.get(decor.bgPath) : null;
      if (bgImage) {
        const bgHeight = width * (bgImage.height / bgImage.width);
        if (!drawCaveBackgroundLayerToContext(tankContext, item, decor, now, {
          drawX,
          bgDrawY: y - bgHeight,
          width,
          baseHeight: height,
          motion
        })) {
          drawDecorImageLayer(bgImage, drawX, y - bgHeight, width, bgHeight, item, now, motion);
        }
      }
      drawDecorBubblerEffect(item, decor, image, now);
      if (!isCustomBubblerDecorKey(item.decorKey) || runtime.editTankMode) {
        if (!drawCaveColorLayersToContext(tankContext, item, decor, now, {
          drawX,
          drawY,
          width,
          height,
          motion
        })) {
          drawDecorImageLayer(image, drawX, drawY, width, height, item, now, motion);
        }
      }
      continue;
    }

    if (layer === span.back && (hasDecorCaveColorLayers(decor) || isTransitTubeDecorKey(item.decorKey))) {
      const bgHeight = width * (image.height / Math.max(1, image.width));
      if (isTransitTubeDecorKey(item.decorKey)) {
        drawDecorImageLayer(image, drawX, drawY, width, height, item, now, motion);
        continue;
      }
      if (drawCaveBackgroundLayerToContext(tankContext, item, decor, now, {
        drawX,
        bgDrawY: y - bgHeight,
        width,
        baseHeight: height,
        motion
      })) {
        continue;
      }
    }

    if (layer === span.front && hasDecorCaveColorLayers(decor)) {
      if (drawCaveColorLayersToContext(tankContext, item, decor, now, {
        drawX,
        drawY,
        width,
        height,
        motion
      })) {
        continue;
      }
    }

    drawDecorImageLayer(image, drawX, drawY, width, height, item, now, motion);
  }
}

function drawDecorPreview() {
  if (!runtime.placementMode || runtime.dragState || !runtime.placementPreview) {
    return;
  }

  const decor = runtime.decorMap.get(runtime.placementMode.decorKey);
  if (!decor) {
    return;
  }

  const image = runtime.images.get(decor.path);
  if (!image) {
    return;
  }

  const width = getDecorDisplayWidth(decor, Number(runtime.placementMode.scale) || getDecorScaleDefault(decor.key));
  const height = width * (image.height / image.width);
  const x = runtime.placementPreview.xNorm * TANK_WIDTH;
  const y = runtime.placementPreview.yNorm * TANK_HEIGHT;
  const previewLayer = runtime.placementMode.tankLayer || runtime.decorPlacementLayer;

  tankContext.save();
  tankContext.globalAlpha = 0.72;
  tankContext.fillStyle = "rgba(120, 215, 235, 0.18)";
  tankContext.beginPath();
  tankContext.ellipse(x, y + 3, width * 0.34, Math.max(10, width * 0.08), 0, 0, Math.PI * 2);
  tankContext.fill();
  const previewItem = {
    id: "placement-preview",
    decorKey: decor.key,
    xNorm: runtime.placementPreview.xNorm,
    yNorm: runtime.placementPreview.yNorm,
    scale: Number(runtime.placementMode.scale) || getDecorScaleDefault(decor.key),
    tankLayer: previewLayer,
    flipped: Boolean(runtime.placementMode.flipped),
    flippedY: Boolean(runtime.placementMode.flippedY)
  };
  const previewMotion = getDecorMotion(previewItem, Date.now());
  if ((decor.bubbler || isCaveDecorKey(decor.key) || hasDecorCaveColorLayers(decor)) && decor.bgPath) {
    if (hasDecorCaveColorLayers(decor)) {
      drawCaveBackgroundLayerToContext(tankContext, previewItem, decor, Date.now(), {
        drawX: x - width / 2,
        drawY: y - height,
        width,
        baseHeight: height,
        motion: previewMotion,
        alpha: 0.72
      });
    } else {
      const bgImage = runtime.images.get(decor.bgPath);
      if (bgImage) {
        const bgHeight = width * (bgImage.height / bgImage.width);
        drawDecorImageLayer(bgImage, x - width / 2, y - bgHeight, width, bgHeight, previewItem, Date.now(), previewMotion, 0.72);
      }
    }
  }
  if (decor.bubbler) {
    drawDecorBubblerEffect(
      previewItem,
      decor,
      image,
      Date.now(),
      { alphaScale: 0.72 }
    );
  }
  if (hasDecorCaveColorLayers(decor)) {
    drawCaveColorLayersToContext(tankContext, previewItem, decor, Date.now(), {
      drawX: x - width / 2,
      drawY: y - height,
      width,
      height,
      motion: previewMotion,
      alpha: 0.72
    });
    tankContext.restore();
    return;
  }
  drawDecorImageLayer(image, x - width / 2, y - height, width, height, previewItem, Date.now(), previewMotion, 0.72);
  tankContext.restore();
}

function shouldShowDecorSwimGuide() {
  return Boolean(runtime.editTankMode && (runtime.placementMode || runtime.dragState));
}

function getFishMaxSwimGuideY(now = Date.now()) {
  const activeDecorTarget = getActiveDecorShortcutTarget();
  if (activeDecorTarget?.mode === "placement" && runtime.placementMode) {
    return getTankLayerBottomBoundaryY(runtime.placementMode.tankLayer || runtime.decorPlacementLayer);
  }
  if (activeDecorTarget?.item) {
    return getTankLayerBottomBoundaryY(getDecorTankLayer(activeDecorTarget.item));
  }

  if (!state?.fish?.length) {
    return null;
  }

  let guideY = null;
  for (const fish of state.fish) {
    if (!fish || isFishDead(fish)) {
      continue;
    }

    const species = getSpeciesForFish(fish);
    if (!species || species.behavior === "sucker") {
      continue;
    }

    const maxCenterYNorm = 0.8;
    const footprint = getFishFootprintBoundsAtPose(
      fish,
      species,
      now,
      {
        x: TANK_WIDTH * 0.5,
        y: maxCenterYNorm * TANK_HEIGHT,
        swayX: 0
      }
    );
    if (!footprint) {
      continue;
    }

    guideY = guideY === null ? footprint.bottom : Math.max(guideY, footprint.bottom);
  }

  return guideY;
}

function drawDecorSwimGuide(now = Date.now()) {
  if (!shouldShowDecorSwimGuide()) {
    return;
  }

  const guideY = getFishMaxSwimGuideY(now);
  if (!Number.isFinite(guideY)) {
    return;
  }

  const shellBounds = getTankShellBounds();
  const startX = shellBounds.innerLeft + 18;
  const endX = shellBounds.innerLeft + shellBounds.innerWidth - 18;
  const clampedGuideY = clamp(guideY, shellBounds.innerTop + 18, shellBounds.innerTop + shellBounds.innerHeight - 6);

  tankContext.save();
  tankContext.lineWidth = getViewportPxAsTankVirtual(3);
  tankContext.setLineDash([getViewportPxAsTankVirtual(14), getViewportPxAsTankVirtual(10)]);
  tankContext.strokeStyle = "rgba(255, 72, 72, 0.72)";
  tankContext.shadowColor = "rgba(255, 72, 72, 0.24)";
  tankContext.shadowBlur = getViewportPxAsTankVirtual(8);
  tankContext.beginPath();
  tankContext.moveTo(startX, clampedGuideY);
  tankContext.lineTo(endX, clampedGuideY);
  tankContext.stroke();
  tankContext.setLineDash([]);
  tankContext.restore();
}

function drawActiveDecorLayerCue() {
  const selectedDecor = runtime.editTankMode ? getSelectedPlacedDecor() : null;
  if (runtime.editTankMode) {
    const selectedItems = getSelectedPlacedDecorItems();
    for (const item of selectedItems) {
      drawSelectedDecorHighlight(item);
    }
  }

  if (runtime.placementMode && runtime.placementPreview && !runtime.dragState) {
    const decor = runtime.decorMap.get(runtime.placementMode.decorKey);
    const image = decor ? runtime.images.get(decor.path) : null;
    if (decor && image) {
      const width = getDecorDisplayWidth(decor, Number(runtime.placementMode.scale) || getDecorScaleDefault(decor.key));
      const height = width * (image.height / image.width);
      drawDecorLayerBadge(
        runtime.placementPreview.xNorm * TANK_WIDTH,
        runtime.placementPreview.yNorm * TANK_HEIGHT - height - 16,
        runtime.placementMode.tankLayer || runtime.decorPlacementLayer,
        runtime.placementMode.decorKey
      );
    }
  }

  if (runtime.dragState) {
    const item = state.placedDecor.find((entry) => entry.id === runtime.dragState.placedId);
    const decor = item ? runtime.decorMap.get(item.decorKey) : null;
    const image = decor ? runtime.images.get(decor.path) : null;
    if (item && decor && image) {
      const width = getDecorDisplayWidth(decor, item);
      const height = width * (image.height / image.width);
      drawDecorLayerBadge(
        item.xNorm * TANK_WIDTH,
        item.yNorm * TANK_HEIGHT - height - 16,
        runtime.dragState.tankLayer ?? item.tankLayer ?? DEFAULT_TANK_LAYER,
        item.decorKey
      );
    }
    return;
  }

  if (selectedDecor) {
    if (!dom.selectedDecorSettingsButton && canOpenDecorSettings(selectedDecor)) {
      drawDecorSettingsBadge(selectedDecor);
    }
  }
}

function drawDecorSettingsBadge(item) {
  const bounds = getPlacedDecorOpaqueBounds(item);
  if (!bounds) {
    return;
  }

  const text = "[S] Settings";
  const x = (bounds.left + bounds.right) / 2;
  const y = Math.min(TANK_HEIGHT - 18, Math.max(WATER_SURFACE_Y + 18, bounds.bottom + 18));

  tankContext.save();
  tankContext.font = "800 11px Trebuchet MS";
  tankContext.textAlign = "center";
  tankContext.textBaseline = "middle";
  const width = Math.ceil(tankContext.measureText(text).width) + 18;
  const height = 22;
  tankContext.fillStyle = "rgba(6, 16, 24, 0.82)";
  tankContext.strokeStyle = "rgba(156, 241, 255, 0.74)";
  tankContext.lineWidth = 1.2;
  tankContext.shadowColor = "rgba(104, 232, 255, 0.32)";
  tankContext.shadowBlur = 12;
  tankContext.beginPath();
  tankContext.roundRect(x - width / 2, y - height / 2, width, height, 8);
  tankContext.fill();
  tankContext.stroke();
  tankContext.shadowBlur = 0;
  tankContext.fillStyle = "rgba(234, 248, 255, 0.96)";
  tankContext.fillText(text, x, y + 0.5);
  tankContext.restore();
}

function drawSelectedDecorHighlight(item) {
  const bounds = getPlacedDecorOpaqueBounds(item);
  if (!bounds) {
    return;
  }

  const padding = 10;
  const left = bounds.left - padding;
  const top = bounds.top - padding;
  const width = bounds.right - bounds.left + padding * 2;
  const height = bounds.bottom - bounds.top + padding * 2;
  const cornerSize = Math.min(18, Math.max(10, Math.min(width, height) * 0.14));

  tankContext.save();
  tankContext.fillStyle = "rgba(104, 232, 255, 0.08)";
  tankContext.strokeStyle = "rgba(156, 241, 255, 0.95)";
  tankContext.lineWidth = 2.5;
  tankContext.shadowColor = "rgba(104, 232, 255, 0.4)";
  tankContext.shadowBlur = 18;
  tankContext.fillRect(left, top, width, height);
  tankContext.strokeRect(left, top, width, height);
  tankContext.shadowBlur = 8;
  tankContext.fillStyle = "rgba(10, 99, 126, 0.95)";
  tankContext.strokeStyle = "rgba(238, 253, 255, 0.98)";
  for (const [x, y] of [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height]
  ]) {
    tankContext.fillRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
    tankContext.strokeRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
  }
  tankContext.restore();
}

function drawDecorLayerBadge(x, y, layer, decorKey = "") {
  tankContext.save();
  tankContext.font = "700 12px Trebuchet MS";
  tankContext.textAlign = "center";
  tankContext.textBaseline = "middle";

  const span = getDecorLayerSpan(decorKey, layer);
  const text = span.label;
  const now = Date.now();
  const pulseActive = runtime.layerLimitPulseUntil > now && runtime.layerLimitPulseLayer === clampTankLayer(layer);
  const pulseElapsed = Math.max(0, now - (runtime.layerLimitPulseStartedAt || now));
  const pulseStrength = pulseActive
    ? 0.45 + Math.abs(Math.sin((pulseElapsed / LAYER_LIMIT_PULSE_MS) * Math.PI * 3)) * 0.55
    : 0;

  const width = Math.ceil(tankContext.measureText(text).width) + 16;
  const height = 20;
  tankContext.fillStyle = pulseActive
    ? `rgba(88, 8, 12, ${0.72 + pulseStrength * 0.18})`
    : "rgba(6, 16, 24, 0.78)";
  tankContext.beginPath();
  tankContext.roundRect(x - width / 2, y - height / 2, width, height, 9);
  tankContext.fill();
  tankContext.strokeStyle = pulseActive
    ? `rgba(255, 74, 74, ${0.62 + pulseStrength * 0.38})`
    : "rgba(198, 236, 247, 0.32)";
  tankContext.lineWidth = pulseActive ? 1.8 : 1;
  tankContext.shadowColor = pulseActive ? "rgba(255, 52, 52, 0.65)" : "transparent";
  tankContext.shadowBlur = pulseActive ? 10 + pulseStrength * 10 : 0;
  tankContext.stroke();
  tankContext.fillStyle = pulseActive
    ? "rgba(255, 236, 236, 0.98)"
    : "rgba(234, 248, 255, 0.96)";
  tankContext.fillText(text, x, y + 0.5);
  tankContext.restore();
}
