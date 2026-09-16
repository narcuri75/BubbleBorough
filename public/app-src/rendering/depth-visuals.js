// Source fragment: rendering/depth-visuals.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.
//
// IMPORTANT PERFORMANCE NOTE:
// Depth treatment must never depend on live Canvas2D blur/filter passes for every
// sprite or for the full gravel bed. Even sub-pixel blur/filter chains can push
// browsers onto expensive GPU paths. Static object artwork is therefore treated
// once and cached. The substrate uses one inexpensive source-over gradient.

function getTankDepthParentLayer(layer) {
  const numeric = Number(layer);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  // Fractional/internal cave ordering inherits the parent layer. A cave on
  // 2.1/2.2/2.3 therefore receives the same treatment as Layer 2.
  const parent = Number.isInteger(numeric) ? numeric : Math.floor(numeric);
  return clampTankLayer(parent);
}

function normalizeDebugTankDepthTuning(source = {}) {
  const normalized = {};
  for (const [key, fallback] of Object.entries(DEFAULT_DEBUG_DEPTH_TUNING)) {
    const raw = Number(source?.[key]);
    const max = key === "shadow" || key === "movement"
      ? 2
      : (key === "shadowDarkness" ? DECOR_GROUND_SHADOWS.shadowDarknessCap : 4);
    normalized[key] = Number.isFinite(raw) ? clamp(raw, 0, max) : fallback;
  }
  return normalized;
}

function loadDebugTankDepthTuning() {
  if (runtime.debugDepthTuningLoaded && runtime.debugDepthTuning) {
    return runtime.debugDepthTuning;
  }
  let saved = null;
  try {
    const raw = localStorage.getItem(DEBUG_DEPTH_TUNING_STORAGE_KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  runtime.debugDepthTuning = normalizeDebugTankDepthTuning(saved || DEFAULT_DEBUG_DEPTH_TUNING);
  runtime.debugDepthTuningLoaded = true;
  return runtime.debugDepthTuning;
}

function getDebugTankDepthTuning() {
  return loadDebugTankDepthTuning();
}

function getTankDepthEffectLevel() {
  return normalizeDepthEffectLevel(getUiSettings().depthEffectLevel);
}

function getTankDepthLevelMultiplier(key, level = getTankDepthEffectLevel()) {
  const normalizedLevel = normalizeDepthEffectLevel(level);
  if (normalizedLevel <= DEPTH_EFFECT_LEVEL_MIN) {
    return 0;
  }
  if (key === "shadow" || key === "movement") {
    // Shadow/motion tuning has a deliberately narrower safe range than the
    // color/depth treatment. Spread 100% -> 200% evenly across levels 1 -> 4.
    const progress = (normalizedLevel - 1) / Math.max(1, DEPTH_EFFECT_LEVEL_MAX - 1);
    return 1 + progress;
  }
  // Visual channels map directly to the tuner scale: 1=100%, 4=400%.
  return normalizedLevel;
}

function getActiveTankDepthTuning() {
  const depthLevel = getTankDepthEffectLevel();
  const channelTuning = isDebugModeEnabled()
    ? getDebugTankDepthTuning()
    : DEFAULT_DEBUG_DEPTH_TUNING;
  const effective = {};
  for (const [key, fallback] of Object.entries(DEFAULT_DEBUG_DEPTH_TUNING)) {
    const channelMultiplier = Number(channelTuning?.[key]);
    const max = key === "shadow" || key === "movement"
      ? 2
      : (key === "shadowDarkness" ? DECOR_GROUND_SHADOWS.shadowDarknessCap : 4);
    const multiplier = Number.isFinite(channelMultiplier) ? channelMultiplier : fallback;
    const levelMultiplier = getTankDepthLevelMultiplier(key, depthLevel);
    effective[key] = clamp(levelMultiplier * multiplier, 0, max);
  }
  return effective;
}

function saveDebugTankDepthTuning() {
  try {
    localStorage.setItem(DEBUG_DEPTH_TUNING_STORAGE_KEY, JSON.stringify(getDebugTankDepthTuning()));
  } catch {
    // Tuning remains active for the current session if storage is unavailable.
  }
}

function invalidateTankDepthVisualCaches() {
  runtime.depthVisualImageCache = new WeakMap();
  if (runtime.boroughOverviewSnapshotCache instanceof Map) {
    runtime.boroughOverviewSnapshotCache.clear();
  }
  runtime.boroughOverviewSnapshotRenderedAt = 0;
  runtime.boroughOverviewFishRenderedAt = 0;
}

function setDebugTankDepthTuningValue(key, value, options = {}) {
  if (!(key in DEFAULT_DEBUG_DEPTH_TUNING)) {
    return getDebugTankDepthTuning();
  }
  const tuning = getDebugTankDepthTuning();
  const max = key === "shadow" || key === "movement"
    ? 2
    : (key === "shadowDarkness" ? DECOR_GROUND_SHADOWS.shadowDarknessCap : 4);
  tuning[key] = clamp(Number(value) || 0, 0, max);
  if (options.persist !== false) {
    saveDebugTankDepthTuning();
  }
  if (options.invalidate !== false) {
    invalidateTankDepthVisualCaches();
  }
  return tuning;
}

function resetDebugTankDepthTuning() {
  runtime.debugDepthTuning = normalizeDebugTankDepthTuning(DEFAULT_DEBUG_DEPTH_TUNING);
  runtime.debugDepthTuningLoaded = true;
  saveDebugTankDepthTuning();
  invalidateTankDepthVisualCaches();
  return runtime.debugDepthTuning;
}

function getTankDepthVisualPreset(layer) {
  const parentLayer = getTankDepthParentLayer(layer);
  const base = DEPTH_VISUALS[parentLayer] || DEPTH_VISUALS[1];
  const tuning = getActiveTankDepthTuning();
  return {
    haze: clamp(base.haze * tuning.haze, 0, 1),
    saturation: clamp(1 - (1 - base.saturation) * tuning.saturation, 0, 1),
    contrast: clamp(1 - (1 - base.contrast) * tuning.contrast, 0, 1),
    blurPx: base.blurPx,
    coolTint: clamp(base.coolTint * tuning.coolTint, 0, 1),
    shadowStrength: clamp(1 - (1 - base.shadowStrength) * tuning.shadow, 0, 1),
    movementMultiplier: clamp(1 - (1 - base.movementMultiplier) * tuning.movement, 0.5, 1)
  };
}

function interpolateTankDepthVisuals(fromVisuals, toVisuals, amount) {
  const t = clamp(Number(amount) || 0, 0, 1);
  const from = fromVisuals || DEPTH_VISUALS[1];
  const to = toVisuals || from;
  const lerp = (left, right) => Number(left || 0) + (Number(right || 0) - Number(left || 0)) * t;
  return {
    haze: lerp(from.haze, to.haze),
    saturation: lerp(from.saturation, to.saturation),
    contrast: lerp(from.contrast, to.contrast),
    blurPx: lerp(from.blurPx, to.blurPx),
    coolTint: lerp(from.coolTint, to.coolTint),
    shadowStrength: lerp(from.shadowStrength, to.shadowStrength),
    movementMultiplier: lerp(from.movementMultiplier, to.movementMultiplier)
  };
}

function getTankDepthReferencePoints() {
  return Array.from({ length: TANK_DEPTH_LAYERS }, (_, index) => {
    const layer = index + 1;
    return {
      layer,
      y: getTankLayerBottomBoundaryY(layer),
      visuals: getTankDepthVisualPreset(layer)
    };
  }).sort((left, right) => left.y - right.y);
}

function getContinuousTankDepthVisualAtY(yPosition) {
  const y = Number(yPosition);
  const references = getTankDepthReferencePoints();
  if (!references.length || !Number.isFinite(y)) {
    return getTankDepthVisualPreset(1);
  }
  if (y <= references[0].y) {
    return references[0].visuals;
  }
  const last = references[references.length - 1];
  if (y >= last.y) {
    return last.visuals;
  }
  for (let index = 0; index < references.length - 1; index += 1) {
    const from = references[index];
    const to = references[index + 1];
    if (y < from.y || y > to.y) {
      continue;
    }
    const span = Math.max(0.0001, to.y - from.y);
    return interpolateTankDepthVisuals(from.visuals, to.visuals, (y - from.y) / span);
  }
  return last.visuals;
}

function areTankDepthEffectsEnabled() {
  return getTankDepthEffectLevel() > DEPTH_EFFECT_LEVEL_MIN;
}

function areTankBackgroundDepthEffectsEnabled() {
  return areTankDepthEffectsEnabled() && getUiSettings().backgroundDepthHazeEnabled !== false;
}

function getTankBackgroundDepthVisualPreset() {
  const layer5 = getTankDepthVisualPreset(TANK_DEPTH_LAYERS);
  const strength = clamp(Number(BACKGROUND_DEPTH_VISUAL_STRENGTH) || 0, 0, 1);
  return {
    haze: layer5.haze * strength,
    saturation: 1 - (1 - layer5.saturation) * strength,
    contrast: 1 - (1 - layer5.contrast) * strength,
    blurPx: 0,
    coolTint: layer5.coolTint * strength,
    shadowStrength: 1,
    movementMultiplier: 1
  };
}

function getTankDepthCanvasFilter() {
  // Kept as a compatibility shim for older callers. Depth filters are NOT
  // applied live anymore. Live filter()/blur() on every sprite was the primary
  // cause of the severe FPS/GPU regression.
  return "none";
}

function combineTankCanvasFilters(...filters) {
  const normalized = filters
    .flatMap((filter) => String(filter || "").trim().split(/\s+(?=[a-z-]+\()/i))
    .map((filter) => filter.trim())
    .filter((filter) => filter && filter !== "none");
  return normalized.length ? normalized.join(" ") : "none";
}

function getTankDepthObjectAlpha() {
  // Depth should not make objects transparent/ghosted.
  return 1;
}

function getTankDepthShadowStrength(layer) {
  return areTankDepthEffectsEnabled() ? getTankDepthVisualPreset(layer).shadowStrength : 1;
}

function getDebugGroundShadowDarknessMultiplier() {
  const fallback = Number(DEFAULT_DEBUG_DEPTH_TUNING?.shadowDarkness) || 1.3;
  if (!isDebugModeEnabled()) {
    return clamp(fallback, 0.25, DECOR_GROUND_SHADOWS.shadowDarknessCap);
  }
  const value = Number(getDebugTankDepthTuning()?.shadowDarkness);
  return clamp(value || fallback, 0.25, DECOR_GROUND_SHADOWS.shadowDarknessCap);
}

function getTankDepthMovementMultiplier(layer) {
  return areTankDepthEffectsEnabled() ? getTankDepthVisualPreset(layer).movementMultiplier : 1;
}

function getTankDepthImageDimensions(image) {
  return {
    width: Math.max(1, Math.round(Number(image?.naturalWidth || image?.videoWidth || image?.width) || 1)),
    height: Math.max(1, Math.round(Number(image?.naturalHeight || image?.videoHeight || image?.height) || 1))
  };
}

function getTankDepthImageCache() {
  if (!(runtime.depthVisualImageCache instanceof WeakMap)) {
    runtime.depthVisualImageCache = new WeakMap();
  }
  return runtime.depthVisualImageCache;
}

function applyTankDepthPixelTreatment(imageData, visuals) {
  const pixels = imageData?.data;
  if (!pixels || !visuals) {
    return imageData;
  }

  const saturation = clamp(Number(visuals.saturation) || 1, 0, 2);
  const contrast = clamp(Number(visuals.contrast) || 1, 0, 2);

  // The authored values remain centralized in DEPTH_VISUALS. Their pixel-space
  // contribution is intentionally restrained so Layer 5 still reads as a clean
  // home aquarium rather than foggy water.
  const coolAmount = clamp((Number(visuals.coolTint) || 0) * 0.62, 0, 0.25);
  const hazeAmount = clamp((Number(visuals.haze) || 0) * 0.24, 0, 0.20);
  const cool = DEPTH_VISUAL_COOL_TINT_RGB;
  const haze = { r: 164, g: 208, b: 220 };

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] <= 1) {
      continue;
    }

    let r = pixels[index];
    let g = pixels[index + 1];
    let b = pixels[index + 2];

    // Saturation reduction.
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    r = luminance + (r - luminance) * saturation;
    g = luminance + (g - luminance) * saturation;
    b = luminance + (b - luminance) * saturation;

    // Contrast reduction around midpoint.
    r = 127.5 + (r - 127.5) * contrast;
    g = 127.5 + (g - 127.5) * contrast;
    b = 127.5 + (b - 127.5) * contrast;

    // Subtle clean-water cyan contamination and haze. Alpha is preserved.
    r = r * (1 - coolAmount) + cool.r * coolAmount;
    g = g * (1 - coolAmount) + cool.g * coolAmount;
    b = b * (1 - coolAmount) + cool.b * coolAmount;

    r = r * (1 - hazeAmount) + haze.r * hazeAmount;
    g = g * (1 - hazeAmount) + haze.g * hazeAmount;
    b = b * (1 - hazeAmount) + haze.b * hazeAmount;

    pixels[index] = clamp(Math.round(r), 0, 255);
    pixels[index + 1] = clamp(Math.round(g), 0, 255);
    pixels[index + 2] = clamp(Math.round(b), 0, 255);
  }

  return imageData;
}

function getTankDepthTreatedImage(image, layer) {
  if (!image || !areTankDepthEffectsEnabled()) {
    return image;
  }

  const parentLayer = getTankDepthParentLayer(layer);
  if (parentLayer <= 1) {
    return image;
  }

  const cache = getTankDepthImageCache();
  let byLayer = cache.get(image);
  if (!byLayer) {
    byLayer = new Map();
    cache.set(image, byLayer);
  }
  if (byLayer.has(parentLayer)) {
    return byLayer.get(parentLayer) || image;
  }

  const { width, height } = getTankDepthImageDimensions(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    byLayer.set(parentLayer, image);
    return image;
  }

  try {
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    applyTankDepthPixelTreatment(imageData, getTankDepthVisualPreset(parentLayer));
    context.putImageData(imageData, 0, 0);
    byLayer.set(parentLayer, canvas);
    return canvas;
  } catch (error) {
    // Custom/user images can theoretically be non-readable in some browsers.
    // Fall back to the original art instead of reintroducing a live GPU filter.
    byLayer.set(parentLayer, image);
    return image;
  }
}

function getTankBackgroundDepthTreatedImage(image) {
  if (!image || !areTankBackgroundDepthEffectsEnabled()) {
    return image;
  }

  const cache = getTankDepthImageCache();
  let byLayer = cache.get(image);
  if (!byLayer) {
    byLayer = new Map();
    cache.set(image, byLayer);
  }
  const cacheKey = "background-depth";
  if (byLayer.has(cacheKey)) {
    return byLayer.get(cacheKey) || image;
  }

  const { width, height } = getTankDepthImageDimensions(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    byLayer.set(cacheKey, image);
    return image;
  }

  try {
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    applyTankDepthPixelTreatment(imageData, getTankBackgroundDepthVisualPreset());
    context.putImageData(imageData, 0, 0);
    byLayer.set(cacheKey, canvas);
    return canvas;
  } catch {
    byLayer.set(cacheKey, image);
    return image;
  }
}

function getTankDepthWaterlineY() {
  const direct = Number(WATER_SURFACE_Y);
  if (Number.isFinite(direct)) {
    return direct;
  }
  if (typeof getViewportAnchoredWaterSurfaceY === "function") {
    const fallback = Number(getViewportAnchoredWaterSurfaceY());
    if (Number.isFinite(fallback)) {
      return fallback;
    }
  }
  return 0;
}

function drawTankDepthAwareImageToContext(context, image, layer, bounds, drawImageFn, options = {}) {
  if (!image || typeof drawImageFn !== "function") {
    return;
  }

  const left = Number(bounds?.left);
  const top = Number(bounds?.top);
  const width = Number(bounds?.width);
  const height = Number(bounds?.height);
  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    drawImageFn(context, image, "normal");
    return;
  }

  const parentLayer = getTankDepthParentLayer(layer);
  if (!areTankDepthEffectsEnabled() || parentLayer <= 1) {
    drawImageFn(context, image, "normal");
    return;
  }

  const waterlineY = Number.isFinite(Number(options.waterlineY))
    ? Number(options.waterlineY)
    : getTankDepthWaterlineY();
  if (!Number.isFinite(waterlineY)) {
    drawImageFn(context, getTankDepthTreatedImage(image, parentLayer) || image, "depth");
    return;
  }

  const objectTop = top;
  const objectBottom = top + height;
  const depthImage = getTankDepthTreatedImage(image, parentLayer) || image;

  // Waterline masking is intentionally strict. No treated pixel may be drawn
  // above the visible water surface. The previous soft overlap/feather let the
  // depth-treated copy bleed several transformed pixels into the dry portion
  // of top-mounted equipment.
  if (objectBottom <= waterlineY) {
    drawImageFn(context, image, "normal");
    return;
  }
  if (objectTop >= waterlineY) {
    drawImageFn(context, depthImage, "depth");
    return;
  }

  const drawPass = (clipTop, clipBottom, passImage, passType) => {
    if (!Number.isFinite(clipTop) || !Number.isFinite(clipBottom) || clipBottom <= clipTop) {
      return;
    }
    context.save();
    context.beginPath();
    context.rect(left, clipTop, width, clipBottom - clipTop);
    context.clip();
    drawImageFn(context, passImage, passType);
    context.restore();
  };

  drawPass(objectTop, Math.min(objectBottom, waterlineY), image, "normal");
  drawPass(Math.max(objectTop, waterlineY), objectBottom, depthImage, "depth");
}

function getTankDepthSubstrateGradientStops(bounds, valueKey) {
  const top = Number(bounds?.drawTop);
  const bottom = Number(bounds?.bottom);
  const span = Math.max(1, bottom - top);
  const sample = (y) => {
    const visuals = getContinuousTankDepthVisualAtY(y);
    return Number(visuals?.[valueKey]) || 0;
  };
  const stops = [{ offset: 0, value: sample(top) }];
  for (const point of getTankDepthReferencePoints()) {
    if (point.y <= top || point.y >= bottom) {
      continue;
    }
    stops.push({ offset: clamp((point.y - top) / span, 0, 1), value: Number(point.visuals?.[valueKey]) || 0 });
  }
  stops.push({ offset: 1, value: sample(bottom) });
  return stops.sort((left, right) => left.offset - right.offset);
}

function getTankDepthSubstrateOverlayStyle(visuals) {
  const coolTint = clamp(Number(visuals?.coolTint) || 0, 0, 1);
  const haze = clamp(Number(visuals?.haze) || 0, 0, 1);
  const saturationLoss = clamp(1 - (Number(visuals?.saturation) || 1), 0, 1);
  const contrastLoss = clamp(1 - (Number(visuals?.contrast) || 1), 0, 1);

  // One extremely light source-over wash replaces four blend-mode passes plus
  // a full-size blur copy. This keeps gravel texture crisp and avoids a visible
  // "effect layer" sitting on top of the substrate.
  const substrateStrength = getActiveTankDepthTuning().substrate;
  const alpha = clamp(
    (coolTint * 0.30
      + haze * 0.18
      + saturationLoss * 0.05
      + contrastLoss * 0.04) * substrateStrength,
    0,
    0.16
  );

  return {
    r: 118,
    g: 190,
    b: 205,
    alpha
  };
}

function createTankDepthSubstrateOverlayGradient(context, bounds) {
  const gradient = context.createLinearGradient(0, bounds.drawTop, 0, bounds.bottom);
  const top = Number(bounds.drawTop);
  const bottom = Number(bounds.bottom);
  const span = Math.max(1, bottom - top);
  const stops = [
    { y: top, visuals: getContinuousTankDepthVisualAtY(top) },
    ...getTankDepthReferencePoints().filter((point) => point.y > top && point.y < bottom),
    { y: bottom, visuals: getContinuousTankDepthVisualAtY(bottom) }
  ];

  for (const stop of stops) {
    const style = getTankDepthSubstrateOverlayStyle(stop.visuals);
    const offset = clamp((Number(stop.y) - top) / span, 0, 1);
    gradient.addColorStop(
      offset,
      `rgba(${style.r},${style.g},${style.b},${style.alpha.toFixed(4)})`
    );
  }
  return gradient;
}

function drawContinuousTankDepthSubstrateSoftness() {
  // Intentionally no-op. Sub-pixel Canvas2D blur still creates a costly live
  // filter/compositing path and produced visible smearing on gravel. The
  // contrast/saturation/tint cues are sufficient at aquarium scale.
}

function drawContinuousTankDepthSubstrateTreatment(context, bounds) {
  if (!areTankDepthEffectsEnabled()) {
    return;
  }

  context.save();
  traceTankFloorMaskPath(context, bounds);
  context.clip();
  context.globalCompositeOperation = "source-over";
  context.fillStyle = createTankDepthSubstrateOverlayGradient(context, bounds);
  context.fillRect(
    bounds.left,
    bounds.drawTop,
    bounds.drawWidth,
    Math.max(1, bounds.bottom - bounds.drawTop + 2)
  );
  context.restore();
}
