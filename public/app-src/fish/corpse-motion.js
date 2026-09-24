function getDeadFishTransitionProgress(motion, now = Date.now()) {
  if (!motion) {
    return 1;
  }
  const startedAt = Number.isFinite(Number(motion.startedAt)) ? Number(motion.startedAt) : now;
  return clamp((now - startedAt) / Math.max(1, 2200), 0, 1);
}

function getDeadFishTransitionEase(progress) {
  const value = clamp(Number(progress) || 0, 0, 1);
  return value * value * (3 - 2 * value);
}

function getDeadFishCorpseRenderState(fish, now = Date.now(), species = getSpeciesForFish(fish)) {
  const motion = getDeadFishCorpseMotionState(fish, now, species);
  if (!motion) {
    return {
      stage: "surface",
      transitionProgress: 1,
      tilt: Math.PI,
      wiggle: 0,
      passiveFloatFactor: 0,
      renderOffsetXNorm: 0,
      renderOffsetYNorm: 0
    };
  }

  // Phase 7: every corpse gets one small, stable upside-down angle variation.
  // It is deterministic from the fish ID so it does not rerandomize on reload,
  // even before Phase 16 begins persisting corpse-specific presentation fields.
  if (!Number.isFinite(Number(motion.stableAngleOffset))) {
    const stablePoseUnit = (Array.from(String(fish?.id || "corpse")).reduce(
      (hash, character) => ((hash * 31 + character.charCodeAt(0)) >>> 0),
      2166136261
    ) % 2001) / 1000 - 1;
    motion.stableAngleOffset = stablePoseUnit * 0.045;
  }
  const stableAngleOffset = clamp(Number(motion.stableAngleOffset) || 0, -0.045, 0.045);
  const finalCorpseTilt = Math.PI + stableAngleOffset;

  if (motion.stage === "transition") {
    const progress = getDeadFishTransitionProgress(motion, now);
    const eased = getDeadFishTransitionEase(progress);
    const sourceTilt = clamp(Number(motion.sourceTilt) || 0, -0.65, 0.65);
    const residualMotion = 1 - eased;
    return {
      stage: motion.stage,
      transitionProgress: progress,
      tilt: sourceTilt + (finalCorpseTilt - sourceTilt) * eased,
      wiggle: Math.sin(now / 240 + (Number(fish?.phase) || 0) * Math.PI * 2) * 0.1 * residualMotion,
      passiveFloatFactor: 0,
      renderOffsetXNorm: 0,
      renderOffsetYNorm: 0
    };
  }

  // Once the death transition is complete the fish is limp, not an upside-down
  // swimmer. Cave escape and surface rise may translate the body without any
  // living swim animation. Phase 10 adds only a tiny surface-only passive bob
  // and angle sway after the corpse has actually reached the waterline.
  const surfaceFloatFactor = motion.stage === "surface"
    ? getDeadFishTransitionEase(clamp((now - (Number(motion.surfaceReachedAt) || now)) / 1400, 0, 1))
    : 0;
  const surfaceBobPhase = Number(motion.surfaceBobPhase) || 0;
  const surfaceDriftPhase = Number(motion.surfaceDriftPhase) || 0;
  const surfaceDriftDirection = Number(motion.surfaceDriftDirection) < 0 ? -1 : 1;
  const surfaceDriftSpeedNormPerSecond = clamp(Number(motion.surfaceDriftSpeedNormPerSecond) || 0.0017, 0.0011, 0.0024);
  const surfaceAngleOffset = surfaceFloatFactor > 0
    ? Math.sin(now / 2900 + surfaceBobPhase * 0.73) * 0.012 * surfaceFloatFactor
    : 0;

  // Phase 19: both the full aquarium and Borough overview consume these exact
  // normalized render offsets. Keeping the cosmetic drift/bob in the shared
  // corpse render state prevents a renderer swap from producing a visible hop
  // even though the authoritative fish x/y never changed.
  const driftSpeedFactor = clamp((surfaceDriftSpeedNormPerSecond - 0.0011) / (0.0024 - 0.0011), 0, 1);
  const floatClock = now / 1000;
  const driftAmplitudePx = 0.9 + driftSpeedFactor * 1.1;
  const tankWidth = typeof TANK_WIDTH !== "undefined" ? Math.max(1, Number(TANK_WIDTH) || 1) : 1200;
  const tankHeight = typeof TANK_HEIGHT !== "undefined" ? Math.max(1, Number(TANK_HEIGHT) || 1) : 760;
  const forwardDriftPulse = 0.5 + Math.sin(floatClock * 0.28 + surfaceDriftPhase) * 0.5;
  const renderOffsetXNorm = surfaceDriftDirection
    * forwardDriftPulse
    * (driftAmplitudePx / tankWidth)
    * surfaceFloatFactor;
  const renderOffsetYNorm = Math.sin(floatClock * 0.82 + surfaceBobPhase * 1.37)
    * (0.9 / tankHeight)
    * surfaceFloatFactor;

  return {
    stage: motion.stage,
    transitionProgress: 1,
    tilt: finalCorpseTilt + surfaceAngleOffset,
    wiggle: 0,
    passiveFloatFactor: surfaceFloatFactor,
    surfaceBobPhase,
    surfaceDriftDirection,
    surfaceDriftSpeedNormPerSecond,
    surfaceDriftPhase,
    renderOffsetXNorm,
    renderOffsetYNorm
  };
}

function getDeadFishCorpseMotionMap() {
  if (typeof runtime === "undefined" || !runtime) {
    return null;
  }
  if (!(runtime.corpseMotionByFishId instanceof Map)) {
    runtime.corpseMotionByFishId = new Map();
  }
  return runtime.corpseMotionByFishId;
}

function cloneDeadFishCavePoint(point, kind = "path") {
  const xNorm = Number(point?.xNorm);
  const yNorm = Number(point?.yNorm);
  if (!Number.isFinite(xNorm) || !Number.isFinite(yNorm)) {
    return null;
  }
  return {
    xNorm: clamp(xNorm, 0.08, 0.92),
    yNorm: clamp(yNorm, 0.14, 0.8),
    kind
  };
}

function cloneDeadFishCavePlan(plan) {
  if (!plan || typeof plan !== "object") {
    return null;
  }
  return {
    decorId: plan.decorId || null,
    portalId: plan.portalId || null,
    triggerId: plan.triggerId || null,
    frontLayer: Number.isFinite(Number(plan.frontLayer)) ? Number(plan.frontLayer) : null,
    backLayer: Number.isFinite(Number(plan.backLayer)) ? Number(plan.backLayer) : null,
    approach: cloneDeadFishCavePoint(plan.approach, "outside"),
    mouth: cloneDeadFishCavePoint(plan.mouth, "mouth"),
    inside: cloneDeadFishCavePoint(plan.inside, "inside"),
    entryPathNodes: Array.isArray(plan.entryPathNodes)
      ? plan.entryPathNodes.map((node) => cloneDeadFishCavePoint(node)).filter(Boolean)
      : [],
    exitPathNodes: Array.isArray(plan.exitPathNodes)
      ? plan.exitPathNodes.map((node) => cloneDeadFishCavePoint(node)).filter(Boolean)
      : []
  };
}

function getDeadFishCaveDeathContext(fish) {
  const rawState = fish?.caveState;
  const sourceCaveState = rawState && typeof rawState === "object"
    ? { ...rawState }
    : (typeof rawState === "string" && rawState ? rawState : null);
  const sourceCaveMode = typeof sourceCaveState === "string"
    ? sourceCaveState
    : (typeof sourceCaveState?.mode === "string" ? sourceCaveState.mode : null);
  const activePlan = typeof getActiveFishCavePlan === "function"
    ? getActiveFishCavePlan(fish)
    : null;
  const sourceCavePlan = cloneDeadFishCavePlan(activePlan);
  const inCaveModes = new Set(["enter", "inside", "exit", "depart"]);
  const diedInCave = inCaveModes.has(sourceCaveMode);
  return {
    sourceCaveState,
    sourceCaveMode,
    sourceCavePlan,
    sourceCaveDecorId: fish?.caveDecorId || sourceCavePlan?.decorId || sourceCaveState?.decorId || null,
    sourceCaveFrontLayer: Number.isFinite(Number(fish?.caveFrontLayer))
      ? Number(fish.caveFrontLayer)
      : sourceCavePlan?.frontLayer,
    sourceCaveBackLayer: Number.isFinite(Number(fish?.caveBackLayer))
      ? Number(fish.caveBackLayer)
      : sourceCavePlan?.backLayer,
    sourceCaveReturnSubLayer: Number.isFinite(Number(fish?.caveReturnSubLayer))
      ? Number(fish.caveReturnSubLayer)
      : null,
    sourceCavePathIndex: Number.isFinite(Number(fish?.cavePathIndex))
      ? Math.max(0, Math.floor(Number(fish.cavePathIndex)))
      : null,
    diedInCave
  };
}

function buildDeadFishCaveExitNodes(fish, caveContext) {
  if (!fish || !caveContext?.diedInCave) {
    return [];
  }

  const plan = caveContext.sourceCavePlan;
  const current = {
    xNorm: Number.isFinite(Number(fish.xNorm)) ? Number(fish.xNorm) : 0.5,
    yNorm: Number.isFinite(Number(fish.yNorm)) ? Number(fish.yNorm) : 0.5
  };
  const fallbackMouth = cloneDeadFishCavePoint({
    xNorm: fish.caveEntryXNorm,
    yNorm: fish.caveEntryYNorm
  }, "mouth");
  const fallbackApproach = cloneDeadFishCavePoint({
    xNorm: fish.caveApproachXNorm,
    yNorm: fish.caveApproachYNorm
  }, "outside");
  const mouth = plan?.mouth || fallbackMouth;
  const approach = plan?.approach || fallbackApproach;
  const exitNodes = Array.isArray(plan?.exitPathNodes)
    ? plan.exitPathNodes.map((node) => cloneDeadFishCavePoint(node)).filter(Boolean)
    : [];
  const nodes = [];

  if (exitNodes.length) {
    let startIndex = 0;
    if (caveContext.sourceCaveMode === "exit" && Number.isFinite(caveContext.sourceCavePathIndex)) {
      startIndex = clamp(caveContext.sourceCavePathIndex, 0, exitNodes.length - 1);
    } else if (["enter", "exit", "depart"].includes(caveContext.sourceCaveMode)) {
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < exitNodes.length; index += 1) {
        const node = exitNodes[index];
        const distance = Math.hypot(node.xNorm - current.xNorm, node.yNorm - current.yNorm);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          startIndex = index;
        }
      }
    }
    nodes.push(...exitNodes.slice(startIndex));
  } else if (plan?.inside && caveContext.sourceCaveMode === "inside") {
    nodes.push({ ...plan.inside, kind: "inside" });
  }

  const appendDistinct = (point) => {
    if (!point) {
      return;
    }
    const previous = nodes[nodes.length - 1];
    if (!previous || Math.hypot(previous.xNorm - point.xNorm, previous.yNorm - point.yNorm) > 0.002) {
      nodes.push({ ...point });
    } else if (point.kind) {
      previous.kind = point.kind;
    }
  };

  appendDistinct(mouth);

  if (approach) {
    appendDistinct(approach);
  } else if (mouth) {
    const inside = plan?.inside || exitNodes[0] || current;
    const dx = mouth.xNorm - inside.xNorm;
    const dy = mouth.yNorm - inside.yNorm;
    const length = Math.max(0.0001, Math.hypot(dx, dy));
    appendDistinct({
      xNorm: clamp(mouth.xNorm + (dx / length) * 0.028, 0.08, 0.92),
      yNorm: clamp(mouth.yNorm + (dy / length) * 0.028, 0.14, 0.8),
      kind: "outside"
    });
  }

  return nodes;
}


function sanitizeDeadFishCorpseStage(stage) {
  const value = typeof stage === "string" ? stage : "";
  return ["transition", "corpse_exiting_cave", "rising", "surface", "consumed"].includes(value) ? value : null;
}

function getDeadFishCorpseSeed(fish) {
  if (Number.isFinite(Number(fish?.corpseSeed))) {
    return Math.max(0, Math.floor(Number(fish.corpseSeed))) >>> 0;
  }
  return Array.from(String(fish?.id || "corpse")).reduce(
    (hash, character) => ((hash * 31 + character.charCodeAt(0)) >>> 0),
    2166136261
  );
}

function persistDeadFishCorpseMotionState(fish, motion, now = Date.now()) {
  if (!fish || !motion) return false;
  const stage = sanitizeDeadFishCorpseStage(motion.stage) || "surface";
  const stableAngleOffset = clamp(Number(motion.stableAngleOffset) || 0, -0.045, 0.045);
  const finalCorpseTilt = Math.PI + stableAngleOffset;
  const transitionProgress = stage === "transition" ? getDeadFishTransitionProgress(motion, now) : 1;
  const eased = getDeadFishTransitionEase(transitionProgress);
  const sourceTilt = clamp(Number(motion.sourceTilt) || 0, -0.65, 0.65);
  const rotation = stage === "transition"
    ? sourceTilt + (finalCorpseTilt - sourceTilt) * eased
    : finalCorpseTilt;

  fish.corpseStage = stage;
  fish.corpseStageStartedAt = Number.isFinite(Number(motion.stageStartedAt)) ? Number(motion.stageStartedAt) : now;
  fish.corpseTransitionProgress = clamp(transitionProgress, 0, 1);
  fish.corpseRotation = rotation;
  fish.corpseSurfaceYNorm = Number.isFinite(Number(motion.surfaceYNorm)) ? clamp(Number(motion.surfaceYNorm), 0.12, 0.8) : null;
  fish.corpseSurfaceRestYOffsetNorm = clamp(Number(motion.surfaceRestYOffsetNorm) || 0, -0.0025, 0.0025);
  fish.corpseStableAngleOffset = stableAngleOffset;
  fish.corpseDriftDirection = Number(motion.surfaceDriftDirection) < 0 ? -1 : 1;
  fish.corpseDriftSpeedNormPerSecond = clamp(Number(motion.surfaceDriftSpeedNormPerSecond) || 0.0017, 0.0011, 0.0024);
  fish.corpseDriftPhase = Number(motion.surfaceDriftPhase) || 0;
  fish.corpseBobPhase = Number(motion.surfaceBobPhase) || 0;
  fish.corpseSeed = getDeadFishCorpseSeed(fish);
  fish.corpseMovementMode = stage;
  fish.corpseCaveExitIndex = Math.max(0, Math.floor(Number(motion.corpseCaveExitIndex) || 0));
  fish.corpseCaveExitCleared = motion.caveExitCleared === true;

  if (stage === "corpse_exiting_cave" && Array.isArray(motion.corpseCaveExitNodes) && motion.corpseCaveExitNodes.length) {
    fish.corpseCaveState = {
      mode: "corpse_exiting_cave",
      exitNodes: motion.corpseCaveExitNodes.map((node) => cloneDeadFishCavePoint(node, node?.kind || "path")).filter(Boolean),
      exitIndex: fish.corpseCaveExitIndex,
      caveExitCleared: fish.corpseCaveExitCleared,
      sourceCaveFrontLayer: Number.isFinite(Number(motion.sourceCaveFrontLayer)) ? Number(motion.sourceCaveFrontLayer) : null,
      sourceCaveBackLayer: Number.isFinite(Number(motion.sourceCaveBackLayer)) ? Number(motion.sourceCaveBackLayer) : null,
      sourceCaveReturnSubLayer: Number.isFinite(Number(motion.sourceCaveReturnSubLayer)) ? Number(motion.sourceCaveReturnSubLayer) : null
    };
  } else {
    fish.corpseCaveState = null;
  }
  return true;
}

function syncDeadFishCorpsePersistenceForSave(now = Date.now()) {
  const fishList = typeof getAllTankFish === "function"
    ? getAllTankFish(state)
    : (Array.isArray(state?.fish) ? state.fish : []);
  let synced = 0;
  for (const fish of Array.isArray(fishList) ? fishList : []) {
    const dead = typeof isFishDead === "function"
      ? isFishDead(fish)
      : fish?.lifeState === "dead" || fish?.activity === "dead" || Number.isFinite(Number(fish?.deadAt));
    if (!dead || !fish?.id) continue;
    const species = getSpeciesForFish(fish);
    const motion = getDeadFishCorpseMotionState(fish, now, species);
    if (persistDeadFishCorpseMotionState(fish, motion, now)) synced += 1;
  }
  return synced;
}

function createDeadFishCorpseMotionState(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const baseSurfaceYNorm = getDeadFishFloatYNorm(fish, species, now);
  const startXNorm = Number.isFinite(Number(fish?.xNorm)) ? Number(fish.xNorm) : 0.5;
  const deadAt = Number.isFinite(Number(fish?.deadAt)) ? Number(fish.deadAt) : now;
  const persistedStage = ["transition", "corpse_exiting_cave", "rising", "surface", "consumed"].includes(fish?.corpseStage)
    ? fish.corpseStage
    : null;
  const persistedCaveState = fish?.corpseCaveState && typeof fish.corpseCaveState === "object" ? fish.corpseCaveState : null;
  const caveContext = getDeadFishCaveDeathContext(fish);
  let corpseCaveExitNodes = buildDeadFishCaveExitNodes(fish, caveContext);
  let corpseCaveExitIndex = 0;
  let caveExitCleared = !caveContext.diedInCave || !corpseCaveExitNodes.length;
  let sourceCaveFrontLayer = caveContext.sourceCaveFrontLayer;
  let sourceCaveBackLayer = caveContext.sourceCaveBackLayer;
  let sourceCaveReturnSubLayer = caveContext.sourceCaveReturnSubLayer;
  let diedInCave = caveContext.diedInCave;

  if (persistedStage === "corpse_exiting_cave" && persistedCaveState) {
    const persistedNodes = Array.isArray(persistedCaveState.exitNodes)
      ? persistedCaveState.exitNodes.map((node) => cloneDeadFishCavePoint(node, node?.kind || "path")).filter(Boolean)
      : [];
    if (persistedNodes.length) {
      corpseCaveExitNodes = persistedNodes;
      corpseCaveExitIndex = clamp(
        Math.floor(Number(fish?.corpseCaveExitIndex ?? persistedCaveState.exitIndex) || 0),
        0,
        persistedNodes.length
      );
      caveExitCleared = fish?.corpseCaveExitCleared === true || persistedCaveState.caveExitCleared === true;
      sourceCaveFrontLayer = Number.isFinite(Number(persistedCaveState.sourceCaveFrontLayer)) ? Number(persistedCaveState.sourceCaveFrontLayer) : sourceCaveFrontLayer;
      sourceCaveBackLayer = Number.isFinite(Number(persistedCaveState.sourceCaveBackLayer)) ? Number(persistedCaveState.sourceCaveBackLayer) : sourceCaveBackLayer;
      sourceCaveReturnSubLayer = Number.isFinite(Number(persistedCaveState.sourceCaveReturnSubLayer)) ? Number(persistedCaveState.sourceCaveReturnSubLayer) : sourceCaveReturnSubLayer;
      diedInCave = true;
    }
  }

  const corpseIdentityHash = Number.isFinite(Number(fish?.corpseSeed))
    ? (Math.max(0, Math.floor(Number(fish.corpseSeed))) >>> 0)
    : Array.from(String(fish?.id || "corpse")).reduce(
      (hash, character) => ((hash * 31 + character.charCodeAt(0)) >>> 0),
      2166136261
    );
  const deterministicStablePoseUnit = (corpseIdentityHash % 2001) / 1000 - 1;
  const stableAngleOffset = Number.isFinite(Number(fish?.corpseStableAngleOffset))
    ? clamp(Number(fish.corpseStableAngleOffset), -0.045, 0.045)
    : deterministicStablePoseUnit * 0.045;
  const deterministicSurfaceOffset = ((((corpseIdentityHash >>> 17) % 2001) / 1000) - 1) * 0.0025;
  const surfaceRestYOffsetNorm = Number.isFinite(Number(fish?.corpseSurfaceRestYOffsetNorm))
    ? clamp(Number(fish.corpseSurfaceRestYOffsetNorm), -0.0025, 0.0025)
    : deterministicSurfaceOffset;
  const surfaceYNorm = Number.isFinite(Number(fish?.corpseSurfaceYNorm))
    ? clamp(Number(fish.corpseSurfaceYNorm), 0.12, 0.8)
    : clamp(baseSurfaceYNorm + surfaceRestYOffsetNorm, 0.12, 0.8);
  const surfaceDriftTendency = ((corpseIdentityHash >>> 5) & 1) === 0 ? -1 : 1;
  const surfaceDriftDirection = Number(fish?.corpseDriftDirection) < 0 ? -1
    : Number(fish?.corpseDriftDirection) > 0 ? 1
      : surfaceDriftTendency;
  const surfaceDriftSpeedNormPerSecond = Number.isFinite(Number(fish?.corpseDriftSpeedNormPerSecond))
    ? clamp(Number(fish.corpseDriftSpeedNormPerSecond), 0.0011, 0.0024)
    : 0.0013 + ((corpseIdentityHash >>> 7) % 1001) / 1000000;
  const surfaceDriftPhase = Number.isFinite(Number(fish?.corpseDriftPhase)) ? Number(fish.corpseDriftPhase) : ((corpseIdentityHash >>> 13) % 6284) / 1000;
  const surfaceBobPhase = Number.isFinite(Number(fish?.corpseBobPhase)) ? Number(fish.corpseBobPhase) : ((corpseIdentityHash >>> 21) % 6284) / 1000;
  const startYNorm = Number.isFinite(Number(fish?.yNorm)) ? Number(fish.yNorm) : surfaceYNorm;
  const nearSurface = Math.abs(startYNorm - surfaceYNorm) <= 0.012 || startYNorm <= surfaceYNorm + 0.006;
  const deathAgeMs = Math.max(0, now - deadAt);
  const transitionComplete = deathAgeMs >= 2200;
  const fallbackPostTransitionStage = diedInCave && corpseCaveExitNodes.length && !caveExitCleared
    ? "corpse_exiting_cave"
    : (nearSurface ? "surface" : "rising");
  const stage = persistedStage || (transitionComplete ? fallbackPostTransitionStage : "transition");
  const persistedTransitionProgress = Number.isFinite(Number(fish?.corpseTransitionProgress))
    ? clamp(Number(fish.corpseTransitionProgress), 0, 1)
    : clamp(deathAgeMs / 2200, 0, 1);
  const startedAt = stage === "transition" ? now - persistedTransitionProgress * 2200 : deadAt;
  const finalCorpseTilt = Math.PI + stableAngleOffset;
  const persistedRotation = Number.isFinite(Number(fish?.corpseRotation)) ? Number(fish.corpseRotation) : null;
  const transitionEase = persistedTransitionProgress * persistedTransitionProgress * (3 - 2 * persistedTransitionProgress);
  const transitionResidual = 1 - transitionEase;
  let sourceTilt = clamp(Number(fish?.swimTilt) || 0, -0.65, 0.65);
  if (stage === "transition" && persistedRotation !== null && transitionResidual > 0.001) {
    sourceTilt = clamp((persistedRotation - finalCorpseTilt * transitionEase) / transitionResidual, -0.65, 0.65);
  }
  let sourceMotionLevel = clamp(Number(fish?.motionLevel) || 0.18, 0.02, 1);
  if (stage === "transition" && transitionResidual > 0.02) {
    sourceMotionLevel = clamp((sourceMotionLevel - 0.02 * transitionEase) / transitionResidual, 0.02, 1);
  }
  const sourceFacingDirection = typeof getFishFacingDirection === "function"
    ? getFishFacingDirection(fish)
    : (Number(fish?.direction) < 0 ? -1 : 1);
  const persistedStageStartedAt = Number.isFinite(Number(fish?.corpseStageStartedAt))
    ? Math.min(now, Math.max(0, Number(fish.corpseStageStartedAt)))
    : (stage === "transition" ? startedAt : now);

  return {
    fishId: fish?.id || "",
    stage,
    startedAt,
    stageStartedAt: persistedStageStartedAt,
    lastUpdatedAt: now,
    startXNorm, startYNorm, surfaceYNorm, sourceTilt, sourceMotionLevel, sourceFacingDirection,
    stableAngleOffset, surfaceRestYOffsetNorm, surfaceDriftTendency, surfaceDriftDirection,
    surfaceDriftSpeedNormPerSecond, surfaceDriftPhase, surfaceBobPhase, corpseSeed: corpseIdentityHash,
    sourceTankLayer: typeof getFishTankLayer === "function" ? getFishTankLayer(fish) : Number(fish?.tankLayer) || 1,
    sourceTankSubLayer: typeof getFishTankSubLayer === "function" ? getFishTankSubLayer(fish) : Number(fish?.tankSubLayer) || 2,
    sourceCaveState: caveContext.sourceCaveState, sourceCaveMode: caveContext.sourceCaveMode, sourceCavePlan: caveContext.sourceCavePlan,
    sourceCaveDecorId: caveContext.sourceCaveDecorId, sourceCaveFrontLayer, sourceCaveBackLayer, sourceCaveReturnSubLayer,
    sourceCavePathIndex: caveContext.sourceCavePathIndex, diedInCave, corpseCaveExitNodes, corpseCaveExitIndex, caveExitCleared,
    surfaceReachedAt: stage === "surface" ? persistedStageStartedAt : 0
  };
}

function initializeDeadFishCorpseMotion(fish, now = Date.now(), species = getSpeciesForFish(fish)) {
  if (!fish?.id) {
    return null;
  }
  const map = getDeadFishCorpseMotionMap();
  if (!map) {
    return createDeadFishCorpseMotionState(fish, species, now);
  }
  const existing = map.get(fish.id);
  if (existing) {
    return existing;
  }
  const created = createDeadFishCorpseMotionState(fish, species, now);
  map.set(fish.id, created);
  return created;
}

function getDeadFishCorpseMotionState(fish, now = Date.now(), species = getSpeciesForFish(fish)) {
  if (!fish?.id) {
    return null;
  }
  const map = getDeadFishCorpseMotionMap();
  return map?.get(fish.id) || initializeDeadFishCorpseMotion(fish, now, species);
}

function setDeadFishCorpseMotionStage(fish, stage, now = Date.now(), species = getSpeciesForFish(fish)) {
  const motion = getDeadFishCorpseMotionState(fish, now, species);
  if (!motion || !stage) {
    return motion;
  }
  if (motion.stage !== stage) {
    motion.stage = stage;
    motion.stageStartedAt = now;
    if (stage === "surface" && !motion.surfaceReachedAt) {
      motion.surfaceReachedAt = now;
    }
  }
  motion.lastUpdatedAt = now;
  return motion;
}

function clearDeadFishCorpseMotion(fishOrId) {
  const fishId = typeof fishOrId === "string" ? fishOrId : fishOrId?.id;
  if (!fishId) {
    return false;
  }
  const map = getDeadFishCorpseMotionMap();
  return Boolean(map?.delete(fishId));
}

// Dead Fish Phase 14: once a corpse leaves the active aquarium through disposal,
// storage, or completed consumption, remove every fish-specific runtime trace
// immediately. This prevents ghost corpse motion/proxies/caches from surviving
// until a later prune pass. Persistent memorial/history records are untouched.
function clearRemovedDeadFishRuntimeState(fishOrId) {
  const fishId = typeof fishOrId === "string" ? fishOrId : fishOrId?.id;
  if (!fishId) {
    return false;
  }

  let changed = clearDeadFishCorpseMotion(fishId);
  if (typeof runtime === "undefined" || !runtime) {
    return changed;
  }

  const keyedCollections = [
    "boroughOverviewFishProxies",
    "pendingNeighborhoodTravel",
    "foodTravelDestinations",
    "activeFishCavePlans",
    "fishActionSteeringByFishId",
    "fishActionQueuesByFishId",
    "fishActionQueueCollapsedFishIds",
    "fishShadowPlaneCache",
    "fishLayerDepthScaleTransitions",
    "fishLayerTravelStepTransitions",
    "fishCollisionAvoidanceById",
    "fishNavigationMemoryById",
    "diseaseGreenBubblesByFishId",
    "debugBehaviorSteeringByFishId",
    "debugForcedOtocinclusStateByFishId",
    "fishGravelPebbleActions",
    "forcedGravelDigUntilByFishId",
    "waterEffectFishSamples",
    "fishFrameLookupById",
    "debugBirthdayHatFishIds",
    "debugAutonomyPausedFishIds"
  ];
  for (const key of keyedCollections) {
    const collection = runtime[key];
    if (collection && typeof collection.delete === "function") {
      changed = collection.delete(fishId) || changed;
    }
  }

  // The overview tank snapshot and current render-frame cache can contain the
  // fish image itself rather than a fish-ID keyed record. Invalidate them on
  // removal so a disposed/consumed corpse cannot flash for another cached frame.
  if (runtime.boroughOverviewSnapshotCache instanceof Map && runtime.boroughOverviewSnapshotCache.size) {
    runtime.boroughOverviewSnapshotCache.clear();
    changed = true;
  }
  if (runtime.fishRenderFrameCache != null) {
    runtime.fishRenderFrameCache = null;
    changed = true;
  }
  if (runtime.fishRenderLayerBuckets != null) {
    runtime.fishRenderLayerBuckets = null;
    changed = true;
  }
  if (Number(runtime.boroughOverviewFishRenderedAt) !== 0) {
    runtime.boroughOverviewFishRenderedAt = 0;
    changed = true;
  }


  if (runtime.fishDragState?.fishId === fishId) {
    runtime.fishDragState = null;
    changed = true;
  }
  if (runtime.fishActionMenuFishId === fishId) {
    runtime.fishActionMenuFishId = null;
    changed = true;
  }
  if (runtime.editFishTrayContextMenuState?.fishId === fishId) {
    runtime.editFishTrayContextMenuState = { entryId: null, fishId: null, anchorX: 0, anchorY: 0 };
    changed = true;
  }
  if (runtime.editFishTrayLongPress?.fishId === fishId) {
    runtime.editFishTrayLongPress.fishId = null;
    changed = true;
  }
  if (runtime.suppressEditFishTrayClickFishId === fishId) {
    runtime.suppressEditFishTrayClickFishId = null;
    changed = true;
  }

  return changed;
}

function pruneDeadFishCorpseMotionStates() {
  const map = getDeadFishCorpseMotionMap();
  if (!map?.size) {
    return 0;
  }
  const fishList = typeof getAllTankFish === "function"
    ? getAllTankFish()
    : (Array.isArray(state?.fish) ? state.fish : []);
  const activeDeadIds = new Set((Array.isArray(fishList) ? fishList : [])
    .filter((fish) => fish?.id && isFishDead(fish))
    .map((fish) => fish.id));
  let removed = 0;
  for (const fishId of map.keys()) {
    if (!activeDeadIds.has(fishId)) {
      map.delete(fishId);
      removed += 1;
    }
  }
  return removed;
}

function updateConsumedDeadFishCorpseMotion(fish, now, deltaSeconds) {
  const livingPiranhas = getLivingPiranhaFish();
  const swarmCenter = livingPiranhas.length
    ? livingPiranhas.reduce((accumulator, piranha) => ({
      xNorm: accumulator.xNorm + piranha.xNorm,
      yNorm: accumulator.yNorm + piranha.yNorm
    }), { xNorm: 0, yNorm: 0 })
    : { xNorm: fish.xNorm, yNorm: fish.yNorm };
  if (livingPiranhas.length) {
    swarmCenter.xNorm /= livingPiranhas.length;
    swarmCenter.yNorm /= livingPiranhas.length;
  }

  fish.xNorm = clamp(
    fish.xNorm + (swarmCenter.xNorm - fish.xNorm) * Math.min(1, deltaSeconds * 1.6) + Math.sin(now / 360 + fish.phase * Math.PI) * deltaSeconds * 0.005,
    0.08,
    0.92
  );
  fish.yNorm = clamp(
    fish.yNorm + (swarmCenter.yNorm - fish.yNorm) * Math.min(1, deltaSeconds * 1.6) + Math.cos(now / 290 + fish.phase * Math.PI * 1.6) * deltaSeconds * 0.004,
    0.16,
    0.78
  );
  fish.motionLevel = clamp(fish.motionLevel + (0.42 - fish.motionLevel) * Math.min(1, deltaSeconds * 6), 0.12, 0.7);
  fish.wiggleClock += deltaSeconds * 1.8;
}

function updateDeadFishCaveExitMotion(fish, motion, now, deltaSeconds, species = getSpeciesForFish(fish)) {
  const nodes = Array.isArray(motion?.corpseCaveExitNodes) ? motion.corpseCaveExitNodes : [];
  if (!nodes.length) {
    motion.caveExitCleared = true;
    setDeadFishCorpseMotionStage(fish, fish.yNorm <= motion.surfaceYNorm + 0.006 ? "surface" : "rising", now, species);
    return true;
  }

  const index = clamp(Math.floor(Number(motion.corpseCaveExitIndex) || 0), 0, nodes.length - 1);
  const target = nodes[index];
  const dx = target.xNorm - fish.xNorm;
  const dy = target.yNorm - fish.yNorm;
  const distance = Math.hypot(dx, dy);
  const safeDeltaSeconds = clamp(Number(deltaSeconds) || 0, 0, 0.25);
  const maxStep = 0.048 * safeDeltaSeconds;

  if (distance <= Math.max(0.0035, maxStep)) {
    fish.xNorm = clamp(target.xNorm, 0.08, 0.92);
    fish.yNorm = clamp(target.yNorm, 0.14, 0.8);
    const nextIndex = index + 1;
    if (nextIndex < nodes.length) {
      motion.corpseCaveExitIndex = nextIndex;
    } else {
      motion.corpseCaveExitIndex = nodes.length;
      motion.caveExitCleared = true;
      if (Number.isFinite(Number(motion.sourceCaveFrontLayer)) && typeof setFishTankLayers === "function") {
        setFishTankLayers(fish, Number(motion.sourceCaveFrontLayer), Number(motion.sourceCaveFrontLayer));
      }
      if (Number.isFinite(Number(motion.sourceCaveReturnSubLayer)) && typeof setFishTankSublayers === "function") {
        setFishTankSublayers(fish, Number(motion.sourceCaveReturnSubLayer), Number(motion.sourceCaveReturnSubLayer));
      }
      setDeadFishCorpseMotionStage(fish, fish.yNorm <= motion.surfaceYNorm + 0.006 ? "surface" : "rising", now, species);
    }
  } else if (maxStep > 0) {
    const ratio = Math.min(1, maxStep / distance);
    fish.xNorm = clamp(fish.xNorm + dx * ratio, 0.08, 0.92);
    fish.yNorm = clamp(fish.yNorm + dy * ratio, 0.14, 0.8);
  }

  fish.motionLevel = clamp(fish.motionLevel + (0.02 - fish.motionLevel) * Math.min(1, safeDeltaSeconds * 4), 0.02, 0.12);
  return true;
}

function getDeadFishSurfaceSeparationShift(fish, motion, deltaSeconds) {
  if (!fish?.id || motion?.stage !== "surface") {
    return 0;
  }
  const safeDeltaSeconds = clamp(Number(deltaSeconds) || 0, 0, 0.25);
  if (safeDeltaSeconds <= 0) {
    return 0;
  }

  const fishList = typeof getAllTankFish === "function"
    ? getAllTankFish()
    : (typeof state !== "undefined" && Array.isArray(state?.fish) ? state.fish : []);
  if (!Array.isArray(fishList) || fishList.length < 2) {
    return 0;
  }

  const motionMap = getDeadFishCorpseMotionMap();
  const minimumHorizontalSpacing = 0.032;
  const maximumVerticalSeparation = 0.016;
  let accumulatedShift = 0;

  for (const other of fishList) {
    if (!other?.id || other.id === fish.id || !isFishDead(other)) {
      continue;
    }
    if (fish.tankId != null && other.tankId != null && fish.tankId !== other.tankId) {
      continue;
    }
    const otherMotion = motionMap?.get(other.id);
    if (!otherMotion || otherMotion.stage !== "surface") {
      continue;
    }
    if (Math.abs(Number(other.yNorm) - Number(fish.yNorm)) > maximumVerticalSeparation) {
      continue;
    }

    const dx = Number(fish.xNorm) - Number(other.xNorm);
    const absDx = Math.abs(dx);
    if (!Number.isFinite(absDx) || absDx >= minimumHorizontalSpacing) {
      continue;
    }

    const pushDirection = absDx > 0.0005
      ? (dx < 0 ? -1 : 1)
      : (String(fish.id).localeCompare(String(other.id)) < 0 ? -1 : 1);
    const overlapFactor = 1 - clamp(absDx / minimumHorizontalSpacing, 0, 1);
    accumulatedShift += pushDirection * 0.006 * overlapFactor * safeDeltaSeconds;
  }

  // This is deliberately a tiny corpse-only displacement, not collision AI.
  // Cap the combined correction so a crowded surface never causes a corpse to
  // jump, route, turn, or acquire a destination.
  return clamp(accumulatedShift, -0.002 * safeDeltaSeconds, 0.002 * safeDeltaSeconds);
}

function updateDeadFishCorpseMotion(fish, species, now = Date.now(), deltaSeconds = 0) {
  if (!fish || !species || !isFishDead(fish)) {
    if (fish?.id) {
      clearDeadFishCorpseMotion(fish.id);
    }
    return false;
  }

  const motion = getDeadFishCorpseMotionState(fish, now, species);
  if (!motion) {
    return false;
  }
  motion.lastUpdatedAt = now;
  motion.surfaceYNorm = clamp(
    getDeadFishFloatYNorm(fish, species, now) + (Number(motion.surfaceRestYOffsetNorm) || 0),
    0.12,
    0.8
  );

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    setDeadFishCorpseMotionStage(fish, "consumed", now, species);
    updateConsumedDeadFishCorpseMotion(fish, now, deltaSeconds);
    return true;
  }

  if (motion.stage === "transition") {
    const progress = getDeadFishTransitionProgress(motion, now);
    const eased = getDeadFishTransitionEase(progress);
    const residualMotion = 1 - eased;

    // Phase 4: newly dead fish lose purposeful motion before the corpse begins
    // its normal rise. Keep the body essentially where it died while a tiny
    // amount of residual momentum fades out.
    fish.xNorm = clamp(
      fish.xNorm + (Number(motion.sourceFacingDirection) < 0 ? -1 : 1) * deltaSeconds * 0.0028 * residualMotion * residualMotion,
      0.08,
      0.92
    );
    fish.motionLevel = clamp(
      Number(motion.sourceMotionLevel) * residualMotion + 0.02 * eased,
      0.02,
      Math.max(0.02, Number(motion.sourceMotionLevel) || 0.18)
    );
    fish.wiggleClock += deltaSeconds * (0.72 * residualMotion + 0.08);

    if (progress < 1) {
      return true;
    }

    if (motion.diedInCave && !motion.caveExitCleared && motion.corpseCaveExitNodes.length) {
      setDeadFishCorpseMotionStage(fish, "corpse_exiting_cave", now, species);
      return true;
    }

    const transitionSurface = fish.yNorm <= motion.surfaceYNorm + 0.006;
    setDeadFishCorpseMotionStage(fish, transitionSurface ? "surface" : "rising", now, species);
    return true;
  }

  if (motion.stage === "corpse_exiting_cave") {
    return updateDeadFishCaveExitMotion(fish, motion, now, deltaSeconds, species);
  }

  const safeDeltaSeconds = clamp(Number(deltaSeconds) || 0, 0, 0.25);
  const surfaceTolerance = 0.006;
  const atSurface = fish.yNorm <= motion.surfaceYNorm + surfaceTolerance;

  if (motion.stage !== "rising" && motion.stage !== "surface") {
    setDeadFishCorpseMotionStage(fish, atSurface ? "surface" : "rising", now, species);
  } else if (motion.stage === "surface" && !atSurface) {
    setDeadFishCorpseMotionStage(fish, "rising", now, species);
  }

  if (motion.stage === "rising") {
    // Phase 6: the water surface is a corpse-only vertical destination. The
    // corpse keeps its existing major layer and sublayer and does not invoke
    // living depth travel, target seeking, right-of-way, or normal navigation.
    const riseStep = 0.055 * safeDeltaSeconds;
    const candidateY = Math.max(motion.surfaceYNorm, fish.yNorm - riseStep);
    let blockingDecor = null;

    // Ordinary decor may briefly block the direct vertical path. Probe only
    // the corpse's current depth plane and, when necessary, slide sideways a
    // few pixels until the vertical path clears. Caves are excluded because a
    // corpse that died in one already used the dedicated cave-exit state.
    if (
      candidateY < fish.yNorm - 0.000001
      && typeof state !== "undefined"
      && Array.isArray(state?.placedDecor)
      && state.placedDecor.length
      && typeof getOverlappingDecorForFish === "function"
    ) {
      const tankWidth = typeof TANK_WIDTH !== "undefined" ? TANK_WIDTH : 1280;
      const tankHeight = typeof TANK_HEIGHT !== "undefined" ? TANK_HEIGHT : 720;
      const facingDirection = Number(motion.sourceFacingDirection) < 0 ? -1 : 1;
      const renderState = getDeadFishCorpseRenderState(fish, now, species);
      const probePose = {
        x: fish.xNorm * tankWidth,
        y: candidateY * tankHeight,
        swayX: 0,
        direction: facingDirection,
        facingScaleX: facingDirection,
        bodyScaleX: 1,
        bodyScaleY: 1,
        tilt: renderState.tilt,
        wiggle: 0,
        isDead: true
      };
      const currentLayer = typeof getFishTankLayer === "function"
        ? getFishTankLayer(fish)
        : Number(fish.tankLayer) || Number(motion.sourceTankLayer) || 1;
      const currentSubLayer = typeof getFishTankSubLayer === "function"
        ? getFishTankSubLayer(fish)
        : Number(fish.tankSubLayer) || Number(motion.sourceTankSubLayer) || 2;
      const overlaps = getOverlappingDecorForFish(fish, species, now, probePose, {
        minLayer: currentLayer,
        maxLayer: currentLayer,
        depthLayer: currentLayer,
        depthSubLayer: currentSubLayer
      });
      blockingDecor = (Array.isArray(overlaps) ? overlaps : []).find(({ item }) => (
        !(typeof isCaveDecorKey === "function" && isCaveDecorKey(item?.decorKey))
      )) || null;
    }

    if (!blockingDecor) {
      fish.yNorm = clamp(candidateY, motion.surfaceYNorm, 0.8);
      motion.riseBlockedDecorId = null;
      motion.riseAvoidDirection = 0;
    } else {
      const blockingId = blockingDecor.item?.id || "ordinary-decor";
      let avoidDirection = Number(motion.riseAvoidDirection);
      if (motion.riseBlockedDecorId !== blockingId || (avoidDirection !== -1 && avoidDirection !== 1)) {
        const decorXNorm = Number(blockingDecor.item?.xNorm);
        if (Number.isFinite(decorXNorm) && Math.abs(fish.xNorm - decorXNorm) > 0.002) {
          avoidDirection = fish.xNorm < decorXNorm ? -1 : 1;
        } else {
          avoidDirection = (Number(fish.phase) || 0) < 0.5 ? -1 : 1;
        }
        motion.riseBlockedDecorId = blockingId;
        motion.riseAvoidDirection = avoidDirection;
      }

      if ((fish.xNorm <= 0.085 && avoidDirection < 0) || (fish.xNorm >= 0.915 && avoidDirection > 0)) {
        avoidDirection *= -1;
        motion.riseAvoidDirection = avoidDirection;
      }
      fish.xNorm = clamp(fish.xNorm + avoidDirection * 0.026 * safeDeltaSeconds, 0.08, 0.92);
    }

    fish.motionLevel = clamp(fish.motionLevel + (0.02 - fish.motionLevel) * Math.min(1, safeDeltaSeconds * 3), 0.02, 0.14);

    if (fish.yNorm <= motion.surfaceYNorm + surfaceTolerance) {
      fish.yNorm = clamp(motion.surfaceYNorm, 0.12, 0.8);
      setDeadFishCorpseMotionStage(fish, "surface", now, species);
    }
    return true;
  }

  // Dead Fish Phase 24 final tuning keeps the settled body almost still: drift
  // remains perceptible over time, but the tiny render bob/sway never competes
  // with the clear upside-down silhouette.
  // Phase 10: surface corpses drift extremely slowly and independently of all
  // living navigation. The body keeps its existing facing direction and never
  // acquires a target; only corpse X changes here. Bobbing and tiny angle sway
  // are render-only so the authoritative surface Y remains stable.
  const surfaceMinXNorm = 0.08;
  const surfaceMaxXNorm = 0.92;
  let driftDirection = Number(motion.surfaceDriftDirection) < 0 ? -1 : 1;
  const driftSpeed = clamp(Number(motion.surfaceDriftSpeedNormPerSecond) || 0.0017, 0.0011, 0.0024);
  const driftPhase = Number(motion.surfaceDriftPhase) || 0;
  const driftPulse = 0.90 + Math.sin(now / 6200 + driftPhase) * 0.10;
  const wallDistance = driftDirection < 0
    ? fish.xNorm - surfaceMinXNorm
    : surfaceMaxXNorm - fish.xNorm;
  const wallEase = 0.35 + 0.65 * clamp(wallDistance / 0.04, 0, 1);
  const separationShift = getDeadFishSurfaceSeparationShift(fish, motion, safeDeltaSeconds);
  let nextXNorm = fish.xNorm
    + driftDirection * driftSpeed * driftPulse * wallEase * safeDeltaSeconds
    + separationShift;

  if (nextXNorm <= surfaceMinXNorm) {
    nextXNorm = surfaceMinXNorm + Math.min(0.002, surfaceMinXNorm - nextXNorm);
    driftDirection = 1;
  } else if (nextXNorm >= surfaceMaxXNorm) {
    nextXNorm = surfaceMaxXNorm - Math.min(0.002, nextXNorm - surfaceMaxXNorm);
    driftDirection = -1;
  }

  motion.surfaceDriftDirection = driftDirection;
  fish.xNorm = clamp(nextXNorm, surfaceMinXNorm, surfaceMaxXNorm);
  fish.yNorm = clamp(motion.surfaceYNorm, 0.12, 0.8);
  fish.motionLevel = clamp(fish.motionLevel + (0.02 - fish.motionLevel) * Math.min(1, safeDeltaSeconds * 2.4), 0.02, 0.12);
  return true;
}
