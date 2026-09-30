// Source fragment: rendering/fish-motion-and-floor.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function randomSwimX() {
  if (isMobilePageRuntime()) {
    const bounds = getMobileViewportSwimBoundsNorm(null, null, Date.now(), {
      edgeInsetPx: MOBILE_SWIM_EDGE_INSET_PX * 2
    });
    return bounds.minX + Math.random() * Math.max(0, bounds.maxX - bounds.minX);
  }

  return 0.08 + Math.random() * 0.84;
}

function randomSwimY(layer = DEFAULT_TANK_LAYER, fish = null, species = getSpeciesForFish(fish), options = {}) {
  const range = getLayerSwimYRange(layer, fish, species, options);
  return range.min + Math.random() * Math.max(0, range.max - range.min);
}

function normalizeFishHorizontalDirection(value, fallback = 1) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue !== 0) {
    return numericValue < 0 ? -1 : 1;
  }
  return Number(fallback) < 0 ? -1 : 1;
}

function getFishFacingDirection(fish) {
  return normalizeFishHorizontalDirection(fish?.displayDirection, 1);
}

function getFishLogicalDirection(fish) {
  return normalizeFishHorizontalDirection(fish?.direction, 1);
}

function getFishHorizontalTurnState(fish, now = Date.now()) {
  const displayDirection = getFishFacingDirection(fish);
  const logicalDirection = getFishLogicalDirection(fish);
  const startedAt = Number(fish?.turnStartedAt);
  const durationMs = Number(fish?.turnDurationMs);
  const active = Boolean(fish?.turnStartedAt) && Number.isFinite(durationMs) && durationMs > 0;
  const fromDirection = active
    ? normalizeFishHorizontalDirection(fish?.turnFromDirection, 1)
    : displayDirection;
  const toDirection = active
    ? normalizeFishHorizontalDirection(fish?.turnToDirection, 1)
    : displayDirection;
  const progress = active
    ? clamp((Number(now) - startedAt) / Math.max(1, durationMs), 0, 1)
    : 1;

  return {
    active,
    reversing: active && fromDirection !== toDirection,
    progress,
    startedAt: active ? startedAt : null,
    durationMs: active ? durationMs : 0,
    logicalDirection,
    displayDirection,
    fromDirection,
    toDirection,
    terminalFrameRendered: Number(fish?.turnFinalFrameRenderedAt) > 0
      && Number(fish?.turnFinalFrameRenderedForStartedAt) === startedAt
  };
}

function markFishTurnFinalFrameRendered(fish, now = Date.now()) {
  if (!fish) return false;
  const turnState = getFishHorizontalTurnState(fish, now);
  if (!turnState.active || turnState.progress < 1) return false;
  fish.turnFinalFrameRenderedAt = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  fish.turnFinalFrameRenderedForStartedAt = turnState.startedAt;
  return true;
}

function cancelFishV26TurnForSpecialMovementOwner(
  fish,
  species = getSpeciesForFish(fish),
  now = Date.now(),
  owner = "special-movement"
) {
  if (!fish || !species) return false;
  const turnState = getFishHorizontalTurnState(fish, now);
  if (!turnState.active) return false;

  // Only v26-origin sessions use this special-owner cancellation path. A v26
  // session that has fallen back to the lightweight visual is still a v26-origin
  // session, so the movement owner must clear it the same way.
  // Imported/debug-created active turns may not have a renderer session yet,
  // so establish their normal session contract before deciding ownership.
  if (!isFishTurnRendererSessionCurrent(fish)) {
    ensureFishTurnRendererSession(fish, species, turnState.startedAt || now);
  }
  const v26OriginSession = isFishTurnRendererSessionCurrent(fish)
    && normalizeFishTurnRendererBackend(fish.turnRendererBackend, "") === "v26";
  if (!v26OriginSession) return false;

  // A mechanic that owns pose/movement takes priority over the visual turn.
  // Preserve what the player is currently seeing rather than snapping to the
  // not-yet-rendered destination side, then let the owner continue unchanged.
  const preservedDirection = getFishFacingDirection(fish);
  const preservedAngle = preservedDirection < 0 ? Math.PI : 0;
  fish.direction = preservedDirection;
  fish.displayDirection = preservedDirection;
  fish.displayAngle = preservedAngle;
  fish.turnStartedAt = null;
  fish.turnDurationMs = 0;
  fish.turnFinalFrameRenderedAt = 0;
  fish.turnFinalFrameRenderedForStartedAt = 0;
  fish.turnAnimationMode = null;
  fish.turnFromDirection = preservedDirection;
  fish.turnToDirection = preservedDirection;
  fish.turnFromAngle = preservedAngle;
  fish.turnToAngle = preservedAngle;
  fish.turnSpinDirection = preservedDirection < 0 ? 1 : -1;
  fish.traversalTurnState = "idle";
  fish.traversalTurnStartedAt = 0;
  fish.traversalCommittedDirection = preservedDirection;
  fish.traversalTurnCommittedUntil = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  clearFishTurnRendererSession(fish);

  return true;
}

function reconcileFishV26TurnWithSpecialMovementOwner(
  fish,
  species = getSpeciesForFish(fish),
  now = Date.now()
) {
  if (!fish || !species || typeof getFishV26SpecialMovementOwner !== "function") return false;
  const owner = getFishV26SpecialMovementOwner(fish, species, now);
  if (!owner) return false;
  return cancelFishV26TurnForSpecialMovementOwner(fish, species, now, owner);
}

function getFishTurnLocomotionState(fish, now = Date.now()) {
  const horizontalTurn = getFishHorizontalTurnState(fish, now);
  if (!horizontalTurn.active) {
    return {
      ...horizontalTurn,
      holdsPosition: false,
      releaseProgress: FISH_TURN_LOCOMOTION_RELEASE_PROGRESS,
      movementBlend: 1,
      passiveSpeedScale: 1
    };
  }

  const movementRaw = clamp(
    (horizontalTurn.progress - FISH_TURN_LOCOMOTION_RELEASE_PROGRESS)
      / Math.max(0.001, 1 - FISH_TURN_LOCOMOTION_RELEASE_PROGRESS),
    0,
    1
  );
  const movementBlend = movementRaw * movementRaw * (3 - 2 * movementRaw);
  const holdsPosition = !horizontalTurn.reversing
    && horizontalTurn.progress < FISH_TURN_LOCOMOTION_RELEASE_PROGRESS;

  return {
    ...horizontalTurn,
    holdsPosition,
    releaseProgress: FISH_TURN_LOCOMOTION_RELEASE_PROGRESS,
    movementBlend,
    passiveSpeedScale: 0.12 + movementBlend * 0.88
  };
}

function beginFishTurnaroundCooldown(fish, direction, now = Date.now()) {
  if (!fish) return;
  const startedAt = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  fish.turnaroundCooldownDirection = normalizeFishHorizontalDirection(direction, getFishFacingDirection(fish));
  fish.turnaroundCooldownStartedAt = startedAt;
  fish.turnaroundCooldownUntil = startedAt + FISH_TURNAROUND_COOLDOWN_MS;
  fish.turnaroundCooldownMaxUntil = startedAt + FISH_TURNAROUND_COOLDOWN_MAX_MS;
  fish.turnaroundCooldownStartXNorm = Number(fish.xNorm) || 0.5;
  fish.turnaroundCooldownStartYNorm = Number(fish.yNorm) || 0.5;
}

function getFishTurnaroundCooldownState(fish, now = Date.now()) {
  const direction = normalizeFishHorizontalDirection(fish?.turnaroundCooldownDirection, getFishFacingDirection(fish));
  const until = Number(fish?.turnaroundCooldownUntil) || 0;
  const maxUntil = Number(fish?.turnaroundCooldownMaxUntil) || 0;
  const traveled = Math.hypot(
    (Number(fish?.xNorm) || 0.5) - (Number(fish?.turnaroundCooldownStartXNorm) || 0.5),
    (Number(fish?.yNorm) || 0.5) - (Number(fish?.turnaroundCooldownStartYNorm) || 0.5)
  );
  const active = Number(now) < until
    || (Number(now) < maxUntil && traveled < FISH_TURNAROUND_MIN_POST_TURN_TRAVEL_NORM);
  if (!active && fish) {
    fish.turnaroundCooldownUntil = 0;
    fish.turnaroundCooldownMaxUntil = 0;
  }
  return { active, direction, traveled, until, maxUntil };
}

function normalizeAngle(angle) {
  let next = Number.isFinite(Number(angle)) ? Number(angle) : 0;
  while (next > Math.PI) {
    next -= Math.PI * 2;
  }
  while (next <= -Math.PI) {
    next += Math.PI * 2;
  }
  return next;
}

function getFishFacingAngle(fish) {
  return Number.isFinite(Number(fish?.displayAngle))
    ? normalizeAngle(Number(fish.displayAngle))
    : (getFishFacingDirection(fish) < 0 ? Math.PI : 0);
}

function getFishEntryProgress(fish, now = Date.now()) {
  if (
    !fish
    || !Number.isFinite(Number(fish.entryStartedAt))
    || Number(fish.entryDurationMs) <= 0
  ) {
    return null;
  }

  return clamp(
    (now - Number(fish.entryStartedAt)) / Math.max(1, Number(fish.entryDurationMs)),
    0,
    1
  );
}

function getFishEntryRightingProgress(entryProgress) {
  if (!Number.isFinite(entryProgress)) {
    return null;
  }

  return clamp(
    (entryProgress - FISH_ENTRY_SPLASH_PROGRESS)
    / Math.max(0.001, FISH_ENTRY_RIGHTING_END_PROGRESS - FISH_ENTRY_SPLASH_PROGRESS),
    0,
    1
  );
}

function getDirectedAngleDelta(fromAngle, toAngle, spinDirection = 1) {
  const start = normalizeAngle(fromAngle);
  const end = normalizeAngle(toAngle);
  const clockwiseDelta = (end - start + Math.PI * 2) % (Math.PI * 2);
  const counterClockwiseDelta = clockwiseDelta - Math.PI * 2;
  const shortestDelta = Math.abs(clockwiseDelta) <= Math.abs(counterClockwiseDelta)
    ? clockwiseDelta
    : counterClockwiseDelta;
  if (Math.abs(shortestDelta) <= Math.PI * 0.55) {
    return shortestDelta;
  }
  return spinDirection < 0 ? counterClockwiseDelta : clockwiseDelta;
}

function getFishSwimTiltForVector(deltaXNorm, deltaYNorm) {
  const deltaXPx = Math.abs(Number(deltaXNorm) || 0) * TANK_WIDTH;
  const deltaYPx = (Number(deltaYNorm) || 0) * TANK_HEIGHT;
  if (Math.hypot(deltaXPx, deltaYPx) < 0.001) {
    return 0;
  }

  return clamp(
    Math.atan2(deltaYPx, Math.max(0.001, deltaXPx)),
    -FISH_SWIM_TILT_MAX,
    FISH_SWIM_TILT_MAX
  );
}

function updateFishSwimTilt(fish, desiredTilt, deltaSeconds) {
  if (!fish) {
    return 0;
  }

  const currentTilt = Number.isFinite(Number(fish.swimTilt))
    ? clamp(Number(fish.swimTilt), -FISH_SWIM_TILT_MAX, FISH_SWIM_TILT_MAX)
    : 0;
  const targetTilt = clamp(
    Number.isFinite(Number(desiredTilt)) ? Number(desiredTilt) : 0,
    -FISH_SWIM_TILT_MAX,
    FISH_SWIM_TILT_MAX
  );
  const elapsedSeconds = clamp(Number(deltaSeconds) || 0, 0, 0.1);
  const response = 1 - Math.exp(-FISH_SWIM_TILT_RESPONSE_PER_SECOND * elapsedSeconds);
  const responsiveStep = (targetTilt - currentTilt) * response;
  const maximumStep = FISH_SWIM_TILT_MAX_RADIANS_PER_SECOND * elapsedSeconds;
  const nextTilt = currentTilt + clamp(responsiveStep, -maximumStep, maximumStep);

  fish.swimTilt = Math.abs(targetTilt - nextTilt) <= FISH_SWIM_TILT_SETTLE_EPSILON
    ? targetTilt
    : nextTilt;
  return fish.swimTilt;
}

function getFishSteeringHorizontalDirection(fish, deltaXNorm, deltaYNorm) {
  const dxPx = (Number(deltaXNorm) || 0) * TANK_WIDTH;
  const dyPx = (Number(deltaYNorm) || 0) * TANK_HEIGHT;
  const traversalHeadingXNorm = Number(fish?.traversalHeadingXNorm);
  const carriedDirection = Math.abs(traversalHeadingXNorm) > 0.000001
    ? (traversalHeadingXNorm < 0 ? -1 : 1)
    : getFishFacingDirection(fish);
  const lateralClearancePx = clamp(
    Math.abs(dyPx) * FISH_VERTICAL_TRAVERSAL_CLEARANCE_FROM_HEIGHT,
    FISH_VERTICAL_TRAVERSAL_MIN_LATERAL_CLEARANCE_PX,
    FISH_VERTICAL_TRAVERSAL_MAX_LATERAL_CLEARANCE_PX
  );
  const verticallyDominant = Math.abs(dyPx) > Math.max(10, Math.abs(dxPx) * 1.15);

  // A target almost directly above or below is not permission to alternate
  // left/right on sub-pixel error. Carry the current heading until the fish
  // has made enough lateral room to arc back toward the target. This makes a
  // vertical destination a two-part swimming route instead of a wall press.
  if (verticallyDominant && Math.abs(dxPx) < lateralClearancePx) {
    return carriedDirection;
  }
  if (Math.abs(dxPx) > 0.5) {
    return dxPx < 0 ? -1 : 1;
  }
  return carriedDirection;
}

function getFishGradualSteeringVector(fish, deltaXNorm, deltaYNorm, deltaSeconds, options = {}) {
  const dx = Number(deltaXNorm) || 0;
  const dy = Number(deltaYNorm) || 0;
  if (fish && options.turnReversal) {
    // A reversal already supplies a continuous heading through zero X.
    // Ordinary forward-only steering would destroy that midpoint and snap
    // from source-facing to destination-facing horizontal motion.
    const lengthPx = Math.hypot(dx * TANK_WIDTH, dy * TANK_HEIGHT);
    fish.steeringVerticalRatio = lengthPx > 0.001
      ? clamp(dy * TANK_HEIGHT / lengthPx, -FISH_VERTICAL_TRAVERSAL_MAX_RATIO, FISH_VERTICAL_TRAVERSAL_MAX_RATIO)
      : 0;
    return { xNorm: dx, yNorm: dy };
  }
  const distanceNorm = Math.hypot(dx, dy);
  if (!fish || distanceNorm <= 0.000001) {
    if (fish) fish.steeringVerticalRatio = 0;
    return { xNorm: dx, yNorm: dy };
  }

  const dxPx = dx * TANK_WIDTH;
  const dyPx = dy * TANK_HEIGHT;
  const distancePx = Math.hypot(dxPx, dyPx);
  if (distancePx <= 0.001) {
    return { xNorm: dx, yNorm: dy };
  }

  const desiredVerticalRatio = clamp(dyPx / distancePx, -FISH_VERTICAL_TRAVERSAL_MAX_RATIO, FISH_VERTICAL_TRAVERSAL_MAX_RATIO);
  const currentVerticalRatio = Number.isFinite(Number(fish.steeringVerticalRatio))
    ? clamp(Number(fish.steeringVerticalRatio), -1, 1)
    : 0;
  const elapsedSeconds = clamp(Number(deltaSeconds) || 0, 0, 0.1);
  const urgency = clamp(Number(options.urgency) || 1, 0.55, 2.1);
  const response = 1 - Math.exp(-2.8 * urgency * elapsedSeconds);
  const responsiveStep = (desiredVerticalRatio - currentVerticalRatio) * response;
  const maximumStep = 1.45 * urgency * elapsedSeconds;
  const nextVerticalRatio = clamp(
    currentVerticalRatio + clamp(responsiveStep, -maximumStep, maximumStep),
    -FISH_VERTICAL_TRAVERSAL_MAX_RATIO,
    FISH_VERTICAL_TRAVERSAL_MAX_RATIO
  );
  fish.steeringVerticalRatio = Math.abs(desiredVerticalRatio - nextVerticalRatio) < 0.012
    ? desiredVerticalRatio
    : nextVerticalRatio;

  const horizontalSign = getFishSteeringHorizontalDirection(fish, dx, dy);
  const verticalRatio = fish.steeringVerticalRatio;
  const horizontalRatio = Math.sqrt(Math.max(0.001, 1 - verticalRatio * verticalRatio));

  // Convert the smoothed screen-space heading back into normalized tank-space
  // while preserving the remaining target distance. This bends the path into
  // climbs and dives instead of instantly snapping to a new diagonal vector.
  // The vertical component is bounded, so a climb or dive always carries a
  // visible forward swim rather than reading as an in-place sprite rotation.
  const unitXNorm = horizontalSign * horizontalRatio / TANK_WIDTH;
  const unitYNorm = verticalRatio / TANK_HEIGHT;
  const unitNormLength = Math.hypot(unitXNorm, unitYNorm) || 1;
  return {
    xNorm: unitXNorm / unitNormLength * distanceNorm,
    yNorm: unitYNorm / unitNormLength * distanceNorm
  };
}

function updateFishTurnState(fish, species, now) {
  const freeSwimmingOtocinclus = species?.id === "otocinclus" && isSuckerFishFreeSwimming(fish, species, now);
  if (species.behavior !== "sucker" || freeSwimmingOtocinclus) {
    const liveDirection = getFishLogicalDirection(fish);
    const horizontalTurn = getFishHorizontalTurnState(fish, now);
    if (!horizontalTurn.active) {
      fish.traversalTurnState = "idle";
      fish.displayDirection = liveDirection;
      fish.displayAngle = liveDirection < 0 ? Math.PI : 0;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.turnFinalFrameRenderedAt = 0;
      fish.turnFinalFrameRenderedForStartedAt = 0;
      clearFishTurnRendererSession(fish);
      fish.turnAnimationMode = null;
      fish.turnFromDirection = fish.displayDirection;
      fish.turnToDirection = fish.displayDirection;
      fish.turnFromAngle = fish.displayAngle;
      fish.turnToAngle = fish.displayAngle;
      fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
      return;
    }

    const progress = horizontalTurn.progress;
    const fromDirection = horizontalTurn.fromDirection;
    const toDirection = horizontalTurn.toDirection;
    fish.traversalTurnState = fromDirection === toDirection ? "turning" : "reversing";
    const useComplexTurn = getFishTurnAnimationMode(fish, species) === "complex"
      && getFishTurnRendererBackend(fish, species) === "v26";

    if (useComplexTurn) {
      // The active complex turn renderer owns the visible reversal. Keep the
      // gameplay-facing sprite state locked to the source side until the
      // renderer confirms that its terminal frame has actually been drawn.
      fish.displayDirection = fromDirection;
      fish.displayAngle = fromDirection < 0 ? Math.PI : 0;

      if (progress >= 1 && horizontalTurn.terminalFrameRendered) {
        fish.traversalTurnState = "idle";
        fish.displayDirection = liveDirection;
        fish.displayAngle = liveDirection < 0 ? Math.PI : 0;
        fish.turnStartedAt = null;
        fish.turnDurationMs = 0;
        fish.turnFinalFrameRenderedAt = 0;
        fish.turnFinalFrameRenderedForStartedAt = 0;
        clearFishTurnRendererSession(fish);
        fish.turnAnimationMode = null;
        fish.turnFromDirection = fish.displayDirection;
        fish.turnToDirection = fish.displayDirection;
        fish.turnFromAngle = fish.displayAngle;
        fish.turnToAngle = fish.displayAngle;
        fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
        if (fromDirection !== toDirection) beginFishTurnaroundCooldown(fish, liveDirection, now);
      }
      return;
    }

    // Lightweight legacy turnaround: squash toward the midpoint, flip while
    // narrow, then expand on the destination side.
    const visibleDirection = progress < 0.5 ? fromDirection : toDirection;
    fish.displayDirection = visibleDirection;
    fish.displayAngle = visibleDirection < 0 ? Math.PI : 0;

    if (progress >= 1) {
      fish.traversalTurnState = "idle";
      fish.displayDirection = liveDirection;
      fish.displayAngle = liveDirection < 0 ? Math.PI : 0;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.turnFinalFrameRenderedAt = 0;
      fish.turnFinalFrameRenderedForStartedAt = 0;
      clearFishTurnRendererSession(fish);
      fish.turnAnimationMode = null;
      fish.turnFromDirection = fish.displayDirection;
      fish.turnToDirection = fish.displayDirection;
      fish.turnFromAngle = fish.displayAngle;
      fish.turnToAngle = fish.displayAngle;
      fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
      if (fromDirection !== toDirection) beginFishTurnaroundCooldown(fish, liveDirection, now);
    }
    return;
  }

  if (!fish.turnStartedAt || fish.turnDurationMs <= 0) {
    fish.displayAngle = getFishFacingAngle(fish);
    fish.displayDirection = Math.cos(fish.displayAngle) < 0 ? -1 : 1;
    fish.turnFinalFrameRenderedAt = 0;
    fish.turnFinalFrameRenderedForStartedAt = 0;
    clearFishTurnRendererSession(fish);
    return;
  }

  if (now >= fish.turnStartedAt + fish.turnDurationMs) {
    fish.displayAngle = Number.isFinite(Number(fish.turnToAngle))
      ? normalizeAngle(Number(fish.turnToAngle))
      : getFishFacingAngle(fish);
    fish.displayDirection = Math.cos(fish.displayAngle) < 0 ? -1 : 1;
    fish.turnStartedAt = null;
    fish.turnDurationMs = 0;
    fish.turnFinalFrameRenderedAt = 0;
    fish.turnFinalFrameRenderedForStartedAt = 0;
    clearFishTurnRendererSession(fish);
    fish.turnAnimationMode = null;
    fish.turnFromDirection = fish.displayDirection;
    fish.turnToDirection = fish.displayDirection;
    fish.turnFromAngle = fish.displayAngle;
    fish.turnToAngle = fish.displayAngle;
    fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
  }
}

function setSuckerFishAngle(fish, desiredAngle, now) {
  const nextAngle = normalizeAngle(desiredAngle);
  const currentAngle = getFishFacingAngle(fish);
  if (Math.abs(getDirectedAngleDelta(currentAngle, nextAngle, fish.turnSpinDirection || 1)) < 0.06) {
    fish.displayAngle = nextAngle;
    fish.displayDirection = Math.cos(nextAngle) < 0 ? -1 : 1;
    fish.direction = fish.displayDirection;
    return;
  }

  const pendingAngle = fish.turnStartedAt && fish.turnDurationMs > 0
    ? normalizeAngle(Number.isFinite(Number(fish.turnToAngle)) ? Number(fish.turnToAngle) : currentAngle)
    : currentAngle;
  if (Math.abs(getDirectedAngleDelta(pendingAngle, nextAngle, fish.turnSpinDirection || 1)) < 0.08) {
    return;
  }

  if (fish.turnStartedAt && fish.turnDurationMs > 0) {
    return;
  }

  const spinDirection = Math.random() < 0.5 ? -1 : 1;
  const turnDelta = getDirectedAngleDelta(currentAngle, nextAngle, spinDirection);
  fish.turnStartedAt = now;
  fish.turnDurationMs = 900 + Math.abs(turnDelta) * 620 + Math.random() * 420;
  fish.turnFromAngle = currentAngle;
  fish.turnToAngle = nextAngle;
  fish.turnSpinDirection = spinDirection;
  fish.turnFromDirection = Math.cos(currentAngle) < 0 ? -1 : 1;
  fish.turnToDirection = Math.cos(nextAngle) < 0 ? -1 : 1;
  fish.direction = fish.turnToDirection;
}

function setFishDirection(fish, desiredDirection, species, now) {
  const nextDirection = Number(desiredDirection) < 0 ? -1 : 1;
  const freeSwimmingOtocinclus = species?.id === "otocinclus" && isSuckerFishFreeSwimming(fish, species, now);
  if (getEffectiveFishBehavior(fish, species) !== "sucker" || freeSwimmingOtocinclus) {
    const currentDisplayDirection = getFishFacingDirection(fish);
    const currentDisplayAngle = currentDisplayDirection < 0 ? Math.PI : 0;
    const hasTravelTarget = Math.hypot(
      (Number(fish.targetXNorm) || Number(fish.xNorm) || 0.5) - (Number(fish.xNorm) || 0.5),
      (Number(fish.targetYNorm) || Number(fish.yNorm) || 0.5) - (Number(fish.yNorm) || 0.5)
    ) > FISH_DIRECTION_TARGET_DEADZONE_NORM;

    if (
      nextDirection !== currentDisplayDirection
      && (Number(fish.traversalSpeedNorm) || 0) < FISH_TRAVERSAL_HEADING_MIN_SPEED_NORM
      && !hasTravelTarget
    ) {
      // A cosmetic idle state cannot command a physical reversal. Movement
      // will start the turn later once there is somewhere to travel.
      return;
    }

    const horizontalTurn = getFishHorizontalTurnState(fish, now);
    if (horizontalTurn.active) {
      // Finish the current turn before accepting another reversal. Moving
      // targets and collision corrections can cross the fish several times
      // per second; cancelling and restarting here created rapid left/right
      // flip loops even though the fish had barely moved. The latched
      // destination direction is authoritative until the renderer handoff.
      fish.direction = horizontalTurn.toDirection;
      return;
    }

    fish.direction = nextDirection;
    if (nextDirection === currentDisplayDirection) {
      fish.displayDirection = nextDirection;
      fish.displayAngle = currentDisplayAngle;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.turnFinalFrameRenderedAt = 0;
      fish.turnFinalFrameRenderedForStartedAt = 0;
      clearFishTurnRendererSession(fish);
      fish.turnAnimationMode = null;
      fish.turnFromDirection = nextDirection;
      fish.turnToDirection = nextDirection;
      fish.turnFromAngle = currentDisplayAngle;
      fish.turnToAngle = currentDisplayAngle;
      fish.turnSpinDirection = nextDirection < 0 ? 1 : -1;
      return;
    }

    fish.displayDirection = currentDisplayDirection;
    fish.displayAngle = currentDisplayAngle;
    fish.turnAnimationMode = getFishTurnAnimationMode(fish, species);
    fish.turnStartedAt = now;
    fish.turnFinalFrameRenderedAt = 0;
    fish.turnFinalFrameRenderedForStartedAt = 0;
    const turnRendererBackend = beginFishTurnRendererSession(
      fish,
      species,
      now,
      fish.turnAnimationMode
    );
    fish.turnDurationMs = getFishTurnDurationMs(
      fish,
      species,
      fish.turnAnimationMode,
      turnRendererBackend
    );
    fish.turnFromDirection = currentDisplayDirection;
    fish.turnToDirection = nextDirection;
    fish.turnFromAngle = currentDisplayAngle;
    fish.turnToAngle = nextDirection < 0 ? Math.PI : 0;
    fish.turnSpinDirection = Math.random() < 0.5 ? -1 : 1;
    fish.traversalTurnState = "reversing";
    fish.traversalTurnStartedAt = now;
    fish.traversalCommittedDirection = nextDirection;
    fish.traversalTurnCommittedUntil = now + Math.max(FISH_TRAVERSAL_TURN_COMMIT_MIN_MS, fish.turnDurationMs);
    fish.traversalSteeringTargetXNorm = Number.isFinite(Number(fish.targetXNorm)) ? Number(fish.targetXNorm) : fish.xNorm;
    fish.traversalSteeringTargetYNorm = Number.isFinite(Number(fish.targetYNorm)) ? Number(fish.targetYNorm) : fish.yNorm;
    return;
  }

  fish.direction = nextDirection;
  setSuckerFishAngle(fish, nextDirection < 0 ? Math.PI : 0, now);
}

function getActiveGravelContour() {
  if (runtime.scene?.gravelSurfaceContour?.length) {
    return runtime.scene.gravelSurfaceContour;
  }
  return runtime.scene?.substrateContour || [0, 0];
}

function getVisibleTankVirtualBounds() {
  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  const offsetX = Number(runtime.stageRenderOffsetX) || 0;
  const offsetY = Number(runtime.stageRenderOffsetY) || 0;
  const stageSize = getTankStageLayoutSize();
  const displayWidth = Math.max(1, dom.tankCanvas?.width || Math.round((stageSize.width || TANK_WIDTH) * dpr));
  const displayHeight = Math.max(1, dom.tankCanvas?.height || Math.round((stageSize.height || TANK_HEIGHT) * dpr));
  const left = clamp((-offsetX) / scale, 0, TANK_WIDTH);
  const top = clamp((-offsetY) / scale, 0, TANK_HEIGHT);
  const right = clamp((displayWidth - offsetX) / scale, left, TANK_WIDTH);
  const bottom = clamp((displayHeight - offsetY) / scale, top, TANK_HEIGHT);
  return {
    left,
    top,
    right,
    bottom
  };
}

function getSceneLayoutVisibleTankVirtualBounds() {
  if ((Number(runtime.stageEditViewAmount) || 0) > 0.001) {
    const normalView = getNormalCoverStageRenderMetrics();
    if (normalView?.visibleBounds) {
      return normalView.visibleBounds;
    }
  }
  return getVisibleTankVirtualBounds();
}

function normalizeViewportNormRange(min, max, fallbackCenter) {
  if (min <= max) {
    return {
      min,
      max
    };
  }

  const center = clamp(fallbackCenter, 0, 1);
  return {
    min: center,
    max: center
  };
}

function getMobileViewportSwimBoundsNorm(fish = null, species = getSpeciesForFish(fish), now = Date.now(), options = {}) {
  if (!isMobilePageRuntime()) {
    return {
      minX: 0.08,
      maxX: 0.92,
      minY: 0.14,
      maxY: 0.8
    };
  }

  const visibleBounds = getSceneLayoutVisibleTankVirtualBounds();
  const imagePath = species
    ? (getFishDisplayAssetPath(fish, species, now) || species.asset)
    : null;
  const image = imagePath ? runtime.images.get(imagePath) : null;
  const width = species
    ? getFishDisplayWidth(fish || {
      speciesId: species.id,
      scale: species.defaultScale || DEFAULT_FISH_SCALE
    }, species, now)
    : 0;
  const height = image?.width && width
    ? width * (image.height / image.width)
    : width * 0.58;
  const edgeInsetPx = Number.isFinite(Number(options.edgeInsetPx))
    ? Math.max(0, Number(options.edgeInsetPx))
    : MOBILE_SWIM_EDGE_INSET_PX;
  const xInset = Math.max(edgeInsetPx, width * 0.5);
  const yInset = Math.max(edgeInsetPx, height * 0.5);
  const centerX = ((visibleBounds.left + visibleBounds.right) * 0.5) / TANK_WIDTH;
  const centerY = ((visibleBounds.top + visibleBounds.bottom) * 0.5) / TANK_HEIGHT;
  const xRange = normalizeViewportNormRange(
    clamp((visibleBounds.left + xInset) / TANK_WIDTH, 0, 1),
    clamp((visibleBounds.right - xInset) / TANK_WIDTH, 0, 1),
    centerX
  );
  const yRange = normalizeViewportNormRange(
    clamp((visibleBounds.top + yInset) / TANK_HEIGHT, 0, 1),
    clamp((visibleBounds.bottom - yInset) / TANK_HEIGHT, 0, 1),
    centerY
  );

  return {
    minX: xRange.min,
    maxX: xRange.max,
    minY: yRange.min,
    maxY: yRange.max
  };
}

function clampFishXNormToMobileViewport(xNorm, fish = null, species = getSpeciesForFish(fish), now = Date.now()) {
  const value = Number.isFinite(Number(xNorm)) ? Number(xNorm) : 0.5;
  if (!isMobilePageRuntime()) {
    return clamp(value, 0.08, 0.92);
  }

  const bounds = getMobileViewportSwimBoundsNorm(fish, species, now);
  return clamp(value, bounds.minX, bounds.maxX);
}

function clampFishToMobileViewport(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!isMobilePageRuntime() || !fish || !species) {
    return false;
  }

  const suckerBehaviorActive = getEffectiveFishBehavior(fish, species) === "sucker";
  const suckerFreeSwimming = suckerBehaviorActive && isSuckerFishFreeSwimming(fish, species, now);
  const currentLayer = suckerBehaviorActive && !suckerFreeSwimming
    ? getSuckerFishGlassLayer(fish)
    : getFishTankLayer(fish);
  const targetLayer = suckerBehaviorActive && !suckerFreeSwimming
    ? getDesiredSuckerFishGlassLayer(fish)
    : getDesiredFishTankLayer(fish);
  const clampYNorm = (value, layer) => {
    if (isWhaleBreathActive(fish, species)) {
      const minYNorm = getWhaleBreathSurfaceYNorm(fish, species);
      return clamp(Number.isFinite(Number(value)) ? Number(value) : minYNorm, minYNorm, 0.8);
    }
    if (fish.activity === FISH_GRAVEL_DIG_ACTIVITY) {
      const viewportBounds = getMobileViewportSwimBoundsNorm(fish, species, now);
      const minYNorm = Math.max(0.14, viewportBounds.minY);
      const maxYNorm = Math.max(minYNorm, Math.min(0.96, viewportBounds.maxY));
      return clamp(Number.isFinite(Number(value)) ? Number(value) : minYNorm, minYNorm, maxYNorm);
    }

    return clampFishYNormToLayer(value, fish, species, layer, {
      minYNorm: 0.14,
      maxYNorm: suckerFreeSwimming && fish?.suckerFreeSwimMode === "gravel-scan" ? 0.94 : 0.8
    });
  };
  const xNorm = clampFishXNormToMobileViewport(fish.xNorm, fish, species, now);
  const yNorm = clampYNorm(fish.yNorm, currentLayer);
  const targetXNorm = clampFishXNormToMobileViewport(
    Number.isFinite(Number(fish.targetXNorm)) ? fish.targetXNorm : xNorm,
    fish,
    species,
    now
  );
  const targetYNorm = clampYNorm(
    Number.isFinite(Number(fish.targetYNorm)) ? fish.targetYNorm : yNorm,
    targetLayer
  );
  const changed = Math.abs(xNorm - fish.xNorm) > 0.000001
    || Math.abs(yNorm - fish.yNorm) > 0.000001
    || Math.abs(targetXNorm - fish.targetXNorm) > 0.000001
    || Math.abs(targetYNorm - fish.targetYNorm) > 0.000001;

  fish.xNorm = xNorm;
  fish.yNorm = yNorm;
  fish.targetXNorm = targetXNorm;
  fish.targetYNorm = targetYNorm;
  return changed;
}

function getTargetVisibleGravelHeightPx() {
  const stageSize = getTankStageLayoutSize();
  const stageHeight = stageSize.height || (dom.tankCanvas?.height ? dom.tankCanvas.height / getStageRenderDevicePixelRatio() : TANK_HEIGHT);
  return stageHeight * (isMobilePageRuntime() ? MOBILE_GRAVEL_VIEWPORT_HEIGHT_RATIO : GRAVEL_VIEWPORT_HEIGHT_RATIO);
}

function getTargetVisibleGravelHeightVirtual() {
  const targetHeightPx = getTargetVisibleGravelHeightPx();
  const editAmount = clamp(Number(runtime.stageEditViewAmount) || 0, 0, 1);
  if (editAmount <= 0.001) {
    return getViewportPxAsTankVirtual(targetHeightPx);
  }

  // Edit mode is a camera pullback, not a re-layout. Preserve the gravel's
  // normal-view world height and let the stage transform shrink it together
  // with every other object in the aquarium.
  const dpr = getStageRenderDevicePixelRatio();
  const normalScale = Math.max(
    0.0001,
    Number(getNormalCoverStageRenderMetrics()?.scale) || Number(runtime.stageRenderScale) || dpr
  );
  return (targetHeightPx * dpr) / normalScale;
}

function getVisibleTankFloorBottomY() {
  return getSceneLayoutVisibleTankVirtualBounds().bottom;
}

function getDynamicGravelSurfaceBaseY() {
  return Math.max(
    WATER_SURFACE_Y + 28,
    getVisibleTankFloorBottomY() - getTargetVisibleGravelHeightVirtual()
  );
}

function getGravelFloorLayoutKey() {
  return [
    WATER_SURFACE_Y.toFixed(2),
    getVisibleTankFloorBottomY().toFixed(2),
    getTargetVisibleGravelHeightVirtual().toFixed(2)
  ].join(":");
}

function getGravelSurfacePointY(point) {
  return getDynamicGravelSurfaceBaseY() + point * 11;
}

function traceTankFloorPath(context = tankContext, ridge = getActiveGravelContour()) {
  context.beginPath();
  context.moveTo(GLASS_MARGIN_X, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);
  context.lineTo(GLASS_MARGIN_X, getGravelSurfacePointY(ridge[0]));
  ridge.forEach((point, index) => {
    const x = GLASS_MARGIN_X + (index / (ridge.length - 1)) * (TANK_WIDTH - GLASS_MARGIN_X * 2);
    const y = getGravelSurfacePointY(point);
    context.lineTo(x, y);
  });
  context.lineTo(TANK_WIDTH - GLASS_MARGIN_X, TANK_HEIGHT - GLASS_MARGIN_BOTTOM);
  context.closePath();
}

function traceTankFloorSurfaceBandPath(context = tankContext, ridge = getActiveGravelContour(), bandDepthPx = GRAVEL_SURFACE_CAP_DEPTH_PX + 7) {
  const points = ridge.map((point, index) => ({
    x: GLASS_MARGIN_X + (index / (ridge.length - 1)) * (TANK_WIDTH - GLASS_MARGIN_X * 2),
    y: getGravelSurfacePointY(point)
  }));

  context.beginPath();
  context.moveTo(points[0].x, points[0].y - 2);
  points.forEach((point) => {
    context.lineTo(point.x, point.y - 2);
  });
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    context.lineTo(point.x, point.y + bandDepthPx);
  }
  context.closePath();
}

function getTankFloorSurfaceYAtX(x) {
  const ridge = getActiveGravelContour();
  const width = TANK_WIDTH - GLASS_MARGIN_X * 2;
  const normalized = clamp((x - GLASS_MARGIN_X) / width, 0, 1) * (ridge.length - 1);
  const leftIndex = Math.floor(normalized);
  const rightIndex = Math.min(ridge.length - 1, leftIndex + 1);
  const blend = normalized - leftIndex;
  const heightPoint = ridge[leftIndex] * (1 - blend) + ridge[rightIndex] * blend;
  return getGravelSurfacePointY(heightPoint);
}

function buildGravelSurfaceContour(seed = 1) {
  const rand = mulberry32((Math.abs(Math.floor(seed || 1)) || 1) ^ 0x3c6ef35f);
  const contour = Array.from({ length: SUBSTRATE_CONTOUR_POINTS }, (_, index) => {
    const t = index / Math.max(1, SUBSTRATE_CONTOUR_POINTS - 1);
    const longWave = Math.sin(t * Math.PI * (1.12 + rand() * 0.26) + rand() * Math.PI * 2) * 0.3;
    const midWave = Math.sin(t * Math.PI * (2.45 + rand() * 0.9) + rand() * Math.PI * 2) * 0.11;
    const ripple = Math.sin(t * Math.PI * (5.4 + rand() * 1.1) + rand() * Math.PI * 2) * 0.035;
    return longWave + midWave + ripple + (rand() - 0.5) * 0.05;
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 1; index < contour.length - 1; index += 1) {
      contour[index] = contour[index - 1] * 0.24 + contour[index] * 0.52 + contour[index + 1] * 0.24;
    }
  }

  contour[0] *= 0.3;
  contour[contour.length - 1] *= 0.3;
  return contour.map((value) => clamp(value, -0.42, 0.42));
}
