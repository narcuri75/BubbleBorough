// Source fragment: assets/image-storage-and-import.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function markGravelStateDirty() {
  runtime.gravelStateDirty = true;
}

function applyLocalGravelDisturbance(originX, originY, options = {}) {
  const radiusPx = Math.max(18, Number(options.radiusPx) || 52);
  const force = clamp(Number(options.force) || 0.35, 0.05, 1.6);
  let changed = false;

  for (const pebble of state.gravelLivePebbles) {
    const pose = resolveLiveGravelPebblePose(pebble);
    if (!pose) {
      continue;
    }

    const dx = pose.x - originX;
    const dy = pose.y - originY;
    const distancePx = Math.hypot(dx, dy);
    if (distancePx > radiusPx) {
      continue;
    }

    const distanceRatio = distancePx / radiusPx;
    const falloff = 1 - distanceRatio;
    const ringLift = Math.max(0, 1 - Math.abs(distanceRatio - 0.62) / 0.24) * force * 1.55;
    const centerDip = Math.max(0, 1 - distanceRatio / 0.42) * force * 3.05;
    const unitX = distancePx > 0.01 ? dx / distancePx : (Math.random() > 0.5 ? 1 : -1);
    const horizontalPushPx = (pebble.size * 0.35 + 6) * falloff * force * (0.8 + Math.abs(unitX) * 0.6);

    if (pebble.surfaceKind === "decor" && pebble.decorId) {
      const decorItem = state.placedDecor.find((item) => item.id === pebble.decorId);
      if (!decorItem) {
        pebble.surfaceKind = "floor";
        pebble.decorId = null;
      } else {
        const profile = getDecorPebbleProfile(decorItem.decorKey);
        pebble.anchorRatio = clamp(pebble.anchorRatio + (unitX * horizontalPushPx) / 160, profile.insetRatio, 1 - profile.insetRatio);
        pebble.liftPx = clamp(pebble.liftPx + ringLift - centerDip, 0, profile.maxLiftPx);
        changed = true;
        continue;
      }
    }

    pebble.xNorm = clamp(pebble.xNorm + (unitX * horizontalPushPx) / TANK_WIDTH, 0.08, 0.92);
    pebble.liftPx = clamp(pebble.liftPx + ringLift - centerDip, 0, GRAVEL_LIVE_LAYER_DEPTH_PX);
    changed = true;
  }

  if (changed) {
    state.gravelLivePebbles = reconcileLooseGravelPebbles(state.gravelLivePebbles, state.placedDecor);
    markGravelStateDirty();
  }
}

function applyDecorGravelInsertion(item) {
  const bounds = getPlacedDecorBounds(item);
  if (!bounds) {
    return;
  }

  const width = bounds.right - bounds.left;
  const radiusPx = clamp(width * 0.44, 52, 168);
  const centerX = item.xNorm * TANK_WIDTH;
  const baseY = bounds.bottom - 4;
  applyLocalGravelDisturbance(centerX, baseY, {
    radiusPx,
    force: clamp(width / 180, 0.5, 1.15)
  });

  let changed = false;
  const profile = getDecorPebbleProfile(item.decorKey);
  for (const pebble of state.gravelLivePebbles) {
    if (pebble.surfaceKind === "decor" && pebble.decorId === item.id) {
      continue;
    }

    const pose = resolveLiveGravelPebblePose(pebble);
    if (!pose) {
      continue;
    }

    const insideFootprint = pose.x >= bounds.left && pose.x <= bounds.right && pose.y >= bounds.bottom - 32 && pose.y <= bounds.bottom + 18;
    if (!insideFootprint) {
      continue;
    }

    const footprintRatio = clamp(Math.abs(pose.x - centerX) / Math.max(18, width * 0.5), 0, 1);
    const edgeDirection = pose.x >= centerX ? 1 : -1;
    if (Math.random() < 0.18) {
      const surface = getDecorPebbleSurfacePose(item, (pose.x - bounds.left) / Math.max(1, width), randomBetween(0, profile.maxLiftPx * 0.46));
      if (surface) {
        pebble.surfaceKind = "decor";
        pebble.decorId = item.id;
        pebble.anchorRatio = surface.anchorRatio;
        pebble.liftPx = surface.liftPx;
        pebble.xNorm = clamp(surface.x / TANK_WIDTH, 0.08, 0.92);
        pebble.yNorm = clamp(surface.y / TANK_HEIGHT, 0.2, 0.98);
        changed = true;
        continue;
      }
    }

    pebble.surfaceKind = "floor";
    pebble.decorId = null;
    pebble.xNorm = clamp(pebble.xNorm + edgeDirection * (0.008 + (1 - footprintRatio) * 0.01), 0.08, 0.92);
    pebble.liftPx = clamp(pebble.liftPx + 0.9 + (1 - footprintRatio) * 1.45, 0, GRAVEL_LIVE_LAYER_DEPTH_PX);
    changed = true;
  }

  if (changed) {
    state.gravelLivePebbles = reconcileLooseGravelPebbles(state.gravelLivePebbles, state.placedDecor);
    markGravelStateDirty();
  }
}

function maybeDisturbGravelByFish(fish, species, now, moveDistance) {
  if (!fish || !species || isFishDead(fish) || moveDistance <= 0.001) {
    return;
  }

  const fishX = fish.xNorm * TANK_WIDTH;
  const fishY = fish.yNorm * TANK_HEIGHT;
  const layerBoundaryY = getFishGravelDigLayerBoundaryY(fish);
  if (layerBoundaryY - fishY > 44) {
    return;
  }

  if (now < (fish.nextGravelDisturbAt || 0)) {
    return;
  }

  maybeSpawnFishGravelDig(fish, species, now, layerBoundaryY);
  fish.nextGravelDisturbAt = now + GRAVEL_FISH_DISTURB_MS_MIN + Math.random() * (GRAVEL_FISH_DISTURB_MS_MAX - GRAVEL_FISH_DISTURB_MS_MIN);
}

function getFishGravelDigLayer(fish, prompt = null) {
  const promptLayer = Number(prompt?.tankLayer);
  return Number.isFinite(promptLayer)
    ? clampTankLayer(promptLayer)
    : getFishTankLayer(fish);
}

function getFishGravelDigLayerBoundaryY(fish, prompt = null) {
  return getTankLayerBottomBoundaryY(getFishGravelDigLayer(fish, prompt));
}

function getFishGravelDigMouthTarget(fish, species, impactX, impactY, direction, now = Date.now()) {
  return getFishTargetNormForMouthPoint(
    fish,
    species,
    impactX,
    impactY,
    now,
    {
      direction,
      minYNorm: 0.14,
      maxYNorm: 0.96
    }
  );
}

function updateForcedFishGravelDigTarget(fish, species, prompt, now = Date.now()) {
  if (!fish || !species || !prompt) {
    return false;
  }

  const digLayer = getFishGravelDigLayer(fish, prompt);
  const targetXNorm = Number.isFinite(Number(prompt.targetXNorm))
    ? clamp(Number(prompt.targetXNorm), 0.08, 0.92)
    : fish.xNorm;
  const targetYNorm = Number.isFinite(Number(prompt.targetYNorm))
    ? clamp(Number(prompt.targetYNorm), 0.2, 0.96)
    : fish.yNorm;

  fish.activity = FISH_GRAVEL_DIG_ACTIVITY;
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  clearFishSchoolFollowState(fish);
  fish.targetXNorm = targetXNorm;
  fish.targetYNorm = targetYNorm;
  fish.targetAt = now + 900;
  setFishDesiredTankLayer(fish, digLayer);

  const direction = Number.isFinite(Number(prompt.direction))
    ? (Number(prompt.direction) < 0 ? -1 : 1)
    : (targetXNorm >= fish.xNorm ? 1 : -1);
  setFishDirection(fish, direction, species, now);
  return true;
}

function completeForcedFishGravelDig(fish, species, prompt, now = Date.now()) {
  if (!fish || !species || !prompt) {
    return false;
  }

  const width = getFishDisplayWidth(fish, species, now);
  let impactX = Number.isFinite(Number(prompt.impactX))
    ? Number(prompt.impactX)
    : fish.xNorm * TANK_WIDTH;
  let impactY = getFishGravelDigLayerBoundaryY(fish, prompt);
  const mouthPoint = getFishGravelPebbleMouthPoint(fish, species, now);
  const mouthDistance = mouthPoint
    ? Math.hypot(mouthPoint.x - impactX, mouthPoint.y - impactY)
    : Math.hypot(fish.xNorm * TANK_WIDTH - impactX, fish.yNorm * TANK_HEIGHT - impactY);
  const promptDuration = Math.max(1000, (Number(prompt.until) || 0) - (Number(prompt.startedAt) || now));
  const timedOut = now > (Number(prompt.startedAt) || now) + promptDuration * 0.82;
  const contactThresholdPx = clamp(width * 0.12, 14, 30);
  if (mouthDistance > contactThresholdPx) {
    const reachedBodyTarget = Math.hypot(fish.targetXNorm - fish.xNorm, fish.targetYNorm - fish.yNorm) <= 0.0035;
    const layerBoundaryY = getFishGravelDigLayerBoundaryY(fish, prompt);
    const mouthLayerGap = mouthPoint ? Math.abs(mouthPoint.y - layerBoundaryY) : Infinity;
    if (reachedBodyTarget && !Number.isFinite(Number(prompt.arrivedAt))) {
      prompt.arrivedAt = now;
    } else if (!reachedBodyTarget) {
      prompt.arrivedAt = null;
    }
    const heldAtTarget = Number.isFinite(Number(prompt.arrivedAt)) && now - Number(prompt.arrivedAt) > 520;
    if (reachedBodyTarget && mouthPoint && (mouthLayerGap <= clamp(width * 0.16, 18, 38) || heldAtTarget)) {
      impactX = clamp(mouthPoint.x, GLASS_MARGIN_X + 8, TANK_WIDTH - GLASS_MARGIN_X - 8);
      impactY = layerBoundaryY;
    } else if (timedOut) {
      clearForcedGravelDigPrompt(fish);
      return false;
    } else {
      return false;
    }
  }

  const direction = Number.isFinite(Number(prompt.direction))
    ? (Number(prompt.direction) < 0 ? -1 : 1)
    : getFishFacingDirection(fish);
  const rootingEffort = clamp(0.68 + (Number(fish.motionLevel) || 0) * 0.18 + clamp(width / 360, 0, 0.14), 0.62, 0.96);
  spawnGravelDigBurst(impactX, impactY + 2, {
    now,
    intensity: rootingEffort,
    count: Math.round(randomBetween(7, 10) * rootingEffort),
    direction,
    surfaceY: impactY,
    scatterPx: 28,
    liftMinPx: 8,
    liftMaxPx: 28
  });
  spawnGravelCloudEffectAtPoint(impactX, impactY - 4, {
    now,
    intensity: clamp(0.9 + rootingEffort * 0.28, 0.9, 1.2),
    countBase: 26,
    countScale: 22,
    sedimentStrength: getSedimentStrength(now, 1.16),
    baseRadius: clamp(width * 0.22, 24, 42),
    driftX: randomBetween(-7, 7),
    driftY: randomBetween(-9, -3),
    durationMs: 3300
  });

  clearForcedGravelDigPrompt(fish);
  fish.targetXNorm = clamp(fish.xNorm - direction * randomBetween(0.04, 0.08), 0.08, 0.92);
  fish.targetYNorm = clamp(fish.yNorm - randomBetween(0.025, 0.055), 0.22, 0.78);
  fish.targetAt = now + 1100;
  fish.nextGravelDisturbAt = now + randomBetween(1500, 2600);
  fish.nextGravelDigAt = now + FISH_GRAVEL_DIG_COOLDOWN_MIN_MS + Math.random() * (FISH_GRAVEL_DIG_COOLDOWN_MAX_MS - FISH_GRAVEL_DIG_COOLDOWN_MIN_MS);
  return true;
}

function maybeSpawnFishGravelDig(fish, species, now, fallbackFloorY) {
  if (!fish || !species || species.behavior === "sucker") {
    return;
  }

  const forceDig = Boolean(getForcedGravelDigPrompt(fish, now));
  if (!forceDig && (now < (fish.nextGravelDigAt || 0) || Math.random() >= FISH_GRAVEL_DIG_CHANCE)) {
    return;
  }

  const width = getFishDisplayWidth(fish, species, now);
  const mouthPoint = getFishGravelPebbleMouthPoint(fish, species, now);
  const direction = getFishFacingDirection(fish);
  const digX = clamp(
    mouthPoint?.x ?? fish.xNorm * TANK_WIDTH + direction * width * 0.28,
    GLASS_MARGIN_X + 12,
    TANK_WIDTH - GLASS_MARGIN_X - 12
  );
  const floorY = getFishGravelDigLayerBoundaryY(fish);
  const mouthY = mouthPoint?.y ?? fish.yNorm * TANK_HEIGHT + width * 0.18;
  const nearFloor = floorY - mouthY < clamp(width * 0.1, 12, 24);
  if (!nearFloor && fallbackFloorY - fish.yNorm * TANK_HEIGHT > width * 0.3) {
    return;
  }

  const rootingEffort = forceDig
    ? clamp(0.68 + (Number(fish.motionLevel) || 0) * 0.18 + clamp(width / 360, 0, 0.14), 0.62, 0.96)
    : clamp(0.38 + (Number(fish.motionLevel) || 0) * 0.22, 0.34, 0.68);
  const digY = floorY - 3;
  spawnGravelDigBurst(digX, digY + 2, {
    now,
    intensity: rootingEffort,
    count: forceDig ? Math.round(randomBetween(7, 10) * rootingEffort) : undefined,
    direction,
    surfaceY: floorY,
    scatterPx: forceDig ? 28 : 18,
    liftMinPx: forceDig ? 8 : 5,
    liftMaxPx: forceDig ? 28 : 17
  });
  spawnGravelCloudEffectAtPoint(digX, digY, {
    now,
    intensity: forceDig ? clamp(0.9 + rootingEffort * 0.28, 0.9, 1.2) : clamp(0.48 + rootingEffort * 0.38, 0.46, 0.78),
    countBase: forceDig ? 26 : 14,
    countScale: forceDig ? 22 : 14,
    sedimentStrength: getSedimentStrength(now, forceDig ? 1.16 : 0.82),
    baseRadius: forceDig ? clamp(width * 0.22, 24, 42) : clamp(width * 0.14, 14, GRAVEL_FISH_DISTURB_RADIUS_PX * 0.48),
    driftX: randomBetween(-7, 7),
    driftY: forceDig ? randomBetween(-9, -3) : randomBetween(-7, -2),
    durationMs: forceDig ? 3300 : undefined
  });
  if (forceDig) {
    clearForcedGravelDigPrompt(fish);
  }
  fish.nextGravelDigAt = now + FISH_GRAVEL_DIG_COOLDOWN_MIN_MS + Math.random() * (FISH_GRAVEL_DIG_COOLDOWN_MAX_MS - FISH_GRAVEL_DIG_COOLDOWN_MIN_MS);
}

function sanitizePellet(pellet) {
  if (!pellet || !Number.isFinite(pellet.createdAt) || !Number.isFinite(pellet.expiresAt)) {
    return null;
  }

  const defaultFoodKey = getDefaultFoodKey();
  const foodMeta = typeof pellet.foodKey === "string" && getFoodMeta(pellet.foodKey)
    ? getFoodMeta(pellet.foodKey)
    : getFoodMeta(defaultFoodKey);
  const hasCustomDropStart = Number.isFinite(Number(pellet.dropStartXNorm))
    && Number.isFinite(Number(pellet.dropStartYNorm));
  const xNorm = clamp(Number(pellet.xNorm) || 0.5, 0.08, 0.92);
  const floorYNorm = clamp(getPelletFloorYNormAtX(xNorm), 0.18, 0.96);
  const settled = Boolean(pellet.settled);
  const yNorm = settled
    ? floorYNorm
    : clamp(Number(pellet.yNorm) || 0.2, 0.09, floorYNorm);
  return {
    id: String(pellet.id || createId("pellet")),
    xNorm,
    yNorm,
    startYNorm: clamp(Number.isFinite(Number(pellet.startYNorm)) ? Number(pellet.startYNorm) : yNorm, 0.09, floorYNorm),
    floorYNorm,
    settled,
    settledAt: settled && Number.isFinite(Number(pellet.settledAt)) ? Number(pellet.settledAt) : null,
    sway: clamp(Number(pellet.sway) || Math.random(), 0, 1),
    targetFishId: typeof pellet.targetFishId === "string" ? pellet.targetFishId : "",
    diseaseRefusalFishId: typeof pellet.diseaseRefusalFishId === "string" ? pellet.diseaseRefusalFishId : "",
    refusalPrecheckedFishId: typeof pellet.refusalPrecheckedFishId === "string" ? pellet.refusalPrecheckedFishId : "",
    foodKey: foodMeta?.id || defaultFoodKey,
    spritePath: resolveStoredFoodDropSpritePath(foodMeta, pellet.spritePath),
    rotation: clamp(Number.isFinite(Number(pellet.rotation)) ? Number(pellet.rotation) : randomBetween(-0.65, 0.65), -1.25, 1.25),
    scale: clamp(
      Number.isFinite(Number(pellet.scale)) ? Number(pellet.scale) : 1,
      0.7,
      1.4
    ),
    sinkDurationMs: clamp(Number(pellet.sinkDurationMs) || FOOD_PELLET_SINK_DURATION_MS, 30 * 1000, 60 * MINUTE_MS),
    dropStartXNorm: hasCustomDropStart ? clamp(Number(pellet.dropStartXNorm), 0.08, 0.92) : null,
    dropStartYNorm: hasCustomDropStart ? clamp(Number(pellet.dropStartYNorm), 0.02, AUTO_DISPENSER_PELLET_MAX_Y_NORM) : null,
    dropDurationMs: hasCustomDropStart
      ? clamp(Number(pellet.dropDurationMs) || AUTO_DISPENSER_DROP_DURATION_MS, 120, 3000)
      : null,
    createdAt: pellet.createdAt,
    expiresAt: pellet.expiresAt
  };
}

function sanitizeEvent(entry) {
  if (!entry || typeof entry.text !== "string") {
    return null;
  }

  const score = Number(entry.score ?? entry.recapScore);
  const sanitized = {
    id: String(entry.id || createId("event")),
    time: Number.isFinite(entry.time) ? entry.time : Date.now(),
    text: entry.text
  };
  if (Number.isFinite(score)) {
    sanitized.score = clamp(Math.round(score), -1, 1);
  }
  if (typeof entry.type === "string" && entry.type.trim()) {
    sanitized.type = entry.type.trim();
  }
  if (typeof entry.fishId === "string" && entry.fishId.trim()) {
    sanitized.fishId = entry.fishId.trim();
  }
  if (typeof entry.decorKey === "string" && entry.decorKey.trim()) {
    sanitized.decorKey = normalizeDecorKey(entry.decorKey);
  }
  if (typeof entry.placedDecorId === "string" && entry.placedDecorId.trim()) {
    sanitized.placedDecorId = entry.placedDecorId.trim();
  }
  if (entry.recapEligible === false) {
    sanitized.recapEligible = false;
  }
  return sanitized;
}

function preloadImages(paths) {
  const preloadTimeoutMs = 12000;
  return Promise.all(
    [...new Set(paths)]
      .filter(Boolean)
      .filter((path) => !runtime.images.has(path))
      .map(
        (path) =>
          new Promise((resolve) => {
            const image = new Image();
            let settled = false;
            const finish = (loaded) => {
              if (settled) {
                return;
              }
              settled = true;
              window.clearTimeout(timeoutId);
              image.onload = null;
              image.onerror = null;
              if (loaded) {
                runtime.images.set(path, image);
              }
              resolve();
            };
            const timeoutId = window.setTimeout(() => {
              const pathLabel = String(path).startsWith("data:")
                ? "embedded custom image"
                : String(path).slice(0, 180);
              console.warn(`Image preload timed out: ${pathLabel}`);
              finish(false);
            }, preloadTimeoutMs);
            image.decoding = "async";
            image.onload = () => finish(true);
            image.onerror = () => finish(false);
            image.src = path;
          })
      )
  );
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = src;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  if (!file) {
    return Promise.reject(new Error("Please choose a save file."));
  }
  if (typeof FileReader === "undefined" && typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onabort = () => reject(new Error("Save file import was cancelled."));
    reader.readAsText(file);
  });
}

function sanitizeCustomImageRefId(value) {
  return typeof value === "string"
    ? value.trim().slice(0, 160)
    : "";
}

function isDataImageUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function setRuntimeImageSource(target, propertyName, source) {
  if (!target || typeof target !== "object") {
    return;
  }

  Object.defineProperty(target, propertyName, {
    value: typeof source === "string" ? source : "",
    enumerable: false,
    configurable: true,
    writable: true
  });
}

function getStoredImageSource(target, runtimeProperty, dataProperty, fallback = "") {
  const runtimeSource = typeof target?.[runtimeProperty] === "string" ? target[runtimeProperty] : "";
  if (runtimeSource) {
    return runtimeSource;
  }

  const embeddedSource = typeof target?.[dataProperty] === "string" ? target[dataProperty] : "";
  return isDataImageUrl(embeddedSource) ? embeddedSource : fallback;
}

function copyRuntimeImageSources(source, target) {
  if (!source || !target) {
    return target;
  }

  for (const propertyName of ["runtimePath", "runtimeBgPath", "runtimeLocalBackgroundImageUrl"]) {
    if (typeof source[propertyName] === "string") {
      setRuntimeImageSource(target, propertyName, source[propertyName]);
    }
  }

  return target;
}

function customImageRequestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Custom image storage request failed."));
  });
}

function customImageTransactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Custom image storage transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Custom image storage transaction was cancelled."));
  });
}

function openCustomImageDb() {
  if (runtime.customImageDbPromise) {
    return runtime.customImageDbPromise;
  }

  runtime.customImageDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = indexedDB.open(CUSTOM_IMAGE_DB_NAME, CUSTOM_IMAGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CUSTOM_IMAGE_DB_STORE)) {
        db.createObjectStore(CUSTOM_IMAGE_DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open custom image storage."));
    request.onblocked = () => reject(new Error("Custom image storage is blocked by another tab."));
  }).catch((error) => {
    runtime.customImageDbPromise = null;
    throw error;
  });

  return runtime.customImageDbPromise;
}

async function putCustomImageRecord(record) {
  const db = await openCustomImageDb();
  const transaction = db.transaction(CUSTOM_IMAGE_DB_STORE, "readwrite");
  transaction.objectStore(CUSTOM_IMAGE_DB_STORE).put(record);
  await customImageTransactionDone(transaction);
  return record;
}

async function getCustomImageRecord(id) {
  const refId = sanitizeCustomImageRefId(id);
  if (!refId) {
    return null;
  }

  const db = await openCustomImageDb();
  const transaction = db.transaction(CUSTOM_IMAGE_DB_STORE, "readonly");
  return customImageRequestToPromise(transaction.objectStore(CUSTOM_IMAGE_DB_STORE).get(refId));
}

async function deleteCustomImageBlob(id) {
  const refId = sanitizeCustomImageRefId(id);
  if (!refId || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const db = await openCustomImageDb();
    const transaction = db.transaction(CUSTOM_IMAGE_DB_STORE, "readwrite");
    transaction.objectStore(CUSTOM_IMAGE_DB_STORE).delete(refId);
    await customImageTransactionDone(transaction);
  } catch (error) {
    console.warn("Custom image delete failed.", error);
  }
}

async function listCustomImageBlobIds() {
  if (typeof indexedDB === "undefined") {
    return [];
  }

  const db = await openCustomImageDb();
  const transaction = db.transaction(CUSTOM_IMAGE_DB_STORE, "readonly");
  const store = transaction.objectStore(CUSTOM_IMAGE_DB_STORE);
  if (typeof store.getAllKeys === "function") {
    return customImageRequestToPromise(store.getAllKeys());
  }

  return new Promise((resolve, reject) => {
    const keys = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(keys);
        return;
      }
      keys.push(cursor.key);
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error("Could not list custom images."));
  });
}

async function clearCustomImageDb() {
  if (typeof indexedDB === "undefined") {
    return;
  }

  try {
    const db = await openCustomImageDb();
    const transaction = db.transaction(CUSTOM_IMAGE_DB_STORE, "readwrite");
    transaction.objectStore(CUSTOM_IMAGE_DB_STORE).clear();
    await customImageTransactionDone(transaction);
  } catch (error) {
    console.warn("Custom image storage clear failed.", error);
  }
}

function dataUrlToBlob(dataUrl) {
  if (!isDataImageUrl(dataUrl) || typeof Blob !== "function") {
    throw new Error("Invalid image data.");
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid image data.");
  }

  const header = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const mimeType = header.match(/^data:([^;,]+)/i)?.[1] || "image/png";
  if (/;base64/i.test(header)) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  }

  return new Blob([decodeURIComponent(payload)], { type: mimeType });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob)) {
      reject(new Error("Missing custom image data."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read custom image data."));
    reader.readAsDataURL(blob);
  });
}

function createRuntimeImageUrl(refId, blob) {
  const imageRefId = sanitizeCustomImageRefId(refId);
  if (!imageRefId || !(blob instanceof Blob) || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return "";
  }

  const existing = runtime.customImageObjectUrls.get(imageRefId);
  if (existing) {
    return existing;
  }

  const url = URL.createObjectURL(blob);
  runtime.customImageObjectUrls.set(imageRefId, url);
  return url;
}

function revokeCustomImageRuntimeUrl(refId) {
  const imageRefId = sanitizeCustomImageRefId(refId);
  const url = imageRefId ? runtime.customImageObjectUrls.get(imageRefId) : "";
  if (!url) {
    return;
  }

  runtime.customImageObjectUrls.delete(imageRefId);
  runtime.images.delete(url);
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn("Custom image URL revoke failed.", error);
  }
}

function revokeUnusedCustomImageRuntimeUrls(referencedIds = collectReferencedCustomImageIds(state)) {
  for (const refId of [...runtime.customImageObjectUrls.keys()]) {
    if (!referencedIds.has(refId)) {
      revokeCustomImageRuntimeUrl(refId);
    }
  }
}

function revokeAllCustomImageRuntimeUrls() {
  for (const refId of [...runtime.customImageObjectUrls.keys()]) {
    revokeCustomImageRuntimeUrl(refId);
  }
}

async function detectCustomImageStorageMode() {
  if (runtime.customImageStorageMode !== "unknown") {
    return runtime.customImageStorageMode;
  }

  if (runtime.customImageStorageTestPromise) {
    return runtime.customImageStorageTestPromise;
  }

  runtime.customImageStorageTestPromise = (async () => {
    try {
      if (
        typeof indexedDB === "undefined"
        || typeof Blob !== "function"
        || typeof URL === "undefined"
        || typeof URL.createObjectURL !== "function"
      ) {
        throw new Error("IndexedDB custom image prerequisites are unavailable.");
      }

      const now = Date.now();
      const testBlob = new Blob(["ok"], { type: "text/plain" });
      await putCustomImageRecord({
        id: CUSTOM_IMAGE_STORAGE_TEST_ID,
        blob: testBlob,
        mimeType: testBlob.type,
        byteSize: testBlob.size,
        createdAt: now,
        updatedAt: now,
        source: "storage-test"
      });
      const loaded = await getCustomImageRecord(CUSTOM_IMAGE_STORAGE_TEST_ID);
      if (!(loaded?.blob instanceof Blob) || loaded.blob.size !== testBlob.size) {
        throw new Error("IndexedDB custom image readback failed.");
      }
      await deleteCustomImageBlob(CUSTOM_IMAGE_STORAGE_TEST_ID);
      runtime.customImageStorageMode = "indexeddb";
    } catch (error) {
      console.warn("IndexedDB custom image storage unavailable; using embedded save images.", error);
      runtime.customImageStorageMode = "embedded";
    }

    return runtime.customImageStorageMode;
  })();

  return runtime.customImageStorageTestPromise;
}

async function putCustomImageBlob(blob, source = "custom-image", preferredId = "") {
  const mode = await detectCustomImageStorageMode();
  if (mode !== "indexeddb" || !(blob instanceof Blob)) {
    return null;
  }

  const now = Date.now();
  const id = sanitizeCustomImageRefId(preferredId) || createId("custom-image");
  return putCustomImageRecord({
    id,
    blob,
    mimeType: blob.type || "image/png",
    byteSize: Number(blob.size) || 0,
    createdAt: now,
    updatedAt: now,
    source: String(source || "custom-image").slice(0, 60)
  });
}

async function getCustomImageBlob(id) {
  const mode = await detectCustomImageStorageMode();
  if (mode !== "indexeddb") {
    return null;
  }

  const record = await getCustomImageRecord(id);
  return record?.blob instanceof Blob ? record.blob : null;
}

function showCustomImageEmbeddedFallbackToastOnce() {
  if (runtime.customImageStorageFallbackWarningShown) {
    return;
  }

  runtime.customImageStorageFallbackWarningShown = true;
  showToast("Custom images will be embedded in the save on this browser.");
}

async function storeCustomImageDataUrl(dataUrl, source = "custom-image") {
  if (!isDataImageUrl(dataUrl)) {
    return {
      imageRefId: "",
      dataUrl: "",
      runtimeUrl: ""
    };
  }

  try {
    if (await detectCustomImageStorageMode() === "indexeddb") {
      const blob = dataUrlToBlob(dataUrl);
      const record = await putCustomImageBlob(blob, source);
      if (record?.id) {
        return {
          imageRefId: record.id,
          dataUrl: "",
          runtimeUrl: createRuntimeImageUrl(record.id, blob)
        };
      }
    }
  } catch (error) {
    console.warn("Custom image IndexedDB write failed; embedding image in save.", error);
    runtime.customImageStorageMode = "embedded";
  }

  showCustomImageEmbeddedFallbackToastOnce();
  return {
    imageRefId: "",
    dataUrl,
    runtimeUrl: dataUrl
  };
}

async function resolveStoredCustomImage(target, options) {
  const refField = options.refField;
  const dataField = options.dataField;
  const runtimeField = options.runtimeField;
  const source = options.source || "custom-image";
  if (!target || typeof target !== "object") {
    return false;
  }

  const embeddedDataUrl = isDataImageUrl(target[dataField]) ? target[dataField] : "";
  const existingRefId = sanitizeCustomImageRefId(target[refField]);
  let changed = false;

  if (await detectCustomImageStorageMode() !== "indexeddb") {
    if (embeddedDataUrl) {
      setRuntimeImageSource(target, runtimeField, embeddedDataUrl);
    }
    return false;
  }

  if (embeddedDataUrl) {
    try {
      const stored = await storeCustomImageDataUrl(embeddedDataUrl, source);
      if (stored.imageRefId) {
        target[refField] = stored.imageRefId;
        target[dataField] = "";
        setRuntimeImageSource(target, runtimeField, stored.runtimeUrl);
        return true;
      }
    } catch (error) {
      console.warn("Custom image migration failed.", error);
    }

    setRuntimeImageSource(target, runtimeField, embeddedDataUrl);
    return changed;
  }

  if (!existingRefId) {
    setRuntimeImageSource(target, runtimeField, "");
    return false;
  }

  try {
    const blob = await getCustomImageBlob(existingRefId);
    if (blob) {
      setRuntimeImageSource(target, runtimeField, createRuntimeImageUrl(existingRefId, blob));
    } else {
      setRuntimeImageSource(target, runtimeField, "");
    }
  } catch (error) {
    console.warn("Custom image hydration failed.", error);
    setRuntimeImageSource(target, runtimeField, "");
  }

  return changed;
}

async function hydrateCustomImagesFromStorage(targetState = state) {
  if (!targetState) {
    return false;
  }

  let changed = false;
  await detectCustomImageStorageMode();

  for (const tank of getAllTanks(targetState)) {
    changed = await resolveStoredCustomImage(tank, {
      refField: "localBackgroundImageRefId",
      dataField: "localBackgroundImageDataUrl",
      runtimeField: "runtimeLocalBackgroundImageUrl",
      source: "local-background"
    }) || changed;
  }

  for (const asset of Object.values(targetState.customDecorAssets || {})) {
    changed = await resolveStoredCustomImage(asset, {
      refField: "imageRefId",
      dataField: "path",
      runtimeField: "runtimePath",
      source: asset?.customType === "hide" ? "custom-hide-front" : "custom-decor"
    }) || changed;

    if (asset?.customType === "hide" || isCustomHideAssetKey(asset?.key)) {
      changed = await resolveStoredCustomImage(asset, {
        refField: "bgImageRefId",
        dataField: "bgPath",
        runtimeField: "runtimeBgPath",
        source: "custom-hide-background"
      }) || changed;
    }
  }

  for (const asset of Object.values(targetState.customFishAssets || {})) {
    changed = await resolveStoredCustomImage(asset, {
      refField: "imageRefId",
      dataField: "path",
      runtimeField: "runtimePath",
      source: "custom-fish"
    }) || changed;
  }

  return changed;
}

function collectReferencedCustomImageIds(targetState = state) {
  const ids = new Set();
  if (!targetState) {
    return ids;
  }

  for (const tank of getAllTanks(targetState)) {
    const refId = sanitizeCustomImageRefId(tank?.localBackgroundImageRefId);
    if (refId) {
      ids.add(refId);
    }
  }

  for (const asset of Object.values(targetState.customDecorAssets || {})) {
    for (const refId of [asset?.imageRefId, asset?.bgImageRefId].map(sanitizeCustomImageRefId)) {
      if (refId) {
        ids.add(refId);
      }
    }
  }

  for (const asset of Object.values(targetState.customFishAssets || {})) {
    const refId = sanitizeCustomImageRefId(asset?.imageRefId);
    if (refId) {
      ids.add(refId);
    }
  }

  return ids;
}

async function cleanupUnusedCustomImages() {
  if (!state || await detectCustomImageStorageMode() !== "indexeddb") {
    revokeUnusedCustomImageRuntimeUrls();
    return;
  }

  const referencedIds = collectReferencedCustomImageIds(state);
  revokeUnusedCustomImageRuntimeUrls(referencedIds);

  try {
    const storedIds = await listCustomImageBlobIds();
    await Promise.all(
      storedIds
        .map(sanitizeCustomImageRefId)
        .filter((refId) => refId && refId !== CUSTOM_IMAGE_STORAGE_TEST_ID && !referencedIds.has(refId))
        .map((refId) => deleteCustomImageBlob(refId))
    );
  } catch (error) {
    console.warn("Custom image cleanup failed.", error);
  }
}

function scheduleCustomImageStorageCleanup() {
  if (runtime.customImageCleanupQueued) {
    return;
  }

  runtime.customImageCleanupQueued = true;
  window.setTimeout(() => {
    runtime.customImageCleanupQueued = false;
    void cleanupUnusedCustomImages();
  }, 0);
}

async function getCustomImageExportDataUrl(owner, options) {
  const embeddedDataUrl = isDataImageUrl(owner?.[options.dataField]) ? owner[options.dataField] : "";
  if (embeddedDataUrl) {
    return embeddedDataUrl;
  }

  const refId = sanitizeCustomImageRefId(owner?.[options.refField]);
  if (!refId) {
    return "";
  }

  const blob = await getCustomImageBlob(refId);
  if (!blob) {
    throw new Error("A custom image is missing from browser storage. Re-import or remove it before exporting.");
  }

  const dataUrl = await blobToDataUrl(blob);
  if (!isDataImageUrl(dataUrl)) {
    throw new Error("A custom image could not be exported.");
  }

  return dataUrl;
}

async function createPortableExportState(sourceState = state) {
  if (!sourceState) {
    return null;
  }

  const exportState = JSON.parse(JSON.stringify(sourceState));
  for (const [index, sourceTank] of getAllTanks(sourceState).entries()) {
    const exportTank = exportState.tanks?.[index];
    if (!exportTank) {
      continue;
    }

    const dataUrl = await getCustomImageExportDataUrl(sourceTank, {
      refField: "localBackgroundImageRefId",
      dataField: "localBackgroundImageDataUrl"
    });
    if (dataUrl) {
      exportTank.localBackgroundImageDataUrl = dataUrl;
    }
    delete exportTank.localBackgroundImageRefId;
  }

  for (const [key, sourceAsset] of Object.entries(sourceState.customDecorAssets || {})) {
    const exportAsset = exportState.customDecorAssets?.[key];
    if (!exportAsset) {
      continue;
    }

    const path = await getCustomImageExportDataUrl(sourceAsset, {
      refField: "imageRefId",
      dataField: "path"
    });
    if (path) {
      exportAsset.path = path;
    }
    delete exportAsset.imageRefId;

    if (sourceAsset?.customType === "hide" || isCustomHideAssetKey(sourceAsset?.key)) {
      const bgPath = await getCustomImageExportDataUrl(sourceAsset, {
        refField: "bgImageRefId",
        dataField: "bgPath"
      });
      if (bgPath) {
        exportAsset.bgPath = bgPath;
      }
      delete exportAsset.bgImageRefId;
    }
  }

  for (const [key, sourceAsset] of Object.entries(sourceState.customFishAssets || {})) {
    const exportAsset = exportState.customFishAssets?.[key];
    if (!exportAsset) {
      continue;
    }

    const path = await getCustomImageExportDataUrl(sourceAsset, {
      refField: "imageRefId",
      dataField: "path"
    });
    if (path) {
      exportAsset.path = path;
    }
    delete exportAsset.imageRefId;
  }

  return exportState;
}

async function prepareLocalBackgroundImageDataUrl(file) {
  if (!(file instanceof File) || !String(file.type || "").startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  const longestEdge = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
  if (!longestEdge) {
    throw new Error("That image could not be loaded.");
  }

  const scale = Math.min(1, MAX_CUSTOM_BACKGROUND_IMAGE_DIMENSION / longestEdge);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/webp", 0.92);
  return compressed && compressed.startsWith("data:image/")
    ? compressed
    : canvas.toDataURL("image/png");
}

async function prepareLocalDecorImageDataUrl(file) {
  if (!(file instanceof File) || !String(file.type || "").startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  const longestEdge = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
  if (!longestEdge) {
    throw new Error("That image could not be loaded.");
  }

  const scale = Math.min(1, MAX_CUSTOM_DECOR_IMAGE_DIMENSION / longestEdge);
  if (scale >= 0.999) {
    return sourceDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/webp", 0.9);
  return compressed && compressed.startsWith("data:image/")
    ? compressed
    : canvas.toDataURL("image/png");
}

async function prepareLocalFishImageDataUrl(file) {
  if (!(file instanceof File) || !String(file.type || "").startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  const longestEdge = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
  if (!longestEdge) {
    throw new Error("That image could not be loaded.");
  }

  const scale = Math.min(1, MAX_CUSTOM_FISH_IMAGE_DIMENSION / longestEdge);
  if (scale >= 0.999) {
    return sourceDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/webp", 0.9);
  return compressed && compressed.startsWith("data:image/")
    ? compressed
    : canvas.toDataURL("image/png");
}

function getImageCoverDrawRect(image, left, top, width, height) {
  if (!image || !width || !height) {
    return null;
  }

  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  return {
    x: left + (width - drawWidth) / 2,
    y: top + (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  };
}

function drawImageCover(context, image, left, top, width, height) {
  if (!context) {
    return;
  }

  const rect = getImageCoverDrawRect(image, left, top, width, height);
  if (!rect) {
    return;
  }

  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function buildAlphaMaskFromBuffer(width, height, alphaBuffer) {
  if (!width || !height || !alphaBuffer?.length) {
    return null;
  }

  const gridWidth = ALPHA_MASK_GRID_SIZE;
  const gridHeight = ALPHA_MASK_GRID_SIZE;
  const grid = new Uint8Array(gridWidth * gridHeight);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = alphaBuffer[(y * width + x) * 4 + 3];
      if (alpha < ALPHA_HIT_THRESHOLD) {
        continue;
      }

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const gridX = clamp(Math.floor((x / width) * gridWidth), 0, gridWidth - 1);
      const gridY = clamp(Math.floor((y / height) * gridHeight), 0, gridHeight - 1);
      grid[gridY * gridWidth + gridX] = 1;
    }
  }

  return {
    width,
    height,
    alpha: alphaBuffer,
    grid,
    gridWidth,
    gridHeight,
    bounds: maxX >= minX && maxY >= minY
      ? {
        minX,
        minY,
        maxX,
        maxY
      }
      : {
        minX: 0,
        minY: 0,
        maxX: width - 1,
        maxY: height - 1
      }
  };
}

function getImageAlphaMask(path) {
  if (!path) {
    return null;
  }

  const cached = runtime.alphaMaskCache.get(path);
  if (cached) {
    return cached;
  }

  const image = runtime.images.get(path);
  if (!image?.width || !image?.height) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const mask = buildAlphaMaskFromBuffer(image.width, image.height, imageData.data);
  if (!mask) {
    return null;
  }

  runtime.alphaMaskCache.set(path, mask);
  return mask;
}

function getDerivedCaveInteriorMask(decor) {
  if (!decor) {
    return null;
  }

  const cacheKey = [decor.path || "", decor.bgPath || "", decor.maskPath || ""].join("|");
  const cached = runtime.caveInteriorMaskCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (decor.maskPath) {
    const explicitMask = getImageAlphaMask(decor.maskPath);
    if (explicitMask) {
      runtime.caveInteriorMaskCache.set(cacheKey, explicitMask);
      return explicitMask;
    }
  }

  const bgMask = decor.bgPath ? getImageAlphaMask(decor.bgPath) : null;
  const frontMask = decor.path ? getImageAlphaMask(decor.path) : null;
  const fallbackMask = bgMask || frontMask;
  if (!fallbackMask) {
    return null;
  }

  runtime.caveInteriorMaskCache.set(cacheKey, fallbackMask);
  return fallbackMask;
}

function getDerivedCaveShellMask(decor) {
  if (!decor) {
    return null;
  }

  const cacheKey = [decor.path || "", decor.bgPath || "", decor.maskPath || ""].join("|");
  const cached = runtime.caveShellMaskCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const frontMask = decor.path ? getImageAlphaMask(decor.path) : null;
  if (decor.customType === "hide" && frontMask) {
    runtime.caveShellMaskCache.set(cacheKey, frontMask);
    return frontMask;
  }
  const bgMask = decor.bgPath ? getImageAlphaMask(decor.bgPath) : null;
  const fallbackMask = bgMask || frontMask || (decor.maskPath ? getImageAlphaMask(decor.maskPath) : null);
  if (!fallbackMask) {
    return null;
  }

  if (!frontMask || !bgMask || frontMask.width !== bgMask.width || frontMask.height !== bgMask.height) {
    runtime.caveShellMaskCache.set(cacheKey, fallbackMask);
    return fallbackMask;
  }

  const alpha = new Uint8ClampedArray(frontMask.alpha.length);
  for (let index = 0; index < alpha.length; index += 4) {
    const frontAlpha = frontMask.alpha[index + 3];
    const bgAlpha = bgMask.alpha[index + 3];
    const solid = frontAlpha >= ALPHA_HIT_THRESHOLD || bgAlpha >= ALPHA_HIT_THRESHOLD;
    alpha[index] = 255;
    alpha[index + 1] = 255;
    alpha[index + 2] = 255;
    alpha[index + 3] = solid ? 255 : 0;
  }

  const shellMask = buildAlphaMaskFromBuffer(frontMask.width, frontMask.height, alpha);
  if (!shellMask) {
    return null;
  }

  runtime.caveShellMaskCache.set(cacheKey, shellMask);
  return shellMask;
}

function getDerivedCaveTriggerMask(decor) {
  if (!decor?.path || !decor?.bgPath) {
    return null;
  }

  const cacheKey = [decor.path || "", decor.bgPath || ""].join("|");
  if (runtime.caveTriggerMaskCache.has(cacheKey)) {
    return runtime.caveTriggerMaskCache.get(cacheKey) || null;
  }

  const frontMask = getImageAlphaMask(decor.path);
  const bgMask = getImageAlphaMask(decor.bgPath);
  if (!frontMask || !bgMask || frontMask.width !== bgMask.width || frontMask.height !== bgMask.height) {
    runtime.caveTriggerMaskCache.set(cacheKey, null);
    return null;
  }

  const alpha = new Uint8ClampedArray(frontMask.alpha.length);
  for (let index = 0; index < alpha.length; index += 4) {
    const frontAlpha = frontMask.alpha[index + 3];
    const bgAlpha = bgMask.alpha[index + 3];
    const isOpeningPixel = bgAlpha >= ALPHA_HIT_THRESHOLD && frontAlpha < ALPHA_HIT_THRESHOLD;
    alpha[index] = 255;
    alpha[index + 1] = 255;
    alpha[index + 2] = 255;
    alpha[index + 3] = isOpeningPixel ? 255 : 0;
  }

  const triggerMask = buildAlphaMaskFromBuffer(frontMask.width, frontMask.height, alpha);
  runtime.caveTriggerMaskCache.set(cacheKey, triggerMask || null);
  return triggerMask;
}

function getMaskRegionsFromAlphaMask(mask, options = ALPHA_HIT_THRESHOLD, cacheSeed = "") {
  const threshold = typeof options === "number"
    ? options
    : (
      Number.isFinite(Number(options?.threshold))
        ? Number(options.threshold)
        : ALPHA_HIT_THRESHOLD
    );
  const minAreaPx = typeof options === "object" && options
    ? Math.max(1, Math.floor(Number(options.minAreaPx) || 12))
    : 12;
  const cacheKey = cacheSeed ? `${cacheSeed}|${threshold}|${minAreaPx}` : "";
  if (cacheKey) {
    const cached = runtime.maskRegionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  if (!mask?.width || !mask?.height) {
    if (cacheKey) {
      runtime.maskRegionCache.set(cacheKey, []);
    }
    return [];
  }

  const width = mask.width;
  const height = mask.height;
  const visited = new Uint8Array(width * height);
  const regions = [];
  const minX = clamp(mask.bounds?.minX ?? 0, 0, width - 1);
  const maxX = clamp(mask.bounds?.maxX ?? (width - 1), 0, width - 1);
  const minY = clamp(mask.bounds?.minY ?? 0, 0, height - 1);
  const maxY = clamp(mask.bounds?.maxY ?? (height - 1), 0, height - 1);
  const idPrefix = cacheSeed || "mask-region";

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) {
        continue;
      }

      visited[pixelIndex] = 1;
      if (mask.alpha[pixelIndex * 4 + 3] < threshold) {
        continue;
      }

      const queue = [pixelIndex];
      let componentMinX = x;
      let componentMaxX = x;
      let componentMinY = y;
      let componentMaxY = y;
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (let head = 0; head < queue.length; head += 1) {
        const currentIndex = queue[head];
        const currentX = currentIndex % width;
        const currentY = Math.floor(currentIndex / width);

        if (currentX < componentMinX) {
          componentMinX = currentX;
        }
        if (currentX > componentMaxX) {
          componentMaxX = currentX;
        }
        if (currentY < componentMinY) {
          componentMinY = currentY;
        }
        if (currentY > componentMaxY) {
          componentMaxY = currentY;
        }

        sumX += currentX;
        sumY += currentY;
        count += 1;

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) {
              continue;
            }

            const nextX = currentX + offsetX;
            const nextY = currentY + offsetY;
            if (nextX < minX || nextX > maxX || nextY < minY || nextY > maxY) {
              continue;
            }

            const nextIndex = nextY * width + nextX;
            if (visited[nextIndex]) {
              continue;
            }

            visited[nextIndex] = 1;
            if (mask.alpha[nextIndex * 4 + 3] < threshold) {
              continue;
            }

            queue.push(nextIndex);
          }
        }
      }

      if (count < minAreaPx) {
        continue;
      }

      const centerX = sumX / count;
      const centerY = sumY / count;
      const denomX = Math.max(1, width - 1);
      const denomY = Math.max(1, height - 1);

      regions.push({
        id: `${idPrefix}#${regions.length + 1}`,
        areaPx: count,
        minX: componentMinX,
        maxX: componentMaxX,
        minY: componentMinY,
        maxY: componentMaxY,
        centerX,
        centerY,
        centerU: centerX / denomX,
        centerV: centerY / denomY,
        minU: componentMinX / denomX,
        maxU: componentMaxX / denomX,
        minV: componentMinY / denomY,
        maxV: componentMaxY / denomY
      });
    }
  }

  regions.sort((left, right) => right.areaPx - left.areaPx);
  if (cacheKey) {
    runtime.maskRegionCache.set(cacheKey, regions);
  }
  return regions;
}

function getMaskRegions(path, options = ALPHA_HIT_THRESHOLD) {
  if (!path) {
    return [];
  }

  const mask = getImageAlphaMask(path);
  return getMaskRegionsFromAlphaMask(mask, options, path);
}

function mapMaskRegionToTank(item, imagePath, region) {
  if (!item || !imagePath || !region) {
    return null;
  }

  const decor = runtime.decorMap.get(item.decorKey);
  const image = runtime.images.get(imagePath);
  if (!decor || !image?.width || !image?.height) {
    return null;
  }

  const width = getDecorDisplayWidth(decor, item);
  const height = width * (image.height / image.width);
  const x = item.xNorm * TANK_WIDTH;
  const y = item.yNorm * TANK_HEIGHT;
  const left = x - width / 2;
  const top = y - height;
  const mappedMinU = resolveDecorHorizontalUnit(item, region.minU);
  const mappedMaxU = resolveDecorHorizontalUnit(item, region.maxU);
  const regionLeft = left + Math.min(mappedMinU, mappedMaxU) * width;
  const regionRight = left + Math.max(mappedMinU, mappedMaxU) * width;
  const regionTop = top + region.minV * height;
  const regionBottom = top + region.maxV * height;
  const regionCenterX = left + resolveDecorHorizontalUnit(item, region.centerU) * width;
  const regionCenterY = top + region.centerV * height;

  return {
    ...region,
    x: regionCenterX,
    y: regionCenterY,
    xNorm: clamp(regionCenterX / TANK_WIDTH, 0.08, 0.92),
    yNorm: clamp(regionCenterY / TANK_HEIGHT, 0.14, 0.8),
    left: regionLeft,
    right: regionRight,
    top: regionTop,
    bottom: regionBottom,
    widthPx: Math.max(1, regionRight - regionLeft),
    heightPx: Math.max(1, regionBottom - regionTop)
  };
}
