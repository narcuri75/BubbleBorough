// Source fragment: rendering/decor.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function drawDecorColorLayerImageToContext(context, sourceImage, imagePath, colorSetting, colorizeSetting, drawX, drawY, width, height, item, now, motion, alpha = 1) {
  if (!sourceImage) {
    return false;
  }

  const normalizedSetting = normalizeDecorColorSetting(colorSetting);
  const colorize = normalizeDecorColorizeSetting(colorizeSetting);
  // Keep the source layer's role even when tinting replaces it with a canvas.
  const receivesCaustics = imagePath !== runtime.decorMap.get(item?.decorKey)?.bgPath;
  if (isDecorRgbColorSetting(normalizedSetting)) {
    if ("filter" in context) {
      context.save();
      context.filter = colorize ? getDecorRgbColorizeFilter(now) : getDecorRgbCycleFilter(now);
      drawDecorImageLayerToContext(context, sourceImage, drawX, drawY, width, height, item, now, motion, alpha, receivesCaustics);
      context.restore();
      return true;
    }

    const fallbackImage = getTintedCaveLayerImage(imagePath, getDecorRgbCycleColor(now), {
      colorize,
      sourceImage
    }) || sourceImage;
    drawDecorImageLayerToContext(context, fallbackImage, drawX, drawY, width, height, item, now, motion, alpha, receivesCaustics);
    return true;
  }

  const image = getTintedCaveLayerImage(imagePath, normalizedSetting, {
    colorize,
    sourceImage
  }) || sourceImage;
  drawDecorImageLayerToContext(context, image, drawX, drawY, width, height, item, now, motion, alpha, receivesCaustics);
  return true;
}

function getTintedBubblerLightImage(imagePath, color, sourceImage = null) {
  const image = sourceImage || runtime.images.get(imagePath);
  if (!image) {
    return null;
  }

  const resolvedColor = normalizeHexColor(color) || DEFAULT_BUBBLER_LIGHT_COLOR;
  const cacheKey = `${imagePath}|${resolvedColor}`;
  const cached = runtime.bubblerLightTintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const width = Math.max(1, Number(image.naturalWidth || image.width) || 1);
  const height = Math.max(1, Number(image.naturalHeight || image.height) || 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return image;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  context.globalCompositeOperation = "source-in";
  const centerX = width * 0.5;
  const centerY = height * 0.56;
  const innerRadius = Math.max(1, Math.min(width, height) * 0.025);
  const outerRadius = Math.max(width, height) * 0.68;
  const gradient = context.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
  gradient.addColorStop(0, resolvedColor);
  gradient.addColorStop(0.32, resolvedColor);
  gradient.addColorStop(0.68, "#180B05");
  gradient.addColorStop(1, "#000000");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";

  setBoundedCanvasCache(runtime.bubblerLightTintCache, cacheKey, canvas, { maxEntries: 12, maxBytes: 24 * 1024 * 1024 });
  return canvas;
}

function getBubblerLightFlickerAlpha(item, now = Date.now()) {
  const phase = (Number(item?.xNorm) || 0) * 13.7 + (Number(item?.yNorm) || 0) * 8.3;
  const slowPulse = Math.sin(now / 235 + phase) * 0.075;
  const quickFlicker = Math.sin(now / 67 + phase * 1.9) * 0.035;
  const tinyFlicker = Math.sin(now / 31 + phase * 3.1) * 0.018;
  const occasionalDip = Math.max(0, Math.sin(now / 149 + phase * 2.4) - 0.9) * 0.48;
  return clamp(0.9 + slowPulse + quickFlicker + tinyFlicker - occasionalDip, 0.68, 1);
}

function drawBubblerLightLayerToContext(context, item, decor, now = Date.now(), options = {}) {
  if (typeof isPlacedDecorFunctionallyActive === "function" && !isPlacedDecorFunctionallyActive(item, getCurrentTank())) {
    return false;
  }
  const lightPath = getDecorBubblerLightPath(item);
  if (!lightPath) {
    return false;
  }

  const sourceImage = runtime.images.get(lightPath);
  if (!sourceImage) {
    return false;
  }

  const settings = getPlacedDecorBubblerSettings(item);
  const lightImage = getTintedBubblerLightImage(
    lightPath,
    settings?.lightColor || DEFAULT_BUBBLER_LIGHT_COLOR,
    sourceImage
  );
  if (!lightImage) {
    return false;
  }

  const width = Number.isFinite(Number(options.width))
    ? Number(options.width)
    : getDecorDisplayWidth(decor, item);
  const height = Number.isFinite(Number(options.height))
    ? Number(options.height)
    : width * ((sourceImage.height || 1) / Math.max(1, sourceImage.width || 1));
  let drawX = Number.isFinite(Number(options.drawX))
    ? Number(options.drawX)
    : item.xNorm * TANK_WIDTH - width / 2;
  let drawY = Number.isFinite(Number(options.drawY))
    ? Number(options.drawY)
    : item.yNorm * TANK_HEIGHT - height;
  const motion = options.motion || getDecorMotion(item, now);
  const baseAlpha = Number.isFinite(Number(options.alpha)) ? clamp(Number(options.alpha), 0, 1) : 1;
  const flickerAlpha = getBubblerLightFlickerAlpha(item, now);

  context.save();
  const depthLayer = getDecorTankLayer(item);
  const depthLightImage = getTankDepthTreatedImage(lightImage, depthLayer) || lightImage;
  context.globalAlpha = baseAlpha * flickerAlpha * getTankDepthObjectAlpha(depthLayer);
  const flipX = isDecorHorizontallyFlipped(item);
  const flipY = isDecorVerticallyFlipped(item);
  if (flipX || flipY) {
    context.translate(flipX ? drawX + width : 0, flipY ? drawY + height : 0);
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    drawX = flipX ? 0 : drawX;
    drawY = flipY ? 0 : drawY;
  }
  drawDecorMotionImageToContext(context, depthLightImage, drawX, drawY, width, height, item, now, motion);
  context.restore();
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

function drawDecorImageLayerToContext(context, image, drawX, drawY, width, height, item, now, motion = null, alpha = 1, receivesCaustics = image !== runtime.images.get(runtime.decorMap.get(item?.decorKey)?.bgPath)) {
  if (!image) {
    return;
  }

  const baseMotion = motion || getDecorMotion(item, now);
  const motionLayer = getDecorMotionLayer(item);
  const renderedLayer = receivesCaustics ? "front" : "bg";
  const resolvedMotion = motionLayer === "all" || motionLayer === renderedLayer
    ? baseMotion
    : { ...baseMotion, isFloating: false, isSeaweed: false, isLure: false, customMotionType: "", bobX: 0, bobY: 0 };
  context.save();
  const depthLayer = getDecorTankLayer(item);
  // Decor artwork must never be faded by game state, depth, inactivity, or
  // placement-preview alpha. The alpha channel authored into the source image
  // is the only transparency allowed on decor artwork.
  context.globalAlpha = 1;
  const flipX = isDecorHorizontallyFlipped(item);
  const flipY = isDecorVerticallyFlipped(item);
  drawTankDepthAwareImageToContext(
    context,
    image,
    depthLayer,
    { left: drawX, top: drawY, width, height },
    (renderContext, renderImage, passType) => {
      renderContext.save();
      let renderX = drawX;
      let renderY = drawY;
      if (flipX || flipY) {
        renderContext.translate(flipX ? drawX + width : 0, flipY ? drawY + height : 0);
        renderContext.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        renderX = flipX ? 0 : drawX;
        renderY = flipY ? 0 : drawY;
      }
      drawDecorMotionImageToContext(renderContext, renderImage, renderX, renderY, width, height, item, now, resolvedMotion);
      if (passType === "depth") {
        markLightweightCausticDecorImage(renderContext, renderImage, renderX, renderY, width, height, item, now, resolvedMotion, receivesCaustics);
      }
      renderContext.restore();
    }
  );
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
  const depthMovementMultiplier = getTankDepthMovementMultiplier(getDecorTankLayer(item));
  const customMotionIntensity = motionSettings.swayIntensity * depthMovementMultiplier;
  const isLure = Boolean(capabilities.isLure);
  const lureBobX = isLure && capabilities.hasBob
    ? (Math.sin(now / (980 / motionSettings.bobSpeed) + phase * 0.85) * 2.1 + Math.sin(now / (1630 / motionSettings.bobSpeed) + phase * 1.4) * 0.7) * motionSettings.bobIntensity
    : 0;
  const lureBobY = isLure && capabilities.hasBob
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
    swayIntensity: motionSettings.swayIntensity * depthMovementMultiplier,
    bobIntensity: motionSettings.bobIntensity * depthMovementMultiplier,
    swaySpeed: motionSettings.swaySpeed,
    bobSpeed: motionSettings.bobSpeed,
    phase,
    bobX: (isLure ? lureBobX : isFloating ? Math.sin(now / (980 / motionSettings.bobSpeed) + phase * 0.85) * 0.8 * motionSettings.bobIntensity : 0) * depthMovementMultiplier,
    bobY: (isLure ? lureBobY : isFloating ? Math.sin(now / (760 / motionSettings.bobSpeed) + phase) * 1.4 * motionSettings.bobIntensity : 0) * depthMovementMultiplier
  };
}

function getFishShadowLayerPlaneY(fish) {
  const floorY = getTankFloorSurfaceYAtX((fish?.xNorm || 0.5) * TANK_WIDTH) + 7;
  return clamp(floorY, WATER_SURFACE_Y + 24, getVisibleTankFloorBottomY() + 8);
}

function getShadowSilhouetteCanvas(image) {
  if (!isUsableRuntimeImage(image)) return null;
  if (!(runtime.shadowSilhouetteCache instanceof WeakMap)) runtime.shadowSilhouetteCache = new WeakMap();
  const cached = runtime.shadowSilhouetteCache.get(image);
  if (cached) return cached;

  const maxDimension = Math.max(1, image.width, image.height);
  // Shadows are flattened and low-detail; 256px preserves their contour while
  // bounding retained canvas memory when many fish variants are encountered.
  const scale = Math.min(1, 256 / maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = "rgb(3, 9, 14)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minY = canvas.height;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (pixels[(y * canvas.width + x) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  canvas.shadowAlphaBounds = maxY >= minY ? { minY, maxY } : { minY: 0, maxY: canvas.height - 1 };
  runtime.shadowSilhouetteCache.set(image, canvas);
  return canvas;
}

function drawProjectedSilhouette(context, options = {}) {
  const image = options.image;
  const silhouette = getShadowSilhouetteCanvas(image);
  const width = Math.max(1, Number(options.width) || 1);
  const height = Math.max(1, Number(options.height) || 1);
  const anchorSourceV = clamp(Number(options.anchorSourceV) || 0.5, 0, 1);
  const flipX = options.flipX === true;
  const flipY = options.flipY === true;
  const opacity = clamp(Number(options.opacity) || 0, 0, 1);
  if (!silhouette || opacity <= 0.001) return false;

  const sourceWidth = silhouette.width;
  const sourceHeight = silhouette.height;
  const displayAnchorV = flipY ? 1 - anchorSourceV : anchorSourceV;
  const flipYOffset = flipY ? 1 : 0;
  const signX = flipX ? -1 : 1;
  const signY = flipY ? -1 : 1;
  const depth = clamp(Number(options.depth) || 0.24, 0.03, 0.72);
  const shear = clamp(Number(options.shear) || 0.13, -0.45, 0.45);
  const drawX = Number(options.drawX) || 0;
  const planeY = Number(options.planeY) || 0;

  // Project every opaque pixel backward from the authored contact line. This
  // preserves rounded bodies, gaps in arches, and the real width of the art.
  const a = signX * width / sourceWidth;
  const b = 0;
  const c = -signY * height * shear / sourceHeight;
  const d = signY * height * depth / sourceHeight;
  const e = drawX + (flipX ? width : 0) + (displayAnchorV - flipYOffset) * height * shear;
  const f = planeY - (displayAnchorV - flipYOffset) * height * depth;
  const anchorPx = anchorSourceV * sourceHeight;

  context.save();
  context.globalCompositeOperation = options.composite || "multiply";
  context.globalAlpha *= opacity;
  context.transform(a, b, c, d, e, f);
  context.beginPath();
  if (flipY) context.rect(0, anchorPx, sourceWidth, Math.max(0, sourceHeight - anchorPx));
  else context.rect(0, 0, sourceWidth, Math.max(0, anchorPx));
  context.clip();
  context.drawImage(silhouette, 0, 0);
  context.restore();
  return true;
}

function getDecorShadowAnchorSourceV(item, decor) {
  const anchorPath = decor?.shadowFootprintPath || decor?.path;
  const mask = typeof getImageAlphaMask === "function" ? getImageAlphaMask(anchorPath) : null;
  if (!mask?.bounds || !mask.height) return isDecorVerticallyFlipped(item) ? 0 : 1;
  return isDecorVerticallyFlipped(item)
    ? mask.bounds.minY / mask.height
    : (mask.bounds.maxY + 1) / mask.height;
}

function getDecorMainImageContactRuns(item, decor, anchorSourceV) {
  const mask = typeof getImageAlphaMask === "function" ? getImageAlphaMask(decor?.path) : null;
  if (!mask?.bounds || !mask.alpha) return [];
  if (!(runtime.decorMainContactRunCache instanceof WeakMap)) runtime.decorMainContactRunCache = new WeakMap();
  let variants = runtime.decorMainContactRunCache.get(mask);
  if (!variants) {
    variants = new Map();
    runtime.decorMainContactRunCache.set(mask, variants);
  }
  const flippedY = isDecorVerticallyFlipped(item);
  const cacheKey = `${flippedY ? 1 : 0}:${Number(anchorSourceV).toFixed(4)}`;
  if (variants.has(cacheKey)) return variants.get(cacheKey);
  const anchorY = clamp(Math.round(anchorSourceV * mask.height), 0, mask.height - 1);
  const tolerance = clamp(Math.round(mask.height * 0.035), 2, 12);
  const opaqueColumns = [];
  for (let x = mask.bounds.minX; x <= mask.bounds.maxX; x += 1) {
    let opaque = false;
    for (let offset = 0; offset <= tolerance && !opaque; offset += 1) {
      const y = clamp(anchorY + (flippedY ? offset : -offset), 0, mask.height - 1);
      opaque = mask.alpha[(y * mask.width + x) * 4 + 3] >= ALPHA_HIT_THRESHOLD;
    }
    opaqueColumns.push({ x, opaque });
  }
  const runs = [];
  let start = null;
  for (const column of [...opaqueColumns, { x: mask.bounds.maxX + 1, opaque: false }]) {
    if (column.opaque && start === null) start = column.x;
    if (!column.opaque && start !== null) {
      if (column.x - start >= 2) runs.push({ left: start / mask.width, right: column.x / mask.width });
      start = null;
    }
  }
  variants.set(cacheKey, runs);
  return runs;
}

function registerDecorShadowSurface(item, decor, drawX, drawY, width, height) {
  const receiver = getPlacedDecorSurfaceReceiver(item);
  if (!receiver) return;
  if (!Array.isArray(runtime.shadowSurfaceReceivers)) runtime.shadowSurfaceReceivers = [];
  const existingIndex = runtime.shadowSurfaceReceivers.findIndex(entry => entry?.item?.id === item?.id);
  if (existingIndex >= 0) runtime.shadowSurfaceReceivers[existingIndex] = receiver;
  else runtime.shadowSurfaceReceivers.push(receiver);
}

function rebuildDecorShadowSurfaceReceivers() {
  runtime.shadowSurfaceReceivers = [];
  for (const item of state?.placedDecor || []) {
    const decor = runtime.decorMap.get(item?.decorKey);
    const image = decor ? runtime.images.get(decor.path) : null;
    if (!decor?.surfacePath || !isUsableRuntimeImage(image)) continue;
    const width = getDecorDisplayWidth(decor, item);
    const height = width * (image.height / Math.max(1, image.width));
    registerDecorShadowSurface(
      item,
      decor,
      item.xNorm * TANK_WIDTH - width / 2,
      item.yNorm * TANK_HEIGHT - height,
      width,
      height
    );
  }
}

function getShadowReceiverPlaneY(receiver, worldX, casterBottomY, contactTolerancePx = 8, casterHeight = 0) {
  // A placed object may rest anywhere inside the authored RGB surface region,
  // not only on its upper silhouette edge. Resolve that exact contact first so
  // its shadow begins beneath the object instead of being rejected as too far
  // from the mask's top boundary. Airborne fish still fall back to the leading
  // surface edge below them.
  const contactY = getDecorSurfaceMarkedYAtWorldX(
    receiver,
    worldX,
    casterBottomY - clamp(casterHeight * 0.48, contactTolerancePx, 180),
    casterBottomY + contactTolerancePx,
    casterBottomY
  );
  return Number.isFinite(contactY)
    ? contactY
    : getDecorSurfacePlaneYAtWorldX(receiver, worldX, casterBottomY, contactTolerancePx);
}

function drawCasterShadowOnDecorSurfaces(options = {}) {
  const receivers = runtime.shadowSurfaceReceivers;
  const image = options.image;
  if (!Array.isArray(receivers) || !receivers.length || !isUsableRuntimeImage(image)) return false;
  const width = Math.max(1, Number(options.width) || 1);
  const height = Math.max(1, Number(options.height) || 1);
  const centerX = Number(options.centerX) || 0;
  const casterBottomY = Number(options.bottomY) || 0;
  const casterLeft = Number.isFinite(Number(options.left)) ? Number(options.left) : centerX - width * 0.35;
  const casterRight = Number.isFinite(Number(options.right)) ? Number(options.right) : centerX + width * 0.35;
  const contactTolerancePx = options.freePlacementEnabled === true
    ? clamp(height * 0.18, 14, 42)
    : clamp(height * 0.1, 8, 24);
  for (let index = receivers.length - 1; index >= 0; index -= 1) {
    const receiver = receivers[index];
    if (options.casterId && receiver.item?.id === options.casterId) continue;
    if (Number.isFinite(Number(options.tankLayer)) && receiver.tankLayer !== clampTankLayer(options.tankLayer)) continue;
    const overlapLeft = Math.max(casterLeft, receiver.left);
    const overlapRight = Math.min(casterRight, receiver.left + receiver.width);
    if (overlapRight - overlapLeft < Math.min(5, width * 0.08)) continue;
    const sampleXs = [
      overlapLeft + 1,
      overlapLeft + (overlapRight - overlapLeft) * 0.25,
      (overlapLeft + overlapRight) * 0.5,
      overlapLeft + (overlapRight - overlapLeft) * 0.75,
      overlapRight - 1
    ];
    const planeCandidates = sampleXs
      .map(sampleX => getShadowReceiverPlaneY(receiver, sampleX, casterBottomY, contactTolerancePx, height))
      .filter(Number.isFinite);
    const planeY = planeCandidates.reduce((nearest, candidate) => (
      nearest === null || Math.abs(candidate - casterBottomY) < Math.abs(nearest - casterBottomY)
        ? candidate
        : nearest
    ), null);
    if (!Number.isFinite(planeY)) continue;
    const distance = Math.max(0, planeY - casterBottomY);
    const proximity = clamp(1 - distance / clamp(height * 2.8 + 60, 120, 380), 0, 1);
    if (proximity <= 0.03) continue;

    const scratchWidth = clamp(Math.ceil(receiver.width), 1, 1024);
    const scratchHeight = clamp(Math.ceil(receiver.height), 1, 1024);
    let scratch = runtime.surfaceShadowScratchCanvas;
    if (!scratch) {
      scratch = document.createElement("canvas");
      runtime.surfaceShadowScratchCanvas = scratch;
    }
    if (scratch.width !== scratchWidth || scratch.height !== scratchHeight) {
      scratch.width = scratchWidth;
      scratch.height = scratchHeight;
    }
    const scratchContext = scratch.getContext("2d");
    scratchContext.clearRect(0, 0, scratch.width, scratch.height);
    const scaleX = scratch.width / Math.max(1, receiver.width);
    const scaleY = scratch.height / Math.max(1, receiver.height);
    scratchContext.save();
    scratchContext.scale(scaleX, scaleY);
    scratchContext.translate(-receiver.left, -receiver.top);
    const silhouette = getShadowSilhouetteCanvas(image);
    const anchorSourceV = silhouette
      ? (silhouette.shadowAlphaBounds.maxY + 1) / silhouette.height
      : 1;
    drawProjectedSilhouette(scratchContext, {
      image,
      drawX: centerX - width / 2,
      width,
      height,
      planeY,
      anchorSourceV,
      flipX: options.flipX === true,
      depth: 0.22,
      shear: 0.11,
      opacity: clamp((Number(options.opacity) || 0.26) * Math.pow(proximity, 1.25), 0, 0.4),
      composite: "source-over"
    });
    const contactStrength = clamp(1 - distance / Math.max(8, contactTolerancePx * 1.5), 0, 1);
    if (contactStrength > 0.01) {
      const contactCenterX = clamp(centerX, overlapLeft, overlapRight);
      const contactRadiusX = clamp((overlapRight - overlapLeft) * 0.34, 5, width * 0.42);
      const contactRadiusY = clamp(contactRadiusX * 0.16, 2.5, 10);
      scratchContext.save();
      scratchContext.translate(contactCenterX, planeY - contactRadiusY * 0.35);
      scratchContext.scale(contactRadiusX, contactRadiusY);
      const surfaceContactGradient = scratchContext.createRadialGradient(0, 0, 0, 0, 0, 1);
      const contactAlpha = clamp((Number(options.opacity) || 0.26) * 1.7 * contactStrength, 0, 0.46);
      surfaceContactGradient.addColorStop(0, `rgba(3, 9, 14, ${contactAlpha.toFixed(4)})`);
      surfaceContactGradient.addColorStop(0.58, `rgba(3, 9, 14, ${(contactAlpha * 0.52).toFixed(4)})`);
      surfaceContactGradient.addColorStop(1, "rgba(3, 9, 14, 0)");
      scratchContext.fillStyle = surfaceContactGradient;
      scratchContext.beginPath();
      scratchContext.arc(0, 0, 1, 0, Math.PI * 2);
      scratchContext.fill();
      scratchContext.restore();
    }
    scratchContext.restore();
    scratchContext.globalCompositeOperation = "destination-in";
    scratchContext.save();
    if (receiver.flipX || receiver.flipY) {
      scratchContext.translate(receiver.flipX ? scratch.width : 0, receiver.flipY ? scratch.height : 0);
      scratchContext.scale(receiver.flipX ? -1 : 1, receiver.flipY ? -1 : 1);
    }
    scratchContext.drawImage(receiver.image, 0, 0, scratch.width, scratch.height);
    scratchContext.restore();
    scratchContext.globalCompositeOperation = "source-over";

    tankContext.save();
    tankContext.globalCompositeOperation = "multiply";
    tankContext.drawImage(scratch, receiver.left, receiver.top, receiver.width, receiver.height);
    tankContext.restore();
    return true;
  }
  return false;
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
  const activeFishIds = new Set((state?.fish || []).map((fish) => fish?.id).filter(Boolean));
  for (const fishId of runtime.fishShadowPlaneCache.keys()) {
    if (!activeFishIds.has(fishId)) {
      runtime.fishShadowPlaneCache.delete(fishId);
    }
  }
  for (const fishId of runtime.fishLayerTravelStepTransitions.keys()) {
    if (!activeFishIds.has(fishId)) {
      runtime.fishLayerTravelStepTransitions.delete(fishId);
    }
  }
  if (runtime.fishCollisionAvoidanceById instanceof Map) {
    for (const fishId of runtime.fishCollisionAvoidanceById.keys()) {
      if (!activeFishIds.has(fishId)) runtime.fishCollisionAvoidanceById.delete(fishId);
    }
  }
  if (runtime.fishNavigationMemoryById instanceof Map) {
    for (const fishId of runtime.fishNavigationMemoryById.keys()) {
      if (!activeFishIds.has(fishId)) runtime.fishNavigationMemoryById.delete(fishId);
    }
  }
  if (runtime.fishRightOfWayByPair instanceof Map) {
    const now = Date.now();
    for (const [key, decision] of runtime.fishRightOfWayByPair.entries()) {
      if (
        !decision
        || Number(decision.until) <= now
        || !activeFishIds.has(decision.winnerId)
        || !activeFishIds.has(decision.loserId)
      ) {
        runtime.fishRightOfWayByPair.delete(key);
      }
    }
  }
}

function getDecorContactSpans(item, decor) {
  const contactPath = decor?.shadowFootprintPath || decor?.path;
  const mask = typeof getImageAlphaMask === "function" ? getImageAlphaMask(contactPath) : null;
  if (!mask?.bounds || !mask.alpha) return null;
  if (!runtime.decorContactSpanCache) runtime.decorContactSpanCache = new WeakMap();
  let variants = runtime.decorContactSpanCache.get(mask);
  if (!variants) { variants = new Map(); runtime.decorContactSpanCache.set(mask, variants); }
  const flippedY = isDecorVerticallyFlipped(item);
  if (variants.has(flippedY)) return variants.get(flippedY);
  const { minX, maxX, minY, maxY } = mask.bounds;
  const band = Math.max(2, Math.ceil((maxY - minY + 1) * 0.055));
  const spans = [];
  let start = null;
  for (let x = minX; x <= maxX + 1; x++) {
    let opaque = false;
    if (x <= maxX) for (let offset = 0; offset < band; offset++) {
      const y = flippedY ? minY + offset : maxY - offset;
      if (mask.alpha[(y * mask.width + x) * 4 + 3] >= ALPHA_HIT_THRESHOLD) { opaque = true; break; }
    }
    if (opaque && start === null) start = x;
    if (!opaque && start !== null) {
      spans.push({ left: start / mask.width, right: x / mask.width });
      start = null;
    }
  }

  // Small transparent nicks inside an authored footprint should not fragment a
  // single root/support into several tiny shadows. Merge only nearby gaps while
  // preserving real openings such as the center of an arch.
  let resolvedSpans = spans;
  if (decor?.shadowFootprintPath && spans.length > 1) {
    const maxGap = clamp(Number(DECOR_GROUND_SHADOWS.authoredSpanMergeGapRatio) || 0.028, 0.005, 0.08);
    resolvedSpans = [];
    for (const span of spans) {
      const previous = resolvedSpans[resolvedSpans.length - 1];
      if (previous && span.left - previous.right <= maxGap) {
        previous.right = Math.max(previous.right, span.right);
      } else {
        resolvedSpans.push({ ...span });
      }
    }
  }

  variants.set(flippedY, resolvedSpans);
  return resolvedSpans;
}

function getDecorContactProfileSegments(item, decor, spans = getDecorContactSpans(item, decor)) {
  const contactPath = decor?.shadowFootprintPath || decor?.path;
  const mask = typeof getImageAlphaMask === "function" ? getImageAlphaMask(contactPath) : null;
  if (!mask?.bounds || !mask.alpha) return null;
  if (!runtime.decorContactProfileCache) runtime.decorContactProfileCache = new WeakMap();
  let variants = runtime.decorContactProfileCache.get(mask);
  if (!variants) {
    variants = new Map();
    runtime.decorContactProfileCache.set(mask, variants);
  }
  const flippedY = isDecorVerticallyFlipped(item);
  const cacheKey = JSON.stringify({
    flippedY,
    spans: Array.isArray(spans)
      ? spans.map((span) => [Number(span.left).toFixed(4), Number(span.right).toFixed(4)])
      : []
  });
  if (variants.has(cacheKey)) return variants.get(cacheKey);

  const { minX, maxX, minY, maxY } = mask.bounds;
  const resolvedSpans = Array.isArray(spans) && spans.length
    ? spans
    : [{ left: minX / mask.width, right: (maxX + 1) / mask.width }];
  const totalWidth = Math.max(1, maxX - minX + 1);
  const sampleStep = clamp(Math.round(totalWidth / 60), 1, 4);
  const segments = [];

  for (const span of resolvedSpans) {
    const leftPx = clamp(Math.floor(Number(span.left) * mask.width), minX, maxX);
    const rightPx = clamp(Math.ceil(Number(span.right) * mask.width), minX + 1, maxX + 1);
    const points = [];
    for (let x = leftPx; x < rightPx; x += sampleStep) {
      let chosenX = x;
      let chosenY = null;
      const maxSampleX = Math.min(rightPx - 1, x + sampleStep - 1);
      for (let sampleX = x; sampleX <= maxSampleX; sampleX += 1) {
        if (flippedY) {
          for (let y = minY; y <= maxY; y += 1) {
            if (mask.alpha[(y * mask.width + sampleX) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
              chosenX = sampleX;
              chosenY = y;
              break;
            }
          }
        } else {
          for (let y = maxY; y >= minY; y -= 1) {
            if (mask.alpha[(y * mask.width + sampleX) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
              chosenX = sampleX;
              chosenY = y;
              break;
            }
          }
        }
        if (chosenY !== null) break;
      }
      if (chosenY !== null) {
        points.push({
          x: (chosenX + 0.5) / mask.width,
          y: (chosenY + 1) / mask.height
        });
      }
    }

    const finalX = rightPx - 1;
    let finalY = null;
    if (flippedY) {
      for (let y = minY; y <= maxY; y += 1) {
        if (mask.alpha[(y * mask.width + finalX) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
          finalY = y;
          break;
        }
      }
    } else {
      for (let y = maxY; y >= minY; y -= 1) {
        if (mask.alpha[(y * mask.width + finalX) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
          finalY = y;
          break;
        }
      }
    }
    if (finalY !== null) {
      const endpoint = { x: (finalX + 0.5) / mask.width, y: (finalY + 1) / mask.height };
      const previous = points[points.length - 1];
      if (!previous || Math.abs(previous.x - endpoint.x) > 0.0001 || Math.abs(previous.y - endpoint.y) > 0.0001) {
        points.push(endpoint);
      }
    }

    if (points.length >= 2) {
      segments.push(points);
    }
  }

  variants.set(cacheKey, segments);
  return segments;
}

function getDecorSilhouetteProfileSegments(item, decor, imagePath = decor?.path) {
  const mask = typeof getImageAlphaMask === "function" ? getImageAlphaMask(imagePath) : null;
  if (!mask?.bounds || !mask.alpha) return null;
  if (!runtime.decorSilhouetteProfileCache) runtime.decorSilhouetteProfileCache = new WeakMap();
  let variants = runtime.decorSilhouetteProfileCache.get(mask);
  if (!variants) {
    variants = new Map();
    runtime.decorSilhouetteProfileCache.set(mask, variants);
  }
  const flippedY = isDecorVerticallyFlipped(item);
  const cacheKey = JSON.stringify({ flippedY, mode: "silhouette" });
  if (variants.has(cacheKey)) return variants.get(cacheKey);

  const { minX, maxX, minY, maxY } = mask.bounds;
  const totalWidth = Math.max(1, maxX - minX + 1);
  const totalHeight = Math.max(1, maxY - minY + 1);
  const sampleStep = clamp(Math.round(totalWidth / 72), 1, 4);
  const segments = [];
  let current = [];

  const pushCurrent = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
  };

  for (let x = minX; x <= maxX; x += sampleStep) {
    let topY = null;
    let bottomY = null;
    let chosenX = x;
    const maxSampleX = Math.min(maxX, x + sampleStep - 1);
    for (let sampleX = x; sampleX <= maxSampleX; sampleX += 1) {
      let columnTop = null;
      let columnBottom = null;
      for (let y = minY; y <= maxY; y += 1) {
        if (mask.alpha[(y * mask.width + sampleX) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
          columnTop = y;
          break;
        }
      }
      for (let y = maxY; y >= minY; y -= 1) {
        if (mask.alpha[(y * mask.width + sampleX) * 4 + 3] >= ALPHA_HIT_THRESHOLD) {
          columnBottom = y;
          break;
        }
      }
      if (columnTop !== null && columnBottom !== null) {
        chosenX = sampleX;
        topY = columnTop;
        bottomY = columnBottom;
        break;
      }
    }

    if (topY === null || bottomY === null) {
      pushCurrent();
      continue;
    }

    current.push({
      x: (chosenX + 0.5) / mask.width,
      y: (bottomY + 1) / mask.height,
      topY: topY / mask.height,
      thickness: clamp((bottomY - topY + 1) / totalHeight, 0, 1)
    });
  }
  pushCurrent();

  variants.set(cacheKey, segments);
  return segments;
}

function classifyDecorShadowStyle(item, decor) {
  const capabilities = getDecorMotionCapabilities(item);
  const behavior = capabilities?.motionType || "";
  const hint = `${decor?.key || item?.decorKey || ""} ${decor?.category || ""} ${decor?.name || ""}`.toLowerCase();
  const isHardscape = ["static", "cave_layered", "bubbler", "transit"].includes(behavior)
    || /(rock|stone|slate|brick|pot|tube|castle|ruin|driftwood|wood|log|volcano|reef|coral|coconut|clay|ceramic|meteor|fossil)/.test(hint);
  const isPlantLike = ["anchored_sway", "floating_sway", "ceiling_sway", "floating_bob"].includes(behavior)
    || /(plant|moss|fern|sword|lotus|weed|algae|carpet|anemone|gorgonian)/.test(hint);
  return {
    isHardscape,
    isPlantLike,
    weight: isHardscape ? 1 : (isPlantLike ? 0.72 : 0.86)
  };
}

function traceSmoothShadowPath(context, points) {
  if (!Array.isArray(points) || !points.length) return;
  context.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    return;
  }
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) * 0.5;
    const midY = (current.y + next.y) * 0.5;
    context.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  const last = points[points.length - 1];
  context.quadraticCurveTo(last.x, last.y, last.x, last.y);
}

function drawDecorContactRibbon(context, points, options = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    return;
  }
  const upperInset = Number.isFinite(Number(options.upperInset)) ? Number(options.upperInset) : 0.6;
  const lowerInset = Number.isFinite(Number(options.lowerInset)) ? Number(options.lowerInset) : 5;
  const expandEnds = Number.isFinite(Number(options.expandEnds)) ? Number(options.expandEnds) : 1.6;
  const minY = Math.min(...points.map((point) => point.y - upperInset));
  const maxY = Math.max(...points.map((point) => point.y + lowerInset));
  const gradient = context.createLinearGradient(0, minY, 0, maxY);
  gradient.addColorStop(0, `rgba(3, 9, 14, ${Number(options.topAlpha || 0.32).toFixed(4)})`);
  gradient.addColorStop(0.45, `rgba(3, 9, 14, ${Number(options.midAlpha || 0.16).toFixed(4)})`);
  gradient.addColorStop(1, "rgba(3, 9, 14, 0)");
  const topPoints = points.map((point, index) => ({
    x: point.x + (index === 0 ? -expandEnds : index === points.length - 1 ? expandEnds : 0),
    y: point.y - upperInset
  }));
  const bottomPoints = [...points].reverse().map((point, reverseIndex) => ({
    x: point.x + (reverseIndex === points.length - 1 ? -expandEnds : reverseIndex === 0 ? expandEnds : 0),
    y: point.y + lowerInset
  }));
  context.fillStyle = gradient;
  context.beginPath();
  traceSmoothShadowPath(context, topPoints);
  traceSmoothShadowPath(context, bottomPoints);
  context.closePath();
  context.fill();
}

function drawDecorUnderbodyShadowRibbon(context, points, options = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    return;
  }
  const topInset = Number.isFinite(Number(options.topInset)) ? Number(options.topInset) : 0.15;
  const baseDepth = Number.isFinite(Number(options.baseDepth)) ? Number(options.baseDepth) : 2;
  const thicknessDepth = Number.isFinite(Number(options.thicknessDepth)) ? Number(options.thicknessDepth) : 4;
  const recessionMultiplier = Number.isFinite(Number(options.recessionMultiplier)) ? Number(options.recessionMultiplier) : 0.65;
  const centerDepthBoost = Number.isFinite(Number(options.centerDepthBoost)) ? Number(options.centerDepthBoost) : 1.8;
  const edgeExpand = Number.isFinite(Number(options.edgeExpand)) ? Number(options.edgeExpand) : 1.8;
  const topAlpha = Number.isFinite(Number(options.topAlpha)) ? Number(options.topAlpha) : 0.22;
  const midAlpha = Number.isFinite(Number(options.midAlpha)) ? Number(options.midAlpha) : topAlpha * 0.55;
  const maxBottomY = Math.max(...points.map((point) => point.y));
  const topPoints = points.map((point, index) => ({
    x: point.x + (index === 0 ? -edgeExpand : index === points.length - 1 ? edgeExpand : 0),
    y: point.y + topInset
  }));
  const bottomPointsForward = points.map((point, index) => {
    const edgeFactor = points.length <= 1 ? 1 : 1 - Math.abs((index / (points.length - 1)) * 2 - 1);
    const thickness = clamp(Number(point.thickness) || 0, 0, 1);
    const recession = clamp(maxBottomY - point.y, 0, 18);
    const projectedDepth = baseDepth
      + thicknessDepth * thickness
      + recession * recessionMultiplier
      + edgeFactor * centerDepthBoost;
    return {
      x: point.x + (index === 0 ? -edgeExpand * 0.75 : index === points.length - 1 ? edgeExpand * 0.75 : 0),
      y: point.y + projectedDepth
    };
  });
  const minY = Math.min(...topPoints.map((point) => point.y));
  const maxY = Math.max(...bottomPointsForward.map((point) => point.y));
  const gradient = context.createLinearGradient(0, minY, 0, maxY);
  gradient.addColorStop(0, `rgba(3, 9, 14, ${topAlpha.toFixed(4)})`);
  gradient.addColorStop(0.35, `rgba(3, 9, 14, ${midAlpha.toFixed(4)})`);
  gradient.addColorStop(1, "rgba(3, 9, 14, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  traceSmoothShadowPath(context, topPoints);
  traceSmoothShadowPath(context, [...bottomPointsForward].reverse());
  context.closePath();
  context.fill();
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

  const bounds = getPlacedDecorGroundBounds(item);
  const fullBounds = getPlacedDecorBounds(item);
  const image = runtime.images.get(decor.path);
  if (!bounds || !fullBounds || !isUsableRuntimeImage(image)) {
    return null;
  }

  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const layerFloorY = getTankLayerBottomBoundaryY(getDecorTankLayer(item));
  const anchorY = bounds.bottom;
  const groundingTolerance = clamp(width * 0.05, 10, 24);
  const groundingStrength = clamp(1 - Math.abs(layerFloorY - anchorY) / groundingTolerance, 0, 1);
  if (groundingStrength <= 0.04) {
    return null;
  }

  {
    const displayWidth = getDecorDisplayWidth(decor, item);
    const displayHeight = displayWidth * (image.height / Math.max(1, image.width));
    const anchorSourceV = getDecorShadowAnchorSourceV(item, decor);
    return {
      image,
      drawX: item.xNorm * TANK_WIDTH - displayWidth / 2,
      displayWidth,
      displayHeight,
      planeY: anchorY,
      anchorSourceV,
      mainContactRuns: getDecorMainImageContactRuns(item, decor, anchorSourceV),
      flipX: isDecorHorizontallyFlipped(item),
      flipY: isDecorVerticallyFlipped(item),
      alpha: 0.46
        * groundingStrength
        * getTankDepthShadowStrength(getDecorTankLayer(item))
        * (typeof getDebugGroundShadowDarknessMultiplier === "function" ? getDebugGroundShadowDarknessMultiplier() : 1),
      shadowStyle: classifyDecorShadowStyle(item, decor)
    };
  }

  const spans = getDecorContactSpans(item, decor);
  const profileSegments = getDecorContactProfileSegments(item, decor, spans);
  const volumeProfileSegments = getDecorSilhouetteProfileSegments(item, decor, decor.path);
  const contactPath = decor.shadowFootprintPath || decor.path;
  const mask = typeof getImageAlphaMask === "function" ? getImageAlphaMask(contactPath) : null;
  const footprint = mask?.bounds
    ? {
      left: mask.bounds.minX / mask.width,
      right: (mask.bounds.maxX + 1) / mask.width
    }
    : (Array.isArray(spans) && spans.length
      ? {
        left: Math.min(...spans.map((span) => span.left)),
        right: Math.max(...spans.map((span) => span.right))
      }
      : { left: 0.1, right: 0.9 });
  const spriteWidth = getDecorDisplayWidth(decor, item);
  const resolveHorizontalUnit = typeof resolveDecorHorizontalUnit === "function"
    ? resolveDecorHorizontalUnit
    : ((_item, unit) => unit);
  const footprintLeft = resolveHorizontalUnit(item, footprint.left);
  const footprintRight = resolveHorizontalUnit(item, footprint.right);
  const footprintCenterX = Number.isFinite(Number(item?.xNorm)) && Number.isFinite(typeof TANK_WIDTH !== "undefined" ? TANK_WIDTH : NaN)
    ? Number(item.xNorm) * TANK_WIDTH + ((footprintLeft + footprintRight) / 2 - 0.5) * spriteWidth
    : (bounds.left + bounds.right) * 0.5;
  const footprintWidthPx = Math.max(8, Math.abs(footprintRight - footprintLeft) * spriteWidth);
  const footprintHeightBoost = clamp((footprintWidthPx - 90) / 180, 0, 1);
  const radiusX = clamp(footprintWidthPx * 0.5, 8, 280);
  const radiusY = clamp(radiusX * (0.16 + footprintHeightBoost * 0.08), 4, 24);
  const shadowY = clamp(
    anchorY - (3.2 + footprintHeightBoost * 1.1),
    WATER_SURFACE_Y + 20,
    getVisibleTankFloorBottomY() + 8
  );
  const shadowStyle = classifyDecorShadowStyle(item, decor);
  const shadowAlphaBase = 0.46
    * groundingStrength
    * getTankDepthShadowStrength(getDecorTankLayer(item))
    * (typeof getDebugGroundShadowDarknessMultiplier === "function" ? getDebugGroundShadowDarknessMultiplier() : 1);
  const displayWidth = getDecorDisplayWidth(decor, item);
  const displayHeight = displayWidth * (image.height / Math.max(1, image.width));
  const anchorSourceV = getDecorShadowAnchorSourceV(item, decor);
  const mainContactRuns = getDecorMainImageContactRuns(item, decor, anchorSourceV);
  const worldProfileSegments = Array.isArray(profileSegments)
    ? profileSegments.map((segment) => segment.map((point) => ({
      x: fullBounds.left + point.x * (fullBounds.right - fullBounds.left),
      y: fullBounds.top + point.y * (fullBounds.bottom - fullBounds.top)
    }))).filter((segment) => segment.length >= 2)
    : [];
  const worldVolumeSegments = Array.isArray(volumeProfileSegments)
    ? volumeProfileSegments.map((segment) => segment.map((point) => ({
      x: fullBounds.left + point.x * (fullBounds.right - fullBounds.left),
      y: fullBounds.top + point.y * (fullBounds.bottom - fullBounds.top),
      topY: fullBounds.top + point.topY * (fullBounds.bottom - fullBounds.top),
      thickness: point.thickness
    }))).filter((segment) => segment.length >= 2)
    : [];

  return {
    image,
    drawX: item.xNorm * TANK_WIDTH - displayWidth / 2,
    displayWidth,
    displayHeight,
    planeY: anchorY,
    anchorSourceV,
    mainContactRuns,
    flipX: isDecorHorizontallyFlipped(item),
    flipY: isDecorVerticallyFlipped(item),
    x: footprintCenterX,
    y: shadowY,
    radiusX,
    radiusY,
    boundsCenterX: (bounds.left + bounds.right) * 0.5,
    boundsWidth: width,
    footprintHeightBoost,
    hasAuthoredFootprint: Boolean(decor.shadowFootprintPath && mask?.bounds),
    alpha: shadowAlphaBase,
    spans,
    spriteWidth,
    shadowStyle,
    fullBounds,
    worldProfileSegments,
    worldVolumeSegments
  };
}

function drawDecorContactShadow(context, item) {
  const shadow = getDecorContactShadowMetrics(item);
  if (!shadow) {
    return;
  }

  context.save();
  traceTankFloorMaskPath(context, getTankFloorDrawBounds());
  context.clip();
  const styleWeight = clamp(Number(shadow.shadowStyle?.weight) || 0.86, 0.6, 1.15);
  // Pull the shadow into the visible base of the artwork. A fixed downward
  // offset leaves large ornaments looking suspended, while this restrained
  // size-aware lift keeps both small plants and large hardscape grounded.
  const contactLift = clamp(shadow.displayHeight * 0.018, 3, 9);
  drawProjectedSilhouette(context, {
    image: shadow.image,
    drawX: shadow.drawX,
    width: shadow.displayWidth,
    height: shadow.displayHeight,
    planeY: shadow.planeY - contactLift,
    anchorSourceV: shadow.anchorSourceV,
    flipX: shadow.flipX,
    flipY: shadow.flipY,
    depth: shadow.shadowStyle?.isPlantLike ? 0.18 : 0.27,
    shear: 0.14,
    opacity: shadow.alpha * 0.48 * styleWeight
  });

  // Only pixels of the primary art that actually meet the authored ground line
  // receive the dense contact core. An arch therefore gets two dark feet while
  // its opening retains only the lighter, receding silhouette above.
  for (const run of shadow.mainContactRuns || []) {
    const leftUnit = resolveDecorHorizontalUnit(item, run.left);
    const rightUnit = resolveDecorHorizontalUnit(item, run.right);
    const centerX = shadow.drawX + (leftUnit + rightUnit) * 0.5 * shadow.displayWidth;
    const radiusX = Math.max(2.5, Math.abs(rightUnit - leftUnit) * shadow.displayWidth * 0.54);
    context.save();
    context.translate(centerX, shadow.planeY - contactLift * 0.72);
    context.scale(radiusX, clamp(radiusX * 0.12, 2.2, 8));
    const contactGradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    contactGradient.addColorStop(0, `rgba(3, 9, 14, ${(shadow.alpha * 0.96 * styleWeight).toFixed(4)})`);
    contactGradient.addColorStop(0.58, `rgba(3, 9, 14, ${(shadow.alpha * 0.5 * styleWeight).toFixed(4)})`);
    contactGradient.addColorStop(1, "rgba(3, 9, 14, 0)");
    context.fillStyle = contactGradient;
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
  return;

  const authoredFootprint = shadow.hasAuthoredFootprint === true;
  const style = shadow.shadowStyle || { isHardscape: false, isPlantLike: false, weight: 0.86 };
  const weight = clamp(Number(style.weight) || 0.86, 0.6, 1.15);
  const baseAlphaMultiplier = (authoredFootprint
    ? DECOR_GROUND_SHADOWS.authoredBaseAlphaMultiplier
    : DECOR_GROUND_SHADOWS.baseAlphaMultiplier) * (style.isHardscape ? 0.92 : 0.96);
  const baseMidAlphaMultiplier = (authoredFootprint
    ? DECOR_GROUND_SHADOWS.authoredBaseMidAlphaMultiplier
    : DECOR_GROUND_SHADOWS.baseMidAlphaMultiplier) * (style.isHardscape ? 0.82 : 1);
  const baseRadiusXMultiplier = authoredFootprint
    ? DECOR_GROUND_SHADOWS.authoredBaseRadiusXMultiplier
    : DECOR_GROUND_SHADOWS.baseRadiusXMultiplier;
  const baseRadiusYMultiplier = authoredFootprint
    ? DECOR_GROUND_SHADOWS.authoredBaseRadiusYMultiplier
    : DECOR_GROUND_SHADOWS.baseRadiusYMultiplier;

  // Broad penumbra: provide weight and atmosphere under the full object width,
  // but keep it low enough that the contact ribbon remains the darkest region.
  context.save();
  const broadShadowRadiusX = authoredFootprint
    ? Math.max(8, shadow.boundsWidth * 0.5 * baseRadiusXMultiplier)
    : Math.max(8, shadow.radiusX * baseRadiusXMultiplier * (style.isHardscape ? 1.02 : 1));
  const broadShadowCenterX = authoredFootprint ? shadow.boundsCenterX : shadow.x;
  const broadShadowRadiusY = clamp(
    shadow.radiusY * (baseRadiusYMultiplier + shadow.footprintHeightBoost * 0.24) * (style.isHardscape ? 0.82 : 0.88),
    3,
    20
  );
  context.translate(broadShadowCenterX, shadow.y + DECOR_GROUND_SHADOWS.baseOffsetY);
  context.scale(broadShadowRadiusX, broadShadowRadiusY);
  let gradient;
  if (authoredFootprint) {
    gradient = context.createLinearGradient(0, -1, 0, 1);
    gradient.addColorStop(0, "rgba(3, 9, 14, 0)");
    gradient.addColorStop(0.24, `rgba(3, 9, 14, ${(shadow.alpha * baseMidAlphaMultiplier * 0.95).toFixed(4)})`);
    gradient.addColorStop(0.5, `rgba(3, 9, 14, ${(shadow.alpha * baseAlphaMultiplier).toFixed(4)})`);
    gradient.addColorStop(0.76, `rgba(3, 9, 14, ${(shadow.alpha * baseMidAlphaMultiplier * 0.95).toFixed(4)})`);
    gradient.addColorStop(1, "rgba(3, 9, 14, 0)");
  } else {
    gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(3, 9, 14, ${(shadow.alpha * baseAlphaMultiplier).toFixed(4)})`);
    gradient.addColorStop(0.68, `rgba(3, 9, 14, ${(shadow.alpha * baseMidAlphaMultiplier).toFixed(4)})`);
    gradient.addColorStop(1, "rgba(3, 9, 14, 0)");
  }
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const volumeSegments = Array.isArray(shadow.worldVolumeSegments) && shadow.worldVolumeSegments.length
    ? shadow.worldVolumeSegments
    : null;
  if (style.isHardscape && volumeSegments) {
    const bodyTopAlpha = shadow.alpha * 0.46 * weight;
    const bodyMidAlpha = shadow.alpha * 0.22 * weight;
    const bodyBaseDepth = clamp(1.8 + shadow.footprintHeightBoost * 1.4, 1.5, 5.5);
    const bodyThicknessDepth = clamp(4.8 + shadow.footprintHeightBoost * 3.5, 4, 11);
    const bodyRecessionMultiplier = clamp(0.62 + shadow.footprintHeightBoost * 0.22, 0.45, 0.95);
    const bodyCenterBoost = clamp(1.4 + shadow.footprintHeightBoost * 1.6, 1.2, 4.2);
    const edgeExpand = clamp(shadow.boundsWidth * 0.008, 0.7, 3.2);
    for (const segment of volumeSegments) {
      drawDecorUnderbodyShadowRibbon(context, segment, {
        topInset: 0.18,
        baseDepth: bodyBaseDepth,
        thicknessDepth: bodyThicknessDepth,
        recessionMultiplier: bodyRecessionMultiplier,
        centerDepthBoost: bodyCenterBoost,
        edgeExpand,
        topAlpha: bodyTopAlpha,
        midAlpha: bodyMidAlpha
      });
    }
  }

  const profileSegments = Array.isArray(shadow.worldProfileSegments) && shadow.worldProfileSegments.length
    ? shadow.worldProfileSegments
    : null;
  if (profileSegments) {
    const softTopAlpha = shadow.alpha * (style.isHardscape ? 0.58 : 0.44) * weight;
    const softMidAlpha = shadow.alpha * (style.isHardscape ? 0.24 : 0.17) * weight;
    const softDepth = clamp(4.6 + shadow.footprintHeightBoost * 4.2 + (style.isHardscape ? 1.1 : 0.3), 3.5, 12);
    const coreTopAlpha = shadow.alpha * (style.isHardscape ? 1.1 : 0.84) * weight;
    const coreMidAlpha = shadow.alpha * (style.isHardscape ? 0.56 : 0.38) * weight;
    const coreDepth = clamp(1.8 + shadow.footprintHeightBoost * 1.6 + (style.isHardscape ? 0.5 : 0), 1.5, 4.5);
    const edgeExpand = clamp(shadow.boundsWidth * 0.008, 0.8, 3);
    for (const segment of profileSegments) {
      drawDecorContactRibbon(context, segment, {
        upperInset: 0.65,
        lowerInset: softDepth,
        expandEnds: edgeExpand,
        topAlpha: softTopAlpha,
        midAlpha: softMidAlpha
      });
      drawDecorContactRibbon(context, segment, {
        upperInset: 0.35,
        lowerInset: coreDepth,
        expandEnds: edgeExpand * 0.55,
        topAlpha: coreTopAlpha,
        midAlpha: coreMidAlpha
      });
    }
  } else {
    const spans = shadow.spans || [{ left: 0.16, right: 0.84 }];
    for (const span of spans) {
      const left = resolveDecorHorizontalUnit(item, span.left);
      const right = resolveDecorHorizontalUnit(item, span.right);
      const x = item.xNorm * TANK_WIDTH + ((left + right) / 2 - 0.5) * shadow.spriteWidth;
      const radius = Math.max(3, Math.abs(right - left) * shadow.spriteWidth / 2);

      // Local soft occlusion plus a tighter core; gaps under arches stay open.
      for (const core of [false, true]) {
        context.save();
        context.translate(x, shadow.y - (1.1 + shadow.footprintHeightBoost * 0.7));
        context.scale(
          radius * (core ? DECOR_GROUND_SHADOWS.contactRadiusXMultiplier * 0.92 : DECOR_GROUND_SHADOWS.contactRadiusXMultiplier),
          core
            ? clamp(shadow.radiusY * (0.72 + shadow.footprintHeightBoost * 0.18), 2, 8)
            : clamp(shadow.radiusY * (DECOR_GROUND_SHADOWS.contactRadiusYMultiplier + shadow.footprintHeightBoost * 0.28), 3, 13)
        );
        gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        const contactAlphaMultiplier = authoredFootprint
          ? (core ? DECOR_GROUND_SHADOWS.authoredContactCoreAlphaMultiplier : DECOR_GROUND_SHADOWS.authoredContactSoftAlphaMultiplier)
          : (core ? DECOR_GROUND_SHADOWS.contactCoreAlphaMultiplier : DECOR_GROUND_SHADOWS.contactSoftAlphaMultiplier);
        gradient.addColorStop(0, `rgba(3, 9, 14, ${(shadow.alpha * contactAlphaMultiplier * weight).toFixed(4)})`);
        gradient.addColorStop(1, "rgba(3, 9, 14, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, 1, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  }
  context.restore();
}

function drawGroundShadows(now) {
  if (!areDecorShadowsEnabled()) {
    return;
  }

  const naturalSubstrate = getResolvedTankSubstrateStyle() !== "custom";
  let context = tankContext;
  let scratch = null;
  if (naturalSubstrate) {
    scratch = runtime.naturalSubstrateShadowCanvas;
    if (!scratch) {
      scratch = document.createElement("canvas");
      runtime.naturalSubstrateShadowCanvas = scratch;
    }
    if (scratch.width !== TANK_WIDTH || scratch.height !== TANK_HEIGHT) {
      scratch.width = TANK_WIDTH;
      scratch.height = TANK_HEIGHT;
    }
    context = scratch.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, scratch.width, scratch.height);
  }

  context.save();
  context.globalCompositeOperation = "multiply";
  context.beginPath();
  context.rect(
    GLASS_MARGIN_X,
    WATER_SURFACE_Y,
    TANK_WIDTH - GLASS_MARGIN_X * 2,
    getVisibleTankFloorBottomY() - WATER_SURFACE_Y + 12
  );
  context.clip();
  traceTankFloorMaskPath(context, getTankFloorDrawBounds());
  context.clip();
  for (const item of state.placedDecor) {
    drawDecorContactShadow(context, item);
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
      context,
      image,
      pose.x,
      pose.y + height * 0.46,
      width,
      height,
      0.27 * getTankDepthShadowStrength(getFishTankLayer(fish)) * getDebugGroundShadowDarknessMultiplier(),
      species.shadowScale || 0.28,
      shadowPlaneY,
      (pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1)) < 0
    );
  }
  context.restore();

  if (naturalSubstrate && scratch) {
    const path = getTankSubstrateAssetPath(getCurrentTank());
    const image = path ? runtime.images.get(path) : null;
    const mask = path ? getImageAlphaMask(path) : null;
    const drawBounds = image ? getNaturalSubstrateDrawBounds(image, mask) : null;
    if (!isUsableRuntimeImage(image) || !drawBounds) return;
    context.save();
    context.globalCompositeOperation = "destination-in";
    context.drawImage(image, drawBounds.left, drawBounds.top, drawBounds.width, drawBounds.height);
    context.restore();

    tankContext.save();
    tankContext.globalCompositeOperation = "multiply";
    tankContext.drawImage(scratch, 0, 0, TANK_WIDTH, TANK_HEIGHT);
    tankContext.restore();
  }
}

function drawFishProjectedShadow(context, image, x, objectBottomY, width, height, opacity, widthScale, planeY = null, flipX = false) {
  const floorY = Number.isFinite(planeY) ? planeY : getTankFloorSurfaceYAtX(x) + 7;
  const heightAboveFloor = Math.max(0, floorY - objectBottomY);
  const shadowFadeDistance = clamp(height * 4.4 + 100, 190, 520);
  const proximity = clamp(1 - heightAboveFloor / shadowFadeDistance, 0, 1);
  if (proximity <= 0.025) {
    return;
  }
  const silhouette = getShadowSilhouetteCanvas(image);
  if (!silhouette) return;
  const anchorSourceV = (silhouette.shadowAlphaBounds.maxY + 1) / silhouette.height;
  const speciesScale = clamp(Number(widthScale) || 0.28, 0.18, 0.48);
  const alpha = clamp(opacity * Math.pow(proximity, 1.7), 0, opacity);
  drawProjectedSilhouette(context, {
    image,
    drawX: x - width / 2,
    width,
    height,
    planeY: floorY,
    anchorSourceV,
    flipX,
    depth: 0.12 + speciesScale * 0.34,
    shear: 0.08 + (1 - proximity) * 0.1,
    opacity: alpha
  });
}

function drawDecorImageLayer(image, drawX, drawY, width, height, item, now, motion = null, alpha = 1) {
  if (isTransitTubeDecorKey(item?.decorKey) && normalizeDecorColorSetting(item?.transitTubeColor || "")) {
    const decor = runtime.decorMap.get(item.decorKey);
    const imagePath = image === runtime.images.get(decor?.bgPath) ? decor.bgPath : decor?.path;
    drawDecorColorLayerImageToContext(tankContext, image, imagePath || "", item.transitTubeColor, true, drawX, drawY, width, height, item, now, motion, alpha);
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
    const trypophobiaPath = isTrypophobiaEnabled() ? getDecorLayerTrypophobiaPath(decor, layer) : "";
    const trypophobiaImage = trypophobiaPath ? runtime.images.get(trypophobiaPath) : null;

    if (layer.isBaseLayer) {
      if (!layerImage) {
        continue;
      }
      drawDecorColorLayerImageToContext(context, layerImage, layerPath, settings[layer.id], colorizeSettings[layer.id], drawX, drawY, width, height, item, now, motion, alpha);
      if (trypophobiaImage) {
        drawDecorImageLayerToContext(context, trypophobiaImage, drawX, drawY, width, height, item, now, motion, alpha, true);
      }
      drewLayer = true;
      continue;
    }

    const activeLayerPath = trypophobiaImage ? trypophobiaPath : layerPath;
    const activeLayerImage = trypophobiaImage || layerImage;
    if (!activeLayerImage) {
      continue;
    }

    drawDecorColorLayerImageToContext(context, activeLayerImage, activeLayerPath, settings[layer.id], colorizeSettings[layer.id], drawX, drawY, width, height, item, now, motion, alpha);
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

function drawDecor(layer = null, now = Date.now(), options = {}) {
  const pass = options.pass === "cave-front"
    ? "cave-front"
    : (options.pass === "cave-back" ? "cave-back" : "base");
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

    if (getDecorArtworkPaths(decor).some(path => !isUsableRuntimeImage(runtime.images.get(path)))) {
      void preloadDecorArtwork(decor);
    }

    const span = getDecorLayerSpan(item.decorKey, getDecorTankLayer(item));
    const cave = isCaveDecorKey(item.decorKey);
    const transitTube = isTransitTubeDecorKey(item.decorKey);

    if (pass === "cave-front" && !cave) {
      continue;
    }
    if (pass === "cave-back" && !cave) {
      continue;
    }
    if (pass === "base" && cave) {
      continue;
    }
    if ((pass === "cave-back" || pass === "cave-front") && cave && layer !== null && layer !== span.front) {
      continue;
    }

    let imagePath = decor.path;
    if (cave) {
      if (pass === "cave-back") {
        if (!decor.bgPath) {
          continue;
        }
        imagePath = decor.bgPath;
      } else {
        imagePath = decor.path;
      }
    } else if (transitTube) {
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
    const drawsPrimaryArt = imagePath === decor.path && pass !== "cave-back";
    const registerSurface = () => {
      if (drawsPrimaryArt) registerDecorShadowSurface(item, decor, drawX, drawY, width, height);
    };
    if (drawsPrimaryArt) {
      const groundBounds = getPlacedDecorGroundBounds(item);
      drawCasterShadowOnDecorSurfaces({
        image,
        casterId: item.id,
        centerX: x,
        bottomY: groundBounds?.bottom ?? y,
        left: groundBounds?.left,
        right: groundBounds?.right,
        width,
        height,
        tankLayer: getDecorTankLayer(item),
        freePlacementEnabled: item.freePlacementEnabled === true,
        flipX: isDecorHorizontallyFlipped(item),
        opacity: 0.32 * getTankDepthShadowStrength(getDecorTankLayer(item))
      });
    }

    if (cave && pass === "cave-back") {
      const bgHeight = width * (image.height / Math.max(1, image.width));
      if (drawCaveBackgroundLayerToContext(tankContext, item, decor, now, {
        drawX,
        bgDrawY: y - bgHeight,
        width,
        baseHeight: height,
        motion
      })) {
        continue;
      }
      drawDecorImageLayer(image, drawX, y - bgHeight, width, bgHeight, item, now, motion);
      continue;
    }

    if (cave && pass === "cave-front") {
      if (decor.bubbler) {
        drawBubblerLightLayerToContext(tankContext, item, decor, now, {
          drawX,
          drawY,
          width,
          height,
          motion
        });
        drawDecorBubblerEffect(item, decor, image, now);
      }
      if (!decor.bubbler || !isCustomBubblerDecorKey(item.decorKey) || runtime.editTankMode) {
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
      registerSurface();
      continue;
    }

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
      drawBubblerLightLayerToContext(tankContext, item, decor, now, {
        drawX,
        drawY,
        width,
        height,
        motion
      });
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
      registerSurface();
      continue;
    }

    if (layer === span.back && (hasDecorCaveColorLayers(decor) || transitTube)) {
      const bgHeight = width * (image.height / Math.max(1, image.width));
      if (transitTube) {
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
        registerSurface();
        continue;
      }
    }

    drawDecorImageLayer(image, drawX, drawY, width, height, item, now, motion);
    registerSurface();
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
  const previewGroundBounds = getPlacedDecorGroundBounds(previewItem);
  const previewFootX = previewGroundBounds
    ? (previewGroundBounds.left + previewGroundBounds.right) * 0.5
    : x;
  const previewFootY = previewGroundBounds?.bottom ?? y;

  tankContext.save();
  tankContext.globalAlpha = 1;
  tankContext.fillStyle = "rgba(120, 215, 235, 0.18)";
  tankContext.beginPath();
  tankContext.ellipse(previewFootX, previewFootY + 3, width * 0.34, Math.max(10, width * 0.08), 0, 0, Math.PI * 2);
  tankContext.fill();
  const previewMotion = getDecorMotion(previewItem, Date.now());
  if (decor.bgPath) {
    if (hasDecorCaveColorLayers(decor)) {
      drawCaveBackgroundLayerToContext(tankContext, previewItem, decor, Date.now(), {
        drawX: x - width / 2,
        drawY: y - height,
        width,
        baseHeight: height,
        motion: previewMotion,
        // Cave backgrounds are authored structural art, not a placement ghost.
        // Keep the back wall opaque so the tank scene never shows through it.
        alpha: 1
      });
    } else {
      const bgImage = runtime.images.get(decor.bgPath);
      if (bgImage) {
        const bgHeight = width * (bgImage.height / bgImage.width);
        drawDecorImageLayer(bgImage, x - width / 2, y - bgHeight, width, bgHeight, previewItem, Date.now(), previewMotion, 1);
      }
    }
  }
  if (decor.bubbler) {
    drawBubblerLightLayerToContext(tankContext, previewItem, decor, Date.now(), {
      drawX: x - width / 2,
      drawY: y - height,
      width,
      height,
      motion: previewMotion,
      alpha: 1
    });
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
      alpha: 1
    });
    tankContext.restore();
    return;
  }
  drawDecorImageLayer(image, x - width / 2, y - height, width, height, previewItem, Date.now(), previewMotion, 1);
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
