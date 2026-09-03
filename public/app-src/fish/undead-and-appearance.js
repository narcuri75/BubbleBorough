// Source fragment: fish/undead-and-appearance.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getUvGlowCachedWidth(width) {
  const sourceWidth = Math.max(1, Math.round(Number(width) || 1));
  return isUvLightLowCostMode()
    ? clamp(sourceWidth, UV_LIGHT_CACHE_LOW_MIN_WIDTH, UV_LIGHT_CACHE_LOW_MAX_WIDTH)
    : clamp(sourceWidth, UV_LIGHT_CACHE_HIGH_MIN_WIDTH, UV_LIGHT_CACHE_HIGH_MAX_WIDTH);
}

function getUvGlowPixel(r, g, b, alpha) {
  if (alpha <= 10) {
    return null;
  }

  const hsl = rgbToHsl({ r, g, b });
  const value = Math.max(r, g, b) / 255;
  if (value <= 0.18) {
    return null;
  }

  const hue = normalizeHueUnit(hsl.h);
  const saturation = clamp(hsl.s, 0, 1);
  const vividness = Math.pow(saturation, 0.82) * Math.pow(value, 0.72);
  const brightNeutral = value > 0.86 && saturation < 0.16
    ? (value - 0.86) * 2.4
    : 0;
  let hueBoost = 0.72;
  let glowHue = hue;
  let glowSaturation = 1;
  let glowLightness = 0.62;

  // Map source pigment families toward the emitted colors they usually suggest under blacklight.
  if (saturation < 0.16) {
    hueBoost = 0.5;
    glowHue = 0.58;
    glowSaturation = 0.72;
    glowLightness = 0.8;
  } else if (hue >= 0.1 && hue < 0.22) {
    hueBoost = 1.42;
    glowHue = 0.29;
    glowLightness = 0.66;
  } else if (hue >= 0.22 && hue < 0.42) {
    hueBoost = 1.34;
    glowHue = clamp(hue, 0.28, 0.38);
    glowLightness = 0.64;
  } else if (hue >= 0.42 && hue < 0.56) {
    hueBoost = 1.22;
    glowHue = 0.5;
    glowLightness = 0.64;
  } else if (hue >= 0.56 && hue < 0.72) {
    hueBoost = 1.02;
    glowHue = 0.58;
    glowLightness = 0.66;
  } else if (hue >= 0.72 && hue < 0.84) {
    hueBoost = 0.98;
    glowHue = 0.76;
    glowLightness = 0.64;
  } else if (hue >= 0.84 && hue < 0.96) {
    hueBoost = 1.28;
    glowHue = 0.88;
    glowLightness = 0.63;
  } else if (hue < 0.06 || hue >= 0.96) {
    hueBoost = 1.04;
    glowHue = 0.94;
    glowLightness = 0.62;
  } else {
    hueBoost = 0.92;
    glowHue = 0.08;
    glowLightness = 0.62;
  }

  const pastelPenalty = saturation < 0.32 ? clamp((saturation - 0.12) / 0.2, 0, 1) : 1;
  const fluorescentScore = saturation < 0.16
    ? brightNeutral
    : Math.max(0, (vividness - 0.14) * 1.52) * pastelPenalty;
  const lowLightPenalty = hsl.l < 0.24 ? 0.45 + hsl.l * 2.3 : 1;
  const intensity = clamp((fluorescentScore + brightNeutral * 0.18) * hueBoost * lowLightPenalty, 0, 1);
  if (intensity <= 0.05) {
    return null;
  }

  const glowRgb = hslToRgb({
    h: glowHue,
    s: glowSaturation,
    l: glowLightness
  });

  return {
    r: glowRgb.r,
    g: glowRgb.g,
    b: glowRgb.b,
    a: clamp(Math.round(alpha * intensity * 1.12), 0, 255),
    intensity
  };
}

function getBiologicalWasteUvGlowPixel(r, g, b, alpha) {
  if (alpha <= 10) {
    return null;
  }

  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const hsl = rgbToHsl({ r, g, b });
  const hue = normalizeHueUnit(hsl.h);
  const isWarmWasteTone = hsl.s >= 0.12 && hue >= 0.04 && hue <= 0.18;
  const intensity = clamp(0.42 + Math.pow(luminance, 0.58) * 0.62 + (isWarmWasteTone ? 0.12 : 0), 0.35, 1);
  const glowRgb = hslToRgb({
    h: isWarmWasteTone ? 0.15 : 0.58,
    s: isWarmWasteTone ? 0.12 : 0.1,
    l: 0.94
  });

  return {
    r: glowRgb.r,
    g: glowRgb.g,
    b: glowRgb.b,
    a: clamp(Math.round(alpha * intensity * 0.98), 0, 255),
    intensity
  };
}

function getUvGlowPixelForProfile(r, g, b, alpha, profile = "default") {
  return profile === "biological-waste"
    ? getBiologicalWasteUvGlowPixel(r, g, b, alpha)
    : getUvGlowPixel(r, g, b, alpha);
}

function getUvGlowMaskImage(sourceImage, profile = "default") {
  if (!sourceImage?.width || !sourceImage?.height) {
    return null;
  }

  const width = Math.max(1, Math.round(Number(sourceImage.naturalWidth || sourceImage.width) || 1));
  const height = Math.max(1, Math.round(Number(sourceImage.naturalHeight || sourceImage.height) || 1));
  const cacheKey = `${getUvGlowSourceKey(sourceImage)}|${profile}|${getUvLightRenderQuality()}|${width}x${height}`;
  if (runtime.uvGlowMaskCache.has(cacheKey)) {
    return runtime.uvGlowMaskCache.get(cacheKey);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(sourceImage, 0, 0, width, height);

  let imageData;
  try {
    imageData = context.getImageData(0, 0, width, height);
  } catch (error) {
    runtime.uvGlowMaskCache.set(cacheKey, null);
    return null;
  }

  const pixels = imageData.data;
  let reactiveWeight = 0;
  let sourceWeight = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha <= 10) {
      pixels[index + 3] = 0;
      continue;
    }

    sourceWeight += alpha / 255;
    const glow = getUvGlowPixelForProfile(pixels[index], pixels[index + 1], pixels[index + 2], alpha, profile);
    if (!glow) {
      pixels[index + 3] = 0;
      continue;
    }

    pixels[index] = glow.r;
    pixels[index + 1] = glow.g;
    pixels[index + 2] = glow.b;
    pixels[index + 3] = glow.a;
    reactiveWeight += glow.intensity * (alpha / 255);
  }

  const coverage = sourceWeight > 0 ? reactiveWeight / sourceWeight : 0;
  if (coverage <= 0.006) {
    runtime.uvGlowMaskCache.set(cacheKey, null);
    return null;
  }

  context.putImageData(imageData, 0, 0);

  const cachedWidth = getUvGlowCachedWidth(width);
  const cachedHeight = Math.max(1, Math.round(cachedWidth * (height / width)));
  const coreCanvas = document.createElement("canvas");
  coreCanvas.width = cachedWidth;
  coreCanvas.height = cachedHeight;
  const coreContext = coreCanvas.getContext("2d");
  if (!coreContext) {
    return null;
  }
  coreContext.drawImage(canvas, 0, 0, cachedWidth, cachedHeight);

  const lowCostMode = isUvLightLowCostMode();
  const result = {
    canvas: coreCanvas,
    coverage,
    tight: lowCostMode ? null : createUvGlowBlurCanvas(coreCanvas, 3, 8),
    soft: createUvGlowBlurCanvas(coreCanvas, lowCostMode ? 8 : 10, lowCostMode ? 18 : 22)
  };
  runtime.uvGlowMaskCache.set(cacheKey, result);
  return result;
}

function createUvGlowBlurCanvas(sourceCanvas, blurPx, paddingPx) {
  if (!sourceCanvas?.width || !sourceCanvas?.height) {
    return null;
  }

  const padding = Math.max(1, Math.round(Number(paddingPx) || 1));
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width + padding * 2;
  canvas.height = sourceCanvas.height + padding * 2;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.filter = `blur(${Math.max(0, Number(blurPx) || 0)}px) saturate(190%)`;
  context.drawImage(sourceCanvas, padding, padding);
  context.filter = "none";
  return {
    canvas,
    padding
  };
}

function drawUvGlowBitmap(context, glowBitmap, drawX, drawY, width, height, alpha) {
  if (!glowBitmap?.canvas || alpha <= 0.01) {
    return;
  }

  const rect = getUvGlowBitmapDrawRect(glowBitmap, drawX, drawY, width, height);
  context.globalAlpha = alpha;
  context.drawImage(glowBitmap.canvas, rect.x, rect.y, rect.width, rect.height);
}

function getUvGlowBitmapDrawRect(glowBitmap, drawX, drawY, width, height) {
  const baseWidth = Math.max(1, glowBitmap.canvas.width - glowBitmap.padding * 2);
  const baseHeight = Math.max(1, glowBitmap.canvas.height - glowBitmap.padding * 2);
  const padX = width * (glowBitmap.padding / baseWidth);
  const padY = height * (glowBitmap.padding / baseHeight);
  return {
    x: drawX - padX,
    y: drawY - padY,
    width: width + padX * 2,
    height: height + padY * 2
  };
}

function drawUvGlowBitmapWithDecorMotion(context, glowBitmap, drawX, drawY, width, height, item, now, motion, alpha) {
  if (!glowBitmap?.canvas || alpha <= 0.01) {
    return;
  }

  const rect = getUvGlowBitmapDrawRect(glowBitmap, drawX, drawY, width, height);
  const offset = getDecorUvGlowWholeOffset(item, now, motion, width);
  context.globalAlpha = alpha;
  context.drawImage(glowBitmap.canvas, rect.x + offset.x, rect.y + offset.y, rect.width, rect.height);
}

function drawUvGlowImageToContext(context, sourceImage, drawX, drawY, width, height, intensity = 1, alpha = 1, profile = "default") {
  if (!isUvLightActive() || !sourceImage || width <= 0 || height <= 0 || alpha <= 0.02) {
    return;
  }

  const glow = getUvGlowMaskImage(sourceImage, profile);
  if (!glow?.canvas) {
    return;
  }

  const strength = clamp((Number(intensity) || 1) * (0.68 + glow.coverage * 2.2), 0.16, 1.35);
  const lowCostMode = isUvLightLowCostMode();

  context.save();
  context.globalCompositeOperation = "screen";
  drawUvGlowBitmap(context, glow.soft, drawX, drawY, width, height, clamp(alpha * strength * (lowCostMode ? 0.5 : 0.46), 0, 0.74));
  if (!lowCostMode) {
    drawUvGlowBitmap(context, glow.tight, drawX, drawY, width, height, clamp(alpha * strength * 0.36, 0, 0.62));
  }
  context.globalAlpha = clamp(alpha * strength * (lowCostMode ? 0.24 : 0.28), 0, lowCostMode ? 0.48 : 0.55);
  context.drawImage(glow.canvas, drawX, drawY, width, height);
  context.restore();
}

function drawUvGlowImageCoverToContext(context, sourceImage, left, top, width, height, intensity = 1, alpha = 1, profile = "default") {
  const rect = getImageCoverDrawRect(sourceImage, left, top, width, height);
  if (!rect) {
    return;
  }

  drawUvGlowImageToContext(context, sourceImage, rect.x, rect.y, rect.width, rect.height, intensity, alpha, profile);
}

function drawUvGlowDecorImageToContext(context, sourceImage, drawX, drawY, width, height, item, now, motion, intensity = 1, alpha = 1) {
  if (!isUvLightActive() || !sourceImage || width <= 0 || height <= 0 || alpha <= 0.02) {
    return;
  }

  const glow = getUvGlowMaskImage(sourceImage);
  if (!glow?.canvas) {
    return;
  }

  const strength = clamp((Number(intensity) || 1) * (0.68 + glow.coverage * 2.2), 0.16, 1.35);
  const hasSway = hasDecorUvSwayMotion(motion);
  const lowCostMode = isUvLightLowCostMode();
  const coreStrength = hasSway ? (lowCostMode ? 0.08 : 0.1) : (lowCostMode ? 0.22 : 0.28);
  const coreMax = hasSway ? (lowCostMode ? 0.16 : 0.2) : (lowCostMode ? 0.44 : 0.55);

  context.save();
  context.globalCompositeOperation = "screen";
  drawUvGlowBitmapWithDecorMotion(context, glow.soft, drawX, drawY, width, height, item, now, motion, clamp(alpha * strength * (lowCostMode ? 0.5 : 0.46), 0, 0.74));
  if (!lowCostMode) {
    drawUvGlowBitmapWithDecorMotion(context, glow.tight, drawX, drawY, width, height, item, now, motion, clamp(alpha * strength * 0.36, 0, 0.62));
  }
  const offset = getDecorUvGlowWholeOffset(item, now, motion, width);
  context.globalAlpha = clamp(alpha * strength * coreStrength, 0, coreMax);
  context.drawImage(glow.canvas, drawX + offset.x, drawY + offset.y, width, height);
  context.restore();
}

function hasDecorUvSwayMotion(motion) {
  if (!motion) {
    return false;
  }

  if (motion.customMotionType) {
    return Boolean(getCustomDecorMotionTypeConfig(motion.customMotionType).hasSway);
  }

  return Boolean(motion.isSeaweed || motion.isLure);
}

function getDecorUvGlowWholeOffset(item, now, motion, width) {
  const resolvedMotion = motion || getDecorMotion(item, now);
  if (!resolvedMotion) {
    return { x: 0, y: 0 };
  }

  if (resolvedMotion.customMotionType) {
    const motionConfig = getCustomDecorMotionTypeConfig(resolvedMotion.customMotionType);
    if (!motionConfig.hasSway) {
      return {
        x: motionConfig.hasBob ? resolvedMotion.bobX : 0,
        y: motionConfig.hasBob ? resolvedMotion.bobY : 0
      };
    }
    const sampleT = normalizeDecorSwaySide(resolvedMotion.customMotionSwaySide) === "below" ? 0.88 : 0.12;
    return normalizeDecorWarpOffset(getCustomDecorMotionOffsetAt(sampleT, now, resolvedMotion, motionConfig, width));
  }

  if (resolvedMotion.isFloating || resolvedMotion.isSeaweed || resolvedMotion.isLure) {
    const sampleT = normalizeDecorSwaySide(resolvedMotion.swaySide) === "below" ? 0.88 : 0.12;
    return normalizeDecorWarpOffset(getDecorSliceOffset(item, now, sampleT, resolvedMotion));
  }

  return { x: 0, y: 0 };
}

function getFishUvGlowIntensity(fish, species) {
  const label = `${species?.id || ""} ${species?.name || ""}`.toLowerCase();
  let intensity = 0.62;
  if (/(neon|rainbow|celestial|blue|ram|killifish|discus|gramma|tang)/.test(label)) {
    intensity = 1;
  } else if (/(guppy|betta|gourami|clown|yellow|cherry|swordtail)/.test(label)) {
    intensity = 0.82;
  } else if (/(sucker|loach|puffer|goldfish)/.test(label)) {
    intensity = 0.52;
  }

  return isFishDead(fish) ? intensity * 0.62 : intensity;
}

function getDecorUvGlowIntensity(item) {
  const key = String(item?.decorKey || "").toLowerCase();
  if (/(ufo|meteor|volcano|treasure|coral|mushroom|seaweed|anubia|lure|castle)/.test(key)) {
    return 1;
  }
  if (/(ship|plane|filter|bubbler)/.test(key)) {
    return 0.68;
  }
  if (/(rock|slate|driftwood|bricks)/.test(key)) {
    return 0.42;
  }
  return 0.58;
}

function drawUvLightAtmosphere(now = Date.now(), layer = "back") {
  if (!UV_LIGHT_ATMOSPHERE_ENABLED || !isUvLightActive()) {
    return;
  }

  const pulse = 0.5 + Math.sin(now / 3400) * 0.5;
  tankContext.save();
  if (layer === "back") {
    tankContext.globalCompositeOperation = "multiply";
    const shade = tankContext.createLinearGradient(0, 0, TANK_WIDTH, TANK_HEIGHT);
    shade.addColorStop(0, "rgba(30, 18, 78, 0.5)");
    shade.addColorStop(0.48, "rgba(8, 10, 42, 0.42)");
    shade.addColorStop(1, "rgba(4, 8, 28, 0.5)");
    tankContext.fillStyle = shade;
    tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);

    tankContext.globalCompositeOperation = "screen";
    const beam = tankContext.createLinearGradient(TANK_WIDTH * 0.1, 0, TANK_WIDTH * 0.9, TANK_HEIGHT);
    beam.addColorStop(0, `rgba(136, 83, 255, ${0.1 + pulse * 0.025})`);
    beam.addColorStop(0.34, "rgba(83, 232, 255, 0.04)");
    beam.addColorStop(0.72, "rgba(153, 80, 255, 0.035)");
    beam.addColorStop(1, "rgba(0, 0, 0, 0)");
    tankContext.fillStyle = beam;
    tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  } else {
    tankContext.globalCompositeOperation = "screen";
    const haze = tankContext.createRadialGradient(
      TANK_WIDTH * 0.5,
      WATER_SURFACE_Y - 20,
      20,
      TANK_WIDTH * 0.5,
      WATER_SURFACE_Y + 90,
      TANK_WIDTH * 0.72
    );
    haze.addColorStop(0, `rgba(177, 106, 255, ${0.08 + pulse * 0.025})`);
    haze.addColorStop(0.46, "rgba(83, 232, 255, 0.035)");
    haze.addColorStop(1, "rgba(0, 0, 0, 0)");
    tankContext.fillStyle = haze;
    tankContext.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  }
  tankContext.restore();
}

function mergeFishBehaviorProfile(baseSpecies, profileSpecies) {
  if (!baseSpecies || !profileSpecies) {
    return baseSpecies || null;
  }

  return {
    ...baseSpecies,
    cycleSeconds: profileSpecies.cycleSeconds,
    bobSpeed: profileSpecies.bobSpeed,
    swimStyle: profileSpecies.swimStyle,
    speedMode: profileSpecies.speedMode,
    speedMin: profileSpecies.speedMin,
    speedMax: profileSpecies.speedMax,
    targetMinMs: profileSpecies.targetMinMs,
    targetMaxMs: profileSpecies.targetMaxMs,
    behavior: profileSpecies.behavior,
    diet: profileSpecies.diet,
    cleanupMinMs: profileSpecies.cleanupMinMs,
    cleanupMaxMs: profileSpecies.cleanupMaxMs,
    cleanupStrength: profileSpecies.cleanupStrength,
    poopCleanupChance: profileSpecies.poopCleanupChance,
    shadowScale: profileSpecies.shadowScale,
    caveEnabled: profileSpecies.caveEnabled,
    behaviorProfileSpeciesId: profileSpecies.id,
    behaviorProfileName: profileSpecies.name
  };
}

function getSpeciesForFish(fish) {
  const baseSpecies = getBaseSpeciesForFish(fish);
  return mergeFishBehaviorProfile(baseSpecies, getFishBehaviorProfileSpecies(fish));
}

function isCatalogUndeadShopSpecies(species) {
  return Boolean(isZombieSkeletonModeAvailable() && isZombieSkeletonCatalogSpecies(species));
}

function getUndeadTemplateStageForSpecies(species) {
  return isCatalogUndeadShopSpecies(species) ? species.undeadType : null;
}

function getUndeadTemplateFishSpeciesCandidates(stage) {
  if (!["zombie", "skeleton"].includes(stage)) {
    return [];
  }

  return runtime.fishCatalog.filter((entry) => (
    entry
    && !isUndeadSpecies(entry)
    && getFishDeathAssetCandidates(entry, stage).some((path) => runtime.images.has(path))
  ));
}

function pickRandomUndeadTemplateSpeciesId(stage, candidates = getUndeadTemplateFishSpeciesCandidates(stage)) {
  const pool = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!pool.length) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)]?.id || null;
}

function getStoredFishUndeadTemplateSpecies(fish, species = getSpeciesForFish(fish)) {
  const stage = getUndeadTemplateStageForSpecies(species);
  if (!stage) {
    return null;
  }

  const templateSpeciesId = typeof fish?.undeadTemplateSpeciesId === "string"
    ? fish.undeadTemplateSpeciesId.trim()
    : "";
  const templateSpecies = templateSpeciesId ? runtime.fishMap.get(templateSpeciesId) : null;
  if (!templateSpecies || isUndeadSpecies(templateSpecies)) {
    return null;
  }

  if (!runtime.images.size) {
    return templateSpecies;
  }

  return getFishDeathAssetCandidates(templateSpecies, stage).some((path) => runtime.images.has(path))
    ? templateSpecies
    : null;
}

function getStableUndeadTemplateSpecies(
  fish,
  species = getSpeciesForFish(fish),
  candidates = getUndeadTemplateFishSpeciesCandidates(getUndeadTemplateStageForSpecies(species))
) {
  const stage = getUndeadTemplateStageForSpecies(species);
  const pool = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!stage || !pool.length) {
    return null;
  }

  const seed = hashStringToUint32(`${fish?.id || ""}|${fish?.speciesId || ""}|undead-template|${stage}`);
  return pool[seed % pool.length] || pool[0] || null;
}

function getFishUndeadTemplateSpecies(fish, species = getSpeciesForFish(fish)) {
  const storedSpecies = getStoredFishUndeadTemplateSpecies(fish, species);
  if (storedSpecies) {
    return storedSpecies;
  }

  return getStableUndeadTemplateSpecies(fish, species);
}

function getFishDisplaySourceSpecies(fish, species = getSpeciesForFish(fish)) {
  return getFishUndeadTemplateSpecies(fish, species) || species || null;
}

function getFishDisplayScaleForSpecies(species = null) {
  return getViewportStableObjectScale("fish") * getAquariumPhysicalAssetScale("fish");
}

function getFishLayerDepthScaleForLayer(layer) {
  return 1 + Math.max(0, TANK_DEPTH_LAYERS - clampTankLayer(layer)) * FISH_LAYER_DEPTH_SCALE_STEP;
}

function getFishLayerDepthScaleMultiplier(fish, now = Date.now()) {
  if (!fish) {
    return 1;
  }

  const targetScale = getFishLayerDepthScaleForLayer(getFishTankLayer(fish));
  const transition = fish.id ? runtime.fishLayerDepthScaleTransitions.get(fish.id) : null;
  if (!transition) {
    return targetScale;
  }

  const progress = clamp((now - transition.startedAt) / Math.max(1, transition.durationMs), 0, 1);
  if (progress >= 1 || Math.abs(targetScale - transition.toScale) > 0.0001) {
    runtime.fishLayerDepthScaleTransitions.delete(fish.id);
    return targetScale;
  }

  const eased = 1 - Math.pow(1 - progress, 3);
  return transition.fromScale + (transition.toScale - transition.fromScale) * eased;
}

function getSuckerFishFrontGlassAssetPath(species) {
  const assetPath = SUCKER_FISH_FRONT_GLASS_ASSET_BY_SPECIES[species?.id || ""];
  return assetPath ? resolveAppUrl(assetPath) : null;
}

function getFishDisplayWidth(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const widthSpecies = getFishDisplaySourceSpecies(fish, species) || species;
  if (!widthSpecies) {
    return (runtime.fishSizeRange?.min || FISH_CATALOG_WIDTH_MIN)
      * getFishDisplayScaleForSpecies()
      * getFishLayerDepthScaleMultiplier(fish, now)
      * getMobileViewportObjectScaleMultiplier("fish");
  }

  return widthSpecies.width
    * getFishEffectiveScale(fish, species, now)
    * getFishDisplayScaleForSpecies(widthSpecies)
    * getFishLayerDepthScaleMultiplier(fish, now)
    * getMobileViewportObjectScaleMultiplier("fish");
}

function getFishAppearanceVariantSeed(fish, species = getSpeciesForFish(fish)) {
  const key = `${fish?.id || ""}|${fish?.name || ""}|${species?.id || ""}`;
  return hashStringToUint32(key);
}

function hashStringToUint32(key = "") {
  let hash = 0;
  for (const character of String(key || "")) {
    hash = ((hash * 33) + character.charCodeAt(0)) >>> 0;
  }
  return hash >>> 0;
}

function normalizeFishAppearanceVariantIndex(value, species, fallbackFish = null) {
  const variants = getFishAssetVariants(species);
  if (variants.length <= 1) {
    return 0;
  }

  const fallbackIndex = fallbackFish
    ? getFishAppearanceVariantSeed(fallbackFish, species) % variants.length
    : 0;
  const rawIndex = Number.isFinite(Number(value))
    ? Math.floor(Number(value))
    : fallbackIndex;
  return ((rawIndex % variants.length) + variants.length) % variants.length;
}

function getFishAssetPath(fish, species = getSpeciesForFish(fish)) {
  const variants = getFishAssetVariants(species);
  if (!variants.length) {
    return species?.asset || species?.fallbackAsset || null;
  }

  return variants[normalizeFishAppearanceVariantIndex(fish?.appearanceVariant, species, fish)] || variants[0] || species?.fallbackAsset || species?.asset || null;
}

function appendAssetSuffix(path, suffix) {
  if (typeof path !== "string" || !path.trim() || typeof suffix !== "string" || !suffix.trim()) {
    return null;
  }

  const trimmed = path.trim();
  const queryIndex = trimmed.indexOf("?");
  const basePath = queryIndex === -1 ? trimmed : trimmed.slice(0, queryIndex);
  const suffixQuery = queryIndex === -1 ? "" : trimmed.slice(queryIndex);
  if (!/\.[^./\\]+$/.test(basePath)) {
    return null;
  }

  return `${basePath.replace(/(\.[^./\\]+)$/, `${suffix}$1`)}${suffixQuery}`;
}

function deriveFishStageAssetFile(assetFile, stage) {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  if (typeof assetFile !== "string" || !assetFile.trim() || !["zombie", "skeleton"].includes(normalizedStage)) {
    return null;
  }

  const trimmed = assetFile.trim();
  const queryIndex = trimmed.indexOf("?");
  const basePath = queryIndex === -1 ? trimmed : trimmed.slice(0, queryIndex);
  const suffixQuery = queryIndex === -1 ? "" : trimmed.slice(queryIndex);
  const match = basePath.match(/^(.*?)(?:_(zombie|skeleton))?(\.[^./\\]+)$/i);
  if (!match) {
    return appendAssetSuffix(trimmed, `_${normalizedStage}`);
  }

  const [, stem, , extension] = match;
  return `${stem}_${normalizedStage}${extension}${suffixQuery}`;
}

function getFishDeathAssetCandidates(species, stage) {
  if (!ZOMBIE_SKELETON_BEHAVIOR_ENABLED || !species || !isZombieSkeletonStage(stage)) {
    return [];
  }

  const explicitCandidates = stage === "zombie"
    ? species.zombieAssetVariants
    : species.skeletonAssetVariants;

  return Array.isArray(explicitCandidates)
    ? explicitCandidates.filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index)
    : [];
}

function getBorrowedFishDeathAssetPool(stage, species = null) {
  const excludedPaths = new Set(getFishDeathAssetCandidates(species, stage));
  return runtime.fishCatalog
    .flatMap((entry) => getFishDeathAssetCandidates(entry, stage))
    .filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index && !excludedPaths.has(path));
}

function getStableBorrowedFishDeathAssetPath(fish, stage, pool = []) {
  const candidates = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!candidates.length) {
    return null;
  }

  const seed = hashStringToUint32(`${fish?.id || ""}|${fish?.speciesId || ""}|${stage}`);
  return candidates[seed % candidates.length] || candidates[0] || null;
}

function getFishDeathAssetPath(fish, species = getSpeciesForFish(fish), stage) {
  if (!species || !["zombie", "skeleton"].includes(stage)) {
    return null;
  }

  const ownCandidates = getFishDeathAssetCandidates(species, stage);
  const ownLoadedCandidate = ownCandidates.find((path) => runtime.images.has(path));
  if (ownLoadedCandidate) {
    return ownLoadedCandidate;
  }

  const borrowedPool = getBorrowedFishDeathAssetPool(stage, species);
  const loadedBorrowedPool = borrowedPool.filter((path) => runtime.images.has(path));
  const borrowedCandidate = getStableBorrowedFishDeathAssetPath(
    fish,
    stage,
    loadedBorrowedPool.length ? loadedBorrowedPool : borrowedPool
  );
  if (borrowedCandidate) {
    return borrowedCandidate;
  }

  return ownCandidates[0] || null;
}

function getFishZombieVariantAssetPath(fish, species = getSpeciesForFish(fish)) {
  return getFishDeathAssetPath(fish, species, "zombie")
    || getFishAssetPath(fish, species)
    || species?.fallbackAsset
    || species?.asset
    || null;
}

function getFishDecayStage(fish, now = Date.now()) {
  if (!isFishDead(fish)) {
    return null;
  }

  if (!isGoreEnabled() || !isZombieSkeletonModeAvailable()) {
    return null;
  }

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    const elapsed = Math.max(0, now - Number(fish.piranhaConsumptionStartedAt || now));
    if (elapsed >= PIRANHA_CONSUMPTION_SKELETON_MS) {
      return "skeleton";
    }
    if (elapsed >= PIRANHA_CONSUMPTION_ZOMBIE_MS) {
      return "zombie";
    }
    return "fresh";
  }

  const deadAt = Number.isFinite(Number(fish?.deadAt)) ? Number(fish.deadAt) : now;
  const elapsed = Math.max(0, now - deadAt);
  if (elapsed >= FISH_DECAY_SKELETON_MS) {
    return "skeleton";
  }
  if (elapsed >= FISH_DECAY_ZOMBIE_MS) {
    return "zombie";
  }
  return "fresh";
}

function getFishDisplayAssetPath(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!species) {
    return null;
  }

  const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
  const frontGlassAsset = !isFishDead(fish) && isFrontGlassSuckerFish(fish, species)
    ? (getSuckerFishFrontGlassAssetPath(displaySpecies) || getSuckerFishFrontGlassAssetPath(species))
    : null;
  const seasonalAsset = getFishSeasonalAssetPath(fish, displaySpecies, now);
  const undeadBaseStage = isZombieSkeletonModeAvailable() && isViolenceAndGoreEnabled() ? getUndeadTemplateStageForSpecies(species) : null;
  const preferredBaseAsset = seasonalAsset || (isZombieVariantFish(fish)
    ? getFishZombieVariantAssetPath(fish, displaySpecies)
    : undeadBaseStage
      ? (
        getFishDeathAssetPath(fish, displaySpecies, undeadBaseStage)
        || getFishAssetPath(fish, displaySpecies)
        || displaySpecies.asset
        || displaySpecies.fallbackAsset
        || species.asset
        || species.fallbackAsset
        || null
      )
      : (frontGlassAsset || getFishAssetPath(fish, displaySpecies) || displaySpecies.asset || displaySpecies.fallbackAsset || species.asset || species.fallbackAsset || null));
  const baseAsset = [
    preferredBaseAsset,
    displaySpecies.fallbackAsset,
    displaySpecies.asset,
    species.fallbackAsset,
    species.asset
  ].find((path) => path && runtime.images.has(path)) || preferredBaseAsset;
  const stage = isGoreEnabled() ? getFishDecayStage(fish, now) : null;
  if (
    !stage
    || stage === "fresh"
    || (stage === "zombie" && isZombieVariantFish(fish))
    || (undeadBaseStage && stage === undeadBaseStage)
  ) {
    return baseAsset;
  }

  return getFishDeathAssetPath(fish, displaySpecies, stage) || baseAsset;
}

function getFishCatalogAssetPath(species) {
  if (!species) {
    return null;
  }

  return [
    ...getFishAssetVariants(species),
    species.fallbackAsset,
    species.asset
  ].find((path) => path && runtime.images.has(path)) || species.asset || species.fallbackAsset || null;
}

function getFishCorpseDisplayState(fish, now = Date.now()) {
  if (!isFishDead(fish)) {
    return null;
  }

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    return "devoured";
  }

  if (!isGoreEnabled()) {
    return "deceased";
  }

  return getFishDecayStage(fish, now) || "fresh";
}

function getFishCorpseStateLabel(fish, now = Date.now()) {
  const stateLabel = getFishCorpseDisplayState(fish, now);
  if (stateLabel === "devoured") {
    return "Being devoured";
  }
  if (hasPendingZombieRevival(fish)) {
    return "Turning into a zombie";
  }
  if (stateLabel === "deceased") {
    return "Deceased";
  }
  if (stateLabel === "skeleton") {
    return "Skeleton remains";
  }
  if (stateLabel === "zombie") {
    return "Decaying corpse";
  }
  if (stateLabel === "fresh") {
    return "Fresh corpse";
  }
  return "Deceased";
}

function getFishAdultScale(fish, species = getSpeciesForFish(fish)) {
  if (!fish) {
    return DEFAULT_FISH_SCALE;
  }

  const speciesId = fish.speciesId || species?.id;
  const baseScale = Number.isFinite(Number(fish.scale))
    ? Number(fish.scale)
    : getFishScaleDefault(speciesId);
  return clamp(baseScale, FISH_SCALE_MIN, FISH_SCALE_MAX);
}

function getFishGrowthProgress(fish, now = Date.now()) {
  if (
    !fish
    || !Number.isFinite(Number(fish.growthStartedAt))
    || !Number.isFinite(Number(fish.growthEndsAt))
    || Number(fish.growthEndsAt) <= Number(fish.growthStartedAt)
  ) {
    return 1;
  }

  return clamp(
    (now - Number(fish.growthStartedAt)) / Math.max(1, Number(fish.growthEndsAt) - Number(fish.growthStartedAt)),
    0,
    1
  );
}

function getFishGrowthScaleMultiplier(fish, now = Date.now()) {
  const progress = getFishGrowthProgress(fish, now);
  return BABY_FISH_SCALE_MULTIPLIER + (1 - BABY_FISH_SCALE_MULTIPLIER) * progress;
}

function getFishEffectiveScale(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  return getFishAdultScale(fish, species) * getFishGrowthScaleMultiplier(fish, now);
}

function isFishJuvenile(fish, now = Date.now()) {
  return getFishGrowthProgress(fish, now) < 1;
}

function isFishAdult(fish, now = Date.now()) {
  return !isFishJuvenile(fish, now);
}

function hasFishBeenInTankLongEnoughToBreed(fish, now = Date.now()) {
  return Number.isFinite(Number(fish?.tankAddedAt))
    && now - Number(fish.tankAddedAt) >= BREEDING_MIN_TANK_TIME_MS;
}

function isDetritusFish(target) {
  if (target?.speciesId && isUndeadFish(target)) {
    return false;
  }
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return species?.diet === "detritus";
}

function isBrineShrimpSpecies(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return species?.id === "brine-shrimp" || species?.behavior === "shrimp";
}

function isMealFreeFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  if (
    isPiranhaSpecies(target)
    || isZombieFish(target)
    || (isZombieSkeletonModeAvailable() && (species?.id === "zombie-fish" || target?.speciesId === "zombie-fish"))
  ) {
    return false;
  }
  if (isZombieVariantFish(target)) {
    return false;
  }
  return species?.diet === "detritus" || species?.diet === "none";
}

function isZombieVariantFish(target) {
  return Boolean(target?.speciesId && target.zombieVariant && isZombieSkeletonModeAvailable() && isGoreEnabled());
}

function isZombieFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return Boolean(isZombieVariantFish(target) || (isZombieModeEnabled() && species?.undeadType === "zombie"));
}

function isSkeletonFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return Boolean(isZombieModeEnabled() && species?.undeadType === "skeleton");
}

function isUndeadSpecies(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return Boolean(isZombieSkeletonUndeadType(species?.undeadType));
}

function isUndeadFish(target) {
  return isZombieFish(target) || isSkeletonFish(target);
}

function hasDefinedFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function hasZombieBiteInfection(fish) {
  return Boolean(
    fish
    && !isFishDead(fish)
    && hasDefinedFiniteNumber(fish.zombieBiteStartedAt)
  );
}

function hasPendingZombieRevival(fish) {
  return Boolean(
    fish
    && isFishDead(fish)
    && hasDefinedFiniteNumber(fish.zombieReviveAt)
  );
}

function usesZombieHunterBehavior(target) {
  return usesZombieSkeletonHunterBehavior({
    enabled: isZombieModeEnabled(),
    target,
    isZombieFish
  });
}

function getEffectiveFishBehavior(target) {
  const fish = target?.speciesId ? target : null;
  const species = fish ? getSpeciesForFish(fish) : target;
  if (!species) {
    return null;
  }

  const zombieSkeletonBehavior = getZombieSkeletonEffectiveBehavior({
    enabled: isZombieModeEnabled(),
    fish,
    species,
    isZombieVariantFish
  });
  if (zombieSkeletonBehavior) {
    return zombieSkeletonBehavior;
  }
  return species.behavior || "steady";
}

function getFishDisplaySpeciesName(fish, species = getSpeciesForFish(fish)) {
  if (!species) {
    return "Fish";
  }

  const displaySpecies = getFishDisplaySourceSpecies(fish, species);
  if (isZombieVariantFish(fish)) {
    return `Zombie ${displaySpecies?.name || species.name}`;
  }
  if (isCatalogUndeadShopSpecies(species) && displaySpecies && displaySpecies.id !== species.id) {
    if (!isViolenceAndGoreEnabled()) {
      return displaySpecies.name;
    }
    return `${species.undeadType === "skeleton" ? "Skeleton" : "Zombie"} ${displaySpecies.name}`;
  }
  return species.name;
}

function getFishInspectorSpeciesLabel(fish, species = getSpeciesForFish(fish)) {
  const label = getFishDisplaySpeciesName(fish, species);
  return species?.caveEnabled === true ? `${label} (cave)` : label;
}

function isPiranhaSpecies(target) {
  if (target?.speciesId && isUndeadFish(target)) {
    return false;
  }
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return species?.behavior === "piranha";
}

function fishNeedsMealWindow(target) {
  return !isMealFreeFish(target);
}

function getMealHistoryEntry(slotKey, tank = getCurrentTank()) {
  if (!slotKey) {
    return null;
  }

  const entry = state.mealHistory?.[slotKey];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return entry;
}

function getMealFedFishIds(slotKey, tank = getCurrentTank()) {
  const entry = getMealHistoryEntry(slotKey, tank);
  return new Set(Array.isArray(entry?.fishIds) ? entry.fishIds : []);
}

function getMealEligibleFishForSlot(slot, tank = getCurrentTank()) {
  if (!slot || !tank) {
    return [];
  }

  const currentSlotKey = getCurrentMealSlot(Date.now()).key;
  return tank.fish.filter((fish) => (
    fish
    && !isFishDead(fish)
    && fishNeedsMealWindow(fish)
    && (slot.key === currentSlotKey || fish.acquiredAt <= slot.start)
  ));
}

function isMealSlotServed(slot, tank = getCurrentTank()) {
  const eligibleFish = getMealEligibleFishForSlot(slot, tank);
  if (!eligibleFish.length) {
    return false;
  }

  const fedIds = getMealFedFishIds(slot.key, tank);
  return eligibleFish.every((fish) => fedIds.has(fish.id));
}

function normalizeHexColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return null;
}

function hexToRgb(color) {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);
  let hue;
  switch (max) {
    case red:
      hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
      break;
    case green:
      hue = ((blue - red) / delta + 2) / 6;
      break;
    default:
      hue = ((red - green) / delta + 4) / 6;
      break;
  }

  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }) {
  const hue = ((h % 1) + 1) % 1;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  if (saturation === 0) {
    const channel = Math.round(lightness * 255);
    return { r: channel, g: channel, b: channel };
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const hueToChannel = (offset) => {
    let t = hue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return {
    r: Math.round(hueToChannel(1 / 3) * 255),
    g: Math.round(hueToChannel(0) * 255),
    b: Math.round(hueToChannel(-1 / 3) * 255)
  };
}
