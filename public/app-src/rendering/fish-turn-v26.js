// Source fragment: rendering/fish-turn-v26.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function normalizeFishTurnRendererBackend(value, fallback = "v26") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["simple", "v26"].includes(normalized)) {
    return normalized;
  }
  // Phase 15 retired the segmented complex renderer. Treat any stale debug or
  // saved preference for it as v26 rather than reviving a removed backend.
  if (normalized === "legacy-complex") {
    return "v26";
  }
  return fallback;
}

function getFishTurnRendererBackendOverride() {
  return normalizeFishTurnRendererBackend(runtime?.fishTurnRendererBackendOverride, "");
}

function setFishTurnRendererBackendOverride(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    delete runtime.fishTurnRendererBackendOverride;
    return "";
  }
  const next = normalizeFishTurnRendererBackend(normalized, "");
  if (!["simple", "v26"].includes(next)) {
    return getFishTurnRendererBackendOverride();
  }
  runtime.fishTurnRendererBackendOverride = next;
  return next;
}

function resolveFishTurnRendererBackend(
  fish,
  species = getSpeciesForFish(fish),
  animationModeOverride = null
) {
  const normalizedOverride = String(animationModeOverride || "").trim().toLowerCase();
  const animationMode = ["simple", "complex"].includes(normalizedOverride)
    ? normalizedOverride
    : getFishTurnAnimationMode(fish, species);
  if (animationMode !== "complex") {
    return "simple";
  }

  const override = getFishTurnRendererBackendOverride();
  if (["simple", "v26"].includes(override)) {
    return override;
  }

  const configuredRaw = species?.turnRenderer || species?.turnRendererBackend || fish?.turnRendererPreference;
  const configured = normalizeFishTurnRendererBackend(configuredRaw, "v26");
  return configured === "simple" ? "simple" : "v26";
}

function isFishTurnRendererSessionCurrent(fish) {
  const turnStartedAt = Number(fish?.turnStartedAt);
  const rendererStartedAt = Number(fish?.turnRendererStartedAt);
  return Boolean(fish?.turnStartedAt)
    && Number.isFinite(turnStartedAt)
    && Number.isFinite(rendererStartedAt)
    && rendererStartedAt === turnStartedAt;
}

function getFishTurnRendererBackend(fish, species = getSpeciesForFish(fish)) {
  if (isFishTurnRendererSessionCurrent(fish)) {
    const fallback = normalizeFishTurnRendererBackend(fish?.turnRendererFallbackBackend, "");
    if (["simple", "v26"].includes(fallback)) {
      return fallback;
    }
    const latched = normalizeFishTurnRendererBackend(fish?.turnRendererBackend, "");
    if (["simple", "v26"].includes(latched)) {
      return latched;
    }
  }
  return resolveFishTurnRendererBackend(fish, species);
}

function clearFishTurnRendererSession(fish) {
  if (!fish) return;
  fish.turnRendererBackend = null;
  fish.turnRendererFallbackBackend = null;
  fish.turnRendererStartedAt = 0;
  fish.turnV26StyleActive = null;
  fish.turnV26StyleStartedAt = 0;
  fish.turnV26EntryTilt = null;
  fish.turnV26ActiveDepthSign = 0;
  fish.turnV26MotionTiming = null;
  clearFishTurnV26FinOverlaySession(fish);
}

function beginFishTurnRendererSession(
  fish,
  species = getSpeciesForFish(fish),
  now = Date.now(),
  animationModeOverride = null
) {
  if (!fish) return "simple";
  const startedAt = Number.isFinite(Number(fish.turnStartedAt))
    ? Number(fish.turnStartedAt)
    : (Number.isFinite(Number(now)) ? Number(now) : Date.now());
  const backend = resolveFishTurnRendererBackend(fish, species, animationModeOverride);
  fish.turnRendererBackend = backend;
  fish.turnRendererFallbackBackend = null;
  fish.turnRendererStartedAt = startedAt;
  if (backend === "v26") {
    // The visual pose can change on the same simulation tick that requests a
    // reversal. Latch its pre-turn steering tilt so the mesh starts from what
    // the player was actually seeing, rather than the newly selected target.
    const visualPoseKey = String(fish.id || fish.speciesId || "fish");
    const previousVisualPose = runtime?.fishVisualPoseSmoothingStates instanceof Map
      ? runtime.fishVisualPoseSmoothingStates.get(visualPoseKey)
      : null;
    fish.turnV26EntryTilt = Number.isFinite(Number(previousVisualPose?.tilt))
      ? Number(previousVisualPose.tilt)
      : (Number.isFinite(Number(fish.swimTilt)) ? Number(fish.swimTilt) : 0);
    fish.turnV26ActiveDepthSign = chooseFishTurnV26DepthSign(fish);
    fish.turnV26LastDepthSign = fish.turnV26ActiveDepthSign;
    fish.turnV26StyleActive = resolveFishTurnV26Style(fish, species, startedAt);
    fish.turnV26StyleStartedAt = startedAt;
    // Latch subtle per-turn timing variation once. Rendering the same turn on
    // later frames must never reroll its acceleration or midpoint.
    fish.turnV26MotionTiming = createFishTurnV26MotionTimingProfile();
    beginFishTurnV26FinOverlaySession(fish, species, startedAt, now);
  } else {
    fish.turnV26StyleActive = null;
    fish.turnV26StyleStartedAt = 0;
    fish.turnV26ActiveDepthSign = 0;
    fish.turnV26MotionTiming = null;
    clearFishTurnV26FinOverlaySession(fish);
  }
  return backend;
}

function getFishTurnV26DepthSign(fish) {
  return Number(fish?.turnV26ActiveDepthSign) < 0 ? -1 : 1;
}

function getFishTurnV26TurnDepthMode() {
  const requested = String(runtime?.fishTurnV26TurnDepthModeOverride || FISH_TURN_V26_TURN_DEPTH_MODE)
    .trim()
    .toLowerCase();
  return ["both", "toward", "away"].includes(requested) ? requested : "both";
}

function chooseFishTurnV26DepthSign(fish) {
  const mode = getFishTurnV26TurnDepthMode();
  // The camera is on negative Z, so negative depth reads as toward the camera.
  if (mode === "toward") return -1;
  if (mode === "away") return 1;

  const previousDepthSign = Number(fish?.turnV26LastDepthSign);
  const repeatCount = Math.max(0, Number(fish?.turnV26DepthRepeatCount) || 0);
  const depthZ = typeof getFishTankDepthZ === "function"
    ? Math.max(0, Math.min(1, Number(getFishTankDepthZ(fish)) || 0.5))
    : 0.5;
  // Fish near the back have more visual room to turn toward the viewer, while
  // fish near the front are gently biased away. History resists obvious runs
  // without creating the old mechanical toward/away/toward alternation.
  let towardProbability = 0.64 - depthZ * 0.28;
  if (previousDepthSign === -1) towardProbability -= repeatCount >= 2 ? 0.25 : 0.13;
  if (previousDepthSign === 1) towardProbability += repeatCount >= 2 ? 0.25 : 0.13;
  towardProbability = Math.max(0.15, Math.min(0.85, towardProbability));
  const nextDepthSign = Math.random() < towardProbability ? -1 : 1;
  if (fish) {
    fish.turnV26DepthRepeatCount = nextDepthSign === previousDepthSign ? repeatCount + 1 : 0;
  }
  return nextDepthSign;
}

function easeFishTurnV26Continuity(value) {
  const t = clamp(Number(value) || 0, 0, 1);
  return t * t * (3 - 2 * t);
}

function createFishTurnV26MotionTimingProfile(randomFn = Math.random) {
  const nextRandom = typeof randomFn === "function" ? randomFn : Math.random;
  const sample = () => clamp(Number(nextRandom()) || 0, 0, 1);
  return {
    // Keep the visual midpoint close to center while allowing individual turns
    // to arrive there a little earlier or later.
    midpoint: 0.465 + sample() * 0.07,
    // Small power changes alter acceleration/deceleration without producing a
    // visibly different locomotion class or overriding the selected turn style.
    entryPower: 0.90 + sample() * 0.22,
    exitPower: 0.90 + sample() * 0.22
  };
}

function getFishTurnV26MotionTimingProfile(fish) {
  const profile = fish?.turnV26MotionTiming;
  const midpoint = clamp(Number(profile?.midpoint) || 0.5, 0.44, 0.56);
  const entryPower = clamp(Number(profile?.entryPower) || 1, 0.82, 1.18);
  const exitPower = clamp(Number(profile?.exitPower) || 1, 0.82, 1.18);
  return { midpoint, entryPower, exitPower };
}

function getFishTurnV26TimedProgress(fish, value) {
  const t = clamp(Number(value) || 0, 0, 1);
  if (t <= 0 || t >= 1) return t;
  const profile = getFishTurnV26MotionTimingProfile(fish);
  if (t <= profile.midpoint) {
    const local = clamp(t / Math.max(0.001, profile.midpoint), 0, 1);
    return 0.5 * Math.pow(local, profile.entryPower);
  }
  const local = clamp((t - profile.midpoint) / Math.max(0.001, 1 - profile.midpoint), 0, 1);
  return 0.5 + 0.5 * (1 - Math.pow(1 - local, profile.exitPower));
}

function getFishTurnV26VisualProgress(fish, value) {
  return easeFishTurnV26Continuity(getFishTurnV26TimedProgress(fish, value));
}

function getFishTurnV26ApparentThicknessScale(turnProgress) {
  const t = clamp(Number(turnProgress) || 0, 0, 1);
  const edgeOnEnvelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.35);
  return 1 + (FISH_TURN_V26_EDGE_ON_THICKNESS_BOOST - 1) * edgeOnEnvelope;
}

function getFishTurnV26VisualContinuity(fish, currentTilt = 0, now = Date.now()) {
  const turnState = getFishHorizontalTurnState(fish, now);
  const progress = clamp(Number(turnState.progress) || 0, 0, 1);
  const visualProgress = getFishTurnV26VisualProgress(fish, progress);
  const entryEnd = Math.max(0.001, FISH_TURN_V26_CONTINUITY_ENTRY_PROGRESS);
  const exitStart = clamp(FISH_TURN_V26_CONTINUITY_EXIT_PROGRESS, entryEnd, 0.999);
  const meshIn = easeFishTurnV26Continuity(progress / entryEnd);
  const meshOut = 1 - easeFishTurnV26Continuity((progress - exitStart) / Math.max(0.001, 1 - exitStart));
  // Do not crossfade the flat sprite into the turn mesh. That creates a
  // visible ghost/dissolve seam at both ends of the reversal. Once a complex
  // turn starts, the mesh owns the entire active interval; the normal sprite
  // resumes only after the terminal-frame handshake.
  const turnVisualActive = turnState.active && progress < 1;
  const meshAlpha = turnVisualActive ? 1 : 0;
  const current = Number.isFinite(Number(currentTilt)) ? Number(currentTilt) : 0;
  const entry = Number.isFinite(Number(fish?.turnV26EntryTilt))
    ? Number(fish.turnV26EntryTilt)
    : current;
  const exitBlend = easeFishTurnV26Continuity((visualProgress - exitStart) / Math.max(0.001, 1 - exitStart));
  return {
    meshAlpha,
    spriteAlpha: turnVisualActive ? 0 : 1,
    spriteDirection: progress < 0.5 ? turnState.fromDirection : turnState.toDirection,
    tilt: entry + (current - entry) * exitBlend
  };
}

function markFishTurnRendererFallback(fish, backend = "simple") {
  if (!fish || !isFishTurnRendererSessionCurrent(fish)) return false;
  const latched = normalizeFishTurnRendererBackend(fish.turnRendererBackend, "");
  const fallback = normalizeFishTurnRendererBackend(backend, "");
  if (latched !== "v26" || fallback !== "simple") return false;
  fish.turnRendererFallbackBackend = fallback;
  return true;
}

function ensureFishTurnRendererSession(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!fish) return "simple";
  if (isFishTurnRendererSessionCurrent(fish)) {
    return getFishTurnRendererBackend(fish, species);
  }
  if (!fish.turnStartedAt || !(Number(fish.turnDurationMs) > 0)) {
    return resolveFishTurnRendererBackend(fish, species);
  }
  return beginFishTurnRendererSession(fish, species, Number(fish.turnStartedAt) || now);
}

function isFishComplexTurnRendererEligible(
  fish,
  species,
  effectiveBehavior,
  pose,
  suckerFreeSwimming,
  suckerViewTransition
) {
  if (!fish || !species || !pose || pose.isDead) {
    return false;
  }
  if (suckerViewTransition) {
    return false;
  }
  if (effectiveBehavior === "sucker" && !suckerFreeSwimming) {
    return false;
  }
  if (
    !fish.turnStartedAt
    || Number(fish.turnDurationMs) <= 0
    || getFishTurnAnimationMode(fish, species) !== "complex"
  ) {
    return false;
  }

  const turnState = getFishHorizontalTurnState(fish);
  if (!turnState.active || !turnState.reversing) {
    return false;
  }
  // Imported/debug-created active turns may predate the live reversal gateway.
  // Establish the same stable renderer session before v26 is allowed to own a frame.
  ensureFishTurnRendererSession(fish, species, turnState.startedAt);
  return true;
}

function getFishV26SpecialMovementOwner(
  fish,
  species = getSpeciesForFish(fish),
  now = Date.now(),
  options = null
) {
  if (!fish || !species) return "invalid";
  const ownerOptions = options || Object.create(null);

  const pose = ownerOptions.pose || null;
  if (pose?.isDead || (typeof isFishDead === "function" && isFishDead(fish))) {
    return "dead";
  }

  if (runtime?.fishDragState?.fishId === fish.id) {
    return "drag";
  }

  const pendingTravel = Object.prototype.hasOwnProperty.call(ownerOptions, "pendingTravel")
    ? ownerOptions.pendingTravel
    : runtime?.pendingNeighborhoodTravel?.get?.(fish.id);
  if (pendingTravel) {
    return pendingTravel.mode === "tube" ? "tube-travel" : "borough-travel";
  }

  if (typeof getFishEntryProgress === "function" && getFishEntryProgress(fish, now) !== null) {
    return "tank-entry";
  }

  if (typeof isPufferPuffVisualActive === "function" && isPufferPuffVisualActive(fish, now)) {
    return "puffer-puff";
  }

  const effectiveBehavior = ownerOptions.effectiveBehavior || (
    typeof getEffectiveFishBehavior === "function"
      ? getEffectiveFishBehavior(fish, species)
      : species.behavior
  );
  if (effectiveBehavior === "sucker") {
    const suckerViewTransition = Object.prototype.hasOwnProperty.call(ownerOptions, "suckerViewTransition")
      ? ownerOptions.suckerViewTransition
      : (typeof getSuckerFishViewTransitionState === "function"
        ? getSuckerFishViewTransitionState(fish, now)
        : null);
    if (suckerViewTransition) {
      return "sucker-view-transition";
    }
    const suckerFreeSwimming = Object.prototype.hasOwnProperty.call(ownerOptions, "suckerFreeSwimming")
      ? Boolean(ownerOptions.suckerFreeSwimming)
      : (typeof isSuckerFishFreeSwimming === "function"
        ? isSuckerFishFreeSwimming(fish, species, now)
        : false);
    if (!suckerFreeSwimming) {
      return "sucker-attached";
    }
  }

  return null;
}

function canUseFishV26TurnRenderer(
  fish,
  species = getSpeciesForFish(fish),
  now = Date.now(),
  options = {}
) {
  return getFishV26SpecialMovementOwner(fish, species, now, options) === null;
}

function shouldUseFishTurnV26RendererForSprite(
  fish,
  species,
  effectiveBehavior,
  pose,
  suckerFreeSwimming,
  suckerViewTransition,
  now = Date.now(),
  pendingTravel = undefined
) {
  return (
    isFishComplexTurnRendererEligible(
      fish,
      species,
      effectiveBehavior,
      pose,
      suckerFreeSwimming,
      suckerViewTransition
    )
    && getFishTurnRendererBackend(fish, species) === "v26"
    && canUseFishV26TurnRenderer(fish, species, now, {
      effectiveBehavior,
      pose,
      suckerFreeSwimming,
      suckerViewTransition,
      pendingTravel
    })
  );
}

function clearFishTurnV26FinOverlaySession(fish) {
  if (!fish) return;
  fish.turnV26FinOverlayEnabled = false;
  fish.turnV26FinOverlayPath = null;
  fish.turnV26FinOverlayCacheKey = null;
  fish.turnV26FinOverlayStartedAt = 0;
}

function stripFishTurnV26AssetQuery(path) {
  return String(path || "").trim().split(/[?#]/, 1)[0];
}

function normalizeFishTurnV26AssetLookupPath(path) {
  return stripFishTurnV26AssetQuery(path).replace(/^\/+/, "");
}

function getFishTurnV26CompanionFinAssetPath(baseAssetPath) {
  const source = String(baseAssetPath || "").trim();
  if (!source || /^(?:data|blob):/i.test(source)) return null;
  const match = source.match(/^(.*?)(\.[^./?#]+)([?#].*)?$/);
  if (!match) return null;
  return `${match[1]}_fin${match[2]}${match[3] || ""}`;
}

function getFishTurnV26ExplicitFinAssetPath(fish, species = getSpeciesForFish(fish)) {
  const candidates = [
    fish?.finOverlayAsset,
    fish?.finAsset,
    species?.finOverlayAsset,
    species?.finAsset
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || null;
}

function getFishTurnV26SpriteFrameSpec(baseAssetPath) {
  if (!baseAssetPath || typeof getSpriteAssetFrame !== "function") return null;
  const frame = getSpriteAssetFrame(baseAssetPath);
  if (!frame?.sheet?.path || !Array.isArray(frame.rect) || frame.rect.length < 4) return null;
  const rect = frame.rect.slice(0, 4).map((value) => Math.max(0, Math.round(Number(value) || 0)));
  if (rect[2] <= 0 || rect[3] <= 0) return null;
  return {
    name: String(frame.name || ""),
    rect,
    sheetPath: String(frame.sheet.path || "")
  };
}

function getFishTurnV26FinCandidateCacheKey(candidate) {
  if (!candidate?.path) return "";
  const frame = candidate.spriteFrame;
  const frameKey = frame
    ? `|${frame.sheetPath || ""}|${frame.name || ""}|${frame.rect.join(",")}`
    : "";
  return `${candidate.explicit ? "explicit" : "companion"}|${candidate.path}${frameKey}`;
}

function cropFishTurnV26FinSpriteFrame(sheetImage, spriteFrame) {
  if (!spriteFrame) return sheetImage || null;
  if (!sheetImage || typeof document === "undefined") return null;
  const sourceWidth = Math.max(0, Math.round(Number(sheetImage.naturalWidth || sheetImage.width) || 0));
  const sourceHeight = Math.max(0, Math.round(Number(sheetImage.naturalHeight || sheetImage.height) || 0));
  const rect = Array.isArray(spriteFrame.rect)
    ? spriteFrame.rect.slice(0, 4).map((value) => Math.max(0, Math.round(Number(value) || 0)))
    : null;
  if (!rect || rect[2] <= 0 || rect[3] <= 0 || rect[0] + rect[2] > sourceWidth || rect[1] + rect[3] > sourceHeight) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = rect[2];
  canvas.height = rect[3];
  canvas.complete = true;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sheetImage, rect[0], rect[1], rect[2], rect[3], 0, 0, rect[2], rect[3]);
  return canvas;
}

function resolveFishTurnV26FinAssetCandidate(
  fish,
  species = getSpeciesForFish(fish),
  baseAssetPath = null
) {
  const resolvedBasePath = baseAssetPath || (
    typeof getFishDisplayAssetPath === "function"
      ? getFishDisplayAssetPath(fish, species, Date.now())
      : null
  );
  const spriteFrame = getFishTurnV26SpriteFrameSpec(resolvedBasePath);
  const explicitPath = getFishTurnV26ExplicitFinAssetPath(fish, species);
  if (explicitPath) {
    return { path: explicitPath, explicit: true, spriteFrame };
  }
  // Sprite-sheet fish use a parallel _fin atlas. The original fish frame rect
  // is authoritative for the fin crop as well, so no second fin JSON is needed.
  const companionBasePath = spriteFrame?.sheetPath || resolvedBasePath;
  const companionPath = getFishTurnV26CompanionFinAssetPath(companionBasePath);
  return companionPath ? { path: companionPath, explicit: false, spriteFrame } : null;
}

function getFishTurnV26FinDiscoveryCache() {
  if (!(runtime.fishTurnV26FinDiscoveryCache instanceof Map)) {
    runtime.fishTurnV26FinDiscoveryCache = new Map();
  }
  return runtime.fishTurnV26FinDiscoveryCache;
}

function getFishTurnV26FinDimensionWarningSet() {
  if (!(runtime.fishTurnV26FinDimensionWarningSet instanceof Set)) {
    runtime.fishTurnV26FinDimensionWarningSet = new Set();
  }
  return runtime.fishTurnV26FinDimensionWarningSet;
}

async function fishTurnV26ManifestContainsFinAsset(path) {
  if (typeof fetchAssetManifest !== "function") return false;
  const candidate = normalizeFishTurnV26AssetLookupPath(path);
  if (!candidate) return false;
  try {
    const manifest = await fetchAssetManifest();
    const fishAssets = Array.isArray(manifest?.fish) ? manifest.fish : [];
    return fishAssets.some((entry) => {
      const manifestPath = normalizeFishTurnV26AssetLookupPath(entry?.path);
      if (manifestPath === candidate) return true;
      const key = String(entry?.key || "").trim();
      return key && `assets/fish/${key}` === candidate;
    });
  } catch (_error) {
    return false;
  }
}

async function loadFishTurnV26FinAssetCandidate(candidate) {
  if (!candidate?.path || typeof preloadImagePath !== "function") return null;
  const cache = getFishTurnV26FinDiscoveryCache();
  const cacheKey = getFishTurnV26FinCandidateCacheKey(candidate);
  const existing = cache.get(cacheKey);
  if (existing?.status === "ready") return existing;
  if (existing?.status === "absent" || existing?.status === "invalid") return null;
  if (existing?.promise) return existing.promise;

  const state = existing || {
    path: candidate.path,
    explicit: Boolean(candidate.explicit),
    spriteFrame: candidate.spriteFrame || null,
    status: "pending"
  };
  const promise = (async () => {
    if (!candidate.explicit) {
      const exists = await fishTurnV26ManifestContainsFinAsset(candidate.path);
      if (!exists) {
        state.status = "absent";
        state.promise = null;
        return null;
      }
    }
    const result = await preloadImagePath(candidate.path, {
      maxAttempts: 1,
      timeoutMs: 8000,
      retryDelayMs: 0
    });
    const sourceImage = runtime?.images?.get?.(candidate.path);
    const image = candidate.spriteFrame
      ? cropFishTurnV26FinSpriteFrame(sourceImage, candidate.spriteFrame)
      : sourceImage;
    if (result?.loaded && typeof isUsableRuntimeImage === "function" && isUsableRuntimeImage(image)) {
      state.status = "ready";
      state.image = image;
      state.sourceImage = candidate.spriteFrame ? sourceImage : null;
      state.promise = null;
      return state;
    }
    state.status = result?.loaded && candidate.spriteFrame ? "invalid" : "absent";
    state.image = null;
    state.sourceImage = null;
    state.promise = null;
    return null;
  })().catch(() => {
    state.status = "absent";
    state.image = null;
    state.sourceImage = null;
    state.promise = null;
    return null;
  });
  state.promise = promise;
  cache.set(cacheKey, state);
  return promise;
}

function requestFishTurnV26FinAssetCandidate(candidate) {
  if (!candidate?.path) return;
  const cache = getFishTurnV26FinDiscoveryCache();
  const cacheKey = getFishTurnV26FinCandidateCacheKey(candidate);
  const existing = cache.get(cacheKey);
  if (existing?.status === "ready" || existing?.status === "absent" || existing?.status === "invalid" || existing?.promise) {
    return;
  }
  const sourceImage = runtime?.images?.get?.(candidate.path);
  if (typeof isUsableRuntimeImage === "function" && isUsableRuntimeImage(sourceImage)) {
    const image = candidate.spriteFrame
      ? cropFishTurnV26FinSpriteFrame(sourceImage, candidate.spriteFrame)
      : sourceImage;
    if (isUsableRuntimeImage(image)) {
      cache.set(cacheKey, {
        path: candidate.path,
        explicit: Boolean(candidate.explicit),
        spriteFrame: candidate.spriteFrame || null,
        status: "ready",
        image,
        sourceImage: candidate.spriteFrame ? sourceImage : null,
        promise: null
      });
      return;
    }
  }
  void loadFishTurnV26FinAssetCandidate(candidate);
}

function validateFishTurnV26FinImageDimensions(finImage, bodyImage, finPath = "") {
  if (!finImage || !bodyImage) return false;
  const finWidth = Math.max(0, Math.round(Number(finImage.naturalWidth || finImage.width) || 0));
  const finHeight = Math.max(0, Math.round(Number(finImage.naturalHeight || finImage.height) || 0));
  const bodyWidth = Math.max(0, Math.round(Number(bodyImage.naturalWidth || bodyImage.width) || 0));
  const bodyHeight = Math.max(0, Math.round(Number(bodyImage.naturalHeight || bodyImage.height) || 0));
  const valid = finWidth > 0 && finHeight > 0 && finWidth === bodyWidth && finHeight === bodyHeight;
  if (!valid && finWidth > 0 && finHeight > 0 && bodyWidth > 0 && bodyHeight > 0) {
    const warningKey = `${finPath}|${finWidth}x${finHeight}|${bodyWidth}x${bodyHeight}`;
    const warnings = getFishTurnV26FinDimensionWarningSet();
    if (!warnings.has(warningKey)) {
      warnings.add(warningKey);
      console.warn(
        `Fish Turn v26 ignored fin overlay with mismatched dimensions: ${finPath || "fin asset"} `
        + `(${finWidth}x${finHeight}) must match body (${bodyWidth}x${bodyHeight}).`
      );
    }
  }
  return valid;
}

function getReadyFishTurnV26FinOverlay(
  fish,
  species = getSpeciesForFish(fish),
  baseAssetPath = null,
  bodyImage = null
) {
  const candidate = resolveFishTurnV26FinAssetCandidate(fish, species, baseAssetPath);
  if (!candidate?.path) return null;
  const cacheKey = getFishTurnV26FinCandidateCacheKey(candidate);
  const cache = getFishTurnV26FinDiscoveryCache();
  let state = cache.get(cacheKey);
  if (state?.status !== "ready") {
    requestFishTurnV26FinAssetCandidate(candidate);
    state = cache.get(cacheKey);
  }
  const finImage = state?.status === "ready" ? state.image : null;
  if (typeof isUsableRuntimeImage === "function" && isUsableRuntimeImage(finImage)) {
    if (!bodyImage || !validateFishTurnV26FinImageDimensions(finImage, bodyImage, candidate.path)) {
      return null;
    }
    return {
      path: candidate.path,
      image: finImage,
      explicit: Boolean(candidate.explicit),
      cacheKey
    };
  }
  return null;
}

function beginFishTurnV26FinOverlaySession(
  fish,
  species = getSpeciesForFish(fish),
  startedAt = Number(fish?.turnStartedAt) || Date.now(),
  now = Date.now()
) {
  clearFishTurnV26FinOverlaySession(fish);
  if (!fish || !species) return false;
  fish.turnV26FinOverlayStartedAt = Number(startedAt) || 0;
  const baseAssetPath = typeof getFishDisplayAssetPath === "function"
    ? getFishDisplayAssetPath(fish, species, now)
    : null;
  const bodyImage = baseAssetPath ? runtime?.images?.get?.(baseAssetPath) : null;
  const ready = getReadyFishTurnV26FinOverlay(fish, species, baseAssetPath, bodyImage);
  if (!ready) return false;
  fish.turnV26FinOverlayEnabled = true;
  fish.turnV26FinOverlayPath = ready.path;
  fish.turnV26FinOverlayCacheKey = ready.cacheKey || null;
  return true;
}

function getFishTurnV26LatchedFinOverlay(fish, bodyImage = null) {
  if (!fish?.turnV26FinOverlayEnabled) return null;
  if (!isFishTurnRendererSessionCurrent(fish)) return null;
  if (Number(fish.turnV26FinOverlayStartedAt) !== Number(fish.turnStartedAt)) return null;
  const path = String(fish.turnV26FinOverlayPath || "").trim();
  if (!path) return null;
  const cacheKey = String(fish.turnV26FinOverlayCacheKey || "").trim();
  const cached = cacheKey ? getFishTurnV26FinDiscoveryCache().get(cacheKey) : null;
  const image = cached?.status === "ready" ? cached.image : runtime?.images?.get?.(path);
  if (typeof isUsableRuntimeImage !== "function" || !isUsableRuntimeImage(image)) return null;
  if (bodyImage && !validateFishTurnV26FinImageDimensions(image, bodyImage, path)) return null;
  return { path, image, cacheKey: cacheKey || null };
}

function buildFishTurnV26MeshData(
  columns = FISH_TURN_V26_MESH_COLUMNS,
  rows = FISH_TURN_V26_MESH_ROWS
) {
  const safeColumns = Math.max(1, Math.floor(Number(columns) || FISH_TURN_V26_MESH_COLUMNS));
  const safeRows = Math.max(1, Math.floor(Number(rows) || FISH_TURN_V26_MESH_ROWS));
  const vertexCount = (safeColumns + 1) * (safeRows + 1);
  const uv = new Float32Array(vertexCount * 2);
  let uvOffset = 0;

  for (let row = 0; row <= safeRows; row += 1) {
    const v = row / safeRows;
    for (let column = 0; column <= safeColumns; column += 1) {
      const u = column / safeColumns;
      uv[uvOffset] = u;
      uv[uvOffset + 1] = v;
      uvOffset += 2;
    }
  }

  const indexCount = safeColumns * safeRows * 6;
  const indices = new Uint16Array(indexCount);
  let indexOffset = 0;
  const stride = safeColumns + 1;
  for (let row = 0; row < safeRows; row += 1) {
    for (let column = 0; column < safeColumns; column += 1) {
      const topLeft = row * stride + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + stride;
      const bottomRight = bottomLeft + 1;
      indices[indexOffset] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = topRight;
      indices[indexOffset + 4] = bottomLeft;
      indices[indexOffset + 5] = bottomRight;
      indexOffset += 6;
    }
  }

  return {
    columns: safeColumns,
    rows: safeRows,
    vertexCount,
    indexCount,
    uv,
    indices
  };
}

function buildFishTurnV26BinaryMask(rgba, width, height, alphaCutoff = FISH_TURN_V26_ALPHA_CUTOFF) {
  const safeWidth = Math.max(1, Math.floor(Number(width) || 1));
  const safeHeight = Math.max(1, Math.floor(Number(height) || 1));
  const mask = new Uint8Array(safeWidth * safeHeight);
  const cutoff = Number.isFinite(Number(alphaCutoff)) ? Number(alphaCutoff) : FISH_TURN_V26_ALPHA_CUTOFF;
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = Number(rgba?.[index * 4 + 3] || 0) > cutoff ? 1 : 0;
  }
  return mask;
}

function buildFishTurnV26DistanceField(mask, width, height) {
  const safeWidth = Math.max(1, Math.floor(Number(width) || 1));
  const safeHeight = Math.max(1, Math.floor(Number(height) || 1));
  const count = safeWidth * safeHeight;
  const distance = new Float32Array(count);
  const diagonalCost = Math.SQRT2;
  const infinity = 1000000;

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      const index = y * safeWidth + x;
      if (!mask[index]) {
        distance[index] = 0;
        continue;
      }
      let boundary = x === 0 || y === 0 || x === safeWidth - 1 || y === safeHeight - 1;
      if (!boundary) {
        for (let oy = -1; oy <= 1 && !boundary; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            if (!mask[(y + oy) * safeWidth + (x + ox)]) {
              boundary = true;
              break;
            }
          }
        }
      }
      distance[index] = boundary ? 0 : infinity;
    }
  }

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      const index = y * safeWidth + x;
      if (!mask[index] || distance[index] === 0) continue;
      let best = distance[index];
      if (x > 0) best = Math.min(best, distance[index - 1] + 1);
      if (y > 0) best = Math.min(best, distance[index - safeWidth] + 1);
      if (x > 0 && y > 0) best = Math.min(best, distance[index - safeWidth - 1] + diagonalCost);
      if (x + 1 < safeWidth && y > 0) best = Math.min(best, distance[index - safeWidth + 1] + diagonalCost);
      distance[index] = best;
    }
  }

  for (let y = safeHeight - 1; y >= 0; y -= 1) {
    for (let x = safeWidth - 1; x >= 0; x -= 1) {
      const index = y * safeWidth + x;
      if (!mask[index] || distance[index] === 0) continue;
      let best = distance[index];
      if (x + 1 < safeWidth) best = Math.min(best, distance[index + 1] + 1);
      if (y + 1 < safeHeight) best = Math.min(best, distance[index + safeWidth] + 1);
      if (x + 1 < safeWidth && y + 1 < safeHeight) best = Math.min(best, distance[index + safeWidth + 1] + diagonalCost);
      if (x > 0 && y + 1 < safeHeight) best = Math.min(best, distance[index + safeWidth - 1] + diagonalCost);
      distance[index] = Number.isFinite(best) ? Math.min(256, best) : 0;
    }
  }

  return distance;
}

function buildFishTurnV26ColumnMax(distanceField, width, height) {
  const safeWidth = Math.max(1, Math.floor(Number(width) || 1));
  const safeHeight = Math.max(1, Math.floor(Number(height) || 1));
  const columnMax = new Float32Array(safeWidth);
  for (let x = 0; x < safeWidth; x += 1) {
    let maximum = 0;
    for (let y = 0; y < safeHeight; y += 1) {
      maximum = Math.max(maximum, Number(distanceField[y * safeWidth + x]) || 0);
    }
    columnMax[x] = Math.max(maximum, 0.0001);
  }
  return columnMax;
}

function sampleFishTurnV26ScalarFieldBilinear(field, width, height, u, v) {
  const safeWidth = Math.max(1, Math.floor(Number(width) || 1));
  const safeHeight = Math.max(1, Math.floor(Number(height) || 1));
  const x = clamp(Number(u) || 0, 0, 1) * Math.max(0, safeWidth - 1);
  const y = clamp(Number(v) || 0, 0, 1) * Math.max(0, safeHeight - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(safeWidth - 1, x0 + 1);
  const y1 = Math.min(safeHeight - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const top = (Number(field[y0 * safeWidth + x0]) || 0) * (1 - tx)
    + (Number(field[y0 * safeWidth + x1]) || 0) * tx;
  const bottom = (Number(field[y1 * safeWidth + x0]) || 0) * (1 - tx)
    + (Number(field[y1 * safeWidth + x1]) || 0) * tx;
  return top * (1 - ty) + bottom * ty;
}

function sampleFishTurnV26ColumnMax(columnMax, width, u) {
  const safeWidth = Math.max(1, Math.floor(Number(width) || 1));
  const x = clamp(Number(u) || 0, 0, 1) * Math.max(0, safeWidth - 1);
  const x0 = Math.floor(x);
  const x1 = Math.min(safeWidth - 1, x0 + 1);
  const tx = x - x0;
  return Math.max(
    0.0001,
    (Number(columnMax[x0]) || 0.0001) * (1 - tx)
      + (Number(columnMax[x1]) || 0.0001) * tx
  );
}

function buildFishTurnV26VertexShapeData(distanceField, columnMax, width, height, mesh) {
  const bodyDistance = new Float32Array(mesh.vertexCount);
  const bodyLocal = new Float32Array(mesh.vertexCount);
  for (let vertex = 0; vertex < mesh.vertexCount; vertex += 1) {
    const u = mesh.uv[vertex * 2];
    const v = mesh.uv[vertex * 2 + 1];
    const aDist = sampleFishTurnV26ScalarFieldBilinear(distanceField, width, height, u, v);
    const localMaximum = sampleFishTurnV26ColumnMax(columnMax, width, u);
    bodyDistance[vertex] = aDist;
    bodyLocal[vertex] = clamp(aDist / Math.max(localMaximum, 0.0001), 0, 1);
  }
  return { bodyDistance, bodyLocal };
}

function getFishTurnV26ImageCacheIdentity(image) {
  const source = String(image?.currentSrc || image?.src || "").trim();
  if (source) return source;
  if (!runtime.fishTurnV26ImageIdentity) {
    runtime.fishTurnV26ImageIdentity = new WeakMap();
    runtime.fishTurnV26NextImageIdentity = 1;
  }
  if (!runtime.fishTurnV26ImageIdentity.has(image)) {
    runtime.fishTurnV26ImageIdentity.set(image, `image-${runtime.fishTurnV26NextImageIdentity++}`);
  }
  return runtime.fishTurnV26ImageIdentity.get(image);
}

function getFishTurnV26BodyShapeCache() {
  if (!(runtime.fishTurnV26BodyShapeCache instanceof Map)) {
    runtime.fishTurnV26BodyShapeCache = new Map();
  }
  return runtime.fishTurnV26BodyShapeCache;
}

function preprocessFishTurnV26BodyShape(
  image,
  mesh = buildFishTurnV26MeshData(),
  alphaCutoff = FISH_TURN_V26_ALPHA_CUTOFF
) {
  if (!image || Number(image.width) <= 0 || Number(image.height) <= 0 || typeof document === "undefined") {
    return null;
  }
  const imageWidth = Math.max(1, Math.round(Number(image.width) || 1));
  const imageHeight = Math.max(1, Math.round(Number(image.height) || 1));
  const scale = Math.min(1, FISH_TURN_V26_PROCESSING_MAX_DIM / Math.max(imageWidth, imageHeight));
  const width = Math.max(2, Math.round(imageWidth * scale));
  const height = Math.max(2, Math.round(imageHeight * scale));
  const cacheKey = [
    getFishTurnV26ImageCacheIdentity(image),
    `${imageWidth}x${imageHeight}`,
    `process:${width}x${height}`,
    `alpha:${Number(alphaCutoff)}`,
    `mesh:${mesh.columns}x${mesh.rows}`
  ].join("|");
  const cache = getFishTurnV26BodyShapeCache();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const processingCanvas = document.createElement("canvas");
    processingCanvas.width = width;
    processingCanvas.height = height;
    const context = processingCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const mask = buildFishTurnV26BinaryMask(pixels, width, height, alphaCutoff);
    const distanceField = buildFishTurnV26DistanceField(mask, width, height);
    const columnMax = buildFishTurnV26ColumnMax(distanceField, width, height);
    const vertexShape = buildFishTurnV26VertexShapeData(distanceField, columnMax, width, height, mesh);
    const result = {
      cacheKey,
      imageWidth,
      imageHeight,
      processingWidth: width,
      processingHeight: height,
      processingScale: scale,
      alphaCutoff: Number(alphaCutoff),
      distanceField,
      columnMax,
      bodyDistance: vertexShape.bodyDistance,
      bodyLocal: vertexShape.bodyLocal
    };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("Fish Turn v26 body preprocessing failed; using the lightweight turn fallback.", error);
    return null;
  }
}

function getFishTurnV26FinShapeCache() {
  if (!(runtime.fishTurnV26FinShapeCache instanceof Map)) {
    runtime.fishTurnV26FinShapeCache = new Map();
  }
  return runtime.fishTurnV26FinShapeCache;
}

function preprocessFishTurnV26FinShape(
  image,
  mesh = buildFishTurnV26MeshData(),
  alphaCutoff = FISH_TURN_V26_ALPHA_CUTOFF
) {
  if (!image || Number(image.width) <= 0 || Number(image.height) <= 0 || typeof document === "undefined") {
    return null;
  }
  const imageWidth = Math.max(1, Math.round(Number(image.width) || 1));
  const imageHeight = Math.max(1, Math.round(Number(image.height) || 1));
  const scale = Math.min(1, FISH_TURN_V26_PROCESSING_MAX_DIM / Math.max(imageWidth, imageHeight));
  const width = Math.max(2, Math.round(imageWidth * scale));
  const height = Math.max(2, Math.round(imageHeight * scale));
  const cacheKey = [
    getFishTurnV26ImageCacheIdentity(image),
    `${imageWidth}x${imageHeight}`,
    `fin-process:${width}x${height}`,
    `alpha:${Number(alphaCutoff)}`,
    `mesh:${mesh.columns}x${mesh.rows}`
  ].join("|");
  const cache = getFishTurnV26FinShapeCache();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const processingCanvas = document.createElement("canvas");
    processingCanvas.width = width;
    processingCanvas.height = height;
    const context = processingCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const mask = buildFishTurnV26BinaryMask(pixels, width, height, alphaCutoff);
    const finDistanceField = buildFishTurnV26DistanceField(mask, width, height);
    const finColMax = buildFishTurnV26ColumnMax(finDistanceField, width, height);
    const vertexShape = buildFishTurnV26VertexShapeData(finDistanceField, finColMax, width, height, mesh);
    const result = {
      cacheKey,
      imageWidth,
      imageHeight,
      processingWidth: width,
      processingHeight: height,
      processingScale: scale,
      alphaCutoff: Number(alphaCutoff),
      finDistanceField,
      finColMax,
      finLocal: vertexShape.bodyLocal
    };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("Fish Turn v26 fin preprocessing failed; rendering this turn without the fin overlay.", error);
    return null;
  }
}

function getFishTurnV26FinSettings(fish, species = getSpeciesForFish(fish)) {
  const finiteOrDefault = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    distance: clamp(
      finiteOrDefault(fish?.finDistance ?? species?.finDistance, FISH_TURN_V26_FIN_DISTANCE),
      0,
      450
    ),
    frontAttachmentDistance: clamp(
      finiteOrDefault(
        fish?.frontAttachmentDistance ?? fish?.finFrontAttachmentDistance
          ?? species?.frontAttachmentDistance ?? species?.finFrontAttachmentDistance,
        FISH_TURN_V26_FIN_FRONT_ATTACHMENT_DISTANCE
      ),
      0,
      100
    ),
    taper: clamp(
      finiteOrDefault(fish?.finTapering ?? fish?.finTaper ?? species?.finTapering ?? species?.finTaper, FISH_TURN_V26_FIN_TAPER),
      0,
      100
    )
  };
}

function computeFishTurnV26FinGap(
  finLocal,
  sourceHorizontal,
  finDistance = FISH_TURN_V26_FIN_DISTANCE,
  frontAttachmentDistance = FISH_TURN_V26_FIN_FRONT_ATTACHMENT_DISTANCE,
  finTaper = FISH_TURN_V26_FIN_TAPER
) {
  const h = clamp(Number(sourceHorizontal) || 0, -1, 1);
  const aFinLocal = clamp(Number(finLocal) || 0, 0, 1);
  const uFinGap = Math.max(0, Number(finDistance) || 0) / 450;
  const uFinAttach = clamp((Number(frontAttachmentDistance) || 0) / 100, 0, 1);
  const uFinTaper = clamp((Number(finTaper) || 0) / 100, 0, 1);
  const front01 = clamp((h + 1) * 0.5, 0, 1);
  const attachStart = 1 - uFinAttach;
  const frontAttached = uFinAttach <= 0.001
    ? 0
    : (() => {
      const x = clamp((front01 - attachStart) / Math.max(0.0001, 1 - attachStart), 0, 1);
      return x * x * (3 - 2 * x);
    })();
  const attachMask = 1 - frontAttached;
  const finPower = 0.55 + (2.40 - 0.55) * uFinTaper;
  const finProfile = Math.pow(aFinLocal, finPower);
  return uFinGap * finProfile * attachMask;
}

function getFishTurnV26SourceDirection() {
  return String(FISH_SWIM_ANIMATION?.sourceOrientation || "right-facing").trim().toLowerCase().startsWith("left")
    ? -1
    : 1;
}

function normalizeFishTurnV26Style(value, fallback = FISH_TURN_V26_DEFAULT_STYLE) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  const aliases = {
    "2": "banked-flex",
    "#2": "banked-flex",
    "tester-2": "banked-flex",
    "banked": "banked-flex",
    "banked-flex-turn": "banked-flex",
    "banked-flex": "banked-flex",
    "3": "tail-loaded-c-turn",
    "#3": "tail-loaded-c-turn",
    "tester-3": "tail-loaded-c-turn",
    "tail-loaded": "tail-loaded-c-turn",
    "c-turn": "tail-loaded-c-turn",
    "tail-loaded-c-turn": "tail-loaded-c-turn",
    "4": "head-led",
    "#4": "head-led",
    "tester-4": "head-led",
    "head-led-turn": "head-led",
    "head-led": "head-led",
    "9": "wide-fluid-u-turn",
    "#9": "wide-fluid-u-turn",
    "tester-9": "wide-fluid-u-turn",
    "wide-u-turn": "wide-fluid-u-turn",
    "wide-fluid": "wide-fluid-u-turn",
    "wide-fluid-u-turn": "wide-fluid-u-turn",
    "portal-tight": "portal-tight",
    "cave-clearance": "portal-tight",
    "clearance-tight": "portal-tight"
  };
  const fallbackNormalized = String(fallback || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (aliases[normalized]) return aliases[normalized];
  if (aliases[fallbackNormalized]) return aliases[fallbackNormalized];
  return fallbackNormalized ? "head-led" : "";
}

function getFishTurnV26StyleOverride() {
  return normalizeFishTurnV26Style(runtime?.fishTurnV26StyleOverride, "");
}

function setFishTurnV26StyleOverride(value = "") {
  const normalizedRaw = String(value || "").trim();
  if (!normalizedRaw) {
    delete runtime.fishTurnV26StyleOverride;
    return "";
  }
  const normalized = normalizeFishTurnV26Style(normalizedRaw, "");
  if (!normalized) {
    return getFishTurnV26StyleOverride();
  }
  runtime.fishTurnV26StyleOverride = normalized;
  return normalized;
}

function getFishTurnV26BehaviorContext(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const activity = String(fish?.activity || "").trim().toLowerCase();
  const intent = fish?.behaviorIntent && (!Number(fish.behaviorIntent.expiresAt) || Number(fish.behaviorIntent.expiresAt) > now)
    ? fish.behaviorIntent
    : null;
  const intentText = `${String(intent?.type || "")} ${String(intent?.cause || "")}`.trim().toLowerCase();
  const queue = typeof getFishActionQueueState === "function" && fish?.id
    ? getFishActionQueueState(fish.id)
    : null;
  const activeAction = String(queue?.active?.action || "").trim().toLowerCase();
  const actionSteering = runtime?.fishActionSteeringByFishId instanceof Map && fish?.id
    ? runtime.fishActionSteeringByFishId.get(fish.id)
    : null;
  const debugSteering = runtime?.debugBehaviorSteeringByFishId instanceof Map && fish?.id
    ? runtime.debugBehaviorSteeringByFishId.get(fish.id)
    : null;
  const steeringType = String(actionSteering?.type || debugSteering?.type || "").trim().toLowerCase();
  const breedingSequence = runtime?.fishBreedingSequence || runtime?.debugBreedingSequence || null;
  const breedingActive = Boolean(
    fish?.id
    && breedingSequence
    && (breedingSequence.leftFishId === fish.id || breedingSequence.rightFishId === fish.id)
  );
  const collisionAvoidanceActive = typeof getActiveFishCollisionAvoidance === "function"
    ? Boolean(getActiveFishCollisionAvoidance(fish, now))
    : false;
  const schoolLeading = Boolean(
    typeof getFishSchoolActiveFollowers === "function"
    && getFishSchoolActiveFollowers(fish, now).length > 0
  );
  const schoolFollowing = Boolean(
    (Number(fish?.followUntil) || 0) > now
    || fish?.schoolRole === "follower"
    || fish?.schoolSource === "schooling"
    || steeringType === "follow"
  );
  const schoolFormationActive = schoolLeading || schoolFollowing;
  const panicActive = (Number(fish?.panicUntil) || 0) > now;
  const speedMin = Math.max(0, Number(species?.speedMin) || 0);
  const speedMax = Math.max(speedMin + 0.000001, Number(species?.speedMax) || speedMin + 1);
  const currentSpeed = Math.max(0, Number(fish?.swimSpeed) || Number(fish?.traversalSpeedNorm) || speedMin);
  const speedRatio = clamp((currentSpeed - speedMin) / Math.max(0.000001, speedMax - speedMin), 0, 1);
  const xNorm = clamp(Number(fish?.xNorm) || 0.5, 0, 1);
  const yNorm = clamp(Number(fish?.yNorm) || 0.5, 0, 1);
  const targetXNorm = Number.isFinite(Number(fish?.targetXNorm)) ? Number(fish.targetXNorm) : xNorm;
  const targetYNorm = Number.isFinite(Number(fish?.targetYNorm)) ? Number(fish.targetYNorm) : yNorm;
  const targetDistance = Math.hypot(targetXNorm - xNorm, targetYNorm - yNorm);
  const edgeClearance = Math.min(xNorm, 1 - xNorm, yNorm, 1 - yNorm);
  const actionText = `${activity} ${activeAction} ${steeringType} ${intentText}`;
  const precisionInteraction = Boolean(
    fish?.caveState
    || breedingActive
    || activity === "feeding"
    || activity === FISH_GRAVEL_DIG_ACTIVITY
    || activity === FISH_GRAVEL_PEBBLE_ACTIVITY
    || /\b(eat|feed|food|dig|pebble|mate|breed|inspect|service|visit|hide|rest|sleep)\b/.test(actionText)
  );
  const forceful = Boolean(
    panicActive
    || (Number(fish?.panicSpeedBoost) || 0) > 1.15
    || /\b(attack|chase|strike|striking|lunge|pounce|pouncing|ambush|flee|avoid|retreat|startled|dart|zoomies|burst|high-speed|confrontation|yield)\b/.test(actionText)
  );
  const caveClearanceConstrained = typeof isFishNearCaveShellForTurn === "function"
    ? isFishNearCaveShellForTurn(fish, species, now)
    : Boolean(fish?.caveState);
  const constrained = Boolean(
    collisionAvoidanceActive
    || caveClearanceConstrained
    || edgeClearance < 0.115
    || targetDistance < 0.055
    || fish?.caveState
  );
  const relaxedCruise = Boolean(
    !precisionInteraction
    && !forceful
    && !schoolFormationActive
    && !collisionAvoidanceActive
    && activity === "roam"
    && edgeClearance >= 0.14
    && targetDistance >= 0.10
    && speedRatio <= 0.78
    && (!intentText || /\b(cruise|wander|patrol|roam|companion|explor|open-water)\b/.test(intentText))
  );

  return {
    activity,
    intentText,
    activeAction,
    steeringType,
    breedingActive,
    collisionAvoidanceActive,
    caveClearanceConstrained,
    schoolLeading,
    schoolFollowing,
    schoolFormationActive,
    panicActive,
    precisionInteraction,
    forceful,
    constrained,
    relaxedCruise,
    speedRatio,
    targetDistance,
    edgeClearance
  };
}

function selectFishTurnV26StyleForContext(
  fish,
  species = getSpeciesForFish(fish),
  now = Date.now(),
  randomValue = Math.random()
) {
  const context = getFishTurnV26BehaviorContext(fish, species, now);
  const roll = clamp(Number(randomValue) || 0, 0, 0.999999);

  // Cave mouths and nearby solid cave shells need a turn whose rendered mesh
  // stays inside the authoritative fish footprint. Geometry safety wins over
  // personality/style randomization for this one reversal.
  if (context.caveClearanceConstrained || ["align", "portal-enter", "exit", "depart", "portal-exit"].includes(fish?.caveState)) {
    return "portal-tight";
  }

  // Fast threat responses and forceful reversals should read as decisive.
  if (context.forceful) {
    return "tail-loaded-c-turn";
  }

  // Precision mechanics keep the visual body close to the authoritative pose.
  // A constrained precision turn banks; otherwise the deliberate head-led turn
  // keeps feeding, gravel, breeding, cave, and decor interactions visually tight.
  if (context.precisionInteraction) {
    return context.constrained ? "banked-flex" : "head-led";
  }

  // An active school is one visual group. Leaders and followers both stay on
  // compact paths so a leader cannot visually U-turn far away from followers
  // whose authoritative formation anchors still surround its gameplay pose.
  if (context.schoolFormationActive) {
    return context.constrained ? "banked-flex" : "head-led";
  }

  // Collision recovery, tank-edge corrections, and very short target changes
  // use the compact banked turn instead of a wide render-space arc.
  if (context.constrained) {
    return "banked-flex";
  }

  // Relaxed open-water reversals use the wide U-turn most often, with a small
  // amount of head-led variation so cruising fish do not repeat one animation.
  if (context.relaxedCruise) {
    return roll < 0.76 ? "wide-fluid-u-turn" : "head-led";
  }

  // Faster non-panic movement can still justify an energetic C-turn, but the
  // neutral head-led style remains the ordinary deliberate fallback.
  if (context.speedRatio >= 0.82) {
    return roll < 0.58 ? "tail-loaded-c-turn" : "head-led";
  }

  return "head-led";
}

function resolveFishTurnV26Style(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const overrideRaw = String(runtime?.fishTurnV26StyleOverride || "").trim();
  if (overrideRaw) {
    return normalizeFishTurnV26Style(overrideRaw);
  }
  const explicitStyle = fish?.turnV26Style || fish?.turnStyle || species?.turnV26Style;
  if (String(explicitStyle || "").trim()) {
    return normalizeFishTurnV26Style(explicitStyle, FISH_TURN_V26_DEFAULT_STYLE);
  }
  return normalizeFishTurnV26Style(
    selectFishTurnV26StyleForContext(fish, species, now),
    FISH_TURN_V26_DEFAULT_STYLE
  );
}

function getFishTurnV26Style(fish) {
  const turnStartedAt = Number(fish?.turnStartedAt);
  const styleStartedAt = Number(fish?.turnV26StyleStartedAt);
  if (
    Boolean(fish?.turnStartedAt)
    && Number.isFinite(turnStartedAt)
    && Number.isFinite(styleStartedAt)
    && styleStartedAt === turnStartedAt
    && fish?.turnV26StyleActive
  ) {
    return normalizeFishTurnV26Style(fish.turnV26StyleActive);
  }
  return resolveFishTurnV26Style(fish, getSpeciesForFish(fish));
}

function easeFishTurnV26CubicInOut(t) {
  const clamped = clamp(Number(t) || 0, 0, 1);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

function easeFishTurnV26Sine(t) {
  const clamped = clamp(Number(t) || 0, 0, 1);
  return (1 - Math.cos(Math.PI * clamped)) / 2;
}

function getFishTurnV26StyleDefinition(styleValue) {
  const style = normalizeFishTurnV26Style(styleValue);
  switch (style) {
    case "portal-tight":
      return {
        id: "portal-tight",
        testerId: 0,
        name: "Cave Clearance Turn",
        bendScale: 0.82,
        bias: 0,
        waveScale: 0.16,
        waveSpeed: 1.0,
        yawEase: "sine"
      };
    case "banked-flex":
      return {
        id: "banked-flex",
        testerId: 2,
        name: "Banked Flex Turn",
        bendScale: 1.05,
        bias: 0,
        waveScale: 0.36,
        waveSpeed: 1.45,
        yawEase: "cubic"
      };
    case "tail-loaded-c-turn":
      return {
        id: "tail-loaded-c-turn",
        testerId: 3,
        name: "Tail-loaded C-turn",
        bendScale: 1.22,
        bias: -0.22,
        waveScale: 0.62,
        waveSpeed: 1.85,
        yawEase: "sine"
      };
    case "wide-fluid-u-turn":
      return {
        id: "wide-fluid-u-turn",
        testerId: 9,
        name: "Wide Fluid U-turn",
        bendScale: 1.05,
        bias: 0,
        waveScale: 0.36,
        waveSpeed: 1.45,
        yawEase: "sine"
      };
    case "head-led":
    default:
      return {
        id: "head-led",
        testerId: 4,
        name: "Head-led Turn",
        bendScale: 1.10,
        bias: 0.22,
        waveScale: 0.28,
        waveSpeed: 1.15,
        yawEase: "sine"
      };
  }
}

function computeFishTurnV26StyleTransform(
  styleValue,
  turnProgress,
  sourceDirection = getFishTurnV26SourceDirection(),
  turnDepthSign = 1
) {
  const style = getFishTurnV26StyleDefinition(styleValue);
  const t = clamp(Number(turnProgress) || 0, 0, 1);
  const d = Number(sourceDirection) < 0 ? -1 : 1;
  const depthSign = Number(turnDepthSign) < 0 ? -1 : 1;
  const B = Math.sin(Math.PI * t);
  const doubleSine = Math.sin(2 * Math.PI * t);
  const sineEase = easeFishTurnV26Sine(t);
  const cubicEase = easeFishTurnV26CubicInOut(t);
  let motionX = 0;
  let motionY = 0;
  let motionZ = 0;
  let rotationXDegrees = 0;
  let rotationYDegrees = 0;
  let rotationZDegrees = 0;

  switch (style.id) {
    case "portal-tight":
      // Rotate almost in place. The ordinary cinematic styles translate the
      // mesh in screen space, which is attractive in open water but can sweep
      // a head or tail through a cave rim despite a valid gameplay collision
      // pose. Portal-tight keeps that visual trajectory essentially centered.
      motionX = 0;
      motionY = 0;
      motionZ = 0.035 * B;
      rotationXDegrees = -2 * B;
      rotationYDegrees = 180 * sineEase * d;
      rotationZDegrees = 3 * doubleSine * d;
      break;
    case "banked-flex":
      motionX = 35 * Math.sin(Math.PI * t) * d;
      motionY = -20 * B;
      motionZ = 0.10 * B;
      rotationXDegrees = -6 * B;
      rotationYDegrees = 180 * cubicEase * d;
      rotationZDegrees = 16 * doubleSine * d;
      break;
    case "tail-loaded-c-turn":
      motionX = 55 * B * d;
      motionY = -12 * B;
      motionZ = 0.12 * B;
      rotationXDegrees = 0;
      rotationYDegrees = 180 * sineEase * d;
      rotationZDegrees = 10 * B * d;
      break;
    case "wide-fluid-u-turn":
      motionX = 150 * Math.sin(Math.PI * t) * d;
      motionY = -68 * B;
      motionZ = 0.18 * B;
      rotationXDegrees = -6 * B;
      rotationYDegrees = 180 * sineEase * d;
      rotationZDegrees = 18 * doubleSine * d;
      break;
    case "head-led":
    default:
      motionX = -35 * B * d;
      motionY = 10 * B;
      motionZ = 0.08 * B;
      rotationXDegrees = 3 * B;
      rotationYDegrees = 180 * sineEase * d;
      rotationZDegrees = -8 * B * d;
      break;
  }

  motionZ *= depthSign;
  rotationYDegrees *= depthSign;
  const degreesToRadians = Math.PI / 180;
  return {
    style,
    turnDepthSign: depthSign,
    t,
    bendEnvelope: B,
    motionX,
    motionY,
    motionZ,
    translationX: motionX / FISH_TURN_V26_TRAJECTORY_UNIT_SCALE,
    translationY: -motionY / FISH_TURN_V26_TRAJECTORY_UNIT_SCALE,
    translationZ: motionZ,
    rotationXDegrees,
    rotationYDegrees,
    rotationZDegrees,
    rotationX: rotationXDegrees * degreesToRadians,
    rotationY: rotationYDegrees * degreesToRadians,
    rotationZ: rotationZDegrees * degreesToRadians
  };
}

function computeFishTurnV26SpinePoint(
  sourceX,
  turnProgress,
  sourceDirection = getFishTurnV26SourceDirection(),
  bendScale = 1,
  bias = 0,
  waveScale = 1,
  waveSpeed = 1,
  turnDepthSign = 1
) {
  const clampedSourceX = clamp(Number(sourceX) || 0, -1, 1);
  const t = clamp(Number(turnProgress) || 0, 0, 1);
  const d = Number(sourceDirection) < 0 ? -1 : 1;
  const safeBendScale = Number.isFinite(Number(bendScale)) ? Number(bendScale) : 1;
  const safeBias = Number.isFinite(Number(bias)) ? Number(bias) : 0;
  const safeWaveScale = Number.isFinite(Number(waveScale)) ? Number(waveScale) : 1;
  const safeWaveSpeed = Number.isFinite(Number(waveSpeed)) ? Number(waveSpeed) : 1;
  const depthSign = Number(turnDepthSign) < 0 ? -1 : 1;
  const h = clampedSourceX * d;
  const tailWeight = (1 - h) * 0.5;
  const B = Math.sin(Math.PI * t);
  const bodyFlex = FISH_TURN_V26_Z_AXIS_BODY_FLEX / 100;
  const tailFlex = FISH_TURN_V26_TAIL_FOLLOW_THROUGH / 100;
  const A = -1.95 * bodyFlex * B * safeBendScale * d * depthSign;
  const aa = Math.max(Math.abs(A), 0.0001);
  const signedA = A < 0 ? -aa : aa;
  const halfA = 0.5 * signedA;

  let xHead;
  let zArc;
  if (Math.abs(A) < 0.002) {
    xHead = h;
    zArc = 0;
  } else {
    xHead = 2 * Math.sin(halfA * h) / signedA;
    zArc = 2 * (1 - Math.cos(halfA * h)) / signedA;
  }
  zArc *= 1 + safeBias * h;

  const wave = 0.165
    * tailFlex
    * B
    * safeWaveScale
    * Math.sin(Math.PI * (h * 0.92 - t * safeWaveSpeed))
    * (-tailWeight)
    * depthSign;

  return {
    x: xHead * d,
    z: zArc + wave,
    h,
    bendEnvelope: B,
    bendAmount: A,
    wave
  };
}

function computeFishTurnV26SpineFrame(
  sourceX,
  turnProgress,
  sourceDirection = getFishTurnV26SourceDirection(),
  bendScale = 1,
  bias = 0,
  waveScale = 1,
  waveSpeed = 1,
  turnDepthSign = 1
) {
  const epsilon = FISH_TURN_V26_SPINE_EPSILON;
  const center = computeFishTurnV26SpinePoint(
    sourceX,
    turnProgress,
    sourceDirection,
    bendScale,
    bias,
    waveScale,
    waveSpeed,
    turnDepthSign
  );
  const plus = computeFishTurnV26SpinePoint(
    clamp(Number(sourceX) + epsilon, -1, 1),
    turnProgress,
    sourceDirection,
    bendScale,
    bias,
    waveScale,
    waveSpeed,
    turnDepthSign
  );
  const minus = computeFishTurnV26SpinePoint(
    clamp(Number(sourceX) - epsilon, -1, 1),
    turnProgress,
    sourceDirection,
    bendScale,
    bias,
    waveScale,
    waveSpeed,
    turnDepthSign
  );
  const dx = plus.x - minus.x;
  const dz = plus.z - minus.z;
  const length = Math.max(Math.hypot(dx, dz), 0.000001);
  const tangent = { x: dx / length, z: dz / length };
  const normal = { x: -tangent.z, z: tangent.x };
  return { center, tangent, normal };
}

function getFishTurnV26ModelScale(fishAspect) {
  const safeAspect = Math.max(0.0001, Number(fishAspect) || 1);
  const fovRadians = FISH_TURN_V26_FOV_DEGREES * Math.PI / 180;
  const uncappedModelScale = safeAspect
    * Math.abs(FISH_TURN_V26_CAMERA_Z)
    * Math.tan(fovRadians * 0.5);
  const modelScale = Math.min(FISH_TURN_V26_MAX_MODEL_SCALE, uncappedModelScale);
  return {
    uncappedModelScale,
    modelScale,
    projectionCompensation: clamp(
      modelScale / Math.max(uncappedModelScale, 0.0001),
      0.0001,
      1
    )
  };
}

function getFishTurnV26ThicknessShapeAtUv(bodyShape, u, v, sourceDirection = getFishTurnV26SourceDirection()) {
  if (!bodyShape?.distanceField || !bodyShape?.columnMax) {
    return null;
  }
  const safeU = clamp(Number(u) || 0, 0, 1);
  const safeV = clamp(Number(v) || 0, 0, 1);
  const sourceX = (safeU - 0.5) * 2;
  const d = Number(sourceDirection) < 0 ? -1 : 1;
  const h = sourceX * d;
  const aDist = sampleFishTurnV26ScalarFieldBilinear(
    bodyShape.distanceField,
    bodyShape.processingWidth,
    bodyShape.processingHeight,
    safeU,
    safeV
  );
  const columnMaximum = sampleFishTurnV26ColumnMax(
    bodyShape.columnMax,
    bodyShape.processingWidth,
    safeU
  );
  const aLocal = clamp(aDist / Math.max(columnMaximum, 0.0001), 0, 1);
  const edge01 = clamp(aDist / Math.max(FISH_TURN_V26_EDGE_REACH, 0.001), 0, 1);
  const edgePower = 2.6 + (0.42 - 2.6) * (FISH_TURN_V26_EDGE_ROUNDNESS / 100);
  const roundedEdge = Math.pow(edge01, edgePower);
  const edgeShape = 1 + (roundedEdge - 1) * (FISH_TURN_V26_EDGE_CLOSURE / 100);
  const localPower = 1.55 + (0.50 - 1.55) * (FISH_TURN_V26_CROSS_SECTION / 100);
  const crossShape = Math.pow(clamp(aLocal, 0, 1), localPower);
  const center = clamp(1 - Math.abs(h), 0, 1);
  const lengthPower = 1.95 + (0.75 - 1.95) * (FISH_TURN_V26_MID_BODY_FULLNESS / 100);
  const lengthShape = Math.pow(center, lengthPower);
  const baseBodyShape = 1 + (lengthShape - 1) * (FISH_TURN_V26_END_THINNING / 100);
  const faceRaw = clamp((h - 0.10) / 0.80, 0, 1);
  const faceMask = faceRaw * faceRaw * (3 - 2 * faceRaw);
  const faceBoost = 1 + 1.25 * (FISH_TURN_V26_FACE_HEAD_THICKNESS / 100) * faceMask;
  const bodyShapeValue = Math.min(baseBodyShape * faceBoost, 1.35);
  return {
    aDist,
    aLocal,
    sourceX,
    h,
    edgeShape,
    crossShape,
    faceMask,
    faceBoost,
    bodyShape: bodyShapeValue,
    thicknessShape: edgeShape * crossShape * bodyShapeValue
  };
}

function projectFishTurnV26UvPoint(options) {
  options = options || {};
  const safeU = clamp(Number(options.u) || 0, 0, 1);
  const safeV = clamp(Number(options.v) || 0, 0, 1);
  const fishAspect = Math.max(0.0001, Number(options.fishAspect) || 1);
  const turnProgress = clamp(Number(options.turnProgress) || 0, 0, 1);
  const sourceDirection = Number(options.sourceDirection) < 0 ? -1 : 1;
  const turnDepthSign = Number(options.turnDepthSign) < 0 ? -1 : 1;
  const facingDirection = Number(options.facingDirection) < 0 ? -1 : 1;
  const layer = Number.isFinite(Number(options.layer)) ? Number(options.layer) : 0;
  const drawWidth = Math.max(0.0001, Number(options.drawWidth) || 1);
  const drawHeight = Math.max(0.0001, Number(options.drawHeight) || (drawWidth / fishAspect));
  const drawX = Number.isFinite(Number(options.drawX)) ? Number(options.drawX) : -drawWidth / 2;
  const thicknessShape = clamp(Number(options.thicknessShape) || 0, 0, 1);
  const styleTransform = computeFishTurnV26StyleTransform(
    options.styleValue || FISH_TURN_V26_DEFAULT_STYLE,
    turnProgress,
    sourceDirection,
    turnDepthSign
  );
  const sourceX = (safeU - 0.5) * 2;
  const spineFrame = computeFishTurnV26SpineFrame(
    sourceX,
    turnProgress,
    sourceDirection,
    styleTransform.style.bendScale,
    styleTransform.style.bias,
    styleTransform.style.waveScale,
    styleTransform.style.waveSpeed,
    turnDepthSign
  );
  const apparentThicknessScale = getFishTurnV26ApparentThicknessScale(turnProgress);
  const depth = layer * (FISH_TURN_V26_THICKNESS / 450) * apparentThicknessScale * thicknessShape;
  const surfaceX = spineFrame.center.x + spineFrame.normal.x * depth;
  const surfaceZ = spineFrame.center.z + spineFrame.normal.z * depth;
  const sourceY = (0.5 - safeV) * (2 / fishAspect);
  const modelScaleState = getFishTurnV26ModelScale(fishAspect);
  let x = surfaceX * modelScaleState.modelScale;
  let y = sourceY * modelScaleState.modelScale;
  let z = surfaceZ * modelScaleState.modelScale;

  const cosX = Math.cos(styleTransform.rotationX);
  const sinX = Math.sin(styleTransform.rotationX);
  [y, z] = [cosX * y - sinX * z, sinX * y + cosX * z];

  const cosY = Math.cos(styleTransform.rotationY);
  const sinY = Math.sin(styleTransform.rotationY);
  [x, z] = [cosY * x + sinY * z, -sinY * x + cosY * z];

  const cosZ = Math.cos(styleTransform.rotationZ);
  const sinZ = Math.sin(styleTransform.rotationZ);
  [x, y] = [cosZ * x - sinZ * y, sinZ * x + cosZ * y];

  x += styleTransform.translationX;
  y += styleTransform.translationY;
  z += styleTransform.translationZ;

  const projectionCompensation = Math.max(modelScaleState.projectionCompensation, 0.0001);
  x = (x - styleTransform.translationX) / projectionCompensation + styleTransform.translationX;
  y = (y - styleTransform.translationY) / projectionCompensation + styleTransform.translationY;
  z += FISH_TURN_V26_CAMERA_Z;

  const fovRadians = FISH_TURN_V26_FOV_DEGREES * Math.PI / 180;
  const f = 1 / Math.tan(fovRadians * 0.5);
  const clipW = -z;
  if (!(clipW > 0.0001)) {
    return null;
  }
  const ndcX = (x * f / fishAspect / FISH_TURN_V26_RENDER_PADDING_X) / clipW;
  const ndcY = (y * f / FISH_TURN_V26_RENDER_PADDING_Y) / clipW;
  const paddedDrawWidth = drawWidth * FISH_TURN_V26_RENDER_PADDING_X;
  const paddedDrawHeight = drawHeight * FISH_TURN_V26_RENDER_PADDING_Y;
  const paddedDrawX = drawX - (paddedDrawWidth - drawWidth) / 2;
  const paddedDrawY = -drawHeight / 2 - (paddedDrawHeight - drawHeight) / 2;
  const canvasX = paddedDrawX + ((ndcX + 1) * 0.5) * paddedDrawWidth;
  const canvasY = paddedDrawY + ((1 - ndcY) * 0.5) * paddedDrawHeight;
  return {
    x: canvasX * facingDirection,
    y: canvasY,
    ndcX,
    ndcY,
    depth,
    layer,
    turnProgress,
    style: styleTransform.style.id
  };
}

function getFishTurnV26VisualAnchorLocalPoint(
  fish,
  shapeImage,
  drawX,
  drawWidth,
  drawHeight,
  u,
  v,
  now = Date.now(),
  options = {}
) {
  if (!fish || !shapeImage || Number(shapeImage.width) <= 0 || Number(shapeImage.height) <= 0) {
    return null;
  }
  const species = options.species || getSpeciesForFish(fish);
  if (getFishTurnRendererBackend(fish, species) !== "v26") {
    return null;
  }
  if (typeof canUseFishV26TurnRenderer === "function" && !canUseFishV26TurnRenderer(fish, species, now)) {
    return null;
  }
  const turnState = getFishHorizontalTurnState(fish, now);
  if (!turnState.active || !turnState.reversing) {
    return null;
  }
  const renderer = getFishTurnV26RendererState();
  if (!renderer) {
    return null;
  }
  const bodyShape = preprocessFishTurnV26BodyShape(shapeImage, renderer.mesh);
  if (!bodyShape) {
    return null;
  }
  const sourceDirection = getFishTurnV26SourceDirection();
  const thickness = getFishTurnV26ThicknessShapeAtUv(bodyShape, u, v, sourceDirection);
  if (!thickness) {
    return null;
  }
  const style = getFishTurnV26Style(fish);
  const turnDepthSign = getFishTurnV26DepthSign(fish);
  const visualProgress = getFishTurnV26VisualProgress(fish, turnState.progress);
  const styleTransform = computeFishTurnV26StyleTransform(
    style,
    visualProgress,
    sourceDirection,
    turnDepthSign
  );
  const nearSide = Math.cos(styleTransform.rotationY) >= 0 ? 1 : -1;
  const requestedSurface = String(options.surface || "near").trim().toLowerCase();
  const layer = requestedSurface === "center" ? 0 : nearSide;
  return projectFishTurnV26UvPoint({
    u,
    v,
    fishAspect: Number(shapeImage.width) / Math.max(1, Number(shapeImage.height)),
    turnProgress: visualProgress,
    sourceDirection,
    turnDepthSign,
    facingDirection: getFishFacingDirection(fish),
    layer,
    thicknessShape: thickness.thicknessShape,
    styleValue: style,
    drawX,
    drawWidth,
    drawHeight
  });
}

function compileFishTurnV26Shader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader compile error.";
    gl.deleteShader(shader);
    console.warn("Fish Turn v26 shader compilation failed.", message);
    return null;
  }
  return shader;
}

function createFishTurnV26RendererState() {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  }) || canvas.getContext("experimental-webgl", {
    alpha: true,
    antialias: false,
    depth: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  });
  if (!gl) return null;

  const vertexShader = compileFishTurnV26Shader(gl, gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 a_uv;
    attribute float a_bodyDist;
    attribute float a_bodyLocal;
    attribute float a_finLocal;
    uniform float u_layer;
    uniform float u_thickness;
    uniform float u_edgeReach;
    uniform float u_edgeClosure;
    uniform float u_edgeRoundness;
    uniform float u_endThinning;
    uniform float u_midBodyFullness;
    uniform float u_crossSection;
    uniform float u_faceThickness;
    uniform float u_finMode;
    uniform float u_finGap;
    uniform float u_finAttach;
    uniform float u_finTaper;
    uniform float u_finSideSign;
    uniform float u_fishAspect;
    uniform float u_turnProgress;
    uniform float u_sourceDirection;
    uniform float u_turnDepthSign;
    uniform float u_bodyFlex;
    uniform float u_tailFlex;
    uniform float u_spineEpsilon;
    uniform float u_bendScale;
    uniform float u_bias;
    uniform float u_waveScale;
    uniform float u_waveSpeed;
    uniform float u_modelScale;
    uniform float u_rotationX;
    uniform float u_rotationY;
    uniform float u_rotationZ;
    uniform float u_translationX;
    uniform float u_translationY;
    uniform float u_translationZ;
    uniform float u_renderPaddingX;
    uniform float u_renderPaddingY;
    uniform float u_projectionCompensation;
    uniform float u_cameraZ;
    uniform float u_fovRadians;
    uniform float u_near;
    uniform float u_far;
    varying vec2 v_uv;
    const float FISH_TURN_PI = 3.14159265358979323846;

    vec2 fishTurnV26Spine(float sourceX) {
      float t = clamp(u_turnProgress, 0.0, 1.0);
      float h = sourceX * u_sourceDirection;
      float tailWeight = (1.0 - h) * 0.5;
      float B = sin(FISH_TURN_PI * t);
      float A = -1.95 * u_bodyFlex * B * u_bendScale * u_sourceDirection * u_turnDepthSign;
      float aa = max(abs(A), 0.0001);
      float signedA = A < 0.0 ? -aa : aa;
      float halfA = 0.5 * signedA;
      float xHead;
      float zArc;
      if (abs(A) < 0.002) {
        xHead = h;
        zArc = 0.0;
      } else {
        xHead = 2.0 * sin(halfA * h) / signedA;
        zArc = 2.0 * (1.0 - cos(halfA * h)) / signedA;
      }
      zArc *= 1.0 + u_bias * h;
      float wave = 0.165
        * u_tailFlex
        * B
        * u_waveScale
        * sin(FISH_TURN_PI * (h * 0.92 - t * u_waveSpeed))
        * (-tailWeight)
        * u_turnDepthSign;
      return vec2(xHead * u_sourceDirection, zArc + wave);
    }

    void main() {
      v_uv = a_uv;
      float sourceX = (a_uv.x - 0.5) * 2.0;
      float h = sourceX * u_sourceDirection;

      float edge01 = clamp(a_bodyDist / max(u_edgeReach, 0.001), 0.0, 1.0);
      float edgePower = mix(2.6, 0.42, u_edgeRoundness);
      float roundedEdge = pow(edge01, edgePower);
      float edgeShape = mix(1.0, roundedEdge, u_edgeClosure);

      float localPower = mix(1.55, 0.50, u_crossSection);
      float crossShape = pow(clamp(a_bodyLocal, 0.0, 1.0), localPower);

      float center = clamp(1.0 - abs(h), 0.0, 1.0);
      float lengthShape = pow(center, mix(1.95, 0.75, u_midBodyFullness));
      float bodyShape = mix(1.0, lengthShape, u_endThinning);
      float faceMask = smoothstep(0.10, 0.90, h);
      float faceBoost = 1.0 + 1.25 * u_faceThickness * faceMask;
      bodyShape = min(bodyShape * faceBoost, 1.35);
      float thicknessShape = edgeShape * crossShape * bodyShape;
      float depth = u_layer * u_thickness * thicknessShape;
      if (u_finMode > 0.5) {
        float front01 = clamp((h + 1.0) * 0.5, 0.0, 1.0);
        float attachStart = 1.0 - u_finAttach;
        float frontAttached = u_finAttach <= 0.001
          ? 0.0
          : smoothstep(attachStart, 1.0, front01);
        float attachMask = 1.0 - frontAttached;
        float finPower = mix(0.55, 2.40, u_finTaper);
        float finProfile = pow(clamp(a_finLocal, 0.0, 1.0), finPower);
        float finGap = u_finGap * finProfile * attachMask;
        depth += u_finSideSign * finGap;
      }

      vec2 spinePosition = fishTurnV26Spine(sourceX);
      vec2 pPlus = fishTurnV26Spine(clamp(sourceX + u_spineEpsilon, -1.0, 1.0));
      vec2 pMinus = fishTurnV26Spine(clamp(sourceX - u_spineEpsilon, -1.0, 1.0));
      vec2 tangent = normalize(pPlus - pMinus);
      vec2 localNormal = vec2(-tangent.y, tangent.x);
      vec2 surface = spinePosition + localNormal * depth;

      float y = (0.5 - a_uv.y) * (2.0 / max(u_fishAspect, 0.0001));
      vec3 position = vec3(surface.x, y, surface.y);

      // Approved model order: Translation * RotationZ * RotationY * RotationX * Scale.
      // In vertex-operation order that is scale, X rotation, Y rotation, Z rotation, translation.
      position *= u_modelScale;

      float cosX = cos(u_rotationX);
      float sinX = sin(u_rotationX);
      position = vec3(
        position.x,
        cosX * position.y - sinX * position.z,
        sinX * position.y + cosX * position.z
      );

      float cosY = cos(u_rotationY);
      float sinY = sin(u_rotationY);
      position = vec3(
        cosY * position.x + sinY * position.z,
        position.y,
        -sinY * position.x + cosY * position.z
      );

      float cosZ = cos(u_rotationZ);
      float sinZ = sin(u_rotationZ);
      position = vec3(
        cosZ * position.x - sinZ * position.y,
        sinZ * position.x + cosZ * position.y,
        position.z
      );

      position += vec3(u_translationX, u_translationY, u_translationZ);

      // Camera-safety normalization is projection-only: preserve the exact
      // approved translation while restoring the endpoint sprite footprint
      // after capping the internal 3D model scale for very long fish.
      float projectionCompensation = max(u_projectionCompensation, 0.0001);
      position.x = (position.x - u_translationX) / projectionCompensation + u_translationX;
      position.y = (position.y - u_translationY) / projectionCompensation + u_translationY;
      position.z += u_cameraZ;

      float f = 1.0 / tan(u_fovRadians * 0.5);
      float projectionAspect = max(u_fishAspect, 0.0001);
      float clipX = position.x * f / projectionAspect / max(u_renderPaddingX, 1.0);
      float clipY = position.y * f / max(u_renderPaddingY, 1.0);
      float clipZ = ((u_far + u_near) / (u_near - u_far)) * position.z
        + ((2.0 * u_far * u_near) / (u_near - u_far));
      float clipW = -position.z;
      gl_Position = vec4(clipX, clipY, clipZ, clipW);
    }
  `);
  const fragmentShader = compileFishTurnV26Shader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_layerAlpha;
    uniform float u_rgbMultiplier;
    varying vec2 v_uv;
    void main() {
      vec4 c = texture2D(u_texture, v_uv);
      float edgeFeather = smoothstep(0.02, 0.22, c.a);
      if (edgeFeather < 0.01) discard;
      float finalAlpha = c.a * u_layerAlpha * edgeFeather;
      gl_FragColor = vec4(c.rgb * u_rgbMultiplier, finalAlpha);
    }
  `);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown shader link error.";
    gl.deleteProgram(program);
    console.warn("Fish Turn v26 shader linking failed.", message);
    return null;
  }

  const mesh = buildFishTurnV26MeshData();
  const uvBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  if (!uvBuffer || !indexBuffer) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.uv, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  const uniformNames = [
    "u_texture", "u_layer", "u_thickness", "u_edgeReach", "u_edgeClosure",
    "u_edgeRoundness", "u_endThinning", "u_midBodyFullness", "u_crossSection", "u_faceThickness",
    "u_finMode", "u_finGap", "u_finAttach", "u_finTaper", "u_finSideSign",
    "u_fishAspect", "u_turnProgress", "u_sourceDirection", "u_turnDepthSign", "u_bodyFlex",
    "u_tailFlex", "u_spineEpsilon", "u_bendScale", "u_bias", "u_waveScale", "u_waveSpeed",
    "u_modelScale", "u_rotationX", "u_rotationY", "u_rotationZ",
    "u_translationX", "u_translationY", "u_translationZ", "u_renderPaddingX", "u_renderPaddingY",
    "u_projectionCompensation", "u_cameraZ", "u_fovRadians", "u_near", "u_far",
    "u_layerAlpha", "u_rgbMultiplier"
  ];
  const uniforms = Object.fromEntries(
    uniformNames.map((name) => [name, gl.getUniformLocation(program, name)])
  );

  const renderer = {
    canvas,
    gl,
    program,
    mesh,
    uvBuffer,
    indexBuffer,
    bodyGpuBuffers: new Map(),
    finGpuBuffers: new Map(),
    bodyGpuTextures: new Map(),
    finGpuTextures: new Map(),
    uvLocation: gl.getAttribLocation(program, "a_uv"),
    bodyDistanceLocation: gl.getAttribLocation(program, "a_bodyDist"),
    bodyLocalLocation: gl.getAttribLocation(program, "a_bodyLocal"),
    finLocalLocation: gl.getAttribLocation(program, "a_finLocal"),
    uniforms,
    failed: false
  };

  if (typeof canvas.addEventListener === "function") {
    canvas.addEventListener("webglcontextlost", (event) => {
      event?.preventDefault?.();
      disposeFishTurnV26RendererState(renderer, true);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      if (runtime.fishTurnV26RendererState?.failed) {
        runtime.fishTurnV26RendererState = null;
      }
    });
  }

  return renderer;
}

function getFishTurnV26RendererState() {
  if (runtime.fishTurnV26RendererState?.failed) return null;
  if (!runtime.fishTurnV26RendererState) {
    const state = createFishTurnV26RendererState();
    runtime.fishTurnV26RendererState = state || { failed: true };
  }
  return runtime.fishTurnV26RendererState?.failed
    ? null
    : runtime.fishTurnV26RendererState;
}

function disposeFishTurnV26RendererState(renderer = runtime?.fishTurnV26RendererState, markFailed = false) {
  if (!renderer || !renderer.gl) return false;
  const gl = renderer.gl;
  for (const buffers of renderer.bodyGpuBuffers?.values?.() || []) {
    gl.deleteBuffer?.(buffers?.distanceBuffer);
    gl.deleteBuffer?.(buffers?.localBuffer);
  }
  for (const buffer of renderer.finGpuBuffers?.values?.() || []) {
    gl.deleteBuffer?.(buffer);
  }
  for (const texture of renderer.bodyGpuTextures?.values?.() || []) {
    gl.deleteTexture?.(texture);
  }
  for (const texture of renderer.finGpuTextures?.values?.() || []) {
    gl.deleteTexture?.(texture);
  }
  renderer.bodyGpuBuffers?.clear?.();
  renderer.finGpuBuffers?.clear?.();
  renderer.bodyGpuTextures?.clear?.();
  renderer.finGpuTextures?.clear?.();
  gl.deleteBuffer?.(renderer.uvBuffer);
  gl.deleteBuffer?.(renderer.indexBuffer);
  gl.deleteProgram?.(renderer.program);
  renderer.failed = Boolean(markFailed);
  if (runtime.fishTurnV26RendererState === renderer) {
    runtime.fishTurnV26RendererState = markFailed ? { failed: true } : null;
  }
  return true;
}

function getFishTurnV26GpuTexture(renderer, image, kind = "body") {
  if (!renderer?.gl || !image) return null;
  const cache = kind === "fin" ? renderer.finGpuTextures : renderer.bodyGpuTextures;
  if (!(cache instanceof Map)) return null;
  const width = Math.max(1, Math.round(Number(image.naturalWidth || image.width) || 1));
  const height = Math.max(1, Math.round(Number(image.naturalHeight || image.height) || 1));
  const cacheKey = `${getFishTurnV26ImageCacheIdentity(image)}|${width}x${height}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const gl = renderer.gl;
  const texture = gl.createTexture();
  if (!texture) return null;
  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Bubble Borough fish UVs use v=0 at the TOP of the source sprite.
    // DOM image uploads already preserve that top-row-at-v=0 convention for this mesh,
    // so flipping during upload turns the entire fish upside down the instant v26 takes over.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    cache.set(cacheKey, texture);
    return texture;
  } catch (error) {
    gl.deleteTexture?.(texture);
    return null;
  }
}

function getFishTurnV26ActiveTurnCount(now = Date.now()) {
  const frameKey = Number(now) || 0;
  if (runtime.fishTurnV26ActiveCountFrame === frameKey) {
    return Number(runtime.fishTurnV26ActiveCount) || 0;
  }
  const fishList = typeof state !== "undefined" && Array.isArray(state?.fish) ? state.fish : [];
  let count = 0;
  for (const fish of fishList) {
    if (!fish?.turnStartedAt || !(Number(fish.turnDurationMs) > 0)) continue;
    const species = getSpeciesForFish(fish);
    if (!species || getFishTurnRendererBackend(fish, species) !== "v26") continue;
    const turnState = getFishHorizontalTurnState(fish, now);
    if (turnState.active && turnState.reversing) count += 1;
  }
  runtime.fishTurnV26ActiveCountFrame = frameKey;
  runtime.fishTurnV26ActiveCount = count;
  return count;
}

function getFishTurnV26VolumeLayerCountForActiveTurns(activeTurnCount) {
  const count = Math.max(0, Math.floor(Number(activeTurnCount) || 0));
  if (count > FISH_TURN_V26_REDUCED_QUALITY_MAX_SIMULTANEOUS) {
    return FISH_TURN_V26_STRESS_VOLUME_LAYERS;
  }
  if (count > FISH_TURN_V26_FULL_QUALITY_MAX_SIMULTANEOUS) {
    return FISH_TURN_V26_REDUCED_VOLUME_LAYERS;
  }
  return FISH_TURN_V26_VOLUME_LAYERS;
}

function getFishTurnV26StressBudget(activeTurnCount, withFinOverlay = false) {
  const volumeLayers = getFishTurnV26VolumeLayerCountForActiveTurns(activeTurnCount);
  const trianglesPerPass = FISH_TURN_V26_MESH_COLUMNS * FISH_TURN_V26_MESH_ROWS * 2;
  const passesPerFish = volumeLayers + (withFinOverlay ? 2 : 0);
  return {
    activeTurnCount: Math.max(0, Math.floor(Number(activeTurnCount) || 0)),
    volumeLayers,
    trianglesPerPass,
    passesPerFish,
    trianglesPerFrame: Math.max(0, Math.floor(Number(activeTurnCount) || 0)) * passesPerFish * trianglesPerPass
  };
}

function getFishTurnV26BodyGpuBuffers(renderer, bodyShape) {
  if (!renderer || !bodyShape) return null;
  if (renderer.bodyGpuBuffers.has(bodyShape.cacheKey)) {
    return renderer.bodyGpuBuffers.get(bodyShape.cacheKey);
  }
  const { gl } = renderer;
  const distanceBuffer = gl.createBuffer();
  const localBuffer = gl.createBuffer();
  if (!distanceBuffer || !localBuffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, distanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bodyShape.bodyDistance, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, localBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, bodyShape.bodyLocal, gl.STATIC_DRAW);
  const buffers = { distanceBuffer, localBuffer };
  renderer.bodyGpuBuffers.set(bodyShape.cacheKey, buffers);
  return buffers;
}

function getFishTurnV26FinGpuBuffer(renderer, finShape) {
  if (!renderer || !finShape) return null;
  if (renderer.finGpuBuffers.has(finShape.cacheKey)) {
    return renderer.finGpuBuffers.get(finShape.cacheKey);
  }
  const { gl } = renderer;
  const localBuffer = gl.createBuffer();
  if (!localBuffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, localBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, finShape.finLocal, gl.STATIC_DRAW);
  renderer.finGpuBuffers.set(finShape.cacheKey, localBuffer);
  return localBuffer;
}


function getFishTurnV26FinRenderSides(turnYaw) {
  const nearSide = Math.cos(Number(turnYaw) || 0) >= 0 ? 1 : -1;
  return { nearSide, farSide: -nearSide };
}

function getFishTurnV26LayerCoordinates(layerCount = FISH_TURN_V26_VOLUME_LAYERS) {
  const safeCount = Math.max(1, Math.floor(Number(layerCount) || 1));
  if (safeCount === 1) return [0];
  return Array.from({ length: safeCount }, (_, index) => (
    (index / (safeCount - 1) - 0.5) * 2
  ));
}

function getFishTurnV26BodyRenderPasses(turnYaw, layerCount = FISH_TURN_V26_VOLUME_LAYERS) {
  const layers = getFishTurnV26LayerCoordinates(layerCount);
  if (layers.length === 1) {
    return [{ layer: 0, alpha: 1, shade: 1, depthWrite: true, outer: true }];
  }
  const nearSide = Math.cos(turnYaw) >= 0 ? 1 : -1;
  const farSide = -nearSide;
  const interiors = layers
    .filter((layer) => Math.abs(layer) < 0.999)
    .sort((a, b) => (a * nearSide) - (b * nearSide))
    .map((layer) => ({
      layer,
      alpha: FISH_TURN_V26_INTERIOR_ALPHA,
      shade: 0.74 + (0.90 - 0.74) * (1 - Math.abs(layer)),
      depthWrite: false,
      outer: false
    }));
  return [
    { layer: farSide, alpha: 1, shade: 1, depthWrite: true, outer: true },
    ...interiors,
    { layer: nearSide, alpha: 1, shade: 1, depthWrite: true, outer: true }
  ];
}

function renderFishTurnV26VolumeCanvas(textureImage, shapeImage, fish, now = Date.now(), options = {}) {
  if (
    !textureImage || Number(textureImage.width) <= 0 || Number(textureImage.height) <= 0
    || !shapeImage || Number(shapeImage.width) <= 0 || Number(shapeImage.height) <= 0
  ) {
    return null;
  }
  const renderer = getFishTurnV26RendererState();
  if (!renderer) return null;
  const bodyShape = preprocessFishTurnV26BodyShape(shapeImage, renderer.mesh);
  if (!bodyShape) return null;
  const bodyGpuBuffers = getFishTurnV26BodyGpuBuffers(renderer, bodyShape);
  if (!bodyGpuBuffers) return null;

  let finOverlay = null;
  let finShape = null;
  let finGpuBuffer = null;
  if (options?.includeFinOverlay === true) {
    finOverlay = getFishTurnV26LatchedFinOverlay(fish, shapeImage);
    if (finOverlay) {
      finShape = preprocessFishTurnV26FinShape(finOverlay.image, renderer.mesh);
      finGpuBuffer = finShape ? getFishTurnV26FinGpuBuffer(renderer, finShape) : null;
      if (!finShape || !finGpuBuffer) {
        finOverlay = null;
        finShape = null;
        finGpuBuffer = null;
      }
    }
  }

  const { canvas, gl, program, mesh, uvBuffer, indexBuffer, uniforms } = renderer;
  const bodyTexture = getFishTurnV26GpuTexture(renderer, textureImage, "body");
  if (!bodyTexture) return null;
  const finTexture = finOverlay ? getFishTurnV26GpuTexture(renderer, finOverlay.image, "fin") : null;
  if (finOverlay && !finTexture) {
    finOverlay = null;
    finShape = null;
    finGpuBuffer = null;
  }
  const sourceWidth = Math.max(1, Math.round(Number(textureImage.width) || 1));
  const sourceHeight = Math.max(1, Math.round(Number(textureImage.height) || 1));
  const renderScale = Math.min(
    1,
    FISH_TURN_V26_RENDER_MAX_DIM / Math.max(sourceWidth, sourceHeight)
  );
  const baseRenderWidth = Math.max(2, Math.round(sourceWidth * renderScale));
  const baseRenderHeight = Math.max(2, Math.round(sourceHeight * renderScale));
  const width = Math.max(1, Math.ceil(baseRenderWidth * FISH_TURN_V26_RENDER_PADDING_X));
  const height = Math.max(1, Math.ceil(baseRenderHeight * FISH_TURN_V26_RENDER_PADDING_Y));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  try {
    const turnState = getFishHorizontalTurnState(fish, now);
    const turnProgress = getFishTurnV26VisualProgress(
      fish,
      clamp(Number(turnState.progress) || 0, 0, 1)
    );
    const sourceDirection = getFishTurnV26SourceDirection();
    const turnStyle = getFishTurnV26Style(fish);
    const turnDepthSign = getFishTurnV26DepthSign(fish);
    const styleTransform = computeFishTurnV26StyleTransform(turnStyle, turnProgress, sourceDirection, turnDepthSign);
    const fishAspect = Math.max(0.0001, Number(shapeImage.width) / Math.max(1, Number(shapeImage.height)));
    const fovRadians = FISH_TURN_V26_FOV_DEGREES * Math.PI / 180;
    const modelScaleState = getFishTurnV26ModelScale(fishAspect);
    const modelScale = modelScaleState.modelScale;
    const finSides = getFishTurnV26FinRenderSides(styleTransform.rotationY);

    gl.viewport(0, 0, width, height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(renderer.uvLocation);
    gl.vertexAttribPointer(renderer.uvLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bodyGpuBuffers.distanceBuffer);
    gl.enableVertexAttribArray(renderer.bodyDistanceLocation);
    gl.vertexAttribPointer(renderer.bodyDistanceLocation, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bodyGpuBuffers.localBuffer);
    gl.enableVertexAttribArray(renderer.bodyLocalLocation);
    gl.vertexAttribPointer(renderer.bodyLocalLocation, 1, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(renderer.finLocalLocation);
    gl.vertexAttrib1f(renderer.finLocalLocation, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bodyTexture);
    gl.uniform1i(uniforms.u_texture, 0);
    gl.uniform1f(
      uniforms.u_thickness,
      (FISH_TURN_V26_THICKNESS / 450) * getFishTurnV26ApparentThicknessScale(turnProgress)
    );
    gl.uniform1f(uniforms.u_edgeReach, FISH_TURN_V26_EDGE_REACH);
    gl.uniform1f(uniforms.u_edgeClosure, FISH_TURN_V26_EDGE_CLOSURE / 100);
    gl.uniform1f(uniforms.u_edgeRoundness, FISH_TURN_V26_EDGE_ROUNDNESS / 100);
    gl.uniform1f(uniforms.u_endThinning, FISH_TURN_V26_END_THINNING / 100);
    gl.uniform1f(uniforms.u_midBodyFullness, FISH_TURN_V26_MID_BODY_FULLNESS / 100);
    gl.uniform1f(uniforms.u_crossSection, FISH_TURN_V26_CROSS_SECTION / 100);
    gl.uniform1f(uniforms.u_faceThickness, FISH_TURN_V26_FACE_HEAD_THICKNESS / 100);
    const finSettings = getFishTurnV26FinSettings(fish, options?.species);
    gl.uniform1f(uniforms.u_finGap, finSettings.distance / 450);
    gl.uniform1f(uniforms.u_finAttach, finSettings.frontAttachmentDistance / 100);
    gl.uniform1f(uniforms.u_finTaper, finSettings.taper / 100);
    gl.uniform1f(uniforms.u_fishAspect, fishAspect);
    gl.uniform1f(uniforms.u_turnProgress, turnProgress);
    gl.uniform1f(uniforms.u_sourceDirection, sourceDirection);
    gl.uniform1f(uniforms.u_turnDepthSign, turnDepthSign);
    gl.uniform1f(uniforms.u_bodyFlex, FISH_TURN_V26_Z_AXIS_BODY_FLEX / 100);
    gl.uniform1f(uniforms.u_tailFlex, FISH_TURN_V26_TAIL_FOLLOW_THROUGH / 100);
    gl.uniform1f(uniforms.u_spineEpsilon, FISH_TURN_V26_SPINE_EPSILON);
    gl.uniform1f(uniforms.u_bendScale, styleTransform.style.bendScale);
    gl.uniform1f(uniforms.u_bias, styleTransform.style.bias);
    gl.uniform1f(uniforms.u_waveScale, styleTransform.style.waveScale);
    gl.uniform1f(uniforms.u_waveSpeed, styleTransform.style.waveSpeed);
    gl.uniform1f(uniforms.u_modelScale, modelScale);
    gl.uniform1f(uniforms.u_rotationX, styleTransform.rotationX);
    gl.uniform1f(uniforms.u_rotationY, styleTransform.rotationY);
    gl.uniform1f(uniforms.u_rotationZ, styleTransform.rotationZ);
    gl.uniform1f(uniforms.u_translationX, styleTransform.translationX);
    gl.uniform1f(uniforms.u_translationY, styleTransform.translationY);
    gl.uniform1f(uniforms.u_translationZ, styleTransform.translationZ);
    gl.uniform1f(uniforms.u_renderPaddingX, FISH_TURN_V26_RENDER_PADDING_X);
    gl.uniform1f(uniforms.u_renderPaddingY, FISH_TURN_V26_RENDER_PADDING_Y);
    gl.uniform1f(uniforms.u_projectionCompensation, modelScaleState.projectionCompensation);
    gl.uniform1f(uniforms.u_cameraZ, FISH_TURN_V26_CAMERA_Z);
    gl.uniform1f(uniforms.u_fovRadians, fovRadians);
    gl.uniform1f(uniforms.u_near, FISH_TURN_V26_NEAR);
    gl.uniform1f(uniforms.u_far, FISH_TURN_V26_FAR);

    const drawFinPass = (sideSign) => {
      if (!finOverlay || !finGpuBuffer) return;
      gl.bindTexture(gl.TEXTURE_2D, finTexture);
      gl.bindBuffer(gl.ARRAY_BUFFER, finGpuBuffer);
      gl.enableVertexAttribArray(renderer.finLocalLocation);
      gl.vertexAttribPointer(renderer.finLocalLocation, 1, gl.FLOAT, false, 0, 0);
      gl.depthMask(true);
      gl.uniform1f(uniforms.u_finMode, 1);
      gl.uniform1f(uniforms.u_finSideSign, sideSign);
      gl.uniform1f(uniforms.u_layer, sideSign);
      gl.uniform1f(uniforms.u_layerAlpha, 1);
      gl.uniform1f(uniforms.u_rgbMultiplier, 1);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    };

    // v26 draw order is deliberate: far fin, full body volume, near fin.
    drawFinPass(finSides.farSide);

    gl.bindTexture(gl.TEXTURE_2D, bodyTexture);
    gl.uniform1f(uniforms.u_finMode, 0);
    gl.uniform1f(uniforms.u_finSideSign, 0);
    const volumeLayerCount = getFishTurnV26VolumeLayerCountForActiveTurns(
      getFishTurnV26ActiveTurnCount(now)
    );
    for (const pass of getFishTurnV26BodyRenderPasses(styleTransform.rotationY, volumeLayerCount)) {
      gl.depthMask(pass.depthWrite);
      gl.uniform1f(uniforms.u_layer, pass.layer);
      gl.uniform1f(uniforms.u_layerAlpha, pass.alpha);
      gl.uniform1f(uniforms.u_rgbMultiplier, pass.shade);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawFinPass(finSides.nearSide);
    gl.disableVertexAttribArray(renderer.finLocalLocation);
    gl.vertexAttrib1f(renderer.finLocalLocation, 0);
    gl.uniform1f(uniforms.u_finMode, 0);
    gl.depthMask(true);
    gl.flush();
    return canvas;
  } catch (error) {
    disposeFishTurnV26RendererState(renderer, true);
    console.warn("Fish Turn v26 volume renderer failed; using the lightweight turn fallback.", error);
    return null;
  }
}

function drawFishTurnV26VolumeMesh(
  context,
  textureImage,
  shapeImage,
  drawX,
  drawWidth,
  drawHeight,
  fish,
  now = Date.now(),
  options = {}
) {
  const volumeCanvas = renderFishTurnV26VolumeCanvas(textureImage, shapeImage, fish, now, options);
  if (!volumeCanvas) {
    return false;
  }

  const facingDirection = getFishFacingDirection(fish);
  const paddedDrawWidth = drawWidth * FISH_TURN_V26_RENDER_PADDING_X;
  const paddedDrawHeight = drawHeight * FISH_TURN_V26_RENDER_PADDING_Y;
  const paddedDrawX = drawX - (paddedDrawWidth - drawWidth) / 2;
  const paddedDrawY = -drawHeight / 2 - (paddedDrawHeight - drawHeight) / 2;
  context.save();
  const requestedAlpha = Number(options.alpha);
  context.globalAlpha *= Number.isFinite(requestedAlpha) ? clamp(requestedAlpha, 0, 1) : 1;
  context.scale(facingDirection, 1);
  context.drawImage(volumeCanvas, paddedDrawX, paddedDrawY, paddedDrawWidth, paddedDrawHeight);
  if (typeof options.onRenderedVolumeCanvas === "function") {
    options.onRenderedVolumeCanvas({
      canvas: volumeCanvas,
      drawX: paddedDrawX,
      drawY: paddedDrawY,
      drawWidth: paddedDrawWidth,
      drawHeight: paddedDrawHeight,
      alpha: Number.isFinite(requestedAlpha) ? clamp(requestedAlpha, 0, 1) : 1
    });
  }
  context.restore();
  return true;
}
