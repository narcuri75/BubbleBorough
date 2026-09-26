// Source fragment: debug/tools.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function setDebugNotificationUiEnabled(enabled) {
  runtime.debugNotificationUiEnabled = Boolean(enabled);
  syncNotificationBellPresentation();
  renderControls(Date.now());
  return runtime.debugNotificationUiEnabled;
}

function toggleDebugNotificationUi() {
  const enabled = setDebugNotificationUiEnabled(!runtime.debugNotificationUiEnabled);
  showToast(enabled ? "Notification UI enabled for debugging." : "Notification UI hidden.");
  return enabled;
}

function setDebugFishActionIndicatorsEnabled(enabled) {
  runtime.debugFishActionIndicatorsEnabled = Boolean(enabled);
  renderFishActionFlyout(Date.now());
  renderFishActionQueueDock(Date.now());
  renderControls(Date.now());
  return runtime.debugFishActionIndicatorsEnabled;
}

function toggleDebugFishActionIndicators() {
  const enabled = setDebugFishActionIndicatorsEnabled(!runtime.debugFishActionIndicatorsEnabled);
  showToast(enabled ? "Fish action indicators enabled for debugging." : "Fish action indicators hidden.");
  return enabled;
}

function resetDebugFrameProfiler() {
  runtime.frameProfilerCurrent = null;
  runtime.frameProfilerSamples = [];
  runtime.frameProfilerLongFrameCount = 0;
  runtime.frameProfilerLastOverlayAt = 0;
  runtime.frameProfilerLastSaveMs = 0;
  runtime.frameProfilerLastUiRenderMs = 0;
  runtime.frameProfilerLastTickMs = 0;
  runtime.frameProfilerLastDeferredUiMs = 0;
}

function ensureDebugFrameProfilerOverlay() {
  if (runtime.frameProfilerOverlay?.isConnected) {
    return runtime.frameProfilerOverlay;
  }
  const overlay = document.createElement("pre");
  overlay.id = "debugFrameProfilerOverlay";
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    top: "10px",
    right: "10px",
    zIndex: "2147483000",
    margin: "0",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(5, 12, 18, .86)",
    color: "rgba(238, 249, 255, .96)",
    boxShadow: "0 8px 24px rgba(0,0,0,.32)",
    font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    minWidth: "260px",
    whiteSpace: "pre",
    pointerEvents: "none"
  });
  document.body.appendChild(overlay);
  runtime.frameProfilerOverlay = overlay;
  return overlay;
}

function setDebugFrameProfilerEnabled(enabled) {
  runtime.debugFrameProfilerEnabled = Boolean(enabled);
  resetDebugFrameProfiler();
  const overlay = ensureDebugFrameProfilerOverlay();
  overlay.hidden = !runtime.debugFrameProfilerEnabled;
  if (runtime.debugFrameProfilerEnabled) {
    overlay.textContent = "FRAME PROFILER\ncollecting...";
  }
  renderControls(Date.now());
  return runtime.debugFrameProfilerEnabled;
}

function toggleDebugFrameProfiler() {
  return setDebugFrameProfilerEnabled(!runtime.debugFrameProfilerEnabled);
}

function formatDebugSwimAnimationSpeed(multiplier) {
  const percent = Math.round((Number(multiplier) || FISH_SWIM_ANIMATION.defaultSpeedMultiplier) * 100);
  const offset = percent - 100;
  const offsetText = offset === 0 ? "0%" : `${offset > 0 ? "+" : ""}${offset}%`;
  return `${percent}% (${offsetText})`;
}

function syncDebugSwimAnimationSpeedControls() {
  if (!dom.debugSwimAnimationSpeedSlider) return;
  const multiplier = getFishSwimAnimationSpeedMultiplier();
  const percent = Math.round(multiplier * 100);
  if (Number(dom.debugSwimAnimationSpeedSlider.value) !== percent) {
    dom.debugSwimAnimationSpeedSlider.value = String(percent);
  }
  if (dom.debugSwimAnimationSpeedOutput) {
    dom.debugSwimAnimationSpeedOutput.textContent = formatDebugSwimAnimationSpeed(multiplier);
  }
}

function handleDebugSwimAnimationSpeedInput(input) {
  if (!input) return FISH_SWIM_ANIMATION.defaultSpeedMultiplier;
  const multiplier = setDebugFishSwimAnimationSpeedMultiplier((Number(input.value) || 90) / 100);
  syncDebugSwimAnimationSpeedControls();
  return multiplier;
}

function resetDebugSwimAnimationSpeedTuner() {
  const multiplier = resetDebugFishSwimAnimationSpeedMultiplier();
  syncDebugSwimAnimationSpeedControls();
  showToast(`Swim animation speed reset to ${Math.round(multiplier * 100)}%.`);
  return multiplier;
}

function formatDebugDepthTuningPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function getDebugDepthTuningSummaryText() {
  const tuning = getDebugTankDepthTuning();
  const layer5 = getTankDepthVisualPreset(5);
  return [
    `Saturation ${formatDebugDepthTuningPercent(tuning.saturation)}`,
    `Contrast ${formatDebugDepthTuningPercent(tuning.contrast)}`,
    `Cyan ${formatDebugDepthTuningPercent(tuning.coolTint)}`,
    `Haze ${formatDebugDepthTuningPercent(tuning.haze)}`,
    `Gravel ${formatDebugDepthTuningPercent(tuning.substrate)}`,
    `Gravel layer shadow ${formatDebugDepthTuningPercent(tuning.gravelLayerShadow)}`,
    `Shadows ${formatDebugDepthTuningPercent(tuning.shadow)}`,
    `Motion ${formatDebugDepthTuningPercent(tuning.movement)}`,
    `Ground shadow darkness ${formatDebugDepthTuningPercent(tuning.shadowDarkness)}`,
    `Layer 5 effective: sat ${(layer5.saturation * 100).toFixed(1)}%, contrast ${(layer5.contrast * 100).toFixed(1)}%, cyan ${(layer5.coolTint * 100).toFixed(1)}%, haze ${(layer5.haze * 100).toFixed(1)}%, shadow ${(layer5.shadowStrength * 100).toFixed(1)}%, motion ${(layer5.movementMultiplier * 100).toFixed(1)}%`
  ].join(" | ");
}

function syncDebugDepthTunerControls() {
  if (!dom.debugDepthTuner) {
    return;
  }
  const tuning = getDebugTankDepthTuning();
  dom.debugDepthTuner.querySelectorAll("[data-depth-tuning-key]").forEach((input) => {
    const key = input.dataset.depthTuningKey;
    if (!(key in tuning)) {
      return;
    }
    const percent = Math.round(tuning[key] * 100);
    if (Number(input.value) !== percent) {
      input.value = String(percent);
    }
    const output = dom.debugDepthTuner.querySelector(`[data-depth-tuning-output="${key}"]`);
    if (output) {
      output.textContent = `${percent}%`;
    }
  });
  if (dom.debugDepthTunerReadout) {
    const layer5 = getTankDepthVisualPreset(5);
    dom.debugDepthTunerReadout.textContent = [
      `Layer 5 → saturation ${(layer5.saturation * 100).toFixed(1)}%`,
      `contrast ${(layer5.contrast * 100).toFixed(1)}%`,
      `cyan ${(layer5.coolTint * 100).toFixed(1)}%`,
      `haze ${(layer5.haze * 100).toFixed(1)}%`,
      `gravel layer shadow ${(getGravelLayerShadowIntensity() * 100).toFixed(0)}%`,
      `shadow ${(layer5.shadowStrength * 100).toFixed(1)}%`,
      `motion ${(layer5.movementMultiplier * 100).toFixed(1)}%`,
      `darkness ${(getDebugGroundShadowDarknessMultiplier() * 100).toFixed(0)}%`
    ].join(" · ");
  }
}

function scheduleDebugDepthTuningCacheRefresh() {
  if (runtime.debugDepthTuningApplyTimer) {
    clearTimeout(runtime.debugDepthTuningApplyTimer);
  }
  runtime.debugDepthTuningApplyTimer = window.setTimeout(() => {
    runtime.debugDepthTuningApplyTimer = 0;
    invalidateTankDepthVisualCaches();
    if (runtime.boroughOverviewOpen) {
      renderAquariumOverview();
    }
  }, 120);
}

function handleDebugDepthTuningInput(input) {
  const key = input?.dataset?.depthTuningKey;
  if (!key || !(key in DEFAULT_DEBUG_DEPTH_TUNING)) {
    return;
  }
  const multiplier = clamp(
    (Number(input.value) || 0) / 100,
    0,
    typeof getDebugTankDepthTuningMax === "function" ? getDebugTankDepthTuningMax(key) : 4
  );
  setDebugTankDepthTuningValue(key, multiplier, { invalidate: false });
  syncDebugDepthTunerControls();
  scheduleDebugDepthTuningCacheRefresh();
}

function resetDebugDepthTuner() {
  if (runtime.debugDepthTuningApplyTimer) {
    clearTimeout(runtime.debugDepthTuningApplyTimer);
    runtime.debugDepthTuningApplyTimer = 0;
  }
  resetDebugTankDepthTuning();
  syncDebugDepthTunerControls();
  if (runtime.boroughOverviewOpen) {
    renderAquariumOverview();
  }
  showToast("Depth tuner reset to 100%.");
}

async function copyDebugDepthTunerValues() {
  const summary = getDebugDepthTuningSummaryText();
  let copied = false;
  try {
    await navigator.clipboard.writeText(summary);
    copied = true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = summary;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    textarea.remove();
  }
  showToast(copied ? "Depth tuner values copied." : "Could not copy depth tuner values.");
  return summary;
}

function beginDebugFrameProfile(frameTime, rafGapMs = 0) {
  if (!runtime.debugFrameProfilerEnabled) {
    runtime.frameProfilerCurrent = null;
    return null;
  }
  const sample = {
    frameTime: Number(frameTime) || 0,
    rafGapMs: Math.max(0, Number(rafGapMs) || 0),
    startedAt: performance.now(),
    workMs: 0,
    sections: Object.create(null),
    counters: Object.create(null)
  };
  runtime.frameProfilerCurrent = sample;
  return sample;
}

function recordDebugFrameProfilerDuration(name, durationMs) {
  const sample = runtime.frameProfilerCurrent;
  if (!sample || !name) {
    return;
  }
  const duration = Math.max(0, Number(durationMs) || 0);
  sample.sections[name] = (Number(sample.sections[name]) || 0) + duration;
}

function incrementDebugFrameProfilerCounter(name, amount = 1) {
  const sample = runtime.frameProfilerCurrent;
  if (!sample || !name) {
    return;
  }
  sample.counters[name] = (Number(sample.counters[name]) || 0) + (Number(amount) || 0);
}

function endDebugFrameProfilerSection(name, startedAt) {
  if (!runtime.frameProfilerCurrent || !Number.isFinite(Number(startedAt))) {
    return;
  }
  recordDebugFrameProfilerDuration(name, performance.now() - Number(startedAt));
}

function getDebugFrameProfilerAverage(samples, accessor) {
  if (!samples.length) {
    return 0;
  }
  let total = 0;
  for (const sample of samples) {
    total += Number(accessor(sample)) || 0;
  }
  return total / samples.length;
}

function updateDebugFrameProfilerOverlay(force = false) {
  if (!runtime.debugFrameProfilerEnabled) {
    if (runtime.frameProfilerOverlay) {
      runtime.frameProfilerOverlay.hidden = true;
    }
    return;
  }
  const now = performance.now();
  if (!force && now - runtime.frameProfilerLastOverlayAt < 250) {
    return;
  }
  runtime.frameProfilerLastOverlayAt = now;
  const overlay = ensureDebugFrameProfilerOverlay();
  overlay.hidden = false;
  const samples = runtime.frameProfilerSamples.slice(-60);
  if (!samples.length) {
    overlay.textContent = "FRAME PROFILER\ncollecting...";
    return;
  }
  const latest = samples[samples.length - 1];
  const avgWork = getDebugFrameProfilerAverage(samples, (sample) => sample.workMs);
  const avgGap = getDebugFrameProfilerAverage(samples, (sample) => sample.rafGapMs);
  const fps = avgGap > 0.01 ? Math.min(999, 1000 / avgGap) : 0;
  const maxWork = Math.max(...samples.map((sample) => Number(sample.workMs) || 0));
  const sectionAverage = (name) => getDebugFrameProfilerAverage(samples, (sample) => sample.sections?.[name]);
  const counterAverage = (name) => getDebugFrameProfilerAverage(samples, (sample) => sample.counters?.[name]);
  const latestSections = Object.entries(latest.sections || {}).sort((left, right) => Number(right[1]) - Number(left[1]));
  const hottest = latestSections[0] || ["none", 0];
  overlay.textContent = [
    "FRAME PROFILER",
    `FPS ${fps.toFixed(1)} | RAF ${avgGap.toFixed(1)} ms`,
    `work ${avgWork.toFixed(2)} ms avg | ${maxWork.toFixed(2)} max`,
    `motion ${sectionAverage("fishMotion").toFixed(2)} | actions ${sectionAverage("fishActions").toFixed(2)}`,
    `tank ${sectionAverage("tankRender").toFixed(2)} | fish ${sectionAverage("fishDraw").toFixed(2)} | prep ${sectionAverage("fishPrep").toFixed(2)}`,
    `swim ${counterAverage("fishSwimSliceDraws").toFixed(0)} slices | ${counterAverage("fishSwimWarpPasses").toFixed(1)} passes/frame | highlight ${counterAverage("fishSwimHighlightSliceDraws").toFixed(0)}`,
    `caves ${sectionAverage("caveCollision").toFixed(2)} | strict ${counterAverage("caveStrictChecks").toFixed(1)}/frame`,
    `UI ${sectionAverage("uiRender").toFixed(2)} | save ${sectionAverage("saveState").toFixed(2)}`,
    `last tick ${runtime.frameProfilerLastTickMs.toFixed(2)} | deferred UI ${runtime.frameProfilerLastDeferredUiMs.toFixed(2)}`,
    `last save ${runtime.frameProfilerLastSaveMs.toFixed(2)} | last full UI ${runtime.frameProfilerLastUiRenderMs.toFixed(2)}`,
    `long frames ${runtime.frameProfilerLongFrameCount}`,
    `latest hot: ${hottest[0]} ${Number(hottest[1]).toFixed(2)} ms`
  ].join("\n");
}

function finishDebugFrameProfile() {
  const sample = runtime.frameProfilerCurrent;
  if (!sample) {
    return;
  }
  sample.workMs = Math.max(0, performance.now() - sample.startedAt);
  if (sample.workMs >= 20 || sample.rafGapMs >= 25) {
    runtime.frameProfilerLongFrameCount += 1;
  }
  runtime.frameProfilerSamples.push(sample);
  if (runtime.frameProfilerSamples.length > 240) {
    runtime.frameProfilerSamples.splice(0, runtime.frameProfilerSamples.length - 180);
  }
  runtime.frameProfilerCurrent = null;
  updateDebugFrameProfilerOverlay();
}

function toggleCleaningMode(options = {}) {
  const nextMode = !runtime.cleaningMode;
  clearPrimaryToolModes();
  const now = Date.now();
  let tutorialChanged = false;
  runtime.lastScrubPoint = null;
  resetScrubWipeSoundState();

  if (nextMode) {
    if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_CLEAN_TANK)) {
      tutorialChanged = setTutorialStage(TUTORIAL_STAGE_CLEAN_TANK_DONE, { now }) || tutorialChanged;
    } else {
      runtime.cleaningMode = true;
      runtime.toolModeSource = options.source || "toolbar";
      runtime.scrubAutoCompleteAt = getScrubCoverage() >= SCRUB_AUTO_COMPLETE_GRACE_THRESHOLD
        ? now + SCRUB_AUTO_COMPLETE_GRACE_MS
        : 0;
      if (options.collapseSidebar) {
        runtime.sidebarCollapsed = true;
      }
    }
  }

  if (options.source === "care-tray") runtime.medicineTrayOpen = true;
  renderToolCursor();
  if (tutorialChanged) {
    saveState();
  }
  renderUi(now);
}

function toggleScoopMode(options = {}) {
  const nextMode = !runtime.scoopMode;
  clearPrimaryToolModes();

  if (nextMode) {
    runtime.scoopMode = true;
    runtime.toolModeSource = options.source || "toolbar";
    if (options.collapseSidebar) {
      runtime.sidebarCollapsed = true;
    }
  }

  if (options.source === "care-tray") runtime.medicineTrayOpen = true;
  renderToolCursor();
  renderUi(Date.now());
}

function applyDebugTankDirtiness(targetBaseDirtiness, now, eventMessage, toastMessage) {
  rebaseTankDirtiness(now, targetBaseDirtiness);
  invalidateBoroughOverviewSnapshot(getCurrentTank());
  const livingFish = getLivingTankFish();
  const desiredPoopCount = livingFish.length
    ? Math.max(state.poops.length, Math.min(28, Math.ceil(livingFish.length * (1.2 + targetBaseDirtiness * 1.6))))
    : state.poops.length;

  for (let index = state.poops.length; index < desiredPoopCount; index += 1) {
    const fish = livingFish[index % livingFish.length] || null;
    const xNorm = fish
      ? clamp((fish.xNorm || 0.5) + randomBetween(-0.08, 0.08), 0.08, 0.92)
      : clamp(0.09 + (index / Math.max(1, desiredPoopCount - 1)) * 0.82 + randomBetween(-0.02, 0.02), 0.08, 0.92);
    state.poops.push(createPoopRecord({
      fishId: fish?.id || "",
      createdAt: now - randomBetween(POOP_FALL_MS * 0.6, POOP_FALL_MS + 7 * 60 * 1000),
      xNorm,
      startYNorm: fish ? clamp((fish.yNorm || 0.5) + 0.04, 0.14, 0.8) : randomSwimY(),
      tankLayer: fish ? getFishTankLayer(fish) : 1
    }));
  }

  runtime.cleaningTransition = null;
  runtime.cleaningMode = false;
  runtime.toolModeSource = null;
  runtime.pointerDown = false;
  clearScrubProgress();
  renderToolCursor();
  const nextCleanliness = Math.max(0, Math.round((1 - getBaseTankDirtiness(now)) * 100));
  pushEvent(eventMessage(nextCleanliness), now);
  saveState();
  renderUi(now);
  showToast(toastMessage(nextCleanliness));
}

function increaseTankDirtinessDebug() {
  const now = Date.now();
  syncState(now);

  const currentBaseDirtiness = getBaseTankDirtiness(now);
  if (currentBaseDirtiness >= 0.995) {
    showToast("The tank is already at maximum dirtiness.");
    return;
  }

  const targetBaseDirtiness = clamp(currentBaseDirtiness + 0.1, 0, 1);
  applyDebugTankDirtiness(
    targetBaseDirtiness,
    now,
    (nextCleanliness) => `Debug grime increased. Tank cleanliness dropped to ${nextCleanliness}%.`,
    () => "-10% cleanliness."
  );
}

function maxTankDirtinessDebug() {
  const now = Date.now();
  syncState(now);

  const currentBaseDirtiness = getBaseTankDirtiness(now);
  if (currentBaseDirtiness >= 0.995) {
    showToast("The tank is already at maximum dirtiness.");
    return;
  }

  applyDebugTankDirtiness(
    1,
    now,
    (nextCleanliness) => `Debug tank dirtiness maxed. Tank cleanliness dropped to ${nextCleanliness}%.`,
    () => "Tank dirtiness maxed."
  );
}

function maxTankCleanlinessDebug() {
  const now = Date.now();
  syncState(now);

  const currentBaseDirtiness = getBaseTankDirtiness(now);
  const hasVisibleWaste = Array.isArray(state.poops) && state.poops.length > 0;
  if (currentBaseDirtiness <= 0.005 && !hasVisibleWaste) {
    showToast("The tank is already at maximum cleanliness.");
    return;
  }

  rebaseTankDirtiness(now, 0);
  state.poops = [];
  invalidateBoroughOverviewSnapshot(getCurrentTank());
  runtime.cleaningTransition = null;
  runtime.cleaningMode = false;
  runtime.toolModeSource = null;
  runtime.pointerDown = false;
  clearScrubProgress();
  renderToolCursor();
  pushEvent("Debug tank cleanliness maxed. Tank grime reset to 0%.", now);
  saveState();
  renderUi(now);
  showToast("Tank cleanliness maxed.");
}

function forceAllWhalesToBreatheDebug(now = Date.now()) {
  const tank = getCurrentTank();
  const whales = Array.isArray(tank?.fish)
    ? tank.fish.filter((fish) => fish && !isFishDead(fish) && isWhaleFish(fish))
    : [];

  let started = 0;
  for (const fish of whales) {
    clearWhaleBreathState(fish, now, { reschedule: false });
    fish.whaleNextBreathAt = now;
    if (startWhaleBreathCycle(fish, getSpeciesForFish(fish), now)) {
      started += 1;
    }
  }

  if (started > 0) {
    showToast(`${started} ${pluralize("whale", started)} heading up for air.`);
  } else {
    showToast("No living whales in this tank.");
  }
  return started;
}


function getDebugFishProgressionInspection(fishOrId = null) {
  const fish = fishOrId && typeof fishOrId === "object"
    ? fishOrId
    : getManagedFishById(String(fishOrId || runtime.selectedFishId || runtime.selectedFishStatusFishId || ""))?.fish || null;
  const species = getSpeciesForFish(fish);
  if (!fish || !species) return null;

  const progressionEligible = typeof isFishSpeciesCareProgressionEligible === "function"
    ? isFishSpeciesCareProgressionEligible(species)
    : false;
  const mastery = progressionEligible && typeof getFishSpeciesMasteryRecord === "function"
    ? getFishSpeciesMasteryRecord(species.id, { species, create: false })
    : null;
  const baseKey = progressionEligible && typeof getFishBaseAppearanceVariantKey === "function"
    ? getFishBaseAppearanceVariantKey(species)
    : "";
  const unlockedVariantKeys = new Set(Array.isArray(mastery?.unlockedVariantKeys) ? mastery.unlockedVariantKeys : []);
  if (baseKey) unlockedVariantKeys.add(baseKey);
  const readOnlyMastery = {
    ...(mastery || {}),
    unlockedVariantKeys: [...unlockedVariantKeys]
  };
  const lockedPool = progressionEligible && typeof getFishLockedAppearanceVariantPool === "function"
    ? getFishLockedAppearanceVariantPool(species, readOnlyMastery)
    : [];
  const lockedVariantCount = Array.isArray(lockedPool) ? lockedPool.length : 0;
  const nextUnlockProbability = lockedVariantCount > 0 ? 1 / lockedVariantCount : 0;
  const nextUnlockProbabilityPercent = nextUnlockProbability * 100;
  const nextUnlockProbabilityLabel = lockedVariantCount <= 0
    ? "Complete"
    : lockedVariantCount === 1
      ? "100%"
      : (typeof formatFishVariantUnlockChancePercent === "function"
        ? formatFishVariantUnlockChancePercent(nextUnlockProbabilityPercent)
        : `${nextUnlockProbabilityPercent.toFixed(1).replace(/\.0$/, "")}%`);

  return {
    fishId: String(fish.id || ""),
    fishName: String(fish.name || species.name || fish.id || "Fish"),
    speciesId: String(species.id || fish.speciesId || ""),
    speciesName: String(species.name || species.id || "Fish"),
    progressionEligible,
    careXp: Math.max(0, Math.floor(Number(fish.careXp) || 0)),
    careLevel: clamp(Math.floor(Number(fish.careLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX),
    speciesHighestLevel: progressionEligible
      ? clamp(Math.floor(Number(mastery?.highestLevel) || FISH_CARE_LEVEL_MIN), FISH_CARE_LEVEL_MIN, FISH_CARE_LEVEL_MAX)
      : 0,
    unlockedVariantKeys: [...unlockedVariantKeys],
    lockedVariantCount,
    nextUnlockProbability,
    nextUnlockProbabilityPercent,
    nextUnlockProbabilityLabel
  };
}

function formatDebugFishProgressionInspection(inspection) {
  if (!inspection) return "Select a fish to inspect progression.";
  if (!inspection.progressionEligible) {
    return `${inspection.fishName} · ${inspection.speciesName}\nCare progression: Not eligible`;
  }
  const keys = inspection.unlockedVariantKeys.length
    ? inspection.unlockedVariantKeys.join(", ")
    : "(none)";
  return [
    `${inspection.fishName} · ${inspection.speciesName}`,
    `careXp: ${inspection.careXp}`,
    `careLevel: ${inspection.careLevel}`,
    `species highestLevel: ${inspection.speciesHighestLevel}`,
    `unlockedVariantKeys: ${keys}`,
    `locked variants: ${inspection.lockedVariantCount}`,
    `next unlock probability: ${inspection.nextUnlockProbabilityLabel}`
  ].join("\n");
}

function syncDebugFishProgressionInspection(debugMode = isDebugModeEnabled(), selectedFish = null) {
  if (!dom.debugFishProgressionReadout && !dom.debugInspectFishProgressionButton) return null;
  const fish = selectedFish || getManagedFishById(runtime.selectedFishId || runtime.selectedFishStatusFishId)?.fish || null;
  const inspection = debugMode && fish ? getDebugFishProgressionInspection(fish) : null;
  if (dom.debugFishProgressionReadout) {
    dom.debugFishProgressionReadout.textContent = debugMode
      ? formatDebugFishProgressionInspection(inspection)
      : "Select a fish to inspect progression.";
  }
  if (dom.debugInspectFishProgressionButton) {
    dom.debugInspectFishProgressionButton.hidden = !debugMode;
    dom.debugInspectFishProgressionButton.disabled = !debugMode || !fish;
  }
  return inspection;
}

function inspectFishProgressionDebug(fishOrId = null, options = {}) {
  if (!isDebugModeEnabled()) {
    if (options.toast !== false) showToast("Debug tools are not enabled.");
    return null;
  }
  const inspection = getDebugFishProgressionInspection(fishOrId);
  if (!inspection) {
    if (options.toast !== false) showToast("Select a fish to inspect progression.");
    syncDebugFishProgressionInspection(true, null);
    return null;
  }
  if (dom.debugFishProgressionReadout) {
    dom.debugFishProgressionReadout.textContent = formatDebugFishProgressionInspection(inspection);
  }
  if (typeof console !== "undefined" && typeof console.table === "function") {
    console.table({
      fishId: inspection.fishId,
      fishName: inspection.fishName,
      speciesId: inspection.speciesId,
      careXp: inspection.careXp,
      careLevel: inspection.careLevel,
      speciesHighestLevel: inspection.speciesHighestLevel,
      unlockedVariantKeys: inspection.unlockedVariantKeys.join(", "),
      lockedVariantCount: inspection.lockedVariantCount,
      nextUnlockProbability: inspection.nextUnlockProbabilityLabel
    });
  }
  if (options.toast !== false) showToast(`${inspection.fishName} progression logged to console.`);
  return inspection;
}

function getDebugFishSwimAnimationMetrics(fishOrId = null) {
  const fish = fishOrId && typeof fishOrId === "object"
    ? fishOrId
    : getManagedFishById(String(fishOrId || runtime.selectedFishId || runtime.selectedFishStatusFishId || ""))?.fish || null;
  if (!fish?.id || !(runtime?.fishSwimAnimationDebugMetrics instanceof Map)) return null;
  const metrics = runtime.fishSwimAnimationDebugMetrics.get(String(fish.id));
  return metrics ? { ...metrics } : null;
}

function inspectFishSwimAnimationDebug(fishOrId = null, options = {}) {
  if (!isDebugModeEnabled()) {
    if (options.toast !== false) showToast("Debug tools are not enabled.");
    return null;
  }
  const metrics = getDebugFishSwimAnimationMetrics(fishOrId);
  if (!metrics) {
    if (options.toast !== false) showToast("Select a visible fish, then let it render once.");
    return null;
  }
  const rounded = {
    fishId: metrics.fishId,
    fishName: metrics.fishName,
    preset: metrics.presetId,
    tailIntensity: Number(metrics.tailIntensity.toFixed(4)),
    animationSpeed: Number(metrics.animationSpeed.toFixed(4)),
    depthWarp: Number(metrics.depthWarp.toFixed(4)),
    perspective: Number(metrics.perspective.toFixed(4)),
    frontWiggle: Number(metrics.frontWiggle.toFixed(4)),
    phase: Number(metrics.phase.toFixed(4)),
    effectiveCyclesPerSecond: Number(metrics.effectiveCyclesPerSecond.toFixed(4)),
    rawDepthWarpPx: Number(metrics.rawDepthWarpPx.toFixed(4)),
    maximumRearDepthWarpPx: Number(metrics.maximumRearDepthWarpPx.toFixed(4)),
    fishDisplayHeight: Number(metrics.fishDisplayHeight.toFixed(4)),
    rawDepthWarpRatio: Number(metrics.rawDepthWarpRatio.toFixed(6)),
    rearDepthWarpRatio: Number(metrics.rearDepthWarpRatio.toFixed(6)),
    panicActive: Boolean(metrics.panicActive),
    activePanicDash: Boolean(metrics.activePanicDash),
    panicSpeedBoost: Number(metrics.panicSpeedBoost.toFixed(4))
  };
  if (typeof console !== "undefined" && typeof console.table === "function") {
    console.table(rounded);
  }
  if (options.toast !== false) showToast(`${metrics.fishName} swim math logged to console.`);
  return rounded;
}

function exposeDebugConsoleCommands() {
  if (typeof window === "undefined") {
    return false;
  }
  window.debugWhalesBreathe = forceAllWhalesToBreatheDebug;
  window.debugInspectFishProgression = (fishId = "") => inspectFishProgressionDebug(fishId || null, { toast: false });
  window.debugInspectSwimAnimation = (fishId = "") => inspectFishSwimAnimationDebug(fishId || null, { toast: false });
  window.debugSetSwimAnimationPreset = (presetId = "regular") => {
    if (!isDebugModeEnabled()) {
      return { ok: false, reason: "debug-disabled", presetId: "" };
    }
    const normalized = String(presetId || "").trim().toLowerCase();
    if (!normalized || normalized === "auto" || normalized === "clear") {
      runtime.debugSwimAnimationPresetOverride = "";
      return { ok: true, presetId: "", mode: "automatic" };
    }
    const allowed = new Set(["regular", "chill", "zoomies", "panicked"]);
    if (!allowed.has(normalized)) {
      return { ok: false, reason: "unsupported-preset", presetId: normalized };
    }
    runtime.debugSwimAnimationPresetOverride = normalized;
    return { ok: true, presetId: normalized, mode: "forced-rendering-only" };
  };
  window.debugClearSwimAnimationPreset = () => window.debugSetSwimAnimationPreset("auto");
  window.debugForceRegularSwimAnimation = () => window.debugSetSwimAnimationPreset("regular");
  window.debugForceChillSwimAnimation = () => window.debugSetSwimAnimationPreset("chill");
  window.debugForceZoomiesSwimAnimation = () => window.debugSetSwimAnimationPreset("zoomies");
  window.debugForcePanickedSwimAnimation = () => window.debugSetSwimAnimationPreset("panicked");
  window.debugSetProteusDonationsTo99 = () => {
    state.proteusCorpseDonationCount = 99;
    state.proteusZombieFishUnlockedAt = 0;
    state.proteusZombieFishOfferAt = 0;
    state.proteusZombieFishAuthenticatedAt = 0;
    state.proteusZombieFishClaimedAt = 0;
    saveState();
    renderUi(Date.now());
    return 99;
  };
  window.debugUnlockProteusZombieFish = () => {
    const now = Date.now();
    state.proteusCorpseDonationCount = Math.max(PROTEUS_ZOMBIE_FISH_DONATION_UNLOCK_COUNT, Number(state.proteusCorpseDonationCount) || 0);
    state.proteusZombieFishUnlockedAt = now;
    state.proteusZombieFishOfferAt = now;
    state.proteusZombieFishAuthenticatedAt = 0;
    state.proteusDiscovered = true;
    if (!(Number(state.proteusDiscoveredAt) > 0)) state.proteusDiscoveredAt = now;
    saveState();
    renderUi(now);
    return true;
  };
  window.debugAuthenticateProteusZombieFish = () => {
    const now = Date.now();
    if (!(Number(state.proteusZombieFishUnlockedAt) > 0)) window.debugUnlockProteusZombieFish();
    state.proteusZombieFishOfferAt = Math.min(Number(state.proteusZombieFishOfferAt) || now, now);
    state.proteusZombieFishAuthenticatedAt = now;
    saveState();
    renderUi(now);
    return true;
  };
  window.debugClaimProteusZombieFish = () => {
    if (!(Number(state.proteusZombieFishAuthenticatedAt) > 0)) window.debugAuthenticateProteusZombieFish();
    return claimProteusZombieFish(Date.now());
  };
  window.debugForceProteusZombieAttack = () => {
    const fish = state?.fish?.find((entry) => isProteusZombieFish(entry) && !isFishDead(entry));
    if (!fish) return false;
    fish.satiatedUntil = 0;
    fish.zombieAggressionTargetId = "";
    fish.zombieAggressionUntil = 0;
    fish.zombieAggressionNextAt = Date.now();
    return true;
  };
  window.debugEndProteusZombieAttack = () => {
    const fish = state?.fish?.find((entry) => isProteusZombieFish(entry) && !isFishDead(entry));
    return fish ? clearProteusZombieAggression(fish, Date.now()) : false;
  };
  return true;
}

function addDebugCoins(amount = 10) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    showToast("Income is disabled while Peaceful Mode is enabled.");
    return;
  }
  const now = Date.now();
  const coinAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!coinAmount) {
    return;
  }

  state.coins = Math.min(MAX_WALLET_COINS, state.coins + coinAmount);
  pushEvent(`Debug coins added. +${coinAmount} ${pluralize("coin", coinAmount)}.`, now);
  saveState();
  renderUi(now);
  showToast(`+${coinAmount} ${pluralize("coin", coinAmount)}.`);
}

// Dead Fish Phase 15: revival is a hard boundary between corpse simulation and
// living simulation. Clear corpse-only persisted/runtime state and reset the fish
// to a neutral living presentation before normal AI resumes.
function clearRevivedFishCorpseState(fish, now = Date.now()) {
  if (!fish?.id) {
    return false;
  }

  const fishId = fish.id;
  let changed = typeof clearDeadFishCorpseMotion === "function"
    ? clearDeadFishCorpseMotion(fishId)
    : false;

  // Phase 16 will persist corpse presentation state. Clearing these keys now
  // keeps revival safe for current, future, and migrated save shapes.
  const corpseFields = [
    "corpseStage", "corpseStageStartedAt", "corpseTransitionProgress",
    "corpseRotation", "corpseTilt", "corpseSurfaceYNorm",
    "corpseSurfaceOffset", "corpseSurfaceOffsetNorm", "corpseSurfaceRestYOffsetNorm",
    "corpseStableAngleOffset", "corpseDriftDirection", "corpseDriftVelocity",
    "corpseDriftVelocityNorm", "corpseDriftSpeedNormPerSecond", "corpseDriftPhase",
    "corpseBobPhase", "corpseCaveState", "corpseCaveExitIndex",
    "corpseCaveExitCleared", "corpseMovementMode", "corpseSeed"
  ];
  for (const key of corpseFields) {
    if (Object.prototype.hasOwnProperty.call(fish, key)) {
      delete fish[key];
      changed = true;
    }
  }

  const livingDirection = Number(fish.direction) < 0 ? -1 : 1;
  fish.displayDirection = livingDirection;
  fish.displayAngle = livingDirection < 0 ? Math.PI : 0;
  fish.turnFromDirection = livingDirection;
  fish.turnToDirection = livingDirection;
  fish.turnFromAngle = fish.displayAngle;
  fish.turnToAngle = fish.displayAngle;
  fish.turnSpinDirection = livingDirection < 0 ? 1 : -1;
  fish.turnStartedAt = null;
  fish.turnDurationMs = 0;
  fish.swimTilt = 0;
  fish.motionLevel = 0.18;
  fish.wiggleClock = 0;

  const xNorm = Number.isFinite(Number(fish.xNorm)) ? Number(fish.xNorm) : 0.5;
  const yNorm = Number.isFinite(Number(fish.yNorm)) ? Number(fish.yNorm) : 0.5;
  fish.targetXNorm = xNorm;
  fish.targetYNorm = yNorm;
  fish.targetAt = now;

  const restartCollections = [
    "boroughOverviewFishProxies", "pendingNeighborhoodTravel", "foodTravelDestinations",
    "activeFishCavePlans", "fishActionSteeringByFishId", "fishActionQueuesByFishId",
    "fishActionQueueCollapsedFishIds", "fishShadowPlaneCache", "fishLayerDepthScaleTransitions",
    "fishLayerTravelStepTransitions", "fishCollisionAvoidanceById", "fishNavigationMemoryById",
    "debugBehaviorSteeringByFishId", "debugForcedOtocinclusStateByFishId",
    "fishGravelPebbleActions", "forcedGravelDigUntilByFishId", "waterEffectFishSamples",
    "fishFrameLookupById", "debugAutonomyPausedFishIds"
  ];
  for (const key of restartCollections) {
    const collection = runtime?.[key];
    if (collection && typeof collection.delete === "function") {
      changed = collection.delete(fishId) || changed;
    }
  }

  if (runtime?.boroughOverviewSnapshotCache instanceof Map && runtime.boroughOverviewSnapshotCache.size) {
    runtime.boroughOverviewSnapshotCache.clear();
    changed = true;
  }
  if (runtime && runtime.fishRenderFrameCache != null) {
    runtime.fishRenderFrameCache = null;
    changed = true;
  }
  if (runtime && runtime.fishRenderLayerBuckets != null) {
    runtime.fishRenderLayerBuckets = null;
    changed = true;
  }
  if (runtime && Number(runtime.boroughOverviewFishRenderedAt) !== 0) {
    runtime.boroughOverviewFishRenderedAt = 0;
    changed = true;
  }

  return changed;
}

function reviveFishForDebug(fish, now = Date.now()) {
  if (!fish || !isFishDead(fish)) {
    return false;
  }

  const species = getSpeciesForFish(fish);
  fish.lifeState = "alive";
  fish.deadAt = null;
  if (typeof clearRevivedFishCorpseState === "function") {
    clearRevivedFishCorpseState(fish, now);
  } else if (typeof clearDeadFishCorpseMotion === "function") {
    clearDeadFishCorpseMotion(fish);
  }
  fish.healthUnits = getFishMaxHealthUnits(fish, species);
  fish.activity = "roam";
  fish.decayStage = null;
  fish.fedStreak = 0;
  fish.missedMealsInRow = 0;
  fish.comfortDamageProgressMs = 0;
  fish.feedingPelletId = null;
  fish.behaviorIntent = null;
  fish.foodRefusalUntil = 0;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.blockedDecorId = null;
  fish.blockedDecorUntil = null;
  fish.coarseActivity = null;
  fish.entryStartedAt = null;
  fish.entryDurationMs = 0;
  fish.entryFromYNorm = null;
  fish.entrySplashTriggered = false;
  fish.turnStartedAt = null;
  fish.turnDurationMs = 0;
  fish.sharkLastAttackAt = 0;

  clearPiranhaAttackState(fish);
  fish.piranhaConsumptionStartedAt = null;
  fish.piranhaConsumptionEndsAt = null;
  fish.piranhaLastBloodAt = null;
  clearFishPanicState(fish);
  clearFishSchoolFollowState(fish);
  clearFishCaveBehavior(fish);
  resetFishDiseaseFields(fish, DISEASE_STATE_NONE, now);
  clearDiseaseGreenBubbleStream(fish);

  runtime.pendingNeighborhoodTravel?.delete?.(fish.id);
  runtime.fishActionQueuesByFishId?.delete?.(fish.id);
  runtime.fishActionSteeringByFishId?.delete?.(fish.id);
  runtime.debugBehaviorSteeringByFishId?.delete?.(fish.id);
  runtime.debugAutonomyPausedFishIds?.delete?.(fish.id);
  runtime.activeFishCavePlans?.delete?.(fish.id);
  runtime.fishGravelPebbleActions?.delete?.(fish.id);
  runtime.forcedGravelDigUntilByFishId?.delete?.(fish.id);

  const xNorm = clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92);
  const yNorm = clamp(Number(fish.yNorm) || 0.5, 0.14, 0.8);
  fish.xNorm = xNorm;
  fish.yNorm = yNorm;
  fish.targetXNorm = xNorm;
  fish.targetYNorm = yNorm;
  if (species) {
    const layer = getEffectiveFishBehavior(fish, species) === "sucker"
      ? getSuckerFishGlassLayer(fish)
      : clampTankLayer(Number(fish.tankLayer) || DEFAULT_TANK_LAYER);
    setFishTankLayers(fish, layer, layer);
    fish.swimSpeed = normalizeFishSpeed(species, Number(fish.swimSpeed));
  }
  fish.targetAt = now;
  return true;
}

function restoreAllFishHealthDebug() {
  const now = Date.now();
  const allFish = [...getAllTankFish(state), ...(Array.isArray(state.storedFish) ? state.storedFish : [])];
  let revivedCount = 0;
  let healedCount = 0;

  for (const fish of allFish) {
    if (!fish) {
      continue;
    }

    if (isFishDead(fish)) {
      if (reviveFishForDebug(fish, now)) {
        revivedCount += 1;
      }
      continue;
    }

    const maxHealthUnits = getFishMaxHealthUnits(fish);
    const changed = fish.healthUnits !== maxHealthUnits
      || (Number(fish.comfortDamageProgressMs) || 0) !== 0
      || (Number(fish.missedMealsInRow) || 0) !== 0
      || (Number(fish.fedStreak) || 0) !== 0;
    fish.healthUnits = maxHealthUnits;
    fish.comfortDamageProgressMs = 0;
    fish.missedMealsInRow = 0;
    fish.fedStreak = 0;
    if (changed) {
      healedCount += 1;
    }
  }

  for (const tank of getAllTanks(state)) {
    if (!(tank.fish || []).some((fish) => isFishDead(fish))) {
      tank.lastCorpseSicknessAt = null;
    }
  }

  if (!revivedCount && !healedCount) {
    showToast("All fish are already alive and at full health.");
    return;
  }

  const parts = [];
  if (revivedCount) parts.push(`${revivedCount} ${pluralize("fish", revivedCount)} revived`);
  if (healedCount) parts.push(`${healedCount} ${pluralize("fish", healedCount)} fully healed`);
  pushEvent(`Debug fish reset: ${parts.join(", ")}.`, now);
  saveState();
  renderUi(now);
  showToast(parts.join(" · "));
}

function resetMealsDebug() {
  const now = Date.now();
  const slots = [...getTodaysMealSlots(now), ...getDailyMealIndicatorSlots(now)];
  let cleared = 0;

  for (const slot of slots) {
    if (state.mealHistory?.[slot.key]) {
      delete state.mealHistory[slot.key];
      cleared += 1;
    }
  }

  if (!cleared) {
    showToast("Today's meals are already reset.");
    return;
  }

  pushEvent("Debug meal reset cleared today's feeding record.", now);
  saveState();
  renderUi(now);
  showToast("Today's meals reset.");
}

function completeMealsDebug() {
  const now = Date.now();
  const slots = getTodaysMealSlots(now);
  let completedSlots = 0;
  let creditedFishCount = 0;

  for (const slot of slots) {
    const eligibleFish = getMealEligibleFishForSlot(slot);
    if (!eligibleFish.length) {
      continue;
    }

    const entry = ensureMealHistoryEntry(slot.key, now);
    const fedFishIds = new Set(Array.isArray(entry.fishIds) ? entry.fishIds : []);
    const beforeCount = fedFishIds.size;
    for (const fish of eligibleFish) {
      fedFishIds.add(fish.id);
      fish.lastAteAt = Math.max(Number(fish.lastAteAt) || 0, now);
    }
    entry.fishIds = [...fedFishIds];
    entry.fedAt = Math.max(Number(entry.fedAt) || 0, now);
    if (fedFishIds.size > beforeCount) {
      completedSlots += 1;
      creditedFishCount += fedFishIds.size - beforeCount;
    }
  }

  let indicatorMealsAdded = 0;
  for (const slot of getDailyMealIndicatorSlots(now)) {
    const entry = ensureMealHistoryEntry(slot.key, now);
    const fedFishIds = new Set(Array.isArray(entry.fishIds) ? entry.fishIds : []);
    const beforeCount = fedFishIds.size;
    for (const fish of (getCurrentTank()?.fish || [])) {
      if (fish && !isFishDead(fish) && !isMealFreeFish(fish)) {
        fedFishIds.add(fish.id);
      }
    }
    entry.fishIds = [...fedFishIds];
    entry.fedAt = Math.max(Number(entry.fedAt) || 0, now);
    indicatorMealsAdded += Math.max(0, fedFishIds.size - beforeCount);
  }

  if (!completedSlots && !indicatorMealsAdded) {
    showToast("Today's meals are already complete.");
    return;
  }

  pushEvent(`Debug meal completion marked today's meals complete for ${creditedFishCount} ${pluralize("fish", creditedFishCount)}.`, now);
  saveState();
  renderUi(now);
  showToast("Today's meals completed.");
}

function dispenseAutoDispenserNow(now = Date.now()) {
  if (!hasAutoDispenserInstalled()) {
    showToast("Install a pellet dispenser first.");
    return false;
  }

  const dispenser = state.autoDispenser;
  const requested = Math.min(AUTO_DISPENSER_MAX_PELLETS, getAutoDispenserDemandCount(getCurrentTank(), now));

  if (requested <= 0) {
    showToast("There are no hungry connected fish to feed right now.");
    return false;
  }

  const availableCount = getAutoDispenserLoadedCount(dispenser);
  if (availableCount <= 0) {
    dispenser.refillAlert = true;
    saveState();
    renderUi(now);
    showToast("The pellet dispenser is empty.");
    return false;
  }

  const releaseCount = Math.min(requested, availableCount);
  const releasedPellets = dispenser.storedPellets.splice(0, releaseCount);
  const floatingPellets = releasedPellets
    .map((storedPellet, index) => createAutoDispenserDroppedPellet(storedPellet, now + index * AUTO_DISPENSER_RELEASE_SPACING_MS))
    .filter(Boolean);

  if (floatingPellets.length > 0) {
    state.floatingPellets.push(...floatingPellets);
    assignFloatingPelletsToHungryFish(now);
    playDispenserSoundEffect();
    pushEvent(
      `The pellet dispenser manually released ${floatingPellets.length} pellet${floatingPellets.length === 1 ? "" : "s"}.`,
      now
    );
  }

  const ranEmpty = requested > releaseCount || (requested > 0 && getAutoDispenserLoadedCount(dispenser) <= 0);
  dispenser.refillAlert = ranEmpty;
  if (ranEmpty && releaseCount > 0) {
    pushEvent("The pellet dispenser ran empty during a manual release.", now);
  }

  saveState();
  renderUi(now);
  if (floatingPellets.length > 0) {
    showToast(`Dispenser released ${floatingPellets.length} pellet${floatingPellets.length === 1 ? "" : "s"}.`);
    return true;
  }

  showToast("The pellet dispenser could not release pellets right now.");
  return false;
}

function triggerDebugGravelPebbleTest() {
  const now = Date.now();
  if (!canUseFishGravelPebblePlay()) {
    showToast("Add gravel pebble assets to use the gravel pebble debug.");
    return;
  }

  const fish = pickFishGravelPebbleDebugCandidate(now);
  if (!fish) {
    showToast("Keep a living non-sucker fish in the tank to test gravel pebble play.");
    return;
  }

  const species = getSpeciesForFish(fish);
  if (!species) {
    return;
  }

  clearAllFishGravelPebbleActions(now);
  if (!startFishGravelPebbleAction(fish, species, now, { force: true })) {
    showToast("That fish could not start a gravel pebble test right now.");
    return;
  }

  runtime.selectedFishId = fish.id;
  pushEvent(`Debug sent ${fish.name} to toss a gravel pebble.`, now);
  renderUi(now);
  showToast(`${fish.name} is heading down to grab a pebble.`);
}

function triggerDebugGravelDigTest() {
  const now = Date.now();
  const fish = pickFishGravelDigDebugCandidate(now);
  if (!fish) {
    showToast("Keep a living non-sucker fish in the tank to test gravel digging.");
    return;
  }

  const species = getSpeciesForFish(fish);
  if (!species) {
    return;
  }

  if (!startFishGravelDigAction(fish, species, now)) {
    showToast("That fish could not start digging right now.");
    return;
  }

  runtime.selectedFishId = fish.id;
  pushEvent(`Debug sent ${fish.name} to dig in the gravel.`, now);
  renderUi(now);
  showToast(`${fish.name} is heading down to dig.`);
}

function isDebugCaveTestFish(fish) {
  return Boolean(runtime.debugNightCaveMode && fish?.id && runtime.debugForcedCaveFishId === fish.id);
}

function clearDebugCaveTestSelection() {
  runtime.debugForcedCaveFishId = null;
  runtime.debugForcedCaveDecorId = null;
}

function buildDebugFallbackCavePathNodes(item, mouthPoint, insidePoint) {
  if (!item || !mouthPoint || !insidePoint) {
    return [];
  }

  const nodes = [];
  for (const t of [0.35, 0.68, 1]) {
    const point = {
      xNorm: mouthPoint.xNorm + (insidePoint.xNorm - mouthPoint.xNorm) * t,
      yNorm: mouthPoint.yNorm + (insidePoint.yNorm - mouthPoint.yNorm) * t
    };
    if (t < 1 && !isPointInsideCaveInteriorDescriptor(item, point)) {
      continue;
    }
    nodes.push(point);
  }

  if (!nodes.length) {
    nodes.push({ ...insidePoint });
  }

  const lastNode = nodes[nodes.length - 1];
  if (Math.hypot(lastNode.xNorm - insidePoint.xNorm, lastNode.yNorm - insidePoint.yNorm) > 0.0005) {
    nodes.push({ ...insidePoint });
  }

  return nodes;
}

function buildDebugFallbackCavePlan(item, fish, now = Date.now()) {
  if (!item || !fish) {
    return null;
  }

  const species = getSpeciesForFish(fish);
  if (!species || species.behavior === "sucker" || species.caveEnabled === false) {
    return null;
  }

  const triggerRegions = getCaveTriggerRegions(item);
  const seatRegions = getCaveSeatRegions(item);
  if (!triggerRegions.length || !seatRegions.length) {
    return null;
  }

  const trigger = [...triggerRegions]
    .sort((left, right) => Math.hypot(left.xNorm - fish.xNorm, left.yNorm - fish.yNorm) - Math.hypot(right.xNorm - fish.xNorm, right.yNorm - fish.yNorm))[0];
  const seat = [...seatRegions]
    .sort((left, right) => Math.hypot(left.xNorm - trigger.xNorm, left.yNorm - trigger.yNorm) - Math.hypot(right.xNorm - trigger.xNorm, right.yNorm - trigger.yNorm))[0];
  if (!trigger || !seat) {
    return null;
  }

  const profile = getCaveBehaviorProfileForItem(item);
  const matchedPortal = Array.isArray(profile?.portals)
    ? profile.portals
      .map((portal) => {
        const mouth = mapDecorLocalPointToTankNorm(item, portal.mouthX, portal.mouthY);
        const approach = mapDecorLocalPointToTankNorm(item, portal.approachX, portal.approachY);
        if (!mouth || !approach) {
          return null;
        }

        return {
          portal,
          mouth,
          approach,
          score: Math.hypot(mouth.xNorm - trigger.xNorm, mouth.yNorm - trigger.yNorm)
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.score - right.score)[0]
    : null;

  const approach = matchedPortal?.approach || {
    xNorm: trigger.xNorm,
    yNorm: clamp(trigger.yNorm + 0.08, 0.14, 0.8)
  };
  const mouth = matchedPortal?.mouth || {
    xNorm: trigger.xNorm,
    yNorm: trigger.yNorm
  };
  const seatDirection = getCaveSeatFacingDirection(seat, fish.direction || 1);
  const inside = pickCaveSeatIdleTarget(item, seat, fish, species, now, seatDirection) || {
    xNorm: seat.xNorm,
    yNorm: seat.yNorm
  };
  const entryPathNodes = buildDebugFallbackCavePathNodes(item, mouth, inside);
  const exitPathNodes = entryPathNodes.slice().reverse();
  const currentLayer = getFishTankLayer(fish);
  const frontLayer = clampTankLayer(matchedPortal?.portal?.outsideLayer || (CAVE_ALLOWED_OUTSIDE_LAYERS.includes(currentLayer) ? currentLayer : 2));
  const backLayer = getCaveInsideLayerForItem(item);

  return {
    decorId: item.id,
    portalId: matchedPortal?.portal?.id || trigger.id,
    triggerId: trigger.id,
    seatId: seat.id,
    seatDirection,
    frontLayer,
    backLayer,
    approach,
    mouth,
    inside,
    entryPathNodes,
    exitPathNodes,
    lingerMs: Math.max(CAVE_TRIGGER_COOLDOWN_MS + 3000, Number(profile?.lingerMinMs) || 14000),
    score: Math.hypot(fish.xNorm - trigger.xNorm, fish.yNorm - trigger.yNorm),
    debugForced: true
  };
}

function collectDebugCaveTestPlansForFish(fish, now = Date.now(), options = {}) {
  const normalPlans = collectCaveBehaviorPlansForFish(fish, now, options);
  if (normalPlans.length) {
    return normalPlans;
  }

  const ignoreBlockedDecor = options.ignoreBlockedDecor === true;
  return state.placedDecor
    .filter((item) => isCaveDecorKey(item.decorKey))
    .filter((item) => !(
      !ignoreBlockedDecor &&
      fish.blockedDecorId &&
      item.id === fish.blockedDecorId &&
      Number.isFinite(fish.blockedDecorUntil) &&
      now < fish.blockedDecorUntil
    ))
    .map((item) => buildDebugFallbackCavePlan(item, fish, now))
    .filter(Boolean)
    .sort((left, right) => left.score - right.score);
}

function getDebugCaveTestAssignment(now = Date.now(), options = {}) {
  if (!runtime.debugNightCaveMode) {
    return null;
  }

  const ignoreBlockedDecor = options.ignoreBlockedDecor !== false;
  const activelyDraggedFishId = runtime.fishDragState?.fishId || null;
  const buildCandidate = (fish) => {
    if (!fish || fish.id === activelyDraggedFishId || isFishDead(fish)) {
      return null;
    }

    const species = getSpeciesForFish(fish);
    if (!species || species.behavior === "sucker" || species.caveEnabled === false) {
      return null;
    }

    let plans = collectDebugCaveTestPlansForFish(fish, now, { ignoreBlockedDecor });
    if (runtime.debugForcedCaveDecorId) {
      plans = plans.filter((plan) => plan.decorId === runtime.debugForcedCaveDecorId);
    }
    if (!plans.length) {
      return null;
    }

    return { fish, species, plans };
  };

  const currentFish = state.fish.find((fish) => fish.id === runtime.debugForcedCaveFishId);
  const currentCandidate = buildCandidate(currentFish);
  if (currentCandidate) {
    return currentCandidate;
  }

  clearDebugCaveTestSelection();

  const candidates = state.fish
    .map((fish) => buildCandidate(fish))
    .filter(Boolean);
  if (!candidates.length) {
    return null;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const chosenPlan = chosen.plans[Math.floor(Math.random() * chosen.plans.length)];
  runtime.debugForcedCaveFishId = chosen.fish.id;
  runtime.debugForcedCaveDecorId = chosenPlan.decorId;
  return {
    fish: chosen.fish,
    species: chosen.species,
    plans: chosen.plans.filter((plan) => plan.decorId === chosenPlan.decorId)
  };
}

function startDebugCaveLoopCycle(now = Date.now(), options = {}) {
  const { silentFailure = false, suppressEvent = false } = options;
  const assignment = getDebugCaveTestAssignment(now, { ignoreBlockedDecor: true });
  if (!assignment?.plans?.length) {
    if (!silentFailure) {
      showToast("Add a cave and a cave-enabled living fish to test cave behavior.");
    }
    return null;
  }

  const fish = assignment.fish;
  const plan = assignment.plans[Math.floor(Math.random() * assignment.plans.length)];
  const decor = state.placedDecor.find((item) => item.id === plan.decorId);
  const decorName = decor ? (runtime.decorMap.get(decor.decorKey)?.name || titleFromFile(decor.decorKey)) : "the cave";

  fish.activity = "roam";
  fish.feedingPelletId = null;
  fish.blockedDecorId = null;
  fish.blockedDecorUntil = null;
  fish.caveTriggerCooldownUntil = null;
  clearFishCaveBehavior(fish);
  fish.hangoutDecorId = null;
  fish.targetAt = now;
  releasePelletsTargetingFishIds(fish.id);

  if (assignment.species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(assignment.species);
  }

  beginFishCaveBehavior(fish, plan, now);
  runtime.selectedFishId = fish.id;

  if (!suppressEvent) {
    pushEvent(`Debug sent ${fish.name} to test ${decorName}.`, now);
  }

  return `${fish.name} is testing ${decorName}.`;
}

function toggleDebugNightCaveMode() {
  const now = Date.now();
  runtime.debugNightCaveMode = !runtime.debugNightCaveMode;

  if (runtime.debugNightCaveMode) {
    clearDebugCaveTestSelection();
    const immediateCaveToast = startDebugCaveLoopCycle(now, { silentFailure: true, suppressEvent: true });
    pushEvent("Debug cave test loop enabled.", now);
    showToast(immediateCaveToast || "Cave test loop enabled, but no cave test assignment was found yet.");
  } else {
    const debugFish = state.fish.find((fish) => fish.id === runtime.debugForcedCaveFishId) || null;
    clearDebugCaveTestSelection();
    if (debugFish?.caveState) {
      abortFishCaveBehavior(debugFish, now, false);
      debugFish.targetAt = now;
    }
    pushEvent("Debug cave test loop disabled.", now);
    showToast("Cave test loop disabled.");
  }

  renderUi(now);
}

function getDebugBehaviorScenarioOptions(action) {
  switch (action) {
    case "refuse-food":
      return { allowFeeding: true, requireNormalFood: true, disallowSpecial: true };
    case "anticipate-food":
      return { requireNormalFood: true, disallowSpecial: true };
    case "inspect-lure":
      return { allowPredatorSpecial: true };
    case "disease":
      return { allowSuckerSpecial: true, allowPredatorSpecial: true };
    case "species-signature":
      return { allowPredatorSpecial: true };
    case "puffer-inflate":
    case "puffer-deflate":
    case "puffer-taps":
      return { allowActiveCave: true, allowFeeding: true, allowGravelAction: true, allowPredatorSpecial: true };
    case "oto-back":
    case "oto-swim":
    case "oto-front":
    case "oto-normal":
      return { allowActiveCave: true, allowFeeding: true, allowGravelAction: true, allowSuckerSpecial: true };
    case "clear":
      return { allowActiveCave: true, allowFeeding: true, allowGravelAction: true, allowSuckerSpecial: true, allowPredatorSpecial: true, allowDead: true };
    default:
      return { disallowSpecial: true };
  }
}

function getDebugBehaviorBlockReason(fish, species = getSpeciesForFish(fish), options = {}) {
  if (!fish) {
    return "Select a fish in the tank first.";
  }
  if (!species) {
    return "Selected fish has no species profile.";
  }
  if (!options.allowDead && isFishDead(fish)) {
    return "Select a living fish first.";
  }
  if (runtime.fishDragState?.fishId === fish.id) {
    return "Release the selected fish before forcing behavior.";
  }
  if (!options.allowActiveCave && fish.caveState) {
    return "That fish is using cave behavior right now.";
  }
  if (!options.allowFeeding && fish.activity === "feeding") {
    return "That fish is feeding right now.";
  }
  if (
    !options.allowGravelAction
    && (
      fish.activity === FISH_GRAVEL_DIG_ACTIVITY
      || fish.activity === FISH_GRAVEL_PEBBLE_ACTIVITY
      || getFishGravelPebbleAction(fish)
      || getForcedGravelDigPrompt(fish)
    )
  ) {
    return "That fish is already using a gravel behavior.";
  }

  const effectiveBehavior = getEffectiveFishBehavior(fish, species);
  if (
    options.disallowSpecial
    && ["sucker", "piranha"].includes(effectiveBehavior)
  ) {
    return `${getDebugFishDisplayName(fish, species)} uses protected ${effectiveBehavior} behavior.`;
  }
  if (
    effectiveBehavior === "sucker"
    && !options.allowSuckerSpecial
  ) {
    return `${getDebugFishDisplayName(fish, species)} uses protected cleanup behavior.`;
  }
  if (effectiveBehavior === "piranha" && !options.allowPredatorSpecial) {
    return `${getDebugFishDisplayName(fish, species)} uses protected predator behavior.`;
  }
  if (
    options.requireNormalFood
    && (
      isMealFreeFish(fish)
      || effectiveBehavior === "piranha"
      || !canFoodSatisfyFishMeal(fish, "basic")
    )
  ) {
    return `${getDebugFishDisplayName(fish, species)} does not use normal pellet feeding.`;
  }
  return "";
}

function getSelectedDebugBehaviorFish(options = {}) {
  const selectedFishId = runtime.selectedFishId || runtime.selectedFishStatusFishId;
  const fish = state?.fish?.find((entry) => entry?.id === selectedFishId) || null;
  const species = getSpeciesForFish(fish);
  return {
    fish,
    species,
    reason: getDebugBehaviorBlockReason(fish, species, options)
  };
}

function getDebugBehaviorSelectedFishOrToast(action) {
  const selection = getSelectedDebugBehaviorFish(getDebugBehaviorScenarioOptions(action));
  if (selection.reason) {
    showToast(selection.reason);
    return null;
  }
  return selection;
}

function hasDebugDecorHangoutZone(zoneTypes) {
  const allowed = new Set(normalizeStringList(zoneTypes).map((type) => type.toLowerCase().replace(/[-_\s]+/g, "-")));
  if (!allowed.size) {
    return false;
  }
  return getCachedDecorHangoutZones().some((zone) => allowed.has(zone.type));
}

function getDebugRelationshipPartner(fish) {
  if (!fish) {
    return null;
  }
  return state.fish
    .filter((otherFish) => otherFish && otherFish.id !== fish.id && !isFishDead(otherFish))
    .filter((otherFish) => runtime.fishDragState?.fishId !== otherFish.id)
    .map((otherFish) => ({
      fish: otherFish,
      distance: Math.hypot((fish.xNorm || 0.5) - (otherFish.xNorm || 0.5), (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5))
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.fish || null;
}

function setDebugFishRelationship(fish, otherFish, kind, now = Date.now()) {
  if (!fish || !otherFish || fish.id === otherFish.id) {
    return false;
  }
  const score = kind === "friend" ? 88 : kind === "fear" ? -92 : kind === "rival" ? -72 : kind === "dislike" ? -48 : 0;
  const relationships = sanitizeFishRelationships(fish.relationships);
  relationships[otherFish.id] = { kind, score, updatedAt: now };
  fish.relationships = relationships;
  fish.relationshipNextCheckAt = now + BEHAVIOR_RELATIONSHIP_CHECK_MS;
  return true;
}

function prepareFishForDebugBehavior(fish, species, now = Date.now(), options = {}) {
  const reason = getDebugBehaviorBlockReason(fish, species, options);
  if (reason) {
    showToast(reason);
    return false;
  }
  clearFishSchoolFollowState(fish);
  clearDebugBehaviorSteering(fish);
  if (!options.keepFeeding) {
    fish.activity = "roam";
    fish.feedingPelletId = null;
    releasePelletsTargetingFishIds(fish.id);
  }
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species);
  }
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  return true;
}

function finishDebugBehaviorScenario(fish, eventText, toastText, now = Date.now()) {
  runtime.selectedFishId = fish?.id || runtime.selectedFishId;
  if (eventText) {
    pushEvent(eventText, now);
  }
  saveState();
  renderUi(now);
  if (toastText) {
    showToast(toastText);
  }
}

function getActiveDebugBehaviorSteering(fish, now = Date.now()) {
  if (!fish?.id || !runtime.debugBehaviorSteeringByFishId) {
    return null;
  }
  const steering = runtime.debugBehaviorSteeringByFishId.get(fish.id);
  if (!steering) {
    return null;
  }
  if (!isDebugModeEnabled() || (Number(steering.expiresAt) || 0) <= now) {
    runtime.debugBehaviorSteeringByFishId.delete(fish.id);
    return null;
  }
  return steering;
}

function setDebugBehaviorSteering(fish, steering, now = Date.now()) {
  if (!fish?.id || !steering?.type) {
    return false;
  }
  const durationMs = Math.max(1000, Number(steering.durationMs) || 12 * 1000);
  runtime.debugBehaviorSteeringByFishId.set(fish.id, {
    ...steering,
    type: String(steering.type),
    startedAt: now,
    expiresAt: now + durationMs,
    nextRefreshAt: 0,
    faceDirection: Number.isFinite(Number(steering.faceDirection))
      ? (Number(steering.faceDirection) < 0 ? -1 : 1)
      : null,
    initialSide: Number.isFinite(Number(steering.initialSide))
      ? (Number(steering.initialSide) < 0 ? -1 : 1)
      : null
  });
  return true;
}

function clearDebugBehaviorSteering(fish) {
  if (fish?.id && runtime.debugBehaviorSteeringByFishId) {
    runtime.debugBehaviorSteeringByFishId.delete(fish.id);
  }
}

function getDebugBehaviorFacingDirection(fish, now = Date.now()) {
  if (!fish || fish.caveState || fish.activity !== "roam") {
    return null;
  }
  const steering = getActiveDebugBehaviorSteering(fish, now);
  if (!steering || !["inspect-lure", "anticipate-food"].includes(steering.type)) {
    return null;
  }
  return Number.isFinite(Number(steering.faceDirection))
    ? (Number(steering.faceDirection) < 0 ? -1 : 1)
    : null;
}

function isDebugBehaviorSteeringBlocked(fish, species, steering, now = Date.now()) {
  if (!fish || !species || !steering || isFishDead(fish) || fish.caveState || fish.activity !== "roam") {
    return true;
  }
  if (runtime.fishDragState?.fishId === fish.id || getFishEntryProgress(fish, now) !== null) {
    return true;
  }
  const effectiveBehavior = getEffectiveFishBehavior(fish, species);
  if (effectiveBehavior === "sucker" && !steering.allowSuckerSpecial) {
    return true;
  }
  if (effectiveBehavior === "piranha" && !steering.allowPredatorSpecial) {
    return true;
  }
  return false;
}

function setDebugBehaviorSteeringIntent(fish, steering, type, cause, now = Date.now(), options = {}) {
  setFishBehaviorIntent(fish, type, cause, now, {
    targetId: options.targetId || steering.targetFishId || steering.decorId || "",
    targetName: options.targetName || steering.targetName || "",
    durationMs: options.durationMs || DEBUG_BEHAVIOR_STEER_REFRESH_MS * 5
  });
  if (options.signalType) {
    recordFishBehaviorSignal(fish, options.signalType, now, {
      debugText: options.debugText || `${type} | ${cause}`,
      cooldownMs: options.cooldownMs || BEHAVIOR_SIGNAL_COOLDOWN_MS,
      targetName: options.targetName || steering.targetName || "",
      placedDecorId: options.placedDecorId || steering.decorId || ""
    });
  }
}

function updateDebugFollowSteering(fish, species, steering, now = Date.now()) {
  const targetFish = state.fish.find((entry) => entry?.id === steering.targetFishId && !isFishDead(entry));
  if (!targetFish) {
    clearDebugBehaviorSteering(fish);
    return false;
  }
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }

  const elapsed = Math.max(0, now - (Number(steering.startedAt) || now));
  const targetDirection = getFishFacingDirection(targetFish);
  const distance = Math.hypot((fish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (fish.yNorm || 0.5) - (targetFish.yNorm || 0.5));
  const sideWobble = Math.sin(elapsed / 1100 + (fish.phase || 0) * Math.PI * 2) * 0.012;
  const verticalWobble = Math.cos(elapsed / 1350 + (fish.phase || 0) * Math.PI * 2) * 0.016;
  const leaderMoveX = (targetFish.targetXNorm || targetFish.xNorm || 0.5) - (targetFish.xNorm || 0.5);
  const leaderMoveY = (targetFish.targetYNorm || targetFish.yNorm || 0.5) - (targetFish.yNorm || 0.5);
  const leaderMoveDistance = Math.hypot(leaderMoveX, leaderMoveY);
  const leaderHeadingX = leaderMoveDistance > 0.002 ? leaderMoveX / leaderMoveDistance : targetDirection;
  const leaderHeadingY = leaderMoveDistance > 0.002 ? leaderMoveY / leaderMoveDistance : 0;
  const lookahead = leaderMoveDistance > 0.002
    ? DEBUG_BEHAVIOR_FOLLOW_LOOKAHEAD_NORM * (distance <= DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM ? 1.2 : 0.7)
    : 0;
  const trailX = (targetFish.xNorm || 0.5) - targetDirection * DEBUG_BEHAVIOR_FOLLOW_DISTANCE_NORM + sideWobble;
  const trailY = (targetFish.yNorm || 0.5) + verticalWobble;
  fish.targetXNorm = clamp(trailX + leaderHeadingX * lookahead, 0.08, 0.92);
  fish.targetYNorm = clampFishYNormToLayer(
    trailY + leaderHeadingY * lookahead,
    fish,
    species,
    getFishTankLayer(targetFish),
    { minYNorm: 0.14, maxYNorm: 0.8 }
  );
  fish.targetAt = now + 520;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  setFishDesiredTankLayer(fish, getFishTankLayer(targetFish));
  steering.distanceNorm = distance;
  steering.leaderSwimSpeed = Number(targetFish.swimSpeed) || 0;
  steering.leaderMoving = leaderMoveDistance > 0.002;
  if (species.speedMode === "dynamic") {
    const targetSpecies = getSpeciesForFish(targetFish);
    const leaderSpeed = Number(targetFish.swimSpeed) || (targetSpecies ? normalizeFishSpeed(targetSpecies) : species.speedMin);
    const catchupFactor = distance > DEBUG_BEHAVIOR_FOLLOW_CATCHUP_NORM
      ? 1.18
      : distance > DEBUG_BEHAVIOR_FOLLOW_CLOSE_NORM
        ? 1.03
        : 0.92;
    fish.swimSpeed = normalizeFishSpeed(species, leaderSpeed * catchupFactor);
  }
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "follow", "friend", now, {
    targetName: steering.targetName || getDebugFishDisplayName(targetFish),
    signalType: "follow_friend",
    debugText: `follow ${steering.targetName || getDebugFishDisplayName(targetFish)} | friend`
  });
  return true;
}

function updateDebugAvoidSteering(fish, species, steering, now = Date.now()) {
  const targetFish = state.fish.find((entry) => entry?.id === steering.targetFishId && !isFishDead(entry));
  if (!targetFish) {
    clearDebugBehaviorSteering(fish);
    return false;
  }
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }

  const distance = Math.hypot((fish.xNorm || 0.5) - (targetFish.xNorm || 0.5), (fish.yNorm || 0.5) - (targetFish.yNorm || 0.5));
  const retreatNorm = distance <= DEBUG_BEHAVIOR_AVOID_RANGE_NORM
    ? DEBUG_BEHAVIOR_AVOID_RETREAT_NORM
    : DEBUG_BEHAVIOR_AVOID_RETREAT_NORM * 0.48;
  const escape = getAvoidanceEscapeTarget(fish, species, targetFish, {
    retreatNorm,
    verticalScale: 0.72,
    cornerThreatRadius: DEBUG_BEHAVIOR_AVOID_RANGE_NORM
  });
  fish.targetXNorm = escape?.xNorm ?? fish.xNorm;
  fish.targetYNorm = escape?.yNorm ?? fish.yNorm;
  fish.targetAt = now + (escape?.cornerEscape ? 520 : 760);
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  if (escape?.targetLayer) {
    setFishDesiredTankLayer(fish, escape.targetLayer);
  }
  if (species.speedMode === "dynamic") {
    const speedBlend = distance <= DEBUG_BEHAVIOR_AVOID_RANGE_NORM ? 0.96 : 0.68;
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * speedBlend);
  }
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "avoid", "fear", now, {
    targetName: steering.targetName || getDebugFishDisplayName(targetFish),
    signalType: "avoid_specific_fish",
    debugText: `avoid ${steering.targetName || getDebugFishDisplayName(targetFish)} | fear`
  });
  return true;
}

function updateDebugLureInspectSteering(fish, species, steering, now = Date.now()) {
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }
  const decor = state.placedDecor.find((item) => item?.id === steering.decorId) || null;
  const stableScale = getViewportStableAssetScale();
  const focusXNorm = clamp(Number.isFinite(Number(steering.focusXNorm)) ? Number(steering.focusXNorm) : (decor?.xNorm ?? fish.xNorm ?? 0.5), 0.08, 0.92);
  const focusYNorm = clamp(Number.isFinite(Number(steering.focusYNorm)) ? Number(steering.focusYNorm) : (decor?.yNorm ?? fish.yNorm ?? 0.5), 0.08, 0.84);
  const elapsed = Math.max(0, now - (Number(steering.startedAt) || now));
  const initialSide = steering.initialSide || ((fish.xNorm || 0.5) <= focusXNorm ? -1 : 1);
  const side = Math.floor(elapsed / DEBUG_BEHAVIOR_LURE_SIDE_MS) % 2 === 0 ? initialSide : -initialSide;
  const faceDirection = side < 0 ? 1 : -1;
  const mouthTargetX = focusXNorm * TANK_WIDTH + side * 9 * stableScale;
  const mouthTargetY = focusYNorm * TANK_HEIGHT + Math.sin(elapsed / 1250 + (fish.phase || 0) * Math.PI) * 7 * stableScale;
  const mouthTarget = getFishTargetNormForMouthPoint(fish, species, mouthTargetX, mouthTargetY, now, {
    direction: faceDirection,
    localForwardOffsetPx: 3 * stableScale,
    minYNorm: 0.12,
    maxYNorm: 0.84
  });
  fish.targetXNorm = mouthTarget ? mouthTarget.xNorm : clamp(focusXNorm + side * 0.065, 0.08, 0.92);
  fish.targetYNorm = mouthTarget ? mouthTarget.yNorm : clamp(focusYNorm + Math.sin(elapsed / 1250) * 0.018, 0.14, 0.8);
  fish.targetAt = now + 680;
  fish.hangoutDecorId = steering.decorId || null;
  fish.hangoutZoneType = "lure";
  setFishDesiredTankLayer(fish, Number.isFinite(Number(steering.targetLayer)) ? clampTankLayer(Number(steering.targetLayer)) : getFishTankLayer(fish));
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * 0.58);
  }
  steering.faceDirection = faceDirection;
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "inspect lure", steering.cause || "curious", now, {
    signalType: "inspect_lure",
    debugText: `inspect lure | ${steering.cause || "curious"}`
  });
  return true;
}

function updateDebugAnticipateFoodSteering(fish, species, steering, now = Date.now()) {
  if (now < Number(steering.nextRefreshAt || 0) && now < Number(fish.targetAt || 0)) {
    return true;
  }
  const focusXNorm = clamp(Number(steering.foodXNorm) || fish.xNorm || 0.5, 0.08, 0.92);
  const focusYNorm = clamp(Number(steering.foodYNorm) || 0.28, 0.08, 0.7);
  const currentLayer = getFishTankLayer(fish);
  const targetYNorm = clampFishYNormToLayer(
    focusYNorm + 0.075,
    fish,
    species,
    currentLayer,
    { minYNorm: 0.14, maxYNorm: 0.62 }
  );
  fish.targetXNorm = focusXNorm;
  fish.targetYNorm = targetYNorm;
  fish.targetAt = now + 920;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  setFishDesiredTankLayer(fish, currentLayer);
  if (Math.abs(focusXNorm - (fish.xNorm || 0.5)) > FISH_DIRECTION_TARGET_DEADZONE_NORM) {
    steering.faceDirection = focusXNorm >= (fish.xNorm || 0.5) ? 1 : -1;
  } else if (!Number.isFinite(Number(steering.faceDirection))) {
    steering.faceDirection = fish.direction || 1;
  }
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin + (species.speedMax - species.speedMin) * 0.24);
  }
  steering.nextRefreshAt = now + DEBUG_BEHAVIOR_STEER_REFRESH_MS;
  setDebugBehaviorSteeringIntent(fish, steering, "anticipate food", "feeding memory", now, {
    durationMs: DEBUG_BEHAVIOR_STEER_REFRESH_MS * 5
  });
  return true;
}

function updateDebugBehaviorSteering(fish, species, now = Date.now()) {
  const steering = getActiveDebugBehaviorSteering(fish, now);
  if (!steering || isDebugBehaviorSteeringBlocked(fish, species, steering, now)) {
    return false;
  }
  switch (steering.type) {
    case "follow":
      return updateDebugFollowSteering(fish, species, steering, now);
    case "avoid":
      return updateDebugAvoidSteering(fish, species, steering, now);
    case "inspect-lure":
      return updateDebugLureInspectSteering(fish, species, steering, now);
    case "anticipate-food":
      return updateDebugAnticipateFoodSteering(fish, species, steering, now);
    default:
      return false;
  }
}

function getDebugAnticipateFoodTarget(fish, now = Date.now()) {
  const memory = sanitizeFeedingMemory(fish?.feedingMemory, now);
  let foodXNorm = Number.isFinite(Number(memory.feederXNorm)) ? memory.feederXNorm : memory.lastFoodXNorm;
  let foodYNorm = Number.isFinite(Number(memory.feederYNorm))
    ? clamp(memory.feederYNorm + 0.1, 0.12, 0.42)
    : memory.lastFoodYNorm;

  if (!Number.isFinite(Number(foodXNorm)) || !Number.isFinite(Number(foodYNorm))) {
    const activePellet = state.floatingPellets?.[0] || null;
    if (activePellet) {
      foodXNorm = activePellet.xNorm;
      foodYNorm = activePellet.yNorm;
    }
  }

  if ((!Number.isFinite(Number(foodXNorm)) || !Number.isFinite(Number(foodYNorm))) && hasAutoDispenserInstalled()) {
    const layout = getAutoDispenserLayout();
    foodXNorm = clamp((layout.nozzle.x || 0) / TANK_WIDTH, 0.08, 0.92);
    foodYNorm = clamp(((layout.nozzle.y || 0) + 58 * getViewportStableAssetScale()) / TANK_HEIGHT, 0.12, 0.42);
    memory.feederXNorm = foodXNorm;
    memory.feederYNorm = clamp((layout.nozzle.y || 0) / TANK_HEIGHT, 0.02, 0.42);
    memory.feederSeenAt = now;
  }

  if (!Number.isFinite(Number(foodXNorm)) || !Number.isFinite(Number(foodYNorm))) {
    foodXNorm = clamp(fish?.xNorm || 0.5, 0.08, 0.92);
    foodYNorm = clamp((fish?.yNorm || 0.35) - 0.08, 0.12, 0.52);
  }

  memory.lastFoodXNorm = clamp(Number(foodXNorm), 0.08, 0.92);
  memory.lastFoodYNorm = clamp(Number(foodYNorm), 0.08, 0.9);
  memory.lastFoodAt = memory.lastFoodAt || now;
  memory.updatedAt = now;
  if (fish) {
    fish.feedingMemory = memory;
  }
  return {
    foodXNorm: memory.lastFoodXNorm,
    foodYNorm: memory.lastFoodYNorm
  };
}

function triggerDebugBehaviorRefuseFood(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("refuse-food");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, { ...getDebugBehaviorScenarioOptions("refuse-food"), keepFeeding: true })) {
    return;
  }

  const existingPellet = (state.floatingPellets || []).find((pellet) => pellet && canFishTargetFoodPellet(fish, pellet, now));
  const pellet = existingPellet || {
    id: createId("debug-food-refusal"),
    foodKey: "basic",
    xNorm: clamp((fish.xNorm || 0.5) + (fish.direction || 1) * 0.08, 0.08, 0.92),
    yNorm: clamp((fish.yNorm || 0.5) + randomBetween(-0.04, 0.04), 0.14, 0.76),
    targetFishId: fish.id
  };
  recordFishFeedingMemory(fish, pellet, now);
  fish.activity = "roam";
  fish.targetXNorm = pellet.xNorm;
  fish.targetYNorm = pellet.yNorm;
  fish.targetAt = now + 1200;
  setFishBehaviorIntent(fish, "approach food", "debug refusal setup", now, {
    targetId: pellet.id,
    durationMs: 2600
  });
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  finishDebugBehaviorScenario(fish, `Debug set up ${fish.name} to approach food.`, `${fish.name} will approach food, then refuse it.`, now);

  window.setTimeout(() => {
    const targetFish = state?.fish?.find((entry) => entry?.id === fish.id) || null;
    const targetSpecies = getSpeciesForFish(targetFish);
    if (
      !isDebugModeEnabled()
      || getDebugBehaviorBlockReason(targetFish, targetSpecies, { ...getDebugBehaviorScenarioOptions("refuse-food"), allowFeeding: true })
    ) {
      return;
    }
    const refusalAt = Date.now();
    handleFishRefuseFoodPellet(targetFish, pellet, refusalAt);
    runtime.debugFishBehaviorSignatures.delete(targetFish.id);
    finishDebugBehaviorScenario(targetFish, `Debug made ${targetFish.name} refuse food.`, `${targetFish.name} refused the food.`, refusalAt);
  }, 1300);
}

function triggerDebugBehaviorAnticipateFood(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("anticipate-food");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("anticipate-food"))) {
    return;
  }

  const target = getDebugAnticipateFoodTarget(fish, now);
  setDebugBehaviorSteering(fish, {
    type: "anticipate-food",
    foodXNorm: target.foodXNorm,
    foodYNorm: target.foodYNorm,
    durationMs: DEBUG_BEHAVIOR_ANTICIPATE_FOOD_DURATION_MS
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} anticipate food.`, `${fish.name} is waiting under the remembered food spot.`, now);
}

function triggerDebugBehaviorHide(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("hide");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("hide"))) {
    return;
  }

  const cover = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["plant", "hide", "spooky"],
    force: true,
    ignoreOccupancy: true,
    lingerMultiplier: 2.6,
    preferBackLayer: true
  });
  if (!cover) {
    showToast("Add plants, caves, wrecks, or spooky decor to test hiding.");
    return;
  }

  applyBehaviorTarget(fish, species, {
    ...cover,
    intentType: "hide plant",
    intentCause: "shy + stressed",
    signalType: "hiding_more_than_usual",
    debugText: `hide ${cover.zoneType} | shy + stressed`,
    slow: true
  }, now);
  finishDebugBehaviorScenario(fish, `Debug sent ${fish.name} to hide near ${cover.zoneType}.`, `${fish.name} is hiding near cover.`, now);
}

function triggerDebugBehaviorInspectLure(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("inspect-lure");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("inspect-lure"))) {
    return;
  }

  const lure = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["lure"],
    force: true,
    ignoreOccupancy: true,
    occupancyLimit: 1,
    lingerMultiplier: 1
  });
  if (!lure) {
    showToast("Add a Fishing Lure or Gorebag to test lure inspection.");
    return;
  }

  const cause = getFishPersonality(fish) === "hunter" ? "hunter" : "curious";
  applyBehaviorTarget(fish, species, {
    ...lure,
    intentType: "inspect lure",
    intentCause: cause,
    signalType: "inspect_lure",
    debugText: `inspect lure | ${cause}`
  }, now);
  const lureDecor = state.placedDecor.find((item) => item?.id === lure.decorId) || null;
  setDebugBehaviorSteering(fish, {
    type: "inspect-lure",
    decorId: lure.decorId || "",
    focusXNorm: lureDecor?.xNorm ?? lure.xNorm,
    focusYNorm: lureDecor?.yNorm ?? lure.yNorm,
    targetLayer: lure.targetLayer,
    cause,
    initialSide: (fish.xNorm || 0.5) <= (lureDecor?.xNorm ?? lure.xNorm ?? 0.5) ? -1 : 1,
    durationMs: DEBUG_BEHAVIOR_LURE_INSPECT_DURATION_MS,
    allowPredatorSpecial: true
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug sent ${fish.name} to inspect a lure.`, `${fish.name} is inspecting the lure.`, now);
}

function triggerDebugBehaviorGuardCave(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("guard-cave");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("guard-cave"))) {
    return;
  }

  const territory = pickDecorHangoutTarget(species, fish, now, {
    allowedZoneTypes: ["hide", "hardscape"],
    force: true,
    ignoreOccupancy: true,
    occupancyLimit: 1,
    lingerMultiplier: 2,
    preferBackLayer: false
  });
  if (!territory) {
    showToast("Add a cave, arch, rock, or hardscape decor to test guarding.");
    return;
  }

  const guardedName = territory.zoneType === "hide" ? "cave" : territory.zoneType;
  applyBehaviorTarget(fish, species, {
    ...territory,
    intentType: "guard cave",
    intentCause: "territorial",
    signalType: "guard_territory",
    debugText: `guard ${guardedName} | territorial`
  }, now);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} guard ${guardedName}.`, `${fish.name} is guarding ${guardedName}.`, now);
}

function triggerDebugBehaviorFollow(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("follow");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("follow"))) {
    return;
  }

  const otherFish = getDebugRelationshipPartner(fish);
  if (!otherFish) {
    showToast("Add another living fish to test following.");
    return;
  }

  setDebugFishRelationship(fish, otherFish, "friend", now);
  const otherName = getDebugFishDisplayName(otherFish);
  applyBehaviorTarget(fish, species, {
    xNorm: clamp((otherFish.xNorm || 0.5) + randomBetween(-0.05, 0.05), 0.08, 0.92),
    yNorm: clamp((otherFish.yNorm || 0.5) + randomBetween(-0.04, 0.04), 0.14, 0.8),
    targetLayer: getFishTankLayer(otherFish),
    targetAt: now + randomBetween(4200, 7600),
    intentType: "follow",
    intentCause: "friend",
    intentTargetId: otherFish.id,
    intentTargetName: otherName,
    signalType: "follow_friend",
    debugText: `follow ${otherName} | friend`
  }, now);
  setDebugBehaviorSteering(fish, {
    type: "follow",
    targetFishId: otherFish.id,
    targetName: otherName,
    durationMs: DEBUG_BEHAVIOR_FOLLOW_DURATION_MS
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} follow ${otherName}.`, `${fish.name} is following ${otherName}.`, now);
}

function triggerDebugBehaviorAvoid(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("avoid");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("avoid"))) {
    return;
  }

  const otherFish = getDebugRelationshipPartner(fish);
  if (!otherFish) {
    showToast("Add another living fish to test avoidance.");
    return;
  }

  setDebugFishRelationship(fish, otherFish, "fear", now);
  const otherName = getDebugFishDisplayName(otherFish);
  const awayX = (fish.xNorm || 0.5) - (otherFish.xNorm || 0.5);
  const awayY = (fish.yNorm || 0.5) - (otherFish.yNorm || 0.5);
  const distance = Math.max(0.0001, Math.hypot(awayX, awayY));
  applyBehaviorTarget(fish, species, {
    xNorm: clamp((fish.xNorm || 0.5) + (awayX / distance) * 0.18, 0.08, 0.92),
    yNorm: clamp((fish.yNorm || 0.5) + (awayY / distance) * 0.12, 0.14, 0.8),
    targetLayer: getFishTankLayer(fish),
    targetAt: now + randomBetween(2800, 5600),
    intentType: "avoid",
    intentCause: "fear",
    intentTargetId: otherFish.id,
    intentTargetName: otherName,
    signalType: "avoid_specific_fish",
    debugText: `avoid ${otherName} | fear`
  }, now);
  setDebugBehaviorSteering(fish, {
    type: "avoid",
    targetFishId: otherFish.id,
    targetName: otherName,
    durationMs: DEBUG_BEHAVIOR_AVOID_DURATION_MS
  }, now);
  updateDebugBehaviorSteering(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug made ${fish.name} avoid ${otherName}.`, `${fish.name} is avoiding ${otherName}.`, now);
}

function getDebugDiseaseBehaviorCause(stateId) {
  switch (sanitizeDiseaseState(stateId)) {
    case DISEASE_STATE_INCUBATING:
      return "incubating";
    case DISEASE_STATE_EARLY:
      return "early symptoms";
    case DISEASE_STATE_VISIBLE:
      return "visible symptoms";
    case DISEASE_STATE_SEVERE:
      return "severe symptoms";
    case DISEASE_STATE_RECOVERING:
      return "recovering";
    default:
      return "hidden carrier";
  }
}

function getNextDebugDiseaseBehaviorStage(stateId) {
  switch (sanitizeDiseaseState(stateId)) {
    case DISEASE_STATE_VISIBLE:
      return DISEASE_STATE_SEVERE;
    case DISEASE_STATE_SEVERE:
      return DISEASE_STATE_RECOVERING;
    case DISEASE_STATE_RECOVERING:
      return DISEASE_STATE_VISIBLE;
    default:
      return DISEASE_STATE_VISIBLE;
  }
}

function triggerDebugBehaviorDisease(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("disease");
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("disease"))) {
    return;
  }
  const currentState = sanitizeDiseaseState(fish.diseaseState);
  const nextState = getNextDebugDiseaseBehaviorStage(currentState);
  setSelectedFishDiseaseStageForDebug(fish, nextState, now);

  const target = pickDiseaseBehaviorTarget(fish, species, now)
    || pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hide", "plant", "hardscape", "spooky", "bubbler"],
      force: true,
      ignoreOccupancy: true,
      preferBackLayer: true,
      lingerMultiplier: 2
    })
    || {
      xNorm: clamp((fish.xNorm || 0.5) + randomBetween(-0.12, 0.12), 0.1, 0.9),
      yNorm: nextState === DISEASE_STATE_SEVERE ? randomBetween(0.18, 0.28) : randomBetween(0.36, 0.72),
      targetLayer: getFishTankLayer(fish),
      targetAt: now + randomBetween(5200, 11000),
      signal: nextState === DISEASE_STATE_SEVERE ? "surface_hover" : "hiding_more_than_usual"
    };
  applyDiseaseBehaviorTarget(fish, species, {
    ...target,
    hangoutDecorId: target.hangoutDecorId || target.decorId || null,
    hangoutZoneType: target.hangoutZoneType || target.zoneType || null,
    signal: target.signal || (target.zoneType === "bubbler" ? "lingering_near_bubbler" : "hiding_more_than_usual")
  }, now);

  const cause = getDebugDiseaseBehaviorCause(nextState);
  setFishBehaviorIntent(fish, "disease isolate", cause, now, { durationMs: BEHAVIOR_INTENT_LINGER_MS });
  recordFishBehaviorSignal(fish, target.signal || "hiding_more_than_usual", now, {
    debugText: `disease isolate | ${cause}`
  });
  finishDebugBehaviorScenario(fish, `Debug advanced ${fish.name} illness to ${nextState}.`, `${fish.name} disease behavior: ${nextState}.`, now);
}

function triggerDebugBehaviorClear(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("clear");
  if (!selection) {
    return;
  }
  const { fish } = selection;
  fish.behaviorIntent = null;
  fish.behaviorSignals = {};
  fish.foodRefusalUntil = 0;
  clearDebugBehaviorSteering(fish);
  if (getDebugForcedOtocinclusState(fish, getSpeciesForFish(fish))) {
    setDebugOtocinclusForcedState(fish, "normal", now);
  }
  if (!fish.caveState && fish.activity === "roam") {
    fish.hangoutDecorId = null;
    fish.hangoutZoneType = null;
    fish.targetAt = now;
  }
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  finishDebugBehaviorScenario(fish, `Debug cleared forced behavior for ${fish.name}.`, `${fish.name} behavior debug cleared.`, now);
}

function triggerDebugOtocinclusState(forcedState, now = Date.now()) {
  const action = forcedState === "back"
    ? "oto-back"
    : forcedState === "swim"
      ? "oto-swim"
      : forcedState === "front"
        ? "oto-front"
        : "oto-normal";
  const selection = getDebugBehaviorSelectedFishOrToast(action);
  if (!selection) {
    return;
  }
  const { fish, species } = selection;
  if (species?.id !== "otocinclus" || getEffectiveFishBehavior(fish, species) !== "sucker") {
    showToast("Select an Otocinclus / Dwarf Sucker Catfish first.");
    return;
  }
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions(action))) {
    return;
  }

  setDebugOtocinclusForcedState(fish, forcedState, now);
  const label = forcedState === "back"
    ? "back glass"
    : forcedState === "front"
      ? "front glass"
      : forcedState === "swim"
        ? "free swimming"
        : "normal behavior";
  finishDebugBehaviorScenario(
    fish,
    `Debug set ${fish.name} Otocinclus state to ${label}.`,
    `${fish.name}: ${label}.`,
    now
  );
}


function getDebugSpeciesSignatureAvailability(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  const key = getFishSignatureBehaviorKey(species);
  if (!key && species?.id !== "betta") {
    return { enabled: false, reason: "this species has no dedicated signature-behavior scenario yet" };
  }
  if (species?.id === "seahorse" && !getBehaviorDecorCandidates(/seaweed|kelp|plant|moss|coral|driftwood|root/).length) {
    return { enabled: false, reason: "add plant, seaweed, coral, driftwood, or root decor for a perch" };
  }
  if (species?.id === "pencilfish") {
    const partner = state.fish.find((entry) => entry && entry.id !== fish.id && !isFishDead(entry) && entry.speciesId === "pencilfish");
    if (!partner) return { enabled: false, reason: "add a second living Pencilfish" };
  }
  if (species?.id === "betta") {
    const rival = state.fish.find((entry) => entry && entry.id !== fish.id && !isFishDead(entry) && entry.speciesId === "betta");
    if (!rival) return { enabled: false, reason: "add a second living Betta" };
  }
  if (species?.id === "angelfish") {
    if (!isFishAdult(fish, now)) return { enabled: false, reason: "Angelfish territorial behavior begins at adulthood" };
    if (!getFishResidenceDecorId(fish) && !hasDebugDecorHangoutZone(["hide", "hardscape"])) {
      return { enabled: false, reason: "assign a home or add a cave/hardscape" };
    }
  }
  if (species?.id === "blue-ram" && !isFishAdult(fish, now)) {
    return { enabled: false, reason: "Blue Ram breeding territory behavior requires an adult fish" };
  }
  if (species?.id === "pilot-fish") {
    const companion = state.fish.find((entry) => entry && !isFishDead(entry) && ["bull-shark", "great-white-shark", "hammerhead-shark", "orca"].includes(entry.speciesId));
    if (!companion) return { enabled: false, reason: "add a living shark or Orca" };
  }
  return { enabled: true, reason: "" };
}

function triggerDebugSpeciesSignatureBehavior(now = Date.now()) {
  const selection = getDebugBehaviorSelectedFishOrToast("species-signature");
  if (!selection) return;
  const { fish, species } = selection;
  const availability = getDebugSpeciesSignatureAvailability(fish, species, now);
  if (!availability.enabled) {
    showToast(`Cannot test species AI: ${availability.reason}.`);
    return;
  }
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions("species-signature"))) {
    return;
  }

  let target = null;
  if (species.id === "betta") {
    const rival = state.fish.find((entry) => entry && entry.id !== fish.id && !isFishDead(entry) && entry.speciesId === "betta") || null;
    if (rival) {
      setDebugFishRelationship(fish, rival, "rival", now);
      setDebugFishRelationship(rival, fish, "rival", now);
      const relationships = sanitizeFishRelationships(fish.relationships);
      const nearbyAll = state.fish
        .filter((entry) => entry && entry.id !== fish.id && !isFishDead(entry))
        .map((entry) => ({
          fish: entry,
          relation: relationships[entry.id],
          distance: Math.hypot((fish.xNorm || 0.5) - (entry.xNorm || 0.5), (fish.yNorm || 0.5) - (entry.yNorm || 0.5))
        }))
        .sort((left, right) => left.distance - right.distance);
      fish.bettaRivalCooldownUntil = 0;
      fish.bettaRivalYieldUntil = 0;
      rival.bettaRivalCooldownUntil = 0;
      rival.bettaRivalYieldUntil = 0;
      target = pickBettaRivalBehaviorTarget(fish, species, relationships, nearbyAll, now, { force: true });
    }
  } else if (species.id === "angelfish") {
    if (!getFishResidenceDecorId(fish)) {
      const zone = getCachedDecorHangoutZones().find((entry) => ["hide", "hardscape"].includes(entry.type)) || null;
      if (zone) fish.residenceDecorId = zone.decorId;
    }
    target = pickAngelfishTerritoryBehaviorTarget(fish, species, now, { force: true });
  } else if (species.id === "blue-ram") {
    let egg = getBlueRamGuardedEgg(fish);
    if (!egg) {
      egg = createFishEggRecord("blue-ram", now, {
        xNorm: clamp((fish.xNorm || 0.5) + 0.035, 0.12, 0.88),
        yNorm: clamp((fish.yNorm || 0.6) + 0.08, 0.24, 0.84),
        tankLayer: getFishTankLayer(fish),
        parentNames: [fish.name],
        parentIds: [fish.id]
      });
      if (egg) addFishEggToTank(egg);
    }
    target = pickBlueRamTerritoryBehaviorTarget(fish, species, now);
  } else {
    target = pickSpeciesSignatureBehaviorTarget(fish, species, now, { force: true });
  }

  if (!target || !applyBehaviorTarget(fish, species, target, now)) {
    showToast(`${species.name || fish.name} has no available signature behavior target right now.`);
    return;
  }
  fish.behaviorNextThinkAt = 0;
  finishDebugBehaviorScenario(
    fish,
    `Debug forced ${fish.name} signature behavior: ${target.intentType || getFishSignatureBehaviorKey(species)}.`,
    `${fish.name}: ${target.intentType || "signature behavior"}.`,
    now
  );
}

function triggerDebugPufferInflation(mode, now = Date.now()) {
  const action = mode === "deflate" ? "puffer-deflate" : mode === "taps" ? "puffer-taps" : "puffer-inflate";
  const selection = getDebugBehaviorSelectedFishOrToast(action);
  if (!selection) return;
  const { fish, species } = selection;
  if (species?.id !== "pufferfish") {
    showToast("Select a Pufferfish first.");
    return;
  }
  if (!prepareFishForDebugBehavior(fish, species, now, getDebugBehaviorScenarioOptions(action))) {
    return;
  }

  if (mode === "deflate") {
    if (!isPufferPuffVisualActive(fish, now)) {
      showToast(`${fish.name} is not inflated.`);
      return;
    }
    fish.pufferInflatedUntil = now;
    fish.pufferWobbleUntil = Math.min(Number(fish.pufferWobbleUntil) || now, now);
    fish.pufferRiseUntil = Math.min(Number(fish.pufferRiseUntil) || now, now);
    fish.targetAt = now + getPufferDeflationDurationMs();
    finishDebugBehaviorScenario(fish, `Debug started ${fish.name} deflation.`, `${fish.name}: deflation started.`, now);
    return;
  }

  clearPufferInflationState(fish, { clearCooldown: true });
  if (mode === "taps") {
    const tapStates = runtime.pufferRapidTapByFishId || (runtime.pufferRapidTapByFishId = new Map());
    tapStates.set(fish.id, { startedAt: now - 900, count: getPufferRapidTapGuaranteedCount() - 1, lastTapAt: now - 80 });
    recordPufferRapidGlassTap(fish, species, now);
    finishDebugBehaviorScenario(fish, `Debug simulated twelve rapid glass taps near ${fish.name}.`, `${fish.name}: 12-tap harassment test.`, now);
    return;
  }

  startPufferInflation(fish, species, now);
  finishDebugBehaviorScenario(fish, `Debug forced ${fish.name} to inflate.`, `${fish.name}: puffed.`, now);
}

function triggerDebugBehaviorScenario(action) {
  if (!isDebugModeEnabled()) {
    return;
  }
  switch (action) {
    case "refuse-food":
      triggerDebugBehaviorRefuseFood();
      break;
    case "anticipate-food":
      triggerDebugBehaviorAnticipateFood();
      break;
    case "hide":
      triggerDebugBehaviorHide();
      break;
    case "inspect-lure":
      triggerDebugBehaviorInspectLure();
      break;
    case "guard-cave":
      triggerDebugBehaviorGuardCave();
      break;
    case "follow":
      triggerDebugBehaviorFollow();
      break;
    case "avoid":
      triggerDebugBehaviorAvoid();
      break;
    case "disease":
      triggerDebugBehaviorDisease();
      break;
    case "species-signature":
      triggerDebugSpeciesSignatureBehavior();
      break;
    case "puffer-inflate":
      triggerDebugPufferInflation("inflate");
      break;
    case "puffer-deflate":
      triggerDebugPufferInflation("deflate");
      break;
    case "puffer-taps":
      triggerDebugPufferInflation("taps");
      break;
    case "oto-back":
      triggerDebugOtocinclusState("back");
      break;
    case "oto-swim":
      triggerDebugOtocinclusState("swim");
      break;
    case "oto-front":
      triggerDebugOtocinclusState("front");
      break;
    case "oto-normal":
      triggerDebugOtocinclusState("normal");
      break;
    case "clear":
      triggerDebugBehaviorClear();
      break;
    default:
      showToast("Unknown behavior debug scenario.");
  }
}

function getDebugFishSwimPresetForPreviewBehavior(behaviorId) {
  const mapping = {
    "swim-preset-sleepy": "sleepy",
    "swim-preset-chill": "chill",
    "swim-preset-regular": "regular",
    "swim-preset-active": "active",
    "swim-preset-feeding": "feeding",
    "swim-preset-zoomies": "zoomies",
    "swim-preset-scared": "scared",
    "swim-preset-panicked": "panicked",
    swim: "regular",
    "feeding-swim": "feeding",
    panic: "panicked",
    rest: "sleepy",
    sleep: "sleepy",
    zoomies: "zoomies",
    avoid: "scared"
  };
  return mapping[String(behaviorId || "")] || "";
}

function getDebugFishBehaviorPreviewOption(behaviorId = runtime.debugFishBehaviorPreviewBehaviorId) {
  return DEBUG_FISH_BEHAVIOR_PREVIEW_OPTIONS.find((entry) => entry.id === behaviorId)
    || DEBUG_FISH_BEHAVIOR_PREVIEW_OPTIONS[0];
}

function getDebugFishBehaviorPreviewCycleMs(behaviorId, fish, species) {
  if (behaviorId === "turn-around") {
    return Math.max(900, Number(fish?.debugPreviewTurnDurationMs) || getFishTurnDurationMs(fish, species)) + 720;
  }
  if (behaviorId === "death-animation") {
    return 5600;
  }
  if (["rest", "sleep", "hangout", "sick", "dead", "sucker-back-glass", "sucker-front-glass", "sucker-free-swim", "surface-breathe"].includes(behaviorId)) {
    return 4200;
  }
  if (behaviorId === "puffer-deflating") return getPufferDeflationDurationMs();
  if (behaviorId === "puffer-inflated") return getPufferInflationWobbleMs();
  if (["zoomies", "avoid", "zombie-attack"].includes(behaviorId)) {
    return behaviorId === "zombie-attack" ? 2400 : 1550;
  }
  return 2800;
}

function populateDebugFishBehaviorPreviewControls() {
  const fishSelect = dom.debugFishBehaviorPreviewSpecies;
  const behaviorSelect = dom.debugFishBehaviorPreviewBehavior;
  if (!fishSelect || !behaviorSelect) {
    return;
  }

  const catalog = runtime.fishCatalog
    .filter((species) => species?.id && species?.name)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  fishSelect.innerHTML = catalog
    .map((species) => `<option value="${escapeHtml(species.id)}">${escapeHtml(species.name)}</option>`)
    .join("");
  behaviorSelect.innerHTML = DEBUG_FISH_BEHAVIOR_PREVIEW_OPTIONS
    .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`)
    .join("");

  const selectedFish = getManagedFishById(runtime.selectedFishId)?.fish || null;
  const preferredSpeciesId = runtime.debugFishBehaviorPreviewSpeciesId
    || selectedFish?.speciesId
    || catalog[0]?.id
    || "";
  runtime.debugFishBehaviorPreviewSpeciesId = runtime.fishMap.has(preferredSpeciesId)
    ? preferredSpeciesId
    : (catalog[0]?.id || "");
  fishSelect.value = runtime.debugFishBehaviorPreviewSpeciesId;
  behaviorSelect.value = getDebugFishBehaviorPreviewOption()?.id || "swim";
}

function createDebugFishBehaviorPreviewFish(speciesId) {
  const species = runtime.fishMap.get(speciesId);
  if (!species) {
    return null;
  }
  const fish = createFishRecord(speciesId, {
    id: `debug-preview-${speciesId}`,
    name: species.name,
    xNorm: 0.5,
    yNorm: 0.5,
    targetXNorm: 0.72,
    targetYNorm: 0.5,
    direction: 1,
    tankLayer: DEFAULT_TANK_LAYER,
    desiredTankLayer: DEFAULT_TANK_LAYER,
    now: Date.now()
  });
  if (!fish) {
    return null;
  }
  fish.phase = 0.17;
  fish.activity = "roam";
  fish.motionLevel = 0.55;
  fish.swimSpeed = Math.max(0.02, Number(species.speedMin) || 0.025);
  fish.entryStartedAt = 0;
  fish.entryDurationMs = 0;
  fish.entryFromYNorm = null;
  fish.turnStartedAt = 0;
  fish.turnDurationMs = 0;
  fish.turnFromDirection = 1;
  fish.turnToDirection = -1;
  fish.debugPreviewTurnDurationMs = getFishTurnDurationMs(fish, species);
  fish.direction = 1;
  fish.deadAt = null;
  fish.healthUnits = getSpeciesMaxHealthUnits(species);
  return fish;
}

function getDebugFishBehaviorPreviewAssetPaths(fish, species, now = Date.now()) {
  const paths = [
    getFishDisplayAssetPath(fish, species, now),
    species?.asset,
    species?.fallbackAsset
  ];
  if (species?.behavior === "sucker") {
    paths.push(
      getSuckerFishViewAssetPath(species, fish, "back"),
      getSuckerFishViewAssetPath(species, fish, "front"),
      getSuckerFishViewAssetPath(species, fish, "swim")
    );
  }
  if (species?.id === "pufferfish") paths.push(getPufferInflatedDisplayAssetPath(fish, species));
  return [...new Set(paths.filter(Boolean))];
}

function resetDebugFishBehaviorPreview() {
  const speciesId = runtime.debugFishBehaviorPreviewSpeciesId;
  const species = runtime.fishMap.get(speciesId);
  runtime.debugFishBehaviorPreviewStartedAt = performance.now();
  runtime.debugFishBehaviorPreviewFish = createDebugFishBehaviorPreviewFish(speciesId);
  if (!species || !runtime.debugFishBehaviorPreviewFish) {
    if (dom.debugFishBehaviorPreviewStatus) {
      dom.debugFishBehaviorPreviewStatus.textContent = "Fish unavailable";
    }
    return;
  }

  const option = getDebugFishBehaviorPreviewOption();
  if (dom.debugFishBehaviorPreviewDescription) {
    dom.debugFishBehaviorPreviewDescription.textContent = option?.description || "";
  }
  if (dom.debugFishBehaviorPreviewStatus) {
    dom.debugFishBehaviorPreviewStatus.textContent = `Loading ${species.name}…`;
  }
  const token = ++runtime.debugFishBehaviorPreviewLoadToken;
  void preloadImages(getDebugFishBehaviorPreviewAssetPaths(runtime.debugFishBehaviorPreviewFish, species), {
    maxAttempts: 2,
    timeoutMs: 8000,
    retryDelayMs: 300
  }).then(() => {
    if (token !== runtime.debugFishBehaviorPreviewLoadToken || !runtime.debugFishBehaviorPreviewOpen) {
      return;
    }
    if (dom.debugFishBehaviorPreviewStatus) {
      dom.debugFishBehaviorPreviewStatus.textContent = `${species.name} · ${option?.label || "Preview"}`;
    }
  });
}

function openDebugFishBehaviorPreview() {
  if (!isDebugModeEnabled() || !dom.debugFishBehaviorPreview) {
    return;
  }
  populateDebugFishBehaviorPreviewControls();
  runtime.debugFishBehaviorPreviewOpen = true;
  runtime.debugSidebarOpen = false;
  dom.debugFishBehaviorPreview.hidden = false;
  document.body.classList.add("debug-fish-behavior-preview-open");
  resetDebugFishBehaviorPreview();
  if (!runtime.debugFishBehaviorPreviewFrame) {
    runtime.debugFishBehaviorPreviewFrame = requestAnimationFrame(renderDebugFishBehaviorPreviewFrame);
  }
  dom.debugFishBehaviorPreviewSpecies?.focus();
  renderUi(Date.now(), { full: false });
}

function closeDebugFishBehaviorPreview() {
  runtime.debugFishBehaviorPreviewOpen = false;
  runtime.debugFishBehaviorPreviewLoadToken += 1;
  runtime.debugFishBehaviorPreviewFish = null;
  if (runtime.debugFishBehaviorPreviewFrame) {
    cancelAnimationFrame(runtime.debugFishBehaviorPreviewFrame);
    runtime.debugFishBehaviorPreviewFrame = 0;
  }
  if (dom.debugFishBehaviorPreview) {
    dom.debugFishBehaviorPreview.hidden = true;
  }
  document.body.classList.remove("debug-fish-behavior-preview-open");
  dom.debugFishBehaviorPreviewButton?.focus();
}

function setDebugFishBehaviorPreviewSpecies(speciesId) {
  if (!runtime.fishMap.has(speciesId)) {
    return;
  }
  runtime.debugFishBehaviorPreviewSpeciesId = speciesId;
  resetDebugFishBehaviorPreview();
}

function setDebugFishBehaviorPreviewBehavior(behaviorId) {
  const option = getDebugFishBehaviorPreviewOption(behaviorId);
  runtime.debugFishBehaviorPreviewBehaviorId = option.id;
  if (dom.debugFishBehaviorPreviewBehavior) {
    dom.debugFishBehaviorPreviewBehavior.value = option.id;
  }
  resetDebugFishBehaviorPreview();
}

function getDebugFishBehaviorPreviewPose(behaviorId, phase) {
  const angle = phase * Math.PI * 2;
  let tilt = Math.sin(angle) * 0.035;
  let wiggle = Math.sin(angle * 2) * 0.55;
  let bodyScaleX = 1 - Math.abs(wiggle) * 0.018;
  let bodyScaleY = 1 + Math.abs(wiggle) * 0.014;
  let swayX = 0;
  let swayY = 0;
  let alpha = 1;
  let filterMode = "normal";

  switch (behaviorId) {
    case "eat": {
      const bite = Math.pow(Math.max(0, Math.sin(angle * 2)), 5);
      tilt = -0.12 + Math.sin(angle) * 0.08;
      wiggle = Math.sin(angle * 2) * 0.38;
      bodyScaleX = 1 - bite * 0.08;
      bodyScaleY = 1 + bite * 0.11;
      swayX = Math.sin(angle) * 8;
      break;
    }
    case "waitfood":
      tilt = -0.18 + Math.sin(angle) * 0.025;
      wiggle *= 0.28;
      bodyScaleX = 0.99;
      bodyScaleY = 1.015;
      break;
    case "rest":
      tilt = Math.sin(angle) * 0.012;
      wiggle *= 0.12;
      bodyScaleX = 1 + Math.sin(angle) * 0.006;
      bodyScaleY = 1 - Math.sin(angle) * 0.006;
      break;
    case "sleep":
      tilt = 0.11 + Math.sin(angle) * 0.009;
      wiggle *= 0.055;
      bodyScaleX = 1 + Math.sin(angle) * 0.004;
      bodyScaleY = 0.985 - Math.sin(angle) * 0.004;
      alpha = 0.86;
      break;
    case "zoomies":
      tilt = Math.sin(angle) * 0.17;
      wiggle = Math.sin(angle * 3) * 1.15;
      bodyScaleX = 1.08 - Math.abs(wiggle) * 0.035;
      bodyScaleY = 0.94 + Math.abs(wiggle) * 0.028;
      swayX = Math.sin(angle * 2) * 18;
      break;
    case "greet":
      tilt = -Math.pow(Math.max(0, Math.sin(angle * 2)), 3) * 0.22;
      wiggle *= 0.34;
      swayX = Math.sin(angle) * 5;
      break;
    case "hangout":
      tilt = Math.sin(angle) * 0.045;
      wiggle *= 0.36;
      swayX = Math.sin(angle) * 10;
      break;
    case "play":
      tilt = Math.sin(angle) * 0.25;
      wiggle = Math.sin(angle * 2) * 0.9;
      bodyScaleX = 1 - Math.max(0, Math.sin(angle)) * 0.08;
      bodyScaleY = 1 + Math.max(0, Math.sin(angle)) * 0.1;
      swayX = Math.sin(angle * 2) * 9;
      break;
    case "pebble": {
      const search = phase < 0.55 ? Math.sin((phase / 0.55) * Math.PI) : 0;
      tilt = search * 0.62 - Math.max(0, (phase - 0.55) / 0.45) * 0.18;
      wiggle *= 0.24;
      bodyScaleX = 0.98;
      bodyScaleY = 1.04;
      break;
    }
    case "dig":
      tilt = 0.76 + Math.sin(angle * 3) * 0.055;
      wiggle = Math.sin(angle * 4) * 0.32;
      bodyScaleX = 0.96 + Math.sin(angle * 3) * 0.02;
      bodyScaleY = 1.06 - Math.sin(angle * 3) * 0.02;
      break;
    case "avoid": {
      const recoil = Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 0.7);
      tilt = -0.2 * recoil;
      wiggle = Math.sin(angle * 3) * recoil;
      bodyScaleX = 1 - recoil * 0.12;
      bodyScaleY = 1 + recoil * 0.09;
      swayX = -recoil * 24;
      break;
    }
    case "zombie-attack": {
      const lunge = Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 0.55);
      const bite = Math.pow(Math.max(0, Math.sin(angle * 2)), 7);
      tilt = Math.sin(angle * 1.3) * 0.09 - bite * 0.08;
      wiggle = Math.sin(angle * 3.2) * (0.7 + lunge * 0.65);
      bodyScaleX = 1.02 + lunge * 0.08 - bite * 0.07;
      bodyScaleY = 0.98 - lunge * 0.035 + bite * 0.08;
      swayX = lunge * 34;
      swayY = Math.sin(angle) * 3;
      break;
    }
    case "breed":
      tilt = Math.sin(angle * 2) * 0.12;
      wiggle = Math.sin(angle * 3) * 0.72;
      bodyScaleX = 0.99;
      bodyScaleY = 1.02;
      swayX = Math.sin(angle) * 12;
      break;
    case "hide":
      tilt = 0.08 + Math.sin(angle) * 0.025;
      wiggle *= 0.16;
      bodyScaleX = 0.88 + Math.sin(angle) * 0.015;
      bodyScaleY = 0.94;
      alpha = 0.76;
      break;
    case "inspect":
      tilt = Math.sin(angle * 2) * 0.09;
      wiggle *= 0.18;
      bodyScaleX = 0.98 + Math.sin(angle) * 0.018;
      bodyScaleY = 1.02 - Math.sin(angle) * 0.018;
      swayX = Math.sin(angle) * 4;
      break;
    case "sick":
      tilt = 0.13 + Math.sin(angle) * 0.045;
      wiggle = Math.sin(angle * 0.7) * 0.16;
      bodyScaleX = 0.97 + Math.sin(angle) * 0.008;
      bodyScaleY = 1.02;
      swayX = Math.sin(angle * 0.5) * 3;
      filterMode = "sick";
      break;
    case "death-animation": {
      const deathStart = 0.12;
      const transitionEnd = 0.58;
      const riseStart = 0.30;
      const riseEnd = 0.88;
      const transitionProgress = clamp((phase - deathStart) / Math.max(0.001, transitionEnd - deathStart), 0, 1);
      const transitionEase = typeof getDeadFishTransitionEase === "function"
        ? getDeadFishTransitionEase(transitionProgress)
        : transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
      const livingMotion = 1 - transitionEase;
      const riseProgress = clamp((phase - riseStart) / Math.max(0.001, riseEnd - riseStart), 0, 1);
      const riseEase = riseProgress * riseProgress * (3 - 2 * riseProgress);
      tilt = Math.PI * transitionEase;
      wiggle = Math.sin(angle * 1.4) * 0.55 * livingMotion;
      bodyScaleX = 1 - Math.abs(wiggle) * 0.018;
      bodyScaleY = 1 + Math.abs(wiggle) * 0.014;
      swayX = Math.sin(angle * 0.55) * 2.2 * riseEase;
      swayY = -46 * riseEase + (phase > riseEnd ? Math.sin(angle * 0.56) * 0.9 : 0);
      filterMode = phase >= deathStart ? "dead" : "normal";
      break;
    }
    case "dead":
      // Dead Fish Phase 24: preview the same nearly-still surface language as
      // gameplay—upside down, no swim wiggle, tiny angle sway, slow drift.
      tilt = Math.PI + Math.sin(angle * 0.56) * 0.012;
      wiggle = 0;
      bodyScaleX = 1;
      bodyScaleY = 1;
      swayX = Math.sin(angle * 0.28) * 1.6;
      swayY = Math.sin(angle * 0.56) * 0.9;
      filterMode = "dead";
      break;
    default:
      break;
  }

  return { tilt, wiggle, bodyScaleX, bodyScaleY, swayX, swayY, alpha, filterMode };
}

function resizeDebugFishBehaviorPreviewCanvas(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width);
  const cssHeight = Math.max(1, rect.height);
  const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.round(cssWidth * pixelRatio);
  const height = Math.round(cssHeight * pixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { width: cssWidth, height: cssHeight };
}

function renderDebugFishBehaviorPreviewFrame(frameNow) {
  runtime.debugFishBehaviorPreviewFrame = 0;
  if (!runtime.debugFishBehaviorPreviewOpen || !dom.debugFishBehaviorPreviewCanvas) {
    return;
  }

  const canvas = dom.debugFishBehaviorPreviewCanvas;
  const context = canvas.getContext("2d");
  const fish = runtime.debugFishBehaviorPreviewFish;
  const species = runtime.fishMap.get(runtime.debugFishBehaviorPreviewSpeciesId);
  if (!context || !fish || !species) {
    runtime.debugFishBehaviorPreviewFrame = requestAnimationFrame(renderDebugFishBehaviorPreviewFrame);
    return;
  }

  const viewport = resizeDebugFishBehaviorPreviewCanvas(canvas, context);
  context.clearRect(0, 0, viewport.width, viewport.height);
  const behaviorId = getDebugFishBehaviorPreviewOption()?.id || "swim";
  const cycleMs = getDebugFishBehaviorPreviewCycleMs(behaviorId, fish, species);
  const elapsed = Math.max(0, frameNow - runtime.debugFishBehaviorPreviewStartedAt);
  const cycleElapsed = elapsed % cycleMs;
  let phase = clamp(cycleElapsed / cycleMs, 0, 1);
  const renderNow = Date.now();
  const pose = getDebugFishBehaviorPreviewPose(behaviorId, phase);
  const previewSwimPreset = getDebugFishSwimPresetForPreviewBehavior(behaviorId);

  fish.deadAt = null;
  fish.healthUnits = getSpeciesMaxHealthUnits(species);
  clearPufferInflationState(fish, { clearCooldown: true });
  delete fish.suckerFreeSwimUntil;
  delete fish.whaleBreathState;
  fish.turnStartedAt = 0;
  fish.turnDurationMs = 0;
  fish.direction = 1;
  fish.wiggleClock = elapsed / 1000 * 2.6;
  if (previewSwimPreset) {
    fish.debugSwimAnimationPreset = previewSwimPreset;
    fish.motionLevel = 0.9;
    fish.targetXNorm = 0.76;
    fish.targetYNorm = 0.5;
    pose.tilt = 0;
    pose.wiggle = 0;
    pose.bodyScaleX = 1;
    pose.bodyScaleY = 1;
    pose.swayX = 0;
    pose.swayY = 0;
  } else {
    delete fish.debugSwimAnimationPreset;
  }
  if (behaviorId === "sick") {
    fish.healthUnits = 1;
  } else if (behaviorId === "death-animation") {
    const deathStarted = phase >= 0.12;
    fish.healthUnits = deathStarted ? 0 : getSpeciesMaxHealthUnits(species);
    fish.deadAt = deathStarted ? renderNow - Math.max(0, (phase - 0.12) * cycleMs) : null;
  } else if (behaviorId === "dead") {
    fish.healthUnits = 0;
    fish.deadAt = renderNow - 1000;
  }
  if (behaviorId === "puffer-inflated" && species.id === "pufferfish") {
    fish.pufferInflatedAt = renderNow - cycleElapsed;
    fish.pufferInflatedUntil = renderNow + Math.max(1, cycleMs - cycleElapsed);
    fish.pufferWobbleUntil = renderNow + Math.max(1, cycleMs - cycleElapsed);
  } else if (behaviorId === "puffer-deflating" && species.id === "pufferfish") {
    fish.pufferInflatedUntil = renderNow - cycleElapsed;
    fish.pufferInflatedAt = fish.pufferInflatedUntil - getPufferInflationMinDurationMs();
  } else if (behaviorId === "sucker-back-glass" && species.behavior === "sucker") {
    fish.tankLayer = SUCKER_FISH_BACK_GLASS_LAYER;
    fish.desiredTankLayer = SUCKER_FISH_BACK_GLASS_LAYER;
  } else if (behaviorId === "sucker-front-glass" && species.behavior === "sucker") {
    fish.tankLayer = SUCKER_FISH_FRONT_GLASS_LAYER;
    fish.desiredTankLayer = SUCKER_FISH_FRONT_GLASS_LAYER;
  } else if (behaviorId === "sucker-free-swim" && species.behavior === "sucker") {
    fish.suckerFreeSwimUntil = renderNow + cycleMs;
  } else if (behaviorId === "surface-breathe" && isWhaleFish(species)) {
    fish.activity = WHALE_BREATH_ACTIVITY;
    fish.whaleBreathState = phase < 0.62 ? "ascending" : "surface";
    fish.yNorm = phase < 0.62 ? 0.38 - phase * 0.34 : getWhaleBreathSurfaceYNorm(fish, species);
  }

  let turnActive = false;
  if (behaviorId === "turn-around") {
    fish.turnAnimationMode = (typeof areSimpleTurnAnimationsForced === "function" && areSimpleTurnAnimationsForced())
      ? "simple"
      : getConfiguredFishTurnAnimationMode(species);
    const durationMs = Math.max(120, Number(fish.debugPreviewTurnDurationMs) || getFishTurnDurationMs(fish, species, fish.turnAnimationMode));
    phase = clamp(cycleElapsed / durationMs, 0, 1);
    turnActive = cycleElapsed <= durationMs;
    fish.turnDurationMs = durationMs;
    fish.turnStartedAt = renderNow - phase * durationMs;
    fish.turnFromDirection = 1;
    fish.turnToDirection = -1;
    fish.turnSpinDirection = -1;
    fish.direction = -1;
  }

  const imagePath = getFishDisplayAssetPath(fish, species, renderNow) || species.asset;
  const sourceImage = runtime.images.get(imagePath);
  if (!isUsableRuntimeImage(sourceImage)) {
    requestRuntimeImageRecovery(imagePath, { kind: "fish-preview", id: fish.id, speciesId: species.id });
    if (dom.debugFishBehaviorPreviewStatus) {
      dom.debugFishBehaviorPreviewStatus.textContent = `Loading ${species.name}…`;
    }
    runtime.debugFishBehaviorPreviewFrame = requestAnimationFrame(renderDebugFishBehaviorPreviewFrame);
    return;
  }

  const renderImage = getFishTintedImage(imagePath, sourceImage, fish);
  const aspect = sourceImage.height / Math.max(1, sourceImage.width);
  const maxWidth = viewport.width * 0.7;
  const maxHeight = viewport.height * 0.62;
  const drawWidth = Math.max(70, Math.min(maxWidth, maxHeight / Math.max(0.08, aspect)));
  const drawHeight = drawWidth * aspect;
  const drawX = -drawWidth / 2 + (previewSwimPreset ? 0 : pose.wiggle * drawWidth * 0.018);
  const healthRatio = getFishHealthRatio(fish, species);
  const fishFilter = getFishCanvasFilter(fish, healthRatio, renderNow, behaviorId === "sick" ? 0.25 : 1);

  const previewTurnMode = behaviorId === "turn-around"
    ? getFishTurnAnimationMode(fish, species)
    : "simple";
  const simpleTurnAmount = behaviorId === "turn-around" && turnActive && previewTurnMode === "simple"
    ? Math.sin(phase * Math.PI)
    : 0;
  const simpleTurnDirection = phase < 0.5 ? 1 : -1;
  const simpleTurnScaleX = 1 - simpleTurnAmount * (1 - FISH_TURN_MIN_SCALE_X);
  const simpleTurnScaleY = 1 + simpleTurnAmount * (FISH_TURN_MAX_SCALE_Y - 1);
  const simpleTurnLean = behaviorId === "turn-around" && turnActive && previewTurnMode === "simple"
    ? -simpleTurnAmount * 0.14
    : 0;
  const simpleTurnSway = behaviorId === "turn-around" && turnActive && previewTurnMode === "simple"
    ? -simpleTurnAmount * 0.8
    : 0;

  context.save();
  context.translate(viewport.width / 2 + pose.swayX + simpleTurnSway, viewport.height / 2 + (Number(pose.swayY) || 0));
  context.rotate(pose.tilt + simpleTurnLean);
  context.scale(behaviorId === "turn-around"
    ? (previewTurnMode === "simple" ? simpleTurnDirection : 1)
    : fish.direction, 1);
  context.scale(pose.bodyScaleX * simpleTurnScaleX, pose.bodyScaleY * simpleTurnScaleY);
  context.globalAlpha = pose.alpha;
  context.filter = fishFilter;
  if (behaviorId === "turn-around" && turnActive && previewTurnMode === "complex") {
    drawFishTurnaroundRig(context, renderImage, drawX, drawWidth, drawHeight, fish, renderNow);
  } else {
    const warped = typeof drawFishSwimDepthWarpImage === "function"
      && drawFishSwimDepthWarpImage(
        context,
        renderImage,
        drawX,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
        fish,
        species,
        renderNow,
        {
          imagePath,
          presetId: previewSwimPreset || undefined,
          movementFactor: previewSwimPreset ? 1 : undefined,
          immediate: Boolean(previewSwimPreset),
          effectiveBehavior: typeof getEffectiveFishBehavior === "function" ? getEffectiveFishBehavior(fish, species) : species.behavior,
          suckerFreeSwimming: behaviorId === "sucker-free-swim" || (typeof isSuckerFishFreeSwimming === "function" && isSuckerFishFreeSwimming(fish, species, renderNow))
        }
      );
    if (!warped) {
      context.drawImage(renderImage, drawX, -drawHeight / 2, drawWidth, drawHeight);
    }
  }
  context.restore();

  if (dom.debugFishBehaviorPreviewPhase) {
    dom.debugFishBehaviorPreviewPhase.textContent = `${Math.round(phase * 100)}%`;
  }
  if (dom.debugFishBehaviorPreviewScaleX) {
    dom.debugFishBehaviorPreviewScaleX.textContent = `${Math.round(pose.bodyScaleX * simpleTurnScaleX * 100)}%`;
  }
  if (dom.debugFishBehaviorPreviewScaleY) {
    dom.debugFishBehaviorPreviewScaleY.textContent = `${Math.round(pose.bodyScaleY * simpleTurnScaleY * 100)}%`;
  }
  if (dom.debugFishBehaviorPreviewTilt) {
    const displayTilt = behaviorId === "dead" ? 180 : Math.round(pose.tilt * 180 / Math.PI);
    dom.debugFishBehaviorPreviewTilt.textContent = `${displayTilt}°`;
  }
  if (dom.debugFishBehaviorPreviewStatus) {
    dom.debugFishBehaviorPreviewStatus.textContent = `${species.name} · ${getDebugFishBehaviorPreviewOption()?.label || "Preview"}`;
  }

  runtime.debugFishBehaviorPreviewFrame = requestAnimationFrame(renderDebugFishBehaviorPreviewFrame);
}


function getDebugDecorPreviewEntries() {
  return [...runtime.decorMap.entries()]
    .filter(([, decor]) => decor?.path && !(typeof isCustomDecorUploadShopKey === "function" && isCustomDecorUploadShopKey(decor.key || "")))
    .map(([key, decor]) => ({ key, decor, name: decor.name || titleFromFile(key) }))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true }));
}

function populateDebugDecorPreviewSelect() {
  const select = dom.debugDecorPreviewSelect;
  if (!select) {
    return [];
  }
  const entries = getDebugDecorPreviewEntries();
  select.innerHTML = entries.map(({ key, name }) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`).join("");
  const preferredKey = runtime.debugDecorPreviewDecorKey && runtime.decorMap.has(runtime.debugDecorPreviewDecorKey)
    ? runtime.debugDecorPreviewDecorKey
    : entries[0]?.key || "";
  runtime.debugDecorPreviewDecorKey = preferredKey;
  if (preferredKey) {
    select.value = preferredKey;
  }
  return entries;
}

function createDebugDecorPreviewItem(decorKey = runtime.debugDecorPreviewDecorKey) {
  const decor = runtime.decorMap.get(decorKey);
  if (!decor) {
    return null;
  }
  const selectedLayer = clampTankLayer(Number(dom.debugDecorPreviewLayer?.value) || 3);
  const baseScale = clamp(Number(decor.defaultScale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  return {
    id: `debug-decor-preview-${decorKey}`,
    decorKey,
    xNorm: 0.5,
    yNorm: 0.8,
    scale: baseScale,
    tankLayer: selectedLayer,
    flipped: false,
    flippedY: false,
    caveColorSettings: {}
  };
}

function getDebugDecorPreviewBaseScale() {
  const decor = runtime.decorMap.get(runtime.debugDecorPreviewDecorKey);
  return clamp(Number(decor?.defaultScale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
}

function requestDebugDecorPreviewRender() {
  if (!runtime.debugDecorPreviewOpen || runtime.debugDecorPreviewFrame) {
    return;
  }
  runtime.debugDecorPreviewFrame = requestAnimationFrame(renderDebugDecorPreviewFrame);
}

function getDebugDecorPreviewColorLayers(decor = runtime.decorMap.get(runtime.debugDecorPreviewDecorKey)) {
  if (!decor || typeof getVisibleDecorColorLayers !== "function") {
    return [];
  }
  return getVisibleDecorColorLayers(decor).filter((layer) => layer?.id && (layer.isBaseLayer || layer.path || layer.paths?.length));
}

function renderDebugDecorPreviewColorControls() {
  const container = dom.debugDecorPreviewColors;
  const item = runtime.debugDecorPreviewItem;
  const decor = runtime.decorMap.get(runtime.debugDecorPreviewDecorKey);
  if (!container || !item || !decor) {
    return;
  }
  const layers = getDebugDecorPreviewColorLayers(decor);
  if (!layers.length) {
    container.innerHTML = '<p class="debug-decor-preview-empty">This decor has no configurable color layers.</p>';
    return;
  }
  const settings = getPlacedCaveColorSettings(item, decor);
  const colorize = getPlacedCaveColorizeSettings(item, decor);
  container.innerHTML = layers.map((layer, index) => {
    const active = normalizeHexColor(settings[layer.id] || "");
    const fallback = ["#55c8e8", "#8ddf79", "#d08edc"][index % 3];
    const label = getCaveColorLayerLabel(layer, layers, decor);
    return `
      <label class="debug-decor-preview-color-row" data-debug-decor-color-layer="${escapeHtml(layer.id)}">
        <input type="checkbox" data-debug-decor-color-enabled ${active ? "checked" : ""} />
        <span>${escapeHtml(label)}</span>
        <input type="color" data-debug-decor-color-value value="${escapeHtml(active || fallback)}" ${active ? "" : "disabled"} />
      </label>
    `;
  }).join("");
}

function handleDebugDecorPreviewColorInput(event) {
  const item = runtime.debugDecorPreviewItem;
  const row = event.target?.closest?.("[data-debug-decor-color-layer]");
  if (!item || !row) {
    return;
  }
  const layerId = row.getAttribute("data-debug-decor-color-layer") || "";
  if (!layerId) {
    return;
  }
  const enabled = row.querySelector("[data-debug-decor-color-enabled]")?.checked === true;
  const picker = row.querySelector("[data-debug-decor-color-value]");
  if (picker) {
    picker.disabled = !enabled;
  }
  item.caveColorSettings ||= {};
  if (!enabled) {
    delete item.caveColorSettings[layerId];
    delete item.caveColorSettings[getDecorColorizeSettingKey(layerId)];
  } else {
    item.caveColorSettings[layerId] = normalizeHexColor(picker?.value || "#55c8e8") || "#55c8e8";
    item.caveColorSettings[getDecorColorizeSettingKey(layerId)] = true;
  }
  requestDebugDecorPreviewRender();
}

function syncDebugDecorPreviewControls() {
  const item = runtime.debugDecorPreviewItem;
  const decor = runtime.decorMap.get(runtime.debugDecorPreviewDecorKey);
  if (!item || !decor) {
    return;
  }
  const baseScale = getDebugDecorPreviewBaseScale();
  const percent = clamp(Math.round((item.scale / Math.max(0.0001, baseScale)) * 100), 25, 250);
  runtime.debugDecorPreviewScalePercent = percent;
  if (dom.debugDecorPreviewSize) dom.debugDecorPreviewSize.value = String(percent);
  if (dom.debugDecorPreviewSizeOutput) dom.debugDecorPreviewSizeOutput.textContent = `${percent}%`;
  if (dom.debugDecorPreviewFlipX) dom.debugDecorPreviewFlipX.checked = item.flipped === true;
  if (dom.debugDecorPreviewFlipY) dom.debugDecorPreviewFlipY.checked = item.flippedY === true;
  if (dom.debugDecorPreviewLayer) dom.debugDecorPreviewLayer.value = String(getDecorTankLayer(item));
  renderDebugDecorPreviewColorControls();
}

function snapDebugDecorPreviewToLayer(options = {}) {
  const item = runtime.debugDecorPreviewItem;
  if (!item) {
    return;
  }
  if (options.center !== false) {
    item.xNorm = 0.5;
  }
  const targetY = getTankLayerBottomBoundaryY(getDecorTankLayer(item));
  for (let pass = 0; pass < 2; pass += 1) {
    const bounds = getPlacedDecorGroundBounds(item) || getPlacedDecorBounds(item);
    if (!bounds) {
      break;
    }
    item.yNorm = clamp(item.yNorm + (targetY - bounds.bottom) / Math.max(1, TANK_HEIGHT), 0.02, 1.05);
  }
  runtime.debugDecorPreviewSnapped = true;
  requestDebugDecorPreviewRender();
}

function resetDebugDecorPreview() {
  const decorKey = runtime.debugDecorPreviewDecorKey;
  if (!decorKey || !runtime.decorMap.has(decorKey)) {
    return;
  }
  runtime.debugDecorPreviewScalePercent = 100;
  runtime.debugDecorPreviewItem = createDebugDecorPreviewItem(decorKey);
  if (dom.debugDecorPreviewShowFootprint) dom.debugDecorPreviewShowFootprint.checked = false;
  syncDebugDecorPreviewControls();
  snapDebugDecorPreviewToLayer({ center: true });
}

function setDebugDecorPreviewDecor(decorKey) {
  if (!runtime.decorMap.has(decorKey)) {
    return;
  }
  runtime.debugDecorPreviewDecorKey = decorKey;
  runtime.debugDecorPreviewItem = createDebugDecorPreviewItem(decorKey);
  runtime.debugDecorPreviewScalePercent = 100;
  const decor = runtime.decorMap.get(decorKey);
  const token = ++runtime.debugDecorPreviewLoadToken;
  if (dom.debugDecorPreviewStatus) dom.debugDecorPreviewStatus.textContent = `Loading ${decor.name || titleFromFile(decorKey)}…`;
  void preloadDecorArtwork(decor).then(() => {
    if (!runtime.debugDecorPreviewOpen || token !== runtime.debugDecorPreviewLoadToken) return;
    snapDebugDecorPreviewToLayer({ center: true });
    syncDebugDecorPreviewControls();
    requestDebugDecorPreviewRender();
  });
  syncDebugDecorPreviewControls();
  snapDebugDecorPreviewToLayer({ center: true });
}

function setDebugDecorPreviewLayer(layer) {
  const item = runtime.debugDecorPreviewItem;
  if (!item) return;
  item.tankLayer = clampTankLayer(Number(layer) || 1);
  snapDebugDecorPreviewToLayer({ center: false });
}

function setDebugDecorPreviewSize(value) {
  const item = runtime.debugDecorPreviewItem;
  if (!item) return;
  const percent = clamp(Math.round(Number(value) || 100), 25, 250);
  runtime.debugDecorPreviewScalePercent = percent;
  item.scale = clamp(getDebugDecorPreviewBaseScale() * percent / 100, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  if (dom.debugDecorPreviewSizeOutput) dom.debugDecorPreviewSizeOutput.textContent = `${percent}%`;
  if (runtime.debugDecorPreviewSnapped) {
    snapDebugDecorPreviewToLayer({ center: false });
  } else {
    requestDebugDecorPreviewRender();
  }
}

function setDebugDecorPreviewFlip(axis, checked) {
  const item = runtime.debugDecorPreviewItem;
  if (!item) return;
  if (axis === "y") item.flippedY = checked === true;
  else item.flipped = checked === true;
  if (runtime.debugDecorPreviewSnapped) snapDebugDecorPreviewToLayer({ center: false });
  else requestDebugDecorPreviewRender();
}

function openDebugDecorPreview() {
  if (!isDebugModeEnabled() || !dom.debugDecorPreview) {
    return;
  }
  if (runtime.debugFishBehaviorPreviewOpen) {
    closeDebugFishBehaviorPreview();
  }
  populateDebugDecorPreviewSelect();
  runtime.debugDecorPreviewOpen = true;
  document.body.classList.add("debug-decor-preview-open");
  dom.debugDecorPreview.hidden = false;
  const key = runtime.debugDecorPreviewDecorKey || dom.debugDecorPreviewSelect?.value || "";
  if (key) {
    setDebugDecorPreviewDecor(key);
  }
  requestDebugDecorPreviewRender();
  dom.debugDecorPreviewSelect?.focus();
}

function closeDebugDecorPreview() {
  runtime.debugDecorPreviewOpen = false;
  runtime.debugDecorPreviewLoadToken += 1;
  runtime.debugDecorPreviewPointerId = null;
  runtime.debugDecorPreviewTransform = null;
  if (runtime.debugDecorPreviewFrame) {
    cancelAnimationFrame(runtime.debugDecorPreviewFrame);
    runtime.debugDecorPreviewFrame = 0;
  }
  if (dom.debugDecorPreview) dom.debugDecorPreview.hidden = true;
  document.body.classList.remove("debug-decor-preview-open");
  dom.debugDecorPreviewButton?.focus();
}

function getDebugDecorPreviewTankPoint(event) {
  const canvas = dom.debugDecorPreviewCanvas;
  const transform = runtime.debugDecorPreviewTransform;
  if (!canvas || !transform) return null;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return {
    x: (x - transform.offsetX) / Math.max(0.0001, transform.scale),
    y: (y - transform.offsetY) / Math.max(0.0001, transform.scale)
  };
}

function beginDebugDecorPreviewDrag(event) {
  if (!runtime.debugDecorPreviewOpen || !runtime.debugDecorPreviewItem || event.button !== 0) return;
  const point = getDebugDecorPreviewTankPoint(event);
  if (!point) return;
  const bounds = getPlacedDecorBounds(runtime.debugDecorPreviewItem);
  if (bounds && (point.x < bounds.left - 20 || point.x > bounds.right + 20 || point.y < bounds.top - 20 || point.y > bounds.bottom + 20)) {
    return;
  }
  event.preventDefault();
  runtime.debugDecorPreviewPointerId = event.pointerId;
  runtime.debugDecorPreviewDragOffsetX = runtime.debugDecorPreviewItem.xNorm * TANK_WIDTH - point.x;
  runtime.debugDecorPreviewDragOffsetY = runtime.debugDecorPreviewItem.yNorm * TANK_HEIGHT - point.y;
  runtime.debugDecorPreviewSnapped = false;
  dom.debugDecorPreviewCanvas?.setPointerCapture?.(event.pointerId);
}

function moveDebugDecorPreviewDrag(event) {
  if (runtime.debugDecorPreviewPointerId !== event.pointerId || !runtime.debugDecorPreviewItem) return;
  const point = getDebugDecorPreviewTankPoint(event);
  if (!point) return;
  event.preventDefault();
  const anchorX = point.x + runtime.debugDecorPreviewDragOffsetX;
  const anchorY = point.y + runtime.debugDecorPreviewDragOffsetY;
  runtime.debugDecorPreviewItem.xNorm = clamp(anchorX / Math.max(1, TANK_WIDTH), 0, 1);
  runtime.debugDecorPreviewItem.yNorm = clamp(anchorY / Math.max(1, TANK_HEIGHT), 0.03, 1.04);
  requestDebugDecorPreviewRender();
}

function endDebugDecorPreviewDrag(event) {
  if (runtime.debugDecorPreviewPointerId !== event.pointerId) return;
  runtime.debugDecorPreviewPointerId = null;
  dom.debugDecorPreviewCanvas?.releasePointerCapture?.(event.pointerId);
  requestDebugDecorPreviewRender();
}

function drawDebugDecorPreviewBackdrop(context) {
  const floorBounds = getTankFloorDrawBounds();
  const waterGradient = context.createLinearGradient(0, WATER_SURFACE_Y, 0, floorBounds.bottom);
  waterGradient.addColorStop(0, "#58c8ef");
  waterGradient.addColorStop(0.55, "#1789d0");
  waterGradient.addColorStop(1, "#0d5ea8");
  context.fillStyle = "#071522";
  context.fillRect(0, 0, TANK_WIDTH, TANK_HEIGHT);
  context.fillStyle = waterGradient;
  context.fillRect(GLASS_MARGIN_X, WATER_SURFACE_Y, TANK_WIDTH - GLASS_MARGIN_X * 2, floorBounds.bottom - WATER_SURFACE_Y);

  context.save();
  traceTankFloorMaskPath(context, floorBounds);
  context.clip();
  const gravelGradient = context.createLinearGradient(0, floorBounds.drawTop, 0, floorBounds.bottom);
  gravelGradient.addColorStop(0, "#9b8c6d");
  gravelGradient.addColorStop(0.55, "#766449");
  gravelGradient.addColorStop(1, "#4f402f");
  context.fillStyle = gravelGradient;
  context.fillRect(floorBounds.left, floorBounds.drawTop, floorBounds.drawWidth, floorBounds.bottom - floorBounds.drawTop + 2);
  context.globalAlpha = 0.14;
  context.fillStyle = "#e1d6b9";
  for (let x = floorBounds.left + 8; x < floorBounds.right; x += 21) {
    const surface = getTankFloorMaskSurfaceYAtX(x, floorBounds);
    for (let y = surface + 7 + ((x * 13) % 11); y < floorBounds.bottom; y += 19) {
      context.beginPath();
      context.arc(x + ((y * 7) % 9) - 4, y, 2.2, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();

  for (let layer = 1; layer <= 5; layer += 1) {
    const y = getTankLayerBottomBoundaryY(layer);
    const selected = layer === getDecorTankLayer(runtime.debugDecorPreviewItem);
    context.save();
    context.setLineDash(selected ? [] : [9, 8]);
    context.lineWidth = selected ? 2.4 : 1.2;
    context.strokeStyle = selected ? "rgba(255, 222, 114, 0.85)" : "rgba(220, 247, 255, 0.22)";
    context.beginPath();
    context.moveTo(GLASS_MARGIN_X + 8, y);
    context.lineTo(TANK_WIDTH - GLASS_MARGIN_X - 8, y);
    context.stroke();
    context.fillStyle = selected ? "rgba(255, 232, 148, 0.95)" : "rgba(220, 247, 255, 0.45)";
    context.font = "700 15px system-ui, sans-serif";
    context.fillText(`L${layer}`, GLASS_MARGIN_X + 16, y - 7);
    context.restore();
  }
}

function drawDebugDecorPreviewFootprint(context, item, decor, drawX, drawY, width, height) {
  if (!dom.debugDecorPreviewShowFootprint?.checked || !decor?.shadowFootprintPath) return;
  const footprintImage = runtime.images.get(decor.shadowFootprintPath);
  if (!isUsableRuntimeImage(footprintImage)) return;
  context.save();
  const flipX = isDecorHorizontallyFlipped(item);
  const flipY = isDecorVerticallyFlipped(item);
  let x = drawX;
  let y = drawY;
  if (flipX || flipY) {
    context.translate(flipX ? drawX + width : 0, flipY ? drawY + height : 0);
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    x = flipX ? 0 : drawX;
    y = flipY ? 0 : drawY;
  }
  context.globalAlpha = 0.58;
  context.globalCompositeOperation = "screen";
  context.filter = "invert(34%) sepia(95%) saturate(5200%) hue-rotate(318deg) brightness(118%) contrast(120%)";
  context.drawImage(footprintImage, x, y, width, height);
  context.filter = "none";
  context.restore();
}

function drawDebugDecorPreviewArtwork(context, item, decor, now) {
  const image = runtime.images.get(decor.path);
  if (!isUsableRuntimeImage(image)) return false;
  const width = getDecorDisplayWidth(decor, item);
  const height = width * (image.height / Math.max(1, image.width));
  const x = item.xNorm * TANK_WIDTH;
  const y = item.yNorm * TANK_HEIGHT;
  const drawX = x - width / 2;
  const drawY = y - height;
  const motion = getDecorMotion(item, now);

  if (decor.bgPath) {
    const bgImage = runtime.images.get(decor.bgPath);
    if (isUsableRuntimeImage(bgImage)) {
      const bgHeight = width * (bgImage.height / Math.max(1, bgImage.width));
      if (!drawCaveBackgroundLayerToContext(context, item, decor, now, {
        drawX,
        drawY,
        bgDrawY: y - bgHeight,
        width,
        baseHeight: height,
        motion
      })) {
        drawDecorImageLayerToContext(context, bgImage, drawX, y - bgHeight, width, bgHeight, item, now, motion);
      }
    }
  }

  if (decor.midPath) {
    const midImage = runtime.images.get(decor.midPath);
    if (isUsableRuntimeImage(midImage)) {
      const midHeight = width * (midImage.height / Math.max(1, midImage.width));
      drawDecorImageLayerToContext(context, midImage, drawX, y - midHeight, width, midHeight, item, now, motion);
    }
  }

  if (!drawCaveColorLayersToContext(context, item, decor, now, { drawX, drawY, width, height, motion })) {
    drawDecorImageLayerToContext(context, image, drawX, drawY, width, height, item, now, motion);
  }

  if (decor.lightPath) {
    const lightImage = runtime.images.get(decor.lightPath);
    if (isUsableRuntimeImage(lightImage)) {
      const lightHeight = width * (lightImage.height / Math.max(1, lightImage.width));
      context.save();
      context.globalCompositeOperation = "screen";
      drawDecorImageLayerToContext(context, lightImage, drawX, y - lightHeight, width, lightHeight, item, now, motion);
      context.restore();
    }
  }

  drawDebugDecorPreviewFootprint(context, item, decor, drawX, drawY, width, height);
  return true;
}

function updateDebugDecorPreviewReadouts() {
  const item = runtime.debugDecorPreviewItem;
  const decor = runtime.decorMap.get(runtime.debugDecorPreviewDecorKey);
  if (!item || !decor) return;
  const groundBounds = getPlacedDecorGroundBounds(item) || getPlacedDecorBounds(item);
  const layerY = getTankLayerBottomBoundaryY(getDecorTankLayer(item));
  const offset = groundBounds ? groundBounds.bottom - layerY : 0;
  if (dom.debugDecorPreviewBottom) dom.debugDecorPreviewBottom.textContent = groundBounds ? `${Math.round(groundBounds.bottom)} px` : "Unavailable";
  if (dom.debugDecorPreviewOffset) dom.debugDecorPreviewOffset.textContent = `${offset >= 0 ? "+" : ""}${Math.round(offset)} px`;
  if (dom.debugDecorPreviewFootprint) dom.debugDecorPreviewFootprint.textContent = decor.shadowFootprintPath ? "Helper PNG" : "Auto";
  if (dom.debugDecorPreviewStatus) {
    const width = Math.round(getDecorDisplayWidth(decor, item));
    dom.debugDecorPreviewStatus.textContent = `${decor.name || titleFromFile(item.decorKey)} · ${width}px · Layer ${getDecorTankLayer(item)}${runtime.debugDecorPreviewSnapped ? " · snapped" : ""}`;
  }
}

function renderDebugDecorPreviewFrame() {
  runtime.debugDecorPreviewFrame = 0;
  if (!runtime.debugDecorPreviewOpen || !dom.debugDecorPreviewCanvas || !runtime.debugDecorPreviewItem) return;
  const canvas = dom.debugDecorPreviewCanvas;
  const context = canvas.getContext("2d");
  const decor = runtime.decorMap.get(runtime.debugDecorPreviewDecorKey);
  if (!context || !decor) return;

  const viewport = resizeDebugFishBehaviorPreviewCanvas(canvas, context);
  context.clearRect(0, 0, viewport.width, viewport.height);
  const scale = Math.min(viewport.width / Math.max(1, TANK_WIDTH), viewport.height / Math.max(1, TANK_HEIGHT));
  const offsetX = (viewport.width - TANK_WIDTH * scale) / 2;
  const offsetY = (viewport.height - TANK_HEIGHT * scale) / 2;
  runtime.debugDecorPreviewTransform = { scale, offsetX, offsetY };

  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  drawDebugDecorPreviewBackdrop(context);

  if (areDecorShadowsEnabled()) {
    context.save();
    context.globalCompositeOperation = "multiply";
    drawDecorContactShadow(context, runtime.debugDecorPreviewItem);
    context.restore();
  }

  const paths = getDecorArtworkPaths(decor);
  const needsLoad = paths.some((path) => path && !isUsableRuntimeImage(runtime.images.get(path)));
  if (needsLoad) {
    void preloadDecorArtwork(decor).then(() => requestDebugDecorPreviewRender());
  }
  drawDebugDecorPreviewArtwork(context, runtime.debugDecorPreviewItem, decor, Date.now());

  const anchorX = runtime.debugDecorPreviewItem.xNorm * TANK_WIDTH;
  const anchorY = runtime.debugDecorPreviewItem.yNorm * TANK_HEIGHT;
  context.strokeStyle = "rgba(255,255,255,0.52)";
  context.lineWidth = 1.4 / Math.max(0.001, scale);
  context.beginPath();
  context.arc(anchorX, anchorY, 5 / Math.max(0.001, scale), 0, Math.PI * 2);
  context.stroke();
  context.restore();

  updateDebugDecorPreviewReadouts();
  runtime.debugDecorPreviewFrame = requestAnimationFrame(renderDebugDecorPreviewFrame);
}

function getDebugBehaviorButtonAvailability(action, selectedFish, now = Date.now()) {
  const species = getSpeciesForFish(selectedFish);
  const config = DEBUG_BEHAVIOR_BUTTON_CONFIGS.find((entry) => entry.action === action);
  const title = config?.title || "Debug behavior";
  const reason = getDebugBehaviorBlockReason(selectedFish, species, getDebugBehaviorScenarioOptions(action));
  if (reason) {
    return { enabled: false, title: `${title}: ${reason}` };
  }
  if (action.startsWith("oto-")) {
    if (species?.id !== "otocinclus" || getEffectiveFishBehavior(selectedFish, species) !== "sucker") {
      return { enabled: false, title: `${title}: select an Otocinclus / Dwarf Sucker Catfish` };
    }
    return { enabled: true, title };
  }

  switch (action) {
    case "species-signature": {
      const availability = getDebugSpeciesSignatureAvailability(selectedFish, species, now);
      return availability.enabled
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: ${availability.reason}` };
    }
    case "puffer-inflate":
    case "puffer-deflate":
    case "puffer-taps":
      return species?.id === "pufferfish"
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: select a Pufferfish` };
    case "hide":
      return hasDebugDecorHangoutZone(["plant", "hide", "spooky"])
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add plants, caves, wrecks, or spooky decor` };
    case "inspect-lure":
      return hasDebugDecorHangoutZone(["lure"])
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add a Fishing Lure or Gorebag` };
    case "guard-cave":
      return hasDebugDecorHangoutZone(["hide", "hardscape"])
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add a cave, arch, rock, or hardscape` };
    case "follow":
    case "avoid":
      return getDebugRelationshipPartner(selectedFish)
        ? { enabled: true, title }
        : { enabled: false, title: `${title}: add another living fish` };
    default:
      return { enabled: true, title };
  }
}

function syncDebugBehaviorLabButtons(debugMode, selectedFish, now = Date.now()) {
  for (const config of DEBUG_BEHAVIOR_BUTTON_CONFIGS) {
    const button = dom[config.domKey];
    if (!button) {
      continue;
    }
    const availability = debugMode
      ? getDebugBehaviorButtonAvailability(config.action, selectedFish, now)
      : { enabled: false, title: config.title };
    button.hidden = !debugMode;
    button.disabled = !debugMode || !availability.enabled;
    button.title = availability.title || config.title;
    button.setAttribute("aria-label", availability.title || config.title);
    const forcedOtocinclusState = selectedFish
      ? getDebugForcedOtocinclusState(selectedFish, getSpeciesForFish(selectedFish))
      : null;
    const otocinclusActionState = config.action === "oto-back"
      ? "back"
      : config.action === "oto-swim"
        ? "swim"
        : config.action === "oto-front"
          ? "front"
          : config.action === "oto-normal"
            ? "normal"
            : null;
    button.classList.toggle(
      "is-active",
      (config.action === "disease"
        && selectedFish
        && sanitizeDiseaseState(selectedFish.diseaseState) !== DISEASE_STATE_NONE)
      || (otocinclusActionState !== null
        && selectedFish
        && getSpeciesForFish(selectedFish)?.id === "otocinclus"
        && (otocinclusActionState === "normal" ? !forcedOtocinclusState : forcedOtocinclusState === otocinclusActionState))
    );
  }
}

function damageSelectedFish() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    showToast("Select a fish in the tank first.");
    return;
  }

  if (managed.inStorage) {
    showToast("Take the fish out of storage before using the kill switch.");
    return;
  }

  const { fish } = managed;
  const now = Date.now();
  if (isFishDead(fish)) {
    showToast(`${fish.name} is already dead.`);
    return;
  }

  const result = applyFishDamage(
    fish,
    1,
    now,
    `${fish.name} lost half a heart.`,
    `${fish.name} died and floated to the surface.`,
    { force: true }
  );
  const toast = result.dead ? `${fish.name} died.` : `${fish.name} lost half a heart.`;

  saveState();
  renderUi(now);
  showToast(toast);
}

function getNextDebugDiseaseStage(stateId) {
  const currentState = sanitizeDiseaseState(stateId);
  const currentIndex = DEBUG_DISEASE_STAGE_ORDER.indexOf(currentState);
  if (currentIndex === -1) {
    return DISEASE_STATE_CARRIER;
  }
  return DEBUG_DISEASE_STAGE_ORDER[Math.min(currentIndex + 1, DEBUG_DISEASE_STAGE_ORDER.length - 1)];
}

function forceDebugDiseaseSignals(fish, stateId, now = Date.now()) {
  if (!fish) {
    return;
  }

  const diseaseState = sanitizeDiseaseState(stateId);
  const signalsByStage = {
    [DISEASE_STATE_INCUBATING]: ["missed_feeding"],
    [DISEASE_STATE_EARLY]: ["hiding_more_than_usual"],
    [DISEASE_STATE_VISIBLE]: ["looking_under_weather", "green_bubbles", "food_refused"],
    [DISEASE_STATE_SEVERE]: ["looking_under_weather", "green_bubbles", "surface_hover", "bottom_sit"],
    [DISEASE_STATE_RECOVERING]: ["green_bubbles", "sick_isolation"]
  };
  fish.lastIllnessSignalAtByType = {};
  for (const signalType of signalsByStage[diseaseState] || []) {
    forceDiseaseSignalForDebug(fish, signalType, now);
  }

  fish.nextSymptomCheckAt = now;
  fish.nextGreenBubbleAt = [DISEASE_STATE_VISIBLE, DISEASE_STATE_SEVERE, DISEASE_STATE_RECOVERING].includes(diseaseState)
    ? now
    : getNextGreenBubbleAtForDisease(fish, now);
  if (diseaseState !== DISEASE_STATE_NONE) {
    setFishBehaviorIntent(fish, "debug illness", diseaseState, now, { durationMs: 45 * 1000 });
  }
}

function setSelectedFishDiseaseStageForDebug(fish, stateId, now = Date.now()) {
  if (!fish) {
    return false;
  }

  const diseaseState = sanitizeDiseaseState(stateId);
  if (diseaseState === DISEASE_STATE_NONE) {
    const changed = resetFishDiseaseFields(fish, DISEASE_STATE_NONE, now);
    fish.lastIllnessSignalAtByType = {};
    fish.behaviorIntent = null;
    fish.foodRefusalUntil = 0;
    runtime.debugFishBehaviorSignatures.delete(fish.id);
    return changed;
  }

  fish.diseaseState = diseaseState;
  fish.diseaseType = DISEASE_TYPE_GENERIC;
  fish.diseaseInfectedAt = now;
  fish.diseaseProgressMs = getDebugDiseaseProgressForStage(diseaseState);
  fish.diseaseLastProgressAt = now;
  fish.diseaseExposureLevel = 0;
  fish.diseaseRecoveryProgressMs = diseaseState === DISEASE_STATE_RECOVERING ? DISEASE_RECOVERING_ENTRY_MS : 0;
  fish.diseaseTreatedUntil = 0;
  fish.diseaseLastDamageAt = now;
  fish.diseaseSource = "debug";
  fish.temporaryImmunityUntil = 0;
  fish.nextDiseaseCheckAt = now + randomDelay(DISEASE_STAGE_CHECK_MIN_MS, DISEASE_STAGE_CHECK_MAX_MS);
  fish.nextDiseaseSpreadCheckAt = now + randomDelay(DISEASE_SPREAD_CHECK_MIN_MS, DISEASE_SPREAD_CHECK_MAX_MS);
  fish.nextSymptomCheckAt = now;
  fish.nextGreenBubbleAt = getNextGreenBubbleAtForDisease(fish, now);
  fish.lastIllnessRiskDayKey = typeof fish.lastIllnessRiskDayKey === "string" ? fish.lastIllnessRiskDayKey : "";
  forceDebugDiseaseSignals(fish, diseaseState, now);
  runtime.debugFishBehaviorSignatures.delete(fish.id);
  return true;
}

function infectSelectedFishDebug() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    showToast("Select a fish in the tank first.");
    return;
  }

  if (managed.inStorage) {
    showToast("Take the fish out of storage before testing illness.");
    return;
  }

  const { fish } = managed;
  const now = Date.now();
  if (isFishDead(fish)) {
    showToast(`${fish.name} is already dead.`);
    return;
  }

  const currentState = sanitizeDiseaseState(fish.diseaseState);
  const nextState = getNextDebugDiseaseStage(currentState);
  setSelectedFishDiseaseStageForDebug(fish, nextState, now);
  saveState();
  renderUi(now);
  showToast(currentState === DISEASE_STATE_SEVERE
    ? `${fish.name} is already at severe illness.`
    : `${fish.name} illness stage: ${nextState}.`);
}

function cureSelectedFishDebug() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    showToast("Select a fish in the tank first.");
    return;
  }

  if (managed.inStorage) {
    showToast("Take the fish out of storage before testing illness.");
    return;
  }

  const { fish } = managed;
  const now = Date.now();
  if (isFishDead(fish)) {
    showToast(`${fish.name} is already dead.`);
    return;
  }

  const currentState = sanitizeDiseaseState(fish.diseaseState);
  if (currentState === DISEASE_STATE_NONE && (Number(fish.diseaseExposureLevel) || 0) <= 0) {
    showToast(`${fish.name} has no active illness.`);
    return;
  }

  if (currentState === DISEASE_STATE_RECOVERING || currentState === DISEASE_STATE_IMMUNE || currentState === DISEASE_STATE_NONE) {
    setSelectedFishDiseaseStageForDebug(fish, DISEASE_STATE_NONE, now);
    saveState();
    renderUi(now);
    showToast(`${fish.name} illness cleared.`);
    return;
  }

  setSelectedFishDiseaseStageForDebug(fish, DISEASE_STATE_RECOVERING, now);
  saveState();
  renderUi(now);
  showToast(`${fish.name} is now recovering.`);
}

function resetAllProgress() {
  localStorage.removeItem(STORAGE_KEY);
  revokeAllCustomImageRuntimeUrls();
  void clearCustomImageDb();
  runtime.saveStateWarningShown = false;
  resetTransientAquariumUiState();

  state = reconcileState(null);
  applyPendingWallpaperEngineUserProperties({
    save: false,
    render: false,
    showToast: false
  });
  saveState();
  renderUi(Date.now());
  syncAmbienceAudio();
  showToast("All progress reset.");
  window.requestAnimationFrame(() => maybeOpenPendingTankSetup());
}
