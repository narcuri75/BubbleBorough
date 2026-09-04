// Source fragment: rendering/fish-and-effects.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function drawPoops(now, layer = null) {
  const targetLayer = Number.isFinite(Number(layer)) ? clampTankLayer(layer) : null;
  for (const poop of state.poops) {
    if (targetLayer !== null && getPoopTankLayer(poop) !== targetLayer) {
      continue;
    }

    const pose = getPoopPose(poop, now);
    if (!pose?.sprite) {
      continue;
    }

    tankContext.save();
    tankContext.translate(pose.x, pose.y + 4);
    tankContext.rotate(pose.wobble);
    drawPoopUvGlowToContext(tankContext, pose, now);
    tankContext.globalAlpha = 0.9;
    tankContext.drawImage(pose.sprite, -pose.width / 2, -pose.height * 0.88, pose.width, pose.height);
    tankContext.restore();
  }
}

function getFishEggTankLayer(egg) {
  return Number.isFinite(Number(egg?.tankLayer))
    ? clampTankLayer(egg.tankLayer)
    : DEFAULT_TANK_LAYER;
}

function getFishEggIncubationProgress(egg, now = Date.now()) {
  if (egg?.hatchedAt) {
    return 1;
  }

  const createdAt = Number.isFinite(Number(egg?.createdAt)) ? Number(egg.createdAt) : now;
  const hatchAt = Number.isFinite(Number(egg?.hatchAt)) ? Number(egg.hatchAt) : createdAt + FISH_EGG_INCUBATION_MS;
  return clamp((now - createdAt) / Math.max(1, hatchAt - createdAt), 0, 1);
}

function getFishEggGrowthScale(egg, now = Date.now()) {
  if (egg?.hatchedAt) {
    return FISH_EGG_HATCH_SCALE;
  }

  const progress = getFishEggIncubationProgress(egg, now);
  if (progress <= FISH_EGG_CRACKED_START_PROGRESS) {
    const eggProgress = progress / Math.max(0.001, FISH_EGG_CRACKED_START_PROGRESS);
    return FISH_EGG_INITIAL_SCALE
      + (FISH_EGG_CRACKED_SCALE - FISH_EGG_INITIAL_SCALE) * eggProgress;
  }

  const crackedProgress = (progress - FISH_EGG_CRACKED_START_PROGRESS) / Math.max(0.001, 1 - FISH_EGG_CRACKED_START_PROGRESS);
  return FISH_EGG_CRACKED_SCALE
    + (FISH_EGG_HATCH_SCALE - FISH_EGG_CRACKED_SCALE) * crackedProgress;
}

function getFishEggSpritePath(egg, now = Date.now()) {
  if (egg?.hatchedAt) {
    return FISH_EGG_SHELL_ASSET_PATH;
  }

  return getFishEggIncubationProgress(egg, now) >= FISH_EGG_CRACKED_START_PROGRESS
    ? FISH_EGG_CRACKED_ASSET_PATH
    : FISH_EGG_ASSET_PATH;
}

function getFishEggPose(egg, now = Date.now()) {
  if (!egg) {
    return null;
  }

  const seed = hashStringToUint32(`${egg.id || ""}|${egg.speciesId || ""}`);
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const growthScale = getFishEggGrowthScale(egg, now);
  const width = randomBetweenWith(rand, FISH_EGG_DRAW_WIDTH_MIN_PX, FISH_EGG_DRAW_WIDTH_MAX_PX) * growthScale;
  const spritePath = getFishEggSpritePath(egg, now);
  const sprite = runtime.images.get(spritePath) || null;
  const height = sprite?.width ? width * (sprite.height / Math.max(1, sprite.width)) : width * 0.88;
  const targetYNorm = Number.isFinite(Number(egg.yNorm))
    ? clamp(Number(egg.yNorm), 0.18, 0.96)
    : getFishEggTargetYNorm(egg.xNorm, getFishEggTankLayer(egg));
  const hasReleaseDrift = Number.isFinite(Number(egg.releasedAt));
  const startYNorm = Math.min(
    clamp(Number(egg.startYNorm) || targetYNorm - 0.18, 0.14, 0.86),
    hasReleaseDrift ? targetYNorm : Math.max(0.14, targetYNorm - 0.01)
  );
  const isDragged = !egg.hatchedAt
    && runtime.eggDragState?.eggId === egg.id
    && Number.isFinite(Number(egg.dragYNorm));
  const fallStartedAt = hasReleaseDrift ? Number(egg.releasedAt) : (Number(egg.createdAt) || now);
  const fallDuration = hasReleaseDrift
    ? FISH_EGG_RELEASE_DRIFT_DURATION_MS
    : FISH_EGG_SINK_DURATION_MS;
  const sinkProgress = isDragged
    ? 0
    : clamp((now - fallStartedAt) / Math.max(1, fallDuration), 0, 1);
  const sinkEase = 1 - Math.pow(1 - sinkProgress, 2.2);
  const shellProgress = egg.hatchedAt && egg.shellExpiresAt
    ? clamp((now - egg.hatchedAt) / Math.max(1, egg.shellExpiresAt - egg.hatchedAt), 0, 1)
    : 0;
  const draggedYNorm = isDragged
    ? clamp(Number(egg.dragYNorm), 0.12, targetYNorm)
    : null;
  const driftAmount = isDragged ? 0 : 1 - sinkProgress;
  const x = clamp(Number(egg.xNorm) || 0.5, 0.08, 0.92) * TANK_WIDTH
    + Math.sin(now / 960 + seed * 0.00003) * driftAmount * 3.4;
  const y = (isDragged ? draggedYNorm : startYNorm + (targetYNorm - startYNorm) * sinkEase) * TANK_HEIGHT;
  const wobble = egg.hatchedAt
    ? Math.sin(now / 900 + seed * 0.00001) * 0.02
    : Math.sin(now / 820 + seed * 0.00002) * (isDragged ? 0.035 : driftAmount * 0.1);

  return {
    x,
    y,
    width,
    height,
    wobble,
    sprite,
    spritePath,
    shellProgress,
    alpha: egg.hatchedAt ? 1 - shellProgress : 1
  };
}

function drawFishEggFallback(context, pose, egg, now = Date.now()) {
  const kind = pose.spritePath === FISH_EGG_SHELL_ASSET_PATH
    ? "shell"
    : pose.spritePath === FISH_EGG_CRACKED_ASSET_PATH
      ? "cracked"
      : "egg";
  const width = pose.width;
  const height = pose.height;
  const inheritedColor = normalizeHexColor(egg?.fishColor);
  const shellFill = inheritedColor
    ? withAlpha(mixColors("#F0E3BE", inheritedColor, egg?.fishColorize ? 0.46 : 0.28), 0.84)
    : "rgba(240, 227, 190, 0.82)";
  const eggMiddle = inheritedColor
    ? mixColors("#EAD5A4", inheritedColor, egg?.fishColorize ? 0.68 : 0.48)
    : "#EAD5A4";
  const eggEdge = inheritedColor
    ? mixColors("#9A7E55", inheritedColor, egg?.fishColorize ? 0.58 : 0.34)
    : "#9A7E55";
  context.save();
  context.translate(-width / 2, -height * 0.9);
  if (isUvLightActive()) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.shadowColor = "rgba(118, 236, 255, 0.62)";
    context.shadowBlur = Math.max(7, width * 0.22);
    context.fillStyle = kind === "shell"
      ? "rgba(201, 255, 244, 0.22)"
      : "rgba(146, 242, 255, 0.28)";
    context.beginPath();
    context.ellipse(width * 0.5, height * 0.52, width * 0.42, height * 0.48, -0.12, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  if (kind === "shell") {
    context.fillStyle = shellFill;
    context.strokeStyle = "rgba(97, 75, 48, 0.36)";
    context.lineWidth = 1.1;
    const shards = [
      [[width * 0.18, height * 0.72], [width * 0.42, height * 0.3], [width * 0.55, height * 0.82]],
      [[width * 0.48, height * 0.82], [width * 0.68, height * 0.34], [width * 0.83, height * 0.72]],
      [[width * 0.28, height * 0.84], [width * 0.48, height * 0.66], [width * 0.62, height * 0.9]]
    ];
    for (const shard of shards) {
      context.beginPath();
      context.moveTo(shard[0][0], shard[0][1]);
      context.lineTo(shard[1][0], shard[1][1]);
      context.lineTo(shard[2][0], shard[2][1]);
      context.closePath();
      context.fill();
      context.stroke();
    }
    context.restore();
    return;
  }

  const glow = context.createRadialGradient(width * 0.38, height * 0.34, width * 0.08, width * 0.52, height * 0.52, width * 0.52);
  glow.addColorStop(0, "rgba(255, 248, 220, 0.98)");
  glow.addColorStop(0.56, withAlpha(eggMiddle, 0.94));
  glow.addColorStop(1, withAlpha(eggEdge, 0.92));
  context.fillStyle = glow;
  context.strokeStyle = "rgba(91, 70, 45, 0.34)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.ellipse(width * 0.5, height * 0.5, width * 0.36, height * 0.44, -0.12, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255, 255, 245, 0.36)";
  context.beginPath();
  context.ellipse(width * 0.38, height * 0.32, width * 0.11, height * 0.08, -0.35, 0, Math.PI * 2);
  context.fill();

  if (kind === "cracked") {
    context.strokeStyle = "rgba(72, 52, 34, 0.78)";
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(width * 0.48, height * 0.18);
    context.lineTo(width * 0.54, height * 0.34);
    context.lineTo(width * 0.46, height * 0.5);
    context.lineTo(width * 0.58, height * 0.68);
    context.stroke();
    context.beginPath();
    context.moveTo(width * 0.54, height * 0.34);
    context.lineTo(width * 0.66, height * 0.3);
    context.stroke();
  }

  context.restore();
}

function drawFishEggs(now, layer = null) {
  if (!Array.isArray(state.fishEggs) || !state.fishEggs.length) {
    return;
  }

  const targetLayer = Number.isFinite(Number(layer)) ? clampTankLayer(layer) : null;
  for (const egg of state.fishEggs) {
    if (targetLayer !== null && getFishEggTankLayer(egg) !== targetLayer) {
      continue;
    }

    const pose = getFishEggPose(egg, now);
    if (!pose || pose.alpha <= 0.01) {
      continue;
    }

    tankContext.save();
    tankContext.globalAlpha = pose.alpha;
    tankContext.fillStyle = "rgba(13, 9, 5, 0.18)";
    tankContext.beginPath();
    tankContext.ellipse(pose.x, pose.y + 3, pose.width * 0.38, pose.height * 0.14, 0, 0, Math.PI * 2);
    tankContext.fill();
    tankContext.translate(pose.x, pose.y);
    tankContext.rotate(pose.wobble);
    if (pose.sprite?.width && pose.sprite?.height) {
      const eggSprite = egg.fishColor
        ? (getTintedCaveLayerImage(pose.spritePath, egg.fishColor, { colorize: egg.fishColorize }) || pose.sprite)
        : pose.sprite;
      drawUvGlowImageToContext(
        tankContext,
        eggSprite,
        -pose.width / 2,
        -pose.height * 0.9,
        pose.width,
        pose.height,
        pose.spritePath === FISH_EGG_SHELL_ASSET_PATH ? 0.96 : 1.16,
        pose.spritePath === FISH_EGG_SHELL_ASSET_PATH ? 0.66 : 0.78,
        "biological-waste"
      );
      tankContext.drawImage(
        eggSprite,
        -pose.width / 2,
        -pose.height * 0.9,
        pose.width,
        pose.height
      );
    } else {
      drawFishEggFallback(tankContext, pose, egg, now);
    }
    tankContext.restore();
  }
}

function drawPoopUvGlowToContext(context, pose, now = Date.now()) {
  if (!isUvLightActive() || !pose?.sprite) {
    return;
  }

  const pulse = 0.5 + Math.sin(now / 1700 + pose.x * 0.018) * 0.5;
  drawUvGlowImageToContext(
    context,
    pose.sprite,
    -pose.width / 2,
    -pose.height * 0.88,
    pose.width,
    pose.height,
    1.35,
    0.82 + pulse * 0.12,
    "biological-waste"
  );
}

function drawFishHeldGravelPebble(fish, species, now, pose, width, height) {
  const action = getFishGravelPebbleAction(fish);
  if (!action || action.stage !== "carry") {
    return;
  }

  const sprite = getCustomGravelPebbleSpriteByPath(action.assetPath, action.color, { colorize: action.colorize });
  if (!sprite?.width || !sprite?.height) {
    return;
  }

  const aspect = sprite.width / Math.max(1, sprite.height);
  const size = (Number.isFinite(action.holdSizePx) ? action.holdSizePx : FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX) * getViewportStableAssetScale();
  const drawWidth = aspect >= 1 ? size : size * aspect;
  const drawHeight = aspect >= 1 ? size / aspect : size;
  const mouth = getFishGravelPebbleMouthLocalPoint(fish, species, width, height, pose, now);

  tankContext.save();
  tankContext.globalAlpha = 1;
  tankContext.drawImage(
    sprite,
    mouth.x - drawWidth * FISH_GRAVEL_PEBBLE_MOUTH_OVERLAP_RATIO,
    mouth.y - drawHeight * 0.5,
    drawWidth,
    drawHeight
  );
  tankContext.restore();
}

function getFishSameLayerRenderPriority(fish) {
  if (!fish?.caveDecorId || !["enter", "inside", "exit", "depart"].includes(fish.caveState)) {
    return 0;
  }

  return 1;
}

function drawFishPebbleTosses(now) {
  if (!runtime.fishPebbleTosses.length) {
    return;
  }

  for (const toss of runtime.fishPebbleTosses) {
    const sprite = getCustomGravelPebbleSpriteByPath(toss.assetPath, toss.color, { colorize: toss.colorize });
    if (!sprite?.width || !sprite?.height) {
      continue;
    }

    const pose = getFishPebbleTossPose(toss, now);
    const aspect = sprite.width / Math.max(1, sprite.height);
    const size = (Number.isFinite(toss.sizePx) ? toss.sizePx : FISH_GRAVEL_PEBBLE_HOLD_SIZE_MIN_PX) * getViewportStableAssetScale();
    const drawWidth = aspect >= 1 ? size : size * aspect;
    const drawHeight = aspect >= 1 ? size / aspect : size;

    tankContext.save();
    tankContext.translate(pose.x, pose.y);
    tankContext.rotate(pose.rotation);
    tankContext.globalAlpha = 1;
    tankContext.drawImage(
      sprite,
      -drawWidth * 0.5,
      -drawHeight * 0.5,
      drawWidth,
      drawHeight
    );
    tankContext.restore();
  }
}

function drawFishComfortSparkles(pose, width, height, now = Date.now()) {
  const stableScale = getViewportStableAssetScale();
  const sparkleCount = 7;
  tankContext.save();
  tankContext.translate(pose.x + pose.swayX, pose.y);
  tankContext.lineWidth = Math.max(1, stableScale * 1.4);
  for (let index = 0; index < sparkleCount; index += 1) {
    const angle = (now / 850 + index * 2.399) % (Math.PI * 2);
    const orbitX = Math.cos(angle) * width * randomBetweenWith(mulberry32(index + 42), 0.28, 0.55);
    const orbitY = Math.sin(angle * 1.3) * height * randomBetweenWith(mulberry32(index + 84), 0.22, 0.48);
    const pulse = 0.55 + 0.45 * Math.sin(now / 260 + index);
    const size = stableScale * (3.5 + pulse * 3);
    tankContext.globalAlpha = 0.36 + pulse * 0.42;
    tankContext.strokeStyle = "rgba(255, 245, 151, 0.96)";
    tankContext.beginPath();
    tankContext.moveTo(orbitX - size, orbitY);
    tankContext.lineTo(orbitX + size, orbitY);
    tankContext.moveTo(orbitX, orbitY - size);
    tankContext.lineTo(orbitX, orbitY + size);
    tankContext.stroke();
  }
  tankContext.restore();
}

function fitDebugFishBehaviorLine(text, maxWidth) {
  const value = String(text || "");
  if (tankContext.measureText(value).width <= maxWidth) {
    return value;
  }

  const suffix = "...";
  let end = value.length;
  while (end > 3 && tankContext.measureText(`${value.slice(0, end)}${suffix}`).width > maxWidth) {
    end -= 1;
  }
  return `${value.slice(0, Math.max(1, end))}${suffix}`;
}

function drawDebugFishBehaviorBroadcast(fish, species, pose, width, height, topFrameBottomY, stableScale, now = Date.now()) {
  if (!isDebugModeEnabled()) {
    return;
  }

  const snapshot = getDebugFishBehaviorSnapshot(fish, species, now);
  if (!snapshot?.labelLines?.length) {
    return;
  }

  const fontSize = Math.max(8, 10 * stableScale);
  const lineHeight = Math.ceil(fontSize * 1.25);
  const paddingX = 8 * stableScale;
  const paddingY = 5 * stableScale;
  const maxTextWidth = 220 * stableScale;

  tankContext.save();
  tankContext.font = `700 ${fontSize}px Trebuchet MS, sans-serif`;
  tankContext.textAlign = "center";
  tankContext.textBaseline = "middle";

  const lines = snapshot.labelLines
    .filter((line) => String(line || "").trim())
    .slice(0, 5)
    .map((line) => fitDebugFishBehaviorLine(line, maxTextWidth));
  const textWidth = Math.max(...lines.map((line) => tankContext.measureText(line).width), 1);
  const labelWidth = Math.ceil(textWidth + paddingX * 2);
  const labelHeight = Math.ceil(lines.length * lineHeight + paddingY * 2);
  const centerX = clamp(
    pose.x + pose.swayX,
    GLASS_MARGIN_X + labelWidth / 2,
    TANK_WIDTH - GLASS_MARGIN_X - labelWidth / 2
  );
  const desiredY = pose.y - height * 0.72 - labelHeight / 2 - 8 * stableScale;
  const centerY = Math.max(topFrameBottomY + labelHeight / 2 + 3 * stableScale, desiredY);
  const left = centerX - labelWidth / 2;
  const top = centerY - labelHeight / 2;

  tankContext.fillStyle = "rgba(4, 16, 24, 0.78)";
  tankContext.strokeStyle = "rgba(255, 220, 92, 0.72)";
  tankContext.lineWidth = Math.max(1, stableScale);
  tankContext.beginPath();
  tankContext.roundRect(left, top, labelWidth, labelHeight, 7 * stableScale);
  tankContext.fill();
  tankContext.stroke();

  lines.forEach((line, index) => {
    tankContext.fillStyle = index === 0
      ? "rgba(255, 235, 150, 0.98)"
      : "rgba(232, 250, 255, 0.94)";
    tankContext.fillText(
      line,
      centerX,
      top + paddingY + lineHeight * index + lineHeight / 2
    );
  });
  tankContext.restore();
}

function drawMissingFishArtworkFallback(fish, species, now = Date.now()) {
  const pose = getFishPose(fish, species, now);
  const width = Math.max(28, getFishDisplayWidth(fish, species, now));
  const height = width * 0.46;
  const bodyColor = normalizeHexColor(getFishColorSetting(fish)) || "#68B9D3";
  const fishDrawX = -width / 2 + pose.wiggle * width * 0.018;

  tankContext.save();
  tankContext.translate(pose.x + pose.swayX, pose.y);
  tankContext.scale(pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1), 1);
  tankContext.rotate(pose.tilt);
  tankContext.scale(pose.bodyScaleX, pose.bodyScaleY);
  tankContext.globalAlpha = 0.82;
  tankContext.fillStyle = bodyColor;
  tankContext.beginPath();
  tankContext.ellipse(fishDrawX + width * 0.55, 0, width * 0.34, height * 0.42, 0, 0, Math.PI * 2);
  tankContext.fill();
  tankContext.beginPath();
  tankContext.moveTo(fishDrawX + width * 0.23, 0);
  tankContext.lineTo(fishDrawX, -height * 0.42);
  tankContext.lineTo(fishDrawX, height * 0.42);
  tankContext.closePath();
  tankContext.fill();
  tankContext.globalAlpha = 0.9;
  tankContext.fillStyle = "#102A36";
  tankContext.beginPath();
  tankContext.arc(fishDrawX + width * 0.76, -height * 0.08, Math.max(1.5, height * 0.045), 0, Math.PI * 2);
  tankContext.fill();
  tankContext.restore();
}

function getFishDepthLightingStyle(poseY) {
  const floorBottom = Math.max(WATER_SURFACE_Y + 1, getVisibleTankFloorBottomY());
  const depth = clamp((Number(poseY) - WATER_SURFACE_Y) / Math.max(1, floorBottom - WATER_SURFACE_Y), 0, 1);
  const brightnessPercent = Math.round(101 - depth * 5);
  const saturationPercent = Math.round(101 - depth * 4);
  const highlightAlpha = 0.085 - depth * 0.04;
  return {
    depth,
    filter: `brightness(${brightnessPercent}%) saturate(${saturationPercent}%)`,
    highlightAlpha: clamp(highlightAlpha, 0.035, 0.085)
  };
}

function getFishTopLightOverlay(image) {
  if (!isUsableRuntimeImage(image)) {
    return null;
  }

  if (!runtime.fishTopLightOverlayCache) {
    runtime.fishTopLightOverlayCache = new WeakMap();
  }

  const cached = runtime.fishTopLightOverlayCache.get(image);
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
    return null;
  }

  context.drawImage(image, 0, 0, width, height);
  context.globalCompositeOperation = "source-in";
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(205, 242, 255, 0.95)");
  gradient.addColorStop(0.18, "rgba(160, 224, 252, 0.72)");
  gradient.addColorStop(0.42, "rgba(105, 196, 238, 0.28)");
  gradient.addColorStop(0.68, "rgba(80, 165, 220, 0.05)");
  gradient.addColorStop(1, "rgba(80, 165, 220, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";

  runtime.fishTopLightOverlayCache.set(image, canvas);
  return canvas;
}

function drawFishTopLightOverlay(context, image, fishDrawX, height, width, poseY, now = Date.now()) {
  if (isTankLightsOut(now)) {
    return;
  }

  const overlay = getFishTopLightOverlay(image);
  if (!overlay) {
    return;
  }

  const lighting = getFishDepthLightingStyle(poseY);
  context.save();
  context.globalCompositeOperation = "screen";
  context.globalAlpha = lighting.highlightAlpha;
  context.filter = "blur(0.22px)";
  context.drawImage(overlay, fishDrawX, -height / 2, width, height);
  context.restore();
}

function drawFish(now, layer = null, options = {}) {
  if (!state.fish.length) {
    return;
  }

  const sortedFish = [...state.fish]
    .filter((fish) => {
      if (layer !== null && getFishTankLayer(fish) !== layer) {
        return false;
      }

      const species = getSpeciesForFish(fish);
      if (!species) {
        return false;
      }

      const effectiveBehavior = getEffectiveFishBehavior(fish);
      if (options.onlyBehavior && effectiveBehavior !== options.onlyBehavior) {
        return false;
      }

      if (options.excludeBehavior && effectiveBehavior === options.excludeBehavior) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      const priorityDelta = getFishSameLayerRenderPriority(left) - getFishSameLayerRenderPriority(right);
      if (priorityDelta) {
        return priorityDelta;
      }

      return left.yNorm - right.yNorm;
    });

  for (const fish of sortedFish) {
    const species = getSpeciesForFish(fish);
    if (!runtime.pendingNeighborhoodTravel.has(fish.id)) clampFishToMobileViewport(fish, species, now);
    const imagePath = getFishDisplayAssetPath(fish, species, now) || species.asset;
    const image = runtime.images.get(imagePath);
    if (!isUsableRuntimeImage(image)) {
      requestRuntimeImageRecovery(imagePath, {
        kind: "fish",
        id: fish.id,
        speciesId: fish.speciesId
      });
      drawMissingFishArtworkFallback(fish, species, now);
      continue;
    }
    const renderImage = getFishTintedImage(imagePath, image, fish);

    const pose = getFishPose(fish, species, now);
    const width = getFishDisplayWidth(fish, species, now);
    const height = width * (image.height / image.width);
    const stableScale = getViewportStableAssetScale();
    const shellBounds = getTankShellBounds();
    const topFrameBottomY = shellBounds.outerTop + 28;
    const effectiveBehavior = getEffectiveFishBehavior(fish, species);
    const healthRatio = getFishHealthRatio(fish, species);
    const fishDrawX = -width / 2 + pose.wiggle * width * 0.018;
    const useSuckerFacePivot = (
      SUCKER_FISH_FACE_PIVOT_ENABLED
      && !pose.isDead
      && effectiveBehavior === "sucker"
      && !isSuckerFishFreeSwimming(fish, species, now)
    );
    const suckerFacePivotX = useSuckerFacePivot
      ? fishDrawX + width * SUCKER_FISH_FACE_PIVOT_X
      : 0;
    const suckerFacePivotY = useSuckerFacePivot
      ? -height / 2 + height * SUCKER_FISH_FACE_PIVOT_Y
      : 0;

    tankContext.save();
    tankContext.translate(pose.x + pose.swayX, pose.y);
    tankContext.scale(pose.facingScaleX ?? (pose.direction < 0 ? -1 : 1), 1);
    if (useSuckerFacePivot) {
      tankContext.translate(suckerFacePivotX, suckerFacePivotY);
      tankContext.rotate(pose.tilt);
      tankContext.translate(-suckerFacePivotX, -suckerFacePivotY);
    } else {
      tankContext.rotate(pose.tilt);
    }
    const tubeTravel = runtime.pendingNeighborhoodTravel.get(fish.id)?.mode === "tube";
    let tubeCompression = 1;
    if (tubeTravel) {
      const pending = runtime.pendingNeighborhoodTravel.get(fish.id);
      const tank = getTankContainingFish(fish.id);
      const tubeId = pending.phase === "emerging" ? pending.targetTubeId : pending.sourceTubeId;
      const tube = tank?.placedDecor?.find((item) => item.id === tubeId);
      const tubeBounds = getPlacedDecorBounds(tube);
      const innerWidth = tubeBounds ? Math.max(12, (tubeBounds.right - tubeBounds.left) * .5) : 34;
      tubeCompression = Math.min(1, innerWidth / Math.max(1, height));
    }
    tankContext.scale(pose.bodyScaleX, pose.bodyScaleY * tubeCompression);

    if (
      SUCKER_FISH_GLASS_SHADOW_ENABLED
      && !pose.isDead
      && effectiveBehavior === "sucker"
      && !isSuckerFishFreeSwimming(fish, species, now)
    ) {
      const shadowWidth = width * SUCKER_FISH_GLASS_SHADOW_SCALE;
      const shadowHeight = height * SUCKER_FISH_GLASS_SHADOW_SCALE;
      tankContext.save();
      tankContext.globalCompositeOperation = "multiply";
      tankContext.globalAlpha = SUCKER_FISH_GLASS_SHADOW_ALPHA;
      tankContext.filter = `brightness(0) blur(${SUCKER_FISH_GLASS_SHADOW_BLUR_PX}px)`;
      tankContext.drawImage(
        renderImage,
        fishDrawX - (shadowWidth - width) / 2 + SUCKER_FISH_GLASS_SHADOW_OFFSET_X,
        -height / 2 - (shadowHeight - height) / 2 + SUCKER_FISH_GLASS_SHADOW_OFFSET_Y,
        shadowWidth,
        shadowHeight
      );
      tankContext.restore();
    }
    const fishLighting = getFishDepthLightingStyle(pose.y);
    const fishBaseFilter = getFishCanvasFilter(fish, healthRatio, now);
    tankContext.filter = fishBaseFilter === "none"
      ? fishLighting.filter
      : `${fishBaseFilter} ${fishLighting.filter}`;
    tankContext.drawImage(renderImage, fishDrawX, -height / 2, width, height);
    tankContext.filter = "none";
    if (!pose.isDead) {
      drawFishTopLightOverlay(tankContext, image, fishDrawX, height, width, pose.y, now);
    }
    drawUvGlowImageToContext(tankContext, renderImage, fishDrawX, -height / 2, width, height, getFishUvGlowIntensity(fish, species));
    drawFishHeldGravelPebble(fish, species, now, pose, width, height);
    tankContext.restore();
    drawFishDiseaseBubbles(fish, species, pose, width, height, now);
    drawFishBirthdayHat(fish, pose, width, height, now);

    if (!pose.isDead && getFishComfort(fish, now).value >= 0.95) {
      drawFishComfortSparkles(pose, width, height, now);
    }

    if ((!pose.isBeingConsumed && pose.isDead) || fish.healthUnits === 1) {
      const statusY = Math.max(topFrameBottomY + 12 * stableScale, pose.y - height * 0.72);
      tankContext.save();
      tankContext.font = `${22 * stableScale}px sans-serif`;
      tankContext.textAlign = "center";
      tankContext.textBaseline = "middle";
      tankContext.fillText(
        pose.isDead ? "\u2620\uFE0F" : "\u{1F494}",
        pose.x + pose.swayX,
        statusY
      );
      tankContext.restore();
    }

    drawDebugFishBehaviorBroadcast(fish, species, pose, width, height, topFrameBottomY, stableScale, now);

    if (runtime.selectedFishId === fish.id) {
      tankContext.save();
      tankContext.font = `600 ${13 * stableScale}px Trebuchet MS`;
      tankContext.textAlign = "center";
      tankContext.textBaseline = "middle";
      const labelWidth = Math.ceil(tankContext.measureText(fish.name).width) + 18 * stableScale;
      const labelHeight = 22 * stableScale;
      const labelY = pose.isDead
        ? Math.max(topFrameBottomY + labelHeight / 2 + 18 * stableScale, pose.y - height * 0.62)
        : pose.y - height * 0.62;
      tankContext.fillStyle = "rgba(5, 14, 22, 0.5)";
      tankContext.beginPath();
      tankContext.roundRect(pose.x - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 11 * stableScale);
      tankContext.fill();
      tankContext.strokeStyle = "rgba(232, 247, 255, 0.16)";
      tankContext.lineWidth = stableScale;
      tankContext.stroke();
      tankContext.fillStyle = "rgba(240, 251, 255, 0.92)";
      tankContext.fillText(fish.name, pose.x, labelY + 0.5);
      tankContext.restore();
    }
  }
}

function drawWaterSurface(now) {
  tankContext.save();
  const surfaceStartX = GLASS_MARGIN_X - 8;
  const surfaceEndX = TANK_WIDTH - GLASS_MARGIN_X + 8;
  const traceRipple = (yOffset, amplitude, phase, step = 16) => {
    tankContext.beginPath();
    for (let x = surfaceStartX; x <= surfaceEndX; x += step) {
      const y = WATER_SURFACE_Y
        + yOffset
        + Math.sin(now / 620 + x / 112 + phase) * amplitude
        + Math.sin(now / 980 + x / 43 + phase * 0.6) * amplitude * 0.32;
      if (x === surfaceStartX) {
        tankContext.moveTo(x, y);
      } else {
        tankContext.lineTo(x, y);
      }
    }
  };

  tankContext.lineCap = "round";
  tankContext.lineJoin = "round";

  tankContext.strokeStyle = "rgba(8, 13, 16, 0.16)";
  tankContext.lineWidth = 1.05;
  traceRipple(1.45, 1.05, 0.7);
  tankContext.stroke();

  tankContext.strokeStyle = "rgba(236, 250, 252, 0.2)";
  tankContext.lineWidth = 0.85;
  traceRipple(0, 1.24, 0);
  tankContext.stroke();

  tankContext.setLineDash([28, 96]);
  tankContext.lineDashOffset = -now / 120;
  tankContext.strokeStyle = "rgba(194, 238, 244, 0)";
  tankContext.lineWidth = 0.45;
  traceRipple(-0.4, 0.9, 1.4, 14);
  tankContext.stroke();
  tankContext.restore();
}

function drawSplashBursts(now) {
  if (!runtime.splashBursts.length) {
    return;
  }

  tankContext.save();
  tankContext.beginPath();
  tankContext.rect(GLASS_MARGIN_X, WATER_SURFACE_Y - 72, TANK_WIDTH - GLASS_MARGIN_X * 2, TANK_HEIGHT - WATER_SURFACE_Y - GLASS_MARGIN_BOTTOM + 72);
  tankContext.clip();

  for (const burst of runtime.splashBursts) {
    const progress = clamp((now - burst.startedAt) / Math.max(1, burst.endsAt - burst.startedAt), 0, 1);
    if (progress >= 1) {
      continue;
    }

    const rippleAlpha = (1 - progress) * 0.52;
    tankContext.save();
    tankContext.strokeStyle = `rgba(224, 247, 255, ${rippleAlpha.toFixed(3)})`;
    tankContext.lineWidth = 2.4 - progress * 1.2;
    tankContext.beginPath();
    tankContext.ellipse(
      burst.x,
      burst.y + 1,
      14 + progress * 48,
      3 + progress * 10,
      0,
      0,
      Math.PI * 2
    );
    tankContext.stroke();
    tankContext.restore();

    for (const droplet of burst.droplets) {
      const dropletProgress = clamp((progress - droplet.delay) / 0.34, 0, 1);
      if (dropletProgress <= 0 || dropletProgress >= 1) {
        continue;
      }

      const x = burst.x + droplet.drift * dropletProgress;
      const y = burst.y - droplet.lift * Math.sin(dropletProgress * Math.PI) + droplet.fall * dropletProgress * dropletProgress;
      tankContext.fillStyle = `rgba(229, 249, 255, ${(0.9 - dropletProgress * 0.5).toFixed(3)})`;
      tankContext.beginPath();
      tankContext.ellipse(x, y, droplet.size * 0.82, droplet.size * 1.18, 0, 0, Math.PI * 2);
      tankContext.fill();
    }

    for (const bubble of burst.bubbles) {
      const bubbleProgress = clamp((progress - bubble.delay) / 0.62, 0, 1);
      if (bubbleProgress <= 0 || bubbleProgress >= 1) {
        continue;
      }

      const bubbleY = burst.y + 18 + bubble.rise * (1 - bubbleProgress);
      drawBubbleOrb(
        burst.x + bubble.drift * bubbleProgress + Math.sin(progress * 18 + bubble.drift) * bubble.wobble,
        bubbleY,
        bubble.radius * (0.84 + bubbleProgress * 0.28),
        0.16 + (1 - bubbleProgress) * 0.22,
        1
      );
    }
  }

  tankContext.restore();
}

function drawGlassTapEffects(now) {
  if (!runtime.glassTapEffects.length) {
    return;
  }

  glassContext.save();
  clipToTankShellBounds(glassContext);
  glassContext.lineCap = "round";
  glassContext.lineJoin = "round";

  for (const effect of runtime.glassTapEffects) {
    const duration = Math.max(1, effect.endsAt - effect.startedAt);
    const progress = clamp((now - effect.startedAt) / duration, 0, 1);
    if (progress >= 1) {
      continue;
    }

    const fade = 1 - progress;
    const eased = 1 - (1 - progress) * (1 - progress);
    const x = effect.x;
    const y = effect.y;
    const radius = 7 + eased * 42;

    glassContext.save();
    glassContext.translate(x, y);
    glassContext.rotate(effect.tilt || 0);
    glassContext.strokeStyle = `rgba(236, 250, 255, ${(fade * 0.72).toFixed(3)})`;
    glassContext.lineWidth = 2.1 - progress * 1.15;
    glassContext.beginPath();
    glassContext.ellipse(0, 0, radius, Math.max(4, radius * 0.48), 0, 0, Math.PI * 2);
    glassContext.stroke();

    glassContext.strokeStyle = `rgba(255, 255, 255, ${(fade * 0.32).toFixed(3)})`;
    glassContext.lineWidth = 0.85;
    glassContext.beginPath();
    glassContext.ellipse(0, 0, radius * 0.46, Math.max(2.5, radius * 0.22), 0, 0, Math.PI * 2);
    glassContext.stroke();
    glassContext.restore();

    const centerAlpha = Math.max(0, 1 - progress * 2.2);
    if (centerAlpha > 0) {
      glassContext.fillStyle = `rgba(255, 255, 255, ${(centerAlpha * 0.62).toFixed(3)})`;
      glassContext.beginPath();
      glassContext.ellipse(x, y, 4.5 + progress * 3, 3.2 + progress * 2, effect.angle || 0, 0, Math.PI * 2);
      glassContext.fill();
    }

    for (const shard of effect.shards || []) {
      const shardProgress = clamp((progress - shard.delay) / 0.36, 0, 1);
      if (shardProgress <= 0 || shardProgress >= 1) {
        continue;
      }

      const shardFade = fade * (1 - shardProgress * 0.45);
      const start = shard.start + shardProgress * 2;
      const end = start + shard.length * shardProgress;
      const dx = Math.cos(shard.angle);
      const dy = Math.sin(shard.angle);
      glassContext.strokeStyle = `rgba(225, 248, 255, ${(shardFade * 0.54).toFixed(3)})`;
      glassContext.lineWidth = 1.4 - shardProgress * 0.7;
      glassContext.beginPath();
      glassContext.moveTo(x + dx * start, y + dy * start * 0.78);
      glassContext.lineTo(x + dx * end, y + dy * end * 0.78);
      glassContext.stroke();
    }

    for (const speck of effect.specks || []) {
      const speckProgress = clamp((progress - speck.delay) / 0.32, 0, 1);
      if (speckProgress <= 0 || speckProgress >= 1) {
        continue;
      }

      const distance = speck.distance * (0.42 + speckProgress * 0.58);
      const alpha = fade * (1 - speckProgress) * 0.5;
      glassContext.fillStyle = `rgba(243, 253, 255, ${alpha.toFixed(3)})`;
      glassContext.beginPath();
      glassContext.arc(
        x + Math.cos(speck.angle) * distance,
        y + Math.sin(speck.angle) * distance * 0.72,
        speck.radius,
        0,
        Math.PI * 2
      );
      glassContext.fill();
    }
  }

  glassContext.restore();
}

function drawGrime(dirtiness) {
  const visibleDirtiness = getVisibleGrimeDirtiness(dirtiness);
  const grimeBaseCacheKey = getGrimeBaseCacheKey(dirtiness);
  const compositeCacheKey = [
    grimeBaseCacheKey,
    runtime.scrubMaskRevision,
    dom.grimeCanvas.width,
    dom.grimeCanvas.height,
    (Number(runtime.stageRenderScale) || 0).toFixed(5),
    (Number(runtime.stageRenderOffsetX) || 0).toFixed(2),
    (Number(runtime.stageRenderOffsetY) || 0).toFixed(2),
    getCurrentTank()?.id || "tank",
    getCurrentTank()?.tankTypeId || "shell"
  ].join("|");
  if (runtime.grimeCompositeCacheKey === compositeCacheKey) {
    return;
  }

  if (runtime.grimeBaseCacheKey !== grimeBaseCacheKey) {
    renderGrimeBaseCanvas(dirtiness);
    runtime.grimeBaseCacheKey = grimeBaseCacheKey;
  }

  grimeContext.save();
  grimeContext.setTransform(1, 0, 0, 1, 0, 0);
  grimeContext.clearRect(0, 0, dom.grimeCanvas.width, dom.grimeCanvas.height);
  grimeContext.restore();
  if (visibleDirtiness <= 0) {
    runtime.grimeCompositeCacheKey = compositeCacheKey;
    return;
  }

  grimeContext.save();
  clipToTankShellBounds(grimeContext, getCurrentTank(), "outer");
  grimeContext.drawImage(runtime.grimeBaseCanvas, 0, 0, TANK_WIDTH, TANK_HEIGHT);

  if (runtime.scrubStamps.length) {
    grimeContext.globalCompositeOperation = "destination-out";
    grimeContext.drawImage(runtime.scrubMaskCanvas, 0, 0, TANK_WIDTH, TANK_HEIGHT);
  }
  grimeContext.restore();
  runtime.grimeCompositeCacheKey = compositeCacheKey;
}

function drawCleaningSparkles(now) {
  if (!runtime.cleaningTransition) {
    return;
  }

  const { startedAt, fadeEndsAt, sparkleEndsAt, sparkles } = runtime.cleaningTransition;
  const fadeProgress = clamp((now - startedAt) / Math.max(1, fadeEndsAt - startedAt), 0, 1);
  const sparkleFade = now <= fadeEndsAt
    ? fadeProgress
    : clamp(1 - (now - fadeEndsAt) / Math.max(1, sparkleEndsAt - fadeEndsAt), 0, 1);

  if (sparkleFade <= 0) {
    return;
  }

  tankContext.save();
  clipToTankShellBounds(tankContext, getCurrentTank(), "inner");
  tankContext.beginPath();
  tankContext.rect(GLASS_MARGIN_X, WATER_SURFACE_Y + 2, TANK_WIDTH - GLASS_MARGIN_X * 2, TANK_HEIGHT - WATER_SURFACE_Y - GLASS_MARGIN_BOTTOM - 2);
  tankContext.clip();
  tankContext.globalCompositeOperation = "screen";

  for (const sparkle of sparkles) {
    const life = clamp((now - startedAt) / CLEAN_SPARKLE_MS - sparkle.delay, 0, 1);
    if (life <= 0 || life >= 1) {
      continue;
    }

    const pulse = Math.sin((life * Math.PI + sparkle.delay) * sparkle.twinkle * Math.PI);
    const burst = Math.sin(life * Math.PI);
    const alpha = Math.max(0, pulse) * sparkleFade * (0.7 + sparkle.glow * 0.38);
    if (alpha <= 0.02) {
      continue;
    }

    const size = sparkle.size * (0.86 + pulse * 0.22 + burst * 0.16);
    const coreColor = `hsla(${sparkle.hue.toFixed(1)}, 88%, 82%, ${Math.min(0.72, alpha * 0.74).toFixed(3)})`;

    tankContext.save();
    tankContext.translate(sparkle.x, sparkle.y);
    tankContext.rotate(sparkle.rotation + pulse * 0.12);
    tankContext.strokeStyle = coreColor;
    tankContext.lineWidth = 1.1 + sparkle.glow * 0.42;
    tankContext.beginPath();
    tankContext.moveTo(-size, 0);
    tankContext.lineTo(size, 0);
    tankContext.moveTo(0, -size);
    tankContext.lineTo(0, size);
    tankContext.stroke();
    if (sparkle.diagonal) {
      const diag = size * 0.72;
      tankContext.beginPath();
      tankContext.moveTo(-diag, -diag);
      tankContext.lineTo(diag, diag);
      tankContext.moveTo(diag, -diag);
      tankContext.lineTo(-diag, diag);
      tankContext.stroke();
    }
    tankContext.restore();

    tankContext.fillStyle = `hsla(${sparkle.hue.toFixed(1)}, 100%, 92%, ${(alpha * 0.62).toFixed(3)})`;
    tankContext.beginPath();
    tankContext.arc(sparkle.x, sparkle.y, Math.max(1.6, size * 0.18), 0, Math.PI * 2);
    tankContext.fill();

  }

  tankContext.restore();
}

function getFishPose(fish, species, now) {
  if (isFishBeingConsumedByPiranhas(fish, now)) {
    const churnClock = now / 1000;
    const facing = getFishFacingDirection(fish);
    return {
      x: fish.xNorm * TANK_WIDTH + Math.sin(churnClock * 2.2 + fish.phase * Math.PI * 2) * 8,
      y: fish.yNorm * TANK_HEIGHT + Math.cos(churnClock * 2.8 + fish.phase * Math.PI * 1.6) * 5,
      direction: facing,
      facingScaleX: facing,
      tilt: Math.PI * 0.5 + Math.sin(churnClock * 3.2 + fish.phase * Math.PI) * 0.42,
      wiggle: Math.sin(churnClock * 4.4 + fish.phase * Math.PI) * 0.28,
      bodyScaleX: 0.92,
      bodyScaleY: 1.06,
      swayX: Math.sin(churnClock * 3.6 + fish.phase * Math.PI * 2) * 4,
      isDead: true,
      isBeingConsumed: true
    };
  }

  if (isFishDead(fish)) {
    const floatClock = now / 1000;
    const facing = getFishFacingDirection(fish);
    return {
      x: fish.xNorm * TANK_WIDTH + Math.sin(floatClock * 0.34 + fish.phase * Math.PI * 2) * 3.2,
      y: fish.yNorm * TANK_HEIGHT + Math.sin(floatClock * 0.82 + fish.phase * Math.PI * 1.6) * 1.8,
      direction: facing,
      facingScaleX: facing,
      tilt: Math.PI + Math.sin(floatClock * 0.48 + fish.phase * Math.PI) * 0.06,
      wiggle: Math.sin(floatClock * 0.18 + fish.phase * Math.PI) * 0.05,
      bodyScaleX: 1,
      bodyScaleY: 1,
      swayX: 0,
      isDead: true
    };
  }

  const tubeTravel = runtime.pendingNeighborhoodTravel.get(fish.id);
  if (tubeTravel?.mode === "tube" && ["entering", "waiting", "emerging"].includes(tubeTravel.phase)) {
    const motionClock = Number.isFinite(fish.wiggleClock) ? fish.wiggleClock : now / 380;
    const wiggle = Math.sin(motionClock + fish.phase * Math.PI * 2) * .3;
    const activeTubeId = tubeTravel.phase === "emerging"
      ? tubeTravel.targetTubeId
      : tubeTravel.sourceTubeId;
    const activeTube = getTankContainingFish(fish.id)?.placedDecor?.find((item) => item.id === activeTubeId);
    const imageTopToBottomDirection = activeTube && isDecorVerticallyFlipped(activeTube) ? -1 : 1;
    const travelDirectionY = tubeTravel.phase === "emerging"
      ? -imageTopToBottomDirection
      : imageTopToBottomDirection;

    // Fish art faces right at zero rotation. Rotate it vertically so its head
    // always leads through the tube: toward image-bottom while entering, then
    // toward image-top while emerging. A vertically flipped tube reverses both
    // directions automatically.
    const tubeTilt = travelDirectionY < 0 ? -Math.PI / 2 : Math.PI / 2;
    return {
      x: fish.xNorm * TANK_WIDTH,
      y: fish.yNorm * TANK_HEIGHT,
      direction: 1,
      facingScaleX: 1,
      tilt: tubeTilt,
      wiggle,
      bodyScaleX: 1 - Math.abs(wiggle) * .025,
      bodyScaleY: 1 + Math.abs(wiggle) * .02,
      swayX: 0,
      isDead: false
    };
  }

  const motionLevel = clamp(Number(fish.motionLevel) || 0.12, 0.04, 1);
  const sickMotionBoost = isFishCriticallyLowHealth(fish) ? 1.22 : 1;
  const wiggleClock = Number.isFinite(fish.wiggleClock) ? fish.wiggleClock : (now / 1000) * (0.45 + fish.swimSpeed * 14);
  if (getEffectiveFishBehavior(fish, species) === "sucker") {
    const facing = getFishFacingDirection(fish);
    const turnProgress = fish.turnStartedAt && fish.turnDurationMs > 0
      ? clamp((now - fish.turnStartedAt) / fish.turnDurationMs, 0, 1)
      : null;
    const currentAngle = getFishFacingAngle(fish);
    const turnFromAngle = Number.isFinite(Number(fish.turnFromAngle))
      ? normalizeAngle(Number(fish.turnFromAngle))
      : currentAngle;
    const turnToAngle = Number.isFinite(Number(fish.turnToAngle))
      ? normalizeAngle(Number(fish.turnToAngle))
      : currentAngle;
    const turnSpinDirection = Number(fish.turnSpinDirection) < 0 ? -1 : 1;
    const clingMotion = clamp(motionLevel * 0.18, 0.01, 0.12);
    const clingWiggle = Math.sin(wiggleClock * 0.18 + fish.phase * Math.PI) * clingMotion;
    const turnDelta = turnProgress === null ? 0 : getDirectedAngleDelta(turnFromAngle, turnToAngle, turnSpinDirection);
    const turnAngle = turnProgress === null
      ? currentAngle
      : normalizeAngle(turnFromAngle + turnDelta * turnProgress);
    const turnLift = turnProgress === null ? 0 : Math.sin(turnProgress * Math.PI) * 2.6;
    const crawlTilt = clamp((fish.targetYNorm - fish.yNorm) * 0.18, -0.18, 0.18);
    const finalAngle = normalizeAngle(turnAngle + (turnProgress === null ? crawlTilt : crawlTilt * 0.35));
    const image = runtime.images.get(getFishDisplayAssetPath(fish, species, now) || species.asset);
    const width = getFishDisplayWidth(fish, species, now);
    const height = width * (image?.width ? image.height / image.width : .34);
    const pivotX = -width / 2 + width * SUCKER_FISH_FACE_PIVOT_X;
    const pivotY = -height / 2 + height * SUCKER_FISH_FACE_PIVOT_Y;
    const cos = Math.cos(finalAngle);
    const sin = Math.sin(finalAngle);
    const corners = [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]].map(([x, y]) => ({
      x: (x - pivotX) * cos - (y - pivotY) * sin + pivotX,
      y: (x - pivotX) * sin + (y - pivotY) * cos + pivotY
    }));
    const minLocalX = Math.min(...corners.map((point) => point.x));
    const maxLocalX = Math.max(...corners.map((point) => point.x));
    const minLocalY = Math.min(...corners.map((point) => point.y));
    const maxLocalY = Math.max(...corners.map((point) => point.y));
    const unclampedX = fish.xNorm * TANK_WIDTH;
    const unclampedY = fish.yNorm * TANK_HEIGHT - turnLift;
    const safeX = clamp(unclampedX, 8 - minLocalX, TANK_WIDTH - 8 - maxLocalX);
    const safeY = clamp(unclampedY, 8 - minLocalY, TANK_HEIGHT - 8 - maxLocalY);
    return {
      x: safeX,
      y: safeY,
      direction: facing,
      facingScaleX: 1,
      tilt: finalAngle,
      wiggle: clingWiggle,
      bodyScaleX: 1 - Math.abs(clingWiggle) * 0.008,
      bodyScaleY: 1 + Math.abs(clingWiggle) * 0.006,
      swayX: clingWiggle * 0.18,
      isDead: false
    };
  }
  const baseWiggle = Math.sin(wiggleClock + fish.phase * Math.PI * 2) * sickMotionBoost;
  const glide = Math.sin(wiggleClock * 0.48 + fish.phase * Math.PI * 1.4) * sickMotionBoost;
  const entryProgress = getFishEntryProgress(fish, now);
  const entryRightingProgress = getFishEntryRightingProgress(entryProgress);
  const entryRightingEase = entryRightingProgress === null
    ? 1
    : 1 - Math.pow(1 - entryRightingProgress, 3);
  const entryWiggleFactor = entryProgress === null
    ? 1
    : 0.18 + entryRightingEase * 0.82;
  const wiggle = baseWiggle * entryWiggleFactor;
  const easedEntry = entryProgress === null ? null : 1 - Math.pow(1 - entryProgress, 3);
  const renderYNorm = easedEntry === null || fish.entryFromYNorm === null
    ? fish.yNorm
    : fish.entryFromYNorm + (fish.yNorm - fish.entryFromYNorm) * easedEntry;
  const x = fish.xNorm * TANK_WIDTH;
  const targetDistanceNorm = Math.hypot(
    (Number(fish.targetXNorm) || fish.xNorm) - fish.xNorm,
    (Number(fish.targetYNorm) || fish.yNorm) - fish.yNorm
  );
  const stationaryRaw = 1 - clamp(targetDistanceNorm / 0.025, 0, 1);
  const stationaryBlend = stationaryRaw * stationaryRaw * (3 - 2 * stationaryRaw);
  const swimBob =
    Math.sin(wiggleClock * (0.2 + species.bobSpeed * 0.16) + fish.phase * Math.PI * 2) * (0.9 + motionLevel * 4.4) * sickMotionBoost
    + glide * (0.45 + motionLevel * 1.35);
  // Idle vertical drift used to share wiggleClock with movement. That clock
  // changes rate as motion states transition, which can make stationary fish
  // visibly hitch up/down. Use a render-time idle clock and blend into it.
  const idleBobClock = now / 1000;
  const idleBob = Math.sin(idleBobClock * 0.72 + fish.phase * Math.PI * 2) * (0.72 + motionLevel * 0.72) * sickMotionBoost;
  const verticalBob = swimBob * (1 - stationaryBlend) + idleBob * stationaryBlend;
  const y = renderYNorm * TANK_HEIGHT
    + verticalBob
    + (entryProgress === null ? 0 : Math.sin(entryProgress * Math.PI * 2.4 + fish.phase * Math.PI) * (1 - entryProgress) * 9);
  const wiggleStretch = 0.008 + motionLevel * 0.018;
  const turnProgress = fish.turnStartedAt && fish.turnDurationMs > 0
    ? clamp((now - fish.turnStartedAt) / fish.turnDurationMs, 0, 1)
    : null;
  const turnAmount = turnProgress === null ? 0 : Math.sin(turnProgress * Math.PI);
  const turnFromDirection = Number(fish.turnFromDirection) < 0 ? -1 : 1;
  const turnToDirection = Number(fish.turnToDirection) < 0 ? -1 : 1;
  const renderDirection = turnProgress === null
    ? getFishFacingDirection(fish)
    : (turnProgress < 0.5 ? turnFromDirection : turnToDirection);
  const turnLean = turnProgress === null
    ? 0
    : (Number(fish.turnSpinDirection) < 0 ? -1 : 1) * turnAmount * 0.14;
  const baseTilt = clamp(
    (fish.targetYNorm - fish.yNorm) * (0.9 + motionLevel * 0.35)
    + wiggle * (0.008 + motionLevel * 0.04)
    + turnLean,
    -0.26,
    0.26
  );
  const forcedDigPrompt = getForcedGravelDigPrompt(fish, now);
  const forcedDigTilt = forcedDigPrompt
    ? clamp(0.72 + motionLevel * 0.16 + Math.sin(wiggleClock * 1.4 + fish.phase * Math.PI) * 0.05, 0.62, 0.92)
    : null;
  let tilt = entryProgress === null
    ? (forcedDigTilt ?? baseTilt)
    : FISH_ENTRY_NOSE_DIVE_TILT + (baseTilt - FISH_ENTRY_NOSE_DIVE_TILT) * entryRightingEase;
  const debugPoseSteering = fish.activity === "roam" && !fish.caveState
    ? getActiveDebugBehaviorSteering(fish, now)
    : null;
  if (debugPoseSteering?.type === "anticipate-food") {
    const faceDirection = Number.isFinite(Number(debugPoseSteering.faceDirection))
      ? (Number(debugPoseSteering.faceDirection) < 0 ? -1 : 1)
      : renderDirection;
    tilt = clamp(tilt * 0.35 - faceDirection * 0.2, -0.34, 0.34);
  }
  const bodyScaleX = (1 - Math.abs(wiggle) * wiggleStretch) * (1 - turnAmount * (1 - FISH_TURN_MIN_SCALE_X)) * (forcedDigPrompt ? 0.97 : 1);
  const bodyScaleY = (1 + Math.abs(wiggle) * (wiggleStretch * 0.78)) * (1 + turnAmount * (FISH_TURN_MAX_SCALE_Y - 1)) * (forcedDigPrompt ? 1.04 : 1);
  const turnSway = turnProgress === null
    ? 0
    : (Number(fish.turnSpinDirection) < 0 ? -1 : 1) * turnAmount * (0.35 + motionLevel * 0.95);
  return {
    x,
    y,
    direction: fish.direction || 1,
    facingScaleX: renderDirection,
    tilt,
    wiggle,
    bodyScaleX,
    bodyScaleY,
    swayX: wiggle * (0.7 + motionLevel * 1.55)
      + turnSway * (entryProgress === null ? 1 : entryRightingEase),
    isDead: false
  };
}
