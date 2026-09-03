// Source fragment: fish/predators-and-motion.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getPiranhaTargetCandidate(now = Date.now()) {
  if (!PIRANHA_BEHAVIOR_ENABLED || !isViolenceEnabled()) {
    return null;
  }

  const activePrey = getActivePiranhaPrey(now);
  if (activePrey) {
    return activePrey;
  }

  const piranhas = getLivingPiranhaFish();
  if (!piranhas.length) {
    return null;
  }

  const draggedFishId = runtime.fishDragState?.fishId || null;
  const centroid = piranhas.reduce((accumulator, fish) => ({
    xNorm: accumulator.xNorm + fish.xNorm,
    yNorm: accumulator.yNorm + fish.yNorm
  }), { xNorm: 0, yNorm: 0 });
  centroid.xNorm /= piranhas.length;
  centroid.yNorm /= piranhas.length;

  return state.fish
    .filter((fish) => (
      fish
      && fish.id !== draggedFishId
      && !isPiranhaSpecies(fish)
      && !isUndeadFish(fish)
      && !isFishBeingConsumedByPiranhas(fish, now)
      && (
        isValidPiranhaConsumptionPrey(fish)
        || (
          !isFishDead(fish)
          && !isFishProtectedFromPredators(fish, now)
          && !hasZombieBiteInfection(fish)
        )
      )
    ))
    .sort((left, right) => {
      const leftDead = isFishDead(left) ? 0 : 1;
      const rightDead = isFishDead(right) ? 0 : 1;
      if (leftDead !== rightDead) {
        return leftDead - rightDead;
      }

      const leftDistance = Math.hypot(left.xNorm - centroid.xNorm, left.yNorm - centroid.yNorm);
      const rightDistance = Math.hypot(right.xNorm - centroid.xNorm, right.yNorm - centroid.yNorm);
      return leftDistance - rightDistance
        || (right.tankAddedAt || right.acquiredAt || 0) - (left.tankAddedAt || left.acquiredAt || 0);
    })[0] || null;
}

function getActivePiranhaPrey(now = Date.now()) {
  return state.fish.find((fish) => isFishBeingConsumedByPiranhas(fish, now)) || null;
}

function clearPiranhaAttackState(fish) {
  if (!fish) {
    return;
  }

  fish.piranhaAttackStartedAt = null;
  fish.piranhaLastDamageAt = null;
  fish.piranhaLastBloodAt = null;
}

function clearFishPanicState(fish) {
  if (!fish) {
    return;
  }

  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
}

function clearZombieAttackState(fish) {
  if (!fish) {
    return;
  }

  fish.zombieBiteStartedAt = null;
  fish.zombieBiteLastBloodAt = null;
  fish.zombieBiteAttackerId = null;
  clearFishPanicState(fish);
  if (!isFishDead(fish)) {
    fish.zombieReviveAt = null;
    fish.zombieReviveSourceId = null;
  }
}

function resetLivingFishPredatorState(fish, now = Date.now(), options = {}) {
  if (!fish || isFishDead(fish)) {
    return;
  }

  clearFishPanicState(fish);
  clearZombieAttackState(fish);
  clearPiranhaAttackState(fish);
  fish.piranhaConsumptionStartedAt = null;
  fish.piranhaConsumptionEndsAt = null;
  fish.piranhaLastBloodAt = null;
  fish.decayStage = null;
  fish.tankAddedAt = now;

  if (options.entryAnimation) {
    fish.entryStartedAt = now;
    fish.entryDurationMs = Math.max(0, Number(options.entryDurationMs) || FISH_ENTRY_DURATION_MS);
    fish.entryFromYNorm = Number.isFinite(Number(options.entryFromYNorm))
      ? clamp(Number(options.entryFromYNorm), 0.02, 0.18)
      : FISH_ENTRY_FROM_Y_NORM;
    fish.entrySplashTriggered = false;
  }
}

function applyContentSettingsEffects(now = Date.now()) {
  if (!state) {
    return false;
  }

  const settings = getContentSettings();
  const violenceAndGoreEnabled = settings.violenceAndGoreEnabled;
  let changed = false;

  if (!violenceAndGoreEnabled && (hasBloodEffectClouds() || runtime.bloodWaterTint > 0)) {
    clearBloodEffectClouds();
    runtime.bloodWaterTint = 0;
  }

  if (!violenceAndGoreEnabled && runtime.chumBloodCloudAtByPelletId?.size) {
    runtime.chumBloodCloudAtByPelletId.clear();
  }

  if (!violenceAndGoreEnabled && runtime.bettaPassLocks.size) {
    runtime.bettaPassLocks.clear();
  }

  if ((!violenceAndGoreEnabled || !isZombieSkeletonModeAvailable()) && runtime.medicineModeKey === "antidote") {
    runtime.medicineModeKey = "";
  }

  if (!violenceAndGoreEnabled && isFilteredGoreDecor(runtime.placementMode?.decorKey)) {
    runtime.placementMode = null;
    runtime.placementPreview = null;
  }

  for (const fish of [...state.fish, ...state.storedFish]) {
    if (!fish) {
      continue;
    }

    const hasZombieState = (
      hasDefinedFiniteNumber(fish.zombieBiteStartedAt)
      || hasDefinedFiniteNumber(fish.zombieBiteLastBloodAt)
      || hasDefinedFiniteNumber(fish.zombieReviveAt)
      || (typeof fish.zombieReviveSourceId === "string" && fish.zombieReviveSourceId.trim())
    );
    const hasPiranhaState = (
      hasDefinedFiniteNumber(fish.piranhaAttackStartedAt)
      || hasDefinedFiniteNumber(fish.piranhaLastDamageAt)
      || hasDefinedFiniteNumber(fish.piranhaConsumptionStartedAt)
      || hasDefinedFiniteNumber(fish.piranhaConsumptionEndsAt)
      || hasDefinedFiniteNumber(fish.piranhaLastBloodAt)
    );

    if (!violenceAndGoreEnabled && hasZombieState) {
      clearZombieAttackState(fish);
      fish.zombieReviveAt = null;
      fish.zombieReviveSourceId = null;
      changed = true;
    }

    if (!violenceAndGoreEnabled && hasPiranhaState) {
      clearPiranhaAttackState(fish);
      fish.piranhaConsumptionStartedAt = null;
      fish.piranhaConsumptionEndsAt = null;
      fish.piranhaLastBloodAt = null;
      changed = true;
    }

    if (!violenceAndGoreEnabled && fish.decayStage !== null) {
      fish.decayStage = null;
      changed = true;
    }
  }

  return changed;
}

function setContentSetting(settingKey, value) {
  if (!state || settingKey !== "violenceAndGoreEnabled") {
    return;
  }

  const currentSettings = getContentSettings();
  const nextSettings = sanitizeContentSettings({
    ...currentSettings,
    [settingKey]: Boolean(value)
  });

  if (currentSettings.violenceAndGoreEnabled === nextSettings.violenceAndGoreEnabled) {
    return;
  }

  state.contentSettings = nextSettings;
  const now = Date.now();
  applyContentSettingsEffects(now);
  saveState();
  renderUi(now);
  if (nextSettings.violenceAndGoreEnabled) {
    void preloadContentGatedAssetsForCurrentSettings()
      .then(() => {
        const refreshNow = Date.now();
        renderUi(refreshNow);
        renderTank(refreshNow);
      })
      .catch((error) => {
        console.debug("Content-gated asset preload skipped.", error);
      });
  }
  showToast(
    nextSettings.violenceAndGoreEnabled
      ? "Violence & Gore enabled."
      : "Violence & Gore disabled."
  );
}

function setToolbarPosition(toolbarPosition) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    toolbarPosition
  });
  if (currentSettings.toolbarPosition === nextSettings.toolbarPosition) {
    return;
  }

  state.uiSettings = nextSettings;
  runtime.toolbarActionMenu = "";
  saveState();
  renderUi(Date.now());
}

function setDisplayPosition(displayPosition) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    displayPosition
  });
  if (currentSettings.displayPosition === nextSettings.displayPosition) {
    return;
  }

  state.uiSettings = nextSettings;
  saveState();
  renderUi(Date.now(), { full: false });
}

function formatUvLightQualityLabel(value) {
  return normalizeUvLightRenderQuality(value) === UV_LIGHT_RENDER_QUALITY_HIGH ? "High" : "Low";
}

function setUvLightRenderQuality(quality) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    uvLightQuality: quality
  });
  if (currentSettings.uvLightQuality === nextSettings.uvLightQuality) {
    return;
  }

  state.uiSettings = nextSettings;
  runtime.uvGlowMaskCache.clear();
  saveState();
  renderUi(Date.now(), { full: false });
  showToast(`UV quality set to ${formatUvLightQualityLabel(nextSettings.uvLightQuality)}.`);
}

function setSoundMuted(value, options = {}) {
  if (!state) {
    return false;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    soundMuted: Boolean(value)
  });
  if (currentSettings.soundMuted === nextSettings.soundMuted) {
    return false;
  }

  const shouldSave = options.save !== false;
  const shouldRender = options.render !== false;
  const shouldShowToast = options.showToast !== false;
  state.uiSettings = nextSettings;
  syncAmbienceAudio();
  if (nextSettings.soundMuted) {
    stopActiveSoundEffects();
  }
  if (shouldSave) {
    saveState();
  }
  if (shouldRender) {
    renderUi(Date.now(), { full: false });
  }
  if (shouldShowToast) {
    showToast(nextSettings.soundMuted ? "Sounds muted." : "Sounds on.");
  }
  return true;
}

function setUiSoundsMuted(value, options = {}) {
  if (!state) {
    return false;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    uiSoundsMuted: Boolean(value)
  });
  if (currentSettings.uiSoundsMuted === nextSettings.uiSoundsMuted) {
    return false;
  }

  const shouldSave = options.save !== false;
  const shouldRender = options.render !== false;
  const shouldShowToast = options.showToast !== false;
  state.uiSettings = nextSettings;
  if (shouldSave) {
    saveState();
  }
  if (shouldRender) {
    renderUi(Date.now(), { full: false });
  }
  if (shouldShowToast) {
    showToast(nextSettings.uiSoundsMuted ? "UI sounds muted." : "UI sounds on.");
  }
  return true;
}

function setAmbientBubblesEnabled(value) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    ambientBubblesEnabled: Boolean(value)
  });
  if (currentSettings.ambientBubblesEnabled === nextSettings.ambientBubblesEnabled) {
    return;
  }

  state.uiSettings = nextSettings;
  saveState();
  renderUi(Date.now(), { full: false });
  showToast(nextSettings.ambientBubblesEnabled ? "Ambient bubbles on." : "Ambient bubbles off.");
}

function setWaterParticlesEnabled(value) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    waterParticlesEnabled: Boolean(value)
  });
  if (currentSettings.waterParticlesEnabled === nextSettings.waterParticlesEnabled) {
    return;
  }

  state.uiSettings = nextSettings;
  if (!nextSettings.waterParticlesEnabled) {
    runtime.waterParticles = [];
    runtime.waterParticleTankId = null;
  }
  saveState();
  renderUi(Date.now(), { full: false });
  showToast(nextSettings.waterParticlesEnabled ? "Water particles on." : "Water particles off.");
}

function clearTankMouseInteractionState() {
  runtime.suppressNextTankClick = false;
  runtime.suppressNextGlassTap = false;
  clearGlassTapGesture();
  runtime.pointerDown = false;
  runtime.lastTankPoint = null;
  runtime.lastScrubPoint = null;
  runtime.pointerStagePx = null;
  resetScrubWipeSoundState();
  clearPrimaryToolModes();
  runtime.selectedFishId = null;
}

function setTankMouseInputLocked(value) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    tankMouseInputLocked: Boolean(value)
  });
  if (currentSettings.tankMouseInputLocked === nextSettings.tankMouseInputLocked) {
    return;
  }

  if (nextSettings.tankMouseInputLocked) {
    clearTankMouseInteractionState();
  }

  state.uiSettings = nextSettings;
  saveState();
  renderUi(Date.now(), { full: false });
  showToast(
    nextSettings.tankMouseInputLocked
      ? "Tank mouse input locked."
      : "Tank mouse input unlocked."
  );
}

function toggleTankMouseInputLocked(force = null) {
  const currentSettings = getUiSettings();
  setTankMouseInputLocked(
    typeof force === "boolean"
      ? force
      : !currentSettings.tankMouseInputLocked
  );
}

function toggleToolbarCollapsed(force = null) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  if (getActiveTutorial()) {
    const nextSettings = sanitizeUiSettings({
      ...currentSettings,
      toolbarCollapsed: false
    });
    if (currentSettings.toolbarCollapsed !== nextSettings.toolbarCollapsed) {
      state.uiSettings = nextSettings;
      saveState();
      playUiCollapseToggleSound(nextSettings.toolbarCollapsed);
    }
    renderUi(Date.now(), { full: false });
    showToast("Toolbar stays open during the tutorial.");
    return;
  }

  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    toolbarCollapsed: typeof force === "boolean"
      ? force
      : !currentSettings.toolbarCollapsed
  });
  if (currentSettings.toolbarCollapsed === nextSettings.toolbarCollapsed) {
    return;
  }

  state.uiSettings = nextSettings;
  if (nextSettings.toolbarCollapsed) {
    runtime.toolbarActionMenu = "";
  }
  saveState();
  playUiCollapseToggleSound(nextSettings.toolbarCollapsed);
  renderUi(Date.now(), { full: false });
}

function toggleDisplayCollapsed(force = null) {
  if (!state) {
    return;
  }

  if (getActiveTutorial()) {
    const tutorialUi = getTutorialUiState();
    if (!tutorialUi?.displayVisible) {
      return;
    }
    const nextCollapsed = typeof force === "boolean"
      ? force
      : !getEffectiveDisplayCollapsed(getUiSettings(), tutorialUi);
    if (runtime.tutorialDisplayCollapsed === nextCollapsed) {
      return;
    }
    runtime.tutorialDisplayCollapsed = nextCollapsed;
    playUiCollapseToggleSound(nextCollapsed);
    renderUi(Date.now(), { full: false });
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    displayCollapsed: typeof force === "boolean"
      ? force
      : !currentSettings.displayCollapsed
  });
  if (currentSettings.displayCollapsed === nextSettings.displayCollapsed) {
    return;
  }

  state.uiSettings = nextSettings;
  saveState();
  playUiCollapseToggleSound(nextSettings.displayCollapsed);
  renderUi(Date.now(), { full: false });
}

function getFishPredatorProtectionStartedAt(fish) {
  if (!fish) {
    return null;
  }

  const candidates = [
    fish.tankAddedAt,
    fish.entryStartedAt,
    fish.acquiredAt
  ]
    .map((value) => Number(value))
    .filter(Number.isFinite);

  if (!candidates.length) {
    return null;
  }

  return Math.max(...candidates);
}

function isFishProtectedFromPredators(fish, now = Date.now()) {
  const protectedStartedAt = getFishPredatorProtectionStartedAt(fish);
  if (!Number.isFinite(protectedStartedAt)) {
    return false;
  }

  return (now - protectedStartedAt) < FISH_SPAWN_PROTECTION_MS;
}

function scrubProtectedFishPredatorState(fish, now = Date.now()) {
  if (!fish || isFishDead(fish) || !isFishProtectedFromPredators(fish, now)) {
    return false;
  }

  let changed = false;

  if (
    hasDefinedFiniteNumber(fish.zombieBiteStartedAt)
    || hasDefinedFiniteNumber(fish.zombieBiteLastBloodAt)
    || hasDefinedFiniteNumber(fish.zombieReviveAt)
  ) {
    clearZombieAttackState(fish);
    changed = true;
  }

  if (
    hasDefinedFiniteNumber(fish.piranhaAttackStartedAt)
    || hasDefinedFiniteNumber(fish.piranhaLastDamageAt)
    || hasDefinedFiniteNumber(fish.piranhaConsumptionStartedAt)
    || hasDefinedFiniteNumber(fish.piranhaConsumptionEndsAt)
    || hasDefinedFiniteNumber(fish.piranhaLastBloodAt)
    || fish.decayStage !== null
  ) {
    clearPiranhaAttackState(fish);
    clearFishPanicState(fish);
    fish.piranhaConsumptionStartedAt = null;
    fish.piranhaConsumptionEndsAt = null;
    fish.piranhaLastBloodAt = null;
    fish.decayStage = null;
    changed = true;
  }

  return changed;
}

function scrubProtectedTankFishPredatorState(now = Date.now()) {
  if (!state?.fish?.length) {
    return false;
  }

  let changed = false;
  for (const fish of state.fish) {
    changed = scrubProtectedFishPredatorState(fish, now) || changed;
  }

  return changed;
}

function scrubImpossiblePredatorState(now = Date.now()) {
  if (!state) {
    return false;
  }

  let changed = false;
  const zombieHunterIds = getLivingZombieHunterIds();
  const piranhaContext = hasPiranhaContext();

  for (const fish of [...state.fish, ...state.storedFish]) {
    if (!fish) {
      continue;
    }

    if (
      (
        hasDefinedFiniteNumber(fish.zombieBiteStartedAt)
        || hasDefinedFiniteNumber(fish.zombieBiteLastBloodAt)
      )
      && !hasValidZombieBiteSource(fish, zombieHunterIds)
    ) {
      clearZombieAttackState(fish);
      changed = true;
    }

    if (
      isFishDead(fish)
      && hasDefinedFiniteNumber(fish.zombieReviveAt)
      && typeof fish.zombieReviveSourceId === "string"
      && fish.zombieReviveSourceId.trim()
      && !zombieHunterIds.has(fish.zombieReviveSourceId.trim())
    ) {
      fish.zombieReviveAt = null;
      fish.zombieReviveSourceId = null;
      changed = true;
    }

    if (
      !piranhaContext
      && (
        hasDefinedFiniteNumber(fish.piranhaAttackStartedAt)
        || hasDefinedFiniteNumber(fish.piranhaLastDamageAt)
        || hasDefinedFiniteNumber(fish.piranhaConsumptionStartedAt)
        || hasDefinedFiniteNumber(fish.piranhaConsumptionEndsAt)
        || hasDefinedFiniteNumber(fish.piranhaLastBloodAt)
      )
    ) {
      clearPiranhaAttackState(fish);
      clearFishPanicState(fish);
      fish.piranhaConsumptionStartedAt = null;
      fish.piranhaConsumptionEndsAt = null;
      fish.piranhaLastBloodAt = null;
      fish.decayStage = isFishDead(fish) ? getFishDecayStage(fish, now) : null;
      changed = true;
    }

    if (
      !hasZombieBiteInfection(fish)
      && !isFishCriticallyLowHealth(fish)
      && (
        hasDefinedFiniteNumber(fish.panicUntil)
        || hasDefinedFiniteNumber(fish.panicSpeedBoost)
      )
    ) {
      clearFishPanicState(fish);
      changed = true;
    }
  }

  return changed;
}

function isValidZombieBiteTarget(fish, now = Date.now()) {
  if (!fish) {
    return false;
  }

  if (isFishDead(fish)) {
    return false;
  }

  if (isPiranhaSpecies(fish)) {
    return false;
  }

  if (isUndeadFish(fish)) {
    return false;
  }

  if (isFishProtectedFromPredators(fish, now)) {
    return false;
  }

  if (hasZombieBiteInfection(fish)) {
    return false;
  }

  if (hasDefinedFiniteNumber(fish.piranhaAttackStartedAt)) {
    return false;
  }

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    return false;
  }

  return true;
}

function isValidPiranhaPrey(fish, now = Date.now()) {
  if (!fish) {
    return false;
  }

  if (isFishDead(fish)) {
    return false;
  }

  if (isPiranhaSpecies(fish)) {
    return false;
  }

  if (isUndeadFish(fish)) {
    return false;
  }

  if (isFishProtectedFromPredators(fish, now)) {
    return false;
  }

  if (hasZombieBiteInfection(fish)) {
    return false;
  }

  if (isFishBeingConsumedByPiranhas(fish, now)) {
    return false;
  }

  return true;
}

function isValidPiranhaConsumptionPrey(fish) {
  if (!fish) {
    return false;
  }

  if (!isFishDead(fish)) {
    return false;
  }

  if (isPiranhaSpecies(fish) || isUndeadFish(fish)) {
    return false;
  }

  return state.fish.some((entry) => entry.id === fish.id);
}

function startPiranhaAttack(prey, now = Date.now()) {
  if (!PIRANHA_BEHAVIOR_ENABLED || !isViolenceEnabled()) {
    return false;
  }

  if (!isValidPiranhaPrey(prey, now) || isFishDead(prey)) {
    return false;
  }

  if (!hasDefinedFiniteNumber(prey.piranhaAttackStartedAt)) {
    prey.piranhaAttackStartedAt = now;
    prey.piranhaLastDamageAt = now;
    prey.piranhaLastBloodAt = now - PIRANHA_BLOOD_CLOUD_INTERVAL_MS;
    pushEvent(`Piranhas started attacking ${prey.name}.`, now);
    saveState();
  }

  return true;
}

function updatePiranhaSwarmTargets(now = Date.now()) {
  if (!PIRANHA_BEHAVIOR_ENABLED || !isViolenceEnabled()) {
    return;
  }

  const piranhas = getLivingPiranhaFish();
  const prey = getPiranhaTargetCandidate(now);
  if (!piranhas.length || !prey) {
    return;
  }

  const preyLayer = isFishDead(prey)
    ? clampTankLayer(Math.min(getFishTankLayer(prey), 2))
    : clampTankLayer(Math.max(1, Math.min(TANK_DEPTH_LAYERS - 1, getFishTankLayer(prey))));
  const orbitRadius = isFishBeingConsumedByPiranhas(prey, now) ? 0.022 : 0.05;

  piranhas.forEach((piranha, index) => {
    if (runtime.fishDragState?.fishId === piranha.id) {
      return;
    }

    const species = getSpeciesForFish(piranha);
    if (!species) {
      return;
    }

    const angle = ((now / 420) + index / Math.max(1, piranhas.length)) * Math.PI * 2 + (piranha.phase || 0) * Math.PI * 2;
    piranha.targetXNorm = clamp(prey.xNorm + Math.cos(angle) * orbitRadius, 0.08, 0.92);
    piranha.targetYNorm = clamp(prey.yNorm + Math.sin(angle) * orbitRadius * 0.65, 0.14, 0.8);
    piranha.targetAt = now + PIRANHA_TARGET_REFRESH_MS;
    piranha.hangoutDecorId = null;
    setFishDesiredTankLayer(piranha, preyLayer);
    piranha.swimSpeed = normalizeFishSpeed(
      species,
      randomBetween(Math.max(species.speedMin, species.speedMax * 0.82), species.speedMax)
    );
  });
}

function beginPiranhaConsumption(prey, now = Date.now()) {
  if (!PIRANHA_BEHAVIOR_ENABLED || !isViolenceEnabled()) {
    return false;
  }
  if (!isValidPiranhaConsumptionPrey(prey)) {
    return false;
  }

  if (isFishBeingConsumedByPiranhas(prey, now)) {
    return false;
  }

  clearPiranhaAttackState(prey);
  pushEvent(`Piranhas started feeding on ${prey.name}.`, now);

  prey.decayStage = "fresh";
  prey.piranhaConsumptionStartedAt = now;
  prey.piranhaConsumptionEndsAt = now + PIRANHA_CONSUMPTION_DURATION_MS;
  prey.piranhaLastBloodAt = now - PIRANHA_BLOOD_CLOUD_INTERVAL_MS;

  spawnBloodCloud(prey.xNorm, prey.yNorm, 2.2);
  runtime.bloodWaterTint = clamp(runtime.bloodWaterTint + 0.12, 0, 1);
  saveState();
  return true;
}

function handlePiranhaSwarm(now, deltaSeconds) {
  if (!PIRANHA_BEHAVIOR_ENABLED || !isViolenceEnabled()) {
    return;
  }

  if (finalizePiranhaConsumedFish(getCompletedPiranhaConsumedFish(now), now, { immediate: true })) {
    return;
  }

  const piranhas = getLivingPiranhaFish();
  if (!piranhas.length) {
    return;
  }

  const activePrey = getActivePiranhaPrey(now);
  if (activePrey) {
    runtime.bloodWaterTint = clamp(runtime.bloodWaterTint + deltaSeconds * 0.07, 0, 1);

    if (
      !hasDefinedFiniteNumber(activePrey.piranhaLastBloodAt)
      || now - Number(activePrey.piranhaLastBloodAt) >= PIRANHA_BLOOD_CLOUD_INTERVAL_MS
    ) {
      const intensity = 2.2 + piranhas.length * 0.45;
      spawnBloodCloud(
        clamp(activePrey.xNorm + randomBetween(-0.008, 0.008), 0.08, 0.92),
        clamp(activePrey.yNorm + randomBetween(-0.008, 0.008), 0.14, 0.8),
        intensity
      );
      activePrey.piranhaLastBloodAt = now;
    }

    return;
  }

  const prey = getPiranhaTargetCandidate(now);
  if (!prey) {
    return;
  }

  const preyIsDead = isFishDead(prey);
  if (preyIsDead ? !isValidPiranhaConsumptionPrey(prey) : !isValidPiranhaPrey(prey, now)) {
    return;
  }

  const nearestDistance = Math.min(
    ...piranhas.map((piranha) => Math.hypot(piranha.xNorm - prey.xNorm, piranha.yNorm - prey.yNorm))
  );

  const inAttackRange = nearestDistance <= PIRANHA_ATTACK_TRIGGER_RANGE_NORM;
  const lostTarget = nearestDistance > PIRANHA_ATTACK_RELEASE_RANGE_NORM;

  if (!preyIsDead && lostTarget) {
    clearPiranhaAttackState(prey);
    return;
  }

  if (!inAttackRange) {
    return;
  }

  if (preyIsDead) {
    if (beginPiranhaConsumption(prey, now)) {
      renderUi(now);
    }
    return;
  }

  if (!startPiranhaAttack(prey, now)) {
    return;
  }

  runtime.bloodWaterTint = clamp(runtime.bloodWaterTint + deltaSeconds * 0.025, 0, 1);

  if (
    !hasDefinedFiniteNumber(prey.piranhaLastBloodAt)
    || now - Number(prey.piranhaLastBloodAt) >= PIRANHA_BLOOD_CLOUD_INTERVAL_MS
  ) {
    spawnBloodCloud(
      clamp(prey.xNorm + randomBetween(-0.006, 0.006), 0.08, 0.92),
      clamp(prey.yNorm + randomBetween(-0.006, 0.006), 0.14, 0.8),
      1.5 + piranhas.length * 0.22
    );
    prey.piranhaLastBloodAt = now;
  }

  if (
    !hasDefinedFiniteNumber(prey.piranhaLastDamageAt)
    || now - Number(prey.piranhaLastDamageAt) >= PIRANHA_BITE_DAMAGE_INTERVAL_MS
  ) {
    prey.piranhaLastDamageAt = now;
    prey.healthUnits = Math.max(0, (Number(prey.healthUnits) || 0) - PIRANHA_BITE_DAMAGE_UNITS);
    prey.fedStreak = 0;

    if (prey.healthUnits <= 0) {
      if (markFishAsDead(prey, now, `${prey.name} was swarmed by piranhas.`)) {
        beginPiranhaConsumption(prey, now);
        showToast(`Piranhas killed ${prey.name}.`);
        renderUi(now);
      }
      return;
    }
  }

  const attackStartedAt = Number(prey.piranhaAttackStartedAt) || now;
  if (now - attackStartedAt >= PIRANHA_ATTACK_BUILDUP_MS) {
    if (markFishAsDead(prey, now, `${prey.name} was swarmed by piranhas.`)) {
      beginPiranhaConsumption(prey, now);
      showToast(`Piranhas killed ${prey.name}.`);
      renderUi(now);
    }
  }
}

function getZombieAttackTarget(attacker, now = Date.now()) {
  if (!attacker || isFishDead(attacker) || !usesZombieHunterBehavior(attacker)) {
    return null;
  }

  const draggedFishId = runtime.fishDragState?.fishId || null;
  return state.fish
    .filter((fish) => (
      fish
      && fish.id !== draggedFishId
      && fish.id !== attacker.id
      && isValidZombieBiteTarget(fish, now)
    ))
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.xNorm - attacker.xNorm, left.yNorm - attacker.yNorm);
      const rightDistance = Math.hypot(right.xNorm - attacker.xNorm, right.yNorm - attacker.yNorm);
      return leftDistance - rightDistance
        || (left.tankAddedAt || left.acquiredAt || 0) - (right.tankAddedAt || right.acquiredAt || 0);
    })[0] || null;
}

function infectFishWithZombieBite(target, attacker, now = Date.now()) {
  if (
    !target
    || !attacker
    || isFishDead(target)
    || isFishDead(attacker)
    || isUndeadFish(target)
    || hasZombieBiteInfection(target)
    || isFishProtectedFromPredators(target, now)
    || hasDefinedFiniteNumber(target.piranhaAttackStartedAt)
    || isFishBeingConsumedByPiranhas(target, now)
  ) {
    return false;
  }

  target.zombieBiteStartedAt = now;
  target.zombieBiteLastBloodAt = now;
  target.zombieBiteAttackerId = attacker.id;
  target.zombieReviveAt = null;
  target.zombieReviveSourceId = null;
  makeFishScurryFromAttack(target, attacker, now);
  attacker.lastAteAt = now;
  const mealCoins = recordFishMealCredit(attacker, now);
  applyFishMealWindowFoodIntake(attacker, now, { satiate: false });
  pushEvent(
    mealCoins > 0
      ? `${attacker.name} bit ${target.name} with a zombie bite and earned ${mealCoins} ${pluralize("coin", mealCoins)}.`
      : `${attacker.name} bit ${target.name} with a zombie bite.`,
    now
  );
  return true;
}

function reviveFishAsZombieVariant(fish, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  if (
    !fish
    || !species
    || !isFishDead(fish)
    || isUndeadFish(fish)
    || isFishBeingConsumedByPiranhas(fish, now)
  ) {
    return false;
  }

  fish.deadAt = null;
  fish.zombieVariant = true;
  fish.zombieBiteStartedAt = null;
  fish.zombieBiteLastBloodAt = null;
  fish.zombieBiteAttackerId = null;
  fish.zombieReviveAt = null;
  fish.zombieReviveSourceId = null;
  fish.decayStage = null;
  fish.piranhaConsumptionStartedAt = null;
  fish.piranhaConsumptionEndsAt = null;
  fish.piranhaLastBloodAt = null;
  clearPiranhaAttackState(fish);
  fish.healthUnits = getFishMaxHealthUnits(fish, species);
  fish.fedStreak = 0;
  fish.missedMealsInRow = 0;
  fish.comfortDamageProgressMs = 0;
  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.hangoutDecorId = null;
  fish.blockedDecorId = null;
  fish.blockedDecorUntil = null;
  fish.wallAvoidUntil = now + 600;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  fish.targetXNorm = clamp(fish.xNorm + randomBetween(-0.16, 0.16), 0.08, 0.92);
  fish.targetYNorm = clamp(randomBetween(0.26, 0.64), 0.14, 0.8);
  fish.targetAt = now + ZOMBIE_ATTACK_TARGET_REFRESH_MS;
  fish.swimSpeed = normalizeFishSpeed(
    species,
    randomBetween(Math.max(species.speedMin, species.speedMax * 0.82), species.speedMax)
  );
  clearFishSchoolFollowState(fish);
  clearFishCaveBehavior(fish);
  setFishTankLayers(
    fish,
    getEffectiveFishBehavior(fish, species) === "sucker"
      ? TANK_DEPTH_LAYERS
      : clampTankLayer(Math.max(1, Math.min(TANK_DEPTH_LAYERS - 1, Number(fish.tankLayer) || DEFAULT_TANK_LAYER))),
    getEffectiveFishBehavior(fish, species) === "sucker"
      ? TANK_DEPTH_LAYERS
      : clampTankLayer(Math.max(1, Math.min(TANK_DEPTH_LAYERS - 1, Number(fish.tankLayer) || DEFAULT_TANK_LAYER)))
  );
  unlockFishSpecies("zombie-fish", now, "Zombie Fish unlocked after a fish rose again as a zombie.");
  spawnBloodCloud(fish.xNorm, fish.yNorm, 1.4);
  pushEvent(`${fish.name} rose again as a zombie ${species.name.toLowerCase()}.`, now);
  return true;
}

function processZombieInfections(now) {
  let changed = false;

  if (!isViolenceEnabled() || !isZombieModeEnabled()) {
    for (const fish of state.fish) {
      if (
        hasDefinedFiniteNumber(fish.zombieBiteStartedAt)
        || hasDefinedFiniteNumber(fish.zombieBiteLastBloodAt)
        || hasDefinedFiniteNumber(fish.zombieReviveAt)
        || (typeof fish.zombieReviveSourceId === "string" && fish.zombieReviveSourceId.trim())
      ) {
        clearZombieAttackState(fish);
        fish.zombieReviveAt = null;
        fish.zombieReviveSourceId = null;
        changed = true;
      }
    }

    return changed;
  }

  for (const fish of state.fish) {
    if (hasZombieBiteInfection(fish)) {
      if (!hasValidZombieBiteSource(fish)) {
        clearZombieAttackState(fish);
        changed = true;
        continue;
      }

      if (
        !hasDefinedFiniteNumber(fish.zombieBiteLastBloodAt)
        || now - Number(fish.zombieBiteLastBloodAt) >= ZOMBIE_BITE_BLOOD_INTERVAL_MS
      ) {
        spawnBloodCloud(
          clamp(fish.xNorm + randomBetween(-0.004, 0.004), 0.08, 0.92),
          clamp(fish.yNorm + randomBetween(-0.004, 0.004), 0.14, 0.8),
          1.1
        );
        fish.zombieBiteLastBloodAt = now;
        changed = true;
      }

      if (now - Number(fish.zombieBiteStartedAt) >= ZOMBIE_BITE_FATAL_MS) {
        const reviveSourceId = typeof fish.zombieBiteAttackerId === "string" && fish.zombieBiteAttackerId.trim()
          ? fish.zombieBiteAttackerId.trim()
          : null;
        if (markFishAsDead(fish, now, `${fish.name} bled out after a zombie bite.`)) {
          changed = true;
        }
        fish.zombieReviveAt = now + randomBetween(ZOMBIE_BITE_REVIVE_MIN_MS, ZOMBIE_BITE_REVIVE_MAX_MS);
        fish.zombieReviveSourceId = reviveSourceId;
        changed = true;
      }
      continue;
    }

    if (hasPendingZombieRevival(fish) && now >= Number(fish.zombieReviveAt) && reviveFishAsZombieVariant(fish, now)) {
      changed = true;
    }
  }

  return changed;
}

function canFishUsePassAttack(species) {
  return Boolean(species && (
    species.id === "betta"
    || canZombieSkeletonUsePassAttack({ enabled: isZombieModeEnabled(), species })
  ));
}

function canFishPassAttackTarget(attackerSpecies, target) {
  if (!attackerSpecies || !target || isFishDead(target)) {
    return false;
  }

  const zombieSkeletonTargetAllowed = canZombieSkeletonPassAttackTarget({
    enabled: isZombieModeEnabled(),
    attackerSpecies,
    target,
    isUndeadFish
  });
  if (zombieSkeletonTargetAllowed !== null) {
    return zombieSkeletonTargetAllowed;
  }

  return true;
}

function handleZombieBiteAttacks(now) {
  if (!state?.fish?.length || !isViolenceEnabled() || !isZombieModeEnabled()) {
    return;
  }

  const draggedFishId = runtime.fishDragState?.fishId || null;
  const activeBreedingRuntimeSequence = runtime.fishBreedingSequence || runtime.debugBreedingSequence;
  const breedingFishIds = activeBreedingRuntimeSequence
    ? new Set([activeBreedingRuntimeSequence.leftFishId, activeBreedingRuntimeSequence.rightFishId].filter(Boolean))
    : null;
  const landedMessages = [];

  for (const attacker of state.fish) {
    if (
      isFishDead(attacker)
      || attacker.id === draggedFishId
      || breedingFishIds?.has(attacker.id)
      || !usesZombieHunterBehavior(attacker)
      || attacker.activity !== "roam"
      || Number(attacker.motionLevel) < 0.14
    ) {
      continue;
    }

    const target = getZombieAttackTarget(attacker, now);
    if (!target || breedingFishIds?.has(target.id)) {
      continue;
    }

    if (Math.hypot(attacker.xNorm - target.xNorm, attacker.yNorm - target.yNorm) > BETTA_ATTACK_TRIGGER_RANGE_NORM) {
      continue;
    }

    if (!infectFishWithZombieBite(target, attacker, now)) {
      continue;
    }

    landedMessages.push(`${attacker.name} bit ${target.name}.`);
  }

  if (!landedMessages.length) {
    return;
  }

  saveState();
  renderUi(now);
  showToast(landedMessages.length === 1 ? landedMessages[0] : `${landedMessages.length} zombie bites landed.`);
}

function handleBettaPassAttacks(now) {
  if (!state?.fish?.length || !isViolenceEnabled()) {
    runtime.bettaPassLocks.clear();
    return;
  }

  const draggedFishId = runtime.fishDragState?.fishId || null;
  const activeBreedingRuntimeSequence = runtime.fishBreedingSequence || runtime.debugBreedingSequence;
  const breedingFishIds = activeBreedingRuntimeSequence
    ? new Set([activeBreedingRuntimeSequence.leftFishId, activeBreedingRuntimeSequence.rightFishId].filter(Boolean))
    : null;
  const livingFish = state.fish.filter((fish) => !isFishDead(fish));
  if (livingFish.length < 2) {
    runtime.bettaPassLocks.clear();
    return;
  }

  const nextLocks = new Set();
  const landedMessages = [];

  for (const attacker of livingFish) {
    if (
      attacker.id === draggedFishId
      || breedingFishIds?.has(attacker.id)
      || !canFishUsePassAttack(getSpeciesForFish(attacker))
      || attacker.activity !== "roam"
      || Number(attacker.motionLevel) < 0.18
    ) {
      continue;
    }

    const travelDistance = Math.hypot(attacker.targetXNorm - attacker.xNorm, attacker.targetYNorm - attacker.yNorm);
    if (travelDistance < 0.01) {
      continue;
    }

    for (const target of livingFish) {
      const attackerSpecies = getSpeciesForFish(attacker);
      if (
        target.id === attacker.id
        || target.id === draggedFishId
        || breedingFishIds?.has(target.id)
        || !canFishPassAttackTarget(attackerSpecies, target)
      ) {
        continue;
      }

      const pairKey = `${attacker.id}:${target.id}`;
      const isLocked = runtime.bettaPassLocks.has(pairKey);
      const distanceNorm = Math.hypot(attacker.xNorm - target.xNorm, attacker.yNorm - target.yNorm);
      const proximityLimit = isLocked ? BETTA_ATTACK_RELEASE_RANGE_NORM : BETTA_ATTACK_TRIGGER_RANGE_NORM;
      if (distanceNorm > proximityLimit) {
        continue;
      }

      nextLocks.add(pairKey);
      if (isLocked || Math.random() >= BETTA_ATTACK_PASS_CHANCE) {
        continue;
      }

      const outcome = applyFishDamage(
        target,
        1,
        now,
        `${attacker.name} attacked ${target.name} for half a heart.`,
        `${target.name} died after an attack from ${attacker.name}.`
      );
      if (!outcome.changed) {
        continue;
      }

      if (!outcome.dead) {
        makeFishScurryFromAttack(target, attacker, now);
      } else {
        spawnBloodCloud(target.xNorm, target.yNorm, 1.5);
      }

      landedMessages.push(outcome.dead ? `${attacker.name} killed ${target.name}.` : `${attacker.name} nipped ${target.name}.`);
    }
  }

  runtime.bettaPassLocks = nextLocks;
  if (!landedMessages.length) {
    return;
  }

  saveState();
  renderUi(now);
  showToast(landedMessages.length === 1 ? landedMessages[0] : `${landedMessages.length} attacks landed.`);
}

function getEffectCloudPreset(presetKey = "gravelDust") {
  return EFFECT_CLOUD_PRESETS[presetKey] || EFFECT_CLOUD_PRESETS.gravelDust;
}

function hasBloodEffectClouds() {
  return (runtime.effectClouds || []).some((cloud) => cloud?.requiresGore || cloud?.preset === "blood");
}

function clearBloodEffectClouds() {
  runtime.effectClouds = (runtime.effectClouds || []).filter((cloud) => (
    cloud && !cloud.requiresGore && cloud.preset !== "blood"
  ));
}

function spawnEffectCloud(xNorm, yNorm, options = {}) {
  if (!Number.isFinite(Number(xNorm)) || !Number.isFinite(Number(yNorm))) {
    return;
  }

  const preset = getEffectCloudPreset(options.preset);
  if (preset.requiresGore && !isGoreEnabled()) {
    return;
  }

  const intensity = clamp(Number.isFinite(Number(options.intensity)) ? Number(options.intensity) : 1, 0.08, 3.2);
  const countBase = Number.isFinite(Number(options.countBase)) ? Number(options.countBase) : preset.countBase;
  const countScale = Number.isFinite(Number(options.countScale)) ? Number(options.countScale) : preset.countScale;
  const count = Math.max(1, Math.round(countBase + intensity * countScale));
  const spreadNorm = Number.isFinite(Number(options.spreadNorm)) ? Number(options.spreadNorm) : preset.spreadNorm;
  const layer = options.layer || preset.layer || EFFECT_CLOUD_LAYER_FRONT;
  const colorStops = Array.isArray(options.colorStops) && options.colorStops.length
    ? options.colorStops
    : preset.colorStops;

  if (!Array.isArray(runtime.effectClouds)) {
    runtime.effectClouds = [];
  }
  const overflow = runtime.effectClouds.length + count - MAX_EFFECT_CLOUD_PARTICLES;
  if (overflow > 0) {
    runtime.effectClouds.splice(0, overflow);
  }

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(preset.speedMin, preset.speedMax) * intensity;
    const drift = randomBetween(preset.driftMin, preset.driftMax);

    runtime.effectClouds.push({
      preset: preset.key,
      layer,
      requiresGore: preset.requiresGore === true,
      colorStops,
      xNorm: clamp(Number(xNorm) + randomBetween(-spreadNorm, spreadNorm), 0.02, 0.98),
      yNorm: clamp(Number(yNorm) + randomBetween(-spreadNorm, spreadNorm), 0.02, 0.98),
      vx: Math.cos(angle) * speed + randomBetween(-drift, drift),
      vy: Math.sin(angle) * speed + randomBetween(-drift, drift) - randomBetween(preset.yLiftMin, preset.yLiftMax),
      radiusNorm: randomBetween(preset.radiusMin, preset.radiusMax) * randomBetween(0.9, 1.4),
      radiusGrowth: Number.isFinite(Number(options.radiusGrowth)) ? Number(options.radiusGrowth) : preset.radiusGrowth,
      alpha: randomBetween(preset.alphaMin, preset.alphaMax),
      lifeMs: randomBetween(preset.lifeMinMs, preset.lifeMaxMs),
      ageMs: 0
    });
  }
}

function spawnEffectCloudAtPoint(x, y, options = {}) {
  spawnEffectCloud(Number(x) / TANK_WIDTH, Number(y) / TANK_HEIGHT, options);
}

function spawnBloodCloud(xNorm, yNorm, intensity = 1) {
  spawnEffectCloud(xNorm, yNorm, {
    preset: "blood",
    intensity,
    layer: EFFECT_CLOUD_LAYER_FRONT
  });
}

function updateChumBloodClouds(now = Date.now()) {
  if (!runtime.chumBloodCloudAtByPelletId) {
    runtime.chumBloodCloudAtByPelletId = new Map();
  }

  if (!isGoreEnabled()) {
    runtime.chumBloodCloudAtByPelletId.clear();
    return;
  }

  const chumPellets = state.floatingPellets.filter((pellet) => pellet?.foodKey === "chum");
  const activeIds = new Set(chumPellets.map((pellet) => pellet.id));
  for (const pelletId of runtime.chumBloodCloudAtByPelletId.keys()) {
    if (!activeIds.has(pelletId)) {
      runtime.chumBloodCloudAtByPelletId.delete(pelletId);
    }
  }

  for (const pellet of chumPellets) {
    const nextCloudAt = Number(runtime.chumBloodCloudAtByPelletId.get(pellet.id));
    if (Number.isFinite(nextCloudAt) && now < nextCloudAt) {
      continue;
    }

    const pose = getPelletPose(pellet, now);
    spawnBloodCloud(pose.xNorm, pose.yNorm, randomBetween(0.38, 0.58));
    runtime.bloodWaterTint = clamp(runtime.bloodWaterTint + 0.012, 0, 1);
    runtime.chumBloodCloudAtByPelletId.set(
      pellet.id,
      now + randomBetween(CHUM_BLOOD_CLOUD_INTERVAL_MS * 0.72, CHUM_BLOOD_CLOUD_INTERVAL_MS * 1.22)
    );
  }
}

function updateBloodWaterTint(deltaSeconds) {
  if (!isGoreEnabled()) {
    clearBloodEffectClouds();
    runtime.bloodWaterTint = 0;
    return;
  }

  runtime.bloodWaterTint = clamp(runtime.bloodWaterTint - deltaSeconds * BLOOD_WATER_TINT_DECAY_PER_SECOND, 0, 1);
}

function updateEffectClouds(deltaSeconds) {
  if (!Array.isArray(runtime.effectClouds) || !runtime.effectClouds.length) {
    return;
  }

  for (let i = runtime.effectClouds.length - 1; i >= 0; i -= 1) {
    const cloud = runtime.effectClouds[i];
    if (!cloud || (cloud.requiresGore && !isGoreEnabled())) {
      runtime.effectClouds.splice(i, 1);
      continue;
    }

    cloud.ageMs += deltaSeconds * 1000;

    if (cloud.ageMs >= cloud.lifeMs) {
      runtime.effectClouds.splice(i, 1);
      continue;
    }

    const t = cloud.ageMs / cloud.lifeMs;

    cloud.xNorm += cloud.vx * deltaSeconds * 60;
    cloud.yNorm += cloud.vy * deltaSeconds * 60;

    cloud.vx *= 0.992;
    cloud.vy *= 0.992;

    cloud.radiusNorm *= Number.isFinite(Number(cloud.radiusGrowth)) ? Number(cloud.radiusGrowth) : 1.006;

    if (t < 0.25) {
      cloud.alpha *= 0.997;
    } else if (t < 0.65) {
      cloud.alpha *= 0.991;
    } else {
      cloud.alpha *= 0.972;
    }
  }
}

function drawWaterBloodTint() {
  const tintStrength = clamp(runtime.bloodWaterTint, 0, 1);
  if (tintStrength <= 0.001) {
    return;
  }

  const width = TANK_WIDTH - GLASS_MARGIN_X * 2;
  const height = TANK_HEIGHT - WATER_SURFACE_Y - GLASS_MARGIN_BOTTOM;

  tankContext.save();
  tankContext.beginPath();
  tankContext.rect(GLASS_MARGIN_X, WATER_SURFACE_Y, width, height);
  tankContext.clip();

  const wash = tankContext.createLinearGradient(0, WATER_SURFACE_Y, 0, TANK_HEIGHT);
  wash.addColorStop(0, `rgba(126, 10, 10, ${clamp(tintStrength * 0.08, 0, 0.12)})`);
  wash.addColorStop(0.46, `rgba(120, 8, 8, ${clamp(tintStrength * 0.16, 0, 0.22)})`);
  wash.addColorStop(1, `rgba(82, 4, 4, ${clamp(tintStrength * 0.24, 0, 0.32)})`);
  tankContext.fillStyle = wash;
  tankContext.fillRect(GLASS_MARGIN_X, WATER_SURFACE_Y, width, height);

  const haze = tankContext.createRadialGradient(
    TANK_WIDTH * 0.5,
    WATER_SURFACE_Y + height * 0.6,
    0,
    TANK_WIDTH * 0.5,
    WATER_SURFACE_Y + height * 0.6,
    height * 0.74
  );
  haze.addColorStop(0, `rgba(156, 18, 18, ${clamp(tintStrength * 0.1, 0, 0.18)})`);
  haze.addColorStop(0.62, `rgba(110, 10, 10, ${clamp(tintStrength * 0.06, 0, 0.12)})`);
  haze.addColorStop(1, "rgba(45, 0, 0, 0)");
  tankContext.fillStyle = haze;
  tankContext.fillRect(GLASS_MARGIN_X, WATER_SURFACE_Y, width, height);
  tankContext.restore();
}

function drawEffectClouds(layer = null) {
  if (!Array.isArray(runtime.effectClouds) || !runtime.effectClouds.length) {
    return;
  }

  tankContext.save();
  tankContext.globalCompositeOperation = "source-over";

  for (const cloud of runtime.effectClouds) {
    if (layer && cloud.layer !== layer) {
      continue;
    }

    const x = cloud.xNorm * TANK_WIDTH;
    const y = cloud.yNorm * TANK_HEIGHT;
    const radius = cloud.radiusNorm * Math.min(TANK_WIDTH, TANK_HEIGHT);
    const colorStops = Array.isArray(cloud.colorStops) && cloud.colorStops.length
      ? cloud.colorStops
      : getEffectCloudPreset(cloud.preset).colorStops;

    const gradient = tankContext.createRadialGradient(x, y, 0, x, y, radius);
    for (const stop of colorStops) {
      gradient.addColorStop(
        clamp(Number(stop.offset) || 0, 0, 1),
        `rgba(${stop.rgb || "110, 0, 0"}, ${clamp(cloud.alpha * (Number.isFinite(Number(stop.alpha)) ? Number(stop.alpha) : 1), 0, 1)})`
      );
    }

    tankContext.fillStyle = gradient;
    tankContext.beginPath();
    tankContext.arc(x, y, radius, 0, Math.PI * 2);
    tankContext.fill();
  }

  tankContext.restore();
}

function drawMedicineWaterTint(now) {
  const tint = state.medicineWaterTint;
  if (!tint || !tint.color) {
    return;
  }

  const rgb = hexToRgb(tint.color);
  if (!rgb) {
    return;
  }

  const duration = Math.max(1, (tint.endsAt || 0) - (tint.startedAt || 0));
  const remaining = clamp(((tint.endsAt || 0) - now) / duration, 0, 1);
  if (remaining <= 0.001) {
    return;
  }

  const width = TANK_WIDTH - GLASS_MARGIN_X * 2;
  const height = TANK_HEIGHT - WATER_SURFACE_Y - GLASS_MARGIN_BOTTOM;
  tankContext.save();
  tankContext.beginPath();
  tankContext.rect(GLASS_MARGIN_X, WATER_SURFACE_Y, width, height);
  tankContext.clip();
  tankContext.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.18 * remaining})`;
  tankContext.fillRect(GLASS_MARGIN_X, WATER_SURFACE_Y, width, height);
  tankContext.restore();
}

function drawMedicineClouds(now) {
  if (!state.medicineClouds.length) {
    return;
  }

  tankContext.save();
  for (const cloud of state.medicineClouds) {
    const rgb = hexToRgb(cloud.color);
    if (!rgb) {
      continue;
    }

    const duration = Math.max(1, (cloud.endsAt || 0) - (cloud.startedAt || 0));
    const progress = clamp((now - (cloud.startedAt || 0)) / duration, 0, 1);
    const alpha = (1 - progress) * 0.32;
    if (alpha <= 0.001) {
      continue;
    }

    const x = (cloud.xNorm || 0.5) * TANK_WIDTH;
    const y = (cloud.yNorm || 0.5) * TANK_HEIGHT;
    const radius = Math.max(36, Math.min(TANK_WIDTH, TANK_HEIGHT) * (0.06 + progress * 0.12));
    const gradient = tankContext.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
    gradient.addColorStop(0.45, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.46})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    tankContext.fillStyle = gradient;
    tankContext.beginPath();
    tankContext.arc(x, y, radius, 0, Math.PI * 2);
    tankContext.fill();
  }
  tankContext.restore();
}

function makeFishScurryFromAttack(victim, attacker, now) {
  if (!victim || !attacker || isFishDead(victim)) {
    return;
  }

  const species = runtime.fishMap.get(victim.speciesId);
  if (!species) {
    return;
  }

  const dx = victim.xNorm - attacker.xNorm;
  const dy = victim.yNorm - attacker.yNorm;
  const distance = Math.max(0.0001, Math.hypot(dx, dy));
  const nx = dx / distance;
  const ny = dy / distance;

  victim.activity = "roam";
  victim.feedingPelletId = null;
  clearFishSchoolFollowState(victim);
  clearFishCaveBehavior(victim);
  victim.hangoutDecorId = null;
  victim.blockedDecorId = null;
  victim.blockedDecorUntil = null;
  victim.wallAvoidUntil = now + 450;

  victim.panicUntil = now + randomBetween(1100, 1900);
  victim.panicSpeedBoost = randomBetween(1.9, 2.5);
  victim.targetXNorm = clamp(victim.xNorm + nx * randomBetween(0.16, 0.26), 0.08, 0.92);
  victim.targetYNorm = clamp(victim.yNorm + ny * randomBetween(0.08, 0.16), 0.14, 0.8);
  victim.targetAt = victim.panicUntil;

  if (Math.abs(victim.targetXNorm - victim.xNorm) > 0.001) {
    setFishDirection(victim, victim.targetXNorm >= victim.xNorm ? 1 : -1, species, now);
  }

  spawnBloodCloud(
    clamp(victim.xNorm + randomBetween(-0.004, 0.004), 0.08, 0.92),
    clamp(victim.yNorm + randomBetween(-0.004, 0.004), 0.14, 0.8),
    0.9
  );
}

function retargetFishAfterBlockedMove(fish, species, resolvedMove, attemptedXNorm, attemptedYNorm, now) {
  if (!fish || !species || fish.activity !== "roam") {
    return;
  }

  const blockedX = Math.abs(resolvedMove.xNorm - attemptedXNorm) > 0.0005;
  const blockedY = Math.abs(resolvedMove.yNorm - attemptedYNorm) > 0.0005;

  if (!blockedX && !blockedY) {
    return;
  }

  clearFishSchoolFollowState(fish);

  if (fish.caveState) {
    fish.targetAt = Math.max(Number(fish.targetAt) || 0, now + 1200);
    fish.wallAvoidUntil = now + 220;
    return;
  }

  if (resolvedMove?.blockingCave) {
    const blocking = resolvedMove.blockingCave;
    const safeFrontLayer = Math.max(1, clampTankLayer((blocking.span?.front || 3) - 1));
    setFishTankLayers(fish, safeFrontLayer, safeFrontLayer);
    setFishDesiredTankLayer(fish, safeFrontLayer);
    fish.hangoutDecorId = null;
    fish.blockedDecorId = blocking.item?.id || null;
    fish.blockedDecorUntil = now + 2400;
    fish.wallAvoidUntil = now + 420;
    fish.targetXNorm = clamp(attemptedXNorm, 0.08, 0.92);
    fish.targetYNorm = clamp(attemptedYNorm, 0.14, 0.8);
    fish.targetAt = now + 1400 + Math.hypot(fish.xNorm - fish.targetXNorm, fish.yNorm - fish.targetYNorm) * 12000;
    if (Math.abs(fish.targetXNorm - fish.xNorm) > 0.002) {
      setFishDirection(fish, fish.targetXNorm >= fish.xNorm ? 1 : -1, species, now);
    }
    return;
  }

  if (Number.isFinite(fish.wallAvoidUntil) && now < fish.wallAvoidUntil) {
    return;
  }

  const awayX = blockedX
    ? (attemptedXNorm >= fish.xNorm ? -1 : 1)
    : (Math.random() < 0.5 ? -1 : 1);

  const awayY = blockedY
    ? (attemptedYNorm >= fish.yNorm ? -1 : 1)
    : (Math.random() < 0.5 ? -1 : 1);

  const horizontalDistance = blockedX
    ? randomBetween(0.1, 0.2)
    : randomBetween(0.04, 0.1);

  const verticalDistance = blockedY
    ? randomBetween(0.08, 0.16)
    : randomBetween(0.03, 0.08);

  const blockedDecorId = fish.hangoutDecorId || fish.blockedDecorId || null;

  fish.targetXNorm = clamp(fish.xNorm + awayX * horizontalDistance, 0.08, 0.92);
  fish.targetYNorm = clamp(fish.yNorm + awayY * verticalDistance, 0.14, 0.8);
  fish.targetAt = now + 900 + Math.random() * 900;
  fish.wallAvoidUntil = now + 650;
  fish.hangoutDecorId = null;
  fish.blockedDecorId = blockedDecorId;
  fish.blockedDecorUntil = now + 3200;

  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(
      species,
      randomBetween(
        Math.max(species.speedMin, species.speedMax * 0.58),
        species.speedMax
      )
    );
  }

  if (Math.abs(fish.targetXNorm - fish.xNorm) > 0.002) {
    setFishDirection(fish, fish.targetXNorm >= fish.xNorm ? 1 : -1, species, now);
  }
}

function getSuckerFishCollisionEntry(fish, species, now = Date.now()) {
  if (
    !fish
    || !species
    || isFishDead(fish)
    || getEffectiveFishBehavior(fish, species) !== "sucker"
  ) {
    return null;
  }

  const width = getFishDisplayWidth(fish, species, now);
  const image = runtime.images.get(getFishDisplayAssetPath(fish, species, now) || species.asset);
  const height = image?.width
    ? width * (image.height / image.width)
    : width * 0.32;
  return {
    fish,
    species,
    layer: getSuckerFishGlassLayer(fish),
    x: clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92) * TANK_WIDTH,
    y: clamp(Number(fish.yNorm) || 0.5, 0.12, 0.96) * TANK_HEIGHT,
    radiusX: Math.max(16, width * SUCKER_FISH_COLLISION_RADIUS_X_RATIO + SUCKER_FISH_COLLISION_PADDING_PX),
    radiusY: Math.max(10, height * SUCKER_FISH_COLLISION_RADIUS_Y_RATIO + SUCKER_FISH_COLLISION_PADDING_PX)
  };
}

function moveSuckerFishCollisionEntry(entry, dxPx, dyPx, now, options = {}) {
  if (!entry || (!dxPx && !dyPx)) {
    return false;
  }

  const fish = entry.fish;
  const layer = entry.layer;
  const placement = clampFishPlacement(
    fish.xNorm + dxPx / TANK_WIDTH,
    fish.yNorm + dyPx / TANK_HEIGHT,
    entry.species,
    { fish, layer }
  );
  const moved = Math.abs(placement.xNorm - fish.xNorm) > 0.000001
    || Math.abs(placement.yNorm - fish.yNorm) > 0.000001;
  fish.xNorm = placement.xNorm;
  fish.yNorm = placement.yNorm;
  entry.x = fish.xNorm * TANK_WIDTH;
  entry.y = fish.yNorm * TANK_HEIGHT;

  if (options.dragged) {
    fish.targetXNorm = fish.xNorm;
    fish.targetYNorm = fish.yNorm;
  } else {
    const targetPlacement = clampFishPlacement(
      (Number.isFinite(Number(fish.targetXNorm)) ? Number(fish.targetXNorm) : fish.xNorm) + dxPx / TANK_WIDTH,
      (Number.isFinite(Number(fish.targetYNorm)) ? Number(fish.targetYNorm) : fish.yNorm) + dyPx / TANK_HEIGHT,
      entry.species,
      { fish, layer }
    );
    fish.targetXNorm = targetPlacement.xNorm;
    fish.targetYNorm = targetPlacement.yNorm;
    fish.targetAt = Math.min(Number(fish.targetAt) || now, now + 900);
  }

  setFishTankLayers(fish, layer, layer);
  return moved;
}

function resolveSuckerFishGlassCollisions(now = Date.now(), options = {}) {
  if (!Array.isArray(state?.fish) || state.fish.length < 2) {
    return false;
  }

  const draggedFishId = typeof options.draggedFishId === "string" && options.draggedFishId
    ? options.draggedFishId
    : (typeof runtime.fishDragState?.fishId === "string" ? runtime.fishDragState.fishId : "");
  const entries = state.fish
    .map((fish) => getSuckerFishCollisionEntry(fish, getSpeciesForFish(fish), now))
    .filter(Boolean);
  if (entries.length < 2) {
    return false;
  }

  let changed = false;
  for (let iteration = 0; iteration < SUCKER_FISH_COLLISION_ITERATIONS; iteration += 1) {
    for (let leftIndex = 0; leftIndex < entries.length - 1; leftIndex += 1) {
      const left = entries[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const right = entries[rightIndex];
        if (left.layer !== right.layer) {
          continue;
        }

        let dx = right.x - left.x;
        let dy = right.y - left.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          const angle = ((Number(left.fish.phase) || 0.25) - (Number(right.fish.phase) || 0.75)) * Math.PI * 2;
          dx = Math.cos(angle) || 1;
          dy = Math.sin(angle) || 0.2;
        }

        const radiusX = Math.max(1, left.radiusX + right.radiusX);
        const radiusY = Math.max(1, left.radiusY + right.radiusY);
        const scaledX = dx / radiusX;
        const scaledY = dy / radiusY;
        const scaledDistance = Math.hypot(scaledX, scaledY);
        if (scaledDistance >= 1) {
          continue;
        }

        const normalX = scaledX / Math.max(0.0001, scaledDistance);
        const normalY = scaledY / Math.max(0.0001, scaledDistance);
        const pushX = normalX * (1 - scaledDistance) * radiusX;
        const pushY = normalY * (1 - scaledDistance) * radiusY;
        const leftDragged = draggedFishId && left.fish.id === draggedFishId;
        const rightDragged = draggedFishId && right.fish.id === draggedFishId;
        const leftShare = leftDragged ? 0 : (rightDragged ? 1 : 0.5);
        const rightShare = rightDragged ? 0 : (leftDragged ? 1 : 0.5);

        changed = moveSuckerFishCollisionEntry(left, -pushX * leftShare, -pushY * leftShare, now, { dragged: leftDragged }) || changed;
        changed = moveSuckerFishCollisionEntry(right, pushX * rightShare, pushY * rightShare, now, { dragged: rightDragged }) || changed;
      }
    }
  }

  return changed;
}

function updateFishMotion(now, deltaSeconds) {
  if (!state?.fish.length) {
    runtime.fishGravelPebbleActions.clear();
    runtime.fishPebbleTosses = [];
    runtime.forcedGravelDigUntilByFishId.clear();
    runtime.fishActionSteeringByFishId.clear();
    runtime.fishActionQueuesByFishId.clear();
    runtime.fishActionQueueCollapsedFishIds.clear();
    runtime.fishBreedingSequence = null;
    runtime.bettaPassLocks.clear();
    return;
  }
  pruneFishGravelPebbleRuntimeState(now);
  processFishActionQueues(now);
  const activelyDraggedFishId = runtime.fishDragState?.fishId || null;
  const activeFishBreedingSequence = updateFishBreedingSequence(now);
  const activeDebugBreedingSequence = updateDebugBreedingSequence(now);
  const activeBreedingSequence = activeFishBreedingSequence || activeDebugBreedingSequence;
  const activePiranhaPrey = getActivePiranhaPrey(now);
  let retargetsThisFrame = 0;
  updatePiranhaSwarmTargets(now);

  for (const fish of state.fish) {
    const species = getSpeciesForFish(fish);
    if (!species) {
      continue;
    }
    const effectiveBehavior = getEffectiveFishBehavior(fish, species);
    const pendingTravel = runtime.pendingNeighborhoodTravel.get(fish.id);
    const pendingTubeTravel = pendingTravel?.mode === "tube";
    const debugCaveTestFish = isDebugCaveTestFish(fish);
    const breedingRole = activeBreedingSequence
      ? (fish.id === activeBreedingSequence.leftFish.id
        ? "left"
        : (fish.id === activeBreedingSequence.rightFish.id ? "right" : null))
      : null;
    const piranhaLockedOnPrey = isPiranhaSpecies(fish) && Boolean(activePiranhaPrey);
    const zombieAttackTarget = !piranhaLockedOnPrey && !breedingRole && usesZombieHunterBehavior(fish)
      ? getZombieAttackTarget(fish, now)
      : null;
    const zombieLockedOnTarget = Boolean(zombieAttackTarget);
    const zombieBittenVictim = hasZombieBiteInfection(fish);
    let pellet = null;
    let pelletPose = null;
    let pelletBounds = null;

    if (fish.id === activelyDraggedFishId) {
      clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      clearForcedGravelDigPrompt(fish);
      fish.activity = "roam";
      fish.feedingPelletId = null;
      fish.targetXNorm = fish.xNorm;
      fish.targetYNorm = fish.yNorm;
      fish.targetAt = now + 1200;
      fish.hangoutDecorId = null;
      fish.motionLevel = clamp(fish.motionLevel + (0.18 - fish.motionLevel) * Math.min(1, deltaSeconds * 6), 0.04, 0.4);
      fish.wiggleClock += deltaSeconds * 0.42;
      setFishTankLayers(
        fish,
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish),
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish)
      );
      continue;
    }

    if (isFishDead(fish)) {
      clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      clearForcedGravelDigPrompt(fish);
      fish.activity = "dead";
      fish.feedingPelletId = null;
      setFishTankLayers(
        fish,
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish),
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish)
      );
      fish.hangoutDecorId = null;
      fish.panicUntil = null;
      fish.panicSpeedBoost = null;
      fish.entryStartedAt = null;
      fish.entryDurationMs = 0;
      fish.entryFromYNorm = null;
      fish.entrySplashTriggered = false;
      fish.turnStartedAt = null;
      fish.turnDurationMs = 0;
      fish.displayDirection = Number(fish.direction) < 0 ? -1 : 1;
      fish.displayAngle = fish.displayDirection < 0 ? Math.PI : 0;
      fish.turnFromDirection = fish.displayDirection;
      fish.turnToDirection = fish.displayDirection;
      fish.turnFromAngle = fish.displayAngle;
      fish.turnToAngle = fish.displayAngle;
      fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
      if (isFishBeingConsumedByPiranhas(fish, now)) {
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
        continue;
      }

      const surfaceYNorm = getDeadFishFloatYNorm(fish, species);
      fish.yNorm = clamp(fish.yNorm + (surfaceYNorm - fish.yNorm) * Math.min(1, deltaSeconds * 1.05), 0.12, 0.8);
      fish.xNorm = clamp(
        fish.xNorm + Math.sin(now / 2600 + fish.phase * Math.PI * 2) * deltaSeconds * 0.0036,
        0.08,
        0.92
      );
      fish.motionLevel = clamp(fish.motionLevel + (0.05 - fish.motionLevel) * Math.min(1, deltaSeconds * 3), 0.02, 0.18);
      fish.wiggleClock += deltaSeconds * 0.18;
      continue;
    }

    if (runtime.fishActionMenuFishId === fish.id && updateFishActionMenuHold(fish, species, now, deltaSeconds)) {
      continue;
    }

    updateFishTurnState(fish, species, now);

    if (!piranhaLockedOnPrey && !breedingRole && isFishCriticallyLowHealth(fish) && fish.activity === "roam" && Math.random() < deltaSeconds * 0.35) {
      fish.panicUntil = now + randomBetween(1600, 3200);
      fish.panicSpeedBoost = randomBetween(1.45, 2.15);
      fish.targetAt = now;
      if (species.speedMode === "dynamic") {
        fish.swimSpeed = normalizeFishSpeed(species, randomBetween(Math.max(species.speedMin, species.speedMax * 0.72), species.speedMax));
      }
    }

    if (effectiveBehavior === "sucker") {
      const glassLayer = getSuckerFishGlassLayer(fish);
      setFishTankLayers(fish, glassLayer, glassLayer);
      fish.hangoutDecorId = null;
      if (fish.activity === "feeding") {
        fish.activity = "roam";
        fish.feedingPelletId = null;
      }
    }

    if (debugCaveTestFish && fish.activity === "feeding") {
      fish.activity = "roam";
      fish.feedingPelletId = null;
      releasePelletsTargetingFishIds(fish.id);
      fish.targetAt = now;
    }

    if (breedingRole) {
      clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      clearForcedGravelDigPrompt(fish);
      if (fish.caveState) {
        abortFishCaveBehavior(fish, now, false);
      }
      setFishBreedingTarget(fish, species, activeBreedingSequence.sequence, breedingRole, now);
    }

    if (pushFishOutOfBlockingCave(fish, species, now)) {
      fish.motionLevel = clamp(fish.motionLevel + (0.42 - fish.motionLevel) * Math.min(1, deltaSeconds * 5), 0.08, 0.7);
    }

    const entryProgress = getFishEntryProgress(fish, now);
    if (entryProgress !== null) {
      fish.motionLevel = clamp(fish.motionLevel + (0.2 - fish.motionLevel) * Math.min(1, deltaSeconds * 6), 0.04, 0.4);
      fish.wiggleClock += deltaSeconds * 1.15;
      setFishTankLayers(
        fish,
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish),
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish)
      );
      fish.hangoutDecorId = null;

      const entryDescriptor = getFishShapeDescriptor(fish, species, now);
      const fishHitWaterline = entryDescriptor
        ? entryDescriptor.bounds.bottom >= WATER_SURFACE_Y
        : entryProgress >= FISH_ENTRY_SPLASH_PROGRESS;
      if (!fish.entrySplashTriggered && fishHitWaterline) {
        playFishEntrySplashSoundIfNeeded(fish);
        fish.entrySplashTriggered = true;
        spawnFishReturnSplash(fish.xNorm);
      }

      if (entryProgress < 1) {
        continue;
      }

      fish.entryStartedAt = null;
      fish.entryDurationMs = 0;
      fish.entryFromYNorm = null;
      fish.entrySplashTriggered = false;
      fish.targetAt = now + 900 + Math.random() * 1400;
    }

    if (zombieLockedOnTarget) {
      clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      clearForcedGravelDigPrompt(fish);
      if (fish.caveState) {
        abortFishCaveBehavior(fish, now, false);
      }
      fish.activity = "roam";
      fish.feedingPelletId = null;
      fish.hangoutDecorId = null;
      fish.blockedDecorId = null;
      fish.blockedDecorUntil = null;
      fish.panicUntil = null;
      fish.panicSpeedBoost = null;
      clearFishSchoolFollowState(fish);
      fish.targetXNorm = clamp(
        zombieAttackTarget.xNorm + (zombieAttackTarget.xNorm >= fish.xNorm ? -1 : 1) * randomBetween(0.005, 0.02),
        0.08,
        0.92
      );
      fish.targetYNorm = clamp(zombieAttackTarget.yNorm + randomBetween(-0.018, 0.018), 0.14, 0.8);
      fish.targetAt = now + ZOMBIE_ATTACK_TARGET_REFRESH_MS;
      setFishDesiredTankLayer(
        fish,
        effectiveBehavior === "sucker"
          ? getSuckerFishGlassLayer(fish)
          : clampTankLayer(Math.max(1, Math.min(TANK_DEPTH_LAYERS - 1, getFishTankLayer(zombieAttackTarget))))
      );
      fish.swimSpeed = normalizeFishSpeed(
        species,
        randomBetween(Math.max(species.speedMin, species.speedMax * 0.84), species.speedMax)
      );
    } else if (zombieBittenVictim) {
      clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      clearForcedGravelDigPrompt(fish);
      if (fish.caveState) {
        abortFishCaveBehavior(fish, now, false);
      }
      fish.activity = "roam";
      fish.feedingPelletId = null;
      fish.hangoutDecorId = null;
      fish.blockedDecorId = null;
      fish.blockedDecorUntil = null;
      clearFishSchoolFollowState(fish);
      fish.panicUntil = now + 900;
      fish.panicSpeedBoost = Math.max(Number(fish.panicSpeedBoost) || 0, randomBetween(2.15, 2.85));
      if (now >= fish.targetAt) {
        fish.targetXNorm = clamp(fish.xNorm + randomBetween(-0.24, 0.24), 0.08, 0.92);
        fish.targetYNorm = clamp(fish.yNorm + randomBetween(-0.18, 0.18), 0.14, 0.8);
        fish.targetAt = now + randomBetween(260, 720);
      }
      setFishDesiredTankLayer(
        fish,
        effectiveBehavior === "sucker"
          ? getSuckerFishGlassLayer(fish)
          : clampTankLayer(Math.max(1, Math.min(TANK_DEPTH_LAYERS - 1, getFishTankLayer(fish))))
      );
    } else if (piranhaLockedOnPrey) {
      clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      clearForcedGravelDigPrompt(fish);
      if (fish.caveState) {
        abortFishCaveBehavior(fish, now, false);
      }
      fish.activity = "roam";
      fish.feedingPelletId = null;
      fish.hangoutDecorId = null;
      fish.blockedDecorId = null;
      fish.blockedDecorUntil = null;
      fish.panicUntil = null;
      fish.panicSpeedBoost = null;
      clearFishSchoolFollowState(fish);
    } else {
      const forcedGravelDigPrompt = getForcedGravelDigPrompt(fish, now);
      if (forcedGravelDigPrompt) {
        updateForcedFishGravelDigTarget(fish, species, forcedGravelDigPrompt, now);
      } else {
        if (fish.activity === FISH_GRAVEL_DIG_ACTIVITY) {
          fish.activity = "roam";
        }
        pellet = fish.feedingPelletId ? state.floatingPellets.find((entry) => entry.id === fish.feedingPelletId) : null;
      if (fish.activity === "feeding" && pellet && !canFishTargetFoodPellet(fish, pellet, now)) {
        if (pellet.targetFishId === fish.id) {
          pellet.targetFishId = "";
        }
        fish.activity = "roam";
        fish.feedingPelletId = null;
        fish.targetAt = now;
        fish.hangoutDecorId = null;
        fish.hangoutZoneType = null;
        pellet = null;
      }
      if (fish.activity === "feeding" && pellet) {
        if (fish.caveState) {
          abortFishCaveBehavior(fish, now, false);
        }
        pelletPose = getPelletPose(pellet, now);
        pelletBounds = getPelletHitBounds(pellet, now);
        const mouthChaseTarget = getFishTargetNormForMouthPoint(
          fish,
          species,
          pelletPose.xNorm * TANK_WIDTH,
          pelletPose.yNorm * TANK_HEIGHT,
          now,
          {
            minYNorm: 0.14,
            maxYNorm: pellet.settled ? 0.9 : 0.82
          }
        );
        if (mouthChaseTarget) {
          fish.targetXNorm = mouthChaseTarget.xNorm;
          fish.targetYNorm = mouthChaseTarget.yNorm;
        } else {
          fish.targetXNorm = pelletPose.xNorm;
          fish.targetYNorm = clamp(pelletPose.yNorm + (pellet.settled ? -0.012 : 0.014), 0.14, pellet.settled ? 0.9 : 0.82);
        }
        fish.targetAt = now + 1000;
        setFishDesiredTankLayer(
          fish,
          effectiveBehavior === "sucker"
            ? getSuckerFishGlassLayer(fish)
            : (pellet.settled ? TANK_DEPTH_LAYERS : clampTankLayer(Math.min(getFishTankLayer(fish), 2)))
        );
        fish.hangoutDecorId = null;
      } else if (fish.activity === "feeding" && !pellet) {
        fish.activity = "roam";
        fish.feedingPelletId = null;
        fish.targetAt = now + 800 + Math.random() * 1200;
        fish.swimSpeed = normalizeFishSpeed(species);
        setFishDesiredTankLayer(fish, effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish));
        fish.hangoutDecorId = null;
      }

      if (fish.activity !== FISH_GRAVEL_PEBBLE_ACTIVITY && getFishGravelPebbleAction(fish)) {
        clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
      }

      const activeQueuedFishAction = getActiveFishActionQueueItem(fish, now);
      const queuedFishActionActive = Boolean(activeQueuedFishAction);
      const queuedPebbleActionActive = activeQueuedFishAction?.action === "pebble";

      if (fish.activity === "roam" && !breedingRole && !fish.caveState && !debugCaveTestFish && !queuedFishActionActive) {
        maybeStartFishGravelPebbleAction(fish, species, now, deltaSeconds);
      }

      const gravelPebbleOwnsMovement = !breedingRole && (!queuedFishActionActive || queuedPebbleActionActive) && updateFishGravelPebbleAction(fish, species, now);
      const caveBehaviorOwnsMovement = !breedingRole && !queuedFishActionActive && !gravelPebbleOwnsMovement && fish.activity === "roam" && updateFishCaveBehavior(fish, species, now);
      const fishActionOwnsMovement = !breedingRole
        && !gravelPebbleOwnsMovement
        && !caveBehaviorOwnsMovement
        && !debugCaveTestFish
        && updateQueuedFishActionControl(fish, species, now);
      const debugBehaviorOwnsMovement = !breedingRole
        && !gravelPebbleOwnsMovement
        && !caveBehaviorOwnsMovement
        && !fishActionOwnsMovement
        && fish.activity === "roam"
        && !debugCaveTestFish
        && updateDebugBehaviorSteering(fish, species, now);
      const diseaseAvoidanceOwnsMovement = !breedingRole
        && !gravelPebbleOwnsMovement
        && !caveBehaviorOwnsMovement
        && !debugBehaviorOwnsMovement
        && fish.activity === "roam"
        && !debugCaveTestFish
        && maybeApplyDiseaseAvoidanceReaction(fish, species, now);
      if (
        fish.activity === "roam"
        && !breedingRole
        && !caveBehaviorOwnsMovement
        && !fishActionOwnsMovement
        && !debugBehaviorOwnsMovement
        && !diseaseAvoidanceOwnsMovement
        && !pendingTravel
        && now >= fish.targetAt
      ) {
        if (retargetsThisFrame >= MAX_FISH_RETARGETS_PER_FRAME) {
          fish.targetAt = now + 30 + Math.random() * 60;
        } else {
          assignSwimTarget(fish, species, now);
          retargetsThisFrame += 1;
        }
      }

      if (fish.activity === "roam" && !fish.caveState && !breedingRole && !fishActionOwnsMovement && !debugBehaviorOwnsMovement && !diseaseAvoidanceOwnsMovement && !pendingTravel) {
        updateFishSchoolFollowTarget(fish, species, now);
      }
      }
    }

    if (!pendingTravel) {
      enforceFishLayerBoundary(fish, species);
      clampFishToMobileViewport(fish, species, now);
    } else if (pendingTubeTravel) {
      const tubeId = pendingTravel.phase === "emerging" ? pendingTravel.targetTubeId : pendingTravel.sourceTubeId;
      const tube = getTankContainingFish(fish.id)?.placedDecor?.find((item) => item.id === tubeId);
      if (tube) {
        const span = getDecorLayerSpan(tube.decorKey, getDecorTankLayer(tube));
        setFishTankLayers(fish, span.back, span.back);
      }
    }

    const moveDx = fish.targetXNorm - fish.xNorm;
    const moveDy = fish.targetYNorm - fish.yNorm;
    const moveDistance = Math.hypot(moveDx, moveDy);
    const activeDebugSteering = fish.activity === "roam" && !fish.caveState
      ? getActiveDebugBehaviorSteering(fish, now)
      : null;
    const activeFishActionSteering = fish.activity === "roam" && !fish.caveState
      ? getActiveFishActionSteering(fish, now)
      : null;
    const activeQueuedFishAction = !fish.caveState
      ? getActiveFishActionQueueItem(fish, now)
      : null;
    const isDirectedSwim = fish.activity === "feeding"
      || fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY
      || fish.activity === FISH_GRAVEL_DIG_ACTIVITY
      || Boolean(activeQueuedFishAction)
      || Boolean(activeFishActionSteering)
      || Boolean(activeDebugSteering);
    let motionTarget = fish.activity === "feeding"
      ? 1
      : fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY
        ? 0.76
        : fish.activity === FISH_GRAVEL_DIG_ACTIVITY
          ? 0.9
          : (isFishCriticallyLowHealth(fish) ? 0.22 : 0.08);
    if (pendingTravel) {
      motionTarget = Math.max(motionTarget, 0.58);
    }
    if (zombieLockedOnTarget) {
      motionTarget = Math.max(motionTarget, 0.78);
    } else if (zombieBittenVictim) {
      motionTarget = Math.max(motionTarget, 0.92);
    } else if (activeFishActionSteering?.type === "zoomies") {
      motionTarget = Math.max(motionTarget, 0.86);
    } else if (activeFishActionSteering?.type === "follow") {
      const followDistance = Number(activeFishActionSteering.distanceNorm) || moveDistance;
      motionTarget = Math.max(motionTarget, followDistance > DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM ? 0.54 : 0.28);
    } else if (activeFishActionSteering?.type === "inspect") {
      motionTarget = Math.max(motionTarget, 0.5);
    } else if (activeFishActionSteering?.type === "waitfood") {
      motionTarget = Math.max(motionTarget, 0.18);
    } else if (activeQueuedFishAction?.cancelling) {
      motionTarget = Math.min(motionTarget, 0.04);
    } else if (activeQueuedFishAction?.action === "sleep" || activeQueuedFishAction?.action === "hide" || activeQueuedFishAction?.action === "rest") {
      motionTarget = Math.min(motionTarget, 0.05);
    } else if (activeQueuedFishAction?.action === "eat") {
      motionTarget = Math.max(motionTarget, 0.2);
    } else if (activeDebugSteering?.type === "avoid") {
      motionTarget = Math.max(motionTarget, 0.74);
    } else if (activeDebugSteering?.type === "follow") {
      const followDistance = Number(activeDebugSteering.distanceNorm) || moveDistance;
      const followMotion = followDistance > DEBUG_BEHAVIOR_FOLLOW_CATCHUP_NORM
        ? 0.66
        : followDistance > DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM
          ? 0.42
          : 0.24;
      motionTarget = Math.max(motionTarget, followMotion);
    } else if (activeDebugSteering?.type === "inspect-lure") {
      motionTarget = Math.max(motionTarget, 0.58);
    } else if (activeDebugSteering?.type === "anticipate-food") {
      motionTarget = Math.max(motionTarget, 0.16);
    }
    let handledDirectionThisFrame = false;

    if (moveDistance > 0.0001) {
      const manuallyChasingFood = fish.activity === "feeding" && pellet && pellet.dropStartXNorm == null;
      let speedMultiplier = fish.activity === "feeding"
        ? (manuallyChasingFood ? 1 : FEED_CHASE_MULTIPLIER)
        : fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY
          ? 1.14
          : fish.activity === FISH_GRAVEL_DIG_ACTIVITY
            ? 1.34
            : 1;

      if (Number.isFinite(fish.panicUntil)) {
        if (now < fish.panicUntil) {
          if (!manuallyChasingFood) {
            speedMultiplier *= Number(fish.panicSpeedBoost) || 2;
          }
        } else {
          fish.panicUntil = null;
          fish.panicSpeedBoost = null;
        }
      }

      if (
        isFishCriticallyLowHealth(fish)
        && fish.activity !== "feeding"
        && fish.activity !== FISH_GRAVEL_PEBBLE_ACTIVITY
        && fish.activity !== FISH_GRAVEL_DIG_ACTIVITY
      ) {
        speedMultiplier *= 1.22;
      }

      if (zombieLockedOnTarget) {
        speedMultiplier *= 1.18;
      } else if (zombieBittenVictim) {
        speedMultiplier *= 1.24;
      }

      if (isPiranhaSpecies(fish)) {
        speedMultiplier *= getPiranhaTargetCandidate(now) ? 1.2 : 1.04;
      }
      if (activeFishActionSteering?.type === "zoomies") {
        speedMultiplier *= 2.05;
      }
      if (activeFishActionSteering?.type === "follow") {
        const followDistance = Number(activeFishActionSteering.distanceNorm) || moveDistance;
        const leaderSpeed = Math.max(0.00001, Number(activeFishActionSteering.leaderSwimSpeed) || fish.swimSpeed);
        const currentSpeed = Math.max(0.00001, Number(fish.swimSpeed) || leaderSpeed);
        const matchFactor = followDistance > DEBUG_BEHAVIOR_FOLLOW_CATCHUP_NORM
          ? 1.28
          : followDistance > DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM
            ? 0.96
            : (activeFishActionSteering.leaderMoving ? 0.78 : 0.42);
        speedMultiplier *= clamp((leaderSpeed / currentSpeed) * matchFactor, 0.2, 1.35);
      }
      if (activeDebugSteering?.type === "follow") {
        const followDistance = Number(activeDebugSteering.distanceNorm) || moveDistance;
        const leaderSpeed = Math.max(0.00001, Number(activeDebugSteering.leaderSwimSpeed) || fish.swimSpeed);
        const currentSpeed = Math.max(0.00001, Number(fish.swimSpeed) || leaderSpeed);
        const matchFactor = followDistance > DEBUG_BEHAVIOR_FOLLOW_CATCHUP_NORM
          ? 1.38
          : followDistance > DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM
            ? 1.02
            : (activeDebugSteering.leaderMoving ? 0.82 : 0.38);
        speedMultiplier *= clamp((leaderSpeed / currentSpeed) * matchFactor, 0.18, 1.4);
      }
      speedMultiplier *= getFishDiseaseSpeedMultiplier(fish, now);
      if (manuallyChasingFood) {
        // Manual feeding should redirect normal swimming, not turn it into a
        // dash. This final cap also prevents another transient behavior from
        // accidentally stacking a speed boost onto the pellet chase.
        speedMultiplier = Math.min(1, speedMultiplier);
      }

      const speed = fish.swimSpeed * FISH_MOTION_SCALE * speedMultiplier;
      const step = Math.min(moveDistance, speed * deltaSeconds);
      const previousXNorm = fish.xNorm;
      const previousYNorm = fish.yNorm;

      const rawNextXNorm = fish.xNorm + (moveDx / moveDistance) * step;
      const nextXNorm = pendingTravel ? rawNextXNorm : clampFishXNormToMobileViewport(rawNextXNorm, fish, species, now);
      const movementMaxYNorm = fish.activity === FISH_GRAVEL_DIG_ACTIVITY
        ? 0.96
        : (fish.activity === "feeding" && pellet?.settled ? 0.9 : 0.8);
      const rawNextYNorm = fish.yNorm + (moveDy / moveDistance) * step;
      const nextPlacement = effectiveBehavior === "sucker" && !pendingTravel
        ? clampFishPlacement(nextXNorm, rawNextYNorm, species, {
          fish,
          layer: getSuckerFishGlassLayer(fish)
        })
        : null;
      const nextYNorm = pendingTravel
        ? rawNextYNorm
        : nextPlacement
        ? nextPlacement.yNorm
        : fish.activity === FISH_GRAVEL_DIG_ACTIVITY
        ? clamp(rawNextYNorm, 0.14, movementMaxYNorm)
        : clampFishYNormToLayer(
          rawNextYNorm,
          fish,
          species,
          getFishTankLayer(fish),
          { minYNorm: 0.14, maxYNorm: movementMaxYNorm }
        );

      if (effectiveBehavior === "sucker" || pendingTravel) {
        fish.xNorm = nextXNorm;
        fish.yNorm = nextYNorm;
      } else {
        const activeCavePlan = fish.caveState ? getActiveFishCavePlan(fish) : null;
        const skipDebugCaveCollision = Boolean(
          activeCavePlan?.debugForced &&
          isDebugCaveTestFish(fish) &&
          ["enter", "inside", "exit", "depart"].includes(fish.caveState) &&
          fish.caveDecorId &&
          activeCavePlan.decorId === fish.caveDecorId
        );

        if (skipDebugCaveCollision) {
          fish.xNorm = nextXNorm;
          fish.yNorm = nextYNorm;
        } else {
          const resolvedMove = resolveFishCaveCollision(fish, nextXNorm, nextYNorm, now);
          fish.xNorm = resolvedMove.xNorm;
          fish.yNorm = resolvedMove.yNorm;

          if (resolvedMove.blocked && fish.activity === "roam") {
            if (fish.hangoutDecorId) {
              fish.blockedDecorId = fish.hangoutDecorId;
            }
            retargetFishAfterBlockedMove(fish, species, resolvedMove, nextXNorm, nextYNorm, now);
            handledDirectionThisFrame = true;
          } else if (resolvedMove.blocked && fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY) {
            clearFishGravelPebbleAction(fish, species, now);
            handledDirectionThisFrame = true;
          } else if (resolvedMove.blocked && fish.activity === FISH_GRAVEL_DIG_ACTIVITY) {
            clearForcedGravelDigPrompt(fish);
            handledDirectionThisFrame = true;
          }
        }

        if (fish.caveState && !skipDebugCaveCollision) {
          enforceActiveCaveMaskRule(fish, species, now);
        }
      }

      const forcedDigPromptAfterMove = getForcedGravelDigPrompt(fish, now);
      if (forcedDigPromptAfterMove) {
        completeForcedFishGravelDig(fish, species, forcedDigPromptAfterMove, now);
      } else {
        maybeDisturbGravelByFish(
          fish,
          species,
          now,
          Math.hypot(fish.xNorm - previousXNorm, fish.yNorm - previousYNorm)
        );
      }

      const travelRatio = clamp(step / Math.max(0.00001, speed * deltaSeconds), 0, 1);
      motionTarget = fish.activity === "feeding"
        ? 1
        : fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY
          ? clamp(0.54 + travelRatio * 0.38 + Math.min(0.12, moveDistance * 3), 0.34, 0.86)
          : fish.activity === FISH_GRAVEL_DIG_ACTIVITY
            ? clamp(0.78 + travelRatio * 0.24 + Math.min(0.12, moveDistance * 3), 0.54, 0.98)
            : clamp(0.44 + travelRatio * 0.5 + Math.min(0.16, moveDistance * 4.5), 0.16, 0.92);

      if (effectiveBehavior === "sucker") {
        setSuckerFishAngle(fish, Math.atan2(moveDy, moveDx), now);
      } else if (!handledDirectionThisFrame) {
        const debugFaceDirection = getDebugBehaviorFacingDirection(fish, now);
        const facingDx = fish.activity === "feeding" && pelletPose
          ? pelletPose.xNorm - fish.xNorm
          : fish.targetXNorm - fish.xNorm;
        const schoolFollowFacing = fish.activity === "roam"
          ? getFishSchoolFollowFacingDirection(fish, species, now, facingDx)
          : null;
        if (debugFaceDirection !== null) {
          setFishDirection(fish, debugFaceDirection, species, now);
          handledDirectionThisFrame = true;
        } else if (schoolFollowFacing !== null) {
          setFishDirection(fish, schoolFollowFacing, species, now);
          handledDirectionThisFrame = true;
        } else if (Math.abs(facingDx) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
          setFishDirection(fish, facingDx >= 0 ? 1 : -1, species, now);
          handledDirectionThisFrame = true;
        }
      }
    } else {
      const forcedDigPromptAtRest = getForcedGravelDigPrompt(fish, now);
      if (forcedDigPromptAtRest) {
        completeForcedFishGravelDig(fish, species, forcedDigPromptAtRest, now);
      }
    }

    const debugFaceDirectionAtRest = !handledDirectionThisFrame
      ? getDebugBehaviorFacingDirection(fish, now)
      : null;
    if (debugFaceDirectionAtRest !== null && fish.activity === "roam" && !fish.caveState) {
      setFishDirection(fish, debugFaceDirectionAtRest, species, now);
      handledDirectionThisFrame = true;
    }

    if (
      fish.activity === "roam" &&
      !fish.caveState &&
      !handledDirectionThisFrame &&
      !(Number.isFinite(fish.wallAvoidUntil) && now < fish.wallAvoidUntil)
    ) {
      const nearbyCorpse = getNearestDeadFish(fish);
      if (nearbyCorpse && nearbyCorpse.distanceNorm <= 0.16) {
        if (effectiveBehavior === "sucker") {
          setSuckerFishAngle(
            fish,
            Math.atan2(nearbyCorpse.fish.yNorm - fish.yNorm, nearbyCorpse.fish.xNorm - fish.xNorm),
            now
          );
        } else {
          setFishDirection(fish, nearbyCorpse.fish.xNorm >= fish.xNorm ? 1 : -1, species, now);
        }
      }
    }

    fish.motionLevel = clamp(
      fish.motionLevel + (motionTarget - fish.motionLevel) * Math.min(1, deltaSeconds * (isDirectedSwim ? 6.2 : 4.2)),
      0.04,
      1
    );
    fish.wiggleClock += deltaSeconds * (0.35 + fish.motionLevel * (1.85 + fish.swimSpeed * 18)) * (isFishCriticallyLowHealth(fish) ? 1.22 : 1);

    if (fish.activity === "feeding" && pellet && pelletPose) {
      const mouthPoint = getFishGravelPebbleMouthPoint(fish, species, now);
      const pelletReachPx = pelletBounds
        ? Math.max(
          8 * getViewportStableAssetScale(),
          Math.max(pelletBounds.right - pelletBounds.left, pelletBounds.bottom - pelletBounds.top) * 0.55
        )
        : 14 * getViewportStableAssetScale();
      const mouthReachedPellet = mouthPoint
        ? Math.hypot(
          mouthPoint.x - pelletPose.xNorm * TANK_WIDTH,
          mouthPoint.y - pelletPose.yNorm * TANK_HEIGHT
        ) <= pelletReachPx
        : Math.hypot(fish.xNorm - pelletPose.xNorm, fish.yNorm - pelletPose.yNorm) < 0.024;
      if (mouthReachedPellet) {
        const diseaseForcedRefusal = typeof pellet.diseaseRefusalFishId === "string" && pellet.diseaseRefusalFishId === fish.id;
        const refusalPrechecked = typeof pellet.refusalPrecheckedFishId === "string" && pellet.refusalPrecheckedFishId === fish.id;
        if (diseaseForcedRefusal || (!refusalPrechecked && shouldFishRefuseFoodForComfort(fish, pellet.foodKey, now))) {
          handleFishRefuseFoodPellet(fish, pellet, now);
          assignFloatingPelletsToHungryFish(now);
          syncFishDrawLayer(fish, species, now);
          continue;
        }
        const eatResult = handleFishEatFoodPellet(fish, pellet, now);
        if (eatResult?.refused) {
          assignFloatingPelletsToHungryFish(now);
          syncFishDrawLayer(fish, species, now);
          continue;
        }
        state.floatingPellets = state.floatingPellets.filter((entry) => entry.id !== pellet.id);
        fish.activity = "roam";
        fish.feedingPelletId = null;
        setFishDesiredTankLayer(fish, effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish));
        fish.hangoutDecorId = null;
        fish.targetXNorm = clamp(fish.xNorm + (Math.random() - 0.5) * 0.18, 0.08, 0.92);
        fish.targetYNorm = randomSwimY(getDesiredFishTankLayer(fish), fish, species);
        fish.targetAt = now + 1500 + Math.random() * 2400;
        fish.swimSpeed = normalizeFishSpeed(species);
      }
    }

    if (effectiveBehavior === "sucker") {
      scrubFrontGlassSuckerTrail(fish, species, now);
    }
    syncFishDrawLayer(fish, species, now);
  }

  resolveSuckerFishGlassCollisions(now);
  scrubImpossiblePredatorState(now);
  scrubProtectedTankFishPredatorState(now);
  handlePiranhaSwarm(now, deltaSeconds);
  handleZombieBiteAttacks(now);
  handleBettaPassAttacks(now);
  updateFishPebbleTosses(now);
  updateChumBloodClouds(now);
}

function assignSwimTarget(fish, species, now) {
  clearFishSchoolFollowState(fish);
  const effectiveBehavior = getEffectiveFishBehavior(fish, species);

  if (runtime.debugNightCaveMode && isDebugCaveTestFish(fish)) {
    if (startDebugCaveLoopCycle(now, { silentFailure: true, suppressEvent: true })) {
      return;
    }
  } else if (runtime.debugNightCaveMode && !runtime.debugForcedCaveFishId) {
    if (
      startDebugCaveLoopCycle(now, { silentFailure: true, suppressEvent: true })
      && runtime.debugForcedCaveFishId === fish.id
    ) {
      return;
    }
  }

  const vigilTarget = pickDeadFishVigilTarget(fish, species, now);
  if (vigilTarget) {
    clearFishPanicState(fish);
    fish.targetXNorm = vigilTarget.xNorm;
    fish.targetYNorm = vigilTarget.yNorm;
    fish.targetAt = now + vigilTarget.lingerMs;
    setFishDesiredTankLayer(fish, effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : vigilTarget.targetLayer);
    fish.hangoutDecorId = null;
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species, randomBetween(species.speedMin, Math.max(species.speedMin, species.speedMax * 0.86)));
    }
    return;
  }

  if (Number.isFinite(fish.blockedDecorUntil) && now >= fish.blockedDecorUntil) {
    fish.blockedDecorUntil = null;
    fish.blockedDecorId = null;
  }

  if (isFishSickOrDying(fish) && species.behavior !== "sucker") {
    const hideout = pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hide", "plant", "hardscape", "spooky"],
      chanceMultiplier: 2.3,
      lingerMultiplier: 2.7,
      occupancyLimit: DECOR_HANGOUT_SICK_OCCUPANCY_LIMIT,
      preferBackLayer: true
    });
    if (hideout) {
      fish.targetXNorm = hideout.xNorm;
      fish.targetYNorm = hideout.yNorm;
      fish.targetAt = now + hideout.lingerMs;
      setFishDesiredTankLayer(fish, hideout.targetLayer);
      fish.hangoutDecorId = hideout.decorId;
      fish.hangoutZoneType = hideout.zoneType;
      fish.swimSpeed = normalizeFishSpeed(species, randomBetween(Math.max(species.speedMin, species.speedMax * 0.76), species.speedMax));
      return;
    }
  }

  if (applyFishBehaviorIntentLayer(fish, species, now)) {
    return;
  }

  if (effectiveBehavior === "sucker") {
    const glassLayer = getSuckerFishGlassLayer(fish);
    const yRange = getSuckerFishYRange(fish, species, glassLayer);
    const grimeTarget = pickFrontGlassSuckerGrimeTarget(fish, now);
    if (grimeTarget) {
      const crawlSpeed = normalizeFishSpeed(species, randomBetween(species.speedMin, species.speedMax));
      const travelDistance = Math.hypot(grimeTarget.xNorm - fish.xNorm, grimeTarget.yNorm - fish.yNorm);
      const travelSeconds = travelDistance / Math.max(0.00001, crawlSpeed * FISH_MOTION_SCALE);
      fish.targetXNorm = grimeTarget.xNorm;
      fish.targetYNorm = grimeTarget.yNorm;
      fish.targetAt = now + Math.max(
        species.targetMinMs * 0.72,
        travelSeconds * 1000 * randomBetween(1.12, 1.45),
        2200 + Math.random() * 2400
      );
      setFishTankLayers(fish, glassLayer, glassLayer);
      fish.hangoutDecorId = null;
      fish.swimSpeed = crawlSpeed;
      return;
    }

    const currentFacing = Math.cos(getFishFacingAngle(fish)) < 0 ? -1 : 1;
    const nearLeftWall = fish.xNorm <= 0.12;
    const nearRightWall = fish.xNorm >= 0.88;
    const nearTopWall = fish.yNorm <= yRange.min + 0.025;
    const nearBottomWall = fish.yNorm >= yRange.max - 0.035;
    const shouldReverse = nearLeftWall || nearRightWall || Math.random() < 0.12;
    const crawlDirection = nearLeftWall
      ? 1
      : nearRightWall
        ? -1
        : (shouldReverse ? -currentFacing : currentFacing);
    const crawlDistance = randomBetween(
      shouldReverse ? 0.14 : 0.22,
      shouldReverse ? 0.24 : 0.4
    );
    const nextXNorm = clamp(fish.xNorm + crawlDirection * crawlDistance + randomBetween(-0.01, 0.01), 0.1, 0.9);
    const verticalShift = nearTopWall
      ? randomBetween(0.05, 0.16)
      : nearBottomWall
        ? -randomBetween(0.05, 0.16)
        : randomBetween(-0.14, 0.14);
    const nextPlacement = clampFishPlacement(
      nextXNorm,
      fish.yNorm + verticalShift + randomBetween(-0.015, 0.015),
      species,
      {
        fish,
        layer: glassLayer
      }
    );
    const crawlSpeed = normalizeFishSpeed(species, randomBetween(species.speedMin, species.speedMax));
    const travelDistance = Math.hypot(nextPlacement.xNorm - fish.xNorm, nextPlacement.yNorm - fish.yNorm);
    const travelSeconds = travelDistance / Math.max(0.00001, crawlSpeed * FISH_MOTION_SCALE);
    const lingerMultiplier = shouldReverse ? randomBetween(1.12, 1.34) : randomBetween(1.35, 1.7);
    fish.targetXNorm = nextPlacement.xNorm;
    fish.targetYNorm = nextPlacement.yNorm;
    fish.targetAt = now + Math.max(
      species.targetMinMs,
      travelSeconds * 1000 * lingerMultiplier,
      species.targetMinMs + Math.random() * Math.max(2400, species.targetMaxMs - species.targetMinMs)
    );
    setFishTankLayers(fish, glassLayer, glassLayer);
    fish.hangoutDecorId = null;
    fish.swimSpeed = crawlSpeed;
    return;
  }

  const hangout = pickDecorHangoutTarget(species, fish, now);
  if (hangout) {
    fish.targetXNorm = hangout.xNorm;
    fish.targetYNorm = hangout.yNorm;
    fish.targetAt = now + hangout.lingerMs;
    setFishDesiredTankLayer(fish, hangout.targetLayer);
    fish.hangoutDecorId = hangout.decorId;
    fish.hangoutZoneType = hangout.zoneType;
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species);
    }
    return;
  }

  const socialFollow = pickSameSpeciesFollowTarget(fish, species, now);
  if (socialFollow) {
    fish.targetXNorm = socialFollow.xNorm;
    fish.targetYNorm = socialFollow.yNorm;
    fish.targetAt = now + socialFollow.lingerMs;
    setFishDesiredTankLayer(fish, socialFollow.targetLayer);
    fish.hangoutDecorId = null;
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species);
    }
    return;
  }

  const cavePlan = pickCaveEntryBehavior(species, fish, now);
  if (cavePlan) {
    const personality = getFishPersonality(fish);
    setFishBehaviorIntent(
      fish,
      isTankLightsOut(now) ? "night sleep" : (personality === "territorial" ? "guard cave" : "cave visit"),
      isTankLightsOut(now) ? "lights out" : personality,
      now
    );
    beginFishCaveBehavior(fish, cavePlan, now);
    if (species.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(species);
    }
    return;
  }

  const nextRoamLayer = effectiveBehavior === "sucker"
    ? getSuckerFishGlassLayer(fish)
    : clampTankLayer(1 + Math.floor(Math.random() * TANK_DEPTH_LAYERS));
  fish.targetXNorm = randomSwimX();
  fish.targetYNorm = randomSwimY(nextRoamLayer, fish, species);
  fish.targetAt = isFishCriticallyLowHealth(fish)
    ? now + randomBetween(900, Math.max(1400, species.targetMaxMs * 0.45))
    : now + species.targetMinMs + Math.random() * Math.max(200, species.targetMaxMs - species.targetMinMs);
  setFishDesiredTankLayer(fish, nextRoamLayer);
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  if (species.speedMode === "dynamic" || isFishCriticallyLowHealth(fish)) {
    fish.swimSpeed = normalizeFishSpeed(
      species,
      isFishCriticallyLowHealth(fish)
        ? randomBetween(Math.max(species.speedMin, species.speedMax * 0.72), species.speedMax)
        : undefined
    );
  }
}
