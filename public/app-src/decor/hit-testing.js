// Source fragment: decor/hit-testing.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function isFreeDecorPlacementEnabled(targetTank = getCurrentTank()) {
  return targetTank?.freeDecorPlacement === true;
}

function isDecorExemptFromGravity(decorOrKey) {
  const capabilities = getDecorMotionCapabilities(decorOrKey);
  return Boolean(capabilities.isFloating || capabilities.isLure);
}

function shouldApplyDecorPlacementGravity(decorKey, options = {}) {
  return options.applyGravity === true
    && !isFreeDecorPlacementEnabled(options.tank || getCurrentTank())
    && !isDecorExemptFromGravity(options.item || decorKey);
}

function clampDecorPlacement(xNorm, yNorm, options = {}) {
  const shellBounds = getTankShellBounds();
  const minXNorm = shellBounds.innerLeft / TANK_WIDTH;
  const maxXNorm = (shellBounds.innerLeft + shellBounds.innerWidth) / TANK_WIDTH;
  const minYNorm = shellBounds.innerTop / TANK_HEIGHT;
  const maxYNorm = (shellBounds.innerTop + shellBounds.innerHeight) / TANK_HEIGHT;
  const normalizedX = clamp(Number.isFinite(Number(xNorm)) ? Number(xNorm) : 0.5, 0, 1);
  const normalizedY = clamp(Number.isFinite(Number(yNorm)) ? Number(yNorm) : 0.8, 0, 1);
  const decorKey = options.item?.decorKey || options.decorKey || runtime.placementMode?.decorKey || null;
  const resolvedLayer = decorKey
    ? getDecorFrontLayer(
      decorKey,
      options.item?.tankLayer
      ?? options.tankLayer
      ?? runtime.placementMode?.tankLayer
      ?? runtime.decorPlacementLayer
      ?? DEFAULT_TANK_LAYER
    )
    : DEFAULT_TANK_LAYER;
  const layerBoundaryY = getTankLayerBottomBoundaryY(resolvedLayer);
  const layerBoundaryYNorm = layerBoundaryY / TANK_HEIGHT;
  const effectiveMaxYNorm = Math.max(minYNorm, Math.min(maxYNorm, layerBoundaryYNorm));
  const applyGravity = shouldApplyDecorPlacementGravity(decorKey, options);

  if (!decorKey) {
    const constrained = constrainNormalizedPointToTankShell(
      clamp(normalizedX, minXNorm, maxXNorm),
      applyGravity ? effectiveMaxYNorm : clamp(normalizedY, minYNorm, effectiveMaxYNorm)
    );
    return {
      xNorm: clamp(constrained.xNorm, minXNorm, maxXNorm),
      yNorm: clamp(constrained.yNorm, minYNorm, effectiveMaxYNorm)
    };
  }

  const resolvedScale = clamp(
    Number.isFinite(Number(options.item?.scale))
      ? Number(options.item.scale)
      : Number.isFinite(Number(options.scale))
        ? Number(options.scale)
        : Number.isFinite(Number(runtime.placementMode?.scale))
          ? Number(runtime.placementMode.scale)
          : getDecorScaleDefault(decorKey),
    DECOR_SCALE_MIN,
    DECOR_SCALE_MAX
  );
  const resolvedFlipped = options.item && Object.prototype.hasOwnProperty.call(options.item, "flipped")
    ? Boolean(options.item.flipped)
    : (Object.prototype.hasOwnProperty.call(options, "flipped")
      ? Boolean(options.flipped)
      : Boolean(runtime.placementMode?.flipped));
  const candidate = {
    ...(options.item || {}),
    decorKey,
    scale: resolvedScale,
    flipped: resolvedFlipped,
    tankLayer: resolvedLayer,
    xNorm: normalizedX,
    yNorm: normalizedY
  };
  const placementBounds = getPlacedDecorPlacementBounds(candidate);
  if (!placementBounds) {
    const constrained = constrainNormalizedPointToTankShell(
      clamp(normalizedX, minXNorm, maxXNorm),
      clamp(normalizedY, minYNorm, effectiveMaxYNorm)
    );
    return {
      xNorm: clamp(constrained.xNorm, minXNorm, maxXNorm),
      yNorm: clamp(constrained.yNorm, minYNorm, effectiveMaxYNorm)
    };
  }

  const anchorX = normalizedX * TANK_WIDTH;
  const anchorY = normalizedY * TANK_HEIGHT;
  const relLeft = placementBounds.left - anchorX;
  const relRight = placementBounds.right - anchorX;
  const relTop = placementBounds.top - anchorY;
  const relBottom = placementBounds.bottom - anchorY;
  const relBounds = { left: relLeft, right: relRight, top: relTop, bottom: relBottom };
  const minAnchorX = shellBounds.innerLeft - relLeft;
  const maxAnchorX = shellBounds.innerLeft + shellBounds.innerWidth - relRight;
  const minAnchorY = getDecorTopOverhangLimitY(relBounds, shellBounds) - relTop;
  const maxAnchorY = Math.min(
    shellBounds.innerTop + shellBounds.innerHeight - relBottom,
    layerBoundaryY - relBottom
  );
  const clampedX = minAnchorX <= maxAnchorX
    ? clamp(anchorX, minAnchorX, maxAnchorX)
    : (minAnchorX + maxAnchorX) / 2;
  const clampedY = minAnchorY <= maxAnchorY
    ? (applyGravity ? maxAnchorY : clamp(anchorY, minAnchorY, maxAnchorY))
    : maxAnchorY;

  const constrained = constrainNormalizedPointToTankShell(
    clamp(clampedX / TANK_WIDTH, minXNorm, maxXNorm),
    clamp(clampedY / TANK_HEIGHT, minYNorm, maxYNorm)
  );
  return {
    xNorm: clamp(constrained.xNorm, minXNorm, maxXNorm),
    yNorm: clamp(clampedY / TANK_HEIGHT, minYNorm, maxYNorm)
  };
}

function findPlacedDecorAtPoint(x, y) {
  const sorted = [...state.placedDecor].sort(comparePlacedDecorHitOrder);
  for (const item of sorted) {
    if (isCustomBubblerDecorKey(item.decorKey)) {
      const hitBounds = getCustomBubblerHitBounds(item);
      if (pointInSimpleBounds(x, y, hitBounds)) {
        return item;
      }
    }

    const descriptor = getDecorShapeDescriptor(item);
    if (descriptor && pointHitsShapeDescriptor(descriptor, x, y)) {
      return item;
    }
  }

  return null;
}

function getCustomBubblerHitBounds(item) {
  if (!item || !isCustomBubblerDecorKey(item.decorKey)) {
    return null;
  }

  return expandBoundsAroundCenter(getPlacedDecorBounds(item), CUSTOM_BUBBLER_HIT_SCALE);
}

function getPlacedDecorBounds(item) {
  const decor = runtime.decorMap.get(item.decorKey);
  if (!decor) {
    return null;
  }

  const image = runtime.images.get(decor.path);
  const width = getDecorDisplayWidth(decor, item);
  const height = width * (image ? image.height / image.width : 1);
  const x = item.xNorm * TANK_WIDTH;
  const y = item.yNorm * TANK_HEIGHT;

  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height,
    bottom: y
  };
}

function getDecorVisibleImagePaths(decor) {
  if (!decor) {
    return [];
  }

  return [...new Set([
    decor.bgPath,
    decor.path,
    decor.midPath
  ].filter(Boolean))];
}

function getPlacedDecorOpaqueBoundsForImagePath(item, decor, imagePath) {
  const image = runtime.images.get(imagePath);
  const mask = getImageAlphaMask(imagePath);
  if (!image || !mask) {
    return null;
  }

  const width = getDecorDisplayWidth(decor, item);
  const height = width * (image.height / image.width);
  const x = item.xNorm * TANK_WIDTH;
  const y = item.yNorm * TANK_HEIGHT;
  const left = x - width / 2;
  const top = y - height;
  const minU = mask.bounds.minX / image.width;
  const maxU = (mask.bounds.maxX + 1) / image.width;
  const mappedMinU = resolveDecorHorizontalUnit(item, minU);
  const mappedMaxU = resolveDecorHorizontalUnit(item, maxU);

  return {
    left: left + Math.min(mappedMinU, mappedMaxU) * width,
    right: left + Math.max(mappedMinU, mappedMaxU) * width,
    top: top + (mask.bounds.minY / image.height) * height,
    bottom: top + ((mask.bounds.maxY + 1) / image.height) * height
  };
}

function getPlacedDecorOpaqueBounds(item, imagePathOverride = null) {
  const decor = runtime.decorMap.get(item?.decorKey);
  if (!decor) {
    return null;
  }

  const imagePaths = imagePathOverride
    ? [imagePathOverride]
    : getDecorVisibleImagePaths(decor);
  if (!imagePaths.length) {
    return getPlacedDecorBounds(item);
  }

  let mergedBounds = null;
  for (const imagePath of imagePaths) {
    const bounds = getPlacedDecorOpaqueBoundsForImagePath(item, decor, imagePath);
    if (!bounds) {
      continue;
    }

    if (!mergedBounds) {
      mergedBounds = { ...bounds };
      continue;
    }

    mergedBounds.left = Math.min(mergedBounds.left, bounds.left);
    mergedBounds.right = Math.max(mergedBounds.right, bounds.right);
    mergedBounds.top = Math.min(mergedBounds.top, bounds.top);
    mergedBounds.bottom = Math.max(mergedBounds.bottom, bounds.bottom);
  }

  return mergedBounds || getPlacedDecorBounds(item);
}

function getDecorShapeDescriptor(item, imagePathOverride = null) {
  const decor = runtime.decorMap.get(item?.decorKey);
  if (!decor) {
    return null;
  }

  const imagePath = imagePathOverride || decor.path;
  const image = runtime.images.get(imagePath);
  const mask = getImageAlphaMask(imagePath);
  if (!image || !mask) {
    return null;
  }

  return createDecorShapeDescriptorFromMask(item, decor, imagePath, mask);
}
