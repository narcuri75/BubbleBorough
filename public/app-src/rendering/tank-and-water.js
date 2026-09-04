// Source fragment: rendering/tank-and-water.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderTank(now) {
  const dirtiness = getTankDirtiness(now);
  clearStageDisplaySurfaces();
  drawTankBackdrop();
  tankContext.save();
  clipToTankShellBounds(tankContext);
  drawBackground(now);
  drawUvLightAtmosphere(now, "back");
  drawFishPebbleTosses(now);
  drawWaterParticles(now, TANK_DEPTH_LAYERS);
  drawFish(now, TANK_DEPTH_LAYERS, { onlyBehavior: "sucker" });
  drawAmbientBubbles(now, 1);
  drawWaterFilter(now);
  drawTankFloor(now);
  drawGravelGrime(now, dirtiness);
  drawGravelCausticProjection(now);
  drawSedimentClouds(now);
  drawEffectClouds(EFFECT_CLOUD_LAYER_FLOOR);
  drawGravelDigBursts(now);
  //drawLooseGravelCap();
  drawGroundShadows(now);
  drawPellets(now);
  //drawLooseGravel(now, { surfaceKind: "floor" });
  for (let layer = TANK_DEPTH_LAYERS; layer >= 1; layer -= 1) {
    if (layer === 3) {
      drawAmbientBubbles(now, 2);
    }
    drawDecor(layer, now);
    drawPoops(now, layer);
    if (layer !== TANK_DEPTH_LAYERS) {
      drawWaterParticles(now, layer);
    }
    drawFishEggs(now, layer);
    //drawLooseGravel(now, { surfaceKind: "decor", decorLayer: layer });
    drawFish(now, layer, { excludeBehavior: "sucker" });
    drawMachinery(now, layer);
  }
  drawCoinGlints(now);
  drawDecorBubbleStreams(now);
  drawTransitTubeBursts(now);
  drawBoroughEdgeBursts(now);
  drawBoroughStructureActivityEffects(now);
  drawAmbientBubbles(now, 3);
  drawUnderwaterLightingPass(now);
  drawWaterColumnCaustics(now);
  //drawLooseGravel(now, { transientOnly: true });
  drawDirtyWaterTint(dirtiness);
  drawMedicineWaterTint(now);
  drawMedicineClouds(now);
  drawWaterBloodTint();
  drawEffectClouds(EFFECT_CLOUD_LAYER_FRONT);
  drawFish(now, SUCKER_FISH_FRONT_GLASS_LAYER, { onlyBehavior: "sucker" });
  drawDecorPreview();
  drawDecorSwimGuide(now);
  drawActiveDecorLayerCue();
  drawLightsOutOverlay(now);
  drawWaterSurface(now);
  drawUvLightAtmosphere(now, "front");
  drawSplashBursts(now);
  // Front glass glare is disabled for this display-focused view.
  tankContext.restore();
  drawGrime(dirtiness);
  drawCleaningSparkles(now);
  glassContext.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  drawGlassTapEffects(now);
  drawDecorEditTankBoundary();
  const severeGrime = getSevereGrimeVisualIntensity(dirtiness);
  const tankBlurScale = getPortableTankBlurScale();
  const tankCanvasFilter = severeGrime > 0
    ? `blur(${(severeGrime * 1.8 * tankBlurScale).toFixed(2)}px) saturate(${(1 - severeGrime * 0.18).toFixed(3)}) brightness(${(1 - severeGrime * 0.12).toFixed(3)})`
    : "none";
  if (runtime.lastTankCanvasFilter !== tankCanvasFilter) {
    dom.tankCanvas.style.filter = tankCanvasFilter;
    runtime.lastTankCanvasFilter = tankCanvasFilter;
  }
  // The authored grime textures already contain soft organic edges. Keeping
  // this overlay unfiltered avoids forcing the browser to re-blur a large
  // transparent canvas whenever the animated aquarium behind it changes.
  const grimeCanvasFilter = "none";
  if (runtime.lastGrimeCanvasFilter !== grimeCanvasFilter) {
    dom.grimeCanvas.style.filter = grimeCanvasFilter;
    runtime.lastGrimeCanvasFilter = grimeCanvasFilter;
  }
}

function getCausticLightImage() {
  const image = runtime.images.get(CAUSTIC_LIGHT_ASSET_PATH) || null;
  if (image && Number(image.naturalWidth || image.width) > 0 && Number(image.naturalHeight || image.height) > 0) {
    return image;
  }
  requestRuntimeImageRecovery(CAUSTIC_LIGHT_ASSET_PATH, {
    kind: "caustic-light",
    id: "underwater-caustics"
  });
  return null;
}

function getCausticHighlightMask() {
  const image = getCausticLightImage();
  if (!image) {
    return null;
  }

  const width = Number(image.naturalWidth || image.width) || 0;
  const height = Number(image.naturalHeight || image.height) || 0;
  const cacheKey = `${width}x${height}`;
  if (runtime.causticHighlightMaskCanvas && runtime.causticHighlightMaskCacheKey === cacheKey) {
    return runtime.causticHighlightMaskCanvas;
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.clearRect(0, 0, width, height);
  sourceContext.drawImage(image, 0, 0, width, height);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurContext = blurCanvas.getContext("2d", { willReadFrequently: true });
  blurContext.clearRect(0, 0, width, height);
  blurContext.filter = "blur(9px)";
  blurContext.drawImage(sourceCanvas, 0, 0);
  blurContext.filter = "none";

  try {
    const sourcePixels = sourceContext.getImageData(0, 0, width, height);
    const blurPixels = blurContext.getImageData(0, 0, width, height);
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputContext = outputCanvas.getContext("2d");
    const outputPixels = outputContext.createImageData(width, height);

    const src = sourcePixels.data;
    const blurred = blurPixels.data;
    const out = outputPixels.data;
    for (let index = 0; index < src.length; index += 4) {
      const sourceAlpha = src[index + 3] / 255;
      if (sourceAlpha <= 0.002) {
        continue;
      }

      const sourceLum = src[index] * 0.2126 + src[index + 1] * 0.7152 + src[index + 2] * 0.0722;
      const blurLum = blurred[index] * 0.2126 + blurred[index + 1] * 0.7152 + blurred[index + 2] * 0.0722;
      const localHighlight = Math.max(0, sourceLum - blurLum);
      const brightnessGate = clamp((sourceLum - 196) / 59, 0, 1);
      const ridgeStrength = clamp((localHighlight - 1.5) / 24, 0, 1);
      const alpha = sourceAlpha * brightnessGate * ridgeStrength * 1.45;
      if (alpha <= 0.004) {
        continue;
      }

      out[index] = 242;
      out[index + 1] = 250;
      out[index + 2] = 255;
      out[index + 3] = Math.round(clamp(alpha, 0, 1) * 255);
    }

    outputContext.putImageData(outputPixels, 0, 0);
    runtime.causticHighlightMaskCanvas = outputCanvas;
    runtime.causticHighlightMaskCacheKey = cacheKey;
    return outputCanvas;
  } catch (error) {
    console.warn("Unable to build caustic highlight mask", error);
    return image;
  }
}

function drawCausticProjectedStrip(context, image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height) {
  if (width <= 0 || height <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return;
  }
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

function hashCausticNoise(value, seed = 0) {
  const input = Number(value) * 12.9898 + Number(seed) * 78.233;
  return (Math.sin(input) * 43758.5453123) % 1;
}

function normalizedCausticNoise(value, seed = 0) {
  const noise = hashCausticNoise(value, seed);
  return noise < 0 ? noise + 1 : noise;
}

function getRotatedCausticSource(image, now, options = {}) {
  const imageWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
  const imageHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
  const diagonal = Math.max(imageWidth, imageHeight, Math.ceil(Math.sqrt(imageWidth * imageWidth + imageHeight * imageHeight)));
  const scale = Math.max(0.4, Number(options.scale) || 1);
  const canvasWidth = Math.ceil(diagonal * scale);
  const canvasHeight = Math.ceil(diagonal * scale);
  const angle = (Number(now) || 0) * (Number(options.rotationSpeed) || 0) + (Number(options.baseAngle) || 0);
  const cacheKey = [canvasWidth, canvasHeight, imageWidth, imageHeight].join(":");

  if (!runtime.causticRotatedLayerCache) {
    runtime.causticRotatedLayerCache = new Map();
  }

  let entry = runtime.causticRotatedLayerCache.get(cacheKey);
  if (!entry) {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    entry = { canvas, context: canvas.getContext("2d") };
    runtime.causticRotatedLayerCache.set(cacheKey, entry);
  }

  const { canvas, context } = entry;
  if (!context) {
    return image;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width * 0.5, canvas.height * 0.5);
  context.rotate(angle);
  context.scale(scale, scale);
  context.filter = "grayscale(0.22) saturate(0.78) brightness(1.08)";
  context.drawImage(image, -imageWidth * 0.5, -imageHeight * 0.5, imageWidth, imageHeight);
  context.restore();
  return canvas;
}

function buildCausticSpotDescriptor(now, slotIndex, options = {}) {
  const durationMs = Math.max(2200, Number(options.durationMs) || 5200);
  const staggerMs = Number(options.staggerMs) || Math.round(durationMs * 0.37);
  const startMs = (Number(now) || 0) + slotIndex * staggerMs + (Number(options.timeOffsetMs) || 0);
  const cycleIndex = Math.floor(startMs / durationMs);
  const localT = ((startMs % durationMs) + durationMs) % durationMs / durationMs;
  const fade = Math.pow(Math.sin(localT * Math.PI), 1.85);
  const seed = Number(options.seed) || 0;
  const xNorm = 0.12 + normalizedCausticNoise(cycleIndex * 13.1 + slotIndex * 2.17 + 0.3, seed + 11) * 0.76;
  const yNorm = 0.12 + normalizedCausticNoise(cycleIndex * 9.7 + slotIndex * 1.73 + 0.6, seed + 23) * 0.74;
  const widthNorm = 0.14 + normalizedCausticNoise(cycleIndex * 7.2 + slotIndex * 4.11 + 0.9, seed + 31) * 0.2;
  const heightNorm = 0.16 + normalizedCausticNoise(cycleIndex * 5.8 + slotIndex * 3.03 + 0.12, seed + 47) * 0.22;
  const sourcePhaseX = normalizedCausticNoise(cycleIndex * 4.9 + slotIndex * 0.91 + 0.14, seed + 59);
  const sourcePhaseY = normalizedCausticNoise(cycleIndex * 6.7 + slotIndex * 1.44 + 0.84, seed + 71);
  const brightness = 0.72 + normalizedCausticNoise(cycleIndex * 8.9 + slotIndex * 2.62 + 0.41, seed + 83) * 0.5;
  return {
    fade,
    xNorm,
    yNorm,
    widthNorm,
    heightNorm,
    sourcePhaseX,
    sourcePhaseY,
    brightness,
    cycleIndex,
    localT
  };
}

function drawLocalizedGravelCausticPass(context, image, now, options = {}) {
  const bounds = getTankFloorDrawBounds();
  const imageWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
  const imageHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
  const floorTop = bounds.drawTop;
  const floorDepth = Math.max(1, bounds.bottom - floorTop);
  const floorCenterY = floorTop + floorDepth * (Number(options.spotYNorm) || 0.5);
  const radiusY = floorDepth * Math.max(0.06, Number(options.spotHeightNorm) || 0.2);
  const centerX = bounds.drawLeft + bounds.drawWidth * (Number(options.spotXNorm) || 0.5);
  const topWidth = bounds.drawWidth * Math.max(0.08, Number(options.topWidthScale) || 0.2);
  const bottomWidth = bounds.drawWidth * Math.max(0.1, Number(options.bottomWidthScale) || 0.3);
  const slices = 54;
  const sourceWindowScale = clamp(Number(options.sourceWindowScale) || 0.58, 0.28, 1);
  const sourceWidth = imageWidth * sourceWindowScale;
  const sourceHeightWindow = imageHeight * clamp(Number(options.sourceHeightScale) || 0.54, 0.28, 1);
  const maxSourceX = Math.max(0, imageWidth - sourceWidth);
  const maxSourceY = Math.max(0, imageHeight - sourceHeightWindow);
  const driftPhase = (Number(now) || 0) * (Number(options.driftSpeed) || 0.00018) + (Number(options.phase) || 0);
  const sourceX = maxSourceX * ((Number(options.sourcePhaseX) || 0) + 0.5 + Math.sin(driftPhase) * 0.18);
  const sourceYCenter = maxSourceY * (Number(options.sourcePhaseY) || 0.5);
  const alphaBase = clamp(Number(options.alpha) || 0.045, 0, 0.18);

  context.save();
  traceTankFloorMaskPath(context, bounds);
  context.clip();
  context.globalCompositeOperation = "screen";
  context.filter = "blur(0.3px) brightness(1.16)";

  for (let index = 0; index < slices; index += 1) {
    const t0 = index / slices;
    const t1 = (index + 1) / slices;
    const stripCenterY = floorTop + floorDepth * (t0 + t1) * 0.5;
    const verticalDelta = Math.abs(stripCenterY - floorCenterY);
    const verticalFalloff = Math.max(0, 1 - Math.pow(verticalDelta / Math.max(24, radiusY), 2));
    if (verticalFalloff <= 0.015) {
      continue;
    }

    const perspectiveT = Math.pow((t0 + t1) * 0.5, 0.92);
    const projectedWidth = topWidth + (bottomWidth - topWidth) * perspectiveT;
    const stripWave = Math.sin(driftPhase * 1.25 + perspectiveT * 8.6) * (Number(options.rippleAmount) || 6) * (0.3 + verticalFalloff * 0.7);
    const projectedX = centerX - projectedWidth * 0.5 + stripWave;
    const destY = floorTop + t0 * floorDepth;
    const destHeight = Math.ceil((t1 - t0) * floorDepth) + 1;

    const sourceYOffset = (verticalFalloff - 0.5) * 0.18 * maxSourceY;
    const sourceY = clamp(sourceYCenter + sourceYOffset + (t0 - 0.5) * imageHeight * 0.18, 0, maxSourceY);
    const sourceHeight = Math.min(sourceHeightWindow / slices * 2.15, imageHeight - sourceY);

    context.globalAlpha = alphaBase * verticalFalloff * (Number(options.brightness) || 1);
    drawCausticProjectedStrip(
      context,
      image,
      clamp(sourceX, 0, maxSourceX),
      sourceY,
      sourceWidth,
      sourceHeight,
      projectedX,
      destY,
      projectedWidth,
      destHeight
    );
  }

  context.restore();
}

function drawGravelCausticProjection(now) {
  if (!isCausticLightingEnabled()) {
    return;
  }

  const baseImage = getCausticHighlightMask();
  if (!baseImage) {
    return;
  }

  const layerA = getRotatedCausticSource(baseImage, now, {
    scale: 1.06,
    baseAngle: 0,
    rotationSpeed: 0.000042
  });
  const layerB = getRotatedCausticSource(baseImage, now, {
    scale: 0.92,
    baseAngle: Math.PI * 0.24,
    rotationSpeed: -0.000057
  });

  const layerConfigs = [
    {
      image: layerA,
      seed: 41,
      spots: 2,
      alpha: 0.068,
      topWidthScale: 0.16,
      bottomWidthScale: 0.28,
      sourceWindowScale: 0.5,
      sourceHeightScale: 0.46,
      driftSpeed: 0.00021,
      rippleAmount: 6,
      durationMs: 5400,
      staggerMs: 2200,
      phase: 0.2,
      timeOffsetMs: 0
    },
    {
      image: layerB,
      seed: 97,
      spots: 2,
      alpha: 0.048,
      topWidthScale: 0.14,
      bottomWidthScale: 0.24,
      sourceWindowScale: 0.44,
      sourceHeightScale: 0.42,
      driftSpeed: -0.00016,
      rippleAmount: 4,
      durationMs: 6200,
      staggerMs: 2600,
      phase: 1.7,
      timeOffsetMs: 1200
    }
  ];

  for (const layer of layerConfigs) {
    for (let index = 0; index < layer.spots; index += 1) {
      const spot = buildCausticSpotDescriptor(now, index, layer);
      if (spot.fade <= 0.025) {
        continue;
      }
      drawLocalizedGravelCausticPass(tankContext, layer.image, now, {
        alpha: layer.alpha * spot.fade,
        brightness: spot.brightness,
        topWidthScale: layer.topWidthScale * (0.86 + spot.widthNorm * 0.9),
        bottomWidthScale: layer.bottomWidthScale * (0.92 + spot.widthNorm),
        sourceWindowScale: layer.sourceWindowScale,
        sourceHeightScale: layer.sourceHeightScale,
        driftSpeed: layer.driftSpeed,
        rippleAmount: layer.rippleAmount,
        phase: layer.phase + index * 1.23,
        spotXNorm: spot.xNorm,
        spotYNorm: spot.yNorm,
        spotHeightNorm: spot.heightNorm,
        sourcePhaseX: spot.sourcePhaseX,
        sourcePhaseY: spot.sourcePhaseY
      });
    }
  }
}

function drawWaterColumnCausticLayer(context, image, now, options = {}) {
  const waterHeight = Math.max(1, getVisibleTankFloorBottomY() - WATER_SURFACE_Y);
  const scale = Number(options.scale) || 1.18;
  const width = TANK_WIDTH * scale;
  const height = waterHeight * scale;
  const phase = (Number(now) || 0) * (Number(options.speed) || 0.00004) + (Number(options.phase) || 0);
  const xTravel = Math.max(10, (width - TANK_WIDTH) * 0.42);
  const yTravel = Math.max(6, (height - waterHeight) * 0.28);
  const x = (TANK_WIDTH - width) * 0.5 + Math.sin(phase) * xTravel;
  const y = WATER_SURFACE_Y + (waterHeight - height) * 0.46 + Math.cos(phase * 0.73 + 0.8) * yTravel;

  context.save();
  context.beginPath();
  context.rect(GLASS_MARGIN_X, WATER_SURFACE_Y, TANK_WIDTH - GLASS_MARGIN_X * 2, waterHeight);
  context.clip();
  context.globalCompositeOperation = "screen";
  context.globalAlpha = clamp(Number(options.alpha) || 0.018, 0, 0.08);
  context.filter = "grayscale(0.72) saturate(0.42) brightness(1.12)";
  context.drawImage(image, x, y, width, height);
  context.restore();
}

function drawWaterColumnCaustics(now) {
  // Disabled intentionally. The authored caustic asset contains broad translucent
  // regions that read as fog when screen-blended through the entire water column.
  // Caustics now stay on the gravel plane, where the perspective projection reads
  // as refracted light rather than suspended haze. Keep this function in place so
  // a dedicated sparse water-column asset can be reintroduced later if desired.
  void now;
}

function drawUnderwaterLightingPass(now) {
  const tankBottom = Math.max(WATER_SURFACE_Y + 24, TANK_HEIGHT);
  const pulse = 0.985 + Math.sin((Number(now) || 0) * 0.00011) * 0.015;

  // Soft cool illumination from above.
  tankContext.save();
  tankContext.globalCompositeOperation = "screen";
  const topLight = tankContext.createLinearGradient(0, WATER_SURFACE_Y, 0, tankBottom);
  topLight.addColorStop(0, `rgba(176, 222, 255, ${(0.105 * pulse).toFixed(4)})`);
  topLight.addColorStop(0.12, `rgba(126, 188, 235, ${(0.055 * pulse).toFixed(4)})`);
  topLight.addColorStop(0.34, `rgba(84, 146, 208, ${(0.018 * pulse).toFixed(4)})`);
  topLight.addColorStop(0.58, "rgba(84, 146, 208, 0)");
  topLight.addColorStop(1, "rgba(84, 146, 208, 0)");
  tankContext.fillStyle = topLight;
  tankContext.fillRect(0, WATER_SURFACE_Y, TANK_WIDTH, tankBottom - WATER_SURFACE_Y);
  tankContext.restore();

  // Gentle depth darkening so the floor area feels deeper without crushing color.
  tankContext.save();
  tankContext.globalCompositeOperation = "multiply";
  const depthShade = tankContext.createLinearGradient(0, WATER_SURFACE_Y, 0, tankBottom);
  depthShade.addColorStop(0, "rgba(255, 255, 255, 0)");
  depthShade.addColorStop(0.42, "rgba(233, 241, 252, 0.018)");
  depthShade.addColorStop(0.72, "rgba(145, 170, 198, 0.06)");
  depthShade.addColorStop(1, "rgba(26, 44, 68, 0.16)");
  tankContext.fillStyle = depthShade;
  tankContext.fillRect(0, WATER_SURFACE_Y, TANK_WIDTH, tankBottom - WATER_SURFACE_Y);
  tankContext.restore();

  // Tiny bit of bottom ambient occlusion to help the lower tank feel denser.
  tankContext.save();
  const floorGlow = tankContext.createLinearGradient(0, tankBottom - 180, 0, tankBottom);
  floorGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
  floorGlow.addColorStop(0.5, "rgba(6, 10, 20, 0.028)");
  floorGlow.addColorStop(1, "rgba(4, 8, 18, 0.055)");
  tankContext.fillStyle = floorGlow;
  tankContext.fillRect(0, Math.max(WATER_SURFACE_Y, tankBottom - 180), TANK_WIDTH, 180);
  tankContext.restore();
}

function clearStageDisplaySurfaces() {
  const editAmount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  // Tank and glass are animated and are rebuilt every frame. Grime is a
  // cached overlay, so clearing it here makes it disappear on every frame where
  // drawGrime() correctly decides that nothing changed. drawGrime() owns its
  // own clear/redraw cycle instead.
  for (const [context, canvas] of [
    [tankContext, dom.tankCanvas],
    [glassContext, dom.glassCanvas]
  ]) {
    if (!context || !canvas) {
      continue;
    }
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (context === tankContext && editAmount > 0.001) {
      const gradient = context.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.38,
        Math.min(canvas.width, canvas.height) * 0.08,
        canvas.width * 0.5,
        canvas.height * 0.5,
        Math.max(canvas.width, canvas.height) * 0.72
      );
      gradient.addColorStop(0, `rgba(6, 24, 39, ${(0.72 * editAmount).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(1, 7, 14, ${(0.94 * editAmount).toFixed(3)})`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.restore();
  }
}

function getDecorEditTankFrameGeometry() {
  const floorBounds = getTankFloorDrawBounds();
  const frameInset = Math.max(2, Math.round(getViewportPxAsTankVirtual(4)));
  const frameBottom = clamp(
    Math.round(floorBounds.bottom - getViewportPxAsTankVirtual(2)),
    frameInset + 72,
    TANK_HEIGHT - frameInset
  );
  return {
    left: frameInset,
    top: frameInset,
    right: TANK_WIDTH - frameInset,
    bottom: frameBottom,
    width: TANK_WIDTH - frameInset * 2,
    height: Math.max(40, frameBottom - frameInset),
    radius: Math.max(10, Math.round(getViewportPxAsTankVirtual(13)))
  };
}

function traceDecorEditRoundedTankPath(context = tankContext) {
  const frame = getDecorEditTankFrameGeometry();
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(frame.left, frame.top, frame.width, frame.height, frame.radius);
    return frame;
  }

  const radius = Math.min(frame.radius, frame.width * 0.5, frame.height * 0.5);
  context.moveTo(frame.left + radius, frame.top);
  context.lineTo(frame.right - radius, frame.top);
  context.quadraticCurveTo(frame.right, frame.top, frame.right, frame.top + radius);
  context.lineTo(frame.right, frame.bottom - radius);
  context.quadraticCurveTo(frame.right, frame.bottom, frame.right - radius, frame.bottom);
  context.lineTo(frame.left + radius, frame.bottom);
  context.quadraticCurveTo(frame.left, frame.bottom, frame.left, frame.bottom - radius);
  context.lineTo(frame.left, frame.top + radius);
  context.quadraticCurveTo(frame.left, frame.top, frame.left + radius, frame.top);
  context.closePath();
  return frame;
}

function drawDecorEditTankBoundary() {
  const amount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  if (amount <= 0.002) {
    return;
  }

  const target = getCurrentTank();
  const shell = getTankShellBounds(target);
  const frameWidthPx = getViewportPxAsTankVirtual(13.28125);
  const waterlineWidthPx = getViewportPxAsTankVirtual(1.4);

  glassContext.save();
  glassContext.globalAlpha = amount;
  glassContext.lineJoin = "round";
  glassContext.lineCap = "round";
  glassContext.shadowColor = `rgba(123, 223, 255, ${(0.5 * amount).toFixed(3)})`;
  glassContext.shadowBlur = getViewportPxAsTankVirtual(18);

  if (shell.shape === "rectangular") {
    const frame = getDecorEditTankFrameGeometry();
    const frameGradient = glassContext.createLinearGradient(frame.left, frame.top, frame.left, frame.bottom);
    frameGradient.addColorStop(0, `rgba(245, 252, 255, ${(0.88 + amount * 0.05).toFixed(3)})`);
    frameGradient.addColorStop(0.15, `rgba(192, 240, 255, ${(0.8 + amount * 0.07).toFixed(3)})`);
    frameGradient.addColorStop(0.5, `rgba(136, 214, 247, ${(0.74 + amount * 0.08).toFixed(3)})`);
    frameGradient.addColorStop(0.85, `rgba(104, 186, 230, ${(0.76 + amount * 0.06).toFixed(3)})`);
    frameGradient.addColorStop(1, `rgba(238, 250, 255, ${(0.86 + amount * 0.05).toFixed(3)})`);
    glassContext.strokeStyle = frameGradient;
    glassContext.lineWidth = frameWidthPx;
    traceDecorEditRoundedTankPath(glassContext);
    glassContext.stroke();
  } else {
    glassContext.strokeStyle = `rgba(214, 246, 255, ${(0.8 + amount * 0.08).toFixed(3)})`;
    glassContext.lineWidth = frameWidthPx;
    traceTankShellPath(glassContext, { tank: target, variant: "outer" });
    glassContext.stroke();
  }

  glassContext.shadowBlur = getViewportPxAsTankVirtual(7);
  glassContext.strokeStyle = `rgba(226, 249, 255, ${(0.34 * amount).toFixed(3)})`;
  glassContext.lineWidth = waterlineWidthPx;
  glassContext.beginPath();
  glassContext.moveTo(GLASS_MARGIN_X + getViewportPxAsTankVirtual(14), WATER_SURFACE_Y);
  glassContext.lineTo(TANK_WIDTH - GLASS_MARGIN_X - getViewportPxAsTankVirtual(14), WATER_SURFACE_Y);
  glassContext.stroke();
  glassContext.restore();
}

function drawDirtyWaterTint(dirtiness = getTankDirtiness(Date.now())) {
  const tintStrength = Math.pow(clamp((Number(dirtiness) - 0.08) / 0.92, 0, 1), 1.18);
  if (tintStrength <= 0.002) {
    return;
  }

  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const waterTop = Math.max(WATER_SURFACE_Y, visibleBounds.top);
  const waterBottom = Math.min(TANK_HEIGHT, visibleBounds.bottom || TANK_HEIGHT);
  const gradient = tankContext.createLinearGradient(0, waterTop, 0, waterBottom);
  gradient.addColorStop(0, `rgba(73, 132, 54, ${(0.18 * tintStrength).toFixed(3)})`);
  gradient.addColorStop(0.48, `rgba(55, 112, 41, ${(0.32 * tintStrength).toFixed(3)})`);
  gradient.addColorStop(1, `rgba(35, 82, 28, ${(0.46 * tintStrength).toFixed(3)})`);

  tankContext.save();
  tankContext.globalCompositeOperation = "multiply";
  tankContext.fillStyle = gradient;
  tankContext.fillRect(visibleBounds.left, waterTop, visibleBounds.width, Math.max(0, waterBottom - waterTop));
  tankContext.globalCompositeOperation = "source-over";
  tankContext.fillStyle = `rgba(82, 126, 42, ${(0.18 * tintStrength).toFixed(3)})`;
  tankContext.fillRect(visibleBounds.left, waterTop, visibleBounds.width, Math.max(0, waterBottom - waterTop));
  tankContext.restore();
}

function drawLightsOutOverlay(now = Date.now()) {
  if (!isTankLightsOut(now)) {
    return;
  }
  const forced = getLightsOutOverride() === LIGHTS_OUT_OVERRIDE_ON;
  const alpha = forced ? 0.36 : 0.3;
  tankContext.save();
  const gradient = tankContext.createLinearGradient(0, 0, 0, TANK_HEIGHT);
  gradient.addColorStop(0, `rgba(3, 12, 26, ${alpha + 0.08})`);
  gradient.addColorStop(0.52, `rgba(2, 16, 30, ${alpha})`);
  gradient.addColorStop(1, `rgba(0, 6, 16, ${alpha + 0.04})`);
  tankContext.fillStyle = gradient;
  tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  tankContext.globalCompositeOperation = "screen";
  tankContext.fillStyle = forced
    ? "rgba(112, 178, 255, 0.045)"
    : "rgba(98, 155, 220, 0.035)";
  tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  tankContext.restore();
}

function getScaledTankShellPoints(pointSet) {
  return pointSet.map(([xNorm, yNorm]) => ({
    x: xNorm * TANK_WIDTH,
    y: yNorm * TANK_HEIGHT
  }));
}

function getTankShellPointSet(variant = "inner", target = getCurrentTank()) {
  if (!isBowlTank(target)) {
    return null;
  }
  return getScaledTankShellPoints(variant === "outer" ? BOWL_TANK_OUTER_POINTS : BOWL_TANK_INNER_POINTS);
}

function getPolygonBounds(points = []) {
  if (!points.length) {
    return {
      left: 0,
      top: 0,
      right: TANK_WIDTH,
      bottom: TANK_HEIGHT,
      width: TANK_WIDTH,
      height: TANK_HEIGHT
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function tracePolygonPath(context, points = []) {
  if (!points.length) {
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function traceTankShellPath(context, options = {}) {
  const target = options.tank || getCurrentTank();
  const variant = options.variant === "outer" ? "outer" : "inner";
  const shellPoints = getTankShellPointSet(variant, target);
  if (!shellPoints) {
    const { outerLeft, outerTop, outerWidth, outerHeight, innerLeft, innerTop, innerWidth, innerHeight } = getTankShellBounds(target);
    context.beginPath();
    context.rect(
      variant === "outer" ? outerLeft : innerLeft,
      variant === "outer" ? outerTop : innerTop,
      variant === "outer" ? outerWidth : innerWidth,
      variant === "outer" ? outerHeight : innerHeight
    );
    return;
  }

  tracePolygonPath(context, shellPoints);
}

function pointInPolygon(point, polygon = []) {
  if (!polygon.length) {
    return true;
  }

  let inside = false;
  for (let leftIndex = 0, rightIndex = polygon.length - 1; leftIndex < polygon.length; rightIndex = leftIndex, leftIndex += 1) {
    const leftPoint = polygon[leftIndex];
    const rightPoint = polygon[rightIndex];
    const intersects = ((leftPoint.y > point.y) !== (rightPoint.y > point.y))
      && (point.x < ((rightPoint.x - leftPoint.x) * (point.y - leftPoint.y)) / ((rightPoint.y - leftPoint.y) || 0.00001) + leftPoint.x);
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function projectPointIntoPolygon(point, polygon = []) {
  if (!polygon.length || pointInPolygon(point, polygon)) {
    return {
      x: point.x,
      y: point.y,
      inside: true
    };
  }

  const bounds = getPolygonBounds(polygon);
  let insidePoint = {
    x: bounds.left + bounds.width * 0.5,
    y: bounds.top + bounds.height * 0.5
  };
  let outsidePoint = {
    x: point.x,
    y: point.y
  };

  for (let index = 0; index < 18; index += 1) {
    const midpoint = {
      x: (insidePoint.x + outsidePoint.x) * 0.5,
      y: (insidePoint.y + outsidePoint.y) * 0.5
    };
    if (pointInPolygon(midpoint, polygon)) {
      insidePoint = midpoint;
    } else {
      outsidePoint = midpoint;
    }
  }

  return {
    x: insidePoint.x,
    y: insidePoint.y,
    inside: false
  };
}

function constrainPointToTankShell(x, y, options = {}) {
  const target = options.tank || getCurrentTank();
  const variant = options.variant === "outer" ? "outer" : "inner";
  const shellPoints = getTankShellPointSet(variant, target);
  const clampedPoint = {
    x: clamp(Number(x) || 0, 0, TANK_WIDTH),
    y: clamp(Number(y) || 0, 0, TANK_HEIGHT)
  };
  if (!shellPoints) {
    return {
      ...clampedPoint,
      inside: true
    };
  }
  return projectPointIntoPolygon(clampedPoint, shellPoints);
}

function constrainNormalizedPointToTankShell(xNorm, yNorm, options = {}) {
  const constrained = constrainPointToTankShell(
    Number(xNorm) * TANK_WIDTH,
    Number(yNorm) * TANK_HEIGHT,
    options
  );
  return {
    xNorm: constrained.x / TANK_WIDTH,
    yNorm: constrained.y / TANK_HEIGHT,
    inside: constrained.inside
  };
}

function getTankShellBounds(target = getCurrentTank()) {
  const outerPoints = getTankShellPointSet("outer", target);
  const innerPoints = getTankShellPointSet("inner", target);
  if (!outerPoints || !innerPoints) {
    return {
      outerLeft: 0,
      outerTop: 0,
      outerWidth: TANK_WIDTH,
      outerHeight: TANK_HEIGHT,
      innerLeft: 0,
      innerTop: 0,
      innerWidth: TANK_WIDTH,
      innerHeight: TANK_HEIGHT,
      shape: "rectangular"
    };
  }

  const outerBounds = getPolygonBounds(outerPoints);
  const innerBounds = getPolygonBounds(innerPoints);
  return {
    outerLeft: outerBounds.left,
    outerTop: outerBounds.top,
    outerWidth: outerBounds.width,
    outerHeight: outerBounds.height,
    innerLeft: innerBounds.left,
    innerTop: innerBounds.top,
    innerWidth: innerBounds.width,
    innerHeight: innerBounds.height,
    shape: "bowl",
    outerPoints,
    innerPoints
  };
}

function clipToTankShellBounds(context = tankContext, target = getCurrentTank(), variant = "inner") {
  const editAmount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  if (!isBowlTank(target) && editAmount > 0.002) {
    traceDecorEditRoundedTankPath(context);
    context.clip();
    return;
  }
  traceTankShellPath(context, { tank: target, variant });
  context.clip();
}

function drawTankBackdrop() {
  tankContext.clearRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  if (isAnimatedBackgroundEnabled()) {
    return;
  }
  if (isBowlTank()) {
    tankContext.fillStyle = "#000";
    tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
    return;
  }

  const editAmount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  tankContext.save();
  if (editAmount > 0.002) {
    traceDecorEditRoundedTankPath(tankContext);
    tankContext.clip();
  }
  const background = tankContext.createLinearGradient(0, 0, 0, TANK_HEIGHT);
  background.addColorStop(0, "#09121d");
  background.addColorStop(1, "#03080f");
  tankContext.fillStyle = background;
  tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  tankContext.restore();
}

function drawBackground(now = Date.now()) {
  const background = runtime.backgroundMap.get(state.selectedBackground);
  const localImage = isLocalImageBackgroundKey(background?.key) ? runtime.images.get(getLocalBackgroundImageDataUrl()) : null;
  const image = background && !isCustomBackgroundKey(background.key) && !isLocalImageBackgroundKey(background.key)
    ? runtime.images.get(background.path)
    : localImage;
  const backgroundLeft = GLASS_MARGIN_X;
  const backgroundTop = 0;
  const backgroundWidth = TANK_WIDTH - GLASS_MARGIN_X * 2;
  const backgroundHeight = TANK_HEIGHT - GLASS_MARGIN_BOTTOM;
  const waterTop = WATER_SURFACE_Y;
  const waterHeight = TANK_HEIGHT - waterTop - GLASS_MARGIN_BOTTOM;

  tankContext.save();
  tankContext.beginPath();
  tankContext.rect(backgroundLeft, backgroundTop, backgroundWidth, backgroundHeight);
  tankContext.clip();

  if (image) {
    drawImageCover(tankContext, image, backgroundLeft, backgroundTop, backgroundWidth, backgroundHeight);
  } else if (isCustomBackgroundKey(background?.key)) {
    if (!isAnimatedBackgroundEnabled()) {
      tankContext.fillStyle = createCustomBackgroundFill(tankContext, backgroundLeft, backgroundTop, backgroundWidth, backgroundHeight);
      tankContext.fillRect(backgroundLeft, backgroundTop, backgroundWidth, backgroundHeight);
    }
  } else {
    const gradient = tankContext.createLinearGradient(0, backgroundTop, 0, TANK_HEIGHT);
    gradient.addColorStop(0, "#10171c");
    gradient.addColorStop(1, "#05090d");
    tankContext.fillStyle = gradient;
    tankContext.fillRect(backgroundLeft, backgroundTop, backgroundWidth, backgroundHeight);
  }
  tankContext.restore();

  if (isAnimatedBackgroundEnabled()) {
    return;
  }

  tankContext.save();
  tankContext.beginPath();
  tankContext.rect(GLASS_MARGIN_X, waterTop, backgroundWidth, waterHeight);
  tankContext.clip();

  const clearWaterShade = tankContext.createLinearGradient(0, waterTop, 0, TANK_HEIGHT);
  clearWaterShade.addColorStop(0, "rgba(255, 255, 255, 0.024)");
  clearWaterShade.addColorStop(0.42, "rgba(255, 255, 255, 0.006)");
  clearWaterShade.addColorStop(1, "rgba(0, 0, 0, 0.028)");
  tankContext.fillStyle = clearWaterShade;
  tankContext.fillRect(GLASS_MARGIN_X, waterTop, backgroundWidth, waterHeight);

  tankContext.globalAlpha = isAnimatedBackgroundEnabled() ? 0.08 : 0.16;
  tankContext.strokeStyle = isAnimatedBackgroundEnabled() ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.03)";
  tankContext.lineWidth = Math.max(0.4, 0.65 * getViewportStableAssetScale());
  tankContext.lineCap = "round";
  for (let index = 0; index < 5; index += 1) {
    const y = waterTop + waterHeight * (0.18 + index * 0.14);
    const drift = Math.sin(now / 2600 + index * 1.7) * 8;
    tankContext.beginPath();
    tankContext.moveTo(GLASS_MARGIN_X + 60, y + drift * 0.1);
    tankContext.bezierCurveTo(
      TANK_WIDTH * 0.32,
      y + Math.sin(now / 3100 + index) * 5,
      TANK_WIDTH * 0.68,
      y - Math.cos(now / 2900 + index * 0.8) * 4,
      TANK_WIDTH - GLASS_MARGIN_X - 60,
      y + drift * 0.1
    );
    tankContext.stroke();
  }
  tankContext.restore();
}

function drawAmbientBubbles(now, layer = 3) {
  if (!areAmbientBubblesEnabled()) {
    return;
  }

  const layerProfile = getAmbientBubbleLayerProfile(layer);
  if (!layerProfile) {
    return;
  }

  const stableScale = getViewportStableAssetScale();
  tankContext.save();
  tankContext.beginPath();
  tankContext.rect(GLASS_MARGIN_X, WATER_SURFACE_Y + 2, TANK_WIDTH - GLASS_MARGIN_X * 2, TANK_HEIGHT - WATER_SURFACE_Y - GLASS_MARGIN_BOTTOM - 2);
  tankContext.clip();

  for (const bubble of getVisibleAmbientSceneBubbles()) {
    if (getAmbientBubbleRenderPass(bubble.layer || 3) !== layer) {
      continue;
    }

    const bubbleImage = getBubbleSpriteByIndex(bubble.spriteIndex);
    const rawProgress = (now / 1000) * bubble.speed + bubble.offset;
    const progress = rawProgress % 1;
    const cycle = Math.floor(rawProgress);
    const travelPhase = progress * bubble.wave + bubble.offset * 8;
    const x = bubble.x * TANK_WIDTH
      + Math.sin(travelPhase) * bubble.wobble * layerProfile.wobbleScale * stableScale
      + Math.cos(now / layerProfile.parallaxMs + bubble.offset * 11) * layerProfile.parallaxPx * stableScale;
    const y = TANK_HEIGHT - GLASS_MARGIN_BOTTOM - 8 - progress * (TANK_HEIGHT - WATER_SURFACE_Y - 20);
    const popStartProgress = 0.955;
    const popProgress = clamp((progress - popStartProgress) / Math.max(0.0001, 1 - popStartProgress), 0, 1);
    if (popProgress > 0) {
      const popSeed = hashStringToUint32(`ambient|${bubble.x}|${bubble.offset}|${bubble.layer}|${cycle}`);
      const popRadius = bubble.size * layerProfile.sizeScale * (bubble.style === "sprite" ? 1.3 : 0.9);
      drawBubblePopBurstToContext(
        tankContext,
        x,
        y,
        popRadius,
        bubble.alpha * layerProfile.alphaScale,
        null,
        stableScale,
        popSeed,
        popProgress,
        {
          count: Math.min(10, Math.max(5, Math.round(5 + bubble.size * 0.45))),
          burstScale: 0.72 + bubble.size * 0.035,
          surfaceY: WATER_SURFACE_Y + 2 * stableScale
        }
      );
      continue;
    }
    if (y <= WATER_SURFACE_Y + 2) {
      continue;
    }

    if (bubbleImage && bubble.style === "sprite") {
      const size = bubble.size * bubble.spriteScale * layerProfile.sizeScale * stableScale;
      tankContext.save();
      tankContext.translate(x, y);
      tankContext.rotate(Math.sin(now / 1600 + bubble.offset * 12) * 0.14);
      tankContext.globalAlpha = bubble.alpha * layerProfile.alphaScale;
      tankContext.drawImage(bubbleImage, -size / 2, -size / 2, size, size);
      tankContext.restore();
      continue;
    }

    if (bubble.style === "cluster") {
      drawBubbleOrb(x, y, bubble.size * 0.78 * layerProfile.sizeScale, bubble.alpha * layerProfile.alphaScale, bubble.stretch);
      drawBubbleOrb(
        x + bubble.size * 0.74 * layerProfile.sizeScale * stableScale,
        y - bubble.size * 0.48 * layerProfile.sizeScale * stableScale,
        bubble.size * 0.5 * layerProfile.sizeScale,
        bubble.alpha * 0.84 * layerProfile.alphaScale,
        1.04
      );
      drawBubbleOrb(
        x - bubble.size * 0.6 * layerProfile.sizeScale * stableScale,
        y + bubble.size * 0.46 * layerProfile.sizeScale * stableScale,
        bubble.size * 0.42 * layerProfile.sizeScale,
        bubble.alpha * 0.74 * layerProfile.alphaScale,
        0.92
      );
      continue;
    }

    if (bubble.style === "fizz") {
      for (let index = 0; index < bubble.count; index += 1) {
        const offsetY = index * (bubble.size * 0.95 * layerProfile.sizeScale * stableScale);
        const offsetX = Math.sin(now / 460 + bubble.offset * 14 + index) * 1.8 * layerProfile.wobbleScale * stableScale;
        drawBubbleOrb(
          x + offsetX,
          y + offsetY,
          bubble.size * (0.26 + index * 0.08) * layerProfile.sizeScale,
          bubble.alpha * (0.85 - index * 0.1) * layerProfile.alphaScale,
          1
        );
      }
      continue;
    }

    drawBubbleOrb(x, y, bubble.size * layerProfile.sizeScale, bubble.alpha * layerProfile.alphaScale, bubble.stretch);
  }

  tankContext.restore();
}

function getAmbientBubbleRenderPass(sourceLayer = 3) {
  const normalizedLayer = clamp(Math.round(Number(sourceLayer) || 3), 1, 5);
  if (normalizedLayer <= 2) {
    return 1;
  }
  return 3;
}

function getAmbientBubbleLayerProfile(layer = 3) {
  const profiles = {
    1: { alphaScale: 0.42, sizeScale: 0.84, wobbleScale: 0.76, parallaxPx: 3.5, parallaxMs: 7600 },
    2: { alphaScale: 0.68, sizeScale: 1, wobbleScale: 0.94, parallaxPx: 6.2, parallaxMs: 6100 },
    3: { alphaScale: 0.94, sizeScale: 1.15, wobbleScale: 1.12, parallaxPx: 8.4, parallaxMs: 4700 }
  };
  return profiles[layer] || profiles[3];
}

function drawWaterFilter(now) {
  tankContext.save();
  if (!tankSupportsFilters(getCurrentTank())) {
    tankContext.restore();
    return;
  }
  const filterAsset = runtime.filterMap.get(state.selectedFilterAsset);
  const filterImage = filterAsset ? runtime.images.get(filterAsset.path) : null;
  if (!filterImage) {
    tankContext.restore();
    return;
  }
  const filterProfile = getFilterProfile();
  const filterScale = getViewportStableObjectScale("hardware");
  const filterDrawWidth = FILTER_DRAW_BASE_WIDTH * filterScale;
  const filterDrawHeight = FILTER_DRAW_BASE_HEIGHT * filterScale;
  const streamDistance = getScenePxAsTankVirtual(FILTER_BUBBLE_STREAM_DISTANCE_PX + filterProfile.flow * 18);
  const spoutLipOffset = 8 * filterScale;
  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const groupWidth = streamDistance + filterDrawWidth - spoutLipOffset;
  const desiredGroupRightX = visibleBounds.right - getScenePxAsTankVirtual(FILTER_GROUP_RIGHT_MARGIN_PX);
  const minGroupRightX = visibleBounds.left + groupWidth + getScenePxAsTankVirtual(8);
  const maxGroupRightX = visibleBounds.right - getScenePxAsTankVirtual(8);
  const groupRightX = clamp(desiredGroupRightX, Math.min(minGroupRightX, maxGroupRightX), maxGroupRightX);
  const groupLeftX = groupRightX - groupWidth;
  const spoutX = groupLeftX + streamDistance;
  const outletX = spoutX + getScenePxAsTankVirtual(FILTER_BUBBLE_OUTLET_X_OFFSET_PX);
  const filterDrawX = spoutX - spoutLipOffset;
  const filterDrawY = visibleBounds.top;
  // Anchor the flow to the rendered outlet nozzle rather than the full image bounds.
  const outletY = filterDrawY + filterDrawHeight * (88 / 260) + getScenePxAsTankVirtual(14);
  const flowIntensity = 0.86 + filterProfile.flow * 0.22;
  const flowActive = isFilterBubbleFlowActive(now);

  if (flowActive) {
    tankContext.save();
    tankContext.beginPath();
    tankContext.rect(
      GLASS_MARGIN_X,
      WATER_SURFACE_Y - 10,
      TANK_WIDTH - GLASS_MARGIN_X * 2,
      TANK_HEIGHT - WATER_SURFACE_Y - GLASS_MARGIN_BOTTOM + 10
    );
    tankContext.clip();

    const bubbleCount = 18 + Math.round(filterProfile.flow * 6);
    const streamRise = getScenePxAsTankVirtual(FILTER_BUBBLE_STREAM_RISE_PX);
    for (let index = 0; index < bubbleCount; index += 1) {
      const lane = index % 4;
      const phase = ((now / (150 + lane * 20)) + index * 0.14) % 1;
      const drift = phase * streamDistance;
      const riseProgress = clamp((phase - 0.68) / 0.32, 0, 1);
      const riseEase = 1 - (1 - riseProgress) * (1 - riseProgress);
      const fadeOut = 1 - riseEase;
      const x = outletX - drift + Math.sin(now / 170 + index * 1.7) * getScenePxAsTankVirtual(1.6 + lane * 0.35);
      const y = outletY
        + (lane - 1.5) * getScenePxAsTankVirtual(2.3)
        + Math.sin(now / 210 + index * 1.35) * getScenePxAsTankVirtual(0.95)
        - streamRise * riseEase;
      const radius = 2.2 + (index % 3) * 0.7 + filterProfile.flow * 0.22;
      const alpha = (0.16 + (1 - phase) * 0.38 * flowIntensity) * fadeOut;
      drawBubbleOrb(x, y, radius, alpha, 1 + lane * 0.03);
    }

    for (let index = 0; index < 7; index += 1) {
      const pulse = ((now / 120) + index * 0.21) % 1;
      const riseProgress = clamp((pulse - 0.68) / 0.32, 0, 1);
      const riseEase = 1 - (1 - riseProgress) * (1 - riseProgress);
      const x = outletX - pulse * streamDistance;
      const y = outletY + Math.sin(now / 150 + index * 1.2) * getScenePxAsTankVirtual(1.1) - streamRise * riseEase;
      tankContext.fillStyle = `rgba(214, 247, 255, ${((0.07 + (1 - pulse) * 0.12) * (1 - riseEase)).toFixed(3)})`;
      tankContext.beginPath();
      tankContext.ellipse(
        x,
        y,
        getScenePxAsTankVirtual(1.8 + pulse * 1.6),
        getScenePxAsTankVirtual(0.9 + pulse * 0.62),
        0,
        0,
        Math.PI * 2
      );
      tankContext.fill();
    }
    tankContext.restore();
  }

  if (filterImage) {
    tankContext.globalAlpha = 1;
    tankContext.drawImage(filterImage, filterDrawX, filterDrawY, filterDrawWidth, filterDrawHeight);
    tankContext.globalAlpha = 1;
  }
  tankContext.restore();
}

function getWaterFilterFlowDescriptor(now = Date.now()) {
  if (!tankSupportsFilters(getCurrentTank())) {
    return null;
  }

  const filterProfile = getFilterProfile();
  const filterScale = getViewportStableObjectScale("hardware");
  const filterDrawWidth = FILTER_DRAW_BASE_WIDTH * filterScale;
  const filterDrawHeight = FILTER_DRAW_BASE_HEIGHT * filterScale;
  const streamDistance = getScenePxAsTankVirtual(FILTER_BUBBLE_STREAM_DISTANCE_PX + filterProfile.flow * 18);
  const spoutLipOffset = 8 * filterScale;
  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const groupWidth = streamDistance + filterDrawWidth - spoutLipOffset;
  const desiredGroupRightX = visibleBounds.right - getScenePxAsTankVirtual(FILTER_GROUP_RIGHT_MARGIN_PX);
  const minGroupRightX = visibleBounds.left + groupWidth + getScenePxAsTankVirtual(8);
  const maxGroupRightX = visibleBounds.right - getScenePxAsTankVirtual(8);
  const groupRightX = clamp(desiredGroupRightX, Math.min(minGroupRightX, maxGroupRightX), maxGroupRightX);
  const groupLeftX = groupRightX - groupWidth;
  const spoutX = groupLeftX + streamDistance;
  const outletX = spoutX + getScenePxAsTankVirtual(FILTER_BUBBLE_OUTLET_X_OFFSET_PX);
  const filterDrawX = spoutX - spoutLipOffset;
  const filterDrawY = visibleBounds.top;
  const outletY = filterDrawY + filterDrawHeight * (88 / 260) + getScenePxAsTankVirtual(14);

  return {
    outletX,
    outletY,
    streamDistance,
    streamRise: getScenePxAsTankVirtual(FILTER_BUBBLE_STREAM_RISE_PX),
    intakeX: filterDrawX + filterDrawWidth * 0.58,
    intakeY: filterDrawY + filterDrawHeight * 0.78,
    flow: filterProfile.flow,
    flowActive: isFilterBubbleFlowActive(now)
  };
}

function getWaterParticleVisibleCount(now = Date.now()) {
  const dirtiness = getTankDirtiness(now);
  const cleanVisibleCount = getWaterParticleCleanVisibleCount();
  const dirtyVisibleCount = getWaterParticleDirtyVisibleCount();
  return Math.round(
    cleanVisibleCount
    + (dirtyVisibleCount - cleanVisibleCount) * Math.pow(dirtiness, 0.88)
  );
}

function ensureWaterParticles(now = Date.now()) {
  const tank = getCurrentTank();
  const tankId = tank?.id || "tank";
  const targetCount = getWaterParticleTargetCount();
  if (runtime.waterParticleTankId === tankId && runtime.waterParticles.length === targetCount) {
    return;
  }

  const seed = hashStringToUint32(`${tankId}|${tank?.gravelSeed || 1}|water-particles`);
  const rand = mulberry32(seed ^ 0x2f6e2b1);
  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const waterTop = Math.max(WATER_SURFACE_Y + 10, visibleBounds.top);
  const waterBottom = Math.min(getVisibleTankFloorBottomY() - 12, visibleBounds.bottom || TANK_HEIGHT);
  const visibleCount = getWaterParticleVisibleCount(now);
  runtime.waterParticleTankId = tankId;
  runtime.waterParticles = Array.from({ length: targetCount }, (_, index) => {
    const x = GLASS_MARGIN_X + randomBetweenWith(rand, 12, TANK_WIDTH - GLASS_MARGIN_X * 2 - 12);
    const floorY = Math.min(waterBottom, getTankFloorMaskSurfaceYAtX(x) - 12);
    return {
      x,
      y: randomBetweenWith(rand, waterTop, Math.max(waterTop + 1, floorY)),
      vx: randomBetweenWith(rand, -3, 3),
      vy: randomBetweenWith(rand, -2, 2),
      depth: Math.pow(randomBetweenWith(rand, 0, 1), 0.82),
      layer: clampTankLayer(1 + Math.floor(randomBetweenWith(rand, 0, 1) * TANK_DEPTH_LAYERS)),
      phase: randomBetweenWith(rand, 0, Math.PI * 2),
      size: randomBetweenWith(rand, 0.65, 1.45),
      tone: randomBetweenWith(rand, 0, 1),
      uvReactive: randomBetweenWith(rand, 0, 1) > 0.62,
      spriteIndex: Math.floor(randomBetweenWith(rand, 0, WATER_PARTICLE_ASSET_PATHS.length)),
      rotation: randomBetweenWith(rand, -Math.PI, Math.PI),
      spin: randomBetweenWith(rand, -0.34, 0.34),
      stretch: randomBetweenWith(rand, 0.68, 1.42),
      alphaScale: randomBetweenWith(rand, 0.72, 1.24),
      visibility: index < visibleCount ? 1 : 0,
      streak: index % 5 === 0,
      hazeLength: randomBetweenWith(rand, 8, 28),
      hazeWidth: randomBetweenWith(rand, 0.55, 1.45),
      hazeAlpha: randomBetweenWith(rand, 0.035, 0.085),
      hazeTilt: randomBetweenWith(rand, -0.42, 0.42)
    };
  });
}

function getWaterParticleDrawColor(particle, dirtiness, uvActive) {
  if (uvActive && particle?.uvReactive) {
    if (particle.tone < 0.34) {
      return { r: 102, g: 236, b: 255 };
    }
    if (particle.tone < 0.68) {
      return { r: 92, g: 255, b: 171 };
    }
    return { r: 255, g: 116, b: 229 };
  }

  if (dirtiness > 0.38 && particle?.tone > 0.36) {
    return particle.tone > 0.68
      ? { r: 126, g: 164, b: 103 }
      : { r: 178, g: 144, b: 92 };
  }

  return { r: 218, g: 248, b: 255 };
}

function formatRgb(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

function formatRgba(color, alpha) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function getWaterParticleSpriteBounds(spritePath, sprite) {
  const mask = getImageAlphaMask(spritePath);
  const width = Math.max(1, Math.round(Number(sprite?.naturalWidth || sprite?.width) || 1));
  const height = Math.max(1, Math.round(Number(sprite?.naturalHeight || sprite?.height) || 1));
  if (!mask?.bounds) {
    return { sx: 0, sy: 0, sw: width, sh: height };
  }

  const padding = 1;
  const sx = clamp(mask.bounds.minX - padding, 0, width - 1);
  const sy = clamp(mask.bounds.minY - padding, 0, height - 1);
  const right = clamp(mask.bounds.maxX + padding, sx, width - 1);
  const bottom = clamp(mask.bounds.maxY + padding, sy, height - 1);
  return {
    sx,
    sy,
    sw: Math.max(1, right - sx + 1),
    sh: Math.max(1, bottom - sy + 1)
  };
}

function getTintedWaterParticleSprite(spritePath, sprite, tintRgb) {
  if (!spritePath || !sprite?.width || !sprite?.height) {
    return null;
  }

  const bounds = getWaterParticleSpriteBounds(spritePath, sprite);
  const cacheKey = `${getUvGlowSourceKey(sprite)}|${tintRgb}|${bounds.sx},${bounds.sy},${bounds.sw},${bounds.sh}`;
  if (runtime.waterParticleTintCache.has(cacheKey)) {
    return runtime.waterParticleTintCache.get(cacheKey);
  }

  const canvas = document.createElement("canvas");
  canvas.width = bounds.sw;
  canvas.height = bounds.sh;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    runtime.waterParticleTintCache.set(cacheKey, null);
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    sprite,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    canvas.width,
    canvas.height
  );
  context.globalCompositeOperation = "source-in";
  context.fillStyle = tintRgb;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";

  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] <= 0) {
        continue;
      }
      pixels[index] = clamp(
        Math.round(pixels[index] * WATER_PARTICLE_SPRITE_ALPHA_BOOST + WATER_PARTICLE_SPRITE_ALPHA_FLOOR),
        0,
        255
      );
    }
    context.putImageData(imageData, 0, 0);
  } catch (error) {
    console.debug("Water particle tint alpha boost skipped.", error);
  }

  runtime.waterParticleTintCache.set(cacheKey, canvas);
  return canvas;
}

function collectBubblerParticleFields(now = Date.now()) {
  const fields = [];
  for (const item of state?.placedDecor || []) {
    const decor = runtime.decorMap.get(item?.decorKey);
    const image = decor?.path ? runtime.images.get(decor.path) : null;
    const bubbler = getPlacedDecorBubblerMeta(item, decor);
    if (!item || !decor || !image?.width || !image?.height || !bubbler?.spouts?.length) {
      continue;
    }

    const stableScale = getViewportStableAssetScale();
    const itemScale = Number.isFinite(Number(item.scale)) ? Number(item.scale) : 1;
    const width = getDecorDisplayWidth(decor, item);
    const height = width * (image.height / Math.max(1, image.width));
    const drawX = item.xNorm * TANK_WIDTH - width / 2;
    const drawY = item.yNorm * TANK_HEIGHT - height;

    bubbler.spouts.forEach((spout, spoutIndex) => {
      const sourceLocation = getBubblerSpoutHorizontalLocation(spout, image);
      const renderedSourceLocation = resolveDecorHorizontalUnit(item, sourceLocation);
      const sourceYOffsetRatio = getBubblerSpoutSourceOffsetRatio(
        decor.path,
        {
          horizontalLocation: sourceLocation,
          horizontalOffsetPx: null
        }
      );
      const sourceX = drawX + width * renderedSourceLocation;
      const sourceY = drawY + height * resolveDecorVerticalUnit(item, sourceYOffsetRatio) + Math.max(2 * stableScale, itemScale * 2 * stableScale);
      const direction = getBubblerDirectionVector(spout.direction);
      const spreadPx = Number.isFinite(Number(spout.spread)) ? Number(spout.spread) : DEFAULT_BUBBLER_SPREAD_PX;
      const distancePx = Number.isFinite(Number(spout.fadeDistance)) ? Number(spout.fadeDistance) : DEFAULT_BUBBLER_FADE_DISTANCE_PX;
      fields.push({
        x: sourceX,
        y: sourceY,
        directionX: direction.x,
        directionY: isDecorVerticallyFlipped(item) ? -direction.y : direction.y,
        spread: Math.max(WATER_PARTICLE_BUBBLER_FORCE_RADIUS_PX * 0.42, spreadPx * itemScale * stableScale * 0.56),
        distance: Math.max(58, distancePx * stableScale),
        strength: clamp((Number(spout.intensity) || DEFAULT_BUBBLER_INTENSITY) / MAX_BUBBLER_INTENSITY, 0.35, 1.25),
        phase: spoutIndex * 0.7 + (Number(item.phase) || 0)
      });
    });
  }
  return fields;
}

function applyBubblerForceToParticle(particle, field, now, deltaSeconds) {
  const dx = particle.x - field.x;
  const dy = particle.y - field.y;
  const along = dx * field.directionX + dy * field.directionY;
  const perp = Math.abs(dx * -field.directionY + dy * field.directionX);
  const upwardDistance = field.y - particle.y;
  const withinColumn = particle.y <= field.y + 18 && upwardDistance <= field.distance;
  if (!withinColumn || along < -24 || along > field.distance || perp > field.spread) {
    return;
  }

  const columnForce = Math.pow(1 - perp / Math.max(1, field.spread), 1.4)
    * (1 - clamp(Math.max(0, along) / Math.max(1, field.distance), 0, 1))
    * field.strength;
  const swirl = Math.sin(now / 430 + particle.phase + field.phase) * 42;
  particle.vx += (field.directionX * 136 + swirl) * columnForce * deltaSeconds;
  particle.vy += (field.directionY * 82 - 174) * columnForce * deltaSeconds;
}

function getAmbientBubbleParticleLayers(renderPass) {
  if (renderPass <= 1) {
    return [1, 2];
  }
  if (renderPass === 2) {
    return [3];
  }
  return [4, 5];
}

function collectAmbientBubbleParticleFields(now = Date.now()) {
  if (!areAmbientBubblesEnabled()) {
    return [];
  }

  const fields = [];
  const stableScale = getViewportStableAssetScale();
  for (const bubble of getVisibleAmbientSceneBubbles()) {
    const renderPass = getAmbientBubbleRenderPass(bubble.layer || 3);
    const layerProfile = getAmbientBubbleLayerProfile(renderPass);
    if (!layerProfile) {
      continue;
    }

    const progress = ((now / 1000) * bubble.speed + bubble.offset) % 1;
    const travelPhase = progress * bubble.wave + bubble.offset * 8;
    const x = bubble.x * TANK_WIDTH
      + Math.sin(travelPhase) * bubble.wobble * layerProfile.wobbleScale * stableScale
      + Math.cos(now / layerProfile.parallaxMs + bubble.offset * 11) * layerProfile.parallaxPx * stableScale;
    const y = TANK_HEIGHT - GLASS_MARGIN_BOTTOM - 8 - progress * (TANK_HEIGHT - WATER_SURFACE_Y - 20);
    if (y <= WATER_SURFACE_Y + 2) {
      continue;
    }

    const radius = Math.max(
      16 * stableScale,
      bubble.size * layerProfile.sizeScale * stableScale * (bubble.style === "cluster" ? 1.55 : 1.15)
    );
    fields.push({
      x,
      y,
      radius: radius + 30 * stableScale,
      speed: Math.max(28, bubble.speed * 82) * stableScale,
      layers: getAmbientBubbleParticleLayers(renderPass),
      strength: clamp((Number(bubble.alpha) || 0.45) * 1.4, 0.35, 1.1)
    });
  }
  return fields;
}

function applyAmbientBubbleForceToParticle(particle, bubbleFields, deltaSeconds) {
  const particleLayer = getWaterParticleTankLayer(particle);
  for (const field of bubbleFields) {
    if (Array.isArray(field.layers) && !field.layers.includes(particleLayer)) {
      continue;
    }

    const dx = particle.x - field.x;
    const dy = particle.y - field.y;
    const distanceToBubble = Math.hypot(dx, dy);
    if (distanceToBubble >= field.radius) {
      continue;
    }

    const safeDistance = Math.max(1, distanceToBubble);
    const force = Math.pow(1 - distanceToBubble / field.radius, 1.6) * field.strength;
    particle.vx += (dx / safeDistance) * 58 * force * deltaSeconds;
    particle.vy += ((dy / safeDistance) * 32 - field.speed) * force * deltaSeconds;
  }
}

function getWaterParticleTankLayer(particle) {
  if (Number.isFinite(Number(particle?.layer))) {
    return clampTankLayer(particle.layer);
  }

  const depth = clamp(Number(particle?.depth) || 0, 0, 0.999);
  return clampTankLayer(1 + Math.floor(depth * TANK_DEPTH_LAYERS));
}

function applyFilterForceToParticle(particle, filterFlow, deltaSeconds) {
  if (!filterFlow) {
    return;
  }

  const intakeDx = filterFlow.intakeX - particle.x;
  const intakeDy = filterFlow.intakeY - particle.y;
  const intakeDistance = Math.hypot(intakeDx, intakeDy);
  if (intakeDistance < WATER_PARTICLE_FILTER_FORCE_RADIUS_PX) {
    const pull = Math.pow(1 - intakeDistance / WATER_PARTICLE_FILTER_FORCE_RADIUS_PX, 1.6) * filterFlow.flow;
    const safeDistance = Math.max(1, intakeDistance);
    particle.vx += (intakeDx / safeDistance) * 96 * pull * deltaSeconds;
    particle.vy += (intakeDy / safeDistance) * 96 * pull * deltaSeconds;
  }

  if (!filterFlow.flowActive) {
    return;
  }

  const progress = clamp((filterFlow.outletX - particle.x) / Math.max(1, filterFlow.streamDistance), 0, 1);
  const streamY = filterFlow.outletY - filterFlow.streamRise * Math.pow(clamp((progress - 0.68) / 0.32, 0, 1), 2);
  const streamDx = particle.x - filterFlow.outletX;
  const streamDy = particle.y - streamY;
  const inStream = streamDx <= 22 && streamDx >= -filterFlow.streamDistance - 24 && Math.abs(streamDy) < WATER_PARTICLE_FILTER_FORCE_RADIUS_PX * 0.34;
  if (inStream) {
    const push = Math.pow(1 - Math.abs(streamDy) / (WATER_PARTICLE_FILTER_FORCE_RADIUS_PX * 0.34), 1.2)
      * (0.35 + (1 - progress) * 0.65)
      * filterFlow.flow;
    particle.vx -= 96 * push * deltaSeconds;
    particle.vy -= 18 * push * deltaSeconds;
  }
}

function getParticleFishFields(now = Date.now()) {
  const fields = [];
  for (const fish of state?.fish || []) {
    if (!fish?.id || isFishDead(fish)) {
      continue;
    }
    const sample = runtime.waterEffectFishSamples.get(fish.id);
    const species = getSpeciesForFish(fish);
    if (!sample || !species) {
      continue;
    }
    const width = getFishDisplayWidth(fish, species, now);
    fields.push({
      x: sample.x,
      y: sample.y,
      vx: Number(sample.vx) || 0,
      vy: Number(sample.vy) || 0,
      speed: Number(sample.speed) || 0,
      layer: getFishTankLayer(fish),
      radius: clamp(width * 0.72, WATER_PARTICLE_FISH_FORCE_RADIUS_PX * 0.62, WATER_PARTICLE_FISH_FORCE_RADIUS_PX * 1.55)
    });
  }
  return fields;
}

function applyFishForceToParticle(particle, fishFields, deltaSeconds) {
  const particleLayer = getWaterParticleTankLayer(particle);
  for (const field of fishFields) {
    const layerDelta = Math.abs(particleLayer - field.layer);
    if (layerDelta > 1) {
      continue;
    }

    const dx = particle.x - field.x;
    const dy = particle.y - field.y;
    const distanceToFish = Math.hypot(dx, dy);
    if (distanceToFish >= field.radius) {
      continue;
    }

    const safeDistance = Math.max(1, distanceToFish);
    const layerForce = layerDelta === 0 ? 1 : 0.42;
    const force = Math.pow(1 - distanceToFish / field.radius, 1.8)
      * clamp(0.34 + field.speed / 150, 0.34, 1.85)
      * layerForce
      * (0.78 + particle.depth * 0.34);
    particle.vx += ((dx / safeDistance) * 170 + field.vx * 0.46) * force * deltaSeconds;
    particle.vy += ((dy / safeDistance) * 126 + field.vy * 0.38) * force * deltaSeconds;
  }
}

function updateWaterParticles(now = Date.now(), deltaSeconds = 0.016) {
  if (!state || !areWaterParticlesEnabled()) {
    return;
  }

  ensureWaterParticles(now);
  const boundedDelta = clamp(Number(deltaSeconds) || 0.016, 0.001, 0.05);
  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const waterTop = Math.max(WATER_SURFACE_Y + 8, visibleBounds.top - 12);
  const waterBottom = Math.min(getVisibleTankFloorBottomY() - 8, visibleBounds.bottom + 12);
  const left = Math.max(GLASS_MARGIN_X, visibleBounds.left - 18);
  const right = Math.min(TANK_WIDTH - GLASS_MARGIN_X, visibleBounds.right + 18);
  const dirtiness = getTankDirtiness(now);
  const bubblerFields = collectBubblerParticleFields(now);
  const ambientBubbleFields = collectAmbientBubbleParticleFields(now);
  const filterFlow = getWaterFilterFlowDescriptor(now);
  const fishFields = getParticleFishFields(now);
  const visibleCount = getWaterParticleVisibleCount(now);

  for (let index = 0; index < runtime.waterParticles.length; index += 1) {
    const particle = runtime.waterParticles[index];
    const targetVisibility = index < visibleCount ? 1 : 0;
    const fadeRate = targetVisibility > (Number(particle.visibility) || 0)
      ? WATER_PARTICLE_FADE_IN_PER_SECOND
      : WATER_PARTICLE_FADE_OUT_PER_SECOND;
    particle.visibility = clamp(
      (Number(particle.visibility) || 0) + (targetVisibility - (Number(particle.visibility) || 0)) * fadeRate * boundedDelta,
      0,
      1
    );

    const shimmer = Math.sin(now / (900 + particle.depth * 700) + particle.phase);
    const cloudyDrift = 0.65 + dirtiness * 0.8;
    particle.vx += (Math.sin(now / 1800 + particle.phase) * 1.8 + (particle.depth - 0.5) * 1.1) * boundedDelta;
    particle.vy += (Math.cos(now / 2300 + particle.phase) * 1.1 - 1.1 + dirtiness * 0.55) * boundedDelta;
    for (const field of bubblerFields) {
      applyBubblerForceToParticle(particle, field, now, boundedDelta);
    }
    applyAmbientBubbleForceToParticle(particle, ambientBubbleFields, boundedDelta);
    applyFilterForceToParticle(particle, filterFlow, boundedDelta);
    applyFishForceToParticle(particle, fishFields, boundedDelta);

    const depthMotionScale = 0.72 + particle.depth * 0.56;
    particle.x += (particle.vx + shimmer * 2.4 * (1 - dirtiness * 0.35)) * cloudyDrift * boundedDelta * depthMotionScale;
    particle.y += particle.vy * cloudyDrift * boundedDelta * depthMotionScale;
    particle.vx *= Math.pow(0.38, boundedDelta);
    particle.vy *= Math.pow(0.42, boundedDelta);

    const floorY = Math.min(waterBottom, getTankFloorMaskSurfaceYAtX(particle.x) - 7);
    let wrapped = false;
    if (particle.x < left) {
      particle.x = right;
      particle.y = randomBetween(waterTop, Math.max(waterTop + 1, floorY));
      wrapped = true;
    } else if (particle.x > right) {
      particle.x = left;
      particle.y = randomBetween(waterTop, Math.max(waterTop + 1, floorY));
      wrapped = true;
    }
    if (particle.y < waterTop) {
      particle.y = floorY;
      wrapped = true;
    } else if (particle.y > floorY) {
      particle.y = waterTop + Math.random() * Math.max(1, floorY - waterTop);
      wrapped = true;
    }

    if (wrapped) {
      particle.visibility = Math.min(Number(particle.visibility) || 0, 0.04);
      particle.phase = randomBetween(0, Math.PI * 2);
      particle.rotation = randomBetween(-Math.PI, Math.PI);
      particle.spriteIndex = Math.floor(randomBetween(0, WATER_PARTICLE_ASSET_PATHS.length));
    }
  }
}

function drawWaterAtmosphereStreak(context, particle, now, visibility, dirtiness) {
  if (!particle?.streak || visibility <= 0.02) {
    return;
  }

  const pulse = 0.5 + Math.sin(
    (Number(now) || 0) / (2800 + particle.depth * 2200) + particle.phase * 1.7
  ) * 0.5;
  const presence = Math.pow(clamp((pulse - 0.16) / 0.84, 0, 1), 1.7);
  if (presence <= 0.02) {
    return;
  }

  const depthScale = 0.72 + particle.depth * 0.68;
  const length = Math.max(5, (Number(particle.hazeLength) || 14) * depthScale);
  const width = Math.max(0.45, (Number(particle.hazeWidth) || 0.9) * (0.82 + particle.depth * 0.42));
  const alpha = clamp(
    (Number(particle.hazeAlpha) || 0.05)
      * presence
      * visibility
      * (0.72 + particle.depth * 0.46)
      * (0.92 + dirtiness * 0.24),
    0,
    0.095
  );
  if (alpha <= 0.004) {
    return;
  }

  const angle = (Number(particle.hazeTilt) || 0)
    + Math.sin((Number(now) || 0) / 5200 + particle.phase) * 0.08;

  context.save();
  context.translate(particle.x, particle.y);
  context.rotate(angle);
  context.scale(length, width);
  context.globalCompositeOperation = "screen";
  context.filter = "blur(1.35px)";
  const gradient = context.createRadialGradient(0, 0, 0.02, 0, 0, 1);
  gradient.addColorStop(0, `rgba(225, 244, 255, ${alpha.toFixed(4)})`);
  gradient.addColorStop(0.34, `rgba(210, 236, 252, ${(alpha * 0.56).toFixed(4)})`);
  gradient.addColorStop(1, "rgba(198, 226, 248, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawWaterParticles(now = Date.now(), layer = null) {
  if (!state || !areWaterParticlesEnabled()) {
    return;
  }

  ensureWaterParticles(now);
  const targetLayer = Number.isFinite(Number(layer)) ? clampTankLayer(layer) : null;
  const dirtiness = getTankDirtiness(now);
  const uvActive = isUvLightActive() && UV_LIGHT_WATER_PARTICLE_GLOW_ENABLED;
  const cleanShimmer = 1 - dirtiness;

  tankContext.save();
  tankContext.globalCompositeOperation = "source-over";
  for (let index = 0; index < runtime.waterParticles.length; index += 1) {
    const particle = runtime.waterParticles[index];
    if (targetLayer !== null && getWaterParticleTankLayer(particle) !== targetLayer) {
      continue;
    }

    const visibility = clamp(Number(particle.visibility) || 0, 0, 1);
    if (visibility <= 0.015) {
      continue;
    }

    const twinkle = 0.55 + Math.sin(now / (520 + particle.depth * 260) + particle.phase) * 0.45;
    const size = clamp(
      (WATER_PARTICLE_SPRITE_SIZE_MIN_PX + particle.depth * 1.05 + dirtiness * 0.48) * particle.size,
      WATER_PARTICLE_SPRITE_SIZE_MIN_PX,
      WATER_PARTICLE_SPRITE_SIZE_MAX_PX
    );
    const alpha = clamp(
      (0.18 + particle.depth * 0.16 + dirtiness * 0.24) * (0.62 + twinkle * 0.38) * (particle.alphaScale || 1),
      0.1,
      0.72
    ) * visibility;
    const spriteIndex = Number.isFinite(Number(particle.spriteIndex))
      ? Math.abs(Math.floor(Number(particle.spriteIndex)))
      : index;
    const spritePath = WATER_PARTICLE_ASSET_PATHS[spriteIndex % WATER_PARTICLE_ASSET_PATHS.length];
    const sprite = runtime.images.get(spritePath);
    const color = getWaterParticleDrawColor(particle, dirtiness, uvActive);
    const tintRgb = formatRgb(color);
    const renderSprite = sprite?.width && sprite?.height
      ? getTintedWaterParticleSprite(spritePath, sprite, tintRgb)
      : null;
    const drawWidth = size * (particle.stretch || 1);
    const drawHeight = size * (renderSprite?.height && renderSprite?.width ? renderSprite.height / Math.max(1, renderSprite.width) : 1);

    drawWaterAtmosphereStreak(tankContext, particle, now, visibility, dirtiness);

    if (uvActive && particle.uvReactive) {
      tankContext.shadowColor = formatRgba(color, alpha * 2.2);
      tankContext.shadowBlur = 5 + particle.depth * 9;
      tankContext.fillStyle = formatRgba(color, alpha * 1.65);
      tankContext.strokeStyle = tankContext.fillStyle;
    } else {
      tankContext.shadowBlur = 0;
      const cleanAlphaBoost = color.r === 218 && color.g === 248 ? 0.86 + cleanShimmer * 1.05 : 0.9 + dirtiness;
      tankContext.fillStyle = formatRgba(color, alpha * cleanAlphaBoost);
      tankContext.strokeStyle = tankContext.fillStyle;
    }

    tankContext.save();
    tankContext.translate(particle.x, particle.y);
    tankContext.rotate((particle.rotation || 0) + (now / 1000) * (particle.spin || 0));
    tankContext.globalAlpha = renderSprite?.width && renderSprite?.height ? alpha : alpha * 0.82;
    if (renderSprite?.width && renderSprite?.height) {
      tankContext.drawImage(renderSprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      if (uvActive && particle.uvReactive) {
        drawUvGlowImageToContext(
          tankContext,
          renderSprite,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
          0.92 + particle.depth * 0.55,
          alpha * 1.18,
          "water-particle"
        );
      }
    } else {
      tankContext.beginPath();
      tankContext.ellipse(0, 0, drawWidth * 0.5, drawHeight * 0.5, 0, 0, Math.PI * 2);
      tankContext.fill();
      if (uvActive && particle.uvReactive) {
        tankContext.globalCompositeOperation = "screen";
        tankContext.globalAlpha = alpha * 0.72;
        tankContext.beginPath();
        tankContext.ellipse(0, 0, drawWidth * 0.82, drawHeight * 0.82, 0, 0, Math.PI * 2);
        tankContext.fill();
        tankContext.globalCompositeOperation = "source-over";
      }
    }
    tankContext.restore();
  }
  tankContext.restore();
}

function isFilterBubbleFlowActive(now = Date.now()) {
  return getBaseTankDirtiness(now) < CRITICAL_TANK_DIRTINESS;
}

function drawAutoDispenserButton(bounds, label, options = {}) {
  tankContext.save();
  const gradient = tankContext.createLinearGradient(bounds.left, bounds.top, bounds.left, bounds.bottom);
  const green = options.variant === "play";
  const red = options.variant === "reset";
  if (green) {
    gradient.addColorStop(0, "rgba(109, 230, 93, 0.98)");
    gradient.addColorStop(0.52, "rgba(50, 170, 67, 0.98)");
    gradient.addColorStop(1, "rgba(18, 96, 43, 0.98)");
  } else if (red) {
    gradient.addColorStop(0, "rgba(245, 82, 82, 0.98)");
    gradient.addColorStop(0.52, "rgba(210, 36, 36, 0.98)");
    gradient.addColorStop(1, "rgba(142, 12, 16, 0.98)");
  } else {
    gradient.addColorStop(0, "rgba(242, 177, 74, 0.96)");
    gradient.addColorStop(1, "rgba(150, 92, 18, 0.96)");
  }
  tankContext.fillStyle = gradient;
  tankContext.beginPath();
  tankContext.roundRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top, 6);
  tankContext.fill();
  tankContext.strokeStyle = green
    ? "rgba(209, 255, 190, 0.68)"
    : red
      ? "rgba(255, 196, 196, 0.72)"
      : "rgba(255, 239, 188, 0.55)";
  tankContext.lineWidth = 1.5 * getViewportStableAssetScale();
  tankContext.stroke();
  tankContext.fillStyle = green ? "#06210D" : red ? "#050505" : "#1E1204";
  tankContext.strokeStyle = tankContext.fillStyle;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  if (options.icon === "play") {
    const iconSize = Math.min(width, height) * 0.48;
    tankContext.beginPath();
    tankContext.moveTo(centerX - iconSize * 0.34, centerY - iconSize * 0.48);
    tankContext.lineTo(centerX - iconSize * 0.34, centerY + iconSize * 0.48);
    tankContext.lineTo(centerX + iconSize * 0.46, centerY);
    tankContext.closePath();
    tankContext.fill();
    tankContext.restore();
    return;
  }

  if (options.icon === "reset") {
    tankContext.font = `900 ${Math.max(10, Math.round(height * 0.82))}px "Segoe UI Symbol", "Arial Unicode MS", "Trebuchet MS", sans-serif`;
    tankContext.textAlign = "center";
    tankContext.textBaseline = "middle";
    tankContext.fillText("\u21BA", centerX, centerY + height * 0.03, width * 0.86);
    tankContext.restore();
    return;
  }

  const textScale = options.textScale || (String(label).length > 2 ? 0.5 : 0.9);
  tankContext.font = `bold ${Math.max(10, Math.round(height * textScale))}px "Trebuchet MS", sans-serif`;
  tankContext.textAlign = "center";
  tankContext.textBaseline = "middle";
  tankContext.fillText(label, centerX, centerY + 0.5);
  tankContext.restore();
}

function getAutoDispenserHopperCache() {
  if (!runtime.autoDispenserHopperCache) {
    runtime.autoDispenserHopperCache = {
      key: "",
      canvas: document.createElement("canvas")
    };
  }
  return runtime.autoDispenserHopperCache;
}

function getAutoDispenserHopperCacheKey(storedPellets, width, height) {
  const pelletKey = storedPellets
    .slice(0, AUTO_DISPENSER_HOPPER_MAX_DRAWN_PELLETS)
    .map((pellet) => `${pellet.id || ""}:${pellet.foodKey || ""}:${pellet.spritePath || ""}`)
    .join("|");
  return [
    Math.round(width),
    Math.round(height),
    isViolenceAndGoreEnabled() ? "gore" : "safe",
    pelletKey
  ].join(";");
}

function drawFoodPelletPieceToContext(context, x, y, pellet, appearance) {
  const sprite = getTintedFoodPelletSprite(appearance);
  const stableScale = getViewportStableAssetScale();
  const scale = clamp(Number(pellet?.scale) || 1, 0.75, 1.35) * stableScale;

  context.save();
  context.translate(x, y);
  context.rotate((Number(pellet?.rotation) || 0) * 0.35);
  context.globalAlpha = 0.94;
  if (sprite) {
    const size = 9.8 * scale;
    const drawWidth = size;
    const drawHeight = size * (sprite.height / Math.max(1, sprite.width));
    context.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  } else {
    const width = 8.8 * scale;
    const height = 6.2 * scale;
    context.fillStyle = appearance.baseColor;
    context.beginPath();
    context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = appearance.accentColor;
    context.beginPath();
    context.ellipse(width * 0.06, height * 0.02, width * 0.3, height * 0.22, 0.05, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = appearance.highlightColor;
    context.beginPath();
    context.ellipse(-width * 0.15, -height * 0.16, width * 0.16, height * 0.22, 0.1, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawFoodSpritePieceToContext(context, x, y, pellet, spritePath) {
  const image = spritePath ? runtime.images.get(spritePath) : null;
  if (!image) {
    return false;
  }

  const stableScale = getViewportStableAssetScale();
  const scale = clamp(Number(pellet?.scale) || 1, 0.8, 1.4) * stableScale;
  const fitScale = Math.min((24 * scale) / Math.max(1, image.width), (24 * scale) / Math.max(1, image.height));
  const drawWidth = Math.max(10 * stableScale, image.width * fitScale);
  const drawHeight = Math.max(10 * stableScale, image.height * fitScale);

  context.save();
  context.translate(x, y);
  context.rotate(Number(pellet?.rotation) || 0);
  context.globalAlpha = 0.96;
  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
  return true;
}

function buildAutoDispenserHopperPile(storedPellets, width, height) {
  const visiblePelletCount = Math.min(
    storedPellets.length,
    AUTO_DISPENSER_MAX_PELLETS,
    AUTO_DISPENSER_HOPPER_MAX_DRAWN_PELLETS
  );
  const fullness = clamp(visiblePelletCount / AUTO_DISPENSER_MAX_PELLETS, 0, 1);
  const fillHeightRatio = clamp(0.2 + fullness * 0.8, 0, 1);
  const fillTop = height * (1 - fillHeightRatio);
  const stableScale = getViewportStableAssetScale();
  const margin = Math.max(5 * stableScale, 3);
  const pieces = [];

  for (let index = 0; index < visiblePelletCount; index += 1) {
    const storedPellet = storedPellets[index];
    const rand = mulberry32(hashStringToUint32(`${storedPellet.id || ""}|${storedPellet.foodKey || ""}|hopper|${index}`) ^ 0x6a09e667);
    const food = getFoodMeta(storedPellet.foodKey);
    const dropStyle = getFoodDropStyle(food);
    const yUnit = Math.pow(randomBetweenWith(rand, 0, 1), 0.72);
    const xJitter = (randomBetweenWith(rand, -1, 1) + randomBetweenWith(rand, -1, 1)) * 0.5;
    const x = clamp(
      width * (0.5 + xJitter * 0.48),
      margin,
      Math.max(margin, width - margin)
    );
    const y = clamp(
      fillTop + yUnit * Math.max(1, height - fillTop),
      fillTop + margin * 0.45,
      Math.max(fillTop + margin * 0.45, height - margin * 0.28)
    );
    pieces.push({
      x,
      y,
      storedPellet,
      pellet: {
        scale: dropStyle === "sprite"
          ? randomBetweenWith(rand, 0.92, 1.18)
          : randomBetweenWith(rand, 0.94, 1.08),
        rotation: dropStyle === "sprite"
          ? randomBetweenWith(rand, -0.95, 0.95)
          : randomBetweenWith(rand, -0.22, 0.22),
        spritePath: storedPellet.spritePath
      }
    });
  }

  return pieces.sort((left, right) => left.y - right.y);
}

function renderAutoDispenserHopperCache(dispenser, layout) {
  const storedPellets = Array.isArray(dispenser.storedPellets) ? dispenser.storedPellets : [];
  const width = Math.max(1, Math.ceil(layout.hopperBounds.right - layout.hopperBounds.left));
  const height = Math.max(1, Math.ceil(layout.hopperBounds.bottom - layout.hopperBounds.top));
  const cache = getAutoDispenserHopperCache();
  const key = getAutoDispenserHopperCacheKey(storedPellets, width, height);
  if (cache.key === key && cache.canvas.width === width && cache.canvas.height === height) {
    return cache.canvas;
  }

  cache.key = key;
  cache.canvas.width = width;
  cache.canvas.height = height;
  const context = cache.canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  const appearanceCache = new Map();
  for (const piece of buildAutoDispenserHopperPile(storedPellets, width, height)) {
    const { storedPellet, pellet } = piece;
    const cacheKey = `${storedPellet.foodKey || ""}|${storedPellet.spritePath || ""}`;
    let appearance = appearanceCache.get(cacheKey);
    if (!appearance) {
      appearance = getFoodDropAppearance(storedPellet.foodKey, storedPellet);
      appearanceCache.set(cacheKey, appearance);
    }

    if (appearance.dropStyle === "sprite") {
      if (!drawFoodSpritePieceToContext(context, piece.x, piece.y, pellet, appearance.spritePath)) {
        drawFoodPelletPieceToContext(context, piece.x, piece.y, pellet, appearance);
      }
    } else {
      drawFoodPelletPieceToContext(context, piece.x, piece.y, pellet, appearance);
    }
  }
  return cache.canvas;
}

function drawAutoDispenser(now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    return;
  }

  const dispenser = state.autoDispenser;
  const layout = getAutoDispenserLayout();
  const backgroundImage = runtime.images.get(AUTO_DISPENSER_BG_PATH);
  const foregroundImage = runtime.images.get(AUTO_DISPENSER_IMAGE_PATH);

  tankContext.save();
  if (backgroundImage) {
    tankContext.drawImage(backgroundImage, layout.x, layout.y, layout.width, layout.height);
  }

  tankContext.save();
  tankContext.beginPath();
  tankContext.roundRect(
    layout.hopperBounds.left,
    layout.hopperBounds.top,
    layout.hopperBounds.right - layout.hopperBounds.left,
    layout.hopperBounds.bottom - layout.hopperBounds.top,
    10
  );
  tankContext.clip();

  const hopperCanvas = renderAutoDispenserHopperCache(dispenser, layout);
  tankContext.drawImage(
    hopperCanvas,
    layout.hopperBounds.left,
    layout.hopperBounds.top,
    layout.hopperBounds.right - layout.hopperBounds.left,
    layout.hopperBounds.bottom - layout.hopperBounds.top
  );
  tankContext.restore();

  if (foregroundImage) {
    tankContext.drawImage(foregroundImage, layout.x, layout.y, layout.width, layout.height);
  }

  const lowFood = isAutoDispenserFoodLow(dispenser) || dispenser.refillAlert;
  const blinking = lowFood && Math.floor(now / AUTO_DISPENSER_LOW_FOOD_BLINK_MS) % 2 === 0;
  const screenBounds = layout.screenBounds;
  const screenGradient = tankContext.createLinearGradient(screenBounds.left, screenBounds.top, screenBounds.left, screenBounds.bottom);
  screenGradient.addColorStop(0, "rgba(82, 86, 86, 0.98)");
  screenGradient.addColorStop(0.48, "rgba(55, 58, 58, 0.98)");
  screenGradient.addColorStop(1, "rgba(31, 33, 34, 0.98)");
  tankContext.fillStyle = screenGradient;
  tankContext.beginPath();
  tankContext.roundRect(
    screenBounds.left,
    screenBounds.top,
    screenBounds.right - screenBounds.left,
    screenBounds.bottom - screenBounds.top,
    6
  );
  tankContext.fill();
  tankContext.strokeStyle = "rgba(12, 13, 13, 0.72)";
  tankContext.lineWidth = getViewportStableAssetScale();
  tankContext.stroke();

  const displayValue = String(clamp(dispenser.mealPortion || 0, AUTO_DISPENSER_PORTION_MIN, AUTO_DISPENSER_PORTION_MAX)).padStart(2, "0");
  const screenWidth = screenBounds.right - screenBounds.left;
  const screenHeight = screenBounds.bottom - screenBounds.top;
  tankContext.save();
  tankContext.textAlign = "center";
  tankContext.textBaseline = "middle";
  tankContext.font = `700 ${Math.max(9, Math.round(screenHeight * 0.82))}px "E1234Display", "Consolas", "Courier New", monospace`;
  tankContext.fillStyle = blinking ? "#E92525" : "#050505";
  tankContext.shadowColor = blinking ? "rgba(255, 28, 28, 0.55)" : "transparent";
  tankContext.shadowBlur = blinking ? Math.max(2, screenHeight * 0.18) : 0;
  tankContext.fillText(displayValue, screenBounds.left + screenWidth / 2, screenBounds.top + screenHeight * 0.57, screenWidth * 0.82);
  tankContext.restore();

  drawAutoDispenserButton(layout.minusBounds, "-");
  drawAutoDispenserButton(layout.plusBounds, "+");
  drawAutoDispenserButton(layout.resetBounds, "", { icon: "reset", variant: "reset" });
  drawAutoDispenserButton(layout.playBounds, "", { icon: "play", variant: "play" });
  tankContext.restore();
}

function getTintedFoodPelletSprite(appearance) {
  const image = runtime.images.get(FOOD_PELLET_IMAGE_PATH);
  if (!image?.width || !image?.height) {
    return null;
  }

  const baseRgb = hexToRgb(appearance?.baseColor) || hexToRgb("#825930");
  const accentRgb = hexToRgb(appearance?.accentColor) || baseRgb;
  const highlightRgb = hexToRgb(appearance?.highlightColor) || accentRgb;
  const cacheKey = `${appearance?.baseColor || ""}|${appearance?.accentColor || ""}|${appearance?.highlightColor || ""}`;
  const cached = runtime.foodPelletTintCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const mixRgb = (left, right, amount) => {
    const weight = clamp(amount, 0, 1);
    return {
      r: left.r + (right.r - left.r) * weight,
      g: left.g + (right.g - left.g) * weight,
      b: left.b + (right.b - left.b) * weight
    };
  };

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha <= 4) {
      continue;
    }

    const luminance = (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255;
    const shade = clamp(Math.pow(luminance, 0.82), 0, 1);
    const target = shade < 0.62
      ? mixRgb(baseRgb, accentRgb, shade / 0.62)
      : mixRgb(accentRgb, highlightRgb, (shade - 0.62) / 0.38);

    pixels[index] = Math.round(target.r);
    pixels[index + 1] = Math.round(target.g);
    pixels[index + 2] = Math.round(target.b);
  }

  context.putImageData(imageData, 0, 0);
  runtime.foodPelletTintCache.set(cacheKey, canvas);
  return canvas;
}

function drawProceduralFoodPelletPiece(x, y, pellet, appearance) {
  const scale = clamp(Number(pellet?.scale) || 1, 0.75, 1.35) * getViewportStableAssetScale();
  const width = 11.6 * scale;
  const height = 6.6 * scale;
  const accentWidth = width * 0.65;
  const accentHeight = height * 0.66;

  tankContext.save();
  tankContext.translate(x, y);
  tankContext.rotate((Number(pellet?.rotation) || 0) * 0.35);
  tankContext.globalAlpha = 0.92;

  tankContext.fillStyle = appearance.baseColor;
  tankContext.beginPath();
  tankContext.roundRect(-width / 2, -height / 2, width, height, height / 2);
  tankContext.fill();

  tankContext.fillStyle = appearance.accentColor;
  tankContext.beginPath();
  tankContext.roundRect(-accentWidth / 2 + width * 0.02, -accentHeight / 2, accentWidth, accentHeight, accentHeight / 2);
  tankContext.fill();

  tankContext.fillStyle = appearance.highlightColor;
  tankContext.beginPath();
  tankContext.ellipse(-width * 0.15, -height * 0.16, width * 0.16, height * 0.22, 0.1, 0, Math.PI * 2);
  tankContext.fill();

  tankContext.restore();
}

function drawFoodPelletPiece(x, y, pellet, appearance) {
  const sprite = getTintedFoodPelletSprite(appearance);
  if (!sprite) {
    drawProceduralFoodPelletPiece(x, y, pellet, appearance);
    return;
  }

  const scale = clamp(Number(pellet?.scale) || 1, 0.75, 1.35) * getViewportStableAssetScale();
  const size = 9.8 * scale;
  const drawWidth = size;
  const drawHeight = size * (sprite.height / Math.max(1, sprite.width));

  tankContext.save();
  tankContext.translate(x, y);
  tankContext.rotate((Number(pellet?.rotation) || 0) * 0.35);
  tankContext.globalAlpha = 0.94;
  tankContext.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  tankContext.restore();
}

function drawFallbackChumPiece(x, y, pellet) {
  const scale = clamp(Number(pellet?.scale) || 1, 0.8, 1.35) * getViewportStableAssetScale();

  tankContext.save();
  tankContext.translate(x, y);
  tankContext.rotate(Number(pellet?.rotation) || 0);
  tankContext.globalAlpha = 0.94;

  tankContext.fillStyle = "#791421";
  tankContext.beginPath();
  tankContext.ellipse(0, 0, 8.6 * scale, 5.4 * scale, 0.28, 0, Math.PI * 2);
  tankContext.fill();

  tankContext.fillStyle = "#B34555";
  tankContext.beginPath();
  tankContext.ellipse(-1.6 * scale, -0.4 * scale, 4.2 * scale, 2.5 * scale, -0.25, 0, Math.PI * 2);
  tankContext.fill();

  tankContext.fillStyle = "rgba(255, 207, 214, 0.38)";
  tankContext.beginPath();
  tankContext.ellipse(1.8 * scale, -1.1 * scale, 2.1 * scale, 1.15 * scale, 0.18, 0, Math.PI * 2);
  tankContext.fill();

  tankContext.restore();
}

function drawFoodSpritePiece(x, y, pellet, spritePath) {
  const image = spritePath ? runtime.images.get(spritePath) : null;
  if (!image) {
    return false;
  }

  const stableScale = getViewportStableAssetScale();
  const scale = clamp(Number(pellet?.scale) || 1, 0.8, 1.4) * stableScale;
  const fitScale = Math.min((24 * scale) / Math.max(1, image.width), (24 * scale) / Math.max(1, image.height));
  const drawWidth = Math.max(10 * stableScale, image.width * fitScale);
  const drawHeight = Math.max(10 * stableScale, image.height * fitScale);

  tankContext.save();
  tankContext.translate(x, y);
  tankContext.rotate(Number(pellet?.rotation) || 0);
  tankContext.globalAlpha = 0.96;
  tankContext.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  tankContext.restore();
  return true;
}

function drawPellets(now) {
  if (!state.floatingPellets.length) {
    return;
  }

  tankContext.save();
  for (const pellet of state.floatingPellets) {
    const pose = getPelletPose(pellet, now);
    const x = pose.xNorm * TANK_WIDTH;
    const settledOffset = pellet.settled ? FOOD_PELLET_SETTLED_Y_OFFSET_PX * getViewportStableAssetScale() : 0;
    const y = pose.yNorm * TANK_HEIGHT - settledOffset;

    const appearance = getFoodDropAppearance(pellet.foodKey, pellet);
    if (appearance.dropStyle === "sprite") {
      if (!drawFoodSpritePiece(x, y, pellet, appearance.spritePath)) {
        drawFallbackChumPiece(x, y, pellet);
      }
    } else {
      drawFoodPelletPiece(x, y, pellet, appearance);
    }
  }
  tankContext.restore();
}

function getTankFloorDrawBounds() {
  const left = GLASS_MARGIN_X;
  const right = TANK_WIDTH - GLASS_MARGIN_X;
  const bottom = getVisibleTankFloorBottomY();
  const baseTop = getTankFloorSurfaceYAtX(TANK_WIDTH * 0.5) - 26;
  const floorHeight = Math.max(40, bottom - baseTop);

  return {
    left,
    right,
    bottom,
    baseTop,
    floorHeight,
    drawTop: baseTop - 10,
    drawHeight: floorHeight + 20,
    drawWidth: right - left
  };
}

function getTankFloorMaskSurfaceYAtX(x, bounds = getTankFloorDrawBounds()) {
  const { left, right, baseTop } = bounds;
  const t = clamp((x - left) / Math.max(1, right - left), 0, 1);
  const wave1 = Math.sin(t * Math.PI * 2 * 1.2) * 8;
  const wave2 = Math.sin(t * Math.PI * 2 * 3.4 + 0.8) * 3;
  const crestBias = Math.sin(t * Math.PI) * 4;
  return baseTop + wave1 + wave2 - crestBias;
}

function traceTankFloorMaskPath(context, bounds = getTankFloorDrawBounds()) {
  const { left, right, bottom } = bounds;

  context.beginPath();
  context.moveTo(left, bottom);

  for (let x = left; x <= right; x += 8) {
    context.lineTo(x, getTankFloorMaskSurfaceYAtX(x, bounds));
  }

  context.lineTo(right, bottom);
  context.closePath();
}
