// Source fragment: rendering/gravel-and-effects.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getCustomGravelAssetImage(asset) {
  if (!asset) {
    return { image: null, path: "" };
  }

  const resolvedPath = typeof asset.path === "string" ? asset.path : "";
  return {
    image: resolvedPath ? runtime.images.get(resolvedPath) || null : null,
    path: resolvedPath
  };
}

function getCustomGravelLayerImage(layer) {
  return getCustomGravelAssetImage(layer);
}

function getTintedCustomGravelAsset(asset, color, options = {}) {
  const normalizedColor = normalizeHexColor(color) || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
  const colorize = normalizeDecorColorizeSetting(options.colorize);
  const { image, path } = getCustomGravelAssetImage(asset);
  if (!image?.width || !image?.height || !path) {
    return null;
  }

  const maxDimension = Number.isFinite(options.maxDimension) && options.maxDimension > 0
    ? Math.max(1, Math.round(options.maxDimension))
    : 0;
  const scale = maxDimension
    ? Math.min(1, maxDimension / Math.max(image.width, image.height))
    : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const cacheScope = typeof options.cacheScope === "string" && options.cacheScope ? options.cacheScope : "base";
  const cacheKey = `${cacheScope}|${path}|${normalizedColor}|${colorize ? "colorize" : "hue"}|${width}x${height}`;
  const cached = runtime.customGravelTintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const targetRgb = hexToRgb(normalizedColor) || hexToRgb(DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR);
  if (!targetRgb) {
    return null;
  }
  const targetHsl = rgbToHsl(targetRgb);
  const sourceStats = getCaveLayerSourceStats(path, canvas.width, canvas.height, pixels);
  const hueDelta = getHueDeltaUnit(sourceStats.avgHue, targetHsl.h);

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha <= 0) {
      continue;
    }

    if (colorize) {
      const luminance = (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255;
      const shade = Math.pow(luminance, 0.92);
      pixels[index] = Math.round(targetRgb.r * shade);
      pixels[index + 1] = Math.round(targetRgb.g * shade);
      pixels[index + 2] = Math.round(targetRgb.b * shade);
      continue;
    }

    const hsl = rgbToHsl({
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    });
    const hasSourceHue = hsl.s > 0.035;
    const nextHue = hasSourceHue ? normalizeHueUnit(hsl.h + hueDelta) : targetHsl.h;
    const nextSat = targetHsl.s <= 0.02
      ? clamp(hsl.s * 0.18, 0, 0.18)
      : hasSourceHue
        ? clamp(hsl.s * 0.34 + targetHsl.s * 0.68, 0.08, 1)
        : clamp(targetHsl.s * 0.58, 0.08, 0.95);
    const nextLight = clamp(
      hsl.l * (0.5 + targetHsl.l * 0.64) + targetHsl.l * 0.08,
      0,
      1
    );
    const rgb = hslToRgb({ h: nextHue, s: nextSat, l: nextLight });
    pixels[index] = rgb.r;
    pixels[index + 1] = rgb.g;
    pixels[index + 2] = rgb.b;
  }

  context.putImageData(imageData, 0, 0);
  runtime.customGravelTintCache.set(cacheKey, canvas);
  return canvas;
}

function getTintedCustomGravelLayer(layer, color, options = {}) {
  return getTintedCustomGravelAsset(layer, color, {
    cacheScope: "layer",
    colorize: options.colorize,
    now: options.now
  });
}

function getTintedCustomGravelPebble(asset, color, options = {}) {
  return getTintedCustomGravelAsset(asset, color, {
    cacheScope: "pebble",
    colorize: options.colorize,
    now: options.now,
    maxDimension: CUSTOM_GRAVEL_TOP_PEBBLE_SPRITE_CACHE_SIZE
  });
}

function hasReadyCustomGravelLayers() {
  return runtime.customGravelLayerCatalog.length === CUSTOM_GRAVEL_LAYER_COUNT
    && runtime.customGravelLayerCatalog.every((layer) => Boolean(getCustomGravelLayerImage(layer).image));
}

function getCustomGravelLoosePebbleAssets() {
  return (runtime.customGravelPebbleCatalog || [])
    .filter((asset) => Boolean(getCustomGravelAssetImage(asset).image));
}

function canUseFishGravelPebblePlay() {
  return getCustomGravelLoosePebbleAssets().length > 0;
}

function getCustomGravelTopPebbleColors(now = Date.now()) {
  return hasReadyCustomGravelLayers()
    ? getResolvedCustomGravelLayerColors(now)
    : getActiveGravelPalette();
}

function getCustomGravelTopPebbleColorizeSettings() {
  return hasReadyCustomGravelLayers()
    ? getActiveCustomGravelLayerColorizeSettings()
    : getActiveGravelPalette().map(() => true);
}

function getCustomGravelPebbleSpriteByPath(path, color, options = {}) {
  if (typeof path !== "string" || !path) {
    return null;
  }

  return getTintedCustomGravelAsset(
    { path },
    color,
    {
      cacheScope: "pebble",
      colorize: options.colorize,
      now: options.now,
      maxDimension: CUSTOM_GRAVEL_TOP_PEBBLE_SPRITE_CACHE_SIZE
    }
  );
}

function getCustomGravelTopLayerCacheKey(bounds, now = Date.now()) {
  const colors = getCustomGravelTopPebbleColors(now).join("|");
  const colorize = getCustomGravelTopPebbleColorizeSettings().map((enabled) => (enabled ? "1" : "0")).join("|");
  const assets = getCustomGravelLoosePebbleAssets().map((asset) => asset.key).join("|");
  return [
    state.gravelSeed || 1,
    "custom",
    colors,
    colorize,
    assets,
    CUSTOM_GRAVEL_TOP_PEBBLE_COUNT,
    CUSTOM_GRAVEL_TOP_PEBBLE_DEPTH_PX,
    CUSTOM_GRAVEL_CONTOUR_PEBBLE_COUNT,
    CUSTOM_GRAVEL_CONTOUR_PEBBLE_SETTLE_MIN_RATIO,
    CUSTOM_GRAVEL_CONTOUR_PEBBLE_SETTLE_MAX_RATIO,
    CUSTOM_GRAVEL_CONTOUR_PEBBLE_SIZE_MIN_PX,
    CUSTOM_GRAVEL_CONTOUR_PEBBLE_SIZE_MAX_PX,
    bounds.left,
    bounds.right,
    bounds.bottom,
    bounds.baseTop
  ].join("|");
}

function getCustomGravelTopLayerCanvas(bounds, now = Date.now()) {
  const pebbleAssets = getCustomGravelLoosePebbleAssets();
  if (!pebbleAssets.length) {
    return null;
  }

  const cacheKey = getCustomGravelTopLayerCacheKey(bounds, now);
  if (runtime.customGravelTopLayerCanvas && runtime.customGravelTopLayerCacheKey === cacheKey) {
    return runtime.customGravelTopLayerCanvas;
  }

  const colors = getCustomGravelTopPebbleColors(now);
  const colorizeSettings = getCustomGravelTopPebbleColorizeSettings();
  const canvas = document.createElement("canvas");
  canvas.width = TANK_WIDTH;
  canvas.height = TANK_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const rand = mulberry32((Math.abs(Math.floor(state.gravelSeed || 1)) || 1) ^ 0x51f2e34d);
  const stamps = [];

  const pushPebbleStamp = (x, y, drawPriority = 0, options = {}) => {
    const asset = pebbleAssets[Math.floor(rand() * pebbleAssets.length)] || pebbleAssets[0];
    const colorIndex = Math.floor(rand() * colors.length);
    const color = colors[colorIndex] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
    const sprite = getTintedCustomGravelPebble(asset, color, {
      colorize: colorizeSettings[colorIndex],
      now
    });
    if (!sprite?.width || !sprite?.height) {
      return;
    }

    const minSize = Number.isFinite(options.sizeMin) ? options.sizeMin : CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MIN_PX;
    const maxSize = Number.isFinite(options.sizeMax) ? options.sizeMax : CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MAX_PX;
    const size = randomBetweenWith(rand, minSize, maxSize);
    const aspect = sprite.width / Math.max(1, sprite.height);
    const drawWidth = aspect >= 1 ? size : size * aspect;
    const drawHeight = aspect >= 1 ? size / aspect : size;
    const clampedX = clamp(x, bounds.left + drawWidth * 0.5, bounds.right - drawWidth * 0.5);
    const settledY = options.anchorToSurface
      ? y + drawHeight * randomBetweenWith(
        rand,
        CUSTOM_GRAVEL_CONTOUR_PEBBLE_SETTLE_MIN_RATIO,
        CUSTOM_GRAVEL_CONTOUR_PEBBLE_SETTLE_MAX_RATIO
      )
      : y;

    stamps.push({
      sprite,
      x: clampedX,
      y: settledY,
      width: drawWidth,
      height: drawHeight,
      rotation: randomBetweenWith(rand, -Math.PI, Math.PI),
      drawPriority,
      grounded: options.grounded === true
    });
  };

  for (let index = 0; index < CUSTOM_GRAVEL_TOP_PEBBLE_COUNT; index += 1) {
    const x = randomBetweenWith(rand, bounds.left, bounds.right);
    const surfaceY = getTankFloorMaskSurfaceYAtX(x, bounds);
    const depthOffset = CUSTOM_GRAVEL_TOP_PEBBLE_SIZE_MIN_PX * 0.45
      + Math.pow(rand(), 1.45) * CUSTOM_GRAVEL_TOP_PEBBLE_DEPTH_PX;

    pushPebbleStamp(x, surfaceY + depthOffset, 0, { grounded: true });
  }

  const contourSpacing = bounds.drawWidth / Math.max(1, CUSTOM_GRAVEL_CONTOUR_PEBBLE_COUNT);
  for (let index = 0; index < CUSTOM_GRAVEL_CONTOUR_PEBBLE_COUNT; index += 1) {
    const contourX = bounds.left
      + (index + 0.5) * contourSpacing
      + randomBetweenWith(
        rand,
        -contourSpacing * CUSTOM_GRAVEL_CONTOUR_PEBBLE_X_JITTER_RATIO,
        contourSpacing * CUSTOM_GRAVEL_CONTOUR_PEBBLE_X_JITTER_RATIO
      );
    const contourY = getTankFloorMaskSurfaceYAtX(contourX, bounds);

    pushPebbleStamp(contourX, contourY, 1, {
      anchorToSurface: true,
      grounded: true,
      sizeMin: CUSTOM_GRAVEL_CONTOUR_PEBBLE_SIZE_MIN_PX,
      sizeMax: CUSTOM_GRAVEL_CONTOUR_PEBBLE_SIZE_MAX_PX
    });
  }

  stamps.sort((left, right) => {
    if (left.drawPriority !== right.drawPriority) {
      return left.drawPriority - right.drawPriority;
    }

    return left.y - right.y;
  });
  for (const stamp of stamps) {
    context.save();
    context.translate(stamp.x, stamp.y);
    if (stamp.grounded) {
      context.globalAlpha = 0.16;
      context.fillStyle = "rgba(10, 14, 18, 0.72)";
      context.beginPath();
      context.ellipse(0, stamp.height * 0.28, stamp.width * 0.34, Math.max(0.9, stamp.height * 0.11), 0, 0, Math.PI * 2);
      context.fill();
    }
    context.rotate(stamp.rotation);
    context.globalAlpha = 1;
    context.drawImage(
      stamp.sprite,
      -stamp.width * 0.5,
      -stamp.height * 0.5,
      stamp.width,
      stamp.height
    );
    context.restore();
  }

  runtime.customGravelTopLayerCanvas = canvas;
  runtime.customGravelTopLayerCacheKey = cacheKey;
  return canvas;
}

function drawCustomGravelLoosePebbles(bounds, now = Date.now()) {
  const canvas = getCustomGravelTopLayerCanvas(bounds, now);
  if (!canvas) {
    return false;
  }

  tankContext.drawImage(canvas, 0, 0);
  return true;
}

function isCustomGravelUvReactiveColor(color) {
  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return false;
  }

  const matchedChoice = CUSTOM_GRAVEL_COLOR_OPTIONS.find((choice) => normalizeHexColor(choice.color) === normalizedColor);
  if (matchedChoice) {
    return CUSTOM_GRAVEL_UV_REACTIVE_COLOR_KEYS.has(matchedChoice.key);
  }

  const rgb = hexToRgb(normalizedColor);
  if (!rgb) {
    return false;
  }

  const hsl = rgbToHsl(rgb);
  const hue = normalizeHueUnit(hsl.h);
  const value = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  if (value < 0.42) {
    return false;
  }

  if (hsl.s < 0.18) {
    return value > 0.9;
  }

  if (hue >= 0.07 && hue <= 0.14 && hsl.s < 0.62 && value < 0.92) {
    return false;
  }

  return hsl.s >= 0.34 && value >= 0.58;
}

function drawCustomGravelFloor(bounds, now = Date.now()) {
  const layerColors = getResolvedCustomGravelLayerColors(now);
  const layerColorize = getActiveCustomGravelLayerColorizeSettings();
  const fallbackPalette = getActiveGravelPalette();
  const baseColors = Array.from({ length: CUSTOM_GRAVEL_LAYER_COUNT }, (_, index) => (
    normalizeHexColor(layerColors[index])
    || normalizeHexColor(fallbackPalette[index])
    || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR
  ));

  // The authored gravel textures can contain a little transparent breathing room
  // near their lower edge. During the edit-mode pullback that transparency lets
  // the tank background peek through as a blue strip below the gravel. Lay down
  // a solid gravel-toned base first so the substrate always reaches its floor.
  const gravelBaseGradient = tankContext.createLinearGradient(0, bounds.drawTop, 0, bounds.bottom);
  gravelBaseGradient.addColorStop(0, formatRgba(hexToRgb(baseColors[0] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR), 0.96));
  gravelBaseGradient.addColorStop(0.52, formatRgba(hexToRgb(baseColors[1] || baseColors[0] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR), 0.98));
  gravelBaseGradient.addColorStop(1, formatRgba(hexToRgb(baseColors[2] || baseColors[1] || baseColors[0] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR), 1));
  tankContext.fillStyle = gravelBaseGradient;
  tankContext.fillRect(bounds.left, bounds.drawTop, bounds.drawWidth, Math.max(1, bounds.bottom - bounds.drawTop + 2));

  let drewLayer = false;
  for (let index = 0; index < runtime.customGravelLayerCatalog.length; index += 1) {
    const layer = runtime.customGravelLayerCatalog[index];
    const tintedLayer = getTintedCustomGravelLayer(
      layer,
      layerColors[index] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR,
      {
        colorize: layerColorize[index],
        now
      }
    );
    if (!tintedLayer) {
      continue;
    }

    drawImageCover(tankContext, tintedLayer, bounds.left, bounds.drawTop, bounds.drawWidth, bounds.drawHeight);
    if (isUvLightGravelGlowEnabled() && isCustomGravelUvReactiveColor(layerColors[index])) {
      drawUvGlowImageCoverToContext(
        tankContext,
        tintedLayer,
        bounds.left,
        bounds.drawTop,
        bounds.drawWidth,
        bounds.drawHeight,
        0.52,
        0.32 + index * 0.05
      );
    }
    drewLayer = true;
  }

  return drewLayer;
}

function drawGravelDepthTreatment(bounds) {
  const floorHeight = Math.max(1, bounds.bottom - bounds.drawTop);

  tankContext.save();
  traceTankFloorMaskPath(tankContext, bounds);
  tankContext.clip();

  // Subtle depth darkening lowers the visual competition of the substrate and
  // makes the lower gravel read as receding away from the lit water column.
  tankContext.globalCompositeOperation = "multiply";
  const depthShade = tankContext.createLinearGradient(0, bounds.drawTop, 0, bounds.bottom);
  depthShade.addColorStop(0, "rgba(255, 255, 255, 0)");
  depthShade.addColorStop(0.34, "rgba(238, 242, 248, 0.012)");
  depthShade.addColorStop(0.68, "rgba(106, 119, 139, 0.055)");
  depthShade.addColorStop(1, "rgba(30, 37, 50, 0.145)");
  tankContext.fillStyle = depthShade;
  tankContext.fillRect(bounds.left, bounds.drawTop, bounds.drawWidth, floorHeight + 2);

  // A narrow feather just inside the gravel crest softens the hard water-to-
  // substrate seam without painting haze over the open water.
  const crestBlendHeight = Math.min(70, Math.max(34, floorHeight * 0.24));
  const crestShade = tankContext.createLinearGradient(0, bounds.drawTop, 0, bounds.drawTop + crestBlendHeight);
  crestShade.addColorStop(0, "rgba(39, 51, 67, 0.075)");
  crestShade.addColorStop(0.32, "rgba(64, 76, 94, 0.038)");
  crestShade.addColorStop(1, "rgba(255, 255, 255, 0)");
  tankContext.fillStyle = crestShade;
  tankContext.fillRect(bounds.left, bounds.drawTop, bounds.drawWidth, crestBlendHeight);

  // Slight edge falloff keeps the saturated gravel from feeling like a flat
  // banner and reinforces the curved glass/tank depth near the sides.
  const edgeShade = tankContext.createRadialGradient(
    bounds.left + bounds.drawWidth * 0.5,
    bounds.drawTop + floorHeight * 0.32,
    bounds.drawWidth * 0.16,
    bounds.left + bounds.drawWidth * 0.5,
    bounds.drawTop + floorHeight * 0.36,
    bounds.drawWidth * 0.66
  );
  edgeShade.addColorStop(0, "rgba(255, 255, 255, 0)");
  edgeShade.addColorStop(0.72, "rgba(198, 207, 219, 0.012)");
  edgeShade.addColorStop(1, "rgba(51, 61, 76, 0.06)");
  tankContext.fillStyle = edgeShade;
  tankContext.fillRect(bounds.left, bounds.drawTop, bounds.drawWidth, floorHeight + 2);

  tankContext.restore();
}

function drawTankFloor(now = Date.now()) {
  const bounds = getTankFloorDrawBounds();

  tankContext.save();
  traceTankFloorMaskPath(tankContext, bounds);
  tankContext.clip();

  drawCustomGravelFloor(bounds, now);

  tankContext.restore();

  drawGravelDepthTreatment(bounds);
  drawCustomGravelLoosePebbles(bounds, now);
}

function getGravelGrimeIntensity(dirtiness = getTankDirtiness(Date.now())) {
  return clamp((clamp(Number(dirtiness) || 0, 0, 1) - 0.1) / 0.75, 0, 1);
}

function drawGravelGrime(now = Date.now(), dirtiness = getTankDirtiness(now)) {
  const intensity = getGravelGrimeIntensity(dirtiness);
  if (intensity <= 0.01) {
    return;
  }

  const bounds = getTankFloorDrawBounds();
  const seed = (Number(state.gravelSeed) || 1) ^ 0x51ed1eaf;
  const rand = mulberry32(seed >>> 0);
  const blotchCount = Math.round(58 + intensity * 118);

  tankContext.save();
  traceTankFloorMaskPath(tankContext, bounds);
  tankContext.clip();
  tankContext.globalCompositeOperation = "multiply";
  tankContext.fillStyle = `rgba(84, 66, 34, ${(0.035 + intensity * 0.09).toFixed(3)})`;
  tankContext.fillRect(bounds.left, bounds.drawTop, bounds.drawWidth, bounds.drawHeight);

  for (let index = 0; index < blotchCount; index += 1) {
    const x = bounds.left + rand() * bounds.drawWidth;
    const surfaceY = getTankFloorMaskSurfaceYAtX(x, bounds);
    const depth = Math.pow(rand(), 1.45);
    const y = surfaceY + depth * (bounds.bottom - surfaceY) + randomBetweenWith(rand, -2, 5);
    const radius = randomBetweenWith(rand, 6, 26) * (0.72 + intensity * 0.62);
    const greenBias = rand();
    const alpha = (0.012 + rand() * 0.026) * intensity;
    tankContext.fillStyle = greenBias > 0.5
      ? `rgba(42, 74, 38, ${alpha.toFixed(3)})`
      : `rgba(112, 77, 34, ${alpha.toFixed(3)})`;
    tankContext.beginPath();
    tankContext.ellipse(
      x,
      y,
      radius * randomBetweenWith(rand, 0.7, 1.55),
      radius * randomBetweenWith(rand, 0.24, 0.62),
      randomBetweenWith(rand, -0.35, 0.35),
      0,
      Math.PI * 2
    );
    tankContext.fill();
  }

  tankContext.restore();
}

function drawSedimentClouds(now = Date.now()) {
  if (!runtime.sedimentClouds.length) {
    return;
  }

  tankContext.save();
  tankContext.globalCompositeOperation = "source-over";
  for (const cloud of runtime.sedimentClouds) {
    const duration = Math.max(1, Number(cloud.durationMs) || SEDIMENT_CLOUD_DURATION_MIN_MS);
    const progress = clamp((now - (Number(cloud.startedAt) || now)) / duration, 0, 1);
    const fade = Math.pow(1 - progress, 1.55);
    const strength = clamp(Number(cloud.strength) || 0.6, 0.12, 1.4);
    const rand = mulberry32(hashStringToUint32(cloud.id || String(cloud.seed || "")) ^ 0x7f4a7c15);
    const centerX = cloud.x + (Number(cloud.driftX) || 0) * progress;
    const centerY = cloud.y + (Number(cloud.driftY) || -5) * progress;
    const radius = (Number(cloud.baseRadius) || 20) * (0.55 + progress * 2.15);
    const puffCount = 7;

    for (let index = 0; index < puffCount; index += 1) {
      const angle = randomBetweenWith(rand, 0, Math.PI * 2);
      const distance = randomBetweenWith(rand, 0, radius * 0.62);
      const x = centerX + Math.cos(angle) * distance + Math.sin(now / 720 + index) * 1.2;
      const y = centerY + Math.sin(angle) * distance * 0.52;
      const puffRadius = radius * randomBetweenWith(rand, 0.34, 0.72);
      const green = randomBetweenWith(rand, 0, 1) > 0.44;
      const alpha = clamp((green ? 0.036 : 0.044) * strength * fade, 0, 0.13);
      tankContext.fillStyle = green
        ? `rgba(58, 85, 45, ${alpha.toFixed(3)})`
        : `rgba(113, 82, 45, ${alpha.toFixed(3)})`;
      tankContext.beginPath();
      tankContext.ellipse(
        x,
        y,
        puffRadius * randomBetweenWith(rand, 0.86, 1.45),
        puffRadius * randomBetweenWith(rand, 0.34, 0.68),
        randomBetweenWith(rand, -0.42, 0.42),
        0,
        Math.PI * 2
      );
      tankContext.fill();
    }
  }
  tankContext.restore();
}

function drawGravelDigBursts(now = Date.now()) {
  if (!runtime.gravelDigBursts?.length) {
    return;
  }

  for (const burst of runtime.gravelDigBursts) {
    const duration = Math.max(1, Number(burst.durationMs) || GRAVEL_DIG_BURST_DURATION_MIN_MS);
    const progress = clamp((now - (Number(burst.startedAt) || now)) / duration, 0, 1);

    for (const particle of burst.particles || []) {
      const particleProgress = clamp((progress - particle.delay) / Math.max(0.2, 1 - particle.delay), 0, 1);
      if (particleProgress <= 0 || particleProgress >= 1) {
        continue;
      }

      const horizontalProgress = 1 - Math.pow(1 - particleProgress, 1.45);
      const settleProgress = Math.pow(particleProgress, 1.85);
      const sway = Math.sin(particleProgress * Math.PI * 2.4 + particle.sway * Math.PI * 2) * (1 - particleProgress) * 4;
      const x = particle.startX + (particle.endX - particle.startX) * horizontalProgress + sway;
      const y = particle.startY + (particle.endY - particle.startY) * settleProgress - Math.sin(particleProgress * Math.PI) * particle.liftPx;
      const alpha = particle.alpha * (particleProgress < 0.86 ? 1 : clamp((1 - particleProgress) / 0.14, 0, 1));
      const customSprite = particle.assetPath
        ? getCustomGravelPebbleSpriteByPath(particle.assetPath, particle.color, { colorize: particle.colorize })
        : null;

      if (customSprite?.width && customSprite?.height) {
        const stableScale = getViewportStableAssetScale();
        const size = (Number.isFinite(Number(particle.sizePx)) ? Number(particle.sizePx) : FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX) * stableScale;
        const aspect = customSprite.width / Math.max(1, customSprite.height);
        const drawWidth = aspect >= 1 ? size : size * aspect;
        const drawHeight = aspect >= 1 ? size / aspect : size;
        tankContext.save();
        tankContext.translate(x, y);
        tankContext.rotate(particle.rotation + particle.spin * horizontalProgress);
        tankContext.globalAlpha = alpha;
        tankContext.drawImage(
          customSprite,
          -drawWidth * 0.5,
          -drawHeight * 0.5,
          drawWidth,
          drawHeight
        );
        tankContext.restore();
      } else if (!particle.assetPath) {
        drawGravelPebbleSprite(
          tankContext,
          x,
          y,
          Number.isFinite(Number(particle.sizePx)) ? Number(particle.sizePx) : FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX,
          particle.rotation + particle.spin * horizontalProgress,
          particle.spriteIndex,
          particle.color,
          alpha,
          particle.stretchY,
          particle.variantIndex
        );
      }
    }
  }
}

function drawCoinGlints(now = Date.now()) {
  if (!runtime.coinGlints.length) {
    return;
  }

  tankContext.save();
  tankContext.globalCompositeOperation = "screen";
  for (const glint of runtime.coinGlints) {
    const duration = Math.max(1, Number(glint.durationMs) || GRAVEL_COIN_GLINT_DURATION_MS);
    const progress = clamp((now - (Number(glint.startedAt) || now)) / duration, 0, 1);
    const ease = 1 - Math.pow(1 - progress, 2);
    const alpha = Math.sin(progress * Math.PI) * 0.95;
    const x = glint.x + Math.sin(now / 220 + glint.seed * 8) * 5;
    const y = glint.y - ease * 38;
    const size = 7 + Math.sin(progress * Math.PI) * 4;

    tankContext.globalAlpha = alpha;
    tankContext.strokeStyle = "rgba(255, 238, 148, 0.95)";
    tankContext.fillStyle = "rgba(255, 188, 52, 0.78)";
    tankContext.lineWidth = 1.4;
    tankContext.beginPath();
    tankContext.ellipse(x, y, size * 0.72, size * 0.36, -0.2, 0, Math.PI * 2);
    tankContext.fill();
    tankContext.stroke();
    tankContext.beginPath();
    tankContext.moveTo(x - size * 1.2, y);
    tankContext.lineTo(x + size * 1.2, y);
    tankContext.moveTo(x, y - size * 1.2);
    tankContext.lineTo(x, y + size * 1.2);
    tankContext.stroke();
  }
  tankContext.restore();
}

function invalidateGravelBedCache(clearTintCache = true) {
  runtime.gravelBedCacheKey = "";
  runtime.gravelBedCanvas = null;
  runtime.gravelCapCanvas = null;
  if (clearTintCache) {
    runtime.gravelTintCache.clear();
  }
}

function ensureGravelLayouts() {
  if (!runtime.scene) {
    return;
  }

  const assetKey = runtime.gravelCatalog.map((item) => item.key).join("|");
  const layoutKey = `${state.gravelSeed}|${assetKey}|${getGravelFloorLayoutKey()}`;
  const contourKey = `${state.gravelSeed}|surface`;
  if (runtime.scene.gravelSurfaceContourKey !== contourKey) {
    runtime.scene.gravelSurfaceContourKey = contourKey;
    runtime.scene.gravelSurfaceContour = buildGravelSurfaceContour(state.gravelSeed || 1);
  }
  if (runtime.scene.gravelLayoutKey === layoutKey) {
    return;
  }

  const rand = mulberry32((state.gravelSeed || 1) ^ 0x6d2b79f5);
  const spriteCount = Math.max(1, runtime.gravelCatalog.length || 1);
  const stamps = [];
  const capStamps = [];
  const floorLeft = GLASS_MARGIN_X - 28;
  const floorRight = TANK_WIDTH - GLASS_MARGIN_X + 28;

  const pushStamp = (stamp, capMultiplier = 0.92) => {
    const nextStamp = {
      ...stamp,
      sortKey: stamp.y + stamp.size * 0.24
    };
    stamps.push(nextStamp);
    const surfaceY = getTankFloorSurfaceYAtX(nextStamp.x);
    if (nextStamp.y - nextStamp.size * 0.18 <= surfaceY + GRAVEL_SURFACE_CAP_DEPTH_PX + nextStamp.size * 0.18) {
      capStamps.push({
        ...nextStamp,
        alpha: clamp(nextStamp.alpha * capMultiplier, 0.6, 1)
      });
    }
  };

  const layRowPass = ({
    rowStepPx,
    depthPx,
    startOffsetPx,
    sizeMin,
    sizeMax,
    advanceMin,
    advanceMax,
    alphaMin,
    alphaMax,
    jitterX,
    jitterY,
    stretchMin,
    stretchMax,
    capMultiplier = 0.92
  }) => {
    const rowCount = Math.max(4, Math.ceil((depthPx + 16) / rowStepPx));
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const depthRatio = rowIndex / Math.max(1, rowCount - 1);
      let cursorX = floorLeft + randomBetweenWith(rand, -10, 10);
      while (cursorX < floorRight) {
        const sizeBias = 0.92 + depthRatio * 0.22;
        const size = randomBetweenWith(rand, sizeMin * sizeBias, sizeMax * sizeBias);
        const x = cursorX + size * 0.5 + randomBetweenWith(rand, -jitterX, jitterX);
        const surfaceY = getTankFloorSurfaceYAtX(x);
        const y = surfaceY + startOffsetPx + depthRatio * depthPx + randomBetweenWith(rand, -jitterY, jitterY);
        pushStamp({
          x,
          y,
          size,
          rotation: randomBetweenWith(rand, -Math.PI, Math.PI),
          alpha: randomBetweenWith(rand, alphaMin, alphaMax),
          spriteIndex: Math.floor(rand() * spriteCount),
          colorIndex: Math.floor(rand() * 3),
          variantIndex: Math.floor(rand() * GRAVEL_VARIANT_BUCKETS),
          stretchY: randomBetweenWith(rand, stretchMin, stretchMax)
        }, capMultiplier);
        cursorX += Math.max(2.8, size * randomBetweenWith(rand, advanceMin, advanceMax));
      }
    }
  };

  layRowPass({
    rowStepPx: 7,
    depthPx: GRAVEL_BED_DEPTH_PX + 18,
    startOffsetPx: 2,
    sizeMin: GRAVEL_PEBBLE_SIZE_MIN * 0.92,
    sizeMax: GRAVEL_PEBBLE_SIZE_MAX * 1.1,
    advanceMin: 0.8,
    advanceMax: 1.12,
    alphaMin: 0.88,
    alphaMax: 1,
    jitterX: 4.6,
    jitterY: 2.2,
    stretchMin: 0.84,
    stretchMax: 1.2,
    capMultiplier: 0.95
  });

  layRowPass({
    rowStepPx: 6.2,
    depthPx: GRAVEL_BED_DEPTH_PX * 0.7,
    startOffsetPx: 0.5,
    sizeMin: GRAVEL_PEBBLE_SIZE_MIN * 0.62,
    sizeMax: GRAVEL_PEBBLE_SIZE_MAX * 0.84,
    advanceMin: 0.85,
    advanceMax: 1.18,
    alphaMin: 0.78,
    alphaMax: 0.95,
    jitterX: 4.2,
    jitterY: 1.9,
    stretchMin: 0.82,
    stretchMax: 1.24,
    capMultiplier: 0.92
  });

  layRowPass({
    rowStepPx: 4.8,
    depthPx: GRAVEL_SURFACE_CAP_DEPTH_PX + 10,
    startOffsetPx: -1.2,
    sizeMin: GRAVEL_PEBBLE_SIZE_MIN * 0.42,
    sizeMax: GRAVEL_PEBBLE_SIZE_MAX * 0.68,
    advanceMin: 0.92,
    advanceMax: 1.28,
    alphaMin: 0.72,
    alphaMax: 0.9,
    jitterX: 3.1,
    jitterY: 1.35,
    stretchMin: 0.8,
    stretchMax: 1.26,
    capMultiplier: 0.88
  });

  const fillerCount = Math.max(900, Math.ceil(GRAVEL_BED_STAMP_COUNT * 0.18));
  for (let index = 0; index < fillerCount; index += 1) {
    const x = GLASS_MARGIN_X + rand() * (TANK_WIDTH - GLASS_MARGIN_X * 2);
    const surfaceY = getTankFloorSurfaceYAtX(x);
    const depthRatio = Math.pow(rand(), 1.18);
    const nearSurface = rand() < 0.55;
    const size = nearSurface
      ? randomBetweenWith(rand, GRAVEL_PEBBLE_SIZE_MIN * 0.4, GRAVEL_PEBBLE_SIZE_MAX * 0.62)
      : randomBetweenWith(rand, GRAVEL_PEBBLE_SIZE_MIN * 0.56, GRAVEL_PEBBLE_SIZE_MAX * 0.88);
    const y = surfaceY
      + (nearSurface ? randomBetweenWith(rand, -1.2, GRAVEL_SURFACE_CAP_DEPTH_PX + 6) : 5 + depthRatio * (GRAVEL_BED_DEPTH_PX + 14))
      + randomBetweenWith(rand, -1.6, 2.2);
    pushStamp({
      x: x + randomBetweenWith(rand, -7, 7),
      y,
      size,
      rotation: randomBetweenWith(rand, -Math.PI, Math.PI),
      alpha: randomBetweenWith(rand, nearSurface ? 0.72 : 0.8, nearSurface ? 0.9 : 0.96),
      spriteIndex: Math.floor(rand() * spriteCount),
      colorIndex: Math.floor(rand() * 3),
      variantIndex: Math.floor(rand() * GRAVEL_VARIANT_BUCKETS),
      stretchY: randomBetweenWith(rand, 0.82, 1.24)
    }, nearSurface ? 0.86 : 0.9);
  }

  runtime.scene.gravelLayoutKey = layoutKey;
  runtime.scene.gravelBedStamps = stamps.sort((left, right) => left.sortKey - right.sortKey);
  runtime.scene.gravelCapStamps = capStamps.sort((left, right) => left.sortKey - right.sortKey);
}

function getGravelBedCacheKey() {
  const palette = getActiveGravelPalette().join("|");
  const assets = runtime.gravelCatalog.map((item) => item.key).join("|");
  const resolution = getGravelCacheDimensions();
  return `${state.gravelSeed}|${palette}|${assets}|${resolution.width}x${resolution.height}|${getGravelFloorLayoutKey()}`;
}

function getGravelBedCanvas() {
  ensureGravelLayouts();
  const cacheKey = getGravelBedCacheKey();
  if (runtime.gravelBedCanvas && runtime.gravelCapCanvas && runtime.gravelBedCacheKey === cacheKey) {
    return runtime.gravelBedCanvas;
  }

  const resolution = getGravelCacheDimensions();
  const scaleX = resolution.width / TANK_WIDTH;
  const scaleY = resolution.height / TANK_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  configureCanvasContext(context);
  renderGravelBedToCanvas(context);

  const capCanvas = document.createElement("canvas");
  capCanvas.width = resolution.width;
  capCanvas.height = resolution.height;
  const capContext = capCanvas.getContext("2d");
  if (!capContext) {
    return null;
  }

  capContext.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  configureCanvasContext(capContext);
  renderGravelCapToCanvas(capContext);
  runtime.gravelBedCanvas = canvas;
  runtime.gravelCapCanvas = capCanvas;
  runtime.gravelBedCacheKey = cacheKey;
  return canvas;
}

function getGravelCapCanvas() {
  if (!getGravelBedCanvas()) {
    return null;
  }
  return runtime.gravelCapCanvas;
}

function getGravelCacheDimensions() {
  const baseWidth = Math.max(TANK_WIDTH, dom.tankCanvas?.width || 0);
  const baseHeight = Math.max(TANK_HEIGHT, dom.tankCanvas?.height || 0);
  return {
    width: Math.max(TANK_WIDTH, Math.round(baseWidth * GRAVEL_CACHE_OVERSAMPLE)),
    height: Math.max(TANK_HEIGHT, Math.round(baseHeight * GRAVEL_CACHE_OVERSAMPLE))
  };
}

function renderGravelBedToCanvas(context) {
  context.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  if (!runtime.scene?.gravelBedStamps?.length) {
    return;
  }

  context.save();
  traceTankFloorPath(context);
  context.clip();

  const palette = getActiveGravelPalette();
  for (const stamp of runtime.scene.gravelBedStamps) {
    const color = palette[stamp.colorIndex] || palette[0];
    drawGravelPebbleSprite(
      context,
      stamp.x,
      stamp.y,
      stamp.size,
      stamp.rotation,
      stamp.spriteIndex,
      color,
      stamp.alpha,
      stamp.stretchY,
      stamp.variantIndex
    );
  }

  context.restore();
}

function renderGravelCapToCanvas(context) {
  context.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  if (!runtime.scene?.gravelCapStamps?.length) {
    return;
  }

  context.save();
  traceTankFloorSurfaceBandPath(context);
  context.clip();

  const palette = getActiveGravelPalette();
  for (const stamp of runtime.scene.gravelCapStamps) {
    const color = palette[stamp.colorIndex] || palette[0];
    drawGravelPebbleSprite(
      context,
      stamp.x,
      stamp.y,
      stamp.size,
      stamp.rotation,
      stamp.spriteIndex,
      color,
      stamp.alpha,
      stamp.stretchY,
      stamp.variantIndex
    );
  }

  context.restore();
}

function drawLooseGravel(now, options = {}) {
  const { surfaceKind = null, decorLayer = null, transientOnly = false } = options;
  const loosePebbles = [];
  const draggedExistingId = runtime.pebbleDragState?.existingId || null;

  if (!transientOnly) {
    for (const pebble of state.gravelLivePebbles) {
      if (pebble.id === draggedExistingId) {
        continue;
      }
      if (surfaceKind && pebble.surfaceKind !== surfaceKind) {
        continue;
      }
      if (surfaceKind === "decor" && decorLayer !== null) {
        const decorItem = state.placedDecor.find((item) => item.id === pebble.decorId);
        if (!decorItem || getDecorTankLayer(decorItem) !== decorLayer) {
          continue;
        }
      }
      const pose = resolveLiveGravelPebblePose(pebble);
      if (!pose) {
        continue;
      }
      loosePebbles.push({ pebble, pose, alpha: 1, grounded: true });
    }
  }

  if (transientOnly) {
    for (const falling of runtime.fallingGravelPebbles) {
      loosePebbles.push({ pebble: falling.pebble, pose: getFallingGravelPebblePose(falling, now), alpha: 0.96, grounded: false });
    }

    if (runtime.pebbleDragState) {
      loosePebbles.push({
        pebble: runtime.pebbleDragState.pebble,
        pose: {
          x: runtime.pebbleDragState.pebble.xNorm * TANK_WIDTH,
          y: runtime.pebbleDragState.pebble.yNorm * TANK_HEIGHT
        },
        alpha: 0.98,
        grounded: false
      });
    }
  }

  loosePebbles
    .sort((left, right) => left.pose.y - right.pose.y)
    .forEach(({ pebble, pose, alpha, grounded }) => {
      if (grounded) {
        drawLoosePebbleGrounding(pose, pebble, alpha);
      }
      drawGravelPebbleSprite(
        tankContext,
        pose.x,
        pose.y,
        pebble.size,
        pebble.rotation,
        pebble.spriteIndex,
        getActiveGravelPalette()[pebble.colorIndex] || getActiveGravelPalette()[0],
        alpha * (pebble.alpha || 1),
        pebble.stretchY,
        pebble.variantIndex
      );
    });
}

function drawLoosePebbleGrounding(pose, pebble, alpha) {
  if (!pose || !pebble) {
    return;
  }

  const contactOpacity = pebble.surfaceKind === "decor"
    ? 0.06
    : 0.09 + (1 - clamp(pebble.liftPx / Math.max(1, GRAVEL_LIVE_LAYER_DEPTH_PX), 0, 1)) * 0.1;
  const rx = pebble.size * 0.34;
  const ry = Math.max(1.2, pebble.size * 0.14);
  const offsetY = pebble.surfaceKind === "decor" ? pebble.size * 0.12 : pebble.size * 0.16;

  tankContext.save();
  tankContext.globalAlpha = alpha * contactOpacity;
  tankContext.fillStyle = "rgba(10, 14, 18, 0.88)";
  tankContext.beginPath();
  tankContext.ellipse(pose.x, pose.y + offsetY, rx, ry, 0, 0, Math.PI * 2);
  tankContext.fill();
  tankContext.restore();
}

function drawLooseGravelCap() {
  const capCanvas = getGravelCapCanvas();
  if (!capCanvas) {
    return;
  }

  tankContext.save();
  traceTankFloorSurfaceBandPath(tankContext);
  tankContext.clip();
  tankContext.drawImage(capCanvas, 0, 0, TANK_WIDTH, TANK_HEIGHT);
  tankContext.restore();
}

function drawGravelPebbleSprite(context, x, y, size, rotation, spriteIndex, color, alpha = 1, stretchY = 1, variantIndex = 0) {
  const asset = getGravelPebbleAsset(spriteIndex);
  const tintedSprite = asset ? getTintedGravelPebbleSprite(asset.path, color, variantIndex) : null;
  if (!tintedSprite) {
    return;
  }

  const width = size;
  const height = Math.max(4, width * (tintedSprite.height / tintedSprite.width) * clamp(stretchY, 0.72, 1.32));
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.globalAlpha = alpha;
  context.drawImage(tintedSprite, -width / 2, -height / 2, width, height);
  context.restore();
}

function getGravelPebbleAsset(index = 0) {
  const assets = runtime.gravelCatalog;
  if (!assets.length) {
    return null;
  }

  const normalizedIndex = Number.isFinite(Number(index)) ? Math.floor(Number(index)) : 0;
  const wrappedIndex = ((normalizedIndex % assets.length) + assets.length) % assets.length;
  return assets[wrappedIndex] || assets[0];
}

function getPebbleShapeDescriptor(pebble, poseOverride = null) {
  const asset = getGravelPebbleAsset(pebble?.spriteIndex);
  if (!asset) {
    return null;
  }

  const mask = getImageAlphaMask(asset.path);
  if (!mask) {
    return null;
  }

  const pose = poseOverride || resolveLiveGravelPebblePose(pebble);
  if (!pose) {
    return null;
  }

  const width = pebble.size;
  const height = Math.max(4, width * (mask.height / mask.width) * clamp(pebble.stretchY, 0.72, 1.32));
  const rotation = pebble.rotation || 0;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const worldCos = Math.cos(rotation);
  const worldSin = Math.sin(rotation);
  const localToWorld = (localX, localY) => ({
    x: pose.x + localX * worldCos - localY * worldSin,
    y: pose.y + localX * worldSin + localY * worldCos
  });
  const corners = [
    localToWorld(-width / 2, -height / 2),
    localToWorld(width / 2, -height / 2),
    localToWorld(width / 2, height / 2),
    localToWorld(-width / 2, height / 2)
  ];

  return {
    mask,
    pose,
    bounds: {
      left: Math.min(...corners.map((corner) => corner.x)),
      right: Math.max(...corners.map((corner) => corner.x)),
      top: Math.min(...corners.map((corner) => corner.y)),
      bottom: Math.max(...corners.map((corner) => corner.y))
    },
    worldToUv(worldX, worldY) {
      let localX = worldX - pose.x;
      let localY = worldY - pose.y;
      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;
      localX = rotatedX;
      localY = rotatedY;
      return {
        u: (localX + width / 2) / width,
        v: (localY + height / 2) / height
      };
    }
  };
}

function getTintedGravelPebbleSprite(spritePath, color, variantIndex = 0) {
  if (!spritePath) {
    return null;
  }

  const normalizedColor = normalizeHexColor(color) || DEFAULT_GRAVEL_PALETTE[0];
  const normalizedVariantIndex = clamp(Math.floor(Number(variantIndex) || 0), 0, GRAVEL_VARIANT_BUCKETS - 1);
  const cacheKey = `${spritePath}|${normalizedColor}|${normalizedVariantIndex}`;
  const cached = runtime.gravelTintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const image = runtime.images.get(spritePath);
  if (!image?.width || !image?.height) {
    return null;
  }

  const scale = Math.min(GRAVEL_SPRITE_CACHE_SIZE / image.width, GRAVEL_SPRITE_CACHE_SIZE / image.height, 1);
  const width = Math.max(18, Math.round(image.width * scale));
  const height = Math.max(18, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const sourceStats = getPebbleSourceStats(spritePath, width, height, imageData.data);
  const targetHsl = rgbToHsl(hexToRgb(normalizedColor) || hexToRgb(DEFAULT_GRAVEL_PALETTE[0]));
  const variantCenter = (GRAVEL_VARIANT_BUCKETS - 1) / 2;
  const variantOffset = (normalizedVariantIndex - variantCenter) / Math.max(1, variantCenter);
  const targetHue = normalizeHueUnit(targetHsl.h + variantOffset * 0.022);
  const hueDelta = getHueDeltaUnit(sourceStats.avgHue, targetHue);
  const satNudge = variantOffset * 0.055;
  const lightNudge = variantOffset * 0.016;
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha <= 6) {
      continue;
    }

    const hsl = rgbToHsl({
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    });

    let nextHue = targetHue;
    let nextSat = hsl.s;
    let nextLight = hsl.l;

    if (hsl.s > 0.035) {
      nextHue = normalizeHueUnit(hsl.h + hueDelta);
      nextSat = clamp(hsl.s * (0.96 + targetHsl.s * 0.16 + satNudge) + targetHsl.s * 0.05, 0.05, 1);
      nextLight = clamp(hsl.l * (1 + lightNudge), 0, 1);
    } else if (targetHsl.s > 0.08) {
      nextSat = clamp(hsl.s + targetHsl.s * 0.08, 0, 0.16);
    }

    const rgb = hslToRgb({ h: nextHue, s: nextSat, l: nextLight });
    pixels[index] = rgb.r;
    pixels[index + 1] = rgb.g;
    pixels[index + 2] = rgb.b;
  }

  context.putImageData(imageData, 0, 0);

  runtime.gravelTintCache.set(cacheKey, canvas);
  return canvas;
}

function getPebbleSourceStats(spritePath, width, height, sourcePixels = null) {
  const cacheKey = `${spritePath}|${width}x${height}`;
  const cached = runtime.gravelSourceStats.get(cacheKey);
  if (cached) {
    return cached;
  }

  let pixels = sourcePixels;
  if (!pixels) {
    const image = runtime.images.get(spritePath);
    if (!image?.width || !image?.height) {
      return { avgHue: 0 };
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return { avgHue: 0 };
    }
    context.drawImage(image, 0, 0, width, height);
    pixels = context.getImageData(0, 0, width, height).data;
  }

  let sumX = 0;
  let sumY = 0;
  let weightTotal = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha <= 0.03) {
      continue;
    }

    const hsl = rgbToHsl({
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    });
    if (hsl.s <= 0.035) {
      continue;
    }

    const weight = alpha * (0.3 + hsl.s * 0.7) * (0.55 + Math.abs(hsl.l - 0.5));
    sumX += Math.cos(hsl.h * Math.PI * 2) * weight;
    sumY += Math.sin(hsl.h * Math.PI * 2) * weight;
    weightTotal += weight;
  }

  const stats = {
    avgHue: weightTotal > 0 ? normalizeHueUnit(Math.atan2(sumY, sumX) / (Math.PI * 2)) : 0
  };
  runtime.gravelSourceStats.set(cacheKey, stats);
  return stats;
}

function getCaveLayerSourceStats(imagePath, width, height, sourcePixels = null) {
  const cacheKey = `${imagePath}|${width}x${height}`;
  const cached = runtime.caveSourceStats.get(cacheKey);
  if (cached) {
    return cached;
  }

  let pixels = sourcePixels;
  if (!pixels) {
    const image = runtime.images.get(imagePath);
    if (!image?.width || !image?.height) {
      return { avgHue: 0 };
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return { avgHue: 0 };
    }
    context.drawImage(image, 0, 0, width, height);
    pixels = context.getImageData(0, 0, width, height).data;
  }

  let sumX = 0;
  let sumY = 0;
  let weightTotal = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha <= 0.03) {
      continue;
    }

    const hsl = rgbToHsl({
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    });
    if (hsl.s <= 0.035) {
      continue;
    }

    const weight = alpha * (0.32 + hsl.s * 0.68) * (0.5 + Math.abs(hsl.l - 0.5));
    sumX += Math.cos(hsl.h * Math.PI * 2) * weight;
    sumY += Math.sin(hsl.h * Math.PI * 2) * weight;
    weightTotal += weight;
  }

  const stats = {
    avgHue: weightTotal > 0 ? normalizeHueUnit(Math.atan2(sumY, sumX) / (Math.PI * 2)) : 0
  };
  runtime.caveSourceStats.set(cacheKey, stats);
  return stats;
}

function getTintedCaveLayerImage(imagePath, color, options = {}) {
  const normalizedColor = normalizeHexColor(color);
  if (!imagePath || !normalizedColor) {
    return runtime.images.get(imagePath) || options.sourceImage || null;
  }

  const colorize = options.colorize === true;
  const cacheKey = `${imagePath}|${normalizedColor}|${colorize ? "colorize" : "hue"}`;
  const cached = runtime.caveTintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const image = runtime.images.get(imagePath) || options.sourceImage || null;
  if (!image?.width || !image?.height) {
    return null;
  }

  const width = Math.max(1, Math.round(Number(image.naturalWidth || image.width) || 1));
  const height = Math.max(1, Math.round(Number(image.naturalHeight || image.height) || 1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const targetRgb = hexToRgb(normalizedColor) || hexToRgb(DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR);
  const targetHsl = rgbToHsl(targetRgb);
  const sourceStats = getCaveLayerSourceStats(imagePath, width, height, pixels);
  const hueDelta = getHueDeltaUnit(sourceStats.avgHue, targetHsl.h);

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha <= 6) {
      continue;
    }

    const hsl = rgbToHsl({
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    });
    if (colorize) {
      const luminance = (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255;
      const shade = Math.pow(luminance, 0.92);
      pixels[index] = Math.round(targetRgb.r * shade);
      pixels[index + 1] = Math.round(targetRgb.g * shade);
      pixels[index + 2] = Math.round(targetRgb.b * shade);
      continue;
    }

    const hasSourceHue = hsl.s > 0.035;
    const nextHue = hasSourceHue ? normalizeHueUnit(hsl.h + hueDelta) : targetHsl.h;
    const nextSat = targetHsl.s <= 0.02
      ? clamp(hsl.s * 0.18, 0, 0.18)
      : hasSourceHue
        ? clamp(hsl.s * 0.34 + targetHsl.s * 0.72, 0.08, 1)
        : clamp(targetHsl.s * 0.58, 0.08, 0.95);
    const nextLight = clamp(
      hsl.l * (0.48 + targetHsl.l * 0.72) + targetHsl.l * 0.08,
      0,
      1
    );
    const rgb = hslToRgb({ h: nextHue, s: nextSat, l: nextLight });
    pixels[index] = rgb.r;
    pixels[index + 1] = rgb.g;
    pixels[index + 2] = rgb.b;
  }

  context.putImageData(imageData, 0, 0);
  runtime.caveTintCache.set(cacheKey, canvas);
  return canvas;
}
