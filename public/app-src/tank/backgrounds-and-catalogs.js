// Source fragment: tank/backgrounds-and-catalogs.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function normalizeHueUnit(value) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }
  return ((Number(value) % 1) + 1) % 1;
}

function getHueDeltaUnit(fromHue, toHue) {
  const from = normalizeHueUnit(fromHue);
  const to = normalizeHueUnit(toHue);
  let delta = to - from;
  if (delta > 0.5) {
    delta -= 1;
  } else if (delta < -0.5) {
    delta += 1;
  }
  return delta;
}

function mixColors(colorA, colorB, amount = 0.5) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA && !rgbB) {
    return DEFAULT_GRAVEL_PALETTE[0];
  }
  if (!rgbA) {
    return normalizeHexColor(colorB) || DEFAULT_GRAVEL_PALETTE[0];
  }
  if (!rgbB) {
    return normalizeHexColor(colorA) || DEFAULT_GRAVEL_PALETTE[0];
  }

  const weight = clamp(amount, 0, 1);
  return rgbToHex({
    r: rgbA.r + (rgbB.r - rgbA.r) * weight,
    g: rgbA.g + (rgbB.g - rgbA.g) * weight,
    b: rgbA.b + (rgbB.b - rgbA.b) * weight
  });
}

function withAlpha(color, alpha) {
  const rgb = hexToRgb(color) || hexToRgb(DEFAULT_GRAVEL_PALETTE[0]);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function colorToCssRgbChannels(color, fallback = DEFAULT_ANIMATED_BACKGROUND_HIGHLIGHT_COLOR) {
  const rgb = hexToRgb(color) || hexToRgb(fallback) || { r: 255, g: 255, b: 255 };
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function getDefaultGravelPalette() {
  return [...DEFAULT_GRAVEL_PALETTE];
}

function getDefaultCustomGravelLayerColors() {
  return [...DEFAULT_CUSTOM_GRAVEL_LAYER_COLORS];
}

function getDefaultCustomGravelLayerColorizeSettings() {
  return Array.from({ length: CUSTOM_GRAVEL_LAYER_COUNT }, () => true);
}

function sanitizeAnimatedBackgroundColors(colors) {
  const source = colors && typeof colors === "object" ? colors : {};
  return {
    surfaceBloom: normalizeHexColor(source.surfaceBloom)
      || normalizeHexColor(source.animatedBackgroundSurfaceBloomColor)
      || DEFAULT_ANIMATED_BACKGROUND_SURFACE_BLOOM_COLOR,
    shadowBloom: normalizeHexColor(source.shadowBloom)
      || normalizeHexColor(source.animatedBackgroundShadowBloomColor)
      || DEFAULT_ANIMATED_BACKGROUND_SHADOW_BLOOM_COLOR,
    surface: normalizeHexColor(source.surface)
      || normalizeHexColor(source.top)
      || normalizeHexColor(source.animatedBackgroundTopColor)
      || DEFAULT_ANIMATED_BACKGROUND_TOP_COLOR,
    mid: normalizeHexColor(source.mid)
      || normalizeHexColor(source.animatedBackgroundMidColor)
      || DEFAULT_ANIMATED_BACKGROUND_MID_COLOR,
    deep: normalizeHexColor(source.deep)
      || normalizeHexColor(source.bottom)
      || normalizeHexColor(source.animatedBackgroundBottomColor)
      || DEFAULT_ANIMATED_BACKGROUND_BOTTOM_COLOR,
    abyss: normalizeHexColor(source.abyss)
      || normalizeHexColor(source.animatedBackgroundAbyssColor)
      || DEFAULT_ANIMATED_BACKGROUND_ABYSS_COLOR,
    highlight: normalizeHexColor(source.highlight)
      || normalizeHexColor(source.animatedBackgroundHighlightColor)
      || DEFAULT_ANIMATED_BACKGROUND_HIGHLIGHT_COLOR,
    driftA: normalizeHexColor(source.driftA)
      || normalizeHexColor(source.animatedBackgroundDriftColorA)
      || DEFAULT_ANIMATED_BACKGROUND_DRIFT_A_COLOR,
    driftB: normalizeHexColor(source.driftB)
      || normalizeHexColor(source.animatedBackgroundDriftColorB)
      || DEFAULT_ANIMATED_BACKGROUND_DRIFT_B_COLOR,
    driftC: normalizeHexColor(source.driftC)
      || normalizeHexColor(source.animatedBackgroundDriftColorC)
      || DEFAULT_ANIMATED_BACKGROUND_DRIFT_C_COLOR
  };
}

function getCatalogDefaultKey(catalog, preferredKey) {
  return catalog.find((item) => item.key === preferredKey)?.key || catalog[0]?.key || null;
}

function getDefaultFilterKey() {
  if (!ENABLE_FILTER) {
    return null;
  }
  return getCatalogDefaultKey(runtime.filterCatalog, DEFAULT_FILTER_ASSET_KEY);
}

function normalizeCustomBackgroundMode(value) {
  if (value === CUSTOM_BACKGROUND_MODE_GRADIENT) {
    return CUSTOM_BACKGROUND_MODE_GRADIENT;
  }
  if (value === CUSTOM_BACKGROUND_MODE_ANIMATED) {
    return CUSTOM_BACKGROUND_MODE_ANIMATED;
  }
  return CUSTOM_BACKGROUND_MODE_SOLID;
}

function getSolidBackgroundColorChoices() {
  const labeledChoices = [];
  const seenColors = new Set();

  for (const choice of CUSTOM_GRAVEL_COLOR_OPTIONS) {
    const normalizedColor = normalizeHexColor(choice.color);
    if (!normalizedColor || seenColors.has(normalizedColor)) {
      continue;
    }
    seenColors.add(normalizedColor);
    labeledChoices.push({
      key: choice.key,
      color: normalizedColor,
      label: choice.label
    });
  }

  GRAVEL_COLOR_SWATCHES.forEach((color, index) => {
    const normalizedColor = normalizeHexColor(color);
    if (!normalizedColor || seenColors.has(normalizedColor)) {
      return;
    }
    seenColors.add(normalizedColor);
    labeledChoices.push({
      key: `gravel-background-color-${index + 1}`,
      color: normalizedColor,
      label: `Background Color ${index + 1}`
    });
  });

  return labeledChoices;
}

function getActiveSolidBackgroundColor(target = getCurrentTank()) {
  return normalizeHexColor(target?.solidBackgroundColor) || DEFAULT_SOLID_BACKGROUND_COLOR;
}

function getActiveGradientBackgroundColors(target = getCurrentTank()) {
  return {
    start: normalizeHexColor(target?.gradientBackgroundStartColor) || DEFAULT_GRADIENT_BACKGROUND_START_COLOR,
    end: normalizeHexColor(target?.gradientBackgroundEndColor) || DEFAULT_GRADIENT_BACKGROUND_END_COLOR
  };
}

function getActiveAnimatedBackgroundColors(target = getCurrentTank()) {
  return sanitizeAnimatedBackgroundColors({
    surfaceBloom: target?.animatedBackgroundSurfaceBloomColor,
    shadowBloom: target?.animatedBackgroundShadowBloomColor,
    top: target?.animatedBackgroundTopColor,
    mid: target?.animatedBackgroundMidColor,
    bottom: target?.animatedBackgroundBottomColor,
    abyss: target?.animatedBackgroundAbyssColor,
    highlight: target?.animatedBackgroundHighlightColor,
    driftA: target?.animatedBackgroundDriftColorA,
    driftB: target?.animatedBackgroundDriftColorB,
    driftC: target?.animatedBackgroundDriftColorC
  });
}

function getActiveAnimatedBackgroundSchemeColor(target = getCurrentTank()) {
  return getActiveAnimatedBackgroundColors(target).surface;
}

function getActiveCustomBackgroundMode(target = getCurrentTank()) {
  return normalizeCustomBackgroundMode(target?.customBackgroundMode);
}

function buildCustomBackgroundPreviewFill(target = getCurrentTank()) {
  const mode = getActiveCustomBackgroundMode(target);
  if (mode === CUSTOM_BACKGROUND_MODE_GRADIENT) {
    const { start, end } = getActiveGradientBackgroundColors(target);
    return `linear-gradient(135deg, ${start}, ${end})`;
  }

  if (mode === CUSTOM_BACKGROUND_MODE_ANIMATED) {
    const { surface, mid, deep, abyss } = getAnimatedBackgroundDerivedPalette(target);
    return `linear-gradient(180deg, ${surface} 0%, ${mid} 38%, ${deep} 70%, ${abyss} 100%)`;
  }

  const color = getActiveSolidBackgroundColor(target);
  return `linear-gradient(180deg, color-mix(in srgb, ${color} 88%, white 12%), ${color})`;
}

function remapAnimatedBackgroundSourceColor(templateColor, schemeColor) {
  const templateRgb = hexToRgb(templateColor);
  const defaultRgb = hexToRgb(DEFAULT_ANIMATED_BACKGROUND_TOP_COLOR);
  const schemeRgb = hexToRgb(schemeColor);
  if (!templateRgb || !defaultRgb || !schemeRgb) {
    return normalizeHexColor(templateColor) || DEFAULT_ANIMATED_BACKGROUND_TOP_COLOR;
  }

  const templateHsl = rgbToHsl(templateRgb);
  const defaultHsl = rgbToHsl(defaultRgb);
  const schemeHsl = rgbToHsl(schemeRgb);
  return rgbToHex(hslToRgb({
    h: normalizeHueUnit(templateHsl.h + getHueDeltaUnit(defaultHsl.h, schemeHsl.h)),
    s: clamp(templateHsl.s + (schemeHsl.s - defaultHsl.s), 0, 1),
    l: clamp(templateHsl.l + (schemeHsl.l - defaultHsl.l), 0, 1)
  }));
}

function getAnimatedBackgroundDerivedPalette(target = getCurrentTank()) {
  const schemeColor = getActiveAnimatedBackgroundSchemeColor(target);
  return {
    surfaceBloom: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.surfaceBloom, schemeColor),
    shadowBloom: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.shadowBloom, schemeColor),
    surface: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.surface, schemeColor),
    mid: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.mid, schemeColor),
    deep: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.deep, schemeColor),
    abyss: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.abyss, schemeColor),
    highlight: ANIMATED_BACKGROUND_SOURCE_PALETTE.highlight,
    driftA: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.driftA, schemeColor),
    driftB: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.driftB, schemeColor),
    driftC: remapAnimatedBackgroundSourceColor(ANIMATED_BACKGROUND_SOURCE_PALETTE.driftC, schemeColor)
  };
}

function getAnimatedBackgroundCssDeclarations(target = getCurrentTank()) {
  const {
    surfaceBloom,
    shadowBloom,
    surface,
    mid,
    deep,
    abyss,
    highlight,
    driftA,
    driftB,
    driftC
  } = getAnimatedBackgroundDerivedPalette(target);
  return [
    `--underwater-surface-bloom-rgb:${colorToCssRgbChannels(surfaceBloom, DEFAULT_ANIMATED_BACKGROUND_SURFACE_BLOOM_COLOR)}`,
    `--underwater-shadow-bloom-rgb:${colorToCssRgbChannels(shadowBloom, DEFAULT_ANIMATED_BACKGROUND_SHADOW_BLOOM_COLOR)}`,
    `--underwater-surface:${surface}`,
    `--underwater-mid:${mid}`,
    `--underwater-deep:${deep}`,
    `--underwater-abyss:${abyss}`,
    `--underwater-highlight-rgb:${colorToCssRgbChannels(highlight, DEFAULT_ANIMATED_BACKGROUND_HIGHLIGHT_COLOR)}`,
    `--underwater-drift-a-rgb:${colorToCssRgbChannels(driftA, DEFAULT_ANIMATED_BACKGROUND_DRIFT_A_COLOR)}`,
    `--underwater-drift-b-rgb:${colorToCssRgbChannels(driftB, DEFAULT_ANIMATED_BACKGROUND_DRIFT_B_COLOR)}`,
    `--underwater-drift-c-rgb:${colorToCssRgbChannels(driftC, DEFAULT_ANIMATED_BACKGROUND_DRIFT_C_COLOR)}`
  ];
}

function getCustomBackgroundPreviewStyle(target = getCurrentTank()) {
  const declarations = [`--background-preview-fill:${buildCustomBackgroundPreviewFill(target)}`];
  if (getActiveCustomBackgroundMode(target) === CUSTOM_BACKGROUND_MODE_ANIMATED) {
    declarations.push(...getAnimatedBackgroundCssDeclarations(target));
  }
  return `${declarations.join(";")};`;
}

function createCustomBackgroundFill(context, left, top, width, height, target = getCurrentTank()) {
  const mode = getActiveCustomBackgroundMode(target);
  if (mode === CUSTOM_BACKGROUND_MODE_GRADIENT) {
    const { start, end } = getActiveGradientBackgroundColors(target);
    const gradient = context.createLinearGradient(left, top, left + width, top + height);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    return gradient;
  }

  if (mode === CUSTOM_BACKGROUND_MODE_ANIMATED) {
    const { surface, mid, deep, abyss } = getAnimatedBackgroundDerivedPalette(target);
    const gradient = context.createLinearGradient(left, top, left, top + height);
    gradient.addColorStop(0, surface);
    gradient.addColorStop(0.38, mid);
    gradient.addColorStop(0.7, deep);
    gradient.addColorStop(1, abyss);
    return gradient;
  }

  return getActiveSolidBackgroundColor(target);
}

function isCustomBackgroundKey(backgroundKey) {
  return backgroundKey === NONE_BACKGROUND_ASSET_KEY;
}

function isLocalImageBackgroundKey(backgroundKey) {
  return backgroundKey === CUSTOM_IMAGE_BACKGROUND_ASSET_KEY;
}

function getLocalBackgroundImageDataUrl(target = getCurrentTank()) {
  const runtimeSource = typeof target?.runtimeLocalBackgroundImageUrl === "string"
    ? target.runtimeLocalBackgroundImageUrl.trim()
    : "";
  if (runtimeSource) {
    return runtimeSource;
  }

  return typeof target?.localBackgroundImageDataUrl === "string"
    ? target.localBackgroundImageDataUrl.trim()
    : "";
}

function hasLocalBackgroundImage(target = getCurrentTank()) {
  return Boolean(getLocalBackgroundImageDataUrl(target) || sanitizeCustomImageRefId(target?.localBackgroundImageRefId));
}

function isCustomBackgroundEnabled(target = getCurrentTank()) {
  return isCustomBackgroundKey(target?.selectedBackground);
}

function isGradientBackgroundEnabled(target = getCurrentTank()) {
  return isCustomBackgroundEnabled(target) && getActiveCustomBackgroundMode(target) === CUSTOM_BACKGROUND_MODE_GRADIENT;
}

function isSolidBackgroundEnabled(target = getCurrentTank()) {
  return isCustomBackgroundEnabled(target) && getActiveCustomBackgroundMode(target) === CUSTOM_BACKGROUND_MODE_SOLID;
}

function isAnimatedBackgroundEnabled(target = getCurrentTank()) {
  return isCustomBackgroundEnabled(target) && getActiveCustomBackgroundMode(target) === CUSTOM_BACKGROUND_MODE_ANIMATED;
}

function isBackgroundOwned(backgroundKey) {
  if (!backgroundKey) {
    return false;
  }
  return Math.max(0, Math.floor(Number(state?.ownedBackgroundInventory?.[backgroundKey]) || 0)) > 0;
}

function getOwnedBackgroundCatalog() {
  const keys = new Set();
  for (const key of DEFAULT_OWNED_BACKGROUND_KEYS) {
    if (runtime.backgroundMap.has(key)) {
      keys.add(key);
    }
  }
  for (const [key, count] of Object.entries(state?.ownedBackgroundInventory || {})) {
    if (count > 0 && runtime.backgroundMap.has(key)) {
      keys.add(key);
    }
  }
  if (runtime.backgroundMap.has(state?.selectedBackground)) {
    keys.add(state.selectedBackground);
  }
  return runtime.backgroundCatalog.filter((item) => keys.has(item.key));
}

function getPreferredImageBackgroundKey() {
  const ownedBackgrounds = getOwnedBackgroundCatalog().filter((item) => (
    !isCustomBackgroundKey(item.key)
    && (!isLocalImageBackgroundKey(item.key) || hasLocalBackgroundImage())
  ));
  return ownedBackgrounds.find((item) => item.key === DEFAULT_BACKGROUND_ASSET_KEY)?.key
    || ownedBackgrounds[0]?.key
    || null;
}

function getFilterAssignmentCount(filterKey, excludingTankId = null) {
  if (!filterKey || filterKey === getDefaultFilterKey()) {
    return 0;
  }

  return getAllTanks().filter((tank) => tank.id !== excludingTankId && tank.selectedFilterAsset === filterKey).length;
}

function getUnusedFilterCount(filterKey) {
  if (!filterKey || filterKey === getDefaultFilterKey()) {
    return 0;
  }

  const ownedCount = Math.max(0, Math.floor(Number(state?.ownedFilterInventory?.[filterKey]) || 0));
  return Math.max(0, ownedCount - getFilterAssignmentCount(filterKey));
}

function getAvailableFilterCount(filterKey, tankId = getCurrentTank()?.id || null) {
  if (!filterKey) {
    return 0;
  }
  if (filterKey === getDefaultFilterKey()) {
    return tankSupportsFilters(getCurrentTank()) ? Number.POSITIVE_INFINITY : 0;
  }

  const ownedCount = Math.max(0, Math.floor(Number(state?.ownedFilterInventory?.[filterKey]) || 0));
  const activeElsewhere = getFilterAssignmentCount(filterKey, tankId);
  return Math.max(0, ownedCount - activeElsewhere);
}

function isFilterOwned(filterKey) {
  if (!filterKey) {
    return false;
  }
  if (filterKey === getDefaultFilterKey()) {
    return true;
  }
  return Math.max(0, Math.floor(Number(state?.ownedFilterInventory?.[filterKey]) || 0)) > 0;
}

function getOwnedFilterCatalog() {
  if (!ENABLE_FILTER) {
    return [];
  }

  const currentTank = getCurrentTank();
  const filterKeys = new Set();
  if (tankSupportsFilters(currentTank)) {
    filterKeys.add(getDefaultFilterKey());
  }
  for (const [key, count] of Object.entries(state?.ownedFilterInventory || {})) {
    if (count > 0) {
      filterKeys.add(key);
    }
  }
  if (currentTank?.selectedFilterAsset) {
    filterKeys.add(currentTank.selectedFilterAsset);
  }

  return runtime.filterCatalog.filter((item) => filterKeys.has(item.key));
}
