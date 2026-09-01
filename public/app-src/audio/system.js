// Source fragment: audio/system.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function createAmbienceAudioChannel() {
  const audio = new Audio(resolveAppUrl(AMBIENCE_AUDIO_PATH));
  audio.loop = false;
  audio.preload = "auto";
  audio.volume = 0;
  audio.addEventListener("ended", () => handleAmbienceAudioEnded(audio));
  return audio;
}

function getAmbienceAudioChannels() {
  if (Array.isArray(runtime.ambienceAudioChannels) && runtime.ambienceAudioChannels.length) {
    return runtime.ambienceAudioChannels;
  }

  if (typeof Audio !== "function") {
    return [];
  }

  runtime.ambienceAudioChannels = [createAmbienceAudioChannel(), createAmbienceAudioChannel()];
  runtime.ambienceAudioActiveIndex = 0;
  runtime.ambienceAudio = runtime.ambienceAudioChannels[0] || null;
  return runtime.ambienceAudioChannels;
}

function getAmbienceAudio() {
  const channels = getAmbienceAudioChannels();
  if (!channels.length) {
    return null;
  }

  const activeIndex = clamp(Math.round(Number(runtime.ambienceAudioActiveIndex) || 0), 0, channels.length - 1);
  const audio = channels[activeIndex] || channels[0] || null;
  runtime.ambienceAudio = audio;
  runtime.ambienceAudioActiveIndex = Math.max(0, channels.indexOf(audio));
  return audio;
}

function stopAmbienceAudioFade() {
  if (!runtime.ambienceAudioFadeFrame) {
    return;
  }

  window.cancelAnimationFrame(runtime.ambienceAudioFadeFrame);
  runtime.ambienceAudioFadeFrame = 0;
}

function stopAmbienceAudioCrossfade() {
  if (runtime.ambienceAudioCrossfadeFrame) {
    window.cancelAnimationFrame(runtime.ambienceAudioCrossfadeFrame);
  }
  runtime.ambienceAudioCrossfadeFrame = 0;
  runtime.ambienceAudioCrossfade = null;
}

function isAmbienceAudioCrossfadeActive() {
  return Boolean(runtime.ambienceAudioCrossfadeFrame || runtime.ambienceAudioCrossfade);
}

function resetAmbienceAudioChannel(audio, options = {}) {
  if (!audio) {
    return;
  }

  try {
    if (options.pause !== false) {
      audio.pause();
    }
    if (options.resetTime !== false) {
      audio.currentTime = 0;
    }
    audio.volume = 0;
  } catch (error) {
    console.debug("Ambience channel reset skipped.", error);
  }
}

function fadeAmbienceAudioIn(audio) {
  if (!audio) {
    return;
  }

  stopAmbienceAudioFade();
  const startedAt = performance.now();
  audio.volume = 0;

  const step = (timestamp) => {
    if (!state || getUiSettings().soundMuted || isWallpaperEnginePauseActive() || audio.paused) {
      runtime.ambienceAudioFadeFrame = 0;
      return;
    }

    const elapsed = Math.max(0, timestamp - startedAt);
    const progress = Math.min(1, elapsed / AMBIENCE_AUDIO_FADE_IN_MS);
    audio.volume = AMBIENCE_AUDIO_VOLUME * progress;

    if (progress < 1) {
      runtime.ambienceAudioFadeFrame = window.requestAnimationFrame(step);
      return;
    }

    audio.volume = AMBIENCE_AUDIO_VOLUME;
    runtime.ambienceAudioFadeFrame = 0;
  };

  runtime.ambienceAudioFadeFrame = window.requestAnimationFrame(step);
}

function beginAmbienceAudioCrossfade(fromAudio, toAudio, toIndex, options = {}) {
  stopAmbienceAudioFade();
  stopAmbienceAudioCrossfade();

  const durationMs = options.force ? Math.min(650, AMBIENCE_AUDIO_CROSSFADE_MS) : AMBIENCE_AUDIO_CROSSFADE_MS;
  const startedAt = performance.now();
  const fromStartVolume = fromAudio && !fromAudio.paused
    ? clamp(Number(fromAudio.volume) || AMBIENCE_AUDIO_VOLUME, 0, AMBIENCE_AUDIO_VOLUME)
    : 0;

  runtime.ambienceAudioActiveIndex = toIndex;
  runtime.ambienceAudio = toAudio;
  runtime.ambienceAudioCrossfade = { fromAudio, toAudio };

  const step = (timestamp) => {
    if (!state || getUiSettings().soundMuted || isWallpaperEnginePauseActive() || toAudio.paused) {
      runtime.ambienceAudioCrossfadeFrame = 0;
      runtime.ambienceAudioCrossfade = null;
      return;
    }

    const elapsed = Math.max(0, timestamp - startedAt);
    const progress = Math.min(1, durationMs <= 0 ? 1 : elapsed / durationMs);
    const eased = progress * progress * (3 - (2 * progress));

    if (fromAudio && !fromAudio.paused) {
      fromAudio.volume = fromStartVolume * (1 - eased);
    }
    toAudio.volume = AMBIENCE_AUDIO_VOLUME * eased;

    if (progress < 1) {
      runtime.ambienceAudioCrossfadeFrame = window.requestAnimationFrame(step);
      return;
    }

    resetAmbienceAudioChannel(fromAudio);
    toAudio.volume = AMBIENCE_AUDIO_VOLUME;
    runtime.ambienceAudioCrossfadeFrame = 0;
    runtime.ambienceAudioCrossfade = null;
  };

  runtime.ambienceAudioCrossfadeFrame = window.requestAnimationFrame(step);
}

function restartAmbienceAudioLoop(audio = getAmbienceAudio(), options = {}) {
  if (!audio || getUiSettings().soundMuted || isWallpaperEnginePauseActive() || isAmbienceAudioCrossfadeActive()) {
    return;
  }

  const channels = getAmbienceAudioChannels();
  const fromIndex = Math.max(0, channels.indexOf(audio));
  const toIndex = channels.length > 1 ? (fromIndex + 1) % channels.length : fromIndex;
  const nextAudio = channels[toIndex];
  if (!nextAudio || nextAudio === audio) {
    try {
      audio.currentTime = 0;
    } catch (error) {
      console.debug("Ambience loop restart skipped.", error);
    }

    const fallbackPromise = audio.play();
    if (fallbackPromise && typeof fallbackPromise.catch === "function") {
      fallbackPromise.catch((error) => {
        if (error?.name === "AbortError" || error?.name === "NotAllowedError") {
          return;
        }

        console.warn("Could not restart ambience audio.", error);
      });
    }
    return;
  }

  syncAudioElementMutedState(nextAudio, false, { volumeWhenUnmuted: 0 });
  try {
    nextAudio.pause();
    nextAudio.currentTime = 0;
    nextAudio.volume = 0;
  } catch (error) {
    console.debug("Ambience crossfade setup skipped.", error);
  }

  const playPromise = nextAudio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise
      .then(() => beginAmbienceAudioCrossfade(audio, nextAudio, toIndex, options))
      .catch((error) => {
        if (error?.name === "AbortError" || error?.name === "NotAllowedError") {
          return;
        }

        console.warn("Could not crossfade ambience audio.", error);
      });
  } else {
    beginAmbienceAudioCrossfade(audio, nextAudio, toIndex, options);
  }
}

function handleAmbienceAudioEnded(audio) {
  if (getUiSettings().soundMuted || isWallpaperEnginePauseActive()) {
    return;
  }

  if (runtime.ambienceAudioCrossfade?.fromAudio === audio) {
    return;
  }

  if (audio === getAmbienceAudio()) {
    restartAmbienceAudioLoop(audio, { force: true });
  }
}

function updateAmbienceAudioLoop() {
  const audio = getAmbienceAudio();
  if (
    !audio
    || audio.paused
    || getUiSettings().soundMuted
    || isAmbienceAudioCrossfadeActive()
    || !Number.isFinite(audio.duration)
    || audio.duration <= AMBIENCE_AUDIO_LOOP_END_PADDING_SECONDS + 0.25
  ) {
    return;
  }

  if (audio.currentTime >= audio.duration - AMBIENCE_AUDIO_LOOP_END_PADDING_SECONDS) {
    restartAmbienceAudioLoop(audio);
  }
}

function clearAmbienceAudioResumeListeners() {
  if (!runtime.ambienceAudioResumeEventsBound || !runtime.ambienceAudioResumeHandler) {
    return;
  }

  window.removeEventListener("pointerdown", runtime.ambienceAudioResumeHandler, true);
  window.removeEventListener("click", runtime.ambienceAudioResumeHandler);
  window.removeEventListener("keydown", runtime.ambienceAudioResumeHandler);
  runtime.ambienceAudioResumeHandler = null;
  runtime.ambienceAudioResumeEventsBound = false;
}

function bindAmbienceAudioResumeListeners() {
  if (runtime.ambienceAudioResumeEventsBound) {
    return;
  }

  runtime.ambienceAudioResumeHandler = () => {
    syncAmbienceAudio();
  };
  runtime.ambienceAudioResumeEventsBound = true;
  window.addEventListener("pointerdown", runtime.ambienceAudioResumeHandler, true);
  window.addEventListener("click", runtime.ambienceAudioResumeHandler);
  window.addEventListener("keydown", runtime.ambienceAudioResumeHandler);
}

function syncAudioElementMutedState(audio, muted, options = {}) {
  if (!audio) {
    return;
  }

  const nextMuted = Boolean(muted);
  try {
    audio.muted = nextMuted;
    if ("defaultMuted" in audio) {
      audio.defaultMuted = nextMuted;
    }

    if (nextMuted) {
      audio.volume = 0;
      if (options.pause) {
        audio.pause();
      }
      if (options.resetTime) {
        audio.currentTime = 0;
      }
      return;
    }

    if (Number.isFinite(options.volumeWhenUnmuted)) {
      audio.volume = Math.max(0, Math.min(1, Number(options.volumeWhenUnmuted)));
    }
  } catch (error) {
    console.debug("Audio mute sync skipped.", error);
  }
}

function syncAmbienceAudio() {
  if (!state) {
    return;
  }

  const channels = getAmbienceAudioChannels();
  const audio = getAmbienceAudio();
  if (!audio) {
    return;
  }

  const uiSettings = getUiSettings();
  const shouldWaitForLoadingOverlay = Boolean(
    dom.loadingOverlay
    && !dom.loadingOverlay.hidden
    && !dom.loadingOverlay.classList.contains("is-hiding")
  );
  const shouldSilence = uiSettings.soundMuted || isWallpaperEnginePauseActive() || shouldWaitForLoadingOverlay;
  for (const channel of channels) {
    channel.loop = false;
  }

  if (shouldSilence) {
    stopAmbienceAudioFade();
    stopAmbienceAudioCrossfade();
    for (const channel of channels) {
      syncAudioElementMutedState(channel, true, { pause: true });
    }
    clearAmbienceAudioResumeListeners();
    return;
  }

  for (const channel of channels) {
    syncAudioElementMutedState(channel, false, {
      volumeWhenUnmuted: channel === audio ? Math.min(AMBIENCE_AUDIO_VOLUME, Math.max(0, Number(channel.volume) || 0)) : 0
    });
    if (channel !== audio && !isAmbienceAudioCrossfadeActive()) {
      resetAmbienceAudioChannel(channel);
    }
  }

  if (!audio.paused) {
    clearAmbienceAudioResumeListeners();
    if (!runtime.ambienceAudioFadeFrame && !isAmbienceAudioCrossfadeActive() && audio.volume < AMBIENCE_AUDIO_VOLUME) {
      fadeAmbienceAudioIn(audio);
    }
    return;
  }

  if (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.05) {
    try {
      audio.currentTime = 0;
    } catch (error) {
      console.debug("Ambience resume rewind skipped.", error);
    }
  }

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise
      .then(() => {
        clearAmbienceAudioResumeListeners();
        fadeAmbienceAudioIn(audio);
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }

        if (error?.name === "NotAllowedError") {
          bindAmbienceAudioResumeListeners();
          return;
        }

        console.warn("Could not play ambience audio.", error);
      });
  } else {
    clearAmbienceAudioResumeListeners();
    fadeAmbienceAudioIn(audio);
  }
}

function pickSoundEffectPath(pathOrPaths) {
  if (Array.isArray(pathOrPaths)) {
    const paths = pathOrPaths.filter((path) => typeof path === "string" && path.trim());
    return paths.length ? paths[Math.floor(Math.random() * paths.length)] : "";
  }

  return typeof pathOrPaths === "string" ? pathOrPaths.trim() : "";
}

function pickSoundEffectPathExcluding(pathOrPaths, excludedPath) {
  const paths = Array.isArray(pathOrPaths)
    ? pathOrPaths.filter((path) => typeof path === "string" && path.trim())
    : [pickSoundEffectPath(pathOrPaths)].filter(Boolean);
  const candidates = paths.filter((path) => path !== excludedPath);
  return pickSoundEffectPath(candidates.length ? candidates : paths);
}

function createPooledSoundEffectAudio(path) {
  const audio = new Audio(resolveAppUrl(path));
  audio.preload = "auto";
  audio.addEventListener("ended", () => {
    runtime.activeSoundEffects.delete(audio);
  });
  audio.addEventListener("pause", () => {
    runtime.activeSoundEffects.delete(audio);
  });
  audio.addEventListener("error", () => {
    runtime.activeSoundEffects.delete(audio);
    console.warn(`Could not load sound effect: ${path}`);
  });
  return audio;
}

function getSoundEffectPool(path) {
  const normalizedPath = pickSoundEffectPath(path);
  if (!normalizedPath) {
    return [];
  }

  let pool = runtime.soundEffectPools.get(normalizedPath);
  if (!pool) {
    pool = Array.from({ length: SOUND_EFFECT_POOL_SIZE }, () => createPooledSoundEffectAudio(normalizedPath));
    runtime.soundEffectPools.set(normalizedPath, pool);
    runtime.soundEffectPoolIndices.set(normalizedPath, 0);
  }
  return pool;
}

function getNextSoundEffectAudio(path) {
  const normalizedPath = pickSoundEffectPath(path);
  if (!normalizedPath) {
    return null;
  }

  const pool = getSoundEffectPool(normalizedPath);
  if (!pool.length) {
    return null;
  }

  const currentIndex = runtime.soundEffectPoolIndices.get(normalizedPath) || 0;
  const audio = pool[currentIndex % pool.length];
  runtime.soundEffectPoolIndices.set(normalizedPath, (currentIndex + 1) % pool.length);
  return audio;
}

function getSoundEffectAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioContextConstructor !== "function") {
    return null;
  }

  if (!runtime.soundEffectAudioContext) {
    try {
      runtime.soundEffectAudioContext = new AudioContextConstructor();
    } catch (error) {
      console.debug("Sound effect audio context unavailable.", error);
      return null;
    }
  }

  const context = runtime.soundEffectAudioContext;
  if (context?.state === "suspended" && typeof context.resume === "function") {
    context.resume().catch((error) => {
      console.debug("Sound effect audio context resume skipped.", error);
    });
  }
  return context;
}

function setSoundEffectOutputGain(audio, gain = 1) {
  const outputGain = Math.max(0, Number(gain) || 1);
  if (!audio) {
    return false;
  }
  if (outputGain === 1 && !audio.__bbSoundEffectGainNode) {
    return true;
  }

  const context = getSoundEffectAudioContext();
  if (!context) {
    return false;
  }

  try {
    if (!audio.__bbSoundEffectGainNode) {
      const source = context.createMediaElementSource(audio);
      const gainNode = context.createGain();
      source.connect(gainNode);
      gainNode.connect(context.destination);
      audio.__bbSoundEffectSourceNode = source;
      audio.__bbSoundEffectGainNode = gainNode;
    }
    audio.__bbSoundEffectGainNode.gain.value = outputGain;
    return true;
  } catch (error) {
    console.debug("Sound effect gain boost skipped.", error);
    return false;
  }
}

function clearSoundEffectsResumeListeners() {
  if (!runtime.soundEffectsResumeEventsBound || !runtime.soundEffectsResumeHandler) {
    return;
  }

  window.removeEventListener("pointerdown", runtime.soundEffectsResumeHandler, true);
  window.removeEventListener("click", runtime.soundEffectsResumeHandler, true);
  window.removeEventListener("keydown", runtime.soundEffectsResumeHandler, true);
  runtime.soundEffectsResumeHandler = null;
  runtime.soundEffectsResumeEventsBound = false;
}

function bindSoundEffectsResumeListeners() {
  if (runtime.soundEffectsResumeEventsBound) {
    return;
  }

  runtime.soundEffectsResumeHandler = () => {
    clearSoundEffectsResumeListeners();
    primeSoundEffects();
  };
  runtime.soundEffectsResumeEventsBound = true;
  window.addEventListener("pointerdown", runtime.soundEffectsResumeHandler, true);
  window.addEventListener("click", runtime.soundEffectsResumeHandler, true);
  window.addEventListener("keydown", runtime.soundEffectsResumeHandler, true);
}

function primeSoundEffectAudio(audio) {
  if (!audio || audio.__bbPrimed) {
    return;
  }

  audio.__bbPrimed = true;
  try {
    audio.muted = false;
    audio.volume = 0;
    runtime.activeSoundEffects.add(audio);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (error) {
            console.debug("Sound effect prime cleanup skipped.", error);
          }
          runtime.activeSoundEffects.delete(audio);
          audio.volume = getUiSettings().soundMuted ? 0 : SOUND_EFFECT_VOLUME;
        })
        .catch((error) => {
          runtime.activeSoundEffects.delete(audio);
          audio.__bbPrimed = false;
          runtime.soundEffectsPrimed = false;
          if (error?.name === "AbortError") {
            return;
          }
          if (error?.name === "NotAllowedError") {
            bindSoundEffectsResumeListeners();
            return;
          }
          console.warn("Could not prime sound effect audio.", error);
        });
      return;
    }
  } catch (error) {
    runtime.activeSoundEffects.delete(audio);
    audio.__bbPrimed = false;
    runtime.soundEffectsPrimed = false;
    console.warn("Could not prime sound effect audio.", error);
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    console.debug("Sound effect prime cleanup skipped.", error);
  }
  runtime.activeSoundEffects.delete(audio);
  audio.volume = getUiSettings().soundMuted ? 0 : SOUND_EFFECT_VOLUME;
}

function primeSoundEffects() {
  if (runtime.soundEffectsPrimed || typeof Audio !== "function") {
    return;
  }

  runtime.soundEffectsPrimed = true;
  clearSoundEffectsResumeListeners();
  for (const path of SOUND_EFFECT_PATHS) {
    for (const audio of getSoundEffectPool(path)) {
      primeSoundEffectAudio(audio);
    }
  }
}

function playSoundEffect(pathOrPaths, options = {}) {
  if (isWallpaperEnginePauseActive() || getUiSettings().soundMuted || typeof Audio !== "function") {
    return null;
  }

  const path = pickSoundEffectPath(pathOrPaths);
  if (!path) {
    return null;
  }

  const volume = Math.max(0, Math.min(1, Number(options.volume) || SOUND_EFFECT_VOLUME));
  const gain = Math.max(0, Number(options.gain) || 1);
  const audio = getNextSoundEffectAudio(path);
  if (!audio) {
    return null;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    console.debug("Sound effect reset skipped.", error);
  }
  const gainApplied = setSoundEffectOutputGain(audio, gain);
  const fallbackVolume = Math.max(0, Math.min(1, volume * gain));
  syncAudioElementMutedState(audio, false, { volumeWhenUnmuted: gainApplied ? volume : fallbackVolume });
  runtime.activeSoundEffects.add(audio);

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((error) => {
      runtime.activeSoundEffects.delete(audio);
      if (error?.name === "AbortError") {
        return;
      }
      if (error?.name === "NotAllowedError") {
        audio.__bbPrimed = false;
        runtime.soundEffectsPrimed = false;
        bindSoundEffectsResumeListeners();
        return;
      }

      console.warn("Could not play sound effect.", error);
    });
  }

  return audio;
}

function areUiSoundsMuted() {
  const uiSettings = getUiSettings();
  return uiSettings.soundMuted || uiSettings.uiSoundsMuted;
}

function playUiSoundEffect(pathOrPaths, options = {}) {
  if (areUiSoundsMuted()) {
    return null;
  }
  return playSoundEffect(pathOrPaths, options);
}

function stopActiveSoundEffects() {
  for (const audio of runtime.activeSoundEffects) {
    try {
      syncAudioElementMutedState(audio, true, { pause: true, resetTime: true });
    } catch (error) {
      console.debug("Sound effect stop skipped.", error);
    }
  }
  runtime.activeSoundEffects.clear();
}

function playDispenserSoundEffect() {
  playSoundEffect(DISPENSER_SOUND_PATH, { volume: 0.68 });
}

function playToolbarButtonSoundEffect(kind = "press") {
  const path = kind === "exit" ? TOOLBAR_BUTTON_EXIT_SOUND_PATH : TOOLBAR_BUTTON_PRESS_SOUND_PATH;
  playUiSoundEffect(path, { volume: 0.58 });
}

function playToolbarButtonExitSoundEffect() {
  playToolbarButtonSoundEffect("exit");
}

function playToolbarButtonReleaseSoundEffect() {
  playToolbarButtonSoundEffect("exit");
}

function playUiCollapseToggleSound(collapsed) {
  if (collapsed) {
    playToolbarButtonReleaseSoundEffect();
  } else {
    playToolbarButtonSoundEffect("press");
  }
}

function playRegularButtonSoundEffect() {
  playUiSoundEffect(REGULAR_BUTTON_SOUND_PATH, { volume: 0.58 });
}

function playPurchaseSoundEffect() {
  playUiSoundEffect(PURCHASE_SOUND_PATH, { volume: 0.66 });
}

function playCoinSoundEffect() {
  playUiSoundEffect(COIN_SOUND_PATH, { volume: 0.66 });
}

function getEnabledSoundActionTarget(event, selector) {
  if (!(event?.target instanceof Element)) {
    return null;
  }

  const target = event.target.closest(selector);
  if (!target || target.closest("[disabled], [aria-disabled='true']")) {
    return null;
  }

  return target;
}

function playSoundForEnabledAction(event, selector, playSound) {
  if (!getEnabledSoundActionTarget(event, selector)) {
    return false;
  }

  playSound();
  return true;
}

function playRegularButtonSoundForAction(event, selector) {
  return playSoundForEnabledAction(event, selector, playRegularButtonSoundEffect);
}

function playToolbarButtonPressSoundForAction(event, selector) {
  return playSoundForEnabledAction(event, selector, () => playToolbarButtonSoundEffect("press"));
}

function playToolbarButtonReleaseSoundForAction(event, selector) {
  return playSoundForEnabledAction(event, selector, playToolbarButtonReleaseSoundEffect);
}

function getEnabledSoundRangeTarget(event, selector) {
  const target = getEnabledSoundActionTarget(event, selector);
  return target instanceof HTMLInputElement && target.type === "range"
    ? target
    : null;
}

function beginSoundRangeDrag(event, selector) {
  const target = getEnabledSoundRangeTarget(event, selector);
  if (!target) {
    return false;
  }

  runtime.soundDragState = {
    pointerId: Number.isInteger(event.pointerId) ? event.pointerId : null,
    target,
    selector,
    lastInputSoundAt: Date.now()
  };
  playToolbarButtonSoundEffect("press");
  return true;
}

function playSoundRangeInput(event, selector) {
  const target = getEnabledSoundRangeTarget(event, selector);
  if (!target) {
    return false;
  }

  const now = Date.now();
  const dragState = runtime.soundDragState;
  if (dragState && dragState.target !== target && dragState.selector !== selector) {
    return false;
  }
  if (dragState && now - Number(dragState.lastInputSoundAt || 0) < SOUND_DRAG_INPUT_INTERVAL_MS) {
    return false;
  }

  if (dragState) {
    dragState.lastInputSoundAt = now;
  }
  playToolbarButtonSoundEffect("press");
  return true;
}

function finishSoundRangeDrag(event = null) {
  const dragState = runtime.soundDragState;
  if (!dragState) {
    return false;
  }

  if (
    Number.isInteger(dragState.pointerId)
    && event
    && Number.isInteger(event.pointerId)
    && dragState.pointerId !== event.pointerId
  ) {
    return false;
  }

  runtime.soundDragState = null;
  playToolbarButtonReleaseSoundEffect();
  return true;
}

function isDecorSettingsSoundMode() {
  return DECOR_SETTINGS_SOUND_MODES.has(runtime.utilityOverlayMode);
}

function playFishInspectorActionSound(event) {
  playToolbarButtonPressSoundForAction(event, FISH_INSPECTOR_TOOLBAR_BUTTON_SOUND_SELECTOR);
}

function beginFishInspectorSliderSound(event) {
  beginSoundRangeDrag(event, FISH_INSPECTOR_SLIDER_SOUND_SELECTOR);
}

function playFishInspectorSliderInputSound(event) {
  playSoundRangeInput(event, FISH_INSPECTOR_SLIDER_SOUND_SELECTOR);
}

function playSelectedDecorActionSound(event) {
  if (playRegularButtonSoundForAction(event, SELECTED_DECOR_REGULAR_BUTTON_SOUND_SELECTOR)) {
    return;
  }
  if (playToolbarButtonPressSoundForAction(event, SELECTED_DECOR_INCREASE_BUTTON_SOUND_SELECTOR)) {
    return;
  }
  playToolbarButtonReleaseSoundForAction(event, SELECTED_DECOR_DECREASE_BUTTON_SOUND_SELECTOR);
}

function playTankInfoActionSound(event) {
  if (playToolbarButtonReleaseSoundForAction(event, TANK_INFO_TOOLBAR_RELEASE_BUTTON_SOUND_SELECTOR)) {
    return;
  }

  if (playToolbarButtonPressSoundForAction(event, TANK_INFO_TOOLBAR_BUTTON_SOUND_SELECTOR)) {
    return;
  }

  playRegularButtonSoundForAction(event, TANK_INFO_REGULAR_BUTTON_SOUND_SELECTOR);
}

function playUtilityOverlayActionSound(event) {
  if (isDecorSettingsSoundMode()) {
    playToolbarButtonPressSoundForAction(event, DECOR_SETTINGS_TOOLBAR_CLICK_SOUND_SELECTOR);
    return;
  }

  if (runtime.utilityOverlayMode === "tank-management") {
    if (playToolbarButtonReleaseSoundForAction(event, TANK_INFO_TOOLBAR_RELEASE_BUTTON_SOUND_SELECTOR)) {
      return;
    }
    if (playToolbarButtonPressSoundForAction(event, TANK_INFO_TOOLBAR_BUTTON_SOUND_SELECTOR)) {
      return;
    }
    if (playRegularButtonSoundForAction(event, TANK_INFO_REGULAR_BUTTON_SOUND_SELECTOR)) {
      return;
    }
  }

  if (runtime.utilityOverlayMode === "feed") {
    playToolbarButtonPressSoundForAction(event, FEED_TRAY_ITEM_SOUND_SELECTOR);
    return;
  }

  if (runtime.utilityOverlayMode === "medicine") {
    playToolbarButtonPressSoundForAction(event, MEDICINE_TRAY_ITEM_SOUND_SELECTOR);
  }
}

function playUtilityOverlayPointerDownSound(event) {
  if (!isDecorSettingsSoundMode()) {
    return;
  }
  if (beginSoundRangeDrag(event, DECOR_SETTINGS_RANGE_SOUND_SELECTOR)) {
    return;
  }
  playToolbarButtonPressSoundForAction(event, DECOR_SETTINGS_PREVIEW_POINT_SOUND_SELECTOR);
}

function playUtilityOverlayPointerUpSound(event) {
  if (!isDecorSettingsSoundMode()) {
    return;
  }
  if (runtime.caveSettingsDrag) {
    playToolbarButtonSoundEffect("press");
    return;
  }
  playToolbarButtonPressSoundForAction(event, DECOR_SETTINGS_PREVIEW_POINT_SOUND_SELECTOR);
}

function playUtilityOverlayInputSound(event) {
  if (isDecorSettingsSoundMode()) {
    playSoundRangeInput(event, DECOR_SETTINGS_RANGE_SOUND_SELECTOR);
  }
}

function playUtilityOverlayChangeSound(event) {
  if (isDecorSettingsSoundMode()) {
    playToolbarButtonPressSoundForAction(event, DECOR_SETTINGS_SELECT_SOUND_SELECTOR);
  }
}

function playStoreActionClickSound(event) {
  if (playRegularButtonSoundForAction(event, STORE_REGULAR_BUTTON_SOUND_SELECTOR)) {
    return;
  }

  playToolbarButtonPressSoundForAction(event, STORE_FILTER_CONTROL_SOUND_SELECTOR);
}

function playStoreFilterChangeSound(event) {
  playToolbarButtonPressSoundForAction(event, STORE_FILTER_CONTROL_SOUND_SELECTOR);
}

function playEquipmentSurfaceClickSound(event) {
  if (playRegularButtonSoundForAction(event, EQUIPMENT_REGULAR_BUTTON_SOUND_SELECTOR)) {
    return;
  }

  playToolbarButtonPressSoundForAction(event, EQUIPMENT_TOOLBAR_BUTTON_SOUND_SELECTOR);
}

function playEquipmentSurfaceChangeSound(event) {
  playToolbarButtonPressSoundForAction(event, EQUIPMENT_TOOLBAR_TOGGLE_SOUND_SELECTOR);
}

function getToolbarButtonControlState(button) {
  switch (button?.id) {
    case "openStoreButton":
      return runtime.storeOverlayOpen;
    case "openManagementButton":
      return runtime.utilityOverlayOpen && runtime.utilityOverlayMode === "tank-management";
    case "careTaskPaneButton":
      return getUiSettings().careTaskPaneOpen === true;
    case "careMenuButton":
      return runtime.toolbarActionMenu === "care";
    case "editMenuButton":
      return runtime.toolbarActionMenu === "edit";
    case "openEquipmentButton":
      return runtime.equipmentOverlayOpen;
    case "openSettingsButton":
      return runtime.settingsOverlayOpen;
    case "toggleDebugMenuButton":
      return runtime.debugSidebarOpen;
    case "feedButton":
      return runtime.foodTrayOpen || Boolean(runtime.feedingModeFoodKey);
    case "medicineButton":
      return runtime.medicineTrayOpen || Boolean(runtime.medicineModeKey);
    case "spongeButton":
      return runtime.cleaningMode;
    case "scoopButton":
      return runtime.scoopMode;
    case "fishEditModeDockButton":
      return runtime.fishEditMode;
    case "editModeDockButton":
      return runtime.editTankMode;
    default:
      return false;
  }
}

function getToolbarSoundButton(event) {
  if (!(event?.target instanceof Element) || !dom.tankBottomDock) {
    return null;
  }

  const button = event.target.closest("button");
  if (button?.id === "toolbarTab") {
    return null;
  }
  return button && dom.tankBottomDock.contains(button) && !button.disabled
    ? button
    : null;
}

function captureToolbarButtonSoundState(event) {
  const button = getToolbarSoundButton(event);
  runtime.pendingToolbarButtonSound = button
    ? {
      button,
      wasActive: getToolbarButtonControlState(button)
    }
    : null;
}

function playToolbarButtonSoundForClick(event) {
  const button = getToolbarSoundButton(event);
  const pending = runtime.pendingToolbarButtonSound;
  runtime.pendingToolbarButtonSound = null;
  if (!button) {
    return;
  }

  const wasActive = pending?.button === button && pending.wasActive === true;
  const isActive = getToolbarButtonControlState(button);
  playToolbarButtonSoundEffect(wasActive && !isActive ? "exit" : "press");
}

function isToolbarFastTooltipExperimentEnabled() {
  return Boolean(
    dom.tankBottomDock
    && dom.toolbarFastTooltip
    && dom.tankBottomDock.classList.contains("toolbar-fast-tooltip-experiment")
    && !dom.tankBottomDock.classList.contains("is-toolbar-collapsed")
    && !dom.tankBottomDock.classList.contains("is-tutorial-hidden")
  );
}

function getToolbarFastTooltipButton(target) {
  if (!(target instanceof Element) || !dom.tankBottomDock) {
    return null;
  }

  const button = target.closest(".dock-button");
  return button && dom.tankBottomDock.contains(button) && !button.disabled && !button.hidden
    ? button
    : null;
}

function getToolbarFastTooltipText(button) {
  return String(
    button?.dataset?.toolbarTooltipTitle
    || button?.getAttribute?.("title")
    || button?.getAttribute?.("aria-label")
    || ""
  ).trim();
}

function syncToolbarFastTooltipExperiment() {
  const dock = dom.tankBottomDock;
  if (!dock) {
    return;
  }

  const enabled = isToolbarFastTooltipExperimentEnabled();
  const buttons = dock.querySelectorAll(".dock-button");
  for (const button of buttons) {
    if (enabled) {
      const currentTitle = button.getAttribute("title");
      if (currentTitle !== null) {
        button.dataset.toolbarTooltipTitle = currentTitle;
        button.removeAttribute("title");
      } else if (!button.dataset.toolbarTooltipTitle && button.getAttribute("aria-label")) {
        button.dataset.toolbarTooltipTitle = button.getAttribute("aria-label") || "";
      }
      if (getToolbarFastTooltipText(button)) {
        button.setAttribute("aria-describedby", "toolbarFastTooltip");
      }
      continue;
    }

    if (!button.hasAttribute("title") && button.dataset.toolbarTooltipTitle) {
      button.setAttribute("title", button.dataset.toolbarTooltipTitle);
    }
    delete button.dataset.toolbarTooltipTitle;
    if (button.getAttribute("aria-describedby") === "toolbarFastTooltip") {
      button.removeAttribute("aria-describedby");
    }
  }

  if (!enabled) {
    hideToolbarFastTooltip();
  }
}

function clearToolbarFastTooltipTimer() {
  if (runtime.toolbarFastTooltipTimer) {
    clearTimeout(runtime.toolbarFastTooltipTimer);
    runtime.toolbarFastTooltipTimer = 0;
  }
}

function positionToolbarFastTooltip(clientX = null, clientY = null, button = runtime.toolbarFastTooltipButton) {
  const tooltip = dom.toolbarFastTooltip;
  if (!tooltip || tooltip.hidden) {
    return;
  }

  let x = Number(clientX);
  let y = Number(clientY);
  if ((!Number.isFinite(x) || !Number.isFinite(y)) && button instanceof HTMLElement) {
    const rect = button.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top;
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  const viewportPadding = 8;
  const tooltipRect = tooltip.getBoundingClientRect();
  const left = clamp(x - tooltipRect.width / 2, viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
  let top = y - tooltipRect.height - TOOLBAR_FAST_TOOLTIP_OFFSET_PX;
  if (top < viewportPadding) {
    top = y + TOOLBAR_FAST_TOOLTIP_OFFSET_PX;
  }
  top = clamp(top, viewportPadding, window.innerHeight - tooltipRect.height - viewportPadding);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showToolbarFastTooltip(button) {
  if (!isToolbarFastTooltipExperimentEnabled() || button !== runtime.toolbarFastTooltipButton) {
    return;
  }

  const text = getToolbarFastTooltipText(button);
  const tooltip = dom.toolbarFastTooltip;
  if (!tooltip || !text) {
    hideToolbarFastTooltip();
    return;
  }

  tooltip.textContent = text;
  tooltip.hidden = false;
  positionToolbarFastTooltip(
    runtime.toolbarFastTooltipPointer?.x,
    runtime.toolbarFastTooltipPointer?.y,
    button
  );
  tooltip.classList.add("is-visible");
}

function scheduleToolbarFastTooltip(button, event = null) {
  if (!isToolbarFastTooltipExperimentEnabled() || !button) {
    hideToolbarFastTooltip();
    return;
  }

  runtime.toolbarFastTooltipButton = button;
  if (Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
    runtime.toolbarFastTooltipPointer = {
      x: event.clientX,
      y: event.clientY
    };
  } else {
    runtime.toolbarFastTooltipPointer = null;
  }

  clearToolbarFastTooltipTimer();
  runtime.toolbarFastTooltipTimer = setTimeout(() => {
    runtime.toolbarFastTooltipTimer = 0;
    showToolbarFastTooltip(button);
  }, TOOLBAR_FAST_TOOLTIP_DELAY_MS);
}

function hideToolbarFastTooltip() {
  clearToolbarFastTooltipTimer();
  runtime.toolbarFastTooltipButton = null;
  runtime.toolbarFastTooltipPointer = null;
  if (!dom.toolbarFastTooltip) {
    return;
  }
  dom.toolbarFastTooltip.classList.remove("is-visible");
  dom.toolbarFastTooltip.hidden = true;
}

function handleToolbarFastTooltipPointerOver(event) {
  syncToolbarFastTooltipExperiment();
  const button = getToolbarFastTooltipButton(event.target);
  if (!button || button === runtime.toolbarFastTooltipButton) {
    return;
  }
  scheduleToolbarFastTooltip(button, event);
}

function handleToolbarFastTooltipPointerMove(event) {
  if (!runtime.toolbarFastTooltipButton) {
    return;
  }
  runtime.toolbarFastTooltipPointer = {
    x: event.clientX,
    y: event.clientY
  };
  positionToolbarFastTooltip(event.clientX, event.clientY, runtime.toolbarFastTooltipButton);
}

function handleToolbarFastTooltipPointerOut(event) {
  const button = getToolbarFastTooltipButton(event.target);
  if (!button || button !== runtime.toolbarFastTooltipButton) {
    return;
  }
  if (event.relatedTarget instanceof Element && button.contains(event.relatedTarget)) {
    return;
  }
  hideToolbarFastTooltip();
}

function handleToolbarFastTooltipFocusIn(event) {
  syncToolbarFastTooltipExperiment();
  const button = getToolbarFastTooltipButton(event.target);
  if (button) {
    scheduleToolbarFastTooltip(button);
  }
}

function handleToolbarFastTooltipFocusOut(event) {
  const button = getToolbarFastTooltipButton(event.target);
  if (button && button === runtime.toolbarFastTooltipButton) {
    hideToolbarFastTooltip();
  }
}

function playFishSplashSoundEffect() {
  const path = pickSoundEffectPathExcluding(FISH_SPLASH_SOUND_PATHS, runtime.lastFishSplashSoundPath);
  if (playSoundEffect(path, { volume: 0.78, gain: FISH_SPLASH_SOUND_GAIN })) {
    runtime.lastFishSplashSoundPath = path;
  }
}

function playDropSoundEffect() {
  const firstDrop = MEDICINE_DROP_SOUND_PATHS[0];
  const secondDrop = MEDICINE_DROP_SOUND_PATHS[1];
  const path = runtime.lastMedicineDropSoundPath === firstDrop ? secondDrop : firstDrop;
  if (playSoundEffect(path, { volume: 0.68, gain: MEDICINE_DROP_SOUND_GAIN })) {
    runtime.lastMedicineDropSoundPath = path;
  }
}

function playCleaningCompleteSoundEffect() {
  playSoundEffect(CLEANING_COMPLETE_SOUND_PATH, { volume: 0.72 });
}

function playGlassTapSoundEffect() {
  const path = pickSoundEffectPathExcluding(GLASS_KNOCK_SOUND_PATHS, runtime.lastGlassKnockSoundPath);
  if (playSoundEffect(path, { volume: 0.5 })) {
    runtime.lastGlassKnockSoundPath = path;
  }
}

function playFishEntrySplashSoundIfNeeded(fish) {
  if (
    fish
    && Number.isFinite(Number(fish.entryStartedAt))
    && Number(fish.entryDurationMs) > 0
    && fish.entrySplashTriggered !== true
  ) {
    playFishSplashSoundEffect();
  }
}

function resetScrubWipeSoundState() {
  runtime.scrubWipeSoundDirectionKey = "";
  runtime.lastScrubWipeSoundAt = 0;
}

function getScrubWipeDirectionKey(fromPoint, toPoint) {
  if (!fromPoint || !toPoint) {
    return "";
  }

  const dx = Number(toPoint.x) - Number(fromPoint.x);
  const dy = Number(toPoint.y) - Number(fromPoint.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < SCRUB_WIPE_SOUND_MIN_DISTANCE_PX) {
    return "";
  }

  const useHorizontalAxis = Math.abs(dx) >= Math.abs(dy);
  const axis = useHorizontalAxis ? "x" : "y";
  const sign = (useHorizontalAxis ? dx : dy) >= 0 ? 1 : -1;
  return `${axis}:${sign}`;
}

function playScrubWipeSoundForMovement(fromPoint, toPoint) {
  const directionKey = getScrubWipeDirectionKey(fromPoint, toPoint);
  const now = Date.now();
  if (!directionKey) {
    return;
  }

  const repeatedDirection = runtime.scrubWipeSoundDirectionKey === directionKey;
  if (repeatedDirection && (now - runtime.lastScrubWipeSoundAt) < SCRUB_WIPE_SOUND_COOLDOWN_MS) {
    return;
  }

  runtime.scrubWipeSoundDirectionKey = directionKey;
  runtime.scrubWipeSoundBankIndex = !runtime.lastScrubWipeSoundPath
    ? 0
    : (runtime.scrubWipeSoundBankIndex === 0 ? 1 : 0);

  const path = pickSoundEffectPathExcluding(
    SCRUB_WIPE_SOUND_PATH_GROUPS[runtime.scrubWipeSoundBankIndex],
    runtime.lastScrubWipeSoundPath
  );
  if (playSoundEffect(path, { volume: 0.6 })) {
    runtime.lastScrubWipeSoundPath = path;
    runtime.lastScrubWipeSoundAt = now;
  }
}
