// Source fragment: ui/fish-inspector.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getFishInspectorManagedTarget() {
  return getManagedFishById(runtime.utilityOverlayMode === "fish-inspect" ? runtime.fishInspectFishId : runtime.selectedFishId);
}

function closeFishInspectPreview() {
  const id = runtime.fishInspectFishId;
  runtime.fishSwimAnimationStates?.delete(`inspect:${id}`);
  for (const canvas of runtime.fishInspectWarpCanvases?.values() || []) {
    releaseFishTurnV26ImageResources(canvas);
    canvas.width = canvas.height = 0;
  }
  runtime.fishInspectWarpCanvases = null;
  runtime.fishInspectPreviewFish = null;
  runtime.fishInspectFishId = null;
  runtime.fishInspectNameDraft = "";
  runtime.fishInspectPreviewStartedAt = 0;
  runtime.fishInspectView = "animated";
  runtime.fishInspectPausedAt = 0;
}

function renderFishInspectUtilityOverlay() {
  const managed = getFishInspectorManagedTarget();
  if (!managed) return { kicker: "Fish", title: "Inspect", body: '<div class="empty-state">This fish is no longer available.</div>', footer: "" };
  const { fish, inStorage } = managed;
  const species = getSpeciesForFish(fish);
  const baseSpecies = getBaseSpeciesForFish(fish);
  const now = inStorage ? getFishStorageSimulationNow(fish, Date.now()) : getPeacefulModeSimulationNow(Date.now());
  const dead = isFishDead(fish);
  const color = getFishColorSetting(fish);
  const scale = Math.round((Number(fish.scale) || DEFAULT_FISH_SCALE) * 100);
  const behaviorOptions = `<option value="">Original (${escapeHtml(baseSpecies?.name || "Fish")})</option>`
    + getFishInspectorBehaviorProfiles().map(profile => `<option value="${escapeHtml(profile.id)}"${profile.id === fish.behaviorSpeciesId ? " selected" : ""}>${escapeHtml(profile.name)}</option>`).join("");
  const condition = dead ? "Deceased" : getFishCareConditionText(fish, now);
  const health = isPeacefulModeEnabled() && !dead ? getFishMaxHealthUnits(fish) : fish.healthUnits;
  const view = runtime.fishInspectView || "animated";
  return {
    kicker: "Inspect",
    title: fish.name || "Fish",
    body: `<div class="fish-inspect-layout">
      <section class="fish-inspect-preview-column" aria-label="Fish preview">
        <div class="fish-inspect-preview-stage"><canvas data-fish-inspect-preview aria-label="${view === "animated" ? "Animated" : view === "left" ? "Left" : "Right"} side view of ${escapeHtml(fish.name || "this fish")}"></canvas><span data-fish-inspect-preview-loading>Loading fish…</span></div>
        <div class="fish-inspect-views" role="group" aria-label="Fish inspection views">
          ${["left", "right"].map(side => `<button type="button" data-fish-inspect-view="${side}" aria-pressed="${view === side}"><canvas data-fish-inspect-thumbnail="${side}" aria-hidden="true"></canvas><span>${side === "left" ? "Left side" : "Right side"}</span></button>`).join("")}
          <button class="small-button alt" type="button" data-fish-inspect-view="animated" aria-pressed="${view === "animated"}">Animate</button>
        </div>
      </section>
      <div class="fish-inspect-controls">
        <div class="fish-inspect-details"><strong>${escapeHtml(getFishDisplaySpeciesName(fish, species))}</strong><div class="hearts">${renderHearts(health, getFishMaxHealthUnits(fish))}</div><span>${escapeHtml(condition)}</span><span>Age: ${escapeHtml(formatFishBiologicalAge(fish, now))}</span></div>
        <div class="fish-inspect-name-row"><label>Name<input type="text" maxlength="20" value="${escapeHtml(runtime.fishInspectNameDraft ?? fish.name)}" data-fish-inspect-name /></label><button class="small-button alt" type="button" data-fish-inspect-action="random-name" aria-label="Randomize fish name">?</button><button class="small-button" type="button" data-fish-inspect-action="save-name">Save</button></div>
        <label class="inspector-setting-row"><span>Size</span><input type="range" min="50" max="300" step="5" value="${scale}" data-fish-inspect-setting="size" /><strong data-fish-inspect-size>${scale}%</strong></label>
        <label class="inspector-setting-row inspector-setting-row-select"><span>Behavior</span><select data-fish-inspect-setting="behavior">${behaviorOptions}</select></label>
        <section class="fish-inspector-color-card"><div class="bubbler-color-row"><span>Color</span><strong data-fish-inspect-color-label>${escapeHtml(formatCaveColorChoiceLabel(color))}</strong></div>
          <div class="bubbler-color-swatches fish-inspect-colors"><button class="small-button alt ${!color ? "is-selected" : ""}" type="button" data-fish-inspect-color="" aria-pressed="${!color}">Original</button><button class="small-button cave-color-rgb-tile ${isDecorRgbColorSetting(color) ? "is-selected" : ""}" type="button" data-fish-inspect-color="${DECOR_RGB_COLOR_SETTING}" aria-pressed="${isDecorRgbColorSetting(color)}">RGB</button><input type="color" value="${escapeHtml(normalizeHexColor(color) || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR)}" data-fish-inspect-setting="color" aria-label="Custom fish color" /></div>
          <label class="cave-colorize-toggle"><input type="checkbox" data-fish-inspect-setting="colorize" ${getFishColorizeSetting(fish) ? "checked" : ""} /><span>Colorize</span></label>
        </section>
        <div class="fish-inspect-actions">
          ${!dead && baseSpecies && isFishSpeciesShopUnlocked(baseSpecies) ? '<button class="small-button alt" type="button" data-fish-inspect-action="buy">Buy Another</button><button class="small-button warn" type="button" data-fish-inspect-action="sell">Rehome</button>' : ""}
          ${!dead ? `<button class="small-button" type="button" data-fish-inspect-action="store">${inStorage ? "Place in Tank" : "Put Away"}</button>` : '<button class="small-button warn" type="button" data-fish-inspect-action="dispose">Dispose</button>'}
        </div>
      </div>
    </div>`,
    footer: "",
    closable: true
  };
}

function handleFishInspectClick(_ctx, target) {
  const managed = getFishInspectorManagedTarget();
  if (!managed) return false;
  const viewButton = target.closest("button[data-fish-inspect-view]");
  if (viewButton) {
    const view = viewButton.dataset.fishInspectView;
    if (!["left", "right", "animated"].includes(view)) return false;
    const now = Date.now();
    if (view !== "animated" && !runtime.fishInspectPausedAt) runtime.fishInspectPausedAt = now;
    if (view === "animated" && runtime.fishInspectPausedAt) {
      runtime.fishInspectPreviewStartedAt += now - runtime.fishInspectPausedAt;
      runtime.fishInspectPausedAt = 0;
    }
    runtime.fishInspectView = view;
    renderUtilityOverlay();
    return true;
  }
  const colorButton = target.closest("button[data-fish-inspect-color]");
  if (colorButton) {
    updateInspectorFishSetting("color", colorButton.dataset.fishInspectColor);
    return true;
  }
  const button = target.closest("[data-fish-inspect-action]");
  if (!button) return false;
  const id = managed.fish.id;
  switch (button.dataset.fishInspectAction) {
    case "save-name": {
      if (renameTankContextTarget("fish", id, runtime.fishInspectNameDraft)) renderUtilityOverlay();
      break;
    }
    case "random-name": randomizeInspectorName(); break;
    case "buy": openFishBuyAnotherConfirmation(id); break;
    case "sell": openFishSellConfirmation(id); break;
    case "store":
      closeUtilityOverlay();
      if (managed.inStorage) restoreFishToTank(id);
      else storeFish(id);
      break;
    case "dispose": closeUtilityOverlay(); disposeFish(id); break;
    default: return false;
  }
  return true;
}

function handleFishInspectInput(_ctx, target) {
  if (target.matches("[data-fish-inspect-name]")) {
    runtime.fishInspectNameDraft = target.value;
    return true;
  }
  const setting = target.dataset.fishInspectSetting;
  if (!["size", "color"].includes(setting)) return false;
  updateInspectorFishSetting(setting, target.value, { persist: false, refreshControls: false });
  const fish = getFishInspectorManagedTarget()?.fish;
  if (fish) {
    setTextIfChanged(dom.utilityOverlayBody.querySelector("[data-fish-inspect-size]"), `${Math.round(fish.scale * 100)}%`);
    setTextIfChanged(dom.utilityOverlayBody.querySelector("[data-fish-inspect-color-label]"), formatCaveColorChoiceLabel(getFishColorSetting(fish)));
  }
  return true;
}

function handleFishInspectChange(_ctx, target) {
  const setting = target.dataset.fishInspectSetting;
  if (!setting) return false;
  updateInspectorFishSetting(setting, setting === "colorize" ? target.checked : target.value, { forcePersist: true });
  return true;
}

function handleFishInspectKeyDown(ctx, target, event) {
  if (!target.matches("[data-fish-inspect-name]") || event.key !== "Enter") return false;
  event.preventDefault();
  return handleFishInspectClick(ctx, { closest: () => ({ dataset: { fishInspectAction: "save-name" } }) });
}

function getFishInspectLoopPose(fish, now, startedAt) {
  const swimMs = 1000;
  const turnMs = 700;
  const halfCycle = swimMs + turnMs;
  const elapsed = Math.max(0, now - startedAt);
  const halfIndex = Math.floor(elapsed / halfCycle);
  const phase = elapsed % halfCycle;
  const direction = isFishDead(fish) || halfIndex % 2 === 0 ? 1 : -1;
  const turning = !isFishDead(fish) && phase >= swimMs;
  const turnStartedAt = turning ? startedAt + halfIndex * halfCycle + swimMs : null;
  return {
    ...fish, id: `inspect:${fish.id}`,
    injuryDisplaySide: getFishInjuryDisplaySide({ ...fish }),
    direction: turning ? -direction : direction, displayDirection: direction,
    displayAngle: direction < 0 ? Math.PI : 0,
    turnFromDirection: direction, turnToDirection: -direction,
    turnFromAngle: direction < 0 ? Math.PI : 0, turnToAngle: direction < 0 ? 0 : Math.PI,
    turnStartedAt,
    turnDurationMs: turning ? turnMs : 0,
    // Keep the inspection loop independent of territorial or travel turns.
    turnV26StyleActive: "tail-loaded-c-turn", turnV26StyleStartedAt: turnStartedAt,
    turnV26ActiveDepthSign: direction, turnV26MotionTiming: null,
    turnV26EntryTilt: 0,
    turnRendererBackend: "simple", turnFinalFrameRenderedAt: 0,
    activity: "roam", caveDecorId: null, pendingTravel: null
  };
}

function getFishInspectSwimTexture(texture, layer, imagePath, pose, species, now) {
  if (!texture || isFishDead(pose)) return texture;
  if (!(runtime.fishInspectWarpCanvases instanceof Map)) runtime.fishInspectWarpCanvases = new Map();
  let canvas = runtime.fishInspectWarpCanvases.get(layer);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.fishTurnV26DynamicTexture = true;
    runtime.fishInspectWarpCanvases.set(layer, canvas);
  }
  const scale = Math.min(1, 512 / Math.max(texture.width, texture.height));
  const width = Math.max(1, Math.round(texture.width * scale));
  const height = Math.max(1, Math.round(texture.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width; canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return texture;
  context.clearRect(0, 0, width, height);
  // One continuous swim phase feeds both the side view and the turn mesh.
  // Switching renderers therefore never resets the tail or body deformation.
  if (!drawFishSwimDepthWarpImage(context, texture, 0, 0, width, height, pose, species, now, {
    imagePath, suckerFreeSwimming: true, presetId: "regular", movementFactor: 1
  })) context.drawImage(texture, 0, 0, width, height);
  return canvas;
}

function renderFishInspectPreview(now = Date.now()) {
  if (!runtime.utilityOverlayOpen || runtime.utilityOverlayMode !== "fish-inspect") return;
  const managed = getFishInspectorManagedTarget();
  const canvas = dom.utilityOverlayBody?.querySelector("[data-fish-inspect-preview]");
  if (!managed || !canvas) return;
  const { fish, inStorage } = managed;
  const species = getSpeciesForFish(fish);
  if (!species) return;
  const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
  // Suckers use their side-swimming art so inspection can show both flanks.
  const imagePath = species.behavior === "sucker"
    ? getSuckerFishViewAssetPath(displaySpecies, fish, "swim") || getFishDisplayAssetPath(fish, species, now)
    : getFishDisplayAssetPath(fish, species, now);
  const image = runtime.images.get(imagePath);
  const loading = dom.utilityOverlayBody.querySelector("[data-fish-inspect-preview-loading]");
  if (!isUsableRuntimeImage(image)) {
    if (loading) loading.hidden = false;
    requestRuntimeImageRecovery(imagePath, { kind: "fish", id: fish.id, speciesId: fish.speciesId });
    return;
  }
  if (loading) loading.hidden = true;
  const drawPreview = (canvas, view, thumbnail = false) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const maxSide = Math.min(512, width * 0.88, height * 0.88);
    const scale = maxSide / Math.max(image.width, image.height);
    const drawWidth = image.width * scale, drawHeight = image.height * scale;
    const still = view !== "animated";
    const direction = view === "left" ? -1 : 1;
    const nextPose = getFishInspectLoopPose(fish, still ? runtime.fishInspectPreviewStartedAt : now, runtime.fishInspectPreviewStartedAt || now);
    if (still) Object.assign(nextPose, {
      direction, displayDirection: direction, displayAngle: direction < 0 ? Math.PI : 0,
      turnStartedAt: null, turnDurationMs: 0
    });
    // Thumbnail poses must never replace the animated preview's persistent owner.
    if (!thumbnail && runtime.fishInspectPreviewFish?.id !== nextPose.id) runtime.fishInspectPreviewFish = {};
    const pose = thumbnail ? nextPose : Object.assign(runtime.fishInspectPreviewFish, nextPose);
    const conditionNow = inStorage ? getFishStorageSimulationNow(fish, now) : getPeacefulModeSimulationNow(now);
    const healthRatio = clamp(fish.healthUnits / Math.max(1, getFishMaxHealthUnits(fish)), 0, 1);
    const turn = Boolean(pose.turnStartedAt);
    const complexTurn = turn && !areSimpleTurnAnimationsForced();
    context.save();
    context.translate(width / 2, height / 2);
    const drawLayer = (texture, layer, filter = "none", alpha = 1) => {
      if (!texture || alpha <= 0) return;
      const swimTexture = still ? texture : getFishInspectSwimTexture(texture, layer, imagePath, pose, species, now);
      context.save(); context.filter = filter; context.globalAlpha = alpha;
      let turned = false;
      if (complexTurn) turned = drawFishTurnV26VolumeMesh(context, swimTexture, image, -drawWidth / 2, drawWidth, drawHeight, pose, now, { species, baseAssetPath: imagePath });
      if (!turned && turn) drawFishLightweightTurnFallbackFrame(context, swimTexture, -drawWidth / 2, drawWidth, drawHeight, pose, now);
      else if (!turned) {
        context.scale(pose.displayDirection, 1);
        context.drawImage(swimTexture, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      }
      context.restore();
    };
    drawLayer(getFishTintedImage(imagePath, image, fish), "body", getFishCanvasFilter(fish, healthRatio, conditionNow));
    if (!isFishDead(fish)) {
      drawLayer(getFishSymptomOverlayCanvas(fish, species, imagePath, image, healthRatio, conditionNow, { mode: "global" }), "global");
      const sideAlpha = getFishSymptomSideVisibility(pose, { facingScaleX: pose.displayDirection }, now, complexTurn);
      drawLayer(getFishSymptomOverlayCanvas(fish, species, imagePath, image, healthRatio, conditionNow, { mode: "side" }), "side", "none", sideAlpha);
    }
    context.restore();
  };
  drawPreview(canvas, runtime.fishInspectView || "animated");
  for (const thumbnail of dom.utilityOverlayBody.querySelectorAll?.("[data-fish-inspect-thumbnail]") || []) {
    drawPreview(thumbnail, thumbnail.dataset.fishInspectThumbnail, true);
  }
}

function adjustFishSize(fishId, direction) {
  const managed = getManagedFishById(fishId);
  if (!managed) {
    return;
  }

  const { fish, inStorage } = managed;
  const now = Date.now();
  const nextScale = clamp(fish.scale + direction * SIZE_STEP, FISH_SCALE_MIN, FISH_SCALE_MAX);
  if (Math.abs(nextScale - fish.scale) < 0.0001) {
    return;
  }

  if (inStorage) {
    fish.scale = nextScale;
  } else {
    preserveTankDirtinessThroughChange(now, () => {
      fish.scale = nextScale;
    });
  }
  saveState();
  renderUi(now);
}

function saveFishSizeAsDefault(fishId) {
  const managed = getManagedFishById(fishId);
  if (!managed) {
    return;
  }

  const { fish } = managed;
  state.fishScaleDefaults[fish.speciesId] = clamp(fish.scale, FISH_SCALE_MIN, FISH_SCALE_MAX);
  saveState();
  renderUi(Date.now());
}

function openFishInspector(fishId, options = {}) {
  if (!getManagedFishById(fishId)) {
    return;
  }

  if (options.settingsOpen !== false) {
    openUtilityOverlay("fish-inspect", { fishId, clearPrimaryToolModes: false });
    return;
  }

  if (runtime.selectedFishId !== fishId) {
    runtime.fishInspectorSettingsOpen = false;
    runtime.fishNameDraftId = "";
    runtime.fishNameDraftValue = "";
  }
  closeFishActionMenu();
  runtime.selectedFishId = fishId;
  runtime.selectedFishStatusFishId = fishId;
  runtime.fishInspectorSettingsOpen = options.settingsOpen !== false;
  renderUi(Date.now());
}

function closeFishInspector() {
  runtime.selectedFishId = null;
  runtime.selectedFishStatusFishId = null;
  runtime.fishInspectorSettingsOpen = false;
  runtime.fishNameKeyboardOpen = false;
  runtime.fishNameDraftId = "";
  runtime.fishNameDraftValue = "";
  renderUi(Date.now());
}

function setFishNameDraftFromInput() {
  if (!(dom.fishNameInput instanceof HTMLInputElement) || !runtime.selectedFishId) {
    return;
  }
  runtime.fishNameDraftId = runtime.selectedFishId;
  runtime.fishNameDraftValue = dom.fishNameInput.value;
}

function clearFishNameDraft() {
  runtime.fishNameDraftId = "";
  runtime.fishNameDraftValue = "";
}

function saveInspectorName() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    return;
  }

  const { fish } = managed;
  const nextName = dom.fishNameInput.value.trim().slice(0, 20);
  if (!nextName) {
    showToast("Fish names cannot be blank.");
    setFishNameDraftFromInput();
    return;
  }

  fish.name = nextName;
  pushEvent(`${nextName} got a fresh new name tag.`, Date.now());
  runtime.fishNameKeyboardOpen = false;
  clearFishNameDraft();
  saveState();
  renderUi(Date.now());
  showToast(`${nextName} has been renamed.`);
}

function randomizeInspectorName() {
  const managed = getFishInspectorManagedTarget();
  if (!managed) {
    return;
  }

  const { fish } = managed;
  const species = getBaseSpeciesForFish(fish);
  const pool = Array.isArray(species?.defaultNames)
    ? species.defaultNames.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  if (!pool.length) {
    showToast("No name list found for this fish type.");
    return;
  }

  const takenNames = [
    ...getAllTankFish(state),
    ...(state?.storedFish || [])
  ]
    .filter((entry) => entry?.id !== fish.id)
    .map((entry) => entry?.name)
    .filter((name) => typeof name === "string" && name.trim());
  const available = pool.filter((name) => !takenNames.includes(name) && name !== fish.name);
  const choices = available.length ? available : pool.filter((name) => name !== fish.name);
  const nextName = choices.length
    ? choices[Math.floor(Math.random() * choices.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  fish.name = nextName.slice(0, 20);
  if (runtime.utilityOverlayMode === "fish-inspect") runtime.fishInspectNameDraft = fish.name;
  clearFishNameDraft();
  saveState();
  renderUi(Date.now());
}

function getWallpaperFishNameKeyboardRows() {
  const mode = runtime.fishNameKeyboardMode;
  if (mode === "numbers") {
    return [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", { action: "backspace", label: "Back" }],
      ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
      [{ action: "letters", label: "ABC", wide: true }, ".", ",", "?", "!", "'", { action: "symbols", label: "#+=", wide: true }],
      [{ spacer: true, wide: true }, { action: "space", label: "Space", space: true }, { spacer: true, wide: true }]
    ];
  }
  if (mode === "symbols") {
    return [
      ["[", "]", "{", "}", "#", "%", "^", "*", "+", "=", { action: "backspace", label: "Back" }],
      ["_", "\\", "|", "~", "<", ">", "`", ".", ",", "?"],
      [{ action: "numbers", label: "123", wide: true }, "!", "'", "\"", "-", "/", { action: "letters", label: "ABC", wide: true }],
      [{ spacer: true, wide: true }, { action: "space", label: "Space", space: true }, { spacer: true, wide: true }]
    ];
  }

  const applyCase = (letter) => runtime.fishNameKeyboardUppercase ? letter.toUpperCase() : letter.toLowerCase();
  return [
    [..."qwertyuiop"].map(applyCase).concat([{ action: "backspace", label: "Back" }]),
    [{ spacer: true }, ...[..."asdfghjkl"].map(applyCase), { spacer: true, wide: true }],
    [{ action: "case", label: runtime.fishNameKeyboardUppercase ? "abc" : "ABC", wide: true }, ...[..."zxcvbnm"].map(applyCase), { action: "numbers", label: "123", wide: true }],
    [{ spacer: true, wide: true }, { action: "space", label: "Space", space: true }, { spacer: true, wide: true }]
  ];
}

function renderWallpaperNameKeyboardInto(keyboard) {
  if (!(keyboard instanceof HTMLElement)) {
    return;
  }
  const rows = getWallpaperFishNameKeyboardRows();
  keyboard.innerHTML = rows.map((row) => `
    <div class="wallpaper-name-keyboard-row">
      ${row.map((entry) => {
        if (typeof entry === "object" && entry.spacer) {
          return `<span class="wallpaper-name-keyboard-spacer ${entry.wide ? "is-wide" : ""}" aria-hidden="true"></span>`;
        }
        const key = typeof entry === "string" ? entry : "";
        const action = typeof entry === "object" ? entry.action : "";
        const label = typeof entry === "object" ? entry.label : key;
        const className = [
          typeof entry === "object" && entry.wide ? "is-wide" : "",
          typeof entry === "object" && entry.space ? "is-space" : "",
          action === "backspace" ? "is-backspace" : ""
        ].filter(Boolean).join(" ");
        return `<button class="${className}" type="button" ${action ? `data-fish-name-action="${escapeHtml(action)}"` : `data-fish-name-key="${escapeHtml(key)}"`}>${escapeHtml(label)}</button>`;
      }).join("")}
    </div>
  `).join("");
}

function renderWallpaperFishNameKeyboard() {
  renderWallpaperNameKeyboardInto(dom.fishNameKeyboard);
}

function updateWallpaperFishNameKeyboard() {
  if (!dom.fishNameKeyboard) {
    return;
  }
  renderWallpaperFishNameKeyboard();
  dom.fishNameKeyboard.hidden = !(
    isWallpaperEngineInputAssistEnabled()
    && runtime.selectedFishId
    && dom.fishInspector
    && !dom.fishInspector.hidden
    && runtime.fishNameKeyboardOpen
  );
  if (dom.clearFishName instanceof HTMLButtonElement && dom.fishNameInput instanceof HTMLInputElement) {
    dom.clearFishName.hidden = !isWallpaperEngineInputAssistEnabled() || !dom.fishNameInput.value;
  }
}

function setNameInputValue(input, value) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const maxLength = Number(input.maxLength) > 0 ? Number(input.maxLength) : 48;
  const nextValue = String(value || "").slice(0, maxLength);
  input.value = nextValue;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyWallpaperNameKeyboardActionToInput(input, actionOrKey) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const currentValue = input.value || "";
  switch (actionOrKey) {
    case "space":
      setNameInputValue(input, `${currentValue} `);
      break;
    case "backspace":
      setNameInputValue(input, currentValue.slice(0, -1));
      break;
    case "clear":
      setNameInputValue(input, "");
      break;
    case "case":
      runtime.fishNameKeyboardUppercase = !runtime.fishNameKeyboardUppercase;
      updateWallpaperFishNameKeyboard();
      syncWallpaperUtilityNameKeyboards();
      break;
    case "letters":
    case "numbers":
    case "symbols":
      runtime.fishNameKeyboardMode = actionOrKey;
      updateWallpaperFishNameKeyboard();
      syncWallpaperUtilityNameKeyboards();
      break;
    default:
      setNameInputValue(input, `${currentValue}${String(actionOrKey || "").slice(0, 1)}`);
      break;
  }
  input.focus?.({ preventScroll: true });
}

function applyWallpaperFishNameKeyboardAction(actionOrKey) {
  applyWallpaperNameKeyboardActionToInput(dom.fishNameInput, actionOrKey);
}

function syncWallpaperUtilityNameKeyboards() {
  const keyboards = dom.utilityOverlayBody?.querySelectorAll?.("[data-wallpaper-keyboard]") || [];
  for (const keyboard of keyboards) {
    if (keyboard instanceof HTMLElement) {
      renderWallpaperNameKeyboardInto(keyboard);
      let input = null;
      for (const candidate of dom.utilityOverlayBody?.querySelectorAll?.("[data-wallpaper-keyboard-input]") || []) {
        if (candidate instanceof HTMLInputElement && candidate.dataset.wallpaperKeyboardInput === keyboard.dataset.wallpaperKeyboard) {
          input = candidate;
          break;
        }
      }
      keyboard.hidden = !(
        isWallpaperEngineInputAssistEnabled()
        && input instanceof HTMLInputElement
        && runtime.wallpaperUtilityKeyboardOpenId === input.dataset.wallpaperKeyboardInput
      );
    }
  }
}

function toggleFishInspectorSettings() {
  openFishInspector(runtime.selectedFishId);
}

function buyInspectorFish() {
  const managed = getManagedFishById(runtime.selectedFishId);
  const fish = managed?.fish || null;
  if (!fish) {
    return;
  }

  openFishBuyAnotherConfirmation(fish.id);
}

function getFishInspectorBehaviorProfiles() {
  return runtime.fishCatalog.filter((species) => (
    species
    && !HIDDEN_FISH_OPTION_IDS.has(species.id)
    && !species.customUploadProduct
    && !isCustomFishShopKey(species.id)
    && !isCustomFishAssetKey(species.id)
  ));
}

function renderFishInspectorBehaviorOptions(fish, baseSpecies) {
  const profiles = getFishInspectorBehaviorProfiles();
  const options = [
    `<option value="">Original (${escapeHtml(baseSpecies?.name || "Fish")})</option>`,
    ...profiles.map((profile) => `
      <option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>
    `)
  ].join("");
  setMarkupIfChanged("fish-inspector-behavior-options", dom.inspectorFishBehaviorSelect, options);
  if (dom.inspectorFishBehaviorSelect) {
    dom.inspectorFishBehaviorSelect.value = sanitizeFishBehaviorSpeciesId(fish?.behaviorSpeciesId, fish?.speciesId);
  }
}

function setInspectorInputValue(input, value) {
  if (input instanceof HTMLInputElement && document.activeElement !== input) {
    input.value = String(value);
  }
}

function renderFishInspectorColorControls(fish) {
  if (!dom.inspectorFishColorSwatches) {
    return;
  }

  const activeColor = getFishColorSetting(fish);
  const activeCustomColor = normalizeHexColor(activeColor);
  const originalSelected = !activeColor;
  const rgbSelected = isDecorRgbColorSetting(activeColor);
  const customSelected = Boolean(activeCustomColor);
  const pickerColor = activeCustomColor || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
  const originalTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${originalSelected ? "is-selected" : ""}"
      type="button"
      data-inspector-fish-color=""
      aria-pressed="${originalSelected}"
      aria-label="Use original fish color"
      title="Original color">
      Original
    </button>
  `;
  const rgbTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile cave-color-rgb-tile ${rgbSelected ? "is-selected" : ""}"
      type="button"
      data-inspector-fish-color="${DECOR_RGB_COLOR_SETTING}"
      aria-pressed="${rgbSelected}"
      aria-label="Fade fish through RGB colors"
      title="RGB color cycle">
      RGB
    </button>
  `;
  const customColorPicker = `
    <label
      class="cave-color-picker-shell fish-color-picker-shell ${customSelected ? "is-selected" : ""}"
      title="Choose custom fish color">
      <input
        class="cave-color-picker-input fish-color-picker-input"
        type="color"
        value="${escapeHtml(pickerColor)}"
        data-inspector-fish-color-picker
        aria-label="Choose custom fish color" />
    </label>
  `;

  setMarkupIfChanged(
    "fish-inspector-color-swatches",
    dom.inspectorFishColorSwatches,
    `
      <div class="color-choice-mode-row">
        ${originalTile}
        ${rgbTile}
        ${customColorPicker}
      </div>
    `
  );
}

function updateInspectorFishReadouts(fish) {
  const sizePercent = Math.round(clamp(Number(fish?.scale) || DEFAULT_FISH_SCALE, FISH_SCALE_MIN, FISH_SCALE_MAX) * 100);
  const activeColor = getFishColorSetting(fish);
  const species = getSpeciesForFish(fish);
  const preferredTurnMode = areSimpleTurnAnimationsForced() ? "simple" : "complex";
  setInspectorInputValue(dom.inspectorFishSizeInput, sizePercent);
  setTextIfChanged(dom.inspectorFishSizeValue, `${sizePercent}%`);
  setTextIfChanged(dom.inspectorFishColorValue, formatCaveColorChoiceLabel(activeColor));
  if (dom.inspectorFishTurnAnimationInput instanceof HTMLInputElement) {
    dom.inspectorFishTurnAnimationInput.checked = preferredTurnMode === "complex";
    dom.inspectorFishTurnAnimationInput.disabled = true;
    dom.inspectorFishTurnAnimationInput.title = "Turn animation is controlled globally in Game Settings.";
  }
  setTextIfChanged(dom.inspectorFishTurnAnimationValue, preferredTurnMode === "complex" ? "Complex" : "Simple");
  if (dom.inspectorFishColorizeInput instanceof HTMLInputElement) {
    dom.inspectorFishColorizeInput.checked = getFishColorizeSetting(fish);
  }
  renderFishInspectorColorControls(fish);
}

function updateInspectorFishSetting(setting, rawValue, options = {}) {
  const managed = getFishInspectorManagedTarget();
  if (!managed) {
    return;
  }

  const { fish, inStorage } = managed;
  const now = Date.now();
  let changed = false;
  const applyChange = () => {
    switch (setting) {
      case "size": {
        const nextScale = clamp((Number(rawValue) || 100) / 100, FISH_SCALE_MIN, FISH_SCALE_MAX);
        if (Math.abs(nextScale - fish.scale) > 0.0001) {
          fish.scale = nextScale;
          changed = true;
        }
        break;
      }
      case "behavior": {
        const nextBehaviorSpeciesId = sanitizeFishBehaviorSpeciesId(rawValue, fish.speciesId);
        if ((fish.behaviorSpeciesId || "") !== nextBehaviorSpeciesId) {
          fish.behaviorSpeciesId = nextBehaviorSpeciesId;
          fish.activity = "roam";
          fish.feedingPelletId = null;
          fish.hangoutDecorId = null;
          clearFishSchoolFollowState(fish);
          clearFishCaveBehavior(fish);
          const effectiveSpecies = getSpeciesForFish(fish);
          if (effectiveSpecies) {
            fish.swimSpeed = normalizeFishSpeed(effectiveSpecies);
          }
          fish.targetAt = now;
          if (effectiveSpecies) {
            enforceFishLayerBoundary(fish, effectiveSpecies);
          }
          changed = true;
        }
        break;
      }
      case "turnAnimation": {
        const nextTurnAnimation = rawValue === true || String(rawValue).trim().toLowerCase() === "complex"
          ? "complex"
          : "simple";
        if (fish.turnAnimationPreference !== nextTurnAnimation) {
          fish.turnAnimationPreference = nextTurnAnimation;
          changed = true;
        }
        break;
      }
      case "color": {
        const nextColor = normalizeDecorColorSetting(rawValue);
        if (getFishColorSetting(fish) !== nextColor) {
          fish.fishColor = nextColor;
          fish.hueShift = 0;
          fish.saturation = 100;
          fish.brightness = 100;
          changed = true;
        }
        break;
      }
      case "colorize": {
        const nextColorize = normalizeDecorColorizeSetting(rawValue);
        if (getFishColorizeSetting(fish) !== nextColorize) {
          fish.fishColorize = nextColorize;
          changed = true;
        }
        break;
      }
      default:
        break;
    }
  };

  if (setting === "size" && !inStorage) {
    preserveTankDirtinessThroughChange(now, applyChange);
  } else {
    applyChange();
  }

  const persist = options.persist !== false;
  const refreshControls = options.refreshControls !== false;
  if (!changed) {
    if (persist && options.forcePersist === true) {
      saveState();
    }
    if (refreshControls) {
      if (runtime.utilityOverlayMode === "fish-inspect") renderUtilityOverlay();
      else updateInspectorFishReadouts(fish);
    }
    return;
  }
  if (persist) {
    saveState();
  }
  if (runtime.utilityOverlayMode === "fish-inspect") {
    if (refreshControls) renderUtilityOverlay();
    return;
  }
  if (setting === "color" || setting === "colorize") {
    if (!refreshControls) {
      return;
    }
    updateInspectorFishReadouts(fish);
    return;
  }
  renderUi(now);
}

function queueInspectorFishColorPreview(rawValue) {
  runtime.pendingInspectorFishColorValue = normalizeDecorColorSetting(rawValue);
  if (runtime.inspectorFishColorPreviewFrame) {
    return;
  }

  runtime.inspectorFishColorPreviewFrame = window.requestAnimationFrame(() => {
    runtime.inspectorFishColorPreviewFrame = 0;
    const nextColor = runtime.pendingInspectorFishColorValue;
    runtime.pendingInspectorFishColorValue = "";
    updateInspectorFishSetting("color", nextColor, {
      persist: false,
      refreshControls: false
    });
    const managed = getManagedFishById(runtime.selectedFishId);
    if (managed?.fish) {
      setTextIfChanged(dom.inspectorFishColorValue, formatCaveColorChoiceLabel(getFishColorSetting(managed.fish)));
      dom.inspectorFishColorSwatches?.querySelector(".fish-color-picker-shell")?.classList.add("is-selected");
    }
  });
}
